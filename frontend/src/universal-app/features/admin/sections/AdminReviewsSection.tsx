"use client";

/* نظرات قرآن‌آموزان — هم‌ارز صفحهٔ ادمین/نظرات پنل وب:
 * فیلتر امتیاز، آمار صفحه، شیت جزئیات با متن کامل و حذف نظر
 * (امتیاز استاد بازمحاسبه و جلسه برای نظر تازه باز می‌شود). */

import { useCallback, useEffect, useState } from "react";
import { confirmDialog } from "@/lib/confirm";
import { usePlatform } from "../../../platform/context";
import { Icon, Sheet, colors, gradients, typography } from "../../../ui";
import { useAppearance } from "../../../ui/appearance";
import { messageOf } from "../../../ui/errorMessage";
import { deleteAdminReview, fetchAdminReviews, type AdminReviewRow } from "../api";
import {
  AdminChip,
  AdminEmpty,
  AdminError,
  AdminKeyValue,
  AdminLoadMore,
  AdminPanel,
  AdminTile,
  faDate,
  faNumber,
} from "../AdminUI";

const PAGE_SIZE = 30;

const RATING_FILTERS = [
  { value: "", label: "همه" },
  { value: "low", label: "امتیاز پایین" },
  { value: "high", label: "امتیاز بالا" },
];

