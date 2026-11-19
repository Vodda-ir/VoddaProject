import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import type { UniversalAppConfig } from "../config";
import { appRouteUrl, navigateAppRoute, type AppRouteName, type StaticAppRouteName } from "../router";
import { CallAlertBar } from "../features/notifications/CallAlertBar";
import { getTeacherUnseenSessionCount } from "../features/session-detail/api";
import { SupportChat } from "../features/support/SupportChat";
import { usePlatform } from "../platform/context";
import { useAppearance } from "./appearance";
import { localizedDigits } from "./persian";
import type { TranslationKey } from "../i18n";
import { Icon } from "./Icon";
import { ToastHost } from "./toast";
import { colors, gradients, radii, shadows, spacing, typography } from "./theme";

type IconName = Parameters<typeof Icon>[0]["name"];

type StaticTabTarget = Exclude<
  AppRouteName,
  "teacher" | "book" | "service" | "session" | "ceremony-call" | "ceremony-booking" | "presence-provider" | "not-found"
>;

type NavigationItem = {
  /** برچسب فارسی مستقیم یا کلید ترجمه — هر دو سازگار (مرج اپ و وب) */
  label?: string;
  labelKey?: TranslationKey;
  target: StaticTabTarget;
  icon: IconName;
  routes: AppRouteName[];
};

/**
 * دکمه فراخوان (Call to action) وسط نوار ناوبری — هاب اصلی اکشن‌های کاربر:
 * استاد آنلاین (فراخوان اساتید) و مراسم حضوری قرآنی.
 */
type NavigationCta = {
  labelKey: TranslationKey;
  ariaLabelKey: TranslationKey;
  icon: IconName;
  target: StaticAppRouteName;
  activeRoutes: AppRouteName[];
};

const learnerCallToAction: NavigationCta = {
  labelKey: "dispatch_title",
  ariaLabelKey: "dispatch_title",
  /* بلندگوی فراخوان به‌جای زنگوله — مفهوم «فراخوان اساتید» را می‌رساند */
  icon: "megaphone",
  target: "call-hub",
  activeRoutes: ["call-hub", "dispatch", "ceremony-new", "ceremony-calls", "ceremony-call"],
};

type AppShellProps = {
  children: ReactNode;
  config: UniversalAppConfig;
  routeName: AppRouteName;
  title?: string;
};

/* چیدمان ۵گانهٔ جدید (RTL): خانه (راست‌ترین) ← جستجو ← دکمهٔ مرکزی فراخوان ← جلسات ← پروفایل (چپ‌ترین).
 * کیف پول از نوار پایین حذف شد و به هدر بالای صفحه منتقل شد — همیشه در دسترس، بدون اشغال جای اصلی منو. */
const learnerNavigation: NavigationItem[] = [
  { label: "خانه", target: "home", icon: "home", routes: ["home", "free-services"] },
  { label: "جستجو", target: "search", icon: "search", routes: ["search", "teacher", "book", "category", "service"] },
  { label: "جلسات", target: "sessions", icon: "calendar", routes: ["sessions"] },
  { label: "پروفایل", target: "profile", icon: "user", routes: ["profile", "profile-edit"] },
];

const teacherNavigation: NavigationItem[] = [
  { labelKey: "nav_teacher_home", target: "teacher-home", icon: "grid", routes: ["teacher-home", "teacher-services", "teacher-work-times", "teacher-reviews"] },
  { labelKey: "session_accept", target: "teacher-requests", icon: "message", routes: ["teacher-requests"] },
  { labelKey: "nav_sessions", target: "teacher-sessions", icon: "calendar", routes: ["teacher-sessions"] },
  { labelKey: "wallet_title", target: "teacher-wallet", icon: "wallet", routes: ["teacher-wallet", "teacher-withdraw"] },
  { labelKey: "nav_profile", target: "teacher-profile", icon: "user", routes: ["teacher-profile"] },
];

/* کیف پول دیگر تب پایین نیست — با ورود از چیپ هدر، سربرگ با دکمهٔ بازگشت نمایش داده می‌شود */
const tabRoutes = new Set<AppRouteName>([
  "home",
  "search",
  "sessions",
  "profile",
  "teacher-home",
  "teacher-requests",
  "teacher-sessions",
  "teacher-wallet",
  "teacher-profile",
]);

const rootStyle: CSSProperties = {
  minHeight: "100dvh",
  background: `radial-gradient(circle at 50% -20%, ${colors.olive100} 0%, ${colors.sand50} 36%, ${colors.sand100} 100%)`,
  color: colors.ink,
  fontFamily: typography.fontFamily,
};

const frameStyle: CSSProperties = {
  width: "100%",
  maxWidth: 600,
  minHeight: "100dvh",
  margin: "0 auto",
  background: colors.sand50,
  position: "relative",
  boxShadow: shadows.md,
};

