'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Teacher } from '@/lib/api';
import { clearToken, fullUrl } from '@/lib/auth';
import { Icon } from '../Icon';
import { Avatar, GeoPattern, SectionTitle, Stars, WebBtn } from './ui';

const fa = (n: number | string) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

function UserMenu({ name, role, avatar }: { name: string; role: string; avatar?: string }) {
  const [open, setOpen] = useState(false);
  const roleLabel = role === 'admin' ? 'ادمین' : role === 'teacher' ? 'استاد' : 'قرآن‌آموز';
  return (
    <div style={{ position: 'relative' }}>
      <button aria-label="منوی کاربر" aria-expanded={open} onClick={() => setOpen(!open)} style={{ width: 42, height: 42, borderRadius: 13, border: 'none', background: 'var(--surface)', boxShadow: 'var(--sh-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2s)' }}>
        <Icon name="user" size={22} stroke={1.8} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 240, background: '#fff', borderRadius: 20, boxShadow: 'var(--sh-lg)', border: '1px solid var(--sand-150)', padding: 16, zIndex: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottom: '1px solid var(--sand-100)', marginBottom: 10 }}>
              {avatar ? <img src={fullUrl(avatar)} alt="" style={{ width: 46, height: 46, borderRadius: 14, objectFit: 'cover' }} /> : <Avatar size={46} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{roleLabel}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {role === 'admin' && <PanelLink href="/panel/admin" icon="shield" label="پنل مدیریت" />}
              {(role === 'teacher' || role === 'admin') && <PanelLink href="/panel/teacher" icon="award" label="پنل استاد" />}
              <PanelLink href="/panel/user" icon="user" label="پنل کاربری" />
            </div>
            <div style={{ borderTop: '1px solid var(--sand-100)', marginTop: 8, paddingTop: 8 }}>
              <button onClick={async () => { await clearToken(); window.location.assign('/'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: 10, borderRadius: 12, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'var(--rose)' }}>
                <Icon name="logout" size={18} /> خروج از حساب
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PanelLink({ href, icon, label }: { href: string; icon: 'shield' | 'award' | 'user'; label: string }) {
  return <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none' }}><Icon name={icon} size={18} /><span style={{ flex: 1 }}>{label}</span><Icon name="chevronL" size={14} /></Link>;
}

export function Nav() {
  const [user, setUser] = useState<{ name: string; role: string; avatar_url?: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/backend/me', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((body) => body?.data ? setUser({ name: body.data.name || 'کاربر', role: body.data.role || 'learner', avatar_url: body.data.avatar_url }) : null)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const links = [
    ['خانه', '/'], ['اساتید', '/#teachers'], ['جستجو', '/search'], ['نحوهٔ کار', '/#how'], ['استاد شوید', '/panel/teacher/register'],
  ];
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,248,242,.88)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--sand-200)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 26, color: 'var(--olive-700)' }}><img src="/vodda-logo.svg" alt="وُدّا" style={{ width: 36, height: 36 }} />وُدّا</Link>
          <nav style={{ display: 'flex', gap: 26 }} className="nav-links">
            {links.map(([label, href]) => <Link key={href} href={href} style={{ fontSize: 14.5, fontWeight: href === '/' ? 700 : 500, color: 'var(--ink-2s)' }}>{label}</Link>)}
          </nav>
        </div>
        {user ? <UserMenu name={user.name} role={user.role} avatar={user.avatar_url} /> : <WebBtn size="sm" href="/panel/login">ورود</WebBtn>}
      </div>
    </header>
  );
}

