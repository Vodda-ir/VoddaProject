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
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  let teacher, reviews;
  try {
    const res = await api.teacher(numId);
    teacher = res.data.teacher;
    reviews = res.data.reviews || [];
  } catch {
    notFound();
  }

  const avatar = fullUrl(teacher.user?.avatar_url);

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 60px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 24, textDecoration: 'none' }}>
          <Icon name="arrowL" size={18} /> بازگشت به خانه
        </Link>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, flex: '1 1 320px', boxShadow: 'var(--sh-md)' }}>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 20 }}>
              <Avatar size={88} ring verified={teacher.verified} imageUrl={avatar} />
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{teacher.user?.name || 'استاد'}</h1>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--olive-600)', marginBottom: 6 }}>{teacher.tag}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-3)' }}>
                  <Icon name="pin" size={15} /> {teacher.city || '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, justifyContent: 'space-around', paddingTop: 20, borderTop: '1px solid var(--sand-100)' }}>
              <Stat icon="star" value={teacher.rating ? fa(teacher.rating.toFixed(1)) : '—'} label="امتیاز" />
              <Stat icon="calendar" value={fa(teacher.sessions)} label="جلسه" />
              <Stat icon="users" value={fa(teacher.followers)} label="دنبال‌کننده" />
            </div>

            <Link
              href={`/panel/user/book?teacher=${teacher.id}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 24, padding: '14px 24px', borderRadius: 999,
                background: 'var(--olive-600)', color: '#fff',
                fontSize: 16, fontWeight: 700, textDecoration: 'none',
                boxShadow: 'var(--sh-olive)',
              }}
            >
              <Icon name="calendar" size={20} /> رزرو جلسه
            </Link>
          </div>

          <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: 'var(--sh-md)' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>درباره استاد</h2>
              <p style={{ fontSize: 14.5, lineHeight: 2, color: 'var(--ink-3)' }}>{teacher.bio || 'اطلاعاتی ثبت نشده است.'}</p>
            </div>

            <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: 'var(--sh-md)' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>خدمات</h2>
              {teacher.services && teacher.services.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {teacher.services.map((s) => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, background: 'var(--sand-50)' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="book" size={22} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.title}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{fa(s.duration)} دقیقه</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--olive-700)' }}>{toman(s.price)} <span style={{ fontSize: 12, fontWeight: 600 }}>تومان</span></div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--ink-4)' }}>خدماتی ثبت نشده است.</p>
              )}
            </div>
          </div>
        </div>

        {reviews.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 24, padding: 28, boxShadow: 'var(--sh-md)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>نظرات کاربران</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {reviews.map((r) => (
                <div key={r.id} style={{ paddingBottom: 18, borderBottom: '1px solid var(--sand-100)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{r.learner_name}</span>
                    <Stars value={r.rating} size={14} />
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ink-3)' }}>{r.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function Stat({ icon, value, label }: { icon: Parameters<typeof Icon>[0]['name']; value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <Icon name={icon} size={22} style={{ color: 'var(--olive-500)' }} />
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{label}</div>
    </div>
  );
}
