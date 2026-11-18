"use client";

/**
 * useBuildVersionGuard — جایگزین امنِ به‌روزرسانی خودکار اپ.
 *
 * هر ۶۰ ثانیه و همچنین هنگام بازگشت اپ از پیش‌زمینه، نسخهٔ بیلد را از
 * /api/build-version می‌خواند؛ اگر با SHA تزریق‌شده در همین باندل فرق داشته
 * باشد، یک‌بار صفحه رفرش می‌شود تا کاربران همیشه آخرین نسخه را اجرا کنند.
 *
 * برخلاف useBuildRefresh قدیمی، هیچ فهرست chunk مقایسه نمی‌شود؛ تنها یک
 * رشتهٔ نسخه. رفرش با گارد sessionStorage حداقل ۳ دقیقه فاصله دارد تا حلقهٔ
 * رفرش (مشکل نسخهٔ قبلی) هرگز شکل نگیرد.
 */

import { useEffect } from "react";

const LOCAL_BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA || "dev";
const POLL_MS = 60_000;
const LS_LAST_RELOAD = "vodda_build_reload_at";
const RELOAD_COOLDOWN_MS = 3 * 60_000;

function reloadAllowed(): boolean {
  try {
    const last = Number(window.sessionStorage.getItem(LS_LAST_RELOAD) ?? "0");
    return !last || Date.now() - last > RELOAD_COOLDOWN_MS;
  } catch {
    return true;
  }
}

function markReloaded() {
  try {
    window.sessionStorage.setItem(LS_LAST_RELOAD, String(Date.now()));
  } catch {
    /* ignore */
  }
}

async function checkForNewBuild(): Promise<void> {
  if (LOCAL_BUILD_SHA === "dev") return; // محیط توسعه — بدون رفرش
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    const response = await fetch("/api/build-version", {
      cache: "no-store",
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!response.ok) return;
    const body = (await response.json()) as { data?: { sha?: string } };
    const sha = body?.data?.sha;
    if (typeof sha === "string" && sha && sha !== LOCAL_BUILD_SHA && reloadAllowed()) {
      markReloaded();
      window.location.reload();
    }
  } catch {
    /* شبکه در دسترس نیست — دور بعد */
  }
}

export function useBuildVersionGuard(): void {
  useEffect(() => {
    void checkForNewBuild();
    const timer = window.setInterval(() => void checkForNewBuild(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkForNewBuild();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
