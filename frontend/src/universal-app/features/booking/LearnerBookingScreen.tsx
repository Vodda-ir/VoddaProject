"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { PlatformHttpError } from "../../platform/http";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { getTeacherDetail } from "../teachers/api";
import type { Teacher, TeacherService } from "../teachers/types";
import { Avatar, Button, Card, EmptyState, ErrorState, Icon, LoadingState, Sheet, colors, radii, shadows, spacing, typography } from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { useAppearance } from "../../ui/appearance";
import { formatAppDate } from "../../ui/jalali";
import { localizedDigits } from "../../ui/persian";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";
import { createBooking, getBookingAvailability, getBookingMe, type BookingPaymentMethod } from "./api";
import { payViaSamanGate } from "../../../lib/saman-gate";
import type { BookingSlot } from "./types";

const weekdays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

function BookingStepHeader({ number, title }: { number: number; title: string }) {
  const { lang } = useAppearance();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          display: "grid",
          placeItems: "center",
          flex: "0 0 28px",
          borderRadius: "50%",
          color: colors.surface,
          background: colors.olive600,
          fontSize: 13,
          fontWeight: 800,
        }}
      >
        {localizedDigits(number, lang)}
      </span>
      <strong style={{ fontSize: 16, fontWeight: 800, color: colors.ink }}>{title}</strong>
    </div>
  );
}

type DateGroup = {
  localDate: string;
  weekday: number;
  slots: BookingSlot[];
};

