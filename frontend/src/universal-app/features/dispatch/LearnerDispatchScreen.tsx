"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { PlatformHttpError } from "../../platform/http";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { CornerOrnament } from "../../ui/ornaments";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  IllustrationDispatch,
  LoadingState,
  MenuSelect,
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  typography,
  type MenuGroup,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { showToast } from "../../ui/toast";
import { useAppearance } from "../../ui/appearance";
import { formatAppDate, formatAppDateTime, persianWeekdayIndex } from "../../ui/jalali";
import { payViaSamanGate } from "../../../lib/saman-gate";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";
import { SelectField } from "../ceremony/fields";
import {
  isWhenInFuture,
  tehranWallToRfc3339,
  upcomingJalaliDays,
  type WhenValue,
} from "../ceremony/schedule";
import { localizedDigits } from "../../ui/persian";
import {
  cancelDispatchCall,
  chooseDispatchOffer,
  createDispatchCall,
  declineDispatchOffer,
  getCatalog,
  getCurrentDispatchCall,
} from "./api";
import type { DispatchCandidate, DispatchCallView, OfficialService } from "./types";

function fa(n: number, lang: "fa" | "en"): string {
  return new Intl.NumberFormat(lang === "en" ? "en-US" : "fa-IR").format(n);
}

function priceLabel(n: number, lang: "fa" | "en", L: (text: string) => string): string {
  return n === 0 ? L("رایگان") : L("{n} تومان").replace("{n}", localizedDigits(formatWalletAmount(Math.max(0, n)), lang));
}

/** باگ dispatch-stuck-pending — پیام دقیق وقتی فراخوان فعالِ قبلی هنوز باز است. */
const PENDING_CALL_MESSAGE = "فراخوان قبلی شما در انتظار پاسخ است — ابتدا آن را لغو کنید.";

function timeLabelOf(
  call: { flexible: boolean; scheduled_at?: string | null },
  lang: "fa" | "en",
  L: (text: string) => string,
): string {
  if (call.flexible || !call.scheduled_at) return L("جلسهٔ فوری — همین حالا");
  const at = new Date(call.scheduled_at);
  if (Number.isNaN(at.getTime())) return L("در اسرع وقت");
  const now = new Date();
  const diffMin = Math.round((at.getTime() - now.getTime()) / 60000);
  if (diffMin < 60 && diffMin > -60) return L("حدود {n} دقیقهٔ دیگر").replace("{n}", fa(Math.max(0, diffMin), lang));
  return formatAppDateTime(call.scheduled_at, lang, { withWeekday: true });
}

function remainingSeconds(expiresAt: string): number {
  const at = new Date(expiresAt).getTime();
  if (Number.isNaN(at)) return 0;
  return Math.max(0, Math.round((at - Date.now()) / 1000));
}

