import { api } from '@/lib/api';
import { Icon } from '@/components/Icon';
import { Avatar, Stars } from '@/components/web/ui';
import { Nav, Footer } from '@/components/web/sections';
import { fullUrl } from '@/lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const fa = (n: number | string) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const toman = (n: number) => fa(new Intl.NumberFormat('fa-IR').format(n));

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

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 60px' }}>
        <Link href="/search" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 24, textDecoration: 'none' }}>
          <Icon name="arrowL" size={18} /> بازگشت به جستجو
        </Link>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, flex: '1 1 320px', boxShadow: 'var(--sh-md)' }}>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 20 }}>
              <Avatar size={88} ring verified={teacher.verified} imageUrl={fullUrl(teacher.user?.avatar_url)} />
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{teacher.user?.name || 'استاد'}</h1>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--olive-600)', marginBottom: 6 }}>{teacher.tag}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}><Icon name="pin" size={15} /> {teacher.city || 'شهر ثبت نشده'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'space-around', paddingTop: 20, borderTop: '1px solid var(--sand-100)' }}>
              <Stat icon="star" value={teacher.reviews > 0 ? fa(teacher.rating.toFixed(1)) : '—'} label="امتیاز" />
              <Stat icon="message" value={fa(teacher.reviews)} label="نظر ثبت‌شده" />
              <Stat icon="calendar" value={fa(teacher.sessions)} label="جلسهٔ تکمیل‌شده" />
            </div>

            {teacher.services?.length ? (
              <Link href={`/panel/user/book?teacher=${teacher.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, padding: '14px 24px', borderRadius: 999, background: 'var(--olive-600)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: 'var(--sh-olive)' }}>
                <Icon name="calendar" size={20} /> رزرو جلسه
              </Link>
            ) : (
              <div style={{ marginTop: 24, padding: 14, borderRadius: 14, background: 'var(--sand-100)', color: 'var(--ink-3)', textAlign: 'center', fontSize: 14 }}>این استاد فعلاً خدمت قابل رزروی ندارد.</div>
            )}
          </div>

          <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: 'var(--sh-md)' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>دربارهٔ استاد</h2>
              <p style={{ fontSize: 14.5, lineHeight: 2, color: 'var(--ink-3)' }}>{teacher.bio || 'اطلاعاتی ثبت نشده است.'}</p>
            </div>
            <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: 'var(--sh-md)' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>خدمات تأییدشده</h2>
              {teacher.services?.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{teacher.services.map((service) => <div key={service.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, background: 'var(--sand-50)' }}><Icon name="book" size={22} style={{ color: 'var(--olive-600)' }} /><div style={{ flex: 1 }}><div style={{ fontSize: 14.5, fontWeight: 700 }}>{service.title}</div><div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{fa(service.duration)} دقیقه</div></div><div style={{ fontSize: 15, fontWeight: 800, color: 'var(--olive-700)' }}>{toman(service.price)} <span style={{ fontSize: 12 }}>تومان</span></div></div>)}</div> : <p style={{ fontSize: 14, color: 'var(--ink-4)' }}>خدمت تأییدشده‌ای ثبت نشده است.</p>}
            </div>
          </div>
        </div>

        {reviews.length > 0 && <div style={{ background: '#fff', borderRadius: 24, padding: 28, boxShadow: 'var(--sh-md)' }}><h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>نظرهای پس از جلسه</h2><div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>{reviews.map((review) => <div key={review.id} style={{ paddingBottom: 18, borderBottom: '1px solid var(--sand-100)' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><span style={{ fontSize: 14, fontWeight: 700 }}>{review.learner?.name || 'قرآن‌آموز وُدّا'}</span><Stars value={review.rating} size={14} /></div>{review.text && <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ink-3)' }}>{review.text}</p>}</div>)}</div></div>}
      </div>
      <Footer />
    </div>
  );
}

function Stat({ icon, value, label }: { icon: Parameters<typeof Icon>[0]['name']; value: string; label: string }) {
  return <div style={{ textAlign: 'center' }}><Icon name={icon} size={22} style={{ color: 'var(--olive-500)' }} /><div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>{value}</div><div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{label}</div></div>;
}
