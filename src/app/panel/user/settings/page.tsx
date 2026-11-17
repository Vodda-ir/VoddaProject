'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelPageHeader,
  PanelSection,
} from '@/components/panel/PanelUI';
import { KeyValueRow } from '@/components/admin/AdminUI';
import { avatarUrl as withVersion, getToken } from '@/lib/auth';
import { toFaDigits } from '@/lib/persian';
import { formatDate } from '@/lib/datetime';
import {
  announceAvatarUpdated,
  compressAvatarFile,
  uploadWithProgress,
  validateAvatarFile,
} from '@/lib/avatarImage';

type MeState = {
  name: string;
  city: string;
  bio: string;
  mobile: string;
  role: string;
  avatarUrl: string;
  created_at: string;
  hasTeacherProfile: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  learner: 'قرآن‌آموز',
  teacher: 'استاد',
  admin: 'مدیر سامانه',
};

const inputStyle = {
  width: '100%',
  minHeight: 42,
  padding: '9px 12px',
  border: '1px solid var(--sand-200)',
  borderRadius: 11,
  outline: 'none',
  color: 'var(--ink)',
  background: '#fff',
  fontFamily: 'inherit',
  fontSize: 12.5,
};

export default function UserSettingsPage() {
  const [me, setMe] = useState<MeState | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    fetch('/api/backend/me', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload?.data) return;
        const data = payload.data;
        setMe({
          name: data.name || '',
          city: data.city || '',
          bio: data.bio || '',
          mobile: data.mobile || '',
          role: data.role || 'learner',
          avatarUrl: withVersion(data.avatar_url, data.updated_at) || '',
          created_at: data.created_at || '',
          hasTeacherProfile: Boolean(data.teacher?.id),
        });
        setName(data.name || '');
        setCity(data.city || '');
        setBio(data.bio || '');
        setAvatarUrl(withVersion(data.avatar_url, data.updated_at) || '');
      })
      .catch(() => setError('اطلاعات حساب دریافت نشد.'));
  }, [token]);

  async function persist(extra?: FormData) {
    if (!token) return;
    const form = extra || new FormData();
    if (!extra) {
      form.append('name', name);
      form.append('city', city);
      form.append('bio', bio);
    }
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const response = await fetch('/api/backend/me', { method: 'PUT', body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'ذخیره تغییرات انجام نشد.');
      setMsg('تغییرات با موفقیت ذخیره شد.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ذخیره تغییرات انجام نشد.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file: File) {
    if (!token || !file) return;
    setUploading(true);
    setUploadPercent(0);
    setMsg('');
    setError('');
    // باگ avatar-upload — اعتبارسنجی شفاف حجم/فرمت قبل از ارسال (بدون خطای بی‌صدا).
    const validationError = validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    try {
      const prepared = await compressAvatarFile(file);
      const form = new FormData();
      form.append('name', name);
      form.append('city', city);
      form.append('bio', bio);
      form.append('avatar', prepared, prepared.name || 'avatar.jpg');
      // باگ avatar-upload — آپلود با progress واقعی و پیام خطای دقیق سرور.
      const result = await uploadWithProgress('/api/backend/me', form, (fraction) => {
        setUploadPercent(Math.round(fraction * 100));
      });
      const nextPath = result.data?.avatar_url;
      const next = withVersion(nextPath, new Date().toISOString());
      if (next) setAvatarUrl(next);
      if (nextPath) {
        // باگ avatar-upload — همگام‌سازی فوری state محلی + منوهای بالای هر پنل.
        setMe((current) => (current ? { ...current, avatarUrl: next } : current));
        announceAvatarUpdated(nextPath, new Date().toISOString());
      }
      setMsg('تصویر پروفایل با موفقیت به‌روزرسانی شد.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'بارگذاری تصویر انجام نشد.');
    } finally {
      setUploading(false);
      setUploadPercent(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="حساب من"
        title="تنظیمات پروفایل"
        description="اطلاعات نمایشی شما برای اساتید و سامانه — نام، شهر، معرفی و تصویر پروفایل."
        actions={<PanelButton icon="refresh" onClick={() => window.location.reload()}>بازنشانی</PanelButton>}
      />

      {(msg || error) && (
        <div
          role={error ? 'alert' : 'status'}
          className="ops-inline-note"
          style={error ? { color: 'var(--rose)', borderColor: '#ecd5c8', marginBottom: 14 } : { color: 'var(--olive-700)', borderColor: 'var(--olive-100)', marginBottom: 14 }}
        >
          <Icon name={error ? 'x' : 'checkCircle'} size={15} />
          <span>{error || msg}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 14, alignItems: 'start' }} className="usr-settings-grid">
        <PanelSection
          title="اطلاعات پروفایل"
          description="این اطلاعات در پروفایل عمومی شما و برای اساتید جلسات نمایش داده می‌شود."
        >
          <div style={{ padding: 18, display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Avatar size={76} imageUrl={avatarUrl} ring />
                <button
                  type="button"
                  aria-label="تغییر تصویر پروفایل"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: -4, insetInlineEnd: -4, width: 30, height: 30,
                    display: 'grid', placeItems: 'center', border: '2px solid #fff', borderRadius: 999,
                    background: 'var(--olive-600)', color: '#fff', cursor: uploading ? 'wait' : 'pointer',
                  }}
                >
                  <Icon name="camera" size={14} />
                </button>
                <input className="input-base"
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,.jpg,.jpeg,.png,.webp"
                  style={{ display: 'none' }}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadAvatar(file);
                  }}
                />
              </div>
              <div>
                <strong style={{ fontSize: 15 }}>{name || 'کاربر وُدّا'}</strong>
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', marginTop: 3, direction: 'ltr', textAlign: 'end' }}>
                  {me?.mobile ? toFaDigits(me.mobile) : ''}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 3 }}>
                  {uploading
                    ? uploadPercent > 0
                      ? `در حال بارگذاری تصویر… ${toFaDigits(uploadPercent)}٪`
                      : 'در حال بارگذاری تصویر…'
                    : 'برای تغییر تصویر روی دوربین بزنید (حداکثر ۵ مگابایت)'}
                </div>
              </div>
            </div>

            <label style={{ display: 'grid', gap: 6, fontSize: 11.5, fontWeight: 700, color: 'var(--ink-2s)' }}>
              نام و نام خانوادگی
              <input className="input-base" value={name} onChange={(event) => setName(event.target.value)} style={inputStyle} maxLength={120} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 11.5, fontWeight: 700, color: 'var(--ink-2s)' }}>
              شهر
              <input className="input-base" value={city} onChange={(event) => setCity(event.target.value)} style={inputStyle} maxLength={80} />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 11.5, fontWeight: 700, color: 'var(--ink-2s)' }}>
              درباره من
              <textarea className="input-base" value={bio} onChange={(event) => setBio(event.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} maxLength={500} />
              <span style={{ fontSize: 9.5, fontWeight: 500, color: 'var(--ink-4)', textAlign: 'left' }}>{faDigits(bio.length)} / {faDigits(500)}</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <PanelButton tone="primary" icon="check" disabled={saving || uploading} onClick={() => void persist()}>
                {saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
              </PanelButton>
            </div>
          </div>
        </PanelSection>

        <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <PanelSection title="حساب کاربری" description="اطلاعات پایه حساب شما.">
            <div style={{ padding: 16, display: 'grid', gap: 11 }}>
              <KeyValueRow label="شماره موبایل">{me?.mobile ? toFaDigits(me.mobile) : '—'}</KeyValueRow>
              <KeyValueRow label="نقش در سامانه">{ROLE_LABEL[me?.role || 'learner'] ?? 'کاربر'}</KeyValueRow>
              <KeyValueRow label="وضعیت حساب">
                <span className="adm-badge" data-tone="green">فعال</span>
              </KeyValueRow>
              {me?.created_at && (
                <KeyValueRow label="عضویت">
                  {faDate(me.created_at)}
                </KeyValueRow>
              )}
            </div>
          </PanelSection>

          <PanelSection title="پنل‌های من" description="بین فضاهای کاری حساب خود جابه‌جا شوید.">
            <div style={{ padding: 16, display: 'grid', gap: 9 }}>
              {me?.hasTeacherProfile ? (
                <Link href="/panel/teacher" className="ops-button" style={{ justifyContent: 'center' }}>
                  <Icon name="award" size={15} /> رفتن به پنل استاد
                </Link>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.9 }}>
                    مهارت آموزشی دارید؟ با ثبت پروفایل استادی به جمع مدرسان وُدّا بپیوندید.
                  </p>
                  <Link href="/panel/teacher/register" className="ops-button" data-tone="primary" style={{ justifyContent: 'center' }}>
                    <Icon name="sparkle" size={15} /> ثبت‌نام استادی
                  </Link>
                </>
              )}
              <Link href="/" className="ops-button" style={{ justifyContent: 'center' }}>
                <Icon name="home" size={15} /> مشاهده سایت
              </Link>
            </div>
          </PanelSection>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .usr-settings-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}

function faDate(iso: string): string {
  return formatDate(iso);
}
