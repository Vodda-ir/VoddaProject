import Link from 'next/link';
import type { Metadata } from 'next';
import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { PublicPageHero } from '@/components/web/ui';
import { faBlogDate, fetchPublishedPosts, readTimeLabel, type BlogPost } from '@/lib/blog';
import { formatFaNumber } from '@/lib/persian';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'وبلاگ · وُدّا',
  description: 'مقالات آموزشی قرآن: حفظ، تجوید، روخوانی و راهنمای یادگیری در آکادمی آنلاین وُدّا.',
};

const PAGE_SIZE = 12;

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ cat?: string; page?: string }> }) {
  const { cat, page } = await searchParams;
  const pageIndex = Math.max(0, Number(page || 0) || 0);
  const result = await fetchPublishedPosts({
    category: cat || undefined,
    limit: PAGE_SIZE,
    offset: pageIndex * PAGE_SIZE,
  });
  const posts = result?.data || [];
  const total = Number(result?.total || 0);
  const hasMore = (pageIndex + 1) * PAGE_SIZE < total;

  // derive category chips from a wide sample (cheap; blog volume is small)
  const allResult = await fetchPublishedPosts({ limit: 50 });
  const categories = Array.from(new Set((allResult?.data || []).map((post) => post.category).filter(Boolean)));

  const moreQuery = (nextPage: number) => {
    const params = new URLSearchParams();
    if (cat) params.set('cat', cat);
    if (nextPage > 0) params.set('page', String(nextPage));
    const query = params.toString();
    return `/blog${query ? `?${query}` : ''}`;
  };

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <PublicPageHero
        kicker="وبلاگ وُدّا"
        title="مطالب آموزشی برای مسیر یادگیری"
        description="مجموعه‌ای از مقالات درباره آموزش قرآن، تجوید، حفظ و تجربهٔ بهتر کلاس آنلاین."
        icon="book"
      />

      <main className="public-container public-content" style={{ flex: 1 }}>
        {categories.length > 0 && (
          <nav aria-label="دسته‌بندی مقالات" className="blog-cats" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
            <Link href="/blog" className="blog-cat" data-active={!cat ? 'true' : undefined}>همه</Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={`/blog?cat=${encodeURIComponent(category)}`}
                className="blog-cat"
                data-active={cat === category ? 'true' : undefined}
              >
                {category}
              </Link>
            ))}
          </nav>
        )}

        {posts.length === 0 ? (
          <div className="blog-empty">
            <span><Icon name="doc" size={26} /></span>
            <strong>{cat ? 'مقاله‌ای در این دسته منتشر نشده است' : 'به‌زودی نخستین مقاله‌ها منتشر می‌شود'}</strong>
            <p>تیم آموزشی وُدّا مشغول آماده‌سازی مطالب کاربردی برای مسیر یادگیری قرآن است.</p>
            {cat && <Link className="ops-button" data-tone="primary" href="/blog">مشاهده همه مقالات</Link>}
          </div>
        ) : (
          <div className="blog-grid">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {(pageIndex > 0 || hasMore) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 26 }}>
            {pageIndex > 0 && (
              <Link className="ops-button" href={moreQuery(pageIndex - 1)}>مطالب تازه‌تر</Link>
            )}
            {hasMore && (
              <Link className="ops-button" data-tone="primary" href={moreQuery(pageIndex + 1)}>مطالب قدیمی‌تر</Link>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="blog-card" style={{ display: 'block', color: 'inherit' }}>
      {post.cover_url ? (
        <span className="blog-card-cover" style={{ display: 'block', height: 142, overflow: 'hidden' }}>
          <img
            src={post.cover_url}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </span>
      ) : (
        <span className="blog-card-visual">
          <span><Icon name="quran" size={32} /></span>
        </span>
      )}
      <span className="blog-card-body" style={{ display: 'block' }}>
        <span className="blog-card-meta">
          <span>{post.category || 'آموزش'}</span>
          <time dateTime={post.published_at || post.created_at}>{faBlogDate(post.published_at || post.created_at)}</time>
        </span>
        <h2>{post.title}</h2>
        <p>{post.excerpt}</p>
        <span className="blog-card-action">
          ادامه مطلب <Icon name="arrowL" size={15} />
        </span>
        <span className="blog-card-foot" style={{ display: 'flex', gap: 12, marginTop: 10, color: 'var(--ink-4)', fontSize: 9.5 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="clock" size={12} /> {readTimeLabel(post.read_minutes)}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon name="trending" size={12} /> {formatFaNumber(post.views)} بازدید
          </span>
        </span>
      </span>
    </Link>
  );
}
