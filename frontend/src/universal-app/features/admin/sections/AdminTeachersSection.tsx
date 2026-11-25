"use client";

/* مدیریت اساتید — هم‌ارز کامل صفحهٔ ادمین/اساتید پنل وب:
 * فیلتر وضعیت با شمارنده، جست‌وجو، شهر و حوزه، تأیید/رد، مدیریت نشان‌ها
 * (تأیید حساب، درجهٔ رنگی، کارت درجه ۱) و صفحه‌بندی. */

import { useCallback, useEffect, useState } from "react";
import { confirmDialog } from "@/lib/confirm";
import { usePlatform } from "../../../platform/context";
import { Icon, Sheet, colors, gradients, typography } from "../../../ui";
import { useAppearance } from "../../../ui/appearance";
import { messageOf } from "../../../ui/errorMessage";
import {
  fetchAdminTeachers,
  reviewAdminTeacher,
  setAdminTeacherTier1,
  updateAdminTeacherSettings,
  type AdminTeacherRow,
} from "../api";
import {
  AdminBadge,
  AdminChip,
  AdminEmpty,
  AdminError,
  AdminKeyValue,
  AdminLoadMore,
  AdminPanel,
  AdminToggle,
  faDate,
  faNumber,
  faToman,
} from "../AdminUI";

const PAGE_SIZE = 30;

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "همه" },
  { value: "pending", label: "در انتظار" },
  { value: "approved", label: "تأییدشده" },
  { value: "rejected", label: "ردشده" },
];

const STATUS_BADGE: Record<string, { label: string; tone: "gold" | "green" | "rose" }> = {
  pending: { label: "در انتظار بررسی", tone: "gold" },
  approved: { label: "تأییدشده", tone: "green" },
  rejected: { label: "ردشده", tone: "rose" },
};

const TIER_BADGE: Record<string, { label: string; tone: "info" | "green" | "rose" }> = {
  international: { label: "بین‌المللی", tone: "info" },
  grade2: { label: "کشوری", tone: "green" },
  grade3: { label: "استانی", tone: "rose" },
};

const TIER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "بدون نشان" },
  { value: "international", label: "بین‌المللی — تیک آبی (درجه ۱)" },
  { value: "grade2", label: "کشوری — تیک سبز (درجه ۲)" },
  { value: "grade3", label: "استانی — تیک قرمز (درجه ۳)" },
];

