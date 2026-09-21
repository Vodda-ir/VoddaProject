"use client";

import { useEffect, useMemo, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  SectionHeader,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { searchTeachers } from "../teachers/api";
import type { Teacher } from "../teachers/types";

type SearchFilters = {
  query: string;
  field: string;
  city: string;
  female: "all" | "female" | "male";
};

const fieldPresets = ["", "قرآن کریم", "مداحی اهل‌بیت"] as const;

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

function fieldLabel(field: string) {
  if (!field) return "همه";
  if (field === "قرآن کریم") return "آموزش قرآن";
  if (field === "مداحی اهل‌بیت") return "مداحی";
  return field;
}

function chipStyle(active: boolean) {
  return {
    minHeight: 36,
    padding: "7px 13px",
    border: active ? "1px solid " + colors.olive600 : "1px solid " + colors.sand200,
    borderRadius: radii.pill,
    color: active ? colors.surface : colors.inkSecondary,
    background: active ? colors.olive600 : colors.surface,
    boxShadow: active ? "0 5px 14px rgba(94,110,67,.18)" : shadows.xs,
    fontFamily: typography.fontFamily,
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  } as const;
}

function TeacherResultCard({ teacher, config }: { teacher: Teacher; config: UniversalAppConfig }) {
  const subtitle = [teacher.tag || teacher.field, teacher.city].filter(Boolean).join(" · ");
  return (
    <button
      type="button"
      onClick={() => navigateApp("/teacher/" + teacher.id, config)}
      className="vodda-card vodda-card--interactive vodda-tappable vodda-enter"
      style={{
        width: "100%",
        display: "grid",
        gap: spacing.md,
        padding: spacing.lg,
        textAlign: "right",
        border: "1px solid " + colors.sand150,
        borderRadius: radii.lg,
        color: colors.ink,
        background: colors.surface,
        boxShadow: shadows.sm,
        cursor: "pointer",
        fontFamily: typography.fontFamily,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
        <Avatar name={teacher.name} size={58} ring />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <h3
              style={{
                ...typography.title,
                minWidth: 0,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: colors.ink,
              }}
            >
              {teacher.name}
            </h3>
            {teacher.verified ? <Icon name="checkCircle" size={15} stroke={2} style={{ color: colors.olive600 }} /> : null}
          </div>
          <p style={{ ...typography.bodySmall, margin: "3px 0 0", color: colors.inkMuted }}>
            {subtitle || "استاد وُدّا"}
          </p>
        </div>
        {teacher.rating > 0 ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "6px 8px",
              borderRadius: radii.pill,
              color: colors.goldDark,
              background: colors.goldBackground,
              ...typography.caption,
              fontWeight: 900,
            }}
          >
            <Icon name="star" size={13} fill style={{ color: colors.gold }} />
            {teacher.rating.toFixed(1)}
          </span>
        ) : null}
      </div>

      {teacher.bio ? (
        <p
          style={{
            ...typography.caption,
            display: "-webkit-box",
            overflow: "hidden",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            margin: 0,
            color: colors.inkSecondary,
            lineHeight: 1.9,
          }}
        >
          {teacher.bio}
        </p>
      ) : null}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}>
          {teacher.services.length > 0 ? (
            <span style={{ ...typography.caption, padding: "5px 8px", borderRadius: radii.pill, color: colors.olive700, background: colors.olive50 }}>
              {teacher.services.length.toLocaleString("fa-IR")} خدمت
            </span>
          ) : null}
          {teacher.sessions > 0 ? (
            <span style={{ ...typography.caption, padding: "5px 8px", borderRadius: radii.pill, color: colors.inkMuted, background: colors.sand100 }}>
              {teacher.sessions.toLocaleString("fa-IR")} جلسه
            </span>
          ) : null}
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: colors.olive700, ...typography.caption, fontWeight: 800 }}>
          مشاهده
          <Icon name="chevronL" size={14} stroke={2} />
        </span>
      </div>
    </button>
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

  const hasFilters = Boolean(filters.query || filters.field || filters.city || filters.female !== "all");

  function clearFilters() {
    setFilters({ query: "", field: "", city: "", female: "all" });
  }

  return (
    <section style={{ display: "grid", gap: spacing.xl }}>
      <div className="vodda-enter" style={{ display: "grid", gap: spacing.md }}>
        <div style={{ position: "relative" }}>
          <Icon
            name="search"
            size={20}
            stroke={1.9}
            style={{ position: "absolute", zIndex: 1, insetInlineStart: 16, top: "50%", transform: "translateY(-50%)", color: colors.inkMuted }}
          />
          <input
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="نام استاد، مهارت یا عبارت جستجو"
            className="vodda-input"
            style={{
              width: "100%",
              minHeight: 54,
              padding: "12px 46px 12px 16px",
              border: "1px solid " + colors.sand200,
              borderRadius: radii.lg,
              outline: "none",
              color: colors.ink,
              background: colors.surface,
              boxShadow: shadows.sm,
              fontFamily: typography.fontFamily,
              ...typography.body,
            }}
          />
        </div>

        <div className="vodda-scroll-rail" style={{ display: "flex", gap: spacing.sm, overflowX: "auto", paddingBottom: 2 }}>
          {fieldPresets.map((field) => (
            <button
              key={field || "all"}
              type="button"
              className="vodda-tappable"
              onClick={() => setFilters((current) => ({ ...current, field }))}
              style={chipStyle(filters.field === field)}
            >
              {fieldLabel(field)}
            </button>
          ))}
        </div>

        <Card style={{ padding: spacing.md, borderRadius: radii.lg }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: spacing.sm, alignItems: "end" }}>
            <label style={{ display: "grid", gap: 5 }}>
              <span style={{ ...typography.caption, color: colors.inkMuted, fontWeight: 700 }}>شهر</span>
              <div style={{ position: "relative" }}>
                <Icon
                  name="pin"
                  size={17}
                  style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: colors.inkMuted }}
                />
                <input
                  value={filters.city}
                  onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}
                  placeholder="مثلاً کرمان"
                  className="vodda-input"
                  style={{
                    width: "100%",
                    minHeight: 44,
                    padding: "8px 38px 8px 12px",
                    border: "1px solid " + colors.sand200,
                    borderRadius: radii.md,
                    outline: "none",
                    color: colors.ink,
                    background: colors.surfaceWarm,
                    fontFamily: typography.fontFamily,
                  }}
                />
              </div>
            </label>
            {hasFilters ? (
              <Button variant="ghost" onClick={clearFilters} style={{ minHeight: 44, paddingInline: spacing.md }}>
                پاک کردن
              </Button>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: spacing.sm, marginTop: spacing.md }}>
            {[
              ["all", "همه"],
              ["female", "بانو"],
              ["male", "آقا"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="vodda-tappable"
                onClick={() => setFilters((current) => ({ ...current, female: value as SearchFilters["female"] }))}
                style={chipStyle(filters.female === value)}
              >
                {label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <SectionHeader
        title={loading ? "در حال جستجو…" : teachers.length.toLocaleString("fa-IR") + " استاد"}
        description="فقط پروفایل‌های منتشرشده و قابل جستجو نمایش داده می‌شوند"
      />

      {loading ? <LoadingState label="در حال جستجوی استادان…" /> : null}
      {!loading && error ? (
        <ErrorState
          title="خطا در جستجو"
          description={error}
          action={<Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>تلاش دوباره</Button>}
        />
      ) : null}
      {!loading && !error && teachers.length === 0 ? (
        <EmptyState
          icon={<Icon name="search" size={30} />}
          title="استادی پیدا نشد"
          description="عبارت جستجو یا فیلترها را تغییر بده."
          action={hasFilters ? <Button variant="secondary" onClick={clearFilters}>حذف فیلترها</Button> : undefined}
        />
      ) : null}
      {!loading && !error && teachers.length > 0 ? (
        <div style={{ display: "grid", gap: spacing.md }}>
          {teachers.map((teacher) => <TeacherResultCard key={teacher.id} teacher={teacher} config={config} />)}
        </div>
      ) : null}
    </section>
  );
}
