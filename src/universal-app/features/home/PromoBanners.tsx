/*
 * بنرهای تبلیغاتی خانهٔ اپ — v1.12.0 (هم‌ترازی قاعدهٔ ① با وب)
 *   ۱) بالای خانه: «منافسه» — monafeseh.ir
 *   ۲) وسط خانه (بعد از خدمات پرکاربرد): «اینستا قرآن»
 * کل بنر لینک است (تب جدید)، گوشه‌ها مربع، دوزبانه با L() و تصویر با
 * resolveAssetUrl تا در WebView بومی هم درست بارگذاری شود.
 */

import { resolveAssetUrl } from "../../platform/asset";
import { Icon } from "../../ui/Icon";
import { useAppearance } from "../../ui/appearance";
import { colors, typography } from "../../ui/theme";

export const MONAFESEH_URL = "https://monafeseh.ir";
export const INSTA_QURAN_URL = "https://q1uwk9k91ct0-d.space-z.ai";

const SQUARE = 0; /* قاعدهٔ کارت مربع */

export function PromoBannerMonafeseh({ wide }: { wide?: boolean }) {
  const { L } = useAppearance();
  return (
    <a
      href={MONAFESEH_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="سکوی مسابقات قرآنی منافسه — ورود به monafeseh.ir"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: wide ? "row" : "column-reverse",
        alignItems: "stretch",
        minHeight: wide ? 148 : 168,
        borderRadius: SQUARE,
        overflow: "hidden",
        textDecoration: "none",
        background: "linear-gradient(115deg, #1d2409 0%, #2e3622 55%, #3c472b 100%)",
        boxShadow: "0 10px 26px rgba(29,36,9,.28), inset 0 -1px 0 rgba(191,149,64,.35)",
        isolation: "isolate",
      }}
    >
      {/* هنر پس‌زمینه — همیشه پوشاننده؛ سمت متن پوشش تیره می‌گیرد */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          background: `url("${resolveAssetUrl("/banners/monafeseh.png")}") center/cover no-repeat`,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            wide === false
              ? "linear-gradient(to top, rgba(24,30,10,.96) 34%, rgba(24,30,10,.78) 66%, rgba(24,30,10,.3) 100%)"
              : "linear-gradient(to left, rgba(24,30,10,.96) 32%, rgba(24,30,10,.72) 62%, rgba(24,30,10,.14) 100%)",
        }}
      />
      <span
        style={{
          position: "relative",
          zIndex: 2,
          flex: "1 1 auto",
          minWidth: 0,
          display: "grid",
          gap: 7,
          alignContent: "center",
          padding: wide ? "18px 24px" : "18px 18px 16px",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            width: "fit-content",
            padding: "5px 12px",
            borderRadius: 999,
            ...typography.caption,
            fontWeight: 800,
            color: colors.goldSoft,
            background: "rgba(191,149,64,.16)",
            border: "1px solid rgba(191,149,64,.4)",
          }}
        >
          <Icon name="award" size={14} />
          {L("سکوی رسمی مسابقات قرآنی وُدّا")}
        </span>
        <strong
          style={{
            fontSize: wide ? 34 : 28,
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: .5,
            color: "#e7d5a8",
            textShadow: "0 2px 16px rgba(191,149,64,.3)",
          }}
        >
          مُنافَسه
        </strong>
        <span
          style={{
            ...typography.caption,
            lineHeight: 1.8,
            color: "rgba(247,239,217,.85)",
            maxWidth: 420,
          }}
        >
          {L("رقابت قرآنی آنلاین؛ شرکت در مسابقات، بالا بردن سطح و شانس جوایز.")}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            width: "fit-content",
            marginTop: 5,
            padding: "10px 20px",
            borderRadius: 999,
            fontSize: 13.5,
            fontWeight: 900,
            lineHeight: 1,
            color: "#2a2415",
            background: "linear-gradient(115deg,#f2dfae 0%,#e0bf6d 45%,#bf9540 100%)",
            boxShadow: "0 6px 16px rgba(191,149,64,.42), inset 0 1px 0 rgba(255,255,255,.5)",
          }}
        >
          {L("همین حالا وارد شوید")}
          <Icon name="arrowL" size={15} />
        </span>
      </span>
      {wide ? (
        <span
          aria-hidden="true"
          style={{
            position: "relative",
            zIndex: 1,
            flex: "0 0 34%",
            minWidth: 150,
            background: `url("${resolveAssetUrl("/banners/monafeseh.png")}") center/cover no-repeat`,
            borderInlineStart: "1px solid rgba(191,149,64,.35)",
          }}
        />
      ) : null}
    </a>
  );
}

