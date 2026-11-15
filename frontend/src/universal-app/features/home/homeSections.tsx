"use client";

// بخش‌های تصویری صفحهٔ نخست:
//   ۱) دسته‌بندی موضوعات — یک کادر، شش موضوع تصویری؛ هر کلیک وارد زیردسته‌های تخصصی همان موضوع می‌شود
//   ۲) خدمات برتر و پراستفاده — کارت خدمات اول صفحه (ریل کارت‌های تصویری خدمات منتخب)
//   ۳) خدمات رایگان — تابلوی جلسات رایگان اساتید (price = 0)
// همهٔ بخش‌ها مستقل هستند: خطا یا خالی‌بودن، کل بخش را پنهان می‌کند تا
// خانهٔ کاربر هرگز به‌خاطر آن‌ها نشکند.

import { useEffect, useState, type CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import {
  Avatar,
  Icon,
  SectionHeader,
  colors,
  gradients,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { asArray, asRecord } from "../../platform/api";

/* ── نقشهٔ تصویر دسته‌ها ─────────────────────────────────────────────────── */

const CATEGORY_IMAGES: Array<{ match: RegExp; image: string; tint: string }> = [
  { match: /پایه|الفبا|روخوانی/, image: "/images/home/cat-quran.webp", tint: "linear-gradient(180deg, rgba(38,50,32,0) 34%, rgba(28,38,24,.88) 100%)" },
  { match: /تجوید|قرائت/, image: "/images/home/cat-tajweed.webp", tint: "linear-gradient(180deg, rgba(56,44,20,0) 34%, rgba(46,36,16,.88) 100%)" },
  { match: /حفظ/, image: "/images/home/cat-hifz.webp", tint: "linear-gradient(180deg, rgba(38,50,32,0) 34%, rgba(24,40,28,.9) 100%)" },
  { match: /صوت|لحن|هنر/, image: "/images/home/cat-voice.webp", tint: "linear-gradient(180deg, rgba(46,36,16,0) 34%, rgba(40,30,12,.9) 100%)" },
  { match: /مفاهیم|تفسیر|علوم/, image: "/images/home/cat-uloom.webp", tint: "linear-gradient(180deg, rgba(40,36,24,0) 34%, rgba(34,30,18,.9) 100%)" },
  { match: /ویژه/, image: "/images/home/cat-special.webp", tint: "linear-gradient(180deg, rgba(52,40,16,0) 34%, rgba(44,34,12,.9) 100%)" },
  { match: /مشاوره|آمادگی/, image: "/images/home/cat-advisory.webp", tint: "linear-gradient(180deg, rgba(36,44,30,0) 34%, rgba(28,36,22,.9) 100%)" },
  { match: /حضوری|مراسم/, image: "/images/home/cat-ceremony.webp", tint: "linear-gradient(180deg, rgba(44,36,16,0) 34%, rgba(36,28,10,.9) 100%)" },
];

const FALLBACK_IMAGE = "/images/home/cat-quran.webp";
const FALLBACK_TINT = "linear-gradient(180deg, rgba(38,50,32,0) 34%, rgba(28,38,24,.88) 100%)";

export function categoryVisual(category: string): { image: string; tint: string } {
  for (const row of CATEGORY_IMAGES) {
    if (row.match.test(category)) return { image: row.image, tint: row.tint };
  }
  return { image: FALLBACK_IMAGE, tint: FALLBACK_TINT };
}

/** ترتیب نمایش موضوع‌ها — مسیر یادگیری: از پایه تا تخصصی؛ هم‌راستا با نقشهٔ تصویر. */
const CATEGORY_ORDER_HINTS: Array<{ match: RegExp }> = [
  { match: /پایه|الفبا|روخوانی/ },
  { match: /تجوید|قرائت/ },
  { match: /حفظ/ },
  { match: /صوت|لحن|هنر/ },
  { match: /مفاهیم|تفسیر|علوم/ },
  { match: /ویژه/ },
  { match: /مشاوره|آمادگی/ },
];

function categoryOrderIndex(name: string) {
  const index = CATEGORY_ORDER_HINTS.findIndex((hint) => hint.match.test(name));
  return index === -1 ? CATEGORY_ORDER_HINTS.length : index;
}

/* ── ابزارها ────────────────────────────────────────────────────────────── */

function faNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits }).format(value);
}

