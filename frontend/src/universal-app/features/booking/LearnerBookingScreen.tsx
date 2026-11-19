"use client";

// صفحهٔ رزرو استاد — نسخهٔ بازطراحی‌شده با ویزارد رزرو.
//
// رفتار تازه: فهرست خدمات فشرده است؛ با انتخاب «هر خدمت»، کادر ویزارد رزرو
// همان‌جا بالا می‌آید — نوع جلسه (فوری/زمان‌دار)، روش برگزاری (تلفنی/متنی/
// تصویری)، تاریخ و زمان و درگاه پرداخت همه داخل همان کادر با چرخهٔ مشخص
// انجام می‌شود. کاربر دیگر برای رزرو تا ته صفحه اسکرول نمی‌کند.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { getTeacherDetail } from "../teachers/api";
import type { Teacher, TeacherService } from "../teachers/types";
import { Avatar, Button, Card, EmptyState, ErrorState, Icon, LoadingState, colors, gradients, radii, shadows, spacing, typography } from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { useAppearance } from "../../ui/appearance";
import { localizedDigits } from "../../ui/persian";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";
import { getBookingMe } from "./api";
import { BookingWizardSheet, sessionModeMeta, type BookingWizardResult } from "./BookingWizardSheet";

const MODE_ORDER: Record<string, number> = { voice: 0, text: 1, video: 2 };

