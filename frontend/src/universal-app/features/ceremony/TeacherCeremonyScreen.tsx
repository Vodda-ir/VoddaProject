"use client";

// پنل قاری — «پذیرش مراسم»: صندوق فراخوان‌های باز مراسم (پذیرش با قیمت و
// پیام) + «پذیرش‌های من» با وضعیت و امکان پس‌گرفتن. پایش زندهٔ هر ۸ ثانیه.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { digitsOnly, toFaDigits } from "../../ui/persian";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Icon,
  LoadingState,
  Sheet,
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { acceptTeacherCeremonyCall, getTeacherCeremonyInbox, getTeacherPresenceServices, withdrawTeacherCeremonyOffer } from "./api";
import { ToneChip, TopicIcon, audienceMeta, ceremonyWhenLabel, formatBudgetRange, formatToman, inputStyle, offerStatusMeta } from "./elements";
import { AmountPicker } from "./fields";
import type { CeremonyOffer, PresenceService, TeacherCeremonyInboxCall } from "./types";

function OpenCallCard({
  item,
  suggestedPrice,
  busy,
  onAccept,
}: {
  item: TeacherCeremonyInboxCall;
  suggestedPrice: PresenceService | null;
  busy: boolean;
  onAccept: (call: TeacherCeremonyInboxCall["call"], suggested: PresenceService | null) => void;
}) {
  const call = item.call;
  const accepted = item.accepted || item.my_offer !== null;
  return (
    <div
      className="vodda-enter"
      style={{
        border: `1.4px solid ${accepted ? colors.olive200 : colors.goldSoft}`,
        borderRadius: 18,
        padding: 14,
        display: "grid",
        gap: 10,
        background: accepted ? colors.olive50 : colors.surface,
        boxShadow: shadows.sm,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: 14, background: colors.goldBackground, color: colors.goldDark, flex: "0 0 42px" }}>
          <TopicIcon icon={call.icon} size={20} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: colors.ink }}>{call.title}</strong>
          <span style={{ display: "block", fontSize: 12, color: colors.inkMuted, marginTop: 2 }}>
            {ceremonyWhenLabel(call)} · 📍 {call.city || "شهر نامشخص"}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: colors.inkSecondary, background: colors.sand100, border: `1px solid ${colors.sand200}`, borderRadius: 999, padding: "3px 9px" }}>
          <Icon name="users" size={11} /> {toFaDigits(call.guests_count)} مهمان
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: colors.inkSecondary, background: colors.sand100, border: `1px solid ${colors.sand200}`, borderRadius: 999, padding: "3px 9px" }}>
          <Icon name="mic" size={11} /> {toFaDigits(call.reciters_needed)} قاری
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: colors.inkSecondary, background: colors.sand100, border: `1px solid ${colors.sand200}`, borderRadius: 999, padding: "3px 9px" }}>
          {audienceMeta[call.audience]}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: colors.goldDark, background: colors.goldBackground, border: `1px solid ${colors.goldSoft}`, borderRadius: 999, padding: "3px 9px", fontWeight: 700 }}>
          {formatBudgetRange(call.budget_min, call.budget_max)}
        </span>
      </div>

      {call.note ? (
        <p style={{ margin: 0, fontSize: 12.5, color: colors.inkSecondary, background: colors.sand50, borderRadius: 12, padding: "8px 11px", lineHeight: 1.9 }}>
          «{call.note}»
        </p>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Avatar name={call.organizer_name || "برگزارکننده"} src={call.organizer_avatar || undefined} size={40} ring={false} />
        <span style={{ fontSize: 12, color: colors.inkMuted }}>
          برگزارکننده: <strong style={{ color: colors.inkSecondary }}>{(call.organizer_name || "کاربر وُدّا").split(" ")[0]}</strong>
        </span>
      </div>

      {accepted ? (
        <p style={{ margin: 0, fontSize: 12.5, color: colors.olive700, lineHeight: 1.9 }}>
          ⏳ پذیرش شما ثبت شد؛ منتظر انتخاب برگزارکننده هستید. نتیجه در «پذیرش‌های من» دیده می‌شود.
        </p>
      ) : (
        <Button onClick={() => onAccept(call, suggestedPrice)} loading={busy} disabled={busy} style={{ minHeight: 46 }}>
          🤝 پذیرش این مراسم
        </Button>
      )}
      {!accepted && suggestedPrice ? (
        <span style={{ fontSize: 11, color: colors.inkFaint }}>
          پیشنهاد قیمت از خدمات حضوری شما: {formatToman(suggestedPrice.base_price)}
        </span>
      ) : null}
    </div>
  );
}

