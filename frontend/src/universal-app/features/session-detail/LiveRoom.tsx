"use client";

// ─────────────────────────────────────────────────────────────────────────────
// کلاس تصویری اختصاصی وُدّا در اپ جامع — نسخهٔ بازنویسی‌شدهٔ کامل
//
// سیگنالینگ: runtime.request اپ → مستقیم api.vodda.ir با توکن Bearer
//   (رفع عیب اصلی: نسخهٔ پیشین مسیرهای نسبی BFF را در WebView اپ صدا می‌زد
//    که وجود نداشتند و هیچ سیگنالی رد و بدل نمی‌شد.)
// ظاهر: طراحی اختصاصی شایستهٔ اپ — صحنهٔ تمام‌صفحه، نوار ابزار شیشه‌ای،
//   پیش‌آزمون مجوز با پیش‌نمایش، چت حبابی، واکنش‌های شناور.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveClient,
  type LiveEvent,
  type LiveStatus,
  type LiveTransport,
} from "../../../lib/live/client";
import { LiveEngine, type EngineRole } from "../../../lib/live/engine";
import { acquireMediaStream } from "../../platform/media-permissions";
import { usePlatform } from "../../platform/context";
import { localizedDigits } from "../../ui/persian";
import { Avatar, Icon } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { colors, typography } from "../../ui/theme";

type ChatLine = { id: string; from: number; text: string; at: number; mine: boolean };
type Reaction = { id: string; emoji: string; at: number };

type LiveRoomProps = {
  sessionId: number;
  role: EngineRole;
  myUserId: number;
  peerName: string;
  peerAvatar?: string;
  startAt: string;
  durationMinutes: number;
  onClose: () => void;
};

const REACTIONS = ["👍", "❤️", "👏", "🎉", "🤲", "✨"];

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function chatTime(at: number, lang: "fa" | "en"): string {
  const date = new Date(at);
  return `${localizedDigits(String(date.getHours()).padStart(2, "0"), lang)}:${localizedDigits(String(date.getMinutes()).padStart(2, "0"), lang)}`;
}

/** پس‌زمینهٔ صحنهٔ کلاس — زیتونیِ خیلی تیره با عمق گرادیان. */
const STAGE_BG = "linear-gradient(168deg, #1c2214 0%, #252c1c 46%, #171c10 100%)";
const GLASS = "rgba(255,255,255,0.08)";
const GLASS_BORDER = "rgba(255,255,255,0.14)";

function glassStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    background: GLASS,
    border: `1px solid ${GLASS_BORDER}`,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    ...extra,
  };
}

/** دکمهٔ گرد ابزار — سبک تماس ویدیویی. */
function RoundButton({
  label,
  active = false,
  danger = false,
  gold = false,
  onClick,
  children,
  badge = 0,
}: {
  label: string;
  active?: boolean;
  danger?: boolean;
  gold?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  const bg = danger ? "#b3403a" : gold ? colors.gold : active ? "rgba(255,255,255,0.18)" : GLASS;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        position: "relative",
        width: 54,
        height: 54,
        display: "grid",
        placeItems: "center",
        borderRadius: "50%",
        border: `1px solid ${danger ? "transparent" : gold ? "transparent" : GLASS_BORDER}`,
        background: bg,
        color: "#fff",
        cursor: "pointer",
        boxShadow: "0 4px 16px rgba(0,0,0,.28)",
        transition: "transform .15s ease, background .15s ease",
      }}
    >
      {children}
      {badge > 0 ? (
        <span
          style={{
            position: "absolute",
            top: -3,
            insetInlineEnd: -3,
            minWidth: 20,
            height: 20,
            borderRadius: 999,
            background: colors.gold,
            color: colors.onGold,
            fontSize: 11,
            fontWeight: 800,
            display: "grid",
            placeItems: "center",
            padding: "0 5px",
          }}
        >
          {localizedDigits(badge, "fa")}
        </span>
      ) : null}
    </button>
  );
}

