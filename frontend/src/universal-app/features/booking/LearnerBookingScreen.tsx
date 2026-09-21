"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { PlatformHttpError } from "../../platform/http";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { getTeacherDetail } from "../teachers/api";
import type { Teacher, TeacherService } from "../teachers/types";
import { Avatar, Button, Card, EmptyState, ErrorState, Icon, IconBadge, LoadingState, SectionHeader, colors, radii, shadows, spacing, typography } from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";
import { createBooking, getBookingAvailability } from "./api";
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
  const availabilityRequest = useRef(0);

  const loadTeacher = useCallback(async () => {
    if (!Number.isInteger(numericTeacherId) || numericTeacherId <= 0) {
      setTeacherError("شناسه استاد نامعتبر است.");
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
      setTeacherError(messageOf(error, "اطلاعات استاد دریافت نشد."));
    } finally {
      setTeacherLoading(false);
    }
  }, [numericTeacherId, runtime]);

  useEffect(() => {
    void loadTeacher();
  }, [loadTeacher]);

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

  const submit = useCallback(async () => {
    if (!teacher || !service || !slot || saving) return;
    setSaving(true);
    setSubmitError("");
    try {
      await createBooking(runtime, {
        teacherId: teacher.id,
        serviceId: service.id,
        // startAt is emitted by the authoritative backend in UTC. Do not rebuild
        // scheduled_at from the device timezone or the local display fields.
        scheduledAt: slot.startAt,
      });
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
  }, [loadAvailability, runtime, saving, service, slot, teacher]);

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

  const services = teacher.services.filter((item) => item.active && item.id > 0);

  return (
    <div className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <Card elevated className="vodda-enter" style={{ display: "flex", alignItems: "center", gap: spacing.md, padding: spacing.lg, background: colors.surfaceWarm }}>
        <Avatar name={teacher.name} size={58} ring />
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ ...typography.caption, color: colors.inkMuted, margin: 0 }}>در حال رزرو با</p>
          <h2 style={{ ...typography.title, margin: "2px 0 0" }}>{teacher.name}</h2>
          <p style={{ ...typography.bodySmall, color: colors.olive700, margin: "2px 0 0", fontWeight: 700 }}>{teacher.tag || teacher.field}</p>
        </div>
        <IconBadge icon="calendar" tone="olive" size={44} />
      </Card>

      <Card className="vodda-enter vodda-enter-delay-1">
        <SectionHeader title="۱. انتخاب خدمت" description="نوع جلسه‌ای که می‌خواهید رزرو کنید" />
        <div style={{ height: spacing.md }} />
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
                    padding: spacing.md,
                    textAlign: "right",
                    color: colors.ink,
                    background: selected ? colors.olive50 : colors.surface,
                    border: `1px solid ${selected ? colors.olive600 : colors.sand200}`,
                    borderRadius: radii.lg,
                    boxShadow: selected ? "0 7px 20px rgba(94,110,67,.12)" : shadows.xs,
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

      <Card className="vodda-enter vodda-enter-delay-2">
        <SectionHeader title="۲. انتخاب تاریخ و ساعت" description="زمان‌ها مستقیماً از برنامه رسمی استاد دریافت می‌شوند" />
        <div style={{ height: spacing.md }} />
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
                      minWidth: 112,
                      padding: `${spacing.sm}px ${spacing.md}px`,
                      color: selected ? colors.surface : colors.inkSecondary,
                      background: selected ? colors.olive700 : colors.sand50,
                      border: `1px solid ${selected ? colors.olive700 : colors.sand200}`,
                      borderRadius: radii.lg,
                      boxShadow: selected ? "0 7px 18px rgba(94,110,67,.18)" : shadows.xs,
                      cursor: "pointer",
                      fontFamily: typography.fontFamily,
                      ...typography.bodySmall,
                    }}
                  >
                    {dateLabel(group.localDate, group.weekday)}
                    <span style={{ display: "block", opacity: 0.8, ...typography.caption }}>{numberFormatter.format(group.slots.length)} زمان</span>
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
                        color: selected ? colors.surface : colors.olive800,
                        background: selected ? colors.olive700 : colors.olive50,
                        border: `1px solid ${selected ? colors.olive700 : colors.olive200}`,
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

      <Card className="vodda-enter vodda-enter-delay-3" style={{ background: service && slot ? colors.olive50 : colors.surface }}>
        <SectionHeader title="۳. بررسی نهایی" description="قبل از ثبت، جزئیات درخواست را مرور کنید" />
        <div style={{ height: spacing.md }} />
        {!service || !slot ? (
          <EmptyState title="رزرو هنوز آماده ثبت نیست" description="پس از انتخاب خدمت و زمان، خلاصه رزرو اینجا نمایش داده می‌شود." />
        ) : (
          <div style={{ display: "grid", gap: spacing.sm }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.md }}><span>استاد</span><strong>{teacher.name}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.md }}><span>خدمت</span><strong>{service.title}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.md }}><span>زمان محلی وُدّا</span><strong>{dateLabel(slot.localDate, slot.weekday)} · {slot.localStart} تا {slot.localEnd}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.md }}><span>مبلغ</span><strong>{formatWalletAmount(Math.max(0, service.price))} تومان</strong></div>
          </div>
        )}
      </Card>

      {submitError ? <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, margin: 0 }}>{submitError}</p> : null}
      <div style={{ position: "sticky", zIndex: 12, bottom: "calc(84px + env(safe-area-inset-bottom))", padding: 8, border: "1px solid rgba(228,221,204,.82)", borderRadius: radii.lg, background: "rgba(255,255,255,.92)", boxShadow: shadows.floating, backdropFilter: "blur(16px)" }}>
        <Button fullWidth loading={saving} disabled={!service || !slot} onClick={() => void submit()}>
          <Icon name="checkCircle" size={18} />
          ثبت درخواست رزرو
        </Button>
      </div>
    </div>
  );
}