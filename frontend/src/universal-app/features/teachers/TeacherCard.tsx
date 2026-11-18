"use client";

import type { CSSProperties, MouseEvent } from "react";
import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import { resolveAssetUrl } from "../../platform/asset";
import { Button, Icon, colors, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { useMinWidth } from "../../ui/useMediaQuery";
import { TierBadge } from "./TierBadge";
import type { Teacher } from "./types";

function initialsOf(name: string, lang: "fa" | "en") {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? (lang === "en" ? "V" : "ا");
  const second = parts[1]?.charAt(0) ?? "";
  return second ? `${first} ${second}` : first;
}

/* ═══ ۰.۷.۴ — کارت استاد به سبک اسنپ‌داکتر (دقیقاً مطابق snapp.doctor) ═══
   کارت سفید تخت ۱۶۵×۲۰۰ با گوشهٔ ۱۲px؛ ردیف بالا: آواتار در یک سمت + ستون دو بج در سمت دیگر
   (امتیاز کهربایی با ستاره / قیمت یا تعداد جلسه با زمینهٔ زیتونی روشن)؛ نام ۱۴px یک‌خط با
   🏆 برای درجهٔ ۱ (هم‌جای آیکون Pro اسنپ‌داکتر)؛ تخصص ۱۲px دوخطی؛ دکمهٔ outline تمام‌عرض پایین.
   استاد درجه ۱: همان چیدمان، فقط گرادیان طلایی ملایم + 🏆.
   استایل‌ها کامل درون‌خطی‌اند تا در بیلد Capacitor (بدون globals.css) هم دقیقاً همین شکل دیده شود. */
export function TeacherCard({ teacher, config }: { teacher: Teacher; config: UniversalAppConfig }) {
  const { L, lang, N } = useAppearance();
  const localName = N(teacher.name);
  const wideCell = useMinWidth(480);
  /* ۱.الف.۵ — کارت درجه ۱: ظاهر ویژه در همان چیدمان اسنپ‌داکتری */
  const tier1 = teacher.isTier1 === true;
  const goToTeacher = () => navigateApp(`/teacher/${teacher.id}`, config);
  const locale = lang === "en" ? "en-US" : "fa-IR";
  const priceText = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    Math.max(0, teacher.price30),
  );
  const ratingText = teacher.rating.toLocaleString(locale, { maximumFractionDigits: 1 });
  const sessionsText = teacher.sessions.toLocaleString(locale);
  const avatarSize = wideCell ? 64 : 56;
  const pillFont = wideCell ? 12 : 11;

  /* کلیک روی بدنهٔ کارت فقط برای اشاره‌گر است؛ دکمه‌های درون کارت اهداف مستقل خودشان را دارند. */
  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) return;
    goToTeacher();
  }

  return (
    <div
      className={`vodda-card--interactive${tier1 ? " vodda-card-tier1" : ""}`}
      onClick={handleCardClick}
      style={{
        width: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: 200,
        padding: 12,
        overflow: "hidden",
        textAlign: "start",
        color: colors.ink,
        background: tier1
          ? "linear-gradient(140deg, #f2f5ea 0%, #f7efd9 55%, #f3e6c8 100%)"
          : colors.surface,
        border: `1px solid ${tier1 ? "rgba(191,149,64,.6)" : colors.sand150}`,
        borderRadius: 12,
        boxShadow: "0 1px 2px rgba(46,54,34,.04)",
        cursor: "pointer",
        fontFamily: typography.fontFamily,
      } as CSSProperties}
    >
      <div style={{ width: "100%" }}>
        {/* ردیف بالا — آواتار در یک سمت، ستون بج‌ها در سمت مقابل (چیدمان اسنپ‌داکتر) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ position: "relative", flex: "0 0 auto", width: avatarSize, height: avatarSize }}>
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: Math.round(avatarSize * 0.22),
                overflow: "hidden",
                border: `2.5px solid ${teacher.available ? colors.olive600 : colors.danger}`,
                background: `linear-gradient(150deg, ${colors.olive100}, ${colors.olive50})`,
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
                top: -2,
                insetInlineStart: -2,
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: `2.5px solid ${colors.surface}`,
                background: teacher.available ? "#1ED361" : colors.danger,
                color: teacher.available ? "#1ED361" : colors.danger,
                boxShadow: teacher.available ? "0 0 10px 0 rgba(34,197,94,.6)" : undefined,
              }}
            />
          </div>

          {/* ستون بج‌ها — امتیاز کهربایی بالا، قیمت/جلسهٔ زیتونی روشن پایین (هم‌تراز لبهٔ مقابل آواتار) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, minWidth: 0 }}>
            {teacher.rating > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: wideCell ? "4px 7px" : "3px 6px",
                  borderRadius: 4,
                  fontSize: pillFont,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: "#8b681f",
                  background: "#fff4dc",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                } as CSSProperties}
              >
                <Icon name="star" size={11} fill style={{ color: colors.gold }} />
                {ratingText}
              </span>
            ) : tier1 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: wideCell ? "4px 7px" : "3px 6px",
                  borderRadius: 4,
                  fontSize: pillFont,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: "#7a5e1e",
                  background: "linear-gradient(135deg, rgba(191,149,64,.16), rgba(191,149,64,.3))",
                  border: "1px solid rgba(191,149,64,.45)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                } as CSSProperties}
              >
                🏆 {L("استاد درجه ۱")}
              </span>
            ) : (
              <TierBadge tier={teacher.tier} />
            )}
            {teacher.price30 > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: wideCell ? "4px 7px" : "3px 6px",
                  borderRadius: 4,
                  fontSize: pillFont,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: colors.olive700,
                  background: colors.olive100,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  maxWidth: "100%",
                } as CSSProperties}
              >
                {priceText} {L("تومان")}
              </span>
            ) : teacher.sessions > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: wideCell ? "4px 7px" : "3px 6px",
                  borderRadius: 4,
                  fontSize: pillFont,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: colors.olive700,
                  background: colors.olive100,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                } as CSSProperties}
              >
                <Icon name="clock" size={11} />
                {sessionsText} {L("جلسه")}
              </span>
            ) : null}
          </div>
        </div>

        {/* نام — یک خط با ellipsis؛ 🏆 درجهٔ ۱ کنار نام */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 9, width: "100%" }}>
          {tier1 ? (
            <span title={L("استاد درجه ۱")} style={{ flex: "0 0 auto", fontSize: 13, lineHeight: 1 }}>🏆</span>
          ) : null}
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 14,
              fontWeight: 800,
              color: colors.ink,
            }}
          >
            {localName}
          </span>
        </div>

        {/* تخصص — دو خط با clamp (کف دو خط برای یکسان‌ماندن ارتفاع کارت‌ها) */}
        <span
          style={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            marginTop: 2,
            overflow: "hidden",
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.45,
            color: colors.inkMuted,
          } as CSSProperties}
        >
          {L(teacher.field)}
        </span>
      </div>

      {/* دکمهٔ outline تمام‌width — هم‌شکل «شروع مشاوره» اسنپ‌داکتر */}
      <Button
        onClick={(event) => {
          event.stopPropagation();
          goToTeacher();
        }}
        style={{
          width: "100%",
          marginTop: 10,
          minHeight: wideCell ? 34 : 30,
          padding: "4px 10px",
          fontSize: wideCell ? 13 : 12,
          borderRadius: 8,
          background: "transparent",
          color: colors.olive700,
          border: `1.5px solid ${colors.olive600}`,
          boxShadow: "none",
        } as CSSProperties}
      >
        {/* استاد آفلاین قابل رزرو نیست — دکمه فقط به پروفایل می‌رود تا درخواست بی‌جواب نماند */}
        {teacher.available ? L("پروفایل و رزرو") : L("مشاهدهٔ پروفایل")}
      </Button>
    </div>
  );
}
