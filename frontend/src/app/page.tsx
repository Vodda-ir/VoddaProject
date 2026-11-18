import { api, type Teacher } from '@/lib/api';
import { enrichTeacherPayload, sortTeacherRowsTier1First } from '@/lib/server/tier1';
import { freeServiceCards, popularServiceCards } from '@/lib/home/discover';
import type { CatalogCategory } from '@/lib/category';
import {
  Nav, Hero, VerseOfDayCard, CategoryTiles, FeaturedTeachers, PopularServices,
  FreeServicesSection, RecommendedTeachers, HowItWorks, WhyVodda, BecomeTeacher,
  DownloadApp, Footer,
} from '@/components/web/sections';

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

export default async function Home() {
  const [{ teachers, unavailable }, categories] = await Promise.all([getTeachers(), getCatalogCategories()]);

  /* موتور کشف مشترک (src/lib/home/discover.ts) — همان منطق اپ؛ پارتی کامل. */
  const tier1First = sortTeacherRowsTier1First(teachers);
  const freeCards = freeServiceCards(teachers, new Map(), 6);
  const popular = popularServiceCards(teachers, categories, 8);

  return (
    <div style={{ background: 'var(--sand-50)' }}>
      <Nav />
      <Hero />
      {/* ۱.ب.۲ — ترتیب بخش‌های کشف: آیه ← خانه‌های دسته ← اساتید برتر ← پرکاربرد ← رایگان ← پیشنهادی */}
      <VerseOfDayCard />
      <CategoryTiles categories={categories} teachers={teachers} />
      <FeaturedTeachers teachers={tier1First.slice(0, 8)} unavailable={unavailable} />
      <PopularServices services={popular} />
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
