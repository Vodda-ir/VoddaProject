"use client";

// ------------------------------------------------------------------------
// ویزارد رزرو جلسهٔ حضوری — کادرِ پاپ‌آپ مخصوص جلسات در محل.
//
// دقیقاً هم‌تراز ویزارد جلسات آنلاین است (نوار پیشرفت، چرخهٔ مراحل، پرداخت
// کیف پول/درگاه سامان‌سپ) اما با مراحل مخصوص جلسات حضوری:
//   ۱) محل برگزاری  — در محل استاد (با نشانی ثبت‌شده) یا در محل شما
//   ۲) موضوع جلسه   — انتخاب خدمت حضوری استاد + یادداشت موضوع (اختیاری)
//   ۳) زمان جلسه    — روز و ساعت از تقویم رسمی استاد
//   ۴) تأیید و پرداخت— خلاصهٔ رزرو + کیف پول یا درگاه سامان‌سپ
//
// جلسهٔ فوری برای حضور معنا ندارد (استاد باید خود را به محل برساند)؛ بنابراین
// رزرو حضوری همیشه زمان‌دار است. نشانی «در محل استاد» از پروفایل استاد
// می‌آید و نشانی «در محل شما» در همین کادر از قرآن‌آموز گرفته می‌شود.
// ------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PlatformHttpError } from "../../platform/http";
import { usePlatform } from "../../platform/context";
import { createBooking, getBookingAvailability, getBookingMe, type BookingPaymentMethod } from "./api";
import { payViaSamanGate } from "../../../lib/saman-gate";
import type { BookingSlot } from "./types";
import type { Teacher, TeacherService } from "../teachers/types";
import { OptionCard } from "./BookingWizardSheet";
import { Avatar, Button, Icon, Sheet, colors, gradients, radii, spacing, typography } from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { useAppearance } from "../../ui/appearance";
import { formatAppDate } from "../../ui/jalali";
import { localizedDigits } from "../../ui/persian";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";
import { inputStyle } from "../ceremony/elements";

export type InPersonWizardResult = {
  /** شناسهٔ جلسهٔ تازه‌ساخته — رزرو حضوری همیشه زمان‌دار است. */
  sessionId: number;
  /** کاربر به درگاه بانک ارسال شده است. */
  gateway: boolean;
};

type StepKey = "place" | "topic" | "time" | "pay";

const STEP_META: Record<StepKey, { title: string; icon: "pin" | "book" | "calendar" | "wallet" }> = {
  place: { title: "محل برگزاری", icon: "pin" },
  topic: { title: "موضوع جلسه", icon: "book" },
  time: { title: "زمان جلسه", icon: "calendar" },
  pay: { title: "تأیید و پرداخت", icon: "wallet" },
};

const weekdays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

type DateGroup = { localDate: string; weekday: number; slots: BookingSlot[] };

/* ─────────────────────────  ویزارد اصلی  ───────────────────────── */

