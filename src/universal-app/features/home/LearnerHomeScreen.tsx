"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
import { verseOfDay } from "@/lib/verses";
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
import { TeacherCard } from "../teachers/TeacherCard";
import { TopTeacherShowcase } from "./TopTeacherShowcase";
import { TierBadge } from "../teachers/TierBadge";
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

function walletShort(wallet: number) {
  if (wallet >= 1_000_000) return `${faNumber(wallet / 1_000_000)} میلیون`;
  return `${faNumber(Math.round(wallet / 1000), 0)} هزار`;
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

/* ۱.ب.۲ — بخش ② آیهٔ روز (متن مشترک با وب — src/lib/verses.ts) */
function VerseStrip() {
  const quote = verseOfDay();
  const isQuran = quote.source.startsWith("قرآن");
  return (
    <div
      className="vodda-enter"
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.sm,
        padding: "10px 14px",
        borderRadius: radii.lg,
        background: colors.olive50,
        border: `1px solid ${colors.olive100}`,
      }}
    >
      <Icon name="quran" size={18} style={{ color: colors.olive700, flex: "0 0 auto" }} />
      <p style={{ margin: 0, minWidth: 0, flex: 1, fontSize: 12.5, lineHeight: 1.9, color: colors.ink, fontWeight: 600 }}>
        {isQuran ? "﴿" : "«"} {quote.text} {isQuran ? "﴾" : "»"}
        <span style={{ color: colors.olive700, fontWeight: 800, fontSize: 11 }}> — {quote.source}</span>
      </p>
    </div>
  );
}

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

