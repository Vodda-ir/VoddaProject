"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { asArray, asNumber, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import { avatarSrc, uploadsOriginOf } from "@/lib/avatarImage";
import type { AuthUser, PlatformRuntime } from "../../platform/types";
import { navigateApp } from "../../router";
import { messageOf } from "../../ui/errorMessage";
import { RoleModeSheet } from "../auth/RoleModeSheet";
import { getTeacherCeremonyInbox } from "../ceremony/api";
import { getTeacherDispatchInbox } from "../dispatch/api";
import { NotificationsBell } from "../notifications/NotificationsBell";
import { fetchStoriesEnabled } from "../stories/api";
import { TeacherStoriesPanel } from "../stories/TeacherStoriesPanel";
import { CityLocator } from "../home/CityLocator";
import {
  Avatar,
  Button,
  Card,
  ErrorState,
  Icon,
  LoadingState,
  SectionHeader,
  WalletHero,
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { formatAppDate } from "../../ui/jalali";
import { localizedDigits } from "../../ui/persian";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";

/** وضعیت کلیدهای سریع استاد — از /teacher/me خوانده می‌شود. */
type FeatureSwitches = {
  available: boolean;
  instantEnabled: boolean;
  freeEnabled: boolean;
};

async function loadFeatureSwitches(runtime: PlatformRuntime): Promise<FeatureSwitches> {
  const response = await runtime.request<ApiEnvelope<unknown>>("/teacher/me");
  const row = asRecord(response.data) ?? {};
  return {
    available: row.available !== false,
    instantEnabled: row.instant_enabled === true,
    freeEnabled: row.free_enabled !== false,
  };
}

function amountLabel(value: number, lang: "fa" | "en"): string {
  return lang === "en"
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, value))
    : formatWalletAmount(value, lang);
}

/** سوییچ زیبا با دستهٔ متحرک — پایهٔ کارت‌های امکانات. */
function FeatureSwitch({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      style={{
        width: 52,
        height: 30,
        flex: "0 0 52px",
        display: "grid",
        alignItems: "center",
        padding: 0,
        border: 0,
        borderRadius: 999,
        cursor: "pointer",
        background: checked ? gradients.oliveBtn : colors.sand200,
        boxShadow: checked ? "0 4px 12px rgba(95,122,72,.35)" : "none",
        transition: "background 240ms cubic-bezier(.2,.9,.3,1)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "block",
          width: 24,
          height: 24,
          marginInlineEnd: checked ? 3 : 25,
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow: "0 2px 6px rgba(46,54,34,.25)",
          transition: "margin 240ms cubic-bezier(.2,.9,.3,1)",
        }}
      />
    </button>
  );
}

