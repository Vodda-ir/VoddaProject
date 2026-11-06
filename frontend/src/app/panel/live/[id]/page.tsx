'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { faDigits } from '@/components/PanelShell';
import { api, type SessionListItem } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { LiveClient, type LiveEvent, type LiveStatus } from '@/lib/live/client';
import { LiveEngine, type EngineRole } from '@/lib/live/engine';

type ChatMessage = { id: string; from: number; role: string; text: string; at: number; mine: boolean };
type StrokePoint = { x: number; y: number };
type Stroke = { id: string; points: StrokePoint[]; color: string; width: number };
type Reaction = { id: string; emoji: string; at: number };

const REACTIONS = ['👍', '❤️', '👏', '🎉', '🤲', '✨'];

const QURAN_SNIPPETS: Array<{ label: string; text: string }> = [
  {
    label: 'سورهٔ حمد',
    text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ\nالرَّحْمَٰنِ الرَّحِيمِ\nمَالِكِ يَوْمِ الدِّينِ\nإِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ\nاهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ\nصِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
  },
  {
    label: 'سورهٔ اخلاص',
    text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nقُلْ هُوَ اللَّهُ أَحَدٌ\nاللَّهُ الصَّمَدُ\nلَمْ يَلِدْ وَلَمْ يُولَدْ\nوَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ',
  },
  {
    label: 'سورهٔ فلق',
    text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nقُلْ أَعُوذُ بِرَبِّ الْفَلَقِ\nمِنْ شَرِّ مَا خَلَقَ\nوَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ\nوَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ\nوَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ',
  },
  {
    label: 'سورهٔ ناس',
    text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nقُلْ أَعُوذُ بِرَبِّ النَّاسِ\nمَلِكِ النَّاسِ\nإِلَٰهِ النَّاسِ\nمِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ\nالَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ\nمِنَ الْجِنَّةِ وَالنَّاسِ',
  },
];

