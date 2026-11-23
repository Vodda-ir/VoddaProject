"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlatformRuntime } from "../../platform/types";
import { Icon, colors, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { localizedDigits } from "../../ui/persian";
import { resolveAssetUrl } from "../../platform/asset";
import { markStoryView, removeStory, type Story } from "./api";
import { readSeenStoryIds } from "./StoryRail";

/* ═══ E1 — نمایشگر تمام‌صفحهٔ استوری (عملکرد اینستاگرامی) ═══
 * نوارهای پیشرفت پلکانی، چرخش خودکار ۵ ثانیه، تپ به دو نیمهٔ تصویر (قبلی/بعدی
 * با آینه‌سازی RTL)، نگه‌داشتن = توقف، دکمهٔ بستن، شمارش بازدید و حذف برای مدیر.
 * تصویر مربعی‌حاشیهٔ طلایی داخل صحنهٔ تاریک شیشه‌ای برند. */

const STORY_DURATION_MS = 5000;
const HOLD_MS = 260;

function timeAgoLabel(iso: string, lang: "fa" | "en"): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return "";
  const minutes = Math.max(1, Math.floor((Date.now() - at) / 60000));
  if (minutes < 2) return lang === "en" ? "just now" : "همین حالا";
  if (minutes < 60) return lang === "en" ? `${minutes}m ago` : `${localizedDigits(minutes, "fa")} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === "en" ? `${hours}h ago` : `${localizedDigits(hours, "fa")} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 7) return lang === "en" ? `${days}d ago` : `${localizedDigits(days, "fa")} روز پیش`;
  return lang === "en" ? "last week" : "هفتهٔ پیش";
}

function EyeGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "0 0 auto", display: "block" }}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function StoryViewer({
  stories,
  startIndex,
  runtime,
  myRole,
  myAuthorId,
  onClose,
  onSeen,
  onDeleted,
}: {
  stories: Story[];
  startIndex: number;
  runtime: PlatformRuntime;
  /** نقش جلسهٔ فعلی — «admin» دید آمار/حذف همه را می‌دهد */
  myRole: string;
  /** شناسهٔ نویسندهٔ جلسه — صاحب استوری هم آمار/حذف استوری خودش را می‌بیند */
  myAuthorId: string;
  onClose: () => void;
  onSeen: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const { L, lang } = useAppearance();
  const rtl = lang !== "en";
  /* مدیریت استوری فعلی — ادمین: همه؛ استاد: استوری خودش */
  const canManage = (story: Story) => myRole === "admin" || (Boolean(myAuthorId) && story.author.id === myAuthorId);
  /* ترتیب پخش اینستاگرامی — قدیمی‌ترین نخست؛ ریل بندانگشتیِ جدیدترین را نشان می‌دهد */
  const ordered = useMemo(
    () => [...stories].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt)),
    [stories],
  );
  const [index, setIndex] = useState(() => {
    /* پخش اینستاگرامی — از نخستین دیده‌نشده (قدیمی‌ترین) آغاز می‌شود؛ اگر همه
     * دیده شده باشند، روی استوری لنگرِ ریل (جدیدترین) می‌ماند. */
    const seen = new Set(readSeenStoryIds());
    const firstUnseen = ordered.findIndex((item) => !seen.has(item.id));
    if (firstUnseen >= 0) return firstUnseen;
    const anchor = stories[Math.min(Math.max(0, startIndex), Math.max(0, stories.length - 1))];
    const mapped = anchor ? ordered.findIndex((item) => item.id === anchor.id) : 0;
    return Math.max(0, mapped);
  });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fillRef = useRef<HTMLSpanElement | null>(null);
  const startedAtRef = useRef<number>(0);
  const pausedOffsetRef = useRef<number>(0);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const seenRef = useRef<Set<string>>(new Set());

  const goNext = useCallback(() => {
    setIndex((current) => {
      if (current >= ordered.length - 1) {
        onClose();
        return current;
      }
      return current + 1;
    });
  }, [ordered.length, onClose]);

  const goPrev = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  /* حلقهٔ نوار پیشرفت — بدون رندر مجدد React (مستقیم روی DOM) */
  useEffect(() => {
    startedAtRef.current = performance.now();
    pausedOffsetRef.current = 0;
    const story = ordered[index];
    if (!story) return;
    if (!seenRef.current.has(story.id)) {
      seenRef.current.add(story.id);
      onSeen(story.id);
      void markStoryView(runtime, story.id);
    }

    const tick = () => {
      if (holdStartRef.current === null) {
        const elapsed = pausedOffsetRef.current + (performance.now() - startedAtRef.current);
        const ratio = Math.min(1, elapsed / STORY_DURATION_MS);
        if (fillRef.current) fillRef.current.style.width = `${(ratio * 100).toFixed(1)}%`;
        if (ratio >= 1) {
          goNext();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [index, stories, goNext, onSeen, runtime]);

  /* قفل اسکرول بدنه + کلید Escape */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const story = ordered[index];
  if (!story) return null;

  /* نگه‌داشتن = توقف؛ تپ کوتاه = نیمهٔ آغازین قبلی / نیمهٔ پایانی بعدی (آینهٔ RTL) */
  function handlePointerDown() {
    holdStartRef.current = performance.now();
  }
  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const holdStart = holdStartRef.current;
    holdStartRef.current = null;
    if (holdStart === null) return;
    if (performance.now() - holdStart >= HOLD_MS) {
      pausedOffsetRef.current += performance.now() - holdStart;
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const startHalf = event.clientX - bounds.left < bounds.width / 2;
    const isStart = rtl ? !startHalf : startHalf;
    if (isStart) goPrev();
    else goNext();
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    const removed = await removeStory(runtime, story.id);
    setDeleting(false);
    setConfirmingDelete(false);
    if (removed) onDeleted(story.id);
    else onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={L("نمایش استوری وُدّا")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "flex",
        flexDirection: "column",
        background: "rgba(24, 28, 16, .94)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        color: "#fffdf6",
        fontFamily: typography.fontFamily,
      }}
    >
      {/* نوارهای پیشرفت پلکانی */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: "max(12px, env(safe-area-inset-top)) 14px 0",
          minWidth: 0,
        }}
      >
        {ordered.map((item, itemIndex) => (
          <span
            key={item.id}
            aria-hidden="true"
            style={{
              flex: 1,
              height: 3,
              borderRadius: 999,
              background: itemIndex < index ? "#fffdf6" : "rgba(255,253,246,.28)",
              overflow: "hidden",
              display: "block",
            }}
          >
            {itemIndex === index ? (
              <span
                ref={fillRef}
                style={{
                  display: "block",
                  height: "100%",
                  width: "0%",
                  background: "linear-gradient(90deg, #fffdf6, #f0e2bb)",
                  borderRadius: 999,
                }}
              />
            ) : null}
          </span>
        ))}
      </div>

      {/* سربرگ: مهر مربعی نویسنده + نام و زمان + شمار بازدید صاحب استوری + حذف + بستن */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 8px", minWidth: 0 }}>
        <span
          style={{
            display: "inline-flex",
            padding: 2,
            borderRadius: 9,
            background: "linear-gradient(135deg, #bf9540, #e9cf8f 55%, #bf9540)",
            flex: "0 0 auto",
          }}
        >
          <img
            src={story.author.avatar ? resolveAssetUrl(story.author.avatar) ?? story.mediaUrl : story.mediaUrl}
            alt=""
            style={{ width: 30, height: 30, borderRadius: 7, objectFit: "cover", display: "block", border: "1.5px solid #fffdf6" }}
          />
        </span>
        <span style={{ flex: "1 1 auto", minWidth: 0, display: "grid", gap: 1 }}>
          <strong style={{ fontSize: 13.5, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {story.author.name || L("وُدّا")}
          </strong>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "rgba(255,253,246,.72)" }}>
            {timeAgoLabel(story.createdAt, lang)}
          </span>
        </span>

        {canManage(story) ? (
          <span
            title={L("شمار بازدید")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 9px",
              borderRadius: 999,
              background: "rgba(255,253,246,.12)",
              border: "1px solid rgba(255,253,246,.22)",
              fontSize: 11,
              fontWeight: 800,
              flex: "0 0 auto",
            }}
          >
            <EyeGlyph />
            {localizedDigits(story.views, "fa")}
          </span>
        ) : null}

        {canManage(story) ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label={confirmingDelete ? L("تأیید حذف استوری") : L("حذف استوری")}
            className="vodda-tappable"
            style={{
              width: 34,
              height: 34,
              display: "grid",
              placeItems: "center",
              padding: 0,
              borderRadius: "50%",
              border: `1px solid ${confirmingDelete ? "rgba(255,120,120,.55)" : "rgba(255,253,246,.22)"}`,
              background: confirmingDelete ? "rgba(166,81,81,.35)" : "rgba(255,253,246,.12)",
              color: confirmingDelete ? "#ffd6d6" : "#fffdf6",
              cursor: "pointer",
              flex: "0 0 auto",
            }}
          >
            <Icon name={confirmingDelete ? "check" : "trash"} size={15} stroke={2} />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          aria-label={L("بستن استوری")}
          className="vodda-tappable"
          style={{
            width: 34,
            height: 34,
            display: "grid",
            placeItems: "center",
            padding: 0,
            borderRadius: "50%",
            border: "1px solid rgba(255,253,246,.22)",
            background: "rgba(255,253,246,.12)",
            color: "#fffdf6",
            cursor: "pointer",
            flex: "0 0 auto",
          }}
        >
          <Icon name="x" size={16} stroke={2.1} />
        </button>
      </div>

      {/* صحنهٔ تصویر — نیمهٔ آغازین قبلی، نیمهٔ پایانی بعدی؛ نگه‌داشتن = توقف */}
      <div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          holdStartRef.current = null;
        }}
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "grid",
          placeItems: "center",
          padding: "10px 18px",
          cursor: "pointer",
          touchAction: "none",
        }}
      >
        <span
          style={{
            display: "block",
            maxWidth: "min(100%, 560px)",
            maxHeight: "100%",
            borderRadius: 18,
            overflow: "hidden",
            border: "1.5px solid rgba(191,149,64,.4)",
            boxShadow: "0 18px 44px rgba(0,0,0,.4), 0 0 22px rgba(191,149,64,.14)",
            background: "#12160c",
            lineHeight: 0,
          }}
        >
          <img
            key={story.id}
            src={story.mediaUrl}
            alt={story.caption || L("استوری وُدّا")}
            draggable={false}
            style={{
              maxWidth: "100%",
              maxHeight: "calc(100dvh - 210px)",
              objectFit: "contain",
              display: "block",
              margin: "0 auto",
            }}
          />
        </span>
      </div>

      {/* زیرنویس + پیوند CTA */}
      {(story.caption || story.link) && (
        <div
          style={{
            padding: "6px 18px max(16px, env(safe-area-inset-bottom))",
            display: "grid",
            gap: 10,
            justifyItems: "center",
            textAlign: "center",
          }}
        >
          {story.caption ? (
            <p
              style={{
                margin: 0,
                maxWidth: 520,
                fontSize: 14,
                fontWeight: 700,
                lineHeight: 1.9,
                color: "#fffdf6",
                overflowWrap: "anywhere",
              }}
            >
              {story.caption}
            </p>
          ) : null}
          {story.link ? (
            <a
              href={story.link}
              target="_blank"
              rel="noopener noreferrer"
              className="vodda-tappable"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "10px 22px",
                borderRadius: 999,
                background: "linear-gradient(135deg, #bf9540, #d8b869)",
                color: "#221a08",
                fontSize: 13,
                fontWeight: 900,
                textDecoration: "none",
                boxShadow: "0 6px 16px rgba(139,104,31,.4)",
              }}
            >
              {L("مشاهده")}
              <Icon name="arrowUpRight" size={14} stroke={2.2} />
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
