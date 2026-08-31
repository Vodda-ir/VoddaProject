"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import type { PlatformRuntime } from "../../platform/types";
import {
  Button,
  Card,
  Dialog,
  ErrorState,
  LoadingState,
  Sheet,
  colors,
  radii,
  spacing,
  typography,
} from "../../ui";

type UnknownRecord = Record<string, unknown>;

type WorkTime = {
  id: number;
  weekday: number;
  from: string;
  to: string;
};

type WorkTimeDraft = {
  weekday: number;
  from: string;
  to: string;
};

const days = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function integer(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseWorkTime(value: unknown): WorkTime | null {
  const row = record(value);
  if (!row || row.active === false) return null;
  const id = integer(row.id);
  const weekday = integer(row.weekday, -1);
  const from = text(row.from);
  const to = text(row.to);
  if (id <= 0 || weekday < 0 || weekday > 6 || !timePattern.test(from) || !timePattern.test(to)) return null;
  return { id, weekday, from, to };
}

async function getWorkTimes(runtime: PlatformRuntime): Promise<WorkTime[]> {
  const response = await runtime.request<ApiEnvelope<unknown[]>>("/teacher/work-times");
  const rows = Array.isArray(response.data) ? response.data : [];
  return rows
    .map(parseWorkTime)
    .filter((item): item is WorkTime => item !== null)
    .sort((left, right) => left.weekday - right.weekday || left.from.localeCompare(right.from));
}

async function createWorkTime(runtime: PlatformRuntime, draft: WorkTimeDraft) {
  return runtime.request<ApiEnvelope<unknown>>("/teacher/work-times", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

async function updateWorkTime(runtime: PlatformRuntime, id: number, draft: WorkTimeDraft) {
  return runtime.request<ApiEnvelope<unknown>>(`/teacher/work-times/${id}`, {
    method: "PUT",
    body: JSON.stringify(draft),
  });
}

async function deleteWorkTime(runtime: PlatformRuntime, id: number) {
  return runtime.request<ApiEnvelope<unknown>>(`/teacher/work-times/${id}`, { method: "DELETE" });
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "خطایی رخ داد. دوباره تلاش کنید.";
}

function faDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)] ?? digit);
}

function minutes(value: string): number {
  const [hour, minute] = value.split(":").map((part) => Number.parseInt(part, 10));
  return hour * 60 + minute;
}

function overlaps(items: WorkTime[], draft: WorkTimeDraft, editingId?: number): boolean {
  const from = minutes(draft.from);
  const to = minutes(draft.to);
  return items.some((item) => {
    if (item.id === editingId || item.weekday !== draft.weekday) return false;
    return minutes(item.from) < to && minutes(item.to) > from;
  });
}

