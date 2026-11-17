'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelPageHeader,
  PanelStatus,
} from '@/components/panel/PanelUI';
import { api, toman, type Teacher } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { digitsOnly, formatFaNumber, toFaDigits } from '@/lib/persian';

const FIELD_OPTIONS = ['آموزش قرآن کریم', 'مشاوره صوتی'];
const TAG_OPTIONS = ['مدرس قرآن', 'قاری', 'مربی تلاوت', 'استاد تجوید', 'مربی حفظ', 'مشاور'];
const LEVEL_OPTIONS = ['مبتدی', 'متوسط', 'پیشرفته'];

/* الگوی یکپارچهٔ «دربارهٔ استاد» — همین ساختار در پروفایل عمومی به‌صورت
   بخش‌بندی‌شده (پاراگراف، چیپ مهارت و نشان طلایی) رندر می‌شود. */
const BIO_TEMPLATE = `🌙 معرفی کوتاه
سلام! به کلاس قرآن من خوش آمدید. سال‌هاست با روش گام‌به‌گام و صبر، قرآن‌آموزان را از مبتدی تا روان‌خوانی همراهی می‌کنم.

📖 سوابق و گواهی‌ها
تحصیل‌کردهٔ علوم قرآنی؛ دارندهٔ گواهی تجوید و سابقهٔ تدریس آنلاین و حضوری.

🎯 زمینه‌های تدریس
• روخوانی و روان‌خوانی
• تجوید و صوت و لحن
• حفظ قرآن

📍 اطلاعات تکمیلی
جلسات آنلاین: دارد | ویژهٔ بانوان/برادران: هر دو | زبان تدریس: فارسی`;