function countdownLabel(total: number, lang: "fa" | "en"): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${localizedDigits(String(m).padStart(2, "0"), lang)}:${localizedDigits(String(s).padStart(2, "0"), lang)}`;
}

/* رنگ/برچسب درجه از منبع واحد tierMeta — ۱.الف.۲: آبی بین‌المللی، سبز کشوری، قرمز استانی */
const tierBadge: Record<string, { label: string; bg: string; color: string }> = {
  international: { label: "استاد بین‌المللی", bg: "rgba(29,161,242,.12)", color: "#0095F6" },
  grade2: { label: "برگزیدهٔ کشوری", bg: "rgba(34,197,94,.12)", color: "#3AA76D" },
  grade3: { label: "برگزیدهٔ استانی", bg: "rgba(239,68,68,.12)", color: "#E1306C" },
};

function TopicIcon({ icon, size = 22 }: { icon: string; size?: number }) {
  const known = new Set([
    "book", "mic", "quran", "star", "headphones", "award", "sparkle",
    "doc", "heart", "users", "grid", "list", "trending", "refresh",
  ]);
  return <Icon name={(known.has(icon) ? icon : "book") as "book"} size={size} />;
}

function candidateTitle(candidate: DispatchCandidate): string {
  return candidate.tag || candidate.field || "استاد قرآن";
}

function CandidateCard({
  candidate,
  index,
  busy,
  call,
  onChoose,
  onDecline,
}: {
  candidate: DispatchCandidate;
  index: number;
  busy: boolean;
  call: { flexible: boolean; scheduled_at?: string | null } | null;
  onChoose: () => void;
  onDecline: () => void;
}) {
  const { L, lang, N } = useAppearance();
  const badge = tierBadge[candidate.tier];
  return (
    <div
      className="vodda-enter"
      style={{
        border: `1px solid ${colors.sand200}`,
        borderRadius: 18,
        padding: 14,
        display: "grid",
        gap: 10,
        background: colors.surface,
        animationDelay: `${index * 90}ms`,
        boxShadow: shadows.sm,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <Avatar name={candidate.name} src={candidate.avatar_url || undefined} size={52} ring={false} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 15, fontWeight: 800, color: colors.ink }}>{N(candidate.name)}</strong>
            {badge ? (
              <span style={{ fontSize: 10, fontWeight: 700, color: badge.color, background: badge.bg, borderRadius: 999, padding: "2px 8px" }}>
                {L(badge.label)}
              </span>
            ) : null}
          </div>
          <span style={{ display: "block", fontSize: 12, color: colors.olive700, marginTop: 2 }}>
            {L(candidateTitle(candidate))}
            {candidate.sessions > 0 ? L(" · {n} جلسه").replace("{n}", fa(candidate.sessions, lang)) : ""}
            {candidate.reviews > 0 ? ` · ⭐ ${localizedDigits(candidate.rating.toFixed(1), lang)}` : ""}
          </span>
        </div>
        <div
          aria-hidden="true"
          style={{
            width: 30, height: 30, borderRadius: "50%", flex: "0 0 30px",
            display: "grid", placeItems: "center",
            background: colors.successBackground, color: colors.olive600,
          }}
        >
          <Icon name="checkCircle" size={16} stroke={2.2} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {/* ساعت واقعی فراخوان — نه همیشه «فوری»؛ فراخوان زمان‌مند ساعت خودش را نشان می‌دهد */}
        <span style={chipStyle}>{timeLabelOf(call ?? { flexible: true }, lang, L)}</span>
        <span style={chipStyle}>
          <Icon name="clock" size={11} /> {L("{n} دقیقه").replace("{n}", fa(candidate.duration, lang))}
        </span>
        <span style={{ ...chipStyle, color: colors.olive700, fontWeight: 800, background: colors.olive50, borderColor: colors.olive200 }}>
          {priceLabel(candidate.price, lang, L)}
        </span>
      </div>

      <div style={{ display: "flex", gap: spacing.sm }}>
        <button
          type="button"
          className="vodda-tappable"
          onClick={onDecline}
          disabled={busy}
          style={{ ...fancyGhost, minHeight: 44, flex: "0 0 auto", width: "auto", minWidth: 96, paddingInline: 16, opacity: busy ? 0.6 : 1 }}
        >
          {L("رد")}
        </button>
        <button
          type="button"
          className="vodda-tappable"
          onClick={onChoose}
          disabled={busy}
          style={{ ...fancyPrimary, minHeight: 44, flex: 1, opacity: busy ? 0.65 : 1, cursor: busy ? "wait" : "pointer" }}
        >
          {busy ? L("در حال ثبت…") : L("انتخاب و رزرو این استاد")}
          <Icon name="checkCircle" size={16} />
        </button>
      </div>
    </div>
  );
}

const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11.5,
  color: colors.inkSecondary,
  background: colors.sand100,
  border: `1px solid ${colors.sand200}`,
  borderRadius: 999,
  padding: "3px 9px",
};

type ScreenMode = "idle" | "searching" | "matched";

/* ─── دکمه‌های فانتزی فراخوان — گرادیانی/پیل به‌جای کادر ─── */
const fancyPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 50,
  paddingInline: 20,
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
  fontFamily: typography.fontFamily,
  fontWeight: 800,
  fontSize: 14,
  color: colors.onOlive,
  background: gradients.hero,
  boxShadow: shadows.olive,
  width: "100%",
};

const fancyGold: React.CSSProperties = {
  ...fancyPrimary,
  color: "#fffaf0",
  background: "linear-gradient(145deg,#d8b869,#b8923c)",
  boxShadow: "0 10px 26px rgba(184,146,60,.38)",
};

const fancyGhost: React.CSSProperties = {
  ...fancyPrimary,
  color: colors.inkSecondary,
  background: colors.surface,
  border: `1.5px solid ${colors.sand200}`,
  boxShadow: "none",
  fontWeight: 700,
};

export function LearnerDispatchScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { L, lang, N } = useAppearance();
  const [catalog, setCatalog] = useState<OfficialService[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<OfficialService | null>(null);
  const [note, setNote] = useState("");
  const [whenMode, setWhenMode] = useState<"now" | "later">("now");
  const [when, setWhen] = useState<WhenValue>(() => {
    const nowHour = new Date().getHours();
    return { localDate: upcomingJalaliDays(1)[0]?.localDate ?? "", hh: Math.min(Math.max(nowHour + 2, 8), 22), mm: 0 };
  });
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState("");
  const [view, setView] = useState<DispatchCallView | null>(null);
  const [busyOffer, setBusyOffer] = useState(0);
  const [canceling, setCanceling] = useState(false);
  const [resuming, setResuming] = useState(true);
  const [payMethod, setPayMethod] = useState<"wallet" | "gateway">("gateway");
  const [tick, setTick] = useState(0);
  // ویزارد مرحله‌ای فراخوان — هر مرحله چرخهٔ مستقل خودش: ۰ موضوع، ۱ زمان، ۲ ثبت
  const [composerStep, setComposerStep] = useState(0);
  const pollRef = useRef<number | null>(null);
  /** فراخوانی که کاربر با «فراخوان جدید» از آن عبور کرده — تا کارت موفقیت
   *  دوباره روی آهنگ‌ساز تحمیل نشود و بتوان فراخوان تازه ساخت. */
  const dismissedCallIdRef = useRef(0);

  const call = view?.call ?? null;
  const mode: ScreenMode = call ? (call.status === "searching" ? "searching" : "matched") : "idle";

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError("");
    try {
      setCatalog(await getCatalog(runtime));
    } catch (error) {
      setCatalogError(messageOf(error, "دریافت فهرست موضوعات ناموفق بود."));
    } finally {
      setCatalogLoading(false);
    }
  }, [runtime]);

  const refresh = useCallback(async () => {
    try {
      const current = await getCurrentDispatchCall(runtime);
      const dismissed = dismissedCallIdRef.current;
      if (current.call && dismissed > 0 && current.call.id === dismissed && current.call.status !== "searching") {
        // کاربر آگاهانه «فراخوان جدید» را زده — آهنگ‌ساز باید باز بماند
        setView({ call: null, candidates: [] });
      } else {
        setView(current);
      }
    } catch {
      // polling errors are non-fatal
    } finally {
      setResuming(false);
    }
  }, [runtime]);

  useEffect(() => {
    void loadCatalog();
    void refresh();
  }, [loadCatalog, refresh]);

  // Live polling while a call is active.
  useEffect(() => {
    if (mode === "idle") return;
    pollRef.current = window.setInterval(() => {
      void refresh();
      setTick((value) => value + 1);
    }, 2500);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [mode, refresh]);

  const secondsLeft = useMemo(
    () => (call ? remainingSeconds(call.expires_at) : 0),
    // recompute when the poll tick advances so the countdown stays live
    [call, tick],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, OfficialService[]>();
    for (const item of catalog) {
      const rows = groups.get(item.category) ?? [];
      rows.push(item);
      groups.set(item.category, rows);
    }
    return [...groups.entries()];
  }, [catalog]);

  /* گزینه‌های شمسی «زمان مشخص» — هم‌سو با فرم مراسم (A3/B1) */
  const dayOptions = useMemo(
    () =>
      upcomingJalaliDays(7).map((day, index) => {
        const [gy, gm, gd] = day.localDate.split("-").map(Number);
        const weekdayIndex = persianWeekdayIndex(new Date(gy, gm - 1, gd).getDay());
        if (lang === "en") {
          const dateLabel = formatAppDate(day.localDate, "en", { withWeekday: weekdayIndex, withYear: false });
          const prefix = index === 0 ? L("امروز") : index === 1 ? L("فردا") : "";
          return { value: day.localDate, label: prefix ? `${prefix} — ${dateLabel}` : dateLabel };
        }
        const prefix = index === 0 ? L("امروز") : index === 1 ? L("فردا") : day.weekday;
        return { value: day.localDate, label: `${prefix} — ${day.dayLabel}` };
      }),
    [lang, L],
  );

  const timeOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    for (let hh = 8; hh <= 23; hh += 1) {
      for (const mm of [0, 30]) {
        options.push({
          value: `${hh}:${mm}`,
          label: `${localizedDigits(String(hh).padStart(2, "0"), lang)}:${localizedDigits(String(mm).padStart(2, "0"), lang)}`,
        });
      }
    }
    return options;
  }, [lang]);

  const start = useCallback(async () => {
    if (!selectedTopic || creating) return;
    if (whenMode === "later" && !isWhenInFuture(when)) {
      setActionError(L("زمان انتخاب‌شده باید حداقل ۱۵ دقیقه در آینده باشد."));
      return;
    }
    setCreating(true);
    setActionError("");
    try {
      // باگ dispatch-stuck-pending — پیش از ثبت، فراخوان فعال قبلی بررسی می‌شود تا کاربر
      // به‌جای خطای مبهم سرور، پیام دقیق بگیرد و همان فراخوان با دکمهٔ لغو نمایش داده شود.
      const precheck = await getCurrentDispatchCall(runtime);
      if (precheck.call && (precheck.call.status === "searching" || precheck.call.status === "matched")) {
        setView(precheck);
        setActionError(PENDING_CALL_MESSAGE);
        return;
      }
      const scheduledAt = whenMode === "later" ? tehranWallToRfc3339(when) || null : null;
      const created = await createDispatchCall(runtime, {
        officialServiceId: selectedTopic.id,
        note,
        scheduledAt,
        flexible: whenMode === "now",
      });
      showToast(L("فراخوان شما برای اساتید این موضوع ارسال شد"));
      setView(created);
    } catch (error) {
      // رقابت احتمالی (مثلاً ثبت در دستگاه دیگر): وضعیت واقعی را بگیر؛
      // اگر فراخوان فعال هست، همان با دکمهٔ لغو نشان داده می‌شود نه خطای بی‌مسیر.
      try {
        const current = await getCurrentDispatchCall(runtime);
        if (current.call && (current.call.status === "searching" || current.call.status === "matched")) {
          setView(current);
          setActionError(PENDING_CALL_MESSAGE);
          return;
        }
      } catch {
        // بررسی وضعیت ناموفق بود — پیام اصلی خطا نشان داده می‌شود
      }
      setActionError(messageOf(error, "ثبت فراخوان انجام نشد."));
    } finally {
      setCreating(false);
    }
  }, [creating, note, runtime, selectedTopic, when, whenMode, L]);

  const cancel = useCallback(async () => {
    if (!call || canceling) return;
    setCanceling(true);
    setActionError("");
    try {
      await cancelDispatchCall(runtime, call.id);
      setView({ call: null, candidates: [] });
    } catch (error) {
      setActionError(messageOf(error, "لغو فراخوان انجام نشد."));
    } finally {
      setCanceling(false);
    }
  }, [call, canceling, runtime]);

  const choose = useCallback(
    async (offerId: number) => {
      if (!call || busyOffer) return;
      setBusyOffer(offerId);
      setActionError("");
      try {
        // پاسخ رایگان (قیمت صفر) بدون انتخاب روش پرداخت رزرو می‌شود.
        const offer = (view?.candidates ?? []).find((item) => item.offer_id === offerId);
        const method = offer && offer.price === 0 ? "" : payMethod;
        const result = await chooseDispatchOffer(runtime, call.id, offerId, method);
        await refresh();
        if (result.token) {
          // پست فرم توکن به OnlinePG از مرورگر کاربر — دقیقاً مثل منافسه، در همان تب
          payViaSamanGate(result.token);
        }
      } catch (error) {
        if (payMethod === "wallet" && error instanceof PlatformHttpError && error.status === 400) {
          setActionError(L("کیف پول شما کافی نیست. ابتدا کیف پول را شارژ کنید یا پرداخت آنلاین را برگزینید."));
        } else {
          setActionError(messageOf(error, "ثبت رزرو انجام نشد."));
        }
        await refresh();
      } finally {
        setBusyOffer(0);
      }
    },
    [busyOffer, call, payMethod, refresh, runtime, view, L],
  );

  const decline = useCallback(
    async (offerId: number) => {
      if (!call || busyOffer) return;
      setBusyOffer(offerId);
      setActionError("");
      try {
        const updated = await declineDispatchOffer(runtime, call.id, offerId);
        setView(updated);
      } catch (error) {
        setActionError(messageOf(error, "رد پاسخ انجام نشد."));
      } finally {
        setBusyOffer(0);
      }
    },
    [busyOffer, call, runtime],
  );

  // ── success state ──
  if (mode === "matched" && call) {
    const candidate = (view?.candidates ?? []).find((item) => item.teacher_id === call.matched_teacher_id);
    // پنجرهٔ درگاه رها شده — کارت موفقیت دروغ است؛ کارت «پرداخت ناتمام» با
    // راهنمای پرداخت دوباره نمایش داده می‌شود تا جلسهٔ awaiting گم نشود.
    const awaitingPayment = view?.payment_state === "awaiting_payment";
    if (awaitingPayment) {
      return (
        <div className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
          <Card elevated className="vodda-enter" style={{ display: "grid", gap: spacing.lg, textAlign: "center", padding: 22 }}>
            <div
              aria-hidden="true"
              style={{
                width: 76, height: 76, display: "grid", placeItems: "center", marginInline: "auto",
                borderRadius: "50%", color: "#fffaf0", background: "linear-gradient(145deg,#d8b869,#b8923c)",
                boxShadow: "0 10px 26px rgba(184,146,60,.38)",
              }}
            >
              <Icon name="clock" size={34} stroke={2.2} />
            </div>
            <div>
              <h2 style={{ ...typography.title, margin: 0 }}>{L("پرداخت رزرو ناتمام ماند")}</h2>
              <p style={{ ...typography.body, color: colors.inkSecondary, marginBottom: 0, marginTop: 6 }}>
                {L("انتخاب استاد ثبت شد اما پرداخت آنلاین کامل نشد. تا {n} دقیقه فرصت دارید از بخش جلسات، پرداخت را دوباره انجام دهید تا رزرو قطعی شود؛ پس از آن رزرو آزاد می‌شود.")
                  .replace("{n}", fa(45, lang))}
              </p>
            </div>
            {candidate ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "right", background: colors.sand100, borderRadius: 16, padding: 12 }}>
                <Avatar name={candidate.name} src={candidate.avatar_url || undefined} size={48} ring={false} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ display: "block", fontSize: 14.5, color: colors.ink }}>{N(candidate.name)}</strong>
                  <span style={{ fontSize: 12, color: colors.inkMuted }}>
                    {priceLabel(candidate.price, lang, L)} · {timeLabelOf(call, lang, L)}
                  </span>
                </div>
              </div>
            ) : null}
            <Button fullWidth onClick={() => navigateApp("/sessions", config)}>{L("پرداخت دوباره از جلسات من")}</Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                if (call) dismissedCallIdRef.current = call.id;
                setView({ call: null, candidates: [] });
                void refresh();
              }}
            >
              {L("فراخوان جدید")}
            </Button>
          </Card>
        </div>
      );
    }
    return (
      <div className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
        <Card elevated className="vodda-enter" style={{ display: "grid", gap: spacing.lg, textAlign: "center", padding: 22 }}>
          <div
            aria-hidden="true"
            style={{
              width: 76, height: 76, display: "grid", placeItems: "center", marginInline: "auto",
              borderRadius: "50%", color: colors.onOlive, background: gradients.hero, boxShadow: shadows.olive,
            }}
          >
            <Icon name="checkCircle" size={36} stroke={2.2} />
          </div>
          <div>
            <h2 style={{ ...typography.title, margin: 0 }}>{L("جلسه شما رزرو شد 🎉")}</h2>
            <p style={{ ...typography.body, color: colors.inkSecondary, marginBottom: 0, marginTop: 6 }}>
              {L("موضوع «{topic}» با استاد {name} ثبت شد و در انتظار تأیید نهایی استاد است.")
                .replace("{topic}", L(call.topic_title))
                .replace("{name}", N(candidate?.name ?? "انتخاب‌شده"))}
            </p>
          </div>
          {candidate ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "right", background: colors.sand100, borderRadius: 16, padding: 12 }}>
              <Avatar name={candidate.name} src={candidate.avatar_url || undefined} size={48} ring={false} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ display: "block", fontSize: 14.5, color: colors.ink }}>{N(candidate.name)}</strong>
                <span style={{ fontSize: 12, color: colors.inkMuted }}>
                  {priceLabel(candidate.price, lang, L)} · {timeLabelOf(call, lang, L)}
                </span>
              </div>
            </div>
          ) : null}
          <Button fullWidth onClick={() => navigateApp("/sessions", config)}>{L("پیگیری در جلسات من")}</Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              if (call) dismissedCallIdRef.current = call.id;
              setView({ call: null, candidates: [] });
              void refresh();
            }}
          >
            {L("فراخوان جدید")}
          </Button>
        </Card>
      </div>
    );
  }

  // ── live searching state ──
  if (mode === "searching" && call) {
    return (
      <div className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
        <div
          className="vodda-enter"
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 22,
            padding: 20,
            color: colors.onOlive,
            background: gradients.deep,
            boxShadow: shadows.olive,
          }}
        >
          <span aria-hidden="true" className="vodda-dispatch-pulse" style={{ position: "absolute", insetInlineStart: 18, top: 18 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 15, background: "rgba(255,255,255,.14)" }}>
              <TopicIcon icon={call.topic_icon} size={24} />
            </div>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: 16.5, fontWeight: 800 }}>{L(call.topic_title)}</strong>
              <span style={{ fontSize: 12.5, opacity: 0.85 }}>{timeLabelOf(call, lang, L)}</span>
            </div>
            <div style={{ marginInlineStart: "auto", textAlign: "center" }}>
              <strong dir="ltr" style={{ display: "block", fontSize: 19, fontVariantNumeric: "tabular-nums" }}>
                {countdownLabel(secondsLeft, lang)}
              </strong>
              <span style={{ fontSize: 11.5, opacity: 0.78 }}>{L("مهلت فراخوان")}</span>
            </div>
          </div>
          <p style={{ margin: "14px 0 0", fontSize: 13, lineHeight: 1.9, opacity: 0.92 }}>
            {L("درخواست شما بین همه اساتید این موضوع پخش شد. استادانی که زودتر اعلام آمادگی کنند، همین‌جا زنده نمایش داده می‌شوند.")}
          </p>
        </div>

        {call.note ? (
          <Card style={{ padding: 14, borderRadius: 18, display: "flex", gap: 9, alignItems: "flex-start" }}>
            <Icon name="message" size={17} />
            <p style={{ margin: 0, fontSize: 13, color: colors.inkSecondary, lineHeight: 1.9 }}>{L(call.note)}</p>
          </Card>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <strong style={{ fontSize: 15, color: colors.ink }}>{L("استادهای آماده")}</strong>
          <span style={{ background: colors.olive600, color: colors.onOlive, borderRadius: 999, fontSize: 12, fontWeight: 800, padding: "2px 10px" }}>
            {fa((view?.candidates ?? []).length, lang)}
          </span>
          <span style={{ marginInlineStart: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: colors.olive700 }}>
            <span aria-hidden="true" style={liveDotStyle} /> {L("زنده")}
          </span>
        </div>

        {(view?.candidates ?? []).length > 0 && (view?.candidates ?? []).every((item) => item.price === 0) ? (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "11px 13px",
              borderRadius: 16,
              background: colors.goldBackground,
              border: `1px solid ${colors.gold}`,
              color: colors.goldDark,
              fontSize: 12.5,
              fontWeight: 700,
              lineHeight: 1.8,
            }}
          >
            <Icon name="gift" size={17} stroke={2.2} style={{ flex: "0 0 auto" }} />
            <span>{L("همهٔ پاسخ‌های این فراخوان")} <b>{L("رایگان")}</b>{L("هستند؛ با انتخاب استاد، جلسه بدون پرداخت ثبت می‌شود.")}</span>
          </div>
        ) : (
          <div
            role="radiogroup"
            aria-label={L("روش پرداخت")}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 6, borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.surface }}
          >
            {([
              ["gateway", L("پرداخت آنلاین (سامان)")],
              ["wallet", L("پرداخت از کیف پول")],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={payMethod === value}
                onClick={() => setPayMethod(value)}
                style={{
                  padding: "10px 8px",
                  borderRadius: 11,
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: payMethod === value ? colors.onOlive : colors.inkSecondary,
                  background: payMethod === value ? colors.olive600 : "transparent",
                  border: "none",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {(view?.candidates ?? []).length === 0 ? (
          <Card style={{ padding: 20, borderRadius: 20, textAlign: "center" }}>
            <div style={{ display: "grid", placeItems: "center", gap: 10 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 58, height: 58, borderRadius: "50%", display: "grid", placeItems: "center",
                  background: colors.olive50, color: colors.olive600,
                }}
                className="vodda-dispatch-radar"
              >
                <Icon name="bell" size={24} />
              </div>
              <strong style={{ fontSize: 14.5, color: colors.ink }}>{L("در انتظار نخستین پاسخ…")}</strong>
              <p style={{ margin: 0, fontSize: 12.5, color: colors.inkMuted, lineHeight: 1.9 }}>
                {L("فراخوان شما برای اساتید «{topic}» ارسال شد. معمولاً نخستین پاسخ‌ها در چند دقیقه می‌رسند.").replace("{topic}", L(call.topic_title))}
              </p>
            </div>
          </Card>
        ) : (
          <div style={{ display: "grid", gap: spacing.md }}>
            {(view?.candidates ?? []).map((candidate, index) => (
              <CandidateCard
                key={candidate.offer_id}
                candidate={candidate}
                index={index}
                busy={busyOffer === candidate.offer_id}
                call={call}
                onChoose={() => void choose(candidate.offer_id)}
                onDecline={() => void decline(candidate.offer_id)}
              />
            ))}
          </div>
        )}

        {actionError ? (
          <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, margin: 0 }}>
            {L(actionError)}
          </p>
        ) : null}

        <div style={{ position: "sticky", zIndex: 12, bottom: "calc(68px + env(safe-area-inset-bottom))", padding: "8px 0 12px", background: colors.sand50 }}>
          <button
            type="button"
            className="vodda-tappable"
            disabled={canceling}
            onClick={() => void cancel()}
            style={{ ...fancyGhost, minHeight: 50, opacity: canceling ? 0.65 : 1, cursor: canceling ? "wait" : "pointer" }}
          >
            {canceling ? L("در حال لغو…") : L("لغو فراخوان")}
          </button>
        </div>
      </div>
    );
  }

  // ── idle: ویزارد مرحله‌ای فراخوان — موضوع → زمان → ثبت ──
  const topic = selectedTopic;
  const composerSteps = useMemo(
    () => [
      { key: "topic", title: L("موضوع"), icon: "book" as const },
      { key: "time", title: L("زمان"), icon: "calendar" as const },
      { key: "submit", title: L("ثبت"), icon: "checkCircle" as const },
    ],
    [L],
  );
  const composerValid = (step: number): boolean => {
    switch (step) {
      case 0: return topic !== null;
      case 1: return whenMode === "later" ? isWhenInFuture(when) : true;
      default: return true;
    }
  };
  const whenLabelValue =
    whenMode === "now"
      ? L("جلسهٔ فوری — همین حالا")
      : (() => {
          const option = dayOptions.find((item) => item.value === when.localDate);
          return `${option?.label ?? when.localDate} · ${localizedDigits(String(when.hh).padStart(2, "0"), lang)}:${localizedDigits(String(when.mm).padStart(2, "0"), lang)}`;
        })();
  const topicGroups = useMemo<MenuGroup[]>(
    () => grouped.map(([category, items]) => ({
      title: L(category),
      items: items.map((item) => ({
        key: String(item.id),
        title: L(item.title),
        icon: item.icon,
      })),
    })),
    [grouped, L],
  );
  return (
    <div className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
      <div
        className="vodda-enter"
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 22,
          padding: 22,
          color: colors.onOlive,
          background: gradients.hero,
          boxShadow: shadows.olive,
        }}
      >
        {/* تذهیب گوشه — هویت قرآنی روی هیروی فراخوان (فاز ۲) */}
        <CornerOrnament tone="light" size={124} style={{ insetInlineEnd: -32, top: -36, opacity: 0.9 }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 15, background: "rgba(255,255,255,.15)" }}>
            <Icon name="bell" size={24} />
          </div>
          <div>
            <h1 className="vodda-display" style={{ margin: 0, fontSize: 23, lineHeight: 1.65 }}>{L("فراخوان اساتید")}</h1>
            <span style={{ fontSize: 12.5, opacity: 0.85 }}>{L("به‌سرعت و بدون تماس تلفنی؛ اساتید اعلام آمادگی می‌کنند و شما انتخاب می‌کنید")}</span>
          </div>
        </div>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 16 }}>
          {[
            { icon: "search" as const, text: L("موضوع را انتخاب کنید") },
            { icon: "bell" as const, text: L("فراخوان را ثبت کنید") },
            { icon: "checkCircle" as const, text: L("از پاسخ‌ها انتخاب کنید") },
          ].map((step) => (
            <div key={step.text} style={{ background: "rgba(255,255,255,.1)", borderRadius: 13, padding: "10px 8px", textAlign: "center" }}>
              <Icon name={step.icon} size={18} style={{ opacity: 0.9 }} />
              <span style={{ display: "block", fontSize: 12, marginTop: 5, lineHeight: 1.6, opacity: 0.92 }}>{step.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── ویزارد مرحله‌ای فراخوان — هر مرحله چرخهٔ مستقل خودش، نه زیرشاخهٔ مراحل قبل ─── */}
      <Card className="vodda-enter vodda-enter-delay-1" style={{ padding: 18, borderRadius: 20, display: "grid", gap: spacing.md }}>
        {/* سرستون چرخه: عنوان + شمار مرحله + نوار پیشرفت + برچسب‌ها */}
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 15.5, fontWeight: 900, color: colors.ink, minWidth: 0 }}>
              {L("چرخهٔ فراخوان اساتید")}
            </strong>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 12px",
                borderRadius: 999,
                background: colors.olive50,
                border: `1px solid ${colors.olive100}`,
                color: colors.olive700,
                fontSize: 11.5,
                fontWeight: 800,
                flex: "0 0 auto",
                whiteSpace: "nowrap",
              }}
            >
              <Icon name="list" size={13} />
              {L("مرحلهٔ {n} از {m}")
                .replace("{n}", localizedDigits(composerStep + 1, lang))
                .replace("{m}", localizedDigits(composerSteps.length, lang))}
            </span>
          </div>

          {/* نوار پیشرفت — هر پاره‌خط یک مرحله؛ انجام‌شده پررنگ */}
          <div role="progressbar" aria-valuemin={1} aria-valuemax={composerSteps.length} aria-valuenow={composerStep + 1} style={{ display: "flex", gap: 5 }}>
            {composerSteps.map((step, index) => (
              <span
                key={step.key}
                aria-hidden="true"
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 999,
                  background: index <= composerStep ? colors.olive600 : colors.sand150,
                  transition: "background .3s ease",
                }}
              />
            ))}
          </div>

          {/* برچسب مراحل — انجام‌شده تیک، فعلی برجسته؛ مراحل قبلی برای بازگشت کلیک‌پذیرند */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {composerSteps.map((step, index) => {
              const done = index < composerStep;
              const active = index === composerStep;
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => { if (index <= composerStep) setComposerStep(index); }}
                  aria-current={active ? "step" : undefined}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 11px",
                    borderRadius: 999,
                    flex: "0 0 auto",
                    whiteSpace: "nowrap",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: index <= composerStep ? "pointer" : "default",
                    fontFamily: typography.fontFamily,
                    color: done ? "#fffaf0" : active ? colors.olive700 : colors.inkMuted,
                    background: done ? colors.olive600 : active ? colors.olive50 : colors.surface,
                    border: `1px solid ${done ? colors.olive600 : active ? colors.olive100 : colors.sand150}`,
                  }}
                >
                  <Icon name={done ? "check" : step.icon} size={12} stroke={2.2} />
                  {step.title}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: 1, background: colors.sand150 }} />

        {/* ───── مرحلهٔ ۱: موضوع — لیست کشویی زیبا با جستجو ───── */}
        {composerStep === 0 ? (
          <div style={{ display: "grid", gap: 12 }}>
            {catalogLoading ? (
              <LoadingState label={L("در حال دریافت موضوعات…")} />
            ) : catalogError ? (
              <ErrorState
                title={L("دریافت موضوعات ناموفق بود")}
                description={L(catalogError)}
                action={<Button variant="secondary" onClick={() => void loadCatalog()}>{L("تلاش دوباره")}</Button>}
              />
            ) : catalog.length === 0 ? (
              <EmptyState
                illustration={<IllustrationDispatch size={150} />}
                title={L("موضوعی برای فراخوان نیست")}
                description={L("فهرست رسمی موضوعات خالی است.")}
              />
            ) : (
              <>
                <MenuSelect
                  ariaLabel="انتخاب موضوع آموزش"
                  placeholder={L("موضوع را از فهرست رسمی وُدّا انتخاب کنید…")}
                  displayTitle={topic ? L(topic.title) : undefined}
                  displaySub={topic ? topic.category : undefined}
                  displayIcon={topic?.icon}
                  countLabel={L("موضوع")}
                  searchable
                  searchPlaceholder={L("جستجو در موضوعات؛ مثلاً تجوید، حفظ، صوت و لحن…")}
                  groups={topicGroups}
                  onPick={(key) => {
                    const picked = catalog.find((item) => String(item.id) === key);
                    if (!picked) return;
                    setSelectedTopic(picked);
                    setActionError("");
                  }}
                />
                {topic ? (
                  <div
                    role="status"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "11px 13px",
                      borderRadius: 15,
                      background: colors.olive50,
                      border: `1px solid ${colors.olive100}`,
                    }}
                  >
                    <span aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 34, height: 34, flex: "0 0 34px", borderRadius: 11, background: colors.olive600, color: colors.onOlive }}>
                      <TopicIcon icon={topic.icon} size={17} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1, fontSize: 12, color: colors.olive700, lineHeight: 1.9, fontWeight: 600 }}>
                      {topic.description}
                    </span>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: colors.inkMuted, lineHeight: 1.9 }}>
                    {L("از فهرست رسمی خدمات وُدّا — {n} موضوع تأییدشده").replace("{n}", fa(catalog.length, lang))}
                  </p>
                )}
              </>
            )}
          </div>
        ) : null}

        {/* ───── مرحلهٔ ۲: زمان — دکمه‌های فانتزی فوری/زمان‌دار ───── */}
        {composerStep === 1 ? (
          <div style={{ display: "grid", gap: 12 }}>
            <strong style={{ fontSize: 13.5, color: colors.ink }}>{L("چه زمانی؟")}</strong>
            <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
              <button type="button" aria-pressed={whenMode === "now"} onClick={() => setWhenMode("now")} className="vodda-tappable" style={fancyWhen(whenMode === "now", true)}>
                <Icon name="sparkle" size={14} /> {L("جلسهٔ فوری — همین حالا")}
              </button>
              <button type="button" aria-pressed={whenMode === "later"} onClick={() => setWhenMode("later")} className="vodda-tappable" style={fancyWhen(whenMode === "later", false)}>
                <Icon name="calendar" size={14} /> {L("زمان مشخص")}
              </button>
            </div>
            {whenMode === "now" ? (
              <div
                role="note"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  marginTop: 2,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: `1px solid ${colors.goldSoft}`,
                  background: gradients.cream,
                }}
              >
                <span aria-hidden="true" style={{ width: 30, height: 30, display: "grid", placeItems: "center", flex: "0 0 30px", borderRadius: 10, background: "linear-gradient(145deg,#d8b869,#b8923c)", color: colors.onOlive }}>
                  <Icon name="sparkle" size={15} stroke={2.2} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: colors.goldInk }}>{L("فراخوان فوری فقط به اساتید آمادهٔ همین لحظه می‌رسد")}</strong>
                  <span style={{ display: "block", fontSize: 11.5, color: colors.goldInkSoft, lineHeight: 1.8, marginTop: 2 }}>
                    {L("این فراخوان فقط برای اساتیدی ارسال می‌شود که «جلسهٔ فوری» را فعال کرده‌اند و معمولاً در چند دقیقه پاسخ می‌گیرید؛ ساعت دقیق با توافق استاد مشخص می‌شود.")}
                  </span>
                </span>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: spacing.sm, marginTop: 2 }}>
                <SelectField
                  ariaLabel={L("روز جلسه")}
                  value={when.localDate}
                  onChange={(next) => setWhen((previous) => ({ ...previous, localDate: next }))}
                  options={dayOptions}
                />
                <SelectField
                  ariaLabel={L("ساعت جلسه")}
                  value={`${when.hh}:${when.mm}`}
                  onChange={(next) => {
                    const [hh, mm] = next.split(":").map(Number);
                    setWhen((previous) => ({ ...previous, hh, mm }));
                  }}
                  options={timeOptions}
                />
              </div>
            )}
            <p style={{ margin: 0, fontSize: 12, color: colors.inkMuted, lineHeight: 1.8 }}>
              {whenMode === "later"
                ? L("ساعت‌ها به وقت تهران است؛ زمان نهایی با تأیید استاد قطعی می‌شود.")
                : L("بعد از ثبت، اساتید آماده اعلام حضور می‌کنند و شما یکی را انتخاب می‌کنید.")}
            </p>
          </div>
        ) : null}

        {/* ───── مرحلهٔ ۳: بازبینی و ثبت ───── */}
        {composerStep === 2 ? (
          <div style={{ display: "grid", gap: 12 }}>
            <strong style={{ fontSize: 13.5, color: colors.ink }}>{L("بازبینی و ثبت فراخوان")}</strong>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 13px", borderRadius: 13, background: colors.sand50, border: `1px solid ${colors.sand150}` }}>
                <span style={{ fontSize: 12, color: colors.inkMuted }}>{L("موضوع")}</span>
                <strong style={{ fontSize: 12.5, textAlign: "left", minWidth: 0 }}>{topic ? L(topic.title) : "—"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "10px 13px", borderRadius: 13, background: colors.sand50, border: `1px solid ${colors.sand150}` }}>
                <span style={{ fontSize: 12, color: colors.inkMuted }}>{L("زمان")}</span>
                <strong style={{ fontSize: 12.5, textAlign: "left", minWidth: 0 }}>{whenLabelValue}</strong>
              </div>
            </div>

            <div>
              <strong style={{ fontSize: 13.5, color: colors.ink, display: "block", marginBottom: 8 }}>{L("یادداشت برای اساتید (اختیاری)")}</strong>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, 300))}
                rows={2}
                placeholder={L("مثلاً: مبتدی هستم، برای شروع کمکم کنید…")}
                style={{ ...inputStyle, resize: "none", lineHeight: 1.9 }}
                aria-label={L("یادداشت فراخوان")}
              />
            </div>

            {actionError ? (
              <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, margin: 0 }}>
                {L(actionError)}
              </p>
            ) : null}

            <button type="button" className="vodda-tappable" disabled={creating || !topic} onClick={() => void start()} style={{ ...fancyGold, opacity: creating || !topic ? 0.6 : 1, cursor: creating ? "wait" : !topic ? "not-allowed" : "pointer" }}>
              <Icon name="bell" size={16} />
              {creating ? L("در حال ارسال…") : L("ثبت فراخوان برای اساتید")}
            </button>
            <button type="button" className="vodda-tappable" onClick={() => navigateApp(topic ? `/search?topic=${topic.id}` : "/search", config)} style={{ ...fancyGhost, minHeight: 46 }}>
              <Icon name="search" size={15} />
              {L("یا مشاهدهٔ اساتید همین موضوع")}
            </button>
          </div>
        ) : null}

        {/* ─── ناوبری چرخه — بازگشت / مرحلهٔ بعد ─── */}
        {composerStep < composerSteps.length - 1 ? (
          <div style={{ display: "flex", gap: spacing.sm }}>
            {composerStep > 0 ? (
              <button type="button" className="vodda-tappable" onClick={() => setComposerStep((value) => value - 1)} style={{ ...fancyGhost, flex: "0 0 auto", width: "auto", minWidth: 118 }}>
                {L("بازگشت")}
              </button>
            ) : null}
            <button
              type="button"
              className="vodda-tappable"
              disabled={!composerValid(composerStep)}
              onClick={() => setComposerStep((value) => Math.min(composerSteps.length - 1, value + 1))}
              style={{ ...fancyPrimary, flex: 1, opacity: composerValid(composerStep) ? 1 : 0.55, cursor: composerValid(composerStep) ? "pointer" : "not-allowed" }}
            >
              {L("مرحلهٔ بعد")}
              <Icon name="chevronL" size={15} />
            </button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

/* دکمهٔ فانتزی زمان — گرادیانی/پیل به‌جای چیپ کادری */
const fancyWhen = (active: boolean, gold = false): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "11px 18px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
  color: active ? (gold ? "#fffaf0" : colors.onOlive) : colors.inkSecondary,
  background: active ? (gold ? "linear-gradient(145deg,#d8b869,#b8923c)" : gradients.hero) : colors.surface,
  border: `1.5px solid ${active ? "transparent" : colors.sand200}`,
  boxShadow: active ? (gold ? "0 10px 26px rgba(184,146,60,.38)" : shadows.olive) : "none",
  transition: "transform .18s ease, box-shadow .18s ease",
});

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 14,
  border: `1px solid ${colors.sand200}`,
  background: colors.surface,
  color: colors.ink,
  fontSize: 13.5,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const liveDotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: colors.olive600,
  animation: "vodda-live-dot 1.6s ease-out infinite",
};
