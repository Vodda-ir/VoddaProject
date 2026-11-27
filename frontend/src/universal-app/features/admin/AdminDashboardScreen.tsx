"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { Icon, colors, gradients, shadows, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { useMinWidth } from "../../ui/useMediaQuery";
import { messageOf } from "../../ui/errorMessage";
import { formatNumber } from "@/lib/datetime";
import { fetchAdminDashboard, type AdminDashboard } from "./api";
import {
  AdminAuditSection,
} from "./sections/AdminAuditSection";
import { AdminBlogSection } from "./sections/AdminBlogSection";
import { AdminChallengesSection } from "./sections/AdminChallengesSection";
import { AdminFinanceSection } from "./sections/AdminFinanceSection";
import { AdminOverviewSection } from "./sections/AdminOverviewSection";
import { AdminReviewsSection } from "./sections/AdminReviewsSection";
import { AdminServicesSection } from "./sections/AdminServicesSection";
import { AdminSessionsSection } from "./sections/AdminSessionsSection";
import { AdminSettingsSection } from "./sections/AdminSettingsSection";
import { AdminSupportSection } from "./sections/AdminSupportSection";
import { AdminTeachersSection } from "./sections/AdminTeachersSection";
import { AdminUsersSection } from "./sections/AdminUsersSection";
import { AdminWithdrawalsSection } from "./sections/AdminWithdrawalsSection";
import { AdminTileIcon } from "./AdminUI";

function faNumber(value: number, maximumFractionDigits = 0) {
  return formatNumber(value, "fa", { maximumFractionDigits });
}

type AdminSectionKey =
  | "hub"
  | "overview"
  | "teachers"
  | "users"
  | "sessions"
  | "reviews"
  | "services"
  | "challenges"
  | "withdrawals"
  | "support"
  | "finance"
  | "blog"
  | "audit"
  | "settings";

const SECTIONS: Array<{ key: AdminSectionKey; label: string; description: string; icon: AdminTileIcon }> = [
  { key: "overview", label: "داشبورد تحلیلی", description: "نمای کلی، نمودار و صف بررسی", icon: "grid" },
  { key: "teachers", label: "اساتید", description: "بررسی، نشان‌ها و درجه‌ها", icon: "award" },
  { key: "users", label: "کاربران", description: "دسترسی، نقش، کیف پول و اعلان", icon: "users" },
  { key: "sessions", label: "جلسات", description: "نظارت بر چرخهٔ جلسه", icon: "calendar" },
  { key: "reviews", label: "نظرات", description: "نظارت بر کیفیت و حذف نظر", icon: "star" },
  { key: "services", label: "خدمات", description: "صف تأیید و انتشار", icon: "book" },
  { key: "challenges", label: "چالش‌ها", description: "ایجاد و داوری رقابت‌های قرآنی", icon: "sparkle" },
  { key: "withdrawals", label: "برداشت‌ها", description: "ثبت پرداخت و بازگشت وجه", icon: "download" },
  { key: "support", label: "پشتیبانی", description: "تیکت‌ها و گفت‌وگوی زنده", icon: "message" },
  { key: "finance", label: "گزارش مالی", description: "شارژ، کارمزد و تعهد کیف پول", icon: "coins" },
  { key: "blog", label: "بلاگ", description: "نوشتن و انتشار مقاله", icon: "doc" },
  { key: "audit", label: "گزارش عملیات", description: "رخدادهای حساس مدیریتی", icon: "shield" },
  { key: "settings", label: "تنظیمات", description: "استوری‌ها، اعلان و ورود گوگل", icon: "settings" },
];

function StatCard({ icon, label, value }: { icon: AdminTileIcon; label: string; value: number }) {
  return (
    <span
      className="vodda-card"
      style={{
        display: "grid",
        justifyItems: "center",
        gap: 6,
        padding: "13px 8px",
        borderRadius: 16,
        background: colors.surface,
        border: `1px solid ${colors.sand150}`,
        boxShadow: shadows.xs,
        minWidth: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          background: gradients.soft,
          border: `1px solid ${colors.olive100}`,
          color: colors.olive700,
        }}
      >
        <Icon name={icon} size={17} />
      </span>
      <strong style={{ fontSize: 16, fontWeight: 900, color: colors.ink, lineHeight: 1.2 }}>{faNumber(value)}</strong>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: colors.inkMuted, textAlign: "center", lineHeight: 1.4 }}>{label}</span>
    </span>
  );
}

/* ═══ مدیریت سامانهٔ وُدّا — درون‌اپی، هم‌ارز کامل پنل وب ═══
 * ۱۲ بخش کامل با همان APIهای ادمین از مسیر BFF؛ بک‌اند فقط نقش ادمین را
 * می‌پذیرد (fail-closed). جایگزین پرش به پنل وب — همه‌چیز داخل وُدّا. */
