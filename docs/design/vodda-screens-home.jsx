// vodda-screens-home.jsx — Home + Search/Explore screens

function GeoPattern({ color = '#fff', opacity = 0.08 }) {
  // subtle 8-point star tile, decorative only
  return (
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity }} aria-hidden="true">
      <defs>
        <pattern id="vodda-geo" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
          <path d="M23 6l4 8 8-4-4 8 8 4-8 4 4 8-8-4-4 8-4-8-8 4 4-8-8-4 8-4-4-8 8 4 4-8z"
            fill="none" stroke={color} strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#vodda-geo)" />
    </svg>
  );
}

function HomeHeader({ onProfile, onBell }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <Avatar size={46} ring />
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>وقت بخیر،</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{USER.first} جان 🌿</div>
        </div>
      </div>
      <button onClick={onBell} style={{
        position: 'relative', width: 44, height: 44, borderRadius: 14, background: 'var(--surface)',
        boxShadow: 'var(--sh-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2s)',
      }}>
        <Icon name="bell" size={21} />
        <span style={{ position: 'absolute', top: 11, insetInlineEnd: 12, width: 8, height: 8, borderRadius: '50%', background: 'var(--clay)', border: '2px solid var(--surface)' }} />
      </button>
    </div>
  );
}

function HeroRequest({ onRequest }) {
  return (
    <div style={{ padding: '0 20px', marginBottom: 22 }}>
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-xl)',
        background: 'linear-gradient(135deg,var(--olive-700),var(--olive-600) 55%,var(--olive-500))',
        padding: '22px 22px 20px', color: '#fff', boxShadow: 'var(--sh-olive)',
      }}>
        <GeoPattern color="#fff" opacity={0.10} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Icon name="sparkle" size={18} style={{ color: 'var(--gold-soft)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, opacity: .9 }}>به وُدّا خوش آمدید</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.5, marginBottom: 4 }}>استاد قرآن و مداحی‌ات را<br/>همین حالا پیدا کن</div>
          <p style={{ fontSize: 13, opacity: .85, lineHeight: 1.7, marginBottom: 16, maxWidth: 250 }}>یک جلسهٔ آموزشی صوتی با بهترین اساتید، تنها با چند لمس.</p>
          <button onClick={onRequest} style={{
            display: 'inline-flex', alignItems: 'center', gap: 9, background: '#fff', color: 'var(--olive-700)',
            fontWeight: 800, fontSize: 15, padding: '13px 20px', borderRadius: 999, boxShadow: '0 6px 18px rgba(0,0,0,.18)',
          }}>
            <span style={{ display: 'flex', width: 24, height: 24, borderRadius: '50%', background: 'var(--olive-600)', color: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={16} stroke={2.4} />
            </span>
            درخواست وُدّا
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickCats({ onPick }) {
  const cats = [
    { id: 'quran', icon: 'quran', label: 'آموزش قرآن', sub: '۱۲۰+ استاد', bg: 'var(--olive-100)', c: 'var(--olive-700)' },
    { id: 'madahi', icon: 'mic', label: 'مداحی', sub: '۴۰+ استاد', bg: 'var(--clay-bg)', c: 'var(--clay)' },
    { id: 'voice', icon: 'phone', label: 'مشاورهٔ صوتی', sub: 'گفت‌وگوی زنده', bg: 'var(--gold-bg)', c: '#9A7426' },
  ];
  return (
    <div style={{ display: 'flex', gap: 10, padding: '0 20px', marginBottom: 26 }}>
      {cats.map(c => (
        <button key={c.id} onClick={() => onPick(c.id)} style={{
          flex: 1, background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: '15px 10px 13px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, boxShadow: 'var(--sh-sm)',
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: c.bg, color: c.c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={c.icon} size={25} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{c.label}</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{c.sub}</div>
        </button>
      ))}
    </div>
  );
}

function FeaturedTeacher({ t, onOpen }) {
  return (
    <div style={{ padding: '0 20px', marginBottom: 26 }}>
      <div onClick={() => onOpen(t)} style={{
        position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-xl)', cursor: 'pointer',
        background: 'linear-gradient(120deg,var(--olive-900),var(--olive-800))', padding: 18, color: '#fff',
        display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--sh-md)',
      }}>
        <GeoPattern color="var(--gold-soft)" opacity={0.07} />
        <Placeholder w={92} h={108} radius={18} label="عکس استاد" style={{ flexShrink: 0, position: 'relative', border: '2px solid rgba(255,255,255,.15)' }} />
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--gold-soft)', marginBottom: 7 }}>
            <Icon name="award" size={15} /> استاد منتخب هفته
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 3 }}>{t.short}</div>
          <div style={{ fontSize: 12.5, opacity: .8, marginBottom: 12 }}>{t.tag} · {t.city}</div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, background: 'rgba(255,255,255,.14)', padding: '7px 14px', borderRadius: 999 }}>
            <Icon name="plus" size={15} stroke={2.4} /> دنبال کردن
          </span>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ go }) {
  const recommended = TEACHERS.filter(t => !t.female);
  const women = TEACHERS.filter(t => t.female);
  return (
    <div className="scr-enter" style={{ paddingBottom: 24 }}>
      <HomeHeader onProfile={() => go('tab', 'profile')} onBell={() => go('notif')} />
      <HeroRequest onRequest={() => go('search')} />

      {/* recent / followed teachers strip */}
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '0 20px', marginBottom: 24 }}>
        {TEACHERS.map(t => (
          <button key={t.id} onClick={() => go('profile', t)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0, width: 60 }}>
            <Avatar size={58} ring verified={t.verified} />
            <span style={{ fontSize: 11, color: 'var(--ink-2s)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 60 }}>{t.short.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <QuickCats onPick={() => go('search')} />

      <SectionHeader title="اساتید پیشنهادی" action="مشاهدهٔ همه" onAction={() => go('search')} />
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '0 20px 4px', marginBottom: 28 }}>
        {recommended.map(t => (
          <TeacherCard key={t.id} t={t} onOpen={x => go('profile', x)} onBook={x => go('booking', x)} />
        ))}
      </div>

      <FeaturedTeacher t={TEACHERS[1]} onOpen={x => go('profile', x)} />

      <SectionHeader title="اساتید بانو" action="مشاهدهٔ همه" onAction={() => go('search')} />
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '0 20px 4px' }}>
        {women.map(t => (
          <TeacherCard key={t.id} t={t} onOpen={x => go('profile', x)} onBook={x => go('booking', x)} />
        ))}
      </div>
    </div>
  );
}

