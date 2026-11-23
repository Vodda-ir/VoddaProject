/*
 * ۱.ب — موتور کشف صفحهٔ نخست (اشتراکی اپ + وب — پارتی کامل).
 *
 * خروجی‌های مشخصات این فایل:
 *   ۱.ب.۴ — خدمات رایگان: استخراج خدمت‌های price=0، چیدمان بر پایهٔ rank استاد.
 *   ۱.ب.۵ — اساتید پیشنهادی: نامزد امتیاز ≥ ۵۰ → درجه ۱ مقدم → rank نزولی →
 *           انتخاب وزنی تصادفی ۷ نفر از ۲۰ نامزد برتر (وزن = rank) با
 *           «تکرار ≤ ۲ نسبت به چیدمان قبلی».
 *   ۱.ب.۶ — خدمات پرکاربرد: ۸ خدمت رسمی پراستاد، شمارش واقعی اساتید هر خدمت.
 *   ۱.ب.۳ — خانه‌های دسته‌بندی: ۶ دستهٔ رسمی با شمارش استاد واقعی.
 *
 * هیچ وابستگی به React/Next — در هر دو کلاینت یکسان اجرا می‌شود.
 */

/* ─────────────────  شکل‌های ورودی (سازگار با هر دو کلاینت)  ───────────────── */

export type DiscoverServiceLike = {
  id?: number;
  official_service_id?: number;
  title?: string;
  duration?: number | null;
  price?: number | null;
  active?: boolean | null;
};

/** کمینهٔ ساختاری که از Teacher اپ و Teacher وب هر دو ارضا می‌شود. */
export type DiscoverTeacherLike = {
  id: number;
  name?: string;
  city?: string;
  tier?: string | null;
  /** وب: is_tier1 / اپ: isTier1 */
  is_tier1?: boolean;
  isTier1?: boolean;
  rating?: number;
  reviews?: number;
  sessions?: number;
  bio?: string | null;
  avatarUrl?: string;
  avatar_url?: string;
  available?: boolean | null;
  /** وب: نام/آواتار داخل user است. */
  user?: { name?: string; avatar_url?: string } | null;
  services?: DiscoverServiceLike[] | null;
};

export type CatalogTopicLike = { id: number; title: string };
export type CatalogCategoryLike = { category: string; topics: CatalogTopicLike[] };

/* ─────────────────  rank و امتیاز کشف  ───────────────── */

/** وزن درجه استاد — تیک بین‌المللی > کشوری > استانی > بدون درجه. */
const TIER_WEIGHT: Record<string, number> = {
  international: 300,
  grade2: 200,
  grade3: 100,
};

export function isTier1Teacher(teacher: DiscoverTeacherLike): boolean {
  return teacher.is_tier1 === true || teacher.isTier1 === true;
}

/**
 * rank استاد — عدد قطعی برای چیدمان و وزن انتخاب تصادفی.
 * درجه × ۱۰۰۰۰ + جلسات × ۱۰ + امتیاز × ۲ — پایدار بین دو درخواست.
 */
export function teacherRankScore(teacher: DiscoverTeacherLike): number {
  const tierWeight = TIER_WEIGHT[teacher.tier ?? ""] ?? 0;
  const sessions = Math.max(0, Math.round(teacher.sessions ?? 0));
  const rating = Math.max(0, teacher.rating ?? 0);
  const reviews = Math.max(0, Math.round(teacher.reviews ?? 0));
  return tierWeight * 10000 + sessions * 10 + Math.round(rating * 2) + reviews;
}

/** مرتب‌ساز مشترک: درجه ۱ مقدم، سپس rank نزولی (پایدار). */
export function byDiscoveryRank(left: DiscoverTeacherLike, right: DiscoverTeacherLike): number {
  const tier1 = Number(isTier1Teacher(right)) - Number(isTier1Teacher(left));
  if (tier1 !== 0) return tier1;
  return teacherRankScore(right) - teacherRankScore(left);
}

/**
 * امتیاز کشف — اگر امتیاز واقعی گیمیفیکیشن (discovery_points از BFF) تزریق شده
 * باشد همان مقدم است؛ وگرنه قرینهٔ بذر گیمیفیکیشن (sessions×۵ + پروفایل کامل +
 * خدمات) از payload استاد محاسبه می‌شود. آستانهٔ نامزدها ۵۰ = سطح «فعال».
 */
