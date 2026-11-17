"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { PlatformHttpError } from "../../platform/http";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { getTeacherDetail } from "../teachers/api";
import type { Teacher, TeacherService } from "../teachers/types";
import { Avatar, Button, Card, EmptyState, ErrorState, Icon, LoadingState, colors, radii, shadows, spacing, typography } from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";
import { createBooking, getBookingAvailability, getBookingMe, type BookingPaymentMethod } from "./api";
import type { BookingSlot } from "./types";

const weekdays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const numberFormatter = new Intl.NumberFormat("fa-IR");

function dateLabel(localDate: string, weekday: number) {
  const parts = localDate.split("-");
  const day = parts[2] ?? localDate;
  const month = parts[1] ?? "";
  const prefix = weekdays[weekday] ?? "";
  return `${prefix}${prefix ? " · " : ""}${numberFormatter.format(Number(day) || 0)}/${numberFormatter.format(Number(month) || 0)}`;
}

function fullDateLabel(localDate: string, weekday: number) {
  const parts = localDate.split("-");
  if (parts.length !== 3) return dateLabel(localDate, weekday);
  const [year, month, day] = parts;
  const prefix = weekdays[weekday] ?? "";
  return `${prefix}${prefix ? " " : ""}${numberFormatter.format(Number(day) || 0)}/${numberFormatter.format(Number(month) || 0)}/${numberFormatter.format(Number(year) || 0)}`;
}

