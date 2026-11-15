import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from '@/lib/server/same-origin';
import { aiComplete, type AiMessage } from '@/lib/ai/gateway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * چت‌بات پشتیبانی هوشمند وُدّا — پاسخ خودکار به سؤالات کاربران دربارهٔ
 * رزرو، فراخوان، مراسم حضوری، کیف پول و مسیرهای اپ؛ به‌علاوهٔ گفت‌وگوی
 * عمومی (سلام و احوالپرسی) و شناختِ واقعی اساتید پلتفرم (نام، درجه، شهر،
 * خدمات) و وقت‌های آزادِ زندهٔ هر استاد وقتی نامش برده می‌شود.
 * دانش پایه + کاتالوگ خدمات (کش یک‌ساعته) + فهرست اساتید (کش ۳۰ دقیقه‌ای)
 * در پرامپت سیستم تزریق می‌شود.
 */

const API_BASE = (process.env.SERVER_API_URL || 'http://backend:3420/api/v1').replace(/\/$/, '');

/* ── سپر سبک سوءاستفاده (در حافظهٔ نمونه) ─────────────────────────────── */
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 20;
const buckets = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (buckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) {
    buckets.set(ip, list);
    return true;
  }
  list.push(now);
  buckets.set(ip, list);
  if (buckets.size > 2000) buckets.clear(); // سپر حافظه
  return false;
}

function clientIp(request: NextRequest): string {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
}

/* ── کاتالوگ خدمات واقعی (هر یک ساعت) ──────────────────────────────────── */
let catalogCache: { at: number; lines: string } | null = null;

