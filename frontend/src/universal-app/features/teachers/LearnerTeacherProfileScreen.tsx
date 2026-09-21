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
      <div className="vodda-enter" style={{ display: "grid", justifyItems: "center", textAlign: "center", gap: 4 }}>
        <div style={{ position: "relative" }}>
          <Avatar name={teacher.name} size={88} ring />
          {teacher.verified ? (
            <span
              aria-label="استاد تأییدشده"
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
                color: colors.surface,
                background: colors.olive600,
              }}
            >
              <Icon name="check" size={13} stroke={2.4} />
            </span>
          ) : null}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 0", color: colors.ink }}>{teacher.name}</h2>
        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: colors.olive600 }}>
          {teacher.tag || teacher.field || "استاد وُدّا"}
        </p>
      </div>

      <div className="vodda-enter vodda-enter-delay-1" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {[
          ["star" as const, ratingLabel, "امتیاز"],
          ["message" as const, formatWalletAmount(teacher.reviews), "نظر"],
          ["calendar" as const, formatWalletAmount(teacher.sessions), "جلسه"],
        ].map(([icon, value, label]) => (
          <div key={label} style={{ minWidth: 0, padding: "14px 8px", textAlign: "center", borderRadius: 18, background: colors.surface }}>
            <Icon name={icon} size={22} style={{ color: colors.olive500 }} />
            <strong style={{ display: "block", marginTop: 6, fontSize: 18, fontWeight: 800, color: colors.ink }}>{value}</strong>
            <span style={{ fontSize: 12, color: colors.inkMuted }}>{label}</span>
          </div>
        ))}
      </div>

      <section>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: colors.ink }}>دربارهٔ استاد</h3>
        <p style={{ fontSize: 14, lineHeight: 1.7, margin: "8px 0 0", color: colors.inkSecondary }}>
          {teacher.bio || "اطلاعاتی ثبت نشده است."}
        </p>
      </section>

      <section>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: colors.ink }}>خدمات تأییدشده</h3>
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
          bottom: "calc(68px + env(safe-area-inset-bottom))",
          padding: "8px 0 12px",
          background: colors.sand50,
        }}
      >
        <Button
          fullWidth
          disabled={services.length === 0}
          onClick={() => navigateApp(`/book/${teacher.id}`, config)}
        >
          <Icon name="calendar" size={18} />
          {services.length === 0 ? "خدمت قابل رزرو وجود ندارد" : "رزرو جلسه"}
        </Button>
      </div>
    </section>
  );
}
