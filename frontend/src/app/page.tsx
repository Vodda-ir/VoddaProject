import { api, type Teacher } from '@/lib/api';
import {
  Nav, Hero, Categories, HowItWorks, FeaturedTeachers,
  WhyVodda, Testimonials, BecomeTeacher, DownloadApp, Footer,
} from '@/components/web/sections';

// Featured teachers come from the backend; fall back to the design mocks when
// the API is unreachable (e.g. a static build with no backend running).
async function getTeachers(): Promise<Teacher[]> {
  try {
    const res = await api.teachers();
    return res.data.length ? res.data : fallback;
  } catch {
    return fallback;
  }
}

export default async function Home() {
  const teachers = await getTeachers();
  return (
    <div style={{ background: 'var(--sand-50)' }}>
      <Nav />
      <Hero />
      <Categories />
      <HowItWorks />
      <FeaturedTeachers teachers={teachers} />
      <WhyVodda />
      <Testimonials />
      <BecomeTeacher />
      <DownloadApp />
      <Footer />
    </div>
  );
}

const mk = (
  id: number, name: string, field: string, tag: string, city: string,
  rating: number, price30: number, bio: string, skills: string[], female = false,
): Teacher & { skills: string[] } => ({
  id, field, tag, level: 'پیشرفته', city, bio, price30, price60: price30 * 1.8,
  female, verified: true, rating, reviews: 100, sessions: 25, followers: 1500,
  user: { id, name, avatar_url: '' }, services: [], skills,
});

const fallback = [
  mk(1, 'عباس ملک‌محمدی', 'آموزش قرآن کریم', 'حافظ و قاری', 'قم', 4.9, 85000, 'مربی و مدرس قرآن کریم با بیش از ۱۲ سال سابقه. تمرکز بر تجوید، صوت و لحن، و روان‌خوانی.', ['تجوید', 'صوت و لحن', 'روان‌خوانی']),
  mk(2, 'محمد ملک‌مطیعی', 'مداحی اهل‌بیت', 'مداح و ذاکر', 'تهران', 4.8, 90000, 'مداح و ذاکر اهل‌بیت با سبک سنتی و نوحه‌خوانی. آموزش پایهٔ مداحی و تنظیم نفس.', ['نوحه‌خوانی', 'تک‌خوانی', 'دستگاه آوازی']),
  mk(3, 'مریم رضوی', 'آموزش قرآن کریم', 'حافظ کل', 'مشهد', 5.0, 95000, 'حافظ کل قرآن کریم و مدرس بانوان. تمرکز بر روخوانی و روان‌خوانی برای خواهران و کودکان.', ['روخوانی', 'روان‌خوانی', 'ویژهٔ بانوان'], true),
  mk(4, 'علی کبیری', 'آموزش قرآن کریم', 'قاری ممتاز', 'اصفهان', 4.7, 70000, 'قاری ممتاز کشوری، علاقه‌مند به آموزش نوجوانان و آمادگی برای مسابقات.', ['قرائت', 'مسابقات', 'نوجوانان']),
  mk(5, 'فاطمه حسینی', 'مداحی اهل‌بیت', 'ذاکرهٔ اهل‌بیت', 'قم', 4.9, 80000, 'ذاکرهٔ اهل‌بیت ویژهٔ مجالس بانوان. آموزش مرثیه‌خوانی و مدیحه‌سرایی با لحن دلنشین.', ['مرثیه', 'مدیحه', 'ویژهٔ بانوان'], true),
  mk(6, 'احمد شعبانی', 'آموزش قرآن کریم', 'مدرس تجوید', 'شیراز', 4.6, 75000, 'مدرس تجوید و وقف و ابتدا، با روشی ساده و کاربردی برای بزرگسالان.', ['تجوید', 'وقف و ابتدا', 'بزرگسالان']),
];
