import { api, toman, type Teacher } from '@/lib/api';
import { Button, Logo } from '@/components/Brand';

// Featured teachers come from the backend; fall back to an empty list if the
// API is unreachable (e.g. during a static build with no backend running).
async function getTeachers(): Promise<Teacher[]> {
  try {
    const res = await api.teachers();
    return res.data.slice(0, 6);
  } catch {
    return [];
  }
}

const CATEGORIES = [
  { icon: '📖', title: 'آموزش قرآن کریم', desc: 'روخوانی، روان‌خوانی، تجوید و حفظ' },
  { icon: '🎤', title: 'مداحی اهل‌بیت', desc: 'نوحه‌خوانی، مدیحه و دستگاه آوازی' },
  { icon: '⭐', title: 'آمادگی مسابقات', desc: 'قرائت و آمادگی برای مسابقات قرآن' },
  { icon: '🎙️', title: 'صوت و لحن', desc: 'تقویت صدا، مقامات و تنظیم نفس' },
];

const STEPS = [
  { n: '۱', title: 'استاد را پیدا کنید', desc: 'بین اساتید تأییدشده جستجو و انتخاب کنید.' },
  { n: '۲', title: 'جلسه رزرو کنید', desc: 'خدمت، روز و ساعت دلخواه را انتخاب کنید.' },
  { n: '۳', title: 'آنلاین یاد بگیرید', desc: 'در زمان مقرر جلسه‌ی صوتی را آغاز کنید.' },
];

