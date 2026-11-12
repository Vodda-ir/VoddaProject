// تایپ‌ها و پارسرهای دفاعیِ خدمات حضوری قرآنی (فراخوان مراسم، پذیرش قاری،
// قرارداد و تسویه). پاسخ بک‌اند همیشه داخل پاکت `{ data }` می‌آید؛ این‌جا
// شکل‌ها را قبل از مصرف نرمال می‌کنیم تا داده ناقص صفحه را نیندازد.

import { asInteger, asNumber, asRecord, asString } from "../../platform/api";

export type CeremonyCallStatus = "searching" | "assigned" | "in_progress" | "completed" | "canceled" | "expired";

export type CeremonyAudience = "both" | "brothers" | "sisters";

export type CeremonyCall = {
  id: number;
  official_service_id: number;
  title: string;
  icon: string;
  note: string;
  scheduled_at: string;
  city: string;
  venue_hint: string;
  guests_count: number;
  reciters_needed: number;
  budget_min: number;
  budget_max: number;
  audience: CeremonyAudience;
  status: CeremonyCallStatus;
  deadline: string;
  deposit_rate: number;
  offer_count: number;
  created_at: string;
  organizer_name: string;
  organizer_avatar: string;
};

export type CeremonyOfferStatus = "waiting" | "accepted" | "declined" | "released" | "chosen";

export type SampleView = {
  id: number;
  title: string;
  url: string;
  length: string;
};

export type CeremonyOfferProvider = {
  teacher_id: number;
  name: string;
  avatar_url: string;
  tag: string;
  city: string;
  tier: string;
  level: string;
  female: boolean;
  rating: number;
  reviews: number;
  samples: SampleView[];
};

export type CeremonyOffer = {
  id: number;
  call_id: number;
  status: CeremonyOfferStatus;
  price: number;
  message: string;
  responded_at: string;
  provider: CeremonyOfferProvider;
};

export type CeremonyCallView = {
  call: CeremonyCall | null;
  offers: CeremonyOffer[];
};

export type CeremonyBookingStatus = "deposit_pending" | "deposit_paid" | "settled" | "cancelled";

export type CeremonyBookingRole = "organizer" | "provider";

export type CeremonyBooking = {
  id: number;
  call_id: number;
  role: CeremonyBookingRole;
  status: CeremonyBookingStatus;
  scheduled_at: string;
  city: string;
  venue: string;
  service_title: string;
  price: number;
  commission_rate: number;
  commission_amount: number;
  deposit_rate: number;
  deposit_amount: number;
  note: string;
  created_at: string;
  settled_at: string;
  provider: { teacher_id: number; name: string; avatar_url: string; tag: string; city: string; tier: string; phone: string };
  organizer: { name: string; avatar_url: string; phone: string };
};

export type OfficialInPersonService = {
  id: number;
  category: string;
  title: string;
  description: string;
  icon: string;
};

export type PresenceService = {
  id: number;
  official_service_id: number;
  title: string;
  base_price: number;
  duration: number;
  cities: string;
  note: string;
  active: boolean;
};

export type PresenceProvider = {
  teacher_id: number;
  name: string;
  avatar_url: string;
  tag: string;
  field: string;
  city: string;
  level: string;
  tier: string;
  female: boolean;
  rating: number;
  reviews: number;
  sessions: number;
  bio: string;
  services: PresenceService[];
  samples: SampleView[];
};

export type TeacherCeremonyInboxCall = {
  call: CeremonyCall;
  accepted: boolean;
  my_offer: CeremonyOffer | null;
};

export type TeacherCeremonyInbox = {
  calls: TeacherCeremonyInboxCall[];
  offers: CeremonyOffer[];
};

export type CeremonyPayMethod = "wallet" | "gateway";

export type CeremonyWalletPayResult = {
  paid_via_wallet: true;
  booking: CeremonyBooking;
};

export type CeremonyGatewayPayResult = {
  paid_via_wallet: false;
  token: string;
  res_num: string;
  amount: number;
  booking: CeremonyBooking;
};

const AUDIENCES: CeremonyAudience[] = ["both", "brothers", "sisters"];
const CALL_STATUSES: CeremonyCallStatus[] = ["searching", "assigned", "in_progress", "completed", "canceled", "expired"];
const OFFER_STATUSES: CeremonyOfferStatus[] = ["waiting", "accepted", "declined", "released", "chosen"];
const BOOKING_STATUSES: CeremonyBookingStatus[] = ["deposit_pending", "deposit_paid", "settled", "cancelled"];

function pickEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function parseSample(value: unknown): SampleView {
  const row = asRecord(value) ?? {};
  return {
    id: asInteger(row.id),
    title: asString(row.title),
    url: asString(row.url),
    length: asString(row.length),
  };
}

function parseSamples(value: unknown): SampleView[] {
  if (!Array.isArray(value)) return [];
  return value.map(parseSample);
}

export function parseOfficialService(value: unknown): OfficialInPersonService | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = asInteger(row.id);
  const title = asString(row.title);
  if (id <= 0 || !title) return null;
  return {
    id,
    category: asString(row.category),
    title,
    description: asString(row.description),
    icon: asString(row.icon, "book"),
  };
}

