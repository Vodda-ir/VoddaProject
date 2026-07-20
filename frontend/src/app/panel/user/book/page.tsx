'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, type Teacher, type WorkTime } from '@/lib/api';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/web/ui';
import { fullUrl, getToken } from '@/lib/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const fa = (n: number | string) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const toman = (n: number) => new Intl.NumberFormat('fa-IR').format(n);

// Backend convention: 0=Saturday ... 6=Friday.
const weekdays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function scheduledDateFor(weekday: number, time: string): Date | null {
  if (weekday < 0 || weekday > 6 || !/^\d{2}:\d{2}$/.test(time)) return null;

  const now = new Date();
  const currentVoddaWeekday = (now.getDay() + 1) % 7;
  const daysAhead = (weekday - currentVoddaWeekday + 7) % 7;
  const date = new Date(now);
  date.setDate(now.getDate() + daysAhead);

  const [hour, minute] = time.split(':').map(Number);
  date.setHours(hour, minute, 0, 0);

  // A slot for today that has already passed means the next week's occurrence.
  if (date.getTime() <= now.getTime()) date.setDate(date.getDate() + 7);
  return date;
}

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('fa-IR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teacherId = Number.parseInt(searchParams.get('teacher') || '0', 10);

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
    if (!Number.isInteger(teacherId) || teacherId <= 0) {
      setError('استاد مشخص نشده است');
      setLoading(false);
      return;
    }

    let active = true;
    (async () => {
      try {
        const [teacherResponse, workTimeResponse] = await Promise.all([
          api.teacher(teacherId),
          api.teacherWorkTimes(teacherId),
        ]);
        if (!active) return;
        setTeacher(teacherResponse.data.teacher);
        setWorkTimes((workTimeResponse.data || []).filter((slot) => slot.active !== false));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'خطا در بارگذاری اطلاعات رزرو');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [teacherId]);

  const services = useMemo(
    () => (teacher?.services || []).filter((service) => service.active !== false),
    [teacher],
  );

  const availableDays = useMemo(
    () => [...new Set(workTimes.map((slot) => slot.weekday))].sort((a, b) => a - b),
    [workTimes],
  );

  const daySlots = useMemo(
    () => workTimes.filter((slot) => slot.weekday === selectedDay),
    [selectedDay, workTimes],
  );

  const scheduledDate = useMemo(
    () => scheduledDateFor(selectedDay, selectedSlot),
    [selectedDay, selectedSlot],
  );

  function selectService(id: number) {
    setServiceId(id);
    setSelectedDay(-1);
    setSelectedSlot('');
    setError('');
    setStep(2);
  }

  function selectDay(day: number) {
    setSelectedDay(day);
    setSelectedSlot('');
    setError('');
  }

  async function submitBooking() {
    const token = getToken();
    if (!token) {
      const redirect = encodeURIComponent(`/panel/user/book?teacher=${teacherId}`);
      router.push(`/panel/login?redirect=${redirect}`);
      return;
    }
    if (!serviceId || !scheduledDate) {
      setError('خدمت و زمان معتبر را انتخاب کنید.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.bookSession(token, {
        teacher_id: teacherId,
        service_id: serviceId,
        scheduled_at: scheduledDate.toISOString(),
        note: note.trim() || undefined,
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
          درخواست برای استاد ارسال شد. پس از تأیید، وضعیت آن در بخش جلسات نمایش داده می‌شود.
        </p>
        <Link href="/panel/user/sessions" style={btnStyle}>مشاهده جلسات من</Link>
      </CenterBox>
    );
  }

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 20px 60px' }}>
        <Link href={`/teachers/${teacherId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 20, textDecoration: 'none' }}>
          <Icon name="arrowL" size={18} /> بازگشت به پروفایل استاد
        </Link>

        <div style={{ background: '#fff', borderRadius: 20, padding: 16, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 24, boxShadow: 'var(--sh-sm)' }}>
          <Avatar size={56} ring verified={teacher.verified} imageUrl={fullUrl(teacher.user?.avatar_url)} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{teacher.user?.name || 'استاد وُدّا'}</div>
            <div style={{ fontSize: 13, color: 'var(--olive-600)', fontWeight: 600 }}>{teacher.tag}</div>
          </div>
        </div>

        <Steps step={step} />

        {step === 1 && (
          <Card title="انتخاب خدمت">
            {services.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--ink-4)' }}>در حال حاضر خدمت فعالی برای رزرو وجود ندارد.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {services.map((service) => (
                  <button key={service.id} type="button" onClick={() => selectService(service.id)} style={serviceBtnStyle(serviceId === service.id)}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="book" size={22} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <div style={{ fontSize: 14.5, fontWeight: 700 }}>{service.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fa(service.duration)} دقیقه</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--olive-700)' }}>{toman(service.price)} تومان</div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}

        {step === 2 && (
          <Card title="انتخاب زمان">
            {workTimes.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--ink-4)' }}>استاد هنوز زمان آزادی ثبت نکرده است.</p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {availableDays.map((day) => (
                    <button key={day} type="button" onClick={() => selectDay(day)} style={dayBtnStyle(selectedDay === day)}>
                      {weekdays[day]}
                    </button>
                  ))}
                </div>

                {selectedDay >= 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {daySlots.map((slot) => (
                      <button key={slot.id} type="button" onClick={() => setSelectedSlot(slot.from)} style={slotBtnStyle(selectedSlot === slot.from)}>
                        {fa(slot.from)} تا {fa(slot.to)}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <button type="button" onClick={() => setStep(1)} style={{ ...btnGhostStyle, flex: 1 }}>مرحله قبل</button>
                  <button type="button" onClick={() => setStep(3)} disabled={!scheduledDate} style={{ ...btnStyle, flex: 1, opacity: scheduledDate ? 1 : 0.5 }}>
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
              <Row label="خدمت" value={services.find((service) => service.id === serviceId)?.title || '—'} />
              <Row label="زمان جلسه" value={formatDate(scheduledDate)} />
              <Row label="مبلغ" value={`${toman(services.find((service) => service.id === serviceId)?.price || 0)} تومان`} />
            </div>
            <textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="یادداشت برای استاد (اختیاری)…" style={{ width: '100%', minHeight: 80, padding: 14, borderRadius: 14, border: '1px solid var(--sand-200)', fontFamily: 'inherit', fontSize: 14, resize: 'vertical', marginBottom: 20 }} />
            {error && <div role="alert" style={{ fontSize: 13, color: 'var(--rose)', marginBottom: 14 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setStep(2)} style={{ ...btnGhostStyle, flex: 1 }}>مرحله قبل</button>
              <button type="button" onClick={submitBooking} disabled={submitting || !scheduledDate} style={{ ...btnStyle, flex: 1, opacity: submitting || !scheduledDate ? 0.6 : 1 }}>
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
      {labels.map((label, index) => (
        <div key={label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, background: step >= index + 1 ? 'var(--olive-600)' : 'var(--sand-200)', color: step >= index + 1 ? '#fff' : 'var(--ink-3)' }}>
            {step > index + 1 ? <Icon name="check" size={16} /> : fa(index + 1)}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: step >= index + 1 ? 'var(--ink)' : 'var(--ink-3)' }}>{label}</span>
          {index < labels.length - 1 && <div style={{ flex: 1, height: 2, background: step > index + 1 ? 'var(--olive-300)' : 'var(--sand-200)' }} />}
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
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '12px 16px', borderRadius: 14, background: 'var(--sand-50)' }}>
      <span style={{ fontSize: 13, color: 'var(--ink-3)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, textAlign: 'left' }}>{value}</span>
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
