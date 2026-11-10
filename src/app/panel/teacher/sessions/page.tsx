'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function TeacherSessionsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.teacherSessions(token, tab);
      setSessions(response.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'جلسات استاد دریافت نشدند.');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [tab, token]);

  useEffect(() => { void load(); }, [load]);

  async function complete(session: SessionListItem) {
    if (!token || busyId !== null) return;
    if (!window.confirm('جلسه برگزار شده و تسویهٔ درآمد انجام شود؟ این عملیات فقط پس از پایان زمان جلسه مجاز است.')) return;
    setBusyId(session.id);
    setError('');
    try {
      await api.teacherCompleteSession(token, session.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تکمیل جلسه انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="برنامه آموزشی"
        title="جلسات من"
        description="جلسات پیش‌رو و سوابق برگزارشده یا لغوشده را با زمان رسمی و وضعیت مالی مشاهده کنید."
        actions={<PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>}
      />

      <div className="ops-filter-tabs" role="tablist" aria-label="نوع جلسات" style={{ marginBottom: 14 }}>
        <button type="button" role="tab" aria-selected={tab === 'upcoming'} onClick={() => setTab('upcoming')}>پیش‌رو</button>
        <button type="button" role="tab" aria-selected={tab === 'past'} onClick={() => setTab('past')}>گذشته</button>
      </div>

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton></div>}

      <section className="ops-data-surface">
        <div className="ops-data-head">
          <div>
            <strong>{tab === 'upcoming' ? 'جلسات پیش‌رو' : 'سابقه جلسات'}</strong>
            <span style={{ display: 'block', marginTop: 2 }}>{loading ? 'در حال دریافت…' : `${toFaDigits(sessions.length)} مورد`}</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال بارگذاری جلسات…</div>
        ) : sessions.length === 0 ? (
          <PanelEmpty icon="calendar" title={tab === 'upcoming' ? 'جلسه پیش‌رویی وجود ندارد' : 'سابقه‌ای در این بخش وجود ندارد'} />
        ) : (
          sessions.map((session) => {
            const busy = busyId === session.id;
            return (
              <article className="ops-row" key={session.id} style={{ opacity: busy ? .55 : 1 }}>
                <Avatar size={46} imageUrl={fullUrl(session.learner?.avatar_url)} />
                <div className="ops-row-main">
                  <div className="ops-row-title">
                    <strong>{session.learner?.name || 'قرآن‌آموز'}</strong>
                    <PanelStatus status={statusTone(session.status)}>{statusLabel(session.status)}</PanelStatus>
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
                  {session.reject_note && <div style={{ marginTop: 7, color: 'var(--clay)', fontSize: 10.5 }}>دلیل لغو: {session.reject_note}</div>}
                </div>
                {session.status === 'confirmed' && (
                  <div className="ops-row-actions">
                    <Link href={`/panel/live/${session.id}`} style={{ display: 'inline-flex' }}>
                      <PanelButton tone="primary" icon="video">
                        ورود به کلاس آنلاین
                      </PanelButton>
                    </Link>
                    <PanelButton tone="success" icon="checkCircle" disabled={busy} onClick={() => void complete(session)}>
                      {busy ? 'در حال ثبت…' : 'ثبت برگزاری'}
                    </PanelButton>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

function statusLabel(status: SessionListItem['status']) {
  if (status === 'confirmed') return 'تأییدشده';
  if (status === 'done') return 'برگزارش‌شده';
  if (status === 'canceled') return 'لغوشده';
  return 'در انتظار';
}

function statusTone(status: SessionListItem['status']): 'approved' | 'done' | 'canceled' | 'pending' {
  if (status === 'confirmed') return 'approved';
  if (status === 'done') return 'done';
  if (status === 'canceled') return 'canceled';
  return 'pending';
}
