import { normalizeAuthUser, type AuthUserPayload } from "./auth";
import { setAssetOriginFromApiBase } from "./asset";
import { joinUrl, PlatformHttpError, requestJson } from "./http";
import type {
  PlatformRequestInit,
  PlatformRuntime,
  VerifyOtpResult,
} from "./types";

type WebPlatformOptions = {
  apiBaseUrl?: string;
  authBaseUrl?: string;
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

  return {
    kind: "web",
    apiBaseUrl,
    request,
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
