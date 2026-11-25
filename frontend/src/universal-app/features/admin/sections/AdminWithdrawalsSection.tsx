"use client";

/* برداشت‌ها — هم‌ارز صفحهٔ ادمین/برداشت‌ها پنل وب:
 * فیلتر وضعیت (پیش‌فرض در انتظار)، ثبت پرداخت پس از انتقال واقعی بانکی،
 * رد و بازگشت وجه به کیف پول استاد، شیت جزئیات با شبا/کارت. */

import { useCallback, useEffect, useState } from "react";
import { confirmDialog } from "@/lib/confirm";
import { usePlatform } from "../../../platform/context";
import { Icon, Sheet, colors, gradients, typography } from "../../../ui";
import { useAppearance } from "../../../ui/appearance";
import { messageOf } from "../../../ui/errorMessage";
import { fetchAdminWithdrawals, processAdminWithdrawal, type AdminWithdrawalRow } from "../api";
import {
  AdminBadge,
  AdminChip,
  AdminEmpty,
  AdminError,
  AdminKeyValue,
  AdminLoadMore,
  AdminPanel,
  AdminTile,
  faDateTime,
  faNumber,
  faToman,
} from "../AdminUI";

const PAGE_SIZE = 30;

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "همه" },
  { value: "pending", label: "در انتظار" },
  { value: "paid", label: "پرداخت‌شده" },
  { value: "rejected", label: "ردشده" },
];

const STATUS_BADGE: Record<string, { label: string; tone: "gold" | "green" | "rose" }> = {
  pending: { label: "در انتظار پرداخت", tone: "gold" },
  paid: { label: "پرداخت‌شده", tone: "green" },
  rejected: { label: "ردشده", tone: "rose" },
};

function bankAccount(row: AdminWithdrawalRow) {
  return row.sheba || row.card || "";
}

