'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, type AvailabilitySlot, type BookingResult, type PaymentMethod, type Teacher, type TeacherService } from '@/lib/api';
import { authApi, fullUrl, getToken, type AuthUser } from '@/lib/auth';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/web/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const fa = (value: number | string) => String(value).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[+digit]);
const toman = (value: number) => new Intl.NumberFormat('fa-IR').format(value);
const localDateFormatter = new Intl.DateTimeFormat('fa-IR', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

export default function BookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teacherId = Number.parseInt(searchParams.get('teacher') || '0', 10);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [serviceId, setServiceId] = useState(0);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [selectedStart, setSelectedStart] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');
  const [done, setDone] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  // Which account is booking — needed for the self-teacher guard and the
  // wallet balance shown next to the payment options.
  const [meId, setMeId] = useState(0);
  const [wallet, setWallet] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet');

  useEffect(() => {
    if (!Number.isInteger(teacherId) || teacherId <= 0) {
      setError('استاد مشخص نشده است.');
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    api.teacher(teacherId)
      .then((response) => { if (active) setTeacher(response.data.teacher); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'اطلاعات استاد دریافت نشد.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [teacherId]);

  useEffect(() => {
    if (!getToken()) return;
    let active = true;
    authApi.me().then((user: AuthUser) => {
      if (!active) return;
      setMeId(user.id);
      setWallet(user.wallet);
    }).catch(() => { /* non-fatal: wallet row simply stays unknown */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!serviceId || !teacherId) {
      setAvailability([]);
      return;
    }
    let active = true;
    setLoadingAvailability(true);
    setAvailabilityError('');
    api.teacherAvailability(teacherId, serviceId, 14)
      .then((response) => { if (active) setAvailability(response.data || []); })
      .catch((cause) => {
        if (!active) return;
        setAvailability([]);
        setAvailabilityError(cause instanceof Error ? cause.message : 'زمان‌های قابل رزرو دریافت نشدند.');
      })
      .finally(() => { if (active) setLoadingAvailability(false); });
    return () => { active = false; };
  }, [teacherId, serviceId, availabilityVersion]);

  const services = useMemo(() => (teacher?.services || []).filter((service) => service.active !== false), [teacher]);
  const selectedService = useMemo(() => services.find((service) => service.id === serviceId) || null, [serviceId, services]);
  const dateGroups = useMemo(() => {
    const groups = new Map<string, AvailabilitySlot[]>();
    for (const slot of availability) {
      const current = groups.get(slot.local_date) || [];
      current.push(slot);
      groups.set(slot.local_date, current);
    }
    return Array.from(groups, ([localDate, slots]) => ({ localDate, slots: slots.sort((left, right) => left.start_at.localeCompare(right.start_at)) }));
  }, [availability]);
  const selectedDate = useMemo(() => dateGroups.find((group) => group.localDate === selectedDateKey) || null, [dateGroups, selectedDateKey]);
  const selectedSlot = useMemo(() => availability.find((slot) => slot.start_at === selectedStart) || null, [availability, selectedStart]);

  // Booking your own teacher profile is rejected by the API — surface it early.
  const isSelfTeacher = Boolean(teacher?.user_id && meId && teacher.user_id === meId);
  const walletCovers = wallet !== null && selectedService ? wallet >= selectedService.price : false;
  // Prefer wallet when it covers the price; otherwise the gateway is the only
  // viable method. The user can always override while wallet covers the price.
  useEffect(() => {
    if (!selectedService) return;
    setPaymentMethod(walletCovers ? 'wallet' : 'gateway');
  }, [selectedService?.id, walletCovers]);

  function chooseService(service: TeacherService) {
    setServiceId(service.id);
    setSelectedDateKey('');
    setSelectedStart('');
    setAvailability([]);
    setError('');
  }
  function chooseDate(localDate: string) {
    setSelectedDateKey(localDate);
    setSelectedStart('');
    setError('');
  }
  function refreshAvailability() {
    setSelectedDateKey('');
    setSelectedStart('');
    setAvailabilityVersion((value) => value + 1);
  }

  async function submitBooking() {
    const token = getToken();
    if (!token) {
      const redirect = encodeURIComponent(`/panel/user/book?teacher=${teacherId}`);
      router.push(`/panel/login?redirect=${redirect}`);
      return;
    }
    if (isSelfTeacher) {
      setError('نمی‌توانید استاد خودتان را رزرو کنید؛ برای رزرو با حساب قرآن‌آموز وارد شوید.');
      return;
    }
    if (!selectedService || !selectedSlot) {
      setError('خدمت، تاریخ و ساعت معتبر را انتخاب کنید.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await api.bookSession(token, {
        teacher_id: teacherId,
        service_id: selectedService.id,
        scheduled_at: selectedSlot.start_at,
        note: note.trim() || undefined,
        payment_method: paymentMethod,
      });
      const result: BookingResult = response.data;
      if (result.redirect_url) {
        // Gateway payment: hand the payer to Saman Sep. The session now exists
        // in «awaiting_payment» and activates automatically after settlement.
        setRedirecting(true);
        window.location.href = result.redirect_url;
        return;
      }
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت رزرو انجام نشد.');
      refreshAvailability();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <CenterBox>در حال بارگذاری…</CenterBox>;
  if (error && !teacher) return <CenterBox color="var(--rose)">{error}</CenterBox>;
  if (!teacher) return <CenterBox>استاد یافت نشد.</CenterBox>;
  if (redirecting) return <CenterBox><div style={{ width: 80, height: 80, borderRadius: 40, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><Icon name="shield" size={40} /></div><h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>در حال انتقال به درگاه پرداخت…</h1><p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 2, marginBottom: 8 }}>رزرو شما ثبت و تا پایان پرداخت برای شما نگه داشته شده است.</p><p style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>اگر انتقال خودکار انجام نشد، درگاه را در پنجرهٔ جدید باز کنید.</p></CenterBox>;
  if (done) return <CenterBox><div style={{ width: 80, height: 80, borderRadius: 40, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><Icon name="checkCircle" size={44} /></div><h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>درخواست جلسه ثبت شد</h1><p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 2, marginBottom: 24 }}>مبلغ از کیف پول شما کسر شد و درخواست برای استاد ارسال شده است. تأیید، رد یا بازگشت وجه از بخش جلسات قابل پیگیری است.</p><Link href="/panel/user/sessions" style={primaryButton}>مشاهدهٔ جلسات من</Link></CenterBox>;

  return <main style={{ background: 'var(--sand-50)', minHeight: '100vh' }}><div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 60px' }}>
    <Link href={`/teachers/${teacherId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 20 }}><Icon name="arrowL" size={18} /> بازگشت به پروفایل استاد</Link>
    <section style={{ background: '#fff', borderRadius: 20, padding: 16, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16, boxShadow: 'var(--sh-sm)' }}><Avatar size={56} ring verified={teacher.verified} imageUrl={fullUrl(teacher.user?.avatar_url)} /><div><div style={{ fontSize: 16, fontWeight: 800 }}>{teacher.user?.name || 'استاد وُدّا'}</div><div style={{ fontSize: 13, color: 'var(--olive-600)', fontWeight: 600 }}>{teacher.tag}</div></div></section>
    {isSelfTeacher && <div role="alert" style={{ fontSize: 13, lineHeight: 1.9, color: '#8d6d1f', background: 'var(--gold-bg)', padding: 12, borderRadius: 12, marginBottom: 16 }}>این پروفایل متعلق به حساب شماست؛ رزرو جلسه با خودتان ممکن نیست. برای آزمایش فرآیند، با حساب قرآن‌آموز وارد شوید و استاد دیگری را رزرو کنید.</div>}
    {error && <div role="alert" style={{ fontSize: 13, color: 'var(--rose)', background: 'var(--clay-bg)', padding: 12, borderRadius: 12, marginBottom: 16 }}>{error}</div>}
    <Card title="۱. انتخاب خدمت">{services.length === 0 ? <EmptyText>این استاد فعلاً خدمت تأییدشده‌ای برای رزرو ندارد.</EmptyText> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{services.map((service) => <button key={service.id} type="button" onClick={() => chooseService(service)} style={serviceButton(service.id === serviceId)}><div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="book" size={22} /></div><div style={{ flex: 1, textAlign: 'right' }}><div style={{ fontSize: 14.5, fontWeight: 700 }}>{service.title}</div><div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fa(service.duration)} دقیقه</div></div><div style={{ fontSize: 15, fontWeight: 800, color: 'var(--olive-700)' }}>{toman(service.price)} تومان</div></button>)}</div>}</Card>
    <Card title="۲. انتخاب تاریخ و ساعت" disabled={!selectedService}>{!selectedService ? <EmptyText>ابتدا یک خدمت را انتخاب کنید.</EmptyText> : loadingAvailability ? <EmptyText>در حال دریافت زمان‌های قابل رزرو…</EmptyText> : availabilityError ? <div role="alert" style={{ color: 'var(--rose)', lineHeight: 1.9 }}>{availabilityError}<button type="button" onClick={refreshAvailability} style={{ display: 'block', marginTop: 10, border: 0, borderRadius: 10, padding: '8px 12px', background: 'var(--rose)', color: '#fff', cursor: 'pointer' }}>تلاش دوباره</button></div> : dateGroups.length === 0 ? <EmptyText>در ۱۴ روز آینده زمان آزاد و قابل رزروی برای این خدمت وجود ندارد.</EmptyText> : <><div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>{dateGroups.map((group) => <button key={group.localDate} type="button" onClick={() => chooseDate(group.localDate)} style={dateButton(selectedDateKey === group.localDate)}><span>{formatLocalDate(group.localDate)}</span><small style={{ opacity: .72 }}>{fa(group.slots.length)} زمان</small></button>)}</div>{selectedDate && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>{selectedDate.slots.map((slot) => <button key={slot.start_at} type="button" onClick={() => setSelectedStart(slot.start_at)} style={slotButton(selectedStart === slot.start_at)}>{fa(slot.local_start)} تا {fa(slot.local_end)}</button>)}</div>}</>}</Card>
    <Card title="۳. تأیید و ثبت" disabled={!selectedSlot}>{!selectedSlot || !selectedService ? <EmptyText>پس از انتخاب خدمت و زمان، خلاصهٔ رزرو اینجا نمایش داده می‌شود.</EmptyText> : <><div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}><SummaryRow label="خدمت" value={selectedService.title} /><SummaryRow label="تاریخ" value={formatLocalDate(selectedSlot.local_date)} /><SummaryRow label="ساعت" value={`${fa(selectedSlot.local_start)} تا ${fa(selectedSlot.local_end)}`} /><SummaryRow label="مدت" value={`${fa(selectedService.duration)} دقیقه`} /><SummaryRow label="مبلغ" value={`${toman(selectedService.price)} تومان`} /></div>
      <div role="radiogroup" aria-label="روش پرداخت" style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
        <button type="button" role="radio" aria-checked={paymentMethod === 'wallet'} disabled={!walletCovers} onClick={() => walletCovers && setPaymentMethod('wallet')} style={paymentOption(paymentMethod === 'wallet', !walletCovers)}>
          <span style={radioDot(paymentMethod === 'wallet')} aria-hidden="true" />
          <span style={{ flex: 1, textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 800 }}>پرداخت از کیف پول</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{wallet !== null ? `موجودی: ${toman(wallet)} تومان` : 'برای نمایش موجودی وارد شوید'}{walletCovers ? '' : ' — موجودی کافی نیست'}</span>
          </span>
          <Icon name="wallet" size={20} style={{ color: paymentMethod === 'wallet' ? 'var(--olive-600)' : 'var(--ink-4)' }} />
        </button>
        <button type="button" role="radio" aria-checked={paymentMethod === 'gateway'} onClick={() => setPaymentMethod('gateway')} style={paymentOption(paymentMethod === 'gateway', false)}>
          <span style={radioDot(paymentMethod === 'gateway')} aria-hidden="true" />
          <span style={{ flex: 1, textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: 14, fontWeight: 800 }}>پرداخت آنلاین با درگاه سامان‌سپ</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>پرداخت امن با کارت بانکی؛ زمان رزرو تا پایان پرداخت برای شما نگه داشته می‌شود</span>
          </span>
          <Icon name="shield" size={20} style={{ color: paymentMethod === 'gateway' ? 'var(--olive-600)' : 'var(--ink-4)' }} />
        </button>
      </div>
      <textarea aria-label="یادداشت برای استاد" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="یادداشت برای استاد (اختیاری)…" style={{ width: '100%', minHeight: 90, padding: 14, borderRadius: 14, border: '1px solid var(--sand-200)', resize: 'vertical', marginBottom: 14 }} />
      <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.9, marginBottom: 16 }}>{paymentMethod === 'gateway' ? 'با ثبت رزرو به درگاه امن سامان‌سپ منتقل می‌شوید و پس از پرداخت موفق، درخواست برای استاد ارسال می‌شود. در صورت لغو یا انقضای پرداخت، زمان آزاد می‌شود.' : 'مبلغ هنگام ثبت رزرو از کیف پول کسر می‌شود.'} زمان‌ها در timezone رسمی سامانه محاسبه شده‌اند و ممکن است تا لحظهٔ ثبت توسط کاربر دیگری رزرو شوند.</p>
      <button type="button" onClick={submitBooking} disabled={submitting || isSelfTeacher} style={{ ...primaryButton, width: '100%', border: 0, cursor: submitting ? 'wait' : 'pointer', opacity: submitting ? .65 : 1 }}>{submitting ? 'در حال ثبت…' : paymentMethod === 'gateway' ? 'پرداخت و ثبت رزرو' : 'ثبت درخواست رزرو'}</button></>}</Card>
  </div></main>;
}

function formatLocalDate(localDate: string) { return localDateFormatter.format(new Date(`${localDate}T00:00:00Z`)); }
function CenterBox({ children, color = 'var(--ink)' }: { children: React.ReactNode; color?: string }) { return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--sand-50)', color }}><div style={{ maxWidth: 480, textAlign: 'center' }}>{children}</div></main>; }
function Card({ title, children, disabled = false }: { title: string; children: React.ReactNode; disabled?: boolean }) { return <section aria-disabled={disabled} style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: 'var(--sh-sm)', marginBottom: 16, opacity: disabled ? .68 : 1 }}><h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>{title}</h2>{children}</section>; }
function EmptyText({ children }: { children: React.ReactNode }) { return <p style={{ fontSize: 14, color: 'var(--ink-4)', lineHeight: 1.9 }}>{children}</p>; }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingBottom: 10, borderBottom: '1px solid var(--sand-100)' }}><span style={{ color: 'var(--ink-3)', fontSize: 13 }}>{label}</span><strong style={{ fontSize: 13.5, textAlign: 'left' }}>{value}</strong></div>; }
function paymentOption(selected: boolean, disabled: boolean): React.CSSProperties { return { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 14, borderRadius: 16, border: `1.5px solid ${selected ? 'var(--olive-600)' : 'var(--sand-200)'}`, background: selected ? 'var(--olive-50)' : '#fff', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .55 : 1, textAlign: 'right', fontFamily: 'inherit' }; }
function radioDot(selected: boolean): React.CSSProperties { return { width: 20, height: 20, flex: '0 0 20px', borderRadius: 999, border: `2px solid ${selected ? 'var(--olive-600)' : 'var(--sand-200)'}`, background: selected ? 'var(--olive-600)' : '#fff', boxShadow: selected ? 'inset 0 0 0 4px #fff' : 'none', transition: 'all .15s' }; }
const primaryButton: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '13px 20px', borderRadius: 999, background: 'var(--olive-600)', color: '#fff', fontWeight: 700, boxShadow: 'var(--sh-olive)' };
const serviceButton = (selected: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 12, borderRadius: 16, border: `1.5px solid ${selected ? 'var(--olive-600)' : 'var(--sand-200)'}`, background: selected ? 'var(--olive-50)' : '#fff', cursor: 'pointer' });
const dateButton = (selected: boolean): React.CSSProperties => ({ minWidth: 108, display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center', padding: '10px 12px', borderRadius: 14, border: `1px solid ${selected ? 'var(--olive-600)' : 'var(--sand-200)'}`, background: selected ? 'var(--olive-600)' : '#fff', color: selected ? '#fff' : 'var(--ink)', cursor: 'pointer', whiteSpace: 'nowrap' });
const slotButton = (selected: boolean): React.CSSProperties => ({ padding: '9px 13px', borderRadius: 12, border: `1px solid ${selected ? 'var(--olive-600)' : 'var(--sand-200)'}`, background: selected ? 'var(--olive-600)' : 'var(--sand-50)', color: selected ? '#fff' : 'var(--ink-2s)', fontWeight: 700, cursor: 'pointer' });
