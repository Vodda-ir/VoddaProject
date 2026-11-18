import {
  Camera,
  CameraResultType,
  CameraSource,
} from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";
import type {
  PlatformCapabilities,
  PlatformGeoCapabilities,
  PlatformImagePickerOptions,
} from "../../src/universal-app/platform/types";

function clampQuality(value: number | undefined) {
  if (value == null || Number.isNaN(value)) return 85;
  return Math.min(100, Math.max(1, Math.round(value)));
}

function cameraSource(source: PlatformImagePickerOptions["source"]) {
  if (source === "camera") return CameraSource.Camera;
  if (source === "photos") return CameraSource.Photos;
  return CameraSource.Prompt;
}

function isUserCancellation(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("cancel") || message.includes("dismiss");
}

async function dataUrlToFile(dataUrl: string, format?: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = format?.toLowerCase() || blob.type.split("/")[1] || "jpeg";
  const type = blob.type || `image/${extension}`;
  return new File([blob], `vodda-image-${Date.now()}.${extension}`, { type });
}

async function pickImage(options: PlatformImagePickerOptions = {}) {
  try {
    const photo = await Camera.getPhoto({
      quality: clampQuality(options.quality),
      allowEditing: false,
      correctOrientation: true,
      resultType: CameraResultType.DataUrl,
      source: cameraSource(options.source),
      width: options.maxWidth,
      height: options.maxHeight,
      saveToGallery: false,
    });

    if (!photo.dataUrl) {
      throw new Error("Camera did not return image data");
    }

    return await dataUrlToFile(photo.dataUrl, photo.format);
  } catch (error) {
    if (isUserCancellation(error)) return null;
    throw error;
  }
}

/* ۱.ب.۱ — موقعیت‌یاب نیتیو (@capacitor/geolocation):
 *  - اگر مجوز رد شده باشد، هرگز requestPermissions زده نمی‌شود (مشخصات اپ اندروید).
 *  - currentPosition با عدد چک مجوز شروع می‌کند تا بدون درخواست جدید، نتیجه برگردد. */
async function geoHasPermission(): Promise<boolean> {
  try {
    const status = await Geolocation.checkPermissions();
    return status.location === "granted" || status.coarseLocation === "granted";
  } catch {
    return false;
  }
}

async function geoRequestPermission(): Promise<boolean> {
  try {
    const status = await Geolocation.checkPermissions();
    if (status.location === "granted" || status.coarseLocation === "granted") return true;
    if (status.location === "denied" || status.coarseLocation === "denied") return false; // هرگز دوباره نمی‌پرسیم
    const result = await Geolocation.requestPermissions({
      permissions: ["location", "coarseLocation"],
    });
    return result.location === "granted" || result.coarseLocation === "granted";
  } catch {
    return false;
  }
}

async function geoCurrentPosition() {
  try {
    if (!(await geoHasPermission())) return null;
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 5 * 60_000,
    });
    return { lat: position.coords.latitude, lon: position.coords.longitude };
  } catch {
    return null;
  }
}

const nativeGeo: PlatformGeoCapabilities = {
  hasPermission: geoHasPermission,
  requestPermission: geoRequestPermission,
  currentPosition: geoCurrentPosition,
};

export const nativeCapabilities: PlatformCapabilities = {
  media: {
    pickImage,
  },
  geo: nativeGeo,
};
