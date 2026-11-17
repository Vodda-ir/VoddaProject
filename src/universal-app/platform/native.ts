import { normalizeAuthUser, type AuthUserPayload } from "./auth";
import { joinUrl, PlatformHttpError, requestJson } from "./http";
import type {
  PlatformCapabilities,
  PlatformRequestInit,
  PlatformRuntime,
  PlatformUploadProgress,
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

  // باگ avatar-upload — آپلود multipart با progress واقعی (XHR) مستقیم به
  // دامنهٔ سرور (api.vodda.ir) با Bearer token؛ مسیر هرگز نسبی نیست.
  const requestWithProgress = async <T>(
    path: string,
    init: PlatformRequestInit = {},
    onProgress?: PlatformUploadProgress,
  ): Promise<T> => {
    const token = await tokenStorage.getToken();
    return new Promise<T>((resolve, reject) => {
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
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
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
  };

  return {
    kind: "native",
    apiBaseUrl,
    capabilities,
    request,
    requestWithProgress,
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