type CatalogEntry = { id: number; category: string; title: string; description: string };

async function fetchCatalog(): Promise<CatalogEntry[]> {
  const response = await fetch("/api/backend/catalog/services", { cache: "no-store" });
  if (!response.ok) throw new Error("catalog failed");
  const payload = (await response.json()) as { data?: unknown };
  const data = asRecord(payload.data);
  const entries: CatalogEntry[] = [];
  for (const group of asArray(data?.categories)) {
    const row = asRecord(group);
    const category = String(row?.category ?? "");
    for (const item of asArray(row?.services)) {
      const entry = asRecord(item);
      const id = Number(entry?.id ?? 0);
      if (id > 0 && entry?.title) {
        entries.push({ id, category, title: String(entry.title), description: String(entry.description ?? "") });
      }
    }
  }
  return entries;
}

/* ── ۱) دسته‌بندی موضوعات — کارت‌های تصویری ─────────────────────────────── */

type TopicCategory = { category: string; count: number; image: string; tint: string };

/** دسته‌های واقعی کاتالوگ — اگر سرویس کاتالوگ در دسترس نبود، این فهرست همیشه نمایش داده می‌شود */
const FALLBACK_TOPIC_CATEGORIES: Array<{ category: string }> = [
  { category: "قرآن‌آموزی پایه" },
  { category: "تجوید و علوم قرائت" },
  { category: "حفظ قرآن" },
  { category: "صوت و لحن و هنر قرآنی" },
  { category: "مفاهیم، تفسیر و علوم قرآن" },
  { category: "آموزش‌های ویژه" },
  { category: "آمادگی و مشاوره قرآنی" },
];

function fallbackTopicCategories(): TopicCategory[] {
  return FALLBACK_TOPIC_CATEGORIES.map((row) => ({
    category: row.category,
    count: 0,
    ...categoryVisual(row.category),
  }));
}

