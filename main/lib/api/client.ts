import { getAccessToken } from "@/lib/auth/token";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5566";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Like apiFetch but adds Authorization: Bearer <token> when token is present (client-side). */
export async function apiFetchWithAuth<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? getAccessToken() : null;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers,
  };
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type MeResponse = {
  id: number;
  mobile: string;
  name: string;
  roles: string[];
  active_role: string;
};

export const api = {
  health: () => apiFetch<{ status: string }>("/healthz"),
  auth: {
    requestOtp: (mobile: string) =>
      apiFetch("/auth/request-otp", {
        method: "POST",
        body: JSON.stringify({ mobile }),
      }),
    verifyOtp: (mobile: string, code: string) =>
      apiFetch<{ access_token: string; refresh_token: string }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ mobile, code }),
      }),
    getMe: () => apiFetchWithAuth<MeResponse>("/me"),
  },
};
