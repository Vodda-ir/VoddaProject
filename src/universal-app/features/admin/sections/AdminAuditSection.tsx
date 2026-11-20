"use client";

/* گزارش عملیات — هم‌ارز صفحهٔ ادمین/گزارش عملیات پنل وب:
 * رخدادهای حساس مدیریتی با برچسب فارسی، بازیگر، هدف و شناسهٔ درخواست. */

import { useCallback, useEffect, useState } from "react";
import { usePlatform } from "../../../platform/context";
import { Icon, colors, gradients, typography } from "../../../ui";
import { useAppearance } from "../../../ui/appearance";
import { messageOf } from "../../../ui/errorMessage";
import { fetchAdminAuditLogs, type AdminAuditRow } from "../api";
import {
  AdminBadge,
  AdminEmpty,
  AdminError,
  AdminLoadMore,
  AdminPanel,
  AdminTile,
  faDateTime,
  faNumber,
} from "../AdminUI";

const PAGE_SIZE = 50;

const ACTION_BADGE: Record<string, { label: string; tone: "gold" | "clay" | "green" | "rose" | "info" | "olive" }> = {
  "POST:/api/v1/admin/teachers/:id/review": { label: "بررسی استاد", tone: "gold" },
  "PATCH:/api/v1/admin/users/:id/active": { label: "تغییر دسترسی حساب", tone: "clay" },
  "PUT:/api/v1/admin/services/:id/approve": { label: "تأیید خدمت", tone: "green" },
  "PUT:/api/v1/admin/services/:id/reject": { label: "رد خدمت", tone: "rose" },
  "POST:/api/v1/admin/withdrawals/:id/process": { label: "ثبت وضعیت برداشت", tone: "info" },
  "PATCH:/api/v1/admin/support/messages/:id/resolve": { label: "رسیدگی پشتیبانی", tone: "olive" },
};

function actionMeta(action: string): { label: string; tone: "gold" | "clay" | "green" | "rose" | "info" | "olive" } {
  if (ACTION_BADGE[action]) return ACTION_BADGE[action];
  if (action.includes("teacher")) return { label: "عملیات استاد", tone: "gold" };
  if (action.includes("user")) return { label: "عملیات کاربر", tone: "clay" };
  if (action.includes("withdrawal")) return { label: "عملیات مالی", tone: "info" };
  if (action.includes("service")) return { label: "عملیات خدمت", tone: "green" };
  if (action.includes("support")) return { label: "عملیات پشتیبانی", tone: "olive" };
  return { label: "رخداد مدیریتی", tone: "info" };
}

export function AdminAuditSection() {
  const runtime = usePlatform();
  const { L } = useAppearance();

  const [rows, setRows] = useState<AdminAuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminAuditLogs(runtime, PAGE_SIZE, targetPage * PAGE_SIZE);
      setRows((previous) => (append ? [...previous, ...list.rows] : list.rows));
      setTotal(list.total);
      setPage(targetPage);
    } catch (cause) {
      setError(messageOf(cause, L("گزارش عملیات دریافت نشد.")));
    } finally {
      setLoading(false);
    }
  }, [runtime, L]);

  useEffect(() => {
    void fetchRows(0, false);
  }, [fetchRows]);

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, minWidth: 0 }}>
        <AdminTile icon="shield" label={L("رخدادهای ثبت‌شده")} value={faNumber(total)} />
        <AdminTile icon="clock" label={L("ترتیب")} value={L("جدید ← قدیم")} tone="info" />
        <AdminTile icon="doc" label={L("شناسه درخواست")} value={L("قابل ردیابی")} tone="gold" />
      </div>

      {error ? <AdminError message={error} onRetry={() => void fetchRows(0, false)} /> : null}

      {loading && rows.length === 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <span key={index} className="vodda-skeleton" style={{ height: 76, borderRadius: 16, display: "block" }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <AdminEmpty icon="shield" title={L("رخدادی ثبت نشده است")} description={L("تمام تغییرات حساس مدیریتی اینجا ثبت می‌شود.")} />
      ) : (
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          {rows.map((row) => {
            const meta = actionMeta(row.action);
            return (
              <AdminPanel key={row.id} style={{ padding: 14, gap: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span aria-hidden="true" style={{ width: 36, height: 36, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", background: gradients.soft, border: `1px solid ${colors.olive100}`, color: colors.olive700 }}>
                    <Icon name="shield" size={16} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
                    <span dir="ltr" style={{ fontSize: 10.5, fontWeight: 700, color: colors.inkSecondary, textAlign: "start", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.action}</span>
                    <strong style={{ fontSize: 12, fontWeight: 800, color: colors.ink }}>{meta.label}</strong>
                  </div>
                  <AdminBadge tone={meta.tone}>#{faNumber(row.actorId)}</AdminBadge>
                </div>
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 9.5, fontWeight: 700, color: colors.inkMuted }}>
                  <span>{faDateTime(row.createdAt)}</span>
                  {row.targetType ? <span>· {row.targetType} {faNumber(row.targetId)}</span> : null}
                  {row.requestId ? <span dir="ltr" style={{ fontFamily: "monospace", fontSize: 9 }}>· {row.requestId}</span> : null}
                </div>
              </AdminPanel>
            );
          })}
          <AdminLoadMore total={total} shown={rows.length} loading={loading} onLoadMore={() => void fetchRows(page + 1, true)} />
        </div>
      )}
    </div>
  );
}
