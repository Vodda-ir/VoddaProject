'use client';

import { useState, useEffect } from 'react';
import type { Teacher } from '@/lib/api';
import { Icon } from '../Icon';
import { Avatar, GeoPattern, SectionTitle, Stars, WebBtn } from './ui';

const fa = (n: number | string) =>
  String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

/* ── User dropdown for authenticated visitors on public pages ── */
function UserMenu({ name, role, avatar }: { name: string; role: string; avatar?: string }) {
  const [open, setOpen] = useState(false);
  const roleLabel = role === 'admin' ? 'ادمین' : role === 'teacher' ? 'مربی' : 'قرآن آموز';
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)}
        style={{
          width: 42, height: 42, borderRadius: 13, border: 'none', background: 'var(--surface)',
          boxShadow: 'var(--sh-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ink-2s)', transition: 'background .15s',
        }}>
        <Icon name="user" size={22} stroke={1.8} />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 240,
            background: '#fff', borderRadius: 20, boxShadow: 'var(--sh-lg)',
            border: '1px solid var(--sand-150)', padding: 16, zIndex: 50,
          }}>
            {/* Profile card */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottom: '1px solid var(--sand-100)', marginBottom: 10 }}>
              {avatar ? (
                <img src={avatar} alt="" style={{ width: 46, height: 46, borderRadius: 14, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="user" size={24} stroke={1.8} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{roleLabel}</div>
              </div>
            </div>

            {/* Panel links — always show all three */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <a href="/panel/admin" style={panelLinkStyle}>
                <span style={panelIconStyle('var(--olive-700)', 'var(--olive-100)')}><Icon name="shield" size={18} /></span>
                <span style={{ flex: 1 }}>پنل مدیریت</span>
                <Icon name="chevronL" size={14} style={{ color: 'var(--ink-4)' }} />
              </a>
              <a href="/panel/teacher" style={panelLinkStyle}>
                <span style={panelIconStyle('var(--olive-600)', 'var(--olive-50)')}><Icon name="award" size={18} /></span>
                <span style={{ flex: 1 }}>پنل مربی</span>
                <Icon name="chevronL" size={14} style={{ color: 'var(--ink-4)' }} />
              </a>
              <a href="/panel/user" style={panelLinkStyle}>
                <span style={panelIconStyle('var(--ink-2s)', 'var(--sand-100)')}><Icon name="user" size={18} /></span>
                <span style={{ flex: 1 }}>پنل کاربری</span>
                <Icon name="chevronL" size={14} style={{ color: 'var(--ink-4)' }} />
              </a>
            </div>

            {/* Logout */}
            <div style={{ borderTop: '1px solid var(--sand-100)', marginTop: 8, paddingTop: 8 }}>
              <button onClick={() => { document.cookie = 'vodda_token=; path=/; max-age=0'; localStorage.removeItem('vodda_token'); window.location.reload(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 10px',
                  borderRadius: 12, border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 13.5, fontWeight: 600, color: 'var(--rose)',
                }}>
                <span style={{ ...panelIconStyle('var(--rose)', '#FDE8E8'), width: 36, height: 36 }}><Icon name="logout" size={18} /></span>
                خروج از حساب
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const panelLinkStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 12,
  fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', textDecoration: 'none',
  transition: 'background .12s',
};

const panelIconStyle = (color: string, bg: string): React.CSSProperties => ({
  width: 36, height: 36, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: bg, color, flexShrink: 0,
});

export function Nav() {
  const [user, setUser] = useState<{ name: string; role: string; avatar_url?: string } | null>(null);
  useEffect(() => {
    const token = localStorage.getItem('vodda_token');
    if (!token) return;
    fetch('/api/v1/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(j => j?.data ? setUser({ name: j.data.name || 'کاربر', role: j.data.role || 'learner', avatar_url: j.data.avatar_url }) : null)
      .catch(() => {});
  }, []);
  const links = ['خانه', 'اساتید قرآن', 'مداحی', 'چگونه کار میکند', 'استاد شوید'];
  const hrefs = ['/', '/#teachers', '/#teachers', '/#how', '/panel/teacher'];
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,248,242,.85)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--sand-200)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: 26, color: 'var(--olive-700)', letterSpacing: '-.5px' }}>
            <img src="/vodda-logo.svg" alt="وُدّا" style={{ width: 36, height: 36 }} />
            وُدّا
          </a>
          <nav style={{ display: 'flex', gap: 26 }} className="nav-links">
            {links.map((l, i) => (
              <a key={l} href={hrefs[i]} style={{ fontSize: 14.5, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? 'var(--ink)' : 'var(--ink-2s)' }}>{l}</a>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <UserMenu name={user.name} role={user.role} avatar={user.avatar_url} />
          ) : (
            <WebBtn size="sm" href="/panel/login">ورود</WebBtn>
          )}
        </div>
      </div>
    </header>
  );
}

export function Hero() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(900px 500px at 85% -5%, var(--olive-50) 0%, transparent 60%)' }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '70px 28px 80px', display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 50, alignItems: 'center', position: 'relative' }} className="hero-grid">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--olive-50)', color: 'var(--olive-700)', padding: '8px 16px', borderRadius: 999, fontSize: 13.5, fontWeight: 700, marginBottom: 22, boxShadow: 'inset 0 0 0 1px var(--olive-100)' }}>
            <Icon name="sparkle" size={16} /> سکّوی اتصال قرآنآموز و استاد
          </div>
          <h1 style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.35, letterSpacing: '-1px', marginBottom: 20 }}>
            استادِ قرآن و مداحیات را<br /><span style={{ color: 'var(--olive-600)' }}>آنلاین</span> پیدا کن
          </h1>
          <p style={{ fontSize: 17, lineHeight: 2, color: 'var(--ink-2s)', maxWidth: 480, marginBottom: 32 }}>
            با بهترین اساتید قرآن کریم و مداحی اهلبیت، جلسهٔ آموزشی خصوصی رزرو کن — ساده، مطمئن و با پرداخت امن.
          </p>
          <div style={{ display: 'flex', gap: 10, background: '#fff', padding: 10, borderRadius: 18, boxShadow: 'var(--sh-md)', maxWidth: 540, marginBottom: 26 }} className="hero-search">
            <div style={{ flex: 1.4, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px' }}>
              <Icon name="search" size={20} style={{ color: 'var(--ink-3)' }} />
              <input placeholder="تخصص یا نام استاد…" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, padding: '12px 0', fontFamily: 'var(--font)' }} />
            </div>
            <div style={{ width: 1, background: 'var(--sand-200)' }} className="hide-sm" />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px' }} className="hide-sm">
              <Icon name="pin" size={19} style={{ color: 'var(--ink-3)' }} />
              <input placeholder="شهر" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, padding: '12px 0', fontFamily: 'var(--font)' }} />
            </div>
            <WebBtn icon="search" href="/panel/user">جستجو</WebBtn>
          </div>
          <div style={{ display: 'flex', gap: 32 }}>
            {[['۸۰۰+', 'استاد تأییدشده'], ['۱۲٬۰۰۰+', 'جلسهٔ برگزارشده'], ['۴٫۹', 'میانگین رضایت']].map(([n, l]) => (
              <div key={l}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>{n}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative' }} className="hero-visual">
          <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', boxShadow: 'var(--sh-lg)', background: 'linear-gradient(135deg,var(--olive-700),var(--olive-500))', aspectRatio: '4/5' }}>
            <GeoPattern color="#fff" opacity={0.1} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 120, opacity: 0.5 }}>📖</div>
          </div>
          <div style={{ position: 'absolute', top: 28, insetInlineStart: -26, background: '#fff', borderRadius: 18, padding: '14px 18px', boxShadow: 'var(--sh-lg)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--gold-bg)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="star" size={22} fill /></div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>۴٫۹ از ۵</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>رضایت قرآنآموزان</div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 26, insetInlineEnd: -26, background: '#fff', borderRadius: 18, padding: '14px 16px', boxShadow: 'var(--sh-lg)', width: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Avatar size={38} verified />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>عباس ملکمحمدی</div>
                <div style={{ fontSize: 11, color: 'var(--olive-600)' }}>حافظ و قاری</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--ink-2s)', background: 'var(--olive-50)', padding: '8px 11px', borderRadius: 11 }}>
              <Icon name="phone" size={15} style={{ color: 'var(--olive-600)' }} /> جلسهٔ صوتی · امروز ۱۸:۰۰
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Categories() {
  const cats = [
    { icon: 'quran' as const, title: 'آموزش قرآن کریم', desc: 'روخوانی، روانخوانی، تجوید، صوت و لحن و حفظ', n: '۵۲۰ استاد', bg: 'var(--olive-100)', c: 'var(--olive-700)' },
    { icon: 'mic' as const, title: 'مداحی اهلبیت', desc: 'نوحهخوانی، مرثیه، مدیحه و آشنایی با دستگاهها', n: '۱۸۰ استاد', bg: 'var(--clay-bg)', c: 'var(--clay)' },
    { icon: 'phone' as const, title: 'مشاورهٔ صوتی', desc: 'گفتوگوی زندهٔ صوتی برای راهنمایی و رفع اشکال', n: 'گفتوگوی زنده', bg: 'var(--gold-bg)', c: '#9A7426' },
  ];
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }} className="cat-grid">
        {cats.map((c) => (
          <div key={c.title} style={{ background: '#fff', borderRadius: 24, padding: 26, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)' }}>
            <div style={{ width: 58, height: 58, borderRadius: 17, background: c.bg, color: c.c, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}><Icon name={c.icon} size={30} /></div>
            <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 9 }}>{c.title}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ink-3)', marginBottom: 16 }}>{c.desc}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: c.c, background: c.bg, padding: '5px 12px', borderRadius: 999 }}>{c.n}</span>
              <a href="/panel/user" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 13.5, fontWeight: 700, color: 'var(--ink-2s)' }}>مشاهده <Icon name="chevronL" size={17} /></a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { icon: 'search' as const, title: 'استاد را پیدا کن', desc: 'بر اساس تخصص، شهر و امتیاز، استاد مناسب خود را جستجو کن.' },
    { icon: 'calendar' as const, title: 'جلسه را رزرو کن', desc: 'روز و ساعت آزاد استاد را انتخاب و درخواست جلسه ثبت کن.' },
    { icon: 'phone' as const, title: 'در جلسه شرکت کن', desc: 'پس از تأیید استاد، در زمان مقرر جلسهٔ صوتی برگزار میشود.' },
  ];
  return (
    <section id="how" style={{ background: 'var(--surface-warm)', borderBlock: '1px solid var(--sand-150)', padding: '70px 0', marginTop: 30 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px' }}>
        <SectionTitle kicker="ساده و سریع" title="وُدّا چگونه کار میکند؟" sub="تنها در سه گام به استاد دلخواهت وصل شو." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 26, marginTop: 44 }} className="cat-grid">
          {steps.map((s, i) => (
            <div key={s.title} style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{ width: 78, height: 78, borderRadius: 24, background: '#fff', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: 'var(--sh-md)', position: 'relative' }}>
                <Icon name={s.icon} size={34} />
                <span style={{ position: 'absolute', top: -8, insetInlineEnd: -8, width: 28, height: 28, borderRadius: '50%', background: 'var(--olive-600)', color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--surface-warm)' }}>{fa(i + 1)}</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.95, color: 'var(--ink-3)', maxWidth: 260, margin: '0 auto' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WebTeacherCard({ t }: { t: Teacher }) {
  const skills = (t as Teacher & { skills?: string[] }).skills || [];
  const emoji = t.field?.includes('مداحی') ? '🎤' : '📖';
  return (
    <div style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
        <Avatar size={58} ring verified={t.verified} emoji={emoji} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800 }}>{t.user?.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--olive-600)', fontWeight: 600, marginTop: 3 }}>{t.tag}</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--gold)', fontWeight: 800, fontSize: 14 }}><Icon name="star" size={15} fill />{fa(t.rating.toFixed(1))}</span>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.85, color: 'var(--ink-3)', marginBottom: 14, height: 48, overflow: 'hidden' }}>{t.bio}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {skills.slice(0, 3).map((s) => (
          <span key={s} style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--olive-700)', background: 'var(--olive-50)', padding: '5px 11px', borderRadius: 999 }}>{s}</span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--sand-100)' }}>
        <div>
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>از </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{fa(Math.round(t.price30 / 1000))}</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}> هزار ت</span>
        </div>
        <WebBtn size="sm" href="/panel/user">رزرو جلسه</WebBtn>
      </div>
    </div>
  );
}

