"use client";

/* بلاگ — هم‌ارز کامل صفحهٔ ادمین/بلاگ پنل وب:
 * آمار مقالات، فیلتر وضعیت، جست‌وجو، انتشار/بازگشت به پیش‌نویس،
 * ویرایشگر کامل (عنوان، اسلاگ، خلاصه، متن، دسته، تصویر کاور) و حذف. */

import { useCallback, useEffect, useRef, useState } from "react";
import { confirmDialog } from "@/lib/confirm";
import { usePlatform } from "../../../platform/context";
import { Icon, Sheet, colors, typography } from "../../../ui";
import { useAppearance } from "../../../ui/appearance";
import { messageOf } from "../../../ui/errorMessage";
import { showToast } from "../../../ui/toast";
import {
  deleteAdminPost,
  fetchAdminPost,
  fetchAdminPostStats,
  fetchAdminPosts,
  saveAdminPost,
  uploadAdminPostCover,
  type AdminPostRow,
  type AdminPostStats,
} from "../api";
import {
  AdminBadge,
  AdminChip,
  AdminEmpty,
  AdminError,
  AdminLoadMore,
  AdminPanel,
  AdminTile,
  faDate,
  faNumber,
} from "../AdminUI";

const PAGE_SIZE = 20;

const STATUS_TABS = [
  { value: "", label: "همه" },
  { value: "published", label: "منتشرشده" },
  { value: "draft", label: "پیش‌نویس" },
];

type PostForm = {
  id: number | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  category: string;
  status: "draft" | "published";
};

