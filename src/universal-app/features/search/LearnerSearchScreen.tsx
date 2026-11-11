"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  Sheet,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { navigateApp } from "../../router";
import { getCatalog } from "../dispatch/api";
import { searchTeachersPage } from "../teachers/api";
import { getAllTeachersCached, getTeacherCities } from "../teachers/cached";
import { TeacherCard } from "../teachers/TeacherCard";
import type { Teacher } from "../teachers/types";

const PAGE_SIZE = 10;
const RECENT_KEY = "vodda_recent_searches";
const RECENT_LIMIT = 5;

type SortKey = "recommended" | "rating" | "sessions" | "newest";
type TierKey = "" | "international" | "grade2" | "grade3";

type SearchFilters = {
  query: string;
  field: string;
  city: string;
  female: "all" | "female" | "male";
  tier: TierKey;
  availableOnly: boolean;
  sort: SortKey;
};

type AdvancedDraft = Pick<SearchFilters, "city" | "female">;

const SORT_PRESETS: Array<[SortKey, string]> = [
  ["recommended", "پیشنهادی وُدّا"],
  ["rating", "بالاترین امتیاز"],
  ["sessions", "بیشترین جلسه"],
  ["newest", "جدیدترین"],
];

const TIER_PRESETS: Array<[TierKey, string, string]> = [
  ["", "همه درجه‌ها", ""],
  ["international", "بین‌المللی", "#0095F6"],
  ["grade2", "درجه ۲", "#1EA55C"],
  ["grade3", "درجه ۳", "#E5484D"],
];

const TIER_LABELS: Record<string, string> = {
  international: "بین‌المللی",
  grade2: "درجه ۲",
  grade3: "درجه ۳",
};

const fieldPresets = [
  ["", "همه"],
  ["آموزش قرآن کریم", "آموزش قرآن"],
] as const;

// استادهای مداحی فعلاً از تمام سطوح کاربری پنهان می‌شوند (پلتفرم تخصصاً قرآنی).
const MADDAHI_PATTERN = /مداح|هم‌نوا|همنوا/;

function recommendationScore(teacher: Teacher) {
  return teacher.rating * Math.log10(10 + Math.max(0, teacher.sessions));
}

function sortTeachers(rows: Teacher[], sort: SortKey): Teacher[] {
  const copy = [...rows];
  switch (sort) {
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating);
    case "sessions":
      return copy.sort((a, b) => b.sessions - a.sessions);
    case "newest":
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default:
      return copy.sort((a, b) => recommendationScore(b) - recommendationScore(a));
  }
}

function faNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits }).format(value);
}

function readInitialFilters(): SearchFilters {
  const empty: SearchFilters = {
    query: "",
    field: "",
    city: "",
    female: "all",
    tier: "",
    availableOnly: false,
    sort: "recommended",
  };
  if (typeof window === "undefined") return empty;
  const params = new URLSearchParams(window.location.search);
  const femaleParam = params.get("female");
  const tierParam = params.get("tier");
  const sortParam = params.get("sort");
  return {
    query: params.get("q") ?? "",
    field: params.get("field") ?? "",
    city: params.get("city") ?? "",
    female: femaleParam === "true" ? "female" : femaleParam === "false" ? "male" : "all",
    tier: (["international", "grade2", "grade3"].includes(tierParam ?? "") ? tierParam : "") as TierKey,
    availableOnly: params.get("available") === "true",
    sort: (["recommended", "rating", "sessions", "newest"].includes(sortParam ?? "")
      ? sortParam
      : "recommended") as SortKey,
  };
}

function readRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0).slice(0, RECENT_LIMIT)
      : [];
  } catch {
    return [];
  }
}

