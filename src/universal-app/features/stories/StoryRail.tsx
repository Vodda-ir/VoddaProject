"use client";

import { useMemo } from "react";
import { Icon, colors, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { useMinWidth } from "../../ui/useMediaQuery";
import { localizedDigits } from "../../ui/persian";
import { resolveAssetUrl } from "../../platform/asset";
import type { Story } from "./api";

/* ═══ E1/E2 — ریل استوری‌های وُدّا ═══
 * به جای کادر دایره‌ای اینستاگرام — کادر **مربعی** با حاشیهٔ گرادیان طلایی برند.
 * استوری‌های خود کاربر (ادمین/استاد) هرکدام **کاشی جداگانه** می‌گیرند تا هر انتشار
 * مستقل دیده شود؛ استوری‌های دیگران به‌ازای هر نویسنده یک کاشی با نشان تعداد.
 * برچسب نام زیر کاشی — استادی‌ها مُهر آواتار مربعی کم‌حجم روی تصویر می‌گیرند.
 * کاشی «+» فقط برای مدیر و اساتید؛ استوری دیده‌شده حاشیهٔ کم‌رنگ می‌گیرد. */

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
    if (seen.includes(id)) return;
    const next = [...seen, id].slice(-200);
    window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* حافظهٔ محلی در دسترس نیست — اهمیتی ندارد */
  }
}

type StoryTile =
  | { kind: "own"; story: Story; index: number }
  | { kind: "author"; author: Story["author"]; stories: Story[]; index: number };

