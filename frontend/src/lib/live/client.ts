'use client';

// ─────────────────────────────────────────────────────────────────────────────
// سیگنالینگ اختصاصی وُدّا — نسخهٔ بازنویسی‌شدهٔ کامل
//
// دو محیط اجرا دارد و هر دو را مستقیم و بدون فرض پوشش می‌دهد:
//   ۱) وب (vodda.ir): مسیرهای نسبی BFF با کوکی HttpOnly
//   ۲) اپ Capacitor: چون مسیرهای نسبی BFF در WebView اپ وجود ندارند،
//      caller یک transport اختصاصی (platform.request اپ) تزریق می‌کند تا
//      درخواست‌ها با توکن Bearer مستقیم به api.vodda.ir بروند.
//
// این همان علت اصلی «کار نکردن» نسخهٔ پیشین بود: در اپ، fetch نسبیِ
// /api/backend/live/* به https://localhost می‌رفت و سیگنالی رد و بدل نمی‌شد.
// ─────────────────────────────────────────────────────────────────────────────

export type LiveRole = 'learner' | 'teacher' | 'admin';

export type LiveEvent = {
  seq: number;
  from: number;
  role: LiveRole | string;
  type: string;
  payload?: unknown;
  at: number;
};

export type LiveStatus = 'connecting' | 'live' | 'polling' | 'closed' | 'error';

/** transport اختصاصی برای اپ: بدنهٔ سرور { data: ... } را کامل برمی‌گرداند. */
export type LiveTransport = (path: string, init?: { method?: string; body?: unknown }) => Promise<unknown>;

export type LiveClientOptions = {
  sessionId: number;
  onEvent: (event: LiveEvent) => void;
  onStatus?: (status: LiveStatus) => void;
  /** در اپ اندروید تزریق می‌شود؛ در وب BFF پیش‌فرض با کوکی استفاده می‌شود. */
  transport?: LiveTransport;
  /** مبنا وِب‌سوکت — پیش‌فرض wss://api.vodda.ir */
  wsBase?: string;
};

const WS_BASE = process.env.NEXT_PUBLIC_LIVE_WS_BASE || 'wss://api.vodda.ir';
const POLL_INTERVAL_MS = 1000;

type TicketResult = { ticket: string };

