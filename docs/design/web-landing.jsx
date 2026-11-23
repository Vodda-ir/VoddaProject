// web-landing.jsx — Vodda public website (landing) — RTL, olive/sand
// Reuses: Icon, Placeholder, Stars, fa, toman, TEACHERS

function GeoPattern({ color = '#fff', opacity = 0.08 }) {
  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity }} aria-hidden="true">
      <defs>
        <pattern id={'wgeo' + color.replace(/[^a-z0-9]/gi, '')} width="46" height="46" patternUnits="userSpaceOnUse">
          <path d="M23 6l4 8 8-4-4 8 8 4-8 4 4 8-8-4-4 8-4-8-8 4 4-8-8-4 8-4-4-8 8 4 4-8z" fill="none" stroke={color} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={'url(#wgeo' + color.replace(/[^a-z0-9]/gi, '') + ')'} />
    </svg>
  );
}

function WebBtn({ children, variant = 'primary', size = 'md', icon, href = '#', style = {} }) {
  const sizes = { sm: { fontSize: 14, padding: '9px 16px' }, md: { fontSize: 15, padding: '12px 22px' }, lg: { fontSize: 16, padding: '15px 28px' } };
  const variants = {
    primary: { background: 'var(--olive-600)', color: '#fff', boxShadow: 'var(--sh-olive)' },
    dark: { background: 'var(--olive-900)', color: '#fff' },
    ghost: { background: 'transparent', color: 'var(--olive-700)', boxShadow: 'inset 0 0 0 1.5px var(--olive-300)' },
    white: { background: '#fff', color: 'var(--olive-700)', boxShadow: 'var(--sh-sm)' },
    soft: { background: 'var(--olive-100)', color: 'var(--olive-700)' },
  };
  return (
    <a href={href} onClick={e => e.preventDefault()} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700, borderRadius: 999, textDecoration: 'none', whiteSpace: 'nowrap', transition: 'transform .12s', ...sizes[size], ...variants[variant], ...style }}>
      {icon && <Icon name={icon} size={size === 'lg' ? 20 : 18} stroke={2} />}
      {children}
    </a>
  );
}

function Nav() {
  const links = ['خانه', 'اساتید قرآن', 'مداحی', 'چگونه کار می‌کند', 'استاد شوید'];
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(250,248,242,.85)', backdropFilter: 'blur(14px)', borderBottom: '1px solid var(--sand-200)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 26, color: 'var(--olive-700)', letterSpacing: '-.5px' }}>
            وُدّا <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', marginBottom: 12 }} />
          </div>
          <nav style={{ display: 'flex', gap: 26 }} className="nav-links">
            {links.map((l, i) => (
              <a key={l} href="#" onClick={e => e.preventDefault()} style={{ fontSize: 14.5, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? 'var(--ink)' : 'var(--ink-2s)', textDecoration: 'none' }}>{l}</a>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="#" onClick={e => e.preventDefault()} style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink-2s)', textDecoration: 'none' }} className="hide-sm">ورود</a>
          <WebBtn size="sm" icon="download">دانلود اپ</WebBtn>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(900px 500px at 85% -5%, var(--olive-50) 0%, transparent 60%)' }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '70px 28px 80px', display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 50, alignItems: 'center', position: 'relative' }} className="hero-grid">
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--olive-50)', color: 'var(--olive-700)', padding: '8px 16px', borderRadius: 999, fontSize: 13.5, fontWeight: 700, marginBottom: 22, boxShadow: 'inset 0 0 0 1px var(--olive-100)' }}>
            <Icon name="sparkle" size={16} /> سکّوی اتصال قرآن‌آموز و استاد
          </div>
          <h1 style={{ fontSize: 50, fontWeight: 800, lineHeight: 1.35, letterSpacing: '-1px', marginBottom: 20 }}>
            استادِ قرآن و مداحی‌ات را<br /><span style={{ color: 'var(--olive-600)' }}>آنلاین</span> پیدا کن
          </h1>
          <p style={{ fontSize: 17, lineHeight: 2, color: 'var(--ink-2s)', maxWidth: 480, marginBottom: 32 }}>
            با بهترین اساتید قرآن کریم و مداحی اهل‌بیت، جلسهٔ آموزشی خصوصی رزرو کن — ساده، مطمئن و با پرداخت امن.
          </p>
          {/* search */}
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
            <WebBtn icon="search">جستجو</WebBtn>
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

        {/* visual composition */}
        <div style={{ position: 'relative' }} className="hero-visual">
          <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', boxShadow: 'var(--sh-lg)', background: 'linear-gradient(135deg,var(--olive-700),var(--olive-500))', aspectRatio: '4/5' }}>
            <GeoPattern color="#fff" opacity={0.1} />
            <Placeholder w="100%" h="100%" label="عکس استاد قرآن" style={{ position: 'absolute', inset: 0, mixBlendMode: 'luminosity', opacity: .55 }} />
          </div>
          {/* floating rating card */}
          <div style={{ position: 'absolute', top: 28, insetInlineStart: -26, background: '#fff', borderRadius: 18, padding: '14px 18px', boxShadow: 'var(--sh-lg)', display: 'flex', alignItems: 'center', gap: 12 }} className="float-card">
            <div style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--gold-bg)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="star" size={22} fill /></div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>۴٫۹ از ۵</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>رضایت قرآن‌آموزان</div>
            </div>
          </div>
          {/* floating session card */}
          <div style={{ position: 'absolute', bottom: 26, insetInlineEnd: -26, background: '#fff', borderRadius: 18, padding: '14px 16px', boxShadow: 'var(--sh-lg)', width: 220 }} className="float-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Avatar size={38} verified />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>عباس ملک‌محمدی</div>
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

