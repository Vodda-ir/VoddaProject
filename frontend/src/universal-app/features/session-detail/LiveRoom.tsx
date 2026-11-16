"use client";

// کلاس زندهٔ تصویری وُدّا در اپ جامع — پوشش تمام‌صفحه روی صفحهٔ جزئیات جلسه.
// ورود با پیش‌آزمون دوربین/میکروفون، ویدیوی P2P، چت درون‌کلاس (وب‌سوکت)
// و کلیدهای قطع صدا/تصویر و خروج. موتور و کلاینت سیگنالینگ از lib/live.

import { useCallback, useEffect, useRef, useState } from "react";
import { LiveClient, type LiveEvent, type LiveStatus } from "../../../lib/live/client";
import { LiveEngine, type EngineRole } from "../../../lib/live/engine";
import { localizedDigits } from "../../ui/persian";
import { Avatar } from "../../ui";
import { useAppearance } from "../../ui/appearance";

type ChatLine = { id: string; from: number; text: string; at: number; mine: boolean };

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

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * تلاش پلکانی برای گرفتن دوربین/میکروفون — موبایل‌ها به دلایل مختلف
 * (محدودیت دقت، اشغال بودن سخت‌افزار، مجوز ناقص) درخواست سخت‌گیرانه را رد
 * می‌کنند؛ اول آسان‌ترین قید، بعد بدون قید، و در نهایت فقط صدا.
 */
async function acquireMedia(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  const attempts: MediaStreamConstraints[] = [
    {
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: { echoCancellation: true, noiseSuppression: true },
    },
    { video: true, audio: true },
    { video: false, audio: true },
  ];
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      /* تلاش بعدی */
    }
  }
  return null;
}

function chatTime(at: number, lang: "fa" | "en"): string {
  const date = new Date(at);
  return `${localizedDigits(String(date.getHours()).padStart(2, "0"), lang)}:${localizedDigits(String(date.getMinutes()).padStart(2, "0"), lang)}`;
}