/** کارت امکانات مهم استاد — جلسات فوری، جلسات رایگان و پذیرش رزرو. */
function QuickFeatureToggles({ runtime }: { runtime: PlatformRuntime }) {
  const { L, lang, N } = useAppearance();
  const [state, setState] = useState<FeatureSwitches | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadFeatureSwitches(runtime)
      .then((value) => {
        if (active) setState(value);
      })
      .catch(() => {
        if (active) setState(null);
      });
    return () => {
      active = false;
    };
  }, [runtime]);

  const toggle = async (key: "available" | "instant_enabled" | "free_enabled", next: boolean) => {
    if (state === null || busyKey !== null) return;
    const previous = state;
    setBusyKey(key);
    setError(null);
    setState({ ...state, [key === "available" ? "available" : key === "instant_enabled" ? "instantEnabled" : "freeEnabled"]: next });
    try {
      const response = await runtime.request<ApiEnvelope<unknown>>("/teacher/me", {
        method: "PUT",
        body: JSON.stringify({ [key]: next }),
      });
      // همگام‌سازی با پاسخ سرور — وضعیت سوییچ‌ها همیشه همان چیزی است که در
      // پایگاه‌داده ثبت شده؛ حتی اگر به هر دلیل مقدار دیگری ذخیره شده باشد.
      const row = asRecord(response.data);
      if (row) {
        setState({
          available: row.available !== false,
          instantEnabled: row.instant_enabled === true,
          freeEnabled: row.free_enabled !== false,
        });
      }
    } catch {
      setState(previous);
      setError("تغییر وضعیت انجام نشد؛ دوباره تلاش کنید.");
      setBusyKey(null);
    }
  };

  if (state === null) return null;

  const rows = [
    {
      key: "instant_enabled" as const,
      icon: "sparkle" as const,
      title: L("جلسات فوری"),
      hint: state.instantEnabled
        ? L("فعال است — کاربران می‌توانند همین حالا با شما جلسه بگذارند")
        : L("خاموش — با فعال‌کردن، رزروهای همین‌لحظه به شما می‌رسد"),
      checked: state.instantEnabled,
      gold: true,
    },
    {
      key: "free_enabled" as const,
      icon: "gift" as const,
      title: L("جلسات رایگان"),
      hint: state.freeEnabled
        ? L("فعال است — خدمات صفر تومانی شما در تابلوی رایگان دیده می‌شود")
        : L("خاموش — خدمات رایگان شما مخفی و رزرو رایگان بسته است"),
      checked: state.freeEnabled,
      gold: false,
    },
    {
      key: "available" as const,
      icon: "checkCircle" as const,
      title: L("پذیرش درخواست جدید"),
      hint: state.available
        ? L("چراغ سبز شما روشن است و در جستجو و فراخوان‌ها دیده می‌شوید")
        : L("آفلاین — پروفایل شما به کاربران رزرو نشان نمی‌دهد"),
      checked: state.available,
      gold: false,
    },
  ];

  return (
    <section aria-label={L("امکانات سریع")} className="vodda-enter" style={{ display: "grid", gap: 12, padding: 16, borderRadius: 24, border: `1.5px solid ${colors.goldSoft}`, background: gradients.goldPanel, boxShadow: shadows.sm }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span aria-hidden="true" style={{ width: 38, height: 38, display: "grid", placeItems: "center", flex: "0 0 38px", borderRadius: 12, background: "linear-gradient(145deg,#d8b869,#b8923c)", color: "#fff" }}>
          <Icon name="settings" size={19} stroke={2} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ display: "block", fontSize: 14, fontWeight: 800, color: colors.ink }}>{L("امکانات مهم استادی")}</strong>
          <span style={{ display: "block", fontSize: 11, color: colors.inkMuted, marginTop: 1 }}>{L("با یک لمس فعال یا غیرفعال کنید")}</span>
        </div>
      </div>

      {error ? (
        <span role="alert" style={{ fontSize: 11.5, color: colors.danger }}>
          {L(error)}
        </span>
      ) : null}

      <div style={{ display: "grid", gap: 9 }}>
        {rows.map((row) => (
          <div
            key={row.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "11px 13px",
              borderRadius: 16,
              background: colors.surface,
              border: `1px solid ${row.gold && row.checked ? colors.goldSoft : colors.sand150}`,
              boxShadow: row.gold && row.checked ? "0 0 0 3px rgba(231,213,168,.28)" : "none",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 36, height: 36, display: "grid", placeItems: "center", flex: "0 0 36px", borderRadius: 12,
                background: row.gold ? gradients.goldRow : colors.olive50,
                border: `1px solid ${row.gold ? colors.goldSoft : colors.olive100}`,
                color: row.gold ? colors.goldDark : colors.olive700,
              }}
            >
              <Icon name={row.icon} size={18} stroke={2} />
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: "block", fontSize: 13, fontWeight: 800, color: colors.ink }}>{row.title}</strong>
              <span style={{ display: "block", fontSize: 10.5, color: colors.inkMuted, marginTop: 2, lineHeight: 1.7 }}>{row.hint}</span>
            </span>
            <FeatureSwitch checked={row.checked} label={row.title} onChange={() => void toggle(row.key, !row.checked)} />
          </div>
        ))}
      </div>
    </section>
  );
}

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

/* ۱.الف.۶ — وضعیت امتیاز/سطح استاد (از مسیر محلی BFF؛ در بیلد نیتیو در دسترس نبود، کارت پنهان می‌شود) */
type TeacherScoreSnapshot = {
  points: number;
  levelLabel: string;
  levelIcon: string;
  progress: { current: number; next: number; pct: number; nextLabel: string | null };
  events: Array<{ label: string; points: number; createdAt: string }>;
};

