// باگ avatar-upload — ابزار مشترک تصویر پروفایل برای اپ (universal-app) و پنل.
// اعتبارسنجی حجم/فرمت، فشرده‌سازی سمت کلاینت، کش‌باستینگ ?v= و آپلود با progress.

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const AVATAR_ACCEPTED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

/** پیام خطای فارسی برمی‌گرداند یا null وقتی فایل سالم است (هیچ خطایی بی‌صدا نمی‌ماند). */
export function validateAvatarFile(file: File): string | null {
  const type = file.type.toLowerCase();
  if (!AVATAR_ACCEPTED_TYPES.has(type)) {
    return "فرمت تصویر باید JPG، PNG یا WebP باشد.";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return "حجم تصویر نباید بیشتر از ۵ مگابایت باشد. تصویر کوچک‌تری انتخاب کنید.";
  }
  if (file.size === 0) {
    return "فایل انتخاب‌شده خالی است.";
  }
  return null;
}

/**
 * فشرده‌سازی سمت کلاینت: اگر تصویر بزرگ‌تر از ۱۰۲۴ پیکسل یا سنگین‌تر از ~۴۰۰KB
 * باشد، با canvas به JPEG (یا WebP) بازکدگذاری می‌شود تا آپلود سریع و سبک باشد.
 */
export async function compressAvatarFile(
  file: File,
  maxDim = 1024,
  quality = 0.86,
): Promise<File> {
  const SMALL_ENOUGH = 400 * 1024;
  const needsWork = file.size > SMALL_ENOUGH || file.type === "image/png";
  if (!needsWork || typeof document === "undefined") return file;

  try {
    const bitmap = await loadBitmap(file);
    if (!bitmap) return file;
    const { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    if (scale >= 1 && file.size <= SMALL_ENOUGH && file.type !== "image/png") return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);
    if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    );
    // WebP هرگز سنگین‌تر از فایل اصلی نمی‌ماند؛ در غیر این صورت فایل اصلی برگشت داده می‌شود.
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") || "avatar";
    return new File([blob], `${name}.webp`, { type: "image/webp" });
  } catch {
    // فشرده‌سازی شکست خورد — فایل اصلی (که قبلاً اعتبارسنجی شده) استفاده می‌شود.
    return file;
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // ادامه با راه‌بست Image
    }
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

/**
 * نشانی نمایش تصویر: کش CDN با ?v=<version> دور زده می‌شود و مسیر نسبی
 * /uploads در اپ نیتیو به دامنهٔ سرور تبدیل می‌شود.
 */
export function avatarSrc(
  path: string | null | undefined,
  version?: string | number | null,
  apiOrigin?: string,
): string | undefined {
  if (!path) return undefined;
  let url = path;
  if (url.startsWith("/") && apiOrigin) {
    url = `${apiOrigin.replace(/\/+$/, "")}${url}`;
  }
  const versionValue = version != null && version !== "" ? String(version) : null;
  if (!versionValue) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(versionValue)}`;
}

/** خاستگاه فایل‌های عمومی از پایهٔ API (برای تبدیل /uploads در اپ نیتیو). */
export function uploadsOriginOf(apiBaseUrl: string): string | undefined {
  if (!apiBaseUrl) return undefined;
  if (/^https?:\/\//i.test(apiBaseUrl)) {
    return apiBaseUrl.replace(/\/api\/v1\/?$/, "");
  }
  // وب: مسیر نسبی از طریق پروکسی همان دامنه سرو می‌شود.
  return undefined;
}

export const AVATAR_UPDATED_EVENT = "vodda:avatar-updated";

/** پس از آپلود موفق منتشر می‌شود تا همهٔ منوها/کارت‌ها بلافاصله به‌روز شوند. */
export function announceAvatarUpdated(url: string | undefined | null, version?: string | number | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AVATAR_UPDATED_EVENT, { detail: { url: url ?? undefined, version: version ?? undefined } }));
}

export function onAvatarUpdated(handler: (detail: { url?: string; version?: string | number }) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => handler((event as CustomEvent).detail ?? {});
  window.addEventListener(AVATAR_UPDATED_EVENT, listener);
  return () => window.removeEventListener(AVATAR_UPDATED_EVENT, listener);
}

export type AvatarUploadResult = {
  ok: boolean;
  message?: string;
  data?: { avatar_url?: string; [key: string]: unknown };
};

/**
 * آپلود با progress واقعی (XHR). برای پنل: همان‌مبدایی با کوکی HttpOnly.
 * پیام خطای سرور عیناً به caller می‌رسد — هیچ خطای بی‌صدایی وجود ندارد.
 */
export function uploadWithProgress(
  url: string,
  body: FormData,
  onProgress: (fraction: number) => void,
  method = "PUT",
): Promise<AvatarUploadResult> {
  return new Promise((resolve, reject) => {
    if (typeof XMLHttpRequest === "undefined") {
      reject(new Error("آپلود در این محیط پشتیبانی نمی‌شود."));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.responseType = "json";
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(1, event.loaded / event.total));
      }
    };
    xhr.onload = () => {
      const body = (xhr.response ?? {}) as { error?: string; data?: AvatarUploadResult["data"] };
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ ok: true, data: body.data });
        return;
      }
      reject(new Error(body.error || `آپلود تصویر انجام نشد (کد ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("ارتباط با سرور هنگام آپلود برقرار نشد."));
    xhr.onabort = () => reject(new Error("آپلود تصویر لغو شد."));
    xhr.send(body);
  });
}

