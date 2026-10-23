// ربات اطلاع‌رسانی کانال منافسه در ایتا
//  - پیام‌های زمان‌بندی‌شده روزانه (۰۹:۰۰ / ۱۲:۳۰ / ۱۷:۳۰ / ۲۱:۰۰ به وقت تهران)
//  - ماژول رویدادمحور: محافل زنده، چالش‌های باز، استادان آنلاین
// بدون هیچ وابستگی خارجی؛ فقط Node.js 20+
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  VERSES,
  FEATURES,
  OCCASIONS,
  WEEKDAYS,
  JALALI_MONTHS,
  HIJRI_MONTHS,
} from "./content.mjs";

// ---------- پیکربندی ----------
const TOKEN_FILE = process.env.TOKEN_FILE || "/app/token";
const STATE_FILE = process.env.STATE_FILE || "/app/state.json";
const API_URL = process.env.API_URL || "http://127.0.0.1:3423/api/public/live-rooms";
const CHAT_ID = process.env.CHAT_ID || "monafeseh";
const EITAA_BASE = "https://eitaayar.ir/api";
const SITE = "monafaseh.vodda.ir";

const SLOTS = ["09:00", "12:30", "17:30", "21:00"];
const EVENT_WINDOW = { start: 9 * 60, end: 23 * 60 }; // ۰۹:۰۰ تا ۲۳:۰۰
const MAX_EVENTS_PER_DAY = 4;
const ROOM_COOLDOWN_MS = 45 * 60 * 1000;
const MASTER_COOLDOWN_MS = 3 * 60 * 60 * 1000;
const SEEN_TTL_MS = 6 * 60 * 60 * 1000;
const POLL_MS = 90 * 1000;
const TICK_MS = 30 * 1000;

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const DRY = has("--dry-run");
const ONCE = has("--once");
const TEST_SEND = has("--test-send");
const FORCE_SLOT = argv.includes("--slot") ? argv[argv.indexOf("--slot") + 1] : null;

// ---------- ابزار زمان (تهران = UTC+03:30) ----------
const TEHRAN_OFFSET = 3.5 * 3600 * 1000;

function tehranDate(ts = Date.now()) {
  return new Date(ts + TEHRAN_OFFSET); // با getUTC* خوانده می‌شود
}

