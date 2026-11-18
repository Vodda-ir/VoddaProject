// ارجاع مرورگر به درگاه سامان‌سپ — پورت دقیق جریان منافسه
// (src/components/noorcraft/views/buy-credits-view.tsx):
//
// توکن بانک در پاسخ JSON سرور به خریدار داده می‌شود و مرورگر خودِ کاربر فرم
// POST با فیلد «Token» را به OnlinePG در همان تب ارسال می‌کند تا در مرورگر
// موبایل و وب‌ویو اپ هم به‌درستی باز شود. طبق مستندات سپ، ریدایرکت GET با
// ‎?token=‎ کار نمی‌کند و توکن هرگز نباید در URL جابه‌جا شود.
export const SAMAN_ONLINEPG_URL = "https://sep.shaparak.ir/OnlinePG/OnlinePG";

export function payViaSamanGate(token: string): void {
  const clean = typeof token === "string" ? token.trim() : "";
  if (!clean) throw new Error("توکن درگاه پرداخت دریافت نشد.");
  const form = document.createElement("form");
  form.method = "POST";
  form.action = SAMAN_ONLINEPG_URL;
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "Token";
  input.value = clean;
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}