export function TopicCategoryGrid({ config }: { config: UniversalAppConfig }) {
  const [categories, setCategories] = useState<TopicCategory[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchCatalog()
      .then((entries) => {
        if (!active) return;
        const counts = new Map<string, number>();
        for (const entry of entries) {
          counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
        }
        const rows: TopicCategory[] = [...counts.entries()]
          .filter(([category]) => category && category !== "خدمات حضوری قرآنی")
          .map(([category, count]) => ({ category, count, ...categoryVisual(category) }))
          .sort((a, b) => categoryOrderIndex(a.category) - categoryOrderIndex(b.category) || b.count - a.count)
          .slice(0, 6);
        // دسته‌بندی موضوعات باید همیشه نمایش داده شود — حتی اگر کاتالوگ خالی بود
        setCategories(rows.length > 0 ? rows : fallbackTopicCategories());
      })
      .catch(() => {
        if (active) setCategories(fallbackTopicCategories());
      });
    return () => {
      active = false;
    };
  }, []);

  if (categories === null) {
    return (
      <section aria-label="دسته‌بندی موضوعات" style={{ display: "grid", gap: 12 }}>
        <span aria-hidden="true" className="vodda-skeleton" style={{ display: "block", width: 150, height: 18 }} />
        <div
          aria-hidden="true"
          className="vodda-skeleton"
          style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, padding: 12, borderRadius: 26 }}
        >
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <span key={index} className="vodda-skeleton" style={{ display: "block", height: 118, borderRadius: 18 }} />
          ))}
        </div>
      </section>
    );
  }

  // دسته‌بندی موضوعات هرگز نباید ناپدید شود — در حالت خالی، فهرست پشتیبان نمایش داده می‌شود
  const rows = categories.length > 0 ? categories : fallbackTopicCategories();

  return (
    <section aria-label="دسته‌بندی موضوعات" className="vodda-enter vodda-enter-delay-1" style={{ display: "grid", gap: 12, minWidth: 0 }}>
      <SectionHeader
        title="دسته‌بندی موضوعات"
        description="موضوع دلخواه را انتخاب کنید تا وارد زیردسته‌های تخصصی آن شوید."
      />
      {/* یک کادر واحد با حاشیهٔ طلایی برجسته — شش موضوع، تصویر کوچک و فانتزی + متن واضح */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
          padding: 12,
          background: "linear-gradient(180deg, #ffffff, #fffdf8)",
          border: `1.5px solid ${colors.goldSoft}`,
          borderRadius: 26,
          boxShadow: "0 0 0 4px rgba(231,213,168,.22), 0 12px 28px rgba(139,104,31,.13)",
        }}
      >
        {rows.map((category) => (
          <button
            key={category.category}
            type="button"
            onClick={() => navigateApp(`/search?mode=services&cat=${encodeURIComponent(category.category)}`, config)}
            className="vodda-tappable vodda-enter"
            aria-label={category.count > 0 ? `ورود به زیردسته‌های ${category.category} — ${faNumber(category.count)} خدمت` : `ورود به زیردسته‌های ${category.category}`}
            style={{
              display: "grid",
              alignContent: "start",
              justifyItems: "center",
              gap: 7,
              padding: "9px 7px 10px",
              textAlign: "center",
              border: `1px solid ${colors.sand150}`,
              borderRadius: 18,
              background: colors.surface,
              cursor: "pointer",
              fontFamily: typography.fontFamily,
              boxShadow: "0 2px 10px rgba(46,54,34,.06)",
            }}
          >
            {/* تصویر کوچک و فانتزی با حلقهٔ طلایی — متن زیر تصویر کاملاً خواناست */}
            <span style={{ position: "relative", width: "100%" }}>
              <span
                style={{
                  position: "relative",
                  display: "block",
                  height: 58,
                  borderRadius: 12,
                  overflow: "hidden",
                  border: `2px solid ${colors.goldSoft}`,
                  boxShadow: "0 0 0 3px #ffffff, 0 0 0 4.5px rgba(212,171,82,.35), 0 3px 8px rgba(46,54,34,.12)",
                  background: colors.olive100,
                }}
              >
                <img
                  src={category.image}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
                <span
                  aria-hidden="true"
                  style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(139,104,31,.20))" }}
                />
              </span>
              {/* نشان طلایی ورود به زیردسته‌های تخصصی */}
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: -6,
                  insetInlineEnd: -4,
                  width: 20,
                  height: 20,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "50%",
                  background: gradients.goldRich,
                  border: "2px solid #ffffff",
                  color: "#fffaf0",
                  boxShadow: "0 2px 6px rgba(139,104,31,.35)",
                }}
              >
                <Icon name="chevronL" size={11} stroke={2.6} />
              </span>
            </span>
            {/* عنوان موضوع — روی زمینهٔ سفید، کاملاً مشخص */}
            <strong
              style={{
                fontSize: 11.3,
                fontWeight: 900,
                lineHeight: 1.5,
                color: colors.ink,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                minHeight: 34,
              }}
            >
              {category.category}
            </strong>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                padding: "2px 8px",
                borderRadius: 999,
                background: colors.olive50,
                border: `1px solid ${colors.olive100}`,
                color: colors.olive700,
                fontSize: 9.8,
                fontWeight: 800,
              }}
            >
              <Icon name="book" size={10} stroke={2.2} />
              {category.count > 0 ? `${faNumber(category.count)} خدمت` : "خدمات فعال"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ── ۲) خدمات برتر و پراستفاده ──────────────────────────────────────────── */

/** خدمات منتخب — محبوب‌ترین موضوع‌های پلتفرم به‌ترتیب ثابت هویتی. */
const TOP_SERVICE_IDS = [1, 4, 6, 8, 13, 15, 19, 2];

