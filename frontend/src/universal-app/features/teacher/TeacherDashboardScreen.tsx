"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { PlatformRuntime } from "../../platform/types";
import { navigateApp } from "../../router";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  colors,
  radii,
  spacing,
  typography,
} from "../../ui";

type DataEnvelope<T> = { data?: T };

type TeacherSummary = {
  id: number;
  name: string;
  avatarUrl?: string;
  wallet: number;
  rating: number;
  reviews: number;
  sessions: number;
};

type TeacherSession = {
  id: number;
  learnerName: string;
  service: string;
  scheduledAt: string;
  localDate: string;
  localStart: string;
  localEnd: string;
  status: string;
};

type DashboardSnapshot = {
  teacher: TeacherSummary;
  pending: TeacherSession[];
  upcoming: TeacherSession[];
};

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseTeacherSummary(value: unknown): TeacherSummary | null {
  const user = asRecord(value);
  if (!user) return null;
  const teacher = asRecord(user.teacher);

  return {
    id: asNumber(user.id),
    name: typeof user.name === "string" && user.name.trim() ? user.name : "استاد",
    avatarUrl: typeof user.avatar_url === "string" ? user.avatar_url : undefined,
    wallet: asNumber(user.wallet),
    rating: asNumber(teacher?.rating),
    reviews: asNumber(teacher?.reviews),
    sessions: asNumber(teacher?.sessions),
  };
}

function parseTeacherSession(value: unknown): TeacherSession | null {
  const session = asRecord(value);
  if (!session) return null;
  const learner = asRecord(session.learner);

  return {
    id: asNumber(session.id),
    learnerName:
      typeof learner?.name === "string" && learner.name.trim() ? learner.name : "قرآن‌آموز",
    service:
      typeof session.service === "string"
        ? session.service
        : typeof session.title === "string"
          ? session.title
          : "جلسه",
    scheduledAt: typeof session.scheduled_at === "string" ? session.scheduled_at : "",
    localDate: typeof session.local_date === "string" ? session.local_date : "",
    localStart: typeof session.local_start === "string" ? session.local_start : "",
    localEnd: typeof session.local_end === "string" ? session.local_end : "",
    status: typeof session.status === "string" ? session.status : "pending",
  };
}

async function getTeacherDashboardSnapshot(runtime: PlatformRuntime): Promise<DashboardSnapshot> {
  const [meResponse, pendingResponse, upcomingResponse] = await Promise.all([
    runtime.request<DataEnvelope<unknown>>("/me"),
    runtime.request<DataEnvelope<unknown[]>>("/teacher/sessions?when=pending"),
    runtime.request<DataEnvelope<unknown[]>>("/teacher/sessions?when=upcoming"),
  ]);

  const teacher = parseTeacherSummary(meResponse.data);
  if (!teacher) throw new Error("اطلاعات حساب استاد دریافت نشد.");

  return {
    teacher,
    pending: (pendingResponse.data ?? []).map(parseTeacherSession).filter((item): item is TeacherSession => item !== null),
    upcoming: (upcomingResponse.data ?? []).map(parseTeacherSession).filter((item): item is TeacherSession => item !== null),
  };
}

function faDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
}

function formatMoney(value: number): string {
  return faDigits(Math.trunc(value).toLocaleString("en-US"));
}

function officialTime(session: TeacherSession): string {
  if (!session.localDate || !session.localStart || !session.localEnd) {
    return "زمان رسمی جلسه دریافت نشد";
  }
  return `${faDigits(session.localDate.replaceAll("-", "/"))} · ${faDigits(session.localStart)} تا ${faDigits(session.localEnd)}`;
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "خطایی رخ داد. دوباره تلاش کنید.";
}

