'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
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
import { fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

type DashboardData = {
  learners?: number;
  teachers?: number;
  pending_teachers?: number;
  sessions?: number;
  done_sessions?: number;
  charge_volume?: number;
  commission?: number;
};

type PendingTeacher = {
  id: number;
  field?: string;
  tag?: string;
  city?: string;
  user?: { name?: string; avatar_url?: string };
};

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData>({});
  const [pendingTeachers, setPendingTeachers] = useState<PendingTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [dashboardResponse, teachersResponse] = await Promise.all([
        fetch('/api/backend/admin/dashboard', { cache: 'no-store' }),
        fetch('/api/backend/admin/teachers?status=pending&limit=6', { cache: 'no-store' }),
      ]);
      const [dashboardBody, teachersBody] = await Promise.all([
        dashboardResponse.json().catch(() => ({})),
        teachersResponse.json().catch(() => ({})),
      ]);
      if (!dashboardResponse.ok) throw new Error(dashboardBody.error || 'آمار مدیریت دریافت نشد.');
      if (!teachersResponse.ok) throw new Error(teachersBody.error || 'فهرست استادان در انتظار دریافت نشد.');
      setDashboard(dashboardBody.data || {});
      setPendingTeachers(teachersBody.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'داشبورد مدیریت دریافت نشد.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function reviewTeacher(id: number, approve: boolean) {
    if (!token || busyId !== null) return;
    const action = approve ? 'تأیید' : 'رد';
    if (!window.confirm(`پروفایل این استاد ${action} شود؟`)) return;

    setBusyId(id);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/teachers/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `${action} استاد انجام نشد.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${action} استاد انجام نشد.`);
    } finally {
      setBusyId(null);
    }
  }

  const sessions = Number(dashboard.sessions || 0);
  const doneSessions = Number(dashboard.done_sessions || 0);
  const completionRate = sessions > 0 ? Math.round((doneSessions / sessions) * 100) : 0;

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="مرکز عملیات"
        title="داشبورد مدیریت"
        description="نمای متمرکز از وضعیت کاربران، استادان، جلسات و مواردی که نیاز به اقدام مدیریتی دارند."
        actions={<PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>}
      />

      {error && (
        <div className="ops-error" role="alert">
          <span>{error}</span>
          <PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton>
        </div>
      )}

      <div className="ops-metric-grid">
        <PanelMetric
          icon="users"
          label="قرآن‌آموزان"
          value={loading ? '—' : toFaDigits(Number(dashboard.learners || 0))}
          hint="حساب‌های learner"
          tone="info"
        />
        <PanelMetric
          icon="award"
          label="کل استادان"
          value={loading ? '—' : toFaDigits(Number(dashboard.teachers || 0))}
          hint={`${toFaDigits(Number(dashboard.pending_teachers || 0))} در انتظار بررسی`}
        />
        <PanelMetric
          icon="calendar"
          label="جلسات"
          value={loading ? '—' : toFaDigits(sessions)}
          hint={sessions > 0 ? `${toFaDigits(completionRate)}٪ تکمیل‌شده` : 'هنوز جلسه‌ای ثبت نشده'}
          tone="info"
        />
        <PanelMetric
          icon="coins"
          label="کارمزد ثبت‌شده"
          value={loading ? '—' : `${formatFaNumber(Number(dashboard.commission || 0))} ت`}
          hint="بر اساس ledger واقعی"
          tone="clay"
        />
      </div>

      <div className="ops-two-column">
        <PanelSection
          title="صف بررسی استادان"
          description="درخواست‌هایی که هنوز تصمیم مدیریتی برایشان ثبت نشده است."
          action={<Link href="/panel/admin/teachers?status=pending" className="ops-button">مشاهده همه</Link>}
        >
          {loading ? (
            <div style={{ padding: 34, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال دریافت صف بررسی…</div>
          ) : pendingTeachers.length === 0 ? (
            <PanelEmpty
              icon="checkCircle"
              title="صف بررسی خالی است"
              description="در حال حاضر درخواست استادی در انتظار تصمیم وجود ندارد."
            />
          ) : (
            pendingTeachers.map((teacher) => {
              const busy = busyId === teacher.id;
              return (
                <article className="ops-row" key={teacher.id} style={{ opacity: busy ? .55 : 1 }}>
                  <Avatar size={44} imageUrl={fullUrl(teacher.user?.avatar_url)} />
                  <div className="ops-row-main">
                    <div className="ops-row-title">
                      <strong>{teacher.user?.name || 'استاد بدون نام'}</strong>
                      <PanelStatus status="pending">در انتظار</PanelStatus>
                    </div>
                    <div className="ops-row-sub">
                      <span>{teacher.tag || teacher.field || 'حوزه ثبت نشده'}</span>
                      {teacher.city && <span>· {teacher.city}</span>}
                    </div>
                  </div>
                  <div className="ops-row-actions">
                    <PanelButton tone="danger" icon="x" disabled={busy} onClick={() => void reviewTeacher(teacher.id, false)}>رد</PanelButton>
                    <PanelButton tone="success" icon="check" disabled={busy} onClick={() => void reviewTeacher(teacher.id, true)}>
                      {busy ? 'در حال ثبت…' : 'تأیید'}
                    </PanelButton>
                  </div>
                </article>
              );
            })
          )}
        </PanelSection>

        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <PanelSection title="دسترسی سریع" description="مسیرهای پرتکرار مدیریت و کنترل روزانه.">
            <div className="ops-quick-actions">
              <QuickAction href="/panel/admin/teachers" icon="award" label="اساتید" />
              <QuickAction href="/panel/admin/services" icon="book" label="خدمات" />
              <QuickAction href="/panel/admin/withdrawals" icon="download" label="برداشت‌ها" />
              <QuickAction href="/panel/admin/support" icon="message" label="پشتیبانی" />
              <QuickAction href="/panel/admin/sessions" icon="calendar" label="جلسات" />
              <QuickAction href="/panel/admin/audit" icon="shield" label="گزارش عملیات" />
            </div>
          </PanelSection>

          <PanelSection title="وضعیت مالی" description="اعداد ثبت‌شده در دفتر مالی سامانه.">
            <div style={{ padding: 16, display: 'grid', gap: 11 }}>
              <FinanceRow label="حجم شارژ ثبت‌شده" value={Number(dashboard.charge_volume || 0)} />
              <FinanceRow label="کارمزد سامانه" value={Number(dashboard.commission || 0)} />
              <div className="ops-inline-note">
                <Icon name="info" size={16} />
                <span>فقط داده واقعی backend نمایش داده می‌شود؛ نمودار تاریخی تا زمان وجود endpoint گزارش دوره‌ای اضافه نمی‌شود.</span>
              </div>
            </div>
          </PanelSection>
        </div>
      </div>
    </main>
  );
}

function QuickAction({
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

function FinanceRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{label}</span>
      <strong style={{ color: 'var(--olive-700)', fontSize: 13 }}>{formatFaNumber(value)} تومان</strong>
    </div>
  );
}