function extractData<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in (body as Record<string, unknown>)) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export class LiveClient {
  readonly sessionId: number;
  private readonly onEvent: (event: LiveEvent) => void;
  private readonly onStatus?: (status: LiveStatus) => void;
  private readonly transport: LiveTransport;
  private readonly wsBase: string;

  private ws: WebSocket | null = null;
  private wsHealthy = false;
  private wsDataBlocked = false;
  private closedByUser = false;
  private cursor = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollInFlight = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  /** آخرین تیکت معتبر — برای اتصال دوبارهٔ وب‌سوکت بدون درخواست جدید. */
  private lastTicket = '';

  constructor(options: LiveClientOptions) {
    this.sessionId = options.sessionId;
    this.onEvent = options.onEvent;
    this.onStatus = options.onStatus;
    this.transport = options.transport ?? this.bffTransport;
    this.wsBase = options.wsBase ?? WS_BASE;
  }

  /** transport پیش‌فرض وب — مسیرهای نسبی BFF با کوکی سشن. */
  private bffTransport = async (path: string, init: { method?: string; body?: unknown } = {}) => {
    const response = await fetch(`/api/backend${path}`, {
      method: init.method ?? 'GET',
      headers: init.body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: 'include',
    });
    const data = (await response.json().catch(() => ({}))) as { data?: unknown; error?: string };
    if (!response.ok) {
      throw new Error(data.error || `request failed (${response.status})`);
    }
    return data;
  };

  private setStatus(status: LiveStatus) {
    this.onStatus?.(status);
  }

  private async fetchTicket(): Promise<string> {
    try {
      const body = await this.transport('/live/ticket', { method: 'POST', body: { session: this.sessionId } });
      const data = extractData<TicketResult>(body);
      if (data?.ticket) {
        this.lastTicket = data.ticket;
        return data.ticket;
      }
    } catch {
      /* تیکت فقط برای مسیر وب‌سوکت لازم است */
    }
    return '';
  }

  /** اتصال: polling فوری فعال می‌شود و وب‌سوکت موازی تلاش می‌شود؛
   *  هر وقت سوکت قابی زنده داد، polling قطع می‌شود. این راه، شروع کلاس
   *  را مستقل از پایداری وب‌سوکتِ پشت CDN فوری و بی‌تأخیر می‌کند. */
  async connect(): Promise<void> {
    if (this.disposed) return;
    this.setStatus('connecting');
    this.closedByUser = false;

    // کانال پشتیبان بدون تأخیر فعال می‌شود؛ سیگنالینگ از همان لحظه جریان دارد.
    this.startPolling();

    const ticket = await this.fetchTicket();
    if (!ticket) return; // polling تنها مسیر باقی می‌ماند
    await this.openSocket(ticket);
  }

  private openSocket(ticket: string): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      try {
        const url = `${this.wsBase}/api/v1/live/ws?session=${this.sessionId}&ticket=${encodeURIComponent(ticket)}&after=${this.cursor}`;
        const socket = new WebSocket(url);
        this.ws = socket;

        // برخی CDN ها هندشیک را کامل می‌کنند ولی قاب داده را نمی‌رسانند.
        // هاب یک قاب system/join فوراً می‌فرستد؛ اگر در بودجهٔ کوتاه قابی نرسید
        // سوکت را data-dead اعلام و در پس‌زمینهٔ polling بازتلاش می‌کنیم.
        let gotFrame = false;
        const failover = () => {
          if (settled) return;
          settled = true;
          this.wsHealthy = false;
          if (!gotFrame) this.wsDataBlocked = true;
          try { socket.close(); } catch { /* ignore */ }
          if (this.ws === socket) this.ws = null;
          resolve();
        };
        const handshakeTimer = setTimeout(failover, 4500);
        const dataTimer = setTimeout(failover, 4500);

        socket.onopen = () => {
          clearTimeout(handshakeTimer);
          this.setStatus('live');
        };
        socket.onmessage = (raw) => {
          gotFrame = true;
          clearTimeout(dataTimer);
          if (!settled) {
            settled = true;
            this.wsHealthy = true;
            this.wsDataBlocked = false;
            this.stopPolling();
            resolve();
          }
          try {
            const event = JSON.parse(String(raw.data)) as LiveEvent;
            // سرور پیش از join خودمان، رخدادهای قبلی را بازپخش می‌کند و کانال
            // زنده هم ممکن است هم‌پوشان باشد — seq تکراری هرگز دوباره ارسال نمی‌شود.
            if (event.seq <= this.cursor) return;
            this.track(event);
            this.onEvent(event);
          } catch { /* ignore malformed frames */ }
        };
        socket.onclose = () => {
          clearTimeout(handshakeTimer);
          clearTimeout(dataTimer);
          if (this.disposed || this.closedByUser) return;
          if (this.wsHealthy) {
            this.wsHealthy = false;
            this.ws = null;
            this.setStatus('connecting');
            this.scheduleReconnect();
          } else {
            failover();
          }
        };
        socket.onerror = () => { /* handled by onclose / failover */ };
      } catch {
        this.startPolling();
        resolve();
      }
    });
  }

  private scheduleReconnect() {
    if (this.disposed || this.closedByUser || this.reconnectTimer) return;
    // سوکت data-blocked آهسته تلاش می‌شود تا polling مسیر اصلی بماند.
    const delay = this.wsDataBlocked ? 30_000 : 2_500;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.disposed || this.closedByUser || this.wsHealthy) return;
      const ticket = this.lastTicket || (await this.fetchTicket());
      if (!ticket) return;
      await this.openSocket(ticket);
    }, delay);
  }

  private track(event: LiveEvent) {
    if (event.seq > this.cursor) this.cursor = event.seq;
  }

  private startPolling() {
    if (this.disposed || this.pollTimer) return;
    this.setStatus('polling');
    const loop = async () => {
      if (this.disposed || this.closedByUser) return;
      if (!this.pollInFlight) {
        this.pollInFlight = true;
        try {
          const body = await this.transport(`/live/events?session=${this.sessionId}&after=${this.cursor}`);
          const events = extractData<LiveEvent[]>(body) || [];
          for (const event of events) {
            this.track(event);
            this.onEvent(event);
          }
        } catch (error) {
          // خطای دسترسی واقعی — توقف؛ خطای شبکه گذرا است و دور بعد تلاش می‌شود.
          if (error instanceof Error && /40[13]/.test(error.message)) {
            this.setStatus('error');
            this.pollInFlight = false;
            return;
          }
        }
        this.pollInFlight = false;
      }
      this.pollTimer = setTimeout(loop, POLL_INTERVAL_MS);
    };
    void loop();
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /** ارسال یک قاب سیگنالینگ (وب‌سوکت سالم؛ وگرنه HTTP fallback). */
  send(type: string, payload: unknown): void {
    const frame = JSON.stringify({ type, payload });
    if (this.ws && this.wsHealthy && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(frame);
      return;
    }
    void this.transport('/live/signal', { method: 'POST', body: { session: this.sessionId, type, payload } })
      .catch(() => { /* on transient failure the peer ICE-retries; drop */ });
  }

  close(): void {
    this.disposed = true;
    this.closedByUser = true;
    this.stopPolling();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
    this.setStatus('closed');
  }
}
