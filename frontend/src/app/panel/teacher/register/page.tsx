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
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    const token = getToken();
    if (!token) {
      router.push('/panel/login');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.becomeTeacher(token, { field, tag: tag || 'مدرس', bio });
      router.push('/panel/teacher');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ثبت‌نام');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 520, width: '100%', background: '#fff', borderRadius: 24, padding: 36, boxShadow: 'var(--sh-lg)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon name="award" size={32} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>استاد وُدّا شوید</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 2 }}>فرم زیر را تکمیل کنید تا درخواست شما برای بررسی ارسال شود.</p>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>حوزه فعالیت</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {fields.map((f) => (
              <button
                key={f.id}
                onClick={() => setField(f.id)}
                style={{
                  padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  background: field === f.id ? 'var(--olive-600)' : 'var(--sand-100)',
                  color: field === f.id ? '#fff' : 'var(--ink-2s)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>عنوان مدرسی</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                style={{
                  padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit',
                  background: tag === t ? 'var(--olive-100)' : 'var(--sand-50)',
                  color: tag === t ? 'var(--olive-700)' : 'var(--ink-3)',
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="یا خودتان وارد کنید…"
            style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: '1px solid var(--sand-200)', fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>درباره شما</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="سوابق، تجربیات و تخصص خود را بنویسید…"
            style={{ width: '100%', minHeight: 100, padding: 14, borderRadius: 14, border: '1px solid var(--sand-200)', fontFamily: 'inherit', fontSize: 14, resize: 'vertical', outline: 'none' }}
          />
        </div>

        {error && <div style={{ fontSize: 13, color: 'var(--rose)', marginBottom: 14 }}>{error}</div>}

        <button
          onClick={submit}
          disabled={submitting}
          style={{
            width: '100%', padding: '15px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'var(--olive-600)', color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'در حال ارسال…' : 'ارسال درخواست'}
        </button>

        <Link href="/" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--ink-3)', textDecoration: 'none' }}>
          انصراف
        </Link>
      </div>
    </div>
  );
}