export function AdminReviewsSection() {
  const runtime = usePlatform();
  const { L } = useAppearance();

  const [rows, setRows] = useState<AdminReviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [ratingFilter, setRatingFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AdminReviewRow | null>(null);

  const fetchRows = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminReviews(runtime, PAGE_SIZE, targetPage * PAGE_SIZE);
      setRows((previous) => (append ? [...previous, ...list.rows] : list.rows));
      setTotal(list.total);
      setPage(targetPage);
    } catch (cause) {
      setError(messageOf(cause, L("فهرست نظرات دریافت نشد.")));
    } finally {
      setLoading(false);
    }
  }, [runtime, L]);

  useEffect(() => {
    void fetchRows(0, false);
  }, [fetchRows]);

  async function removeReview(row: AdminReviewRow) {
    if (busyId !== null) return;
    if (!(await confirmDialog(L("حذف نظر بازگشت‌پذیر نیست؛ امتیاز استاد بازمحاسبه و جلسه برای ثبت نظر تازه باز می‌شود. ادامه می‌دهید؟"), { danger: true, confirmLabel: L("حذف") }))) return;
    setBusyId(row.id);
    setError(null);
    try {
      await deleteAdminReview(runtime, row.id);
      setRows((previous) => previous.filter((item) => item.id !== row.id));
      setTotal((current) => Math.max(0, current - 1));
      setSelected(null);
    } catch (cause) {
      setError(messageOf(cause, L("حذف نظر انجام نشد.")));
    } finally {
      setBusyId(null);
    }
  }

  const filtered = rows.filter((row) => {
    if (ratingFilter === "low") return row.rating <= 3;
    if (ratingFilter === "high") return row.rating >= 4;
    return true;
  });
  const lowCount = rows.filter((row) => row.rating <= 3).length;
  const pageAvg = filtered.length ? filtered.reduce((sum, row) => sum + row.rating, 0) / filtered.length : 0;

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10, minWidth: 0 }}>
        <AdminTile icon="star" label={L("نظرات ثبت‌شده")} value={faNumber(total)} tone="gold" />
        <AdminTile icon="trending" label={L("نیازمند توجه")} value={faNumber(lowCount)} tone={lowCount ? "rose" : "olive"} hint={L("امتیاز ۳ یا کمتر")} />
        <AdminTile icon="checkCircle" label={L("میانگین صفحه")} value={faNumber(pageAvg, 1)} hint={L("از ۵ در این صفحه")} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {RATING_FILTERS.map((filter) => (
          <AdminChip key={filter.value} active={ratingFilter === filter.value} label={L(filter.label)} onClick={() => setRatingFilter(filter.value)} />
        ))}
      </div>

      {error ? <AdminError message={error} onRetry={() => void fetchRows(0, false)} /> : null}

      {loading && rows.length === 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className="vodda-skeleton" style={{ height: 76, borderRadius: 16, display: "block" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <AdminEmpty icon="star" title={L("نظری برای نمایش نیست")} description={ratingFilter ? L("فیلتر امتیاز را تغییر دهید.") : L("با ثبت جلسات برگزارشده، نظرات اینجا دیده می‌شود.")} />
      ) : (
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          {filtered.map((row) => {
            const busy = busyId === row.id;
            return (
              <AdminPanel key={row.id} style={{ padding: 14, gap: 9, opacity: busy ? 0.55 : 1 }}>
                <button
                  type="button"
                  onClick={() => setSelected(row)}
                  className="vodda-tappable"
                  style={{ display: "grid", gap: 8, minWidth: 0, width: "100%", border: 0, background: "transparent", padding: 0, textAlign: "start", cursor: "pointer", fontFamily: typography.fontFamily }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span aria-hidden="true" style={{ width: 38, height: 38, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", background: gradients.soft, border: `1px solid ${colors.olive100}`, color: colors.olive700 }}>
                      <Icon name="user" size={17} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
                      <strong style={{ fontSize: 12.5, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{L(row.learnerName)}</strong>
                      <span style={{ fontSize: 10, fontWeight: 600, color: colors.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {L("استاد")}: {row.teacherName}{row.teacherField ? ` · ${row.teacherField}` : ""}
                      </span>
                    </span>
                    <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, color: colors.goldDark }}>
                      <Icon name="star" size={13} fill />
                      <strong style={{ fontSize: 12.5, fontWeight: 900 }}>{faNumber(row.rating)}</strong>
                    </span>
                  </span>
                  {row.text ? (
                    <span
                      style={{
                        display: "-webkit-box",
                        fontSize: 11,
                        fontWeight: 600,
                        color: colors.inkSecondary,
                        lineHeight: 1.9,
                        overflow: "hidden",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      } as React.CSSProperties}
                    >
                      {row.text}
                    </span>
                  ) : null}
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 9.5, fontWeight: 700, color: colors.inkMuted }}>
                    {faDate(row.createdAt)}
                    <span>·</span>
                    {L("جلسه")} #{faNumber(row.sessionId)}
                  </span>
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSelected(row)}
                    className="vodda-tappable"
                    style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 12px", borderRadius: 12, border: `1px solid ${colors.olive100}`, background: colors.olive50, color: colors.olive700, fontSize: 11.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: "pointer" }}
                  >
                    <Icon name="doc" size={14} />
                    {L("جزئیات")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeReview(row)}
                    className="vodda-tappable"
                    style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 12px", borderRadius: 12, border: `1px solid rgba(166,81,81,.35)`, background: colors.dangerBackground, color: colors.danger, fontSize: 11.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}
                  >
                    <Icon name="trash" size={14} />
                    {busy ? "…" : L("حذف")}
                  </button>
                </div>
              </AdminPanel>
            );
          })}
          <AdminLoadMore total={total} shown={rows.length} loading={loading} onLoadMore={() => void fetchRows(page + 1, true)} />
        </div>
      )}

      <Sheet open={selected !== null} onClose={() => setSelected(null)} title={L("جزئیات نظر")}>
        {selected ? (
          <div style={{ display: "grid", gap: 4, paddingBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0 12px" }}>
              <span aria-hidden="true" style={{ width: 46, height: 46, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", background: gradients.soft, border: `1px solid ${colors.olive100}`, color: colors.olive700 }}>
                <Icon name="user" size={21} />
              </span>
              <div style={{ display: "grid", gap: 3 }}>
                <strong style={{ fontSize: 13.5, fontWeight: 800, color: colors.ink }}>{L(selected.learnerName)}</strong>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: colors.goldDark }}>
                  <Icon name="star" size={13} fill />
                  <strong style={{ fontSize: 12.5 }}>{faNumber(selected.rating)}</strong>
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: colors.inkMuted }}>{L("از ۵")}</span>
                </span>
              </div>
            </div>
            <AdminKeyValue label={L("استاد")}>{selected.teacherName}{selected.teacherField ? ` · ${selected.teacherField}` : ""}</AdminKeyValue>
            <AdminKeyValue label={L("جلسه")}>#{faNumber(selected.sessionId)}</AdminKeyValue>
            <AdminKeyValue label={L("تاریخ")}>{faDate(selected.createdAt)}</AdminKeyValue>
            <p style={{ margin: "12px 0 0", padding: "12px 14px", borderRadius: 13, background: colors.surfaceSoft, color: colors.inkSecondary, fontSize: 12, lineHeight: 2, whiteSpace: "pre-wrap", fontWeight: 600 }}>
              {selected.text || L("متن نظر ثبت نشده است.")}
            </p>
            <button
              type="button"
              disabled={busyId === selected.id}
              onClick={() => void removeReview(selected)}
              className="vodda-tappable"
              style={{ marginTop: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 12px", borderRadius: 12, border: `1px solid rgba(166,81,81,.35)`, background: colors.dangerBackground, color: colors.danger, fontSize: 12.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busyId === selected.id ? "wait" : "pointer", opacity: busyId === selected.id ? 0.7 : 1 }}
            >
              <Icon name="trash" size={15} />
              {busyId === selected.id ? L("در حال حذف…") : L("حذف نظر")}
            </button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
