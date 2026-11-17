import { api, type Teacher } from '@/lib/api';
import type { CatalogCategory } from '@/lib/category';
import {
  Nav, Hero, DispatchCallout, Categories, HowItWorks, FeaturedTeachers,
  WhyVodda, BecomeTeacher, DownloadApp, Footer,
} from '@/components/web/sections';

async function getTeachers(): Promise<{ teachers: Teacher[]; unavailable: boolean }> {
  try {
    const response = await api.teachers('', { limit: '6' });
    return { teachers: response.data || [], unavailable: false };
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
  return (
    <div style={{ background: 'var(--sand-50)' }}>
      <Nav />
      <Hero />
      <DispatchCallout />
      <Categories categories={categories} />
      <HowItWorks />
      <FeaturedTeachers teachers={teachers} unavailable={unavailable} />
      <WhyVodda />
      <BecomeTeacher />
      <DownloadApp />
      <Footer />
    </div>
  );
}
