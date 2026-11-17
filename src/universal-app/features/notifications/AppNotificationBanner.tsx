// باگ notification-banner — بنر اعلان شناور در بالای اپ (از صفر ساخته شد).
// • safe-area-inset-top: در اندروید زیر status bar پنهان نمی‌شود و روی iOS ناچ را رعایت می‌کند.
// • ارتفاع پویا؛ متن با line-clamp:2 و بیضی خلاصه می‌شود؛ long-press متن کامل را نشان می‌دهد.
// • ۵ ثانیه بعد خودبه‌خود محو می‌شود؛ دکمهٔ × هم می‌بندد.
// • لمس بنر به مسیر مرتبط با اعلان می‌پرد (فراخوان → صفحهٔ فراخوان و …).
import { useCallback, useEffect, useRef, useState } from "react";
import { getNotifications, markNotificationRead, type AppNotification } from "./api";
import type { PlatformRuntime } from "../../platform/types";
import type { UniversalAppConfig } from "../../config";
import { navigateAppRoute, type StaticAppRouteName } from "../../router";
import { Icon, colors, shadows, typography } from "../../ui";

const POLL_INTERVAL_MS = 20_000;
const AUTO_DISMISS_MS = 5_000;
const LONG_PRESS_MS = 450;

type BannerProps = {
  runtime: PlatformRuntime;
  /** فقط وقتی نشست معتبر است بنر فعال می‌شود؛ صفحهٔ ورود هرگز بنر ندارد. */
  active: boolean;
  role: string;
  config: UniversalAppConfig;
};

/** نگاشت متن اعلان به مسیر اپ — بر اساس نقش کاربر (فارسی‌خوانی محتوایی). */
export function routeForNotification(
  notification: AppNotification,
  role: string,
): StaticAppRouteName | null {
  const text = `${notification.title} ${notification.body}`;
  const teacher = role === "teacher";
  if (text.includes("فراخوان")) return teacher ? "teacher-dispatch" : "dispatch";
  if (text.includes("جلسه") || text.includes("رزرو") || text.includes("کلاس")) {
    return teacher ? "teacher-sessions" : "sessions";
  }
  if (text.includes("کیف پول") || text.includes("برداشت") || text.includes("شارژ") || text.includes("تومان")) {
    return teacher ? "teacher-wallet" : "wallet";
  }
  if (text.includes("نظر") || text.includes("امتیاز")) {
    return teacher ? "teacher-reviews" : "profile";
  }
  return null;
}

