import {
  asArray,
  asInteger,
  asRecord,
  asString,
  type ApiEnvelope,
} from "../../platform/api";
import type { PlatformRuntime } from "../../platform/types";
import { localizedDigits } from "../../ui/persian";

/* ═══ چالش‌های قرآنی — لایهٔ API با پارسینگ متحمل (سبک admin/api.ts) ═══
 * همهٔ پاسخ‌ها پوشهٔ {data} دارند و خطاها PlatformHttpError با پیام فارسی
 * می‌اندازند (نمایش با messageOf). فیلدهای ارسالی دقیقاً مطابق قرارداد
 * بک‌اند است (DisallowUnknownFields) — هیچ فیلد اضافه‌ای فرستاده نمی‌شود.
 * پارسینگ متحمل: تغییر شکل کوچک پاسخ هیچ‌وقت صفحه را نمی‌شکند. */

export type ChallengeMode = "audio" | "description";
export type ChallengeStatus = "registration" | "active" | "judging" | "finished" | "canceled";
export type ParticipantStatus = "joined" | "submitted";
export type PointLedgerReason = "challenge_join" | "challenge_rank" | "admin_grant";

export type ChallengeData = {
  id: number;
  title: string;
  description: string;
  mode: ChallengeMode;
  audioUrl: string;
  audioTeacherName: string;
  capacity: number;
  durationHours: number;
  votingHours: number;
  weightAudience: number;
  weightJudges: number;
  weightAdmin: number;
  status: ChallengeStatus;
  startedAt: string;
  submissionDeadline: string;
  votingDeadline: string;
  publishedAt: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
};

export type ChallengeItem = ChallengeData & {
  participantsCount: number;
  joined: boolean;
};

export type ParticipantData = {
  id: number;
  challengeId: number;
  userId: number;
  status: ParticipantStatus;
  submissionText: string;
  submissionAudioUrl: string;
  submittedAt: string;
  adminScore: number;
  audienceVotes: number;
  judgeVotes: number;
  audienceScore: number;
  judgeScore: number;
  finalScore: number;
  rank: number;
  pointsJoin: number;
  pointsBonus: number;
  createdAt: string;
  updatedAt: string;
};

export type SubmissionViewData = {
  participantId: number;
  userId: number;
  name: string;
  avatarUrl: string;
  text: string;
  audioUrl: string;
  audienceVotes: number;
  judgeVotes: number;
  myVote: boolean;
  rank: number;
};

export type ChallengeDetailData = {
  challenge: ChallengeData | null;
  participantsCount: number;
  joined: boolean;
  myParticipant: ParticipantData | null;
  submissions: SubmissionViewData[];
};

export type RankRowData = {
  rank: number;
  participantId: number;
  userId: number;
  name: string;
  avatarUrl: string;
  audienceVotes: number;
  judgeVotes: number;
  adminScore: number;
  audienceScore: number;
  judgeScore: number;
  finalScore: number;
  pointsBonus: number;
  isMe: boolean;
};

export type ChallengeResultsData = {
  challenge: ChallengeData | null;
  ranking: RankRowData[];
  me: RankRowData | null;
  points: { balance: number } | null;
};

export type PointLedgerData = {
  id: number;
  userId: number;
  amount: number;
  balanceAfter: number;
  reason: string;
  refId: number;
  createdAt: string;
};

export type PointSnapshotData = {
  balance: number;
  ledger: PointLedgerData[];
};

export type AdminParticipantData = ParticipantData & {
  name: string;
  mobile: string;
  avatarUrl: string;
};

export type AdminChallengeData = ChallengeData & {
  participantsCount: number;
  participants: AdminParticipantData[];
};

/** ورودی فرم ساخت/ویرایش چالش از سمت ادمین (بدون ارسال فیلد اضافه). */
export type ChallengeAdminInput = {
  title: string;
  description: string;
  mode: ChallengeMode;
  capacity: number;
  durationHours: number;
  votingHours: number;
  audioUrl?: string;
  audioTeacherName?: string;
  weightAudience?: number | null;
  weightJudges?: number | null;
  weightAdmin?: number | null;
};

