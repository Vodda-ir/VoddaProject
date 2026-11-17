"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { toFaDigits } from "../../ui/persian";
import {
  Button,
  Card,
  EmptyState,
  Icon,
  LoadingState,
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";
import {
  acceptDispatchCall,
  getTeacherDispatchInbox,
  rejectDispatchCall,
  withdrawDispatchOffer,
} from "../dispatch/api";
import type { TeacherInbox, TeacherInboxCall } from "../dispatch/types";

const numberFormatter = new Intl.NumberFormat("fa-IR");

function fa(n: number): string {
  return numberFormatter.format(n);
}

function priceLabel(n: number): string {
  return `${formatWalletAmount(Math.max(0, n))} تومان`;
}

function ageLabel(iso: string): string {
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return "";
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (seconds < 60) return "همین حالا";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${fa(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  return `${fa(hours)} ساعت پیش`;
}

function remainingSeconds(expiresAt: string): number {
  const at = new Date(expiresAt).getTime();
  if (Number.isNaN(at)) return 0;
  return Math.max(0, Math.round((at - Date.now()) / 1000));
}

function countdownLabel(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${toFaDigits(String(m).padStart(2, "0"))}:${toFaDigits(String(s).padStart(2, "0"))}`;
}

function whenLabel(call: TeacherInboxCall["call"]): string {
  if (call.flexible || !call.scheduled_at) return "⚡ در اسرع وقت";
  const at = new Date(call.scheduled_at);
  if (Number.isNaN(at.getTime())) return "⚡ در اسرع وقت";
  return `📅 ${at.toLocaleString("fa-IR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}`;
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

function IncomingCallCard({
  item,
  busy,
  onAccept,
  onReject,
}: {
  item: TeacherInboxCall;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const call = item.call;
  return (
    <div
      className="vodda-enter"
      style={{
        border: `1.4px solid ${colors.olive200}`,
        borderRadius: 18,
        padding: 14,
        display: "grid",
        gap: 10,
        background: colors.surface,
        boxShadow: shadows.sm,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: 14, background: colors.olive50, color: colors.olive600, flex: "0 0 42px" }}>
          <Icon name={(call.topic_icon === "mic" ? "mic" : call.topic_icon === "quran" ? "quran" : "book") as "book"} size={20} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: colors.ink }}>{call.topic_title}</strong>
          <span style={{ fontSize: 12, color: colors.inkMuted }}>
            {whenLabel(call)} · {ageLabel(call.created_at)}
          </span>
        </div>
        <strong dir="ltr" style={{ fontSize: 13.5, color: colors.olive700, fontVariantNumeric: "tabular-nums", flex: "0 0 auto" }}>
          {countdownLabel(remainingSeconds(call.expires_at))}
        </strong>
      </div>

      {call.note ? (
        <p style={{ margin: 0, fontSize: 12.5, color: colors.inkSecondary, background: colors.sand50, borderRadius: 12, padding: "8px 11px", lineHeight: 1.9 }}>
          «{call.note}»
        </p>
      ) : null}

      <div style={{ display: "flex", gap: spacing.sm }}>
        <Button variant="secondary" onClick={onReject} disabled={busy} style={{ minHeight: 44, flex: "0 0 auto", paddingInline: 18 }}>
          رد
        </Button>
        <Button onClick={onAccept} loading={busy} disabled={busy} style={{ minHeight: 44, flex: 1 }}>
          🤝 می‌پذیرم — اعلام آمادگی
        </Button>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: colors.inkMuted, lineHeight: 1.8 }}>
        با پذیرش، پروفایل شما برای کاربر نمایش داده می‌شود؛ اگر کاربر شما را انتخاب کند، درخواست جلسه در «درخواست‌ها» ثبت می‌شود.
      </p>
    </div>
  );
}

function MyOfferCard({
  offer,
  busy,
  onWithdraw,
}: {
  offer: TeacherInbox["offers"][number];
  busy: boolean;
  onWithdraw: () => void;
}) {
  const call = offer.call;
  const chosen = offer.status === "chosen";
  const callAlive = call && call.status === "searching";
  return (
    <div
      className="vodda-enter"
      style={{
        border: `1.4px solid ${chosen ? colors.olive200 : colors.sand200}`,
        borderRadius: 18,
        padding: 14,
        display: "grid",
        gap: 8,
        background: chosen ? colors.olive50 : colors.surface,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          aria-hidden="true"
          style={{
            width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", flex: "0 0 34px",
            background: chosen ? colors.olive600 : colors.goldBackground, color: chosen ? colors.surface : colors.goldDark,
          }}
        >
          <Icon name={chosen ? "checkCircle" : "clock"} size={17} stroke={2.1} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ display: "block", fontSize: 14, color: colors.ink }}>{call?.topic_title ?? "فراخوان"}</strong>
          <span style={{ fontSize: 12, color: colors.inkMuted }}>
            {priceLabel(offer.service_price)} · {fa(offer.service_duration)} دقیقه
          </span>
        </div>
      </div>
      {chosen ? (
        <>
          <p style={{ margin: 0, fontSize: 12.5, color: colors.olive700, lineHeight: 1.9 }}>
            🎉 کاربر شما را انتخاب کرد! درخواست جلسه ثبت شد — در «درخواست‌ها» تأیید کنید.
          </p>
          <Button variant="secondary" fullWidth onClick={() => navigateApp("/t/requests", {} as UniversalAppConfig)} style={{ minHeight: 42 }}>
            رفتن به درخواست‌ها
          </Button>
        </>
      ) : callAlive ? (
        <>
          <p style={{ margin: 0, fontSize: 12.5, color: colors.inkSecondary, lineHeight: 1.9 }}>
            پاسخ شما ارسال شده؛ منتظر انتخاب کاربر هستید…
          </p>
          <Button variant="secondary" onClick={onWithdraw} loading={busy} disabled={busy} style={{ minHeight: 40 }}>
            انصراف از فراخوان
          </Button>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 12.5, color: colors.inkMuted, lineHeight: 1.9 }}>
          این فراخوان بسته شد (کاربر استاد دیگری را انتخاب کرد یا فراخوان لغو/منقضی شد).
        </p>
      )}
    </div>
  );
}

export function TeacherDispatchScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const [inbox, setInbox] = useState<TeacherInbox | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(0);
  const [tick, setTick] = useState(0);
  const pollRef = useRef<number | null>(null);
  const knownCallIds = useRef<Set<number>>(new Set());
  const [flashNew, setFlashNew] = useState(false);

  // باگ refresh-loop: اجرای دوم StrictMode یا فراخوانی دیرهنگام نباید state را با دادهٔ کهنه بازنویسی کند.
  const refreshGeneration = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++refreshGeneration.current;
    const isStale = () => refreshGeneration.current !== generation;
    try {
      const data = await getTeacherDispatchInbox(runtime);
      if (isStale()) return;
      setInbox(data);
      setError("");
      const incoming = data.calls.map((item) => item.call.id);
      const fresh = incoming.some((id) => !knownCallIds.current.has(id));
      if (knownCallIds.current.size > 0 && fresh) {
        setFlashNew(true);
        window.setTimeout(() => setFlashNew(false), 2600);
      }
      knownCallIds.current = new Set(incoming);
    } catch (caught) {
      if (isStale()) return;
      setError(messageOf(caught, "دریافت فراخوان‌ها ناموفق بود."));
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    pollRef.current = window.setInterval(() => {
      void refresh();
      setTick((value) => value + 1);
    }, 3500);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [refresh]);

  const accept = useCallback(
    async (callId: number) => {
      if (busyId) return;
      setBusyId(callId);
      try {
        await acceptDispatchCall(runtime, callId);
        await refresh();
      } catch (caught) {
        setError(messageOf(caught, "اعلام آمادگی انجام نشد."));
        await refresh();
      } finally {
        setBusyId(0);
      }
    },
    [busyId, refresh, runtime],
  );

  const reject = useCallback(
    async (callId: number) => {
      if (busyId) return;
      setBusyId(callId);
      try {
        await rejectDispatchCall(runtime, callId);
        setInbox((prev) => (prev ? { ...prev, calls: prev.calls.filter((item) => item.call.id !== callId) } : prev));
      } catch (caught) {
        setError(messageOf(caught, "رد فراخوان انجام نشد."));
      } finally {
        setBusyId(0);
      }
    },
    [busyId, runtime],
  );

  const withdraw = useCallback(
    async (offerId: number) => {
      if (busyId) return;
      setBusyId(offerId);
      try {
        await withdrawDispatchOffer(runtime, offerId);
        await refresh();
      } catch (caught) {
        setError(messageOf(caught, "انصراف انجام نشد."));
      } finally {
        setBusyId(0);
      }
    },
    [busyId, refresh, runtime],
  );

  const openCalls = useMemo(() => inbox?.calls ?? [], [inbox]);
  const myOffers = useMemo(
    () => (inbox?.offers ?? []).filter((offer) => offer.status === "waiting" || offer.status === "chosen"),
    [inbox],
  );
  const waitingMine = useMemo(() => myOffers.filter((offer) => offer.status === "waiting").length, [myOffers]);

  if (loading) return <LoadingState label="در حال دریافت فراخوان‌های زنده…" />;

  return (
    <div className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
      <div
        className="vodda-enter"
        style={{
          borderRadius: 22,
          padding: 20,
          color: colors.surface,
          background: gradients.deep,
          boxShadow: shadows.olive,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 15, background: "rgba(255,255,255,.14)" }}>
            <Icon name="bell" size={23} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>فراخوان‌های زنده</h1>
            <span style={{ fontSize: 12.5, opacity: 0.85 }}>اولین استادی که بپذیرد، دیده می‌شود</span>
          </div>
          <div style={{ marginInlineStart: "auto", textAlign: "center" }}>
            <strong style={{ display: "block", fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{fa(openCalls.length)}</strong>
            <span style={{ fontSize: 10.5, opacity: 0.8 }}>فراخوان باز</span>
          </div>
        </div>
        {waitingMine > 0 ? (
          <p style={{ margin: "12px 0 0", fontSize: 12.5, background: "rgba(255,255,255,.12)", borderRadius: 12, padding: "8px 11px", lineHeight: 1.8 }}>
            ⏳ {fa(waitingMine)} پاسخ فعال دارید که منتظر انتخاب کاربر هستند.
          </p>
        ) : null}
        {flashNew ? (
          <p style={{ margin: "12px 0 0", fontSize: 12.5, background: "rgba(255,255,255,.16)", borderRadius: 12, padding: "8px 11px" }}>
            🔔 فراخوان تازه رسید!
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, margin: 0 }}>
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <strong style={{ fontSize: 15, color: colors.ink }}>در انتظار پاسخ</strong>
        <span style={{ marginInlineStart: "auto", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: colors.olive700 }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: colors.olive600, animation: "vodda-live-dot 1.6s ease-out infinite" }} /> به‌روزرسانی زنده
        </span>
      </div>

      {openCalls.length === 0 ? (
        <Card style={{ padding: 20, borderRadius: 20, textAlign: "center" }}>
          <EmptyState
            title="فعلاً فراخوانی نیست"
            description="به‌محض ثبت فراخوان در موضوع‌هایی که تدریس می‌کنید، همین‌جا نمایش داده می‌شود."
          />
          <span style={{ fontSize: 11.5, color: colors.inkFaint }} aria-hidden="true">
            {tick > 0 ? "…" : ""}
          </span>
        </Card>
      ) : (
        <div style={{ display: "grid", gap: spacing.md }}>
          {openCalls.map((item) => (
            <IncomingCallCard
              key={item.call.id}
              item={item}
              busy={busyId === item.call.id}
              onAccept={() => void accept(item.call.id)}
              onReject={() => void reject(item.call.id)}
            />
          ))}
        </div>
      )}

      {myOffers.length > 0 ? (
        <>
          <div style={{ height: 1, background: colors.sand150 }} />
          <strong style={{ fontSize: 15, color: colors.ink }}>پاسخ‌های من</strong>
          <div style={{ display: "grid", gap: spacing.md }}>
            {myOffers.map((offer) => (
              <MyOfferCard
                key={offer.id}
                offer={offer}
                busy={busyId === offer.id}
                onWithdraw={() => void withdraw(offer.id)}
              />
            ))}
          </div>
        </>
      ) : null}

      <p style={{ margin: 0, fontSize: 11.5, color: colors.inkMuted, lineHeight: 1.9 }}>
        نکته: پاسخ سریع‌تر شانس دیده‌شدن شما را بیشتر می‌کند؛ کاربران معمولاً نخستین استادهای آماده را بررسی و انتخاب می‌کنند.
      </p>
    </div>
  );
}
