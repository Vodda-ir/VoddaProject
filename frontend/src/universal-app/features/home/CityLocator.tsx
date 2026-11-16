"use client";

/**
 * CityLocator — تشخیص خودکار شهر کاربر/استاد از طریق موقعیت‌یاب.
 *
 * بالای صفحهٔ اول اپ، یک چیپ کوچک با نام شهر نمایش داده می‌شود. موقعیت با
 * geolocation مرورگر گرفته می‌شود و با سرویس رایگان BigDataCloud (بدون کلید،
 * CORS باز) به نام شهر تبدیل می‌شود. نتیجه در localStorage کش می‌شود تا در
 * بازدیدهای بعدی بدون پرش سختی نمایش داده شود؛ اگر کاربر اجازهٔ موقعیت ندهد،
 * چیپ به‌آرامی پنهان می‌ماند و تا جلسهٔ بعد دیگر پرسیده نمی‌شود.
 *
 * اگر کاربر لاگین باشد و شهر ذخیره‌شدهٔ پروفایلش با نتیجه فرق کند، شهر تازه
 * بی‌صدا در پروفایل ثبت می‌شود (PUT /me با نام و بیوی فعلی تا چیزی پاک نشود).
 */

import { useEffect, useState } from "react";
import { useAppearance } from "../../ui/appearance";
import { Icon } from "../../ui/Icon";
import { colors, radii, typography } from "../../ui";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";

/**
 * user: پروفایل فعلی در صورت دسترسی؛ undefined یعنی «نمی‌دانم» و هنگام ذخیره،
 * یک‌بار /me خوانده می‌شود. null یعنی کاربر مهمان است و فقط کش محلی پر می‌شود.
 */

const LS_CITY = "vodda:city:name";
const LS_GEO_DENIED = "vodda:city:denied";

type ResolvedCity = { name: string; source: "cache" | "geo" };

async function reverseGeocode(lat: number, lon: number, lang: "fa" | "en"): Promise<string> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang === "en" ? "en" : "fa"}`;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return "";
    const data = (await response.json()) as Record<string, unknown>;
    const city = typeof data.city === "string" ? data.city.trim() : "";
    const locality = typeof data.locality === "string" ? data.locality.trim() : "";
    const subdivision = typeof data.principalSubdivision === "string" ? data.principalSubdivision.trim() : "";
    return city || locality || subdivision;
  } catch {
    return "";
  } finally {
    window.clearTimeout(timer);
  }
}

export function CityLocator({ user }: { user?: AuthUser | null }) {
  const runtime = usePlatform();
  const { L, lang } = useAppearance();
  const [city, setCity] = useState<ResolvedCity | null>(null);

  useEffect(() => {
    let active = true;

    // ۱) نمایش فوری از کش — بدون پرش و بدون درخواست تازه.
    try {
      const cached = window.localStorage.getItem(LS_CITY);
      if (cached) setCity({ name: cached, source: "cache" });
    } catch {
      /* private mode */
    }

    // کاربر اجازهٔ موقعیت را قبلاً رد کرده — این جلسه دیگر نپرس.
    let denied = false;
    try {
      denied = window.sessionStorage.getItem(LS_GEO_DENIED) === "1";
    } catch {
      /* ignore */
    }
    if (denied || !("geolocation" in navigator)) return;

    // ۲) به‌روزرسانی پس‌زمینه‌ای با موقعیت‌یاب.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) return;
        void (async () => {
          const name = await reverseGeocode(
            position.coords.latitude,
            position.coords.longitude,
            lang,
          );
          if (!active || !name) return;
          setCity({ name, source: "geo" });
          try {
            window.localStorage.setItem(LS_CITY, name);
          } catch {
            /* ignore */
          }
          // ثبت بی‌صدای شهر در پروفایل (فقط وقتی با مقدار فعلی فرق دارد).
          let profileUser = user;
          if (profileUser === undefined) {
            try {
              profileUser = await runtime.restoreSession();
            } catch {
              profileUser = null;
            }
          }
          if (profileUser && (profileUser.city ?? "").trim() !== name) {
            try {
              await runtime.request("/me", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: profileUser.name ?? "", city: name, bio: profileUser.bio ?? "" }),
              });
            } catch {
              /* ثبت پروفایل اختیاری است */
            }
          }
        })();
      },
      () => {
        // رد مجوز یا خطا — تا پایان این جلسه دوباره پرسیده نشود.
        try {
          window.sessionStorage.setItem(LS_GEO_DENIED, "1");
        } catch {
          /* ignore */
        }
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60 * 1000 },
    );

    return () => {
      active = false;
    };
  }, [lang, runtime, user]);

  if (!city) return null;

  return (
    <span
      aria-label={L("شهر شما")}
      className="vodda-enter"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        maxWidth: "100%",
        padding: "7px 12px",
        borderRadius: radii.pill,
        border: `1px solid ${colors.olive100}`,
        background: colors.olive50,
        color: colors.olive700,
        ...typography.caption,
        fontWeight: 800,
        width: "fit-content",
      }}
    >
      <Icon name="pin" size={14} stroke={2} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {L("موقعیت شما")}: {city.name}
      </span>
    </span>
  );
}
