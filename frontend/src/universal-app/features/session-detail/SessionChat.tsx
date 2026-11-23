"use client";

// ─────────────────────────────────────────────────────────────────────────────
// چت جلسهٔ متنی وُدّا — حالت دوم برگزاری جلسات آنلاین
//
// گپ کامل بین قرآن‌آموز و استاد از درون اپ: متن، پیام صوتی (ویس) و تصویر.
// پیام‌ها روی همان API جلسه ذخیره می‌شوند (/sessions/:id/messages با kind
// audio|image و آپلود multipart)؛ نظرسنجی افزایندهٔ ۴ ثانیه‌ای و صفخهٔ
// حبابی هماهنگ با زبان طراحی وُدّا. ضبط صدا با MediaRecorder و تصویر با
// فشرده‌سازی سمت کلاینت ارسال می‌شود (حداکثر ۵ مگابایت).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { acquireMediaStream } from "../../platform/media-permissions";
import { usePlatform } from "../../platform/context";
import {
  Avatar,
  Card,
  Icon,
  colors,
  radii,
  spacing,
  typography,
} from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { localizedDigits } from "../../ui/persian";
import { showToast } from "../../ui/toast";
import { messageOf } from "../../ui/errorMessage";
import {
  getSessionMessages,
  isMyMessage,
  sendSessionMediaMessage,
  sendSessionMessage,
  type SessionDetailData,
  type SessionMessageData,
} from "./api";
import { resolveAssetUrl } from "../../platform/asset";

const POLL_MS = 4000;
const MAX_RECORD_SECONDS = 120;
const MAX_MESSAGE_CHARS = 1000;

function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? "";
}

function mimeToExtension(mime: string): string {
  if (mime.includes("webm")) return ".webm";
  if (mime.includes("ogg")) return ".ogg";
  if (mime.includes("mp4")) return ".m4a";
  return ".bin";
}

