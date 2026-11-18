"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import {
  Button,
  Card,
  EmptyState,
  Icon,
  IconBadge,
  LoadingState,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { useMinWidth } from "../../ui/useMediaQuery";
import { getCatalog } from "../dispatch/api";
import { TeacherCard } from "../teachers/TeacherCard";
import { getAllTeachersCached } from "../teachers/cached";
import type { Teacher } from "../teachers/types";
import {
  categoryOf,
  groupCatalog,
  teachersForTopics,
  type CatalogCategory,
  type CatalogRow,
} from "@/lib/category";

export type CategoryScreenProps = {
  config: UniversalAppConfig;
};

function chipStyle(active: boolean): CSSProperties {
  return {
    minHeight: 38,
    padding: "7px 14px",
    border: `1px solid ${active ? colors.olive600 : colors.sand200}`,
    borderRadius: radii.pill,
    color: active ? colors.surface : colors.inkSecondary,
    background: active ? colors.olive600 : colors.surface,
    boxShadow: active ? "0 5px 14px rgba(94,110,67,.16)" : shadows.xs,
    fontFamily: typography.fontFamily,
    fontSize: 12.5,
    fontWeight: 800,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap" as const,
  };
}

/**
 * باگ category-routing — صفحهٔ دسته‌بندی موضوعات.
 * کلیک روی کارت «قرآن‌آموزی پایه» از صفحهٔ نخست به اینجا می‌رسد:
 * ① فقط زیردسته‌های همان دسته (مثلاً ۵ زیردستهٔ خودش، نه همهٔ ۴۷ موضوع)
 * ② فقط اساتیدی که حداقل یکی از آن زیردسته‌ها را تدریس می‌کنند
 * ③ دسته‌بندی کامل دوباره تکرار نمی‌شود (دوباره‌کاری ممنوع)
 * با کلیک روی یک زیردسته، فقط اساتید همان زیردسته نمایش داده می‌شود.
 */
export function CategoryScreen({ config }: CategoryScreenProps) {
  const runtime = usePlatform();
  const categoryName = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("name")?.trim() ?? "";
  }, []);

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTopicId, setActiveTopicId] = useState(0);
  /* ۰.۷.۱ — گرید مربعی کارت استاد: ۲ ستون موبایل / ۳ ستون ≥768px */
  const threeCol = useMinWidth(768);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([getCatalog(runtime), getAllTeachersCached(runtime)])
      .then(([rows, teacherRows]) => {
        if (!active) return;
        setCategories(groupCatalog(rows as CatalogRow[]));
        setTeachers(teacherRows.filter((teacher) => teacher.id > 0));
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(messageOf(reason, "دریافت دسته‌بندی موضوعات با خطا روبه‌رو شد."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [runtime, reloadKey]);

  const category = useMemo(() => categoryOf(categories, categoryName), [categories, categoryName]);
  const categoryTeachers = useMemo(
    () => teachersForTopics(teachers, category ? category.topics : []),
    [teachers, category],
  );
  const visibleTeachers = useMemo(() => {
    if (activeTopicId > 0 && category) {
      const topic = category.topics.find((item) => item.id === activeTopicId);
      if (topic) return teachersForTopics(teachers, [topic]);
    }
    return categoryTeachers;
  }, [activeTopicId, category, categoryTeachers, teachers]);

  if (loading && categories.length === 0) {
    return (
      <section style={{ display: "grid", gap: 14 }} aria-label="در حال دریافت دسته‌بندی">
        <LoadingState label="در حال دریافت موضوعات…" />
      </section>
    );
  }

  if (error) {
    return (
      <ErrorCard
        title="دریافت دسته‌بندی ناموفق بود"
        description={error}
        action={<Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>تلاش دوباره</Button>}
      />
    );
  }

  if (!category) {
    return (
      <ErrorCard
        title="دسته‌بندی پیدا نشد"
        description="این دسته در فهرست رسمی خدمات وُدّا موجود نیست؛ از صفحهٔ نخست یکی از دسته‌های فعال را انتخاب کنید."
        action={<Button variant="secondary" onClick={() => navigateApp("/", config)}>بازگشت به صفحهٔ نخست</Button>}
      />
    );
  }

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
      <header className="vodda-enter" style={{ display: "grid", gap: 6, paddingTop: 2 }}>
        <button
          type="button"
          onClick={() => navigateApp("/", config)}
          className="vodda-tappable"
          aria-label="بازگشت به صفحهٔ نخست"
          style={{
            justifySelf: "start",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 0",
            border: 0,
            background: "transparent",
            color: colors.olive700,
            fontFamily: typography.fontFamily,
            fontSize: 12.5,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          <span aria-hidden="true" style={{ display: "inline-flex", transform: "scaleX(-1)" }}>
            <Icon name="chevronL" size={15} />
          </span>
          صفحهٔ نخست
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <IconBadge icon="quran" tone="olive" size={46} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0, color: colors.ink }}>{category.category}</h1>
            <span style={{ fontSize: 12.5, color: colors.inkMuted }}>
              {category.topics.length} زیردسته · {categoryTeachers.length} استاد در این دسته
            </span>
          </div>
        </div>
      </header>

      {/* زیردسته‌های همین دسته — نه کل دسته‌بندی‌ها */}
      <div
        className="vodda-scroll-rail vodda-enter"
        aria-label="زیردسته‌های این دسته"
        style={{ display: "flex", gap: 8, overflowX: "auto", marginInline: -spacing.xl, paddingInline: spacing.xl, minHeight: 42 }}
      >
        <button
          type="button"
          className="vodda-tappable"
          onClick={() => setActiveTopicId(0)}
          style={chipStyle(activeTopicId === 0)}
        >
          همهٔ زیردسته‌ها
        </button>
        {category.topics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            className="vodda-tappable"
            onClick={() => setActiveTopicId(topic.id === activeTopicId ? 0 : topic.id)}
            style={chipStyle(topic.id === activeTopicId)}
          >
            {topic.title}
          </button>
        ))}
      </div>

      <div style={{ ...typography.bodySmall, color: colors.inkMuted }}>
        {activeTopicId > 0 && category
          ? `فقط اساتیدِ «${category.topics.find((topic) => topic.id === activeTopicId)?.title ?? ""}»`
          : "اساتیدی که حداقل یکی از زیردسته‌های این دسته را تدریس می‌کنند"}
        {" · "}
        {visibleTeachers.length} استاد
      </div>

      {visibleTeachers.length === 0 ? (
        <EmptyState
          icon={<Icon name="users" size={30} />}
          title="استادی برای این انتخاب پیدا نشد"
          description={activeTopicId > 0 ? "زیردستهٔ دیگری از همین دسته را انتخاب کنید." : "به‌زودی اساتید این دسته اضافه می‌شوند."}
          action={activeTopicId > 0 ? <Button variant="secondary" onClick={() => setActiveTopicId(0)}>نمایش همهٔ زیردسته‌ها</Button> : undefined}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: threeCol ? "repeat(3, minmax(0,1fr))" : "repeat(2, minmax(0,1fr))",
            gap: 10,
            minWidth: 0,
          }}
        >
          {visibleTeachers.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} config={config} />
          ))}
        </div>
      )}
    </section>
  );
}

function ErrorCard({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <Card elevated style={{ display: "grid", gap: spacing.md, textAlign: "center", padding: spacing.huge }}>
      <IconBadge icon="info" tone="clay" size={52} />
      <strong style={{ ...typography.title, color: colors.ink }}>{title}</strong>
      <span style={{ ...typography.caption, color: colors.inkMuted }}>{description}</span>
      {action}
    </Card>
  );
}
