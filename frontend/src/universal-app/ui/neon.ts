import type { CSSProperties } from "react";

/* ═════════ خانوادهٔ نئونی وُدّا ═════════
 * زبان بصری مشترک کادرهای نئونی طلایی (صفحهٔ نخست: کادر موضوعات اصلی،
 * صفحهٔ دسته: شبکهٔ زیردسته‌ها). خط جداکنندهٔ سلول‌ها — افقی/عمودی،
 * محو در دو سر + هالهٔ طلایی. ویژگی‌ها منطقی (inline) هستند تا در
 * RTL و LTR هر دو درست بنشینند. */

export function neonDivider(vertical: boolean): CSSProperties {
  return {
    position: "absolute",
    pointerEvents: "none",
    ...(vertical
      ? {
          insetInlineEnd: 0,
          top: "16%",
          bottom: "16%",
          width: 1.5,
          background:
            "linear-gradient(180deg, transparent, rgba(191,149,64,.85) 18%, rgba(216,184,105,1) 50%, rgba(191,149,64,.85) 82%, transparent)",
        }
      : {
          bottom: 0,
          insetInlineStart: "12%",
          insetInlineEnd: "12%",
          height: 1.5,
          background:
            "linear-gradient(90deg, transparent, rgba(191,149,64,.85) 18%, rgba(216,184,105,1) 50%, rgba(191,149,64,.85) 82%, transparent)",
        }),
    boxShadow: "0 0 5px rgba(191,149,64,.45), 0 0 12px rgba(216,184,105,.28)",
  };
}

/* پس‌زمینهٔ سلول فعال در شبکه‌های نئونی — ته‌رنگ طلایی خیلی ملایم */
export const neonCellActiveBackground =
  "linear-gradient(150deg, rgba(191,149,64,.10), rgba(191,149,64,.04))";

/* حلقهٔ نئونی استاتیک برای کارت‌ها — برادر کوچک‌ترِ کادرهای نئونی؛
 * برای کارت‌های عادی (بدون انیمیشن تنفس). کارت‌های ویژه (درجهٔ ۱) کلاس
 * vodda-neon-gold را می‌گیرند که نسخهٔ نفس‌کشندهٔ همین زبان است. */
export function neonRingStyle(borderRadius = 20): CSSProperties {
  return {
    border: "1.4px solid rgba(191,149,64,.55)",
    borderRadius,
    boxShadow:
      "0 0 0 1px rgba(216,184,105,.22), 0 10px 24px rgba(46,54,34,.10), 0 0 14px rgba(191,149,64,.16)",
  };
}
