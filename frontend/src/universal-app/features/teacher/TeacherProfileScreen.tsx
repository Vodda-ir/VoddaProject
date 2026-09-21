"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { asArray, asNumber, asRecord, asString, type ApiEnvelope } from "../../platform/api";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import {
  Avatar,
  Button,
  Card,
  ActionTile,
  ErrorState,
  Icon,
  Input,
  LoadingState,
  SectionHeader,
  StatusPill,
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { formatWalletAmount, toFaDigits } from "../wallet/WalletTransactionCard";

type UserProfile = {
  name: string;
  avatarUrl?: string;
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

function statusLabel(status: string): string {
  if (status === "approved") return "تأییدشده";
  if (status === "rejected") return "ردشده";
  return "در انتظار بررسی";
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

  const load = useCallback(async () => {
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
      setUser(nextUser);
      setTeacher(nextTeacher);
      setForm(toForm(nextTeacher));
    } catch (loadError) {
      setUser(null);
      setTeacher(null);
      setForm(null);
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
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
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <Card elevated className="vodda-enter" style={{ display: "grid", gap: spacing.md, padding: spacing.xl, color: colors.surface, background: gradients.deep, borderColor: "transparent", boxShadow: shadows.olive }}>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
          <Avatar name={user.name} src={user.avatarUrl} size={68} ring />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ ...typography.heading, margin: 0, color: colors.surface }}>{user.name}</h1>
            <p style={{ ...typography.bodySmall, margin: "4px 0 0", color: colors.goldSoft, fontWeight: 700 }}>
              {teacher.tag || teacher.field || "پروفایل مدرس"}
            </p>
            <div style={{ marginTop: spacing.sm }}><StatusPill status={teacher.status} label={statusLabel(teacher.status)} /></div>
          </div>
          <button type="button" className="vodda-tappable" onClick={() => navigateApp("/profile/edit", config)} aria-label="ویرایش حساب" style={{ width: 42, height: 42, display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,.18)", borderRadius: 14, color: colors.surface, background: "rgba(255,255,255,.1)", cursor: "pointer" }}><Icon name="edit" size={18} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: spacing.sm }}>
          {[["امتیاز", `${rating} ★`], ["نظرها", toFaDigits(teacher.reviews)], ["جلسات", toFaDigits(teacher.sessions)]].map(([label, value]) => (
            <div key={label} style={{ textAlign: "center", padding: spacing.sm, borderRadius: radii.md, background: "rgba(255,255,255,.08)" }}>
              <strong style={{ ...typography.body, display: "block", color: colors.surface }}>{value}</strong>
              <span style={{ ...typography.caption, display: "block", color: "rgba(255,255,255,.6)" }}>{label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="vodda-enter vodda-enter-delay-1" style={{ display: "grid", gap: spacing.md, background: teacher.available ? colors.successBackground : colors.surface }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: spacing.md }}>
          <div>
            <strong style={{ ...typography.body, display: "block" }}>دسترس‌پذیری برای رزرو</strong>
            <span style={{ ...typography.caption, color: colors.inkMuted }}>
              {teacher.available ? "در حال حاضر کاربران می‌توانند زمان آزاد شما را رزرو کنند." : "رزرو جدید برای شما غیرفعال است."}
            </span>
          </div>
          <Button
            variant={teacher.available ? "secondary" : "primary"}
            disabled={availabilitySaving}
            onClick={() => void setAvailability(!teacher.available)}
          >
            {availabilitySaving ? "در حال ذخیره…" : teacher.available ? "غیرفعال کردن" : "فعال کردن"}
          </Button>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: spacing.sm }}>
        <ActionTile icon="book" title="خدمات من" description={`${toFaDigits(activeServices)} خدمت فعال`} onClick={() => navigateApp("/t/services", config)} />
        <ActionTile icon="star" title="نظرها" description={`${toFaDigits(teacher.reviews)} نظر ثبت‌شده`} onClick={() => navigateApp("/t/reviews", config)} tone="gold" />
      </div>

      <Card>
        <form onSubmit={saveProfile} style={{ display: "grid", gap: spacing.lg }}>
          <SectionHeader title="اطلاعات حرفه‌ای" description="اطلاعاتی که قرآن‌آموزان در پروفایل شما می‌بینند" />
          <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>
              فقط فیلدهای مجاز پروفایل استاد بروزرسانی می‌شوند؛ وضعیت تأیید و احراز هویت قابل تغییر نیست.
            </p>
          <Input label="حوزه تخصص" value={form.field} maxLength={60} onChange={(event) => setForm({ ...form, field: event.target.value })} />
          <Input label="عنوان استاد" value={form.tag} maxLength={60} onChange={(event) => setForm({ ...form, tag: event.target.value })} />
          <Input label="سطح" value={form.level} maxLength={30} onChange={(event) => setForm({ ...form, level: event.target.value })} />
          <Input label="شهر" value={form.city} maxLength={80} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          <label style={{ display: "grid", gap: spacing.xs }}>
            <span style={{ ...typography.bodySmall, color: colors.inkSecondary }}>معرفی استاد</span>
            <textarea
              value={form.bio}
              maxLength={1000}
              rows={5}
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
              className="vodda-textarea" style={{ width: "100%", resize: "vertical", padding: spacing.md, borderRadius: radii.md, border: `1px solid ${colors.line}`, outline: "none", boxShadow: shadows.xs, font: "inherit", background: colors.surface, color: colors.ink }}
            />
          </label>
          <Input label="مهارت‌ها" hint="با ویرگول جدا کنید؛ حداکثر ۲۰ مورد" value={form.skills} onChange={(event) => setForm({ ...form, skills: event.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: spacing.sm }}>
            <Input label="تعرفه ۳۰ دقیقه (تومان)" inputMode="numeric" value={form.price30} onChange={(event) => setForm({ ...form, price30: event.target.value.replace(/\D/g, "") })} />
            <Input label="تعرفه ۶۰ دقیقه (تومان)" inputMode="numeric" value={form.price60} onChange={(event) => setForm({ ...form, price60: event.target.value.replace(/\D/g, "") })} />
          </div>
          {teacher.price30 > 0 || teacher.price60 > 0 ? (
            <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>
              تعرفه فعلی: ۳۰ دقیقه {formatWalletAmount(teacher.price30)} تومان · ۶۰ دقیقه {formatWalletAmount(teacher.price60)} تومان
            </p>
          ) : null}
          {notice ? <p role="status" style={{ ...typography.bodySmall, margin: 0, color: colors.inkSecondary }}>{notice}</p> : null}
          <Button type="submit" fullWidth disabled={saving}>{saving ? "در حال ذخیره…" : "ذخیره اطلاعات حرفه‌ای"}</Button>
        </form>
      </Card>

      <ActionTile icon="user" title="بازگشت به فضای قرآن‌آموز" description="جستجو و رزرو را مثل یک کاربر عادی ادامه دهید." onClick={() => navigateApp("/", config)} tone="info" />
    </section>
  );
}