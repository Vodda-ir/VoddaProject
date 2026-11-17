"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { asArray, asInteger, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import type { PlatformRuntime } from "../../platform/types";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  IconBadge,
  LoadingState,
  colors,
  digitsOnly,
  radii,
  shadows,
  spacing,
  toFaDigits,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";

type UnknownRecord = Record<string, unknown>;

type TeacherService = {
  id: number;
  official_service_id: number | null;
  title: string;
  duration: number;
  price: number;
  active: boolean;
};

type OfficialServiceEntry = {
  id: number;
  category: string;
  title: string;
  description: string;
  icon?: string;
};

type ServiceDraft = {
  officialServiceId: number | null;
  duration: string;
  price: string;
};

function parseService(value: unknown): TeacherService | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = asInteger(row.id);
  if (id <= 0) return null;

  return {
    id,
    official_service_id: row.official_service_id == null ? null : asInteger(row.official_service_id) || null,
    title: asString(row.title, "خدمت"),
    duration: asInteger(row.duration, 30),
    price: asInteger(row.price),
    active: row.active === true,
  };
}

async function getServices(runtime: PlatformRuntime): Promise<TeacherService[]> {
  const response = await runtime.request<ApiEnvelope<UnknownRecord>>("/teacher/me");
  const payload = asRecord(response.data);
  return asArray(payload?.services).map(parseService).filter((item): item is TeacherService => item !== null);
}