export default function TeacherProfilePage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.teacherMe(token);
      setTeacher(response.data);
      setForm(toForm(response.data));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'پروفایل استاد دریافت نشد.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  function patch(next: Partial<TeacherForm>) {
    setForm((current) => (current ? { ...current, ...next } : current));
  }

  async function save() {
    if (!token || !form) return;
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload: Record<string, unknown> = {};
      if (form.field.trim()) payload.field = form.field.trim();
      if (form.tag.trim()) payload.tag = form.tag.trim();
      if (form.level.trim()) payload.level = form.level.trim();
      if (form.city.trim()) payload.city = form.city.trim();
      if (form.bio.trim()) payload.bio = form.bio.trim();
      if (form.skills.trim()) {
        payload.skills = form.skills.split(/[،,]/).map((item) => item.trim()).filter(Boolean);
      }
      if (form.price30.trim()) payload.price30 = Number(form.price30);
      if (form.price60.trim()) payload.price60 = Number(form.price60);
      if (form.available !== null) payload.available = form.available;

      const response = await api.updateTeacherMe(token, payload);
      setTeacher(response.data);
      setForm(toForm(response.data));
      setNotice('اطلاعات حرفه‌ای با موفقیت ذخیره و روی پروفایل عمومی اعمال شد.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ذخیرهٔ پروفایل انجام نشد.');
    } finally {
      setSaving(false);
    }
  }

  const statusKey = teacher?.status === 'approved' ? 'active' : teacher?.status === 'rejected' ? 'rejected' : 'pending';

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="اطلاعات حرفه‌ای"
        title="پروفایل مدرسی"
        description="حوزه، عنوان، مهارت‌ها و تعرفه‌های خود را مدیریت کنید؛ تغییرات مستقیماً روی پروفایل عمومی اعمال می‌شود."
        actions={<PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>}
      />

      {notice && <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 14, background: 'var(--olive-100)', color: 'var(--olive-700)', fontWeight: 700, fontSize: 12.5 }}><Icon name="checkCircle" size={17} />{notice}</div>}
      {error && <div className="ops-error" role="alert"><span>{error}</span></div>}

      {loading || !form || !teacher ? (
        <section className="ops-data-surface"><div style={{ padding: 42, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال بارگذاری پروفایل…</div></section>
      ) : (
        <>
          <div className="ops-metric-grid" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
            <article className="ops-metric-card">
              <span className="ops-metric-icon"><Icon name="award" size={20} /></span>
              <div><small>وضعیت پروفایل</small><strong style={{ fontSize: 13 }}><PanelStatus status={statusKey}>{teacher.status === 'approved' ? 'تأییدشده' : teacher.status === 'rejected' ? 'ردشده' : 'در انتظار بررسی'}</PanelStatus></strong><span>نمایش عمومی: {teacher.status === 'approved' ? 'فعال' : 'محدود'}</span></div>
            </article>
            <article className="ops-metric-card" data-tone="gold">
              <span className="ops-metric-icon"><Icon name="star" size={20} /></span>
              <div><small>امتیاز و نظرها</small><strong>{toFaDigits(Math.round(teacher.rating * 10) / 10)}</strong><span>{toFaDigits(teacher.reviews)} نظر ثبت‌شده</span></div>
            </article>
            <article className="ops-metric-card">
              <span className="ops-metric-icon"><Icon name="calendar" size={20} /></span>
              <div><small>دسترس‌پذیری</small><strong style={{ fontSize: 13 }}>{form.available === null ? (teacher.available ? 'در دسترس' : 'خارج از دسترس') : form.available ? 'در دسترس' : 'خارج از دسترس'}</strong><span>امکان رزرو برای قرآن‌آموزان</span></div>
            </article>
          </div>

          <section className="ops-data-surface" style={{ display: 'grid', gap: 18 }}>
            <div className="ops-data-head">
              <div>
                <strong>ویرایش اطلاعات مدرسی</strong>
                <span style={{ display: 'block', marginTop: 2 }}>فقط فیلدهای پرشده ذخیره می‌شوند؛ برای حفظ مقدار فعلی، فیلد را خالی بگذارید.</span>
              </div>
            </div>

            <Field label="حوزهٔ فعالیت" hint="حوزه‌ای که در آن تدریس می‌کنید">
              <ChipSelect options={FIELD_OPTIONS} value={form.field} allowFree placeholder="یا حوزهٔ دلخواه بنویسید…" freeValue={form.field} onFreeChange={(value) => patch({ field: value })} maxLength={60} />
            </Field>

            <Field label="عنوان مدرسی" hint="مثلاً: مدرس قرآن، قاری، مربی تلاوت">
              <ChipSelect options={TAG_OPTIONS} value={form.tag} allowFree placeholder="یا عنوان دلخواه…" freeValue={form.tag} onFreeChange={(value) => patch({ tag: value })} maxLength={60} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
              <Field label="سطح تدریس">
                <ChipSelect options={LEVEL_OPTIONS} value={form.level} allowFree placeholder="سطح…" freeValue={form.level} onFreeChange={(value) => patch({ level: value })} maxLength={30} />
              </Field>
              <Field label="شهر">
                <input className="input-base" value={form.city} maxLength={80} placeholder="مثلاً: رشت" onChange={(event) => patch({ city: event.target.value })} style={inputStyle} />
              </Field>
            </div>

            <Field label="معرفی و سوابق" hint={`${toFaDigits(form.bio.length)} / ${toFaDigits(1000)} کاراکتر`}>
              <textarea className="input-base" value={form.bio} rows={5} maxLength={1000} placeholder="سوابق، روش تدریس و هر چیزی که قرآن‌آموزان باید بدانند…" onChange={(event) => patch({ bio: event.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => patch({ bio: BIO_TEMPLATE })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 999, border: '1px solid rgba(191,149,64,.45)', background: 'var(--gold-bg, #f7efd9)', color: '#8b681f', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}
                >
                  <Icon name="sparkle" size={13} /> درج الگوی پیشنهادی «دربارهٔ استاد»
                </button>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', lineHeight: 1.8 }}>
                  با این الگو، معرفی شما در پروفایل به‌صورت مرتب و بخش‌بندی‌شده نمایش داده می‌شود؛ متن‌ها را جایگزین کنید.
                </span>
              </div>
            </Field>

            <Field label="مهارت‌ها" hint="مهارت‌ها را با ویرگول جدا کنید (حداکثر ۲۰ مورد)">
              <input className="input-base" value={form.skills} placeholder="مثلاً: تجوید، روخوانی، حفظ جزء ۳۰" onChange={(event) => patch({ skills: event.target.value })} style={inputStyle} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
              <Field label="تعرفه ۳۰ دقیقه (تومان)">
                <input className="input-base" type="text" inputMode="numeric" value={form.price30 ? toFaDigits(form.price30) : ''} placeholder={teacher.price30 > 0 ? `فعلی: ${formatFaNumber(teacher.price30)}` : 'عدد…'} onChange={(event) => patch({ price30: digitsOnly(event.target.value) })} style={inputStyle} />
              </Field>
              <Field label="تعرفه ۶۰ دقیقه (تومان)">
                <input className="input-base" type="text" inputMode="numeric" value={form.price60 ? toFaDigits(form.price60) : ''} placeholder={teacher.price60 > 0 ? `فعلی: ${formatFaNumber(teacher.price60)}` : 'عدد…'} onChange={(event) => patch({ price60: digitsOnly(event.target.value) })} style={inputStyle} />
              </Field>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '13px 15px', borderRadius: 14, background: 'var(--sand-100)' }}>
              <div>
                <strong style={{ fontSize: 12.5 }}>پذیرش رزرو جدید</strong>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>در حالت خاموش، پروفایل شما قابل مشاهده است اما رزرو جدید نمی‌پذیرید.</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={(form.available === null ? teacher.available : form.available) === true}
                onClick={() => patch({ available: form.available === null ? !teacher.available : !form.available })}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: '#fff', background: (form.available === null ? teacher.available : form.available) ? 'var(--olive-600)' : 'var(--ink-3)' }}
              >
                <Icon name={(form.available === null ? teacher.available : form.available) ? 'check' : 'x'} size={14} />
                {(form.available === null ? teacher.available : form.available) ? 'در دسترس' : 'خارج از دسترس'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--sand-150)', paddingTop: 14 }}>
              <PanelButton disabled={saving} onClick={() => setForm(toForm(teacher))}>بازگردانی</PanelButton>
              <PanelButton tone="primary" icon="check" disabled={saving} onClick={() => void save()}>{saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}</PanelButton>
            </div>
          </section>

          {teacher.services && teacher.services.length > 0 && (
            <section className="ops-data-surface">
              <div className="ops-data-head">
                <div>
                  <strong>پیش‌نمایش خدمات فعلی</strong>
                  <span style={{ display: 'block', marginTop: 2 }}>مدیریت خدمات از صفحهٔ «خدمات من» انجام می‌شود.</span>
                </div>
              </div>
              {teacher.services.map((service) => (
                <article className="ops-row" key={service.id}>
                  <span style={{ width: 40, height: 40, display: 'grid', placeItems: 'center', flex: '0 0 40px', borderRadius: 12, color: 'var(--olive-700)', background: 'var(--olive-100)' }}><Icon name="book" size={18} /></span>
                  <div className="ops-row-main">
                    <div className="ops-row-title"><strong>{service.title}</strong></div>
                    <div className="ops-row-meta"><span><Icon name="clock" size={13} />{toFaDigits(service.duration)} دقیقه</span><span>{toman(service.price)} تومان</span></div>
                  </div>
                  <PanelStatus status={service.active ? 'active' : 'pending'}>{service.active ? 'فعال' : 'در انتظار تأیید'}</PanelStatus>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}

type TeacherForm = {
  field: string;
  tag: string;
  level: string;
  city: string;
  bio: string;
  skills: string;
  price30: string;
  price60: string;
  available: boolean | null;
};

function toForm(teacher: Teacher): TeacherForm {
  return {
    field: teacher.field || '',
    tag: teacher.tag || '',
    level: teacher.level || '',
    city: teacher.city || '',
    bio: teacher.bio || '',
    skills: (teacher.skills || []).join('، '),
    price30: teacher.price30 > 0 ? String(teacher.price30) : '',
    price60: teacher.price60 > 0 ? String(teacher.price60) : '',
    available: null,
  };
}

function validate(form: TeacherForm): string | null {
  if (form.field.trim().length > 60) return 'حوزهٔ فعالیت حداکثر ۶۰ کاراکتر است.';
  if (form.tag.trim().length > 60) return 'عنوان مدرسی حداکثر ۶۰ کاراکتر است.';
  if (form.level.trim().length > 30) return 'سطح تدریس حداکثر ۳۰ کاراکتر است.';
  if (form.city.trim().length > 80) return 'نام شهر حداکثر ۸۰ کاراکتر است.';
  if (form.bio.trim().length > 1000) return 'معرفی حداکثر ۱۰۰۰ کاراکتر است.';
  const skills = form.skills.split(/[،,]/).map((item) => item.trim()).filter(Boolean);
  if (skills.length > 20) return 'حداکثر ۲۰ مهارت قابل ثبت است.';
  if (skills.some((skill) => skill.length > 50)) return 'هر مهارت حداکثر ۵۰ کاراکتر است.';
  for (const [label, raw] of [['تعرفه ۳۰ دقیقه', form.price30], ['تعرفه ۶۰ دقیقه', form.price60]] as const) {
    if (!raw.trim()) continue;
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value <= 0 || value > 1_000_000_000) return `${label} باید عددی مثبت و حداکثر یک میلیارد تومان باشد.`;
  }
  return null;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)' }}>{label}{hint && <span style={{ fontWeight: 500, fontSize: 10, color: 'var(--ink-3)', opacity: .75, marginRight: 6 }}>{hint}</span>}</span>
      {children}
    </label>
  );
}

function ChipSelect({
  options,
  value,
  allowFree,
  freeValue,
  onFreeChange,
  placeholder,
  maxLength,
}: {
  options: string[];
  value: string;
  allowFree?: boolean;
  freeValue?: string;
  onFreeChange?: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const freeActive = Boolean(freeValue) && !options.includes(freeValue || '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {options.map((option) => {
          const selected = value === option && !freeActive;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onFreeChange?.(option)}
              style={{ padding: '7px 13px', borderRadius: 999, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, background: selected ? 'var(--olive-600)' : '#fff', color: selected ? '#fff' : 'var(--ink-2s)', borderColor: selected ? 'var(--olive-600)' : 'var(--sand-200)' }}
            >
              {option}
            </button>
          );
        })}
      </div>
      {allowFree && (
        <input className="input-base"
          value={freeActive ? (freeValue || '') : ''}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onFreeChange?.(event.target.value)}
          style={inputStyle}
        />
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 11, border: '1px solid var(--sand-200)', color: 'var(--ink)', background: '#fff', fontFamily: 'inherit' };
