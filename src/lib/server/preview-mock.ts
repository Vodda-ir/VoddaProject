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

type MockService = { id: number; title: string; duration: number; price: number; icon: string; active: boolean; mode?: string };

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
    /* جلسات حضوری (۱.۱۰) — استاد نمونهٔ ۱ نشانی دفتر دارد تا ویزارد حضوری کامل دیده شود */
    in_person_address: id === 1 ? 'تهران، خیابان ولیعصر، کوچهٔ مهر، پلاک ۱۲، واحد ۳' : '',
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
  return { id, title, duration: 60, price, icon: 'book', active: true, mode: '' };
}

/** خدمت رایگان نمونهٔ پیش‌نمایش — مدت ۳۰ دقیقه برای بج ساعت کارت رایگان */
function freeService(id: number, title: string): MockService {
  return { id, title, duration: 30, price: 0, icon: 'gift', active: true, mode: '' };
}

/* ۱.۷ — خدمات آنلاین سه‌حالتهٔ نمونه (تلفنی/متنی/تصویری) تا ویزارد رزرو در
 * پیش‌نمایش با انتخاب روش برگزاری و قیمت‌های مستقل دیده شود — فقط mock. */
function onlineService(id: number, title: string, price: number, mode: 'voice' | 'text' | 'video', duration: number): MockService {
  const icon = mode === 'voice' ? 'phone' : mode === 'text' ? 'message' : 'video';
  return { id, title, duration, price, icon, active: true, mode };
}

/** جلسهٔ حضوری نمونهٔ پیش‌نمایش — مرحلهٔ محل برگزاری + موضوع + زمان + پرداخت */
function inPersonService(id: number, title: string, price: number, duration: number): MockService {
  return { id, title, duration, price, icon: 'pin', active: true, mode: 'in_person' };
}

const MOCK_TEACHERS = [
  mockTeacher(1, 'استاد احمد محمدی', 'تهران', false, 'gold', 4.8, 32, [
    service(1, 'روخوانی قرآن کریم', 320_000),
    onlineService(101, 'تماس تلفنی قرآنی', 180_000, 'voice', 30),
    onlineService(102, 'چت پرسش و پاسخ قرآنی', 120_000, 'text', 40),
    onlineService(103, 'کلاس تصویری تجوید', 350_000, 'video', 60),
    /* جلسهٔ حضوری نمونه — بخش «خدمات حضوری» و ویزارد مخصوص حضور */
    inPersonService(104, 'جلسهٔ حضوری', 300_000, 60),
    service(2, 'آموزش الفبا و نوآموزان', 200_000),
  ], 't-01.png'),
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

/* وضعیت جلسات نمونهٔ پیش‌نمایش — «پایان جلسه» استاد وضعیت را به done می‌برد */
const completedMockSessions = new Set<number>();

/** جلسهٔ نمونهٔ پیش‌نمایش — جزئیات جلسهٔ فوری تازه‌ثبت‌شده برای پرش از ویزارد؛
 *  نقش نمایشگر از توکن کوکی خوانده می‌شود تا نمای استاد/شاگرد هر دو تست شود. */
function mockSession(id: number, request: NextRequest): Record<string, unknown> {
  let viewerRole = 'learner';
  try {
    const token = request.cookies.get('vodda_token')?.value ?? '';
    const payload = token
      ? (JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) as { role?: unknown })
      : {};
    if (payload.role === 'teacher' || payload.role === 'admin') viewerRole = 'teacher';
  } catch {
    viewerRole = 'learner';
  }
  const start = new Date(Date.now() + 2 * 60_000);
  const end = new Date(start.getTime() + 30 * 60_000);
  const pad = (value: number) => String(value).padStart(2, '0');
  const localDate = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  const localStart = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  const localEnd = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  const completed = completedMockSessions.has(id);
  return {
    id,
    learner_id: MOCK_LEARNER.id,
    learner: { id: MOCK_LEARNER.id, name: MOCK_LEARNER.name, avatar_url: '' },
    teacher: { id: 1, user_id: 101, user: { name: 'استاد احمد محمدی', avatar_url: '/avatars/teachers/t-01.png' } },
    service: 'تماس تلفنی قرآنی',
    title: 'تماس تلفنی قرآنی',
    scheduled_at: start.toISOString(),
    local_date: localDate,
    local_start: localStart,
    local_end: localEnd,
    duration: 30,
    price: 180_000,
    status: completed ? 'done' : 'confirmed',
    note: '',
    reject_note: '',
    instant: true,
    rated: false,
    mode: id % 2 === 0 ? 'video' : 'voice',
    viewer_role: viewerRole,
  };
}

