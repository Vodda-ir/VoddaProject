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
import { Avatar, Button, Card, EmptyState, ErrorState, Icon, LoadingState, MenuSelect, colors, gradients, radii, shadows, spacing, typography } from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { useAppearance } from "../../ui/appearance";
import { localizedDigits } from "../../ui/persian";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";
import { getBookingMe } from "./api";
import { BookingWizardSheet, sessionModeMeta, type BookingWizardResult } from "./BookingWizardSheet";
import { InPersonWizardSheet, type InPersonWizardResult } from "./InPersonWizardSheet";

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
  const [inPersonOpen, setInPersonOpen] = useState(false);
  const [inPersonService, setInPersonService] = useState<TeacherService | null>(null);
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
  // خدمات حضوری بخش اختصاصی خودشان را دارند (ویزارد حضوری) — از فهرست آنلاین حذف می‌شوند.
  const onlineServices = useMemo(
    () => allServices.filter((item) => item.mode !== "in_person"),
    [allServices],
  );
  const inPersonServices = useMemo(
    () => allServices.filter((item) => item.mode === "in_person"),
    [allServices],
  );
  // سه نوع جلسهٔ آنلاین اول می‌آیند (صوتی، متنی، تصویری) — انتخاب روش برگزاری برای کاربر واضح باشد.
  const sortedServices = useMemo(
    () =>
      [...onlineServices].sort((left, right) => {
        const leftMode = MODE_ORDER[left.mode ?? ""];
        const rightMode = MODE_ORDER[right.mode ?? ""];
        if (leftMode != null && rightMode != null) return leftMode - rightMode;
        if (leftMode != null) return -1;
        if (rightMode != null) return 1;
        return 0;
      }),
    [onlineServices],
  );
  // فیلتر خدمات رایگان: وقتی از کارت جلسهٔ رایگان آمده‌ایم، خدمات پولی نمایش داده نمی‌شوند
  const services = useMemo(
    () => (freeOnly ? sortedServices.filter((item) => item.price === 0) : sortedServices),
    [sortedServices, freeOnly],
  );
  const inPersonVisible = useMemo(
    () => (freeOnly ? inPersonServices.filter((item) => item.price === 0) : inPersonServices),
    [inPersonServices, freeOnly],
  );
  // گروه‌های لیست کشویی خدمات — آنلاین (صوتی/متنی/تصویری) و حضوری با تم طلایی
  const menuGroups = useMemo(
    () => [
      ...(services.length > 0
        ? [
            {
              title: L("جلسات آنلاین"),
              items: services.map((item) => {
                const modeMeta = sessionModeMeta(item.mode ?? "");
                return {
                  key: String(item.id),
                  title: item.title,
                  sub: `${localizedDigits(item.duration, lang)} ${L("دقیقه")} · ${
                    item.price === 0
                      ? L("رایگان")
                      : `${formatWalletAmount(Math.max(0, item.price))} ${L("تومان")}`
                  }`,
                  icon: modeMeta ? modeMeta.icon : "book",
                  badge: modeMeta ? L(modeMeta.label) : undefined,
                  gold: item.price === 0,
                };
              }),
            },
          ]
        : []),
      ...(inPersonVisible.length > 0
        ? [
            {
              title: L("جلسات حضوری — در محل"),
              items: inPersonVisible.map((item) => ({
                key: String(item.id),
                title: item.title,
                sub: `${localizedDigits(item.duration, lang)} ${L("دقیقه")} · ${
                  item.price === 0
                    ? L("رایگان")
                    : `${formatWalletAmount(Math.max(0, item.price))} ${L("تومان")}`
                }`,
                icon: "pin",
                badge: L("حضوری"),
                gold: true,
              })),
            },
          ]
        : []),
    ],
    [services, inPersonVisible, lang, L],
  );
  const isSelfTeacher = Boolean(teacher?.userId && meId && teacher.userId === meId);

  const openWizard = useCallback((item: TeacherService) => {
    setWizardService(item);
    setWizardOpen(true);
  }, []);

  const openInPerson = useCallback((item: TeacherService) => {
    setInPersonService(item);
    setInPersonOpen(true);
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

  const handleBookedInPerson = useCallback((result: InPersonWizardResult) => {
    setInPersonOpen(false);
    setInPersonService(null);
    if (result.gateway) {
      setRedirecting(true);
      return;
    }
    setWasInstant(false);
    setInstantSessionId(result.sessionId);
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

      {/* انتخاب خدمت — لیست کشویی زیبا به‌جای چیپ‌ها و کادرها */}
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
            {localizedDigits(services.length + inPersonVisible.length, lang)} {L("خدمت")}
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

        {services.length + inPersonVisible.length === 0 ? (
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
          <div style={{ marginTop: 2 }}>
            <MenuSelect
              ariaLabel="انتخاب خدمت برای شروع رزرو"
              placeholder={L("برای شروع رزرو، یک خدمت را انتخاب کنید…")}
              displayTitle={wizardService?.title ?? inPersonService?.title ?? undefined}
              displaySub={
                wizardService || inPersonService
                  ? `${localizedDigits((wizardService ?? inPersonService)?.duration ?? 0, lang)} ${L("دقیقه")} · ${
                      (wizardService ?? inPersonService)!.price === 0
                        ? L("رایگان")
                        : `${formatWalletAmount(Math.max(0, (wizardService ?? inPersonService)!.price))} ${L("تومان")}`
                    }`
                  : undefined
              }
              displayIcon={
                wizardService
                  ? (sessionModeMeta(wizardService.mode ?? "")?.icon ?? "book")
                  : inPersonService
                    ? "pin"
                    : undefined
              }
              displayGold={Boolean(inPersonService)}
              countLabel={L("خدمت")}
              groups={menuGroups}
              onPick={(key) => {
                const picked = [...services, ...inPersonVisible].find((item) => String(item.id) === key);
                if (!picked) return;
                if (picked.mode === "in_person") openInPerson(picked);
                else openWizard(picked);
              }}
            />
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
          {L("از لیست کشویی، خدمت دلخواه را انتخاب کنید تا چرخهٔ رزرو باز شود: نوع جلسه (فوری یا زمان‌دار)، روش برگزاری (تلفنی، متنی یا تصویری)، تاریخ و زمان، و پرداخت — هر مرحله مستقل و با نوار پیشرفت مشخص. جلسات حضوری هم ویزارد مخصوص خودشان را دارند: محل برگزاری، موضوع، زمان و پرداخت.")}
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

      {/* ویزارد رزرو حضوری — با انتخاب هر خدمت حضوری باز می‌شود */}
      <InPersonWizardSheet
        open={inPersonOpen}
        teacher={teacher}
        initialService={inPersonService}
        onClose={() => setInPersonOpen(false)}
        onBooked={handleBookedInPerson}
      />
    </div>
  );
}
