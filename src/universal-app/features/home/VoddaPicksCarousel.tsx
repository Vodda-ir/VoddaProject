"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import { Icon, colors, spacing, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { useMinWidth } from "../../ui/useMediaQuery";
import { TeacherCard } from "../teachers/TeacherCard";
import type { Teacher } from "../teachers/types";

/* ═══ ۱.۱ — «پیشنهاد وُدّا» — کروسل یکپارچهٔ اساتید برتر + پیشنهادی ═══
 * به‌جای دو ردیف جدا (اساتید برتر + اساتید پیشنهادی)، یک کروسل خوش‌رنگ با
 * قاب طلایی و گرادیان کرم: اسلاید ۱ کارت مربعی در موبایل (با پیش‌نمای لبه)
 * و ۲ کارت در دسکتاپ؛ فلش + نقطه‌گذار + چرخش خودکار ۴.۵ ثانیه با توقف هنگام
 * تعامل کاربر. کارت‌ها همان کارت یکدست TeacherCard (۰.۹.۲) هستند. */

const AUTOPLAY_MS = 4500;
const INTERACTION_PAUSE_MS = 9000;

function SlideSkeleton({ style }: { style?: CSSProperties }) {
  return <span aria-hidden="true" className="vodda-skeleton" style={{ display: "block", borderRadius: 20, ...style }} />;
}

