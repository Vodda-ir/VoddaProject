'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelSection,
  PanelStatus,
} from '@/components/panel/PanelUI';
import { AreaChart, BarsChart, DonutChart, HBarList, faCompact } from '@/components/admin/charts';
import { StatCard, deltaOf, exportCsv, FilterTabs } from '@/components/admin/AdminUI';
import { fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

// ─────────────────────────── types ───────────────────────────

type AnalyticsPoint = {
  date: string;
  new_users: number;
  new_teachers: number;
  sessions_created: number;
  sessions_done: number;
  charge: number;
  commission: number;
};

type Analytics = {
  days: number;
  series: AnalyticsPoint[];
  users: { total: number; learners: number; teachers: number; admins: number; active: number; new_week: number };
  sessions: { total: number; pending: number; confirmed: number; done: number; canceled: number; rated: number; minutes: number };
  finance: { charge_volume: number; commission: number; earnings: number; wallet_liability: number; pending_withdrawals: number; pending_withdrawal_amount: number };
  rating: { avg: number; count: number };
  status_breakdown: Array<{ status: string; count: number }> | null;
  fields: Array<{ name: string; count: number }> | null;
  top_teachers: Array<{ id: number; name: string; avatar_url: string; field: string; city: string; tier: string; rating: number; reviews: number; done_sessions: number; earned: number }> | null;
  recent_users: Array<{ id: number; name: string; avatar_url: string; role: string; created_at: string }> | null;
  recent_sessions: Array<{ id: number; title: string; status: string; price: number; scheduled_at: string; learner_name: string; learner_avatar: string; teacher_name: string }> | null;
};

type PendingTeacher = {
  id: number;
  field?: string;
  tag?: string;
  city?: string;
  user?: { name?: string; avatar_url?: string };
};

type RangeKey = '7' | '14' | '30';
type ChartTab = 'sessions' | 'users' | 'money';

const RANGE_LABELS: Array<{ value: RangeKey; label: string }> = [
  { value: '7', label: '۷ روز' },
  { value: '14', label: '۱۴ روز' },
  { value: '30', label: '۳۰ روز' },
];

const SESSION_STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'در انتظار تأیید', color: 'var(--gold)' },
  confirmed: { label: 'تأییدشده', color: 'var(--info)' },
  done: { label: 'برگزارشده', color: 'var(--olive-500)' },
  canceled: { label: 'لغوشده', color: 'var(--rose)' },
};

const ROLE_BADGE: Record<string, { label: string; tone: string }> = {
  learner: { label: 'قرآن‌آموز', tone: 'info' },
  teacher: { label: 'استاد', tone: 'gold' },
  admin: { label: 'ادمین', tone: 'olive' },
};

function faDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return '';
  }
}

