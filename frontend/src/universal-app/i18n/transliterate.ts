/**
 * transliterate.ts — پشتیبانِ «هیچ متن فارسی در حالت انگلیسی دیده نشود».
 *
 * هر متن داینامیک سمت بک‌اند (نام استاد/قرآن‌آموز، عنوان خدمت، نام شهر، متن
 * اعلان‌ها و…) که معادل انگلیسی ثابتی در fragment های i18n ندارد، در حالت
 * انگلیسی با این ماژول به حروف لاتین بازنویسی می‌شود تا هیچ نویسهٔ فارسی/عربی
 * روی صفحه نماند. آیات قرآن (متن عربیِ اعراب‌دار) استثنا هستند و دست‌نخورده
 * برمی‌گردند.
 *
 * رویکرد: نگاشت نامه‌به‌نامهٔ فارسی→لاتین + جدول واژه‌های پرتکرار برای خروجی
 * خواناتر + ارقام فارسی→لاتین.
 */

import { toLatinDigits } from "../ui/persian";

/** متن فارسی/عربی؟ */
export function hasPersianScript(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/**
 * آیات و متون عربی اعراب‌دار — هرگز بازنویسی نمی‌شوند.
 * آیات ده‌ها حرکت دارند؛ متن معمولی فارسی حداکثر یک دو تا (مثل «وُدّا») پس
 * آستانهٔ ۳ حرکتِ هسته‌ای + نشانه‌های قرآنی است.
 */
const HARAKAT_CORE = /[\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652]/g;

function isQuranicText(text: string): boolean {
  const count = (text.match(HARAKAT_CORE) ?? []).length;
  return count >= 3 || /[\u06D6-\u06ED\u0670]/.test(text);
}

const HARAKAT_STRIP = /[\u064B-\u0655\u0670\u06D6-\u06ED]/g;

/** واژه‌های پرتکرار با معادل لاتین شناخته‌شده (کلیدها بدون حرکت‌اند). */
const WORD_MAP: Record<string, string> = {
  وددا: "Vodda",
  و: "va",
  قرآن: "Quran",
  قرانی: "Qurani",
  استاد: "Ostad",
  اساتید: "Ostads",
  جلسه: "Jalase",
  جلسات: "Jalasat",
  تلاوت: "Talavat",
  تجوید: "Tajvid",
  حفظ: "Hefz",
  ترتیل: "Tartil",
  روخوانی: "Rokhani",
  رایگان: "Rayegan",
  تومان: "Toman",
  آموزش: "Amuzesh",
  مراسم: "Marasem",
  مداحی: "Madahi",
  تواشیح: "Tavashih",
  اذان: "Azan",
  ختم: "Khatm",
  مجلسی: "Majlesi",
  قاری: "Qari",
  قاریان: "Qarian",
  برادران: "Baradaran",
  خواهران: "Khaharan",
};

/** حروف فارسی/عربی → لاتین (مصوت‌های کوتاه نوشته نمی‌شوند؛ و/ی با قاعدهٔ جایگاه). */
const LETTER_MAP: Record<string, string> = {
  "آ": "a",
  "ا": "a",
  "أ": "a",
  "إ": "e",
  "ٱ": "a",
  "ء": "",
  "ب": "b",
  "پ": "p",
  "ت": "t",
  "ث": "s",
  "ج": "j",
  "چ": "ch",
  "ح": "h",
  "خ": "kh",
  "د": "d",
  "ذ": "z",
  "ر": "r",
  "ز": "z",
  "ژ": "zh",
  "س": "s",
  "ش": "sh",
  "ص": "s",
  "ض": "z",
  "ط": "t",
  "ظ": "z",
  "ع": "a",
  "غ": "gh",
  "ف": "f",
  "ق": "gh",
  "ک": "k",
  "ك": "k",
  "گ": "g",
  "ل": "l",
  "م": "m",
  "ن": "n",
  "و": "o",
  "ه": "h",
  "ة": "h",
  "ی": "i",
  "ي": "i",
  "ئ": "i",
  "ؤ": "o",
};

/** الف + لام → «la» پیش از نگاشت نامه‌به‌نامه. */
const LAM_ALEF = /لا/g;

function capitalize(word: string): string {
  if (!word) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** واژهٔ فارسی تکی → لاتین. */
function transliterateWord(rawWord: string): string {
  const word = rawWord.replace(HARAKAT_STRIP, "");
  if (!word) return "";
  const known = WORD_MAP[word];
  if (known) return known;

  let out = "";
  const source = word.replace(LAM_ALEF, "la");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] ?? "";
    if (char === "\u200c" || char === "\u0640") continue; // نیم‌فاصله/تطویل
    if (/[a-zA-Z0-9]/.test(char)) {
      out += char;
      continue;
    }
    if (char === "و") {
      // آغاز واژه یا وِ پیش از «ا» هم‌واکی → هم‌خوان «v»؛ در میانه/پایان → مصوت «o»
      // (مانند «جواد» → Javad، «موسوی» → Mosoi)
      out += index === 0 || next === "ا" || next === "آ" ? "v" : "o";
      continue;
    }
    if (char === "ی") {
      // آغاز واژه یا یِ پیش از «ا» → هم‌خوان «y» (مانند «دستیار» → Dastyar)؛
      // در میانه/پایان → مصوت «i»
      out += index === 0 || next === "ا" || next === "آ" ? "y" : "i";
      continue;
    }
    if (char === "ه" && index === source.length - 1) {
      // هٔ پایانی → «eh» (مانند «فاطمه» → Fatameh)
      out += "eh";
      continue;
    }
    const letter = LETTER_MAP[char];
    if (letter === undefined) continue; // نشانه‌های ناشناخته حذف می‌شوند
    out += letter;
  }
  return capitalize(out.trim());
}