export function TopServicesRail({ config }: { config: UniversalAppConfig }) {
  const [services, setServices] = useState<CatalogEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchCatalog()
      .then((entries) => {
        if (!active) return;
        const byId = new Map(entries.map((entry) => [entry.id, entry]));
        const picked: CatalogEntry[] = [];
        for (const id of TOP_SERVICE_IDS) {
          const entry = byId.get(id);
          if (entry) picked.push(entry);
        }
        setServices(picked.slice(0, 8));
      })
      .catch(() => {
        if (active) setServices([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (services === null) {
    return (
      <section aria-label="خدمات برتر" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, overflow: "hidden" }}>
          {[0, 1, 2, 3].map((index) => (
            <span key={index} aria-hidden="true" className="vodda-skeleton" style={{ display: "block", flex: "0 0 150px", height: 142, borderRadius: 19 }} />
          ))}
        </div>
      </section>
    );
  }

  if (services.length === 0) return null;

  return (
    <section aria-label="خدمات برتر و پراستفاده" className="vodda-enter vodda-enter-delay-1" style={{ minWidth: 0 }}>
      <SectionHeader title="خدمات برتر و پراستفاده" description="انتخاب قرآن‌آموزان وُدّا برای شروع مسیر" />
      <div
        className="vodda-scroll-rail"
        style={{
          display: "flex",
          width: "100%",
          minWidth: 0,
          gap: spacing.sm,
          overflowX: "auto",
          marginInline: -spacing.xl,
          padding: `${spacing.md}px ${spacing.xl}px ${spacing.sm}px`,
          scrollSnapType: "x proximity",
        }}
      >
        {services.map((service) => {
          const visual = categoryVisual(service.category);
          // کلیک روی هر خدمت = فقط اساتید همان خدمت (فیلتر موضوع رسمی)
          const open = () => navigateApp(`/search?topic=${service.id}`, config);
          return (
            <button
              key={service.id}
              type="button"
              onClick={open}
              className="vodda-tappable vodda-enter"
              aria-label={`اساتید خدمت ${service.title}`}
              style={{
                flex: "0 0 150px",
                width: 150,
                scrollSnapAlign: "start",
                display: "grid",
                alignContent: "start",
                justifyItems: "center",
                gap: 6,
                padding: "8px 8px 9px",
                textAlign: "center",
                border: `1.5px solid ${colors.goldSoft}`,
                borderRadius: 19,
                background: "linear-gradient(180deg, #ffffff, #fffdf6)",
                color: colors.ink,
                cursor: "pointer",
                fontFamily: typography.fontFamily,
                boxShadow: "0 0 0 3px rgba(231,213,168,.16), 0 6px 14px rgba(139,104,31,.10)",
              }}
            >
              {/* تصویر کوچک با حلقهٔ طلایی + نشان فانتزی ورود به اساتید */}
              <span style={{ position: "relative", width: "100%" }}>
                <span
                  style={{
                    display: "block",
                    height: 56,
                    borderRadius: 13,
                    overflow: "hidden",
                    border: `2px solid ${colors.goldSoft}`,
                    boxShadow: "0 0 0 2.5px #ffffff, 0 0 0 4px rgba(212,171,82,.30), 0 3px 8px rgba(46,54,34,.10)",
                    background: colors.olive100,
                  }}
                >
                  <img
                    src={visual.image}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: visual.tint, opacity: 0.32 }} />
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: -6,
                    insetInlineEnd: -4,
                    width: 20,
                    height: 20,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    background: gradients.goldRich,
                    border: "2px solid #ffffff",
                    color: "#fffaf0",
                    boxShadow: "0 2px 6px rgba(139,104,31,.35)",
                  }}
                >
                  <Icon name="chevronL" size={11} stroke={2.6} />
                </span>
              </span>
              {/* عنوان خدمت — روی زمینهٔ سفید، خوانا */}
              <strong
                style={{
                  fontSize: 11.2,
                  fontWeight: 900,
                  lineHeight: 1.5,
                  color: colors.ink,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  minHeight: 34,
                }}
              >
                {service.title}
              </strong>
              {/* پانویس کوچک — پرطرفدار + نشان اساتید */}
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 5, width: "100%" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9.6, fontWeight: 800, color: colors.goldDark }}>
                  <Icon name="star" size={10} fill style={{ color: colors.gold }} />
                  پرطرفدار
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: colors.olive50,
                    border: `1px solid ${colors.olive100}`,
                    color: colors.olive700,
                    fontSize: 9.6,
                    fontWeight: 800,
                  }}
                >
                  <Icon name="users" size={10} stroke={2.2} />
                  اساتید
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ── ۳) خدمات رایگان ────────────────────────────────────────────────────── */

