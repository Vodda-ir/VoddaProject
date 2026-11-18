// vodda-teacher-b.jsx — Teacher: Wallet, Withdraw, Profile/manage, sub-screens, Role sheet

function TeacherWallet({ go }) {
  return (
    <div className="scr-enter" style={{ paddingBottom: 24 }}>
      <div style={{ padding: '6px 20px 16px' }}><h1 style={{ fontSize: 24, fontWeight: 800 }}>کیف پول استاد</h1></div>

      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-xl)', background: 'linear-gradient(135deg,var(--olive-800),var(--olive-600))', padding: 22, color: '#fff', boxShadow: 'var(--sh-olive)' }}>
          <GeoPattern color="#fff" opacity={0.08} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 13, opacity: .82, marginBottom: 7 }}>موجودی قابل برداشت</div>
            <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 18 }}>{fa(ME_TEACHER.balance.toLocaleString('en-US'))} <span style={{ fontSize: 14, fontWeight: 600, opacity: .8 }}>تومان</span></div>
            <button onClick={() => go('withdraw')} style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff', color: 'var(--olive-700)', fontWeight: 800, fontSize: 15, padding: '13px 0', borderRadius: 999 }}>
              <Icon name="download" size={19} stroke={2.2} /> درخواست برداشت وجه
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '0 20px 24px' }}>
        <EarnTile label="درآمد این ماه" value={`${fa((T_EARN.month/1000000))} م`} sub="تومان" accent="var(--olive-700)" />
        <EarnTile label="جلسات این ماه" value={fa(38)} sub="جلسه" />
        <EarnTile label="کارمزد وُدّا" value={`${fa(T_EARN.commission)}٪`} sub="از هر جلسه" />
      </div>

      <SectionHeader title="تراکنش‌ها" action="همه" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 20px' }}>
        {T_TX.map(x => {
          const income = x.type === 'income';
          return (
            <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 14, boxShadow: 'var(--sh-sm)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: income ? 'var(--olive-100)' : 'var(--gold-bg)', color: income ? 'var(--olive-700)' : '#9A7426' }}>
                <Icon name={income ? 'coins' : 'download'} size={21} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 3 }}>{x.date}{income ? ` · از ${fa(x.gross.toLocaleString('en-US'))}` : ''}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: income ? 'var(--olive-700)' : 'var(--ink)' }}>
                {income ? '+' : '−'}{fa(Math.abs(x.net).toLocaleString('en-US'))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WithdrawScreen({ go }) {
  const [amount, setAmount] = React.useState('');
  const [done, setDone] = React.useState(false);
  const quick = [500000, 1000000, ME_TEACHER.balance];

  if (done) {
    return (
      <div className="scr-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 32px', textAlign: 'center' }}>
        <div style={{ width: 92, height: 92, borderRadius: '50%', background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, animation: 'vodda-pop .4s both' }}><Icon name="checkCircle" size={52} stroke={1.6} /></div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>درخواست برداشت ثبت شد</h1>
        <p style={{ fontSize: 14, lineHeight: 2, color: 'var(--ink-2s)', marginBottom: 26 }}>مبلغ <b style={{ color: 'var(--ink)' }}>{toman(Number(amount) || 0)}</b> پس از بررسی توسط وُدّا، طی ۲۴ تا ۷۲ ساعت به حساب بانکی شما واریز می‌شود.</p>
        <Button size="lg" full onClick={() => go('tab', 't_wallet')}>بازگشت به کیف پول</Button>
      </div>
    );
  }

  return (
    <div className="scr-enter" style={{ paddingBottom: 120 }}>
      <TopBar title="برداشت وجه" onBack={() => go('back')} />
      <div style={{ padding: '0 20px' }}>
        <div style={{ background: 'var(--olive-50)', borderRadius: 'var(--r-md)', padding: '14px 16px', marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2s)' }}>موجودی قابل برداشت</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--olive-700)' }}>{toman(ME_TEACHER.balance)}</span>
        </div>

        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>مبلغ برداشت</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: '4px 16px', boxShadow: 'var(--sh-sm)', marginBottom: 12 }}>
          <input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="۰" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 22, fontWeight: 800, padding: '14px 0', color: 'var(--ink)' }} />
          <span style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>تومان</span>
        </div>
        <div style={{ display: 'flex', gap: 9, marginBottom: 24 }}>
          {quick.map((a, i) => (
            <button key={i} onClick={() => setAmount(String(a))} style={{ flex: 1, padding: '11px 0', borderRadius: 13, background: 'var(--surface)', boxShadow: 'var(--sh-sm)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-2s)' }}>
              {i === 2 ? 'کل موجودی' : `${fa((a/1000))} هزار`}
            </button>
          ))}
        </div>

        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>واریز به</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 14, boxShadow: 'var(--sh-sm)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--olive-100)', color: 'var(--olive-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="money" size={22} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>کارت بانک ملت</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, letterSpacing: 1 }}>۶۰۳۷ - ۹۹۱۴ - •••• - ••••</div>
          </div>
          <Icon name="check" size={18} stroke={3} style={{ color: 'var(--olive-600)' }} />
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px 28px', background: 'linear-gradient(to top,var(--sand-50) 70%,transparent)' }}>
        <Button size="lg" full icon="check" onClick={() => amount && setDone(true)} style={{ opacity: amount ? 1 : .5 }}>ثبت درخواست برداشت</Button>
      </div>
    </div>
  );
}

