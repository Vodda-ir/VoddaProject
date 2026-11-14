"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  Icon,
  Sheet,
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { navigateApp } from "../../router";
import { asArray, asRecord } from "../../platform/api";
import { categoryVisual } from "../home/homeSections";
import { getCatalog } from "../dispatch/api";
import { getInPersonCatalog } from "../ceremony/api";
import { searchTeachersPage } from "../teachers/api";
import { getAllTeachersCached, getTeacherCities } from "../teachers/cached";
import { TeacherCard } from "../teachers/TeacherCard";
import type { Teacher } from "../teachers/types";
import type { OfficialService } from "../dispatch/types";
import type { OfficialInPersonService } from "../ceremony/types";

const PAGE_SIZE = 10;
const RECENT_KEY = "vodda_recent_searches";
const RECENT_LIMIT = 5;

type SortKey = "recommended" | "rating" | "sessions" | "newest";
type TierKey = "" | "international" | "grade2" | "grade3";
type SearchMode = "teachers" | "services";

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
  ["international", "بین‌المللی", "#0095f6"],
  ["grade2", "کشوری", "#12b76a"],
  ["grade3", "استانی", "#e0245e"],
];

const TIER_LABELS: Record<string, string> = {
  international: "بین‌المللی",
  grade2: "کشوری",
  grade3: "استانی",
};

const fieldPresets = [
  ["", "همه"],
  ["آموزش قرآن کریم", "آموزش قرآن"],
] as const;

// استادهای مداحی فعلاً از تمام سطوح کاربری پنهان می‌شوند (پلتفرم تخصصاً قرآنی).
const MADDAHI_PATTERN = /مداح|هم‌نوا|همنوا/;

/** ترتیب نمایش دسته‌ها — هم‌راستا با خانه (مسیر یادگیری: از پایه تا تخصصی). */
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

/** کنترل سگمنتی «اساتید / خدمات» — دو مسیر هم‌ارزِ جستجو. */
function ModeTabs({ mode, onChange }: { mode: SearchMode; onChange: (next: SearchMode) => void }) {
  const tabs: Array<[SearchMode, string, string]> = [
    ["teachers", "اساتید", "users"],
    ["services", "خدمات", "quran"],
  ];
  return (
    <div
      role="tablist"
      aria-label="نوع جستجو"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
        padding: 5,
        borderRadius: 17,
        background: colors.sand100,
        border: `1px solid ${colors.sand150}`,
      }}
    >
      {tabs.map(([value, label, icon]) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              minHeight: 42,
              borderRadius: 13,
              fontSize: 13.5,
              fontWeight: 800,
              fontFamily: typography.fontFamily,
              cursor: "pointer",
              border: 0,
              color: active ? colors.surface : colors.inkSecondary,
              background: active ? colors.olive600 : "transparent",
              boxShadow: active ? "0 6px 16px rgba(94,110,67,.22)" : "none",
            }}
          >
            <Icon name={icon as "users"} size={17} stroke={2} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ServiceRow({
  icon,
  title,
  description,
  trailing,
  onClick,
  index = 0,
}: {
  icon: string;
  title: string;
  description: string;
  trailing?: string;
  onClick: () => void;
  index?: number;
}) {
  const known = new Set([
    "book", "mic", "quran", "star", "headphones", "award", "sparkle",
    "doc", "heart", "users", "grid", "list", "trending", "refresh",
  ]);
  return (
    <button
      type="button"
      onClick={onClick}
      className="vodda-tappable vodda-enter"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        padding: "11px 13px",
        textAlign: "right",
        background: colors.surface,
        border: `1px solid ${colors.sand150}`,
        borderRadius: 16,
        cursor: "pointer",
        fontFamily: typography.fontFamily,
        animationDelay: `${Math.min(index, 8) * 45}ms`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "grid",
          placeItems: "center",
          width: 38,
          height: 38,
          borderRadius: 12,
          flex: "0 0 38px",
          background: colors.olive50,
          color: colors.olive600,
        }}
      >
        <Icon name={(known.has(icon) ? icon : "book") as "book"} size={19} />
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <strong style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: colors.ink }}>{title}</strong>
        {description ? (
          <span
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
              marginTop: 2,
              fontSize: 12.5,
              color: colors.inkMuted,
              lineHeight: 1.7,
              overflow: "hidden",
            }}
          >
            {description}
          </span>
        ) : null}
      </span>
      {trailing ? (
        <span style={{ flex: "0 0 auto", fontSize: 11, fontWeight: 800, color: colors.goldDark, background: colors.goldBackground, border: "1px solid rgba(191,149,64,.32)", borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>
          {trailing}
        </span>
      ) : null}
      <Icon name="chevronL" size={16} style={{ color: colors.inkFaint, flex: "0 0 auto" }} />
    </button>
  );
}

