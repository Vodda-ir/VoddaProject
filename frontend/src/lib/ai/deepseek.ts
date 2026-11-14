import 'server-only';

/**
 * کلاینت سمت سرور هوش مصنوعی وُدّا (DeepSeek).
 * کلید API فقط روی سرور می‌ماند و هرگز به کلاینت ارسال نمی‌شود؛
 * کلاینت فقط با مسیرهای /api/ai/* در همین پروژه (BFF) حرف می‌زند.
 */

const DEEPSEEK_BASE = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type AiResult =
  | { ok: true; text: string; provider: string }
  | { ok: false; reason: 'disabled' | 'no_balance' | 'rate_limited' | 'upstream' | 'timeout'; detail: string };

/** آیا موتور هوش مصنوعی روی این نمونه تنظیم شده است؟ */
export function aiConfigured(): boolean {
  return Boolean((process.env.DEEPSEEK_API_KEY || '').trim()) || process.env.AI_MOCK === '1';
}

export async function aiComplete(
  messages: AiMessage[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<AiResult> {
  // حالت آزمایشی توسعهٔ محلی — بدون مصرف اعتبار واقعی
  if (process.env.AI_MOCK === '1') {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    return { ok: true, provider: 'mock', text: mockReply(last?.content ?? '') };
  }

  const key = (process.env.DEEPSEEK_API_KEY || '').trim();
  if (!key) {
    return { ok: false, reason: 'disabled', detail: 'DEEPSEEK_API_KEY is not set' };
  }

  try {
    const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        max_tokens: Math.min(1400, Math.max(64, opts.maxTokens ?? 600)),
        temperature: opts.temperature ?? 0.6,
        stream: false,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(opts.timeoutMs ?? 40_000),
    });

    if (!response.ok) {
      let code = '';
      try {
        const payload = (await response.json()) as {
          error?: { message?: string; code?: string; type?: string };
        };
        code = String(payload.error?.code || payload.error?.type || payload.error?.message || '');
      } catch {
        // بدنهٔ خطا JSON نبود — بی‌اهمیت
      }
      if (response.status === 402 || code.includes('insufficient_balance')) {
        return { ok: false, reason: 'no_balance', detail: code };
      }
      if (response.status === 429) return { ok: false, reason: 'rate_limited', detail: code };
      return { ok: false, reason: 'upstream', detail: `${response.status} ${code}`.trim() };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = payload.choices?.[0]?.message?.content?.trim() ?? '';
    if (!text) return { ok: false, reason: 'upstream', detail: 'empty completion' };
    return { ok: true, text, provider: DEEPSEEK_MODEL };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'network error';
    const timedOut = /timeout|timed ?out/i.test(detail);
    return { ok: false, reason: timedOut ? 'timeout' : 'upstream', detail };
  }
}

/** پاسخ نمونهٔ فارسی برای تست رابط کاربری بدون مصرف اعتبار (فقط AI_MOCK=1). */
function mockReply(userText: string): string {
  const trimmed = userText.trim().slice(0, 60);
  if (/رزرو|جلسه/.test(trimmed)) {
    return 'برای رزرو جلسه، از تب «جستجو» پروفایل استاد دلخواه را باز کنید و روی «رزرو جلسه» بزنید؛ مدت ۳۰ یا ۶۰ دقیقه را انتخاب و از کیف پول یا درگاه پرداخت کنید. (پاسخ آزمایشی)';
  }
  if (/فراخوان/.test(trimmed)) {
    return '«فراخوان» درخواست همزمان شما به همهٔ اساتید یک موضوع است؛ از دکمهٔ فراخوان در پایین صفحه، موضوع را انتخاب کنید و اساتید به شما پیشنهاد می‌دهند. (پاسخ آزمایشی)';
  }
  return `سلام! من دستیار هوشمند وُدّا هستم. پیام شما دریافت شد: «${trimmed || '…'}». این یک پاسخ آزمایشی برای تست رابط است. (حالت AI_MOCK)`;
}
