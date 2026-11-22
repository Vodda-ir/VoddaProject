/*
 * بنرهای تبلیغاتی صفحهٔ اصلی وب — v1.12.0
 * دو بنر جذاب و کلیک‌پذیر:
 *   ۱) بالای صفحه: «منافسه» — سکوی مسابقات قرآنی (monafeseh.ir)
 *   ۲) وسط صفحه: «اینستا قرآن» — اپ همراه قرآنی
 * کل بنر یک لینک است (کلیک در تب جدید)، گوشه‌ها مربع (قاعدهٔ کارت مربع) و
 * انیمیشن‌ها با prefers-reduced-motion خاموش می‌شوند.
 */

export const MONAFESEH_URL = 'https://monafeseh.ir';
export const INSTA_QURAN_URL = 'https://q1uwk9k91ct0-d.space-z.ai';

export function MonafesehPromoBanner() {
  return (
    <a
      className="promo-band promo-mona"
      href={MONAFESEH_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="سکوی مسابقات قرآنی منافسه — ورود به monafeseh.ir"
    >
      <span className="promo-mona-body">
        <span className="promo-kicker">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="9" r="5" />
            <path d="m8.5 13.5-1.5 6 5-2.5 5 2.5-1.5-6" />
          </svg>
          سکوی رسمی مسابقات قرآنی وُدّا
        </span>
        <strong className="promo-mona-title">
          مُنافَسه
          <span className="promo-mona-title-glow" aria-hidden="true" />
        </strong>
        <span className="promo-mona-sub">
          رقابت قرآنی آنلاین؛ شرکت در مسابقات، بالا بردن سطح و شانس جوایز — از مبتدی تا حافظ کل.
        </span>
        <span className="promo-cta promo-cta-gold">
          همین حالا وارد شوید
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <path d="m11 6-6 6 6 6" />
          </svg>
        </span>
      </span>
      <span className="promo-mona-art" aria-hidden="true">
        <img src="/banners/monafeseh.png" alt="" loading="lazy" />
      </span>
      <span className="promo-shine" aria-hidden="true" />
    </a>
  );
}

export function InstaQuranPromoBanner() {
  return (
    <div className="public-container promo-insta-wrap">
      <a
        className="promo-band promo-insta"
        href={INSTA_QURAN_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="اپلیکیشن اینستا قرآن — ورود به اینستا قرآن"
      >
        <span className="promo-insta-body">
          <span className="promo-kicker promo-kicker-olive">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 6.5C12 6.5 10 4.5 4.5 4.5V18c5.5 0 7.5 2 7.5 2s2-2 7.5-2V4.5C14 4.5 12 6.5 12 6.5Z" />
              <path d="M12 6.5v13.5" />
            </svg>
            اپلیکیشن همراه قرآنی
          </span>
          <strong className="promo-insta-title">
            اینستا قرآن
            <span className="promo-insta-title-underline" aria-hidden="true" />
          </strong>
          <span className="promo-insta-sub">
            قرآن در جیب شما؛ هر روز یک صفحه، با یادآوری، علامت‌گذاری و انگیزهٔ پیوسته.
          </span>
          <span className="promo-cta promo-cta-olive">
            ورود به اینستا قرآن
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="m11 6-6 6 6 6" />
            </svg>
          </span>
        </span>
        <span className="promo-insta-art" aria-hidden="true">
          <img src="/banners/insta-quran.png" alt="" loading="lazy" />
        </span>
        <span className="promo-shine" aria-hidden="true" />
      </a>
    </div>
  );
}
