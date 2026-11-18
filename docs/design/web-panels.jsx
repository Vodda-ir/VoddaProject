// web-panels.jsx — Vodda web dashboards: shell, shared, User & Teacher panels
// Reuses: Icon, Avatar, Stars, fa, toman, USER, SESSIONS, TEACHERS, teacherById,
//         REQUESTS, T_SESSIONS, T_TX, T_EARN, ME_TEACHER

// ── Browser window chrome ──
function PanelChrome({ url = 'vodda.ir/panel', children }) {
  return (
    <div style={{ width: '100%', maxWidth: 1240, margin: '0 auto', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--sh-lg)', border: '1px solid var(--sand-200)', background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--surface-warm)', borderBottom: '1px solid var(--sand-150)' }}>
        <div style={{ display: 'flex', gap: 7 }}>
          {['#E6A09A', '#E7CE8E', '#A9C08C'].map(c => <span key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, maxWidth: 360, margin: '0 auto', background: '#fff', borderRadius: 9, padding: '6px 14px', fontSize: 12.5, color: 'var(--ink-3)', boxShadow: 'inset 0 0 0 1px var(--sand-200)' }}>
          <Icon name="shield" size={14} style={{ color: 'var(--olive-500)' }} /> {url}
        </div>
        <div style={{ width: 54 }} />
      </div>
      {children}
    </div>
  );
}