/** ردیف فشردهٔ استاد در بخش «اساتید این موضوعات» (تب خدمات). */
function TopicTeacherRow({
  teacher,
  config,
  index = 0,
}: {
  teacher: Teacher;
  config: UniversalAppConfig;
  index?: number;
}) {
  const subtitle = [teacher.tag || teacher.field, teacher.city].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={() => navigateApp(`/teacher/${teacher.id}`, config)}
      className="vodda-tappable vodda-enter"
      aria-label={`پروفایل استاد ${teacher.name}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "9px 12px",
        textAlign: "right",
        background: colors.surface,
        border: `1px solid ${colors.sand150}`,
        borderRadius: 16,
        cursor: "pointer",
        fontFamily: typography.fontFamily,
        animationDelay: `${Math.min(index, 8) * 45}ms`,
      }}
    >
      <Avatar name={teacher.name} src={teacher.avatarUrl || undefined} size={38} ring tone={teacher.female ? "gold" : "olive"} />
      <span style={{ minWidth: 0, flex: 1 }}>
        <strong style={{ display: "block", fontSize: 12.8, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {teacher.name}
        </strong>
        <span style={{ display: "block", fontSize: 11, color: colors.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {subtitle || "استاد وُدّا"}
        </span>
      </span>
      {teacher.reviews > 0 ? (
        <span style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 800, color: colors.goldDark }}>
          <Icon name="star" size={11} fill />
          {faNumber(teacher.rating, 1)}
        </span>
      ) : null}
      <Icon name="chevronL" size={16} style={{ color: colors.inkFaint, flex: "0 0 auto" }} />
    </button>
  );
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
  const [mode, setMode] = useState<SearchMode>(() => {
    if (typeof window === "undefined") return "teachers";
    return new URLSearchParams(window.location.search).get("mode") === "services" ? "services" : "teachers";
  });
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

  // داده‌های تب «خدمات»: کاتالوگ آنلاین + کاتالوگ حضوری، فقط یک بار
  const [onlineServices, setOnlineServices] = useState<OfficialService[]>([]);
  const [presenceServices, setPresenceServices] = useState<OfficialInPersonService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState("");
  const [servicesQuery, setServicesQuery] = useState(() => {
    // لینک‌های عمیق دسته‌ها (q=) فیلتر خدمات را از همان ابتدا پر می‌کنند —
    // تا کلیک روی هر موضوع در خانه، وارد زیردسته‌های تخصصی همان موضوع شود.
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") ?? "";
  });
  // بنر «خدمات رایگان» با ?free=1 باز می‌شود — فقط خدمات رایگان، نه همهٔ کاتالوگ.
  const [freeOnly, setFreeOnly] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("free") === "1";
  });
  const [servicesLoaded, setServicesLoaded] = useState(false);

  useEffect(() => {
    if (mode !== "services" || servicesLoaded) return;
    let active = true;
    setServicesLoading(true);
    setServicesError("");
    Promise.all([getCatalog(runtime), getInPersonCatalog(runtime).catch(() => [] as OfficialInPersonService[])])
      .then(([online, presence]) => {
        if (!active) return;
        setOnlineServices(online);
        setPresenceServices(presence);
        setServicesLoaded(true);
      })
      .catch((reason: unknown) => {
        if (active) setServicesError(messageOf(reason, "دریافت فهرست خدمات ناموفق بود."));
      })
      .finally(() => {
        if (active) setServicesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, servicesLoaded, runtime]);

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
    // تب فعال در URL می‌ماند تا هر باز-راه‌اندازی دوبارهٔ صفحه (حتی با فاصلهٔ
    // کم پس از ناوبری برنامه‌ای) تب «خدمات» را گم نکند؛ فیلتر موضوع رسمی
    // (topic) نیز در URL حفظ می‌شود تا لینک اساتید هر خدمت پایدار بماند.
    if (mode === "services") params.set("mode", "services");
    if (freeOnly) params.set("free", "1");
    // در تب «خدمات» فیلتر جستجو همان موضوع فعال است؛ در تب اساتید، متن جستجوی استاد
    if (mode === "services" ? servicesQuery.trim() : filters.query.trim()) {
      params.set("q", mode === "services" ? servicesQuery.trim() : filters.query.trim());
    }
    if (topicId) params.set("topic", String(topicId));
    if (filters.field.trim()) params.set("field", filters.field.trim());
    if (filters.city.trim()) params.set("city", filters.city.trim());
    if (filters.female === "female") params.set("female", "true");
    if (filters.female === "male") params.set("female", "false");
    if (filters.tier) params.set("tier", filters.tier);
    if (filters.availableOnly) params.set("available", "true");
    if (filters.sort !== "recommended") params.set("sort", filters.sort);
    const next = window.location.pathname + (params.size ? "?" + params.toString() : "");
    window.history.replaceState({}, "", next);
  }, [filters, mode, topicId, freeOnly, servicesQuery]);

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

  // فیلتر و گروه‌بندی خدمات (تب خدمات)
  const needle = servicesQuery.trim();
  // کاتالوگ جلسات رایگان — در حالت free=1 فقط همین‌ها نمایش داده می‌شود.
  const [freeRows, setFreeRows] = useState<Array<{ service_id: number; teacher_id: number; title: string; teacher_name: string; avatar_url: string; duration: number; tag: string; city: string; rating: number }>>([]);
  useEffect(() => {
    if (mode !== "services" || !freeOnly) return;
    let active = true;
    fetch("/api/backend/catalog/free?limit=50", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("free failed"))))
      .then((payload: { data?: unknown }) => {
        if (!active) return;
        const rows: Array<{ service_id: number; teacher_id: number; title: string; teacher_name: string; avatar_url: string; duration: number; tag: string; city: string; rating: number }> = [];
        for (const item of asArray(payload.data)) {
          const row = asRecord(item);
          const serviceId = Number(row?.service_id ?? 0);
          const teacherId = Number(row?.teacher_id ?? 0);
          if (serviceId > 0 && teacherId > 0) {
            rows.push({
              service_id: serviceId,
              teacher_id: teacherId,
              title: String(row?.title ?? ""),
              teacher_name: String(row?.teacher_name ?? ""),
              avatar_url: String(row?.avatar_url ?? ""),
              duration: Number(row?.duration ?? 0),
              tag: String(row?.tag ?? ""),
              city: String(row?.city ?? ""),
              rating: Number(row?.rating ?? 0),
            });
          }
        }
        setFreeRows(rows);
      })
      .catch(() => {
        if (active) setFreeRows([]);
      });
    return () => {
      active = false;
    };
  }, [mode, freeOnly]);
  const filteredOnlineServices = useMemo(() => {
    if (!needle) return onlineServices;
    return onlineServices.filter((item) =>
      item.title.includes(needle) || item.category.includes(needle) || item.description.includes(needle));
  }, [needle, onlineServices]);
  const filteredPresenceServices = useMemo(() => {
    if (!needle) return presenceServices;
    return presenceServices.filter((item) =>
      item.title.includes(needle) || item.category.includes(needle) || item.description.includes(needle));
  }, [needle, presenceServices]);
  const onlineServiceGroups = useMemo(() => {
    const groups = new Map<string, OfficialService[]>();
    for (const item of filteredOnlineServices) {
      const rows = groups.get(item.category) ?? [];
      rows.push(item);
      groups.set(item.category, rows);
    }
    return [...groups.entries()];
  }, [filteredOnlineServices]);
  const presenceServiceGroups = useMemo(() => {
    const groups = new Map<string, OfficialInPersonService[]>();
    for (const item of filteredPresenceServices) {
      const rows = groups.get(item.category) ?? [];
      rows.push(item);
      groups.set(item.category, rows);
    }
    return [...groups.entries()];
  }, [filteredPresenceServices]);

  // فهرست دسته‌ها (حالت بدون جستجو) — به‌جای کاتالوگ تختِ همهٔ خدمات،
  // کاربر ابتدا دسته را انتخاب می‌کند؛ ورود به هر دسته فقط خدمات همان دسته را نشان می‌دهد.
  const serviceCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of onlineServices) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([category, count]) => ({ category, count, ...categoryVisual(category) }))
      .sort((a, b) => categoryOrderIndex(a.category) - categoryOrderIndex(b.category) || b.count - a.count);
  }, [onlineServices]);

  // اساتید موضوعات فیلترشده (تب خدمات) — ورود به هر موضوع از خانه، زیردسته‌ها
  // و همزمان اساتید همان زیردسته‌ها را نشان می‌دهد، نه همهٔ اساتید.
  const [topicTeachers, setTopicTeachers] = useState<Teacher[]>([]);
  const [topicTeachersLoading, setTopicTeachersLoading] = useState(false);
  useEffect(() => {
    if (mode !== "services" || !servicesLoaded || !needle) {
      setTopicTeachers([]);
      setTopicTeachersLoading(false);
      return;
    }
    const ids = filteredOnlineServices.slice(0, 6).map((item) => item.id);
    if (ids.length === 0) {
      setTopicTeachers([]);
      setTopicTeachersLoading(false);
      return;
    }
    let active = true;
    setTopicTeachersLoading(true);
    Promise.all(
      ids.map((id) =>
        searchTeachersPage(runtime, { officialServiceId: id, limit: 6 }).catch(() => ({ items: [] as Teacher[], total: 0 })),
      ),
    )
      .then((results) => {
        if (!active) return;
        const seen = new Set<number>();
        const merged: Teacher[] = [];
        for (const result of results) {
          for (const teacher of result.items) {
            if (MADDAHI_PATTERN.test(teacher.field + " " + teacher.tag)) continue;
            if (seen.has(teacher.id)) continue;
            seen.add(teacher.id);
            merged.push(teacher);
          }
        }
        setTopicTeachers(merged.slice(0, 8));
      })
      .finally(() => {
        if (active) setTopicTeachersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, servicesLoaded, runtime, needle, filteredOnlineServices]);

  function openServiceTeachers(serviceId: number) {
    setTopicId(serviceId);
    setMode("teachers");
    // ورود به اساتید یک خدمت = فقط فیلتر موضوع رسمی؛ جستجوی متنی از دستهٔ
    // قبلی نباید نتایج را خالی یا مغشوش کند.
    setFilters((current) => ({ ...current, query: "" }));
    setDebouncedQuery("");
    navigateApp(`/search?topic=${serviceId}`, config);
  }

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: 14 }}>
      <header className="vodda-enter" style={{ paddingTop: 2 }}>
        <h1 className="vodda-display" style={{ fontSize: 26, margin: "2px 0 0", color: colors.ink, lineHeight: 1.7 }}>جستجو</h1>
        <p style={{ fontSize: 12.5, margin: "5px 0 0", color: colors.inkMuted }}>
          استاد، خدمت آموزشی و قاری مراسم — همه از یک‌جا.
        </p>
      </header>

      <div className="vodda-enter vodda-enter-delay-1">
        <ModeTabs mode={mode} onChange={setMode} />
      </div>

      {mode === "services" ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <Icon
              name="search"
              size={19}
              stroke={1.8}
              style={{ position: "absolute", zIndex: 1, insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: colors.inkMuted }}
            />
            <input
              type="search"
              value={servicesQuery}
              onChange={(event) => setServicesQuery(event.target.value)}
              placeholder="نام خدمت؛ مثلاً تجوید، حفظ، ختم قرآن…"
              className="vodda-input"
              style={{
                width: "100%",
                minHeight: 50,
                padding: "11px 42px 11px 14px",
                border: 0,
                borderRadius: 16,
                outline: "none",
                color: colors.ink,
                background: colors.surface,
                boxShadow: shadows.sm,
                fontFamily: typography.fontFamily,
                ...typography.body,
              }}
              aria-label="جستجوی خدمت"
            />
          </div>

          {servicesLoading ? <SearchSkeleton /> : null}
          {!servicesLoading && servicesError ? (
            <ErrorState
              title="خطا در دریافت خدمات"
              description={servicesError}
              action={<Button variant="secondary" onClick={() => setServicesLoaded(false)}>تلاش دوباره</Button>}
            />
          ) : null}
          {!servicesLoading && !servicesError && freeOnly ? (
            <>
              <div
                className="vodda-enter"
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  padding: "11px 14px", borderRadius: 16,
                  background: colors.goldBackground, border: "1px solid rgba(191,149,64,.38)",
                }}
              >
                <Icon name="gift" size={17} style={{ color: colors.goldDark, flex: "0 0 auto" }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <strong style={{ display: "block", fontSize: 12.5, color: colors.goldDark }}>فقط خدمات رایگان</strong>
                  <span style={{ fontSize: 11, color: colors.inkMuted }}>جلسات رایگانی که اساتید برای شروع رایگان برگزار می‌کنند</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFreeOnly(false)}
                  aria-label="نمایش همهٔ خدمات"
                  style={{ background: "none", border: 0, color: colors.inkMuted, cursor: "pointer", padding: 4, fontFamily: typography.fontFamily }}
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
              {freeRows.length === 0 ? (
                <EmptyState
                  icon={<Icon name="gift" size={30} />}
                  title="فعلاً جلسهٔ رایگانی فعال نیست"
                  description="به‌محض فعال‌شدن جلسات رایگان اساتید، همین‌جا نمایش داده می‌شود."
                />
              ) : (
                freeRows.map((row, index) => (
                  <ServiceRow
                    key={`${row.teacher_id}-${row.service_id}`}
                    icon="gift"
                    title={row.title || "جلسهٔ رایگان"}
                    description={[row.tag, row.city].filter(Boolean).join(" · ") || `استاد ${row.teacher_name}`}
                    trailing="رایگان"
                    index={index}
                    onClick={() => navigateApp(`/book/${row.teacher_id}?free=1`, config)}
                  />
                ))
              )}
            </>
          ) : null}
          {!servicesLoading && !servicesError && !freeOnly && needle ? (
            <>
              {/* نان‌شکنی موضوع — کاربر بداند داخل کدام دسته است و بتواند برگردد */}
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
                  <strong style={{ display: "block", fontSize: 12.5, color: colors.olive700 }}>{needle}</strong>
                  <span style={{ fontSize: 11, color: colors.inkMuted }}>
                    {faNumber(filteredOnlineServices.length)} خدمت در این موضوع
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setServicesQuery("")}
                  aria-label="بازگشت به همهٔ موضوعات"
                  style={{
                    flex: "0 0 auto", minHeight: 36, padding: "0 13px",
                    borderRadius: 999, border: 0, cursor: "pointer",
                    background: colors.olive600, color: colors.surface,
                    fontSize: 12, fontWeight: 800, fontFamily: typography.fontFamily,
                  }}
                >
                  همهٔ موضوعات
                </button>
              </div>

              {onlineServiceGroups.map(([category, items]) => (
                <div key={category} style={{ display: "grid", gap: 7 }}>
                  <span style={{ fontSize: 11, color: colors.inkFaint }}>{category}</span>
                  {items.map((item, index) => (
                    <ServiceRow
                      key={item.id}
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                      trailing="اساتید"
                      index={index}
                      onClick={() => openServiceTeachers(item.id)}
                    />
                  ))}
                </div>
              ))}

              {presenceServiceGroups.map(([category, items]) => (
                <div key={category} style={{ display: "grid", gap: 7 }}>
                  <span style={{ fontSize: 11, color: colors.inkFaint }}>{category} — حضوری</span>
                  {items.map((item, index) => (
                    <ServiceRow
                      key={item.id}
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                      trailing="قاریان حضوری"
                      index={index}
                      onClick={() => navigateApp(`/presence?service=${item.id}`, config)}
                    />
                  ))}
                </div>
              ))}

              {/* اساتید این موضوعات — فقط استادان زیردسته‌های فیلترشده، نه همهٔ اساتید */}
              {filteredOnlineServices.length > 0 ? (
                <section style={{ display: "grid", gap: 9 }} aria-label="اساتید این موضوعات">
                  <strong style={{ fontSize: 13, color: colors.olive700, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="users" size={15} />
                    اساتید این موضوعات
                  </strong>
                  {topicTeachersLoading ? (
                    <div style={{ display: "grid", gap: 7 }} aria-label="در حال دریافت اساتید">
                      {[0, 1, 2].map((index) => (
                        <span
                          key={index}
                          aria-hidden="true"
                          className="vodda-skeleton"
                          style={{ display: "block", height: 56, borderRadius: 16 }}
                        />
                      ))}
                    </div>
                  ) : topicTeachers.length === 0 ? (
                    <p style={{ margin: 0, fontSize: 11.5, color: colors.inkMuted, lineHeight: 1.9 }}>
                      هنوز استادی برای این موضوعات ثبت‌نام نکرده است؛ می‌توانید از فراخوان استفاده کنید.
                    </p>
                  ) : (
                    topicTeachers.map((teacher, index) => (
                      <TopicTeacherRow key={teacher.id} teacher={teacher} config={config} index={index} />
                    ))
                  )}
                </section>
              ) : null}

              {onlineServiceGroups.length === 0 && presenceServiceGroups.length === 0 ? (
                <EmptyState
                  icon={<Icon name="quran" size={30} />}
                  title="خدمتی یافت نشد"
                  description="عبارت دیگری را جستجو کنید؛ فهرست رسمی خدمات وُدّا همین‌جاست."
                />
              ) : null}
            </>
          ) : null}

          {/* حالت بدون جستجو: دایرکتوری دسته‌ها — ورود به هر دسته فقط خدمات همان دسته را نشان می‌دهد */}
          {!servicesLoading && !servicesError && !freeOnly && !needle ? (
            <>
              <section style={{ display: "grid", gap: 10 }} aria-label="دسته‌بندی موضوعات">
                <strong style={{ fontSize: 13, color: colors.olive700, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="grid" size={15} />
                  موضوع خود را انتخاب کنید
                </strong>
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
                  {serviceCategories.map((category) => (
                    <button
                      key={category.category}
                      type="button"
                      onClick={() => setServicesQuery(category.category)}
                      className="vodda-tappable vodda-enter"
                      aria-label={`ورود به ${category.category} — ${faNumber(category.count)} خدمت`}
                      style={{
                        display: "grid",
                        alignContent: "start",
                        justifyItems: "center",
                        gap: 6,
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
                      <span
                        style={{
                          display: "block",
                          width: "100%",
                          height: 54,
                          borderRadius: 12,
                          overflow: "hidden",
                          border: `2px solid ${colors.goldSoft}`,
                          boxShadow: "0 0 0 2.5px #ffffff, 0 0 0 4px rgba(212,171,82,.3), 0 3px 8px rgba(46,54,34,.12)",
                          background: colors.olive100,
                          position: "relative",
                        }}
                      >
                        <img
                          src={category.image}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </span>
                      <strong
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          lineHeight: 1.5,
                          color: colors.ink,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          minHeight: 33,
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
                          fontSize: 9.6,
                          fontWeight: 800,
                        }}
                      >
                        {faNumber(category.count)} خدمت
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {presenceServices.length > 0 ? (
                <button
                  type="button"
                  onClick={() => navigateApp("/presence", config)}
                  className="vodda-tappable vodda-enter"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    width: "100%",
                    padding: "12px 14px",
                    textAlign: "right",
                    background: "linear-gradient(170deg, #fffdf6, " + colors.goldBackground + ")",
                    border: "1.4px solid " + colors.gold,
                    borderRadius: 18,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily,
                    boxShadow: "0 6px 16px rgba(139,104,31,.12)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 13, flex: "0 0 40px", background: gradients.goldRich, color: "#fffaf0" }}
                  >
                    <Icon name="mic" size={19} />
                  </span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <strong style={{ display: "block", fontSize: 13, fontWeight: 900, color: colors.ink }}>خدمات حضوری مراسم</strong>
                    <span style={{ fontSize: 11.5, color: colors.inkMuted }}>تلاوت مجلسی، اذان، ختم قرآن و تواشیح</span>
                  </span>
                  <Icon name="chevronL" size={16} style={{ color: colors.inkFaint, flex: "0 0 auto" }} />
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <>
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
              fontSize: 12.5, fontWeight: 800, fontFamily: typography.fontFamily,
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
          className="vodda-scroll-rail vodda-fade-edge vodda-enter"
          style={{ display: "flex", gap: 8, overflowX: "auto", marginInline: -spacing.xl, paddingInline: spacing.xl, minHeight: 44 }}
        >
          {recent.map((item) => (
            <span key={item} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              <button
                type="button"
                className="vodda-tappable"
                onClick={() => setFilters((current) => ({ ...current, query: item }))}
                style={{ ...chipStyle(false), background: colors.sand50, minHeight: 36, padding: "5px 11px", fontSize: 12.5 }}
              >
                <Icon name="clock" size={13} />
                {item}
              </button>
              <button
                type="button"
                aria-label={`حذف ${item} از جستجوهای اخیر`}
                onClick={() => removeRecent(item)}
                className="vodda-hit"
                style={{
                  width: 26,
                  height: 26,
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
        className="vodda-scroll-rail vodda-fade-edge"
        style={{ display: "flex", gap: 8, overflowX: "auto", marginInline: -spacing.xl, paddingInline: spacing.xl, minHeight: 44 }}
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
        className="vodda-scroll-rail vodda-fade-edge"
        style={{ display: "flex", gap: 8, overflowX: "auto", marginInline: -spacing.xl, paddingInline: spacing.xl, minHeight: 44 }}
      >
        {SORT_PRESETS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="vodda-tappable"
            onClick={() => setFilters((current) => ({ ...current, sort: value }))}
            style={{ ...chipStyle(filters.sort === value), fontSize: 12.5, minHeight: 38, padding: "6px 11px" }}
          >
            <Icon name={filters.sort === value ? "check" : "trending"} size={13} stroke={2} />
            {label}
          </button>
        ))}
      </div>

      <div
        className="vodda-scroll-rail vodda-fade-edge"
        style={{ display: "flex", gap: 8, overflowX: "auto", marginInline: -spacing.xl, paddingInline: spacing.xl, minHeight: 44 }}
      >
        <button
          type="button"
          className="vodda-tappable"
          onClick={() => setFilters((current) => ({ ...current, availableOnly: !current.availableOnly }))}
          style={{ ...chipStyle(filters.availableOnly), fontSize: 12.5, minHeight: 38, padding: "6px 11px" }}
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
            style={{ ...chipStyle(filters.tier === value), fontSize: 12.5, minHeight: 38, padding: "6px 11px" }}
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
                  <strong style={{ ...typography.bodySmall, color: colors.ink }}>شاید این گزینه‌ها برای شما مناسب باشند</strong>
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
        </>
      )}
    </section>
  );
}
