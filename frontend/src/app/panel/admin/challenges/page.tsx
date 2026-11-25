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

type AdminChallengeRow = Challenge & { participants_count: number };

type AdminParticipantRow = {
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
  name: string;
  mobile: string;
  avatar_url: string;
};

type ChallengeForm = {
  id: number | null;
  title: string;
  description: string;
  mode: ChallengeMode;
  audio_url: string;
  audio_teacher_name: string;
  capacity: string;
  duration_hours: string;
  voting_hours: string;
  weight_audience: string;
  weight_judges: string;
  weight_admin: string;
};

const EMPTY_FORM: ChallengeForm = {
  id: null,
  title: '',
  description: '',
  mode: 'audio',
  audio_url: '',
  audio_teacher_name: '',
  capacity: '30',
  duration_hours: '72',
  voting_hours: '48',
  weight_audience: '',
  weight_judges: '',
  weight_admin: '',
};

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

/* ─────────────────────────── کمکی‌ها ─────────────────────────── */

function faDateTime(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error || 'خطا در ارتباط با سرور');
  return (body as { data: T }).data;
}

/* ─────────────────────────── صفحه مدیریت چالش‌ها ─────────────────────────── */

export default function AdminChallengesPage() {
  const [rows, setRows] = useState<AdminChallengeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<ChallengeForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<{ challenge: Challenge; participants: AdminParticipantRow[] } | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<number, string>>({});
  const [savingScore, setSavingScore] = useState<number | null>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiJson<AdminChallengeRow[]>('/api/backend/admin/challenges');
      setRows(data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'فهرست چالش‌ها دریافت نشد.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3600);
  }

  function openNew() {
    setError('');
    setDetailId(null);
    setDetail(null);
    setForm({ ...EMPTY_FORM });
  }

  function openEdit(row: AdminChallengeRow) {
    setError('');
    setDetailId(null);
    setDetail(null);
    setForm({
      id: row.id,
      title: row.title,
      description: row.description,
      mode: row.mode,
      audio_url: row.audio_url || '',
      audio_teacher_name: row.audio_teacher_name || '',
      capacity: String(row.capacity),
      duration_hours: String(row.duration_hours || 72),
      voting_hours: String(row.voting_hours || 48),
      weight_audience: String(row.weight_audience ?? ''),
      weight_judges: String(row.weight_judges ?? ''),
      weight_admin: String(row.weight_admin ?? ''),
    });
  }

  function closeForm() {
    setForm(null);
    if (audioFileRef.current) audioFileRef.current.value = '';
  }

  /* ساخت payload دقیقاً مطابق قرارداد backend — فیلد ناشناخته ارسال نمی‌شود. */
  function buildPayload(current: ChallengeForm): { ok: true; payload: Record<string, unknown> } | { ok: false; message: string } {
    const title = current.title.trim();
    const description = current.description.trim();
    if (title.length < 3) return { ok: false, message: 'عنوان چالش باید حداقل ۳ نویسه باشد.' };
    if (!description) return { ok: false, message: 'هر چالش باید توضیحات کامل داشته باشد.' };

    const capacity = Number(current.capacity);
    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 500) {
      return { ok: false, message: 'ظرفیت چالش باید عددی بین ۲ تا ۵۰۰ باشد.' };
    }

    const payload: Record<string, unknown> = {
      title,
      description,
      mode: current.mode,
      capacity,
    };

    if (current.mode === 'audio') {
      if (!current.audio_url.trim()) return { ok: false, message: 'برای حالت «با مقطع صوتی استاد» ابتدا فایل صوتی را بارگذاری کنید.' };
      payload.audio_url = current.audio_url.trim();
      const teacherName = current.audio_teacher_name.trim();
      if (teacherName) payload.audio_teacher_name = teacherName;
    }

    const duration = current.duration_hours.trim();
    if (duration) {
      const value = Number(duration);
      if (!Number.isInteger(value) || value < 1 || value > 720) return { ok: false, message: 'مهلت ارسال اثر باید عددی بین ۱ تا ۷۲۰ ساعت باشد.' };
      payload.duration_hours = value;
    }

    const voting = current.voting_hours.trim();
    if (voting) {
      const value = Number(voting);
      if (!Number.isInteger(value) || value < 1 || value > 336) return { ok: false, message: 'مهلت رأی‌گیری باید عددی بین ۱ تا ۳۳۶ ساعت باشد.' };
      payload.voting_hours = value;
    }

    const wa = current.weight_audience.trim();
    const wj = current.weight_judges.trim();
    const wm = current.weight_admin.trim();
    if (wa || wj || wm) {
      const values = [wa, wj, wm].map((raw) => Number(raw || '0'));
      if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
        return { ok: false, message: 'وزن‌ها باید اعداد بین ۰ تا ۱۰۰ باشند.' };
      }
      const sum = values[0] + values[1] + values[2];
      if (sum !== 100) return { ok: false, message: 'مجموع وزن‌های سه منبع رأی باید ۱۰۰ باشد؛ یا هر سه را خالی بگذارید (۴۰/۴۰/۲۰).' };
      payload.weight_audience = values[0];
      payload.weight_judges = values[1];
      payload.weight_admin = values[2];
    }

    return { ok: true, payload };
  }

  async function save() {
    if (!form || saving) return;
    const built = buildPayload(form);
    if (!built.ok) {
      setError(built.message);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiJson<Challenge>(form.id ? `/api/backend/admin/challenges/${form.id}` : '/api/backend/admin/challenges', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(built),
      });
      closeForm();
      flash(form.id ? 'چالش به‌روزرسانی شد.' : 'چالش جدید ایجاد شد.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ذخیره چالش انجام نشد.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadAudio(file: File) {
    if (!form) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم فایل صوتی نباید بیشتر از ۵ مگابایت باشد.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const data = new FormData();
      data.append('file', file);
      const result = await apiJson<{ url: string }>('/api/backend/admin/challenge-upload', { method: 'POST', body: data });
      setForm((current) => (current ? { ...current, audio_url: result.url || '' } : current));
      flash('فایل صوتی بارگذاری شد.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'بارگذاری فایل صوتی انجام نشد.');
    } finally {
      setUploading(false);
      if (audioFileRef.current) audioFileRef.current.value = '';
    }
  }

  async function phaseAction(row: AdminChallengeRow, action: 'start' | 'judging' | 'publish') {
    if (busyId !== null) return;
    if (action === 'publish' && !window.confirm('اعلان نتایج: محاسبهٔ رتبه‌ها و امتیازها برگشت‌پذیر نیست. ادامه می‌دهید؟')) return;
    setBusyId(row.id);
    setError('');
    try {
      await apiJson<Challenge>(`/api/backend/admin/challenges/${row.id}/${action}`, { method: 'POST' });
      flash(
        action === 'start'
          ? 'چالش شروع شد و به فاز اجرا رفت.'
          : action === 'judging'
            ? 'چالش به فاز رأی‌گیری رفت.'
            : 'نتایج چالش اعلام شد و امتیازها ثبت شدند.',
      );
      await load();
      if (detailId === row.id) await openDetail(row.id, true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تغییر فاز چالش انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: AdminChallengeRow) {
    if (busyId !== null) return;
    if (!window.confirm(`حذف «${row.title}» بازگشت‌پذیر نیست. ادامه می‌دهید؟`)) return;
    setBusyId(row.id);
    setError('');
    try {
      await apiJson<{ deleted: boolean }>(`/api/backend/admin/challenges/${row.id}`, { method: 'DELETE' });
      if (detailId === row.id) {
        setDetailId(null);
        setDetail(null);
      }
      flash('چالش حذف شد.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'حذف چالش انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  async function openDetail(id: number, refresh = false) {
    const nextId = refresh ? id : (detailId === id ? null : id);
    setDetailId(nextId);
    if (nextId === null) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    setError('');
    try {
      const data = await apiJson<Challenge & { participants: AdminParticipantRow[] }>(`/api/backend/admin/challenges/${id}`);
      const participants = data.participants || [];
      setDetail({ challenge: data, participants });
      const drafts: Record<number, string> = {};
      for (const participant of participants) drafts[participant.id] = participant.admin_score > 0 ? String(participant.admin_score) : '';
      setScoreDrafts(drafts);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'جزئیات چالش دریافت نشد.');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveScore(participant: AdminParticipantRow) {
    if (!detail || savingScore !== null) return;
    const raw = (scoreDrafts[participant.id] ?? '').trim();
    if (!raw) {
      setError('برای ثبت نظر مدیریت، عددی بین ۰ تا ۱۰۰ وارد کنید.');
      return;
    }
    const score = Number(raw);
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      setError('نظر مدیریت باید عددی بین ۰ تا ۱۰۰ باشد.');
      return;
    }
    setSavingScore(participant.id);
    setError('');
    try {
      const updated = await apiJson<AdminParticipantRow>(`/api/backend/admin/challenges/${detail.challenge.id}/participants/${participant.id}/score`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ score }),
      });
      setDetail((current) => (current
        ? { ...current, participants: current.participants.map((row) => (row.id === participant.id ? { ...row, ...updated } : row)) }
        : current));
      flash('نظر مدیریت ثبت شد.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت نظر مدیریت انجام نشد.');
    } finally {
      setSavingScore(null);
    }
  }

  return (
    <div className="admin-challenges">
      <PanelPageHeader
        eyebrow="مسابقه‌های قرآنی"
        title="مدیریت چالش‌ها"
        description="برگزاری چالش‌های قرآنی با سه منبع رأی (مخاطبان، اساتید داور و مدیریت) و اعطای امتیاز اینستاقرآن."
        actions={<PanelButton icon="plus" tone="primary" onClick={openNew}>چالش جدید</PanelButton>}
      />

      {notice && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px', padding: '10px 14px', borderRadius: 12, background: 'var(--olive-100)', color: 'var(--olive-700)', fontSize: 12.5, fontWeight: 600 }}>
          <Icon name="checkCircle" size={16} /> {notice}
        </div>
      )}
      {error && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 14px', padding: '10px 14px', borderRadius: 12, background: '#fbeeec', color: '#a1453d', fontSize: 12.5, fontWeight: 600 }}>
          <Icon name="info" size={16} /> {error}
        </div>
      )}

      {form && (
        <section style={{ margin: '0 0 18px', padding: 18, border: '1px solid var(--sand-150)', borderRadius: 18, background: '#fff' }} aria-label={form.id ? 'ویرایش چالش' : 'چالش جدید'}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 800 }}>{form.id ? 'ویرایش چالش' : 'چالش جدید'}</h2>
            <button type="button" aria-label="بستن فرم" onClick={closeForm} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
              <Icon name="x" size={16} />
            </button>
          </div>

          <div style={{ display: 'grid', gap: 13 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
              عنوان چالش
              <input
                className="adm-input"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="مثلاً: چالش روخوانی سورهٔ مبارکهٔ فجر"
                maxLength={180}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
              توضیحات چالش
              <span style={{ fontWeight: 500, color: 'var(--ink-3)', fontSize: 10.5 }}>هر چالش باید توضیحات کامل داشته باشد.</span>
              <textarea
                className="adm-input"
                rows={4}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="شرایط شرکت، آیه یا مقطع موردنظر، معیارهای داوری و …"
              />
            </label>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, alignSelf: 'center' }}>حالت چالش:</span>
              {([
                { value: 'audio', label: 'با مقطع صوتی استاد معروف' },
                { value: 'description', label: 'فقط توضیحات' },
              ] as Array<{ value: ChallengeMode; label: string }>).map((option) => (
                <label
                  key={option.value}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
                    fontWeight: form.mode === option.value ? 800 : 500,
                    color: form.mode === option.value ? 'var(--olive-700)' : 'var(--ink-3)',
                    cursor: 'pointer', padding: '7px 12px', borderRadius: 11,
                    border: `1px solid ${form.mode === option.value ? 'var(--olive-300, #b6c09b)' : 'var(--sand-150)'}`,
                    background: form.mode === option.value ? 'var(--olive-50)' : '#fff',
                  }}
                >
                  <input
                    type="radio"
                    name="challenge-mode"
                    checked={form.mode === option.value}
                    onChange={() => setForm({ ...form, mode: option.value })}
                    style={{ accentColor: 'var(--olive-600)' }}
                  />
                  {option.label}
                </label>
              ))}
            </div>

            {form.mode === 'audio' && (
              <div style={{ display: 'grid', gap: 9, padding: 13, borderRadius: 14, background: 'var(--gold-bg)', border: '1px solid #e8d9a8' }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600, color: '#6d5518' }}>
                  فایل صوتی مقطع استاد (mp3/ogg/m4a/wav/webm — حداکثر ۵ مگابایت)
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
                    <PanelButton type="button" icon="mic" disabled={uploading} onClick={() => audioFileRef.current?.click()}>
                      {uploading ? 'در حال بارگذاری…' : 'انتخاب و بارگذاری فایل'}
                    </PanelButton>
                    {form.audio_url && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span className="adm-badge" data-tone="green">فایل بارگذاری شد</span>
                        <span dir="ltr" style={{ fontSize: 10.5, color: '#6d5518' }}>{form.audio_url.split('/').pop()}</span>
                      </span>
                    )}
                    <input
                      ref={audioFileRef}
                      type="file"
                      accept="audio/*"
                      style={{ display: 'none' }}
                      onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAudio(file); }}
                    />
                  </span>
                </label>
                {form.audio_url && (
                  <audio controls src={fullUrl(form.audio_url) || form.audio_url} style={{ width: '100%', maxWidth: 420 }} aria-label="پیش‌نمایش مقطع صوتی استاد" />
                )}
                <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600, color: '#6d5518' }}>
                  نام استاد صاحب مقطع (اختیاری)
                  <input
                    className="adm-input"
                    value={form.audio_teacher_name}
                    onChange={(event) => setForm({ ...form, audio_teacher_name: event.target.value })}
                    placeholder="مثلاً: استاد عبدالباسط"
                    maxLength={80}
                  />
                </label>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 11 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
                ظرفیت (نفر، حداقل ۲)
                <input
                  className="adm-input"
                  type="number"
                  min={2}
                  max={500}
                  value={form.capacity}
                  onChange={(event) => setForm({ ...form, capacity: event.target.value })}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
                مهلت ارسال اثر (ساعت)
                <input
                  className="adm-input"
                  type="number"
                  min={1}
                  max={720}
                  value={form.duration_hours}
                  onChange={(event) => setForm({ ...form, duration_hours: event.target.value })}
                  placeholder="پیش‌فرض ۷۲"
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
                مهلت رأی‌گیری (ساعت)
                <input
                  className="adm-input"
                  type="number"
                  min={1}
                  max={336}
                  value={form.voting_hours}
                  onChange={(event) => setForm({ ...form, voting_hours: event.target.value })}
                  placeholder="پیش‌فرض ۴۸"
                />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 11 }}>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
                وزن رأی مخاطبان ٪
                <input
                  className="adm-input"
                  type="number"
                  min={0}
                  max={100}
                  value={form.weight_audience}
                  onChange={(event) => setForm({ ...form, weight_audience: event.target.value })}
                  placeholder="۴۰"
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
                وزن رأی اساتید داور ٪
                <input
                  className="adm-input"
                  type="number"
                  min={0}
                  max={100}
                  value={form.weight_judges}
                  onChange={(event) => setForm({ ...form, weight_judges: event.target.value })}
                  placeholder="۴۰"
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 600 }}>
                وزن نظر مدیریت ٪
                <input
                  className="adm-input"
                  type="number"
                  min={0}
                  max={100}
                  value={form.weight_admin}
                  onChange={(event) => setForm({ ...form, weight_admin: event.target.value })}
                  placeholder="۲۰"
                />
              </label>
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: -6 }}>
              مجموع وزن‌ها باید ۱۰۰ باشد؛ اگر هر سه خالی بمانند، پیش‌فرض ۴۰٪ مخاطبان، ۴۰٪ اساتید داور و ۲۰٪ مدیریت اعمال می‌شود.
            </div>

            <div style={{ display: 'flex', gap: 9, paddingTop: 4 }}>
              <PanelButton tone="primary" icon="check" disabled={saving} onClick={() => void save()} style={{ flex: 1 }}>
                {saving ? 'در حال ذخیره…' : form.id ? 'ذخیره تغییرات' : 'ایجاد چالش'}
              </PanelButton>
              <PanelButton onClick={closeForm}>انصراف</PanelButton>
            </div>
          </div>
        </section>
      )}

      <section aria-label="فهرست چالش‌ها" style={{ display: 'grid', gap: 12 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="adm-skeleton" style={{ height: 96, borderRadius: 18 }} />
          ))
        ) : rows.length === 0 ? (
          <div style={{ padding: 26, textAlign: 'center', border: '1px dashed var(--sand-200)', borderRadius: 18, background: '#fff' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, margin: '0 auto 10px', borderRadius: 14, color: 'var(--olive-700)', background: 'var(--olive-100)' }}>
              <Icon name="sparkle" size={22} />
            </span>
            <strong style={{ display: 'block', fontSize: 13 }}>هنوز چالشی برگزار نشده است</strong>
            <p style={{ margin: '6px 0 0', color: 'var(--ink-3)', fontSize: 11.5 }}>با دکمهٔ «چالش جدید» نخستین چالش قرآنی را بسازید.</p>
          </div>
        ) : (
          rows.map((row) => (
            <article key={row.id} style={{ padding: '14px 16px', border: '1px solid var(--sand-150)', borderRadius: 18, background: '#fff' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ width: 44, height: 44, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 13, color: 'var(--olive-700)', background: 'var(--olive-100)' }}>
                  <Icon name={row.mode === 'audio' ? 'mic' : 'quran'} size={20} />
                </span>
                <div style={{ minWidth: 180, flex: 1 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 13.5 }}>{row.title}</strong>
                    <span className="adm-badge" data-tone={PHASE_META[row.status].tone}>{PHASE_META[row.status].label}</span>
                    <span className="adm-badge" data-tone="muted">{MODE_LABEL[row.mode]}</span>
                  </div>
                  <p style={{ margin: '5px 0 0', color: 'var(--ink-3)', fontSize: 11.5, lineHeight: 1.9, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {row.description}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 7, fontSize: 11, color: 'var(--ink-3)' }}>
                    <span><Icon name="users" size={12} /> {toFaDigits(row.participants_count)} از {toFaDigits(row.capacity)} نفر</span>
                    <span><Icon name="clock" size={12} /> ارسال {toFaDigits(row.duration_hours)} ساعت · رأی‌گیری {toFaDigits(row.voting_hours)} ساعت</span>
                    <span>ایجاد: {faDateTime(row.created_at)}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                  <PanelButton icon="grid" onClick={() => void openDetail(row.id)}>
                    {detailId === row.id ? 'بستن جزئیات' : 'جزئیات'}
                  </PanelButton>
                  {row.status === 'registration' && (
                    <>
                      <PanelButton tone="primary" icon="play" disabled={busyId === row.id} onClick={() => void phaseAction(row, 'start')}>
                        {busyId === row.id ? '…' : 'شروع دستوری'}
                      </PanelButton>
                      <PanelButton icon="edit" onClick={() => openEdit(row)}>ویرایش</PanelButton>
                      <PanelButton tone="danger" icon="trash" disabled={busyId === row.id} onClick={() => void remove(row)}>حذف</PanelButton>
                    </>
                  )}
                  {row.status === 'active' && (
                    <PanelButton tone="primary" icon="megaphone" disabled={busyId === row.id} onClick={() => void phaseAction(row, 'judging')}>
                      {busyId === row.id ? '…' : 'رفتن به رأی‌گیری'}
                    </PanelButton>
                  )}
                  {row.status === 'judging' && (
                    <PanelButton tone="primary" icon="checkCircle" disabled={busyId === row.id} onClick={() => void phaseAction(row, 'publish')}>
                      {busyId === row.id ? '…' : 'اعلان نتایج'}
                    </PanelButton>
                  )}
                  {row.status === 'finished' && (
                    <span className="adm-badge" data-tone="green"><Icon name="award" size={11} /> نتایج اعلام شد</span>
                  )}
                </div>
              </div>

              {row.status === 'finished' && detailId !== row.id && (
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="ops-button" onClick={() => void openDetail(row.id)} style={{ fontSize: 11.5 }}>
                    <Icon name="award" size={14} /> مشاهده نتایج و رتبه‌ها
                  </button>
                </div>
              )}

              {detailId === row.id && (
                <div style={{ marginTop: 13, paddingTop: 13, borderTop: '1px dashed var(--sand-200)' }}>
                  {detailLoading ? (
                    <div className="adm-skeleton" style={{ height: 120, borderRadius: 14 }} />
                  ) : detail && detail.challenge.id === row.id ? (
                    <AdminDetail
                      challenge={detail.challenge}
                      participants={detail.participants}
                      scoreDrafts={scoreDrafts}
                      setScoreDrafts={setScoreDrafts}
                      savingScore={savingScore}
                      onSaveScore={(participant) => void saveScore(participant)}
                    />
                  ) : (
                    <div style={{ padding: 12, color: 'var(--ink-3)', fontSize: 11.5 }}>جزئیات در دسترس نیست.</div>
                  )}
                </div>
              )}
            </article>
          ))
        )}
      </section>

      <style>{`
        .adm-input{width:100%;padding:9px 12px;border:1px solid var(--sand-150);border-radius:11px;background:#fff;font:inherit;font-size:12.5px;color:var(--ink)}
        .adm-input:focus{outline:2px solid var(--olive-300,#b8c68f);outline-offset:1px;border-color:var(--olive-400)}
        textarea.adm-input{resize:vertical;line-height:1.9}
        .adm-skeleton{background:linear-gradient(90deg,var(--sand-100) 25%,var(--sand-50) 50%,var(--sand-100) 75%);background-size:200% 100%;animation:adm-skeleton-move 1.3s infinite}
        @keyframes adm-skeleton-move{from{background-position:200% 0}to{background-position:-200% 0}}
      `}</style>
    </div>
  );
}