function SearchScreen({ go }) {
  const [q, setQ] = React.useState('');
  const [field, setField] = React.useState('all');
  const fields = [
    { id: 'all', label: 'همه' },
    { id: 'آموزش قرآن کریم', label: 'آموزش قرآن' },
    { id: 'مداحی اهل‌بیت', label: 'مداحی' },
  ];
  const list = TEACHERS.filter(t =>
    (field === 'all' || t.field === field) &&
    (q === '' || t.short.includes(q) || t.tag.includes(q))
  );
  return (
    <div className="scr-enter" style={{ paddingBottom: 24 }}>
      <div style={{ padding: '6px 20px 14px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 14 }}>جستجوی استاد</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, background: 'var(--surface)', borderRadius: 16, padding: '0 14px', boxShadow: 'var(--sh-sm)' }}>
            <Icon name="search" size={20} style={{ color: 'var(--ink-3)' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="نام استاد یا تخصص…" style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, padding: '13px 0', color: 'var(--ink)',
            }} />
          </div>
          <button style={{ width: 50, borderRadius: 16, background: 'var(--olive-600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--sh-olive)' }}>
            <Icon name="filter" size={21} />
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 20px 16px' }}>
        {fields.map(f => <Chip key={f.id} active={field === f.id} onClick={() => setField(f.id)}>{f.label}</Chip>)}
        <Chip icon="star">امتیاز بالا</Chip>
        <Chip icon="pin">نزدیک من</Chip>
      </div>
      <div style={{ padding: '0 20px', marginBottom: 12, fontSize: 13, color: 'var(--ink-3)' }}>{fa(list.length)} استاد یافت شد</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 20px' }}>
        {list.map(t => <TeacherCard key={t.id} t={t} wide onOpen={x => go('profile', x)} onBook={x => go('booking', x)} />)}
      </div>
    </div>
  );
}

Object.assign(window, { HomeScreen, SearchScreen, GeoPattern });
