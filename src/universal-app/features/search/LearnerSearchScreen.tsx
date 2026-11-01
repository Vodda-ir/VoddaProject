"use client";

import { useEffect, useMemo, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Sheet,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { searchTeachers } from "../teachers/api";
import { TeacherCard } from "../teachers/TeacherCard";
import type { Teacher } from "../teachers/types";

type SearchFilters = {
  query: string;
  field: string;
  city: string;
  female: "all" | "female" | "male";
};

type AdvancedDraft = Pick<SearchFilters, "city" | "female">;

const fieldPresets = [
  ["", "همه"],
  ["آموزش قرآن کریم", "آموزش قرآن"],
  ["مداحی اهل‌بیت", "مداحی"],
] as const;

function readInitialFilters(): SearchFilters {
  if (typeof window === "undefined") return { query: "", field: "", city: "", female: "all" };
  const params = new URLSearchParams(window.location.search);
  const femaleParam = params.get("female");
  return {
    query: params.get("q") ?? "",
    field: params.get("field") ?? "",
    city: params.get("city") ?? "",
    female: femaleParam === "true" ? "female" : femaleParam === "false" ? "male" : "all",
  };
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
  };
}

export function LearnerSearchScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const initial = useMemo(readInitialFilters, []);
  const [filters, setFilters] = useState<SearchFilters>(initial);
  const [debouncedQuery, setDebouncedQuery] = useState(initial.query);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [advancedDraft, setAdvancedDraft] = useState<AdvancedDraft>({
    city: initial.city,
    female: initial.female,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(filters.query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [filters.query]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query.trim()) params.set("q", filters.query.trim());
    if (filters.field.trim()) params.set("field", filters.field.trim());
    if (filters.city.trim()) params.set("city", filters.city.trim());
    if (filters.female === "female") params.set("female", "true");
    if (filters.female === "male") params.set("female", "false");
    const next = window.location.pathname + (params.size ? "?" + params.toString() : "");
    window.history.replaceState({}, "", next);
  }, [filters]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    searchTeachers(runtime, {
      query: debouncedQuery,
      field: filters.field,
      city: filters.city,
      female: filters.female === "all" ? undefined : filters.female === "female",
      limit: 50,
      offset: 0,
    })
      .then((rows) => {
        if (active) setTeachers(rows);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setTeachers([]);
        setError(messageOf(reason, "دریافت فهرست استادان با خطا روبه‌رو شد."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [runtime, debouncedQuery, filters.field, filters.city, filters.female, reloadKey]);

  const hasAdvancedFilter = Boolean(filters.city || filters.female !== "all");
  const hasAnyFilter = Boolean(filters.query || filters.field || hasAdvancedFilter);

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
    setFilters({ query: "", field: "", city: "", female: "all" });
  }

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <header className="vodda-enter" style={{ paddingTop: 2 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: colors.ink }}>جستجوی استاد</h1>
        <p style={{ fontSize: 12.5, margin: "5px 0 0", color: colors.inkMuted }}>
          نام، تخصص، شهر و جنسیت استاد را جستجو کنید.
        </p>
      </header>

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

      {hasAdvancedFilter ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {filters.city ? (
            <button
              type="button"
              className="vodda-tappable"
              onClick={() => setFilters((current) => ({ ...current, city: "" }))}
              style={{ ...chipStyle(false), display: "inline-flex", alignItems: "center", gap: 6, background: colors.sand100 }}
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
              style={{ ...chipStyle(false), display: "inline-flex", alignItems: "center", gap: 6, background: colors.sand100 }}
            >
              {filters.female === "female" ? "استاد خانم" : "استاد آقا"}
              <Icon name="x" size={14} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div style={{ height: 2 }} />

      {loading ? <LoadingState label="در حال جستجوی استادان…" /> : null}
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
            {teachers.length.toLocaleString("fa-IR")} استاد یافت شد
          </div>
          {teachers.length === 0 ? (
            <EmptyState
              icon={<Icon name="search" size={30} />}
              title="نتیجه‌ای یافت نشد"
              description="نتیجه‌ای با این فیلترها یافت نشد."
              action={hasAnyFilter ? <Button variant="secondary" onClick={clearAllFilters}>پاک کردن فیلترها</Button> : undefined}
            />
          ) : (
            <div style={{ display: "grid", gap: 14, paddingBottom: spacing.md }}>
              {teachers.map((teacher) => <TeacherCard key={teacher.id} teacher={teacher} config={config} wide />)}
            </div>
          )}
        </>
      ) : null}

      <Sheet open={filtersOpen} title="فیلترهای جستجو" onClose={() => setFiltersOpen(false)}>
        <div style={{ display: "grid", gap: spacing.lg }}>
          <label style={{ display: "grid", gap: 8, ...typography.bodySmall }}>
            <span style={{ fontWeight: 700 }}>شهر</span>
            <div style={{ position: "relative" }}>
              <Icon name="pin" size={18} style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: colors.inkMuted }} />
              <input
                value={advancedDraft.city}
                onChange={(event) => setAdvancedDraft((current) => ({ ...current, city: event.target.value }))}
                placeholder="مثلاً کرمان"
                className="vodda-input"
                style={{
                  width: "100%",
                  minHeight: 50,
                  padding: "10px 42px 10px 14px",
                  border: "1px solid " + colors.sand200,
                  borderRadius: 18,
                  outline: "none",
                  color: colors.ink,
                  background: colors.surface,
                  fontFamily: typography.fontFamily,
                }}
              />
            </div>
          </label>

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
                  onClick={() => setAdvancedDraft((current) => ({ ...current, female: value as SearchFilters["female"] }))}
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