function Categories() {
  const cats = [
    { icon: 'quran', title: 'آموزش قرآن کریم', desc: 'روخوانی، روان‌خوانی، تجوید، صوت و لحن و حفظ', n: '۵۲۰ استاد', bg: 'var(--olive-100)', c: 'var(--olive-700)' },
    { icon: 'mic', title: 'مداحی اهل‌بیت', desc: 'نوحه‌خوانی، مرثیه، مدیحه و آشنایی با دستگاه‌ها', n: '۱۸۰ استاد', bg: 'var(--clay-bg)', c: 'var(--clay)' },
    { icon: 'phone', title: 'مشاورهٔ صوتی', desc: 'گفت‌وگوی زندهٔ صوتی برای راهنمایی و رفع اشکال', n: 'گفت‌وگوی زنده', bg: 'var(--gold-bg)', c: '#9A7426' },
  ];
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }} className="cat-grid">
        {cats.map(c => (
          <div key={c.title} style={{ background: '#fff', borderRadius: 24, padding: 26, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)' }}>
            <div style={{ width: 58, height: 58, borderRadius: 17, background: c.bg, color: c.c, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}><Icon name={c.icon} size={30} /></div>
            <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 9 }}>{c.title}</h3>
            <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ink-3)', marginBottom: 16 }}>{c.desc}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: c.c, background: c.bg, padding: '5px 12px', borderRadius: 999 }}>{c.n}</span>
              <a href="#" onClick={e => e.preventDefault()} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 13.5, fontWeight: 700, color: 'var(--ink-2s)', textDecoration: 'none' }}>مشاهده <Icon name="chevronL" size={17} /></a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: 'search', title: 'استاد را پیدا کن', desc: 'بر اساس تخصص، شهر و امتیاز، استاد مناسب خود را جستجو کن.' },
    { icon: 'calendar', title: 'جلسه را رزرو کن', desc: 'روز و ساعت آزاد استاد را انتخاب و درخواست جلسه ثبت کن.' },
    { icon: 'phone', title: 'در جلسه شرکت کن', desc: 'پس از تأیید استاد، در زمان مقرر جلسهٔ صوتی برگزار می‌شود.' },
  ];
  return (
    <section style={{ background: 'var(--surface-warm)', borderBlock: '1px solid var(--sand-150)', padding: '70px 0', marginTop: 30 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px' }}>
        <SectionTitle kicker="ساده و سریع" title="وُدّا چگونه کار می‌کند؟" sub="تنها در سه گام به استاد دلخواهت وصل شو." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 26, marginTop: 44, position: 'relative' }} className="cat-grid">
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

function SectionTitle({ kicker, title, sub, center = true }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'start', maxWidth: center ? 600 : 'none', margin: center ? '0 auto' : 0 }}>
      {kicker && <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--olive-600)', marginBottom: 12, letterSpacing: .3 }}>{kicker}</div>}
      <h2 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.5px', marginBottom: sub ? 14 : 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: 16, lineHeight: 1.9, color: 'var(--ink-3)' }}>{sub}</p>}
    </div>
  );
}

Object.assign(window, { WebBtn, Nav, Hero, Categories, HowItWorks, SectionTitle, GeoPattern });