export default async function Home() {
  const teachers = await getTeachers();

  return (
    <main className="mx-auto max-w-6xl px-5">
      {/* Nav */}
      <nav className="flex items-center justify-between py-6">
        <Logo />
        <div className="hidden items-center gap-7 text-sm font-semibold text-ink-2 md:flex">
          <a href="#categories">دسته‌بندی‌ها</a>
          <a href="#how">چطور کار می‌کند</a>
          <a href="#teachers">اساتید</a>
          <a href="#teach">تدریس در وُدّا</a>
        </div>
        <div className="flex items-center gap-3">
          <Button href="/panel/user" variant="ghost">ورود</Button>
          <Button href="/panel/user" variant="primary">شروع کنید</Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-olive-100 px-4 py-2 text-xs font-bold text-olive-700">
            ✨ همراهِ یادگیری قرآن و مداحی
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight text-ink md:text-5xl">
            استاد قرآن و مداحی‌ات را
            <br />
            <span className="text-olive-700">آنلاین پیدا کن</span>
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-3">
            وُدّا قرآن‌آموزان را به اساتید مجرب و تأییدشده وصل می‌کند؛ رزرو ساده، پرداخت امن و جلسه‌ی آنلاین.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/panel/user" variant="primary">یافتن استاد</Button>
            <Button href="#teach" variant="soft">می‌خواهم تدریس کنم</Button>
          </div>
        </div>
        <div className="relative">
          <div className="rounded-xl bg-surface p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold text-ink">اساتید برتر</span>
              <span className="text-xs text-olive-600">۶ استاد</span>
            </div>
            <div className="space-y-3">
              {(teachers.length ? teachers : placeholderTeachers).slice(0, 3).map((t, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md bg-sand-50 p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-olive-100 text-olive-700">
                    {t.field?.includes('مداحی') ? '🎤' : '📖'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-ink">{t.user?.name || 'استاد وُدّا'}</div>
                    <div className="text-xs text-olive-600">{t.tag}</div>
                  </div>
                  <div className="text-xs font-extrabold text-gold">★ {t.rating?.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="py-14">
        <SectionTitle title="چه چیزی یاد بگیریم؟" sub="حوزه‌های آموزشی وُدّا" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <div key={c.title} className="rounded-lg bg-surface p-6 shadow-sm transition hover:shadow-md">
              <div className="text-3xl">{c.icon}</div>
              <h3 className="mt-4 text-lg font-extrabold text-ink">{c.title}</h3>
              <p className="mt-2 text-sm text-ink-3">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-14">
        <SectionTitle title="چطور کار می‌کند؟" sub="در سه گام ساده" />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-lg bg-surface p-7 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-olive-600 text-lg font-extrabold text-white">
                {s.n}
              </div>
              <h3 className="mt-5 text-lg font-extrabold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm text-ink-3">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured teachers */}
      <section id="teachers" className="py-14">
        <SectionTitle title="اساتید برگزیده" sub="منتخبی از بهترین اساتید وُدّا" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(teachers.length ? teachers : placeholderTeachers).map((t, i) => (
            <article key={i} className="rounded-lg bg-surface p-5 shadow-md">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-olive-100 text-2xl">
                  {t.field?.includes('مداحی') ? '🎤' : '📖'}
                </div>
                <div>
                  <div className="font-extrabold text-ink">{t.user?.name || 'استاد وُدّا'}</div>
                  <div className="text-xs font-semibold text-olive-600">{t.tag}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-ink-3">
                <span className="font-extrabold text-gold">★ {t.rating?.toFixed(1)}</span>
                <span>·</span>
                <span>{t.city}</span>
                <span>·</span>
                <span>{toman(t.sessions)} جلسه</span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-ink-4">هر جلسه از</div>
                  <div className="text-sm font-extrabold text-ink">
                    {toman(Math.round(t.price30 / 1000))}{' '}
                    <span className="text-xs font-medium text-ink-3">هزار تومان</span>
                  </div>
                </div>
                <Button href="/panel/user" variant="primary" className="!px-4 !py-2 text-xs">
                  رزرو جلسه
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Become a teacher */}
      <section id="teach" className="my-14 overflow-hidden rounded-xl bg-gradient-to-l from-olive-800 to-olive-600 p-10 text-white md:p-14">
        <h2 className="text-3xl font-extrabold">در وُدّا تدریس کنید</h2>
        <p className="mt-3 max-w-lg text-olive-100">
          دانش خود را به اشتراک بگذارید، شاگردان جدید پیدا کنید و درآمد کسب کنید. ثبت‌نام ساده و رایگان است.
        </p>
        <div className="mt-7">
          <Button href="/panel/teacher" variant="gold">شروع تدریس</Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sand-200 py-10 text-sm text-ink-3">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <Logo size={22} />
          <div className="flex gap-6">
            <a href="/panel/user">پنل کاربر</a>
            <a href="/panel/teacher">پنل استاد</a>
            <a href="/panel/admin">پنل مدیریت</a>
          </div>
          <span>© {new Date().getFullYear()} وُدّا</span>
        </div>
      </footer>
    </main>
  );
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="text-center">
      <span className="text-sm font-bold text-olive-600">{sub}</span>
      <h2 className="mt-2 text-3xl font-extrabold text-ink">{title}</h2>
    </div>
  );
}

const placeholderTeachers: Teacher[] = [
  { id: 1, field: 'آموزش قرآن کریم', tag: 'حافظ و قاری', level: 'پیشرفته', city: 'قم', bio: '', price30: 85000, price60: 150000, female: false, verified: true, rating: 4.9, reviews: 210, sessions: 25, followers: 2521, user: { id: 1, name: 'عباس ملک‌محمدی', avatar_url: '' } },
  { id: 2, field: 'مداحی اهل‌بیت', tag: 'مداح و ذاکر', level: 'پیشرفته', city: 'تهران', bio: '', price30: 90000, price60: 160000, female: false, verified: true, rating: 4.8, reviews: 168, sessions: 31, followers: 1840, user: { id: 2, name: 'محمد ملک‌مطیعی', avatar_url: '' } },
  { id: 3, field: 'آموزش قرآن کریم', tag: 'حافظ کل', level: 'پیشرفته', city: 'مشهد', bio: '', price30: 95000, price60: 170000, female: true, verified: true, rating: 5.0, reviews: 409, sessions: 52, followers: 3110, user: { id: 3, name: 'مریم رضوی', avatar_url: '' } },
];
