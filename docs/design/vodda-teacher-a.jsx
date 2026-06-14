// vodda-teacher-a.jsx — Teacher: Dashboard, Requests, Request detail, Sessions

// small labelled earning/stat tile
function EarnTile({ label, value, sub, accent }) {
  return (
    <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: '14px 14px', boxShadow: 'var(--sh-sm)' }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 7 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent || 'var(--ink)' }}>{value}</div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function TeacherHeader({ onBell, onSwitch }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
      <button onClick={onSwitch} style={{ display: 'flex', alignItems: 'center', gap: 11, textAlign: 'start' }}>
        <Avatar size={46} ring verified />
        <div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>پنل استاد · {ME_TEACHER.first || 'مجتبی'}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 800, color: 'var(--olive-700)' }}>
            تغییر حساب <Icon name="refresh" size={15} stroke={2} />
          </div>
        </div>
      </button>
      <button onClick={onBell} style={{ position: 'relative', width: 44, height: 44, borderRadius: 14, background: 'var(--surface)', boxShadow: 'var(--sh-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2s)' }}>
        <Icon name="bell" size={21} />
        <span style={{ position: 'absolute', top: 11, insetInlineEnd: 12, width: 8, height: 8, borderRadius: '50%', background: 'var(--clay)', border: '2px solid var(--surface)' }} />
      </button>
    </div>
  );
}

