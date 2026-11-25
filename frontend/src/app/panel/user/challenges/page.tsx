'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/web/ui';
import { PanelButton, PanelPageHeader } from '@/components/panel/PanelUI';
import { fullUrl } from '@/lib/auth';
import { toFaDigits } from '@/lib/persian';

/* ─────────────────────────── انواع قرارداد backend ─────────────────────────── */

type ChallengeMode = 'audio' | 'description';
type ChallengeStatus = 'registration' | 'active' | 'judging' | 'finished' | 'canceled';

type Challenge = {
  id: number;
  title: string;
  description: string;
  mode: ChallengeMode;
  audio_url: string;
  audio_teacher_name: string;
  capacity: number;
  duration_hours: number;
  voting_hours: number;
  weight_audience: number;
  weight_judges: number;
  weight_admin: number;
  status: ChallengeStatus;
  started_at?: string;
  submission_deadline?: string;
  voting_deadline?: string;
  published_at?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
};

type ChallengeListItem = Challenge & { participants_count: number; joined: boolean };

type Participant = {
  id: number;
  challenge_id: number;
  user_id: number;
  status: 'joined' | 'submitted';
  submission_text: string;
  submission_audio_url: string;
  submitted_at?: string;
  admin_score: number;
  audience_votes: number;
  judge_votes: number;
  audience_score: number;
  judge_score: number;
  final_score: number;
  rank: number;
  points_join: number;
  points_bonus: number;
  created_at: string;
  updated_at: string;
};

type SubmissionView = {
  participant_id: number;
  user_id: number;
  name: string;
  avatar_url: string;
  text: string;
  audio_url: string;
  audience_votes: number;
  judge_votes: number;
  my_vote: boolean;
  rank?: number;
};

type ChallengeDetailData = {
  challenge: Challenge;
  participants_count: number;
  joined: boolean;
  my_participant?: Participant;
  submissions?: SubmissionView[];
};

type RankRow = {
  rank: number;
  participant_id: number;
  user_id: number;
  name: string;
  avatar_url: string;
  audience_votes: number;
  judge_votes: number;
  admin_score: number;
  audience_score: number;
  judge_score: number;
  final_score: number;
  points_bonus: number;
  is_me?: boolean;
};

type PointLedger = {
  id: number;
  user_id: number;
  amount: number;
  balance_after: number;
  reason: 'challenge_join' | 'challenge_rank' | 'admin_grant';
  ref_id: number;
  created_at: string;
};

type PointsData = { balance: number; ledger: PointLedger[] };

type ResultsData = {
  challenge: Challenge;
  ranking: RankRow[];
  me?: RankRow;
  points?: { balance: number; ledger: PointLedger[] };
};

/* ─────────────────────────── برچسب‌ها و کمکی‌ها ─────────────────────────── */

const PHASE_META: Record<ChallengeStatus, { label: string; tone: string }> = {
  registration: { label: 'ثبت‌نام', tone: 'gold' },
  active: { label: 'در حال اجرا', tone: 'green' },
  judging: { label: 'رأی‌گیری', tone: 'info' },
  finished: { label: 'پایان‌یافته', tone: 'olive' },
  canceled: { label: 'لغوشده', tone: 'rose' },
};

const MODE_LABEL: Record<ChallengeMode, string> = {
  audio: 'با مقطع صوتی استاد',
  description: 'فقط توضیحات',
};

const REASON_LABEL: Record<PointLedger['reason'], string> = {
  challenge_join: 'امتیاز شرکت در چالش',
  challenge_rank: 'پاداش رتبه در چالش',
  admin_grant: 'امتیاز مدیریت',
};

const AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/x-wav', 'audio/x-m4a'];

function faDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

function signedAmount(amount: number): string {
  return amount >= 0 ? `+${toFaDigits(amount)}` : toFaDigits(amount);
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error || 'خطا در ارتباط با سرور');
  return (body as { data: T }).data;
}

const clampPercent = (count: number, capacity: number) => {
  if (!capacity) return 0;
  return Math.min(100, Math.round((count / capacity) * 100));
};

/* ─────────────────────────── صفحه چالش‌های قرآنی ─────────────────────────── */