// ── Dashboard shell: sidebar (right) + main ──
function PanelShell({ brandSub, items, active, user, children }) {
  return (
    <div style={{ display: 'flex', height: 768, background: 'var(--sand-50)', fontFamily: 'var(--font)' }}>
      {/* sidebar */}
      <aside style={{ width: 244, flexShrink: 0, background: 'var(--olive-900)', color: 'rgba(255,255,255,.82)', display: 'flex', flexDirection: 'column', padding: '22px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 4px' }}>
          <span style={{ fontWeight: 800, fontSize: 24, color: '#fff' }}>وُدّا</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', marginBottom: 10 }} />
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.45)', padding: '0 8px 22px' }}>{brandSub}</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {items.map(it => {
            const on = it.id === active;
            return (
              <a key={it.id} href="#" onClick={e => e.preventDefault()} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12, textDecoration: 'none', fontSize: 14, fontWeight: on ? 700 : 500, color: on ? '#fff' : 'rgba(255,255,255,.7)', background: on ? 'var(--olive-600)' : 'transparent', position: 'relative' }}>
                <Icon name={it.icon} size={20} stroke={on ? 2 : 1.7} />
                <span style={{ flex: 1 }}>{it.label}</span>
                {it.badge && <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: on ? '#fff' : 'var(--clay)', color: on ? 'var(--olive-700)' : '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{it.badge}</span>}
              </a>
            );
          })}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 10, borderRadius: 14, background: 'rgba(255,255,255,.06)' }}>
          <Avatar size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>{user.role}</div>
          </div>
          <Icon name="logout" size={18} style={{ color: 'rgba(255,255,255,.5)' }} />
        </div>
      </aside>

      {/* main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}

function PanelTopBar({ title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--sand-150)', background: 'rgba(250,248,242,.7)' }}>
      <div>
        <h1 style={{ fontSize: 21, fontWeight: 800 }}>{title}</h1>
        {sub && <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3 }}>{sub}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 11, padding: '9px 14px', boxShadow: 'var(--sh-sm)', width: 240 }}>
          <Icon name="search" size={18} style={{ color: 'var(--ink-3)' }} />
          <input placeholder="جستجو…" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, fontFamily: 'var(--font)' }} />
        </div>
        <button style={{ position: 'relative', width: 42, height: 42, borderRadius: 12, background: '#fff', boxShadow: 'var(--sh-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2s)' }}>
          <Icon name="bell" size={20} />
          <span style={{ position: 'absolute', top: 10, insetInlineEnd: 11, width: 8, height: 8, borderRadius: '50%', background: 'var(--clay)', border: '2px solid #fff' }} />
        </button>
      </div>
    </div>
  );
}

function ScrollArea({ children }) {
  return <div style={{ flex: 1, overflow: 'auto', padding: 28 }}>{children}</div>;
}

function StatCard({ icon, label, value, delta, tone = 'olive' }) {
  const tones = { olive: ['var(--olive-100)', 'var(--olive-700)'], gold: ['var(--gold-bg)', '#9A7426'], clay: ['var(--clay-bg)', 'var(--clay)'], info: ['#E4ECEF', '#4E6F7C'] };
  const [bg, c] = tones[tone];
  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: 20, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: bg, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={22} /></div>
        {delta && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: 'var(--olive-600)', background: 'var(--olive-50)', padding: '4px 9px', borderRadius: 999 }}><Icon name="trending" size={13} />{delta}</span>}
      </div>
      <div style={{ fontSize: 25, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3 }}>{label}</div>
    </div>
  );
}

function MiniBars({ data, labels, color = 'var(--olive-500)' }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, height: 140, padding: '0 4px' }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <div style={{ width: '100%', maxWidth: 34, height: `${(v / max) * 100}%`, background: i === data.length - 1 ? 'var(--olive-700)' : color, borderRadius: '7px 7px 3px 3px', transition: 'height .4s' }} />
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, action, children, pad = true }) {
  return (
    <div style={{ background: '#fff', borderRadius: 18, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--sand-100)' }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 800 }}>{title}</h3>
        {action && <a href="#" onClick={e => e.preventDefault()} style={{ fontSize: 13, fontWeight: 700, color: 'var(--olive-600)', textDecoration: 'none' }}>{action}</a>}
      </div>
      <div style={{ padding: pad ? 20 : 0 }}>{children}</div>
    </div>
  );
}

function StatusTag({ status }) {
  const map = {
    confirmed: ['تأیید شده', 'var(--olive-700)', 'var(--olive-100)'],
    pending: ['در انتظار', '#9A7426', 'var(--gold-bg)'],
    done: ['برگزار شده', 'var(--ink-3)', 'var(--sand-100)'],
    new: ['جدید', 'var(--clay)', 'var(--clay-bg)'],
    paid: ['پرداخت شد', 'var(--olive-700)', 'var(--olive-100)'],
    active: ['فعال', 'var(--olive-700)', 'var(--olive-100)'],
    review: ['در انتظار تأیید', '#9A7426', 'var(--gold-bg)'],
  };
  const [t, c, bg] = map[status] || map.pending;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: c, background: bg, padding: '4px 11px', borderRadius: 999 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />{t}</span>;
}

// ════════════════ USER PANEL ════════════════
function UserPanel() {
  const items = [
    { id: 'dash', icon: 'grid', label: 'داشبورد' },
    { id: 'sessions', icon: 'calendar', label: 'جلسات من', badge: fa(2) },
    { id: 'fav', icon: 'heart', label: 'اساتید دلخواه' },
    { id: 'wallet', icon: 'wallet', label: 'کیف پول' },
    { id: 'messages', icon: 'message', label: 'پیام‌ها' },
    { id: 'settings', icon: 'settings', label: 'تنظیمات' },
  ];
  const upcoming = SESSIONS.filter(s => s.when === 'upcoming');
  return (
    <PanelShell brandSub="پنل قرآن‌آموز" items={items} active="dash" user={{ name: USER.name, role: 'قرآن‌آموز' }}>
      <PanelTopBar title={`سلام ${USER.first} 🌿`} sub="خلاصه‌ای از فعالیت‌های شما در وُدّا" />
      <ScrollArea>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 22 }}>
          <StatCard icon="calendar" label="جلسات پیش‌رو" value={fa(2)} tone="olive" />
          <StatCard icon="checkCircle" label="جلسات برگزارشده" value={fa(14)} tone="info" delta="۸٪+" />
          <StatCard icon="wallet" label="موجودی کیف پول" value={toman(USER.wallet)} tone="gold" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>
          <Panel title="جلسات پیش‌رو" action="مشاهدهٔ همه" pad={false}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {upcoming.map((s, i) => {
                const t = teacherById(s.teacher);
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px', borderBottom: i < upcoming.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
                    <Avatar size={44} verified={t.verified} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{t.short}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>{s.service}</div>
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--ink-2s)' }}>
                      <div style={{ fontWeight: 700 }}>{s.date}</div>
                      <div style={{ color: 'var(--ink-4)', marginTop: 2 }}>{s.time}</div>
                    </div>
                    <StatusTag status={s.status} />
                    <button style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--olive-600)', padding: '8px 16px', borderRadius: 999 }}>{s.status === 'confirmed' ? 'پیوستن' : 'جزئیات'}</button>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="اساتید پیشنهادی" action="بیشتر">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {TEACHERS.slice(0, 4).map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <Avatar size={40} verified={t.verified} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.short}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--olive-600)' }}>{t.tag}</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12.5, fontWeight: 800, color: 'var(--gold)' }}><Icon name="star" size={13} fill />{fa(t.rating)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </ScrollArea>
    </PanelShell>
  );
}

// ════════════════ TEACHER PANEL ════════════════
function TeacherPanel() {
  const items = [
    { id: 'dash', icon: 'grid', label: 'داشبورد' },
    { id: 'requests', icon: 'message', label: 'درخواست‌ها', badge: fa(REQUESTS.length) },
    { id: 'sessions', icon: 'calendar', label: 'جلسات' },
    { id: 'services', icon: 'book', label: 'خدمات من' },
    { id: 'worktimes', icon: 'clock', label: 'زمان‌های کاری' },
    { id: 'wallet', icon: 'wallet', label: 'کیف پول' },
    { id: 'reviews', icon: 'star', label: 'نظرات' },
  ];
  return (
    <PanelShell brandSub="پنل استاد" items={items} active="dash" user={{ name: ME_TEACHER.name, role: 'استاد' }}>
      <PanelTopBar title="داشبورد استاد" sub="مدیریت جلسات، درخواست‌ها و درآمد" />
      <ScrollArea>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
          <StatCard icon="coins" label="درآمد این ماه" value={`${fa((T_EARN.month / 1000000))} م ت`} tone="olive" delta="۱۲٪+" />
          <StatCard icon="message" label="درخواست جدید" value={fa(REQUESTS.length)} tone="clay" />
          <StatCard icon="checkCircle" label="جلسات این ماه" value={fa(38)} tone="info" />
          <StatCard icon="star" label="میانگین امتیاز" value={fa(ME_TEACHER.rating)} tone="gold" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, marginBottom: 18 }}>
          <Panel title="درخواست‌های در انتظار پاسخ" action="مشاهدهٔ همه" pad={false}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {REQUESTS.map((r, i) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < REQUESTS.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
                  <Avatar size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.learner}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{r.service} · {r.date} {r.time}</div>
                  </div>
                  <button style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--olive-600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={18} stroke={2.6} /></button>
                  <button style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--clay-bg)', color: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={17} stroke={2.4} /></button>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="درآمد ۶ ماه اخیر">
            <MiniBars data={[1.8, 2.4, 2.1, 3.0, 2.7, 3.65]} labels={['آذر', 'دی', 'بهمن', 'اسفند', 'فرورد', 'اردیب']} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--sand-100)', fontSize: 13 }}>
              <span style={{ color: 'var(--ink-3)' }}>مجموع امسال</span>
              <span style={{ fontWeight: 800, color: 'var(--olive-700)' }}>{toman(15600000)}</span>
            </div>
          </Panel>
        </div>

        <Panel title="جلسات پیش‌رو" action="تقویم کامل" pad={false}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {T_SESSIONS.filter(s => s.when === 'upcoming').map((s, i, a) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < a.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
                <Avatar size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.learner}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{s.service}</div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2s)', textAlign: 'center' }}><div style={{ fontWeight: 700 }}>{s.date}</div><div style={{ color: 'var(--ink-4)', marginTop: 2 }}>{s.time}</div></div>
                <StatusTag status={s.status} />
                <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--olive-700)' }}>{toman(Math.round(s.price * 0.85))}</span>
              </div>
            ))}
          </div>
        </Panel>
      </ScrollArea>
    </PanelShell>
  );
}

Object.assign(window, { PanelChrome, PanelShell, PanelTopBar, ScrollArea, StatCard, MiniBars, Panel, StatusTag, UserPanel, TeacherPanel });
