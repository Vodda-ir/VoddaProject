"use client";

import type { UniversalAppConfig } from "../../config";
import { TeacherCard } from "../teachers/TeacherCard";
import type { Teacher } from "../teachers/types";

/* ═══ ۰.۹.۲ — کارت نمایشی اساتید برتر = همان کارت واحد اساتید (TeacherCard) ═══
 * به درخواست کاربر: پروفایل اساتید برتر و پیشنهادی از لحاظ شکلی دقیقاً یکدست است.
 * پیاده‌سازی کامل (تایپوگرافی/فاصله/سایه/نشان‌ها/دکمه) در features/teachers/TeacherCard.tsx
 * است؛ این پوشش فقط امضای قدیمی صفحهٔ نخست (teacher/config/wide) را حفظ می‌کند. */
export function TopTeacherShowcase({
  teacher,
  config,
  wide,
}: {
  teacher: Teacher;
  config: UniversalAppConfig;
  wide?: boolean;
}) {
  return <TeacherCard teacher={teacher} config={config} wide={wide} />;
}
