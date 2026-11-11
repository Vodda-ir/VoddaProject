'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { PanelButton, PanelEmpty, PanelPageHeader, PanelStatus } from '@/components/panel/PanelUI';
import { api, toman } from '@/lib/api';
import type { TeacherInboxData } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toFaDigits } from '@/lib/persian';

function countdown(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function remaining(expiresAt: string) {
  const at = new Date(expiresAt).getTime();
  if (Number.isNaN(at)) return 0;
  return Math.max(0, Math.round((at - Date.now()) / 1000));
}

function whenLabel(call: { flexible: boolean; scheduled_at?: string | null }) {
  if (call.flexible || !call.scheduled_at) return '⚡ در اسرع وقت';
  const at = new Date(call.scheduled_at);
  if (Number.isNaN(at.getTime())) return '⚡ در اسرع وقت';
  return `📅 ${at.toLocaleString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`;
}

export default function TeacherDispatchPanel() {
  const token = getToken();
  const [inbox, setInbox] = useState<TeacherInboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const pollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const response = await api.dispatchInbox(token);
      setInbox(response.data ?? null);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'دریافت فراخوان‌ها ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
    pollRef.current = window.setInterval(() => {
      void load();
      setTick((value) => value + 1);
    }, 4000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [load]);

  async function accept(callId: number) {
    if (!token || busyId !== null) return;
    setBusyId(callId);
    setError('');
    try {
      await api.dispatchAccept(token, callId);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'اعلام آمادگی انجام نشد.');
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(callId: number) {
    if (!token || busyId !== null) return;
    setBusyId(callId);
    setError('');
    try {
      await api.dispatchRejectCall(token, callId);
      setInbox((prev) => (prev ? { ...prev, calls: prev.calls.filter((item) => item.call.id !== callId) } : prev));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'رد فراخوان انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  async function withdraw(offerId: number) {
    if (!token || busyId !== null) return;
    setBusyId(offerId);
    setError('');
    try {
      await api.dispatchWithdraw(token, offerId);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'انصراف انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  const openCalls = inbox?.calls ?? [];
  const myOffers = (inbox?.offers ?? []).filter((offer) => offer.status === 'waiting' || offer.status === 'chosen');

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="فراخوان اساتید"
        title="فراخوان‌های زنده تدریس"
        description="درخواست‌های لحظه‌ای کاربران در موضوع‌هایی که شما تدریس می‌کنید. نخستین استادهایی که اعلام آمادگی کنند برای کاربر نمایش داده می‌شوند."
        actions={<PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>}
      />

      <div className="ops-inline-note" style={{ marginBottom: 14 }}>
        <Icon name="info" size={16} />
        <span>
          {loading
            ? 'در حال دریافت فراخوان‌ها…'
            : openCalls.length
              ? `${toFaDigits(openCalls.length)} فراخوان باز در موضوع‌های شماست.`
              : 'فعلاً فراخوانی باز نیست — این صفحه به‌صورت زنده به‌روزرسانی می‌شود.'}
          {tick > -1 ? '' : ''}
        </span>
      </div>

      {error ? <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton></div> : null}

      <section className="ops-data-surface">
        <div className="ops-data-head">
          <div>
            <strong>در انتظار پاسخ</strong>
            <span style={{ display: 'block', marginTop: 2 }}>با پذیرش، پروفایل و قیمت شما برای کاربر ارسال می‌شود.</span>
          </div>
          <PanelStatus status={openCalls.length ? 'pending' : 'approved'}>{openCalls.length ? `${toFaDigits(openCalls.length)} باز` : 'بدون فراخوان'}</PanelStatus>
        </div>

        {!loading && openCalls.length === 0 ? (
          <PanelEmpty
            icon="bell"
            title="فعلاً فراخوانی نیست"
            description="به‌محض ثبت فراخوان در موضوع‌های تدریس شما، همین‌جا نمایش داده می‌شود."
          />
        ) : (
          <div style={{ display: 'grid', gap: 12, paddingTop: 12 }}>
            {openCalls.map(({ call }) => (
              <div
                key={call.id}
                style={{
                  border: '1.4px solid var(--olive-200, #c9f0dc)',
                  borderRadius: 16,
                  padding: 14,
                  display: 'grid',
                  gap: 10,
                  background: '#fff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 13, background: 'var(--olive-50)', color: 'var(--olive-600)', flex: '0 0 40px' }}>
                    <Icon name="quran" size={19} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong style={{ display: 'block', fontSize: 14.5 }}>{call.topic_title}</strong>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{whenLabel(call)}</span>
                  </div>
                  <strong dir="ltr" style={{ fontSize: 13.5, color: 'var(--olive-700)', fontVariantNumeric: 'tabular-nums' }}>
                    {countdown(remaining(call.expires_at))}
                  </strong>
                </div>
                {call.note ? (
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-2)', background: 'var(--sand-50)', borderRadius: 11, padding: '8px 11px', lineHeight: 1.9 }}>
                    «{call.note}»
                  </p>
                ) : null}
                <div style={{ display: 'flex', gap: 8 }}>
                  <PanelButton tone="danger" icon="x" disabled={busyId === call.id} onClick={() => void reject(call.id)}>رد</PanelButton>
                  <PanelButton tone="success" icon="check" disabled={busyId === call.id} onClick={() => void accept(call.id)}>
                    {busyId === call.id ? 'در حال ثبت…' : '🤝 اعلام آمادگی'}
                  </PanelButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {myOffers.length ? (
        <section className="ops-data-surface" style={{ marginTop: 16 }}>
          <div className="ops-data-head">
            <div>
              <strong>پاسخ‌های من</strong>
              <span style={{ display: 'block', marginTop: 2 }}>وضعیت پاسخ‌هایی که ثبت کرده‌اید.</span>
            </div>
            <PanelStatus status={myOffers.some((offer) => offer.status === 'chosen') ? 'approved' : 'pending'}>
              {myOffers.some((offer) => offer.status === 'chosen') ? 'انتخاب شدید 🎉' : 'در انتظار کاربر'}
            </PanelStatus>
          </div>
          <div style={{ display: 'grid', gap: 10, paddingTop: 12 }}>
            {myOffers.map((offer) => (
              <div key={offer.id} style={{ border: '1px solid var(--sand-200)', borderRadius: 14, padding: 13, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: offer.status === 'chosen' ? 'var(--olive-50)' : '#fff' }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: '0 0 34px',
                    background: offer.status === 'chosen' ? 'var(--olive-600)' : 'var(--gold-bg, #f7efd9)',
                    color: offer.status === 'chosen' ? '#fff' : '#8b681f',
                  }}
                >
                  <Icon name={offer.status === 'chosen' ? 'checkCircle' : 'clock'} size={17} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ display: 'block', fontSize: 13.5 }}>{offer.call?.topic_title ?? 'فراخوان'}</strong>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                    {toman(offer.service_price)} تومان · {toFaDigits(offer.service_duration)} دقیقه
                  </span>
                </div>
                {offer.status === 'chosen' ? (
                  <PanelStatus status="approved">کاربر شما را انتخاب کرد — در «درخواست‌ها» تأیید کنید</PanelStatus>
                ) : offer.call?.status === 'searching' ? (
                  <>
                    <PanelStatus status="pending">در انتظار انتخاب کاربر</PanelStatus>
                    <PanelButton icon="x" disabled={busyId === offer.id} onClick={() => void withdraw(offer.id)}>انصراف</PanelButton>
                  </>
                ) : (
                  <PanelStatus status="rejected">بسته شد</PanelStatus>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
