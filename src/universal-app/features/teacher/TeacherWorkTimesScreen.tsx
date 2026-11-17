"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { asArray, asInteger, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import type { PlatformRuntime } from "../../platform/types";
import {
  Button,
  Card,
  Dialog,
  ErrorState,
  Icon,
  LoadingState,
  colors,
  radii,
  spacing,
  toFaDigits,
  toLatinDigits,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";

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

function parseWorkTime(value: unknown): WorkTime | null {
  const row = asRecord(value);
  if (!row || row.active === false) return null;
  const id = asInteger(row.id);
  const weekday = asInteger(row.weekday, -1);
  const from = asString(row.from);
  const to = asString(row.to);
  if (id <= 0 || weekday < 0 || weekday > 6 || !timePattern.test(from) || !timePattern.test(to)) return null;
  return { id, weekday, from, to };
}

async function getWorkTimes(runtime: PlatformRuntime): Promise<WorkTime[]> {
  const response = await runtime.request<ApiEnvelope<unknown[]>>("/teacher/work-times");
  return asArray(response.data)
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

function minutes(value: string): number {
  const [hour, minute] = value.split(":").map((part) => Number.parseInt(part, 10));
  return hour * 60 + minute;
}

function normalizeTimeInput(value: string): string {
  const digits = toLatinDigits(value).replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
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

  // باگ refresh-loop: اجرای دوم StrictMode یا فراخوانی دیرهنگام نباید state را با دادهٔ کهنه بازنویسی کند.
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const isStale = () => loadGeneration.current !== generation;
    setLoading(true);
    setError(null);
    try {
      const rows = await getWorkTimes(runtime);
      if (isStale()) return;
      setItems(rows);
    } catch (loadError) {
      if (isStale()) return;
      setItems([]);
      setError(messageOf(loadError));
    } finally {
      if (!isStale()) setLoading(false);
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
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <p style={{ ...typography.bodySmall, margin: 0, color: colors.inkMuted, lineHeight: 1.9 }}>روزها و ساعت‌هایی که برای برگزاری جلسه در دسترس هستید را مشخص کنید.</p>

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
              <Card key={day} className="vodda-card--interactive" style={{ display: "grid", gap: spacing.md, padding: 14, borderRadius: 18, boxShadow: "0 0 4px rgba(46,54,34,.04)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
                  <strong style={{ fontSize: 14.5, fontWeight: 700, color: slots.length ? colors.ink : colors.inkFaint }}>{day}</strong>
                  <button
                    type="button"
                    className="vodda-tappable"
                    onClick={() => openEditor(weekday)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "7px 12px",
                      border: 0,
                      borderRadius: radii.pill,
                      color: colors.olive700,
                      background: colors.olive50,
                      fontFamily: typography.fontFamily,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="plus" size={14} />
                    افزودن بازه
                  </button>
                </div>

                {slots.length ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {slots.map((slot) => {
                      const busy = busyId === slot.id;
                      return (
                        <div
                          key={slot.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "7px 12px",
                            borderRadius: radii.pill,
                            background: colors.olive50,
                            opacity: busy ? 0.55 : 1,
                          }}
                        >
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openEditor(weekday, slot)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: 0,
                              border: 0,
                              color: colors.olive700,
                              background: "transparent",
                              fontFamily: typography.fontFamily,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: busy ? "not-allowed" : "pointer",
                            }}
                          >
                            <Icon name="clock" size={14} />
                            <span dir="ltr">{toFaDigits(slot.from)} تا {toFaDigits(slot.to)}</span>
                          </button>
                          <button
                            type="button"
                            aria-label="حذف بازه"
                            disabled={busy}
                            onClick={() => setDeleteTarget(slot)}
                            style={{ display: "grid", placeItems: "center", padding: 0, border: 0, color: colors.inkMuted, background: "transparent", cursor: busy ? "not-allowed" : "pointer" }}
                          >
                            <Icon name="x" size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ paddingTop: 2, fontSize: 12.5, color: colors.inkFaint }}>تعطیل</span>
                )}
              </Card>
            );
          })}
        </div>
      ) : null}

      <Dialog
        open={editor !== null}
        title={editor ? `${editor.slot ? "ویرایش" : "افزودن"} بازه - ${days[editor.weekday]}` : "بازهٔ کاری"}
        onClose={closeEditor}
      >
        <div style={{ display: "grid", gap: spacing.md }}>
          <label style={{ display: "grid", gap: spacing.xs, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>از ساعت</span>
            <input
              type="text"
              inputMode="numeric"
              value={toFaDigits(draft.from)}
              disabled={busyId !== null}
              placeholder="۰۸:۰۰"
              onChange={(event) => setDraft((current) => ({ ...current, from: normalizeTimeInput(event.target.value) }))}
              style={{ width: "100%", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.md, background: colors.surface, color: colors.ink, boxShadow: "none", fontFamily: typography.fontFamily }}
            />
          </label>
          <label style={{ display: "grid", gap: spacing.xs, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>تا ساعت</span>
            <input
              type="text"
              inputMode="numeric"
              value={toFaDigits(draft.to)}
              disabled={busyId !== null}
              placeholder="۱۲:۰۰"
              onChange={(event) => setDraft((current) => ({ ...current, to: normalizeTimeInput(event.target.value) }))}
              style={{ width: "100%", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.md, background: colors.surface, color: colors.ink, boxShadow: "none", fontFamily: typography.fontFamily }}
            />
          </label>
          {formError ? <span role="alert" style={{ ...typography.caption, color: colors.danger }}>{formError}</span> : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
            <Button variant="ghost" disabled={busyId !== null} onClick={closeEditor}>انصراف</Button>
            <Button loading={busyId !== null} onClick={() => void save()}>ذخیره</Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={deleteTarget !== null}
        title="حذف بازهٔ کاری"
        onClose={() => { if (busyId === null) setDeleteTarget(null); }}
      >
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>
          {deleteTarget ? `بازهٔ ${toFaDigits(deleteTarget.from)} تا ${toFaDigits(deleteTarget.to)} حذف شود؟` : ""}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" disabled={busyId !== null} onClick={() => setDeleteTarget(null)}>انصراف</Button>
          <Button variant="danger" loading={busyId !== null} onClick={() => void remove()}>حذف</Button>
        </div>
      </Dialog>
    </section>
  );
}