export const DISCOVERY_MIN_SCORE = 50;

export function discoveryScore(teacher: DiscoverTeacherLike): number {
  const injected = (teacher as { discovery_points?: unknown }).discovery_points;
  if (typeof injected === "number" && Number.isFinite(injected) && injected > 0) {
    return injected;
  }
  const sessions = Math.max(0, Math.min(500, Math.round(teacher.sessions ?? 0)));
  const profileComplete =
    Boolean(teacher.bio?.trim()) &&
    Boolean(teacher.avatarUrl || teacher.avatar_url || teacher.user?.avatar_url);
  const hasService = Array.isArray(teacher.services) && teacher.services.length > 0;
  const reviews = Math.max(0, Math.round(teacher.reviews ?? 0));
  return sessions * 5 + (profileComplete ? 20 : 0) + (hasService ? 15 : 0) + Math.min(100, reviews * 2);
}

/* ─────────────────  ۱.ب.۵ — اساتید پیشنهادی  ───────────────── */

export const RECOMMEND_LIMIT = 7;
export const RECOMMEND_POOL_SIZE = 20;
export const RECOMMEND_MAX_REPEAT = 2;

/** انتخاب وزنی بدون جای‌گذاری — وزن هر استاد = rank او. */
function weightedSample(pool: DiscoverTeacherLike[], count: number, rand: () => number): DiscoverTeacherLike[] {
  const items = [...pool];
  const picked: DiscoverTeacherLike[] = [];
  while (picked.length < count && items.length > 0) {
    const weights = items.map((item) => Math.max(1, teacherRankScore(item)));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = rand() * total;
    let index = items.length - 1;
    for (let i = 0; i < items.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) {
        index = i;
        break;
      }
    }
    picked.push(items[index]);
    items.splice(index, 1);
  }
  return picked;
}

/**
 * چیدمان «اساتید پیشنهادی»:
 *  ① نامزدها: امتیاز کشف ≥ ۵۰ (اگر کمتر از حد لازم بود، از بقیه هم پُر می‌شود)
 *  ② ترتیب: درجه ۱ مقدم → rank نزولی → ۲۰ نامزد برتر
 *  ③ انتخاب وزنی تصادفی ۷ نفر (وزن = rank)
 *  ④ تکرار نسبت به چیدمان قبلی ≤ ۲ — تا ۱۰ تلاش، سپس سازش قطعی
 */
export function pickRecommendedTeachers(
  teachers: DiscoverTeacherLike[],
  previousIds: number[] = [],
  limit: number = RECOMMEND_LIMIT,
  rand: () => number = Math.random,
): DiscoverTeacherLike[] {
  if (teachers.length === 0) return [];
  const eligible = teachers.filter((teacher) => teacher.id > 0);
  if (eligible.length === 0) return [];
  const strong = eligible.filter((teacher) => discoveryScore(teacher) >= DISCOVERY_MIN_SCORE);
  const ordered = [...(strong.length >= limit ? strong : eligible)].sort(byDiscoveryRank);
  const source = ordered.slice(0, RECOMMEND_POOL_SIZE);
  const usable = source.length >= limit ? source : ordered;

  const previous = new Set(previousIds);
  let best: DiscoverTeacherLike[] | null = null;
  let bestOverlap = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const draw = weightedSample(usable, Math.min(limit, usable.length), rand);
    const overlap = draw.filter((teacher) => previous.has(teacher.id)).length;
    if (overlap <= RECOMMEND_MAX_REPEAT) return draw;
    if (overlap < bestOverlap) {
      bestOverlap = overlap;
      best = draw;
    }
  }

  if (best) {
    if (bestOverlap <= RECOMMEND_MAX_REPEAT) return best;
    /* سازش قطعی: حداکثر ۲ نفر از چیدمان قبلی (بالاترین rank) + پرکردن از ناآشناها */
    const keepIds = new Set(
      best
        .filter((teacher) => previous.has(teacher.id))
        .sort(byDiscoveryRank)
        .slice(0, RECOMMEND_MAX_REPEAT)
        .map((teacher) => teacher.id),
    );
    const freshPool = usable.filter((teacher) => !previous.has(teacher.id) || keepIds.has(teacher.id));
    const fresh = weightedSample(freshPool, Math.max(0, limit - keepIds.size), rand);
    return [...best.filter((teacher) => keepIds.has(teacher.id)), ...fresh].sort(byDiscoveryRank);
  }
  return [];
}

