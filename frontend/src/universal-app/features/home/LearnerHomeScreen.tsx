"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp } from "../../router";
import { searchTeachers } from "../teachers/api";
import type { Teacher } from "../teachers/types";
import { Avatar, Button, Card, colors, radii, spacing, typography } from "../../ui";

export type LearnerHomeScreenProps = {
  config: UniversalAppConfig;
};

const quickCategories = [
  {
    id: "quran",
    title: "قرآن",
    description: "تلاوت، تجوید و آموزش قرآن",
  },
  {
    id: "maddahi",
    title: "مداحی",
    description: "آموزش مداحی و فن بیان",
  },
] as const;

function searchUrl(query: string, category?: string) {
  const params = new URLSearchParams();
  const normalizedQuery = query.trim();
  if (normalizedQuery) params.set("q", normalizedQuery);
  if (category) params.set("category", category);
  const suffix = params.toString();
  return suffix ? `/search?${suffix}` : "/search";
}

function teacherSubtitle(teacher: Teacher) {
  return [teacher.tag || teacher.field, teacher.city].filter(Boolean).join(" · ");
}

function TeacherCard({ teacher, config }: { teacher: Teacher; config: UniversalAppConfig }) {
  return (
    <button
      type="button"
      onClick={() => navigateApp(`/teacher/${teacher.id}`, config)}
      style={{
        width: 176,
        flex: "0 0 176px",
        display: "grid",
        gap: spacing.sm,
        padding: spacing.md,
        textAlign: "right",
        color: colors.ink,
        background: colors.surface,
        border: `1px solid ${colors.sand200}`,
        borderRadius: radii.md,
        cursor: "pointer",
        fontFamily: typography.fontFamily,
      }}
    >
      <Avatar name={teacher.name} size={48} />
      <div style={{ minWidth: 0 }}>
        <strong
          style={{
            ...typography.body,
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: colors.ink,
          }}
        >
          {teacher.name}
        </strong>
        <span
          style={{
            ...typography.caption,
            display: "block",
            minHeight: 36,
            marginTop: spacing.xs,
            color: colors.inkSecondary,
          }}
        >
          {teacherSubtitle(teacher) || "استاد تأییدشده وُدّا"}
        </span>
      </div>
      <span style={{ ...typography.caption, color: colors.olive800, fontWeight: 700 }}>
        {teacher.rating > 0 ? `امتیاز ${teacher.rating.toFixed(1)}` : "مشاهده پروفایل"}
      </span>
    </button>
  );
}

