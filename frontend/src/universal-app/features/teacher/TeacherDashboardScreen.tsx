"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { asArray, asNumber, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import type { PlatformRuntime } from "../../platform/types";
import { navigateApp } from "../../router";
import { messageOf } from "../../ui/errorMessage";
import { RoleModeSheet } from "../auth/RoleModeSheet";
import { getTeacherDispatchInbox } from "../dispatch/api";
import { NotificationsBell } from "../notifications/NotificationsBell";
import {
  Avatar,
  Button,
  Card,
  ErrorState,
  formatJalaliDate,
  Icon,
  LoadingState,
  SectionHeader,
  WalletHero,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { formatWalletAmount, toFaDigits } from "../wallet/WalletTransactionCard";

type TeacherSummary = {
  id: number;
  name: string;
  avatarUrl?: string;
  wallet: number;
  rating: number;
  reviews: number;
  sessions: number;
};

type TeacherSession = {
  id: number;
  learnerName: string;
  service: string;
  scheduledAt: string;
  localDate: string;
  localStart: string;
  localEnd: string;
  status: string;
};

type DashboardSnapshot = {
  teacher: TeacherSummary;
  pending: TeacherSession[];
  upcoming: TeacherSession[];
};

/** وضعیت تکمیل پروفایل حرفه‌ای استاد — چک‌لیست راهنمای ورود به کار */
type CompletionState = {
  activeServices: number;
  bioChars: number;
  hasTitle: boolean;
  priceSet: boolean;
  workSlots: number;
};

async function loadCompletionState(runtime: PlatformRuntime): Promise<CompletionState> {
  const [teacherResponse, workTimesResponse] = await Promise.all([
    runtime.request<ApiEnvelope<unknown>>("/teacher/me"),
    runtime.request<ApiEnvelope<unknown[]>>("/teacher/work-times").catch(() => ({ data: [] as unknown[] })),
  ]);
  const row = asRecord(teacherResponse.data) ?? {};
  const services = asArray(row.services).map(asRecord);
  const workTimes = Array.isArray(workTimesResponse.data) ? workTimesResponse.data : [];
  return {
    activeServices: services.filter((service) => service?.active === true).length,
    bioChars: asString(row.bio).trim().length,
    hasTitle: asString(row.field).trim().length > 0 || asString(row.tag).trim().length > 0,
    priceSet: asNumber(row.price30) > 0 || asNumber(row.price60) > 0,
    workSlots: workTimes.length,
  };
}

function parseTeacherSummary(value: unknown): TeacherSummary | null {
  const user = asRecord(value);
  if (!user) return null;
  const teacher = asRecord(user.teacher);

  return {
    id: asNumber(user.id),
    name: asString(user.name, "استاد"),
    avatarUrl: asString(user.avatar_url) || undefined,
    wallet: asNumber(user.wallet),
    rating: asNumber(teacher?.rating),
    reviews: asNumber(teacher?.reviews),
    sessions: asNumber(teacher?.sessions),
  };
}

function parseTeacherSession(value: unknown): TeacherSession | null {
  const session = asRecord(value);
  if (!session) return null;
  const learner = asRecord(session.learner);

  return {
    id: asNumber(session.id),
    learnerName: asString(learner?.name, "قرآن‌آموز"),
    service: asString(session.service ?? session.title, "جلسه"),
    scheduledAt: asString(session.scheduled_at),
    localDate: asString(session.local_date),
    localStart: asString(session.local_start),
    localEnd: asString(session.local_end),
    status: asString(session.status, "pending"),
  };
}

async function getTeacherDashboardSnapshot(runtime: PlatformRuntime): Promise<DashboardSnapshot> {
  const [meResponse, pendingResponse, upcomingResponse] = await Promise.all([
    runtime.request<ApiEnvelope<unknown>>("/me"),
    runtime.request<ApiEnvelope<unknown[]>>("/teacher/sessions?when=pending"),
    runtime.request<ApiEnvelope<unknown[]>>("/teacher/sessions?when=upcoming"),
  ]);

  const teacher = parseTeacherSummary(meResponse.data);
  if (!teacher) throw new Error("اطلاعات حساب استاد دریافت نشد.");

  return {
    teacher,
    pending: (pendingResponse.data ?? []).map(parseTeacherSession).filter((item): item is TeacherSession => item !== null),
    upcoming: (upcomingResponse.data ?? []).map(parseTeacherSession).filter((item): item is TeacherSession => item !== null),
  };
}

function officialTime(session: TeacherSession): string {
  if (!session.localDate || !session.localStart || !session.localEnd) {
    return "زمان رسمی جلسه دریافت نشد";
  }
  return `${formatJalaliDate(session.localDate)} · ${toFaDigits(session.localStart)} تا ${toFaDigits(session.localEnd)}`;
}

export function TeacherDashboardScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [dispatchBadge, setDispatchBadge] = useState(0);
  const [completion, setCompletion] = useState<CompletionState | null>(null);

  const loadDispatchBadge = useCallback(async () => {
    try {
      const inbox = await getTeacherDispatchInbox(runtime);
      const waiting = inbox.offers.filter((offer) => offer.status === "waiting").length;
      setDispatchBadge(inbox.calls.length + waiting);
    } catch {
      // badge is best-effort
    }
  }, [runtime]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await getTeacherDashboardSnapshot(runtime));
    } catch (loadError) {
      setSnapshot(null);
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
    void loadDispatchBadge();
    void loadCompletionState(runtime)
      .then((state) => setCompletion(state))
      .catch(() => setCompletion(null));
    const timer = window.setInterval(() => void loadDispatchBadge(), 12000);
    return () => window.clearInterval(timer);
  }, [load, loadDispatchBadge, runtime]);

  const nextSession = useMemo(() => {
    if (!snapshot) return null;
    const confirmed = snapshot.upcoming.filter((session) => session.status === "confirmed");
    confirmed.sort((left, right) => {
      const leftTime = Date.parse(left.scheduledAt);
      const rightTime = Date.parse(right.scheduledAt);
      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0;
      return leftTime - rightTime;
    });
    return confirmed[0] ?? null;
  }, [snapshot]);

  const teacher = snapshot?.teacher ?? null;
  const pending = snapshot?.pending ?? [];
  const rating = teacher && teacher.reviews > 0 ? teacher.rating.toFixed(1) : "—";
  const firstName = teacher?.name.trim().split(/\s+/)[0] || "";

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          className="vodda-tappable vodda-enter"
          onClick={() => setRoleSheetOpen(true)}
          aria-label="تغییر به فضای قرآن‌آموز"
          style={{
            width: "100%",
            minWidth: 0,
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: "4px 0",
            textAlign: "right",
            border: 0,
            color: colors.ink,
            background: "transparent",
            fontFamily: typography.fontFamily,
            cursor: "pointer",
          }}
        >
          <Avatar name={teacher?.name} src={teacher?.avatarUrl} size={46} ring />
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ ...typography.caption, display: "block", color: colors.inkMuted }}>پنل استاد · {firstName}</span>
            <strong style={{ ...typography.body, display: "inline-flex", alignItems: "center", gap: 5, color: colors.olive700 }}>
              تغییر حساب
              <Icon name="refresh" size={15} stroke={1.9} />
            </strong>
          </span>
        </button>
        <NotificationsBell config={config} />
      </div>

      {loading ? (
        <LoadingState label="در حال دریافت داشبورد استاد…" style={{ minHeight: 180 }} />
      ) : error || !snapshot || !teacher ? (
        <ErrorState
          title="دریافت داشبورد ناموفق بود"
          description={error ?? "اطلاعات داشبورد دریافت نشد."}
          action={<Button onClick={() => void load()}>تلاش دوباره</Button>}
        />
      ) : (
        <>
      <div>
        <WalletHero label="موجودی قابل برداشت" amount={formatWalletAmount(teacher.wallet)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", alignItems: "center" }}>
            {[
              ["امتیاز", (rating === "—" ? rating : toFaDigits(rating)) + " ★"],
              ["نظرها", toFaDigits(teacher.reviews)],
              ["جلسات", toFaDigits(teacher.sessions)],
            ].flatMap(([label, value], index) => {
              const metric = (
                <div key={label} style={{ minWidth: 0, textAlign: "center" }}>
                  <span style={{ display: "block", fontSize: 11, color: "rgba(255,255,255,.60)" }}>{label}</span>
                  <strong style={{ display: "block", marginTop: 3, fontSize: 15, fontWeight: 800, color: colors.surface }}>{value}</strong>
                </div>
              );
              if (index === 2) return [metric];
              return [metric, <span key={label + "-divider"} aria-hidden="true" style={{ width: 1, height: 34, background: "rgba(255,255,255,.24)" }} />];
            })}
          </div>
        </WalletHero>
        <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: 11.5, lineHeight: 1.6, color: colors.inkMuted }}>
          آمار دوره‌ای درآمد تا زمان وجود گزارش واقعی نمایش داده نمی‌شود.
        </p>
      </div>

      <button
        type="button"
        className="vodda-tappable vodda-enter"
        onClick={() => navigateApp("/t/dispatch", config)}
        aria-label="فراخوان‌های زنده"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          borderRadius: 20,
          border: `1px solid ${dispatchBadge > 0 ? colors.olive200 : colors.sand150}`,
          background: dispatchBadge > 0 ? "linear-gradient(135deg, #f2f5ea 0%, #ffffff 62%)" : colors.surface,
          boxShadow: shadows.sm,
          cursor: "pointer",
          fontFamily: typography.fontFamily,
          textAlign: "right",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "grid", placeItems: "center", width: 42, height: 42,
            borderRadius: 14, flex: "0 0 42px",
            background: dispatchBadge > 0 ? colors.olive600 : colors.sand100, color: dispatchBadge > 0 ? colors.surface : colors.inkMuted,
          }}
        >
          <Icon name="bell" size={20} stroke={1.9} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: 14, fontWeight: 800, color: colors.ink }}>
            فراخوان‌های زنده
          </strong>
          <span style={{ display: "block", fontSize: 11.5, color: colors.inkMuted, marginTop: 2, lineHeight: 1.7 }}>
            {dispatchBadge > 0
              ? "🔔 درخواست‌های تازه در موضوع‌های شما — سریع اعلام آمادگی کنید"
              : "درخواست‌های تدریس لحظه‌ای کاربران در موضوع‌های شما"}
          </span>
        </span>
        {dispatchBadge > 0 ? (
          <span
            aria-label={`${dispatchBadge} فراخوان جدید`}
            style={{
              flex: "0 0 auto", minWidth: 24, height: 24, borderRadius: 999,
              display: "grid", placeItems: "center", padding: "0 7px",
              background: colors.gold, color: "#fff", fontSize: 12, fontWeight: 800,
            }}
          >
            {toFaDigits(dispatchBadge)}
          </span>
        ) : (
          <Icon name="chevronL" size={16} style={{ flex: "0 0 auto", color: colors.inkFaint }} />
        )}
      </button>

      {completion ? <CompletionChecklist state={completion} config={config} /> : null}

      {pending.length > 0 ? (
        <button
          type="button"
          className="vodda-tappable"
          onClick={() => navigateApp("/t/requests", config)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 13,
            padding: 16,
            textAlign: "right",
            border: "1px solid " + colors.goldSoft,
            borderRadius: 24,
            color: colors.ink,
            background: colors.goldBackground,
            fontFamily: typography.fontFamily,
            cursor: "pointer",
          }}
        >
          <Icon name="message" size={27} style={{ flex: "0 0 auto", color: colors.gold }} />
          <span style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: "#7a5e1e" }}>{toFaDigits(pending.length)} درخواست جدید</strong>
            <span style={{ display: "block", marginTop: 2, fontSize: 12, color: "#9a7426" }}>برای تأیید یا رد، لمس کنید</span>
          </span>
          <Icon name="chevronL" size={20} style={{ color: "#9a7426" }} />
        </button>
      ) : null}

      {nextSession ? (
        <section>
          <SectionHeader title="جلسهٔ بعدی شما" action="همهٔ جلسات" onAction={() => navigateApp("/t/sessions", config)} />
          <Card
            style={{
              display: "grid",
              gap: 13,
              marginTop: spacing.md,
              padding: 15,
              borderRadius: 24,
              boxShadow: "0 0 6px rgba(46,54,34,.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={nextSession.learnerName} size={46} ring={false} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: colors.ink }}>{nextSession.learnerName}</strong>
                <span style={{ display: "block", marginTop: 3, fontSize: 12.5, color: colors.inkSecondary }}>{nextSession.service}</span>
              </div>
              <span style={{ padding: "5px 9px", borderRadius: radii.pill, color: colors.surface, background: colors.olive600, ...typography.caption, fontWeight: 700 }}>
                تأییدشده
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 14px", borderRadius: 13, color: colors.inkSecondary, background: colors.sand50, fontSize: 12.5 }}>
              <Icon name="calendar" size={16} style={{ color: colors.olive500 }} />
              {officialTime(nextSession)}
            </div>
            <Button variant="secondary" fullWidth onClick={() => navigateApp("/t/sessions", config)}>
              مشاهدهٔ جزئیات جلسه
            </Button>
          </Card>
        </section>
      ) : null}

      <section>
        <SectionHeader title="مدیریت سریع" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: spacing.md }}>
          {([
            ["book" as const, "خدمات من", "/t/services"],
            ["clock" as const, "زمان‌های کاری", "/t/work-times"],
            ["wallet" as const, "کیف پول", "/t/wallet"],
            ["calendar" as const, "همهٔ جلسات", "/t/sessions"],
            ["users" as const, "پذیرش مراسم", "/t/ceremony"],
            ["mic" as const, "خدمات حضوری", "/t/presence"],
          ] as const).map(([icon, label, path]) => (
            <button
              key={path}
              type="button"
              onClick={() => navigateApp(path, config)}
              className="vodda-tappable"
              style={{
                minHeight: 68,
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: 14,
                textAlign: "right",
                border: 0,
                borderRadius: 18,
                color: colors.ink,
                background: colors.surface,
                boxShadow: "0 0 4px rgba(46,54,34,.04)",
                fontFamily: typography.fontFamily,
                cursor: "pointer",
              }}
            >
              <span style={{ width: 40, height: 40, display: "grid", placeItems: "center", flex: "0 0 40px", borderRadius: 12, color: colors.olive700, background: colors.olive100 }}>
                <Icon name={icon} size={21} />
              </span>
              <strong style={{ minWidth: 0, fontSize: 13, fontWeight: 700 }}>{label}</strong>
            </button>
          ))}
        </div>
      </section>

        </>
      )}

      <RoleModeSheet
        open={roleSheetOpen}
        mode="teacher"
        config={config}
        onClose={() => setRoleSheetOpen(false)}
      />
    </section>
  );
}