function BookingStepHeader({ number, title }: { number: number; title: string }) {
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
        {numberFormatter.format(number)}
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
  const [meId, setMeId] = useState(0);
  const [wallet, setWallet] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>("wallet");
  const availabilityRequest = useRef(0);

  // باگ refresh-loop: اجرای دوم StrictMode یا فراخوانی دیرهنگام نباید state را با دادهٔ کهنه بازنویسی کند.
  const teacherGeneration = useRef(0);

  const loadTeacher = useCallback(async () => {
    const generation = ++teacherGeneration.current;
    const isStale = () => teacherGeneration.current !== generation;
    if (!Number.isInteger(numericTeacherId) || numericTeacherId <= 0) {
      setTeacherError("شناسه استاد نامعتبر است.");
      setTeacherLoading(false);
      return;
    }
    setTeacherLoading(true);
    setTeacherError("");
    try {
      const detail = await getTeacherDetail(runtime, numericTeacherId);
      if (isStale()) return;
      setTeacher(detail.teacher);
    } catch (error) {
      if (isStale()) return;
      setTeacher(null);
      setTeacherError(messageOf(error, "اطلاعات استاد دریافت نشد."));
    } finally {
      if (!isStale()) setTeacherLoading(false);
    }
  }, [numericTeacherId, runtime]);

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
        setAvailabilityError(messageOf(error, "زمان‌های آزاد استاد دریافت نشد."));
      } finally {
        if (availabilityRequest.current === requestId) setAvailabilityLoading(false);
      }
    },
    [numericTeacherId, runtime],
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

  const services = teacher?.services.filter((item) => item.active && item.id > 0) ?? [];
  const isSelfTeacher = Boolean(teacher?.userId && meId && teacher.userId === meId);
  const walletCovers = wallet !== null && service ? wallet >= service.price : false;

  // Keep the sensible default as the selection changes: wallet when it covers
  // the price, otherwise the online gateway is the only viable method.
  useEffect(() => {
    if (!service) return;
    setPaymentMethod(walletCovers ? "wallet" : "gateway");
  }, [service?.id, walletCovers]);

  const submit = useCallback(async () => {
    if (!teacher || !service || !slot || saving) return;
    if (isSelfTeacher) {
      setSubmitError("نمی‌توانید استاد خودتان را رزرو کنید؛ برای رزرو با حساب قرآن‌آموز وارد شوید.");
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
        paymentMethod,
      });
      if (response.data?.redirect_url) {
        // Gateway payment: hand the payer to Saman Sep. The session is held as
        // «awaiting payment» and activates automatically after settlement.
        setRedirecting(true);
        if (runtime.kind === "native") {
          window.open(response.data.redirect_url, "_blank");
          setSubmitted(true);
        } else {
          window.location.href = response.data.redirect_url;
        }
        return;
      }
      setSubmitted(true);
    } catch (error) {
      if (error instanceof PlatformHttpError && error.status === 409) {
        setLocalDate(null);
        setSlot(null);
        setSubmitError("این زمان همین حالا رزرو شده است. زمان‌های آزاد دوباره دریافت شدند؛ لطفاً زمان دیگری انتخاب کنید.");
        await loadAvailability(service);
      } else {
        setSubmitError(messageOf(error, "ثبت درخواست رزرو انجام نشد."));
      }
    } finally {
      setSaving(false);
    }
  }, [isSelfTeacher, loadAvailability, paymentMethod, runtime, saving, service, slot, teacher]);

  if (teacherLoading) return <LoadingState label="در حال دریافت اطلاعات استاد…" />;
  if (teacherError || !teacher) {
    return (
      <ErrorState
        title="دریافت اطلاعات استاد ناموفق بود"
        description={teacherError || "اطلاعات استاد دریافت نشد."}
        action={<Button variant="secondary" onClick={() => void loadTeacher()}>تلاش دوباره</Button>}
      />
    );
  }

  if (submitted) {
    return (
      <Card elevated style={{ display: "grid", gap: spacing.lg, textAlign: "center" }}>
        <div aria-hidden="true" style={{ width: 68, height: 68, display: "grid", placeItems: "center", marginInline: "auto", borderRadius: "50%", color: colors.surface, background: colors.olive600, boxShadow: shadows.olive }}><Icon name="check" size={30} stroke={2.5} /></div>
        <div>
          <h2 style={{ ...typography.title, margin: 0 }}>درخواست جلسه ثبت شد</h2>
          <p style={{ ...typography.body, color: colors.inkSecondary, marginBottom: 0 }}>
            تأیید، رد یا بازگشت وجه را از بخش «جلسات من» پیگیری کنید.
          </p>
        </div>
        <Button fullWidth onClick={() => navigateApp("/sessions", config)}>مشاهده جلسات من</Button>
      </Card>
    );
  }

  if (redirecting) {
    return (
      <Card elevated style={{ display: "grid", gap: spacing.lg, textAlign: "center" }}>
        <div aria-hidden="true" style={{ width: 68, height: 68, display: "grid", placeItems: "center", marginInline: "auto", borderRadius: "50%", color: colors.surface, background: colors.olive600, boxShadow: shadows.olive }}><Icon name="shield" size={30} stroke={2.2} /></div>
        <div>
          <h2 style={{ ...typography.title, margin: 0 }}>در حال انتقال به درگاه پرداخت…</h2>
          <p style={{ ...typography.body, color: colors.inkSecondary, marginBottom: 0 }}>
            رزرو شما ثبت و تا پایان پرداخت برای شما نگه داشته شده است.
          </p>
        </div>
        <Button variant="secondary" fullWidth onClick={() => navigateApp("/sessions", config)}>مشاهده جلسات من</Button>
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
        </div>
      </Card>

      <Card className="vodda-enter vodda-enter-delay-1" style={{ padding: 18, borderRadius: 20, borderColor: colors.sand200, boxShadow: "none" }}>
        <BookingStepHeader number={1} title="انتخاب خدمت" />
        <div style={{ height: 16 }} />
        {services.length === 0 ? (
          <EmptyState title="خدمت قابل رزرو وجود ندارد" description="این استاد فعلاً خدمت فعال و قابل رزروی ندارد." />
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
                    <span style={{ ...typography.caption, color: colors.inkMuted }}>{numberFormatter.format(item.duration)} دقیقه</span>
                  </span>
                  <strong style={{ ...typography.bodySmall, color: colors.olive700 }}>{formatWalletAmount(Math.max(0, item.price))} تومان</strong>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="vodda-enter vodda-enter-delay-2" style={{ padding: 18, borderRadius: 20, borderColor: colors.sand200, boxShadow: "none" }}>
        <BookingStepHeader number={2} title="انتخاب تاریخ و ساعت" />
        <div style={{ height: 16 }} />
        {!service ? (
          <EmptyState title="یک خدمت انتخاب کنید" description="بعد از انتخاب خدمت، زمان‌های آزاد رسمی استاد دریافت می‌شوند." />
        ) : availabilityLoading ? (
          <LoadingState label="در حال دریافت زمان‌های آزاد…" />
        ) : availabilityError ? (
          <ErrorState
            title="دریافت زمان‌های آزاد ناموفق بود"
            description={availabilityError}
            action={<Button variant="secondary" onClick={() => void loadAvailability(service)}>تلاش دوباره</Button>}
          />
        ) : dateGroups.length === 0 ? (
          <EmptyState title="زمان آزادی پیدا نشد" description="در ۱۴ روز آینده زمان آزاد و قابل رزروی برای این خدمت وجود ندارد." />
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
                      {weekdays[group.weekday] ?? "روز"}
                    </strong>
                    <span style={{ display: "block", marginTop: 4, opacity: 0.82, fontSize: 10.5 }}>
                      {dateLabel(group.localDate, -1)} · {numberFormatter.format(group.slots.length)} زمان
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
                      {item.localStart} تا {item.localEnd}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </Card>

      <Card className="vodda-enter vodda-enter-delay-3" style={{ padding: 18, borderRadius: 20, borderColor: colors.sand200, boxShadow: "none" }}>
        <BookingStepHeader number={3} title="بررسی نهایی" />
        <div style={{ height: 16 }} />
        {!service || !slot ? (
          <EmptyState title="رزرو هنوز آماده ثبت نیست" description="پس از انتخاب خدمت و زمان، خلاصه رزرو اینجا نمایش داده می‌شود." />
        ) : (
          <div style={{ display: "grid" }}>
            {[
              ["استاد", teacher.name],
              ["خدمت", service.title],
              ["تاریخ", fullDateLabel(slot.localDate, slot.weekday)],
              ["ساعت", `${slot.localStart} تا ${slot.localEnd}`],
              ["مدت", `${numberFormatter.format(service.duration)} دقیقه`],
              ["مبلغ", `${formatWalletAmount(Math.max(0, service.price))} تومان`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: spacing.md, paddingBlock: 8 }}>
                <span style={{ color: colors.inkMuted }}>{label}</span>
                <strong style={{ textAlign: "left" }}>{value}</strong>
              </div>
            ))}
            <div style={{ height: 1, marginBlock: 4, background: colors.sand150 }} />
            <div role="radiogroup" aria-label="روش پرداخت" style={{ display: "grid", gap: spacing.sm, marginBlock: spacing.md }}>
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
                  <strong style={{ fontSize: 13.5, fontWeight: 800 }}>پرداخت از کیف پول</strong>
                  <span style={{ ...typography.caption, color: colors.inkMuted }}>
                    {wallet !== null ? `موجودی: ${formatWalletAmount(wallet)} تومان` : "موجودی نامشخص"}{walletCovers ? "" : " — موجودی کافی نیست"}
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
                  <strong style={{ fontSize: 13.5, fontWeight: 800 }}>پرداخت آنلاین با درگاه سامان‌سپ</strong>
                  <span style={{ ...typography.caption, color: colors.inkMuted }}>پرداخت امن با کارت بانکی؛ زمان رزرو تا پایان پرداخت نگه داشته می‌شود</span>
                </span>
                <Icon name="shield" size={20} style={{ color: paymentMethod === "gateway" ? colors.olive600 : colors.inkMuted }} />
              </button>
            </div>
            <p style={{ ...typography.caption, margin: "8px 0 0", color: colors.inkMuted, lineHeight: 1.8 }}>
              {paymentMethod === "gateway"
                ? "با ثبت رزرو به درگاه امن سامان‌سپ منتقل می‌شوید و پس از پرداخت موفق، درخواست برای استاد ارسال می‌شود."
                : "مبلغ هنگام ثبت رزرو از کیف پول کسر می‌شود."}{" "}
              زمان‌ها با timezone رسمی سامانه و تداخل جلسات فعال محاسبه شده‌اند. ممکن است تا لحظهٔ ثبت توسط کاربر دیگری رزرو شوند.
            </p>
          </div>
        )}
      </Card>

      {isSelfTeacher ? (
        <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.goldBackground, color: colors.goldDark, margin: 0 }}>
          این پروفایل متعلق به حساب شماست؛ رزرو جلسه با خودتان ممکن نیست. برای آزمایش فرآیند، با حساب قرآن‌آموز وارد شوید و استاد دیگری را رزرو کنید.
        </p>
      ) : null}
      {submitError ? <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, margin: 0 }}>{submitError}</p> : null}
      <div style={{ position: "sticky", zIndex: 12, bottom: "calc(68px + env(safe-area-inset-bottom))", padding: "8px 0 12px", background: colors.sand50 }}>
        <Button fullWidth loading={saving} disabled={!service || !slot || isSelfTeacher} onClick={() => void submit()} style={{ minHeight: 52 }}>
          {paymentMethod === "gateway" ? "پرداخت و ثبت رزرو" : "ثبت درخواست رزرو"}
        </Button>
      </div>
    </div>
  );
}