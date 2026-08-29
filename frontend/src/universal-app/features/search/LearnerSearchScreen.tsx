"use client";

import { useEffect, useMemo, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { searchTeachers } from "../teachers/api";
import type { Teacher } from "../teachers/types";
import { Card, EmptyState, ErrorState, LoadingState, colors, spacing, typography } from "../../ui";

type SearchFilters = {
  query: string;
  field: string;
  city: string;
  female: "all" | "female" | "male";
};

function readInitialFilters(): SearchFilters {
  if (typeof window === "undefined") {
    return { query: "", field: "", city: "", female: "all" };
  }
  const params = new URLSearchParams(window.location.search);
  const femaleParam = params.get("female");
  return {
    query: params.get("q") ?? "",
    field: params.get("field") ?? "",
    city: params.get("city") ?? "",
    female: femaleParam === "true" ? "female" : femaleParam === "false" ? "male" : "all",
  };
}

function TeacherResultCard({ teacher, config }: { teacher: Teacher; config: UniversalAppConfig }) {
  return (
    <Card>
      <button
        type="button"
        onClick={() => navigateApp(`/teacher/${teacher.id}`, config)}
        style={{ width: "100%", textAlign: "right", border: 0, background: "transparent", padding: 0, cursor: "pointer" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: spacing.md, alignItems: "flex-start" }}>
          <div>
            <h3 style={{ ...typography.title, margin: 0, color: colors.ink }}>{teacher.name}</h3>
            <p style={{ ...typography.body, margin: "4px 0 0", color: colors.inkSecondary }}>
              {[teacher.field, teacher.city].filter(Boolean).join(" · ") || "استاد وُدّا"}
            </p>
          </div>
          {teacher.rating > 0 ? (
            <span style={{ ...typography.caption, color: colors.inkSecondary }}>★ {teacher.rating.toFixed(1)}</span>
          ) : null}
        </div>
        {teacher.bio ? (
          <p style={{ ...typography.caption, margin: "10px 0 0", color: colors.inkMuted, lineHeight: 1.9 }}>{teacher.bio}</p>
        ) : null}
      </button>
    </Card>
  );
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
    if (typeof window !== "undefined") {
      const next = `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`;
      window.history.replaceState({}, "", next);
    }
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
        setError(reason instanceof Error ? reason.message : "دریافت فهرست استادان با خطا روبه‌رو شد.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [runtime, debouncedQuery, filters.field, filters.city, filters.female, reloadKey]);

  return (
    <section style={{ display: "grid", gap: spacing.md }}>
      <Card>
        <div style={{ display: "grid", gap: spacing.sm }}>
          <label>
            <span style={{ ...typography.caption, color: colors.inkSecondary }}>نام یا عبارت جستجو</span>
            <input
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="مثلاً تجوید یا نام استاد"
              style={{ width: "100%", marginTop: 6, padding: 12, borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.ink }}
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: spacing.sm }}>
            <label>
              <span style={{ ...typography.caption, color: colors.inkSecondary }}>حوزه</span>
              <input
                value={filters.field}
                onChange={(event) => setFilters((current) => ({ ...current, field: event.target.value }))}
                placeholder="قرآن، مداحی..."
                style={{ width: "100%", marginTop: 6, padding: 12, borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.ink }}
              />
            </label>
            <label>
              <span style={{ ...typography.caption, color: colors.inkSecondary }}>شهر</span>
              <input
                value={filters.city}
                onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}
                placeholder="نام شهر"
                style={{ width: "100%", marginTop: 6, padding: 12, borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.ink }}
              />
            </label>
          </div>
          <label>
            <span style={{ ...typography.caption, color: colors.inkSecondary }}>جنسیت استاد</span>
            <select
              value={filters.female}
              onChange={(event) => setFilters((current) => ({ ...current, female: event.target.value as SearchFilters["female"] }))}
              style={{ width: "100%", marginTop: 6, padding: 12, borderRadius: 12, border: `1px solid ${colors.border}`, background: colors.surface, color: colors.ink }}
            >
              <option value="all">همه</option>
              <option value="female">بانو</option>
              <option value="male">آقا</option>
            </select>
          </label>
        </div>
      </Card>

      {loading ? <LoadingState>در حال جستجوی استادان...</LoadingState> : null}
      {!loading && error ? <ErrorState actionLabel="تلاش دوباره" onAction={() => setReloadKey((value) => value + 1)}>{error}</ErrorState> : null}
      {!loading && !error && teachers.length === 0 ? <EmptyState>استادی با این فیلترها پیدا نشد.</EmptyState> : null}
      {!loading && !error ? teachers.map((teacher) => <TeacherResultCard key={teacher.id} teacher={teacher} config={config} />) : null}
    </section>
  );
}
