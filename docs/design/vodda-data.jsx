// vodda-data.jsx — mock data (Persian, religious context)

const TEACHERS = [
  {
    id: 't1', name: 'استاد عباس ملک‌محمدی', short: 'عباس ملک‌محمدی',
    field: 'آموزش قرآن کریم', tag: 'حافظ و قاری', level: 'پیشرفته',
    city: 'قم', rating: 4.9, reviews: 210, sessions: 25, followers: 2521,
    price30: 85000, price60: 150000, female: false, verified: true, fav: false,
    bio: 'مربی و مدرس قرآن کریم با بیش از ۱۲ سال سابقه. همکاری با مرکز قرآن و حدیث کریمهٔ اهل‌بیت (سلام‌الله علیها). تمرکز بر تجوید، صوت و لحن، و روان‌خوانی.',
    skills: ['تجوید', 'صوت و لحن', 'روان‌خوانی', 'حفظ جزء ۳۰'],
    services: [
      { id: 's1', title: 'چگونه قاری قرآن شوم؟', dur: '۳۰ دقیقه', price: 85000, icon: 'quran' },
      { id: 's2', title: 'تصحیح قرائت و تجوید', dur: '۳۰ دقیقه', price: 85000, icon: 'book' },
      { id: 's3', title: 'آموزش مقامات و صوت', dur: '۶۰ دقیقه', price: 150000, icon: 'mic' },
    ],
    samples: [
      { id: 'a1', title: 'تلاوت سورهٔ الرحمن', len: '۲:۴۵' },
      { id: 'a2', title: 'تمرین مقام بیات', len: '۱:۱۰' },
    ],
  },
  {
    id: 't2', name: 'استاد محمد ملک‌مطیعی', short: 'محمد ملک‌مطیعی',
    field: 'مداحی اهل‌بیت', tag: 'مداح و ذاکر', level: 'پیشرفته',
    city: 'تهران', rating: 4.8, reviews: 168, sessions: 31, followers: 1840,
    price30: 90000, price60: 160000, female: false, verified: true, fav: true,
    bio: 'مداح و ذاکر اهل‌بیت با سبک سنتی و نوحه‌خوانی. آموزش پایهٔ مداحی، تنظیم نفس، و آشنایی با دستگاه‌های آوازی.',
    skills: ['نوحه‌خوانی', 'تک‌خوانی', 'دستگاه آوازی', 'مقتل‌خوانی'],
    services: [
      { id: 's1', title: 'مبانی مداحی برای مبتدیان', dur: '۶۰ دقیقه', price: 160000, icon: 'mic' },
      { id: 's2', title: 'تنظیم نفس و صدا', dur: '۳۰ دقیقه', price: 90000, icon: 'headphones' },
    ],
    samples: [{ id: 'a1', title: 'نمونهٔ نوحهٔ سنتی', len: '۳:۲۰' }],
  },
  {
    id: 't3', name: 'استاد مریم رضوی', short: 'مریم رضوی',
    field: 'آموزش قرآن کریم', tag: 'حافظ کل', level: 'پیشرفته',
    city: 'مشهد', rating: 5.0, reviews: 409, sessions: 52, followers: 3110,
    price30: 95000, price60: 170000, female: true, verified: true, fav: false,
    bio: 'حافظ کل قرآن کریم و مدرس بانوان. تمرکز بر آموزش روخوانی و روان‌خوانی برای خواهران و کودکان، با شیوه‌ای صبورانه و گام‌به‌گام.',
    skills: ['روخوانی', 'روان‌خوانی', 'حفظ', 'ویژهٔ بانوان'],
    services: [
      { id: 's1', title: 'روخوانی از پایه', dur: '۳۰ دقیقه', price: 95000, icon: 'book' },
      { id: 's2', title: 'دورهٔ حفظ جزء', dur: '۶۰ دقیقه', price: 170000, icon: 'quran' },
    ],
    samples: [{ id: 'a1', title: 'تلاوت سورهٔ مریم', len: '۴:۰۵' }],
  },
  {
    id: 't4', name: 'استاد علی کبیری', short: 'علی کبیری',
    field: 'آموزش قرآن کریم', tag: 'قاری ممتاز', level: 'متوسط',
    city: 'اصفهان', rating: 4.7, reviews: 96, sessions: 18, followers: 980,
    price30: 70000, price60: 120000, female: false, verified: false, fav: false,
    bio: 'قاری ممتاز کشوری، علاقه‌مند به آموزش نوجوانان. تمرکز بر اعتمادبه‌نفس در قرائت و آمادگی برای مسابقات.',
    skills: ['قرائت', 'مسابقات', 'نوجوانان'],
    services: [{ id: 's1', title: 'آمادگی مسابقات قرآن', dur: '۳۰ دقیقه', price: 70000, icon: 'award' }],
    samples: [{ id: 'a1', title: 'قرائت ترتیل', len: '۲:۰۰' }],
  },
  {
    id: 't5', name: 'استاد فاطمه حسینی', short: 'فاطمه حسینی',
    field: 'مداحی اهل‌بیت', tag: 'ذاکرهٔ اهل‌بیت', level: 'متوسط',
    city: 'قم', rating: 4.9, reviews: 142, sessions: 27, followers: 1520,
    price30: 80000, price60: 140000, female: true, verified: true, fav: false,
    bio: 'ذاکرهٔ اهل‌بیت ویژهٔ مجالس بانوان. آموزش مرثیه‌خوانی و مدیحه‌سرایی با لحن دلنشین.',
    skills: ['مرثیه', 'مدیحه', 'ویژهٔ بانوان'],
    services: [{ id: 's1', title: 'آموزش مرثیه‌خوانی', dur: '۶۰ دقیقه', price: 140000, icon: 'mic' }],
    samples: [{ id: 'a1', title: 'مدیحهٔ حضرت زهرا (س)', len: '۲:۳۰' }],
  },
  {
    id: 't6', name: 'استاد احمد شعبانی', short: 'احمد شعبانی',
    field: 'آموزش قرآن کریم', tag: 'مدرس تجوید', level: 'پیشرفته',
    city: 'شیراز', rating: 4.6, reviews: 73, sessions: 14, followers: 640,
    price30: 75000, price60: 130000, female: false, verified: false, fav: false,
    bio: 'مدرس تجوید و وقف و ابتدا، با روشی ساده و کاربردی برای بزرگسالان.',
    skills: ['تجوید', 'وقف و ابتدا', 'بزرگسالان'],
    services: [{ id: 's1', title: 'دورهٔ تجوید کاربردی', dur: '۳۰ دقیقه', price: 75000, icon: 'book' }],
    samples: [{ id: 'a1', title: 'درس تجوید: مدّ', len: '۱:۴۵' }],
  },
];

