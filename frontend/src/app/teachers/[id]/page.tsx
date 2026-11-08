import { api } from '@/lib/api';
import { Icon } from '@/components/Icon';
import { Avatar, PublicSurface, Stars, WebBtn } from '@/components/web/ui';
import { TierChip } from '@/components/web/tier';
import { Nav, Footer } from '@/components/web/sections';
import { fullUrl } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = Number.parseInt(id, 10);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  let teacher, reviews;
  try {
    const response = await api.teacher(numId);
    teacher = response.data.teacher;
    reviews = response.data.reviews || [];
  } catch {
    notFound();
  }

  const name = teacher.user?.name || 'استاد وُدّا';
  const services = teacher.services || [];
  const startingPrice = services.length
    ? Math.min(...services.map((service) => Math.max(0, service.price)))
    : Math.max(0, teacher.price30 || 0);

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />

      <main className="public-container teacher-public-page">
        <Link href="/search" className="teacher-back-link">
          <Icon name="arrowL" size={17} />
          بازگشت به جستجو
        </Link>

        <section className="teacher-public-hero">
          <div className="teacher-public-profile">
            <Avatar size={92} ring tier={teacher.tier} imageUrl={fullUrl(teacher.user?.avatar_url)} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="teacher-public-name-row">
                <h1>{name}</h1>
                <TierChip tier={teacher.tier} />
              </div>
              <strong className="teacher-public-tag">{teacher.tag || teacher.field || 'استاد وُدّا'}</strong>
              <div className="teacher-public-location">
                <Icon name="pin" size={15} />
                {teacher.city || 'شهر ثبت نشده'}
              </div>
            </div>
          </div>

          <div className="teacher-public-stats">
            <TeacherStat icon="star" value={teacher.reviews > 0 ? toFaDigits(teacher.rating.toFixed(1)) : '—'} label="امتیاز" />
            <TeacherStat icon="message" value={toFaDigits(teacher.reviews)} label="نظر" />
            <TeacherStat icon="calendar" value={toFaDigits(teacher.sessions)} label="جلسه" />
          </div>
        </section>

        <div className="teacher-public-layout">
          <div className="teacher-public-main">
            <section>
              <div className="teacher-public-section-title">
                <span><Icon name="user" size={18} /></span>
                <h2>دربارهٔ استاد</h2>
              </div>
              <p className="teacher-public-bio">{teacher.bio || 'اطلاعاتی ثبت نشده است.'}</p>
            </section>

            <section>
              <div className="teacher-public-section-title">
                <span><Icon name="book" size={18} /></span>
                <h2>خدمات تأییدشده</h2>
              </div>

              {services.length ? (
                <div className="teacher-service-list">
                  {services.map((service) => (
                    <PublicSurface key={service.id} style={{ padding: 15 }}>
                      <div className="teacher-service-row">
                        <span className="teacher-service-icon"><Icon name="book" size={20} /></span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <strong>{service.title}</strong>
                          <span>{toFaDigits(service.duration)} دقیقه</span>
                        </div>
                        <div className="teacher-service-price">
                          <strong>{formatFaNumber(service.price)}</strong>
                          <span>تومان</span>
                        </div>
                      </div>
                    </PublicSurface>
                  ))}
                </div>
              ) : (
                <div className="teacher-public-empty">
                  <Icon name="book" size={24} />
                  <span>خدمت تأییدشده‌ای ثبت نشده است.</span>
                </div>
              )}
            </section>

            {reviews.length > 0 && (
              <section>
                <div className="teacher-public-section-title">
                  <span><Icon name="message" size={18} /></span>
                  <h2>نظرهای پس از جلسه</h2>
                </div>

                <div className="teacher-review-grid">
                  {reviews.map((review) => (
                    <PublicSurface key={review.id} style={{ padding: 17 }}>
                      <div className="teacher-review-head">
                        <span>
                          <strong>{review.learner?.name || 'قرآن‌آموز وُدّا'}</strong>
                          <small>نظر ثبت‌شده پس از جلسه</small>
                        </span>
                        <Stars value={review.rating} size={13} />
                      </div>
                      {review.text && <p>{review.text}</p>}
                    </PublicSurface>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="teacher-booking-card">
            <span className="teacher-booking-icon"><Icon name="calendar" size={23} /></span>
            <small>رزرو جلسه</small>
            <strong>{services.length ? 'یک خدمت و زمان مناسب انتخاب کنید' : 'فعلاً خدمت قابل رزروی وجود ندارد'}</strong>
            <p>
              {services.length
                ? 'در مرحله بعد، خدمات تأییدشده و زمان‌های آزاد واقعی استاد را می‌بینید.'
                : 'پس از فعال‌شدن خدمت تأییدشده، امکان رزرو از همین صفحه فراهم می‌شود.'}
            </p>

            {startingPrice > 0 && (
              <div className="teacher-booking-price">
                <span>شروع از</span>
                <strong>{formatFaNumber(startingPrice)} تومان</strong>
              </div>
            )}

            {services.length ? (
              <WebBtn href={`/panel/user/book?teacher=${teacher.id}`} size="lg" icon="calendar" style={{ width: '100%' }}>
                رزرو جلسه
              </WebBtn>
            ) : (
              <span className="teacher-booking-disabled">رزرو غیرفعال است</span>
            )}

            <div className="teacher-booking-note">
              <Icon name="shield" size={16} />
              رزرو فقط بر اساس خدمات تأییدشده و بازه‌های معتبر انجام می‌شود.
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function TeacherStat({
  icon,
  value,
  label,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  value: string;
  label: string;
}) {
  return (
    <div>
      <Icon name={icon} size={19} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
