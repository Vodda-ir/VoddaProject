const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function toLatinDigits(value: string | number): string {
  return String(value)
    .replace(/[۰-۹]/g, (digit) => String(FA_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(AR_DIGITS.indexOf(digit)));
}

export function toFaDigits(value: string | number): string {
  return toLatinDigits(value).replace(/\d/g, (digit) => FA_DIGITS[Number(digit)] ?? digit);
}

export function digitsOnly(value: string | number, maxLength?: number): string {
  const normalized = toLatinDigits(value).replace(/\D/g, "");
  return typeof maxLength === "number" ? normalized.slice(0, maxLength) : normalized;
}
