"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { Avatar, Button, Card, EmptyState, Icon, colors, spacing, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { useMinWidth } from "../../ui/useMediaQuery";
import { messageOf } from "../../ui/errorMessage";
import { formatNumber } from "@/lib/datetime";
import { avatarSrc, uploadsOriginOf } from "@/lib/avatarImage";
import { freeServiceCards, type FreeServiceCard } from "@/lib/home/discover";
import { searchTeachers } from "../teachers/api";
import { TierBadge } from "../teachers/TierBadge";
import type { Teacher } from "../teachers/types";

export type FreeServicesScreenProps = {
  config: UniversalAppConfig;
};

function faNumber(value: number, maximumFractionDigits = 1) {
  return formatNumber(value, "fa", { maximumFractionDigits });
}

/* استادهای مداحی فعلاً از تمام سطوح کاربری پنهان می‌شوند (پلتفرم تخصصاً قرآنی). */
const MADDAHI_PATTERN = /مداح|هم‌نوا|همنوا/;

function isMaddahiTeacher(teacher: Teacher) {
  return MADDAHI_PATTERN.test(teacher.field) || MADDAHI_PATTERN.test(teacher.tag);
}

function BigSkeleton({ style }: { style?: CSSProperties }) {
  return <span aria-hidden="true" className="vodda-skeleton" style={{ display: "block", ...style }} />;
}

/* ═══ ۱.۲ — صفحهٔ «خدمات رایگان» — فهرست کامل با کارت‌های بزرگ‌تر ═══
 * از کارت نمایشی صفحهٔ نخست باز می‌شود؛ همان هویت بصری کارت افقی رایگان اما
 * با ابعاد بزرگ‌تر (آواتار ۶۴، تایپوگرافی درشت‌تر، دکمهٔ «رزرو جلسه» بزرگ‌تر). */
