import 'server-only';

import type { NextRequest } from 'next/server';

/* ═════════ پیش‌نمایش محلی (فقط dev) ═════════
 * وقتی VODDA_PREVIEW_MOCK=1 روی سرور توسعهٔ محلی ست شده باشد، BFF به‌جای تماس با
 * بک‌اندِ غیرقابل‌دسترس، پاسخ نمونه برمی‌گرداند تا پنل پیش‌نمایش اپ قابل مشاهده باشد.
 * در تولید این فهرست هرگز فعال نمی‌شود (متغیر محیطی ست نمی‌شود) — رفتار BFF دست‌نخورده. */

export function previewMockEnabled(): boolean {
  return process.env.VODDA_PREVIEW_MOCK === '1';
}

type MockLearner = {
  id: number;
  name: string;
  role: string;
  mobile: string;
  avatar_url: string;
  city: string;
  wallet: number;
  created_at: string;
};

const MOCK_LEARNER: MockLearner = {
  id: 95,
  name: 'عارف رضائی',
  role: 'learner',
  mobile: '09121234567',
  avatar_url: '',
  city: 'تهران',
  wallet: 2_500_000,
  created_at: '2025-01-01T00:00:00Z',
};

const MOCK_CATALOG_CATEGORIES: Array<{ category: string; services: Array<{ id: number; title: string; description: string }> }> = [
  {
    category: 'قرآن‌آموزی پایه',
    services: [
      { id: 1, title: 'روخوانی قرآن کریم', description: 'آموزش روخوانی صحیح' },
      { id: 2, title: 'آموزش الفبا و نوآموزان', description: 'از الفبا تا جمله‌خوانی' },
      { id: 3, title: 'روان‌خوانی و اصلاح قرائت', description: 'تقویت روانی تلاوت' },
    ],
  },
  {
    category: 'تجوید و علوم قرائت',
    services: [
      { id: 4, title: 'آموزش تجوید قرآن کریم', description: 'قواعد تجوید عملی' },
      { id: 5, title: 'علوم قرائت', description: 'آشنایی با قرائات' },
      { id: 6, title: 'روایت حفص از عاصم', description: 'روایت رایج قرآن' },
    ],
  },
  {
    category: 'حفظ قرآن',
    services: [
      { id: 7, title: 'حفظ جزء سی قرآن', description: 'شروع حفظ از جزء سی' },
      { id: 8, title: 'حفظ کل قرآن کریم', description: 'برنامه حفظ کامل' },
      { id: 9, title: 'مرور و تثبیت حفظ', description: 'جلسات مرور حفظ' },
    ],
  },
  {
    category: 'صوت و لحن و هنر قرآنی',
    services: [
      { id: 10, title: 'آموزش صوت و لحن', description: 'قوت و ضعف صوت' },
      { id: 11, title: 'تواشیح و همخوانی', description: 'گروه‌خوانی قرآنی' },
      { id: 12, title: 'اذان و ابتهال', description: 'آموزش اذان و مناجات' },
    ],
  },
  {
    category: 'مفاهیم، تفسیر و علوم قرآن',
    services: [
      { id: 13, title: 'تفسیر قرآن کریم', description: 'تفسیر موضوعی و ترتیبی' },
      { id: 14, title: 'علوم قرآن', description: 'مبانی علوم قرآنی' },
      { id: 15, title: 'مفاهیم بنیادی قرآن', description: 'مفاهیم کلیدی آیات' },
    ],
  },
  {
    category: 'آموزش‌های ویژه',
    services: [
      { id: 16, title: 'قرآن‌آموزی کودکان', description: 'آموزش متناسب کودک' },
      { id: 17, title: 'قرآن‌آموزی نوجوانان', description: 'ویژه نوجوانان' },
      { id: 18, title: 'آموزش ادعیه و زیارات', description: 'ادعیه و زیارات مشهور' },
    ],
  },
  {
    category: 'آمادگی و مشاوره قرآنی',
    services: [
      { id: 19, title: 'آمادگی مسابقات قرآن', description: 'آمادگی رقابت‌های قرآنی' },
      { id: 20, title: 'مشاوره و راهبرد حفظ', description: 'برنامه‌ریزی شخصی حفظ' },
    ],
  },
];