function clock(ts = Date.now()) {
  const d = tehranDate(ts);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function minutesOfDay(ts = Date.now()) {
  const d = tehranDate(ts);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function dateKey(ts = Date.now()) {
  const d = tehranDate(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// ---------- تبدیل تقویم ----------
const div = (a, b) => Math.trunc(a / b);
const mod = (a, b) => a - Math.trunc(a / b) * b;

function g2d(gy, gm, gd) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function jalCal(jy) {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
  ];
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jump = 0;
  for (let i = 1; i < breaks.length; i += 1) {
    const jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  return { gy, march };
}

function toJalaali(gy, gm, gd) {
  const jdn = g2d(gy, gm, gd);
  let gy2 = d2g(jdn).gy;
  let jy = gy2 - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy2, 3, r.march);
  let k = jdn - jdn1f;
  let jm;
  let jd;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    const prev = jalCal(jy);
    const prevJdn = g2d(jy + 621, 3, prev.march);
    k += jdn1f - prevJdn - 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

// تقویم قمری تقریبی (الگوریتم کویتی) — ممکن است یک روز با تقویم رسمی اختلاف داشته باشد
function toHijri(gy, gm, gd) {
  const jd = g2d(gy, gm, gd);
  let l = jd - 1948440 + 10632;
  const n = div(l - 1, 10631);
  l = l - 10631 * n + 354;
  const j =
    div(10985 - l, 5316) * div(50 * l, 17719) +
    div(l, 5670) * div(43 * l, 15238);
  l = l - div(30 - j, 15) * div(17719 * j, 50) - div(j, 16) * div(15238 * j, 43) + 29;
  const m = div(24 * l, 709);
  const d = l - div(709 * m, 24);
  const y = 30 * n + j - 30;
  return { hy: y, hm: m, hd: d };
}

const faDigits = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

function todayInfo(ts = Date.now()) {
  const d = tehranDate(ts);
  const gy = d.getUTCFullYear();
  const gm = d.getUTCMonth() + 1;
  const gd = d.getUTCDate();
  const j = toJalaali(gy, gm, gd);
  const h = toHijri(gy, gm, gd);
  const weekday = WEEKDAYS[d.getUTCDay()];
  const occasion = OCCASIONS[`${j.jm}/${j.jd}`] || null;
  return {
    weekday,
    jalali: `${faDigits(j.jd)} ${JALALI_MONTHS[j.jm - 1]} ${faDigits(j.jy)}`,
    jalaliShort: `${faDigits(j.jy)}/${faDigits(j.jm)}/${faDigits(j.jd)}`,
    hijri: `${faDigits(h.hd)} ${HIJRI_MONTHS[Math.max(0, Math.min(11, h.hm - 1))]}`,
    occasion,
    jy: j.jy,
    jm: j.jm,
    jd: j.jd,
  };
}

// ---------- وضعیت ----------
function loadState() {
  try {
    if (existsSync(STATE_FILE)) return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch (e) {
    console.error("state read failed:", e.message);
  }
  return {
    slots: {},
    eventCount: {},
    seenRooms: {},
    seenChallenges: {},
    seenMasters: {},
    lastRoomAt: 0,
    lastMasterAt: 0,
    sentToday: {},
  };
}

let state = loadState();

function saveState() {
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error("state write failed:", e.message);
  }
}

function pruneState(now) {
  const cut = now - SEEN_TTL_MS;
  for (const key of ["seenRooms", "seenChallenges", "seenMasters"]) {
    for (const [id, ts] of Object.entries(state[key])) {
      if (ts < cut) delete state[key][id];
    }
  }
  const today = dateKey(now);
  for (const key of Object.keys(state.slots)) {
    if (!key.startsWith(today)) delete state.slots[key];
  }
  for (const key of Object.keys(state.eventCount)) {
    if (key !== today) delete state.eventCount[key];
  }
}

// ---------- ارسال ----------
function readToken() {
  const raw = readFileSync(TOKEN_FILE, "utf8").trim();
  return raw.split(/\r?\n/)[0].trim();
}

async function sendMessage(text) {
  if (DRY) {
    console.log("\n[DRY-RUN] ----------------------------------------");
    console.log(text);
    console.log("--------------------------------------------------\n");
    return true;
  }
  const token = readToken();
  const fd = new FormData();
  fd.append("chat_id", CHAT_ID);
  fd.append("text", text);
  const res = await fetch(`${EITAA_BASE}/${token}/sendMessage`, {
    method: "POST",
    body: fd,
  });
  const body = await res.text();
  let json = null;
  try {
    json = JSON.parse(body);
  } catch {}
  const ok = res.ok && (!json || json.ok !== false);
  if (ok) {
    console.log(`[send] ok (${res.status}) ${text.split("\n")[0]}`);
  } else {
    console.error(`[send] FAILED (${res.status}) ${body.slice(0, 300)}`);
  }
  return ok;
}

// ---------- متن پیام‌ها ----------
function fmtFeature(f) {
  return [
    `${f.emoji} «${f.title}»`,
    "",
    f.intro,
    "",
    `🔹 ${f.bullets[0]}`,
    `🔹 ${f.bullets[1]}`,
    `🔹 ${f.bullets[2]}`,
    "",
    "▶️ چطور شروع کنم؟",
    `۱. ${f.steps[0]}`,
    `۲. ${f.steps[1]}`,
    `۳. ${f.steps[2]}`,
    "",
    "🌐 سایت منافسه:",
    SITE,
    `#منافسه #قرآن #${f.hashtag}`,
  ].join("\n");
}

function fmtMorning(info, verse) {
  return [
    "🌙 «صبح بخیر، همراه منافسه»",
    "",
    `📅 امروز: ${info.weekday} ${info.jalali} — ${info.hijri} (قمری تقریبی)`,
    `🕌 مناسبت امروز: ${info.occasion || "مناسبت خاصی نیست"}`,
    "",
    "📖 «آیه امروز»",
    `«${verse.text}»`,
    `— ${verse.surah}، آیه ${faDigits(verse.ayah)}`,
    "",
    "▶️ امروز هم منتظر صدای شما در محافل زنده هستیم.",
    "",
    `🌐 ${SITE}`,
    "#منافسه #آیه_روز",
  ].join("\n");
}

function fmtNight(info, verse, liveCount) {
  const lines = [
    info.weekday === "جمعه" ? "🌙 «شب جمعه، همراه منافسه»" : "🌙 «شب بخیر، همراه منافسه»",
    "",
    "📖 «آیه امروز»",
    `«${verse.text}»`,
    `— ${verse.surah}، آیه ${faDigits(verse.ayah)}`,
    "",
  ];
  if (liveCount > 0) {
    lines.push(`🎙 امروز ${faDigits(liveCount)} محفل زنده در منافسه برگزار شد.`);
  }
  if (info.weekday === "جمعه") {
    lines.push("🕌 شب جمعه است؛ اگر امشب تلاوت کردید، برای اموات و عزیزانتان هدیه کنید.");
  }
  lines.push("▶️ فردا هم منتظر صدای شما هستیم.", "");
  lines.push(`🌐 ${SITE}`, "#منافسه #آیه_روز");
  return lines.join("\n");
}

function fmtRooms(rooms) {
  const items = rooms.slice(0, 3).map(
    (r) => `${r.genderRestriction === "male" ? "🎙" : r.genderRestriction === "female" ? "🎙" : "🎙"} ${r.hostName} — ${r.recitationType} — ${r.url}`,
  );
  return [
    "🔴 «محافل زنده — همین حالا منتظر شما»",
    "",
    "همین الان این محافل در حال برگزاری‌اند:",
    "",
    ...items,
    "",
    "▶️ بپیوندید و تلاوت کنید؛ نوبت‌ها خودکار مدیریت می‌شود.",
    "",
    `🌐 ${SITE}`,
    "#منافسه #محفل_زنده",
  ].join("\n");
}

function fmtChallenges(list) {
  const items = list.slice(0, 3).map((c) => `⚔️ ${c.userName} — ${c.recitationType} — ${c.url}`);
  return [
    "⚔️ «چالش رقابت — منتظر حریف»",
    "",
    "این چالش‌ها همین حالا منتظر یک رقیب‌اند:",
    "",
    ...items,
    "",
    "▶️ اولین نفری باشید که چالش را می‌پذیرد!",
    "",
    `🌐 ${SITE}`,
    "#منافسه #چالش",
  ].join("\n");
}

function fmtMasters(list) {
  const items = list
    .slice(0, 3)
    .map((m) => `👨‍🏫 ${m.fullName} — ${m.recitationType || "تلاوت"} — ${faDigits(m.privateSessionPrice)} امتیاز — ${m.url}`);
  return [
    "👨‍🏫 «استادان آنلاین — رزرو فوری»",
    "",
    "این استادان همین حالا آنلاین‌اند و جلسه خصوصی می‌پذیرند:",
    "",
    ...items,
    "",
    "▶️ ظرفیت محدود است؛ سریع رزرو کنید.",
    "",
    `🌐 ${SITE}`,
    "#منافسه #استاد_قرآن",
  ].join("\n");
}

// ---------- زمان‌بندی روزانه ----------
function dayIndex(ts = Date.now()) {
  return Math.floor((ts + TEHRAN_OFFSET) / 86400000);
}

async function runSlot(slot, info, liveCount) {
  const day = dayIndex();
  const verse1 = VERSES[day % VERSES.length];
  const verse2 = VERSES[(day + 5) % VERSES.length];

  if (slot === "09:00") {
    return sendMessage(fmtMorning(info, verse1));
  }
  if (slot === "12:30") {
    return sendMessage(fmtFeature(FEATURES[(day * 2) % FEATURES.length]));
  }
  if (slot === "17:30") {
    return sendMessage(fmtFeature(FEATURES[(day * 2 + 1) % FEATURES.length]));
  }
  if (slot === "21:00") {
    // جمعه‌ها پیام شب جایگزین پیام معمول می‌شود (بدون پیام تکراری)
    return sendMessage(fmtNight(info, verse2, liveCount));
  }
  return false;
}

async function checkScheduler() {
  const info = todayInfo();
  const now = Date.now();
  const current = clock(now);

  const slotsToRun = FORCE_SLOT ? [FORCE_SLOT] : SLOTS;
  for (const slot of slotsToRun) {
    const key = `${dateKey(now)}:${slot}`;
    if (state.slots[key]) continue;
    if (!FORCE_SLOT) {
      // پنجره ۵ دقیقه‌ای پس از زمان مقرر
      const target = Number(slot.slice(0, 2)) * 60 + Number(slot.slice(3));
      const diff = minutesOfDay(now) - target;
      if (diff < 0 || diff > 5) continue;
    }
    const live = await fetchLive().catch(() => null);
    const ok = await runSlot(slot, info, live?.counts?.liveRooms ?? 0);
    if (ok) {
      state.slots[key] = true;
      saveState();
      console.log(`[slot] sent ${slot} on ${dateKey(now)}`);
    }
  }
  return current;
}

// ---------- ماژول رویدادمحور ----------
async function fetchLive() {
  const res = await fetch(API_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`api ${res.status}`);
  return res.json();
}

async function pollEvents() {
  const now = Date.now();
  const mod = minutesOfDay(now);
  if (mod < EVENT_WINDOW.start || mod > EVENT_WINDOW.end) return; // خارج از ساعات پیک

  const today = dateKey(now);
  let count = state.eventCount[today] || 0;
  if (count >= MAX_EVENTS_PER_DAY) return;

  let data;
  try {
    data = await fetchLive();
  } catch (e) {
    console.error("[poll] failed:", e.message);
    return;
  }

  // ۱) محافل زنده — جدید و در بازه خنک‌شدن
  const newRooms = (data.liveRooms || []).filter((r) => !state.seenRooms[r.id]);
  if (
    newRooms.length > 0 &&
    count < MAX_EVENTS_PER_DAY &&
    now - (state.lastRoomAt || 0) > ROOM_COOLDOWN_MS
  ) {
    if (await sendMessage(fmtRooms(newRooms))) {
      newRooms.forEach((r) => (state.seenRooms[r.id] = now));
      state.lastRoomAt = now;
      count += 1;
      state.eventCount[today] = count;
      saveState();
      return;
    }
  }

  // ۲) چالش‌ها — فقط چالش‌هایی که حداقل ۹۰ ثانیه از عمرشان مانده
  const newChallenges = (data.openChallenges || []).filter(
    (c) => !state.seenChallenges[c.id] && c.expiresIn > 90 * 1000,
  );
  if (newChallenges.length > 0 && count < MAX_EVENTS_PER_DAY) {
    if (await sendMessage(fmtChallenges(newChallenges))) {
      newChallenges.forEach((c) => (state.seenChallenges[c.id] = now));
      count += 1;
      state.eventCount[today] = count;
      saveState();
      return;
    }
  }

  // ۳) استادان آنلاین — حداکثر هر ۳ ساعت یک پیام
  const newMasters = (data.onlineMasters || []).filter((m) => !state.seenMasters[m.id]);
  if (
    newMasters.length > 0 &&
    count < MAX_EVENTS_PER_DAY &&
    now - (state.lastMasterAt || 0) > MASTER_COOLDOWN_MS
  ) {
    if (await sendMessage(fmtMasters(newMasters))) {
      newMasters.forEach((m) => (state.seenMasters[m.id] = now));
      state.lastMasterAt = now;
      count += 1;
      state.eventCount[today] = count;
      saveState();
    }
  }
}

// ---------- شروع ----------
async function main() {
  console.log(
    `[boot] eitaa-bot started | dry=${DRY} | tz=Asia/Tehran | api=${API_URL} | now=${clock()} ${todayInfo().jalali}`,
  );

  if (TEST_SEND) {
    const ok = await sendMessage(
      [
        "🤖 «ربات اطلاع‌رسانی منافسه فعال شد»",
        "",
        "از این پس پیام‌های روزانه (صبح، ظهر، عصر، شب) و اطلاع‌رسانی رویدادها (محافل زنده، چالش‌ها، استادان آنلاین) در همین کانال منتشر می‌شود.",
        "",
        "این یک پیام آزمایشی است و می‌توانید حذفش کنید.",
        "",
        `🌐 ${SITE}`,
        "#منافسه",
      ].join("\n"),
    );
    process.exit(ok ? 0 : 1);
  }

  pruneState(Date.now());
  await checkScheduler();
  await pollEvents();

  if (ONCE) {
    console.log("[once] finished");
    return;
  }

  setInterval(() => {
    pruneState(Date.now());
    checkScheduler().catch((e) => console.error("[scheduler]", e.message));
  }, TICK_MS);

  setInterval(() => {
    pollEvents().catch((e) => console.error("[events]", e.message));
  }, POLL_MS);
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
