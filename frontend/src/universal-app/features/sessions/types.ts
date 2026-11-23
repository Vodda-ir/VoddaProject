export type LearnerSessionStatus = "pending" | "confirmed" | "done" | "canceled" | string;

/** نوع میزبانِ جلسه: صوتی/متنی/تصویری/حضوری — خالی یعنی جلسهٔ معمولی. */
export type SessionHostingMode = "voice" | "text" | "video" | "in_person" | "";

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
  /** جلسهٔ فوری — رزروِ همین‌لحظه. */
  instant: boolean;
  /** نوع جلسهٔ آنلاین (تلفنی/متنی/تصویری) یا حضوری. */
  mode: SessionHostingMode;
  /** جلسات حضوری — محل برگزاری: "teacher" (دفتر استاد) یا "learner" (محل شما). */
  inPersonPlace: "teacher" | "learner" | "";
  /** نشانی دقیق محل برگزاری جلسات حضوری. */
  inPersonAddress: string;
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
  const rawMode = text(row.mode);
  const mode: SessionHostingMode =
    rawMode === "voice" || rawMode === "text" || rawMode === "video" || rawMode === "in_person" ? rawMode : "";
  const rawPlace = text(row.in_person_place);

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
    instant: row.instant === true,
    mode,
    inPersonPlace: rawPlace === "teacher" || rawPlace === "learner" ? rawPlace : "",
    inPersonAddress: text(row.in_person_address),
  };
}

export function hasOfficialSessionTime(session: LearnerSession): boolean {
  return Boolean(session.localDate && session.localStart && session.localEnd);
}

export function isUpcomingSession(session: LearnerSession): boolean {
  return session.status === "pending" || session.status === "confirmed" || session.status === "awaiting_payment";
}
