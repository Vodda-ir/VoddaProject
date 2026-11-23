"use client";

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import { resolveAssetUrl } from "../../platform/asset";
import { Avatar, Button, Icon, colors, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { useMinWidth } from "../../ui/useMediaQuery";
import { neonRingStyle } from "../../ui/neon";
import { localizeCityName } from "../../i18n/transliterate";
import { presenceTooltip, resolveOnline } from "../../../lib/presence";
import { TIER_META, tierKeyOf } from "../../../lib/tierMeta";
import { TierBadge } from "./TierBadge";
import type { Teacher } from "./types";

/* ═══ ۰.۹.۲ — کارت نمایشی مربعی واحد استاد (برتر + پیشنهادی + جست‌وجو + دسته + خدمت) ═══
 * به درخواست کاربر، پروفایل اساتید برتر و پیشنهادی از لحاظ شکلی دقیقاً یکدست شد؛
 * این کامپوننت «منبع واحد» شکل کارت استاد در کل اپ است.
 * اصلاحات ۵گانهٔ همین نسخه:
 *  ۱) تایپوگرافی — نام وزن ۹۰۰ و درشت‌تر؛ تخصص یک درجه تیره‌تر (inkSecondary) با آیکون
 *     محو قرآن؛ قیمت با عدد درشت وزن ۹۰۰ و «تومان» ریزِ کم‌رنگ‌تر.
 *  ۲) فاصله‌ها — پدینگ داخلی بیشتر (۱۴px، پایین و کناره‌ها نفس‌کش‌تر) و گپ تفکیک‌شده
 *     بین نام/تخصص/قیمت.
 *  ۳) سایه — سایهٔ محو گرمِ قهوه‌ای/طلایی زیر کارت → جدا شدن از پس‌زمینهٔ کرم و حس شناور.
 *  ۴) رنگ‌ها — دکمهٔ گرادیان قهوه‌ای‌سوخته→طلایی با متن سفید و فلش پیش‌رونده؛ چیپ
 *     قیمت از سبز زیتونی به کرم/طلاییِ هم‌خانوادهٔ تم.
 *  ۵) نشان‌ها — تاج درجهٔ ۱ با هالهٔ glow طلایی؛ قاب طلایی ضخیم‌تر با حاشیهٔ سفید نازک
 *     بین عکس و قاب (پاپ‌شدن عکس)؛ تیک تأیید از آبی به سبز برند (هم‌رنگ هدر اپ).
 * UX: گرادیانت راهنمای لبهٔ اسکرول در ردیف‌ها (ScrollHintRow صفحهٔ نخست) و بازخورد
 * press دکمه (قاعدهٔ vodda-button:active). استایل‌ها کامل درون‌خطی‌اند تا در بیلد
 * Capacitor (بدون globals.css) هم دقیقاً همین شکل دیده شود. */

function VerifiedTick({ size = 16 }: { size?: number }) {
  /* ستارهٔ ۱۲پر با گوشه‌های نرم — سبز برند (هم‌رنگ هدر اپ) به‌جای آبی اینستاگرامی */
  const spikes = Array.from({ length: 24 }, (_, i) => {
    const radius = i % 2 === 0 ? 12 : 10.1;
    const angle = (Math.PI * i) / 12 - Math.PI / 2;
    return `${(12 + radius * Math.cos(angle)).toFixed(2)},${(12 + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="حساب تأییدشده"
      style={{ flex: "0 0 auto", display: "block" }}
    >
      <polygon
        points={spikes}
        fill={colors.olive700}
        stroke={colors.olive700}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10.75 15.9l-3.2-3.2 1.5-1.5 1.7 1.7 4.35-4.35 1.5 1.5z" fill="#ffffff" />
    </svg>
  );
}

function initialsOf(name: string, lang: "fa" | "en") {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? (lang === "en" ? "V" : "ا");
  const second = parts[1]?.charAt(0) ?? "";
  return second ? `${first} ${second}` : first;
}

export type TeacherCardProps = {
  teacher: Teacher;
  config: UniversalAppConfig;
  /** رونویسی اختیاری تشخیص عرض میزبان (صفحهٔ نخست مقدار خودش را می‌فرستد). */
  wide?: boolean;
  /** شکل کارت: tall = بلوک آواتار ۱:۱ (دسته/خدمت)؛ square = کارت مربعی فشردهٔ پُر (کروسل «پیشنهاد وُدّا» + جست‌وجو — ۱.۲). */
  variant?: "tall" | "square";
};

/* منبع واحد شکل کارت استاد در کل اپ — دو واریانت از یک خانوادهٔ بصری:
 *  - tall  → بلوک آواتار مربعی بزرگ (شبکه‌های ۲/۳ستونهٔ دسته و خدمت)
 *  - square → کارت مربعی ۱:۱ فشرده و پُر (کروسل «پیشنهاد وُدّا» + جست‌وجو — ۱.۲) */
export function TeacherCard(props: TeacherCardProps) {
  const { variant = "tall" } = props;
  if (variant === "square") {
    return <SquareTeacherCard teacher={props.teacher} config={props.config} wide={props.wide} />;
  }
  return <TallTeacherCard teacher={props.teacher} config={props.config} wide={props.wide} />;
}

/* ═══ ۱.۲ — واریانت مربعی فشردهٔ کارت استاد (کروسل «پیشنهاد وُدّا» + جست‌وجو) ═══
 * به درخواست کاربر: کادر مربعی ۱:۱ و «پُر» — هیچ گوشهٔ خالی ندارد و اندازه‌اش
 * حدود یک‌سوم کوچک‌تر از کارت قبلی است. اجزای الزامی:
 *  ۱) تصویر پروفایل مربعی — آواتار واحد وُدّا (گوشهٔ نرم ۱۴٪، هرگز دایره نیست) داخل قاب طلایی.
 *  ۲) چراغ چشمک‌زن سبز آنلاین / قرمز آفلاین — resolveOnline با lastSeen واقعی (۱.الف.۴).
 *  ۳) مهر درجهٔ استاد روی گوشهٔ آواتار — آبی بین‌المللی / سبز کشوری / قرمز استانی (tierMeta).
 *  ۴) عنوان اختصاصی استاد (tag = عنوان خدمت تخصصی او).
 *  ۵) ستارهٔ کسب‌شده + شمار نظر، شهر، جلسات، دنبال‌کننده‌ها، نشان‌های ویژه.
 *  ۶) نوار پایانی: قیمت خدمت + دکمهٔ گرادیان طلایی — همهٔ فضا معنادار پر می‌شود. */
function SquareTeacherCard({
  teacher,
  config,
  wide: wideOverride,
}: {
  teacher: Teacher;
  config: UniversalAppConfig;
  wide?: boolean;
}) {
  const { L, lang, N } = useAppearance();
  const wideAuto = useMinWidth(768);
  const wide = wideOverride ?? wideAuto;
  const locale = lang === "en" ? "en-US" : "fa-IR";
  const localName = N(teacher.name);
  const tier1 = teacher.isTier1 === true;
  const online = resolveOnline(teacher.available, teacher.lastSeen);
  const presenceLabel = presenceTooltip(online, teacher.lastSeen);
  const city = localizeCityName(teacher.city, lang);
  /* عنوان اختصاصی — عنوان خدمت تخصصی استاد؛ نبود → تخصص کلی */
  const headline = (teacher.tag || teacher.field || "").trim();
  const hasFreeService = teacher.freeEnabled && teacher.services.some((service) => service.active && service.price === 0);
  const tierKey = tierKeyOf(teacher.tier);

  const priceText = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.max(0, teacher.price30));
  const ratingText = teacher.rating.toLocaleString(locale, { maximumFractionDigits: 1 });
  const reviewsText = teacher.reviews.toLocaleString(locale);
  const sessionsText = teacher.sessions.toLocaleString(locale);
  const followersText = teacher.followers.toLocaleString(locale);

  /* اندازهٔ آواتار مربعی متناسب با عرض واقعی کارت — تا هیچ گوشه‌ای خالی نماند */
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [cardWidth, setCardWidth] = useState(0);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const border = entry.borderBoxSize && entry.borderBoxSize[0] ? entry.borderBoxSize[0].inlineSize : el.getBoundingClientRect().width;
        setCardWidth(Math.round(border));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const compact = cardWidth > 0 && cardWidth < 300;
  const roomy = cardWidth >= 380;
  const avatarRatio = compact ? 0.4 : 0.44;
  const avatarCap = compact ? 118 : roomy ? 210 : 138;
  const avatarSize = cardWidth > 0 ? Math.round(Math.min(avatarCap, Math.max(86, cardWidth * avatarRatio))) : 104;
  const frameRadius = Math.max(12, Math.round(avatarSize * 0.2));
  /* سابقهٔ تدریس از تاریخ عضویت — برای کارت‌های بزرگ‌تر (≥۳۸۰px) */
  const yearsTeaching = (() => {
    if (!roomy || !teacher.createdAt) return 0;
    const at = Date.parse(teacher.createdAt);
    if (Number.isNaN(at)) return 0;
    return Math.max(1, Math.floor((Date.now() - at) / (365 * 24 * 60 * 60 * 1000)));
  })();

  /* کلیک روی بدنهٔ کارت فقط برای اشاره‌گر است؛ دکمه‌های درون کارت اهداف مستقل خودشان را دارند. */
  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) return;
    navigateApp(`/teacher/${teacher.id}`, config);
  }

  return (
    <div
      style={{
        borderRadius: 20,
        boxShadow: "0 12px 26px rgba(139,104,31,.16), 0 3px 8px rgba(46,54,34,.07)",
      }}
    >
      <div
        ref={rootRef}
        className={tier1 ? "vodda-neon-gold" : "vodda-card--interactive"}
        onClick={handleCardClick}
        aria-label={`${localName}${headline ? ` — ${headline}` : ""}${teacher.verified ? " — حساب تأییدشده" : ""}`}
        style={{
          width: "100%",
          /* مربعی ترجیحی: حداقلِ ارتفاع = عرض واقعی کارت؛ اگر محتوا بیشتر بخواهد
           * کارت کمی بلندتر می‌شود و هرگز چیزی بریده نمی‌شود (بدون کراپ). */
          minHeight: cardWidth > 0 ? Math.round(cardWidth) : undefined,
          boxSizing: "border-box",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 8,
          overflow: "hidden",
          textAlign: "start",
          color: colors.ink,
          background: "linear-gradient(168deg, #fffdf6 0%, #fbf4e3 100%)",
          cursor: "pointer",
          fontFamily: typography.fontFamily,
          padding: wide ? 16 : 12,
          ...(tier1 ? { borderRadius: 20 } : neonRingStyle(20)),
        }}
      >
        {/* ردیف نخست — آواتار مربعی با قاب طلایی + ستون هویت (نام/عنوان/امتیاز) */}
        <span style={{ display: "flex", alignItems: "stretch", gap: 11, minWidth: 0 }}>
          <span
            style={{
              position: "relative",
              flex: "0 0 auto",
              display: "inline-flex",
              padding: 3,
              borderRadius: frameRadius,
              background: tier1
                ? "linear-gradient(135deg, #bf9540 0%, #e9cf8f 50%, #bf9540 100%)"
                : "linear-gradient(135deg, #bf9540 0%, #d8b869 55%, #f0e2bb 100%)",
              boxShadow: "0 0 12px rgba(191,149,64,.32), 0 4px 10px rgba(46,54,34,.14)",
            }}
          >
            <Avatar
              src={resolveAssetUrl(teacher.avatarUrl) || undefined}
              name={localName}
              size={avatarSize}
              tier={teacher.tier}
              alt=""
            />
            {/* چراغ چشمک‌زن حضور — سبز پالسی آنلاین / قرمز چشمک‌زن آفلاین */}
            <span
              role="img"
              aria-label={presenceLabel}
              title={presenceLabel}
              className={online ? "vodda-live-dot" : "vodda-presence-red"}
              style={{
                position: "absolute",
                top: 1,
                insetInlineEnd: 1,
                width: 13,
                height: 13,
                borderRadius: "50%",
                border: "2.5px solid #fffdf6",
                background: online ? "#22C55E" : colors.danger,
                color: online ? "#22C55E" : colors.danger,
                boxShadow: online ? "0 0 8px 1px rgba(34,197,94,.55)" : "0 0 6px 1px rgba(239,68,68,.4)",
                zIndex: 1,
              }}
            />
          </span>

          <span
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              gap: 6,
            }}
          >
            {/* نام + تیک تأیید سبز برند */}
            <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, maxWidth: "100%" }}>
              <span
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 15,
                  fontWeight: 900,
                  color: colors.ink,
                }}
              >
                {localName}
              </span>
              {teacher.verified ? <VerifiedTick size={15} /> : null}
            </span>

            {/* عنوان اختصاصی استاد */}
            {headline ? (
              <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, maxWidth: "100%" }}>
                <Icon name="sparkle" size={11} style={{ flex: "0 0 auto", color: colors.gold }} />
                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 11,
                    fontWeight: 700,
                    color: colors.goldDark,
                  }}
                >
                  {headline}
                </span>
              </span>
            ) : null}

            {/* ستارهٔ کسب‌شده + شمار نظر؛ نبود امتیاز → برچسب درجه؛ کنارش شهر */}
            <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, minWidth: 0, maxWidth: "100%" }}>
              {teacher.rating > 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: colors.goldBackground,
                    border: "1px solid rgba(191,149,64,.4)",
                    maxWidth: "100%",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon name="star" size={11} fill style={{ flex: "0 0 auto", color: colors.gold }} />
                  <span style={{ fontSize: 11, fontWeight: 900, color: colors.goldDark, lineHeight: 1.2 }}>{ratingText}</span>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 600,
                      color: colors.goldInkSoft,
                      lineHeight: 1.2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {reviewsText} {L("نظر")}
                  </span>
                </span>
              ) : tierKey ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: colors.goldBackground,
                    border: "1px solid rgba(191,149,64,.4)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon name="award" size={11} style={{ flex: "0 0 auto", color: TIER_META[tierKey].main }} />
                  <span style={{ fontSize: 10, fontWeight: 800, color: colors.goldDark, lineHeight: 1.2 }}>
                    {L(TIER_META[tierKey].short)}
                  </span>
                </span>
              ) : null}
              {city ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: colors.surfaceSoft,
                    border: `1px solid ${colors.sand150}`,
                    maxWidth: "100%",
                    minWidth: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <Icon name="pin" size={11} style={{ flex: "0 0 auto", color: colors.olive500 }} />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: colors.inkSecondary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {city}
                  </span>
                </span>
              ) : null}
            </span>
          </span>
        </span>

        {/* جداکنندهٔ طلایی محو */}
        <span
          aria-hidden="true"
          style={{
            flex: "0 0 auto",
            height: 1,
            background: "linear-gradient(90deg, rgba(191,149,64,0), rgba(191,149,64,.38), rgba(191,149,64,0))",
          }}
        />

        {/* معرفی کوتاه استاد — یک خط در کارت فشرده، دو خط در کارت بزرگ */}
        {teacher.bio ? (
          <span
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: roomy ? 2 : 1,
              overflow: "hidden",
              fontSize: 10.5,
              fontWeight: 500,
              lineHeight: 1.7,
              color: colors.inkMuted,
              minWidth: 0,
            }}
          >
            {teacher.bio}
          </span>
        ) : null}

        {/* برچسب خدمت‌های تخصصی — تا دو خدمت + شمار باقی‌مانده (≥۳۰۰px) */}
        {!compact && teacher.services.length > 0 ? (
          <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, minWidth: 0 }}>
            {teacher.services.slice(0, 2).map((service) => (
              <span
                key={service.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: colors.surfaceSoft,
                  border: `1px solid ${colors.sand150}`,
                  color: colors.inkSecondary,
                  fontSize: 9.5,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                <Icon name="quran" size={10} style={{ flex: "0 0 auto", color: colors.olive500 }} />
                {service.title}
              </span>
            ))}
            {teacher.services.length > 2 ? (
              <span
                style={{
                  display: "inline-flex",
                  padding: "3px 7px",
                  borderRadius: 999,
                  background: "rgba(191,149,64,.10)",
                  border: "1px solid rgba(191,149,64,.30)",
                  color: colors.goldDark,
                  fontSize: 9.5,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                +{teacher.services.length - 2}
              </span>
            ) : null}
          </span>
        ) : null}

        {/* نوار فعالیت — جلسات برگزارشده، دنبال‌کننده‌ها و سابقه */}
        {teacher.sessions > 0 || teacher.followers > 0 || yearsTeaching > 0 ? (
          <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 14px", minWidth: 0 }}>
            {teacher.sessions > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: colors.inkMuted,
                  whiteSpace: "nowrap",
                }}
              >
                <Icon name="clock" size={11} style={{ color: colors.olive500, opacity: 0.85 }} />
                <span style={{ fontWeight: 900, color: colors.inkSecondary }}>{sessionsText}</span>
                {L("جلسه")}
              </span>
            ) : null}
            {teacher.followers > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: colors.inkMuted,
                  whiteSpace: "nowrap",
                }}
              >
                <Icon name="users" size={11} style={{ color: colors.olive500, opacity: 0.85 }} />
                <span style={{ fontWeight: 900, color: colors.inkSecondary }}>{followersText}</span>
                {L("دنبال‌کننده")}
              </span>
            ) : null}
            {yearsTeaching > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: colors.inkMuted,
                  whiteSpace: "nowrap",
                }}
              >
                <Icon name="award" size={11} style={{ color: colors.olive500, opacity: 0.85 }} />
                <span style={{ fontWeight: 900, color: colors.inkSecondary }}>
                  {yearsTeaching.toLocaleString(locale)}
                </span>
                {L("سال سابقه")}
              </span>
            ) : null}
          </span>
        ) : null}

        {/* نشان‌های ویژهٔ فعال — فقط وقتی واقعاً برقرارند */}
        {teacher.instantEnabled || hasFreeService ? (
          <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, minWidth: 0 }}>
            {teacher.instantEnabled ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "#e7f6ee",
                  border: "1px solid rgba(58,167,109,.35)",
                  color: "#2e8f5c",
                  fontSize: 10,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                <Icon name="sparkle" size={11} />
                {L("پذیرای رزرو همین‌لحظه")}
              </span>
            ) : null}
            {hasFreeService ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "#e7f6ee",
                  border: "1px solid rgba(58,167,109,.35)",
                  color: "#2e8f5c",
                  fontSize: 10,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                <Icon name="gift" size={11} />
                {L("خدمات رایگان")}
              </span>
            ) : null}
          </span>
        ) : null}

        {/* نوار پایانی — قیمت خدمت + دکمهٔ گرادیان طلایی */}
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {teacher.price30 > 0 ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: 3,
                flex: "0 0 auto",
                padding: "3px 8px",
                borderRadius: 999,
                background: colors.goldBackground,
                border: "1px solid rgba(191,149,64,.38)",
                maxWidth: "100%",
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: 13,
                  fontWeight: 900,
                  color: colors.goldDark,
                  lineHeight: 1.3,
                }}
              >
                {priceText}
              </span>
              <span style={{ flex: "0 0 auto", fontSize: 9, fontWeight: 600, color: colors.goldInkSoft, lineHeight: 1.3 }}>
                {L("تومان")}
              </span>
            </span>
          ) : hasFreeService ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                flex: "0 0 auto",
                padding: "4px 9px",
                borderRadius: 999,
                background: "#e7f6ee",
                border: "1px solid rgba(58,167,109,.35)",
                color: "#2e8f5c",
                fontSize: 11,
                fontWeight: 900,
                whiteSpace: "nowrap",
              }}
            >
              <Icon name="gift" size={12} />
              {L("رایگان")}
            </span>
          ) : null}
          <Button
            onClick={(event) => {
              event.stopPropagation();
              navigateApp(`/teacher/${teacher.id}`, config);
            }}
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              margin: 0,
              minHeight: 30,
              padding: "4px 10px",
              fontSize: 11.5,
              borderRadius: 10,
              gap: 5,
              ...(teacher.available
                ? {
                    background: "linear-gradient(135deg, #8b681f 0%, #a9822c 48%, #bf9540 100%)",
                    color: "#fffdf6",
                    border: "1px solid rgba(139,104,31,.55)",
                    boxShadow: "0 4px 14px rgba(139,104,31,.32)",
                  }
                : {
                    background: "transparent",
                    color: colors.goldDark,
                    border: "1.5px solid rgba(191,149,64,.65)",
                    boxShadow: "none",
                  }),
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {teacher.available ? L("پروفایل و رزرو") : L("مشاهدهٔ پروفایل")}
            </span>
            <Icon
              name="chevronL"
              size={12}
              style={{ flex: "0 0 auto", transform: lang === "en" ? "scaleX(-1)" : undefined }}
            />
          </Button>
        </span>
      </div>
    </div>
  );
}

/* ═══ ۰.۹.۲ — واریانت بلند (بلوک آواتار ۱:۱) — شبکه‌های ۲/۳ستونهٔ دسته و خدمت ═══ */
function TallTeacherCard({
  teacher,
  config,
  wide: wideOverride,
}: {
  teacher: Teacher;
  config: UniversalAppConfig;
  wide?: boolean;
}) {
  const { L, lang, N } = useAppearance();
  const wideAuto = useMinWidth(768);
  const wide = wideOverride ?? wideAuto;
  const localName = N(teacher.name);
  const tier1 = teacher.isTier1 === true;
  const locale = lang === "en" ? "en-US" : "fa-IR";
  const priceText = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    Math.max(0, teacher.price30),
  );
  const ratingText = teacher.rating.toLocaleString(locale, { maximumFractionDigits: 1 });
  const sessionsText = teacher.sessions.toLocaleString(locale);

  /* عرض واقعی کارت — در گریدهای ۲/۳ستونهٔ صفحه‌های دیگر (جست‌وجو/دسته/خدمت) سلول‌ها
   * ممکن است خیلی تنگ شوند (مثلاً ۳۲۰px)؛ در آن حالت آیکون دکمه حذف و فاصله‌ها جمع می‌شود
   * تا هیچ‌وقت بیرون‌زدگی و بریدگی متن نداشته باشیم. */
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [cardWidth, setCardWidth] = useState(0);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setCardWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const narrow = cardWidth > 0 && cardWidth < 150;

  /* کلیک روی بدنهٔ کارت فقط برای اشاره‌گر است؛ دکمه‌های درون کارت اهداف مستقل خودشان را دارند. */
  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) return;
    navigateApp(`/teacher/${teacher.id}`, config);
  }

  const cardFrame: CSSProperties = {
    width: "100%",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    textAlign: "start",
    color: colors.ink,
    background: colors.surface,
    cursor: "pointer",
    fontFamily: typography.fontFamily,
    ...(tier1 ? { borderRadius: 20 } : neonRingStyle(20)),
  };

  return (
    /* سایهٔ محو گرم قهوه‌ای/طلایی زیر کارت — جدا شدن از پس‌زمینهٔ کرم و حس شناور بودن
     * (روی پوششِ بیرونی است تا با حلقهٔ نئونی/تنفس طلایی درجهٔ ۱ تداخل نکند) */
    <div
      style={{
        borderRadius: 20,
        boxShadow: "0 12px 26px rgba(139,104,31,.16), 0 3px 8px rgba(46,54,34,.07)",
      }}
    >
      <div
        ref={rootRef}
        className={tier1 ? "vodda-neon-gold" : "vodda-card--interactive"}
        onClick={handleCardClick}
        style={cardFrame}
        aria-label={`${localName}${teacher.verified ? " — حساب تأییدشده" : ""}`}
      >
        {/* بلوک پروفایل مربعی ۱:۱ — آواتار با رینگ استوری طلایی + چیپ امتیاز/درجهٔ شناور */}
        <span
          aria-hidden="true"
          style={{
            position: "relative",
            display: "block",
            aspectRatio: "1 / 1",
            width: "100%",
            overflow: "hidden",
            background: "linear-gradient(150deg, #f2f5ea 0%, #f7f0dc 60%, #f3e6c8 100%)",
            borderBottom: "1px solid rgba(191,149,64,.28)",
          }}
        >
          {/* حاشیهٔ داخلی محو برای عمق */}
          <span style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 22px rgba(191,149,64,.10)" }} />

          {/* نشان درجهٔ ۱ — گوشهٔ شروع بلوک؛ با هالهٔ glow طلایی تا بیشتر به چشم بیاید */}
          {tier1 ? (
            <span
              style={{
                position: "absolute",
                top: 10,
                insetInlineStart: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                padding: "3px 8px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 800,
                color: "#7a5e1e",
                background: "linear-gradient(135deg, rgba(255,249,235,.97), rgba(243,230,200,.97))",
                border: "1px solid rgba(191,149,64,.55)",
                boxShadow: "0 0 14px rgba(191,149,64,.55), 0 2px 8px rgba(139,104,31,.28)",
                whiteSpace: "nowrap",
              }}
            >
              🏆 {L("درجهٔ ۱")}
            </span>
          ) : null}

          {/* چیپ امتیاز — گوشهٔ پایان بلوک؛ بدون امتیاز، مهر درجه جای آن می‌نشیند */}
          {teacher.rating > 0 ? (
            <span
              style={{
                position: "absolute",
                top: 10,
                insetInlineEnd: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                padding: "3px 8px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                lineHeight: 1.2,
                color: "#8b681f",
                background: "rgba(255,253,246,.94)",
                border: "1px solid rgba(191,149,64,.45)",
                boxShadow: "0 2px 8px rgba(139,104,31,.14)",
                whiteSpace: "nowrap",
              }}
            >
              <Icon name="star" size={11} fill style={{ color: colors.gold }} />
              {ratingText}
            </span>
          ) : teacher.tier ? (
            <span
              title={teacher.tier}
              style={{
                position: "absolute",
                top: 10,
                insetInlineEnd: 10,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px 7px",
                borderRadius: 999,
                background: "rgba(255,253,246,.94)",
                border: "1px solid rgba(191,149,64,.45)",
                boxShadow: "0 2px 8px rgba(139,104,31,.14)",
              }}
            >
              <TierBadge tier={teacher.tier} size={14} />
            </span>
          ) : null}

          {/* آواتار گرد — قاب طلایی ضخیم‌تر + حاشیهٔ سفید نازک بین عکس و قاب (پاپ‌شدن عکس) */}
          <span
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "56%",
              maxWidth: 128,
              aspectRatio: "1 / 1",
              display: "block",
              borderRadius: "50%",
              padding: 4.5,
              background: tier1
                ? "linear-gradient(135deg, #bf9540 0%, #e9cf8f 50%, #bf9540 100%)"
                : "linear-gradient(135deg, #bf9540 0%, #d8b869 55%, #f0e2bb 100%)",
              boxShadow: "0 0 14px rgba(191,149,64,.35), 0 6px 14px rgba(46,54,34,.12)",
            }}
          >
            <span
              style={{
                position: "relative",
                display: "block",
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                border: "3px solid #fffdf6",
                overflow: "hidden",
                background: `linear-gradient(150deg, ${colors.olive100}, ${colors.olive50})`,
              }}
            >
              {teacher.avatarUrl ? (
                <img
                  src={resolveAssetUrl(teacher.avatarUrl)}
                  alt=""
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <span
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 30,
                    fontWeight: 900,
                    color: colors.olive600,
                    opacity: 0.8,
                    lineHeight: 1,
                  }}
                >
                  {initialsOf(localName, lang)}
                </span>
              )}
              <span
                className={teacher.available ? "vodda-live-dot" : "vodda-offline-dot"}
                style={{
                  position: "absolute",
                  bottom: 2,
                  insetInlineEnd: 6,
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  border: "2.5px solid #fffdf6",
                  background: teacher.available ? "#1ED361" : colors.danger,
                  boxShadow: teacher.available ? "0 0 10px 0 rgba(34,197,94,.6)" : undefined,
                }}
              />
            </span>
          </span>
        </span>

        {/* بدنهٔ کارت — پدینگ نفس‌کش‌تر + گپ تفکیک‌شده بین نام/تخصص/قیمت */}
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 7,
            flex: 1,
            minWidth: 0,
            padding: narrow ? "12px 12px 2px" : "14px 14px 2px",
          }}
        >
          {/* نام — مهم‌ترین عنصر کارت: وزن ۹۰۰ و درشت‌تر */}
          <span style={{ display: "flex", alignItems: "center", gap: 5, maxWidth: "100%", minWidth: 0 }}>
            <span
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: narrow ? 14 : 15,
                fontWeight: 900,
                color: colors.ink,
              }}
            >
              {localName}
            </span>
            {teacher.verified ? <VerifiedTick size={16} /> : null}
          </span>

          {/* تخصص — یک درجه تیره‌تر از قبل + آیکون محو قرآن برای حس بصری */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              maxWidth: "100%",
              minWidth: 0,
            }}
          >
            <Icon
              name="quran"
              size={11}
              style={{ flex: "0 0 auto", color: colors.olive500, opacity: 0.85 }}
            />
            <span
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: narrow ? 11.5 : 12,
                fontWeight: 600,
                color: colors.inkSecondary,
              }}
            >
              {L(teacher.field)}
            </span>
          </span>

          {/* قیمت/جلسه — چیپ کرم/طلایی هم‌خانوادهٔ تم؛ عدد درشت و واحد ریزِ کم‌رنگ */}
          {teacher.price30 > 0 ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: 4,
                marginTop: 2,
                padding: narrow ? "3px 9px" : "4px 12px",
                borderRadius: 999,
                background: colors.goldBackground,
                border: "1px solid rgba(191,149,64,.38)",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontSize: narrow ? 12.5 : 13.5,
                  fontWeight: 900,
                  color: colors.goldDark,
                  lineHeight: 1.3,
                }}
              >
                {priceText}
              </span>
              <span
                style={{
                  flex: "0 0 auto",
                  fontSize: narrow ? 9.5 : 10,
                  fontWeight: 600,
                  color: colors.goldInkSoft,
                  lineHeight: 1.3,
                }}
              >
                {L("تومان")}
              </span>
            </span>
          ) : teacher.sessions > 0 ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: 4,
                marginTop: 2,
                padding: narrow ? "3px 9px" : "4px 12px",
                borderRadius: 999,
                background: colors.goldBackground,
                border: "1px solid rgba(191,149,64,.38)",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
            >
              <Icon name="clock" size={12} style={{ color: colors.goldDark, alignSelf: "center" }} />
              <span
                style={{
                  fontSize: narrow ? 12.5 : 13.5,
                  fontWeight: 900,
                  color: colors.goldDark,
                  lineHeight: 1.3,
                }}
              >
                {sessionsText}
              </span>
              <span
                style={{
                  fontSize: narrow ? 9.5 : 10,
                  fontWeight: 600,
                  color: colors.goldInkSoft,
                  lineHeight: 1.3,
                }}
              >
                {L("جلسه")}
              </span>
            </span>
          ) : null}
        </span>

        {/* دکمه — گرادیان قهوه‌ای‌سوخته→طلایی، متن سفید، فلش پیش‌رونده؛ press: تیره‌تر + کوچک‌تر */}
        <Button
          onClick={(event) => {
            event.stopPropagation();
            navigateApp(`/teacher/${teacher.id}`, config);
          }}
          style={{
            width: "auto",
            alignSelf: "stretch",
            margin: narrow ? "5px 10px 12px" : "6px 14px 14px",
            minHeight: wide ? 36 : 33,
            padding: narrow ? "4px 8px" : "4px 12px",
            fontSize: narrow ? 11.5 : wide ? 13 : 12.5,
            borderRadius: 11,
            gap: 6,
            ...(teacher.available
              ? {
                  background: "linear-gradient(135deg, #8b681f 0%, #a9822c 48%, #bf9540 100%)",
                  color: "#fffdf6",
                  border: "1px solid rgba(139,104,31,.55)",
                  boxShadow: "0 4px 14px rgba(139,104,31,.32)",
                }
              : {
                  background: "transparent",
                  color: colors.goldDark,
                  border: "1.5px solid rgba(191,149,64,.65)",
                  boxShadow: "none",
                }),
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {teacher.available ? L("پروفایل و رزرو") : L("مشاهدهٔ پروفایل")}
          </span>
          {narrow ? null : (
            <Icon
              name="chevronL"
              size={13}
              style={{
                flex: "0 0 auto",
                transform: lang === "en" ? "scaleX(-1)" : undefined,
              }}
            />
          )}
        </Button>
      </div>
    </div>
  );
}
