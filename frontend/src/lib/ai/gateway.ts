import 'server-only';

/**
 * موتور هوش مصنوعی وُدّا — چندفراهموندی با اولویت مدل‌های «رایگان».
 *
 * ترتیب فراخوانی (اولین فراهموند موفق کافی است؛ بقیه فقط پشتیبان‌اند):
 *  ۱) GLM-4.5-Flash از Z.ai         — کلید رایگان (ZAI_API_KEY)
 *  ۲) مدل‌های آزاد OpenRouter        — کلید رایگان (OPENROUTER_API_KEY)
 *  ۳) Pollinations (مدل openai)      — بدون کلید، همیشه فعال
 *  ۴) Pollinations (مدل openai-fast) — بدون کلید، پشتیبان
 *  ۵) DeepSeek                       — فقط پشتیبان آخر (اگر شارژ شده باشد)
 *
 * همهٔ فراهموندها پروتکل سازگار OpenAI (chat/completions) دارند.
 * هر فراهموند پس از خطا به‌صورت خودکار مدتی «خنک» می‌شود و در همان یک
 * درخواست، فراهموند بعدی امتحان می‌شود (failover). کلیدها فقط سمت سرور
 * می‌مانند و هرگز به کلاینت ارسال نمی‌شوند.
 */

export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type AiErrorReason = 'disabled' | 'no_balance' | 'rate_limited' | 'upstream' | 'timeout';

export type AiResult =
  | { ok: true; text: string; provider: string }
  | { ok: false; reason: AiErrorReason; detail: string };

type ProviderSpec = {
  id: string;
  label: string;
  url: string;
  model: string;
  apiKeyEnv?: string;
  headers?: Record<string, string>;
  bodyExtra?: Record<string, unknown>;
};

type ProviderRuntime = ProviderSpec & { cooldownUntil: number; failures: number };

type ErrorKind = 'balance' | 'rate' | 'timeout' | 'upstream';

class ProviderError extends Error {
  constructor(readonly kind: ErrorKind, message: string) {
    super(message);
  }
}

/* ── فهرست فراهموندها (یک‌بار از env ساخته می‌شود) ─────────────────────── */
const COOLDOWN_BALANCE_MS = 6 * 60 * 60 * 1000; // اعتبار تمام — ۶ ساعت خنک
const COOLDOWN_RATE_MS = 90 * 1000; // محدودیت نرخ — خنک کوتاه
const COOLDOWN_BASE_MS = 3 * 60 * 1000; // خطای دیگر — خنک نمایی
const COOLDOWN_MAX_MS = 30 * 60 * 1000;
const PER_ATTEMPT_TIMEOUT_MS = 25_000;
// سرویس‌های بدون کلید (Pollinations) سقف نرخ سخت‌گیری دارند؛ فاصلهٔ حداقل
// بین دو فراخوان + یک تلاش دوبارهٔ کوتاه، از خطای FREE_LIMIT جلوگیری می‌کند.
const KEYLESS_GAP_MS = 3_000;
const RATE_RETRY_DELAY_MS = 4_000;
const lastKeylessCallAt = new Map<string, number>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let runtimeCache: ProviderRuntime[] | null = null;

function buildRuntimes(): ProviderRuntime[] {
  if ((process.env.AI_DISABLE || '').trim() === '1') return [];
  const specs: ProviderSpec[] = [];

  const zaiKey = (process.env.ZAI_API_KEY || '').trim();
  if (zaiKey) {
    specs.push({
      id: 'zai-glm',
      label: 'GLM (Z.ai)',
      url: 'https://api.z.ai/api/paas/v4/chat/completions',
      model: (process.env.ZAI_MODEL || 'glm-4.5-flash').trim(),
      apiKeyEnv: 'ZAI_API_KEY',
    });
  }

  const openRouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
  if (openRouterKey) {
    specs.push({
      id: 'openrouter',
      label: 'OpenRouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      model: (process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3-0324:free').trim(),
      apiKeyEnv: 'OPENROUTER_API_KEY',
      headers: { 'HTTP-Referer': 'https://vodda.ir', 'X-Title': 'Vodda' },
    });
  }

  // Pollinations — سرویس رایگان بدون کلید؛ همیشه در زنجیره حاضر است.
  const pollinationsExtra = { referrer: 'vodda.ir', private: true };
  specs.push({
    id: 'pollinations',
    label: 'Pollinations (openai)',
    url: 'https://text.pollinations.ai/openai',
    model: (process.env.POLLINATIONS_MODEL || 'openai').trim(),
    bodyExtra: pollinationsExtra,
  });
  specs.push({
    id: 'pollinations-fast',
    label: 'Pollinations (openai-fast)',
    url: 'https://text.pollinations.ai/openai',
    model: 'openai-fast',
    bodyExtra: pollinationsExtra,
  });

  const deepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  if (deepseekKey) {
    specs.push({
      id: 'deepseek',
      label: 'DeepSeek',
      url: `${(process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')}/chat/completions`,
      model: (process.env.DEEPSEEK_MODEL || 'deepseek-chat').trim(),
      apiKeyEnv: 'DEEPSEEK_API_KEY',
    });
  }

  return specs.map((spec) => ({ ...spec, cooldownUntil: 0, failures: 0 }));
}

