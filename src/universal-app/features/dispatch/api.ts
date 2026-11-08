// API helpers for the فراخوان اساتید feature.
import { asArray, asRecord, type ApiEnvelope } from "../../platform/api";
import type { PlatformRuntime } from "../../platform/types";
import type {
  ChooseOfferResult,
  DispatchCallView,
  OfficialService,
  TeacherInbox,
} from "./types";

function asObject(value: unknown): Record<string, unknown> & { id?: number; title?: string } {
  return (asRecord(value) ?? {}) as Record<string, unknown> & { id?: number; title?: string };
}

/** Public official service catalog (topic list) — grouped by category. */
export async function getCatalog(runtime: PlatformRuntime): Promise<OfficialService[]> {
  const response = await runtime.request<ApiEnvelope>("/catalog/services");
  const payload = asObject(response.data ?? {});
  const categories = asArray(payload.categories ?? []);
  const flat: OfficialService[] = [];
  for (const group of categories) {
    const row = asObject(group);
    const category = String(row.category ?? "");
    for (const item of asArray(row.services)) {
      const entry = asObject(item);
      if (Number(entry.id) > 0 && entry.title) {
        flat.push({
          id: Number(entry.id),
          category,
          title: String(entry.title),
          description: String(entry.description ?? ""),
          icon: String(entry.icon ?? "book"),
        });
      }
    }
  }
  return flat;
}

/** Learner's live call (null when none). */
export async function getCurrentDispatchCall(runtime: PlatformRuntime): Promise<DispatchCallView> {
  const response = await runtime.request<ApiEnvelope>("/dispatch/calls/current");
  const data = asObject(response.data ?? {});
  const call = asObject(data.call ?? null);
  const candidates = asArray(data.candidates);
  return {
    call: call && Number(call.id) > 0 ? (call as unknown as DispatchCallView["call"]) : null,
    candidates: candidates.map(asObject) as unknown as DispatchCallView["candidates"],
    topic_teachable: data.topic_teachable !== false,
  };
}

/** Broadcast a new call. */
export async function createDispatchCall(
  runtime: PlatformRuntime,
  input: { officialServiceId: number; note?: string; scheduledAt?: string | null; flexible?: boolean },
): Promise<DispatchCallView> {
  const response = await runtime.request<ApiEnvelope>("/dispatch/calls", {
    method: "POST",
    body: JSON.stringify({
      official_service_id: input.officialServiceId,
      note: input.note?.trim() ?? "",
      flexible: Boolean(input.flexible),
      scheduled_at: input.flexible ? undefined : input.scheduledAt,
    }),
  });
  const data = asObject(response.data ?? {});
  return {
    call: asObject(data.call ?? {}) as unknown as DispatchCallView["call"],
    candidates: asArray(data.candidates).map(asObject) as unknown as DispatchCallView["candidates"],
  };
}

/** Confirm a candidate → creates the booking. */
export async function chooseDispatchOffer(
  runtime: PlatformRuntime,
  callId: number,
  offerId: number,
  paymentMethod: "wallet" | "gateway",
): Promise<ChooseOfferResult> {
  const response = await runtime.request<ApiEnvelope>(`/dispatch/calls/${callId}/choose`, {
    method: "POST",
    body: JSON.stringify({ offer_id: offerId, payment_method: paymentMethod }),
  });
  return asObject(response.data ?? {}) as unknown as ChooseOfferResult;
}

/** Remove one candidate and keep searching. */
export async function declineDispatchOffer(
  runtime: PlatformRuntime,
  callId: number,
  offerId: number,
): Promise<DispatchCallView> {
  const response = await runtime.request<ApiEnvelope>(`/dispatch/calls/${callId}/decline`, {
    method: "POST",
    body: JSON.stringify({ offer_id: offerId }),
  });
  const data = asObject(response.data ?? {});
  return {
    call: asObject(data.call ?? {}) as unknown as DispatchCallView["call"],
    candidates: asArray(data.candidates).map(asObject) as unknown as DispatchCallView["candidates"],
  };
}

/** Cancel the whole broadcast. */
export async function cancelDispatchCall(runtime: PlatformRuntime, callId: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/dispatch/calls/${callId}/cancel`, { method: "POST" });
}

/** Teacher inbox: open calls + my offers. */
export async function getTeacherDispatchInbox(runtime: PlatformRuntime): Promise<TeacherInbox> {
  const response = await runtime.request<ApiEnvelope>("/teacher/dispatch/inbox");
  const data = asObject(response.data ?? {});
  return {
    calls: asArray(data.calls).map(asObject) as unknown as TeacherInbox["calls"],
    offers: asArray(data.offers).map(asObject) as unknown as TeacherInbox["offers"],
  };
}

/** Teacher accepts a call (first-to-answer race). */
export async function acceptDispatchCall(
  runtime: PlatformRuntime,
  callId: number,
): Promise<{ id: number; status: string } | null> {
  const response = await runtime.request<ApiEnvelope>(`/teacher/dispatch/calls/${callId}/accept`, {
    method: "POST",
  });
  const data = asObject(response.data ?? {});
  return data && data.id ? ({ id: data.id, status: String(data.status ?? "waiting") } as { id: number; status: string }) : null;
}

/** Teacher dismisses a call. */
export async function rejectDispatchCall(runtime: PlatformRuntime, callId: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/teacher/dispatch/calls/${callId}/reject`, { method: "POST" });
}

/** Teacher pulls back a waiting offer. */
export async function withdrawDispatchOffer(runtime: PlatformRuntime, offerId: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/teacher/dispatch/offers/${offerId}/withdraw`, { method: "POST" });
}