function StatusChip({ status, lang }: { status: LiveStatus; lang: "fa" | "en" }) {
  const map: Record<LiveStatus, { text: string; dot: string }> = {
    connecting: { text: lang === "fa" ? "در حال اتصال…" : "Connecting…", dot: colors.gold },
    live: { text: lang === "fa" ? "اتصال زنده" : "Live", dot: "#9dc564" },
    polling: { text: lang === "fa" ? "اتصال پایدار" : "Stable", dot: colors.gold },
    error: { text: lang === "fa" ? "خطای دسترسی" : "Access error", dot: "#e08a7a" },
    closed: { text: lang === "fa" ? "پایان" : "Closed", dot: "#8b9483" },
  };
  const item = map[status] ?? map.connecting;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 999,
        ...glassStyle(),
        fontSize: 11.5,
        fontWeight: 700,
        color: "#f2f5ea",
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: 999, background: item.dot, boxShadow: `0 0 8px ${item.dot}` }} />
      {item.text}
    </span>
  );
}

export function LiveRoom({
  sessionId,
  role,
  myUserId,
  peerName,
  peerAvatar,
  startAt,
  durationMinutes,
  onClose,
}: LiveRoomProps) {
  const runtime = usePlatform();
  const { lang } = useAppearance();
  const fa = lang === "fa";

  const [phase, setPhase] = useState<"preflight" | "live" | "ended">("preflight");
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [mediaError, setMediaError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [hasLiveMedia, setHasLiveMedia] = useState(false);
  const [remoteActive, setRemoteActive] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [countdown, setCountdown] = useState("");
  const [ending, setEnding] = useState(false);

  const clientRef = useRef<LiveClient | null>(null);
  const engineRef = useRef<LiveEngine | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const myIdRef = useRef<number>(myUserId);
  const peerSignaledRef = useRef(false);

  const isTeacherSide = role !== "learner";

  /* ---------- پیش‌آزمون: پیش‌نمایش دوربین و سطح صدا ---------- */
  useEffect(() => {
    if (phase !== "preflight") return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let ctx: AudioContext | null = null;
    (async () => {
      const result = await acquireMediaStream("both");
      if (!result.ok) {
        setMediaError(result.message);
        return;
      }
      stream = result.stream;
      setPreviewStream(stream);
      setMediaError("");
      if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;
      const [audioTrack] = stream.getAudioTracks();
      if (audioTrack) {
        ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(new MediaStream([audioTrack]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const buffer = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(buffer);
          const avg = buffer.reduce((sum, value) => sum + value, 0) / buffer.length;
          setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
          raf = requestAnimationFrame(tick);
        };
        tick();
      }
    })();
    return () => {
      cancelAnimationFrame(raf);
      void ctx?.close();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [phase]);

  useEffect(() => () => {
    clientRef.current?.close();
    engineRef.current?.close();
    void audioCtxRef.current?.close();
  }, []);

  /* ---------- شمارش معکوس کلاس ---------- */
  useEffect(() => {
    const endAt = new Date(startAt).getTime() + (durationMinutes || 60) * 60_000;
    const tick = () => {
      const diff = endAt - Date.now();
      if (diff <= 0) {
        setCountdown(fa ? "زمان جلسه به پایان رسیده است" : "Session time is over");
        return;
      }
      const minutes = Math.floor(diff / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);
      setCountdown(
        fa
          ? `${localizedDigits(minutes, "fa")}:${localizedDigits(String(seconds).padStart(2, "0"), "fa")} باقی‌مانده`
          : `${minutes}:${String(seconds).padStart(2, "0")} left`,
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [startAt, durationMinutes, fa]);

  useEffect(() => {
    const body = chatBodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [chat, chatOpen]);

  const showNotice = useCallback((text: string, ms = 3600) => {
    setNotice(text);
    window.setTimeout(() => setNotice(""), ms);
  }, []);

  const pushReaction = useCallback((emoji: string) => {
    const reaction: Reaction = { id: uid(), emoji, at: Date.now() };
    setReactions((items) => [...items, reaction]);
    window.setTimeout(() => setReactions((items) => items.filter((item) => item.id !== reaction.id)), 2600);
  }, []);

  /* ---------- پردازش رخدادهای سیگنالینگ ---------- */
  const handleEvent = useCallback(
    (event: LiveEvent) => {
      if (event.from === myIdRef.current && event.type !== "system") return;
      switch (event.type) {
        case "chat": {
          const payload = event.payload as { text?: string } | undefined;
          const text = String(payload?.text ?? "").slice(0, 1000);
          if (!text) return;
          setChat((items) => [...items, { id: uid(), from: event.from, text, at: event.at, mine: false }]);
          if (!chatOpen) setUnread((count) => count + 1);
          break;
        }
        case "control": {
          const payload = event.payload as { action: string; value?: boolean | string } | undefined;
          if (payload?.action === "bye") {
            showNotice(fa ? "طرف مقابل کلاس را ترک کرد." : "The peer left the class.");
          }
          if (payload?.action === "reaction" && typeof payload.value === "string") pushReaction(payload.value);
          if (payload?.action === "end") setPhase("ended");
          break;
        }
        case "offer":
        case "answer":
        case "ice":
          peerSignaledRef.current = true;
          void engineRef.current?.handleSignal(event.type, event.payload);
          break;
        case "system": {
          const payload = event.payload as { action?: string } | undefined;
          if (payload?.action === "join") {
            setPeerOnline(true);
            engineRef.current?.markPeerReady();
            setChat((items) => [
              ...items,
              { id: uid(), from: 0, text: fa ? "طرف مقابل وارد کلاس شد." : "The peer joined.", at: event.at, mine: false },
            ]);
          }
          if (payload?.action === "leave") {
            setPeerOnline(false);
            setChat((items) => [
              ...items,
              { id: uid(), from: 0, text: fa ? "طرف مقابل خارج شد." : "The peer left.", at: event.at, mine: false },
            ]);
          }
          break;
        }
      }
    },
    [chatOpen, fa, pushReaction, showNotice],
  );

  /* ---------- ورود به کلاس ---------- */
  const joinClassroom = useCallback(
    async (withMedia: boolean) => {
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      previewStream?.getTracks().forEach((track) => track.stop());

      let stream: MediaStream | null = null;
      if (withMedia) {
        const result = await acquireMediaStream("both");
        if (!result.ok) {
          setMediaError(result.message);
          return;
        }
        stream = result.stream;
        setMediaError("");
      }
      liveStreamRef.current = stream;
      setHasLiveMedia(Boolean(stream));
      setPhase("live");

      // transport اختصاصی اپ: درخواست‌ها با توکن Bearer مستقیم به API می‌روند
      // (در وب همین runtime به BFF نسبی وصل است) — یک مسیر برای هر دو محیط.
      const transport: LiveTransport = (path, init) =>
        runtime.request(path, { method: init?.method, body: init?.body as BodyInit | undefined });

      const client = new LiveClient({
        sessionId,
        onEvent: handleEvent,
        onStatus: (value) => setStatus(value),
        transport,
      });
      clientRef.current = client;

      const engine = new LiveEngine({
        role,
        onRemoteStream: (remote) => {
          setRemoteActive(remote.getTracks().length > 0);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
        },
        onState: () => { /* وضعیت اتصال از سیگنالینگ نشان داده می‌شود */ },
        send: (type, payload) => client.send(type, payload),
      });
      engineRef.current = engine;
      engine.setCameraTrack(stream?.getVideoTracks()[0] ?? null);
      await engine.ensureConnection();
      if (stream) await engine.setLocalMedia(stream);
      if (localVideoRef.current && stream) localVideoRef.current.srcObject = stream;

      await client.connect();

      // معلم: اگر بعد از ۸ ثانیه هیچ سیگنالی از طرف مقابل نیامد، خودش offer می‌فرستد.
      window.setTimeout(() => {
        if (isTeacherSide && !peerSignaledRef.current) void engine.initiate();
      }, 8_000);
    },
    [handleEvent, previewStream, role, runtime, sessionId, isTeacherSide],
  );

  /* ---------- تلاش دوبارهٔ رسانه در میانهٔ کلاس ---------- */
  const retryLiveMedia = useCallback(async () => {
    const result = await acquireMediaStream("both");
    if (!result.ok) {
      showNotice(result.message);
      return;
    }
    const stream = result.stream;
    liveStreamRef.current = stream;
    setHasLiveMedia(true);
    setMediaError("");
    await engineRef.current?.setLocalMedia(stream);
    engineRef.current?.setCameraTrack(stream.getVideoTracks()[0] ?? null);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    setMicOn(true);
    setCamOn(stream.getVideoTracks().length > 0);
  }, [showNotice]);

  /* ---------- چرخش دوربین (موبایل) ---------- */
  const facingRef = useRef<"user" | "environment">("user");
  const flipCamera = useCallback(async () => {
    const next = facingRef.current === "user" ? "environment" : "user";
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: next }, width: { ideal: 1280 } },
      });
      const [track] = media.getVideoTracks();
      const stream = liveStreamRef.current;
      const engine = engineRef.current;
      if (track && stream && engine) {
        stream.getVideoTracks().forEach((item) => item.stop());
        stream.removeTrack(stream.getVideoTracks()[0]);
        stream.addTrack(track);
        await engine.setLocalMedia(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        facingRef.current = next;
      } else {
        media.getTracks().forEach((item) => item.stop());
      }
    } catch (error) {
      showNotice(
        error instanceof Error && error.name === "NotAllowedError"
          ? fa
            ? "دسترسی دوربین داده نشد؛ از تنظیمات اپ اجازه دهید."
            : "Camera permission was not granted."
          : fa
            ? "چرخش دوربین ممکن نشد."
            : "Camera flip failed.",
      );
    }
  }, [fa, showNotice]);

  /* ---------- اقدامات ---------- */
  function sendChat() {
    const text = chatDraft.trim();
    if (!text || !clientRef.current) return;
    setChat((items) => [...items, { id: uid(), from: myIdRef.current, text, at: Date.now(), mine: true }]);
    clientRef.current.send("chat", { text: text.slice(0, 1000) });
    setChatDraft("");
  }

  function sendReaction(emoji: string) {
    pushReaction(emoji);
    setReactionsOpen(false);
    clientRef.current?.send("control", { action: "reaction", value: emoji });
  }

  const leaveClassroom = useCallback(
    (complete = false) => {
      setEnding(true);
      clientRef.current?.send("control", { action: complete ? "end" : "bye" });
      clientRef.current?.close();
      engineRef.current?.close();
      if (complete && isTeacherSide) {
        void runtime
          .request(`/sessions/${sessionId}/complete`, { method: "POST" })
          .catch(() => { /* تسویه ممکن است به‌زمان وابسته باشد */ });
      }
      window.setTimeout(() => {
        setEnding(false);
        setPhase("ended");
      }, 350);
    },
    [isTeacherSide, runtime, sessionId],
  );

  const peerLabel = peerName;
  const waitingText = fa
    ? isTeacherSide
      ? "در انتظار پیوستن دانش‌آموز…"
      : "در انتظار پیوستن استاد…"
    : isTeacherSide
      ? "Waiting for the learner…"
      : "Waiting for the teacher…";

  /* ═══════════════════════════ رندر ═══════════════════════════ */

  return (
    <div
      dir={fa ? "rtl" : "ltr"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: STAGE_BG,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: typography.fontFamily,
        animation: "voddaLiveFade .28s ease",
      }}
    >
      <style>{`
        @keyframes voddaLiveFade { from { opacity: 0; transform: scale(1.015); } to { opacity: 1; transform: scale(1); } }
        @keyframes voddaPulse {
          0% { box-shadow: 0 0 0 0 rgba(179,213,110,.45); }
          70% { box-shadow: 0 0 0 18px rgba(179,213,110,0); }
          100% { box-shadow: 0 0 0 0 rgba(179,213,110,0); }
        }
        @keyframes voddaFloatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-150px) scale(1.6); opacity: 0; }
        }
        @keyframes voddaSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes voddaSpin { to { transform: rotate(360deg); } }
        .vodda-live-scroll::-webkit-scrollbar { width: 5px; }
        .vodda-live-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.22); border-radius: 99px; }
        .vodda-live-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {phase === "preflight" ? (
        /* ─────────── پیش‌آزمون ورود ─────────── */
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }} className="vodda-live-scroll">
          <div style={{ padding: `calc(16px + env(safe-area-inset-top)) 20px 8px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "grid", gap: 2 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#b6c09b", letterSpacing: .3 }}>
                {fa ? "کلاس تصویری وُدّا" : "Vodda Live Class"}
              </span>
              <strong style={{ fontSize: 16.5, fontWeight: 800, color: "#fffaf0" }}>{peerLabel}</strong>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={fa ? "بستن" : "Close"}
              style={{ width: 40, height: 40, borderRadius: "50%", ...glassStyle(), color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}
            >
              <Icon name="x" size={18} stroke={2} />
            </button>
          </div>

          <div style={{ padding: "6px 20px 4px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#c9d1ba", fontWeight: 600 }}>
              <Icon name="clock" size={13} />
              {countdown || (fa ? "هنوز شروع نشده" : "Not started yet")}
            </span>
          </div>

          {/* کارت پیش‌نمایش */}
          <div style={{ padding: "14px 20px 6px" }}>
            <div
              style={{
                position: "relative",
                borderRadius: 24,
                overflow: "hidden",
                background: "#141a0e",
                aspectRatio: "3 / 3.4",
                border: "1px solid rgba(255,255,255,.09)",
                boxShadow: "0 18px 44px rgba(0,0,0,.4)",
              }}
            >
              <video
                ref={previewVideoRef}
                autoPlay
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
              />
              {!previewStream && (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                  <div style={{ display: "grid", justifyItems: "center", gap: 14 }}>
                    <span
                      style={{
                        width: 74,
                        height: 74,
                        borderRadius: "50%",
                        ...glassStyle(),
                        display: "grid",
                        placeItems: "center",
                        animation: "voddaSpin 1.1s linear infinite",
                        borderColor: "rgba(179,213,110,.5)",
                        borderStyle: "solid",
                      }}
                    >
                      <span style={{ width: 34, height: 34, borderRadius: "50%", border: "3px solid rgba(255,255,255,.2)", borderTopColor: colors.goldAccent }} />
                    </span>
                    <span style={{ fontSize: 12.5, color: "#c9d1ba", fontWeight: 600 }}>
                      {fa ? "در حال دسترسی به دوربین و میکروفون…" : "Accessing camera & microphone…"}
                    </span>
                  </div>
                </div>
              )}
              {/* برچسب شما */}
              {previewStream && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 14,
                    insetInlineStart: 14,
                    padding: "6px 14px",
                    borderRadius: 999,
                    ...glassStyle(),
                    color: "#fffaf0",
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  {fa ? "پیش‌نمایش شما" : "Your preview"}
                </span>
              )}
            </div>
          </div>

          {/* سطح صدای میکروفون */}
          <div style={{ padding: "6px 24px", display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="mic" size={15} stroke={1.8} />
            <div style={{ flex: 1, height: 6, borderRadius: 999, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${micLevel}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #93a172, #b3d56e)",
                  transition: "width .12s linear",
                }}
              />
            </div>
          </div>

          {mediaError && (
            <div style={{ padding: "10px 20px 0" }}>
              <div
                style={{
                  padding: "13px 15px",
                  borderRadius: 16,
                  background: "rgba(191,149,64,.13)",
                  border: "1px solid rgba(191,149,64,.35)",
                  display: "grid",
                  gap: 9,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#e7d5a8", fontSize: 12.5, fontWeight: 800 }}>
                  <Icon name="info" size={15} />
                  {fa ? "مجوز دوربین/میکروفون لازم است" : "Camera/mic permission required"}
                </div>
                <span style={{ fontSize: 11.8, lineHeight: 2, color: "#e8dcbc" }}>{mediaError}</span>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{
                    justifySelf: "start",
                    border: 0,
                    borderRadius: 12,
                    padding: "8px 16px",
                    background: colors.gold,
                    color: colors.onGold,
                    fontWeight: 800,
                    fontSize: 12.5,
                    cursor: "pointer",
                  }}
                >
                  {fa ? "تلاش دوباره" : "Retry"}
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: "auto", padding: "18px 20px calc(18px + env(safe-area-inset-bottom))", display: "grid", gap: 10 }}>
            <button
              type="button"
              onClick={() => void joinClassroom(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "15px 0",
                borderRadius: 18,
                border: 0,
                background: "linear-gradient(145deg, #4c5a36, #5e6e43 60%, #728350)",
                color: "#fffaf0",
                fontSize: 15,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 10px 26px rgba(76,90,54,.5)",
              }}
            >
              <Icon name="video" size={19} stroke={1.9} />
              {fa ? "ورود به کلاس با دوربین و میکروفون" : "Join with camera & mic"}
            </button>
            <button
              type="button"
              onClick={() => void joinClassroom(false)}
              style={{
                padding: "12px 0",
                borderRadius: 16,
                ...glassStyle(),
                color: "#e8ecdb",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {fa ? "ورود بدون رسانه (فقط تماشا)" : "Join without media"}
            </button>
          </div>
        </div>
      ) : phase === "ended" ? (
        /* ─────────── پایان کلاس ─────────── */
        <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ display: "grid", justifyItems: "center", gap: 14, textAlign: "center" }}>
            <span
              style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                ...glassStyle(),
                display: "grid",
                placeItems: "center",
                animation: "voddaPulse 2s infinite",
              }}
            >
              <Icon name="check" size={34} stroke={2.2} />
            </span>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fffaf0", margin: 0 }}>
              {fa ? "کلاس پایان یافت" : "Class ended"}
            </h2>
            <p style={{ fontSize: 13, color: "#c9d1ba", margin: 0, maxWidth: 300, lineHeight: 2 }}>
              {fa
                ? "امیدواریم جلسهٔ مفیدی داشته باشید. امتیاز شما برای استاد ارزشمند است."
                : "Hope you had a great session. Your rating matters."}
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: 8,
                border: 0,
                borderRadius: 16,
                padding: "13px 34px",
                background: "linear-gradient(145deg, #4c5a36, #5e6e43)",
                color: "#fffaf0",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {fa ? "بازگشت به جلسات" : "Back to sessions"}
            </button>
          </div>
        </div>
      ) : (
        /* ─────────── کلاس زنده ─────────── */
        <>
          {/* صحنهٔ ویدیو */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#171c10" }}
          />

          {/* نگه‌دارندهٔ انتظار */}
          {!remoteActive && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 28 }}>
              <div style={{ display: "grid", justifyItems: "center", gap: 16, textAlign: "center" }}>
                <div style={{ position: "relative" }}>
                  {peerAvatar ? (
                    <span style={{ display: "grid", placeItems: "center", animation: "voddaPulse 2.2s infinite", borderRadius: "50%" }}>
                      <Avatar name={peerName} src={peerAvatar} size={92} ring={false} />
                    </span>
                  ) : (
                    <span
                      style={{
                        width: 92,
                        height: 92,
                        borderRadius: "50%",
                        ...glassStyle({ background: "rgba(255,255,255,.12)" }),
                        display: "grid",
                        placeItems: "center",
                        animation: "voddaPulse 2.2s infinite",
                      }}
                    >
                      <Icon name="video" size={36} stroke={1.6} />
                    </span>
                  )}
                </div>
                <strong style={{ fontSize: 16, fontWeight: 800, color: "#fffaf0" }}>{peerLabel}</strong>
                <span style={{ fontSize: 12.5, color: "#c9d1ba", fontWeight: 600 }}>{waitingText}</span>
                {status === "error" && (
                  <button
                    type="button"
                    onClick={() => void retryLiveMedia()}
                    style={{ border: 0, borderRadius: 12, padding: "9px 18px", background: colors.gold, color: colors.onGold, fontWeight: 800, fontSize: 12.5, cursor: "pointer" }}
                  >
                    {fa ? "تلاش دوباره" : "Retry"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* هدر شیشه‌ای */}
          <div
            style={{
              position: "absolute",
              top: 0,
              insetInline: 0,
              padding: `calc(12px + env(safe-area-inset-top)) 14px 10px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              background: "linear-gradient(180deg, rgba(15,19,10,.72), rgba(15,19,10,0))",
              pointerEvents: "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, pointerEvents: "auto" }}>
              <StatusChip status={status} lang={lang} />
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 999,
                  ...glassStyle(),
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: peerOnline ? "#d7e6b8" : "#a9b39b",
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: 999, background: peerOnline ? "#9dc564" : "#77836b" }} />
                {peerOnline ? (fa ? "طرف مقابل آنلاین" : "Peer online") : (fa ? "در انتظار طرف مقابل" : "Waiting for peer")}
              </span>
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#e8ecdb", pointerEvents: "auto" }}>{countdown}</span>
          </div>

          {/* پیام شناور */}
          {notice && (
            <div style={{ position: "absolute", top: 64, insetInline: 0, display: "grid", justifyContent: "center", padding: "0 20px", pointerEvents: "none" }}>
              <span
                role="status"
                style={{
                  padding: "9px 18px",
                  borderRadius: 999,
                  ...glassStyle({ background: "rgba(191,149,64,.2)", borderColor: "rgba(191,149,64,.45)" }),
                  color: "#f4ead0",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {notice}
              </span>
            </div>
          )}

          {/* خطای رسانه در میانهٔ کلاس */}
          {mediaError && !hasLiveMedia && (
            <div style={{ position: "absolute", bottom: 96, insetInline: 0, display: "grid", justifyContent: "center", padding: "0 20px" }}>
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 16,
                  ...glassStyle({ background: "rgba(179,64,58,.18)", borderColor: "rgba(179,64,58,.4)" }),
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  maxWidth: 380,
                }}
              >
                <span style={{ flex: 1, fontSize: 11.8, color: "#f2c9c2", fontWeight: 700, lineHeight: 1.9 }}>{mediaError}</span>
                <button
                  type="button"
                  onClick={() => void retryLiveMedia()}
                  style={{ border: 0, borderRadius: 10, padding: "8px 14px", background: "#b3403a", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" }}
                >
                  {fa ? "تلاش دوباره" : "Retry"}
                </button>
              </div>
            </div>
          )}

          {/* ویدیوی خودم (PiP) */}
          <div
            style={{
              position: "absolute",
              bottom: 108,
              insetInlineStart: 14,
              width: 132,
              aspectRatio: "3 / 4",
              borderRadius: 18,
              overflow: "hidden",
              background: "#1a211a",
              border: "1px solid rgba(216,184,105,.4)",
              boxShadow: "0 10px 30px rgba(0,0,0,.45)",
              transition: "all .3s ease",
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
            />
            {!hasLiveMedia && (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#8b9483", fontSize: 10.5, fontWeight: 700 }}>
                {fa ? "بدون دوربین" : "No camera"}
              </div>
            )}
          </div>

          {/* واکنش‌های شناور */}
          {reactions.map((reaction) => (
            <span
              key={reaction.id}
              style={{
                position: "absolute",
                bottom: 130,
                insetInlineStart: `${18 + (parseInt(reaction.id.slice(-2), 16) % 55)}%`,
                fontSize: 34,
                animation: "voddaFloatUp 2.6s ease-out forwards",
                pointerEvents: "none",
              }}
            >
              {reaction.emoji}
            </span>
          ))}

          {/* گیرندهٔ واکنش‌ها */}
          {reactionsOpen && (
            <div
              role="presentation"
              onClick={() => setReactionsOpen(false)}
              style={{ position: "absolute", inset: 0, zIndex: 40 }}
            />
          )}
          {reactionsOpen && (
            <div
              style={{
                position: "absolute",
                bottom: 118,
                insetInlineEnd: 14,
                display: "flex",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 999,
                ...glassStyle({ background: "rgba(23,28,16,.92)" }),
                zIndex: 41,
              }}
            >
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReaction(emoji)}
                  style={{ background: "none", border: 0, fontSize: 24, cursor: "pointer", padding: 2 }}
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* نوار ابزار پایین */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              insetInline: 0,
              padding: `10px 16px calc(14px + env(safe-area-inset-bottom))`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              background: "linear-gradient(0deg, rgba(15,19,10,.78), rgba(15,19,10,0))",
              zIndex: 30,
            }}
          >
            <RoundButton
              label={micOn ? (fa ? "قطع میکروفون" : "Mute") : (fa ? "وصل میکروفون" : "Unmute")}
              active={micOn}
              onClick={() => {
                setMicOn(!micOn);
                void engineRef.current?.toggleMic(!micOn);
              }}
            >
              <Icon name="mic" size={22} stroke={1.9} />
            </RoundButton>
            <RoundButton
              label={camOn ? (fa ? "خاموش کردن دوربین" : "Camera off") : (fa ? "روشن کردن دوربین" : "Camera on")}
              active={camOn}
              onClick={() => {
                setCamOn(!camOn);
                void engineRef.current?.toggleCamera(!camOn);
              }}
            >
              <span style={{ opacity: camOn ? 1 : 0.45 }}><Icon name="video" size={22} stroke={1.9} /></span>
            </RoundButton>
            <RoundButton
              label={fa ? "واکنش‌ها" : "Reactions"}
              active={reactionsOpen}
              onClick={() => setReactionsOpen((open) => !open)}
            >
              <span style={{ fontSize: 21, lineHeight: 1 }}>🎉</span>
            </RoundButton>
            <RoundButton
              label={fa ? "گفت‌وگو" : "Chat"}
              active={chatOpen}
              badge={unread > 0 && !chatOpen ? unread : 0}
              onClick={() => {
                setChatOpen((open) => !open);
                setUnread(0);
              }}
            >
              <Icon name="message" size={21} stroke={1.9} />
            </RoundButton>
            <RoundButton label={fa ? "چرخش دوربین" : "Flip camera"} onClick={() => void flipCamera()}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>🔄</span>
            </RoundButton>
            <RoundButton
              label={isTeacherSide ? (fa ? "پایان کلاس" : "End class") : (fa ? "خروج" : "Leave")}
              danger
              onClick={() => void leaveClassroom(isTeacherSide)}
            >
              <Icon name="phone" size={22} stroke={1.9} />
            </RoundButton>
          </div>

          {/* پوشش بستن کلاس */}
          {ending && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(15,19,10,.6)", display: "grid", placeItems: "center", zIndex: 60 }}>
              <span style={{ width: 46, height: 46, borderRadius: "50%", border: "3px solid rgba(255,255,255,.2)", borderTopColor: colors.goldAccent, animation: "voddaSpin .9s linear infinite" }} />
            </div>
          )}

          {/* چت درون‌کلاس */}
          {chatOpen && (
            <div
              role="presentation"
              onClick={() => setChatOpen(false)}
              style={{ position: "absolute", inset: 0, background: "rgba(10,13,7,.4)", zIndex: 45 }}
            />
          )}
          {chatOpen && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                insetInline: 0,
                maxHeight: "62%",
                display: "flex",
                flexDirection: "column",
                borderRadius: "24px 24px 0 0",
                background: "rgba(23,28,16,.97)",
                borderTop: "1px solid rgba(255,255,255,.12)",
                boxShadow: "0 -16px 44px rgba(0,0,0,.5)",
                zIndex: 46,
                animation: "voddaSheetUp .26s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 10px" }}>
                <strong style={{ fontSize: 14.5, fontWeight: 800, color: "#fffaf0" }}>{fa ? "گفت‌وگوی کلاس" : "Class chat"}</strong>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  aria-label={fa ? "بستن چت" : "Close chat"}
                  style={{ width: 32, height: 32, borderRadius: "50%", ...glassStyle(), color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}
                >
                  <Icon name="x" size={15} stroke={2} />
                </button>
              </div>
              <div
                ref={chatBodyRef}
                className="vodda-live-scroll"
                style={{ flex: 1, overflowY: "auto", padding: "4px 16px 10px", display: "flex", flexDirection: "column", gap: 8, minHeight: 120 }}
              >
                {chat.map((line) =>
                  line.from === 0 ? (
                    <div
                      key={line.id}
                      style={{
                        alignSelf: "center",
                        padding: "4px 14px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,.07)",
                        color: "#a9b39b",
                        fontSize: 10.5,
                        fontWeight: 700,
                      }}
                    >
                      {line.text}
                    </div>
                  ) : (
                    <div key={line.id} style={{ alignSelf: line.mine ? "flex-start" : "flex-end", maxWidth: "84%", display: "grid", gap: 3 }}>
                      <div
                        style={{
                          padding: "9px 14px",
                          borderRadius: line.mine ? "16px 16px 5px 16px" : "16px 16px 16px 5px",
                          background: line.mine ? "linear-gradient(145deg, #5e6e43, #728350)" : "rgba(255,255,255,.1)",
                          color: line.mine ? "#fffaf0" : "#eef1e6",
                          fontSize: 13,
                          lineHeight: 1.9,
                          whiteSpace: "pre-wrap",
                          boxShadow: "0 3px 10px rgba(0,0,0,.2)",
                        }}
                      >
                        {line.text}
                      </div>
                      <span style={{ fontSize: 9.5, color: "#77836b", padding: "0 6px", textAlign: line.mine ? "left" : "right" }}>
                        {chatTime(line.at, lang)}
                      </span>
                    </div>
                  ),
                )}
                {chat.length === 0 && (
                  <div style={{ margin: "auto", display: "grid", justifyItems: "center", gap: 6, color: "#a9b39b", fontSize: 12 }}>
                    <Icon name="message" size={26} stroke={1.5} />
                    <span>{fa ? "سلام کنید و گفت‌وگو را شروع کنید." : "Say hi and start chatting."}</span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, padding: "10px 14px calc(12px + env(safe-area-inset-bottom))", borderTop: "1px solid rgba(255,255,255,.08)" }}>
                <input
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") sendChat(); }}
                  placeholder={fa ? "پیام خود را بنویسید…" : "Type a message…"}
                  maxLength={1000}
                  style={{
                    flex: 1,
                    padding: "11px 15px",
                    borderRadius: 14,
                    border: `1px solid ${GLASS_BORDER}`,
                    background: "rgba(255,255,255,.06)",
                    color: "#fffaf0",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={sendChat}
                  disabled={!chatDraft.trim()}
                  aria-label={fa ? "ارسال پیام" : "Send"}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border: 0,
                    background: chatDraft.trim() ? "linear-gradient(145deg, #4c5a36, #5e6e43)" : "rgba(255,255,255,.08)",
                    color: chatDraft.trim() ? "#fffaf0" : "#77836b",
                    cursor: chatDraft.trim() ? "pointer" : "default",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon name="arrowL" size={18} stroke={2} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

}
