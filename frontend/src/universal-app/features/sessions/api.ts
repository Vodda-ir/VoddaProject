import type { PlatformRuntime } from "../../platform/types";
import { parseLearnerSession, type LearnerSession } from "./types";

export type LearnerSessionsWhen = "upcoming" | "past";

type DataResponse = {
  data?: unknown;
};

export async function getLearnerSessions(
  runtime: PlatformRuntime,
  when: LearnerSessionsWhen,
): Promise<LearnerSession[]> {
  const search = new URLSearchParams({ when });
  const response = await runtime.request<DataResponse>(`/sessions?${search.toString()}`);
  const rows = Array.isArray(response.data) ? response.data : [];

  return rows
    .map(parseLearnerSession)
    .filter((session): session is LearnerSession => session !== null);
}

export async function cancelLearnerSession(runtime: PlatformRuntime, sessionId: number) {
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    throw new Error("شناسه جلسه نامعتبر است.");
  }
  return runtime.request<DataResponse>(`/sessions/${sessionId}/cancel`, {
    method: "POST",
  });
}

export async function createSessionReview(
  runtime: PlatformRuntime,
  input: { sessionId: number; rating: number; text: string },
) {
  if (!Number.isInteger(input.sessionId) || input.sessionId <= 0) {
    throw new Error("شناسه جلسه نامعتبر است.");
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error("امتیاز باید بین ۱ تا ۵ باشد.");
  }

  return runtime.request<DataResponse>("/reviews", {
    method: "POST",
    body: JSON.stringify({
      session_id: input.sessionId,
      rating: input.rating,
      text: input.text.trim(),
    }),
  });
}
