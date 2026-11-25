"use client";

import { useEffect, useMemo, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  IconBadge,
  LoadingState,
  SectionHeader,
  colors,
  spacing,
  typography,
} from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { formatAppDateTime } from "../../ui/jalali";
import { localizedDigits } from "../../ui/persian";
import { TierBadge } from "./TierBadge";
import { TeacherBioBlocks } from "./BioBlocks";
import { messageOf } from "../../ui/errorMessage";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";
import { getTeacherDetail, fetchMyFollows, fetchFollowerCount, toggleFollowTeacher } from "./api";
import type { TeacherDetail, TeacherReview, TeacherService } from "./types";
import { BookingWizardSheet, type BookingWizardResult } from "../booking/BookingWizardSheet";
import { InPersonWizardSheet, type InPersonWizardResult } from "../booking/InPersonWizardSheet";

function reviewDate(value: string, lang: "fa" | "en") {
  if (!value) return "";
  return formatAppDateTime(value, lang, { withTime: false });
}

function ServiceCard({ service, onSelect }: { service: TeacherService; onSelect: (service: TeacherService) => void }) {
  const { L } = useAppearance();
  return (
    <Card
      className="vodda-card--interactive"
      role="button"
      tabIndex={0}
      aria-label={L("رزرو {n}").replace("{n}", service.title)}
      onClick={() => onSelect(service)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(service);
        }
      }}
      style={{ padding: spacing.lg, cursor: "pointer" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
        <IconBadge icon={service.icon.includes("mic") ? "mic" : "book"} tone={service.icon.includes("mic") ? "clay" : "olive"} size={44} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ ...typography.body, display: "block", color: colors.ink, fontWeight: 900 }}>{L(service.title)}</strong>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginTop: 4,
              padding: "2px 9px",
              borderRadius: 999,
              background: service.mode === "in_person" ? colors.goldBackground : colors.olive50,
              border: `1px solid ${service.mode === "in_person" ? colors.goldSoft : colors.olive100}`,
              color: service.mode === "in_person" ? colors.goldDark : colors.olive700,
              fontSize: 11.5,
              fontWeight: 700,
            }}
          >
            <Icon name={service.mode === "in_person" ? "pin" : "clock"} size={12} stroke={2} />
            {service.mode === "in_person" ? L("حضوری") : formatWalletAmount(service.duration)}
            {service.mode !== "in_person" ? ` ${L("دقیقه")}` : ""}
          </span>
        </div>
        <span style={{ flexShrink: 0, display: "grid", justifyItems: "end", gap: 5 }}>
          {service.price === 0 ? (
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
            <strong style={{ ...typography.bodySmall, color: colors.olive700, whiteSpace: "nowrap" }}>
              {formatWalletAmount(service.price)} {L("تومان")}
            </strong>
          )}
          {/* راهنمای انتخاب — با لمس کارت، ویزارد رزرو همان‌جا باز می‌شود */}
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
      </div>
    </Card>
  );
}

function ReviewCard({ review }: { review: TeacherReview }) {
  const { L, lang, N } = useAppearance();
  const rating = Math.max(0, Math.min(5, Math.round(review.rating)));
  return (
    <Card style={{ padding: spacing.lg }}>
      <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
        <Avatar name={review.learnerName} size={42} ring={false} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ ...typography.bodySmall, display: "block", color: colors.ink }}>{N(review.learnerName)}</strong>
          {review.createdAt ? (
            <span style={{ ...typography.caption, display: "block", marginTop: 1, color: colors.inkFaint }}>
              {reviewDate(review.createdAt, lang)}
            </span>
          ) : null}
        </div>
        <span aria-label={L("امتیاز {n} از ۵").replace("{n}", localizedDigits(rating, lang))} style={{ display: "inline-flex", gap: 1, direction: "ltr", color: colors.gold }}>
          {Array.from({ length: 5 }, (_, index) => (
            <Icon key={index} name="star" size={14} fill={index < rating} stroke={1.7} />
          ))}
        </span>
      </div>
      {review.text ? (
        <p style={{ ...typography.bodySmall, margin: `${spacing.md}px 0 0`, color: colors.inkSecondary, lineHeight: 1.9 }}>
          {L(review.text)}
        </p>
      ) : null}
    </Card>
  );
}

