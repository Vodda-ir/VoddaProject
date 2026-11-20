"use client";

import type { UniversalAppConfig } from "../../config";
import { TeacherShowcaseCarousel, type TeacherShowcaseTheme } from "./TeacherShowcaseCarousel";
import type { Teacher } from "../teachers/types";

/* ═══ ۱.ب.۳ — «اساتید بانو» — کاروسل اختصاصی بانوان استاد در پایان صفحهٔ اصلی ═══
 * درخواست مدیر: کاروسی زیبا مشابه «اساتید برتر» ولی با رنگ کاملاً متمایز.
 * هویت رز/گل‌مُشکی (در تقابل با طلایی/کرم برند): قاب blush، نشان قلبِ رز،
 * نقطه‌گذار و فلش‌های رز — همهٔ سازوکارها (اسلاید مربعی، پیش‌نمای لبه، فلش،
 * نقطه‌گذار، چرخش خودکار ۴.۵ ثانیه با توقف هنگام تعامل) از موتور مشترک
 * TeacherShowcaseCarousel می‌آید؛ کارت‌ها همان TeacherCard یکدست (۰.۹.۲). */

/** هویت رز «اساتید بانو» — پالتی گرم و بانوپسند، مستقل از طلایی برند. */
const SHOWCASE_THEME_BANO: TeacherShowcaseTheme = {
  frameBorder: "#eccdd6",
  frameBackground: "linear-gradient(165deg, #fffbfc 0%, #fdeef2 55%, #f8dfe6 100%)",
  frameShadow: `0 10px 26px rgba(93,42,58,.09), 0 0 16px rgba(168,74,99,.14)`,
  badgeBackground: "linear-gradient(135deg, #a84a63, #cd8ba1)",
  badgeShadow: "0 4px 12px rgba(122,52,72,.32)",
  badgeColor: "#fffbfc",
  titleColor: "#8a4257",
  accent: "#a84a63",
  accentSoft: "rgba(168,74,99,.10)",
  accentBorder: "#eccdd6",
  dotActive: "linear-gradient(90deg, #a84a63, #cd8ba1)",
  dotInactive: "rgba(122,52,72,.22)",
};

export function BanoTeachersCarousel({
  teachers,
  loading,
  wide,
  config,
}: {
  teachers: Teacher[];
  loading: boolean;
  wide: boolean;
  config: UniversalAppConfig;
}) {
  return (
    <TeacherShowcaseCarousel
      teachers={teachers}
      loading={loading}
      wide={wide}
      config={config}
      theme={SHOWCASE_THEME_BANO}
      ariaLabel="اساتید بانو"
      loadingLabel="در حال بارگذاری اساتید بانو"
      title="اساتید بانو"
      subtitle="قرآن‌آموزی در محضر استادان بانوی وُدّا"
      icon="heart"
      seeAllHref="/search?female=true"
    />
  );
}
