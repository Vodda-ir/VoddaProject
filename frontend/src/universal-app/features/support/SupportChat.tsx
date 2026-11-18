"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Icon } from "../../ui/Icon";
import { colors, gradients, radii, shadows, typography } from "../../ui/theme";
import { useAppearance } from "../../ui/appearance";
import { localizedDigits } from "../../ui/persian";
import { usePlatform } from "../../platform/context";
import { acquireMediaStream } from "../../platform/media-permissions";
import {
  closeTicket,
  createTicket,
  fetchThread,
  fetchUnreadTotal,
  listMyTickets,
  sendChatMessage,
  uploadChatAttachment,
  type SupportChatMessage,
  type SupportTicketSummary,
} from "./api";

/**
 * گفتگوی زندهٔ پشتیبانی وُدّا — جانشین «دستیار هوشمند».
 * کاربران و اساتید تیکت باز می‌کنند و با کارشناس پشتیبانی (پنل مدیریت)
 * گفتگوی لحظه‌ای دارند؛ متن، پیام صوتی و تصویر پشتیبانی می‌شود.
 * دستیار هوشمند فعلاً از رابط کاربری حذف شده تا بعداً توسعه داده شود.
 */

type View = "list" | "new" | "thread";

const HIDDEN_ROUTES = new Set<string>(["book"]);
const POLL_THREAD_MS = 3500;
const POLL_BADGE_MS = 18_000;
const MAX_RECORD_SECONDS = 300;

function statusMeta(status: SupportTicketSummary["status"]): { label: string; ink: string; bg: string } {
  switch (status) {
    case "open":
      return { label: "در انتظار بررسی", ink: "var(--v-goldInk, #7a5e1e)", bg: "var(--v-goldBackground, #f7efd9)" };
    case "pending":
      return { label: "در انتظار پاسخ", ink: "var(--v-clay, #b0745a)", bg: "var(--v-clayBackground, #f6e7df)" };
    case "answered":
      return { label: "پاسخ داده شد", ink: "var(--v-success, #5e6e43)", bg: "var(--v-successBackground, #edf2e5)" };
    default:
      return { label: "بسته‌شده", ink: "var(--v-inkMuted, #6f6a5b)", bg: "var(--v-sand100, #f4f0e7)" };
  }
}

function shortTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "short" }).format(date);
}

