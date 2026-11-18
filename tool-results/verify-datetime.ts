// باگ persian-dates — اسکریپت پذیرش؛ با bun اجرا می‌شود.
import { formatDate, formatDateTime, formatTime, formatNumber } from "../src/lib/datetime";

const samples: Array<[string, Date | string | number]> = [
  ["iso-utc-midnight", "2026-11-17T00:00:00Z"],
  ["iso-tehran-noon", "2026-11-17T09:30:00Z"],
  ["local-now", new Date()],
  ["edge-nowruz-eve", "2026-03-20T10:00:00Z"], // ظهر به‌وقت تهران → ۲۹ اسفند ۱۴۰۴
];

let failures = 0;
function check(label: string, actual: string, expected: string) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}: "${actual}"${ok ? "" : ` ≠ expected "${expected}"`}`);
}

// پذیرش: روز/ماه درست — Nov 17 → ۲۶ آبان؛ سال شمسی واقعی (۱۴۰۵ برای ۲۰۲۶)
check("fa medium (Nov 17 2026)", formatDate(samples[0][1], "fa", "medium"), "۲۶ آبان ۱۴۰۵");
check("en medium (Nov 17 2026)", formatDate(samples[0][1], "en", "medium"), "Nov 17, 2026");
check("fa short", formatDate(samples[0][1], "fa", "short"), "۲۶ آبان");
check("fa long (weekday)", formatDate(samples[0][1], "fa", "long"), "سه‌شنبه ۲۶ آبان ۱۴۰۵");
check("fa dayMonth", formatDate(samples[0][1], "fa", "dayMonth"), "سه‌شنبه ۲۶ آبان");
check("fa weekdayDayMonth", formatDate(samples[1][1], "fa", "weekdayDayMonth"), "سه‌شنبه ۲۶ آبان");
check("fa time", formatTime(samples[1][1], "fa"), "۱۳:۰۰");
check("fa dateTime", formatDateTime(samples[1][1], "fa", "medium"), "۲۶ آبان ۱۴۰۵، ۱۳:۰۰");
check("fa dateTime short", formatDateTime(samples[1][1], "fa", "short"), "۲۶ آبان، ۱۳:۰۰");
check("en dateTime", formatDateTime(samples[1][1], "en", "medium"), "Nov 17, 2026, 13:00");
check("fa number", formatNumber(12500, "fa"), "۱۲٬۵۰۰");
check("en number", formatNumber(12500, "en"), "12,500");
check("fa rating", formatNumber(4.68, "fa", { maximumFractionDigits: 1 }), "۴٫۷");
check("invalid → empty", formatDate("not-a-date", "fa"), "");
check("nowruz eve fa", formatDate(samples[3][1], "fa", "medium"), "۲۹ اسفند ۱۴۰۴");

console.log(failures === 0 ? "ALL PASS ✅" : `${failures} FAILURES ❌`);
if (failures > 0) process.exit(1);
