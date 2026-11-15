"use client";

// صفحهٔ جزئیات جلسه — برای هر دو نقش (قرآن‌آموز و استاد):
// کادر وضعیت با حاشیهٔ برجسته، مشخصات کامل جلسه، چت هماهنگی طرفین،
// شروع کلاس تصویری، تأیید/رد برای استاد، پایان جلسه و نظرسنجی برای شاگرد.

import { useCallback, useEffect, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  formatJalaliDate,
  Icon,
  LoadingState,
  SectionHeader,
  Sheet,
  StatusPill,
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { formatWalletAmount, toFaDigits } from "../wallet/WalletTransactionCard";
import { createSessionReview } from "../sessions/api";
import {
  acceptTeacherSession,
  cancelSessionAsLearner,
  completeTeacherSession,
  getTeacherUnseenSessionCount,
  getSessionDetail,
  getSessionMessages,
  isMyMessage,
  rejectTeacherSession,
  sendSessionMessage,
  type SessionDetailData,
  type SessionMessageData,
} from "./api";
import { LiveRoom } from "./LiveRoom";
import { useAppearance } from "../../ui/appearance";
import type { TranslationKey } from "../../i18n";

function statusLabel(status: string, t: (key: TranslationKey) => string): string {
  switch (status) {
    case "pending": return t("status_pending");
    case "confirmed": return t("status_confirmed");
    case "done": return t("status_done");
    case "canceled": return t("status_canceled");
    case "awaiting_payment": return t("status_awaiting_payment");
    default: return status;
  }
}

function officialTime(detail: SessionDetailData): string {
  if (!detail.localDate || !detail.localStart || !detail.localEnd) {
    return "زمان رسمی جلسه دریافت نشد";
  }
  return `${formatJalaliDate(detail.localDate)} · ${toFaDigits(detail.localStart)} تا ${toFaDigits(detail.localEnd)}`;
}

function startMs(detail: SessionDetailData): number {
  return Date.parse(detail.scheduledAt);
}

/** پنجرهٔ ورود به کلاس تصویری: ۱۰ دقیقه قبل از شروع تا بعد از پایان. */
function canJoinVideo(detail: SessionDetailData): boolean {
  const start = startMs(detail);
  if (detail.status !== "confirmed" || Number.isNaN(start)) return false;
  return Date.now() >= start - 10 * 60_000;
}

/** پایان جلسه از لحظهٔ آغاز رسمی مجاز است. */
function canEndSession(detail: SessionDetailData): boolean {
  const start = startMs(detail);
  if (detail.status !== "confirmed" || Number.isNaN(start)) return false;
  return Date.now() >= start;
}

function timeHint(detail: SessionDetailData): string {
  const start = startMs(detail);
  if (Number.isNaN(start)) return "";
  const diff = start - Date.now();
  if (diff <= 0) return "";
  const minutes = Math.ceil(diff / 60_000);
  if (minutes <= 60) return `شروع کلاس تا ${toFaDigits(minutes)} دقیقه دیگر`;
  return `شروع کلاس ${formatJalaliDate(detail.localDate)} ساعت ${toFaDigits(detail.localStart)}`;
}

/* ─────────────────────────  چت هماهنگی  ───────────────────────── */

function CoordinationChat({
  detail,
  messages,
  sending,
  onSend,
  peerLabel,
}: {
  detail: SessionDetailData;
  messages: SessionMessageData[];
  sending: boolean;
  onSend: (body: string) => void;
  peerLabel: string;
}) {
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [messages.length]);

  const submit = () => {
    const text = draft.trim();
    if (!text || sending) return;
    onSend(text);
    setDraft("");
  };

  return (
    <section aria-label="چت هماهنگی جلسه" style={{ display: "grid", gap: 10 }}>
      <SectionHeader title="چت هماهنگی" description="برای هماهنگی شروع جلسه، پیام‌های شما اینجا رد و بدل می‌شود." />
      <Card style={{ display: "grid", gap: 0, padding: 0, overflow: "hidden" }}>
        <div
          ref={bodyRef}
          style={{
            maxHeight: 300,
            overflowY: "auto",
            display: "grid",
            gap: 8,
            alignContent: "start",
            padding: 14,
            background: colors.sand50,
          }}
        >
          {messages.length === 0 ? (
            <p style={{ margin: "8px 0", textAlign: "center", fontSize: 12, color: colors.inkMuted }}>
              هنوز پیامی رد و بدل نشده؛ اولین پیام را بفرستید.
            </p>
          ) : null}
          {messages.map((message) => {
            const mine = isMyMessage(message, detail);
            return (
              <div
                key={message.id}
                style={{
                  maxWidth: "84%",
                  justifySelf: mine ? "start" : "end",
                  display: "grid",
                  gap: 2,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 12.5,
                    lineHeight: 1.9,
                    color: colors.ink,
                    background: mine ? colors.olive50 : colors.surface,
                    border: `1px solid ${mine ? colors.olive100 : colors.sand150}`,
                    borderRadius: 14,
                    padding: "8px 12px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {message.body}
                </span>
                <span style={{ fontSize: 9.5, color: colors.inkFaint, textAlign: mine ? "right" : "left" }}>
                  {mine ? "شما" : peerLabel}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, padding: 10, borderTop: `1px solid ${colors.sand150}`, background: colors.surface }}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            maxLength={1000}
            aria-label="متن پیام هماهنگی"
            placeholder="پیام خود را بنویسید…"
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 44,
              borderRadius: 14,
              border: `1px solid ${colors.sand200}`,
              background: colors.sand50,
              color: colors.ink,
              padding: "0 14px",
              fontFamily: typography.fontFamily,
              fontSize: 13,
            }}
          />
          <Button onClick={submit} loading={sending} style={{ minHeight: 44, padding: "0 18px" }} aria-label="ارسال پیام">
            <Icon name="chevronL" size={18} />
          </Button>
        </div>
      </Card>
    </section>
  );
}

/* ─────────────────────────  صفحهٔ اصلی  ───────────────────────── */

export function SessionDetailScreen({
  sessionId,
  config,
  onRoleResolved,
}: {
  sessionId: string;
  config: UniversalAppConfig;
  onRoleResolved?: (role: "learner" | "teacher") => void;
}) {
  const runtime = usePlatform();
  const { t } = useAppearance();
  const id = Number.parseInt(sessionId, 10);
  const [detail, setDetail] = useState<SessionDetailData | null>(null);
  const [messages, setMessages] = useState<SessionMessageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [liveOpen, setLiveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // نقش نمایشگر به پوستهٔ اپ گزارش می‌شود تا ناوبری استاد/شاگرد درست باشد.
  useEffect(() => {
    if (detail) onRoleResolved?.(detail.viewerRole === "admin" ? "teacher" : detail.viewerRole);
  }, [detail, onRoleResolved]);

  // نظرسنجی شاگرد بعد از جلسه
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) {
      setError("شناسه جلسه نامعتبر است.");
      setLoading(false);
      return;
    }
    try {
      const next = await getSessionDetail(runtime, id);
      setDetail(next);
      setError(null);
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [id, runtime]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMessages = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) return;
    try {
      setMessages(await getSessionMessages(runtime, id));
    } catch {
      // خطای موقت چت — دور بعد تلاش می‌شود
    }
  }, [id, runtime]);

  useEffect(() => {
    void loadMessages();
    const timer = window.setInterval(() => void loadMessages(), 10_000);
    return () => window.clearInterval(timer);
  }, [loadMessages]);

  async function runAction(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await load();
      void getTeacherUnseenSessionCount(runtime).catch(() => 0);
    } catch (actionFailure) {
      setActionError(messageOf(actionFailure));
    } finally {
      setBusy(false);
    }
  }

  async function submitMessage(body: string) {
    setSending(true);
    try {
      await sendSessionMessage(runtime, id, body);
      await loadMessages();
    } catch (sendError) {
      setActionError(messageOf(sendError));
    } finally {
      setSending(false);
    }
  }

  async function submitReview() {
    if (!detail || reviewSaving) return;
    setReviewSaving(true);
    setReviewError(null);
    try {
      await createSessionReview(runtime, { sessionId: detail.id, rating, text: reviewText });
      setSurveyOpen(false);
      await load();
    } catch (reviewFailure) {
      setReviewError(messageOf(reviewFailure));
    } finally {
      setReviewSaving(false);
    }
  }

  if (loading) {
    return <LoadingState label="در حال دریافت جزئیات جلسه…" style={{ minHeight: 220 }} />;
  }

  if (error || !detail) {
    return (
      <ErrorState
        title="جزئیات جلسه دریافت نشد"
        description={error ?? "این جلسه در دسترس شما نیست."}
        action={
          <Button onClick={() => navigateApp("/sessions", config)}>بازگشت به جلسات</Button>
        }
      />
    );
  }

  const isTeacher = detail.viewerRole === "teacher" || detail.viewerRole === "admin";
  const isLearner = detail.viewerRole === "learner";
  const peerLabel = isTeacher ? detail.learnerName : detail.teacherName;
  const peerAvatar = isTeacher ? detail.learnerAvatar : detail.teacherAvatar;
  const joinReady = canJoinVideo(detail);
  const endReady = canEndSession(detail);
  const hint = timeHint(detail);
  const showSurvey = isLearner && detail.status === "done" && !detail.rated;

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      {/* کادر وضعیت با حاشیهٔ برجسته */}
      <div
        role="status"
        aria-label={`وضعیت جلسه: ${statusLabel(detail.status, t)}`}
        className="vodda-enter"
        style={{
          position: "relative",
          overflow: "hidden",
          display: "grid",
          gap: 14,
          padding: 18,
          borderRadius: 26,
          border: `1.5px solid ${detail.status === "canceled" ? colors.sand200 : colors.goldSoft}`,
          background:
            detail.status === "canceled"
              ? colors.surface
              : `linear-gradient(150deg, ${colors.goldBackground}, #fffdf8 72%)`,
          boxShadow: "0 0 0 4px rgba(231,213,168,.18), 0 14px 30px rgba(139,104,31,.10)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          <StatusPill status={detail.status} label={statusLabel(detail.status, t)} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {detail.instant ? (
              <span
                aria-label="جلسهٔ فوری"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "4px 10px", borderRadius: radii.pill,
                  background: gradients.goldRich, color: "#fffaf0", fontSize: 10.5, fontWeight: 800,
                  boxShadow: "0 3px 8px rgba(139,104,31,.35)",
                }}
              >
                <Icon name="sparkle" size={12} stroke={2.2} />
                جلسهٔ فوری
              </span>
            ) : null}
            <span style={{ fontSize: 11.5, color: colors.inkMuted, fontWeight: 700 }}>
              {toFaDigits(detail.duration)} دقیقه
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={peerLabel} src={peerAvatar || undefined} size={48} ring tone="gold" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ display: "block", fontSize: 15, fontWeight: 900, color: colors.ink }}>{peerLabel}</strong>
            <span style={{ display: "block", marginTop: 3, fontSize: 13, color: colors.inkSecondary }}>
              {isTeacher ? "قرآن‌آموز" : "استاد"} · جلسهٔ {detail.service || "قرآن"}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "12px 14px",
            borderRadius: 14,
            background: "rgba(255,255,255,.75)",
            border: `1px solid ${colors.sand150}`,
            color: colors.inkSecondary,
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          <Icon name="calendar" size={16} style={{ flex: "0 0 auto", color: colors.goldDark }} />
          {officialTime(detail)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ display: "grid", gap: 3, padding: "10px 13px", borderRadius: 14, background: colors.surface, border: `1px solid ${colors.sand150}` }}>
            <span style={{ fontSize: 10.5, color: colors.inkMuted, fontWeight: 700 }}>مبلغ جلسه</span>
            <strong style={{ fontSize: 13.5, fontWeight: 800, color: colors.olive700 }}>
              {detail.price === 0 ? "رایگان" : `${formatWalletAmount(detail.price)} تومان`}
            </strong>
          </div>
          <div style={{ display: "grid", gap: 3, padding: "10px 13px", borderRadius: 14, background: colors.surface, border: `1px solid ${colors.sand150}` }}>
            <span style={{ fontSize: 10.5, color: colors.inkMuted, fontWeight: 700 }}>شناسه جلسه</span>
            <strong style={{ fontSize: 13.5, fontWeight: 800, color: colors.ink }}>#{toFaDigits(detail.id)}</strong>
          </div>
        </div>

        {detail.note ? (
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 2, color: colors.inkSecondary, background: colors.sand50, borderRadius: 12, padding: "9px 12px" }}>
            یادداشت: {detail.note}
          </p>
        ) : null}
        {detail.rejectNote ? (
          <p style={{ margin: 0, fontSize: 12.5, color: colors.danger, background: "rgba(179,64,58,.08)", borderRadius: 12, padding: "9px 12px" }}>
            دلیل رد: {detail.rejectNote}
          </p>
        ) : null}
      </div>

      {actionError ? (
        <p role="alert" style={{ margin: 0, fontSize: 12.5, color: colors.danger, background: "rgba(179,64,58,.08)", borderRadius: 12, padding: "10px 13px" }}>
          {actionError}
        </p>
      ) : null}

      {/* اقدامات استاد */}
      {isTeacher && detail.status === "pending" ? (
        <Card style={{ display: "grid", gap: 12, padding: 16, borderRadius: 22, border: `1.5px solid ${colors.goldSoft}`, background: colors.goldBackground }}>
          <strong style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: "#7a5e1e" }}>
            درخواست جلسه در انتظار پاسخ شماست
          </strong>
          <span style={{ fontSize: 12, color: "#9a7426", lineHeight: 1.9 }}>
            با تأیید، جلسه قطعی می‌شود و قرآن‌آموز می‌تواند کلاس تصویری را آغاز کند.
          </span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Button variant="secondary" disabled={busy} onClick={() => setRejectOpen(true)}>رد درخواست</Button>
            <Button loading={busy} onClick={() => void runAction(() => acceptTeacherSession(runtime, detail.id))}>
              <Icon name="checkCircle" size={18} />
              تأیید جلسه
            </Button>
          </div>
        </Card>
      ) : null}

      {/* کلاس تصویری */}
      {detail.status === "confirmed" ? (
        <Card style={{ display: "grid", gap: 12, padding: 16, borderRadius: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 14, flex: "0 0 42px", background: colors.olive100, color: colors.olive700 }}>
              <Icon name="video" size={21} />
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: colors.ink }}>کلاس تصویری وُدّا</strong>
              <span style={{ display: "block", fontSize: 11.5, color: colors.inkMuted, marginTop: 1 }}>
                {joinReady ? "کلاس باز است — همین حالا وارد شوید." : hint || "پنجرهٔ ورود از ۱۰ دقیقه قبل از شروع باز می‌شود."}
              </span>
            </div>
          </div>
          <Button
            fullWidth
            disabled={!joinReady || busy}
            loading={busy && liveOpen}
            onClick={() => setLiveOpen(true)}
            style={{ minHeight: 48 }}
          >
            <Icon name="video" size={19} />
            {joinReady ? t("session_start_video") : t("session_not_time_yet")}
          </Button>
          {isTeacher && endReady ? (
            <Button
              variant="secondary"
              fullWidth
              disabled={busy}
              onClick={() =>
                void runAction(async () => {
                  await completeTeacherSession(runtime, detail.id);
                })
              }
            >
              <Icon name="checkCircle" size={18} />
              پایان جلسه و ثبت برگزاری
            </Button>
          ) : null}
          {isTeacher && !endReady ? (
            <span style={{ fontSize: 11, color: colors.inkMuted, textAlign: "center" }}>
              دکمهٔ «پایان جلسه» پس از آغاز رسمی جلسه فعال می‌شود.
            </span>
          ) : null}
        </Card>
      ) : null}

      {/* اقدامات قرآن‌آموز */}
      {isLearner && (detail.status === "pending" || detail.status === "confirmed") ? (
        <Card style={{ display: "grid", gap: 10, padding: 15, borderRadius: 22 }}>
          <span style={{ fontSize: 12, color: colors.inkMuted, lineHeight: 1.9 }}>
            {detail.status === "pending"
              ? "درخواست شما برای استاد ارسال شده و در انتظار تأیید اوست. می‌توانید از چت زیر هماهنگ کنید یا جلسه را لغو کنید."
              : "جلسه تأیید شد. برای هماهنگی از چت زیر استفاده کنید و سر موعد وارد کلاس تصویری شوید."}
          </span>
          {canCancelSession(detail) ? (
            <Button variant="secondary" fullWidth loading={busy} onClick={() => setCancelOpen(true)}>
              <Icon name="x" size={17} />
              لغو جلسه
            </Button>
          ) : null}
        </Card>
      ) : null}

      {/* نظرسنجی شاگرد پس از جلسه */}
      {detail.status === "done" ? (
        <Card style={{ display: "grid", gap: 12, padding: 16, borderRadius: 22 }}>
          {showSurvey ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 14, flex: "0 0 42px", background: colors.goldBackground, border: `1px solid ${colors.goldSoft}`, color: colors.goldDark }}>
                  <Icon name="star" size={21} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: colors.ink }}>جلسه برگزار شد</strong>
                  <span style={{ display: "block", fontSize: 11.5, color: colors.inkMuted, marginTop: 1 }}>
                    نظر شما به بهترشدن کلاس‌های استاد کمک می‌کند.
                  </span>
                </div>
              </div>
              <Button fullWidth onClick={() => setSurveyOpen(true)} style={{ background: colors.gold, borderColor: colors.gold }}>
                شرکت در نظرسنجی و ثبت امتیاز
              </Button>
            </>
          ) : isLearner && detail.rated ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, color: colors.olive700, fontWeight: 700 }}>
              <Icon name="checkCircle" size={17} />
              امتیاز شما برای این جلسه ثبت شده است.
            </span>
          ) : null}
        </Card>
      ) : null}

      <CoordinationChat
        detail={detail}
        messages={messages}
        sending={sending}
        onSend={(body) => void submitMessage(body)}
        peerLabel={peerLabel}
      />

      {/* پوشش کلاس تصویری */}
      {liveOpen ? (
        <LiveRoom
          sessionId={detail.id}
          role={isTeacher ? "teacher" : "learner"}
          myUserId={isTeacher ? detail.teacherUserId : detail.learnerId}
          peerName={peerLabel}
          peerAvatar={peerAvatar || undefined}
          startAt={detail.scheduledAt}
          durationMinutes={detail.duration}
          onClose={() => {
            setLiveOpen(false);
            void load();
            void loadMessages();
          }}
        />
      ) : null}

      {/* شیت رد درخواست (استاد) */}
      <Sheet open={rejectOpen} title="رد درخواست جلسه" onClose={() => { if (!busy) setRejectOpen(false); }}>
        <div style={{ display: "grid", gap: spacing.md }}>
          <label style={{ display: "grid", gap: spacing.sm, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>دلیل رد</span>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              maxLength={255}
              disabled={busy}
              placeholder="دلیل رد را برای قرآن‌آموز بنویسید…"
              style={{ width: "100%", resize: "vertical", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.md, color: colors.ink, background: colors.surface, boxShadow: shadows.xs, fontFamily: typography.fontFamily, ...typography.body }}
            />
          </label>
          <Button
            variant="danger"
            fullWidth
            loading={busy}
            onClick={() =>
              void runAction(async () => {
                if (!rejectReason.trim()) throw new Error("دلیل رد درخواست را وارد کنید.");
                await rejectTeacherSession(runtime, detail.id, rejectReason);
                setRejectOpen(false);
              })
            }
          >
            رد درخواست
          </Button>
        </div>
      </Sheet>

      {/* دیالوگ لغو جلسه (قرآن‌آموز) */}
      <Sheet open={cancelOpen} title="لغو جلسه" onClose={() => { if (!busy) setCancelOpen(false); }}>
        <div style={{ display: "grid", gap: spacing.md }}>
          <p style={{ ...typography.body, margin: 0, color: colors.inkSecondary }}>
            لغو فقط پیش از زمان شروع مجاز است. در صورت موفقیت، مبلغ به کیف پول بازمی‌گردد.
          </p>
          <Button
            variant="danger"
            fullWidth
            loading={busy}
            onClick={() =>
              void runAction(async () => {
                await cancelSessionAsLearner(runtime, detail.id);
                setCancelOpen(false);
              })
            }
          >
            لغو جلسه
          </Button>
        </div>
      </Sheet>

      {/* شیت نظرسنجی (قرآن‌آموز) */}
      <Sheet open={surveyOpen} title={`نظرسنجی جلسه با ${detail.teacherName}`} onClose={() => { if (!reviewSaving) setSurveyOpen(false); }}>
        <div style={{ display: "grid", gap: spacing.lg }}>
          <div style={{ display: "flex", justifyContent: "center", gap: spacing.sm, direction: "ltr" }}>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`${toFaDigits(value)} ستاره`}
                aria-pressed={value <= rating}
                onClick={() => setRating(value)}
                disabled={reviewSaving}
                style={{
                  border: 0,
                  padding: spacing.xs,
                  background: "transparent",
                  color: value <= rating ? colors.gold : colors.sand200,
                  fontSize: 34,
                  cursor: reviewSaving ? "not-allowed" : "pointer",
                }}
              >
                ★
              </button>
            ))}
          </div>
          <label style={{ display: "grid", gap: spacing.sm, ...typography.bodySmall, color: colors.ink }}>
            <span style={{ fontWeight: 700 }}>نظر شما (اختیاری)</span>
            <textarea
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              maxLength={1000}
              rows={4}
              disabled={reviewSaving}
              placeholder="تجربهٔ خود از این جلسه را بنویسید…"
              style={{ width: "100%", resize: "vertical", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.md, color: colors.ink, background: colors.surface, boxShadow: shadows.xs, fontFamily: typography.fontFamily, ...typography.body }}
            />
          </label>
          {reviewError ? <span role="alert" style={{ ...typography.caption, color: colors.danger }}>{reviewError}</span> : null}
          <Button fullWidth loading={reviewSaving} onClick={() => void submitReview()}>
            ثبت امتیاز
          </Button>
        </div>
      </Sheet>

      {messages.length === 0 && detail.status === "pending" && isTeacher ? (
        <EmptyState
          icon={<Icon name="message" size={30} />}
          title="پیش از تأیید، هماهنگ کنید"
          description="اگر دربارهٔ زمان یا محتوای جلسه سؤالی دارید، از چت هماهنگی بپرسید."
        />
      ) : null}
    </section>
  );
}

function canCancelSession(detail: SessionDetailData): boolean {
  if (detail.status !== "pending" && detail.status !== "confirmed") return false;
  const timestamp = startMs(detail);
  return Number.isNaN(timestamp) || Date.now() < timestamp;
}
