"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { PlatformHttpError } from "../../platform/http";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { getTeacherDetail } from "../teachers/api";
import type { Teacher, TeacherService } from "../teachers/types";
import { Avatar, Button, Card, EmptyState, ErrorState, LoadingState, colors, radii, spacing, typography } from "../../ui";
import { createBooking, getBookingAvailability } from "./api";
import type { BookingSlot } from "./types";

const weekdays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const numberFormatter = new Intl.NumberFormat("fa-IR");

function money(value: number) {
  return `${numberFormatter.format(Math.max(0, value))} تومان`;
}

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
      setTeacherError(error instanceof Error ? error.message : "اطلاعات استاد دریافت نشد.");
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
      setSubmitError("");
      try {
        const rows = await getBookingAvailability(runtime, numericTeacherId, selectedService.id, 14);
        if (availabilityRequest.current !== requestId) return;
        setAvailability(rows);
      } catch (error) {
        if (availabilityRequest.current !== requestId) return;
        setAvailability([]);
        setAvailabilityError(error instanceof Error ? error.message : "زمان‌های آزاد استاد دریافت نشد.");
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
        setSlot(null);
        setSubmitError("این زمان همین حالا رزرو شده است. زمان‌های آزاد دوباره دریافت شدند؛ لطفاً زمان دیگری انتخاب کنید.");
        await loadAvailability(service);
      } else {
        setSubmitError(error instanceof Error ? error.message : "ثبت درخواست رزرو انجام نشد.");
      }
    } finally {
      setSaving(false);
    }
  }, [loadAvailability, runtime, saving, service, slot, teacher]);

  if (teacherLoading) return <LoadingState title="در حال دریافت اطلاعات استاد…" />;
  if (teacherError || !teacher) return <ErrorState description={teacherError || "اطلاعات استاد دریافت نشد."} actionLabel="تلاش دوباره" onAction={() => void loadTeacher()} />;

  if (submitted) {
    return (
      <Card elevated style={{ display: "grid", gap: spacing.lg, textAlign: "center" }}>
        <div style={{ fontSize: 42 }} aria-hidden="true">✓</div>
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
    <div style={{ display: "grid", gap: spacing.lg }}>
      <Card elevated style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
        <Avatar name={teacher.name} size={56} />
        <div style={{ minWidth: 0 }}>
          <h2 style={{ ...typography.title, margin: 0 }}>{teacher.name}</h2>
          <p style={{ ...typography.bodySmall, color: colors.olive700, margin: "2px 0 0" }}>{teacher.tag || teacher.field}</p>
        </div>
      </Card>

      <Card>
        <h3 style={{ ...typography.title, marginTop: 0 }}>۱. انتخاب خدمت</h3>
        {services.length === 0 ? (
          <EmptyState description="این استاد فعلاً خدمت فعال و قابل رزروی ندارد." />
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
                    background: selected ? colors.olive50 : colors.sand50,
                    border: `1px solid ${selected ? colors.olive600 : colors.sand200}`,
                    borderRadius: radii.sm,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily,
                  }}
                >
                  <span>
                    <strong style={{ display: "block", ...typography.body }}>{item.title}</strong>
                    <span style={{ ...typography.caption, color: colors.inkMuted }}>{numberFormatter.format(item.duration)} دقیقه</span>
                  </span>
                  <strong style={{ ...typography.bodySmall, color: colors.olive700 }}>{money(item.price)}</strong>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <Card>
        <h3 style={{ ...typography.title, marginTop: 0 }}>۲. انتخاب تاریخ و ساعت</h3>
        {!service ? (
          <EmptyState description="ابتدا یک خدمت را انتخاب کنید." />
        ) : availabilityLoading ? (
          <LoadingState title="در حال دریافت زمان‌های آزاد…" />
        ) : availabilityError ? (
          <ErrorState description={availabilityError} actionLabel="تلاش دوباره" onAction={() => void loadAvailability(service)} />
        ) : dateGroups.length === 0 ? (
          <EmptyState description="در ۱۴ روز آینده زمان آزاد و قابل رزروی برای این خدمت وجود ندارد." />
        ) : (
          <div style={{ display: "grid", gap: spacing.lg }}>
            <div style={{ display: "flex", gap: spacing.sm, overflowX: "auto", paddingBottom: spacing.xs }}>
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
                      borderRadius: radii.sm,
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

      <Card>
        <h3 style={{ ...typography.title, marginTop: 0 }}>۳. بررسی نهایی</h3>
        {!service || !slot ? (
          <EmptyState description="پس از انتخاب خدمت و زمان، خلاصه رزرو اینجا نمایش داده می‌شود." />
        ) : (
          <div style={{ display: "grid", gap: spacing.sm }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.md }}><span>استاد</span><strong>{teacher.name}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.md }}><span>خدمت</span><strong>{service.title}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.md }}><span>زمان محلی وُدّا</span><strong>{dateLabel(slot.localDate, slot.weekday)} · {slot.localStart} تا {slot.localEnd}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.md }}><span>مبلغ</span><strong>{money(service.price)}</strong></div>
          </div>
        )}
      </Card>

      {submitError ? <p role="alert" style={{ ...typography.bodySmall, color: colors.danger, margin: 0 }}>{submitError}</p> : null}
      <Button fullWidth loading={saving} disabled={!service || !slot} onClick={() => void submit()}>
        ثبت درخواست رزرو
      </Button>
    </div>
  );
}
