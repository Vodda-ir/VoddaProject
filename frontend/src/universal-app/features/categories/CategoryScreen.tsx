"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  spacing,
  typography,
} from "../../ui";
import { localizedDigits } from "../../ui/persian";
import { neonCellActiveBackground, neonDivider } from "../../ui/neon";
import { messageOf } from "../../ui/errorMessage";
import { useMinWidth } from "../../ui/useMediaQuery";
import { useL } from "../../ui/appearance";
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
  const L = useL();
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

  /* ۰.۸.۰ — سلول‌های شبکهٔ نئونی زیردسته‌ها: «همه» + تک‌تک زیردسته‌ها با شمار استادِ همان زیردسته */
  const topicCells = useMemo(() => {
    if (!category) return [];
    return [
      { id: 0, title: "همهٔ زیردسته‌ها", count: categoryTeachers.length },
      ...category.topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        count: teachersForTopics(teachers, [topic]).length,
      })),
    ];
  }, [category, categoryTeachers, teachers]);

  if (loading && categories.length === 0) {
    return (
      <section style={{ display: "grid", gap: 14 }} aria-label={L("در حال دریافت دسته‌بندی")}>
        <LoadingState label={L("در حال دریافت موضوعات…")} />
      </section>
    );
  }

  if (error) {
    return (
      <ErrorCard
        title={L("دریافت دسته‌بندی ناموفق بود")}
        description={error}
        action={<Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>{L("تلاش دوباره")}</Button>}
      />
    );
  }

  if (!category) {
    return (
      <ErrorCard
        title={L("دسته‌بندی پیدا نشد")}
        description={L("این دسته در فهرست رسمی خدمات وُدّا موجود نیست؛ از صفحهٔ نخست یکی از دسته‌های فعال را انتخاب کنید.")}
        action={<Button variant="secondary" onClick={() => navigateApp("/", config)}>{L("بازگشت به صفحهٔ نخست")}</Button>}
      />
    );
  }

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
      {/* ۰.۸.۰ — هدر نئونی دسته — هم‌خانوادهٔ کادر موضوعات صفحهٔ نخست */}
      <header
        className="vodda-neon-gold vodda-enter"
        style={{
          borderRadius: 22,
          background: colors.surface,
          padding: "14px 16px",
          display: "grid",
          gap: 10,
          minWidth: 0,
        }}
      >
        <button
          type="button"
          onClick={() => navigateApp("/", config)}
          className="vodda-tappable"
          aria-label={L("بازگشت به صفحهٔ نخست")}
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
          {L("صفحهٔ نخست")}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <IconBadge icon="quran" tone="gold" size={46} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0, color: colors.ink }}>{category.category}</h1>
            <span style={{ fontSize: 12.5, color: colors.inkMuted }}>
              {localizedDigits(category.topics.length, "fa")} {L("زیردسته")} · {localizedDigits(categoryTeachers.length, "fa")} {L("استاد در این دسته")}
            </span>
          </div>
        </div>
      </header>

      {/* ۰.۸.۰ — شبکهٔ نئونی زیردسته‌ها — همان زبان کادر نخست؛ خطوط افقی/عمودی نئونی میان سلول‌ها.
       * کلیک روی هر زیردسته، فهرست اساتید را به همان زیردسته محدود می‌کند. */}
      <div
        className="vodda-neon-gold vodda-enter"
        aria-label={L("زیردسته‌های این دسته")}
        style={{
          display: "grid",
          gridTemplateColumns: threeCol ? "repeat(3, minmax(0,1fr))" : "repeat(2, minmax(0,1fr))",
          borderRadius: 22,
          background: colors.surface,
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {topicCells.map((cell, index) => {
          const columns = threeCol ? 3 : 2;
          const column = index % columns;
          const row = Math.floor(index / columns);
          const rowCount = Math.ceil(topicCells.length / columns);
          /* خط نئونی عمودی میان ستون‌ها + افقی میان ردیف‌ها — فقط میان سلول‌های همسایه */
          const showVertical = column < columns - 1 && index + 1 < topicCells.length;
          const showHorizontal = row < rowCount - 1;
          const active = activeTopicId === cell.id;
          return (
            <button
              key={cell.id}
              type="button"
              className="vodda-tappable"
              onClick={() => setActiveTopicId(cell.id === 0 || cell.id === activeTopicId ? 0 : cell.id)}
              aria-pressed={active}
              aria-label={`${L(cell.title)} — ${localizedDigits(cell.count, "fa")} ${L("استاد")}`}
              style={{
                position: "relative",
                display: "grid",
                alignContent: "center",
                justifyItems: "center",
                gap: 8,
                minHeight: 96,
                padding: "14px 12px",
                textAlign: "center",
                border: 0,
                background: active ? neonCellActiveBackground : "transparent",
                cursor: "pointer",
                fontFamily: typography.fontFamily,
                minWidth: 0,
                animation: "vodda-enter .32s ease-out both",
                animationDelay: `${index * 35}ms`,
              }}
            >
              {showVertical ? <span aria-hidden="true" style={neonDivider(true)} /> : null}
              {showHorizontal ? <span aria-hidden="true" style={neonDivider(false)} /> : null}

              <span
                aria-hidden="true"
                style={{
                  position: "relative",
                  width: 40,
                  height: 40,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 12,
                  background: "linear-gradient(140deg, #f2f5ea, #f7f0dc)",
                  border: `1px solid ${colors.goldSoft}`,
                  boxShadow: "0 0 8px rgba(191,149,64,.18)",
                }}
              >
                <Icon name="quran" size={20} style={{ color: colors.olive600 }} />
              </span>

              <strong
                style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: active ? colors.olive600 : colors.ink,
                  lineHeight: 1.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  overflowWrap: "anywhere",
                }}
              >
                {L(cell.title)}
              </strong>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2.5px 10px",
                  borderRadius: 999,
                  background: colors.olive50,
                  border: `1px solid ${colors.olive100}`,
                  color: colors.olive600,
                  fontSize: 10.5,
                  fontWeight: 800,
                  whiteSpace: "nowrap" as const,
                }}
              >
                <Icon name="users" size={11} stroke={2.2} />
                {localizedDigits(cell.count, "fa")} {L("استاد")}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ ...typography.bodySmall, color: colors.inkMuted }}>
        {activeTopicId > 0 && category
          ? `${L("فقط اساتیدِ «")}${L(category.topics.find((topic) => topic.id === activeTopicId)?.title ?? "")}${L("» — کارت هر استاد را بزنید تا جلسهٔ آنلاین رزرو کنید")}`
          : L("اساتیدی که حداقل یکی از زیردسته‌های این دسته را تدریس می‌کنند — کارت هر استاد را بزنید تا جلسهٔ آنلاین رزرو کنید")}
        {" · "}
        {visibleTeachers.length} {L("استاد")}
      </div>

      {visibleTeachers.length === 0 ? (
        <EmptyState
          icon={<Icon name="users" size={30} />}
          title={L("استادی برای این انتخاب پیدا نشد")}
          description={activeTopicId > 0 ? L("زیردستهٔ دیگری از همین دسته را انتخاب کنید.") : L("به‌زودی اساتید این دسته اضافه می‌شوند.")}
          action={activeTopicId > 0 ? <Button variant="secondary" onClick={() => setActiveTopicId(0)}>{L("نمایش همهٔ زیردسته‌ها")}</Button> : undefined}
        />
      ) : (
        /* ۰.۸.۰ — قاب هم‌خانوادهٔ نئونی دور شبکهٔ اساتید همین دسته */
        <div
          style={{
            borderRadius: 22,
            border: `1.2px solid ${colors.goldSoft}`,
            background: `linear-gradient(180deg, ${colors.surface}, ${colors.surfaceWarm})`,
            padding: 12,
            boxShadow: "0 6px 20px rgba(46,54,34,.06), 0 0 12px rgba(191,149,64,.10)",
          }}
        >
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
