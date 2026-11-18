// vodda-screens-account.jsx — My Sessions, Wallet, Profile (user) + Rating sheet

function SessionCard({ s, go, onRate }) {
  const t = teacherById(s.teacher);
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 15, boxShadow: 'var(--sh-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <StatusPill status={s.status} />
        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{s.dur}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 13 }}>
        <Avatar size={46} verified={t.verified} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800 }}>{t.short}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2s)', marginTop: 3 }}>{s.service}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', background: 'var(--sand-50)', borderRadius: 13, fontSize: 12.5, color: 'var(--ink-2s)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="calendar" size={16} style={{ color: 'var(--olive-500)' }} />{s.date}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="clock" size={16} style={{ color: 'var(--olive-500)' }} />{s.time}</span>
      </div>

      {/* contextual actions */}
      {s.status === 'confirmed' && (
        <div style={{ marginTop: 13 }}>
          {s.minsTo && s.minsTo < 60
            ? <Button full icon="phone" onClick={() => {}}>پیوستن به جلسه · {fa(s.minsTo)} دقیقه دیگر</Button>
            : <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="soft" full onClick={() => go('profile', t)}>پروفایل استاد</Button>
                <Button variant="ghost" full>لغو جلسه</Button>
              </div>}
        </div>
      )}
      {s.status === 'pending' && (
        <div style={{ marginTop: 13, fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', padding: '10px 0', background: 'var(--gold-bg)', borderRadius: 13 }}>
          <Icon name="clock" size={16} style={{ color: 'var(--gold)' }} /> در انتظار تأیید استاد
        </div>
      )}
      {s.status === 'done' && !s.rated && (
        <div style={{ marginTop: 13 }}><Button variant="gold" full icon="star" onClick={() => onRate(s)}>ثبت امتیاز و نظر</Button></div>
      )}
      {s.status === 'done' && s.rated && (
        <div style={{ marginTop: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-3)' }}>
          امتیاز شما: <Stars value={s.myRating} size={15} />
        </div>
      )}
    </div>
  );
}

function SessionsScreen({ go, onRate, initialTab }) {
  const [tab, setTab] = React.useState(initialTab || 'upcoming');
  const list = SESSIONS.filter(s => s.when === tab);
  return (
    <div className="scr-enter" style={{ paddingBottom: 24 }}>
      <div style={{ padding: '6px 20px 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>جلسات من</h1>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 18px' }}>
        {[['upcoming', 'پیش‌رو'], ['past', 'برگزارشده']].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: '11px 0', borderRadius: 14, fontSize: 14, fontWeight: 700,
            background: tab === id ? 'var(--olive-600)' : 'var(--surface)', color: tab === id ? '#fff' : 'var(--ink-3)',
            boxShadow: tab === id ? 'var(--sh-olive)' : 'var(--sh-sm)',
          }}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 20px' }}>
        {list.length === 0
          ? <EmptyState icon="calendar" title="جلسه‌ای نیست" sub="هنوز جلسه‌ای در این بخش ندارید." />
          : list.map(s => <SessionCard key={s.id} s={s} go={go} onRate={onRate} />)}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '60px 20px', gap: 10 }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--olive-50)', color: 'var(--olive-400)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={34} /></div>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 220, lineHeight: 1.8 }}>{sub}</div>
    </div>
  );
}

