"use client";

/* بررسی خدمات استادان — هم‌ارز صفحهٔ ادمین/خدمات پنل وب:
 * صف خدمت‌های در انتظار با ارزش ریالی، تأیید و انتشار یا رد و حذف. */

import { useCallback, useEffect, useState } from "react";
import { confirmDialog } from "@/lib/confirm";
import { usePlatform } from "../../../platform/context";
import { Icon, colors, gradients, typography } from "../../../ui";
import { useAppearance } from "../../../ui/appearance";
import { messageOf } from "../../../ui/errorMessage";
import { fetchAdminPendingServices, moderateAdminService, type AdminPendingService } from "../api";
import { AdminBadge, AdminEmpty, AdminError, AdminPanel, AdminSectionHead, AdminTile, faNumber, faToman } from "../AdminUI";

export function AdminServicesSection() {
  const runtime = usePlatform();
  const { L } = useAppearance();

  const [rows, setRows] = useState<AdminPendingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAdminPendingServices(runtime));
    } catch (cause) {
      setError(messageOf(cause, L("خدمات در انتظار دریافت نشدند.")));
    } finally {
      setLoading(false);
    }
  }, [runtime, L]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  async function moderate(row: AdminPendingService, approve: boolean) {
    if (busyId !== null) return;
    const action = approve ? "تأیید و انتشار" : "رد و حذف";
    if (!(await confirmDialog(`خدمت «${row.title}» ${action} شود؟`, { danger: !approve, confirmLabel: action }))) return;
    setBusyId(row.id);
    setError(null);
    try {
      await moderateAdminService(runtime, row.id, approve);
      setRows((previous) => previous.filter((item) => item.id !== row.id));
    } catch (cause) {
      setError(messageOf(cause, L(`${action} خدمت انجام نشد.`)));
    } finally {
      setBusyId(null);
    }
  }

  const pageValue = rows.reduce((sum, row) => sum + row.price, 0);

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, minWidth: 0 }}>
        <AdminTile icon="book" label={L("در انتظار بررسی")} value={faNumber(rows.length)} tone={rows.length ? "gold" : "olive"} />
        <AdminTile icon="coins" label={L("ارزش صف بررسی")} value={faToman(pageValue)} tone="clay" />
        <AdminTile icon="shield" label={L("سیاست انتشار")} value={L("بررسی ← انتشار")} tone="info" />
      </div>

      {error ? <AdminError message={error} onRetry={() => void fetchRows()} /> : null}

      <AdminPanel>
        <AdminSectionHead
          title={L("صف بررسی خدمات")}
          description={L("خدمت تازه یا ویرایش‌شده فقط بعد از بررسی مدیر قابل رزرو می‌شود.")}
          action={<AdminBadge tone={rows.length ? "gold" : "green"}>{rows.length ? L("نیازمند اقدام") : L("صف خالی")}</AdminBadge>}
        />

        {loading ? (
          <div style={{ display: "grid", gap: 10 }}>
            {Array.from({ length: 3 }).map((_, index) => (
              <span key={index} className="vodda-skeleton" style={{ height: 76, borderRadius: 14, display: "block" }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <AdminEmpty icon="checkCircle" title={L("خدمت در انتظار بررسی وجود ندارد")} description={L("همهٔ خدمات جدید تعیین تکلیف شده‌اند.")} />
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((row) => {
              const busy = busyId === row.id;
              return (
                <div key={row.id} style={{ display: "grid", gap: 9, padding: "11px 12px", borderRadius: 14, background: colors.surfaceSoft, border: `1px solid ${colors.sand150}`, opacity: busy ? 0.55 : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span aria-hidden="true" style={{ width: 42, height: 42, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 13, background: gradients.soft, border: `1px solid ${colors.olive100}`, color: colors.olive700 }}>
                      <Icon name="book" size={19} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                        <strong style={{ fontSize: 13, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.title}</strong>
                        <AdminBadge tone="gold">{L("در انتظار تأیید")}</AdminBadge>
                      </div>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: colors.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.teacherName}{[row.teacherTag, row.teacherCity].filter(Boolean).length ? ` · ${[row.teacherTag, row.teacherCity].filter(Boolean).join(" · ")}` : ""}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, fontWeight: 700, color: colors.inkMuted }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="clock" size={12} />{faNumber(row.duration)} دقیقه</span>
                        <span style={{ fontWeight: 800, color: colors.olive700 }}>{faToman(row.price)}</span>
                        <span>#{faNumber(row.id)}</span>
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void moderate(row, true)}
                      className="vodda-tappable"
                      style={{ flex: "1 1 120px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 12, border: 0, background: "linear-gradient(145deg, #43b07f, #2e8f5c)", color: "#ffffff", fontSize: 12.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}
                    >
                      <Icon name="check" size={15} />
                      {busy ? L("در حال ثبت…") : L("تأیید و انتشار")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void moderate(row, false)}
                      className="vodda-tappable"
                      style={{ flex: "1 1 110px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 12, border: `1px solid ${colors.sand200}`, background: colors.surface, color: colors.danger, fontSize: 12.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}
                    >
                      <Icon name="x" size={15} />
                      {L("رد و حذف")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
