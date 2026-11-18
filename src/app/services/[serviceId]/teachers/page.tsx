import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { api, type Teacher } from '@/lib/api';
import { enrichTeacherPayload, sortTeacherRowsTier1First } from '@/lib/server/tier1';
import { groupCatalog, teachersForTopics, type CatalogRow } from '@/lib/category';
import { Nav, Footer, WebTeacherCard } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { WebBtn } from '@/components/web/ui';
import { formatFaNumber } from '@/lib/persian';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ serviceId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { serviceId } = await params;
  const id = Number.parseInt(serviceId, 10);
  if (!Number.isInteger(id)) return { title: 'اساتید خدمت' };
  try {
    const response = await api.catalog();
    const rows = response.data?.categories.flatMap((group) =>
      group.services.map((service) => ({ ...service, category: group.category })),
    ) ?? [];
    const hit = rows.find((row) => row.id === id);
    return { title: hit ? `اساتید «${hit.title}»` : 'اساتید خدمت' };
  } catch {
    return { title: 'اساتید خدمت' };
  }
}

/** ۱.ب.۶ — صفحهٔ «اساتید یک خدمت»: فقط استادانی که دقیقاً همان خدمت رسمی را تدریس می‌کنند. */
export default async function ServiceTeachersPage({ params }: PageProps) {
  const { serviceId } = await params;
  const id = Number.parseInt(serviceId, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let title = '';
  let category = '';
  let teachers: Teacher[] = [];
  try {
    const [catalogResponse, teachersResponse] = await Promise.all([
      api.catalog(),
      api.teachers('', { limit: '100' }),
    ]);
    const rows: CatalogRow[] = catalogResponse.data?.categories.flatMap((group) =>
      group.services.map((service) => ({ ...service, category: group.category })),
    ) ?? [];
    const hit = rows.find((row) => row.id === id);
    if (!hit) notFound();
    title = hit.title;
    category = hit.category;
    const enriched = (await enrichTeacherPayload(teachersResponse.data || [])) as Teacher[];
    const catalog = groupCatalog(rows);
    const topics = catalog
      .flatMap((group) => group.topics)
      .filter((topic) => topic.id === id);
    teachers = sortTeacherRowsTier1First(teachersForTopics(enriched, topics));
  } catch {
    title = title || 'اساتید خدمت';
  }

  if (!title) notFound();

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main className="public-container service-teachers-page" style={{ flex: 1 }}>
        <section className="service-teachers-head">
          <span className="service-teachers-badge"><Icon name="book" size={16} />{category}</span>
          <h1>اساتید «{title}»</h1>
          <p>
            فقط استادانی که این خدمت رسمی وُدّا را تدریس می‌کنند — {formatFaNumber(teachers.length)} استاد.
          </p>
          <WebBtn variant="ghost" size="sm" icon="arrowL" href="/">بازگشت به صفحهٔ نخست</WebBtn>
        </section>

        {teachers.length === 0 ? (
          <div className="landing-empty-state" role="status">
            <span><Icon name="users" size={27} /></span>
            <strong>هنوز استادی برای این خدمت منتشر نشده</strong>
            <p>به‌زودی اساتید این خدمت در همین صفحه دیده می‌شوند.</p>
          </div>
        ) : (
          <div className="landing-teacher-grid service-teachers-grid">
            {teachers.map((teacher) => <WebTeacherCard key={teacher.id} teacher={teacher} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