function TeacherDashboard({ go, onSwitch }) {
  const next = T_SESSIONS.find(s => s.when === 'upcoming');
  return (
    <div className="scr-enter" style={{ paddingBottom: 24 }}>
      <TeacherHeader onSwitch={onSwitch} onBell={() => {}} />

      {/* earnings hero */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-xl)', background: 'linear-gradient(135deg,var(--olive-800),var(--olive-600))', padding: 22, color: '#fff', boxShadow: 'var(--sh-olive)' }}>
          <GeoPattern color="#fff" opacity={0.08} />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 13, opacity: .82, marginBottom: 6 }}>درآمد این ماه</div>
            <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 16 }}>{fa(T_EARN.month.toLocaleString('en-US'))} <span style={{ fontSize: 14, fontWeight: 600, opacity: .8 }}>تومان</span></div>
            <div style={{ display: 'flex', gap: 18 }}>
              <div><div style={{ fontSize: 11, opacity: .75 }}>امروز</div><div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{fa((T_EARN.today/1000))} هزار</div></div>
              <div style={{ width: 1, background: 'rgba(255,255,255,.2)' }} />
              <div><div style={{ fontSize: 11, opacity: .75 }}>این هفته</div><div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>{fa((T_EARN.week/1000))} هزار</div></div>
              <div style={{ width: 1, background: 'rgba(255,255,255,.2)' }} />
              <div><div style={{ fontSize: 11, opacity: .75 }}>امتیاز</div><div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 15, fontWeight: 800, marginTop: 2 }}><Icon name="star" size={14} fill style={{ color: 'var(--gold-soft)' }} />{fa(ME_TEACHER.rating)}</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* pending requests banner */}
      <div style={{ padding: '0 20px 22px' }}>
        <button onClick={() => go('tab', 't_requests')} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'start', background: 'var(--gold-bg)', borderRadius: 'var(--r-lg)', padding: 16, boxShadow: 'inset 0 0 0 1px var(--gold-soft)' }}>
          <div style={{ position: 'relative', width: 46, height: 46, borderRadius: 14, background: '#fff', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="message" size={24} />
            <span style={{ position: 'absolute', top: -5, insetInlineEnd: -5, minWidth: 20, height: 20, padding: '0 5px', borderRadius: 10, background: 'var(--clay)', color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--gold-bg)' }}>{fa(REQUESTS.length)}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: '#7A5E1E' }}>{fa(REQUESTS.length)} درخواست جدید</div>
            <div style={{ fontSize: 12, color: '#9A7426', marginTop: 3 }}>برای تأیید یا رد، لمس کنید</div>
          </div>
          <Icon name="chevronL" size={20} style={{ color: '#9A7426' }} />
        </button>
      </div>

      {/* next session */}
      {next && (
        <>
          <SectionHeader title="جلسهٔ بعدی شما" action="همهٔ جلسات" onAction={() => go('tab', 't_sessions')} />
          <div style={{ padding: '0 20px 22px' }}>
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 15, boxShadow: 'var(--sh-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 13 }}>
                <Avatar size={46} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 800 }}>{next.learner}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2s)', marginTop: 3 }}>{next.service}</div>
                </div>
                <StatusPill status="confirmed" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', background: 'var(--sand-50)', borderRadius: 13, fontSize: 12.5, color: 'var(--ink-2s)', marginBottom: 13 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="calendar" size={16} style={{ color: 'var(--olive-500)' }} />{next.date}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="clock" size={16} style={{ color: 'var(--olive-500)' }} />{next.time}</span>
              </div>
              <Button full icon="phone">شروع جلسه{next.minsTo ? ` · ${fa(next.minsTo)} دقیقه دیگر` : ''}</Button>
            </div>
          </div>
        </>
      )}

      {/* quick manage */}
      <SectionHeader title="مدیریت سریع" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 20px' }}>
        {[['خدمات من', 'book', () => go('services')], ['زمان‌های کاری', 'clock', () => go('worktimes')], ['کیف پول', 'wallet', () => go('tab', 't_wallet')], ['نظرات قرآن‌آموزان', 'star', () => {}]].map(([label, icon, fn]) => (
          <button key={label} onClick={fn} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 14, boxShadow: 'var(--sh-sm)', textAlign: 'start' }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--olive-100)', color: 'var(--olive-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={21} /></div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RequestsScreen({ go }) {
  return (
    <div className="scr-enter" style={{ paddingBottom: 24 }}>
      <div style={{ padding: '6px 20px 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>درخواست‌های دریافتی</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{fa(REQUESTS.length)} درخواست در انتظار پاسخ شما</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 20px' }}>
        {REQUESTS.map(r => (
          <div key={r.id} onClick={() => go('reqDetail', r)} style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 15, boxShadow: 'var(--sh-sm)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 13 }}>
              <Avatar size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800 }}>{r.learner}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2s)', marginTop: 3 }}>{r.service}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--clay)', background: 'var(--clay-bg)', padding: '4px 10px', borderRadius: 999 }}>جدید</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', background: 'var(--sand-50)', borderRadius: 13, fontSize: 12.5, color: 'var(--ink-2s)', marginBottom: 13 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="calendar" size={16} style={{ color: 'var(--olive-500)' }} />{r.date}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="clock" size={16} style={{ color: 'var(--olive-500)' }} />{r.time}</span>
              <span style={{ marginInlineStart: 'auto', fontWeight: 800, color: 'var(--olive-700)' }}>{toman(r.price)}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button full size="sm" onClick={e => { e.stopPropagation(); go('reqDetail', r); }}>بررسی و پاسخ</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestDetail({ request, go }) {
  const r = request;
  const [result, setResult] = React.useState(null); // 'accepted' | 'rejected'
  const [reason, setReason] = React.useState('');
  const [rejecting, setRejecting] = React.useState(false);

  if (result) {
    const ok = result === 'accepted';
    return (
      <div className="scr-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '0 32px', textAlign: 'center' }}>
        <div style={{ width: 92, height: 92, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, animation: 'vodda-pop .4s both', background: ok ? 'var(--olive-100)' : 'var(--clay-bg)', color: ok ? 'var(--olive-600)' : 'var(--clay)' }}>
          <Icon name={ok ? 'checkCircle' : 'x'} size={ok ? 52 : 44} stroke={ok ? 1.6 : 2.4} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>{ok ? 'درخواست تأیید شد' : 'درخواست رد شد'}</h1>
        <p style={{ fontSize: 14, lineHeight: 2, color: 'var(--ink-2s)', marginBottom: 26 }}>
          {ok ? <>جلسه با <b style={{ color: 'var(--ink)' }}>{r.learner}</b> در {r.date} ساعت {r.time} قطعی شد و به قرآن‌آموز اطلاع داده شد.</>
              : <>درخواست <b style={{ color: 'var(--ink)' }}>{r.learner}</b> رد شد و دلیل برای ایشان ارسال شد.</>}
        </p>
        <Button size="lg" full onClick={() => go('tab', ok ? 't_sessions' : 't_requests')}>{ok ? 'مشاهدهٔ جلسات' : 'بازگشت به درخواست‌ها'}</Button>
      </div>
    );
  }

  return (
    <div className="scr-enter" style={{ paddingBottom: 120 }}>
      <TopBar title="جزئیات درخواست" onBack={() => go('back')} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 20px 20px', textAlign: 'center' }}>
        <Avatar size={78} />
        <h1 style={{ fontSize: 20, fontWeight: 800, marginTop: 12 }}>{r.learner}</h1>
        <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>قرآن‌آموز · اولین جلسه</div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 16, boxShadow: 'var(--sh-sm)', marginBottom: 14 }}>
          {[['خدمت درخواستی', r.service], ['تاریخ', r.date], ['ساعت', r.time], ['مدت', r.dur]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', fontSize: 13.5, borderBottom: '1px solid var(--sand-100)' }}>
              <span style={{ color: 'var(--ink-3)' }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, fontSize: 14 }}>
            <span style={{ fontWeight: 700 }}>درآمد شما (پس از کارمزد ۱۵٪)</span>
            <span style={{ fontWeight: 800, color: 'var(--olive-700)' }}>{toman(Math.round(r.price * 0.85))}</span>
          </div>
        </div>

        {r.note && (
          <div style={{ background: 'var(--olive-50)', borderRadius: 'var(--r-md)', padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--olive-700)', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="chat" size={16} /> توضیح قرآن‌آموز</div>
            <p style={{ fontSize: 13, lineHeight: 1.9, color: 'var(--ink-2s)' }}>{r.note}</p>
          </div>
        )}

        {rejecting && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 10 }}>دلیل رد (برای قرآن‌آموز نمایش داده می‌شود)</div>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="مثلاً: در این بازهٔ زمانی امکان برگزاری ندارم…" rows={3} style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 14, fontSize: 13.5, lineHeight: 1.9, boxShadow: 'var(--sh-sm)', color: 'var(--ink)' }} />
          </div>
        )}
      </div>

      {/* sticky actions */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 20px 28px', background: 'linear-gradient(to top,var(--sand-50) 70%,transparent)' }}>
        {rejecting ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" full onClick={() => setRejecting(false)}>انصراف</Button>
            <Button variant="gold" full onClick={() => setResult('rejected')} style={{ background: 'var(--rose)' }}>ارسال رد</Button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" full onClick={() => setRejecting(true)}>رد درخواست</Button>
            <Button full icon="check" onClick={() => setResult('accepted')}>تأیید جلسه</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function TSessionCard({ s, isTeacher = true }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-lg)', padding: 15, boxShadow: 'var(--sh-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <StatusPill status={s.status} />
        <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>{s.dur} · {toman(Math.round(s.price * 0.85))}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 13 }}>
        <Avatar size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800 }}>{s.learner}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-2s)', marginTop: 3 }}>{s.service}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', background: 'var(--sand-50)', borderRadius: 13, fontSize: 12.5, color: 'var(--ink-2s)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="calendar" size={16} style={{ color: 'var(--olive-500)' }} />{s.date}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="clock" size={16} style={{ color: 'var(--olive-500)' }} />{s.time}</span>
      </div>
      {s.status === 'confirmed' && (
        <div style={{ marginTop: 13 }}>
          {s.minsTo ? <Button full icon="phone">شروع جلسه · {fa(s.minsTo)} دقیقه دیگر</Button>
                    : <Button variant="soft" full>یادآوری و جزئیات</Button>}
        </div>
      )}
      {s.status === 'done' && s.rated && (
        <div style={{ marginTop: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-3)' }}>
          امتیاز قرآن‌آموز: <Stars value={s.learnerRating} size={15} />
        </div>
      )}
    </div>
  );
}

