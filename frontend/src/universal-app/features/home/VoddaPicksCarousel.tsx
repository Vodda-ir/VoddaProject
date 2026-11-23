"use client";

import type { UniversalAppConfig } from "../../config";
import { TeacherShowcaseCarousel, SHOWCASE_THEME_GOLD } from "./TeacherShowcaseCarousel";
import type { Teacher } from "../teachers/types";

/* ═══ ۱.۱ — «پیشنهاد وُدّا» — کروسل یکپارچهٔ اساتید برتر + پیشنهادی ═══
 * به‌جای دو ردیف جدا (اساتید برتر + اساتید پیشنهادی)، یک کروسل خوش‌رنگ با
 * قاب طلایی و گرادیان کرم. از ۱.ب.۳ موتور مشترک TeacherShowcaseCarousel با
 * هویت طلایی برند استفاده می‌کند؛ اسلاید ۱ کارت مربعی در موبایل (با پیش‌نمای
 * لبه) و ۲ کارت در دسکتاپ؛ فلش + نقطه‌گذار + چرخش خودکار ۴.۵ ثانیه با توقف
 * هنگام تعامل کاربر. کارت‌ها همان کارت یکدست TeacherCard (۰.۹.۲) هستند.
 * ۱.ب.۴ — شعار برجستهٔ سرِ کاروسل پیش از کادرها. */

export function VoddaPicksCarousel({
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
      theme={SHOWCASE_THEME_GOLD}
      ariaLabel="پیشنهاد وُدّا"
      loadingLabel="در حال بارگذاری پیشنهادها"
      title="پیشنهاد وُدّا"
      subtitle="برگزیدهٔ برترین و پیشنهادی‌ترین استادها برای شما"
      slogan="قرآن را از برترین‌ها بیاموزید"
      icon="sparkle"
      seeAllHref="/search"
    />
  );
}