async function catalogLines(): Promise<string> {
  if (catalogCache && Date.now() - catalogCache.at < 60 * 60 * 1000) return catalogCache.lines;
  try {
    const response = await fetch(`${API_BASE}/catalog/services`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(String(response.status));
    const payload = (await response.json()) as {
      data?: { categories?: Array<{ category?: string; services?: Array<{ title?: string }> }> };
    };
    const lines = (payload.data?.categories ?? [])
      .map(
        (group) =>
          `- ${String(group.category ?? '')}: ${(group.services ?? [])
            .map((item) => String(item.title ?? ''))
            .filter(Boolean)
            .join('، ')}`,
      )
      .filter((line) => line.length > 6)
      .join('\n');
    if (lines) {
      catalogCache = { at: Date.now(), lines };
      return lines;
    }
  } catch {
    // کاتالوگ اختیاری است — پاسخ بدون آن هم معتبر می‌ماند
  }
  return catalogCache?.lines ?? '';
}

/* ── فهرست واقعی اساتید (هر ۳۰ دقیقه) ──────────────────────────────────── */

type TeacherBrief = {
  id: number;
  name: string;
  field: string;
  tier: string;
  city: string;
  services: Array<{ id: number; title: string }>;
  available: boolean;
};

type TeacherRoster = { briefs: TeacherBrief[]; lines: string };

const TIER_LABELS: Record<string, string> = {
  international: 'بین‌المللی',
  grade2: 'کشوری',
  grade3: 'استانی',
};

let rosterCache: { at: number; roster: TeacherRoster } | null = null;
const ROSTER_TTL_MS = 30 * 60 * 1000;
const ROSTER_MAX_TEACHERS = 150;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parseTeacherBrief(raw: unknown): TeacherBrief | null {
  const data = asRecord(raw);
  const id = asNumber(data.id);
  const user = asRecord(data.user);
  const name = asString(user.name);
  if (!id || !name) return null;
  const services = Array.isArray(data.services)
    ? data.services
        .map((item) => {
          const record = asRecord(item);
          return { id: asNumber(record.id), title: asString(record.title) };
        })
        .filter((service) => service.id > 0 && service.title.length > 0)
    : [];
  return {
    id,
    name,
    field: asString(data.field),
    tier: asString(data.tier),
    city: asString(data.city),
    services,
    available: data.available !== false,
  };
}

async function fetchTeacherPage(offset: number): Promise<{ rows: unknown[]; total: number }> {
  const response = await fetch(`${API_BASE}/teachers?limit=100&offset=${offset}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`teachers HTTP ${response.status}`);
  const payload = (await response.json()) as { data?: unknown; total?: unknown };
  const rows = Array.isArray(payload.data) ? payload.data : [];
  const total = typeof payload.total === 'number' ? payload.total : rows.length;
  return { rows, total };
}

function rosterLines(briefs: TeacherBrief[]): string {
  return briefs
    .map((teacher) => {
      const tier = TIER_LABELS[teacher.tier] ?? '—';
      const services = teacher.services
        .slice(0, 3)
        .map((service) => service.title)
        .join('، ');
      const field = teacher.field.length > 30 ? `${teacher.field.slice(0, 30)}…` : teacher.field;
      const readiness = teacher.available ? '' : ' | فعلاً آماده نیست';
      return `- ${teacher.name} | ${tier} | ${teacher.city || '—'} | ${field || '—'} | ${services || '—'}${readiness}`;
    })
    .join('\n');
}

async function teacherRoster(): Promise<TeacherRoster | null> {
  if (rosterCache && Date.now() - rosterCache.at < ROSTER_TTL_MS) return rosterCache.roster;
  try {
    const briefs: TeacherBrief[] = [];
    let total = Infinity;
    for (let offset = 0; offset < total && briefs.length < ROSTER_MAX_TEACHERS; offset += 100) {
      const page = await fetchTeacherPage(offset);
      total = page.total;
      for (const row of page.rows) {
        const brief = parseTeacherBrief(row);
        if (brief) briefs.push(brief);
      }
      if (page.rows.length < 100) break;
    }
    if (!briefs.length) return rosterCache?.roster ?? null;
    const roster: TeacherRoster = { briefs, lines: rosterLines(briefs) };
    rosterCache = { at: Date.now(), roster };
    return roster;
  } catch {
    return rosterCache?.roster ?? null;
  }
}

/* ── تشخیص نام استاد در پیام کاربر ─────────────────────────────────────── */

function normalizeFa(text: string): string {
  return text
    .replace(/[\u200c\u200e\u200f]/g, ' ')
    .replace(/[يﻱﻲ]/g, 'ی')
    .replace(/[كﻙﻛ]/g, 'ک')
    .replace(/[أإ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function findMentionedTeacher(message: string, briefs: TeacherBrief[]): TeacherBrief | null {
  const normalized = normalizeFa(message);
  if (!normalized) return null;
  let best: TeacherBrief | null = null;
  let bestLength = 0;
  for (const teacher of briefs) {
    const name = normalizeFa(teacher.name);
    // فقط نام کامل (≥۵ نویسه) تا هم‌نام‌های کوتاه اشتباه گرفته نشوند
    if (name.length >= 5 && normalized.includes(name) && name.length > bestLength) {
      best = teacher;
      bestLength = name.length;
    }
  }
  return best;
}

/* ── وقت‌های آزاد زندهٔ یک استاد (هر ۵ دقیقه) ──────────────────────────── */

type AvailabilitySlot = {
  local_date?: unknown;
  local_start?: unknown;
  local_end?: unknown;
};

/** تاریخ میلادی «local_date» را به برچسب شمسی با نام روز تبدیل می‌کند (Intl fa-IR). */
function jalaliDayLabel(localDate: string): string {
  const date = new Date(`${localDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return localDate;
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  } catch {
    return localDate;
  }
}

const availabilityCache = new Map<string, { at: number; text: string }>();
const AVAILABILITY_TTL_MS = 5 * 60 * 1000;
const AVAILABILITY_DAYS = 7;
const MAX_DAY_GROUPS = 8;
const MAX_SLOTS_PER_DAY = 8;

async function teacherAvailabilityText(teacher: TeacherBrief): Promise<string | null> {
  const firstService = teacher.services[0];
  if (!firstService) return null;
  const cacheKey = `${teacher.id}:${firstService.id}`;
  const cached = availabilityCache.get(cacheKey);
  if (cached && Date.now() - cached.at < AVAILABILITY_TTL_MS) return cached.text;

  let text: string;
  try {
    const response = await fetch(
      `${API_BASE}/teachers/${teacher.id}/availability?service_id=${firstService.id}&days=${AVAILABILITY_DAYS}`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) throw new Error(`availability HTTP ${response.status}`);
    const payload = (await response.json()) as { data?: unknown };
    const slots = (Array.isArray(payload.data) ? payload.data : []) as AvailabilitySlot[];

    const byDay = new Map<string, string[]>();
    for (const slot of slots) {
      const date = asString(slot.local_date);
      const start = asString(slot.local_start);
      const end = asString(slot.local_end);
      if (!date || !start) continue;
      const list = byDay.get(date) ?? [];
      if (list.length < MAX_SLOTS_PER_DAY) list.push(end ? `${start} تا ${end}` : start);
      byDay.set(date, list);
    }

    if (!byDay.size) {
      text = `«${teacher.name}» فعلاً در ${AVAILABILITY_DAYS} روز آینده وقت آزادِ ثبت‌شده ندارد؛ از پروفایل او گزینهٔ «رزرو جلسه» را ببینید یا با «فراخوان» از او درخواست بدهید.`;
    } else {
      const parts: string[] = [];
      let shown = 0;
      for (const [date, times] of byDay) {
        if (parts.length >= MAX_DAY_GROUPS) break;
        shown += times.length;
        parts.push(`- ${jalaliDayLabel(date)}: ${times.join('، ')}`);
      }
      const remaining = slots.length - shown;
      text = `وقت‌های آزاد «${teacher.name}» در ${AVAILABILITY_DAYS} روز آینده (برای خدمت «${firstService.title}»):\n${parts.join(
        '\n',
      )}${remaining > 0 ? `\nو ${remaining} وقت دیگر — فهرست کامل در صفحهٔ رزرو.` : ''}`;
    }
  } catch {
    return null; // اطلاعات زنده اختیاری است؛ پرامپت بدون آن هم می‌ایستد
  }

  if (availabilityCache.size > 300) availabilityCache.clear();
  availabilityCache.set(cacheKey, { at: Date.now(), text });
  return text;
}

/* ── پرامپت سیستم (دانش پلتفرم + گفت‌وگوی عمومی) ───────────────────────── */
function buildSystemPrompt(catalog: string, roster: string): string {
  return [
    'تو «دستیار وُدّا» هستی؛ دستیار پشتیبانی پلتفرم وُدّا (vodda.ir) برای آموزش قرآن کریم آنلاین و خدمات حضوری قرآنی. همیشه فارسی، گرم، مؤدبانه، کوتاه و دقیق پاسخ بده.',
    '',
    'گفت‌وگوی عمومی:',
    '- به سلام، درود، احوالپرسی، تشکر، دعای خیر و تعارف‌های کوتاه با جمله‌های کوتاه صمیمی و قرآنی پاسخ بده؛ خودت را «دستیار هوشمند وُدّا» معرفی کن و اسم شخصی برای خودت نساز.',
    '- اگر کاربر احوال تو را پرسید، بگو خیرم و آمادهٔ کمک؛ سپس یک پرسش کوتاه دربارهٔ نیازش بپرس.',
    '- سؤال‌های عمومی دربارهٔ یادگیری قرآن (شروع حفظ، تجوید، روخوانی، صوت و لحن و…) را کوتاه و مفید جواب بده و در پایان مسیر مرتبط در وُدّا را پیشنهاد بده.',
    '- موضوعات نامربوط به قرآن و پلتفرم (سیاست، شرط‌بندی، درخواست‌های نامناسب و…) را محترمانه رد کن و آرام به موضوع کار پلتفرم برگردان.',
    '',
    'دانش پلتفرم (دربارهٔ وُدّا فقط بر همین اساس پاسخ بده؛ چیزی از خودت نساز):',
    '- ثبت‌نام و ورود: با شمارهٔ موبایل و کد پیامکی؛ پس از ورود، تکمیل پروفایل (نام، شهر) از مسیر پروفایل ← ویرایش.',
    '- یافتن استاد: از تب «جستجو» — در تب «خدمات» ابتدا دستهٔ موضوعی انتخاب می‌شود و فقط زیرخدمت‌های همان دسته و اساتید همان دسته نمایش داده می‌شود؛ در تب «اساتید» فهرست همهٔ اساتید با فیلتر شهر، جنسیت، درجه و آماده‌بودن است.',
    '- رزرو جلسه: پروفایل استاد ← «رزرو جلسه» ← انتخاب مدت ۳۰ یا ۶۰ دقیقه ← پرداخت از کیف پول یا درگاه بانکی. تعرفهٔ هر استاد روی پروفایل خودش است؛ عدد ثابتی ذکر نکن.',
    '- فراخوان اساتید: دکمهٔ «فراخوان» در وسط نوار پایین ← انتخاب موضوع رسمی ← درخواست همزمان به همهٔ اساتید همان موضوع ← اساتید پیشنهاد می‌دهند ← تأیید یک پیشنهاد، جلسه می‌سازد.',
    '- مراسم حضوری: از «فراخوان» بخش مراسم؛ خدمات تلاوت مجلسی، اذان، ختم قرآن و تواشیح با قرارداد رسمی و قاریان حضوری.',
    '- جلسات من: تب «جلسات» — جلسات آینده و گذشته با تاریخ شمسی و لینک ورود به کلاس آنلاین.',
    '- کیف پول: شارژ و پرداخت هزینهٔ جلسات؛ برای اساتید موجودی درآمد و برداشت.',
    '- جلسات رایگان: اساتید می‌توانند جلسهٔ رایگان تعریف کنند؛ در بنر «خدمات رایگان» صفحهٔ نخست و در جستجوی خدمات با حالت رایگان دیده می‌شوند.',
    '- درجهٔ اساتید: بین‌المللی (درجه ۱)، کشوری (درجه ۲)، استانی (درجه ۳) — با نشان تأیید رنگی روی کارت‌ها.',
    '- وبلاگ آموزشی: مقاله‌های آموزشی وُدّا از مسیر وبلاگ در سایت.',
    '- پشتیبانی انسانی: از بخش پروفایل ← پشتیبانی؛ برای سؤال‌های مالی حساس یا مشکلات فنی کاربر را همان‌جا راهنمایی کن و حدس نزن.',
    '- فضای استاد (/t): داشبورد، درخواست‌های جلسه، جلسات، خدمات استاد، برنامهٔ کاری، کیف پول، برداشت، نظرها و ویرایش پروفایل.',
    '- دستیار ویرایش پروفایل: در فضای استاد، بخش «اطلاعات حرفه‌ای»، دکمهٔ «بهبود با هوش مصنوعی» متن معرفی را طبق الگوی وُدّا بازنویسی می‌کند.',
    '',
    catalog ? `فهرست رسمی خدمات آنلاین وُدّا (برای معرفی مسیر درست):\n${catalog}` : '',
    '',
    roster
      ? `فهرست اساتید وُدّا (نام | درجه | شهر | رشته | خدمات) — اگر کاربر نام یا فعالیت یک استاد را پرسید، از همین فهرست استفاده کن:\n${roster}`
      : '',
    '',
    'قواعد پاسخ:',
    '- حداکثر ۴ تا ۶ جمله؛ در صورت نیاز فهرست کوتاه با نشانهٔ •.',
    '- هیچ قیمتی را حدس نزن؛ به تعرفهٔ روی پروفایل استاد ارجاع بده.',
    '- مسیر داخل اپ را دقیق بگو (مثلاً: تب جستجو ← خدمات ← انتخاب دسته).',
    '- اگر کاربر در انتخاب خدمت مردد است، یک سؤال کوتاه دربارهٔ هدفش بپرس و حداکثر ۳ گزینه از فهرست خدمات پیشنهاد بده.',
    '- اگر نام یک استاد در پیام کاربر آمده و وقت‌های آزاد او در انتهای همین پیام سیستم درج شده، فقط بر اساس همان وقت‌ها جواب بده و بگو برای رزرو قطعی به پروفایل استاد برود.',
    '- از پاسخ‌های طولانی، تکرار و تعارف اضافی پرهیز کن.',
  ]
    .filter(Boolean)
    .join('\n');
}

/* ── پاسخ‌های جانشین وقتی موتور AI در دسترس نیست ───────────────────────── */
const FALLBACK: Record<string, string> = {
  disabled:
    'دستیار هوشمند هنوز روی پلتفرم فعال نشده است. تا فعال‌شدن کامل، پرسش‌هایتان را از «پشتیبانی» در بخش پروفایل بپرسید.',
  no_balance:
    'دستیار هوشمند موقتاً در دسترس نیست؛ چند دقیقه بعد دوباره تلاش کنید. تا آن زمان از «پشتیبانی» در بخش پروفایل کمک بگیرید.',
  rate_limited:
    'درحال‌حاضر تعداد درخواست‌ها زیاد است؛ چند لحظه بعد دوباره بپرسید.',
  timeout:
    'پاسخ‌گویی طول کشید؛ لطفاً دوباره تلاش کنید. اگر فوراً پاسخ خواستید، از «پشتیبانی» در بخش پروفایل بپرسید.',
  upstream:
    'الان امکان پاسخ‌گویی خودکار نیست؛ کمی بعد دوباره امتحان کنید یا از «پشتیبانی» در بخش پروفایل بپرسید.',
};

const WELCOME =
  'سلام! من دستیار هوشمند وُدّا هستم. دربارهٔ رزرو جلسه، فراخوان اساتید، مراسم حضوری، کیف پول یا هر بخش از اپ سؤال دارید، بپرسید.';

export async function GET() {
  // فقط برای بررسی سلامت/فعال‌بودن سرویس از سمت کلاینت
  return NextResponse.json({ ok: true, welcome: WELCOME });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'درخواست بین‌دامنه‌ای مجاز نیست' }, { status: 403 });
  }
  if (rateLimited(clientIp(request))) {
    return NextResponse.json(
      { ok: false, reply: FALLBACK.rate_limited },
      { status: 429 },
    );
  }

  let body: { messages?: unknown; page?: unknown };
  try {
    body = (await request.json()) as { messages?: unknown; page?: unknown };
  } catch {
    return NextResponse.json({ ok: false, reply: 'پیام نامعتبر بود.' }, { status: 400 });
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const history: AiMessage[] = [];
  for (const item of raw.slice(-12)) {
    const record = item as { role?: unknown; content?: unknown };
    const role = record?.role === 'assistant' ? 'assistant' : record?.role === 'user' ? 'user' : null;
    const content = typeof record?.content === 'string' ? record.content.trim().slice(0, 900) : '';
    if (role && content) history.push({ role, content });
  }
  if (!history.some((m) => m.role === 'user')) {
    return NextResponse.json({ ok: false, reply: 'پیامی برای پاسخ‌گویی یافت نشد.' }, { status: 400 });
  }

  const [catalog, roster] = await Promise.all([catalogLines(), teacherRoster()]);
  let system = buildSystemPrompt(catalog, roster?.lines ?? '');

  // اگر نام استادی در آخرین پیام کاربر آمده، وقت‌های آزاد زندهٔ او را تزریق کن
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  if (lastUser && roster?.briefs.length) {
    const mentioned = findMentionedTeacher(lastUser.content, roster.briefs);
    if (mentioned) {
      const availability = await teacherAvailabilityText(mentioned);
      if (availability) system += `\n\n${availability}`;
    }
  }

  const messages: AiMessage[] = [{ role: 'system', content: system }, ...history];

  const result = await aiComplete(messages, { maxTokens: 700, temperature: 0.5 });
  if (result.ok) {
    return NextResponse.json({ ok: true, reply: result.text });
  }
  // خطای موتور AI به‌صورت پیام دوستانه در خود چت نمایش داده می‌شود (نه شکست UI)
  console.error('[ai/chat] fallback:', result.reason, result.detail);
  return NextResponse.json({ ok: false, reply: FALLBACK[result.reason] ?? FALLBACK.upstream, degraded: true });
}