export function StoryTileFrame({
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

function AuthorStamp({ avatar, name, size }: { avatar: string; name: string; size: number }) {
  const stamp = Math.round(size * 0.34);
  const resolved = resolveAssetUrl(avatar);
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: 4,
        insetInlineStart: 4,
        width: stamp,
        height: stamp,
        padding: 1.5,
        borderRadius: Math.round(stamp * 0.3),
        background: "linear-gradient(135deg, #bf9540, #e9cf8f 55%, #bf9540)",
        border: "1.5px solid rgba(255,253,246,.9)",
        boxShadow: "0 2px 6px rgba(24,32,18,.35)",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      {resolved ? (
        <img
          src={resolved}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: Math.round(stamp * 0.3) - 3 }}
        />
      ) : (
        <Icon name="user" size={Math.round(stamp * 0.55)} stroke={2.2} style={{ color: "#fffdf6" }} />
      )}
      <span className="sr-only">{name}</span>
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
  myRole,
  myAuthorId,
  seenRefreshKey,
  onOpen,
  onCompose,
}: {
  stories: Story[];
  loading: boolean;
  /** نقش کاربر فعلی — «admin» / «teacher» / «learner» / '' (ناشناس) */
  myRole: string;
  /** شناسهٔ نویسندهٔ جلسهٔ فعلی — استوری‌های خودش کاشی جداگانه می‌گیرند */
  myAuthorId: string;
  seenRefreshKey: number;
  onOpen: (index: number) => void;
  onCompose: () => void;
}) {
  const { L } = useAppearance();
  const wide = useMinWidth(768);
  const size = wide ? 76 : 64;

  const seenSet = useMemo(() => new Set(readSeenStoryIds()), [seenRefreshKey]);

  /* کاشی‌ها — استوری‌های خودم هرکدام جدا؛ دیگران به‌ازای هر نویسنده یک کاشی */
  const tiles = useMemo<StoryTile[]>(() => {
    if (stories.length === 0) return [];
    const mine: StoryTile[] = [];
    const byAuthor = new Map<string, Story[]>();
    for (let index = 0; index < stories.length; index += 1) {
      const story = stories[index];
      if (myAuthorId && story.author.id === myAuthorId) {
        mine.push({ kind: "own", story, index });
        continue;
      }
      const group = byAuthor.get(story.author.id) ?? [];
      group.push(story);
      byAuthor.set(story.author.id, group);
    }
    // گروه‌ها به ترتیب جدیدترین استوری هر نویسنده
    const authorTiles: StoryTile[] = [...byAuthor.entries()]
      .sort((left, right) => Date.parse(right[1][0].createdAt) - Date.parse(left[1][0].createdAt))
      .map(([authorId, group]) => ({
        kind: "author" as const,
        author: group[0].author,
        stories: group,
        index: stories.findIndex((story) => story.id === group[0].id),
      }));
    return [...mine, ...authorTiles];
  }, [stories, myAuthorId]);

  if (loading && stories.length === 0) {
    return (
      <section aria-label={L("استوری وُدّا")} style={{ display: "flex", gap: 10, minWidth: 0 }} className="vodda-enter">
        {[0, 1, 2].map((index) => (
          <TileSkeleton key={index} size={size} />
        ))}
      </section>
    );
  }

  const canPublish = myRole === "admin" || myRole === "teacher";

  /* بدون استوری: مدیر/استاد کاشی انتشار می‌بیند؛ کاربر عادی هیچ (مثل اینستاگرام). */
  if (stories.length === 0 && !canPublish) return null;
  if (tiles.length === 0 && !canPublish) return null;

  return (
    <section aria-label={L("استوری وُدّا")} className="vodda-enter" style={{ minWidth: 0 }}>
      <div
        className="vodda-scroll-rail"
        style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4, minWidth: 0 }}
      >
        {canPublish ? (
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
              border: `2px dashed ${colors.gold}`,
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

        {tiles.map((tile, tileIndex) => {
          const latest = tile.kind === "own" ? tile.story : tile.stories[0];
          const label =
            tile.kind === "own" ? L("استوری شما") : tile.author.name || L("استوری وُدّا");
          const isBrand = tile.kind === "author" && tile.author.role === "admin";
          const seen =
            tile.kind === "own"
              ? seenSet.has(tile.story.id)
              : tile.stories.every((story) => seenSet.has(story.id));
          const count = tile.kind === "author" ? tile.stories.length : 0;
          return (
            <button
              key={tile.kind === "own" ? `own-${tile.story.id}` : `author-${tile.author.id}`}
              type="button"
              onClick={() => onOpen(tile.index)}
              aria-label={
                tile.kind === "own"
                  ? `${label} — ${timeAgoShort(tile.story.createdAt)}`
                  : `${label} — ${localizedDigits(count, "fa")} ${L("استوری")}`
              }
              className="vodda-tappable"
              style={{
                flex: "0 0 auto",
                padding: 0,
                border: 0,
                background: "transparent",
                cursor: "pointer",
                position: "relative",
                display: "grid",
                justifyItems: "center",
                gap: 3,
                animationDelay: `${Math.min(tileIndex * 40, 240)}ms`,
              }}
            >
              <StoryTileFrame size={size} seen={seen} glow={!seen}>
                <img
                  src={latest.mediaUrl}
                  alt={latest.caption || label}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                {!isBrand && tile.kind === "author" ? (
                  <AuthorStamp avatar={tile.author.avatar} name={label} size={size} />
                ) : null}
              </StoryTileFrame>
              {count > 1 ? (
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
                  {localizedDigits(count, "fa")}
                </span>
              ) : null}
              <span
                aria-hidden="true"
                style={{
                  maxWidth: size + 16,
                  fontSize: 10,
                  fontWeight: 700,
                  color: seen ? colors.inkMuted : colors.ink,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontFamily: typography.fontFamily,
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function timeAgoShort(iso: string): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return "";
  const minutes = Math.max(1, Math.floor((Date.now() - at) / 60000));
  if (minutes < 60) return `${localizedDigits(minutes, "fa")} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${localizedDigits(hours, "fa")} ساعت پیش`;
  return `${localizedDigits(Math.floor(hours / 24), "fa")} روز پیش`;
}
