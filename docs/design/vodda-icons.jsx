// vodda-icons.jsx — line icon set + small shared primitives
// All icons: 24x24 viewBox, stroke=currentColor, rounded. Pass size + style.

function Icon({ name, size = 24, stroke = 1.7, style = {}, fill = false }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    home: <><path {...p} d="M4 11.5 12 4l8 7.5"/><path {...p} d="M6 10v9.5h12V10"/><path {...p} d="M10 19.5v-5h4v5"/></>,
    search: <><circle {...p} cx="11" cy="11" r="6.5"/><path {...p} d="m20 20-3.6-3.6"/></>,
    calendar: <><rect {...p} x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path {...p} d="M3.5 9.5h17M8 3v3.5M16 3v3.5"/></>,
    wallet: <><path {...p} d="M3.5 8c0-1.7 1.3-3 3-3h10.5c1.1 0 2 .9 2 2v0"/><rect {...p} x="3.5" y="6.5" width="17" height="13" rx="3.5"/><circle cx="16" cy="13" r="1.4" fill="currentColor" stroke="none"/></>,
    user: <><circle {...p} cx="12" cy="8" r="4"/><path {...p} d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"/></>,
    phone: <><path {...p} d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3c0 1.1-.9 2-2 2A15 15 0 0 1 4.5 6c0-1.1.9-2 2-2Z"/></>,
    video: <><rect {...p} x="3" y="6" width="12.5" height="12" rx="3"/><path {...p} d="m15.5 10 5-3v10l-5-3"/></>,
    book: <><path {...p} d="M12 6.5C12 6.5 10 4.5 4.5 4.5V18c5.5 0 7.5 2 7.5 2s2-2 7.5-2V4.5C14 4.5 12 6.5 12 6.5Z"/><path {...p} d="M12 6.5v13.5"/></>,
    mic: <><rect {...p} x="9" y="3" width="6" height="11" rx="3"/><path {...p} d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"/></>,
    star: fill
      ? <path d="M12 3.2l2.5 5.2 5.7.8-4.1 4 1 5.7L12 16.2 6.9 18.9l1-5.7-4.1-4 5.7-.8L12 3.2Z" fill="currentColor" stroke="none"/>
      : <path {...p} d="M12 3.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.5l5.4-.8L12 3.8Z"/>,
    heart: fill
      ? <path d="M12 20s-7-4.3-9.2-8.5C1.3 8.6 2.8 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.2 0 4.7 3.1 3.2 6C19 15.7 12 20 12 20Z" fill="currentColor" stroke="none"/>
      : <path {...p} d="M12 19.5s-6.5-4-8.5-7.8C2 8.7 3.4 6 6.2 6c1.9 0 3 1.1 3.8 2.2C10.8 7.1 11.9 6 13.8 6c2.8 0 4.2 2.7 2.7 5.7C14.5 15.5 12 19.5 12 19.5Z"/>,
    plus: <path {...p} d="M12 5v14M5 12h14"/>,
    minus: <path {...p} d="M5 12h14"/>,
    chevronL: <path {...p} d="m14 6-6 6 6 6"/>,
    chevronR: <path {...p} d="m10 6 6 6-6 6"/>,
    chevronD: <path {...p} d="m6 10 6 6 6-6"/>,
    arrowL: <><path {...p} d="M19 12H5"/><path {...p} d="m11 6-6 6 6 6"/></>,
    arrowR: <><path {...p} d="M5 12h14"/><path {...p} d="m13 6 6 6-6 6"/></>,
    play: <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round"/>,
    pause: <><rect x="7" y="5" width="3.5" height="14" rx="1.4" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="3.5" height="14" rx="1.4" fill="currentColor" stroke="none"/></>,
    check: <path {...p} d="m5 12.5 4.5 4.5L19 7"/>,
    checkCircle: <><circle {...p} cx="12" cy="12" r="8.5"/><path {...p} d="m8.5 12 2.4 2.4 4.6-4.8"/></>,
    bell: <><path {...p} d="M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"/><path {...p} d="M10 19a2 2 0 0 0 4 0"/></>,
    message: <path {...p} d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16H9l-4 3.5V6.5A1.5 1.5 0 0 1 6.5 5Z"/>,
    chat: <><path {...p} d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16H9l-4 3.5V6.5A1.5 1.5 0 0 1 6.5 5Z"/><path {...p} d="M9 9.5h6M9 12h4"/></>,
    pin: <><path {...p} d="M12 21s6.5-5.5 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.5 12 21 12 21Z"/><circle {...p} cx="12" cy="10" r="2.3"/></>,
    clock: <><circle {...p} cx="12" cy="12" r="8.5"/><path {...p} d="M12 7.5V12l3 2"/></>,
    filter: <path {...p} d="M4 6h16M7 12h10M10 18h4"/>,
    settings: <><circle {...p} cx="12" cy="12" r="3"/><path {...p} d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/></>,
    logout: <><path {...p} d="M14 4h-7A1.5 1.5 0 0 0 5.5 5.5v13A1.5 1.5 0 0 0 7 20h7"/><path {...p} d="M17 8.5 20.5 12 17 15.5M10 12h10.5"/></>,
    edit: <><path {...p} d="M16.5 4.5 19.5 7.5 9 18l-4 1 1-4 10.5-10.5Z"/></>,
    eye: <><path {...p} d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle {...p} cx="12" cy="12" r="2.6"/></>,
    shield: <><path {...p} d="M12 3.5 5 6v5c0 4.5 3 7.8 7 9.5 4-1.7 7-5 7-9.5V6l-7-2.5Z"/><path {...p} d="m9 12 2 2 4-4"/></>,
    award: <><circle {...p} cx="12" cy="9" r="5"/><path {...p} d="m8.5 13.5-1.5 6 5-2.5 5 2.5-1.5-6"/></>,
    users: <><circle {...p} cx="9" cy="8" r="3.3"/><path {...p} d="M3.5 19c0-3 2.4-5 5.5-5s5.5 2 5.5 5"/><path {...p} d="M16 5.2a3.3 3.3 0 0 1 0 6.4M17 14c2.4.4 4 2.3 4 5"/></>,
    grid: <><rect {...p} x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect {...p} x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect {...p} x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect {...p} x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/></>,
    list: <path {...p} d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>,
    coins: <><ellipse {...p} cx="9" cy="7" rx="5.5" ry="2.8"/><path {...p} d="M3.5 7v4c0 1.5 2.5 2.8 5.5 2.8s5.5-1.3 5.5-2.8V7"/><path {...p} d="M14.5 11.5c2.5.2 4.5 1.3 4.5 2.8 0 1.5-2.5 2.8-5.5 2.8-1 0-2-.1-2.8-.4"/></>,
    trending: <path {...p} d="M3.5 16.5 9 11l3.5 3.5L20 7M20 7h-4.5M20 7v4.5"/>,
    download: <><path {...p} d="M12 4v10m0 0 4-4m-4 4-4-4"/><path {...p} d="M5 18.5h14"/></>,
    doc: <><path {...p} d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z"/><path {...p} d="M13.5 3.5v4.5H18M9 13h6M9 16h4"/></>,
    quran: <><path {...p} d="M12 6.5C12 6.5 10 4.5 4.5 4.5V18c5.5 0 7.5 2 7.5 2s2-2 7.5-2V4.5C14 4.5 12 6.5 12 6.5Z"/><path {...p} d="M12 6.5v13.5"/><path {...p} d="M8.2 10.5c.6.5 1 1.2 1 2s-.4 1.5-1 2M15.8 10.5c-.6.5-1 1.2-1 2s.4 1.5 1 2"/></>,
    moon: <path {...p} d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>,
    sparkle: <path {...p} d="M12 4c.6 3.5 1.5 4.4 5 5-3.5.6-4.4 1.5-5 5-.6-3.5-1.5-4.4-5-5 3.5-.6 4.4-1.5 5-5ZM18.5 4c.2 1.3.5 1.6 1.8 1.8-1.3.2-1.6.5-1.8 1.8-.2-1.3-.5-1.6-1.8-1.8 1.3-.2 1.6-.5 1.8-1.8Z"/>,
    x: <path {...p} d="m6 6 12 12M18 6 6 18"/>,
    send: <path {...p} d="M20 4 3 11l6 2.5L12 20l3-7.5L20 4Z"/>,
    money: <><rect {...p} x="3" y="6" width="18" height="12" rx="3"/><circle {...p} cx="12" cy="12" r="2.6"/><path {...p} d="M6.5 9.5h.01M17.5 14.5h.01"/></>,
    refresh: <path {...p} d="M19 9a7 7 0 0 0-12-2.5L4.5 9M5 15a7 7 0 0 0 12 2.5L19.5 15M4.5 5v4h4M19.5 19v-4h-4"/>,
    headphones: <><path {...p} d="M5 13v-1a7 7 0 0 1 14 0v1"/><rect {...p} x="3.5" y="13" width="3.5" height="6" rx="1.6"/><rect {...p} x="17" y="13" width="3.5" height="6" rx="1.6"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', ...style }}>
      {paths[name] || null}
    </svg>
  );
}

