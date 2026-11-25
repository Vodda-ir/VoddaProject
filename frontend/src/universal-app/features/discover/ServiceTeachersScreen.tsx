"use client";

import { useEffect, useMemo, useState } from "react";
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
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { useMinWidth } from "../../ui/useMediaQuery";
import { useL } from "../../ui/appearance";
import { readStoredCity, storedCityUsable } from "@/lib/userCity";
import { getCatalog } from "../dispatch/api";
import { TeacherCard } from "../teachers/TeacherCard";
import { getAllTeachersCached } from "../teachers/cached";
import type { Teacher } from "../teachers/types";
import { groupCatalog, teachersForTopics, type CatalogRow } from "@/lib/category";

export type ServiceTeachersScreenProps = {
  serviceId: string;
  config: UniversalAppConfig;
};

/**
 * ۱.ب.۶ — صفحهٔ «اساتید یک خدمت» در اپ: کلیک روی کارت «خدمات پرکاربرد» از
 * صفحهٔ نخست به این‌جا می‌رسد و فقط استادانی که دقیقاً همان خدمت رسمی را
 * تدریس می‌کنند نمایش داده می‌شوند (هم‌شهری فقط اولویت دارد، نه محدودیت).
 */
export function ServiceTeachersScreen({ serviceId, config }: ServiceTeachersScreenProps) {
  const runtime = usePlatform();
  const L = useL();
  const parsedId = Number.parseInt(serviceId, 10);

  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [serviceTitle, setServiceTitle] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  /* ۰.۷.۱ — گرید مربعی کارت استاد: ۲ ستون موبایل / ۳ ستون ≥768px */
  const threeCol = useMinWidth(768);

  /* ۱.ب.۱ — شهر فعلی برای اولویت هم‌شهری */
  useEffect(() => {
    const stored = readStoredCity();
    if (storedCityUsable(stored) && stored) setCity(stored.name);
  }, []);

  useEffect(() => {
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setError("شناسه خدمت نامعتبر است.");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([getCatalog(runtime), getAllTeachersCached(runtime)])
      .then(([rows, teacherRows]) => {
        if (!active) return;
        const groups = groupCatalog(rows as CatalogRow[]);
        let title = "";
        let category = "";
        let topics: Array<{ id: number; title: string }> = [];
        for (const group of groups) {
          const hit = group.topics.find((topic) => topic.id === parsedId);
          if (hit) {
            title = hit.title;
            category = group.category;
            topics = [hit];
            break;
          }
        }
        if (!title) {
          setError("این خدمت در فهرست رسمی وُدّا موجود نیست.");
          return;
        }
        setServiceTitle(title);
        setServiceCategory(category);
        setTeachers(teachersForTopics(teacherRows, topics));
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(messageOf(reason, "دریافت اساتید خدمت با خطا روبه‌رو شد."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [runtime, parsedId, reloadKey]);

  /* اولویت هم‌شهری: درجه ۱ نخست، سپس هم‌شهری (مرتب‌سازی پایدار) */
  const visible = useMemo(() => {
    const cityKey = city.trim();
    if (!cityKey) return teachers;
    return [...teachers].sort((left, right) => {
      const tier1 = Number(right.isTier1 === true) - Number(left.isTier1 === true);
      if (tier1 !== 0) return tier1;
      return Number(right.city.trim() === cityKey) - Number(left.city.trim() === cityKey);
    });
  }, [teachers, city]);

  if (loading && !serviceTitle) {
    return <LoadingState label={L("در حال دریافت اساتید خدمت…")} />;
  }

  if (error) {
    return (
      <Card elevated style={{ display: "grid", gap: spacing.md, textAlign: "center", padding: spacing.huge }}>
        <IconBadge icon="info" tone="clay" size={52} />
        <strong style={{ ...typography.title, color: colors.ink }}>{L("دریافت خدمت ناموفق بود")}</strong>
        <span style={{ ...typography.caption, color: colors.inkMuted }}>{L(error)}</span>
        <Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>{L("تلاش دوباره")}</Button>
      </Card>
    );
  }

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
      <header className="vodda-enter" style={{ display: "grid", gap: 6, paddingTop: 2 }}>
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
          <IconBadge icon="book" tone="olive" size={46} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {L("اساتید")}«{L(serviceTitle)}»
            </h1>
            <span style={{ fontSize: 12.5, color: colors.inkMuted }}>
              {serviceCategory ? `${L(serviceCategory)} · ` : ""}{L("فقط اساتید همین خدمت رسمی")}
            </span>
          </div>
        </div>
        <span style={{ ...typography.caption, color: colors.inkMuted }}>
          {city.trim() ? `${L("اساتید")} ${L(city.trim())}${L(" در ابتدای فهرست اولویت دارند · ")}` : ""}
          {visible.length} {L("استاد")}
        </span>
      </header>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Icon name="users" size={30} />}
          title={L("هنوز استادی برای این خدمت منتشر نشده")}
          description={L("به‌زودی اساتید این خدمت در همین صفحه دیده می‌شوند.")}
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
          {visible.map((teacher) => (
            <TeacherCard key={teacher.id} teacher={teacher} config={config} />
          ))}
        </div>
      )}
    </section>
  );
}
