"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp } from "../../router";
import {
  Avatar,
  Button,
  Card,
  Icon,
  IconBadge,
  LoadingState,
  OrnamentDivider,
  SectionHeader,
  Sheet,
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { useMinWidth } from "../../ui/useMediaQuery";
import { messageOf } from "../../ui/errorMessage";
import { useAppearance } from "../../ui/appearance";
import { localizedDigits } from "../../ui/persian";
import { neonDivider } from "../../ui/neon";
import { todayAppDateLabel } from "../../ui/jalali";
import { resolveAssetUrl } from "../../platform/asset";
import { RoleModeSheet } from "../auth/RoleModeSheet";
import { avatarSrc, uploadsOriginOf } from "@/lib/avatarImage";
import { formatDate, formatNumber, tehranHour } from "@/lib/datetime";
import {
  groupCatalog,
  type CatalogCategory,
  type CatalogRow,
} from "@/lib/category";
import {
  buildCategoryTiles,
  byDiscoveryRank,
  freeServiceCards,
  popularServiceCards,
  serviceImageSrc,
  type CategoryTile,
  type FreeServiceCard,
  type PopularServiceCard,
} from "@/lib/home/discover";
import { getCatalog } from "../dispatch/api";
import {
  getNotifications,
  markNotificationRead,
  type AppNotification,
} from "../notifications/api";
import { searchTeachers, fetchRecommendedTeachers } from "../teachers/api";
import { VoddaPicksCarousel } from "./VoddaPicksCarousel";
import { StoryRail, markStorySeen } from "../stories/StoryRail";
import { StoryViewer } from "../stories/StoryViewer";
import { StoryComposer } from "../stories/StoryComposer";
import { fetchStories, type Story } from "../stories/api";
import type { Teacher } from "../teachers/types";
import { nearestCity } from "@/lib/cities";
import {
  cityPermissionAsked,
  markCityPermissionAsked,
  readStoredCity,
  storedCityUsable,
  writeStoredCity,
  type UserCitySource,
} from "@/lib/userCity";
import { CityChipButton, CityPickerSheet } from "./CityPickerSheet";
import { localRecommendedPicks } from "../discover/recommended";

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

function greetingLabel() {
  let hour: number;
  try {
    hour = tehranHour(new Date());
  } catch {
    hour = new Date().getHours();
  }
  if (hour < 12) return "صبح بخیر";
  if (hour < 15) return "ظهر بخیر";
  if (hour < 20) return "عصر بخیر";
  return "شب بخیر";
}

function todayLabel() {
  return formatDate(new Date(), "fa", "weekdayDayMonth");
}

// باگ persian-dates — عدد از util مرکزی
function faNumber(value: number, maximumFractionDigits = 1) {
  return formatNumber(value, "fa", { maximumFractionDigits });
}

// استادهای مداحی فعلاً از تمام سطوح کاربری پنهان می‌شوند (پلتفرم تخصصاً قرآنی).
const MADDAHI_PATTERN = /مداح|هم‌نوا|همنوا/;

function isMaddahiTeacher(teacher: Teacher) {
  return MADDAHI_PATTERN.test(teacher.field) || MADDAHI_PATTERN.test(teacher.tag);
}

/* ─────────────────────────  زیرکامپوننت‌ها  ───────────────────────── */

function Skeleton({ style }: { style?: CSSProperties }) {
  return <span aria-hidden="true" className="vodda-skeleton" style={{ display: "block", ...style }} />;
}

/* ۱.ب.۲ — skeleton هر بخش، هم‌ساختار با صفحهٔ واقعی */
function HomeSkeleton({ wide }: { wide: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: wide ? 32 : 24,
      }}
      aria-label="در حال بارگذاری"
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <Skeleton style={{ width: 44, height: 34, borderRadius: 999 }} />
        <div style={{ display: "grid", gap: 7, flex: 1 }}>
          <Skeleton style={{ width: 96, height: 12 }} />
          <Skeleton style={{ width: 150, height: 16 }} />
        </div>
        <Skeleton style={{ width: 44, height: 44, borderRadius: 16 }} />
      </div>
      <Skeleton style={{ height: 58, borderRadius: radii.lg }} />
      <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(3, minmax(0,1fr))" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} style={{ height: 100, borderRadius: 20 }} />
        ))}
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        <Skeleton style={{ width: 130, height: 18 }} />
        <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(3, minmax(0,1fr))" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} style={{ aspectRatio: '4 / 5', borderRadius: 16 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* E1 — بخش ② استوری‌های وُدّا؛ کادر «آیهٔ روز» به درخواست کاربر حذف شد. */

/* ۰.۷.۷ — کادر دسته‌بندی موضوعات: حاشیهٔ نئونی طلایی + خط‌های نئونی افقی/عمودی میان سلول‌ها؛
 * داخل کادر فقط موضوع‌های اصلی با تعداد استادِ هر موضوع — کلیک روی هر موضوع،
 * صفحهٔ زیردسته‌های همان موضوع را باز می‌کند. */
