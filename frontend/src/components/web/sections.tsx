'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { Teacher } from '@/lib/api';
import { clearToken, avatarUrl, fullUrl } from '@/lib/auth';
import type { CatalogCategory } from '@/lib/category';
import { formatFaNumber, toFaDigits } from '@/lib/persian';
import { Icon, type IconName } from '../Icon';
import { Avatar, GeoPattern, SectionTitle, WebBtn } from './ui';
import { CityChip, sortByCityPriority } from './CityChip';
import { CITY_CHANGE_EVENT, readStoredCity, storedCityUsable } from '@/lib/userCity';
import { TierSeal, TierChip } from './tier';
import {
  buildCategoryTiles,
  type CategoryTile,
  type FreeServiceCard,
  type PopularServiceCard,
  serviceImageSrc,
} from '@/lib/home/discover';
import { verseOfDay } from '@/lib/verses';

function PanelLink({ href, icon, label }: { href: string; icon: 'shield' | 'award' | 'user'; label: string }) {
  return (
    <Link href={href} style={panelLinkStyle}>
      <Icon name={icon} size={18} />
      <span style={{ flex: 1 }}>{label}</span>
      <Icon name="chevronL" size={14} />
    </Link>
  );
}

function UserMenu({ name, role, avatar, avatarVersion, hasTeacherProfile }: { name: string; role: string; avatar?: string; avatarVersion?: string | number | null; hasTeacherProfile: boolean }) {
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
              {/* آواتار مربعی واحد — آواتار خود کاربر با کش‌باستینگ ?v= تا پس از تغییر، نسخهٔ جدید فوراً دیده شود */}
              <Avatar size={46} name={name} ring={!avatar} imageUrl={avatar ? avatarUrl(avatar, avatarVersion) : undefined} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                <div style={{ marginTop: 2, color: 'var(--ink-3)', fontSize: 11.5 }}>{roleLabel}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {role === 'admin' && <PanelLink href="/panel/admin" icon="shield" label="پنل مدیریت" />}
              {hasTeacherProfile && <PanelLink href="/panel/teacher" icon="award" label="پنل استاد" />}
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
  const [user, setUser] = useState<{ name: string; role: string; avatar_url?: string; avatar_updated_at?: string | null; hasTeacherProfile: boolean } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<{ text: string; link: string } | null>(null);

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
            avatar_updated_at: body.data.updated_at ?? null,
            hasTeacherProfile: Boolean(body.data.teacher?.id),
          });
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let cancelled = false;
    try {
      if (sessionStorage.getItem('vodda-announcement-dismissed') === '1') return;
    } catch { /* storage unavailable */ }
    fetch('/api/backend/settings', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (cancelled || !body?.data?.settings) return;
        const settings = body.data.settings as Record<string, string>;
        if (settings.announcement_on === 'true' && settings.announcement_text?.trim()) {
          setAnnouncement({ text: settings.announcement_text.trim(), link: settings.announcement_link || '' });
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
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
      {announcement && (
        <div
          className="public-announcement"
          role="status"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            padding: '9px 40px 9px 14px', position: 'relative',
            background: 'linear-gradient(90deg, var(--olive-700), var(--olive-600))',
            color: '#fff', fontSize: 12.5, textAlign: 'center',
          }}
        >
          <Icon name="bell" size={14} />
          {announcement.link ? (
            <a href={announcement.link} style={{ color: '#fff', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {announcement.text}
            </a>
          ) : (
            <strong style={{ fontWeight: 700 }}>{announcement.text}</strong>
          )}
          <button
            type="button"
            aria-label="بستن اعلان"
            onClick={() => {
              setAnnouncement(null);
              try { sessionStorage.setItem('vodda-announcement-dismissed', '1'); } catch { /* ignore */ }
            }}
            style={{ position: 'absolute', insetInlineEnd: 10, top: '50%', transform: 'translateY(-50%)', border: 0, background: 'rgba(255,255,255,.16)', color: '#fff', width: 24, height: 24, borderRadius: 999, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          >
            <Icon name="x" size={13} />
          </button>
        </div>
      )}
      <div className="public-container public-nav-inner">
        {/* ۱.ب.۱ — chip شهر: گوشهٔ بالا (RTL راست / LTR چپ) — کنار برند در سمت شروع */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <CityChip />
          <Link href="/" style={brandStyle} aria-label="صفحه اصلی وُدّا">
            <img src="/vodda-logo.svg" alt="" style={{ width: 38, height: 38 }} />
            <span>
              <strong style={{ display: 'block', fontSize: 18, lineHeight: 1.2 }}>وُدّا</strong>
              <span className="brand-subtitle">همراه یادگیری</span>
            </span>
          </Link>
        </div>

        <nav className="desktop-nav" aria-label="ناوبری اصلی">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="public-nav-link">{label}</Link>
          ))}
          <Link href="/dispatch" className="nav-dispatch-btn" aria-label="فراخوان اساتید — درخواست زنده استاد">
            <span className="nav-dispatch-dot" aria-hidden="true" />
            <Icon name="bell" size={15} />
            فراخوان اساتید
          </Link>
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/app" className="nav-app-link">
            <Icon name="grid" size={17} />
            ورود به اپ
          </Link>
          {user ? <UserMenu name={user.name} role={user.role} avatar={user.avatar_url} avatarVersion={user.avatar_updated_at} hasTeacherProfile={user.hasTeacherProfile} /> : <WebBtn size="sm" href="/panel/login" style={{ minHeight: 40, display: 'inline-flex', alignItems: 'center', borderRadius: 12 }}>ورود</WebBtn>}
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
            <Link href="/dispatch" onClick={() => setMobileOpen(false)} className="mobile-menu-dispatch">
              <Icon name="bell" size={18} />
              <span style={{ flex: 1 }}>فراخوان اساتید</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#8b681f', background: 'var(--gold-bg)', borderRadius: 999, padding: '3px 8px' }}>جدید</span>
            </Link>
            <Link href={user?.hasTeacherProfile ? "/panel/teacher" : "/panel/teacher/register"} onClick={() => setMobileOpen(false)} className="mobile-menu-teacher">
              <Icon name="award" size={18} />
              {user?.hasTeacherProfile ? 'پنل استاد' : 'ثبت درخواست استادی'}
            </Link>
          </div>
        </>
      )}
    </header>
  );
}

