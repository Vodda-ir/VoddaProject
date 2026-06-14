// web-landing2.jsx — featured teachers, why, testimonials, CTA bands, footer + page

function WebTeacherCard({ t }) {
  return (
    <div style={{ background: '#fff', borderRadius: 22, padding: 18, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)', transition: 'transform .15s, box-shadow .2s', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--sh-lg)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--sh-sm)'; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
        <Avatar size={58} ring verified={t.verified} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800 }}>{t.short}</div>
          <div style={{ fontSize: 12.5, color: 'var(--olive-600)', fontWeight: 600, marginTop: 3 }}>{t.tag}</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--gold)', fontWeight: 800, fontSize: 14 }}><Icon name="star" size={15} fill />{fa(t.rating)}</span>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.85, color: 'var(--ink-3)', marginBottom: 14, height: 48, overflow: 'hidden' }}>{t.bio}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {t.skills.slice(0, 3).map(s => <span key={s} style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--olive-700)', background: 'var(--olive-50)', padding: '5px 11px', borderRadius: 999 }}>{s}</span>)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--sand-100)' }}>
        <div>
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>از </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{fa((t.price30 / 1000))}</span>
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}> هزار ت</span>
        </div>
        <WebBtn size="sm">رزرو جلسه</WebBtn>
      </div>
    </div>
  );
}

function FeaturedTeachers() {
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '70px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
        <SectionTitle kicker="منتخب وُدّا" title="اساتید برتر این هفته" center={false} />
        <WebBtn variant="ghost" icon="arrowL">مشاهدهٔ همهٔ اساتید</WebBtn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22 }} className="cat-grid">
        {TEACHERS.slice(0, 6).map(t => <WebTeacherCard key={t.id} t={t} />)}
      </div>
    </section>
  );
}