/* ═══════ نسخهٔ سرور (HEIC-safe + رد تصویر خالی) — 6fc0f18 ═══════ */

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const MAX_AVATAR_EDGE = 1440;

/** نمونه‌برداری ریز از پیکسل‌ها برای تشخیص تصویر تک‌رنگ/خالی. */
function canvasLooksBlank(canvas: HTMLCanvasElement): boolean {
  try {
    const sampleSize = 24;
    const sample = document.createElement("canvas");
    sample.width = sampleSize;
    sample.height = sampleSize;
    const context = sample.getContext("2d", { willReadFrequently: true });
    if (!context) return false;
    context.drawImage(canvas, 0, 0, sampleSize, sampleSize);
    const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
    // نمونهٔ اول به‌عنوان مرجع؛ اگر همهٔ نقاط با آن یکی بودند تصویر «خالی» است.
    const reference = [data[0], data[1], data[2]];
    const total = sampleSize * sampleSize;
    for (let index = 1; index < total; index += 1) {
      const offset = index * 4;
      if (
        Math.abs(data[offset] - reference[0]) > 8 ||
        Math.abs(data[offset + 1] - reference[1]) > 8 ||
        Math.abs(data[offset + 2] - reference[2]) > 8
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export class AvatarPrepareError extends Error {}

/**
 * تصویر انتخاب‌شده را به JPEG استاندارد تبدیل و اعتبارسنجی می‌کند.
 * خروجی همیشه File با type=image/jpeg است — سازگار با اعتبارسنجی بک‌اند.
 */
export async function prepareAvatarUpload(file: File): Promise<File> {
  if (!file) throw new AvatarPrepareError("فایلی انتخاب نشده است.");

  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(file);
    } else {
      bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);
        image.onload = () => {
          URL.revokeObjectURL(url);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("decode failed"));
        };
        image.src = url;
      });
    }
  } catch {
    throw new AvatarPrepareError(
      "فرمت تصویر پشتیبانی نمی‌شود. لطفاً تصویر را با فرمت JPG یا PNG انتخاب کنید.",
    );
  }

  const width = "width" in bitmap ? bitmap.width : 0;
  const height = "height" in bitmap ? bitmap.height : 0;
  if (!width || !height) {
    throw new AvatarPrepareError(
      "فرمت تصویر پشتیبانی نمی‌شود. لطفاً تصویر را با فرمت JPG یا PNG انتخاب کنید.",
    );
  }

  const scale = Math.min(1, MAX_AVATAR_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new AvatarPrepareError("پردازش تصویر ممکن نشد. لطفاً تصویر دیگری انتخاب کنید.");
  }
  context.drawImage(bitmap as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

  // تصویر خالی/تک‌رنگ — همان باگی که آواتار «بالا نیامده» می‌سازد.
  if (canvasLooksBlank(canvas)) {
    throw new AvatarPrepareError(
      "تصویر انتخاب‌شده خالی به نظر می‌رسد؛ لطفاً یک عکس واقعی از گالری انتخاب کنید.",
    );
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) {
    throw new AvatarPrepareError("پردازش تصویر ممکن نشد. لطفاً تصویر دیگری انتخاب کنید.");
  }
  const prepared = new File([blob], "avatar.jpg", { type: "image/jpeg" });
  if (prepared.size > MAX_AVATAR_BYTES) {
    throw new AvatarPrepareError("حجم تصویر پروفایل نباید بیشتر از ۵ مگابایت باشد.");
  }
  return prepared;
}