function parseScoreSnapshot(value: unknown): TeacherScoreSnapshot | null {
  const data = asRecord(value);
  if (!data) return null;
  const progress = asRecord(data.progress);
  if (!progress) return null;
  const events = Array.isArray(data.events) ? data.events : [];
  return {
    points: asNumber(data.points),
    levelLabel: asString(data.levelLabel, "مبتدی"),
    levelIcon: asString(data.levelIcon, "🌱"),
    progress: {
      current: asNumber(progress.current),
      next: asNumber(progress.next),
      pct: asNumber(progress.pct),
      nextLabel: asString(progress.nextLabel) || null,
    },
    events: events
      .map((event) => {
        const record = asRecord(event);
        if (!record) return null;
        return { label: asString(record.label), points: asNumber(record.points), createdAt: asString(record.createdAt) };
      })
      .filter((event): event is { label: string; points: number; createdAt: string } => event !== null),
  };
}

/** وضعیت تکمیل پروفایل حرفه‌ای استاد — چک‌لیست راهنمای ورود به کار */
type CompletionState = {
  activeServices: number;
  bioChars: number;
  hasTitle: boolean;
  priceSet: boolean;
  workSlots: number;
};

async function loadCompletionState(runtime: PlatformRuntime): Promise<CompletionState> {
  const [teacherResponse, workTimesResponse] = await Promise.all([
    runtime.request<ApiEnvelope<unknown>>("/teacher/me"),
    runtime.request<ApiEnvelope<unknown[]>>("/teacher/work-times").catch(() => ({ data: [] as unknown[] })),
  ]);
  const row = asRecord(teacherResponse.data) ?? {};
  const services = asArray(row.services).map(asRecord);
  const workTimes = Array.isArray(workTimesResponse.data) ? workTimesResponse.data : [];
  return {
    activeServices: services.filter((service) => service?.active === true).length,
    bioChars: asString(row.bio).trim().length,
    hasTitle: asString(row.field).trim().length > 0 || asString(row.tag).trim().length > 0,
    priceSet: asNumber(row.price30) > 0 || asNumber(row.price60) > 0,
    workSlots: workTimes.length,
  };
}

