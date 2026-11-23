// تست‌های تقویم — برای اطمینان از صحت کامل شمسی و قمری
import {
  toJalaali, toGregorian, jalaaliMonthLength, isJalaaliLeap,
  gregorianToHijri, hijriMonthLength, HIJRI_MONTH_STARTS, HIJRI_RANGE,
  JALALI_MONTHS, HIJRI_MONTHS, dayInfo, CALENDAR_SOURCE,
} from "./calendar.mjs";

let pass = 0;
let fail = 0;
const errors = [];

function check(name, cond, detail = "") {
  if (cond) pass += 1;
  else {
    fail += 1;
    errors.push(`${name} ${detail}`);
  }
}

// ۱) رفت‌وبرگشت شمسی ↔ میلادی برای همه روزهای ۱۳۹۹ تا ۱۴۱۰
let roundTrips = 0;
for (let jy = 1399; jy <= 1410; jy += 1) {
  for (let jm = 1; jm <= 12; jm += 1) {
    for (let jd = 1; jd <= jalaaliMonthLength(jy, jm); jd += 1) {
      const g = toGregorian(jy, jm, jd);
      const back = toJalaali(g.gy, g.gm, g.gd);
      if (back.jy !== jy || back.jm !== jm || back.jd !== jd) {
        check("roundtrip", false, `${jy}/${jm}/${jd} -> ${g.gy}-${g.gm}-${g.gd} -> ${back.jy}/${back.jm}/${back.jd}`);
      }
      roundTrips += 1;
    }
  }
}
check("roundtrip-count", roundTrips > 4000, String(roundTrips));

// ۲) طول سال شمسی ۳۶۵ یا ۳۶۶
for (let jy = 1399; jy <= 1410; jy += 1) {
  const len = Array.from({ length: 12 }, (_, i) => jalaaliMonthLength(jy, i + 1)).reduce((a, b) => a + b, 0);
  check("year-length", len === 365 || len === 366, `${jy}=${len}`);
}

// ۳) نقاط مرجع شناخته‌شده
const anchors = [
  // [jalali y,m,d, gregorian y,m,d]
  [1404, 1, 1, 2025, 3, 21],
  [1405, 1, 1, 2026, 3, 21],
  [1405, 8, 2, 2026, 10, 24],
  [1403, 12, 30, 2025, 3, 20],
];
for (const [jy, jm, jd, gy, gm, gd] of anchors) {
  const g = toGregorian(jy, jm, jd);
  check("anchor", g.gy === gy && g.gm === gm && g.gd === gd, `${jy}/${jm}/${jd} -> ${g.gy}-${g.gm}-${g.gd}`);
}

// ۴) پیوستگی ماه‌های قمری در جدول رسمی
for (let i = 1; i < HIJRI_MONTH_STARTS.length; i += 1) {
  const prev = HIJRI_MONTH_STARTS[i - 1];
  const cur = HIJRI_MONTH_STARTS[i];
  const len = Math.round((cur.ts - prev.ts) / 86400000);
  check("hijri-length", len === 29 || len === 30, `${prev.hy}/${prev.hm} -> ${cur.hy}/${cur.hm} = ${len}`);
  const expHm = (prev.hm % 12) + 1;
  const expHy = prev.hy + (prev.hm === 12 ? 1 : 0);
  check("hijri-sequence", cur.hm === expHm && cur.hy === expHy, `${prev.hy}/${prev.hm} -> ${cur.hy}/${cur.hm}`);
}

// ۵) هر روز از بازه جدول، تاریخ قمری درست بدهد (بدون approx)
const startTs = Date.parse(HIJRI_RANGE.from + "T00:00:00Z");
let checked = 0;
for (let i = 0; i < 700; i += 1) {
  const d = new Date(startTs + i * 86400000);
  const h = gregorianToHijri(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  if (h.approx) break;
  const len = hijriMonthLength(h.hy, h.hm);
  check("hijri-day-range", h.hd >= 1 && h.hd <= (len || 30), `${d.toISOString().slice(0, 10)} -> ${h.hd}/${len}`);
  checked += 1;
}
check("hijri-days-checked", checked > 600, String(checked));

// ۶) توالی روزهای قمری بدون پرش
let prevKey = null;
for (let i = 0; i < 700; i += 1) {
  const d = new Date(startTs + i * 86400000);
  const h = gregorianToHijri(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  if (h.approx) break;
  const key = h.hy * 10000 + h.hm * 100 + h.hd;
  if (prevKey !== null) {
    const prevH = { hy: Math.floor(prevKey / 10000), hm: Math.floor((prevKey % 10000) / 100), hd: prevKey % 100 };
    const isNextMonth = h.hd === 1 && h.hm === (prevH.hm % 12) + 1;
    const isNextDay = h.hd === prevH.hd + 1 && h.hm === prevH.hm;
    check("hijri-continuity", isNextMonth || isNextDay, `${prevH.hy}/${prevH.hm}/${prevH.hd} -> ${h.hy}/${h.hm}/${h.hd}`);
  }
  prevKey = key;
}

// ۷) خارج از بازه باید approx باشد
const out = gregorianToHijri(2030, 1, 1);
check("out-of-range-approx", out.approx === true, JSON.stringify(out));

// ۸) نمونه خروجی — ۲ آبان ۱۴۰۵ برابر ۱۳ جمادی‌الاول ۱۴۴۸ است (طبق تقویم رسمی)
const sample = dayInfo(2026, 10, 24);
check("dayInfo", sample.jalaali.jm === 8 && sample.jalaali.jd === 2 && sample.hijri.hm === 5 && sample.hijri.hd === 13,
  JSON.stringify(sample));

console.log("source:", CALENDAR_SOURCE);
console.log("hijri range:", HIJRI_RANGE.from, "→", HIJRI_RANGE.to, `(${HIJRI_MONTH_STARTS.length} months)`);
console.log("sample:", JSON.stringify(sample, null, 0));
console.log(`\nPASS: ${pass}   FAIL: ${fail}`);
if (fail) {
  console.log("first errors:\n" + errors.slice(0, 10).join("\n"));
  process.exit(1);
}
