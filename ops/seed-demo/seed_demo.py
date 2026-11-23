#!/usr/bin/env python3
"""Generate seed_demo.sql — realistic Persian demo data for the vodda platform.

Idempotent-ish: deletes previous demo rows (id ranges) before inserting.
Run output against the production MySQL (vodda db) with --default-character-set=utf8mb4.
"""
import random
from datetime import datetime, timedelta

random.seed(1404)
L = []
A = L.append

FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")

def fa(n: int) -> str:
    return str(n).translate(FA_DIGITS)

# ───────────────────────────── reset previous demo data ─────────────────────────────
A("SET NAMES utf8mb4;")
A("SET FOREIGN_KEY_CHECKS = 0;")
A("DELETE FROM reviews WHERE session_id IN (SELECT id FROM sessions WHERE learner_id >= 50);")
A("DELETE FROM transactions WHERE user_id >= 50 OR (user_id = 2 AND ref_id >= 50);")
A("DELETE FROM sessions WHERE learner_id >= 50;")
A("DELETE FROM users WHERE id >= 50;")
A("DELETE FROM services WHERE id >= 100;")
A("DELETE FROM notifications WHERE user_id >= 50;")
A("DELETE FROM notifications WHERE user_id < 50;")
A("DELETE FROM support_messages WHERE id >= 100;")
A("DELETE FROM withdrawals WHERE id >= 100;")
A("DELETE FROM transactions WHERE type IN ('earning','commission') AND created_at > DATE_SUB(NOW(), INTERVAL 90 DAY) AND user_id < 50;")
A("UPDATE services SET active = 0 WHERE id IN (1, 2);")
A("SET FOREIGN_KEY_CHECKS = 1;")

# ───────────────────────────── 1. avatars ─────────────────────────────
A("-- آواتار اساتید (user 2..46) + هنرجوهای دمو")
A("UPDATE users SET avatar_url = CONCAT('/uploads/avatars/user-', id, '.jpg') WHERE id BETWEEN 2 AND 46;")

# ───────────────────────────── 2. fake learners (ids 50..73) ─────────────────────────────
LEARNERS = [
    ("زهرا محمدی", "09352001001", "قم", 650000),
    ("علی رضایی", "09352001002", "تهران", 420000),
    ("فاطمه کریمی", "09352001003", "مشهد", 780000),
    ("حسین موسوی", "09352001004", "اصفهان", 300000),
    ("مریم حسینی", "09352001005", "شیراز", 540000),
    ("رضا قاسمی", "09352001006", "تبریز", 260000),
    ("سارا احمدی", "09352001007", "کرج", 610000),
    ("مهدی نادری", "09352001008", "یزد", 190000),
    ("نرگس صادقی", "09352001009", "قم", 720000),
    ("امیر جعفری", "09352001010", "رشت", 240000),
    ("لیلا کاظمی", "09352001011", "اهواز", 380000),
    ("محمد امینی", "09352001012", "تهران", 830000),
    ("زینب رحیمی", "09352001013", "مشهد", 450000),
    ("حسن شریفی", "09352001014", "اصفهان", 210000),
    ("معصمه نوروزی", "09352001015", "قم", 560000),
    ("یاسر ملکی", "09352001016", "بندرعباس", 170000),
    ("فائزه تهرانی", "09352001017", "تهران", 690000),
    ("ابراهیم سلطانی", "09352001018", "کرمان", 280000),
    ("حدیقه فراهانی", "09352001019", "هرات", 330000),
    ("پارسا مقدم", "09352001020", "شیراز", 410000),
    ("ریحانه اکبری", "09352001021", "قم", 740000),
    ("سجاد دهقانی", "09352001022", "ساری", 230000),
    ("الهام زارعی", "09352001023", "کرمانشاه", 490000),
    ("طاها یوسفی", "09352001024", "نجف‌آباد", 350000),
]
LEARNER_LEARNER_AV = [1, 2, 3, 4, 5, 6, 7]
A("INSERT INTO users (id, name, mobile, role, city, avatar_url, bio, active, wallet, created_at, updated_at) VALUES")
rows = []
for i, (name, mobile, city, wallet) in enumerate(LEARNERS):
    uid = 50 + i
    av = LEARNER_LEARNER_AV[i % len(LEARNER_LEARNER_AV)]
    days_ago = 5 + (i * 3) % 120
    rows.append(
        f"({uid}, '{name}', '{mobile}', 'learner', '{city}', '/uploads/avatars/learner-{av}.jpg', '', 1, {wallet}, DATE_SUB(NOW(), INTERVAL {days_ago} DAY), NOW())"
    )
