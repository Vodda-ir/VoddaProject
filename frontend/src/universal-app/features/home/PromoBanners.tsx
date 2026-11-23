/*
 * بنرهای تبلیغاتی خانهٔ اپ — v1.13.0 (بازطراحی «کارت‌محور»)
 * هر دو بنر دقیقاً با آناتومی کارت‌های خانهٔ اپ هم‌خوان‌اند:
 *   • گوشهٔ گرد ۲۲ (همان radius صحنهٔ «خدمات پرکاربرد»)
 *   • حاشیهٔ طلایی نازک + سایهٔ عمیق با هالهٔ طلایی (همان توکن‌های صحنهٔ اپ)
 *   • قاب هنرِ گردِ داخلی (radius ۱۳ — همان کاشی آیکون‌های دسته‌بندی)
 * اندازهٔ هر دو یکسان است؛ فقط تم رنگی متفاوت:
 *   • منافسه → تم زیتونی برند (gradients.hero + هالهٔ طلایی)
 *   • اینستا قرآن → تم کِرِم (gradients.goldPanel)
 * کل بنر لینک است (تب جدید)، دوزبانه با L() و تصویر با resolveAssetUrl.
 */

import type { ReactNode } from "react";

import { resolveAssetUrl } from "../../platform/asset";
import { Icon } from "../../ui/Icon";
import { useAppearance } from "../../ui/appearance";
import { colors, gradients, typography } from "../../ui/theme";

export const MONAFESEH_URL = "https://monafeseh.ir";
export const INSTA_QURAN_URL = "https://preview-chat-8d9d0049-b33e-43c9-8644-eee736709d6d.space-z.ai";

/* ─── توکن‌های مشترک هر دو بنر (هم‌اندازگی کامل) ─── */
const CARD_RADIUS = 22;          /* همان گوشهٔ کارت‌های اپ */
const ART_RADIUS = 13;           /* همان گوشهٔ قاب آیکون‌های دسته‌بندی */
const GOLD_BORDER = "1px solid rgba(216,184,105,.55)"; /* حاشیهٔ صحنهٔ خدمات */
const GAP = 12;

type PromoTheme = {
  background: string;
  boxShadow: string;
  kickerBg: string;
  kickerBorder: string;
  kickerColor: string;
  titleColor: string;
  titleShadow?: string;
  descColor: string;
  ctaBackground: string;
  ctaColor: string;
  ctaShadow: string;
  artBorder: string;
  artShadow: string;
};

const MONA_THEME: PromoTheme = {
  background: gradients.hero,
  boxShadow: "0 18px 40px rgba(46,54,34,.30), 0 0 20px rgba(191,149,64,.22)",
  kickerBg: "rgba(191,149,64,.16)",
  kickerBorder: "rgba(191,149,64,.4)",
  kickerColor: colors.goldSoft,
  titleColor: "#e7d5a8",
  titleShadow: "0 2px 14px rgba(191,149,64,.35)",
  descColor: "rgba(247,239,217,.88)",
  ctaBackground: gradients.goldRich,
  ctaColor: "#2a2415",
  ctaShadow: "0 6px 16px rgba(191,149,64,.42), inset 0 1px 0 rgba(255,255,255,.45)",
  artBorder: "1px solid rgba(231,213,168,.65)",
  artShadow: "0 8px 18px rgba(30,36,18,.32)",
};

const INSTA_THEME: PromoTheme = {
  background: gradients.goldPanel,
  boxShadow: "0 18px 40px rgba(46,54,34,.12), 0 0 20px rgba(191,149,64,.14)",
  kickerBg: colors.olive50,
  kickerBorder: colors.olive100,
  kickerColor: colors.olive700,
  titleColor: colors.olive800,
  descColor: colors.inkSecondary,
  ctaBackground: gradients.oliveBtn,
  ctaColor: "#f7f4e8",
  ctaShadow: "0 6px 16px rgba(76,90,54,.35), inset 0 1px 0 rgba(255,255,255,.22)",
  artBorder: "1px solid rgba(216,184,105,.65)",
  artShadow: "0 8px 18px rgba(46,54,34,.16)",
};

