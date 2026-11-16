"use client";

import type { MouseEvent } from "react";
import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import { resolveAssetUrl } from "../../platform/asset";
import { Button, Icon, colors, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { TierBadge } from "./TierBadge";
import type { Teacher } from "./types";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? "ا";
  const second = parts[1]?.charAt(0) ?? "";
  return second ? `${first} ${second}` : first;
}

export function TeacherCard({
  teacher,
  config,
  wide = false,
}: {
  teacher: Teacher;
  config: UniversalAppConfig;
  wide?: boolean;
}) {
  const { L, lang } = useAppearance();
  const goToTeacher = () => navigateApp(`/teacher/${teacher.id}`, config);
  const priceFrom = new Intl.NumberFormat(lang === "en" ? "en-US" : "fa-IR", { maximumFractionDigits: 0 }).format(
    Math.max(0, teacher.price30 / 1000),
  );

  /* کلیک روی بدنهٔ کارت فقط برای اشاره‌گر است؛ اهداف واقعی و مستقل دو دکمهٔ
     «مشاهدهٔ پروفایل» و «رزرو جلسه» هستند تا نقض تعامل تو در تو رخ ندهد (A4). */
  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a")) return;
    goToTeacher();
  }

  return (
    <div
      className="vodda-card vodda-card--interactive"
      onClick={handleCardClick}
      style={{
        width: wide ? "100%" : 232,
        flex: wide ? undefined : "0 0 232px",
        display: "flex",
        flexDirection: "column",
        gap: 9,
        padding: 14,
        textAlign: "right",
        color: colors.ink,
        background: colors.surface,
        border: 0,
        borderRadius: 24,
        boxShadow: "0 6px 22px rgba(46,54,34,.07)",
        cursor: "pointer",
        fontFamily: typography.fontFamily,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative", flex: "0 0 auto" }}>
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: 18,
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
                alt={teacher.name}
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
                <span style={{ fontSize: 21, fontWeight: 900, color: colors.olive600, opacity: 0.8, lineHeight: 1 }}>
                  {initialsOf(teacher.name)}
                </span>
              </div>
            )}
          </div>
          <span
            aria-hidden="true"
            className={teacher.available ? "vodda-live-dot" : "vodda-offline-dot"}
            style={{
              position: "absolute",
              bottom: -3,
              insetInlineEnd: -3,
              width: 14,
              height: 14,
              borderRadius: "50%",
              border: `2.5px solid ${colors.surface}`,
              background: teacher.available ? colors.olive600 : colors.danger,
              color: teacher.available ? colors.olive600 : colors.danger,
            }}
          />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          {/* دکمهٔ واقعی و مستقل «مشاهدهٔ پروفایل» — هدف اصلی صفحه‌خوان و کیبورد */}
          <button
            type="button"
            onClick={goToTeacher}
            className="vodda-tappable"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              minWidth: 0,
              maxWidth: "100%",
              border: 0,
              background: "transparent",
              padding: 0,
              fontFamily: typography.fontFamily,
              cursor: "pointer",
              textAlign: "right",
            }}
          >
            <strong
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 14.5,
                fontWeight: 800,
                color: colors.ink,
              }}
            >
              {teacher.name}
            </strong>
            <TierBadge tier={teacher.tier} />
          </button>
          <span
            style={{
              display: "block",
              marginTop: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 12.5,
              fontWeight: 600,
              color: colors.olive600,
            }}
          >
            {teacher.field}
          </span>
          {/* وضعیت دسترس‌پذیری با برچسب متنی، نه فقط رنگ (B6) — آفلاین = چراغ قرمز چشمک‌زن */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 4,
              padding: "2px 8px",
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 700,
              color: teacher.available ? colors.olive700 : colors.danger,
              background: teacher.available ? colors.olive50 : colors.dangerBackground,
            }}
          >
            <span
              aria-hidden="true"
              className={teacher.available ? undefined : "vodda-offline-dot"}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                flex: "0 0 auto",
                background: teacher.available ? colors.olive600 : colors.danger,
              }}
            />
            {teacher.available ? L("آنلاین — آمادهٔ رزرو") : L("آفلاین")}
          </span>
          {teacher.instantEnabled ? (
            <span
              aria-label={L("جلسهٔ فوری فعال")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                marginTop: 4,
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 800,
                color: "#7a5e1e",
                background: colors.goldBackground,
                border: `1px solid ${colors.goldSoft}`,
              }}
            >
              <Icon name="sparkle" size={11} stroke={2.4} style={{ color: colors.goldDark }} />
              {L("فوری")}
            </span>
          ) : null}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          minWidth: 0,
          fontSize: 12,
          color: colors.inkMuted,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: colors.goldDark, fontWeight: 800 }}>
          <Icon name="star" size={13} fill style={{ color: colors.gold }} />
          {teacher.rating.toLocaleString(lang === "en" ? "en-US" : "fa-IR", { maximumFractionDigits: 1 })}
          {teacher.reviews > 0 ? (
            <span style={{ fontWeight: 600 }}>({teacher.reviews.toLocaleString(lang === "en" ? "en-US" : "fa-IR")})</span>
          ) : null}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2, minWidth: 0 }}>
          <Icon name="pin" size={13} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teacher.city}</span>
        </span>
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: colors.inkMuted }}>
        <Icon name="award" size={12} />
        {teacher.sessions.toLocaleString(lang === "en" ? "en-US" : "fa-IR")} {L("جلسهٔ موفق")}
      </span>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 10,
          marginTop: "auto",
          paddingTop: 4,
        }}
      >
        <span>
          <span style={{ display: "block", fontSize: 12, color: colors.inkMuted }}>{L("هر جلسه از")}</span>
          <strong style={{ display: "block", marginTop: 1, fontSize: 13.5, fontWeight: 800, color: colors.ink }}>
            {priceFrom} {L("هزار تومان")}
          </strong>
        </span>
        <Button
          onClick={(event) => {
            event.stopPropagation();
            goToTeacher();
          }}
          style={{ minHeight: 44, padding: "8px 14px", fontSize: 13 }}
        >
          {/* استاد آفلاین قابل رزرو نیست — دکمه فقط به پروفایل می‌رود تا درخواست بی‌جواب نماند */}
          {teacher.available ? L("رزرو جلسه") : L("مشاهدهٔ پروفایل")}
        </Button>
      </div>
    </div>
  );
}