/** فشرده‌سازی تصویر انتخابی — آپلود سریع و سبک (مانند چت پشتیبانی). */
async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size < 900_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function formatDuration(ms: number, lang: "fa" | "en"): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${localizedDigits(minutes, lang)}:${localizedDigits(String(seconds).padStart(2, "0"), lang)}`;
}

function clockOf(createdAt: string, lang: "fa" | "en"): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  return `${localizedDigits(String(date.getHours()).padStart(2, "0"), lang)}:${localizedDigits(String(date.getMinutes()).padStart(2, "0"), lang)}`;
}

/** پخش‌کنندهٔ فشردهٔ پیام صوتی در حباب چت. */
function AudioBubble({ url, durationMs, mine }: { url: string; durationMs: number; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const { L } = useAppearance();

  useEffect(() => () => audioRef.current?.pause(), []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      void audio.play().catch(() => setPlaying(false));
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        minWidth: 172,
        padding: "7px 10px",
        borderRadius: 999,
        border: `1px solid ${mine ? "rgba(255,250,240,.35)" : colors.olive200}`,
        background: mine ? colors.olive600 : colors.surface,
        color: mine ? colors.onOlive : colors.ink,
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? L("توقف پخش پیام صوتی") : L("پخش پیام صوتی")}
        style={{
          width: 34,
          height: 34,
          flex: "0 0 auto",
          display: "grid",
          placeItems: "center",
          padding: 0,
          border: 0,
          borderRadius: "50%",
          cursor: "pointer",
          color: mine ? colors.onOlive : "#fffaf0",
          background: mine ? "rgba(255,255,255,.22)" : colors.olive600,
        }}
      >
        {playing ? (
          <span aria-hidden style={{ display: "inline-flex", gap: 2.5 }}>
            <span style={{ width: 3.5, height: 12, background: "currentColor", borderRadius: 2 }} />
            <span style={{ width: 3.5, height: 12, background: "currentColor", borderRadius: 2 }} />
          </span>
        ) : (
          <Icon name="play" size={15} stroke={2.2} />
        )}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          aria-hidden
          style={{
            height: 4,
            borderRadius: 999,
            overflow: "hidden",
            background: mine ? "rgba(255,255,255,.25)" : colors.olive100,
          }}
        >
          <div
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: "100%",
              borderRadius: 999,
              background: mine ? "#fffaf0" : colors.olive600,
              transition: "width .2s linear",
            }}
          />
        </div>
        <span style={{ display: "block", marginTop: 3, fontSize: 10, fontWeight: 700, opacity: 0.9 }}>
          {formatDuration(durationMs || 0, "fa")}
        </span>
      </div>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          if (audio.duration > 0 && Number.isFinite(audio.duration)) {
            setProgress(audio.currentTime / audio.duration);
          }
        }}
      />
    </div>
  );
}

export function SessionChat({
  detail,
  peerLabel,
  peerAvatar,
  messages,
  onSendingChange,
  onRefresh,
}: {
  detail: SessionDetailData;
  peerLabel: string;
  peerAvatar: string;
  messages: SessionMessageData[];
  onSendingChange?: (sending: boolean) => void;
  /** واکشی فوری پیام‌ها پس از ارسال (والد، نظرسنجی ۴ ثانیه‌ای را هم دارد). */
  onRefresh?: () => void;
}) {
  const runtime = usePlatform();
  const { L, lang, N } = useAppearance();
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voicePreview, setVoicePreview] = useState<{ blob: Blob; url: string; ms: number; mime: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordMimeRef = useRef<string>("");
  const recordSecondsRef = useRef<number>(0);

  const setBusy = useCallback(
    (value: boolean) => {
      setSending(value);
      onSendingChange?.(value);
    },
    [onSendingChange],
  );

  // اسکرول به آخرین پیام
  useEffect(() => {
    const node = bodyRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, recording, voicePreview, imagePreview]);

  async function submitText() {
    const text = draft.trim();
    if (!text || sending) return;
    setBusy(true);
    setError("");
    try {
      await sendSessionMessage(runtime, detail.id, text);
      setDraft("");
      // پیام‌ها با نظرسنجی ۴ ثانیه‌ای می‌آیند؛ برای حس فوری، بلافاصله یک واکشی هم می‌زنیم.
      onRefresh?.();
    } catch (sendError) {
      setError(messageOf(sendError));
    } finally {
      setBusy(false);
    }
  }

  /** ارسال ویس/تصویر از پیش‌نمایش */
  async function submitAttachment() {
    if (sending) return;
    if (voicePreview) {
      setBusy(true);
      setError("");
      try {
        const extension = mimeToExtension(voicePreview.mime);
        const file = new File([voicePreview.blob], `voice_${Date.now()}${extension}`, { type: voicePreview.mime });
        await sendSessionMediaMessage(runtime, detail.id, {
          file,
          filename: file.name,
          kind: "audio",
          durationMs: voicePreview.ms,
        });
        URL.revokeObjectURL(voicePreview.url);
        setVoicePreview(null);
        onRefresh?.();
        showToast(L("پیام صوتی ارسال شد"));
      } catch (sendError) {
        setError(messageOf(sendError));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (imagePreview) {
      setBusy(true);
      setError("");
      try {
        await sendSessionMediaMessage(runtime, detail.id, {
          file: imagePreview.file,
          filename: imagePreview.file.name,
          kind: "image",
        });
        URL.revokeObjectURL(imagePreview.url);
        setImagePreview(null);
        onRefresh?.();
        showToast(L("تصویر ارسال شد"));
      } catch (sendError) {
        setError(messageOf(sendError));
      } finally {
        setBusy(false);
      }
    }
  }

  async function startRecording() {
    setError("");
    const acquired = await acquireMediaStream("audio");
    if (!acquired.ok) {
      setError(L(acquired.message));
      return;
    }
    const stream = acquired.stream;
    try {
      const mime = pickRecorderMime();
      recordMimeRef.current = mime;
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recordChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (recordTimerRef.current !== null) {
          window.clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        const seconds = recordSecondsRef.current;
        setRecording(false);
        setRecordSeconds(0);
        if (recordChunksRef.current.length === 0) return;
        const blob = new Blob(recordChunksRef.current, { type: mime || "audio/webm" });
        setVoicePreview({
          blob,
          url: URL.createObjectURL(blob),
          ms: Math.max(600, seconds * 1000),
          mime: mime || "audio/webm",
        });
      };
      recorderRef.current = recorder;
      recordSecondsRef.current = 0;
      setRecordSeconds(0);
      setRecording(true);
      recorder.start(250);
      recordTimerRef.current = window.setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
        if (recordSecondsRef.current >= MAX_RECORD_SECONDS) {
          recorderRef.current?.stop();
        }
      }, 1000);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setError(L("ضبط صدا در این مرورگر ممکن نشد؛ کروم را به‌روزرسانی کنید."));
    }
  }

  function cancelRecording() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorder.onstop = () => {
      recorder.stream.getTracks().forEach((track) => track.stop());
      if (recordTimerRef.current !== null) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      setRecording(false);
      setRecordSeconds(0);
    };
    recordChunksRef.current = [];
    recorder.stop();
  }

  function stopRecordingForSend() {
    recorderRef.current?.stop();
  }

  async function onPickImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(L("فقط فایل تصویری انتخاب کنید."));
      return;
    }
    if (file.size > 25_000_000) {
      setError(L("حجم تصویر بیش از حد مجاز است (حداکثر ۲۵ مگابایت پیش از فشرده‌سازی)."));
      return;
    }
    setError("");
    const compressed = await compressImageFile(file);
    setImagePreview({ file: compressed, url: URL.createObjectURL(compressed) });
  }

  const composerDisabled = detail.status === "canceled";

  return (
    <section aria-label={L("چت جلسه")} style={{ display: "grid", gap: 10 }}>
      <Card style={{ display: "grid", gap: 0, padding: 0, overflow: "hidden" }}>
        {/* سربرگ چت */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderBottom: `1px solid ${colors.sand150}`,
            background: colors.surface,
          }}
        >
          <Avatar name={L(peerLabel)} src={peerAvatar || undefined} size={36} ring={false} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ display: "block", fontSize: 13, fontWeight: 800, color: colors.ink }}>{N(peerLabel)}</strong>
            <span style={{ display: "block", fontSize: 10.5, color: colors.inkMuted }}>
              {L("چت جلسه — متن، ویس و تصویر")}
            </span>
          </div>
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 999,
              background: colors.greenBackground,
              border: `1px solid ${colors.greenBorder}`,
              color: colors.greenInk,
              fontSize: 10.5,
              fontWeight: 800,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.greenDeep }} />
            {L("امن — شماره‌ها پنهان")}
          </span>
        </div>

        {/* بدنهٔ پیام‌ها */}
        <div
          ref={bodyRef}
          className="vodda-scroll-rail"
          style={{
            maxHeight: 380,
            minHeight: 180,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 14,
            background: colors.sand50,
          }}
        >
          {messages.length === 0 ? (
            <p style={{ margin: "14px 0", textAlign: "center", fontSize: 12, lineHeight: 2, color: colors.inkMuted }}>
              {L("هنوز پیامی رد و بدل نشده؛ گفت‌وگو را با سلام شروع کنید. می‌توانید متن، ویس یا تصویر بفرستید.")}
            </p>
          ) : null}
          {messages.map((message) => {
            const mine = isMyMessage(message, detail);
            const url = resolveAssetUrl(message.mediaUrl) ?? "";
            return (
              <div
                key={message.id}
                style={{
                  maxWidth: "86%",
                  alignSelf: mine ? "flex-start" : "flex-end",
                  display: "grid",
                  gap: 2,
                }}
              >
                {message.kind === "text" ? (
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      lineHeight: 1.9,
                      color: colors.ink,
                      background: mine ? colors.olive50 : colors.surface,
                      border: `1px solid ${mine ? colors.olive100 : colors.sand150}`,
                      borderRadius: mine ? "14px 14px 5px 14px" : "14px 14px 14px 5px",
                      padding: "8px 12px",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      boxShadow: "0 1px 4px rgba(87,77,55,.06)",
                    }}
                  >
                    {message.body}
                  </span>
                ) : message.kind === "audio" ? (
                  <AudioBubble url={url} durationMs={message.durationMs} mine={mine} />
                ) : (
                  <button
                    type="button"
                    onClick={() => setLightbox(url)}
                    aria-label={L("نمایش تصویر تمام‌صفحه")}
                    style={{
                      padding: 0,
                      border: `1px solid ${mine ? colors.olive100 : colors.sand150}`,
                      borderRadius: 16,
                      overflow: "hidden",
                      cursor: "pointer",
                      background: colors.surface,
                      display: "block",
                    }}
                  >
                    <img
                      src={url}
                      alt={L("تصویر چت جلسه")}
                      style={{ display: "block", maxWidth: 240, maxHeight: 260, objectFit: "cover" }}
                      loading="lazy"
                    />
                  </button>
                )}
                <span style={{ fontSize: 9.5, color: colors.inkFaint, paddingInline: 6, textAlign: mine ? "right" : "left" }}>
                  {mine ? L("شما") : N(peerLabel)}
                  {clockOf(message.createdAt, lang) ? ` · ${clockOf(message.createdAt, lang)}` : ""}
                </span>
              </div>
            );
          })}
        </div>

        {/* نوار پیش‌نمایش ویس/تصویر */}
        {recording ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderTop: `1px solid ${colors.sand150}`,
              background: colors.surface,
            }}
          >
            <span
              aria-hidden
              className="vodda-rec-dot"
              style={{ width: 12, height: 12, borderRadius: "50%", background: colors.danger, flex: "0 0 auto" }}
            />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: colors.danger }}>
              {L("در حال ضبط")} · {formatDuration(recordSeconds * 1000, lang)}
            </span>
            <button
              type="button"
              onClick={cancelRecording}
              style={{
                border: `1px solid ${colors.sand200}`,
                background: colors.surface,
                color: colors.inkSecondary,
                borderRadius: 999,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: typography.fontFamily,
              }}
            >
              {L("لغو")}
            </button>
            <button
              type="button"
              onClick={stopRecordingForSend}
              style={{
                border: 0,
                background: colors.olive600,
                color: colors.onOlive,
                borderRadius: 999,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: typography.fontFamily,
              }}
            >
              {L("اتمام و ارسال")}
            </button>
          </div>
        ) : voicePreview || imagePreview ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderTop: `1px solid ${colors.sand150}`,
              background: colors.surface,
            }}
          >
            {voicePreview ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                <AudioBubble url={voicePreview.url} durationMs={voicePreview.ms} mine />
              </div>
            ) : imagePreview ? (
              <img
                src={imagePreview.url}
                alt={L("پیش‌نمایش تصویر")}
                style={{ maxWidth: 120, maxHeight: 84, borderRadius: 12, border: `1px solid ${colors.sand200}`, objectFit: "cover" }}
              />
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (voicePreview) {
                  URL.revokeObjectURL(voicePreview.url);
                  setVoicePreview(null);
                }
                if (imagePreview) {
                  URL.revokeObjectURL(imagePreview.url);
                  setImagePreview(null);
                }
              }}
              style={{
                flex: "0 0 auto",
                border: `1px solid ${colors.sand200}`,
                background: colors.surface,
                color: colors.inkSecondary,
                borderRadius: 999,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: typography.fontFamily,
              }}
            >
              {L("حذف")}
            </button>
            <button
              type="button"
              onClick={() => void submitAttachment()}
              disabled={sending}
              style={{
                flex: "0 0 auto",
                border: 0,
                background: colors.olive600,
                color: colors.onOlive,
                borderRadius: 999,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 800,
                cursor: sending ? "wait" : "pointer",
                fontFamily: typography.fontFamily,
                opacity: sending ? 0.6 : 1,
              }}
            >
              {sending ? L("در حال ارسال…") : L("ارسال")}
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 10,
              borderTop: `1px solid ${colors.sand150}`,
              background: colors.surface,
            }}
          >
            <button
              type="button"
              onClick={() => void startRecording()}
              disabled={composerDisabled || sending}
              aria-label={L("ضبط پیام صوتی")}
              title={L("ضبط پیام صوتی")}
              style={{
                width: 44,
                height: 44,
                flex: "0 0 44px",
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                border: `1px solid ${colors.sand200}`,
                background: colors.sand50,
                color: colors.olive700,
                cursor: composerDisabled ? "not-allowed" : "pointer",
                opacity: composerDisabled ? 0.5 : 1,
              }}
            >
              <Icon name="mic" size={19} stroke={2} />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={composerDisabled || sending}
              aria-label={L("ارسال تصویر")}
              title={L("ارسال تصویر")}
              style={{
                width: 44,
                height: 44,
                flex: "0 0 44px",
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                border: `1px solid ${colors.sand200}`,
                background: colors.sand50,
                color: colors.olive700,
                cursor: composerDisabled ? "not-allowed" : "pointer",
                opacity: composerDisabled ? 0.5 : 1,
              }}
            >
              <Icon name="camera" size={19} stroke={2} />
            </button>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitText();
                }
              }}
              maxLength={MAX_MESSAGE_CHARS}
              disabled={composerDisabled}
              aria-label={L("متن پیام")}
              placeholder={composerDisabled ? L("جلسه لغو شده است") : L("پیام خود را بنویسید…")}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 44,
                borderRadius: 14,
                border: `1px solid ${colors.sand200}`,
                background: colors.sand50,
                color: colors.ink,
                padding: "0 14px",
                fontFamily: typography.fontFamily,
                fontSize: 13,
              }}
            />
            <button
              type="button"
              onClick={() => void submitText()}
              disabled={composerDisabled || sending || !draft.trim()}
              aria-label={L("ارسال پیام")}
              style={{
                width: 44,
                height: 44,
                flex: "0 0 44px",
                display: "grid",
                placeItems: "center",
                borderRadius: "50%",
                border: 0,
                background: draft.trim() && !composerDisabled ? colors.olive600 : colors.sand200,
                color: draft.trim() && !composerDisabled ? colors.onOlive : colors.inkMuted,
                cursor: draft.trim() && !composerDisabled ? "pointer" : "default",
              }}
            >
              <Icon name="arrowL" size={19} stroke={2.2} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = "";
                void onPickImage(file);
              }}
            />
          </div>
        )}
      </Card>

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: 12.5, color: colors.danger, background: colors.dangerBackground, borderRadius: radii.md, padding: "10px 13px" }}>
          {L(error)}
        </p>
      ) : null}

      {/* لایت‌باکس تصویر */}
      {lightbox ? (
        <div
          role="presentation"
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "rgba(15,19,10,.86)",
            display: "grid",
            placeItems: "center",
            padding: spacing.xl,
            cursor: "zoom-out",
          }}
        >
          <img
            src={lightbox}
            alt={L("تصویر چت جلسه")}
            style={{ maxWidth: "min(92vw, 720px)", maxHeight: "82vh", borderRadius: 18, boxShadow: "0 24px 60px rgba(0,0,0,.5)" }}
          />
          <button
            type="button"
            aria-label={L("بستن تصویر")}
            onClick={() => setLightbox(null)}
            style={{
              position: "fixed",
              top: "calc(14px + env(safe-area-inset-top))",
              insetInlineEnd: 14,
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: 0,
              background: "rgba(255,255,255,.14)",
              color: "#fff",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="x" size={18} stroke={2.2} />
          </button>
        </div>
      ) : null}
    </section>
  );
}
