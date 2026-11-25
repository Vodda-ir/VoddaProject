"use client";

// فرم ثبت «فراخوان مراسم حضوری» — موضوع از کاتالوگ رسمی خدمات حضوری، تاریخ
// جلالی، شهر/محل، تعداد مهمانان و قاریان، بودجه و مخاطبان.

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { CornerOrnament } from "../../ui/ornaments";
import { digitsOnly, localizedDigits } from "../../ui/persian";
import { useAppearance } from "../../ui/appearance";
import { formatAppDate } from "../../ui/jalali";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  colors,
  gradients,
  radii,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { showToast } from "../../ui/toast";
import { createCeremonyCall, getInPersonCatalog } from "./api";
import {
  JalaliWhenPicker,
  TopicIcon,
  chipStyle,
  inputStyle,
} from "./elements";
import { isWhenInFuture, tehranWallToRfc3339, type WhenValue } from "./schedule";
import { CountField, NoteTemplateChips, PriceRangePicker, SelectField, TimePresetSelect, VenuePicker } from "./fields";
import type { CeremonyAudience, OfficialInPersonService } from "./types";

function todayLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const audienceOptions: Array<{ value: CeremonyAudience; label: string }> = [
  { value: "both", label: "همه" },
  { value: "brothers", label: "برادران" },
  { value: "sisters", label: "خواهران" },
];

const stepButtonStyle: CSSProperties = {
  width: 46,
  height: 46,
  display: "grid",
  placeItems: "center",
  flex: "0 0 46px",
  borderRadius: 14,
  border: `1px solid ${colors.sand200}`,
  background: colors.surface,
  color: colors.olive700,
  cursor: "pointer",
  fontFamily: typography.fontFamily,
};

function whenChip(active: boolean): CSSProperties {
  return {
    padding: "9px 14px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    color: active ? colors.onOlive : colors.inkSecondary,
    background: active ? colors.olive600 : colors.surface,
    border: `1px solid ${active ? colors.olive600 : colors.sand200}`,
  };
}

const RECITER_PRESETS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function FieldLabel({ children, hint }: { children: string; hint?: string }) {
  const { L } = useAppearance();
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm, marginBottom: 8 }}>
      <strong style={{ fontSize: 13.5, color: colors.ink, display: "block" }}>{L(children)}</strong>
      {hint ? <span style={{ fontSize: 11, color: colors.inkFaint }}>{L(hint)}</span> : null}
    </div>
  );
}