export function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (city.trim()) params.set('city', city.trim());
    router.push(`/search${params.size ? `?${params}` : ''}`);
  }
  return (
    <section style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(900px 500px at 85% -5%, var(--olive-50) 0%, transparent 60%)' }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '70px 28px 80px', display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 50, alignItems: 'center', position: 'relative' }} className="hero-grid">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--olive-50)', color: 'var(--olive-700)', padding: '8px 16px', borderRadius: 999, fontSize: 13.5, fontWeight: 700, marginBottom: 22 }}><Icon name="sparkle" size={16} /> سکوی اتصال قرآن‌آموز و استاد</div>
          <h1 style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.35, marginBottom: 20 }}>استاد قرآن و مداحی را<br /><span style={{ color: 'var(--olive-600)' }}>آنلاین</span> پیدا کن</h1>
          <p style={{ fontSize: 17, lineHeight: 2, color: 'var(--ink-2s)', maxWidth: 500, marginBottom: 32 }}>پروفایل استادان تأییدشده را ببین، زمان آزاد را انتخاب کن و درخواست جلسه ثبت کن. مبلغ رزرو تا تعیین وضعیت جلسه در کیف پول سامانه ثبت می‌شود.</p>
          <form onSubmit={submit} style={{ display: 'flex', gap: 10, background: '#fff', padding: 10, borderRadius: 18, boxShadow: 'var(--sh-md)', maxWidth: 560, marginBottom: 26 }} className="hero-search">
            <div style={{ flex: 1.4, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px' }}><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="نام یا تخصص استاد" placeholder="نام یا تخصص استاد…" style={searchInputStyle} /></div>
            <div style={{ width: 1, background: 'var(--sand-200)' }} className="hide-sm" />
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px' }} className="hide-sm"><Icon name="pin" size={19} /><input value={city} onChange={(event) => setCity(event.target.value)} aria-label="شهر" placeholder="شهر" style={searchInputStyle} /></div>
            <button type="submit" style={{ border: 0, borderRadius: 999, padding: '0 22px', background: 'var(--olive-600)', color: '#fff', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' }}>جستجو</button>
          </form>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 13, color: 'var(--ink-3)' }}>
            <span>✓ استادان بررسی‌شده</span><span>✓ سابقهٔ مالی شفاف</span><span>✓ امتیاز فقط پس از جلسه</span>
          </div>
        </div>
        <div style={{ position: 'relative' }} className="hero-visual">
          <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', boxShadow: 'var(--sh-lg)', background: 'linear-gradient(135deg,var(--olive-700),var(--olive-500))', aspectRatio: '4/5' }}><GeoPattern color="#fff" opacity={0.1} /><div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 120, opacity: 0.55 }}>📖</div></div>
          <div style={{ position: 'absolute', bottom: 28, insetInlineStart: -20, background: '#fff', borderRadius: 18, padding: '14px 18px', boxShadow: 'var(--sh-lg)', display: 'flex', alignItems: 'center', gap: 12 }}><Icon name="calendar" size={22} style={{ color: 'var(--olive-600)' }} /><div><div style={{ fontSize: 14, fontWeight: 800 }}>رزرو زمان آزاد استاد</div><div style={{ fontSize: 12, color: 'var(--ink-3)' }}>بدون نمایش دادهٔ ساختگی</div></div></div>
        </div>
      </div>
    </section>
  );
}

const searchInputStyle: React.CSSProperties = { flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, padding: '12px 0', fontFamily: 'var(--font)' };

export function Categories() {
  const categories = [
    { icon: 'quran' as const, title: 'آموزش قرآن کریم', desc: 'روخوانی، روان‌خوانی، تجوید، صوت و لحن و حفظ', href: '/search?field=%D8%A2%D9%85%D9%88%D8%B2%D8%B4+%D9%82%D8%B1%D8%A2%D9%86+%DA%A9%D8%B1%DB%8C%D9%85' },
    { icon: 'mic' as const, title: 'مداحی اهل‌بیت', desc: 'نوحه‌خوانی، مرثیه، مدیحه و آموزش دستگاه‌های آوازی', href: '/search?field=%D9%85%D8%AF%D8%A7%D8%AD%DB%8C+%D8%A7%D9%87%D9%84%E2%80%8C%D8%A8%DB%8C%D8%AA' },
  ];
  return <section style={{ maxWidth: 900, margin: '0 auto', padding: '40px 28px' }}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 22 }} className="cat-grid">{categories.map((category) => <Link key={category.title} href={category.href} style={{ color: 'inherit', textDecoration: 'none', background: '#fff', borderRadius: 24, padding: 26, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)' }}><Icon name={category.icon} size={32} style={{ color: 'var(--olive-600)', marginBottom: 16 }} /><h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 9 }}>{category.title}</h3><p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ink-3)' }}>{category.desc}</p></Link>)}</div></section>;
}

