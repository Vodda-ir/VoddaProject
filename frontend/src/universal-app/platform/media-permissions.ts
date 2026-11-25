'use client';

// Centralized camera/microphone acquisition for every media surface (live
// classroom + support-chat voice notes). One getUserMedia ladder, one error
// taxonomy and actionable Persian messages keep a blocked permission from
// turning into a dead-end session.

export type MediaKind = "audio" | "video" | "both";

export type MediaErrorKind =
  | "denied"
  | "not-found"
  | "in-use"
  | "insecure"
  | "unsupported"
  | "unknown";

export type MediaAcquireResult =
  | {
      ok: true;
      stream: MediaStream;
      hasVideo: boolean;
      hasAudio: boolean;
    }
  | {
      ok: false;
      kind: MediaErrorKind;
      /** Persian default; components localize with L(). */
      message: string;
      denied: boolean;
    };

/** Step-by-step unblock guide for a stored/one-tap denial. */
export const MEDIA_DENIED_GUIDE =
  "برای فعال‌سازی: در مرورگر گوشی آیکون قفل یا ⓘ کنار نشانی سایت را بزنید ← «مجوزها» ← «دوربین» و «میکروفون» را روی «اجازه دادن» بگذارید و صفحه را دوباره باز کنید. در اپ وُدّا: تنظیمات گوشی ← برنامه‌ها ← وُدّا ← مجوزها ← دوربین و میکروفون را فعال کنید.";

