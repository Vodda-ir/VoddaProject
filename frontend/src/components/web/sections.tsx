'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Teacher } from '@/lib/api';
import { clearToken, fullUrl } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';
import { Icon } from '../Icon';
import { Avatar, GeoPattern, SectionTitle, WebBtn } from './ui';

function PanelLink({ href, icon, label }: { href: string; icon: 'shield' | 'award' | 'user'; label: string }) {
  return (
    <Link href={href} style={panelLinkStyle}>
      <Icon name={icon} size={18} />
      <span style={{ flex: 1 }}>{label}</span>
      <Icon name="chevronL" size={14} />
    </Link>
  );
}

function UserMenu({ name, role, avatar }: { name: string; role: string; avatar?: string }) {
  const [open, setOpen] = useState(false);
  const roleLabel = role === 'admin' ? 'ادمین' : role === 'teacher' ? 'استاد' : 'قرآن‌آموز';

  return (
    <div style={{ position: 'relative' }}>
      <button aria-label="منوی کاربر" aria-expanded={open} onClick={() => setOpen((value) => !value)} style={userButtonStyle}>
        <Icon name="user" size={20} stroke={1.8} />
      </button>
      {open && (
        <>
          <button aria-label="بستن منوی کاربر" style={menuBackdropStyle} onClick={() => setOpen(false)} />
          <div style={menuStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14, borderBottom: '1px solid var(--sand-100)', marginBottom: 8 }}>
              {avatar ? <img src={fullUrl(avatar)} alt="" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }} /> : <Avatar size={46} ring />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ marginTop: 2, color: 'var(--ink-3)', fontSize: 11.5 }}>{roleLabel}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {role === 'admin' && <PanelLink href="/panel/admin" icon="shield" label="پنل مدیریت" />}
              {(role === 'teacher' || role === 'admin') && <PanelLink href="/panel/teacher" icon="award" label="پنل استاد" />}
              <PanelLink href="/panel/user" icon="user" label="پنل کاربری" />
            </div>
            <div style={{ borderTop: '1px solid var(--sand-100)', marginTop: 8, paddingTop: 8 }}>
              <button
                onClick={async () => {
                  await clearToken();
                  window.location.assign('/');
                }}
                style={logoutStyle}
              >
                <Icon name="logout" size={18} />
                خروج از حساب
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function Nav() {
  const [user, setUser] = useState<{ name: string; role: string; avatar_url?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/backend/me', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (body?.data) {
          setUser({
            name: body.data.name || 'کاربر',
            role: body.data.role || 'learner',
            avatar_url: body.data.avatar_url,
          });
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const links = [
    ['خانه', '/'],
    ['اساتید', '/#teachers'],
    ['جستجو', '/search'],
    ['نحوهٔ کار', '/#how'],
    ['دربارهٔ وُدّا', '/about'],
  ];

  return (
    <header className="public-nav">
      <div className="public-container public-nav-inner">
        <Link href="/" style={brandStyle} aria-label="صفحه اصلی وُدّا">
          <img src="/vodda-logo.svg" alt="" style={{ width: 38, height: 38 }} />
          <span>
            <strong style={{ display: 'block', fontSize: 18, lineHeight: 1.2 }}>وُدّا</strong>
            <span className="brand-subtitle">همراه یادگیری</span>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="ناوبری اصلی">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="public-nav-link">{label}</Link>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/app" className="nav-app-link">
            <Icon name="grid" size={17} />
            ورود به اپ
          </Link>
          {user ? <UserMenu name={user.name} role={user.role} avatar={user.avatar_url} /> : <WebBtn size="sm" href="/panel/login">ورود</WebBtn>}
          <button
            type="button"
            className="mobile-nav-toggle"
            aria-label={mobileOpen ? 'بستن منو' : 'باز کردن منو'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
          >
            <Icon name={mobileOpen ? 'x' : 'list'} size={21} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <>
          <button className="mobile-menu-backdrop" aria-label="بستن منو" onClick={() => setMobileOpen(false)} />
          <div className="mobile-menu">
            {links.map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
                <span>{label}</span>
                <Icon name="chevronL" size={16} />
              </Link>
            ))}
            <Link href="/panel/teacher/register" onClick={() => setMobileOpen(false)} className="mobile-menu-teacher">
              <Icon name="award" size={18} />
              ثبت درخواست استادی
            </Link>
          </div>
        </>
      )}
    </header>
  );
}