export function HowItWorks() {
  const steps = [
    ['search' as const, 'استاد را پیدا کن', 'بر اساس نام، تخصص، شهر و جنسیت استاد جستجو کن.'],
    ['calendar' as const, 'زمان را رزرو کن', 'خدمت و بازهٔ معتبر از برنامهٔ کاری استاد را انتخاب کن.'],
    ['message' as const, 'جلسه را هماهنگ کن', 'پس از تأیید استاد، جزئیات برگزاری را مطابق اطلاعات جلسه پیگیری کن.'],
  ];
  return <section id="how" style={{ background: 'var(--surface-warm)', borderBlock: '1px solid var(--sand-150)', padding: '70px 0', marginTop: 30 }}><div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 28px' }}><SectionTitle kicker="ساده و شفاف" title="وُدّا چگونه کار می‌کند؟" /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 26, marginTop: 44 }} className="cat-grid">{steps.map(([icon, title, description], index) => <div key={title} style={{ textAlign: 'center' }}><div style={{ width: 72, height: 72, borderRadius: 22, background: '#fff', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: 'var(--sh-md)' }}><Icon name={icon} size={32} /></div><h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{fa(index + 1)}. {title}</h3><p style={{ fontSize: 14, lineHeight: 1.95, color: 'var(--ink-3)' }}>{description}</p></div>)}</div></div></section>;
}

function WebTeacherCard({ teacher }: { teacher: Teacher }) {
  const skills = teacher.skills || [];
  return <div style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)' }}><div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}><Avatar size={58} ring verified={teacher.verified} imageUrl={fullUrl(teacher.user?.avatar_url)} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15.5, fontWeight: 800 }}>{teacher.user?.name || 'استاد وُدّا'}</div><div style={{ fontSize: 12.5, color: 'var(--olive-600)', fontWeight: 600, marginTop: 3 }}>{teacher.tag}</div></div><span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--gold)', fontWeight: 800, fontSize: 14 }}><Icon name="star" size={15} fill />{fa(teacher.rating.toFixed(1))}</span></div><p style={{ fontSize: 13, lineHeight: 1.85, color: 'var(--ink-3)', marginBottom: 14, height: 48, overflow: 'hidden' }}>{teacher.bio}</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>{skills.slice(0, 3).map((skill) => <span key={skill} style={{ fontSize: 11.5, color: 'var(--olive-700)', background: 'var(--olive-50)', padding: '5px 11px', borderRadius: 999 }}>{skill}</span>)}</div><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--sand-100)' }}><span style={{ fontSize: 14, fontWeight: 800 }}>{fa(new Intl.NumberFormat('fa-IR').format(teacher.price30))} تومان</span><WebBtn size="sm" href={`/teachers/${teacher.id}`}>مشاهده و رزرو</WebBtn></div></div>;
}

export function FeaturedTeachers({ teachers, unavailable = false }: { teachers: Teacher[]; unavailable?: boolean }) {
  return <section id="teachers" style={{ maxWidth: 1200, margin: '0 auto', padding: '70px 28px' }}><div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}><SectionTitle kicker="پروفایل‌های منتشرشده" title="استادان تأییدشده" center={false} /><WebBtn variant="ghost" icon="arrowL" href="/search">مشاهدهٔ همه</WebBtn></div>{teachers.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }} className="cat-grid">{teachers.slice(0, 6).map((teacher) => <WebTeacherCard key={teacher.id} teacher={teacher} />)}</div> : <div role="status" style={{ textAlign: 'center', padding: 44, borderRadius: 22, background: '#fff', color: 'var(--ink-3)', border: '1px solid var(--sand-150)' }}>{unavailable ? 'در حال حاضر ارتباط با فهرست استادان برقرار نیست. کمی بعد دوباره تلاش کنید.' : 'هنوز استاد تأییدشده‌ای برای نمایش وجود ندارد.'}</div>}</section>;
}

