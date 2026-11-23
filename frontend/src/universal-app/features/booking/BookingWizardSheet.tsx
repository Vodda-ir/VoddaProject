"use client";

// ------------------------------------------------------------------------
// ویزارد حرفه‌ای رزرو خدمت — کادرِ پاپ‌آپ که با انتخاب هر خدمت بالا می‌آید.
//
// چرخهٔ عملیات با نوار پیشرفت مشخص است؛ کاربر همیشه می‌بیند چند مرحله در پیش
// دارد و چند مرحله را انجام داده است:
//   ۱) نوع جلسه      — فوری یا زمان‌دار (فقط وقتی استاد جلسهٔ فوری فعال کرده)
//   ۲) روش برگزاری   — تلفنی، متنی یا تصویری (هر روش قیمت و مدت خودش را دارد)
//   ۳) زمان جلسه     — فوری: همین حالا؛ زمان‌دار: روز و ساعت از تقویم رسمی استاد
//   ۴) تأیید و پرداخت— خلاصهٔ رزرو + کیف پول یا درگاه سامان‌سپ
//
// مراحلِ بی‌مورد خودکار حذف می‌شوند (مثلاً استاد بدون جلسهٔ فوری، یا خدمتِ
// بدون روش آنلاین) و نوار پیشرفت همان تعداد واقعی را نشان می‌دهد.
// رزرو در همان‌جا که خدمت انتخاب شد انجام می‌شود — کاربر دیگر تا ته اپ
// اسکرول نمی‌کند.
// ------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlatformHttpError } from "../../platform/http";
import { usePlatform } from "../../platform/context";
import { createBooking, getBookingAvailability, getBookingMe, type BookingPaymentMethod } from "./api";
import { payViaSamanGate } from "../../../lib/saman-gate";
import type { BookingSlot } from "./types";
import type { Teacher, TeacherService } from "../teachers/types";
import { Avatar, Button, Icon, Sheet, colors, gradients, radii, spacing, typography } from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { useAppearance } from "../../ui/appearance";
import { formatAppDate } from "../../ui/jalali";
import { localizedDigits } from "../../ui/persian";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";

export type BookingWizardResult = {
  wasInstant: boolean;
  /** شناسهٔ جلسهٔ تازه‌ساخته — برای پرش مستقیم به جزئیات جلسهٔ فوری. */
  instantSessionId: number;
  /** کاربر به درگاه بانک ارسال شده است. */
  gateway: boolean;
};

type StepKey = "type" | "mode" | "time" | "pay";

const STEP_META: Record<StepKey, { title: string; icon: "sparkle" | "grid" | "calendar" | "wallet" }> = {
  type: { title: "نوع جلسه", icon: "sparkle" },
  mode: { title: "روش برگزاری", icon: "grid" },
  time: { title: "زمان جلسه", icon: "calendar" },
  pay: { title: "تأیید و پرداخت", icon: "wallet" },
};

const MODE_ORDER: Record<string, number> = { voice: 0, text: 1, video: 2 };

/** هویت بصری سه نوع جلسهٔ آنلاین — تلفنی/متنی/تصویری. */
export function sessionModeMeta(mode: string): { label: string; icon: "phone" | "message" | "video"; hint: string } | null {
  if (mode === "voice") return { label: "تلفنی و صوتی", icon: "phone", hint: "تماس صوتی از داخل اپ — شماره‌ها پنهان می‌مانند" };
  if (mode === "text") return { label: "متنی (چت)", icon: "message", hint: "چت امن با متن، ویس و تصویر" };
  if (mode === "video") return { label: "تصویری", icon: "video", hint: "کلاس زندهٔ تصویری با دوربین و میکروفون" };
  return null;
}

const weekdays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

type DateGroup = { localDate: string; weekday: number; slots: BookingSlot[] };

/* ─────────────────────  کارت گزینهٔ انتخابی (رادیو)  ───────────────────── */

