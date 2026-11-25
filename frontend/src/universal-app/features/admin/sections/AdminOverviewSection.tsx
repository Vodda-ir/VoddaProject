"use client";

/* داشبورد تحلیلی مدیریت — هم‌ارز کامل صفحهٔ اصلی پنل وب ادمین.
 * بازهٔ زمانی، نمودار نبض سامانه، وضعیت جلسات، حوزه‌ها، فعالیت اخیر،
 * برترین استادان و صف بررسی استادان — همهٔ اعداد از /admin/analytics. */

import { useCallback, useEffect, useState } from "react";
import { usePlatform } from "../../../platform/context";
import { Icon, colors, gradients, typography } from "../../../ui";
import { useAppearance } from "../../../ui/appearance";
import { messageOf } from "../../../ui/errorMessage";
import {
  fetchAdminAnalytics,
  fetchAdminTeachers,
  reviewAdminTeacher,
  type AdminAnalytics,
  type AdminTeacherRow,
} from "../api";
import {
  AdminBadge,
  AdminChip,
  AdminEmpty,
  AdminError,
  AdminPanel,
  AdminSectionHead,
  AdminTile,
  DayArea,
  DayBars,
  faCompact,
  faNumber,
  faToman,
  faDateTime,
} from "../AdminUI";

type RangeKey = "7" | "14" | "30";
type ChartTab = "sessions" | "users" | "money";

const SESSION_STATUS_META: Record<string, { label: string; tone: "gold" | "info" | "green" | "rose" }> = {
  pending: { label: "در انتظار تأیید", tone: "gold" },
  confirmed: { label: "تأییدشده", tone: "info" },
  done: { label: "برگزارشده", tone: "green" },
  canceled: { label: "لغوشده", tone: "rose" },
};

const ROLE_BADGE: Record<string, { label: string; tone: "info" | "gold" | "muted" }> = {
  learner: { label: "قرآن‌آموز", tone: "info" },
  teacher: { label: "استاد", tone: "gold" },
  admin: { label: "ادمین", tone: "muted" },
};

const TIER_BADGE: Record<string, { label: string; tone: "info" | "green" | "rose" }> = {
  international: { label: "بین‌المللی", tone: "info" },
  grade2: { label: "کشوری", tone: "green" },
  grade3: { label: "استانی", tone: "rose" },
};

