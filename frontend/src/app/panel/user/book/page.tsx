'use client';

// صفحهٔ رزرو وب — بازنویسی به ویزارد چرخهٔ فرایند، دقیقاً هم‌تراز ویزارد اپ.
//
// ۱) انتخاب خدمت با لیست کشویی زیبا (گروه «جلسات آنلاین» + گروه «جلسات حضوری»)
// ۲) با انتخاب خدمت، ویزارد شیت باز می‌شود — هر مرحله چرخهٔ مستقل خودش را دارد
//    (نه زیرشاخهٔ کارت‌های روی‌هم): سرستون «مرحلهٔ n از m» + نوار پیشرفت + برچسب مراحل
//    جلسات آنلاین:  نوع جلسه → زمان جلسه → تأیید و پرداخت
//    جلسات حضوری:   محل برگزاری → موضوع جلسه → زمان جلسه → تأیید و پرداخت
// ۳) جلسهٔ فوری آنلاین هم مثل اپ پشتیبانی می‌شود (آغاز دو دقیقهٔ بعد).

import { useEffect, useMemo, useState } from 'react';
import { api, type AvailabilitySlot, type BookingResult, type PaymentMethod, type Teacher, type TeacherService } from '@/lib/api';
import { payViaSamanGate } from '@/lib/saman-gate';
import { formatDate, formatNumber } from '@/lib/datetime';
import { authApi, fullUrl, getToken, type AuthUser } from '@/lib/auth';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/web/ui';
import { MenuSelect, type WebMenuGroup } from '@/components/web/MenuSelect';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const fa = (value: number | string) => String(value).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[+digit]);
const toman = (value: number) => formatNumber(value);

type WizardStepKey = 'type' | 'place' | 'topic' | 'time' | 'pay';
const STEP_META: Record<WizardStepKey, { title: string; icon: 'sparkle' | 'pin' | 'book' | 'calendar' | 'shield' }> = {
  type: { title: 'نوع جلسه', icon: 'sparkle' },
  place: { title: 'محل برگزاری', icon: 'pin' },
  topic: { title: 'موضوع جلسه', icon: 'book' },
  time: { title: 'زمان جلسه', icon: 'calendar' },
  pay: { title: 'تأیید و پرداخت', icon: 'shield' },
};

