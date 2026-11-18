// vodda-screens-detail.jsx — Teacher Profile + Booking flow

function TopBar({ title, onBack, onAction, actionIcon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px 12px' }}>
      <button onClick={onBack} style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--surface)', boxShadow: 'var(--sh-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2s)' }}>
        <Icon name="chevronR" size={22} />
      </button>
      {title && <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>}
      {actionIcon
        ? <button onClick={onAction} style={{ width: 42, height: 42, borderRadius: 13, background: 'var(--surface)', boxShadow: 'var(--sh-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2s)' }}><Icon name={actionIcon} size={21} /></button>
        : <div style={{ width: 42 }} />}
    </div>
  );
}

function ProfileScreen({ teacher, go }) {
  const t = teacher;
  const [fav, setFav] = React.useState(t.fav);
  const [tab, setTab] = React.useState('services');
  return (
    <div className="scr-enter" style={{ paddingBottom: 110 }}>
      <TopBar onBack={() => go('back')} actionIcon="send" onAction={() => {}} />

      {/* identity */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 20px 18px', textAlign: 'center' }}>
        <Avatar size={94} ring verified={t.verified} />
        <h1 style={{ fontSize: 21, fontWeight: 800, marginTop: 14 }}>{t.short}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 13, color: 'var(--ink-2s)' }}>
          <span style={{ color: 'var(--olive-600)', fontWeight: 700 }}>{t.tag}</span>
          <span style={{ width: 3, height: 3, borderRadius: 9, background: 'var(--sand-200)' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="pin" size={14} />{t.city}</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 12, background: 'var(--gold-bg)', padding: '7px 14px', borderRadius: 999 }}>
          <Stars value={t.rating} size={15} />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#9A7426' }}>{fa(t.rating)}</span>
          <span style={{ fontSize: 12, color: '#A98A4A' }}>({fa(t.reviews)} نظر)</span>
        </div>
      </div>

      {/* actions */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px 18px' }}>
        <Button variant="soft" full icon="message" onClick={() => {}}>ارتباط با استاد</Button>
        <button onClick={() => setFav(f => !f)} style={{
          width: 52, borderRadius: 999, flexShrink: 0,
          background: fav ? 'var(--clay-bg)' : 'var(--olive-100)', color: fav ? 'var(--clay)' : 'var(--olive-700)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="heart" size={21} fill={fav} stroke={1.9} />
        </button>
      </div>

      {/* stats */}
      <div style={{ display: 'flex', gap: 10, padding: '0 20px 22px' }}>
        <StatBox icon="users" value={fa(t.followers.toLocaleString('en-US'))} label="دنبال‌کننده" />
        <StatBox icon="checkCircle" value={fa(t.sessions)} label="جلسهٔ برگزارشده" />
        <StatBox icon="award" value={t.level} label="سطح تخصص" />
      </div>

      {/* bio */}
      <div style={{ padding: '0 20px 22px' }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>دربارهٔ استاد</h3>
        <p style={{ fontSize: 13.5, lineHeight: 2, color: 'var(--ink-2s)', textWrap: 'pretty' }}>{t.bio}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14 }}>
          {t.skills.map(s => (
            <span key={s} style={{ fontSize: 12, fontWeight: 600, color: 'var(--olive-700)', background: 'var(--olive-50)', padding: '6px 12px', borderRadius: 999, boxShadow: 'inset 0 0 0 1px var(--olive-100)' }}>{s}</span>
          ))}
        </div>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 16px' }}>
        {[['services', 'خدمات'], ['samples', 'نمونهٔ کار'], ['reviews', 'نظرات']].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, padding: '10px 0', borderRadius: 13, fontSize: 13.5, fontWeight: 700,
            background: tab === id ? 'var(--olive-600)' : 'transparent', color: tab === id ? '#fff' : 'var(--ink-3)',
            boxShadow: tab === id ? 'var(--sh-sm)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      <div style={{ padding: '0 20px' }}>
        {tab === 'services' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {t.services.map(s => (
              <div key={s.id} onClick={() => go('booking', t, s)} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 14, boxShadow: 'var(--sh-sm)', cursor: 'pointer' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: 'var(--olive-100)', color: 'var(--olive-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={s.icon} size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, fontSize: 12, color: 'var(--ink-3)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="clock" size={13} />{s.dur}</span>
                    <span style={{ color: 'var(--olive-700)', fontWeight: 800 }}>{toman(s.price)}</span>
                  </div>
                </div>
                <Icon name="chevronL" size={20} style={{ color: 'var(--ink-4)' }} />
              </div>
            ))}
          </div>
        )}
        {tab === 'samples' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {t.samples.map(s => <AudioRow key={s.id} title={s.title} len={s.len} />)}
            <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
              <Placeholder h={120} radius={18} label="ویدئو نمونه" style={{ flex: 1 }} />
              <Placeholder h={120} radius={18} label="ویدئو نمونه" style={{ flex: 1 }} />
            </div>
          </div>
        )}
        {tab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {REVIEWS.map(r => (
              <div key={r.id} style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 14, boxShadow: 'var(--sh-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Avatar size={34} />
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{r.name}</span>
                  </div>
                  <Stars value={r.rating} size={13} />
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--ink-2s)' }}>{r.text}</p>
                <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 8 }}>{r.date}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* sticky book bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px 28px', background: 'linear-gradient(to top,var(--sand-50) 70%,transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)', borderRadius: 999, padding: '8px 8px 8px 18px', boxShadow: 'var(--sh-lg)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>شروع قیمت از</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{toman(t.price30)}</div>
          </div>
          <Button size="lg" onClick={() => go('booking', t)}>رزرو جلسه</Button>
        </div>
      </div>
    </div>
  );
}

// ── Booking flow: select service → pick day/time → confirm → success ──
function BookingScreen({ teacher, preService, go, initialStep, initialSlot }) {
  const t = teacher;
  const [step, setStep] = React.useState(initialStep || (preService ? 2 : 1));
  const [svc, setSvc] = React.useState(preService || t.services[0]);
  const [day, setDay] = React.useState(2);
  const [slot, setSlot] = React.useState(initialSlot || null);
  const [note, setNote] = React.useState('');

  const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
  const dates = ['۲۱', '۲۲', '۲۳', '۲۴', '۲۵', '۲۶', '۲۷'];
  const slots = ['۰۹:۰۰', '۱۰:۳۰', '۱۲:۰۰', '۱۶:۰۰', '۱۷:۳۰', '۱۹:۰۰', '۲۰:۳۰', '۲۲:۰۰'];
  const closedSlots = [2, 5];

  const Progress = () => (
    <div style={{ display: 'flex', gap: 6, padding: '0 20px 18px' }}>
      {[1, 2, 3].map(s => (
        <div key={s} style={{ flex: 1, height: 4, borderRadius: 9, background: s <= step ? 'var(--olive-600)' : 'var(--sand-200)' }} />
      ))}
    </div>
  );

  if (step === 4) {
    return (
      <div className="scr-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 32px', textAlign: 'center' }}>
        <div style={{ width: 92, height: 92, borderRadius: '50%', background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, animation: 'vodda-pop .4s both' }}>
          <Icon name="checkCircle" size={52} stroke={1.6} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>درخواست شما ارسال شد</h1>
        <p style={{ fontSize: 14, lineHeight: 2, color: 'var(--ink-2s)', marginBottom: 8 }}>
          درخواست جلسه با <b style={{ color: 'var(--ink)' }}>{t.short}</b> ثبت شد. پس از تأیید استاد، در بخش «جلسات من» قطعی می‌شود و به شما اطلاع می‌دهیم.
        </p>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 16, boxShadow: 'var(--sh-sm)', width: '100%', margin: '14px 0 26px', textAlign: 'start' }}>
          {[['خدمت', svc.title], ['زمان', `${days[day]} ${dates[day]} بهمن، ساعت ${slot}`], ['مدت', svc.dur], ['مبلغ', toman(svc.price)]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 13 }}>
              <span style={{ color: 'var(--ink-3)' }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
        <Button size="lg" full onClick={() => go('tab', 'sessions')}>مشاهدهٔ جلسات من</Button>
        <button onClick={() => go('tab', 'home')} style={{ marginTop: 14, fontSize: 14, fontWeight: 700, color: 'var(--ink-3)' }}>بازگشت به خانه</button>
      </div>
    );
  }

  return (
    <div className="scr-enter" style={{ paddingBottom: 110 }}>
      <TopBar title="رزرو جلسه" onBack={() => step > 1 && !preService ? setStep(step - 1) : go('back')} />
      <Progress />

      {/* teacher mini */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 20px 20px', background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 12, boxShadow: 'var(--sh-sm)' }}>
        <Avatar size={48} verified={t.verified} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800 }}>{t.short}</div>
          <div style={{ fontSize: 12, color: 'var(--olive-600)', fontWeight: 600, marginTop: 2 }}>{t.tag}</div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--gold)', fontWeight: 800, fontSize: 13 }}><Icon name="star" size={14} fill />{fa(t.rating)}</span>
      </div>

      {step === 1 && (
        <div style={{ padding: '0 20px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>نوع جلسه را انتخاب کنید</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {t.services.map(s => (
              <button key={s.id} onClick={() => setSvc(s)} style={{
                display: 'flex', alignItems: 'center', gap: 13, textAlign: 'start', padding: 14, borderRadius: 'var(--r-md)',
                background: 'var(--surface)', boxShadow: svc.id === s.id ? 'inset 0 0 0 2px var(--olive-500)' : 'var(--sh-sm)',
              }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: 'var(--olive-100)', color: 'var(--olive-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={s.icon} size={23} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{s.dur} · جلسهٔ صوتی</div>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--olive-700)' }}>{fa(s.price/1000)}<span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)' }}> هزار ت</span></div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 12, color: 'var(--ink-3)', background: 'var(--olive-50)', padding: '11px 14px', borderRadius: 13 }}>
            <Icon name="phone" size={17} style={{ color: 'var(--olive-500)' }} />
            در نسخهٔ فعلی، جلسات به‌صورت تماس صوتی زنده برگزار می‌شوند.
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ padding: '0 20px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>روز جلسه</h3>
          <div style={{ display: 'flex', gap: 9, overflowX: 'auto', paddingBottom: 4, marginBottom: 24 }}>
            {days.map((d, i) => (
              <button key={i} onClick={() => setDay(i)} style={{
                flexShrink: 0, width: 58, padding: '12px 0', borderRadius: 16, textAlign: 'center',
                background: day === i ? 'var(--olive-600)' : 'var(--surface)', color: day === i ? '#fff' : 'var(--ink-2s)',
                boxShadow: day === i ? 'var(--sh-olive)' : 'var(--sh-sm)',
              }}>
                <div style={{ fontSize: 11, opacity: .85 }}>{d.slice(0, 3)}</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{dates[i]}</div>
              </button>
            ))}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>ساعت جلسه</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 22 }}>
            {slots.map((s, i) => {
              const closed = closedSlots.includes(i);
              const sel = slot === s;
              return (
                <button key={s} disabled={closed} onClick={() => setSlot(s)} style={{
                  padding: '11px 0', borderRadius: 13, fontSize: 13.5, fontWeight: 700,
                  background: sel ? 'var(--olive-600)' : closed ? 'var(--sand-100)' : 'var(--surface)',
                  color: sel ? '#fff' : closed ? 'var(--ink-4)' : 'var(--ink-2s)',
                  boxShadow: sel ? 'var(--sh-sm)' : closed ? 'none' : 'inset 0 0 0 1px var(--sand-200)',
                  textDecoration: closed ? 'line-through' : 'none', cursor: closed ? 'not-allowed' : 'pointer',
                }}>{s}</button>
              );
            })}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>توضیحات (اختیاری)</h3>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="هدف جلسه یا نکته‌ای که می‌خواهید استاد بداند…" rows={3} style={{
            width: '100%', border: 'none', outline: 'none', resize: 'none', background: 'var(--surface)', borderRadius: 'var(--r-md)',
            padding: 14, fontSize: 13.5, lineHeight: 1.9, color: 'var(--ink)', boxShadow: 'var(--sh-sm)',
          }} />
        </div>
      )}

      {step === 3 && (
        <div style={{ padding: '0 20px' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>تأیید و پرداخت</h3>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 16, boxShadow: 'var(--sh-sm)', marginBottom: 16 }}>
            {[['خدمت', svc.title], ['تاریخ', `${days[day]} ${dates[day]} بهمن`], ['ساعت', slot || '—'], ['مدت', svc.dur]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13.5, borderBottom: '1px solid var(--sand-100)' }}>
                <span style={{ color: 'var(--ink-3)' }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontSize: 15 }}>
              <span style={{ fontWeight: 700 }}>مبلغ قابل پرداخت</span>
              <span style={{ fontWeight: 800, color: 'var(--olive-700)' }}>{toman(svc.price)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--olive-50)', borderRadius: 'var(--r-md)', padding: 14, marginBottom: 8 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--surface)', color: 'var(--olive-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--sh-sm)' }}><Icon name="wallet" size={22} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>پرداخت از کیف پول</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>موجودی: {toman(USER.wallet)}</div>
            </div>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--olive-600)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} stroke={3} /></div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-4)', lineHeight: 1.8, padding: '0 4px' }}>مبلغ پس از تأیید استاد از کیف پول شما کسر می‌شود. کارمزد وُدّا ۱۵٪ است.</div>
        </div>
      )}

      {/* CTA */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px 28px', background: 'linear-gradient(to top,var(--sand-50) 70%,transparent)' }}>
        {step === 1 && <Button size="lg" full onClick={() => setStep(2)}>ادامه</Button>}
        {step === 2 && <Button size="lg" full onClick={() => slot && setStep(3)} style={{ opacity: slot ? 1 : .5 }}>ادامه</Button>}
        {step === 3 && <Button size="lg" full icon="check" onClick={() => setStep(4)}>ثبت و ارسال درخواست</Button>}
      </div>
    </div>
  );
}

Object.assign(window, { TopBar, ProfileScreen, BookingScreen });
