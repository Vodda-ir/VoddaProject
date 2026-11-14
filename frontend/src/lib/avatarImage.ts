"use client";

/**
 * آماده‌سازی تصویر آواتار پیش از بارگذاری — یک منبع مشترک بین پنل وب
 * («/panel/user/settings») و اپلیکیشن («تکمیل/ویرایش پروفایل»).
 *
 * مشکل گزارش‌شده: آواتار بعضی کاربران پس از «ذخیرهٔ موفق» خالی می‌ماند و
 * تصویر تازه هم پذیرفته نمی‌شد. ریشه‌ها:
 *   ۱) عکس‌های HEIC آیفون / عکس‌های بسیار بزرگ که بک‌اند با خطای فرمت یا حجم رد می‌کرد؛
 *   ۲) تصاویر تک‌رنگ و خالی (placeholder گالری) که بی‌سروصدا ذخیره می‌شدند و
 *      بعداً «آواتار بالا نمی‌آید» به نظر می‌رسید.
 *
 * راه‌حل این ماژول:
 *   • هر تصویری که مرورگر بتواند باز کند به JPEG هم‌عرض حداکثر ۱۴۴۰px تبدیل می‌شود؛
 *   • تصاویر تک‌رنگ/خالی پیش از ارسال با پیام شفاف فارسی رد می‌شوند؛
 *   • اگر مرورگر نتواند تصویر را باز کند، خطای گویا برمی‌گردد.
 */

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