export function PromoBannerInstaQuran({ wide }: { wide?: boolean }) {
  const { L } = useAppearance();
  return (
    <a
      href={INSTA_QURAN_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="اپلیکیشن اینستا قرآن — ورود به اینستا قرآن"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: wide ? "row" : "column",
        gap: wide ? 20 : 12,
        padding: wide ? 20 : 16,
        borderRadius: SQUARE,
        overflow: "hidden",
        textDecoration: "none",
        background: "linear-gradient(120deg,#fffdf7 0%,#f7efd9 58%,#f2e6c8 100%)",
        border: "1.5px solid rgba(231,213,168,.9)",
        boxShadow: "0 10px 26px rgba(46,54,34,.12), inset 0 0 0 4px rgba(255,255,255,.55)",
        isolation: "isolate",
      }}
    >
      {/* گوشه‌های قاب طلایی (حاشیهٔ مصحف‌گونه) */}
      <span aria-hidden="true" style={{ position: "absolute", top: 6, insetInlineStart: 6, width: 22, height: 22, borderTop: "2.5px solid " + colors.gold, borderInlineStart: "2.5px solid " + colors.gold, zIndex: 2 }} />
      <span aria-hidden="true" style={{ position: "absolute", bottom: 6, insetInlineEnd: 6, width: 22, height: 22, borderBottom: "2.5px solid " + colors.gold, borderInlineEnd: "2.5px solid " + colors.gold, zIndex: 2 }} />

      {wide ? (
        <span
          aria-hidden="true"
          style={{
            display: "block",
            flex: "0 0 30%",
            minWidth: 140,
            borderRadius: SQUARE,
            overflow: "hidden",
            border: "1.5px solid rgba(231,213,168,.9)",
            boxShadow: "0 8px 18px rgba(46,54,34,.16)",
            background: `url("${resolveAssetUrl("/banners/insta-quran.png")}") center/cover no-repeat`,
          }}
        />
      ) : (
        <span
          aria-hidden="true"
          style={{
            display: "block",
            height: 140,
            borderRadius: SQUARE,
            overflow: "hidden",
            border: "1.5px solid rgba(231,213,168,.9)",
            boxShadow: "0 8px 18px rgba(46,54,34,.16)",
            background: `url("${resolveAssetUrl("/banners/insta-quran.png")}") center/cover no-repeat`,
          }}
        />
      )}

      <span
        style={{
          position: "relative",
          zIndex: 2,
          flex: "1 1 auto",
          minWidth: 0,
          display: "grid",
          gap: 7,
          alignContent: "center",
          paddingInlineEnd: 14,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            width: "fit-content",
            padding: "5px 12px",
            borderRadius: 999,
            ...typography.caption,
            fontWeight: 800,
            color: colors.olive700,
            background: "rgba(242,245,234,.9)",
            border: "1px solid " + colors.olive200,
          }}
        >
          <Icon name="quran" size={14} />
          {L("اپلیکیشن همراه قرآنی")}
        </span>
        <strong style={{ fontSize: wide ? 30 : 25, fontWeight: 900, lineHeight: 1.2, color: colors.olive800 }}>
          {L("اینستا قرآن")}
        </strong>
        <span style={{ ...typography.caption, lineHeight: 1.8, color: colors.inkSecondary, maxWidth: 400 }}>
          {L("قرآن در جیب شما؛ هر روز یک صفحه، با یادآوری و انگیزهٔ پیوسته.")}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            width: "fit-content",
            marginTop: 5,
            padding: "10px 20px",
            borderRadius: 999,
            fontSize: 13.5,
            fontWeight: 900,
            lineHeight: 1,
            color: "#f7f4e8",
            background: "linear-gradient(115deg,#5e6e43 0%,#4c5a36 55%,#3c472b 100%)",
            boxShadow: "0 6px 16px rgba(76,90,54,.38), inset 0 1px 0 rgba(255,255,255,.18)",
          }}
        >
          {L("ورود به اینستا قرآن")}
          <Icon name="arrowL" size={15} />
        </span>
      </span>
    </a>
  );
}
