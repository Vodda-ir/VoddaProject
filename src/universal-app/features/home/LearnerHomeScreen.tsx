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
  SectionHeader,
  Sheet,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { useMinWidth } from "../../ui/useMediaQuery";
import { messageOf } from "../../ui/errorMessage";
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
            <Skeleton key={index} style={{ height: 176, borderRadius: 24 }} />
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

/* ۱.ب.۳ — خانه‌های شش‌گانهٔ دسته‌بندی — گرادیان زیتونی-طلایی، تصویر ≤۴۸px،
 * حاشیهٔ نئون ۲px، ارتفاع ۱۰۰/۱۲۰px، fade-in پله‌ای ۵۰ms، کلیک = فقط زیردسته‌های همان دسته */
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
          <Skeleton key={index} style={{ height: 100, borderRadius: 20 }} />
        ))}
      </div>
    );
  }
  if (tiles.length === 0) return null;

  const tileBackground: CSSProperties = {
    backgroundImage:
      "linear-gradient(140deg, #f2f5ea 0%, #f7f3e3 58%, #f3e8cb 100%), linear-gradient(135deg, rgba(147,161,114,.85), rgba(191,149,64,.85))",
    backgroundOrigin: "padding-box, border-box",
    backgroundClip: "padding-box, border-box",
  };

  return (
    <section aria-label="دسته‌های قرآنی" style={{ display: "grid", gap: spacing.sm }}>
      <SectionHeader title="دسته‌های قرآنی" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: wide ? "repeat(3, minmax(0,1fr))" : "repeat(2, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {tiles.map((tile, index) => (
          <button
            key={tile.name}
            type="button"
            onClick={() => navigateApp(`/category?name=${encodeURIComponent(tile.name)}`)}
            className="vodda-tappable"
            aria-label={`${tile.name} — ${faNumber(tile.count, 0)} استاد فعال`}
            style={{
              minHeight: wide ? 120 : 100,
              display: "grid",
              justifyItems: "center",
              alignContent: "center",
              gap: 5,
              padding: "10px 8px",
              textAlign: "center",
              border: "2px solid transparent",
              borderRadius: 20,
              boxShadow: "0 3px 14px rgba(46,54,34,.07)",
              cursor: "pointer",
              fontFamily: typography.fontFamily,
              transition: "transform .18s ease, box-shadow .18s ease",
              ...tileBackground,
              animation: "vodda-enter .36s ease-out both",
              animationDelay: `${index * 50}ms`,
            }}
          >
            {/* تصویر خیالی ≤۴۸px — خطای بارگذاری → آیکون قرآن زیر آن پیدا می‌شود */}
            <span
              aria-hidden="true"
              style={{
                position: "relative",
                width: 48,
                height: 48,
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="quran" size={26} style={{ color: colors.olive600 }} />
              <img
                src={serviceImageSrc(tile.imageKey)}
                alt=""
                width={48}
                height={48}
                loading="lazy"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: 48,
                  height: 48,
                  maxWidth: 48,
                  maxHeight: 48,
                  objectFit: "contain",
                }}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </span>
            <strong
              style={{
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: wide ? 17 : 16,
                fontWeight: 700,
                color: colors.ink,
              }}
            >
              {tile.name}
            </strong>
            <span style={{ fontSize: 11, fontWeight: 700, color: colors.olive600 }}>
              {faNumber(tile.count, 0)} استاد فعال
            </span>
          </button>
        ))}
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
        <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(3, minmax(0,1fr))" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} style={{ height: 176, borderRadius: 24 }} />
          ))}
        </div>
      </section>
    );
  }
  if (teachers.length === 0) return null;

  return (
    <section aria-label="اساتید برتر" style={{ display: "grid", gap: spacing.sm, minWidth: 0 }}>
      <SectionHeader title="اساتید برتر" action="مشاهدهٔ همه" onAction={() => navigateApp("/search", config)} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: wide ? "repeat(3, minmax(0,1fr))" : "repeat(2, minmax(0, 1fr))",
          gap: 10,
          minWidth: 0,
        }}
      >
        {teachers.slice(0, 6).map((teacher, index) => (
          <div key={teacher.id} className="vodda-enter" style={{ minWidth: 0, animationDelay: `${index * 40}ms` }}>
            <TeacherCard teacher={teacher} config={config} wide />
          </div>
        ))}
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
        <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(4, minmax(0,1fr))" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} style={{ height: 80, borderRadius: 18 }} />
          ))}
        </div>
      </section>
    );
  }
  if (services.length === 0) return null;

  return (
    <section aria-label="خدمات پرکاربرد" style={{ display: "grid", gap: spacing.sm, minWidth: 0 }}>
      <SectionHeader title="خدمات پرکاربرد" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: wide ? "repeat(4, minmax(0,1fr))" : "repeat(2, minmax(0, 1fr))",
          gap: 10,
          minWidth: 0,
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
              height: wide ? 90 : 80,
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "10px 12px",
              textAlign: "right",
              border: "1.5px solid rgba(147,161,114,.42)",
              borderRadius: 18,
              background: colors.surface,
              boxShadow: "0 2px 10px rgba(46,54,34,.05)",
              cursor: "pointer",
              fontFamily: typography.fontFamily,
              minWidth: 0,
              transition: "transform .16s ease, box-shadow .16s ease",
              animation: "vodda-enter .36s ease-out both",
              animationDelay: `${index * 50}ms`,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "relative",
                width: 34,
                height: 34,
                flex: "0 0 34px",
                display: "grid",
                placeItems: "center",
                borderRadius: 12,
                background: "linear-gradient(140deg, #f2f5ea, #f7f0dc)",
              }}
            >
              <Icon name="book" size={17} style={{ color: colors.olive600 }} />
              <img
                src={serviceImageSrc(service.imageKey)}
                alt=""
                width={32}
                height={32}
                loading="lazy"
                style={{
                  position: "absolute",
                  inset: 0,
                  margin: "auto",
                  width: 32,
                  height: 32,
                  maxWidth: 32,
                  maxHeight: 32,
                  objectFit: "contain",
                }}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <strong
                style={{
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: wide ? 15 : 14,
                  fontWeight: 700,
                  color: colors.ink,
                }}
              >
                {service.title}
              </strong>
              <span style={{ display: "block", marginTop: 2, fontSize: 12, fontWeight: 600, color: colors.inkMuted }}>
                {faNumber(service.teacherCount, 0)} استاد
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ۱.ب.۴ — خدمات رایگان — کارت افقی: عنوان، استاد + آواتار مربعی + تیک، مدت، نشان سبز «رایگان».
 * بدون خدمت رایگان کل بخش پنهان می‌شود. کلیک → پروفایل استاد با فیلتر همان خدمت. */