export function FreeServicesScreen({ config }: FreeServicesScreenProps) {
  const runtime = usePlatform();
  const { L } = useAppearance();
  const wide = useMinWidth(768);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    searchTeachers(runtime, { limit: 100 })
      .then((items) => {
        if (!active) return;
        setTeachers(items.filter((teacher) => !isMaddahiTeacher(teacher)));
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setTeachers([]);
        setError(messageOf(cause, "دریافت استادان ناموفق بود."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [runtime, reloadKey]);

  const cards = useMemo(() => freeServiceCards(teachers, new Map(), 0), [teachers]);

  /* E3 — فیلتر «نوع خدمت» از کاشی‌های مربعی صفحهٔ نخست (?type=…) */
  const [typeFilter, setTypeFilter] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = new URLSearchParams(window.location.search).get("type");
    return raw && raw.trim() ? raw.trim() : null;
  });
  const visibleCards = useMemo(
    () => (typeFilter ? cards.filter((card) => card.title === typeFilter) : cards),
    [cards, typeFilter],
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: wide ? 18 : 14, minWidth: 0 }}>
      {/* نوار معرفی — دو بج کوچک خلاصهٔ ارزش */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, minWidth: 0 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid rgba(58,167,109,.35)",
            background: "#e7f6ee",
            color: "#2e8f5c",
            fontSize: 11,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="gift" size={13} />
          {L("جلسهٔ آغازین بدون هزینه")}
        </span>
        {!loading ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 12px",
              borderRadius: 999,
              border: `1px solid ${colors.goldSoft}`,
              background: "rgba(191,149,64,.10)",
              color: colors.goldDark,
              fontSize: 11,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            <Icon name="users" size={13} />
            {faNumber(visibleCards.length, 0)} {L("خدمت رایگان")}
          </span>
        ) : null}
      </div>

      {/* E3 — چیپ فیلتر نوع خدمت + حذف فیلتر */}
      {typeFilter ? (
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, minWidth: 0 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              borderRadius: 999,
              border: "1px solid rgba(58,167,109,.4)",
              background: "#e7f6ee",
              color: "#2e8f5c",
              fontSize: 11.5,
              fontWeight: 800,
              maxWidth: "100%",
            }}
          >
            <Icon name="filter" size={13} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {L("نوع خدمت:")} {typeFilter}
            </span>
            <button
              type="button"
              onClick={() => setTypeFilter(null)}
              aria-label={L("حذف فیلتر نوع خدمت")}
              className="vodda-tappable"
              style={{ display: "grid", placeItems: "center", padding: 0, border: 0, background: "transparent", color: "#2e8f5c", cursor: "pointer" }}
            >
              <Icon name="x" size={13} />
            </button>
          </span>
        </div>
      ) : null}

      {loading ? (
        <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <BigSkeleton key={index} style={{ height: 96, borderRadius: 20 }} />
          ))}
        </div>
      ) : error && cards.length === 0 ? (
        <Card elevated style={{ display: "grid", gap: spacing.md, textAlign: "center" }}>
          <strong style={{ ...typography.title, color: colors.ink }}>{L("دریافت خدمات رایگان ناموفق بود")}</strong>
          <span style={{ ...typography.caption, color: colors.inkMuted }}>{error}</span>
          <Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>
            {L("تلاش دوباره")}
          </Button>
        </Card>
      ) : cards.length === 0 ? (
        <EmptyState
          icon={<Icon name="gift" size={30} />}
          title={L("فعلاً خدمت رایگانی ثبت نشده")}
          description={L("به‌زودی استادها جلسهٔ آغازین رایگانشان را اینجا نمایش می‌دهند.")}
        />
      ) : visibleCards.length === 0 ? (
        <EmptyState
          icon={<Icon name="filter" size={30} />}
          title={L("برای این نوع خدمت فعلاً پیشنهادی نیست")}
          description={L("فیلتر را حذف کنید یا نوع دیگری را انتخاب کنید.")}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12, minWidth: 0 }}>
          {visibleCards.map((card, index) => (
            <FreeServiceBigCard
              key={`${card.teacherId}-${card.id}`}
              card={card}
              index={index}
              runtime={runtime}
              config={config}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* کارت افقی بزرگ‌شدهٔ خدمات رایگان — همان طرح صفحهٔ نخست با ابعاد درشت‌تر */
function FreeServiceBigCard({
  card,
  index,
  runtime,
  config,
}: {
  card: FreeServiceCard;
  index: number;
  runtime: ReturnType<typeof usePlatform>;
  config: UniversalAppConfig;
}) {
  const { L } = useAppearance();
  return (
    <button
      type="button"
      onClick={() => navigateApp(`/teacher/${card.teacherId}?service=${card.id}`, config)}
      className="vodda-tappable"
      aria-label={`${card.title} رایگان با ${card.teacherName}`}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "14px 16px",
        minWidth: 0,
        width: "100%",
        textAlign: "start",
        border: "1px solid rgba(46,54,34,.07)",
        borderRadius: 20,
        background: colors.surface,
        boxShadow: "0 12px 26px rgba(46,54,34,.09)",
        cursor: "pointer",
        fontFamily: typography.fontFamily,
        overflow: "hidden",
        animation: "vodda-enter .36s ease-out both",
        animationDelay: `${Math.min(index, 8) * 45}ms`,
      }}
    >
      {/* روبان «رایگان» گوشهٔ کارت — کمی بزرگ‌تر */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 15,
          insetInlineEnd: -28,
          width: 104,
          transform: "rotate(-45deg)",
          textAlign: "center",
          padding: "3px 0",
          background: "linear-gradient(135deg, #43b07f, #2e8f5c)",
          color: "#ffffff",
          fontSize: 9.5,
          fontWeight: 900,
          letterSpacing: 0.2,
          boxShadow: "0 2px 6px rgba(46,84,54,.25)",
        }}
      >
        {L("رایگان")}
      </span>
      {/* عکس گرد بزرگ استاد + مهر درجه */}
      <span style={{ position: "relative", flex: "0 0 auto", display: "inline-flex" }}>
        <Avatar
          name={card.teacherName}
          src={avatarSrc(card.avatarUrl || undefined, undefined, uploadsOriginOf(runtime.apiBaseUrl))}
          size={64}
          ring
        />
        {card.tier ? (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              bottom: -3,
              insetInlineStart: -5,
              display: "inline-flex",
              padding: 1,
              borderRadius: "50%",
              background: colors.surface,
            }}
          >
            <TierBadge tier={card.tier} size={18} />
          </span>
        ) : null}
      </span>
      {/* عنوان خدمت + نام استاد + بج‌ها */}
      <span style={{ flex: "1 1 auto", minWidth: 0, display: "grid", gap: 5 }}>
        <strong
          style={{
            fontSize: 15,
            fontWeight: 800,
            lineHeight: 1.5,
            color: colors.ink,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {card.title}
        </strong>
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: colors.inkMuted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {card.teacherName}
          {card.teacherCity ? ` · ${card.teacherCity}` : ""}
        </span>
        <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5 }}>
          {card.duration > 0 ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                padding: "3px 9px",
                borderRadius: 999,
                border: `1px solid ${colors.sand150}`,
                background: colors.surfaceSoft,
                color: colors.inkSecondary,
                fontSize: 10.5,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              <Icon name="clock" size={11} />
              {faNumber(card.duration, 0)} {L("دقیقه")}
            </span>
          ) : null}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "3px 9px",
              borderRadius: 999,
              border: "1px solid rgba(58,167,109,.35)",
              background: "#e7f6ee",
              color: "#2e8f5c",
              fontSize: 10.5,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            <Icon name="gift" size={11} />
            {L("رایگان")}
          </span>
        </span>
      </span>
      {/* دکمهٔ توپر سبز نعنایی «رزرو جلسه» — بزرگ‌تر */}
      <span
        style={{
          flex: "0 0 auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "11px 14px",
          borderRadius: 13,
          background: "linear-gradient(145deg, #43b07f, #2e8f5c)",
          color: "#ffffff",
          fontSize: 12.5,
          fontWeight: 800,
          whiteSpace: "nowrap",
          boxShadow: "0 6px 14px rgba(58,167,109,.30)",
        }}
      >
        {L("رزرو جلسه")}
        <Icon name="chevronL" size={13} />
      </span>
    </button>
  );
}