const offerRowStyle = {
  border: `1px solid ${colors.sand200}`,
  borderRadius: 16,
  padding: 13,
  display: "grid",
  gap: 8,
  background: colors.surface,
} as const;

function MyOfferRow({
  offer,
  busy,
  onWithdraw,
}: {
  offer: CeremonyOffer;
  busy: boolean;
  onWithdraw: () => void;
}) {
  const waiting = offer.status === "waiting";
  return (
    <div className="vodda-enter" style={{ ...offerRowStyle, borderColor: waiting ? colors.goldSoft : undefined }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <strong style={{ minWidth: 0, flex: 1, fontSize: 13.5, color: colors.ink }}>
          پذیرش #{toFaDigits(offer.id)} · {formatToman(offer.price)}
        </strong>
        <ToneChip tone={offerStatusMeta[offer.status]} />
      </div>
      {offer.message ? (
        <span style={{ fontSize: 12, color: colors.inkSecondary, lineHeight: 1.8 }}>«{offer.message}»</span>
      ) : null}
      {waiting ? (
        <Button variant="secondary" onClick={onWithdraw} loading={busy} disabled={busy} style={{ minHeight: 40 }}>
          پس گرفتن پذیرش
        </Button>
      ) : offer.status === "chosen" ? (
        <p style={{ margin: 0, fontSize: 12.5, color: colors.olive700, lineHeight: 1.9 }}>
          🎉 برگزارکننده شما را انتخاب کرد! قرارداد مراسم در «خدمات حضوری» پیگیری می‌شود.
        </p>
      ) : (
        <p style={{ margin: 0, fontSize: 12, color: colors.inkMuted, lineHeight: 1.8 }}>
          این فراخوان بسته شد؛ پذیرش شما انتخاب نشد.
        </p>
      )}
    </div>
  );
}

export function TeacherCeremonyScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const [tab, setTab] = useState<"calls" | "offers">("calls");
  const [inbox, setInbox] = useState<{ calls: TeacherCeremonyInboxCall[]; offers: CeremonyOffer[] } | null>(null);
  const [myServices, setMyServices] = useState<PresenceService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState(0);
  const [sheetCall, setSheetCall] = useState<TeacherCeremonyInboxCall["call"] | null>(null);
  const [sheetPrice, setSheetPrice] = useState("");
  const [sheetPresets, setSheetPresets] = useState<number[]>([]);
  const [sheetMessage, setSheetMessage] = useState("");
  const [sheetSaving, setSheetSaving] = useState(false);
  const [sheetError, setSheetError] = useState("");
  const [tick, setTick] = useState(0);
  const pollRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [data, services] = await Promise.all([
        getTeacherCeremonyInbox(runtime),
        getTeacherPresenceServices(runtime).catch(() => [] as PresenceService[]),
      ]);
      setInbox(data);
      setMyServices(services);
      setError("");
    } catch (caught) {
      setError(messageOf(caught, "دریافت فراخوان‌های مراسم ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // پایش زنده هر ۸ ثانیه؛ پاکسازی در unmount.
  useEffect(() => {
    pollRef.current = window.setInterval(() => {
      void refresh();
      setTick((value) => value + 1);
    }, 8000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [refresh]);

  const openCalls = useMemo(() => inbox?.calls ?? [], [inbox]);
  const myOffers = useMemo(() => inbox?.offers ?? [], [inbox]);
  const waitingCount = useMemo(() => myOffers.filter((offer) => offer.status === "waiting").length, [myOffers]);

  const openAcceptSheet = useCallback((call: TeacherCeremonyInboxCall["call"], suggested: PresenceService | null) => {
    setSheetCall(call);
    setSheetPrice(suggested && suggested.base_price > 0 ? String(Math.round(suggested.base_price)) : "");
    // پیشنهادهای سریع قیمت: قیمت پایهٔ خود قاری + بودجهٔ اعلام‌شدهٔ فراخوان.
    const presets: number[] = [];
    if (suggested && suggested.base_price > 0) presets.push(Math.round(suggested.base_price));
    if (call.budget_max > 0) presets.push(Math.round(call.budget_max));
    if (call.budget_min > 0 && call.budget_max > 0) presets.push(Math.round((call.budget_min + call.budget_max) / 2));
    if (call.budget_min > 0) presets.push(Math.round(call.budget_min));
    setSheetPresets([...new Set(presets)]);
    setSheetMessage("");
    setSheetError("");
  }, []);

  const submitAccept = useCallback(async () => {
    if (!sheetCall || sheetSaving) return;
    setSheetSaving(true);
    setSheetError("");
    try {
      const price = Number(digitsOnly(sheetPrice) || 0);
      await acceptTeacherCeremonyCall(runtime, sheetCall.id, {
        price: price > 0 ? price : undefined,
        message: sheetMessage.trim() ? sheetMessage.trim() : undefined,
      });
      setSheetCall(null);
      await refresh();
      setTab("offers");
    } catch (caught) {
      setSheetError(messageOf(caught, "پذیرش فراخوان انجام نشد."));
    } finally {
      setSheetSaving(false);
    }
  }, [refresh, runtime, sheetCall, sheetMessage, sheetPrice, sheetSaving]);

  const withdraw = useCallback(
    async (offerId: number) => {
      if (busyId) return;
      setBusyId(offerId);
      try {
        await withdrawTeacherCeremonyOffer(runtime, offerId);
        await refresh();
      } catch (caught) {
        setActionError(messageOf(caught, "پس گرفتن پذیرش انجام نشد."));
      } finally {
        setBusyId(0);
      }
    },
    [busyId, refresh, runtime],
  );

  if (loading) return <LoadingState label="در حال دریافت فراخوان‌های مراسم…" />;

  const callsTabActive = tab === "calls";

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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 15, background: "rgba(255,255,255,.14)" }}>
            <Icon name="mic" size={23} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>پذیرش مراسم</h1>
            <span style={{ fontSize: 12.5, opacity: 0.85 }}>فراخوان‌های مراسم حضوری را ببین و پذیرش کن</span>
          </div>
          <div style={{ marginInlineStart: "auto", textAlign: "center" }}>
            <strong style={{ display: "block", fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{toFaDigits(openCalls.length)}</strong>
            <span style={{ fontSize: 10.5, opacity: 0.8 }}>فراخوان باز</span>
          </div>
        </div>
        {waitingCount > 0 ? (
          <p style={{ margin: "12px 0 0", fontSize: 12.5, background: "rgba(255,255,255,.12)", borderRadius: 12, padding: "8px 11px", lineHeight: 1.8 }}>
            ⏳ {toFaDigits(waitingCount)} پذیرش فعال دارید که منتظر انتخاب برگزارکننده هستند.
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, margin: 0 }}>
          {error}
        </p>
      ) : null}

      <div className="vodda-enter" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {([
          ["calls", `فراخوان‌های باز${openCalls.length > 0 ? ` (${toFaDigits(openCalls.length)})` : ""}`],
          ["offers", `پذیرش‌های من${myOffers.length > 0 ? ` (${toFaDigits(myOffers.length)})` : ""}`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            style={{
              minHeight: 44,
              border: 0,
              borderRadius: 14,
              color: tab === key ? colors.surface : colors.inkMuted,
              background: tab === key ? colors.olive600 : colors.surface,
              boxShadow: shadows.xs,
              fontFamily: typography.fontFamily,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {callsTabActive ? (
        openCalls.length === 0 ? (
          <Card style={{ padding: 20, borderRadius: 20, textAlign: "center" }}>
            <EmptyState
              title="فعلاً فراخوان مراسمی نیست"
              description="به‌محض ثبت فراخوان مراسم توسط برگزارکننده‌ها، همین‌جا نمایش داده می‌شود. برای دیده‌شدن در جستجوی مراسم، خدمات حضوری خود را ثبت کنید."
            />
            <Button variant="secondary" onClick={() => navigateApp("/t/presence", config)} style={{ minHeight: 44 }}>
              ثبت خدمات حضوری
            </Button>
            <span style={{ display: "block", marginTop: 10, fontSize: 11.5, color: colors.inkFaint }} aria-hidden="true">
              {tick > 0 ? "به‌روزرسانی شد" : ""}
            </span>
          </Card>
        ) : (
          <div style={{ display: "grid", gap: spacing.md }}>
            {openCalls.map((item) => {
              const suggested = myServices.find((service) => service.official_service_id === item.call.official_service_id) ?? null;
              return (
                <OpenCallCard
                  key={item.call.id}
                  item={item}
                  suggestedPrice={suggested}
                  busy={busyId === item.call.id}
                  onAccept={openAcceptSheet}
                />
              );
            })}
          </div>
        )
      ) : myOffers.length === 0 ? (
        <Card style={{ padding: 20, borderRadius: 20, textAlign: "center" }}>
          <EmptyState
            icon={<Icon name="checkCircle" size={28} />}
            title="پذیرشی ثبت نکرده‌اید"
            description="با پذیرش فراخوان‌های مراسم، برگزارکننده‌ها شما را می‌بینند و انتخاب می‌کنند."
          />
        </Card>
      ) : (
        <div style={{ display: "grid", gap: spacing.md }}>
          {myOffers.map((offer) => (
            <MyOfferRow key={offer.id} offer={offer} busy={busyId === offer.id} onWithdraw={() => void withdraw(offer.id)} />
          ))}
        </div>
      )}

      {actionError ? (
        <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, margin: 0 }}>
          {actionError}
        </p>
      ) : null}

      <p style={{ margin: 0, fontSize: 11.5, color: colors.inkMuted, lineHeight: 1.9 }}>
        نکته: اگر در پذیرش قیمت ننویسید، قیمت خدمت حضوریِ شما برای همان موضوع مبنای محاسبه می‌شود. پس از انتخاب‌شدن، قرارداد ساخته شده و ودیعه از برگزارکننده دریافت می‌گردد.
      </p>

      <Sheet
        open={sheetCall !== null}
        title={sheetCall ? `پذیرش «${sheetCall.title}»` : "پذیرش مراسم"}
        onClose={() => { if (!sheetSaving) setSheetCall(null); }}
      >
        {sheetCall ? (
          <div style={{ display: "grid", gap: spacing.lg }}>
            <p style={{ ...typography.bodySmall, margin: 0, color: colors.inkSecondary, lineHeight: 1.9 }}>
              {ceremonyWhenLabel(sheetCall)} · 📍 {sheetCall.city || "شهر نامشخص"} · 👥 {toFaDigits(sheetCall.guests_count)} مهمان
              {sheetCall.budget_min > 0 || sheetCall.budget_max > 0 ? (
                <>
                  {" "}· 💰 بودجهٔ برگزارکننده: <strong>{formatBudgetRange(sheetCall.budget_min, sheetCall.budget_max)}</strong>
                </>
              ) : null}
            </p>
            <AmountPicker
              label="حق‌الزحمهٔ پیشنهادی"
              hint="تومان — از پیشنهادها انتخاب کنید یا دقیق بنویسید"
              value={sheetPrice}
              onChange={setSheetPrice}
              presets={sheetPresets}
              ariaLabel="حق‌الزحمهٔ پیشنهادی به تومان"
              emptyHint="خالی بگذارید تا قیمت خدمت حضوری شما برای این موضوع اعمال شود."
            />
            <label style={{ display: "grid", gap: 7, ...typography.bodySmall }}>
              <span style={{ fontWeight: 800, color: colors.inkSecondary }}>پیام به برگزارکننده (اختیاری)</span>
              <textarea
                value={sheetMessage}
                onChange={(event) => setSheetMessage(event.target.value.slice(0, 200))}
                rows={3}
                placeholder="مثلاً: تجربهٔ اجرای مراسم عروسی و ختم را دارم…"
                style={{ ...inputStyle, resize: "none", lineHeight: 1.9 }}
              />
            </label>
            {sheetError ? (
              <p role="alert" style={{ ...typography.caption, margin: 0, color: colors.danger }}>{sheetError}</p>
            ) : null}
            <Button fullWidth loading={sheetSaving} disabled={sheetSaving} onClick={() => void submitAccept()} style={{ minHeight: 50 }}>
              ثبت پذیرش
            </Button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
