"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { asInteger, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import type { PlatformRuntime } from "../../platform/types";
import { navigateApp } from "../../router";
import {
  Avatar,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  formatJalaliDate,
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
import { formatWalletAmount, toFaDigits } from "../wallet/WalletTransactionCard";

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
  /** در لحظهٔ دریافت فهرست هنوز دیده‌نشده بود — با نشان قرمز مشخص می‌شود. */
  unseen: boolean;
};

const statusLabels: Record<string, string> = {
  pending: "در انتظار پاسخ",
  confirmed: "تأیید شده",
  done: "انجام شده",
  canceled: "لغو شده",
};

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

function officialTime(session: TeacherSession): string {
  if (!session.localDate || !session.localStart || !session.localEnd) return "زمان رسمی جلسه دریافت نشد";
  return `${formatJalaliDate(session.localDate)} · ${toFaDigits(session.localStart)} تا ${toFaDigits(session.localEnd)}`;
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
          <Avatar name={session.learnerName} src={session.learnerAvatar || undefined} size={46} ring={false} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: colors.ink }}>{session.learnerName}</strong>
            <span style={{ display: "block", marginTop: 3, fontSize: 12.5, color: colors.inkSecondary }}>{session.service}</span>
          </div>
          {session.instant ? (
            <span style={{ padding: "4px 10px", borderRadius: radii.pill, color: "#fffaf0", background: "linear-gradient(145deg,#d8b869,#b8923c)", fontSize: 10.5, fontWeight: 800 }}>فوری</span>
          ) : (
            <span style={{ padding: "4px 10px", borderRadius: radii.pill, color: colors.clay, background: colors.clayBackground, fontSize: 11, fontWeight: 800 }}>
              جدید
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 14px", borderRadius: 13, background: colors.sand50 }}>
          <Icon name="calendar" size={16} style={{ flex: "0 0 auto", color: colors.olive500 }} />
          <span style={{ minWidth: 0, flex: 1, fontSize: 12.5, color: colors.inkSecondary }}>{officialTime(session)}</span>
          <strong style={{ flex: "0 0 auto", fontSize: 12.5, fontWeight: 800, color: colors.olive700 }}>
            {session.price === 0 ? "رایگان" : `${formatWalletAmount(session.price)} ت`}
          </strong>
        </div>

        {session.note ? <p style={{ margin: 0, fontSize: 12, color: colors.inkMuted }}>یادداشت: {session.note}</p> : null}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }} onClick={(event) => event.stopPropagation()}>
          <Button variant="secondary" disabled={busy} onClick={onReject}>رد</Button>
          <Button loading={busy} onClick={onAccept}>تأیید</Button>
        </div>
      </Card>
    );
  }

  const canComplete = session.status === "confirmed" && canCompleteSession(session);

  return (
    <Card className="vodda-card--interactive" style={{ ...commonCardStyle, cursor: "pointer", borderColor: session.unseen ? "rgba(216,184,105,.9)" : undefined, borderWidth: session.unseen ? 1.5 : undefined }} onClick={onOpen}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: spacing.md }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <StatusPill status={session.status} label={statusLabels[session.status] ?? session.status} />
          {session.instant ? (
            <span style={{ padding: "3px 9px", borderRadius: radii.pill, color: "#fffaf0", background: "linear-gradient(145deg,#d8b869,#b8923c)", fontSize: 10, fontWeight: 800 }}>فوری</span>
          ) : null}
          {session.unseen ? (
            <span aria-label="جلسهٔ دیده‌نشده" style={{ padding: "3px 9px", borderRadius: radii.pill, color: "#ffffff", background: colors.danger, fontSize: 10, fontWeight: 800 }}>جدید</span>
          ) : null}
        </div>
        <span style={{ fontSize: 12, color: colors.inkMuted, fontWeight: 600 }}>
          {toFaDigits(session.duration)} دقیقه · {session.price === 0 ? "رایگان" : `${formatWalletAmount(session.price)} ت`}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={session.learnerName} src={session.learnerAvatar || undefined} size={46} ring={false} />
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: colors.ink }}>{session.learnerName}</strong>
          <span style={{ display: "block", marginTop: 3, fontSize: 12.5, color: colors.inkSecondary }}>{session.service}</span>
        </div>
        <Icon name="chevronL" size={18} style={{ flex: "0 0 auto", marginInlineStart: "auto", color: colors.inkFaint }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 14px", borderRadius: 13, background: colors.sand50, color: colors.inkSecondary, fontSize: 12.5 }}>
        <Icon name="calendar" size={16} style={{ flex: "0 0 auto", color: colors.olive500 }} />
        {officialTime(session)}
      </div>

      {session.note ? <p style={{ margin: 0, fontSize: 12, color: colors.inkMuted }}>یادداشت: {session.note}</p> : null}
      {session.rejectNote ? <p style={{ margin: 0, fontSize: 12, color: colors.clay }}>دلیل رد: {session.rejectNote}</p> : null}

      {session.status === "confirmed" ? (
        <div onClick={(event) => event.stopPropagation()}>
          <Button
            fullWidth
            disabled={!canComplete || busy}
            loading={busy}
            onClick={onComplete}
          >
            <Icon name="checkCircle" size={18} />
            {canComplete ? "ثبت برگزاری جلسه" : "پس از پایان جلسه قابل ثبت است"}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function TeacherSessionsScreen({ mode, config }: { mode: TeacherSessionsMode; config: UniversalAppConfig }) {
  const runtime = usePlatform();
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

  const load = useCallback(async (target: TeacherSessionsWhen) => {
    setLoading(true);
    setError(null);
    try {
      setSessions(await getTeacherSessions(runtime, target));
    } catch (loadError) {
      setSessions([]);
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
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

  const heading = mode === "requests" ? "درخواست‌های دریافتی" : "جلسات من";
  const emptyDescription = mode === "requests" ? "درخواست جدیدی برای بررسی ندارید." : "جلسه‌ای در این بخش ندارید.";
  const loadLabel = useMemo(() => when === "pending" ? "در حال دریافت درخواست‌ها…" : when === "upcoming" ? "در حال دریافت جلسات پیش‌رو…" : "در حال دریافت جلسات گذشته…", [when]);

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
      <SectionHeader title={heading} description={mode === "requests" ? `${toFaDigits(sessions.length)} درخواست در انتظار پاسخ شما` : "زمان‌ها بر اساس ساعت رسمی سامانه نمایش داده می‌شوند."} />

      {mode === "sessions" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {(["upcoming", "past"] as const).map((tab) => {
            const selected = when === tab;
            return (
              <button key={tab} type="button" className="vodda-tappable" aria-pressed={selected} onClick={() => setWhen(tab)} style={{ minHeight: 44, border: 0, borderRadius: 14, color: selected ? colors.surface : colors.inkMuted, background: selected ? colors.olive600 : colors.surface, boxShadow: shadows.xs, fontFamily: typography.fontFamily, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {tab === "upcoming" ? "پیش‌رو" : "گذشته"}
              </button>
            );
          })}
        </div>
      ) : null}

      {loading ? <LoadingState label={loadLabel} /> : null}
      {!loading && error ? <ErrorState title="دریافت اطلاعات ناموفق بود" description={error} action={<Button onClick={() => void load(when)}>تلاش دوباره</Button>} /> : null}
      {!loading && !error && sessions.length === 0 ? <EmptyState icon={<Icon name="calendar" size={30} />} title="موردی نیست" description={emptyDescription} /> : null}
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

      <Sheet open={rejectTarget !== null} title="رد درخواست جلسه" onClose={() => { if (busyId === null) setRejectTarget(null); }}>
        <div style={{ display: "grid", gap: spacing.md }}>
          <label style={{ display: "grid", gap: spacing.sm, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>دلیل رد</span>
            <textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              rows={4}
              maxLength={1000}
              disabled={busyId !== null}
              placeholder="دلیل رد درخواست را برای قرآن‌آموز بنویسید…"
              style={{ width: "100%", resize: "vertical", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.md, color: colors.ink, background: colors.surface, boxShadow: shadows.xs, fontFamily: typography.fontFamily, ...typography.body }}
            />
          </label>
          {rejectError ? <span role="alert" style={{ ...typography.caption, color: colors.danger }}>{rejectError}</span> : null}
          <Button variant="danger" fullWidth loading={busyId !== null} onClick={() => void reject()}>رد درخواست</Button>
        </div>
      </Sheet>

      <Dialog open={completeTarget !== null} title="ثبت انجام جلسه" onClose={() => { if (busyId === null) setCompleteTarget(null); }}>
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>
          با ثبت انجام جلسه، درآمد آن پس از کسر کارمزد پلتفرم به کیف پول شما واریز می‌شود و از شاگرد نظرسنجی گرفته می‌شود. این عملیات را فقط پس از پایان واقعی جلسه تأیید کنید.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" disabled={busyId !== null} onClick={() => setCompleteTarget(null)}>انصراف</Button>
          <Button loading={busyId !== null} onClick={() => void complete()}>تأیید انجام</Button>
        </div>
      </Dialog>
    </section>
  );
}
