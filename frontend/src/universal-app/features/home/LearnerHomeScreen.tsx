"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp } from "../../router";
import {
  Avatar,
  Button,
  Card,
  CornerOrnament,
  HeroPanel,
  Icon,
  IconBadge,
  LoadingState,
  OrnamentDivider,
  SectionHeader,
  Sheet,
  StatusPill,
  todayJalaliLabel,
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { resolveAssetUrl } from "../../platform/asset";
import { RoleModeSheet } from "../auth/RoleModeSheet";
import {
  getNotifications,
  markNotificationRead,
  type AppNotification,
} from "../notifications/api";
import { getLearnerSessions } from "../sessions/api";
import { isUpcomingSession, type LearnerSession } from "../sessions/types";
import { searchTeachers } from "../teachers/api";
import { TeacherCard } from "../teachers/TeacherCard";
import type { Teacher } from "../teachers/types";

export type LearnerHomeScreenProps = {
  config: UniversalAppConfig;
};

/* ─────────────────────────  کش لیست استادان (۵ دقیقه)  ───────────────────────── */

const TEACHERS_CACHE_TTL = 5 * 60 * 1000;
const teachersCache: { data: Teacher[] | null; at: number } = { data: null, at: 0 };

function teachersCacheFresh() {
  return teachersCache.data !== null && Date.now() - teachersCache.at < TEACHERS_CACHE_TTL;
}

/* ─────────────────────────  سلام ساعت‌محور و تاریخ شمسی  ───────────────────────── */

function tehranHour() {
  try {
    return Number(
      new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", hour: "numeric", hour12: false }).format(new Date()),
    );
  } catch {
    return new Date().getHours();
  }
}

function greetingLabel() {
  const hour = tehranHour();
  if (hour < 12) return "صبح بخیر";
  if (hour < 15) return "ظهر بخیر";
  if (hour < 20) return "عصر بخیر";
  return "شب بخیر";
}

function todayLabel() {
  return todayJalaliLabel();
}

function dayOfYearIndex() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

function tehranDayKey(dateIso: string) {
  if (!dateIso) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(dateIso));
  } catch {
    return "";
  }
}

function isTodayInTehran(dateIso: string) {
  return dateIso !== "" && tehranDayKey(dateIso) === tehranDayKey(new Date().toISOString());
}

/* آیه و حدیث روز — فقط متون معروف و معتبر درباره علم و آموزش؛ چرخش روزانه */
const DAILY_QUOTES: Array<{ text: string; source: string }> = [
  { text: "وَقُل رَّبِّ زِدْنِي عِلْمًا", source: "قرآن — طه: ۱۱۴" },
  { text: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ", source: "حدیث نبوی" },
  { text: "هَلْ يَسْتَوِي الَّذِينَ يَعْلَمُونَ وَالَّذِينَ لَا يَعْلَمُونَ", source: "قرآن — الزمر: ۹" },
  { text: "مَنْ سَلَكَ طَرِيقًا يَطْلُبُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ", source: "حدیث نبوی" },
  { text: "يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ", source: "قرآن — المجادلة: ۱۱" },
  { text: "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ", source: "قرآن — العلق: ۱" },
  { text: "إِنَّمَا يَخْشَى اللَّهَ مِنْ عِبَادِهِ الْعُلَمَاءُ", source: "قرآن — فاطر: ۲۸" },
  { text: "فَاسْأَلُوا أَهْلَ الذِّكْرِ إِن كُنتُمْ لَا تَعْلَمُونَ", source: "قرآن — النحل: ۴۳" },
  { text: "سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ حَتَّىٰ يَتَبَيَّنَ لَهُمْ أَنَّهُ الْحَقُّ", source: "قرآن — فصلت: ۵۳" },
  { text: "وَمَن يُؤْتَ الْحِكْمَةَ فَقَدْ أُوتِيَ خَيْرًا كَثِيرًا", source: "قرآن — البقرة: ۲۶۹" },
  { text: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", source: "قرآن — الرعد: ۲۸" },
  { text: "طَلَبُ الْعِلْمِ فَرِيضَةٌ عَلَى كُلِّ مُسْلِمٍ", source: "حدیث نبوی" },
];

function faNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits }).format(value);
}

function walletShort(wallet: number) {
  if (wallet >= 1_000_000) return `${faNumber(wallet / 1_000_000)} میلیون`;
  return `${faNumber(Math.round(wallet / 1000), 0)} هزار`;
}

/* ─────────────────────────  منطق پیشنهاد و استاد ویژه  ───────────────────────── */

function recommendationScore(teacher: Teacher) {
  return teacher.rating * Math.log10(10 + Math.max(0, teacher.sessions));
}

/* ─────────────────────────  دسته‌بندی‌های سریع داده‌محور  ───────────────────────── */