function parseTeacherSummary(value: unknown): TeacherSummary | null {
  const user = asRecord(value);
  if (!user) return null;
  const teacher = asRecord(user.teacher);

  return {
    // ۱.الف.۶ — امتیاز به ردیف استاد گره خورده: شناسهٔ پروفایل استادی مقدم بر شناسهٔ کاربر است.
    id: asNumber(teacher?.id) || asNumber(user.id),
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

type Translate = (text: string) => string;

function officialTime(session: TeacherSession, L: Translate, lang: "fa" | "en"): string {
  if (!session.localDate || !session.localStart || !session.localEnd) {
    return "";
  }
  return L("{date} · {from} تا {to}")
    .replace("{date}", formatAppDate(session.localDate, lang))
    .replace("{from}", localizedDigits(session.localStart, lang))
    .replace("{to}", localizedDigits(session.localEnd, lang));
}

export function TeacherDashboardScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { L, lang, N } = useAppearance();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [dispatchBadge, setDispatchBadge] = useState(0);
  const [completion, setCompletion] = useState<CompletionState | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  /* ۱.الف.۶ — امتیاز/سطح استاد؛ best-effort و خارج از مسیر خطای داشبورد */
  const [score, setScore] = useState<TeacherScoreSnapshot | null>(null);
  /* ۱.ب.۳ — کلید استوری‌ها؛ خاموش = پنل استوری داشبورد استاد هم پنهان می‌شود */
  const [storiesEnabled, setStoriesEnabled] = useState(false);
  // باگ refresh-loop: پاسخ دیرهنگام شمارندهٔ فراخوان نباید با دادهٔ کهنه بازنویسی شود.
  const loadGeneration = useRef(0);

  useEffect(() => {
    let cancelled = false;
    runtime.restoreSession()
      .then((sessionUser) => {
        if (!cancelled) setUser(sessionUser);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [runtime]);

  /* ۱.ب.۳ — کلید استوری‌ها (fail-safe؛ خطا = پنهان) — پنل استوری فقط با کلید روشن */
  useEffect(() => {
    let cancelled = false;
    fetchStoriesEnabled(runtime)
      .then((enabled) => {
        if (!cancelled) setStoriesEnabled(enabled);
      })
      .catch(() => {
        if (!cancelled) setStoriesEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runtime]);

  const loadDispatchBadge = useCallback(async () => {
    // نشانِ فراخوان‌ها = جمعِ فراخوان‌های آنلاین + مراسم حضوری (یک صندوق واحد)
    const [online, ceremony] = await Promise.all([
      getTeacherDispatchInbox(runtime).catch(() => null),
      getTeacherCeremonyInbox(runtime).catch(() => null),
    ]);
    const onlineCount = online
      ? online.calls.length + online.offers.filter((offer) => offer.status === "waiting").length
      : 0;
    const ceremonyCount = ceremony
      ? ceremony.calls.filter((item) => !item.accepted && item.my_offer === null).length +
        ceremony.offers.filter((offer) => offer.status === "waiting").length
      : 0;
    setDispatchBadge(onlineCount + ceremonyCount);
  }, [runtime]);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const isStale = () => loadGeneration.current !== generation;
    setLoading(true);
    setError(null);
    try {
      const nextSnapshot = await getTeacherDashboardSnapshot(runtime);
      if (isStale()) return;
      setSnapshot(nextSnapshot);
    } catch (loadError) {
      if (isStale()) return;
      setSnapshot(null);
      setError(messageOf(loadError));
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
    void loadDispatchBadge();
    void loadCompletionState(runtime)
      .then((state) => setCompletion(state))
      .catch(() => setCompletion(null));
    const timer = window.setInterval(() => void loadDispatchBadge(), 12000);
    return () => window.clearInterval(timer);
  }, [load, loadDispatchBadge, runtime]);

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

  const teacher = snapshot?.teacher ?? null;
  const pending = snapshot?.pending ?? [];
  const rating = teacher && teacher.reviews > 0 ? teacher.rating.toFixed(1) : "—";
  const firstName = (N(teacher?.name) || "").trim().split(/\s+/)[0];

  /* ۱.الف.۶ — امتیاز استاد پس از شناسه‌شدن داشبورد بارگذاری می‌شود؛ خطا بی‌صدا نادیده گرفته می‌شود. */
  const scoreGeneration = useRef(0);
  const teacherId = teacher?.id ?? 0;
  useEffect(() => {
    if (!teacherId || teacherId <= 0) return;
    const generation = ++scoreGeneration.current;
    let cancelled = false;
    runtime
      .request<ApiEnvelope<unknown>>(`/score/teacher/${teacherId}`)
      .then((response) => {
        if (cancelled || scoreGeneration.current !== generation) return;
        setScore(parseScoreSnapshot(response.data));
      })
      .catch(() => {
        if (!cancelled) setScore(null); // بیلد نیتیو/بک‌اند بدون این مسیر → کارت پنهان می‌ماند
      });
    return () => {
      cancelled = true;
    };
  }, [runtime, teacherId]);

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          className="vodda-tappable vodda-enter"
          onClick={() => setRoleSheetOpen(true)}
          aria-label={L("تغییر به فضای قرآن‌آموز")}
          style={{
            width: "100%",
            minWidth: 0,
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "4px 0",
            textAlign: "right",
            border: 0,
            color: colors.ink,
            background: "transparent",
            fontFamily: typography.fontFamily,
            cursor: "pointer",
          }}
        >
          <Avatar name={teacher?.name} src={avatarSrc(teacher?.avatarUrl, undefined, uploadsOriginOf(runtime.apiBaseUrl))} size={46} ring />
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ ...typography.caption, display: "block", color: colors.inkMuted }}>{L("پنل استاد · {name}").replace("{name}", firstName)}</span>
            <strong style={{ ...typography.body, display: "inline-flex", alignItems: "center", gap: 5, color: colors.olive700 }}>
              {L("تغییر حساب")}
              <Icon name="refresh" size={15} stroke={1.9} />
            </strong>
          </span>
        </button>
        <NotificationsBell config={config} />
      </div>

      <CityLocator />

      {/* E2 — استوری‌های من: انتشار تصویری (فشرده‌سازی خودکار) فقط برای دنبال‌کننده‌ها
       * ۱.ب.۳ — کلید خاموش = سیستم استوری پنهان؛ پنل استاد هم بدون آن رندر نمی‌شود. */}
      {storiesEnabled ? <TeacherStoriesPanel /> : null}

      {loading ? (
        <LoadingState label={L("در حال دریافت داشبورد استاد…")} style={{ minHeight: 180 }} />
      ) : error || !snapshot || !teacher ? (
        <ErrorState
          title={L("دریافت داشبورد ناموفق بود")}
          description={error ? L(error) : L("اطلاعات داشبورد دریافت نشد.")}
          action={<Button onClick={() => void load()}>{L("تلاش دوباره")}</Button>}
        />
      ) : (
        <>
      <div>
        <WalletHero label={L("موجودی قابل برداشت")} amount={amountLabel(teacher.wallet, lang)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", alignItems: "center" }}>
            {[
              [L("امتیاز"), (rating === "—" ? rating : localizedDigits(rating, lang)) + " ★"],
              [L("نظرها"), localizedDigits(teacher.reviews, lang)],
              [L("جلسات"), localizedDigits(teacher.sessions, lang)],
            ].flatMap(([label, value], index) => {
              const metric = (
                <div key={label} style={{ minWidth: 0, textAlign: "center" }}>
                  <span style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,.60)" }}>{label}</span>
                  <strong style={{ display: "block", marginTop: 3, fontSize: 15, fontWeight: 800, color: colors.onOlive }}>{value}</strong>
                </div>
              );
              if (index === 2) return [metric];
              return [metric, <span key={label + "-divider"} aria-hidden="true" style={{ width: 1, height: 34, background: "rgba(255,255,255,.24)" }} />];
            })}
          </div>
        </WalletHero>
        <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 11.5, lineHeight: 1.6, color: colors.inkMuted }}>
          {L("آمار دوره‌ای درآمد تا زمان وجود گزارش واقعی نمایش داده نمی‌شود.")}
        </p>
      </div>

      {/* ۱.الف.۶ — کارت «سطح استاد» با نوار پیشرفت تا سطح بعدی */}
      {score ? (
        <Card
          className="vodda-enter"
          style={{
            display: "grid",
            gap: 12,
            padding: 16,
            borderRadius: 20,
            boxShadow: "0 0 6px rgba(46,54,34,.04)",
            background: "linear-gradient(140deg, #ffffff 0%, #f7efd9 130%)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span
              aria-hidden="true"
              style={{
                width: 42,
                height: 42,
                display: "grid",
                placeItems: "center",
                flex: "0 0 42px",
                borderRadius: 14,
                fontSize: 20,
                background: colors.goldBackground,
                border: "1px solid rgba(191,149,64,.35)",
              }}
            >
              {score.levelIcon}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: "block", fontSize: 14, fontWeight: 800, color: colors.ink }}>
                {L("سطح استاد: {label}").replace("{label}", N(score.levelLabel))}
              </strong>
              <span style={{ display: "block", marginTop: 2, fontSize: 11.5, color: colors.inkMuted }}>
                {localizedDigits(score.points, lang)} {L("امتیاز")}
                {score.progress.nextLabel
                  ? ` · ${localizedDigits(Math.max(0, score.progress.next - score.points), lang)} ${L("امتیاز تا سطح «{label}»").replace("{label}", N(score.progress.nextLabel))}`
                  : ` · ${L("بالاترین سطح کسب‌شده")}`}
              </span>
            </div>
          </div>
          <div
            role="progressbar"
            aria-label={L("پیشرفت امتیاز تا سطح بعدی")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={score.progress.pct}
            style={{ height: 9, borderRadius: 999, background: colors.sand100, overflow: "hidden" }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(4, score.progress.pct))}%`,
                height: "100%",
                borderRadius: 999,
                background: "linear-gradient(90deg, #bf9540 0%, #e7d5a8 100%)",
                transition: "width 420ms ease",
              }}
            />
          </div>
          {score.events.length > 0 ? (
            <div style={{ display: "grid", gap: 5, marginTop: 2 }}>
              {score.events.slice(0, 3).map((event) => (
                <div
                  key={`${event.label}-${event.createdAt}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    fontSize: 11,
                    color: colors.inkSecondary,
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{N(event.label)}</span>
                  <span
                    style={{
                      flex: "0 0 auto",
                      fontWeight: 800,
                      color: event.points >= 0 ? colors.success : colors.danger,
                    }}
                  >
                    {event.points >= 0 ? "+" : "−"}
                    {localizedDigits(Math.abs(event.points), lang)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      <button
        type="button"
        className="vodda-tappable vodda-enter"
        onClick={() => navigateApp("/t/dispatch", config)}
        aria-label={L("فراخوان‌های زنده")}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderRadius: 20,
          border: `1px solid ${dispatchBadge > 0 ? colors.olive200 : colors.sand150}`,
          background: dispatchBadge > 0 ? gradients.soft : colors.surface,
          boxShadow: shadows.sm,
          cursor: "pointer",
          fontFamily: typography.fontFamily,
          textAlign: "right",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "grid", placeItems: "center", width: 42, height: 42,
            borderRadius: 14, flex: "0 0 42px",
            background: dispatchBadge > 0 ? colors.olive600 : colors.sand100, color: dispatchBadge > 0 ? colors.surface : colors.inkMuted,
          }}
        >
          <Icon name="bell" size={20} stroke={1.9} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: 14, fontWeight: 800, color: colors.ink }}>
            {L("فراخوان‌ها")}
          </strong>
          <span style={{ display: "block", fontSize: 11.5, color: colors.inkMuted, marginTop: 2, lineHeight: 1.7 }}>
            {dispatchBadge > 0
              ? L("🔔 فراخوان تازهٔ جلسهٔ آنلاین یا مراسم — سریع اعلام آمادگی کنید")
              : L("درخواست‌های جلسهٔ آنلاین و مراسم حضوری کاربران — در یک صندوق")}
          </span>
        </span>
        {dispatchBadge > 0 ? (
          <span
            aria-label={L("{n} فراخوان جدید").replace("{n}", localizedDigits(dispatchBadge, lang))}
            style={{
              flex: "0 0 auto", minWidth: 24, height: 24, borderRadius: 999,
              display: "grid", placeItems: "center", padding: "0 7px",
              background: colors.gold, color: "#fff", fontSize: 12, fontWeight: 800,
            }}
          >
            {localizedDigits(dispatchBadge, lang)}
          </span>
        ) : (
          <Icon name="chevronL" size={16} style={{ flex: "0 0 auto", color: colors.inkFaint }} />
        )}
      </button>

      {completion ? <CompletionChecklist state={completion} config={config} /> : null}

      <QuickFeatureToggles runtime={runtime} />

      {pending.length > 0 ? (
        <button
          type="button"
          className="vodda-tappable"
          onClick={() => navigateApp("/t/requests", config)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 13,
            padding: 16,
            textAlign: "right",
            border: "1px solid " + colors.goldSoft,
            borderRadius: 24,
            color: colors.ink,
            background: colors.goldBackground,
            fontFamily: typography.fontFamily,
            cursor: "pointer",
          }}
        >
          <Icon name="message" size={27} style={{ flex: "0 0 auto", color: colors.gold }} />
          <span style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: colors.goldInk }}>{L("{n} درخواست جدید").replace("{n}", localizedDigits(pending.length, lang))}</strong>
            <span style={{ display: "block", marginTop: 2, fontSize: 12, color: colors.goldInkSoft }}>{L("برای تأیید یا رد، لمس کنید")}</span>
          </span>
          <Icon name="chevronL" size={20} style={{ color: colors.goldInkSoft }} />
        </button>
      ) : null}

      {nextSession ? (
        <section>
          <SectionHeader title={L("جلسهٔ بعدی شما")} action={L("همهٔ جلسات")} onAction={() => navigateApp("/t/sessions", config)} />
          <Card
            style={{
              display: "grid",
              gap: 13,
              marginTop: spacing.md,
              padding: 15,
              borderRadius: 24,
              boxShadow: "0 0 6px rgba(46,54,34,.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={nextSession.learnerName} size={46} ring={false} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: colors.ink }}>{N(nextSession.learnerName)}</strong>
                <span style={{ display: "block", marginTop: 3, fontSize: 12.5, color: colors.inkSecondary }}>{L(nextSession.service)}</span>
              </div>
              <span style={{ padding: "5px 9px", borderRadius: radii.pill, color: colors.onOlive, background: colors.olive600, ...typography.caption, fontWeight: 700 }}>
                {L("تأییدشده")}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 14px", borderRadius: 13, color: colors.inkSecondary, background: colors.sand50, fontSize: 12.5 }}>
              <Icon name="calendar" size={16} style={{ color: colors.olive500 }} />
              {officialTime(nextSession, L, lang) || L("زمان رسمی جلسه دریافت نشد")}
            </div>
            <Button variant="secondary" fullWidth onClick={() => navigateApp("/t/sessions", config)}>
              {L("مشاهدهٔ جزئیات جلسه")}
            </Button>
          </Card>
        </section>
      ) : null}

      <section>
        <SectionHeader title={L("مدیریت سریع")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: spacing.md }}>
          {([
            ["book" as const, "خدمات من", "/t/services"],
            ["clock" as const, "زمان‌های کاری", "/t/work-times"],
            ["wallet" as const, "کیف پول", "/t/wallet"],
            ["calendar" as const, "همهٔ جلسات", "/t/sessions"],
            ["mic" as const, "خدمات حضوری", "/t/presence"],
          ] as const).map(([icon, label, path]) => (
            <button
              key={path}
              type="button"
              onClick={() => navigateApp(path, config)}
              className="vodda-tappable"
              style={{
                minHeight: 68,
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: 14,
                textAlign: "right",
                border: 0,
                borderRadius: 18,
                color: colors.ink,
                background: colors.surface,
                boxShadow: "0 0 4px rgba(46,54,34,.04)",
                fontFamily: typography.fontFamily,
                cursor: "pointer",
              }}
            >
              <span style={{ width: 40, height: 40, display: "grid", placeItems: "center", flex: "0 0 40px", borderRadius: 12, color: colors.olive700, background: colors.olive100 }}>
                <Icon name={icon} size={21} />
              </span>
              <strong style={{ minWidth: 0, fontSize: 13, fontWeight: 700 }}>{L(label)}</strong>
            </button>
          ))}
        </div>
      </section>

        </>
      )}

      <RoleModeSheet
        open={roleSheetOpen}
        mode="teacher"
        config={config}
        user={user}
        onClose={() => setRoleSheetOpen(false)}
      />
    </section>
  );
}

