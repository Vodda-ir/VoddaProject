import { asArray, type ApiEnvelope } from "../../platform/api";
import type { PlatformRuntime } from "../../platform/types";
import { parseLearnerSession, type LearnerSession } from "./types";

export type LearnerSessionsWhen = "upcoming" | "past";

function assertValidSessionId(sessionId: number) {
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    throw new Error("شناسه جلسه نامعتبر است.");
  }
}

export async function getLearnerSessions(
  runtime: PlatformRuntime,
  when: LearnerSessionsWhen,
): Promise<LearnerSession[]> {
  const search = new URLSearchParams({ when });
  const response = await runtime.request<ApiEnvelope>(`/sessions?${search.toString()}`);
  const rows = asArray(response.data);

  return rows
    .map(parseLearnerSession)
    .filter((session): session is LearnerSession => session !== null);
}

export async function cancelLearnerSession(runtime: PlatformRuntime, sessionId: number) {
  assertValidSessionId(sessionId);
  return runtime.request<ApiEnvelope>(`/sessions/${sessionId}/cancel`, {
    method: "POST",
  });
}

export async function createSessionReview(
  runtime: PlatformRuntime,
  input: { sessionId: number; rating: number; text: string },
) {
  assertValidSessionId(input.sessionId);
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error("امتیاز باید بین ۱ تا ۵ باشد.");
  }

  return runtime.request<ApiEnvelope>("/reviews", {
    method: "POST",
    body: JSON.stringify({
      session_id: input.sessionId,
      rating: input.rating,
      text: input.text.trim(),
    }),
  });
}