export type JoinChallengeResult = {
  participant: ParticipantData | null;
  started: boolean;
};

/* ── پارسینگ متحمل ── */

function dataOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function rowsOf(value: unknown): Record<string, unknown>[] {
  return asArray(value).filter((row): row is Record<string, unknown> => row !== null && typeof row === "object");
}

const CHALLENGE_STATUSES: string[] = ["registration", "active", "judging", "finished", "canceled"];

function statusOf(value: unknown): ChallengeStatus {
  const raw = asString(value);
  return CHALLENGE_STATUSES.includes(raw) ? (raw as ChallengeStatus) : "registration";
}

function modeOf(value: unknown): ChallengeMode {
  return asString(value) === "audio" ? "audio" : "description";
}

function participantStatusOf(value: unknown): ParticipantStatus {
  return asString(value) === "submitted" ? "submitted" : "joined";
}

export function parseChallenge(row: Record<string, unknown>): ChallengeData | null {
  const id = asInteger(row.id);
  if (id <= 0) return null;
  return {
    id,
    title: asString(row.title) || "—",
    description: asString(row.description),
    mode: modeOf(row.mode),
    audioUrl: asString(row.audio_url),
    audioTeacherName: asString(row.audio_teacher_name),
    capacity: asInteger(row.capacity, 0),
    durationHours: asInteger(row.duration_hours, 0),
    votingHours: asInteger(row.voting_hours, 0),
    weightAudience: asInteger(row.weight_audience, 0),
    weightJudges: asInteger(row.weight_judges, 0),
    weightAdmin: asInteger(row.weight_admin, 0),
    status: statusOf(row.status),
    startedAt: asString(row.started_at),
    submissionDeadline: asString(row.submission_deadline),
    votingDeadline: asString(row.voting_deadline),
    publishedAt: asString(row.published_at),
    createdBy: asInteger(row.created_by, 0),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function parseParticipant(row: Record<string, unknown>): ParticipantData | null {
  const id = asInteger(row.id);
  if (id <= 0) return null;
  return {
    id,
    challengeId: asInteger(row.challenge_id, 0),
    userId: asInteger(row.user_id, 0),
    status: participantStatusOf(row.status),
    submissionText: asString(row.submission_text),
    submissionAudioUrl: asString(row.submission_audio_url),
    submittedAt: asString(row.submitted_at),
    adminScore: asInteger(row.admin_score, 0),
    audienceVotes: asInteger(row.audience_votes, 0),
    judgeVotes: asInteger(row.judge_votes, 0),
    audienceScore: asInteger(row.audience_score, 0),
    judgeScore: asInteger(row.judge_score, 0),
    finalScore: asInteger(row.final_score, 0),
    rank: asInteger(row.rank, 0),
    pointsJoin: asInteger(row.points_join, 0),
    pointsBonus: asInteger(row.points_bonus, 0),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

function parseSubmissionView(row: Record<string, unknown>): SubmissionViewData | null {
  const participantId = asInteger(row.participant_id);
  if (participantId <= 0) return null;
  return {
    participantId,
    userId: asInteger(row.user_id, 0),
    name: asString(row.name) || "—",
    avatarUrl: asString(row.avatar_url),
    text: asString(row.text),
    audioUrl: asString(row.audio_url),
    audienceVotes: asInteger(row.audience_votes, 0),
    judgeVotes: asInteger(row.judge_votes, 0),
    myVote: row.my_vote === true,
    rank: asInteger(row.rank, 0),
  };
}

export function parseRankRow(row: Record<string, unknown>): RankRowData | null {
  const rank = asInteger(row.rank, 0);
  if (rank <= 0) return null;
  return {
    rank,
    participantId: asInteger(row.participant_id, 0),
    userId: asInteger(row.user_id, 0),
    name: asString(row.name) || "—",
    avatarUrl: asString(row.avatar_url),
    audienceVotes: asInteger(row.audience_votes, 0),
    judgeVotes: asInteger(row.judge_votes, 0),
    adminScore: asInteger(row.admin_score, 0),
    audienceScore: asInteger(row.audience_score, 0),
    judgeScore: asInteger(row.judge_score, 0),
    finalScore: asInteger(row.final_score, 0),
    pointsBonus: asInteger(row.points_bonus, 0),
    isMe: row.is_me === true,
  };
}

export function parseChallengeItem(row: Record<string, unknown>): ChallengeItem | null {
  const challenge = parseChallenge(row);
  if (!challenge) return null;
  return {
    ...challenge,
    participantsCount: asInteger(row.participants_count, 0),
    joined: row.joined === true,
  };
}

export function parsePointLedgerRow(row: Record<string, unknown>): PointLedgerData | null {
  const id = asInteger(row.id);
  if (id <= 0) return null;
  return {
    id,
    userId: asInteger(row.user_id, 0),
    amount: asInteger(row.amount, 0),
    balanceAfter: asInteger(row.balance_after, 0),
    reason: asString(row.reason),
    refId: asInteger(row.ref_id, 0),
    createdAt: asString(row.created_at),
  };
}

function parsePoints(value: unknown): PointSnapshotData {
  const data = dataOf(value);
  return {
    balance: asInteger(data.balance, 0),
    ledger: rowsOf(data.ledger)
      .map(parsePointLedgerRow)
      .filter((row): row is PointLedgerData => row !== null),
  };
}

/* ── برچسب‌های مشترک (فارسی با L() انگلیسی می‌شود) ── */

export function challengePhaseLabel(status: string, L: (text: string) => string): string {
  switch (status) {
    case "registration": return L("ثبت‌نام");
    case "active": return L("در حال اجرا");
    case "judging": return L("رأی‌گیری");
    case "finished": return L("پایان‌یافته");
    case "canceled": return L("لغوشده");
    default: return L(status);
  }
}

export function challengeModeLabel(mode: string, L: (text: string) => string): string {
  return mode === "audio" ? L("حوزهٔ صوتی") : L("حوزهٔ تشریحی");
}

export function challengeRankLabel(rank: number, lang: "fa" | "en", L: (text: string) => string): string {
  const medals = ["رتبهٔ اول", "رتبهٔ دوم", "رتبهٔ سوم", "رتبهٔ چهارم", "رتبهٔ پنجم"];
  const medal = medals[rank - 1];
  if (medal) return L(medal);
  return L("رتبهٔ {n}").replace("{n}", localizedDigits(rank, lang));
}

export function pointReasonLabel(reason: string, L: (text: string) => string): string {
  switch (reason) {
    case "challenge_join": return L("امتیاز شرکت در چالش");
    case "challenge_rank": return L("پاداش رتبه در چالش");
    case "admin_grant": return L("امتیاز مدیریت");
    default: return L(reason);
  }
}

/* ── نقاط انتهایی کاربر ── */

export async function fetchChallenges(runtime: PlatformRuntime): Promise<ChallengeItem[]> {
  const response = await runtime.request<ApiEnvelope>("/challenges");
  return rowsOf(dataOf(response.data).data ?? response.data)
    .map(parseChallengeItem)
    .filter((item): item is ChallengeItem => item !== null);
}

export async function fetchChallengeDetail(runtime: PlatformRuntime, id: number): Promise<ChallengeDetailData> {
  const response = await runtime.request<ApiEnvelope>(`/challenges/${id}`);
  const data = dataOf(response.data);
  return {
    challenge: parseChallenge(dataOf(data.challenge)),
    participantsCount: asInteger(data.participants_count, 0),
    joined: data.joined === true,
    myParticipant: parseParticipant(dataOf(data.my_participant)),
    submissions: rowsOf(data.submissions)
      .map(parseSubmissionView)
      .filter((row): row is SubmissionViewData => row !== null),
  };
}

export async function joinChallenge(runtime: PlatformRuntime, id: number): Promise<JoinChallengeResult> {
  const response = await runtime.request<ApiEnvelope>(`/challenges/${id}/join`, { method: "POST" });
  const data = dataOf(response.data);
  return {
    participant: parseParticipant(dataOf(data.participant)),
    started: data.started === true,
  };
}

/** پسوند فایل آپلود صوتی را از نوع Blob حدس می‌زند (نام تمیز برای فیلد FormData). */
function audioFileName(blob: Blob): string {
  const type = (blob.type || "").toLowerCase();
  if (type.includes("ogg")) return "audio.ogg";
  if (type.includes("mpeg") || type.includes("mp3")) return "audio.mp3";
  if (type.includes("mp4") || type.includes("m4a")) return "audio.m4a";
  if (type.includes("wav")) return "audio.wav";
  return "audio.webm";
}

/** ارسال مشارکت — FormData با فیلد اختیاری file و text (حداقل یکی). Content-Type دستی ست نمی‌شود. */
export async function submitChallenge(
  runtime: PlatformRuntime,
  id: number,
  body: { text?: string; audio?: Blob | null },
): Promise<ParticipantData> {
  const form = new FormData();
  const text = (body.text ?? "").trim();
  if (text) form.set("text", text);
  if (body.audio) form.set("file", body.audio, audioFileName(body.audio));
  const response = await runtime.request<ApiEnvelope>(`/challenges/${id}/submission`, { method: "POST", body: form });
  const participant = parseParticipant(dataOf(response.data));
  if (!participant) throw new Error("پاسخ ثبت مشارکت نامعتبر بود.");
  return participant;
}

export async function voteChallenge(runtime: PlatformRuntime, id: number, participantId: number): Promise<boolean> {
  const response = await runtime.request<ApiEnvelope<{ voted?: boolean }>>(`/challenges/${id}/vote`, {
    method: "POST",
    body: JSON.stringify({ participant_id: participantId }),
  });
  return dataOf(response.data).voted === true;
}

export async function fetchResults(runtime: PlatformRuntime, id: number): Promise<ChallengeResultsData> {
  const response = await runtime.request<ApiEnvelope>(`/challenges/${id}/results`);
  const data = dataOf(response.data);
  const points = asRecord(data.points);
  return {
    challenge: parseChallenge(dataOf(data.challenge)),
    ranking: rowsOf(data.ranking)
      .map(parseRankRow)
      .filter((row): row is RankRowData => row !== null),
    me: data.me !== undefined && data.me !== null ? parseRankRow(dataOf(data.me)) : null,
    points: points ? { balance: asInteger(points.balance, 0) } : null,
  };
}

export async function fetchMyPoints(runtime: PlatformRuntime): Promise<PointSnapshotData> {
  const response = await runtime.request<ApiEnvelope>("/me/points");
  return parsePoints(response.data);
}

/* ── نقاط انتهایی ادمین ── */

function parseAdminParticipant(row: Record<string, unknown>): AdminParticipantData | null {
  const participant = parseParticipant(row);
  if (!participant) return null;
  return {
    ...participant,
    name: asString(row.name) || "—",
    mobile: asString(row.mobile),
    avatarUrl: asString(row.avatar_url),
  };
}

function parseAdminChallenge(row: Record<string, unknown>, withParticipants: boolean): AdminChallengeData | null {
  const challenge = parseChallenge(row);
  if (!challenge) return null;
  return {
    ...challenge,
    participantsCount: asInteger(row.participants_count, 0),
    participants: withParticipants
      ? rowsOf(row.participants)
          .map(parseAdminParticipant)
          .filter((participant): participant is AdminParticipantData => participant !== null)
      : [],
  };
}

export async function adminFetchChallenges(runtime: PlatformRuntime): Promise<AdminChallengeData[]> {
  const response = await runtime.request<ApiEnvelope>("/admin/challenges");
  return rowsOf(dataOf(response.data).data ?? response.data)
    .map((row) => parseAdminChallenge(row, false))
    .filter((row): row is AdminChallengeData => row !== null);
}

export async function adminFetchChallenge(runtime: PlatformRuntime, id: number): Promise<AdminChallengeData> {
  const response = await runtime.request<ApiEnvelope>(`/admin/challenges/${id}`);
  const admin = parseAdminChallenge(dataOf(response.data), true);
  if (!admin) throw new Error("پاسخ جزئیات چالش نامعتبر بود.");
  return admin;
}

/** بدنهٔ دقیق create/update — فقط فیلدهای مستند؛ وزن‌ها یا هر سه یا هیچ‌کدام. */
function adminChallengeBody(input: ChallengeAdminInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description.trim(),
    mode: input.mode,
    capacity: Math.max(2, Math.min(500, Math.trunc(input.capacity))),
    duration_hours: Math.max(1, Math.trunc(input.durationHours)),
    voting_hours: Math.max(1, Math.trunc(input.votingHours)),
  };
  if (input.mode === "audio") {
    if (input.audioUrl && input.audioUrl.trim()) body.audio_url = input.audioUrl.trim();
    if (input.audioTeacherName && input.audioTeacherName.trim()) {
      body.audio_teacher_name = input.audioTeacherName.trim();
    }
  }
  if (
    input.weightAudience != null &&
    input.weightJudges != null &&
    input.weightAdmin != null
  ) {
    body.weight_audience = Math.trunc(input.weightAudience);
    body.weight_judges = Math.trunc(input.weightJudges);
    body.weight_admin = Math.trunc(input.weightAdmin);
  }
  return body;
}

export async function adminCreateChallenge(runtime: PlatformRuntime, input: ChallengeAdminInput): Promise<ChallengeData | null> {
  const response = await runtime.request<ApiEnvelope>("/admin/challenges", {
    method: "POST",
    body: JSON.stringify(adminChallengeBody(input)),
  });
  return parseChallenge(dataOf(response.data));
}

export async function adminUpdateChallenge(runtime: PlatformRuntime, id: number, input: ChallengeAdminInput): Promise<ChallengeData | null> {
  const response = await runtime.request<ApiEnvelope>(`/admin/challenges/${id}`, {
    method: "PUT",
    body: JSON.stringify(adminChallengeBody(input)),
  });
  return parseChallenge(dataOf(response.data));
}

export async function adminDeleteChallenge(runtime: PlatformRuntime, id: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/challenges/${id}`, { method: "DELETE" });
}

export async function adminStartChallenge(runtime: PlatformRuntime, id: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/challenges/${id}/start`, { method: "POST" });
}

export async function adminJudgingChallenge(runtime: PlatformRuntime, id: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/challenges/${id}/judging`, { method: "POST" });
}

export async function adminPublishChallenge(runtime: PlatformRuntime, id: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/challenges/${id}/publish`, { method: "POST" });
}

export async function adminSetScore(runtime: PlatformRuntime, id: number, participantId: number, score: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/challenges/${id}/participants/${participantId}/score`, {
    method: "PUT",
    body: JSON.stringify({ score: Math.max(0, Math.min(100, Math.trunc(score))) }),
  });
}

/** آپلود فایل صوتی چالش (ادمین) — فیلد FormData دقیقاً «file». */
export async function adminUploadChallengeAudio(runtime: PlatformRuntime, file: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.set("file", file, filename || audioFileName(file));
  const response = await runtime.request<ApiEnvelope>("/admin/challenge-upload", { method: "POST", body: form });
  return asString(dataOf(response.data).url);
}
