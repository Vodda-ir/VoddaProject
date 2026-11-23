'use client';

// ─────────────────────────────────────────────────────────────────────────────
// موتور WebRTC اختصاصی وُدّا — نسخهٔ بازنویسی‌شدهٔ کامل
//
// طراحی قطعی و بدون گلوگاه:
//   • معلم (یا admin) همیشه offer می‌سازد؛ دانش‌آموز همیشه answer می‌دهد —
//     پس برخورد offer هرگز رخ نمی‌دهد و منطق polite/impolite حذف شد.
//   • وقتی رسانهٔ هر طرف بعداً اضافه/تغییر کرد، طرفِ غیرِ initiate یک قاب
//     «media-ready» می‌فرستد و معلم یک offer تازه می‌سازد (renegotiation).
//   • ICE روی قطع/شکست خودش restart می‌شود (موبایل: تعویض شبکه، قفل صفحه).
// رسانه هرگز از سرور عبور نمی‌کند؛ فقط سیگنالینگ از کانال LiveClient.
// ─────────────────────────────────────────────────────────────────────────────

export type EngineRole = 'teacher' | 'learner' | 'admin';

export type EngineState = {
  connection: RTCPeerConnectionState;
  ice: RTCIceConnectionState;
};

type EngineOptions = {
  role: EngineRole;
  onRemoteStream: (stream: MediaStream) => void;
  onState: (state: EngineState) => void;
  send: (type: string, payload: unknown) => void;
};

