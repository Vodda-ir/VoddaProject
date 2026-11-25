"use client";

/* مدیریت کاربران — هم‌ارز کامل صفحهٔ ادمین/کاربران پنل وب:
 * فیلتر نقش و وضعیت حساب، مرتب‌سازی، جست‌وجو، فعال/غیرفعال، تغییر نقش،
 * تعدیل کیف پول، ارسال اعلان و جزئیات (تراکنش‌ها و جلسات). */

import { useCallback, useEffect, useState } from "react";
import { confirmDialog } from "@/lib/confirm";
import { usePlatform } from "../../../platform/context";
import { Icon, Sheet, colors, gradients, typography } from "../../../ui";
import { useAppearance } from "../../../ui/appearance";
import { messageOf } from "../../../ui/errorMessage";
import {
  adjustAdminUserWallet,
  fetchAdminUserDetail,
  fetchAdminUsers,
  notifyAdminUser,
  setAdminUserActive,
  setAdminUserRole,
  type AdminUserDetail,
  type AdminUserRow,
} from "../api";
import {
  AdminBadge,
  AdminChip,
  AdminEmpty,
  AdminError,
  AdminKeyValue,
  AdminLoadMore,
  AdminPanel,
  faDate,
  faNumber,
  faToman,
} from "../AdminUI";

const PAGE_SIZE = 30;

const ROLE_OPTIONS = [
  { value: "", label: "همه" },
  { value: "learner", label: "قرآن‌آموز" },
  { value: "teacher", label: "استاد" },
  { value: "admin", label: "مدیر" },
];

