'use client';

// WebRTC engine for the 1:1 Vodda live classroom.
// The teacher side is the deterministic offerer; the learner answers. ICE
// candidates trickle through the LiveClient signaling channel, so media is
// peer-to-peer and never transits the server.

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
  private makingOffer = false;
  private ignoreOffer = false;
  private closed = false;

  constructor(options: EngineOptions) {
    this.role = options.role;
    this.onRemoteStream = options.onRemoteStream;
    this.onState = options.onState;
    this.send = options.send;
  }

  get isInitiator(): boolean {
    // Teacher (or admin observing as initiator fallback) drives the offer.
    return this.role !== 'learner';
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
      if (pc.connectionState === 'failed' && !this.closed) {
        void pc.restartIce?.();
      }
    };

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) pc.addTrack(track, this.localStream);
    } else {
      // keep the SDP valid even when joining without media
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.addTransceiver('video', { direction: 'recvonly' });
    }

    return pc;
  }

  async setLocalMedia(stream: MediaStream | null): Promise<void> {
    this.localStream = stream;
    if (!this.pc) return;
    if (stream) {
      for (const track of stream.getTracks()) {
        let sender = this.pc.getSenders().find((candidate) => candidate.track?.kind === track.kind);
        if (!sender) {
          // ensureConnection may have run before media was ready and added
          // recvonly transceivers; flip a free one to sendrecv so upstream
          // media is negotiated even when this runs after the connection.
          const transceiver = this.pc.getTransceivers().find((item) =>
            item.receiver.track?.kind === track.kind && !item.sender.track && item.direction !== 'stopped');
          if (transceiver) {
            transceiver.direction = 'sendrecv';
            sender = transceiver.sender;
          }
        }
        if (sender) await sender.replaceTrack(track);
        else this.pc.addTrack(track, stream);
      }
      // If media arrived only after a recvonly negotiation (remote offered
      // before our stream was ready), trigger a renegotiation so upstream
      // media is negotiated. Either side may offer; this side is polite.
      if (this.pc.signalingState === 'stable' && /a=recvonly/.test(this.pc.currentLocalDescription?.sdp || '')) {
        void this.initiate();
      }
    } else {
      for (const sender of this.pc.getSenders()) {
        if (sender.track) await sender.replaceTrack(null);
      }
    }
  }

  /** Called for every signaling event coming from the remote peer. */
  async handleSignal(type: string, payload: unknown): Promise<void> {
    if (this.closed) return;
    const pc = await this.ensureConnection();

    if (type === 'offer' && payload) {
      const offerCollision = this.makingOffer || pc.signalingState !== 'stable';
      this.ignoreOffer = !this.isInitiator ? false : offerCollision;
      if (this.ignoreOffer) return;
      if (offerCollision) {
        // polite rollback (learner is always polite)
        await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
        return;
      }
      await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.send('answer', pc.localDescription?.toJSON());
      return;
    }

    if (type === 'answer' && payload) {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
      }
      return;
    }

    if (type === 'ice' && payload) {
      try {
        await pc.addIceCandidate(payload as RTCIceCandidateInit);
      } catch (error) {
        if (!this.ignoreOffer) throw error;
      }
    }
  }

  /** Teacher/initiator path: create and ship the offer once both sides are in. */
  async initiate(): Promise<void> {
    if (this.closed || !this.isInitiator) return;
    const pc = await this.ensureConnection();
    this.makingOffer = true;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.send('offer', pc.localDescription?.toJSON());
    } finally {
      this.makingOffer = false;
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

  setCameraTrack(track: MediaStreamTrack | null): void {
    this.cameraTrack = track;
  }

  close(): void {
    this.closed = true;
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.remoteStream?.getTracks().forEach((track) => track.stop());
    this.pc?.getSenders().forEach((sender) => { try { sender.track?.stop(); } catch { /* ignore */ } });
    try { this.pc?.close(); } catch { /* ignore */ }
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
  }
}