async function createService(runtime: PlatformRuntime, draft: { official_service_id: number; duration: number; price: number }) {
  return runtime.request<ApiEnvelope<unknown>>("/teacher/services", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

async function updateService(
  runtime: PlatformRuntime,
  id: number,
  draft: Partial<{ official_service_id: number; duration: number; price: number; active: false }>,
) {
  return runtime.request<ApiEnvelope<unknown>>(`/teacher/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(draft),
  });
}

async function deleteService(runtime: PlatformRuntime, id: number) {
  return runtime.request<ApiEnvelope<unknown>>(`/teacher/services/${id}`, { method: "DELETE" });
}

async function getCatalog(runtime: PlatformRuntime): Promise<OfficialServiceEntry[]> {
  const response = await runtime.request<ApiEnvelope<UnknownRecord>>("/catalog/services");
  const payload = asRecord(response.data);
  const categories = asArray(payload?.categories);
  const entries: OfficialServiceEntry[] = [];
  for (const group of categories) {
    const row = asRecord(group);
    if (!row) continue;
    const category = asString(row.category, "خدمات رسمی");
    for (const item of asArray(row.services)) {
      const entry = asRecord(item);
      if (!entry) continue;
      const id = asInteger(entry.id);
      if (id <= 0) continue;
      entries.push({
        id,
        category,
        title: asString(entry.title, "خدمت رسمی"),
        description: asString(entry.description, ""),
        icon: entry.icon == null ? undefined : asString(entry.icon, undefined as unknown as string),
      });
    }
  }
  return entries;
}

const emptyDraft: ServiceDraft = { officialServiceId: null, duration: "30", price: "" };

export function TeacherServicesScreen() {
  const runtime = usePlatform();
  const [services, setServices] = useState<TeacherService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | "new" | null>(null);
  const [editorTarget, setEditorTarget] = useState<TeacherService | "new" | null>(null);
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);
  const [catalog, setCatalog] = useState<OfficialServiceEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<TeacherService | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeacherService | null>(null);

  // باگ refresh-loop: اجرای دوم StrictMode یا فراخوانی دیرهنگام نباید state را با دادهٔ کهنه بازنویسی کند.
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const isStale = () => loadGeneration.current !== generation;
    setLoading(true);
    setError(null);
    try {
      const rows = await getServices(runtime);
      if (isStale()) return;
      setServices(rows);
    } catch (loadError) {
      if (isStale()) return;
      setServices([]);
      setError(messageOf(loadError));
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedOfficial = draft.officialServiceId == null ? null : catalog.find((entry) => entry.id === draft.officialServiceId) ?? null;

  const filteredCatalog = (() => {
    const query = catalogQuery.trim().toLowerCase();
    if (!query) return catalog;
    return catalog.filter(
      (entry) => entry.title.toLowerCase().includes(query) || entry.description.toLowerCase().includes(query),
    );
  })();

  function openEditor(service?: TeacherService) {
    setEditorTarget(service ?? "new");
    setDraft(
      service
        ? { officialServiceId: service.official_service_id, duration: String(service.duration), price: String(service.price) }
        : emptyDraft,
    );
    setCatalogQuery("");
    setFormError(null);
    if (catalog.length === 0) {
      setCatalogLoading(true);
      getCatalog(runtime)
        .then((entries) => setCatalog(entries))
        .catch(() => setFormError("دریافت فهرست خدمات رسمی ناموفق بود."))
        .finally(() => setCatalogLoading(false));
    }
  }

  function closeEditor() {
    if (busyId !== null) return;
    setEditorTarget(null);
    setFormError(null);
  }

  async function saveService() {
    if (!editorTarget || busyId !== null) return;
    const duration = Number.parseInt(draft.duration.trim(), 10);
    const price = Number.parseInt(draft.price.trim(), 10);

    if (draft.officialServiceId == null) {
      setFormError("یک خدمت رسمی از فهرست انتخاب کنید.");
      return;
    }
    if (!Number.isFinite(duration) || duration < 10 || duration > 240) {
      setFormError("مدت خدمت باید بین ۱۰ تا ۲۴۰ دقیقه باشد.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setFormError("قیمت معتبر وارد کنید.");
      return;
    }

    const targetId = editorTarget === "new" ? "new" : editorTarget.id;
    setBusyId(targetId);
    setFormError(null);
    try {
      if (editorTarget === "new") {
        await createService(runtime, { official_service_id: draft.officialServiceId, duration, price });
      } else {
        await updateService(runtime, editorTarget.id, { official_service_id: draft.officialServiceId, duration, price });
      }
      setEditorTarget(null);
      await load();
    } catch (mutationError) {
      setFormError(messageOf(mutationError));
    } finally {
      setBusyId(null);
    }
  }

  async function deactivate() {
    if (!deactivateTarget || busyId !== null) return;
    const target = deactivateTarget;
    setBusyId(target.id);
    setDeactivateTarget(null);
    setError(null);
    try {
      // Deliberately never send active=true. Re-activation is an admin moderation action.
      await updateService(runtime, target.id, { active: false });
      await load();
    } catch (mutationError) {
      setError(messageOf(mutationError));
    } finally {
      setBusyId(null);
    }
  }

  async function remove() {
    if (!deleteTarget || busyId !== null) return;
    const target = deleteTarget;
    setBusyId(target.id);
    setDeleteTarget(null);
    setError(null);
    try {
      await deleteService(runtime, target.id);
      await load();
    } catch (mutationError) {
      setError(messageOf(mutationError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <p style={{ ...typography.bodySmall, margin: 0, color: colors.inkMuted, lineHeight: 1.9 }}>
        عنوان خدمت‌ها فقط از میان خدمات رسمی تأییدشدهٔ وُدّا انتخاب می‌شود؛ خدمت ثبت‌شده بلافاصله فعال و قابل رزرو است.
      </p>

      {loading ? <LoadingState label="در حال دریافت خدمات…" /> : null}
      {!loading && error ? (
        <ErrorState
          title="دریافت خدمات ناموفق بود"
          description={error}
          action={<Button onClick={() => void load()}>تلاش دوباره</Button>}
        />
      ) : null}
      {!loading && !error && services.length === 0 ? (
        <EmptyState icon={<Icon name="book" size={30} />} title="هنوز خدمتی تعریف نشده است" description="برای شروع، اولین خدمت خود را ثبت کنید." />
      ) : null}

      {!loading && !error && services.length > 0 ? (
        <div style={{ display: "grid", gap: spacing.md }}>
          {services.map((service) => {
            const busy = busyId === service.id;
            return (
              <Card key={service.id} className="vodda-card--interactive" style={{ display: "grid", gap: 12, padding: 14, borderRadius: 18, boxShadow: "0 0 4px rgba(46,54,34,.04)", opacity: busy ? 0.55 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.md, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0, flex: 1, display: "flex", alignItems: "center", gap: spacing.md }}><IconBadge icon="book" tone={service.active ? "olive" : "info"} size={46} /><div style={{ minWidth: 0 }}>
                    <strong style={{ ...typography.body, display: "block" }}>{service.title}</strong>
                    <span style={{ ...typography.caption, color: colors.inkMuted }}>
                      {toFaDigits(service.duration)} دقیقه · {formatWalletAmount(service.price)} تومان
                    </span>
                  </div></div>
                  <span
                    style={{
                      flexShrink: 0,
                      padding: "3px 8px",
                      borderRadius: radii.pill,
                      fontSize: 10,
                      fontWeight: 700,
                      color: service.active ? colors.olive700 : colors.gold,
                      background: service.active ? colors.olive100 : colors.goldBackground,
                    }}
                  >
                    {service.active ? "فعال" : "غیرفعال"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Button variant="secondary" disabled={busy} onClick={() => openEditor(service)} style={{ minHeight: 40, flex: 1, padding: "7px 12px", fontSize: 13 }}>
                    <Icon name="edit" size={16} />
                    ویرایش
                  </Button>
                  {service.active ? (
                    <Button variant="secondary" disabled={busy} onClick={() => setDeactivateTarget(service)} style={{ minHeight: 40, flex: 1, padding: "7px 10px", fontSize: 13 }}>
                      غیرفعال‌کردن
                    </Button>
                  ) : null}
                  <button
                    type="button"
                    aria-label="حذف خدمت"
                    disabled={busy}
                    onClick={() => setDeleteTarget(service)}
                    style={{
                      width: 40,
                      height: 40,
                      display: "grid",
                      placeItems: "center",
                      flex: "0 0 40px",
                      border: 0,
                      borderRadius: "50%",
                      color: colors.danger,
                      background: "transparent",
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    <Icon name="trash" size={19} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}

      <div style={{ position: "sticky", zIndex: 12, bottom: "calc(68px + env(safe-area-inset-bottom))", padding: "10px 0 12px", background: colors.sand50 }}>
        <Button fullWidth onClick={() => openEditor()} style={{ minHeight: 52 }}>
          <Icon name="plus" size={19} />
          افزودن خدمت جدید
        </Button>
      </div>

      <Dialog open={editorTarget !== null} title={editorTarget === "new" ? "خدمت جدید" : "ویرایش خدمت"} onClose={closeEditor}>
        <div style={{ display: "grid", gap: spacing.md }}>
          {selectedOfficial ? (
            <div style={{ border: `1.5px solid ${colors.olive200}`, background: colors.olive50, borderRadius: radii.lg, padding: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <IconBadge icon={(selectedOfficial.icon as "book") || "book"} tone="olive" size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ ...typography.body, display: "block" }}>{selectedOfficial.title}</strong>
                {selectedOfficial.description ? (
                  <span style={{ ...typography.caption, color: colors.inkMuted, display: "block", marginTop: 3, lineHeight: 1.7 }}>{selectedOfficial.description}</span>
                ) : null}
                <span style={{ display: "inline-block", marginTop: 6, fontSize: 10, fontWeight: 700, color: colors.olive700, background: colors.olive100, borderRadius: radii.pill, padding: "3px 10px" }}>{selectedOfficial.category}</span>
              </div>
              <button type="button" onClick={() => setDraft((current) => ({ ...current, officialServiceId: null }))} style={{ border: 0, background: "transparent", color: colors.olive700, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>تغییر</button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: spacing.sm }}>
              <span style={{ fontWeight: 700, ...typography.bodySmall }}>انتخاب خدمت رسمی</span>
              <input
                value={catalogQuery}
                placeholder="جستجو میان خدمات رسمی…"
                onChange={(event) => setCatalogQuery(event.target.value)}
                style={{ width: "100%", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.md, background: colors.surface, color: colors.ink, boxShadow: shadows.xs, fontFamily: typography.fontFamily }}
              />
              <div style={{ maxHeight: 240, overflowY: "auto", border: `1px solid ${colors.sand200}`, borderRadius: radii.lg, padding: 8, display: "grid", gap: 6, background: colors.surface }}>
                {catalogLoading ? <span style={{ ...typography.caption, color: colors.inkMuted, padding: 12, textAlign: "center" }}>در حال دریافت خدمات رسمی…</span> : null}
                {!catalogLoading && filteredCatalog.length === 0 ? <span style={{ ...typography.caption, color: colors.inkMuted, padding: 12, textAlign: "center" }}>خدمتی یافت نشد.</span> : null}
                {filteredCatalog.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, officialServiceId: entry.id }))}
                    style={{ display: "flex", gap: 10, alignItems: "center", width: "100%", textAlign: "right", border: `1px solid ${colors.sand200}`, borderRadius: radii.md, background: colors.sand50, padding: "9px 12px", cursor: "pointer", fontFamily: typography.fontFamily }}
                  >
                    <IconBadge icon={(entry.icon as "book") || "book"} tone="olive" size={34} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ ...typography.bodySmall, display: "block" }}>{entry.title}</strong>
                      <span style={{ ...typography.caption, color: colors.inkMuted, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.description}</span>
                    </span>
                    <span style={{ ...typography.caption, color: colors.olive700, flexShrink: 0 }}>{entry.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <label style={{ display: "grid", gap: spacing.xs, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>مدت (۱۰ تا ۲۴۰ دقیقه)</span>
            <input
              inputMode="numeric"
              value={toFaDigits(draft.duration)}
              disabled={busyId !== null}
              onChange={(event) => setDraft((current) => ({ ...current, duration: digitsOnly(event.target.value) }))}
              style={{ width: "100%", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.md, background: colors.surface, color: colors.ink, boxShadow: shadows.xs, fontFamily: typography.fontFamily }}
            />
          </label>
          <label style={{ display: "grid", gap: spacing.xs, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>قیمت (تومان)</span>
            <input
              inputMode="numeric"
              value={toFaDigits(draft.price)}
              disabled={busyId !== null}
              onChange={(event) => setDraft((current) => ({ ...current, price: digitsOnly(event.target.value) }))}
              style={{ width: "100%", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.md, background: colors.surface, color: colors.ink, boxShadow: shadows.xs, fontFamily: typography.fontFamily }}
            />
          </label>
          {formError ? <span role="alert" style={{ ...typography.caption, color: colors.danger }}>{formError}</span> : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
            <Button variant="ghost" disabled={busyId !== null} onClick={closeEditor}>انصراف</Button>
            <Button loading={busyId !== null} onClick={() => void saveService()}>ذخیره</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={deactivateTarget !== null} title="غیرفعال‌کردن خدمت" onClose={() => { if (busyId === null) setDeactivateTarget(null); }}>
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>
          این خدمت غیرفعال می‌شود و تا فعال‌سازی مجدد قابل رزرو نیست.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" disabled={busyId !== null} onClick={() => setDeactivateTarget(null)}>انصراف</Button>
          <Button loading={busyId !== null} onClick={() => void deactivate()}>غیرفعال‌کردن</Button>
        </div>
      </Dialog>

      <Dialog open={deleteTarget !== null} title="حذف خدمت" onClose={() => { if (busyId === null) setDeleteTarget(null); }}>
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>این خدمت حذف شود؟</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" disabled={busyId !== null} onClick={() => setDeleteTarget(null)}>انصراف</Button>
          <Button variant="danger" loading={busyId !== null} onClick={() => void remove()}>حذف</Button>
        </div>
      </Dialog>
    </section>
  );
}