export function CeremonyNewScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { L, lang } = useAppearance();
  const [catalog, setCatalog] = useState<OfficialInPersonService[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [topic, setTopic] = useState<OfficialInPersonService | null>(null);
  const [when, setWhen] = useState<WhenValue>(() => ({ localDate: todayLocalDate(), hh: 18, mm: 0 }));
  const [city, setCity] = useState("");
  const [venue, setVenue] = useState("");
  const [guests, setGuests] = useState("");
  const [reciters, setReciters] = useState(1);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [audience, setAudience] = useState<CeremonyAudience>("both");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [actionError, setActionError] = useState("");

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError("");
    try {
      setCatalog(await getInPersonCatalog(runtime));
    } catch (error) {
      setCatalogError(messageOf(error, "دریافت فهرست خدمات حضوری ناموفق بود."));
    } finally {
      setCatalogLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const grouped = useMemo(() => {
    const groups = new Map<string, OfficialInPersonService[]>();
    for (const item of catalog) {
      const rows = groups.get(item.category) ?? [];
      rows.push(item);
      groups.set(item.category, rows);
    }
    return [...groups.entries()];
  }, [catalog]);

  const budgetMinValue = Number(digitsOnly(budgetMin) || 0);
  const budgetMaxValue = Number(digitsOnly(budgetMax) || 0);
  const guestsValue = Number(digitsOnly(guests) || 0);

  const submit = useCallback(async () => {
    if (creating) return;
    setValidationError("");
    setActionError("");
    if (!topic) {
      setValidationError("لطفاً موضوع مراسم را از فهرست خدمات انتخاب کنید.");
      return;
    }
    if (!isWhenInFuture(when)) {
      setValidationError("زمان مراسم باید در آینده باشد؛ دست‌کم ۱۵ دقیقه بعد از الآن.");
      return;
    }
    if (!city.trim()) {
      setValidationError("شهر برگزاری مراسم را وارد کنید.");
      return;
    }
    if (guestsValue < 1 || guestsValue > 100000) {
      setValidationError("تعداد مهمانان را وارد کنید (حداقل ۱ نفر).");
      return;
    }
    if (reciters < 1 || reciters > 10) {
      setValidationError("تعداد قاریان باید بین ۱ تا ۱۰ باشد.");
      return;
    }
    if (budgetMinValue > 0 && budgetMaxValue > 0 && budgetMinValue > budgetMaxValue) {
      setValidationError("کمینهٔ بودجه نمی‌تواند از بیشینهٔ آن بیشتر باشد.");
      return;
    }
    setCreating(true);
    try {
      const created = await createCeremonyCall(runtime, {
        officialServiceId: topic.id,
        note: note.trim(),
        scheduledAt: tehranWallToRfc3339(when),
        city: city.trim(),
        venueHint: venue.trim(),
        guestsCount: guestsValue,
        recitersNeeded: reciters,
        budgetMin: budgetMinValue,
        budgetMax: budgetMaxValue,
        audience,
      });
      if (created.call) {
        showToast(L("فراخوان مراسم ثبت شد و برای قاریان ارسال گردید"));
        navigateApp(`/ceremony/calls/${created.call.id}`, config);
      }
    } catch (error) {
      setActionError(messageOf(error, "ثبت فراخوان مراسم انجام نشد."));
    } finally {
      setCreating(false);
    }
  }, [audience, budgetMaxValue, budgetMinValue, city, config, creating, guestsValue, L, note, reciters, runtime, topic, venue, when]);

  return (
    <div className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
      <div
        className="vodda-enter"
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 22,
          padding: 20,
          color: colors.onOlive,
          background: gradients.goldRich,
          boxShadow: "0 14px 34px rgba(139,104,31,.3)",
        }}
      >
        {/* تذهیب گوشه — هویت قرآنی روی هیروی مراسم (فاز ۲) */}
        <CornerOrnament tone="light" size={120} style={{ insetInlineEnd: -30, top: -34, opacity: 0.85 }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 15, background: "rgba(255,255,255,.16)" }}>
            <Icon name="calendar" size={24} />
          </div>
          <div>
            <h1 className="vodda-display" style={{ margin: 0, fontSize: 22, lineHeight: 1.65 }}>{L("فراخوان مراسم")}</h1>
            <span style={{ fontSize: 12.5, opacity: 0.9 }}>{L("مراسم خود را ثبت کنید؛ قاریان حق‌الزحمهٔ خود را اعلام می‌کنند")}</span>
          </div>
        </div>
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
          {[
            { icon: "doc" as const, text: L("جزئیات مراسم را ثبت کنید") },
            { icon: "bell" as const, text: L("قاریان اعلام آمادگی می‌کنند") },
            { icon: "checkCircle" as const, text: L("یک را قطعی کنید") },
          ].map((step) => (
            <div key={step.text} style={{ background: "rgba(255,255,255,.12)", borderRadius: 13, padding: "10px 8px", textAlign: "center" }}>
              <Icon name={step.icon} size={18} style={{ opacity: 0.92 }} />
              <span style={{ display: "block", fontSize: 10.5, marginTop: 5, lineHeight: 1.6, opacity: 0.94 }}>{step.text}</span>
            </div>
          ))}
        </div>
      </div>

      {topic ? (
        <Card className="vodda-enter" style={{ padding: 16, borderRadius: 20, display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: 13, background: colors.goldBackground, color: colors.goldDark, flex: "0 0 42px" }}>
            <TopicIcon icon={topic.icon} size={21} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ display: "block", fontSize: 15, fontWeight: 800, color: colors.ink }}>{L(topic.title)}</strong>
            <span style={{ fontSize: 12, color: colors.inkMuted, lineHeight: 1.8, display: "block" }}>{L(topic.description || topic.category)}</span>
          </div>
          <button
            type="button"
            onClick={() => setTopic(null)}
            aria-label={L("تغییر موضوع")}
            style={{ background: "none", border: "none", color: colors.inkMuted, cursor: "pointer", padding: 4, fontFamily: typography.fontFamily }}
          >
            <Icon name="refresh" size={17} />
          </button>
        </Card>
      ) : (
        <Card className="vodda-enter" style={{ padding: 18, borderRadius: 20 }}>
          <strong style={{ fontSize: 15, fontWeight: 800, color: colors.ink, display: "block" }}>{L("۱. موضوع مراسم را انتخاب کنید")}</strong>
          <span style={{ fontSize: 12, color: colors.inkMuted, display: "block", margin: "4px 0 12px" }}>
            {L("از خدمات حضوری رسمی وُدّا — {count} خدمت تأییدشده").replace("{count}", localizedDigits(catalog.length, lang))}
          </span>
          {catalogLoading ? (
            <LoadingState label={L("در حال دریافت خدمات حضوری…")} />
          ) : catalogError ? (
            <ErrorState
              title={L("دریافت خدمات ناموفق بود")}
              description={L(catalogError)}
              action={<Button variant="secondary" onClick={() => void loadCatalog()}>{L("تلاش دوباره")}</Button>}
            />
          ) : catalog.length === 0 ? (
            <EmptyState title={L("خدمتی پیدا نشد")} description={L("فعلاً خدمت حضوری ثبت‌شده‌ای در کاتالوگ نیست.")} />
          ) : (
            <div style={{ display: "grid", gap: spacing.lg, maxHeight: 480, overflowY: "auto", paddingInlineEnd: 4 }}>
              {grouped.map(([category, items]) => (
                <div key={category}>
                  <strong style={{ display: "block", fontSize: 12.5, color: colors.goldDark, margin: "2px 0 8px" }}>{category}</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTopic(item)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                          minHeight: 44,
                          padding: "9px 13px",
                          borderRadius: 999,
                          background: colors.sand50,
                          border: `1px solid ${colors.sand200}`,
                          color: colors.ink,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        <TopicIcon icon={item.icon} size={16} />
                        {L(item.title)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="vodda-enter vodda-enter-delay-1" style={{ padding: 18, borderRadius: 20, display: "grid", gap: spacing.lg }}>
        <strong style={{ fontSize: 15, fontWeight: 800, color: colors.ink }}>{L("۲. زمان و مکان")}</strong>

        <div style={{ display: "grid", gap: spacing.md }}>
          <div style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
            <span style={chipStyle}>
              <Icon name="calendar" size={12} />
              {formatAppDate(when.localDate, lang)} · {L("ساعت {time}").replace("{time}", `${localizedDigits(String(when.hh).padStart(2, "0"), lang)}:${localizedDigits(String(when.mm).padStart(2, "0"), lang)}`)}
            </span>
          </div>
          <JalaliWhenPicker value={when} onChange={setWhen} label={L("تاریخ و ساعت برگزاری")} />
          <TimePresetSelect hh={when.hh} mm={when.mm} onPick={({ hh, mm }) => setWhen((current) => ({ ...current, hh, mm }))} />
        </div>

        <VenuePicker
          city={city}
          venue={venue}
          onCityChange={setCity}
          onVenueChange={setVenue}
        />
      </Card>

      <Card className="vodda-enter vodda-enter-delay-2" style={{ padding: 18, borderRadius: 20, display: "grid", gap: spacing.lg }}>
        <strong style={{ fontSize: 15, fontWeight: 800, color: colors.ink }}>{L("۳. مهمانان و قاریان")}</strong>

        <CountField
          label={L("تعداد مهمانان")}
          hint={L("انتخاب سریع یا دکمه‌های + و −")}
          value={guests}
          onChange={setGuests}
          presets={[30, 50, 100, 200, 500, 1000]}
          min={1}
          max={100000}
          step={10}
          unit={L("نفر")}
          ariaLabel={L("تعداد مهمانان")}
        />

        <div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm, marginBottom: 8 }}>
            <strong style={{ fontSize: 13.5, color: colors.ink, display: "block" }}>{L("تعداد قاریان موردنیاز")}</strong>
            <span style={{ fontSize: 11, color: colors.inkFaint }}>{L("۱ تا ۱۰ قاری")}</span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: spacing.md }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <SelectField
                ariaLabel={L("تعداد قاریان موردنیاز")}
                value={String(reciters)}
                onChange={(next) => {
                  const parsed = Number(next);
                  if (Number.isInteger(parsed)) setReciters(Math.min(10, Math.max(1, parsed)));
                }}
                options={RECITER_PRESETS.map((preset) => ({
                  value: String(preset),
                  label: preset === 1 ? L("۱ قاری") : `${localizedDigits(preset, lang)} ${L("قاری")}`,
                }))}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto", paddingTop: 0 }}>
              <button
                type="button"
                aria-label={L("کاهش تعداد قاریان")}
                onClick={() => setReciters((value) => Math.max(1, value - 1))}
                disabled={reciters <= 1}
                style={{ ...stepButtonStyle, opacity: reciters <= 1 ? 0.45 : 1 }}
              >
                <Icon name="x" size={18} stroke={2.4} />
              </button>
              <strong
                aria-live="polite"
                style={{
                  minWidth: 30,
                  textAlign: "center",
                  fontSize: 21,
                  fontWeight: 900,
                  color: colors.olive700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {localizedDigits(reciters, lang)}
              </strong>
              <button
                type="button"
                aria-label={L("افزایش تعداد قاریان")}
                onClick={() => setReciters((value) => Math.min(10, value + 1))}
                disabled={reciters >= 10}
                style={{ ...stepButtonStyle, opacity: reciters >= 10 ? 0.45 : 1 }}
              >
                <Icon name="plus" size={18} stroke={2.4} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="vodda-enter vodda-enter-delay-3" style={{ padding: 18, borderRadius: 20, display: "grid", gap: spacing.lg }}>
        <strong style={{ fontSize: 15, fontWeight: 800, color: colors.ink }}>{L("۴. بودجه و مخاطبان")}</strong>

        <PriceRangePicker
          minValue={budgetMinValue}
          maxValue={budgetMaxValue}
          onChange={({ min, max }) => {
            setBudgetMin(min);
            setBudgetMax(max);
          }}
        />

        <div>
          <FieldLabel hint={L("برای رعایت شرعی فضای مراسم")}>مخاطبان مراسم</FieldLabel>
          <div role="radiogroup" aria-label={L("مخاطبان مراسم")} style={{ display: "flex", gap: spacing.sm, flexWrap: "wrap" }}>
            {audienceOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={audience === option.value}
                onClick={() => setAudience(option.value)}
                style={whenChip(audience === option.value)}
              >
                {L(option.label)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <FieldLabel hint={L("{count} از ۳۰۰").replace("{count}", localizedDigits(note.length, lang))}>یادداشت برای قاریان (اختیاری)</FieldLabel>
          <NoteTemplateChips value={note} onChange={setNote} />
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 300))}
            rows={3}
            placeholder={L("مثلاً: مراسم ختم قرآن است؛ تلاوت سورهٔ رعد و دعای پایانی مدنظر است…")}
            style={{ ...inputStyle, resize: "none", lineHeight: 1.9 }}
            aria-label={L("یادداشت فراخوان مراسم")}
          />
        </div>
      </Card>

      {validationError ? (
        <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.goldBackground, color: colors.goldDark, margin: 0 }}>
          {L(validationError)}
        </p>
      ) : null}
      {actionError ? (
        <p role="alert" style={{ ...typography.bodySmall, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, margin: 0 }}>
          {L(actionError)}
        </p>
      ) : null}

      <div style={{ position: "sticky", zIndex: 12, bottom: "calc(68px + env(safe-area-inset-bottom))", padding: "8px 0 12px", background: colors.sand50 }}>
        <Button fullWidth loading={creating} disabled={creating} onClick={() => void submit()} style={{ minHeight: 52 }}>
          {L("ثبت فراخوان مراسم")}
        </Button>
      </div>
    </div>
  );
}