type CategoryMeta = { title: string; description: string; icon: "quran" | "mic" | "book" | "doc" | "headphones"; tone: "olive" | "clay" | "gold" | "info" };

// آیکون/رنگ هر دسته بر اساس کلیدواژه‌های نام رشته انتخاب می‌شود؛ عنوان همیشه
// همان نام واقعی رشته در دیتابیس است تا فیلتر جستجو دقیق کار کند.
// (پلتفرم فعلاً تخصصاً قرآنی است — رشته مداحی پنهان شده)
const CATEGORY_KEYWORDS: Array<{ match: RegExp; meta: Omit<CategoryMeta, "title"> }> = [
  { match: /تلاوت|صوت/, meta: { description: "اصوات و آوای قرآنی", icon: "headphones", tone: "gold" } },
  { match: /قران|قرآن|تجوید|روخوانی|حفظ/, meta: { description: "روخوانی، تجوید و حفظ", icon: "quran", tone: "olive" } },
  { match: /احکام|فقه/, meta: { description: "مسائل شرعی روزمره", icon: "doc", tone: "info" } },
];

// استادهای مداحی فعلاً از تمام سطوح کاربری پنهان می‌شوند (پلتفرم تخصصاً قرآنی).
const MADDAHI_PATTERN = /مداح|هم‌نوا|همنوا/;

function isMaddahiTeacher(teacher: Teacher) {
  return MADDAHI_PATTERN.test(teacher.field) || MADDAHI_PATTERN.test(teacher.tag);
}

const CATEGORY_FALLBACK_META: Omit<CategoryMeta, "title"> = {
  description: "جلسه‌های آموزشی",
  icon: "book",
  tone: "olive",
};

function categoryMetaFor(field: string): CategoryMeta {
  for (const { match, meta } of CATEGORY_KEYWORDS) {
    if (match.test(field)) return { title: field, ...meta };
  }
  return { title: field, ...CATEGORY_FALLBACK_META };
}

function teacherSubtitle(teacher: Teacher) {
  return [teacher.tag || teacher.field, teacher.city].filter(Boolean).join(" · ");
}

/* ─────────────────────────  زیرکامپوننت‌ها  ───────────────────────── */

function Skeleton({ style }: { style?: CSSProperties }) {
  return <span aria-hidden="true" className="vodda-skeleton" style={{ display: "block", ...style }} />;
}