export function TeacherWorkTimesScreen() {
  const runtime = usePlatform();
  const [items, setItems] = useState<WorkTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | "new" | null>(null);
  const [editor, setEditor] = useState<{ weekday: number; slot?: WorkTime } | null>(null);
  const [draft, setDraft] = useState<WorkTimeDraft>({ weekday: 0, from: "08:00", to: "12:00" });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkTime | null>(null);

  const grouped = useMemo(() => {
    const value = new Map<number, WorkTime[]>();
    for (const item of items) {
      const group = value.get(item.weekday) ?? [];
      group.push(item);
      value.set(item.weekday, group);
    }
    for (const group of value.values()) group.sort((left, right) => left.from.localeCompare(right.from));
    return value;
  }, [items]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getWorkTimes(runtime));
    } catch (loadError) {
      setItems([]);
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
  }, [load]);

  function openEditor(weekday: number, slot?: WorkTime) {
    setEditor({ weekday, slot });
    setDraft({ weekday, from: slot?.from ?? "08:00", to: slot?.to ?? "12:00" });
    setFormError(null);
  }

  function closeEditor() {
    if (busyId !== null) return;
    setEditor(null);
    setFormError(null);
  }

  async function save() {
    if (!editor || busyId !== null) return;
    const next: WorkTimeDraft = { weekday: editor.weekday, from: draft.from, to: draft.to };

    if (next.weekday < 0 || next.weekday > 6) {
      setFormError("روز انتخاب‌شده معتبر نیست.");
      return;
    }
    if (!timePattern.test(next.from) || !timePattern.test(next.to)) {
      setFormError("ساعت معتبر با قالب ۲۴ ساعته وارد کنید.");
      return;
    }
    if (minutes(next.to) <= minutes(next.from)) {
      setFormError("ساعت پایان باید بعد از شروع باشد.");
      return;
    }
    if (overlaps(items, next, editor.slot?.id)) {
      setFormError("این بازه با بازهٔ دیگری در همین روز تداخل دارد.");
      return;
    }

    const targetId = editor.slot?.id ?? "new";
    setBusyId(targetId);
    setFormError(null);
    try {
      if (editor.slot) await updateWorkTime(runtime, editor.slot.id, next);
      else await createWorkTime(runtime, next);
      setEditor(null);
      await load();
    } catch (mutationError) {
      setFormError(messageOf(mutationError));
    } finally {
      setBusyId(null);
    }
  }

  async function remove() {
    if (!deleteTarget || busyId !== null) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setBusyId(target.id);
    setError(null);
    try {
      await deleteWorkTime(runtime, target.id);
      setItems((current) => current.filter((item) => item.id !== target.id));
    } catch (mutationError) {
      setError(messageOf(mutationError));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section style={{ display: "grid", gap: spacing.lg }}>
      <header>
        <h1 style={{ ...typography.heading, margin: 0 }}>زمان‌های کاری</h1>
        <p style={{ ...typography.bodySmall, margin: `${spacing.xs}px 0 0`, color: colors.inkMuted, lineHeight: 1.9 }}>
          روزها و ساعت‌هایی را مشخص کنید که برای برگزاری جلسه در دسترس هستید. بازه‌های هم‌پوشان پذیرفته نمی‌شوند.
        </p>
      </header>

      {loading ? <LoadingState label="در حال دریافت زمان‌های کاری…" /> : null}
      {!loading && error ? (
        <ErrorState
          title="دریافت زمان‌های کاری ناموفق بود"
          description={error}
          action={<Button onClick={() => void load()}>تلاش دوباره</Button>}
        />
      ) : null}

      {!loading && !error ? (
        <div style={{ display: "grid", gap: spacing.md }}>
          {days.map((day, weekday) => {
            const slots = grouped.get(weekday) ?? [];
            return (
              <Card key={day} elevated style={{ display: "grid", gap: spacing.md }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
                  <div>
                    <strong style={{ ...typography.body, display: "block" }}>{day}</strong>
                    <span style={{ ...typography.caption, color: colors.inkMuted }}>
                      {slots.length ? `${faDigits(slots.length)} بازه ثبت شده` : "تعطیل"}
                    </span>
                  </div>
                  <Button variant="secondary" onClick={() => openEditor(weekday)}>افزودن بازه</Button>
                </div>

                {slots.length ? (
                  <div style={{ display: "grid", gap: spacing.sm }}>
                    {slots.map((slot) => {
                      const busy = busyId === slot.id;
                      return (
                        <div
                          key={slot.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: spacing.sm,
                            padding: spacing.sm,
                            borderRadius: radii.md,
                            background: colors.olive50,
                            opacity: busy ? 0.55 : 1,
                          }}
                        >
                          <strong dir="ltr" style={{ ...typography.bodySmall, color: colors.olive800 }}>
                            {faDigits(slot.from)} — {faDigits(slot.to)}
                          </strong>
                          <div style={{ display: "flex", gap: spacing.xs }}>
                            <Button variant="secondary" disabled={busy} onClick={() => openEditor(weekday, slot)}>ویرایش</Button>
                            <Button variant="danger" disabled={busy} onClick={() => setDeleteTarget(slot)}>حذف</Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : null}

      <Sheet
        open={editor !== null}
        title={editor?.slot ? `ویرایش بازهٔ ${editor ? days[editor.weekday] : ""}` : `افزودن بازهٔ ${editor ? days[editor.weekday] : ""}`}
        onClose={closeEditor}
      >
        <div style={{ display: "grid", gap: spacing.md }}>
          <label style={{ display: "grid", gap: spacing.xs, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>از ساعت</span>
            <input
              type="time"
              value={draft.from}
              disabled={busyId !== null}
              onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))}
              style={{ width: "100%", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.sm, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily }}
            />
          </label>
          <label style={{ display: "grid", gap: spacing.xs, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>تا ساعت</span>
            <input
              type="time"
              value={draft.to}
              disabled={busyId !== null}
              onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
              style={{ width: "100%", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.sm, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily }}
            />
          </label>
          {formError ? <span role="alert" style={{ ...typography.caption, color: colors.danger }}>{formError}</span> : null}
          <Button fullWidth loading={busyId !== null} onClick={() => void save()}>ذخیره بازه</Button>
        </div>
      </Sheet>

      <Dialog
        open={deleteTarget !== null}
        title="حذف بازهٔ کاری"
        onClose={() => { if (busyId === null) setDeleteTarget(null); }}
      >
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>
          {deleteTarget ? `بازهٔ ${faDigits(deleteTarget.from)} تا ${faDigits(deleteTarget.to)} حذف شود؟` : ""}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" disabled={busyId !== null} onClick={() => setDeleteTarget(null)}>انصراف</Button>
          <Button variant="danger" loading={busyId !== null} onClick={() => void remove()}>حذف</Button>
        </div>
      </Dialog>
    </section>
  );
}