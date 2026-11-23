/*
 * بنرهای تبلیغاتی صفحهٔ اصلی وب — v1.13.0 (بازطراحی «کارت‌محور» — هم‌ترازی قاعدهٔ ① با اپ)
 * هر دو بنر دقیقاً با آناتومی کارت‌های اپ هم‌خوان‌اند: گوشهٔ گرد ۲۲، حاشیهٔ طلایی نازک،
 * سایهٔ عمیق با هالهٔ طلایی، قاب هنرِ گردِ داخلی (radius ۱۳)؛ اندازهٔ یکسان و فقط تم رنگی متفاوت:
 *   ۱) بالای صفحه: «منافسه» — تم زیتونی برند (monafeseh.ir)
 *   ۲) وسط صفحه: «اینستا قرآن» — تم کِرِم روشن
 * کل بنر یک لینک است (کلیک در تب جدید) و انیمیشن‌ها با prefers-reduced-motion خاموش می‌شوند.
 */

export const MONAFESEH_URL = 'https://monafeseh.ir';
export const INSTA_QURAN_URL = 'https://q1uwk9k91ct0-d.space-z.ai';

function PromoCard({
  className,
  href,
  aria,
  image,
  imageAlt,
  kickerIcon,
  kicker,
  title,
  desc,
  cta,
}: {
  className: string;
  href: string;
  aria: string;
  image: string;
  imageAlt: string;
  kickerIcon: 'award' | 'quran';
  kicker: string;
  title: string;
  desc: string;
  cta: string;
}) {
  return (
    <a className={`promo-card ${className}`} href={href} target="_blank" rel="noopener noreferrer" aria-label={aria}>
      <span className="promo-art" aria-hidden="true">
        <img src={image} alt={imageAlt} loading="lazy" />
      </span>
      <span className="promo-body">
        <span className="promo-kicker">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {kickerIcon === 'award' ? (
              <>
                <circle cx="12" cy="9" r="5" />
                <path d="m8.5 13.5-1.5 6 5-2.5 5 2.5-1.5-6" />
              </>
            ) : (
              <>
                <path d="M12 6.5C12 6.5 10 4.5 4.5 4.5V18c5.5 0 7.5 2 7.5 2s2-2 7.5-2V4.5C14 4.5 12 6.5 12 6.5Z" />
                <path d="M12 6.5v13.5" />
              </>
            )}
          </svg>
          {kicker}
        </span>
        <strong className="promo-title">{title}</strong>
        <span className="promo-desc">{desc}</span>
        <span className="promo-cta">
          {cta}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <path d="m11 6-6 6 6 6" />
          </svg>
        </span>
      </span>
    </a>
  );
}

export function MonafesehPromoBanner() {
  return (
    <PromoCard
      className="promo-mona"
      href={MONAFESEH_URL}
      aria="سکوی مسابقات قرآنی منافسه — ورود به monafeseh.ir"
      image="/banners/monafeseh.png"
      imageAlt="تندیس طلایی منافسه"
      kickerIcon="award"
      kicker="مسابقات قرآنی وُدّا"
      title="مُنافَسه"
      desc="رقابت قرآنی آنلاین؛ شرکت در مسابقات، بالا بردن سطح و شانس جوایز."
      cta="همین حالا وارد شوید"
    />
  );
}

export function InstaQuranPromoBanner() {
  return (
    <PromoCard
      className="promo-insta"
      href={INSTA_QURAN_URL}
      aria="اپلیکیشن اینستا قرآن — ورود به اینستا قرآن"
      image="/banners/insta-quran.png"
      imageAlt="گوشی همراه با صفحهٔ نورانی قرآن"
      kickerIcon="quran"
      kicker="اپلیکیشن همراه قرآنی"
      title="اینستا قرآن"
      desc="قرآن در جیب شما؛ هر روز یک صفحه، با یادآوری و انگیزهٔ پیوسته."
      cta="ورود به اینستا قرآن"
    />
  );
}
