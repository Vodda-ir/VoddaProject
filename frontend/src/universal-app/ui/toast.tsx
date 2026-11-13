"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

/**
 * اعلان بالا-صفحه (C2) — یک نمونه در هر لحظه؛ فراخوانی از هر جایی:
 *   showToast("پروفایل ذخیره شد");
 * میزبان (ToastHost) در Shell سوار می‌شود تا در همهٔ مسیرها در دسترس باشد.
 * متن کامل تا سه خط نمایش داده می‌شود (بدون بریدگی) و مدت‌زمان بر اساس
 * طول پیام به‌صورت خودکار محاسبه می‌شود.
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

/** مدت نمایش متناسب با طول پیام: پیام‌های بلند فرصت خواندن بیشتری دارند. */
function autoDuration(message: string): number {
  return Math.min(4600, 2500 + message.length * 55);
}

export function showToast(message: string, tone: ToastTone = "success", durationMs = 0) {
  toastId += 1;
  currentToast = { id: toastId, message, tone };
  emit();
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    currentToast = null;
    emit();
  }, durationMs > 0 ? durationMs : autoDuration(message));
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
      <span className="vodda-toast-text">{toast.message}</span>
    </div>
  );
}
