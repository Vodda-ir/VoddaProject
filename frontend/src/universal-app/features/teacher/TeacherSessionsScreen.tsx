"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { asInteger, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import type { PlatformRuntime } from "../../platform/types";
import {
  Avatar,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Sheet,
  colors,
  radii,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";

type TeacherSessionsMode = "requests" | "sessions";
type TeacherSessionsWhen = "pending" | "upcoming" | "past";

type TeacherSession = {
  id: number;
  learnerName: string;
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
  };
}

async function getTeacherSessions(runtime: PlatformRuntime, when: TeacherSessionsWhen): Promise<TeacherSession[]> {
  const search = new URLSearchParams({ when });
  const response = await runtime.request<ApiEnvelope<unknown[]>>(`/teacher/sessions?${search.toString()}`);
  return (response.data ?? []).map(parseTeacherSession).filter((item): item is TeacherSession => item !== null);
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

function faDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
}

function formatMoney(value: number): string {
  return faDigits(Math.trunc(value).toLocaleString("en-US"));
}

function officialTime(session: TeacherSession): string {
  if (!session.localDate || !session.localStart || !session.localEnd) return "زمان رسمی جلسه دریافت نشد";
  return `${faDigits(session.localDate.replaceAll("-", "/"))} · ${faDigits(session.localStart)} تا ${faDigits(session.localEnd)}`;
}

function SessionCard({
  session,
  busy,
  mode,
  onAccept,
  onReject,
  onComplete,
}: {
  session: TeacherSession;
  busy: boolean;
  mode: TeacherSessionsMode;
  onAccept: () => void;
  onReject: () => void;
  onComplete: () => void;
}) {
  return (
    <Card elevated style={{ display: "grid", gap: spacing.md, borderRadius: radii.lg }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: spacing.md }}>
        <span
          style={{
            ...typography.caption,
            padding: "4px 10px",
            borderRadius: radii.pill,
            fontWeight: 700,
            color: session.status === "canceled" ? colors.danger : colors.olive800,
            background: session.status === "canceled" ? colors.clayBackground : colors.olive50,
          }}
        >
          {statusLabels[session.status] ?? session.status}
        </span>
        <span style={{ ...typography.caption, color: colors.inkMuted }}>{faDigits(session.duration)} دقیقه</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
        <Avatar name={session.learnerName} size={46} />
        <div style={{ minWidth: 0 }}>
          <strong style={{ ...typography.body, display: "block" }}>{session.learnerName}</strong>
          <span style={{ ...typography.bodySmall, color: colors.inkSecondary }}>{session.service}</span>
        </div>
      </div>

      <div style={{ padding: `${spacing.sm}px ${spacing.md}px`, borderRadius: radii.sm, background: colors.sand50, color: colors.inkSecondary, ...typography.bodySmall }}>
        {officialTime(session)}
      </div>

      {session.price > 0 ? (
        <span style={{ ...typography.caption, color: colors.inkMuted }}>{formatMoney(session.price)} تومان</span>
      ) : null}
      {session.note ? <p style={{ ...typography.bodySmall, margin: 0 }}>یادداشت قرآن‌آموز: {session.note}</p> : null}
      {session.rejectNote ? <p style={{ ...typography.caption, margin: 0, color: colors.danger }}>دلیل رد: {session.rejectNote}</p> : null}

      {mode === "requests" && session.status === "pending" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" disabled={busy} onClick={onReject}>رد درخواست</Button>
          <Button loading={busy} onClick={onAccept}>تأیید درخواست</Button>
        </div>
      ) : null}

      {mode === "sessions" && session.status === "confirmed" ? (
        <Button fullWidth loading={busy} onClick={onComplete}>ثبت انجام جلسه</Button>
      ) : null}
    </Card>
  );
}

export function TeacherSessionsScreen({ mode }: { mode: TeacherSessionsMode }) {
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

  const heading = mode === "requests" ? "درخواست‌های جلسه" : "جلسات استاد";
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
    <section style={{ display: "grid", gap: spacing.lg }}>
      <header>
        <h1 style={{ ...typography.heading, margin: 0 }}>{heading}</h1>
        <p style={{ ...typography.bodySmall, margin: `${spacing.xs}px 0 0`, color: colors.inkMuted }}>
          تاریخ و ساعت فقط از زمان رسمی backend نمایش داده می‌شوند.
        </p>
      </header>

      {mode === "sessions" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant={when === "upcoming" ? "primary" : "secondary"} aria-pressed={when === "upcoming"} onClick={() => setWhen("upcoming")}>پیش‌رو</Button>
          <Button variant={when === "past" ? "primary" : "secondary"} aria-pressed={when === "past"} onClick={() => setWhen("past")}>گذشته</Button>
        </div>
      ) : null}

      {loading ? <LoadingState label={loadLabel} /> : null}
      {!loading && error ? <ErrorState title="دریافت اطلاعات ناموفق بود" description={error} action={<Button onClick={() => void load(when)}>تلاش دوباره</Button>} /> : null}
      {!loading && !error && sessions.length === 0 ? <EmptyState title="موردی نیست" description={emptyDescription} /> : null}
      {!loading && !error && sessions.length > 0 ? (
        <div style={{ display: "grid", gap: spacing.md }}>
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              busy={busyId === session.id}
              mode={mode}
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
              style={{ width: "100%", resize: "vertical", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.sm, color: colors.ink, background: colors.surface, fontFamily: typography.fontFamily, ...typography.body }}
            />
          </label>
          {rejectError ? <span role="alert" style={{ ...typography.caption, color: colors.danger }}>{rejectError}</span> : null}
          <Button variant="danger" fullWidth loading={busyId !== null} onClick={() => void reject()}>رد درخواست</Button>
        </div>
      </Sheet>

      <Dialog open={completeTarget !== null} title="ثبت انجام جلسه" onClose={() => { if (busyId === null) setCompleteTarget(null); }}>
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>
          بعد از ثبت انجام جلسه، settlement مطابق policy بک‌اند انجام می‌شود. این عملیات را فقط پس از پایان واقعی جلسه تأیید کنید.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" disabled={busyId !== null} onClick={() => setCompleteTarget(null)}>انصراف</Button>
          <Button loading={busyId !== null} onClick={() => void complete()}>تأیید انجام</Button>
        </div>
      </Dialog>
    </section>
  );
}