export function AdminWithdrawalsSection() {
  const runtime = usePlatform();
  const { L } = useAppearance();

  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState<AdminWithdrawalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminWithdrawalRow | null>(null);

  const fetchRows = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminWithdrawals(runtime, {
        status: status || undefined,
        limit: PAGE_SIZE,
        offset: targetPage * PAGE_SIZE,
      });
      setRows((previous) => (append ? [...previous, ...list.rows] : list.rows));
      setTotal(list.total);
      setPage(targetPage);
    } catch (cause) {
      setError(messageOf(cause, L("درخواست‌های برداشت دریافت نشدند.")));
    } finally {
      setLoading(false);
    }
  }, [runtime, status, L]);

  useEffect(() => {
    void fetchRows(0, false);
  }, [fetchRows]);

  async function process(row: AdminWithdrawalRow, paid: boolean) {
    if (busyId !== null || (row.status || "pending") !== "pending") return;
    const warning = paid
      ? L("فقط پس از انجام واقعی انتقال بانکی، وضعیت را پرداخت‌شده کنید. ادامه می‌دهید؟")
      : L("با رد درخواست، مبلغ رزروشده به کیف پول استاد بازمی‌گردد. ادامه می‌دهید؟");
    if (!(await confirmDialog(warning, { danger: !paid, confirmLabel: paid ? L("ثبت پرداخت") : L("رد و بازگشت") }))) return;
    setBusyId(row.id);
    setError(null);
    try {
      await processAdminWithdrawal(runtime, row.id, paid);
      setRows((previous) => previous.filter((item) => item.id !== row.id));
      setTotal((current) => Math.max(0, current - 1));
      setSelected(null);
    } catch (cause) {
      setError(messageOf(cause, L("ثبت وضعیت برداشت انجام نشد.")));
    } finally {
      setBusyId(null);
    }
  }

  const pagePendingAmount = rows
    .filter((row) => (row.status || "pending") === "pending")
    .reduce((sum, row) => sum + row.amount, 0);

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, background: colors.goldBackground, color: "#765918", fontSize: 11, fontWeight: 700, border: "1px dashed rgba(191,149,64,.5)" }}>
        <Icon name="info" size={15} />
        {L("تغییر وضعیت در وُدّا جایگزین انتقال بانکی نیست. ابتدا انتقال واقعی را انجام دهید، سپس درخواست را پرداخت‌شده کنید.")}
      </span>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, minWidth: 0 }}>
        <AdminTile icon="wallet" label={L("درخواست‌های این نما")} value={faNumber(total)} tone="gold" />
        <AdminTile icon="coins" label={L("مبلغ در انتظار صفحه")} value={faToman(pagePendingAmount)} tone="clay" />
        <AdminTile icon="checkCircle" label={L("ترتیب عمل")} value={L("انتقال ← ثبت")} tone="olive" />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {FILTERS.map((filter) => (
          <AdminChip key={filter.value} active={status === filter.value} label={L(filter.label)} onClick={() => setStatus(filter.value)} />
        ))}
      </div>

      {error ? <AdminError message={error} onRetry={() => void fetchRows(0, false)} /> : null}

      {loading && rows.length === 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className="vodda-skeleton" style={{ height: 84, borderRadius: 16, display: "block" }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <AdminEmpty icon="wallet" title={L("درخواستی در این وضعیت وجود ندارد")} />
      ) : (
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          {rows.map((row) => {
            const normalized = row.status || "pending";
            const badge = STATUS_BADGE[normalized] ?? STATUS_BADGE.pending;
            const busy = busyId === row.id;
            const account = bankAccount(row);
            return (
              <AdminPanel key={row.id} style={{ padding: 14, gap: 9, opacity: busy ? 0.55 : 1 }}>
                <button
                  type="button"
                  onClick={() => setSelected(row)}
                  className="vodda-tappable"
                  style={{ display: "grid", gap: 8, minWidth: 0, width: "100%", border: 0, background: "transparent", padding: 0, textAlign: "start", cursor: "pointer", fontFamily: typography.fontFamily }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span aria-hidden="true" style={{ width: 40, height: 40, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", background: gradients.soft, border: `1px solid ${colors.goldSoft}`, color: colors.goldDark }}>
                      <Icon name="wallet" size={18} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
                      <strong style={{ fontSize: 13, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{L(row.userName)}</strong>
                      <span style={{ fontSize: 10, fontWeight: 700, color: colors.inkMuted }}>#{faNumber(row.id)} · {faDateTime(row.createdAt)}</span>
                    </span>
                    <AdminBadge tone={badge.tone}>{L(badge.label)}</AdminBadge>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <strong style={{ fontSize: 13, fontWeight: 900, color: colors.olive700 }}>{faToman(row.amount)}</strong>
                    {account ? (
                      <span dir="ltr" style={{ fontFamily: "monospace", fontSize: 9.5, color: colors.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {account}
                      </span>
                    ) : (
                      <span style={{ fontSize: 9.5, fontWeight: 600, color: colors.inkFaint }}>—</span>
                    )}
                  </span>
                </button>
                {normalized === "pending" ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void process(row, false)}
                      className="vodda-tappable"
                      style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 12, border: `1px solid ${colors.sand200}`, background: colors.surface, color: colors.danger, fontSize: 12, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}
                    >
                      <Icon name="x" size={14} />
                      {L("رد و بازگشت")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void process(row, true)}
                      className="vodda-tappable"
                      style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 12, border: 0, background: "linear-gradient(145deg, #43b07f, #2e8f5c)", color: "#ffffff", fontSize: 12, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}
                    >
                      <Icon name="check" size={14} />
                      {busy ? L("در حال ثبت…") : L("ثبت پرداخت")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelected(row)}
                    className="vodda-tappable"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 12px", borderRadius: 12, border: `1px solid ${colors.olive100}`, background: colors.olive50, color: colors.olive700, fontSize: 11.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: "pointer" }}
                  >
                    <Icon name="doc" size={14} />
                    {L("جزئیات")}
                  </button>
                )}
              </AdminPanel>
            );
          })}
          <AdminLoadMore total={total} shown={rows.length} loading={loading} onLoadMore={() => void fetchRows(page + 1, true)} />
        </div>
      )}

      <Sheet open={selected !== null} onClose={() => setSelected(null)} title={L(selected?.userName || "جزئیات برداشت")}>
        {selected ? (
          <div style={{ display: "grid", gap: 4, paddingBottom: 10 }}>
            <div style={{ display: "grid", gap: 6, padding: "4px 0 12px" }}>
              <strong style={{ fontSize: 16, fontWeight: 900, color: colors.olive700 }}>{faToman(selected.amount)}</strong>
              <AdminBadge tone={(STATUS_BADGE[selected.status || "pending"] ?? STATUS_BADGE.pending).tone}>
                {L((STATUS_BADGE[selected.status || "pending"] ?? STATUS_BADGE.pending).label)}
              </AdminBadge>
            </div>
            <AdminKeyValue label={L("شناسه درخواست")}>#{faNumber(selected.id)}</AdminKeyValue>
            <AdminKeyValue label={L("استاد")}>{L(selected.userName)}</AdminKeyValue>
            <AdminKeyValue label={L("شبا")}><span dir="ltr">{selected.sheba || "—"}</span></AdminKeyValue>
            <AdminKeyValue label={L("شماره کارت")}><span dir="ltr">{selected.card || "—"}</span></AdminKeyValue>
            <AdminKeyValue label={L("تاریخ درخواست")}>{faDateTime(selected.createdAt)}</AdminKeyValue>
            {(selected.status || "pending") === "pending" ? (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  disabled={busyId === selected.id}
                  onClick={() => void process(selected, false)}
                  className="vodda-tappable"
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 12px", borderRadius: 12, border: `1px solid ${colors.sand200}`, background: colors.surface, color: colors.danger, fontSize: 12.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busyId === selected.id ? "wait" : "pointer" }}
                >
                  <Icon name="x" size={15} />
                  {L("رد و بازگشت وجه")}
                </button>
                <button
                  type="button"
                  disabled={busyId === selected.id}
                  onClick={() => void process(selected, true)}
                  className="vodda-tappable"
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 12px", borderRadius: 12, border: 0, background: "linear-gradient(145deg, #43b07f, #2e8f5c)", color: "#ffffff", fontSize: 12.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busyId === selected.id ? "wait" : "pointer" }}
                >
                  <Icon name="check" size={15} />
                  {busyId === selected.id ? L("در حال ثبت…") : L("ثبت پرداخت")}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