/* ─────────────────  ۱.ب.۴ — خدمات رایگان  ───────────────── */

export type FreeServiceCard = {
  /** شناسهٔ خدمتِ استاد (برای فیلتر پروفایل). */
  id: number;
  /** شناسهٔ خدمت رسمی کاتالوگ (برای لینک /services/:id/teachers). */
  officialServiceId: number;
  title: string;
  /** مدت جلسه به دقیقه. */
  duration: number;
  price: number;
  teacherId: number;
  teacherName: string;
  teacherCity: string;
  tier: string;
  isTier1: boolean;
  avatarUrl: string;
  available: boolean;
  /** ۰.۷.۵ — کلید تصویر موضوعی برای بنر کارت رایگان (هویت بصری دوم). */
  imageKey: string;
};

function serviceNameOf(service: DiscoverServiceLike, officialTitleById: Map<number, string>): string {
  const explicit = service.title?.trim();
  if (explicit) return explicit;
  const officialId = service.official_service_id ?? 0;
  return officialTitleById.get(officialId) ?? "";
}

function teacherNameOf(teacher: DiscoverTeacherLike): string {
  return (
    teacher.name?.trim() ||
    teacher.user?.name?.trim() ||
    "استاد وُدّا"
  );
}

function teacherAvatarOf(teacher: DiscoverTeacherLike): string {
  return teacher.avatarUrl || teacher.avatar_url || teacher.user?.avatar_url || "";
}

/**
 * استخراج خدمات رایگان (price === 0 و فعال) از فهرست استادان.
 * sort_by=teacher_rank — مرتب بر پایهٔ rank استاد؛ limit=0 یعنی همه.
 */
