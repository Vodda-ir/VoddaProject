"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { asNumber, asRecord, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import { messageOf } from "../../ui/errorMessage";
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
import { toFaDigits } from "../wallet/WalletTransactionCard";

type Review = {
  id: number;
  rating: number;
  text: string;
  createdAt: string;
  learnerName: string;
  learnerAvatar?: string;
};

function parseReview(value: unknown): Review | null {
  const record = asRecord(value);
  if (!record) return null;
  const learner = asRecord(record.learner);
  return {
    id: asNumber(record.id),
    rating: Math.max(0, Math.min(5, asNumber(record.rating))),
    text: typeof record.text === "string" ? record.text : "",
    createdAt: typeof record.created_at === "string" ? record.created_at : "",
    learnerName:
      typeof learner?.name === "string" && learner.name.trim() ? learner.name : "قرآن‌آموز",
    learnerAvatar: typeof learner?.avatar_url === "string" ? learner.avatar_url : undefined,
  };
}

function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export function TeacherReviewsScreen() {
  const runtime = usePlatform();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await runtime.request<ApiEnvelope<unknown[]>>("/teacher/reviews");
      setReviews((response.data ?? []).map(parseReview).filter((item): item is Review => item !== null));
    } catch (loadError) {
      setReviews([]);
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
  }, [load]);

  const average = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  }, [reviews]);

  if (loading) return <LoadingState label="در حال دریافت نظرها…" />;
  if (error) {
    return (
      <ErrorState
        title="دریافت نظرها ناموفق بود"
        description={error}
        action={<Button onClick={() => void load()}>تلاش دوباره</Button>}
      />
    );
  }

  if (!reviews.length) {
    return (
      <EmptyState
        title="هنوز نظری ثبت نشده"
        description="پس از تکمیل جلسه، نظرهای ثبت‌شده قرآن‌آموزان در این صفحه نمایش داده می‌شود."
      />
    );
  }

  return (
    <section style={{ display: "grid", gap: spacing.lg }}>
      <Card elevated style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
        <div>
          <span style={{ ...typography.caption, color: colors.inkMuted }}>میانگین همین نظرهای ثبت‌شده</span>
          <strong style={{ ...typography.heading, display: "block", marginTop: 2 }}>{toFaDigits(average.toFixed(1))} ★</strong>
        </div>
        <div style={{ textAlign: "left" }}>
          <span style={{ ...typography.caption, color: colors.inkMuted }}>تعداد نظرها</span>
          <strong style={{ ...typography.title, display: "block", marginTop: 2 }}>{toFaDigits(reviews.length)}</strong>
        </div>
      </Card>

      <div style={{ display: "grid", gap: spacing.sm }}>
        {reviews.map((review) => (
          <Card key={review.id} style={{ display: "grid", gap: spacing.md }}>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
              <Avatar name={review.learnerName} src={review.learnerAvatar} size={42} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ ...typography.body, display: "block" }}>{review.learnerName}</strong>
                {review.createdAt ? (
                  <span style={{ ...typography.caption, color: colors.inkMuted }}>{formatDate(review.createdAt)}</span>
                ) : null}
              </div>
              <span aria-label={`امتیاز ${review.rating} از ۵`} style={{ ...typography.body, color: colors.gold, fontWeight: 800 }}>
                {toFaDigits(review.rating)} ★
              </span>
            </div>
            {review.text.trim() ? (
              <p style={{ ...typography.body, margin: 0, color: colors.inkSecondary, whiteSpace: "pre-wrap" }}>{review.text}</p>
            ) : (
              <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>بدون متن</p>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
