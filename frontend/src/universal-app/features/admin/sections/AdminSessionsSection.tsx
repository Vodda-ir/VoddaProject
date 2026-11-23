"use client";

/* جلسات — هم‌ارز صفحهٔ ادمین/جلسات پنل وب: فیلتر وضعیت، کارت جلسه با طرفین،
 * زمان رسمی و مبلغ + شیت جزئیات و صفحه‌بندی. */

import { useCallback, useEffect, useState } from "react";
import { usePlatform } from "../../../platform/context";
import { Icon, Sheet, colors, gradients, typography } from "../../../ui";
import { useAppearance } from "../../../ui/appearance";
import { messageOf } from "../../../ui/errorMessage";
import { fetchAdminSessions, type AdminSessionRow } from "../api";
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
  { value: "confirmed", label: "تأییدشده" },
  { value: "done", label: "برگزارشده" },
  { value: "canceled", label: "لغوشده" },
];

const STATUS_BADGE: Record<string, { label: string; tone: "gold" | "info" | "green" | "rose" }> = {
  pending: { label: "در انتظار", tone: "gold" },
  confirmed: { label: "تأییدشده", tone: "info" },
  done: { label: "برگزارشده", tone: "green" },
  canceled: { label: "لغوشده", tone: "rose" },
};

export function AdminSessionsSection() {
  const runtime = usePlatform();
  const { L } = useAppearance();

  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<AdminSessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminSessionRow | null>(null);

  const fetchRows = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminSessions(runtime, {
        status: status || undefined,
        limit: PAGE_SIZE,
        offset: targetPage * PAGE_SIZE,
      });
      setRows((previous) => (append ? [...previous, ...list.rows] : list.rows));
      setTotal(list.total);
      setPage(targetPage);
    } catch (cause) {
      setError(messageOf(cause, L("فهرست جلسات دریافت نشد.")));
    } finally {
      setLoading(false);
    }
  }, [runtime, status, L]);

  useEffect(() => {
    void fetchRows(0, false);
  }, [fetchRows]);

  const pageRevenue = rows.reduce((sum, row) => (row.status === "done" ? sum + row.price : sum), 0);
  const pageMinutes = rows.reduce((sum, row) => (row.status === "done" ? sum + row.duration : sum), 0);

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {FILTERS.map((filter) => (
          <AdminChip key={filter.value} active={status === filter.value} label={L(filter.label)} onClick={() => setStatus(filter.value)} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, minWidth: 0 }}>
        <AdminTile icon="calendar" label={L("جلسات این نما")} value={faNumber(total)} tone="info" />
        <AdminTile icon="coins" label={L("ارزش برگزارشده")} value={faToman(pageRevenue)} tone="gold" />
        <AdminTile icon="clock" label={L("زمان تدریس")} value={`${faNumber(Math.round(pageMinutes / 60))} ساعت`} />
      </div>

      {error ? <AdminError message={error} onRetry={() => void fetchRows(0, false)} /> : null}

      {loading && rows.length === 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className="vodda-skeleton" style={{ height: 84, borderRadius: 16, display: "block" }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <AdminEmpty icon="calendar" title={L("جلسه‌ای در این وضعیت وجود ندارد")} />
      ) : (
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          {rows.map((row) => {
            const badge = STATUS_BADGE[row.status] ?? { label: row.status, tone: "muted" as const };
            return (
              <AdminPanel key={row.id} style={{ padding: 14, gap: 9 }}>
                <button
                  type="button"
                  onClick={() => setSelected(row)}
                  className="vodda-tappable"
                  style={{ display: "grid", gap: 9, minWidth: 0, width: "100%", border: 0, background: "transparent", padding: 0, textAlign: "start", cursor: "pointer", fontFamily: typography.fontFamily }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span aria-hidden="true" style={{ width: 38, height: 38, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 12, background: colors.olive50, border: `1px solid ${colors.olive100}`, color: colors.olive700 }}>
                      <Icon name="calendar" size={17} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
                      <strong style={{ fontSize: 13, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.service}</strong>
                      <span style={{ fontSize: 10, fontWeight: 700, color: colors.inkMuted }}>#{faNumber(row.id)}</span>
                    </span>
                    <AdminBadge tone={badge.tone}>{badge.label}</AdminBadge>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 700, color: colors.inkMuted, flexWrap: "wrap" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                      <Icon name="user" size={12} />
                      {row.learnerName}
                    </span>
                    <Icon name="arrowL" size={11} />
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                      <Icon name="award" size={12} />
                      {row.teacherName}
                    </span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 10, fontWeight: 700, color: colors.inkMuted }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Icon name="clock" size={12} />
                      {faDateTime(row.scheduledAt)} · {faNumber(row.duration)} دقیقه
                    </span>
                    <strong style={{ fontSize: 12, fontWeight: 800, color: colors.olive700 }}>{faToman(row.price)}</strong>
                  </span>
                </button>
              </AdminPanel>
            );
          })}
          <AdminLoadMore total={total} shown={rows.length} loading={loading} onLoadMore={() => void fetchRows(page + 1, true)} />
        </div>
      )}

      <Sheet open={selected !== null} onClose={() => setSelected(null)} title={selected?.service || L("جزئیات جلسه")}>
        {selected ? (
          <div style={{ display: "grid", gap: 4, paddingBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "4px 0 10px" }}>
              <AdminBadge tone={(STATUS_BADGE[selected.status] ?? { tone: "muted" }).tone}>{(STATUS_BADGE[selected.status] ?? { label: selected.status }).label}</AdminBadge>
              <AdminBadge tone="muted">#{faNumber(selected.id)}</AdminBadge>
            </div>
            <AdminKeyValue label={L("قرآن‌آموز")}>{selected.learnerName}</AdminKeyValue>
            <AdminKeyValue label={L("استاد")}>{selected.teacherName}</AdminKeyValue>
            <AdminKeyValue label={L("زمان رسمی")}>{faDateTime(selected.scheduledAt)}</AdminKeyValue>
            <AdminKeyValue label={L("بازه محلی")}>{`${selected.localDate} · ${selected.localStart} تا ${selected.localEnd}`}</AdminKeyValue>
            <AdminKeyValue label={L("مدت")}>{faNumber(selected.duration)} دقیقه</AdminKeyValue>
            <AdminKeyValue label={L("مبلغ")}>{faToman(selected.price)}</AdminKeyValue>
            <AdminKeyValue label={L("نظرسنجی")}>{selected.rated ? L("ثبت شده") : L("ثبت نشده")}</AdminKeyValue>
            {selected.note ? <AdminKeyValue label={L("یادداشت")}>{selected.note}</AdminKeyValue> : null}
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