function CategoryTileGrid({
  tiles,
  loading,
  wide,
}: {
  tiles: CategoryTile[];
  loading: boolean;
  wide: boolean;
}) {
  if (loading) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: wide ? "repeat(3, minmax(0,1fr))" : "repeat(2, minmax(0, 1fr))",
          gap: 10,
        }}
        aria-label="در حال بارگذاری دسته‌ها"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} style={{ height: 100, borderRadius: 16 }} />
        ))}
      </div>
    );
  }
  if (tiles.length === 0) return null;

  return (
    <section aria-label="دسته‌بندی موضوعات قرآنی" style={{ display: "grid", gap: spacing.sm, minWidth: 0 }}>
      <SectionHeader title="دسته‌بندی موضوعات قرآنی" description="روی هر موضوع بزنید تا صفحهٔ زیردسته‌های تخصصی آن باز شود." />
      {/* کادر نئونی طلایی — فقط موضوع‌های اصلی + تعداد استاد؛ زیردسته‌ها در صفحهٔ خودِ موضوع */}
      <div
        className="vodda-neon-gold"
        style={{
          display: "grid",
          gridTemplateColumns: wide ? "repeat(3, minmax(0,1fr))" : "repeat(2, minmax(0, 1fr))",
          borderRadius: 22,
          background: colors.surface,
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {tiles.map((tile, index) => {
          const columns = wide ? 3 : 2;
          const column = index % columns;
          const row = Math.floor(index / columns);
          const rowCount = Math.ceil(tiles.length / columns);
          /* خط نئونی عمودی میان ستون‌ها + افقی میان ردیف‌ها — فقط میان سلول‌های همسایه */
          const showVertical = column < columns - 1 && index + 1 < tiles.length;
          const showHorizontal = row < rowCount - 1;
          return (
            <button
              key={tile.name}
              type="button"
              onClick={() => navigateApp(`/category?name=${encodeURIComponent(tile.name)}`)}
              className="vodda-tappable"
              aria-label={`${tile.name} — ${faNumber(tile.count, 0)} استاد فعال`}
              style={{
                position: "relative",
                display: "grid",
                alignContent: "center",
                justifyItems: "center",
                gap: 8,
                minHeight: 104,
                padding: "16px 12px",
                textAlign: "center",
                border: 0,
                background: "transparent",
                cursor: "pointer",
                fontFamily: typography.fontFamily,
                minWidth: 0,
                animation: "vodda-enter .36s ease-out both",
                animationDelay: `${index * 40}ms`,
              }}
            >
              {showVertical ? <span aria-hidden="true" style={neonDivider(true)} /> : null}
              {showHorizontal ? <span aria-hidden="true" style={neonDivider(false)} /> : null}

              <span
                aria-hidden="true"
                style={{
                  position: "relative",
                  width: 42,
                  height: 42,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 13,
                  background: "linear-gradient(140deg, #f2f5ea, #f7f0dc)",
                  border: `1px solid ${colors.goldSoft}`,
                  boxShadow: "0 0 8px rgba(191,149,64,.18)",
                  overflow: "hidden",
                }}
              >
                <Icon name="quran" size={22} style={{ color: colors.olive600 }} />
                <img
                  src={serviceImageSrc(tile.imageKey)}
                  alt=""
                  width={42}
                  height={42}
                  loading="lazy"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: 42,
                    height: 42,
                    maxWidth: 42,
                    maxHeight: 42,
                    objectFit: "contain",
                  }}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              </span>

              <strong
                style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: colors.ink,
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  overflowWrap: "anywhere",
                }}
              >
                {tile.name}
              </strong>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2.5px 10px",
                  borderRadius: 999,
                  background: colors.olive50,
                  border: `1px solid ${colors.olive100}`,
                  color: colors.olive600,
                  fontSize: 10.5,
                  fontWeight: 800,
                  whiteSpace: "nowrap" as const,
                }}
              >
                <Icon name="users" size={11} stroke={2.2} />
                {faNumber(tile.count, 0)} استاد فعال
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ۰.۹.۲ — راهنمای لبهٔ اسکرول: گرادیانت محو روی سمتِ دارای محتوای پنهان.
 * RTL: در آغاز لبهٔ چپ (به کاربر می‌گوید می‌تواند به چپ بکشد)؛ پس از رسیدن به
 * انتهای ردیف، لبهٔ راست. در LTR معکوس. به‌روزرسانی با scroll/resize و بعد از هر
 * رندر (تبدیل اسکلت به کارت واقعی هم حساب می‌شود). */
function ScrollHintRow({ children }: { children: ReactNode }) {
  const { lang } = useAppearance();
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [canStart, setCanStart] = useState(false);
  const [canEnd, setCanEnd] = useState(false);

  const update = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const hidden = el.scrollWidth - el.clientWidth;
    if (hidden <= 8) {
      setCanStart(false);
      setCanEnd(false);
      return;
    }
    /* RTL و LTR: فاصلهٔ طی‌شده از لبهٔ شروع = قدرمطلق scrollLeft */
    const position = Math.abs(el.scrollLeft);
    setCanEnd(position < hidden - 8);
    setCanStart(position > 8);
  }, []);

  /* بعد از هر رندر — محتوای ردیف ممکن است تازه از اسکلت به کارت تبدیل شده باشد */
  useEffect(() => {
    update();
  });

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const isRTL = lang !== "en";
  const solid = "rgba(252,250,244,.95)";
  const fade = (side: "start" | "end") => {
    /* سمت بیرونیِ گرادیانت (لبهٔ دید) پررنگ، سمت محتوا شفاف */
    const solidFirst = (side === "end") === isRTL;
    return (
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 30,
          zIndex: 2,
          pointerEvents: "none",
          ...(side === "end" ? { insetInlineEnd: 0 } : { insetInlineStart: 0 }),
          background: solidFirst
            ? `linear-gradient(to right, ${solid}, rgba(252,250,244,0))`
            : `linear-gradient(to right, rgba(252,250,244,0), ${solid})`,
        }}
      />
    );
  };

  return (
    <span style={{ position: "relative", display: "block", minWidth: 0 }}>
      <div
        ref={rowRef}
        className="vodda-scroll-rail"
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 10,
          overflowX: "auto",
          overflowY: "hidden",
          minWidth: 0,
          paddingBottom: 14,
        }}
      >
        {children}
      </div>
      {canEnd ? fade("end") : null}
      {canStart ? fade("start") : null}
    </span>
  );
}