/**
 * بازنویسی متن فارسی به لاتین — برای نام‌ها، عنوان‌ها و متن‌های داینامیک.
 * - آیات عربی اعراب‌دار دست‌نخورده برمی‌گردند.
 * - متن‌های بدون نویسهٔ فارسی همان‌طور که هستند برمی‌گردند.
 * - ارقام فارسی/عربی به لاتین تبدیل می‌شوند.
 */
export function transliterateFa(text: string | null | undefined): string {
  const value = (text ?? "").trim();
  if (!value || !hasPersianScript(value) || isQuranicText(value)) return value;

  return toLatinDigits(value)
    .replace(/[«»]/g, "")
    .replace(/؛/g, ";")
    .replace(/،/g, ",")
    .replace(/\u200c/g, " ")
    .split(/\s+/)
    .map((word) => transliterateWord(word))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** نام شهر فارسی → معادل رسمی انگلیسی (پشتیبان: بازنویسی لاتین). */
const CITY_MAP: Record<string, string> = {
  تهران: "Tehran",
  کرج: "Karaj",
  مشهد: "Mashhad",
  قم: "Qom",
  اصفهان: "Isfahan",
  شیراز: "Shiraz",
  تبریز: "Tabriz",
  اهواز: "Ahvaz",
  رشت: "Rasht",
  یزد: "Yazd",
  کرمان: "Kerman",
  همدان: "Hamedan",
  قزوین: "Qazvin",
  ارومیه: "Urmia",
  سنندج: "Sanandaj",
  کرمانشاه: "Kermanshah",
  زاهدان: "Zahedan",
  بندرعباس: "Bandar Abbas",
  زنجان: "Zanjan",
  ساری: "Sari",
  گرگان: "Gorgan",
  اراک: "Arak",
  بوشهر: "Bushehr",
  ایلام: "Ilam",
  یاسوج: "Yasuj",
  شهرکرد: "Shahr-e Kord",
  "خرم‌آباد": "Khorramabad",
  "نجف‌آباد": "Najafabad",
  کاشان: "Kashan",
  "قائم‌شهر": "Qaem Shahr",
  "خمینی‌شهر": "Khomeyni Shahr",
  سمنان: "Semnan",
  بروجرد: "Borujerd",
  ملایر: "Malayer",
  مراغه: "Maragheh",
  مرند: "Marand",
  اسلامشهر: "Eslamshahr",
  ری: "Rey",
};

/** نام شهر را به زبان اپ برمی‌گرداند: فارسی = خود نام، انگلیسی = معادل رسمی/لاتین. */
export function localizeCityName(name: string | null | undefined, lang: "fa" | "en"): string {
  const value = (name ?? "").trim();
  if (!value || lang !== "en") return value;
  return CITY_MAP[value] ?? transliterateFa(value);
}
