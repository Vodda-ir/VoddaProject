"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp } from "../../router";
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

export function LearnerHomeScreen({ config }: LearnerHomeScreenProps) {
  const runtime = usePlatform();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [query, setQuery] = useState("");

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
    </div>
  );
}
