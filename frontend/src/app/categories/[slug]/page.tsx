import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, type Teacher } from '@/lib/api';
import { enrichTeacherPayload, sortTeacherRowsTier1First } from '@/lib/server/tier1';
import { groupCatalog, categoryOf, teachersForCategory, type CatalogRow } from '@/lib/category';
import { serviceImageKey, serviceImageSrc } from '@/lib/home/discover';
import { formatFaNumber } from '@/lib/persian';
import { Nav, Footer, WebTeacherCard } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { WebBtn } from '@/components/web/ui';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

/** ۰.۷.۵ — دستهٔ رسمی از اسلاگ (نام کدشدهٔ دسته) پیدا می‌شود. */
async function resolveCategory(slug: string): Promise<{ name: string } | null> {
  let name = '';
  try {
    name = decodeURIComponent(slug).trim();
  } catch {
    return null;
  }
  if (!name) return null;
  try {
    const response = await api.catalog();
    const rows: CatalogRow[] = response.data?.categories.flatMap((group) =>
      group.services.map((service) => ({ ...service, category: group.category })),
    ) ?? [];
    const category = categoryOf(groupCatalog(rows), name);
    if (!category) return null;
    return { name: category.category };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hit = await resolveCategory(slug);
  return { title: hit ? `زیردسته‌های «${hit.name}» — وُدّا` : 'دسته‌بندی موضوعات' };
}

/** ۰.۷.۵ — صفحهٔ دسته‌بندی: کلیک روی دسته از صفحهٔ نخست → این‌جا زیردسته‌های همان دسته
    با تصویر موضوعی نمایش داده می‌شود؛ انتخاب زیردسته → اساتید همان خدمت + رزرو جلسهٔ آنلاین. */
export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const hit = await resolveCategory(slug);
  if (!hit) notFound();
  const name = hit.name;

  let topics: { id: number; title: string; description?: string }[] = [];
  let teachers: Teacher[] = [];
  let unavailable = false;
  try {
    const [catalogResponse, teachersResponse] = await Promise.all([
      api.catalog(),
      api.teachers('', { limit: '100' }),
    ]);
    const rows: CatalogRow[] = catalogResponse.data?.categories.flatMap((group) =>
      group.services.map((service) => ({ ...service, category: group.category })),
    ) ?? [];
    const catalog = groupCatalog(rows);
    const category = categoryOf(catalog, name);
    if (!category) notFound();
    topics = category.topics.map((topic) => ({ id: topic.id, title: topic.title, description: topic.description }));
    const enriched = (await enrichTeacherPayload(teachersResponse.data || [])) as Teacher[];
    teachers = sortTeacherRowsTier1First(teachersForCategory(enriched, category));
  } catch {
    unavailable = true;
  }

  const heroImage = serviceImageSrc(serviceImageKey(name));

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main className="public-container" style={{ flex: 1 }}>
        <section className="vcat-head" aria-label={`دستهٔ ${name}`}>
          <div className="vcat-hero">
            {/* تصویر موضوعی دسته — همان تصویرسازی زیبای باندل‌شده */}
            <img
              className="vcat-hero-img"
              src={heroImage}
              alt=""
              width={88}
              height={88}
              loading="eager"
            />
            <span className="vcat-hero-text">
              <span className="vcat-kicker">
                <Icon name="quran" size={14} />
                دستهٔ قرآنی
              </span>
              <h1 className="vcat-title">{name}</h1>
              <p className="vcat-sub">
                {formatFaNumber(topics.length)} زیردستهٔ رسمی · {formatFaNumber(teachers.length)} استاد فعال — زیردسته را انتخاب کنید تا جلسهٔ آنلاین همان موضوع را رزرو کنید.
              </p>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <WebBtn variant="ghost" size="sm" icon="arrowL" href="/">بازگشت به صفحهٔ نخست</WebBtn>
            <WebBtn variant="ghost" size="sm" icon="search" href={`/search?category=${encodeURIComponent(name)}`}>جستجو در این دسته</WebBtn>
          </div>
        </section>

        {/* زیردسته‌های همین دسته — هویت طلایی، هر کارت → اساتید همان خدمت + رزرو */}
        {topics.length > 0 ? (
          <section style={{ marginTop: 10 }} aria-label="زیردسته‌های این دسته">
            <div className="vcat-grid">
              {topics.map((topic, index) => (
                <a
                  key={topic.id}
                  href={`/services/${topic.id}/teachers`}
                  className="vodda-service-card vsc-popular"
                  style={{ animationDelay: `${index * 40}ms` }}
                  aria-label={`اساتید و رزرو جلسهٔ آنلاین ${topic.title}`}
                >
                  <span className="vsc-banner" aria-hidden="true">
                    <img
                      src={serviceImageSrc(serviceImageKey(`${topic.title} ${name}`))}
                      alt=""
                      width={252}
                      height={96}
                      loading="lazy"
                    />
                    <span className="vsc-banner-tint" />
                  </span>
                  <span className="vsc-body">
                    <strong className="vsc-title">{topic.title}</strong>
                    <span className="vsc-foot">
                      <span className="vsc-cta">رزرو جلسهٔ آنلاین<Icon name="arrowL" size={13} /></span>
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : (
          <div className="landing-empty-state" role="status">
            <span><Icon name="book" size={27} /></span>
            <strong>{unavailable ? 'ارتباط با فهرست خدمات برقرار نیست' : 'زیردسته‌ای برای این دسته ثبت نشده'}</strong>
            <p>{unavailable ? 'چند لحظه بعد دوباره تلاش کنید.' : 'به‌زودی زیردسته‌های این دسته این‌جا نمایش داده می‌شوند.'}</p>
          </div>
        )}

        {/* اساتید همین دسته داخل کادر افقی کم‌رنگ (مثل اسنپ‌داکتر) */}
        {teachers.length > 0 ? (
          <section style={{ margin: '34px 0 30px' }} aria-label="اساتید این دسته">
            <h2 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 900, color: 'var(--ink, #2e3622)' }}>
              اساتید «{name}»
            </h2>
            <div className="vodda-teachers-frame">
              <div className="vodda-hscroll vodda-teacher-row">
                {teachers.slice(0, 12).map((teacher) => <WebTeacherCard key={teacher.id} teacher={teacher} />)}
              </div>
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