function faRating(value: number): string {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(value);
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [pendingTeachers, setPendingTeachers] = useState<PendingTeacher[]>([]);
  const [range, setRange] = useState<RangeKey>('30');
  const [chartTab, setChartTab] = useState<ChartTab>('sessions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [analyticsResponse, teachersResponse] = await Promise.all([
        fetch(`/api/backend/admin/analytics?days=${range}`, { cache: 'no-store' }),
        fetch('/api/backend/admin/teachers?status=pending&limit=6', { cache: 'no-store' }),
      ]);
      const [analyticsBody, teachersBody] = await Promise.all([
        analyticsResponse.json().catch(() => ({})),
        teachersResponse.json().catch(() => ({})),
      ]);
      if (!analyticsResponse.ok) throw new Error(analyticsBody.error || 'داده‌های تحلیلی دریافت نشد.');
      if (!teachersResponse.ok) throw new Error(teachersBody.error || 'فهرست استادان در انتظار دریافت نشد.');
      setAnalytics(analyticsBody.data as Analytics);
      setPendingTeachers(teachersBody.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'داشبورد دریافت نشد.');
    } finally {
      setLoading(false);
    }
  }, [token, range]);

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

  const series = analytics?.series ?? [];
  const users = analytics?.users;
  const sessions = analytics?.sessions;
  const finance = analytics?.finance;

  const weekSum = (key: keyof AnalyticsPoint, offset: number) =>
    series.slice(offset - 7, offset).reduce((sum, point) => sum + Number(point[key] || 0), 0);
  const usersDelta = deltaOf(weekSum('new_users', series.length), weekSum('new_users', Math.max(0, series.length - 7)));
  const sessionsDelta = deltaOf(weekSum('sessions_created', series.length), weekSum('sessions_created', Math.max(0, series.length - 7)));
  const moneyDelta = deltaOf(weekSum('commission', series.length), weekSum('commission', Math.max(0, series.length - 7)));

  const statusSegments = (analytics?.status_breakdown ?? []).map((item) => ({
    label: SESSION_STATUS_META[item.status]?.label ?? item.status,
    value: Number(item.count || 0),
    color: SESSION_STATUS_META[item.status]?.color ?? 'var(--sand-200)',
  }));

  const chartData = series.map((point) => ({
    label: point.date,
    value:
      chartTab === 'users' ? Number(point.new_users || 0)
        : chartTab === 'money' ? Number(point.charge || 0)
          : Number(point.sessions_created || 0),
  }));
  const chartSecondary = chartTab === 'sessions'
    ? series.map((point) => ({ label: point.date, value: Number(point.sessions_done || 0) }))
    : chartTab === 'money'
      ? series.map((point) => ({ label: point.date, value: Number(point.commission || 0) }))
      : undefined;

  const activityTotal = chartData.reduce((sum, point) => sum + point.value, 0);
  const secondaryTotal = (chartSecondary ?? []).reduce((sum, point) => sum + point.value, 0);

  const feed = [
    ...(analytics?.recent_users ?? []).map((user) => ({
      key: `user-${user.id}`,
      icon: 'user' as const,
      tone: ROLE_BADGE[user.role]?.tone ?? 'muted',
      badge: ROLE_BADGE[user.role]?.label ?? 'کاربر',
      title: user.name || 'کاربر تازه',
      sub: `عضویت در ${faDateTime(user.created_at)}`,
      avatarUrl: user.avatar_url,
    })),
    ...(analytics?.recent_sessions ?? []).map((session) => ({
      key: `session-${session.id}`,
      icon: 'calendar' as const,
      tone: session.status === 'done' ? 'green' : session.status === 'canceled' ? 'rose' : 'gold',
      badge: SESSION_STATUS_META[session.status]?.label ?? session.status,
      title: session.title || 'جلسه آموزشی',
      sub: `${session.learner_name} × ${session.teacher_name} · ${faDateTime(session.scheduled_at)}`,
      avatarUrl: session.learner_avatar,
    })),
  ].slice(0, 9);

  const hours = Math.round(Number(sessions?.minutes || 0) / 60);

  return (
    <main className="ops-page">
      <section className="adm-hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="adm-hero-eyebrow"><Icon name="sparkle" size={13} /> مرکز مدیریت وُدّا</span>
          <h1>نمای کلی سامانه</h1>
          <p>تصویر زنده از رشد کاربران، جلسات آموزشی، درآمد کارمزدی و کارهای نیازمند اقدام — همه اعداد از داده واقعی سامانه.</p>
        </div>
        <div className="adm-hero-actions">
          <PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>
          <PanelButton
            tone="primary"
            icon="download"
            onClick={() => {
              if (!series.length) return;
              exportCsv(
                `vodda-report-${range}d`,
                ['تاریخ', 'کاربران جدید', 'استادان جدید', 'جلسات ایجادشده', 'جلسات برگزارشده', 'شارژ (تومان)', 'کارمزد (تومان)'],
                series.map((point) => [point.date, point.new_users, point.new_teachers, point.sessions_created, point.sessions_done, point.charge, point.commission]),
              );
            }}
          >
            خروجی گزارش
          </PanelButton>
        </div>
      </section>

      {error && (
        <div className="ops-error" role="alert">
          <span>{error}</span>
          <PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton>
        </div>
      )}

      <div className="adm-stat-grid">
        <StatCard
          icon="users"
          tone="olive"
          label="کاربران سامانه"
          value={loading ? '—' : toFaDigits(users?.total ?? 0)}
          delta={loading ? null : usersDelta}
          trend={series.map((point) => Number(point.new_users || 0))}
          hint={`${toFaDigits(users?.new_week ?? 0)} عضو جدید در هفته گذشته`}
        />
        <StatCard
          icon="award"
          tone="gold"
          label="اساتید"
          value={loading ? '—' : toFaDigits(users?.teachers ?? 0)}
          hint={`${toFaDigits(pendingTeachers.length)} پروفایل در انتظار بررسی`}
        />
        <StatCard
          icon="calendar"
          tone="info"
          label="جلسات آموزشی"
          value={loading ? '—' : toFaDigits(sessions?.total ?? 0)}
          delta={loading ? null : sessionsDelta}
          trend={series.map((point) => Number(point.sessions_created || 0))}
          hint={`${toFaDigits(sessions?.done ?? 0)} برگزارشده · ${toFaDigits(hours)} ساعت تدریس`}
        />
        <StatCard
          icon="coins"
          tone="clay"
          label="کارمزد سامانه"
          value={loading ? '—' : `${formatFaNumber(finance?.commission ?? 0)} ت`}
          delta={loading ? null : moneyDelta}
          trend={series.map((point) => Number(point.commission || 0))}
          hint={`${toFaDigits(finance?.pending_withdrawals ?? 0)} درخواست برداشت در صف`}
        />
        <StatCard
          icon="checkCircle"
          tone="olive"
          label="نرخ تکمیل جلسات"
          value={loading ? '—' : `${toFaDigits(sessions?.total ? Math.round((Number(sessions.done) / Number(sessions.total)) * 100) : 0)}٪`}
          hint={`${toFaDigits(sessions?.canceled ?? 0)} جلسه لغو شده`}
        />
        <StatCard
          icon="star"
          tone="gold"
          label="رضایت کلی"
          value={loading ? '—' : faRating(Number(analytics?.rating.avg ?? 0))}
          hint={`${toFaDigits(analytics?.rating.count ?? 0)} نظر ثبت‌شده`}
        />
        <StatCard
          icon="wallet"
          tone="info"
          label="شارژ کیف پول‌ها"
          value={loading ? '—' : faCompact(Number(finance?.charge_volume ?? 0))}
          hint={`تعهد کیف پول: ${faCompact(Number(finance?.wallet_liability ?? 0))} ت`}
        />
        <StatCard
          icon="trending"
          tone="rose"
          label="درآمد استادان"
          value={loading ? '—' : faCompact(Number(finance?.earnings ?? 0))}
          hint="مجموع تسویه‌شده در دفتر مالی"
        />
      </div>

      <div className="adm-grid-2" style={{ marginTop: 14 }}>
        <PanelSection
          title="نبض سامانه"
          description="روند روزانه شاخص انتخابی در بازه اخیر."
          action={
            <div className="adm-range" role="group" aria-label="بازه زمانی">
              {RANGE_LABELS.map((item) => (
                <button key={item.value} type="button" data-active={range === item.value ? 'true' : undefined} onClick={() => setRange(item.value)}>
                  {item.label}
                </button>
              ))}
            </div>
          }
        >
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '13px 18px 0' }}>
            <FilterTabs
              ariaLabel="شاخص نمودار"
              items={[
                { value: 'sessions', label: 'جلسات' },
                { value: 'users', label: 'کاربران جدید' },
                { value: 'money', label: 'مالی' },
              ]}
              value={chartTab}
              onChange={setChartTab}
            />
            <div className="adm-legend-inline">
              <span><i style={{ background: chartTab === 'money' ? 'var(--gold)' : 'var(--olive-600)' }} />
                {chartTab === 'sessions' ? 'ایجادشده' : chartTab === 'money' ? 'شارژ کیف پول' : 'عضویت'}</span>
              {chartSecondary && (
                <span><i style={{ background: chartTab === 'sessions' ? 'var(--gold)' : 'var(--olive-600)' }} />
                  {chartTab === 'sessions' ? 'برگزارشده' : 'کارمزد'}</span>
              )}
            </div>
          </div>
          <div style={{ padding: '4px 12px 10px' }}>
            {loading ? (
              <div className="adm-skeleton" style={{ height: 190, borderRadius: 14 }} />
            ) : chartTab === 'sessions' ? (
              <BarsChart data={chartData} secondary={chartSecondary} height={206} />
            ) : (
              <AreaChart data={chartData} height={206} tone={chartTab === 'money' ? 'gold' : 'olive'} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', padding: '0 18px 16px' }}>
            <SummaryChip label={chartTab === 'money' ? 'جمع شارژ' : chartTab === 'users' ? 'جمع عضویت‌ها' : 'جلسات ایجادشده'} value={formatFaNumber(activityTotal)} />
            {chartSecondary && <SummaryChip label={chartTab === 'sessions' ? 'برگزارشده' : 'جمع کارمزد'} value={formatFaNumber(secondaryTotal)} />}
            <SummaryChip label='میانگین روزانه' value={faCompact(chartData.length ? Math.round(activityTotal / chartData.length) : 0)} />
          </div>
        </PanelSection>

        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <PanelSection title="وضعیت جلسات" description="چرخه حیات همه جلسات ثبت‌شده.">
            {loading ? (
              <div className="adm-skeleton" style={{ height: 170, borderRadius: 14, margin: 18 }} />
            ) : statusSegments.length === 0 ? (
              <PanelEmpty icon="calendar" title="هنوز جلسه‌ای ثبت نشده" />
            ) : (
              <DonutChart
                segments={statusSegments}
                centerValue={toFaDigits(sessions?.total ?? 0)}
                centerLabel="جلسه"
              />
            )}
          </PanelSection>

          <PanelSection title="حوزه‌های تدریس" description="پراکندگی اساتید بر اساس حوزه کاری.">
            {loading ? (
              <div className="adm-skeleton" style={{ height: 150, borderRadius: 14, margin: 18 }} />
            ) : (analytics?.fields ?? []).length === 0 ? (
              <PanelEmpty icon="book" title="حوزه‌ای ثبت نشده" />
            ) : (
              <HBarList
                items={(analytics?.fields ?? []).slice(0, 6).map((field) => ({ label: field.name, value: Number(field.count || 0) }))}
              />
            )}
          </PanelSection>
        </div>
      </div>

      <div className="adm-grid-2" style={{ marginTop: 14 }}>
        <PanelSection title="فعالیت اخیر" description="تازه‌ترین عضویت‌ها و جلسات سامانه.">
          {loading ? (
            <div style={{ padding: 20, display: 'grid', gap: 10 }}>
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="adm-skeleton" style={{ height: 40, borderRadius: 12 }} />
              ))}
            </div>
          ) : feed.length === 0 ? (
            <PanelEmpty icon="clock" title="فعالیتی ثبت نشده" />
          ) : (
            <div className="adm-feed">
              {feed.map((item) => (
                <div className="adm-feed-row" key={item.key}>
                  {item.avatarUrl ? (
                    <Avatar size={38} imageUrl={fullUrl(item.avatarUrl)} />
                  ) : (
                    <span className="adm-stat-icon" style={{ width: 38, height: 38, borderRadius: 12 }}><Icon name={item.icon} size={17} /></span>
                  )}
                  <div className="adm-feed-main">
                    <strong>{item.title}</strong>
                    <small>{item.sub}</small>
                  </div>
                  <span className="adm-badge" data-tone={item.tone}>{item.badge}</span>
                </div>
              ))}
            </div>
          )}
        </PanelSection>

        <PanelSection
          title="برترین استادان"
          description="رتبه‌بندی بر اساس جلسات برگزارشده."
          action={<Link href="/panel/admin/teachers" className="ops-button">همه اساتید</Link>}
        >
          {loading ? (
            <div style={{ padding: 20, display: 'grid', gap: 10 }}>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="adm-skeleton" style={{ height: 44, borderRadius: 12 }} />
              ))}
            </div>
          ) : (analytics?.top_teachers ?? []).length === 0 ? (
            <PanelEmpty icon="award" title="استادی برای رتبه‌بندی نیست" />
          ) : (
            <div className="adm-leader">
              {(analytics?.top_teachers ?? []).slice(0, 7).map((teacher, index) => (
                <div className="adm-leader-row" key={teacher.id}>
                  <span className="adm-leader-rank">{toFaDigits(index + 1)}</span>
                  <Avatar size={40} imageUrl={fullUrl(teacher.avatar_url)} />
                  <div className="adm-leader-main">
                    <strong>
                      {teacher.name || 'استاد'}
                      {teacher.tier === 'international' && <span className="adm-badge" data-tone="info">بین‌المللی</span>}
                      {teacher.tier === 'grade2' && <span className="adm-badge" data-tone="green">کشوری</span>}
                      {teacher.tier === 'grade3' && <span className="adm-badge" data-tone="rose">استانی</span>}
                    </strong>
                    <small>{teacher.field || '—'}{teacher.city ? ` · ${teacher.city}` : ''}</small>
                  </div>
                  <div className="adm-leader-num">
                    <strong>{toFaDigits(teacher.done_sessions)} جلسه</strong>
                    <small>
                      <Icon name="star" size={10} fill />
                      {faRating(Number(teacher.rating || 0))}
                      <em style={{ fontStyle: 'normal' }}> ({toFaDigits(teacher.reviews)})</em>
                    </small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelSection>
      </div>

      <div className="ops-two-column" style={{ marginTop: 14 }}>
        <PanelSection
          title="صف بررسی استادان"
          description="درخواست‌هایی که هنوز تصمیم مدیریتی برایشان ثبت نشده است."
          action={<Link href="/panel/admin/teachers" className="ops-button">مدیریت صف</Link>}
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

        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <PanelSection title="وضعیت مالی" description="اعداد ثبت‌شده در دفتر مالی سامانه.">
            <div style={{ padding: 16, display: 'grid', gap: 11 }}>
              <FinanceRow label="حجم شارژ ثبت‌شده" value={Number(finance?.charge_volume || 0)} />
              <FinanceRow label="کارمزد سامانه" value={Number(finance?.commission || 0)} />
              <FinanceRow label="درآمد تسویه‌شده استادان" value={Number(finance?.earnings || 0)} />
              <FinanceRow label="موجودی قابل برداشت کاربران" value={Number(finance?.wallet_liability || 0)} muted />
              {Number(finance?.pending_withdrawals || 0) > 0 && (
                <Link href="/panel/admin/withdrawals" className="ops-inline-note" style={{ color: 'var(--clay)', borderColor: '#ecd5c8' }}>
                  <Icon name="bell" size={15} />
                  <span>{toFaDigits(finance?.pending_withdrawals ?? 0)} درخواست برداشت ({formatFaNumber(Number(finance?.pending_withdrawal_amount || 0))} تومان) منتظر بررسی است.</span>
                </Link>
              )}
            </div>
          </PanelSection>

          <PanelSection title="دسترسی سریع" description="مسیرهای پرتکرار مدیریت.">
            <div className="ops-quick-actions">
              <QuickAction href="/panel/admin/users" icon="users" label="کاربران" />
              <QuickAction href="/panel/admin/teachers" icon="award" label="اساتید" />
              <QuickAction href="/panel/admin/sessions" icon="calendar" label="جلسات" />
              <QuickAction href="/panel/admin/reviews" icon="star" label="نظرات" />
              <QuickAction href="/panel/admin/services" icon="book" label="خدمات" />
              <QuickAction href="/panel/admin/withdrawals" icon="download" label="برداشت‌ها" />
              <QuickAction href="/panel/admin/support" icon="message" label="پشتیبانی" />
              <QuickAction href="/panel/admin/finance" icon="coins" label="گزارش مالی" />
              <QuickAction href="/panel/admin/settings" icon="settings" label="تنظیمات" />
            </div>
          </PanelSection>
        </div>
      </div>
    </main>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
      <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>{label}</span>
      <strong style={{ color: 'var(--olive-700)', fontSize: 13 }}>{value}</strong>
    </div>
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

function FinanceRow({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{label}</span>
      <strong style={{ color: muted ? 'var(--ink-3)' : 'var(--olive-700)', fontSize: 13 }}>{formatFaNumber(value)} تومان</strong>
    </div>
  );
}
