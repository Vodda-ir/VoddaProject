'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelPageHeader,
  PanelSection,
} from '@/components/panel/PanelUI';
import { StatCard } from '@/components/admin/AdminUI';
import { getToken } from '@/lib/auth';
import { toFaDigits } from '@/lib/persian';
import { confirmDialog } from '@/lib/confirm';

type SettingsMap = Record<string, string>;

type FieldDef = {
  key: string;
  label: string;
  hint?: string;
  type: 'text' | 'textarea' | 'toggle' | 'url';
  placeholder?: string;
  ltr?: boolean;
};

const FIELDS: Array<{ group: string; description: string; icon: Parameters<typeof Icon>[0]['name']; fields: FieldDef[] }> = [
  {
    group: 'راه‌های ارتباطی',
    description: 'در صفحه تماس و فوتر سایت عمومی نمایش داده می‌شود.',
    icon: 'headphones',
    fields: [
      { key: 'support_email', label: 'ایمیل پشتیبانی', type: 'text', placeholder: 'info@vodda.app', ltr: true, hint: 'باید شامل @ باشد' },
      { key: 'support_phone', label: 'تلفن پشتیبانی', type: 'text', placeholder: '021xxxxxxx', ltr: true, hint: 'خالی = نمایش داده نمی‌شود' },
    ],
  },
  {
    group: 'شبکه‌های اجتماعی',
    description: 'آدرس کامل پروفایل؛ خالی یعنی نمایش داده نمی‌شود.',
    icon: 'sparkle',
    fields: [
      { key: 'instagram', label: 'اینستاگرام', type: 'url', placeholder: 'https://instagram.com/vodda', ltr: true },
      { key: 'telegram', label: 'تلگرام', type: 'url', placeholder: 'https://t.me/vodda', ltr: true },
      { key: 'whatsapp', label: 'واتس‌اپ', type: 'url', placeholder: 'https://wa.me/98xxxxxxxxxx', ltr: true },
    ],
  },
  {
    group: 'اعلان همگانی',
    description: 'نوار اعلان بالای صفحه اصلی سایت برای همه بازدیدکنندگان.',
    icon: 'bell',
    fields: [
      { key: 'announcement_on', label: 'نمایش نوار اعلان', type: 'toggle' },
      { key: 'announcement_text', label: 'متن اعلان', type: 'textarea', placeholder: 'مثلاً: ثبت‌نام دوره تفسیر نور آغاز شد!' },
      { key: 'announcement_link', label: 'لینک اعلان', type: 'url', placeholder: 'https://vodda.ir/...', ltr: true, hint: 'اختیاری' },
    ],
  },
  {
    group: 'معرفی کوتاه',
    description: 'متن کوتاه معرفی سامانه برای بخش‌های عمومی.',
    icon: 'quran',
    fields: [
      { key: 'about_short', label: 'معرفی کوتاه', type: 'textarea', placeholder: 'وُدّا، پلتفرم آنلاین آموزش قرآن کریم…' },
    ],
  },
  {
    group: 'ورود با گوگل',
    description: 'برای کاربرانی که پیامک به دستشان نمی‌رسد (مثلاً خارج از کشور). دو کلید را از Google Cloud Console بگیرید و همین‌جا ثبت کنید.',
    icon: 'shield',
    fields: [
      { key: 'google_client_id', label: 'Client ID گوگل', type: 'text', placeholder: 'xxxxxxxx.apps.googleusercontent.com', ltr: true, hint: 'پایان‌یافته با apps.googleusercontent.com' },
      { key: 'google_client_secret', label: 'Client Secret گوگل', type: 'text', placeholder: 'GOCSPX-...', ltr: true, hint: 'برای امنیت فقط به‌صورت پوشانده نمایش داده می‌شود' },
      { key: 'google_redirect_uri', label: 'Redirect URI', type: 'text', ltr: true, hint: 'همین مقدار باید در Google Cloud Console هم ثبت شود' },
    ],
  },
];

const ALL_KEYS = FIELDS.flatMap((section) => section.fields.map((field) => field.key));