export function parsePresenceService(value: unknown): PresenceService | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = asInteger(row.id);
  if (id <= 0) return null;
  return {
    id,
    official_service_id: asInteger(row.official_service_id),
    title: asString(row.title),
    base_price: asNumber(row.base_price),
    duration: asInteger(row.duration),
    cities: asString(row.cities),
    note: asString(row.note),
    active: row.active !== false,
  };
}

export function parseCeremonyCall(value: unknown): CeremonyCall | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = asInteger(row.id);
  if (id <= 0) return null;
  return {
    id,
    official_service_id: asInteger(row.official_service_id),
    title: asString(row.title),
    icon: asString(row.icon, "calendar"),
    note: asString(row.note),
    scheduled_at: asString(row.scheduled_at),
    city: asString(row.city),
    venue_hint: asString(row.venue_hint),
    guests_count: asInteger(row.guests_count),
    reciters_needed: asInteger(row.reciters_needed, 1),
    budget_min: asNumber(row.budget_min),
    budget_max: asNumber(row.budget_max),
    audience: pickEnum(row.audience, AUDIENCES, "both"),
    status: pickEnum(row.status, CALL_STATUSES, "searching"),
    deadline: asString(row.deadline),
    deposit_rate: asNumber(row.deposit_rate),
    offer_count: asInteger(row.offer_count),
    created_at: asString(row.created_at),
    organizer_name: asString(row.organizer_name),
    organizer_avatar: asString(row.organizer_avatar),
  };
}

export function parseCeremonyOffer(value: unknown): CeremonyOffer | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = asInteger(row.id);
  if (id <= 0) return null;
  const providerRow = asRecord(row.provider) ?? {};
  return {
    id,
    call_id: asInteger(row.call_id),
    status: pickEnum(row.status, OFFER_STATUSES, "waiting"),
    price: asNumber(row.price),
    message: asString(row.message),
    responded_at: asString(row.responded_at),
    provider: {
      teacher_id: asInteger(providerRow.teacher_id),
      name: asString(providerRow.name, "قاری"),
      avatar_url: asString(providerRow.avatar_url),
      tag: asString(providerRow.tag),
      city: asString(providerRow.city),
      tier: asString(providerRow.tier),
      level: asString(providerRow.level),
      female: providerRow.female === true,
      rating: asNumber(providerRow.rating),
      reviews: asInteger(providerRow.reviews),
      samples: parseSamples(providerRow.samples),
    },
  };
}

export function parseCeremonyCallView(value: unknown): CeremonyCallView {
  const row = asRecord(value) ?? {};
  return {
    call: parseCeremonyCall(row.call),
    offers: (Array.isArray(row.offers) ? row.offers : [])
      .map(parseCeremonyOffer)
      .filter((offer): offer is CeremonyOffer => offer !== null),
  };
}

export function parseCeremonyBooking(value: unknown): CeremonyBooking | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = asInteger(row.id);
  if (id <= 0) return null;
  const providerRow = asRecord(row.provider) ?? {};
  const organizerRow = asRecord(row.organizer) ?? {};
  return {
    id,
    call_id: asInteger(row.call_id),
    role: row.role === "provider" ? "provider" : "organizer",
    status: pickEnum(row.status, BOOKING_STATUSES, "deposit_pending"),
    scheduled_at: asString(row.scheduled_at),
    city: asString(row.city),
    venue: asString(row.venue),
    service_title: asString(row.service_title),
    price: asNumber(row.price),
    commission_rate: asNumber(row.commission_rate),
    commission_amount: asNumber(row.commission_amount),
    deposit_rate: asNumber(row.deposit_rate),
    deposit_amount: asNumber(row.deposit_amount),
    note: asString(row.note),
    created_at: asString(row.created_at),
    settled_at: asString(row.settled_at),
    provider: {
      teacher_id: asInteger(providerRow.teacher_id),
      name: asString(providerRow.name, "قاری"),
      avatar_url: asString(providerRow.avatar_url),
      tag: asString(providerRow.tag),
      city: asString(providerRow.city),
      tier: asString(providerRow.tier),
      phone: asString(providerRow.phone),
    },
    organizer: {
      name: asString(organizerRow.name, "برگزارکننده"),
      avatar_url: asString(organizerRow.avatar_url),
      phone: asString(organizerRow.phone),
    },
  };
}

export function parsePresenceProvider(value: unknown): PresenceProvider | null {
  const row = asRecord(value);
  if (!row) return null;
  const teacherId = asInteger(row.teacher_id);
  if (teacherId <= 0) return null;
  return {
    teacher_id: teacherId,
    name: asString(row.name, "قاری"),
    avatar_url: asString(row.avatar_url),
    tag: asString(row.tag),
    field: asString(row.field),
    city: asString(row.city),
    level: asString(row.level),
    tier: asString(row.tier),
    female: row.female === true,
    rating: asNumber(row.rating),
    reviews: asInteger(row.reviews),
    sessions: asInteger(row.sessions),
    bio: asString(row.bio),
    services: (Array.isArray(row.services) ? row.services : [])
      .map(parsePresenceService)
      .filter((service): service is PresenceService => service !== null),
    samples: parseSamples(row.samples),
  };
}
