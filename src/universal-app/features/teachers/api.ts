import type { ApiEnvelope } from "../../platform/api";
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
  officialServiceId?: number;
  limit?: number;
  offset?: number;
};

type TeacherDetailData = {
  teacher?: unknown;
  reviews?: unknown;
};

export async function searchTeachers(runtime: PlatformRuntime, params: TeacherSearchParams = {}): Promise<Teacher[]> {
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

  const response = await runtime.request<ApiEnvelope>(`/teachers?${search.toString()}`);
  const rows = Array.isArray(response.data) ? response.data : [];
  return rows.map(parseTeacher).filter((teacher) => teacher.id > 0);
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