export default function AdminSettings() {
  const [values, setValues] = useState<SettingsMap>({});
  const [loaded, setLoaded] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<string>('');
  const token = getToken();

  /* کلید استوری‌ها — فروشگاه محلی BFF (اپ و سایت هم‌زمان) */
  const [storiesEnabled, setStoriesEnabled] = useState(true);
  const [storiesBusy, setStoriesBusy] = useState(false);

  const loadStories = useCallback(async () => {
    try {
      const response = await fetch('/api/backend/app-settings', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (response.ok) setStoriesEnabled(body.data?.stories_enabled !== false);
    } catch {
      /* fail-safe — پیش‌فرض فعال */
    }
  }, []);

  useEffect(() => { void loadStories(); }, [loadStories]);

  async function toggleStories() {
    if (storiesBusy) return;
    const next = !storiesEnabled;
    if (
      !next &&
      !(await confirmDialog('استوری‌ها برای همه کاربران اپ پنهان می‌شود. ادامه می‌دهید؟', { danger: true, confirmLabel: 'غیرفعال‌کردن' }))
    ) {
      return;
    }
    setStoriesBusy(true);
    setError('');
    try {
      const response = await fetch('/api/backend/app-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { stories_enabled: next } }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'ثبت کلید استوری‌ها انجام نشد.');
      setStoriesEnabled(body.data?.stories_enabled !== false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت کلید استوری‌ها انجام نشد.');
    } finally {
      setStoriesBusy(false);
    }
  }

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/backend/admin/settings', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'تنظیمات دریافت نشد.');
      const data = (body.data?.settings ?? {}) as SettingsMap;
      const normalized: SettingsMap = {};
      for (const key of ALL_KEYS) normalized[key] = data[key] ?? '';
      setValues(normalized);
      setLoaded(normalized);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تنظیمات دریافت نشد.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const dirty = ALL_KEYS.some((key) => (values[key] ?? '') !== (loaded[key] ?? ''));

  async function save() {
    if (!token || saving) return;
    const changes: SettingsMap = {};
    for (const key of ALL_KEYS) {
      if ((values[key] ?? '') !== (loaded[key] ?? '')) changes[key] = values[key] ?? '';
    }
    if (!Object.keys(changes).length) return;

    if (changes.announcement_on === undefined && values.announcement_on === '') changes.announcement_on = 'false';
    if ((changes.announcement_text ?? (values.announcement_text ? undefined : '')) === '' && values.announcement_on === 'true') {
      setError('برای فعال‌کردن نوار اعلان، متن اعلان را هم وارد کنید.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/backend/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: changes }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'ثبت تنظیمات انجام نشد.');
      const data = (body.data?.settings ?? {}) as SettingsMap;
      const normalized: SettingsMap = {};
      for (const key of ALL_KEYS) normalized[key] = data[key] ?? '';
      setValues(normalized);
      setLoaded(normalized);
      setSavedAt(new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت تنظیمات انجام نشد.');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 42,
    padding: '9px 12px',
    border: '1px solid var(--sand-200)',
    borderRadius: 12,
    background: '#fff',
    color: 'var(--ink)',
    fontFamily: 'inherit',
    fontSize: 12.5,
  };

  const changedCount = ALL_KEYS.filter((key) => (values[key] ?? '') !== (loaded[key] ?? '')).length;

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="پیکربندی عمومی سامانه"
        title="تنظیمات سامانه"
        description="اطلاعات تماس، شبکه‌های اجتماعی و نوار اعلان سایت. تغییرات بلافاصله در صفحات عمومی اعمال می‌شود."
        actions={
          <>
            {dirty && (
              <PanelButton icon="refresh" onClick={() => { setValues(loaded); setError(''); }}>
                بازگردانی
              </PanelButton>
            )}
            <PanelButton tone="primary" icon="check" disabled={!dirty || saving} onClick={() => void save()}>
              {saving ? 'در حال ثبت…' : changedCount ? `ثبت ${toFaDigits(changedCount)} تغییر` : 'ثبت تغییرات'}
            </PanelButton>
          </>
        }
      />

      <div className="adm-stat-grid" style={{ marginBottom: 16, gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <StatCard icon="settings" tone="olive" label="کلیدهای پیکربندی" value={toFaDigits(ALL_KEYS.length)} hint="فقط کلیدهای مجاز قابل تغییرند" />
        <StatCard
          icon={values.announcement_on === 'true' ? 'bell' : 'info'}
          tone={values.announcement_on === 'true' ? 'gold' : 'info'}
          label="نوار اعلان سایت"
          value={values.announcement_on === 'true' ? 'فعال' : 'غیرفعال'}
          hint={values.announcement_on === 'true' ? 'همه بازدیدکنندگان می‌بینند' : 'در حال حاضر پنهان است'}
        />
        <StatCard icon="shield" tone="info" label="ثبت در گزارش عملیات" value="خودکار" hint="هر تغییر با نام مدیر ثبت می‌شود" />
      </div>

      {error && (
        <div className="ops-error" role="alert">
          <span>{error}</span>
          <PanelButton onClick={() => setError('')}>متوجه شدم</PanelButton>
        </div>
      )}
      {savedAt && !error && (
        <div className="ops-inline-note" style={{ marginBottom: 14, color: 'var(--olive-700)', background: 'var(--olive-100)' }}>
          <Icon name="checkCircle" size={16} />
          <span>تنظیمات در ساعت {savedAt} با موفقیت ثبت شد.</span>
        </div>
      )}

      {loading ? (
        <div className="adm-skeleton" style={{ height: 320, borderRadius: 18 }} />
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {/* کلید استوری‌ها — هم‌ارز پنل مدیریت اپ */}
          <PanelSection
            title="استوری‌های سامانه"
            description="ریل استوری صفحهٔ خانهٔ اپ. با خاموش‌کردن این کلید، استوری‌های موجود برای همه پنهان و انتشار استوری جدید بسته می‌شود — در اپ و سایت هم‌زمان."
          >
            <div style={{ padding: '6px 18px 18px', display: 'grid', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 16px', borderRadius: 14, background: storiesEnabled ? 'var(--olive-100)' : 'var(--sand-50)', border: '1px solid var(--sand-150)' }}>
                <span style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800 }}>
                    <Icon name="sparkle" size={16} style={{ color: storiesEnabled ? 'var(--olive-700)' : 'var(--ink-4)' }} />
                    فعال بودن استوری‌ها
                  </span>
                  <small style={{ color: 'var(--ink-3)', fontSize: 10.5, lineHeight: 1.9 }}>
                    {storiesEnabled
                      ? 'استوری برند و اساتید در ریل صفحهٔ خانه اپ دیده می‌شود و انتشار باز است.'
                      : 'ریل استوری خالی نشان داده می‌شود و انتشار استوری برای همه بسته است. داده‌ها حذف نمی‌شوند.'}
                  </small>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={storiesEnabled}
                  disabled={storiesBusy}
                  onClick={() => void toggleStories()}
                  style={{
                    width: 44, height: 25, borderRadius: 999, border: 0, cursor: storiesBusy ? 'wait' : 'pointer',
                    background: storiesEnabled ? 'var(--olive-600)' : 'var(--sand-200)',
                    position: 'relative', transition: 'background .18s ease', flexShrink: 0, opacity: storiesBusy ? 0.7 : 1,
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 3,
                    insetInlineStart: storiesEnabled ? 22 : 3,
                    width: 19, height: 19, borderRadius: '50%', background: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,.2)',
                    transition: 'inset-inline-start .18s ease',
                  }} />
                </button>
              </label>
              <small style={{ color: 'var(--ink-4)', fontSize: 10 }}>
                این کلید بلافاصله اعمال می‌شود و جدا از «ثبت تغییرات» پایین صفحه است.
              </small>
            </div>
          </PanelSection>

          {FIELDS.map((section) => (
            <PanelSection key={section.group} title={section.group} description={section.description}>
              <div style={{ padding: '6px 18px 18px', display: 'grid', gap: 14 }}>
                {section.fields.map((field) => {
                  const value = values[field.key] ?? '';
                  const changed = value !== (loaded[field.key] ?? '');
                  return (
                    <label key={field.key} style={{ display: 'grid', gap: 7 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700 }}>
                        {field.label}
                        {changed && <span className="adm-badge" data-tone="gold">تغییر کرده</span>}
                      </span>

                      {field.type === 'toggle' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={value === 'true'}
                            onClick={() => setValues((current) => ({ ...current, [field.key]: value === 'true' ? 'false' : 'true' }))}
                            style={{
                              width: 44, height: 25, borderRadius: 999, border: 0, cursor: 'pointer',
                              background: value === 'true' ? 'var(--olive-600)' : 'var(--sand-200)',
                              position: 'relative', transition: 'background .18s ease', flexShrink: 0,
                            }}
                          >
                            <span style={{
                              position: 'absolute', top: 3,
                              insetInlineStart: value === 'true' ? 22 : 3,
                              width: 19, height: 19, borderRadius: '50%', background: '#fff',
                              boxShadow: '0 1px 4px rgba(0,0,0,.2)',
                              transition: 'inset-inline-start .18s ease',
                            }} />
                          </button>
                          <small style={{ color: 'var(--ink-3)', fontSize: 10.5 }}>
                            {value === 'true' ? 'نمایش به همه' : 'پنهان'}
                          </small>
                        </span>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          value={value}
                          placeholder={field.placeholder}
                          dir={field.ltr ? 'ltr' : 'rtl'}
                          maxLength={field.key === 'announcement_text' ? 300 : 400}
                          onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                          style={{ ...inputStyle, minHeight: 84, resize: 'vertical', lineHeight: 1.9 }}
                        />
                      ) : (
                        <input
                          value={value}
                          type={field.type === 'url' ? 'url' : 'text'}
                          dir={field.ltr ? 'ltr' : 'rtl'}
                          placeholder={field.placeholder}
                          onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                          style={{ ...inputStyle, direction: field.ltr ? 'ltr' : 'rtl', textAlign: field.ltr ? 'left' : 'right' }}
                        />
                      )}

                      {field.hint && <small style={{ color: 'var(--ink-4)', fontSize: 10 }}>{field.hint}</small>}

                      {field.key === 'announcement_text' && values.announcement_on === 'true' && value.trim() && (
                        <span
                          style={{
                            marginTop: 4, display: 'flex', alignItems: 'center', gap: 9,
                            padding: '10px 14px', borderRadius: 12,
                            background: 'var(--gold-bg)', color: '#765918', fontSize: 11.5,
                            border: '1px dashed #e2c98f',
                          }}
                        >
                          <Icon name="bell" size={14} />
                          <strong style={{ flex: 1, fontWeight: 600 }}>{value}</strong>
                          <em style={{ fontStyle: 'normal', fontSize: 9.5, opacity: .75 }}>پیش‌نمایش نوار اعلان</em>
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </PanelSection>
          ))}

          <PanelSection title="راهنمای فعال‌سازی ورود با گوگل" description="پنج قدم ساده — حدود ده دقیقه زمان می‌برد.">
            <ol style={{ margin: 0, padding: '6px 18px 20px', display: 'grid', gap: 10, fontSize: 12.5, lineHeight: 2, color: 'var(--ink)' }}>
              <li>
                در مرورگر به آدرس <code dir="ltr" style={{ direction: 'ltr', display: 'inline-block', background: 'var(--sand-100)', padding: '2px 8px', borderRadius: 8, fontSize: 11.5 }}>console.cloud.google.com</code> بروید و با حساب گوگل خودتان وارد شوید.
              </li>
              <li>از منوی بالا یک Project جدید بسازید (یا پروژهٔ موجود را انتخاب کنید) و سپس از بخش «APIs &amp; Services → OAuth consent screen» گزینهٔ External را انتخاب و یک نام (مثلاً Vodda) ثبت کنید.</li>
              <li>در «Credentials → Create Credentials → OAuth client ID» نوع <strong>Web application</strong> را انتخاب کنید و در قسمت Authorized redirect URIs دقیقاً این آدرس را بگذارید:
                  <code dir="ltr" style={{ direction: 'ltr', display: 'block', marginTop: 6, background: 'var(--sand-100)', padding: '6px 10px', borderRadius: 8, fontSize: 11.5, textAlign: 'left' }}>https://api.vodda.ir/api/v1/auth/google/callback</code>
              </li>
              <li>Client ID و Client Secret ساخته‌شده را در فرم بالای همین بخش کپی کنید و دکمهٔ «ثبت تغییرات» را بزنید.</li>
              <li>چند لحظه بعد، دکمهٔ «ورود با گوگل» در صفحهٔ ورود اپ و سایت برای همه کاربران ظاهر می‌شود.</li>
            </ol>
          </PanelSection>
        </div>
      )}
    </main>
  );
}
