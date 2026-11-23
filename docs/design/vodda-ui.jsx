// vodda-ui.jsx — shared UI primitives for the Vodda app

function Button({ children, variant = 'primary', size = 'md', full = false, icon, onClick, style = {} }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    fontFamily: 'var(--font)', fontWeight: 700, borderRadius: 999,
    transition: 'transform .12s, box-shadow .2s, background .2s',
    width: full ? '100%' : undefined, whiteSpace: 'nowrap',
  };
  const sizes = {
    sm: { fontSize: 13, padding: '8px 14px' },
    md: { fontSize: 15, padding: '12px 20px' },
    lg: { fontSize: 16, padding: '15px 24px' },
  };
  const variants = {
    primary: { background: 'var(--olive-600)', color: '#fff', boxShadow: 'var(--sh-olive)' },
    dark: { background: 'var(--olive-800)', color: '#fff' },
    soft: { background: 'var(--olive-100)', color: 'var(--olive-700)' },
    ghost: { background: 'transparent', color: 'var(--olive-700)', boxShadow: 'inset 0 0 0 1.5px var(--olive-200)' },
    gold: { background: 'var(--gold)', color: '#fff' },
    plain: { background: 'var(--sand-100)', color: 'var(--ink)' },
  };
  return (
    <button onClick={onClick}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(.97)'}
      onMouseUp={e => e.currentTarget.style.transform = ''}
      onMouseLeave={e => e.currentTarget.style.transform = ''}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 19} stroke={2} />}
      {children}
    </button>
  );
}

function Chip({ children, active = false, icon, onClick, style = {} }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600,
      whiteSpace: 'nowrap', transition: 'all .18s',
      background: active ? 'var(--olive-600)' : 'var(--surface)',
      color: active ? '#fff' : 'var(--ink-2s)',
      boxShadow: active ? 'var(--sh-sm)' : 'inset 0 0 0 1px var(--sand-200)',
      ...style,
    }}>
      {icon && <Icon name={icon} size={15} stroke={1.9} />}
      {children}
    </button>
  );
}

function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 13 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)', letterSpacing: -.2 }}>{title}</h2>
      {action && (
        <button onClick={onAction} style={{ display: 'flex', alignItems: 'center', gap: 2, color: 'var(--olive-600)', fontSize: 13, fontWeight: 700 }}>
          {action}
          <Icon name="chevronL" size={16} stroke={2} />
        </button>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    confirmed: { t: 'تأیید شده', c: 'var(--olive-700)', bg: 'var(--olive-100)', dot: '#5BB56B' },
    pending: { t: 'در انتظار تأیید', c: '#9A7426', bg: 'var(--gold-bg)', dot: 'var(--gold)' },
    done: { t: 'برگزار شده', c: 'var(--ink-3)', bg: 'var(--sand-100)', dot: 'var(--ink-4)' },
    canceled: { t: 'لغو شده', c: 'var(--rose)', bg: 'var(--clay-bg)', dot: 'var(--rose)' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 11px',
      borderRadius: 999, fontSize: 12, fontWeight: 700, color: s.c, background: s.bg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />
      {s.t}
    </span>
  );
}

// metric used on profile (followers / sessions)
function StatBox({ icon, value, label }) {
  return (
    <div style={{
      flex: 1, background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: '14px 12px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, boxShadow: 'var(--sh-sm)',
    }}>
      <div style={{ color: 'var(--olive-500)', marginBottom: 2 }}><Icon name={icon} size={20} /></div>
      <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{label}</div>
    </div>
  );
}

// Audio sample player row (visual only, toggles play state)
function AudioRow({ title, len }) {
  const [playing, setPlaying] = React.useState(false);
  return (
    <button onClick={() => setPlaying(p => !p)} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
      background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 12,
      boxShadow: 'var(--sh-sm)', textAlign: 'start',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
        background: playing ? 'var(--olive-600)' : 'var(--olive-100)',
        color: playing ? '#fff' : 'var(--olive-600)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name={playing ? 'pause' : 'play'} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
          {Array.from({ length: 22 }).map((_, i) => (
            <span key={i} style={{
              width: 2.5, borderRadius: 2, background: playing && i < 9 ? 'var(--olive-500)' : 'var(--olive-200)',
              height: [7, 13, 9, 17, 11, 20, 8, 14, 10, 16, 7, 19, 12, 9, 15, 8, 13, 10, 18, 7, 11, 9][i],
            }} />
          ))}
        </div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{len}</span>
    </button>
  );
}

// ── Teacher card (used in carousels + search list) ──
function TeacherCard({ t, onOpen, onBook, onFav, wide = false }) {
  const [fav, setFav] = React.useState(t.fav);
  return (
    <div onClick={() => onOpen(t)} style={{
      width: wide ? '100%' : 232, flexShrink: 0,
      background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 14,
      boxShadow: 'var(--sh-md)', cursor: 'pointer', position: 'relative',
    }}>
      <button onClick={e => { e.stopPropagation(); setFav(f => !f); }} style={{
        position: 'absolute', top: 14, insetInlineStart: 14, color: fav ? 'var(--clay)' : 'var(--ink-4)',
        width: 30, height: 30, borderRadius: '50%', background: 'var(--sand-50)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon name="heart" size={17} fill={fav} stroke={1.8} />
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Avatar size={54} ring verified={t.verified} />
        <div style={{ flex: 1, minWidth: 0, paddingInlineEnd: 26 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.short}</div>
          <div style={{ fontSize: 12, color: 'var(--olive-600)', fontWeight: 600, marginTop: 2 }}>{t.tag}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 12, color: 'var(--ink-3)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--gold)', fontWeight: 800 }}>
          <Icon name="star" size={14} fill />{fa(t.rating)}
        </span>
        <span style={{ width: 3, height: 3, borderRadius: 9, background: 'var(--sand-200)' }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="pin" size={13} />{t.city}</span>
        <span style={{ width: 3, height: 3, borderRadius: 9, background: 'var(--sand-200)' }} />
        <span>{fa(t.sessions)} جلسه</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>هر جلسه از</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{fa((t.price30/1000))} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-3)' }}>هزار تومان</span></div>
        </div>
        <Button size="sm" onClick={e => { e.stopPropagation(); onBook(t); }}>رزرو جلسه</Button>
      </div>
    </div>
  );
}

Object.assign(window, { Button, Chip, SectionHeader, StatusPill, StatBox, AudioRow, TeacherCard });
