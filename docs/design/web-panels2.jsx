// web-panels2.jsx — Admin panel + Panels Root (switcher) + mount

const PENDING_TEACHERS = [
  { name: 'رضا عبدلی', field: 'آموزش قرآن کریم', city: 'تهران', date: '۲ ساعت پیش', docs: 3 },
  { name: 'مریم سادات حسینی', field: 'مداحی اهل‌بیت', city: 'قم', date: '۵ ساعت پیش', docs: 2 },
  { name: 'علی کبیری', field: 'آموزش قرآن کریم', city: 'اصفهان', date: 'دیروز', docs: 4 },
];

const ADMIN_TX = [
  { title: 'شارژ کیف پول · مجتبی ش.', type: 'charge', amount: 200000, date: 'امروز ۱۴:۲۰' },
  { title: 'کارمزد جلسه · عباس م.', type: 'fee', amount: 12750, date: 'امروز ۱۲:۰۵' },
  { title: 'برداشت استاد · محمد م.', type: 'withdraw', amount: -1000000, date: 'دیروز ۱۸:۳۰' },
  { title: 'کارمزد جلسه · مریم ر.', type: 'fee', amount: 14250, date: 'دیروز ۱۰:۱۰' },
];

function AdminPanel() {
  const items = [
    { id: 'dash', icon: 'grid', label: 'داشبورد' },
    { id: 'users', icon: 'users', label: 'کاربران' },
    { id: 'teachers', icon: 'award', label: 'اساتید', badge: fa(PENDING_TEACHERS.length) },
    { id: 'sessions', icon: 'calendar', label: 'جلسات' },
    { id: 'tx', icon: 'coins', label: 'تراکنش‌ها' },
    { id: 'withdraws', icon: 'download', label: 'برداشت‌ها' },
    { id: 'reports', icon: 'trending', label: 'گزارش‌ها' },
    { id: 'settings', icon: 'settings', label: 'تنظیمات' },
  ];
  return (
    <PanelShell brandSub="پنل مدیریت" items={items} active="dash" user={{ name: 'مدیر سامانه', role: 'ادمین' }}>
      <PanelTopBar title="داشبورد مدیریت" sub="نمای کلی عملکرد وُدّا" />
      <ScrollArea>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
          <StatCard icon="users" label="کل کاربران" value={fa('8,420')} tone="info" delta="۶٪+" />
          <StatCard icon="award" label="اساتید فعال" value={fa(812)} tone="olive" delta="۴٪+" />
          <StatCard icon="checkCircle" label="جلسات این ماه" value={fa('3,150')} tone="gold" delta="۱۱٪+" />
          <StatCard icon="coins" label="درآمد کارمزد (ماه)" value={`${fa(48)} م ت`} tone="clay" delta="۹٪+" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18, marginBottom: 18 }}>
          {/* approval queue */}
          <Panel title="اساتید در انتظار تأیید" action="صف کامل" pad={false}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {PENDING_TEACHERS.map((t, i) => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < PENDING_TEACHERS.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
                  <Avatar size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{t.field} · {t.city}</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--ink-3)' }}><Icon name="doc" size={14} />{fa(t.docs)} مدرک</span>
                  <StatusTag status="review" />
                  <button style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'var(--olive-600)', padding: '7px 14px', borderRadius: 999 }}>بررسی</button>
                </div>
              ))}
            </div>
          </Panel>

          {/* growth chart */}
          <Panel title="رشد کاربران">
            <MiniBars data={[3.1, 3.9, 4.6, 5.4, 6.8, 8.4]} labels={['آذر', 'دی', 'بهمن', 'اسفند', 'فرورد', 'اردیب']} color="var(--olive-400)" />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--sand-100)', fontSize: 13 }}>
              <span style={{ color: 'var(--ink-3)' }}>نرخ رشد ماهانه</span>
              <span style={{ fontWeight: 800, color: 'var(--olive-700)' }}>۲۳٪+</span>
            </div>
          </Panel>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          {/* recent transactions */}
          <Panel title="تراکنش‌های اخیر" action="همه" pad={false}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {ADMIN_TX.map((x, i) => {
                const credit = x.amount > 0;
                const isFee = x.type === 'fee';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 20px', borderBottom: i < ADMIN_TX.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isFee ? 'var(--olive-100)' : credit ? 'var(--gold-bg)' : 'var(--clay-bg)', color: isFee ? 'var(--olive-700)' : credit ? '#9A7426' : 'var(--clay)' }}>
                      <Icon name={isFee ? 'coins' : credit ? 'download' : 'logout'} size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{x.date}</div>
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: credit ? 'var(--olive-700)' : 'var(--ink)' }}>{credit ? '+' : '−'}{fa(Math.abs(x.amount).toLocaleString('en-US'))}</span>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* breakdown */}
          <Panel title="ترکیب خدمات">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[['آموزش قرآن کریم', 64, 'var(--olive-600)'], ['مداحی اهل‌بیت', 24, 'var(--clay)'], ['مشاورهٔ صوتی', 12, 'var(--gold)']].map(([label, pct, c]) => (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7 }}>
                    <span style={{ fontWeight: 600 }}>{label}</span>
                    <span style={{ fontWeight: 800, color: c }}>{fa(pct)}٪</span>
                  </div>
                  <div style={{ height: 9, borderRadius: 999, background: 'var(--sand-100)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--sand-100)', fontSize: 13 }}>
              <span style={{ color: 'var(--ink-3)' }}>کل جلسات این ماه</span>
              <span style={{ fontWeight: 800 }}>{fa('3,150')}</span>
            </div>
          </Panel>
        </div>
      </ScrollArea>
    </PanelShell>
  );
}

function PanelsRoot() {
  const [panel, setPanel] = React.useState('user');
  const tabs = [
    { id: 'user', label: 'پنل کاربر', icon: 'user', url: 'vodda.ir/account' },
    { id: 'teacher', label: 'پنل مربی', icon: 'award', url: 'vodda.ir/teacher' },
    { id: 'admin', label: 'پنل ادمین', icon: 'shield', url: 'vodda.ir/admin' },
  ];
  const cur = tabs.find(t => t.id === panel);
  return (
    <div style={{ minHeight: '100vh', padding: '34px 24px 60px' }}>
      <header style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 28, color: 'var(--olive-700)', letterSpacing: '-.5px', display: 'inline-flex', alignItems: 'center', gap: 9 }}>وُدّا <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)', marginBottom: 12 }} /></div>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, marginTop: 4 }}>پنل‌های وب · کاربر، مربی و مدیریت</p>
        </div>
        <div style={{ display: 'inline-flex', gap: 4, background: '#fff', padding: 5, borderRadius: 999, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-200)' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setPanel(t.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 999, fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', background: panel === t.id ? 'var(--olive-600)' : 'transparent', color: panel === t.id ? '#fff' : 'var(--ink-2s)', boxShadow: panel === t.id ? 'var(--sh-olive)' : 'none' }}>
              <Icon name={t.icon} size={18} stroke={2} /> {t.label}
            </button>
          ))}
        </div>
      </header>

      <PanelChrome url={cur.url}>
        {panel === 'user' && <UserPanel />}
        {panel === 'teacher' && <TeacherPanel />}
        {panel === 'admin' && <AdminPanel />}
      </PanelChrome>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<PanelsRoot />);
