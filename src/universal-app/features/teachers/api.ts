import { asArray, asInteger, type ApiEnvelope } from "../../platform/api";
import type { PlatformRuntime } from "../../platform/types";
import {
  parseTeacher,
  parseTeacherReview,
  type Teacher,
  type TeacherDetail,
} from "./types";

export type TeacherSearchParams = {
  query?: string;
  field?: string;
  city?: string;
  female?: boolean;
  limit?: number;
  offset?: number;
  /** فراخوان: فیلتر موضوع رسمی — فقط اساتیدی که این خدمت رسمی را تدریس می‌کنند. */
  officialServiceId?: number;
};

export type TeacherSearchResult = {
  items: Teacher[];
  total: number;
};

type TeacherDetailData = {
  teacher?: unknown;
  reviews?: unknown;
};

function buildTeacherQuery(params: TeacherSearchParams): string {
  const search = new URLSearchParams();
  const query = params.query?.trim();
  const field = params.field?.trim();
  const city = params.city?.trim();

  if (query) search.set("q", query);
  if (field) search.set("field", field);
  if (city) search.set("city", city);
  if (typeof params.female === "boolean") search.set("female", String(params.female));
  if (params.officialServiceId && params.officialServiceId > 0) {
    search.set("official_service_id", String(params.officialServiceId));
  }
  search.set("limit", String(Math.min(100, Math.max(1, params.limit ?? 50))));
  search.set("offset", String(Math.max(0, params.offset ?? 0)));

  return search.toString();
}

function parseTeacherRows(response: ApiEnvelope & { total?: unknown }): TeacherSearchResult {
  const rows = asArray(response.data);
  const items = rows.map(parseTeacher).filter((teacher) => teacher.id > 0);
  /* ۱.الف.۵ — مرتب‌سازی پایدار: کارت‌های درجه ۱ نخست (is_tier1 desc؛ ترتیب rank بک‌اند حفظ می‌شود). */
  items.sort((left, right) => Number(right.isTier1 === true) - Number(left.isTier1 === true));
  return { items, total: Math.max(asInteger(response.total, items.length), items.length) };
}

export async function searchTeachersPage(
  runtime: PlatformRuntime,
  params: TeacherSearchParams = {},
): Promise<TeacherSearchResult> {
  const response = await runtime.request<ApiEnvelope & { total?: unknown }>(
    `/teachers?${buildTeacherQuery(params)}`,
  );
  return parseTeacherRows(response);
}

export async function searchTeachers(runtime: PlatformRuntime, params: TeacherSearchParams = {}): Promise<Teacher[]> {
  return (await searchTeachersPage(runtime, params)).items;
}

/**
 * ۱.ب.۵ — چیدمان «اساتید پیشنهادی» از endpoint محلی BFF (تکرار ≤ ۲ بین دو درخواست).
 * در اپ نیتیو (تماس مستقیم با بک‌اند) این مسیر وجود ندارد → [] و caller با
 * موتور محلی src/lib/home/discover.ts جایگزین می‌کند.
 */
export async function fetchRecommendedTeachers(
  runtime: PlatformRuntime,
  limit = 7,
): Promise<Teacher[]> {
  try {
    const response = await runtime.request<ApiEnvelope & { total?: unknown }>(
      `/teachers/recommended?limit=${limit}`,
    );
    return asArray(response.data)
      .map(parseTeacher)
      .filter((teacher) => teacher.id > 0);
  } catch {
    return [];
  }
}

export async function getTeacherDetail(runtime: PlatformRuntime, id: number): Promise<TeacherDetail> {
  if (!Number.isInteger(id) || id <= 0) throw new Error("شناسه استاد نامعتبر است.");

  const response = await runtime.request<ApiEnvelope<TeacherDetailData>>(`/teachers/${id}`);
  const teacher = parseTeacher(response.data?.teacher);
  if (teacher.id <= 0) throw new Error("اطلاعات استاد دریافت نشد.");

  const rows = Array.isArray(response.data?.reviews) ? response.data.reviews : [];
  return {
    teacher,
    reviews: rows.map(parseTeacherReview).filter((review) => review.id > 0),
  };
}