export type FreeServiceCardData = {
  service_id: number;
  title: string;
  duration: number;
  teacher_id: number;
  teacher_name: string;
  avatar_url: string;
  field: string;
  tag: string;
  city: string;
  rating: number;
  reviews: number;
  sessions: number;
};

async function fetchFreeServices(): Promise<FreeServiceCardData[]> {
  const response = await fetch("/api/backend/catalog/free?limit=12", { cache: "no-store" });
  if (!response.ok) throw new Error("free services failed");
  const payload = (await response.json()) as { data?: unknown };
  const rows: FreeServiceCardData[] = [];
  for (const item of asArray(payload.data)) {
    const row = asRecord(item);
    const serviceId = Number(row?.service_id ?? 0);
    const teacherId = Number(row?.teacher_id ?? 0);
    const title = String(row?.title ?? "");
    const teacherName = String(row?.teacher_name ?? "");
    if (serviceId > 0 && teacherId > 0 && title && teacherName) {
      rows.push({
        service_id: serviceId,
        title,
        duration: Number(row?.duration ?? 0),
        teacher_id: teacherId,
        teacher_name: teacherName,
        avatar_url: String(row?.avatar_url ?? ""),
        field: String(row?.field ?? ""),
        tag: String(row?.tag ?? ""),
        city: String(row?.city ?? ""),
        rating: Number(row?.rating ?? 0),
        reviews: Number(row?.reviews ?? 0),
        sessions: Number(row?.sessions ?? 0),
      });
    }
  }
  return rows;
}

function FreeServiceTile({ item, config }: { item: FreeServiceCardData; config: UniversalAppConfig }) {
  const subtitle = [item.tag || item.field, item.city].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      // ?free=1 → صفحهٔ رزرو فقط خدمات رایگان همین استاد را نشان می‌دهد، نه خدمات پولی را
      onClick={() => navigateApp(`/book/${item.teacher_id}?free=1`, config)}
      className="vodda-tappable vodda-enter"
      aria-label={`جلسهٔ رایگان ${item.title} با ${item.teacher_name}`}
      style={{
        flex: "0 0 236px",
        width: 236,
        scrollSnapAlign: "start",
        display: "grid",
        gap: 10,
        padding: "14px 14px 15px",
        textAlign: "right",
        border: `1.4px solid ${colors.gold}`,
        borderRadius: 22,
        background: `linear-gradient(170deg, #fffdf6, ${colors.goldBackground})`,
        boxShadow: "0 8px 22px rgba(139,104,31,.14)",
        cursor: "pointer",
        fontFamily: typography.fontFamily,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 10px",
            borderRadius: 999,
            background: gradients.goldRich,
            color: "#fffaf0",
            fontSize: 11,
            fontWeight: 900,
            boxShadow: "0 3px 8px rgba(139,104,31,.28)",
          }}
        >
          <Icon name="gift" size={12} stroke={2.4} />
          رایگان
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: colors.inkMuted }}>
          <Icon name="clock" size={12} stroke={2} />
          {faNumber(item.duration)} دقیقه
        </span>
      </span>
      <strong style={{ fontSize: 13.5, fontWeight: 900, lineHeight: 1.6, color: colors.ink, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 43 }}>
        {item.title}
      </strong>
      <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <Avatar name={item.teacher_name} src={item.avatar_url || undefined} size={38} ring tone="gold" />
        <span style={{ minWidth: 0, display: "grid", gap: 1 }}>
          <strong style={{ fontSize: 12.5, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.teacher_name}
          </strong>
          <span style={{ fontSize: 10.5, color: colors.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {subtitle || "استاد وُدّا"}
          </span>
        </span>
        {item.reviews > 0 ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginInlineStart: "auto", fontSize: 11, fontWeight: 800, color: colors.goldDark, flex: "0 0 auto" }}>
            <Icon name="star" size={12} fill />
            {new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(item.rating)}
          </span>
        ) : null}
      </span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 13,
          background: "rgba(255,255,255,.75)",
          border: `1px solid ${colors.goldSoft}`,
          fontSize: 12,
          fontWeight: 900,
          color: colors.olive800,
        }}
      >
        رزرو جلسهٔ رایگان
        <Icon name="chevronL" size={14} stroke={2.4} />
      </span>
    </button>
  );
}

