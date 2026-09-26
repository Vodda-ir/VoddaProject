"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  Copy,
  Check,
  Users,
  Wifi,
  Camera,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNoorStore } from "@/store/noor-store";
import { useRecitationStore } from "@/store/recitation-store";

// Lazy load PeerJS on client side
let Peer: any = null;
async function loadPeer() {
  if (Peer) return Peer;
  const mod = await import("peerjs");
  Peer = mod.Peer || mod.default?.Peer || mod.default;
  return Peer;
}

interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  audioOn: boolean;
  videoOn: boolean;
}

interface WebRTCVideoChatProps {
  roomName: string;
  displayName: string;
  onHangup?: () => void;
  /**
   * Called when a competition-state message is received from the host.
   * The session-room-view can use this to sync the local recitation store.
   */
  onCompetitionStateReceived?: () => void;
  /**
   * Returns a stable function the parent can call to broadcast the current
   * competition state (host side only).
   */
  onBroadcastReady?: (broadcast: () => void) => void;
}

export function WebRTCVideoChat({
  roomName,
  displayName,
  onHangup,
  onCompetitionStateReceived,
  onBroadcastReady,
}: WebRTCVideoChatProps) {
  const [status, setStatus] = useState<
    "loading" | "permission" | "ready" | "error"
  >("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [copied, setCopied] = useState(false);
  const [peerId, setPeerId] = useState<string>("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<any>(null);
  const streamsRef = useRef<Map<string, MediaStream>>(new Map());
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const connectionsRef = useRef<Map<string, any>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const displayNameRef = useRef(displayName);

  // Pull store actions once — these will be called when remote
  // participants connect/disconnect so RecitationSetup can pick them up.
  const upsertSessionParticipant = useNoorStore((s) => s.upsertSessionParticipant);
  const removeSessionParticipant = useNoorStore((s) => s.removeSessionParticipant);
  const clearSessionParticipants = useNoorStore((s) => s.clearSessionParticipants);

  // Recitation store — host broadcasts competition state to guests; guests
  // receive and apply it via syncFromHost.
  const syncFromHost = useRecitationStore((s) => s.syncFromHost);
  const getSnapshot = useRecitationStore((s) => s.getSnapshot);

  // Broadcast a competition state snapshot to all connected peers (data
  // channels). Called by session-room-view's host-side competition actions.
  const broadcastCompetitionState = useCallback(() => {
    connectionsRef.current.forEach((conn) => {
      try {
        if (conn.open) {
          conn.send({
            type: "competition-state",
            snapshot: getSnapshot(),
          });
        }
      } catch (err) {
        console.warn("[WebRTC] Failed to broadcast competition state:", err);
      }
    });
  }, [getSnapshot]);

  // Expose the broadcast function to the parent (host side) so it can push
  // competition state to guests whenever it changes.
  useEffect(() => {
    if (onBroadcastReady) {
      onBroadcastReady(broadcastCompetitionState);
    }
  }, [broadcastCompetitionState, onBroadcastReady]);

  useEffect(() => {
    displayNameRef.current = displayName;
  }, [displayName]);

  // The host peer ID is deterministic: `monafaseh-${roomName}`.
  // The first user to register with this ID becomes the host.
  // Subsequent users get an `unavailable-id` error from PeerJS (because the
  // host already holds it) and fall back to a guest peer ID, then connect
  // to the host.
  const hostPeerId = useRef<string>(`monafaseh-${roomName}`).current;
  const myPeerId = useRef<string>(
    `monafaseh-${roomName}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  ).current;

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    connectionsRef.current.forEach((conn) => {
      try {
        conn.close();
      } catch {}
    });
    connectionsRef.current.clear();
    streamsRef.current.clear();
    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch {}
      peerRef.current = null;
    }
  }, []);

  // Detect in-app browsers (WebView) that block camera access
  function detectWebView(): { isWebView: boolean; label: string; hint: string } {
    if (typeof navigator === "undefined") {
      return { isWebView: false, label: "", hint: "" };
    }
    const ua = navigator.userAgent || "";
    // Instagram, Facebook, TikTok, Telegram, WhatsApp, Snap, etc.
    const inAppPatterns: Array<{ re: RegExp; label: string; hint: string }> = [
      { re: /Instagram/i, label: "اینستاگرام", hint: "روی سه نقطه بالا کلیک کن و «باز کردن در مرورگر» را بزن" },
      { re: /FBAN|FBAV|Facebook/i, label: "فیسبوک", hint: "روی سه نقطه بالا کلیک کن و «Open in browser» را بزن" },
      { re: /TikTok/i, label: "تیک‌تاک", hint: "روی Share بزن و «Open in browser» را انتخاب کن" },
      { re: /Telegram|TGBot/i, label: "تلگرام", hint: "روی سه نقطه بالا کلیک کن و «Open in external browser» را بزن" },
      { re: /WhatsApp/i, label: "واتس‌اپ", hint: "لینک را در مرورگر گوشی باز کن" },
      { re: /Snapchat/i, label: "اسنپ‌چت", hint: "روی Share بزن و «Open in browser» را انتخاب کن" },
      { re: /MicroMessenger/i, label: "وی‌چت", hint: "روی سه نقطه بزن و «Open in browser» را انتخاب کن" },
    ];
    for (const p of inAppPatterns) {
      if (p.re.test(ua)) {
        return { isWebView: true, label: p.label, hint: p.hint };
      }
    }
    // Detect generic WebView (no Chrome/Safari/Firefox marker but Android/iOS)
    const looksLikeMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    const looksLikeBrowser =
      /Chrome|Safari|Firefox|CriOS|FxiOS|Edge|OPR/i.test(ua);
    if (looksLikeMobile && !looksLikeBrowser) {
      return {
        isWebView: true,
        label: "مرورگر داخلی",
        hint: "صفحه را در مرورگر اصلی گوشی (Chrome یا Safari) باز کن",
      };
    }
    return { isWebView: false, label: "", hint: "" };
  }

  // Detect iOS Safari specifically (it has unique quirks)
  function isIOSSafari(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isWebkit = /WebKit/.test(ua);
    const isNotChrome = !/CriOS/.test(ua);
    return isIOS && isWebkit && isNotChrome;
  }

  function isMobileDevice(): boolean {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      navigator.userAgent,
    ) || (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches);
  }

  // Step 1: Request camera + microphone access (VIDEO PRIORITY)
  // Mobile-friendly: tries multiple constraint levels until one works.
  const requestMediaAccess = useCallback(async (): Promise<MediaStream | null> => {
    console.log("[WebRTC] Requesting camera + microphone access...");

    // Check WebView first — common cause of mobile camera failure.
    const webview = detectWebView();
    if (webview.isWebView) {
      throw new Error(
        `شما داخل مرورگر داخلی ${webview.label} باز کرده‌اید که اجازه دسترسی به دوربین را نمی‌دهد. ${webview.hint} و دوباره تلاش کنید. مرورگرهای پیشنهادی: Chrome یا Safari.`,
      );
    }

    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Try to polyfill for older mobile browsers
      const legacyGetUserMedia =
        (navigator as any).getUserMedia ||
        (navigator as any).webkitGetUserMedia ||
        (navigator as any).mozGetUserMedia;
      if (!legacyGetUserMedia) {
        // iOS Safari older versions need https + mediaDevices
        throw new Error(
          "مرورگر شما از دوربین پشتیبانی نمی‌کند. لطفاً نسخه جدید Chrome یا Safari را نصب کنید و مطمئن شوید سایت روی https:// باز می‌شود.",
        );
      }
      // Use legacy API as last resort
      return new Promise((resolve, reject) => {
        legacyGetUserMedia.call(
          navigator,
          { video: true, audio: true },
          (stream: MediaStream) => resolve(stream),
          (err: any) => reject(err),
        );
      });
    }

    // Check if context is secure (HTTPS or localhost)
    if (
      typeof window !== "undefined" &&
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      throw new Error(
        "برای دسترسی به دوربین روی موبایل، سایت باید روی HTTPS باشد. لطفاً مطمئن شوید آدرس با https:// شروع می‌شود (یک قفل کنار آدرس باید دیده شود).",
      );
    }

    const isMobile = isMobileDevice();
    const isIOS = isIOSSafari();

    // Build a list of constraint attempts, from most-specific to most-permissive.
    // We try each one in turn until something works.
    const attempts: Array<{ label: string; constraints: MediaStreamConstraints }> = [];
    if (isIOS) {
      // iOS Safari prefers simpler constraints — specifying width/height/facingMode
      // often triggers OverconstrainedError on iOS.
      attempts.push(
        { label: "iOS simple", constraints: { video: true, audio: true } },
        { label: "iOS audio-priority", constraints: { audio: true, video: false } },
      );
    } else if (isMobile) {
      // Android / other mobile — try with facingMode first
      attempts.push(
        {
          label: "mobile facingMode",
          constraints: {
            video: { facingMode: "user" },
            audio: { echoCancellation: true, noiseSuppression: true },
          },
        },
        {
          label: "mobile simple",
          constraints: { video: true, audio: true },
        },
      );
    } else {
      // Desktop — full HD with ideal constraints
      attempts.push(
        {
          label: "desktop HD",
          constraints: {
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          },
        },
        { label: "desktop simple", constraints: { video: true, audio: true } },
      );
    }

    let lastError: any = null;
    for (const attempt of attempts) {
      try {
        console.log(`[WebRTC] Trying constraints: ${attempt.label}`);
        const stream = await navigator.mediaDevices.getUserMedia(attempt.constraints);
        console.log(
          `[WebRTC] ✓ Got stream with "${attempt.label}" — video:`,
          stream.getVideoTracks().length,
          "audio:",
          stream.getAudioTracks().length,
        );
        return stream;
      } catch (err: any) {
        console.warn(`[WebRTC] Attempt "${attempt.label}" failed:`, err.name, err.message);
        lastError = err;
        // Don't retry on permission errors — user explicitly denied
        if (
          err.name === "NotAllowedError" ||
          err.name === "SecurityError" ||
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError" ||
          err.name === "NotReadableError" ||
          err.name === "TrackStartError"
        ) {
          break;
        }
        // For OverconstrainedError, try the next attempt
      }
    }

    // All attempts failed — translate the last error
    const err = lastError;
    console.error("[WebRTC] All attempts failed. Last error:", err?.name, err?.message);

    if (!err) {
      throw new Error("دسترسی به دوربین ناموفق بود. لطفاً دوباره تلاش کنید.");
    }

    if (err.name === "NotAllowedError" || err.name === "SecurityError") {
      if (isIOS) {
        throw new Error(
          "دسترسی به دوربین رد شد. روی آیفون: به Settings → Privacy → Camera برو و مطمئن شو Safari اجازه دارد. سپس مرورگر را ببند و دوباره باز کن. همچنین می‌توانی در Safari روی آیکون «AA» کنار آدرس بزنی و Website Settings → Camera → Allow را انتخاب کنی.",
        );
      }
      if (isMobile) {
        throw new Error(
          "دسترسی به دوربین رد شد. روی آیکون قفل یا سه نقطه کنار آدرس سایت در مرورگر بزن، دسترسی دوربین و میکروفون را «Allow» بگذار، سپس صفحه را رفرش کن. اگر باز هم نشد، به Settings گوشی → Apps → مرورگر → Permissions → Camera برو و اجازه بده.",
        );
      }
      throw new Error(
        "دسترسی به دوربین رد شد. روی آیکون قفل کنار آدرس کلیک کن و دسترسی دوربین و میکروفون را «اجازه دهید» بگذارید، سپس دوباره تلاش کنید.",
      );
    } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      throw new Error(
        "هیچ دوربینی روی دستگاه شما پیدا نشد. لطفاً مطمئن شوید دوربین متصل و روشن است. روی گوشی ممکن است دوربین توسط برنامه دیگری در حال استفاده باشد.",
      );
    } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
      throw new Error(
        "دوربین توسط برنامه دیگری در حال استفاده است. لطفاً تمام برنامه‌های دوربین (شامل دوربین خود گوشی، اسکایپ، واتس‌اپ، ...) را ببندید و دوباره تلاش کنید.",
      );
    } else if (err.name === "OverconstrainedError") {
      throw new Error(
        "دوربین با تنظیمات درخواست‌شده کار نمی‌کند. لطفاً تنظیمات دوربین مرورگر را بررسی کنید یا از مرورگر دیگری استفاده کنید.",
      );
    } else if (err.name === "NotSupportedError") {
      throw new Error(
        "مرورگر شما از دوربین پشتیبانی نمی‌کند. لطفاً نسخه جدید Chrome یا Safari را نصب کنید.",
      );
    } else if (err.name === "AbortError") {
      throw new Error(
        "درخواست دوربین قطع شد. لطفاً مطمئن شوید اینترنت وصل است و دوباره تلاش کنید.",
      );
    } else {
      throw new Error(`خطای دوربین: ${err.message || err.name}`);
    }
  }, []);

  const initWebRTC = useCallback(async () => {
    try {
      setStatus("loading");
      setErrorMsg("");

      console.log("[WebRTC] Initializing for room:", roomName);

      // Step 1: Get camera + microphone (PRIORITY — must succeed)
      const stream = await requestMediaAccess();

      if (!stream) {
        // This shouldn't happen, but just in case
        setStatus("permission");
        return;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setCamOn(true);
      setMicOn(true);

      console.log("[WebRTC] Local stream set, will attach after render");

      // NOTE: We don't attach the stream here directly.
      // The video element might not be mounted yet because React hasn't re-rendered.
      // We use a useEffect below to attach the stream once both ref and stream are ready.

      // Step 2: Load PeerJS
      const PeerClass = await loadPeer();
      if (!PeerClass) {
        throw new Error("بارگذاری PeerJS ناموفق بود");
      }

      // Step 3: Try to register as the host first.
      // If `monafaseh-${roomName}` is already taken, fall back to a guest peer
      // ID and connect to the host. This way, when guest B joins a session
      // hosted by A, B can find A's peer ID and call it.
      console.log("[WebRTC] Trying to register as host:", hostPeerId);

      // ICE servers config — STUN + TURN.
      // TURN is critical for users behind symmetric NAT (common in Iran with
      // mobile carriers and some ISPs). Without TURN, ~20% of peer connections
      // fail because STUN alone can't traverse symmetric NAT.
      // OpenRelay provides free TURN servers (https://www.metered.ca/tools/openrelay/).
      const iceConfig = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun2.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
          // OpenRelay free TURN — relay traffic when direct P2P fails.
          // These are public free TURN servers; safe to use for any app.
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
      };

      const peer = new PeerClass(hostPeerId, {
        debug: 2,
        config: iceConfig,
      });

      peerRef.current = peer;
      setPeerId(hostPeerId);

      let becameGuest = false;

      // Step 4: When peer is open, decide role
      peer.on("open", (id: string) => {
        console.log("[WebRTC] Host peer opened with ID:", id);
        // We successfully registered as the host. Wait for guests to connect.
        setStatus("ready");
      });

      // Step 5: Handle incoming data connections (guests calling host)
      peer.on("connection", (conn: any) => {
        console.log("[WebRTC] Incoming connection from:", conn.peer);
        setupDataConnection(conn);

        conn.on("open", () => {
          if (localStreamRef.current) {
            console.log("[WebRTC] Calling new participant:", conn.peer);
            const call = peer.call(conn.peer, localStreamRef.current, {
              metadata: { name: displayNameRef.current },
            });
            setupCall(call);
          }
        });
      });

      // Step 6: Handle incoming calls (guests calling host)
      peer.on("call", (call: any) => {
        console.log("[WebRTC] Incoming call from:", call.peer);
        if (localStreamRef.current) {
          call.answer(localStreamRef.current);
        } else {
          call.answer();
        }
        setupCall(call);
      });

      peer.on("error", async (err: any) => {
        console.error("[WebRTC] Peer error:", err.type, err.message);
        if (err.type === "unavailable-id" && !becameGuest) {
          // The host ID is taken — we are a guest. Switch to a guest peer ID
          // and connect to the host.
          becameGuest = true;
          console.log("[WebRTC] Host already exists, becoming guest:", myPeerId);
          try { peer.destroy(); } catch {}
          peerRef.current = null;

          const guestPeer = new PeerClass(myPeerId, {
            debug: 2,
            config: iceConfig,
          });
          peerRef.current = guestPeer;
          setPeerId(myPeerId);

          // Retry counter for "host not yet available" scenarios.
          // When the رقیب (guest) connects before the host has registered,
          // peer.connect() fails with "peer-unavailable". We retry up to 10
          // times with 2s delay — total ~20s — which is enough for the host
          // to click "شروع محفل تصویری" or for auto-start to fire.
          let hostConnectRetries = 0;
          const MAX_HOST_RETRIES = 10;

          const tryConnectToHost = () => {
            if (!peerRef.current || peerRef.current !== guestPeer) return;
            if (hostConnectRetries >= MAX_HOST_RETRIES) {
              console.warn("[WebRTC] Giving up after", MAX_HOST_RETRIES, "retries to reach host");
              return;
            }
            hostConnectRetries++;
            console.log(`[WebRTC] Guest connect attempt ${hostConnectRetries}/${MAX_HOST_RETRIES} to host:`, hostPeerId);
            const conn = guestPeer.connect(hostPeerId, {
              metadata: { name: displayNameRef.current },
              reliable: true,
            });
            setupDataConnection(conn);

            conn.on("open", () => {
              // Call the host with our video stream
              if (localStreamRef.current) {
                console.log("[WebRTC] Calling host:", hostPeerId);
                const call = guestPeer.call(hostPeerId, localStreamRef.current, {
                  metadata: { name: displayNameRef.current },
                });
                setupCall(call);
              }
            });

            // If the connection fails to open within 2s, retry.
            // "peer-unavailable" error will fire on the peer, but we also
            // add this timeout as a safety net.
            setTimeout(() => {
              if (!conn.open) {
                try { conn.close(); } catch {}
                tryConnectToHost();
              }
            }, 2000);
          };

          guestPeer.on("open", (gid: string) => {
            console.log("[WebRTC] Guest peer opened with ID:", gid);
            setStatus("ready");
            // Connect to host (with retry on failure)
            tryConnectToHost();
          });

          // Guest also handles incoming calls (host calls back)
          guestPeer.on("call", (call: any) => {
            console.log("[WebRTC] Guest received call from:", call.peer);
            if (localStreamRef.current) {
              call.answer(localStreamRef.current);
            } else {
              call.answer();
            }
            setupCall(call);
          });

          guestPeer.on("connection", (conn: any) => {
            console.log("[WebRTC] Guest received connection from:", conn.peer);
            setupDataConnection(conn);
          });

          guestPeer.on("error", (gerr: any) => {
            console.error("[WebRTC] Guest peer error:", gerr.type, gerr.message);
            if (gerr.type === "peer-unavailable") {
              // Host not online yet — silently retry via tryConnectToHost.
              // The setTimeout in tryConnectToHost will handle the next attempt.
              console.log("[WebRTC] Host not available yet, retrying...");
              // Reset the retry counter only if we've never connected — the
              // setTimeout in tryConnectToHost will fire the next attempt.
            } else {
              setErrorMsg(`خطای اتصال: ${gerr.type || gerr.message}`);
              setStatus("error");
            }
          });

          guestPeer.on("disconnected", () => {
            console.log("[WebRTC] Guest peer disconnected, attempting reconnect");
            try { guestPeer.reconnect(); } catch {}
          });
        } else if (err.type === "peer-unavailable") {
          // Host not available yet — silently ignore; the user can retry
          console.log("[WebRTC] Host not available yet, will retry");
        } else {
          setErrorMsg(`خطای اتصال: ${err.type || err.message}`);
          setStatus("error");
        }
      });

      peer.on("disconnected", () => {
        console.log("[WebRTC] Peer disconnected, attempting reconnect");
        try {
          peer.reconnect();
        } catch {}
      });
    } catch (err) {
      console.error("[WebRTC] Init error:", err);
      setErrorMsg(err instanceof Error ? err.message : "خطا در راه‌اندازی");
      setStatus("error");
    }
  }, [roomName, myPeerId, requestMediaAccess]);

  function setupDataConnection(conn: any) {
    connectionsRef.current.set(conn.peer, conn);

    conn.on("open", () => {
      console.log("[WebRTC] Data connection opened with:", conn.peer);
      // Send our name + avatar info so the remote side can list us as a participant
      conn.send({
        type: "name",
        name: displayNameRef.current,
        // We don't have access to user info here — the host/guest avatar will
        // be derived from the local NoorUser if available; otherwise a default color.
      });
    });

    conn.on("data", (data: any) => {
      if (data?.type === "name" && data?.name) {
        setParticipants((prev) => {
          const next = new Map(prev);
          const existing = next.get(conn.peer);
          next.set(conn.peer, {
            id: conn.peer,
            name: data.name,
            stream: existing?.stream ?? null,
            audioOn: existing?.audioOn ?? true,
            videoOn: existing?.videoOn ?? true,
          });
          return next;
        });
        // Also push to noor-store so RecitationSetup can include this participant
        upsertSessionParticipant({
          id: conn.peer,
          name: data.name,
          avatarColor: data.avatarColor ?? "#FFD700",
          avatarUrl: data.avatarUrl ?? null,
          order: 0, // RecitationSetup will re-order
        });
      } else if (data?.type === "competition-state" && data?.snapshot) {
        // Host has broadcast the latest competition state. Apply it locally
        // so the guest's recitation rotation matches the host's.
        syncFromHost(data.snapshot);
        if (onCompetitionStateReceived) onCompetitionStateReceived();
      }
    });

    conn.on("close", () => {
      console.log("[WebRTC] Data connection closed with:", conn.peer);
      removeParticipant(conn.peer);
      removeSessionParticipant(conn.peer);
      connectionsRef.current.delete(conn.peer);
    });

    conn.on("error", (err: any) => {
      console.error("[WebRTC] Data connection error:", err);
    });
  }

  function setupCall(call: any) {
    call.on("stream", (remoteStream: MediaStream) => {
      console.log("[WebRTC] Got remote stream from:", call.peer);
      streamsRef.current.set(call.peer, remoteStream);

      setParticipants((prev) => {
        const next = new Map(prev);
        const name = call.metadata?.name || `کاربر ${call.peer.slice(-4)}`;
        next.set(call.peer, {
          id: call.peer,
          name,
          stream: remoteStream,
          audioOn: true,
          videoOn: true,
        });
        return next;
      });

      setTimeout(() => {
        const videoEl = remoteVideoRefs.current.get(call.peer);
        if (videoEl) {
          videoEl.srcObject = remoteStream;
          videoEl.play().catch((e) => {
            console.warn("[WebRTC] Remote video play failed:", e);
          });
        }
      }, 100);
    });

    call.on("close", () => {
      console.log("[WebRTC] Call closed with:", call.peer);
      removeParticipant(call.peer);
    });

    call.on("error", (err: any) => {
      console.error("[WebRTC] Call error:", err);
    });
  }

  function removeParticipant(peerId: string) {
    setParticipants((prev) => {
      const next = new Map(prev);
      next.delete(peerId);
      return next;
    });
    streamsRef.current.delete(peerId);
    remoteVideoRefs.current.delete(peerId);
  }

  // Initialize on mount
  useEffect(() => {
    initWebRTC();
    return () => {
      cleanup();
    };
  }, []);

  // Attach local stream to video element when both are ready
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log("[WebRTC] Attaching local stream to video element");
      const videoEl = localVideoRef.current;
      // Detach first to avoid race conditions on mobile
      try { videoEl.srcObject = null; } catch {}
      videoEl.srcObject = localStream;
      videoEl.muted = true; // avoid echo
      videoEl.setAttribute("playsinline", "true");
      videoEl.setAttribute("autoplay", "true");
      // Force play — some mobile browsers require explicit play() AND a retry.
      const tryPlay = (retries: number) => {
        videoEl.play().then(() => {
          console.log("[WebRTC] ✓ Local video playing");
        }).catch((e: any) => {
          console.warn(`[WebRTC] Local video play failed (attempt ${3 - retries}/3):`, e.name);
          if (retries > 0 && e.name === "AbortError") {
            // iOS Safari often throws AbortError on the first try — retry after a short delay
            setTimeout(() => tryPlay(retries - 1), 200);
          } else if (retries > 0 && e.name === "NotAllowedError") {
            // Wait for user gesture — retry once after 500ms
            setTimeout(() => tryPlay(retries - 1), 500);
          }
        });
      };
      tryPlay(3);
    }
  }, [localStream, status]);

  // Attach remote streams to video elements when participants change
  useEffect(() => {
    participants.forEach((p, id) => {
      const videoEl = remoteVideoRefs.current.get(id);
      if (videoEl && p.stream && videoEl.srcObject !== p.stream) {
        videoEl.srcObject = p.stream;
        // On mobile, ensure play() succeeds after attach
        videoEl.play().catch((e: any) => {
          console.warn(`[WebRTC] Remote video play failed for ${p.name}:`, e.name);
          // Retry after a short delay
          setTimeout(() => {
            videoEl.play().catch(() => {});
          }, 300);
        });
      }
    });
  }, [participants]);

  // Toggle microphone
  function toggleMic() {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = !micOn));
      setMicOn(!micOn);
    }
  }

  // Toggle camera
  function toggleCam() {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => (t.enabled = !camOn));
      setCamOn(!camOn);
    }
  }

  // Copy room link
  function copyRoomLink() {
    const link = `${window.location.origin}/?room=${roomName}`;
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Hangup
  function handleHangup() {
    cleanup();
    onHangup?.();
  }

  const participantList = Array.from(participants.values());
  const totalParticipants = participantList.length + 1; // +1 for self

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl bg-gradient-to-br from-[#0d1230] to-[#181d44]">
      {/* Loading overlay — only shown BEFORE we get a local stream */}
      {status === "loading" && !localStream && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-gradient-to-br from-[#0d1230] to-[#181d44]">
          <div className="flex flex-col items-center gap-4 text-white">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="grid h-20 w-20 place-items-center rounded-full bg-noor-yellow/20"
            >
              <Camera className="h-10 w-10 text-noor-yellow" />
            </motion.div>
            <div className="text-center">
              <p className="font-display text-lg">در حال درخواست دوربین...</p>
              <p className="mt-1 text-xs text-muted-foreground">
                اگر مرورگر اجازه خواست، «اجازه دادن» را بزنید
              </p>
            </div>
            <Loader2 className="h-6 w-6 animate-spin text-noor-yellow" />
          </div>
        </div>
      )}

      {/* Permission needed overlay */}
      {status === "permission" && (
        <div className="absolute inset-0 z-20 overflow-y-auto bg-gradient-to-br from-[#0d1230] to-[#181d44] p-4 sm:p-6">
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-6 text-center text-white">
            <ShieldAlert className="h-12 w-12 text-noor-yellow" />
            <div>
              <p className="font-display text-lg">دسترسی به دوربین لازم است</p>
              <p className="mt-1 text-xs text-muted-foreground">
                برای شرکت در محفل تصویری، باید دسترسی دوربین و میکروفون را اجازه دهید.
              </p>
            </div>
            <button
              onClick={() => initWebRTC()}
              className="flex items-center gap-2 rounded-full bg-noor-yellow px-4 py-2 text-sm font-bold text-noor-navy"
            >
              <Camera className="h-4 w-4" />
              درخواست مجدد دسترسی
            </button>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {status === "error" && (
        <div className="absolute inset-0 z-20 overflow-y-auto bg-gradient-to-br from-[#0d1230] to-[#181d44] p-4 sm:p-6">
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-6 text-center text-white">
            <AlertCircle className="h-12 w-12 text-noor-coral" />
            <div>
              <p className="font-display text-lg">خطا در راه‌اندازی دوربین</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {errorMsg}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => {
                  cleanup();
                  setStatus("loading");
                  setErrorMsg("");
                  initWebRTC();
                }}
                className="flex items-center gap-2 rounded-full bg-noor-yellow px-4 py-2 text-sm font-bold text-noor-navy"
              >
                <RefreshCw className="h-4 w-4" />
                تلاش مجدد
              </button>
              <button
                onClick={handleHangup}
                className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white hover:bg-white/25"
              >
                بازگشت
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video grid — only shown when ready */}
      {(status === "ready" || (localStream && status !== "error")) && (
        <div className="flex-1 overflow-auto p-2">
          <div
            className={cn(
              "grid h-full gap-2",
              totalParticipants <= 1 && "grid-cols-1",
              totalParticipants === 2 && "grid-cols-2",
              totalParticipants <= 4 && "grid-cols-2",
              totalParticipants <= 6 && "grid-cols-3",
              totalParticipants > 6 && "grid-cols-4",
            )}
          >
            {/* Local video — ALWAYS show video element */}
            <div className="relative overflow-hidden rounded-xl bg-black/40 ring-2 ring-noor-yellow/50">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                controls={false}
                preload="auto"
                className="h-full w-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              {/* Overlay when camera is off */}
              {!camOn && (
                <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-noor-navy/80 to-[#0d1230]">
                  <div className="flex flex-col items-center gap-2">
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-noor-yellow/20 text-2xl font-bold text-noor-yellow">
                      {displayName.charAt(0)}
                    </div>
                    <span className="text-xs text-muted-foreground">دوربین خاموش</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-noor-green" />
                {displayName} (شما)
              </div>
              {!micOn && (
                <div className="absolute bottom-1 left-1 grid h-6 w-6 place-items-center rounded bg-noor-coral/80">
                  <MicOff className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            {/* Remote videos */}
            {participantList.map((p) => (
              <div
                key={p.id}
                className="relative overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/10"
              >
                <video
                  ref={(el) => {
                    if (el) remoteVideoRefs.current.set(p.id, el);
                  }}
                  autoPlay
                  playsInline
                  controls={false}
                  preload="auto"
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-1 right-1 flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-noor-sky" />
                  {p.name}
                </div>
              </div>
            ))}

            {/* "Waiting for rival" placeholder — shown when no remote participants
                are connected yet. Helps the user understand they're alone in the
                room and the other person hasn't joined (or hasn't clicked start). */}
            {participantList.length === 0 && (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/5 to-white/0 ring-1 ring-dashed ring-white/20">
                <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-3 p-4 text-center">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="grid h-14 w-14 place-items-center rounded-full bg-noor-yellow/15"
                  >
                    <Users className="h-7 w-7 text-noor-yellow" />
                  </motion.div>
                  <div>
                    <p className="font-display text-sm text-white sm:text-base">
                      در انتظار اتصال رقیب...
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                      تصویر شما آماده است. رقیب شما به‌محض ورود به این جلسه
                      ویدیوی او هم نمایش داده می‌شود.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1 text-[10px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin text-noor-yellow" />
                    <span>اتصال خودکار انجام می‌شود</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Small "connecting" indicator — does NOT cover the video */}
      {status === "loading" && localStream && (
        <div className="absolute right-2 top-12 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur">
          <Loader2 className="h-3 w-3 animate-spin text-noor-yellow" />
          <span>در حال اتصال به شبکه...</span>
        </div>
      )}

      {/* Top bar: Room info + participant count */}
      {(status === "ready" || localStream) && (
        <>
          <div className="pointer-events-none absolute left-2 top-2 z-10 flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur">
              <Users className="h-3.5 w-3.5 text-noor-sky" />
              <span>{totalParticipants} نفر</span>
            </div>
            <button
              onClick={copyRoomLink}
              className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur transition hover:bg-black/70"
              title="کپی لینک دعوت"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-noor-green" />
                  کپی شد
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  لینک دعوت
                </>
              )}
            </button>
          </div>

          {/* Bottom control bar */}
          <div className="pointer-events-auto absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full bg-black/60 p-2 backdrop-blur-md">
              <button
                onClick={toggleMic}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-full transition",
                  micOn
                    ? "bg-white/15 text-white hover:bg-white/25"
                    : "bg-noor-coral text-white hover:bg-noor-coral/80",
                )}
                title={micOn ? "قطع میکروفون" : "وصل میکروفون"}
              >
                {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>

              <button
                onClick={toggleCam}
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-full transition",
                  camOn
                    ? "bg-white/15 text-white hover:bg-white/25"
                    : "bg-noor-coral text-white hover:bg-noor-coral/80",
                )}
                title={camOn ? "قطع دوربین" : "وصل دوربین"}
              >
                {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>

              <button
                onClick={handleHangup}
                className="grid h-10 w-12 place-items-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
                title="خروج از جلسه"
              >
                <Phone className="h-5 w-5 rotate-[135deg]" />
              </button>
            </div>
          </div>

          {/* Connection status indicator */}
          <div className="pointer-events-none absolute right-2 top-2 z-10">
            <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur">
              <Wifi className="h-3.5 w-3.5 text-noor-green" />
              <span>متصل</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
