"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { asInteger, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import { avatarSrc, uploadsOriginOf } from "@/lib/avatarImage";
import type { PlatformRuntime } from "../../platform/types";
import { navigateApp } from "../../router";
import {
  Avatar,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  SectionHeader,
  Sheet,
  StatusPill,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { formatAppDate } from "../../ui/jalali";
import { localizedDigits } from "../../ui/persian";
import type { TranslationKey } from "../../i18n";
import { messageOf } from "../../ui/errorMessage";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";

type TeacherSessionsMode = "requests" | "sessions";
type TeacherSessionsWhen = "pending" | "upcoming" | "past";

type TeacherSession = {
  id: number;
  learnerName: string;
  learnerAvatar: string;
  service: string;
  scheduledAt: string;
  localDate: string;
  localStart: string;
  localEnd: string;
  duration: number;
  price: number;
  status: string;
  note: string;
  rejectNote: string;
  /** جلسهٔ فوری — رزرو همین‌لحظه. */
  instant: boolean;
  /** نوع جلسهٔ آنلاین — تلفنی/متنی/تصویری. */
  mode: string;
  /** در لحظهٔ دریافت فهرست هنوز دیده‌نشده بود — با نشان قرمز مشخص می‌شود. */
  unseen: boolean;
};

const statusLabels: Record<string, string> = {
  pending: "در انتظار پاسخ",
  confirmed: "تأیید شده",
  done: "انجام شده",
  canceled: "لغو شده",
};

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
function parseTeacherSession(value: unknown): TeacherSession | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = asInteger(row.id);
  if (id <= 0) return null;
  const learner = asRecord(row.learner);

  return {
    id,
    learnerName: asString(learner?.name, "قرآن‌آموز"),
    learnerAvatar: asString(learner?.avatar_url),
    service: asString(row.service ?? row.title, "جلسه"),
    scheduledAt: asString(row.scheduled_at),
    localDate: asString(row.local_date),
    localStart: asString(row.local_start),
    localEnd: asString(row.local_end),
    duration: asInteger(row.duration, 30),
    price: asInteger(row.price),
    status: asString(row.status, "pending"),
    note: asString(row.note),
    rejectNote: asString(row.reject_note),
    instant: row.instant === true,
    mode: asString(row.mode),
    // دیده‌نشده = مهر دیده‌شدن هنوز ثبت نشده باشد؛ هم نشان سروری و هم
    // حالت قدیمی transient پشتیبانی می‌شود.
    unseen: row.unseen === true || asString(row.teacher_seen_at) === "",
  };
}

async function getTeacherSessions(runtime: PlatformRuntime, when: TeacherSessionsWhen): Promise<TeacherSession[]> {
  const search = new URLSearchParams({ when });
  const response = await runtime.request<ApiEnvelope<unknown[]>>(`/teacher/sessions?${search.toString()}`);
  return (response.data ?? []).map(parseTeacherSession).filter((item): item is TeacherSession => item !== null);
}

/** پس از دیدن فهرست، ردیف‌های دیده‌نشده مهر می‌خورند (شمارندهٔ قرمز صفر می‌شود). */
async function markTeacherSessionsSeen(runtime: PlatformRuntime) {
  await runtime.request<ApiEnvelope<unknown>>("/teacher/sessions/mark-seen", { method: "POST" });
}

async function acceptTeacherSession(runtime: PlatformRuntime, sessionId: number) {
  return runtime.request<ApiEnvelope<unknown>>(`/teacher/sessions/${sessionId}/accept`, { method: "POST" });
}

