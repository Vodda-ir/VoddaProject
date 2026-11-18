"use client";

import { useEffect, useState } from "react";
import { colors, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";

export type PaymentResultState = "success" | "verify" | "failed" | null;

type BannerTone = {
  background: string;
  border: string;
  text: string;
  glyph: string;
};

const TONES: Record<"success" | "verify" | "failed", BannerTone> = {
  success: { background: colors.successBackground, border: colors.success, text: colors.olive800, glyph: "✓" },
  verify: { background: colors.goldBackground, border: colors.gold, text: colors.goldDark, glyph: "i" },
  failed: { background: colors.dangerBackground, border: colors.danger, text: colors.danger, glyph: "✕" },
};

const LABELS: Record<"success" | "verify" | "failed", string> = {
  success: "پرداخت با موفقیت انجام شد؛ موجودی یا جلسهٔ شما به‌روز شد.",
  verify: "پرداخت شما ثبت شد و در انتظار تأیید نهایی بانک است؛ وضعیت به‌زودی به‌روز می‌شود.",
  failed: "پرداخت ناموفق بود یا لغو شد. اگر مبلغ از حساب شما کسر شده باشد، طی ۷۲ ساعت به‌صورت خودکار برمی‌گردد.",
};

/**
 * نتیجهٔ برگشت از درگاه سامان را از کوئری‌استرینگ ‎(?payment=&ref=)‎ می‌خواند.
 * پس از نمایش، پارامترها از URL پاک می‌شوند تا رفرشِ بعدی وضعیتِ کهنه نشان
 * ندهد؛ خود بنر تا بستنِ کاربر باقی می‌ماند.
 */
export function PaymentResultBanner() {
  const { L } = useAppearance();
  const [state, setState] = useState<PaymentResultState>(null);
  const [refNum, setRefNum] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = new URLSearchParams(window.location.search);
    const payment = search.get("payment");
    if (!payment) return;
    setState(payment === "success" ? "success" : payment === "verify" ? "verify" : "failed");
    setRefNum((search.get("ref") ?? "").trim());

    // پارامترهای نتیجه را از URL پاک کن تا وضعیت پرداخت در رفرش‌های بعدی
    // دوباره ظاهر نشود (بدون reload).
    search.delete("payment");
    search.delete("ref");
    const rest = search.toString();
    const cleanedUrl = `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", cleanedUrl);
  }, []);

  if (!state) return null;

  const tone = TONES[state];
  return (
    <div
      role={state === "failed" ? "alert" : "status"}
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "13px 15px",
        borderRadius: 14,
        border: `1px solid ${tone.border}`,
        background: tone.background,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          width: 22,
          height: 22,
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 900,
          color: colors.onOlive,
          background: tone.border,
        }}
      >
        {tone.glyph}
      </span>
      <div style={{ display: "grid", gap: 4, flex: 1, minWidth: 0 }}>
        <p style={{ ...typography.bodySmall, margin: 0, color: tone.text, fontWeight: 700 }}>
          {L(LABELS[state])}
        </p>
        {refNum ? (
          <p style={{ ...typography.caption, margin: 0, color: tone.text, opacity: 0.85 }}>
            {L("شماره پیگیری بانک:")} <span dir="ltr">{refNum}</span>
          </p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={L("بستن پیام نتیجه پرداخت")}
        onClick={() => setState(null)}
        style={{
          flex: "0 0 auto",
          border: "none",
          background: "transparent",
          color: tone.text,
          fontSize: 17,
          lineHeight: 1,
          cursor: "pointer",
          padding: 2,
        }}
      >
        ✕
      </button>
    </div>
  );
}
