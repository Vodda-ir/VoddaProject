import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { PublicPageHero } from '@/components/web/ui';

export const metadata = { title: 'وبلاگ · وُدّا' };

const posts = [
  { title: 'روش‌های مؤثر در حفظ قرآن کریم', excerpt: 'در این مقاله به بررسی روش‌های نوین و مؤثر در حفظ قرآن می‌پردازیم…', date: '۱۴۰۳/۰۴/۱۵', tag: 'حفظ', icon: 'quran' as const },
  { title: 'تجوید قرآن؛ قواعد پایه', excerpt: 'آشنایی با قواعد پایه‌ای تجوید برای شروع یادگیری تلاوت صحیح…', date: '۱۴۰۳/۰۴/۱۰', tag: 'تجوید', icon: 'book' as const },
  { title: 'تاریخچه مداحی در ایران', excerpt: 'نگاهی به سیر تطور مداحی و نقش آن در فرهنگ ایرانی-اسلامی…', date: '۱۴۰۳/۰۳/۲۸', tag: 'مداحی', icon: 'mic' as const },
];

export default function BlogPage() {
  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <PublicPageHero
        kicker="وبلاگ وُدّا"
        title="مطالب آموزشی برای مسیر یادگیری"
        description="مجموعه‌ای از مطالب درباره آموزش قرآن، تجوید، حفظ و مداحی."
        icon="book"
      />

      <main className="public-container public-content">
        <div className="blog-featured">
          <span className="blog-featured-icon"><Icon name="sparkle" size={23} /></span>
          <div>
            <small>یادداشت تحریریه</small>
            <strong>محتوای آموزشی وُدّا در حال تکمیل است</strong>
            <p>این بخش برای انتشار مطالب آموزشی و راهنماهای مرتبط با تجربهٔ محصول در نظر گرفته شده است.</p>
          </div>
        </div>

        <div className="blog-grid">
          {posts.map((post) => (
            <article key={post.title} className="blog-card">
              <div className="blog-card-visual">
                <span><Icon name={post.icon} size={32} /></span>
              </div>
              <div className="blog-card-body">
                <div className="blog-card-meta">
                  <span>{post.tag}</span>
                  <time>{post.date}</time>
                </div>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <span className="blog-card-action">ادامه مطلب <Icon name="arrowL" size={15} /></span>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
