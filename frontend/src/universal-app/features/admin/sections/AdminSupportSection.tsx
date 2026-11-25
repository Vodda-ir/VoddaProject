"use client";

/* صندوق پشتیبانی زندهٔ وُدّا درون‌اپی — هم‌ارز صفحهٔ ادمین/پشتیبانی پنل وب:
 * سه زبانهٔ تیکت‌ها، کارشناسان پشتیبانی و پیام‌های فرم تماس.
 * تیکت‌ها با استعلام دوره‌ای، گفت‌وگوی زنده، پیام متنی/تصویری/صوتی،
 * واگذاری به کارشناس و تغییر وضعیت. */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlatform } from "../../../platform/context";
import { Icon, Sheet, colors, gradients, typography } from "../../../ui";
import { useAppearance } from "../../../ui/appearance";
import { messageOf } from "../../../ui/errorMessage";
import { showToast } from "../../../ui/toast";
import {
  addSupportAgent,
  assignStaffTicket,
  fetchContactMessages,
  fetchStaffThread,
  fetchStaffTickets,
  fetchSupportAgents,
  removeSupportAgent,
  resolveContactMessage,
  sendStaffMessage,
  setStaffTicketStatus,
  uploadStaffAttachment,
  type AdminContactMessage,
  type AdminSupportAgent,
  type AdminTicketMessage,
  type AdminTicketRow,
} from "../api";
import {
  AdminBadge,
  AdminChip,
  AdminEmpty,
  AdminError,
  AdminPanel,
  AdminSectionHead,
  faDateTime,
  faNumber,
} from "../AdminUI";

const PAGE_SIZE = 30;
const POLL_LIST_MS = 8000;
const POLL_THREAD_MS = 3000;

type SupportTab = "tickets" | "agents" | "contact";

const TICKET_FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "همه" },
  { value: "open", label: "در انتظار بررسی" },
  { value: "pending", label: "در انتظار پاسخ" },
  { value: "answered", label: "پاسخ داده‌شده" },
  { value: "closed", label: "بسته‌شده" },
];

const STATUS_META: Record<string, { label: string; tone: "gold" | "clay" | "green" | "muted" }> = {
  open: { label: "در انتظار بررسی", tone: "gold" },
  pending: { label: "در انتظار پاسخ", tone: "clay" },
  answered: { label: "پاسخ داده‌شده", tone: "green" },
  closed: { label: "بسته‌شده", tone: "muted" },
};

const STATUS_FLOW: Array<{ value: string; label: string }> = [
  { value: "pending", label: "در انتظار پاسخ" },
  { value: "answered", label: "پاسخ داده‌شده" },
  { value: "closed", label: "بستن تیکت" },
];

