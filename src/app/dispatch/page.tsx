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
} from '@/lib/api';
import { fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

type Phase = 'idle' | 'searching' | 'matched';

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
  return `📅 ${at.toLocaleString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`;
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
      const scheduledAt = whenMode === 'later' && laterAt ? new Date(laterAt).toISOString() : undefined;
      const created = await api.dispatchCreate(token, {
        official_service_id: topic.id,
        note: note.trim(),
        flexible: whenMode === 'now',
        scheduled_at: scheduledAt,
      });
      setView(created.data ?? null);
    } catch (cause) {
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

  const candidates = view?.candidates ?? [];

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <PublicPageHero
        kicker="فراخوان اساتید"
        title="موضوع را بگو؛ اساتید اعلام آمادگی کنند، شما انتخاب کنید"
        description="درخواست شما بین همهٔ اساتید آن موضوع به‌صورت زنده پخش می‌شود؛ نخستین استادهایی که اعلام آمادگی کنند، همین‌جا دیده می‌شوند و شما یکی را تأیید می‌کنید تا جلسه رزرو شود."
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
          <MatchedCard call={call} candidates={candidates} onNew={() => setView({ call: null, candidates: [] })} />
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

                <div style={{ height: 1, background: 'var(--sand-150)', margin: '14px 0' }} />

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
                  <input
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
                <textarea
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
                  <Link href={`/search?official_service_id=${topic.id}`} className="ops-ghost-btn" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    یا دیدن اساتید همین موضوع
                  </Link>
                </div>
              </section>
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
                    <input
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
        <Avatar size={52} ring imageUrl={fullUrl(candidate.avatar_url)} />
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
}: {
  call: DispatchCallItem;
  candidates: DispatchCandidateItem[];
  onNew: () => void;
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
      </div>
    </section>
  );
}
