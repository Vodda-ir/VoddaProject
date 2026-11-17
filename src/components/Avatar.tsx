/*
 * Avatar واحد وُدّا — تنها منبع رندر تصویر پروفایل در اپ (universal-app) و وب (panel).
 *
 * قواعد ثابت هویت:
 *  - آواتار همیشه مربعی زیبا با گوشهٔ نرم است: borderRadius ثابت ۱۴٪ عرض — هرگز دایره نیست.
 *  - نسبت تصویر ۱:۱ با object-fit: cover.
 *  - fallback: حرف اول نام روی گرادیان زیتونی-طلایی (محاسبهٔ حرف اول فقط داخل همین کامپوننت).
 *  - مهر درجه استاد (تیک): گوشهٔ پایین-راست در RTL و پایین-چپ در LTR (insetInlineEnd).
 *  - چراغ آنلاین: گوشهٔ بالا-راست در RTL و بالا-چپ در LTR.
 *
 * این فایل عمداً بدون وابستگی به Next.js و بدون alias است تا هم در Next (وب) و
 * هم در بیلد Vite/Capacitor (اپ نیتیو) با مسیر نسبی به کار برود — پارتی کامل.
 */
import type { CSSProperties, ImgHTMLAttributes } from "react";

/** توکن‌های رنگ مشترک هویت — هم‌ارز پالت برند وُدّا (اپ و وب). */
const OLIVE_100 = "#e8ecdb";
const OLIVE_200 = "#d6dcc4";
const OLIVE_600 = "#5e6e43";
const OLIVE_700 = "#4c5a36";
const GOLD_BACKGROUND = "#f7efd9";
const GOLD_DARK = "#8b681f";
const TEAL_GRAY = "#5e7e8c";
const SURFACE = "#ffffff";
const DANGER = "#a65151";

/** اندازه‌های استاندارد آواتار. */
export const AVATAR_SIZES = { sm: 32, md: 48, lg: 72, xl: 120 } as const;
export type AvatarSizeKey = keyof typeof AVATAR_SIZES;

/** مهر درجه — رنگ‌ها تا مورد ۱.الف.۲ (تیک آبی/سبز/قرمز) بدون تغییر می‌مانند. */
const TIER_SEALS: Record<string, { color: string; label: string }> = {
  international: { color: GOLD_DARK, label: "استاد بین‌المللی (درجه ۱)" },
  grade2: { color: OLIVE_700, label: "استاد درجه ۲" },
  grade3: { color: TEAL_GRAY, label: "استاد درجه ۳" },
};

/** شعاع گوشهٔ آواتار مربعی: ۱۴٪ عرض با کف ۶px (مثال مشخصات: ۵۶px → ۸px). */
export function avatarCornerRadius(size: number): number {
  return Math.max(6, Math.round(size * 0.14));
}

/** حرف اول نام برای fallback — تنها نقطهٔ محاسبه در کل کد. */
export function avatarInitialLetter(name?: string | null): string {
  const firstWord = name?.trim().split(/\s+/).filter(Boolean)[0];
  return firstWord?.charAt(0) || "و";
}

export type AvatarProps = {
  /** آدرس تصویر (امضای اپ). */
  src?: string;
  /** آدرس تصویر (امضای قدیمی وب — معادل src). */
  imageUrl?: string;
  /** اندازه: کلید استاندارد یا عدد پیکسل. */
  size?: number | AvatarSizeKey;
  /** نام برای fallback حرف اول. */
  name?: string;
  /** درجه استاد برای مهر گوشهٔ آواتار. */
  tier?: string | null;
  /** چراغ آنلاین/آفلاین (استایل پایه در این مورد؛ چشمک‌زن در مورد ۱.الف.۴). */
  online?: boolean;
  /** قاب حلقه‌ای ملایم (سازگاری با امضای فعلی اپ و وب). */
  ring?: boolean;
  /** fallback اموجی (سازگاری با امضای قدیمی وب). */
  emoji?: string;
  alt?: string;
  style?: CSSProperties;
} & Omit<ImgHTMLAttributes<HTMLImageElement>, "children" | "src" | "alt" | "width" | "height" | "style">;

