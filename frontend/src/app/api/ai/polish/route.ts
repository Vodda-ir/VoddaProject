import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from '@/lib/server/same-origin';
import { aiComplete } from '@/lib/ai/deepseek';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * دستیار ویرایش متن هوشمند وُدّا — بازنویسی متن‌ها طبق الگوی اپ:
 * bio     → «معرفی استاد» طبق ساختار رسمی پروفایل
 * service → توضیح کوتاه و جذاب یک خدمت
 * reply   → پاسخ مؤدبانه به نظر دانشجو
 * نیازمند ورود (کوکی سشن وُدّا)؛ کلید AI سمت سرور می‌ماند.
 */

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 15;
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
  if (buckets.size > 2000) buckets.clear();
  return false;
}

type PolishKind = 'bio' | 'service' | 'reply';

const PROMPTS: Record<PolishKind, string> = {
  bio: [
    'متن «معرفی استاد» را طبق الگوی رسمی وُدّا بازنویسی کن. الگو:',
    '۱) یک بند معرفی صمیمی و حرفه‌ای (۲ تا ۴ جمله) دربارهٔ سابقه، سبک تدریس و رویکرد آموزشی؛',
    '۲) سطر «🎯 زمینه‌های تدریس:» و سپس ۳ تا ۵ مورد با نشانهٔ • در خط‌های جدا؛',
    '۳) در پایان یک سطر مشخصات به شکل «📍 مدرک یا اجازهٔ تدریس | شهر» (فقط اگر در متن اصلی بود؛ وگرنه این سطر را کلاً حذف کن).',
    'قواعد: فقط حقایق موجود در متن اصلی را نگه دار و چیزی از خودت اضافه نکن؛ ادعاهای بزرگ‌نمایانه (بهترین، بی‌نظیر، شمارهٔ یک) ننویس؛ لحن محترمانه، قرآنی و قابل اعتماد؛ املای روان فارسی. خروجی فقط متن نهایی باشد — بدون توضیح، مقدمه یا علامت نقل‌قول.',
  ].join('\n'),
  service: [
    'برای خدمت آموزشی قرآنی یک توضیح کوتاه (حداکثر ۲ جمله، مجموعاً حداکثر ۴۰ کلمه) بنویس: گویا، محترمانه، بدون بزرگ‌نمایی و بدون قیمتی. فقط از حقایق متن اصلی استفاده کن. خروجی فقط متن نهایی باشد.',
  ].join('\n'),
  reply: [
    'یک پاسخ مؤدبانه و گرم (حداکثر ۳ جمله) به نظر/پیام دانشجو بنویس: قدردانی کوتاه، اشارهٔ محترمانه به نکتهٔ اصلی نظر، و جملهٔ پایانی دلگرم‌کننده. لحن قرآنی و حرفه‌ای؛ بدون قول ویژهٔ مالی یا مدیریتی. خروجی فقط متن نهایی باشد.',
  ].join('\n'),
};

const FALLBACK: Record<string, string> = {
  disabled: 'دستیار هوشمند هنوز فعال نشده است.',
  no_balance: 'دستیار هوشمند موقتاً بدون اعتبار است؛ به‌زودی فعال می‌شود.',
  rate_limited: 'درخواست‌های زیاد؛ چند لحظه بعد دوباره تلاش کنید.',
  timeout: 'پاسخ‌گویی طول کشید؛ دوباره تلاش کنید.',
  upstream: 'الان امکان بازنویسی نیست؛ کمی بعد دوباره امتحان کنید.',
};

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'درخواست بین‌دامنه‌ای مجاز نیست' }, { status: 403 });
  }
  // این ابزار مخصوص کاربران واردشده (فضای استاد) است
  if (!request.cookies.get('vodda_token')?.value) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, reply: FALLBACK.rate_limited }, { status: 429 });
  }

  let body: { kind?: unknown; text?: unknown };
  try {
    body = (await request.json()) as { kind?: unknown; text?: unknown };
  } catch {
    return NextResponse.json({ ok: false, reply: 'درخواست نامعتبر بود.' }, { status: 400 });
  }

  const kind: PolishKind = body.kind === 'service' || body.kind === 'reply' ? body.kind : 'bio';
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (text.length < 10) {
    return NextResponse.json({ ok: false, reply: 'متن برای بازنویسی بسیار کوتاه است.' }, { status: 400 });
  }

  const messages = [
    { role: 'system' as const, content: PROMPTS[kind] },
    { role: 'user' as const, content: text.slice(0, 2500) },
  ];

  const result = await aiComplete(messages, { maxTokens: 900, temperature: 0.4 });
  if (result.ok) {
    return NextResponse.json({ ok: true, text: result.text });
  }
  console.error('[ai/polish] fallback:', result.reason, result.detail);
  return NextResponse.json({ ok: false, reply: FALLBACK[result.reason] ?? FALLBACK.upstream });
}
