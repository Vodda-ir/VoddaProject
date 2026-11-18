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
import { avatarSrc, uploadsOriginOf } from "@/lib/avatarImage";
import { formatDate, formatNumber } from "@/lib/datetime";
import { TierBadge } from "./TierBadge";
import { messageOf } from "../../ui/errorMessage";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";
import { getTeacherDetail } from "./api";
import type { TeacherDetail, TeacherReview, TeacherService } from "./types";

function reviewDate(value: string) {
  if (!value) return "";
  return formatDate(value);
}

/* ═══ «دربارهٔ استاد» — بازچینش ساختاریافته (هم‌الگو با نسخهٔ وب) ═══ */
type BioBlock =
  | { kind: "para"; emoji: string; text: string }
  | { kind: "chips"; title: string; items: string[] }
  | { kind: "meta"; items: string[] };

function parseTeacherBio(bio?: string): BioBlock[] {
  if (!bio) return [];
  const blocks: BioBlock[] = [];
  for (const rawBlock of bio.trim().split(/\n\s*\n/)) {
    const lines = rawBlock.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    const first = lines[0];
    if (first.startsWith("🎯")) {
      const title = first.replace(/^🎯\s*/, "").replace(/:\s*$/, "") || "زمینه‌های تدریس";
      const items = lines.slice(1).map((line) => line.replace(/^[•\-*]\s*/, "").trim()).filter(Boolean);
      blocks.push({ kind: "chips", title, items });
      continue;
    }
    if (first.startsWith("📍")) {
      const merged = lines.map((line) => line.replace(/^📍\s*/, "")).join(" ");
      blocks.push({ kind: "meta", items: merged.split("|").map((part) => part.trim()).filter(Boolean) });
      continue;
    }
    const emojiMatch = first.match(/^(\p{Extended_Pictographic})/u);
    const emoji = emojiMatch?.[1] ?? "";
    const text = emoji ? first.slice(emoji.length).trim() : first;
    blocks.push({ kind: "para", emoji, text: [text, ...lines.slice(1)].filter(Boolean).join(" ") });
  }
  return blocks;
}

function TeacherBioBlocks({ bio }: { bio?: string }) {
  const blocks = parseTeacherBio(bio);
  if (!blocks.length) {
    return <p style={{ fontSize: 14, lineHeight: 1.9, margin: "8px 0 0", color: colors.inkSecondary }}>اطلاعاتی ثبت نشده است.</p>;
  }
  return (
    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
      {blocks.map((block, index) => {
        if (block.kind === "para") {
          return (
            <p key={index} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13.5, lineHeight: 2, margin: 0, color: colors.inkSecondary }}>
              {block.emoji ? (
                <span
                  aria-hidden="true"
                  style={{ display: "grid", placeItems: "center", flex: "0 0 32px", width: 32, height: 32, marginTop: 3, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.sand50, fontSize: 14 }}
                >
                  {block.emoji}
                </span>
              ) : null}
              <span>{block.text}</span>
            </p>
          );
        }
        if (block.kind === "chips") {
          return (
            <div key={index} style={{ padding: "12px 13px", borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.sand50 }}>
              <strong style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: colors.olive700 }}>
                <Icon name="sparkle" size={13} /> {block.title}
              </strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
                {block.items.map((item) => (
                  <span key={item} style={{ display: "inline-flex", padding: "5px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: colors.olive700, background: colors.olive50, border: `1px solid ${colors.olive200}` }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div key={index} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {block.items.map((item) => (
              <span key={item} style={{ display: "inline-flex", padding: "5px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: "#8b681f", background: colors.goldBackground, border: "1px solid rgba(191,149,64,.35)" }}>
                {item}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
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
  /* ۱.ب.۴ — فیلتر خدمت از لینک کارت رایگان (?service=<id>) — فقط همان خدمت با امکان برداشتن فیلتر */
  const [serviceFilterId, setServiceFilterId] = useState(0);

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
  const activeServices = teacher.services.filter((service) => service.active);
  const services = serviceFilterId > 0
    ? activeServices.filter((service) => service.id === serviceFilterId)
    : activeServices;
  const ratingLabel = teacher.reviews > 0
    ? formatNumber(teacher.rating, "fa", { maximumFractionDigits: 1 })
    : "—";

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <div className="vodda-enter" style={{ display: "grid", justifyItems: "center", textAlign: "center", gap: 4 }}>
        <div style={{ position: "relative" }}>
          {/* آواتار مربعی واحد — مهر درجه و چراغ حضور داخل خود کامپوننت رندر می‌شود */}
          <Avatar
            name={teacher.name}
            src={avatarSrc(teacher.avatarUrl || undefined, undefined, uploadsOriginOf(runtime.apiBaseUrl))}
            size={88}
            ring
            tier={teacher.tier || undefined}
            online={teacher.available}
            lastSeen={teacher.lastSeen}
          />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "8px 0 0", color: colors.ink, display: "inline-flex", alignItems: "center", gap: 6 }}>
          {teacher.name}
          <TierBadge tier={teacher.tier} size={16} />
        </h2>
        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: colors.olive600 }}>
          {teacher.tag || teacher.field || "استاد وُدّا"}
        </p>
      </div>

      <div className="vodda-enter vodda-enter-delay-1" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {([
          ["star" as const, ratingLabel, "امتیاز"],
          ["message" as const, formatWalletAmount(teacher.reviews), "نظر"],
          ["calendar" as const, formatWalletAmount(teacher.sessions), "جلسه"],
        ] as const).map(([icon, value, label]) => (
          <div key={label} style={{ minWidth: 0, padding: "14px 8px", textAlign: "center", borderRadius: 18, background: colors.surface }}>
            <Icon name={icon} size={22} style={{ color: colors.olive500 }} />
            <strong style={{ display: "block", marginTop: 6, fontSize: 18, fontWeight: 800, color: colors.ink }}>{value}</strong>
            <span style={{ fontSize: 12, color: colors.inkMuted }}>{label}</span>
          </div>
        ))}
      </div>

      <section>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: colors.ink }}>دربارهٔ استاد</h3>
        <TeacherBioBlocks bio={teacher.bio} />
      </section>

      <section>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: colors.ink }}>خدمات تأییدشده</h3>
        {serviceFilterId > 0 ? (
          <button
            type="button"
            onClick={() => setServiceFilterId(0)}
            className="vodda-tappable"
            aria-label="نمایش همهٔ خدمات"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: spacing.sm,
              padding: "6px 12px",
              border: `1px solid ${colors.olive200 ?? colors.olive100}`,
              borderRadius: 999,
              background: colors.olive50,
              color: colors.olive700,
              fontFamily: typography.fontFamily,
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <Icon name="filter" size={13} stroke={2} />
            فقط خدمت انتخاب‌شده از بخش خدمات رایگان — نمایش همهٔ خدمات
            <Icon name="x" size={12} stroke={2.2} />
          </button>
        ) : null}
        {services.length ? (
          <div style={{ display: "grid", gap: spacing.sm, marginTop: spacing.md }}>
            {services.map((service) => <ServiceCard key={service.id} service={service} />)}
          </div>
        ) : serviceFilterId > 0 ? (
          <EmptyState
            icon={<Icon name="filter" size={30} />}
            title="این خدمت فعال نیست"
            description="خدمت انتخاب‌شده از بخش خدمات رایگان در حال حاضر فعال نیست؛ فیلتر را بردارید."
          />
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
