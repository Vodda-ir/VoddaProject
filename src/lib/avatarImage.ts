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
