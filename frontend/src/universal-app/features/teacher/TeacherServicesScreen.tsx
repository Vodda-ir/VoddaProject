"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { asArray, asInteger, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import type { PlatformRuntime } from "../../platform/types";
import {
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  IconBadge,
  LoadingState,
  colors,
  gradients,
  digitsOnly,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { localizedDigits } from "../../ui/persian";
import { showToast } from "../../ui/toast";
import { messageOf } from "../../ui/errorMessage";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";
import { AmountInput } from "../ceremony/fields";
import { formatToman } from "../ceremony/elements";

type UnknownRecord = Record<string, unknown>;

type TeacherService = {
  id: number;
  official_service_id: number | null;
  title: string;
  duration: number;
  price: number;
  active: boolean;
};

type CatalogEntry = {
  id: number;
  category: string;
  title: string;
  description: string;
  icon?: string;
};

type CatalogCategory = {
  category: string;
  services: CatalogEntry[];
};

type ServiceDraft = {
  duration: string;
  price: string;
};

function parseService(value: unknown): TeacherService | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = asInteger(row.id);
  if (id <= 0) return null;

  return {
    id,
    official_service_id: row.official_service_id == null ? null : asInteger(row.official_service_id) || null,
    title: asString(row.title, "خدمت"),
    duration: asInteger(row.duration, 30),
    price: asInteger(row.price),
    active: row.active === true,
  };
}

async function getServices(runtime: PlatformRuntime): Promise<TeacherService[]> {
  const response = await runtime.request<ApiEnvelope<UnknownRecord>>("/teacher/me");
  const payload = asRecord(response.data);
  return asArray(payload?.services).map(parseService).filter((item): item is TeacherService => item !== null);
}

