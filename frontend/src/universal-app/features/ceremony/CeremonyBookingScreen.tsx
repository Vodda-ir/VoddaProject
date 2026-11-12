"use client";

// «قرارداد مراسم» — کارت قرارداد با خط وضعیت (ودیعه → اجرا → تسویه)، ریز
// مالی، اطلاعات طرفین و اکشن‌های هر نقش: پرداخت ودیعه (کیف پول/درگاه سامان)،
// تأیید اجرا و تسویه، و لغو بر اساس سیاست بازگشت وجه.

import { useCallback, useEffect, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { payViaSamanGate } from "../../../lib/saman-gate";
import { toFaDigits } from "../../ui/persian";
import {
  Avatar,
  Button,
  Card,
  Dialog,
  ErrorState,
  Icon,
  LoadingState,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { TierBadge } from "../teachers/TierBadge";
import { PaymentResultBanner } from "../payments/PaymentResultBanner";
import { APP_LANDING_CEREMONY_BOOKINGS } from "../payments/landing";
import { cancelCeremonyBooking, confirmCeremonyBooking, getCeremonyBooking, payCeremonyBooking } from "./api";
import {
  ToneChip,
  bookingStatusMeta,
  formatAmountFull,
} from "./elements";
import { formatJalaliDateTime } from "../../ui/jalali";
import type { CeremonyBooking } from "./types";

type TimelineStep = { key: string; label: string; reached: boolean; current: boolean; danger?: boolean };

function timelineOf(booking: CeremonyBooking): TimelineStep[] {
  if (booking.status === "cancelled") {
    return [
      { key: "deposit", label: "ودیعه", reached: false, current: false },
      { key: "run", label: "اجرا", reached: false, current: false },
      { key: "settled", label: "لغو شد", reached: true, current: true, danger: true },
    ];
  }
  const depositDone = booking.status !== "deposit_pending";
  const settled = booking.status === "settled";
  return [
    { key: "deposit", label: "در انتظار ودیعه", reached: true, current: !depositDone },
    { key: "paid", label: "ودیعه پرداخت شد", reached: depositDone, current: depositDone && !settled },
    { key: "settled", label: "تسویه شد", reached: settled, current: settled },
  ];
}

function Timeline({ booking }: { booking: CeremonyBooking }) {
  const steps = timelineOf(booking);
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
      {steps.map((step, index) => (
        <div key={step.key} style={{ flex: 1, display: "grid", justifyItems: "center", gap: 6, position: "relative" }}>
          {index > 0 ? (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 13,
                insetInlineEnd: "50%",
                width: "100%",
                height: 2,
                background: step.reached ? colors.olive400 : colors.sand200,
              }}
            />
          ) : null}
          <span
            aria-hidden="true"
            style={{
              width: 26,
              height: 26,
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              zIndex: 1,
              color: colors.surface,
              background: step.danger ? colors.danger : step.reached ? colors.olive600 : colors.sand200,
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {step.reached ? "✓" : toFaDigits(index + 1)}
          </span>
          <span
            style={{
              fontSize: 10.5,
              lineHeight: 1.5,
              textAlign: "center",
              color: step.current ? (step.danger ? colors.danger : colors.olive700) : colors.inkMuted,
              fontWeight: step.current ? 800 : 600,
            }}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function MoneyRow({ label, value, strong = false, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.md, paddingBlock: 7 }}>
      <span style={{ fontSize: 12.5, color: colors.inkMuted }}>{label}</span>
      <strong style={{ fontSize: strong ? 14.5 : 13, color: tone ?? colors.ink, textAlign: "left" }}>{value}</strong>
    </div>
  );
}

function PersonRow({
  title,
  name,
  avatar,
  tag,
  phone,
}: {
  title: string;
  name: string;
  avatar?: string;
  tag?: string;
  phone?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Avatar name={name} src={avatar || undefined} size={44} ring={false} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "block", fontSize: 11, color: colors.inkMuted }}>{title}</span>
        <strong style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 14, color: colors.ink }}>
          {name}
          {tag ? <TierBadge tier={tag} /> : null}
        </strong>
        {phone ? (
          <a
            href={`tel:${phone}`}
            dir="ltr"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 2, fontSize: 12.5, color: colors.olive700, textDecoration: "none", fontWeight: 700 }}
          >
            <Icon name="phone" size={13} />
            {toFaDigits(phone)}
          </a>
        ) : (
          <span style={{ display: "block", fontSize: 11, color: colors.inkFaint }}>شماره پس از قطعی‌سازی در دسترس است</span>
        )}
      </div>
    </div>
  );
}