async function rejectTeacherSession(runtime: PlatformRuntime, sessionId: number, reason: string) {
  return runtime.request<ApiEnvelope<unknown>>(`/teacher/sessions/${sessionId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason: reason.trim() }),
  });
}

async function completeTeacherSession(runtime: PlatformRuntime, sessionId: number) {
  return runtime.request<ApiEnvelope<unknown>>(`/teacher/sessions/${sessionId}/complete`, { method: "POST" });
}

type Translate = (text: string) => string;

function amountLabel(value: number, lang: "fa" | "en"): string {
  return lang === "en"
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, value))
    : formatWalletAmount(value, lang);
}

function officialTime(session: TeacherSession, L: Translate, lang: "fa" | "en"): string {
  if (!session.localDate || !session.localStart || !session.localEnd) return "";
  return L("{date} · {from} تا {to}")
    .replace("{date}", formatAppDate(session.localDate, lang))
    .replace("{from}", localizedDigits(session.localStart, lang))
    .replace("{to}", localizedDigits(session.localEnd, lang));
}

function canCompleteSession(session: TeacherSession): boolean {
  const startAt = Date.parse(session.scheduledAt);
  if (Number.isNaN(startAt)) return false;
  return Date.now() >= startAt + Math.max(0, session.duration) * 60_000;
}

function SessionCard({
  session,
  busy,
  mode,
  onOpen,
  onAccept,
  onReject,
  onComplete,
}: {
  session: TeacherSession;
  busy: boolean;
  mode: TeacherSessionsMode;
  onOpen: () => void;
  onAccept: () => void;
  onReject: () => void;
  onComplete: () => void;
}) {
  const { t, L, lang, N } = useAppearance();
  const runtime = usePlatform();
  const commonCardStyle = {
    display: "grid",
    gap: 13,
    padding: 15,
    borderRadius: 24,
    boxShadow: "0 0 6px rgba(46,54,34,.04)",
  } as const;

  if (mode === "requests") {
    return (
      <Card className="vodda-card--interactive" style={{ ...commonCardStyle, cursor: "pointer" }} onClick={onOpen}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={session.learnerName} src={avatarSrc(session.learnerAvatar, undefined, uploadsOriginOf(runtime.apiBaseUrl))} size={46} ring={false} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: colors.ink }}>{N(session.learnerName)}</strong>
            <span style={{ display: "block", marginTop: 3, fontSize: 12.5, color: colors.inkSecondary }}>{L(session.service)}</span>
          </div>
          {session.instant ? (
            <span style={{ padding: "4px 10px", borderRadius: radii.pill, color: "#fffaf0", background: "linear-gradient(145deg,#d8b869,#b8923c)", fontSize: 10.5, fontWeight: 800 }}>{L("فوری")}</span>
          ) : (
            <span style={{ padding: "4px 10px", borderRadius: radii.pill, color: colors.clay, background: colors.clayBackground, fontSize: 11, fontWeight: 800 }}>
              {L("جدید")}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 14px", borderRadius: 13, background: colors.sand50 }}>
          <Icon name="calendar" size={16} style={{ flex: "0 0 auto", color: colors.olive500 }} />
          <span style={{ minWidth: 0, flex: 1, fontSize: 12.5, color: colors.inkSecondary }}>{officialTime(session, L, lang) || L("زمان رسمی جلسه دریافت نشد")}</span>
          <strong style={{ flex: "0 0 auto", fontSize: 12.5, fontWeight: 800, color: colors.olive700 }}>
            {session.price === 0 ? L("رایگان") : L("{n} ت").replace("{n}", amountLabel(session.price, lang))}
          </strong>
        </div>

        {session.note ? <p style={{ margin: 0, fontSize: 12, color: colors.inkMuted }}>{L("یادداشت: {note}").replace("{note}", session.note)}</p> : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }} onClick={(event) => event.stopPropagation()}>
          <Button variant="secondary" disabled={busy} onClick={onReject}>{L("رد")}</Button>
          <Button loading={busy} onClick={onAccept}>{L("تأیید")}</Button>
        </div>
      </Card>
    );
  }

  const canComplete = session.status === "confirmed" && canCompleteSession(session);

  return (
    <Card className="vodda-card--interactive" style={{ ...commonCardStyle, cursor: "pointer", borderColor: session.unseen ? "rgba(216,184,105,.9)" : undefined, borderWidth: session.unseen ? 1.5 : undefined }} onClick={onOpen}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: spacing.md }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <StatusPill status={session.status} label={statusLabel(session.status, t)} />
          {session.instant ? (
            <span style={{ padding: "3px 9px", borderRadius: radii.pill, color: "#fffaf0", background: "linear-gradient(145deg,#d8b869,#b8923c)", fontSize: 10, fontWeight: 800 }}>{L("فوری")}</span>
          ) : null}
          {session.mode ? (
            (() => {
              const map: Record<string, { label: string; icon: "phone" | "message" | "video" }> = {
                voice: { label: "تلفنی و صوتی", icon: "phone" },
                text: { label: "متنی (چت)", icon: "message" },
                video: { label: "تصویری", icon: "video" },
              };
              const meta = map[session.mode];
              if (!meta) return null;
              return (
                <span
                  aria-label={L("نوع جلسه: {n}").replace("{n}", L(meta.label))}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 9px",
                    borderRadius: radii.pill,
                    background: colors.greenBackground,
                    border: `1px solid ${colors.greenBorder}`,
                    color: colors.greenInk,
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                >
                  <Icon name={meta.icon} size={11} stroke={2.2} />
                  {L(meta.label)}
                </span>
              );
            })()
          ) : null}
          {session.unseen ? (
            <span aria-label={L("جلسهٔ دیده‌نشده")} style={{ padding: "3px 9px", borderRadius: radii.pill, color: "#ffffff", background: colors.danger, fontSize: 10, fontWeight: 800 }}>{L("جدید")}</span>
          ) : null}
        </div>
        <span style={{ fontSize: 12, color: colors.inkMuted, fontWeight: 600 }}>
          {L("{n} دقیقه").replace("{n}", localizedDigits(session.duration, lang))} · {session.price === 0 ? L("رایگان") : L("{n} ت").replace("{n}", amountLabel(session.price, lang))}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={session.learnerName} src={avatarSrc(session.learnerAvatar, undefined, uploadsOriginOf(runtime.apiBaseUrl))} size={46} ring={false} />
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: colors.ink }}>{N(session.learnerName)}</strong>
          <span style={{ display: "block", marginTop: 3, fontSize: 12.5, color: colors.inkSecondary }}>{L(session.service)}</span>
        </div>
        <Icon name="chevronL" size={18} style={{ flex: "0 0 auto", marginInlineStart: "auto", color: colors.inkFaint }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 14px", borderRadius: 13, background: colors.sand50, color: colors.inkSecondary, fontSize: 12.5 }}>
        <Icon name="calendar" size={16} style={{ flex: "0 0 auto", color: colors.olive500 }} />
        {officialTime(session, L, lang) || L("زمان رسمی جلسه دریافت نشد")}
      </div>

      {session.note ? <p style={{ margin: 0, fontSize: 12, color: colors.inkMuted }}>{L("یادداشت: {note}").replace("{note}", session.note)}</p> : null}
      {session.rejectNote ? <p style={{ margin: 0, fontSize: 12, color: colors.clay }}>{L("دلیل رد: {note}").replace("{note}", session.rejectNote)}</p> : null}

      {session.status === "confirmed" ? (
        <div onClick={(event) => event.stopPropagation()}>
          <Button
            fullWidth
            disabled={!canComplete || busy}
            loading={busy}
            onClick={onComplete}
          >
            <Icon name="checkCircle" size={18} />
            {canComplete ? L("ثبت برگزاری جلسه") : L("پس از پایان جلسه قابل ثبت است")}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function TeacherSessionsScreen({ mode, config }: { mode: TeacherSessionsMode; config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { L, lang, N } = useAppearance();
  const [when, setWhen] = useState<TeacherSessionsWhen>(mode === "requests" ? "pending" : "upcoming");
  const [sessions, setSessions] = useState<TeacherSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TeacherSession | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<TeacherSession | null>(null);

  useEffect(() => {
    setWhen(mode === "requests" ? "pending" : "upcoming");
  }, [mode]);

  // باگ refresh-loop: اجرای دوم StrictMode یا فراخوانی دیرهنگام نباید state را با دادهٔ کهنه بازنویسی کند.
  const loadGeneration = useRef(0);

  const load = useCallback(async (target: TeacherSessionsWhen) => {
    const generation = ++loadGeneration.current;
    const isStale = () => loadGeneration.current !== generation;
    setLoading(true);
    setError(null);
    try {
      const rows = await getTeacherSessions(runtime, target);
      if (isStale()) return;
      setSessions(rows);
    } catch (loadError) {
      if (isStale()) return;
      setSessions([]);
      setError(messageOf(loadError));
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load(when);
  }, [load, when]);

  // نشان «جدید» یک لحظه نمایش داده می‌شود و سپس جلسات مهر دیده‌شدن می‌خورند —
  // به‌این‌ترتیب رفرش‌های دوبارهٔ همان فهرست، نشان را بی‌دلیل پاک نمی‌کنند.
  useEffect(() => {
    if (loading || sessions.length === 0) return;
    const hasUnseen = sessions.some((item) => item.unseen);
    if (!hasUnseen) return;
    const timer = window.setTimeout(() => {
      void markTeacherSessionsSeen(runtime).catch(() => {
        // مهر ناموفق — شمارنده در نوسازی بعدی اصلاح می‌شود
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [loading, runtime, sessions]);

  const heading = mode === "requests" ? L("درخواست‌های دریافتی") : L("جلسات من");
  const emptyDescription = mode === "requests" ? L("درخواست جدیدی برای بررسی ندارید.") : L("جلسه‌ای در این بخش ندارید.");
  const loadLabel = useMemo(() => when === "pending" ? L("در حال دریافت درخواست‌ها…") : when === "upcoming" ? L("در حال دریافت جلسات پیش‌رو…") : L("در حال دریافت جلسات گذشته…"), [when, L, lang]);

  async function accept(session: TeacherSession) {
    if (busyId !== null) return;
    setBusyId(session.id);
    setError(null);
    try {
      await acceptTeacherSession(runtime, session.id);
      await load("pending");
    } catch (mutationError) {
      setError(messageOf(mutationError));
    } finally {
      setBusyId(null);
    }
  }

  function openReject(session: TeacherSession) {
    setRejectTarget(session);
    setRejectReason("");
    setRejectError(null);
  }

  async function reject() {
    if (!rejectTarget || busyId !== null) return;
    if (!rejectReason.trim()) {
      setRejectError("دلیل رد درخواست را وارد کنید.");
      return;
    }
    const sessionId = rejectTarget.id;
    setBusyId(sessionId);
    setRejectError(null);
    try {
      await rejectTeacherSession(runtime, sessionId, rejectReason);
      setRejectTarget(null);
      setRejectReason("");
      await load("pending");
    } catch (mutationError) {
      setRejectError(messageOf(mutationError));
    } finally {
      setBusyId(null);
    }
  }

  async function complete() {
    if (!completeTarget || busyId !== null) return;
    const sessionId = completeTarget.id;
    setBusyId(sessionId);
    setCompleteTarget(null);
    setError(null);
    try {
      await completeTeacherSession(runtime, sessionId);
      await load(when);
    } catch (mutationError) {
      setError(messageOf(mutationError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <SectionHeader title={heading} description={mode === "requests" ? L("{n} درخواست در انتظار پاسخ شما").replace("{n}", localizedDigits(sessions.length, lang)) : L("زمان‌ها بر اساس ساعت رسمی سامانه نمایش داده می‌شوند.")} />

      {mode === "sessions" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {(["upcoming", "past"] as const).map((tab) => {
            const selected = when === tab;
            return (
              <button key={tab} type="button" className="vodda-tappable" aria-pressed={selected} onClick={() => setWhen(tab)} style={{ minHeight: 44, border: 0, borderRadius: 14, color: selected ? colors.onOlive : colors.inkMuted, background: selected ? colors.olive600 : colors.surface, boxShadow: shadows.xs, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {tab === "upcoming" ? L("پیش‌رو") : L("گذشته")}
              </button>
            );
          })}
        </div>
      ) : null}

      {loading ? <LoadingState label={loadLabel} /> : null}
      {!loading && error ? <ErrorState title={L("دریافت اطلاعات ناموفق بود")} description={L(error)} action={<Button onClick={() => void load(when)}>{L("تلاش دوباره")}</Button>} /> : null}
      {!loading && !error && sessions.length === 0 ? <EmptyState icon={<Icon name="calendar" size={30} />} title={L("موردی نیست")} description={emptyDescription} /> : null}
      {!loading && !error && sessions.length > 0 ? (
        <div style={{ display: "grid", gap: spacing.md }}>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              busy={busyId === session.id}
              mode={mode}
              onOpen={() => navigateApp(`/session/${session.id}`, config)}
              onAccept={() => void accept(session)}
              onReject={() => openReject(session)}
              onComplete={() => setCompleteTarget(session)}
            />
          ))}
        </div>
      ) : null}

      <Sheet open={rejectTarget !== null} title={L("رد درخواست جلسه")} onClose={() => { if (busyId === null) setRejectTarget(null); }}>
        <div style={{ display: "grid", gap: spacing.md }}>
          <label style={{ display: "grid", gap: spacing.sm, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>{L("دلیل رد")}</span>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              maxLength={1000}
              disabled={busyId !== null}
              placeholder={L("دلیل رد درخواست را برای قرآن‌آموز بنویسید…")}
              style={{ width: "100%", resize: "vertical", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.md, color: colors.ink, background: colors.surface, boxShadow: shadows.xs, fontFamily: typography.fontFamily, ...typography.body }}
            />
          </label>
          {rejectError ? <span role="alert" style={{ ...typography.caption, color: colors.danger }}>{L(rejectError)}</span> : null}
          <Button variant="danger" fullWidth loading={busyId !== null} onClick={() => void reject()}>{L("رد درخواست")}</Button>
        </div>
      </Sheet>

      <Dialog open={completeTarget !== null} title={L("ثبت انجام جلسه")} onClose={() => { if (busyId === null) setCompleteTarget(null); }}>
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>
          {L("با ثبت انجام جلسه، درآمد آن پس از کسر کارمزد پلتفرم به کیف پول شما واریز می‌شود و از شاگرد نظرسنجی گرفته می‌شود. این عملیات را فقط پس از پایان واقعی جلسه تأیید کنید.")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" disabled={busyId !== null} onClick={() => setCompleteTarget(null)}>{L("انصراف")}</Button>
          <Button loading={busyId !== null} onClick={() => void complete()}>{L("تأیید انجام")}</Button>
        </div>
      </Dialog>
    </section>
  );
}