export function TeacherDashboardScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await getTeacherDashboardSnapshot(runtime));
    } catch (loadError) {
      setSnapshot(null);
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
  }, [load]);

  const nextSession = useMemo(() => {
    if (!snapshot) return null;
    const confirmed = snapshot.upcoming.filter((session) => session.status === "confirmed");
    confirmed.sort((left, right) => {
      const leftTime = Date.parse(left.scheduledAt);
      const rightTime = Date.parse(right.scheduledAt);
      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0;
      return leftTime - rightTime;
    });
    return confirmed[0] ?? null;
  }, [snapshot]);

  if (loading) return <LoadingState label="در حال دریافت داشبورد استاد…" />;
  if (error || !snapshot) {
    return (
      <ErrorState
        title="دریافت داشبورد ناموفق بود"
        description={error ?? "اطلاعات داشبورد دریافت نشد."}
        action={<Button onClick={() => void load()}>تلاش دوباره</Button>}
      />
    );
  }

  const { teacher, pending } = snapshot;
  const rating = teacher.reviews > 0 ? teacher.rating.toFixed(1) : "—";

  return (
    <section style={{ display: "grid", gap: spacing.lg }}>
      <header style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
        <Avatar name={teacher.name} src={teacher.avatarUrl} size={50} />
        <div style={{ minWidth: 0 }}>
          <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>پنل استاد</p>
          <h1 style={{ ...typography.heading, margin: 0 }}>{teacher.name}</h1>
        </div>
      </header>

      <Card
        elevated
        style={{
          display: "grid",
          gap: spacing.lg,
          borderRadius: radii.lg,
          background: colors.olive800,
          color: colors.surface,
        }}
      >
        <div>
          <span style={{ ...typography.caption, opacity: 0.78 }}>موجودی قابل برداشت</span>
          <div style={{ display: "flex", alignItems: "baseline", gap: spacing.xs, marginTop: spacing.xs }}>
            <strong style={{ fontSize: 30, lineHeight: 1.2 }}>{formatMoney(teacher.wallet)}</strong>
            <span style={{ ...typography.bodySmall, opacity: 0.78 }}>تومان</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing.sm }}>
          {[
            ["امتیاز", `${rating} ★`],
            ["نظرها", faDigits(teacher.reviews)],
            ["جلسات", faDigits(teacher.sessions)],
          ].map(([label, value]) => (
            <div key={label} style={{ textAlign: "center", minWidth: 0 }}>
              <span style={{ ...typography.caption, display: "block", opacity: 0.7 }}>{label}</span>
              <strong style={{ ...typography.body, display: "block", marginTop: 2 }}>{value}</strong>
            </div>
          ))}
        </div>
      </Card>

      {pending.length > 0 ? (
        <Card style={{ display: "grid", gap: spacing.md, borderColor: colors.gold }}>
          <div>
            <strong style={{ ...typography.body, display: "block" }}>{faDigits(pending.length)} درخواست جدید</strong>
            <span style={{ ...typography.caption, color: colors.inkMuted }}>برای تأیید یا رد درخواست‌ها وارد فهرست شوید.</span>
          </div>
          <Button fullWidth onClick={() => navigateApp("/t/requests", config)}>مشاهده درخواست‌ها</Button>
        </Card>
      ) : null}

      <div style={{ display: "grid", gap: spacing.sm }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
          <h2 style={{ ...typography.title, margin: 0 }}>جلسه بعدی شما</h2>
          <Button variant="secondary" onClick={() => navigateApp("/t/sessions", config)}>همه جلسات</Button>
        </div>
        {nextSession ? (
          <Card elevated style={{ display: "grid", gap: spacing.md }}>
            <div>
              <strong style={{ ...typography.body, display: "block" }}>{nextSession.learnerName}</strong>
              <span style={{ ...typography.bodySmall, color: colors.inkSecondary }}>{nextSession.service}</span>
            </div>
            <div style={{ ...typography.bodySmall, padding: spacing.sm, borderRadius: radii.sm, background: colors.sand50, color: colors.inkSecondary }}>
              {officialTime(nextSession)}
            </div>
            <Button variant="secondary" fullWidth onClick={() => navigateApp("/t/sessions", config)}>مشاهده جزئیات جلسه</Button>
          </Card>
        ) : (
          <EmptyState title="جلسه تأییدشده‌ای نیست" description="جلسه بعدی پس از تأیید درخواست در این بخش نمایش داده می‌شود." />
        )}
      </div>

      <div style={{ display: "grid", gap: spacing.sm }}>
        <h2 style={{ ...typography.title, margin: 0 }}>مدیریت سریع</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: spacing.sm }}>
          {[
            ["خدمات من", "/t/services"],
            ["زمان‌های کاری", "/t/work-times"],
            ["کیف پول", "/t/wallet"],
            ["همه جلسات", "/t/sessions"],
          ].map(([label, path]) => (
            <Button key={path} variant="secondary" onClick={() => navigateApp(path, config)}>{label}</Button>
          ))}
        </div>
      </div>

      <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>
        آمار دوره‌ای درآمد و کلید availability تا زمانی که endpoint واقعی بک‌اند برای آن‌ها وجود نداشته باشد نمایش داده نمی‌شوند.
      </p>
    </section>
  );
}
