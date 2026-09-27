"use client";

import { useEffect, useMemo, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp } from "../../router";
import {
  Avatar,
  Button,
  Card,
  HeroPanel,
  Icon,
  IconBadge,
  LoadingState,
  SectionHeader,
  colors,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { RoleModeSheet } from "../auth/RoleModeSheet";
import { searchTeachers } from "../teachers/api";
import { TeacherCard } from "../teachers/TeacherCard";
import type { Teacher } from "../teachers/types";

export type LearnerHomeScreenProps = {
  config: UniversalAppConfig;
};

const quickCategories = [
  {
    id: "quran",
    title: "آموزش قرآن",
    description: "روخوانی، تجوید و حفظ",
    icon: "quran" as const,
    tone: "olive" as const,
  },
  {
    id: "maddahi",
    title: "مداحی",
    description: "صوت، لحن و اجرا",
    icon: "mic" as const,
    tone: "clay" as const,
  },
] as const;

function teacherSubtitle(teacher: Teacher) {
  return [teacher.tag || teacher.field, teacher.city].filter(Boolean).join(" · ");
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
    <section aria-label={title} className="vodda-enter" style={{ minWidth: 0 }}>
      <SectionHeader title={title} action="مشاهدهٔ همه" onAction={() => navigateApp("/search", config)} />
      <div
        className="vodda-scroll-rail"
        style={{
          display: "flex",
          width: "100%",
          minWidth: 0,
          gap: spacing.md,
          overflowX: "auto",
          marginInline: -spacing.xl,
          padding: `${spacing.md}px ${spacing.xl}px ${spacing.sm}px`,
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
      className="vodda-tappable vodda-enter"
      onClick={() => navigateApp(`/teacher/${teacher.id}`, config)}
      style={{
        width: "100%",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        gap: spacing.lg,
        padding: spacing.lg,
        textAlign: "right",
        color: colors.surface,
        background: `linear-gradient(145deg, ${colors.olive900}, ${colors.olive800})`,
        border: 0,
        borderRadius: radii.xl,
        boxShadow: shadows.md,
        cursor: "pointer",
        fontFamily: typography.fontFamily,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 145,
          height: 145,
          insetInlineEnd: -70,
          top: -82,
          borderRadius: "50%",
          background: "rgba(255,255,255,.06)",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          width: 78,
          height: 96,
          flex: "0 0 78px",
          display: "grid",
          placeItems: "center",
          borderRadius: radii.md,
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.16)",
          fontSize: 34,
        }}
      >
        {teacher.field.includes("مداح") ? "🎤" : "📖"}
      </div>
      <div style={{ minWidth: 0, flex: 1, position: "relative" }}>
        <p style={{ ...typography.caption, display: "flex", alignItems: "center", gap: 5, margin: 0, color: colors.goldSoft, fontWeight: 800 }}>
          <Icon name="checkCircle" size={14} stroke={2} />
          پروفایل تأییدشده
        </p>
        <h2 style={{ ...typography.title, margin: `${spacing.sm}px 0 0`, color: colors.surface }}>{teacher.name}</h2>
        <p style={{ ...typography.bodySmall, margin: "3px 0 0", color: "rgba(255,255,255,0.7)" }}>
          {teacherSubtitle(teacher) || "مشاهده خدمات و زمان‌های قابل رزرو"}
        </p>
        <p style={{ ...typography.caption, display: "flex", alignItems: "center", gap: 3, margin: `${spacing.md}px 0 0`, color: colors.surface, fontWeight: 800 }}>
          مشاهدهٔ خدمات و زمان‌های قابل رزرو
          <Icon name="chevronL" size={14} />
        </p>
      </div>
    </button>
  );
}

export function LearnerHomeScreen({ config }: LearnerHomeScreenProps) {
  const runtime = usePlatform();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);

  useEffect(() => {
    let active = true;
    runtime.restoreSession()
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
        setTeachersError(messageOf(error, "دریافت استادان ناموفق بود."));
      })
      .finally(() => {
        if (active) setTeachersLoading(false);
      });

    return () => {
      active = false;
    };
  }, [runtime, reloadKey]);

  const women = useMemo(() => teachers.filter((teacher) => teacher.female), [teachers]);
  const men = useMemo(() => teachers.filter((teacher) => !teacher.female), [teachers]);
  const recommended = men.length > 0 ? men : teachers;
  const featured = teachers[0] ?? null;
  const firstName = user?.name?.trim().split(/\s+/)[0] || "دوست";
  const canUseTeacherMode = user?.role === "teacher" || user?.role === "admin";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", minWidth: 0, gap: 26 }}>
      <header
        className="vodda-enter"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
          paddingBlock: spacing.xs,
        }}
      >
        <button
          type="button"
          onClick={() => { if (canUseTeacherMode) setRoleSheetOpen(true); }}
          className="vodda-tappable"
          style={{
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 11,
            padding: 0,
            textAlign: "right",
            border: 0,
            color: colors.ink,
            background: "transparent",
            fontFamily: typography.fontFamily,
            cursor: canUseTeacherMode ? "pointer" : "default",
          }}
        >
          <Avatar name={user?.name} src={user?.avatar_url} size={48} ring />
          <span style={{ minWidth: 0 }}>
            <span style={{ ...typography.caption, display: "block", color: colors.inkMuted }}>وقت بخیر،</span>
            <strong
              style={{
                ...typography.body,
                display: "block",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: colors.ink,
                fontWeight: 900,
              }}
            >
              {firstName} جان 🌿
            </strong>
            {canUseTeacherMode ? (
              <span style={{ display: "block", marginTop: 1, fontSize: 11.5, color: colors.olive700, fontWeight: 600 }}>
                برای تغییر پنل روی پروفایل بزنید
              </span>
            ) : null}
          </span>
        </button>
        <button
          type="button"
          aria-label="کیف پول"
          className="vodda-tappable"
          onClick={() => navigateApp("/wallet", config)}
          style={{
            width: 44,
            height: 44,
            display: "grid",
            placeItems: "center",
            flex: "0 0 44px",
            padding: 0,
            border: `1px solid ${colors.olive100}`,
            borderRadius: 16,
            color: colors.olive700,
            background: colors.olive50,
            cursor: "pointer",
          }}
        >
          <Icon name="wallet" size={20} />
        </button>
      </header>

      {!teachersLoading ? (
        <HeroPanel
          eyebrow="به وُدّا خوش آمدید"
          title={"استاد قرآن و مداحی‌ات را\nپیدا و زمان آزادش را رزرو کن"}
          description="پروفایل استادان تأییدشده و خدمات قابل رزرو را ببین."
        >
          <Button
            onClick={() => navigateApp("/search", config)}
            style={{
              minHeight: 44,
              color: colors.olive700,
              background: colors.surface,
              borderColor: colors.surface,
              boxShadow: "none",
            }}
          >
            <Icon name="search" size={18} />
            جستجوی استاد
          </Button>
        </HeroPanel>
      ) : null}

      {!teachersLoading && !teachersError ? (
        <section className="vodda-enter vodda-enter-delay-1">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
            {quickCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => navigateApp("/search", config)}
                className="vodda-card vodda-card--interactive vodda-tappable"
                style={{
                  minHeight: 142,
                  display: "grid",
                  justifyItems: "center",
                  alignContent: "center",
                  gap: spacing.sm,
                  padding: spacing.lg,
                  textAlign: "center",
                  color: colors.ink,
                  background: colors.surface,
                  border: `1px solid ${colors.sand150}`,
                  borderRadius: radii.lg,
                  boxShadow: shadows.sm,
                  cursor: "pointer",
                  fontFamily: typography.fontFamily,
                }}
              >
                <IconBadge icon={category.icon} tone={category.tone} size={50} />
                <strong style={{ ...typography.body, color: colors.ink, fontWeight: 900 }}>{category.title}</strong>
                <span style={{ ...typography.caption, color: colors.inkMuted }}>{category.description}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {teachersLoading ? (
        <LoadingState label="در حال دریافت استادان…" style={{ minHeight: 220 }} />
      ) : teachersError ? (
        <Card elevated style={{ display: "grid", gap: spacing.md, textAlign: "center" }}>
          <IconBadge icon="users" tone="olive" size={52} />
          <strong style={{ ...typography.title, color: colors.ink }}>دریافت استادان ناموفق بود</strong>
          <span style={{ ...typography.caption, color: colors.inkMuted }}>{teachersError}</span>
          <Button variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>
            تلاش دوباره
          </Button>
        </Card>
      ) : teachers.length === 0 ? (
        <Card style={{ paddingBlock: spacing.huge, textAlign: "center" }}>
          <IconBadge icon="users" tone="olive" size={58} />
          <strong style={{ ...typography.title, display: "block", marginTop: spacing.md }}>هنوز استادی منتشر نشده</strong>
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

      <RoleModeSheet
        open={roleSheetOpen}
        mode="learner"
        config={config}
        onClose={() => setRoleSheetOpen(false)}
      />
    </div>
  );
}