function AppPreview() {
  /* ۱.۱۳.۰ — بازسازی دقیق نمایی از رابط فعلی اپ (گزینهٔ A): هدر تازه با سلام
   * بر پایهٔ ساعت، بنر کوچک منافسه، دسته‌بندی موضوعات با نئون طلایی، صحنهٔ
   * خدمات پرکاربرد زیتونی و نوار پایین با دکمهٔ میانی «فراخوان استاد». */
  const catTiles: Array<{ icon: IconName; name: string; count: string; img: string }> = [
    { icon: 'quran', name: 'قرآن‌آموزی پایه', count: '۱۹۶', img: '/images/home/cat-quran.webp' },
    { icon: 'book', name: 'تجوید و علوم قرائت', count: '۶۶', img: '/images/home/cat-tajweed.webp' },
    { icon: 'mic', name: 'صوت و لحن و هنر قرآنی', count: '۴۶', img: '/images/home/cat-voice.webp' },
    { icon: 'star', name: 'حفظ قرآن', count: '۶۴', img: '/images/home/cat-hifz.webp' },
  ];

  return (
    <div className="landing-app-stage" aria-label="نمایی از رابط اپ وُدّا">
      <div className="landing-orb landing-orb-gold" />
      <div className="landing-orb landing-orb-olive" />

      <span className="landing-preview-label">نمونه رابط اپ</span>
      <div className="landing-phone">
        {/* ── هدر اپ — سلام بر پایهٔ ساعت + نام کاربر + اعلان‌ها ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={42} ring />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', color: 'var(--ink-3)', fontSize: 10.5 }}>عصر بخیر · یکشنبه ۱ آذر</span>
            <strong style={{ display: 'block', marginTop: 1, fontSize: 13.5, fontWeight: 900 }}>قرآن‌آموز جان 🌿</strong>
          </div>
          <span style={{ width: 36, height: 36, display: 'grid', placeItems: 'center', borderRadius: 11, color: 'var(--olive-700)', background: 'var(--olive-50)', border: '1px solid var(--olive-100)' }}>
            <Icon name="bell" size={18} />
          </span>
        </div>

        {/* ── بنر کوچک منافسه — همان تم زیتونی بنر تازه ── */}
        <div className="landing-mona-mini" aria-hidden="true">
          <span className="landing-mona-mini-art">
            <img src="/banners/monafeseh.png" alt="" loading="lazy" />
          </span>
          <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 4 }}>
            <span className="landing-mona-mini-kicker"><Icon name="award" size={11} /> مسابقات قرآنی وُدّا</span>
            <strong className="landing-mona-mini-title">مُنافَسه</strong>
            <span className="landing-mona-mini-cta">همین حالا وارد شوید<Icon name="arrowL" size={12} /></span>
          </div>
        </div>

        {/* ── دسته‌بندی موضوعات — کادر نئونی طلایی ۲×۲ مثل اپ ── */}
        <div className="landing-mini-cats-wrap">
          <div className="landing-mini-cats-head">
            <strong>دسته‌بندی موضوعات قرآنی</strong>
            <small>روی هر موضوع بزنید تا صفحهٔ زیردسته‌ها باز شود.</small>
          </div>
          <div className="landing-mini-cats">
            {catTiles.map((tile, index) => (
              <span key={tile.name} className="landing-mini-cat" data-vline={index % 2 === 0 ? 'y' : undefined} data-hline={index < 2 ? 'y' : undefined}>
                <span className="landing-mini-cat-icon">
                  <Icon name={tile.icon} size={20} />
                  <img src={tile.img} alt="" loading="lazy" />
                </span>
                <strong>{tile.name}</strong>
                <span className="landing-mini-cat-count"><Icon name="users" size={11} /> {tile.count} استاد فعال</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── خدمات پرکاربرد — صحنهٔ زیتونی با هالهٔ طلایی ── */}
        <div className="landing-mini-services">
          <div className="landing-mini-services-head">
            <strong>خدمات پرکاربرد</strong>
            <small>پرترددترین خدمت‌های قرآنی وُدّا</small>
          </div>
          <div className="landing-mini-service">
            <span className="landing-mini-service-tile">
              <Icon name="quran" size={18} />
            </span>
            <span className="landing-mini-service-text">
              <strong>نقرات و مفاهیم قرآن کریم</strong>
              <small>استادان فعال: ۹</small>
            </span>
            <span className="landing-mini-service-btn">استادان این خدمت<Icon name="arrowL" size={11} /></span>
          </div>
          <div className="landing-mini-dots" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((d) => (
              <i key={d} className={d === 0 ? 'active' : undefined} />
            ))}
          </div>
        </div>

        {/* ── نوار پایین اپ — با دکمهٔ میانی «فراخوان استاد» ── */}
        <div className="landing-mini-bottom-nav">
          {([
            ['home', 'خانه', true],
            ['search', 'جستجو', false],
          ] as const).map(([icon, label, active]) => (
            <span key={label} className={active ? 'active' : undefined}>
              <Icon name={icon} size={15} />
              <small>{label}</small>
            </span>
          ))}
          <span className="landing-nav-fab-item">
            <span className="landing-nav-fab">
              <Icon name="megaphone" size={19} />
            </span>
            <small>فراخوان استاد</small>
          </span>
          {([
            ['calendar', 'جلسات', false],
            ['user', 'پروفایل', false],
          ] as const).map(([icon, label]) => (
            <span key={label}>
              <Icon name={icon} size={15} />
              <small>{label}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="landing-floating-card landing-floating-card-top">
        <span className="landing-floating-icon"><Icon name="checkCircle" size={18} /></span>
        <span><strong>استاد درجه‌دار</strong><small>مهر بین‌المللی، درجه ۲ و درجه ۳</small></span>
      </div>
      <div className="landing-floating-card landing-floating-card-bottom">
        <span className="landing-floating-icon gold"><Icon name="megaphone" size={18} /></span>
        <span><strong>فراخوان استاد</strong><small>ثبت فوری درخواست جلسه</small></span>
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
          <div className="landing-eyebrow"><Icon name="sparkle" size={16} />سکوی تخصصی آموزش قرآن کریم</div>
          <h1>استاد مناسب را بیابید،<br /><span>زمان دلخواه خود را رزرو کنید.</span></h1>
          <p>
            استادان تأییدشده را بر اساس تخصص و شهر بیابید، خدمات و زمان‌های آزاد را ببینید و جریان رزرو و پرداخت را به‌شفافیت از داخل وُدّا پیگیری کنید.
          </p>

          <form onSubmit={submit} className="landing-search-box">
            <label>
              <Icon name="search" size={19} />
              <input className="input-base" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="نام یا تخصص استاد" placeholder="نام یا تخصص استاد" />
            </label>
            <span className="landing-search-divider" />
            <label className="landing-city-field">
              <Icon name="pin" size={18} />
              <input className="input-base" value={city} onChange={(event) => setCity(event.target.value)} aria-label="شهر" placeholder="شهر" />
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

export function DispatchCallout() {
  const steps = [
    ['search' as const, '۱ · موضوع را انتخاب کنید', 'روخوانی، تجوید، صوت و لحن، حفظ و… از فهرست رسمی وُدّا.'],
    ['bell' as const, '۲ · فراخوان را ثبت کنید', 'درخواست شما برای همهٔ اساتید همان موضوع به‌صورت زنده پخش می‌شود.'],
    ['checkCircle' as const, '۳ · استاد خود را برگزینید', 'نخستین اساتیدِ آماده همان‌جا نمایش داده می‌شوند؛ یکی را تأیید کنید تا جلسه رزرو شود.'],
  ] as const;

  return (
    <section id="dispatch" className="landing-dispatch">
      <div className="public-container">
        <div className="landing-dispatch-inner">
          <div className="landing-dispatch-top">
            <div className="landing-dispatch-copy">
              <span className="landing-dispatch-badge"><Icon name="bell" size={14} /> فراخوان اساتید — ویژهٔ وُدّا</span>
              <h2>موضوع خود را اعلام کنید؛ اساتید آمادگی می‌دهند،<br /><span>و شما انتخاب می‌کنید.</span></h2>
              <p>
                به‌سرعت و بدون تماس تلفنی: درخواست شما بین همهٔ اساتیدِ موضوعِ دلخواه به‌صورت زنده پخش می‌شود و
                اساتید به‌ترتیب اعلام آمادگی می‌کنند؛ کافی است یکی را تأیید کنید تا جلسه با همان استاد رزرو شود.
              </p>
            </div>
            <div className="landing-dispatch-art" aria-hidden="true">
              <div className="dispatch-chip-float one">فراخوان زنده</div>
              <div className="dispatch-chip-float two">پاسخ در چند دقیقه</div>
              <div className="dispatch-chip-float three">انتخاب با شما</div>
              <div className="dispatch-radar">
                <span className="dispatch-radar-core"><Icon name="quran" size={30} /></span>
              </div>
            </div>
          </div>

          <div className="landing-dispatch-steps">
            {steps.map(([icon, title, description]) => (
              <article key={title} className="landing-dispatch-step">
                <small><Icon name={icon} size={15} /> گام</small>
                <strong>{title}</strong>
                <span>{description}</span>
              </article>
            ))}
          </div>

          <div className="landing-dispatch-actions">
            <Link href="/dispatch" className="dispatch-special-btn">
              <span className="dispatch-btn-icon"><Icon name="bell" size={18} /></span>
              فراخوان اساتید
            </Link>
            <WebBtn href="/search" size="lg" variant="ghost" icon="search">مشاهده اساتید هر موضوع</WebBtn>
            <span className="dispatch-special-note">
              <Icon name="shield" size={14} />
              فقط اساتید تأییدشدهٔ وُدّا در فراخوان دیده می‌شوند.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

// باگ category-routing — کارت‌های دسته از کاتالوگ رسمی خدمات می‌آیند و به
// صفحهٔ دسته می‌روند که فقط زیردسته‌های همان دسته و اساتید همان دسته را می‌بیند.
const CATEGORY_ICONS: Array<{ match: RegExp; icon: 'quran' | 'mic' | 'book' | 'doc' | 'headphones' | 'users' }> = [
  { match: /صوت|لحن/, icon: 'headphones' },
  { match: /حفظ/, icon: 'book' },
  { match: /تجوید|قرائت|تفسیر|مفاهیم|علوم/, icon: 'doc' },
  { match: /حضوری|مراسم/, icon: 'mic' },
];

function categoryIcon(name: string): 'quran' | 'mic' | 'book' | 'doc' | 'headphones' | 'users' {
  for (const rule of CATEGORY_ICONS) if (rule.match.test(name)) return rule.icon;
  return 'quran';
}

/* ═════════ ۱.ب.۲ — بخش ② آیهٔ روز (وب) ═════════ */

export function VerseOfDayCard() {
  const quote = verseOfDay();
  const isQuran = quote.source.startsWith('قرآن');
  return (
    <section className="landing-verse-section" aria-label="آیه و حدیث روز">
      <div className="public-container">
        <div className="landing-verse-card">
          <span className="landing-verse-icon"><Icon name="quran" size={20} /></span>
          <p className="landing-verse-text">
            {isQuran ? "﴿" : "«"} {quote.text} {isQuran ? "﴾" : "»"}
            <span className="landing-verse-source"> — {quote.source}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ═════════ ۱.ب.۳ — خانه‌های شش‌گانهٔ دسته‌بندی (وب) ═════════ */

/* ۰.۷.۵ — ناوبری سلسله‌مراتبی دسته‌بندی:
   کلیک روی دسته → صفحهٔ /categories/:slug (زیردسته‌های همان دسته با تصویر موضوعی)
   کلیک روی زیردسته → صفحهٔ اساتید همان خدمت + رزرو جلسهٔ آنلاین (/services/:id/teachers). */
export function CategoryTiles({ categories = [] as CatalogCategory[], teachers = [] as Parameters<typeof buildCategoryTiles>[0] }: { categories?: CatalogCategory[]; teachers?: Parameters<typeof buildCategoryTiles>[0] }) {
  const tiles: CategoryTile[] = buildCategoryTiles(teachers, categories, 6);

  if (tiles.length === 0) return null;

  const groups = tiles.map((tile) => ({
    tile,
    topics: categories.find((group) => group.category === tile.name)?.topics ?? [],
  }));

  return (
    <section className="landing-section landing-tiles" aria-label="دسته‌بندی موضوعات قرآنی">
      <div className="public-container">
        <SectionTitle
          kicker="مسیرهای قرآنی"
          title="دسته‌بندی موضوعات قرآنی"
          sub="روی هر دسته بزنید تا وارد زیردسته‌هایش شوید؛ سپس جلسهٔ آنلاین همان موضوع را رزرو کنید."
        />
        <div className="vodda-catalog-panel">
          {groups.map(({ tile, topics }, index) => (
            <div key={tile.name} className="vcp-tile" style={{ animationDelay: `${index * 40}ms` }}>
              <Link
                href={`/categories/${encodeURIComponent(tile.name)}`}
                className="vcp-head"
                aria-label={`ورود به زیردسته‌های ${tile.name} — ${formatFaNumber(tile.count)} استاد فعال`}
              >
                <span className="vcp-icon" aria-hidden="true">
                  {/* تصویر خیالی ≤۴۰px — خطا → آیکون quran جایش می‌نشیند */}
                  <img
                    src={serviceImageSrc(tile.imageKey)}
                    alt=""
                    width={40}
                    height={40}
                    loading="lazy"
                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                  />
                </span>
                <span className="vcp-text">
                  <strong className="vcp-title">{tile.name}</strong>
                  <small className="vcp-count">{formatFaNumber(tile.count)} استاد فعال</small>
                </span>
                <span className="vcp-arrow" aria-hidden="true"><Icon name="arrowL" size={15} /></span>
              </Link>
              {topics.length > 0 ? (
                <span className="vcp-topics">
                  {topics.map((topic) => (
                    <Link
                      key={topic.id}
                      href={`/services/${topic.id}/teachers`}
                      className="vcp-chip"
                      aria-label={`اساتید و رزرو جلسهٔ آنلاین ${topic.title}`}
                    >
                      {topic.title}
                    </Link>
                  ))}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Categories({ categories = [] as CatalogCategory[] }: { categories?: CatalogCategory[] }) {
  const cards = categories.slice(0, 6).map((group) => ({
    icon: categoryIcon(group.category),
    title: group.category,
    desc: `${group.topics.length} زیردستهٔ رسمی — فقط اساتید همین دسته.`,
    href: `/search?category=${encodeURIComponent(group.category)}`,
    meta: 'دستهٔ قرآنی',
  }));

  return (
    <section className="landing-categories">
      <div className="public-container">
        <div className="landing-category-grid">
          {cards.map((category) => (
            <Link key={category.title} href={category.href} className="landing-category-card neon-frame-gold">
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
    ['search' as const, 'استاد را بیابید', 'نام، تخصص، شهر یا جنسیت استاد را جستجو و پروفایل منتشرشده را بررسی کنید.'],
    ['calendar' as const, 'خدمت و زمان را انتخاب کنید', 'سرویس تأییدشده و بازهٔ آزاد واقعی از برنامهٔ کاری استاد را انتخاب کنید.'],
    ['checkCircle' as const, 'درخواست را پیگیری کنید', 'وضعیت رزرو، جلسه و گردش مالی را از فضای کاربری وُدّا دنبال کنید.'],
  ] as const;

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

/** نخستین بند بیوگرافی را برای نمایش فشرده در کارت‌ها برمی‌گرداند (بدون ایموجی آغازین). */
export function bioIntro(bio?: string | null): string {
  if (!bio) return '';
  const firstBlock = bio.trim().split(/\n\s*\n/)[0] || bio.trim();
  return firstBlock.replace(/^[\p{Extended_Pictographic}\u{1F000}-\u{1FAFF}\u2600-\u27BF]+\s*/u, '').trim();
}

/* ردیف نشان‌های کارت درجه ۱ (۱.الف.۵) — 🟦 تیک بین‌المللی، 🆓 خدمات رایگان، ⚡ جلسات فوری */
export const TIER1_BADGE_ITEMS: Record<string, { emoji: string; label: string }> = {
  international: { emoji: '🟦', label: 'تیک بین‌المللی' },
  free: { emoji: '🆓', label: 'خدمات رایگان' },
  instant: { emoji: '⚡', label: 'جلسات فوری' },
};

/* کارت استاد وب — ۰.۷.۴ سبک اسنپ‌داکتر (دقیقاً مطابق snapp.doctor):
   کارت سفید تخت ۱۶۵×۲۰۰ با گوشهٔ ۱۲px و حاشیهٔ روشن؛ ردیف بالا: آواتار ۶۴px در یک سمت +
   ستون دو بج در سمت دیگر (امتیاز کهربایی با ستاره / قیمت یا تعداد جلسه با زمینهٔ زیتونی روشن)؛
   نام ۱۴px یک‌خطی با 🏆 برای درجهٔ ۱؛ تخصص ۱۲px دوخطی خاکستری؛ دکمهٔ outline تمام‌عرض پایین.
   با href کل کارت لینک می‌شود (نتایج جستجو)؛ بدون href فقط دکمهٔ پایین لینک است (صفحهٔ نخست). */
export function WebTeacherCard({ teacher, href }: { teacher: Teacher; href?: string }) {
  const name = teacher.user?.name || 'استاد وُدّا';
  const price = Math.max(0, teacher.price30 || teacher.services?.[0]?.price || 0);
  const sessions = Math.max(0, teacher.sessions || 0);
  /* ۱.الف.۴ — چراغ حضور روی آواتار (last_seen واقعی از بک‌اند) */
  const lastSeen = teacher.last_seen ?? null;
  const tier1 = teacher.is_tier1 === true;
  const profileHref = href ?? `/teachers/${teacher.id}`;
  const rating = teacher.rating > 0 ? toFaDigits(teacher.rating.toFixed(1)) : '';

  const card = (
    <article className={`vodda-teacher-card${tier1 ? ' vodda-card-tier1' : ''}`}>
      <span className="vtc-top">
        <span className="vtc-head">
          <span className="vtc-avatar">
            <Avatar
              size={64}
              ring
              tier={teacher.tier}
              imageUrl={avatarUrl(teacher.user?.avatar_url, teacher.user?.updated_at)}
              name={name}
              online={teacher.available !== false}
              lastSeen={lastSeen}
            />
          </span>
          <span className="vtc-pills">
            {rating ? (
              <span className="vtc-pill vtc-pill-rating">
                <Icon name="star" size={12} fill style={{ color: 'var(--gold, #bf9540)' }} />
                {rating}
              </span>
            ) : tier1 ? (
              <span className="vtc-pill vtc-pill-gold">🏆 استاد درجه ۱</span>
            ) : (
              <TierChip tier={teacher.tier} size={10.5} />
            )}
            {price > 0 ? (
              <span className="vtc-pill vtc-pill-info">{formatFaNumber(price)} تومان</span>
            ) : sessions > 0 ? (
              <span className="vtc-pill vtc-pill-info">
                <Icon name="clock" size={11} />
                {toFaDigits(sessions)} جلسه
              </span>
            ) : null}
          </span>
        </span>
        <strong className="vtc-name">
          {tier1 ? (
            <span className="vtc-trophy" title="استاد درجه ۱" aria-label="استاد درجه ۱">🏆</span>
          ) : null}
          <span className="vtc-name-text">{name}</span>
        </strong>
        <span className="vtc-tag">{teacher.tag || teacher.field || 'آموزش قرآن'}</span>
      </span>
      {href ? (
        <span className="vtc-cta">پروفایل و رزرو<Icon name="arrowL" size={14} /></span>
      ) : (
        <Link href={profileHref} className="vtc-cta" aria-label={`${name} — پروفایل و رزرو`}>
          پروفایل و رزرو<Icon name="arrowL" size={14} />
        </Link>
      )}
    </article>
  );

  if (!href) return card;
  return (
    <Link href={href} className="vodda-teacher-link" aria-label={`${name} — پروفایل و رزرو`}>
      {card}
    </Link>
  );
}

export function FeaturedTeachers({ teachers, unavailable = false }: { teachers: Teacher[]; unavailable?: boolean }) {
  /* ۱.ب.۱ — اولویت هم‌شهری: chip شهر انتخاب شد → اساتید همان شهر در ابتدای فهرست
   * (فقط اولویت، نه محدودیت). تغییر chip با رویداد vodda-city-changed این‌جا هم اعمال می‌شود. */
  const [city, setCity] = useState('');
  useEffect(() => {
    const sync = () => {
      const stored = readStoredCity();
      setCity(stored && storedCityUsable(stored) ? stored.name : '');
    };
    sync();
    window.addEventListener(CITY_CHANGE_EVENT, sync);
    return () => window.removeEventListener(CITY_CHANGE_EVENT, sync);
  }, []);
  const visible = useMemo(() => sortByCityPriority(teachers, city), [teachers, city]);

  return (
    <section id="teachers" className="landing-section">
      <div className="public-container">
        <div className="landing-section-head">
          {/* ۱.ب.۲ — بخش ④ اساتید برتر: سطر اول درجهٔ ۱ */}
          <SectionTitle kicker="اساتید برتر وُدّا" title="استادان درجه‌دار — نخستِ فهرست" sub={city ? `اساتید ${city} در ابتدای فهرست اولویت دارند.` : 'استادان درجهٔ یک، کشوری و استانی وُدّا؛ پیش از رزرو، پروفایل و خدماتشان را ببینید.'} center={false} />
          <WebBtn variant="ghost" icon="arrowL" href="/search">مشاهده همه استادان</WebBtn>
        </div>

        {visible.length ? (
          <>
            {/* ۱.ب.۴ — شعار برجستهٔ سرِ کاروسل — کادرها پس از شعار به نمایش درمی‌آیند */}
            <p className="vodda-carousel-slogan">قرآن را از برترین‌ها بیاموزید</p>
            {/* ۰.۷.۵ — کادر افقی کم‌رنگ و جذاب دور ردیف اساتید (مثل اسنپ‌داکتر)؛ کارت‌ها داخل آن به چپ اسکرول می‌شوند */}
            <div className="vodda-teachers-frame">
              <div className="vodda-hscroll vodda-teacher-row">
                {visible.slice(0, 10).map((teacher) => <WebTeacherCard key={teacher.id} teacher={teacher} />)}
              </div>
            </div>
          </>
        ) : (
          <div className="landing-empty-state" role="status">
            <span><Icon name="users" size={27} /></span>
            <strong>{unavailable ? 'ارتباط با فهرست استادان برقرار نیست' : 'هنوز استاد تأییدشده‌ای منتشر نشده'}</strong>
            <p>{unavailable ? 'چند لحظه بعد دوباره تلاش کنید.' : 'پس از تأیید نخستین پروفایل‌ها، این بخش به‌صورت خودکار تکمیل می‌شود.'}</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ═════════ ۱.ب.۶ — خدمات پرکاربرد (وب) ═════════ */

/* ۰.۷.۵ — هویت اول کارت خدمت (طلایی/گرم): بنر تصویر موضوعی تمام‌عرض + چیپ شمارش استاد
   + عنوان + دکمهٔ «اساتید این خدمت» — کمی بزرگ‌تر از قبل. */
export function PopularServices({ services }: { services: PopularServiceCard[] }) {
  if (services.length === 0) return null;
  return (
    <section className="landing-section landing-popular" aria-label="خدمات پرکاربرد">
      <div className="public-container">
        <SectionTitle
          kicker="پرکاربردترین‌ها"
          title="خدمات پرمخاطب وُدّا"
          sub="۸ خدمت پرطرفدار با تصویر موضوعی — کلیک = ورود به اساتید همان خدمت و رزرو جلسه."
        />
        {/* ۰.۷.۵ — هویت طلایی در ردیف اسکرول افقی به چپ */}
        <div className="vodda-hscroll vodda-service-row">
          {services.map((service, index) => (
            <Link
              key={service.id}
              href={`/services/${service.id}/teachers`}
              className="vodda-service-card vsc-popular"
              style={{ animationDelay: `${index * 50}ms` }}
              aria-label={`${service.title} — ${formatFaNumber(service.teacherCount)} استاد`}
            >
              <span className="vsc-banner" aria-hidden="true">
                <img
                  src={serviceImageSrc(service.imageKey)}
                  alt=""
                  width={252}
                  height={118}
                  loading="lazy"
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
                />
                <span className="vsc-banner-tint" />
                <span className="vsc-count-chip">
                  <Icon name="users" size={12} />
                  {formatFaNumber(service.teacherCount)} استاد
                </span>
              </span>
              <span className="vsc-body">
                <strong className="vsc-title">{service.title}</strong>
                <span className="vsc-foot">
                  <span className="vsc-cta">اساتید این خدمت<Icon name="arrowL" size={13} /></span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═════════ ۱.ب.۴ — خدمات رایگان (وب) ═════════ */

/* ۰.۷.۵ — هویت دوم کارت خدمت (زیتونی/نعنایی): بنر تصویر با ته‌رنگ سبز + برچسب «رایگان»
   + ردیف استاد + دکمهٔ پر «رزرو جلسهٔ رایگان» — شکل و رنگ کاملاً جدا از هویت طلایی. */
export function FreeServiceCardRow({ card }: { card: FreeServiceCard }) {
  return (
    <Link
      href={`/teachers/${card.teacherId}?service=${card.id}`}
      className="vodda-service-card vsc-free"
      aria-label={`${card.title} رایگان با ${card.teacherName}`}
    >
      <span className="vsc-banner vsc-banner-free" aria-hidden="true">
        <img
          src={serviceImageSrc(card.imageKey)}
          alt=""
          width={236}
          height={98}
          loading="lazy"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
        <span className="vsc-banner-tint vsc-banner-tint-free" />
        <span className="vsc-freebadge">
          <Icon name="gift" size={11} />
          رایگان
        </span>
      </span>
      <span className="vsc-body">
        <strong className="vsc-title">{card.title}</strong>
        <span className="vsc-teacher">
          <Avatar
            size={24}
            imageUrl={avatarUrl(card.avatarUrl || undefined)}
            name={card.teacherName}
            alt={card.teacherName}
          />
          <span className="vsc-teacher-name">{card.teacherName}</span>
          {card.tier ? <TierSeal tier={card.tier} size={13} /> : null}
        </span>
        <span className="vsc-foot">
          <span className="vsc-duration">
            <Icon name="clock" size={12} />
            {card.duration > 0 ? `${formatFaNumber(card.duration)} دقیقه` : 'جلسهٔ رایگان'}
          </span>
          <span className="vsc-cta vsc-cta-free">رزرو جلسهٔ رایگان<Icon name="arrowL" size={13} /></span>
        </span>
      </span>
    </Link>
  );
}

export function FreeServicesSection({ services }: { services: FreeServiceCard[] }) {
  /* ۱.ب.۴ — بدون خدمت رایگان، کل بخش پنهان می‌شود؛ حداکثر ۶ کارت. */
  if (services.length === 0) return null;
  return (
    <section className="landing-section landing-free" aria-label="خدمات رایگان">
      <div className="public-container">
        <div className="landing-section-head">
          <SectionTitle
            kicker="بدون هزینه"
            title="خدمات رایگان وُدّا"
            sub="جلسه‌های رایگان استادان وُدّا — برای شروع مسیر قرآن."
          />
          <WebBtn variant="ghost" icon="arrowL" href="/free-services">مشاهدهٔ همه</WebBtn>
        </div>
        {/* ۰.۷.۲ — ردیف اسکرول افقی به چپ؛ هیچ کارتی به سطر بعد نمی‌رود */}
        <div className="vodda-hscroll vodda-service-row">
          {services.slice(0, 8).map((card) => <FreeServiceCardRow key={`${card.teacherId}-${card.id}`} card={card} />)}
        </div>
      </div>
    </section>
  );
}

/* ═════════ ۱.ب.۵ — اساتید پیشنهادی (وب — واکشی کلاینت با skeleton) ═════════ */

function RecommendedSkeleton() {
  return (
    <div className="vodda-teachers-frame">
      <div className="vodda-hscroll vodda-teacher-row" aria-label="در حال بارگذاری پیشنهادها">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="landing-recommended-skel" />
        ))}
      </div>
    </div>
  );
}

export function RecommendedTeachers({ limit = 7 }: { limit?: number }) {
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/backend/teachers/recommended?limit=${limit}`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((body) => {
        if (!active) return;
        setTeachers(Array.isArray(body?.data) ? (body.data as Teacher[]) : []);
      })
      .catch(() => {
        if (active) setTeachers([]);
      });
    return () => {
      active = false;
    };
  }, [limit]);

  return (
    <section className="landing-section landing-recommended" aria-label="اساتید پیشنهادی">
      <div className="public-container">
        <SectionTitle
          kicker="هر بار تازه"
          title="اساتید پیشنهادی وُدّا"
          sub="چیدمان وزنی بر پایهٔ rank استاد — با هر بازدید چیدمان تازه‌ای می‌بینی."
        />
        {teachers === null ? (
          <RecommendedSkeleton />
        ) : teachers.length === 0 ? (
          <div className="landing-empty-state" role="status">
            <span><Icon name="sparkle" size={27} /></span>
            <strong>پیشنهادها هنوز آماده نیست</strong>
            <p>پس از تکمیل پروفایل استادان، چیدمان پیشنهادی این‌جا نمایش داده می‌شود.</p>
          </div>
        ) : (
          <div className="vodda-teachers-frame">
            <div className="vodda-hscroll vodda-teacher-row">
              {teachers.map((teacher) => <WebTeacherCard key={teacher.id} teacher={teacher} />)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ═════════ ۱.ب.۳ — اساتید بانو (وب) — هم‌گامی با کاروسل اپ ═════════
 * درخواست مدیر: بخش پایانی صفحهٔ اصلی برای استادان بانو با هویت رنگی متمایز
 * (رز/گل‌مُشکی به‌جای طلایی برند). همان ردیف اسکرول اساتید برتر؛ فیلتر female. */
export function BanoTeachers({ teachers, unavailable = false }: { teachers: Teacher[]; unavailable?: boolean }) {
  const bano = useMemo(() => teachers.filter((teacher) => teacher.female), [teachers]);

  return (
    <section className="landing-section landing-bano" aria-label="اساتید بانو">
      <div className="public-container">
        <div className="landing-section-head">
          <SectionTitle
            kicker="اساتید بانو وُدّا"
            title="قرآن‌آموزی در محضر بانوان استاد"
            sub="استادان بانوی وُدّا در یک نگاه — بانوانی که در محضر خانم‌ها آرام‌تر می‌آموزند، این‌جا انتخاب می‌کنند."
            center={false}
          />
          <WebBtn variant="ghost" icon="arrowL" href="/search?female=true">مشاهده همه اساتید بانو</WebBtn>
        </div>

        {bano.length ? (
          <>
            {/* ۱.ب.۴ — شعار برجستهٔ سرِ کاروسل — کادرها پس از شعار به نمایش درمی‌آیند */}
            <p className="vodda-carousel-slogan vodda-carousel-slogan-bano">قرآن را با مهرِ بانوانِ وُدّا بیاموزید</p>
            <div className="vodda-teachers-frame vodda-teachers-frame-bano">
              <div className="vodda-hscroll vodda-teacher-row">
                {bano.slice(0, 10).map((teacher) => <WebTeacherCard key={teacher.id} teacher={teacher} />)}
              </div>
            </div>
          </>
        ) : (
          <div className="landing-empty-state" role="status">
            <span><Icon name="heart" size={27} /></span>
            <strong>{unavailable ? 'ارتباط با فهرست استادان برقرار نیست' : 'هنوز استاد بانویی منتشر نشده'}</strong>
            <p>{unavailable ? 'چند لحظه بعد دوباره تلاش کنید.' : 'پس از تأیید نخستین پروفایل‌ها، این بخش به‌صورت خودکار تکمیل می‌شود.'}</p>
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
  ] as const;

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
            <h2>فضای حرفه‌ای خود را در وُدّا بسازید.</h2>
            <p>
              خدمات، تعرفه و زمان‌های کاری را مدیریت کنید، درخواست‌های جلسه را ببینید و درآمد و برداشت‌ها را در یک فضای یکپارچه پیگیری کنید.
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
            <strong>تجربهٔ کامل وُدّا در اپ</strong>
            <p>همین رابط یکپارچه در وب و نسخهٔ موبایل در دسترس است.</p>
          </div>
          <WebBtn href="/app" variant="dark" icon="arrowL">ورود به اپ وُدّا</WebBtn>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const productLinks = [
    ['فراخوان اساتید', '/dispatch'],
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
              <span><strong style={{ display: 'block', color: '#fff', fontSize: 19 }}>وُدّا</strong><small>همراه یادگیری قرآن کریم</small></span>
            </Link>
            <p>فضایی برای پیدا کردن استاد، رزرو زمان و مدیریت شفاف مسیر آموزشی.</p>
          </div>

          <FooterColumn title="محصول" links={productLinks} />
          <FooterColumn title="وُدّا" links={companyLinks} />
          <FooterColumn title="حقوقی" links={legalLinks} />
        </div>

        <div className="public-footer-bottom">
          <span>© {toFaDigits(new Date().getFullYear())} وُدّا</span>
          <span>همراه فارسی آموزش و خدمات قرآن کریم</span>
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
