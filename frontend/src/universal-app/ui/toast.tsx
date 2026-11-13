"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

/**
 * اعلان کوتاه موفقیت (C2) — یک نمونه در هر لحظه؛ فراخوانی از هر جایی:
 *   showToast("پروفایل ذخیره شد");
 * میزبان (ToastHost) در Shell سوار می‌شود تا در همهٔ مسیرها در دسترس باشد.
 */

type ToastTone = "success" | "info";

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
};

type Listener = (state: ToastState | null) => void;

let currentToast: ToastState | null = null;
const listeners = new Set<Listener>();
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let toastId = 0;

function emit() {
  for (const listener of listeners) listener(currentToast);
}

export function showToast(message: string, tone: ToastTone = "success", durationMs = 2600) {
  toastId += 1;
  currentToast = { id: toastId, message, tone };
  emit();
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    currentToast = null;
    emit();
  }, durationMs);
}

export function ToastHost() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    listeners.add(setToast);
    setToast(currentToast);
    return () => {
      listeners.delete(setToast);
    };
  }, []);

  if (!toast) return null;
  return (
    <div
      key={toast.id}
      className="vodda-toast"
      role="status"
      aria-live="polite"
      style={toast.tone === "info" ? { background: "linear-gradient(145deg, #5e6e43, #728350)" } : undefined}
    >
      <Icon name={toast.tone === "info" ? "info" : "checkCircle"} size={17} stroke={2.2} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{toast.message}</span>
    </div>
  );
}
