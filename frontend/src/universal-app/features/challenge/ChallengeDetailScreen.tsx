"use client";

/* جزئیات چالش قرآنی — صفحهٔ مبتنی بر مرحله:
 * ثبت‌نام (دکمهٔ ورود) → اجرا (ویرایشگر ارسال متن/صوت) → رأی‌گیری (فهرست ارسال‌ها
 * و رأی مخاطب) → پایان (کارنامه و رتبه‌بندی). خطاها با messageOf + تلاش دوباره. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateAppRoute } from "../../router";
import {
  Avatar,
  Button,
  ErrorState,
  Icon,
  LoadingState,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { useMinWidth } from "../../ui/useMediaQuery";
import { resolveAssetUrl } from "../../platform/asset";
import { messageOf } from "../../ui/errorMessage";
import { showToast } from "../../ui/toast";
import { localizedDigits } from "../../ui/persian";
import { formatAppDateTime } from "../../ui/jalali";
import {
  challengeModeLabel,
  challengePhaseLabel,
  challengeRankLabel,
  fetchChallengeDetail,
  fetchResults,
  joinChallenge,
  submitChallenge,
  voteChallenge,
  type ChallengeDetailData,
  type ChallengeResultsData,
  type RankRowData,
  type SubmissionViewData,
} from "./api";
import { PhaseBadge, ModeBadge } from "./badges";

const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

const clampTwoLines: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

function ScoreColumn({ label, value, lang, highlight }: { label: string; value: number; lang: "fa" | "en"; highlight?: boolean }) {
  return (
    <span
      style={{
        flex: "1 1 0",
        minWidth: 0,
        display: "grid",
        gap: 3,
        justifyItems: "center",
        padding: "8px 6px",
        borderRadius: 12,
        background: highlight ? colors.olive50 : colors.sand50,
        border: `1px solid ${highlight ? colors.olive100 : colors.sand150}`,
      }}
    >
      <span style={{ fontSize: 9.5, fontWeight: 700, color: colors.inkMuted, textAlign: "center", lineHeight: 1.5 }}>{label}</span>
      <strong style={{ fontSize: 14, fontWeight: 900, color: highlight ? colors.olive700 : colors.ink }}>
        {localizedDigits(value, lang)}
      </strong>
    </span>
  );
}

function SubmissionRow({
  submission,
  isMine,
  busy,
  onVote,
}: {
  submission: SubmissionViewData;
  isMine: boolean;
  busy: boolean;
  onVote: () => void;
}) {
  const { L, lang, N } = useAppearance();
  const audioSrc = resolveAssetUrl(submission.audioUrl);
  return (
    <div
      style={{
        display: "grid",
        gap: 9,
        padding: 13,
        borderRadius: 18,
        border: `1px solid ${isMine ? colors.olive100 : colors.sand150}`,
        background: isMine ? colors.olive50 : colors.surface,
        boxShadow: shadows.xs,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <Avatar name={submission.name} src={submission.avatarUrl || undefined} size={36} />
        <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 1 }}>
          <strong style={{ fontSize: 12.5, fontWeight: 800, color: colors.ink }}>{N(submission.name)}</strong>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 10.5, fontWeight: 700, color: colors.inkMuted }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Icon name="users" size={11} />
              {localizedDigits(submission.audienceVotes, lang)} {L("رأی")}
            </span>
            {isMine ? (
              <span style={{ color: colors.olive700, fontWeight: 800 }}>{L("ارسال شما")}</span>
            ) : null}
          </span>
        </div>
        {submission.myVote ? (
          <span
            style={{
              flex: "0 0 auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 12px",
              borderRadius: radii.pill,
              border: `1px solid ${colors.olive100}`,
              background: colors.olive50,
              color: colors.olive700,
              fontSize: 11,
              fontWeight: 800,
              fontFamily: typography.fontFamily,
            }}
          >
            <Icon name="check" size={13} stroke={2.3} />
            {L("رأی دادید")}
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={onVote}
            className="vodda-tappable"
            style={{
              flex: "0 0 auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "8px 13px",
              borderRadius: radii.pill,
              border: 0,
              background: colors.olive600,
              color: colors.onOlive,
              fontSize: 11,
              fontWeight: 800,
              fontFamily: typography.fontFamily,
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            <Icon name="heart" size={13} />
            {L("رأی")}
          </button>
        )}
      </div>
      {submission.text ? (
        <span style={{ ...clampTwoLines, fontSize: 12, fontWeight: 600, color: colors.inkSecondary, lineHeight: 1.9 }}>
          {L(submission.text)}
        </span>
      ) : null}
      {audioSrc ? <audio controls preload="none" src={audioSrc} style={{ width: "100%", height: 40 }} /> : null}
    </div>
  );
}

function RankingRow({ row }: { row: RankRowData }) {
  const { L, lang, N } = useAppearance();
  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        padding: 13,
        borderRadius: 16,
        border: `1px solid ${row.isMe ? colors.olive300 : colors.sand150}`,
        background: row.isMe ? colors.olive50 : colors.surface,
        boxShadow: shadows.xs,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{
            flex: "0 0 34px",
            width: 34,
            height: 34,
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            background: row.rank === 1 ? colors.goldBackground : colors.sand100,
            border: `1px solid ${row.rank === 1 ? "rgba(191,149,64,.45)" : colors.sand200}`,
            color: row.rank === 1 ? colors.goldDark : colors.inkMuted,
            fontSize: 13,
            fontWeight: 900,
          }}
        >
          {row.rank === 1 ? <Icon name="award" size={16} /> : localizedDigits(row.rank, lang)}
        </span>
        <strong style={{ minWidth: 0, flex: 1, fontSize: 12.5, fontWeight: 800, color: colors.ink }}>
          {N(row.name)}
          {row.isMe ? <span style={{ color: colors.olive700 }}> — {L("شما")}</span> : null}
        </strong>
        <span style={{ flex: "0 0 auto", fontSize: 11.5, fontWeight: 700, color: colors.inkMuted }}>
          {challengeRankLabel(row.rank, lang, L)}
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, minWidth: 0 }}>
        <ScoreColumn label={L("رأی مخاطبان")} value={row.audienceScore} lang={lang} highlight={row.isMe} />
        <ScoreColumn label={L("رأی اساتید داور")} value={row.judgeScore} lang={lang} highlight={row.isMe} />
        <ScoreColumn label={L("نظر مدیریت")} value={row.adminScore} lang={lang} highlight={row.isMe} />
        <ScoreColumn label={L("امتیاز نهایی")} value={row.finalScore} lang={lang} highlight={row.isMe} />
      </div>
    </div>
  );
}

export function ChallengeDetailScreen({
  challengeId,
  config,
}: {
  challengeId: string;
  config: UniversalAppConfig;
}) {
  const runtime = usePlatform();
  const { L, lang, N } = useAppearance();
  const wide = useMinWidth(768);

  const id = Number.parseInt(challengeId, 10);
  const validId = Number.isFinite(id) && id > 0;

  const [detail, setDetail] = useState<ChallengeDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [results, setResults] = useState<ChallengeResultsData | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);

  const [joining, setJoining] = useState(false);
  const [text, setText] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!validId) {
      setDetail(null);
      setLoading(false);
      setError(L("چالش پیدا نشد"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await fetchChallengeDetail(runtime, id);
      setDetail(next);
    } catch (cause) {
      setDetail(null);
      setError(messageOf(cause, L("دریافت جزئیات چالش ناموفق بود")));
    } finally {
      setLoading(false);
    }
  }, [runtime, id, validId, L]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadResults = useCallback(async () => {
    if (!validId) return;
    setResultsLoading(true);
    setResultsError(null);
    try {
      setResults(await fetchResults(runtime, id));
    } catch (cause) {
      setResults(null);
      setResultsError(messageOf(cause, L("دریافت نتایج ناموفق بود")));
    } finally {
      setResultsLoading(false);
    }
  }, [runtime, id, validId, L]);

  // پایان‌یافته → دریافت خودکار کارنامه و رتبه‌بندی
  const status = detail?.challenge?.status ?? "";
  useEffect(() => {
    if (status === "finished") void loadResults();
  }, [status, loadResults]);

  async function join() {
    if (!validId || joining) return;
    setJoining(true);
    setActionError(null);
    try {
      await joinChallenge(runtime, id);
      showToast(L("۱۰ امتیاز اینستاقرآن برای ثبت‌نام ثبت شد"), "success");
      await load();
    } catch (cause) {
      setActionError(messageOf(cause, L("ثبت‌نام در چالش انجام نشد")));
    } finally {
      setJoining(false);
    }
  }

  function pickAudio(file: File | null) {
    if (file && file.size > MAX_AUDIO_BYTES) {
      setActionError(L("حجم فایل صوتی باید حداکثر ۵ مگابایت باشد."));
      return;
    }
    setActionError(null);
    setAudioFile(file);
  }

  async function submit() {
    if (!validId || submitting) return;
    if (!text.trim() && !audioFile) {
      setActionError(L("برای ارسال، متن یا فایل صوتی لازم است."));
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      await submitChallenge(runtime, id, { text: text.trim() || undefined, audio: audioFile });
      showToast(L("ارسال شما در چالش ثبت شد"), "success");
      setText("");
      setAudioFile(null);
      await load();
    } catch (cause) {
      setActionError(messageOf(cause, L("ارسال در چالش انجام نشد")));
    } finally {
      setSubmitting(false);
    }
  }

  async function vote(participantId: number) {
    if (!validId || votingId !== null) return;
    setVotingId(participantId);
    setActionError(null);
    // به‌روزرسانی خوش‌بینانه — سپس تأیید سرور
    setDetail((current) =>
      current
        ? {
            ...current,
            submissions: current.submissions.map((row) =>
              row.participantId === participantId
                ? { ...row, myVote: true, audienceVotes: row.audienceVotes + 1 }
                : row,
            ),
          }
        : current,
    );
    try {
      await voteChallenge(runtime, id, participantId);
      showToast(L("رأی شما ثبت شد"), "success");
    } catch (cause) {
      setActionError(messageOf(cause, L("ثبت رأی انجام نشد")));
      await load();
    } finally {
      setVotingId(null);
    }
  }

  if (!validId) {
    return (
      <section className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
        <ErrorState
          title={L("چالش پیدا نشد")}
          description={L("نشانی این چالش نامعتبر است.")}
          action={<Button onClick={() => navigateAppRoute("challenges", config)}>{L("بازگشت به چالش‌ها")}</Button>}
        />
      </section>
    );
  }

  if (loading) {
    return (
      <section className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
        <LoadingState label={L("در حال دریافت چالش…")} />
      </section>
    );
  }

  if (error || !detail || !detail.challenge) {
    return (
      <section className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
        <ErrorState
          title={L("دریافت جزئیات چالش ناموفق بود")}
          description={L(error ?? "خطایی رخ داد. دوباره تلاش کنید.")}
          action={<Button onClick={() => void load()}>{L("تلاش دوباره")}</Button>}
        />
      </section>
    );
  }

  const challenge = detail.challenge;
  const myParticipant = detail.myParticipant;
  const audioSrc = challenge.mode === "audio" ? resolveAssetUrl(challenge.audioUrl) : undefined;
  const capacityPercent =
    challenge.capacity > 0
      ? Math.min(100, Math.round((detail.participantsCount / challenge.capacity) * 100))
      : 0;
  const capacityFull = challenge.capacity > 0 && detail.participantsCount >= challenge.capacity;
  const deadline = challenge.status === "judging" ? challenge.votingDeadline : challenge.submissionDeadline;

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.lg, minWidth: 0 }}>
      {/* سربرگ — بازگشت به فهرست + عنوان و نشان‌ها */}
      <header style={{ display: "grid", gap: 10, minWidth: 0 }}>
        <button
          type="button"
          onClick={() => navigateAppRoute("challenges", config)}
          className="vodda-tappable"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            width: "fit-content",
            padding: "7px 12px",
            borderRadius: radii.pill,
            border: `1px solid ${colors.sand200}`,
            background: colors.surface,
            color: colors.olive700,
            fontSize: 12,
            fontWeight: 800,
            fontFamily: typography.fontFamily,
            cursor: "pointer",
          }}
        >
          <Icon name="arrowL" size={15} />
          {L("بازگشت به چالش‌ها")}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h2 style={{ ...typography.heading, margin: 0, color: colors.ink, minWidth: 0 }}>{L(challenge.title)}</h2>
          <PhaseBadge status={challenge.status} />
          <ModeBadge mode={challenge.mode} />
        </div>
        {challenge.description ? (
          <p style={{ ...typography.body, margin: 0, color: colors.inkSecondary, whiteSpace: "pre-line" }}>
            {L(challenge.description)}
          </p>
        ) : null}
        {challenge.mode === "audio" && challenge.audioTeacherName ? (
          <span style={{ ...typography.caption, color: colors.inkMuted }}>
            {L("تلاوت نمونهٔ استاد: {n}").replace("{n}", N(challenge.audioTeacherName))}
          </span>
        ) : null}
      </header>

      {/* تلاوت نمونه (حوزهٔ صوتی) */}
      {audioSrc ? (
        <div style={{ display: "grid", gap: 7, padding: 14, borderRadius: 18, border: `1px solid ${colors.sand150}`, background: colors.surfaceSoft }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: colors.ink, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="headphones" size={15} style={{ color: colors.goldDark }} />
            {L("تلاوت نمونه")}
          </span>
          <audio controls preload="none" src={audioSrc} style={{ width: "100%", height: 40 }} />
        </div>
      ) : null}

      {actionError ? (
        <span
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 13px",
            borderRadius: 13,
            background: colors.dangerBackground,
            border: "1px solid rgba(166,81,81,.3)",
            color: colors.danger,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <Icon name="info" size={15} />
          {L(actionError)}
        </span>
      ) : null}

      {/* ── مرحلهٔ ثبت‌نام ── */}
      {challenge.status === "registration" ? (
        <div style={{ display: "grid", gap: 12, padding: 16, borderRadius: 20, border: `1px solid ${colors.sand150}`, background: colors.surface, boxShadow: shadows.xs }}>
          <div style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: colors.inkMuted }}>
              {L("ظرفیت: {a} از {b}")
                .replace("{a}", localizedDigits(detail.participantsCount, lang))
                .replace("{b}", localizedDigits(challenge.capacity, lang))}
            </span>
            <span aria-hidden="true" style={{ display: "block", height: 7, borderRadius: 999, background: colors.sand100, overflow: "hidden" }}>
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${capacityPercent}%`,
                  borderRadius: 999,
                  background: capacityFull ? colors.gold : "linear-gradient(90deg, #728350, #5e6e43)",
                }}
              />
            </span>
          </div>
          {detail.joined ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "11px 14px",
                borderRadius: 13,
                background: colors.greenBackground,
                border: `1px solid ${colors.greenBorder}`,
                color: colors.greenInk,
                fontSize: 12.5,
                fontWeight: 800,
              }}
            >
              <Icon name="checkCircle" size={16} />
              {L("شما در این چالش ثبت‌نام کرده‌اید؛ منتظر آغاز رقابت باشید.")}
            </span>
          ) : (
            <Button fullWidth loading={joining} disabled={capacityFull} onClick={() => void join()}>
              <Icon name="sparkle" size={16} />
              {capacityFull ? L("ظرفیت تکمیل") : L("ثبت‌نام در چالش")}
            </Button>
          )}
        </div>
      ) : null}

      {/* ── مرحلهٔ اجرا: ویرایشگر ارسال ── */}
      {challenge.status === "active" && detail.joined ? (
        <div style={{ display: "grid", gap: 12, padding: 16, borderRadius: 20, border: `1px solid ${colors.sand150}`, background: colors.surface, boxShadow: shadows.xs, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 13.5, fontWeight: 800, color: colors.ink }}>{L("ارسال در چالش")}</strong>
            {deadline ? (
              <span style={{ marginInlineStart: "auto", fontSize: 11, fontWeight: 700, color: colors.goldDark, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icon name="clock" size={13} />
                {L("مهلت ارسال")}: {formatAppDateTime(deadline, lang)}
              </span>
            ) : null}
          </div>

          {/* ارسال فعلی */}
          {myParticipant && (myParticipant.submissionText || myParticipant.submissionAudioUrl) ? (
            <div style={{ display: "grid", gap: 7, padding: 12, borderRadius: 14, background: colors.olive50, border: `1px solid ${colors.olive100}` }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: colors.olive700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name="checkCircle" size={14} />
                {L("ارسال شما")}
                {myParticipant.submittedAt ? (
                  <span style={{ fontWeight: 600, color: colors.inkMuted }}>· {formatAppDateTime(myParticipant.submittedAt, lang)}</span>
                ) : null}
              </span>
              {myParticipant.submissionText ? (
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.inkSecondary, lineHeight: 1.9, whiteSpace: "pre-line" }}>
                  {L(myParticipant.submissionText)}
                </span>
              ) : null}
              {resolveAssetUrl(myParticipant.submissionAudioUrl) ? (
                <audio controls preload="none" src={resolveAssetUrl(myParticipant.submissionAudioUrl)} style={{ width: "100%", height: 40 }} />
              ) : null}
            </div>
          ) : null}

          <label style={{ display: "grid", gap: 6, fontSize: 11.5, fontWeight: 800, color: colors.ink }}>
            {L("متن تلاوت یا توضیح شما")}
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={5}
              maxLength={2000}
              disabled={submitting}
              placeholder={L("متن ارسال خود را بنویسید…")}
              style={{
                minHeight: 110,
                padding: "10px 12px",
                border: `1px solid ${colors.sand200}`,
                borderRadius: 12,
                background: colors.surface,
                color: colors.ink,
                fontFamily: typography.fontFamily,
                fontSize: 12.5,
                fontWeight: 600,
                lineHeight: 2,
                resize: "vertical",
                outline: "none",
              }}
            />
          </label>

          <div style={{ display: "grid", gap: 7 }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, color: colors.ink }}>{L("فایل صوتی (اختیاری)")}</span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={submitting}
              className="vodda-tappable"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "11px 12px",
                borderRadius: 12,
                border: `1px dashed ${colors.sand200}`,
                background: colors.surfaceSoft,
                color: colors.olive700,
                fontSize: 12,
                fontWeight: 800,
                fontFamily: typography.fontFamily,
                cursor: submitting ? "wait" : "pointer",
              }}
            >
              <Icon name="mic" size={15} />
              {audioFile ? audioFile.name : L("انتخاب فایل صوتی از دستگاه")}
            </button>
            <span style={{ fontSize: 10, fontWeight: 600, color: colors.inkMuted }}>
              {L("webm/ogg/mp3/m4a/wav — حداکثر ۵ مگابایت")}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = "";
                pickAudio(file);
              }}
            />
            {audioFile ? (
              <button
                type="button"
                onClick={() => setAudioFile(null)}
                className="vodda-tappable"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  width: "fit-content",
                  padding: "6px 11px",
                  borderRadius: 11,
                  border: `1px solid ${colors.sand200}`,
                  background: colors.surface,
                  color: colors.danger,
                  fontSize: 11,
                  fontWeight: 800,
                  fontFamily: typography.fontFamily,
                  cursor: "pointer",
                }}
              >
                <Icon name="x" size={13} />
                {L("حذف فایل انتخابی")}
              </button>
            ) : null}
          </div>

          <Button fullWidth loading={submitting} onClick={() => void submit()}>
            <Icon name="check" size={16} />
            {L("ثبت ارسال")}
          </Button>
        </div>
      ) : null}

      {/* ── مرحلهٔ اجرا بدون ثبت‌نام ── */}
      {challenge.status === "active" && !detail.joined ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 14px",
            borderRadius: 14,
            background: colors.goldBackground,
            border: "1px solid rgba(191,149,64,.4)",
            color: colors.goldDark,
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          <Icon name="clock" size={15} />
          {L("ثبت‌نام این چالش پایان یافته است.")}
        </div>
      ) : null}

      {/* ── مرحلهٔ رأی‌گیری ── */}
      {challenge.status === "judging" ? (
        <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              padding: "12px 14px",
              borderRadius: 14,
              background: colors.infoBackground,
              border: "1px solid rgba(94,126,140,.4)",
              color: colors.info,
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            <Icon name="info" size={15} />
            {L("رأی اساتید داور جداگانه ثبت می‌شود")}
            {challenge.votingDeadline ? (
              <span style={{ marginInlineStart: "auto", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icon name="clock" size={13} />
                {L("مهلت رأی‌گیری")}: {formatAppDateTime(challenge.votingDeadline, lang)}
              </span>
            ) : null}
          </div>

          <strong style={{ fontSize: 13.5, fontWeight: 800, color: colors.ink }}>{L("ارسال‌های شرکت‌کنندگان")}</strong>

          {detail.submissions.length === 0 ? (
            <span style={{ ...typography.caption, color: colors.inkMuted }}>
              {L("هنوز ارسالی برای رأی‌گیری ثبت نشده است")}
            </span>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: wide ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)",
                gap: spacing.md,
                minWidth: 0,
              }}
            >
              {detail.submissions.map((submission) => (
                <SubmissionRow
                  key={submission.participantId}
                  submission={submission}
                  isMine={myParticipant !== null && submission.userId === myParticipant.userId}
                  busy={votingId === submission.participantId}
                  onVote={() => void vote(submission.participantId)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* ── چالش لغوشده ── */}
      {challenge.status === "canceled" ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 14px",
            borderRadius: 14,
            background: colors.dangerBackground,
            border: "1px solid rgba(166,81,81,.3)",
            color: colors.danger,
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          <Icon name="x" size={15} />
          {L("این چالش لغو شده است.")}
        </div>
      ) : null}

      {/* ── پایان‌یافته: کارنامه و رتبه‌بندی ── */}
      {challenge.status === "finished" ? (
        <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
          {resultsLoading ? <LoadingState label={L("در حال دریافت نتایج…")} /> : null}

          {!resultsLoading && resultsError ? (
            <ErrorState
              title={L("دریافت نتایج ناموفق بود")}
              description={L(resultsError)}
              action={<Button onClick={() => void loadResults()}>{L("تلاش دوباره")}</Button>}
            />
          ) : null}

          {!resultsLoading && !resultsError && results ? (
            <>
              {/* کارنامهٔ من */}
              <div
                style={{
                  display: "grid",
                  gap: 11,
                  padding: 18,
                  borderRadius: 22,
                  border: "1px solid rgba(191,149,64,.45)",
                  background: "linear-gradient(145deg, #f7efd9 0%, #fffaf0 100%)",
                  boxShadow: shadows.sm,
                }}
              >
                <strong style={{ fontSize: 14, fontWeight: 900, color: colors.goldDark, display: "inline-flex", alignItems: "center", gap: 7 }}>
                  <Icon name="award" size={17} />
                  {L("کارنامهٔ چالش")}
                </strong>
                {results.me ? (
                  <>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: colors.inkSecondary }}>{L("رتبهٔ شما")}</span>
                      <strong style={{ fontSize: 21, fontWeight: 900, color: colors.goldDark }}>
                        {challengeRankLabel(results.me.rank, lang, L)}
                      </strong>
                    </div>
                    <div style={{ display: "flex", gap: 6, minWidth: 0 }}>
                      <ScoreColumn label={L("رأی مخاطبان")} value={results.me.audienceScore} lang={lang} highlight />
                      <ScoreColumn label={L("رأی اساتید داور")} value={results.me.judgeScore} lang={lang} highlight />
                      <ScoreColumn label={L("نظر مدیریت")} value={results.me.adminScore} lang={lang} highlight />
                      <ScoreColumn label={L("امتیاز نهایی")} value={results.me.finalScore} lang={lang} highlight />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 13px",
                          borderRadius: radii.pill,
                          background: colors.successBackground,
                          border: "1px solid rgba(94,110,67,.4)",
                          color: colors.success,
                          fontSize: 11.5,
                          fontWeight: 800,
                        }}
                      >
                        <Icon name="sparkle" size={13} />
                        {L("امتیاز پاداش رتبه")}: +{localizedDigits(results.me.pointsBonus, lang)}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "8px 13px",
                          borderRadius: radii.pill,
                          background: colors.goldBackground,
                          border: "1px solid rgba(191,149,64,.45)",
                          color: colors.goldDark,
                          fontSize: 11.5,
                          fontWeight: 800,
                        }}
                      >
                        <Icon name="coins" size={13} />
                        {L("موجودی اینستاقرآن")}: {localizedDigits(results.points?.balance ?? 0, lang)}
                      </span>
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 600, color: colors.inkSecondary }}>
                    {L("برای شما در این چالش کارنامه‌ای ثبت نشده است.")}
                  </span>
                )}
              </div>

              {/* رتبه‌بندی نهایی */}
              <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 13.5, fontWeight: 800, color: colors.ink }}>{L("رتبه‌بندی نهایی")}</strong>
                  <span style={{ marginInlineStart: "auto", fontSize: 10.5, fontWeight: 600, color: colors.inkMuted }}>
                    {L("پاداش: رتبهٔ اول ۱۰۰، دوم ۷۰، سوم ۵۰، چهارم ۳۰ و پنجم ۲۰ امتیاز اینستاقرآن")}
                  </span>
                </div>
                {results.ranking.length === 0 ? (
                  <span style={{ ...typography.caption, color: colors.inkMuted }}>
                    {L("هنوز رتبه‌ای برای نمایش نیست")}
                  </span>
                ) : (
                  results.ranking.map((row) => <RankingRow key={row.participantId} row={row} />)
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {/* پانوشت کوچک — شناسه چالش برای پشتیبانی */}
      <span style={{ fontSize: 10, fontWeight: 600, color: colors.inkFaint, textAlign: "end" }}>
        {challengeModeLabel(challenge.mode, L)} · #{localizedDigits(challenge.id, lang)}
      </span>
    </section>
  );
}