A(",\n".join(rows) + ";")

# ───────────────────────────── 3. teacher profile enrichment ─────────────────────────────
TIER_INTL = {1, 4, 18}
TIER_G2 = {2, 9, 21, 29, 38}
TIER_G3 = {3, 7, 12, 24, 30, 40, 43}
UNAVAILABLE = {11, 26, 34, 42, 8, 35}

A("UPDATE teachers SET rating = 4.9, reviews = 128, sessions = 412, followers = 341, price30 = 180000, price60 = 360000, tier = 'international' WHERE id = 1;")

teacher_stats = {}
for tid in range(2, 46):
    if tid in TIER_INTL:
        rating = round(random.uniform(4.75, 4.98), 1)
        reviews = random.randint(38, 92)
        sessions = random.randint(140, 320)
        followers = random.randint(120, 300)
        p30 = random.randrange(160000, 240000, 5000)
    elif tid in TIER_G2:
        rating = round(random.uniform(4.55, 4.9), 1)
        reviews = random.randint(18, 55)
        sessions = random.randint(70, 190)
        followers = random.randint(50, 160)
        p30 = random.randrange(110000, 170000, 5000)
    elif tid in TIER_G3:
        rating = round(random.uniform(4.35, 4.8), 1)
        reviews = random.randint(8, 30)
        sessions = random.randint(30, 110)
        followers = random.randint(15, 80)
        p30 = random.randrange(85000, 140000, 5000)
    else:
        rating = round(random.uniform(4.05, 4.75), 1)
        reviews = random.randint(3, 16)
        sessions = random.randint(12, 60)
        followers = random.randint(4, 40)
        p30 = random.randrange(65000, 115000, 5000)
    p60 = p30 * 2
    avail = 0 if tid in UNAVAILABLE else 1
    teacher_stats[tid] = dict(rating=rating, reviews=reviews, sessions=sessions,
                              followers=followers, p30=p30, p60=p60, avail=avail)
    A(f"UPDATE teachers SET rating = {rating}, reviews = {reviews}, sessions = {sessions}, followers = {followers}, price30 = {p30}, price60 = {p60}, tier = '' , available = {avail} WHERE id = {tid};")
A("UPDATE teachers SET tier = 'international' WHERE id IN (4, 18);")
A("UPDATE teachers SET tier = 'grade2' WHERE id IN (2, 9, 21, 29, 38);")
A("UPDATE teachers SET tier = 'grade3' WHERE id IN (3, 7, 12, 24, 30, 40, 43);")

# keep at least a handful online so the app feels alive
A("UPDATE teachers SET available = 1 WHERE id IN (5, 14, 19, 23, 31, 39, 44);")

