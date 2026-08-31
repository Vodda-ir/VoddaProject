"use client";

import { useCallback, useEffect, useState } from "react";
import { asArray, asInteger, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import type { PlatformRuntime } from "../../platform/types";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Sheet,
  colors,
  radii,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { formatWalletAmount, toFaDigits } from "../wallet/WalletTransactionCard";

type UnknownRecord = Record<string, unknown>;

type TeacherService = {
  id: number;
  title: string;
  duration: number;
  price: number;
  active: boolean;
};

type ServiceDraft = {
  title: string;
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

async function createService(runtime: PlatformRuntime, draft: { title: string; duration: number; price: number }) {
  return runtime.request<ApiEnvelope<unknown>>("/teacher/services", {
    method: "POST",
    body: JSON.stringify({ ...draft, icon: "" }),
  });
}

async function updateService(
  runtime: PlatformRuntime,
  id: number,
  draft: Partial<{ title: string; duration: number; price: number; active: false }>,
) {
  return runtime.request<ApiEnvelope<unknown>>(`/teacher/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(draft),
  });
}

async function deleteService(runtime: PlatformRuntime, id: number) {
  return runtime.request<ApiEnvelope<unknown>>(`/teacher/services/${id}`, { method: "DELETE" });
}

const emptyDraft: ServiceDraft = { title: "", duration: "30", price: "" };

export function TeacherServicesScreen() {
  const runtime = usePlatform();
  const [services, setServices] = useState<TeacherService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | "new" | null>(null);
  const [editorTarget, setEditorTarget] = useState<TeacherService | "new" | null>(null);
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);
  const [formError, setFormError] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<TeacherService | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeacherService | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setServices(await getServices(runtime));
    } catch (loadError) {
      setServices([]);
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
  }, [load]);

  function openEditor(service?: TeacherService) {
    setEditorTarget(service ?? "new");
    setDraft(
      service
        ? { title: service.title, duration: String(service.duration), price: String(service.price) }
        : emptyDraft,
    );
    setFormError(null);
  }

  function closeEditor() {
    if (busyId !== null) return;
    setEditorTarget(null);
    setFormError(null);
  }

  async function saveService() {
    if (!editorTarget || busyId !== null) return;
    const title = draft.title.trim();
    const duration = Number.parseInt(draft.duration.trim(), 10);
    const price = Number.parseInt(draft.price.trim(), 10);

    if (!title) {
      setFormError("عنوان خدمت را وارد کنید.");
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
        await createService(runtime, { title, duration, price });
      } else {
        await updateService(runtime, editorTarget.id, { title, duration, price });
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
    <section style={{ display: "grid", gap: spacing.lg }}>
      <header>
        <h1 style={{ ...typography.heading, margin: 0 }}>خدمات من</h1>
        <p style={{ ...typography.bodySmall, margin: `${spacing.xs}px 0 0`, color: colors.inkMuted, lineHeight: 1.9 }}>
          خدمت جدید یا ویرایش‌شده تا تأیید مدیر قابل رزرو نیست. استاد می‌تواند خدمت فعال را غیرفعال کند، اما فعال‌سازی مجدد فقط از مسیر moderation مدیریت انجام می‌شود.
        </p>
      </header>

      <Button fullWidth onClick={() => openEditor()}>افزودن خدمت جدید</Button>

      {loading ? <LoadingState label="در حال دریافت خدمات…" /> : null}
      {!loading && error ? (
        <ErrorState
          title="دریافت خدمات ناموفق بود"
          description={error}
          action={<Button onClick={() => void load()}>تلاش دوباره</Button>}
        />
      ) : null}
      {!loading && !error && services.length === 0 ? (
        <EmptyState title="هنوز خدمتی تعریف نشده است" description="برای شروع، اولین خدمت خود را ثبت کنید." />
      ) : null}

      {!loading && !error && services.length > 0 ? (
        <div style={{ display: "grid", gap: spacing.md }}>
          {services.map((service) => {
            const busy = busyId === service.id;
            return (
              <Card key={service.id} elevated style={{ display: "grid", gap: spacing.md, opacity: busy ? 0.55 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.md, alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ ...typography.body, display: "block" }}>{service.title}</strong>
                    <span style={{ ...typography.caption, color: colors.inkMuted }}>
                      {toFaDigits(service.duration)} دقیقه · {formatWalletAmount(service.price)} تومان
                    </span>
                  </div>
                  <span
                    style={{
                      ...typography.caption,
                      flexShrink: 0,
                      padding: "4px 9px",
                      borderRadius: radii.pill,
                      fontWeight: 700,
                      color: service.active ? colors.olive800 : colors.inkSecondary,
                      background: service.active ? colors.olive50 : colors.sand100,
                    }}
                  >
                    {service.active ? "فعال" : "غیرفعال / در انتظار تأیید"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: service.active ? "1fr 1fr" : "1fr", gap: spacing.sm }}>
                  <Button variant="secondary" disabled={busy} onClick={() => openEditor(service)}>ویرایش</Button>
                  {service.active ? (
                    <Button variant="secondary" disabled={busy} onClick={() => setDeactivateTarget(service)}>غیرفعال‌کردن</Button>
                  ) : null}
                </div>
                <Button variant="danger" fullWidth disabled={busy} onClick={() => setDeleteTarget(service)}>حذف خدمت</Button>
              </Card>
            );
          })}
        </div>
      ) : null}

      <Sheet open={editorTarget !== null} title={editorTarget === "new" ? "خدمت جدید" : "ویرایش خدمت"} onClose={closeEditor}>
        <div style={{ display: "grid", gap: spacing.md }}>
          <label style={{ display: "grid", gap: spacing.xs, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>عنوان</span>
            <input
              value={draft.title}
              maxLength={160}
              disabled={busyId !== null}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              style={{ width: "100%", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.sm, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily }}
            />
          </label>
          <label style={{ display: "grid", gap: spacing.xs, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>مدت (۱۰ تا ۲۴۰ دقیقه)</span>
            <input
              inputMode="numeric"
              value={draft.duration}
              disabled={busyId !== null}
              onChange={(event) => setDraft((current) => ({ ...current, duration: event.target.value.replace(/\D/g, "") }))}
              style={{ width: "100%", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.sm, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily }}
            />
          </label>
          <label style={{ display: "grid", gap: spacing.xs, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>قیمت (تومان)</span>
            <input
              inputMode="numeric"
              value={draft.price}
              disabled={busyId !== null}
              onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value.replace(/\D/g, "") }))}
              style={{ width: "100%", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.sm, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily }}
            />
          </label>
          {formError ? <span role="alert" style={{ ...typography.caption, color: colors.danger }}>{formError}</span> : null}
          <Button fullWidth loading={busyId !== null} onClick={() => void saveService()}>ذخیره و ارسال برای بررسی</Button>
        </div>
      </Sheet>

      <Dialog open={deactivateTarget !== null} title="غیرفعال‌کردن خدمت" onClose={() => { if (busyId === null) setDeactivateTarget(null); }}>
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>
          این خدمت غیرفعال می‌شود و فعال‌سازی مجدد نیازمند تأیید مدیر است.
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