const EMPTY_FORM: PostForm = { id: null, title: "", slug: "", excerpt: "", content: "", coverUrl: "", category: "", status: "draft" };

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function AdminBlogSection() {
  const runtime = usePlatform();
  const { L } = useAppearance();

  const [rows, setRows] = useState<AdminPostRow[]>([]);
  const [stats, setStats] = useState<AdminPostStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [form, setForm] = useState<PostForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchRows = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminPosts(runtime, {
        status: status || undefined,
        q: debouncedQuery || undefined,
        limit: PAGE_SIZE,
        offset: targetPage * PAGE_SIZE,
      });
      setRows((previous) => (append ? [...previous, ...list.rows] : list.rows));
      setTotal(list.total);
      setPage(targetPage);
    } catch (cause) {
      setError(messageOf(cause, L("فهرست مقالات دریافت نشد.")));
    } finally {
      setLoading(false);
    }
  }, [runtime, status, debouncedQuery, L]);

  const loadStats = useCallback(async () => {
    setStats(await fetchAdminPostStats(runtime));
  }, [runtime]);

  useEffect(() => {
    void fetchRows(0, false);
  }, [fetchRows]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  async function openEditor(row?: AdminPostRow) {
    if (row) {
      setForm({ id: row.id, title: row.title, slug: row.slug, excerpt: row.excerpt, content: "", coverUrl: row.coverUrl, category: row.category, status: row.status });
      // متن کامل پس از باز شدن ویرایشگر می‌آید
      fetchAdminPost(runtime, row.id)
        .then((detail) => {
          if (detail) setForm((current) => (current && current.id === row.id ? { ...current, content: detail.content } : current));
        })
        .catch(() => undefined);
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }

  async function save() {
    if (!form || saving) return;
    if (form.title.trim().length < 3) {
      setError(L("عنوان مقاله باید حداقل ۳ نویسه باشد."));
      return;
    }
    if (form.status === "published" && form.content.trim().length < 20) {
      setError(L("برای انتشار، متن مقاله لازم است."));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveAdminPost(runtime, form);
      setForm(null);
      showToast(form.id ? L("مقاله به‌روزرسانی شد.") : L("مقاله جدید ذخیره شد."), "success");
      await Promise.all([fetchRows(0, false), loadStats()]);
    } catch (cause) {
      setError(messageOf(cause, L("ذخیره مقاله انجام نشد.")));
    } finally {
      setSaving(false);
    }
  }

  async function setStatusOn(row: AdminPostRow, next: "draft" | "published") {
    if (busyId !== null) return;
    setBusyId(row.id);
    setError(null);
    try {
      const detail = await fetchAdminPost(runtime, row.id);
      const content = detail?.content ?? "";
      if (next === "published" && content.trim().length < 20) {
        setError(L("برای انتشار، متن مقاله لازم است."));
        return;
      }
      await saveAdminPost(runtime, {
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        content,
        coverUrl: row.coverUrl,
        category: row.category,
        status: next,
      });
      showToast(next === "published" ? L("مقاله منتشر شد.") : L("مقاله به پیش‌نویس بازگشت."), "success");
      await Promise.all([fetchRows(page, false), loadStats()]);
    } catch (cause) {
      setError(messageOf(cause, L("تغییر وضعیت مقاله انجام نشد.")));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: AdminPostRow) {
    if (busyId !== null) return;
    if (!(await confirmDialog(`حذف «${row.title}» بازگشت‌پذیر نیست. ادامه می‌دهید؟`, { danger: true, confirmLabel: L("حذف") }))) return;
    setBusyId(row.id);
    setError(null);
    try {
      await deleteAdminPost(runtime, row.id);
      showToast(L("مقاله حذف شد."), "success");
      await Promise.all([fetchRows(page, false), loadStats()]);
    } catch (cause) {
      setError(messageOf(cause, L("حذف مقاله انجام نشد.")));
    } finally {
      setBusyId(null);
    }
  }

  async function uploadCover(file: File) {
    if (!form) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadAdminPostCover(runtime, file);
      setForm((current) => (current ? { ...current, coverUrl: url } : current));
    } catch (cause) {
      setError(messageOf(cause, L("بارگذاری تصویر انجام نشد.")));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, minWidth: 0 }}>
        <AdminTile icon="doc" label={L("کل مقالات")} value={faNumber(stats?.total ?? total)} />
        <AdminTile icon="checkCircle" label={L("منتشرشده")} value={faNumber(stats?.published ?? 0)} tone="olive" />
        <AdminTile icon="edit" label={L("پیش‌نویس")} value={faNumber(stats?.drafts ?? 0)} tone="gold" />
        <AdminTile icon="trending" label={L("بازدید کل")} value={faNumber(stats?.views ?? 0)} tone="info" />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {STATUS_TABS.map((tab) => (
          <AdminChip key={tab.value} active={status === tab.value} label={L(tab.label)} onClick={() => setStatus(tab.value)} />
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
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
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={L("جستجوی مقاله…")}
            aria-label={L("جستجوی مقاله")}
            style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 600, outline: "none" }}
          />
        </label>
        <button
          type="button"
          onClick={() => void openEditor()}
          className="vodda-tappable"
          style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 12, border: 0, background: colors.olive600, color: "#fffaf0", fontSize: 12, fontWeight: 800, fontFamily: typography.fontFamily, cursor: "pointer" }}
        >
          <Icon name="plus" size={15} />
          {L("مقاله جدید")}
        </button>
      </div>

      {error ? <AdminError message={error} /> : null}

      {loading && rows.length === 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className="vodda-skeleton" style={{ height: 84, borderRadius: 16, display: "block" }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <AdminEmpty icon="doc" title={query || status ? L("مقاله‌ای با این فیلترها یافت نشد") : L("هنوز مقاله‌ای ثبت نشده است")} />
      ) : (
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          {rows.map((row) => {
            const busy = busyId === row.id;
            return (
              <AdminPanel key={row.id} style={{ padding: 14, gap: 9, opacity: busy ? 0.55 : 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
                  <span aria-hidden="true" style={{ width: 40, height: 40, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: 12, background: colors.goldBackground, border: "1px solid rgba(191,149,64,.35)", color: colors.goldDark }}>
                    <Icon name="doc" size={18} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 3 }}>
                    <strong style={{ fontSize: 13, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{L(row.title)}</strong>
                    {row.category ? <span style={{ fontSize: 10, fontWeight: 700, color: colors.inkMuted }}>{row.category} · {faNumber(row.readMinutes)} دقیقه مطالعه · {faNumber(row.views)} بازدید</span> : null}
                    <span dir="ltr" style={{ fontSize: 9.5, fontWeight: 600, color: colors.inkFaint, textAlign: "end" }}>/{row.slug}</span>
                  </div>
                  <AdminBadge tone={row.status === "published" ? "green" : "gold"}>{row.status === "published" ? L("منتشرشده") : L("پیش‌نویس")}</AdminBadge>
                </div>
                {row.excerpt ? (
                  <span style={{ display: "-webkit-box", fontSize: 11, fontWeight: 600, color: colors.inkSecondary, lineHeight: 1.8, overflow: "hidden", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } as React.CSSProperties}>{row.excerpt}</span>
                ) : null}
                <span style={{ fontSize: 9.5, fontWeight: 700, color: colors.inkMuted }}>{row.publishedAt ? `${L("انتشار")}: ${faDate(row.publishedAt)}` : `${L("ایجاد")}: ${faDate(row.createdAt)}`}</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => void openEditor(row)}
                    className="vodda-tappable"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 11px", borderRadius: 11, border: `1px solid ${colors.olive100}`, background: colors.olive50, color: colors.olive700, fontSize: 11, fontWeight: 800, fontFamily: typography.fontFamily, cursor: "pointer" }}
                  >
                    <Icon name="edit" size={13} />
                    {L("ویرایش")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void setStatusOn(row, row.status === "published" ? "draft" : "published")}
                    className="vodda-tappable"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 11px", borderRadius: 11, border: `1px solid ${colors.sand200}`, background: colors.surface, color: colors.inkMuted, fontSize: 11, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busy ? "wait" : "pointer" }}
                  >
                    <Icon name={row.status === "published" ? "refresh" : "checkCircle"} size={13} />
                    {row.status === "published" ? L("بازگشت به پیش‌نویس") : L("انتشار")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(row)}
                    aria-label={L("حذف مقاله")}
                    className="vodda-tappable"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 11px", borderRadius: 11, border: `1px solid rgba(166,81,81,.35)`, background: colors.dangerBackground, color: colors.danger, fontSize: 11, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busy ? "wait" : "pointer" }}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </AdminPanel>
            );
          })}
          <AdminLoadMore total={total} shown={rows.length} loading={loading} onLoadMore={() => void fetchRows(page + 1, true)} />
        </div>
      )}

      {/* ویرایشگر مقاله */}
      <Sheet open={form !== null} onClose={() => setForm(null)} title={form?.id ? L("ویرایش مقاله") : L("مقاله جدید")}>
        {form ? (
          <div style={{ display: "grid", gap: 10, paddingBottom: 12 }}>
            {error ? <AdminError message={error} /> : null}

            <label style={{ display: "grid", gap: 6, fontSize: 11.5, fontWeight: 800, color: colors.ink }}>
              {L("عنوان مقاله")}
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder={L("مثلاً فضیلت تلاوت قرآن در ماه مبارک رمضان")}
                style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 700, outline: "none" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 11.5, fontWeight: 800, color: colors.ink }}>
              {L("نشانی کوتاه (اسلاگ) — اختیاری")}
              <input
                value={form.slug}
                dir="ltr"
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
                placeholder={L("فضیلت-تلاوت")}
                style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 700, outline: "none", textAlign: "left" }}
              />
              <small style={{ fontSize: 9.5, fontWeight: 600, color: colors.inkMuted }}>{form.title && !form.slug ? slugify(form.title) : ""}</small>
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 11.5, fontWeight: 800, color: colors.ink }}>
              {L("خلاصه")}
              <textarea
                value={form.excerpt}
                onChange={(event) => setForm({ ...form, excerpt: event.target.value })}
                rows={2}
                style={{ minHeight: 64, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 600, resize: "vertical", outline: "none" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 11.5, fontWeight: 800, color: colors.ink }}>
              {L("متن کامل مقاله")}
              <textarea
                value={form.content}
                onChange={(event) => setForm({ ...form, content: event.target.value })}
                rows={8}
                style={{ minHeight: 180, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 600, lineHeight: 2, resize: "vertical", outline: "none" }}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, minWidth: 0 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 11.5, fontWeight: 800, color: colors.ink }}>
                {L("دسته‌بندی")}
                <input
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  placeholder={L("مثلاً آموزش")}
                  style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 700, outline: "none" }}
                />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 11.5, fontWeight: 800, color: colors.ink }}>
                {L("وضعیت")}
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value === "published" ? "published" : "draft" })}
                  style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 700 }}
                >
                  <option value="draft">{L("پیش‌نویس")}</option>
                  <option value="published">{L("منتشرشده")}</option>
                </select>
              </label>
            </div>

            {/* کاور */}
            <div style={{ display: "grid", gap: 7 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: colors.ink }}>{L("تصویر کاور")}</span>
              {form.coverUrl ? (
                <img src={form.coverUrl} alt={L("کاور مقاله")} style={{ width: "100%", maxHeight: 160, borderRadius: 13, objectFit: "cover" }} />
              ) : null}
              <input
                value={form.coverUrl}
                dir="ltr"
                onChange={(event) => setForm({ ...form, coverUrl: event.target.value })}
                placeholder={L("آدرس تصویر یا بارگذاری فایل")}
                style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: 700, outline: "none", textAlign: "left" }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="vodda-tappable"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 12, border: `1px dashed ${colors.sand200}`, background: colors.surfaceSoft, color: colors.olive700, fontSize: 12, fontWeight: 800, fontFamily: typography.fontFamily, cursor: uploading ? "wait" : "pointer" }}
              >
                <Icon name="download" size={14} />
                {uploading ? L("در حال بارگذاری…") : L("بارگذاری تصویر از دستگاه")}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) void uploadCover(file);
                }}
              />
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="vodda-tappable"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 14px", borderRadius: 13, border: 0, background: "linear-gradient(145deg, #43b07f, #2e8f5c)", color: "#ffffff", fontSize: 13, fontWeight: 800, fontFamily: typography.fontFamily, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}
            >
              <Icon name="check" size={15} />
              {saving ? L("در حال ذخیره…") : L("ذخیره مقاله")}
            </button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
