"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { asArray, asNumber, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import {
  Avatar,
  Button,
  Card,
  ErrorState,
  Icon,
  Input,
  LoadingState,
  colors,
  digitsOnly,
  radii,
  Sheet,
  shadows,
  spacing,
  toFaDigits,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";
import { avatarSrc, uploadsOriginOf } from "@/lib/avatarImage";

type UserProfile = {
  name: string;
  avatarUrl?: string;
  updated_at?: string;
};

type TeacherProfile = {
  id: number;
  field: string;
  tag: string;
  level: string;
  city: string;
  bio: string;
  skills: string[];
  price30: number;
  price60: number;
  available: boolean;
  status: string;
  verified: boolean;
  tier: string;
  rating: number;
  reviews: number;
  sessions: number;
  services: Array<{ id: number; active: boolean }>;
};

type TeacherForm = {
  field: string;
  tag: string;
  level: string;
  city: string;
  bio: string;
  skills: string;
  price30: string;
  price60: string;
};

function parseUser(value: unknown): UserProfile | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    name: asString(record.name).trim() || "استاد",
    avatarUrl: asString(record.avatar_url) || undefined,
    updated_at: asString(record.updated_at) || undefined,
  };
}

function parseTeacher(value: unknown): TeacherProfile | null {
  const record = asRecord(value);
  if (!record) return null;
  const services = asArray(record.services)
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => item !== null);
  const skills = asArray(record.skills)
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    id: asNumber(record.id),
    field: asString(record.field),
    tag: asString(record.tag),
    level: asString(record.level),
    city: asString(record.city),
    bio: asString(record.bio),
    skills,
    price30: asNumber(record.price30),
    price60: asNumber(record.price60),
    available: record.available === true,
    status: asString(record.status) || "pending",
    verified: record.verified === true,
    tier: asString(record.tier),
    rating: asNumber(record.rating),
    reviews: asNumber(record.reviews),
    sessions: asNumber(record.sessions),
    services: services.map((service) => ({ id: asNumber(service.id), active: service.active === true })),
  };
}

function toForm(teacher: TeacherProfile): TeacherForm {
  return {
    field: teacher.field,
    tag: teacher.tag,
    level: teacher.level,
    city: teacher.city,
    bio: teacher.bio,
    skills: teacher.skills.join("، "),
    price30: teacher.price30 > 0 ? String(teacher.price30) : "",
    price60: teacher.price60 > 0 ? String(teacher.price60) : "",
  };
}

function validate(form: TeacherForm): string | null {
  if (form.field.trim().length > 60) return "حوزه تخصص حداکثر ۶۰ کاراکتر است.";
  if (form.tag.trim().length > 60) return "عنوان استاد حداکثر ۶۰ کاراکتر است.";
  if (form.level.trim().length > 30) return "سطح حداکثر ۳۰ کاراکتر است.";
  if (form.city.trim().length > 80) return "شهر حداکثر ۸۰ کاراکتر است.";
  if (form.bio.trim().length > 1000) return "معرفی استاد حداکثر ۱۰۰۰ کاراکتر است.";

  const skills = form.skills.split(/[،,]/).map((item) => item.trim()).filter(Boolean);
  if (skills.length > 20) return "حداکثر ۲۰ مهارت قابل ثبت است.";
  if (skills.some((skill) => skill.length > 50)) return "هر مهارت حداکثر ۵۰ کاراکتر است.";

  for (const [label, raw] of [["تعرفه ۳۰ دقیقه", form.price30], ["تعرفه ۶۰ دقیقه", form.price60]] as const) {
    if (!raw.trim()) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0 || value > 1_000_000_000) {
      return `${label} باید عددی مثبت و حداکثر یک میلیارد تومان باشد.`;
    }
  }
  return null;
}