function getRuntimes(): ProviderRuntime[] {
  if (!runtimeCache) runtimeCache = buildRuntimes();
  return runtimeCache;
}

/** آیا موتور هوش مصنوعی روی این نمونه تنظیم شده است؟ */
export function aiConfigured(): boolean {
  return (process.env.AI_DISABLE || '').trim() !== '1' && getRuntimes().length > 0;
}

/* ── تمیزکاری خروجی مدل (حذف حصار مارک‌داون دور کل متن) ────────────────── */
function cleanCompletion(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```[a-zA-Z]*\r?\n([\s\S]*?)\r?\n?```$/.exec(trimmed);
  return (fenced ? fenced[1] : trimmed).trim();
}

/* ── یک فراخوان به یک فراهموند ─────────────────────────────────────────── */
async function callProvider(
  provider: ProviderRuntime,
  messages: AiMessage[],
  opts: { maxTokens?: number; temperature?: number },
  timeoutMs: number,
): Promise<string> {
  const key = provider.apiKeyEnv ? (process.env[provider.apiKeyEnv] || '').trim() : '';
  const maxTokens = Math.min(1400, Math.max(64, opts.maxTokens ?? 600));

  // فاصله‌گذاری فراخوان‌های بدون کلید برای احترام به سقف نرخ سرویس رایگان
  if (!provider.apiKeyEnv) {
    const last = lastKeylessCallAt.get(provider.id) ?? 0;
    const waitMs = last + KEYLESS_GAP_MS - Date.now();
    if (waitMs > 0) await sleep(Math.min(waitMs, 5_000));
    lastKeylessCallAt.set(provider.id, Date.now());
  }

  let response: Response;
  try {
    response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key ? { authorization: `Bearer ${key}` } : {}),
        ...(provider.headers ?? {}),
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        max_tokens: maxTokens,
        temperature: opts.temperature ?? 0.6,
        stream: false,
        ...(provider.bodyExtra ?? {}),
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'network error';
    if (/timeout|timed ?out|abort/i.test(detail)) throw new ProviderError('timeout', detail);
    throw new ProviderError('upstream', detail);
  }

  if (!response.ok) {
    let code = '';
    const raw = await response.text().catch(() => '');
    try {
      const payload = JSON.parse(raw) as { error?: { message?: string; code?: string; type?: string } };
      code = String(payload.error?.code || payload.error?.type || payload.error?.message || '');
    } catch {
      code = raw.slice(0, 160);
    }
    // FREE_LIMIT و مشابه‌ها محدودیت نرخِ موقت سرویس رایگان است، نه اتمام اعتبار —
    // باید سریع دوباره امتحان شود (خنک کوتاه)، نه ۶ ساعت.
    if (/FREE[_ -]?LIMIT|quota|rate[_ -]?limit/i.test(code) || response.status === 429) {
      throw new ProviderError('rate', code || `HTTP ${response.status}`);
    }
    if (response.status === 402 || /insufficient[_ ]balance/i.test(code)) {
      throw new ProviderError('balance', code || `HTTP ${response.status}`);
    }
    throw new ProviderError('upstream', `${response.status} ${code}`.trim());
  }

  const raw = await response.text().catch(() => '');
  let text = '';
  try {
    const payload = JSON.parse(raw) as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = payload.choices?.[0]?.message?.content;
    text = typeof content === 'string' ? content : '';
  } catch {
    text = raw; // پاسخ متنی خام (بدون JSON) — اگر غیرخالی باشد قبول می‌شود
  }
  text = cleanCompletion(text);
  if (!text) throw new ProviderError('upstream', 'empty completion');
  return text;
}

