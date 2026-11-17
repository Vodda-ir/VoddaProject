'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelMetric,
  PanelPageHeader,
  PanelStatus,
} from '@/components/panel/PanelUI';
import { SearchInput, exportCsv } from '@/components/admin/AdminUI';
import { api, type SessionListItem } from '@/lib/api';
import { fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

type TabKey = 'all' | 'upcoming' | 'past';

type Row = SessionListItem & { when: 'upcoming' | 'past' };

const STATUS_META: Record<string, { status: 'pending' | 'approved' | 'done' | 'canceled'; label: string }> = {
  pending: { status: 'pending', label: 'در انتظار تأیید استاد' },
  confirmed: { status: 'approved', label: 'تأییدشده' },
  done: { status: 'done', label: 'برگزارشده' },
  canceled: { status: 'canceled', label: 'لغوشده' },
  awaiting_payment: { status: 'pending', label: 'در انتظار پرداخت' },
};

export default function UserSessionsPage() {
  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [upcoming, setUpcoming] = useState<Row[]>([]);
  const [past, setPast] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reviewFor, setReviewFor] = useState<SessionListItem | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [upcomingResponse, pastResponse] = await Promise.all([
        api.mySessions(token, 'upcoming'),
        api.mySessions(token, 'past'),
      ]);
      setUpcoming(((upcomingResponse.data || []) as Row[]).map((row) => ({ ...row, when: 'upcoming' as const })));
      setPast(((pastResponse.data || []) as Row[]).map((row) => ({ ...row, when: 'past' as const })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'جلسات دریافت نشدند.');
      setUpcoming([]);
      setPast([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function cancelSession(session: SessionListItem) {
    if (!token || busyId !== null) return;
    if (!window.confirm('جلسه لغو شود؟ لغو فقط پیش از زمان شروع مجاز است و مبلغ به کیف پول بازمی‌گردد.')) return;
    setBusyId(session.id);
    setError('');
    try {
      await api.cancelSession(token, session.id);
      setUpcoming((items) => items.map((item) => item.id === session.id ? { ...item, status: 'canceled' } : item));
      setPast((items) => items.map((item) => item.id === session.id ? { ...item, status: 'canceled' } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'لغو جلسه انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  async function paySession(session: SessionListItem) {
    if (!token || busyId !== null) return;
    setBusyId(session.id);
    setError('');
    try {
      const response = await api.paySession(token, session.id);
      window.location.href = response.data.redirect_url;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'شروع پرداخت انجام نشد.');
      setBusyId(null);
    }
  }

  function markRated(sessionId: number) {
    setUpcoming((items) => items.map((item) => item.id === sessionId ? { ...item, rated: true } : item));
    setPast((items) => items.map((item) => item.id === sessionId ? { ...item, rated: true } : item));
  }

  const rows = useMemo(() => {
    const base = tab === 'upcoming' ? upcoming : tab === 'past' ? past : [...upcoming, ...past];
    const needle = query.trim();
    const filtered = needle
      ? base.filter((row) =>
          (row.teacher?.user?.name || '').includes(needle) ||
          (row.service || '').includes(needle) ||
          (row.local_date || '').includes(needle))
      : base;
    return [...filtered].sort((left, right) => {
      if (left.when !== right.when) return left.when === 'upcoming' ? -1 : 1;
      return left.when === 'upcoming'
        ? left.scheduled_at.localeCompare(right.scheduled_at)
        : right.scheduled_at.localeCompare(left.scheduled_at);
    });
  }, [tab, query, upcoming, past]);

  const counts = useMemo(() => ({
    all: upcoming.length + past.length,
    upcoming: upcoming.length,
    past: past.length,
    pending: upcoming.filter((row) => row.status === 'pending').length,
    confirmed: upcoming.filter((row) => row.status === 'confirmed').length,
    done: past.filter((row) => row.status === 'done').length,
    canceled: past.filter((row) => row.status === 'canceled').length,
    rated: past.filter((row) => row.rated).length,
  }), [upcoming, past]);

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="مسیر یادگیری"
        title="جلسات من"
        description="زمان رسمی جلسات، وضعیت درخواست‌ها، ورود به کلاس آنلاین و نتیجه مالی هر جلسه."
        actions={
          <>
            <PanelButton
              icon="download"
              onClick={() => {
                if (!rows.length) return;
                exportCsv(
                  'vodda-my-sessions',
                  ['شناسه', 'استاد', 'خدمت', 'تاریخ', 'ساعت شروع', 'مدت (دقیقه)', 'قیمت (تومان)', 'وضعیت'],
                  rows.map((row) => [
                    row.id,
                    row.teacher?.user?.name || '',
                    row.service || '',
                    row.local_date || '',
                    row.local_start || '',
                    row.duration,
                    row.price,
                    STATUS_META[row.status]?.label ?? row.status,
                  ]),
                );
              }}
            >
              خروجی CSV
            </PanelButton>
            <PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>
            <Link href="/panel/user/book" className="ops-button" data-tone="primary"><Icon name="plus" size={15} /> رزرو جدید</Link>
          </>
        }
      />

      {error && (
        <div className="ops-error" role="alert">
          <span>{error}</span>
          <PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton>
        </div>
      )}

      <div className="ops-metric-grid">
        <PanelMetric icon="clock" label="در انتظار تأیید" value={loading ? '—' : toFaDigits(counts.pending)} hint="نیازمند تأیید استاد" tone={counts.pending ? 'clay' : 'olive'} />
        <PanelMetric icon="video" label="تأییدشده پیش‌رو" value={loading ? '—' : toFaDigits(counts.confirmed)} hint="آماده ورود به کلاس" tone="info" />
        <PanelMetric icon="checkCircle" label="برگزارشده" value={loading ? '—' : toFaDigits(counts.done)} hint={`${toFaDigits(counts.rated)} نظر ثبت کرده‌اید`} tone="olive" />
        <PanelMetric icon="x" label="لغوشده" value={loading ? '—' : toFaDigits(counts.canceled)} hint="مبلغ لغوها به کیف پول برگشته است" tone="gold" />
      </div>

      <section className="ops-section-card">
        <div className="adm-toolbar">
          <div className="adm-tabs" role="tablist" aria-label="نوع جلسات">
            {([
              { value: 'all', label: 'همه' },
              { value: 'upcoming', label: 'پیش‌رو' },
              { value: 'past', label: 'گذشته' },
            ] as Array<{ value: TabKey; label: string }>).map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={tab === item.value}
                className="adm-tab"
                data-active={tab === item.value ? 'true' : undefined}
                onClick={() => setTab(item.value)}
              >
                {item.label}
                <span className="adm-tab-count">{toFaDigits(counts[item.value])}</span>
              </button>
            ))}
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder="جستجوی استاد، خدمت یا تاریخ…" />
        </div>

        {loading ? (
          <div style={{ padding: 18, display: 'grid', gap: 10 }}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="adm-skeleton" style={{ height: 74, borderRadius: 16 }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <PanelEmpty
            icon="calendar"
            title={query ? 'نتیجه‌ای برای جستجو پیدا نشد' : 'جلسه‌ای در این بخش وجود ندارد'}
            description={query ? 'عبارت دیگری را امتحان کنید یا فیلتر را بردارید.' : 'اولین جلسه یادگیری‌تان را همین حالا رزرو کنید.'}
            action={!query && <Link href="/panel/user/book" className="ops-button" data-tone="primary">رزرو جلسه</Link>}
          />
        ) : (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((session) => (
              <article className="ops-row" key={`${session.when}-${session.id}`} style={{ opacity: busyId === session.id ? .55 : 1, flexWrap: 'wrap' }}>
                <Avatar size={46} ring tier={session.teacher?.tier} imageUrl={fullUrl(session.teacher?.user?.avatar_url)} />
                <div className="ops-row-main">
                  <div className="ops-row-title">
                    <strong>{session.teacher?.user?.name || 'استاد'}</strong>
                    <PanelStatus status={STATUS_META[session.status]?.status ?? 'pending'}>
                      {STATUS_META[session.status]?.label ?? session.status}
                    </PanelStatus>
                  </div>
                  <div className="ops-row-sub">
                    <span>{session.service}</span>
                    <span>· {session.local_date}</span>
                    <span>· ساعت {toFaDigits(session.local_start)} تا {toFaDigits(session.local_end)}</span>
                  </div>
                  <div className="ops-row-meta">
                    <span>{toFaDigits(session.duration)} دقیقه</span>
                    <span>{formatFaNumber(session.price)} تومان</span>
                    {session.when === 'past' && session.rated && <span><Icon name="star" size={11} fill style={{ color: 'var(--gold)' }} /> نظر ثبت شده</span>}
                  </div>
                  {session.reject_note && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--clay)', background: 'var(--clay-bg)', borderRadius: 9, padding: '5px 10px', display: 'inline-block' }}>
                      دلیل لغو: {session.reject_note}
                    </div>
                  )}
                  {session.status === 'pending' && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 7, padding: '6px 10px', borderRadius: 9, background: 'var(--gold-bg)', color: '#8d6d1f', fontSize: 11 }}>
                      <Icon name="clock" size={13} /> در انتظار پاسخ استاد
                    </div>
                  )}
                  {session.status === 'awaiting_payment' && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 7, padding: '6px 10px', borderRadius: 9, background: 'var(--gold-bg)', color: '#8d6d1f', fontSize: 11 }}>
                      <Icon name="clock" size={13} /> پرداخت آنلاین تکمیل نشده؛ با تکمیل پرداخت، درخواست برای استاد ارسال می‌شود
                    </div>
                  )}
                </div>
                <div className="ops-row-actions">
                  {session.status === 'done' && !session.rated && (
                    <PanelButton tone="primary" icon="star" disabled={busyId === session.id} onClick={() => setReviewFor(session)}>
                      ثبت نظر
                    </PanelButton>
                  )}
                  {session.status === 'confirmed' && (
                    <Link href={`/panel/live/${session.id}`}><PanelButton tone="primary" icon="video">ورود به کلاس</PanelButton></Link>
                  )}
                  {session.status === 'awaiting_payment' && (
                    <PanelButton tone="primary" icon="wallet" disabled={busyId === session.id} onClick={() => void paySession(session)}>
                      {busyId === session.id ? 'در حال انتقال…' : 'تکمیل پرداخت'}
                    </PanelButton>
                  )}
                  {(session.status === 'pending' || session.status === 'confirmed') && (
                    <PanelButton tone="danger" icon="x" disabled={busyId === session.id} onClick={() => void cancelSession(session)}>
                      {busyId === session.id ? 'در حال لغو…' : 'لغو'}
                    </PanelButton>
                  )}
                  {session.status === 'done' && <Link href={`/teachers/${session.teacher_id}`} className="ops-button">پروفایل استاد</Link>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {reviewFor && (
        <ReviewDialog
          session={reviewFor}
          onRated={() => markRated(reviewFor.id)}
          onClose={() => setReviewFor(null)}
        />
      )}
    </main>
  );
}

