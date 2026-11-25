/*
 * بنرهای تبلیغاتی خانهٔ اپ — v1.13.1 (بازطراحی «لوگو-محور» با هویت هر برند)
 * هر بنر با حال‌وهوای تم و لوگوی خودش طراحی شده و لوگوی رسمی در قاب هنرِ
 * نسبتاً بزرگ (contain — بدون بریدن کلمه‌نگار لوگو) به نمایش درمی‌آید:
 *   • منافسه → تم تیرهٔ سلطنتی هم‌رنگ لوگو (سرمه‌ای ذغالی + طلایی + هالهٔ نئون نارنجی/آبی)
 *   • اینستا قرآن → تم روشن با ته‌رنگ گرادیان رسمی لوگو + دکمهٔ گرادیان اینستاگرامی
 * آناتومی کارت‌ها حفظ شده: گوشهٔ گرد ۲۲، قاب هنرِ گرد ۱۳، کل بنر لینک (تب جدید).
 * اصلاح متنی: عنوان «منافسه» بدون اعراب.
 */

import type { ReactNode } from "react";

import { resolveAssetUrl } from "../../platform/asset";
import { Icon } from "../../ui/Icon";
import { useAppearance, useL } from "../../ui/appearance";
import { typography } from "../../ui/theme";

export const MONAFESEH_URL = "https://monafeseh.ir";
export const INSTA_QURAN_URL = "https://preview-chat-8d9d0049-b33e-43c9-8644-eee736709d6d.space-z.ai";

/* ─── توکن‌های مشترک هر دو بنر (هم‌اندازگی کامل) ─── */
const CARD_RADIUS = 22;          /* همان گوشهٔ کارت‌های اپ */
const ART_RADIUS = 13;           /* همان گوشهٔ قاب آیکون‌های دسته‌بندی */
const GAP = 12;

type PromoTheme = {
  background: string;
  boxShadow: string;
  border: string;
  kickerBg: string;
  kickerBorder: string;
  kickerColor: string;
  titleColor: string;
  titleShadow?: string;
  descColor: string;
  ctaBackground: string;
  ctaColor: string;
  ctaShadow: string;
  ctaTextShadow?: string;
  artBg: string;
  artBorder: string;
  artShadow: string;
};

/* تم منافسه — برگرفته از لوگوی رسمی: زمینهٔ تیرهٔ سرمه‌ای/ذغالی، طلایی، هالهٔ نئون نارنجی و آبی */
const MONA_THEME: PromoTheme = {
  background: "linear-gradient(145deg, #171d29 0%, #1f2420 50%, #272114 100%)",
  boxShadow: "0 18px 40px rgba(10,14,20,.42), 0 0 22px rgba(191,149,64,.22)",
  border: "1px solid rgba(216,184,105,.55)",
  kickerBg: "rgba(191,149,64,.18)",
  kickerBorder: "rgba(191,149,64,.45)",
  kickerColor: "#edcb82",
  titleColor: "#f2cf7c",
  titleShadow: "0 2px 16px rgba(255,168,60,.38)",
  descColor: "rgba(238,229,205,.88)",
  ctaBackground: "linear-gradient(145deg, #d4ab52 0%, #bf9540 52%, #8b681f 100%)",
  ctaColor: "#241d0e",
  ctaShadow: "0 6px 16px rgba(191,149,64,.45), inset 0 1px 0 rgba(255,255,255,.45)",
  artBg: "#0e1119",
  artBorder: "1px solid rgba(231,213,168,.55)",
  artShadow: "0 8px 18px rgba(8,10,16,.48)",
};

