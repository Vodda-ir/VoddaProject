"use client";

// جزئیات فراخوان مراسم از نگاه برگزارکننده: خلاصهٔ فراخوان، پایش زندهٔ
// پذیرش‌ها (polling هر ۶ ثانیه فقط وقتی وضعیت «searching» است)، انتخاب قاری
// و قطعی‌سازی، و لغو فراخوان.

import { useCallback, useEffect, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { toFaDigits } from "../../ui/persian";
import {
  Avatar,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  formatJalaliDateTime,
  Icon,
  LoadingState,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { TierBadge } from "../teachers/TierBadge";
import { cancelCeremonyCall, chooseCeremonyOffer, getCeremonyCall } from "./api";
import {
  SampleAudioList,
  ToneChip,
  TopicIcon,
  audienceMeta,
  callStatusMeta,
  ceremonyWhenLabel,
  formatBudgetRange,
  formatToman,
  offerStatusMeta,
} from "./elements";
import type { CeremonyCallView, CeremonyOffer } from "./types";

function OfferCard({
  offer,
  index,
  busy,
  onChoose,
}: {
  offer: CeremonyOffer;
  index: number;
  busy: boolean;
  onChoose: () => void;
}) {
  const provider = offer.provider;
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
        <Avatar name={provider.name} src={provider.avatar_url || undefined} size={52} ring={false} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 15, fontWeight: 800, color: colors.ink }}>{provider.name}</strong>
            <TierBadge tier={provider.tier} />
          </div>
          <span style={{ display: "block", fontSize: 12, color: colors.olive700, marginTop: 2 }}>
            {provider.tag || "قاری قرآن"}
            {provider.city ? ` · ${provider.city}` : ""}
            {provider.reviews > 0 ? ` · ⭐ ${toFaDigits(provider.rating.toFixed(1))} (${toFaDigits(provider.reviews)} نظر)` : ""}
          </span>
        </div>
        <strong style={{ fontSize: 13.5, color: colors.goldDark, flex: "0 0 auto", whiteSpace: "nowrap" }}>
          {formatToman(offer.price)}
        </strong>
      </div>

      {offer.message ? (
        <p style={{ margin: 0, fontSize: 12.5, color: colors.inkSecondary, background: colors.sand50, borderRadius: 12, padding: "8px 11px", lineHeight: 1.9 }}>
          «{offer.message}»
        </p>
      ) : null}

      {provider.samples.length > 0 ? <SampleAudioList samples={provider.samples.slice(0, 2)} compact /> : null}

      <Button onClick={onChoose} loading={busy} disabled={busy} style={{ minHeight: 44 }}>
        انتخاب و قطعی‌سازی
      </Button>
    </div>
  );
}