export function AdminSupportSection() {
  const runtime = usePlatform();
  const { L } = useAppearance();
  const [tab, setTab] = useState<SupportTab>("tickets");

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <AdminChip active={tab === "tickets"} label={L("تیکت‌ها")} onClick={() => setTab("tickets")} />
        <AdminChip active={tab === "agents"} label={L("کارشناسان پشتیبانی")} onClick={() => setTab("agents")} />
        <AdminChip active={tab === "contact"} label={L("پیام‌های فرم تماس")} onClick={() => setTab("contact")} />
      </div>
      {tab === "tickets" ? <StaffTickets /> : null}
      {tab === "agents" ? <AgentsTab /> : null}
      {tab === "contact" ? <ContactTab /> : null}
    </div>
  );

  /* ── زبانهٔ کارشناسان ── */
  function AgentsTab() {
    const [agents, setAgents] = useState<AdminSupportAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mobile, setMobile] = useState("");
    const [name, setName] = useState("");
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        setAgents(await fetchSupportAgents(runtime));
      } catch (cause) {
        setError(messageOf(cause, L("فهرست کارشناسان دریافت نشد.")));
      } finally {
        setLoading(false);
      }
    }, [runtime, L]);

    useEffect(() => {
      void load();
    }, [load]);

    async function add() {
      if (busy || !mobile.trim()) return;
      setBusy(true);
      setError(null);
      try {
        await addSupportAgent(runtime, { mobile, name });
        setMobile("");
        setName("");
        showToast(L("کارشناس پشتیبانی منصوب شد"), "success");
        await load();
      } catch (cause) {
        setError(messageOf(cause, L("انتصاب کارشناس انجام نشد.")));
      } finally {
        setBusy(false);
      }
    }

    async function remove(agent: AdminSupportAgent) {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        await removeSupportAgent(runtime, agent.id);
        setAgents((previous) => previous.filter((item) => item.id !== agent.id));
        showToast(L("کارشناس حذف شد"), "success");
      } catch (cause) {
        setError(messageOf(cause, L("حذف کارشناس انجام نشد.")));
      } finally {
        setBusy(false);
      }
    }

    return (
      <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
        <AdminPanel>
          <AdminSectionHead title={L("کارشناسان پشتیبانی")} description={L("کارشناسان منصوب به پاسخ‌دهی تیکت‌ها دسترسی دارند؛ مدیر همیشه دسترسی دارد.")} />
          {error ? <AdminError message={error} onRetry={() => void load()} /> : null}
          {loading ? (
            <span className="vodda-skeleton" style={{ height: 90, borderRadius: 14, display: "block" }} />
          ) : agents.length === 0 ? (
            <AdminEmpty icon="headphones" title={L("کارشناسی منصوب نشده است")} description={L("با شمارهٔ موبایل، همکاران را به پشتیبانی اضافه کنید.")} />
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {agents.map((agent) => (
                <div key={agent.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 13, background: colors.surfaceSoft, border: `1px solid ${colors.sand150}` }}>
                  <span aria-hidden="true" style={{ width: 36, height: 36, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", background: gradients.soft, border: `1px solid ${colors.olive100}`, color: colors.olive700 }}>
                    <Icon name="headphones" size={16} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 1 }}>
                    <strong style={{ fontSize: 12.5, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{L(agent.name)}</strong>
                    <span dir="ltr" style={{ fontSize: 10, fontWeight: 700, color: colors.inkMuted, textAlign: "start" }}>{agent.mobile || "—"}</span>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(agent)}
                    aria-label={L("حذف کارشناس")}
                    className="vodda-tappable"
                    style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 11, border: `1px solid rgba(166,81,81,.35)`, background: colors.dangerBackground, color: colors.danger, cursor: busy ? "wait" : "pointer" }}
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </AdminPanel>

        <AdminPanel>
          <AdminSectionHead title={L("منصوب‌کردن کارشناس جدید")} description={L("شمارهٔ موبایل باید در سامانه ثبت‌شده باشد.")} />
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={L("نام کارشناس (اختیاری)")}
            aria-label={L("نام کارشناس")}
            style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 700, outline: "none" }}
          />
          <input
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            inputMode="tel"
            dir="ltr"
            placeholder="09xxxxxxxxx"
            aria-label={L("موبایل کارشناس")}
            style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 700, outline: "none", textAlign: "left" }}
          />
          <button
            type="button"
            disabled={busy || !mobile.trim()}
            onClick={() => void add()}
            className="vodda-tappable"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 12px", borderRadius: 12, border: 0, background: colors.olive600, color: "#fffaf0", fontSize: 12.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busy || !mobile.trim() ? "default" : "pointer", opacity: busy || !mobile.trim() ? 0.6 : 1 }}
          >
            <Icon name="plus" size={15} />
            {busy ? L("در حال ثبت…") : L("منصوب‌کردن کارشناس")}
          </button>
        </AdminPanel>
      </div>
    );
  }

  /* ── زبانهٔ پیام‌های فرم تماس ── */
  function ContactTab() {
    const [rows, setRows] = useState<AdminContactMessage[]>([]);
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    const CONTACT_FILTERS = [
      { value: "", label: L("همه") },
      { value: "new", label: L("جدید") },
      { value: "resolved", label: L("رسیدگی‌شده") },
    ];

    const load = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        setRows(await fetchContactMessages(runtime, status));
      } catch (cause) {
        setError(messageOf(cause, L("پیام‌های تماس دریافت نشد.")));
      } finally {
        setLoading(false);
      }
    }, [runtime, status, L]);

    useEffect(() => {
      void load();
    }, [load]);

    async function resolve(row: AdminContactMessage) {
      if (busyId !== null) return;
      setBusyId(row.id);
      setError(null);
      try {
        await resolveContactMessage(runtime, row.id);
        setRows((previous) => previous.map((item) => (item.id === row.id ? { ...item, status: "resolved" } : item)));
        showToast(L("پیام رسیدگی‌شده علامت خورد"), "success");
      } catch (cause) {
        setError(messageOf(cause, L("ثبت رسیدگی انجام نشد.")));
      } finally {
        setBusyId(null);
      }
    }

    return (
      <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {CONTACT_FILTERS.map((filter) => (
            <AdminChip key={filter.value} active={status === filter.value} label={filter.label} onClick={() => setStatus(filter.value)} />
          ))}
        </div>

        {error ? <AdminError message={error} onRetry={() => void load()} /> : null}

        {loading ? (
          <span className="vodda-skeleton" style={{ height: 90, borderRadius: 14, display: "block" }} />
        ) : rows.length === 0 ? (
          <AdminEmpty icon="message" title={L("پیامی برای نمایش نیست")} />
        ) : (
          <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
            {rows.map((row) => (
              <AdminPanel key={row.id} style={{ padding: 14, gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span aria-hidden="true" style={{ width: 36, height: 36, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", background: gradients.soft, border: `1px solid ${colors.olive100}`, color: colors.olive700 }}>
                    <Icon name="message" size={16} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 1 }}>
                    <strong style={{ fontSize: 12.5, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{L(row.name)}</strong>
                    <span dir="ltr" style={{ fontSize: 10, fontWeight: 700, color: colors.inkMuted, textAlign: "start" }}>{row.contact || "—"}</span>
                  </div>
                  <AdminBadge tone={row.status === "resolved" ? "green" : "gold"}>{row.status === "resolved" ? L("رسیدگی‌شده") : L("جدید")}</AdminBadge>
                </div>
                <p style={{ margin: 0, fontSize: 11.5, fontWeight: 600, color: colors.inkSecondary, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{row.message || "—"}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: colors.inkMuted }}>{faDateTime(row.createdAt)}</span>
                  {row.status !== "resolved" ? (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void resolve(row)}
                      className="vodda-tappable"
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 11, border: 0, background: colors.olive600, color: "#fffaf0", fontSize: 11, fontWeight: 800, fontFamily: typography.fontFamily, cursor: busyId === row.id ? "wait" : "pointer" }}
                    >
                      <Icon name="check" size={13} />
                      {busyId === row.id ? L("در حال ثبت…") : L("رسیدگی شد")}
                    </button>
                  ) : null}
                </div>
              </AdminPanel>
            ))}
          </div>
        )}
      </div>
    );
  }
}