function ReviewDialog({
  session,
  onRated,
  onClose,
}: {
  session: SessionListItem;
  onRated: () => void;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const token = getToken();

  async function submit() {
    if (!token) return setError('برای ثبت نظر دوباره وارد شوید.');
    if (rating < 1) return setError('لطفاً امتیاز خود را با ستاره‌ها انتخاب کنید.');
    if (text.length > 1000) return setError('متن نظر حداکثر ۱۰۰۰ کاراکتر است.');
    setSaving(true);
    setError('');
    try {
      await api.rateSession(token, { session_id: session.id, rating, text: text.trim() });
      onRated();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت نظر انجام نشد.');
      setSaving(false);
    }
  }

  return (
    <div role="presentation" style={overlayStyle} onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" onClick={(event) => event.stopPropagation()} style={dialogStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 12, color: 'var(--gold)', background: 'var(--gold-bg)' }}><Icon name="star" size={19} /></span>
          <div>
            <h2 id="review-dialog-title" style={{ margin: 0, fontSize: 16 }}>ثبت نظر درباره جلسه</h2>
            <p style={{ margin: '2px 0 0', color: 'var(--ink-3)', fontSize: 10.5 }}>{session.service} · {session.teacher?.user?.name || 'استاد'} · {session.local_date}</p>
          </div>
        </div>

        <div style={{ margin: '16px 0 6', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)' }}>به این جلسه چه امتیازی می‌دهید؟</div>
        <div role="radiogroup" aria-label="امتیاز از ۵" style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '10px 0 4px' }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} ستاره`}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(value)}
              style={{ border: 0, background: 'none', cursor: 'pointer', padding: 4, color: value <= (hover || rating) ? 'var(--gold)' : 'var(--sand-200)', transition: 'color .15s' }}
            >
              <Icon name="star" size={34} fill={value <= (hover || rating)} />
            </button>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--olive-700)', minHeight: 18 }}>
          {rating === 5 ? 'عالی بود!' : rating === 4 ? 'خوب بود' : rating === 3 ? 'متوسط بود' : rating === 2 ? 'ضعیف بود' : rating === 1 ? 'خیلی بد بود' : ''}
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12, fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)' }}>
          متن نظر (اختیاری)
          <textarea className="input-base"
            value={text}
            maxLength={1000}
            rows={4}
            placeholder="تجربه‌ات از این جلسه را بنویس…"
            onChange={(event) => setText(event.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 11, border: '1px solid var(--sand-200)', color: 'var(--ink)', background: '#fff', fontFamily: 'inherit', resize: 'vertical' }}
          />
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink-3)', textAlign: 'left' }}>{faDigits(text.length)} / {faDigits(1000)}</span>
        </label>

        {error && <div role="alert" style={{ marginTop: 4, color: 'var(--rose)', background: 'var(--clay-bg)', padding: 10, borderRadius: 10, fontSize: 12 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <PanelButton disabled={saving} onClick={onClose}>انصراف</PanelButton>
          <PanelButton tone="primary" icon="star" disabled={saving} onClick={() => void submit()}>{saving ? 'در حال ثبت…' : 'ثبت نظر'}</PanelButton>
        </div>
      </section>
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(0,0,0,.42)' };
const dialogStyle: React.CSSProperties = { width: 440, maxWidth: '100%', background: '#fff', borderRadius: 20, padding: 22, boxShadow: 'var(--sh-lg)' };