export function WhyVodda() {
  const items = [
    ['shield' as const, 'انتشار پس از تأیید', 'پروفایل استاد تا پیش از بررسی ادمین در جستجوی عمومی دیده نمی‌شود.'],
    ['wallet' as const, 'دفتر مالی قابل پیگیری', 'رزرو، بازگشت وجه، درآمد و برداشت در تراکنش‌های کیف پول ثبت می‌شوند.'],
    ['star' as const, 'نظر وابسته به جلسه', 'ثبت امتیاز فقط برای قرآن‌آموز همان جلسه و پس از تکمیل آن ممکن است.'],
    ['message' as const, 'پشتیبانی ثبت‌شونده', 'پیام تماس داخل سامانه ذخیره می‌شود تا قابل پیگیری باشد.'],
  ];
  return <section style={{ background: 'var(--olive-900)', color: '#fff', padding: '76px 0', position: 'relative', overflow: 'hidden' }}><GeoPattern color="var(--gold-soft)" opacity={0.06} /><div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', position: 'relative' }}><SectionTitle kicker="شفافیت محصول" title="قابلیت‌هایی که واقعاً فعال‌اند" /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 22, marginTop: 42 }} className="why-grid">{items.map(([icon, title, description]) => <div key={title} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,.08)' }}><Icon name={icon} size={26} style={{ color: 'var(--gold-soft)', marginBottom: 18 }} /><h3 style={{ fontSize: 16.5, fontWeight: 800, marginBottom: 10 }}>{title}</h3><p style={{ fontSize: 13.5, lineHeight: 1.9, color: 'rgba(255,255,255,.7)' }}>{description}</p></div>)}</div></div></section>;
}

// Kept as an exported section for compatibility, but it contains no fabricated testimonials.
export function Testimonials() {
  return null;
}

export function BecomeTeacher() {
  return <section style={{ maxWidth: 1200, margin: '0 auto', padding: '70px 28px 30px' }}><div style={{ position: 'relative', overflow: 'hidden', borderRadius: 30, background: 'linear-gradient(120deg,var(--olive-700),var(--olive-500))', color: '#fff', padding: '54px 50px' }}><GeoPattern color="#fff" opacity={0.08} /><div style={{ position: 'relative', maxWidth: 620 }}><div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gold-soft)', marginBottom: 16 }}>ویژهٔ استادان</div><h2 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.4, marginBottom: 16 }}>پروفایل استادی بساز و خدماتت را تعریف کن</h2><p style={{ fontSize: 16, lineHeight: 1.95, opacity: 0.88, marginBottom: 28 }}>درخواست استادی پس از بررسی منتشر می‌شود. درآمد جلسات تکمیل‌شده در کیف پول ثبت و درخواست برداشت از پنل ارسال می‌شود.</p><WebBtn variant="white" size="lg" icon="arrowL" href="/panel/teacher/register">ثبت درخواست استادی</WebBtn></div></div></section>;
}

export function DownloadApp() {
  return <section style={{ maxWidth: 1200, margin: '0 auto', padding: '50px 28px 70px' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 30, flexWrap: 'wrap', background: 'var(--surface-warm)', border: '1px solid var(--sand-150)', borderRadius: 26, padding: '34px 40px' }}><div><h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>اپلیکیشن وُدّا</h3><p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.8 }}>نسخهٔ فروشگاهی پس از آماده‌شدن بیلد امضاشده و انتشار رسمی، از همین بخش قابل دریافت خواهد بود.</p></div><span aria-disabled="true" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'var(--sand-200)', color: 'var(--ink-3)', padding: '13px 20px', borderRadius: 14, fontWeight: 700 }}><Icon name="download" size={19} /> به‌زودی</span></div></section>;
}

export function Footer() {
  const links = [
    ['دربارهٔ ما', '/about'], ['تماس با ما', '/contact'], ['سؤالات متداول', '/faq'], ['قوانین', '/terms'], ['حریم خصوصی', '/privacy'],
  ];
  return <footer style={{ background: 'var(--olive-900)', color: 'rgba(255,255,255,.75)', padding: '48px 0 22px' }}><div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 30, flexWrap: 'wrap', paddingBottom: 36 }}><div><div style={{ fontWeight: 800, fontSize: 26, color: '#fff', marginBottom: 14 }}>وُدّا</div><p style={{ fontSize: 13.5, lineHeight: 2, maxWidth: 340 }}>سکوی اتصال قرآن‌آموزان و استادان قرآن و مداحی، با رزرو و گردش مالی قابل پیگیری.</p></div><nav style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>{links.map(([label, href]) => <Link key={href} href={href} style={{ fontSize: 13.5, color: 'rgba(255,255,255,.75)', textDecoration: 'none' }}>{label}</Link>)}</nav></div><div style={{ paddingTop: 22, borderTop: '1px solid rgba(255,255,255,.1)', fontSize: 13 }}>© ۱۴۰۵ وُدّا — تمامی حقوق محفوظ است.</div></div></footer>;
}