/** چک‌لیست تکمیل پروفایل استادی — تا استاد تازه‌وارد قدم‌به‌قدم حرفه‌ای شود. */
function CompletionChecklist({ state, config }: { state: CompletionState; config: UniversalAppConfig }) {
  const { L, lang, N } = useAppearance();
  const items = useMemo(
    () =>
      [
        {
          icon: "book" as const,
          title: L("ثبت حداقل یک خدمت فعال"),
          hint: L("خدمت آنلاین شما را برای رزرو کردن باز می‌کند"),
          done: state.activeServices > 0,
          meta: state.activeServices > 0 ? L("{n} خدمت فعال").replace("{n}", localizedDigits(state.activeServices, lang)) : L("ثبت خدمت"),
          path: "/t/services",
        },
        {
          icon: "user" as const,
          title: L("معرفی و تخصص حرفه‌ای"),
          hint: L("معرفی حداقل ۴۰ حرفی به‌همراه حوزه تخصص یا عنوان استاد"),
          done: state.bioChars >= 40 && state.hasTitle,
          meta: state.bioChars >= 40 ? (state.hasTitle ? L("کامل شد") : L("افزودن عنوان")) : L("تکمیل معرفی"),
          path: "/t/profile",
        },
        {
          icon: "coins" as const,
          title: L("تعرفهٔ جلسات ۳۰ و ۶۰ دقیقه‌ای"),
          hint: L("تعرفهٔ شفاف، شانس ظاهرشدن در فراخوان‌ها را بالا می‌برد"),
          done: state.priceSet,
          meta: state.priceSet ? L("تعریف شده") : L("تعیین تعرفه"),
          path: "/t/profile",
        },
        {
          icon: "clock" as const,
          title: L("زمان‌های کاری هفتگی"),
          hint: L("ساعات حضور شما برای رزروهای خودکار"),
          done: state.workSlots > 0,
          meta: state.workSlots > 0 ? L("{n} بازه").replace("{n}", localizedDigits(state.workSlots, lang)) : L("افزودن بازه"),
          path: "/t/work-times",
        },
      ] as const,
    [state, L, lang],
  );

  const doneCount = items.filter((item) => item.done).length;
  const percent = Math.round((doneCount / items.length) * 100);
  // پروفایل کامل — نیازی به یادآوری نیست
  if (percent >= 100) return null;

  return (
    <section
      className="vodda-enter"
      aria-label={L("تکمیل پروفایل استادی")}
      style={{
        display: "grid",
        gap: 12,
        padding: 16,
        borderRadius: 22,
        border: `1px solid ${colors.goldSoft}`,
        background: `linear-gradient(150deg, ${colors.goldBackground} 0%, ${colors.surface} 55%)`,
        boxShadow: shadows.sm,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            width: 38, height: 38, display: "grid", placeItems: "center", flex: "0 0 38px",
            borderRadius: 12, background: "linear-gradient(145deg, #d8b869, #b8923c)", color: "#fff",
          }}
        >
          <Icon name="award" size={20} stroke={2} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ display: "block", fontSize: 14, fontWeight: 800, color: colors.ink }}>
            {L("پروفایل استادی خود را کامل کنید")}
          </strong>
          <span style={{ display: "block", fontSize: 11.5, color: colors.inkMuted, marginTop: 1 }}>
            {L("پروفایل کامل = اعتماد بیشتر و رزروهای بیشتر")}
          </span>
        </div>
        <strong
          aria-label={L("{n} درصد تکمیل").replace("{n}", localizedDigits(percent, lang))}
          style={{
            flex: "0 0 auto", minWidth: 44, textAlign: "center",
            padding: "5px 9px", borderRadius: 999, fontSize: 12.5, fontWeight: 800,
            color: colors.goldInk, background: colors.goldBackground, border: `1px solid ${colors.goldSoft}`,
          }}
        >
          {L("٪{n}").replace("{n}", localizedDigits(percent, lang))}
        </strong>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        style={{ height: 6, borderRadius: 999, background: colors.sand100, overflow: "hidden" }}
      >
        <span
          style={{
            display: "block", height: "100%", borderRadius: 999,
            width: `${percent}%`,
            background: "linear-gradient(90deg, #b8923c, #d8b869)",
            transition: "width 420ms cubic-bezier(.2,.9,.3,1)",
          }}
        />
      </div>

      <div style={{ display: "grid", gap: 7 }}>
        {items.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => navigateApp(item.path, config)}
            className="vodda-tappable"
            aria-label={`${item.title} — ${item.done ? L("انجام شده") : L("انجام نشده")}`}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", textAlign: "right",
              border: `1px solid ${item.done ? colors.olive100 : colors.sand150}`,
              borderRadius: 15,
              background: item.done ? colors.olive50 : colors.surface,
              color: colors.ink,
              fontFamily: typography.fontFamily,
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 26, height: 26, display: "grid", placeItems: "center", flex: "0 0 26px",
                borderRadius: "50%",
                background: item.done ? colors.olive600 : colors.sand100,
                color: item.done ? colors.onOlive : colors.inkFaint,
              }}
            >
              <Icon name={item.done ? "check" : item.icon} size={14} stroke={2.4} />
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <strong
                style={{
                  display: "block", fontSize: 13, fontWeight: item.done ? 600 : 800,
                  color: item.done ? colors.olive700 : colors.ink,
                }}
              >
                {item.title}
              </strong>
              <span style={{ display: "block", fontSize: 11, color: colors.inkMuted, marginTop: 1, lineHeight: 1.6 }}>
                {item.hint}
              </span>
            </span>
            <span
              style={{
                flex: "0 0 auto", fontSize: 11, fontWeight: 700,
                color: item.done ? colors.olive600 : colors.goldInkSoft,
              }}
            >
              {item.meta}
            </span>
            <Icon name="chevronL" size={15} style={{ flex: "0 0 auto", color: colors.inkFaint }} />
          </button>
        ))}
      </div>
    </section>
  );
}