# ───────────────────────────── 4. services ─────────────────────────────
SPECIALTIES = [
    ("جلسه آموزش تجوید و اصلاح لهجه قرآن کریم", "mic"),
    ("جلسه حفظ قرآن به روش تکرار گروهی", "award"),
    ("جلسه روخوانی روان با تصحیح آنی", "book"),
    ("جلسه آموزش اصول تلاوت و مُدّها", "mic"),
    ("جلسه تمرین صوت و آواسازی قرآنی", "headphones"),
]
service_of = {}  # tid -> {"s30": (id,title,price,dur), "s60": ..., "extra": ...}
sid = 100  # demo range
A("INSERT INTO services (id, teacher_id, title, duration, price, icon, active) VALUES")
srows = []
for tid in range(1, 46):
    st = teacher_stats.get(tid) or dict(p30=180000, p60=360000)
    t30 = f"جلسه تلاوت و روخوانی قرآن کریم · {fa(30)} دقیقه"
    t60 = f"جلسه تلاوت و روخوانی قرآن کریم · {fa(60)} دقیقه"
    srows.append(f"({sid}, {tid}, '{t30}', 30, {st['p30']}, 'book', 1)")
    service_of.setdefault(tid, {})["s30"] = (sid, t30, st["p30"], 30)
    sid += 1
    srows.append(f"({sid}, {tid}, '{t60}', 60, {st['p60']}, 'mic', 1)")
    service_of.setdefault(tid, {})["s60"] = (sid, t60, st["p60"], 60)
    sid += 1
    if tid % 2 == 0:
        title, icon = SPECIALTIES[tid % len(SPECIALTIES)]
        dur = 45
        price = int((st["p30"] * 3) / 2 / 5000) * 5000
        tf = f"{title} · {fa(dur)} دقیقه"
        srows.append(f"({sid}, {tid}, '{tf}', {dur}, {price}, '{icon}', 1)")
        service_of.setdefault(tid, {})["extra"] = (sid, tf, price, dur)
        sid += 1
A(",\n".join(srows) + ";")

# ───────────────────────────── 5. sessions ─────────────────────────────
NOTES = [
    "سلام و احترام، برای تقویت روخوانی‌ام به جلسه نیاز دارم.",
    "سلام، وقت‌های عصر برایم بهتر است. ممنون.",
    "با سلام، برای دخترم کلاس مقدماتی می‌خواهم.",
    "سلام، در آماده‌سازی برای محافل قرآنی کمکم کنید.",
    "سلام، تجویدم ضعیفه؛ لطفاً تمرکز روی مُدها باشه.",
    "",
    "",
]
PENDING_NOTES = [
    "سلام، این زمان برای من مناسبه لطفاً تایید کنید.",
    "سلام و وقت بخیر، منتظر تایید جلسه هستم.",
    "برای اولین جلسه آشنایی رزرو کردم. ممنون.",
]

HOURS_UTC = [6, 8, 9, 11, 13]  # → 9:30 .. 16:30 Tehran
all_tids = list(range(1, 46))
busy_tids = [1, 4, 5, 14, 18, 19, 21, 23, 27, 31, 33, 39, 44]

sessions_spec = []  # (offset_days, hour, tid, kind, status, rated, note)
# 30 done sessions over last 45 days (mostly with busy teachers)
for i in range(30):
    days = 2 + (i * 11) % 42
    hour = HOURS_UTC[i % len(HOURS_UTC)]
    tid = busy_tids[i % len(busy_tids)] if i % 3 else random.choice(all_tids)
    kind = "s60" if i % 3 == 0 else "s30"
    rated = 0 if i % 5 == 4 else 1
    sessions_spec.append((-days, hour, tid, kind, "done", rated, ""))
# 14 confirmed upcoming
for i in range(14):
    days = 1 + i % 13
    hour = HOURS_UTC[(i + 2) % len(HOURS_UTC)]
    tid = busy_tids[(i * 3 + 1) % len(busy_tids)]
    kind = "s30" if i % 2 else "s60"
    sessions_spec.append((days, hour, tid, kind, "confirmed", 0, ""))
# 8 pending requests
for i in range(8):
    days = 2 + (i * 3) % 9
    hour = HOURS_UTC[(i + 4) % len(HOURS_UTC)]
    tid = all_tids[(i * 7 + 3) % len(all_tids)]
    kind = "s30"
    sessions_spec.append((days, hour, tid, kind, "pending", 0, PENDING_NOTES[i % len(PENDING_NOTES)]))
# 4 canceled
for i in range(4):
    days = 3 + i * 6
    hour = HOURS_UTC[i % len(HOURS_UTC)]
    tid = all_tids[(i * 11 + 5) % len(all_tids)]
    sessions_spec.append((-days, hour, tid, "s30", "canceled", 0, ""))

