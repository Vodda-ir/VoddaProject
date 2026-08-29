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
  LoadingState,
  colors,
  spacing,
  typography,
} from "../../ui";
import { getTeacherDetail } from "./api";
import type { TeacherDetail, TeacherReview, TeacherService } from "./types";

function faNumber(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

function toman(value: number) {
  return `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
}

function reviewDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: `${spacing.md}px ${spacing.sm}px`,
        borderRadius: 16,
        background: colors.olive50,
        textAlign: "center",
      }}
    >
      <strong style={{ ...typography.title, display: "block", color: colors.ink }}>{value}</strong>
      <span style={{ ...typography.caption, color: colors.inkMuted }}>{label}</span>
    </div>
  );
}

function ServiceCard({ service }: { service: TeacherService }) {
  return (
    <Card style={{ padding: spacing.md }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ ...typography.body, display: "block", color: colors.ink }}>{service.title}</strong>
          <span style={{ ...typography.caption, color: colors.inkMuted }}>{faNumber(service.duration)} دقیقه</span>
        </div>
        <strong style={{ ...typography.bodySmall, flexShrink: 0, color: colors.olive800 }}>{toman(service.price)}</strong>
      </div>
    </Card>
  );
}

function ReviewCard({ review }: { review: TeacherReview }) {
  const rating = Math.max(0, Math.min(5, Math.round(review.rating)));
  return (
    <Card style={{ padding: spacing.md }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md }}>
        <div>
          <strong style={{ ...typography.bodySmall, color: colors.ink }}>{review.learnerName}</strong>
          {review.createdAt ? (
            <div style={{ ...typography.caption, marginTop: 2, color: colors.inkMuted }}>{reviewDate(review.createdAt)}</div>
          ) : null}
        </div>
        <span aria-label={`امتیاز ${rating} از ۵`} style={{ ...typography.caption, direction: "ltr", color: colors.olive700 }}>
          {"★".repeat(rating)}{"☆".repeat(5 - rating)}
        </span>
      </div>
      {review.text ? (
        <p style={{ ...typography.bodySmall, margin: `${spacing.sm}px 0 0`, color: colors.inkSecondary, lineHeight: 1.9 }}>
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
        setError(reason instanceof Error ? reason.message : "دریافت پروفایل استاد با خطا روبه‌رو شد.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [runtime, parsedId, reloadKey]);

  if (loading) return <LoadingState label="در حال دریافت پروفایل استاد..." />;
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
  const ratingLabel = teacher.reviews > 0 ? teacher.rating.toLocaleString("fa-IR", { maximumFractionDigits: 1 }) : "—";

  return (
    <section style={{ display: "grid", gap: spacing.lg }}>
      <Card elevated style={{ textAlign: "center" }}>
        <div style={{ display: "grid", justifyItems: "center", gap: spacing.sm }}>
          <div style={{ position: "relative" }}>
            <Avatar name={teacher.name} size={88} />
            {teacher.verified ? (
              <span
                aria-label="استاد تأییدشده"
                title="استاد تأییدشده"
                style={{
                  position: "absolute",
                  left: -2,
                  bottom: 2,
                  display: "grid",
                  placeItems: "center",
                  width: 24,
                  height: 24,
                  border: `2px solid ${colors.surface}`,
                  borderRadius: "50%",
                  background: colors.olive700,
                  color: colors.surface,
                  fontSize: 14,
                  fontWeight: 900,
                }}
              >
                ✓
              </span>
            ) : null}
          </div>
          <h2 style={{ ...typography.heading, margin: 0, color: colors.ink }}>{teacher.name}</h2>
          <p style={{ ...typography.bodySmall, margin: 0, color: colors.olive700 }}>
            {teacher.tag || teacher.field || "استاد وُدّا"}
          </p>
          {[teacher.field, teacher.level, teacher.city].filter(Boolean).length ? (
            <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>
              {[teacher.field, teacher.level, teacher.city].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: spacing.sm, marginTop: spacing.lg }}>
          <Stat value={ratingLabel} label="امتیاز" />
          <Stat value={faNumber(teacher.reviews)} label="نظر" />
          <Stat value={faNumber(teacher.sessions)} label="جلسه" />
        </div>
      </Card>

      <div>
        <h3 style={{ ...typography.title, margin: `0 0 ${spacing.sm}px`, color: colors.ink }}>درباره استاد</h3>
        <Card>
          <p style={{ ...typography.body, margin: 0, color: colors.inkSecondary, lineHeight: 2 }}>
            {teacher.bio || "اطلاعاتی ثبت نشده است."}
          </p>
        </Card>
      </div>

      <div>
        <h3 style={{ ...typography.title, margin: `0 0 ${spacing.sm}px`, color: colors.ink }}>خدمات تأییدشده</h3>
        {services.length ? (
          <div style={{ display: "grid", gap: spacing.sm }}>
            {services.map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
        ) : (
          <EmptyState title="خدمت قابل رزروی وجود ندارد" description="این استاد فعلاً خدمت فعال و تأییدشده‌ای ندارد." />
        )}
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.sm }}>
          <h3 style={{ ...typography.title, margin: 0, color: colors.ink }}>نظر قرآن‌آموزان</h3>
          {teacher.reviews > 0 ? (
            <span style={{ ...typography.caption, color: colors.inkMuted }}>
              {ratingLabel} از ۵ · {faNumber(teacher.reviews)} نظر
            </span>
          ) : null}
        </div>
        {reviews.length ? (
          <div style={{ display: "grid", gap: spacing.sm }}>
            {reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
          </div>
        ) : (
          <EmptyState title="هنوز نظری ثبت نشده" description="پس از برگزاری جلسه، نظرهای واقعی قرآن‌آموزان اینجا نمایش داده می‌شود." />
        )}
      </div>

      <div
        style={{
          position: "sticky",
          zIndex: 10,
          bottom: "calc(72px + env(safe-area-inset-bottom))",
          padding: spacing.sm,
          border: `1px solid ${colors.sand200}`,
          borderRadius: 16,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Button
          fullWidth
          disabled={services.length === 0}
          onClick={() => navigateApp(`/book/${teacher.id}`, config)}
        >
          {services.length === 0 ? "خدمت قابل رزرو وجود ندارد" : "رزرو جلسه"}
        </Button>
      </div>
    </section>
  );
}