const MODE_META: Record<string, { label: string; icon: 'phone' | 'message' | 'video' }> = {
  voice: { label: 'تلفنی', icon: 'phone' },
  text: { label: 'متنی', icon: 'message' },
  video: { label: 'تصویری', icon: 'video' },
};

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
  // جلسات حضوری — محل برگزاری: دفتر استاد یا محل شما (با نشانی واردهٔ کاربر)
  const [inPersonPlace, setInPersonPlace] = useState<'teacher' | 'learner' | ''>('');
  const [inPersonAddress, setInPersonAddress] = useState('');
  // نوع جلسهٔ آنلاین — فوری یا زمان‌دار (null = هنوز انتخاب نشده)
  const [instant, setInstant] = useState<boolean | null>(null);
  // ویزارد شیت — باز/بسته
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStepIndex, setWizardStepIndex] = useState(0);
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
  const onlineServices = useMemo(() => services.filter((service) => service.mode !== 'in_person'), [services]);
  const inPersonServices = useMemo(() => services.filter((service) => service.mode === 'in_person'), [services]);
  const selectedService = useMemo(() => services.find((service) => service.id === serviceId) || null, [serviceId, services]);
  const isInPersonService = selectedService?.mode === 'in_person';
  const teacherHasAddress = Boolean(teacher?.in_person_address && teacher.in_person_address.trim().length > 0);
  const teacherInstantEnabled = teacher?.instant_enabled === true;
  const inPersonValid = !isInPersonService || (inPersonPlace === 'teacher' ? teacherHasAddress : inPersonPlace === 'learner' && inPersonAddress.trim().length >= 5);
  const dateGroups = useMemo(() => {
    const groups = new Map<string, AvailabilitySlot[]>();
    for (const slot of availability) {
      const current = groups.get(slot.local_date) || [];
      current.push(slot);
      groups.set(slot.local_date, slotsSorted(current));
    }
    return Array.from(groups, ([localDate, slots]) => ({ localDate, slots }));
  }, [availability]);
  const selectedDate = useMemo(() => dateGroups.find((group) => group.localDate === selectedDateKey) || null, [dateGroups, selectedDateKey]);
  const selectedSlot = useMemo(() => availability.find((slot) => slot.start_at === selectedStart) || null, [availability, selectedStart]);

  // گروه‌های لیست کشویی خدمات — آنلاین و حضوری
  const menuGroups = useMemo<WebMenuGroup[]>(() => [
    ...(onlineServices.length > 0 ? [{
      title: 'جلسات آنلاین',
      items: onlineServices.map((service) => {
        const modeMeta = MODE_META[service.mode ?? ''];
        return {
          key: String(service.id),
          title: service.title,
          sub: `${fa(service.duration)} دقیقه · ${service.price === 0 ? 'رایگان' : `${toman(service.price)} تومان`}`,
          icon: modeMeta?.icon ?? 'book',
          badge: modeMeta?.label,
          gold: service.price === 0,
        };
      }),
    }] : []),
    ...(inPersonServices.length > 0 ? [{
      title: 'جلسات حضوری — در محل',
      items: inPersonServices.map((service) => ({
        key: String(service.id),
        title: service.title,
        sub: `${fa(service.duration)} دقیقه · ${service.price === 0 ? 'رایگان' : `${toman(service.price)} تومان`}`,
        icon: 'pin',
        badge: 'حضوری',
        gold: true,
      })),
    }] : []),
  ], [onlineServices, inPersonServices]);

  // Booking your own teacher profile is rejected by the API — surface it early.
  const isSelfTeacher = Boolean(teacher?.user_id && meId && teacher.user_id === meId);
  const walletCovers = wallet !== null && selectedService ? wallet >= selectedService.price : false;

  // مراحل ویزارد — با توجه به نوع خدمت و انتخاب‌ها به‌صورت خودکار هرس می‌شوند
  const wizardSteps = useMemo<WizardStepKey[]>(() => {
    if (isInPersonService) return ['place', 'topic', 'time', 'pay'];
    return instant === true ? ['type', 'pay'] : ['type', 'time', 'pay'];
  }, [isInPersonService, instant]);
  const safeStepIndex = Math.min(wizardStepIndex, wizardSteps.length - 1);
  const currentStep = wizardSteps[safeStepIndex];

  const stepValid = (step: WizardStepKey): boolean => {
    switch (step) {
      case 'type': return instant !== null;
      case 'place': return inPersonValid;
      case 'topic': return serviceId > 0;
      case 'time': return instant === true || selectedSlot !== null;
      case 'pay': return !isSelfTeacher;
    }
  };
  const canAdvance = stepValid(currentStep);
  // Prefer wallet when it covers the price; otherwise the gateway is the only
  // viable method. The user can always override while wallet covers the price.
  useEffect(() => {
    if (!selectedService) return;
    setPaymentMethod(walletCovers ? 'wallet' : 'gateway');
  }, [selectedService?.id, walletCovers]);

  function openWizardFor(service: TeacherService) {
    setServiceId(service.id);
    setSelectedDateKey('');
    setSelectedStart('');
    setAvailability([]);
    setInPersonPlace('');
    setInPersonAddress('');
    setInstant(service.mode === 'in_person' ? false : null);
    setWizardStepIndex(0);
    setError('');
    setWizardOpen(true);
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
      // باگ refresh-loop: replace تا صفحهٔ رزرو در تاریخچه بماند و پس از ورود با بازگشت قابل دسترس باشد.
      router.replace(`/panel/login?redirect=${redirect}`);
      return;
    }
    if (isSelfTeacher) {
      setError('نمی‌توانید استاد خودتان را رزرو کنید؛ برای رزرو با حساب قرآن‌آموز وارد شوید.');
      return;
    }
    if (!selectedService || (!selectedSlot && instant !== true)) {
      setError('خدمت، تاریخ و ساعت معتبر را انتخاب کنید.');
      return;
    }
    if (!inPersonValid) {
      setError(isInPersonService && inPersonPlace === 'learner' && inPersonAddress.trim().length < 5
        ? 'نشانی دقیق محل جلسه را وارد کنید.'
        : 'محل برگزاری را انتخاب کنید.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await api.bookSession(token, {
        teacher_id: teacherId,
        service_id: selectedService.id,
        // فوری: آغاز دو دقیقهٔ بعد؛ زمان‌دار: start_at رسمی بک‌اند
        scheduled_at: instant === true
          ? new Date(Date.now() + 2 * 60_000).toISOString()
          : (selectedSlot?.start_at ?? ''),
        note: note.trim() || undefined,
        payment_method: paymentMethod,
        instant: instant === true,
        // جلسات حضوری — محل برگزاری و نشانی؛ برای جلسات آنلاین ارسال نمی‌شود
        ...(isInPersonService && inPersonPlace
          ? {
              in_person_place: inPersonPlace,
              in_person_address: inPersonPlace === 'learner' ? inPersonAddress.trim() : '',
            }
          : {}),
      });
      const result: BookingResult = response.data;
      if (result.token) {
        // پرداخت درگاه: فرم توکن از مرورگر خود کاربر به OnlinePG پست می‌شود —
        // دقیقاً مثل منافسه، در همان تب. جلسه در حالت «awaiting_payment»
        // نگه داشته می‌شود و بعد از تسویه خودکار فعال می‌شود.
        setWizardOpen(false);
        setRedirecting(true);
        payViaSamanGate(result.token);
        return;
      }
      setWizardOpen(false);
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت رزرو انجام نشد.');
      if (instant !== true) refreshAvailability();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <CenterBox>در حال بارگذاری…</CenterBox>;
  if (error && !teacher) return <CenterBox color="var(--rose)">{error}</CenterBox>;
  if (!teacher) return <CenterBox>استاد یافت نشد.</CenterBox>;
  if (redirecting) return <CenterBox><div style={{ width: 80, height: 80, borderRadius: 40, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><Icon name="shield" size={40} /></div><h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>در حال انتقال به درگاه پرداخت…</h1><p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 2, marginBottom: 8 }}>رزرو شما ثبت و تا پایان پرداخت برای شما نگه داشته شده است.</p><p style={{ fontSize: 12.5, color: 'var(--ink-4)' }}>اگر انتقال خودکار انجام نشد، درگاه را در پنجرهٔ جدید باز کنید.</p></CenterBox>;
  if (done) return <CenterBox><div style={{ width: 80, height: 80, borderRadius: 40, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><Icon name="checkCircle" size={44} /></div><h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>{instant ? 'جلسهٔ فوری ثبت شد' : 'درخواست جلسه ثبت شد'}</h1><p style={{ fontSize: 14, color: 'var(--ink-3)', lineHeight: 2, marginBottom: 24 }}>مبلغ از کیف پول شما کسر شد و درخواست برای استاد ارسال شده است. تأیید، رد یا بازگشت وجه از بخش جلسات قابل پیگیری است.</p><Link href="/panel/user/sessions" className="web-fancy-btn" style={{ textDecoration: 'none' }}>مشاهدهٔ جلسات من</Link></CenterBox>;

  return <main style={{ background: 'var(--sand-50)', minHeight: '100vh' }}><div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 60px' }}>
    <Link href={`/teachers/${teacherId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 20 }}><Icon name="arrowL" size={18} /> بازگشت به پروفایل استاد</Link>
    <section style={{ background: '#fff', borderRadius: 20, padding: 16, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16, boxShadow: 'var(--sh-sm)' }}><Avatar size={56} ring tier={teacher.tier} imageUrl={fullUrl(teacher.user?.avatar_url)} /><div><div style={{ fontSize: 16, fontWeight: 800 }}>{teacher.user?.name || 'استاد وُدّا'}</div><div style={{ fontSize: 13, color: 'var(--olive-600)', fontWeight: 600 }}>{teacher.tag}</div></div></section>
    {isSelfTeacher && <div role="alert" style={{ fontSize: 13, lineHeight: 1.9, color: '#8d6d1f', background: 'var(--gold-bg)', padding: 12, borderRadius: 12, marginBottom: 16 }}>این پروفایل متعلق به حساب شماست؛ رزرو جلسه با خودتان ممکن نیست. برای آزمایش فرآیند، با حساب قرآن‌آموز وارد شوید و استاد دیگری را رزرو کنید.</div>}

    {/* ۱. انتخاب خدمت — لیست کشویی زیبا به‌جای چیپ‌ها و کادرها */}
    <Card title="۱. انتخاب خدمت">
      {services.length === 0 ? <EmptyText>این استاد فعلاً خدمت تأییدشده‌ای برای رزرو ندارد.</EmptyText> : (
        <div style={{ display: 'grid', gap: 12 }}>
          <MenuSelect
            ariaLabel="انتخاب خدمت برای شروع رزرو"
            placeholder="برای شروع رزرو، یک خدمت را انتخاب کنید…"
            countLabel="خدمت"
            groups={menuGroups}
            onPick={(key) => {
              const picked = services.find((service) => String(service.id) === key);
              if (picked) openWizardFor(picked);
            }}
          />
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.9, display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--sand-50)', border: '1px solid var(--sand-200)', borderRadius: 14, padding: '10px 12px' }}>
            <Icon name="info" size={16} style={{ flex: '0 0 auto', color: 'var(--olive-600)', marginTop: 3 }} />
            <span>با انتخاب خدمت از لیست کشویی، ویزارد مرحله‌ای رزرو باز می‌شود: نوع جلسه، محل برگزاری (برای جلسات حضوری)، زمان و پرداخت — هر مرحله مستقل با نوار پیشرفت مشخص.</span>
          </p>
        </div>
      )}
    </Card>

    {/* ─── ویزارد شیت — چرخهٔ فرایند رزرو ─── */}
    {wizardOpen && selectedService ? (
      <div className="wizard-overlay" role="dialog" aria-modal="true" aria-label="ویزارد رزرو جلسه" onClick={(event) => { if (event.target === event.currentTarget && !submitting) setWizardOpen(false); }}>
        <div className="wizard-sheet">
          {/* سرستون چرخه */}
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <strong style={{ fontSize: 15.5, fontWeight: 900, minWidth: 0 }}>{selectedService.title}</strong>
              <span className="web-menu-count" style={{ fontSize: 11.5, padding: '4px 12px', gap: 5 }}>
                <Icon name="list" size={13} />
                مرحلهٔ {fa(safeStepIndex + 1)} از {fa(wizardSteps.length)}
              </span>
              <button type="button" aria-label="بستن ویزارد" onClick={() => { if (!submitting) setWizardOpen(false); }} style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 999, border: '1px solid var(--sand-200)', background: '#fff', color: 'var(--ink-3)', cursor: 'pointer', flex: '0 0 auto' }}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <div role="progressbar" aria-valuemin={1} aria-valuemax={wizardSteps.length} aria-valuenow={safeStepIndex + 1} style={{ display: 'flex', gap: 5 }}>
              {wizardSteps.map((step, index) => (
                <span key={step} aria-hidden="true" className="wizard-progress-seg" data-done={index <= safeStepIndex} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              {wizardSteps.map((step, index) => {
                const done = index < safeStepIndex;
                const active = index === safeStepIndex;
                return (
                  <button
                    key={step}
                    type="button"
                    className="wizard-step-chip"
                    data-done={done}
                    data-active={active}
                    onClick={() => { if (index <= safeStepIndex) setWizardStepIndex(index); }}
                  >
                    <Icon name={done ? 'check' : STEP_META[step].icon} size={12} stroke={2.2} />
                    {STEP_META[step].title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* بافت استاد */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 14, background: 'var(--sand-50)', border: '1px solid var(--sand-200)', margin: '14px 0' }}>
            <Avatar size={38} imageUrl={fullUrl(teacher.user?.avatar_url)} name={teacher.user?.name || 'استاد'} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>{teacher.user?.name || 'استاد وُدّا'}</strong>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-3)' }}>{teacher.available ? 'آنلاین — آمادهٔ رزرو' : 'استاد آفلاین است'}</span>
            </div>
            {teacherInstantEnabled && !isInPersonService ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: 'var(--gold-bg)', border: '1px solid #e8d9a8', color: '#8d6d1f', fontSize: 10.5, fontWeight: 800 }}>
                <Icon name="sparkle" size={11} stroke={2.2} /> جلسهٔ فوری
              </span>
            ) : null}
          </div>

          {/* ───── محتوای مرحلهٔ فعلی — فقط همان مرحله ───── */}
          {currentStep === 'type' ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <strong style={{ fontSize: 13.5, display: 'block' }}>چه نوع جلسه‌ای می‌خواهید؟</strong>
              <div role="radiogroup" aria-label="نوع جلسه" style={{ display: 'grid', gap: 10 }}>
                <button type="button" role="radio" aria-checked={instant === true} disabled={!teacherInstantEnabled} onClick={() => teacherInstantEnabled && setInstant(true)} className="web-fancy-pill" data-active={instant === true} data-gold="true" style={{ minHeight: 48, justifyContent: 'flex-start', opacity: teacherInstantEnabled ? 1 : .5, cursor: teacherInstantEnabled ? 'pointer' : 'not-allowed' }}>
                  <Icon name="sparkle" size={15} />
                  <span style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block' }}>جلسهٔ فوری — همین حالا</span>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: .85 }}>{teacherInstantEnabled ? 'درخواست مستقیم؛ آغاز حدود دو دقیقهٔ بعد' : 'این استاد جلسهٔ فوری فعال نکرده است'}</span>
                  </span>
                </button>
                <button type="button" role="radio" aria-checked={instant === false} onClick={() => setInstant(false)} className="web-fancy-pill" data-active={instant === false} data-gold="false" style={{ minHeight: 48, justifyContent: 'flex-start' }}>
                  <Icon name="calendar" size={15} />
                  <span style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block' }}>جلسهٔ زمان‌دار</span>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: .85 }}>روز و ساعت را از تقویم رسمی استاد انتخاب می‌کنید</span>
                  </span>
                </button>
              </div>
            </div>
          ) : null}

          {currentStep === 'place' ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <strong style={{ fontSize: 13.5, display: 'block' }}>جلسه کجا برگزار شود؟</strong>
              <div role="radiogroup" aria-label="محل برگزاری جلسهٔ حضوری" style={{ display: 'grid', gap: 10 }}>
                <button type="button" role="radio" aria-checked={inPersonPlace === 'teacher'} disabled={!teacherHasAddress} onClick={() => teacherHasAddress && setInPersonPlace('teacher')} className="web-fancy-pill" data-active={inPersonPlace === 'teacher'} data-gold="true" style={{ minHeight: 52, justifyContent: 'flex-start', opacity: teacherHasAddress ? 1 : .5, cursor: teacherHasAddress ? 'pointer' : 'not-allowed' }}>
                  <Icon name="pin" size={16} />
                  <span style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block' }}>در محل استاد</span>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: .85, maxWidth: 380 }}>{teacherHasAddress ? `نشانی ثبت‌شدهٔ استاد: ${teacher?.in_person_address}` : 'این استاد هنوز نشانی محل برگزاری خود را ثبت نکرده است؛ می‌توانید جلسه را در محل خودتان برگزار کنید.'}</span>
                  </span>
                </button>
                <button type="button" role="radio" aria-checked={inPersonPlace === 'learner'} onClick={() => setInPersonPlace('learner')} className="web-fancy-pill" data-active={inPersonPlace === 'learner'} data-gold="false" style={{ minHeight: 52, justifyContent: 'flex-start' }}>
                  <Icon name="home" size={16} />
                  <span style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block' }}>در محل شما</span>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: .85 }}>استاد به نشانی شما می‌آید؛ نشانی دقیق را در کادر زیر می‌نویسید.</span>
                  </span>
                </button>
              </div>
              {inPersonPlace === 'learner' ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  <textarea aria-label="نشانی دقیق محل جلسه" value={inPersonAddress} maxLength={255} onChange={(event) => setInPersonAddress(event.target.value)} placeholder="مثلاً: تهران، خیابان ولیعصر، کوچهٔ مهر، پلاک ۱۲، واحد ۳…" style={{ width: '100%', minHeight: 80, padding: 14, borderRadius: 14, border: '1px solid var(--sand-200)', resize: 'vertical', fontFamily: 'inherit' }} />
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'left' }}>{fa(inPersonAddress.trim().length)}/۲۵۵</span>
                </div>
              ) : inPersonPlace === 'teacher' && teacherHasAddress ? (
                <div role="status" style={{ fontSize: 12.5, color: '#8d6d1f', background: 'var(--gold-bg)', border: '1px solid #e8d9a8', padding: '10px 12px', borderRadius: 12, lineHeight: 1.9 }}>{teacher?.in_person_address}</div>
              ) : null}
            </div>
          ) : null}

          {currentStep === 'topic' ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <strong style={{ fontSize: 13.5, display: 'block' }}>موضوع جلسه حضوری</strong>
              <div role="radiogroup" aria-label="موضوع جلسهٔ حضوری" style={{ display: 'grid', gap: 10 }}>
                {inPersonServices.map((service) => {
                  const active = service.id === serviceId;
                  return (
                    <button key={service.id} type="button" role="radio" aria-checked={active} onClick={() => { if (!active) { setServiceId(service.id); setSelectedDateKey(''); setSelectedStart(''); setAvailability([]); } }} className="web-fancy-pill" data-active={active} data-gold="true" style={{ minHeight: 52, justifyContent: 'flex-start' }}>
                      <Icon name="pin" size={16} />
                      <span style={{ textAlign: 'right', flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block' }}>{service.title}</span>
                        <span style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: .85 }}>{fa(service.duration)} دقیقه · {service.price === 0 ? 'رایگان' : `${toman(service.price)} تومان`}</span>
                      </span>
                      {active ? <Icon name="check" size={15} stroke={2.4} /> : null}
                    </button>
                  );
                })}
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.9, display: 'flex', gap: 7 }}>
                <Icon name="info" size={14} style={{ flex: '0 0 auto', marginTop: 3, color: 'var(--olive-600)' }} />
                جلسهٔ حضوری در محل انتخابی مرحلهٔ قبل برگزار می‌شود.
              </p>
            </div>
          ) : null}

          {currentStep === 'time' ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <strong style={{ fontSize: 13.5, display: 'block' }}>روز و ساعت جلسه</strong>
              {loadingAvailability ? <EmptyText>در حال دریافت زمان‌های قابل رزرو…</EmptyText>
                : availabilityError ? <div role="alert" style={{ color: 'var(--rose)', lineHeight: 1.9 }}>{availabilityError}<button type="button" onClick={refreshAvailability} className="web-fancy-ghost" style={{ display: 'flex', marginTop: 10, color: 'var(--rose)' }}>تلاش دوباره</button></div>
                  : dateGroups.length === 0 ? <EmptyText>در ۱۴ روز آینده زمان آزاد و قابل رزروی برای این خدمت وجود ندارد.</EmptyText>
                    : <>
                      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
                        {dateGroups.map((group) => <button key={group.localDate} type="button" onClick={() => chooseDate(group.localDate)} className="web-fancy-pill" data-active={selectedDateKey === group.localDate} data-gold="false" style={{ flex: '0 0 auto', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                          <span>{formatLocalDate(group.localDate)}</span>
                          <small style={{ opacity: .75, fontSize: 10.5 }}>{fa(group.slots.length)} زمان</small>
                        </button>)}
                      </div>
                      {selectedDate && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {selectedDate.slots.map((slot) => <button key={slot.start_at} type="button" onClick={() => setSelectedStart(slot.start_at)} className="web-fancy-pill" data-active={selectedStart === slot.start_at} data-gold="false">{fa(slot.local_start)} تا {fa(slot.local_end)}</button>)}
                      </div>}
                    </>}
            </div>
          ) : null}

          {currentStep === 'pay' ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <strong style={{ fontSize: 13.5, display: 'block' }}>خلاصهٔ رزرو</strong>
              <div style={{ display: 'grid', gap: 0 }}>
                <SummaryRow label="خدمت" value={selectedService.title} />
                {isInPersonService ? <SummaryRow label="محل برگزاری" value={inPersonPlace === 'teacher' ? 'در محل استاد' : 'در محل شما'} /> : null}
                {isInPersonService && (inPersonPlace === 'teacher' ? (teacher?.in_person_address || '') : inPersonPlace === 'learner' ? inPersonAddress.trim() : '') ? <SummaryRow label="نشانی" value={inPersonPlace === 'teacher' ? (teacher?.in_person_address || '') : inPersonAddress.trim()} /> : null}
                {instant === true ? (
                  <SummaryRow label="نوع جلسه" value="فوری — حدود دو دقیقهٔ دیگر" />
                ) : (
                  <>
                    <SummaryRow label="تاریخ" value={selectedSlot ? formatLocalDate(selectedSlot.local_date) : '—'} />
                    <SummaryRow label="ساعت" value={selectedSlot ? `${fa(selectedSlot.local_start)} تا ${fa(selectedSlot.local_end)}` : '—'} />
                  </>
                )}
                <SummaryRow label="مدت" value={`${fa(selectedService.duration)} دقیقه`} />
                <SummaryRow label="مبلغ" value={selectedService.price === 0 ? 'رایگان' : `${toman(selectedService.price)} تومان`} />
              </div>

              {selectedService.price > 0 ? (
                <div role="radiogroup" aria-label="روش پرداخت" style={{ display: 'grid', gap: 10 }}>
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
              ) : null}

              <textarea aria-label="یادداشت برای استاد" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="یادداشت برای استاد (اختیاری)…" style={{ width: '100%', minHeight: 90, padding: 14, borderRadius: 14, border: '1px solid var(--sand-200)', resize: 'vertical', fontFamily: 'inherit' }} />

              {error ? <div role="alert" style={{ fontSize: 13, color: 'var(--rose)', background: 'var(--clay-bg)', padding: 12, borderRadius: 12 }}>{error}</div> : null}

              <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.9 }}>{paymentMethod === 'gateway' && selectedService.price > 0 ? 'با ثبت رزرو به درگاه امن سامان‌سپ منتقل می‌شوید و پس از پرداخت موفق، درخواست برای استاد ارسال می‌شود. در صورت لغو یا انقضای پرداخت، زمان آزاد می‌شود.' : selectedService.price === 0 ? 'جلسهٔ رایگان بدون پرداخت ثبت می‌شود.' : 'مبلغ هنگام ثبت رزرو از کیف پول کسر می‌شود.'} زمان‌ها در timezone رسمی سامانه محاسبه شده‌اند و ممکن است تا لحظهٔ ثبت توسط کاربر دیگری رزرو شوند.</p>
            </div>
          ) : null}

          {/* ناوبری چرخه — بازگشت / مرحلهٔ بعد / ثبت و پرداخت */}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            {safeStepIndex > 0 ? (
              <button type="button" className="web-fancy-ghost" onClick={() => setWizardStepIndex((value) => Math.max(0, value - 1))} disabled={submitting} style={{ flex: '0 0 auto', minWidth: 112 }}>
                بازگشت
              </button>
            ) : null}
            {safeStepIndex < wizardSteps.length - 1 ? (
              <button type="button" className="web-fancy-btn" onClick={() => setWizardStepIndex((value) => value + 1)} disabled={!canAdvance} style={{ flex: 1, opacity: canAdvance ? 1 : .55 }}>
                مرحلهٔ بعد
                <Icon name="chevronL" size={15} />
              </button>
            ) : (
              <button type="button" className="web-fancy-btn web-fancy-btn-gold" onClick={() => void submitBooking()} disabled={submitting || isSelfTeacher || !canAdvance} style={{ flex: 1, opacity: submitting ? .7 : 1 }}>
                {submitting ? 'در حال ثبت…' : selectedService.price === 0 ? 'ثبت جلسهٔ رایگان' : instant === true ? (paymentMethod === 'gateway' ? 'پرداخت و ثبت جلسهٔ فوری' : 'ثبت جلسهٔ فوری') : paymentMethod === 'gateway' ? 'پرداخت و ثبت رزرو' : 'ثبت درخواست رزرو'}
                {!submitting ? <Icon name="checkCircle" size={16} /> : null}
              </button>
            )}
          </div>
        </div>
      </div>
    ) : null}
  </div></main>;
}

function slotsSorted(slots: AvailabilitySlot[]): AvailabilitySlot[] {
  return [...slots].sort((left, right) => left.start_at.localeCompare(right.start_at));
}

function formatLocalDate(localDate: string) { return formatDate(new Date(`${localDate}T00:00:00Z`), 'fa', 'dayMonth'); }
function CenterBox({ children, color = 'var(--ink)' }: { children: React.ReactNode; color?: string }) { return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--sand-50)', color }}><div style={{ maxWidth: 480, textAlign: 'center' }}>{children}</div></main>; }
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section style={{ background: '#fff', borderRadius: 20, padding: 20, boxShadow: 'var(--sh-sm)', marginBottom: 16 }}><h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>{title}</h2>{children}</section>; }
function EmptyText({ children }: { children: React.ReactNode }) { return <p style={{ fontSize: 14, color: 'var(--ink-4)', lineHeight: 1.9 }}>{children}</p>; }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--sand-100)' }}><span style={{ color: 'var(--ink-3)', fontSize: 13 }}>{label}</span><strong style={{ fontSize: 13.5, textAlign: 'left', minWidth: 0 }}>{value}</strong></div>; }
function paymentOption(selected: boolean, disabled: boolean): React.CSSProperties { return { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 14, borderRadius: 16, border: `1.5px solid ${selected ? 'var(--olive-600)' : 'var(--sand-200)'}`, background: selected ? 'var(--olive-50)' : '#fff', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .55 : 1, textAlign: 'right', fontFamily: 'inherit' }; }
function radioDot(selected: boolean): React.CSSProperties { return { width: 20, height: 20, flex: '0 0 20px', borderRadius: 999, border: `2px solid ${selected ? 'var(--olive-600)' : 'var(--sand-200)'}`, background: selected ? 'var(--olive-600)' : '#fff', boxShadow: selected ? 'inset 0 0 0 4px #fff' : 'none', transition: 'all .15s' }; }
