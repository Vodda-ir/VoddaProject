"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp } from "../../router";
import { Avatar, Button, Card, Icon, Input, colors, radii, shadows, spacing, typography } from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { defaultRouteForUser } from "./AuthExperience";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

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
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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
        if (!cancelled) setError(messageOf(loadError, "ذخیره پروفایل انجام نشد. دوباره تلاش کنید."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [config, platform]);

  useEffect(() => {
    if (!avatar) {
      setAvatarPreview(null);
      return;
    }

    const preview = URL.createObjectURL(avatar);
    setAvatarPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [avatar]);

  const onboarding = !user?.name?.trim();
  const nameValid = useMemo(() => name.trim().length >= 2, [name]);
  const canSubmit = nameValid && !saving && !loading;

  function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("فایل انتخاب‌شده باید تصویر باشد.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("حجم تصویر پروفایل نباید بیشتر از ۵ مگابایت باشد.");
      return;
    }
    setError(null);
    setAvatar(file);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!nameValid) {
      setError("نام و نام خانوادگی را کامل وارد کنید.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const profile = {
        name: name.trim(),
        city: city.trim(),
        bio: bio.trim(),
      };
      const response = avatar
        ? await platform.request<unknown>("/me", {
            method: "PUT",
            body: (() => {
              const form = new FormData();
              form.set("name", profile.name);
              form.set("city", profile.city);
              form.set("bio", profile.bio);
              form.set("avatar", avatar, avatar.name || "avatar.jpg");
              return form;
            })(),
          })
        : await platform.request<unknown>("/me", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profile),
          });

      const updated = normalizeUser(response) ?? await platform.restoreSession();
      if (!updated) {
        navigateApp("/login", config, { replace: true });
        return;
      }
      setUser(updated);
      navigateApp(onboarding ? defaultRouteForUser(updated) : "/profile", config, { replace: true });
    } catch (saveError) {
      setError(messageOf(saveError, "ذخیره پروفایل انجام نشد. دوباره تلاش کنید."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      dir="rtl"
      data-universal-app="vodda"
      data-platform={platform.kind}
      style={{ minHeight: "100dvh", background: `radial-gradient(circle at 50% 0%, ${colors.olive100}, ${colors.sand50} 42%, ${colors.sand100})`, color: colors.ink }}
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
        <header className="vodda-enter" style={{ marginBottom: spacing.xl }}>
          {!onboarding ? (
            <Button
              variant="ghost"
              onClick={() => navigateApp("/profile", config)}
              style={{ minHeight: 36, paddingInline: 0, marginBottom: spacing.sm }}
            >
              بازگشت به پروفایل
            </Button>
          ) : null}
          <p style={{ ...typography.caption, margin: 0, color: colors.olive700 }}>
            {onboarding ? "تکمیل حساب" : "حساب کاربری"}
          </p>
          <h1 style={{ ...typography.heading, margin: "6px 0 0", color: colors.olive900 }}>
            {onboarding ? "پروفایل خود را کامل کنید" : "ویرایش پروفایل"}
          </h1>
          <p style={{ ...typography.bodySmall, margin: "8px 0 0", color: colors.inkMuted }}>
            {onboarding
              ? "برای ورود به وُدّا حداقل نام و نام خانوادگی لازم است. شهر و توضیحات را می‌توانید همین حالا یا بعداً ثبت کنید."
              : "نام، شهر، توضیحات و تصویر پروفایل خود را ویرایش کنید."}
          </p>
        </header>

        <Card elevated className="vodda-enter vodda-enter-delay-1" style={{ padding: spacing.xl }}>
          {loading ? (
            <div aria-live="polite" style={{ ...typography.body, color: colors.inkMuted }}>
              در حال دریافت اطلاعات حساب…
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "grid", gap: spacing.lg }}>
              <div style={{ display: "grid", justifyItems: "center", gap: spacing.sm }}>
                <Avatar
                  name={name || user?.name}
                  src={avatarPreview ?? user?.avatar_url}
                  size={92}
                  ring
                  style={{ boxShadow: shadows.md }}
                />
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 40,
                    padding: `7px ${spacing.md}px`,
                    color: colors.olive800,
                    background: colors.olive50,
                    border: `1px solid ${colors.olive200}`,
                    borderRadius: radii.pill,
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.6 : 1,
                    ...typography.bodySmall,
                    fontWeight: 700,
                  }}
                >
                  {avatar ? "تغییر تصویر انتخاب‌شده" : user?.avatar_url ? "تغییر تصویر" : "افزودن تصویر"}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={saving}
                    onChange={selectAvatar}
                    style={{ display: "none" }}
                  />
                </label>
                <span style={{ ...typography.caption, color: colors.inkMuted }}>حداکثر حجم تصویر ۵ مگابایت</span>
              </div>

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
                    borderRadius: radii.md,
                    padding: `${spacing.md}px ${spacing.lg}px`,
                    boxShadow: shadows.xs,
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
                    borderRadius: radii.md,
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

              <Button type="submit" fullWidth loading={saving} disabled={!canSubmit}><Icon name="checkCircle" size={18} />{onboarding ? "ذخیره و ادامه" : "ذخیره تغییرات"}</Button>
            </form>
          )}
        </Card>
      </section>
    </main>
  );
}