/** چک‌لیست تکمیل پروفایل استادی — تا استاد تازه‌وارد قدم‌به‌قدم حرفه‌ای شود. */
function CompletionChecklist({ state, config }: { state: CompletionState; config: UniversalAppConfig }) {
  const items = useMemo(
    () =>
      [
        {
          icon: "book" as const,
          title: "ثبت حداقل یک خدمت فعال",
          hint: "خدمت آنلاین شما را برای رزرو کردن باز می‌کند",
          done: state.activeServices > 0,
          meta: state.activeServices > 0 ? `${toFaDigits(state.activeServices)} خدمت فعال` : "ثبت خدمت",
          path: "/t/services",
        },
        {
          icon: "user" as const,
          title: "معرفی و تخصص حرفه‌ای",
          hint: "معرفی حداقل ۴۰ حرفی به‌همراه حوزه تخصص یا عنوان استاد",
          done: state.bioChars >= 40 && state.hasTitle,
          meta: state.bioChars >= 40 ? (state.hasTitle ? "کامل شد" : "افزودن عنوان") : "تکمیل معرفی",
          path: "/t/profile",
        },
        {
          icon: "coins" as const,
          title: "تعرفهٔ جلسات ۳۰ و ۶۰ دقیقه‌ای",
          hint: "تعرفهٔ شفاف، شانس ظاهرشدن در فراخوان‌ها را بالا می‌برد",
          done: state.priceSet,
          meta: state.priceSet ? "تعریف شده" : "تعیین تعرفه",
          path: "/t/profile",
        },
        {
          icon: "clock" as const,
          title: "زمان‌های کاری هفتگی",
          hint: "ساعات حضور شما برای رزروهای خودکار",
          done: state.workSlots > 0,
          meta: state.workSlots > 0 ? `${toFaDigits(state.workSlots)} بازه` : "افزودن بازه",
          path: "/t/work-times",
        },
      ] as const,
    [state],
  );

  const doneCount = items.filter((item) => item.done).length;
  const percent = Math.round((doneCount / items.length) * 100);
  // پروفایل کامل — نیازی به یادآوری نیست
  if (percent >= 100) return null;

  return (
    <section
      className="vodda-enter"
      aria-label="تکمیل پروفایل استادی"
      style={{
        display: "grid",
        gap: 12,
        padding: 16,
        borderRadius: 22,
        border: `1px solid ${colors.goldSoft}`,
        background: `linear-gradient(150deg, ${colors.goldBackground} 0%, ${colors.surface} 55%)`,
        boxShadow: shadows.sm,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            width: 38, height: 38, display: "grid", placeItems: "center", flex: "0 0 38px",
            borderRadius: 12, background: "linear-gradient(145deg, #d8b869, #b8923c)", color: "#fff",
          }}
        >
          <Icon name="award" size={20} stroke={2} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ display: "block", fontSize: 14, fontWeight: 800, color: colors.ink }}>
            پروفایل استادی خود را کامل کنید
          </strong>
          <span style={{ display: "block", fontSize: 11.5, color: colors.inkMuted, marginTop: 1 }}>
            پروفایل کامل = اعتماد بیشتر و رزروهای بیشتر
          </span>
        </div>
        <strong
          aria-label={`${percent} درصد تکمیل`}
          style={{
            flex: "0 0 auto", minWidth: 44, textAlign: "center",
            padding: "5px 9px", borderRadius: 999, fontSize: 12.5, fontWeight: 800,
            color: "#7a5e1e", background: colors.goldBackground, border: `1px solid ${colors.goldSoft}`,
          }}
        >
          ٪{toFaDigits(percent)}
        </strong>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        style={{ height: 6, borderRadius: 999, background: colors.sand100, overflow: "hidden" }}
      >
        <span
          style={{
            display: "block", height: "100%", borderRadius: 999,
            width: `${percent}%`,
            background: "linear-gradient(90deg, #b8923c, #d8b869)",
            transition: "width 420ms cubic-bezier(.2,.9,.3,1)",
          }}
        />
      </div>

      <div style={{ display: "grid", gap: 7 }}>
        {items.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={() => navigateApp(item.path, config)}
            className="vodda-tappable"
            aria-label={`${item.title} — ${item.done ? "انجام شده" : "انجام نشده"}`}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", textAlign: "right",
              border: `1px solid ${item.done ? colors.olive100 : colors.sand150}`,
              borderRadius: 15,
              background: item.done ? colors.olive50 : colors.surface,
              color: colors.ink,
              fontFamily: typography.fontFamily,
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 26, height: 26, display: "grid", placeItems: "center", flex: "0 0 26px",
                borderRadius: "50%",
                background: item.done ? colors.olive600 : colors.sand100,
                color: item.done ? colors.surface : colors.inkFaint,
              }}
            >
              <Icon name={item.done ? "check" : item.icon} size={14} stroke={2.4} />
            </span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <strong
                style={{
                  display: "block", fontSize: 13, fontWeight: item.done ? 600 : 800,
                  color: item.done ? colors.olive700 : colors.ink,
                }}
              >
                {item.title}
              </strong>
              <span style={{ display: "block", fontSize: 11, color: colors.inkMuted, marginTop: 1, lineHeight: 1.6 }}>
                {item.hint}
              </span>
            </span>
            <span
              style={{
                flex: "0 0 auto", fontSize: 11, fontWeight: 700,
                color: item.done ? colors.olive600 : "#9a7426",
              }}
            >
              {item.meta}
            </span>
            <Icon name="chevronL" size={15} style={{ flex: "0 0 auto", color: colors.inkFaint }} />
          </button>
        ))}
      </div>
    </section>
  );
}
