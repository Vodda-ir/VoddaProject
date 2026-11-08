export type LearnerSessionStatus = "pending" | "confirmed" | "done" | "canceled" | string;

export type LearnerSession = {
  id: number;
  teacherId: number;
  teacherName: string;
  teacherAvatar: string;
  service: string;
  scheduledAt: string;
  localDate: string;
  localStart: string;
  localEnd: string;
  duration: number;
  price: number;
  status: LearnerSessionStatus;
  rated: boolean;
  note: string;
  rejectNote: string;
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function integer(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function parseLearnerSession(value: unknown): LearnerSession | null {
  const row = record(value);
  if (!row) return null;

  const id = integer(row.id);
  if (id <= 0) return null;

  const teacher = record(row.teacher);
  const teacherUser = record(teacher?.user);

  return {
    id,
    teacherId: integer(row.teacher_id ?? teacher?.id),
    teacherName: text(teacherUser?.name, "استاد"),
    teacherAvatar: text(teacherUser?.avatar_url),
    service: text(row.service ?? row.title),
    scheduledAt: text(row.scheduled_at),
    localDate: text(row.local_date),
    localStart: text(row.local_start),
    localEnd: text(row.local_end),
    duration: integer(row.duration, 30),
    price: integer(row.price),
    status: text(row.status, "pending"),
    rated: row.rated === true,
    note: text(row.note),
    rejectNote: text(row.reject_note),
  };
}

export function hasOfficialSessionTime(session: LearnerSession): boolean {
  return Boolean(session.localDate && session.localStart && session.localEnd);
}

export function isUpcomingSession(session: LearnerSession): boolean {
  return session.status === "pending" || session.status === "confirmed" || session.status === "awaiting_payment";
}
