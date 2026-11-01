"use client";

import type { KeyboardEvent } from "react";
import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import { Avatar, Button, Icon, colors, typography } from "../../ui";
import type { Teacher } from "./types";

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
        display: "grid",
        gap: 12,
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
          <Avatar name={teacher.name} size={54} ring />
          {teacher.verified ? (
            <span
              aria-label="استاد تأییدشده"
              style={{
                position: "absolute",
                insetInlineEnd: -1,
                bottom: 0,
                width: 20,
                height: 20,
                display: "grid",
                placeItems: "center",
                border: "2px solid " + colors.surface,
                borderRadius: "50%",
                color: colors.surface,
                background: colors.olive600,
              }}
            >
              <Icon name="check" size={10} stroke={2.4} />
            </span>
          ) : null}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong
            style={{
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            {teacher.name}
          </strong>
          <span
            style={{
              display: "block",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 12,
              fontWeight: 600,
              color: colors.olive600,
            }}
          >
            {teacher.tag}
          </span>
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
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: colors.gold, fontWeight: 800 }}>
          <Icon name="star" size={16} fill />
          {teacher.rating.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 2, minWidth: 0 }}>
          <Icon name="pin" size={14} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teacher.city}</span>
        </span>
        <span style={{ whiteSpace: "nowrap" }}>{teacher.sessions.toLocaleString("fa-IR")} جلسه</span>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
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
          style={{ minHeight: 36, padding: "7px 14px", fontSize: 13 }}
        >
          رزرو جلسه
        </Button>
      </div>
    </div>
  );
}