/* ── زبانهٔ تیکت‌ها (گفت‌وگوی زنده) ── */
function StaffTickets() {
  const runtime = usePlatform();
  const { L } = useAppearance();

  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [rows, setRows] = useState<AdminTicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openTicketId, setOpenTicketId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchRows = useCallback(async (targetPage: number, append: boolean) => {
    try {
      const list = await fetchStaffTickets(runtime, {
        status: status || undefined,
        q: debouncedQuery || undefined,
        limit: PAGE_SIZE,
        offset: targetPage * PAGE_SIZE,
      });
      setRows((previous) => (append ? [...previous, ...list.rows] : list.rows));
      setTotal(list.total);
      setPage(targetPage);
      setError(null);
    } catch (cause) {
      setError(messageOf(cause, L("فهرست تیکت‌ها دریافت نشد.")));
    } finally {
      setLoading(false);
    }
  }, [runtime, status, debouncedQuery, L]);

  useEffect(() => {
    setLoading(true);
    void fetchRows(0, false);
  }, [fetchRows]);

  /* استعلام دوره‌ای فهرست — فقط وقتی شیت گفت‌وگو بسته است */
  useEffect(() => {
    if (openTicketId !== null) return;
    const timer = setInterval(() => {
      void fetchRows(0, false);
    }, POLL_LIST_MS);
    return () => clearInterval(timer);
  }, [openTicketId, fetchRows]);

  async function openTicket(ticketId: number) {
    setOpenTicketId(ticketId);
  }

  async function updateStatus(ticketId: number, next: string) {
    try {
      await setStaffTicketStatus(runtime, ticketId, next);
      setRows((previous) => previous.map((item) => (item.id === ticketId ? { ...item, status: next } : item)));
      showToast(L("وضعیت تیکت ثبت شد"), "success");
    } catch (cause) {
      showToast(messageOf(cause, L("ثبت وضعیت انجام نشد.")), "info");
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {TICKET_FILTERS.map((filter) => (
          <AdminChip key={filter.value} active={status === filter.value} label={L(filter.label)} onClick={() => setStatus(filter.value)} />
        ))}
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 12px",
          borderRadius: 13,
          border: `1px solid ${colors.sand200}`,
          background: colors.surface,
          color: colors.inkMuted,
        }}
      >
        <Icon name="search" size={15} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={L("جستجوی موضوع یا نام کاربر…")}
          aria-label={L("جستجوی تیکت")}
          style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 600, outline: "none" }}
        />
      </label>

      {error ? <AdminError message={error} onRetry={() => void fetchRows(0, false)} /> : null}

      {loading && rows.length === 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className="vodda-skeleton" style={{ height: 76, borderRadius: 16, display: "block" }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <AdminEmpty icon="message" title={L("تیکتی در این وضعیت وجود ندارد")} />
      ) : (
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: colors.inkMuted }}>{faNumber(total)} تیکت</span>
          {rows.map((row) => {
            const badge = STATUS_META[row.status] ?? STATUS_META.open;
            return (
              <AdminPanel key={row.id} style={{ padding: 14, gap: 9 }}>
                <button
                  type="button"
                  onClick={() => void openTicket(row.id)}
                  className="vodda-tappable"
                  style={{ display: "grid", gap: 7, minWidth: 0, width: "100%", border: 0, background: "transparent", padding: 0, textAlign: "start", cursor: "pointer", fontFamily: typography.fontFamily }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span aria-hidden="true" style={{ width: 38, height: 38, flexShrink: 0, display: "grid", placeItems: "center", borderRadius: "50%", background: gradients.soft, border: `1px solid ${colors.olive100}`, color: colors.olive700 }}>
                      <Icon name="headphones" size={17} />
                    </span>
                    <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
                      <strong style={{ fontSize: 12.5, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{L(row.subject)}</strong>
                      <span style={{ fontSize: 10, fontWeight: 600, color: colors.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {L(row.userName)}{row.userMobile ? ` · ${row.userMobile}` : ""} · {faDateTime(row.lastMessageAt)}
                      </span>
                    </span>
                    <span style={{ flexShrink: 0, display: "grid", gap: 4, justifyItems: "end" }}>
                      <AdminBadge tone={badge.tone}>{L(badge.label)}</AdminBadge>
                      {row.unreadStaff > 0 ? <AdminBadge tone="rose">{faNumber(row.unreadStaff)} پیام تازه</AdminBadge> : null}
                      {row.assigneeName ? <AdminBadge tone="info">{row.assigneeName}</AdminBadge> : null}
                    </span>
                  </span>
                </button>
                {row.status !== "closed" ? (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {STATUS_FLOW.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => void updateStatus(row.id, option.value)}
                        className="vodda-tappable"
                        style={{ padding: "7px 11px", borderRadius: 999, border: `1px solid ${colors.sand200}`, background: colors.surface, color: colors.inkMuted, fontSize: 10.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: "pointer" }}
                      >
                        {L(option.label)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        void (async () => {
                          try {
                            await assignStaffTicket(runtime, row.id);
                            setRows((previous) => previous.map((item) => (item.id === row.id ? { ...item, assignedTo: null, assigneeName: L("به من واگذار شد") } : item)));
                            showToast(L("تیکت به شما واگذار شد"), "success");
                          } catch (cause) {
                            showToast(messageOf(cause, L("واگذاری تیکت انجام نشد.")), "info");
                          }
                        })()
                      }
                      className="vodda-tappable"
                      style={{ padding: "7px 11px", borderRadius: 999, border: `1px solid ${colors.olive100}`, background: colors.olive50, color: colors.olive700, fontSize: 10.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: "pointer" }}
                    >
                      {L("واگذاری به من")}
                    </button>
                  </div>
                ) : null}
              </AdminPanel>
            );
          })}
          {rows.length < total ? (
            <button
              type="button"
              onClick={() => void fetchRows(page + 1, true)}
              disabled={loading}
              className="vodda-tappable"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "11px 12px", borderRadius: 14, border: `1px dashed ${colors.sand200}`, background: colors.surfaceSoft, color: colors.olive700, fontSize: 12, fontWeight: 800, fontFamily: typography.fontFamily, cursor: loading ? "wait" : "pointer" }}
            >
              <Icon name="refresh" size={14} />
              {loading ? L("در حال دریافت…") : L("نمایش موارد بیشتر")}
            </button>
          ) : null}
        </div>
      )}

      <TicketThreadSheet
        ticketId={openTicketId}
        onClose={() => setOpenTicketId(null)}
        onChanged={() => void fetchRows(0, false)}
      />
    </div>
  );
}