export function TeacherProfileScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [form, setForm] = useState<TeacherForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // باگ refresh-loop: اجرای دوم StrictMode یا فراخوانی دیرهنگام نباید state را با دادهٔ کهنه بازنویسی کند.
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const isStale = () => loadGeneration.current !== generation;
    setLoading(true);
    setError(null);
    try {
      const [meResponse, teacherResponse] = await Promise.all([
        runtime.request<ApiEnvelope<unknown>>("/me"),
        runtime.request<ApiEnvelope<unknown>>("/teacher/me"),
      ]);
      const nextUser = parseUser(meResponse.data);
      const nextTeacher = parseTeacher(teacherResponse.data);
      if (!nextUser || !nextTeacher) throw new Error("اطلاعات پروفایل استاد دریافت نشد.");
      if (isStale()) return;
      setUser(nextUser);
      setTeacher(nextTeacher);
      setForm(toForm(nextTeacher));
    } catch (loadError) {
      if (isStale()) return;
      setUser(null);
      setTeacher(null);
      setForm(null);
      setError(messageOf(loadError));
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeServices = useMemo(
    () => teacher?.services.filter((service) => service.active).length ?? 0,
    [teacher],
  );

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    const validationError = validate(form);
    if (validationError) {
      setNotice(validationError);
      return;
    }

    const skills = form.skills.split(/[،,]/).map((item) => item.trim()).filter(Boolean);
    const payload: Record<string, unknown> = {};
    if (form.field.trim()) payload.field = form.field.trim();
    if (form.tag.trim()) payload.tag = form.tag.trim();
    if (form.level.trim()) payload.level = form.level.trim();
    if (form.city.trim()) payload.city = form.city.trim();
    if (form.bio.trim()) payload.bio = form.bio.trim();
    if (skills.length) payload.skills = skills;
    if (form.price30.trim()) payload.price30 = Number(form.price30);
    if (form.price60.trim()) payload.price60 = Number(form.price60);

    setSaving(true);
    setNotice(null);
    try {
      const response = await runtime.request<ApiEnvelope<unknown>>("/teacher/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const updated = parseTeacher(response.data);
      if (!updated) throw new Error("پاسخ بروزرسانی پروفایل نامعتبر بود.");
      setTeacher(updated);
      setForm(toForm(updated));
      setNotice("اطلاعات حرفه‌ای استاد ذخیره شد.");
      setEditorOpen(false);
    } catch (saveError) {
      setNotice(messageOf(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function setAvailability(nextValue: boolean) {
    if (!teacher || availabilitySaving) return;
    setAvailabilitySaving(true);
    setNotice(null);
    try {
      const response = await runtime.request<ApiEnvelope<unknown>>("/teacher/me", {
        method: "PUT",
        body: JSON.stringify({ available: nextValue }),
      });
      const updated = parseTeacher(response.data);
      if (!updated) throw new Error("وضعیت دسترس‌پذیری بروزرسانی نشد.");
      setTeacher(updated);
      setNotice(nextValue ? "برای رزرو در دسترس هستید." : "دسترس‌پذیری برای رزرو غیرفعال شد.");
    } catch (updateError) {
      setNotice(messageOf(updateError));
    } finally {
      setAvailabilitySaving(false);
    }
  }

  if (loading) return <LoadingState label="در حال دریافت پروفایل استاد…" />;
  if (error || !user || !teacher || !form) {
    return (
      <ErrorState
        title="دریافت پروفایل ناموفق بود"
        description={error ?? "اطلاعات پروفایل دریافت نشد."}
        action={<Button onClick={() => void load()}>تلاش دوباره</Button>}
      />
    );
  }

  const rating = teacher.reviews > 0 ? teacher.rating.toFixed(1) : "—";

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: 18 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: colors.ink }}>پروفایل استاد</h1>

      <Card elevated className="vodda-enter" style={{ padding: 16, borderRadius: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* آواتار مربعی واحد — مهر درجه داخل خود کامپوننت رندر می‌شود */}
          <Avatar
            name={user.name}
            src={avatarSrc(user.avatarUrl, user.updated_at, uploadsOriginOf(runtime.apiBaseUrl))}
            size={62}
            ring
            tier={teacher.tier || undefined}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: 16.5, fontWeight: 800, display: "block", color: colors.ink }}>
              {user.name}
            </strong>
            <span style={{ fontSize: 12.5, color: colors.olive600, fontWeight: 600 }}>
              {teacher.tag || teacher.field || "مدرس"}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 7, fontSize: 12, color: colors.goldDark }}>
              <Icon name="star" size={14} fill style={{ color: colors.gold }} />
              <strong>{rating === "—" ? rating : toFaDigits(rating)}</strong>
              <span style={{ color: colors.inkFaint }}>({toFaDigits(teacher.reviews)} نظر)</span>
            </span>
          </div>
          <button
            type="button"
            className="vodda-tappable"
            onClick={() => navigateApp("/profile/edit", config)}
            aria-label="ویرایش حساب"
            style={{
              width: 40,
              height: 40,
              display: "grid",
              placeItems: "center",
              flex: "0 0 40px",
              padding: 0,
              border: 0,
              borderRadius: 12,
              color: colors.olive700,
              background: colors.olive50,
              cursor: "pointer",
            }}
          >
            <Icon name="edit" size={19} />
          </button>
        </div>

        <div style={{ height: 1, margin: "15px 0", background: colors.sand100 }} />

        <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: 13.5, fontWeight: 700, display: "block", color: colors.ink }}>
              وضعیت پذیرش جلسه
            </strong>
            <span style={{ fontSize: 11.5, lineHeight: 1.6, color: colors.inkMuted }}>
              {teacher.available ? "آماده دریافت درخواست جدید" : "موقتاً غیرفعال"}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={teacher.available}
            aria-label="وضعیت پذیرش جلسه"
            disabled={availabilitySaving}
            onClick={() => void setAvailability(!teacher.available)}
            style={{
              width: 46,
              height: 28,
              position: "relative",
              flex: "0 0 46px",
              padding: 3,
              border: 0,
              borderRadius: radii.pill,
              background: teacher.available ? colors.olive600 : colors.sand200,
              opacity: availabilitySaving ? 0.6 : 1,
              cursor: availabilitySaving ? "wait" : "pointer",
              transition: "background 180ms ease",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 3,
                insetInlineEnd: teacher.available ? 3 : 21,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: colors.surface,
                boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                transition: "inset-inline-end 180ms ease",
              }}
            />
          </button>
        </div>
      </Card>

      {notice ? (
        <div
          role="status"
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            color: colors.inkSecondary,
            background: colors.olive50,
            ...typography.bodySmall,
          }}
        >
          {notice}
        </div>
      ) : null}

      <Card className="vodda-enter vodda-enter-delay-1" style={{ padding: 0, overflow: "hidden", borderRadius: 24 }}>
        {[
          { icon: "book" as const, title: "خدمات من", meta: `${toFaDigits(activeServices)} خدمت فعال`, action: () => navigateApp("/t/services", config) },
          { icon: "clock" as const, title: "زمان کاری", meta: "مدیریت برنامه هفتگی", action: () => navigateApp("/t/work-times", config) },
          { icon: "star" as const, title: "نظرات", meta: `${toFaDigits(teacher.reviews)} نظر`, action: () => navigateApp("/t/reviews", config) },
          { icon: "edit" as const, title: "اطلاعات حرفه‌ای", meta: "تخصص، مهارت و تعرفه", action: () => setEditorOpen(true) },
        ].map((row, index, rows) => (
          <button
            key={row.title}
            type="button"
            className="vodda-tappable"
            onClick={row.action}
            style={{
              width: "100%",
              minHeight: 62,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              textAlign: "right",
              border: 0,
              borderBottom: index < rows.length - 1 ? `1px solid ${colors.sand100}` : 0,
              color: colors.ink,
              background: colors.surface,
              fontFamily: typography.fontFamily,
              cursor: "pointer",
            }}
          >
            <Icon name={row.icon} size={21} style={{ color: colors.olive600 }} />
            <span style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ fontSize: 14.5, fontWeight: 600, display: "block" }}>{row.title}</strong>
            </span>
            <span style={{ fontSize: 12, color: colors.inkFaint, whiteSpace: "nowrap" }}>{row.meta}</span>
            <Icon name="chevronL" size={18} style={{ color: colors.inkFaint }} />
          </button>
        ))}
      </Card>

      <button
        type="button"
        onClick={() => navigateApp("/", config)}
        className="vodda-tappable vodda-enter vodda-enter-delay-2"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 13,
          padding: 16,
          textAlign: "right",
          border: `1px solid ${colors.olive100}`,
          borderRadius: 24,
          color: colors.ink,
          background: colors.olive50,
          fontFamily: typography.fontFamily,
          cursor: "pointer",
        }}
      >
        <span style={{ width: 46, height: 46, display: "grid", placeItems: "center", flex: "0 0 46px", borderRadius: 14, color: colors.olive700, background: colors.surface }}>
          <Icon name="refresh" size={22} />
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ ...typography.body, display: "block", fontWeight: 800 }}>بازگشت به حساب قرآن‌آموز</strong>
          <span style={{ ...typography.caption, display: "block", marginTop: 3, color: colors.inkSecondary }}>
            به‌عنوان قرآن‌آموز جلسه رزرو کنید
          </span>
        </span>
        <Icon name="chevronL" size={20} style={{ color: colors.olive500 }} />
      </button>

      <Sheet open={editorOpen} title="اطلاعات حرفه‌ای" onClose={() => { if (!saving) setEditorOpen(false); }}>
        <form onSubmit={saveProfile} style={{ display: "grid", gap: spacing.lg }}>
          <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>
            فقط فیلدهای مجاز پروفایل استاد بروزرسانی می‌شوند؛ وضعیت تأیید و احراز هویت قابل تغییر نیست.
          </p>
          <Input label="حوزه تخصص" value={form.field} maxLength={60} onChange={(event) => setForm({ ...form, field: event.target.value })} />
          <Input label="عنوان استاد" value={form.tag} maxLength={60} onChange={(event) => setForm({ ...form, tag: event.target.value })} />
          <Input label="سطح" value={form.level} maxLength={30} onChange={(event) => setForm({ ...form, level: event.target.value })} />
          <Input label="شهر" value={form.city} maxLength={80} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          <label style={{ display: "grid", gap: spacing.xs }}>
            <span style={{ ...typography.bodySmall, color: colors.inkSecondary }}>معرفی استاد</span>
            <textarea className="vodda-textarea"
              value={form.bio}
              maxLength={1000}
              rows={5}
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
             
              style={{ width: "100%", resize: "vertical", padding: spacing.md, borderRadius: radii.md, border: `1px solid ${colors.line}`, outline: "none", boxShadow: shadows.xs, font: "inherit", background: colors.surface, color: colors.ink }}
            />
          </label>
          <Input label="مهارت‌ها" hint="با ویرگول جدا کنید؛ حداکثر ۲۰ مورد" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: spacing.sm }}>
            <Input label="تعرفه ۳۰ دقیقه (تومان)" inputMode="numeric" value={toFaDigits(form.price30)} onChange={(event) => setForm({ ...form, price30: digitsOnly(event.target.value) })} />
            <Input label="تعرفه ۶۰ دقیقه (تومان)" inputMode="numeric" value={toFaDigits(form.price60)} onChange={(event) => setForm({ ...form, price60: digitsOnly(event.target.value) })} />
          </div>
          {teacher.price30 > 0 || teacher.price60 > 0 ? (
            <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>
              تعرفه فعلی: ۳۰ دقیقه {formatWalletAmount(teacher.price30)} تومان · ۶۰ دقیقه {formatWalletAmount(teacher.price60)} تومان
            </p>
          ) : null}
          <Button type="submit" fullWidth loading={saving} disabled={saving}>ذخیره اطلاعات حرفه‌ای</Button>
        </form>
      </Sheet>
    </section>
  );
}