type MockService = { id: number; title: string; duration: number; price: number; icon: string; active: boolean };

function mockTeacher(
  id: number,
  name: string,
  city: string,
  female: boolean,
  tier: string,
  rating: number,
  reviews: number,
  services: MockService[],
  avatar: string,
) {
  return {
    id,
    user_id: 100 + id,
    /* آواتار نمونهٔ پیش‌نمایش از دارایی‌های عمومی اپ — فقط در mock؛ تولید از API واقعی می‌آید */
    user: { name, avatar_url: `/avatars/teachers/${avatar}` },
    field: 'آموزش قرآن کریم',
    tag: services[0]?.title ?? 'قرآن',
    level: 'پیشرفته',
    city,
    bio: `مدرس ${services.map((service) => service.title).join(' و ')}`,
    price30: Math.round((services[0]?.price ?? 200_000) * 0.6),
    price60: services[0]?.price ?? 200_000,
    female,
    verified: true,
    /* ۰.۹.۰ — دو استاد mock با درجهٔ ۱ تا قاب نئونی نفس‌کشنده در پیش‌نمایش دیده شود */
    is_tier1: id === 1 || id === 4,
    /* ۱.۲ — یکی دو استاد آفلاین تا چراغ قرمز چشمک‌زن در پیش‌نمایش دیده شود */
    available: id !== 3 && id !== 7,
    /* ۱.۲ — نگاشت درجهٔ نمونه به کلید واقعی tierMeta تا مهر آبی/سبز/قرمز در پیش‌نمایش دیده شود */
    tier: tier === 'gold' ? 'international' : tier === 'silver' ? 'grade2' : 'grade3',
    instant_enabled: id % 3 === 1,
    free_enabled: id % 5 === 2,
    rating,
    reviews,
    sessions: reviews * 4,
    followers: reviews * 2,
    created_at: '2025-01-10T00:00:00Z',
    services,
  };
}

function service(id: number, title: string, price: number): MockService {
  return { id, title, duration: 60, price, icon: 'book', active: true };
}

/* خدمت رایگان نمونهٔ پیش‌نمایش — مدت ۳۰ دقیقه برای بج ساعت کارت رایگان */
function freeService(id: number, title: string): MockService {
  return { id, title, duration: 30, price: 0, icon: 'gift', active: true };
}

const MOCK_TEACHERS = [
  mockTeacher(1, 'استاد احمد محمدی', 'تهران', false, 'gold', 4.8, 32, [service(1, 'روخوانی قرآن کریم', 320_000), service(2, 'آموزش الفبا و نوآموزان', 200_000)], 't-01.png'),
  mockTeacher(2, 'استاد فاطمه حسینی', 'قم', true, 'silver', 4.9, 41, [service(1, 'روخوانی قرآن کریم', 280_000), service(3, 'روان‌خوانی و اصلاح قرائت', 300_000), freeService(19, 'آشنایی با روخوانی — جلسهٔ آغازین')], 't-02.png'),
  mockTeacher(3, 'استاد رضا کریمی', 'مشهد', false, 'bronze', 4.5, 18, [service(2, 'آموزش الفبا و نوآموزان', 220_000)], 't-03.png'),
  mockTeacher(4, 'استاد مریم احمدی', 'تهران', true, 'gold', 4.9, 55, [service(4, 'آموزش تجوید قرآن کریم', 360_000), service(6, 'روایت حفص از عاصم', 380_000)], 't-04.png'),
  mockTeacher(5, 'استاد علی رضایی', 'اصفهان', false, 'silver', 4.6, 27, [service(5, 'علوم قرائت', 300_000), service(4, 'آموزش تجوید قرآن کریم', 300_000)], 't-05.png'),
  mockTeacher(6, 'استاد زهرا موسوی', 'قم', true, 'gold', 5.0, 63, [service(7, 'حفظ جزء سی قرآن', 340_000), service(9, 'مرور و تثبیت حفظ', 190_000), freeService(20, 'مشاورهٔ مسیر حفظ قرآن')], 't-06.png'),
  mockTeacher(7, 'استاد حسین عبدی', 'شیراز', false, 'gold', 4.8, 48, [service(8, 'حفظ کل قرآن کریم', 400_000)], 't-07.png'),
  mockTeacher(8, 'استاد نرگس اسدی', 'تهران', true, 'silver', 4.7, 38, [service(10, 'آموزش صوت و لحن', 380_000), service(12, 'اذان و ابتهال', 320_000)], 't-08.png'),
  mockTeacher(9, 'استاد محمد قاسمی', 'کرج', false, 'silver', 4.4, 21, [service(11, 'تواشیح و همخوانی', 290_000)], 't-09.png'),
  mockTeacher(10, 'استاد سارا نوری', 'یزد', true, 'gold', 4.9, 52, [service(13, 'تفسیر قرآن کریم', 350_000), service(15, 'مفاهیم بنیادی قرآن', 330_000), freeService(21, 'گام نخست تفسیر — رایگان')], 't-10.png'),
  mockTeacher(11, 'استاد جعفر صادقی', 'تهران', false, 'bronze', 4.3, 15, [service(14, 'علوم قرآن', 310_000)], 't-11.png'),
  mockTeacher(12, 'استاد لیلا کاظمی', 'تبریز', true, 'silver', 4.7, 33, [service(16, 'قرآن‌آموزی کودکان', 250_000), service(18, 'آموزش ادعیه و زیارات', 240_000)], 't-12.png'),
];

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