function HomeSkeleton() {
  return (
    <div role="status" aria-label="در حال بارگذاری" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <Skeleton style={{ width: 48, height: 48, borderRadius: "50%" }} />
        <div style={{ display: "grid", gap: 7, flex: 1 }}>
          <Skeleton style={{ width: 96, height: 12 }} />
          <Skeleton style={{ width: 150, height: 16 }} />
        </div>
        <Skeleton style={{ width: 44, height: 44, borderRadius: 16 }} />
      </div>
      <Skeleton style={{ height: 168, borderRadius: radii.xl }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <Skeleton style={{ height: 142, borderRadius: radii.lg }} />
        <Skeleton style={{ height: 142, borderRadius: radii.lg }} />
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        <Skeleton style={{ width: 130, height: 18 }} />
        <div style={{ display: "flex", gap: spacing.md, overflow: "hidden" }}>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} style={{ flex: "0 0 232px", height: 176, borderRadius: 24 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TrustStrip() {
  const items = [
    { icon: "checkCircle" as const, label: "اساتید تأییدشده" },
    { icon: "shield" as const, label: "پرداخت امن با درگاه و کیف پول" },
    { icon: "refresh" as const, label: "لغو آزاد تا پیش از جلسه" },
  ];
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} className="vodda-enter vodda-enter-delay-1">
      {items.map((item) => (
        <span
          key={item.label}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 11px",
            borderRadius: 999,
            border: `1px solid ${colors.olive100}`,
            background: colors.olive50,
            color: colors.olive700,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <Icon name={item.icon} size={13} stroke={2} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function ProfileNudgeBar({ config }: { config: UniversalAppConfig }) {
  return (
    <button
      type="button"
      onClick={() => navigateApp("/profile/edit", config)}
      className="vodda-tappable vodda-enter"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: spacing.sm,
        padding: "10px 14px",
        textAlign: "right",
        border: `1px dashed ${colors.olive100}`,
        borderRadius: radii.md,
        background: colors.surface,
        color: colors.ink,
        cursor: "pointer",
        fontFamily: typography.fontFamily,
      }}
    >
      <IconBadge icon="edit" tone="gold" size={34} />
      <span style={{ flex: 1, minWidth: 0, ...typography.caption, color: colors.inkMuted, fontWeight: 600 }}>
        پروفایل خود را کامل کنید تا اساتید شما را بهتر بشناسند
      </span>
      <Icon name="chevronL" size={16} style={{ color: colors.inkMuted }} />
    </button>
  );
}

function VerseStrip() {
  const quote = DAILY_QUOTES[dayOfYearIndex() % DAILY_QUOTES.length];
  const isQuran = quote.source.startsWith("قرآن");
  return (
    <div
      className="vodda-enter"
      style={{
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        gap: spacing.sm,
        padding: "12px 16px",
        borderRadius: radii.lg,
        /* رنگ طلایی کاغذی + خط طلا — لحظهٔ آیه باید از بقیهٔ صفحه متمایز باشد */
        background: `linear-gradient(150deg, ${colors.goldBackground}, #fffaf0 78%)`,
        border: `1px solid ${colors.goldSoft}`,
        boxShadow: "0 4px 14px rgba(191,149,64,.10)",
      }}
    >
      <CornerOrnament tone="olive" size={92} style={{ insetInlineStart: -26, top: -30, opacity: 0.8 }} />
      <Icon
        name="quran"
        size={18}
        style={{ color: colors.goldDark, flex: "0 0 auto", position: "relative" }}
      />
      <p
        style={{
          margin: 0,
          minWidth: 0,
          flex: 1,
          position: "relative",
          fontSize: 13.5,
          color: colors.ink,
          fontWeight: 600,
          ...(isQuran ? { fontFamily: "VoddaQuran, IRANYekanXFaNum, sans-serif", fontSize: 15, fontWeight: 400, lineHeight: 2.05 } : null),
        }}
      >
        {isQuran ? "﴿" : "«"} {quote.text} {isQuran ? "﴾" : "»"}
        <span
          style={{
            color: colors.goldDark,
            fontFamily: "IRANYekanXFaNum, sans-serif",
            fontWeight: 800,
            fontSize: 11.5,
            marginInlineStart: 6,
            whiteSpace: "nowrap",
          }}
        >
          — {quote.source}
        </span>
      </p>
    </div>
  );
}

function SearchPill({ config }: { config: UniversalAppConfig }) {
  return (
    <button
      type="button"
      onClick={() => navigateApp("/search", config)}
      className="vodda-card vodda-card--interactive vodda-tappable vodda-enter"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "13px 16px",
        borderRadius: 999,
        border: `1px solid ${colors.sand150}`,
        background: colors.surface,
        boxShadow: shadows.sm,
        color: colors.inkMuted,
        cursor: "pointer",
        fontFamily: typography.fontFamily,
        textAlign: "right",
      }}
    >
      <Icon name="search" size={18} style={{ color: colors.olive700, flex: "0 0 auto" }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600 }}>
        به دنبال کدام استاد قرآن هستید؟
      </span>
      <Icon name="chevronL" size={16} style={{ flex: "0 0 auto" }} />
    </button>
  );
}

function OnboardingChecklist({ user, config }: { user: AuthUser; config: UniversalAppConfig }) {
  const profileDone = Boolean(user.avatar_url && user.city?.trim() && user.bio?.trim());
  const steps = [
    { done: true, label: "ساخت حساب وُدّا", icon: "user" as const, target: "" },
    { done: profileDone, label: "تکمیل پروفایل", icon: "edit" as const, target: "/profile/edit" },
    { done: false, label: "اولین رزرو جلسه", icon: "calendar" as const, target: "/search" },
  ];
  const remaining = steps.filter((step) => !step.done).length;
  return (
    <Card elevated className="vodda-enter" style={{ display: "grid", gap: 10 }}>
      <strong style={{ ...typography.body, color: colors.ink }}>سه قدم تا جلسهٔ اول</strong>
      {steps.map((step) => {
        const content = (
          <>
            <Icon
              name={step.icon}
              size={20}
              stroke={step.done ? 2 : 1.7}
              style={{ color: step.done ? colors.olive600 : colors.inkFaint, flex: "0 0 auto" }}
            />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                ...typography.bodySmall,
                color: step.done ? colors.inkMuted : colors.ink,
                fontWeight: step.done ? 600 : 800,
                textDecoration: step.done ? "line-through" : "none",
              }}
            >
              {step.label}
            </span>
            {!step.done && step.target ? <Icon name="chevronL" size={16} style={{ color: colors.inkFaint }} /> : null}
          </>
        );
        if (step.done || !step.target) {
          return <div key={step.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>{content}</div>;
        }
        return (
          <button
            key={step.label}
            type="button"
            onClick={() => navigateApp(step.target, config)}
            className="vodda-tappable"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 0,
              border: 0,
              background: "transparent",
              cursor: "pointer",
              fontFamily: typography.fontFamily,
              textAlign: "right",
              color: colors.ink,
            }}
          >
            {content}
          </button>
        );
      })}
      <span style={{ ...typography.caption, color: colors.inkMuted }}>
        {remaining > 0
          ? `${faNumber(remaining, 0)} گام تا آماده شدن برای نخستین جلسه باقی مانده است`
          : "همه‌چیز آماده است؛ زمان رزرو نخستین جلسه فرا رسیده است."}
      </span>
    </Card>
  );
}