function formatDuration(ms: number, lang: "fa" | "en"): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${localizedDigits(minutes, lang)}:${localizedDigits(String(seconds).padStart(2, "0"), lang)}`;
}

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

/** downscales a picked image so uploads stay small and fast. */
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

/** compact voice-note player used inside chat bubbles. */
function AudioBubble({
  url,
  durationMs,
  mine,
}: {
  url: string;
  durationMs: number;
  mine: boolean;
}) {
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
        minWidth: 168,
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

export function SupportChat({ routeName }: { routeName: string }) {
  const runtime = usePlatform();
  const { L, lang } = useAppearance();

  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState<View>("list");
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [ticket, setTicket] = useState<SupportTicketSummary | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [subject, setSubject] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [badge, setBadge] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [recording, setRecording] = useState(false);
  const [deniedHint, setDeniedHint] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voicePreview, setVoicePreview] = useState<{ blob: Blob; url: string; ms: number; mime: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [sendingAttachment, setSendingAttachment] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordMimeRef = useRef<string>("");
  const recordSecondsRef = useRef<number>(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastMessageIdRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // هویت کاربر؛ دکمهٔ شناور فقط برای کاربران وارد‌شده نمایش داده می‌شود.
  useEffect(() => {
    let active = true;
    runtime
      .restoreSession()
      .then((sessionUser) => {
        if (active) setAuthed(Boolean(sessionUser));
      })
      .catch(() => {
        if (active) setAuthed(false);
      });
    return () => {
      active = false;
    };
  }, [runtime]);

  // نشان قرمز پیام‌های خوانده‌نشدهٔ پشتیبانی
  useEffect(() => {
    if (!authed) return;
    let active = true;
    const load = () => {
      fetchUnreadTotal(runtime)
        .then((value) => {
          if (active) setBadge(value);
        })
        .catch(() => {});
    };
    load();
    const timer = window.setInterval(load, POLL_BADGE_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [authed, runtime, open, messages.length]);

  const refreshTickets = useCallback(() => {
    return listMyTickets(runtime)
      .then((rows) => {
        setTickets(rows);
        setError("");
      })
      .catch(() => {
        setTickets([]);
      });
  }, [runtime]);

  // فهرست تیکت‌ها هنگام باز بودن پنل هر چند ثانیه تازه می‌شود.
  useEffect(() => {
    if (!open || view !== "list" || !authed) return;
    void refreshTickets();
    const timer = window.setInterval(() => void refreshTickets(), 10_000);
    return () => window.clearInterval(timer);
  }, [open, view, authed, refreshTickets]);

  // گفتگوی باز: واکشی اولیه + نظرسنجی افزایندهٔ پیام‌های تازه.
  const threadTicketId = view === "thread" && ticket ? ticket.id : 0;
  useEffect(() => {
    if (!open || threadTicketId === 0 || !authed) return;
    let active = true;
    const ticketId = threadTicketId;
    lastMessageIdRef.current = 0;
    setMessages([]);

    const pull = (reset: boolean) => {
      const afterId = reset ? 0 : lastMessageIdRef.current;
      fetchThread(runtime, ticketId, afterId)
        .then((payload) => {
          if (!active) return;
          setTicket(payload.ticket);
          if (reset) {
            setMessages(payload.messages);
          } else if (payload.messages.length > 0) {
            setMessages((current) => {
              const seen = new Set(current.map((item) => item.id));
              return [...current, ...payload.messages.filter((item) => !seen.has(item.id))];
            });
          }
          const all = payload.messages;
          if (all.length > 0) lastMessageIdRef.current = Math.max(lastMessageIdRef.current, all[all.length - 1].id);
        })
        .catch(() => {});
    };

    pull(true);
    const timer = window.setInterval(() => pull(false), POLL_THREAD_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [open, threadTicketId, authed, runtime]);

  // اسکرول خودکار به آخرین پیام
  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, view, open]);

  function openThread(row: SupportTicketSummary) {
    setTicket(row);
    setMessages([]);
    setView("thread");
    setBadge((current) => Math.max(0, current - row.unreadUser));
  }

  function backToList() {
    setView("list");
    setTicket(null);
    setMessages([]);
    void refreshTickets();
  }

  async function handleCreateTicket() {
    const trimmedSubject = subject.trim();
    const trimmedBody = input.trim();
    if (!trimmedSubject || !trimmedBody || busy) return;
    setBusy(true);
    setError("");
    try {
      const created = await createTicket(runtime, trimmedSubject, trimmedBody);
      setSubject("");
      setInput("");
      setTicket(created);
      setMessages([]);
      setView("thread");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : L("ارسال انجام نشد؛ دوباره تلاش کنید."));
    } finally {
      setBusy(false);
    }
  }

  async function handleSendText() {
    const trimmed = input.trim();
    if (!trimmed || busy || !ticket) return;
    setBusy(true);
    setError("");
    try {
      const message = await sendChatMessage(runtime, ticket.id, { kind: "text", body: trimmed });
      setInput("");
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current, message.id);
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      setTicket((current) => (current ? { ...current, status: "pending" } : current));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : L("ارسال انجام نشد؛ دوباره تلاش کنید."));
    } finally {
      setBusy(false);
    }
  }

  async function startRecording() {
    setError("");
    const acquired = await acquireMediaStream("audio");
    if (!acquired.ok) {
      // پیام خطا همراه راهنمای رفع انسداد است؛ دکمهٔ «تلاش دوباره» هم ظاهر می‌شود.
      setError(L(acquired.message));
      setDeniedHint(acquired.denied);
      return;
    }
    setDeniedHint(false);
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
      // میکروفون گرفته شده ولی ساخت MediaRecorder شکسته است؛ جریان را رها نکنیم.
      stream.getTracks().forEach((track) => track.stop());
      setError(L("ضبط صدا در این مرورگر ممکن نشد؛ کروم را به‌روزرسانی کنید."));
    }
  }

  function stopRecording(send: boolean) {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (!send) {
      // لغو: جریان بسته و ذخیره‌ها دور ریخته می‌شوند.
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
    }
    recorder.stop();
  }

  async function handleSendVoice() {
    if (!ticket || !voicePreview || sendingAttachment) return;
    setSendingAttachment(true);
    setError("");
    try {
      const extension = mimeToExtension(voicePreview.mime);
      const file = new File([voicePreview.blob], `voice_${Date.now()}${extension}`, { type: voicePreview.mime });
      const uploaded = await uploadChatAttachment(runtime, file, "audio");
      const message = await sendChatMessage(runtime, ticket.id, {
        kind: "audio",
        attachmentUrl: uploaded.url,
        mime: uploaded.mime,
        durationMs: voicePreview.ms,
      });
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current, message.id);
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      URL.revokeObjectURL(voicePreview.url);
      setVoicePreview(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : L("ارسال پیام صوتی انجام نشد."));
    } finally {
      setSendingAttachment(false);
    }
  }

  async function pickImage() {
    setError("");
    fileInputRef.current?.click();
  }

  async function handleImageChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(L("فقط تصویر انتخاب کنید."));
      return;
    }
    const compressed = await compressImageFile(file);
    setImagePreview({ file: compressed, url: URL.createObjectURL(compressed) });
  }

  async function handleSendImage() {
    if (!ticket || !imagePreview || sendingAttachment) return;
    setSendingAttachment(true);
    setError("");
    try {
      const uploaded = await uploadChatAttachment(runtime, imagePreview.file, "image");
      const message = await sendChatMessage(runtime, ticket.id, {
        kind: "image",
        attachmentUrl: uploaded.url,
        mime: uploaded.mime,
      });
      lastMessageIdRef.current = Math.max(lastMessageIdRef.current, message.id);
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      URL.revokeObjectURL(imagePreview.url);
      setImagePreview(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : L("ارسال تصویر انجام نشد."));
    } finally {
      setSendingAttachment(false);
    }
  }

  async function handleCloseTicket() {
    if (!ticket || busy) return;
    setBusy(true);
    try {
      await closeTicket(runtime, ticket.id);
      setTicket({ ...ticket, status: "closed" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : L("بستن گفتگو انجام نشد."));
    } finally {
      setBusy(false);
    }
  }

  const statusChip = useMemo(() => (ticket ? statusMeta(ticket.status) : null), [ticket]);

  if (!authed || HIDDEN_ROUTES.has(routeName)) return null;

  return (
    <div
      aria-hidden={!open}
      style={{
        position: "fixed",
        zIndex: 40,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(100%, 600px)",
        top: 0,
        bottom: 0,
        pointerEvents: "none",
        fontFamily: typography.fontFamily,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-hidden="true"
        tabIndex={-1}
        style={{ display: "none" }}
        onChange={(event) => void handleImageChosen(event)}
      />

      {/* دکمهٔ شناور پشتیبانی */}
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setView("list");
          }}
          aria-label={L("گفتگو با پشتیبانی وُدّا")}
          className="vodda-tappable"
          style={{
            pointerEvents: "auto",
            position: "absolute",
            bottom: "calc(96px + env(safe-area-inset-bottom))",
            insetInlineStart: 14,
            width: 48,
            height: 48,
            display: "grid",
            placeItems: "center",
            padding: 0,
            border: `1.5px solid ${colors.goldSoft}`,
            borderRadius: "50%",
            color: "#fffaf0",
            background: gradients.goldRich,
            boxShadow: "0 10px 24px rgba(139,104,31,.35), 0 3px 8px rgba(46,54,34,.18)",
            cursor: "pointer",
          }}
        >
          <Icon name="headphones" size={21} stroke={2} />
          {badge > 0 ? (
            <span
              aria-label={L("{n} پیام خوانده‌نشده از پشتیبانی").replace("{n}", localizedDigits(badge, lang))}
              style={{
                position: "absolute",
                top: -4,
                insetInlineEnd: -4,
                minWidth: 19,
                height: 19,
                display: "grid",
                placeItems: "center",
                padding: "0 5px",
                borderRadius: 999,
                background: colors.danger,
                border: "2px solid #fffaf0",
                color: "#ffffff",
                fontSize: 9.5,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {localizedDigits(badge > 99 ? "+99" : badge, lang)}
            </span>
          ) : null}
        </button>
      ) : null}

      {/* پنل پشتیبانی */}
      {open ? (
        <section
          role="dialog"
          aria-label={L("گفتگو با پشتیبانی وُدّا")}
          className="vodda-enter"
          style={{
            pointerEvents: "auto",
            position: "absolute",
            insetInline: 10,
            bottom: "calc(84px + env(safe-area-inset-bottom))",
            maxHeight: "min(78dvh, 640px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: colors.surface,
            border: `1px solid ${colors.sand150}`,
            borderRadius: radii.lg,
            boxShadow: shadows.lg,
          }}
        >
          {/* سرصفحه */}
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "11px 13px",
              borderBottom: `1px solid ${colors.sand100}`,
              background: `linear-gradient(180deg, ${colors.olive50}, ${colors.surface})`,
              flex: "0 0 auto",
            }}
          >
            {view === "thread" ? (
              <button
                type="button"
                onClick={backToList}
                aria-label={L("بازگشت به فهرست گفتگوها")}
                style={{ background: "none", border: 0, color: colors.inkMuted, cursor: "pointer", padding: 4, fontFamily: typography.fontFamily }}
              >
                <Icon name="arrowL" size={18} />
              </button>
            ) : (
              <span
                aria-hidden="true"
                style={{
                  width: 34,
                  height: 34,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 12,
                  background: gradients.goldRich,
                  color: "#fffaf0",
                  flex: "0 0 auto",
                }}
              >
                <Icon name="headphones" size={17} stroke={2} />
              </span>
            )}
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: "block", fontSize: 13, color: colors.ink }}>
                {view === "thread" && ticket ? ticket.subject : L("پشتیبانی وُدّا")}
              </strong>
              <span style={{ display: "block", fontSize: 10.5, color: colors.inkMuted }}>
                {view === "thread"
                  ? L("پاسخ‌گویی لحظه‌ای توسط کارشناسان وُدّا")
                  : view === "new"
                    ? L("گفتگوی جدید با تیم پشتیبانی")
                    : L("گفتگوهای شما با تیم پشتیبانی")}
              </span>
            </div>
            {view === "thread" && ticket && statusChip ? (
              <span
                style={{
                  flex: "0 0 auto",
                  fontSize: 10.5,
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: 999,
                  color: statusChip.ink,
                  background: statusChip.bg,
                }}
              >
                {L(statusChip.label)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={L("بستن گفتگو")}
              style={{ background: "none", border: 0, color: colors.inkMuted, cursor: "pointer", padding: 6, fontFamily: typography.fontFamily }}
            >
              <Icon name="x" size={17} />
            </button>
          </header>

          {error ? (
            <p
              role="alert"
              style={{
                margin: 0,
                padding: "8px 14px",
                fontSize: 11.5,
                fontWeight: 700,
                color: colors.danger,
                background: colors.dangerBackground,
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span style={{ flex: "1 1 auto", minWidth: 0 }}>{error}</span>
              {deniedHint ? (
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  className="vodda-tappable"
                  style={{
                    flex: "0 0 auto",
                    padding: "4px 12px",
                    border: `1px solid ${colors.danger}`,
                    borderRadius: 999,
                    background: "none",
                    color: colors.danger,
                    fontWeight: 800,
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily,
                  }}
                >
                  {L("تلاش دوباره")}
                </button>
              ) : null}
            </p>
          ) : null}

          {/* بدنه */}
          {view === "list" ? (
            <div
              aria-label={L("فهرست گفتگوهای پشتیبانی")}
              style={{ flex: "1 1 auto", overflowY: "auto", padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}
            >
              <button
                type="button"
                onClick={() => {
                  setSubject("");
                  setInput("");
                  setView("new");
                }}
                className="vodda-tappable"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  border: `1.5px dashed ${colors.goldAccent}`,
                  borderRadius: radii.md,
                  background: "var(--v-goldSurface, #fdf6e3)",
                  color: "var(--v-goldInk, #7a5e1e)",
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 12.5,
                  fontFamily: typography.fontFamily,
                }}
              >
                <span
                  aria-hidden
                  style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 10, background: gradients.goldRich, color: "#fffaf0" }}
                >
                  <Icon name="plus" size={15} stroke={2.4} />
                </span>
                {L("گفتگوی جدید با پشتیبانی")}
              </button>

              {tickets.length === 0 ? (
                <div style={{ padding: "26px 14px", textAlign: "center" }}>
                  <span
                    aria-hidden
                    style={{ margin: "0 auto 10px", width: 52, height: 52, display: "grid", placeItems: "center", borderRadius: "50%", background: colors.olive50, color: colors.olive700 }}
                  >
                    <Icon name="message" size={24} />
                  </span>
                  <strong style={{ display: "block", fontSize: 13, color: colors.ink, marginBottom: 4 }}>
                    {L("هنوز گفتگویی ندارید")}
                  </strong>
                  <span style={{ display: "block", fontSize: 11.5, lineHeight: 1.9, color: colors.inkMuted }}>
                    {L("سؤال، درخواست یا بازخورد خود را بپرسید؛ کارشناسان وُدّا در اسرع وقت پاسخ می‌دهند. امکان ارسال پیام صوتی و تصویر هم هست.")}
                  </span>
                </div>
              ) : (
                tickets.map((row) => {
                  const chip = statusMeta(row.status);
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => openThread(row)}
                      className="vodda-tappable"
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "start",
                        padding: "11px 13px",
                        border: `1px solid ${colors.sand150}`,
                        borderRadius: radii.md,
                        background: row.unreadUser > 0 ? colors.olive50 : colors.surface,
                        cursor: "pointer",
                        fontFamily: typography.fontFamily,
                        position: "relative",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <strong style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5, color: colors.ink }}>
                          {row.subject}
                        </strong>
                        <span style={{ flex: "0 0 auto", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999, color: chip.ink, background: chip.bg }}>
                          {L(chip.label)}
                        </span>
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ flex: 1, fontSize: 10.5, color: colors.inkMuted }}>
                          {L("گفتگو")} #{localizedDigits(row.id, lang)} · {shortDate(row.lastMessageAt)}
                        </span>
                        {row.unreadUser > 0 ? (
                          <span
                            style={{
                              flex: "0 0 auto",
                              minWidth: 18,
                              height: 18,
                              padding: "0 5px",
                              display: "grid",
                              placeItems: "center",
                              borderRadius: 999,
                              background: colors.danger,
                              color: "#fff",
                              fontSize: 9.5,
                              fontWeight: 900,
                            }}
                          >
                            {localizedDigits(row.unreadUser, lang)}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}

          {view === "new" ? (
            <div style={{ flex: "1 1 auto", overflowY: "auto", padding: "12px 14px" }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 800, color: colors.inkSecondary, marginBottom: 6 }}>
                {L("موضوع گفتگو")}
              </label>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder={L("مثلاً: مشکل در رزرو جلسه")}
                aria-label={L("موضوع گفتگو")}
                maxLength={150}
                className="vodda-input"
                style={{
                  width: "100%",
                  minHeight: 44,
                  padding: "9px 13px",
                  marginBottom: 14,
                  border: `1px solid ${colors.sand200}`,
                  borderRadius: 14,
                  outline: "none",
                  background: colors.sand50,
                  color: colors.ink,
                  fontSize: 12.8,
                  fontFamily: typography.fontFamily,
                }}
              />
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 800, color: colors.inkSecondary, marginBottom: 6 }}>
                {L("پیام شما")}
              </label>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder={L("شرح سؤال یا درخواست خود را بنویسید…")}
                aria-label={L("متن پیام")}
                rows={5}
                maxLength={2000}
                className="vodda-input"
                style={{
                  width: "100%",
                  padding: "10px 13px",
                  border: `1px solid ${colors.sand200}`,
                  borderRadius: 14,
                  outline: "none",
                  background: colors.sand50,
                  color: colors.ink,
                  fontSize: 12.8,
                  lineHeight: 1.9,
                  resize: "vertical",
                  fontFamily: typography.fontFamily,
                }}
              />
              <button
                type="button"
                disabled={busy || !subject.trim() || !input.trim()}
                onClick={() => void handleCreateTicket()}
                className="vodda-tappable"
                style={{
                  width: "100%",
                  minHeight: 46,
                  marginTop: 14,
                  border: 0,
                  borderRadius: 14,
                  background: subject.trim() && input.trim() && !busy ? colors.olive600 : colors.sand200,
                  color: subject.trim() && input.trim() && !busy ? colors.onOlive : colors.inkMuted,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: subject.trim() && input.trim() && !busy ? "pointer" : "default",
                  fontFamily: typography.fontFamily,
                }}
              >
                {busy ? L("در حال ارسال…") : L("ثبت و شروع گفتگو")}
              </button>
            </div>
          ) : null}

          {view === "thread" ? (
            <>
              <div
                ref={listRef}
                aria-live="polite"
                aria-label={L("پیام‌های گفتگو")}
                style={{
                  flex: "1 1 auto",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  padding: "12px 12px 6px",
                }}
              >
                {messages.length === 0 ? (
                  <div style={{ padding: "18px 10px", textAlign: "center", fontSize: 11.5, color: colors.inkMuted, lineHeight: 1.9 }}>
                    {L("پیام شما ثبت شد؛ کارشناسان وُدّا به‌زودی پاسخ می‌دهند.")}
                  </div>
                ) : null}
                {messages.map((message) => {
                  const mine = message.senderSide === "user";
                  return (
                    <div key={message.id} style={{ display: "flex", justifyContent: mine ? "flex-start" : "flex-end" }}>
                      <div style={{ maxWidth: "88%", display: "flex", flexDirection: "column", gap: 3 }}>
                        {message.kind === "image" && message.attachmentUrl ? (
                          <button
                            type="button"
                            onClick={() => setLightbox(message.attachmentUrl ?? null)}
                            aria-label={L("نمایش تصویر")}
                            style={{
                              padding: 0,
                              border: `1px solid ${colors.sand150}`,
                              borderRadius: 16,
                              overflow: "hidden",
                              cursor: "zoom-in",
                              background: colors.olive50,
                              maxWidth: 260,
                            }}
                          >
                            
                            <img
                              src={message.attachmentUrl}
                              alt={L("تصویر ارسالی در گفتگو")}
                              style={{ display: "block", maxWidth: "100%", maxHeight: 320, objectFit: "cover" }}
                            />
                          </button>
                        ) : null}
                        {message.kind === "audio" && message.attachmentUrl ? (
                          <AudioBubble
                            url={message.attachmentUrl}
                            durationMs={message.durationMs}
                            mine={mine}
                          />
                        ) : null}
                        {message.kind === "text" && message.body ? (
                          <div
                            style={{
                              padding: "8px 12px",
                              borderRadius: 15,
                              borderEndEndRadius: mine ? 15 : 5,
                              borderEndStartRadius: mine ? 5 : 15,
                              fontSize: 12.6,
                              lineHeight: 1.9,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              color: mine ? colors.onOlive : colors.ink,
                              background: mine ? colors.olive600 : colors.olive50,
                              border: mine ? "none" : `1px solid ${colors.olive100}`,
                            }}
                          >
                            {message.body}
                          </div>
                        ) : null}
                        <span
                          style={{
                            fontSize: 9.5,
                            color: colors.inkFaint,
                            textAlign: mine ? "start" : "end",
                            paddingInline: 6,
                          }}
                        >
                          {mine ? L("شما") : `${L("پشتیبانی وُدّا")}${message.senderName ? ` · ${message.senderName}` : ""}`}
                          {" · "}
                          {shortTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* پیش‌نمایش پیوست پیش از ارسال */}
              {voicePreview ? (
                <div
                  style={{
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    margin: "6px 12px 0",
                    padding: "8px 12px",
                    border: `1px solid ${colors.olive200}`,
                    borderRadius: 14,
                    background: colors.olive50,
                  }}
                >
                  <AudioBubble url={voicePreview.url} durationMs={voicePreview.ms} mine />
                  <button
                    type="button"
                    disabled={sendingAttachment}
                    onClick={() => void handleSendVoice()}
                    className="vodda-tappable"
                    style={{
                      flex: "0 0 auto",
                      minHeight: 40,
                      padding: "0 14px",
                      border: 0,
                      borderRadius: 12,
                      background: colors.olive600,
                      color: colors.onOlive,
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: sendingAttachment ? "default" : "pointer",
                      fontFamily: typography.fontFamily,
                    }}
                  >
                    {sendingAttachment ? L("…") : L("ارسال")}
                  </button>
                  <button
                    type="button"
                    disabled={sendingAttachment}
                    onClick={() => {
                      URL.revokeObjectURL(voicePreview.url);
                      setVoicePreview(null);
                    }}
                    aria-label={L("لغو پیام صوتی")}
                    style={{ background: "none", border: 0, color: colors.danger, cursor: "pointer", padding: 6 }}
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </div>
              ) : null}

              {imagePreview ? (
                <div
                  style={{
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    margin: "6px 12px 0",
                    padding: 8,
                    border: `1px solid ${colors.olive200}`,
                    borderRadius: 14,
                    background: colors.olive50,
                  }}
                >
                  
                  <img
                    src={imagePreview.url}
                    alt={L("پیش‌نمایش تصویر")}
                    style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10, border: `1px solid ${colors.olive100}` }}
                  />
                  <button
                    type="button"
                    disabled={sendingAttachment}
                    onClick={() => void handleSendImage()}
                    className="vodda-tappable"
                    style={{
                      flex: 1,
                      minHeight: 40,
                      border: 0,
                      borderRadius: 12,
                      background: colors.olive600,
                      color: colors.onOlive,
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: sendingAttachment ? "default" : "pointer",
                      fontFamily: typography.fontFamily,
                    }}
                  >
                    {sendingAttachment ? L("در حال ارسال…") : L("ارسال تصویر")}
                  </button>
                  <button
                    type="button"
                    disabled={sendingAttachment}
                    onClick={() => {
                      URL.revokeObjectURL(imagePreview.url);
                      setImagePreview(null);
                    }}
                    aria-label={L("لغو تصویر")}
                    style={{ background: "none", border: 0, color: colors.danger, cursor: "pointer", padding: 6 }}
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </div>
              ) : null}

              {/* نوار ضبط */}
              {recording ? (
                <div
                  style={{
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 12px",
                    borderTop: `1px solid ${colors.sand100}`,
                    background: colors.surface,
                  }}
                >
                  <span
                    aria-hidden
                    className="vodda-rec-dot"
                    style={{ width: 10, height: 10, borderRadius: "50%", background: colors.danger, display: "inline-block" }}
                  />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 800, color: colors.danger }}>
                    {L("در حال ضبط…")} {formatDuration(recordSeconds * 1000, lang)}
                  </span>
                  <button
                    type="button"
                    onClick={() => stopRecording(false)}
                    aria-label={L("لغو ضبط")}
                    className="vodda-tappable"
                    style={{
                      minHeight: 40,
                      padding: "0 12px",
                      border: `1px solid ${colors.sand200}`,
                      borderRadius: 12,
                      background: colors.surface,
                      color: colors.inkSecondary,
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: typography.fontFamily,
                    }}
                  >
                    {L("لغو")}
                  </button>
                  <button
                    type="button"
                    onClick={() => stopRecording(true)}
                    aria-label={L("پایان ضبط و ارسال")}
                    className="vodda-tappable"
                    style={{
                      minHeight: 40,
                      padding: "0 14px",
                      border: 0,
                      borderRadius: 12,
                      background: colors.olive600,
                      color: colors.onOlive,
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: typography.fontFamily,
                    }}
                  >
                    {L("اتمام")}
                  </button>
                </div>
              ) : (
                /* نوار نوشتن */
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSendText();
                  }}
                  style={{
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    padding: "9px 10px max(10px, env(safe-area-inset-bottom))",
                    borderTop: `1px solid ${colors.sand100}`,
                    background: colors.surface,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void startRecording()}
                    aria-label={L("ضبط پیام صوتی")}
                    disabled={ticket?.status === "closed" || Boolean(voicePreview) || Boolean(imagePreview)}
                    className="vodda-tappable"
                    style={{
                      flex: "0 0 auto",
                      width: 42,
                      height: 42,
                      display: "grid",
                      placeItems: "center",
                      padding: 0,
                      border: `1px solid ${colors.sand200}`,
                      borderRadius: 14,
                      background: colors.sand50,
                      color: colors.olive700,
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="mic" size={19} stroke={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void pickImage()}
                    aria-label={L("ارسال تصویر")}
                    disabled={ticket?.status === "closed" || Boolean(voicePreview) || Boolean(imagePreview)}
                    className="vodda-tappable"
                    style={{
                      flex: "0 0 auto",
                      width: 42,
                      height: 42,
                      display: "grid",
                      placeItems: "center",
                      padding: 0,
                      border: `1px solid ${colors.sand200}`,
                      borderRadius: 14,
                      background: colors.sand50,
                      color: colors.olive700,
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="camera" size={19} stroke={2} />
                  </button>
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={
                      ticket?.status === "closed"
                        ? L("این گفتگو بسته شده است")
                        : voicePreview || imagePreview
                          ? L("ابتدا پیام آماده‌شده را ارسال کنید")
                          : L("پیام خود را بنویسید…")
                    }
                    aria-label={L("متن پیام")}
                    maxLength={2000}
                    disabled={ticket?.status === "closed" || Boolean(voicePreview) || Boolean(imagePreview)}
                    className="vodda-input"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      minHeight: 42,
                      padding: "8px 13px",
                      border: `1px solid ${colors.sand200}`,
                      borderRadius: 14,
                      outline: "none",
                      background: colors.sand50,
                      color: colors.ink,
                      fontSize: 12.8,
                      fontFamily: typography.fontFamily,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={busy || !input.trim() || ticket?.status === "closed"}
                    aria-label={L("ارسال پیام")}
                    style={{
                      flex: "0 0 auto",
                      width: 42,
                      height: 42,
                      display: "grid",
                      placeItems: "center",
                      padding: 0,
                      border: 0,
                      borderRadius: 14,
                      color: colors.onOlive,
                      background: input.trim() && !busy && ticket?.status !== "closed" ? colors.olive600 : colors.sand200,
                      cursor: input.trim() && !busy && ticket?.status !== "closed" ? "pointer" : "default",
                    }}
                  >
                    <Icon name="arrowL" size={19} stroke={2.2} />
                  </button>
                </form>
              )}

              {ticket?.status === "closed" ? (
                <p style={{ margin: 0, padding: "8px 14px max(10px, env(safe-area-inset-bottom))", fontSize: 11, fontWeight: 700, color: colors.inkMuted, textAlign: "center", background: colors.sand100 }}>
                  {L("این گفتگو بسته شده؛ برای پیگیری، گفتگوی جدیدی باز کنید.")}
                </p>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      {/* نمای بزرگ تصویر */}
      {lightbox ? (
        <div
          role="dialog"
          aria-label={L("نمایش تصویر")}
          onClick={() => setLightbox(null)}
          style={{
            pointerEvents: "auto",
            position: "fixed",
            inset: 0,
            zIndex: 90,
            display: "grid",
            placeItems: "center",
            padding: 20,
            background: "rgba(20,22,14,.72)",
            cursor: "zoom-out",
          }}
        >
          
          <img
            src={lightbox}
            alt={L("تصویر ارسالی در گفتگو")}
            style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 14, boxShadow: shadows.lg }}
          />
        </div>
      ) : null}
    </div>
  );
}