/* نگاشت کلید تصویر خدمت به آیکون خطی وکتوری کارت باریک بنتو */
type AppIconName = Parameters<typeof Icon>[0]["name"];
const SLIM_SERVICE_ICON: Record<string, AppIconName> = {
  quran: "quran",
  tajweed: "book",
  alphabet: "book",
  hifz: "star",
  voice: "mic",
  tafsir: "doc",
  mosque: "pin",
  kids: "users",
  medal: "award",
  mentor: "user",
  azan: "bell",
};

function slimServiceIcon(imageKey: string): AppIconName {
  return SLIM_SERVICE_ICON[imageKey] ?? "quran";
}

/* ۱.ب.۶ — خدمات پرکاربرد — چیدمان بنتوی نامتقارن (تم لوکس و ساختاریافته):
 *  کارت بزرگ راست (بنر تصویر + گرادیان تیره + بج طلایی شمارش استاد + دکمهٔ شیشه‌ای)
 *  + کارت باریک چپ (زمینهٔ زیتونی تیره + وکتور مینیمال).
 *  بقیهٔ خدمات به‌صورت چیپ‌های کم‌حجم زیر بنتو حفظ می‌شوند تا هیچ خدمتی از دسترس خارج نشود. */
function PopularServicesGrid({
  services,
  loading,
  wide,
  config,
}: {
  services: PopularServiceCard[];
  loading: boolean;
  wide: boolean;
  config: UniversalAppConfig;
}) {
  if (loading) {
    return (
      <section aria-label="در حال بارگذاری خدمات پرکاربرد" style={{ display: "grid", gap: 12 }}>
        <Skeleton style={{ width: 150, height: 18 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 10 }}>
          <Skeleton style={{ height: wide ? 258 : 214, borderRadius: 20 }} />
          <Skeleton style={{ height: wide ? 258 : 214, borderRadius: 20 }} />
        </div>
      </section>
    );
  }
  if (services.length === 0) return null;

  const [hero, slim] = services;
  const rest = services.slice(2, 8);

  return (
    <section aria-label="خدمات پرکاربرد" style={{ display: "grid", gap: spacing.sm, minWidth: 0 }}>
      <SectionHeader title="خدمات پرکاربرد" description="پرترددترین خدمت‌های قرآنی وُدّا" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: slim ? "1.35fr 1fr" : "1fr",
          gap: 10,
          minWidth: 0,
        }}
      >
        {/* ─── کارت بزرگ راست: عکس خدمت با گرادیان تیره + بج طلایی + دکمهٔ شیشه‌ای ─── */}
        {hero ? (
          <button
            type="button"
            onClick={() => navigateApp(`/service/${hero.id}`, config)}
            className="vodda-tappable"
            aria-label={`${hero.title} — ${faNumber(hero.teacherCount, 0)} استاد`}
            style={{
              position: "relative",
              minWidth: 0,
              minHeight: wide ? 258 : 214,
              padding: 0,
              textAlign: "start",
              border: "1px solid rgba(191,149,64,.55)",
              borderRadius: 20,
              overflow: "hidden",
              background: colors.olive900,
              cursor: "pointer",
              fontFamily: typography.fontFamily,
              boxShadow: "0 14px 30px rgba(46,54,34,.16), 0 0 14px rgba(191,149,64,.12)",
              transition: "transform .16s ease, box-shadow .16s ease",
              animation: "vodda-enter .36s ease-out both",
            }}
          >
            <img
              src={serviceImageSrc(hero.imageKey)}
              alt=""
              loading="lazy"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(24,32,18,.10) 26%, rgba(24,32,18,.44) 58%, rgba(24,32,18,.84) 100%)",
              }}
            />
            {/* بج طلایی شمارش استاد */}
            <span
              style={{
                position: "absolute",
                top: 10,
                insetInlineStart: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #bf9540, #d8b869)",
                border: "1.5px solid rgba(255,253,246,.8)",
                boxShadow: "0 3px 10px rgba(139,104,31,.35)",
                color: "#fffdf6",
                fontSize: 11,
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              <Icon name="users" size={12} />
              {faNumber(hero.teacherCount, 0)} استاد
            </span>
            {/* فلش شیشه‌ای گوشهٔ کارت — اشارهٔ کلیک‌پذیری */}
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 10,
                insetInlineEnd: 10,
                width: 30,
                height: 30,
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                background: "rgba(255,253,246,.18)",
                border: "1px solid rgba(255,253,246,.45)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: "#fffdf6",
              }}
            >
              <Icon name="chevronL" size={15} stroke={2} />
            </span>
            <span
              style={{
                position: "absolute",
                insetInlineStart: 12,
                insetInlineEnd: 12,
                bottom: 12,
                display: "grid",
                gap: 9,
                minWidth: 0,
              }}
            >
              <strong
                style={{
                  color: "#fffdf6",
                  fontSize: 15.5,
                  fontWeight: 900,
                  lineHeight: 1.5,
                  textShadow: "0 1px 10px rgba(24,32,18,.5)",
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  overflow: "hidden",
                  overflowWrap: "anywhere",
                }}
              >
                {hero.title}
              </strong>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  padding: "8px 10px",
                  borderRadius: 12,
                  background: "rgba(255,253,246,.16)",
                  border: "1px solid rgba(255,253,246,.42)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  color: "#fffdf6",
                  fontSize: 11.5,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                اساتید این خدمت
                <Icon name="chevronL" size={13} />
              </span>
            </span>
          </button>
        ) : null}
        {/* ─── کارت باریک چپ: زمینهٔ زیتونی تیره + وکتور مینیمال + فلش ─── */}
        {slim ? (
          <button
            type="button"
            onClick={() => navigateApp(`/service/${slim.id}`, config)}
            className="vodda-tappable"
            aria-label={`${slim.title} — ${faNumber(slim.teacherCount, 0)} استاد`}
            style={{
              position: "relative",
              minWidth: 0,
              minHeight: wide ? 258 : 214,
              display: "flex",
              padding: 0,
              textAlign: "start",
              border: "1px solid rgba(46,54,34,.28)",
              borderRadius: 20,
              overflow: "hidden",
              background: "linear-gradient(155deg, #3c472b 0%, #4c5a36 58%, #5e6e43 100%)",
              cursor: "pointer",
              fontFamily: typography.fontFamily,
              boxShadow: "0 14px 30px rgba(46,54,34,.22)",
              animation: "vodda-enter .36s ease-out both",
              animationDelay: "60ms",
            }}
          >
            {/* وکتور مینیمال خدمت — آیکون خطی بزرگ کم‌رنگ در گوشه */}
            <Icon
              name={slimServiceIcon(slim.imageKey)}
              size={104}
              stroke={1.1}
              style={{
                position: "absolute",
                insetInlineEnd: -14,
                bottom: -12,
                color: "rgba(255,250,240,.16)",
                pointerEvents: "none",
              }}
            />
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -26,
                insetInlineStart: -26,
                width: 92,
                height: 92,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(216,184,105,.24), transparent 70%)",
              }}
            />
            <span
              style={{
                position: "relative",
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 12,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, minWidth: 0 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3.5px 9px",
                    borderRadius: 999,
                    background: "rgba(255,253,246,.16)",
                    border: "1px solid rgba(255,253,246,.3)",
                    color: "#fffdf6",
                    fontSize: 10,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon name="users" size={11} />
                  {faNumber(slim.teacherCount, 0)} استاد
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 28,
                    height: 28,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    background: "rgba(255,253,246,.14)",
                    border: "1px solid rgba(255,253,246,.35)",
                    color: "#fffdf6",
                    flex: "0 0 auto",
                  }}
                >
                  <Icon name="chevronL" size={14} stroke={2} />
                </span>
              </span>
              <strong
                style={{
                  marginTop: "auto",
                  color: "#fffdf6",
                  fontSize: 14.5,
                  fontWeight: 900,
                  lineHeight: 1.55,
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 3,
                  overflow: "hidden",
                  overflowWrap: "anywhere",
                }}
              >
                {slim.title}
              </strong>
              <span
                style={{
                  color: "rgba(255,250,240,.72)",
                  fontSize: 10,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {slim.category}
              </span>
            </span>
          </button>
        ) : null}
      </div>
      {/* ۱.۱ — بقیهٔ خدمات پرکاربرد — کادرهای کوچک هم‌خانواده با تصویر موضوعی،
       * اسکرول افقی به چپ با گرادیانت راهنمای لبه — چیپ‌های قبلی حذف شدند */}
      {rest.length > 0 ? (
        <ScrollHintRow>
          {rest.map((service, index) => (
            <button
              key={service.id}
              type="button"
              onClick={() => navigateApp(`/service/${service.id}`, config)}
              className="vodda-tappable vodda-enter"
              aria-label={`${service.title} — ${faNumber(service.teacherCount, 0)} استاد`}
              style={{
                width: wide ? 176 : 158,
                flex: "0 0 auto",
                minWidth: 0,
                display: "grid",
                padding: 0,
                textAlign: "start",
                border: `1px solid ${colors.goldSoft}`,
                borderRadius: 16,
                background: colors.surface,
                overflow: "hidden",
                cursor: "pointer",
                fontFamily: typography.fontFamily,
                boxShadow: "0 6px 16px rgba(46,54,34,.07)",
                animationDelay: `${index * 45}ms`,
              }}
            >
              <span
                style={{
                  position: "relative",
                  display: "block",
                  width: "100%",
                  aspectRatio: "1.6 / 1",
                  overflow: "hidden",
                  borderBottom: "1px solid rgba(191,149,64,.22)",
                }}
              >
                <img
                  src={serviceImageSrc(service.imageKey)}
                  alt=""
                  loading="lazy"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    insetInlineStart: 6,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "2.5px 8px",
                    borderRadius: 999,
                    background: "linear-gradient(135deg, #bf9540, #d8b869)",
                    border: "1px solid rgba(255,253,246,.8)",
                    color: "#fffdf6",
                    fontSize: 9.5,
                    fontWeight: 900,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon name="users" size={10} />
                  {faNumber(service.teacherCount, 0)} استاد
                </span>
              </span>
              <span style={{ display: "grid", gap: 7, padding: "9px 10px 10px" }}>
                <strong
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    lineHeight: 1.55,
                    color: colors.ink,
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    overflow: "hidden",
                    overflowWrap: "anywhere",
                    minHeight: 37,
                  }}
                >
                  {service.title}
                </strong>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: colors.inkMuted,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {service.category}
                  </span>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 22,
                      height: 22,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "50%",
                      background: colors.surfaceSoft,
                      border: `1px solid ${colors.sand150}`,
                      color: colors.goldDark,
                      flex: "0 0 auto",
                    }}
                  >
                    <Icon name="chevronL" size={11} stroke={2.2} />
                  </span>
                </span>
              </span>
            </button>
          ))}
        </ScrollHintRow>
      ) : null}
    </section>
  );
}

