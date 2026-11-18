"use client";

import type { CSSProperties, MouseEvent } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { resolveAssetUrl } from "../../platform/asset";
import { Button, Icon, colors, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { useMinWidth } from "../../ui/useMediaQuery";
import { localizeCityName } from "../../i18n/transliterate";
import { TierBadge } from "./TierBadge";
import type { Teacher } from "./types";

/* ردیف نشان‌های کارت درجه ۱ (۱.الف.۵) — 🟦 تیک بین‌المللی، 🆓 خدمات رایگان، ⚡ جلسات فوری */
const TIER1_BADGE_ITEMS: Record<string, { emoji: string; label: string }> = {
  international: { emoji: "🟦", label: "تیک بین‌المللی" },
  free: { emoji: "🆓", label: "خدمات رایگان" },
  instant: { emoji: "⚡", label: "جلسات فوری" },
};

function initialsOf(name: string, lang: "fa" | "en") {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? (lang === "en" ? "V" : "ا");
  const second = parts[1]?.charAt(0) ?? "";
  return second ? `${first} ${second}` : first;
}

/* ═══ ۰.۷.۱ — کارت استاد مربعی استاندارد — همه هم‌اندازه ═══
   ساختار اسلات‌ثابت (آواتار → نام ۲خطی → تخصص ۱خط → ردیف نشان‌ها → متا → قیمت+CTA)
   → ارتفاع همهٔ کارت‌ها در یک گرید دقیقاً برابر است؛ محتوای بلند با clamp بریده می‌شود.
   استاد درجه ۱: همان اندازه، فقط ظاهر ویژه (نئون و گرادیان طلایی + نشان 🏆).
   سلول ≥480px → مربع کامل ۱:۱ / موبایل → نزدیک مربع ۴:۵ (هم‌پاری وب).
   استایل‌ها کامل درون‌خطی‌اند تا در بیلد Capacitor (بدون globals.css) هم دقیقاً همین شکل دیده شود. */
export function TeacherCard({ teacher, config }: { teacher: Teacher; config: UniversalAppConfig }) {
  const { L, lang, N } = useAppearance();
  const localName = N(teacher.name);
  const wideCell = useMinWidth(480);
  /* ۱.الف.۵ — کارت درجه ۱ و ردیف نشان‌ها (🟦 تیک بین‌المللی / 🆓 خدمات رایگان / ⚡ جلسات فوری) */
  const tier1 = teacher.isTier1 === true;
  const tier1Badges = (teacher.tier1Badges ?? [])
    .map((key) => TIER1_BADGE_ITEMS[key])
    .filter((item): item is { emoji: string; label: string } => Boolean(item));
  const goToTeacher = () => navigateApp(`/teacher/${teacher.id}`, config);
  const priceFrom = new Intl.NumberFormat(lang === "en" ? "en-US" : "fa-IR", { maximumFractionDigits: 0 }).format(
    Math.max(0, teacher.price30 / 1000),
  );
  const ratingText = teacher.rating.toLocaleString(lang === "en" ? "en-US" : "fa-IR", { maximumFractionDigits: 1 });
  const sessionsText = teacher.sessions.toLocaleString(lang === "en" ? "en-US" : "fa-IR");
  const avatarSize = wideCell ? 48 : 40;
  const badgeFont = wideCell ? 10 : 9;

  /* کلیک روی بدنهٔ کارت فقط برای اشاره‌گر است؛ دکمه‌های درون کارت اهداف مستقل خودشان را دارند. */
  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) return;
    goToTeacher();
  }

  return (
    <div
      className={`vodda-card vodda-card--interactive vodda-card-neon${tier1 ? " vodda-card-tier1" : ""}`}
      onClick={handleCardClick}
      style={{
        width: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: wideCell ? 6 : 4,
        padding: wideCell ? "14px 13px 12px" : "10px 9px 9px",
        aspectRatio: wideCell ? "1 / 1" : "4 / 5",
        overflow: "hidden",
        textAlign: "center",
        color: colors.ink,
        background: tier1
          ? "linear-gradient(140deg, #f2f5ea 0%, #f7efd9 55%, #f3e6c8 100%)"
          : colors.surface,
        border: `1.5px solid ${tier1 ? "rgba(191,149,64,.78)" : "rgba(140,134,117,.5)"}`,
        borderRadius: 16,
        boxShadow: "0 6px 22px rgba(46,54,34,.07)",
        cursor: "pointer",
        fontFamily: typography.fontFamily,
      } as CSSProperties}
    >
      {/* اسلات آواتار — اندازهٔ ثابت */}
      <div style={{ position: "relative", flex: "0 0 auto", width: avatarSize, height: avatarSize }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: Math.round(avatarSize * 0.3),
            overflow: "hidden",
            border: `2.5px solid ${teacher.available ? colors.olive600 : colors.danger}`,
            background: `linear-gradient(150deg, ${colors.olive100}, ${colors.olive50})`,
            /* هالهٔ طلایی ظریف دور چهرهٔ استادِ آماده — حس «حلقهٔ نور» (فاز هویت) */
            boxShadow: teacher.available
              ? "0 0 0 3px rgba(231,213,168,.5), 0 4px 10px rgba(46,54,34,.10)"
              : "0 2px 8px rgba(46,54,34,.08)",
          }}
        >
          {teacher.avatarUrl ? (
            <img
              src={resolveAssetUrl(teacher.avatarUrl)}
              alt={localName}
              loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
              <span style={{ fontSize: Math.round(avatarSize * 0.34), fontWeight: 900, color: colors.olive600, opacity: 0.8, lineHeight: 1 }}>
                {initialsOf(localName, lang)}
              </span>
            </div>
          )}
        </div>
        <span
          aria-hidden="true"
          className={teacher.available ? "vodda-live-dot" : "vodda-offline-dot"}
          style={{
            position: "absolute",
            bottom: -2,
            insetInlineEnd: -2,
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: `2.5px solid ${colors.surface}`,
            background: teacher.available ? colors.olive600 : colors.danger,
            color: teacher.available ? colors.olive600 : colors.danger,
          }}
        />
      </div>

      {/* دکمهٔ واقعی و مستقل «مشاهدهٔ پروفایل» — نام، ۲ خط ثابت */}
      <button
        type="button"
        onClick={goToTeacher}
        className="vodda-tappable"
        style={{
          display: "-webkit-box",
          width: "100%",
          overflow: "hidden",
          border: 0,
          background: "transparent",
          padding: 0,
          fontFamily: typography.fontFamily,
          cursor: "pointer",
          textAlign: "center",
          color: colors.ink,
          fontSize: wideCell ? 13 : 11,
          fontWeight: 800,
          lineHeight: 1.35,
          minHeight: wideCell ? 35 : 30,
          overflowWrap: "anywhere",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: 2,
        } as CSSProperties}
      >
        {localName}
      </button>

      {/* تخصص — ۱ خط با ellipsis */}
      <span
        style={{
          width: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: wideCell ? 10.5 : 10,
          fontWeight: 600,
          color: colors.olive600,
        }}
      >
        {L(teacher.field)}
      </span>

      {/* ردیف نشان‌ها — ارتفاع ثابت تا ریتم کارت‌ها با/بدون درجه یکسان بماند */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          minHeight: wideCell ? 18 : 16,
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        {tier1 ? (
          /* ۱.الف.۵ — نشان «🏆 استاد درجه ۱» + حداکثر دو نشان 🟦🆓⚡ — همان اندازه، ظاهر ویژه */
          <>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: wideCell ? "2px 7px" : "1px 6px",
                borderRadius: 999,
                fontSize: badgeFont,
                fontWeight: 800,
                color: colors.goldInk,
                background: "linear-gradient(135deg, rgba(191,149,64,.16), rgba(191,149,64,.30))",
                border: "1px solid rgba(191,149,64,.45)",
                whiteSpace: "nowrap",
                flex: "0 0 auto",
              }}
            >
              🏆 {L("استاد درجه ۱")}
            </span>
            {tier1Badges.slice(0, wideCell ? 2 : 1).map((badge) => (
              <span
                key={badge.label}
                title={badge.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: wideCell ? "2px 6px" : "1px 5px",
                  borderRadius: 999,
                  fontSize: badgeFont,
                  fontWeight: 700,
                  color: colors.inkSecondary,
                  background: "rgba(255,255,255,.72)",
                  border: `1px solid ${colors.sand200}`,
                  whiteSpace: "nowrap",
                  flex: "0 0 auto",
                }}
              >
                <span aria-hidden="true">{badge.emoji}</span>
                {badge.label}
              </span>
            ))}
          </>
        ) : (
          <TierBadge tier={teacher.tier} />
        )}
      </div>

      {/* متا — امتیاز · شهر · جلسه‌ها، ۱ خط (≥480px) */}
      {wideCell ? (
        <span
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            overflow: "hidden",
            fontSize: 10.5,
            color: colors.inkMuted,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 2, color: colors.goldDark, fontWeight: 800, flex: "0 0 auto" }}>
            <Icon name="star" size={12} fill style={{ color: colors.gold }} />
            {ratingText}
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{localizeCityName(teacher.city, lang)}</span>
          <span style={{ flex: "0 0 auto" }}>· {sessionsText} {L("جلسه")}</span>
        </span>
      ) : null}

      {/* قیمت + دکمه — چسبیده به پایین کارت */}
      <div
        style={{
          marginTop: "auto",
          width: "100%",
          display: "grid",
          gap: wideCell ? 6 : 5,
          paddingTop: wideCell ? 8 : 6,
          borderTop: `1px solid ${colors.sand100}`,
        }}
      >
        <span
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 4,
            width: "100%",
            overflow: "hidden",
            whiteSpace: "nowrap",
            fontSize: wideCell ? 10.5 : 10,
            color: colors.inkMuted,
          }}
        >
          {L("از")}
          <strong style={{ color: colors.ink, fontWeight: 800, fontSize: wideCell ? 12.5 : 11 }}>
            {priceFrom} {L("هزار تومان")}
          </strong>
        </span>
        <Button
          onClick={(event) => {
            event.stopPropagation();
            goToTeacher();
          }}
          style={{
            width: "100%",
            minHeight: wideCell ? 32 : 26,
            padding: "4px 10px",
            fontSize: wideCell ? 12 : 10.5,
            borderRadius: 9,
          }}
        >
          {/* استاد آفلاین قابل رزرو نیست — دکمه فقط به پروفایل می‌رود تا درخواست بی‌جواب نماند */}
          {teacher.available ? L("رزرو جلسه") : L("مشاهدهٔ پروفایل")}
        </Button>
      </div>
    </div>
  );
}