export function freeServiceCards(
  teachers: DiscoverTeacherLike[],
  officialTitleById: Map<number, string> = new Map(),
  limit = 0,
): FreeServiceCard[] {
  const cards: FreeServiceCard[] = [];
  const seen = new Set<string>();
  for (const teacher of teachers) {
    const services = Array.isArray(teacher.services) ? teacher.services : [];
    for (const service of services) {
      if (service.active === false) continue;
      if (Number(service.price ?? -1) !== 0) continue;
      const title = serviceNameOf(service, officialTitleById);
      if (!title) continue;
      const key = `${teacher.id}:${service.id ?? title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({
        id: Number(service.id ?? 0),
        officialServiceId: Number(service.official_service_id ?? 0),
        title,
        duration: Math.max(0, Math.round(service.duration ?? 0)),
        price: 0,
        teacherId: teacher.id,
        teacherName: teacherNameOf(teacher),
        teacherCity: teacher.city?.trim() ?? "",
        tier: teacher.tier ?? "",
        isTier1: isTier1Teacher(teacher),
        avatarUrl: teacherAvatarOf(teacher),
        available: teacher.available !== false,
        imageKey: serviceImageKey(title),
      });
    }
  }
  const rankById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  cards.sort((left, right) => {
    const diff = byDiscoveryRank(
      rankById.get(left.teacherId) ?? { id: left.teacherId },
      rankById.get(right.teacherId) ?? { id: right.teacherId },
    );
    if (diff !== 0) return diff;
    return right.teacherId - left.teacherId;
  });
  return limit > 0 ? cards.slice(0, limit) : cards;
}

/* ─────────────────  ۱.ب.۶ — خدمات پرکاربرد  ───────────────── */

export type PopularServiceCard = {
  id: number;
  title: string;
  category: string;
  /** شمارش واقعی اساتید این خدمت. */
  teacherCount: number;
  imageKey: string;
};

/** آیا استاد این موضوع رسمی را تدریس می‌کند؟ (قرینهٔ teachesTopic در category.ts) */
function teachesTopicLike(teacher: DiscoverTeacherLike, topic: CatalogTopicLike): boolean {
  const services = Array.isArray(teacher.services) ? teacher.services : [];
  return services.some(
    (service) =>
      (typeof service.official_service_id === "number" && service.official_service_id === topic.id) ||
      (service.title != null && service.title.trim() !== "" && service.title === topic.title),
  );
}

/** ۸ خدمت پرکاربرد — بیشترین شمارش استاد واقعی. */
export function popularServiceCards(
  teachers: DiscoverTeacherLike[],
  categories: CatalogCategoryLike[],
  limit = 8,
): PopularServiceCard[] {
  const rows: PopularServiceCard[] = [];
  for (const group of categories) {
    for (const topic of group.topics) {
      const teacherCount = teachers.filter((teacher) => teacher.id > 0 && teachesTopicLike(teacher, topic)).length;
      if (teacherCount <= 0) continue;
      rows.push({
        id: topic.id,
        title: topic.title,
        category: group.category,
        teacherCount,
        imageKey: serviceImageKey(`${topic.title} ${group.category}`),
      });
    }
  }
  rows.sort((left, right) => right.teacherCount - left.teacherCount || left.id - right.id);
  return rows.slice(0, limit);
}

/* ─────────────────  ۱.ب.۳ — خانه‌های دسته‌بندی  ───────────────── */

export type CategoryTile = {
  name: string;
  count: number;
  imageKey: string;
};

/** شش دستهٔ رسمی صفحهٔ نخست — نام واقعی کاتالوگ (قاعدهٔ فیلتر دقیق). */
export const HOME_CATEGORY_ORDER = [
  "قرآن‌آموزی پایه",
  "تجوید و علوم قرائت",
  "حفظ قرآن",
  "صوت و لحن و هنر قرآنی",
  "مفاهیم، تفسیر و علوم قرآن",
  "خدمات حضوری قرآنی",
];

/** شش خانهٔ صفحهٔ نخست — دسته‌های رسمی؛ اگر کاتالوگ کم داشت، از باقی دسته‌ها پُر می‌شود. */
export function buildCategoryTiles(
  teachers: DiscoverTeacherLike[],
  categories: CatalogCategoryLike[],
  limit = 6,
): CategoryTile[] {
  const tiles: CategoryTile[] = [];
  const byName = new Map(categories.map((group) => [group.category, group]));
  const used = new Set<string>();
  const pushTile = (group: CatalogCategoryLike) => {
    if (used.has(group.category) || tiles.length >= limit) return;
    used.add(group.category);
    const count = teachers.filter(
      (teacher) => teacher.id > 0 && group.topics.some((topic) => teachesTopicLike(teacher, topic)),
    ).length;
    tiles.push({ name: group.category, count, imageKey: serviceImageKey(group.category) });
  };
  for (const name of HOME_CATEGORY_ORDER) {
    const group = byName.get(name);
    if (group) pushTile(group);
  }
  for (const group of categories) pushTile(group);
  return tiles;
}

/* ─────────────────  تصویرهای خیالی خدمات (بنر کارت‌های پرکاربرد/دسته‌ها/رایگان)  ───────────────── */

const SERVICE_IMAGE_RULES: Array<{ match: RegExp; key: string }> = [
  { match: /اذان|اقامه/, key: "azan" },
  { match: /تجوید|قرائت|روایت|ترتیل|تصحیح/, key: "tajweed" },
  { match: /حفظ|محفوظات|مرور/, key: "hifz" },
  { match: /صوت|لحن|آوا|صدایی|مقام|تنفسی|آواز/, key: "voice" },
  { match: /تفسیر|مفاهیم|علوم|ترجمه|واژگان|دعا|زیارت/, key: "tafsir" },
  { match: /مراسم|مجلس|مجلسی|ختم|جشن|تواشیح|همخوانی|حضوری/, key: "mosque" },
  { match: /کودک|نوجوان|بانوان|ویژه/, key: "kids" },
  { match: /مسابقه|آمادگی|ارزیابی|رتبه/, key: "medal" },
  { match: /مشاوره|برنامه|تربیت مدرس|معلم/, key: "mentor" },
  /* روخوانی پیش از الفبا — تا کارت‌های همسایهٔ پرکاربرد بنر تکراری نگیرند */
  { match: /روخوانی/, key: "quran" },
  { match: /الفبا|پایه|قرآن‌آموزی|مبتدی|درست‌خوانی/, key: "alphabet" },
];

/** کلید تصویر خیالی خدمت/دسته — تصویرهای باندل‌شده در /avatars/services/srv-*.png. */
export function serviceImageKey(text: string): string {
  const haystack = text ?? "";
  for (const rule of SERVICE_IMAGE_RULES) {
    if (rule.match.test(haystack)) return rule.key;
  }
  return "quran";
}

/** نشانی تصویر خیالی — نسبتاً (وب، اپ وب‌میزبان و باندل نیتیو). */
export function serviceImageSrc(key: string): string {
  return `/avatars/services/srv-${key}.png`;
}