/* ۱.۱ — خدمات رایگان — کارت نمایشی بزرگ و ثابت:
 * به‌جای پشتهٔ ۴-۵ کارت، یک کادر حرفه‌ای بزرگ «هدیهٔ وُدّا» با نشان هدیهٔ نعنایی،
 * خوشهٔ آواتار استادهای رایگان و بج‌های خلاصه؛ کلیک → صفحهٔ فهرست کامل
 * خدمات رایگان (/free-services) با همان طرح اما ابعاد درشت‌تر. */
function FreeServicesShowcase({
  cards,
  loading,
  runtime,
  config,
  wide,
}: {
  cards: FreeServiceCard[];
  loading: boolean;
  runtime: ReturnType<typeof usePlatform>;
  config: UniversalAppConfig;
  wide: boolean;
}) {
  if (loading) {
    return (
      <section aria-label="در حال بارگذاری خدمات رایگان" style={{ display: "grid", gap: 12 }}>
        <Skeleton style={{ width: 140, height: 18 }} />
        <Skeleton style={{ height: wide ? 218 : 196, borderRadius: 22 }} />
      </section>
    );
  }
  if (cards.length === 0) return null;

  const faceCards = cards.slice(0, 3);

  return (
    <section aria-label="خدمات رایگان" style={{ display: "grid", gap: spacing.sm, minWidth: 0 }}>
      <SectionHeader title="خدمات رایگان" description="بدون هزینه — برای شروع مسیر قرآن" />
      <button
        type="button"
        onClick={() => navigateApp("/free-services", config)}
        className="vodda-tappable vodda-enter"
        aria-label="مشاهدهٔ همهٔ خدمات رایگان وُدّا"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 13,
          padding: wide ? 18 : 15,
          minWidth: 0,
          width: "100%",
          textAlign: "start",
          border: "1px solid rgba(58,167,109,.28)",
          borderRadius: 22,
          background: "linear-gradient(150deg, #f0f8f2 0%, #eef3ea 48%, #f7f0dc 100%)",
          boxShadow: "0 16px 34px rgba(46,84,54,.12), 0 0 16px rgba(58,167,109,.10)",
          cursor: "pointer",
          fontFamily: typography.fontFamily,
          overflow: "hidden",
        }}
      >
        {/* تزئینات پس‌زمینه — هاله‌های نعنایی/طلایی نرم */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -34,
            insetInlineStart: -34,
            width: 130,
            height: 130,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(58,167,109,.16), transparent 70%)",
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            bottom: -40,
            insetInlineEnd: -20,
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(216,184,105,.20), transparent 70%)",
          }}
        />
        {/* روبان بزرگ «هدیهٔ وُدّا» گوشهٔ کارت */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 19,
            insetInlineEnd: -31,
            width: 112,
            transform: "rotate(-45deg)",
            textAlign: "center",
            padding: "3.5px 0",
            background: "linear-gradient(135deg, #43b07f, #2e8f5c)",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 0.2,
            boxShadow: "0 2px 8px rgba(46,84,54,.28)",
          }}
        >
          هدیهٔ وُدّا
        </span>

        {/* ردیف اصلی: نشان هدیهٔ نعنایی + متن + خوشهٔ آواتار استادها */}
        <span style={{ position: "relative", display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={{
              width: 62,
              height: 62,
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              background: "linear-gradient(145deg, #43b07f, #2e8f5c)",
              color: "#ffffff",
              flex: "0 0 auto",
              boxShadow: "0 10px 22px rgba(58,167,109,.35)",
            }}
          >
            <Icon name="gift" size={30} stroke={1.7} />
          </span>
          <span style={{ flex: "1 1 auto", minWidth: 0, display: "grid", gap: 4 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: "#2e8f5c", letterSpacing: 0.2 }}>
              جلسهٔ آغازین هدیه
            </span>
            <strong
              style={{
                fontSize: wide ? 20 : 18.5,
                fontWeight: 900,
                lineHeight: 1.4,
                color: colors.olive800,
              }}
            >
              خدمات رایگان وُدّا
            </strong>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: colors.inkSecondary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              شروع مسیر قرآن با اساتید تأییدشده — بدون هیچ هزینه
            </span>
          </span>
          <span
            aria-hidden="true"
            style={{ position: "relative", display: "inline-flex", flex: "0 0 auto", width: 94, height: 44 }}
          >
            {faceCards.map((card, index) => (
              <span
                key={`${card.teacherId}-${card.id}`}
                style={{
                  position: "absolute",
                  insetInlineStart: index * 27,
                  top: 3,
                  borderRadius: "50%",
                  background: colors.surface,
                  padding: 1.5,
                  boxShadow: "0 3px 8px rgba(46,54,34,.14)",
                  display: "inline-flex",
                }}
              >
                <Avatar
                  name={card.teacherName}
                  src={avatarSrc(card.avatarUrl || undefined, undefined, uploadsOriginOf(runtime.apiBaseUrl))}
                  size={36}
                />
              </span>
            ))}
          </span>
        </span>

        {/* ردیف بج‌های خلاصه + دکمهٔ اقدام */}
        <span
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 6, minWidth: 0 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3.5px 9px",
                borderRadius: 999,
                border: "1px solid rgba(58,167,109,.35)",
                background: "rgba(255,255,255,.78)",
                color: "#2e8f5c",
                fontSize: 10,
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              <Icon name="quran" size={11} />
              {faNumber(cards.length, 0)} خدمت رایگان
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3.5px 9px",
                borderRadius: 999,
                border: `1px solid ${colors.sand150}`,
                background: "rgba(255,255,255,.78)",
                color: colors.inkSecondary,
                fontSize: 10,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              <Icon name="clock" size={11} />
              ۳۰ تا ۴۵ دقیقه
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3.5px 9px",
                borderRadius: 999,
                border: "1px solid rgba(191,149,64,.4)",
                background: "rgba(255,255,255,.78)",
                color: colors.goldDark,
                fontSize: 10,
                fontWeight: 800,
                whiteSpace: "nowrap",
              }}
            >
              <Icon name="shield" size={11} />
              اساتید تأییدشده
            </span>
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "10px 14px",
              borderRadius: 13,
              background: "linear-gradient(145deg, #43b07f, #2e8f5c)",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 800,
              whiteSpace: "nowrap",
              boxShadow: "0 8px 18px rgba(58,167,109,.32)",
            }}
          >
            مشاهدهٔ همهٔ خدمات رایگان
            <Icon name="chevronL" size={13} />
          </span>
        </span>
      </button>
    </section>
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
              fontSize: 10.5,
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