const SESSIONS = [
  { id: 'm1', teacher: 't1', service: 'تصحیح قرائت و تجوید', date: 'سه‌شنبه ۲۳ بهمن', time: '۱۸:۰۰', dur: '۳۰ دقیقه', price: 85000, status: 'confirmed', when: 'upcoming', minsTo: 42 },
  { id: 'm2', teacher: 't3', service: 'روخوانی از پایه', date: 'پنج‌شنبه ۲۵ بهمن', time: '۱۰:۳۰', dur: '۳۰ دقیقه', price: 95000, status: 'pending', when: 'upcoming' },
  { id: 'm3', teacher: 't2', service: 'مبانی مداحی برای مبتدیان', date: 'یکشنبه ۲۰ بهمن', time: '۲۰:۰۰', dur: '۶۰ دقیقه', price: 160000, status: 'done', when: 'past', rated: false },
  { id: 'm4', teacher: 't1', service: 'چگونه قاری قرآن شوم؟', date: 'چهارشنبه ۱۶ بهمن', time: '۱۷:۰۰', dur: '۳۰ دقیقه', price: 85000, status: 'done', when: 'past', rated: true, myRating: 5 },
  { id: 'm5', teacher: 't4', service: 'آمادگی مسابقات قرآن', date: 'دوشنبه ۱۴ بهمن', time: '۱۶:۳۰', dur: '۳۰ دقیقه', price: 70000, status: 'canceled', when: 'past' },
];

const REVIEWS = [
  { id: 'r1', name: 'مجتبی ش.', rating: 5, text: 'استاد بسیار صبور و دلسوزی هستند. تلفظ‌های من خیلی بهتر شد.', date: '۳ روز پیش' },
  { id: 'r2', name: 'سکینه ر.', rating: 5, text: 'جلسه خیلی منظم و مفید بود. حتماً ادامه می‌دهم.', date: 'یک هفته پیش' },
  { id: 'r3', name: 'حسین ک.', rating: 4, text: 'آموزش خوب بود، فقط کاش زمان جلسه کمی بیشتر بود.', date: '۲ هفته پیش' },
];

const TX = [
  { id: 'x1', type: 'charge', title: 'شارژ کیف پول', date: '۲۲ بهمن', amount: 200000 },
  { id: 'x2', type: 'session', title: 'جلسه با عباس ملک‌محمدی', date: '۱۶ بهمن', amount: -85000 },
  { id: 'x3', type: 'charge', title: 'شارژ کیف پول', date: '۱۰ بهمن', amount: 150000 },
  { id: 'x4', type: 'session', title: 'جلسه با محمد ملک‌مطیعی', date: '۲۰ بهمن', amount: -160000 },
];

const USER = { name: 'مجتبی شعبان‌زاده', first: 'مجتبی', wallet: 105000, city: 'قم' };

const teacherById = (id) => TEACHERS.find(t => t.id === id);

Object.assign(window, { TEACHERS, SESSIONS, REVIEWS, TX, USER, teacherById });