function TierSealMark({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill={color}
        d="M10.067.87a2.89 2.89 0 0 0-4.134 0l-.622.638-.89-.113a2.89 2.89 0 0 0-3.494 3.482l.114.89-.637.622a2.89 2.89 0 0 0 0 4.134l.637.622-.114.89a2.89 2.89 0 0 0 3.494 3.494l.89-.114.622.637a2.89 2.89 0 0 0 4.134 0l.622-.638.89.114a2.89 2.89 0 0 0 3.494-3.494l-.114-.891.637-.622a2.89 2.89 0 0 0 0-4.134l-.637-.622.114-.89a2.89 2.89 0 0 0-3.494-3.494l-.89.114-.622-.637z"
      />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5.2 8.2 1.9 1.9 3.5-4"
      />
    </svg>
  );
}

export function Avatar({
  src,
  imageUrl,
  size = 48,
  name,
  tier,
  online,
  ring = false,
  emoji,
  alt,
  style,
  ...imgProps
}: AvatarProps) {
  const resolvedSize = typeof size === "number" ? size : AVATAR_SIZES[size];
  const radius = avatarCornerRadius(resolvedSize);
  const image = src ?? imageUrl;
  const seal = tier ? TIER_SEALS[tier] : undefined;
  const sealSize = Math.max(14, Math.round(resolvedSize * 0.3));
  const letter = avatarInitialLetter(name);

  const frameStyle: CSSProperties = {
    width: resolvedSize,
    height: resolvedSize,
    aspectRatio: "1 / 1",
    borderRadius: radius,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    boxSizing: "border-box",
    background: image
      ? OLIVE_100
      : `linear-gradient(145deg, ${OLIVE_100} 0%, ${GOLD_BACKGROUND} 100%)`,
    boxShadow: ring ? `0 0 0 3px ${SURFACE}, 0 0 0 4.5px ${OLIVE_200}, 0 2px 8px rgba(46,54,34,.055)` : undefined,
  };

  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        flex: `0 0 ${resolvedSize}px`,
        width: resolvedSize,
        height: resolvedSize,
        ...style,
      }}
    >
      <span style={frameStyle}>
        {image ? (
          <img
            {...imgProps}
            src={image}
            alt={alt ?? name ?? "تصویر کاربر"}
            loading={imgProps.loading ?? "lazy"}
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : emoji ? (
          <span aria-hidden="true" style={{ fontSize: Math.round(resolvedSize * 0.45), lineHeight: 1 }}>
            {emoji}
          </span>
        ) : (
          <span
            role="img"
            aria-label={alt ?? name ?? "کاربر وُدّا"}
            style={{
              fontSize: Math.max(12, Math.round(resolvedSize * 0.36)),
              fontWeight: 900,
              lineHeight: 1,
              color: GOLD_DARK,
            }}
          >
            {letter}
          </span>
        )}
      </span>

      {/* چراغ آنلاین — بالا-راست در RTL، بالا-چپ در LTR (استایل نهایی در مورد ۱.الف.۴) */}
      {typeof online === "boolean" ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -2,
            insetInlineStart: -2,
            width: 8,
            height: 8,
            borderRadius: "50%",
            border: `2px solid ${SURFACE}`,
            background: online ? OLIVE_600 : DANGER,
          }}
        />
      ) : null}

      {/* مهر درجه استاد — پایین-راست در RTL، پایین-چپ در LTR */}
      {seal ? (
        <span
          role="img"
          aria-label={seal.label}
          title={seal.label}
          style={{
            position: "absolute",
            bottom: -2,
            insetInlineStart: -2,
            width: sealSize,
            height: sealSize,
            display: "grid",
            placeItems: "center",
            borderRadius: Math.max(5, Math.round(sealSize * 0.3)),
            border: `2px solid ${SURFACE}`,
            background: SURFACE,
          }}
        >
          <TierSealMark color={seal.color} size={sealSize - 5} />
        </span>
      ) : null}
    </span>
  );
}