const contentStyle: CSSProperties = {
  paddingInline: spacing.xl,
  paddingTop: `max(${spacing.lg}px, env(safe-area-inset-top))`,
  paddingBottom: `calc(104px + env(safe-area-inset-bottom))`,
};

function navigate(
  event: MouseEvent<HTMLAnchorElement>,
  target: NavigationItem["target"],
  config: UniversalAppConfig,
) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigateAppRoute(target, config);
}

/** شمارندهٔ قرمز جلسات ثبت‌شده و دیده‌نشدهٔ استاد — هر ۱۵ ثانیه نوسازی می‌شود. */
function useTeacherUnseenCount(enabled: boolean): number {
  const runtime = usePlatform();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const load = () => {
      getTeacherUnseenSessionCount(runtime)
        .then((value) => {
          if (active) setCount(value);
        })
        .catch(() => {
          if (active) setCount(0);
        });
    };
    load();
    const timer = window.setInterval(load, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, runtime]);
  return count;
}

function BottomNavigation({
  items,
  cta,
  routeName,
  config,
  ariaLabel,
  badgeFor,
}: {
  items: NavigationItem[];
  cta?: NavigationCta;
  routeName: AppRouteName;
  config: UniversalAppConfig;
  ariaLabel: string;
  badgeFor?: (item: NavigationItem) => number | undefined;
}) {
  const { t, L, lang } = useAppearance();
  /* تب خطی مدرن — بدون پیل پس‌زمینه؛ آیتم فعال: زیتونی + نقطهٔ کوچک طلایی زیر آیکون */
  const renderTab = (item: NavigationItem, badge?: number) => {
    const active = item.routes.includes(routeName);
    return (
      <a
        key={item.target}
        href={appRouteUrl(item.target, config)}
        aria-current={active ? "page" : undefined}
        onClick={(event) => navigate(event, item.target, config)}
        style={{
          minWidth: 0,
          minHeight: 62,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          borderRadius: radii.md,
          color: active ? colors.olive700 : colors.inkMuted,
          background: "transparent",
          textDecoration: "none",
          fontSize: 11,
          fontWeight: active ? 800 : 600,
        }}
      >
        <span style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <Icon name={item.icon} size={21} stroke={active ? 2.1 : 1.7} />
          {badge !== undefined && badge > 0 ? (
            <span
              aria-label={L("{n} مورد دیده نشده").replace("{n}", localizedDigits(badge, lang))}
              style={{
                position: "absolute",
                top: -6,
                insetInlineEnd: -9,
                minWidth: 17,
                height: 17,
                display: "grid",
                placeItems: "center",
                padding: "0 4px",
                borderRadius: 999,
                background: colors.danger,
                border: `2px solid ${colors.surface}`,
                color: "#ffffff",
                fontSize: 9,
                fontWeight: 900,
                lineHeight: 1,
                boxShadow: "0 3px 8px rgba(179,64,58,.4)",
              }}
            >
              {localizedDigits(badge > 99 ? "+99" : badge, lang)}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden
          style={{
            width: 4.5,
            height: 4.5,
            borderRadius: 999,
            background: active ? colors.gold : "transparent",
            boxShadow: active ? "0 0 7px rgba(191,149,64,.6)" : "none",
          }}
        />
        <span style={{ position: "relative", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%", lineHeight: 1.2 }}>
          {item.labelKey ? t(item.labelKey) : item.label ?? ""}
        </span>
      </a>
    );
  };

  const ctaActive = cta ? cta.activeRoutes.includes(routeName) : false;
  const leadingTabs = cta ? items.slice(0, Math.ceil(items.length / 2)) : items;
  const trailingTabs = cta ? items.slice(Math.ceil(items.length / 2)) : [];
  /* ۰.۷.۶ — رفع پرش پروفایل به سطر دوم: تعداد ستون‌های گرید باید دقیقاً برابر
     فرزندان واقعی باشد (تب‌های ابتدا + دکمهٔ فراخوان + تب‌های انتها) تا هیچ تبِی
     به ردیف implicit دوم نیفتد — در همهٔ عرض‌ها فقط یک خط. */
  const leadingCount = Math.ceil(items.length / 2);
  const trailingCount = items.length - leadingCount;
  const gridColumns = cta
    ? `repeat(${leadingCount}, minmax(0, 1fr)) auto repeat(${trailingCount}, minmax(0, 1fr))`
    : `repeat(${items.length}, minmax(0, 1fr))`;

  return (
    <nav
      aria-label={ariaLabel}
      className="vodda-bottom-nav"
      style={{
        position: "fixed",
        zIndex: 30,
        left: "50%",
        bottom: 0,
        width: "min(100%, 600px)",
        transform: "translateX(-50%)",
        padding: "4px 8px max(6px, env(safe-area-inset-bottom))",
      }}
    >
      {/* لایهٔ شیشه‌ای با بریدگی نیم‌دایره (Notch) — جدا از محتوا تا دکمهٔ شناور بریده نشود */}
      <span aria-hidden className="vodda-bottom-nav-glass" />
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: gridColumns,
          alignItems: "stretch",
          gap: 0,
          minHeight: 62,
        }}
      >
        {leadingTabs.map((item) => renderTab(item, badgeFor?.(item)))}
        {cta ? (
          <a
            key="nav-cta"
            href={appRouteUrl(cta.target, config)}
            aria-label={t(cta.ariaLabelKey)}
            aria-current={ctaActive ? "true" : undefined}
            onClick={(event) => navigate(event, cta.target, config)}
            style={{
              minWidth: 72,
              minHeight: 62,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 3,
              textDecoration: "none",
            }}
          >
            <span
              aria-hidden
              className="vodda-nav-cta-orb"
              style={{
                width: 54,
                height: 54,
                marginTop: -30,
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                color: colors.onOlive,
                background: ctaActive ? gradients.goldRich : gradients.hero,
                border: `2px solid ${ctaActive ? colors.goldDark : colors.goldSoft}`,
                boxShadow: ctaActive
                  ? "0 12px 26px rgba(139,104,31,.40), 0 3px 8px rgba(46,54,34,.16)"
                  : "0 12px 26px rgba(76,90,54,.34), 0 3px 8px rgba(46,54,34,.14)",
              }}
            >
              <Icon name={cta.icon} size={23} stroke={2.1} />
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                lineHeight: 1.2,
                color: ctaActive ? colors.goldDark : colors.olive700,
              }}
            >
              {t(cta.labelKey)}
            </span>
          </a>
        ) : null}
        {trailingTabs.map((item) => renderTab(item, badgeFor?.(item)))}
      </div>
    </nav>
  );
}

