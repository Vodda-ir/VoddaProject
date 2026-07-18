'use client';

import { useState, useEffect } from 'react';
import { api, type Teacher, type WorkTime } from '@/lib/api';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/web/ui';
import { getToken } from '@/lib/auth';
import { fullUrl } from '@/lib/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const fa = (n: number | string) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const toman = (n: number) => fa(new Intl.NumberFormat('fa-IR').format(n));

const weekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teacherId = parseInt(searchParams.get('teacher') || '0', 10);

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [workTimes, setWorkTimes] = useState<WorkTime[]>([]);
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(0);
  const [selectedDay, setSelectedDay] = useState(-1);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!teacherId) {
      setError('استاد مشخص نشده است');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [tRes, wRes] = await Promise.all([
          api.teacher(teacherId),
          api.teacherWorkTimes(teacherId).catch(() => ({ data: [] })),
        ]);
        setTeacher(tRes.data.teacher);
        setWorkTimes(wRes.data || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'خطا در بارگذاری');
      } finally {
        setLoading(false);
      }
    })();
  }, [teacherId]);

  async function submitBooking() {
    const token = getToken();
    if (!token) {
      router.push('/panel/login?redirect=/panel/user/book');
      return;
    }
    if (!serviceId || !selectedSlot) return;

    setSubmitting(true);
    setError('');
    try {
      const now = new Date();
      const targetDay = selectedDay;
      const diff = (targetDay - now.getDay() + 7) % 7;
      const date = new Date(now);
      date.setDate(now.getDate() + diff);
      const [h, m] = selectedSlot.split(':');
      date.setHours(parseInt(h), parseInt(m), 0, 0);

      await api.bookSession(token, {
        teacher_id: teacherId,
        service_id: serviceId,
        scheduled_at: date.toISOString(),
        note,
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ثبت رزرو');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <CenterBox>در حال بارگذاری…</CenterBox>;
  if (error && !teacher) return <CenterBox color="var(--rose)">{error}</CenterBox>;
  if (!teacher) return <CenterBox>استاد یافت نشد</CenterBox>;

  if (done) {
    return (
      <CenterBox>
        <div style={{ width: 80, height: 80, borderRadius: 40, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Icon name="checkCircle" size={44} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>جلسه با موفقیت رزرو شد</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 2, marginBottom: 24 }}>
          درخواست شما برای استاد ارسال شد. پس از تأیید، جلسه در زمان انتخابی برگزار می‌شود.
        </p>
        <Link href="/panel/user/sessions" style={btnStyle}>
          مشاهده جلسات من
        </Link>
      </CenterBox>
    );
  }

  const services = teacher.services || [];

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px 60px' }}>
        <Link href={`/teachers/${teacherId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 20, textDecoration: 'none' }}>
          <Icon name="arrowL" size={18} /> بازگشت به پروفایل استاد
        </Link>

        <div style={{ background: '#fff', borderRadius: 20, padding: 16, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 24, boxShadow: 'var(--sh-sm)' }}>
          <Avatar size={56} ring verified={teacher.verified} imageUrl={fullUrl(teacher.user?.avatar_url)} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{teacher.user?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--olive-600)', fontWeight: 600 }}>{teacher.tag}</div>
          </div>
        </div>

        <Steps step={step} />

        {step === 1 && (
          <Card title="انتخاب خدمت">
            {services.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--ink-4)' }}>خدماتی موجود نیست.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {services.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setServiceId(s.id); setStep(2); }}
                    style={serviceBtnStyle(serviceId === s.id)}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="book" size={22} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fa(s.duration)} دقیقه</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--olive-700)' }}>{toman(s.price)} ت</div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}

        {step === 2 && (
          <Card title="انتخاب زمان">
            {workTimes.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--ink-4)' }}>زمان آزادی ثبت نشده است.</p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {workTimes.map((w, i) => (
                    <button key={i} onClick={() => setSelectedDay(w.weekday)} style={dayBtnStyle(selectedDay === w.weekday)}>
                      {weekdays[w.weekday]}
                    </button>
                  ))}
                </div>
                {selectedDay >= 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {workTimes.filter((w) => w.weekday === selectedDay).map((w, i) => (
                      <button key={i} onClick={() => setSelectedSlot(w.start)} style={slotBtnStyle(selectedSlot === w.start)}>
                        {fa(w.start)} - {fa(w.end)}
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button onClick={() => setStep(1)} style={{ ...btnGhostStyle, flex: 1 }}>مرحله قبل</button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!selectedSlot}
                    style={{ ...btnStyle, flex: 1, opacity: selectedSlot ? 1 : 0.5 }}
                  >
                    ادامه
                  </button>
                </div>
              </>
            )}
          </Card>
        )}

        {step === 3 && (
          <Card title="تأیید و ثبت">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <Row label="خدمت" value={services.find((s) => s.id === serviceId)?.title || '—'} />
              <Row label="روز" value={selectedDay >= 0 ? weekdays[selectedDay] : '—'} />
              <Row label="ساعت" value={selectedSlot ? fa(selectedSlot) : '—'} />
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="یادداشت برای استاد (اختیاری)…"
              style={{ width: '100%', minHeight: 80, padding: 14, borderRadius: 14, border: '1px solid var(--sand-200)', fontFamily: 'inherit', fontSize: 14, resize: 'vertical', marginBottom: 20 }}
            />
            {error && <div style={{ fontSize: 13, color: 'var(--rose)', marginBottom: 14 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ ...btnGhostStyle, flex: 1 }}>مرحله قبل</button>
              <button onClick={submitBooking} disabled={submitting} style={{ ...btnStyle, flex: 1, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'در حال ثبت…' : 'ثبت رزرو'}
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function Steps({ step }: { step: number }) {
  const labels = ['خدمت', 'زمان', 'تأیید'];
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
      {labels.map((l, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800,
            background: step > i + 1 ? 'var(--olive-600)' : step === i + 1 ? 'var(--olive-600)' : 'var(--sand-200)',
            color: step >= i + 1 ? '#fff' : 'var(--ink-3)',
          }}>
            {step > i + 1 ? <Icon name="check" size={16} /> : fa(i + 1)}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: step >= i + 1 ? 'var(--ink)' : 'var(--ink-3)' }}>{l}</span>
          {i < labels.length - 1 && <div style={{ flex: 1, height: 2, background: step > i + 1 ? 'var(--olive-300)' : 'var(--sand-200)' }} />}
        </div>
      ))}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: 'var(--sh-sm)' }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 18 }}>{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 14, background: 'var(--sand-50)' }}>
      <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function CenterBox({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sand-50)', padding: 20 }}>
      <div style={{ textAlign: 'center', color: color || 'var(--ink-3)', fontSize: 16 }}>{children}</div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '14px 24px', borderRadius: 999, border: 'none', cursor: 'pointer',
  background: 'var(--olive-600)', color: '#fff', fontSize: 15, fontWeight: 700,
  fontFamily: 'inherit', textDecoration: 'none',
};

const btnGhostStyle: React.CSSProperties = {
  ...btnStyle, background: 'var(--sand-100)', color: 'var(--ink-2s)',
};

const serviceBtnStyle = (active: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16,
  border: active ? '2px solid var(--olive-500)' : '1px solid var(--sand-150)',
  background: active ? 'var(--olive-50)' : '#fff', cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
});

const dayBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
  background: active ? 'var(--olive-600)' : 'var(--sand-100)', color: active ? '#fff' : 'var(--ink-2s)',
});

const slotBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '8px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
  background: active ? 'var(--olive-600)' : 'var(--sand-50)', color: active ? '#fff' : 'var(--ink-2s)',
});