/* ── شیت گفت‌وگوی تیکت ── */
function TicketThreadSheet({ ticketId, onClose, onChanged }: { ticketId: number | null; onClose: () => void; onChanged: () => void }) {
  const runtime = usePlatform();
  const { L } = useAppearance();

  const [ticket, setTicket] = useState<AdminTicketRow | null>(null);
  const [messages, setMessages] = useState<AdminTicketMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState<"image" | "audio" | null>(null);
  const lastMessageId = useRef(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  /* بارگذاری نخست */
  useEffect(() => {
    if (ticketId === null) return;
    let active = true;
    setLoading(true);
    setError(null);
    setMessages([]);
    setTicket(null);
    lastMessageId.current = 0;
    fetchStaffThread(runtime, ticketId)
      .then((payload) => {
        if (!active) return;
        setTicket(payload.ticket);
        setMessages(payload.messages);
        lastMessageId.current = payload.messages.length ? payload.messages[payload.messages.length - 1].id : 0;
      })
      .catch((cause) => {
        if (!active) return;
        setError(messageOf(cause, L("گفت‌وگو بارگذاری نشد.")));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ticketId, runtime, L]);

  /* استعلام پیام‌های تازه */
  useEffect(() => {
    if (ticketId === null) return;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const payload = await fetchStaffThread(runtime, ticketId, lastMessageId.current);
          /* فقط پیام‌های واقعاً تازه — سپر duplicates در برابر پاسخ‌های بدون فیلتر after_id */
          const fresh = payload.messages.filter((message) => message.id > lastMessageId.current);
          if (fresh.length) {
            lastMessageId.current = fresh[fresh.length - 1].id;
            setMessages((previous) => [...previous, ...fresh]);
            setTicket(payload.ticket);
          }
        } catch {
          /* استعلام بی‌صدا */
        }
      })();
    }, POLL_THREAD_MS);
    return () => clearInterval(timer);
  }, [ticketId, runtime]);

  /* اسکرول به پایین با پیام جدید */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function sendText() {
    if (ticketId === null || sending || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const sent = await sendStaffMessage(runtime, ticketId, { kind: "text", body: draft.trim() });
      if (sent && sent.id > lastMessageId.current) {
        lastMessageId.current = sent.id;
        setMessages((previous) => [...previous, sent]);
      }
      setDraft("");
      onChanged();
    } catch (cause) {
      setError(messageOf(cause, L("ارسال پیام ناموفق بود.")));
    } finally {
      setSending(false);
    }
  }

  async function sendAttachment(file: File, kind: "image" | "audio") {
    if (ticketId === null) return;
    setUploading(kind);
    setError(null);
    try {
      const uploaded = await uploadStaffAttachment(runtime, file, kind);
      const sent = await sendStaffMessage(runtime, ticketId, {
        kind,
        attachmentUrl: uploaded.url,
        mime: uploaded.mime,
        durationMs: kind === "audio" ? 0 : 0,
      });
      if (sent && sent.id > lastMessageId.current) {
        lastMessageId.current = sent.id;
        setMessages((previous) => [...previous, sent]);
      }
      onChanged();
    } catch (cause) {
      setError(messageOf(cause, L("ارسال پیوست ناموفق بود.")));
    } finally {
      setUploading(null);
    }
  }

  if (ticketId === null) return null;

  return (
    <Sheet open={true} onClose={onClose} title={L(ticket?.subject || "گفت‌وگوی پشتیبانی")}>
      <div style={{ display: "grid", gap: 10, paddingBottom: 10 }}>
        {ticket ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <AdminBadge tone={(STATUS_META[ticket.status] ?? STATUS_META.open).tone}>{L((STATUS_META[ticket.status] ?? STATUS_META.open).label)}</AdminBadge>
            <AdminBadge tone="muted">{L(ticket.userName)}</AdminBadge>
            {ticket.assigneeName ? <AdminBadge tone="info">{ticket.assigneeName}</AdminBadge> : null}
          </div>
        ) : null}

        {error ? <AdminError message={error} /> : null}

        {loading ? (
          <span className="vodda-skeleton" style={{ height: 160, borderRadius: 14, display: "block" }} />
        ) : (
          <div style={{ display: "grid", gap: 8, maxHeight: 420, overflowY: "auto", padding: "2px" }}>
            {messages.length === 0 ? (
              <AdminEmpty icon="message" title={L("پیامی در این گفت‌وگو نیست")} />
            ) : (
              messages.map((message) => {
                const mine = message.senderSide === "staff";
                return (
                  <div key={message.id} style={{ display: "grid", justifyItems: mine ? "start" : "end" }}>
                    <div
                      style={{
                        maxWidth: "86%",
                        display: "grid",
                        gap: 6,
                        padding: "9px 12px",
                        borderRadius: 15,
                        background: mine ? colors.olive600 : colors.surfaceSoft,
                        color: mine ? "#fffaf0" : colors.ink,
                        border: `1px solid ${mine ? "transparent" : colors.sand150}`,
                      }}
                    >
                      <span style={{ fontSize: 9, fontWeight: 800, opacity: 0.8 }}>
                        {mine ? L("پشتیبانی وُدّا") : L(message.senderName)} · {faDateTime(message.createdAt)}
                      </span>
                      {message.kind === "text" ? (
                        <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{message.body || "—"}</span>
                      ) : null}
                      {message.kind === "image" && message.attachmentUrl ? (
                        <img
                          src={message.attachmentUrl}
                          alt={L("پیام تصویری کاربر")}
                          loading="lazy"
                          style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 12, objectFit: "cover" }}
                        />
                      ) : null}
                      {message.kind === "audio" && message.attachmentUrl ? (
                        <audio controls preload="none" src={message.attachmentUrl} style={{ width: 220, maxWidth: "100%", height: 40 }} />
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* نوار ارسال */}
        <div style={{ display: "grid", gap: 8, borderTop: `1px solid ${colors.sand150}`, paddingTop: 10 }}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={L("پاسخ پشتیبانی…")}
            aria-label={L("متن پاسخ پشتیبانی")}
            rows={2}
            style={{ minHeight: 60, padding: "9px 12px", border: `1px solid ${colors.sand200}`, borderRadius: 13, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 600, resize: "vertical", outline: "none" }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading !== null}
              aria-label={L("ارسال تصویر")}
              className="vodda-tappable"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px 12px", borderRadius: 12, border: `1px solid ${colors.sand200}`, background: colors.surface, color: colors.inkMuted, fontSize: 11.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: uploading ? "wait" : "pointer" }}
            >
              <Icon name="camera" size={14} />
              {uploading === "image" ? L("در حال ارسال…") : L("تصویر")}
            </button>
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              disabled={uploading !== null}
              aria-label={L("ارسال پیام صوتی")}
              className="vodda-tappable"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "9px 12px", borderRadius: 12, border: `1px solid ${colors.sand200}`, background: colors.surface, color: colors.inkMuted, fontSize: 11.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: uploading ? "wait" : "pointer" }}
            >
              <Icon name="mic" size={14} />
              {uploading === "audio" ? L("در حال ارسال…") : L("صوت")}
            </button>
            <button
              type="button"
              onClick={() => void sendText()}
              disabled={sending || !draft.trim()}
              className="vodda-tappable"
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", borderRadius: 12, border: 0, background: "linear-gradient(145deg, #43b07f, #2e8f5c)", color: "#ffffff", fontSize: 12.5, fontWeight: 800, fontFamily: typography.fontFamily, cursor: sending || !draft.trim() ? "default" : "pointer", opacity: sending || !draft.trim() ? 0.6 : 1, minWidth: 110 }}
            >
              <Icon name="arrowL" size={15} />
              {sending ? L("در حال ارسال…") : L("ارسال پاسخ")}
            </button>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void sendAttachment(file, "image");
            }}
          />
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void sendAttachment(file, "audio");
            }}
          />
        </div>
      </div>
    </Sheet>
  );
}