export default function UserChallengesPage() {
  const [points, setPoints] = useState<PointsData | null>(null);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [rows, setRows] = useState<ChallengeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ChallengeDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinNotice, setJoinNotice] = useState('');
  const [subText, setSubText] = useState('');
  const [subFile, setSubFile] = useState<File | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitNotice, setSubmitNotice] = useState('');
  const [voteBusy, setVoteBusy] = useState<number | null>(null);

  const [results, setResults] = useState<ResultsData | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPoints = useCallback(async () => {
    try {
      const data = await apiJson<PointsData>('/api/backend/me/points');
      setPoints(data);
    } catch {
      /* امتیاز نمایش جانبی است؛ خطای آن چالش‌ها را مسدود نمی‌کند */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiJson<ChallengeListItem[]>('/api/backend/challenges');
      setRows(data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'فهرست چالش‌ها دریافت نشد.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void loadPoints();
  }, [load, loadPoints]);

  async function refetchDetail(id: number) {
    try {
      const data = await apiJson<ChallengeDetailData>(`/api/backend/challenges/${id}`);
      setDetail(data);
    } catch {
      /* نمای فعلی حفظ می‌شود؛ خطای تازه‌سازی غیرحیاتی است */
    }
  }

  async function openDetail(id: number) {
    setSelectedId(id);
    setDetail(null);
    setResults(null);
    setResultsError('');
    setJoinNotice('');
    setSubmitNotice('');
    setDetailError('');
    setSubText('');
    setSubFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setDetailLoading(true);
    try {
      const data = await apiJson<ChallengeDetailData>(`/api/backend/challenges/${id}`);
      setDetail(data);
      if (data.my_participant) setSubText(data.my_participant.submission_text || '');
      if (data.challenge.status === 'finished') await loadResults(id);
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'جزئیات چالش دریافت نشد.');
    } finally {
      setDetailLoading(false);
    }
  }

  function backToList() {
    setSelectedId(null);
    setDetail(null);
    setResults(null);
    setResultsError('');
    setJoinNotice('');
    setSubmitNotice('');
    void load();
  }

  async function loadResults(id: number) {
    setResultsLoading(true);
    setResultsError('');
    setResults(null);
    try {
      const data = await apiJson<ResultsData>(`/api/backend/challenges/${id}/results`);
      setResults(data);
      const nextPoints = data.points;
      if (nextPoints) setPoints((current) => ({ balance: nextPoints.balance, ledger: current?.ledger ?? [] }));
    } catch (cause) {
      setResults(null);
      setResultsError(cause instanceof Error ? cause.message : 'نتایج چالش دریافت نشد.');
    } finally {
      setResultsLoading(false);
    }
  }

  async function join() {
    if (!detail || joinBusy) return;
    setJoinBusy(true);
    setDetailError('');
    try {
      await apiJson<{ participant: Participant; started: boolean }>(`/api/backend/challenges/${detail.challenge.id}/join`, { method: 'POST' });
      setJoinNotice('۱۰ امتیاز اینستاقرآن برای ثبت‌نام شما ثبت شد.');
      await refetchDetail(detail.challenge.id);
      void loadPoints();
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'ثبت‌نام در چالش انجام نشد.');
    } finally {
      setJoinBusy(false);
    }
  }

  async function submitWork() {
    if (!detail || submitBusy) return;
    const text = subText.trim();
    if (!text && !subFile) {
      setDetailError('متن اثر یا فایل صوتی آن را ارسال کنید؛ حداقل یکی لازم است.');
      return;
    }
    if (subFile && subFile.size > 5 * 1024 * 1024) {
      setDetailError('حجم فایل صوتی نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }
    if (subFile) {
      const kind = subFile.type || '';
      if (kind && !kind.startsWith('audio/') && !AUDIO_TYPES.includes(kind)) {
        setDetailError('قالب فایل باید صوتی باشد (webm/ogg/mp3/m4a/wav).');
        return;
      }
    }
    setSubmitBusy(true);
    setDetailError('');
    try {
      const data = new FormData();
      if (subFile) data.append('file', subFile);
      if (text) data.append('text', text);
      await apiJson<Participant>(`/api/backend/challenges/${detail.challenge.id}/submission`, { method: 'POST', body: data });
      setSubFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSubmitNotice('اثر شما با موفقیت ثبت شد؛ تا پایان مهلت می‌توانید آن را به‌روزرسانی کنید.');
      await refetchDetail(detail.challenge.id);
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'ارسال اثر انجام نشد.');
    } finally {
      setSubmitBusy(false);
    }
  }

  async function vote(participantId: number) {
    if (!detail || voteBusy !== null) return;
    setVoteBusy(participantId);
    setDetailError('');
    try {
      await apiJson<{ voted: boolean }>(`/api/backend/challenges/${detail.challenge.id}/vote`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ participant_id: participantId }),
      });
      await refetchDetail(detail.challenge.id);
    } catch (cause) {
      setDetailError(cause instanceof Error ? cause.message : 'ثبت رأی انجام نشد.');
    } finally {
      setVoteBusy(null);
    }
  }

  const ledgerRows = (points?.ledger || []).slice(0, 20);

  return (
    <div className="user-challenges">
      <PanelPageHeader
        eyebrow="مسابقه‌های قرآنی"
        title="چالش‌های قرآنی"
        description="در چالش‌های قرآنی شرکت کنید، اثر خود را ثبت کنید و با رأی مخاطبان، اساتید داور و مدیریت امتیاز اینستاقرآن کسب کنید."
        actions={
          <button
            type="button"
            className="ops-button"
            data-tone="primary"
            aria-expanded={pointsOpen}
            onClick={() => setPointsOpen((value) => !value)}
            style={{ fontSize: 12.5 }}
          >
            <Icon name="coins" size={15} />
            امتیاز اینستاقرآن شما: {points ? toFaDigits(points.balance) : '…'}
            <Icon name="chevronUp" size={13} style={{ opacity: .6, transform: pointsOpen ? undefined : 'rotate(180deg)' }} />
          </button>
        }
      />

      {pointsOpen && (
        <section aria-label="کارنامهٔ امتیاز اینستاقرآن" style={{ margin: '0 0 18px', padding: 16, border: '1px solid var(--sand-150)', borderRadius: 18, background: 'var(--gold-bg)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
            <strong style={{ fontSize: 13, color: '#8d6d1f', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="star" size={16} fill /> موجودی امتیاز: {points ? toFaDigits(points.balance) : '—'}
            </strong>
            <span style={{ fontSize: 10.5, color: '#8d6d1f' }}>
              شرکت در هر چالش +۱۰ · پاداش رتبه‌ها: اول ۱۰۰، دوم ۷۰، سوم ۵۰، چهارم ۳۰، پنجم ۲۰
            </span>
          </div>
          {!points ? (
            <div style={{ color: '#8d6d1f', fontSize: 11.5 }}>در حال دریافت کارنامهٔ امتیاز…</div>
          ) : ledgerRows.length === 0 ? (
            <div style={{ color: '#8d6d1f', fontSize: 11.5 }}>تا کنون تراکنش امتیازی ثبت نشده است؛ با ثبت‌نام در نخستین چالش ۱۰ امتیاز بگیرید.</div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {ledgerRows.map((row) => (
                <div key={row.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '8px 11px', borderRadius: 12, background: '#fff', border: '1px solid #e8d9a8', fontSize: 11.5 }}>
                  <span style={{ fontWeight: 800, color: row.amount >= 0 ? 'var(--olive-700)' : 'var(--rose)', minWidth: 44 }}>{signedAmount(row.amount)}</span>
                  <span style={{ flex: 1, minWidth: 120, fontWeight: 600 }}>{REASON_LABEL[row.reason] || 'امتیاز'}</span>
                  <span style={{ color: 'var(--ink-3)' }}>موجودی: {toFaDigits(row.balance_after)}</span>
                  <span style={{ color: 'var(--ink-3)', fontSize: 10.5 }}>{faDateTime(row.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {selectedId !== null ? (
        /* ── نمای جزئیات چالش ── */
        <section aria-label="جزئیات چالش">
          <div style={{ marginBottom: 14 }}>
            <PanelButton icon="arrowL" onClick={backToList}>بازگشت به چالش‌ها</PanelButton>
          </div>

          {detailError && (
            <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px', padding: '10px 14px', borderRadius: 12, background: '#fbeeec', color: '#a1453d', fontSize: 12.5, fontWeight: 600 }}>
              <Icon name="info" size={16} /> {detailError}
            </div>
          )}
          {joinNotice && (
            <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px', padding: '10px 14px', borderRadius: 12, background: 'var(--olive-100)', color: 'var(--olive-700)', fontSize: 12.5, fontWeight: 600 }}>
              <Icon name="checkCircle" size={16} /> {joinNotice}
            </div>
          )}
          {submitNotice && (
            <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px', padding: '10px 14px', borderRadius: 12, background: 'var(--olive-100)', color: 'var(--olive-700)', fontSize: 12.5, fontWeight: 600 }}>
              <Icon name="checkCircle" size={16} /> {submitNotice}
            </div>
          )}

          {detailLoading ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div className="adm-skeleton" style={{ height: 150, borderRadius: 18 }} />
              <div className="adm-skeleton" style={{ height: 210, borderRadius: 18 }} />
            </div>
          ) : detail ? (
            <ChallengeDetail
              data={detail}
              subText={subText}
              setSubText={setSubText}
              subFile={subFile}
              setSubFile={setSubFile}
              fileInputRef={fileInputRef}
              joinBusy={joinBusy}
              submitBusy={submitBusy}
              voteBusy={voteBusy}
              onJoin={() => void join()}
              onSubmit={() => void submitWork()}
              onVote={(participantId) => void vote(participantId)}
              results={results}
              resultsLoading={resultsLoading}
              resultsError={resultsError}
              onReloadResults={() => detail && void loadResults(detail.challenge.id)}
              balance={points?.balance ?? results?.points?.balance}
            />
          ) : (
            <div style={{ padding: 24, textAlign: 'center', border: '1px dashed var(--sand-200)', borderRadius: 18, background: '#fff' }}>
              <strong style={{ display: 'block', fontSize: 13 }}>جزئیات چالش دریافت نشد</strong>
              <div style={{ marginTop: 10 }}>
                <PanelButton icon="refresh" onClick={() => selectedId !== null && void openDetail(selectedId)}>تلاش دوباره</PanelButton>
              </div>
            </div>
          )}
        </section>
      ) : (
        /* ── فهرست چالش‌ها ── */
        <section aria-label="فهرست چالش‌ها">
          {error && (
            <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '0 0 14px', padding: '10px 14px', borderRadius: 12, background: '#fbeeec', color: '#a1453d', fontSize: 12.5, fontWeight: 600 }}>
              <Icon name="info" size={16} /> <span style={{ flex: 1, minWidth: 160 }}>{error}</span>
              <PanelButton icon="refresh" onClick={() => void load()}>تلاش دوباره</PanelButton>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="adm-skeleton" style={{ height: 190, borderRadius: 18 }} />
              ))}
            </div>
          ) : rows.length === 0 && !error ? (
            <div style={{ padding: 30, textAlign: 'center', border: '1px dashed var(--sand-200)', borderRadius: 18, background: '#fff' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, margin: '0 auto 10px', borderRadius: 14, color: 'var(--olive-700)', background: 'var(--olive-100)' }}>
                <Icon name="sparkle" size={22} />
              </span>
              <strong style={{ display: 'block', fontSize: 13 }}>هنوز چالشی برگزار نشده است</strong>
              <p style={{ margin: '6px 0 0', color: 'var(--ink-3)', fontSize: 11.5 }}>به‌محض برگزاری نخستین چالش، اینجا به شما اطلاع داده می‌شود.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
              {rows.map((row) => {
                const percent = clampPercent(row.participants_count, row.capacity);
                return (
                  <article key={row.id} style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: 15, border: '1px solid var(--sand-150)', borderRadius: 18, background: '#fff' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 38, height: 38, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 12, color: 'var(--olive-700)', background: 'var(--olive-100)' }}>
                        <Icon name={row.mode === 'audio' ? 'mic' : 'quran'} size={18} />
                      </span>
                      <strong style={{ fontSize: 13, flex: 1, minWidth: 120 }}>{row.title}</strong>
                      {row.joined && (
                        <span className="adm-badge" data-tone="green"><Icon name="check" size={10} /> ثبت‌نام کرده‌اید</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <span className="adm-badge" data-tone={PHASE_META[row.status].tone}>{PHASE_META[row.status].label}</span>
                      <span className="adm-badge" data-tone="muted">{MODE_LABEL[row.mode]}</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 11.5, lineHeight: 1.9, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {row.description}
                    </p>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{toFaDigits(row.participants_count)} از {toFaDigits(row.capacity)}</span> نفر ثبت‌نام کرده‌اند
                      <span aria-hidden="true" style={{ display: 'block', height: 5, marginTop: 5, borderRadius: 999, background: 'var(--sand-150)', overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${percent}%`, borderRadius: 999, background: 'var(--olive-500)' }} />
                      </span>
                    </div>
                    {row.mode === 'audio' && row.audio_url && (
                      <div style={{ display: 'grid', gap: 4 }}>
                        <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                          مقطع صوتی استاد{row.audio_teacher_name ? `: ${row.audio_teacher_name}` : ''}
                        </span>
                        <audio controls src={fullUrl(row.audio_url) || row.audio_url} style={{ width: '100%', height: 36 }} aria-label={`مقطع صوتی چالش ${row.title}`} />
                      </div>
                    )}
                    <div style={{ marginTop: 'auto' }}>
                      <PanelButton tone="primary" icon="arrowUpRight" style={{ width: '100%', justifyContent: 'center' }} onClick={() => void openDetail(row.id)}>
                        مشاهده و شرکت
                      </PanelButton>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <style>{`
        .adm-skeleton{background:linear-gradient(90deg,var(--sand-100) 25%,var(--sand-50) 50%,var(--sand-100) 75%);background-size:200% 100%;animation:adm-skeleton-move 1.3s infinite}
        @keyframes adm-skeleton-move{from{background-position:200% 0}to{background-position:-200% 0}}
        @media (max-width:560px){
          .user-challenges audio{height:34px}
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────── نمای جزئیات چالش ─────────────────────────── */

function ChallengeDetail({
  data,
  subText,
  setSubText,
  subFile,
  setSubFile,
  fileInputRef,
  joinBusy,
  submitBusy,
  voteBusy,
  onJoin,
  onSubmit,
  onVote,
  results,
  resultsLoading,
  resultsError,
  onReloadResults,
  balance,
}: {
  data: ChallengeDetailData;
  subText: string;
  setSubText: (value: string) => void;
  subFile: File | null;
  setSubFile: (file: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  joinBusy: boolean;
  submitBusy: boolean;
  voteBusy: number | null;
  onJoin: () => void;
  onSubmit: () => void;
  onVote: (participantId: number) => void;
  results: ResultsData | null;
  resultsLoading: boolean;
  resultsError: string;
  onReloadResults: () => void;
  balance?: number;
}) {
  const { challenge, my_participant, submissions } = data;
  const joined = data.joined || Boolean(my_participant);
  const isOwnRow = (submission: SubmissionView) => my_participant?.id === submission.participant_id;
  const deadlinePassed = Boolean(challenge.submission_deadline && Date.now() > new Date(challenge.submission_deadline).getTime());

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section style={{ padding: 17, border: '1px solid var(--sand-150)', borderRadius: 18, background: '#fff' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <strong style={{ fontSize: 15 }}>{challenge.title}</strong>
          <span className="adm-badge" data-tone={PHASE_META[challenge.status].tone}>{PHASE_META[challenge.status].label}</span>
          <span className="adm-badge" data-tone="muted">{MODE_LABEL[challenge.mode]}</span>
        </div>
        <p style={{ margin: '0 0 10px', color: '#565247', fontSize: 12, lineHeight: 2, whiteSpace: 'pre-wrap' }}>{challenge.description}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--ink-3)' }}>
          <span><Icon name="users" size={12} /> {toFaDigits(data.participants_count)} از {toFaDigits(challenge.capacity)} نفر</span>
          <span><Icon name="clock" size={12} /> مهلت ارسال: {toFaDigits(challenge.duration_hours)} ساعت · رأی‌گیری: {toFaDigits(challenge.voting_hours)} ساعت</span>
          {challenge.submission_deadline && <span><Icon name="calendar" size={12} /> پایان مهلت ارسال: {faDateTime(challenge.submission_deadline)}</span>}
          <span>وزن‌ها: مخاطبان {toFaDigits(challenge.weight_audience)}٪ · داوران {toFaDigits(challenge.weight_judges)}٪ · مدیریت {toFaDigits(challenge.weight_admin)}٪</span>
        </div>
        {challenge.mode === 'audio' && challenge.audio_url && (
          <div style={{ marginTop: 11, padding: 12, borderRadius: 14, background: 'var(--gold-bg)', border: '1px solid #e8d9a8' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#8d6d1f', marginBottom: 6 }}>
              مقطع صوتی استاد{challenge.audio_teacher_name ? ` — ${challenge.audio_teacher_name}` : ''}
            </div>
            <audio controls src={fullUrl(challenge.audio_url) || challenge.audio_url} style={{ width: '100%', maxWidth: 440 }} aria-label="مقطع صوتی استاد چالش" />
          </div>
        )}
      </section>

      {challenge.status === 'canceled' && (
        <div style={{ padding: 14, borderRadius: 14, background: '#f7e6e6', color: 'var(--rose)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="info" size={15} /> این چالش لغو شده است.
        </div>
      )}

      {challenge.status === 'registration' && (
        <section style={{ padding: 17, border: '1px solid var(--sand-150)', borderRadius: 18, background: '#fff', textAlign: 'center' }}>
          {joined ? (
            <>
              <span className="adm-badge" data-tone="green" style={{ fontSize: 12, padding: '6px 14px' }}>
                <Icon name="checkCircle" size={13} /> ثبت‌نام شد
              </span>
              <p style={{ margin: '9px 0 0', color: 'var(--ink-3)', fontSize: 11.5 }}>
                ثبت‌نام شما در این چالش قطعی شد؛ با شروع چالش، بخش ارسال اثر برای شما فعال می‌شود.
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 12px', color: 'var(--ink-3)', fontSize: 11.5 }}>
                با ثبت‌نام در این چالش ۱۰ امتیاز اینستاقرآن می‌گیرید و ظرفیت شما رزرو می‌شود.
              </p>
              <PanelButton tone="primary" icon="sparkle" disabled={joinBusy} onClick={onJoin} style={{ minWidth: 220, justifyContent: 'center' }}>
                {joinBusy ? 'در حال ثبت‌نام…' : 'ثبت‌نام در چالش'}
              </PanelButton>
            </>
          )}
        </section>
      )}

      {challenge.status === 'active' && (
        <section style={{ padding: 17, border: '1px solid var(--sand-150)', borderRadius: 18, background: '#fff' }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 13.5, fontWeight: 800 }}>ارسال اثر</h2>
          {!joined ? (
            <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 11.5 }}>در این چالش ثبت‌نام نکرده‌اید و مهلت ثبت‌نام به پایان رسیده است.</p>
          ) : deadlinePassed ? (
            <p style={{ margin: 0, color: 'var(--clay)', background: 'var(--clay-bg)', borderRadius: 11, padding: '9px 12px', fontSize: 11.5 }}>
              مهلت ارسال اثر به پایان رسیده است{challenge.submission_deadline ? ` (${faDateTime(challenge.submission_deadline)})` : ''}؛ منتظر مرحلهٔ رأی‌گیری بمانید.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {challenge.submission_deadline && (
                <div style={{ fontSize: 11.5, color: '#8d6d1f', background: 'var(--gold-bg)', border: '1px solid #e8d9a8', borderRadius: 11, padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                  <Icon name="clock" size={13} /> مهلت ارسال: {faDateTime(challenge.submission_deadline)}
                </div>
              )}
              {my_participant?.status === 'submitted' && (
                <div style={{ padding: 12, borderRadius: 13, background: 'var(--olive-50)', border: '1px solid var(--olive-200)', display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--olive-700)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="checkCircle" size={14} /> اثر ثبت‌شدهٔ فعلی شما
                    {my_participant.submitted_at && <span style={{ fontWeight: 500, color: 'var(--ink-3)' }}>· {faDateTime(my_participant.submitted_at)}</span>}
                  </span>
                  {my_participant.submission_text && (
                    <span style={{ fontSize: 11.5, color: '#565247', whiteSpace: 'pre-wrap' }}>{my_participant.submission_text}</span>
                  )}
                  {my_participant.submission_audio_url && (
                    <audio controls src={fullUrl(my_participant.submission_audio_url) || my_participant.submission_audio_url} style={{ width: '100%', maxWidth: 380, height: 36 }} aria-label="اثر صوتی ثبت‌شدهٔ شما" />
                  )}
                  <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>می‌توانید تا پایان مهلت، اثر خود را دوباره ارسال و جایگزین کنید.</span>
                </div>
              )}
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
                اثر شما
                <textarea
                  rows={4}
                  value={subText}
                  onChange={(event) => setSubText(event.target.value)}
                  placeholder="روخوانی، خلاصهٔ درک آیه یا توضیح اثر خود را بنویسید…"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--sand-200)', borderRadius: 11, font: 'inherit', fontSize: 12.5, color: 'var(--ink)', background: '#fff', resize: 'vertical', lineHeight: 1.9 }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
                فایل صوتی اثر (اختیاری — webm/ogg/mp3/m4a/wav، حداکثر ۵ مگابایت)
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
                  <PanelButton type="button" icon="mic" onClick={() => fileInputRef.current?.click()}>
                    انتخاب فایل صوتی
                  </PanelButton>
                  {subFile && (
                    <span className="adm-badge" data-tone="green">
                      {subFile.name.length > 28 ? `${subFile.name.slice(0, 28)}…` : subFile.name}
                    </span>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/wav,audio/*"
                    style={{ display: 'none' }}
                    onChange={(event) => setSubFile(event.target.files?.[0] ?? null)}
                  />
                </span>
              </label>
              <PanelButton tone="primary" icon="check" disabled={submitBusy} onClick={onSubmit} style={{ justifyContent: 'center' }}>
                {submitBusy ? 'در حال ارسال…' : my_participant?.status === 'submitted' ? 'به‌روزرسانی اثر' : 'ارسال اثر'}
              </PanelButton>
            </div>
          )}
        </section>
      )}

      {challenge.status === 'judging' && (
        <section style={{ padding: 17, border: '1px solid var(--sand-150)', borderRadius: 18, background: '#fff' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 800 }}>آثار شرکت‌کنندگان و رأی‌گیری</h2>
          <p style={{ margin: '0 0 12px', color: 'var(--ink-3)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="award" size={13} /> رأی شما به‌عنوان استاد داور ثبت می‌شود؛ در کنار رأی مخاطبان و نظر مدیریت لحاظ می‌شود.
          </p>
          {(submissions || []).length === 0 ? (
            <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 11.5 }}>هنوز اثری برای نمایش ثبت نشده است.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {(submissions || []).map((submission) => {
                const own = isOwnRow(submission);
                return (
                  <article key={submission.participant_id} style={{ display: 'flex', flexWrap: 'wrap', gap: 11, padding: 12, borderRadius: 14, border: '1px solid var(--sand-150)', background: own ? 'var(--olive-50)' : '#fff', alignItems: 'flex-start' }}>
                    <Avatar size={42} imageUrl={fullUrl(submission.avatar_url)} name={submission.name} />
                    <div style={{ minWidth: 170, flex: 1 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 7 }}>
                        <strong style={{ fontSize: 12.5 }}>{own ? 'اثر شما' : submission.name}</strong>
                        {own && <span className="adm-badge" data-tone="olive">شرکت‌کنندهٔ این اثر هستید</span>}
                      </div>
                      {submission.text && (
                        <p style={{ margin: '5px 0 0', fontSize: 11.5, color: '#565247', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{submission.text}</p>
                      )}
                      {submission.audio_url && (
                        <audio controls src={fullUrl(submission.audio_url) || submission.audio_url} style={{ width: '100%', maxWidth: 340, height: 34, marginTop: 6 }} aria-label={`اثر صوتی ${own ? 'شما' : submission.name}`} />
                      )}
                    </div>
                    <div style={{ display: 'grid', gap: 5, justifyItems: 'end' }}>
                      {own ? (
                        <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>به اثر خود نمی‌توانید رأی دهید</span>
                      ) : submission.my_vote ? (
                        <span className="adm-badge" data-tone="green" style={{ fontSize: 11, padding: '5px 11px' }}>
                          <Icon name="checkCircle" size={12} /> رأی دادید
                        </span>
                      ) : (
                        <PanelButton tone="primary" icon="check" disabled={voteBusy !== null} onClick={() => onVote(submission.participant_id)}>
                          {voteBusy === submission.participant_id ? 'در حال ثبت…' : 'رأی'}
                        </PanelButton>
                      )}
                      <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{toFaDigits(submission.audience_votes || 0)} رأی مخاطبان · {toFaDigits(submission.judge_votes || 0)} رأی داوران</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {challenge.status === 'finished' && (
        <section style={{ padding: 17, border: '1px solid var(--sand-150)', borderRadius: 18, background: '#fff' }} aria-label="نتایج چالش">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 13.5, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name="award" size={16} /> اعلان نتایج
            </h2>
            <PanelButton icon="refresh" onClick={onReloadResults}>به‌روزرسانی نتایج</PanelButton>
          </div>

          {resultsLoading && (
            <div className="adm-skeleton" style={{ height: 160, borderRadius: 14 }} />
          )}

          {!resultsLoading && resultsError && (
            <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: '#fbeeec', color: '#a1453d', fontSize: 12, fontWeight: 600 }}>
              <Icon name="info" size={15} /> {resultsError}
            </div>
          )}

          {!resultsLoading && !resultsError && results && (
            <div style={{ display: 'grid', gap: 14 }}>
              {results.ranking.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 11.5 }}>هنوز فهرست رتبه‌ها برای این چالش ثبت نشده است.</p>
              ) : (
              <div style={{ overflowX: 'auto', border: '1px solid var(--sand-150)', borderRadius: 14 }}>
                <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: 11.5 }}>
                  <thead>
                    <tr style={{ background: 'var(--sand-100)' }}>
                      <th style={thStyle}>رتبه</th>
                      <th style={thStyle}>شرکت‌کننده</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>رأی مخاطبان</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>رأی اساتید داور</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>نظر مدیریت</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>امتیاز نهایی</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.ranking.map((row) => (
                      <tr key={row.participant_id} style={{ borderTop: '1px solid var(--sand-100)', background: row.is_me ? 'var(--olive-50)' : undefined }}>
                        <td style={tdStyle}>
                          <RankBadge rank={row.rank} />
                        </td>
                        <td style={tdStyle}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar size={30} imageUrl={fullUrl(row.avatar_url)} name={row.name} />
                            <strong style={{ fontSize: 11.5 }}>{row.name}{row.is_me ? ' (شما)' : ''}</strong>
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {toFaDigits(row.audience_score)}
                          <small style={{ display: 'block', color: 'var(--ink-3)', fontSize: 10 }}>{toFaDigits(row.audience_votes || 0)} رأی</small>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {toFaDigits(row.judge_score)}
                          <small style={{ display: 'block', color: 'var(--ink-3)', fontSize: 10 }}>{toFaDigits(row.judge_votes || 0)} رأی</small>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{toFaDigits(row.admin_score)}</td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800 }}>{toFaDigits(row.final_score)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}

              {results.me ? (
                <div style={{ padding: 15, borderRadius: 15, background: 'var(--gold-bg)', border: '1px solid #e8d9a8' }} aria-label="کارنامهٔ شما در چالش">
                  <strong style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: '#8d6d1f', marginBottom: 9 }}>
                    <Icon name="star" size={15} fill /> کارنامهٔ شما در این چالش
                  </strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 9 }}>
                    <ScoreBox label="رتبهٔ شما" value={results.me.rank > 0 ? `رتبهٔ ${toFaDigits(results.me.rank)}` : '—'} />
                    <ScoreBox label="رأی مخاطبان" value={toFaDigits(results.me.audience_score)} hint={`${toFaDigits(results.me.audience_votes || 0)} رأی`} />
                    <ScoreBox label="رأی اساتید داور" value={toFaDigits(results.me.judge_score)} hint={`${toFaDigits(results.me.judge_votes || 0)} رأی`} />
                    <ScoreBox label="نظر مدیریت" value={toFaDigits(results.me.admin_score)} />
                    <ScoreBox label="امتیاز نهایی" value={toFaDigits(results.me.final_score)} tone />
                    <ScoreBox label="امتیاز پاداش رتبه" value={`+${toFaDigits(results.me.points_bonus || 0)}`} />
                  </div>
                  {typeof balance === 'number' && (
                    <div style={{ marginTop: 10, fontSize: 11.5, fontWeight: 700, color: '#8d6d1f', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="coins" size={14} /> موجودی کل امتیاز اینستاقرآن شما: {toFaDigits(balance)}
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 11.5 }}>
                  در این چالش شرکت نکرده‌اید؛ برای دیدن کارنامهٔ شخصی در چالش‌های بعدی ثبت‌نام کنید.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {challenge.status === 'active' && joined && my_participant?.status !== 'submitted' && (
        <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 10.5 }}>
          نکته: ارسال اثر فقط تا پایان مهلت ممکن است؛ پس از آن چالش به فاز رأی‌گیری می‌رود.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────── اجزای کوچک نتایج ─────────────────────────── */

function RankBadge({ rank }: { rank: number }) {
  const top = rank >= 1 && rank <= 5;
  const medal = rank === 1
    ? { color: '#8d6d1f', background: 'var(--gold-bg)', border: '1px solid #e0c878' }
    : rank === 2
      ? { color: '#5d5d5d', background: '#efefef', border: '1px solid #d9d9d9' }
      : rank === 3
        ? { color: 'var(--clay)', background: 'var(--clay-bg)', border: '1px solid #e5c6b6' }
        : { color: 'var(--olive-700)', background: 'var(--olive-100)', border: '1px solid var(--olive-200)' };
  return (
    <span
      className="adm-badge"
      style={top ? { ...medal, fontSize: 11, padding: '4px 11px' } : undefined}
      data-tone={top ? undefined : 'muted'}
    >
      {top && <Icon name="award" size={11} />}
      رتبهٔ {toFaDigits(rank)}
    </span>
  );
}

function ScoreBox({ label, value, hint, tone = false }: { label: string; value: string; hint?: string; tone?: boolean }) {
  return (
    <div style={{ padding: '9px 11px', borderRadius: 12, background: '#fff', border: tone ? '1px solid #e0c878' : '1px solid #e8d9a8' }}>
      <small style={{ display: 'block', fontSize: 10, color: '#8d6d1f', fontWeight: 700 }}>{label}</small>
      <strong style={{ display: 'block', fontSize: 13, marginTop: 2, color: tone ? '#8d6d1f' : 'var(--ink)' }}>{value}</strong>
      {hint && <small style={{ display: 'block', fontSize: 9.5, color: 'var(--ink-3)' }}>{hint}</small>}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '9px 11px', fontSize: 11, fontWeight: 800, color: '#565247', whiteSpace: 'nowrap', textAlign: 'start' };
const tdStyle: React.CSSProperties = { padding: '9px 11px', verticalAlign: 'top', color: 'var(--ink)' };