/* ── نقطهٔ ورود اصلی — با failover خودکار ───────────────────────────────── */
export async function aiComplete(
  messages: AiMessage[],
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<AiResult> {
  // حالت آزمایشی توسعهٔ محلی — بدون تماس با سرویس واقعی
  if (process.env.AI_MOCK === '1') {
    const last = [...messages].reverse().find((message) => message.role === 'user');
    return { ok: true, provider: 'mock', text: mockReply(last?.content ?? '') };
  }

  const runtimes = getRuntimes();
  if (!runtimes.length) {
    return { ok: false, reason: 'disabled', detail: 'no AI provider configured (AI_DISABLE=1 or no key)' };
  }

  const deadline = Date.now() + (opts.timeoutMs ?? 45_000);
  const errors: Array<{ reason: AiErrorReason; detail: string }> = [];

  for (const provider of runtimes) {
    if (provider.cooldownUntil > Date.now()) continue;

    // هر فراهموند حداکثر دو تلاش در همین درخواست دارد؛ تلاش دوم فقط برای
    // خطای نرخِ موقت (FREE_LIMIT/429) و در صورت باقی‌ماندن بودجهٔ زمانی.
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const now = Date.now();
      const remaining = deadline - now;
      if (remaining < 3_000) {
        errors.push({ reason: 'timeout', detail: 'ai budget exhausted' });
        return failResult(errors);
      }

      try {
        const text = await callProvider(provider, messages, opts, Math.min(remaining, PER_ATTEMPT_TIMEOUT_MS));
        provider.failures = 0;
        return { ok: true, text, provider: provider.label };
      } catch (error) {
        const kind = error instanceof ProviderError ? error.kind : 'upstream';
        const detail = error instanceof Error ? error.message : 'unknown error';
        provider.failures += 1;
        const reason: AiErrorReason =
          kind === 'balance' ? 'no_balance' : kind === 'rate' ? 'rate_limited' : kind;
        errors.push({ reason, detail: `${provider.id}: ${detail}` });
        console.warn(`[ai/gateway] provider ${provider.id} failed (${kind}, attempt ${attempt}): ${detail}`);

        if (
          kind === 'rate' &&
          attempt === 1 &&
          deadline - Date.now() > RATE_RETRY_DELAY_MS + 5_000
        ) {
          await sleep(RATE_RETRY_DELAY_MS);
          continue; // تلاش دوبارهٔ همان فراهموند بدون خنک‌شدن
        }

        if (kind === 'balance') {
          provider.cooldownUntil = Date.now() + COOLDOWN_BALANCE_MS;
        } else if (kind === 'rate') {
          provider.cooldownUntil = Date.now() + Math.min(COOLDOWN_RATE_MS * provider.failures, 10 * 60 * 1000);
        } else {
          provider.cooldownUntil =
            Date.now() + Math.min(COOLDOWN_BASE_MS * 2 ** (provider.failures - 1), COOLDOWN_MAX_MS);
        }
        break; // رفتن به فراهموند بعدی
      }
    }
  }

  return failResult(errors);
}

// اولویت پیام خطا: خطای عمومی/مهلت نسبت به «بدون اعتبار» مفیدتر است
function failResult(errors: Array<{ reason: AiErrorReason; detail: string }>): AiResult {
  const chosen =
    (['timeout', 'rate_limited', 'upstream'] as const)
      .map((reason) => errors.find((item) => item.reason === reason))
      .find(Boolean) ?? errors[0];
  return {
    ok: false,
    reason: chosen?.reason ?? 'upstream',
    detail: errors.map((item) => item.detail).join(' | ') || 'no provider attempted',
  };
}

/** پاسخ نمونهٔ فارسی برای تست رابط کاربری بدون تماس واقعی (فقط AI_MOCK=1). */
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