type PastTeacher = { id: number; name: string; avatarUrl: string };

function RebookRail({ teachers, config }: { teachers: PastTeacher[]; config: UniversalAppConfig }) {
  if (teachers.length === 0) return null;
  return (
    <section aria-label="استادهای جلسه‌های قبلی تو" className="vodda-enter" style={{ minWidth: 0 }}>
      <SectionHeader title="استادهای جلسه‌های قبلی تو" />
      <div
        className="vodda-scroll-rail"
        style={{
          display: "flex",
          width: "100%",
          minWidth: 0,
          gap: spacing.md,
          overflowX: "auto",
          marginInline: -spacing.xl,
          padding: `${spacing.md}px ${spacing.xl}px ${spacing.sm}px`,
          scrollSnapType: "x proximity",
        }}
      >
        {teachers.map((teacher) => {
          const open = () => navigateApp(`/teacher/${teacher.id}`, config);
          return (
            <div
              key={teacher.id}
              role="button"
              tabIndex={0}
              className="vodda-card vodda-card--interactive vodda-tappable"
              onClick={open}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                open();
              }}
              style={{
                flex: "0 0 172px",
                width: 172,
                display: "grid",
                justifyItems: "center",
                alignContent: "center",
                gap: 10,
                padding: 16,
                textAlign: "center",
                color: colors.ink,
                background: colors.surface,
                border: 0,
                borderRadius: 24,
                boxShadow: "0 6px 22px rgba(46,54,34,.07)",
                cursor: "pointer",
                fontFamily: typography.fontFamily,
              }}
            >
              <Avatar name={teacher.name} src={teacher.avatarUrl || undefined} size={54} ring tone="gold" />
              <strong
                style={{
                  maxWidth: "100%",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 13.5,
                  fontWeight: 800,
                }}
              >
                {teacher.name}
              </strong>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, color: colors.olive700 }}>
                رزرو دوباره
                <Icon name="chevronL" size={13} />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NextSessionCard({ session, config }: { session: LearnerSession; config: UniversalAppConfig }) {
  const today = isTodayInTehran(session.scheduledAt);
  const time = today && session.localStart
    ? `امروز · ${session.localStart}`
    : [session.localDate, session.localStart].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={() => navigateApp("/sessions", config)}
      className="vodda-card vodda-card--interactive vodda-tappable vodda-enter"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.lg,
        textAlign: "right",
        color: colors.ink,
        background: colors.surface,
        border: `1px solid ${today ? colors.gold : colors.olive100}`,
        borderRadius: radii.xl,
        boxShadow: shadows.md,
        cursor: "pointer",
        fontFamily: typography.fontFamily,
      }}
    >
      <IconBadge icon="calendar" tone="olive" size={46} />
      <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 4 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={{ ...typography.caption, color: colors.olive700, fontWeight: 800 }}>جلسه بعدی تو</span>
          {today ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 999,
                background: colors.goldBackground,
                color: colors.goldDark,
                fontSize: 11.5,
                fontWeight: 800,
              }}
            >
              امروز!
            </span>
          ) : null}
          <StatusPill status={session.status} />
        </span>
        <strong style={{ ...typography.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: colors.ink }}>
          {session.service || "جلسه آموزشی"} با {session.teacherName}
        </strong>
        <span style={{ ...typography.caption, display: "inline-flex", alignItems: "center", gap: 4, color: colors.inkMuted }}>
          <Icon name="clock" size={13} />
          {time || "زمان از دفتر استاد پیگیری شود"}
        </span>
      </span>
      <Icon name="chevronL" size={18} style={{ color: colors.inkMuted, flex: "0 0 auto" }} />
    </button>
  );
}

function RebookBanner({ config }: { config: UniversalAppConfig }) {
  return (
    <Card elevated className="vodda-enter" style={{ display: "flex", alignItems: "center", gap: spacing.md, padding: spacing.lg }}>
      <IconBadge icon="sparkle" tone="gold" size={46} />
      <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 3 }}>
        <strong style={{ ...typography.body, color: colors.ink }}>جلسه دیگری رزرو می‌کنید؟</strong>
        <span style={{ ...typography.caption, color: colors.inkMuted }}>زمان‌های آزاد جدید اساتید در انتظار شماست.</span>
      </span>
      <Button onClick={() => navigateApp("/search", config)} style={{ minHeight: 40, padding: "8px 16px", fontSize: 13 }}>
        جستجوی استاد
      </Button>
    </Card>
  );
}

