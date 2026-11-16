'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/web/ui';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
} from '@/components/panel/PanelUI';
import { FilterTabs, StatCard, TablePagination } from '@/components/admin/AdminUI';
import { getToken } from '@/lib/auth';
import { toFaDigits } from '@/lib/persian';
import { confirmDialog } from '@/lib/confirm';

/**
 * صندوق پشتیبانی زندهٔ وُدّا — سیستم چت و تیکتینگ آنلاین.
 * کاربران و اساتید تیکت باز می‌کنند؛ مدیران و کارشناسان منصوب پشتیبانی
 * (که مدیر آن‌ها را از تب «کارشناسان پشتیبانی» منصوب می‌کند) در همین صفحه
 * به‌صورت لحظه‌ای پاسخ می‌دهند؛ پیام متنی، صوتی و تصویری پشتیبانی می‌شود.
 */

type TicketStatus = 'open' | 'pending' | 'answered' | 'closed';
type MessageKind = 'text' | 'audio' | 'image';

type TicketUser = {
  id: number;
  name: string;
  mobile?: string;
  role?: string;
  avatar_url?: string;
};

type AdminTicket = {
  id: number;
  subject: string;
  status: TicketStatus;
  unread_staff: number;
  assigned_to?: number | null;
  last_message_at: string;
  created_at: string;
  user?: TicketUser | null;
  assignee?: TicketUser | null;
};

type AdminChatMessage = {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_side: 'user' | 'staff';
  kind: MessageKind;
  body: string;
  attachment_url?: string;
  attachment_mime?: string;
  duration_ms?: number;
  created_at: string;
};

type SupportAgent = {
  id: number;
  name: string;
  mobile: string;
  role: string;
  avatar_url?: string;
};

type LegacySupportMessage = {
  id: number;
  name: string;
  contact: string;
  message: string;
  status: 'new' | 'resolved';
  created_at: string;
};

type InboxView = 'tickets' | 'agents' | 'contact';

const PAGE_SIZE = 30;
const POLL_LIST_MS = 8000;
const POLL_THREAD_MS = 3000;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function shortTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${toFaDigits(minutes)}:${toFaDigits(String(seconds).padStart(2, '0'))}`;
}

const STATUS_META: Record<TicketStatus, { label: string; tone: 'gold' | 'clay' | 'green' | 'muted' }> = {
  open: { label: 'در انتظار بررسی', tone: 'gold' },
  pending: { label: 'در انتظار پاسخ', tone: 'clay' },
  answered: { label: 'پاسخ داده‌شده', tone: 'green' },
  closed: { label: 'بسته‌شده', tone: 'muted' },
};

function statusChip(status: TicketStatus) {
  const meta = STATUS_META[status] ?? STATUS_META.open;
  return (
    <span className="adm-badge" data-tone={meta.tone}>
      {meta.label}
    </span>
  );
}

async function apiJson(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/backend${path}`, {
    ...init,
    cache: 'no-store',
    credentials: 'same-origin',
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof body.error === 'string' ? body.error : 'درخواست ناموفق بود.';
    throw new Error(message);
  }
  return body;
}

function pickRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? '';
}

function mimeToExtension(mime: string): string {
  if (mime.includes('webm')) return '.webm';
  if (mime.includes('ogg')) return '.ogg';
  if (mime.includes('mp4')) return '.m4a';
  return '.bin';
}

/** compact voice-note player used in the staff thread. */
function StaffAudioBubble({ url, durationMs, mine }: { url: string; durationMs: number; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => () => audioRef.current?.pause(), []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        minWidth: 170,
        padding: '7px 10px',
        borderRadius: 999,
        border: `1px solid ${mine ? 'rgba(255,255,255,.35)' : 'var(--olive-200, #d6dcc4)'}`,
        background: mine ? 'var(--olive-600, #5e6e43)' : '#fff',
      }}
    >
      <button
        type="button"
        onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (playing) audio.pause();
          else void audio.play().catch(() => setPlaying(false));
        }}
        aria-label={playing ? 'توقف پخش پیام صوتی' : 'پخش پیام صوتی'}
        style={{
          width: 34,
          height: 34,
          flex: '0 0 auto',
          display: 'grid',
          placeItems: 'center',
          padding: 0,
          border: 0,
          borderRadius: '50%',
          cursor: 'pointer',
          color: mine ? '#fffaf0' : '#fffaf0',
          background: mine ? 'rgba(255,255,255,.22)' : 'var(--olive-600, #5e6e43)',
        }}
      >
        {playing ? (
          <span aria-hidden style={{ display: 'inline-flex', gap: 2.5 }}>
            <span style={{ width: 3.5, height: 12, background: 'currentColor', borderRadius: 2 }} />
            <span style={{ width: 3.5, height: 12, background: 'currentColor', borderRadius: 2 }} />
          </span>
        ) : (
          <Icon name="play" size={15} stroke={2.2} />
        )}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div aria-hidden style={{ height: 4, borderRadius: 999, overflow: 'hidden', background: mine ? 'rgba(255,255,255,.25)' : 'var(--olive-100, #e8ecdb)' }}>
          <div
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: '100%',
              borderRadius: 999,
              background: mine ? '#fffaf0' : 'var(--olive-600, #5e6e43)',
              transition: 'width .2s linear',
            }}
          />
        </div>
        <span style={{ display: 'block', marginTop: 3, fontSize: 10, fontWeight: 700, opacity: 0.9 }}>{formatDuration(durationMs || 0)}</span>
      </div>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={(event) => {
          const audio = event.currentTarget;
          if (audio.duration > 0 && Number.isFinite(audio.duration)) setProgress(audio.currentTime / audio.duration);
        }}
      />
    </div>
  );
}

