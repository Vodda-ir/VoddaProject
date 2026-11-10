import { normalizeAuthUser, type AuthUserPayload } from "./auth";
import { joinUrl, PlatformHttpError, requestJson } from "./http";
import type {
  PlatformCapabilities,
  PlatformRequestInit,
  PlatformRuntime,
  SecureTokenStorage,
  VerifyOtpResult,
} from "./types";

type NativePlatformOptions = {
  apiBaseUrl: string;
  tokenStorage: SecureTokenStorage;
  capabilities?: PlatformCapabilities;
};

type VerifyResponse = {
  data: {
    token: string;
    user: AuthUserPayload;
    need_profile?: boolean;
  };
};

export function createNativePlatformRuntime({
  apiBaseUrl,
  tokenStorage,
  capabilities,
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
    capabilities,
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
      const needProfile = response.data.need_profile === true;
      return {
        user: normalizeAuthUser(response.data.user, needProfile),
        needProfile,
      };
    },
    async restoreSession() {
      const token = await tokenStorage.getToken();
      if (!token) return null;

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
      await tokenStorage.clearToken();
    },
  };
}
