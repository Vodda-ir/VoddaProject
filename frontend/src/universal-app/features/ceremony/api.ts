// فراخوانی‌های API خدمات حضوری قرآنی — دقیقاً مطابق قرارداد بک‌اند.
// بک‌اند JSON سخت‌گیرانه دارد (فیلد ناشناخته خطای decode می‌دهد)، پس بدنهٔ
// درخواست‌ها فقط و فقط فیلدهای مستند را می‌فرستد.

import { asArray, asRecord, type ApiEnvelope } from "../../platform/api";
import type { PlatformRuntime } from "../../platform/types";
import { ceremonyBookingLanding } from "../payments/landing";
import {
  parseCeremonyBooking,
  parseCeremonyCall,
  parseCeremonyCallView,
  parseCeremonyOffer,
  parseOfficialService,
  parsePresenceProvider,
  parsePresenceService,
  type CeremonyBooking,
  type CeremonyCallView,
  type CeremonyGatewayPayResult,
  type CeremonyOffer,
  type CeremonyPayMethod,
  type CeremonyWalletPayResult,
  type OfficialInPersonService,
  type PresenceProvider,
  type PresenceService,
  type TeacherCeremonyInbox,
} from "./types";

function requireData<T>(value: T | undefined, fallbackMessage: string): T {
  if (value === undefined || value === null) throw new Error(fallbackMessage);
  return value;
}

/** فهرست رسمی خدمات حضوری (فقط mode=in_person). */
export async function getInPersonCatalog(runtime: PlatformRuntime): Promise<OfficialInPersonService[]> {
  const response = await runtime.request<ApiEnvelope>("/catalog/services?mode=in_person");
  return asArray(response.data)
    .map(parseOfficialService)
    .filter((service): service is OfficialInPersonService => service !== null);
}

/** فهرست عمومی قاریان حضوری با فیلترهای اختیاری شهر و خدمت رسمی. */
export async function getPresenceProviders(
  runtime: PlatformRuntime,
  filters: { city?: string; officialServiceId?: number } = {},
): Promise<PresenceProvider[]> {
  const search = new URLSearchParams();
  if (filters.city && filters.city.trim()) search.set("city", filters.city.trim());
  if (filters.officialServiceId && filters.officialServiceId > 0) {
    search.set("official_service_id", String(filters.officialServiceId));
  }
  const query = search.toString();
  const response = await runtime.request<ApiEnvelope>(`/presence/providers${query ? `?${query}` : ""}`);
  return asArray(response.data)
    .map(parsePresenceProvider)
    .filter((provider): provider is PresenceProvider => provider !== null);
}

/** پروفایل عمومی یک قاری حضوری. */
export async function getPresenceProvider(runtime: PlatformRuntime, teacherId: number): Promise<PresenceProvider> {
  if (!Number.isInteger(teacherId) || teacherId <= 0) throw new Error("شناسه قاری نامعتبر است.");
  const response = await runtime.request<ApiEnvelope>(`/presence/providers/${teacherId}`);
  const provider = parsePresenceProvider(response.data);
  if (!provider) throw new Error("پروفایل قاری دریافت نشد.");
  return provider;
}

export type CreateCeremonyCallInput = {
  officialServiceId: number;
  note: string;
  /** RFC3339 UTC — از پیکر جلالی با تبدیل تهران ساخته می‌شود. */
  scheduledAt: string;
  city: string;
  venueHint: string;
  guestsCount: number;
  recitersNeeded: number;
  budgetMin: number;
  budgetMax: number;
  audience: "both" | "brothers" | "sisters";
};

