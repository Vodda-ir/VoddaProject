"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { Card, EmptyState, Icon, colors, gradients, shadows, spacing, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { useMinWidth } from "../../ui/useMediaQuery";
import { messageOf } from "../../ui/errorMessage";
import { formatNumber } from "@/lib/datetime";
import {
  fetchAdminDashboard,
  fetchAdminTeachers,
  fetchAdminUsers,
  reviewAdminTeacher,
  setAdminUserActive,
  type AdminDashboard,
  type AdminTeacherRow,
  type AdminUserRow,
} from "./api";

function faNumber(value: number, maximumFractionDigits = 0) {
  return formatNumber(value, "fa", { maximumFractionDigits });
}

type AdminTab = "dashboard" | "teachers" | "users";

const TEACHER_STATUS_LABELS: Record<string, string> = {
  pending: "در انتظار تأیید",
  approved: "تأییدشده",
  rejected: "ردشده",
};

const TEACHER_STATUS_TONES: Record<string, { ink: string; bg: string; border: string }> = {
  pending: { ink: "#8a5b16", bg: "#fdf3dd", border: "rgba(191,149,64,.45)" },
  approved: { ink: "#2e8f5c", bg: "#e7f6ee", border: "rgba(58,167,109,.4)" },
  rejected: { ink: "#a65151", bg: "#faeeee", border: "rgba(166,81,81,.35)" },
};

function statusToneOf(status: string) {
  return TEACHER_STATUS_TONES[status] ?? TEACHER_STATUS_TONES.pending;
}