/* تقویم آزاد نمونهٔ پیش‌نمایش — دو بازهٔ صبح و عصر در ۱۴ روز آینده */
function mockAvailability(): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = [];
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  for (let day = 1; day <= 14; day++) {
    for (const hour of [9, 10, 11, 16, 17, 18]) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, hour, 0, 0);
      const end = new Date(start.getTime() + 60 * 60_000);
      rows.push({
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        local_date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
        local_start: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        local_end: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
        weekday: (start.getDay() + 1) % 7,
      });
    }
  }
  return rows;
}

/** پاسخ نمونه برای مسیرهای GET پیش‌نمایش — null یعنی این مسیر mock ندارد. */
export function previewMockResponse(request: NextRequest, path: string[]): Response | null {
  const head = path[0] ?? '';

  /* POST رزرو در پیش‌نمایش — جلسهٔ فوری/زمان‌دار نمونه ثبت می‌شود */
  if (request.method === 'POST' && head === 'sessions' && path.length === 1) {
    return jsonResponse({ data: { session: { id: 9001 } } });
  }
  /* POST «پایان جلسه» استاد در پیش‌نمایش — وضعیت جلسه به done می‌رود */
  if (request.method === 'POST' && head === 'teacher' && path[1] === 'sessions' && path[3] === 'complete') {
    completedMockSessions.add(Number(path[2]) || 0);
    return jsonResponse({ data: { ok: true } });
  }
  /* E3+ — عملیات‌های ادمین در پیش‌نمایش (پیش از گارد GET) — پاسخ موفق نمونه */
  if (request.method === 'POST' && head === 'support-staff' && path[1] === 'tickets' && path.length === 4 && path[3] === 'messages') {
    const now = new Date().toISOString();
    return jsonResponse({ data: { message: { id: Date.now() % 100_000_000, sender_id: 1, sender_name: 'مدیر سامانه وُدّا', sender_side: 'staff', kind: 'text', body: 'پاسخ نمونهٔ پیش‌نمایش', attachment_url: '', attachment_mime: '', duration_ms: 0, created_at: now } } });
  }
  if (request.method === 'POST' && head === 'support-staff' && path[1] === 'tickets' && path.length === 4 && (path[3] === 'status' || path[3] === 'assign')) {
    return jsonResponse({ data: { ok: true } });
  }
  if (request.method === 'POST' && head === 'admin' && path[1] === 'teachers' && path.length === 4 && path[3] === 'review') {
    return jsonResponse({ data: { ok: true } });
  }
  if (request.method === 'POST' && head === 'admin' && path[1] === 'withdrawals' && path.length === 4 && path[3] === 'process') {
    return jsonResponse({ data: { ok: true } });
  }
  if (request.method === 'PUT' && head === 'admin' && path[1] === 'services' && path.length === 4 && (path[3] === 'approve' || path[3] === 'reject')) {
    return jsonResponse({ data: { ok: true } });
  }
  if (request.method === 'PATCH' && head === 'admin' && path[1] === 'teachers' && path.length === 4 && path[3] === 'settings') {
    return jsonResponse({ data: { verified: true, tier: 'grade2' } });
  }
  if (request.method === 'DELETE' && head === 'admin' && path[1] === 'reviews' && path.length === 3) {
    return jsonResponse({ data: { ok: true } });
  }
  if (request.method !== 'GET') return null;

  if (head === 'me' && path.length === 1) {
    /* E1 — نقش جلسهٔ پیش‌نمایش از payload توکن خوانده می‌شود تا UI ادمین/کاربر
     * عادی دقیقاً مثل تولید رفتار کند. با VODDA_PREVIEW_ADMIN=1 همیشه ادمین.
     * هرگز در تولید ست نمی‌شود. */
    let role = '';
    try {
      /* نقش از کوکی یا هدر Authorization خوانده می‌شود — هدر برای فراخوانی
       * سمت‌سرورِ middleware پنل در پیش‌نمایش لازم است. */
      const token = request.cookies.get('vodda_token')?.value
        ?? request.headers.get('authorization')?.replace(/^Bearer /i, '')
        ?? '';
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
    if (role === 'teacher') {
      /* E2 — استاد پیش‌نمایش: شکل /me با آبجکت teacher تا داشبورد و پنل استوری کامل کار کند */
      return jsonResponse({
        data: {
          ...MOCK_LEARNER,
          id: 7,
          role: 'teacher',
          name: 'استاد نمونه وُدّا',
          teacher: { id: 7, rating: 4.8, reviews: 96, sessions: 140 },
        },
      });
    }
    return jsonResponse({ data: { ...MOCK_LEARNER, role: 'learner' } });
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
  /* ۱.۷ — تقویم آزاد نمونه برای ویزارد رزرو */
  if (head === 'teachers' && path.length === 3 && path[2] === 'availability') {
    return jsonResponse({ data: mockAvailability() });
  }
  /* ۱.۷ — جزئیات جلسهٔ نمونهٔ پیش‌نمایش */
  if (head === 'sessions' && path.length === 2) {
    return jsonResponse({ data: mockSession(Number(path[1]) || 9001, request) });
  }
  /* ۱.۱۰ — فهرست جلسات نمونهٔ پیش‌نمایش — یک جلسهٔ حضوری تا چیپ «حضوری» و
   * نشانی محل برگزاری روی کارت جلسات دیده شود */
  if (head === 'sessions' && path.length === 1) {
    const detail = mockSession(9001, request);
    const inPerson = {
      ...detail,
      id: 9002,
      service: 'جلسهٔ حضوری',
      title: 'جلسهٔ حضوری',
      duration: 60,
      price: 300_000,
      status: 'pending',
      instant: false,
      mode: 'in_person',
      in_person_place: 'teacher',
      in_person_address: 'تهران، خیابان ولیعصر، کوچهٔ مهر، پلاک ۱۲، واحد ۳',
      note: 'روخوانی و تصحیح سورهٔ بقره',
    };
    return jsonResponse({ data: [detail, inPerson] });
  }
  /* ۱.۱۰ — خدمات جلسهٔ استاد در پیش‌نمایش (سه نوع آنلاین + حضوری با نشانی) */
  if (head === 'teacher' && path[1] === 'online-services') {
    return jsonResponse({
      data: {
        services: [
          { mode: 'voice', title: 'جلسهٔ تلفنی و صوتی', icon: 'phone', duration: 30, price: 150_000, active: true, service_id: 901 },
          { mode: 'text', title: 'جلسهٔ متنی (چت)', icon: 'message', duration: 60, price: 100_000, active: false, service_id: 902 },
          { mode: 'video', title: 'جلسهٔ تصویری', icon: 'video', duration: 45, price: 200_000, active: true, service_id: 903 },
          { mode: 'in_person', title: 'جلسهٔ حضوری', icon: 'pin', duration: 60, price: 300_000, active: true, service_id: 904, address: 'تهران، خیابان ولیعصر، کوچهٔ مهر، پلاک ۱۲، واحد ۳' },
        ],
      },
    });
  }
  /* ۱.۱۰ — شمار جلسات دیده‌نشدهٔ استاد در پیش‌نمایش */
  if (head === 'teacher' && path[1] === 'sessions' && path[2] === 'unseen-count') {
    return jsonResponse({ data: { count: 0 } });
  }
  /* ۱.۱۰ — فهرست جلسات استاد در پیش‌نمایش — شامل جلسهٔ حضوری با نشانی محل */
  if (head === 'teacher' && path[1] === 'sessions' && path.length === 2 && path[2] !== 'mark-seen') {
    const detail = mockSession(9001, request);
    const inPerson = {
      ...detail,
      id: 9002,
      learner: { id: 47, name: 'سارا محمدی', avatar_url: '' },
      service: 'جلسهٔ حضوری',
      title: 'جلسهٔ حضوری',
      duration: 60,
      price: 300_000,
      status: 'pending',
      instant: false,
      mode: 'in_person',
      in_person_place: 'learner',
      in_person_address: 'قم، خیابان انقلاب، کوچهٔ ۱۲، پلاک ۷، طبقهٔ دوم',
      note: 'روخوانی و تصحیح سورهٔ بقره',
    };
    return jsonResponse({ data: [detail, inPerson] });
  }
  /* ۱.۱۰ — پروفایل استاد در پیش‌نمایش — خدمات فعال نمونه */
  if (head === 'teacher' && path[1] === 'me' && path.length === 2 && request.method === 'GET') {
    return jsonResponse({
      data: {
        id: 1,
        user_id: 101,
        in_person_address: 'تهران، خیابان ولیعصر، کوچهٔ مهر، پلاک ۱۲، واحد ۳',
        services: [
          { id: 901, official_service_id: 1, title: 'روخوانی قرآن کریم', duration: 60, price: 320_000, icon: 'book', active: true, mode: '' },
          { id: 904, official_service_id: null, title: 'جلسهٔ حضوری', duration: 60, price: 300_000, icon: 'pin', active: true, mode: 'in_person' },
        ],
      },
    });
  }
  /* ۱.۱۰ — تحلیل‌های نمونه تا چیدمان پنل بدون درنگ ۳۰ ثانیه‌ای بار شود */
  if (head === 'me' && path[1] === 'analytics') {
    return jsonResponse({
      data: {
        days: 30,
        series: [],
        totals: {
          sessions_total: 0, pending: 0, confirmed: 0, done: 0,
          canceled: 0, rated: 0, minutes_learned: 0, teachers_count: 0, spent_total: 0,
        },
      },
    });
  }
  if (head === 'notifications') {
    return jsonResponse({ data: [] });
  }
  if (head === 'support' && path[1] === 'chat' && path[2] === 'unread') {
    return jsonResponse({ data: { unread: 0 } });
  }
  /* E3 — mock مدیریت درون‌اپی (فقط dev) — داشبورد، اساتید و کاربران */
  if (head === 'admin' && path[1] === 'dashboard' && path.length === 2) {
    return jsonResponse({
      data: {
        learners: 128,
        teachers: 34,
        pending_teachers: 3,
        sessions: 512,
        done_sessions: 447,
        charge_volume: 182_400_000,
        commission: 27_360_000,
      },
    });
  }
  if (head === 'admin' && path[1] === 'teachers' && path.length === 2) {
    const status = request.nextUrl.searchParams.get('status') ?? 'pending';
    const all = [
      {
        id: 21,
        user_id: 41,
        name: 'محدثه راوند',
        field: 'روخوانی و تجوید',
        city: 'تهران',
        status: 'pending',
        verified: false,
        tier: '',
        rating: 4.8,
        sessions: 12,
        created_at: '2026-11-01T10:00:00Z',
      },
      {
        id: 7,
        user_id: 11,
        name: 'سمیرا کاظمی',
        field: 'حفظ قرآن',
        city: 'اصفهان',
        status: 'approved',
        verified: true,
        tier: 'طلایی',
        rating: 4.9,
        sessions: 84,
        created_at: '2026-08-12T10:00:00Z',
      },
      {
        id: 9,
        user_id: 15,
        name: 'عبدالرحمن شریفی',
        field: 'تفسیر موضوعی',
        city: 'مشهد',
        status: 'rejected',
        verified: false,
        tier: '',
        rating: 0,
        sessions: 0,
        created_at: '2026-09-02T10:00:00Z',
      },
    ].filter((row) => row.status === status);
    return jsonResponse({ data: all, total: all.length });
  }
  if (head === 'admin' && path[1] === 'users' && path.length === 2) {
    const role = request.nextUrl.searchParams.get('role') ?? '';
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
    const all = [
      { id: 95, name: 'عارف رضائی', mobile: '09121234567', role: 'learner', city: 'تهران', active: true, wallet: 2_500_000, created_at: '2025-01-01T00:00:00Z' },
      { id: 11, name: 'سمیرا کاظمی', mobile: '09121234568', role: 'teacher', city: 'اصفهان', active: true, wallet: 5_100_000, created_at: '2026-02-10T00:00:00Z' },
      { id: 41, name: 'محدثه راوند', mobile: '09121234569', role: 'teacher', city: 'تهران', active: false, wallet: 0, created_at: '2026-10-20T00:00:00Z' },
      { id: 1, name: 'مدیر سامانه', mobile: '09120000000', role: 'admin', city: 'قم', active: true, wallet: 0, created_at: '2024-05-01T00:00:00Z' },
    ].filter((row) => (role ? row.role === role : true)).filter((row) => (q ? row.name.includes(q) || row.mobile.includes(q) : true));
    return jsonResponse({ data: all, total: all.length });
  }
  /* E3+ — تحلیل غنی، جلسات، نظرات، خدمات، برداشت‌ها، بلاگ، عملیات و تنظیمات
   * + پشتیبانی ادمین — دادهٔ نمونهٔ پیش‌نمایش تا ۱۲ بخش مدیریت درون‌اپی زنده دیده شوند. */
  if (head === 'admin' && path[1] === 'analytics' && path.length === 2) {
    const days = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get('days') ?? '30')));
    const now = Date.now();
    const series = Array.from({ length: days }, (_, index) => {
      const date = new Date(now - (days - 1 - index) * 86_400_000).toISOString().slice(5, 10);
      const wave = Math.sin(index / 3.2) * 0.4 + 1;
      return {
        date,
        new_users: Math.round(6 * wave + (index % 5)),
        new_teachers: Math.round(wave),
        sessions_created: Math.round(14 * wave + (index % 4)),
        sessions_done: Math.round(11 * wave + (index % 3)),
        charge: Math.round(2_400_000 * wave),
        commission: Math.round(360_000 * wave),
      };
    });
    return jsonResponse({
      data: {
        days,
        series,
        users: { total: 128, learners: 93, teachers: 34, admins: 1, active: 121, new_week: 18 },
        sessions: { total: 512, pending: 9, confirmed: 14, done: 447, canceled: 42, rated: 388, minutes: 17_880 },
        finance: { charge_volume: 182_400_000, commission: 27_360_000, earnings: 131_500_000, wallet_liability: 8_900_000, pending_withdrawals: 2, pending_withdrawal_amount: 1_650_000 },
        rating: { avg: 4.6, count: 388 },
        status_breakdown: [
          { status: 'done', count: 447 },
          { status: 'canceled', count: 42 },
          { status: 'confirmed', count: 14 },
          { status: 'pending', count: 9 },
        ],
        fields: [
          { name: 'روخوانی و تجوید', count: 14 },
          { name: 'حفظ قرآن', count: 9 },
          { name: 'تفسیر موضوعی', count: 7 },
          { name: 'قرائت و صوت', count: 4 },
        ],
        top_teachers: [
          { id: 7, name: 'سمیرا کاظمی', avatar_url: '', field: 'حفظ قرآن', city: 'اصفهان', tier: 'international', rating: 4.9, reviews: 132, done_sessions: 84, earned: 24_800_000 },
          { id: 41, name: 'محدثه راوند', avatar_url: '', field: 'روخوانی و تجوید', city: 'تهران', tier: 'grade2', rating: 4.8, reviews: 96, done_sessions: 61, earned: 18_200_000 },
        ],
        recent_users: [
          { id: 95, name: 'عارف رضائی', avatar_url: '', role: 'learner', created_at: '2026-11-20T09:00:00Z' },
          { id: 41, name: 'محدثه راوند', avatar_url: '', role: 'teacher', created_at: '2026-11-19T18:30:00Z' },
        ],
        recent_sessions: [
          { id: 9001, title: 'روخوانی و تجوید — جلسهٔ پنجم', status: 'done', price: 145_000, scheduled_at: '2026-11-20T17:00:00Z', learner_name: 'عارف رضائی', learner_avatar: '', teacher_name: 'محدثه راوند' },
          { id: 8990, title: 'حفظ سورهٔ یس', status: 'pending', price: 210_000, scheduled_at: '2026-11-21T10:00:00Z', learner_name: 'زهرا محمدی', learner_avatar: '', teacher_name: 'سمیرا کاظمی' },
        ],
      },
    });
  }
  if (head === 'admin' && path[1] === 'sessions' && path.length === 2) {
    const status = request.nextUrl.searchParams.get('status') ?? '';
    const all = [
      { id: 9001, service: 'روخوانی و تجوید — جلسهٔ پنجم', status: 'done', price: 145_000, duration: 60, scheduled_at: '2026-11-20T17:00:00Z', local_date: '۱۴۰۵/۰۹/۰۱', local_start: '۱۷:۰۰', local_end: '۱۸:۰۰', note: '', rated: true, learner: { id: 95, name: 'عارف رضائی', avatar_url: '' }, teacher: { user: { id: 41, name: 'محدثه راوند' } } },
      { id: 8990, service: 'حفظ سورهٔ یس', status: 'pending', price: 210_000, duration: 45, scheduled_at: '2026-11-21T10:00:00Z', local_date: '۱۴۰۵/۰۹/۰۲', local_start: '۱۰:۰۰', local_end: '۱۰:۴۵', note: 'اولین جلسه', rated: false, learner: { id: 88, name: 'زهرا محمدی', avatar_url: '' }, teacher: { user: { id: 11, name: 'سمیرا کاظمی' } } },
      { id: 8970, service: 'تفسیر موضوعی — آیهٔ نور', status: 'canceled', price: 180_000, duration: 60, scheduled_at: '2026-11-18T20:00:00Z', local_date: '۱۴۰۵/۰۸/۳۰', local_start: '۲۰:۰۰', local_end: '۲۱:۰۰', note: '', rated: false, learner: { id: 95, name: 'عارف رضائی', avatar_url: '' }, teacher: { user: { id: 15, name: 'عبدالرحمن شریفی' } } },
    ].filter((row) => (status ? row.status === status : true));
    return jsonResponse({ data: all, total: all.length });
  }
  if (head === 'admin' && path[1] === 'reviews' && path.length === 2) {
    return jsonResponse({
      data: [
        { id: 311, session_id: 9001, teacher_id: 41, rating: 5, text: 'کلاس بسیار روان و با محتوای عالی بود، تجویدم بهتر شد.', created_at: '2026-11-20T19:00:00Z', learner_id: 95, learner_name: 'عارف رضائی', learner_avatar: '', teacher_name: 'محدثه راوند', teacher_field: 'روخوانی و تجوید' },
        { id: 306, session_id: 8970, teacher_id: 15, rating: 2, text: 'زمان جلسه دو بار تغییر کرد و منتظر ماندم.', created_at: '2026-11-18T22:10:00Z', learner_id: 95, learner_name: 'عارف رضائی', learner_avatar: '', teacher_name: 'عبدالرحمن شریفی', teacher_field: 'تفسیر موضوعی' },
      ],
      total: 388,
    });
  }
  if (head === 'admin' && path[1] === 'services' && path.length === 2) {
    return jsonResponse({
      data: [
        { id: 401, title: 'روخوانی جزء ۳۰ با تصحیح', duration: 30, price: 120_000, teacher: { city: 'تهران', field: 'روخوانی', tag: 'تجوید', user: { name: 'محدثه راوند', avatar_url: '' } } },
        { id: 402, title: 'مشاورهٔ حفظ — برنامه‌ریزی حفظ کل قرآن', duration: 60, price: 260_000, teacher: { city: 'اصفهان', field: 'حفظ قرآن', tag: '', user: { name: 'سمیرا کاظمی', avatar_url: '' } } },
      ],
    });
  }
  if (head === 'admin' && path[1] === 'withdrawals' && path.length === 2) {
    const status = request.nextUrl.searchParams.get('status') ?? '';
    const all = [
      { id: 771, amount: 1_000_000, card: '6037-9975-****-1234', sheba: '', status: 'pending', created_at: '2026-11-19T14:00:00Z', user: { id: 11, name: 'سمیرا کاظمی', avatar_url: '' } },
      { id: 769, amount: 650_000, card: '', sheba: 'IR1205700281800****', status: 'pending', created_at: '2026-11-18T09:30:00Z', user: { id: 41, name: 'محدثه راوند', avatar_url: '' } },
      { id: 741, amount: 2_400_000, card: '', sheba: 'IR5205700281800****', status: 'paid', created_at: '2026-11-10T11:00:00Z', user: { id: 11, name: 'سمیرا کاظمی', avatar_url: '' } },
    ].filter((row) => (status ? row.status === status : true));
    return jsonResponse({ data: all, total: all.length });
  }
  if (head === 'admin' && path[1] === 'posts' && path.length === 2) {
    return jsonResponse({
      data: [
        { id: 31, slug: 'fazilat-tilavat', title: 'فضیلت تلاوت قرآن کریم', excerpt: 'چرا تلاوت روزانه پیوند انسان با کلام وحی است؛ نگاهی به آیات و روایات.', cover_url: '', category: 'معارف', status: 'published', read_minutes: 6, views: 1240, published_at: '2026-10-05T08:00:00Z', created_at: '2026-10-05T08:00:00Z', updated_at: '2026-10-05T08:00:00Z' },
        { id: 32, slug: 'ravesh-hafez', title: 'روش‌های عملی حفظ قرآن', excerpt: 'از تکرار هوشمند تا مرور پله‌ای — روشی آزموده برای حافظان.', cover_url: '', category: 'آموزش', status: 'draft', read_minutes: 9, views: 0, published_at: '', created_at: '2026-11-01T08:00:00Z', updated_at: '2026-11-01T08:00:00Z' },
      ],
      total: 2,
    });
  }
  if (head === 'admin' && path[1] === 'post-stats' && path.length === 2) {
    return jsonResponse({ data: { total: 2, published: 1, drafts: 1, views: 1240, categories: ['معارف', 'آموزش'] } });
  }
  if (head === 'admin' && path[1] === 'audit-logs' && path.length === 2) {
    return jsonResponse({
      data: [
        { id: 1204, actor_id: 1, action: 'POST:/api/v1/admin/teachers/:id/review', target_type: 'teacher', target_id: 21, request_id: 'req_a41f9', metadata: '', created_at: '2026-11-20T12:40:00Z' },
        { id: 1203, actor_id: 1, action: 'POST:/api/v1/admin/withdrawals/:id/process', target_type: 'withdrawal', target_id: 741, request_id: 'req_b8812', metadata: '', created_at: '2026-11-10T11:05:00Z' },
        { id: 1201, actor_id: 1, action: 'PATCH:/api/v1/admin/users/:id/active', target_type: 'user', target_id: 41, request_id: 'req_c19aa', metadata: '', created_at: '2026-11-08T16:20:00Z' },
      ],
      total: 3,
    });
  }
  if (head === 'admin' && path[1] === 'settings' && path.length === 2 && request.method === 'GET') {
    return jsonResponse({ data: { settings: { support_email: 'info@vodda.app', support_phone: '02191008080', instagram: '', telegram: 'https://t.me/vodda', whatsapp: '', announcement_on: 'false', announcement_text: '', announcement_link: '', about_short: 'وُدّا، پلتفرم آنلاین آموزش قرآن کریم — از یادگیری تا تدریس.', google_client_id: '', google_client_secret: '', google_redirect_uri: '' } } });
  }
  if (head === 'admin' && path[1] === 'users' && path.length === 3) {
    const detail = {
      user: { id: Number(path[2]) || 95, name: 'عارف رضائی', mobile: '09121234567', role: 'learner', city: 'تهران', bio: '', active: true, wallet: 2_500_000, created_at: '2025-01-01T00:00:00Z' },
      transactions: [
        { id: 551, type: 'charge', title: 'شارژ از درگاه سامان‌سپ', amount: 3_000_000, created_at: '2026-11-15T10:00:00Z' },
        { id: 540, type: 'session', title: 'پرداخت جلسهٔ روخوانی', amount: -145_000, created_at: '2026-11-20T16:55:00Z' },
      ],
      sessions: [
        { id: 9001, service: 'روخوانی و تجوید — جلسهٔ پنجم', scheduled_at: '2026-11-20T17:00:00Z', duration: 60, price: 145_000, status: 'done' },
      ],
    };
    return jsonResponse({ data: detail });
  }
  if (head === 'support-staff' && path[1] === 'tickets' && path.length === 2) {
    const status = request.nextUrl.searchParams.get('status') ?? '';
    const all = [
      { id: 51, subject: 'خطا در پرداخت جلسه', status: 'open', unread_staff: 1, assigned_to: null, last_message_at: '2026-11-20T18:12:00Z', created_at: '2026-11-20T18:00:00Z', user: { id: 95, name: 'عارف رضائی', mobile: '09121234567', role: 'learner' }, assignee: null },
      { id: 48, subject: 'تنظیم زمان‌های تدریس', status: 'answered', unread_staff: 0, assigned_to: 1, last_message_at: '2026-11-19T21:00:00Z', created_at: '2026-11-19T20:00:00Z', user: { id: 41, name: 'محدثه راوند', mobile: '09121234569', role: 'teacher' }, assignee: { id: 1, name: 'مدیر سامانه' } },
    ].filter((row) => (status ? row.status === status : true));
    return jsonResponse({ data: all, total: all.length });
  }
  if (head === 'support-staff' && path[1] === 'tickets' && path.length === 3) {
    const ticketId = Number(path[2]) || 51;
    const ticket = ticketId === 48
      ? { id: 48, subject: 'تنظیم زمان‌های تدریس', status: 'answered', unread_staff: 0, assigned_to: 1, last_message_at: '2026-11-19T21:00:00Z', created_at: '2026-11-19T20:00:00Z', user: { id: 41, name: 'محدثه راوند', mobile: '09121234569', role: 'teacher' }, assignee: { id: 1, name: 'مدیر سامانه' } }
      : { id: 51, subject: 'خطا در پرداخت جلسه', status: 'open', unread_staff: 1, assigned_to: null, last_message_at: '2026-11-20T18:12:00Z', created_at: '2026-11-20T18:00:00Z', user: { id: 95, name: 'عارف رضائی', mobile: '09121234567', role: 'learner' }, assignee: null };
    const messages = [
      { id: 901, sender_id: 95, sender_name: 'عارف رضائی', sender_side: 'user', kind: 'text', body: 'سلام، پرداخت جلسه انجام شد ولی جلسه تأیید نشد.', attachment_url: '', attachment_mime: '', duration_ms: 0, created_at: '2026-11-20T18:00:00Z' },
      { id: 902, sender_id: 95, sender_name: 'عارف رضائی', sender_side: 'user', kind: 'text', body: ' رسید پرداخت را دارم، بررسی می‌کنید؟', attachment_url: '', attachment_mime: '', duration_ms: 0, created_at: '2026-11-20T18:12:00Z' },
    ];
    return jsonResponse({ data: { ticket, messages } });
  }
  /* ارسال پیام کارشناس در پیش‌نمایش — mock آن پیش از گارد GET انجام می‌شود */
  if (head === 'admin' && path[1] === 'support' && path[2] === 'agents' && path.length === 3) {
    return jsonResponse({ data: [{ id: 5, user_id: 15, user: { id: 15, name: 'عبدالرحمن شریفی', mobile: '09121234570', role: 'teacher' } }] });
  }
  if (head === 'admin' && path[1] === 'support' && path[2] === 'messages' && path.length === 3) {
    return jsonResponse({
      data: [
        { id: 21, name: 'مریم حسینی', contact: 'maryam@example.com', message: 'برای دورهٔ حفظ سفارشی چطور ثبت‌نام کنم؟', status: 'new', created_at: '2026-11-17T10:00:00Z' },
        { id: 20, name: 'سعید کاظمی', contact: '0912xxxxxxx', message: 'امکان جلسهٔ حضوری هم دارید؟', status: 'resolved', created_at: '2026-11-12T10:00:00Z' },
      ],
    });
  }
  return null;
}
