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
const AUTO_HIDE_MS = 14000;
/** فقط فراخوان‌های تازه (نیم‌ساعت اخیر) نوار اعلان را می‌آورند؛
 *  بدهی اعلان‌های قدیمی در زنگ اعلان‌ها می‌ماند و آزاردهنده نمی‌شود. */
const FRESH_WINDOW_MS = 30 * 60 * 1000;
const LS_CHIME = "vodda:call-alert:last-chime";
const LS_DISMISSED = "vodda:call-alert:dismissed";

type CallAlert = {
  id: number;
  /** نام فراخوان — بخش بعد از «:» در تیتر اعلان */
  name: string;
  body: string;
  kind: "ceremony" | "dispatch";
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

function playChime() {
  try {
    const audio = new Audio(CHIME_SRC);
    audio.volume = 0.85;
    void audio.play().catch(() => {
      // پخش خودکار توسط مرورگر مسدود شده — نوار همچنان دیده می‌شود
    });
  } catch {
    // پخش صدا اختیاری است
  }
}

/** اعلان فراخوانِ قابل‌اقدام: تازه و خوانده‌نشده؛ غیرفراخوانی‌ها و قدیمی‌ها نادیده گرفته می‌شوند. */
function toCallAlert(id: number, title: string, body: string, read: boolean, createdAt: string): CallAlert | null {
  if (read) return null;
  const createdMs = Date.parse(createdAt);
  if (!Number.isFinite(createdMs) || Date.now() - createdMs > FRESH_WINDOW_MS) return null;
  if (title.includes("فراخوان مراسم")) {
    return { id, name: title.split(":").slice(1).join(":").trim() || "مراسم حضوری", body, kind: "ceremony" };
  }
  if (title.includes("فراخوان جدید")) {
    return { id, name: title.split(":").slice(1).join(":").trim() || "درخواست جلسه", body, kind: "dispatch" };
  }
  return null;
}

export function CallAlertBar({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const [alert, setAlert] = useState<CallAlert | null>(null);
  const alertRef = useRef<CallAlert | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    const current = alertRef.current;
    if (current) rememberDismissed(current.id);
    clearHideTimer();
    setAlert(null);
    alertRef.current = null;
  }, [clearHideTimer]);

  const open = useCallback(() => {
    const current = alertRef.current;
    if (!current) return;
    clearHideTimer();
    setAlert(null);
    alertRef.current = null;
    void markNotificationRead(runtime, current.id).catch(() => {
      // خواندن ناموفق؛ هدایت همچنان انجام می‌شود
    });
    navigateApp(current.kind === "ceremony" ? "/t/ceremony" : "/t/dispatch", config);
  }, [clearHideTimer, config, runtime]);

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
            clearHideTimer();
            hideTimer.current = setTimeout(dismiss, AUTO_HIDE_MS);
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
          clearHideTimer();
          setAlert(null);
          alertRef.current = null;
        }
      } catch {
        // خطای شبکه — دور بعد دوباره تلاش می‌شود
      }
    };

    void check();
    const timer = window.setInterval(() => void check(), POLL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [clearHideTimer, dismiss, runtime]);

  if (!alert) return null;

  const label = alert.kind === "ceremony" ? "فراخوان مراسم" : "درخواست جلسهٔ آنلاین";

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