/** ثبت فراخوان مراسم؛ خروجی: نمای کامل فراخوان تازه‌ساخته‌شده. */
export async function createCeremonyCall(
  runtime: PlatformRuntime,
  input: CreateCeremonyCallInput,
): Promise<CeremonyCallView> {
  const response = await runtime.request<ApiEnvelope>("/ceremony/calls", {
    method: "POST",
    body: JSON.stringify({
      official_service_id: input.officialServiceId,
      note: input.note,
      scheduled_at: input.scheduledAt,
      city: input.city,
      venue_hint: input.venueHint,
      guests_count: input.guestsCount,
      reciters_needed: input.recitersNeeded,
      budget_min: input.budgetMin,
      budget_max: input.budgetMax,
      audience: input.audience,
    }),
  });
  return parseCeremonyCallView(requireData(response.data, "ثبت فراخوان انجام نشد؛ پاسخ سرور نامعتبر بود."));
}

/** فراخوان‌های خود برگزارکننده (تازه‌ترین اول). */
export async function getCeremonyCalls(runtime: PlatformRuntime): Promise<CeremonyCallView[]> {
  const response = await runtime.request<ApiEnvelope>("/ceremony/calls");
  return asArray(response.data)
    .map(parseCeremonyCallView)
    .filter((view) => view.call !== null);
}

/** جزئیات یک فراخوان + پذیرش‌های رسیده. */
export async function getCeremonyCall(runtime: PlatformRuntime, callId: number): Promise<CeremonyCallView> {
  if (!Number.isInteger(callId) || callId <= 0) throw new Error("شناسه فراخوان نامعتبر است.");
  const response = await runtime.request<ApiEnvelope>(`/ceremony/calls/${callId}`);
  return parseCeremonyCallView(requireData(response.data, "فراخوان دریافت نشد."));
}

/** انتخاب پذیرش → ساخت قرارداد مراسم. خروجی: قرارداد تازه. */
export async function chooseCeremonyOffer(
  runtime: PlatformRuntime,
  callId: number,
  offerId: number,
): Promise<CeremonyBooking> {
  const response = await runtime.request<ApiEnvelope>(`/ceremony/calls/${callId}/choose`, {
    method: "POST",
    body: JSON.stringify({ offer_id: offerId }),
  });
  const booking = parseCeremonyBooking(requireData(response.data, "قطعی‌سازی فراخوان انجام نشد."));
  if (!booking) throw new Error("قطعی‌سازی فراخوان انجام نشد؛ پاسخ سرور نامعتبر بود.");
  return booking;
}

