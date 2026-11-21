import { asArray, type ApiEnvelope } from "../../platform/api";
import type { PlatformRuntime } from "../../platform/types";
import { APP_LANDING_SESSIONS } from "../payments/landing";
import { parseBookingSlot, type BookingSlot } from "./types";

export async function getBookingAvailability(
  runtime: PlatformRuntime,
  teacherId: number,
  serviceId: number,
  days = 14,
): Promise<BookingSlot[]> {
  if (!Number.isInteger(teacherId) || teacherId <= 0) throw new Error("شناسه استاد نامعتبر است.");
  if (!Number.isInteger(serviceId) || serviceId <= 0) throw new Error("شناسه خدمت نامعتبر است.");

  const search = new URLSearchParams({
    service_id: String(serviceId),
    days: String(Math.min(60, Math.max(1, days))),
  });
  const response = await runtime.request<ApiEnvelope>(
    `/teachers/${teacherId}/availability?${search.toString()}`,
  );
  const rows = asArray(response.data);
  return rows
    .map(parseBookingSlot)
    .filter(
      (slot) =>
        slot.startAt.length > 0 &&
        slot.endAt.length > 0 &&
        slot.localDate.length > 0 &&
        slot.localStart.length > 0 &&
        slot.localEnd.length > 0,
    );
}

export type BookingPaymentMethod = "wallet" | "gateway" | ""; // "" = جلسهٔ رایگان

export type BookingGatewayResult = {
  session: unknown;
  /** توکن بانک برای پست فرم به OnlinePG از مرورگر کاربر (مانند منافسه). */
  token?: string;
  res_num?: string;
  paid_via_wallet?: boolean;
};

export async function createBooking(
  runtime: PlatformRuntime,
  input: {
    teacherId: number;
    serviceId: number;
    scheduledAt: string;
    note?: string;
    paymentMethod?: BookingPaymentMethod;
    instant?: boolean;
    /** جلسات حضوری — محل برگزاری: "teacher" (دفتر استاد) یا "learner" (محل شما). */
    inPersonPlace?: "teacher" | "learner";
    /** نشانی دقیق محل — فقط برای inPersonPlace === "learner". */
    inPersonAddress?: string;
  },
) {
  const inPerson = input.inPersonPlace === "teacher" || input.inPersonPlace === "learner";
  return runtime.request<ApiEnvelope<BookingGatewayResult>>("/sessions", {
    method: "POST",
    body: JSON.stringify({
      teacher_id: input.teacherId,
      service_id: input.serviceId,
      scheduled_at: input.scheduledAt,
      note: input.note?.trim() ?? "",
      payment_method: input.paymentMethod ?? "wallet",
      // جلسهٔ فوری — رزرو همین‌لحظه (نیازمند فعال‌بودن کلید استاد)
      instant: input.instant === true,
      // جلسات حضوری — محل برگزاری و نشانی (برای جلسات آنلاین ارسال نمی‌شود)
      ...(inPerson
        ? {
            in_person_place: input.inPersonPlace,
            in_person_address: inPerson && input.inPersonPlace === "learner" ? (input.inPersonAddress?.trim() ?? "") : "",
          }
        : {}),
      // بعد از راند‌تریپ درگاه، کاربر به فهرست جلسات اپ یونیورسال برمی‌گردد
      // (نه پنل قدیمی) — قرارداد در backend: sanitizeReturnPath.
      return_to: APP_LANDING_SESSIONS,
    }),
  });
}

/** Re-opens the Saman checkout for a booking still awaiting payment. */
export async function payBooking(
  runtime: PlatformRuntime,
  sessionId: number,
): Promise<{ token: string; res_num: string; amount: number }> {
  const response = await runtime.request<ApiEnvelope<{ token?: string; res_num?: string; amount?: number }>>(
    `/sessions/${sessionId}/pay`,
    { method: "POST", body: JSON.stringify({ return_to: APP_LANDING_SESSIONS }) },
  );
  if (!response.data?.token) throw new Error("توکن درگاه پرداخت دریافت نشد.");
  return { token: response.data.token, res_num: response.data.res_num ?? "", amount: response.data.amount ?? 0 };
}

export async function getBookingMe(runtime: PlatformRuntime): Promise<{ id: number; wallet: number }> {
  const response = await runtime.request<ApiEnvelope<{ id: number; wallet: number }>>("/me");
  if (!response.data) throw new Error("اطلاعات حساب دریافت نشد.");
  return { id: response.data.id, wallet: response.data.wallet ?? 0 };
}
