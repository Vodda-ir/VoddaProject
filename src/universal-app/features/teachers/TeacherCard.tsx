"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { Avatar, Button, Icon, colors, typography } from "../../ui";
import { avatarSrc, uploadsOriginOf } from "@/lib/avatarImage";
import { formatNumber } from "@/lib/datetime";
import { hexToRgbTriplet, tierNeonColor } from "../../../lib/tierMeta";
import { TierBadge } from "./TierBadge";
import type { Teacher } from "./types";

/* ردیف نشان‌های کارت درجه ۱ (۱.الف.۵) — 🟦 تیک بین‌المللی، 🆓 خدمات رایگان، ⚡ جلسات فوری */
const TIER1_BADGE_ITEMS: Record<string, { emoji: string; label: string }> = {
  international: { emoji: "🟦", label: "تیک بین‌المللی" },
  free: { emoji: "🆓", label: "خدمات رایگان" },
  instant: { emoji: "⚡", label: "جلسات فوری" },
};

export function TeacherCard({
  teacher,
  config,
  wide = false,
}: {
  teacher: Teacher;
  config: UniversalAppConfig;
  wide?: boolean;
}) {
  const runtime = usePlatform();
  const goToTeacher = () => navigateApp(`/teacher/${teacher.id}`, config);
  // باگ persian-dates — عدد از util مرکزی
  const priceFrom = formatNumber(
    Math.max(0, teacher.price30 / 1000),
    "fa",
    { maximumFractionDigits: 0 },
  );

  /* ۱.الف.۳ — نئون کارت استاد: رنگ از درجه (آبی/سبز/قرمز)، بدون درجه خاکستری ملایم. */
  const neonColor = tierNeonColor(teacher.tier);
  /* ۱.الف.۵ — کارت درجه ۱ */
  const tier1 = teacher.isTier1 === true;
  const tier1Badges = (teacher.tier1Badges ?? [])
    .map((key) => TIER1_BADGE_ITEMS[key])
    .filter((item): item is { emoji: string; label: string } => Boolean(item));

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    goToTeacher();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`vodda-card vodda-card--interactive vodda-tappable vodda-card-neon${tier1 ? " vodda-card-tier1" : ""}`}
      onClick={goToTeacher}
      onKeyDown={handleKey}
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
        /* ۱.الف.۳ — radius ۱۶px طبق مشخصات نئون */
        borderRadius: 16,
        boxShadow: "0 6px 22px rgba(46,54,34,.07)",
        cursor: "pointer",
        fontFamily: typography.fontFamily,
        ["--neon-rgb" as string]: hexToRgbTriplet(neonColor),
      } as CSSProperties}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* آواتار مربعی واحد — مهر درجه پایین-راست، چراغ وضعیت بالا-راست */}
        <Avatar
          name={teacher.name}
          src={avatarSrc(teacher.avatarUrl, undefined, uploadsOriginOf(runtime.apiBaseUrl))}
          size={62}
          ring={false}
          tier={teacher.tier || undefined}
          online={teacher.available}
          lastSeen={teacher.lastSeen}
        />

        <div style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
            <strong
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: 14.5,
                fontWeight: 800,
              }}
            >
              {teacher.name}
            </strong>
            <TierBadge tier={teacher.tier} />
          </span>
          <span
            style={{
              display: "block",
              marginTop: 3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 11.5,
              fontWeight: 600,
              color: colors.olive600,
            }}
          >
            {teacher.field}
          </span>
        </div>
      </div>

      {tier1 ? (
        /* ۱.الف.۵ — نشان «🏆 استاد درجه ۱» + ردیف نشان‌های 🟦🆓⚡ */
        <div
          className="vodda-enter"
          style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 9px",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 800,
              color: "#7a5e1e",
              background: "linear-gradient(135deg, rgba(191,149,64,.16), rgba(191,149,64,.30))",
              border: "1px solid rgba(191,149,64,.45)",
              whiteSpace: "nowrap",
            }}
          >
            🏆 استاد درجه ۱
          </span>
          {tier1Badges.map((badge) => (
            <span
              key={badge.label}
              title={badge.label}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                padding: "3px 8px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 700,
                color: colors.inkSecondary,
                background: "rgba(255,255,255,.72)",
                border: `1px solid ${colors.sand200}`,
                whiteSpace: "nowrap",
              }}
            >
              <span aria-hidden="true">{badge.emoji}</span>
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          minWidth: 0,
          fontSize: 11.5,
          color: colors.inkMuted,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: colors.gold, fontWeight: 800 }}>
          <Icon name="star" size={13} fill />
          {formatNumber(teacher.rating, "fa", { maximumFractionDigits: 1 })}
          {teacher.reviews > 0 ? (
            <span style={{ fontWeight: 600 }}>({formatNumber(teacher.reviews)})</span>
          ) : null}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2, minWidth: 0 }}>
          <Icon name="pin" size={13} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teacher.city}</span>
        </span>
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: colors.inkMuted }}>
        <Icon name="award" size={12} />
        {formatNumber(teacher.sessions)} جلسهٔ موفق
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
          <span style={{ display: "block", fontSize: 10, color: colors.inkFaint }}>هر جلسه از</span>
          <strong style={{ display: "block", marginTop: 1, fontSize: 13, fontWeight: 800, color: colors.ink }}>
            {priceFrom} هزار تومان
          </strong>
        </span>
        <Button
          onClick={(event) => {
            event.stopPropagation();
            goToTeacher();
          }}
          style={{ minHeight: 34, padding: "6px 13px", fontSize: 12.5 }}
        >
          رزرو جلسه
        </Button>
      </div>
    </div>
  );
}