function WhyVodda() {
  const items = [
    { icon: 'shield', title: 'اساتید تأییدشده', desc: 'هر استاد پیش از نمایش، توسط تیم وُدّا بررسی و تأیید می‌شود.' },
    { icon: 'wallet', title: 'پرداخت امن', desc: 'پرداخت از طریق کیف پول داخلی و درگاه امن، با شفافیت کامل.' },
    { icon: 'star', title: 'امتیاز واقعی', desc: 'نظرات و امتیازها فقط از قرآن‌آموزانی که جلسه داشته‌اند ثبت می‌شود.' },
    { icon: 'headphones', title: 'پشتیبانی همراه', desc: 'تیم پشتیبانی در تمام مراحل رزرو و برگزاری جلسه کنار شماست.' },
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
          {items.map(it => (
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

function Testimonials() {
  const data = [
    { name: 'مجتبی ش.', role: 'قرآن‌آموز', rating: 5, text: 'با وُدّا تونستم استاد تجویدی پیدا کنم که واقعاً صبور و دلسوزه. تلاوتم بعد از چند جلسه خیلی بهتر شد.' },
    { name: 'سکینه ر.', role: 'قرآن‌آموز', rating: 5, text: 'رزرو جلسه خیلی ساده بود و پرداخت از کیف پول راحت. جلسه‌ها دقیق و منظم برگزار شد.' },
    { name: 'حسین ک.', role: 'مداح', rating: 5, text: 'به‌عنوان مداح، وُدّا کمک کرد شاگردهای جدید پیدا کنم و درآمدم منظم بشه. پنل استاد خیلی کاربردیه.' },
  ];
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '76px 28px' }}>
      <SectionTitle kicker="تجربهٔ کاربران" title="آن‌ها به وُدّا اعتماد کرده‌اند" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22, marginTop: 44 }} className="cat-grid">
        {data.map(d => (
          <div key={d.name} style={{ background: '#fff', borderRadius: 22, padding: 26, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)' }}>
            <Stars value={d.rating} size={17} />
            <p style={{ fontSize: 14.5, lineHeight: 2, color: 'var(--ink-2s)', margin: '16px 0 20px' }}>«{d.text}»</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <Avatar size={42} />
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

function BecomeTeacher() {
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px 30px' }}>
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 30, background: 'linear-gradient(120deg,var(--olive-700),var(--olive-500))', color: '#fff', padding: '54px 50px', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 40, alignItems: 'center' }} className="cta-grid">
        <GeoPattern color="#fff" opacity={0.08} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: 'var(--gold-soft)', marginBottom: 16 }}><Icon name="award" size={18} /> ویژهٔ اساتید</div>
          <h2 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.4, letterSpacing: '-.5px', marginBottom: 16 }}>دانش قرآنی‌ات را<br />به درآمد تبدیل کن</h2>
          <p style={{ fontSize: 16, lineHeight: 1.95, opacity: .88, maxWidth: 420, marginBottom: 28 }}>پروفایل حرفه‌ای بساز، خدماتت را تعریف کن و از هر جلسه درآمد کسب کن. تسویه‌حساب شفاف و منظم.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <WebBtn variant="white" size="lg" icon="arrowL">ثبت‌نام به‌عنوان استاد</WebBtn>
            <WebBtn size="lg" style={{ background: 'rgba(255,255,255,.14)', boxShadow: 'none', color: '#fff' }}>اطلاعات بیشتر</WebBtn>
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14 }} className="hide-md">
          {[['۱۵٪', 'کارمزد منصفانه'], ['هفتگی', 'تسویه‌حساب منظم'], ['۲۴/۷', 'پشتیبانی اساتید']].map(([n, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,.1)', borderRadius: 16, padding: '16px 20px', backdropFilter: 'blur(6px)' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold-soft)', minWidth: 64 }}>{n}</div>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DownloadApp() {
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '50px 28px 70px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 30, flexWrap: 'wrap', background: 'var(--surface-warm)', border: '1px solid var(--sand-150)', borderRadius: 26, padding: '34px 40px' }}>
        <div>
          <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>اپلیکیشن وُدّا را دریافت کنید</h3>
          <p style={{ fontSize: 15, color: 'var(--ink-3)', lineHeight: 1.8 }}>تجربهٔ کامل رزرو و برگزاری جلسه، روی گوشی شما.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['بازار', 'مایکت', 'App Store'].map(s => (
            <a key={s} href="#" onClick={e => e.preventDefault()} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'var(--olive-900)', color: '#fff', padding: '13px 20px', borderRadius: 14, textDecoration: 'none', fontWeight: 700, fontSize: 14.5 }}>
              <Icon name="download" size={19} /> {s}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    { h: 'وُدّا', links: ['دربارهٔ ما', 'تماس با ما', 'وبلاگ', 'فرصت‌های شغلی'] },
    { h: 'خدمات', links: ['آموزش قرآن', 'مداحی', 'مشاورهٔ صوتی', 'اساتید بانو'] },
    { h: 'راهنما', links: ['چگونه کار می‌کند', 'سؤالات متداول', 'قوانین و مقررات', 'حریم خصوصی'] },
  ];
  return (
    <footer style={{ background: 'var(--olive-900)', color: 'rgba(255,255,255,.75)', paddingTop: 56 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 30, paddingBottom: 44 }} className="footer-grid">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 26, color: '#fff', marginBottom: 14 }}>وُدّا <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', marginBottom: 12 }} /></div>
            <p style={{ fontSize: 13.5, lineHeight: 2, maxWidth: 300 }}>سکّوی اتصال قرآن‌آموزان و اساتید قرآن و مداحی، برای یادگیری آسان و مطمئن.</p>
          </div>
          {cols.map(c => (
            <div key={c.h}>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 16 }}>{c.h}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {c.links.map(l => <a key={l} href="#" onClick={e => e.preventDefault()} style={{ fontSize: 13.5, color: 'rgba(255,255,255,.7)', textDecoration: 'none' }}>{l}</a>)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 0', borderTop: '1px solid rgba(255,255,255,.1)', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13 }}>© ۱۴۰۴ وُدّا — تمامی حقوق محفوظ است.</span>
          <span style={{ fontSize: 13 }}>ساخته‌شده با ❤ برای جامعهٔ قرآنی</span>
        </div>
      </div>
    </footer>
  );
}

function WebLanding() {
  return (
    <div style={{ background: 'var(--sand-50)' }}>
      <Nav />
      <Hero />
      <Categories />
      <HowItWorks />
      <FeaturedTeachers />
      <WhyVodda />
      <Testimonials />
      <BecomeTeacher />
      <DownloadApp />
      <Footer />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<WebLanding />);
