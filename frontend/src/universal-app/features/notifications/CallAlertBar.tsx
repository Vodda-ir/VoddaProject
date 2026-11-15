"use client";

// نوار اعلان «فراخوان» برای اساتید — وقتی فراخوان تازه‌ای (جلسهٔ آنلاین یا
// مراسم حضوری) برای استاد ثبت می‌شود، نوار زیبایی بالای صفحه با صدای زنگ
// آرام نمایش داده می‌شود؛ با لمس، استاد مستقیم به صفحهٔ اصلی همان فراخوان
// می‌رود (پذیرش مراسم یا فراخوان‌های زنده) و اعلان خوانده‌شده می‌شود.

import { useCallback, useEffect, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { Icon } from "../../ui/Icon";
import { getNotifications, markNotificationRead } from "./api";

const CHIME_SRC = "/sounds/vodda-summon-chime.wav";
const POLL_MS = 15000;
/** پنجرهٔ تازگی هر نوع اعلان — کارت تا وقتی خوانده‌نشده و تازه است روی صفحه
 *  می‌ماند (بدون پنهان‌شدن خودکار)؛ dismissed فقط با بستن دستی ثبت می‌شود.
 *  فراخوان/جلسهٔ فوری عمر کوتاه دارند، اما درخواست جلسهٔ معمولی و مراسم
 *  ممکن است دقایقی بعد از بازکردن اپ دیده شوند؛ پنجرهٔ آنان بلندتر است. */
const FRESH_WINDOW_BY_KIND: Record<CallAlert["kind"], number> = {
  dispatch: 30 * 60 * 1000,
  instant: 30 * 60 * 1000,
  session: 6 * 60 * 60 * 1000,
  ceremony: 6 * 60 * 60 * 1000,
};
const LS_CHIME = "vodda:call-alert:last-chime";
const LS_DISMISSED = "vodda:call-alert:dismissed";

type CallAlert = {
  id: number;
  /** نام فراخوان — بخش بعد از «:» در تیتر اعلان */
  name: string;
  body: string;
  kind: "ceremony" | "dispatch" | "session" | "instant";
};

function dismissedIds(): number[] {
  try {
    const raw = window.localStorage.getItem(LS_DISMISSED);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is number => typeof value === "number") : [];
  } catch {
    return [];
  }
}

function rememberDismissed(id: number) {
  try {
    const next = [...dismissedIds(), id].slice(-40);
    window.localStorage.setItem(LS_DISMISSED, JSON.stringify(next));
  } catch {
    // حافظهٔ محلی در دسترس نیست — بی‌خیال
  }
}

function lastChimeId(): number {
  try {
    return Number(window.localStorage.getItem(LS_CHIME) ?? "0") || 0;
  } catch {
    return 0;
  }
}

/** باز کردن پخش صدا در WebView (سیاست autoplay) — با اولین لمس کاربر،
 *  یک پخش بی‌صدا اجرا می‌شود تا از آن پس زنگ اعلان بدون gesture هم پخش شود.
 *  بدون این، زنگ فراخوان در اپ عملاً هرگز صدا نمی‌داد. */
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    const audio = new Audio(CHIME_SRC);
    audio.volume = 0;
    audio.muted = true;
    const finished = () => {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      } catch {
        // بی‌اهمیت
      }
    };
    void audio.play().then(finished, finished);
  } catch {
    // پخش صدا اختیاری است
  }
}

function playChime() {
  try {
    const audio = new Audio(CHIME_SRC);
    audio.volume = 0.85;
    void audio.play().catch(() => {
      // پخش خودکار هنوز مسدود است — نوار همچنان دیده می‌شود؛
      // پس از اولین لمس کاربر، زنگ‌های بعدی صدا خواهند داشت.
    });
  } catch {
    // پخش صدا اختیاری است
  }
}

/** اعلان فراخوان/جلسهٔ قابل‌اقدام: خوانده‌نشده و تازه؛ قدیمی‌ها فقط در زنگ اعلان‌ها می‌مانند. */
function toCallAlert(id: number, title: string, body: string, read: boolean, createdAt: string): CallAlert | null {
  if (read) return null;
  const createdMs = Date.parse(createdAt);
  if (!Number.isFinite(createdMs)) return null;
  const kind: CallAlert["kind"] | "" = title.includes("فراخوان مراسم")
    ? "ceremony"
    : title.includes("فراخوان جدید")
      ? "dispatch"
      : title.includes("جلسهٔ فوری") || title.includes("جلسه فوری")
        ? "instant"
        : title.includes("درخواست جلسه")
          ? "session"
          : "";
  if (kind === "") return null;
  if (Date.now() - createdMs > FRESH_WINDOW_BY_KIND[kind]) return null;
  const name = title.split(":").slice(1).join(":").trim() ||
    (kind === "ceremony" ? "مراسم حضوری" : kind === "instant" ? "جلسهٔ فوری" : "درخواست جلسه");
  return { id, name, body, kind };
}

