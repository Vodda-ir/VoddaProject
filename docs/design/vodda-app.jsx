// vodda-app.jsx — app shell, navigation stack, bottom nav

const TABS = [
  { id: 'home', icon: 'home', label: 'خانه' },
  { id: 'search', icon: 'search', label: 'جستجو' },
  { id: 'sessions', icon: 'calendar', label: 'جلسات' },
  { id: 'wallet', icon: 'wallet', label: 'کیف پول' },
  { id: 'profile', icon: 'user', label: 'پروفایل' },
];

const T_TABS = [
  { id: 't_home', icon: 'grid', label: 'داشبورد' },
  { id: 't_requests', icon: 'message', label: 'درخواست‌ها' },
  { id: 't_sessions', icon: 'calendar', label: 'جلسات' },
  { id: 't_wallet', icon: 'wallet', label: 'کیف پول' },
  { id: 't_profile', icon: 'user', label: 'پروفایل' },
];

function BottomNav({ tabs = TABS, tab, onTab }) {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40, padding: '0 14px 10px', pointerEvents: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        background: 'rgba(255,255,255,.82)', backdropFilter: 'blur(18px) saturate(160%)', WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        borderRadius: 26, padding: '8px 6px 10px', boxShadow: '0 8px 30px rgba(46,54,34,.14), inset 0 0 0 1px rgba(255,255,255,.6)',
        pointerEvents: 'auto',
      }}>
        {tabs.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => onTab(t.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0' }}>
              <div style={{
                width: 46, height: 32, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? 'var(--olive-600)' : 'transparent', color: active ? '#fff' : 'var(--ink-3)',
                boxShadow: active ? 'var(--sh-olive)' : 'none',
              }}>
                <Icon name={t.icon} size={22} stroke={active ? 2 : 1.8} fill={false} />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: active ? 800 : 600, color: active ? 'var(--olive-700)' : 'var(--ink-3)' }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VoddaApp({ initialRole = 'learner' }) {
  const [role, setRole] = React.useState(initialRole);
  const [tab, setTab] = React.useState(initialRole === 'teacher' ? 't_home' : 'home');
  const [stack, setStack] = React.useState([]); // [{type, teacher, service, request}]
  const [rate, setRate] = React.useState(null);
  const [roleSheet, setRoleSheet] = React.useState(false);
  const scrollRef = React.useRef(null);
  const top = stack[stack.length - 1];
  const screenKey = top ? top.type + (top.teacher?.id || top.request?.id || '') : role + tab;

  React.useLayoutEffect(() => {
    if (scrollRef.current && scrollRef.current.parentElement) scrollRef.current.parentElement.scrollTop = 0;
  }, [screenKey]);

  function switchRole(r) {
    setRole(r); setStack([]); setRoleSheet(false);
    setTab(r === 'teacher' ? 't_home' : 'home');
  }

  function go(action, a, b) {
    if (action === 'tab') { setStack([]); setTab(a); }
    else if (action === 'search') { setStack([]); setTab('search'); }
    else if (action === 'profile') setStack(s => [...s, { type: 'profile', teacher: a }]);
    else if (action === 'booking') setStack(s => [...s, { type: 'booking', teacher: a, service: b }]);
    else if (action === 'reqDetail') setStack(s => [...s, { type: 'reqDetail', request: a }]);
    else if (action === 'withdraw') setStack(s => [...s, { type: 'withdraw' }]);
    else if (action === 'services') setStack(s => [...s, { type: 'services' }]);
    else if (action === 'worktimes') setStack(s => [...s, { type: 'worktimes' }]);
    else if (action === 'back') setStack(s => s.slice(0, -1));
    else if (action === 'rate') setRate(a);
    else if (action === 'roleSheet') setRoleSheet(true);
  }

  const openSwitch = () => setRoleSheet(true);
  let content;

  // detail (stack) screens — shared across roles
  if (top?.type === 'profile') content = <ProfileScreen teacher={top.teacher} go={go} />;
  else if (top?.type === 'booking') content = <BookingScreen teacher={top.teacher} preService={top.service} go={go} />;
  else if (top?.type === 'reqDetail') content = <RequestDetail request={top.request} go={go} />;
  else if (top?.type === 'withdraw') content = <WithdrawScreen go={go} />;
  else if (top?.type === 'services') content = <ServicesScreen go={go} />;
  else if (top?.type === 'worktimes') content = <WorkTimesScreen go={go} />;
  // tab screens
  else if (role === 'teacher') {
    if (tab === 't_home') content = <TeacherDashboard go={go} onSwitch={openSwitch} />;
    else if (tab === 't_requests') content = <RequestsScreen go={go} />;
    else if (tab === 't_sessions') content = <TeacherSessions go={go} />;
    else if (tab === 't_wallet') content = <TeacherWallet go={go} />;
    else if (tab === 't_profile') content = <TeacherProfile go={go} onSwitch={() => switchRole('learner')} />;
  } else {
    if (tab === 'home') content = <HomeScreen go={go} />;
    else if (tab === 'search') content = <SearchScreen go={go} />;
    else if (tab === 'sessions') content = <SessionsScreen go={go} onRate={s => setRate(s)} />;
    else if (tab === 'wallet') content = <WalletScreen go={go} />;
    else if (tab === 'profile') content = <ProfileTab go={go} />;
  }

  const showNav = !top;
  const tabs = role === 'teacher' ? T_TABS : TABS;

  return (
    <IOSDevice>
      <div ref={scrollRef} style={{ minHeight: '100%', background: 'var(--sand-50)', paddingTop: 54, paddingBottom: showNav ? 92 : 0 }}>
        <div key={screenKey}>{content}</div>
      </div>
      {showNav && <BottomNav tabs={tabs} tab={tab} onTab={t => go('tab', t)} />}
      {rate && <RatingSheet session={rate} onClose={() => setRate(null)} />}
      {roleSheet && <RoleSheet role={role} onPick={switchRole} onClose={() => setRoleSheet(false)} />}
    </IOSDevice>
  );
}

// ─────────────────────────────────────────────────────────────
// Gallery mode — every designed screen laid out side by side
// ─────────────────────────────────────────────────────────────
const SCALE = 0.62;

function GalleryFrame({ label, num, activeTab, navTabs, showNav = false, render }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
      <div style={{ width: 402 * SCALE, height: 874 * SCALE, position: 'relative', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 0, insetInlineStart: 0, transform: `scale(${SCALE})`, transformOrigin: 'top ' + (document.dir === 'rtl' ? 'right' : 'left') }}>
          <IOSDevice>
            <div style={{ minHeight: '100%', background: 'var(--sand-50)', paddingTop: 54, paddingBottom: showNav ? 92 : 0 }}>
              {render()}
            </div>
            {showNav && <BottomNav tabs={navTabs || TABS} tab={activeTab} onTab={() => {}} />}
          </IOSDevice>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--olive-100)', color: 'var(--olive-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{fa(num)}</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink-2s)' }}>{label}</span>
      </div>
    </div>
  );
}

