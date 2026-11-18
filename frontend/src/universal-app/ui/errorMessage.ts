/**
 * پیام خطای استاندارد — در حالت انگلیسی هر متن فارسی (خطاهای سمت بک‌اند یا
 * پیام‌های api) به معادل نگاشت‌شده یا بازنویسی لاتین برمی‌گردد تا هیچ نویسهٔ
 * فارسی در زبان انگلیسی دیده نشود.
 */
import { phraseMap } from "../i18n/phrases";
import { hasPersianScript, localizeCityName } from "../i18n/transliterate";

export const defaultErrorMessage = "خطایی رخ داد. دوباره تلاش کنید.";

/** زبان فعال سند — پیش از اولین رندر توسط applyLangToDocument تنظیم می‌شود. */
function activeLang(): "fa" | "en" {
  if (typeof document === "undefined") return "fa";
  return document.documentElement.lang === "en" ? "en" : "fa";
}

function localizeMessage(text: string): string {
  if (!text || activeLang() !== "en" || !hasPersianScript(text)) return text;
  return phraseMap.get(text) ?? localizeCityName(text, "en");
}

export function messageOf(error: unknown, fallback = defaultErrorMessage): string {
  const raw = error instanceof Error && error.message ? error.message : fallback;
  return localizeMessage(raw);
}