/** کارت رادیویی مشترک ویزاردها — آنلاین و حضوری از همین کامپوننت استفاده می‌کنند. */
export function OptionCard({
  selected,
  disabled = false,
  icon,
  tone,
  title,
  desc,
  trailing,
  onSelect,
}: {
  selected: boolean;
  disabled?: boolean;
  icon: "sparkle" | "calendar" | "phone" | "message" | "video" | "pin" | "book" | "wallet" | "home";
  tone: "gold" | "olive";
  title: string;
  desc: string;
  trailing?: React.ReactNode;
  onSelect: () => void;
}) {
  const isGold = tone === "gold";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.md,
        padding: 13,
        textAlign: "right",
        color: disabled ? colors.inkMuted : colors.ink,
        background: selected
          ? isGold
            ? colors.goldBackground
            : colors.olive50
          : colors.surface,
        border: selected
          ? `1.6px solid ${isGold ? colors.gold : colors.olive600}`
          : `1px solid ${colors.sand200}`,
        borderRadius: 16,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontFamily: typography.fontFamily,
        width: "100%",
        minWidth: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 42,
          height: 42,
          display: "grid",
          placeItems: "center",
          flex: "0 0 42px",
          borderRadius: 14,
          background: isGold ? "linear-gradient(145deg,#d8b869,#b8923c)" : selected ? colors.olive600 : colors.olive50,
          color: isGold || selected ? "#fffaf0" : colors.olive700,
          boxShadow: isGold ? "0 6px 14px rgba(139,104,31,.3)" : "none",
        }}
      >
        <Icon name={icon} size={20} stroke={2} />
      </span>
      <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
        <strong style={{ fontSize: 13.5, fontWeight: 800, display: "block" }}>{title}</strong>
        <span style={{ fontSize: 11, lineHeight: 1.7, color: colors.inkMuted, display: "block" }}>{desc}</span>
      </span>
      {trailing ?? null}
      <span
        aria-hidden="true"
        style={{
          width: 20,
          height: 20,
          flex: "0 0 20px",
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          border: selected ? `1.5px solid ${isGold ? colors.gold : colors.olive600}` : `1.5px solid ${colors.sand200}`,
          background: selected ? (isGold ? colors.gold : colors.olive600) : "transparent",
          color: "#fffaf0",
        }}
      >
        {selected ? <Icon name="check" size={12} stroke={3} /> : null}
      </span>
    </button>
  );
}

/* ─────────────────────────  ویزارد اصلی  ───────────────────────── */

