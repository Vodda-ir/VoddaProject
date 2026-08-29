import type { PlatformRuntime } from "../../platform/types";
import { parseTeacher, type Teacher } from "./types";

export type TeacherSearchParams = {
  query?: string;
  field?: string;
  city?: string;
  female?: boolean;
  limit?: number;
  offset?: number;
};

type TeacherListResponse = {
  data?: unknown;
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
  search.set("limit", String(Math.min(100, Math.max(1, params.limit ?? 50))));
  search.set("offset", String(Math.max(0, params.offset ?? 0)));

  const response = await runtime.request<TeacherListResponse>(`/teachers?${search.toString()}`);
  const rows = Array.isArray(response.data) ? response.data : [];
  return rows.map(parseTeacher).filter((teacher) => teacher.id > 0);
}