const DEFAULT_ICE: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:stun.cloudflare.com:3478' },
  {
    urls: [
      'turn:80.91.208.240:3478?transport=udp',
      'turn:80.91.208.240:3478?transport=tcp',
    ],
    username: 'vodda',
    credential: 'Vd-turn-2026!x7Kq',
  },
  {
    // TURN پشتیبان رایگان — اگر TURN اصلی پاسخ نداد (قطعی سرور یا شبکهٔ
    // سخت اپراتور/CGNAT)، ICE خودکار روی این می‌رود و تماس وصل می‌ماند.
    // رفع «با مجوز هم کار نمی‌کند»: ریشه، پیوند یک‌طرفه به یک TURN واحد بود.
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:80?transport=tcp',
      'turns:openrelay.metered.ca:443',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export class LiveEngine {
  private readonly role: EngineRole;
  private readonly onRemoteStream: (stream: MediaStream) => void;
  private readonly onState: (state: EngineState) => void;
  private readonly send: (type: string, payload: unknown) => void;

  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private closed = false;
  private recoveryTimer = 0;
  /** آخرین SDP local که ارسال شده — از offer تکراری جلوگیری می‌کند. */
  private lastOfferedSdp = '';
  /** آیا در حال ساخت offer هستیم (برای جلوگیری از ترتیب مجاز). */
  private negotiating = false;
  /** آیا طرف مقابل در اتاق است (سیگنالینگ دیده شده). */
  private peerReady = false;

  constructor(options: EngineOptions) {
    this.role = options.role;
    this.onRemoteStream = options.onRemoteStream;
    this.onState = options.onState;
    this.send = options.send;
  }

  get isInitiator(): boolean {
    return this.role !== 'learner';
  }

  /** صدا زدن وقتی قاب system/join یا سیگنالِ طرف مقابل دیده شد. */
  markPeerReady(): void {
    if (this.peerReady) return;
    this.peerReady = true;
    if (this.isInitiator) void this.initiate();
  }

  async ensureConnection(): Promise<RTCPeerConnection> {
    if (this.pc) return this.pc;
    const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE, bundlePolicy: 'max-bundle' });
    this.pc = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) this.send('ice', event.candidate.toJSON());
    };
    pc.ontrack = (event) => {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
        this.onRemoteStream(this.remoteStream);
      }
      for (const track of event.streams[0]?.getTracks() ?? [event.track]) {
        if (!this.remoteStream.getTracks().includes(track)) {
          this.remoteStream.addTrack(track);
        }
      }
      this.onRemoteStream(this.remoteStream);
    };
    pc.onconnectionstatechange = () => {
      this.onState({ connection: pc.connectionState, ice: pc.iceConnectionState });
      if (this.closed) return;
      if (pc.connectionState === 'failed') {
        void pc.restartIce?.();
      } else if (pc.connectionState === 'disconnected') {
        if (this.recoveryTimer) window.clearTimeout(this.recoveryTimer);
        this.recoveryTimer = window.setTimeout(() => {
          this.recoveryTimer = 0;
          if (!this.closed && this.pc?.connectionState === 'disconnected') {
            void this.pc.restartIce?.();
          }
        }, 2500);
      }
    };

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) pc.addTrack(track, this.localStream);
    } else {
      // تا وقتی رسانه نیامده، ترنسسیور recvonly تا SDP معتبر بماند؛
      // با ورود رسانه، direction به sendrecv می‌چرخد و renegotiate می‌شود.
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.addTransceiver('video', { direction: 'recvonly' });
    }

    return pc;
  }

  async setLocalMedia(stream: MediaStream | null): Promise<void> {
    this.localStream = stream;
    if (!this.pc) return;
    let changed = false;
    if (stream) {
      for (const track of stream.getTracks()) {
        let sender = this.pc.getSenders().find((candidate) => candidate.track?.kind === track.kind);
        if (!sender) {
          const transceiver = this.pc.getTransceivers().find((item) =>
            item.receiver.track?.kind === track.kind && !item.sender.track && item.direction !== 'stopped');
          if (transceiver) {
            transceiver.direction = 'sendrecv';
            sender = transceiver.sender;
            changed = true;
          }
        }
        if (sender && sender.track !== track) {
          await sender.replaceTrack(track);
          changed = true;
        }
      }
    } else {
      for (const sender of this.pc.getSenders()) {
        if (sender.track) {
          await sender.replaceTrack(null);
          changed = true;
        }
      }
    }

    // رسانه بعد از mذاکرهٔ recvonly رسید؟ دو مسیر:
    //  • ما initiate هستیم → خودمان offer تازه می‌سازیم.
    //  • ما learner هستیم → از معلم offer می‌خواهیم (media-ready).
    if (changed && this.pc.signalingState === 'stable') {
      if (this.isInitiator) {
        void this.initiate();
      } else {
        this.send('media-ready', {});
      }
    }
  }

  /** پردازش هر قاب سیگنالینگِ طرف مقابل. */
  async handleSignal(type: string, payload: unknown): Promise<void> {
    if (this.closed) return;
    this.peerReady = true;

    if (type === 'offer' && payload) {
      // فقط learner offer می‌پذیرد؛ معلم هرگز (جلوگیری از برخورد کامل).
      if (this.isInitiator) return;
      const pc = await this.ensureConnection();
      await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.send('answer', pc.localDescription?.toJSON());
      return;
    }

    if (type === 'answer' && payload) {
      if (!this.isInitiator) return;
      const pc = this.pc;
      if (pc && pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
      }
      return;
    }

    if (type === 'ice' && payload) {
      const pc = await this.ensureConnection();
      try {
        await pc.addIceCandidate(payload as RTCIceCandidateInit);
      } catch {
        /* ICE قبل از مذاکره رسید؟ دور بعدی restartIce جبران می‌کند */
      }
      return;
    }

    if (type === 'media-ready') {
      // معلم با رسیدن «رسانهٔ دانش‌آموز آماده شد» یک offer تازه می‌سازد.
      if (this.isInitiator) void this.initiate();
    }
  }

  /** معلم/initiator: ساخت و ارسال offer (بدون تکرار SDP یکسان). */
  async initiate(): Promise<void> {
    if (this.closed || !this.isInitiator || this.negotiating) return;
    const pc = await this.ensureConnection();
    if (pc.signalingState !== 'stable') return; // مذاکرهٔ قبلی در جریان است
    const nextSdp = (pc.currentLocalDescription?.sdp || pc.localDescription?.sdp || '') as string;
    if (nextSdp && this.lastOfferedSdp && nextSdp === this.lastOfferedSdp && pc.connectionState === 'connected') {
      return; // همان SDP قبلی — offer بیهوده‌ای نیست لازم
    }
    this.negotiating = true;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.lastOfferedSdp = pc.localDescription?.sdp || '';
      this.send('offer', pc.localDescription?.toJSON());
    } catch {
      /* سیگنالینگ بعد از اتصال کاربر جبران می‌کند */
    } finally {
      this.negotiating = false;
    }
  }

  async toggleMic(enabled: boolean): Promise<void> {
    this.localStream?.getAudioTracks().forEach((track) => { track.enabled = enabled; });
  }

  async toggleCamera(enabled: boolean): Promise<void> {
    this.localStream?.getVideoTracks().forEach((track) => { track.enabled = enabled; });
  }

  async startScreenShare(): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('اشتراک صفحه در این مرورگر پشتیبانی نمی‌شود.');
    }
    const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const [screenTrack] = screen.getVideoTracks();
    const pc = await this.ensureConnection();
    const sender = pc.getSenders().find((candidate) => candidate.track?.kind === 'video');
    if (sender) await sender.replaceTrack(screenTrack);
    else if (this.localStream) {
      this.localStream.addTrack(screenTrack);
      pc.addTrack(screenTrack, this.localStream);
      await this.initiate();
    }
    screenTrack.onended = () => { void this.stopScreenShare(); };
    return screen;
  }

  async stopScreenShare(): Promise<void> {
    const pc = this.pc;
    if (this.cameraTrack && pc) {
      const sender = pc.getSenders().find((candidate) => candidate.track?.kind === 'video' || candidate.track === null);
      if (sender) await sender.replaceTrack(this.cameraTrack);
    }
  }

  /**
   * بازیابی اتصال روی موبایل — بعد از قفل صفحه، تعویض Wi-Fi/داده یا
   * برگشت از پس‌زمینه صدا زده می‌شود؛ ICE وادار به مذاکرهٔ دوباره می‌شود.
   */
  async reconnect(): Promise<void> {
    if (this.closed || !this.pc) return;
    try {
      await this.pc.restartIce?.();
    } catch {
      /* best-effort */
    }
  }

  setCameraTrack(track: MediaStreamTrack | null): void {
    this.cameraTrack = track;
  }

  close(): void {
    this.closed = true;
    if (this.recoveryTimer) {
      window.clearTimeout(this.recoveryTimer);
      this.recoveryTimer = 0;
    }
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.remoteStream?.getTracks().forEach((track) => track.stop());
    this.pc?.getSenders().forEach((sender) => { try { sender.track?.stop(); } catch { /* ignore */ } });
    try { this.pc?.close(); } catch { /* ignore */ }
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
  }
}
