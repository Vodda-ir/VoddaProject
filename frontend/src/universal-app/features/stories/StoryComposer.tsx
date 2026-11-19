"use client";

import { useRef, useState } from "react";
import type { PlatformRuntime } from "../../platform/types";
import { Button, Icon, Sheet, colors, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { messageOf } from "../../ui/errorMessage";
import { localizedDigits } from "../../ui/persian";
import { publishStory } from "./api";

/* ═══ E1/E2 — فرم انتشار استوری (مدیر برند یا استاد) ═══
 * مدیر: تصویر (فشرده‌سازی سمت کلاینت تا سقف ۱۲۰۰px)، متن، پیوند اختیاری CTA و مدت اعتبار.
 * استاد: **فقط تصویر** با فشرده‌سازی خودکار — بدون متن/پیوند؛ ۲۴ ساعت اعتبار ثابت.
 * کادر پیش‌نمایش مربعی با حاشیهٔ طلایی. */

const TTL_OPTIONS: Array<{ label: string; hours: number }> = [
  { label: "۲۴ ساعت", hours: 24 },
  { label: "۳ روز", hours: 72 },
  { label: "۷ روز", hours: 168 },
  { label: "۳۰ روز", hours: 720 },
];

const MAX_OUTPUT_CHARS = 2_000_000; // ~1.5MB JPEG فشرده

async function compressImageFile(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
    throw new Error("فقط تصویر PNG، JPEG یا WebP مجاز است.");
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("خواندن فایل ناموفق بود."));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("تصویر قابل پردازش نیست."));
    element.src = dataUrl;
  });

  const maxEdge = 1200;
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("پردازش تصویر در این دستگاه پشتیبانی نمی‌شود.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  const output = canvas.toDataURL("image/jpeg", 0.82);
  if (output.length > MAX_OUTPUT_CHARS) {
    throw new Error("حجم تصویر بیش از حد مجاز است — تصویر کوچک‌تری انتخاب کنید.");
  }
  return output;
}

