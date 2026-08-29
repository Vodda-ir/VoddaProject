import type { PlatformRuntime } from "../../platform/types";
import { parseBookingSlot, type BookingSlot } from "./types";

type AvailabilityResponse = {
  data?: unknown;
};

type CreateBookingResponse = {
  data?: unknown;
};

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
  const response = await runtime.request<AvailabilityResponse>(
    `/teachers/${teacherId}/availability?${search.toString()}`,
  );
  const rows = Array.isArray(response.data) ? response.data : [];
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

export async function createBooking(
  runtime: PlatformRuntime,
  input: { teacherId: number; serviceId: number; scheduledAt: string; note?: string },
) {
  return runtime.request<CreateBookingResponse>("/sessions", {
    method: "POST",
    body: JSON.stringify({
      teacher_id: input.teacherId,
      service_id: input.serviceId,
      scheduled_at: input.scheduledAt,
      note: input.note?.trim() ?? "",
    }),
  });
}