export function AppNotificationBanner({ runtime, active, role, config }: BannerProps) {
  const [banner, setBanner] = useState<AppNotification | null>(null);
  const [expanded, setExpanded] = useState(false);
  const dismissedIds = useRef<Set<number>>(new Set());
  const autoDismissRef = useRef<number | null>(null);
  const longPressRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const bannerRef = useRef<AppNotification | null>(null);
  bannerRef.current = banner;

  const clearAutoDismiss = useCallback(() => {
    if (autoDismissRef.current) {
      window.clearTimeout(autoDismissRef.current);
      autoDismissRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearAutoDismiss();
    setExpanded(false);
    setBanner(null);
  }, [clearAutoDismiss]);

  const show = useCallback((notification: AppNotification) => {
    setBanner(notification);
    setExpanded(false);
    clearAutoDismiss();
    // باگ notification-banner — ۵ ثانیه بعد خودکار محو می‌شود.
    autoDismissRef.current = window.setTimeout(() => {
      dismissedIds.current.add(notification.id);
      setExpanded(false);
      setBanner(null);
    }, AUTO_DISMISS_MS);
  }, [clearAutoDismiss]);

  // واکشی دوره‌ای اعلان‌های خوانده‌نشده؛ نخستین موردِ تازه بنر می‌شود.
  useEffect(() => {
    if (!active) {
      hide();
      return;
    }
    let cancelled = false;

    const check = async () => {
      try {
        const list = await getNotifications(runtime);
        if (cancelled) return;
        const current = bannerRef.current;
        if (current) {
          // اگر اعلانِ روی بنر جای دیگر خوانده شده، بنر کنار می‌رود.
          const fresh = list.find((item) => item.id === current.id);
          if (!fresh || fresh.read) hide();
          return;
        }
        const candidate = list.find(
          (item) => !item.read && !dismissedIds.current.has(item.id),
        );
        if (candidate) show(candidate);
      } catch {
        // خطای polling بی‌صدا — بنر بخش حیاتی نیست.
      }
    };

    void check();
    const interval = window.setInterval(() => void check(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [active, hide, runtime, show]);

  useEffect(() => clearAutoDismiss, [clearAutoDismiss]);

  const close = useCallback(() => {
    if (bannerRef.current) dismissedIds.current.add(bannerRef.current.id);
    hide();
  }, [hide]);

  const open = useCallback(() => {
    const notification = bannerRef.current;
    if (!notification) return;
    dismissedIds.current.add(notification.id);
    void markNotificationRead(runtime, notification.id).catch(() => {});
    hide();
    const route = routeForNotification(notification, role);
    if (route) navigateAppRoute(route, config);
  }, [config, hide, role, runtime]);

  const onPointerDown = useCallback(() => {
    longPressFiredRef.current = false;
    longPressRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      clearAutoDismiss();
      setExpanded(true);
    }, LONG_PRESS_MS);
  }, [clearAutoDismiss]);

  const cancelLongPress = useCallback(() => {
    if (longPressRef.current) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const onPointerUp = useCallback(() => {
    cancelLongPress();
    if (longPressFiredRef.current) {
      // long-press قبلاً متن کامل را باز کرده؛ رها کردن چیزی را باز نمی‌کند.
      return;
    }
    if (expanded) {
      // لمس روی حالتِ باز، آن را می‌بندد و شمارش ۵ ثانیه از نو شروع می‌شود.
      setExpanded(false);
      if (bannerRef.current) show(bannerRef.current);
      return;
    }
    open();
  }, [cancelLongPress, expanded, open, show]);

  if (!banner) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 80,
        // باگ notification-banner — Android/iOS: زیر status bar پنهان نمی‌شود.
        padding: `max(10px, env(safe-area-inset-top)) 12px 0`,
        pointerEvents: "none",
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onContextMenu={(event) => event.preventDefault()}
        style={{
          pointerEvents: "auto",
          width: "100%",
          maxWidth: 520,
          marginInline: "auto",
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 18,
          background: colors.surface,
          border: `1px solid ${colors.olive200}`,
          boxShadow: shadows.olive,
          color: colors.ink,
          fontFamily: typography.fontFamily,
          cursor: "pointer",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            flex: "0 0 34px",
            width: 34,
            height: 34,
            display: "grid",
            placeItems: "center",
            borderRadius: 12,
            background: colors.olive50,
            color: colors.olive700,
          }}
        >
          <Icon name="bell" size={17} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ display: "block", fontSize: 13.5, fontWeight: 800, lineHeight: 1.6 }}>
            {banner.title}
          </strong>
          {/* ارتفاع پویا؛ حداکثر دو سطر با بیضی؛ long-press متن کامل */}
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 12.5,
              lineHeight: 1.8,
              color: colors.inkSecondary,
              overflowWrap: "anywhere",
              display: expanded ? "block" : "-webkit-box",
              WebkitLineClamp: expanded ? undefined : 2,
              WebkitBoxOrient: expanded ? undefined : "vertical",
              overflow: "hidden",
            }}
          >
            {banner.body}
          </p>
        </div>
        <button
          type="button"
          aria-label="بستن اعلان"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            close();
          }}
          style={{
            flex: "0 0 30px",
            width: 30,
            height: 30,
            display: "grid",
            placeItems: "center",
            padding: 0,
            border: "none",
            borderRadius: 10,
            background: colors.sand100,
            color: colors.inkMuted,
            cursor: "pointer",
          }}
        >
          <Icon name="x" size={14} stroke={2.2} />
        </button>
      </div>
    </div>
  );
}