/* ۱.ب.۲ — بخش ④ اساتید برتر — سطر اول درجهٔ ۱ (هم‌شهری فقط اولویت) */
function TopTeachersSection({
  teachers,
  loading,
  wide,
  config,
}: {
  teachers: Teacher[];
  loading: boolean;
  wide: boolean;
  config: UniversalAppConfig;
}) {
  if (loading) {
    return (
      <section aria-label="در حال بارگذاری اساتید برتر" style={{ display: "grid", gap: 12 }}>
        <Skeleton style={{ width: 130, height: 18 }} />
        {/* ۰.۹.۰ — ردیف افقی؛ کارت‌های مربعی نمایشی */}
        <div style={{ display: "flex", gap: 10, overflow: "hidden" }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} style={{ width: wide ? 226 : 200, minHeight: 340, borderRadius: 20, flex: "0 0 auto" }} />
          ))}
        </div>
      </section>
    );
  }
  if (teachers.length === 0) return null;

  return (
    <section aria-label="اساتید برتر" style={{ display: "grid", gap: spacing.sm, minWidth: 0 }}>
      <SectionHeader title="اساتید برتر" action="مشاهدهٔ همه" onAction={() => navigateApp("/search", config)} />
      {/* ۰.۹.۰ — قاب هم‌خانوادهٔ نئونی دور ردیف اساتید برتر؛ کارت‌های مربعی ۱:۱ به چپ اسکرول می‌شوند */}
      <div
        style={{
          borderRadius: 22,
          border: `1.2px solid ${colors.goldSoft}`,
          background: `linear-gradient(180deg, ${colors.surface}, ${colors.surfaceWarm})`,
          padding: 12,
          boxShadow: "0 6px 20px rgba(46,54,34,.06), 0 0 12px rgba(191,149,64,.10)",
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 10,
            overflowX: "auto",
            overflowY: "hidden",
            minWidth: 0,
            paddingBottom: 6,
          }}
        >
          {teachers.slice(0, 8).map((teacher, index) => (
            <div key={teacher.id} className="vodda-enter" style={{ width: wide ? 226 : 200, flex: "0 0 auto", minWidth: 0, animationDelay: `${index * 40}ms` }}>
              <TopTeacherShowcase teacher={teacher} config={config} wide={wide} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ۱.ب.۶ — خدمات پرکاربرد — کارت کوچک ۸۰/۹۰px، تصویر ≤۳۲px، کلیک = فقط اساتید همان خدمت */
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
        {/* ۰.۷.۵ — ردیف افقی؛ کارت‌های هویت طلایی */}
        <div style={{ display: "flex", gap: 10, overflow: "hidden" }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} style={{ width: wide ? 252 : 226, height: wide ? 226 : 206, borderRadius: 20, flex: "0 0 auto" }} />
          ))}
        </div>
      </section>
    );
  }
  if (services.length === 0) return null;

  return (
    <section aria-label="خدمات پرکاربرد" style={{ display: "grid", gap: spacing.sm, minWidth: 0 }}>
      <SectionHeader title="خدمات پرکاربرد" />
      {/* ۰.۹.۱ — قاب هم‌خانوادهٔ نئونی دور ردیف خدمات پرکاربرد + کارت‌های هویت طلایی با چیپ رتبه */}
      <div
        style={{
          borderRadius: 22,
          border: `1.2px solid ${colors.goldSoft}`,
          background: `linear-gradient(180deg, ${colors.surface}, ${colors.surfaceWarm})`,
          padding: 12,
          boxShadow: "0 6px 20px rgba(46,54,34,.06), 0 0 12px rgba(191,149,64,.10)",
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 10,
            overflowX: "auto",
            overflowY: "hidden",
            minWidth: 0,
            paddingBottom: 8,
          }}
        >
        {services.map((service, index) => (
          <button
            key={service.id}
            type="button"
            onClick={() => navigateApp(`/service/${service.id}`, config)}
            className="vodda-tappable"
            aria-label={`${service.title} — ${faNumber(service.teacherCount, 0)} استاد`}
            style={{
              width: wide ? 252 : 226,
              flex: "0 0 auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: 0,
              padding: 0,
              textAlign: "start",
              border: "1.4px solid rgba(191,149,64,.6)",
              borderRadius: 20,
              background: `linear-gradient(180deg, #fffdf6 0%, ${colors.surface} 72%)`,
              boxShadow: "0 6px 18px rgba(139,104,31,.10), 0 0 12px rgba(191,149,64,.15)",
              cursor: "pointer",
              fontFamily: typography.fontFamily,
              minWidth: 0,
              overflow: "hidden",
              transition: "transform .16s ease, box-shadow .16s ease",
              animation: "vodda-enter .36s ease-out both",
              animationDelay: `${index * 50}ms`,
            }}
          >
            {/* بنر تصویر موضوعی + چیپ رتبهٔ پرکاربرد + چیپ شمارش استاد */}
            <span
              aria-hidden="true"
              style={{
                position: "relative",
                display: "block",
                height: wide ? 112 : 104,
                overflow: "hidden",
                background: "linear-gradient(140deg, #f2f5ea, #f7f0dc)",
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
                aria-hidden="true"
                style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(46,54,34,0) 42%, rgba(46,54,34,.3) 100%)" }}
              />
              {/* چیپ رتبهٔ پرکاربرد — دایرهٔ طلایی با شمارهٔ فارسی */}
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 8,
                  insetInlineStart: 8,
                  width: 24,
                  height: 24,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #bf9540, #d8b869)",
                  border: "1.5px solid rgba(255,253,246,.85)",
                  boxShadow: "0 2px 8px rgba(139,104,31,.3), 0 0 8px rgba(191,149,64,.35)",
                  color: "#fffdf6",
                  fontSize: 11.5,
                  fontWeight: 900,
                }}
              >
                {faNumber(index + 1, 0)}
              </span>
              <span
                style={{
                  position: "absolute",
                  bottom: 8,
                  insetInlineStart: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  maxWidth: "calc(100% - 16px)",
                  padding: "3.5px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(191,149,64,.4)",
                  background: "rgba(255,253,246,.93)",
                  color: colors.goldDark,
                  fontSize: 10.5,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <Icon name="users" size={12} />
                {faNumber(service.teacherCount, 0)} استاد
              </span>
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0, padding: "11px 12px 12px" }}>
              <strong
                style={{
                  display: "-webkit-box",
                  maxWidth: "100%",
                  overflow: "hidden",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  overflowWrap: "anywhere",
                  fontSize: 14,
                  fontWeight: 800,
                  lineHeight: 1.45,
                  color: colors.ink,
                }}
              >
                {service.title}
              </strong>
              <span
                style={{
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  padding: "7.5px 10px",
                  border: 0,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #bf9540, #d8b869)",
                  color: "#fffdf6",
                  fontSize: 12,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  boxShadow: "0 4px 12px rgba(191,149,64,.28)",
                }}
              >
                اساتید این خدمت
                <Icon name="chevronL" size={13} />
              </span>
            </span>
          </button>
          ))}
          </div>
        </div>
    </section>
  );
}

/* ۱.ب.۴ / ۰.۷.۲ — خدمات رایگان: همان قالب کارت خدمات (4/3، دوبرابر) + برچسب سبز «رایگان»
 * در ردیف اسکرول افقی به چپ — هیچ کارتی به سطر بعد نمی‌رود. کلیک → پروفایل استاد با فیلتر همان خدمت. */
