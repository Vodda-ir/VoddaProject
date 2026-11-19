"use client";

import type { CSSProperties, MouseEvent } from "react";
import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import { resolveAssetUrl } from "../../platform/asset";
import { Button, Icon, colors, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { neonRingStyle } from "../../ui/neon";
import type { Teacher } from "../teachers/types";

/* ═══ ۰.۹.۰ — کارت نمایشی مربعی اساتید برتر (فقط صفحهٔ نخست) ═══
 * هم‌خانوادهٔ کادرهای نئونی: قاب طلایی نئونی (درجهٔ ۱: نسخهٔ نفس‌کشندهٔ vodda-neon-gold،
 * بقیه: حلقهٔ نئونی استاتیک)، بلوک پروفایل مربعی ۱:۱ با آواتار گرد و رینگ استوریِ طلایی،
 * تیک آبی تأیید به سبک اینستاگرام (درخواست صریح کاربر — آبی فقط در همین نشان)،
 * چیپ امتیاز شناور روی بلوک، نام + تیک، تخصص، قیمت، دکمهٔ طلایی. */

function VerifiedTick({ size = 15 }: { size?: number }) {
  /* ستارهٔ ۱۲پر با گوشه‌های نرم — شبیه نشان تأیید اینستاگرام */
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
      <polygon points={spikes} fill="#0095F6" stroke="#0095F6" strokeWidth="1.8" strokeLinejoin="round" />
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

export function TopTeacherShowcase({
  teacher,
  config,
  wide,
}: {
  teacher: Teacher;
  config: UniversalAppConfig;
  wide: boolean;
}) {
  const { L, lang, N } = useAppearance();
  const localName = N(teacher.name);
  const tier1 = teacher.isTier1 === true;
  const locale = lang === "en" ? "en-US" : "fa-IR";
  const priceText = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
    Math.max(0, teacher.price30),
  );
  const ratingText = teacher.rating.toLocaleString(locale, { maximumFractionDigits: 1 });

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
    <div
      className={tier1 ? "vodda-neon-gold" : undefined}
      onClick={handleCardClick}
      style={cardFrame}
      aria-label={`${localName}${teacher.verified ? " — حساب تأییدشده" : ""}`}
    >
      {/* بلوک پروفایل مربعی ۱:۱ — آواتار با رینگ استوری طلایی + چیپ امتیاز شناور */}
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

        {/* نشان درجهٔ ۱ — گوشهٔ شروع بلوک */}
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
              background: "linear-gradient(135deg, rgba(255,249,235,.95), rgba(243,230,200,.95))",
              border: "1px solid rgba(191,149,64,.5)",
              whiteSpace: "nowrap",
            }}
          >
            🏆 {L("درجهٔ ۱")}
          </span>
        ) : null}

        {/* چیپ امتیاز — گوشهٔ پایان بلوک */}
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
        ) : null}

        {/* آواتار گرد با رینگ استوری طلایی + نقطهٔ وضعیت */}
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
            padding: 3.5,
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
              border: "2.5px solid #fffdf6",
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

      {/* بدنهٔ کارت — نام + تیک، تخصص، قیمت */}
      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1, minWidth: 0, padding: "11px 12px 12px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, maxWidth: "100%", minWidth: 0 }}>
          <span
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 14.5,
              fontWeight: 800,
              color: colors.ink,
            }}
          >
            {localName}
          </span>
          {teacher.verified ? <VerifiedTick size={15} /> : null}
        </span>

        <span
          style={{
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 11.5,
            fontWeight: 500,
            color: colors.inkMuted,
          }}
        >
          {L(teacher.field)}
        </span>

        {teacher.price30 > 0 ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "3px 9px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              color: colors.olive700,
              background: colors.olive50,
              border: `1px solid ${colors.olive100}`,
              whiteSpace: "nowrap",
            }}
          >
            {priceText} {L("تومان")}
          </span>
        ) : null}
      </span>

      {/* دکمهٔ طلایی — هم‌خانوادهٔ نئونی */}
      <Button
        onClick={(event) => {
          event.stopPropagation();
          navigateApp(`/teacher/${teacher.id}`, config);
        }}
        style={{
          width: "auto",
          alignSelf: "stretch",
          margin: "0 12px 12px",
          minHeight: wide ? 34 : 31,
          padding: "4px 10px",
          fontSize: wide ? 13 : 12,
          borderRadius: 10,
          background: teacher.available ? "linear-gradient(135deg, #bf9540, #d8b869)" : "transparent",
          color: teacher.available ? "#fffdf6" : colors.goldDark,
          border: teacher.available ? "1px solid rgba(191,149,64,.7)" : "1.5px solid rgba(191,149,64,.65)",
          boxShadow: teacher.available ? "0 4px 12px rgba(191,149,64,.28)" : "none",
        }}
      >
        {teacher.available ? L("پروفایل و رزرو") : L("مشاهدهٔ پروفایل")}
      </Button>
    </div>
  );
}
