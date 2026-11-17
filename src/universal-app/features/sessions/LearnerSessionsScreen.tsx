"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlatform } from "../../platform/context";
import { avatarSrc, uploadsOriginOf } from "@/lib/avatarImage";
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
import { messageOf } from "../../ui/errorMessage";
import { toFaDigits } from "../wallet/WalletTransactionCard";
import { payViaSamanGate } from "../../../lib/saman-gate";
import { formatLocalDate } from "@/lib/datetime";
import { payBooking } from "../booking/api";
import {
  cancelLearnerSession,
  createSessionReview,
  getLearnerSessions,
  type LearnerSessionsWhen,
} from "./api";
import {
  hasOfficialSessionTime,
  isUpcomingSession,
  type LearnerSession,
} from "./types";

const statusLabels: Record<string, string> = {
  pending: "در انتظار تأیید",
  confirmed: "تأیید شده",
  done: "انجام شده",
  canceled: "لغو شده",
  awaiting_payment: "در انتظار پرداخت",
};

function officialTime(session: LearnerSession): string {
  if (!hasOfficialSessionTime(session)) return "زمان رسمی جلسه دریافت نشد";
  // باگ persian-dates — تاریخ شمسی از util مرکزی، نه میلادی خام
  return `${formatLocalDate(session.localDate, "fa", "dayMonth")} · ${toFaDigits(session.localStart)} تا ${toFaDigits(session.localEnd)}`;
}

function canCancel(session: LearnerSession): boolean {
  if (!isUpcomingSession(session)) return false;
  const timestamp = Date.parse(session.scheduledAt);
  return Number.isNaN(timestamp) || Date.now() < timestamp;
}

function SessionCard({
  session,
  busy,
  onCancel,
  onRate,
  onPay,
}: {
  session: LearnerSession;
  busy: boolean;
  onCancel: () => void;
  onRate: () => void;
  onPay: () => void;
}) {
  const runtime = usePlatform();
  return (
    <Card className="vodda-card--interactive" style={{ display: "grid", gap: 13, borderRadius: 24, padding: 15, boxShadow: "0 0 6px rgba(46,54,34,.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
        <StatusPill status={session.status} label={statusLabels[session.status] ?? session.status} />
        <span style={{ ...typography.caption, color: colors.inkMuted }}>
          {toFaDigits(session.duration)} دقیقه
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
        <Avatar name={session.teacherName} src={avatarSrc(session.teacherAvatar, undefined, uploadsOriginOf(runtime.apiBaseUrl))} size={46} ring />
        <div style={{ minWidth: 0 }}>
          <strong style={{ ...typography.body, display: "block" }}>{session.teacherName}</strong>
          <span style={{ ...typography.bodySmall, color: colors.inkSecondary }}>{session.service}</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "11px 14px",
          borderRadius: 13,
          background: colors.sand50,
          color: colors.inkSecondary,
          fontSize: 12.5,
        }}
      >
        <Icon name="calendar" size={16} style={{ flex: "0 0 auto", color: colors.olive500 }} />
        {officialTime(session)}
      </div>

      {session.rejectNote ? (
        <p style={{ ...typography.caption, margin: 0, color: colors.danger }}>
          دلیل لغو: {session.rejectNote}
        </p>
      ) : null}

      {session.status === "awaiting_payment" ? (
        <div style={{ display: "grid", gap: spacing.sm }}>
          <span style={{ ...typography.caption, color: colors.goldDark }}>
            پرداخت آنلاین تکمیل نشده؛ با تکمیل پرداخت، درخواست برای استاد ارسال می‌شود.
          </span>
          <Button fullWidth loading={busy} onClick={onPay}>
            <Icon name="wallet" size={17} />
            تکمیل پرداخت
          </Button>
        </div>
      ) : null}

      {session.status === "pending" || session.status === "confirmed" ? (
        <div style={{ display: "grid", gap: spacing.sm }}>
          <span style={{ ...typography.caption, color: colors.inkMuted }}>
            {session.status === "confirmed"
              ? "جلسه تأیید شده است. جزئیات برگزاری را با استاد هماهنگ کنید."
              : "در انتظار تأیید استاد"}
          </span>
          {canCancel(session) ? (
            <Button variant="secondary" fullWidth loading={busy} onClick={onCancel}>
              <Icon name="x" size={17} />
              لغو جلسه
            </Button>
          ) : null}
        </div>
      ) : null}

      {session.status === "done" && !session.rated ? (
        <Button fullWidth onClick={onRate} style={{ background: colors.gold, borderColor: colors.gold }}>
          ثبت امتیاز و نظر
        </Button>
      ) : null}

    </Card>
  );
}

