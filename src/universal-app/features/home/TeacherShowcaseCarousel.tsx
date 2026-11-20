"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import { Icon, colors, spacing, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { useMinWidth } from "../../ui/useMediaQuery";
import { TeacherCard } from "../teachers/TeacherCard";
import type { Teacher } from "../teachers/types";

/** نام نشان‌های مجاز — همان فهرست Icon سامانه. */
type ShowcaseIconName = Parameters<typeof Icon>[0]["name"];

/* ═══ ۱.ب.۳ — موتور مشترک کروسل استادها ═══
 * نسخهٔ تعمیم‌یافتهٔ «پیشنهاد وُدّا» (۱.۱) برای پشتیبانی از چند هویت رنگی:
 *  • طلایی/کرم — «پیشنهاد وُدّا» (برترین + پیشنهادی)
 *  • رز/گل‌مُشکی — «اساتید بانو» (پایانی‌ترین بخش صفحهٔ اصلی)
 * سازوکار یکسان: اسلاید ۱ کارت مربعی در موبایل (با پیش‌نمای لبه) و ۲ کارت در
 * دسکتاپ؛ فلش + نقطه‌گذار + چرخش خودکار ۴.۵ ثانیه با توقف هنگام تعامل کاربر.
 * کارت‌ها همان کارت یکدست TeacherCard (۰.۹.۲) هستند. */

const AUTOPLAY_MS = 4500;
const INTERACTION_PAUSE_MS = 9000;

/** هویت رنگی کروسل — طلایی برند یا رز «اساتید بانو». */
export type TeacherShowcaseTheme = {
  /** قاب: حاشیه، پس‌زمینهٔ گرادیانی، سایه */
  frameBorder: string;
  frameBackground: string;
  frameShadow: string;
  /** نشان دایرهٔ عنوان */
  badgeBackground: string;
  badgeShadow: string;
  badgeColor: string;
  /** عنوان و کنش‌ها */
  titleColor: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  /** نقطه‌گذار */
  dotActive: string;
  dotInactive: string;
};

/** هویت طلایی برند — همان چهرهٔ پیشین «پیشنهاد وُدّا». */
export const SHOWCASE_THEME_GOLD: TeacherShowcaseTheme = {
  frameBorder: colors.goldSoft,
  frameBackground: "linear-gradient(165deg, #fffdf6 0%, #faf3e0 55%, #f5ecd4 100%)",
  frameShadow: "0 10px 26px rgba(46,54,34,.08), 0 0 16px rgba(191,149,64,.12)",
  badgeBackground: "linear-gradient(135deg, #bf9540, #d8b869)",
  badgeShadow: "0 4px 12px rgba(139,104,31,.30)",
  badgeColor: "#fffdf6",
  titleColor: colors.olive800,
  accent: colors.goldDark,
  accentSoft: "rgba(191,149,64,.10)",
  accentBorder: colors.goldSoft,
  dotActive: "linear-gradient(90deg, #bf9540, #d8b869)",
  dotInactive: "rgba(139,104,31,.22)",
};

function SlideSkeleton({ style }: { style?: CSSProperties }) {
  return <span aria-hidden="true" className="vodda-skeleton" style={{ display: "block", borderRadius: 20, ...style }} />;
}

export function TeacherShowcaseCarousel({
  teachers,
  loading,
  wide,
  config,
  theme,
  ariaLabel,
  loadingLabel,
  title,
  subtitle,
  icon,
  seeAllHref,
}: {
  teachers: Teacher[];
  loading: boolean;
  wide: boolean;
  config: UniversalAppConfig;
  theme: TeacherShowcaseTheme;
  ariaLabel: string;
  loadingLabel: string;
  title: string;
  subtitle: string;
  icon: ShowcaseIconName;
  seeAllHref: string;
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
      <section aria-label={L(loadingLabel)} style={{ display: "grid", gap: 12, minWidth: 0 }}>
        <SlideSkeleton style={{ width: 170, height: 20 }} />
        <div
          style={{
            borderRadius: 24,
            border: `1.2px solid ${theme.frameBorder}`,
            background: theme.frameBackground,
            padding: isWide ? 16 : 12,
            boxShadow: theme.frameShadow,
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
    <section aria-label={L(ariaLabel)} style={{ display: "grid", gap: spacing.sm, minWidth: 0 }}>
      <div
        style={{
          borderRadius: 24,
          border: `1.2px solid ${theme.frameBorder}`,
          background: theme.frameBackground,
          padding: isWide ? 18 : 12,
          boxShadow: theme.frameShadow,
          minWidth: 0,
          display: "grid",
          gap: 12,
        }}
      >
        {/* سربرگ کروسل: نشان رنگی + عنوان + کنش‌ها */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              background: theme.badgeBackground,
              color: theme.badgeColor,
              flex: "0 0 auto",
              boxShadow: theme.badgeShadow,
            }}
          >
            <Icon name={icon} size={18} stroke={1.8} />
          </span>
          <span style={{ flex: "1 1 auto", minWidth: 0, display: "grid", gap: 2 }}>
            <strong
              style={{
                fontSize: isWide ? 17 : 16,
                fontWeight: 900,
                lineHeight: 1.4,
                color: theme.titleColor,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {L(title)}
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
              {L(subtitle)}
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
                  border: `1px solid ${theme.accentBorder}`,
                  background: colors.surface,
                  color: canEnd ? theme.accent : colors.inkMuted,
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
                  border: `1px solid ${theme.accentBorder}`,
                  background: colors.surface,
                  color: canStart ? theme.accent : colors.inkMuted,
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
            onClick={() => navigateApp(seeAllHref, config)}
            className="vodda-tappable"
            style={{
              flex: "0 0 auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "6px 10px",
              borderRadius: 999,
              border: `1px solid ${theme.accentBorder}`,
              background: theme.accentSoft,
              color: theme.accent,
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
                    background: active ? theme.dotActive : theme.dotInactive,
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