export function CallAlertBar({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const [alert, setAlert] = useState<CallAlert | null>(null);
  const alertRef = useRef<CallAlert | null>(null);

  // باز کردن پخش صدا با اولین تعامل کاربر — شرط پخش زنگ در WebView
  useEffect(() => {
    const onFirstInteraction = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
    window.addEventListener("pointerdown", onFirstInteraction);
    window.addEventListener("keydown", onFirstInteraction);
    return () => {
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, []);

  const dismiss = useCallback(() => {
    // بستن دستی (دکمهٔ ✕) — فقط اینجا در فهرست dismissed ثبت می‌شود تا
    // اعلان دوباره بالا نیاید؛ بدون پنهان‌سازی خودکار دیگر اعلان‌ها گم نمی‌شوند.
    const current = alertRef.current;
    if (current) rememberDismissed(current.id);
    setAlert(null);
    alertRef.current = null;
  }, []);

  const open = useCallback(() => {
    const current = alertRef.current;
    if (!current) return;
    setAlert(null);
    alertRef.current = null;
    void markNotificationRead(runtime, current.id).catch(() => {
      // خواندن ناموفق؛ هدایت همچنان انجام می‌شود
    });
    const target =
      current.kind === "ceremony"
        ? "/t/ceremony"
        : current.kind === "dispatch"
          ? "/t/dispatch"
          : "/t/sessions"; // جلسهٔ فوری و درخواست جلسهٔ معمولی → فهرست جلسات استاد
    navigateApp(target, config);
  }, [config, runtime]);

  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        const list = await getNotifications(runtime);
        if (!active) return;
        const dismissed = new Set(dismissedIds());
        const candidates = list
          .map((notification) =>
            toCallAlert(notification.id, notification.title, notification.body, notification.read, notification.createdAt))
          .filter((value): value is CallAlert => value !== null && !dismissed.has(value.id));
        const next = candidates.sort((a, b) => b.id - a.id)[0] ?? null;

        if (next) {
          if (next.id !== alertRef.current?.id) {
            setAlert(next);
            alertRef.current = next;
            if (next.id > lastChimeId()) {
              try {
                window.localStorage.setItem(LS_CHIME, String(next.id));
              } catch {
                // بدون حافظه، صدا برای هر اعلان تازه پخش می‌شود
              }
              playChime();
            }
          }
        } else if (alertRef.current) {
          // اعلان فعلی دیگر معتبر نیست (خوانده/حذف شده) — نوار جمع می‌شود
          setAlert(null);
          alertRef.current = null;
        }
      } catch {
        // خطای شبکه — دور بعد دوباره تلاش می‌شود
      }
    };

    void check();
    const timer = window.setInterval(() => void check(), POLL_MS);
    // بازگشت به پیش‌زمینهٔ اپ — بلافاصله بررسی می‌شود تا اعلان‌هایی که در
    // پس‌زمینه رسیده‌اند همان لحظه دیده شوند (نه تا تیک بعدیِ ۱۵ ثانیه‌ای).
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [runtime]);

  if (!alert) return null;

  const labelByKind: Record<CallAlert["kind"], string> = {
    ceremony: "فراخوان مراسم",
    dispatch: "درخواست جلسهٔ آنلاین",
    session: "درخواست جلسهٔ جدید",
    instant: "جلسهٔ فوری — همین حالا",
  };
  const label = labelByKind[alert.kind];

  return (
    <div className="vodda-call-alert" role="alert">
      <button
        type="button"
        className="vodda-call-alert-card"
        onClick={open}
        aria-label={`${label}: ${alert.name} — مشاهده`}
      >
        <span
          aria-hidden="true"
          className="vodda-call-alert-halo"
          style={{
            width: 44,
            height: 44,
            display: "grid",
            placeItems: "center",
            flex: "0 0 44px",
            borderRadius: "50%",
            background: "linear-gradient(145deg, #d8b869, #b8923c)",
            color: "#ffffff",
            boxShadow: "0 4px 10px rgba(139,104,31,.35)",
          }}
        >
          <span className="vodda-call-alert-bell" style={{ display: "grid", placeItems: "center" }}>
            <Icon name="bell" size={21} stroke={2} />
          </span>
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.2,
              color: "#ecd9a8",
            }}
          >
            {label}
          </span>
          <span
            style={{
              display: "block",
              marginTop: 2,
              fontSize: 13.5,
              fontWeight: 800,
              lineHeight: 1.7,
              color: "#ffffff",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {alert.name}
          </span>
          {alert.body ? (
            <span
              className="vodda-call-alert-body"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                marginTop: 1,
                fontSize: 11,
                lineHeight: 1.75,
                color: "rgba(255,255,255,.82)",
              }}
            >
              {alert.body}
            </span>
          ) : null}
        </span>
        <Icon
          name="chevronL"
          size={18}
          style={{ flex: "0 0 auto", color: "rgba(255,255,255,.75)" }}
        />
      </button>
      <button
        type="button"
        className="vodda-call-alert-close"
        aria-label="بستن اعلان فراخوان"
        onClick={dismiss}
      >
        <Icon name="x" size={13} stroke={2.4} />
      </button>
    </div>
  );
}