function TeacherSessions({ go, initialTab }) {
  const [tab, setTab] = React.useState(initialTab || 'upcoming');
  const list = T_SESSIONS.filter(s => s.when === tab);
  return (
    <div className="scr-enter" style={{ paddingBottom: 24 }}>
      <div style={{ padding: '6px 20px 16px' }}><h1 style={{ fontSize: 24, fontWeight: 800 }}>جلسات من</h1></div>
      <div style={{ display: 'flex', gap: 8, padding: '0 20px 18px' }}>
        {[['upcoming', 'پیش‌رو'], ['past', 'برگزارشده']].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: '11px 0', borderRadius: 14, fontSize: 14, fontWeight: 700, background: tab === id ? 'var(--olive-600)' : 'var(--surface)', color: tab === id ? '#fff' : 'var(--ink-3)', boxShadow: tab === id ? 'var(--sh-olive)' : 'var(--sh-sm)' }}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 20px' }}>
        {list.length === 0 ? <EmptyState icon="calendar" title="جلسه‌ای نیست" sub="هنوز جلسه‌ای در این بخش ندارید." /> : list.map(s => <TSessionCard key={s.id} s={s} />)}
      </div>
    </div>
  );
}

Object.assign(window, { TeacherDashboard, RequestsScreen, RequestDetail, TeacherSessions, TSessionCard, EarnTile });