/* تم اینستا قرآن — برگرفته از لوگوی رسمی: زمینهٔ روشن با ته‌رنگ گرادیان اینستاگرامی */
const INSTA_THEME: PromoTheme = {
  background: "linear-gradient(150deg, #fff5ea 0%, #fdeef6 48%, #edf0fe 100%)",
  boxShadow: "0 18px 40px rgba(120,60,120,.14), 0 0 20px rgba(214,36,159,.12)",
  border: "1px solid rgba(214,36,159,.26)",
  kickerBg: "rgba(214,36,159,.10)",
  kickerBorder: "rgba(214,36,159,.30)",
  kickerColor: "#b0246f",
  titleColor: "#43273c",
  descColor: "rgba(86,62,80,.88)",
  ctaBackground: "linear-gradient(135deg, #fdf497 0%, #fd5949 42%, #d6249f 62%, #285AEB 95%)",
  ctaColor: "#ffffff",
  ctaShadow: "0 6px 16px rgba(214,36,159,.42), inset 0 1px 0 rgba(255,255,255,.35)",
  ctaTextShadow: "0 1px 6px rgba(120,20,80,.35)",
  artBg: "rgba(255,255,255,.85)",
  artBorder: "1px solid rgba(214,36,159,.28)",
  artShadow: "0 8px 18px rgba(150,60,130,.20)",
};

function PromoCard({
  href,
  aria,
  logo,
  logoAlt,
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
  logo: string;
  logoAlt: string;
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
        border: theme.border,
        boxShadow: theme.boxShadow,
        isolation: "isolate",
        minWidth: 0,
      }}
    >
      {halos}

      {/* قاب لوگو — گوشهٔ گرد ۱۳، در سمت آغازین (راست در RTL)؛ لوگوی کامل با contain */}
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
          background: theme.artBg,
          minHeight: 120,
          display: "grid",
          placeItems: "center",
          padding: wide ? 14 : 10,
        }}
      >
        <img
          src={resolveAssetUrl(logo)}
          alt={logoAlt}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
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
            textShadow: theme.ctaTextShadow,
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

/* هاله‌های نئون نارنجی/آبی منافسه — بازتاب حلقهٔ نورانی لوگوی رسمی */
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
        background: "radial-gradient(circle, rgba(255,150,60,.30), transparent 70%)",
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
        background: "radial-gradient(circle, rgba(56,132,255,.26), transparent 70%)",
      }}
    />
  </>
);

/* هاله‌های ملایم صورتی/نارنجی اینستا قرآن — بازتاب گرادیان رسمی لوگو */
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
        background: "radial-gradient(circle, rgba(214,36,159,.16), transparent 70%)",
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
        background: "radial-gradient(circle, rgba(253,89,73,.14), transparent 70%)",
      }}
    />
  </>
);

export function PromoBannerMonafeseh({ wide }: { wide?: boolean }) {
  const L = useL();
  return (
    <PromoCard
      href={MONAFESEH_URL}
      aria={L("سکوی مسابقات قرآنی منافسه — ورود به monafeseh.ir")}
      logo="/banners/monafeseh-logo.webp"
      logoAlt={L("لوگوی رسمی منافسه")}
      icon="award"
      kicker={L("سکوی رسمی مسابقات قرآنی")}
      title={L("منافسه")}
      desc={L("رقابت قرآنی آنلاین؛ ثبت‌نام در مسابقات، ارتقای سطح و شانس جوایز.")}
      cta={L("همین حالا وارد شوید")}
      theme={MONA_THEME}
      halos={<MonaHalos />}
      wide={wide}
    />
  );
}

export function PromoBannerInstaQuran({ wide }: { wide?: boolean }) {
  const L = useL();
  return (
    <PromoCard
      href={INSTA_QURAN_URL}
      aria={L("اپلیکیشن اینستا قرآن — ورود به اینستا قرآن")}
      logo="/banners/insta-quran-logo.svg"
      logoAlt={L("لوگوی رسمی اینستا قرآن")}
      icon="quran"
      kicker={L("اپلیکیشن همراه قرآنی")}
      title={L("اینستا قرآن")}
      desc={L("قرآن در جیب شما؛ هر روز یک صفحه، با یادآوری و انگیزهٔ پیوسته.")}
      cta={L("ورود به اینستا قرآن")}
      theme={INSTA_THEME}
      halos={<InstaHalos />}
      wide={wide}
    />
  );
}