export function AdminTeachersSection() {
  const runtime = usePlatform();
  const { L } = useAppearance();

  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [rows, setRows] = useState<AdminTeacherRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminTeacherRow | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchRows = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminTeachers(runtime, {
        status: status || undefined,
        q: debouncedQuery || undefined,
        limit: PAGE_SIZE,
        offset: targetPage * PAGE_SIZE,
      });
      setRows((previous) => (append ? [...previous, ...list.rows] : list.rows));
      setTotal(list.total);
      setPage(targetPage);
    } catch (cause) {
      setError(messageOf(cause, L("فهرست استادان دریافت نشد.")));
    } finally {
      setLoading(false);
    }
  }, [runtime, status, debouncedQuery, L]);

  const fetchCounts = useCallback(async () => {
    try {
      const results = await Promise.all(
        FILTERS.map((filter) =>
          fetchAdminTeachers(runtime, { status: filter.value || undefined, limit: 1, offset: 0 }),
        ),
      );
      setCounts({
        "": results[0].total,
        pending: results[1].total,
        approved: results[2].total,
        rejected: results[3].total,
      });
    } catch {
      /* شمارنده‌ها جنبی‌اند */
    }
  }, [runtime]);

  useEffect(() => {
    void fetchRows(0, false);
  }, [fetchRows]);

  useEffect(() => {
    void fetchCounts();
  }, [fetchCounts]);

  async function review(row: AdminTeacherRow, approve: boolean) {
    if (busyId !== null || row.status !== "pending") return;
    const action = approve ? L("تأیید") : L("رد");
    if (!(await confirmDialog(`پروفایل «${row.name}» ${action} شود؟`, { danger: !approve, confirmLabel: action }))) return;
    setBusyId(row.id);
    setError(null);
    try {
      await reviewAdminTeacher(runtime, row.id, approve);
      setRows((previous) => previous.filter((item) => item.id !== row.id));
      setTotal((current) => Math.max(0, current - 1));
      void fetchCounts();
    } catch (cause) {
      setError(messageOf(cause, L(`${action} استاد انجام نشد.`)));
    } finally {
      setBusyId(null);
    }
  }

  async function patchSettings(row: AdminTeacherRow, payload: { verified?: boolean; tier?: string }) {
    if (busyId !== null) return;
    setBusyId(row.id);
    setError(null);
    try {
      const updated = await updateAdminTeacherSettings(runtime, row.id, payload);
      const patch = (item: AdminTeacherRow): AdminTeacherRow => (item.id === row.id ? { ...item, verified: updated.verified, tier: updated.tier } : item);
      setRows((previous) => previous.map(patch));
      setSelected((current) => (current && current.id === row.id ? patch(current) : current));
    } catch (cause) {
      setError(messageOf(cause, L("ثبت تغییرات انجام نشد.")));
    } finally {
      setBusyId(null);
    }
  }

  async function patchTier1(row: AdminTeacherRow, isTier1: boolean | null) {
    if (busyId !== null) return;
    setBusyId(row.id);
    setError(null);
    try {
      await setAdminTeacherTier1(runtime, row.id, isTier1);
      const patch = (item: AdminTeacherRow): AdminTeacherRow => (item.id === row.id ? { ...item, isTier1: isTier1 === null ? undefined : isTier1 } : item);
      setRows((previous) => previous.map(patch));
      setSelected((current) => (current && current.id === row.id ? patch(current) : current));
    } catch (cause) {
      setError(messageOf(cause, L("ثبت درجه ۱ انجام نشد.")));
    } finally {
      setBusyId(null);
    }
  }

  const hasFilters = Boolean(debouncedQuery || status);

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {FILTERS.map((filter) => (
          <AdminChip
            key={filter.value}
            active={status === filter.value}
            label={L(filter.label)}
            count={counts[filter.value]}
            onClick={() => setStatus(filter.value)}
          />
        ))}
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 12px",
          borderRadius: 13,
          border: `1px solid ${colors.sand200}`,
          background: colors.surface,
          color: colors.inkMuted,
        }}
      >
        <Icon name="search" size={15} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={L("جستجوی استاد، شهر یا حوزه…")}
          aria-label={L("جستجوی استاد")}
          style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 600, outline: "none" }}
        />
        {hasFilters ? (
          <button
            type="button"
            onClick={() => { setQuery(""); setStatus(""); }}
            aria-label={L("پاک‌کردن فیلترها")}
            style={{ border: 0, background: "transparent", color: colors.inkMuted, cursor: "pointer", display: "inline-flex", padding: 2 }}
          >
            <Icon name="x" size={14} />
          </button>
        ) : null}
      </label>

      {error ? <AdminError message={error} onRetry={() => void fetchRows(0, false)} /> : null}

      {loading && rows.length === 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className="vodda-skeleton" style={{ height: 84, borderRadius: 16, display: "block" }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <AdminEmpty icon="award" title={L("استادی با این فیلتر پیدا نشد")} description={hasFilters ? L("فیلترها را تغییر دهید.") : L("هنوز پروفایل استادی ثبت نشده است.")} />
      ) : (
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: colors.inkMuted }}>{faNumber(total)} {L("استاد")}</span>
          {rows.map((row) => {
            const normalized = row.status || "pending";
            const badge = STATUS_BADGE[normalized] ?? STATUS_BADGE.pending;
            const busy = busyId === row.id;
            return (
              <AdminPanel key={row.id} style={{ padding: 14, gap: 10, opacity: busy ? 0.55 : 1 }}>
                <button
                  type="button"
                  onClick={() => setSelected(row)}
                  className="vodda-tappable"
                  style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0, border: 0, background: "transparent", padding: 0, textAlign: "start", cursor: "pointer", fontFamily: typography.fontFamily }}
                >
                  <span aria-hidden="true" style={{ width: 42, height: 42, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", background: gradients.soft, border: `1px solid ${colors.goldSoft}`, color: colors.goldDark }}>
                    <Icon name="award" size={20} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 3 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <strong style={{ fontSize: 13.5, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{L(row.name)}</strong>
                      {row.verified ? <Icon name="checkCircle" size={14} style={{ color: colors.olive600, flexShrink: 0 }} /> : null}
                      {row.isTier1 ? <span aria-hidden="true" style={{ fontSize: 12 }}>🏆</span> : null}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: colors.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {[row.tag || row.field, row.city].filter(Boolean).join(" · ") || L("بدون مشخصات تدریس")}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 700, color: colors.inkMuted }}>
                      {row.reviews > 0 ? <span style={{ color: colors.goldDark }}>★ {faNumber(row.rating, 1)}</span> : null}
                      <span>{faNumber(row.sessions)} جلسه</span>
                      <span>{faNumber(row.reviews)} نظر</span>
                    </span>
                  </span>
                  <span style={{ flexShrink: 0, display: "grid", gap: 4, justifyItems: "end" }}>
                    <AdminBadge tone={badge.tone}>{L(badge.label)}</AdminBadge>
                    {row.tier && TIER_BADGE[row.tier] ? <AdminBadge tone={TIER_BADGE[row.tier].tone}>{L(TIER_BADGE[row.tier].label)}</AdminBadge> : null}
                  </span>
                </button>
                {normalized === "pending" ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void review(row, true)}
                      className="vodda-tappable"
                      style={{ flex: "1 1 120px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 12, border: 0, background: "linear-gradient(145deg, #43b07f, #2e8f5c)", color: "#ffffff", fontSize: 12.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}
                    >
                      <Icon name="check" size={15} />
                      {L("تأیید استاد")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void review(row, false)}
                      className="vodda-tappable"
                      style={{ flex: "1 1 100px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 12, border: `1px solid ${colors.sand200}`, background: colors.surface, color: colors.danger, fontSize: 12.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}
                    >
                      <Icon name="x" size={15} />
                      {L("رد")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelected(row)}
                    className="vodda-tappable"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 12px", borderRadius: 12, border: `1px solid ${colors.olive100}`, background: colors.olive50, color: colors.olive700, fontSize: 11.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: "pointer" }}
                  >
                    <Icon name="settings" size={14} />
                    {L("مدیریت نشان‌ها و مشخصات")}
                  </button>
                )}
              </AdminPanel>
            );
          })}
          <AdminLoadMore total={total} shown={rows.length} loading={loading} onLoadMore={() => void fetchRows(page + 1, true)} />
        </div>
      )}

      {/* شیت مدیریت نشان‌ها */}
      <Sheet open={selected !== null} onClose={() => setSelected(null)} title={selected?.name || L("استاد")}>
        {selected ? (
          <div style={{ display: "grid", gap: 4, paddingBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "4px 0 10px" }}>
              <AdminBadge tone={(STATUS_BADGE[selected.status || "pending"] ?? STATUS_BADGE.pending).tone}>
                {L((STATUS_BADGE[selected.status || "pending"] ?? STATUS_BADGE.pending).label)}
              </AdminBadge>
              {selected.tier && TIER_BADGE[selected.tier] ? <AdminBadge tone={TIER_BADGE[selected.tier].tone}>{L(TIER_BADGE[selected.tier].label)}</AdminBadge> : null}
              {selected.isTier1 ? <AdminBadge tone="gold">🏆 {L("کارت درجه ۱")}</AdminBadge> : null}
              {!selected.active ? <AdminBadge tone="rose">{L("حساب غیرفعال")}</AdminBadge> : null}
            </div>

            <AdminKeyValue label={L("حوزه / تخصص")}>{[selected.field, selected.tag].filter(Boolean).join(" · ") || "—"}</AdminKeyValue>
            <AdminKeyValue label={L("شهر")}>{selected.city || "—"}</AdminKeyValue>
            <AdminKeyValue label={L("موبایل")}><span dir="ltr">{selected.mobile || "—"}</span></AdminKeyValue>
            <AdminKeyValue label={L("امتیاز")}>{selected.reviews > 0 ? `${faNumber(selected.rating, 1)} از ۵ (${faNumber(selected.reviews)} نظر)` : L("بدون امتیاز")}</AdminKeyValue>
            <AdminKeyValue label={L("جلسات برگزارشده")}>{faNumber(selected.sessions)}</AdminKeyValue>
            <AdminKeyValue label={L("تعرفه ۳۰ دقیقه")}>{faToman(selected.price30)}</AdminKeyValue>
            <AdminKeyValue label={L("تعرفه ۶۰ دقیقه")}>{faToman(selected.price60)}</AdminKeyValue>
            <AdminKeyValue label={L("تاریخ عضویت")}>{faDate(selected.createdAt)}</AdminKeyValue>

            {(selected.status === "approved" || selected.status === "rejected") ? (
              <div style={{ marginTop: 12, padding: 13, border: `1px solid ${colors.sand150}`, borderRadius: 15, background: colors.surfaceWarm, display: "grid", gap: 13 }}>
                <strong style={{ fontSize: 12.5, fontWeight: 900, color: colors.ink }}>{L("نشان‌های عمومی")}</strong>
                <p style={{ margin: 0, color: colors.inkMuted, fontSize: 10.5, lineHeight: 1.9 }}>
                  {L("مهر رنگی درجه استاد روی آواتار پروفایل عمومی و نتایج جست‌وجو نمایش داده می‌شود؛ اساتید بدون درجه هیچ مهر و تیکی ندارند.")}
                </p>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 800, color: colors.ink }}>
                    <Icon name="checkCircle" size={16} style={{ color: selected.verified ? colors.olive600 : colors.inkFaint }} />
                    {L("استاد تأییدشده")}
                  </span>
                  <AdminToggle
                    checked={selected.verified}
                    disabled={busyId === selected.id}
                    onToggle={() => void patchSettings(selected, { verified: !selected.verified })}
                  />
                </div>

                <label style={{ display: "grid", gap: 6, fontSize: 11, fontWeight: 700, color: colors.inkMuted }}>
                  {L("درجه استاد")}
                  <select
                    value={selected.tier ?? ""}
                    disabled={busyId === selected.id}
                    onChange={(event) => void patchSettings(selected, { tier: event.target.value })}
                    style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: 700 }}
                  >
                    {TIER_OPTIONS.map((option) => (
                      <option key={option.value || "none"} value={option.value}>{L(option.label)}</option>
                    ))}
                  </select>
                </label>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 800, color: colors.ink }}>
                    <span aria-hidden="true">🏆</span>
                    {L("کارت درجه ۱ (برگزیده)")}
                  </span>
                  <AdminToggle
                    checked={Boolean(selected.isTier1)}
                    disabled={busyId === selected.id}
                    onLabel={L("فعال")}
                    offLabel={L("خودکار")}
                    onToggle={() => void patchTier1(selected, selected.isTier1 ? null : true)}
                  />
                </div>
                <p style={{ margin: 0, color: colors.inkMuted, fontSize: 10.5, lineHeight: 1.9 }}>
                  {L("درجه ۱ وقتی فعال است که حداقل ۲ شرط برقرار باشد: تیک بین‌المللی، خدمات رایگان فعال، جلسات فوری با امتیاز ≥ ۲۰۰. روشن‌کردن این سوییچ تأیید صریح ادمین را ثبت می‌کند؛ خاموش‌کردن آن به حالت خودکار برمی‌گردد.")}
                </p>
                {busyId === selected.id ? <small style={{ color: colors.olive700, fontWeight: 700, fontSize: 10.5 }}>{L("در حال ثبت تغییر…")}</small> : null}
              </div>
            ) : null}

            {selected.status === "pending" ? (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  disabled={busyId === selected.id}
                  onClick={() => void review(selected, false)}
                  className="vodda-tappable"
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 12px", borderRadius: 12, border: `1px solid ${colors.sand200}`, background: colors.surface, color: colors.danger, fontSize: 12.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busyId === selected.id ? "wait" : "pointer" }}
                >
                  <Icon name="x" size={15} />
                  {L("رد پروفایل")}
                </button>
                <button
                  type="button"
                  disabled={busyId === selected.id}
                  onClick={() => void review(selected, true)}
                  className="vodda-tappable"
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 12px", borderRadius: 12, border: 0, background: "linear-gradient(145deg, #43b07f, #2e8f5c)", color: "#fff", fontSize: 12.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busyId === selected.id ? "wait" : "pointer" }}
                >
                  <Icon name="check" size={15} />
                  {L("تأیید پروفایل")}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
