// vodda-teacher-data.jsx — data for the teacher (مربی/استاد) side

// the logged-in user, as a teacher
const ME_TEACHER = {
  name: 'مجتبی شعبان‌زاده', short: 'مجتبی شعبان‌زاده',
  field: 'آموزش قرآن کریم', tag: 'مدرس تجوید و روان‌خوانی', level: 'پیشرفته',
  city: 'قم', rating: 4.8, reviews: 64, sessions: 38, followers: 412,
  verified: true,
  bio: 'مدرس قرآن کریم با تمرکز بر تجوید و روان‌خوانی بزرگسالان. علاقه‌مند به آموزش گام‌به‌گام و صبورانه.',
  skills: ['تجوید', 'روان‌خوانی', 'وقف و ابتدا', 'بزرگسالان'],
  services: [
    { id: 's1', title: 'تصحیح قرائت و تجوید', dur: '۳۰ دقیقه', price: 80000, icon: 'book', active: true },
    { id: 's2', title: 'روان‌خوانی از پایه', dur: '۳۰ دقیقه', price: 80000, icon: 'quran', active: true },
    { id: 's3', title: 'دورهٔ تجوید پیشرفته', dur: '۶۰ دقیقه', price: 140000, icon: 'award', active: false },
  ],
  balance: 1840000,
  pendingWithdraw: 0,
};

const T_EARN = { today: 240000, week: 1120000, month: 3650000, commission: 15 };

// incoming session requests
const REQUESTS = [
  { id: 'q1', learner: 'سکینه رضایی', service: 'تصحیح قرائت و تجوید', date: 'سه‌شنبه ۲۳ بهمن', time: '۱۸:۰۰', dur: '۳۰ دقیقه', price: 80000, note: 'می‌خواهم روی تلفظ حروف قلقله کار کنم.', status: 'new' },
  { id: 'q2', learner: 'حسین کریمی', service: 'روان‌خوانی از پایه', date: 'چهارشنبه ۲۴ بهمن', time: '۲۰:۳۰', dur: '۳۰ دقیقه', price: 80000, note: '', status: 'new' },
  { id: 'q3', learner: 'مریم احمدی', service: 'تصحیح قرائت و تجوید', date: 'پنج‌شنبه ۲۵ بهمن', time: '۱۰:۰۰', dur: '۳۰ دقیقه', price: 80000, note: 'آمادگی برای جلسهٔ قرآن خانوادگی.', status: 'new' },
];

// teacher's own sessions
const T_SESSIONS = [
  { id: 'ts1', learner: 'علی موسوی', service: 'تصحیح قرائت و تجوید', date: 'امروز', time: '۱۷:۰۰', dur: '۳۰ دقیقه', price: 80000, status: 'confirmed', when: 'upcoming', minsTo: 28 },
  { id: 'ts2', learner: 'زهرا نوری', service: 'روان‌خوانی از پایه', date: 'سه‌شنبه ۲۳ بهمن', time: '۱۹:۰۰', dur: '۳۰ دقیقه', price: 80000, status: 'confirmed', when: 'upcoming' },
  { id: 'ts3', learner: 'محمد رستمی', service: 'تصحیح قرائت و تجوید', date: 'یکشنبه ۲۰ بهمن', time: '۱۶:۰۰', dur: '۳۰ دقیقه', price: 80000, status: 'done', when: 'past', rated: true, learnerRating: 5 },
  { id: 'ts4', learner: 'فاطمه عباسی', service: 'روان‌خوانی از پایه', date: 'شنبه ۱۹ بهمن', time: '۱۱:۰۰', dur: '۳۰ دقیقه', price: 80000, status: 'done', when: 'past', rated: true, learnerRating: 4 },
];

// teacher wallet transactions
const T_TX = [
  { id: 'tx1', type: 'income', title: 'درآمد جلسه · علی موسوی', date: '۲۰ بهمن', gross: 80000, net: 68000 },
  { id: 'tx2', type: 'income', title: 'درآمد جلسه · زهرا نوری', date: '۱۹ بهمن', gross: 80000, net: 68000 },
  { id: 'tx3', type: 'withdraw', title: 'برداشت به حساب بانکی', date: '۱۵ بهمن', net: -1000000 },
  { id: 'tx4', type: 'income', title: 'درآمد جلسه · محمد رستمی', date: '۱۴ بهمن', gross: 140000, net: 119000 },
];

const WITHDRAWALS = [
  { id: 'w1', amount: 1000000, date: '۱۵ بهمن', status: 'paid', card: '۶۰۳۷-۹۹۱۴' },
  { id: 'w2', amount: 1500000, date: '۲ بهمن', status: 'paid', card: '۶۰۳۷-۹۹۱۴' },
];

// availability — days with time ranges
const WORK_TIMES = [
  { day: 'شنبه', on: true, ranges: ['۱۶:۰۰ تا ۲۱:۰۰'] },
  { day: 'یکشنبه', on: true, ranges: ['۱۰:۰۰ تا ۱۲:۰۰', '۱۷:۰۰ تا ۲۰:۰۰'] },
  { day: 'دوشنبه', on: false, ranges: [] },
  { day: 'سه‌شنبه', on: true, ranges: ['۱۶:۰۰ تا ۲۲:۰۰'] },
  { day: 'چهارشنبه', on: true, ranges: ['۱۸:۰۰ تا ۲۲:۰۰'] },
  { day: 'پنج‌شنبه', on: true, ranges: ['۰۹:۰۰ تا ۱۳:۰۰'] },
  { day: 'جمعه', on: false, ranges: [] },
];

Object.assign(window, { ME_TEACHER, T_EARN, REQUESTS, T_SESSIONS, T_TX, WITHDRAWALS, WORK_TIMES });
