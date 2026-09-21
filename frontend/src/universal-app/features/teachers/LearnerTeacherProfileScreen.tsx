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
  MetricTile,
  SectionHeader,
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";
import { getTeacherDetail } from "./api";
import type { TeacherDetail, TeacherReview, TeacherService } from "./types";

function reviewDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function ServiceCard({ service }: { service: TeacherService }) {
  return (
    <Card className="vodda-card--interactive" style={{ padding: spacing.lg }}>
      <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
        <IconBadge icon={service.icon.includes("mic") ? "mic" : "book"} tone={service.icon.includes("mic") ? "clay" : "olive"} size={44} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ ...typography.body, display: "block", color: colors.ink, fontWeight: 900 }}>{service.title}</strong>
          <span style={{ ...typography.caption, color: colors.inkMuted }}>
            {formatWalletAmount(service.duration)} دقیقه
          </span>
        </div>
        <strong style={{ ...typography.bodySmall, flexShrink: 0, color: colors.olive800, whiteSpace: "nowrap" }}>
          {formatWalletAmount(service.price)} تومان
        </strong>
      </div>
    </Card>
  );
}

function ReviewCard({ review }: { review: TeacherReview }) {
  const rating = Math.max(0, Math.min(5, Math.round(review.rating)));
  return (
    <Card style={{ padding: spacing.lg }}>
      <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
        <Avatar name={review.learnerName} size={42} ring={false} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ ...typography.bodySmall, display: "block", color: colors.ink }}>{review.learnerName}</strong>
          {review.createdAt ? (
            <span style={{ ...typography.caption, display: "block", marginTop: 1, color: colors.inkFaint }}>
              {reviewDate(review.createdAt)}
            </span>
          ) : null}
        </div>
        <span aria-label={`امتیاز ${rating} از ۵`} style={{ display: "inline-flex", gap: 1, direction: "ltr", color: colors.gold }}>
          {Array.from({ length: 5 }, (_, index) => (
            <Icon key={index} name="star" size={14} fill={index < rating} stroke={1.7} />
          ))}
        </span>
      </div>
      {review.text ? (
        <p style={{ ...typography.bodySmall, margin: `${spacing.md}px 0 0`, color: colors.inkSecondary, lineHeight: 1.9 }}>
          {review.text}
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
  const parsedId = useMemo(() => Number(teacherId), [teacherId]);
  const [detail, setDetail] = useState<TeacherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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
        setError(messageOf(reason, "دریافت پروفایل استاد با خطا روبه‌رو شد."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [runtime, parsedId, reloadKey]);

  if (loading) return <LoadingState label="در حال دریافت پروفایل استاد…" />;
  if (error || !detail) {
    return (
      <ErrorState
        title="پروفایل استاد دریافت نشد"
        description={error || "اطلاعات این استاد در دسترس نیست."}
        action={<Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>تلاش دوباره</Button>}
      />
    );
  }

  const { teacher, reviews } = detail;
  const services = teacher.services.filter((service) => service.active);
  const ratingLabel = teacher.reviews > 0
    ? teacher.rating.toLocaleString("fa-IR", { maximumFractionDigits: 1 })
    : "—";

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <div
        className="vodda-enter"
        style={{
          position: "relative",
          overflow: "hidden",
          padding: `${spacing.xxl}px ${spacing.xl}px`,
          borderRadius: radii.xl,
          color: colors.surface,
          background: gradients.deep,
          boxShadow: shadows.olive,
          textAlign: "center",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 170,
            height: 170,
            top: -95,
            insetInlineEnd: -65,
            borderRadius: "50%",
            background: "rgba(255,255,255,.06)",
          }}
        />
        <div style={{ position: "relative", display: "grid", justifyItems: "center", gap: spacing.sm }}>
          <div style={{ position: "relative" }}>
            <Avatar name={teacher.name} size={92} ring />
            {teacher.verified ? (
              <span
                aria-label="استاد تأییدشده"
                title="استاد تأییدشده"
                style={{
                  position: "absolute",
                  insetInlineEnd: -2,
                  bottom: 2,
                  width: 27,
                  height: 27,
                  display: "grid",
                  placeItems: "center",
                  border: "3px solid " + colors.olive800,
                  borderRadius: "50%",
                  color: colors.surface,
                  background: colors.olive500,
                }}
              >
                <Icon name="check" size={14} stroke={2.4} />
              </span>
            ) : null}
          </div>
          <h2 style={{ ...typography.heading, margin: `${spacing.xs}px 0 0`, color: colors.surface }}>{teacher.name}</h2>
          <p style={{ ...typography.bodySmall, margin: 0, color: colors.goldSoft, fontWeight: 800 }}>
            {teacher.tag || teacher.field || "استاد وُدّا"}
          </p>
          {[teacher.field, teacher.level, teacher.city].filter(Boolean).length ? (
            <p style={{ ...typography.caption, margin: 0, color: "rgba(255,255,255,.66)" }}>
              {[teacher.field, teacher.level, teacher.city].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="vodda-enter vodda-enter-delay-1" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: spacing.sm }}>
        <MetricTile label="امتیاز" value={<span>{ratingLabel} <span style={{ color: colors.gold }}>★</span></span>} />
        <MetricTile label="نظر" value={formatWalletAmount(teacher.reviews)} />
        <MetricTile label="جلسه" value={formatWalletAmount(teacher.sessions)} />
      </div>

      <section>
        <SectionHeader title="درباره استاد" />
        <Card style={{ marginTop: spacing.md, background: colors.surfaceWarm }}>
          <p style={{ ...typography.body, margin: 0, color: colors.inkSecondary, lineHeight: 2 }}>
            {teacher.bio || "اطلاعاتی ثبت نشده است."}
          </p>
        </Card>
      </section>

      <section>
        <SectionHeader title="خدمات قابل رزرو" description={services.length ? `${services.length.toLocaleString("fa-IR")} خدمت فعال` : undefined} />
        {services.length ? (
          <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.md }}>
            {services.map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
        ) : (
          <EmptyState
            icon={<Icon name="book" size={30} />}
            title="خدمت قابل رزروی وجود ندارد"
            description="این استاد فعلاً خدمت فعال و تأییدشده‌ای ندارد."
          />
        )}
      </section>

      <section>
        <SectionHeader
          title="نظر قرآن‌آموزان"
          description={teacher.reviews > 0 ? `${ratingLabel} از ۵ · ${formatWalletAmount(teacher.reviews)} نظر` : "نظرهای ثبت‌شده پس از جلسات"}
        />
        {reviews.length ? (
          <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.md }}>
            {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
          </div>
        ) : (
          <EmptyState
            icon={<Icon name="message" size={30} />}
            title="هنوز نظری ثبت نشده"
            description="پس از برگزاری جلسه، نظرهای واقعی قرآن‌آموزان اینجا نمایش داده می‌شود."
          />
        )}
      </section>

      <div
        style={{
          position: "sticky",
          zIndex: 12,
          bottom: "calc(84px + env(safe-area-inset-bottom))",
          padding: 8,
          border: "1px solid rgba(228,221,204,.82)",
          borderRadius: radii.lg,
          background: "rgba(255,255,255,.92)",
          boxShadow: shadows.floating,
          backdropFilter: "blur(16px)",
        }}
      >
        <Button
          fullWidth
          disabled={services.length === 0}
          onClick={() => navigateApp(`/book/${teacher.id}`, config)}
        >
          <Icon name="calendar" size={18} />
          {services.length === 0 ? "خدمت قابل رزرو وجود ندارد" : "رزرو جلسه با این استاد"}
        </Button>
      </div>
    </section>
  );
}