A("INSERT INTO sessions (id, learner_id, teacher_id, service_id, title, scheduled_at, duration, price, status, note, reject_note, rated, created_at, updated_at) VALUES")
jrows = []
learner_sessions = {}   # uid -> list of (status, price)
teacher_earn = {}       # tid -> earned
session_meta = []       # for reviews/transactions
for idx, (days, hour, tid, kind, status, rated, note) in enumerate(sessions_spec):
    jid = 100 + idx
    svc = service_of[tid][kind]
    svc_id, title, price, dur = svc
    learner_id = 50 + ((idx * 5 + tid) % 24)
    when = f"DATE_ADD(DATE_ADD(CURDATE(), INTERVAL {days} DAY), INTERVAL {hour} HOUR)"
    created_off = abs(days) + random.randint(1, 4)
    reject = "'عدم امکان هماهنگی در این زمان'" if status == "canceled" else "''"
    jrows.append(
        f"({jid}, {learner_id}, {tid}, {svc_id}, '{title}', {when}, {dur}, {price}, '{status}', '{note}', {reject}, {rated}, DATE_SUB(NOW(), INTERVAL {created_off} DAY), NOW())"
    )
    if status == "done":
        learner_sessions.setdefault(learner_id, []).append(("done", price))
        teacher_earn[tid] = teacher_earn.get(tid, 0) + int(price * 0.85)
        session_meta.append(dict(id=jid, learner=learner_id, tid=tid, price=price, rated=rated, days=days))
    elif status == "confirmed":
        learner_sessions.setdefault(learner_id, []).append(("confirmed", price))
A(",\n".join(jrows) + ";")

# ───────────────────────────── 6. reviews ─────────────────────────────
REVIEW_TEXTS = [
    "استاد خیلی صبور و باسوادی دارند؛ روخوانی‌ام واقعاً بهتر شد.",
    "کلاس روان و پرانرژی بود، حتماً جلسات بعدی را هم رزرو می‌کنم.",
    "تجویدم را خیلی دقیق اصلاح کردند. ممنون از وُدّا.",
    "برای شروع عالی بود؛ همان جلسه اول خیلی چیزها یاد گرفتم.",
    "روش تدریس ایشان بسیار تأثیرگذار است، پیشنهاد می‌کنم.",
    "صدای زیبایی دارند و نکات را ساده و شفاف می‌گویند.",
    "منظم و وقت‌شناس بودند؛ از انتخابشان راضی هستم.",
    "برای فرزندم کلاس گرفتم، خیلی علاقه‌مند شد. دستتان درد نکند.",
    "تصحیح لحظه‌ای غلط‌ها خیلی کمکم کرد. عالی بود.",
    "بهترین کلاس تلاوتی که تا حالا شرکت کرده‌ام.",
    "صبورانه تکرار کردند تا آیه‌ها درست شد. سپاسگزارم.",
    "برنامه‌ریزی جلسات خیلی منظم و اصولی پیش می‌رود.",
]
A("INSERT INTO reviews (id, session_id, teacher_id, learner_id, rating, `text`, created_at) VALUES")
rrows = []
rid = 100
r_i = 0
for meta in session_meta:
    if meta["rated"] != 1:
        continue
    rating = 5 if r_i % 3 else 4
    text = REVIEW_TEXTS[r_i % len(REVIEW_TEXTS)]
    rrows.append(
        f"({rid}, {meta['id']}, {meta['tid']}, {meta['learner']}, {rating}, '{text}', DATE_ADD(NOW(), INTERVAL {meta['days'] + 1} DAY))"
    )
    rid += 1
    r_i += 1
A(",\n".join(rrows) + ";")

# ───────────────────────────── 7. transactions + wallets ─────────────────────────────
A("INSERT INTO transactions (user_id, type, title, amount, ref_id, created_at) VALUES")
trows = []
tid_tx = 100
for i, (name, mobile, city, wallet) in enumerate(LEARNERS):
    uid = 50 + i
    charge = 300000 + ((i * 137) % 500000) // 10000 * 10000
    trows.append(f"({uid}, 'charge', 'شارژ کیف پول از طریق درگاه پرداخت', {charge}, 0, DATE_SUB(NOW(), INTERVAL {10 + i * 4} DAY))")