function AppPreview() {
  return (
    <div className="landing-app-stage" aria-label="نمایی از رابط اپ وُدّا">
      <div className="landing-orb landing-orb-gold" />
      <div className="landing-orb landing-orb-olive" />

      <span className="landing-preview-label">نمونه رابط اپ</span>
      <div className="landing-phone">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={42} ring />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', color: 'var(--ink-3)', fontSize: 10.5 }}>سلام، خوش آمدید</span>
            <strong style={{ display: 'block', marginTop: 1, fontSize: 13.5 }}>مسیر یادگیری شما 🌿</strong>
          </div>
          <span style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 11, color: 'var(--olive-700)', background: 'var(--olive-50)' }}>
            <Icon name="bell" size={18} />
          </span>
        </div>

        <div className="landing-phone-hero">
          <span style={{ color: 'rgba(255,255,255,.67)', fontSize: 10.5 }}>استاد مناسب خودت را پیدا کن</span>
          <strong style={{ display: 'block', marginTop: 4, color: '#fff', fontSize: 17, lineHeight: 1.65 }}>آموزش قرآن و مداحی،<br />در زمان مناسب تو</strong>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 11px', borderRadius: 11, color: 'var(--olive-800)', background: '#fff', fontSize: 10.5, fontWeight: 700 }}>
            <Icon name="search" size={14} />
            جستجوی استاد
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="landing-mini-category"><Icon name="quran" size={19} />آموزش قرآن</div>
          <div className="landing-mini-category"><Icon name="mic" size={19} />مداحی</div>
        </div>

        <div style={{ marginTop: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
            <strong style={{ fontSize: 11.5 }}>استادان پیشنهادی</strong>
            <span style={{ color: 'var(--olive-600)', fontSize: 9.5 }}>مشاهده همه</span>
          </div>
          <div className="landing-mini-teacher">
            <Avatar size={43} verified />
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: 'block', fontSize: 11.5 }}>استاد وُدّا</strong>
              <span style={{ display: 'block', marginTop: 2, color: 'var(--olive-600)', fontSize: 9.5 }}>آموزش قرآن کریم</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 6, color: 'var(--gold)', fontSize: 9.5, fontWeight: 800 }}>
                <Icon name="star" size={11} fill /> ۴٫۹
              </span>
            </div>
            <span style={{ padding: '6px 8px', borderRadius: 8, color: '#fff', background: 'var(--olive-600)', fontSize: 9.5, fontWeight: 700 }}>رزرو</span>
          </div>
        </div>

        <div className="landing-mini-bottom-nav">
          {[
            ['home' as const, 'خانه'],
            ['search' as const, 'جستجو'],
            ['calendar' as const, 'جلسات'],
            ['wallet' as const, 'کیف پول'],
            ['user' as const, 'پروفایل'],
          ].map(([icon, label], index) => (
            <span key={label} className={index === 0 ? 'active' : undefined}>
              <Icon name={icon} size={15} />
              <small>{label}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="landing-floating-card landing-floating-card-top">
        <span className="landing-floating-icon"><Icon name="checkCircle" size={18} /></span>
        <span><strong>استاد تأییدشده</strong><small>پروفایل‌های بررسی‌شده</small></span>
      </div>
      <div className="landing-floating-card landing-floating-card-bottom">
        <span className="landing-floating-icon gold"><Icon name="calendar" size={18} /></span>
        <span><strong>رزرو زمان آزاد</strong><small>بر اساس برنامهٔ واقعی استاد</small></span>
      </div>
    </div>
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
    const search = params.toString();
    router.push(`/search${search ? `?${search}` : ''}`);
  }

  return (
    <section className="landing-hero">
      <div className="landing-hero-glow" aria-hidden="true" />
      <div className="public-container landing-hero-grid">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow"><Icon name="sparkle" size={16} />سکوی تخصصی آموزش قرآن و مداحی</div>
          <h1>استاد مناسب را پیدا کن،<br /><span>زمان خودت را رزرو کن.</span></h1>
          <p>
            استادان تأییدشده را بر اساس تخصص و شهر پیدا کن، خدمات و زمان‌های آزاد را ببین و جریان رزرو و پرداخت را شفاف از داخل وُدّا پیگیری کن.
          </p>

          <form onSubmit={submit} className="landing-search-box">
            <label>
              <Icon name="search" size={19} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="نام یا تخصص استاد" placeholder="نام یا تخصص استاد" />
            </label>
            <span className="landing-search-divider" />
            <label className="landing-city-field">
              <Icon name="pin" size={18} />
              <input value={city} onChange={(event) => setCity(event.target.value)} aria-label="شهر" placeholder="شهر" />
            </label>
            <button type="submit">جستجوی استاد <Icon name="arrowL" size={17} /></button>
          </form>

          <div className="landing-trust-row">
            <span><Icon name="shield" size={16} /> انتشار استاد پس از تأیید</span>
            <span><Icon name="wallet" size={16} /> گردش مالی قابل پیگیری</span>
            <span><Icon name="star" size={16} /> امتیاز پس از جلسه</span>
          </div>

          <div className="landing-hero-actions">
            <WebBtn href="/app" size="lg" icon="grid">ورود به اپ وُدّا</WebBtn>
            <WebBtn href="/panel/teacher/register" size="lg" variant="ghost" icon="award">استاد هستم</WebBtn>
          </div>
        </div>

        <AppPreview />
      </div>
    </section>
  );
}

export function Categories() {
  const categories = [
    {
      icon: 'quran' as const,
      title: 'آموزش قرآن کریم',
      desc: 'روخوانی، روان‌خوانی، تجوید، صوت و لحن و حفظ قرآن با استاد مناسب.',
      href: '/search?field=%D8%A2%D9%85%D9%88%D8%B2%D8%B4+%D9%82%D8%B1%D8%A2%D9%86+%DA%A9%D8%B1%DB%8C%D9%85',
      meta: 'قرآن',
    },
    {
      icon: 'mic' as const,
      title: 'مداحی اهل‌بیت',
      desc: 'آموزش نوحه، مرثیه، مدیحه و مهارت‌های آوازی با برنامهٔ زمانی مشخص.',
      href: '/search?field=%D9%85%D8%AF%D8%A7%D8%AD%DB%8C+%D8%A7%D9%87%D9%84%E2%80%8C%D8%A8%DB%8C%D8%AA',
      meta: 'مداحی',
    },
  ];

  return (
    <section className="landing-categories">
      <div className="public-container">
        <div className="landing-category-grid">
          {categories.map((category) => (
            <Link key={category.title} href={category.href} className="landing-category-card">
              <span className="landing-category-icon"><Icon name={category.icon} size={26} /></span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <small>{category.meta}</small>
                <strong>{category.title}</strong>
                <p>{category.desc}</p>
              </span>
              <span className="landing-category-arrow"><Icon name="arrowL" size={19} /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    ['search' as const, 'استاد را پیدا کن', 'نام، تخصص، شهر یا جنسیت استاد را جستجو و پروفایل منتشرشده را بررسی کن.'],
    ['calendar' as const, 'خدمت و زمان را انتخاب کن', 'سرویس تأییدشده و بازهٔ آزاد واقعی از برنامهٔ کاری استاد را انتخاب کن.'],
    ['checkCircle' as const, 'درخواست را پیگیری کن', 'وضعیت رزرو، جلسه و گردش مالی را از فضای کاربری وُدّا دنبال کن.'],
  ];

  return (
    <section id="how" className="landing-section landing-how">
      <div className="public-container">
        <SectionTitle kicker="مسیر ساده" title="از پیدا کردن استاد تا رزرو جلسه" sub="سه مرحله روشن؛ بدون مسیرهای پیچیده و بدون زمان یا سرویس ساختگی." />
        <div className="landing-steps">
          {steps.map(([icon, title, description], index) => (
            <article key={title} className="landing-step-card">
              <span className="landing-step-number">{toFaDigits(index + 1)}</span>
              <span className="landing-step-icon"><Icon name={icon} size={24} /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WebTeacherCard({ teacher }: { teacher: Teacher }) {
  const name = teacher.user?.name || 'استاد وُدّا';
  const price = Math.max(0, teacher.price30 || teacher.services?.[0]?.price || 0);

  return (
    <article className="landing-teacher-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Avatar size={54} ring verified={teacher.verified} imageUrl={fullUrl(teacher.user?.avatar_url)} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong className="landing-teacher-name">{name}</strong>
          <span className="landing-teacher-tag">{teacher.tag || teacher.field}</span>
        </div>
        {teacher.rating > 0 && (
          <span className="landing-teacher-rating"><Icon name="star" size={14} fill />{toFaDigits(teacher.rating.toFixed(1))}</span>
        )}
      </div>

      <div className="landing-teacher-meta">
        {teacher.city && <span><Icon name="pin" size={14} />{teacher.city}</span>}
        <span><Icon name="calendar" size={14} />{toFaDigits(teacher.sessions || 0)} جلسه</span>
        <span><Icon name="message" size={14} />{toFaDigits(teacher.reviews || 0)} نظر</span>
      </div>

      {teacher.bio && <p className="landing-teacher-bio">{teacher.bio}</p>}

      <div className="landing-teacher-footer">
        <span>
          <small>شروع جلسه از</small>
          <strong>{price > 0 ? `${formatFaNumber(price)} تومان` : 'مشاهده خدمات'}</strong>
        </span>
        <WebBtn size="sm" href={`/teachers/${teacher.id}`}>پروفایل و رزرو</WebBtn>
      </div>
    </article>
  );
}

export function FeaturedTeachers({ teachers, unavailable = false }: { teachers: Teacher[]; unavailable?: boolean }) {
  return (
    <section id="teachers" className="landing-section">
      <div className="public-container">
        <div className="landing-section-head">
          <SectionTitle kicker="استادان وُدّا" title="پروفایل‌های تأییدشده" sub="قبل از رزرو، تخصص، سابقه، خدمات، امتیاز و زمان‌های قابل رزرو را ببین." center={false} />
          <WebBtn variant="ghost" icon="arrowL" href="/search">مشاهده همه استادان</WebBtn>
        </div>

        {teachers.length ? (
          <div className="landing-teacher-grid">
            {teachers.slice(0, 6).map((teacher) => <WebTeacherCard key={teacher.id} teacher={teacher} />)}
          </div>
        ) : (
          <div className="landing-empty-state" role="status">
            <span><Icon name="users" size={27} /></span>
            <strong>{unavailable ? 'ارتباط با فهرست استادان برقرار نیست' : 'هنوز استاد تأییدشده‌ای منتشر نشده'}</strong>
            <p>{unavailable ? 'کمی بعد دوباره تلاش کنید.' : 'پس از تأیید اولین پروفایل‌ها، این بخش به‌صورت خودکار تکمیل می‌شود.'}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function WhyVodda() {
  const items = [
    ['shield' as const, 'پروفایل بررسی‌شده', 'استاد پیش از تأیید مدیر در نتایج عمومی نمایش داده نمی‌شود.'],
    ['calendar' as const, 'زمان واقعی رزرو', 'بازه‌ها از برنامهٔ کاری استاد و تداخل جلسات فعال محاسبه می‌شوند.'],
    ['wallet' as const, 'جریان مالی شفاف', 'کسر، بازگشت وجه، درآمد و برداشت در دفتر تراکنش‌ها ثبت می‌شوند.'],
    ['star' as const, 'بازخورد معتبرتر', 'امتیاز فقط برای قرآن‌آموز همان جلسه و پس از تکمیل جلسه ثبت می‌شود.'],
  ];

  return (
    <section className="landing-proof">
      <GeoPattern color="#fff" opacity={0.045} />
      <div className="public-container landing-proof-grid">
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <span className="landing-proof-kicker">چرا وُدّا؟</span>
          <h2>شفافیت در مسیری که قرار است ساده باشد.</h2>
          <p>وُدّا تلاش می‌کند آنچه واقعاً در محصول فعال است، همان چیزی باشد که در صفحه عمومی وعده داده می‌شود.</p>
          <WebBtn href="/about" variant="white" icon="arrowL">بیشتر درباره وُدّا</WebBtn>
        </div>
        <div className="landing-proof-cards">
          {items.map(([icon, title, description]) => (
            <article key={title}>
              <span><Icon name={icon} size={23} /></span>
              <strong>{title}</strong>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  return null;
}

function TeacherDashboardPreview() {
  return (
    <div className="teacher-preview-card" aria-hidden="true">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar size={42} ring />
        <span style={{ minWidth: 0, flex: 1 }}>
          <small style={{ display: 'block', color: 'var(--ink-3)' }}>پنل استاد</small>
          <strong style={{ display: 'block', marginTop: 2, fontSize: 13 }}>مدیریت آموزش در یک نگاه</strong>
        </span>
        <Icon name="refresh" size={17} style={{ color: 'var(--olive-600)' }} />
      </div>
      <div className="teacher-preview-wallet">
        <small>موجودی قابل برداشت</small>
        <strong>— <span>تومان</span></strong>
        <div>
          <span>امتیاز<strong>—</strong></span>
          <i />
          <span>جلسات<strong>—</strong></span>
          <i />
          <span>نظرها<strong>—</strong></span>
        </div>
      </div>
      <div className="teacher-preview-actions">
        <span><Icon name="book" size={18} />خدمات من</span>
        <span><Icon name="clock" size={18} />زمان کاری</span>
        <span><Icon name="wallet" size={18} />کیف پول</span>
        <span><Icon name="calendar" size={18} />جلسات</span>
      </div>
    </div>
  );
}

export function BecomeTeacher() {
  return (
    <section className="landing-section">
      <div className="public-container">
        <div className="landing-teacher-cta">
          <div className="landing-teacher-cta-copy">
            <div className="landing-eyebrow"><Icon name="award" size={16} />برای استادان</div>
            <h2>فضای حرفه‌ای خودت را در وُدّا بساز.</h2>
            <p>
              خدمات، تعرفه و زمان‌های کاری را مدیریت کن، درخواست‌های جلسه را ببین و درآمد و برداشت‌ها را از یک فضای یکپارچه پیگیری کن.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
              <WebBtn size="lg" href="/panel/teacher/register" icon="arrowL">ثبت درخواست استادی</WebBtn>
              <WebBtn size="lg" variant="ghost" href="/panel/teacher">ورود استاد</WebBtn>
            </div>
          </div>
          <TeacherDashboardPreview />
        </div>
      </div>
    </section>
  );
}

export function DownloadApp() {
  return (
    <section className="landing-app-cta">
      <div className="public-container">
        <div className="landing-app-cta-inner">
          <span className="landing-app-cta-icon"><Icon name="grid" size={25} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong>تجربه کامل وُدّا داخل اپ</strong>
            <p>همین رابط یکپارچه روی وب و نسخه‌های native در دسترس خواهد بود.</p>
          </div>
          <WebBtn href="/app" variant="dark" icon="arrowL">باز کردن اپ وب</WebBtn>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const productLinks = [
    ['جستجوی استاد', '/search'],
    ['اپ وُدّا', '/app'],
    ['استاد شوید', '/panel/teacher/register'],
    ['ورود', '/panel/login'],
  ];
  const companyLinks = [
    ['درباره وُدّا', '/about'],
    ['تماس با ما', '/contact'],
    ['سؤالات متداول', '/faq'],
    ['وبلاگ', '/blog'],
  ];
  const legalLinks = [
    ['قوانین استفاده', '/terms'],
    ['حریم خصوصی', '/privacy'],
  ];

  return (
    <footer className="public-footer">
      <div className="public-container">
        <div className="public-footer-grid">
          <div className="public-footer-brand">
            <Link href="/" style={brandStyle}>
              <img src="/vodda-logo.svg" alt="" style={{ width: 40, height: 40 }} />
              <span><strong style={{ display: 'block', color: '#fff', fontSize: 19 }}>وُدّا</strong><small>همراه یادگیری قرآن و مداحی</small></span>
            </Link>
            <p>فضایی برای پیدا کردن استاد، رزرو زمان و مدیریت شفاف مسیر آموزشی.</p>
          </div>

          <FooterColumn title="محصول" links={productLinks} />
          <FooterColumn title="وُدّا" links={companyLinks} />
          <FooterColumn title="حقوقی" links={legalLinks} />
        </div>

        <div className="public-footer-bottom">
          <span>© {toFaDigits(new Date().getFullYear())} وُدّا</span>
          <span>طراحی‌شده با تمرکز بر تجربه فارسی و RTL</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[][] }) {
  return (
    <div className="public-footer-column">
      <strong>{title}</strong>
      {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
    </div>
  );
}

const brandStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 9,
  color: 'var(--ink)',
};

const panelLinkStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '9px 10px',
  borderRadius: 10,
  color: 'var(--ink-2s)',
  fontSize: 13,
  fontWeight: 600,
};

const userButtonStyle: CSSProperties = {
  width: 40,
  height: 40,
  display: 'grid',
  placeItems: 'center',
  padding: 0,
  border: '1px solid var(--sand-200)',
  borderRadius: 13,
  color: 'var(--olive-700)',
  background: '#fff',
  cursor: 'pointer',
};

const menuBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 89,
  border: 0,
  background: 'transparent',
};

const menuStyle: CSSProperties = {
  position: 'absolute',
  zIndex: 90,
  insetInlineEnd: 0,
  top: 48,
  width: 245,
  padding: 12,
  border: '1px solid var(--sand-150)',
  borderRadius: 18,
  background: '#fff',
  boxShadow: 'var(--sh-lg)',
};

const logoutStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  padding: '9px 10px',
  border: 0,
  borderRadius: 10,
  color: 'var(--rose)',
  background: 'transparent',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