async function createService(runtime: PlatformRuntime, draft: { official_service_id: number; duration: number; price: number }) {
  return runtime.request<ApiEnvelope<unknown>>("/teacher/services", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}

async function updateService(
  runtime: PlatformRuntime,
  id: number,
  draft: Partial<{ official_service_id: number; duration: number; price: number; active: false }>,
) {
  return runtime.request<ApiEnvelope<unknown>>(`/teacher/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(draft),
  });
}

async function deleteService(runtime: PlatformRuntime, id: number) {
  return runtime.request<ApiEnvelope<unknown>>(`/teacher/services/${id}`, { method: "DELETE" });
}

/** دستهٔ خدمات حضوری (مراسم) — مسیر ثبتش این صفحه نیست؛ /t/presence است. */
const IN_PERSON_CATEGORY = "خدمات حضوری قرآنی";

async function getCatalog(runtime: PlatformRuntime): Promise<CatalogCategory[]> {
  // فقط خدمات آنلاین — دستهٔ «خدمات حضوری قرآنی» حذف می‌شود تا ثبت خدمت
  // حضوری فقط از مسیر مخصوص خودش («خدمات حضوری» /t/presence با موجودیت و
  // قیمتی مستقل) انجام شود. قبلاً همین دسته این‌جا هم نمایش داده می‌شد و
  // استادها را گیج می‌کرد (دو مسیر برای یک کار).
  const response = await runtime.request<ApiEnvelope<UnknownRecord>>("/catalog/services");
  const payload = asRecord(response.data);
  const categories: CatalogCategory[] = [];
  for (const group of asArray(payload?.categories)) {
    const row = asRecord(group);
    if (!row) continue;
    const category = asString(row.category, "خدمات رسمی");
    if (category === IN_PERSON_CATEGORY) continue;
    const services: CatalogEntry[] = [];
    for (const item of asArray(row.services)) {
      const entry = asRecord(item);
      if (!entry) continue;
      const id = asInteger(entry.id);
      if (id <= 0) continue;
      services.push({
        id,
        category,
        title: asString(entry.title, "خدمت رسمی"),
        description: asString(entry.description, ""),
        icon: entry.icon == null ? undefined : asString(entry.icon, undefined as unknown as string),
      });
    }
    if (services.length > 0) categories.push({ category, services });
  }
  return categories;
}

/* ── قیمت و مدت پیش‌فرض هر خدمت ─────────────────────────────────────────────
   استاد با یک لمس خدمت را انتخاب می‌کند؛ این مقادیر بلافاصله ثبت می‌شوند و
   استاد هر زمان خواست می‌تواند قیمت/مدت را ویرایش کند. */
type ServiceDefault = { duration: number; price: number };

const CATEGORY_DEFAULTS: Record<string, ServiceDefault> = {
  "قرآن‌آموزی پایه": { duration: 60, price: 150_000 },
  "تجوید و علوم قرائت": { duration: 60, price: 200_000 },
  "حفظ قرآن": { duration: 60, price: 250_000 },
  "صوت و لحن و هنر قرآنی": { duration: 60, price: 250_000 },
  "مفاهیم، تفسیر و علوم قرآن": { duration: 60, price: 180_000 },
  "آموزش‌های ویژه": { duration: 45, price: 200_000 },
  "آمادگی و مشاوره قرآنی": { duration: 60, price: 300_000 },
  "خدمات حضوری قرآنی": { duration: 60, price: 1_000_000 },
};

const SERVICE_DEFAULT_OVERRIDES: Record<number, ServiceDefault> = {
  8: { duration: 30, price: 150_000 }, // تصحیح تلاوت و اصلاح لهجه
  15: { duration: 30, price: 150_000 }, // مرور و تثبیت محفوظات
  40: { duration: 30, price: 150_000 }, // ارزیابی و رتبه‌بندی سطح قرآنی
};

const FALLBACK_DEFAULT: ServiceDefault = { duration: 60, price: 200_000 };

function defaultFor(entry: CatalogEntry): ServiceDefault {
  return SERVICE_DEFAULT_OVERRIDES[entry.id] ?? CATEGORY_DEFAULTS[entry.category] ?? FALLBACK_DEFAULT;
}

/* سبز انتخاب — کنتراست واضح با کارت‌های خنثی، هماهنگ با پالت طبیعی وُدّا */
const greenTone = {
  ink: "#2c5e3a",
  deep: "#24512f",
  border: "#a9cfb4",
  chip: "#d9edde",
  background: "#eef8f1",
} as const;

const emptyDraft: ServiceDraft = { duration: "60", price: "" };

/** پیشنهادهای آماده — تنظیم یک‌ضربه‌ای مدت و قیمت */
const DURATION_PRESETS = [30, 45, 60, 90] as const;
const PRICE_PRESETS = [100_000, 150_000, 200_000, 300_000, 500_000] as const;

function quickChipStyle(active: boolean): CSSProperties {
  return {
    minHeight: 38,
    padding: "0 13px",
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: active ? 800 : 600,
    cursor: "pointer",
    fontFamily: typography.fontFamily,
    color: active ? colors.surface : colors.inkSecondary,
    background: active ? colors.olive600 : colors.surface,
    border: `1px solid ${active ? colors.olive600 : colors.sand200}`,
  };
}

function amountLabel(value: number, lang: "fa" | "en"): string {
  return lang === "en"
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.max(0, value))
    : formatWalletAmount(value, lang);
}

function pricePresetLabel(value: number, lang: "fa" | "en"): string {
  return lang === "en" ? `${new Intl.NumberFormat("en-US").format(value)} Toman` : formatToman(value);
}

function normalizePersian(value: string): string {
  return value
    .replace(/[\u200c\u064b-\u0652]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک")
    .trim()
    .toLowerCase();
}

export function TeacherServicesScreen() {
  const runtime = usePlatform();
  const { L, lang } = useAppearance();
  const [services, setServices] = useState<TeacherService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [creatingId, setCreatingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [manualExpanded, setManualExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<TeacherService | null>(null);
  const [draft, setDraft] = useState<ServiceDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<TeacherService | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeacherService | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setServices(await getServices(runtime));
    } catch (loadError) {
      setServices([]);
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [runtime]);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      setCategories(await getCatalog(runtime));
    } catch (loadError) {
      setCategories([]);
      setCatalogError(messageOf(loadError));
    } finally {
      setCatalogLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
    void loadCatalog();
  }, [load, loadCatalog]);

  /* خدمات استاد بر اساس شناسهٔ خدمت رسمی — برای تشخیص انتخاب‌شده‌ها */
  const serviceByOfficialId = useMemo(() => {
    const map = new Map<number, TeacherService>();
    for (const service of services) {
      if (service.official_service_id != null) map.set(service.official_service_id, service);
    }
    return map;
  }, [services]);

  /* خدمت‌های قدیمی بدون تطابق با کاتالوگ آنلاین — در بخش جداگانه حفظ می‌شوند.
     ردیف‌های ثبت‌شده روی کاتالوگ حضوری (شناسه‌های ۱۰۱ به بالا) به مسیر
     «خدمات حضوری» تعلق دارند و این‌جا نمایش داده نمی‌شوند. */
  const orphanServices = useMemo(() => {
    const catalogIds = new Set(categories.flatMap((group) => group.services.map((entry) => entry.id)));
    return services.filter((service) => {
      if (service.official_service_id == null) return true;
      if (service.official_service_id >= 100) return false; // خدمات حضوری → /t/presence
      return !catalogIds.has(service.official_service_id);
    });
  }, [services, categories]);

  const activeCount = services.filter((service) => service.active).length;

  const normalizedQuery = normalizePersian(query);
  const searching = normalizedQuery.length > 0;

  const visibleCategories = useMemo(() => {
    if (!searching) return categories;
    return categories
      .map((group) => ({
        ...group,
        services: group.services.filter(
          (entry) => normalizePersian(entry.title).includes(normalizedQuery) || normalizePersian(entry.description).includes(normalizedQuery),
        ),
      }))
      .filter((group) => group.services.length > 0);
  }, [categories, searching, normalizedQuery]);

  function isExpanded(group: CatalogCategory): boolean {
    if (searching) return true;
    const manual = manualExpanded[group.category];
    if (manual != null) return manual;
    return group.services.some((entry) => {
      const own = serviceByOfficialId.get(entry.id);
      return own != null && own.active;
    });
  }

  /** انتخاب با یک لمس — خدمت بلافاصله با قیمت و مدت پیش‌فرض ثبت و سبز می‌شود */
  async function selectService(entry: CatalogEntry) {
    if (creatingId !== null) return;
    const own = serviceByOfficialId.get(entry.id);
    if (own) {
      openEditor(own);
      return;
    }
    const preset = defaultFor(entry);
    setCreatingId(entry.id);
    setActionError(null);
    try {
      const response = await createService(runtime, {
        official_service_id: entry.id,
        duration: preset.duration,
        price: preset.price,
      });
      const created = parseService((response.data as UnknownRecord) ?? null);
      if (created) {
        setServices((current) => [...current, created]);
      } else {
        await load();
      }
      showToast(L("«{title}» به خدمات شما اضافه شد").replace("{title}", entry.title));
    } catch (mutationError) {
      setActionError(messageOf(mutationError));
    } finally {
      setCreatingId(null);
    }
  }

  function openEditor(service: TeacherService) {
    setEditing(service);
    setDraft({ duration: String(service.duration), price: String(service.price) });
    setFormError(null);
  }

  function closeEditor() {
    if (saving) return;
    setEditing(null);
    setFormError(null);
  }

  async function saveService() {
    if (!editing || saving) return;
    const duration = Number.parseInt(draft.duration.trim(), 10);
    const price = Number.parseInt(draft.price.trim(), 10);

    if (!Number.isFinite(duration) || duration < 10 || duration > 240) {
      setFormError(L("مدت خدمت باید بین ۱۰ تا ۲۴۰ دقیقه باشد."));
      return;
    }
    // قیمت صفر = خدمت رایگان (جلسات رایگان اساتید)
    if (!Number.isFinite(price) || price < 0) {
      setFormError(L("مبلغ معتبر وارد کنید."));
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await updateService(runtime, editing.id, { duration, price });
      setServices((current) =>
        current.map((service) => (service.id === editing.id ? { ...service, duration, price } : service)),
      );
      setEditing(null);
      showToast(L("تغییرات خدمت ذخیره شد"));
    } catch (mutationError) {
      setFormError(messageOf(mutationError));
    } finally {
      setSaving(false);
    }
  }

  async function deactivate() {
    if (!deactivateTarget || saving) return;
    const target = deactivateTarget;
    setSaving(true);
    setDeactivateTarget(null);
    setError(null);
    try {
      // Deliberately never send active=true. Re-activation is an admin moderation action.
      await updateService(runtime, target.id, { active: false });
      setServices((current) =>
        current.map((service) => (service.id === target.id ? { ...service, active: false } : service)),
      );
      setEditing(null);
      showToast(L("خدمت غیرفعال شد"), "info");
    } catch (mutationError) {
      setError(messageOf(mutationError));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteTarget || saving) return;
    const target = deleteTarget;
    setSaving(true);
    setDeleteTarget(null);
    setError(null);
    try {
      await deleteService(runtime, target.id);
      setServices((current) => current.filter((service) => service.id !== target.id));
      setEditing(null);
      showToast(L("خدمت حذف شد"), "info");
    } catch (mutationError) {
      setError(messageOf(mutationError));
    } finally {
      setSaving(false);
    }
  }

  /* خدمت رایگان — قیمت صفر تومانی (جلسات رایگان اساتید) */
  const isFreeService = draft.price.trim() === "0";

  const editingIcon = (editing?.official_service_id != null
    ? categories.flatMap((group) => group.services).find((entry) => entry.id === editing.official_service_id)?.icon
    : undefined) as "book" | undefined;

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
      {/* خلاصه و راهنما */}
      <Card style={{ display: "grid", gap: 10, padding: 16, borderRadius: radii.md, background: `linear-gradient(150deg, ${colors.olive50}, #ffffff 78%)`, border: `1px solid ${colors.olive100}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconBadge icon="checkCircle" tone="olive" size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ ...typography.body, display: "block" }}>
              {L("{n} خدمت فعال دارید").replace("{n}", localizedDigits(activeCount, lang))}
            </strong>
            <span style={{ ...typography.caption, color: colors.inkMuted, display: "block", lineHeight: 1.8 }}>
              {L("اینجا خدمات جلسهٔ آنلاین شماست: برای انتخاب هر خدمت فقط یک بار روی آن بزنید؛ خدمت انتخابی ")}
              <b style={{ color: greenTone.ink }}>{L("سبز")}</b>
              {L(" می‌شود، قیمت پیش‌فرض دارد و بلافاصله قابل رزرو است. خدمات حضوری مراسم (تلاوت مجلسی، ختم، اذان و…) مسیر جداگانه‌ای دارد: بخش «خدمات حضوری».")}
            </span>
          </div>
        </div>
      </Card>

      {loading ? <LoadingState label={L("در حال دریافت خدمات…")} /> : null}
      {!loading && error ? (
        <ErrorState
          title={L("دریافت خدمات ناموفق بود")}
          description={L(error)}
          action={<Button onClick={() => void load()}>{L("تلاش دوباره")}</Button>}
        />
      ) : null}

      {!loading && !error ? (
        <>
          {/* جستجو */}
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: colors.inkFaint, display: "grid" }}>
              <Icon name="search" size={17} />
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={L("جستجوی خدمت…")}
              aria-label={L("جستجوی خدمت")}
              style={{
                width: "100%",
                padding: "12px 42px",
                border: `1px solid ${colors.sand200}`,
                borderRadius: radii.sm,
                background: colors.surface,
                color: colors.ink,
                boxShadow: shadows.xs,
                fontFamily: typography.fontFamily,
                fontSize: 13.5,
              }}
            />
            {query ? (
              <button
                type="button"
                aria-label={L("پاک کردن جستجو")}
                onClick={() => setQuery("")}
                style={{ position: "absolute", insetInlineEnd: 10, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", color: colors.inkFaint, cursor: "pointer", display: "grid", padding: 6 }}
              >
                <Icon name="x" size={15} />
              </button>
            ) : null}
          </div>

          {actionError ? (
            <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: radii.sm, background: colors.dangerBackground, color: colors.danger, ...typography.caption }}>
              <Icon name="info" size={16} />
              <span style={{ flex: 1 }}>{actionError}</span>
            </div>
          ) : null}

          {catalogLoading ? <LoadingState label={L("در حال دریافت فهرست خدمات رسمی…")} /> : null}
          {!catalogLoading && catalogError ? (
            <ErrorState
              title={L("دریافت فهرست خدمات رسمی ناموفق بود")}
              description={L(catalogError)}
              action={<Button onClick={() => void loadCatalog()}>{L("تلاش دوباره")}</Button>}
            />
          ) : null}

          {!catalogLoading && !catalogError && visibleCategories.length === 0 ? (
            <EmptyState icon={<Icon name="search" size={28} />} title={L("خدمتی یافت نشد")} description={L("عبارت دیگری را جستجو کنید.")} />
          ) : null}

          {/* دسته‌بندی‌ها */}
          {!catalogLoading && !catalogError
            ? visibleCategories.map((group) => {
                const expanded = isExpanded(group);
                const selectedInGroup = group.services.filter((entry) => serviceByOfficialId.has(entry.id)).length;
                return (
                  <div key={group.category} style={{ display: "grid", gap: spacing.sm }}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setManualExpanded((current) => ({ ...current, [group.category]: !expanded }))}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        width: "100%",
                        border: 0,
                        background: "transparent",
                        padding: "2px 2px",
                        cursor: "pointer",
                        fontFamily: typography.fontFamily,
                        textAlign: "right",
                      }}
                    >
                      <span style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <strong style={{ ...typography.body, color: colors.ink }}>{L(group.category)}</strong>
                        {selectedInGroup > 0 ? (
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: greenTone.ink, background: greenTone.chip, borderRadius: radii.pill, padding: "3px 9px" }}>
                            {L("{n} انتخاب‌شده").replace("{n}", localizedDigits(selectedInGroup, lang))}
                          </span>
                        ) : null}
                      </span>
                      <span style={{ color: colors.inkFaint, display: "grid", transform: expanded ? "rotate(180deg)" : "none", transition: "transform .18s ease" }}>
                        <Icon name="chevronUp" size={16} />
                      </span>
                    </button>

                    {expanded ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {group.services.map((entry) => {
                          const own = serviceByOfficialId.get(entry.id);
                          const busy = creatingId === entry.id;
                          if (own) {
                            /* انتخاب‌شده — سبز؛ لمس = ویرایش قیمت و مدت */
                            const inactive = !own.active;
                            return (
                              <button
                                key={entry.id}
                                type="button"
                                onClick={() => openEditor(own)}
                                aria-label={L("ویرایش خدمت {title}").replace("{title}", L(own.title))}
                                style={{
                                  display: "flex",
                                  gap: 12,
                                  alignItems: "center",
                                  width: "100%",
                                  textAlign: "right",
                                  padding: "12px 14px",
                                  borderRadius: 16,
                                  cursor: "pointer",
                                  fontFamily: typography.fontFamily,
                                  border: `1.5px solid ${inactive ? colors.goldSoft : greenTone.border}`,
                                  background: inactive ? colors.goldBackground : greenTone.background,
                                  opacity: busy ? 0.6 : 1,
                                }}
                              >
                                <IconBadge icon={(entry.icon as "book") || "book"} tone={inactive ? "gold" : "olive"} size={40} />
                                <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 3 }}>
                                  <strong style={{ ...typography.bodySmall, color: inactive ? colors.goldDark : greenTone.deep }}>{L(entry.title)}</strong>
                                  <span style={{ ...typography.caption, color: inactive ? colors.goldDark : greenTone.ink, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                    <span>{L("{n} دقیقه").replace("{n}", localizedDigits(own.duration, lang))} · {own.price === 0 ? L("هر جلسه رایگان") : L("هر جلسه {n} تومان").replace("{n}", amountLabel(own.price, lang))}</span>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 700, opacity: 0.85 }}>
                                      <Icon name="edit" size={12} />
                                      {L("ویرایش")}
                                    </span>
                                  </span>
                                </span>
                                {inactive ? (
                                  <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: colors.goldDark, background: "#fff", borderRadius: radii.pill, padding: "4px 10px" }}>
                                    {L("غیرفعال")}
                                  </span>
                                ) : (
                                  <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", color: "#fff", background: greenTone.ink }}>
                                    <Icon name="check" size={15} stroke={2.4} />
                                  </span>
                                )}
                              </button>
                            );
                          }
                          /* انتخاب‌نشده — لمس = افزودن با قیمت پیش‌فرض */
                          const preset = defaultFor(entry);
                          return (
                            <button
                              key={entry.id}
                              type="button"
                              disabled={creatingId !== null}
                              onClick={() => void selectService(entry)}
                              aria-label={L("افزودن خدمت {title}").replace("{title}", entry.title)}
                              style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                                width: "100%",
                                textAlign: "right",
                                padding: "12px 14px",
                                borderRadius: 16,
                                cursor: creatingId !== null ? "wait" : "pointer",
                                fontFamily: typography.fontFamily,
                                border: `1.5px dashed ${colors.sand200}`,
                                background: colors.surface,
                                opacity: busy ? 0.72 : 1,
                              }}
                            >
                              <IconBadge icon={(entry.icon as "book") || "book"} tone="olive" size={40} />
                              <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 3 }}>
                                <strong style={{ ...typography.bodySmall, color: colors.ink }}>{L(entry.title)}</strong>
                                <span style={{ ...typography.caption, color: colors.inkMuted, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {entry.description}
                                </span>
                                <span style={{ ...typography.caption, color: colors.olive700, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  {L("پیش‌فرض: {price} · {duration} دقیقه").replace("{price}", pricePresetLabel(preset.price, lang)).replace("{duration}", localizedDigits(preset.duration, lang))}
                                </span>
                              </span>
                              <span
                                aria-hidden="true"
                                style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", color: colors.olive700, border: `1.5px solid ${colors.olive200}`, background: colors.olive50 }}
                              >
                                {busy ? <span className="vodda-spinner" style={{ width: 14, height: 14 }} /> : <Icon name="plus" size={16} stroke={2.2} />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })
            : null}

          {/* خدمت‌های قدیمی بدون تطابق کاتالوگ */}
          {!catalogLoading && orphanServices.length > 0 ? (
            <div style={{ display: "grid", gap: spacing.sm }}>
              <strong style={{ ...typography.body, color: colors.ink }}>{L("سایر خدمات ثبت‌شده")}</strong>
              {orphanServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => openEditor(service)}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    width: "100%",
                    textAlign: "right",
                    padding: "12px 14px",
                    borderRadius: 16,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily,
                    border: `1.5px solid ${service.active ? greenTone.border : colors.goldSoft}`,
                    background: service.active ? greenTone.background : colors.goldBackground,
                  }}
                >
                  <IconBadge icon="book" tone={service.active ? "olive" : "gold"} size={40} />
                  <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 3 }}>
                    <strong style={{ ...typography.bodySmall }}>{L(service.title)}</strong>
                    <span style={{ ...typography.caption, color: colors.inkMuted }}>
                      {L("{n} دقیقه").replace("{n}", localizedDigits(service.duration, lang))} · {service.price === 0 ? L("هر جلسه رایگان") : L("هر جلسه {n} تومان").replace("{n}", amountLabel(service.price, lang))}
                    </span>
                  </span>
                  {service.active ? (
                    <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", color: "#fff", background: greenTone.ink }}>
                      <Icon name="check" size={15} stroke={2.4} />
                    </span>
                  ) : (
                    <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: colors.goldDark, background: "#fff", borderRadius: radii.pill, padding: "4px 10px" }}>
                      {L("غیرفعال")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {/* ویرایشگر قیمت و مدت */}
      <Dialog open={editing !== null} title={L("ویرایش خدمت")} onClose={closeEditor}>
        <div style={{ display: "grid", gap: spacing.md }}>
          {editing ? (
            <div style={{ display: "flex", gap: 10, alignItems: "center", border: `1.5px solid ${colors.olive200}`, background: colors.olive50, borderRadius: radii.lg, padding: 12 }}>
              <IconBadge icon={editingIcon || "book"} tone="olive" size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ ...typography.body, display: "block" }}>{L(editing.title)}</strong>
                <span style={{ ...typography.caption, color: colors.inkMuted }}>{editing.active ? L("فعال و قابل رزرو") : L("غیرفعال — تا فعال‌سازی مجدد قابل رزرو نیست")}</span>
              </div>
            </div>
          ) : null}
          <label style={{ display: "grid", gap: spacing.xs, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>{L("مدت جلسه (دقیقه)")}</span>
            <div role="group" aria-label={L("مدت‌های پیشنهادی")} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {DURATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={draft.duration === String(preset)}
                  onClick={() => setDraft((current) => ({ ...current, duration: String(preset) }))}
                  style={quickChipStyle(draft.duration === String(preset))}
                >
                  {L("{n} دقیقه").replace("{n}", localizedDigits(preset, lang))}
                </button>
              ))}
            </div>
            <input
              inputMode="numeric"
              value={localizedDigits(draft.duration, lang)}
              disabled={saving}
              onChange={(event) => setDraft((current) => ({ ...current, duration: digitsOnly(event.target.value, 3) }))}
              placeholder={L("یا مدت دلخواه — بین ۱۰ تا ۲۴۰")}
              style={{ width: "100%", padding: spacing.md, border: `1px solid ${colors.sand200}`, borderRadius: radii.md, background: colors.surface, color: colors.ink, boxShadow: shadows.xs, fontFamily: typography.fontFamily }}
            />
          </label>
          <div style={{ display: "grid", gap: spacing.xs, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>{L("قیمت هر جلسه (تومان)")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={isFreeService}
              onClick={() => setDraft((current) => ({ ...current, price: isFreeService ? "" : "0" }))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "11px 13px",
                textAlign: "right",
                borderRadius: radii.md,
                cursor: "pointer",
                fontFamily: typography.fontFamily,
                border: isFreeService ? `1.6px solid ${colors.gold}` : `1px solid ${colors.sand200}`,
                background: isFreeService ? colors.goldBackground : colors.surface,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  width: 20,
                  height: 20,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 7,
                  border: isFreeService ? "none" : `1.6px solid ${colors.sand200}`,
                  background: isFreeService ? gradients.goldRich : colors.surface,
                  color: "#fffaf0",
                }}
              >
                {isFreeService ? <Icon name="check" size={13} stroke={3} /> : null}
              </span>
              <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 1 }}>
                <strong style={{ fontSize: 13, fontWeight: 800, color: isFreeService ? colors.goldDark : colors.ink }}>
                  {L("ارائهٔ رایگان این خدمت")}
                </strong>
                <span style={{ fontSize: 11.5, color: colors.inkMuted, lineHeight: 1.7 }}>
                  {L("با فعال‌کردن این گزینه، قرآن‌آموزان بدون پرداخت هزینه رزرو می‌کنند و جلسه در بخش «خدمات رایگان» صفحهٔ نخست نمایش داده می‌شود.")}
                </span>
              </span>
            </button>
            {isFreeService ? (
              <span style={{ ...typography.caption, color: colors.goldDark, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="gift" size={13} />
                {L("این خدمت رایگان ارائه می‌شود (۰ تومان)")}
              </span>
            ) : (
              <>
                <div role="group" aria-label={L("قیمت‌های پیشنهادی")} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PRICE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      aria-pressed={draft.price === String(preset)}
                      onClick={() => setDraft((current) => ({ ...current, price: String(preset) }))}
                      style={quickChipStyle(draft.price === String(preset))}
                    >
                      {pricePresetLabel(preset, lang)}
                    </button>
                  ))}
                </div>
                <AmountInput
                  value={draft.price}
                  onChange={(next) => setDraft((current) => ({ ...current, price: next }))}
                  ariaLabel={L("قیمت خدمت به تومان")}
                  placeholder={L("یا مبلغ دلخواه…")}
                />
              </>
            )}
          </div>
          {formError ? <span role="alert" style={{ ...typography.caption, color: colors.danger }}>{L(formError)}</span> : null}
          <Button fullWidth loading={saving} onClick={() => void saveService()}>{L("ذخیره تغییرات")}</Button>
          {editing ? (
            <div style={{ display: "flex", gap: spacing.sm, justifyContent: "center" }}>
              {editing.active ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setDeactivateTarget(editing)}
                  style={{ border: 0, background: "transparent", color: colors.goldDark, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: typography.fontFamily, padding: "6px 10px" }}
                >
                  {L("غیرفعال‌کردن خدمت")}
                </button>
              ) : null}
              <button
                type="button"
                disabled={saving}
                onClick={() => setDeleteTarget(editing)}
                style={{ border: 0, background: "transparent", color: colors.danger, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: typography.fontFamily, padding: "6px 10px" }}
              >
                {L("حذف خدمت")}
              </button>
            </div>
          ) : null}
        </div>
      </Dialog>

      <Dialog open={deactivateTarget !== null} title={L("غیرفعال‌کردن خدمت")} onClose={() => { if (!saving) setDeactivateTarget(null); }}>
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>
          {L("این خدمت غیرفعال می‌شود و تا فعال‌سازی مجدد قابل رزرو نیست.")}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" disabled={saving} onClick={() => setDeactivateTarget(null)}>{L("انصراف")}</Button>
          <Button loading={saving} onClick={() => void deactivate()}>{L("غیرفعال‌کردن")}</Button>
        </div>
      </Dialog>

      <Dialog open={deleteTarget !== null} title={L("حذف خدمت")} onClose={() => { if (!saving) setDeleteTarget(null); }}>
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>{L("این خدمت حذف شود؟")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
          <Button variant="secondary" disabled={saving} onClick={() => setDeleteTarget(null)}>{L("انصراف")}</Button>
          <Button variant="danger" loading={saving} onClick={() => void remove()}>{L("حذف")}</Button>
        </div>
      </Dialog>
    </section>
  );
}