done_by_learner = {}
for meta in session_meta:
    uid = meta["learner"]
    done_by_learner[uid] = done_by_learner.get(uid, 0) + meta["price"]
    trows.append(f"({uid}, 'session', 'پرداخت هزینه جلسه تلاوت و روخوانی', {meta['price']}, {meta['id']}, DATE_ADD(NOW(), INTERVAL {meta['days']} DAY))")
    earn = int(meta["price"] * 0.85)
    comm = meta["price"] - earn
    tuser = 2 if meta["tid"] == 1 else meta["tid"] + 1  # teacher_id -> user_id
    trows.append(f"({tuser}, 'earning', 'درآمد جلسه تلاوت و روخوانی قرآن کریم', {earn}, {meta['id']}, DATE_ADD(NOW(), INTERVAL {meta['days']} DAY))")
    trows.append(f"(2, 'commission', 'کارمزد پلتفرم وُدّا', {comm}, {meta['id']}, DATE_ADD(NOW(), INTERVAL {meta['days']} DAY))")
A(",\n".join(trows) + ";")

# learner wallet: initial + charges - paid sessions (floor at 60k)
A("UPDATE users u SET u.wallet = GREATEST(60000, u.wallet + COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.user_id = u.id AND t.type = 'charge'), 0) - COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.user_id = u.id AND t.type = 'session'), 0)) WHERE u.id >= 50;")
# teacher wallets = their earnings
A("UPDATE users u JOIN teachers t ON t.user_id = u.id SET u.wallet = COALESCE((SELECT SUM(x.amount) FROM transactions x WHERE x.user_id = u.id AND x.type = 'earning'), 0) + (150000 + (u.id * 73000) % 2400000) WHERE u.id BETWEEN 2 AND 46;")
# admin wallet = commissions
A("UPDATE users SET wallet = COALESCE((SELECT SUM(amount) FROM transactions WHERE user_id = 2 AND type = 'commission'), 0) WHERE id = 2;")

# ───────────────────────────── 8. withdrawals ─────────────────────────────
WD = [
    (100, 4, 5, 700000, "paid", "6104-xxxx-xxxx-1234", "IR120570028080010181588101"),
    (101, 9, 10, 500000, "paid", "6104-xxxx-xxxx-8842", "IR320570028080010181588102"),
    (102, 14, 15, 1200000, "pending", "6037-xxxx-xxxx-2210", "IR450570028080010181588103"),
    (103, 21, 22, 900000, "rejected", "5894-xxxx-xxxx-7712", "IR670570028080010181588104"),
]
A("INSERT INTO withdrawals (id, teacher_id, user_id, amount, card, sheba, status, created_at, updated_at) VALUES")
A(",\n".join(
    f"({wid}, {tid}, {uid}, {amt}, '{card}', '{sheba}', '{status}', DATE_SUB(NOW(), INTERVAL {5 + k * 6} DAY), NOW())"
    for k, (wid, tid, uid, amt, status, card, sheba) in enumerate(WD)
) + ";")
A("UPDATE users u JOIN withdrawals w ON w.user_id = u.id AND w.status = 'paid' SET u.wallet = GREATEST(0, u.wallet - w.amount);")