export default function AdminSupportPage() {
  const token = getToken();
  const [view, setView] = useState<InboxView>('tickets');

  // --- ticket inbox state ---
  const [status, setStatus] = useState<'' | TicketStatus>('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketsError, setTicketsError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [threadVisible, setThreadVisible] = useState(false);

  const [activeTicket, setActiveTicket] = useState<AdminTicket | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [threadError, setThreadError] = useState('');

  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [voicePreview, setVoicePreview] = useState<{ blob: Blob; url: string; ms: number; mime: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<{ file: File; url: string } | null>(null);
  const [sendingAttachment, setSendingAttachment] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordSecondsRef = useRef<number>(0);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const lastMessageIdRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedIdRef = useRef<number | null>(null);

  // --- agents state ---
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentMobile, setAgentMobile] = useState('');
  const [agentsError, setAgentsError] = useState('');
  const [agentsBusy, setAgentsBusy] = useState(false);

  // --- legacy contact form state ---
  const [legacyStatus, setLegacyStatus] = useState<'new' | 'resolved'>('new');
  const [legacyMessages, setLegacyMessages] = useState<LegacySupportMessage[]>([]);
  const [legacyTotal, setLegacyTotal] = useState(0);
  const [legacyPage, setLegacyPage] = useState(0);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyError, setLegacyError] = useState('');
  const [busyLegacyId, setBusyLegacyId] = useState<number | null>(null);

  const [staffUnread, setStaffUnread] = useState(0);

  selectedIdRef.current = selectedId;

  const loadTickets = useCallback(async () => {
    if (!token) return;
    setTicketsLoading(true);
    setTicketsError('');
    try {
      const params = new URLSearchParams({ limit: '40', offset: '0' });
      if (status) params.set('status', status);
      if (onlyMine) params.set('mine', '1');
      const body = await apiJson(`/support-staff/tickets?${params.toString()}`);
      const rows = Array.isArray(body.data) ? (body.data as AdminTicket[]) : [];
      setTickets(rows);
      setTicketsTotal(Number(body.total || rows.length));
    } catch (cause) {
      setTicketsError(cause instanceof Error ? cause.message : 'دریافت تیکت‌ها ناموفق بود.');
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  }, [status, onlyMine, token]);

  const loadStaffUnread = useCallback(async () => {
    if (!token) return;
    try {
      const body = await apiJson('/support-staff/unread');
      setStaffUnread(Number((body.data as Record<string, unknown>)?.unread || 0));
    } catch {
      /* بی‌اهمیت */
    }
  }, [token]);

  const loadAgents = useCallback(async () => {
    if (!token) return;
    setAgentsLoading(true);
    setAgentsError('');
    try {
      const body = await apiJson('/admin/support/agents');
      setAgents(Array.isArray((body.data as Record<string, unknown>)?.agents) ? ((body.data as Record<string, unknown>).agents as SupportAgent[]) : []);
    } catch (cause) {
      setAgentsError(cause instanceof Error ? cause.message : 'دریافت کارشناسان ناموفق بود.');
    } finally {
      setAgentsLoading(false);
    }
  }, [token]);

  const openThread = useCallback(async (ticketId: number) => {
    setSelectedId(ticketId);
    setThreadVisible(true);
    setThreadLoading(true);
    setThreadError('');
    lastMessageIdRef.current = 0;
    setMessages([]);
    try {
      const body = await apiJson(`/support-staff/tickets/${ticketId}`);
      const data = (body.data ?? {}) as Record<string, unknown>;
      setActiveTicket((data.ticket ?? null) as AdminTicket | null);
      const rows = Array.isArray(data.messages) ? (data.messages as AdminChatMessage[]) : [];
      setMessages(rows);
      if (rows.length > 0) lastMessageIdRef.current = rows[rows.length - 1].id;
    } catch (cause) {
      setThreadError(cause instanceof Error ? cause.message : 'دریافت گفتگو ناموفق بود.');
    } finally {
      setThreadLoading(false);
    }
  }, []);

  // نظرسنجی گفتگوی باز — پیام‌های تازه به‌صورت افزاینده واکشی می‌شوند.
  useEffect(() => {
    if (view !== 'tickets' || !selectedId || !token) return;
    const ticketId = selectedId;
    const timer = window.setInterval(async () => {
      try {
        const body = await apiJson(`/support-staff/tickets/${ticketId}?after_id=${lastMessageIdRef.current}`);
        const data = (body.data ?? {}) as Record<string, unknown>;
        const ticket = (data.ticket ?? null) as AdminTicket | null;
        if (ticket) setActiveTicket(ticket);
        const rows = Array.isArray(data.messages) ? (data.messages as AdminChatMessage[]) : [];
        if (rows.length > 0) {
          setMessages((current) => {
            const seen = new Set(current.map((item) => item.id));
            const fresh = rows.filter((item) => !seen.has(item.id));
            if (fresh.length === 0) return current;
            const merged = [...current, ...fresh];
            lastMessageIdRef.current = Math.max(lastMessageIdRef.current, ...fresh.map((item) => item.id));
            return merged;
          });
        }
      } catch {
        /* تلاش بعدی */
      }
    }, POLL_THREAD_MS);
    return () => window.clearInterval(timer);
  }, [view, selectedId, token]);

  useEffect(() => {
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, threadLoading]);

  // فهرست تیکت‌ها و شمارندهٔ خوانده‌نشده‌ها به‌صورت دوره‌ای تازه می‌شوند.
  useEffect(() => {
    if (!token) return;
    if (view === 'tickets') void loadTickets();
    if (view === 'agents') void loadAgents();
    void loadStaffUnread();
    const timer = window.setInterval(() => {
      void loadStaffUnread();
      if (view === 'tickets' && document.visibilityState === 'visible') void loadTickets();
    }, POLL_LIST_MS);
    return () => window.clearInterval(timer);
  }, [token, view, loadTickets, loadAgents, loadStaffUnread]);

  // --- sending ---

  async function sendReply() {
    if (!selectedId || !reply.trim() || replyBusy) return;
    setReplyBusy(true);
    setThreadError('');
    try {
      const body = await apiJson(`/support-staff/tickets/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'text', body: reply.trim() }),
      });
      const message = ((body.data as Record<string, unknown>)?.message ?? null) as AdminChatMessage | null;
      if (message) {
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, message.id);
        setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      }
      setReply('');
      setActiveTicket((current) => (current ? { ...current, status: 'answered', unread_staff: 0 } : current));
      void loadTickets();
    } catch (cause) {
      setThreadError(cause instanceof Error ? cause.message : 'ارسال پاسخ ناموفق بود.');
    } finally {
      setReplyBusy(false);
    }
  }

  async function uploadAttachment(file: File, kind: 'audio' | 'image'): Promise<{ url: string; mime: string }> {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    const response = await fetch('/api/backend/support-staff/upload', {
      method: 'POST',
      body: form,
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'بارگذاری پیوست ناموفق بود.');
    const data = (body.data ?? {}) as Record<string, unknown>;
    return { url: String(data.url || ''), mime: String(data.mime || '') };
  }

  async function sendVoice() {
    if (!selectedId || !voicePreview || sendingAttachment) return;
    setSendingAttachment(true);
    setThreadError('');
    try {
      const extension = mimeToExtension(voicePreview.mime);
      const file = new File([voicePreview.blob], `voice_${Date.now()}${extension}`, { type: voicePreview.mime });
      const uploaded = await uploadAttachment(file, 'audio');
      const body = await apiJson(`/support-staff/tickets/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'audio', attachment_url: uploaded.url, mime: uploaded.mime, duration_ms: voicePreview.ms }),
      });
      const message = ((body.data as Record<string, unknown>)?.message ?? null) as AdminChatMessage | null;
      if (message) {
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, message.id);
        setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      }
      URL.revokeObjectURL(voicePreview.url);
      setVoicePreview(null);
      setActiveTicket((current) => (current ? { ...current, status: 'answered', unread_staff: 0 } : current));
      void loadTickets();
    } catch (cause) {
      setThreadError(cause instanceof Error ? cause.message : 'ارسال پیام صوتی ناموفق بود.');
    } finally {
      setSendingAttachment(false);
    }
  }

  async function handleImageChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setThreadError('فقط تصویر انتخاب کنید.');
      return;
    }
    setImagePreview({ file, url: URL.createObjectURL(file) });
  }

  async function sendImage() {
    if (!selectedId || !imagePreview || sendingAttachment) return;
    setSendingAttachment(true);
    setThreadError('');
    try {
      const uploaded = await uploadAttachment(imagePreview.file, 'image');
      const body = await apiJson(`/support-staff/tickets/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'image', attachment_url: uploaded.url, mime: uploaded.mime }),
      });
      const message = ((body.data as Record<string, unknown>)?.message ?? null) as AdminChatMessage | null;
      if (message) {
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current, message.id);
        setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      }
      URL.revokeObjectURL(imagePreview.url);
      setImagePreview(null);
      setActiveTicket((current) => (current ? { ...current, status: 'answered', unread_staff: 0 } : current));
      void loadTickets();
    } catch (cause) {
      setThreadError(cause instanceof Error ? cause.message : 'ارسال تصویر ناموفق بود.');
    } finally {
      setSendingAttachment(false);
    }
  }

  function startRecording() {
    setThreadError('');
    navigator.mediaDevices
      ?.getUserMedia({ audio: true })
      .then((stream) => {
        const mime = pickRecorderMime();
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
          const blob = new Blob(recordChunksRef.current, { type: mime || 'audio/webm' });
          setVoicePreview({ blob, url: URL.createObjectURL(blob), ms: Math.max(600, seconds * 1000), mime: mime || 'audio/webm' });
        };
        recorderRef.current = recorder;
        recordSecondsRef.current = 0;
        setRecordSeconds(0);
        setRecording(true);
        recorder.start(250);
        recordTimerRef.current = window.setInterval(() => {
          recordSecondsRef.current += 1;
          setRecordSeconds(recordSecondsRef.current);
          if (recordSecondsRef.current >= 300) recorderRef.current?.stop();
        }, 1000);
      })
      .catch(() => setThreadError('دسترسی به میکروفون ممکن نشد؛ اجازهٔ مرورگر را بررسی کنید.'));
  }

  function stopRecording(send: boolean) {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (!send) {
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

  // --- ticket management actions ---

  async function assignTicket(ticketId: number, agentId: number) {
    setThreadError('');
    try {
      const body = await apiJson(`/support-staff/tickets/${ticketId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: agentId }),
      });
      const ticket = ((body.data as Record<string, unknown>)?.ticket ?? null) as AdminTicket | null;
      if (ticket) setActiveTicket(ticket);
      void loadTickets();
    } catch (cause) {
      setThreadError(cause instanceof Error ? cause.message : 'ارجاع تیکت ناموفق بود.');
    }
  }

  async function changeTicketStatus(ticketId: number, next: TicketStatus) {
    setThreadError('');
    try {
      const body = await apiJson(`/support-staff/tickets/${ticketId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const ticket = ((body.data as Record<string, unknown>)?.ticket ?? null) as AdminTicket | null;
      if (ticket) setActiveTicket(ticket);
      void loadTickets();
    } catch (cause) {
      setThreadError(cause instanceof Error ? cause.message : 'تغییر وضعیت ناموفق بود.');
    }
  }

  // --- agents ---

  async function appointAgent() {
    const mobile = agentMobile.trim();
    if (!mobile || agentsBusy) return;
    setAgentsBusy(true);
    setAgentsError('');
    try {
      await apiJson('/admin/support/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      setAgentMobile('');
      await loadAgents();
    } catch (cause) {
      setAgentsError(cause instanceof Error ? cause.message : 'منصوب‌کردن کارشناس ناموفق بود.');
    } finally {
      setAgentsBusy(false);
    }
  }

  async function revokeAgent(agent: SupportAgent) {
    if (agentsBusy) return;
    if (!(await confirmDialog(`دسترسی کارشناس «${agent.name}» لغو شود؟`))) return;
    setAgentsBusy(true);
    setAgentsError('');
    try {
      await apiJson(`/admin/support/agents/${agent.id}`, { method: 'DELETE' });
      await loadAgents();
    } catch (cause) {
      setAgentsError(cause instanceof Error ? cause.message : 'لغو دسترسی ناموفق بود.');
    } finally {
      setAgentsBusy(false);
    }
  }

  // --- legacy contact form messages ---

  const loadLegacy = useCallback(async () => {
    if (!token) return;
    setLegacyLoading(true);
    setLegacyError('');
    try {
      const params = new URLSearchParams({ status: legacyStatus, limit: String(PAGE_SIZE), offset: String(legacyPage * PAGE_SIZE) });
      const body = await apiJson(`/admin/support/messages?${params.toString()}`);
      setLegacyMessages(Array.isArray(body.data) ? (body.data as LegacySupportMessage[]) : []);
      setLegacyTotal(Number(body.total || 0));
    } catch (cause) {
      setLegacyError(cause instanceof Error ? cause.message : 'پیام‌های پشتیبانی دریافت نشدند.');
      setLegacyMessages([]);
      setLegacyTotal(0);
    } finally {
      setLegacyLoading(false);
    }
  }, [legacyStatus, legacyPage, token]);

  useEffect(() => {
    if (view === 'contact') void loadLegacy();
  }, [view, loadLegacy]);

  async function resolveLegacy(message: LegacySupportMessage) {
    if (busyLegacyId !== null || message.status !== 'new') return;
    if (!(await confirmDialog('این پیام به‌عنوان رسیدگی‌شده ثبت شود؟'))) return;
    setBusyLegacyId(message.id);
    setLegacyError('');
    try {
      await apiJson(`/admin/support/messages/${message.id}/resolve`, { method: 'PATCH' });
      await loadLegacy();
    } catch (cause) {
      setLegacyError(cause instanceof Error ? cause.message : 'ثبت رسیدگی انجام نشد.');
    } finally {
      setBusyLegacyId(null);
    }
  }

  const selectedTicket = useMemo(() => activeTicket, [activeTicket]);
  const agentsForAssign = useMemo(() => agents, [agents]);

  if (!token) {
    return (
      <main className="ops-page">
        <PanelPageHeader eyebrow="ارتباط با کاربران" title="پشتیبانی زنده" description="برای مشاهده ابتدا وارد شوید." />
      </main>
    );
  }

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="ارتباط لحظه‌ای با کاربران و اساتید"
        title="پشتیبانی زنده"
        description="تیکت‌ها و گفتگوهای کاربران را بی‌درنگ پاسخ دهید؛ پیام متنی، صوتی و تصویری پشتیبانی می‌شود و می‌توانید هر کاربر را به‌عنوان کارشناس پشتیبانی منصوب کنید."
        actions={
          <>
            {staffUnread > 0 && (
              <span className="adm-badge" data-tone="rose" style={{ alignSelf: 'center' }}>
                {toFaDigits(staffUnread)} گفتگوی بی‌پاسخ
              </span>
            )}
            <PanelButton icon="refresh" onClick={() => { if (view === 'tickets') void loadTickets(); if (view === 'agents') void loadAgents(); if (view === 'contact') void loadLegacy(); }}>
              به‌روزرسانی
            </PanelButton>
          </>
        }
      />

      <div className="adm-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <div style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--sand-50, #f4f0e7)' }}>
          {([
            { key: 'tickets', label: 'گفتگوهای زنده', icon: 'message' as const },
            { key: 'agents', label: 'کارشناسان پشتیبانی', icon: 'users' as const },
            { key: 'contact', label: 'پیام‌های فرم تماس', icon: 'doc' as const },
          ] as Array<{ key: InboxView; label: string; icon: Parameters<typeof Icon>[0]['name'] }>).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setView(tab.key); setThreadVisible(false); }}
              aria-pressed={view === tab.key}
              className="ops-button"
              data-tone={view === tab.key ? 'primary' : 'default'}
              style={{ border: 0, boxShadow: 'none' }}
            >
              <Icon name={tab.icon} size={15} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- گفتگوهای زنده ---------- */}
      {view === 'tickets' && (
        <>
          <div className="adm-stat-grid" style={{ marginBottom: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <StatCard
              icon="message"
              tone="gold"
              label="گفتگوهای در جریان"
              value={ticketsLoading ? '—' : toFaDigits(tickets.filter((row) => row.status === 'open' || row.status === 'pending').length)}
              hint="باز و در انتظار پاسخ کارشناس"
            />
            <StatCard
              icon="checkCircle"
              tone="olive"
              label="پاسخ داده‌شده"
              value={ticketsLoading ? '—' : toFaDigits(tickets.filter((row) => row.status === 'answered').length)}
              hint="در انتظار واکنش کاربر"
            />
            <StatCard
              icon="shield"
              tone="info"
              label="کارشناسان فعال"
              value={toFaDigits(agents.length)}
              hint="منصوب از تب کارشناسان"
            />
          </div>

          <div className="adm-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <FilterTabs
              ariaLabel="وضعیت تیکت‌ها"
              items={[
                { value: '' as '' | TicketStatus, label: 'همه' },
                { value: 'open' as '' | TicketStatus, label: 'در انتظار بررسی' },
                { value: 'pending' as '' | TicketStatus, label: 'در انتظار پاسخ' },
                { value: 'answered' as '' | TicketStatus, label: 'پاسخ داده‌شده' },
                { value: 'closed' as '' | TicketStatus, label: 'بسته‌شده' },
              ]}
              value={status}
              onChange={(value) => setStatus(value)}
            />
            <button
              type="button"
              onClick={() => setOnlyMine((value) => !value)}
              aria-pressed={onlyMine}
              className="ops-button"
              data-tone={onlyMine ? 'primary' : 'default'}
            >
              <Icon name="user" size={14} />
              فقط ارجاع‌شده به من
            </button>
          </div>

          {ticketsError && (
            <div className="ops-error" role="alert">
              <span>{ticketsError}</span>
              <PanelButton onClick={() => void loadTickets()}>تلاش دوباره</PanelButton>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: threadVisible && selectedId ? 'minmax(260px, 320px) 1fr' : '1fr', gap: 14, alignItems: 'start' }} className="support-inbox-grid">
            {/* فهرست تیکت‌ها */}
            <section className="ops-data-surface" style={{ overflow: 'hidden' }}>
              <div className="ops-data-head">
                <div>
                  <strong>تیکت‌ها</strong>
                  <span style={{ display: 'block', marginTop: 2 }}>{ticketsLoading ? 'در حال دریافت…' : `${toFaDigits(ticketsTotal)} گفتگو`}</span>
                </div>
              </div>
              {ticketsLoading && tickets.length === 0 ? (
                <div style={{ padding: 20, display: 'grid', gap: 10 }}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="adm-skeleton" style={{ height: 66, borderRadius: 14 }} />
                  ))}
                </div>
              ) : tickets.length === 0 ? (
                <PanelEmpty icon="message" title="تیکتی در این وضعیت وجود ندارد" description="با باز شدن اولین گفتگو، همین‌جا ظاهر می‌شود." />
              ) : (
                <div style={{ maxHeight: 560, overflowY: 'auto' }}>
                  {tickets.map((row) => {
                    const active = row.id === selectedId;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => void openThread(row.id)}
                        className="ops-button"
                        aria-current={active ? 'true' : undefined}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'start',
                          padding: '12px 14px',
                          border: 0,
                          borderBottom: '1px solid var(--sand-100, #ede8db)',
                          borderRadius: 0,
                          background: active ? 'var(--olive-50, #f2f5ea)' : 'transparent',
                          boxShadow: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: 'var(--ink)' }}>{row.subject}</strong>
                          {row.unread_staff > 0 && (
                            <span className="adm-badge" data-tone="rose">{toFaDigits(row.unread_staff)}</span>
                          )}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                          <span style={{ fontSize: 11, color: 'var(--ink-2s)' }}>
                            {row.user?.name || 'کاربر'} · #{toFaDigits(row.id)}
                          </span>
                          <span style={{ flex: 1 }} />
                          {statusChip(row.status)}
                          <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{shortTime(row.last_message_at)}</span>
                        </span>
                        {row.assignee?.name ? (
                          <span style={{ display: 'block', marginTop: 5, fontSize: 10.5, color: 'var(--ink-3)' }}>
                            کارشناس: {row.assignee.name}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* گفتگوی باز */}
            {threadVisible && selectedId ? (
              <section className="ops-data-surface" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 420 }}>
                <div className="ops-data-head" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="ops-button"
                    aria-label="بازگشت به فهرست"
                    onClick={() => { setThreadVisible(false); setSelectedId(null); }}
                    style={{ display: 'inline-grid', placeItems: 'center', width: 34, height: 34, padding: 0 }}
                  >
                    <Icon name="arrowL" size={16} />
                  </button>
                  <span className="adm-stat-icon" style={{ width: 38, height: 38, borderRadius: 12 }}>
                    <Icon name="user" size={17} />
                  </span>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <strong style={{ display: 'block', fontSize: 13 }}>{selectedTicket?.subject || 'گفتگو'}</strong>
                    <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--ink-3)' }}>
                      {selectedTicket?.user?.name || 'کاربر'}
                      {selectedTicket?.user?.mobile ? ` · ${toFaDigits(selectedTicket.user.mobile)}` : ''}
                      {selectedTicket?.user?.role ? ` · ${selectedTicket.user.role === 'teacher' ? 'استاد' : selectedTicket.user.role === 'admin' ? 'مدیر' : 'قرآن‌آموز'}` : ''}
                    </span>
                  </div>
                  {selectedTicket && statusChip(selectedTicket.status)}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <select
                      aria-label="ارجاع به کارشناس"
                      value={selectedTicket?.assignee?.id ? String(selectedTicket.assignee.id) : ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (!selectedId) return;
                        if (value === '') void assignTicket(selectedId, 0);
                        else void assignTicket(selectedId, Number(value));
                      }}
                      style={{ minWidth: 150, minHeight: 34, fontSize: 11.5, padding: '6px 10px', border: '1px solid var(--sand-200)', borderRadius: 12, background: '#fff', fontFamily: 'inherit' }}
                    >
                      <option value="">ارجاع به کارشناس…</option>
                      {agentsForAssign.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name || agent.mobile}
                        </option>
                      ))}
                    </select>
                    {selectedTicket?.status === 'closed' ? (
                      <PanelButton tone="default" icon="refresh" onClick={() => void changeTicketStatus(selectedId, 'open')}>
                        بازگشایی
                      </PanelButton>
                    ) : (
                      <PanelButton tone="danger" icon="x" onClick={() => void changeTicketStatus(selectedId, 'closed')}>
                        بستن تیکت
                      </PanelButton>
                    )}
                  </div>
                </div>

                {threadError && (
                  <div className="ops-error" role="alert" style={{ margin: '10px 14px 0' }}>
                    <span>{threadError}</span>
                  </div>
                )}

                {/* پیام‌ها */}
                <div
                  ref={threadRef}
                  aria-live="polite"
                  aria-label="پیام‌های گفتگو"
                  style={{ flex: 1, maxHeight: 470, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 9, padding: '14px 14px 8px' }}
                >
                  {threadLoading ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="adm-skeleton" style={{ height: 44, borderRadius: 14 }} />
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <PanelEmpty icon="message" title="پیامی رد و بدل نشده است" description="اولین پاسخ را بنویسید یا پیام صوتی/تصویری بفرستید." />
                  ) : (
                    messages.map((message) => {
                      const mine = message.sender_side === 'staff';
                      return (
                        <div key={message.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                          <div style={{ maxWidth: '86%', display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {message.kind === 'image' && message.attachment_url ? (
                              <a href={message.attachment_url} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--sand-150)' }}>
                                
                                <img src={message.attachment_url} alt="تصویر ارسالی در گفتگو" style={{ display: 'block', maxWidth: '100%', maxHeight: 320, objectFit: 'cover' }} />
                              </a>
                            ) : null}
                            {message.kind === 'audio' && message.attachment_url ? (
                              <StaffAudioBubble url={message.attachment_url} durationMs={message.duration_ms ?? 0} mine={mine} />
                            ) : null}
                            {message.kind === 'text' && message.body ? (
                              <div
                                style={{
                                  padding: '9px 13px',
                                  borderRadius: 16,
                                  borderEndEndRadius: mine ? 16 : 5,
                                  borderEndStartRadius: mine ? 5 : 16,
                                  fontSize: 12.6,
                                  lineHeight: 1.9,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  color: mine ? '#fffaf0' : 'var(--ink)',
                                  background: mine ? 'var(--olive-600, #5e6e43)' : 'var(--olive-50, #f2f5ea)',
                                  border: mine ? 'none' : '1px solid var(--olive-100, #e8ecdb)',
                                }}
                              >
                                {message.body}
                              </div>
                            ) : null}
                            <span style={{ fontSize: 9.5, color: 'var(--ink-3)', textAlign: mine ? 'end' : 'start', paddingInline: 6 }}>
                              {mine ? `پشتیبانی · ${message.sender_name}` : `${message.sender_name || 'کاربر'}`} · {shortTime(message.created_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* پیش‌نمایش پیوست‌ها */}
                {voicePreview ? (
                  <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10, margin: '6px 14px 0', padding: '8px 12px', border: '1px solid var(--olive-200, #d6dcc4)', borderRadius: 14, background: 'var(--olive-50, #f2f5ea)' }}>
                    <StaffAudioBubble url={voicePreview.url} durationMs={voicePreview.ms} mine />
                    <PanelButton tone="primary" disabled={sendingAttachment} onClick={() => void sendVoice()}>
                      {sendingAttachment ? '…' : 'ارسال'}
                    </PanelButton>
                    <PanelButton
                      tone="danger"
                      icon="trash"
                      aria-label="لغو پیام صوتی"
                      disabled={sendingAttachment}
                      onClick={() => { URL.revokeObjectURL(voicePreview.url); setVoicePreview(null); }}
                    >
                      لغو
                    </PanelButton>
                  </div>
                ) : null}

                {imagePreview ? (
                  <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10, margin: '6px 14px 0', padding: 8, border: '1px solid var(--olive-200, #d6dcc4)', borderRadius: 14, background: 'var(--olive-50, #f2f5ea)' }}>
                    
                    <img src={imagePreview.url} alt="پیش‌نمایش تصویر" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--olive-100, #e8ecdb)' }} />
                    <PanelButton tone="primary" style={{ flex: 1 }} disabled={sendingAttachment} onClick={() => void sendImage()}>
                      {sendingAttachment ? 'در حال ارسال…' : 'ارسال تصویر'}
                    </PanelButton>
                    <PanelButton
                      tone="danger"
                      icon="trash"
                      aria-label="لغو تصویر"
                      disabled={sendingAttachment}
                      onClick={() => { URL.revokeObjectURL(imagePreview.url); setImagePreview(null); }}
                    />
                  </div>
                ) : null}

                {/* نوار ضبط */}
                {recording ? (
                  <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderTop: '1px solid var(--sand-100)' }}>
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--rose, #c2554f)', display: 'inline-block' }} />
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 800, color: 'var(--rose, #c2554f)' }}>
                      در حال ضبط… {formatDuration(recordSeconds * 1000)}
                    </span>
                    <PanelButton onClick={() => stopRecording(false)}>لغو</PanelButton>
                    <PanelButton tone="primary" onClick={() => stopRecording(true)}>اتمام</PanelButton>
                  </div>
                ) : (
                  <form
                    onSubmit={(event) => { event.preventDefault(); void sendReply(); }}
                    style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', borderTop: '1px solid var(--sand-100)' }}
                  >
                    <button
                      type="button"
                      onClick={() => startRecording()}
                      aria-label="ضبط پیام صوتی"
                      disabled={Boolean(voicePreview) || Boolean(imagePreview) || selectedTicket?.status === 'closed'}
                      className="ops-button"
                      style={{ width: 40, height: 40, padding: 0, display: 'inline-grid', placeItems: 'center' }}
                    >
                      <Icon name="mic" size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="ارسال تصویر"
                      disabled={Boolean(voicePreview) || Boolean(imagePreview) || selectedTicket?.status === 'closed'}
                      className="ops-button"
                      style={{ width: 40, height: 40, padding: 0, display: 'inline-grid', placeItems: 'center' }}
                    >
                      <Icon name="camera" size={18} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      aria-hidden="true"
                      tabIndex={-1}
                      style={{ display: 'none' }}
                      onChange={(event) => void handleImageChosen(event)}
                    />
                    <input
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder={selectedTicket?.status === 'closed' ? 'این گفتگو بسته شده است' : 'پاسخ خود را بنویسید…'}
                      aria-label="متن پاسخ"
                      maxLength={4000}
                      disabled={selectedTicket?.status === 'closed' || Boolean(voicePreview) || Boolean(imagePreview)}
                      style={{
                        flex: 1, minWidth: 0, minHeight: 42, padding: '9px 12px', border: '1px solid var(--sand-200)',
                        borderRadius: 12, background: '#fff', fontFamily: 'inherit', fontSize: 12.5,
                      }}
                    />
                    <PanelButton
                      type="submit"
                      tone="primary"
                      icon="arrowL"
                      aria-label="ارسال پاسخ"
                      disabled={replyBusy || !reply.trim() || selectedTicket?.status === 'closed'}
                      style={{ minWidth: 44, minHeight: 42, display: 'inline-grid', placeItems: 'center', padding: 0 }}
                    />
                  </form>
                )}
                {selectedTicket?.status === 'closed' ? (
                  <p style={{ margin: 0, padding: '8px 14px 12px', fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textAlign: 'center', background: 'var(--sand-50)' }}>
                    این گفتگو بسته شده؛ برای پاسخ‌گویی ابتدا آن را بازگشایی کنید.
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        </>
      )}

      {/* ---------- کارشناسان پشتیبانی ---------- */}
      {view === 'agents' && (
        <>
          <section className="ops-data-surface" style={{ marginBottom: 14 }}>
            <div className="ops-data-head">
              <div>
                <strong>منصوب‌کردن کارشناس پشتیبانی</strong>
                <span style={{ display: 'block', marginTop: 2 }}>شمارهٔ موبایل هر کاربر ثبت‌نام‌شده را وارد کنید تا به صندوق پشتیبانی دسترسی پیدا کند.</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 14px 16px' }}>
              <input
                value={agentMobile}
                onChange={(event) => setAgentMobile(event.target.value)}
                placeholder="مثلاً ۰۹۱۲۳۴۵۶۷۸۹"
                aria-label="شمارهٔ موبایل کارشناس"
                dir="ltr"
                maxLength={15}
                style={{
                  flex: '1 1 220px', minHeight: 44, padding: '9px 12px', border: '1px solid var(--sand-200)',
                  borderRadius: 12, background: '#fff', fontFamily: 'inherit', fontSize: 12.5, textAlign: 'left',
                }}
              />
              <PanelButton tone="primary" icon="plus" disabled={agentsBusy || !agentMobile.trim()} onClick={() => void appointAgent()}>
                {agentsBusy ? 'در حال ثبت…' : 'منصوب کن'}
              </PanelButton>
            </div>
            {agentsError && (
              <div className="ops-error" role="alert" style={{ margin: '0 14px 14px' }}>
                <span>{agentsError}</span>
              </div>
            )}
          </section>

          <section className="ops-data-surface">
            <div className="ops-data-head">
              <div>
                <strong>کارشناسان فعلی</strong>
                <span style={{ display: 'block', marginTop: 2 }}>{agentsLoading ? 'در حال دریافت…' : `${toFaDigits(agents.length)} کارشناس فعال`}</span>
              </div>
            </div>
            {agentsLoading ? (
              <div style={{ padding: 20, display: 'grid', gap: 10 }}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="adm-skeleton" style={{ height: 60, borderRadius: 14 }} />
                ))}
              </div>
            ) : agents.length === 0 ? (
              <PanelEmpty icon="users" title="هنوز کارشناسی منصوب نشده است" description="با موبایل کاربران مورد اعتماد، کارشناس پشتیبانی بسازید." />
            ) : (
              agents.map((agent) => (
                <article className="ops-row" key={agent.id}>
                  <Avatar imageUrl={agent.avatar_url || undefined} size={40} />
                  <div className="ops-row-main">
                    <div className="ops-row-title">
                      <strong>{agent.name || 'بدون نام'}</strong>
                      <span className="adm-badge" data-tone={agent.role === 'admin' ? 'green' : 'gold'}>
                        {agent.role === 'admin' ? 'مدیر سامانه' : 'کارشناس پشتیبانی'}
                      </span>
                    </div>
                    <div className="ops-row-sub">
                      <span dir="ltr">{toFaDigits(agent.mobile)}</span>
                    </div>
                  </div>
                  <div className="ops-row-actions">
                    <PanelButton tone="danger" icon="trash" disabled={agentsBusy} onClick={() => void revokeAgent(agent)}>
                      لغو دسترسی
                    </PanelButton>
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      )}

      {/* ---------- پیام‌های فرم تماس (میراث) ---------- */}
      {view === 'contact' && (
        <>
          <div className="adm-toolbar">
            <FilterTabs
              ariaLabel="وضعیت پیام‌های فرم تماس"
              items={[
                { value: 'new' as 'new' | 'resolved', label: 'جدید' },
                { value: 'resolved' as 'new' | 'resolved', label: 'رسیدگی‌شده' },
              ]}
              value={legacyStatus}
              onChange={(value) => { setLegacyStatus(value); setLegacyPage(0); }}
            />
          </div>

          {legacyError && (
            <div className="ops-error" role="alert">
              <span>{legacyError}</span>
              <PanelButton onClick={() => void loadLegacy()}>تلاش دوباره</PanelButton>
            </div>
          )}

          <section className="ops-data-surface">
            <div className="ops-data-head">
              <div>
                <strong>{legacyStatus === 'new' ? 'پیام‌های جدید فرم تماس' : 'بایگانی فرم تماس'}</strong>
                <span style={{ display: 'block', marginTop: 2 }}>{legacyLoading ? 'در حال دریافت…' : `${toFaDigits(legacyTotal)} پیام`}</span>
              </div>
            </div>
            {legacyLoading ? (
              <div style={{ padding: 20, display: 'grid', gap: 10 }}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="adm-skeleton" style={{ height: 74, borderRadius: 14 }} />
                ))}
              </div>
            ) : legacyMessages.length === 0 ? (
              <PanelEmpty icon="message" title="پیامی در این وضعیت وجود ندارد" />
            ) : (
              legacyMessages.map((item) => {
                const busy = busyLegacyId === item.id;
                return (
                  <article className="ops-row" key={item.id} style={{ alignItems: 'flex-start', opacity: busy ? 0.55 : 1 }}>
                    <span className="adm-stat-icon" style={{ width: 42, height: 42, borderRadius: 12 }}>
                      <Icon name="message" size={19} />
                    </span>
                    <div className="ops-row-main">
                      <div className="ops-row-title">
                        <strong>{item.name}</strong>
                        <span className="adm-badge" data-tone={item.status === 'new' ? 'gold' : 'green'}>
                          {item.status === 'new' ? 'جدید' : 'رسیدگی‌شده'}
                        </span>
                      </div>
                      <div className="ops-row-sub">
                        <span dir="ltr">{toFaDigits(item.contact)}</span>
                        <span>· {formatDate(item.created_at)}</span>
                      </div>
                      <p style={{ margin: '9px 0 0', padding: '10px 12px', borderRadius: 11, color: 'var(--ink-2s)', background: 'var(--sand-50)', fontSize: 11.5, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{item.message}</p>
                    </div>
                    {item.status === 'new' && (
                      <div className="ops-row-actions">
                        <PanelButton tone="success" icon="check" disabled={busy} onClick={() => void resolveLegacy(item)}>
                          {busy ? 'در حال ثبت…' : 'ثبت رسیدگی'}
                        </PanelButton>
                      </div>
                    )}
                  </article>
                );
              })
            )}

            {!legacyLoading && legacyTotal > PAGE_SIZE && (
              <div style={{ padding: '4px 14px 16px' }}>
                <TablePagination page={legacyPage} pageSize={PAGE_SIZE} total={legacyTotal} onPage={setLegacyPage} />
              </div>
            )}
          </section>
        </>
      )}

      <style>{`
        @media (max-width: 880px) {
          .support-inbox-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
