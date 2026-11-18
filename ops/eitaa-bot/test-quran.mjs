// تست بانک آیات: هیچ آیه سجده واجبی نباید در چرخه پیام‌ها باشد
import { VERSES, SAJDAH_VERSES, OCCASION_VERSES } from "./content.mjs";

const isSajdah = (s, a) => SAJDAH_VERSES.some((x) => x.surah === s && x.ayah === a);

let fail = 0;
const problems = [];

// ۱) فهرست عزائم باید ۱۵ مورد باشد
if (SAJDAH_VERSES.length !== 15) {
  fail += 1;
  problems.push(`SAJDAH_VERSES length = ${SAJDAH_VERSES.length} (expected 15)`);
}

// ۲) هیچ آیه چرخه نباید سجده واجب باشد
for (const v of VERSES) {
  if (isSajdah(v.surah, v.ayah)) {
    fail += 1;
    problems.push(`verse in cycle is sajdah: ${v.surah} ${v.ayah}`);
  }
}

// ۳) آیات مناسبتی هم نباید سجده واجب باشند
for (const [kind, v] of Object.entries(OCCASION_VERSES)) {
  if (isSajdah(v.surah, v.ayah)) {
    fail += 1;
    problems.push(`occasion verse is sajdah: ${kind} ${v.surah} ${v.ayah}`);
  }
}

// ۴) چند نمونه شناخته‌شده باید در فهرست باشند
const known = [
  ["علق", 19],
  ["نجم", 62],
  ["سجده", 15],
  ["حج", 77],
  ["انشقاق", 21],
];
for (const [s, a] of known) {
  if (!isSajdah(s, a)) {
    fail += 1;
    problems.push(`missing known sajdah: ${s} ${a}`);
  }
}

console.log(`verses=${VERSES.length} sajdahList=${SAJDAH_VERSES.length}`);
if (fail) {
  console.log("FAIL:\n" + problems.join("\n"));
  process.exit(1);
}
console.log("PASS: no sajdah verse in any message bank");
