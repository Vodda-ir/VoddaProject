"use client";

// پنل قاری — «خدمات حضوری»: مدیریت خدمات قابل رزرو در مراسم (ایجاد/ویرایش/حذف)
// و «مراسم‌های من» به‌عنوان مجری (قراردادهایی که قاری در آن‌ها مجری است).

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { digitsOnly, localizedDigits } from "../../ui/persian";
import { useAppearance } from "../../ui/appearance";
import { localizeCityName } from "../../i18n/transliterate";
import { formatAppDateTime } from "../../ui/jalali";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import {
  createTeacherPresenceService,
  deleteTeacherPresenceService,
  getCeremonyBookings,
  getInPersonCatalog,
  getTeacherPresenceServices,
  updateTeacherPresenceService,
} from "./api";
import { ToneChip, TopicIcon, bookingStatusMeta, formatAmountFull, formatToman, inputStyle } from "./elements";
import { AmountPicker, CitiesChipsField, DurationPicker } from "./fields";
import type { CeremonyBooking, OfficialInPersonService, PresenceService } from "./types";

const serviceRowStyle: CSSProperties = {
  border: `1px solid ${colors.sand200}`,
  borderRadius: 18,
  padding: 14,
  display: "grid",
  gap: 10,
  background: colors.surface,
  boxShadow: shadows.sm,
};

type FormState = {
  id: number;
  officialServiceId: number;
  basePrice: string;
  duration: string;
  cities: string;
  note: string;
};

function emptyForm(officialServiceId: number): FormState {
  return { id: 0, officialServiceId, basePrice: "", duration: "60", cities: "", note: "" };
}

function formOf(service: PresenceService): FormState {
  return {
    id: service.id,
    officialServiceId: service.official_service_id,
    basePrice: service.base_price > 0 ? String(Math.round(service.base_price)) : "",
    duration: service.duration > 0 ? String(service.duration) : "60",
    cities: service.cities,
    note: service.note,
  };
}

function ServiceForm({
  form,
  catalog,
  saving,
  onChange,
  onSubmit,
  onCancel,
  formError,
}: {
  form: FormState;
  catalog: OfficialInPersonService[];
  saving: boolean;
  onChange: (next: FormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  formError: string;
}) {
  const { L } = useAppearance();
  const selectedService = catalog.find((item) => item.id === form.officialServiceId) ?? null;
  return (
    <div style={{ display: "grid", gap: spacing.lg }}>
      <div>
        <strong style={{ display: "block", fontSize: 13.5, color: colors.ink, marginBottom: 8 }}>{L("خدمت رسمی")}</strong>
        {catalog.length === 0 ? (
          <span style={{ ...typography.caption, color: colors.inkMuted }}>{L("کاتالوگ خدمات حضوری دریافت نشد.")}</span>
        ) : selectedService && form.id > 0 ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: colors.inkSecondary, background: colors.sand100, border: `1px solid ${colors.sand200}`, borderRadius: 999, padding: "6px 11px" }}>
            <TopicIcon icon={selectedService.icon} size={14} />
            {selectedService.title}
          </span>
        ) : (
          <div className="vodda-scroll-rail" style={{ display: "flex", gap: spacing.sm, overflowX: "auto", paddingBottom: spacing.xs }}>
            {catalog.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={form.officialServiceId === item.id}
                onClick={() => onChange({ ...form, officialServiceId: item.id })}
                style={{
                  flex: "0 0 auto",
                  minHeight: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "9px 13px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: form.officialServiceId === item.id ? colors.onOlive : colors.inkSecondary,
                  background: form.officialServiceId === item.id ? colors.olive600 : colors.surface,
                  border: `1px solid ${form.officialServiceId === item.id ? colors.olive600 : colors.sand200}`,
                }}
              >
                <TopicIcon icon={item.icon} size={14} />
                {L(item.title)}
              </button>
            ))}
          </div>
        )}
      </div>

      <AmountPicker
        label="حق‌الزحمهٔ پایه"
        hint="تومان — مبنای پیشنهاد شما در فراخوان‌ها و رزرو مستقیم"
        value={form.basePrice}
        onChange={(next) => onChange({ ...form, basePrice: next })}
        presets={[500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000]}
        ariaLabel={L("حق‌الزحمهٔ پایه برای خدمت {title}").replace("{title}", selectedService?.title ?? L("حضوری"))}
      />

      <DurationPicker value={form.duration} onChange={(next) => onChange({ ...form, duration: next })} />

      <CitiesChipsField value={form.cities} onChange={(next) => onChange({ ...form, cities: next })} />

      <label style={{ display: "grid", gap: 6, ...typography.bodySmall }}>
        <span style={{ fontWeight: 800, color: colors.inkSecondary }}>{L("توضیح خدمت (اختیاری)")}</span>
        <textarea
          value={form.note}
          onChange={(event) => onChange({ ...form, note: event.target.value.slice(0, 300) })}
          rows={2}
          placeholder={L("مثلاً: تلاوت جزء ۳۰ با روخوانی معتبر؛ مناسب مراسم ختم…")}
          style={{ ...inputStyle, resize: "none", lineHeight: 1.9 }}
        />
      </label>

      {formError ? (
        <p role="alert" style={{ ...typography.caption, margin: 0, color: colors.danger }}>{L(formError)}</p>
      ) : null}

      <div style={{ display: "flex", gap: spacing.sm }}>
        {form.id > 0 ? (
          <Button variant="secondary" onClick={onCancel} disabled={saving} style={{ minHeight: 46, flex: "0 0 auto" }}>
            {L("انصراف")}
          </Button>
        ) : null}
        <Button fullWidth loading={saving} disabled={saving} onClick={onSubmit} style={{ minHeight: 48 }}>
          {form.id > 0 ? L("ذخیرهٔ تغییرات") : L("افزودن خدمت حضوری")}
        </Button>
      </div>
    </div>
  );
}