export function InPersonWizardSheet({
  open,
  teacher,
  initialService,
  onClose,
  onBooked,
}: {
  open: boolean;
  teacher: Teacher;
  /** خدمت حضوری که کاربر روی آن کلیک کرده — انتخاب آغازین مرحلهٔ موضوع. */
  initialService: TeacherService | null;
  onClose: () => void;
  onBooked: (result: InPersonWizardResult) => void;
}) {
  const runtime = usePlatform();
  const { L, lang, N } = useAppearance();

  const [place, setPlace] = useState<"teacher" | "learner" | null>(null);
  const [learnerAddress, setLearnerAddress] = useState("");
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [slot, setSlot] = useState<BookingSlot | null>(null);
  const [localDate, setLocalDate] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>("wallet");
  const [stepIndex, setStepIndex] = useState(0);
  const [wallet, setWallet] = useState<number | null>(null);
  const [meId, setMeId] = useState(0);
  const [availability, setAvailability] = useState<BookingSlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [loadedServiceId, setLoadedServiceId] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const availabilityRequest = useRef(0);

  /* ---------- کیف پول و هویت کاربر (روش پرداخت + محافظت خود-رزرو) ---------- */
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

  /** خدمات حضوری فعال استاد — گزینه‌های مرحلهٔ «موضوع جلسه». */
  const inPersonServices = useMemo(
    () => teacher.services.filter((item) => item.active && item.id > 0 && item.mode === "in_person"),
    [teacher.services],
  );

  /* ---------- بازنشانی کامل با هر بار باز شدن ---------- */
  useEffect(() => {
    if (!open) return;
    setPlace(null);
    setLearnerAddress("");
    setServiceId(initialService && initialService.id > 0 && initialService.mode === "in_person" ? initialService.id : null);
    setNote("");
    setSlot(null);
    setLocalDate(null);
    setSubmitError("");
    setAvailability([]);
    setAvailabilityError("");
    setLoadedServiceId(0);
    setPaymentMethod("wallet");
    setStepIndex(0);
  }, [open, initialService]);

  const service = useMemo(
    () => inPersonServices.find((item) => item.id === serviceId) ?? null,
    [inPersonServices, serviceId],
  );

  /* ---------- مراحل چرخه — ویزارد حضوری همیشه چهار مرحله دارد ---------- */
  const steps = useMemo<StepKey[]>(() => ["place", "topic", "time", "pay"], []);
  const safeStepIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[safeStepIndex] ?? "pay";
  const isLastStep = safeStepIndex === steps.length - 1;

  /* ---------- تقویم آزاد استاد ---------- */
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
    if (!open || !service || loadedServiceId === service.id) return;
    setLoadedServiceId(service.id);
    void loadAvailability(service);
  }, [open, service, loadedServiceId, loadAvailability]);

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
  const teacherHasAddress = Boolean(teacher.inPersonAddress && teacher.inPersonAddress.trim().length > 0);

  /* ---------- اعتبار هر مرحله ---------- */
  const stepValid = useCallback(
    (key: StepKey): boolean => {
      switch (key) {
        case "place":
          if (place === null) return false;
          return place === "teacher" ? teacherHasAddress : learnerAddress.trim().length >= 5;
        case "topic": return serviceId !== null;
        case "time": return slot !== null;
        case "pay": return !isSelfTeacher;
      }
    },
    [place, teacherHasAddress, learnerAddress, serviceId, slot, isSelfTeacher],
  );

  const canAdvance = stepValid(currentStep);

  /* ---------- ثبت نهایی رزرو ---------- */
  const submit = useCallback(async () => {
    if (!teacher || !service || saving) return;
    if (isSelfTeacher) {
      setSubmitError(L("نمی‌توانید استاد خودتان را رزرو کنید؛ برای رزرو با حساب قرآن‌آموز وارد شوید."));
      return;
    }
    if (!place) {
      setSubmitError(L("ابتدا محل برگزاری را انتخاب کنید."));
      return;
    }
    if (place === "learner" && learnerAddress.trim().length < 5) {
      setSubmitError(L("نشانی دقیق محل جلسه را وارد کنید."));
      return;
    }
    if (!slot) {
      setSubmitError(L("ابتدا زمان جلسه را انتخاب کنید."));
      return;
    }
    setSaving(true);
    setSubmitError("");
    try {
      const response = await createBooking(runtime, {
        teacherId: teacher.id,
        serviceId: service.id,
        // startAt رسمی بک‌اند در UTC — بازسازی زمان از timezone دستگاه ممنوع است.
        scheduledAt: slot.startAt,
        // خدمات رایگان بدون روش پرداخت ثبت می‌شوند.
        paymentMethod: service.price === 0 ? "" : paymentMethod,
        instant: false,
        inPersonPlace: place,
        inPersonAddress: place === "learner" ? learnerAddress : undefined,
        note,
      });
      const createdId = (response.data?.session as { id?: number } | undefined)?.id ?? 0;
      if (response.data?.token) {
        // درگاه بانک — فرم توکن از مرورگر کاربر پست می‌شود؛ جلسه تا پایان
        // پرداخت در حالت awaiting payment نگه داشته می‌شود.
        onBooked({ sessionId: createdId, gateway: true });
        payViaSamanGate(response.data.token);
        return;
      }
      onBooked({ sessionId: createdId, gateway: false });
    } catch (error) {
      if (error instanceof PlatformHttpError && error.status === 409) {
        setSlot(null);
        setSubmitError(L("این زمان همین حالا رزرو شده است؛ زمان‌های آزاد دوباره دریافت شدند. لطفاً زمان دیگری انتخاب کنید."));
        setLoadedServiceId(0); // دریافت دوبارهٔ تقویم
      } else {
        setSubmitError(messageOf(error, L("ثبت درخواست رزرو حضوری انجام نشد.")));
      }
    } finally {
      setSaving(false);
    }
  }, [teacher, service, saving, isSelfTeacher, place, learnerAddress, slot, runtime, paymentMethod, note, onBooked, L]);

  const goNext = useCallback(() => {
    if (!canAdvance || saving) return;
    if (isLastStep) {
      void submit();
      return;
    }
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }, [canAdvance, saving, isLastStep, submit, steps.length]);

  const submitLabel = isFreeService
    ? L("ثبت درخواست جلسهٔ حضوری رایگان")
    : paymentMethod === "gateway"
      ? L("پرداخت و ثبت رزرو حضوری")
      : L("ثبت درخواست رزرو حضوری");

  /* ---------- خلاصهٔ رزرو برای مرحلهٔ پرداخت ---------- */
  const placeLabel = place === "teacher" ? L("در محل استاد") : L("در محل شما");
  const placeDetail = place === "teacher"
    ? (teacher.inPersonAddress || "")
    : learnerAddress.trim();

  const summaryRows = useMemo<Array<[string, string]>>(() => {
    if (!service) return [];
    const rows: Array<[string, string]> = [
      [L("استاد"), N(teacher.name)],
      [L("خدمت"), L(service.title)],
      [L("نوع جلسه"), L("حضوری · زمان‌دار")],
      [L("محل برگزاری"), placeLabel],
    ];
    if (placeDetail) rows.push([L("نشانی"), placeDetail]);
    if (slot) {
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
  }, [service, teacher.name, slot, lang, L, N, placeLabel, placeDetail]);

  return (
    <Sheet open={open} title={L("رزرو جلسهٔ حضوری")} onClose={() => { if (!saving) onClose(); }}>
      <div style={{ display: "grid", gap: spacing.lg }}>
        {/* ─── سرستون چرخه: عنوان + شمار مرحله + نوار پیشرفت + برچسب‌ها ─── */}
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 15.5, fontWeight: 900, color: colors.ink, minWidth: 0 }}>
              {service ? L(service.title) : L("مشخصات جلسهٔ حضوری")}
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
              {teacher.city ? L("حضور در شهر {n}").replace("{n}", N(teacher.city)) : L("جلسهٔ حضوری — در محل")}
            </span>
          </div>
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
            <Icon name="pin" size={11} stroke={2.4} style={{ color: colors.goldDark }} />
            {L("حضوری")}
          </span>
        </div>

        {/* ─────────────── محتوای مرحلهٔ فعلی ─────────────── */}

        {currentStep === "place" ? (
          <div role="radiogroup" aria-label={L("محل برگزاری جلسهٔ حضوری")} style={{ display: "grid", gap: 10 }}>
            <OptionCard
              selected={place === "teacher"}
              disabled={!teacherHasAddress}
              icon="pin"
              tone="gold"
              title={L("در محل استاد")}
              desc={
                teacherHasAddress
                  ? L("نشانی ثبت‌شدهٔ استاد: {n}").replace("{n}", N(teacher.inPersonAddress))
                  : L("این استاد هنوز نشانی محل برگزاری خود را ثبت نکرده است؛ می‌توانید جلسه را در محل خودتان برگزار کنید.")
              }
              onSelect={() => { setPlace("teacher"); setSubmitError(""); }}
            />
            <OptionCard
              selected={place === "learner"}
              icon="home"
              tone="olive"
              title={L("در محل شما")}
              desc={L("استاد به نشانی شما می‌آید؛ نشانی دقیق را در کادر زیر می‌نویسید تا برای استاد نمایش داده شود.")}
              onSelect={() => { setPlace("learner"); setSubmitError(""); }}
            />
            {place === "learner" ? (
              <div style={{ display: "grid", gap: 6 }}>
                <textarea
                  value={learnerAddress}
                  onChange={(event) => setLearnerAddress(event.target.value.slice(0, 255))}
                  rows={2}
                  placeholder={L("مثلاً: تهران، خیابان ولیعصر، کوچهٔ مهر، پلاک ۱۲، واحد ۳…")}
                  style={{ ...inputStyle, resize: "none", lineHeight: 1.9 }}
                  aria-label={L("نشانی دقیق محل جلسه")}
                />
                <span style={{ fontSize: 10.5, color: colors.inkMuted, textAlign: "left" }}>
                  {localizedDigits(learnerAddress.trim().length, lang)}/255
                </span>
              </div>
            ) : place === "teacher" && teacherHasAddress ? (
              <div
                role="status"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  padding: "11px 13px",
                  borderRadius: 16,
                  background: gradients.goldPanel,
                  border: `1.5px solid ${colors.goldSoft}`,
                  color: colors.goldInk,
                }}
              >
                <Icon name="pin" size={17} stroke={2.2} style={{ flex: "0 0 auto", marginTop: 3, color: colors.goldDark }} />
                <span style={{ minWidth: 0, flex: 1, fontSize: 12, lineHeight: 1.9, fontWeight: 700 }}>
                  {N(teacher.inPersonAddress)}
                  {teacher.city ? ` — ${N(teacher.city)}` : ""}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {currentStep === "topic" ? (
          <div role="radiogroup" aria-label={L("موضوع جلسهٔ حضوری")} style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.9, color: colors.inkMuted }}>
              {L("موضوع جلسهٔ حضوری را انتخاب کنید؛ هر موضوع قیمت و مدت خودش را دارد.")}
            </p>
            {inPersonServices.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12.5, color: colors.inkMuted, lineHeight: 1.9 }}>
                {L("این استاد فعلاً خدمت حضوری فعالی ندارد.")}
              </p>
            ) : (
              inPersonServices.map((item) => {
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
                      <Icon name="pin" size={20} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 13.5, fontWeight: 800 }}>{L(item.title)}</strong>
                        <span style={{ fontSize: 10.5, color: colors.inkMuted, fontWeight: 700 }}>
                          {localizedDigits(item.duration, lang)} {L("دقیقه")}
                        </span>
                      </span>
                      <span style={{ fontSize: 11, lineHeight: 1.7, color: colors.inkMuted, display: "block" }}>
                        {L("جلسهٔ حضوری در محل انتخابی مرحلهٔ قبل")}
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
              })
            )}
            <div style={{ display: "grid", gap: 6, marginTop: 4 }}>
              <strong style={{ fontSize: 12.5, color: colors.ink, display: "block" }}>{L("موضوع یا نکته‌ای برای استاد (اختیاری)")}</strong>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, 500))}
                rows={2}
                placeholder={L("مثلاً: روخوانی و تصحیح سورهٔ بقره، برای آزمون تلاوت آماده می‌شوم…")}
                style={{ ...inputStyle, resize: "none", lineHeight: 1.9 }}
                aria-label={L("موضوع یا یادداشت جلسه")}
              />
            </div>
          </div>
        ) : null}

        {currentStep === "time" ? (
          <div style={{ display: "grid", gap: spacing.lg }}>
            {!service ? (
              <p style={{ margin: 0, fontSize: 12.5, color: colors.inkMuted }}>{L("ابتدا موضوع جلسه را مشخص کنید.")}</p>
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
                {L("در ۱۴ روز آینده زمان آزاد و قابل رزروی برای این خدمت وجود ندارد؛ بعداً دوباره بررسی کنید.")}
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
        ) : null}

        {currentStep === "pay" ? (
          <div style={{ display: "grid", gap: spacing.lg }}>
            <div style={{ display: "grid" }}>
              {summaryRows.map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: spacing.md, paddingBlock: 7 }}>
                  <span style={{ color: colors.inkMuted, fontSize: 12.5, flex: "0 0 auto" }}>{label}</span>
                  <strong style={{ textAlign: "left", fontSize: 12.5, minWidth: 0, lineHeight: 1.8 }}>{value}</strong>
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
