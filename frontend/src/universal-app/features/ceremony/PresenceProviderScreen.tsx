"use client";

// پروفایل عمومی قاری حضوری + «رزرو مستقیم» هر خدمت حضوری (فرم جلالی →
// قرارداد مستقیم بدون فراخوان).

import { useCallback, useEffect, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { toFaDigits } from "../../ui/persian";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
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
import { createDirectBooking, getPresenceProvider } from "./api";
import {
  JalaliWhenPicker,
  SampleAudioList,
  formatToman,
  inputStyle,
} from "./elements";
import { isWhenInFuture, tehranWallToRfc3339, type WhenValue } from "./schedule";
import type { PresenceProvider, PresenceService } from "./types";

function todayLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function DirectBookingForm({
  service,
  provider,
  config,
  onDone,
}: {
  service: PresenceService;
  provider: PresenceProvider;
  config: UniversalAppConfig;
  onDone?: () => void;
}) {
  const runtime = usePlatform();
  const [when, setWhen] = useState<WhenValue>(() => ({ localDate: todayLocalDate(), hh: 18, mm: 0 }));
  const [city, setCity] = useState(provider.city);
  const [venue, setVenue] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [actionError, setActionError] = useState("");

  const submit = useCallback(async () => {
    if (saving) return;
    setValidationError("");
    setActionError("");
    if (!isWhenInFuture(when)) {
      setValidationError("زمان مراسم باید در آینده باشد؛ دست‌کم ۱۵ دقیقه بعد از الآن.");
      return;
    }
    if (!city.trim()) {
      setValidationError("شهر برگزاری مراسم را وارد کنید.");
      return;
    }
    setSaving(true);
    try {
      const booking = await createDirectBooking(runtime, {
        presenceServiceId: service.id,
        scheduledAt: tehranWallToRfc3339(when),
        city: city.trim(),
        venueHint: venue.trim(),
        note: note.trim(),
      });
      navigateApp(`/ceremony/bookings/${booking.id}`, config);
    } catch (caught) {
      setActionError(messageOf(caught, "ثبت رزرو مستقیم انجام نشد."));
    } finally {
      setSaving(false);
    }
  }, [city, config, note, runtime, saving, service.id, venue, when]);

  return (
    <div style={{ display: "grid", gap: spacing.lg, marginTop: spacing.md, padding: 14, background: colors.surfaceSoft, border: `1px solid ${colors.olive200}`, borderRadius: 16 }}>
      <JalaliWhenPicker value={when} onChange={setWhen} label="تاریخ و ساعت مراسم" />
      <input
        type="text"
        value={city}
        onChange={(event) => setCity(event.target.value.slice(0, 60))}
        placeholder="شهر برگزاری"
        style={inputStyle}
        aria-label={`شهر برگزاری برای خدمت ${service.title}`}
      />
      <input
        type="text"
        value={venue}
        onChange={(event) => setVenue(event.target.value.slice(0, 200))}
        placeholder="نشانی مکان (اختیاری و محرمانه تا پرداخت ودیعه)"
        style={inputStyle}
        aria-label={`نشانی مکان برای خدمت ${service.title}`}
      />
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value.slice(0, 300))}
        rows={2}
        placeholder="یادداشت برای قاری (اختیاری)…"
        style={{ ...inputStyle, resize: "none", lineHeight: 1.9 }}
        aria-label={`یادداشت برای خدمت ${service.title}`}
      />
      {validationError ? (
        <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.goldBackground, color: colors.goldDark, margin: 0 }}>
          {validationError}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, margin: 0 }}>
          {actionError}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: spacing.sm }}>
        {onDone ? (
          <Button variant="secondary" onClick={onDone} disabled={saving} style={{ minHeight: 46, flex: "0 0 auto" }}>
            بستن
          </Button>
        ) : null}
        <Button fullWidth loading={saving} disabled={saving} onClick={() => void submit()} style={{ minHeight: 50 }}>
          ثبت رزرو و پرداخت ودیعه
        </Button>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: colors.inkMuted, lineHeight: 1.8 }}>
        پس از ثبت رزرو، قرارداد ساخته می‌شود؛ ودیعهٔ قطعی‌سازی بر اساس نرخ رسمی سامانه در صفحهٔ قرارداد محاسبه و دریافت می‌شود.
      </p>
    </div>
  );
}