function TeacherRail({
  title,
  teachers,
  config,
}: {
  title: string;
  teachers: Teacher[];
  config: UniversalAppConfig;
}) {
  if (teachers.length === 0) return null;

  return (
    <section aria-label={title} className="vodda-enter" style={{ minWidth: 0 }}>
      <SectionHeader title={title} action="مشاهدهٔ همه" onAction={() => navigateApp("/search", config)} />
      <div
        className="vodda-scroll-rail"
        style={{
          display: "flex",
          width: "100%",
          minWidth: 0,
          gap: spacing.md,
          overflowX: "auto",
          marginInline: -spacing.xl,
          padding: `${spacing.md}px ${spacing.xl}px ${spacing.sm}px`,
          scrollSnapType: "x proximity",
        }}
      >
        {teachers.map((teacher) => (
          <div key={teacher.id} style={{ flex: "0 0 auto", scrollSnapAlign: "start" }}>
            <TeacherCard teacher={teacher} config={config} />
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedTeacher({ teacher, config }: { teacher: Teacher; config: UniversalAppConfig }) {
  const sample = teacher.samples.find((item) => item.url) ?? null;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => {
    audioRef.current?.pause();
  }, []);

  const toggleSample = (event: { stopPropagation(): void }) => {
    event.stopPropagation();
    if (!sample) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(resolveAssetUrl(sample.url) ?? sample.url);
      audioRef.current.addEventListener("ended", () => setPlaying(false));
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      void audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  return (
    <div
      onClick={() => navigateApp(`/teacher/${teacher.id}`, config)}
      className="vodda-enter"
      style={{
        width: "100%",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        gap: spacing.lg,
        padding: spacing.lg,
        textAlign: "right",
        color: colors.surface,
        background: gradients.deep,
        borderRadius: radii.xl,
        boxShadow: shadows.md,
        cursor: "pointer",
        fontFamily: typography.fontFamily,
      }}
    >
      {/* تذهیب گوشه — هویت قرآنی روی کارت استاد ویژه (فاز ۲) */}
      <CornerOrnament tone="light" size={118} style={{ insetInlineEnd: -30, top: -34, opacity: 0.9 }} />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 145,
          height: 145,
          insetInlineEnd: -70,
          top: -82,
          borderRadius: "50%",
          background: "rgba(255,255,255,.06)",
        }}
      />
      {/* چهرهٔ استاد به‌جای ایموجی (C3) — با حلقهٔ طلایی و نشان پخش نمونهٔ صوت */}
      <div style={{ position: "relative", flex: "0 0 auto" }}>
        <Avatar
          name={teacher.name}
          src={teacher.avatarUrl || undefined}
          size={76}
          ring={false}
          style={{
            border: "2px solid rgba(231,213,168,.85)",
            boxShadow: "0 6px 18px rgba(0,0,0,.35)",
            background: colors.olive800,
          }}
        />
        {sample ? (
          <button
            type="button"
            aria-label={playing ? "توقف نمونه‌صوت" : `پخش نمونه‌صوت: ${sample.title}`}
            onClick={toggleSample}
            style={{
              position: "absolute",
              bottom: -6,
              insetInlineEnd: -6,
              width: 32,
              height: 32,
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              background: gradients.goldRich,
              border: `2px solid ${colors.surface}`,
              color: colors.surface,
              cursor: "pointer",
              boxShadow: shadows.sm,
            }}
          >
            {playing ? (
              <span aria-hidden="true" style={{ width: 10, height: 10, background: "currentColor", borderRadius: 2 }} />
            ) : (
              <Icon name="play" size={14} fill />
            )}
          </button>
        ) : null}
      </div>
      <div style={{ minWidth: 0, flex: 1, position: "relative" }}>
        <p style={{ ...typography.caption, display: "flex", alignItems: "center", gap: 5, margin: 0, color: colors.goldSoft, fontWeight: 800 }}>
          <Icon name="sparkle" size={14} stroke={2} />
          استاد ویژهٔ امروز
        </p>
        <h2 style={{ ...typography.title, margin: `${spacing.sm}px 0 0`, color: colors.surface }}>{teacher.name}</h2>
        <p style={{ ...typography.bodySmall, margin: "3px 0 0", color: "rgba(255,255,255,0.72)" }}>
          {teacherSubtitle(teacher) || "مشاهده خدمات و زمان‌های قابل رزرو"}
        </p>
        <p style={{ ...typography.caption, display: "flex", alignItems: "center", gap: 8, margin: `${spacing.sm}px 0 0`, color: colors.goldSoft, fontWeight: 800 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            <Icon name="star" size={13} fill />
            {faNumber(teacher.rating)}
          </span>
          {teacher.reviews > 0 ? <span>({faNumber(teacher.reviews, 0)} نظر)</span> : null}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              navigateApp(`/teacher/${teacher.id}`, config);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              marginInlineStart: "auto",
              border: "1px solid rgba(231,213,168,.55)",
              borderRadius: 999,
              padding: "6px 12px",
              background: "rgba(255,255,255,.08)",
              color: colors.surface,
              fontSize: 12,
              fontWeight: 800,
              fontFamily: typography.fontFamily,
              cursor: "pointer",
              minHeight: 32,
            }}
          >
            مشاهده و رزرو
            <Icon name="chevronL" size={14} />
          </button>
        </p>
      </div>
    </div>
  );
}

function NotificationsBell({
  runtime,
  user,
}: {
  runtime: ReturnType<typeof usePlatform>;
  user: AuthUser | null;
}) {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let active = true;
    getNotifications(runtime)
      .then((list) => {
        if (active) setUnread(list.filter((notification) => !notification.read).length);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [runtime, user]);

  const openSheet = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const list = await getNotifications(runtime);
      setItems(list);
      setUnread(list.filter((notification) => !notification.read).length);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    if (!items) return;
    setMarking(true);
    for (const notification of items.filter((item) => !item.read)) {
      try {
        await markNotificationRead(runtime, notification.id);
      } catch {
        // تلاش برای بقیه ادامه پیدا می‌کند
      }
    }
    setItems(items.map((item) => ({ ...item, read: true })));
    setUnread(0);
    setMarking(false);
  };

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        aria-label="اعلان‌ها"
        className="vodda-tappable"
        onClick={openSheet}
        style={{
          position: "relative",
          width: 44,
          height: 44,
          display: "grid",
          placeItems: "center",
          flex: "0 0 44px",
          padding: 0,
          border: `1px solid ${colors.olive100}`,
          borderRadius: 16,
          color: colors.olive700,
          background: colors.olive50,
          cursor: "pointer",
        }}
      >
        <Icon name="bell" size={20} />
        {unread > 0 ? (
          <span
            style={{
              position: "absolute",
              top: -5,
              insetInlineEnd: -5,
              minWidth: 18,
              height: 18,
              display: "grid",
              placeItems: "center",
              padding: "0 4px",
              borderRadius: 999,
              border: `2px solid ${colors.surface}`,
              background: colors.danger,
              color: colors.surface,
              fontSize: 11,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            {unread > 9 ? "۹+" : faNumber(unread, 0)}
          </span>
        ) : null}
      </button>
      <Sheet open={open} title="اعلان‌ها" onClose={() => setOpen(false)}>
        <div style={{ display: "grid", gap: spacing.md }}>
          {loading ? (
            <LoadingState label="در حال دریافت اعلان‌ها…" style={{ minHeight: 140 }} />
          ) : items === null || items.length === 0 ? (
            <div style={{ display: "grid", justifyItems: "center", gap: spacing.sm, paddingBlock: spacing.xl, textAlign: "center" }}>
              <IconBadge icon="bell" tone="olive" size={52} />
              <strong style={{ ...typography.body, color: colors.ink }}>اعلانی نداری</strong>
              <span style={{ ...typography.caption, color: colors.inkMuted }}>
                وقتی خبر تازه‌ای داشته باشیم اینجا می‌بینی.
              </span>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto" }}>
                {items.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      display: "grid",
                      gap: 3,
                      padding: "10px 12px",
                      borderRadius: radii.md,
                      background: notification.read ? colors.surface : colors.olive50,
                      border: `1px solid ${notification.read ? colors.sand150 : colors.olive100}`,
                    }}
                  >
                    <span style={{ ...typography.bodySmall, display: "flex", alignItems: "center", gap: 6, color: colors.ink, fontWeight: notification.read ? 700 : 900 }}>
                      {!notification.read ? (
                        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: colors.olive600, flex: "0 0 auto" }} />
                      ) : null}
                      {notification.title}
                    </span>
                    {notification.body ? (
                      <span style={{ ...typography.caption, color: colors.inkMuted, lineHeight: 1.7 }}>{notification.body}</span>
                    ) : null}
                  </div>
                ))}
              </div>
              {unread > 0 ? (
                <Button variant="secondary" disabled={marking} onClick={markAllRead} style={{ minHeight: 42 }}>
                  {marking ? "در حال ثبت…" : "علامت‌گذاری همه به‌عنوان خوانده‌شده"}
                </Button>
              ) : null}
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}

/* ─────────────────────────  صفحه خانه  ───────────────────────── */

type SessionAreaState = "loading" | "next" | "rebook" | "hero";

export function LearnerHomeScreen({ config }: LearnerHomeScreenProps) {
  const runtime = usePlatform();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(!teachersCacheFresh());
  const [teachersError, setTeachersError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [sessionArea, setSessionArea] = useState<SessionAreaState>("loading");
  const [nextSession, setNextSession] = useState<LearnerSession | null>(null);
  const [pastTeachers, setPastTeachers] = useState<PastTeacher[]>([]);

  useEffect(() => {
    let active = true;
    runtime.restoreSession()
      .then((sessionUser) => {
        if (active) setUser(sessionUser);
      })
      .catch(() => {
        if (active) setUser(null);
      });
    return () => {
      active = false;
    };
  }, [runtime]);

  useEffect(() => {
    let active = true;
    if (teachersCacheFresh() && teachersCache.data) {
      setTeachers(teachersCache.data);
      setTeachersLoading(false);
    } else {
      setTeachersLoading(true);
    }
    searchTeachers(runtime, { limit: 100 })
      .then((items) => {
        if (!active) return;
        const visible = items.filter((teacher) => !isMaddahiTeacher(teacher));
        teachersCache.data = visible;
        teachersCache.at = Date.now();
        setTeachers(visible);
        setTeachersError(null);
      })
      .catch((error: unknown) => {
        if (!active || teachersCacheFresh()) return;
        setTeachers([]);
        setTeachersError(messageOf(error, "دریافت استادان ناموفق بود."));
      })
      .finally(() => {
        if (active) setTeachersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [runtime, reloadKey]);

  useEffect(() => {
    if (!user) {
      setSessionArea("hero");
      setNextSession(null);
      setPastTeachers([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const [upcoming, past] = await Promise.all([
          getLearnerSessions(runtime, "upcoming"),
          getLearnerSessions(runtime, "past"),
        ]);
        if (!active) return;
        const soonest = upcoming
          .filter(isUpcomingSession)
          .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0] ?? null;
        setNextSession(soonest);
        const seen = new Set<number>();
        const unique: PastTeacher[] = [];
        for (const session of [...past].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))) {
          if (session.teacherId > 0 && !seen.has(session.teacherId)) {
            seen.add(session.teacherId);
            unique.push({ id: session.teacherId, name: session.teacherName, avatarUrl: session.teacherAvatar });
          }
        }
        setPastTeachers(unique.slice(0, 8));
        setSessionArea(soonest ? "next" : past.length > 0 ? "rebook" : "hero");
      } catch {
        if (active) {
          setNextSession(null);
          setSessionArea("hero");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [runtime, user]);

  const women = useMemo(() => teachers.filter((teacher) => teacher.female), [teachers]);

  const recommended = useMemo(
    () => [...teachers].sort((a, b) => recommendationScore(b) - recommendationScore(a)).slice(0, 12),
    [teachers],
  );

  const mostActive = useMemo(
    () => [...teachers].sort((a, b) => b.sessions - a.sessions).slice(0, 12),
    [teachers],
  );

  const featured = useMemo(() => {
    const strong = teachers
      .filter((teacher) => teacher.verified && teacher.reviews >= 3)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
    const pool = strong.length > 0 ? strong : recommended.slice(0, 3);
    if (pool.length === 0) return null;
    return pool[dayOfYearIndex() % pool.length];
  }, [teachers, recommended]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const teacher of teachers) {
      const field = teacher.field?.trim();
      if (!field) continue;
      counts.set(field, (counts.get(field) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([field, count]) => ({ field, count, meta: categoryMetaFor(field) }));
  }, [teachers]);

  const firstName = user?.name?.trim().split(/\s+/)[0] || "دوست";
  const canUseTeacherMode = user?.role === "teacher" || user?.role === "admin";
  const needsProfileNudge =
    user !== null && (!user.avatar_url || !user.city?.trim() || !user.bio?.trim());
  const today = todayLabel();

  if (teachersLoading && teachers.length === 0 && !teachersError) {
    return <HomeSkeleton />;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", minWidth: 0, gap: 26 }}>
      <header
        className="vodda-enter"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
          paddingBlock: spacing.xs,
        }}
      >
        <button
          type="button"
          onClick={() => { if (canUseTeacherMode) setRoleSheetOpen(true); }}
          className="vodda-tappable"
          style={{
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: 0,
            textAlign: "right",
            border: 0,
            color: colors.ink,
            background: "transparent",
            fontFamily: typography.fontFamily,
            cursor: canUseTeacherMode ? "pointer" : "default",
          }}
        >
          <Avatar name={user?.name} src={user?.avatar_url} size={48} ring />
          <span style={{ minWidth: 0 }}>
            <span style={{ ...typography.caption, display: "block", color: colors.inkMuted }}>
              {greetingLabel()}،{today ? ` امروز ${today}` : ""}
            </span>
            <strong
              style={{
                ...typography.body,
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: colors.ink,
                fontWeight: 900,
              }}
            >
              {user?.name?.trim() ? `${firstName} جان` : "کاربر عزیز"} 🌿
            </strong>
            {canUseTeacherMode ? (
              <span style={{ display: "block", marginTop: 1, fontSize: 11.5, color: colors.olive700, fontWeight: 600 }}>
                برای تغییر پنل، به پروفایل بروید
              </span>
            ) : null}
          </span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
          <NotificationsBell runtime={runtime} user={user} />
          <button
            type="button"
            aria-label="کیف پول"
            className="vodda-tappable"
            onClick={() => navigateApp("/wallet", config)}
            style={{
              minWidth: 44,
              height: 44,
              display: "grid",
              placeItems: "center",
              alignContent: "center",
              gap: 1,
              padding: "4px 8px",
              border: `1px solid ${colors.olive100}`,
              borderRadius: 16,
              color: colors.olive700,
              background: colors.olive50,
              cursor: "pointer",
            }}
          >
            <Icon name="wallet" size={18} />
            <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap" }}>
              {user && user.wallet > 0 ? walletShort(user.wallet) : "کیف پول"}
            </span>
          </button>
        </div>
      </header>

      <VerseStrip />
      <SearchPill config={config} />

      {sessionArea === "loading" ? (
        <Skeleton style={{ height: 120, borderRadius: radii.xl }} />
      ) : sessionArea === "next" && nextSession ? (
        <NextSessionCard session={nextSession} config={config} />
      ) : sessionArea === "rebook" ? (
        <RebookBanner config={config} />
      ) : user ? (
        <OnboardingChecklist user={user} config={config} />
      ) : (
        <HeroPanel
          eyebrow="به وُدّا خوش آمدید"
          title={"استاد قرآن خود را بیابید\nو زمان آزاد ایشان را رزرو کنید"}
          description="پروفایل استادان تأییدشده و خدمات قابل رزرو را ببینید."
        >
          <Button
            onClick={() => navigateApp("/search", config)}
            style={{
              minHeight: 44,
              color: colors.olive700,
              background: colors.surface,
              borderColor: colors.surface,
              boxShadow: "none",
            }}
          >
            <Icon name="search" size={18} />
            جستجوی استاد
          </Button>
        </HeroPanel>
      )}
      <TrustStrip />

      {needsProfileNudge ? <ProfileNudgeBar config={config} /> : null}

      {!teachersLoading && !teachersError && categories.length > 0 ? (
        <section className="vodda-enter vodda-enter-delay-1">
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(categories.length, 3)}, minmax(0, 1fr))`, gap: 10 }}>
            {categories.map((category) => (
              <button
                key={category.field}
                type="button"
                onClick={() => navigateApp(`/search?field=${encodeURIComponent(category.field)}`, config)}
                className="vodda-card vodda-card--interactive vodda-tappable"
                style={{
                  minHeight: 142,
                  display: "grid",
                  justifyItems: "center",
                  alignContent: "center",
                  gap: spacing.sm,
                  padding: spacing.lg,
                  textAlign: "center",
                  color: colors.ink,
                  background: colors.surface,
                  border: `1px solid ${colors.sand150}`,
                  borderRadius: radii.lg,
                  boxShadow: shadows.sm,
                  cursor: "pointer",
                  fontFamily: typography.fontFamily,
                }}
              >
                <IconBadge icon={category.meta.icon} tone={category.meta.tone} size={50} />
                <strong style={{ ...typography.body, color: colors.ink, fontWeight: 900 }}>{category.meta.title}</strong>
                <span style={{ ...typography.caption, color: colors.inkMuted }}>
                  {faNumber(category.count, 0)} استاد فعال
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {teachersLoading && teachers.length === 0 ? (
        <HomeSkeleton />
      ) : teachersError ? (
        <Card elevated style={{ display: "grid", gap: spacing.md, textAlign: "center" }}>
          <IconBadge icon="users" tone="olive" size={52} />
          <strong style={{ ...typography.title, color: colors.ink }}>دریافت استادان ناموفق بود</strong>
          <span style={{ ...typography.caption, color: colors.inkMuted }}>{teachersError}</span>
          <Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>
            تلاش دوباره
          </Button>
        </Card>
      ) : teachers.length === 0 ? (
        <Card style={{ paddingBlock: spacing.huge, textAlign: "center" }}>
          <IconBadge icon="users" tone="olive" size={58} />
          <strong style={{ ...typography.title, display: "block", marginTop: spacing.md }}>هنوز استادی منتشر نشده</strong>
          <p style={{ ...typography.caption, margin: `${spacing.sm}px 0 0`, color: colors.inkMuted }}>
            پس از تأیید اولین استاد، پروفایل او در این بخش نمایش داده می‌شود.
          </p>
        </Card>
      ) : (
        <>
          <RebookRail teachers={pastTeachers} config={config} />
          <TeacherRail title="اساتید پیشنهادی" teachers={recommended} config={config} />
          {featured ? <FeaturedTeacher teacher={featured} config={config} /> : null}
          <OrnamentDivider style={{ margin: `${spacing.xs}px 0 ${spacing.xs}px` }} />
          <TeacherRail title="اساتید بانو" teachers={women} config={config} />
          <TeacherRail title="فعال‌ترین استادها" teachers={mostActive} config={config} />
        </>
      )}

      <RoleModeSheet
        open={roleSheetOpen}
        mode="learner"
        config={config}
        onClose={() => setRoleSheetOpen(false)}
      />
    </div>
  );
}