function TeacherRail({
  title,
  teachers,
  config,
}: {
  title: string;
  teachers: Teacher[];
  config: UniversalAppConfig;
}) {
  if (teachers.length === 0) return null;

  return (
    <section aria-label={title}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
        <h2 style={{ ...typography.title, margin: 0, color: colors.ink }}>{title}</h2>
        <Button variant="ghost" onClick={() => navigateApp("/search", config)} style={{ paddingInline: spacing.sm }}>
          مشاهده همه
        </Button>
      </div>
      <div
        style={{
          display: "flex",
          gap: spacing.md,
          overflowX: "auto",
          paddingBlock: spacing.md,
          scrollSnapType: "x proximity",
        }}
      >
        {teachers.map((teacher) => (
          <div key={teacher.id} style={{ scrollSnapAlign: "start" }}>
            <TeacherCard teacher={teacher} config={config} />
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedTeacher({ teacher, config }: { teacher: Teacher; config: UniversalAppConfig }) {
  return (
    <button
      type="button"
      onClick={() => navigateApp(`/teacher/${teacher.id}`, config)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: spacing.lg,
        padding: spacing.xl,
        textAlign: "right",
        color: colors.surface,
        background: `linear-gradient(145deg, ${colors.olive800}, ${colors.olive900})`,
        border: 0,
        borderRadius: radii.lg,
        cursor: "pointer",
        fontFamily: typography.fontFamily,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 76,
          height: 92,
          flex: "0 0 76px",
          display: "grid",
          placeItems: "center",
          borderRadius: radii.md,
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.16)",
          fontSize: 34,
        }}
      >
        {teacher.field.includes("مداح") ? "🎤" : "📖"}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ ...typography.caption, margin: 0, color: colors.goldSoft, fontWeight: 700 }}>پروفایل تأییدشده</p>
        <h2 style={{ ...typography.title, margin: `${spacing.sm}px 0 0`, color: colors.surface }}>{teacher.name}</h2>
        <p style={{ ...typography.bodySmall, margin: `${spacing.xs}px 0 0`, color: "rgba(255,255,255,0.72)" }}>
          {teacherSubtitle(teacher) || "مشاهده خدمات و زمان‌های قابل رزرو"}
        </p>
        <p style={{ ...typography.caption, margin: `${spacing.md}px 0 0`, color: colors.surface, fontWeight: 700 }}>
          مشاهده خدمات و رزرو زمان
        </p>
      </div>
    </button>
  );
}

export function LearnerHomeScreen({ config }: LearnerHomeScreenProps) {
  const runtime = usePlatform();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [query, setQuery] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    runtime
      .restoreSession()
      .then((sessionUser) => {
        if (active) setUser(sessionUser);
      })
      .catch(() => {
        if (active) setUser(null);
      });
    return () => {
      active = false;
    };
  }, [runtime]);

  useEffect(() => {
    let active = true;
    setTeachersLoading(true);
    setTeachersError(null);
    searchTeachers(runtime, { limit: 50 })
      .then((items) => {
        if (active) setTeachers(items);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setTeachers([]);
        setTeachersError(error instanceof Error ? error.message : "دریافت استادان ناموفق بود.");
      })
      .finally(() => {
        if (active) setTeachersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [runtime]);

  const women = useMemo(() => teachers.filter((teacher) => teacher.female), [teachers]);
  const men = useMemo(() => teachers.filter((teacher) => !teacher.female), [teachers]);
  const recommended = men.length > 0 ? men : teachers;
  const featured = teachers[0] ?? null;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigateApp(searchUrl(query), config);
  }

  return (
    <div style={{ display: "grid", gap: spacing.xl }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>خوش آمدی</p>
          <h1
            style={{
              ...typography.heading,
              margin: `${spacing.xs}px 0 0`,
              color: colors.ink,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user?.name?.trim() || "قرآن‌آموز وُدّا"}
          </h1>
          {user?.city ? (
            <p style={{ ...typography.bodySmall, margin: `${spacing.xs}px 0 0`, color: colors.inkSecondary }}>
              {user.city}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="رفتن به پروفایل"
          onClick={() => navigateApp("/profile", config)}
          style={{ padding: 0, border: 0, background: "transparent", cursor: "pointer", flex: "0 0 auto" }}
        >
          <Avatar name={user?.name} src={user?.avatar_url} size={52} />
        </button>
      </header>

      <Card
        elevated
        style={{
          display: "grid",
          gap: spacing.lg,
          padding: spacing.xl,
          background: `linear-gradient(145deg, ${colors.olive50}, ${colors.surface})`,
          borderColor: colors.olive200,
        }}
      >
        <div>
          <p style={{ ...typography.caption, margin: 0, color: colors.olive800, fontWeight: 700 }}>استاد مناسب خودت را پیدا کن</p>
          <h2 style={{ ...typography.title, margin: `${spacing.sm}px 0 0`, color: colors.ink }}>
            برای چه مهارتی دنبال استاد هستی؟
          </h2>
          <p style={{ ...typography.bodySmall, margin: `${spacing.sm}px 0 0`, color: colors.inkSecondary }}>
            نام استاد، حوزه آموزشی یا شهر را جستجو کن.
          </p>
        </div>
        <form onSubmit={submitSearch} style={{ display: "flex", gap: spacing.sm, alignItems: "stretch" }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="مثلاً تجوید، مداحی یا کرمان"
            aria-label="جستجوی استاد"
            style={{
              ...typography.body,
              minWidth: 0,
              flex: 1,
              minHeight: 46,
              padding: `9px ${spacing.md}px`,
              color: colors.ink,
              background: colors.surface,
              border: `1px solid ${colors.sand200}`,
              borderRadius: radii.sm,
              outline: "none",
              fontFamily: typography.fontFamily,
            }}
          />
          <Button type="submit" style={{ flex: "0 0 auto" }}>
            جستجو
          </Button>
        </form>
      </Card>

      <section aria-labelledby="quick-categories-title">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          <div>
            <h2 id="quick-categories-title" style={{ ...typography.title, margin: 0, color: colors.ink }}>
              دسته‌های سریع
            </h2>
            <p style={{ ...typography.bodySmall, margin: `${spacing.xs}px 0 0`, color: colors.inkMuted }}>
              مستقیم وارد جستجوی تخصصی شو
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigateApp("/search", config)} style={{ paddingInline: spacing.sm }}>
            همه استادها
          </Button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: spacing.md,
            marginTop: spacing.md,
          }}
        >
          {quickCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => navigateApp(searchUrl("", category.id), config)}
              style={{
                display: "grid",
                gap: spacing.sm,
                minHeight: 112,
                padding: spacing.lg,
                textAlign: "right",
                color: colors.ink,
                background: colors.surface,
                border: `1px solid ${colors.sand200}`,
                borderRadius: radii.md,
                cursor: "pointer",
                fontFamily: typography.fontFamily,
              }}
            >
              <strong style={{ ...typography.body, color: colors.olive800 }}>{category.title}</strong>
              <span style={{ ...typography.caption, color: colors.inkSecondary }}>{category.description}</span>
            </button>
          ))}
        </div>
      </section>

      {teachersLoading ? (
        <Card style={{ padding: spacing.xl, textAlign: "center" }}>
          <p style={{ ...typography.bodySmall, margin: 0, color: colors.inkMuted }}>در حال دریافت استادان تأییدشده…</p>
        </Card>
      ) : teachersError ? (
        <Card style={{ display: "grid", gap: spacing.md, padding: spacing.xl }}>
          <strong style={{ ...typography.body, color: colors.ink }}>دریافت استادان ناموفق بود</strong>
          <span style={{ ...typography.caption, color: colors.inkMuted }}>{teachersError}</span>
          <Button variant="secondary" onClick={() => navigateApp("/search", config)}>
            رفتن به جستجو
          </Button>
        </Card>
      ) : teachers.length === 0 ? (
        <Card style={{ padding: spacing.xl, textAlign: "center" }}>
          <strong style={{ ...typography.body, color: colors.ink }}>هنوز استادی منتشر نشده</strong>
          <p style={{ ...typography.caption, margin: `${spacing.sm}px 0 0`, color: colors.inkMuted }}>
            پس از تأیید اولین استاد، پروفایل او در این بخش نمایش داده می‌شود.
          </p>
        </Card>
      ) : (
        <>
          <TeacherRail title="اساتید پیشنهادی" teachers={recommended} config={config} />
          {featured ? <FeaturedTeacher teacher={featured} config={config} /> : null}
          <TeacherRail title="اساتید بانو" teachers={women} config={config} />
        </>
      )}
    </div>
  );
}