// ── Avatar with optional ring + verified badge ──
function Avatar({ src, size = 48, ring = false, verified = false, online = false }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
        background: 'var(--olive-100)',
        border: ring ? '2px solid var(--olive-400)' : '1px solid var(--sand-200)',
        boxShadow: ring ? '0 0 0 3px var(--sand-50)' : 'none',
      }}>
        {src
          ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Placeholder w={size} h={size} label="" />}
      </div>
      {verified && (
        <div style={{
          position: 'absolute', bottom: -2, insetInlineStart: -2,
          width: size * 0.4, height: size * 0.4, minWidth: 16, minHeight: 16,
          background: 'var(--olive-600)', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid var(--surface)', color: '#fff',
        }}>
          <Icon name="check" size={size * 0.24 > 11 ? size * 0.24 : 11} stroke={2.6} />
        </div>
      )}
      {online && (
        <div style={{
          position: 'absolute', top: 0, insetInlineEnd: 0,
          width: 11, height: 11, background: '#5BB56B', borderRadius: '50%',
          border: '2px solid var(--surface)',
        }} />
      )}
    </div>
  );
}

// ── Striped placeholder for imagery (no real assets) ──
function Placeholder({ w = '100%', h = 120, label = 'تصویر', radius = 0, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'repeating-linear-gradient(135deg,var(--olive-100),var(--olive-100) 10px,var(--olive-50) 10px,var(--olive-50) 20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--olive-400)', ...style,
    }}>
      {label && <span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 10, letterSpacing: .5 }}>{label}</span>}
    </div>
  );
}

// ── Star rating row ──
function Stars({ value = 5, size = 14, gap = 1 }) {
  return (
    <div style={{ display: 'inline-flex', gap, color: 'var(--gold)' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Icon key={i} name="star" size={size} fill={i <= Math.round(value)} stroke={1.5}
          style={{ color: i <= Math.round(value) ? 'var(--gold)' : 'var(--sand-200)' }} />
      ))}
    </div>
  );
}

// ── Persian digits helper ──
function fa(n) {
  return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}
function toman(n) {
  return fa(n.toLocaleString('en-US')) + ' تومان';
}

Object.assign(window, { Icon, Avatar, Placeholder, Stars, fa, toman });