export function LearnerTeacherProfileScreen({
  teacherId,
  config,
}: {
  teacherId: string;
  config: UniversalAppConfig;
}) {
  const runtime = usePlatform();
  const { L, lang, N } = useAppearance();
  const parsedId = useMemo(() => Number(teacherId), [teacherId]);
  const [detail, setDetail] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  /* ۱.ب.۴ — فیلتر خدمت از لینک کارت رایگان (?service=<id>) — فقط همان خدمت با امکان برداشتن فیلتر */
  const [serviceFilterId, setServiceFilterId] = useState(0);
  /* E2 — دنبال‌کردن استاد */
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [followHint, setFollowHint] = useState<string | null>(null);
  /* ویزارد رزرو — با لمس هر کارت خدمت، کادر رزرو همان‌جا باز می‌شود */
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardService, setWizardService] = useState<TeacherService | null>(null);
  const [wizardDefaultInstant, setWizardDefaultInstant] = useState(false);
  /* ویزارد حضوری — خدمات با mode=in_person کادر مخصوص خودشان را دارند */
  const [inPersonOpen, setInPersonOpen] = useState(false);
  const [inPersonService, setInPersonService] = useState<TeacherService | null>(null);

  const openBookingWizard = (service: TeacherService) => {
    // جلسات حضوری به ویزارد مخصوص حضور می‌روند (محل برگزاری، موضوع، زمان، پرداخت)
    if (service.mode === "in_person") {
      setInPersonService(service);
      setInPersonOpen(true);
      return;
    }
    setWizardService(service);
    setWizardDefaultInstant(false);
    setWizardOpen(true);
  };

  const openInstantWizard = () => {
    setWizardService(services[0] ?? null);
    setWizardDefaultInstant(true);
    setWizardOpen(true);
  };

  const handleWizardBooked = (result: BookingWizardResult) => {
    setWizardOpen(false);
    setWizardService(null);
    if (result.gateway) {
      // کاربر به درگاه بانک پست شده؛ صفحهٔ جلسات مقصد بازگشت است.
      navigateApp("/sessions", config);
      return;
    }
    if (result.wasInstant && result.instantSessionId > 0) {
      navigateApp(`/session/${result.instantSessionId}`, config);
      return;
    }
    navigateApp("/sessions", config);
  };

  const handleInPersonBooked = (result: InPersonWizardResult) => {
    setInPersonOpen(false);
    setInPersonService(null);
    if (result.gateway) {
      navigateApp("/sessions", config);
      return;
    }
    navigateApp("/sessions", config);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("service") ?? "";
    const parsed = Number.parseInt(raw, 10);
    setServiceFilterId(Number.isInteger(parsed) && parsed > 0 ? parsed : 0);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setDetail(null);

    getTeacherDetail(runtime, parsedId)
      .then((value) => {
        if (active) setDetail(value);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(messageOf(reason, L("دریافت پروفایل استاد با خطا روبه‌رو شد.")));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [runtime, parsedId, reloadKey]);

  useEffect(() => {
    if (loading || error || !detail) return;
    let active = true;
    void fetchFollowerCount(runtime, parsedId).then((count) => {
      if (active && count !== null) setFollowerCount(count);
    });
    void fetchMyFollows(runtime).then((ids) => {
      if (active) setFollowing(ids.includes(String(parsedId)));
    });
    return () => {
      active = false;
    };
  }, [runtime, parsedId, loading, error, detail]);

  if (loading) return <LoadingState label={L("در حال دریافت پروفایل استاد…")} />;
  if (error || !detail) {
    return (
      <ErrorState
        title={L("پروفایل استاد دریافت نشد")}
        description={error || L("اطلاعات این استاد در دسترس نیست.")}
        action={<Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>{L("تلاش دوباره")}</Button>}
      />
    );
  }

  const { teacher, reviews } = detail;
  const activeServices = teacher.services.filter((service) => service.active);
  const services = serviceFilterId > 0
    ? activeServices.filter((service) => service.id === serviceFilterId)
    : activeServices;
  const ratingLabel = teacher.reviews > 0
    ? teacher.rating.toLocaleString(lang === "en" ? "en-US" : "fa-IR", { maximumFractionDigits: 1 })
    : "—";

  async function handleFollowToggle() {
    if (followBusy) return;
    setFollowBusy(true);
    setFollowHint(null);
    const optimistic = !following;
    setFollowing(optimistic);
    setFollowerCount((current) => (current === null ? optimistic ? 1 : 0 : Math.max(0, current + (optimistic ? 1 : -1))));
    try {
      const result = await toggleFollowTeacher(runtime, parsedId, optimistic);
      setFollowing(result.following);
      setFollowerCount(result.count);
    } catch (toggleError) {
      // برگشت خوش‌بینانه
      setFollowing(!optimistic);
      setFollowerCount((current) => (current === null ? null : Math.max(0, current + (optimistic ? -1 : 1))));
      const status = (toggleError as { status?: number }).status;
      setFollowHint(
        status === 401
          ? L("برای دنبال‌کردن استاد ابتدا وارد شوید")
          : L("دنبال‌کردن ثبت نشد — دوباره تلاش کنید"),
      );
      if (status === 401) navigateApp("/login", config);
    } finally {
      setFollowBusy(false);
    }
  }

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <div className="vodda-enter" style={{ display: "grid", justifyItems: "center", textAlign: "center", gap: 4 }}>
        <div style={{ position: "relative" }}>
          <Avatar name={teacher.name} src={teacher.avatarUrl || undefined} size={88} ring />
          {teacher.tier ? (
            <span
              aria-label={L("نشان درجه استاد")}
              style={{
                position: "absolute",
                insetInlineEnd: -2,
                bottom: 1,
                width: 25,
                height: 25,
                display: "grid",
                placeItems: "center",
                border: "3px solid " + colors.sand50,
                borderRadius: "50%",
                background: colors.sand50,
              }}
            >
              <TierBadge tier={teacher.tier} size={17} />
            </span>
          ) : null}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 0", color: colors.ink, display: "inline-flex", alignItems: "center", gap: 6 }}>
          {N(teacher.name)}
          <TierBadge tier={teacher.tier} size={16} />
        </h2>
        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: colors.olive600 }}>
          {L(teacher.tag || teacher.field || "استاد وُدّا")}
        </p>
        {/* چراغ وضعیت استاد — آنلاین: سبز تپنده، آفلاین: قرمز چشمک‌زن + نشان جلسهٔ فوری */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 11px",
              borderRadius: 999,
              fontSize: 11.5,
              fontWeight: 800,
              color: teacher.available ? colors.olive700 : colors.danger,
              background: teacher.available ? colors.olive50 : colors.dangerBackground,
              border: `1px solid ${teacher.available ? colors.olive100 : "rgba(224,36,94,.25)"}`,
            }}
          >
            <span
              aria-hidden="true"
              className={teacher.available ? "vodda-live-dot" : "vodda-offline-dot"}
              style={{ width: 8, height: 8, borderRadius: "50%", flex: "0 0 auto", background: teacher.available ? colors.olive600 : colors.danger, color: teacher.available ? colors.olive600 : colors.danger }}
            />
            {teacher.available ? L("آنلاین — آمادهٔ رزرو") : L("آفلاین")}
          </span>
          {teacher.instantEnabled ? (
            <span
              aria-label={L("جلسهٔ فوری فعال است")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 11px",
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 800,
                color: colors.goldInk,
                background: colors.goldBackground,
                border: `1px solid ${colors.goldSoft}`,
              }}
            >
              <Icon name="sparkle" size={12} stroke={2.4} style={{ color: colors.goldDark }} />
              {L("جلسهٔ فوری — همین حالا")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="vodda-enter vodda-enter-delay-1" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {([
          ["star" as const, ratingLabel, L("امتیاز")],
          ["message" as const, formatWalletAmount(teacher.reviews), L("نظر")],
          ["calendar" as const, formatWalletAmount(teacher.sessions), L("جلسه")],
        ] as const).map(([icon, value, label]) => (
          <div key={label} style={{ minWidth: 0, padding: "14px 8px", textAlign: "center", borderRadius: 18, background: colors.surface }}>
            <Icon name={icon} size={22} style={{ color: colors.olive500 }} />
            <strong style={{ display: "block", marginTop: 6, fontSize: 18, fontWeight: 800, color: colors.ink }}>{value}</strong>
            <span style={{ fontSize: 12, color: colors.inkMuted }}>{label}</span>
          </div>
        ))}
      </div>

      {/* E2 — دنبال‌کردن استاد + شمار دنبال‌کننده */}
      <div className="vodda-enter vodda-enter-delay-1" style={{ display: "flex", alignItems: "stretch", gap: 8, minWidth: 0 }}>
        <button
          type="button"
          onClick={() => void handleFollowToggle()}
          disabled={followBusy}
          aria-pressed={following}
          className="vodda-tappable"
          style={{
            flex: 1,
            minWidth: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            padding: "11px 14px",
            borderRadius: 14,
            border: `1.5px solid ${following ? colors.olive100 : colors.gold}`,
            background: following ? colors.olive50 : colors.goldBackground,
            color: following ? colors.olive700 : colors.goldDark,
            fontSize: 13,
            fontWeight: 900,
            cursor: followBusy ? "wait" : "pointer",
            fontFamily: typography.fontFamily,
          }}
        >
          <Icon name={following ? "check" : "plus"} size={15} stroke={2.2} />
          {following ? L("دنبال‌شده") : L("دنبال‌کردن استاد")}
        </button>
        <span
          title={L("شمار دنبال‌کننده")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "11px 13px",
            borderRadius: 14,
            border: `1px solid ${colors.border}`,
            background: colors.surface,
            color: colors.inkSecondary,
            fontSize: 12,
            fontWeight: 800,
            flex: "0 0 auto",
          }}
        >
          <Icon name="users" size={14} />
          {followerCount === null ? "—" : localizedDigits(followerCount, lang === "en" ? "en" : "fa")}
        </span>
      </div>
      {followHint ? (
        <p role="alert" style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: colors.danger, textAlign: "center" }}>
          {followHint}
        </p>
      ) : null}

      <section>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: colors.ink }}>{L("دربارهٔ استاد")}</h3>
        <TeacherBioBlocks bio={teacher.bio} />
      </section>

      <section>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: colors.ink }}>{L("خدمات تأییدشده")}</h3>
        {services.length ? (
          <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.md }}>
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} onSelect={openBookingWizard} />
            ))}
          </div>
        ) : serviceFilterId > 0 ? (
          <EmptyState
            icon={<Icon name="filter" size={30} />}
            title={L("این خدمت فعال نیست")}
            description={L("خدمت انتخاب‌شده از بخش خدمات رایگان در حال حاضر فعال نیست؛ فیلتر را بردارید.")}
          />
        ) : (
          <EmptyState
            icon={<Icon name="book" size={30} />}
            title={L("خدمت قابل رزروی وجود ندارد")}
            description={L("این استاد فعلاً خدمت فعال و تأییدشده‌ای ندارد.")}
          />
        )}
      </section>

      <section>
        <SectionHeader
          title={L("نظر قرآن‌آموزان")}
          description={teacher.reviews > 0 ? L("{n} از ۵ · {m} نظر").replace("{n}", ratingLabel).replace("{m}", formatWalletAmount(teacher.reviews)) : L("نظرهای ثبت‌شده پس از جلسات")}
        />
        {reviews.length ? (
          <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.md }}>
            {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
          </div>
        ) : (
          <EmptyState
            icon={<Icon name="message" size={30} />}
            title={L("هنوز نظری ثبت نشده")}
            description={L("پس از برگزاری جلسه، نظرهای واقعی قرآن‌آموزان اینجا نمایش داده می‌شود.")}
          />
        )}
      </section>

      <div
        style={{
          position: "sticky",
          zIndex: 12,
          bottom: "calc(68px + env(safe-area-inset-bottom))",
          padding: "8px 0 12px",
          background: colors.sand50,
        }}
      >
        {teacher.instantEnabled ? (
          <Button
            fullWidth
            variant="secondary"
            disabled={services.length === 0}
            onClick={openInstantWizard}
            style={{ marginBottom: 8, borderColor: colors.goldSoft, color: colors.goldInk, background: colors.goldBackground }}
          >
            <Icon name="sparkle" size={18} style={{ color: colors.goldDark }} />
            {L("درخواست جلسهٔ فوری — همین حالا")}
          </Button>
        ) : null}
        <Button
          fullWidth
          disabled={services.length === 0}
          onClick={() => {
            setWizardService(services[0] ?? null);
            setWizardDefaultInstant(false);
            setWizardOpen(true);
          }}
        >
          <Icon name="calendar" size={18} />
          {services.length === 0 ? L("خدمت قابل رزرو وجود ندارد") : L("رزرو جلسه")}
        </Button>
      </div>

      {/* ویزارد رزرو — از کارت‌های خدمت یا دکمه‌های پایین صفحه باز می‌شود */}
      <BookingWizardSheet
        open={wizardOpen}
        teacher={teacher}
        initialService={wizardService}
        defaultInstant={wizardDefaultInstant}
        onClose={() => setWizardOpen(false)}
        onBooked={handleWizardBooked}
      />

      {/* ویزارد رزرو حضوری — خدمات حضوری کادر مخصوص خودشان را دارند */}
      <InPersonWizardSheet
        open={inPersonOpen}
        teacher={teacher}
        initialService={inPersonService}
        onClose={() => setInPersonOpen(false)}
        onBooked={handleInPersonBooked}
      />
    </section>
  );
}