export function CeremonyBookingScreen({ bookingId, config }: { bookingId: string; config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const numericId = Number(bookingId);
  const validId = Number.isInteger(numericId) && numericId > 0;
  const [booking, setBooking] = useState<CeremonyBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const refreshTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    if (!validId) return;
    try {
      setBooking(await getCeremonyBooking(runtime, numericId));
      setError("");
    } catch (caught) {
      setError(messageOf(caught, "قرارداد دریافت نشد."));
    } finally {
      setLoading(false);
    }
  }, [numericId, runtime, validId]);

  useEffect(() => {
    if (!validId) {
      setError("شناسه قرارداد نامعتبر است.");
      setLoading(false);
      return;
    }
    void load();
  }, [load, validId]);

  // اگر پرداخت در تب دیگری تکمیل شود، وضعیت قرارداد همین‌جا هم تازه شود.
  useEffect(() => {
    refreshTimer.current = window.setInterval(() => {
      if (booking?.status === "deposit_pending" || booking?.status === "deposit_paid") void load();
    }, 15000);
    return () => {
      if (refreshTimer.current) window.clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    };
  }, [booking?.status, load]);

  const pay = useCallback(
    async (method: "wallet" | "gateway") => {
      if (!booking || busy) return;
      setBusy(method);
      setActionError("");
      try {
        const outcome = await payCeremonyBooking(runtime, booking.id, method);
        setBooking(outcome.booking);
        if (outcome.method === "gateway") {
          setRedirecting(true);
          // فرم توکن از مرورگر خود کاربر به OnlinePG پست می‌شود — دقیقاً مثل
          // رزرو جلسه؛ در همان تب تا در وب‌ویو اپ هم درست باز شود.
          payViaSamanGate(outcome.token);
          return;
        }
      } catch (caught) {
        if (method === "wallet") {
          setActionError(
            messageOf(caught, "پرداخت از کیف پول انجام نشد. موجودی کیف پول را بررسی کنید یا پرداخت با کارت بانکی را برگزینید."),
          );
        } else {
          setActionError(messageOf(caught, "انتقال به درگاه پرداخت انجام نشد."));
        }
      } finally {
        setBusy("");
      }
    },
    [booking, busy, runtime],
  );

  const confirmRun = useCallback(async () => {
    if (!booking || busy) return;
    setBusy("confirm");
    setActionError("");
    try {
      setBooking(await confirmCeremonyBooking(runtime, booking.id));
      setConfirmOpen(false);
    } catch (caught) {
      setActionError(messageOf(caught, "تأیید اجرا و تسویه انجام نشد."));
      setConfirmOpen(false);
    } finally {
      setBusy("");
    }
  }, [booking, busy, runtime]);

  const cancelContract = useCallback(async () => {
    if (!booking || busy) return;
    setBusy("cancel");
    setActionError("");
    try {
      setBooking(await cancelCeremonyBooking(runtime, booking.id));
      setCancelOpen(false);
    } catch (caught) {
      setActionError(messageOf(caught, "لغو قرارداد انجام نشد."));
      setCancelOpen(false);
    } finally {
      setBusy("");
    }
  }, [booking, busy, runtime]);

  if (loading) return <LoadingState label="در حال دریافت قرارداد…" />;

  if (error || !booking) {
    return (
      <ErrorState
        title="دریافت قرارداد ناموفق بود"
        description={error || "این قرارداد پیدا نشد یا به شما تعلق ندارد."}
        action={
          <div style={{ display: "grid", gap: spacing.sm }}>
            <Button variant="secondary" onClick={() => { setLoading(true); setError(""); void load(); }}>تلاش دوباره</Button>
            <Button variant="ghost" onClick={() => navigateApp("/", config)}>بازگشت به خانه</Button>
          </div>
        }
      />
    );
  }

  if (redirecting) {
    return (
      <Card elevated style={{ display: "grid", gap: spacing.lg, textAlign: "center" }}>
        <div aria-hidden="true" style={{ width: 68, height: 68, display: "grid", placeItems: "center", marginInline: "auto", borderRadius: "50%", color: colors.surface, background: colors.olive600, boxShadow: shadows.olive }}>
          <Icon name="shield" size={30} stroke={2.2} />
        </div>
        <div>
          <h2 style={{ ...typography.title, margin: 0 }}>در حال انتقال به درگاه پرداخت…</h2>
          <p style={{ ...typography.body, color: colors.inkSecondary, marginBottom: 0 }}>
            ودیعهٔ مراسم ثبت شد؛ پس از پرداخت موفق به همین صفحه برمی‌گردید.
          </p>
        </div>
        <span dir="ltr" style={{ ...typography.caption, color: colors.inkFaint }}>{APP_LANDING_CEREMONY_BOOKINGS}/{booking.id}</span>
      </Card>
    );
  }

  const isOrganizer = booking.role === "organizer";
  const isProvider = booking.role === "provider";
  const depositPending = booking.status === "deposit_pending";
  const depositPaid = booking.status === "deposit_paid";
  const settled = booking.status === "settled";
  const cancelled = booking.status === "cancelled";
  const venueHidden = !booking.venue;
  const venueLabel = booking.venue || "پس از پرداخت ودیعه نمایش داده می‌شود";

  return (
    <div className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
      <PaymentResultBanner />

      <Card elevated className="vodda-enter" style={{ display: "grid", gap: spacing.lg, borderRadius: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md, flexWrap: "wrap" }}>
          <strong style={{ ...typography.title, color: colors.ink }}>قرارداد مراسم #{toFaDigits(booking.id)}</strong>
          <ToneChip tone={bookingStatusMeta[booking.status]} />
        </div>

        <Timeline booking={booking} />

        <div style={{ display: "grid", gap: 8 }}>
          <strong style={{ fontSize: 15.5, fontWeight: 800, color: colors.ink }}>{booking.service_title}</strong>
          {[
            { icon: "calendar" as const, text: booking.scheduled_at ? formatJalaliDateTime(booking.scheduled_at, { withWeekday: true }) : "زمان نامشخص" },
            { icon: "pin" as const, text: booking.city || "شهر نامشخص" },
            { icon: "heart" as const, text: booking.venue || "پس از پرداخت ودیعه نمایش داده می‌شود" },
          ].map((row) => (
            <span key={row.icon} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: colors.inkSecondary, background: colors.sand50, borderRadius: 12, padding: "9px 12px" }}>
              <Icon name={row.icon} size={15} style={{ color: colors.olive600, flex: "0 0 auto" }} />
              {row.text}
            </span>
          ))}
        </div>
        {venueHidden && depositPaid ? (
          <span style={{ ...typography.caption, color: colors.goldDark }}>
            نشانی دقیق مکان به‌محض هماهنگی طرفین تکمیل می‌شود.
          </span>
        ) : null}
      </Card>

      <Card className="vodda-enter vodda-enter-delay-1" style={{ display: "grid", gap: spacing.xs, borderRadius: 22 }}>
        <strong style={{ fontSize: 14.5, fontWeight: 800, color: colors.ink, marginBottom: 6 }}>ریز مالی قرارداد</strong>
        <MoneyRow label="حق‌الزحمهٔ مراسم" value={formatAmountFull(booking.price)} strong />
        <MoneyRow
          label={`کارمزد سامانه (${toFaDigits(Math.round(booking.commission_rate))}٪)`}
          value={formatAmountFull(booking.commission_amount)}
          tone={colors.inkSecondary}
        />
        <div style={{ height: 1, background: colors.sand150, marginBlock: 3 }} />
        <MoneyRow
          label={`ودیعهٔ لازم برای قطعی‌سازی (${toFaDigits(Math.round(booking.deposit_rate))}٪)`}
          value={formatAmountFull(booking.deposit_amount)}
          tone={colors.goldDark}
          strong
        />
        <p style={{ margin: "8px 0 0", fontSize: 11.5, color: colors.inkMuted, lineHeight: 1.8 }}>
          ودیعه نزد سامانه امانت می‌ماند و پس از تأیید اجرای مراسم توسط برگزارکننده، به‌همراه مابقی مبلغ به قاری پرداخت می‌شود.
        </p>
      </Card>

      <Card className="vodda-enter vodda-enter-delay-2" style={{ display: "grid", gap: spacing.lg, borderRadius: 22 }}>
        <PersonRow
          title="قاری مراسم"
          name={booking.provider.name}
          avatar={booking.provider.avatar_url}
          tag={booking.provider.tier}
          phone={booking.provider.phone}
        />
        <div style={{ height: 1, background: colors.sand150 }} />
        <PersonRow
          title="برگزارکننده"
          name={booking.organizer.name}
          avatar={booking.organizer.avatar_url}
          phone={booking.organizer.phone}
        />
      </Card>

      {booking.note ? (
        <Card style={{ padding: 14, borderRadius: 18, display: "flex", gap: 9, alignItems: "flex-start" }}>
          <Icon name="message" size={17} style={{ flex: "0 0 auto", color: colors.olive600 }} />
          <p style={{ margin: 0, fontSize: 13, color: colors.inkSecondary, lineHeight: 1.9 }}>{booking.note}</p>
        </Card>
      ) : null}

      {settled ? (
        <Card style={{ display: "grid", gap: 10, textAlign: "center", padding: 22, borderRadius: 20, background: colors.successBackground, borderColor: colors.olive200 }}>
          <div aria-hidden="true" style={{ width: 62, height: 62, display: "grid", placeItems: "center", marginInline: "auto", borderRadius: "50%", color: colors.surface, background: colors.olive600 }}>
            <Icon name="checkCircle" size={30} stroke={2.3} />
          </div>
          <strong style={{ fontSize: 15.5, color: colors.olive800 }}>مراسم برگزار و قرارداد تسویه شد 🌿</strong>
          <p style={{ margin: 0, fontSize: 12.5, color: colors.inkSecondary, lineHeight: 1.9 }}>
            {isOrganizer
              ? "از انتخاب و اعتماد شما سپاسگزاریم؛ حق‌الزحمهٔ قاری تسویه شد."
              : `حق‌الزحمهٔ این مراسم ${booking.settled_at ? `در ${formatJalaliDateTime(booking.settled_at, { withTime: false })} ` : ""}به کیف پول شما واریز شد.`}
          </p>
        </Card>
      ) : null}

      {cancelled ? (
        <Card style={{ display: "grid", gap: 8, textAlign: "center", padding: 22, borderRadius: 20, background: colors.dangerBackground, borderColor: "rgba(166,81,81,.2)" }}>
          <strong style={{ fontSize: 15, color: colors.danger }}>این قرارداد لغو شده است</strong>
          <p style={{ margin: 0, fontSize: 12.5, color: colors.inkSecondary, lineHeight: 1.9 }}>
            {isOrganizer
              ? "بازگشت ودیعه بر اساس سیاست لغو (فاصله تا زمان مراسم) انجام شده یا در جریان است."
              : "این مراسم از سوی برگزارکننده لغو شد؛ در صورت پرداخت ودیعه، بازگشت وجه طبق سیاست سامانه انجام می‌شود."}
          </p>
        </Card>
      ) : null}

      {isOrganizer && depositPending ? (
        <Card style={{ display: "grid", gap: spacing.md, borderRadius: 22, borderColor: colors.goldSoft, background: colors.goldBackground }}>
          <strong style={{ fontSize: 14.5, color: colors.goldDark }}>برای قطعی‌شدن مراسم، ودیعه را پرداخت کنید</strong>
          <p style={{ margin: 0, fontSize: 12, color: colors.goldDark, opacity: 0.9, lineHeight: 1.8 }}>
            مبلغ ودیعه: {formatAmountFull(booking.deposit_amount)} — تا پرداخت ودیعه، قرارداد برای قاری قطعی نیست و مکان مراسم مخفی می‌ماند.
          </p>
          <Button fullWidth loading={busy === "wallet"} disabled={Boolean(busy)} onClick={() => void pay("wallet")} style={{ minHeight: 50 }}>
            <Icon name="wallet" size={18} />
            پرداخت ودیعه از کیف پول
          </Button>
          <Button fullWidth variant="secondary" loading={busy === "gateway"} disabled={Boolean(busy)} onClick={() => void pay("gateway")} style={{ minHeight: 50 }}>
            <Icon name="shield" size={18} />
            پرداخت با کارت بانکی
          </Button>
        </Card>
      ) : null}

      {isOrganizer && depositPaid ? (
        <Card style={{ display: "grid", gap: spacing.md, borderRadius: 22, borderColor: colors.olive200 }}>
          <strong style={{ fontSize: 14.5, color: colors.ink }}>مراسم برگزار شد؟</strong>
          <p style={{ margin: 0, fontSize: 12, color: colors.inkMuted, lineHeight: 1.9 }}>
            با تأیید اجرا، مابقی مبلغ از کیف پول شما به قاری تسویه می‌شود. این اقدام بازگشت‌پذیر نیست.
          </p>
          <Button fullWidth loading={busy === "confirm"} disabled={Boolean(busy)} onClick={() => setConfirmOpen(true)} style={{ minHeight: 50 }}>
            <Icon name="checkCircle" size={18} />
            تأیید اجرا و تسویه
          </Button>
        </Card>
      ) : null}

      {isProvider && depositPaid ? (
        <Card style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 15, borderRadius: 20, borderColor: colors.olive200, background: colors.olive50 }}>
          <Icon name="clock" size={19} style={{ color: colors.olive700, flex: "0 0 auto", marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 12.5, color: colors.olive800, lineHeight: 1.9 }}>
            ودیعه پرداخت شده و مراسم قطعی است. پس از اجرای مراسم، برگزارکننده تسویه را تأیید می‌کند و حق‌الزحمهٔ شما به کیف پول واریز می‌شود.
          </p>
        </Card>
      ) : null}

      {isProvider && depositPending ? (
        <Card style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 15, borderRadius: 20, borderColor: colors.goldSoft, background: colors.goldBackground }}>
          <Icon name="clock" size={19} style={{ color: colors.goldDark, flex: "0 0 auto", marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 12.5, color: colors.goldDark, lineHeight: 1.9 }}>
            منتظر پرداخت ودیعه از سوی برگزارکننده هستید؛ تا آن زمان مراسم قطعی نشده است.
          </p>
        </Card>
      ) : null}

      {actionError ? (
        <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, margin: 0 }}>
          {actionError}
        </p>
      ) : null}

      {isOrganizer && (depositPending || depositPaid) ? (
        <Button
          variant="secondary"
          fullWidth
          loading={busy === "cancel"}
          disabled={Boolean(busy)}
          onClick={() => setCancelOpen(true)}
          style={{ minHeight: 48 }}
        >
          لغو قرارداد
        </Button>
      ) : null}

      <Dialog
        open={confirmOpen}
        title="تأیید اجرا و تسویه"
        onClose={() => { if (busy !== "confirm") setConfirmOpen(false); }}
      >
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary, lineHeight: 2 }}>
          با تأیید اجرا، حق‌الزحمهٔ {booking.provider.name} پس از کسر کارمزد سامانه از ودیعه و ماندهٔ قرارداد تسویه می‌شود و قرارداد بسته می‌شود؛ این اقدام بازگشت‌پذیر نیست. مراسم برگزار شده است؟
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={busy === "confirm"}>بازگشت</Button>
          <Button onClick={() => void confirmRun()} loading={busy === "confirm"}>تأیید و تسویه</Button>
        </div>
      </Dialog>

      <Dialog
        open={cancelOpen}
        title="لغو قرارداد"
        onClose={() => { if (busy !== "cancel") setCancelOpen(false); }}
      >
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary, lineHeight: 2 }}>
          سیاست لغو وُدّا: بازگشت ودیعه بر اساس فاصلهٔ زمانی تا شروع مراسم محاسبه می‌شود؛ هرچه به زمان مراسم نزدیک‌تر باشید، بخش کمتری از ودیعه بازمی‌گردد و در صورت لغو، حق قاری طبق همین سیاست محفوظ می‌ماند.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={busy === "cancel"}>انصراف</Button>
          <Button variant="danger" onClick={() => void cancelContract()} loading={busy === "cancel"}>لغو قرارداد</Button>
        </div>
      </Dialog>

      {isOrganizer && settled ? (
        <Button variant="secondary" fullWidth onClick={() => navigateApp("/ceremony/calls", config)} style={{ minHeight: 46 }}>
          فراخوان‌های من
        </Button>
      ) : null}
    </div>
  );
}