function FreeServicesList({
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
        <div style={{ display: "flex", gap: 10, overflow: "hidden" }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} style={{ width: wide ? 238 : 214, height: wide ? 230 : 210, borderRadius: 20, flex: "0 0 auto" }} />
          ))}
        </div>
      </section>
    );
  }
  if (cards.length === 0) return null;

  return (
    <section aria-label="خدمات رایگان" style={{ display: "grid", gap: spacing.sm, minWidth: 0 }}>
      <SectionHeader title="خدمات رایگان" description="بدون هزینه — برای شروع مسیر قرآن" />
      {/* ۰.۷.۵ — هویت دوم کارت خدمت (زیتونی/نعنایی): بنر تصویر + برچسب «رایگان» + دکمهٔ پر رزرو — ردیف اسکرول به چپ */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 10,
          overflowX: "auto",
          overflowY: "hidden",
          minWidth: 0,
          paddingBottom: 8,
        }}
      >
        {cards.slice(0, 8).map((card, index) => (
          <button
            key={`${card.teacherId}-${card.id}`}
            type="button"
            onClick={() => navigateApp(`/teacher/${card.teacherId}?service=${card.id}`, config)}
            className="vodda-tappable"
            aria-label={`${card.title} رایگان با ${card.teacherName}`}
            style={{
              width: wide ? 238 : 214,
              flex: "0 0 auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: 0,
              padding: 0,
              textAlign: "start",
              border: "1.4px solid rgba(66,138,84,.5)",
              borderRadius: 20,
              background: `linear-gradient(170deg, ${colors.olive50} 0%, ${colors.surface} 74%)`,
              boxShadow: "0 8px 20px rgba(46,84,54,.12)",
              cursor: "pointer",
              fontFamily: typography.fontFamily,
              minWidth: 0,
              overflow: "hidden",
              animation: "vodda-enter .36s ease-out both",
              animationDelay: `${index * 50}ms`,
            }}
          >
            {/* بنر تصویر موضوعی با ته‌رنگ سبز + برچسب رایگان + مدت جلسه */}
            <span
              aria-hidden="true"
              style={{
                position: "relative",
                display: "block",
                height: wide ? 92 : 86,
                overflow: "hidden",
                background: colors.olive100,
              }}
            >
              <img
                src={serviceImageSrc(card.imageKey)}
                alt=""
                loading="lazy"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <span
                aria-hidden="true"
                style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(28,50,36,0) 42%, rgba(28,50,36,.32) 100%)" }}
              />
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  insetInlineStart: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "3.5px 10px",
                  borderRadius: 999,
                  background: colors.olive600,
                  color: "#fff",
                  fontSize: 10.5,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(46,84,54,.28)",
                }}
              >
                <Icon name="gift" size={11} />
                رایگان
              </span>
              <span
                style={{
                  position: "absolute",
                  bottom: 8,
                  insetInlineEnd: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,.92)",
                  border: `1px solid ${colors.olive100}`,
                  color: colors.olive700,
                  fontSize: 10,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                <Icon name="clock" size={11} />
                {card.duration > 0 ? `${faNumber(card.duration, 0)} دقیقه` : "جلسهٔ رایگان"}
              </span>
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0, padding: "11px 12px 12px" }}>
              <strong
                style={{
                  display: "-webkit-box",
                  maxWidth: "100%",
                  overflow: "hidden",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                  overflowWrap: "anywhere",
                  fontSize: 13.5,
                  fontWeight: 800,
                  lineHeight: 1.45,
                  color: colors.ink,
                }}
              >
                {card.title}
              </strong>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%", minWidth: 0 }}>
                <Avatar
                  name={card.teacherName}
                  src={avatarSrc(card.avatarUrl || undefined, undefined, uploadsOriginOf(runtime.apiBaseUrl))}
                  size={22}
                />
                <span
                  style={{
                    maxWidth: 110,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: colors.inkSecondary,
                  }}
                >
                  {card.teacherName}
                </span>
                {card.tier ? <TierBadge tier={card.tier} size={13} /> : null}
              </span>
              <span
                style={{
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  padding: "8.5px 10px",
                  borderRadius: 11,
                  background: colors.olive600,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  boxShadow: "0 4px 10px rgba(46,84,54,.22)",
                }}
              >
                رزرو جلسهٔ رایگان
                <Icon name="chevronL" size={13} />
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ۱.ب.۵ — اساتید پیشنهادی — ۷ کارت، ۲ ستون موبایل (۲×۳+۱) / ۴ ستون دسکتاپ */
function RecommendedGrid({
  teachers,
  loading,
  wide,
  config,
}: {
  teachers: Teacher[] | null;
  loading: boolean;
  wide: boolean;
  config: UniversalAppConfig;
}) {
  if (loading) {
    return (
      <section aria-label="در حال بارگذاری پیشنهادها" style={{ display: "grid", gap: 12 }}>
        <Skeleton style={{ width: 160, height: 18 }} />
        {/* ۰.۷.۲ — ردیف افقی */}
        <div style={{ display: "flex", gap: 10, overflow: "hidden" }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} style={{ width: 165, minHeight: 200, borderRadius: 12, flex: "0 0 auto" }} />
          ))}
        </div>
      </section>
    );
  }
  if (!teachers || teachers.length === 0) return null;

  return (
    <section aria-label="اساتید پیشنهادی" style={{ display: "grid", gap: spacing.sm, minWidth: 0 }}>
      <SectionHeader title="اساتید پیشنهادی" description="چیدمان وزنی بر پایهٔ rank استاد — تازه با هر بازدید" />
      {/* ۰.۷.۵ — کادر افقی کم‌رنگ و جذاب دور ردیف اساتید؛ اسکرول به چپ داخل خود کادر */}
      <div
        style={{
          borderRadius: 22,
          border: `1.2px solid ${colors.sand150}`,
          background: `linear-gradient(180deg, ${colors.surface}, ${colors.surfaceWarm})`,
          padding: 12,
          boxShadow: "0 6px 20px rgba(46,54,34,.06)",
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 10,
            overflowX: "auto",
            overflowY: "hidden",
            minWidth: 0,
            paddingBottom: 6,
          }}
        >
          {teachers.map((teacher, index) => (
            <div key={teacher.id} className="vodda-enter" style={{ width: 165, flex: "0 0 auto", minWidth: 0, animationDelay: `${index * 40}ms` }}>
              <TeacherCard teacher={teacher} config={config} />
            </div>
          ))}
        </div>
      </div>
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
  const { L } = useAppearance();
  const wide = useMinWidth(768);
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
  const freeCards = useMemo(() => freeServiceCards(teachers, new Map(), 6), [teachers]);
  const topTeachers = useMemo(() => withCityPriority(teachers).slice(0, 6), [teachers, withCityPriority]);

  const firstName = user?.name?.trim().split(/\s+/)[0] || "دوست";
  const today = todayLabel();
  const discoverLoading = teachersLoading || (catalogGroups.length === 0 && teachers.length === 0);

  if (teachersLoading && teachers.length === 0 && !teachersError) {
    return <HomeSkeleton wide={wide} />;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", minWidth: 0, gap: wide ? 32 : 24 }}>
      {/* ۱.ب.۲ — بخش ① header: chip شهر + اعلان + آواتار */}
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
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing.md,
          }}
        >
          <button
            type="button"
            onClick={() => { if (user) setRoleSheetOpen(true); }}
            aria-label="تغییر حساب"
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
              cursor: user ? "pointer" : "default",
            }}
          >
            <span style={{ position: "relative", display: "inline-flex" }}>
              <Avatar
                name={user?.name}
                src={avatarSrc(user?.avatar_url, user?.updated_at, uploadsOriginOf(runtime.apiBaseUrl))}
                size={48}
                ring
              />
              {user ? (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    insetInlineStart: -4,
                    bottom: -2,
                    width: 18,
                    height: 18,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    border: `2px solid ${colors.sand50}`,
                    color: colors.goldDark,
                    background: colors.goldBackground,
                  }}
                >
                  <Icon name="refresh" size={9} stroke={2.4} />
                </span>
              ) : null}
            </span>
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
                {firstName} جان 🌿
              </strong>
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
              <span style={{ fontSize: 9.5, fontWeight: 700, lineHeight: 1, whiteSpace: "nowrap" }}>
                {user && user.wallet > 0 ? walletShort(user.wallet) : "کیف پول"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ۱.ب.۲ — بخش ② آیهٔ روز */}
      <VerseStrip />

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

      {/* ۱.ب.۲ — بخش ④ اساتید برتر (سطر اول درجهٔ ۱) */}
      <TopTeachersSection teachers={topTeachers} loading={teachersLoading} wide={wide} config={config} />

      {/* ۱.ب.۲ — بخش ۵ خدمات پرکاربرد */}
      <PopularServicesGrid services={popular} loading={discoverLoading} wide={wide} config={config} />

      {/* ۱.ب.۲ — بخش ۶ خدمات رایگان */}
      <FreeServicesList cards={freeCards} loading={teachersLoading} runtime={runtime} config={config} wide={wide} />

      {/* ۱.ب.۲ — بخش ۷ اساتید پیشنهادی (۷ کارت، انتخاب وزنی) */}
      <RecommendedGrid teachers={recommended} loading={recommended === null} wide={wide} config={config} />

      {/* ۱.ب.۲ — بخش ۸ footer: نوار پایین اپ (MobileAppShell) */}

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
    </div>
  );
}
