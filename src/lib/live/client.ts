'use client';

// Signaling client for the Vodda live classroom.
// Prefers a WebSocket (wss://api.vodda.ir) and automatically falls back to
// HTTP long-polling through the same-origin BFF when sockets are unavailable
// (e.g. restrictive CDN or corporate proxies).

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

type LiveOptions = {
  sessionId: number;
  onEvent: (event: LiveEvent) => void;
  onStatus?: (status: LiveStatus) => void;
};

const WS_BASE = process.env.NEXT_PUBLIC_LIVE_WS_BASE || 'wss://api.vodda.ir';
const POLL_INTERVAL_MS = 1200;
const TICKET_URL = '/api/backend/live/ticket';
const SIGNAL_URL = '/api/backend/live/signal';
const EVENTS_URL = '/api/backend/live/events';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const data = (await response.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!response.ok) {
    throw new Error(data.error || `request failed (${response.status})`);
  }
  return data.data as T;
}

export class LiveClient {
  readonly sessionId: number;
  private readonly onEvent: (event: LiveEvent) => void;
  private readonly onStatus?: (status: LiveStatus) => void;

  private ws: WebSocket | null = null;
  private wsHealthy = false;
  private wsDataBlocked = false;
  private closedByUser = false;
  private cursor = 0;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollInFlight = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(options: LiveOptions) {
    this.sessionId = options.sessionId;
    this.onEvent = options.onEvent;
    this.onStatus = options.onStatus;
  }

  private setStatus(status: LiveStatus) {
    this.onStatus?.(status);
  }

  /** Connects via WebSocket, falling back to long-polling automatically. */
  async connect(): Promise<void> {
    if (this.disposed) return;
    this.setStatus('connecting');
    this.closedByUser = false;
    let ticket = '';
    try {
      const data = await postJson<{ ticket: string }>(TICKET_URL, { session: this.sessionId });
      ticket = data.ticket;
    } catch {
      // Ticket is only needed for the socket path; polling uses the session cookie.
      this.startPolling();
      return;
    }
    await this.openSocket(ticket);
  }

  private openSocket(ticket: string): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      try {
        const socket = new WebSocket(`${WS_BASE}/api/v1/live/ws?session=${this.sessionId}&ticket=${encodeURIComponent(ticket)}`);
        this.ws = socket;

        // Some CDNs complete the WS handshake but silently drop data frames.
        // The hub echoes a system join frame immediately, so if no frame
        // arrives within this budget we treat the socket as data-dead and
        // switch to long-polling (retrying the socket later).
        let gotFrame = false;
        const failover = () => {
          if (settled) return;
          settled = true;
          this.wsHealthy = false;
          if (!gotFrame) this.wsDataBlocked = true;
          try { socket.close(); } catch { /* ignore */ }
          if (this.ws === socket) this.ws = null;
          this.startPolling();
          resolve();
        };
        const handshakeTimer = setTimeout(failover, 6000);
        const dataTimer = setTimeout(failover, 5000);

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
    // Data-blocked sockets get a slow retry so polling stays the primary path.
    const delay = this.wsDataBlocked ? 45_000 : 2_500;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.disposed || this.closedByUser || this.wsHealthy) return;
      try {
        const data = await postJson<{ ticket: string }>(TICKET_URL, { session: this.sessionId });
        await this.openSocket(data.ticket);
      } catch {
        this.startPolling();
      }
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
          const response = await fetch(`${EVENTS_URL}?session=${this.sessionId}&after=${this.cursor}`, {
            credentials: 'include',
            cache: 'no-store',
          });
          if (response.ok) {
            const data = (await response.json()) as { data?: LiveEvent[] };
            for (const event of data.data || []) {
              this.track(event);
              this.onEvent(event);
            }
          } else if (response.status === 401 || response.status === 403) {
            this.setStatus('error');
            this.pollInFlight = false;
            return;
          }
        } catch { /* transient network error: retry next tick */ }
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

  /** Sends one signaling frame (WebSocket when healthy, HTTP otherwise). */
  send(type: string, payload: unknown): void {
    const frame = JSON.stringify({ type, payload });
    if (this.ws && this.wsHealthy && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(frame);
      return;
    }
    void postJson(SIGNAL_URL, { session: this.sessionId, type, payload }).catch(() => { /* drop on failure */ });
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