function GalleryBand({ title, sub, tone }) {
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto 36px', padding: '22px 26px', borderRadius: 'var(--r-lg)', background: tone === 'teacher' ? 'linear-gradient(120deg,var(--olive-800),var(--olive-600))' : 'var(--surface)', color: tone === 'teacher' ? '#fff' : 'var(--ink)', boxShadow: 'var(--sh-sm)', position: 'relative', overflow: 'hidden' }}>
      {tone === 'teacher' && <GeoPattern color="#fff" opacity={0.07} />}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon name={tone === 'teacher' ? 'award' : 'user'} size={26} style={{ color: tone === 'teacher' ? 'var(--gold-soft)' : 'var(--olive-600)' }} />
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>{title}</h2>
          <p style={{ fontSize: 13, opacity: tone === 'teacher' ? .85 : 1, color: tone === 'teacher' ? '#fff' : 'var(--ink-3)', marginTop: 3 }}>{sub}</p>
        </div>
      </div>
    </div>
  );
}

function GallerySection({ title, children }) {
  return (
    <div style={{ marginBottom: 56 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, maxWidth: 1180, margin: '0 auto 28px' }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{title}</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--sand-200)' }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 44, justifyContent: 'center', maxWidth: 1180, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  );
}

function Gallery() {
  const t = TEACHERS[0];
  const noop = () => {};
  const rateSession = SESSIONS.find(s => s.status === 'done' && !s.rated) || SESSIONS[2];
  return (
    <div style={{ padding: '8px 24px 80px' }}>
      <GalleryBand title="حساب قرآن‌آموز" sub="مسیر یافتن استاد، رزرو جلسه و پرداخت" tone="learner" />
      <GallerySection title="خانه و کشف">
        <GalleryFrame num={1} label="خانه" showNav activeTab="home" render={() => <HomeScreen go={noop} />} />
        <GalleryFrame num={2} label="جستجوی استاد" showNav activeTab="search" render={() => <SearchScreen go={noop} />} />
      </GallerySection>

      <GallerySection title="استاد و رزرو جلسه">
        <GalleryFrame num={3} label="پروفایل استاد" render={() => <ProfileScreen teacher={t} go={noop} />} />
        <GalleryFrame num={4} label="رزرو · انتخاب خدمت" render={() => <BookingScreen teacher={t} go={noop} initialStep={1} />} />
        <GalleryFrame num={5} label="رزرو · تاریخ و ساعت" render={() => <BookingScreen teacher={t} go={noop} initialStep={2} initialSlot="۱۷:۳۰" />} />
        <GalleryFrame num={6} label="رزرو · تأیید و پرداخت" render={() => <BookingScreen teacher={t} go={noop} initialStep={3} initialSlot="۱۷:۳۰" />} />
        <GalleryFrame num={7} label="رزرو · ثبت موفق" render={() => <BookingScreen teacher={t} go={noop} initialStep={4} initialSlot="۱۷:۳۰" />} />
      </GallerySection>

      <GallerySection title="جلسات و بازخورد">
        <GalleryFrame num={8} label="جلسات · پیش‌رو" showNav activeTab="sessions" render={() => <SessionsScreen go={noop} onRate={noop} initialTab="upcoming" />} />
        <GalleryFrame num={9} label="جلسات · برگزارشده" showNav activeTab="sessions" render={() => <SessionsScreen go={noop} onRate={noop} initialTab="past" />} />
        <GalleryFrame num={10} label="ثبت امتیاز و نظر" render={() => <><SessionsScreen go={noop} onRate={noop} initialTab="past" /><RatingSheet session={rateSession} onClose={noop} /></>} />
      </GallerySection>

      <GallerySection title="کیف پول و حساب">
        <GalleryFrame num={11} label="کیف پول" showNav activeTab="wallet" render={() => <WalletScreen go={noop} />} />
        <GalleryFrame num={12} label="پروفایل کاربر" showNav activeTab="profile" render={() => <ProfileTab go={noop} />} />
      </GallerySection>

      <div style={{ height: 24 }} />
      <GalleryBand title="حساب استاد" sub="کاربری که نقش استاد دارد، با یک لمس بین دو حساب سوییچ می‌کند" tone="teacher" />

      <GallerySection title="داشبورد و درخواست‌ها">
        <GalleryFrame num={13} label="داشبورد استاد" showNav navTabs={T_TABS} activeTab="t_home" render={() => <TeacherDashboard go={noop} onSwitch={noop} />} />
        <GalleryFrame num={14} label="درخواست‌های دریافتی" showNav navTabs={T_TABS} activeTab="t_requests" render={() => <RequestsScreen go={noop} />} />
        <GalleryFrame num={15} label="جزئیات و پاسخ درخواست" render={() => <RequestDetail request={REQUESTS[0]} go={noop} />} />
      </GallerySection>

      <GallerySection title="جلسات و درآمد">
        <GalleryFrame num={16} label="جلسات استاد" showNav navTabs={T_TABS} activeTab="t_sessions" render={() => <TeacherSessions go={noop} initialTab="upcoming" />} />
        <GalleryFrame num={17} label="کیف پول استاد" showNav navTabs={T_TABS} activeTab="t_wallet" render={() => <TeacherWallet go={noop} />} />
        <GalleryFrame num={18} label="برداشت وجه" render={() => <WithdrawScreen go={noop} />} />
      </GallerySection>

      <GallerySection title="مدیریت و پروفایل استاد">
        <GalleryFrame num={19} label="پروفایل استاد" showNav navTabs={T_TABS} activeTab="t_profile" render={() => <TeacherProfile go={noop} onSwitch={noop} />} />
        <GalleryFrame num={20} label="مدیریت خدمات" render={() => <ServicesScreen go={noop} />} />
        <GalleryFrame num={21} label="زمان‌های کاری" render={() => <WorkTimesScreen go={noop} />} />
        <GalleryFrame num={22} label="تغییر حساب" render={() => <><TeacherDashboard go={noop} onSwitch={noop} /><RoleSheet role="teacher" onPick={noop} onClose={noop} /></>} />
      </GallerySection>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root — header + mode toggle (Prototype ↔ All screens)
// ─────────────────────────────────────────────────────────────
function Root() {
  const [mode, setMode] = React.useState('proto');
  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '34px 20px 24px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font)', fontWeight: 800, fontSize: 30, color: 'var(--olive-700)', letterSpacing: '-.5px', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            وُدّا <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--gold)', display: 'inline-block', marginBottom: 14 }} />
          </div>
          <p style={{ fontFamily: 'var(--font)', color: 'var(--ink-3)', fontSize: 14, marginTop: 4 }}>اپلیکیشن کاربر · همراهِ یادگیری قرآن و مداحی</p>
        </div>
        <div style={{ display: 'inline-flex', gap: 4, background: 'rgba(255,255,255,.7)', padding: 5, borderRadius: 999, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-200)' }}>
          {[['proto', 'پروتوتایپ تعاملی', 'play'], ['gallery', 'همه‌ی صفحات', 'grid']].map(([id, label, icon]) => (
            <button key={id} onClick={() => setMode(id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 999, fontSize: 14, fontWeight: 700,
              background: mode === id ? 'var(--olive-600)' : 'transparent', color: mode === id ? '#fff' : 'var(--ink-2s)',
              boxShadow: mode === id ? 'var(--sh-olive)' : 'none', whiteSpace: 'nowrap',
            }}>
              <Icon name={icon} size={18} stroke={2} /> {label}
            </button>
          ))}
        </div>
      </header>
      {mode === 'proto'
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 20px 60px' }}><VoddaApp /></div>
        : <Gallery />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