const controlButton = (active: boolean): React.CSSProperties => ({
  width: 52,
  height: 52,
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  border: 0,
  cursor: "pointer",
  background: active ? "rgba(255,255,255,.14)" : "#b3403a",
  color: "#fff",
  fontSize: 21,
});

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
  const [phase, setPhase] = useState<"preflight" | "live" | "ended">("preflight");
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [mediaError, setMediaError] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteActive, setRemoteActive] = useState(false);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [countdown, setCountdown] = useState("");

  const clientRef = useRef<LiveClient | null>(null);
  const engineRef = useRef<LiveEngine | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const peerOnlineRef = useRef(false);
  const engineRoleRef = useRef<EngineRole>(role);
  const wakeLockRef = useRef<{ release: () => Promise<void>; released: boolean } | null>(null);
  const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
  const { L, lang, dir } = useAppearance();

  const isTeacherSide = role !== "learner";

  /* ---------- پیش‌آزمون: پیش‌نمایش دوربین و سطح میکروفون ---------- */
  useEffect(() => {
    if (phase !== "preflight") return;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    (async () => {
      stream = await acquireMedia();
      if (!stream) {
        setMediaError(L("دسترسی به دوربین/میکروفون ممکن نشد؛ می‌توانید بدون آن‌ها وارد کلاس شوید."));
        return;
      }
      previewStreamRef.current = stream;
      setMediaError("");
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const [audioTrack] = stream.getAudioTracks();
      if (audioTrack) {
        ctx = new AudioContext();
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

  /* ---------- شمارش معکوس جلسه ---------- */
  useEffect(() => {
    if (!startAt) return;
    const endAt = new Date(startAt).getTime() + Math.max(1, durationMinutes) * 60_000;
    const tick = () => {
      const diff = endAt - Date.now();
      if (diff <= 0) {
        setCountdown(L("زمان جلسه به پایان رسیده است"));
        return;
      }
      const minutes = Math.floor(diff / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);
      setCountdown(
        L("{time} باقی‌مانده").replace(
          "{time}",
          `${localizedDigits(minutes, lang)}:${localizedDigits(String(seconds).padStart(2, "0"), lang)}`,
        ),
      );
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startAt, durationMinutes, L, lang]);

  /* ---------- رویدادهای سیگنالینگ ---------- */
  const handleEvent = useCallback(
    (event: LiveEvent) => {
      if (event.from === myUserId && event.type !== "system") return;
      switch (event.type) {
        case "chat": {
          const payload = event.payload as { text?: string } | undefined;
          const text = String(payload?.text ?? "").slice(0, 1000);
          if (!text) return;
          setChat((items) => [...items, { id: uid(), from: event.from, text, at: event.at, mine: false }]);
          break;
        }
        case "control": {
          const payload = event.payload as { action: string; value?: boolean | string } | undefined;
          if (payload?.action === "bye") {
            setNotice(L("طرف مقابل کلاس را ترک کرد."));
            window.setTimeout(() => setNotice(""), 4000);
          }
          if (payload?.action === "end") setPhase("ended");
          break;
        }
        case "offer":
        case "answer":
        case "ice":
          void engineRef.current?.handleSignal(event.type, event.payload);
          break;
        case "system": {
          const payload = event.payload as { action?: string } | undefined;
          if (payload?.action === "join") {
            peerOnlineRef.current = true;
            setChat((items) => [...items, { id: uid(), from: 0, text: L("طرف مقابل وارد کلاس شد."), at: event.at, mine: false }]);
            if (isTeacherSide) void engineRef.current?.initiate();
          }
          if (payload?.action === "leave") {
            peerOnlineRef.current = false;
            setChat((items) => [...items, { id: uid(), from: 0, text: L("طرف مقابل خارج شد."), at: event.at, mine: false }]);
          }
          break;
        }
      }
    },
    [isTeacherSide, myUserId],
  );

  useEffect(() => {
    return () => {
      clientRef.current?.close();
      engineRef.current?.close();
      liveStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    const body = chatBodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [chat, chatOpen]);

  /* ---------- موبایل: بیدار نگه‌داشتن صفحه در طول کلاس ---------- */
  useEffect(() => {
    if (phase !== "live") return;
    type WakeLockSentinel = { release: () => Promise<void>; released: boolean };
    const wakeLockApi = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> } }).wakeLock;
    if (!wakeLockApi) return;
    let released = false;
    wakeLockApi.request("screen")
      .then((sentinel) => {
        if (released) {
          void sentinel.release().catch(() => {});
          return;
        }
        wakeLockRef.current = sentinel;
      })
      .catch(() => {});
    return () => {
      released = true;
      const sentinel = wakeLockRef.current;
      wakeLockRef.current = null;
      void sentinel?.release().catch(() => {});
    };
  }, [phase]);

  /* ---------- موبایل: برگشت از پس‌زمینه/تعویض شبکه → بازیابی اتصال ---------- */
  useEffect(() => {
    if (phase !== "live") return;
    const recover = () => {
      void engineRef.current?.reconnect();
      const remote = remoteVideoRef.current;
      if (remote && remote.paused) {
        remote.play().catch(() => setNeedsTapToPlay(true));
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") recover();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", recover);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", recover);
    };
  }, [phase]);

  /* ---------- پخش خودکار ویدیوی طرف مقابل (سیاست autoplay موبایل) ---------- */
  useEffect(() => {
    if (!remoteActive) return;
    const remote = remoteVideoRef.current;
    if (!remote) return;
    remote.play().then(() => setNeedsTapToPlay(false)).catch(() => setNeedsTapToPlay(true));
  }, [remoteActive]);

  /* ---------- ورود به کلاس ---------- */
  async function join(withMedia: boolean) {
    previewStreamRef.current?.getTracks().forEach((track) => track.stop());
    previewStreamRef.current = null;

    let stream: MediaStream | null = null;
    if (withMedia) {
      stream = await acquireMedia();
      if (!stream) {
        setMediaError(L("ورود با دوربین/میکروفون ناموفق بود؛ بدون رسانه وارد می‌شوید."));
      }
    }
    liveStreamRef.current = stream;
    setPhase("live");

    const client = new LiveClient({
      sessionId,
      onEvent: handleEvent,
      onStatus: (value) => setStatus(value),
    });
    clientRef.current = client;

    const engine = new LiveEngine({
      role: engineRoleRef.current,
      onRemoteStream: (remote) => {
        setRemoteActive(remote.getTracks().length > 0);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
      },
      onState: () => {},
      send: (type, payload) => client.send(type, payload),
    });
    engineRef.current = engine;
    engine.setCameraTrack(stream?.getVideoTracks()[0] ?? null);
    await engine.ensureConnection();
    if (stream) await engine.setLocalMedia(stream);
    if (localVideoRef.current && stream) localVideoRef.current.srcObject = stream;
    if (engine.isInitiator && peerOnlineRef.current) void engine.initiate();

    await client.connect();
  }

  function sendChat() {
    const text = chatDraft.trim();
    if (!text || !clientRef.current) return;
    setChat((items) => [...items, { id: uid(), from: myUserId, text, at: Date.now(), mine: true }]);
    clientRef.current.send("chat", { text: text.slice(0, 1000) });
    setChatDraft("");
  }

  function toggleMic() {
    const next = !micOn;
    setMicOn(next);
    liveStreamRef.current?.getAudioTracks().forEach((track) => (track.enabled = next));
  }

  function toggleCam() {
    const next = !camOn;
    setCamOn(next);
    liveStreamRef.current?.getVideoTracks().forEach((track) => (track.enabled = next));
  }

  function leave(complete: boolean) {
    clientRef.current?.send("control", { action: complete ? "end" : "bye" });
    clientRef.current?.close();
    engineRef.current?.close();
    liveStreamRef.current?.getTracks().forEach((track) => track.stop());
    setPhase("ended");
    onClose();
  }

  const statusLabel =
    status === "live"
      ? L("اتصال زنده")
      : status === "polling"
        ? L("اتصال پایدار (کانال پشتیبان)")
        : status === "connecting"
          ? L("در حال اتصال…")
          : status === "error"
            ? L("خطای دسترسی")
            : L("پایان");

  /* ---------- پوشش تمام‌صفحه ---------- */
  return (
    <div
      role="dialog"
      aria-label={L("کلاس زندهٔ تصویری")}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "#171b14",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        direction: dir,
        fontFamily: "inherit",
      }}
    >
      {/* نوار بالا */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: "rgba(23,27,20,.92)",
          borderBottom: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <Avatar name={peerName} src={peerAvatar || undefined} size={38} ring={false} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{peerName}</strong>
          <span style={{ display: "block", fontSize: 11, color: remoteActive ? "#a8d08d" : "rgba(255,255,255,.55)" }}>
            {remoteActive ? L("متصل") : statusLabel}
            {countdown ? ` · ${countdown}` : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setChatOpen((open) => !open)}
          aria-label={L("چت کلاس")}
          style={{
            height: 38, padding: "0 14px", borderRadius: 999, border: "1px solid rgba(255,255,255,.18)",
            background: chatOpen ? "rgba(255,255,255,.16)" : "transparent", color: "#fff", cursor: "pointer",
            fontFamily: "inherit", fontSize: 12.5, fontWeight: 700,
          }}
        >
          {L("چت")}
        </button>
      </div>

      {/* بدنه */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateRows: "1fr auto" }}>
        <div style={{ position: "relative", minHeight: 0, background: "#10130e" }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            aria-label={L("تصویر طرف مقابل")}
            onDoubleClick={() => remoteVideoRef.current?.play().catch(() => {})}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", background: "#10130e" }}
          />
          {needsTapToPlay && phase === "live" ? (
            <button
              type="button"
              onClick={() => {
                const remote = remoteVideoRef.current;
                if (!remote) return;
                remote.play()
                  .then(() => setNeedsTapToPlay(false))
                  .catch(() => {});
              }}
              style={{
                position: "absolute", top: 14, insetInline: 0, marginInline: "auto", zIndex: 4,
                width: "fit-content", display: "flex", alignItems: "center", gap: 8,
                padding: "9px 18px", borderRadius: 999, border: "1px solid rgba(216,184,105,.7)",
                background: "rgba(23,27,20,.9)", color: "#ffd98c", fontFamily: "inherit",
                fontSize: 12.5, fontWeight: 800, cursor: "pointer",
              }}
            >
              ▶ {L("برای پخش تصویر و صدای طرف مقابل لمس کنید")}
            </button>
          ) : null}
          {!remoteActive && phase === "live" ? (
            <div
              style={{
                position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center",
                padding: 24, color: "rgba(255,255,255,.75)", fontSize: 13.5, lineHeight: 2,
              }}
            >
              <div>
                <Avatar name={peerName} src={peerAvatar || undefined} size={84} ring tone="gold" />
                <p style={{ margin: "14px 0 0", fontWeight: 700 }}>{peerName}</p>
                <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                  {L("در انتظار ورود طرف مقابل… همین صفحه را باز نگه دارید.")}
                </p>
              </div>
            </div>
          ) : null}
          {phase !== "live" ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              aria-label={L("پیش‌نمایش دوربین شما")}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
            />
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              aria-label={L("تصویر شما")}
              style={{
                position: "absolute", insetInlineStart: 14, bottom: 14, width: 116, height: 158,
                objectFit: "cover", borderRadius: 16, border: "2px solid rgba(216,184,105,.75)",
                boxShadow: "0 10px 24px rgba(0,0,0,.45)", background: "#000", transform: "scaleX(-1)", zIndex: 2,
              }}
            />
          )}

          {mediaError && phase === "preflight" ? (
            <p style={{ position: "absolute", insetInline: 16, bottom: 14, margin: 0, zIndex: 2, fontSize: 11.5, lineHeight: 1.8, color: "#ffd9d0", background: "rgba(179,64,58,.24)", borderRadius: 12, padding: "8px 12px" }}>
              {mediaError}
            </p>
          ) : null}

          {/* چت درون‌کلاس */}
          {chatOpen ? (
            <div
              style={{
                position: "absolute", insetInline: 0, bottom: 0, zIndex: 3, maxHeight: "46%",
                display: "grid", gridTemplateRows: "1fr auto",
                background: "rgba(16,19,14,.88)", borderTop: "1px solid rgba(255,255,255,.12)", backdropFilter: "blur(6px)",
              }}
            >
              <div ref={chatBodyRef} style={{ overflowY: "auto", padding: "10px 14px", display: "grid", gap: 6, alignContent: "start" }}>
                {chat.map((line) => (
                  <div
                    key={line.id}
                    style={{
                      maxWidth: "86%", justifySelf: line.mine ? "start" : "end", fontSize: 12.5, lineHeight: 1.8,
                      background: line.mine ? "rgba(125,143,96,.55)" : "rgba(255,255,255,.10)",
                      color: "#fff", borderRadius: 14, padding: "7px 12px",
                    }}
                  >
                    {line.text}
                    <span style={{ display: "block", fontSize: 9.5, opacity: 0.65, marginTop: 2 }}>{chatTime(line.at, lang)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, padding: "8px 12px 12px" }}>
                <input
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      sendChat();
                    }
                  }}
                  aria-label={L("متن پیام کلاس")}
                  maxLength={1000}
                  placeholder={L("پیام…")}
                  style={{ flex: 1, minWidth: 0, height: 42, borderRadius: 999, border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.08)", color: "#fff", padding: "0 16px", fontFamily: "inherit", fontSize: 13 }}
                />
                <button
                  type="button"
                  onClick={sendChat}
                  aria-label={L("ارسال پیام کلاس")}
                  style={{ height: 42, padding: "0 18px", borderRadius: 999, border: 0, background: "linear-gradient(145deg,#d8b869,#b8923c)", color: "#221a08", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {L("ارسال")}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* نوار کنترل */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 14,
            padding: "14px 16px calc(14px + env(safe-area-inset-bottom))",
            background: "rgba(23,27,20,.95)", borderTop: "1px solid rgba(255,255,255,.08)",
          }}
        >
          {phase === "preflight" ? (
            <>
              <div style={{ position: "absolute", insetInline: 0, top: -46, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 120, height: 6, borderRadius: 999,
                    background: `linear-gradient(90deg, #d8b869 ${Math.max(6, micLevel)}%, rgba(255,255,255,.16) ${Math.max(6, micLevel)}%)`,
                  }}
                />
              </div>
              <button type="button" onClick={() => void join(false)} style={{ ...controlButton(false), width: "auto", padding: "0 22px", borderRadius: 999, background: "rgba(255,255,255,.12)", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800 }}>
                {L("ورود بدون رسانه")}
              </button>
              <button
                type="button"
                onClick={() => void join(true)}
                style={{
                  width: 68, height: 68, borderRadius: "50%", border: "3px solid rgba(216,184,105,.85)",
                  background: "linear-gradient(145deg,#8fa873,#5f7a48)", color: "#fff", cursor: "pointer", fontSize: 27,
                  boxShadow: "0 14px 30px rgba(95,122,72,.5)",
                }}
                aria-label={L("ورود به کلاس با دوربین و میکروفون")}
              >
                ▶
              </button>
              <button type="button" onClick={() => leave(false)} style={{ ...controlButton(false), width: "auto", padding: "0 22px", borderRadius: 999, background: "#b3403a", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800 }}>
                {L("انصراف")}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={toggleMic} style={controlButton(!micOn)} aria-label={micOn ? L("قطع میکروفون") : L("وصل میکروفون")}>
                {micOn ? "🎙" : "🔇"}
              </button>
              <button type="button" onClick={toggleCam} style={controlButton(!camOn)} aria-label={camOn ? L("قطع دوربین") : L("وصل دوربین")}>
                {camOn ? "🎥" : "🚫"}
              </button>
              <button
                type="button"
                onClick={() => leave(false)}
                style={{ width: 62, height: 62, borderRadius: "50%", border: 0, background: "#b3403a", color: "#fff", cursor: "pointer", fontSize: 24, boxShadow: "0 12px 26px rgba(179,64,58,.5)" }}
                aria-label={L("خروج از کلاس")}
              >
                ✕
              </button>
              {isTeacherSide ? (
                <button
                  type="button"
                  onClick={() => leave(true)}
                  style={{ width: "auto", height: 52, padding: "0 20px", borderRadius: 999, border: "1px solid rgba(216,184,105,.6)", background: "linear-gradient(145deg,#d8b869,#b8923c)", color: "#221a08", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800 }}
                  aria-label={L("پایان جلسه")}
                >
                  {L("پایان جلسه")}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      {notice ? (
        <div
          role="status"
          style={{
            position: "absolute", top: 66, insetInline: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 5,
          }}
        >
          <span style={{ background: "rgba(216,184,105,.95)", color: "#221a08", fontSize: 12, fontWeight: 700, borderRadius: 999, padding: "8px 18px" }}>{notice}</span>
        </div>
      ) : null}
    </div>
  );
}