/* ─────────────────────────  صفحه خانه (۱.ب.۲ — ترتیب ۸ بخشی)  ───────────────────────── */

export function LearnerHomeScreen({ config }: LearnerHomeScreenProps) {
  const runtime = usePlatform();
  const { L, t } = useAppearance();
  const wide = useMinWidth(768);
  /* در عرض‌های خیلی باریک (<۳۶۰) عنوان مرکزی هدر پنهان می‌شود تا با خوشهٔ
   * کیف پول/اعلان/پروفایل هم‌پوشانی رخ ندهد (صفرِ سرریز در ۳۲۰px). */
  const showHeaderTitle = useMinWidth(360);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(!teachersCacheFresh());
  const [teachersError, setTeachersError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  /* ۱.ب.۱ — شهر کاربر برای chip هدر و اولویت هم‌شهری */
  const [city, setCity] = useState("");
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [cityDetecting, setCityDetecting] = useState(false);
  const [cityDetectNote, setCityDetectNote] = useState<string | null>(null);
  /* ۱.ب — دادهٔ کشف */
  const [catalogGroups, setCatalogGroups] = useState<CatalogCategory[]>([]);
  const [recommended, setRecommended] = useState<Teacher[] | null>(null);
  /* E1 — استوری‌های مدیر‌محور */
  const [stories, setStories] = useState<Story[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [storyViewerIndex, setStoryViewerIndex] = useState<number | null>(null);
  const [storyComposerOpen, setStoryComposerOpen] = useState(false);
  const [storySeenKey, setStorySeenKey] = useState(0);

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

  /* ۱.ب.۱ — فرآیند تشخیص شهر (مشخصات):
   *  ① انتخاب ذخیره‌شدهٔ کاربر → فوری؛
   *  ② مجوز از قبل داده شده → GPS بی‌صدا؛
   *  ③ مجوز نبود و تا حالا نپرسیده‌ایم → فقط یک‌بار درخواست (پرچم asked)؛
   *  ④ رد/خطا/خارج از ایران → شهر پروفایل کاربر؛ در اپ اندروید اگر مجوز رد شده
   *     باشد، هرگز درخواست زده نمی‌شود (checkPermissions در geo.hasPermission). */
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = readStoredCity();
      if (storedCityUsable(stored)) {
        if (active && stored) setCity(stored.name);
        return;
      }
      const geo = runtime.capabilities?.geo;
      if (geo) {
        const granted = await geo.hasPermission();
        const mayAsk = !granted && !cityPermissionAsked();
        if (granted || mayAsk) {
          if (!granted) markCityPermissionAsked();
          const position = await geo.currentPosition();
          if (position) {
            const detected = nearestCity(position.lat, position.lon);
            if (detected) {
              writeStoredCity(detected, "gps");
              if (active) setCity(detected);
              return;
            }
          }
        }
      }
      if (active) setCity(user?.city?.trim() ?? "");
    })();
    return () => {
      active = false;
    };
  }, [runtime, user]);

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

  /* E1 — استوری‌های زندهٔ مدیر (fail-safe؛ خطا = بدون ریل) */
  const loadStories = useCallback(async () => {
    setStoriesLoading(true);
    const rows = await fetchStories(runtime);
    setStories(rows);
    setStoriesLoading(false);
  }, [runtime]);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  /* ۱.ب.۳/۵/۶ — کاتالوگ رسمی خدمات برای خانه‌های دسته، پرکاربرد و رایگان */
  useEffect(() => {
    let active = true;
    getCatalog(runtime)
      .then((rows) => {
        if (!active) return;
        setCatalogGroups(groupCatalog(rows as CatalogRow[]));
      })
      .catch(() => {
        if (active) setCatalogGroups([]);
      });
    return () => {
      active = false;
    };
  }, [runtime]);

  /* ۱.ب.۵ — چیدمان پیشنهادی: endpoint محلی BFF؛ در دسترس نبود → موتور محلی
   * (pickRecommendedTeachers + کش ۳۰ دقیقه + تکرار ≤ ۲) */
  useEffect(() => {
    if (teachersLoading) return;
    let active = true;
    fetchRecommendedTeachers(runtime, 7)
      .then((rows) => {
        if (!active) return;
        setRecommended(rows.length > 0 ? rows : localRecommendedPicks(teachers));
      })
      .catch(() => {
        if (active) setRecommended(localRecommendedPicks(teachers));
      });
    return () => {
      active = false;
    };
  }, [runtime, teachersLoading, teachers]);

  /* ۱.ب.۱ — شهرهای واقعی سکو (از فهرست استادها) برای «همهٔ شهرها» در شیت */
  const platformCities = useMemo(
    () => [...new Set(teachers.map((teacher) => teacher.city.trim()).filter(Boolean))],
    [teachers],
  );

  /* ۱.ب.۱ — اولویت هم‌شهری: درجه ۱ نخست (حفظ ۱.الف.۵)، سپس هم‌شهری،
   * سپس rank — فقط اولویت نمایش، نه محدودیت. مرتب‌سازی JS پایدار است. */
  const cityKey = city.trim();
  const withCityPriority = useMemo(() => {
    return (items: Teacher[]): Teacher[] => {
      const ranked = [...items].sort(byDiscoveryRank);
      if (!cityKey) return ranked;
      return ranked.sort((left, right) => {
        const tier1 = Number(right.isTier1 === true) - Number(left.isTier1 === true);
        if (tier1 !== 0) return tier1;
        return Number(right.city.trim() === cityKey) - Number(left.city.trim() === cityKey);
      });
    };
  }, [cityKey]);

  /* ۱.ب.۱ — ذخیرهٔ شهر انتخابی: localStorage + پروفایل (PUT /me برای کاربر واردشده) */
  const applyCity = (name: string, source: UserCitySource) => {
    const clean = name.trim();
    if (!clean) return;
    setCity(clean);
    writeStoredCity(clean, source);
    if (!user) return; // مهمان — فقط localStorage
    runtime
      .request("/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, city: clean, bio: user.bio ?? "" }),
      })
      .catch(() => {
        /* ذخیرهٔ پروفایل ناموفق — chip از localStorage پابرجا می‌ماند */
      });
  };

  /* «استفاده از موقعیت من» — کنش صریح کاربر؛ درخواست مجوز این‌جا مجاز است */
  const useMyLocation = async () => {
    const geo = runtime.capabilities?.geo;
    if (!geo) {
      setCityDetectNote("موقعیت‌یاب در این دستگاه در دسترس نیست؛ شهر را از فهرست انتخاب کنید.");
      return;
    }
    setCityDetecting(true);
    setCityDetectNote(null);
    try {
      const granted = (await geo.hasPermission()) || (await geo.requestPermission());
      if (!granted) {
        setCityDetectNote("مجوز موقعیت داده نشد؛ شهر پروفایل شما استفاده می‌شود.");
        const profileCity = user?.city?.trim();
        if (profileCity) applyCity(profileCity, "saved");
        return;
      }
      const position = await geo.currentPosition();
      if (!position) {
        setCityDetectNote("موقعیت دریافت نشد؛ لطفاً دوباره تلاش کنید.");
        return;
      }
      const detected = nearestCity(position.lat, position.lon);
      if (!detected) {
        setCityDetectNote("نزدیک‌ترین شهر ایران به موقعیت شما پیدا نشد.");
        return;
      }
      applyCity(detected, "gps");
    } finally {
      setCityDetecting(false);
    }
  };

  /* ۱.ب — خروجی‌های موتور کشف مشترک (src/lib/home/discover.ts) */
  const tiles = useMemo(() => buildCategoryTiles(teachers, catalogGroups, 6), [teachers, catalogGroups]);
  const popular = useMemo(() => popularServiceCards(teachers, catalogGroups, 8), [teachers, catalogGroups]);
  const freeCards = useMemo(() => freeServiceCards(teachers, new Map(), 0), [teachers]);
  const topTeachers = useMemo(() => withCityPriority(teachers).slice(0, 6), [teachers, withCityPriority]);
  /* ۱.۱ — ترکیب برترین + پیشنهادی برای کروسل «پیشنهاد وُدّا» (بدون تکرار) */
  const voddaPicks = useMemo(() => {
    const seen = new Set<number>();
    const merged: Teacher[] = [];
    for (const teacher of [...topTeachers, ...(recommended ?? [])]) {
      if (seen.has(teacher.id)) continue;
      seen.add(teacher.id);
      merged.push(teacher);
    }
    return merged;
  }, [topTeachers, recommended]);

  const firstName = user?.name?.trim().split(/\s+/)[0] || "دوست";
  const today = todayLabel();
  const discoverLoading = teachersLoading || (catalogGroups.length === 0 && teachers.length === 0);

  if (teachersLoading && teachers.length === 0 && !teachersError) {
    return <HomeSkeleton wide={wide} />;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", minWidth: 0, gap: wide ? 32 : 24 }}>
      {/* ۱.ب.۲ — بخش ① header (چیدمان جدید): ردیف ۱ چیپ شهر — ردیف ۲ سه‌منطقه‌ای:
       *  راست: سلام و نام کاربر | مرکز: عنوان اپ «وُدّا» | چپ: کیف پول + اعلان‌ها + پروفایل.
       *  کیف پول از نوار پایین به هدر منتقل شد — همیشه در دسترس بدون اشغال جای منو. */}
      <header
        className="vodda-enter"
        style={{
          display: "grid",
          gap: spacing.sm + 2,
          paddingBlock: spacing.xs,
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-start", minWidth: 0 }}>
          <CityChipButton
            city={city}
            onClick={() => {
              setCityDetectNote(null);
              setCitySheetOpen(true);
            }}
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: showHeaderTitle ? "minmax(0, 1fr) auto minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)",
            alignItems: "center",
            gap: spacing.sm,
          }}
        >
          <button
            type="button"
            onClick={() => { if (user) setRoleSheetOpen(true); }}
            aria-label="تغییر حساب"
            className="vodda-tappable"
            style={{
              minWidth: 0,
              justifySelf: "start",
              display: "grid",
              gap: 2,
              padding: 0,
              textAlign: "start",
              border: 0,
              background: "transparent",
              fontFamily: typography.fontFamily,
              cursor: user ? "pointer" : "default",
            }}
          >
            <span
              style={{
                ...typography.caption,
                color: colors.inkMuted,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "start",
              }}
            >
              {greetingLabel()}{today ? ` · ${today}` : ""}
            </span>
            <strong
              style={{
                ...typography.body,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "start",
                color: colors.ink,
                fontWeight: 900,
              }}
            >
              {firstName} جان 🌿
            </strong>
          </button>
          {/* عنوان اپ — مرکز هدر (در عرض خیلی باریک پنهان) */}
          {showHeaderTitle ? (
            <div aria-hidden="true" style={{ display: "grid", justifyItems: "center", gap: 3 }}>
              <strong
                style={{
                  fontSize: 19,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  letterSpacing: 0.3,
                  color: colors.olive800,
                }}
              >
                {t("app_title")}
              </strong>
              <span
                style={{
                  width: 26,
                  height: 2.5,
                  borderRadius: 999,
                  background: "linear-gradient(90deg, transparent, rgba(191,149,64,.9), transparent)",
                  boxShadow: "0 0 6px rgba(191,149,64,.45)",
                }}
              />
            </div>
          ) : null}
          {/* خوشهٔ کنش‌ها (چپ): کیف پول + اعلان‌ها + پروفایل */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flex: "0 0 auto" }}>
            <button
              type="button"
              aria-label="کیف پول"
              title="کیف پول"
              className="vodda-tappable"
              onClick={() => navigateApp("/wallet", config)}
              style={{
                width: 38,
                height: 38,
                display: "grid",
                placeItems: "center",
                padding: 0,
                border: `1px solid ${colors.olive100}`,
                borderRadius: "50%",
                color: colors.olive700,
                background: colors.olive50,
                cursor: "pointer",
                flex: "0 0 auto",
              }}
            >
              <Icon name="wallet" size={17} />
            </button>
            <NotificationsBell runtime={runtime} user={user} />
            <button
              type="button"
              onClick={() => { if (user) setRoleSheetOpen(true); }}
              aria-label="تغییر حساب"
              className="vodda-tappable"
              style={{
                position: "relative",
                width: 38,
                height: 38,
                display: "grid",
                placeItems: "center",
                padding: 0,
                border: 0,
                background: "transparent",
                cursor: user ? "pointer" : "default",
                flex: "0 0 auto",
              }}
            >
              <Avatar
                name={user?.name}
                src={avatarSrc(user?.avatar_url, user?.updated_at, uploadsOriginOf(runtime.apiBaseUrl))}
                size={38}
                ring
              />
              {user ? (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    insetInlineStart: -4,
                    bottom: -2,
                    width: 17,
                    height: 17,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    border: `2px solid ${colors.sand50}`,
                    color: colors.goldDark,
                    background: colors.goldBackground,
                  }}
                >
                  <Icon name="refresh" size={8} stroke={2.4} />
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      {/* E1 — بخش ② استوری‌های وُدّا (مدیر‌محور؛ جایگزین کادر آیهٔ روز) */}
      <StoryRail
        stories={stories}
        loading={storiesLoading}
        isAdmin={user?.role === "admin"}
        seenRefreshKey={storySeenKey}
        onOpen={(index) => setStoryViewerIndex(index)}
        onCompose={() => setStoryComposerOpen(true)}
      />

      {/* ۱.ب.۲ — بخش ③ خانه‌های شش‌گانهٔ دسته‌بندی */}
      <CategoryTileGrid tiles={tiles} loading={discoverLoading} wide={wide} />

      {teachersError && teachers.length === 0 ? (
        <Card elevated style={{ display: "grid", gap: spacing.md, textAlign: "center" }}>
          <IconBadge icon="users" tone="olive" size={52} />
          <strong style={{ ...typography.title, color: colors.ink }}>{L("دریافت استادان ناموفق بود")}</strong>
          <span style={{ ...typography.caption, color: colors.inkMuted }}>{L(teachersError)}</span>
          <Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>
            {L("تلاش دوباره")}
          </Button>
        </Card>
      ) : null}

      {/* ۱.۱ — بخش ④ «پیشنهاد وُدّا»: کروسل یکپارچهٔ برترین + پیشنهادی */}
      <VoddaPicksCarousel
        teachers={voddaPicks}
        loading={teachersLoading || recommended === null}
        wide={wide}
        config={config}
      />

      {/* ۱.ب.۲ — بخش ۵ خدمات پرکاربرد */}
      <PopularServicesGrid services={popular} loading={discoverLoading} wide={wide} config={config} />

      {/* ۱.۱ — بخش ۶ خدمات رایگان — کارت نمایشی بزرگ ثابت */}
      <FreeServicesShowcase cards={freeCards} loading={teachersLoading} runtime={runtime} config={config} wide={wide} />

      {/* ۱.۱ — بخش ۸ footer: نوار پایین اپ (MobileAppShell) */}

      {/* ۱.ب.۱ — sheet انتخاب شهر (موقعیت من / جستجو / ۱۲ پرتردد / همهٔ شهرها) */}
      <CityPickerSheet
        open={citySheetOpen}
        onClose={() => setCitySheetOpen(false)}
        selectedCity={city}
        platformCities={platformCities}
        onSelect={(selected) => applyCity(selected, "saved")}
        onUseLocation={() => void useMyLocation()}
        detecting={cityDetecting}
        detectNote={cityDetectNote}
      />

      <RoleModeSheet
        open={roleSheetOpen}
        mode="learner"
        config={config}
        user={user}
        onClose={() => setRoleSheetOpen(false)}
      />

      {/* E1 — نمایشگر تمام‌صفحهٔ استوری + فرم انتشار مدیر */}
      {storyViewerIndex !== null && stories.length > 0 ? (
        <StoryViewer
          stories={stories}
          startIndex={storyViewerIndex}
          runtime={runtime}
          isAdmin={user?.role === "admin"}
          onClose={() => {
            setStoryViewerIndex(null);
            setStorySeenKey((value) => value + 1);
          }}
          onSeen={(id) => markStorySeen(id)}
          onDeleted={(id) => {
            setStories((rows) => rows.filter((story) => story.id !== id));
            setStoryViewerIndex(null);
            setStorySeenKey((value) => value + 1);
          }}
        />
      ) : null}

      <StoryComposer
        open={storyComposerOpen}
        runtime={runtime}
        onClose={() => setStoryComposerOpen(false)}
        onPublished={() => {
          setStoryComposerOpen(false);
          setStorySeenKey((value) => value + 1);
          void loadStories();
        }}
      />
    </div>
  );
}