/** لغو فراخوان در حال جستجو. */
export async function cancelCeremonyCall(runtime: PlatformRuntime, callId: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/ceremony/calls/${callId}/cancel`, { method: "POST" });
}

export type DirectBookingInput = {
  presenceServiceId: number;
  /** RFC3339 UTC — از پیکر جلالی با تبدیل تهران ساخته می‌شود. */
  scheduledAt: string;
  city: string;
  venueHint: string;
  note: string;
};

/** رزرو مستقیم قاری از پروفایلش؛ خروجی: قرارداد مراسم. */
export async function createDirectBooking(
  runtime: PlatformRuntime,
  input: DirectBookingInput,
): Promise<CeremonyBooking> {
  const response = await runtime.request<ApiEnvelope>("/ceremony/bookings/direct", {
    method: "POST",
    body: JSON.stringify({
      presence_service_id: input.presenceServiceId,
      scheduled_at: input.scheduledAt,
      city: input.city,
      venue_hint: input.venueHint,
      note: input.note,
    }),
  });
  const booking = parseCeremonyBooking(requireData(response.data, "ثبت رزرو مستقیم انجام نشد."));
  if (!booking) throw new Error("ثبت رزرو مستقیم انجام نشد؛ پاسخ سرور نامعتبر بود.");
  return booking;
}

/** قراردادهای مراسم هر دو نقش (برگزارکننده/قاری) ادغام‌شده. */
export async function getCeremonyBookings(runtime: PlatformRuntime): Promise<CeremonyBooking[]> {
  const response = await runtime.request<ApiEnvelope>("/ceremony/bookings");
  return asArray(response.data)
    .map(parseCeremonyBooking)
    .filter((booking): booking is CeremonyBooking => booking !== null);
}

export async function getCeremonyBooking(runtime: PlatformRuntime, bookingId: number): Promise<CeremonyBooking> {
  if (!Number.isInteger(bookingId) || bookingId <= 0) throw new Error("شناسه قرارداد نامعتبر است.");
  const response = await runtime.request<ApiEnvelope>(`/ceremony/bookings/${bookingId}`);
  const booking = parseCeremonyBooking(requireData(response.data, "قرارداد دریافت نشد."));
  if (!booking) throw new Error("قرارداد دریافت نشد.");
  return booking;
}

export type CeremonyPayOutcome =
  | { method: "wallet"; booking: CeremonyBooking }
  | { method: "gateway"; token: string; resNum: string; amount: number; booking: CeremonyBooking };

/** پرداخت ودیعه از کیف پول یا گرفتن توکن درگاه سامان. */
export async function payCeremonyBooking(
  runtime: PlatformRuntime,
  bookingId: number,
  method: CeremonyPayMethod,
): Promise<CeremonyPayOutcome> {
  const response = await runtime.request<ApiEnvelope>(`/ceremony/bookings/${bookingId}/pay`, {
    method: "POST",
    body: JSON.stringify({
      method,
      // بعد از راند‌تریپ بانک، کاربر به جزئیات همان قرارداد در اپ یونیورسال
      // برمی‌گردد (‎?payment=success|verify|failed‎) — قرارداد backend.
      return_to: ceremonyBookingLanding(bookingId),
    }),
  });
  const data = asRecord(requireData(response.data, "پرداخت انجام نشد؛ پاسخ سرور نامعتبر بود.")) ?? {};
  const booking = parseCeremonyBooking(data.booking);
  if (!booking) throw new Error("وضعیت قرارداد پس از پرداخت دریافت نشد.");
  if (data.paid_via_wallet === true) {
    return { method: "wallet", booking };
  }
  const token = typeof data.token === "string" ? data.token.trim() : "";
  if (!token) throw new Error("توکن درگاه پرداخت دریافت نشد.");
  return {
    method: "gateway",
    token,
    resNum: typeof data.res_num === "string" ? data.res_num : "",
    amount: typeof data.amount === "number" && Number.isFinite(data.amount) ? data.amount : 0,
    booking,
  };
}

/** تأیید اجرای مراسم از سوی برگزارکننده → تسویهٔ حق‌الزحمه قاری. */
export async function confirmCeremonyBooking(runtime: PlatformRuntime, bookingId: number): Promise<CeremonyBooking> {
  const response = await runtime.request<ApiEnvelope>(`/ceremony/bookings/${bookingId}/confirm`, { method: "POST" });
  const booking = parseCeremonyBooking(requireData(response.data, "تأیید اجرا انجام نشد."));
  if (!booking) throw new Error("تأیید اجرا انجام نشد؛ پاسخ سرور نامعتبر بود.");
  return booking;
}

/** لغو قرارداد — سیاست بازگشت وجه بر اساس فاصله تا زمان مراسم. */
export async function cancelCeremonyBooking(runtime: PlatformRuntime, bookingId: number): Promise<CeremonyBooking> {
  const response = await runtime.request<ApiEnvelope>(`/ceremony/bookings/${bookingId}/cancel`, { method: "POST" });
  const booking = parseCeremonyBooking(requireData(response.data, "لغو قرارداد انجام نشد."));
  if (!booking) throw new Error("لغو قرارداد انجام نشد؛ پاسخ سرور نامعتبر بود.");
  return booking;
}

/** صندوق ورودی قاری: فراخوان‌های باز + پذیرش‌های من. */
export async function getTeacherCeremonyInbox(runtime: PlatformRuntime): Promise<TeacherCeremonyInbox> {
  const response = await runtime.request<ApiEnvelope>("/teacher/ceremony/inbox");
  const data = asRecord(response.data) ?? {};
  return {
    calls: asArray(data.calls)
      .map((row) => {
        const entry = asRecord(row) ?? {};
        const call = parseCeremonyCall(entry.call);
        if (!call) return null;
        return {
          call,
          accepted: entry.accepted === true,
          matches_services: entry.matches_services === true,
          my_offer: parseCeremonyOffer(entry.my_offer),
        };
      })
      .filter((item): item is TeacherCeremonyInbox["calls"][number] => item !== null),
    offers: asArray(data.offers)
      .map(parseCeremonyOffer)
      .filter((offer): offer is CeremonyOffer => offer !== null),
  };
}

/** پذیرش فراخوان توسط قاری (قیمت اختیاری — پیش‌فرض: قیمت خدمت حضوری قاری). */
export async function acceptTeacherCeremonyCall(
  runtime: PlatformRuntime,
  callId: number,
  input: { price?: number; message?: string } = {},
): Promise<CeremonyOffer> {
  const body: Record<string, number | string> = {};
  if (typeof input.price === "number" && Number.isFinite(input.price) && input.price > 0) {
    body.price = Math.round(input.price);
  }
  if (input.message && input.message.trim()) {
    body.message = input.message.trim();
  }
  const response = await runtime.request<ApiEnvelope>(`/teacher/ceremony/calls/${callId}/accept`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const offer = parseCeremonyOffer(requireData(response.data, "پذیرش فراخوان انجام نشد."));
  if (!offer) throw new Error("پذیرش فراخوان انجام نشد؛ پاسخ سرور نامعتبر بود.");
  return offer;
}

/** پس گرفتن پذیرشِ در انتظار. */
export async function withdrawTeacherCeremonyOffer(runtime: PlatformRuntime, offerId: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/teacher/ceremony/offers/${offerId}/withdraw`, { method: "POST" });
}

