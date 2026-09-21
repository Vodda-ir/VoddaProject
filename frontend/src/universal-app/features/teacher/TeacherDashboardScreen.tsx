"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { asNumber, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import type { PlatformRuntime } from "../../platform/types";
import { navigateApp } from "../../router";
import { messageOf } from "../../ui/errorMessage";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ActionTile,
  Icon,
  LoadingState,
  SectionHeader,
  WalletHero,
  colors,
  radii,
  spacing,
  typography,
} from "../../ui";
import { formatWalletAmount, toFaDigits } from "../wallet/WalletTransactionCard";

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

function parseTeacherSummary(value: unknown): TeacherSummary | null {
  const user = asRecord(value);
  if (!user) return null;
  const teacher = asRecord(user.teacher);

  return {
    id: asNumber(user.id),
    name: asString(user.name, "استاد"),
    avatarUrl: asString(user.avatar_url) || undefined,
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
    learnerName: asString(learner?.name, "قرآن‌آموز"),
    service: asString(session.service ?? session.title, "جلسه"),
    scheduledAt: asString(session.scheduled_at),
    localDate: asString(session.local_date),
    localStart: asString(session.local_start),
    localEnd: asString(session.local_end),
    status: asString(session.status, "pending"),
  };
}

async function getTeacherDashboardSnapshot(runtime: PlatformRuntime): Promise<DashboardSnapshot> {
  const [meResponse, pendingResponse, upcomingResponse] = await Promise.all([
    runtime.request<ApiEnvelope<unknown>>("/me"),
    runtime.request<ApiEnvelope<unknown[]>>("/teacher/sessions?when=pending"),
    runtime.request<ApiEnvelope<unknown[]>>("/teacher/sessions?when=upcoming"),
  ]);

  const teacher = parseTeacherSummary(meResponse.data);
  if (!teacher) throw new Error("اطلاعات حساب استاد دریافت نشد.");

  return {
    teacher,
    pending: (pendingResponse.data ?? []).map(parseTeacherSession).filter((item): item is TeacherSession => item !== null),
    upcoming: (upcomingResponse.data ?? []).map(parseTeacherSession).filter((item): item is TeacherSession => item !== null),
  };
}

