import Link from 'next/link';
import type { Metadata } from 'next';
import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { faBlogDate, fetchPostBySlug, fetchPublishedPosts, parseContent, readTimeLabel, type ContentBlock } from '@/lib/blog';
import { formatFaNumber } from '@/lib/persian';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await fetchPostBySlug(decodeURIComponent(slug));
  const post = result?.data;
  if (!post) {
    return { title: 'مقاله یافت نشد · وُدّا' };
  }
  const description = post.excerpt || post.title;
  return {
    title: `${post.title} · وبلاگ وُدّا`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      publishedTime: post.published_at || post.created_at,
      images: post.cover_url ? [post.cover_url] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const result = await fetchPostBySlug(decodeURIComponent(slug));
  const post = result?.data;

  if (!post) {
    return (
      <div style={{ background: 'var(--sand-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Nav />
        <main className="public-container public-content" style={{ flex: 1, display: 'grid', placeItems: 'center', padding: '48px 0' }}>
          <div className="blog-empty">
            <span><Icon name="doc" size={26} /></span>
            <strong>این مقاله پیدا نشد</strong>
            <p>ممکن است نشانی تغییر کرده یا مقاله هنوز منتشر نشده باشد.</p>
            <Link className="ops-button" data-tone="primary" href="/blog">بازگشت به وبلاگ</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const blocks = parseContent(post.content || '');
  const relatedResult = await fetchPublishedPosts({ category: post.category || undefined, limit: 4 });
  const related = (relatedResult?.data || []).filter((item) => item.id !== post.id).slice(0, 3);
  const shareUrl = `/blog/${encodeURIComponent(post.slug)}`;

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <main className="public-container public-content" style={{ flex: 1, maxWidth: 780 }}>
        <nav aria-label="مسیر صفحه" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, fontSize: 11, color: 'var(--ink-3)' }}>
          <Link href="/" style={{ color: 'inherit' }}>خانه</Link>
          <Icon name="chevronL" size={11} style={{ transform: 'rotate(180deg)' }} />
          <Link href="/blog" style={{ color: 'inherit' }}>وبلاگ</Link>
          <Icon name="chevronL" size={11} style={{ transform: 'rotate(180deg)' }} />
          <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{post.title}</span>
        </nav>

        <article className="blog-article">
          <header>
            {post.category && <span className="blog-article-cat">{post.category}</span>}
            <h1>{post.title}</h1>
            <div className="blog-article-meta">
              <span><Icon name="clock" size={14} /> {readTimeLabel(post.read_minutes)}</span>
              <span><Icon name="trending" size={14} /> {formatFaNumber(post.views)} بازدید</span>
              <span><Icon name="calendar" size={14} /> {faBlogDate(post.published_at || post.created_at)}</span>
            </div>
          </header>

          {post.cover_url && (
            <img
              src={post.cover_url}
              alt={post.title}
              className="blog-article-cover"
            />
          )}

          <div className="blog-article-body">
            {blocks.map((block, index) => (
              <ContentRenderer key={index} block={block} />
            ))}
          </div>

          <footer className="blog-article-footer">
            <span>نوشتهٔ تحریریهٔ وُدّا</span>
            <div className="blog-share">
              <span>اشتراک‌گذاری:</span>
              <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`} target="_blank" rel="noopener noreferrer" aria-label="اشتراک‌گذاری در تلگرام">
                <Icon name="arrowUpRight" size={15} />
              </a>
              <a href={`https://wa.me/?text=${encodeURIComponent(`${post.title} — vodda.ir${shareUrl}`)}`} target="_blank" rel="noopener noreferrer" aria-label="اشتراک‌گذاری در واتساپ">
                <Icon name="message" size={15} />
              </a>
            </div>
          </footer>
        </article>

        {related.length > 0 && (
          <section aria-label="مطالب مرتبط" style={{ marginTop: 34 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 15.5, fontWeight: 800 }}>مطالب مرتبط</h2>
            <div className="blog-grid">
              {related.map((item) => (
                <Link key={item.id} href={`/blog/${encodeURIComponent(item.slug)}`} className="blog-card" style={{ display: 'block', color: 'inherit' }}>
                  <span className="blog-card-body" style={{ display: 'block' }}>
                    <span className="blog-card-meta">
                      <span>{item.category || 'آموزش'}</span>
                      <time dateTime={item.published_at || item.created_at}>{faBlogDate(item.published_at || item.created_at)}</time>
                    </span>
                    <h2>{item.title}</h2>
                    <p>{item.excerpt}</p>
                    <span className="blog-card-action">ادامه مطلب <Icon name="arrowL" size={15} /></span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
          <Link className="ops-button" href="/blog"><Icon name="arrowL" size={15} /> همه مقالات وبلاگ</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ContentRenderer({ block }: { block: ContentBlock }) {
  if (block.kind === 'heading') {
    return <h2 className="blog-article-h2">{block.text}</h2>;
  }
  if (block.kind === 'list') {
    return (
      <ul className="blog-article-list">
        {block.items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    );
  }
  return <p>{block.text}</p>;
}