export function TeacherPresenceScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { L, lang, N } = useAppearance();
  const [tab, setTab] = useState<"services" | "bookings">("services");
  const [services, setServices] = useState<PresenceService[]>([]);
  const [bookings, setBookings] = useState<CeremonyBooking[]>([]);
  const [catalog, setCatalog] = useState<OfficialInPersonService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PresenceService | null>(null);
  const [busyId, setBusyId] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [myServices, myBookings, serviceCatalog] = await Promise.all([
        getTeacherPresenceServices(runtime),
        getCeremonyBookings(runtime).catch(() => [] as CeremonyBooking[]),
        getInPersonCatalog(runtime),
      ]);
      setServices(myServices);
      setBookings(myBookings.filter((booking) => booking.role === "provider"));
      setCatalog(serviceCatalog);
    } catch (caught) {
      setError(messageOf(caught, "دریافت خدمات حضوری ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
  }, [load]);

  const catalogTitle = useMemo(
    () => new Map(catalog.map((item) => [item.id, item])),
    [catalog],
  );

  const submitForm = useCallback(async () => {
    if (!form || saving) return;
    setFormError("");
    if (!form.officialServiceId) {
      setFormError("یک خدمت رسمی از کاتالوگ انتخاب کنید.");
      return;
    }
    const basePrice = Number(digitsOnly(form.basePrice) || 0);
    const duration = Number(digitsOnly(form.duration) || 0);
    if (basePrice <= 0) {
      setFormError("حق‌الزحمهٔ پایه را به تومان وارد کنید.");
      return;
    }
    if (duration < 15 || duration > 24 * 60) {
      setFormError("مدت اجرا باید بین ۱۵ دقیقه تا ۲۴ ساعت باشد.");
      return;
    }
    setSaving(true);
    try {
      const input = {
        officialServiceId: form.officialServiceId,
        basePrice,
        duration,
        cities: form.cities.trim(),
        note: form.note.trim(),
      };
      if (form.id > 0) {
        await updateTeacherPresenceService(runtime, form.id, input);
      } else {
        await createTeacherPresenceService(runtime, input);
      }
      setForm(null);
      await load();
    } catch (caught) {
      setFormError(messageOf(caught, "ذخیرهٔ خدمت حضوری انجام نشد."));
    } finally {
      setSaving(false);
    }
  }, [form, load, runtime, saving]);

  const removeService = useCallback(async () => {
    if (!deleteTarget || busyId) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteTeacherPresenceService(runtime, deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (caught) {
      setError(messageOf(caught, "حذف خدمت حضوری انجام نشد."));
      setDeleteTarget(null);
    } finally {
      setBusyId(0);
    }
  }, [busyId, deleteTarget, load, runtime]);

  if (loading) return <LoadingState label={L("در حال دریافت خدمات حضوری…")} />;

  if (error && services.length === 0) {
    return (
      <ErrorState
        title={L("دریافت خدمات حضوری ناموفق بود")}
        description={L(error)}
        action={<Button onClick={() => void load()}>{L("تلاش دوباره")}</Button>}
      />
    );
  }

  return (
    <div className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
      <div
        className="vodda-enter"
        style={{
          borderRadius: 22,
          padding: 20,
          color: colors.onOlive,
          background: gradients.deep,
          boxShadow: shadows.olive,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 15, background: "rgba(255,255,255,.14)" }}>
            <Icon name="mic" size={23} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{L("خدمات حضوری")}</h1>
            <span style={{ fontSize: 12.5, opacity: 0.85 }}>{L("در کاتالوگ مراسم دیده شوید و رزرو مستقیم دریافت کنید")}</span>
          </div>
          <div style={{ marginInlineStart: "auto", textAlign: "center" }}>
            <strong style={{ display: "block", fontSize: 22, fontVariantNumeric: "tabular-nums" }}>{localizedDigits(services.length, lang)}</strong>
            <span style={{ fontSize: 10.5, opacity: 0.8 }}>{L("خدمت فعال")}</span>
          </div>
        </div>
      </div>

      <div className="vodda-enter" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {([
          ["services", `${L("خدمات من")} (${localizedDigits(services.length, lang)})`],
          ["bookings", `${L("مراسم‌های من")} (${localizedDigits(bookings.length, lang)})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            style={{
              minHeight: 44,
              border: 0,
              borderRadius: 14,
              color: tab === key ? colors.onOlive : colors.inkMuted,
              background: tab === key ? colors.olive600 : colors.surface,
              boxShadow: shadows.xs,
              fontFamily: typography.fontFamily,
              fontSize: 13.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, margin: 0 }}>
          {L(error)}
        </p>
      ) : null}

      {tab === "services" ? (
        <div style={{ display: "grid", gap: spacing.md }}>
          {services.length === 0 && !form ? (
            <Card style={{ borderRadius: 20 }}>
              <EmptyState
                icon={<Icon name="mic" size={28} />}
                title={L("هنوز خدمت حضوری ثبت نکرده‌اید")}
                description={L("با ثبت خدمت حضوری، در کاتالوگ «قاریان حضوری» نمایش داده می‌شوید و رزرو مستقیم دریافت می‌کنید.")}
              />
            </Card>
          ) : null}

          {services.map((service) => {
            const official = catalogTitle.get(service.official_service_id);
            return (
              <div key={service.id} className="vodda-enter" style={serviceRowStyle}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 13, background: colors.olive50, color: colors.olive600, flex: "0 0 40px" }}>
                    <TopicIcon icon={official?.icon ?? "mic"} size={19} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <strong style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: colors.ink }}>
                      {service.title || official?.title || L("خدمت حضوری")}
                    </strong>
                    <span style={{ display: "block", fontSize: 12, color: colors.inkMuted, marginTop: 2 }}>
                      ⏱ {localizedDigits(service.duration, lang)} {L("دقیقه")} · {service.cities || L("همهٔ شهرها")}
                    </span>
                  </div>
                  <strong style={{ fontSize: 13, color: colors.goldDark, whiteSpace: "nowrap" }}>{formatToman(service.base_price, lang)}</strong>
                </div>
                {service.note ? (
                  <p style={{ margin: 0, fontSize: 12, color: colors.inkSecondary, background: colors.sand50, borderRadius: 12, padding: "8px 11px", lineHeight: 1.9 }}>
                    {service.note}
                  </p>
                ) : null}
                <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      fontWeight: 800,
                      color: service.active ? colors.olive700 : colors.inkMuted,
                      background: service.active ? colors.successBackground : colors.sand100,
                      borderRadius: 999,
                      padding: "4px 10px",
                    }}
                  >
                    <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: service.active ? colors.olive600 : colors.inkFaint }} />
                    {service.active ? L("فعال در کاتالوگ") : L("غیرفعال")}
                  </span>
                  <Button variant="secondary" onClick={() => { setForm(formOf(service)); setFormError(""); }} style={{ minHeight: 42, paddingInline: 14, marginInlineStart: "auto" }}>
                    {L("ویرایش")}
                  </Button>
                  <Button variant="ghost" onClick={() => setDeleteTarget(service)} aria-label={L("حذف خدمت {title}").replace("{title}", L(service.title))} style={{ minHeight: 42, width: 42, padding: 0, color: colors.danger }}>
                    <Icon name="trash" size={17} />
                  </Button>
                </div>
              </div>
            );
          })}

          {form ? (
            <Card style={{ borderRadius: 20, display: "grid", gap: spacing.lg }}>
              <strong style={{ fontSize: 14.5, color: colors.ink }}>{form.id > 0 ? L("ویرایش خدمت حضوری") : L("خدمت حضوری جدید")}</strong>
              <ServiceForm
                form={form}
                catalog={catalog}
                saving={saving}
                onChange={setForm}
                onSubmit={() => void submitForm()}
                onCancel={() => setForm(null)}
                formError={formError}
              />
            </Card>
          ) : (
            <Button fullWidth variant={services.length > 0 ? "secondary" : "primary"} onClick={() => { setForm(emptyForm(catalog[0]?.id ?? 0)); setFormError(""); }} style={{ minHeight: 50 }}>
              <Icon name="plus" size={18} />
              {L("افزودن خدمت حضوری")}
            </Button>
          )}

          <p style={{ margin: 0, fontSize: 11.5, color: colors.inkMuted, lineHeight: 1.9 }}>
            {L("قیمت پایه به‌عنوان پیشنهاد پذیرش فراخوان‌ها و رزرو مستقیم استفاده می‌شود؛ کارمزد سامانه هنگام تسویه از آن کسر می‌گردد.")}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: spacing.md }}>
          {bookings.length === 0 ? (
            <Card style={{ borderRadius: 20 }}>
              <EmptyState
                icon={<Icon name="calendar" size={28} />}
                title={L("مراسمی در کار نیست")}
                description={L("با پذیرش فراخوان‌ها یا گرفتن رزرو مستقیم، قراردادهای مراسم شما این‌جا فهرست می‌شود.")}
              />
            </Card>
          ) : (
            bookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                onClick={() => navigateApp(`/ceremony/bookings/${booking.id}`, config)}
                className="vodda-tappable vodda-enter"
                style={{
                  width: "100%",
                  display: "grid",
                  gap: 10,
                  padding: 15,
                  textAlign: "right",
                  border: `1px solid ${colors.sand150}`,
                  borderRadius: 20,
                  background: colors.surface,
                  boxShadow: shadows.xs,
                  cursor: "pointer",
                  fontFamily: typography.fontFamily,
                  color: colors.ink,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
                  <strong style={{ fontSize: 14, color: colors.ink, minWidth: 0 }}>{L(booking.service_title)}</strong>
                  <ToneChip tone={bookingStatusMeta[booking.status]} />
                </div>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: colors.inkSecondary, background: colors.sand50, borderRadius: 12, padding: "8px 11px" }}>
                  <Icon name="calendar" size={14} style={{ color: colors.olive500, flex: "0 0 auto" }} />
                  {formatAppDateTime(booking.scheduled_at, lang)} · 📍 {localizeCityName(booking.city, lang) || "—"}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: colors.inkMuted }}>{L("برگزارکننده:")} {N(booking.organizer.name)}</span>
                  <span style={{ marginInlineStart: "auto", fontSize: 12.5, fontWeight: 800, color: colors.goldDark }}>{formatAmountFull(booking.price, lang)}</span>
                  <Icon name="chevronL" size={15} style={{ color: colors.inkFaint }} />
                </div>
              </button>
            ))
          )}
          {bookings.length > 0 ? (
            <p style={{ margin: 0, fontSize: 11.5, color: colors.inkMuted, lineHeight: 1.9 }}>
              {L("وضعیت ودیعه، نشانی دقیق مراسم و تسویه در جزئیات هر قرارداد دیده می‌شود.")}
            </p>
          ) : null}
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        title={L("حذف خدمت حضوری")}
        onClose={() => { if (!busyId) setDeleteTarget(null); }}
      >
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary, lineHeight: 2 }}>
          {L("با حذف، این خدمت از کاتالوگ «قاریان حضوری» برداشته می‌شود و رزرو مستقیم دریافت نخواهید کرد. قراردادهای قبلی به قوت خود باقی هستند.")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={Boolean(busyId)}>{L("انصراف")}</Button>
          <Button variant="danger" onClick={() => void removeService()} loading={Boolean(busyId)}>{L("حذف خدمت")}</Button>
        </div>
      </Dialog>
    </div>
  );
}
