/**
 * appearance.tsx — ظاهرِ اپ: حالت روشن/تاریک + زبان (فارسی/انگلیسی).
 *
 * Theme: toggles a single data-vodda-theme attribute on <html>; every color
 * in theme.ts is a CSS variable, so the whole app re-paints instantly
 * (no per-component edits, no re-render storm).
 * Language: provides the t() translator for screens that opted into i18n
 * and drives <html lang/dir> so Persian stays RTL and English becomes LTR.
 * Both preferences persist in localStorage and are applied pre-paint by the
 * inline script in the root layout (no flash).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { dictionaries, type AppLanguage, type TranslationKey } from "../i18n";
import { phraseMap } from "../i18n/phrases";
import { hasPersianScript, localizeCityName, transliterateFa } from "../i18n/transliterate";

export type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "vodda_theme";
const LANG_STORAGE_KEY = "vodda_lang";

export type AppearanceValue = {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  dir: "rtl" | "ltr";
  /** t("key") — i18n lookup with {placeholder} interpolation; missing keys fall back to Persian. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
  /** L("متن فارسی") — literal-string translation; in English mode returns the
   *  mapped English phrase, or (when unmapped) a Latin transliteration so no
   *  Persian script ever reaches the screen; in Persian mode returns the text
   *  untouched. */
  L: (text: string) => string;
  /** N(name) — dynamic names (teacher/learner, organizer, provider) localized
   *  for the active language: English mode rewrites Persian names in Latin
   *  letters; Persian mode returns the name untouched. */
  N: (name: string | null | undefined) => string;
};

/** English-mode rendering of any dynamic Persian text: known cities get their
 *  official English name, everything else is transliterated. */
function renderDynamicEnglish(text: string): string {
  if (!text || !hasPersianScript(text)) return text;
  return localizeCityName(text, "en");
}

const AppearanceContext = createContext<AppearanceValue | null>(null);

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    /* private mode */
  }
  return "light";
}

function readStoredLang(): AppLanguage {
  if (typeof window === "undefined") return "fa";
  try {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "en" || stored === "fa") return stored;
  } catch {
    /* private mode */
  }
  return "fa";
}

export function applyThemeToDocument(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (mode === "dark") {
    root.setAttribute("data-vodda-theme", "dark");
  } else {
    root.removeAttribute("data-vodda-theme");
  }
  root.style.colorScheme = mode;
}

export function applyLangToDocument(lang: AppLanguage) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.lang = lang === "en" ? "en" : "fa";
  root.dir = lang === "en" ? "ltr" : "rtl";
  // فونت فارسی (IRANYekanXFaNum) رقم‌ها را فارسی نشان می‌دهد؛ در حالت
  // انگلیسی به فونت سیستم می‌رویم تا رقم‌ها لاتین دیده شوند.
  root.style.setProperty(
    "--vodda-font",
    lang === "en"
      ? "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
      : "'IRANYekanXFaNum', 'Yekan Bakh', 'Vazirmatn', system-ui, sans-serif",
  );
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  // مقدار اولیه همیشه سرور-پسند است (روشن/فارسی) تا hydrate بدون تناقض انجام
  // شود؛ ترجیحات ذخیره‌شده بلافاصله بعد از mount خوانده می‌شوند. ظاهر پیش از
  // رنگ‌آمیزی توسط اسکریپت درون‌خطی layout اعمال می‌شود (بدون فلش بصری).
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [lang, setLangState] = useState<AppLanguage>("fa");

  useEffect(() => {
    setThemeState(readStoredTheme());
    setLangState(readStoredLang());
  }, []);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    applyLangToDocument(lang);
  }, [lang]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = useCallback((next: AppLanguage) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<AppearanceValue>(() => {
    const table = dictionaries[lang] ?? dictionaries.fa;
    const t = (key: TranslationKey, vars?: Record<string, string | number>) => {
      let text = table[key] ?? dictionaries.fa[key] ?? key;
      if (vars) {
        for (const [name, replacement] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(replacement));
        }
      }
      return text;
    };
    const L = (text: string) => (lang === "en" ? phraseMap.get(text) ?? renderDynamicEnglish(text) : text);
    const N = (name: string | null | undefined) => {
      const value = (name ?? "").trim();
      if (!value) return "";
      return lang === "en" ? transliterateFa(value) : value;
    };
    return {
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
      lang,
      setLang,
      dir: lang === "en" ? "ltr" : "rtl",
      t,
      L,
      N,
    };
  }, [theme, lang, setTheme, setLang]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceValue {
  const value = useContext(AppearanceContext);
  if (!value) {
    // Screens rendered outside the provider keep working with defaults.
    return {
      theme: "light",
      setTheme: () => {},
      toggleTheme: () => {},
      lang: "fa",
      setLang: () => {},
      dir: "rtl",
      t: (key) => dictionaries.fa[key] ?? key,
      L: (text) => text,
      N: (name) => (name ?? "").trim(),
    };
  }
  return value;
}

/** Convenience hook for screens that only need translations. */
export function useT() {
  return useAppearance().t;
}

/** Convenience hook for screens that translate literal Persian strings. */
export function useL() {
  return useAppearance().L;
}