/* ─────────────────────────── جزئیات چالش برای مدیریت ─────────────────────────── */

function AdminDetail({
  challenge,
  participants,
  scoreDrafts,
  setScoreDrafts,
  savingScore,
  onSaveScore,
}: {
  challenge: Challenge;
  participants: AdminParticipantRow[];
  scoreDrafts: Record<number, string>;
  setScoreDrafts: (updater: (current: Record<number, string>) => Record<number, string>) => void;
  savingScore: number | null;
  onSaveScore: (participant: AdminParticipantRow) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 5, fontSize: 11.5, color: '#565247', lineHeight: 2 }}>
        <strong style={{ fontSize: 12.5, color: 'var(--ink)' }}>{challenge.title}</strong>
        <span style={{ whiteSpace: 'pre-wrap' }}>{challenge.description}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          <span>حالت: {MODE_LABEL[challenge.mode]}</span>
          <span>ظرفیت: {toFaDigits(challenge.capacity)} نفر</span>
          <span>مهلت ارسال: {toFaDigits(challenge.duration_hours)} ساعت</span>
          <span>مهلت رأی‌گیری: {toFaDigits(challenge.voting_hours)} ساعت</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          <span>وزن مخاطبان: {toFaDigits(challenge.weight_audience)}٪</span>
          <span>وزن اساتید داور: {toFaDigits(challenge.weight_judges)}٪</span>
          <span>وزن مدیریت: {toFaDigits(challenge.weight_admin)}٪</span>
        </div>
        {challenge.mode === 'audio' && challenge.audio_url && (
          <div style={{ display: 'grid', gap: 5 }}>
            <span>مقطع صوتی استاد{challenge.audio_teacher_name ? ` — ${challenge.audio_teacher_name}` : ''}:</span>
            <audio controls src={fullUrl(challenge.audio_url) || challenge.audio_url} style={{ width: '100%', maxWidth: 380 }} aria-label="مقطع صوتی استاد" />
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {challenge.started_at && <span>شروع: {faDateTime(challenge.started_at)}</span>}
          {challenge.submission_deadline && <span>مهلت ارسال اثر: {faDateTime(challenge.submission_deadline)}</span>}
          {challenge.voting_deadline && <span>مهلت رأی‌گیری: {faDateTime(challenge.voting_deadline)}</span>}
          {challenge.published_at && <span>اعلام نتایج: {faDateTime(challenge.published_at)}</span>}
        </div>
      </div>

      <div>
        <strong style={{ display: 'block', marginBottom: 8, fontSize: 12.5 }}>
          شرکت‌کنندگان ({toFaDigits(participants.length)} نفر)
        </strong>
        {participants.length === 0 ? (
          <div style={{ padding: 14, borderRadius: 13, background: 'var(--sand-50)', color: 'var(--ink-3)', fontSize: 11.5 }}>
            هنوز کسی در این چالش ثبت‌نام نکرده است.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--sand-150)', borderRadius: 14 }}>
            <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr style={{ background: 'var(--sand-100)' }}>
                  <th style={thStyle}>شرکت‌کننده</th>
                  <th style={thStyle}>موبایل</th>
                  <th style={thStyle}>وضعیت</th>
                  <th style={thStyle}>اثر ارسالی</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>رأی مخاطبان</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>رأی داوران</th>
                  {challenge.status === 'finished' && <th style={{ ...thStyle, textAlign: 'center' }}>رتبه / امتیاز نهایی</th>}
                  <th style={{ ...thStyle, textAlign: 'center' }}>نظر مدیریت (۰–۱۰۰)</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((participant) => (
                  <tr key={participant.id} style={{ borderTop: '1px solid var(--sand-100)' }}>
                    <td style={tdStyle}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar size={30} imageUrl={fullUrl(participant.avatar_url)} name={participant.name} />
                        <strong style={{ fontSize: 11.5 }}>{participant.name}</strong>
                      </span>
                    </td>
                    <td style={tdStyle} dir="ltr">{participant.mobile || '—'}</td>
                    <td style={tdStyle}>
                      <span className="adm-badge" data-tone={participant.status === 'submitted' ? 'green' : 'muted'}>
                        {participant.status === 'submitted' ? 'ارسال' : 'بدون ارسال'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 230 }}>
                      {participant.status === 'submitted' ? (
                        <span style={{ display: 'grid', gap: 5 }}>
                          {participant.submission_text && (
                            <span style={{ display: 'block', color: '#565247', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                              {participant.submission_text}
                            </span>
                          )}
                          {participant.submission_audio_url && (
                            <audio controls src={fullUrl(participant.submission_audio_url) || participant.submission_audio_url} style={{ width: 200, maxWidth: '100%', height: 34 }} aria-label="اثر صوتی شرکت‌کننده" />
                          )}
                          {!participant.submission_text && !participant.submission_audio_url && <span style={{ color: 'var(--ink-3)' }}>—</span>}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--ink-3)' }}>—</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{toFaDigits(participant.audience_votes || 0)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{toFaDigits(participant.judge_votes || 0)}</td>
                    {challenge.status === 'finished' && (
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                        {participant.rank > 0 ? `رتبهٔ ${toFaDigits(participant.rank)} · ${toFaDigits(participant.final_score)}` : '—'}
                      </td>
                    )}
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          aria-label={`نظر مدیریت برای ${participant.name}`}
                          value={scoreDrafts[participant.id] ?? ''}
                          onChange={(event) => setScoreDrafts((current) => ({ ...current, [participant.id]: event.target.value }))}
                          style={{ width: 64, padding: '6px 8px', border: '1px solid var(--sand-150)', borderRadius: 9, font: 'inherit', fontSize: 11.5, textAlign: 'center' }}
                        />
                        <button
                          type="button"
                          className="ops-button"
                          disabled={savingScore === participant.id}
                          aria-label={`ذخیره نظر مدیریت برای ${participant.name}`}
                          onClick={() => onSaveScore(participant)}
                        >
                          <Icon name="check" size={13} />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {(challenge.status === 'active' || challenge.status === 'judging') && participants.length > 0 && (
          <p style={{ margin: '8px 0 0', color: 'var(--ink-3)', fontSize: 10.5 }}>
            نظر مدیریت منبع سوم امتیازدهی است و مستقل از رأی مخاطبان و اساتید داور ثبت می‌شود.
          </p>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '9px 11px', fontSize: 11, fontWeight: 800, color: '#565247', whiteSpace: 'nowrap', textAlign: 'start' };
const tdStyle: React.CSSProperties = { padding: '9px 11px', verticalAlign: 'top', color: 'var(--ink)' };