function StatCard({ icon, label, value }: { icon: "user" | "award" | "clock" | "calendar" | "checkCircle" | "coins" | "trending"; label: string; value: number }) {
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

/* ═══ E3 — داشبورد مدیریت سامانه — درون‌اپی ═══
 * جایگزین پرش به پنل وب؛ همان APIهای ادمین از مسیر BFF خوانده می‌شود و
 * بک‌اند فقط نقش ادمین را می‌پذیرد. سه زبانه: داشبورد، اساتید، کاربران. */
export function AdminDashboardScreen({ config: _config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { L } = useAppearance();
  const wide = useMinWidth(768);

  const [tab, setTab] = useState<AdminTab>("dashboard");

  /* داشبورد */
  const [dash, setDash] = useState<AdminDashboard | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState<string | null>(null);

  /* اساتید */
  const [teacherStatus, setTeacherStatus] = useState("pending");
  const [teacherRows, setTeacherRows] = useState<AdminTeacherRow[]>([]);
  const [teacherTotal, setTeacherTotal] = useState(0);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [busyTeacherId, setBusyTeacherId] = useState<number | null>(null);
  const [teacherNote, setTeacherNote] = useState<string | null>(null);

  /* کاربران */
  const [userRole, setUserRole] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [userRows, setUserRows] = useState<AdminUserRow[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setDashLoading(true);
    setDashError(null);
    fetchAdminDashboard(runtime)
      .then((payload) => {
        if (!active) return;
        setDash(payload);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setDash(null);
        setDashError(messageOf(cause, L("دریافت آمار مدیریتی ناموفق بود")));
      })
      .finally(() => {
        if (active) setDashLoading(false);
      });
    return () => {
      active = false;
    };
  }, [runtime]);

  useEffect(() => {
    if (tab !== "teachers") return;
    let active = true;
    setTeacherLoading(true);
    setTeacherError(null);
    fetchAdminTeachers(runtime, { status: teacherStatus, limit: 30 })
      .then((list) => {
        if (!active) return;
        setTeacherRows(list.rows);
        setTeacherTotal(list.total);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setTeacherRows([]);
        setTeacherError(messageOf(cause, L("دریافت فهرست اساتید ناموفق بود")));
      })
      .finally(() => {
        if (active) setTeacherLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, teacherStatus, runtime]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(userQuery.trim()), 350);
    return () => clearTimeout(timer);
  }, [userQuery]);

  useEffect(() => {
    if (tab !== "users") return;
    let active = true;
    setUserLoading(true);
    setUserError(null);
    fetchAdminUsers(runtime, { role: userRole || undefined, q: debouncedQuery || undefined, limit: 30 })
      .then((list) => {
        if (!active) return;
        setUserRows(list.rows);
        setUserTotal(list.total);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setUserRows([]);
        setUserError(messageOf(cause, L("دریافت فهرست کاربران ناموفق بود")));
      })
      .finally(() => {
        if (active) setUserLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, userRole, debouncedQuery, runtime]);

  async function handleReviewTeacher(id: number, approve: boolean) {
    setBusyTeacherId(id);
    setTeacherNote(null);
    try {
      await reviewAdminTeacher(runtime, id, approve);
      setTeacherRows((rows) => rows.filter((row) => row.id !== id));
      setTeacherTotal((total) => Math.max(0, total - 1));
      setTeacherNote(approve ? L("استاد تأیید شد") : L("استاد رد شد"));
      /* آمار داشبورد را بی‌صدا تازه‌سازی کن (شمار در انتظار تأیید تغییر می‌کند) */
      fetchAdminDashboard(runtime)
        .then((payload) => setDash(payload))
        .catch(() => undefined);
    } catch (cause: unknown) {
      setTeacherNote(messageOf(cause, L("ثبت تصمیم ناموفق بود")));
    } finally {
      setBusyTeacherId(null);
    }
  }

  async function handleToggleUser(row: AdminUserRow) {
    setBusyUserId(row.id);
    try {
      await setAdminUserActive(runtime, row.id, !row.active);
      setUserRows((rows) => rows.map((item) => (item.id === row.id ? { ...item, active: !item.active } : item)));
    } catch (cause: unknown) {
      setUserError(messageOf(cause, L("تغییر وضعیت حساب ناموفق بود")));
    } finally {
      setBusyUserId(null);
    }
  }

  function roleLabel(role: string) {
    if (role === "admin") return L("مدیر");
    if (role === "teacher") return L("استاد");
    return L("قرآن‌آموز");
  }

  const tabs: Array<{ key: AdminTab; label: string; icon: "grid" | "award" | "users" }> = [
    { key: "dashboard", label: L("داشبورد"), icon: "grid" },
    { key: "teachers", label: L("اساتید"), icon: "award" },
    { key: "users", label: L("کاربران"), icon: "users" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: wide ? 20 : 16, minWidth: 0 }}>
      <header style={{ display: "grid", gap: 4 }}>
        <strong style={{ fontSize: wide ? 21 : 19, fontWeight: 900, color: colors.ink }}>{L("مدیریت سامانه")}</strong>
        <span style={{ ...typography.caption, color: colors.inkMuted }}>
          {L("داشبورد، اساتید و کاربران — درون اپ، بدون خروج از وُدّا")}
        </span>
      </header>

      {/* زبانه‌ها */}
      <div
        role="tablist"
        aria-label={L("زبانه‌های مدیریت")}
        style={{
          display: "flex",
          gap: 6,
          padding: 5,
          borderRadius: 16,
          background: colors.surfaceSoft,
          border: `1px solid ${colors.sand150}`,
        }}
      >
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.key)}
              className="vodda-tappable"
              style={{
                flex: "1 1 0",
                minWidth: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "9px 8px",
                borderRadius: 12,
                border: active ? `1px solid ${colors.olive100}` : "1px solid transparent",
                background: active ? colors.surface : "transparent",
                color: active ? colors.olive700 : colors.inkMuted,
                fontSize: 12.5,
                fontWeight: 800,
                fontFamily: typography.fontFamily,
                cursor: "pointer",
                boxShadow: active ? shadows.xs : "none",
              }}
            >
              <Icon name={item.icon} size={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ── زبانهٔ داشبورد ── */}
      {tab === "dashboard" ? (
        dashLoading ? (
          <Card style={{ display: "grid", gap: 12 }}>
            <span className="vodda-skeleton" style={{ height: 90, borderRadius: 14, display: "block" }} />
            <span className="vodda-skeleton" style={{ height: 90, borderRadius: 14, display: "block" }} />
          </Card>
        ) : dashError ? (
          <Card elevated style={{ display: "grid", gap: spacing.md, textAlign: "center" }}>
            <Icon name="shield" size={34} style={{ color: colors.goldDark }} />
            <strong style={{ ...typography.title, color: colors.ink }}>{L("آمار مدیریتی در دسترس نیست")}</strong>
            <span style={{ ...typography.caption, color: colors.inkMuted }}>{dashError}</span>
          </Card>
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
        ) : null
      ) : null}

      {/* ── زبانهٔ اساتید ── */}
      {tab === "teachers" ? (
        <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["pending", "approved", "rejected"].map((status) => {
              const active = teacherStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setTeacherStatus(status)}
                  className="vodda-tappable"
                  style={{
                    padding: "7px 13px",
                    borderRadius: 999,
                    border: active ? `1.5px solid ${colors.olive600}` : `1px solid ${colors.sand200}`,
                    background: active ? colors.olive50 : colors.surface,
                    color: active ? colors.olive700 : colors.inkMuted,
                    fontSize: 11.5,
                    fontWeight: 800,
                    fontFamily: typography.fontFamily,
                    cursor: "pointer",
                  }}
                >
                  {L(TEACHER_STATUS_LABELS[status])}
                </button>
              );
            })}
          </div>

          {teacherNote ? (
            <span
              role="status"
              style={{
                padding: "9px 12px",
                borderRadius: 12,
                background: "#e7f6ee",
                border: "1px solid rgba(58,167,109,.35)",
                color: "#2e8f5c",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {teacherNote}
            </span>
          ) : null}

          {teacherLoading ? (
            <div style={{ display: "grid", gap: 10 }}>
              {Array.from({ length: 3 }).map((_, index) => (
                <span key={index} className="vodda-skeleton" style={{ height: 84, borderRadius: 16, display: "block" }} />
              ))}
            </div>
          ) : teacherError ? (
            <Card style={{ display: "grid", gap: 8, textAlign: "center" }}>
              <span style={{ ...typography.body, color: colors.inkSecondary }}>{teacherError}</span>
            </Card>
          ) : teacherRows.length === 0 ? (
            <EmptyState
              icon={<Icon name="award" size={30} />}
              title={L("فهرست خالی است")}
              description={L("استادی با این وضعیت ثبت نشده است.")}
            />
          ) : (
            <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
              <span style={{ ...typography.caption, color: colors.inkMuted }}>
                {faNumber(teacherTotal)} {L("استاد")}
              </span>
              {teacherRows.map((row) => {
                const tone = statusToneOf(row.status);
                const busy = busyTeacherId === row.id;
                return (
                  <Card key={row.id} style={{ display: "grid", gap: 10, padding: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: 42,
                          height: 42,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: "50%",
                          background: gradients.soft,
                          border: `1px solid ${colors.goldSoft}`,
                          color: colors.goldDark,
                          flex: "0 0 auto",
                        }}
                      >
                        <Icon name="award" size={20} />
                      </span>
                      <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
                        <strong style={{ fontSize: 13.5, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.name}
                          {row.tier ? ` · ${row.tier}` : ""}
                        </strong>
                        <span style={{ fontSize: 11, fontWeight: 600, color: colors.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {[row.field, row.city].filter(Boolean).join(" · ") || L("بدون مشخصات تدریس")}
                          {row.rating > 0 ? ` · ★ ${faNumber(row.rating, 1)}` : ""}
                        </span>
                      </div>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: tone.bg,
                          border: `1px solid ${tone.border}`,
                          color: tone.ink,
                          fontSize: 10,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                          flex: "0 0 auto",
                        }}
                      >
                        {L(TEACHER_STATUS_LABELS[row.status] ?? row.status)}
                      </span>
                    </div>
                    {row.status === "pending" ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleReviewTeacher(row.id, true)}
                          className="vodda-tappable"
                          style={{
                            flex: "1 1 130px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: 0,
                            background: "linear-gradient(145deg, #43b07f, #2e8f5c)",
                            color: "#ffffff",
                            fontSize: 12.5,
                            fontWeight: 800,
                            fontFamily: typography.fontFamily,
                            cursor: busy ? "wait" : "pointer",
                            opacity: busy ? 0.7 : 1,
                          }}
                        >
                          <Icon name="check" size={15} />
                          {L("تأیید استاد")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleReviewTeacher(row.id, false)}
                          className="vodda-tappable"
                          style={{
                            flex: "1 1 110px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: `1px solid ${colors.sand200}`,
                            background: colors.surface,
                            color: colors.danger,
                            fontSize: 12.5,
                            fontWeight: 800,
                            fontFamily: typography.fontFamily,
                            cursor: busy ? "wait" : "pointer",
                            opacity: busy ? 0.7 : 1,
                          }}
                        >
                          <Icon name="x" size={15} />
                          {L("رد")}
                        </button>
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* ── زبانهٔ کاربران ── */}
      {tab === "users" ? (
        <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flex: "1 1 200px",
                minWidth: 0,
                padding: "9px 12px",
                borderRadius: 13,
                border: `1px solid ${colors.sand200}`,
                background: colors.surface,
                color: colors.inkMuted,
              }}
            >
              <Icon name="search" size={15} />
              <input
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder={L("جستجوی نام یا موبایل")}
                aria-label={L("جستجوی نام یا موبایل کاربر")}
                style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 600, outline: "none" }}
              />
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { key: "", label: "همه" },
                { key: "learner", label: "قرآن‌آموز" },
                { key: "teacher", label: "استاد" },
                { key: "admin", label: "مدیر" },
              ].map((option) => {
                const active = userRole === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setUserRole(option.key)}
                    className="vodda-tappable"
                    style={{
                      padding: "7px 12px",
                      borderRadius: 999,
                      border: active ? `1.5px solid ${colors.olive600}` : `1px solid ${colors.sand200}`,
                      background: active ? colors.olive50 : colors.surface,
                      color: active ? colors.olive700 : colors.inkMuted,
                      fontSize: 11.5,
                      fontWeight: 800,
                      fontFamily: typography.fontFamily,
                      cursor: "pointer",
                    }}
                  >
                    {L(option.label)}
                  </button>
                );
              })}
            </div>
          </div>

          {userError ? (
            <span
              role="alert"
              style={{
                padding: "9px 12px",
                borderRadius: 12,
                background: colors.dangerBackground,
                border: `1px solid ${colors.sand200}`,
                color: colors.danger,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {userError}
            </span>
          ) : null}

          {userLoading ? (
            <div style={{ display: "grid", gap: 10 }}>
              {Array.from({ length: 4 }).map((_, index) => (
                <span key={index} className="vodda-skeleton" style={{ height: 66, borderRadius: 16, display: "block" }} />
              ))}
            </div>
          ) : userRows.length === 0 ? (
            <EmptyState
              icon={<Icon name="users" size={30} />}
              title={L("کاربری یافت نشد")}
              description={L("جستجو را تغییر دهید یا فیلتر نقش را بردارید.")}
            />
          ) : (
            <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
              <span style={{ ...typography.caption, color: colors.inkMuted }}>
                {faNumber(userTotal)} {L("کاربر")}
              </span>
              {userRows.map((row) => {
                const busy = busyUserId === row.id;
                return (
                  <Card key={row.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 14px" }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 38,
                        height: 38,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "50%",
                        background: gradients.soft,
                        border: `1px solid ${colors.olive100}`,
                        color: colors.olive700,
                        flex: "0 0 auto",
                      }}
                    >
                      <Icon name="user" size={18} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
                      <strong style={{ fontSize: 13, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.name}
                      </strong>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 600, color: colors.inkMuted }}>
                        <span dir="ltr" style={{ letterSpacing: 0.2 }}>{row.mobile || "—"}</span>
                        <span style={{ color: colors.sand200 }}>|</span>
                        {roleLabel(row.role)}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleToggleUser(row)}
                      aria-label={row.active ? L("غیرفعال‌کردن حساب") : L("فعال‌کردن حساب")}
                      className="vodda-tappable"
                      style={
                        {
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "7px 11px",
                          borderRadius: 999,
                          border: `1px solid ${row.active ? "rgba(58,167,109,.4)" : colors.sand200}`,
                          background: row.active ? "#e7f6ee" : colors.surfaceSoft,
                          color: row.active ? "#2e8f5c" : colors.inkMuted,
                          fontSize: 10.5,
                          fontWeight: 800,
                          fontFamily: typography.fontFamily,
                          cursor: busy ? "wait" : "pointer",
                          opacity: busy ? 0.7 : 1,
                          flex: "0 0 auto",
                        } as CSSProperties
                      }
                    >
                      <Icon name={row.active ? "checkCircle" : "x"} size={13} />
                      {row.active ? L("فعال") : L("غیرفعال")}
                    </button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
