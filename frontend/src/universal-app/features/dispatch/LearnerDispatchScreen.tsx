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
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  typography,
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

const tierBadge: Record<string, { label: string; bg: string; color: string }> = {
  international: { label: "استاد بین‌المللی", bg: "rgba(0,149,246,.10)", color: "#0095f6" },
  grade2: { label: "استاد کشوری", bg: "rgba(18,183,106,.12)", color: "#0e9f5e" },
  grade3: { label: "استاد استانی", bg: "rgba(224,36,94,.10)", color: "#e0245e" },
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
  onChoose,
  onDecline,
}: {
  candidate: DispatchCandidate;
  index: number;
  busy: boolean;
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
        <span style={chipStyle}>{timeLabelOf({ flexible: true }, lang, L)}</span>
        <span style={chipStyle}>
          <Icon name="clock" size={11} /> {L("{n} دقیقه").replace("{n}", fa(candidate.duration, lang))}
        </span>
        <span style={{ ...chipStyle, color: colors.olive700, fontWeight: 800, background: colors.olive50, borderColor: colors.olive200 }}>
          {priceLabel(candidate.price, lang, L)}
        </span>
      </div>

      <div style={{ display: "flex", gap: spacing.sm }}>
        <Button
          variant="secondary"
          onClick={onDecline}
          disabled={busy}
          style={{ minHeight: 44, flex: "0 0 auto", paddingInline: 16 }}
        >
          {L("رد")}
        </Button>
        <Button onClick={onChoose} loading={busy} disabled={busy} style={{ minHeight: 44, flex: 1 }}>
          {L("انتخاب و رزرو این استاد")}
        </Button>
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

export function LearnerDispatchScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { L, lang, N } = useAppearance();
  const [catalog, setCatalog] = useState<OfficialService[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [query, setQuery] = useState("");
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

  const filteredCatalog = useMemo(() => {
    const q = query.trim();
    if (!q) return catalog;
    return catalog.filter(
      (item) => item.title.includes(q) || item.category.includes(q) || item.description.includes(q),
    );
  }, [catalog, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, OfficialService[]>();
    for (const item of filteredCatalog) {
      const rows = groups.get(item.category) ?? [];
      rows.push(item);
      groups.set(item.category, rows);
    }
    return [...groups.entries()];
  }, [filteredCatalog]);

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
    return (
      <div className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
        <Card elevated className="vodda-enter" style={{ display: "grid", gap: spacing.lg, textAlign: "center", padding: 22 }}>
          <div
            aria-hidden="true"
            style={{
              width: 76, height: 76, display: "grid", placeItems: "center", marginInline: "auto",
              borderRadius: "50%", color: colors.surface, background: gradients.hero, boxShadow: shadows.olive,
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
            color: colors.surface,
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
          <span style={{ background: colors.olive600, color: colors.surface, borderRadius: 999, fontSize: 12, fontWeight: 800, padding: "2px 10px" }}>
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
                  color: payMethod === value ? colors.surface : colors.inkSecondary,
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
          <Button variant="secondary" fullWidth loading={canceling} disabled={canceling} onClick={() => void cancel()} style={{ minHeight: 50 }}>
            {L("لغو فراخوان")}
          </Button>
        </div>
      </div>
    );
  }

  // ── idle: topic picker + call composer ──
  const topic = selectedTopic;
  return (
    <div className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
      <div
        className="vodda-enter"
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 22,
          padding: 22,
          color: colors.surface,
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

      {topic ? (
        <Card className="vodda-enter" style={{ padding: 18, borderRadius: 20, display: "grid", gap: spacing.md }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: 13, background: colors.olive50, color: colors.olive600, flex: "0 0 42px" }}>
              <TopicIcon icon={topic.icon} size={21} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: "block", fontSize: 15, fontWeight: 800, color: colors.ink }}>{topic.title}</strong>
              <span style={{ fontSize: 12, color: colors.inkMuted, lineHeight: 1.8, display: "block" }}>{topic.description}</span>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedTopic(null); setActionError(""); }}
              aria-label={L("تغییر موضوع")}
              style={{ background: "none", border: "none", color: colors.inkMuted, cursor: "pointer", padding: 4, fontFamily: typography.fontFamily }}
            >
              <Icon name="refresh" size={17} />
            </button>
          </div>

          <div style={{ height: 1, background: colors.sand150 }} />

          <div>
            <strong style={{ fontSize: 13.5, color: colors.ink, display: "block", marginBottom: 8 }}>{L("چه زمانی؟")}</strong>
            <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
              <button type="button" aria-pressed={whenMode === "now"} onClick={() => setWhenMode("now")} className="vodda-tappable" style={whenChip(whenMode === "now", true)}>
                <Icon name="sparkle" size={14} style={{ marginInlineEnd: 5 }} /> {L("جلسهٔ فوری — همین حالا")}
              </button>
              <button type="button" aria-pressed={whenMode === "later"} onClick={() => setWhenMode("later")} className="vodda-tappable" style={whenChip(whenMode === "later", false)}>
                <Icon name="calendar" size={14} style={{ marginInlineEnd: 5 }} /> {L("زمان مشخص")}
              </button>
            </div>
            {whenMode === "now" ? (
              <div
                role="note"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid #ecd9a8",
                  background: "linear-gradient(150deg,#fdf6e3,#fffdf8 75%)",
                }}
              >
                <span aria-hidden="true" style={{ width: 30, height: 30, display: "grid", placeItems: "center", flex: "0 0 30px", borderRadius: 10, background: "linear-gradient(145deg,#d8b869,#b8923c)", color: "#fffaf0" }}>
                  <Icon name="sparkle" size={15} stroke={2.2} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: "#7a5e1e" }}>{L("فراخوان فوری فقط به اساتید آمادهٔ همین لحظه می‌رسد")}</strong>
                  <span style={{ display: "block", fontSize: 11.5, color: "#9a7426", lineHeight: 1.8, marginTop: 2 }}>
                    {L("این فراخوان فقط برای اساتیدی ارسال می‌شود که «جلسهٔ فوری» را فعال کرده‌اند و معمولاً در چند دقیقه پاسخ می‌گیرید؛ ساعت دقیق با توافق استاد مشخص می‌شود.")}
                  </span>
                </span>
              </div>
            ) : null}
            {whenMode === "later" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: spacing.sm, marginTop: 10 }}>
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
            ) : null}
            <p style={{ margin: "8px 0 0", fontSize: 12, color: colors.inkMuted, lineHeight: 1.8 }}>
              {whenMode === "later"
                ? L("ساعت‌ها به وقت تهران است؛ زمان نهایی با تأیید استاد قطعی می‌شود.")
                : L("بعد از ثبت، اساتید آماده اعلام حضور می‌کنند و شما یکی را انتخاب می‌کنید.")}
            </p>
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

          <div style={{ display: "grid", gap: spacing.sm }}>
            <Button fullWidth loading={creating} disabled={creating} onClick={() => void start()} style={{ minHeight: 52 }}>
              {L("ثبت فراخوان برای اساتید")}
            </Button>
            <Button variant="secondary" fullWidth onClick={() => navigateApp(`/search?topic=${topic.id}`, config)} style={{ minHeight: 46 }}>
              {L("یا مشاهدهٔ اساتید همین موضوع")}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="vodda-enter vodda-enter-delay-1" style={{ padding: 18, borderRadius: 20 }}>
          <strong style={{ fontSize: 15, fontWeight: 800, color: colors.ink, display: "block" }}>{L("۱. موضوع آموزش را انتخاب کنید")}</strong>
          <span style={{ fontSize: 12, color: colors.inkMuted, display: "block", margin: "4px 0 12px" }}>
            {L("از فهرست رسمی خدمات وُدّا — {n} موضوع تأییدشده").replace("{n}", fa(catalog.length, lang))}
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={L("جستجو در موضوعات؛ مثلاً تجوید، حفظ، صوت و لحن…")}
            style={{ ...inputStyle, marginBottom: 12 }}
            aria-label={L("جستجوی موضوع")}
          />
          {catalogLoading ? (
            <LoadingState label={L("در حال دریافت موضوعات…")} />
          ) : catalogError ? (
            <ErrorState
              title={L("دریافت موضوعات ناموفق بود")}
              description={L(catalogError)}
              action={<Button variant="secondary" onClick={() => void loadCatalog()}>{L("تلاش دوباره")}</Button>}
            />
          ) : filteredCatalog.length === 0 ? (
            <EmptyState
              illustration={<IllustrationDispatch size={150} />}
              title={L("موضوعی پیدا نشد")}
              description={L("عبارت دیگری را جستجو کنید.")}
            />
          ) : (
            <div style={{ display: "grid", gap: spacing.lg, maxHeight: 520, overflowY: "auto", paddingInlineEnd: 4 }}>
              {grouped.map(([category, items]) => (
                <div key={category}>
                  <strong style={{ display: "block", fontSize: 12.5, color: colors.olive700, margin: "2px 0 8px" }}>{L(category)}</strong>
                  <div style={{ display: "grid", gap: spacing.sm }}>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { setSelectedTopic(item); setActionError(""); }}
                        style={topicRowStyle}
                      >
                        <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 11, background: colors.olive50, color: colors.olive600, flex: "0 0 34px" }}>
                          <TopicIcon icon={item.icon} size={17} />
                        </span>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <strong style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: colors.ink }}>{L(item.title)}</strong>
                        </span>
                        <Icon name="chevronL" size={15} style={{ color: colors.inkFaint, flex: "0 0 auto" }} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

const whenChip = (active: boolean, gold = false): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "9px 14px",
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  color: active ? (gold ? "#7a5e1e" : colors.surface) : colors.inkSecondary,
  background: active ? (gold ? "#fdf6e3" : colors.olive600) : colors.surface,
  border: `1px solid ${active ? (gold ? "#d8b869" : colors.olive600) : colors.sand200}`,
  boxShadow: active && gold ? "0 0 0 3px rgba(231,213,168,.28)" : "none",
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

const topicRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 10,
  textAlign: "right",
  background: colors.sand50,
  border: `1px solid ${colors.sand200}`,
  borderRadius: 14,
  cursor: "pointer",
  fontFamily: "inherit",
  width: "100%",
};

const liveDotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: colors.olive600,
  animation: "vodda-live-dot 1.6s ease-out infinite",
};