export function BookingWizardSheet({
  open,
  teacher,
  initialService,
  defaultInstant = false,
  onClose,
  onBooked,
}: {
  open: boolean;
  teacher: Teacher;
  /** خدمتی که کاربر روی آن کلیک کرده — به‌عنوان انتخاب آغازین پیش‌فرض می‌شود. */
  initialService: TeacherService | null;
  /** باز شدن با پیش‌فرض «فوری» — از دکمهٔ «درخواست جلسهٔ فوری» استاد. */
  defaultInstant?: boolean;
  onClose: () => void;
  onBooked: (result: BookingWizardResult) => void;
}) {
  const runtime = usePlatform();
  const { L, lang, N } = useAppearance();

  const [instant, setInstant] = useState<boolean | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [slot, setSlot] = useState<BookingSlot | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>("wallet");
  const [stepIndex, setStepIndex] = useState(0);
  const [wallet, setWallet] = useState<number | null>(null);
  const [meId, setMeId] = useState(0);
  const [availability, setAvailability] = useState<BookingSlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [loadedServiceId, setLoadedServiceId] = useState(0);
  const [localDate, setLocalDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const availabilityRequest = useRef(0);

  /* ---------- کیف پول و هویت کاربر (برای روش پرداخت و محافظت خود-رزرو) ---------- */
  useEffect(() => {
    if (!open) return;
    let active = true;
    getBookingMe(runtime)
      .then((me) => {
        if (!active) return;
        setMeId(me.id);
        setWallet(me.wallet);
      })
      .catch(() => { /* موجودی نامشخص می‌ماند؛ رزرو همچنان ممکن است */ });
    return () => { active = false; };
  }, [open, runtime]);

  const activeServices = useMemo(
    () => teacher.services.filter((item) => item.active && item.id > 0),
    [teacher.services],
  );

  /** سه‌گانهٔ آنلاین استاد — تلفنی/متنی/تصویری به ترتیب. */
  const onlineServices = useMemo(
    () =>
      [...activeServices]
        .filter((item) => item.mode === "voice" || item.mode === "text" || item.mode === "video")
        .sort((left, right) => (MODE_ORDER[left.mode ?? ""] ?? 9) - (MODE_ORDER[right.mode ?? ""] ?? 9)),
    [activeServices],
  );

  /** اگر خدمتِ لمس‌شده آنلاین باشد و استاد بیش از یک روش آنلاین داشته باشد،
   * مرحلهٔ «روش برگزاری» نمایش داده می‌شود و کاربر می‌تواند جابه‌جا شود. */
  const modeSelectable = (initialService?.mode ?? "") !== "" && onlineServices.length >= 2;

  /* ---------- بازنشانی کامل با هر بار باز شدن ---------- */
  useEffect(() => {
    if (!open) return;
    const instantOffered = teacher.instantEnabled;
    const presetInstant = defaultInstant === true && instantOffered;
    setInstant(instantOffered ? (presetInstant ? true : null) : false);
    setServiceId(initialService && initialService.id > 0 ? initialService.id : null);
    setSlot(null);
    setLocalDate(null);
    setSubmitError("");
    setAvailability([]);
    setAvailabilityError("");
    setLoadedServiceId(0);
    setPaymentMethod("wallet");
    // با پیش‌فرض «فوری»، مرحلهٔ نوع جلسه از قبل پاس شده است — از مرحلهٔ بعدی شروع می‌شود.
    setStepIndex(presetInstant ? (modeSelectable ? 1 : 0) : 0);
  }, [open, initialService, teacher.instantEnabled, defaultInstant, modeSelectable]);

  const service = useMemo(
    () => activeServices.find((item) => item.id === serviceId) ?? null,
    [activeServices, serviceId],
  );

  /* ---------- مراحل چرخه — مراحل بی‌مورد خودکار حذف می‌شوند ---------- */
  const steps = useMemo<StepKey[]>(() => {
    const list: StepKey[] = [];
    if (teacher.instantEnabled) list.push("type");
    if (modeSelectable) list.push("mode");
    list.push("time");
    list.push("pay");
    return list;
  }, [teacher.instantEnabled, modeSelectable]);

  const safeStepIndex = Math.min(stepIndex, Math.max(0, steps.length - 1));
  const currentStep = steps[safeStepIndex] ?? "pay";
  const isLastStep = safeStepIndex === steps.length - 1;

  /* ---------- تقویم آزاد استاد (فقط برای جلسهٔ زمان‌دار) ---------- */
  const loadAvailability = useCallback(
    async (targetService: TeacherService) => {
      const request = ++availabilityRequest.current;
      setAvailabilityLoading(true);
      setAvailabilityError("");
      try {
        const rows = await getBookingAvailability(runtime, teacher.id, targetService.id, 14);
        if (availabilityRequest.current !== request) return;
        setAvailability(rows);
      } catch (error) {
        if (availabilityRequest.current !== request) return;
        setAvailability([]);
        setAvailabilityError(messageOf(error, L("زمان‌های آزاد استاد دریافت نشد.")));
      } finally {
        if (availabilityRequest.current === request) setAvailabilityLoading(false);
      }
    },
    [runtime, teacher.id, L],
  );

  useEffect(() => {
    if (!open || instant !== false || !service || loadedServiceId === service.id) return;
    setLoadedServiceId(service.id);
    void loadAvailability(service);
  }, [open, instant, service, loadedServiceId, loadAvailability]);

  const dateGroups = useMemo<DateGroup[]>(() => {
    const grouped = new Map<string, BookingSlot[]>();
    for (const item of availability) {
      const rows = grouped.get(item.localDate) ?? [];
      rows.push(item);
      grouped.set(item.localDate, rows);
    }
    return [...grouped.entries()].map(([date, rows]) => ({
      localDate: date,
      weekday: rows[0]?.weekday ?? -1,
      slots: [...rows].sort((left, right) => left.startAt.localeCompare(right.startAt)),
    }));
  }, [availability]);

  const selectedDateSlots = useMemo(
    () => dateGroups.find((group) => group.localDate === localDate)?.slots ?? [],
    [dateGroups, localDate],
  );

  /* ---------- پرداخت ---------- */
  const isFreeService = service ? service.price === 0 : false;
  const walletCovers = wallet !== null && service ? wallet >= service.price : false;

  useEffect(() => {
    if (!service || service.price === 0) return;
    setPaymentMethod(walletCovers ? "wallet" : "gateway");
  }, [service?.id, service?.price, walletCovers]);

  const isSelfTeacher = Boolean(teacher.userId && meId && teacher.userId === meId);

  /* ---------- اعتبار هر مرحله ---------- */
  const stepValid = useCallback(
    (key: StepKey): boolean => {
      switch (key) {
        case "type": return instant !== null;
        case "mode": return serviceId !== null;
        case "time": return instant === true || slot !== null;
        case "pay": return !isSelfTeacher;
      }
    },
    [instant, serviceId, slot, isSelfTeacher],
  );

  const canAdvance = stepValid(currentStep);

  /* ---------- ثبت نهایی رزرو ---------- */
  const submit = useCallback(async () => {
    if (!teacher || !service || saving) return;
    if (isSelfTeacher) {
      setSubmitError(L("نمی‌توانید استاد خودتان را رزرو کنید؛ برای رزرو با حساب قرآن‌آموز وارد شوید."));
      return;
    }
    if (instant !== true && !slot) {
      setSubmitError(L("ابتدا زمان جلسه را انتخاب کنید."));
      return;
    }
    setSaving(true);
    setSubmitError("");
    try {
      const response = await createBooking(runtime, {
        teacherId: teacher.id,
        serviceId: service.id,
        // فوری: آغاز دو دقیقهٔ بعد؛ زمان‌دار: startAt رسمی بک‌اند در UTC —
        // بازسازی زمان از timezone دستگاه ممنوع است.
        scheduledAt:
          instant === true
            ? new Date(Date.now() + 2 * 60_000).toISOString()
            : (slot?.startAt ?? ""),
        // خدمات رایگان بدون روش پرداخت ثبت می‌شوند.
        paymentMethod: service.price === 0 ? "" : paymentMethod,
        instant: instant === true,
      });
      const createdId = (response.data?.session as { id?: number } | undefined)?.id ?? 0;
      if (response.data?.token) {
        // درگاه بانک — فرم توکن از مرورگر کاربر پست می‌شود؛ جلسه تا پایان
        // پرداخت در حالت awaiting payment نگه داشته می‌شود.
        onBooked({ wasInstant: instant === true, instantSessionId: createdId, gateway: true });
        payViaSamanGate(response.data.token);
        return;
      }
      onBooked({ wasInstant: instant === true, instantSessionId: createdId, gateway: false });
    } catch (error) {
      if (error instanceof PlatformHttpError && error.status === 409) {
        setSlot(null);
        setSubmitError(
          instant === true
            ? L("امکان ثبت جلسهٔ فوری همین حالا نبود؛ لطفاً دوباره تلاش کنید یا جلسهٔ زمان‌دار بگیرید.")
            : L("این زمان همین حالا رزرو شده است؛ زمان‌های آزاد دوباره دریافت شدند. لطفاً زمان دیگری انتخاب کنید."),
        );
        if (instant !== true) setLoadedServiceId(0); // دریافت دوبارهٔ تقویم
      } else {
        setSubmitError(
          messageOf(error, L(instant === true ? "ثبت جلسهٔ فوری انجام نشد." : "ثبت درخواست رزرو انجام نشد.")),
        );
      }
    } finally {
      setSaving(false);
    }
  }, [teacher, service, saving, isSelfTeacher, instant, slot, runtime, paymentMethod, onBooked, L]);

  const goNext = useCallback(() => {
    if (!canAdvance || saving) return;
    if (isLastStep) {
      void submit();
      return;
    }
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }, [canAdvance, saving, isLastStep, submit, steps.length]);

  /* ---------- زمان ثبت در صورت موفقیت در والد: پیام موفقیت یا درگاه ---------- */

  const submitLabel = isFreeService
    ? L("ثبت درخواست جلسهٔ رایگان")
    : instant === true
      ? paymentMethod === "gateway"
        ? L("پرداخت و ثبت جلسهٔ فوری")
        : L("ارسال درخواست جلسهٔ فوری")
      : paymentMethod === "gateway"
        ? L("پرداخت و ثبت رزرو")
        : L("ثبت درخواست رزرو");

  /* ---------- خلاصهٔ رزرو برای مرحلهٔ پرداخت ---------- */
  const summaryRows = useMemo<Array<[string, string]>>(() => {
    if (!service) return [];
    const modeMeta = sessionModeMeta(service.mode ?? "");
    const rows: Array<[string, string]> = [
      [L("استاد"), N(teacher.name)],
      [L("خدمت"), L(service.title)],
    ];
    if (modeMeta) rows.push([L("روش برگزاری"), L(modeMeta.label)]);
    rows.push([L("نوع جلسه"), instant === true ? L("فوری — همین حالا") : L("زمان‌دار")]);
    if (instant === true) {
      rows.push([L("زمان آغاز"), L("دو دقیقهٔ بعد از ثبت")]);
    } else if (slot) {
      rows.push([L("تاریخ"), formatAppDate(slot.localDate, lang, { withWeekday: slot.weekday })]);
      rows.push([L("ساعت"), `${slot.localStart} ${L("تا")} ${slot.localEnd}`]);
    }
    rows.push([L("مدت"), `${localizedDigits(service.duration, lang)} ${L("دقیقه")}`]);
    rows.push([
      L("مبلغ"),
      service.price === 0
        ? L("رایگان — بدون پرداخت")
        : `${formatWalletAmount(Math.max(0, service.price))} ${L("تومان")}`,
    ]);
    return rows;
  }, [service, teacher.name, instant, slot, lang, L, N]);

  return (
    <Sheet open={open} title={L("رزرو جلسه")} onClose={() => { if (!saving) onClose(); }}>
      <div style={{ display: "grid", gap: spacing.lg }}>
        {/* ─── سرستون چرخه: عنوان + شمار مرحله + نوار پیشرفت + برچسب‌ها ─── */}
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 15.5, fontWeight: 900, color: colors.ink, minWidth: 0 }}>
              {service ? L(service.title) : L("انتخاب مشخصات جلسه")}
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
                .replace("{n}", localizedDigits(safeStepIndex + 1, lang))
                .replace("{m}", localizedDigits(steps.length, lang))}
            </span>
          </div>

          {/* نوار پیشرفت — هر پاره‌خط یک مرحله؛ انجام‌شده پررنگ */}
          <div role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={safeStepIndex + 1} style={{ display: "flex", gap: 5 }}>
            {steps.map((key, index) => (
              <span
                key={key}
                aria-hidden="true"
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 999,
                  background: index <= safeStepIndex ? colors.olive600 : colors.sand150,
                  transition: "background .3s ease",
                }}
              />
            ))}
          </div>

          {/* برچسب مراحل — انجام‌شده با تیک، فعلی برجسته، آینده کم‌رنگ */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {steps.map((key, index) => {
              const meta = STEP_META[key];
              const done = index < safeStepIndex;
              const active = index === safeStepIndex;
              return (
                <span
                  key={key}
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
                    color: done ? "#fffaf0" : active ? colors.olive700 : colors.inkMuted,
                    background: done ? colors.olive600 : active ? colors.olive50 : colors.surface,
                    border: `1px solid ${done ? colors.olive600 : active ? colors.olive100 : colors.sand150}`,
                  }}
                >
                  <Icon name={done ? "check" : meta.icon} size={12} stroke={2.2} />
                  {L(meta.title)}
                </span>
              );
            })}
          </div>
        </div>

        {/* ─── بافت استاد — رزرو همیشه در بستر همان استاد دیده می‌شود ─── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 12px",
            borderRadius: 14,
            background: colors.sand50,
            border: `1px solid ${colors.sand150}`,
          }}
        >
          <Avatar name={teacher.name} src={teacher.avatarUrl || undefined} size={38} ring={false} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ display: "block", fontSize: 13, fontWeight: 800, color: colors.ink }}>{N(teacher.name)}</strong>
            <span style={{ display: "block", fontSize: 11, color: colors.inkMuted }}>
              {teacher.available ? L("آنلاین — آمادهٔ رزرو") : L("استاد آفلاین است")}
            </span>
          </div>
          {teacher.instantEnabled ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 10px",
                borderRadius: 999,
                background: colors.goldBackground,
                border: `1px solid ${colors.goldSoft}`,
                color: colors.goldInk,
                fontSize: 10.5,
                fontWeight: 800,
                flex: "0 0 auto",
              }}
            >
              <Icon name="sparkle" size={11} stroke={2.4} style={{ color: colors.goldDark }} />
              {L("فوری")}
            </span>
          ) : null}
        </div>

        {/* ─────────────── محتوای مرحلهٔ فعلی ─────────────── */}

        {currentStep === "type" ? (
          <div role="radiogroup" aria-label={L("نوع جلسه")} style={{ display: "grid", gap: 10 }}>
            <OptionCard
              selected={instant === true}
              disabled={!teacher.available}
              icon="sparkle"
              tone="gold"
              title={L("جلسهٔ فوری — همین حالا")}
              desc={
                teacher.available
                  ? L("درخواست شما مستقیم و فوری برای استاد ارسال می‌شود؛ زمان آغاز دو دقیقهٔ بعد در نظر گرفته می‌شود.")
                  : L("برای جلسهٔ فوری، استاد باید آنلاین باشد؛ این استاد هم‌اکنون آفلاین است.")
              }
              onSelect={() => { setInstant(true); setSubmitError(""); }}
            />
            <OptionCard
              selected={instant === false}
              icon="calendar"
              tone="olive"
              title={L("جلسهٔ زمان‌دار")}
              desc={L("روز و ساعت را از تقویم آزاد رسمی استاد انتخاب می‌کنید و درخواست برای او ارسال می‌شود.")}
              onSelect={() => { setInstant(false); setSubmitError(""); }}
            />
          </div>
        ) : null}

        {currentStep === "mode" ? (
          <div role="radiogroup" aria-label={L("روش برگزاری جلسه")} style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.9, color: colors.inkMuted }}>
              {L("هر روش برگزاری قیمت و مدت خودش را دارد؛ هر کدام را خواستید انتخاب کنید — رزرو همان روش انجام می‌شود.")}
            </p>
            {onlineServices.map((item) => {
              const meta = sessionModeMeta(item.mode ?? "");
              if (!meta) return null;
              const selected = item.id === serviceId;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setServiceId(item.id);
                    setSlot(null);
                    setLocalDate(null);
                    setSubmitError("");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.md,
                    padding: 13,
                    textAlign: "right",
                    width: "100%",
                    minWidth: 0,
                    color: colors.ink,
                    background: selected ? colors.greenBackground : colors.surface,
                    border: selected ? `1.6px solid ${colors.olive600}` : `1px solid ${colors.sand200}`,
                    borderRadius: 16,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 42,
                      height: 42,
                      display: "grid",
                      placeItems: "center",
                      flex: "0 0 42px",
                      borderRadius: 14,
                      background: selected ? colors.olive600 : colors.greenChip,
                      color: selected ? "#fffaf0" : colors.greenDeep,
                    }}
                  >
                    <Icon name={meta.icon} size={20} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 13.5, fontWeight: 800 }}>{L(meta.label)}</strong>
                      <span style={{ fontSize: 10.5, color: colors.inkMuted, fontWeight: 700 }}>
                        {localizedDigits(item.duration, lang)} {L("دقیقه")}
                      </span>
                    </span>
                    <span style={{ fontSize: 11, lineHeight: 1.7, color: colors.inkMuted, display: "block" }}>
                      {L(meta.hint)}
                    </span>
                  </span>
                  <span style={{ flex: "0 0 auto", textAlign: "left" }}>
                    {item.price === 0 ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: colors.goldBackground,
                          border: `1px solid ${colors.gold}`,
                          color: colors.goldDark,
                          fontSize: 11,
                          fontWeight: 900,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Icon name="gift" size={11} stroke={2.4} />
                        {L("رایگان")}
                      </span>
                    ) : (
                      <strong style={{ fontSize: 12.5, fontWeight: 900, color: colors.olive700, whiteSpace: "nowrap" }}>
                        {formatWalletAmount(Math.max(0, item.price))} {L("تومان")}
                      </strong>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {currentStep === "time" ? (
          instant === true ? (
            <div
              role="status"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "13px 15px",
                borderRadius: 16,
                background: gradients.goldPanel,
                border: `1.5px solid ${colors.goldSoft}`,
                color: colors.goldInk,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 42,
                  height: 42,
                  display: "grid",
                  placeItems: "center",
                  flex: "0 0 42px",
                  borderRadius: 14,
                  background: "linear-gradient(145deg,#d8b869,#b8923c)",
                  color: "#fffaf0",
                }}
              >
                <Icon name="sparkle" size={20} stroke={2.2} />
              </span>
              <span style={{ minWidth: 0, flex: 1, fontSize: 12, lineHeight: 1.9, fontWeight: 700 }}>
                {L("جلسهٔ فوری همین حالا ثبت می‌شود؛ زمان آغاز دو دقیقهٔ بعد از ثبت در نظر گرفته می‌شود و به‌محض تأیید استاد، جلسه باز می‌شود.")}
              </span>
            </div>
          ) : (
            <div style={{ display: "grid", gap: spacing.lg }}>
              {!service ? (
                <p style={{ margin: 0, fontSize: 12.5, color: colors.inkMuted }}>{L("ابتدا خدمت را مشخص کنید.")}</p>
              ) : availabilityLoading ? (
                <p style={{ margin: 0, fontSize: 12.5, color: colors.inkMuted, display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="clock" size={15} />
                  {L("در حال دریافت زمان‌های آزاد…")}
                </p>
              ) : availabilityError ? (
                <div style={{ display: "grid", gap: 8 }}>
                  <p role="alert" style={{ margin: 0, fontSize: 12.5, color: colors.danger }}>{availabilityError}</p>
                  <Button variant="secondary" onClick={() => void loadAvailability(service)}>{L("تلاش دوباره")}</Button>
                </div>
              ) : dateGroups.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12.5, color: colors.inkMuted, lineHeight: 1.9 }}>
                  {L("در ۱۴ روز آینده زمان آزاد و قابل رزروی برای این خدمت وجود ندارد؛ می‌توانید روش برگزاری دیگری انتخاب کنید.")}
                </p>
              ) : (
                <>
                  {/* ریل روزها */}
                  <div className="vodda-scroll-rail" style={{ display: "flex", gap: spacing.sm, overflowX: "auto", paddingBottom: spacing.xs }}>
                    {dateGroups.map((group) => {
                      const selected = localDate === group.localDate;
                      return (
                        <button
                          key={group.localDate}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => {
                            setLocalDate(group.localDate);
                            setSlot(null);
                            setSubmitError("");
                          }}
                          style={{
                            flex: "0 0 auto",
                            width: 102,
                            minHeight: 76,
                            padding: "10px 8px",
                            color: selected ? colors.onOlive : colors.inkSecondary,
                            background: selected ? colors.olive600 : colors.sand50,
                            border: `1px solid ${selected ? colors.olive600 : colors.sand200}`,
                            borderRadius: 15,
                            cursor: "pointer",
                            fontFamily: typography.fontFamily,
                            fontSize: 12,
                          }}
                        >
                          <strong style={{ display: "block", fontSize: 12, fontWeight: 700 }}>
                            {L(weekdays[group.weekday] ?? "روز")}
                          </strong>
                          <span style={{ display: "block", marginTop: 4, opacity: 0.82, fontSize: 10.5 }}>
                            {formatAppDate(group.localDate, lang, { withYear: false })} · {localizedDigits(group.slots.length, lang)} {L("زمان")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {/* ساعت‌های روز انتخابی */}
                  {localDate ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
                      {selectedDateSlots.map((item) => {
                        const selected = slot?.startAt === item.startAt;
                        return (
                          <button
                            key={item.startAt}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => {
                              setSlot(item);
                              setSubmitError("");
                            }}
                            style={{
                              padding: `${spacing.sm}px ${spacing.md}px`,
                              color: selected ? colors.onOlive : colors.inkSecondary,
                              background: selected ? colors.olive600 : colors.surface,
                              border: `1px solid ${selected ? colors.olive600 : colors.sand200}`,
                              borderRadius: radii.pill,
                              cursor: "pointer",
                              fontFamily: typography.fontFamily,
                              fontSize: 12.5,
                            }}
                          >
                            {item.localStart} {L("تا")} {item.localEnd}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: 12, color: colors.inkMuted }}>{L("یک روز را انتخاب کنید تا ساعت‌های آزاد آن نمایش داده شود.")}</p>
                  )}
                </>
              )}
            </div>
          )
        ) : null}

        {currentStep === "pay" ? (
          <div style={{ display: "grid", gap: spacing.lg }}>
            <div style={{ display: "grid" }}>
              {summaryRows.map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: spacing.md, paddingBlock: 7 }}>
                  <span style={{ color: colors.inkMuted, fontSize: 12.5 }}>{label}</span>
                  <strong style={{ textAlign: "left", fontSize: 12.5, minWidth: 0 }}>{value}</strong>
                </div>
              ))}
            </div>
            <div style={{ height: 1, background: colors.sand150 }} />
            {isFreeService ? (
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
                <span>
                  {L("این جلسه")} <b>{L("رایگان")}</b>{L(" است؛ بدون پرداخت هزینه و بدون کسر از کیف پول، درخواست شما ثبت می‌شود.")}
                </span>
              </div>
            ) : (
              <div role="radiogroup" aria-label={L("روش پرداخت")} style={{ display: "grid", gap: spacing.sm }}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === "wallet"}
                  disabled={!walletCovers}
                  onClick={() => walletCovers && setPaymentMethod("wallet")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.md,
                    padding: 13,
                    textAlign: "right",
                    color: colors.ink,
                    background: paymentMethod === "wallet" ? colors.olive50 : colors.surface,
                    border: paymentMethod === "wallet" ? `1.6px solid ${colors.olive600}` : `1px solid ${colors.sand200}`,
                    borderRadius: 16,
                    cursor: walletCovers ? "pointer" : "not-allowed",
                    opacity: walletCovers ? 1 : 0.55,
                    fontFamily: typography.fontFamily,
                    width: "100%",
                  }}
                >
                  <span style={{ display: "grid", gap: 2, flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 13.5, fontWeight: 800 }}>{L("پرداخت از کیف پول")}</strong>
                    <span style={{ fontSize: 11.5, color: colors.inkMuted }}>
                      {wallet !== null
                        ? L("موجودی: {n} تومان").replace("{n}", formatWalletAmount(wallet))
                        : L("موجودی نامشخص")}
                      {walletCovers ? "" : L(" — موجودی کافی نیست")}
                    </span>
                  </span>
                  <Icon name="wallet" size={20} style={{ color: paymentMethod === "wallet" ? colors.olive600 : colors.inkMuted }} />
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === "gateway"}
                  onClick={() => setPaymentMethod("gateway")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.md,
                    padding: 13,
                    textAlign: "right",
                    color: colors.ink,
                    background: paymentMethod === "gateway" ? colors.olive50 : colors.surface,
                    border: paymentMethod === "gateway" ? `1.6px solid ${colors.olive600}` : `1px solid ${colors.sand200}`,
                    borderRadius: 16,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily,
                    width: "100%",
                  }}
                >
                  <span style={{ display: "grid", gap: 2, flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 13.5, fontWeight: 800 }}>{L("پرداخت آنلاین با درگاه سامان‌سپ")}</strong>
                    <span style={{ fontSize: 11.5, color: colors.inkMuted }}>
                      {L("پرداخت امن با کارت بانکی؛ زمان رزرو تا پایان پرداخت نگه داشته می‌شود")}
                    </span>
                  </span>
                  <Icon name="shield" size={20} style={{ color: paymentMethod === "gateway" ? colors.olive600 : colors.inkMuted }} />
                </button>
              </div>
            )}
          </div>
        ) : null}

        {isSelfTeacher ? (
          <p
            role="alert"
            style={{
              margin: 0,
              fontSize: 12,
              padding: spacing.md,
              borderRadius: radii.md,
              background: colors.goldBackground,
              color: colors.goldDark,
              lineHeight: 1.9,
            }}
          >
            {L("این پروفایل متعلق به حساب شماست؛ رزرو جلسه با خودتان ممکن نیست. برای آزمایش فرآیند، با حساب قرآن‌آموز وارد شوید و استاد دیگری را رزرو کنید.")}
          </p>
        ) : null}

        {/* ─── نوار عملیات چسبیده — بازگشت / مرحلهٔ بعد / ثبت و پرداخت ─── */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            marginInline: `calc(-1 * ${spacing.xl}px)`,
            marginBottom: `calc(-1 * ${spacing.xxl}px - env(safe-area-inset-bottom))`,
            padding: `12px ${spacing.xl}px calc(${spacing.lg}px + env(safe-area-inset-bottom))`,
            background: colors.surface,
            borderTop: `1px solid ${colors.sand150}`,
            display: "grid",
            gap: 8,
          }}
        >
          {submitError ? (
            <p role="alert" style={{ margin: 0, fontSize: 12, color: colors.danger, lineHeight: 1.9 }}>{submitError}</p>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: safeStepIndex > 0 ? "auto 1fr" : "1fr", gap: 10 }}>
            {safeStepIndex > 0 ? (
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  setSubmitError("");
                  setStepIndex((index) => Math.max(0, index - 1));
                }}
                style={{ minHeight: 50, paddingInline: 18 }}
              >
                {L("بازگشت")}
              </Button>
            ) : null}
            <Button
              fullWidth
              loading={saving}
              disabled={!canAdvance}
              onClick={goNext}
              style={{ minHeight: 52 }}
            >
              {isLastStep ? submitLabel : L("مرحلهٔ بعد")}
              {!isLastStep ? <Icon name="chevronL" size={17} /> : null}
            </Button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