export function LearnerSessionsScreen() {
  const runtime = usePlatform();
  const [when, setWhen] = useState<LearnerSessionsWhen>("upcoming");
  const [sessions, setSessions] = useState<LearnerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<LearnerSession | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [ratingTarget, setRatingTarget] = useState<LearnerSession | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // باگ refresh-loop: اجرای دوم StrictMode یا فراخوانی دیرهنگام نباید state را با دادهٔ کهنه بازنویسی کند.
  const loadGeneration = useRef(0);

  const load = useCallback(
    async (target: LearnerSessionsWhen) => {
      const generation = ++loadGeneration.current;
      const isStale = () => loadGeneration.current !== generation;
      setLoading(true);
      setError(null);
      try {
        const next = await getLearnerSessions(runtime, target);
        if (isStale()) return;
        setSessions(next);
      } catch (loadError) {
        if (isStale()) return;
        setSessions([]);
        setError(messageOf(loadError));
      } finally {
        if (!isStale()) setLoading(false);
      }
    },
    [runtime],
  );

  useEffect(() => {
    void load(when);
  }, [load, when]);

  const title = useMemo(() => (when === "upcoming" ? "جلسات پیش‌رو" : "جلسات گذشته"), [when]);

  async function confirmCancel() {
    if (!cancelTarget || busyId !== null) return;
    const session = cancelTarget;
    setBusyId(session.id);
    setCancelTarget(null);
    setError(null);
    try {
      await cancelLearnerSession(runtime, session.id);
      await load(when);
    } catch (cancelError) {
      setError(messageOf(cancelError));
    } finally {
      setBusyId(null);
    }
  }

  async function paySession(session: LearnerSession) {
    if (busyId !== null) return;
    setBusyId(session.id);
    setError(null);
    try {
      const gateway = await payBooking(runtime, session.id);
      // پست فرم توکن به OnlinePG از مرورگر کاربر — دقیقاً مثل منافسه، در همان تب
      payViaSamanGate(gateway.token);
    } catch (payError) {
      setError(messageOf(payError));
    } finally {
      setBusyId(null);
    }
  }

  function openRating(session: LearnerSession) {
    setRatingTarget(session);
    setRating(5);
    setReviewText("");
    setReviewError(null);
  }

  async function submitRating() {
    if (!ratingTarget || reviewSaving) return;
    setReviewSaving(true);
    setReviewError(null);
    try {
      await createSessionReview(runtime, {
        sessionId: ratingTarget.id,
        rating,
        text: reviewText,
      });
      setRatingTarget(null);
      await load(when);
    } catch (saveError) {
      setReviewError(messageOf(saveError));
    } finally {
      setReviewSaving(false);
    }
  }

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <SectionHeader title="جلسات من" description="زمان‌ها بر اساس ساعت رسمی سامانه نمایش داده می‌شوند" />

      <div className="vodda-enter" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {(["upcoming", "past"] as const).map((tab) => {
          const selected = tab === when;
          return (
            <button
              key={tab}
              type="button"
              className="vodda-tappable"
              onClick={() => setWhen(tab)}
              aria-pressed={selected}
              style={{
                minHeight: 44,
                border: 0,
                borderRadius: 14,
                color: selected ? colors.surface : colors.inkMuted,
                background: selected ? colors.olive600 : colors.surface,
                boxShadow: shadows.xs,
                fontFamily: typography.fontFamily,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {tab === "upcoming" ? "پیش‌رو" : "گذشته"}
            </button>
          );
        })}
      </div>

      {loading ? <LoadingState label={`در حال دریافت ${title}…`} /> : null}
      {!loading && error ? (
        <ErrorState
          title="دریافت جلسات ناموفق بود"
          description={error}
          action={<Button onClick={() => void load(when)}>تلاش دوباره</Button>}
        />
      ) : null}
      {!loading && !error && sessions.length === 0 ? (
        <EmptyState icon={<Icon name="calendar" size={30} />} title="جلسه‌ای نیست" description="هنوز جلسه‌ای در این بخش ندارید." />
      ) : null}
      {!loading && !error && sessions.length > 0 ? (
        <div style={{ display: "grid", gap: spacing.md }}>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              busy={busyId === session.id}
              onCancel={() => setCancelTarget(session)}
              onRate={() => openRating(session)}
              onPay={() => void paySession(session)}
            />
          ))}
        </div>
      ) : null}

      <Dialog
        open={cancelTarget !== null}
        title="لغو جلسه"
        onClose={() => {
          if (busyId === null) setCancelTarget(null);
        }}
      >
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>
          لغو فقط پیش از زمان شروع مجاز است. در صورت موفقیت، مبلغ به کیف پول بازمی‌گردد.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" onClick={() => setCancelTarget(null)} disabled={busyId !== null}>
            انصراف
          </Button>
          <Button variant="danger" onClick={() => void confirmCancel()} loading={busyId !== null}>
            لغو جلسه
          </Button>
        </div>
      </Dialog>

      <Sheet
        open={ratingTarget !== null}
        title={ratingTarget ? `امتیاز جلسه با ${ratingTarget.teacherName}` : "ثبت امتیاز"}
        onClose={() => {
          if (!reviewSaving) setRatingTarget(null);
        }}
      >
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
            <textarea className="vodda-textarea"
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              maxLength={1000}
              rows={4}
              disabled={reviewSaving}
              placeholder="نظر خود را درباره جلسه بنویسید…"
              style={{
                width: "100%",
                resize: "vertical",
                padding: spacing.md,
                border: `1px solid ${colors.sand200}`,
                borderRadius: radii.md,
                color: colors.ink,
                background: colors.surface,
                boxShadow: shadows.xs,
                fontFamily: typography.fontFamily,
                ...typography.body,
              }}
            />
          </label>

          {reviewError ? <span role="alert" style={{ ...typography.caption, color: colors.danger }}>{reviewError}</span> : null}
          <Button fullWidth loading={reviewSaving} onClick={() => void submitRating()}>
            ثبت امتیاز
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
