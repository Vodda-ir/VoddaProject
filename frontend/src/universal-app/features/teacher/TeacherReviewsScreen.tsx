"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { asArray, asNumber, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import { useAppearance } from "../../ui/appearance";
import { formatAppDateTime } from "../../ui/jalali";
import { localizedDigits } from "../../ui/persian";
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

function formatDate(value: string, lang: "fa" | "en"): string {
  if (!value) return "";
  return formatAppDateTime(value, lang, { withTime: false });
}

export function TeacherReviewsScreen() {
  const runtime = usePlatform();
  const { L, lang } = useAppearance();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await runtime.request<ApiEnvelope<unknown>>("/teacher/reviews");
      setReviews(asArray(response.data).map(parseReview).filter((item): item is Review => item !== null));
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

  if (loading) return <LoadingState label={L("در حال دریافت نظرها…")} />;
  if (error) {
    return (
      <ErrorState
        title={L("دریافت نظرها ناموفق بود")}
        description={L(error)}
        action={<Button onClick={() => void load()}>{L("تلاش دوباره")}</Button>}
      />
    );
  }

  if (!reviews.length) {
    return (
      <EmptyState
        icon={<Icon name="message" size={30} />}
        title={L("هنوز نظری ثبت نشده")}
        description={L("پس از تکمیل جلسه، نظرهای ثبت‌شده قرآن‌آموزان در این صفحه نمایش داده می‌شود.")}
      />
    );
  }

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: spacing.sm }}>
        <MetricTile icon="star" tone="gold" label={L("میانگین امتیاز")} value={localizedDigits(average.toFixed(1), lang) + " ★"} />
        <MetricTile icon="message" tone="info" label={L("تعداد نظرها")} value={localizedDigits(reviews.length, lang)} />
      </div>

      <div style={{ display: "grid", gap: spacing.sm }}>
        {reviews.map((review) => (
          <Card key={review.id} className="vodda-card--interactive vodda-enter" style={{ display: "grid", gap: spacing.md, padding: spacing.lg }}>
            <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
              <Avatar name={review.learnerName} src={review.learnerAvatar} size={46} ring />
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ ...typography.body, display: "block" }}>{review.learnerName}</strong>
                {review.createdAt ? (
                  <span style={{ ...typography.caption, color: colors.inkMuted }}>{formatDate(review.createdAt, lang)}</span>
                ) : null}
              </div>
              <span aria-label={L("امتیاز {n} از ۵").replace("{n}", localizedDigits(review.rating, lang))} style={{ display: "inline-flex", alignItems: "center", gap: 3, ...typography.body, color: colors.goldDark, fontWeight: 900 }}><Icon name="star" size={15} fill style={{ color: colors.gold }} />{localizedDigits(review.rating, lang)}</span>
            </div>
            {review.text.trim() ? (
              <p style={{ ...typography.body, margin: 0, color: colors.inkSecondary, whiteSpace: "pre-wrap" }}>{review.text}</p>
            ) : (
              <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>{L("بدون متن")}</p>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
