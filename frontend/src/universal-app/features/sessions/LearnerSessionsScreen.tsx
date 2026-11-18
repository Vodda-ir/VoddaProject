"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import {
  Avatar,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  IllustrationSessions,
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
import { localizedDigits } from "../../ui/persian";
import { formatAppDate } from "../../ui/jalali";
import { payBooking } from "../booking/api";
import { payViaSamanGate } from "../../../lib/saman-gate";
import { PaymentResultBanner } from "../payments/PaymentResultBanner";
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

function officialTime(session: LearnerSession, lang: "fa" | "en", L: (text: string) => string): string {
  if (!hasOfficialSessionTime(session)) return L("زمان رسمی جلسه دریافت نشد");
  return `${formatAppDate(session.localDate, lang)} · ${L("{a} تا {b}")
    .replace("{a}", localizedDigits(session.localStart, lang))
    .replace("{b}", localizedDigits(session.localEnd, lang))}`;
}

function canCancel(session: LearnerSession): boolean {
  if (!isUpcomingSession(session)) return false;
  const timestamp = Date.parse(session.scheduledAt);
  return Number.isNaN(timestamp) || Date.now() < timestamp;
}

function SessionCard({
  session,
  busy,
  onOpen,
  onCancel,
  onRate,
  onPay,
}: {
  session: LearnerSession;
  busy: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onRate: () => void;
  onPay: () => void;
}) {
  const { t, L, lang, N } = useAppearance();
  return (
    <Card
      className="vodda-card--interactive"
      style={{ display: "grid", gap: 13, borderRadius: 24, padding: 15, boxShadow: "0 0 6px rgba(46,54,34,.04)", cursor: "pointer" }}
      onClick={onOpen}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <StatusPill status={session.status} label={statusLabel(session.status, t)} />
          {session.instant ? (
            <span aria-label={L("جلسهٔ فوری")} style={{ padding: "3px 9px", borderRadius: radii.pill, color: "#fffaf0", background: "linear-gradient(145deg,#d8b869,#b8923c)", fontSize: 10, fontWeight: 800 }}>
              {L("فوری")}
            </span>
          ) : null}
        </div>
        <span style={{ ...typography.caption, color: colors.inkMuted }}>
          {L("{n} دقیقه").replace("{n}", localizedDigits(session.duration, lang))}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
        <Avatar name={session.teacherName} src={session.teacherAvatar || undefined} size={46} ring />
        <div style={{ minWidth: 0 }}>
          <strong style={{ ...typography.body, display: "block" }}>{N(session.teacherName)}</strong>
          <span style={{ ...typography.bodySmall, color: colors.inkSecondary }}>{L(session.service)}</span>
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
        {officialTime(session, lang, L)}
      </div>

      {session.rejectNote ? (
        <p style={{ ...typography.caption, margin: 0, color: colors.danger }}>
          {L("دلیل لغو: {n}").replace("{n}", session.rejectNote)}
        </p>
      ) : null}

      {session.status === "awaiting_payment" ? (
        <div style={{ display: "grid", gap: spacing.sm }} onClick={(event) => event.stopPropagation()}>
          <span style={{ ...typography.caption, color: colors.goldDark }}>
            {L("پرداخت آنلاین تکمیل نشده؛ با تکمیل پرداخت، درخواست برای استاد ارسال می‌شود.")}
          </span>
          <Button fullWidth loading={busy} onClick={onPay}>
            <Icon name="wallet" size={17} />
            {L("تکمیل پرداخت")}
          </Button>
        </div>
      ) : null}

      {session.status === "pending" || session.status === "confirmed" ? (
        <div style={{ display: "grid", gap: spacing.sm }} onClick={(event) => event.stopPropagation()}>
          <span style={{ ...typography.caption, color: colors.inkMuted }}>
            {session.status === "confirmed"
              ? L("جلسه تأیید شده است. برای هماهنگی و ورود به کلاس، جزئیات جلسه را باز کنید.")
              : L("در انتظار تأیید استاد")}
          </span>
          {canCancel(session) ? (
            <Button variant="secondary" fullWidth loading={busy} onClick={onCancel}>
              <Icon name="x" size={17} />
              {L("لغو جلسه")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {session.status === "done" && !session.rated ? (
        <div onClick={(event) => event.stopPropagation()}>
          <Button fullWidth onClick={onRate} style={{ background: colors.gold, borderColor: colors.gold }}>
            {L("ثبت امتیاز و نظر")}
          </Button>
        </div>
      ) : null}

    </Card>
  );
}

export function LearnerSessionsScreen({ config }: { config?: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { t, L, lang, N } = useAppearance();
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

  const title = useMemo(() => (when === "upcoming" ? L("جلسات پیش‌رو") : L("جلسات گذشته")), [when, L]);

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
      <PaymentResultBanner />
      <SectionHeader title={L("جلسات من")} description={L("زمان‌ها بر اساس ساعت رسمی سامانه نمایش داده می‌شوند")} />

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
                color: selected ? colors.onOlive : colors.inkMuted,
                background: selected ? colors.olive600 : colors.surface,
                boxShadow: shadows.xs,
                fontFamily: typography.fontFamily,
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {tab === "upcoming" ? L("پیش‌رو") : L("گذشته")}
            </button>
          );
        })}
      </div>

      {loading ? <LoadingState label={L("در حال دریافت {n}…").replace("{n}", title)} /> : null}
      {!loading && error ? (
        <ErrorState
          title={L("دریافت جلسات ناموفق بود")}
          description={L(error)}
          action={<Button onClick={() => void load(when)}>{L("تلاش دوباره")}</Button>}
        />
      ) : null}
      {!loading && !error && sessions.length === 0 ? (
        <EmptyState
          illustration={<IllustrationSessions />}
          title={L("جلسه‌ای نیست")}
          description={L("هنوز جلسه‌ای در این بخش ندارید.")}
          action={
            <Button onClick={() => navigateApp("/search")} style={{ minWidth: 220 }}>
              {L("رزرو اولین جلسه")}
            </Button>
          }
        />
      ) : null}
      {!loading && !error && sessions.length > 0 ? (
        <div style={{ display: "grid", gap: spacing.md }}>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              busy={busyId === session.id}
              onOpen={() => navigateApp(`/session/${session.id}`, config)}
              onCancel={() => setCancelTarget(session)}
              onRate={() => openRating(session)}
              onPay={() => void paySession(session)}
            />
          ))}
        </div>
      ) : null}

      <Dialog
        open={cancelTarget !== null}
        title={L("لغو جلسه")}
        onClose={() => {
          if (busyId === null) setCancelTarget(null);
        }}
      >
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>
          {L("لغو فقط پیش از زمان شروع مجاز است. در صورت موفقیت، مبلغ به کیف پول بازمی‌گردد.")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" onClick={() => setCancelTarget(null)} disabled={busyId !== null}>
            {L("انصراف")}
          </Button>
          <Button variant="danger" onClick={() => void confirmCancel()} loading={busyId !== null}>
            {L("لغو جلسه")}
          </Button>
        </div>
      </Dialog>

      <Sheet
        open={ratingTarget !== null}
        title={ratingTarget ? L("امتیاز جلسه با {name}").replace("{name}", N(ratingTarget.teacherName)) : L("ثبت امتیاز")}
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
                aria-label={L("{n} ستاره").replace("{n}", localizedDigits(value, lang))}
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
            <span style={{ fontWeight: 700 }}>{L("نظر شما (اختیاری)")}</span>
            <textarea
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              maxLength={1000}
              rows={4}
              disabled={reviewSaving}
              placeholder={L("نظر خود را درباره جلسه بنویسید…")}
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

          {reviewError ? <span role="alert" style={{ ...typography.caption, color: colors.danger }}>{L(reviewError)}</span> : null}
          <Button fullWidth loading={reviewSaving} onClick={() => void submitRating()}>
            {L("ثبت امتیاز")}
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