export function FreeServicesBoard({ config }: { config: UniversalAppConfig }) {
  const [items, setItems] = useState<FreeServiceCardData[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchFreeServices()
      .then((rows) => {
        if (active) setItems(rows);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  // در حال بارگذاری: اسکلت ظریف؛ خالی: بخش پنهان می‌شود تا صفحه شلوغ نشود.
  if (items === null) {
    return (
      <section aria-label="خدمات رایگان" style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, overflow: "hidden" }}>
          {[0, 1].map((index) => (
            <span key={index} aria-hidden="true" className="vodda-skeleton" style={{ display: "block", flex: "0 0 236px", height: 188, borderRadius: 22 }} />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section aria-label="خدمات رایگان اساتید" className="vodda-enter vodda-enter-delay-1" style={{ minWidth: 0 }}>
      <SectionHeader
        title="خدمات رایگان اساتید"
        description="جلسات رایگانی که اساتید برای شما برگزار می‌کنند — بدون هزینه شروع کنید."
      />
      <div
        className="vodda-scroll-rail"
        style={{
          display: "flex",
          width: "100%",
          minWidth: 0,
          gap: spacing.md,
          overflowX: "auto",
          marginInline: -spacing.xl,
          padding: `${spacing.sm}px ${spacing.xl}px ${spacing.sm}px`,
          scrollSnapType: "x proximity",
        }}
      >
        {items.map((item) => (
          <FreeServiceTile key={item.service_id} item={item} config={config} />
        ))}
      </div>
    </section>
  );
}

/* ── بنر طلایی خدمات رایگان (وقتی هیچ جلسهٔ رایگانی فعال نیست پنهان است) ── */

export function FreeServicesBanner({ config }: { config: UniversalAppConfig }) {
  const [hasFree, setHasFree] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    fetchFreeServices()
      .then((rows) => {
        if (active) setHasFree(rows.length > 0);
      })
      .catch(() => {
        if (active) setHasFree(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (hasFree === null || !hasFree) return null;

  return (
    <button
      type="button"
      // free=1 → صفحهٔ خدمات فقط جلسات رایگان را نشان می‌دهد، نه همهٔ کاتالوگ را
      onClick={() => navigateApp("/search?mode=services&free=1", config)}
      className="vodda-tappable vodda-enter"
      aria-label="مشاهدهٔ جلسات رایگان اساتید"
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: spacing.md,
        padding: "0",
        textAlign: "right",
        border: 0,
        borderRadius: 22,
        background: colors.olive950,
        cursor: "pointer",
        fontFamily: typography.fontFamily,
        boxShadow: shadows.olive,
      }}
    >
      <img
        src="/images/home/free-banner.webp"
        alt=""
        aria-hidden="true"
        loading="lazy"
        style={{ position: "absolute", insetInlineEnd: 0, top: 0, height: "100%", width: "42%", objectFit: "cover", opacity: 0.9 }}
      />
      <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(270deg, rgba(20,28,16,0) 30%, rgba(20,28,16,.94) 62%)" }} />
      <span style={{ position: "relative", display: "grid", gap: 4, padding: "18px 18px 18px", flex: 1, minWidth: 0 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 900, color: colors.goldSoft }}>
          <Icon name="gift" size={13} stroke={2.4} />
          هدیهٔ اساتید وُدّا
        </span>
        <strong style={{ fontSize: 15.5, fontWeight: 900, color: colors.surface, lineHeight: 1.6 }}>
          جلسات رایگان یادگیری قرآن
        </strong>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,.75)", lineHeight: 1.8 }}>
          اساتیدی که خدمتشان را رایگان ارائه می‌کنند را ببینید
        </span>
      </span>
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          flex: "0 0 auto",
          marginInlineEnd: 14,
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          background: "rgba(255,255,255,.12)",
          border: "1px solid rgba(212,171,82,.4)",
          color: colors.goldSoft,
        }}
      >
        <Icon name="chevronL" size={16} stroke={2.4} />
      </span>
    </button>
  );
}
