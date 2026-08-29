import { joinUrl, PlatformHttpError, requestJson } from "./http";
import type {
  AuthUser,
  PlatformRequestInit,
  PlatformRuntime,
  SecureTokenStorage,
  VerifyOtpResult,
} from "./types";

type NativePlatformOptions = {
  apiBaseUrl: string;
  tokenStorage: SecureTokenStorage;
};

type VerifyResponse = {
  data: {
    token: string;
    user: AuthUser;
    need_profile?: boolean;
  };
};

export function createNativePlatformRuntime({
  apiBaseUrl,
  tokenStorage,
}: NativePlatformOptions): PlatformRuntime {
  const request = async <T>(path: string, init: PlatformRequestInit = {}) => {
    const headers = new Headers(init.headers);
    const token = await tokenStorage.getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    try {
      return await requestJson<T>(joinUrl(apiBaseUrl, path), {
        ...init,
        headers,
      });
    } catch (error) {
      if (error instanceof PlatformHttpError && error.status === 401 && token) {
        await tokenStorage.clearToken();
      }
      throw error;
    }
  };

  return {
    kind: "native",
    apiBaseUrl,
    request,
    async requestOtp(mobile) {
      await requestJson(joinUrl(apiBaseUrl, "/auth/request-otp"), {
        method: "POST",
        body: JSON.stringify({ mobile }),
      });
    },
    async verifyOtp(mobile, code): Promise<VerifyOtpResult> {
      const response = await requestJson<VerifyResponse>(
        joinUrl(apiBaseUrl, "/auth/verify-otp"),
        {
          method: "POST",
          body: JSON.stringify({ mobile, code }),
        },
      );
      await tokenStorage.setToken(response.data.token);
      return {
        user: response.data.user,
        needProfile: response.data.need_profile === true,
      };
    },
    async restoreSession() {
      const token = await tokenStorage.getToken();
      if (!token) return null;

      try {
        const response = await request<{ data: AuthUser }>("/me");
        return response.data;
      } catch (error) {
        if (error instanceof PlatformHttpError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    async logout() {
      await tokenStorage.clearToken();
    },
  };
}
