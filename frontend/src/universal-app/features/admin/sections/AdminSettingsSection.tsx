"use client";

/* تنظیمات سامانه درون‌اپی — هم‌ارز صفحهٔ ادمین/تنظیمات پنل وب + کلید استوری‌ها.
 * راه‌های ارتباطی، شبکه‌های اجتماعی، نوار اعلان، معرفی کوتاه، ورود با گوگل؛
 * و کلید فعال/غیرفعال استوری‌ها (فروشگاه محلی BFF — اپ و سایت هم‌زمان). */

import { useCallback, useEffect, useState } from "react";
import { confirmDialog } from "@/lib/confirm";
import { usePlatform } from "../../../platform/context";
import { Icon, colors, gradients, typography } from "../../../ui";
import { useAppearance } from "../../../ui/appearance";
import { messageOf } from "../../../ui/errorMessage";
import { showToast } from "../../../ui/toast";
import {
  fetchAdminSettings,
  fetchAppSettings,
  saveAdminSettings,
  saveAppSettings,
  type AdminSettingsMap,
} from "../api";
import { AdminError, AdminPanel, AdminSectionHead, AdminToggle, faNumber } from "../AdminUI";

type FieldDef = {
  key: string;
  label: string;
  hint?: string;
  type: "text" | "textarea" | "toggle" | "url";
  placeholder?: string;
  ltr?: boolean;
};

const FIELDS: Array<{ group: string; description: string; icon: "headphones" | "sparkle" | "bell" | "quran" | "shield" | "video"; fields: FieldDef[] }> = [
  {
    group: "راه‌های ارتباطی",
    description: "در صفحه تماس و فوتر سایت عمومی نمایش داده می‌شود.",
    icon: "headphones",
    fields: [
      { key: "support_email", label: "ایمیل پشتیبانی", type: "text", placeholder: "info@vodda.app", ltr: true, hint: "باید شامل @ باشد" },
      { key: "support_phone", label: "تلفن پشتیبانی", type: "text", placeholder: "021xxxxxxx", ltr: true, hint: "خالی = نمایش داده نمی‌شود" },
    ],
  },
  {
    group: "شبکه‌های اجتماعی",
    description: "آدرس کامل پروفایل؛ خالی یعنی نمایش داده نمی‌شود.",
    icon: "sparkle",
    fields: [
      { key: "instagram", label: "اینستاگرام", type: "url", placeholder: "https://instagram.com/vodda", ltr: true },
      { key: "telegram", label: "تلگرام", type: "url", placeholder: "https://t.me/vodda", ltr: true },
      { key: "whatsapp", label: "واتس‌اپ", type: "url", placeholder: "https://wa.me/98xxxxxxxxxx", ltr: true },
    ],
  },
  {
    group: "اعلان همگانی",
    description: "نوار اعلان بالای صفحه اصلی سایت برای همه بازدیدکنندگان.",
    icon: "bell",
    fields: [
      { key: "announcement_on", label: "نمایش نوار اعلان", type: "toggle" },
      { key: "announcement_text", label: "متن اعلان", type: "textarea", placeholder: "مثلاً: ثبت‌نام دوره تفسیر نور آغاز شد!" },
      { key: "announcement_link", label: "لینک اعلان", type: "url", placeholder: "https://vodda.ir/...", ltr: true, hint: "اختیاری" },
    ],
  },
  {
    group: "معرفی کوتاه",
    description: "متن کوتاه معرفی سامانه برای بخش‌های عمومی.",
    icon: "quran",
    fields: [
      { key: "about_short", label: "معرفی کوتاه", type: "textarea", placeholder: "وُدّا، پلتفرم آنلاین آموزش قرآن کریم…" },
    ],
  },
  {
    group: "ورود با گوگل",
    description: "برای کاربرانی که پیامک به دستشان نمی‌رسد (مثلاً خارج از کشور).",
    icon: "shield",
    fields: [
      { key: "google_client_id", label: "Client ID گوگل", type: "text", placeholder: "xxxxxxxx.apps.googleusercontent.com", ltr: true },
      { key: "google_client_secret", label: "Client Secret گوگل", type: "text", placeholder: "GOCSPX-...", ltr: true, hint: "برای امنیت فقط به‌صورت پوشانده نمایش داده می‌شود" },
      { key: "google_redirect_uri", label: "Redirect URI", type: "text", ltr: true, hint: "همین مقدار باید در Google Cloud Console هم ثبت شود" },
    ],
  },
  {
    group: "کلاس بیگ‌بلوباتن",
    description: "اتصال جلسات آنلاین به اشتراک بیگ‌بلوباتن ایران. هر دو مقدار را از حساب شما در app.bigbluebutton.me ← «مدیریت جلسات» ← «تنظیمات» بردارید.",
    icon: "video",
    fields: [
      { key: "bbb_api_url", label: "BBB API URL", type: "url", placeholder: "https://…/bigbluebutton/api", ltr: true, hint: "همان آدرس کامل پوشهٔ API که پنل بیگ‌بلوباتن نمایش می‌دهد" },
      { key: "bbb_shared_secret", label: "BBB Shared Secret", type: "text", placeholder: "رشتهٔ محرمانهٔ اتصال", ltr: true, hint: "پوشانده نمایش داده می‌شود و فقط سمت سرور استفاده می‌گردد" },
    ],
  },
];