export function StoryComposer({
  open,
  runtime,
  mode = "admin",
  onClose,
  onPublished,
}: {
  open: boolean;
  runtime: PlatformRuntime;
  /** «admin» = متن + پیوند + مدت اعتبار | «teacher» = فقط تصویر، ۲۴ ساعت */
  mode?: "admin" | "teacher";
  onClose: () => void;
  onPublished: () => void;
}) {
  const { L } = useAppearance();
  const teacherMode = mode === "teacher";
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [link, setLink] = useState("");
  const [ttlHours, setTtlHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setMediaUrl("");
    setCaption("");
    setLink("");
    setTtlHours(24);
    setError(null);
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setReading(true);
    try {
      const compressed = await compressImageFile(file);
      setMediaUrl(compressed);
    } catch (readError) {
      setMediaUrl("");
      setError(messageOf(readError, "انتخاب تصویر ناموفق بود."));
    } finally {
      setReading(false);
    }
  }

  async function handlePublish() {
    if (!mediaUrl || busy) return;
    if (!teacherMode && !caption.trim()) return;
    setError(null);
    setBusy(true);
    try {
      await publishStory(runtime, {
        mediaUrl,
        caption: caption.trim(),
        link: teacherMode ? undefined : link.trim() || undefined,
        ttlHours: teacherMode ? 24 : ttlHours,
      });
      reset();
      onPublished();
    } catch (publishError) {
      setError(messageOf(publishError, "انتشار استوری ناموفق بود. دوباره تلاش کنید."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} title={L("استوری جدید")} onClose={onClose}>
      <div style={{ display: "grid", gap: 14, paddingBottom: 8 }}>
        {/* پیش‌نمایش مربعی با حاشیهٔ طلایی */}
        <div
          style={{
            display: "grid",
            placeItems: "center",
            aspectRatio: "1 / 1",
            borderRadius: 22,
            padding: 4,
            background: mediaUrl
              ? "linear-gradient(135deg, #bf9540 0%, #e9cf8f 50%, #bf9540 100%)"
              : "transparent",
          }}
        >
          {mediaUrl ? (
            <img
              src={mediaUrl}
              alt={L("پیش‌نمایش استوری")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 18,
                border: "2px solid #fffdf6",
                display: "block",
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="vodda-tappable"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 18,
                border: `2px dashed ${colors.goldSoft}`,
                background: colors.goldSurface,
                color: colors.goldDark,
                display: "grid",
                placeItems: "center",
                gap: 8,
                cursor: "pointer",
                fontFamily: typography.fontFamily,
                padding: 12,
              }}
            >
              <Icon name="camera" size={30} stroke={1.7} />
              <span style={{ fontSize: 13, fontWeight: 800 }}>
                {reading ? L("در حال پردازش تصویر…") : teacherMode ? L("تصویر استوری را انتخاب کنید") : L("تصویر تبلیغ را انتخاب کنید")}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: colors.inkMuted }}>
                {teacherMode
                  ? L("تصویر خودکار کم‌حجم می‌شود — بدون فشار به سرور")
                  : L("مربع یا عمودی — تا ۱۲۰۰ پیکسل فشرده می‌شود")}
              </span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFile}
          style={{ display: "none" }}
          aria-hidden="true"
        />

        {mediaUrl ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={reading}>
              {reading ? L("در حال پردازش…") : L("تغییر تصویر")}
            </Button>
          </div>
        ) : null}

        {teacherMode ? (
          <p
            style={{
              margin: 0,
              padding: "9px 12px",
              borderRadius: 12,
              background: colors.olive50,
              border: `1px solid ${colors.olive100}`,
              fontSize: 11,
              fontWeight: 700,
              color: colors.olive700,
            }}
          >
            {L("استوری شما ۲۴ ساعت نمایش داده می‌شود و فقط دنبال‌کننده‌های شما آن را می‌بینند.")}
          </p>
        ) : (
          <>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: colors.inkSecondary }}>{L("متن استوری")}</span>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value.slice(0, 300))}
                rows={2}
                maxLength={300}
                placeholder={L("متن تبلیغ یا اعلان…")}
                style={{
                  resize: "none",
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: colors.surface,
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.9,
                  color: colors.ink,
                  fontFamily: typography.fontFamily,
                  outline: "none",
                }}
              />
              <span style={{ fontSize: 10.5, color: colors.inkMuted, justifySelf: "end" }}>
                {localizedDigits(caption.length, "fa")}/{localizedDigits(300, "fa")}
              </span>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: colors.inkSecondary }}>
                {L("پیوند (اختیاری)")}
              </span>
              <input
                value={link}
                onChange={(event) => setLink(event.target.value)}
                dir="ltr"
                placeholder="https://vodda.ir/…"
                inputMode="url"
                style={{
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  background: colors.surface,
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.ink,
                  fontFamily: typography.fontFamily,
                  outline: "none",
                }}
              />
            </label>

            <div style={{ display: "grid", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: colors.inkSecondary }}>{L("مدت نمایش")}</span>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {TTL_OPTIONS.map((option) => {
                  const active = option.hours === ttlHours;
                  return (
                    <button
                      key={option.hours}
                      type="button"
                      onClick={() => setTtlHours(option.hours)}
                      aria-pressed={active}
                      className="vodda-tappable"
                      style={{
                        padding: "8px 14px",
                        borderRadius: 999,
                        border: `1px solid ${active ? colors.gold : colors.border}`,
                        background: active ? colors.goldBackground : colors.surface,
                        color: active ? colors.goldDark : colors.inkSecondary,
                        fontSize: 12,
                        fontWeight: active ? 900 : 700,
                        cursor: "pointer",
                        fontFamily: typography.fontFamily,
                      }}
                    >
                      {L(option.label)}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {error ? (
          <p role="alert" style={{ margin: 0, fontSize: 12, fontWeight: 700, color: colors.danger }}>
            {error}
          </p>
        ) : null}

        <Button onClick={handlePublish} disabled={!mediaUrl || (!teacherMode && !caption.trim()) || busy || reading}>
          {busy ? L("در حال انتشار…") : L("انتشار استوری")}
        </Button>
      </div>
    </Sheet>
  );
}
