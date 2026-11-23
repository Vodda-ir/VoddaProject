import 'server-only';

// دامنهٔ کوکی سشن. با SESSION_COOKIE_DOMAIN=.vodda.ir سشن بین vodda.ir و
// app.vodda.ir مشترک می‌شود تا برگشت کاربر از درگاه بانک — که همیشه روی مبدأ
// عمومی ثبت‌شده (vodda.ir) فرود می‌آید، فارغ از اینکه پرداخت از کدام دامنه
// شروع شده — او را لاگ‌این ببیند. مقدار خالی یعنی host-only (رفتار قدیمی).
export function sessionCookieDomain(): string | undefined {
  const domain = (process.env.SESSION_COOKIE_DOMAIN ?? '').trim();
  return domain ? domain : undefined;
}