/** خدمات حضوریِ خود قاری. */
export async function getTeacherPresenceServices(runtime: PlatformRuntime): Promise<PresenceService[]> {
  const response = await runtime.request<ApiEnvelope>("/teacher/presence-services");
  return asArray(response.data)
    .map(parsePresenceService)
    .filter((service): service is PresenceService => service !== null);
}

export type PresenceServiceInput = {
  officialServiceId: number;
  basePrice: number;
  duration: number;
  cities: string;
  note: string;
};

function presenceServiceBody(input: PresenceServiceInput) {
  return JSON.stringify({
    official_service_id: input.officialServiceId,
    base_price: Math.round(input.basePrice),
    duration: Math.round(input.duration),
    cities: input.cities,
    note: input.note,
  });
}

export async function createTeacherPresenceService(
  runtime: PlatformRuntime,
  input: PresenceServiceInput,
): Promise<PresenceService> {
  const response = await runtime.request<ApiEnvelope>("/teacher/presence-services", {
    method: "POST",
    body: presenceServiceBody(input),
  });
  const service = parsePresenceService(requireData(response.data, "ثبت خدمت حضوری انجام نشد."));
  if (!service) throw new Error("ثبت خدمت حضوری انجام نشد؛ پاسخ سرور نامعتبر بود.");
  return service;
}

export async function updateTeacherPresenceService(
  runtime: PlatformRuntime,
  serviceId: number,
  input: PresenceServiceInput,
): Promise<PresenceService> {
  if (!Number.isInteger(serviceId) || serviceId <= 0) throw new Error("شناسه خدمت نامعتبر است.");
  const response = await runtime.request<ApiEnvelope>(`/teacher/presence-services/${serviceId}`, {
    method: "PUT",
    body: presenceServiceBody(input),
  });
  const service = parsePresenceService(requireData(response.data, "به‌روزرسانی خدمت حضوری انجام نشد."));
  if (!service) throw new Error("به‌روزرسانی خدمت حضوری انجام نشد؛ پاسخ سرور نامعتبر بود.");
  return service;
}

export async function deleteTeacherPresenceService(runtime: PlatformRuntime, serviceId: number): Promise<void> {
  if (!Number.isInteger(serviceId) || serviceId <= 0) throw new Error("شناسه خدمت نامعتبر است.");
  await runtime.request<ApiEnvelope>(`/teacher/presence-services/${serviceId}`, { method: "DELETE" });
}
