'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Nav, Footer } from '@/components/web/sections';
import { Avatar, PublicPageHero } from '@/components/web/ui';
import { api, toman } from '@/lib/api';
import type {
  DispatchCallItem,
  DispatchCallViewData,
  DispatchCandidateItem,
  OfficialServiceItem,
  Teacher,
} from '@/lib/api';
import { avatarUrl, fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';
import { formatDateTime } from '@/lib/datetime';

type Phase = 'idle' | 'searching' | 'matched';

// باگ dispatch-stuck-pending — پیام دقیق وقتی فراخوان فعال قبلی مانع ثبت فراخوان جدید است.
const PENDING_CALL_MESSAGE = 'فراخوان قبلی شما در انتظار پاسخ است — ابتدا آن را لغو کنید.';

const TIER_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  international: { label: 'درجه یک بین‌المللی', bg: 'var(--gold-bg, #f7efd9)', color: '#8b681f' },
  grade2: { label: 'درجه دو', bg: 'var(--olive-50, #f2f5ea)', color: '#4c5a36' },
  grade3: { label: 'درجه سه', bg: 'var(--info-bg, #edf3f5)', color: '#5e7e8c' },
};

function countdown(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function faNumber(n: number) {
  return formatFaNumber(n);
}

function remaining(expiresAt: string) {
  const at = new Date(expiresAt).getTime();
  if (Number.isNaN(at)) return 0;
  return Math.max(0, Math.round((at - Date.now()) / 1000));
}

function whenLabel(call: DispatchCallItem) {
  if (call.flexible || !call.scheduled_at) return '⚡ در اسرع وقت';
  const at = new Date(call.scheduled_at);
  if (Number.isNaN(at.getTime())) return '⚡ در اسرع وقت';
  return `📅 ${formatDateTime(at, 'fa', 'weekdayDayMonth')}`;
}

export default function DispatchPage() {
  const token = getToken();
  const [authed, setAuthed] = useState<boolean | null>(token ? true : null);
  const [catalog, setCatalog] = useState<OfficialServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<OfficialServiceItem | null>(null);
  const [whenMode, setWhenMode] = useState<'now' | 'later'>('now');
  const [laterAt, setLaterAt] = useState('');
  const [note, setNote] = useState('');
  const [view, setView] = useState<DispatchCallViewData | null>(null);
  const [mode, setMode] = useState<'broadcast' | 'list'>('broadcast');
  const [list, setList] = useState<Teacher[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [busyOffer, setBusyOffer] = useState(0);
  const [creating, setCreating] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [payMethod, setPayMethod] = useState<'wallet' | 'gateway'>('gateway');
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const pollRef = useRef<number | null>(null);

  const call = view?.call ?? null;
  const phase: Phase = call ? (call.status === 'searching' ? 'searching' : 'matched') : 'idle';

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const catalogResponse = await api.catalog();
        const groups = catalogResponse.data?.categories ?? [];
        const flat: OfficialServiceItem[] = [];
        for (const group of groups) {
          for (const item of group.services ?? []) {
            if (item.id > 0 && item.title) flat.push({ id: item.id, category: group.category, title: item.title, description: item.description, icon: item.icon });
          }
        }
        if (active) setCatalog(flat);
      } catch {
        if (active) setError('فهرست موضوعات دریافت نشد.');
      } finally {
        if (active) setLoading(false);
      }
      if (!token) {
        if (active) setAuthed(false);
        return;
      }
      try {
        const current = await api.dispatchCurrent(token);
        if (active) setView(current.data ?? null);
        if (active) setAuthed(true);
      } catch {
        if (active) setAuthed(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const current = await api.dispatchCurrent(token);
      setView(current.data ?? null);
    } catch {
      // polling errors are non-fatal
    }
  }, [token]);

  useEffect(() => {
    if (phase === 'idle') return;
    pollRef.current = window.setInterval(() => {
      void refresh();
      setTick((value) => value + 1);
    }, 2500);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [phase, refresh]);

  const secondsLeft = useMemo(() => (call ? remaining(call.expires_at) : 0), [call, tick]);

  const grouped = useMemo(() => {
    const q = query.trim();
    const rows = q ? catalog.filter((item) => item.title.includes(q) || item.category.includes(q)) : catalog;
    const groups = new Map<string, OfficialServiceItem[]>();
    for (const item of rows) {
      const list = groups.get(item.category) ?? [];
      list.push(item);
      groups.set(item.category, list);
    }
    return [...groups.entries()];
  }, [catalog, query]);

  const start = useCallback(async () => {
    if (!token || !topic || creating) return;
    setCreating(true);
    setError('');
    try {
      // باگ dispatch-stuck-pending — پیش از ثبت، فراخوان فعال قبلی بررسی می‌شود تا کاربر
      // به‌جای خطای مبهم سرور، پیام دقیق بگیرد و همان فراخوان با دکمهٔ لغو نمایش داده شود.
      const precheck = await api.dispatchCurrent(token);
      const precheckCall = precheck.data?.call;
      if (precheckCall && (precheckCall.status === 'searching' || precheckCall.status === 'matched')) {
        setView(precheck.data ?? null);
        setError(PENDING_CALL_MESSAGE);
        return;
      }
      const scheduledAt = whenMode === 'later' && laterAt ? new Date(laterAt).toISOString() : undefined;
      const created = await api.dispatchCreate(token, {
        official_service_id: topic.id,
        note: note.trim(),
        flexible: whenMode === 'now',
        scheduled_at: scheduledAt,
      });
      setView(created.data ?? null);
    } catch (cause) {
      // رقابت احتمالی (مثلاً ثبت در دستگاه دیگر): وضعیت واقعی را بگیر؛
      // اگر فراخوان فعال هست، همان با دکمهٔ لغو نشان داده می‌شود نه خطای بی‌مسیر.
      try {
        const current = await api.dispatchCurrent(token);
        const active = current.data?.call;
        if (active && (active.status === 'searching' || active.status === 'matched')) {
          setView(current.data ?? null);
          setError(PENDING_CALL_MESSAGE);
          return;
        }
      } catch {
        // بررسی وضعیت ناموفق بود — پیام اصلی خطا نشان داده می‌شود
      }
      setError(cause instanceof Error ? cause.message : 'ثبت فراخوان انجام نشد.');
    } finally {
      setCreating(false);
    }
  }, [creating, laterAt, note, token, topic, whenMode]);

  const cancel = useCallback(async () => {
    if (!token || !call || canceling) return;
    setCanceling(true);
    setError('');
    try {
      await api.dispatchCancel(token, call.id);
      setView({ call: null, candidates: [] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'لغو فراخوان انجام نشد.');
    } finally {
      setCanceling(false);
    }
  }, [call, canceling, token]);

  const choose = useCallback(
    async (offerId: number) => {
      if (!token || !call || busyOffer) return;
      setBusyOffer(offerId);
      setError('');
      try {
        const result = await api.dispatchChoose(token, call.id, offerId, payMethod);
        await refresh();
        if (result.data?.redirect_url) window.location.href = result.data.redirect_url;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'ثبت رزرو انجام نشد.';
        setError(
          payMethod === 'wallet' && message.includes('کیف')
            ? 'کیف پول کافی نیست؛ ابتدا کیف پول را شارژ کنید یا پرداخت آنلاین را برگزینید.'
            : message,
        );
        await refresh();
      } finally {
        setBusyOffer(0);
      }
    },
    [busyOffer, call, payMethod, refresh, token],
  );

  const decline = useCallback(
    async (offerId: number) => {
      if (!token || !call || busyOffer) return;
      setBusyOffer(offerId);
      setError('');
      try {
        const updated = await api.dispatchDecline(token, call.id, offerId);
        setView(updated.data ?? null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'رد پاسخ انجام نشد.');
      } finally {
        setBusyOffer(0);
      }
    },
    [busyOffer, call, token],
  );

  // حالت فهرست: اساتیدی که همین موضوع رسمی را تدریس می‌کنند
  useEffect(() => {
    if (!topic || mode !== 'list') return;
    let active = true;
    setListLoading(true);
    api
      .teachers('', { official_service_id: String(topic.id), limit: '24' })
      .then((response) => {
        if (!active) return;
        setList(response.data || []);
        setListTotal(response.total || 0);
      })
      .catch(() => {
        if (active) {
          setList([]);
          setListTotal(0);
        }
      })
      .finally(() => {
        if (active) setListLoading(false);
      });
    return () => {
      active = false;
    };
  }, [topic, mode]);

  const candidates = view?.candidates ?? [];

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <PublicPageHero
        kicker="فراخوان اساتید — به دو شیوه"
        title="موضوع را بگو؛ یا فراخوان بزن یا مستقیم استادت را برگزین"
        description="در شیوهٔ «فراخوان زنده»، درخواست شما بین همهٔ اساتید آن موضوع پخش می‌شود و نخستین اساتیدی که اعلام آمادگی کنند دیده می‌شوند. در شیوهٔ «فهرست اساتید» هم می‌توانید پروفایل اساتید همان موضوع را ببینید و مستقیم رزرو کنید."
        icon="bell"
      />

      <main className="public-container public-content">
        {!loading && authed === false ? (
          <section className="ops-data-surface" style={{ textAlign: 'center', padding: '28px 18px' }}>
            <span style={{ color: 'var(--olive-500)' }}><Icon name="bell" size={34} /></span>
            <h2 style={{ margin: '10px 0 6px', fontSize: 20 }}>برای ثبت فراخوان، ابتدا وارد حساب شوید</h2>
            <p style={{ margin: '0 0 16px', color: 'var(--ink-2)' }}>ورود با شماره موبایل و کد تأیید انجام می‌شود.</p>
            <Link href="/panel/login" className="ops-primary-btn" style={{ display: 'inline-flex' }}>
              ورود به حساب وُدّا
            </Link>
          </section>
        ) : phase === 'matched' && call ? (
          <MatchedCard
            call={call}
            candidates={candidates}
            onNew={() => { setView({ call: null, candidates: [] }); void refresh(); }}
            onCancel={() => void cancel()}
            canceling={canceling}
          />
        ) : phase === 'searching' && call ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <section className="ops-data-surface neon-frame" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span
                  aria-hidden="true"
                  className="vodda-live-dot"
                  style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--olive-500)', display: 'inline-block', flex: '0 0 auto' }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ fontSize: 17 }}>{call.topic_title}</strong>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>{whenLabel(call)}</span>
                </div>
                <strong dir="ltr" style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums', color: 'var(--olive-700)' }}>
                  {countdown(secondsLeft)}
                </strong>
              </div>
              {call.note ? (
                <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--ink-2)', background: 'var(--sand-50)', borderRadius: 12, padding: '9px 12px', lineHeight: 1.9 }}>
                  «{call.note}»
                </p>
              ) : null}
              <p style={{ margin: '12px 0 0', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.9 }}>
                فراخوان بین اساتید این موضوع پخش شده است؛ پاسخ‌های جدید به‌صورت زنده اضافه می‌شوند.
              </p>
            </section>

            <div className="web-results-head">
              <div>
                <small>استادهای آماده</small>
                <strong>{toFaDigits(candidates.length)} پاسخ زنده</strong>
              </div>
              <span className="vodda-live-dot" style={{ fontSize: 12, color: 'var(--olive-500)' }}>● زنده</span>
            </div>

            <div
              role="radiogroup"
              aria-label="روش پرداخت"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 6, borderRadius: 16, border: '1px solid var(--sand-200)', background: '#fff' }}
            >
              {([
                ['gateway', '💳 پرداخت آنلاین (سامان)'],
                ['wallet', '👛 پرداخت از کیف پول'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={payMethod === value}
                  onClick={() => setPayMethod(value)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 11,
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    color: payMethod === value ? '#fff' : 'var(--ink-2)',
                    background: payMethod === value ? 'var(--olive-600)' : 'transparent',
                    border: 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {candidates.length === 0 ? (
              <section className="ops-data-surface" style={{ textAlign: 'center', padding: 24 }}>
                <div className="vodda-dispatch-radar" style={{ width: 58, height: 58, margin: '0 auto 12px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--olive-50)', color: 'var(--olive-600)' }}>
                  <Icon name="bell" size={24} />
                </div>
                <strong style={{ display: 'block', fontSize: 15 }}>در انتظار نخستین پاسخ…</strong>
                <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.9 }}>
                  معمولاً نخستین پاسخ‌ها در چند دقیقه می‌رسند. این صفحه را باز نگه دارید.
                </p>
              </section>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {candidates.map((candidate, index) => (
                  <CandidateRow
                    key={candidate.offer_id}
                    candidate={candidate}
                    index={index}
                    busy={busyOffer === candidate.offer_id}
                    onChoose={() => void choose(candidate.offer_id)}
                    onDecline={() => void decline(candidate.offer_id)}
                  />
                ))}
              </div>
            )}

            {error ? <div className="ops-error" role="alert"><span>{error}</span></div> : null}

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button type="button" className="ops-ghost-btn" onClick={() => void cancel()} disabled={canceling}>
                {canceling ? 'در حال لغو…' : 'لغو فراخوان'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {topic ? (
              <>
                <section className="ops-data-surface neon-frame-gold">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 14, background: 'var(--olive-50)', color: 'var(--olive-600)', flex: '0 0 auto' }}>
                      <Icon name="quran" size={21} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ fontSize: 16 }}>{topic.title}</strong>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-2)', marginTop: 3, lineHeight: 1.8 }}>{topic.description}</span>
                    </div>
                    <button type="button" className="ops-ghost-btn" onClick={() => setTopic(null)}>تغییر موضوع</button>
                  </div>
                </section>

                <ModeSelector mode={mode} onChange={setMode} topicTitle={topic.title} />

                {mode === 'broadcast' ? (
                <section className="ops-data-surface neon-frame">
                <strong style={{ fontSize: 13.5, display: 'block', marginBottom: 8 }}>کی می‌خواهید؟</strong>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                  <button type="button" onClick={() => setWhenMode('now')} className={whenMode === 'now' ? 'web-filter-active-chip' : 'web-filter-chip'}>
                    ⚡ در اسرع وقت
                  </button>
                  <button type="button" onClick={() => setWhenMode('later')} className={whenMode === 'later' ? 'web-filter-active-chip' : 'web-filter-chip'}>
                    📅 زمان مشخص
                  </button>
                </div>
                {whenMode === 'later' ? (
                  <input className="input-base"
                    type="datetime-local"
                    value={laterAt}
                    min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                    onChange={(event) => setLaterAt(event.target.value)}
                    dir="ltr"
                    aria-label="زمان جلسه"
                    style={{ width: '100%', maxWidth: 320, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--sand-200)', background: '#fff', fontFamily: 'inherit', marginBottom: 6 }}
                  />
                ) : null}
                <p style={{ margin: '4px 0 14px', fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.8 }}>
                  در «در اسرع وقت» ساعت نهایی با توافق استاد مشخص می‌شود.
                </p>

                <strong style={{ fontSize: 13.5, display: 'block', marginBottom: 8 }}>یادداشت برای اساتید (اختیاری)</strong>
                <textarea className="input-base"
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 300))}
                  rows={2}
                  placeholder="مثلاً: مبتدی هستم، برای شروع کمکم کنید…"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--sand-200)', background: '#fff', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.9 }}
                  aria-label="یادداشت فراخوان"
                />

                {error ? <div className="ops-error" role="alert" style={{ marginTop: 12 }}><span>{error}</span></div> : null}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                  <button type="button" className="ops-primary-btn" onClick={() => void start()} disabled={creating}>
                    {creating ? 'در حال ارسال…' : '🔔 ثبت فراخوان برای اساتید'}
                  </button>
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.8 }}>
                  فراخوان برای همهٔ اساتیدِ تأییدشدهٔ همین موضوع پخش می‌شود و نخستین پاسخ‌ها به‌صورت زنده همین‌جا نمایش داده می‌شود.
                </p>
                </section>
                ) : (
                  <TeacherListMode
                    topic={topic}
                    teachers={list}
                    total={listTotal}
                    loading={listLoading}
                    onSwitchToBroadcast={() => setMode('broadcast')}
                  />
                )}
              </>
            ) : (
              <section className="ops-data-surface">
                <div className="ops-data-head" style={{ marginBottom: 12 }}>
                  <div>
                    <strong>۱. موضوع آموزش را انتخاب کنید</strong>
                    <span style={{ display: 'block', marginTop: 2 }}>از فهرست رسمی خدمات وُدّا — {toFaDigits(catalog.length)} موضوع تأییدشده</span>
                  </div>
                </div>
                <div className="web-search-fields" style={{ marginBottom: 14 }}>
                  <label>
                    <Icon name="search" size={18} />
                    <input className="input-base"
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="جستجو در موضوعات؛ مثلاً تجوید، حفظ، صوت و لحن…"
                      aria-label="جستجوی موضوع"
                    />
                  </label>
                </div>
                {loading ? (
                  <p style={{ color: 'var(--ink-3)', fontSize: 13 }}>در حال دریافت موضوعات…</p>
                ) : (
                  <div style={{ display: 'grid', gap: 16, maxHeight: 560, overflowY: 'auto', paddingLeft: 4 }}>
                    {grouped.map(([category, items]) => (
                      <div key={category}>
                        <strong style={{ display: 'block', fontSize: 12.5, color: 'var(--olive-700)', margin: '2px 0 8px' }}>{category}</strong>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => { setTopic(item); setError(''); }}
                              className="web-topic-row"
                              title={item.description}
                            >
                              <span className="web-topic-icon"><Icon name="book" size={16} /></span>
                              <span style={{ minWidth: 0, flex: 1 }}>
                                <strong>{item.title}</strong>
                              </span>
                              <Icon name="chevronL" size={15} style={{ color: 'var(--ink-4)' }} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function CandidateRow({
  candidate,
  index,
  busy,
  onChoose,
  onDecline,
}: {
  candidate: DispatchCandidateItem;
  index: number;
  busy: boolean;
  onChoose: () => void;
  onDecline: () => void;
}) {
  const badge = TIER_BADGE[candidate.tier];
  return (
    <section className="ops-data-surface" style={{ animationDelay: `${index * 80}ms` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Avatar size={52} ring imageUrl={avatarUrl(candidate.avatar_url, candidate.updated_at)} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 15 }}>{candidate.name}</strong>
            {badge ? (
              <span style={{ fontSize: 10.5, fontWeight: 700, color: badge.color, background: badge.bg, borderRadius: 999, padding: '2px 8px' }}>
                {badge.label}
              </span>
            ) : null}
          </div>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2 }}>
            {candidate.tag || candidate.field}
            {candidate.sessions > 0 ? ` · ${faNumber(candidate.sessions)} جلسه` : ''}
            {candidate.reviews > 0 ? ` · ⭐ ${toFaDigits(candidate.rating.toFixed(1))}` : ''}
            {candidate.city ? ` · ${candidate.city}` : ''}
          </span>
        </div>
        <strong style={{ fontSize: 14, color: 'var(--olive-700)' }}>{toman(candidate.price)} تومان</strong>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        <span className="web-filter-chip">{faNumber(candidate.duration)} دقیقه</span>
        <span className="web-filter-chip">پاسخ سریع</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="ops-ghost-btn" onClick={onDecline} disabled={busy}>رد</button>
        <button type="button" className="ops-primary-btn" onClick={onChoose} disabled={busy}>
          {busy ? 'در حال ثبت…' : 'انتخاب و رزرو این استاد'}
        </button>
      </div>
    </section>
  );
}

function MatchedCard({
  call,
  candidates,
  onNew,
  onCancel,
  canceling,
}: {
  call: DispatchCallItem;
  candidates: DispatchCandidateItem[];
  onNew: () => void;
  onCancel: () => void;
  canceling: boolean;
}) {
  const chosen = candidates.find((item) => item.teacher_id === call.matched_teacher_id);
  return (
    <section className="ops-data-surface neon-frame-gold" style={{ textAlign: 'center', padding: '26px 18px' }}>
      <span style={{ color: 'var(--olive-500)' }}><Icon name="checkCircle" size={40} /></span>
      <h2 style={{ margin: '10px 0 6px', fontSize: 21 }}>جلسه شما رزرو شد 🎉</h2>
      <p style={{ margin: '0 0 16px', color: 'var(--ink-2)', lineHeight: 1.9 }}>
        موضوع «{call.topic_title}»{chosen ? ` با استاد ${chosen.name}` : ''} ثبت شد و در انتظار تأیید نهایی استاد است.
      </p>
      {chosen ? (
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink-2)' }}>
          {toman(chosen.price)} تومان · {whenLabel(call)}
        </p>
      ) : null}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/panel/user/sessions" className="ops-primary-btn" style={{ display: 'inline-flex' }}>پیگیری در جلسات من</Link>
        <button type="button" className="ops-ghost-btn" onClick={onNew}>فراخوان جدید</button>
        <button type="button" className="ops-ghost-btn" onClick={onCancel} disabled={canceling} style={{ color: 'var(--rose)' }}>
          {canceling ? 'در حال لغو…' : 'لغو فراخوان'}</button>
      </div>
    </section>
  );
}

/* ═══ انتخاب شیوه: فراخوان زنده یا فهرست اساتید ═══ */
function ModeSelector({
  mode,
  onChange,
  topicTitle,
}: {
  mode: 'broadcast' | 'list';
  onChange: (mode: 'broadcast' | 'list') => void;
  topicTitle: string;
}) {
  const cards: Array<{
    id: 'broadcast' | 'list';
    icon: Parameters<typeof Icon>[0]['name'];
    title: string;
    badge: string;
    description: string;
    accent: boolean;
  }> = [
    {
      id: 'broadcast',
      icon: 'bell',
      title: 'فراخوان زنده',
      badge: 'ویژهٔ وُدّا',
      description: 'درخواست شما برای همهٔ اساتیدِ این موضوع پخش می‌شود؛ نخستین اساتیدی که اعلام آمادگی کنند دیده می‌شوند و شما یکی را تأیید می‌کنید.',
      accent: true,
    },
    {
      id: 'list',
      icon: 'users',
      title: 'فهرست اساتید',
      badge: 'انتخاب مستقیم',
      description: 'پروفایل اساتیدی که همین موضوع را تدریس می‌کنند را ببینید و بدون انتظار، مستقیم استاد و زمان دلخواه را رزرو کنید.',
      accent: false,
    },
  ];

  return (
    <section aria-label="انتخاب شیوه">
      <strong style={{ display: 'block', fontSize: 14.5, marginBottom: 10 }}>
        ۲. برای موضوع «{topicTitle}» کدام شیوه را می‌پسندید؟
      </strong>
      <div role="radiogroup" aria-label="شیوهٔ ادامه" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
        {cards.map((card) => {
          const active = mode === card.id;
          return (
            <button
              key={card.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(card.id)}
              className={`ops-data-surface dispatch-mode-card${active ? (card.accent ? ' neon-frame' : ' neon-frame-gold') : ''}`}
              style={{
                textAlign: 'right',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: 16,
                background: active ? '#fff' : 'var(--surface)',
                opacity: active ? 1 : 0.82,
                transition: 'opacity .2s ease',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 12, flex: '0 0 auto',
                    background: active ? 'var(--olive-600)' : 'var(--olive-50)', color: active ? '#fff' : 'var(--olive-600)',
                  }}
                >
                  <Icon name={card.icon} size={18} />
                </span>
                <strong style={{ fontSize: 14.5 }}>{card.title}</strong>
                <span
                  style={{
                    fontSize: 10, fontWeight: 800, borderRadius: 999, padding: '2.5px 9px',
                    background: card.accent ? 'var(--gold-bg, #f7efd9)' : 'var(--olive-50)',
                    color: card.accent ? '#8b681f' : '#4c5a36',
                  }}
                >
                  {card.badge}
                </span>
                {active ? (
                  <span style={{ marginInlineStart: 'auto', color: 'var(--olive-600)', display: 'inline-flex' }} aria-hidden="true">
                    <Icon name="checkCircle" size={18} />
                  </span>
                ) : null}
              </span>
              <span style={{ display: 'block', marginTop: 9, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.9 }}>{card.description}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ═══ شیوهٔ فهرست: اساتیدِ همین موضوع برای انتخاب مستقیم ═══ */
function TeacherListMode({
  topic,
  teachers,
  total,
  loading,
  onSwitchToBroadcast,
}: {
  topic: OfficialServiceItem;
  teachers: Teacher[];
  total: number;
  loading: boolean;
  onSwitchToBroadcast: () => void;
}) {
  return (
    <section aria-label="فهرست اساتید موضوع" style={{ display: 'grid', gap: 12 }}>
      <div className="web-results-head">
        <div>
          <small>اساتید موضوع «{topic.title}»</small>
          <strong>{loading ? 'در حال دریافت اساتید…' : `${toFaDigits(total)} استاد یافت شد`}</strong>
        </div>
        <button type="button" onClick={onSwitchToBroadcast} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, color: 'var(--olive-600)' }}>
          <Icon name="bell" size={15} /> کسی مناسب نبود؟ فراخوان بزنید
        </button>
      </div>

      {loading ? (
        <div className="web-search-loading">
          {[0, 1, 2].map((item) => <div key={item} />)}
        </div>
      ) : teachers.length === 0 ? (
        <section className="ops-data-surface" style={{ textAlign: 'center', padding: 24 }}>
          <span style={{ color: 'var(--olive-500)' }}><Icon name="users" size={30} /></span>
          <strong style={{ display: 'block', marginTop: 8, fontSize: 15 }}>هنوز استادی برای این موضوع ثبت‌نام نکرده است</strong>
          <p style={{ margin: '6px 0 14px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.9 }}>
            اشکالی ندارد! فراخوان بزنید تا به‌محض ثبت‌نام یا آنلاین‌شدن اساتیدِ این موضوع، درخواست شما به آن‌ها اعلام شود.
          </p>
          <button type="button" className="ops-primary-btn" style={{ display: 'inline-flex' }} onClick={onSwitchToBroadcast}>
            🔔 رفتن به شیوهٔ فراخوان زنده
          </button>
        </section>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {teachers.map((teacher, index) => (
            <ListTeacherRow key={teacher.id} teacher={teacher} index={index} />
          ))}
        </div>
      )}
    </section>
  );
}

function ListTeacherRow({ teacher, index }: { teacher: Teacher; index: number }) {
  const price = Math.max(0, teacher.price30 || teacher.services?.[0]?.price || 0);
  const badge = TIER_BADGE[teacher.tier ?? ''];
  return (
    <Link
      href={`/teachers/${teacher.id}`}
      className="ops-data-surface"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        color: 'inherit', textDecoration: 'none', animationDelay: `${index * 60}ms`,
      }}
    >
      <Avatar size={50} ring tier={teacher.tier} imageUrl={avatarUrl(teacher.user?.avatar_url, teacher.user?.updated_at)} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14.5 }}>{teacher.user?.name || 'استاد وُدّا'}</strong>
          {badge ? (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: badge.color, background: badge.bg, borderRadius: 999, padding: '2px 8px' }}>
              {badge.label}
            </span>
          ) : null}
        </div>
        <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>
          {teacher.tag || teacher.field}
          {teacher.sessions > 0 ? ` · ${toFaDigits(teacher.sessions)} جلسه` : ''}
          {teacher.reviews > 0 ? ` · ⭐ ${toFaDigits(teacher.rating.toFixed(1))}` : ''}
          {teacher.city ? ` · ${teacher.city}` : ''}
        </span>
      </div>
      <strong style={{ fontSize: 13.5, color: 'var(--olive-700)' }}>
        {price > 0 ? `${toman(price)} تومان` : 'مشاهده خدمات'}
      </strong>
      <span className="web-search-card-cta">پروفایل و رزرو <Icon name="arrowL" size={14} /></span>
    </Link>
  );
}
