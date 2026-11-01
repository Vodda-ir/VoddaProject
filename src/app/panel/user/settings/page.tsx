'use client';

import { useState, useEffect } from 'react';
import { Avatar } from '@/components/web/ui';
import { getToken, fullUrl } from '@/lib/auth';
import Link from 'next/link';
import { toFaDigits } from '@/lib/persian';

export default function UserSettingsPage() {
  const [me, setMe] = useState<Record<string, unknown>>({});
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    fetch('/api/v1/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (!j?.data) return;
        setMe(j.data);
        setName((j.data.name as string) || '');
        setCity((j.data.city as string) || '');
        setBio((j.data.bio as string) || '');
      });
  }, [token]);

  async function save() {
    if (!token) return;
    setSaving(true); setMsg('');
    const form = new FormData();
    form.append('name', name);
    form.append('city', city);
    form.append('bio', bio);
    const res = await fetch('/api/v1/me', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (res.ok) setMsg('تغییرات ذخیره شد');
    else setMsg('خطا در ذخیره');
    setSaving(false);
  }

  const avatarUrl = fullUrl(me.avatar_url as string);
  const mobile = (me.mobile as string) || '';

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 22 }}>تنظیمات پروفایل</h1>

      <div style={{ background: '#fff', borderRadius: 18, padding: 24, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)', maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Avatar size={72} imageUrl={avatarUrl} ring />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{name || 'کاربر'}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3, direction: 'ltr' }}>{toFaDigits(mobile)}</div>
            <Link href="/" style={{ fontSize: 12, color: 'var(--olive-600)', fontWeight: 600, textDecoration: 'none' }}>تغییر عکس (در اپ)</Link>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2s)', marginBottom: 6, display: 'block' }}>نام</label>
            <input value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--sand-200)', fontSize: 14, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2s)', marginBottom: 6, display: 'block' }}>شهر</label>
            <input value={city} onChange={e => setCity(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--sand-200)', fontSize: 14, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2s)', marginBottom: 6, display: 'block' }}>درباره من</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1.5px solid var(--sand-200)', fontSize: 14, fontFamily: 'var(--font)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>
        </div>

        {msg && <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: msg.includes('خطا') ? 'var(--rose)' : 'var(--olive-600)' }}>{msg}</div>}

        <button onClick={save} disabled={saving}
          style={{ marginTop: 20, padding: '12px 28px', borderRadius: 14, border: 'none', background: 'var(--olive-600)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
          {saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
        </button>
      </div>
    </div>
  );
}
