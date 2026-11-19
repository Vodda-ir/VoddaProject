"use client";

import { useMemo } from "react";
import type { PlatformRuntime } from "../../platform/types";
import { Icon, colors, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { useMinWidth } from "../../ui/useMediaQuery";
import { localizedDigits } from "../../ui/persian";
import type { Story } from "./api";

/* ═══ E1 — ریل استوری‌های وُدّا (مدیر‌محور) ═══
 * به جای کادر دایره‌ای اینستاگرام — کادر **مربعی** با حاشیهٔ گرادیان طلایی برند
 * (هم‌خانوادهٔ قاب آواتار کارت استاد). استوری دیده‌شده حاشیهٔ کم‌رنگ می‌گیرد.
 * کاشی «+» فقط برای مدیر سامانه نمایش داده می‌شود؛ برای بقیه فقط مشاهده. */

const SEEN_STORAGE_KEY = "vodda_story_seen";

export function readSeenStoryIds(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(-200) : [];
  } catch {
    return [];
  }
}

export function markStorySeen(id: string): void {
  try {
    const seen = readSeenStoryIds();
    if (!seen.includes(id)) {
      const next = [...seen, id].slice(-200);
      window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    /* حافظهٔ محلی در دسترس نیست — اهمیتی ندارد */
  }
}

function StoryTileFrame({
  size,
  seen,
  children,
  glow,
}: {
  size: number;
  seen: boolean;
  children: React.ReactNode;
  glow?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        padding: 2.5,
        borderRadius: Math.round(size * 0.24),
        background: seen
          ? "linear-gradient(135deg, #b0a98f, #cdc7b2 55%, #b0a98f)"
          : "linear-gradient(135deg, #bf9540 0%, #e9cf8f 50%, #bf9540 100%)",
        boxShadow: seen
          ? "none"
          : glow
            ? "0 0 12px rgba(191,149,64,.38), 0 3px 8px rgba(46,54,34,.10)"
            : "0 0 8px rgba(191,149,64,.22)",
        flex: "0 0 auto",
      }}
    >
      <span
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.24) - 3,
          border: "2px solid #fffdf6",
          overflow: "hidden",
          display: "block",
          background: colors.sand100,
        }}
      >
        {children}
      </span>
    </span>
  );
}

function TileSkeleton({ size }: { size: number }) {
  return (
    <span
      aria-hidden="true"
      className="vodda-skeleton"
      style={{ display: "block", width: size + 5, height: size + 5, borderRadius: Math.round(size * 0.24), flex: "0 0 auto" }}
    />
  );
}

export function StoryRail({
  stories,
  loading,
  isAdmin,
  seenRefreshKey,
  onOpen,
  onCompose,
}: {
  stories: Story[];
  loading: boolean;
  isAdmin: boolean;
  seenRefreshKey: number;
  onOpen: (index: number) => void;
  onCompose: () => void;
}) {
  const { L } = useAppearance();
  const wide = useMinWidth(768);
  const size = wide ? 76 : 64;

  const seenSet = useMemo(() => new Set(readSeenStoryIds()), [seenRefreshKey]);

  if (loading && stories.length === 0) {
    return (
      <section aria-label={L("استوری وُدّا")} style={{ display: "flex", gap: 10, minWidth: 0 }} className="vodda-enter">
        {[0, 1].map((index) => (
          <TileSkeleton key={index} size={size} />
        ))}
      </section>
    );
  }

  /* بدون استوری: مدیر کاشی انتشار می‌بیند؛ کاربر عادی هیچ (مثل اینستاگرام). */
  if (stories.length === 0 && !isAdmin) return null;

  const latest = stories[0];
  const hasUnseen = stories.some((story) => !seenSet.has(story.id));

  return (
    <section aria-label={L("استوری وُدّا")} className="vodda-enter" style={{ minWidth: 0 }}>
      <div
        className="vodda-scroll-rail"
        style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4, minWidth: 0 }}
      >
        {isAdmin ? (
          <button
            type="button"
            onClick={onCompose}
            aria-label={L("انتشار استوری جدید")}
            className="vodda-tappable"
            style={{
              flex: "0 0 auto",
              width: size,
              height: size,
              borderRadius: Math.round(size * 0.24),
              border: `2px dashed ${hasUnseen ? colors.gold : colors.goldSoft}`,
              background: colors.goldSurface,
              color: colors.goldDark,
              display: "grid",
              placeItems: "center",
              padding: 0,
              cursor: "pointer",
              marginTop: 2.5,
              marginBottom: 2.5,
            }}
          >
            <Icon name="plus" size={Math.round(size * 0.4)} stroke={2.2} />
          </button>
        ) : null}

        {latest ? (
          <button
            type="button"
            onClick={() => onOpen(0)}
            aria-label={`${L("استوری وُدّا")} — ${localizedDigits(stories.length, "fa")} ${L("استوری")}`}
            className="vodda-tappable"
            style={{
              flex: "0 0 auto",
              padding: 0,
              border: 0,
              background: "transparent",
              cursor: "pointer",
              position: "relative",
              display: "block",
            }}
          >
            <StoryTileFrame size={size} seen={stories.every((story) => seenSet.has(story.id))} glow={hasUnseen}>
              <img
                src={latest.mediaUrl}
                alt={latest.caption || L("استوری وُدّا")}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </StoryTileFrame>
            {stories.length > 1 ? (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: -3,
                  insetInlineEnd: -3,
                  minWidth: 20,
                  height: 20,
                  padding: "0 5px",
                  borderRadius: 999,
                  background: "linear-gradient(135deg, #bf9540, #d8b869)",
                  color: "#fffdf6",
                  fontSize: 10.5,
                  fontWeight: 900,
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "0 2px 6px rgba(139,104,31,.35)",
                  fontFamily: typography.fontFamily,
                }}
              >
                {localizedDigits(stories.length, "fa")}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>
    </section>
  );
}
