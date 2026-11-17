"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp } from "../../router";
import { Avatar, Icon, LoadingState, colors, radii, toFaDigits, typography } from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { defaultRouteForUser } from "./AuthExperience";
import {
  announceAvatarUpdated,
  avatarSrc,
  compressAvatarFile,
  uploadsOriginOf,
  validateAvatarFile,
} from "@/lib/avatarImage";

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
  const [preparingAvatar, setPreparingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
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
    const validationError = validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setPreparingAvatar(true);
    void compressAvatarFile(file)
      .then((prepared) => setAvatar(prepared))
      .catch(() => setAvatar(file))
      .finally(() => setPreparingAvatar(false));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!nameValid) {
      setError("نام و نام خانوادگی را کامل وارد کنید.");
      return;
    }

    setSaving(true);
    setError(null);
    setUploadProgress(null);
    try {
      const profile = {
        name: name.trim(),
        city: city.trim(),
        bio: bio.trim(),
      };
      let response: unknown;
      if (avatar) {
        if (!platform.requestWithProgress) {
          throw new Error("آپلود تصویر در این محیط پشتیبانی نمی‌شود.");
        }
        const form = new FormData();
        form.set("name", profile.name);
        form.set("city", profile.city);
        form.set("bio", profile.bio);
        form.set("avatar", avatar, avatar.name || "avatar.jpg");
        // باگ avatar-upload — آپلود مستقیم به دامنهٔ سرور (در نیتیو api.vodda.ir)
        // با توکن، همراه progress واقعی.
        response = await platform.requestWithProgress<unknown>(
          "/me",
          { method: "PUT", body: form },
          (fraction) => setUploadProgress(fraction),
        );
      } else {
        response = await platform.request<unknown>("/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        });
      }

      const updated = normalizeUser(response) ?? await platform.restoreSession();
      if (!updated) {
        navigateApp("/login", config, { replace: true });
        return;
      }
      setUser(updated);
      // باگ avatar-upload — همگام‌سازی بلافاصلهٔ avatar_url در کش کاربر و همهٔ منوها.
      announceAvatarUpdated(updated.avatar_url, updated.updated_at);
      navigateApp(onboarding ? defaultRouteForUser(updated) : "/profile", config, { replace: true });
    } catch (saveError) {
      setError(messageOf(saveError, "ذخیره پروفایل انجام نشد. دوباره تلاش کنید."));
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  }

  if (loading) {
    return (
      <main dir="rtl" data-universal-app="vodda" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: colors.sand50 }}>
        <LoadingState label="در حال دریافت اطلاعات حساب…" />
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      data-universal-app="vodda"
      data-platform={platform.kind}
      style={{ minHeight: "100dvh", background: colors.sand50, color: colors.ink, fontFamily: typography.fontFamily }}
    >
      <section style={{ width: "100%", maxWidth: 600, minHeight: "100dvh", margin: "0 auto", paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}>
        <header
          style={{
            minHeight: 56,
            display: "grid",
            gridTemplateColumns: "72px 1fr 72px",
            alignItems: "center",
            padding: `max(6px, env(safe-area-inset-top)) 12px 0`,
          }}
        >
          <div>
            {!onboarding ? (
              <button
                type="button"
                aria-label="بازگشت"
                onClick={() => navigateApp("/profile", config)}
                style={{ width: 44, height: 44, display: "grid", placeItems: "center", border: 0, borderRadius: "50%", color: colors.inkSecondary, background: "transparent", cursor: "pointer" }}
              >
                <Icon name="arrowL" size={21} />
              </button>
            ) : null}
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, textAlign: "center", color: colors.ink }}>
            {onboarding ? "تکمیل پروفایل" : "ویرایش پروفایل"}
          </h1>
          <button
            type="submit"
            form="profile-edit-form"
            disabled={!canSubmit}
            style={{
              justifySelf: "end",
              padding: "8px 6px",
              border: 0,
              color: canSubmit ? colors.olive600 : colors.inkFaint,
              background: "transparent",
              fontFamily: typography.fontFamily,
              fontSize: 15,
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {saving ? (uploadProgress !== null ? `ذخیره ${toFaDigits(Math.round(uploadProgress * 100))}٪` : "…") : "ذخیره"}
          </button>
        </header>

        <form id="profile-edit-form" onSubmit={submit} style={{ display: "grid", gap: 18, padding: "20px 20px 28px" }}>
          <div style={{ display: "grid", justifyItems: "center", gap: 8, marginBottom: 2 }}>
            <label style={{ position: "relative", display: "block", cursor: saving ? "not-allowed" : "pointer" }}>
              <Avatar
                name={name || user?.name}
                src={avatarSrc(avatarPreview ?? user?.avatar_url, avatarPreview ? undefined : user?.updated_at, uploadsOriginOf(platform.apiBaseUrl))}
                size={88}
                ring
              />
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  insetInlineEnd: 0,
                  bottom: 0,
                  width: 32,
                  height: 32,
                  display: "grid",
                  placeItems: "center",
                  border: `2px solid ${colors.surface}`,
                  borderRadius: "50%",
                  color: colors.surface,
                  background: colors.olive600,
                }}
              >
                <Icon name="camera" size={16} />
              </span>
              <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={saving || preparingAvatar} onChange={selectAvatar} style={{ display: "none" }} />
            </label>
            <label style={{ color: colors.olive600, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
              {preparingAvatar
                ? "در حال آماده‌سازی تصویر…"
                : avatar || user?.avatar_url
                  ? "تغییر تصویر"
                  : "افزودن تصویر"}
              <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={saving || preparingAvatar} onChange={selectAvatar} style={{ display: "none" }} />
            </label>
            <span aria-hidden="true" style={{ width: 48, height: 3, marginTop: 2, borderRadius: 3, background: colors.olive200 }} />
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: colors.inkSecondary }}>نام و نام خانوادگی</span>
            <div style={{ position: "relative" }}>
              <Icon name="user" size={19} style={{ position: "absolute", insetInlineStart: 16, top: "50%", transform: "translateY(-50%)", color: colors.inkFaint }} />
              <input
                name="name"
                autoComplete="name"
                value={name}
                disabled={saving}
                placeholder="نام خود را وارد کنید"
                onChange={(event) => setName(event.target.value)}
                style={{ width: "100%", minHeight: 54, padding: "12px 46px 12px 16px", border: `1px solid ${name.length > 0 && !nameValid ? colors.danger : colors.sand200}`, borderRadius: 16, outline: "none", color: colors.ink, background: colors.surface, fontFamily: typography.fontFamily, fontSize: 15, fontWeight: 500 }}
              />
            </div>
            {name.length > 0 && !nameValid ? <span style={{ fontSize: 11.5, color: colors.danger }}>حداقل دو حرف وارد کنید.</span> : null}
          </label>

          {user?.mobile ? (
            <div style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: colors.inkSecondary }}>شماره موبایل</span>
              <div style={{ minHeight: 54, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 16, background: colors.sand100 }}>
                <Icon name="phone" size={19} style={{ color: colors.inkFaint }} />
                <span dir="ltr" style={{ flex: 1, color: colors.inkMuted, fontSize: 15, fontWeight: 600 }}>{toFaDigits(user.mobile)}</span>
                <span style={{ padding: "4px 10px", borderRadius: radii.pill, color: colors.inkFaint, background: colors.sand200, fontSize: 11, fontWeight: 600 }}>قابل تغییر نیست</span>
              </div>
            </div>
          ) : null}

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: colors.inkSecondary }}>شهر</span>
            <div style={{ position: "relative" }}>
              <Icon name="pin" size={19} style={{ position: "absolute", insetInlineStart: 16, top: "50%", transform: "translateY(-50%)", color: colors.inkFaint }} />
              <input
                name="city"
                autoComplete="address-level2"
                value={city}
                disabled={saving}
                placeholder="شهر خود را وارد کنید"
                onChange={(event) => setCity(event.target.value)}
                style={{ width: "100%", minHeight: 54, padding: "12px 46px 12px 16px", border: `1px solid ${colors.sand200}`, borderRadius: 16, outline: "none", color: colors.ink, background: colors.surface, fontFamily: typography.fontFamily, fontSize: 15, fontWeight: 500 }}
              />
            </div>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: colors.inkSecondary }}>دربارهٔ شما</span>
            <textarea
              name="bio"
              rows={4}
              value={bio}
              disabled={saving}
              maxLength={200}
              placeholder="چند خط دربارهٔ خودتان بنویسید…"
              onChange={(event) => setBio(event.target.value)}
              className="vodda-textarea"
              style={{ width: "100%", resize: "vertical", padding: 14, border: `1px solid ${colors.sand200}`, borderRadius: 16, outline: "none", color: colors.ink, background: colors.surface, fontFamily: typography.fontFamily, fontSize: 15, fontWeight: 500, lineHeight: 1.8 }}
            />
            <span style={{ fontSize: 11, color: colors.inkFaint, textAlign: "left" }}>{bio.length}/200</span>
          </label>

          {onboarding ? (
            <p style={{ ...typography.caption, margin: "-4px 0 0", color: colors.inkMuted }}>
              برای ورود به وُدّا حداقل نام و نام خانوادگی لازم است؛ بقیه اطلاعات را می‌توانید بعداً هم ویرایش کنید.
            </p>
          ) : null}

          {error ? (
            <div role="alert" style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, background: colors.clayBackground, color: colors.danger, ...typography.bodySmall }}>
              <Icon name="info" size={18} />
              <span>{error}</span>
            </div>
          ) : null}
        </form>
      </section>
    </main>
  );
}
