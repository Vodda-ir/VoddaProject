import { asArray, type ApiEnvelope } from "../../platform/api";
import type { PlatformRuntime } from "../../platform/types";
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

export type BookingPaymentMethod = "wallet" | "gateway";

export type BookingGatewayResult = {
  session: unknown;
  redirect_url?: string;
  res_num?: string;
  paid_via_wallet?: boolean;
};

export async function createBooking(
  runtime: PlatformRuntime,
  input: { teacherId: number; serviceId: number; scheduledAt: string; note?: string; paymentMethod?: BookingPaymentMethod },
) {
  return runtime.request<ApiEnvelope<BookingGatewayResult>>("/sessions", {
    method: "POST",
    body: JSON.stringify({
      teacher_id: input.teacherId,
      service_id: input.serviceId,
      scheduled_at: input.scheduledAt,
      note: input.note?.trim() ?? "",
      payment_method: input.paymentMethod ?? "wallet",
    }),
  });
}

/** Re-opens the Saman checkout for a booking still awaiting payment. */
export async function payBooking(
  runtime: PlatformRuntime,
  sessionId: number,
): Promise<{ redirect_url: string; res_num: string; amount: number }> {
  const response = await runtime.request<ApiEnvelope<{ redirect_url: string; res_num: string; amount: number }>>(
    `/sessions/${sessionId}/pay`,
    { method: "POST" },
  );
  if (!response.data?.redirect_url) throw new Error("لینک درگاه پرداخت دریافت نشد.");
  return response.data;
}

export async function getBookingMe(runtime: PlatformRuntime): Promise<{ id: number; wallet: number }> {
  const response = await runtime.request<ApiEnvelope<{ id: number; wallet: number }>>("/me");
  if (!response.data) throw new Error("اطلاعات حساب دریافت نشد.");
  return { id: response.data.id, wallet: response.data.wallet ?? 0 };
}