export function AdminOverviewSection() {
  const runtime = usePlatform();
  const { L } = useAppearance();
  const [range, setRange] = useState<RangeKey>("30");
  const [chartTab, setChartTab] = useState<ChartTab>("sessions");
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingTeachers, setPendingTeachers] = useState<AdminTeacherRow[]>([]);
  const [busyTeacherId, setBusyTeacherId] = useState<number | null>(null);
  const [queueNote, setQueueNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rich, queue] = await Promise.all([
        fetchAdminAnalytics(runtime, Number(range)),
        fetchAdminTeachers(runtime, { status: "pending", limit: 6 }),
      ]);
      setAnalytics(rich);
      setPendingTeachers(queue.rows);
    } catch (cause) {
      setError(messageOf(cause, L("داده‌های تحلیلی دریافت نشد.")));
    } finally {
      setLoading(false);
    }
  }, [runtime, range, L]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleReview(id: number, approve: boolean) {
    setBusyTeacherId(id);
    setQueueNote(null);
    try {
      await reviewAdminTeacher(runtime, id, approve);
      setPendingTeachers((rows) => rows.filter((row) => row.id !== id));
      setQueueNote(approve ? L("استاد تأیید شد") : L("استاد رد شد"));
    } catch (cause) {
      setQueueNote(messageOf(cause, L("ثبت تصمیم ناموفق بود")));
    } finally {
      setBusyTeacherId(null);
    }
  }

  const series = analytics?.series ?? [];
  const sessions = analytics?.sessions;
  const finance = analytics?.finance;

  const chartData = series.map((point) => ({
    label: point.date,
    value:
      chartTab === "users" ? point.newUsers
        : chartTab === "money" ? point.charge
          : point.sessionsCreated,
  }));
  const chartSecondary =
    chartTab === "sessions" ? series.map((point) => ({ label: point.date, value: point.sessionsDone }))
      : chartTab === "money" ? series.map((point) => ({ label: point.date, value: point.commission }))
        : undefined;
  const activityTotal = chartData.reduce((sum, point) => sum + point.value, 0);
  const secondaryTotal = (chartSecondary ?? []).reduce((sum, point) => sum + point.value, 0);

  const statusSegments = (analytics?.statusBreakdown ?? []).map((item) => ({
    ...item,
    meta: SESSION_STATUS_META[item.status] ?? { label: item.status, tone: "muted" as const },
  }));
  const statusMax = Math.max(1, ...statusSegments.map((item) => item.count));

  const fields = (analytics?.fields ?? []).slice(0, 6);
  const fieldsMax = Math.max(1, ...fields.map((item) => item.count));

  const completionRate = sessions?.total ? Math.round((sessions.done / sessions.total) * 100) : 0;
  const teachHours = Math.round((sessions?.minutes ?? 0) / 60);

  return (
    <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {([["7", L("۷ روز")], ["14", L("۱۴ روز")], ["30", L("۳۰ روز")]] as Array<[RangeKey, string]>).map(([value, label]) => (
          <AdminChip key={value} active={range === value} label={label} onClick={() => setRange(value)} />
        ))}
        <button
          type="button"
          onClick={() => void load()}
          className="vodda-tappable"
          aria-label={L("به‌روزرسانی")}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 999, border: `1px solid ${colors.sand200}`, background: colors.surface, color: colors.olive700, fontSize: 11.5, fontWeight: 800, cursor: "pointer", fontFamily: typography.fontFamily }}
        >
          <Icon name="refresh" size={13} />
          {L("به‌روزرسانی")}
        </button>
      </div>

      {error ? <AdminError message={error} onRetry={() => void load()} /> : null}

      {loading ? (
        <AdminPanel>
          <span className="vodda-skeleton" style={{ height: 120, borderRadius: 14, display: "block" }} />
          <span className="vodda-skeleton" style={{ height: 120, borderRadius: 14, display: "block" }} />
        </AdminPanel>
      ) : analytics ? (
        <>
          {/* کاشی‌های اصلی */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, minWidth: 0 }}>
            <AdminTile icon="users" label={L("کاربران سامانه")} value={faNumber(analytics.users.total)} hint={`${faNumber(analytics.users.newWeek)} عضو جدید در هفته`} />
            <AdminTile icon="award" label={L("اساتید")} value={faNumber(analytics.users.teachers)} tone="gold" hint={`${faNumber(pendingTeachers.length)} پروفایل در انتظار بررسی`} />
            <AdminTile icon="calendar" label={L("جلسات آموزشی")} value={faNumber(sessions?.total ?? 0)} tone="info" hint={`${faNumber(sessions?.done ?? 0)} برگزارشده · ${faNumber(teachHours)} ساعت`} />
            <AdminTile icon="coins" label={L("کارمزد سامانه")} value={faCompact(finance?.commission ?? 0)} tone="clay" hint={`${faNumber(finance?.pendingWithdrawals ?? 0)} برداشت در صف`} />
            <AdminTile icon="checkCircle" label={L("نرخ تکمیل جلسات")} value={`${faNumber(completionRate)}٪`} hint={`${faNumber(sessions?.canceled ?? 0)} جلسه لغوشده`} />
            <AdminTile icon="star" label={L("رضایت کلی")} value={faNumber(analytics.rating.avg, 1)} tone="gold" hint={`${faNumber(analytics.rating.count)} نظر ثبت‌شده`} />
            <AdminTile icon="wallet" label={L("شارژ کیف پول‌ها")} value={faCompact(finance?.chargeVolume ?? 0)} tone="info" hint={`تعهد کیف پول: ${faCompact(finance?.walletLiability ?? 0)}`} />
            <AdminTile icon="trending" label={L("درآمد استادان")} value={faCompact(finance?.earnings ?? 0)} tone="rose" hint="مجموع تسویه‌شده در دفتر مالی" />
          </div>

          {/* نبض سامانه */}
          <AdminPanel>
            <AdminSectionHead title={L("نبض سامانه")} description={L("روند روزانه شاخص انتخابی در بازهٔ اخیر.")} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <AdminChip active={chartTab === "sessions"} label={L("جلسات")} onClick={() => setChartTab("sessions")} />
              <AdminChip active={chartTab === "users"} label={L("کاربران جدید")} onClick={() => setChartTab("users")} />
              <AdminChip active={chartTab === "money"} label={L("مالی")} onClick={() => setChartTab("money")} />
            </div>
            {chartTab === "sessions" ? (
              <DayBars data={chartData} secondary={chartSecondary} height={150} />
            ) : (
              <DayArea data={chartData} height={150} tone={chartTab === "money" ? "gold" : "olive"} />
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              <SummaryChip label={chartTab === "money" ? L("جمع شارژ") : chartTab === "users" ? L("جمع عضویت‌ها") : L("جلسات ایجادشده")} value={faNumber(activityTotal)} />
              {chartSecondary ? <SummaryChip label={chartTab === "sessions" ? L("برگزارشده") : L("جمع کارمزد")} value={faNumber(secondaryTotal)} /> : null}
              <SummaryChip label={L("میانگین روزانه")} value={faCompact(chartData.length ? Math.round(activityTotal / chartData.length) : 0)} />
            </div>
          </AdminPanel>

          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0, 1fr)", minWidth: 0 }}>
            {/* وضعیت جلسات */}
            <AdminPanel>
              <AdminSectionHead title={L("وضعیت جلسات")} description={L("چرخهٔ حیات همهٔ جلسات ثبت‌شده.")} />
              {statusSegments.length === 0 ? (
                <AdminEmpty icon="calendar" title={L("هنوز جلسه‌ای ثبت نشده")} />
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {statusSegments.map((item) => (
                    <div key={item.status} style={{ display: "grid", gap: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <AdminBadge tone={item.meta.tone}>{L(item.meta.label)}</AdminBadge>
                        <strong style={{ fontSize: 11.5, fontWeight: 800, color: colors.ink }}>{faNumber(item.count)}</strong>
                      </div>
                      <span style={{ display: "block", height: 7, borderRadius: 999, background: colors.sand100, overflow: "hidden" }}>
                        <span style={{ display: "block", height: "100%", width: `${Math.round((item.count / statusMax) * 100)}%`, borderRadius: 999, background: item.meta.tone === "green" ? "#43b07f" : item.meta.tone === "rose" ? colors.danger : item.meta.tone === "info" ? colors.info : colors.gold }} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanel>

            {/* حوزه‌های تدریس */}
            <AdminPanel>
              <AdminSectionHead title={L("حوزه‌های تدریس")} description={L("پراکندگی اساتید بر اساس حوزهٔ کاری.")} />
              {fields.length === 0 ? (
                <AdminEmpty icon="book" title={L("حوزه‌ای ثبت نشده")} />
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {fields.map((field) => (
                    <div key={field.name} style={{ display: "grid", gap: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 800, color: colors.ink, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{field.name}</span>
                        <strong style={{ fontSize: 11, fontWeight: 800, color: colors.olive700, flexShrink: 0 }}>{faNumber(field.count)}</strong>
                      </div>
                      <span style={{ display: "block", height: 7, borderRadius: 999, background: colors.sand100, overflow: "hidden" }}>
                        <span style={{ display: "block", height: "100%", width: `${Math.round((field.count / fieldsMax) * 100)}%`, borderRadius: 999, background: colors.olive500 }} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </AdminPanel>
          </div>

          {/* فعالیت اخیر */}
          <AdminPanel>
            <AdminSectionHead title={L("فعالیت اخیر")} description={L("تازه‌ترین عضویت‌ها و جلسات سامانه.")} />
            <RecentFeed analytics={analytics} L={L} />
          </AdminPanel>

          {/* برترین استادان */}
          <AdminPanel>
            <AdminSectionHead title={L("برترین استادان")} description={L("رتبه‌بندی بر اساس جلسات برگزارشده.")} />
            {(analytics.topTeachers ?? []).length === 0 ? (
              <AdminEmpty icon="award" title={L("استادی برای رتبه‌بندی نیست")} />
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {analytics.topTeachers.slice(0, 7).map((teacher, index) => (
                  <div key={teacher.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 13, background: colors.surfaceSoft, border: `1px solid ${colors.sand150}` }}>
                    <span style={{ width: 26, height: 26, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", background: colors.goldBackground, color: colors.goldDark, fontSize: 11, fontWeight: 900 }}>
                      {faNumber(index + 1)}
                    </span>
                    <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <strong style={{ fontSize: 12.5, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teacher.name}</strong>
                        {TIER_BADGE[teacher.tier] ? <AdminBadge tone={TIER_BADGE[teacher.tier].tone}>{L(TIER_BADGE[teacher.tier].label)}</AdminBadge> : null}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: colors.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {[teacher.field, teacher.city].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </div>
                    <div style={{ flexShrink: 0, display: "grid", justifyItems: "end", gap: 1 }}>
                      <strong style={{ fontSize: 11.5, fontWeight: 800, color: colors.olive700 }}>{faNumber(teacher.doneSessions)} جلسه</strong>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: colors.goldDark }}>★ {faNumber(teacher.rating, 1)} ({faNumber(teacher.reviews)})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>
        </>
      ) : null}

      {/* صف بررسی استادان */}
      <AdminPanel>
        <AdminSectionHead title={L("صف بررسی استادان")} description={L("درخواست‌هایی که هنوز تصمیم مدیریتی برایشان ثبت نشده است.")} />
        {queueNote ? (
          <span role="status" style={{ padding: "9px 12px", borderRadius: 12, background: "#e7f6ee", border: "1px solid rgba(58,167,109,.35)", color: "#2e8f5c", fontSize: 12, fontWeight: 800 }}>
            {queueNote}
          </span>
        ) : null}
        {pendingTeachers.length === 0 ? (
          <AdminEmpty icon="checkCircle" title={L("صف بررسی خالی است")} description={L("در حال حاضر درخواست استادی در انتظار تصمیم وجود ندارد.")} />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {pendingTeachers.map((teacher) => {
              const busy = busyTeacherId === teacher.id;
              return (
                <div key={teacher.id} style={{ display: "grid", gap: 9, padding: "11px 12px", borderRadius: 14, background: colors.surfaceSoft, border: `1px solid ${colors.sand150}`, opacity: busy ? 0.55 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span aria-hidden="true" style={{ width: 38, height: 38, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", background: gradients.soft, border: `1px solid ${colors.goldSoft}`, color: colors.goldDark }}>
                      <Icon name="award" size={18} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
                      <strong style={{ fontSize: 13, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teacher.name}</strong>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: colors.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {[teacher.tag || teacher.field, teacher.city].filter(Boolean).join(" · ") || L("حوزه ثبت نشده")}
                      </span>
                    </div>
                    <AdminBadge tone="gold">{L("در انتظار")}</AdminBadge>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <ReviewButton busy={busy} label={busy ? L("در حال ثبت…") : L("تأیید")} approve onClick={() => void handleReview(teacher.id, true)} />
                    <ReviewButton busy={busy} label={L("رد")} approve={false} onClick={() => void handleReview(teacher.id, false)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminPanel>

      {/* وضعیت مالی */}
      {finance ? (
        <AdminPanel>
          <AdminSectionHead title={L("وضعیت مالی")} description={L("اعداد ثبت‌شده در دفتر مالی سامانه.")} />
          <div style={{ display: "grid", gap: 9 }}>
            <FinanceRow label={L("حجم شارژ ثبت‌شده")} value={finance.chargeVolume} />
            <FinanceRow label={L("کارمزد سامانه")} value={finance.commission} />
            <FinanceRow label={L("درآمد تسویه‌شده استادان")} value={finance.earnings} />
            <FinanceRow label={L("موجودی قابل برداشت کاربران")} value={finance.walletLiability} muted />
            {finance.pendingWithdrawals > 0 ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, background: colors.goldBackground, border: "1px dashed rgba(191,149,64,.5)", color: "#765918", fontSize: 11, fontWeight: 700 }}>
                <Icon name="bell" size={14} />
                {faNumber(finance.pendingWithdrawals)} درخواست برداشت ({faToman(finance.pendingWithdrawalAmount)}) منتظر بررسی است.
              </span>
            ) : null}
          </div>
        </AdminPanel>
      ) : null}
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
      <span style={{ color: colors.inkMuted, fontSize: 10 }}>{label}</span>
      <strong style={{ color: colors.olive700, fontSize: 13 }}>{value}</strong>
    </div>
  );
}

function FinanceRow({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: colors.inkMuted, fontSize: 11 }}>{label}</span>
      <strong style={{ color: muted ? colors.inkMuted : colors.olive700, fontSize: 13 }}>{faToman(value)}</strong>
    </div>
  );
}

function ReviewButton({ busy, label, approve, onClick }: { busy: boolean; label: string; approve: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="vodda-tappable"
      style={{
        flex: "1 1 110px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "10px 12px",
        borderRadius: 12,
        border: approve ? 0 : `1px solid ${colors.sand200}`,
        background: approve ? "linear-gradient(145deg, #43b07f, #2e8f5c)" : colors.surface,
        color: approve ? "#ffffff" : colors.danger,
        fontSize: 12.5,
        fontWeight: 800,
        fontFamily: typography.fontFamily,
        cursor: busy ? "wait" : "pointer",
        opacity: busy ? 0.7 : 1,
      }}
    >
      <Icon name={approve ? "check" : "x"} size={15} />
      {label}
    </button>
  );
}

function RecentFeed({ analytics, L }: { analytics: AdminAnalytics; L: (text: string) => string }) {
  const feed = [
    ...(analytics.recentUsers ?? []).map((user) => ({
      key: `user-${user.id}`,
      icon: "user" as const,
      badge: L(ROLE_BADGE[user.role]?.label ?? "کاربر"),
      tone: (ROLE_BADGE[user.role]?.tone ?? "muted") as "gold",
      title: L(user.name),
      sub: `عضویت در ${faDateTime(user.createdAt)}`,
    })),
    ...(analytics.recentSessions ?? []).map((session) => ({
      key: `session-${session.id}`,
      icon: "calendar" as const,
      badge: L(SESSION_STATUS_META[session.status]?.label ?? session.status),
      tone: (session.status === "done" ? "green" : session.status === "canceled" ? "rose" : "gold") as "gold",
      title: L(session.title),
      sub: `${session.learnerName} × ${session.teacherName} · ${faDateTime(session.scheduledAt)}`,
    })),
  ].slice(0, 9);

  if (feed.length === 0) {
    return <AdminEmpty icon="shield" title={L("فعالیتی ثبت نشده")} />;
  }
  return (
    <div style={{ display: "grid", gap: 7 }}>
      {feed.map((item) => (
        <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span aria-hidden="true" style={{ width: 34, height: 34, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 11, background: gradients.soft, border: `1px solid ${colors.olive100}`, color: colors.olive700 }}>
            <Icon name={item.icon} size={15} />
          </span>
          <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 1 }}>
            <strong style={{ fontSize: 12, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</strong>
            <span style={{ fontSize: 9.5, fontWeight: 600, color: colors.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sub}</span>
          </div>
          <AdminBadge tone={item.tone}>{item.badge}</AdminBadge>
        </div>
      ))}
    </div>
  );
}