# ───────────────────────────── 9. notifications ─────────────────────────────
NOTIF_ADMIN = [
    ("جلسه جدید رزرو شد", "زهرا محمدی جلسه «تلاوت و روخوانی قرآن کریم · ۳۰ دقیقه» را رزرو کرد.", 0),
    ("نظر جدید ثبت شد", "کاربری به استاد شما امتیاز ۵ داد: «عالی بود، ممنون».", 0),
    ("درخواست برداشت وجه", "استاد شماره ۱۵ درخواست برداشت ۱٬۲۰۰٬۰۰۰ تومانی ثبت کرد.", 0),
    ("پیام پشتیبانی جدید", "مریم حسینی پیامی برای پشتیبانی ارسال کرده است.", 0),
    ("گزارش هفتگی آماده است", "گزارش هفتگی پلتفرم وُدّا آماده مشاهده است.", 1),
    ("استاد جدید تایید شد", "پروفایل استاد «نرگس صادقی» تایید و فعال شد.", 1),
    ("یادآوری تسویه", "تسویه هفتگی اساتید فردا انجام می‌شود.", 1),
    ("خوش آمدید 👋", "به پنل مدیریت وُدّا خوش آمدید؛ اپ با داده‌های نمونه پر شده است.", 0),
]
NOTIF_TEACHER = [
    ("رزرو جلسه جدید", "یک هنرجو برای شما جلسه رزرو کرد؛ وارد پنل شوید و تایید کنید.", 0),
    ("نظر جدید برای شما", "هنرجو به شما امتیاز ۵ داد. آفرین!", 0),
    ("درآمد جدید", "درآمد جلسه انجام‌شده به کیف پول شما اضافه شد.", 1),
    ("یادآوری جلسه", "جلسه فردای شما کمتر از ۲۴ ساعت دیگر شروع می‌شود.", 0),
]
NOTIF_LEARNER = [
    ("جلسه شما تایید شد ✅", "استاد جلسه شما را تایید کرد؛ منتظر جلسه باشید.", 0),
    ("یادآوری جلسه", "جلسه شما فردا برگزار می‌شود؛ لینک ورود از صفحه جلسات در دسترس است.", 0),
    ("کیف پول شارژ شد", "مبلغ شارژ با موفقیت به کیف پول شما اضافه شد.", 1),
]
A("INSERT INTO notifications (user_id, title, body, `read`, created_at) VALUES")
nrows = []
k = 0
for title, body, isread in NOTIF_ADMIN:
    nrows.append(f"(2, '{title}', '{body}', {isread}, DATE_SUB(NOW(), INTERVAL {2 + k * 9} HOUR))")
    k += 1
tusers = [3, 6, 10, 14, 19, 23, 27, 31, 39, 44, 8, 33]
for uid in tusers:
    for j, (title, body, isread) in enumerate(NOTIF_TEACHER[: 2 + uid % 3]):
        nrows.append(f"({uid}, '{title}', '{body}', {isread}, DATE_SUB(NOW(), INTERVAL {(k * 5) % 70 + 4} HOUR))")
        k += 1
for i in range(24):
    uid = 50 + i
    for j, (title, body, isread) in enumerate(NOTIF_LEARNER[: 1 + i % 3]):
        nrows.append(f"({uid}, '{title}', '{body}', {isread}, DATE_SUB(NOW(), INTERVAL {(i * 7 + j * 11) % 60 + 2} HOUR))")
        k += 1
A(",\n".join(nrows) + ";")

# ───────────────────────────── 10. support messages ─────────────────────────────
SUPPORT = [
    ("مریم حسینی", "09352001005", "سلام، برای ثبت‌نام به‌عنوان استاد چه مدارکی لازم است؟"),
    ("علی رضایی", "09352001002", "کیف پولم شارژ شد ولی جلسه رزرو نشد. لطفاً بررسی کنید."),
    ("فاطمه کریمی", "09352001003", "امکان انتخاب استاد خانم برای دخترم وجود دارد؟"),
    ("مهدی نادری", "09352001008", "درگاه پرداخت موقع شارژ خطا داد؛ مبلغ کم شد ولی کیف پول پر نشد."),
    ("فائزه تهرانی", "09352001017", "پیشنهاد: کاش امکان دانلود صوت جلسات هم بود. ممنون از اپ خوبتون 🌸"),
]
A("INSERT INTO support_messages (id, name, contact, message, status, created_at) VALUES")
A(",\n".join(
    f"({100 + i}, '{name}', '{contact}', '{msg}', '{'new' if i % 2 == 0 else 'resolved'}', DATE_SUB(NOW(), INTERVAL {3 + i * 14} HOUR))"
    for i, (name, contact, msg) in enumerate(SUPPORT)
) + ";")

A("-- done.")
print("\n".join(L))
