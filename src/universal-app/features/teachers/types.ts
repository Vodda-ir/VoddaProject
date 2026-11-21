export type SessionMode = "voice" | "text" | "video" | "in_person";

export type TeacherService = {
  id: number;
  title: string;
  duration: number;
  price: number;
  icon: string;
  active: boolean;
  /** نوع جلسه: "voice" | "text" | "video" | "in_person"؛ خالی = خدمت معمولی. */
  mode: SessionMode | "";
};

export type TeacherReview = {
  id: number;
  rating: number;
  text: string;
  createdAt: string;
  learnerName: string;
};

export type TeacherSample = {
  id: number;
  title: string;
  length: string;
  url: string;
};

export type Teacher = {
  id: number;
  userId: number;
  name: string;
  avatarUrl: string;
  field: string;
  tag: string;
  level: string;
  city: string;
  bio: string;
  price30: number;
  price60: number;
  female: boolean;
  verified: boolean;
  available: boolean;
  tier: string;
  /** آخرین فعالیت (۱.الف.۴) — ISO؛ نامشخص = چراغ حضور نشان داده نمی‌شود. */
  lastSeen?: string;
  /** کارت درجه ۱ (۱.الف.۵) — از BFF/بک‌اند؛ true یعنی نمایش ویژه. */
  isTier1?: boolean;
  /** ردیف نشان‌های درجه ۱: "international" | "free" | "instant" */
  tier1Badges?: string[];
  /** کلید جلسهٔ فوری — استاد پذیرای رزرو همین‌لحظه است. */
  instantEnabled: boolean;
  /** نشانی محل برگزاری جلسات حضوری استاد (دفتر/مؤسسه) — خالی یعنی فقط «محل شما». */
  inPersonAddress: string;
  /** کلید جلسات رایگان — خدمات صفر تومانی استاد فعال‌اند. */
  freeEnabled: boolean;
  rating: number;
  reviews: number;
  sessions: number;
  followers: number;
  services: TeacherService[];
  samples: TeacherSample[];
  createdAt: string;
};

export type TeacherDetail = {
  teacher: Teacher;
  reviews: TeacherReview[];
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" ? (value as JsonRecord) : {};
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function parseTeacherService(value: unknown): TeacherService {
  const data = record(value);
  const rawMode = stringValue(data.mode);
  const mode: SessionMode | "" =
    rawMode === "voice" || rawMode === "text" || rawMode === "video" || rawMode === "in_person"
      ? rawMode
      : "";
  return {
    id: numberValue(data.id),
    title: stringValue(data.title),
    duration: numberValue(data.duration, 30),
    price: numberValue(data.price),
    icon: stringValue(data.icon, "book"),
    active: booleanValue(data.active),
    mode,
  };
}

export function parseTeacherReview(value: unknown): TeacherReview {
  const data = record(value);
  const learner = record(data.learner);
  return {
    id: numberValue(data.id),
    rating: numberValue(data.rating),
    text: stringValue(data.text),
    createdAt: stringValue(data.created_at),
    learnerName: stringValue(learner.name, "قرآن‌آموز وُدّا"),
  };
}

function parseTeacherSample(value: unknown): TeacherSample {
  const data = record(value);
  return {
    id: numberValue(data.id),
    title: stringValue(data.title, "نمونه‌صوت"),
    length: stringValue(data.len),
    url: stringValue(data.url),
  };
}

export function parseTeacher(value: unknown): Teacher {
  const data = record(value);
  const user = record(data.user);
  const services = Array.isArray(data.services) ? data.services.map(parseTeacherService) : [];
  const samples = Array.isArray(data.samples) ? data.samples.map(parseTeacherSample) : [];

  return {
    id: numberValue(data.id),
    userId: numberValue(data.user_id),
    name: stringValue(user.name, "استاد وُدّا"),
    avatarUrl: stringValue(user.avatar_url),
    field: stringValue(data.field),
    tag: stringValue(data.tag),
    level: stringValue(data.level),
    city: stringValue(data.city),
    bio: stringValue(data.bio),
    price30: numberValue(data.price30),
    price60: numberValue(data.price60),
    female: booleanValue(data.female),
    verified: booleanValue(data.verified),
    available: booleanValue(data.available, true),
    tier: stringValue(data.tier),
    lastSeen: stringValue(data.last_seen ?? data.lastSeen ?? user.last_seen) || undefined,
    isTier1: booleanValue(data.is_tier1 ?? data.isTier1) || undefined,
    tier1Badges: Array.isArray(data.tier1_badges)
      ? data.tier1_badges.filter((item): item is string => typeof item === "string")
      : undefined,
    instantEnabled: booleanValue(data.instant_enabled),
    inPersonAddress: stringValue(data.in_person_address),
    freeEnabled: booleanValue(data.free_enabled, true),
    rating: numberValue(data.rating),
    reviews: numberValue(data.reviews),
    sessions: numberValue(data.sessions),
    followers: numberValue(data.followers),
    services,
    samples,
    createdAt: stringValue(data.created_at),
  };
}