export function hasMediaApi(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

function errorName(error: unknown): string {
  return error instanceof Error ? (error as { name?: string }).name || "" : "";
}

function classify(error: unknown): { kind: MediaErrorKind; message: string; denied: boolean } {
  switch (errorName(error)) {
    case "NotAllowedError":
    case "SecurityError":
      return {
        kind: "denied",
        denied: true,
        message: `دسترسی دوربین/میکروفون مسدود شده است. ${MEDIA_DENIED_GUIDE}`,
      };
    case "NotFoundError":
    case "OverconstrainedError":
      return {
        kind: "not-found",
        denied: false,
        message: "دوربین یا میکروفون روی این دستگاه پیدا نشد.",
      };
    case "NotReadableError":
    case "TrackStartError":
      return {
        kind: "in-use",
        denied: false,
        message: "دوربین/میکروفون در برنامهٔ دیگری باز است؛ آن را ببندید و دوباره تلاش کنید.",
      };
    case "AbortError":
      return {
        kind: "unknown",
        denied: false,
        message: "گرفتن دسترسی دوربین/میکروفون ناتمام ماند؛ دوباره تلاش کنید.",
      };
    default:
      return {
        kind: "unknown",
        denied: false,
        message: "گرفتن دسترسی دوربین/میکروفون ناموفق بود؛ دوباره تلاش کنید.",
      };
  }
}

/** Best-effort permission store read — 'prompt' means the dialog can still pop. */
export async function queryMediaPermission(
  kind: "camera" | "microphone",
): Promise<"granted" | "denied" | "prompt" | "unknown"> {
  try {
    const permissions = navigator.permissions;
    if (!permissions?.query) return "unknown";
    const status = await permissions.query({ name: kind } as unknown as PermissionDescriptor);
    return status.state as "granted" | "denied" | "prompt";
  } catch {
    return "unknown";
  }
}

export type MediaPermissionSnapshot = {
  mic: "granted" | "denied" | "prompt" | "unknown";
  camera: "granted" | "denied" | "prompt" | "unknown";
};

/** وضعیت هر دو مجوز با یک فراخوان — برای نشانگرهای وضعیت پیش از جلسه. */
export async function queryMediaPermissions(): Promise<MediaPermissionSnapshot> {
  const [mic, camera] = await Promise.all([
    queryMediaPermission("microphone"),
    queryMediaPermission("camera"),
  ]);
  return { mic, camera };
}

/** محیط اجرا را تشخیص می‌دهد تا راهنمای رفع انسداد مجوز دقیق باشد. */
export function detectPlatformGuide(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  if (isIOS) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

/**
 * راهنمای گام‌به‌گام رفع انسداد مجوز — مخصوص محیط اجرا (اپ اندروید، سافاری iOS
 * یا مرورگر دسکتاپ). متن‌ها فارسی و قابل نمایش مستقیم در کادر خطا هستند.
 */
export function permissionUnblockGuide(platform = detectPlatformGuide(), audioOnly = false): string {
  if (platform === "ios") {
    return audioOnly
      ? "برای فعال‌سازی میکروفون: تنظیمات گوشی ← سافاری (یا اپ وُدّا) ← «میکروفون» را روشن کنید، سپس این صفحه را ببندید و دوباره باز کنید. اگر از سافاری استفاده می‌کنید، آیکون «aA» در نوار نشانی ← «تنظیمات وب‌سایت» ← میکروفون ← «اجازه دادن»."
      : "برای فعال‌سازی دوربین و میکروفون: تنظیمات گوشی ← سافاری (یا اپ وُدّا) ← «دوربین» و «میکروفون» را روشن کنید، سپس این صفحه را ببندید و دوباره باز کنید. اگر از سافاری استفاده می‌کنید، آیکون «aA» در نوار نشانی ← «تنظیمات وب‌سایت» ← اجازهٔ دوربین و میکروفون.";
  }
  if (platform === "android") {
    return audioOnly
      ? "برای فعال‌سازی میکروفون: آیکون قفل یا ⓘ کنار نشانی را بزنید ← «مجوزها» ← میکروفون را روی «اجازه دادن» بگذارید. در اپ وُدّا: تنظیمات گوشی ← برنامه‌ها ← وُدّا ← مجوزها ← دوربین و میکروفون فعال باشد، سپس اپ را کامل ببندید و دوباره باز کنید."
      : "برای فعال‌سازی دوربین و میکروفون: آیکون قفل یا ⓘ کنار نشانی را بزنید ← «مجوزها» ← دوربین و میکروفون را روی «اجازه دادن» بگذارید. در اپ وُدّا: تنظیمات گوشی ← برنامه‌ها ← وُدّا ← مجوزها ← دوربین و میکروفون فعال باشد، سپس اپ را کامل ببندید و دوباره باز کنید.";
  }
  return audioOnly
    ? "برای فعال‌سازی میکروفون: آیکون قفل کنار نشانی سایت را بزنید ← «مجوزهای این سایت» ← دوربین و میکروفون را «اجازه دادن» کنید و صفحه را دوباره باز کنید."
    : "برای فعال‌سازی دوربین و میکروفون: آیکون قفل کنار نشانی سایت را بزنید ← «مجوزهای این سایت» ← دوربین و میکروفون را «اجازه دادن» کنید و صفحه را دوباره باز کنید.";
}

/**
 * Ladder: ideal constraints → plain audio+video → audio only. Guarantees the
 * class can start as long as ANY grant is possible; the plainest failure is
 * the one classified, so guidance stays honest.
 */
export async function acquireMediaStream(kinds: MediaKind = "both"): Promise<MediaAcquireResult> {
  if (!hasMediaApi()) {
    return {
      ok: false,
      kind: "unsupported",
      denied: false,
      message: "این مرورگر از دسترسی به دوربین/میکروفون پشتیبانی نمی‌کند؛ از کروم نسخهٔ جدید استفاده کنید.",
    };
  }
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return {
      ok: false,
      kind: "insecure",
      denied: false,
      message: "دسترسی دوربین فقط در نشانی امن (HTTPS) ممکن است.",
    };
  }

  const wantVideo = kinds !== "audio";
  const wantAudio = kinds !== "video";
  const attempts: MediaStreamConstraints[] = [];
  if (wantVideo && wantAudio) {
    attempts.push({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    attempts.push({ video: true, audio: true });
    attempts.push({ video: false, audio: true });
  } else if (wantAudio) {
    attempts.push({ audio: { echoCancellation: true, noiseSuppression: true } });
    attempts.push({ audio: true });
  } else {
    attempts.push({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } });
    attempts.push({ video: true });
  }

  let lastError: unknown = null;
  for (const constraints of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return {
        ok: true,
        stream,
        hasVideo: stream.getVideoTracks().length > 0,
        hasAudio: stream.getAudioTracks().length > 0,
      };
    } catch (error) {
      lastError = error;
    }
  }
  return { ok: false, ...classify(lastError) };
}
