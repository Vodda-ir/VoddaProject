"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { UniversalAppConfig } from "../../config";
import { PlatformHttpError } from "../../platform/http";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp } from "../../router";
import { Button, Card, Input, colors, radii, spacing, typography } from "../../ui";
import { defaultRouteForUser } from "./AuthExperience";

function errorMessage(error: unknown) {
  if (error instanceof PlatformHttpError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "ذخیره پروفایل انجام نشد. دوباره تلاش کنید.";
}

function normalizeUser(payload: unknown): AuthUser | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const candidate = record.data && typeof record.data === "object"
    ? record.data as Record<string, unknown>
    : record;

  if (typeof candidate.id !== "number" || typeof candidate.mobile !== "string") return null;
  return candidate as AuthUser;
}

type ProfileCompletionScreenProps = {
  config: UniversalAppConfig;
};

export function ProfileCompletionScreen({ config }: ProfileCompletionScreenProps) {
  const platform = usePlatform();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const restored = await platform.restoreSession();
        if (cancelled) return;
        if (!restored) {
          navigateApp("/login", config, { replace: true });
          return;
        }
        setUser(restored);
        setName(restored.name ?? "");
        setCity(restored.city ?? "");
        setBio(restored.bio ?? "");
      } catch (loadError) {
        if (!cancelled) setError(errorMessage(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [config, platform]);

  const nameValid = useMemo(() => name.trim().length >= 2, [name]);
  const canSubmit = nameValid && !saving && !loading;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!nameValid) {
      setError("نام و نام خانوادگی را کامل وارد کنید.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await platform.request<unknown>("/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          city: city.trim(),
          bio: bio.trim(),
        }),
      });

      const updated = normalizeUser(response) ?? await platform.restoreSession();
      if (!updated) {
        navigateApp("/login", config, { replace: true });
        return;
      }
      setUser(updated);
      navigateApp(defaultRouteForUser(updated), config, { replace: true });
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      dir="rtl"
      data-universal-app="vodda"
      data-platform={platform.kind}
      style={{ minHeight: "100dvh", background: colors.sand50, color: colors.ink }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 560,
          margin: "0 auto",
          paddingInline: spacing.xl,
          paddingTop: "max(32px, env(safe-area-inset-top))",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
          fontFamily: typography.fontFamily,
        }}
      >
        <header style={{ marginBottom: spacing.xl }}>
          <p style={{ ...typography.caption, margin: 0, color: colors.olive700 }}>تکمیل حساب</p>
          <h1 style={{ ...typography.heading, margin: "6px 0 0", color: colors.olive900 }}>
            پروفایل خود را کامل کنید
          </h1>
          <p style={{ ...typography.bodySmall, margin: "8px 0 0", color: colors.inkMuted }}>
            برای ورود به وُدّا حداقل نام و نام خانوادگی لازم است. شهر و توضیحات را می‌توانید همین حالا یا بعداً ثبت کنید.
          </p>
        </header>

        <Card elevated>
          {loading ? (
            <div aria-live="polite" style={{ ...typography.body, color: colors.inkMuted }}>
              در حال دریافت اطلاعات حساب…
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "grid", gap: spacing.lg }}>
              <Input
                label="نام و نام خانوادگی"
                name="name"
                autoComplete="name"
                value={name}
                disabled={saving}
                placeholder="نام خود را وارد کنید"
                onChange={(event) => setName(event.target.value)}
                error={name.length > 0 && !nameValid ? "حداقل دو حرف وارد کنید." : undefined}
              />

              <Input
                label="شهر"
                name="city"
                autoComplete="address-level2"
                value={city}
                disabled={saving}
                placeholder="مثلاً کرمان"
                onChange={(event) => setCity(event.target.value)}
              />

              <label style={{ display: "grid", gap: spacing.xs }}>
                <span style={{ ...typography.bodySmall, fontWeight: 700, color: colors.inkSecondary }}>
                  درباره من
                </span>
                <textarea
                  name="bio"
                  rows={4}
                  value={bio}
                  disabled={saving}
                  maxLength={500}
                  placeholder="توضیح کوتاهی درباره خودتان بنویسید"
                  onChange={(event) => setBio(event.target.value)}
                  style={{
                    width: "100%",
                    resize: "vertical",
                    boxSizing: "border-box",
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.sm,
                    padding: `${spacing.sm}px ${spacing.md}px`,
                    background: colors.surface,
                    color: colors.ink,
                    font: "inherit",
                    lineHeight: 1.8,
                    outline: "none",
                  }}
                />
                <span style={{ ...typography.caption, color: colors.inkMuted, textAlign: "left" }}>
                  {bio.length}/500
                </span>
              </label>

              {user?.mobile ? (
                <div
                  style={{
                    padding: `${spacing.sm}px ${spacing.md}px`,
                    borderRadius: radii.sm,
                    background: colors.sand100,
                    ...typography.bodySmall,
                    color: colors.inkMuted,
                  }}
                >
                  شماره حساب: <span dir="ltr">{user.mobile}</span>
                </div>
              ) : null}

              {error ? (
                <div
                  role="alert"
                  style={{
                    padding: `${spacing.sm}px ${spacing.md}px`,
                    borderRadius: radii.sm,
                    background: "rgba(166, 81, 81, 0.08)",
                    color: colors.danger,
                    ...typography.bodySmall,
                  }}
                >
                  {error}
                </div>
              ) : null}

              <Button type="submit" fullWidth loading={saving} disabled={!canSubmit}>
                ذخیره و ادامه
              </Button>
            </form>
          )}
        </Card>
      </section>
    </main>
  );
}