export function FeaturedTeachers({ teachers }: { teachers: Teacher[] }) {
  return (
    <section id="teachers" style={{ maxWidth: 1200, margin: '0 auto', padding: '70px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
        <SectionTitle kicker="منتخب وُدّا" title="اساتید برتر این هفته" center={false} />
        <WebBtn variant="ghost" icon="arrowL" href="/panel/user">مشاهدهٔ همهٔ اساتید</WebBtn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }} className="cat-grid">
        {teachers.slice(0, 6).map((t) => <WebTeacherCard key={t.id} t={t} />)}
      </div>
    </section>
  );
}

export function WhyVodda() {
  const items = [
    { icon: 'shield' as const, title: 'اساتید تأییدشده', desc: 'هر استاد پیش از نمایش، توسط تیم وُدّا بررسی و تأیید میشود.' },
    { icon: 'wallet' as const, title: 'پرداخت امن', desc: 'پرداخت از طریق کیف پول داخلی و درگاه امن، با شفافیت کامل.' },
    { icon: 'star' as const, title: 'امتیاز واقعی', desc: 'نظرات و امتیازها فقط از قرآنآموزانی که جلسه داشتهاند ثبت میشود.' },
    { icon: 'headphones' as const, title: 'پشتیبانی همراه', desc: 'تیم پشتیبانی در تمام مراحل رزرو و برگزاری جلسه کنار شماست.' },
  ];
  return (
    <section style={{ background: 'var(--olive-900)', color: '#fff', padding: '76px 0', position: 'relative', overflow: 'hidden' }}>
      <GeoPattern color="var(--gold-soft)" opacity={0.06} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', position: 'relative' }}>
        <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 50px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--gold-soft)', marginBottom: 12 }}>چرا وُدّا؟</div>
          <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.5px' }}>اعتماد، در هر جلسه</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 22 }} className="why-grid">
          {items.map((it) => (
            <div key={it.title} style={{ background: 'rgba(255,255,255,.05)', borderRadius: 20, padding: 24, border: '1px solid rgba(255,255,255,.08)' }}>
              <div style={{ width: 52, height: 52, borderRadius: 15, background: 'rgba(231,213,168,.14)', color: 'var(--gold-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}><Icon name={it.icon} size={26} /></div>
              <h3 style={{ fontSize: 16.5, fontWeight: 800, marginBottom: 10 }}>{it.title}</h3>
              <p style={{ fontSize: 13.5, lineHeight: 1.9, color: 'rgba(255,255,255,.7)' }}>{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  const data = [
    { name: 'مجتبی ش.', role: 'قرآنآموز', rating: 5, text: 'با وُدّا تونستم استاد تجویدی پیدا کنم که واقعاً صبور و دلسوزه. تلاوتم بعد از چند جلسه خیلی بهتر شد.' },
    { name: 'سکینه ر.', role: 'قرآنآموز', rating: 5, text: 'رزرو جلسه خیلی ساده بود و پرداخت از کیف پول راحت. جلسهها دقیق و منظم برگزار شد.' },
    { name: 'حسین ک.', role: 'مداح', rating: 5, text: 'بهعنوان مداح، وُدّا کمک کرد شاگردهای جدید پیدا کنم و درآمدم منظم بشه. پنل استاد خیلی کاربردیه.' },
  ];
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '76px 28px' }}>
      <SectionTitle kicker="تجربهٔ کاربران" title="آنها به وُدّا اعتماد کردهاند" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22, marginTop: 44 }} className="cat-grid">
        {data.map((d) => (
          <div key={d.name} style={{ background: '#fff', borderRadius: 22, padding: 26, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)' }}>
            <Stars value={d.rating} size={17} />
            <p style={{ fontSize: 14.5, lineHeight: 2, color: 'var(--ink-2s)', margin: '16px 0 20px' }}>«{d.text}»</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <Avatar size={42} emoji="🧑" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{d.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{d.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BecomeTeacher() {
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px 30px' }}>
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 30, background: 'linear-gradient(120deg,var(--olive-700),var(--olive-500))', color: '#fff', padding: '54px 50px', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 40, alignItems: 'center' }} className="cta-grid">
        <GeoPattern color="#fff" opacity={0.08} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: 'var(--gold-soft)', marginBottom: 16 }}><Icon name="award" size={18} /> ویژهٔ اساتید</div>
          <h2 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.4, letterSpacing: '-.5px', marginBottom: 16 }}>دانش قرآنیات را<br />به درآمد تبدیل کن</h2>
          <p style={{ fontSize: 16, lineHeight: 1.95, opacity: 0.88, maxWidth: 420, marginBottom: 28 }}>پروفایل حرفهای بساز، خدماتت را تعریف کن و از هر جلسه درآمد کسب کن. تسویهحساب شفاف و منظم.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <WebBtn variant="white" size="lg" icon="arrowL" href="/panel/teacher">ثبتنام بهعنوان استاد</WebBtn>
            <WebBtn size="lg" href="/#how" style={{ background: 'rgba(255,255,255,.14)', boxShadow: 'none', color: '#fff' }}>اطلاعات بیشتر</WebBtn>
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14 }} className="hide-md">
          {[['۱۵٪', 'کارمزد منصفانه'], ['هفتگی', 'تسویهحساب منظم'], ['۲۴/۷', 'پشتیبانی اساتید']].map(([n, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,.1)', borderRadius: 16, padding: '16px 20px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold-soft)', minWidth: 64 }}>{n}</div>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DownloadApp() {
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '50px 28px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 30, flexWrap: 'wrap', background: 'var(--surface-warm)', border: '1px solid var(--sand-150)', borderRadius: 26, padding: '34px 40px' }}>
        <div>
          <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>اپلیکیشن وُدّا را دریافت کنید</h3>
          <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.8 }}>تجربهٔ کامل رزرو و برگزاری جلسه، روی گوشی شما.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['بازار', 'مایکت', 'App Store'].map((s) => (
            <a key={s} href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'var(--olive-900)', color: '#fff', padding: '13px 20px', borderRadius: 14, fontWeight: 700, fontSize: 14.5 }}>
              <Icon name="download" size={19} /> {s}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const cols = [
    { h: 'وُدّا', links: ['دربارهٔ ما', 'تماس با ما', 'وبلاگ', 'فرصتهای شغلی'] },
    { h: 'خدمات', links: ['آموزش قرآن', 'مداحی', 'مشاورهٔ صوتی', 'اساتید بانو'] },
    { h: 'راهنما', links: ['چگونه کار میکند', 'سؤالات متداول', 'قوانین و مقررات', 'حریم خصوصی'] },
  ];
  return (
    <footer style={{ background: 'var(--olive-900)', color: 'rgba(255,255,255,.75)', paddingTop: 56 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 30, paddingBottom: 44 }} className="footer-grid">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 26, color: '#fff', marginBottom: 14 }}>وُدّا <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', marginBottom: 12 }} /></div>
            <p style={{ fontSize: 13.5, lineHeight: 2, maxWidth: 300 }}>سکّوی اتصال قرآنآموزان و اساتید قرآن و مداحی، برای یادگیری آسان و مطمئن.</p>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 16 }}>{c.h}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {c.links.map((l) => <a key={l} href="#" style={{ fontSize: 13.5, color: 'rgba(255,255,255,.7)' }}>{l}</a>)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 0', borderTop: '1px solid rgba(255,255,255,.1)', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13 }}>© ۱۴۰۴ وُدّا — تمامی حقوق محفوظ است.</span>
          <span style={{ fontSize: 13 }}>ساختهشده با ❤ برای جامعهٔ قرآنی</span>
        </div>
      </div>
    </footer>
  );
}