const ACTIVE_OPTIONS = [
  { value: "", label: "همه" },
  { value: "active", label: "فعال" },
  { value: "inactive", label: "غیرفعال" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی‌ترین" },
  { value: "wallet-high", label: "کیف پول ↑" },
  { value: "wallet-low", label: "کیف پول ↓" },
];

const ROLE_BADGE: Record<string, { label: string; tone: "info" | "gold" | "muted" }> = {
  learner: { label: "قرآن‌آموز", tone: "info" },
  teacher: { label: "استاد", tone: "gold" },
  admin: { label: "ادمین", tone: "muted" },
};

export function AdminUsersSection() {
  const runtime = usePlatform();
  const { L } = useAppearance();

  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [sort, setSort] = useState("newest");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionNote, setActionNote] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyBody, setNotifyBody] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchRows = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminUsers(runtime, {
        role: role || undefined,
        active: active || undefined,
        sort,
        q: debouncedQuery || undefined,
        limit: PAGE_SIZE,
        offset: targetPage * PAGE_SIZE,
      });
      setRows((previous) => (append ? [...previous, ...list.rows] : list.rows));
      setTotal(list.total);
      setPage(targetPage);
    } catch (cause) {
      setError(messageOf(cause, L("دریافت فهرست کاربران ناموفق بود")));
    } finally {
      setLoading(false);
    }
  }, [runtime, role, active, sort, debouncedQuery, L]);

  useEffect(() => {
    void fetchRows(0, false);
  }, [fetchRows]);

  async function toggleActive(row: AdminUserRow) {
    if (busyId !== null) return;
    if (!(await confirmDialog(row.active ? `حساب «${row.name}» غیرفعال شود؟` : `حساب «${row.name}» فعال شود؟`, { danger: row.active }))) return;
    setBusyId(row.id);
    setError(null);
    try {
      await setAdminUserActive(runtime, row.id, !row.active);
      const patch = (item: AdminUserRow): AdminUserRow => (item.id === row.id ? { ...item, active: !item.active } : item);
      setRows((previous) => previous.map(patch));
      setSelected((current) => (current && current.id === row.id ? patch(current) : current));
      setActionNote(row.active ? L("حساب غیرفعال شد") : L("حساب فعال شد"));
    } catch (cause) {
      setError(messageOf(cause, L("تغییر وضعیت حساب ناموفق بود")));
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(row: AdminUserRow, nextRole: string) {
    if (busyId !== null || row.role === nextRole) return;
    setBusyId(row.id);
    setError(null);
    try {
      await setAdminUserRole(runtime, row.id, nextRole);
      const patch = (item: AdminUserRow): AdminUserRow => (item.id === row.id ? { ...item, role: nextRole } : item);
      setRows((previous) => previous.map(patch));
      setSelected((current) => (current && current.id === row.id ? patch(current) : current));
      setActionNote(L("نقش کاربر تغییر کرد"));
    } catch (cause) {
      setError(messageOf(cause, L("تغییر نقش ناموفق بود")));
    } finally {
      setBusyId(null);
    }
  }

  async function walletAdjust(row: AdminUserRow) {
    if (busyId !== null) return;
    const parsed = Number(adjustAmount.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(parsed) || parsed === 0) {
      setError(L("مبلغ تعدیل معتبر نیست"));
      return;
    }
    setBusyId(row.id);
    setError(null);
    try {
      await adjustAdminUserWallet(runtime, row.id, Math.round(parsed), adjustReason);
      const patch = (item: AdminUserRow): AdminUserRow => (item.id === row.id ? { ...item, wallet: item.wallet + Math.round(parsed) } : item);
      setRows((previous) => previous.map(patch));
      setSelected((current) => (current && current.id === row.id ? patch(current) : current));
      setAdjustAmount("");
      setAdjustReason("");
      setActionNote(L("کیف پول تعدیل شد"));
    } catch (cause) {
      setError(messageOf(cause, L("تعدیل کیف پول ناموفق بود")));
    } finally {
      setBusyId(null);
    }
  }

  async function notify(row: AdminUserRow) {
    if (busyId !== null) return;
    if (!notifyTitle.trim() || !notifyBody.trim()) {
      setError(L("عنوان و متن اعلان لازم است"));
      return;
    }
    setBusyId(row.id);
    setError(null);
    try {
      await notifyAdminUser(runtime, row.id, notifyTitle, notifyBody);
      setNotifyTitle("");
      setNotifyBody("");
      setActionNote(L("اعلان با موفقیت ارسال شد"));
    } catch (cause) {
      setError(messageOf(cause, L("ارسال اعلان ناموفق بود")));
    } finally {
      setBusyId(null);
    }
  }

  async function openDetail(row: AdminUserRow) {
    setSelected(row);
    setDetail(null);
    setActionNote(null);
    setDetailLoading(true);
    try {
      setDetail(await fetchAdminUserDetail(runtime, row.id));
    } catch {
      setDetail(null); // شیت با اطلاعات فهرست هم قابل استفاده است
    } finally {
      setDetailLoading(false);
    }
  }

  const hasFilters = Boolean(debouncedQuery || role || active || (sort && sort !== "newest"));

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {ROLE_OPTIONS.map((option) => (
          <AdminChip key={option.value} active={role === option.value} label={L(option.label)} onClick={() => setRole(option.value)} />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {ACTIVE_OPTIONS.map((option) => (
          <AdminChip key={option.value} active={active === option.value} label={option.value === "active" ? L("حساب فعال") : option.value === "inactive" ? L("حساب غیرفعال") : L("همه حساب‌ها")} onClick={() => setActive(option.value)} />
        ))}
        {SORT_OPTIONS.map((option) => (
          <AdminChip key={option.value} active={sort === option.value} label={L(option.label)} onClick={() => setSort(option.value)} />
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
          placeholder={L("جستجوی نام یا موبایل")}
          aria-label={L("جستجوی نام یا موبایل کاربر")}
          style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 600, outline: "none" }}
        />
        {hasFilters ? (
          <button
            type="button"
            onClick={() => { setQuery(""); setRole(""); setActive(""); setSort("newest"); }}
            aria-label={L("پاک‌کردن فیلترها")}
            style={{ border: 0, background: "transparent", color: colors.inkMuted, cursor: "pointer", display: "inline-flex", padding: 2 }}
          >
            <Icon name="x" size={14} />
          </button>
        ) : null}
      </label>

      {error ? <AdminError message={error} /> : null}
      {actionNote && !error ? (
        <span role="status" style={{ padding: "9px 12px", borderRadius: 12, background: "#e7f6ee", border: "1px solid rgba(58,167,109,.35)", color: "#2e8f5c", fontSize: 12, fontWeight: 800 }}>
          {actionNote}
        </span>
      ) : null}

      {loading && rows.length === 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="vodda-skeleton" style={{ height: 66, borderRadius: 16, display: "block" }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <AdminEmpty icon="users" title={L("کاربری یافت نشد")} description={L("جستجو را تغییر دهید یا فیلتر نقش را بردارید.")} />
      ) : (
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: colors.inkMuted }}>{faNumber(total)} {L("کاربر")}</span>
          {rows.map((row) => {
            const busy = busyId === row.id;
            const roleBadge = ROLE_BADGE[row.role] ?? ROLE_BADGE.learner;
            return (
              <AdminPanel key={row.id} style={{ padding: "12px 14px", gap: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => void openDetail(row)}
                    className="vodda-tappable"
                    style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0, flex: 1, border: 0, background: "transparent", padding: 0, textAlign: "start", cursor: "pointer", fontFamily: typography.fontFamily }}
                  >
                    <span aria-hidden="true" style={{ width: 38, height: 38, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", background: gradients.soft, border: `1px solid ${colors.olive100}`, color: colors.olive700 }}>
                      <Icon name="user" size={18} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
                      <strong style={{ fontSize: 13, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{L(row.name)}</strong>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 600, color: colors.inkMuted, flexWrap: "wrap" }}>
                        <span dir="ltr">{row.mobile || "—"}</span>
                        <AdminBadge tone={roleBadge.tone}>{L(roleBadge.label)}</AdminBadge>
                        <span>{faToman(row.wallet)}</span>
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleActive(row)}
                    aria-label={row.active ? L("غیرفعال‌کردن حساب") : L("فعال‌کردن حساب")}
                    className="vodda-tappable"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 999, border: `1px solid ${row.active ? "rgba(58,167,109,.4)" : colors.sand200}`, background: row.active ? "#e7f6ee" : colors.surfaceSoft, color: row.active ? "#2e8f5c" : colors.inkMuted, fontSize: 10.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1, flexShrink: 0 }}
                  >
                    <Icon name={row.active ? "checkCircle" : "x"} size={13} />
                    {row.active ? L("فعال") : L("غیرفعال")}
                  </button>
                </div>
              </AdminPanel>
            );
          })}
          <AdminLoadMore total={total} shown={rows.length} loading={loading} onLoadMore={() => void fetchRows(page + 1, true)} />
        </div>
      )}

      {/* شیت جزئیات کاربر */}
      <Sheet open={selected !== null} onClose={() => { setSelected(null); setDetail(null); }} title={selected?.name || L("جزئیات کاربر")}>
        {selected ? (
          <div style={{ display: "grid", gap: 4, paddingBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "4px 0 10px" }}>
              <AdminBadge tone={(ROLE_BADGE[selected.role] ?? ROLE_BADGE.learner).tone}>{L((ROLE_BADGE[selected.role] ?? ROLE_BADGE.learner).label)}</AdminBadge>
              <AdminBadge tone={selected.active ? "green" : "rose"}>{selected.active ? L("حساب فعال") : L("حساب غیرفعال")}</AdminBadge>
              <AdminBadge tone="clay">{faToman(selected.wallet)}</AdminBadge>
            </div>

            <AdminKeyValue label={L("نام")}>{L(selected.name)}</AdminKeyValue>
            <AdminKeyValue label={L("موبایل")}><span dir="ltr">{selected.mobile || "—"}</span></AdminKeyValue>
            <AdminKeyValue label={L("شهر")}>{selected.city || "—"}</AdminKeyValue>
            <AdminKeyValue label={L("تاریخ عضویت")}>{faDate(selected.createdAt)}</AdminKeyValue>

            {/* تغییر نقش */}
            <div style={{ marginTop: 12, padding: 13, border: `1px solid ${colors.sand150}`, borderRadius: 15, background: colors.surfaceWarm, display: "grid", gap: 11 }}>
              <strong style={{ fontSize: 12.5, fontWeight: 900, color: colors.ink }}>{L("عملیات مدیریتی")}</strong>

              <label style={{ display: "grid", gap: 6, fontSize: 11, fontWeight: 700, color: colors.inkMuted }}>
                {L("تغییر نقش کاربر")}
                <select
                  value={selected.role}
                  disabled={busyId === selected.id}
                  onChange={(event) => void changeRole(selected, event.target.value)}
                  style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: 700 }}
                >
                  <option value="learner">{L("قرآن‌آموز")}</option>
                  <option value="teacher">{L("استاد")}</option>
                  <option value="admin">{L("مدیر")}</option>
                </select>
              </label>

              <div style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.inkMuted }}>{L("تعدیل کیف پول")}</span>
                <input
                  value={adjustAmount}
                  onChange={(event) => setAdjustAmount(event.target.value)}
                  inputMode="numeric"
                  placeholder={L("مثلاً ۵۰۰۰۰ یا -۲۰۰۰۰")}
                  aria-label={L("مبلغ تعدیل کیف پول")}
                  style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: 700, outline: "none" }}
                />
                <input
                  value={adjustReason}
                  onChange={(event) => setAdjustReason(event.target.value)}
                  placeholder={L("دلیل تعدیل (ثبت در گزارش عملیات)")}
                  aria-label={L("دلیل تعدیل کیف پول")}
                  style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: 700, outline: "none" }}
                />
                <button
                  type="button"
                  disabled={busyId === selected.id}
                  onClick={() => void walletAdjust(selected)}
                  className="vodda-tappable"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 12, border: 0, background: colors.olive600, color: "#fffaf0", fontSize: 12, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busyId === selected.id ? "wait" : "pointer", opacity: busyId === selected.id ? 0.7 : 1 }}
                >
                  <Icon name="coins" size={14} />
                  {busyId === selected.id ? L("در حال ثبت…") : L("ثبت تعدیل کیف پول")}
                </button>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.inkMuted }}>{L("ارسال اعلان درون‌اپی")}</span>
                <input
                  value={notifyTitle}
                  onChange={(event) => setNotifyTitle(event.target.value)}
                  placeholder={L("عنوان اعلان")}
                  aria-label={L("عنوان اعلان")}
                  style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: 700, outline: "none" }}
                />
                <textarea
                  value={notifyBody}
                  onChange={(event) => setNotifyBody(event.target.value)}
                  placeholder={L("متن اعلان")}
                  aria-label={L("متن اعلان")}
                  rows={2}
                  style={{ minHeight: 64, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12, fontWeight: 700, resize: "vertical", outline: "none" }}
                />
                <button
                  type="button"
                  disabled={busyId === selected.id || !notifyTitle.trim() || !notifyBody.trim()}
                  onClick={() => void notify(selected)}
                  className="vodda-tappable"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 12, border: 0, background: colors.goldDark, color: "#fffaf0", fontSize: 12, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busyId === selected.id ? "wait" : "pointer", opacity: busyId === selected.id || !notifyTitle.trim() || !notifyBody.trim() ? 0.6 : 1 }}
                >
                  <Icon name="bell" size={14} />
                  {busyId === selected.id ? L("در حال ارسال…") : L("ارسال اعلان")}
                </button>
              </div>

              <button
                type="button"
                disabled={busyId === selected.id}
                onClick={() => void toggleActive(selected)}
                className="vodda-tappable"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 12, border: `1px solid ${colors.sand200}`, background: colors.surface, color: selected.active ? colors.danger : "#2e8f5c", fontSize: 12, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busyId === selected.id ? "wait" : "pointer" }}
              >
                <Icon name={selected.active ? "x" : "checkCircle"} size={14} />
                {selected.active ? L("غیرفعال‌کردن حساب") : L("فعال‌کردن حساب")}
              </button>
            </div>

            {/* تراکنش‌ها و جلسات */}
            {detailLoading ? (
              <span className="vodda-skeleton" style={{ height: 70, borderRadius: 13, display: "block", marginTop: 12 }} />
            ) : detail ? (
              <>
                <strong style={{ fontSize: 12.5, fontWeight: 900, color: colors.ink, marginTop: 12 }}>{L("تراکنش‌های اخیر")}</strong>
                {detail.transactions.length === 0 ? (
                  <span style={{ fontSize: 11, fontWeight: 600, color: colors.inkMuted }}>{L("تراکنشی ثبت نشده است.")}</span>
                ) : (
                  detail.transactions.slice(0, 6).map((tx) => (
                    <div key={tx.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 11px", borderRadius: 12, background: colors.surfaceSoft, border: `1px solid ${colors.sand150}` }}>
                      <div style={{ minWidth: 0, display: "grid", gap: 1 }}>
                        <strong style={{ fontSize: 11.5, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.title || L("تراکنش")}</strong>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: colors.inkMuted }}>{faDate(tx.createdAt)}</span>
                      </div>
                      <strong style={{ fontSize: 11.5, fontWeight: 800, color: tx.amount >= 0 ? "#2e8f5c" : colors.danger, flexShrink: 0 }}>{faToman(tx.amount)}</strong>
                    </div>
                  ))
                )}

                <strong style={{ fontSize: 12.5, fontWeight: 900, color: colors.ink, marginTop: 10 }}>{L("جلسات اخیر")}</strong>
                {detail.sessions.length === 0 ? (
                  <span style={{ fontSize: 11, fontWeight: 600, color: colors.inkMuted }}>{L("جلسه‌ای ثبت نشده است.")}</span>
                ) : (
                  detail.sessions.slice(0, 6).map((session) => (
                    <div key={session.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 11px", borderRadius: 12, background: colors.surfaceSoft, border: `1px solid ${colors.sand150}` }}>
                      <div style={{ minWidth: 0, display: "grid", gap: 1 }}>
                        <strong style={{ fontSize: 11.5, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{L(session.service)}</strong>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: colors.inkMuted }}>{faDate(session.scheduledAt)} · {faNumber(session.duration)} دقیقه</span>
                      </div>
                      <strong style={{ fontSize: 11.5, fontWeight: 800, color: colors.olive700, flexShrink: 0 }}>{faToman(session.price)}</strong>
                    </div>
                  ))
                )}
              </>
            ) : null}
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
