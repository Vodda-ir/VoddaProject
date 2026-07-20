'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { Icon } from '@/components/Icon';
import { getToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const fields = [
  { id: 'quran', label: 'آموزش قرآن کریم' },
  { id: 'maddahi', label: 'مداحی و روضه' },
  { id: 'consult', label: 'مشاوره صوتی' },
];

const tags = ['مدرس قرآن', 'قاری', 'مداح', 'مربی تلاوت', 'استاد تجوید', 'مشاور'];

export default function TeacherRegisterPage() {
  const router = useRouter();
  const [field, setField] = useState('quran');
  const [tag, setTag] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [price30, setPrice30] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    const token = getToken();
    if (!token) {
      router.push(`/panel/login?redirect=${encodeURIComponent('/panel/teacher/register')}`);
      return;
    }

    const normalizedTag = tag.trim();
    const normalizedBio = bio.trim();
    const numericPrice = Number(price30.replace(/[,٬،\s]/g, ''));

    if (!normalizedTag) {
      setError('عنوان مدرسی را انتخاب یا وارد کنید.');
      return;
    }
    if (normalizedBio.length < 20) {
      setError('لطفاً حداقل ۲۰ کاراکتر درباره سوابق و تخصص خود بنویسید.');
      return;
    }
    if (!Number.isSafeInteger(numericPrice) || numericPrice <= 0) {
      setError('هزینه جلسه ۳۰ دقیقه‌ای را به‌صورت عدد معتبر وارد کنید.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.becomeTeacher(token, {
        field,
        tag: normalizedTag,
        city: city.trim(),
        bio: normalizedBio,
        price30: numericPrice,
        price60: numericPrice * 2,
      });
      router.replace('/panel/teacher');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ثبت درخواست استادی');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 560, width: '100%', background: '#fff', borderRadius: 24, padding: 36, boxShadow: 'var(--sh-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon name="award" size={32} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>استاد وُدّا شوید</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 2 }}>اطلاعات واقعی خود را ثبت کنید؛ پروفایل پس از بررسی مدیر فعال می‌شود.</p>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>حوزه فعالیت</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {fields.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setField(item.id)}
                style={{
                  padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  background: field === item.id ? 'var(--olive-600)' : 'var(--sand-100)',
                  color: field === item.id ? '#fff' : 'var(--ink-2s)',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label htmlFor="teacher-tag" style={labelStyle}>عنوان مدرسی</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {tags.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTag(item)}
                style={{
                  padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
                  background: tag === item ? 'var(--olive-100)' : 'var(--sand-50)',
                  color: tag === item ? 'var(--olive-700)' : 'var(--ink-3)',
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <input id="teacher-tag" type="text" maxLength={60} value={tag} onChange={(event) => setTag(event.target.value)} placeholder="یا عنوان تخصصی خودتان را وارد کنید…" style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginBottom: 18 }}>
          <div>
            <label htmlFor="teacher-city" style={labelStyle}>شهر</label>
            <input id="teacher-city" type="text" maxLength={80} value={city} onChange={(event) => setCity(event.target.value)} placeholder="مثلاً کرمان" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="teacher-price" style={labelStyle}>هزینه ۳۰ دقیقه (تومان)</label>
            <input id="teacher-price" type="number" min="1000" inputMode="numeric" value={price30} onChange={(event) => setPrice30(event.target.value)} placeholder="مثلاً ۱۵۰۰۰۰" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label htmlFor="teacher-bio" style={labelStyle}>درباره شما</label>
          <textarea id="teacher-bio" value={bio} maxLength={1000} onChange={(event) => setBio(event.target.value)} placeholder="سوابق، تجربیات و تخصص خود را بنویسید…" style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} />
          <div style={{ marginTop: 5, fontSize: 11.5, color: 'var(--ink-4)' }}>{bio.length.toLocaleString('fa-IR')} از ۱۰۰۰ کاراکتر</div>
        </div>

        {error && <div role="alert" style={{ fontSize: 13, color: 'var(--rose)', marginBottom: 14 }}>{error}</div>}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          style={{
            width: '100%', padding: '15px', borderRadius: 999, border: 'none', cursor: submitting ? 'wait' : 'pointer',
            background: 'var(--olive-600)', color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'در حال ارسال…' : 'ارسال درخواست'}
        </button>

        <Link href="/" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}>انصراف</Link>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: 14,
  border: '1px solid var(--sand-200)', fontFamily: 'inherit', fontSize: 14,
  outline: 'none', background: '#fff',
};