function PromoCard({
  href,
  aria,
  image,
  imageAlt,
  icon,
  kicker,
  title,
  desc,
  cta,
  theme,
  halos,
  wide,
}: {
  href: string;
  aria: string;
  image: string;
  imageAlt: string;
  icon: "award" | "quran";
  kicker: string;
  title: string;
  desc: string;
  cta: string;
  theme: PromoTheme;
  halos: ReactNode;
  wide?: boolean;
}) {
  const { L } = useAppearance();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={aria}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "row",
        gap: GAP,
        padding: 12,
        minHeight: wide ? 148 : 168,
        borderRadius: CARD_RADIUS,
        overflow: "hidden",
        textDecoration: "none",
        background: theme.background,
        border: GOLD_BORDER,
        boxShadow: theme.boxShadow,
        isolation: "isolate",
        minWidth: 0,
      }}
    >
      {halos}

      {/* قاب هنر — گوشهٔ گرد ۱۳، در سمت آغازین (راست در RTL) */}
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          zIndex: 1,
          flex: `0 0 ${wide ? "30%" : "44%"}`,
          borderRadius: ART_RADIUS,
          overflow: "hidden",
          border: theme.artBorder,
          boxShadow: theme.artShadow,
          background: `url("${resolveAssetUrl(image)}") center/cover no-repeat`,
          minHeight: 120,
        }}
      >
        <img
          src={resolveAssetUrl(image)}
          alt={imageAlt}
          loading="lazy"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      </span>

      {/* بدنه */}
      <span
        style={{
          position: "relative",
          zIndex: 2,
          flex: "1 1 auto",
          minWidth: 0,
          display: "grid",
          alignContent: "center",
          gap: 7,
          paddingInlineEnd: 4,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            width: "fit-content",
            maxWidth: "100%",
            padding: "4px 11px",
            borderRadius: 999,
            ...typography.caption,
            fontSize: wide ? 12.5 : 11,
            fontWeight: 800,
            color: theme.kickerColor,
            background: theme.kickerBg,
            border: `1px solid ${theme.kickerBorder}`,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <Icon name={icon} size={13} />
          {L(kicker)}
        </span>

        <strong
          style={{
            fontSize: wide ? 28 : 24,
            fontWeight: 900,
            lineHeight: 1.2,
            color: theme.titleColor,
            textShadow: theme.titleShadow,
          }}
        >
          {title}
        </strong>

        <span
          style={{
            ...typography.caption,
            fontSize: wide ? 12.5 : 11,
            lineHeight: 1.75,
            color: theme.descColor,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {L(desc)}
        </span>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            width: "fit-content",
            marginTop: 4,
            padding: "9px 18px",
            borderRadius: 999,
            fontSize: wide ? 13.5 : 12.5,
            fontWeight: 900,
            lineHeight: 1,
            whiteSpace: "nowrap",
            color: theme.ctaColor,
            background: theme.ctaBackground,
            boxShadow: theme.ctaShadow,
          }}
        >
          {L(cta)}
          <Icon name="arrowL" size={14} />
        </span>
      </span>
    </a>
  );
}

/* هاله‌های تزئینی منافسه — همان زبان صحنهٔ خدمات پرکاربرد */
const MonaHalos = () => (
  <>
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        top: -46,
        insetInlineStart: -40,
        width: 170,
        height: 170,
        borderRadius: "50%",
        zIndex: 0,
        background: "radial-gradient(circle, rgba(216,184,105,.30), transparent 70%)",
      }}
    />
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: -52,
        insetInlineEnd: -36,
        width: 190,
        height: 190,
        borderRadius: "50%",
        zIndex: 0,
        background: "radial-gradient(circle, rgba(214,220,196,.22), transparent 70%)",
      }}
    />
  </>
);

/* هالهٔ ملایم کِرِم اینستا قرآن */
const InstaHalos = () => (
  <>
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        top: -44,
        insetInlineEnd: -36,
        width: 160,
        height: 160,
        borderRadius: "50%",
        zIndex: 0,
        background: "radial-gradient(circle, rgba(216,184,105,.20), transparent 70%)",
      }}
    />
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: -48,
        insetInlineStart: -34,
        width: 170,
        height: 170,
        borderRadius: "50%",
        zIndex: 0,
        background: "radial-gradient(circle, rgba(231,213,168,.24), transparent 70%)",
      }}
    />
  </>
);

export function PromoBannerMonafeseh({ wide }: { wide?: boolean }) {
  return (
    <PromoCard
      href={MONAFESEH_URL}
      aria="سکوی مسابقات قرآنی منافسه — ورود به monafeseh.ir"
      image="/banners/monafeseh.png"
      imageAlt="تندیس طلایی منافسه"
      icon="award"
      kicker="مسابقات قرآنی وُدّا"
      title="مُنافَسه"
      desc="رقابت قرآنی آنلاین؛ شرکت در مسابقات، بالا بردن سطح و شانس جوایز."
      cta="همین حالا وارد شوید"
      theme={MONA_THEME}
      halos={<MonaHalos />}
      wide={wide}
    />
  );
}

export function PromoBannerInstaQuran({ wide }: { wide?: boolean }) {
  return (
    <PromoCard
      href={INSTA_QURAN_URL}
      aria="اپلیکیشن اینستا قرآن — ورود به اینستا قرآن"
      image="/banners/insta-quran.png"
      imageAlt="گوشی همراه با صفحهٔ نورانی قرآن"
      icon="quran"
      kicker="اپلیکیشن همراه قرآنی"
      title="اینستا قرآن"
      desc="قرآن در جیب شما؛ هر روز یک صفحه، با یادآوری و انگیزهٔ پیوسته."
      cta="ورود به اینستا قرآن"
      theme={INSTA_THEME}
      halos={<InstaHalos />}
      wide={wide}
    />
  );
}
