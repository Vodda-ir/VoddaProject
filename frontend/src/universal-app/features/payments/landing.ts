// قرارداد لندینگ پرداخت (return_to)
//
// کال‌بک بانک (sep.shaparak.ir) همیشه روی مبدأ عمومیِ ثبت‌شدهٔ پذیرنده فرود
// می‌آید — FRONTEND_BASE_URL یعنی https://vodda.ir — پس مسیر بازگشت باید نسخهٔ
// مطلقِ همان مبدأ از صفحهٔ اپ یونیورسال باشد. به همین دلیل ثابت‌ها همیشه زیر
// ‎/app‎ هستند، چه پرداخت از vodda.ir/app شروع شده باشد، چه از app.vodda.ir
// (که روت را از /app سرو می‌کند) و چه از وب‌ویو اپ Capacitor.
//
// بک‌اند فقط مسیرهای نسبی شروع‌شده با ‎/app‎ را می‌پذیرد (sanitizeReturnPath)
// و بدون این فیلد، کاربر به لندینگ پنل قدیمی برمی‌گردد — رفتار سازگار با
// کلاینت‌های قدیمی.
export const APP_LANDING_SESSIONS = "/app/sessions";
export const APP_LANDING_WALLET = "/app/wallet";
// قرارداد مراسم حضوری: بعد از راند‌تریپ درگاه، کاربر روی جزئیات همان قرارداد
// برمی‌گردد (‎?payment=success|verify|failed‎ توسط PaymentResultBanner خوانده می‌شود).
export const APP_LANDING_CEREMONY_BOOKINGS = "/app/ceremony/bookings";

/** مسیر بازگشت از درگاه برای قرارداد مراسم با شناسهٔ مشخص. */
export function ceremonyBookingLanding(bookingId: number): string {
  return `${APP_LANDING_CEREMONY_BOOKINGS}/${bookingId}`;
}
