export type TeacherService = {
  id: number;
  title: string;
  duration: number;
  price: number;
  icon: string;
  active: boolean;
};

export type TeacherReview = {
  id: number;
  rating: number;
  text: string;
  createdAt: string;
  learnerName: string;
};

export type Teacher = {
  id: number;
  name: string;
  field: string;
  tag: string;
  level: string;
  city: string;
  bio: string;
  price30: number;
  price60: number;
  female: boolean;
  verified: boolean;
  rating: number;
  reviews: number;
  sessions: number;
  followers: number;
  services: TeacherService[];
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
  return {
    id: numberValue(data.id),
    title: stringValue(data.title),
    duration: numberValue(data.duration, 30),
    price: numberValue(data.price),
    icon: stringValue(data.icon, "book"),
    active: booleanValue(data.active),
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

export function parseTeacher(value: unknown): Teacher {
  const data = record(value);
  const user = record(data.user);
  const services = Array.isArray(data.services) ? data.services.map(parseTeacherService) : [];

  return {
    id: numberValue(data.id),
    name: stringValue(user.name, "استاد وُدّا"),
    field: stringValue(data.field),
    tag: stringValue(data.tag),
    level: stringValue(data.level),
    city: stringValue(data.city),
    bio: stringValue(data.bio),
    price30: numberValue(data.price30),
    price60: numberValue(data.price60),
    female: booleanValue(data.female),
    verified: booleanValue(data.verified),
    rating: numberValue(data.rating),
    reviews: numberValue(data.reviews),
    sessions: numberValue(data.sessions),
    followers: numberValue(data.followers),
    services,
  };
}
