'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelMetric,
  PanelPageHeader,
  PanelSection,
  PanelStatus,
} from '@/components/panel/PanelUI';
import { api, type SessionListItem, type Teacher } from '@/lib/api';
import { avatarUrl, fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [wallet, setWallet] = useState(0);
  const [pending, setPending] = useState<SessionListItem[]>([]);
  const [upcoming, setUpcoming] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [meResponse, teacherResponse, pendingResponse, upcomingResponse] = await Promise.all([
        api.me(token),
        api.teacherMe(token),
        api.teacherSessions(token, 'pending'),
        api.teacherSessions(token, 'upcoming'),
      ]);
      setWallet(Number(meResponse.data.wallet) || 0);
      setTeacher(teacherResponse.data);
      setPending(pendingResponse.data || []);
      setUpcoming(upcomingResponse.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'اطلاعات داشبورد استاد دریافت نشد.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function respond(session: SessionListItem, approve: boolean) {
    if (!token || busyId !== null) return;
    const action = approve ? 'تأیید' : 'رد';
    if (!window.confirm(`درخواست این جلسه ${action} شود؟`)) return;
    setBusyId(session.id);
    setError('');
    try {
      if (approve) await api.teacherAcceptSession(token, session.id);
      else await api.teacherRejectSession(token, session.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${action} جلسه انجام نشد.`);
    } finally {
      setBusyId(null);
    }
  }

  const confirmedUpcoming = useMemo(
    () => upcoming.filter((session) => session.status === 'confirmed'),
    [upcoming],
  );

  const profileStatus = teacher?.status || 'pending';
  const servicesCount = teacher?.services?.length || 0;

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="فضای کاری استاد"
        title="داشبورد استاد"
        description="درخواست‌های جدید، جلسه‌های پیش‌رو، وضعیت پروفایل و درآمد قابل برداشت را از یک نمای متمرکز مدیریت کنید."
        actions={<PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>}
      />

      {error && (
        <div className="ops-error" role="alert">
          <span>{error}</span>
          <PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton>
        </div>
      )}

      <section style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) auto',
        gap: 18,
        alignItems: 'center',
        marginBottom: 18,
        padding: '20px 22px',
        border: '1px solid var(--sand-150)',
        borderRadius: 20,
        background: 'linear-gradient(120deg,#fff,var(--olive-50))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <Avatar size={58} ring tier={teacher?.tier} imageUrl={avatarUrl(teacher?.user?.avatar_url, teacher?.user?.updated_at)} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 16 }}>{teacher?.user?.name || 'استاد وُدّا'}</strong>
              <PanelStatus status={profileTone(profileStatus)}>{profileLabel(profileStatus)}</PanelStatus>
            </div>
            <div style={{ marginTop: 4, color: 'var(--olive-700)', fontSize: 11.5, fontWeight: 700 }}>
              {teacher?.tag || teacher?.field || 'پروفایل استادی'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 7, color: 'var(--ink-3)', fontSize: 10 }}>
              {teacher?.city && <span><Icon name="pin" size={12} /> {teacher.city}</span>}
              <span>{servicesCount > 0 ? `${toFaDigits(servicesCount)} خدمت` : 'بدون خدمت ثبت‌شده'}</span>
              <span>{teacher?.available ? 'رزرو فعال' : 'رزرو غیرفعال'}</span>
            </div>
          </div>
        </div>
        {teacher?.status === 'approved' && (
          <Link href={`/teachers/${teacher.id}`} target="_blank" className="ops-button">
            <Icon name="user" size={16} /> پروفایل عمومی
          </Link>
        )}
      </section>

      <div className="ops-metric-grid">
        <PanelMetric icon="wallet" label="موجودی قابل برداشت" value={loading ? '—' : `${formatFaNumber(wallet)} ت`} hint="موجودی فعلی حساب" />
        <PanelMetric icon="message" label="درخواست جدید" value={loading ? '—' : toFaDigits(pending.length)} hint="نیازمند پاسخ شما" tone={pending.length ? 'clay' : 'olive'} />
        <PanelMetric icon="calendar" label="جلسات تأییدشده پیش‌رو" value={loading ? '—' : toFaDigits(confirmedUpcoming.length)} hint="بدون احتساب pending" tone="info" />
        <PanelMetric icon="star" label="امتیاز" value={teacher && teacher.reviews > 0 ? toFaDigits(teacher.rating.toFixed(1)) : '—'} hint={`${toFaDigits(teacher?.reviews || 0)} نظر ثبت‌شده`} tone="gold" />
      </div>

      <div className="ops-two-column">
        <PanelSection
          title="درخواست‌های نیازمند پاسخ"
          description="درخواست‌های pending را تأیید یا رد کنید تا وضعیت جلسه مشخص شود."
          action={<Link href="/panel/teacher/requests" className="ops-button">مشاهده همه</Link>}
        >
          {loading ? (
            <div style={{ padding: 34, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال دریافت درخواست‌ها…</div>
          ) : pending.length === 0 ? (
            <PanelEmpty icon="checkCircle" title="درخواستی در انتظار نیست" description="در حال حاضر همه درخواست‌ها تعیین تکلیف شده‌اند." />
          ) : (
            pending.slice(0, 5).map((session) => {
              const busy = busyId === session.id;
              return (
                <article className="ops-row" key={session.id} style={{ opacity: busy ? .55 : 1 }}>
                  <Avatar size={42} imageUrl={avatarUrl(session.learner?.avatar_url, session.learner?.updated_at)} />
                  <div className="ops-row-main">
                    <div className="ops-row-title">
                      <strong>{session.learner?.name || 'قرآن‌آموز'}</strong>
                      <PanelStatus status="pending">در انتظار</PanelStatus>
                    </div>
                    <div className="ops-row-sub">
                      <span>{session.service}</span>
                      <span>· {session.local_date}</span>
                      <span>· {toFaDigits(session.local_start)}</span>
                    </div>
                    <div className="ops-row-meta">
                      <span>{toFaDigits(session.duration)} دقیقه</span>
                      <span>{formatFaNumber(session.price)} تومان</span>
                    </div>
                  </div>
                  <div className="ops-row-actions">
                    <PanelButton tone="danger" icon="x" disabled={busy} onClick={() => void respond(session, false)}>رد</PanelButton>
                    <PanelButton tone="success" icon="check" disabled={busy} onClick={() => void respond(session, true)}>
                      {busy ? 'در حال ثبت…' : 'تأیید'}
                    </PanelButton>
                  </div>
                </article>
              );
            })
          )}
        </PanelSection>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <PanelSection title="دسترسی سریع" description="کارهای پرتکرار مدیریت آموزش.">
            <div className="ops-quick-actions">
              <TeacherQuickAction href="/panel/teacher/dispatch" icon="bell" label="فراخوان‌های زنده" />
              <TeacherQuickAction href="/panel/teacher/services" icon="book" label="مدیریت خدمات" />
              <TeacherQuickAction href="/panel/teacher/worktimes" icon="clock" label="زمان‌های کاری" />
              <TeacherQuickAction href="/panel/teacher/sessions" icon="calendar" label="جلسات" />
              <TeacherQuickAction href="/panel/teacher/wallet" icon="wallet" label="کیف پول" />
            </div>
          </PanelSection>

          <PanelSection title="خلاصه عملکرد">
            <div style={{ padding: 16, display: 'grid', gap: 11 }}>
              <SummaryRow label="جلسات تکمیل‌شده" value={toFaDigits(teacher?.sessions || 0)} />
              <SummaryRow label="نظر ثبت‌شده" value={toFaDigits(teacher?.reviews || 0)} />
              <SummaryRow label="خدمات ثبت‌شده" value={toFaDigits(servicesCount)} />
              <SummaryRow label="وضعیت رزرو" value={teacher?.available ? 'فعال' : 'غیرفعال'} />
            </div>
          </PanelSection>
        </div>
      </div>
    </main>
  );
}

function TeacherQuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
}) {
  return (
    <Link href={href} className="ops-quick-action">
      <span><Icon name={icon} size={17} /></span>
      <strong>{label}</strong>
    </Link>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{label}</span>
      <strong style={{ fontSize: 12.5 }}>{value}</strong>
    </div>
  );
}

function profileLabel(status: string) {
  if (status === 'approved') return 'تأییدشده';
  if (status === 'rejected') return 'ردشده';
  return 'در انتظار بررسی';
}

function profileTone(status: string): 'approved' | 'pending' | 'rejected' {
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}
