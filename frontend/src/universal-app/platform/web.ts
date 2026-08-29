import { joinUrl, requestJson } from "./http";
import type {
  AuthUser,
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
    user: AuthUser;
    need_profile?: boolean;
  };
};

export function createWebPlatformRuntime(
  options: WebPlatformOptions = {},
): PlatformRuntime {
  const apiBaseUrl = options.apiBaseUrl ?? "/api/backend";
  const authBaseUrl = options.authBaseUrl ?? "/api/auth";

  const request = <T>(path: string, init?: PlatformRequestInit) =>
    requestJson<T>(joinUrl(apiBaseUrl, path), {
      ...init,
      credentials: "same-origin",
    });

  return {
    kind: "web",
    apiBaseUrl,
    request,
    async requestOtp(mobile) {
      await requestJson(joinUrl(authBaseUrl, "/request-otp"), {
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ mobile }),
      });
    },
    async verifyOtp(mobile, code): Promise<VerifyOtpResult> {
      const response = await requestJson<VerifyResponse>(
        joinUrl(authBaseUrl, "/verify-otp"),
        {
          method: "POST",
          credentials: "same-origin",
          body: JSON.stringify({ mobile, code }),
        },
      );
      return {
        user: response.data.user,
        needProfile: response.data.need_profile === true,
      };
    },
    async restoreSession() {
      try {
        const response = await request<{ data: AuthUser }>("/me");
        return response.data;
      } catch (error) {
        if (error instanceof Error && "status" in error && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    async logout() {
      await requestJson(joinUrl(authBaseUrl, "/logout"), {
        method: "POST",
        credentials: "same-origin",
      });
    },
  };
}