const STROKE_COLORS = ['#1f2d1f', '#0f766e', '#b45309', '#be123c', '#4d7c0f'];

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function LiveClassroomPage() {
  const router = useRouter();
  const routeParams = useParams<{ id: string }>();
  const sessionId = Number(routeParams?.id ?? 0);
  const [session, setSession] = useState<SessionListItem | null>(null);
  const [role, setRole] = useState<EngineRole>('learner');
  const [loadError, setLoadError] = useState('');
  const [ready, setReady] = useState(false);

  // preflight state
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [camId, setCamId] = useState<string>('');
  const [micId, setMicId] = useState<string>('');
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState('');
  const [micLevel, setMicLevel] = useState(0);

  // live state
  const [phase, setPhase] = useState<'preflight' | 'live' | 'ended'>('preflight');
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [remoteActive, setRemoteActive] = useState(false);
  const [connState, setConnState] = useState('');
  const [peerOnline, setPeerOnline] = useState(false);

  // panels
  const [sideTab, setSideTab] = useState<'none' | 'chat' | 'board' | 'reading'>('none');
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [unread, setUnread] = useState(0);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [strokeColor, setStrokeColor] = useState(STROKE_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [readingText, setReadingText] = useState('');
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [handRaised, setHandRaised] = useState(false);
  const [notice, setNotice] = useState('');
  const [countdown, setCountdown] = useState('');

  // refs (non-rendering objects)
  const clientRef = useRef<LiveClient | null>(null);
  const engineRef = useRef<LiveEngine | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const boardRef = useRef<HTMLCanvasElement | null>(null);
  const boardWrapperRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef<{ stroke: Stroke } | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const myIdRef = useRef<number>(0);

  const isTeacherSide = role !== 'learner';

  /* ---------------- load session + identity ---------------- */
  useEffect(() => {
    if (!sessionId) {
      setLoadError('شناسهٔ جلسه نامعتبر است.');
      setReady(true);
      return;
    }
    const token = getToken();
    if (!token) {
      router.replace('/panel/login');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await api.me(token);
        const myId = Number(me.data?.id ?? 0);
        myIdRef.current = myId;
        const candidates: Array<{ when: string; loader: Promise<{ data?: SessionListItem[] }>; teacherSide: boolean }> = [
          { when: 'upcoming', loader: api.mySessions(token, 'upcoming'), teacherSide: false },
          { when: 'past', loader: api.mySessions(token, 'past'), teacherSide: false },
          { when: 'upcoming', loader: api.teacherSessions(token, 'upcoming'), teacherSide: true },
          { when: 'past', loader: api.teacherSessions(token, 'past'), teacherSide: true },
        ];
        for (const candidate of candidates) {
          if (cancelled) return;
          try {
            const response = await candidate.loader;
            const found = (response.data || []).find((item) => item.id === sessionId);
            if (found) {
              setSession(found);
              setRole(candidate.teacherSide ? (found.learner_id === myId ? 'learner' : 'teacher') : 'learner');
              setReady(true);
              return;
            }
          } catch { /* try next source */ }
        }
        // Not found in own lists — admins can still observe any session.
        if (me.data?.role === 'admin') {
          setRole('admin');
          setSession({
            id: sessionId,
            learner_id: 0,
            teacher_id: 0,
            service_id: 0,
            service: `کلاس زندهٔ #${faDigits(sessionId)}`,
            scheduled_at: new Date().toISOString(),
            local_date: '',
            local_start: '',
            local_end: '',
            weekday: 0,
            duration: 60,
            price: 0,
            status: 'confirmed',
            rated: false,
          });
        } else {
          setLoadError('این جلسه در دسترس شما نیست یا وجود ندارد.');
        }
      } catch (cause) {
        setLoadError(cause instanceof Error ? cause.message : 'اطلاعات جلسه دریافت نشد.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [router, sessionId]);

  /* ---------------- preflight: device preview ---------------- */
  const stopPreview = useCallback(() => {
    previewStream?.getTracks().forEach((track) => track.stop());
  }, [previewStream]);

  useEffect(() => {
    if (phase !== 'preflight' || !ready || loadError) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let ctx: AudioContext | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: camId ? { deviceId: { exact: camId } } : { width: { ideal: 1280 } },
          audio: micId ? { deviceId: { exact: micId } } : { echoCancellation: true, noiseSuppression: true },
        });
        setPreviewStream(stream);
        setMediaError('');
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
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
        const list = await navigator.mediaDevices.enumerateDevices();
        setDevices(list.filter((device) => device.kind !== 'audiooutput'));
        if (!camId && list.find((device) => device.kind === 'videoinput')) setCamId(list.find((device) => device.kind === 'videoinput')!.deviceId);
        if (!micId && list.find((device) => device.kind === 'audioinput')) setMicId(list.find((device) => device.kind === 'audioinput')!.deviceId);
      } catch {
        setMediaError('دسترسی به دوربین/میکروفون ممکن نشد. می‌توانید بدون آن‌ها وارد کلاس شوید.');
      }
    })();
    return () => {
      cancelAnimationFrame(raf);
      void ctx?.close();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [phase, ready, loadError, camId, micId]);

  /* ---------------- event handling ---------------- */
  const pushReaction = useCallback((emoji: string) => {
    const reaction: Reaction = { id: uid(), emoji, at: Date.now() };
    setReactions((items) => [...items, reaction]);
    setTimeout(() => setReactions((items) => items.filter((item) => item.id !== reaction.id)), 2600);
  }, []);

  const handleEvent = useCallback((event: LiveEvent) => {
    if (event.from === myIdRef.current && event.type !== 'system') {
      // own frames echoed by WS path are ignored (chat already optimistic)
      if (event.type !== 'reading') return;
    }
    switch (event.type) {
      case 'chat': {
        const payload = event.payload as { text?: string } | undefined;
        const text = String(payload?.text ?? '').slice(0, 1000);
        if (!text) return;
        setChat((items) => [...items, { id: uid(), from: event.from, role: String(event.role), text, at: event.at, mine: false }]);
        setUnread((count) => count + 1);
        break;
      }
      case 'wb': {
        const payload = event.payload as { action: string; stroke?: Stroke } | undefined;
        if (payload?.action === 'clear') setStrokes([]);
        else if (payload?.action === 'undo') setStrokes((items) => items.slice(0, -1));
        else if (payload?.action === 'draw' && payload.stroke) setStrokes((items) => [...items, payload.stroke!]);
        break;
      }
      case 'reading': {
        const payload = event.payload as { text?: string } | undefined;
        setReadingText(String(payload?.text ?? ''));
        break;
      }
      case 'control': {
        const payload = event.payload as { action: string; value?: boolean | string } | undefined;
        if (payload?.action === 'hand') {
          setNotice(payload.value ? '✋ دانش‌آموز دستش را بالا برده است.' : 'دست پایین آمد.');
          setTimeout(() => setNotice(''), 4000);
        }
        if (payload?.action === 'reaction' && typeof payload.value === 'string') pushReaction(payload.value);
        if (payload?.action === 'bye') {
          setNotice('طرف مقابل کلاس را ترک کرد.');
          setTimeout(() => setNotice(''), 4000);
        }
        if (payload?.action === 'end') {
          setPhase('ended');
        }
        break;
      }
      case 'offer':
      case 'answer':
      case 'ice':
        void engineRef.current?.handleSignal(event.type, event.payload);
        break;
      case 'system': {
        const payload = event.payload as { action?: string } | undefined;
        if (payload?.action === 'join') {
          setPeerOnline(true);
          setChat((items) => [...items, { id: uid(), from: 0, role: 'system', text: 'طرف مقابل وارد کلاس شد.', at: event.at, mine: false }]);
          if (isTeacherSide) void engineRef.current?.initiate();
        }
        if (payload?.action === 'leave') {
          setPeerOnline(false);
          setChat((items) => [...items, { id: uid(), from: 0, role: 'system', text: 'طرف مقابل خارج شد.', at: event.at, mine: false }]);
        }
        break;
      }
    }
  }, [isTeacherSide, pushReaction]);

  /* ---------------- classroom countdown ---------------- */
  useEffect(() => {
    if (!session?.scheduled_at) return;
    const endAt = new Date(session.scheduled_at).getTime() + (session.duration || 60) * 60_000;
    const tick = () => {
      const diff = endAt - Date.now();
      if (diff <= 0) { setCountdown('به پایان زمان جلسه رسیده است'); return; }
      const minutes = Math.floor(diff / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);
      setCountdown(`${faDigits(minutes)}:${faDigits(String(seconds).padStart(2, '0'))} باقی‌مانده`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session]);

  /* ---------------- board rendering ---------------- */
  useEffect(() => {
    const canvas = boardRef.current;
    const wrapper = boardWrapperRef.current;
    if (!canvas || !wrapper || sideTab !== 'board') return;
    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const stroke of strokes) {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.beginPath();
        stroke.points.forEach((point, index) => {
          const x = point.x * canvas.width;
          const y = point.y * canvas.height;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [strokes, sideTab]);

  /* ---------------- lifecycle ---------------- */
  useEffect(() => () => {
    clientRef.current?.close();
    engineRef.current?.close();
    screenRef.current?.getTracks().forEach((track) => track.stop());
    void audioCtxRef.current?.close();
  }, []);

  const openSide = (tab: 'chat' | 'board' | 'reading') => {
    setSideTab((current) => (current === tab ? 'none' : tab));
    if (tab === 'chat') setUnread(0);
  };

  /* ---------------- actions ---------------- */
  async function joinClassroom(withMedia: boolean) {
    if (!session) return;
    stopPreview();
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;

    let stream: MediaStream | null = null;
    if (withMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: camId ? { deviceId: { exact: camId } } : true,
          audio: micId ? { deviceId: { exact: micId } } : true,
        });
      } catch {
        setMediaError('ورود با دوربین/میکروفون ناموفق بود؛ بدون رسانه وارد می‌شوید.');
      }
    }
    liveStreamRef.current = stream;
    setPhase('live');

    const client = new LiveClient({
      sessionId: session.id,
      onEvent: handleEvent,
      onStatus: (value) => setStatus(value),
    });
    clientRef.current = client;

    const engine = new LiveEngine({
      role,
      onRemoteStream: (remote) => {
        setRemoteActive(remote.getTracks().length > 0);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remote;
      },
      onState: (state) => setConnState(`${state.connection}/${state.ice}`),
      send: (type, payload) => client.send(type, payload),
    });
    engineRef.current = engine;
    engine.setCameraTrack(stream?.getVideoTracks()[0] ?? null);
    await engine.ensureConnection();
    if (stream) await engine.setLocalMedia(stream);
    if (localVideoRef.current && stream) localVideoRef.current.srcObject = stream;
    if (engine.isInitiator && peerOnline) void engine.initiate();

    await client.connect();
  }

  function sendChat() {
    const text = chatDraft.trim();
    if (!text || !clientRef.current) return;
    setChat((items) => [...items, { id: uid(), from: myIdRef.current, role, text, at: Date.now(), mine: true }]);
    clientRef.current.send('chat', { text: text.slice(0, 1000) });
    setChatDraft('');
  }

  function sendReading(text: string) {
    setReadingText(text);
    clientRef.current?.send('reading', { text: text.slice(0, 4000) });
  }

  function sendReaction(emoji: string) {
    pushReaction(emoji);
    clientRef.current?.send('control', { action: 'reaction', value: emoji });
  }

  function toggleHand() {
    const next = !handRaised;
    setHandRaised(next);
    clientRef.current?.send('control', { action: 'hand', value: next });
  }

  async function toggleShare() {
    const engine = engineRef.current;
    if (!engine) return;
    if (sharing) {
      screenRef.current?.getTracks().forEach((track) => track.stop());
      screenRef.current = null;
      await engine.stopScreenShare();
      if (localVideoRef.current && liveStreamRef.current) localVideoRef.current.srcObject = liveStreamRef.current;
      setSharing(false);
      return;
    }
    try {
      const screen = await engine.startScreenShare();
      screenRef.current = screen;
      if (localVideoRef.current) localVideoRef.current.srcObject = screen;
      setSharing(true);
      screen.getVideoTracks()[0]?.addEventListener('ended', () => {
        setSharing(false);
        if (localVideoRef.current && liveStreamRef.current) localVideoRef.current.srcObject = liveStreamRef.current;
      });
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'اشتراک صفحه انجام نشد.');
      setTimeout(() => setNotice(''), 4000);
    }
  }

  async function leaveClassroom(complete = false) {
    const token = getToken();
    clientRef.current?.send('control', { action: complete ? 'end' : 'bye' });
    clientRef.current?.close();
    engineRef.current?.close();
    screenRef.current?.getTracks().forEach((track) => track.stop());
    if (complete && token && session && isTeacherSide) {
      try { await api.teacherCompleteSession(token, session.id); } catch { /* complete may be time-gated */ }
    }
    setPhase('ended');
    router.push(isTeacherSide ? '/panel/teacher/sessions' : '/panel/user/sessions');
  }

  /* ---------------- render ---------------- */
  if (!ready) {
    return <main style={{ padding: 32, color: 'var(--ink-3)' }}>در حال آماده‌سازی کلاس…</main>;
  }
  if (loadError) {
    return (
      <main style={{ padding: 32 }}>
        <div style={{ padding: 22, borderRadius: 16, background: 'var(--clay-bg)', color: 'var(--rose)', fontWeight: 700 }}>{loadError}</div>
        <button type="button" onClick={() => router.back()} style={{ marginTop: 16, border: 0, borderRadius: 12, padding: '10px 18px', background: 'var(--olive-600)', color: '#fff', cursor: 'pointer' }}>بازگشت</button>
      </main>
    );
  }
  if (!session) return null;

  const statusLabel = status === 'live' ? 'اتصال زنده (وب‌سوکت)' : status === 'polling' ? 'اتصال پایدار (کانال پشتیبان)' : status === 'connecting' ? 'در حال اتصال…' : status === 'error' ? 'خطای دسترسی' : 'پایان';

  if (phase === 'preflight') {
    return (
      <main style={{ padding: '28px 20px', maxWidth: 760, margin: '0 auto' }}>
        <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>ورود به کلاس زنده</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>{session.service} · {session.local_date} {session.local_start && <>· {faDigits(session.local_start)}</>}</p>
        <div style={{ background: '#fff', borderRadius: 18, padding: 18, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)' }}>
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', background: '#101510', aspectRatio: '16 / 9' }}>
            <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            {(!previewStream || !camOn) && (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#cbd5c8', fontSize: 13 }}>
                {camOn ? 'در حال دسترسی به دوربین…' : 'دوربین خاموش است'}
              </div>
            )}
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--ink-3)' }}>
            <span>سطح صدای میکروفون:</span>
            <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--sand-100)', overflow: 'hidden' }}>
              <div style={{ width: `${micLevel}%`, height: '100%', background: 'var(--olive-600)', transition: 'width .1s' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <select value={camId} onChange={(event) => setCamId(event.target.value)} aria-label="دوربین" style={{ flex: 1, minWidth: 200, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--sand-150)', background: 'var(--surface)', fontSize: 13 }}>
              {devices.filter((device) => device.kind === 'videoinput').map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || 'دوربین'}</option>)}
            </select>
            <select value={micId} onChange={(event) => setMicId(event.target.value)} aria-label="میکروفون" style={{ flex: 1, minWidth: 200, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--sand-150)', background: 'var(--surface)', fontSize: 13 }}>
              {devices.filter((device) => device.kind === 'audioinput').map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label || 'میکروفون'}</option>)}
            </select>
          </div>
          {mediaError && <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'var(--gold-bg)', color: 'var(--gold)', fontSize: 12.5 }}>{mediaError}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => void joinClassroom(true)} style={{ flex: 1, minWidth: 180, padding: '13px 0', borderRadius: 14, border: 0, background: 'var(--olive-600)', color: '#fff', fontWeight: 800, fontSize: 14.5, cursor: 'pointer', boxShadow: 'var(--sh-olive)' }}>ورود به کلاس با دوربین و میکروفون</button>
            <button type="button" onClick={() => void joinClassroom(false)} style={{ flex: 1, minWidth: 160, padding: '13px 0', borderRadius: 14, border: '1px solid var(--sand-150)', background: 'var(--surface)', color: 'var(--ink-2)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>ورود بدون رسانه (فروشوینده)</button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === 'ended') {
    return (
      <main style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 42 }}>🎓</div>
        <h1 style={{ fontSize: 19, fontWeight: 800, marginTop: 10 }}>کلاس پایان یافت</h1>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 8 }}>امیدواریم جلسهٔ مفیدی داشته باشید. برای ثبت نظر به صفحهٔ جلسات بروید.</p>
        <button type="button" onClick={() => router.push(isTeacherSide ? '/panel/teacher/sessions' : '/panel/user/sessions')} style={{ marginTop: 18, border: 0, borderRadius: 12, padding: '11px 22px', background: 'var(--olive-600)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>بازگشت به جلسات</button>
      </main>
    );
  }

  return (
    <main style={{ padding: '18px 14px', maxWidth: 1200, margin: '0 auto', minHeight: '70vh' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 17.5, fontWeight: 800 }}>کلاس زنده · {session.service}</h1>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{session.local_date} {session.local_start && <>· {faDigits(session.local_start)} تا {faDigits(session.local_end)}</>} · {countdown}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: status === 'live' ? 'var(--olive-100)' : 'var(--gold-bg)', color: status === 'live' ? 'var(--olive-700)' : 'var(--gold)' }}>
            ● {statusLabel}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: peerOnline ? 'var(--olive-100)' : 'var(--sand-100)', color: peerOnline ? 'var(--olive-700)' : 'var(--ink-3)' }}>
            {peerOnline ? 'طرف مقابل آنلاین' : 'در انتظار طرف مقابل'}
          </span>
        </div>
      </header>

      {notice && <div role="status" style={{ marginBottom: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--gold-bg)', color: 'var(--gold)', fontSize: 12.5, fontWeight: 700 }}>{notice}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: sideTab === 'none' ? '1fr' : 'minmax(0, 1.6fr) minmax(280px, 1fr)', gap: 12, alignItems: 'start' }}>
        {/* stage */}
        <section style={{ background: '#0e130e', borderRadius: 18, overflow: 'hidden', position: 'relative', aspectRatio: '16 / 10' }}>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          {!remoteActive && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#a7b3a5', textAlign: 'center', padding: 20 }}>
              <div>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📵</div>
                <div style={{ fontSize: 13.5 }}>پس از ورود طرف مقابل، تصویر او اینجا نمایش داده می‌شود.</div>
                <div style={{ fontSize: 11.5, marginTop: 6, opacity: .75 }}>{connState ? `وضعیت شبکه: ${connState}` : 'صدا و تصویر به‌صورت مستقیم (P2P) منتقل می‌شود.'}</div>
              </div>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 12, left: 12, width: 168, aspectRatio: '16 / 10', borderRadius: 12, overflow: 'hidden', background: '#1a211a', border: '1px solid rgba(255,255,255,.14)' }}>
            <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: sharing ? 'none' : 'scaleX(-1)' }} />
          </div>
          {reactions.map((reaction) => (
            <span key={reaction.id} style={{ position: 'absolute', left: `${20 + (parseInt(reaction.id.slice(-2), 16) % 60)}%`, bottom: 90, fontSize: 34, animation: 'floatUp 2.6s ease-out forwards' }}>{reaction.emoji}</span>
          ))}
        </section>

        {/* side panel */}
        {sideTab !== 'none' && (
          <section style={{ background: '#fff', borderRadius: 18, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)', display: 'flex', flexDirection: 'column', height: 520, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--sand-150)' }}>
              {([['chat', 'گفت‌وگو'], ['board', 'وایت‌برد'], ['reading', 'متن قرآنی']] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setSideTab(key)} style={{ flex: 1, padding: '11px 0', border: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700, background: sideTab === key ? 'var(--olive-100)' : 'transparent', color: sideTab === key ? 'var(--olive-700)' : 'var(--ink-3)' }}>{label}</button>
              ))}
            </div>

            {sideTab === 'chat' && (
              <>
                <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420 }}>
                  {chat.map((message) => (
                    <div key={message.id} style={{ alignSelf: message.mine ? 'flex-start' : 'flex-end', maxWidth: '82%', padding: '8px 12px', borderRadius: 14, background: message.role === 'system' ? 'var(--sand-100)' : message.mine ? 'var(--olive-600)' : 'var(--olive-100)', color: message.role === 'system' ? 'var(--ink-3)' : message.mine ? '#fff' : 'var(--ink-2)', fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                      {message.text}
                    </div>
                  ))}
                  {chat.length === 0 && <div style={{ margin: 'auto', color: 'var(--ink-3)', fontSize: 12.5 }}>پیامی نیست. سلام کنید! 👋</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid var(--sand-150)' }}>
                  <input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendChat(); }} placeholder="پیام خود را بنویسید…" style={{ flex: 1, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--sand-150)', fontSize: 13, background: 'var(--surface)' }} />
                  <button type="button" onClick={sendChat} style={{ border: 0, borderRadius: 12, padding: '0 18px', background: 'var(--olive-600)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>ارسال</button>
                </div>
              </>
            )}

            {sideTab === 'board' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--sand-150)', flexWrap: 'wrap' }}>
                  {STROKE_COLORS.map((color) => (
                    <button key={color} type="button" aria-label={`رنگ ${color}`} onClick={() => setStrokeColor(color)} style={{ width: 24, height: 24, borderRadius: 999, background: color, border: strokeColor === color ? '2px solid var(--olive-700)' : '2px solid transparent', cursor: 'pointer' }} />
                  ))}
                  <input type="range" min={2} max={10} value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} aria-label="ضخامت قلم" style={{ width: 90 }} />
                  <button type="button" onClick={() => { setStrokes((items) => items.slice(0, -1)); clientRef.current?.send('wb', { action: 'undo' }); }} style={{ border: '1px solid var(--sand-150)', background: 'var(--surface)', borderRadius: 10, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>برگشت</button>
                  <button type="button" onClick={() => { setStrokes([]); clientRef.current?.send('wb', { action: 'clear' }); }} style={{ border: '1px solid var(--clay)', background: 'var(--clay-bg)', color: 'var(--rose)', borderRadius: 10, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>پاک کردن همه</button>
                </div>
                <div ref={boardWrapperRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                  <canvas
                    ref={boardRef}
                    style={{ position: 'absolute', inset: 0, touchAction: 'none', cursor: 'crosshair' }}
                    onPointerDown={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      const stroke: Stroke = { id: uid(), points: [{ x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }], color: strokeColor, width: strokeWidth };
                      drawingRef.current = { stroke };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      if (!drawingRef.current) return;
                      const rect = event.currentTarget.getBoundingClientRect();
                      drawingRef.current.stroke.points.push({ x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height });
                      setStrokes((items) => {
                        const active = drawingRef.current?.stroke;
                        if (!active) return items;
                        const exists = items.some((item) => item.id === active.id);
                        return exists ? items : [...items, active];
                      });
                    }}
                    onPointerUp={() => {
                      const active = drawingRef.current?.stroke;
                      drawingRef.current = null;
                      if (active) clientRef.current?.send('wb', { action: 'draw', stroke: active });
                    }}
                  />
                </div>
              </div>
            )}

            {sideTab === 'reading' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 12, gap: 10 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {QURAN_SNIPPETS.map((snippet) => (
                    <button key={snippet.label} type="button" onClick={() => isTeacherSide && sendReading(snippet.text)} disabled={!isTeacherSide} style={{ border: '1px solid var(--sand-150)', background: 'var(--surface)', borderRadius: 999, padding: '6px 13px', fontSize: 12, cursor: isTeacherSide ? 'pointer' : 'default', opacity: isTeacherSide ? 1 : .6 }}>{snippet.label}</button>
                  ))}
                </div>
                {isTeacherSide ? (
                  <textarea value={readingText} onChange={(event) => setReadingText(event.target.value)} onBlur={(event) => sendReading(event.target.value)} placeholder={isTeacherSide ? 'متن تمرین تلاوت را بنویسید؛ با خروج از کادر برای دانش‌آموز ارسال می‌شود.' : ''} style={{ flex: 1, resize: 'none', padding: 14, borderRadius: 12, border: '1px solid var(--sand-150)', fontSize: 15.5, lineHeight: 2.2, background: 'var(--surface)', fontFamily: 'inherit' }} />
                ) : (
                  <div style={{ flex: 1, overflowY: 'auto', padding: 14, borderRadius: 12, border: '1px solid var(--sand-150)', background: 'var(--surface)', fontSize: 16.5, lineHeight: 2.3, whiteSpace: 'pre-wrap' }}>{readingText || 'مترببی هنوز متنی ارسال نکرده است.'}</div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      {/* control bar */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <ControlButton active={micOn} label={micOn ? 'میکروفون روشن' : 'میکروفون خاموش'} emoji={micOn ? '🎙️' : '🔇'} onClick={() => { setMicOn(!micOn); void engineRef.current?.toggleMic(!micOn); }} />
        <ControlButton active={camOn} label={camOn ? 'دوربین روشن' : 'دوربین خاموش'} emoji={camOn ? '📷' : '🚫'} onClick={() => { setCamOn(!camOn); void engineRef.current?.toggleCamera(!camOn); }} />
        <ControlButton active={sharing} label={sharing ? 'قطع اشتراک صفحه' : 'اشتراک صفحه'} emoji="🖥️" onClick={() => void toggleShare()} />
        <ControlButton active={handRaised} label={handRaised ? 'پایین آوردن دست' : 'اجازه صحبت'} emoji="✋" onClick={toggleHand} />
        {REACTIONS.map((emoji) => <ControlButton key={emoji} active={false} label={`واکنش ${emoji}`} emoji={emoji} onClick={() => sendReaction(emoji)} small />)}
        <ControlButton active={sideTab === 'chat'} label="گفت‌وگو" emoji="💬" onClick={() => openSide('chat')} badge={unread > 0 && sideTab !== 'chat' ? unread : 0} />
        <ControlButton active={sideTab === 'board'} label="وایت‌برد" emoji="📝" onClick={() => openSide('board')} />
        <ControlButton active={sideTab === 'reading'} label="متن قرآنی" emoji="📖" onClick={() => openSide('reading')} />
        <ControlButton active={false} label={isTeacherSide ? 'پایان کلاس و تسویه' : 'خروج از کلاس'} emoji="🔚" danger onClick={() => { if (window.confirm(isTeacherSide ? 'کلاس پایان یابد و تسویهٔ جلسه انجام شود؟' : 'از کلاس خارج می‌شوید؟')) void leaveClassroom(isTeacherSide); }} />
      </div>

      <style jsx global>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-140px) scale(1.5); opacity: 0; }
        }
      `}</style>
    </main>
  );
}

function ControlButton({ active, label, emoji, onClick, danger = false, small = false, badge = 0 }: {
  active: boolean;
  label: string;
  emoji: string;
  onClick: () => void;
  danger?: boolean;
  small?: boolean;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: small ? '9px 12px' : '11px 16px',
        borderRadius: 13,
        border: '1px solid ' + (danger ? 'var(--clay)' : 'var(--sand-150)'),
        background: danger ? 'var(--rose)' : active ? 'var(--olive-600)' : '#fff',
        color: danger ? '#fff' : active ? '#fff' : 'var(--ink-2)',
        fontSize: small ? 15 : 13,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: active && !danger ? 'var(--sh-olive)' : 'var(--sh-sm)',
      }}
    >
      <span>{emoji}</span>
      {!small && <span>{label}</span>}
      {badge > 0 && <span style={{ position: 'absolute', top: -6, left: -6, minWidth: 19, height: 19, borderRadius: 999, background: 'var(--rose)', color: '#fff', fontSize: 10.5, display: 'grid', placeItems: 'center', padding: '0 5px' }}>{faDigits(badge)}</span>}
    </button>
  );
}
