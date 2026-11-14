"use client";

// بازشناسی نسخهٔ قدیمی برنامه:
// کاربران موبایل اغلب صفحه را برای روزها باز نگه می‌دارند و پس از هر استقرار
// نسخهٔ قدیمیِ در حافظه را می‌بینند و فکر می‌کنند اصلاح نشده است. این هوک با
// مقایسهٔ فایل‌های chunk سندِ جاری با HTML تازهٔ همان مسیر، نسخهٔ کهنه را
// تشخیص می‌دهد و یک‌بار (با محافظ حلقه) صفحه را نوسازی می‌کند.

import { useEffect } from "react";

const RELOAD_KEY = "vodda_build_reload_at";
const RELOAD_GUARD_MS = 60_000;
const CHECK_INTERVAL_MS = 4 * 60_000;

function normalize(url: string) {
  return url.split("?")[0];
}

function documentChunks(): Set<string> {
  const chunks = new Set<string>();
  for (const node of Array.from(document.querySelectorAll("script[src]"))) {
    const src = node.getAttribute("src") ?? "";
    if (src.includes("/_next/static/")) chunks.add(normalize(src));
  }
  for (const node of Array.from(document.querySelectorAll('link[href*="/_next/static/"]'))) {
    const href = node.getAttribute("href") ?? "";
    if (href.endsWith(".js") || href.includes(".js?")) chunks.add(normalize(href));
  }
  return chunks;
}

async function serverHtmlChunks(): Promise<string[]> {
  const response = await fetch(window.location.pathname + window.location.search, { cache: "no-store" });
  if (!response.ok) return [];
  const html = await response.text();
  return (html.match(/\/_next\/static\/[^"'\\\s]+?\.js/g) ?? []).map(normalize);
}

export function useBuildRefresh(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let checking = false;

    async function check() {
      if (checking || document.visibilityState === "hidden") return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      checking = true;
      try {
        const remote = await serverHtmlChunks();
        if (remote.length === 0) return;
        const local = documentChunks();
        const missing = remote.filter((chunk) => !local.has(chunk));
        if (missing.length === 0) return;
        // محافظ حلقه: حداکثر یک نوسازی در هر دقیقه
        const last = Number(window.sessionStorage.getItem(RELOAD_KEY) ?? 0);
        if (Date.now() - last < RELOAD_GUARD_MS) return;
        window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
      } catch {
        // شبکه در دسترس نیست یا پاسخ نامعتبر است — بی‌اهمیت
      } finally {
        checking = false;
      }
    }

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    // نخستین بررسی با تأخیر کوتاه تا با هیدریشن اولیه تداخل نکند
    const first = window.setTimeout(() => void check(), 12_000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
      window.clearTimeout(first);
    };
  }, [enabled]);
}