function ShellHeader({ title, routeName }: { title?: string; routeName: AppRouteName }) {
  const { t, L } = useAppearance();
  if (!title || tabRoutes.has(routeName)) return null;
  return (
    <header
      style={{
        minHeight: 52,
        display: "grid",
        gridTemplateColumns: "44px 1fr 44px",
        alignItems: "center",
        marginBottom: spacing.lg,
      }}
    >
      <div>
        <button
          type="button"
          aria-label={L("بازگشت")}
          className="vodda-tappable"
          onClick={() => window.history.back()}
          style={{
            width: 40,
            height: 40,
            display: "grid",
            placeItems: "center",
            padding: 0,
            border: 0,
            borderRadius: "50%",
            color: colors.inkSecondary,
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <Icon name="arrowL" size={20} stroke={1.9} />
        </button>
      </div>
      <div style={{ minWidth: 0, textAlign: "center" }}>
        <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>
          {routeName.startsWith("teacher-") ? t("nav_teacher_home") : t("app_title")}
        </p>
        <h1
          style={{
            ...typography.title,
            margin: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: colors.ink,
          }}
        >
          {title}
        </h1>
      </div>
      <div />
    </header>
  );
}

function Shell({
  children,
  config,
  routeName,
  title,
  mode,
}: AppShellProps & { mode: "learner" | "teacher" }) {
  const { L } = useAppearance();
  const items = mode === "teacher" ? teacherNavigation : learnerNavigation;
  const unseenCount = useTeacherUnseenCount(mode === "teacher");
  const badgeFor = (item: NavigationItem): number | undefined => {
    if (mode === "teacher" && item.target === "teacher-sessions") return unseenCount;
    return undefined;
  };
  return (
    <div data-app-shell={mode} style={rootStyle}>
      <div
        data-vodda-frame
        style={{
          ...frameStyle,
          background: mode === "teacher"
            ? `linear-gradient(180deg, ${colors.olive50} 0px, ${colors.sand50} 220px)`
            : colors.sand50,
        }}
      >
        <div style={contentStyle}>
          <ShellHeader title={title} routeName={routeName} />
          {children}
        </div>
        <BottomNavigation
          items={items}
          cta={mode === "learner" ? learnerCallToAction : undefined}
          routeName={routeName}
          config={config}
          badgeFor={badgeFor}
          ariaLabel={mode === "teacher" ? L("ناوبری اصلی استاد") : L("ناوبری اصلی قرآن‌آموز")}
        />
      </div>
      <ToastHost />
      {/* گفتگوی زندهٔ پشتیبانی برای هر دو پوسته (کاربر/استاد) — دستیار هوشمند فعلاً پنهان شده است */}
      <SupportChat routeName={routeName} />
      {/* اعلان‌های زنده در هر دو حالت (استاد/کاربر) — برای مدیران شامل رویدادهای پنل مدیریت */}
      <CallAlertBar config={config} />
    </div>
  );
}

export function MobileAppShell(props: AppShellProps) {
  return <Shell {...props} mode="learner" />;
}

export function TeacherAppShell(props: AppShellProps) {
  return <Shell {...props} mode="teacher" />;
}