export function LearnerBookingScreen({ teacherId, config }: { teacherId: string; config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { L, lang, N } = useAppearance();
  const numericTeacherId = Number(teacherId);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [teacherLoading, setTeacherLoading] = useState(true);
  const [teacherError, setTeacherError] = useState("");
  const [meId, setMeId] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardService, setWizardService] = useState<TeacherService | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [wasInstant, setWasInstant] = useState(false);
  const [instantSessionId, setInstantSessionId] = useState(0);
  // ?free=1 → ورود از کارت «خدمات رایگان» خانه؛ فقط خدمات رایگان این استاد نمایش داده می‌شود
  const [freeOnly, setFreeOnly] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("free") === "1";
  });

  // باگ refresh-loop: اجرای دوم StrictMode یا فراخوانی دیرهنگام نباید state را با دادهٔ کهنه بازنویسی کند.
  const teacherGeneration = useRef(0);

  const loadTeacher = useCallback(async () => {
    const generation = ++teacherGeneration.current;
    const isStale = () => teacherGeneration.current !== generation;
    if (!Number.isInteger(numericTeacherId) || numericTeacherId <= 0) {
      setTeacherError(L("شناسه استاد نامعتبر است."));
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
      setTeacherError(messageOf(error, L("اطلاعات استاد دریافت نشد.")));
    } finally {
      if (!isStale()) setTeacherLoading(false);
    }
  }, [numericTeacherId, runtime, L]);

  useEffect(() => {
    void loadTeacher();
    let active = true;
    getBookingMe(runtime)
      .then((me) => {
        if (!active) return;
        setMeId(me.id);
      })
      .catch(() => { /* هشدار خود-رزرو اختیاری است */ });
    return () => { active = false; };
  }, [loadTeacher, runtime]);

  const allServices = teacher?.services.filter((item) => item.active && item.id > 0) ?? [];
  // سه نوع جلسهٔ آنلاین اول می‌آیند (صوتی، متنی، تصویری) — انتخاب روش برگزاری برای کاربر واضح باشد.
  const sortedServices = useMemo(
    () =>
      [...allServices].sort((left, right) => {
        const leftMode = MODE_ORDER[left.mode ?? ""];
        const rightMode = MODE_ORDER[right.mode ?? ""];
        if (leftMode != null && rightMode != null) return leftMode - rightMode;
        if (leftMode != null) return -1;
        if (rightMode != null) return 1;
        return 0;
      }),
    [allServices],
  );
  // فیلتر خدمات رایگان: وقتی از کارت جلسهٔ رایگان آمده‌ایم، خدمات پولی نمایش داده نمی‌شوند
  const services = useMemo(
    () => (freeOnly ? sortedServices.filter((item) => item.price === 0) : sortedServices),
    [sortedServices, freeOnly],
  );
  const isSelfTeacher = Boolean(teacher?.userId && meId && teacher.userId === meId);

  const openWizard = useCallback((item: TeacherService) => {
    setWizardService(item);
    setWizardOpen(true);
  }, []);

  const handleBooked = useCallback((result: BookingWizardResult) => {
    setWizardOpen(false);
    setWizardService(null);
    if (result.gateway) {
      // کاربر به درگاه بانک پست شده؛ صفحهٔ انتقال نشان داده می‌شود.
      setRedirecting(true);
      return;
    }
    setWasInstant(result.wasInstant);
    setInstantSessionId(result.instantSessionId);
    setSubmitted(true);
  }, []);

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
        <div aria-hidden="true" style={{ width: 68, height: 68, display: "grid", placeItems: "center", marginInline: "auto", borderRadius: "50%", color: colors.onOlive, background: colors.olive600, boxShadow: shadows.olive }}><Icon name="check" size={30} stroke={2.5} /></div>
        <div>
          <h2 style={{ ...typography.title, margin: 0 }}>{wasInstant ? L("جلسهٔ فوری ثبت شد") : L("درخواست جلسه ثبت شد")}</h2>
          <p style={{ ...typography.body, color: colors.inkSecondary, marginBottom: 0 }}>
            {wasInstant
              ? L("درخواست شما همین حالا برای استاد ارسال شد. به‌محض تأیید، از جزئیات جلسه وارد کلاس شوید و برای هماهنگی چت در دسترس است.")
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
        <div aria-hidden="true" style={{ width: 68, height: 68, display: "grid", placeItems: "center", marginInline: "auto", borderRadius: "50%", color: colors.onOlive, background: colors.olive600, boxShadow: shadows.olive }}><Icon name="shield" size={30} stroke={2.2} /></div>
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
          <strong style={{ fontSize: 16, fontWeight: 800, display: "block", color: colors.ink }}>{N(teacher.name)}</strong>
          <span style={{ fontSize: 12.5, color: colors.olive700 }}>{L(teacher.tag || teacher.field)}</span>
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

      {isSelfTeacher ? (
        <p
          role="alert"
          style={{
            ...typography.bodySmall,
            padding: spacing.md,
            borderRadius: radii.md,
            background: colors.goldBackground,
            color: colors.goldDark,
            margin: 0,
            lineHeight: 1.9,
          }}
        >
          {L("این پروفایل متعلق به حساب شماست؛ رزرو جلسه با خودتان ممکن نیست. برای آزمایش فرآیند، با حساب قرآن‌آموز وارد شوید و استاد دیگری را رزرو کنید.")}
        </p>
      ) : null}

      <Card className="vodda-enter vodda-enter-delay-1" style={{ padding: 18, borderRadius: 20, borderColor: colors.sand200, boxShadow: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <strong style={{ fontSize: 15.5, fontWeight: 900, color: colors.ink }}>{L("خدمات قابل رزرو")}</strong>
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
            }}
          >
            <Icon name="grid" size={12} />
            {localizedDigits(services.length, lang)} {L("خدمت")}
          </span>
        </div>

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
          <div style={{ height: 14 }} />
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
            {services.map((item, index) => {
              const modeMeta = sessionModeMeta(item.mode ?? "");
              const isGold = item.price === 0;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openWizard(item)}
                  className={`vodda-enter vodda-enter-delay-${Math.min(3, index + 1)}`}
                  aria-label={L("رزرو {n}").replace("{n}", item.title)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.md,
                    padding: 13,
                    textAlign: "right",
                    width: "100%",
                    minWidth: 0,
                    color: colors.ink,
                    background: item.mode ? colors.greenBackground : colors.sand50,
                    border: isGold
                      ? `1px solid ${colors.gold}`
                      : item.mode
                        ? `1px solid ${colors.greenBorder}`
                        : `1px solid ${colors.sand200}`,
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
                      background: modeMeta
                        ? colors.greenChip
                        : isGold
                          ? colors.goldBackground
                          : colors.olive50,
                      color: modeMeta ? colors.greenDeep : isGold ? colors.goldDark : colors.olive700,
                      border: modeMeta ? "transparent" : `1px solid ${isGold ? colors.goldSoft : colors.olive100}`,
                    }}
                  >
                    <Icon name={modeMeta ? modeMeta.icon : isGold ? "gift" : "book"} size={19} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 3 }}>
                    <strong style={{ fontSize: 13.5, fontWeight: 800, display: "block" }}>{L(item.title)}</strong>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      {modeMeta ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 9px",
                            borderRadius: 999,
                            background: colors.greenChip,
                            color: colors.greenInk,
                            fontSize: 10.5,
                            fontWeight: 800,
                          }}
                        >
                          <Icon name={modeMeta.icon} size={11} stroke={2.2} />
                          {L(modeMeta.label)}
                        </span>
                      ) : null}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: colors.inkMuted, fontWeight: 700 }}>
                        <Icon name="clock" size={11} stroke={2} />
                        {localizedDigits(item.duration, lang)} {L("دقیقه")}
                      </span>
                    </span>
                  </span>
                  <span style={{ flex: "0 0 auto", textAlign: "left", display: "grid", justifyItems: "end", gap: 4 }}>
                    {item.price === 0 ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 10px",
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
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        fontSize: 10,
                        fontWeight: 800,
                        color: colors.olive600,
                      }}
                    >
                      <Icon name="plus" size={11} stroke={2.6} />
                      {L("رزرو")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* راهنمای چرخهٔ رزرو */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 18,
          background: gradients.goldPanel,
          border: `1.5px solid ${colors.goldSoft}`,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            display: "grid",
            placeItems: "center",
            flex: "0 0 38px",
            borderRadius: 12,
            background: "linear-gradient(145deg,#d8b869,#b8923c)",
            color: "#fffaf0",
          }}
        >
          <Icon name="info" size={18} stroke={2.2} />
        </span>
        <span style={{ minWidth: 0, flex: 1, fontSize: 11.5, lineHeight: 2, color: colors.goldInk, fontWeight: 600 }}>
          {L("با انتخاب هر خدمت، کادر رزرو باز می‌شود: نوع جلسه (فوری یا زمان‌دار)، روش برگزاری (تلفنی، متنی یا تصویری)، تاریخ و زمان، و پرداخت — همه در همان کادر با چرخهٔ مراحل مشخص انجام می‌شود.")}
        </span>
      </div>

      {/* ویزارد رزرو — با انتخاب هر خدمت باز می‌شود */}
      <BookingWizardSheet
        open={wizardOpen}
        teacher={teacher}
        initialService={wizardService}
        onClose={() => setWizardOpen(false)}
        onBooked={handleBooked}
      />
    </div>
  );
}
