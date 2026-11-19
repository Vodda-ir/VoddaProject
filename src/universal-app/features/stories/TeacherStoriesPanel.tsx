"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlatform } from "../../platform/context";
import { Icon, SectionHeader, colors, spacing, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { localizedDigits } from "../../ui/persian";
import { fetchStoriesFeed, type Story } from "./api";
import { markStorySeen, StoryTileFrame } from "./StoryRail";
import { StoryViewer } from "./StoryViewer";
import { StoryComposer } from "./StoryComposer";

/* ═══ E2 — پنل استوری داشبورد استاد ═══
 * استاد از همین‌جا تصویر منتشر می‌کند (فشرده‌سازی خودکار سمت کلاینت؛ ۲۴ ساعت اعتبار).
 * استوری‌ها فقط برای دنبال‌کننده‌های استاد باز می‌شود؛ کاشی‌های مربعی حاشیهٔ طلایی
 * هر استوری جداگانه + شمار بازدید و حذف دومرحله‌ای در نمایشگر. */

export function TeacherStoriesPanel() {
  const runtime = usePlatform();
  const { L } = useAppearance();
  const [feed, setFeed] = useState<{ stories: Story[]; myAuthorId: string; myRole: string }>({
    stories: [],
    myAuthorId: "",
    myRole: "",
  });
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const loadStories = useCallback(async () => {
    setLoading(true);
    const result = await fetchStoriesFeed(runtime);
    setFeed(result);
    setLoading(false);
  }, [runtime]);

  useEffect(() => {
    void loadStories();
  }, [loadStories]);

  const myStories = feed.stories.filter((story) => story.author.id === feed.myAuthorId);
  const isTeacher = feed.myRole === "teacher";
  const totalViews = myStories.reduce((sum, story) => sum + story.views, 0);

  return (
    <section
      aria-label={L("استوری‌های من")}
      className="vodda-enter"
      style={{
        display: "grid",
        gap: spacing.sm,
        padding: 16,
        borderRadius: 24,
        border: "1.5px solid " + colors.goldSoft,
        background: "linear-gradient(150deg, rgba(191,149,64,.10), rgba(255,253,246,.65) 55%)",
        boxShadow: "0 8px 22px rgba(46,54,34,.08)",
        minWidth: 0,
      }}
    >
      <SectionHeader
        title={L("استوری‌های من")}
        description={
          isTeacher
            ? L("فقط تصویر · فشرده‌سازی خودکار · فقط دنبال‌کننده‌های شما می‌بینند")
            : L("تصویر · ۲۴ ساعت اعتبار")
        }
      />

      {loading ? (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
          {[0, 1].map((index) => (
            <span
              key={index}
              aria-hidden="true"
              className="vodda-skeleton"
              style={{ width: 74, height: 74, borderRadius: 18, flex: "0 0 auto" }}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4, minWidth: 0 }} className="vodda-scroll-rail">
          {/* کاشی انتشار — همیشه برای استاد/مدیر */}
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            aria-label={L("انتشار استوری جدید")}
            className="vodda-tappable"
            style={{
              flex: "0 0 auto",
              width: 68,
              height: 68,
              borderRadius: 17,
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
            <Icon name="plus" size={26} stroke={2.2} />
          </button>

          {/* هر استوری خودم یک کاشی جدا — همان خواستهٔ «هر استوری مستقل نمایش داده شود» */}
          {myStories.map((story, index) => (
            <button
              key={story.id}
              type="button"
              onClick={() => {
                const flat = feed.stories.findIndex((item) => item.id === story.id);
                setViewerIndex(flat >= 0 ? flat : index);
              }}
              aria-label={`${L("استوری شما")} — ${localizedDigits(story.views, "fa")} ${L("بازدید")}`}
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
              }}
            >
              <StoryTileFrame size={68} seen={false} glow>
                <img
                  src={story.mediaUrl}
                  alt={story.caption || L("استوری شما")}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </StoryTileFrame>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: colors.inkMuted,
                  fontFamily: typography.fontFamily,
                }}
              >
                {localizedDigits(story.views, "fa")} {L("بازدید")}
              </span>
            </button>
          ))}

          {myStories.length === 0 ? (
            <span
              style={{
                display: "grid",
                alignContent: "center",
                gap: 2,
                fontSize: 12,
                fontWeight: 700,
                color: colors.inkMuted,
                fontFamily: typography.fontFamily,
                padding: "0 6px",
              }}
            >
              {L("هنوز استوری منتشر نکرده‌اید")}
            </span>
          ) : null}
        </div>
      )}

      {myStories.length > 0 ? (
        <span style={{ fontSize: 10.5, fontWeight: 700, color: colors.inkMuted, fontFamily: typography.fontFamily }}>
          {localizedDigits(myStories.length, "fa")} {L("استوری فعال")} · {localizedDigits(totalViews, "fa")} {L("بازدید کل")}
        </span>
      ) : null}

      {viewerIndex !== null && feed.stories.length > 0 ? (
        <StoryViewer
          stories={feed.stories}
          startIndex={viewerIndex}
          runtime={runtime}
          myRole={feed.myRole}
          myAuthorId={feed.myAuthorId}
          onClose={() => setViewerIndex(null)}
          onSeen={(id) => markStorySeen(id)}
          onDeleted={(id) => {
            setFeed((current) => ({ ...current, stories: current.stories.filter((story) => story.id !== id) }));
            setViewerIndex(null);
          }}
        />
      ) : null}

      <StoryComposer
        open={composerOpen}
        runtime={runtime}
        mode={isTeacher ? "teacher" : "admin"}
        onClose={() => setComposerOpen(false)}
        onPublished={() => {
          setComposerOpen(false);
          void loadStories();
        }}
      />
    </section>
  );
}