export function AdminDashboardScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { L } = useAppearance();
  const wide = useMinWidth(768);

  const [section, setSection] = useState<AdminSectionKey>("hub");

  /* آمار سریع هاب */
  const [dash, setDash] = useState<AdminDashboard | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);

  const loadDash = useCallback(async () => {
    setDashLoading(true);
    setDashError(null);
    try {
      setDash(await fetchAdminDashboard(runtime));
    } catch (cause) {
      setDash(null);
      setDashError(messageOf(cause, L("دریافت آمار مدیریتی ناموفق بود")));
    } finally {
      setDashLoading(false);
    }
  }, [runtime, L]);

  useEffect(() => {
    void loadDash();
  }, [loadDash]);

  /* بازگشت به بالای صفحه هنگام تعویض بخش */
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, [section]);

  const activeSection = SECTIONS.find((item) => item.key === section);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: wide ? 20 : 16, minWidth: 0 }}>
      {section === "hub" ? (
        <>
          <header style={{ display: "grid", gap: 4 }}>
            <strong style={{ fontSize: wide ? 21 : 19, fontWeight: 900, color: colors.ink }}>{L("مدیریت سامانه")}</strong>
            <span style={{ ...typography.caption, color: colors.inkMuted }}>
              {L("همهٔ ابزارهای پنل مدیریت — درون اپ، بدون خروج از وُدّا")}
            </span>
          </header>

          {/* آمار سریع */}
          {dashLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
              {Array.from({ length: 4 }).map((_, index) => (
                <span key={index} className="vodda-skeleton" style={{ height: 92, borderRadius: 16, display: "block" }} />
              ))}
            </div>
          ) : dashError ? (
            <span
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 13px",
                borderRadius: 13,
                background: colors.dangerBackground,
                border: "1px solid rgba(166,81,81,.3)",
                color: colors.danger,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <Icon name="shield" size={15} />
              {dashError}
            </span>
          ) : dash ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, minWidth: 0 }}>
              <StatCard icon="user" label={L("قرآن‌آموزان")} value={dash.learners} />
              <StatCard icon="award" label={L("اساتید")} value={dash.teachers} />
              <StatCard icon="clock" label={L("در انتظار تأیید")} value={dash.pendingTeachers} />
              <StatCard icon="calendar" label={L("جلسات")} value={dash.sessions} />
              <StatCard icon="checkCircle" label={L("جلسات انجام‌شده")} value={dash.doneSessions} />
              <StatCard icon="coins" label={L("حجم شارژ")} value={dash.chargeVolume} />
              <StatCard icon="trending" label={L("کمیسیون")} value={dash.commission} />
            </div>
          ) : null}

          {/* شبکهٔ بخش‌ها */}
          <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))", gap: 10, minWidth: 0 }}>
            {SECTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSection(item.key)}
                aria-label={L(item.label)}
                className="vodda-tappable"
                style={{
                  display: "grid",
                  gap: 8,
                  justifyItems: "start",
                  padding: 14,
                  borderRadius: 16,
                  border: `1px solid ${colors.sand150}`,
                  background: colors.surface,
                  boxShadow: shadows.xs,
                  cursor: "pointer",
                  textAlign: "start",
                  minWidth: 0,
                  fontFamily: typography.fontFamily,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 38,
                    height: 38,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 12,
                    background: gradients.soft,
                    border: `1px solid ${colors.olive100}`,
                    color: colors.olive700,
                  }}
                >
                  <Icon name={item.icon} size={19} />
                </span>
                <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                  <strong style={{ fontSize: 13, fontWeight: 800, color: colors.ink }}>{L(item.label)}</strong>
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: colors.inkMuted, lineHeight: 1.6 }}>{L(item.description)}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <header style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <button
              type="button"
              onClick={() => setSection("hub")}
              aria-label={L("بازگشت به مدیریت سامانه")}
              className="vodda-tappable"
              style={{
                flexShrink: 0,
                width: 38,
                height: 38,
                display: "grid",
                placeItems: "center",
                borderRadius: 12,
                border: `1px solid ${colors.sand200}`,
                background: colors.surface,
                color: colors.olive700,
                cursor: "pointer",
              }}
            >
              <Icon name="arrowL" size={17} />
            </button>
            <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
              <strong style={{ fontSize: wide ? 19 : 17, fontWeight: 900, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeSection ? L(activeSection.label) : ""}
              </strong>
              <span style={{ ...typography.caption, color: colors.inkMuted }}>
                {activeSection ? L(activeSection.description) : ""}
              </span>
            </div>
          </header>

          {section === "overview" ? <AdminOverviewSection /> : null}
          {section === "teachers" ? <AdminTeachersSection /> : null}
          {section === "users" ? <AdminUsersSection /> : null}
          {section === "sessions" ? <AdminSessionsSection /> : null}
          {section === "reviews" ? <AdminReviewsSection /> : null}
          {section === "services" ? <AdminServicesSection /> : null}
          {section === "challenges" ? <AdminChallengesSection config={config} /> : null}
          {section === "withdrawals" ? <AdminWithdrawalsSection /> : null}
          {section === "support" ? <AdminSupportSection /> : null}
          {section === "finance" ? <AdminFinanceSection /> : null}
          {section === "blog" ? <AdminBlogSection /> : null}
          {section === "audit" ? <AdminAuditSection /> : null}
          {section === "settings" ? <AdminSettingsSection /> : null}
        </>
      )}
    </div>
  );
}

/* سازگاری نوع قدیمی — برخی نماهای قدیمی CSSProperties را از این ماژول می‌گیرند */
export type AdminCSSProperties = CSSProperties;
