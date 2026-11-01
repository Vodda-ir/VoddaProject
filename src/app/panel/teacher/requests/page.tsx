'use client';

import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
  PanelStatus,
} from '@/components/panel/PanelUI';
import { api, type SessionListItem } from '@/lib/api';
import { fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

export default function TeacherRequests() {
  const [requests, setRequests] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.teacherSessions(token, 'pending');
      setRequests(response.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'درخواست‌های جلسه دریافت نشدند.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function respond(session: SessionListItem, approve: boolean) {
    if (!token || busyId !== null) return;
    const action = approve ? 'تأیید' : 'رد';
    if (!window.confirm(`درخواست جلسهٔ ${session.learner?.name || 'قرآن‌آموز'} ${action} شود؟`)) return;
    setBusyId(session.id);
    setError('');
    try {
      if (approve) await api.teacherAcceptSession(token, session.id);
      else await api.teacherRejectSession(token, session.id);
      setRequests((items) => items.filter((item) => item.id !== session.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${action} درخواست انجام نشد.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="صف پاسخ"
        title="درخواست‌های جلسه"
        description="درخواست‌های جدید را با زمان، خدمت و مبلغ کامل بررسی کنید و فقط پس از اطمینان از امکان برگزاری پاسخ دهید."
        actions={<PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>}
      />

      <div className="ops-inline-note" style={{ marginBottom: 14 }}>
        <Icon name="info" size={16} />
        <span>{loading ? 'در حال دریافت درخواست‌ها…' : `${toFaDigits(requests.length)} درخواست در انتظار پاسخ شماست.`}</span>
      </div>

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton></div>}

      <section className="ops-data-surface">
        <div className="ops-data-head">
          <div>
            <strong>درخواست‌های pending</strong>
            <span style={{ display: 'block', marginTop: 2 }}>تأیید، جلسه را وارد برنامه پیش‌رو می‌کند.</span>
          </div>
          <PanelStatus status={requests.length ? 'pending' : 'approved'}>{requests.length ? 'نیازمند پاسخ' : 'صف خالی'}</PanelStatus>
        </div>

        {loading ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال بارگذاری درخواست‌ها…</div>
        ) : requests.length === 0 ? (
          <PanelEmpty icon="checkCircle" title="درخواستی در انتظار نیست" description="در حال حاضر همه درخواست‌های جلسه تعیین تکلیف شده‌اند." />
        ) : (
          requests.map((session) => {
            const busy = busyId === session.id;
            return (
              <article className="ops-row" key={session.id} style={{ opacity: busy ? .55 : 1 }}>
                <Avatar size={46} imageUrl={fullUrl(session.learner?.avatar_url)} />
                <div className="ops-row-main">
                  <div className="ops-row-title">
                    <strong>{session.learner?.name || 'قرآن‌آموز'}</strong>
                    <PanelStatus status="pending">در انتظار پاسخ</PanelStatus>
                  </div>
                  <div className="ops-row-sub">
                    <span>{session.service || 'خدمت'}</span>
                    <span>· {toFaDigits(session.duration)} دقیقه</span>
                  </div>
                  <div className="ops-row-meta">
                    <span><Icon name="calendar" size={13} />{session.local_date}</span>
                    <span><Icon name="clock" size={13} />{toFaDigits(session.local_start)} تا {toFaDigits(session.local_end)}</span>
                    <span>{formatFaNumber(session.price)} تومان</span>
                  </div>
                  {session.note && (
                    <div className="ops-inline-note" style={{ marginTop: 9, width: 'fit-content', maxWidth: '100%' }}>
                      <Icon name="message" size={14} /><span>{session.note}</span>
                    </div>
                  )}
                </div>
                <div className="ops-row-actions">
                  <PanelButton tone="danger" icon="x" disabled={busy} onClick={() => void respond(session, false)}>رد درخواست</PanelButton>
                  <PanelButton tone="success" icon="check" disabled={busy} onClick={() => void respond(session, true)}>
                    {busy ? 'در حال ثبت…' : 'تأیید جلسه'}
                  </PanelButton>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