export function CeremonyCallScreen({ callId, config }: { callId: string; config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const numericId = Number(callId);
  const validId = Number.isInteger(numericId) && numericId > 0;
  const [view, setView] = useState<CeremonyCallView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyOffer, setBusyOffer] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const hasData = useRef(false);
  const pollRef = useRef<number | null>(null);

  const call = view?.call ?? null;
  const searching = call?.status === "searching";

  const load = useCallback(async () => {
    if (!validId) return;
    try {
      const data = await getCeremonyCall(runtime, numericId);
      hasData.current = true;
      setView(data);
      setError("");
    } catch (caught) {
      // خطای polling بی‌خطر است؛ فقط بار اول به‌صورت کامل نمایش داده می‌شود.
      if (!hasData.current) setError(messageOf(caught, "فراخوان دریافت نشد."));
    } finally {
      setLoading(false);
    }
  }, [numericId, runtime, validId]);

  useEffect(() => {
    if (!validId) {
      setError("شناسه فراخوان نامعتبر است.");
      setLoading(false);
      return;
    }
    void load();
  }, [load, validId]);

  // پایش زندهٔ پذیرش‌ها فقط تا وقتی فراخوان «در انتظار پذیرش» است.
  useEffect(() => {
    if (!searching) return;
    pollRef.current = window.setInterval(() => {
      void load();
    }, 6000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [searching, load]);

  const choose = useCallback(
    async (offerId: number) => {
      if (!call || busyOffer) return;
      setBusyOffer(offerId);
      setActionError("");
      try {
        const booking = await chooseCeremonyOffer(runtime, call.id, offerId);
        navigateApp(`/ceremony/bookings/${booking.id}`, config);
      } catch (caught) {
        setActionError(messageOf(caught, "قطعی‌سازی انجام نشد."));
        await load();
      } finally {
        setBusyOffer(0);
      }
    },
    [busyOffer, call, config, load, runtime],
  );

  const cancelCall = useCallback(async () => {
    if (!call || canceling) return;
    setCanceling(true);
    setActionError("");
    try {
      await cancelCeremonyCall(runtime, call.id);
      setCanceled(true);
      setCancelOpen(false);
    } catch (caught) {
      setActionError(messageOf(caught, "لغو فراخوان انجام نشد."));
      setCancelOpen(false);
    } finally {
      setCanceling(false);
    }
  }, [call, canceling, runtime]);

  if (loading) return <LoadingState label="در حال دریافت فراخوان…" />;

  if (error || !call) {
    return (
      <ErrorState
        title="دریافت فراخوان ناموفق بود"
        description={error || "این فراخوان پیدا نشد یا به شما تعلق ندارد."}
        action={
          <div style={{ display: "grid", gap: spacing.sm }}>
            <Button variant="secondary" onClick={() => { setLoading(true); setError(""); void load(); }}>تلاش دوباره</Button>
            <Button variant="ghost" onClick={() => navigateApp("/ceremony/calls", config)}>فراخوان‌های من</Button>
          </div>
        }
      />
    );
  }

  if (canceled) {
    return (
      <Card elevated style={{ display: "grid", gap: spacing.lg, textAlign: "center" }}>
        <div aria-hidden="true" style={{ width: 68, height: 68, display: "grid", placeItems: "center", marginInline: "auto", borderRadius: "50%", color: colors.danger, background: colors.dangerBackground }}>
          <Icon name="x" size={30} stroke={2.4} />
        </div>
        <div>
          <h2 style={{ ...typography.title, margin: 0 }}>فراخوان لغو شد</h2>
          <p style={{ ...typography.body, color: colors.inkSecondary, marginBottom: 0 }}>
            این فراخوان بسته شد و برای قاریان دیگر نمایش داده نمی‌شود.
          </p>
        </div>
        <Button fullWidth onClick={() => navigateApp("/ceremony/new", config)}>فراخوان جدید</Button>
        <Button variant="secondary" fullWidth onClick={() => navigateApp("/ceremony/calls", config)}>فراخوان‌های من</Button>
      </Card>
    );
  }

  const offers = view?.offers ?? [];
  const statusTone = callStatusMeta[call.status];

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
          background: searching ? "linear-gradient(145deg, #2e3622 0%, #3c472b 58%, #4c5a36 100%)" : colors.olive800,
          boxShadow: shadows.olive,
        }}
      >
        {searching ? <span aria-hidden="true" className="vodda-dispatch-pulse" style={{ position: "absolute", insetInlineStart: 18, top: 18 }} /> : null}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 15, background: "rgba(255,255,255,.14)" }}>
            <TopicIcon icon={call.icon} size={24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: "block", fontSize: 16.5, fontWeight: 800 }}>{call.title}</strong>
            <span style={{ fontSize: 12.5, opacity: 0.86 }}>{ceremonyWhenLabel(call)}</span>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
          {[
            `📍 ${call.city || "شهر نامشخص"}`,
            `👥 ${toFaDigits(call.guests_count)} مهمان`,
            `🎙 ${toFaDigits(call.reciters_needed)} قاری`,
            `👨‍👩‍👧 ${audienceMeta[call.audience]}`,
          ].map((chip) => (
            <span key={chip} style={{ fontSize: 11.5, background: "rgba(255,255,255,.12)", borderRadius: 999, padding: "4px 10px" }}>{chip}</span>
          ))}
        </div>
        <p style={{ margin: "14px 0 0", fontSize: 12.5, lineHeight: 1.9, opacity: 0.88 }}>
          بودجهٔ اعلام‌شده: {formatBudgetRange(call.budget_min, call.budget_max)} · ودیعه: {toFaDigits(Math.round(call.deposit_rate))}٪
          {call.deadline ? ` · مهلت پذیرش: ${formatJalaliDateTime(call.deadline, { withTime: false })}` : ""}
        </p>
      </div>

      {call.note ? (
        <Card style={{ padding: 14, borderRadius: 18, display: "flex", gap: 9, alignItems: "flex-start" }}>
          <Icon name="message" size={17} style={{ flex: "0 0 auto", color: colors.olive600 }} />
          <p style={{ margin: 0, fontSize: 13, color: colors.inkSecondary, lineHeight: 1.9 }}>{call.note}</p>
        </Card>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <ToneChip tone={statusTone} />
        {searching ? (
          <span style={{ marginInlineStart: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: colors.olive700 }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: colors.olive600, animation: "vodda-live-dot 1.6s ease-out infinite" }} /> زنده
          </span>
        ) : null}
      </div>

      {searching ? (
        offers.length === 0 ? (
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
                <Icon name="mic" size={24} />
              </div>
              <strong style={{ fontSize: 14.5, color: colors.ink }}>در انتظار پذیرش قاریان…</strong>
              <p style={{ margin: 0, fontSize: 12.5, color: colors.inkMuted, lineHeight: 1.9 }}>
                فراخوان شما برای قاریان «{call.title}» ارسال شد. پذیرش‌ها همین‌جا زنده نمایش داده می‌شوند.
              </p>
            </div>
          </Card>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <strong style={{ fontSize: 15, color: colors.ink }}>پذیرش‌های رسیده</strong>
              <span style={{ background: colors.olive600, color: colors.surface, borderRadius: 999, fontSize: 12, fontWeight: 800, padding: "2px 10px" }}>
                {toFaDigits(offers.length)}
              </span>
            </div>
            <div style={{ display: "grid", gap: spacing.md }}>
              {offers.map((offer, index) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  index={index}
                  busy={busyOffer === offer.id}
                  onChoose={() => void choose(offer.id)}
                />
              ))}
            </div>
          </>
        )
      ) : offers.length > 0 ? (
        <>
          <strong style={{ fontSize: 15, color: colors.ink }}>پذیرش‌ها</strong>
          <div style={{ display: "grid", gap: spacing.md }}>
            {offers.map((offer) => (
              <div key={offer.id} style={{ border: `1px solid ${colors.sand200}`, borderRadius: 16, padding: 13, display: "flex", alignItems: "center", gap: 10, background: colors.surface }}>
                <Avatar name={offer.provider.name} src={offer.provider.avatar_url || undefined} size={40} ring={false} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ display: "block", fontSize: 13.5, color: colors.ink }}>{offer.provider.name}</strong>
                  <span style={{ fontSize: 11.5, color: colors.inkMuted }}>{formatToman(offer.price)}</span>
                </div>
                <ToneChip tone={offerStatusMeta[offer.status]} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<Icon name="calendar" size={30} />}
          title="پذیرشی ثبت نشده"
          description="این فراخوان دیگر در حال جستجو نیست و پذیرشی برای آن ثبت نشده است."
        />
      )}

      {call.status === "assigned" ? (
        <Card style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 14, borderRadius: 18, borderColor: colors.olive200 }}>
          <Icon name="checkCircle" size={20} style={{ color: colors.olive600, flex: "0 0 auto" }} />
          <p style={{ margin: 0, fontSize: 12.5, color: colors.inkSecondary, lineHeight: 1.9 }}>
            قاری انتخاب شد و قرارداد مراسم ساخته شد. برای پرداخت ودیعه و پیگیری اجرا، جزئیات قرارداد را باز کنید.
          </p>
        </Card>
      ) : null}

      {actionError ? (
        <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, margin: 0 }}>
          {actionError}
        </p>
      ) : null}

      {searching ? (
        <div style={{ position: "sticky", zIndex: 12, bottom: "calc(68px + env(safe-area-inset-bottom))", padding: "8px 0 12px", background: colors.sand50 }}>
          <Button variant="secondary" fullWidth loading={canceling} disabled={canceling} onClick={() => setCancelOpen(true)} style={{ minHeight: 50 }}>
            لغو فراخوان
          </Button>
        </div>
      ) : (
        <Button variant="secondary" fullWidth onClick={() => navigateApp("/ceremony/calls", config)} style={{ minHeight: 46 }}>
          بازگشت به فراخوان‌های من
        </Button>
      )}

      <Dialog
        open={cancelOpen}
        title="لغو فراخوان"
        onClose={() => { if (!canceling) setCancelOpen(false); }}
      >
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>
          با لغو فراخوان، همهٔ پذیرش‌های رسیده باطل می‌شوند و این درخواست برای قاریان نمایش داده نمی‌شود. ادامه می‌دهید؟
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={canceling}>انصراف</Button>
          <Button variant="danger" onClick={() => void cancelCall()} loading={canceling}>لغو فراخوان</Button>
        </div>
      </Dialog>
    </div>
  );
}