export function LearnerBookingScreen({ teacherId, config }: { teacherId: string; config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { L, lang } = useAppearance();
  const numericTeacherId = Number(teacherId);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [teacherLoading, setTeacherLoading] = useState(true);
  const [teacherError, setTeacherError] = useState("");
  const [service, setService] = useState<TeacherService | null>(null);
  const [availability, setAvailability] = useState<BookingSlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [localDate, setLocalDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<BookingSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  // جلسهٔ فوری — رزرو همین‌لحظه (فقط وقتی استاد کلید آن را روشن کرده)
  const [instantSheet, setInstantSheet] = useState(false);
  const [wasInstant, setWasInstant] = useState(false);
  const [instantSessionId, setInstantSessionId] = useState(0);
  const [meId, setMeId] = useState(0);
  const [wallet, setWallet] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>("wallet");
  // ?free=1 → ورود از کارت «خدمات رایگان» خانه؛ فقط خدمات رایگان این استاد نمایش داده می‌شود
  const [freeOnly, setFreeOnly] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("free") === "1";
  });
  const availabilityRequest = useRef(0);

  const loadTeacher = useCallback(async () => {
    if (!Number.isInteger(numericTeacherId) || numericTeacherId <= 0) {
      setTeacherError(L("شناسه استاد نامعتبر است."));
      setTeacherLoading(false);
      return;
    }
    setTeacherLoading(true);
    setTeacherError("");
    try {
      const detail = await getTeacherDetail(runtime, numericTeacherId);
      setTeacher(detail.teacher);
    } catch (error) {
      setTeacher(null);
      setTeacherError(messageOf(error, L("اطلاعات استاد دریافت نشد.")));
    } finally {
      setTeacherLoading(false);
    }
  }, [numericTeacherId, runtime, L]);

  useEffect(() => {
    void loadTeacher();
    let active = true;
    getBookingMe(runtime)
      .then((me) => {
        if (!active) return;
        setMeId(me.id);
        setWallet(me.wallet);
      })
      .catch(() => { /* wallet display stays unknown; booking still works */ });
    return () => { active = false; };
  }, [loadTeacher, runtime]);

  const loadAvailability = useCallback(
    async (selectedService: TeacherService) => {
      const requestId = ++availabilityRequest.current;
      setAvailabilityLoading(true);
      setAvailabilityError("");
      try {
        const rows = await getBookingAvailability(runtime, numericTeacherId, selectedService.id, 14);
        if (availabilityRequest.current !== requestId) return;
        setAvailability(rows);
      } catch (error) {
        if (availabilityRequest.current !== requestId) return;
        setAvailability([]);
        setAvailabilityError(messageOf(error, L("زمان‌های آزاد استاد دریافت نشد.")));
      } finally {
        if (availabilityRequest.current === requestId) setAvailabilityLoading(false);
      }
    },
    [numericTeacherId, runtime, L],
  );

  const chooseService = useCallback(
    (selectedService: TeacherService) => {
      setService(selectedService);
      setAvailability([]);
      setLocalDate(null);
      setSlot(null);
      setSubmitError("");
      setSubmitted(false);
      void loadAvailability(selectedService);
    },
    [loadAvailability],
  );

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

  const allServices = teacher?.services.filter((item) => item.active && item.id > 0) ?? [];
  // فیلتر خدمات رایگان: وقتی از کارت جلسهٔ رایگان آمده‌ایم، خدمات پولی نمایش داده نمی‌شوند
  const services = useMemo(
    () => (freeOnly ? allServices.filter((item) => item.price === 0) : allServices),
    [allServices, freeOnly],
  );
  const isSelfTeacher = Boolean(teacher?.userId && meId && teacher.userId === meId);
  const isFreeService = service ? service.price === 0 : false;
  const walletCovers = wallet !== null && service ? wallet >= service.price : false;

  // Keep the sensible default as the selection changes: wallet when it covers
  // the price, otherwise the online gateway is the only viable method.
  useEffect(() => {
    if (!service || service.price === 0) return;
    setPaymentMethod(walletCovers ? "wallet" : "gateway");
  }, [service?.id, service?.price, walletCovers]);

  const submit = useCallback(async () => {
    if (!teacher || !service || !slot || saving) return;
    if (isSelfTeacher) {
      setSubmitError(L("نمی‌توانید استاد خودتان را رزرو کنید؛ برای رزرو با حساب قرآن‌آموز وارد شوید."));
      return;
    }
    setSaving(true);
    setSubmitError("");
    try {
      const response = await createBooking(runtime, {
        teacherId: teacher.id,
        serviceId: service.id,
        // startAt is emitted by the authoritative backend in UTC. Do not rebuild
        // scheduled_at from the device timezone or the local display fields.
        scheduledAt: slot.startAt,
        // خدمات رایگان: روش پرداخت ارسال نمی‌شود — رزرو بدون تراکنش ثبت می‌شود.
        paymentMethod: service.price === 0 ? "" : paymentMethod,
      });
      if (response.data?.token) {
        // پرداخت درگاه: فرم توکن از مرورگر خود کاربر به OnlinePG پست می‌شود —
        // دقیقاً مثل منافسه، در همان تب تا در مرورگر موبایل و وب‌ویو اپ هم
        // درست باز شود. جلسه تا پایان پرداخت در حالت «awaiting payment» نگه
        // داشته می‌شود و بعد از تسویه خودکار فعال می‌شود.
        setRedirecting(true);
        payViaSamanGate(response.data.token);
        return;
      }
      setSubmitted(true);
    } catch (error) {
      if (error instanceof PlatformHttpError && error.status === 409) {
        setLocalDate(null);
        setSlot(null);
        setSubmitError(L("این زمان همین حالا رزرو شده است. زمان‌های آزاد دوباره دریافت شدند؛ لطفاً زمان دیگری انتخاب کنید."));
        await loadAvailability(service);
      } else {
        setSubmitError(messageOf(error, L("ثبت درخواست رزرو انجام نشد.")));
      }
    } finally {
      setSaving(false);
    }
  }, [isSelfTeacher, loadAvailability, paymentMethod, runtime, saving, service, slot, teacher, L]);

  /** ثبت جلسهٔ فوری — زمان آغاز: دو دقیقه بعد از همین لحظه. */
  const submitInstant = useCallback(async () => {
    if (!teacher || !service || saving) return;
    if (isSelfTeacher) {
      setSubmitError(L("نمی‌توانید استاد خودتان را رزرو کنید."));
      return;
    }
    setSaving(true);
    setSubmitError("");
    try {
      const response = await createBooking(runtime, {
        teacherId: teacher.id,
        serviceId: service.id,
        scheduledAt: new Date(Date.now() + 2 * 60_000).toISOString(),
        paymentMethod: service.price === 0 ? "" : paymentMethod,
        instant: true,
      });
      const createdId = (response.data?.session as { id?: number } | undefined)?.id ?? 0;
      setInstantSessionId(createdId);
      if (response.data?.token) {
        setRedirecting(true);
        payViaSamanGate(response.data.token);
        return;
      }
      setWasInstant(true);
      setSubmitted(true);
    } catch (error) {
      setInstantSheet(false);
      setSubmitError(messageOf(error, L("ثبت جلسهٔ فوری انجام نشد.")));
    } finally {
      setSaving(false);
    }
  }, [isSelfTeacher, paymentMethod, runtime, saving, service, teacher, L]);

  if (teacherLoading) return <LoadingState label={L("در حال دریافت اطلاعات استاد…")} />;
  if (teacherError || !teacher) {
    return (
      <ErrorState
        title={L("دریافت اطلاعات استاد ناموفق بود")}
        description={teacherError || L("اطلاعات استاد دریافت نشد.")}
        action={<Button variant="secondary" onClick={() => void loadTeacher()}>{L("تلاش دوباره")}</Button>}
      />
    );
  }

  if (submitted) {
    return (
      <Card elevated style={{ display: "grid", gap: spacing.lg, textAlign: "center" }}>
        <div aria-hidden="true" style={{ width: 68, height: 68, display: "grid", placeItems: "center", marginInline: "auto", borderRadius: "50%", color: colors.surface, background: colors.olive600, boxShadow: shadows.olive }}><Icon name="check" size={30} stroke={2.5} /></div>
        <div>
          <h2 style={{ ...typography.title, margin: 0 }}>{wasInstant ? L("جلسهٔ فوری ثبت شد") : L("درخواست جلسه ثبت شد")}</h2>
          <p style={{ ...typography.body, color: colors.inkSecondary, marginBottom: 0 }}>
            {wasInstant
              ? L("درخواست شما همین حالا برای استاد ارسال شد. به‌محض تأیید، از جزئیات جلسه وارد کلاس تصویری شوید و برای هماهنگی چت در دسترس است.")
              : L("تأیید، رد یا بازگشت وجه را از بخش «جلسات من» پیگیری کنید.")}
          </p>
        </div>
        <Button
          fullWidth
          onClick={() =>
            wasInstant && instantSessionId > 0
              ? navigateApp(`/session/${instantSessionId}`, config)
              : navigateApp("/sessions", config)
          }
        >
          {wasInstant ? L("مشاهدهٔ جزئیات جلسه") : L("مشاهده جلسات من")}
        </Button>
      </Card>
    );
  }

  if (redirecting) {
    return (
      <Card elevated style={{ display: "grid", gap: spacing.lg, textAlign: "center" }}>
        <div aria-hidden="true" style={{ width: 68, height: 68, display: "grid", placeItems: "center", marginInline: "auto", borderRadius: "50%", color: colors.surface, background: colors.olive600, boxShadow: shadows.olive }}><Icon name="shield" size={30} stroke={2.2} /></div>
        <div>
          <h2 style={{ ...typography.title, margin: 0 }}>{L("در حال انتقال به درگاه پرداخت…")}</h2>
          <p style={{ ...typography.body, color: colors.inkSecondary, marginBottom: 0 }}>
            {L("رزرو شما ثبت و تا پایان پرداخت برای شما نگه داشته شده است.")}
          </p>
        </div>
        <Button variant="secondary" fullWidth onClick={() => navigateApp("/sessions", config)}>{L("مشاهده جلسات من")}</Button>
      </Card>
    );
  }

  return (
    <div className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <Card elevated className="vodda-enter" style={{ display: "flex", alignItems: "center", gap: 13, padding: 16, borderRadius: 20 }}>
        <Avatar name={teacher.name} src={teacher.avatarUrl || undefined} size={56} ring={false} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ fontSize: 16, fontWeight: 800, display: "block", color: colors.ink }}>{teacher.name}</strong>
          <span style={{ fontSize: 12.5, color: colors.olive700 }}>{teacher.tag || teacher.field}</span>
          {!teacher.available ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 4,
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                color: colors.danger,
                background: colors.dangerBackground,
              }}
            >
              <span aria-hidden="true" className="vodda-offline-dot" style={{ width: 7, height: 7, borderRadius: "50%", flex: "0 0 auto", background: colors.danger }} />
              {L("استاد آفلاین است — فعلاً زمان آزاد ندارد")}
            </span>
          ) : null}
        </div>
      </Card>

      {teacher.instantEnabled ? (
        <Card
          className="vodda-enter vodda-enter-delay-1"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            borderRadius: 20,
            border: `1.5px solid ${colors.goldSoft}`,
            background: `linear-gradient(150deg, ${colors.goldBackground}, #fffdf8 72%)`,
            boxShadow: "0 0 0 4px rgba(231,213,168,.18), 0 10px 24px rgba(139,104,31,.10)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 42, height: 42, display: "grid", placeItems: "center", flex: "0 0 42px", borderRadius: 14,
              background: "linear-gradient(145deg,#d8b869,#b8923c)", color: "#fffaf0",
              boxShadow: "0 6px 14px rgba(139,104,31,.35)",
            }}
          >
            <Icon name="sparkle" size={21} stroke={2.2} />
          </span>
          <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
            <strong style={{ fontSize: 13.5, fontWeight: 800, color: "#7a5e1e" }}>{L("همین حالا وقت می‌خواهید؟")}</strong>
            <span style={{ fontSize: 11, color: "#9a7426", lineHeight: 1.7 }}>
              {L("این استاد جلسهٔ فوری فعال کرده — درخواست شما مستقیم و فوری برایش ارسال می‌شود.")}
            </span>
          </span>
          <Button
            onClick={() => setInstantSheet(true)}
            disabled={!service}
            style={{ flex: "0 0 auto", minHeight: 44, padding: "0 16px", fontSize: 12.5 }}
          >
            {L("جلسهٔ فوری")}
          </Button>
        </Card>
      ) : null}

      <Card className="vodda-enter vodda-enter-delay-1" style={{ padding: 18, borderRadius: 20, borderColor: colors.sand200, boxShadow: "none" }}>
        <BookingStepHeader number={1} title={L("انتخاب خدمت")} />
        {freeOnly ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
              padding: "9px 12px",
              borderRadius: 14,
              background: colors.goldBackground,
              border: `1px solid ${colors.gold}`,
            }}
          >
            <Icon name="gift" size={15} stroke={2.3} style={{ color: colors.goldDark, flex: "0 0 auto" }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: colors.goldDark, lineHeight: 1.7 }}>
              {L("فقط خدمات رایگان این استاد نمایش داده می‌شود")}
            </span>
            <button
              type="button"
              onClick={() => setFreeOnly(false)}
              style={{
                flex: "0 0 auto",
                padding: "5px 10px",
                borderRadius: 999,
                border: `1px solid ${colors.gold}`,
                background: colors.surface,
                color: colors.goldDark,
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: typography.fontFamily,
              }}
            >
              {L("نمایش همهٔ خدمات")}
            </button>
          </div>
        ) : (
          <div style={{ height: 16 }} />
        )}
        {services.length === 0 ? (
          freeOnly ? (
            <EmptyState
              title={L("خدمت رایگان فعالی ندارد")}
              description={L("این استاد در حال حاضر خدمت رایگان فعالی ندارد؛ می‌توانید همهٔ خدمات او را ببینید.")}
              action={<Button variant="secondary" onClick={() => setFreeOnly(false)}>{L("نمایش همهٔ خدمات")}</Button>}
            />
          ) : (
            <EmptyState title={L("خدمت قابل رزرو وجود ندارد")} description={L("این استاد فعلاً خدمت فعال و قابل رزروی ندارد.")} />
          )
        ) : (
          <div style={{ display: "grid", gap: spacing.sm }}>
            {services.map((item) => {
              const selected = service?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => chooseService(item)}
                  aria-pressed={selected}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: spacing.md,
                    padding: 13,
                    textAlign: "right",
                    color: colors.ink,
                    background: selected ? colors.olive50 : colors.sand50,
                    border: selected ? `1.6px solid ${colors.olive600}` : `1px solid ${colors.sand200}`,
                    borderRadius: 16,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily,
                  }}
                >
                  <span>
                    <strong style={{ display: "block", ...typography.body }}>{item.title}</strong>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 4,
                        padding: "2px 9px",
                        borderRadius: 999,
                        background: colors.surface,
                        border: `1px solid ${colors.sand200}`,
                        color: colors.inkSecondary,
                        fontSize: 11.5,
                        fontWeight: 700,
                      }}
                    >
                      <Icon name="clock" size={12} stroke={2} />
                      {localizedDigits(item.duration, lang)} {L("دقیقه")}
                    </span>
                  </span>
                  {item.price === 0 ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 11px",
                        borderRadius: 999,
                        background: colors.goldBackground,
                        border: `1px solid ${colors.gold}`,
                        color: colors.goldDark,
                        fontSize: 11.5,
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Icon name="gift" size={12} stroke={2.4} />
                      {L("رایگان")}
                    </span>
                  ) : (
                    <strong style={{ ...typography.bodySmall, color: colors.olive700 }}>{formatWalletAmount(Math.max(0, item.price))} {L("تومان")}</strong>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="vodda-enter vodda-enter-delay-2" style={{ padding: 18, borderRadius: 20, borderColor: colors.sand200, boxShadow: "none" }}>
        <BookingStepHeader number={2} title={L("انتخاب تاریخ و ساعت")} />
        <div style={{ height: 16 }} />
        {!service ? (
          <EmptyState title={L("یک خدمت انتخاب کنید")} description={L("بعد از انتخاب خدمت، زمان‌های آزاد رسمی استاد دریافت می‌شوند.")} />
        ) : availabilityLoading ? (
          <LoadingState label={L("در حال دریافت زمان‌های آزاد…")} />
        ) : availabilityError ? (
          <ErrorState
            title={L("دریافت زمان‌های آزاد ناموفق بود")}
            description={availabilityError}
            action={<Button variant="secondary" onClick={() => void loadAvailability(service)}>{L("تلاش دوباره")}</Button>}
          />
        ) : dateGroups.length === 0 ? (
          <EmptyState title={L("زمان آزادی پیدا نشد")} description={L("در ۱۴ روز آینده زمان آزاد و قابل رزروی برای این خدمت وجود ندارد.")} />
        ) : (
          <div style={{ display: "grid", gap: spacing.lg }}>
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
                      color: selected ? colors.surface : colors.inkSecondary,
                      background: selected ? colors.olive600 : colors.sand50,
                      border: `1px solid ${selected ? colors.olive600 : colors.sand200}`,
                      borderRadius: 15,
                      cursor: "pointer",
                      fontFamily: typography.fontFamily,
                      ...typography.bodySmall,
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
                        color: selected ? colors.surface : colors.inkSecondary,
                        background: selected ? colors.olive600 : colors.surface,
                        border: `1px solid ${selected ? colors.olive600 : colors.sand200}`,
                        borderRadius: radii.pill,
                        cursor: "pointer",
                        fontFamily: typography.fontFamily,
                        ...typography.bodySmall,
                      }}
                    >
                      {item.localStart} {L("تا")} {item.localEnd}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </Card>

      <Card className="vodda-enter vodda-enter-delay-3" style={{ padding: 18, borderRadius: 20, borderColor: colors.sand200, boxShadow: "none" }}>
        <BookingStepHeader number={3} title={L("بررسی نهایی")} />
        <div style={{ height: 16 }} />
        {!service || !slot ? (
          <EmptyState title={L("رزرو هنوز آماده ثبت نیست")} description={L("پس از انتخاب خدمت و زمان، خلاصه رزرو اینجا نمایش داده می‌شود.")} />
        ) : (
          <div style={{ display: "grid" }}>
            {[
              [L("استاد"), teacher.name],
              [L("خدمت"), service.title],
              [L("تاریخ"), formatAppDate(slot.localDate, lang, { withWeekday: slot.weekday })],
              [L("ساعت"), `${slot.localStart} ${L("تا")} ${slot.localEnd}`],
              [L("مدت"), `${localizedDigits(service.duration, lang)} ${L("دقیقه")}`],
              [L("مبلغ"), service.price === 0 ? L("رایگان — بدون پرداخت") : `${formatWalletAmount(Math.max(0, service.price))} ${L("تومان")}`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: spacing.md, paddingBlock: 8 }}>
                <span style={{ color: colors.inkMuted }}>{label}</span>
                <strong style={{ textAlign: "left" }}>{value}</strong>
              </div>
            ))}
            <div style={{ height: 1, marginBlock: 4, background: colors.sand150 }} />
            {service.price === 0 ? (
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
                  marginBlock: spacing.md,
                }}
              >
                <Icon name="gift" size={17} stroke={2.2} style={{ flex: "0 0 auto" }} />
                <span>
                  {L("این جلسه")} <b>{L("رایگان")}</b>{L(" است؛ بدون پرداخت هزینه و بدون کسر از کیف پول، درخواست شما مستقیم برای استاد ارسال می‌شود.")}
                </span>
              </div>
            ) : (
            <>
            <div role="radiogroup" aria-label={L("روش پرداخت")} style={{ display: "grid", gap: spacing.sm, marginBlock: spacing.md }}>
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
                }}
              >
                <span style={{ display: "grid", gap: 2, flex: 1 }}>
                  <strong style={{ fontSize: 13.5, fontWeight: 800 }}>{L("پرداخت از کیف پول")}</strong>
                  <span style={{ ...typography.caption, color: colors.inkMuted }}>
                    {wallet !== null ? L("موجودی: {n} تومان").replace("{n}", formatWalletAmount(wallet)) : L("موجودی نامشخص")}{walletCovers ? "" : L(" — موجودی کافی نیست")}
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
                }}
              >
                <span style={{ display: "grid", gap: 2, flex: 1 }}>
                  <strong style={{ fontSize: 13.5, fontWeight: 800 }}>{L("پرداخت آنلاین با درگاه سامان‌سپ")}</strong>
                  <span style={{ ...typography.caption, color: colors.inkMuted }}>{L("پرداخت امن با کارت بانکی؛ زمان رزرو تا پایان پرداخت نگه داشته می‌شود")}</span>
                </span>
                <Icon name="shield" size={20} style={{ color: paymentMethod === "gateway" ? colors.olive600 : colors.inkMuted }} />
              </button>
            </div>
            <p style={{ ...typography.caption, margin: "8px 0 0", color: colors.inkMuted, lineHeight: 1.8 }}>
              {paymentMethod === "gateway"
                ? L("با ثبت رزرو به درگاه امن سامان‌سپ منتقل می‌شوید و پس از پرداخت موفق، درخواست برای استاد ارسال می‌شود.")
                : L("مبلغ هنگام ثبت رزرو از کیف پول کسر می‌شود.")}{" "}
              {L("زمان‌ها با timezone رسمی سامانه و تداخل جلسات فعال محاسبه شده‌اند. ممکن است تا لحظهٔ ثبت توسط کاربر دیگری رزرو شوند.")}
            </p>
            </>
            )}
          </div>
        )}
      </Card>

      {isSelfTeacher ? (
        <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.goldBackground, color: colors.goldDark, margin: 0 }}>
          {L("این پروفایل متعلق به حساب شماست؛ رزرو جلسه با خودتان ممکن نیست. برای آزمایش فرآیند، با حساب قرآن‌آموز وارد شوید و استاد دیگری را رزرو کنید.")}
        </p>
      ) : null}
      {submitError ? <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, margin: 0 }}>{submitError}</p> : null}

      {/* شیت تأیید جلسهٔ فوری */}
      <Sheet open={instantSheet} title={L("درخواست جلسهٔ فوری")} onClose={() => { if (!saving) setInstantSheet(false); }}>
        {service ? (
          <div style={{ display: "grid", gap: spacing.md }}>
            <p style={{ ...typography.body, margin: 0, color: colors.inkSecondary, lineHeight: 2 }}>
              {L("با تأیید، درخواست جلسه")} <b>{L("همین حالا")}</b> {L("برای {n} ارسال می‌شود و زمان آغاز دو دقیقه بعد در نظر گرفته می‌شود. به‌محض تأیید استاد می‌توانید وارد کلاس تصویری شوید.").replace("{n}", teacher.name)}
            </p>
            <div style={{ display: "grid", gap: 0, padding: "4px 14px", borderRadius: 14, background: colors.sand50 }}>
              {[
                [L("خدمت"), service.title],
                [L("مدت"), `${localizedDigits(service.duration, lang)} ${L("دقیقه")}`],
                [L("مبلغ"), service.price === 0 ? L("رایگان — بدون پرداخت") : `${formatWalletAmount(Math.max(0, service.price))} ${L("تومان")}`],
                [L("پرداخت"), service.price === 0 ? L("بدون تراکنش") : paymentMethod === "wallet" ? L("از کیف پول") : L("درگاه سامان‌سپ")],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: spacing.md, paddingBlock: 8 }}>
                  <span style={{ color: colors.inkMuted, fontSize: 12.5 }}>{label}</span>
                  <strong style={{ textAlign: "left", fontSize: 12.5 }}>{value}</strong>
                </div>
              ))}
            </div>
            {service.price > 0 && paymentMethod === "wallet" && !walletCovers ? (
              <p role="alert" style={{ margin: 0, fontSize: 12, color: colors.danger }}>
                {L("موجودی کیف پول کافی نیست؛ در مرحلهٔ بعد به درگاه پرداخت منتقل می‌شوید.")}
              </p>
            ) : null}
            <Button fullWidth loading={saving} onClick={() => void submitInstant()} style={{ minHeight: 50, background: colors.gold, borderColor: colors.gold }}>
              <Icon name="sparkle" size={18} />
              {L("ارسال درخواست جلسهٔ فوری")}
            </Button>
          </div>
        ) : null}
      </Sheet>
      <div style={{ position: "sticky", zIndex: 12, bottom: "calc(68px + env(safe-area-inset-bottom))", padding: "8px 0 12px", background: colors.sand50 }}>
        <Button fullWidth loading={saving} disabled={!service || !slot || isSelfTeacher} onClick={() => void submit()} style={{ minHeight: 52 }}>
          {service && service.price === 0 ? L("ثبت درخواست جلسهٔ رایگان") : paymentMethod === "gateway" ? L("پرداخت و ثبت رزرو") : L("ثبت درخواست رزرو")}
        </Button>
      </div>
    </div>
  );
}