export function VoddaPicksCarousel({
  teachers,
  loading,
  wide,
  config,
}: {
  teachers: Teacher[];
  loading: boolean;
  wide: boolean;
  config: UniversalAppConfig;
}) {
  const { L, lang } = useAppearance();
  const wideAuto = useMinWidth(768);
  const isWide = wide ?? wideAuto;
  const rtl = lang !== "en";

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canStart, setCanStart] = useState(false);
  const [canEnd, setCanEnd] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const pausedRef = useRef(false);
  const pauseTimerRef = useRef<number | null>(null);

  const slides = teachers;

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const hidden = el.scrollWidth - el.clientWidth;
    if (hidden <= 8) {
      setCanStart(false);
      setCanEnd(false);
      setActiveIndex(0);
      return;
    }
    /* RTL و LTR — فاصلهٔ طی‌شده از لبهٔ شروع = قدرمطلق scrollLeft */
    const position = Math.abs(el.scrollLeft);
    const step = slideStep(el);
    setCanEnd(position < hidden - 8);
    setCanStart(position > 8);
    setActiveIndex(step > 0 ? Math.min(slides.length - 1, Math.round(position / step)) : 0);
  }, [slides.length]);

  /* گام هر اسلاید = عرض اولین اسلاید + فاصلهٔ بین اسلایدها */
  function slideStep(el: HTMLDivElement): number {
    const first = el.firstElementChild as HTMLElement | null;
    if (!first) return 0;
    const styles = window.getComputedStyle(el);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    return first.getBoundingClientRect().width + gap;
  }

  /* بعد از هر رندر — محتوا ممکن است از اسکلت به کارت تبدیل شده باشد */
  useEffect(() => {
    measure();
  });

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const scrollBySlide = useCallback(
    (direction: "next" | "prev" | "start") => {
      const el = trackRef.current;
      if (!el) return;
      if (direction === "start") {
        el.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      const step = slideStep(el);
      if (step <= 0) return;
      const delta = direction === "next" ? -step : step;
      el.scrollBy({ left: rtl ? delta : -delta, behavior: "smooth" });
    },
    [rtl],
  );

  /* چرخش خودکار — با توقف هنگام هاور/لمس/تمرکز و در پس‌زمینهٔ پنهان */
  useEffect(() => {
    if (loading || slides.length < 2) return;
    const timer = window.setInterval(() => {
      if (pausedRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (canEnd) scrollBySlide("next");
      else scrollBySlide("start");
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [loading, slides.length, canEnd, scrollBySlide]);

  const markInteraction = useCallback(() => {
    pausedRef.current = true;
    if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = window.setTimeout(() => {
      pausedRef.current = false;
    }, INTERACTION_PAUSE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current) window.clearTimeout(pauseTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <section aria-label={L("در حال بارگذاری پیشنهادها")} style={{ display: "grid", gap: 12, minWidth: 0 }}>
        <SlideSkeleton style={{ width: 170, height: 20 }} />
        <div
          style={{
            borderRadius: 24,
            border: `1.2px solid ${colors.goldSoft}`,
            background: "linear-gradient(165deg, #fffdf6 0%, #faf3e0 55%, #f5ecd4 100%)",
            padding: isWide ? 16 : 12,
            boxShadow: "0 10px 26px rgba(46,54,34,.08), 0 0 16px rgba(191,149,64,.12)",
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", gap: 10, overflow: "hidden" }}>
            {Array.from({ length: 2 }).map((_, index) => (
              <SlideSkeleton key={index} style={{ width: isWide ? "calc(50% - 5px)" : "calc(100% - 26px)", minHeight: isWide ? 256 : 286, flex: "0 0 auto" }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (slides.length === 0) return null;

  const showControls = slides.length > 1;

  return (
    <section aria-label={L("پیشنهاد وُدّا")} style={{ display: "grid", gap: spacing.sm, minWidth: 0 }}>
      <div
        style={{
          borderRadius: 24,
          border: `1.2px solid ${colors.goldSoft}`,
          background: "linear-gradient(165deg, #fffdf6 0%, #faf3e0 55%, #f5ecd4 100%)",
          padding: isWide ? 18 : 12,
          boxShadow: "0 10px 26px rgba(46,54,34,.08), 0 0 16px rgba(191,149,64,.12)",
          minWidth: 0,
          display: "grid",
          gap: 12,
        }}
      >
        {/* سربرگ کروسل: نشان ستارهٔ طلایی + عنوان «پیشنهاد وُدّا» + کنش‌ها */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #bf9540, #d8b869)",
              color: "#fffdf6",
              flex: "0 0 auto",
              boxShadow: "0 4px 12px rgba(139,104,31,.30)",
            }}
          >
            <Icon name="sparkle" size={18} stroke={1.8} />
          </span>
          <span style={{ flex: "1 1 auto", minWidth: 0, display: "grid", gap: 2 }}>
            <strong
              style={{
                fontSize: isWide ? 17 : 16,
                fontWeight: 900,
                lineHeight: 1.4,
                color: colors.olive800,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {L("پیشنهاد وُدّا")}
            </strong>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: colors.inkMuted,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {L("برگزیدهٔ برترین و پیشنهادی‌ترین استادها برای شما")}
            </span>
          </span>
          {showControls ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
              <button
                type="button"
                aria-label={L("اسلاید بعدی")}
                disabled={!canEnd}
                onClick={() => {
                  markInteraction();
                  scrollBySlide("next");
                }}
                className="vodda-tappable"
                style={{
                  width: 32,
                  height: 32,
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                  borderRadius: "50%",
                  border: `1px solid ${colors.goldSoft}`,
                  background: colors.surface,
                  color: canEnd ? colors.goldDark : colors.inkMuted,
                  cursor: canEnd ? "pointer" : "default",
                  opacity: canEnd ? 1 : 0.45,
                }}
              >
                <Icon name="chevronL" size={15} stroke={2} />
              </button>
              <button
                type="button"
                aria-label={L("اسلاید قبلی")}
                disabled={!canStart}
                onClick={() => {
                  markInteraction();
                  scrollBySlide("prev");
                }}
                className="vodda-tappable"
                style={{
                  width: 32,
                  height: 32,
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                  borderRadius: "50%",
                  border: `1px solid ${colors.goldSoft}`,
                  background: colors.surface,
                  color: canStart ? colors.goldDark : colors.inkMuted,
                  cursor: canStart ? "pointer" : "default",
                  opacity: canStart ? 1 : 0.45,
                }}
              >
                <Icon name="chevronL" size={15} stroke={2} style={{ transform: "scaleX(-1)" }} />
              </button>
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => navigateApp("/search", config)}
            className="vodda-tappable"
            style={{
              flex: "0 0 auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${colors.goldSoft}`,
              background: "rgba(191,149,64,.10)",
              color: colors.goldDark,
              fontSize: 10.5,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: typography.fontFamily,
              whiteSpace: "nowrap",
            }}
          >
            {L("مشاهدهٔ همه")}
            <Icon name="chevronL" size={11} stroke={2.2} />
          </button>
        </div>

        {/* ریل اسلایدها — snap افقی؛ موبایل ۱ کارت با پیش‌نمای لبه، دسکتاپ ۲ کارت */}
        <div
          ref={trackRef}
          className="vodda-scroll-rail vodda-enter"
          onPointerEnter={() => {
            pausedRef.current = true;
          }}
          onPointerLeave={() => {
            pausedRef.current = false;
          }}
          onPointerDown={markInteraction}
          onTouchStart={markInteraction}
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            overscrollBehaviorX: "contain",
            paddingBottom: 2,
            minWidth: 0,
            scrollPaddingInlineStart: 0,
          }}
        >
          {slides.map((teacher, index) => (
            <div
              key={teacher.id}
              className="vodda-enter"
              style={{
                flex: "0 0 auto",
                width: isWide ? "calc(50% - 5px)" : "calc(100% - 26px)",
                minWidth: 0,
                scrollSnapAlign: "start",
                animationDelay: `${Math.min(index, 6) * 40}ms`,
              }}
            >
              <TeacherCard teacher={teacher} config={config} wide={isWide} variant="square" />
            </div>
          ))}
        </div>

        {/* نقطه‌گذار اسلایدها */}
        {showControls ? (
          <div
            role="tablist"
            aria-label={L("جایگاه اسلاید")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              flexWrap: "wrap",
              minWidth: 0,
            }}
          >
            {slides.map((teacher, index) => {
              const active = index === activeIndex;
              return (
                <button
                  key={teacher.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`${L("اسلاید")} ${index + 1}`}
                  onClick={() => {
                    markInteraction();
                    const el = trackRef.current;
                    if (!el) return;
                    const step = slideStep(el);
                    if (step <= 0) return;
                    const target = index * step;
                    el.scrollTo({ left: rtl ? -target : target, behavior: "smooth" });
                  }}
                  style={{
                    width: active ? 20 : 6,
                    height: 6,
                    padding: 0,
                    border: 0,
                    borderRadius: 999,
                    background: active
                      ? "linear-gradient(90deg, #bf9540, #d8b869)"
                      : "rgba(139,104,31,.22)",
                    cursor: "pointer",
                    transition: "width .25s ease, background .25s ease",
                    flex: "0 0 auto",
                  }}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
