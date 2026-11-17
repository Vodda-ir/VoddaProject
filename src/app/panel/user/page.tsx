'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelSection,
} from '@/components/panel/PanelUI';
import { AreaChart, BarsChart, DonutChart, HBarList, faCompact } from '@/components/admin/charts';
import { StatCard, deltaOf, exportCsv, FilterTabs } from '@/components/admin/AdminUI';
import { api, type LearnerAnalytics, type SessionListItem } from '@/lib/api';
import { fullUrl, getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';
import { formatDateTime } from '@/lib/datetime';

type RangeKey = '7' | '14' | '30';
type ChartTab = 'sessions' | 'minutes' | 'money';

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

export default function LearnerDashboard() {
  const [analytics, setAnalytics] = useState<LearnerAnalytics | null>(null);
  const [name, setName] = useState('');
  const [upcoming, setUpcoming] = useState<SessionListItem[]>([]);
  const [range, setRange] = useState<RangeKey>('30');
  const [chartTab, setChartTab] = useState<ChartTab>('sessions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [analyticsResponse, meResponse, upcomingResponse] = await Promise.all([
        api.meAnalytics(token, 30),
        fetch('/api/backend/me', { cache: 'no-store' }).then((response) => (response.ok ? response.json() : null)),
        api.mySessions(token, 'upcoming'),
      ]);
      setAnalytics(analyticsResponse.data);
      setName((meResponse?.data?.name as string) || '');
      setUpcoming(upcomingResponse.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'داده‌های داشبورد دریافت نشد.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const series = analytics?.series ?? [];
  const totals = analytics?.totals;
  const visible = useMemo(() => series.slice(-Number(range)), [series, range]);

  const windowSum = (key: 'sessions' | 'done' | 'minutes' | 'spent', offset: number) =>
    series.slice(offset - 7, offset).reduce((sum, point) => sum + Number(point[key] || 0), 0);
  const doneDelta = deltaOf(windowSum('done', series.length), windowSum('done', Math.max(0, series.length - 7)));
  const spentDelta = deltaOf(windowSum('spent', series.length), windowSum('spent', Math.max(0, series.length - 7)));

  const chartData = visible.map((point) => ({
    label: point.date,
    value:
      chartTab === 'minutes' ? Math.round(Number(point.minutes || 0))
        : chartTab === 'money' ? Number(point.spent || 0)
          : Number(point.sessions || 0),
  }));
  const chartSecondary = chartTab === 'sessions'
    ? visible.map((point) => ({ label: point.date, value: Number(point.done || 0) }))
    : chartTab === 'money'
      ? visible.map((point) => ({ label: point.date, value: Number(point.charged || 0) }))
      : undefined;

  const activityTotal = chartData.reduce((sum, point) => sum + point.value, 0);
  const secondaryTotal = (chartSecondary ?? []).reduce((sum, point) => sum + point.value, 0);

  const statusSegments = useMemo(() => {
    if (!totals) return [];
    return [
      { label: SESSION_STATUS_META.pending.label, value: Number(totals.pending || 0), color: SESSION_STATUS_META.pending.color },
      { label: SESSION_STATUS_META.confirmed.label, value: Number(totals.confirmed || 0), color: SESSION_STATUS_META.confirmed.color },
      { label: SESSION_STATUS_META.done.label, value: Number(totals.done || 0), color: SESSION_STATUS_META.done.color },
      { label: SESSION_STATUS_META.canceled.label, value: Number(totals.canceled || 0), color: SESSION_STATUS_META.canceled.color },
    ].filter((segment) => segment.value > 0);
  }, [totals]);

  const completionRate = totals && totals.sessions_total > 0
    ? Math.round((Number(totals.done) / Number(totals.sessions_total)) * 100)
    : 0;
  const learningHours = Math.round(Number(totals?.minutes_learned || 0) / 60);
  const topTeacher = (analytics?.teachers ?? [])[0];
  const nextSession = totals?.next_session_at ? new Date(totals.next_session_at) : null;
  const nextSessionValid = nextSession && !Number.isNaN(nextSession.getTime());
  const confirmedUpcoming = upcoming.filter((session) => session.status === 'confirmed');

  return (
    <main className="ops-page">
      <section className="adm-hero">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <span className="adm-hero-eyebrow"><Icon name="quran" size={13} /> فضای یادگیری من</span>
          <h1>{name ? `سلام ${name.split(' ')[0]}!` : 'سلام!'}</h1>
          <p>نمای زنده‌ای از سفر قرآنی شما: جلسات، ساعت‌های یادگیری، هزینه‌ها و استادان همراه‌تان — همه از داده واقعی حساب شما.</p>
        </div>
        <div className="adm-hero-actions">
          <PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>
          <PanelButton
            icon="download"
            onClick={() => {
              if (!series.length) return;
              exportCsv(
                'vodda-learning-report',
                ['تاریخ', 'جلسات رزروشده', 'جلسات برگزارشده', 'دقیقه یادگیری', 'هزینه (تومان)', 'شارژ (تومان)'],
                series.map((point) => [point.date, point.sessions, point.done, point.minutes, point.spent, point.charged]),
              );
            }}
          >
            خروجی گزارش
          </PanelButton>
          <Link href="/panel/user/book" className="ops-button" data-tone="primary"><Icon name="plus" size={15} /> رزرو جلسه جدید</Link>
        </div>
      </section>

      {error && (
        <div className="ops-error" role="alert">
          <span>{error}</span>
          <PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton>
        </div>
      )}

      {nextSessionValid && (
        <section className="usr-next-strip" role="region" aria-label="جلسه بعدی">
          <span className="usr-next-icon"><Icon name="video" size={21} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong>جلسه بعدی شما</strong>
            <small>{formatDateTime(nextSession, 'fa', 'weekdayDayMonth')} · به‌وقت رسمی ایران</small>
          </div>
          <Link href="/panel/user/sessions" className="ops-button" data-tone="primary">جزئیات و ورود به کلاس</Link>
        </section>
      )}

      <div className="adm-stat-grid">
        <StatCard
          icon="calendar"
          tone="olive"
          label="جلسات پیش‌رو"
          value={loading ? '—' : toFaDigits(upcoming.length)}
          hint={`${toFaDigits(totals?.pending ?? 0)} در انتظار تأیید استاد`}
        />
        <StatCard
          icon="checkCircle"
          tone="olive"
          label="جلسات تکمیل‌شده"
          value={loading ? '—' : toFaDigits(totals?.done ?? 0)}
          delta={loading ? null : doneDelta}
          trend={series.map((point) => Number(point.done || 0))}
          hint={`${toFaDigits(totals?.sessions_total ?? 0)} جلسه ثبت‌شده تا امروز`}
        />
        <StatCard
          icon="clock"
          tone="info"
          label="ساعت یادگیری"
          value={loading ? '—' : toFaDigits(learningHours)}
          hint={`${formatFaNumber(Number(totals?.minutes_learned ?? 0))} دقیقه تلاوت و تمرین`}
        />
        <StatCard
          icon="users"
          tone="gold"
          label="اساتید من"
          value={loading ? '—' : toFaDigits(totals?.teachers_count ?? 0)}
          hint={topTeacher ? `همراه همیشگی: ${topTeacher.name}` : 'هنوز با استادی همراه نشده‌اید'}
        />
        <StatCard
          icon="wallet"
          tone="clay"
          label="موجودی کیف پول"
          value={loading ? '—' : `${formatFaNumber(Number(analytics?.wallet ?? 0))} ت`}
          hint={`مجموع شارژ: ${faCompact(Number(totals?.charged_total ?? 0))} تومان`}
        />
        <StatCard
          icon="coins"
          tone="rose"
          label="هزینه جلسات"
          value={loading ? '—' : `${faCompact(Number(totals?.spent_total ?? 0))} ت`}
          delta={loading ? null : spentDelta}
          trend={series.map((point) => Number(point.spent || 0))}
          hint={`نرخ تکمیل جلسات: ${toFaDigits(completionRate)}٪`}
        />
      </div>

      <div className="adm-grid-2" style={{ marginTop: 14 }}>
        <PanelSection
          title="روند یادگیری"
          description="روند روزانه فعالیت آموزشی شما در بازه اخیر."
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
                { value: 'minutes', label: 'دقیقه یادگیری' },
                { value: 'money', label: 'هزینه و شارژ' },
              ]}
              value={chartTab}
              onChange={setChartTab}
            />
            <div className="adm-legend-inline">
              <span><i style={{ background: chartTab === 'money' ? 'var(--gold)' : 'var(--olive-600)' }} />
                {chartTab === 'sessions' ? 'رزروشده' : chartTab === 'money' ? 'هزینه جلسات' : 'دقیقه یادگیری'}</span>
              {chartSecondary && (
                <span><i style={{ background: chartTab === 'sessions' ? 'var(--gold)' : 'var(--olive-600)' }} />
                  {chartTab === 'sessions' ? 'برگزارشده' : 'شارژ کیف پول'}</span>
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
            <SummaryChip
              label={chartTab === 'money' ? 'جمع هزینه' : chartTab === 'minutes' ? 'جمع دقیقه' : 'جلسات رزروشده'}
              value={formatFaNumber(activityTotal)}
            />
            {chartSecondary && <SummaryChip label={chartTab === 'sessions' ? 'برگزارشده' : 'جمع شارژ'} value={formatFaNumber(secondaryTotal)} />}
            <SummaryChip label="میانگین روزانه" value={faCompact(chartData.length ? Math.round(activityTotal / chartData.length) : 0)} />
          </div>
        </PanelSection>

        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <PanelSection title="چرخه جلسات من" description="وضعیت همه جلساتی که تا امروز رزرو کرده‌اید.">
            {loading ? (
              <div className="adm-skeleton" style={{ height: 170, borderRadius: 14, margin: 18 }} />
            ) : statusSegments.length === 0 ? (
              <PanelEmpty icon="calendar" title="هنوز جلسه‌ای رزرو نکرده‌اید" />
            ) : (
              <DonutChart
                segments={statusSegments}
                centerValue={toFaDigits(totals?.sessions_total ?? 0)}
                centerLabel="جلسه"
              />
            )}
          </PanelSection>

          <PanelSection title="حوزه‌های یادگیری" description="پرتکرارترین خدمت‌هایی که در آن‌ها شرکت کرده‌اید.">
            {loading ? (
              <div className="adm-skeleton" style={{ height: 150, borderRadius: 14, margin: 18 }} />
            ) : (analytics?.by_service ?? []).length === 0 ? (
              <PanelEmpty icon="book" title="حوزه‌ای ثبت نشده" />
            ) : (
              <HBarList
                items={(analytics?.by_service ?? []).slice(0, 6).map((service) => ({ label: service.name, value: Number(service.count || 0) }))}
              />
            )}
          </PanelSection>
        </div>
      </div>

      <div className="adm-grid-2" style={{ marginTop: 14 }}>
        <PanelSection
          title="جلسات پیش‌رو"
          description="نزدیک‌ترین کلاس‌های شما و وضعیت تأیید آن‌ها."
          action={<Link href="/panel/user/sessions" className="ops-button">همه جلسات</Link>}
        >
          {loading ? (
            <div style={{ padding: 20, display: 'grid', gap: 10 }}>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="adm-skeleton" style={{ height: 44, borderRadius: 12 }} />
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <PanelEmpty
              icon="calendar"
              title="جلسه‌ای در پیش رو نیست"
              description="از میان اساتید وُدّا یک کلاس مناسب پیدا کنید و مسیر قرآنی‌تان را شروع کنید."
              action={<Link href="/panel/user/teachers" className="ops-button" data-tone="primary">مشاهده اساتید</Link>}
            />
          ) : (
            <div className="adm-feed">
              {upcoming.slice(0, 6).map((session) => (
                <div className="adm-feed-row" key={session.id}>
                  <Avatar size={38} imageUrl={fullUrl(session.teacher?.user?.avatar_url)} />
                  <div className="adm-feed-main">
                    <strong>{session.teacher?.user?.name || 'استاد'}</strong>
                    <small>{session.service} · {session.local_date} · ساعت {toFaDigits(session.local_start)}</small>
                  </div>
                  <span className="adm-badge" data-tone={session.status === 'confirmed' ? 'green' : 'gold'}>
                    {SESSION_STATUS_META[session.status]?.label ?? session.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </PanelSection>

        <PanelSection
          title="اساتید من"
          description="استادانی که بیشترین همراهی را با شما داشته‌اند."
          action={<Link href="/panel/user/teachers" className="ops-button">اساتید بیشتر</Link>}
        >
          {loading ? (
            <div style={{ padding: 20, display: 'grid', gap: 10 }}>
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="adm-skeleton" style={{ height: 44, borderRadius: 12 }} />
              ))}
            </div>
          ) : (analytics?.teachers ?? []).length === 0 ? (
            <PanelEmpty icon="users" title="هنوز استادی در فهرست شما نیست" description="پس از اولین جلسه، استاد شما اینجا دیده می‌شود." />
          ) : (
            <div className="adm-leader">
              {(analytics?.teachers ?? []).slice(0, 6).map((teacher, index) => (
                <Link href={`/teachers/${teacher.id}`} key={teacher.id} className="adm-leader-row" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <span className="adm-leader-rank">{toFaDigits(index + 1)}</span>
                  <Avatar size={40} imageUrl={fullUrl(teacher.avatar_url)} />
                  <div className="adm-leader-main">
                    <strong>{teacher.name || 'استاد'}</strong>
                    <small>{teacher.field || 'حوزه آموزشی'}</small>
                  </div>
                  <div className="adm-leader-num">
                    <strong>{toFaDigits(teacher.sessions)} جلسه</strong>
                    <small>
                      <Icon name="star" size={10} fill />
                      {Number(teacher.rating || 0) > 0 ? toFaDigits(Number(teacher.rating).toFixed(1)) : '—'}
                    </small>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </PanelSection>
      </div>

      {confirmedUpcoming.length === 0 && !loading && Number(totals?.pending ?? 0) > 0 && (
        <div className="ops-inline-note" style={{ marginTop: 14 }}>
          <Icon name="clock" size={15} />
          <span>{toFaDigits(totals?.pending ?? 0)} درخواست جلسه در انتظار تأیید استاد است؛ نتیجه از بخش جلسات و اعلان‌ها به شما خبر داده می‌شود.</span>
        </div>
      )}
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
