export type BookingSlot = {
  startAt: string;
  endAt: string;
  localDate: string;
  localStart: string;
  localEnd: string;
  weekday: number;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback = -1) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function parseBookingSlot(value: unknown): BookingSlot {
  const data = record(value);
  return {
    startAt: stringValue(data.start_at),
    endAt: stringValue(data.end_at),
    localDate: stringValue(data.local_date),
    localStart: stringValue(data.local_start),
    localEnd: stringValue(data.local_end),
    weekday: numberValue(data.weekday),
  };
}