function officialTime(session: TeacherSession): string {
  if (!session.localDate || !session.localStart || !session.localEnd) {
    return "زمان رسمی جلسه دریافت نشد";
  }
  return `${toFaDigits(session.localDate.replaceAll("-", "/"))} · ${toFaDigits(session.localStart)} تا ${toFaDigits(session.localEnd)}`;
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
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <header className="vodda-enter" style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
        <Avatar name={teacher.name} src={teacher.avatarUrl} size={52} ring />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>وقت بخیر،</p>
          <h1 style={{ ...typography.title, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {teacher.name} 🌿
          </h1>
          <p style={{ ...typography.caption, margin: 0, color: colors.olive700, fontWeight: 700 }}>فضای مدیریت استاد</p>
        </div>
        <button
          type="button"
          className="vodda-tappable"
          aria-label="پروفایل استاد"
          onClick={() => navigateApp("/t/profile", config)}
          style={{
            width: 42,
            height: 42,
            display: "grid",
            placeItems: "center",
            border: "1px solid " + colors.olive100,
            borderRadius: 14,
            color: colors.olive700,
            background: colors.olive50,
            cursor: "pointer",
          }}
        >
          <Icon name="settings" size={19} />
        </button>
      </header>

      <WalletHero label="موجودی قابل برداشت" amount={formatWalletAmount(teacher.wallet)}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: spacing.sm }}>
          {[
            ["امتیاز", rating + " ★"],
            ["نظرها", toFaDigits(teacher.reviews)],
            ["جلسات", toFaDigits(teacher.sessions)],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                minWidth: 0,
                padding: "9px 8px",
                textAlign: "center",
                borderRadius: radii.md,
                background: "rgba(255,255,255,.08)",
              }}
            >
              <strong style={{ ...typography.body, display: "block", color: colors.surface }}>{value}</strong>
              <span style={{ ...typography.caption, display: "block", color: "rgba(255,255,255,.62)" }}>{label}</span>
            </div>
          ))}
        </div>
      </WalletHero>

      {pending.length > 0 ? (
        <button
          type="button"
          className="vodda-card vodda-card--interactive vodda-tappable vodda-enter vodda-enter-delay-1"
          onClick={() => navigateApp("/t/requests", config)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: spacing.md,
            padding: spacing.lg,
            textAlign: "right",
            border: "1px solid " + colors.goldSoft,
            borderRadius: radii.lg,
            color: colors.ink,
            background: colors.goldBackground,
            fontFamily: typography.fontFamily,
            cursor: "pointer",
          }}
        >
          <span style={{ width: 46, height: 46, display: "grid", placeItems: "center", flex: "0 0 46px", borderRadius: 15, color: colors.goldDark, background: "rgba(255,255,255,.6)" }}>
            <Icon name="bell" size={21} />
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ ...typography.body, display: "block", fontWeight: 900 }}>{toFaDigits(pending.length)} درخواست جدید</strong>
            <span style={{ ...typography.caption, color: colors.inkMuted }}>برای تأیید یا رد منتظر پاسخ شما هستند.</span>
          </span>
          <Icon name="chevronL" size={18} style={{ color: colors.goldDark }} />
        </button>
      ) : null}

      <section>
        <SectionHeader title="جلسه بعدی شما" action="همه جلسات" onAction={() => navigateApp("/t/sessions", config)} />
        <div style={{ marginTop: spacing.md }}>
          {nextSession ? (
            <Card elevated className="vodda-card--interactive" style={{ display: "grid", gap: spacing.md, padding: spacing.lg }}>
              <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
                <Avatar name={nextSession.learnerName} size={48} ring={false} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ ...typography.body, display: "block", color: colors.ink }}>{nextSession.learnerName}</strong>
                  <span style={{ ...typography.caption, color: colors.inkMuted }}>{nextSession.service}</span>
                </div>
                <span style={{ padding: "5px 9px", borderRadius: radii.pill, color: colors.olive700, background: colors.olive50, ...typography.caption, fontWeight: 800 }}>
                  تأییدشده
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, color: colors.olive800, background: colors.olive50, ...typography.bodySmall, fontWeight: 700 }}>
                <Icon name="clock" size={17} />
                {officialTime(nextSession)}
              </div>
              <Button variant="secondary" fullWidth onClick={() => navigateApp("/t/sessions", config)}>
                مشاهده جزئیات جلسه
              </Button>
            </Card>
          ) : (
            <EmptyState
              icon={<Icon name="calendar" size={30} />}
              title="جلسه تأییدشده‌ای نیست"
              description="جلسه بعدی پس از تأیید درخواست در این بخش نمایش داده می‌شود."
            />
          )}
        </div>
      </section>

      <section>
        <SectionHeader title="مدیریت سریع" description="دسترسی سریع به ابزارهای روزمره استاد" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: spacing.sm, marginTop: spacing.md }}>
          <ActionTile icon="book" title="خدمات من" description="مدیریت خدمات" onClick={() => navigateApp("/t/services", config)} />
          <ActionTile icon="clock" title="زمان‌های کاری" description="برنامه هفتگی" onClick={() => navigateApp("/t/work-times", config)} tone="info" />
          <ActionTile icon="wallet" title="کیف پول" description="درآمد و برداشت" onClick={() => navigateApp("/t/wallet", config)} tone="gold" />
          <ActionTile icon="calendar" title="همه جلسات" description="پیش‌رو و گذشته" onClick={() => navigateApp("/t/sessions", config)} tone="clay" />
        </div>
      </section>
    </section>
  );
}