function WalletScreen({ go }) {
  return (
    <div className="scr-enter" style={{ paddingBottom: 24 }}>
      <div style={{ padding: '6px 20px 16px' }}><h1 style={{ fontSize: 24, fontWeight: 800 }}>کیف پول</h1></div>

      <div style={{ padding: '0 20px 22px' }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-xl)', background: 'linear-gradient(135deg,var(--olive-800),var(--olive-600))', padding: '22px', color: '#fff', boxShadow: 'var(--sh-olive)' }}>
          <GeoPattern color="#fff" opacity={0.08} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 13, opacity: .8, marginBottom: 7 }}>موجودی کیف پول</div>
            <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 18 }}>{fa(USER.wallet.toLocaleString('en-US'))} <span style={{ fontSize: 15, fontWeight: 600, opacity: .8 }}>تومان</span></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: '#fff', color: 'var(--olive-700)', fontWeight: 800, fontSize: 14, padding: '12px 0', borderRadius: 999 }}>
                <Icon name="plus" size={18} stroke={2.4} /> افزایش موجودی
              </button>
              <button style={{ width: 50, background: 'rgba(255,255,255,.16)', color: '#fff', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="refresh" size={20} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* quick charge amounts */}
      <div style={{ display: 'flex', gap: 9, padding: '0 20px 24px' }}>
        {[50000, 100000, 200000].map(a => (
          <button key={a} style={{ flex: 1, padding: '12px 0', borderRadius: 14, background: 'var(--surface)', boxShadow: 'var(--sh-sm)', fontSize: 13, fontWeight: 700, color: 'var(--ink-2s)' }}>
            {fa((a/1000))} هزار ت
          </button>
        ))}
      </div>

      <SectionHeader title="تراکنش‌ها" action="همه" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 20px' }}>
        {TX.map(x => {
          const credit = x.amount > 0;
          return (
            <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 14, boxShadow: 'var(--sh-sm)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: credit ? 'var(--olive-100)' : 'var(--clay-bg)', color: credit ? 'var(--olive-700)' : 'var(--clay)' }}>
                <Icon name={credit ? 'download' : 'mic'} size={21} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{x.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 3 }}>{x.date}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: credit ? 'var(--olive-700)' : 'var(--ink)' }}>
                {credit ? '+' : '−'}{fa(Math.abs(x.amount).toLocaleString('en-US'))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfileTab({ go }) {
  const rows = [
    { icon: 'user', label: 'ویرایش پروفایل' },
    { icon: 'heart', label: 'اساتید دلخواه' },
    { icon: 'wallet', label: 'کیف پول و تراکنش‌ها', t: () => go('tab', 'wallet') },
    { icon: 'bell', label: 'اعلان‌ها' },
    { icon: 'shield', label: 'حریم خصوصی و امنیت' },
    { icon: 'message', label: 'پشتیبانی و قوانین' },
  ];
  return (
    <div className="scr-enter" style={{ paddingBottom: 24 }}>
      <div style={{ padding: '6px 20px 18px' }}><h1 style={{ fontSize: 24, fontWeight: 800 }}>پروفایل</h1></div>

      <div style={{ padding: '0 20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 16, boxShadow: 'var(--sh-sm)' }}>
          <Avatar size={62} ring />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{USER.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="pin" size={13} />{USER.city}</div>
          </div>
          <button style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--olive-50)', color: 'var(--olive-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="edit" size={19} /></button>
        </div>
      </div>

      {/* switch to teacher account */}
      <div style={{ padding: '0 20px 22px' }}>
        <button onClick={() => go('roleSheet')} style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 13, borderRadius: 'var(--r-lg)', background: 'var(--olive-50)', padding: 16, boxShadow: 'inset 0 0 0 1px var(--olive-100)', width: '100%', textAlign: 'start' }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--olive-600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="award" size={24} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>ورود به حساب استاد</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2s)', marginTop: 3, lineHeight: 1.7 }}>شما استاد تأییدشدهٔ وُدّا هستید — جلسات و درآمدتان را مدیریت کنید.</div>
          </div>
          <Icon name="refresh" size={20} style={{ color: 'var(--olive-600)' }} />
        </button>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', margin: '0 20px', boxShadow: 'var(--sh-sm)', overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <button key={r.label} onClick={r.t} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '15px 16px', textAlign: 'start', borderBottom: i < rows.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
            <div style={{ color: 'var(--olive-600)' }}><Icon name={r.icon} size={21} /></div>
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600 }}>{r.label}</span>
            <Icon name="chevronL" size={19} style={{ color: 'var(--ink-4)' }} />
          </button>
        ))}
      </div>

      <div style={{ padding: '18px 20px' }}>
        <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '14px 0', borderRadius: 14, color: 'var(--rose)', fontWeight: 700, fontSize: 14, background: 'var(--clay-bg)' }}>
          <Icon name="logout" size={19} /> خروج از حساب
        </button>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-4)', marginTop: 16 }}>وُدّا · نسخهٔ ۱٫۰٫۰</div>
      </div>
    </div>
  );
}

// ── Rating bottom sheet ──
function RatingSheet({ session, onClose }) {
  const [rating, setRating] = React.useState(5);
  const [text, setText] = React.useState('');
  const [done, setDone] = React.useState(false);
  const t = teacherById(session.teacher);
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(42,40,32,.4)', display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(2px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--sand-50)', borderRadius: '28px 28px 0 0', padding: '14px 22px 34px', animation: 'vodda-fade .3s both' }}>
        <div style={{ width: 42, height: 5, borderRadius: 9, background: 'var(--sand-200)', margin: '0 auto 20px' }} />
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'vodda-pop .4s both' }}><Icon name="checkCircle" size={40} /></div>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>سپاس از بازخورد شما</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>نظر شما به بهبود کیفیت وُدّا کمک می‌کند.</p>
            <Button full size="lg" onClick={onClose}>بستن</Button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 18 }}>
              <Avatar size={64} verified={t.verified} />
              <h3 style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>جلسه با {t.short} چطور بود؟</h3>
              <p style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>{session.service}</p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 22 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <button key={i} onClick={() => setRating(i)} style={{ color: i <= rating ? 'var(--gold)' : 'var(--sand-200)', transition: 'transform .1s' }}>
                  <Icon name="star" size={40} fill={i <= rating} stroke={1.4} />
                </button>
              ))}
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="نظر خود را بنویسید… (اختیاری)" rows={3} style={{
              width: '100%', border: 'none', outline: 'none', resize: 'none', background: 'var(--surface)', borderRadius: 'var(--r-md)',
              padding: 14, fontSize: 13.5, lineHeight: 1.9, color: 'var(--ink)', boxShadow: 'var(--sh-sm)', marginBottom: 18,
            }} />
            <Button full size="lg" onClick={() => setDone(true)}>ثبت امتیاز</Button>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { SessionsScreen, WalletScreen, ProfileTab, RatingSheet, EmptyState });
