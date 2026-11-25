import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UniversalAppHost } from "./app/[[...path]]/universal-app-host";
import {
  Nav, Hero, VerseOfDayCard, CategoryTiles, FeaturedTeachers, PopularServices,
  FreeServicesSection, RecommendedTeachers, BanoTeachers,
  HowItWorks, WhyVodda, BecomeTeacher, DownloadApp, Footer,
} from "@/components/web/sections";
import { MonafesehPromoBanner, InstaQuranPromoBanner } from "@/components/web/promo-banners";
import { api, type Teacher } from "@/lib/api";
import { enrichTeacherPayload, sortTeacherRowsTier1First } from "@/lib/server/tier1";
import { freeServiceCards, popularServiceCards } from "@/lib/home/discover";
import type { CatalogCategory } from "@/lib/category";

/**
 * ریشهٔ وب دو چهره دارد — «landing-root»:
 *
 * ۱) ساب‌دامین اپ (UNIVERSAL_APP_ROOT_HOST = app.vodda.ir): اپ یونیورسال در
 *    «/» رندر می‌شود (nginx معمولاً پیش از Next، «/» را به «/app» بازنویسی
 *    می‌کند؛ این شاخه فقط پوشش دفاعی است).
 *
 * ۲) دامنهٔ اصلی (vodda.ir): لندینگ تبلیغاتی — نه خودِ اپ. رابط اپ «به‌صورت
 *    کامل» در وب نمایش داده نمی‌شود؛ فقط نمونهٔ مصنوعی رابط اپ (AppPreview)
 *    در هیروی لندینگ، با همان زبان طراحی تازهٔ اپ، دیده می‌شود. کاربر برای
 *    تجربهٔ کامل به «/app» یا ساب‌دامین اپ می‌رود.
 *
 * پیش‌نمایش محلی (VODDA_PREVIEW_MOCK=1): ریشه به اپ می‌رود تا پنل پیش‌نمایش
 * اپ را ببیند.
 */

function hostnameFromHeader(value: string | null): string {
  const hostname = value?.split(",")[0].trim().replace(/:\d+$/, "").toLowerCase();
  return hostname ?? "";
}

type SearchParams = Record<string, string | string[] | undefined>;

/* ۱.ب — فهرست کامل استادان برای موتور کشف: برتر + رایگان + پرکاربرد + خانه‌های دسته. */
async function getTeachers(): Promise<{ teachers: Teacher[]; unavailable: boolean }> {
  try {
    const response = await api.teachers('', { limit: '100' });
    /* ۱.الف.۵ — درخواست سرور مستقیم به بک‌اند می‌رود؛ غنی‌سازی درجه ۱ این‌جا اعمال می‌شود. */
    const enriched = (await enrichTeacherPayload(response.data || [])) as Teacher[];
    return { teachers: enriched, unavailable: false };
  } catch {
    return { teachers: [], unavailable: true };
  }
}

async function getCatalogCategories(): Promise<CatalogCategory[]> {
  try {
    const response = await api.catalog();
    const groups = response.data?.categories ?? [];
    return groups.map((group) => ({ category: group.category, topics: group.services }));
  } catch {
    return [];
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  /* پیش‌نمایش محلی (فقط dev، با VODDA_PREVIEW_MOCK=1) — ریشه مستقیم به اپ می‌رود */
  if (process.env.VODDA_PREVIEW_MOCK === '1') redirect('/app');

  const requestHeaders = await headers();
  const requestHost = hostnameFromHeader(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
  );
  const appRootHost = process.env.UNIVERSAL_APP_ROOT_HOST?.trim().toLowerCase();

  /* پوشش دفاعی میزبان اپ — اگر nginx ریشه را بازنویسی نکرده باشد، اپ در «/» رندر شود */
  if (appRootHost && requestHost === appRootHost) {
    return <UniversalAppHost basePath="" />;
  }

  const [{ teachers, unavailable }, categories] = await Promise.all([getTeachers(), getCatalogCategories()]);

  /* موتور کشف مشترک (src/lib/home/discover.ts) — همان منطق اپ؛ پارتی کامل. */
  const tier1First = sortTeacherRowsTier1First(teachers);
  const freeCards = freeServiceCards(teachers, new Map(), 6);
  const popular = popularServiceCards(teachers, categories, 8);

  return (
    <div style={{ background: 'var(--sand-50)' }}>
      <Nav />
      {/* ۱.۱۳.۰ — بنر کارت‌محور «منافسه» بالای صفحه — کلیک به monafeseh.ir */}
      <div className="public-container promo-top-wrap">
        <MonafesehPromoBanner />
      </div>
      <Hero />
      {/* ۱.ب.۲ — ترتیب بخش‌های کشف: آیه ← خانه‌های دسته ← اساتید برتر ← پرکاربرد ← اساتید بانو ← رایگان ← پیشنهادی */}
      <VerseOfDayCard />
      <CategoryTiles categories={categories} teachers={teachers} />
      <FeaturedTeachers teachers={tier1First.slice(0, 8)} unavailable={unavailable} />
      <PopularServices services={popular} />
      {/* ۱.۱۳.۰ — بنر کارت‌محور «اینستا قرآن» وسط صفحه — کلیک به اپ اینستا قرآن */}
      <div className="public-container">
        <InstaQuranPromoBanner />
      </div>
      {/* ۱.ب.۴ — «اساتید بانو» بالای خدمات رایگان — هم‌گامی با ترتیب تازهٔ اپ */}
      <BanoTeachers teachers={tier1First} unavailable={unavailable} />
      <FreeServicesSection services={freeCards} />
      <RecommendedTeachers limit={7} />
      <HowItWorks />
      <WhyVodda />
      <BecomeTeacher />
      <DownloadApp />
      <Footer />
    </div>
  );
}