function chipStyle(active: boolean) {
  return {
    minHeight: 36,
    padding: "7px 13px",
    border: active ? "1px solid " + colors.olive600 : "1px solid " + colors.sand200,
    borderRadius: radii.pill,
    color: active ? colors.surface : colors.inkSecondary,
    background: active ? colors.olive600 : colors.surface,
    boxShadow: active ? "0 5px 14px rgba(94,110,67,.14)" : shadows.xs,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
}

function Skeleton({ style }: { style?: CSSProperties }) {
  return <span aria-hidden="true" className="vodda-skeleton" style={{ display: "block", ...style }} />;
}

function SearchSkeleton() {
  return (
    <div style={{ display: "grid", gap: 14 }} aria-label="در حال جستجو">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          style={{ display: "flex", gap: 12, padding: 14, background: colors.surface, borderRadius: 24, boxShadow: shadows.sm }}
        >
          <Skeleton style={{ width: 62, height: 62, borderRadius: 18, flex: "0 0 auto" }} />
          <div style={{ display: "grid", gap: 9, flex: 1, alignContent: "center" }}>
            <Skeleton style={{ width: "55%", height: 14 }} />
            <Skeleton style={{ width: "38%", height: 12 }} />
            <Skeleton style={{ width: "70%", height: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LearnerSearchScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const initial = useMemo(readInitialFilters, []);
  const [filters, setFilters] = useState<SearchFilters>(initial);
  const [debouncedQuery, setDebouncedQuery] = useState(initial.query);
  const [topicId, setTopicId] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(new URLSearchParams(window.location.search).get("topic") ?? 0) || 0;
  });
  const [topicTitle, setTopicTitle] = useState<string>("");
  const [rows, setRows] = useState<Teacher[]>([]);
  const [serverTotal, setServerTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [advancedDraft, setAdvancedDraft] = useState<AdvancedDraft>({ city: initial.city, female: initial.female });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [cities, setCities] = useState<string[]>([]);
  const [cityQuery, setCityQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(() => readRecentSearches());
  const [fallback, setFallback] = useState<Teacher[]>([]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(filters.query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [filters.query]);

  // ثبت جستجوهای اخیر
  useEffect(() => {
    const query = debouncedQuery;
    if (!query) return;
    setRecent((current) => {
      const next = [query, ...current.filter((item) => item !== query)].slice(0, RECENT_LIMIT);
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // حافظه محلی در دسترس نیست — بی‌اهمیت
      }
      return next;
    });
  }, [debouncedQuery]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query.trim()) params.set("q", filters.query.trim());
    if (filters.field.trim()) params.set("field", filters.field.trim());
    if (filters.city.trim()) params.set("city", filters.city.trim());
    if (filters.female === "female") params.set("female", "true");
    if (filters.female === "male") params.set("female", "false");
    if (filters.tier) params.set("tier", filters.tier);
    if (filters.availableOnly) params.set("available", "true");
    if (filters.sort !== "recommended") params.set("sort", filters.sort);
    const next = window.location.pathname + (params.size ? "?" + params.toString() : "");
    window.history.replaceState({}, "", next);
  }, [filters]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setVisibleCount(PAGE_SIZE);
    searchTeachersPage(runtime, {
      query: debouncedQuery,
      field: filters.field,
      city: filters.city,
      female: filters.female === "all" ? undefined : filters.female === "female",
      officialServiceId: topicId,
      limit: 100,
      offset: 0,
    })
      .then((result) => {
        if (!active) return;
        const visible = result.items.filter((teacher) => !MADDAHI_PATTERN.test(teacher.field + " " + teacher.tag));
        setRows(visible);
        setServerTotal(result.total);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setRows([]);
        setError(messageOf(reason, "دریافت فهرست استادان با خطا روبه‌رو شد."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [runtime, debouncedQuery, filters.field, filters.city, filters.female, topicId, reloadKey]);

  // عنوان موضوع فراخوان (برای نشانِ فیلتر فعال)
  useEffect(() => {
    if (!topicId) {
      setTopicTitle("");
      return;
    }
    let active = true;
    getCatalog(runtime)
      .then((rows) => {
        if (active) setTopicTitle(rows.find((row) => row.id === topicId)?.title ?? "");
      })
      .catch(() => {
        if (active) setTopicTitle("");
      });
    return () => {
      active = false;
    };
  }, [runtime, topicId]);

  // شهرها فقط وقتی شیت فیلتر باز می‌شود دریافت می‌شوند (کش ۵ دقیقه‌ای)
  useEffect(() => {
    if (!filtersOpen || cities.length > 0) return;
    let active = true;
    getTeacherCities(runtime)
      .then((list) => {
        if (active) setCities(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [filtersOpen, cities.length, runtime]);

  const filtered = useMemo(() => {
    let out = rows;
    if (filters.tier) out = out.filter((teacher) => teacher.tier === filters.tier);
    if (filters.availableOnly) out = out.filter((teacher) => teacher.available);
    return sortTeachers(out, filters.sort);
  }, [rows, filters.tier, filters.availableOnly, filters.sort]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;
  const hasAdvancedFilter = Boolean(filters.city || filters.female !== "all" || filters.availableOnly || filters.tier);
  const hasAnyFilter = Boolean(filters.query || filters.field || hasAdvancedFilter || topicId);
  const filteredCities = useMemo(() => {
    const needle = cityQuery.trim();
    return needle ? cities.filter((city) => city.includes(needle)) : cities;
  }, [cities, cityQuery]);

  // پیشنهاد جایگزین برای حالت خالی: پرمخاطب‌ترین استادها
  useEffect(() => {
    if (loading || error || filtered.length > 0 || !hasAnyFilter) {
      setFallback([]);
      return;
    }
    let active = true;
    getAllTeachersCached(runtime)
      .then((items) => {
        if (!active) return;
        setFallback(sortTeachers(items, "rating").slice(0, 4));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [runtime, loading, error, filtered.length, hasAnyFilter]);

  // بارگذاری خودکار نتایج بعدی هنگام اسکرول
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisibleCount((current) => current + PAGE_SIZE);
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, visibleCount]);

  function openFilters() {
    setAdvancedDraft({ city: filters.city, female: filters.female });
    setFiltersOpen(true);
  }

  function applyAdvancedFilters() {
    setFilters((current) => ({
      ...current,
      city: advancedDraft.city.trim(),
      female: advancedDraft.female,
    }));
    setFiltersOpen(false);
  }

  function clearAdvancedFilters() {
    setAdvancedDraft({ city: "", female: "all" });
    setFilters((current) => ({ ...current, city: "", female: "all" }));
    setFiltersOpen(false);
  }

  function clearAllFilters() {
    setFilters({ query: "", field: "", city: "", female: "all", tier: "", availableOnly: false, sort: "recommended" });
    setTopicId(0);
  }

  function removeRecent(item: string) {
    setRecent((current) => {
      const next = current.filter((entry) => entry !== item);
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // بی‌اهمیت
      }
      return next;
    });
  }

  const filteredCitiesList = cityQuery.trim()
    ? cities.filter((city) => city.includes(cityQuery.trim()))
    : cities;

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <header className="vodda-enter" style={{ paddingTop: 2 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: colors.ink }}>جستجوی استاد</h1>
        <p style={{ fontSize: 12.5, margin: "5px 0 0", color: colors.inkMuted }}>
          نام، تخصص، شهر و جنسیت استاد را جستجو کنید.
        </p>
      </header>

      {topicId ? (
        <div
          className="vodda-enter"
          style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "11px 14px", borderRadius: 16,
            background: colors.olive50, border: `1px solid ${colors.olive200}`,
          }}
        >
          <Icon name="quran" size={17} style={{ color: colors.olive700, flex: "0 0 auto" }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ display: "block", fontSize: 12.5, color: colors.olive700 }}>
              موضوع: {topicTitle || `#${topicId}`}
            </strong>
            <span style={{ fontSize: 11, color: colors.inkMuted }}>اساتیدی که این موضوع رسمی را تدریس می‌کنند</span>
          </div>
          <button
            type="button"
            onClick={() => setTopicId(0)}
            aria-label="حذف فیلتر موضوع"
            style={{ background: "none", border: 0, color: colors.inkMuted, cursor: "pointer", padding: 4, fontFamily: typography.fontFamily }}
          >
            <Icon name="x" size={16} />
          </button>
          <button
            type="button"
            onClick={() => navigateApp("/dispatch", config)}
            style={{
              flex: "0 0 auto", minHeight: 36, padding: "0 13px",
              borderRadius: 999, border: 0, cursor: "pointer",
              background: colors.olive600, color: colors.surface,
              fontSize: 11.5, fontWeight: 800, fontFamily: typography.fontFamily,
            }}
          >
            🔔 فراخوان
          </button>
        </div>
      ) : null}

      <div className="vodda-enter" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative", minWidth: 0, flex: 1 }}>
          <Icon
            name="search"
            size={20}
            stroke={1.8}
            style={{ position: "absolute", zIndex: 1, insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: colors.inkMuted }}
          />
          <input
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="نام استاد یا تخصص…"
            className="vodda-input"
            style={{
              width: "100%",
              minHeight: 50,
              padding: "11px 42px 11px 44px",
              border: 0,
              borderRadius: 16,
              outline: "none",
              color: colors.ink,
              background: colors.surface,
              boxShadow: shadows.sm,
              fontFamily: typography.fontFamily,
              ...typography.body,
            }}
          />
          {filters.query ? (
            <button
              type="button"
              aria-label="پاک کردن جستجو"
              onClick={() => setFilters((current) => ({ ...current, query: "" }))}
              style={{
                position: "absolute",
                insetInlineEnd: 10,
                top: "50%",
                transform: "translateY(-50%)",
                width: 32,
                height: 32,
                display: "grid",
                placeItems: "center",
                padding: 0,
                border: 0,
                borderRadius: "50%",
                color: colors.inkMuted,
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <Icon name="x" size={17} />
            </button>
          ) : null}
        </div>

        <div style={{ position: "relative", flex: "0 0 auto" }}>
          <button
            type="button"
            aria-label="فیلتر شهر و جنسیت"
            onClick={openFilters}
            className="vodda-tappable"
            style={{
              width: 50,
              height: 50,
              display: "grid",
              placeItems: "center",
              padding: 0,
              border: 0,
              borderRadius: 16,
              color: colors.surface,
              background: colors.olive600,
              boxShadow: shadows.sm,
              cursor: "pointer",
            }}
          >
            <Icon name="filter" size={21} stroke={1.9} />
          </button>
          {hasAdvancedFilter ? (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -2,
                insetInlineEnd: -2,
                width: 10,
                height: 10,
                border: "2px solid " + colors.sand50,
                borderRadius: "50%",
                background: colors.gold,
              }}
            />
          ) : null}
        </div>
      </div>

      {!filters.query && recent.length > 0 ? (
        <div
          className="vodda-scroll-rail vodda-enter"
          style={{ display: "flex", gap: 8, overflowX: "auto", marginInline: -spacing.xl, paddingInline: spacing.xl, minHeight: 36 }}
        >
          {recent.map((item) => (
            <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              <button
                type="button"
                className="vodda-tappable"
                onClick={() => setFilters((current) => ({ ...current, query: item }))}
                style={{ ...chipStyle(false), background: colors.sand50, minHeight: 32, padding: "5px 11px", fontSize: 11.5 }}
              >
                <Icon name="clock" size={13} />
                {item}
              </button>
              <button
                type="button"
                aria-label={`حذف ${item} از جستجوهای اخیر`}
                onClick={() => removeRecent(item)}
                style={{
                  width: 22,
                  height: 22,
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                  border: 0,
                  borderRadius: "50%",
                  color: colors.inkFaint,
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <Icon name="x" size={13} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div
        className="vodda-scroll-rail"
        style={{ display: "flex", gap: 8, overflowX: "auto", marginInline: -spacing.xl, paddingInline: spacing.xl, minHeight: 40 }}
      >
        {fieldPresets.map(([field, label]) => (
          <button
            key={field || "all"}
            type="button"
            className="vodda-tappable"
            onClick={() => setFilters((current) => ({ ...current, field }))}
            style={chipStyle(filters.field === field)}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="vodda-scroll-rail"
        style={{ display: "flex", gap: 8, overflowX: "auto", marginInline: -spacing.xl, paddingInline: spacing.xl, minHeight: 38 }}
      >
        {SORT_PRESETS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="vodda-tappable"
            onClick={() => setFilters((current) => ({ ...current, sort: value }))}
            style={{ ...chipStyle(filters.sort === value), fontSize: 11.5, minHeight: 34, padding: "6px 11px" }}
          >
            <Icon name={filters.sort === value ? "check" : "trending"} size={13} stroke={2} />
            {label}
          </button>
        ))}
      </div>

      <div
        className="vodda-scroll-rail"
        style={{ display: "flex", gap: 8, overflowX: "auto", marginInline: -spacing.xl, paddingInline: spacing.xl, minHeight: 38 }}
      >
        <button
          type="button"
          className="vodda-tappable"
          onClick={() => setFilters((current) => ({ ...current, availableOnly: !current.availableOnly }))}
          style={{ ...chipStyle(filters.availableOnly), fontSize: 11.5, minHeight: 34, padding: "6px 11px" }}
        >
          <Icon name="checkCircle" size={13} stroke={2} />
          فقط آمادهٔ رزرو
        </button>
        {TIER_PRESETS.map(([value, label, color]) => (
          <button
            key={value || "all-tiers"}
            type="button"
            className="vodda-tappable"
            onClick={() => setFilters((current) => ({ ...current, tier: value }))}
            style={{ ...chipStyle(filters.tier === value), fontSize: 11.5, minHeight: 34, padding: "6px 11px" }}
          >
            {color ? (
              <span
                aria-hidden="true"
                style={{ width: 9, height: 9, borderRadius: "50%", background: color, flex: "0 0 auto" }}
              />
            ) : null}
            {label}
          </button>
        ))}
      </div>

      {hasAdvancedFilter ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {filters.city ? (
            <button
              type="button"
              className="vodda-tappable"
              onClick={() => setFilters((current) => ({ ...current, city: "" }))}
              style={{ ...chipStyle(false), background: colors.sand100 }}
            >
              شهر: {filters.city}
              <Icon name="x" size={14} />
            </button>
          ) : null}
          {filters.female !== "all" ? (
            <button
              type="button"
              className="vodda-tappable"
              onClick={() => setFilters((current) => ({ ...current, female: "all" }))}
              style={{ ...chipStyle(false), background: colors.sand100 }}
            >
              {filters.female === "female" ? "استاد خانم" : "استاد آقا"}
              <Icon name="x" size={14} />
            </button>
          ) : null}
          {filters.tier ? (
            <button
              type="button"
              className="vodda-tappable"
              onClick={() => setFilters((current) => ({ ...current, tier: "" }))}
              style={{ ...chipStyle(false), background: colors.sand100 }}
            >
              درجه: {TIER_LABELS[filters.tier]}
              <Icon name="x" size={14} />
            </button>
          ) : null}
          {filters.availableOnly ? (
            <button
              type="button"
              className="vodda-tappable"
              onClick={() => setFilters((current) => ({ ...current, availableOnly: false }))}
              style={{ ...chipStyle(false), background: colors.sand100 }}
            >
              فقط آمادهٔ رزرو
              <Icon name="x" size={14} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div style={{ height: 2 }} />

      {loading ? <SearchSkeleton /> : null}
      {!loading && error ? (
        <ErrorState
          title="خطا در جستجو"
          description={error}
          action={<Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>تلاش دوباره</Button>}
        />
      ) : null}
      {!loading && !error ? (
        <>
          <div style={{ ...typography.bodySmall, color: colors.inkMuted }}>
            {faNumber(filtered.length)} استاد یافت شد
            {serverTotal > filtered.length ? (
              <span> (از {faNumber(serverTotal)} استاد پلتفرم)</span>
            ) : null}
          </div>
          {filtered.length === 0 ? (
            <>
              {hasAnyFilter ? (
                <EmptyState
                  icon={<Icon name="search" size={30} />}
                  title="نتیجه‌ای یافت نشد"
                  description="با این فیلترها استادی پیدا نشد؛ فیلترها را کمتر کنید."
                  action={<Button variant="secondary" onClick={clearAllFilters}>پاک کردن فیلترها</Button>}
                />
              ) : (
                <EmptyState
                  icon={<Icon name="users" size={30} />}
                  title="هنوز استادی منتشر نشده"
                  description="پس از تأیید اولین استاد، پروفایل او اینجا نمایش داده می‌شود."
                />
              )}
              {fallback.length > 0 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <strong style={{ ...typography.bodySmall, color: colors.ink }}>شاید این‌ها به کارت بیایند</strong>
                  {fallback.map((teacher) => (
                    <TeacherCard key={teacher.id} teacher={teacher} config={config} wide />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div style={{ display: "grid", gap: 14 }}>
                {visible.map((teacher) => (
                  <TeacherCard key={teacher.id} teacher={teacher} config={config} wide />
                ))}
              </div>
              {hasMore ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                  >
                    نمایش بیشتر ({faNumber(filtered.length - visibleCount)} نفر مانده)
                  </Button>
                  <div ref={sentinelRef} style={{ height: 1 }} />
                </div>
              ) : null}
            </>
          )}
        </>
      ) : null}

      <Sheet open={filtersOpen} title="فیلترهای جستجو" onClose={() => setFiltersOpen(false)}>
        <div style={{ display: "grid", gap: spacing.lg }}>
          <div style={{ display: "grid", gap: 8 }}>
            <strong style={{ ...typography.bodySmall }}>شهر</strong>
            {cities.length > 8 ? (
              <input
                value={cityQuery}
                onChange={(event) => setCityQuery(event.target.value)}
                placeholder="جستجوی شهر…"
                className="vodda-input"
                style={{
                  width: "100%",
                  minHeight: 46,
                  padding: "10px 14px",
                  border: "1px solid " + colors.sand200,
                  borderRadius: 16,
                  outline: "none",
                  color: colors.ink,
                  background: colors.surface,
                  fontFamily: typography.fontFamily,
                }}
              />
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 190, overflowY: "auto" }}>
              {cities.length === 0 ? (
                <span style={{ ...typography.caption, color: colors.inkMuted }}>در حال دریافت شهرها…</span>
              ) : filteredCitiesList.length === 0 ? (
                <span style={{ ...typography.caption, color: colors.inkMuted }}>شهری با این نام پیدا نشد.</span>
              ) : (
                filteredCitiesList.map((city) => (
                  <button
                    key={city}
                    type="button"
                    className="vodda-tappable"
                    onClick={() =>
                      setAdvancedDraft((current) => ({ ...current, city: current.city === city ? "" : city }))
                    }
                    style={chipStyle(advancedDraft.city === city)}
                  >
                    {city}
                  </button>
                ))
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <strong style={{ ...typography.bodySmall }}>جنسیت استاد</strong>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["all", "فرقی ندارد"],
                ["male", "آقا"],
                ["female", "خانم"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className="vodda-tappable"
                  onClick={() => setAdvancedDraft((current) => ({ ...current, female: value as AdvancedDraft["female"] }))}
                  style={chipStyle(advancedDraft.female === value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button fullWidth onClick={applyAdvancedFilters}>اعمال فیلتر</Button>
          <Button fullWidth variant="ghost" onClick={clearAdvancedFilters}>پاک کردن فیلترها</Button>
        </div>
      </Sheet>
    </section>
  );
}
