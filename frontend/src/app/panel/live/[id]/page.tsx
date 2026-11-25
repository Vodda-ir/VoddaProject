'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { faDigits } from '@/components/PanelShell';
import { api, type SessionListItem } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { LiveClient, type LiveEvent, type LiveStatus } from '@/lib/live/client';
import { LiveEngine, type EngineRole } from '@/lib/live/engine';
import { confirmDialog } from '@/lib/confirm';
import { acquireMediaStream } from '@/universal-app/platform/media-permissions';
import { VODDA_LIVE_ROOM_ENABLED } from '@/lib/feature-flags';

type ChatMessage = { id: string; from: number; role: string; text: string; at: number; mine: boolean };
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

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** ساعت پیام چت به‌صورت فارسی — «۱۴:۰۵» */
function chatTime(at: number): string {
  const date = new Date(at);
  return `${faDigits(String(date.getHours()).padStart(2, '0'))}:${faDigits(String(date.getMinutes()).padStart(2, '0'))}`;
}

/** پیام فارسی رده‌بندی‌شده برای خطاهای getUserMedia — هم‌رده با helper مشترک media-permissions. */
function mediaFailureMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'دسترسی دوربین/میکروفون مسدود شده است؛ از تنظیمات مرورگر اجازه دهید و صفحه را دوباره باز کنید.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'دوربین یا میکروفون درخواستی پیدا نشد.';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'دوربین/میکروفون در برنامهٔ دیگری باز است.';
  return 'گرفتن دسترسی دوربین/میکروفون ناموفق بود؛ دوباره تلاش کنید.';
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
  const [phase, setPhase] = useState<'preflight' | 'live' | 'ended' | 'bbb'>('preflight');
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [hasLiveMedia, setHasLiveMedia] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [remoteActive, setRemoteActive] = useState(false);
  const [connState, setConnState] = useState('');
  const [peerOnline, setPeerOnline] = useState(false);

  // panels
  const [sideTab, setSideTab] = useState<'none' | 'chat' | 'settings' | 'reading'>('none');
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [unread, setUnread] = useState(0);
  const [readingText, setReadingText] = useState('');
  // in-call device settings (تنظیمات جلسات ویدیویی — موبایل و دسکتاپ)
  const [liveDevices, setLiveDevices] = useState<MediaDeviceInfo[]>([]);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  // چیدمان موبایل — پنل کنار در صفحهٔ باریک زیر ویدیو می‌رود
  const [narrow, setNarrow] = useState(false);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [notice, setNotice] = useState('');
  const [countdown, setCountdown] = useState('');

  // بیگ‌بلوباتن — کلاس کامل روی زیرساخت اشتراک BBB ایران؛ مسیری مستقل از
  // اتاق P2P وُدّا که بدون دوربین/میکروفون محلی هم کار می‌کند.
  const [bbbUrl, setBbbUrl] = useState('');
  const [bbbBusy, setBbbBusy] = useState(false);
  // خطای پایدار ورود به بیگ‌بلوباتن — در حالت «فقط بیگ‌بلوباتن» باید با دکمهٔ تلاش دوباره بماند
  const [bbbError, setBbbError] = useState('');
  const bbbAutoJoinRef = useRef(false);

  // refs (non-rendering objects)
  const clientRef = useRef<LiveClient | null>(null);
  const engineRef = useRef<LiveEngine | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const myIdRef = useRef<number>(0);
  const peerSignaledRef = useRef(false);

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
    // اتاق وُدّا پنهان است (پرچم feature-flags) — پیش‌آزمون دوربینِ P2P لازم نیست
    if (!VODDA_LIVE_ROOM_ENABLED || phase !== 'preflight' || !ready || loadError) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let ctx: AudioContext | null = null;
    (async () => {
      try {
        let acquired: MediaStream;
        try {
          acquired = await navigator.mediaDevices.getUserMedia({
            video: camId ? { deviceId: { exact: camId } } : { width: { ideal: 1280 } },
            audio: micId ? { deviceId: { exact: micId } } : { echoCancellation: true, noiseSuppression: true },
          });
        } catch {
          // قید دقیق دستگاه (یا نخستین تلاش) رد شد — پیش از تسلیم، نردبان عمومی helper را امتحان می‌کنیم
          const result = await acquireMediaStream('both');
          if (!result.ok) {
            setMediaError(result.message);
            return;
          }
          acquired = result.stream;
        }
        stream = acquired;
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
        peerSignaledRef.current = true;
        void engineRef.current?.handleSignal(event.type, event.payload);
        break;
      case 'system': {
        const payload = event.payload as { action?: string } | undefined;
        if (payload?.action === 'join') {
          setPeerOnline(true);
          setChat((items) => [...items, { id: uid(), from: 0, role: 'system', text: 'طرف مقابل وارد کلاس شد.', at: event.at, mine: false }]);
          // معلم با هر join قطعی یک‌بار offer می‌فرستد؛ markPeerReady از تکرار
          // و از replay/echo جلوگیری می‌کند.
          engineRef.current?.markPeerReady();
        }
        if (payload?.action === 'leave') {
          setPeerOnline(false);
          setChat((items) => [...items, { id: uid(), from: 0, role: 'system', text: 'طرف مقابل خارج شد.', at: event.at, mine: false }]);
        }
        break;
      }
    }
  }, [isTeacherSide, pushReaction]);

  /* ---------------- معلم: اگر ۹ ثانیه پس از ورود هیچ قاب سیگنالینگ از طرف مقابل نرسید، یک‌بار initiate می‌فرستد ---------------- */
  useEffect(() => {
    if (phase !== 'live' || !isTeacherSide) return;
    const timer = window.setTimeout(() => {
      if (!peerSignaledRef.current) void engineRef.current?.initiate();
    }, 9_000);
    return () => window.clearTimeout(timer);
  }, [phase, isTeacherSide]);

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

  /* ---------------- responsive layout (موبایل) ---------------- */
  useEffect(() => {
    const query = window.matchMedia('(max-width: 860px)');
    const apply = () => setNarrow(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  /* ---------------- chat auto-scroll ---------------- */
  useEffect(() => {
    const body = chatBodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [chat, sideTab]);

  /* ---------------- in-call device switching (تنظیمات ویدیویی) ---------------- */
  const refreshLiveDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setLiveDevices(list.filter((device) => device.kind !== 'audiooutput'));
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    if (phase === 'live') void refreshLiveDevices();
  }, [phase, refreshLiveDevices]);

  /** جایگزینی تراک ویدیو در ارسال‌کنندهٔ P2P بدون قطع جلسه. */
  const replaceVideoTrack = useCallback(async (videoTrack: MediaStreamTrack) => {
    const engine = engineRef.current;
    const stream = liveStreamRef.current;
    if (!engine || !stream) return;
    stream.getVideoTracks().forEach((track) => track.stop());
    stream.removeTrack(stream.getVideoTracks()[0]);
    stream.addTrack(videoTrack);
    await engine.setLocalMedia(stream);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
  }, []);

  /** جایگزینی تراک میکروفون بدون قطع جلسه. */
  const replaceAudioTrack = useCallback(async (audioTrack: MediaStreamTrack) => {
    const engine = engineRef.current;
    const stream = liveStreamRef.current;
    if (!engine || !stream) return;
    stream.getAudioTracks().forEach((track) => track.stop());
    stream.removeTrack(stream.getAudioTracks()[0]);
    stream.addTrack(audioTrack);
    await engine.setLocalMedia(stream);
  }, []);

  async function switchCameraDevice(deviceId: string) {
    if (settingsBusy) return;
    setSettingsBusy(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
      const [track] = media.getVideoTracks();
      if (track) await replaceVideoTrack(track);
      else media.getTracks().forEach((item) => item.stop());
    } catch (cause) {
      setNotice(mediaFailureMessage(cause));
      setTimeout(() => setNotice(''), 3000);
    } finally {
      setSettingsBusy(false);
      void refreshLiveDevices();
    }
  }

  async function switchMicDevice(deviceId: string) {
    if (settingsBusy) return;
    setSettingsBusy(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true } });
      const [track] = media.getAudioTracks();
      if (track) await replaceAudioTrack(track);
      else media.getTracks().forEach((item) => item.stop());
    } catch (cause) {
      setNotice(mediaFailureMessage(cause));
      setTimeout(() => setNotice(''), 3000);
    } finally {
      setSettingsBusy(false);
      void refreshLiveDevices();
    }
  }

  /** چرخش دوربین جلو/عقب — کلید اصلی موبایل. */
  async function flipCamera() {
    if (settingsBusy) return;
    const next = facing === 'user' ? 'environment' : 'user';
    setSettingsBusy(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: next }, width: { ideal: 1280 } } });
      const [track] = media.getVideoTracks();
      if (track) {
        await replaceVideoTrack(track);
        setFacing(next);
      } else {
        media.getTracks().forEach((item) => item.stop());
      }
    } catch (cause) {
      setNotice(mediaFailureMessage(cause));
      setTimeout(() => setNotice(''), 3000);
    } finally {
      setSettingsBusy(false);
    }
  }

  /* ---------------- lifecycle ---------------- */
  useEffect(() => () => {
    clientRef.current?.close();
    engineRef.current?.close();
    screenRef.current?.getTracks().forEach((track) => track.stop());
    void audioCtxRef.current?.close();
  }, []);

  const openSide = (tab: 'chat' | 'settings' | 'reading') => {
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
      const result = await acquireMediaStream('both');
      if (!result.ok) {
        // بدون رسانه وارد کلاس می‌شویم — هیچ‌چیز نباید برگزاری کلاس را متوقف کند؛
        // دلیل کامل در نوار خطای بالای کلاس زنده نمایش داده می‌شود.
        setMediaError(result.message);
      } else {
        stream = result.stream;
        setMediaError('');
      }
    }
    liveStreamRef.current = stream;
    setHasLiveMedia(Boolean(stream));
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

    await client.connect();
  }

  /** تلاش دوباره برای وصل دوربین/میکروفون در میانهٔ کلاس — خروج از کلاس لازم نیست. */
  async function retryLiveMedia() {
    const result = await acquireMediaStream('both');
    if (!result.ok) {
      setNotice(result.message);
      setTimeout(() => setNotice(''), 4000);
      return;
    }
    const stream = result.stream;
    liveStreamRef.current = stream;
    setHasLiveMedia(true);
    setMediaError('');
    await engineRef.current?.setLocalMedia(stream);
    engineRef.current?.setCameraTrack(stream.getVideoTracks()[0] ?? null);
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    setMicOn(true);
    setCamOn(stream.getVideoTracks().length > 0);
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

  /* ---------------- بیگ‌بلوباتن: ورود و پایان کلاس ---------------- */
  const joinBbb = useCallback(async () => {
    const token = getToken();
    if (!token || !session) return;
    setBbbBusy(true);
    setBbbError('');
    try {
      const response = await api.bbbJoin(token, session.id);
      const url = response.data?.join_url || '';
      if (!url) throw new Error('لینک ورود به بیگ‌بلوباتن دریافت نشد.');
      setBbbUrl(url);
      setPhase('bbb');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'ورود به بیگ‌بلوباتن ممکن نشد.';
      setBbbError(message);
      setNotice(message);
      window.setTimeout(() => setNotice(''), 6000);
    } finally {
      setBbbBusy(false);
    }
  }, [session]);

  // برگزاری جلسات تصویری فعلاً فقط روی بیگ‌بلوباتن است (پرچم feature-flags) —
  // صفحهٔ کلاس بدون گذر از پیش‌آزمون P2P، مستقیم کلاس بیگ‌بلوباتن را می‌سازد و باز می‌کند.
  useEffect(() => {
    if (!VODDA_LIVE_ROOM_ENABLED && ready && session && phase === 'preflight' && !bbbAutoJoinRef.current) {
      bbbAutoJoinRef.current = true;
      void joinBbb();
    }
  }, [ready, session, phase, joinBbb]);

  async function endBbb() {
    const token = getToken();
    if (!token || !session) return;
    const confirmed = await confirmDialog('جلسهٔ بیگ‌بلوباتن برای همهٔ حاضران پایان یابد؟');
    if (!confirmed) return;
    try { await api.bbbEnd(token, session.id); } catch { /* شاید جلسه از قبل بسته شده باشد */ }
    setPhase('ended');
    router.push(isTeacherSide ? '/panel/teacher/sessions' : '/panel/user/sessions');
  }

/* ---------------- render ---------------- */
  const STAGE_BG = 'linear-gradient(168deg, #1c2214 0%, #252c1c 46%, #171c10 100%)';
  const GLASS = 'rgba(255,255,255,0.08)';
  const GLASS_BORDER = 'rgba(255,255,255,0.14)';
  const glass = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    background: GLASS,
    border: `1px solid ${GLASS_BORDER}`,
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    ...extra,
  });

  if (!ready) {
    return (
      <main style={{ padding: 48, maxWidth: 760, margin: '0 auto', display: 'grid', justifyItems: 'center', gap: 14 }}>
        <span style={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid var(--sand-150)', borderTopColor: 'var(--olive-600)', animation: 'liveSpin .9s linear infinite' }} />
        <span style={{ color: 'var(--ink-3)', fontSize: 13.5, fontWeight: 700 }}>در حال آماده‌سازی کلاس…</span>
        <style jsx global>{`@keyframes liveSpin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }
  if (loadError) {
    return (
      <main style={{ padding: 32, maxWidth: 620, margin: '0 auto' }}>
        <div style={{ padding: 24, borderRadius: 20, background: 'var(--clay-bg)', color: 'var(--rose)', fontWeight: 700, fontSize: 14, lineHeight: 2 }}>{loadError}</div>
        <button type="button" onClick={() => router.back()} style={{ marginTop: 16, border: 0, borderRadius: 14, padding: '12px 24px', background: 'var(--olive-600)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>بازگشت</button>
      </main>
    );
  }
  if (!session) return null;

  const statusMeta: Array<{ key: LiveStatus; text: string; dot: string }> = [
    { key: 'live', text: 'اتصال زنده', dot: '#9dc564' },
    { key: 'polling', text: 'اتصال پایدار', dot: 'var(--gold)' },
    { key: 'connecting', text: 'در حال اتصال…', dot: 'var(--gold)' },
    { key: 'error', text: 'خطای دسترسی', dot: '#e08a7a' },
    { key: 'closed', text: 'پایان', dot: 'var(--ink-3)' },
  ];
  const currentStatus = statusMeta.find((item) => item.key === status) ?? statusMeta[2];

  if (phase === 'preflight' && !VODDA_LIVE_ROOM_ENABLED) {
    // اتاق تصویری وُدّا موقتاً پنهان است (پرچم feature-flags) — به‌جای پیش‌آزمون
    // دوربین P2P، تنها مسیر برگزاری یعنی بیگ‌بلوباتن مستقیم باز می‌شود.
    return (
      <main style={{ padding: '24px 16px calc(32px + env(safe-area-inset-bottom))', maxWidth: 620, margin: '0 auto', display: 'grid', gap: 14 }}>
        <section style={{ background: STAGE_BG, borderRadius: 26, padding: 24, boxShadow: '0 22px 60px rgba(30,36,20,.35)', display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gap: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#b6c09b', letterSpacing: .4 }}>کلاس بیگ‌بلوباتن</span>
            <strong style={{ fontSize: 17, fontWeight: 900, color: '#fffaf0' }}>{session.service}</strong>
            <span style={{ fontSize: 12, color: '#a9b39b' }}>{session.local_date}{session.local_start && <> · ساعت {faDigits(session.local_start)}</>}</span>
          </div>
          {bbbError ? (
            <div style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(191,149,64,.13)', border: '1px solid rgba(191,149,64,.35)', display: 'grid', gap: 9 }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e7d5a8', fontSize: 12.5 }}>ورود به کلاس ممکن نشد</strong>
              <span style={{ fontSize: 11.8, lineHeight: 2, color: '#e8dcbc' }}>{bbbError}</span>
              <button type="button" disabled={bbbBusy} onClick={() => void joinBbb()} style={{ justifySelf: 'start', border: 0, borderRadius: 12, padding: '9px 18px', background: 'var(--gold)', color: '#221a08', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>تلاش دوباره</button>
            </div>
          ) : (
            <div style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: '30px 0' }}>
              <span style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(255,255,255,.16)', borderTopColor: '#d8b869', animation: 'liveSpin .9s linear infinite' }} />
              <span style={{ fontSize: 12.5, color: '#c9d1ba', fontWeight: 600 }}>{bbbBusy ? 'در حال ساخت کلاس بیگ‌بلوباتن…' : 'آماده‌سازی کلاس…'}</span>
            </div>
          )}
        </section>
        <style jsx global>{`@keyframes liveSpin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (phase === 'preflight') {
    return (
      <main style={{ padding: '24px 16px calc(32px + env(safe-area-inset-bottom))', maxWidth: 780, margin: '0 auto', display: 'grid', gap: 14 }}>
        {/* کارت تیرهٔ سینمایی پیش‌آزمون */}
        <section style={{ background: STAGE_BG, borderRadius: 26, padding: 18, boxShadow: '0 22px 60px rgba(30,36,20,.35)', display: 'grid', gap: 16 }}>
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#b6c09b', letterSpacing: .4 }}>کلاس تصویری وُدّا</span>
              <strong style={{ fontSize: 17, fontWeight: 900, color: '#fffaf0' }}>{session.service}</strong>
              <span style={{ fontSize: 12, color: '#a9b39b' }}>{session.local_date}{session.local_start && <> · ساعت {faDigits(session.local_start)}</>}</span>
            </div>
            {countdown && <span style={{ padding: '7px 14px', borderRadius: 999, ...glass(), color: '#e8ecdb', fontSize: 11.5, fontWeight: 800 }}>{countdown}</span>}
          </header>

          <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: '#141a0e', aspectRatio: '16 / 10', border: '1px solid rgba(255,255,255,.09)' }}>
            <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            {!previewStream && (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                <div style={{ display: 'grid', justifyItems: 'center', gap: 12 }}>
                  <span style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid rgba(255,255,255,.16)', borderTopColor: '#d8b869', animation: 'liveSpin .9s linear infinite' }} />
                  <span style={{ fontSize: 12.5, color: '#c9d1ba', fontWeight: 600 }}>در حال دسترسی به دوربین و میکروفون…</span>
                </div>
              </div>
            )}
            {previewStream && (
              <span style={{ position: 'absolute', bottom: 14, left: 14, padding: '6px 14px', borderRadius: 999, ...glass(), color: '#fffaf0', fontSize: 11.5, fontWeight: 700 }}>
                پیش‌نمایش شما
              </span>
            )}
          </div>

          {/* سطح صدای میکروفون */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#a9b39b' }}>سطح صدای میکروفون</span>
            <div style={{ flex: 1, height: 7, borderRadius: 999, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
              <div style={{ width: `${micLevel}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #93a172, #b3d56e)', transition: 'width .12s linear' }} />
            </div>
          </div>

          {mediaError && (
            <div style={{ padding: '14px 16px', borderRadius: 16, background: 'rgba(191,149,64,.13)', border: '1px solid rgba(191,149,64,.35)', display: 'grid', gap: 9 }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#e7d5a8', fontSize: 12.5 }}>مجوز دوربین/میکروفون لازم است</strong>
              <span style={{ fontSize: 11.8, lineHeight: 2, color: '#e8dcbc' }}>{mediaError}</span>
              <button type="button" onClick={() => window.location.reload()} style={{ justifySelf: 'start', border: 0, borderRadius: 12, padding: '9px 18px', background: 'var(--gold)', color: '#221a08', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>تلاش دوباره</button>
            </div>
          )}

          {notice && <div role="status" style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(191,149,64,.13)', border: '1px solid rgba(191,149,64,.35)', color: '#e7d5a8', fontSize: 12.5, fontWeight: 700 }}>{notice}</div>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => void joinClassroom(true)} style={{ flex: 1, minWidth: 220, padding: '15px 0', borderRadius: 18, border: 0, background: 'linear-gradient(145deg, #4c5a36, #5e6e43 60%, #728350)', color: '#fffaf0', fontWeight: 800, fontSize: 14.5, cursor: 'pointer', boxShadow: '0 12px 30px rgba(76,90,54,.45)' }}>
              ورود به کلاس با دوربین و میکروفون
            </button>
            <button type="button" onClick={() => void joinClassroom(false)} style={{ flex: 1, minWidth: 170, padding: '13px 0', borderRadius: 16, ...glass(), color: '#e8ecdb', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              ورود بدون رسانه (فقط تماشا)
            </button>
            <button type="button" disabled={bbbBusy} onClick={() => void joinBbb()} style={{ flex: '1 1 100%', padding: '13px 0', borderRadius: 16, border: '1px dashed rgba(216,184,105,.45)', background: 'rgba(216,184,105,.08)', color: '#e7d5a8', fontWeight: 800, fontSize: 13, cursor: bbbBusy ? 'wait' : 'pointer', opacity: bbbBusy ? 0.72 : 1 }}>
              {bbbBusy ? 'در حال ساخت کلاس بیگ‌بلوباتن…' : 'ورود با بیگ‌بلوباتن (کلاس کامل با تختهٔ هم‌نویسی)'}
            </button>
          </div>
        </section>
        <style jsx global>{`@keyframes liveSpin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (phase === 'bbb') {
    return (
      <main style={{ padding: '18px 14px calc(28px + env(safe-area-inset-bottom))', maxWidth: 1240, margin: '0 auto', display: 'grid', gap: 12 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--olive-600)', letterSpacing: 0.4 }}>کلاس بیگ‌بلوباتن</span>
            <strong style={{ fontSize: 16.5, fontWeight: 900 }}>کلاس زنده · {session.service}</strong>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{countdown}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 999, background: 'var(--olive-100)', fontSize: 11.5, fontWeight: 700, color: 'var(--olive-700)' }}>
              {role === 'learner' ? 'ورود به‌عنوان قرآن‌آموز' : 'ورود به‌عنوان مدرس'}
            </span>
            <button type="button" onClick={() => window.open(bbbUrl, '_blank', 'noopener')} style={{ border: '1px solid var(--sand-150)', borderRadius: 12, padding: '9px 14px', background: 'var(--surface)', color: 'var(--ink-2)', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
              باز کردن در تب جدید
            </button>
            {isTeacherSide && (
              <button type="button" onClick={() => void endBbb()} style={{ border: 0, borderRadius: 12, padding: '9px 14px', background: '#b3403a', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                پایان جلسه
              </button>
            )}
            {!VODDA_LIVE_ROOM_ENABLED ? null : (
              <button type="button" onClick={() => { setNotice(''); setPhase('preflight'); }} style={{ border: 0, borderRadius: 12, padding: '9px 14px', background: 'var(--olive-600)', color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                بازگشت
              </button>
            )}
          </div>
        </header>
        <section style={{ position: 'relative', borderRadius: 26, overflow: 'hidden', background: STAGE_BG, border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 22px 60px rgba(30,36,20,.35)', height: 'min(72vh, 820px)', minHeight: 480 }}>
          <iframe
            src={bbbUrl}
            title="کلاس بیگ‌بلوباتن"
            allow="camera; microphone; autoplay; fullscreen; display-capture; clipboard-read; clipboard-write"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </section>
        <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 2 }}>
          صدا و تصویر روی زیرساخت بیگ‌بلوباتن برگزار می‌شود و از سرورهای وُدّا عبور نمی‌کند. اگر صحنهٔ کلاس نمایش داده نشد، با «باز کردن در تب جدید» وارد شوید؛ ضبط جلسه فعال نیست.
        </p>
        <style jsx global>{`@keyframes livePulse { 0% { box-shadow: 0 0 0 0 rgba(179,213,110,.4); } 70% { box-shadow: 0 0 0 16px rgba(179,213,110,0); } 100% { box-shadow: 0 0 0 0 rgba(179,213,110,0); } }`}</style>
      </main>
    );
  }

  if (phase === 'ended') {
    return (
      <main style={{ padding: 40, maxWidth: 620, margin: '0 auto' }}>
        <section style={{ background: STAGE_BG, borderRadius: 26, padding: '42px 24px', textAlign: 'center', boxShadow: '0 22px 60px rgba(30,36,20,.35)' }}>
          <div style={{ display: 'grid', justifyItems: 'center', gap: 14 }}>
            <span style={{ width: 82, height: 82, borderRadius: '50%', ...glass(), display: 'grid', placeItems: 'center', animation: 'livePulse 2s infinite' }}>
              <span style={{ fontSize: 30 }}>🎓</span>
            </span>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fffaf0', margin: 0 }}>کلاس پایان یافت</h1>
            <p style={{ fontSize: 13, color: '#c9d1ba', margin: 0, lineHeight: 2, maxWidth: 320 }}>امیدواریم جلسهٔ مفیدی داشته باشید. امتیاز شما برای استاد ارزشمند است.</p>
            <button type="button" onClick={() => router.push(isTeacherSide ? '/panel/teacher/sessions' : '/panel/user/sessions')} style={{ marginTop: 10, border: 0, borderRadius: 16, padding: '13px 34px', background: 'linear-gradient(145deg, #4c5a36, #5e6e43)', color: '#fffaf0', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>بازگشت به جلسات</button>
          </div>
        </section>
        <style jsx global>{`@keyframes livePulse { 0% { box-shadow: 0 0 0 0 rgba(179,213,110,.4); } 70% { box-shadow: 0 0 0 16px rgba(179,213,110,0); } 100% { box-shadow: 0 0 0 0 rgba(179,213,110,0); } }`}</style>
      </main>
    );
  }

  /* ─────────── کلاس زنده ─────────── */
  const sidePanelHeight = narrow ? 430 : 540;

  return (
    <main style={{ padding: '18px 14px calc(28px + env(safe-area-inset-bottom))', maxWidth: 1240, margin: '0 auto', display: 'grid', gap: 12 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: 3 }}>
          <strong style={{ fontSize: 16.5, fontWeight: 900 }}>کلاس زنده · {session.service}</strong>
          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
            {session.local_date}{session.local_start && <> · {faDigits(session.local_start)} تا {faDigits(session.local_end)}</>} · {countdown}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 999, background: 'var(--olive-100)', fontSize: 11.5, fontWeight: 700, color: 'var(--olive-700)' }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: currentStatus.dot, boxShadow: `0 0 8px ${currentStatus.dot}` }} />
            {currentStatus.text}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 13px', borderRadius: 999, background: peerOnline ? 'var(--olive-100)' : 'var(--sand-100)', color: peerOnline ? 'var(--olive-700)' : 'var(--ink-3)', fontSize: 11.5, fontWeight: 700 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: peerOnline ? '#9dc564' : 'var(--ink-3)' }} />
            {peerOnline ? 'طرف مقابل آنلاین' : 'در انتظار طرف مقابل'}
          </span>
        </div>
      </header>

      {notice && <div role="status" style={{ padding: '11px 16px', borderRadius: 14, background: 'var(--gold-bg)', color: 'var(--gold)', fontSize: 12.5, fontWeight: 700 }}>{notice}</div>}

      {mediaError && !hasLiveMedia && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '12px 16px', borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)', fontSize: 12.5, fontWeight: 700 }}>
          <span style={{ flex: 1, minWidth: 220 }}>{mediaError}</span>
          <button type="button" onClick={() => void retryLiveMedia()} style={{ border: 0, borderRadius: 12, padding: '10px 18px', background: 'var(--olive-600)', color: '#fff', fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>تلاش دوباره</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: sideTab === 'none' || narrow ? '1fr' : 'minmax(0, 1.7fr) minmax(300px, 1fr)', gap: 12, alignItems: 'start' }}>
        {/* صحنهٔ کلاس */}
        <section style={{ background: STAGE_BG, borderRadius: 26, overflow: 'hidden', position: 'relative', aspectRatio: narrow ? '4 / 4.6' : '16 / 10', border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 22px 60px rgba(30,36,20,.35)' }}>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

          {!remoteActive && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24 }}>
              <div style={{ display: 'grid', justifyItems: 'center', gap: 12, textAlign: 'center' }}>
                <span style={{ width: 84, height: 84, borderRadius: '50%', ...glass({ background: 'rgba(255,255,255,.1)' }), display: 'grid', placeItems: 'center', animation: 'livePulse 2.2s infinite' }}>
                  <span style={{ fontSize: 32 }}>📵</span>
                </span>
                <strong style={{ fontSize: 14.5, fontWeight: 800, color: '#fffaf0' }}>{isTeacherSide ? 'در انتظار پیوستن دانش‌آموز…' : 'در انتظار پیوستن استاد…'}</strong>
                <span style={{ fontSize: 11.5, color: '#a9b39b' }}>صدا و تصویر به‌صورت مستقیم (P2P) منتقل می‌شود.</span>
                {connState && <span style={{ fontSize: 10.5, color: '#77836b', fontFamily: 'monospace' }}>{connState}</span>}
              </div>
            </div>
          )}

          {/* ویدیوی خودم */}
          <div style={{ position: 'absolute', bottom: 14, left: 14, width: narrow ? 120 : 172, aspectRatio: narrow ? '3 / 4' : '16 / 11', borderRadius: 16, overflow: 'hidden', background: '#1a211a', border: '1px solid rgba(216,184,105,.4)', boxShadow: '0 10px 30px rgba(0,0,0,.45)' }}>
            <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: sharing ? 'none' : facing === 'environment' ? 'none' : 'scaleX(-1)' }} />
            {!hasLiveMedia && (
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#8b9483', fontSize: 10.5, fontWeight: 700 }}>بدون دوربین</div>
            )}
          </div>

          {/* واکنش‌های شناور */}
          {reactions.map((reaction) => (
            <span key={reaction.id} style={{ position: 'absolute', bottom: 96, left: `${20 + (parseInt(reaction.id.slice(-2), 16) % 60)}%`, fontSize: 34, animation: 'floatUp 2.6s ease-out forwards', pointerEvents: 'none' }}>{reaction.emoji}</span>
          ))}

          {/* نوار ابزار شیشه‌ای روی صحنه */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, flexWrap: 'wrap', background: 'linear-gradient(0deg, rgba(15,19,10,.75), rgba(15,19,10,0))' }}>
            <LiveRoundButton
              label={micOn ? 'قطع میکروفون' : 'وصل میکروفون'}
              active={micOn}
              onClick={() => { setMicOn(!micOn); void engineRef.current?.toggleMic(!micOn); }}
            >
              🎙️
            </LiveRoundButton>
            <LiveRoundButton
              label={camOn ? 'خاموش کردن دوربین' : 'روشن کردن دوربین'}
              active={camOn}
              onClick={() => { setCamOn(!camOn); void engineRef.current?.toggleCamera(!camOn); }}
            >
              📷
            </LiveRoundButton>
            <LiveRoundButton label={sharing ? 'قطع اشتراک صفحه' : 'اشتراک صفحه'} active={sharing} onClick={() => void toggleShare()}>🖥️</LiveRoundButton>
            <div style={{ position: 'relative' }}>
              <LiveRoundButton label="واکنش‌ها" active={reactionsOpen} onClick={() => setReactionsOpen(!reactionsOpen)}>🎉</LiveRoundButton>
              {reactionsOpen && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6, padding: '9px 12px', borderRadius: 999, background: 'rgba(23,28,16,.94)', border: '1px solid rgba(255,255,255,.14)', boxShadow: '0 10px 30px rgba(0,0,0,.4)', zIndex: 20 }}>
                  {REACTIONS.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => sendReaction(emoji)} style={{ background: 'none', border: 0, fontSize: 22, cursor: 'pointer', padding: 2 }} aria-label={emoji}>{emoji}</button>
                  ))}
                </div>
              )}
            </div>
            <LiveRoundButton label="گفت‌وگو" active={sideTab === 'chat'} badge={unread > 0 && sideTab !== 'chat' ? unread : 0} onClick={() => openSide('chat')}>💬</LiveRoundButton>
            <LiveRoundButton label="تنظیمات دوربین و صدا" active={sideTab === 'settings'} onClick={() => openSide('settings')}>⚙️</LiveRoundButton>
            <LiveRoundButton label="متن قرآنی" active={sideTab === 'reading'} onClick={() => openSide('reading')}>📖</LiveRoundButton>
            <LiveRoundButton label={isTeacherSide ? 'پایان کلاس و تسویه' : 'خروج از کلاس'} danger onClick={() => { void confirmDialog(isTeacherSide ? 'کلاس پایان یابد و تسویهٔ جلسه انجام شود؟' : 'از کلاس خارج می‌شوید؟').then((confirmed) => { if (confirmed) void leaveClassroom(isTeacherSide); }); }}>🔚</LiveRoundButton>
          </div>
        </section>

        {/* پنل کناری */}
        {sideTab !== 'none' && (
          <section style={{ background: STAGE_BG, borderRadius: 22, border: '1px solid rgba(255,255,255,.1)', display: 'flex', flexDirection: 'column', height: sidePanelHeight, overflow: 'hidden', boxShadow: '0 22px 60px rgba(30,36,20,.3)' }}>
            <div style={{ display: 'flex', padding: 8, gap: 6 }}>
              {([['chat', 'گفت‌وگو'], ['settings', 'تنظیمات'], ['reading', 'متن قرآنی']] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setSideTab(key)} style={{ flex: 1, padding: '10px 0', border: 0, borderRadius: 12, cursor: 'pointer', fontSize: 12.5, fontWeight: 800, background: sideTab === key ? 'rgba(255,255,255,.14)' : 'transparent', color: sideTab === key ? '#fffaf0' : '#a9b39b' }}>{label}</button>
              ))}
            </div>

            {sideTab === 'chat' && (
              <>
                <div ref={chatBodyRef} className="live-scroll" style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
                  {chat.map((message) => message.role === 'system' ? (
                    <div key={message.id} style={{ alignSelf: 'center', maxWidth: '90%', padding: '5px 14px', borderRadius: 999, background: 'rgba(255,255,255,.07)', color: '#a9b39b', fontSize: 11.5, fontWeight: 600 }}>
                      {message.text}
                    </div>
                  ) : (
                    <div key={message.id} style={{ alignSelf: message.mine ? 'flex-start' : 'flex-end', maxWidth: '82%', display: 'grid', gap: 3 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#77836b', padding: '0 6px' }}>{message.mine ? 'شما' : isTeacherSide ? 'قرآن‌آموز' : 'استاد'}</span>
                      <div style={{ padding: '10px 14px', borderRadius: message.mine ? '16px 16px 5px 16px' : '16px 16px 16px 5px', background: message.mine ? 'linear-gradient(145deg, #5e6e43, #728350)' : 'rgba(255,255,255,.1)', color: message.mine ? '#fffaf0' : '#eef1e6', fontSize: 13.5, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {message.text}
                      </div>
                      <span style={{ fontSize: 10, color: '#77836b', padding: '0 6px', textAlign: message.mine ? 'left' : 'right' }}>{chatTime(message.at)}</span>
                    </div>
                  ))}
                  {chat.length === 0 && (
                    <div style={{ margin: 'auto', textAlign: 'center', color: '#a9b39b', fontSize: 12.5, display: 'grid', gap: 6, justifyItems: 'center' }}>
                      <span style={{ fontSize: 28 }}>💬</span>
                      <span>پیامی نیست؛ سلام کنید و گفت‌وگو را شروع کنید.</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid rgba(255,255,255,.08)' }}>
                  <input value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendChat(); }} placeholder="پیام خود را بنویسید…" maxLength={1000} style={{ flex: 1, padding: '11px 15px', borderRadius: 14, border: `1px solid ${GLASS_BORDER}`, background: 'rgba(255,255,255,.06)', color: '#fffaf0', fontSize: 13.5, outline: 'none' }} />
                  <button type="button" onClick={sendChat} disabled={!chatDraft.trim()} style={{ border: 0, borderRadius: 14, padding: '0 20px', background: chatDraft.trim() ? 'linear-gradient(145deg, #4c5a36, #5e6e43)' : 'rgba(255,255,255,.08)', color: chatDraft.trim() ? '#fffaf0' : '#77836b', fontWeight: 800, cursor: chatDraft.trim() ? 'pointer' : 'default' }}>ارسال</button>
                </div>
              </>
            )}

            {sideTab === 'settings' && (
              <div className="live-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'grid', gap: 14, alignContent: 'start' }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <strong style={{ fontSize: 13.5, color: '#fffaf0' }}>تنظیمات دوربین و میکروفون</strong>
                  <span style={{ fontSize: 12, color: '#a9b39b', lineHeight: 1.9 }}>
                    دوربین و میکروفون را بدون خروج از کلاس عوض کنید؛ روی موبایل می‌توانید بین دوربین جلو و عقب جابه‌جا شوید.
                  </span>
                </div>
                <button type="button" onClick={() => void flipCamera()} disabled={settingsBusy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '13px 15px', borderRadius: 14, border: `1px solid ${GLASS_BORDER}`, background: 'rgba(255,255,255,.06)', color: '#eef1e6', cursor: settingsBusy ? 'wait' : 'pointer' }}>
                  <span style={{ display: 'grid', justifyItems: 'start', gap: 2 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 800 }}>چرخش دوربین (جلو / عقب)</span>
                    <span style={{ fontSize: 11.5, color: '#a9b39b' }}>مناسب موبایل — تصویر بلافاصله برای طرف مقابل عوض می‌شود.</span>
                  </span>
                  <span style={{ fontSize: 20 }}>🔄</span>
                </button>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#c9d1ba' }}>دوربین</span>
                  <select
                    value={(liveDevices.find((device) => device.kind === 'videoinput' && device.deviceId === liveStreamRef.current?.getVideoTracks()[0]?.getSettings().deviceId)?.deviceId) ?? ''}
                    onChange={(event) => void switchCameraDevice(event.target.value)}
                    disabled={settingsBusy}
                    style={{ padding: '11px 12px', borderRadius: 12, border: `1px solid ${GLASS_BORDER}`, background: 'rgba(255,255,255,.06)', color: '#fffaf0', fontSize: 13 }}
                  >
                    {liveDevices.filter((device) => device.kind === 'videoinput').map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>{device.label || 'دوربین'}</option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: '#c9d1ba' }}>میکروفون</span>
                  <select
                    value={(liveDevices.find((device) => device.kind === 'audioinput' && device.deviceId === liveStreamRef.current?.getAudioTracks()[0]?.getSettings().deviceId)?.deviceId) ?? ''}
                    onChange={(event) => void switchMicDevice(event.target.value)}
                    disabled={settingsBusy}
                    style={{ padding: '11px 12px', borderRadius: 12, border: `1px solid ${GLASS_BORDER}`, background: 'rgba(255,255,255,.06)', color: '#fffaf0', fontSize: 13 }}
                  >
                    {liveDevices.filter((device) => device.kind === 'audioinput').map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>{device.label || 'میکروفون'}</option>
                    ))}
                  </select>
                </label>
                {settingsBusy && <div style={{ padding: '9px 13px', borderRadius: 12, background: 'rgba(191,149,64,.15)', color: '#e7d5a8', fontSize: 12, fontWeight: 700 }}>در حال اعمال تغییرات…</div>}
              </div>
            )}

            {sideTab === 'reading' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: 12, gap: 10 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {QURAN_SNIPPETS.map((snippet) => (
                    <button key={snippet.label} type="button" onClick={() => isTeacherSide && sendReading(snippet.text)} disabled={!isTeacherSide} style={{ border: `1px solid ${GLASS_BORDER}`, background: 'rgba(255,255,255,.06)', color: '#eef1e6', borderRadius: 999, padding: '7px 14px', fontSize: 12, cursor: isTeacherSide ? 'pointer' : 'default', opacity: isTeacherSide ? 1 : .6 }}>{snippet.label}</button>
                  ))}
                </div>
                {isTeacherSide ? (
                  <textarea value={readingText} onChange={(event) => setReadingText(event.target.value)} onBlur={(event) => sendReading(event.target.value)} placeholder="متن تمرین تلاوت را بنویسید؛ با خروج از کادر برای دانش‌آموز ارسال می‌شود." style={{ flex: 1, resize: 'none', padding: 14, borderRadius: 14, border: `1px solid ${GLASS_BORDER}`, background: 'rgba(255,255,255,.06)', color: '#fffaf0', fontSize: 15.5, lineHeight: 2.2, outline: 'none', fontFamily: 'inherit' }} />
                ) : (
                  <div className="live-scroll" style={{ flex: 1, overflowY: 'auto', padding: 14, borderRadius: 14, border: `1px solid ${GLASS_BORDER}`, background: 'rgba(255,255,255,.06)', color: '#eef1e6', fontSize: 16.5, lineHeight: 2.3, whiteSpace: 'pre-wrap' }}>{readingText || 'مترببی هنوز متنی ارسال نکرده است.'}</div>
                )}
              </div>
            )}
          </section>
        )}
      </div>

      <style jsx global>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-140px) scale(1.5); opacity: 0; }
        }
        @keyframes livePulse {
          0% { box-shadow: 0 0 0 0 rgba(179,213,110,.4); }
          70% { box-shadow: 0 0 0 16px rgba(179,213,110,0); }
          100% { box-shadow: 0 0 0 0 rgba(179,213,110,0); }
        }
        .live-scroll::-webkit-scrollbar { width: 5px; }
        .live-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.22); border-radius: 99px; }
        .live-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </main>
  );
}

/** دکمهٔ گرد ابزار روی صحنهٔ تیره — سبک تماس ویدیویی. */
function LiveRoundButton({ label, active = false, danger = false, onClick, children, badge = 0 }: {
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
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
        width: 52,
        height: 52,
        display: 'grid',
        placeItems: 'center',
        borderRadius: '50%',
        border: `1px solid ${danger ? 'transparent' : 'rgba(255,255,255,.14)'}`,
        background: danger ? '#b3403a' : active ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.08)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        fontSize: 19,
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0,0,0,.3)',
        transition: 'background .15s ease',
      }}
    >
      <span style={{ lineHeight: 1 }}>{children}</span>
      {badge > 0 && <span style={{ position: 'absolute', top: -4, left: -4, minWidth: 20, height: 20, borderRadius: 999, background: 'var(--gold)', color: '#221a08', fontSize: 10.5, fontWeight: 800, display: 'grid', placeItems: 'center', padding: '0 5px' }}>{faDigits(badge)}</span>}
    </button>
  );
}
