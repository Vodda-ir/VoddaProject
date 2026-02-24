import { getAccessToken } from "@/lib/auth/token";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5566";

function buildUrl(path: string, query?: Record<string, string | number | undefined>) {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

export async function apiFetch<T>(path: string, options?: RequestInit, query?: Record<string, string | number | undefined>): Promise<T> {
  const res = await fetch(buildUrl(path, query), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json() as Promise<T>;
}

export async function apiFetchWithAuth<T>(path: string, options?: RequestInit, query?: Record<string, string | number | undefined>): Promise<T> {
  const token = typeof window !== "undefined" ? getAccessToken() : null;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers,
  };
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  const res = await fetch(buildUrl(path, query), {
    ...options,
    headers,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json() as Promise<T>;
}

export type MeResponse = {
  id: number;
  mobile: string;
  name: string;
  roles: string[];
  active_role: "learner" | "teacher" | "admin";
};

export type TeacherSummary = {
  id: number;
  user_id: number;
  name: string;
  specialty: string;
  level: "beginner" | "intermediate" | "advanced";
  bio: string;
  price_per_30min: number;
  verification_status: "pending" | "approved" | "rejected";
  average_rating: number;
};

export type BookingSummary = {
  id: number;
  learner_id: number;
  learner_name: string;
  teacher_profile_id: number;
  teacher_name: string;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "completed";
  notes: string;
  created_at: string;
};

export type WalletTransactionItem = {
  id: number;
  amount: number;
  type: string;
  reference_id: string;
  description: string;
  created_at: string;
};

export type WalletTransactionsResponse = {
  wallet_id: number;
  balance: number;
  transactions: WalletTransactionItem[];
};

export type WithdrawRequestItem = {
  id: number;
  user_id: number;
  user_name: string;
  user_mobile: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid";
  bank_info: string;
  processed_at?: string;
  created_at: string;
};

export type NotificationItem = {
  id: number;
  title: string;
  body: string;
  read_at?: string;
  created_at: string;
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
      apiFetch<{ access_token: string; refresh_token: string; expires_in: number }>("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ mobile, code }),
      }),
    getMe: () => apiFetchWithAuth<MeResponse>("/me"),
    updateProfile: (name: string) =>
      apiFetchWithAuth<MeResponse>("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      }),
    setActiveRole: (role: "learner" | "teacher" | "admin") =>
      apiFetchWithAuth<{ access_token: string; refresh_token: string; expires_in: number }>("/me/active-role", {
        method: "POST",
        body: JSON.stringify({ role }),
      }),
  },
  teachers: {
    list: (query?: { query?: string; specialty?: string; level?: string }) =>
      apiFetch<{ items: TeacherSummary[] }>("/teachers", undefined, query),
    getById: (id: number) => apiFetch<TeacherSummary>(`/teachers/${id}`),
    upsertProfile: (payload: {
      specialty: string;
      level: "beginner" | "intermediate" | "advanced";
      bio: string;
      price_per_30min: number;
    }) =>
      apiFetchWithAuth<TeacherSummary>("/teacher/profile", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    adminPending: () => apiFetchWithAuth<{ items: TeacherSummary[] }>("/admin/teachers/pending"),
    adminApprove: (id: number) =>
      apiFetchWithAuth<TeacherSummary>(`/admin/teachers/${id}/approve`, {
        method: "POST",
      }),
    adminReject: (id: number) =>
      apiFetchWithAuth<TeacherSummary>(`/admin/teachers/${id}/reject`, {
        method: "POST",
      }),
  },
  bookings: {
    create: (payload: {
      teacher_profile_id: number;
      slot_date: string;
      slot_start: string;
      slot_end: string;
      notes?: string;
    }) =>
      apiFetchWithAuth<BookingSummary>("/bookings", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    listMy: () => apiFetchWithAuth<{ items: BookingSummary[] }>("/bookings/my"),
    listTeacher: () => apiFetchWithAuth<{ items: BookingSummary[] }>("/teacher/bookings"),
    accept: (id: number) =>
      apiFetchWithAuth<BookingSummary>(`/bookings/${id}/accept`, {
        method: "POST",
      }),
    reject: (id: number, reason?: string) =>
      apiFetchWithAuth<BookingSummary>(`/bookings/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
  },
  sessions: {
    token: (id: number) =>
      apiFetchWithAuth<{ session_id: number; room_name: string; token: string; provider: string }>(`/sessions/${id}/token`, {
        method: "POST",
      }),
    end: (id: number) =>
      apiFetchWithAuth<BookingSummary>(`/sessions/${id}/end`, {
        method: "POST",
      }),
  },
  wallet: {
    topupInitiate: (amount: number) =>
      apiFetchWithAuth<{ reference_id: string; amount: number; payment_url: string; status: string }>("/wallet/topup/initiate", {
        method: "POST",
        body: JSON.stringify({ amount }),
      }),
    topupVerify: (referenceId: string, amount: number) =>
      apiFetchWithAuth<{ reference_id: string; status: string; balance: number; already_done: boolean }>("/wallet/topup/verify", {
        method: "POST",
        body: JSON.stringify({ reference_id: referenceId, amount }),
      }),
    transactions: () => apiFetchWithAuth<WalletTransactionsResponse>("/wallet/transactions"),
    withdrawRequest: (amount: number, bankInfo: string) =>
      apiFetchWithAuth<WithdrawRequestItem>("/wallet/withdraw-requests", {
        method: "POST",
        body: JSON.stringify({ amount, bank_info: bankInfo }),
      }),
    adminListWithdrawRequests: (status?: string) =>
      apiFetchWithAuth<{ items: WithdrawRequestItem[] }>("/admin/withdraw-requests", undefined, { status }),
    adminProcessWithdrawRequest: (id: number, action: "approved" | "rejected" | "paid") =>
      apiFetchWithAuth<WithdrawRequestItem>(`/admin/withdraw-requests/${id}/process`, {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
  },
  ratings: {
    create: (payload: { booking_id: number; score: number; comment?: string }) =>
      apiFetchWithAuth("/ratings", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  notifications: {
    list: () => apiFetchWithAuth<{ items: NotificationItem[] }>("/notifications"),
    read: (id: number) =>
      apiFetchWithAuth<{ message: string }>(`/notifications/${id}/read`, {
        method: "POST",
      }),
  },
};
