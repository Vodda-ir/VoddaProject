import { api, type Teacher } from '@/lib/api';
import {
  Nav, Hero, Categories, HowItWorks, FeaturedTeachers,
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

export default async function Home() {
  const { teachers, unavailable } = await getTeachers();
  return (
    <div style={{ background: 'var(--sand-50)' }}>
      <Nav />
      <Hero />
      <Categories />
      <HowItWorks />
      <FeaturedTeachers teachers={teachers} unavailable={unavailable} />
      <WhyVodda />
      <BecomeTeacher />
      <DownloadApp />
      <Footer />
    </div>
  );
}
