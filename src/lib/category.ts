// باگ category-routing — فیلتر دسته‌بندی موضوعات بر پایهٔ کاتالوگ رسمی خدمات.
// ریشهٔ باگ: هیچ مسیر «دسته‌بندی → زیردسته → اساتید» وجود نداشت؛ کارت‌های صفحهٔ نخست
// از فیلد متنی استاد (teacher.field) فیلتر می‌کردند و چون همهٔ اساتید همان «آموزش قرآن کریم»
// را دارند، همیشه همهٔ اساتید برمی‌گشتند. API هم فیلتر چند-خدمتی ندارد
// (official_service_id=1,2,3,4,5 → نادیده گرفته می‌شود و ۴۵/۴۵ برمی‌گردد).
// راه‌حل: اجتماع اساتیدِ زیردسته‌های همان دسته، با تطبیق عنوان خدمت رسمی روی
// services هر استاد — با دادهٔ واقعی با خروجی official_service_id برابری شده است
// (موضوع ۱ → اساتید ۱ و ۲ در هر دو روش).

export type CatalogTopic = {
  id: number;
  title: string;
  description?: string;
  icon?: string;
};

export type CatalogCategory = {
  category: string;
  topics: CatalogTopic[];
};

export type CatalogRow = {
  id: number;
  category: string;
  title: string;
  description?: string;
  icon?: string;
};

/** فهرست تخت کاتالوگ را به دسته‌ها (با حفظ ترتیب سرور) گروه می‌کند. */
export function groupCatalog(rows: CatalogRow[]): CatalogCategory[] {
  const groups = new Map<string, CatalogCategory>();
  for (const row of rows) {
    if (!row.category || !row.title) continue;
    let group = groups.get(row.category);
    if (!group) {
      group = { category: row.category, topics: [] };
      groups.set(row.category, group);
    }
    if (!group.topics.some((topic) => topic.id === row.id)) {
      group.topics.push({ id: row.id, title: row.title, description: row.description, icon: row.icon });
    }
  }
  return [...groups.values()];
}

/** دستهٔ موردنظر با نام دقیق؛ نایافتنی → null. */
export function categoryOf(categories: CatalogCategory[], name: string): CatalogCategory | null {
  const needle = name?.trim();
  if (!needle) return null;
  return categories.find((group) => group.category === needle) ?? null;
}

type ServiceLike = { title?: string; official_service_id?: number };

type TeacherLike = {
  services?: ServiceLike[] | null;
};

/** آیا استاد این موضوع رسمی را تدریس می‌کند؟ تطبیق شناسهٔ رسمی یا عنوان دقیق خدمت. */
export function teachesTopic(teacher: TeacherLike, topic: CatalogTopic): boolean {
  const services = teacher.services ?? [];
  return services.some(
    (service) =>
      (typeof service.official_service_id === "number" && service.official_service_id === topic.id) ||
      service.title === topic.title,
  );
}

/** اجتماع اساتیدی که «حداقل یکی» از موضوع‌های داده‌شده را تدریس می‌کنند (بدون تکرار، حفظ ترتیب ورودی). */
export function teachersForTopics<T extends TeacherLike>(teachers: T[], topics: CatalogTopic[]): T[] {
  if (topics.length === 0) return [];
  return teachers.filter((teacher) => topics.some((topic) => teachesTopic(teacher, topic)));
}

/** اساتیدِ یک دستهٔ کامل (همهٔ زیردسته‌ها). */
export function teachersForCategory<T extends TeacherLike>(teachers: T[], category: CatalogCategory | null): T[] {
  if (!category) return [];
  return teachersForTopics(teachers, category.topics);
}

/** شمارش اساتیدِ هر دسته برای کارت‌های صفحهٔ نخست. */
export function categoryTeacherCounts<T extends TeacherLike>(teachers: T[], categories: CatalogCategory[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const category of categories) {
    counts.set(category.category, teachersForCategory(teachers, category).length);
  }
  return counts;
}
