"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { asArray, asNumber, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { formatDate } from "@/lib/datetime";
import { usePlatform } from "../../platform/context";
import { avatarSrc, uploadsOriginOf } from "@/lib/avatarImage";
import { messageOf } from "../../ui/errorMessage";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  MetricTile,
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
  const learnerName = asString(learner?.name).trim();
  const learnerAvatar = asString(learner?.avatar_url);
  return {
    id: asNumber(record.id),
    rating: Math.max(0, Math.min(5, asNumber(record.rating))),
    text: asString(record.text),
    createdAt: asString(record.created_at),
    learnerName: learnerName || "قرآن‌آموز",
    learnerAvatar: learnerAvatar || undefined,
  };
}

export function TeacherReviewsScreen() {
  const runtime = usePlatform();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // باگ refresh-loop: اجرای دوم StrictMode یا فراخوانی دیرهنگام نباید state را با دادهٔ کهنه بازنویسی کند.
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const isStale = () => loadGeneration.current !== generation;
    setLoading(true);
    setError(null);
    try {
      const response = await runtime.request<ApiEnvelope<unknown>>("/teacher/reviews");
      const rows = asArray(response.data).map(parseReview).filter((item): item is Review => item !== null);
      if (isStale()) return;
      setReviews(rows);
    } catch (loadError) {
      if (isStale()) return;
      setReviews([]);
      setError(messageOf(loadError));
    } finally {
      if (!isStale()) setLoading(false);
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
        icon={<Icon name="message" size={30} />}
        title="هنوز نظری ثبت نشده"
        description="پس از تکمیل جلسه، نظرهای ثبت‌شده قرآن‌آموزان در این صفحه نمایش داده می‌شود."
      />
    );
  }

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: spacing.sm }}>
        <MetricTile icon="star" tone="gold" label="میانگین امتیاز" value={toFaDigits(average.toFixed(1)) + " ★"} />
        <MetricTile icon="message" tone="info" label="تعداد نظرها" value={toFaDigits(reviews.length)} />
      </div>

      <div style={{ display: "grid", gap: spacing.sm }}>
        {reviews.map((review) => (
          <Card key={review.id} className="vodda-card--interactive vodda-enter" style={{ display: "grid", gap: spacing.md, padding: spacing.lg }}>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
              <Avatar name={review.learnerName} src={avatarSrc(review.learnerAvatar, undefined, uploadsOriginOf(runtime.apiBaseUrl))} size={46} ring />
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ ...typography.body, display: "block" }}>{review.learnerName}</strong>
                {review.createdAt ? (
                  <span style={{ ...typography.caption, color: colors.inkMuted }}>{formatDate(review.createdAt)}</span>
                ) : null}
              </div>
              <span aria-label={`امتیاز ${review.rating} از ۵`} style={{ display: "inline-flex", alignItems: "center", gap: 3, ...typography.body, color: colors.goldDark, fontWeight: 900 }}><Icon name="star" size={15} fill style={{ color: colors.gold }} />{toFaDigits(review.rating)}</span>
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
