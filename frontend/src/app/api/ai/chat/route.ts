import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from '@/lib/server/same-origin';
import { aiComplete, type AiMessage } from '@/lib/ai/gateway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * چت‌بات پشتیبانی هوشمند وُدّا — پاسخ خودکار به سؤالات کاربران دربارهٔ
 * رزرو، فراخوان، مراسم حضوری، کیف پول و مسیرهای اپ؛ دانش پایه + کاتالوگ
 * رسمی خدمات (کش یک‌ساعته) در پرامپت سیستم تزریق می‌شود.
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

/* ── پرامپت سیستم (دانش پلتفرم) ────────────────────────────────────────── */
function buildSystemPrompt(catalog: string): string {
  return [
    'تو «دستیار وُدّا» هستی؛ دستیار پشتیبانی پلتفرم وُدّا (vodda.ir) برای آموزش قرآن کریم آنلاین و خدمات حضوری قرآنی. همیشه فارسی، کوتاه، مؤدبانه و دقیق پاسخ بده.',
    '',
    'دانش پلتفرم (فقط بر همین اساس پاسخ بده؛ چیزی از خودت نساز):',
    '- یافتن استاد: از تب «جستجو» — در تب «خدمات» ابتدا دستهٔ موضوعی انتخاب می‌شود و فقط زیرخدمت‌های همان دسته و اساتید همان دسته نمایش داده می‌شود؛ در تب «اساتید» فهرست همهٔ اساتید با فیلتر شهر، جنسیت، درجه و آماده‌بودن است.',
    '- رزرو جلسه: پروفایل استاد ← «رزرو جلسه» ← انتخاب مدت ۳۰ یا ۶۰ دقیقه ← پرداخت از کیف پول یا درگاه بانکی. تعرفهٔ هر استاد روی پروفایل خودش است؛ عدد ثابتی ذکر نکن.',
    '- فراخوان اساتید: دکمهٔ «فراخوان» در وسط نوار پایین ← انتخاب موضوع رسمی ← درخواست همزمان به همهٔ اساتید همان موضوع ← اساتید پیشنهاد می‌دهند ← تأیید یک پیشنهاد، جلسه می‌سازد.',
    '- مراسم حضوری: از «فراخوان» بخش مراسم؛ خدمات تلاوت مجلسی، اذان، ختم قرآن و تواشیح با قرارداد رسمی و قاریان حضوری.',
    '- جلسات من: تب «جلسات» — جلسات آینده و گذشته با تاریخ شمسی و لینک ورود به کلاس آنلاین.',
    '- کیف پول: شارژ و پرداخت هزینهٔ جلسات؛ برای اساتید موجودی درآمد و برداشت.',
    '- جلسات رایگان: اساتید می‌توانند جلسهٔ رایگان تعریف کنند؛ در بنر «خدمات رایگان» صفحهٔ نخست و در جستجوی خدمات با حالت رایگان دیده می‌شوند.',
    '- درجهٔ اساتید: بین‌المللی، کشوری، استانی — با نشان تأیید رنگی روی کارت‌ها.',
    '- فضای استاد (/t): داشبورد، درخواست‌های جلسه، جلسات، خدمات استاد، برنامهٔ کاری، کیف پول، برداشت، نظرها و ویرایش پروفایل.',
    '- دستیار ویرایش پروفایل: در فضای استاد، بخش «اطلاعات حرفه‌ای»، دکمهٔ «بهبود با هوش مصنوعی» متن معرفی را طبق الگوی وُدّا بازنویسی می‌کند.',
    '- حساب هوش مصنوعی: برای سؤال‌های مالی حساس یا مشکلات فنی، کاربر را به پشتیبانی انسانی (بخش پروفایل ← پشتیبانی) راهنمایی کن و حدس نزن.',
    '',
    catalog ? `فهرست رسمی خدمات آنلاین وُدّا (برای معرفی مسیر درست):\n${catalog}` : '',
    '',
    'قواعد پاسخ:',
    '- حداکثر ۴ تا ۶ جمله؛ در صورت نیاز فهرست کوتاه با نشانهٔ •.',
    '- هیچ قیمتی را حدس نزن؛ به تعرفهٔ روی پروفایل استاد ارجاع بده.',
    '- مسیر داخل اپ را دقیق بگو (مثلاً: تب جستجو ← خدمات ← انتخاب دسته).',
    '- اگر کاربر در انتخاب خدمت مردد است، یک سؤال کوتاه دربارهٔ هدفش بپرس و حداکثر ۳ گزینه از فهرست خدمات پیشنهاد بده.',
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

  const catalog = await catalogLines();
  const messages: AiMessage[] = [{ role: 'system', content: buildSystemPrompt(catalog) }, ...history];

  const result = await aiComplete(messages, { maxTokens: 600, temperature: 0.5 });
  if (result.ok) {
    return NextResponse.json({ ok: true, reply: result.text });
  }
  // خطای موتور AI به‌صورت پیام دوستانه در خود چت نمایش داده می‌شود (نه شکست UI)
  console.error('[ai/chat] fallback:', result.reason, result.detail);
  return NextResponse.json({ ok: false, reply: FALLBACK[result.reason] ?? FALLBACK.upstream, degraded: true });
}