function ServicesScreen({ go }) {
  const [services, setServices] = React.useState(ME_TEACHER.services);
  return (
    <div className="scr-enter" style={{ paddingBottom: 120 }}>
      <TopBar title="خدمات من" onBack={() => go('back')} />
      <div style={{ padding: '0 20px' }}>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.9, marginBottom: 18 }}>خدماتی که برای قرآن‌آموزان قابل رزرو است. می‌توانید هر خدمت را فعال یا غیرفعال کنید.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {services.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 13, background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 14, boxShadow: 'var(--sh-sm)', opacity: s.active ? 1 : .6 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: 'var(--olive-100)', color: 'var(--olive-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={s.icon} size={23} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{s.dur} · {toman(s.price)}</div>
              </div>
              <Toggle on={s.active} onChange={() => setServices(v => v.map(x => x.id === s.id ? { ...x, active: !x.active } : x))} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px 28px', background: 'linear-gradient(to top,var(--sand-50) 70%,transparent)' }}>
        <Button size="lg" full icon="plus">افزودن خدمت جدید</Button>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={onChange} style={{ width: 46, height: 28, borderRadius: 999, flexShrink: 0, background: on ? 'var(--olive-600)' : 'var(--sand-200)', position: 'relative', transition: 'background .2s' }}>
      <span style={{ position: 'absolute', top: 3, insetInlineStart: on ? 21 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'inset-inline-start .2s' }} />
    </button>
  );
}

function WorkTimesScreen({ go }) {
  const [days, setDays] = React.useState(WORK_TIMES);
  return (
    <div className="scr-enter" style={{ paddingBottom: 120 }}>
      <TopBar title="زمان‌های کاری" onBack={() => go('back')} />
      <div style={{ padding: '0 20px' }}>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.9, marginBottom: 18 }}>روزها و ساعت‌هایی که برای برگزاری جلسه در دسترس هستید را مشخص کنید.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {days.map((d, i) => (
            <div key={d.day} style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 14, boxShadow: 'var(--sh-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: d.on ? 'var(--ink)' : 'var(--ink-4)' }}>{d.day}</span>
                <Toggle on={d.on} onChange={() => setDays(v => v.map((x, j) => j === i ? { ...x, on: !x.on } : x))} />
              </div>
              {d.on && d.ranges.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {d.ranges.map(r => (
                    <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--olive-700)', background: 'var(--olive-50)', padding: '7px 12px', borderRadius: 999 }}><Icon name="clock" size={14} />{r}</span>
                  ))}
                  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', background: 'var(--sand-100)', padding: '7px 12px', borderRadius: 999 }}><Icon name="plus" size={14} stroke={2.4} />بازه</button>
                </div>
              )}
              {d.on && d.ranges.length === 0 && (
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, fontSize: 12.5, fontWeight: 700, color: 'var(--olive-600)' }}><Icon name="plus" size={15} stroke={2.4} />افزودن بازهٔ زمانی</button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px 28px', background: 'linear-gradient(to top,var(--sand-50) 70%,transparent)' }}>
        <Button size="lg" full icon="check">ذخیرهٔ تغییرات</Button>
      </div>
    </div>
  );
}

