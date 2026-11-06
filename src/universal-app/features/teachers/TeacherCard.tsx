"use client";

import type { KeyboardEvent } from "react";
import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import { Button, Icon, colors, typography } from "../../ui";
import type { Teacher } from "./types";

/* تیک نشان درجه استاد — سبک مهر اینستاگرام؛ رنگ مهر درجه را نشان می‌دهد */
const TIER_BADGES: Record<string, { color: string; label: string }> = {
  international: { color: "#0095F6", label: "استاد بین‌المللی (درجه ۱)" },
  grade2: { color: "#1EA55C", label: "استاد درجه ۲" },
  grade3: { color: "#E5484D", label: "استاد درجه ۳" },
};

function TierBadge({ tier, size = 15 }: { tier: string; size?: number }) {
  const badge = TIER_BADGES[tier];
  if (!badge) return null;
  return (
    <span aria-label={badge.label} title={badge.label} style={{ display: "inline-flex", flex: "0 0 auto" }}>
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill={badge.color}
          d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.113a2.89 2.89 0 0 0-3.494 3.482l.114.89-.637.622a2.89 2.89 0 0 0 0 4.134l.637.622-.114.89a2.89 2.89 0 0 0 3.494 3.494l.89-.114.622.637a2.89 2.89 0 0 0 4.134 0l.622-.638.89.114a2.89 2.89 0 0 0 3.494-3.494l-.114-.891.637-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.114-.89a2.89 2.89 0 0 0-3.494-3.494l-.89.114-.622-.637z"
        />
        <path
          fill="none"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m5.2 8.2 1.9 1.9 3.5-4"
        />
      </svg>
    </span>
  );
}

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
  const goToTeacher = () => navigateApp(`/teacher/${teacher.id}`, config);
  const priceFrom = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(
    Math.max(0, teacher.price30 / 1000),
  );

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    goToTeacher();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="vodda-card vodda-card--interactive vodda-tappable"
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
            }}
          >
            {teacher.avatarUrl ? (
              <img
                src={teacher.avatarUrl}
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
            className={teacher.available ? "vodda-live-dot" : undefined}
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
          {teacher.rating.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}
          {teacher.reviews > 0 ? (
            <span style={{ fontWeight: 600 }}>({teacher.reviews.toLocaleString("fa-IR")})</span>
          ) : null}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2, minWidth: 0 }}>
          <Icon name="pin" size={13} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teacher.city}</span>
        </span>
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: colors.inkMuted }}>
        <Icon name="award" size={12} />
        {teacher.sessions.toLocaleString("fa-IR")} جلسهٔ موفق
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