const ALL_KEYS = FIELDS.flatMap((section) => section.fields.map((field) => field.key));

const inputStyle: React.CSSProperties = {
  minHeight: 42,
  padding: "8px 11px",
  border: `1px solid ${colors.sand200}`,
  borderRadius: 11,
  background: colors.surface,
  color: colors.ink,
  fontFamily: typography.fontFamily,
  fontSize: 12.5,
  fontWeight: 700,
  outline: "none",
  width: "100%",
};

export function AdminSettingsSection() {
  const runtime = usePlatform();
  const { L } = useAppearance();

  /* کلید استوری‌ها */
  const [storiesEnabled, setStoriesEnabled] = useState(true);
  const [storiesLoading, setStoriesLoading] = useState(true);
  const [storiesBusy, setStoriesBusy] = useState(false);

  /* تنظیمات بک‌اند */
  const [values, setValues] = useState<AdminSettingsMap>({});
  const [loaded, setLoaded] = useState<AdminSettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setStoriesLoading(true);
    setError(null);
    try {
      const [settings, appSettings] = await Promise.all([
        fetchAdminSettings(runtime),
        fetchAppSettings(runtime).catch(() => ({ storiesEnabled: true })),
      ]);
      const normalized: AdminSettingsMap = {};
      for (const key of ALL_KEYS) normalized[key] = settings[key] ?? "";
      setValues(normalized);
      setLoaded(normalized);
      setStoriesEnabled(appSettings.storiesEnabled);
    } catch (cause) {
      setError(messageOf(cause, L("تنظیمات دریافت نشد.")));
    } finally {
      setLoading(false);
      setStoriesLoading(false);
    }
  }, [runtime, L]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStories() {
    if (storiesBusy) return;
    const next = !storiesEnabled;
    if (!next && !(await confirmDialog(L("استوری‌ها برای همه کاربران پنهان می‌شود. ادامه می‌دهید؟"), { danger: true, confirmLabel: "غیرفعال‌کردن" }))) return;
    setStoriesBusy(true);
    setError(null);
    try {
      const result = await saveAppSettings(runtime, { storiesEnabled: next });
      setStoriesEnabled(result.storiesEnabled);
      showToast(next ? L("استوری‌ها فعال شد") : L("استوری‌ها غیرفعال شد"), "success");
    } catch (cause) {
      setError(messageOf(cause, L("ثبت کلید استوری‌ها انجام نشد.")));
    } finally {
      setStoriesBusy(false);
    }
  }

  const dirty = ALL_KEYS.some((key) => (values[key] ?? "") !== (loaded[key] ?? ""));
  const changedCount = ALL_KEYS.filter((key) => (values[key] ?? "") !== (loaded[key] ?? "")).length;

  async function save() {
    if (saving) return;
    const changes: AdminSettingsMap = {};
    for (const key of ALL_KEYS) {
      if ((values[key] ?? "") !== (loaded[key] ?? "")) changes[key] = values[key] ?? "";
    }
    if (!Object.keys(changes).length) return;

    if (changes.announcement_on === undefined && values.announcement_on === "") changes.announcement_on = "false";
    if ((changes.announcement_text ?? (values.announcement_text ? undefined : "")) === "" && values.announcement_on === "true") {
      setError(L("برای فعال‌کردن نوار اعلان، متن اعلان را هم وارد کنید."));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await saveAdminSettings(runtime, changes);
      const normalized: AdminSettingsMap = {};
      for (const key of ALL_KEYS) normalized[key] = updated[key] ?? "";
      setValues(normalized);
      setLoaded(normalized);
      showToast(L("تنظیمات با موفقیت ثبت شد."), "success");
    } catch (cause) {
      setError(messageOf(cause, L("ثبت تنظیمات انجام نشد.")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
      {error ? <AdminError message={error} onRetry={() => void load()} /> : null}

      {/* کلید استوری‌ها — درخواست اصلی مدیر */}
      <AdminPanel style={{ gap: 12 }}>
        <AdminSectionHead
          title={L("استوری‌های سامانه")}
          description={L("ریل استوری صفحهٔ خانهٔ اپ. با خاموش‌کردن این کلید، استوری‌های موجود برای همه پنهان و انتشار استوری جدید بسته می‌شود — در اپ و سایت هم‌زمان.")}
          action={<AdminBadge2 enabled={storiesEnabled} />}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 13px", borderRadius: 14, background: storiesEnabled ? colors.olive50 : colors.surfaceSoft, border: `1px solid ${storiesEnabled ? colors.olive100 : colors.sand200}` }}>
          <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 800, color: colors.ink }}>
              <Icon name="sparkle" size={16} style={{ color: storiesEnabled ? colors.olive700 : colors.inkFaint }} />
              {L("فعال بودن استوری‌ها")}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: colors.inkMuted, lineHeight: 1.8 }}>
              {storiesEnabled
                ? L("استوری برند و اساتید در ریل صفحهٔ خانه دیده می‌شود و انتشار باز است.")
                : L("ریل استوری خالی نشان داده می‌شود و انتشار استوری برای همه بسته است. داده‌ها حذف نمی‌شوند.")}
            </span>
          </div>
          <AdminToggle
            checked={storiesEnabled}
            disabled={storiesLoading || storiesBusy}
            onLabel={L("فعال")}
            offLabel={L("غیرفعال")}
            onToggle={() => void toggleStories()}
          />
        </div>
      </AdminPanel>

      {/* تنظیمات بک‌اند */}
      {loading ? (
        <AdminPanel>
          <span className="vodda-skeleton" style={{ height: 200, borderRadius: 14, display: "block" }} />
        </AdminPanel>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: colors.inkMuted }}>
              {dirty ? `${faNumber(changedCount)} ${L("تغییر ذخیره‌نشده")}` : L("همهٔ تغییرات ثبت شده است")}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {dirty ? (
                <button
                  type="button"
                  onClick={() => { setValues(loaded); setError(null); }}
                  className="vodda-tappable"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 13px", borderRadius: 12, border: `1px solid ${colors.sand200}`, background: colors.surface, color: colors.inkMuted, fontSize: 12, fontWeight: 800, fontFamily: typography.fontFamily, cursor: "pointer" }}
                >
                  <Icon name="refresh" size={13} />
                  {L("بازگردانی")}
                </button>
              ) : null}
              <button
                type="button"
                disabled={!dirty || saving}
                onClick={() => void save()}
                className="vodda-tappable"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 12, border: 0, background: "linear-gradient(145deg, #43b07f, #2e8f5c)", color: "#ffffff", fontSize: 12, fontWeight: 800, fontFamily: typography.fontFamily, cursor: !dirty || saving ? "default" : "pointer", opacity: !dirty || saving ? 0.6 : 1 }}
              >
                <Icon name="check" size={14} />
                {saving ? L("در حال ثبت…") : dirty ? `${L("ثبت")} ${faNumber(changedCount)} ${L("تغییر")}` : L("ثبت تغییرات")}
              </button>
            </div>
          </div>

          {FIELDS.map((section) => (
            <AdminPanel key={section.group} style={{ gap: 12 }}>
              <AdminSectionHead title={L(section.group)} description={L(section.description)} />
              {section.fields.map((field) => {
                const value = values[field.key] ?? "";
                const changed = value !== (loaded[field.key] ?? "");
                return (
                  <label key={field.key} style={{ display: "grid", gap: 7, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 800, color: colors.ink }}>
                      {L(field.label)}
                      {changed ? <AdminBadge2 changed /> : null}
                    </span>

                    {field.type === "toggle" ? (
                      <AdminToggle
                        checked={value === "true"}
                        onLabel={L("نمایش به همه")}
                        offLabel={L("پنهان")}
                        onToggle={() => setValues((current) => ({ ...current, [field.key]: value === "true" ? "false" : "true" }))}
                      />
                    ) : field.type === "textarea" ? (
                      <textarea
                        value={value}
                        placeholder={field.placeholder}
                        dir={field.ltr ? "ltr" : "rtl"}
                        maxLength={field.key === "announcement_text" ? 300 : 400}
                        rows={2}
                        onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                        style={{ ...inputStyle, minHeight: 76, resize: "vertical", lineHeight: 1.9, fontWeight: 600 }}
                      />
                    ) : (
                      <input
                        value={value}
                        type={field.type === "url" ? "url" : "text"}
                        dir={field.ltr ? "ltr" : "rtl"}
                        placeholder={field.placeholder}
                        onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                        style={{ ...inputStyle, direction: field.ltr ? "ltr" : "rtl", textAlign: field.ltr ? "left" : "right" }}
                      />
                    )}

                    {field.hint ? <small style={{ color: colors.inkFaint, fontSize: 10, fontWeight: 600 }}>{L(field.hint)}</small> : null}

                    {field.key === "announcement_text" && values.announcement_on === "true" && value.trim() ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", borderRadius: 12, background: colors.goldBackground, color: "#765918", fontSize: 11.5, border: "1px dashed #e2c98f", fontWeight: 700 }}>
                        <Icon name="bell" size={14} />
                        <strong style={{ flex: 1, fontWeight: 700 }}>{value}</strong>
                        <em style={{ fontStyle: "normal", fontSize: 9.5, opacity: 0.75 }}>{L("پیش‌نمایش نوار اعلان")}</em>
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </AdminPanel>
          ))}
        </>
      )}
    </div>
  );
}

function AdminBadge2({ enabled, changed }: { enabled?: boolean; changed?: boolean }) {
  if (changed) {
    return (
      <span style={{ padding: "3px 9px", borderRadius: 999, background: colors.goldBackground, border: "1px solid rgba(191,149,64,.45)", color: colors.goldDark, fontSize: 10, fontWeight: 800 }}>
        تغییر کرده
      </span>
    );
  }
  return (
    <span
      style={{
        padding: "3px 9px",
        borderRadius: 999,
        background: enabled ? "#e7f6ee" : colors.surfaceSoft,
        border: `1px solid ${enabled ? "rgba(58,167,109,.4)" : colors.sand200}`,
        color: enabled ? "#2e8f5c" : colors.inkMuted,
        fontSize: 10,
        fontWeight: 800,
      }}
    >
      {enabled ? "فعال" : "غیرفعال"}
    </span>
  );
}