function ServiceCard({
  service,
  provider,
  config,
}: {
  service: PresenceService;
  provider: PresenceProvider;
  config: UniversalAppConfig;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="vodda-enter"
      style={{
        border: `1px solid ${colors.sand200}`,
        borderRadius: 18,
        padding: 14,
        display: "grid",
        gap: 10,
        background: colors.surface,
        boxShadow: shadows.sm,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: colors.ink }}>{service.title}</strong>
          <span style={{ display: "block", fontSize: 12, color: colors.inkMuted, marginTop: 2 }}>
            ⏱ {toFaDigits(service.duration)} دقیقه · 📍 {service.cities || provider.city || "همهٔ شهرها"}
          </span>
        </div>
        <strong style={{ fontSize: 13.5, color: colors.goldDark, whiteSpace: "nowrap" }}>{formatToman(service.base_price)}</strong>
      </div>
      {service.note ? (
        <p style={{ margin: 0, fontSize: 12, color: colors.inkSecondary, background: colors.sand50, borderRadius: 12, padding: "8px 11px", lineHeight: 1.9 }}>
          {service.note}
        </p>
      ) : null}
      {service.active ? (
        <Button onClick={() => setOpen((value) => !value)} variant={open ? "secondary" : "primary"} style={{ minHeight: 46 }}>
          {open ? "بستن فرم رزرو" : "رزرو مستقیم"}
        </Button>
      ) : (
        <span style={{ fontSize: 11.5, color: colors.inkMuted }}>این خدمت فعلاً غیرفعال است.</span>
      )}
      {open ? (
        <DirectBookingForm service={service} provider={provider} config={config} onDone={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

export function PresenceProviderScreen({ providerId, config }: { providerId: string; config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const numericId = Number(providerId);
  const validId = Number.isInteger(numericId) && numericId > 0;
  const [provider, setProvider] = useState<PresenceProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!validId) {
      setError("شناسه قاری نامعتبر است.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setProvider(await getPresenceProvider(runtime, numericId));
    } catch (caught) {
      setProvider(null);
      setError(messageOf(caught, "پروفایل قاری دریافت نشد."));
    } finally {
      setLoading(false);
    }
  }, [numericId, runtime, validId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label="در حال دریافت پروفایل قاری…" />;

  if (error || !provider) {
    return (
      <ErrorState
        title="دریافت پروفایل ناموفق بود"
        description={error || "این قاری پیدا نشد."}
        action={
          <div style={{ display: "grid", gap: spacing.sm }}>
            <Button variant="secondary" onClick={() => void load()}>تلاش دوباره</Button>
            <Button variant="ghost" onClick={() => navigateApp("/presence", config)}>قاریان حضوری</Button>
          </div>
        }
      />
    );
  }

  return (
    <div className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
      <Card elevated className="vodda-enter" style={{ display: "grid", gap: 12, borderRadius: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <Avatar name={provider.name} src={provider.avatar_url || undefined} size={64} ring />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 17, fontWeight: 800, color: colors.ink }}>{provider.name}</strong>
              <TierBadge tier={provider.tier} />
            </div>
            <span style={{ display: "block", fontSize: 12.5, color: colors.olive700, marginTop: 2 }}>
              {provider.tag || provider.field || "قاری قرآن"}
              {provider.level ? ` · ${provider.level}` : ""}
              {provider.city ? ` · 📍 ${provider.city}` : ""}
            </span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr 1px 1fr", alignItems: "center" }}>
          {[
            ["امتیاز", provider.reviews > 0 ? `${toFaDigits(provider.rating.toFixed(1))} ★` : "—"],
            ["نظرها", toFaDigits(provider.reviews)],
            ["مراسم", toFaDigits(provider.sessions)],
          ].flatMap(([label, value], index) => {
            const metric = (
              <div key={label} style={{ minWidth: 0, textAlign: "center" }}>
                <strong style={{ display: "block", fontSize: 15, fontWeight: 800, color: colors.ink }}>{value}</strong>
                <span style={{ display: "block", marginTop: 2, fontSize: 10.5, color: colors.inkMuted }}>{label}</span>
              </div>
            );
            if (index === 2) return [metric];
            return [metric, <span key={`${label}-div`} aria-hidden="true" style={{ width: 1, height: 32, background: colors.sand150 }} />];
          })}
        </div>
      </Card>

      {provider.bio ? (
        <Card style={{ padding: 15, borderRadius: 20 }}>
          <strong style={{ display: "block", fontSize: 13.5, color: colors.ink, marginBottom: 6 }}>دربارهٔ قاری</strong>
          <p style={{ margin: 0, fontSize: 13, color: colors.inkSecondary, lineHeight: 2 }}>{provider.bio}</p>
        </Card>
      ) : null}

      {provider.samples.length > 0 ? (
        <Card style={{ padding: 15, borderRadius: 20, display: "grid", gap: spacing.md }}>
          <strong style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, color: colors.ink }}>
            <Icon name="headphones" size={16} style={{ color: colors.olive600 }} />
            نمونهٔ تلاوت‌ها
          </strong>
          <SampleAudioList samples={provider.samples} />
        </Card>
      ) : null}

      <div style={{ display: "grid", gap: spacing.md }}>
        <strong style={{ fontSize: 15, color: colors.ink }}>خدمات حضوری</strong>
        {provider.services.length === 0 ? (
          <EmptyState
            icon={<Icon name="mic" size={28} />}
            title="خدمتی ثبت نشده"
            description="این قاری فعلاً خدمت حضوری قابل رزروی ندارد؛ می‌توانید برای مراسم خود فراخوان بگذارید."
          />
        ) : (
          provider.services.map((service) => (
            <ServiceCard key={service.id} service={service} provider={provider} config={config} />
          ))
        )}
      </div>

      <p style={{ margin: 0, fontSize: 11.5, color: colors.inkMuted, lineHeight: 1.9 }}>
        در رزرو مستقیم، قرارداد بدون فراخوان ساخته می‌شود؛ پس از پرداخت ودیعه، مراسم قطعی و نشانی مکان برای قاری ارسال می‌شود.
      </p>
    </div>
  );
}
