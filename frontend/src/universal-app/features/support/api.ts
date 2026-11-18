import { asArray, asInteger, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { resolveAssetUrl } from "../../platform/asset";
import type { PlatformRuntime } from "../../platform/types";

/**
 * API client of the live support chat + ticketing system (app side).
 * Tickets are conversations between the signed-in user and the support
 * team; messages can be text, voice notes (audio) or images.
 */

export type TicketStatus = "open" | "pending" | "answered" | "closed";

export type SupportTicketSummary = {
  id: number;
  subject: string;
  status: TicketStatus;
  unreadUser: number;
  assignedTo: number | null;
  lastMessageAt: string;
  createdAt: string;
};

export type ChatMessageKind = "text" | "audio" | "image";

export type SupportChatMessage = {
  id: number;
  senderId: number;
  senderName: string;
  senderSide: "user" | "staff";
  kind: ChatMessageKind;
  body: string;
  attachmentUrl?: string;
  attachmentMime?: string;
  durationMs: number;
  createdAt: string;
};

export type SupportThreadPayload = {
  ticket: SupportTicketSummary;
  messages: SupportChatMessage[];
};

export type UploadedAttachment = { url: string; mime: string; kind: ChatMessageKind };

function asTicket(value: unknown): SupportTicketSummary {
  const data = asRecord(value) ?? {};
  return {
    id: asInteger(data.id),
    subject: asString(data.subject, "بدون موضوع"),
    status: (asString(data.status, "open") as TicketStatus),
    unreadUser: asInteger(data.unread_user),
    assignedTo: typeof data.assigned_to === "number" ? data.assigned_to : null,
    lastMessageAt: asString(data.last_message_at),
    createdAt: asString(data.created_at),
  };
}

function asMessage(value: unknown): SupportChatMessage {
  const data = asRecord(value) ?? {};
  return {
    id: asInteger(data.id),
    senderId: asInteger(data.sender_id),
    senderName: asString(data.sender_name, "کاربر"),
    senderSide: asString(data.sender_side, "user") === "staff" ? "staff" : "user",
    kind: (asString(data.kind, "text") as ChatMessageKind),
    body: asString(data.body),
    attachmentUrl: resolveAssetUrl(asString(data.attachment_url)) || undefined,
    attachmentMime: asString(data.attachment_mime) || undefined,
    durationMs: asInteger(data.duration_ms),
    createdAt: asString(data.created_at),
  };
}

export async function listMyTickets(runtime: PlatformRuntime): Promise<SupportTicketSummary[]> {
  const response = await runtime.request<ApiEnvelope>("/support/tickets?limit=50");
  return asArray(response.data).map(asTicket);
}

export async function fetchThread(
  runtime: PlatformRuntime,
  ticketId: number,
  afterId = 0,
): Promise<SupportThreadPayload> {
  const response = await runtime.request<ApiEnvelope>(
    `/support/tickets/${ticketId}?after_id=${afterId}&limit=300`,
  );
  const data = asRecord(response.data) ?? {};
  return {
    ticket: asTicket(data.ticket),
    messages: asArray(data.messages).map(asMessage),
  };
}

export async function createTicket(
  runtime: PlatformRuntime,
  subject: string,
  body: string,
): Promise<SupportTicketSummary> {
  const response = await runtime.request<ApiEnvelope>("/support/tickets", {
    method: "POST",
    body: JSON.stringify({ subject, body }),
  });
  const data = asRecord(response.data) ?? {};
  return asTicket(data.ticket);
}

export async function sendChatMessage(
  runtime: PlatformRuntime,
  ticketId: number,
  payload: {
    kind: ChatMessageKind;
    body?: string;
    attachmentUrl?: string;
    mime?: string;
    durationMs?: number;
  },
): Promise<SupportChatMessage> {
  const response = await runtime.request<ApiEnvelope>(`/support/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      kind: payload.kind,
      body: payload.body ?? "",
      attachment_url: payload.attachmentUrl ?? "",
      mime: payload.mime ?? "",
      duration_ms: payload.durationMs ?? 0,
    }),
  });
  const data = asRecord(response.data) ?? {};
  return asMessage(data.message);
}

export async function closeTicket(runtime: PlatformRuntime, ticketId: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/support/tickets/${ticketId}/close`, { method: "POST" });
}

export async function fetchUnreadTotal(runtime: PlatformRuntime): Promise<number> {
  const response = await runtime.request<ApiEnvelope>("/support/chat/unread");
  const data = asRecord(response.data) ?? {};
  return asInteger(data.unread);
}

/** Uploads a chat attachment (audio/image) and returns its public URL. */
export async function uploadChatAttachment(
  runtime: PlatformRuntime,
  file: File,
  kind: "audio" | "image",
): Promise<UploadedAttachment> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const response = await runtime.request<ApiEnvelope>("/support/chat/upload", {
    method: "POST",
    body: form,
  });
  const data = asRecord(response.data) ?? {};
  return {
    url: resolveAssetUrl(asString(data.url)) || "",
    mime: asString(data.mime),
    kind: asString(data.kind, "image") as ChatMessageKind,
  };
}