/** پاسخ نمونه برای مسیرهای GET پیش‌نمایش — null یعنی این مسیر mock ندارد. */
export function previewMockResponse(request: NextRequest, path: string[]): Response | null {
  if (request.method !== 'GET') return null;
  const head = path[0] ?? '';

  if (head === 'me' && path.length === 1) {
    /* E1 — نقش جلسهٔ پیش‌نمایش از payload توکن خوانده می‌شود تا UI ادمین/کاربر
     * عادی دقیقاً مثل تولید رفتار کند. با VODDA_PREVIEW_ADMIN=1 همیشه ادمین.
     * هرگز در تولید ست نمی‌شود. */
    let role = '';
    try {
      const token = request.cookies.get('vodda_token')?.value ?? '';
      const payload = token
        ? (JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) as { role?: unknown })
        : {};
      role = typeof payload.role === 'string' ? payload.role : '';
    } catch {
      role = '';
    }
    if (process.env.VODDA_PREVIEW_ADMIN === '1') role = 'admin';
    if (role === 'admin') {
      return jsonResponse({ data: { ...MOCK_LEARNER, role: 'admin', name: 'مدیر سامانه وُدّا' } });
    }
    return jsonResponse({ data: { ...MOCK_LEARNER, role: role === 'teacher' ? 'teacher' : 'learner' } });
  }
  if (head === 'catalog' && path[1] === 'services' && path.length === 2) {
    return jsonResponse({ data: { categories: MOCK_CATALOG_CATEGORIES } });
  }
  if (head === 'teachers' && path.length === 1) {
    return jsonResponse({ data: MOCK_TEACHERS, total: MOCK_TEACHERS.length });
  }
  if (head === 'teachers' && path[1] === 'recommended') {
    return jsonResponse({ data: MOCK_TEACHERS.slice(0, 7) });
  }
  /* ۰.۹.۲ — جزئیات استاد برای پیش‌نمایش صفحهٔ پروفایل (شامل آواتار نمونه) */
  if (head === 'teachers' && path.length === 2 && /^\d+$/.test(path[1] ?? '')) {
    const teacher = MOCK_TEACHERS.find((row) => row.id === Number(path[1]));
    return jsonResponse({ data: { teacher: teacher ?? null, reviews: [] } });
  }
  if (head === 'notifications') {
    return jsonResponse({ data: [] });
  }
  if (head === 'support' && path[1] === 'chat' && path[2] === 'unread') {
    return jsonResponse({ data: { unread: 0 } });
  }
  return null;
}
