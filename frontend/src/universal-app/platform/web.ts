import { normalizeAuthUser, type AuthUserPayload } from "./auth";
import { setAssetOriginFromApiBase } from "./asset";
import { joinUrl, PlatformHttpError, requestJson } from "./http";
import type {
  PlatformGeoCapabilities,
  PlatformRequestInit,
  PlatformRuntime,
  PlatformUploadProgress,
  VerifyOtpResult,
} from "./types";

type WebPlatformOptions = {
  apiBaseUrl?: string;
  authBaseUrl?: string;
};

/* ۱.ب.۱ — موقعیت‌یاب وب برای chip شهر:
 *  - hasPermission فقط با permissions API (بدون پنجرهٔ مجوز) بررسی می‌شود.
 *  - requestPermission اگر denied قطعی باشد false؛ در "prompt" درخواست مرورگر
 *    هنگام currentPosition پر می‌شود (تقارن رفتار با اپ).
 *  - currentPosition هیچ‌وقت نمی‌شکند — خطا → null. */
async function geoPermissionState(): Promise<"granted" | "denied" | "unknown"> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions) return "unknown";
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    if (status.state === "granted") return "granted";
    if (status.state === "denied") return "denied";
    return "unknown";
  } catch {
    return "unknown";
  }
}

const webGeo: PlatformGeoCapabilities = {
  async hasPermission() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return false;
    return (await geoPermissionState()) === "granted";
  },
  async requestPermission() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return false;
    return (await geoPermissionState()) !== "denied";
  },
  currentPosition() {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
      );
    });
  },
};

type VerifyResponse = {
  data: {
    user: AuthUserPayload;
    need_profile?: boolean;
  };
};

export function createWebPlatformRuntime(
  options: WebPlatformOptions = {},
): PlatformRuntime {
  const apiBaseUrl = options.apiBaseUrl ?? "/api/backend";
  const authBaseUrl = options.authBaseUrl ?? "/api/auth";

  // آدرس نسبی آپلودها در وب هم‌مبدأ است؛ اگر runtime با API مطلق ساخته شود،
  // مبدأ همان API به آدرس‌های نسبی می‌چسبد (استفاده در پیش‌نمایش وب خارجی).
  setAssetOriginFromApiBase(apiBaseUrl);

  const request = <T>(path: string, init?: PlatformRequestInit) =>
    requestJson<T>(joinUrl(apiBaseUrl, path), {
      ...init,
      credentials: "include",
    });

  // باگ avatar-upload — آپلود multipart با progress واقعی (XHR) از مسیر BFF
  // با کوکی HttpOnly؛ خطای سرور با پیام دقیق برمی‌گردد.
  const requestWithProgress = <T>(
    path: string,
    init: PlatformRequestInit = {},
    onProgress?: PlatformUploadProgress,
  ): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      if (typeof XMLHttpRequest === "undefined") {
        reject(new Error("آپلود در این محیط پشتیبانی نمی‌شود."));
        return;
      }
      const method = (init.method ?? "GET").toUpperCase();
      const headers = new Headers(init.headers);
      const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
      const xhr = new XMLHttpRequest();
      xhr.open(method, joinUrl(apiBaseUrl, path));
      xhr.responseType = "json";
      xhr.withCredentials = true;
      if (init.body != null && !isFormData && !headers.has("Content-Type")) {
        xhr.setRequestHeader("Content-Type", "application/json");
      }
      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            onProgress(Math.min(1, event.loaded / event.total));
          }
        };
      }
      xhr.onload = () => {
        const responseBody = (xhr.response ?? {}) as Record<string, unknown>;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(responseBody as T);
          return;
        }
        const message =
          typeof responseBody.error === "string"
            ? responseBody.error
            : `request failed: ${xhr.status}`;
        reject(new PlatformHttpError(message, xhr.status, responseBody));
      };
      xhr.onerror = () => reject(new Error("ارتباط با سرور برقرار نشد."));
      xhr.send(init.body as XMLHttpRequestBodyInit | null);
    });

  return {
    kind: "web",
    apiBaseUrl,
    capabilities: { geo: webGeo },
    request,
    requestWithProgress,
    async requestOtp(mobile) {
      await requestJson(joinUrl(authBaseUrl, "/request-otp"), {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ mobile }),
      });
    },
    async verifyOtp(mobile, code): Promise<VerifyOtpResult> {
      const response = await requestJson<VerifyResponse>(
        joinUrl(authBaseUrl, "/verify-otp"),
        {
          method: "POST",
          credentials: "include",
          body: JSON.stringify({ mobile, code }),
        },
      );
      const needProfile = response.data.need_profile === true;
      return {
        user: normalizeAuthUser(response.data.user, needProfile),
        needProfile,
      };
    },
    async restoreSession() {
      try {
        const response = await request<{ data: AuthUserPayload }>("/me");
        return normalizeAuthUser(response.data);
      } catch (error) {
        if (error instanceof PlatformHttpError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    async logout() {
      await requestJson(joinUrl(authBaseUrl, "/logout"), {
        method: "POST",
        credentials: "include",
      });
    },
  };
}