function FreeServicesList({
  cards,
  loading,
  runtime,
  config,
}: {
  cards: FreeServiceCard[];
  loading: boolean;
  runtime: ReturnType<typeof usePlatform>;
  config: UniversalAppConfig;
}) {
  if (loading) {
    return (
      <section aria-label="در حال بارگذاری خدمات رایگان" style={{ display: "grid", gap: 12 }}>
        <Skeleton style={{ width: 140, height: 18 }} />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} style={{ height: 64, borderRadius: 18 }} />
        ))}
      </section>
    );
  }
  if (cards.length === 0) return null;

  return (
    <section aria-label="خدمات رایگان" style={{ display: "grid", gap: spacing.sm, minWidth: 0 }}>
      <SectionHeader title="خدمات رایگان" description="بدون هزینه — برای شروع مسیر قرآن" />
      <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
        {cards.slice(0, 6).map((card, index) => (
          <button
            key={`${card.teacherId}-${card.id}`}
            type="button"
            onClick={() => navigateApp(`/teacher/${card.teacherId}?service=${card.id}`, config)}
            className="vodda-tappable"
            aria-label={`${card.title} رایگان با ${card.teacherName}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              width: "100%",
              padding: "12px 15px",
              textAlign: "right",
              border: `1px solid ${colors.sand150}`,
              borderRadius: 18,
              background: colors.surface,
              boxShadow: shadows.xs,
              cursor: "pointer",
              fontFamily: typography.fontFamily,
              minWidth: 0,
              animation: "vodda-enter .36s ease-out both",
              animationDelay: `${index * 50}ms`,
            }}
          >
            <span style={{ minWidth: 0, display: "grid", gap: 6 }}>
              <strong
                style={{
                  display: "block",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 14.5,
                  fontWeight: 800,
                  color: colors.ink,
                }}
              >
                {card.title}
              </strong>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <Avatar
                  name={card.teacherName}
                  src={avatarSrc(card.avatarUrl || undefined, undefined, uploadsOriginOf(runtime.apiBaseUrl))}
                  size={26}
                />
                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: colors.inkSecondary,
                  }}
                >
                  {card.teacherName}
                </span>
                {card.tier ? <TierBadge tier={card.tier} size={13} /> : null}
              </span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 9, flex: "0 0 auto" }}>
              {card.duration > 0 ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: colors.inkMuted, whiteSpace: "nowrap" }}>
                  <Icon name="clock" size={13} />
                  {faNumber(card.duration, 0)} دقیقه
                </span>
              ) : null}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 11px",
                  borderRadius: 999,
                  background: "rgba(66,138,84,.12)",
                  border: "1px solid rgba(66,138,84,.4)",
                  color: "#2e7d43",
                  fontSize: 11.5,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                رایگان
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
        <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(4, minmax(0,1fr))" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} style={{ height: 176, borderRadius: 24 }} />
          ))}
        </div>
      </section>
    );
  }
  if (!teachers || teachers.length === 0) return null;

  return (
    <section aria-label="اساتید پیشنهادی" style={{ display: "grid", gap: spacing.sm, minWidth: 0 }}>
      <SectionHeader title="اساتید پیشنهادی" description="چیدمان وزنی بر پایهٔ rank استاد — تازه با هر بازدید" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: wide ? "repeat(4, minmax(0,1fr))" : "repeat(2, minmax(0, 1fr))",
          gap: 10,
          minWidth: 0,
        }}
      >
        {teachers.map((teacher, index) => (
          <div key={teacher.id} className="vodda-enter" style={{ minWidth: 0, animationDelay: `${index * 40}ms` }}>
            <TeacherCard teacher={teacher} config={config} wide />
          </div>
        ))}
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
          <strong style={{ ...typography.title, color: colors.ink }}>دریافت استادان ناموفق بود</strong>
          <span style={{ ...typography.caption, color: colors.inkMuted }}>{teachersError}</span>
          <Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>
            تلاش دوباره
          </Button>
        </Card>
      ) : null}

      {/* ۱.ب.۲ — بخش ④ اساتید برتر (سطر اول درجهٔ ۱) */}
      <TopTeachersSection teachers={topTeachers} loading={teachersLoading} wide={wide} config={config} />

      {/* ۱.ب.۲ — بخش ۵ خدمات پرکاربرد */}
      <PopularServicesGrid services={popular} loading={discoverLoading} wide={wide} config={config} />

      {/* ۱.ب.۲ — بخش ۶ خدمات رایگان */}
      <FreeServicesList cards={freeCards} loading={teachersLoading} runtime={runtime} config={config} />

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