function TeacherProfile({ go, onSwitch }) {
  const t = ME_TEACHER;
  const [available, setAvailable] = React.useState(true);
  const rows = [
    { icon: 'book', label: 'خدمات من', sub: `${fa(t.services.filter(s => s.active).length)} خدمت فعال`, t: () => go('services') },
    { icon: 'clock', label: 'زمان‌های کاری', sub: '۵ روز فعال', t: () => go('worktimes') },
    { icon: 'mic', label: 'نمونه‌کارها', sub: '۳ فایل صوتی' },
    { icon: 'doc', label: 'مدارک و گواهی‌ها', sub: 'تأییدشده' },
    { icon: 'star', label: 'نظرات قرآن‌آموزان', sub: `${fa(t.reviews)} نظر` },
  ];
  return (
    <div className="scr-enter" style={{ paddingBottom: 24 }}>
      <div style={{ padding: '6px 20px 16px' }}><h1 style={{ fontSize: 24, fontWeight: 800 }}>پروفایل استاد</h1></div>

      {/* identity card */}
      <div style={{ padding: '0 20px 18px' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 16, boxShadow: 'var(--sh-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar size={62} ring verified />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16.5, fontWeight: 800 }}>{t.short}</div>
              <div style={{ fontSize: 12.5, color: 'var(--olive-600)', fontWeight: 600, marginTop: 3 }}>{t.tag}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7, fontSize: 12, color: 'var(--gold)', fontWeight: 800 }}><Icon name="star" size={14} fill />{fa(t.rating)} <span style={{ color: 'var(--ink-4)', fontWeight: 500 }}>({fa(t.reviews)} نظر)</span></div>
            </div>
            <button style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--olive-50)', color: 'var(--olive-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="edit" size={19} /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--sand-100)' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>وضعیت پذیرش جلسه</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 2 }}>{available ? 'آماده دریافت درخواست جدید' : 'موقتاً غیرفعال'}</div>
            </div>
            <Toggle on={available} onChange={() => setAvailable(a => !a)} />
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', margin: '0 20px 18px', boxShadow: 'var(--sh-sm)', overflow: 'hidden' }}>
        {rows.map((r, i) => (
          <button key={r.label} onClick={r.t} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '14px 16px', textAlign: 'start', borderBottom: i < rows.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
            <div style={{ color: 'var(--olive-600)' }}><Icon name={r.icon} size={21} /></div>
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600 }}>{r.label}</span>
            <span style={{ fontSize: 12, color: 'var(--ink-4)' }}>{r.sub}</span>
            <Icon name="chevronL" size={18} style={{ color: 'var(--ink-4)' }} />
          </button>
        ))}
      </div>

      {/* switch back to learner */}
      <div style={{ padding: '0 20px' }}>
        <button onClick={onSwitch} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'start', background: 'var(--olive-50)', borderRadius: 'var(--r-lg)', padding: 16, boxShadow: 'inset 0 0 0 1px var(--olive-100)' }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--surface)', color: 'var(--olive-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--sh-sm)' }}><Icon name="refresh" size={22} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>بازگشت به حساب قرآن‌آموز</div>
            <div style={{ fontSize: 12, color: 'var(--ink-2s)', marginTop: 3 }}>به‌عنوان قرآن‌آموز جلسه رزرو کنید</div>
          </div>
          <Icon name="chevronL" size={20} style={{ color: 'var(--olive-500)' }} />
        </button>
      </div>
    </div>
  );
}

// ── Role switch bottom sheet ──
function RoleSheet({ role, onPick, onClose }) {
  const options = [
    { id: 'learner', icon: 'user', title: 'حساب قرآن‌آموز', sub: 'یافتن استاد و رزرو جلسه' },
    { id: 'teacher', icon: 'award', title: 'حساب استاد', sub: 'مدیریت جلسات و درآمد' },
  ];
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(42,40,32,.4)', display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(2px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: 'var(--sand-50)', borderRadius: '28px 28px 0 0', padding: '14px 22px 34px', animation: 'vodda-fade .3s both' }}>
        <div style={{ width: 42, height: 5, borderRadius: 9, background: 'var(--sand-200)', margin: '0 auto 18px' }} />
        <h3 style={{ fontSize: 18, fontWeight: 800, textAlign: 'center', marginBottom: 6 }}>تغییر حساب</h3>
        <p style={{ fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'center', marginBottom: 20 }}>شما هم قرآن‌آموز هستید و هم استاد تأییدشده.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {options.map(o => {
            const active = role === o.id;
            return (
              <button key={o.id} onClick={() => onPick(o.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'start', padding: 15, borderRadius: 'var(--r-md)', background: 'var(--surface)', boxShadow: active ? 'inset 0 0 0 2px var(--olive-500)' : 'var(--sh-sm)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: active ? 'var(--olive-600)' : 'var(--olive-100)', color: active ? '#fff' : 'var(--olive-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={o.icon} size={24} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{o.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{o.sub}</div>
                </div>
                {active
                  ? <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--olive-700)', background: 'var(--olive-100)', padding: '5px 11px', borderRadius: 999 }}>فعلی</span>
                  : <Icon name="chevronL" size={20} style={{ color: 'var(--ink-4)' }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TeacherWallet, WithdrawScreen, ServicesScreen, WorkTimesScreen, TeacherProfile, RoleSheet, Toggle });
