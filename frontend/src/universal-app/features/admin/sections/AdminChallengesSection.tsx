"use client";

/* چالش‌ها — مدیریت کامل چالش‌های قرآنی درون‌اپی (هم‌ارز پنل وب):
 * فهرست با نشان مرحله + چرخهٔ وضعیت (شروع → رأی‌گیری → انتشار نتایج) + حذف،
 * ویرایشگر ساخت/ویرایش (آپلود تلاوت نمونه، وزن‌های سه‌گانه) و نمای جزئیات با
 * شرکت‌کنندگان، ارسال‌ها، شمارش رأی زنده و ثبت امتیاد مدیریت ۰..۱۰۰. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { UniversalAppConfig } from "../../../config";
import { navigateAppRoute } from "../../../router";
import { confirmDialog } from "@/lib/confirm";
import { usePlatform } from "../../../platform/context";
import { Icon, Sheet, colors, typography } from "../../../ui";
import { useAppearance } from "../../../ui/appearance";
import { messageOf } from "../../../ui/errorMessage";
import { showToast } from "../../../ui/toast";
import { toLatinDigits } from "../../../ui/persian";
import { resolveAssetUrl } from "../../../platform/asset";
import {
  adminCancelChallenge,
  adminCreateChallenge,
  adminDeleteChallenge,
  adminFetchChallenge,
  adminFetchChallenges,
  adminJudgingChallenge,
  adminPublishChallenge,
  adminRestoreChallenge,
  adminSetScore,
  adminStartChallenge,
  adminUpdateChallenge,
  adminUploadChallengeAudio,
  challengePhaseLabel,
  type AdminChallengeData,
  type AdminParticipantData,
  type ChallengeMode,
} from "../../challenge/api";
import {
  AdminBadge,
  AdminEmpty,
  AdminError,
  AdminPanel,
  AdminTile,
  faDateTime,
  faNumber,
  type AdminTone,
} from "../AdminUI";

const PHASE_TONES: Record<string, AdminTone> = {
  registration: "gold",
  active: "green",
  judging: "info",
  finished: "olive",
  canceled: "rose",
};

const clampTwoLines: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

type ChallengeForm = {
  id: number | null;
  title: string;
  description: string;
  mode: ChallengeMode;
  capacity: string;
  durationHours: string;
  votingHours: string;
  audioUrl: string;
  audioTeacherName: string;
  weightAudience: string;
  weightJudges: string;
  weightAdmin: string;
};

const EMPTY_FORM: ChallengeForm = {
  id: null,
  title: "",
  description: "",
  mode: "audio",
  capacity: "20",
  durationHours: "72",
  votingHours: "48",
  audioUrl: "",
  audioTeacherName: "",
  weightAudience: "",
  weightJudges: "",
  weightAdmin: "",
};

function intFromInput(value: string, fallback = 0): number {
  const parsed = Number.parseInt(toLatinDigits(value).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** ویرایشگر امتیاد مدیریت برای یک شرکت‌کننده — ذخیرهٔ مستقل هر ردیف. */
function ScoreEditor({
  challengeId,
  row,
  onSaved,
  onError,
}: {
  challengeId: number;
  row: AdminParticipantData;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const runtime = usePlatform();
  const { L } = useAppearance();
  const [value, setValue] = useState(row.adminScore > 0 ? String(row.adminScore) : "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const parsed = intFromInput(value, -1);
    if (parsed < 0 || parsed > 100) {
      onError(L("امتیاز باید عددی بین ۰ تا ۱۰۰ باشد."));
      return;
    }
    setSaving(true);
    try {
      await adminSetScore(runtime, challengeId, row.id, parsed);
      showToast(L("امتیاز ثبت شد."), "success");
      onSaved();
    } catch (cause) {
      onError(messageOf(cause, L("ثبت امتیاز انجام نشد.")));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <input
        value={value}
        dir="ltr"
        inputMode="numeric"
        onChange={(event) => setValue(event.target.value)}
        placeholder={L("۰ تا ۱۰۰")}
        aria-label={L("امتیاز مدیریت")}
        style={{
          width: 86,
          minHeight: 36,
          padding: "6px 10px",
          border: `1px solid ${colors.sand200}`,
          borderRadius: 10,
          background: colors.surface,
          color: colors.ink,
          fontFamily: typography.fontFamily,
          fontSize: 12,
          fontWeight: 800,
          textAlign: "center",
          outline: "none",
        }}
      />
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="vodda-tappable"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "8px 11px",
          borderRadius: 11,
          border: `1px solid ${colors.olive100}`,
          background: colors.olive50,
          color: colors.olive700,
          fontSize: 11,
          fontWeight: 800,
          fontFamily: typography.fontFamily,
          cursor: saving ? "wait" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        <Icon name="check" size={13} />
        {L("ثبت امتیاز")}
      </button>
    </div>
  );
}

export function AdminChallengesSection({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { L } = useAppearance();

  const [rows, setRows] = useState<AdminChallengeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // نمای جزئیات (آکاردئون) — شرکت‌کنندگان از /admin/challenges/:id می‌آیند
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminChallengeData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ویرایشگر ساخت/ویرایش
  const [form, setForm] = useState<ChallengeForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await adminFetchChallenges(runtime));
    } catch (cause) {
      setError(messageOf(cause, L("فهرست چالش‌ها دریافت نشد.")));
    } finally {
      setLoading(false);
    }
  }, [runtime, L]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows]);

  const loadDetail = useCallback(
    async (id: number) => {
      setDetailLoading(true);
      setError(null);
      try {
        setDetail(await adminFetchChallenge(runtime, id));
      } catch (cause) {
        setDetail(null);
        setError(messageOf(cause, L("جزئیات چالش دریافت نشد.")));
      } finally {
        setDetailLoading(false);
      }
    },
    [runtime, L],
  );

  async function toggleDetail(id: number) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    await loadDetail(id);
  }

  function openEditor(row?: AdminChallengeData) {
    if (row) {
      setForm({
        id: row.id,
        title: row.title,
        description: row.description,
        mode: row.mode,
        capacity: String(row.capacity),
        durationHours: String(row.durationHours),
        votingHours: String(row.votingHours),
        audioUrl: row.audioUrl,
        audioTeacherName: row.audioTeacherName,
        weightAudience: row.weightAudience > 0 ? String(row.weightAudience) : "",
        weightJudges: row.weightJudges > 0 ? String(row.weightJudges) : "",
        weightAdmin: row.weightAdmin > 0 ? String(row.weightAdmin) : "",
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
    setError(null);
  }

  async function uploadAudio(file: File) {
    if (!form) return;
    setUploading(true);
    setError(null);
    try {
      const url = await adminUploadChallengeAudio(runtime, file, file.name);
      setForm((current) => (current ? { ...current, audioUrl: url } : current));
    } catch (cause) {
      setError(messageOf(cause, L("بارگذاری فایل صوتی انجام نشد.")));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form || saving) return;
    if (form.title.trim().length < 3) {
      setError(L("عنوان چالش باید حداقل ۳ نویسه باشد."));
      return;
    }
    const capacity = intFromInput(form.capacity, -1);
    if (capacity < 2 || capacity > 500) {
      setError(L("ظرفیت باید عددی بین ۲ تا ۵۰۰ باشد."));
      return;
    }
    if (intFromInput(form.durationHours, 0) < 1 || intFromInput(form.votingHours, 0) < 1) {
      setError(L("مدت اجرا و رأی‌گیری باید حداقل یک ساعت باشد."));
      return;
    }
    if (form.mode === "audio" && !form.audioUrl.trim()) {
      setError(L("برای حوزهٔ صوتی، فایل صوتی نمونه لازم است."));
      return;
    }
    const weights = [form.weightAudience.trim(), form.weightJudges.trim(), form.weightAdmin.trim()];
    const anyWeight = weights.some((value) => value !== "");
    const allWeights = weights.every((value) => value !== "");
    if (anyWeight && !allWeights) {
      setError(L("وزن‌ها ناقص است؛ هر سه وزن را پر کنید یا همه را خالی بگذارید."));
      return;
    }
    if (allWeights) {
      const sum = intFromInput(weights[0], -1) + intFromInput(weights[1], -1) + intFromInput(weights[2], -1);
      if (sum !== 100) {
        setError(L("مجموع وزن‌ها باید ۱۰۰ باشد؛ خالی = ۴۰/۴۰/۲۰"));
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const input = {
        title: form.title,
        description: form.description,
        mode: form.mode,
        capacity,
        durationHours: intFromInput(form.durationHours, 72),
        votingHours: intFromInput(form.votingHours, 48),
        audioUrl: form.mode === "audio" ? form.audioUrl.trim() : undefined,
        audioTeacherName: form.mode === "audio" ? form.audioTeacherName.trim() || undefined : undefined,
        weightAudience: allWeights ? intFromInput(weights[0], 40) : null,
        weightJudges: allWeights ? intFromInput(weights[1], 40) : null,
        weightAdmin: allWeights ? intFromInput(weights[2], 20) : null,
      };
      if (form.id) {
        await adminUpdateChallenge(runtime, form.id, input);
        showToast(L("چالش به‌روزرسانی شد."), "success");
      } else {
        await adminCreateChallenge(runtime, input);
        showToast(L("چالش ساخته شد."), "success");
      }
      setForm(null);
      await fetchRows();
    } catch (cause) {
      setError(messageOf(cause, L("ذخیره چالش انجام نشد.")));
    } finally {
      setSaving(false);
    }
  }

  async function transition(row: AdminChallengeData, action: "start" | "judging" | "publish") {
    if (busyId !== null) return;
    const confirmMessage =
      action === "start"
        ? L("با شروع چالش، ثبت‌نام بسته می‌شود. ادامه می‌دهید؟")
        : action === "judging"
          ? L("با رفتن به رأی‌گیری، ارسال برای همه بسته می‌شود. ادامه می‌دهید؟")
          : L("با انتشار، رتبه‌ها نهایی و امتیازهای اینستاقرآن ثبت می‌شوند. ادامه می‌دهید؟");
    if (!(await confirmDialog(confirmMessage, { confirmLabel: L("تأیید"), cancelLabel: L("انصراف") }))) return;
    setBusyId(row.id);
    setError(null);
    try {
      if (action === "start") {
        await adminStartChallenge(runtime, row.id);
        showToast(L("چالش آغاز شد."), "success");
      } else if (action === "judging") {
        await adminJudgingChallenge(runtime, row.id);
        showToast(L("چالش به مرحلهٔ رأی‌گیری رفت."), "success");
      } else {
        await adminPublishChallenge(runtime, row.id);
        showToast(L("نتایج منتشر شد و امتیازها ثبت شدند."), "success");
      }
      await fetchRows();
      if (openId === row.id) await loadDetail(row.id);
    } catch (cause) {
      setError(messageOf(cause, L("تغییر وضعیت چالش انجام نشد.")));
    } finally {
      setBusyId(null);
    }
  }

  /** لغو بازگشت‌پذیر — امتیاز ثبت‌نام شرکت‌کنندگان بازگردانده می‌شود. */
  async function cancel(row: AdminChallengeData) {
    if (busyId !== null) return;
    if (
      !(await confirmDialog(
        L("لغو چالش بازگشت‌پذیر نیست؛ امتیاز ثبت‌نام شرکت‌کنندگان بازگردانده می‌شود. ادامه می‌دهید؟"),
        { danger: true, confirmLabel: L("لغو چالش"), cancelLabel: L("انصراف") },
      ))
    ) {
      return;
    }
    setBusyId(row.id);
    setError(null);
    try {
      await adminCancelChallenge(runtime, row.id);
      showToast(L("چالش لغو شد."), "success");
      await fetchRows();
      if (openId === row.id) await loadDetail(row.id);
    } catch (cause) {
      setError(messageOf(cause, L("لغو چالش انجام نشد.")));
    } finally {
      setBusyId(null);
    }
  }

  /** بازگشایی چالش لغوشده به مرحلهٔ ثبت‌نام. */
  async function restore(row: AdminChallengeData) {
    if (busyId !== null) return;
    setBusyId(row.id);
    setError(null);
    try {
      await adminRestoreChallenge(runtime, row.id);
      showToast(L("چالش به مرحلهٔ ثبت‌نام بازگشت."), "success");
      await fetchRows();
      if (openId === row.id) await loadDetail(row.id);
    } catch (cause) {
      setError(messageOf(cause, L("بازگشایی چالش انجام نشد.")));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: AdminChallengeData) {
    if (busyId !== null) return;
    const confirmMessage =
      row.status === "registration" && row.participantsCount > 0
        ? L("با حذف چالش، همهٔ شرکت‌کنندگان و رأی‌های آن هم حذف می‌شوند. ادامه می‌دهید؟")
        : row.status === "canceled"
          ? `${L("حذف چالش‌های لغوشده")} — ${L("حذف چالش بازگشت‌پذیر نیست. ادامه می‌دهید؟")}`
          : L("حذف چالش بازگشت‌پذیر نیست. ادامه می‌دهید؟");
    if (!(await confirmDialog(confirmMessage, { danger: true, confirmLabel: L("حذف"), cancelLabel: L("انصراف") }))) return;
    setBusyId(row.id);
    setError(null);
    try {
      await adminDeleteChallenge(runtime, row.id);
      showToast(L("چالش حذف شد."), "success");
      if (openId === row.id) {
        setOpenId(null);
        setDetail(null);
      }
      await fetchRows();
    } catch (cause) {
      setError(messageOf(cause, L("حذف چالش انجام نشد.")));
    } finally {
      setBusyId(null);
    }
  }

  const totals = {
    all: rows.length,
    registration: rows.filter((row) => row.status === "registration").length,
    active: rows.filter((row) => row.status === "active" || row.status === "judging").length,
    participants: rows.reduce((sum, row) => sum + row.participantsCount, 0),
  };

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }}>
      {/* میان‌بر کاربری — ورود به فهرست چالش‌ها به‌عنوان کاربر برای ثبت‌نام و رأی */}
      <button
        type="button"
        onClick={() => navigateAppRoute("challenges", config)}
        className="vodda-tappable"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "12px 14px",
          borderRadius: 16,
          border: "1px solid rgba(191,149,64,.4)",
          background: colors.goldBackground,
          color: colors.ink,
          fontFamily: typography.fontFamily,
          textAlign: "start",
          cursor: "pointer",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 38,
            height: 38,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            background: colors.surface,
            border: "1px solid rgba(191,149,64,.45)",
            color: colors.goldDark,
          }}
        >
          <Icon name="sparkle" size={18} />
        </span>
        <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 2 }}>
          <strong style={{ fontSize: 12.5, fontWeight: 800, color: colors.goldDark }}>{L("مشاهده و شرکت در چالش‌ها")}</strong>
          <span style={{ fontSize: 10, fontWeight: 600, color: colors.goldInkSoft, lineHeight: 1.7 }}>
            {L("به‌عنوان کاربر وارد فهرست چالش‌ها شوید؛ ثبت‌نام، ارسال اثر و رأی همین‌جاست.")}
          </span>
        </span>
        <Icon name="chevronL" size={16} style={{ flexShrink: 0, color: colors.goldDark }} />
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10, minWidth: 0 }}>
        <AdminTile icon="sparkle" label={L("کل چالش‌ها")} value={faNumber(totals.all)} />
        <AdminTile icon="clock" label={L("در ثبت‌نام")} value={faNumber(totals.registration)} tone="gold" />
        <AdminTile icon="mic" label={L("در حال اجرا و رأی‌گیری")} value={faNumber(totals.active)} tone="olive" />
        <AdminTile icon="users" label={L("شرکت‌کنندگان")} value={faNumber(totals.participants)} tone="info" />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          onClick={() => void openEditor()}
          className="vodda-tappable"
          style={{
            marginInlineStart: "auto",
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 14px",
            borderRadius: 12,
            border: 0,
            background: colors.olive600,
            color: "#fffaf0",
            fontSize: 12,
            fontWeight: 800,
            fontFamily: typography.fontFamily,
            cursor: "pointer",
          }}
        >
          <Icon name="plus" size={15} />
          {L("چالش جدید")}
        </button>
      </div>

      {error ? <AdminError message={error} /> : null}

      {loading && rows.length === 0 ? (
        <div style={{ display: "grid", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className="vodda-skeleton" style={{ height: 96, borderRadius: 16, display: "block" }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <AdminEmpty icon="sparkle" title={L("هنوز چالشی ساخته نشده است")} />
      ) : (
        <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
          {rows.map((row) => {
            const busy = busyId === row.id;
            const expanded = openId === row.id;
            const canEdit = row.status === "registration";
            const canDelete = row.status === "registration" || row.status === "canceled";
            const canCancel = row.status === "registration" || row.status === "active" || row.status === "judging";
            return (
              <AdminPanel key={row.id} style={{ padding: 14, gap: 9, opacity: busy ? 0.55 : 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 12,
                      background: colors.goldBackground,
                      border: "1px solid rgba(191,149,64,.35)",
                      color: colors.goldDark,
                    }}
                  >
                    <Icon name="sparkle" size={18} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 3 }}>
                    <strong style={{ fontSize: 13, fontWeight: 800, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {L(row.title)}
                    </strong>
                    <span style={{ fontSize: 10, fontWeight: 700, color: colors.inkMuted }}>
                      {row.mode === "audio" ? L("حوزهٔ صوتی") : L("حوزهٔ تشریحی")} ·{" "}
                      {L("ظرفیت: {a} از {b}")
                        .replace("{a}", faNumber(row.participantsCount))
                        .replace("{b}", faNumber(row.capacity))}{" "}
                      · {L("ایجاد")}: {faDateTime(row.createdAt)}
                    </span>
                  </div>
                  <AdminBadge tone={PHASE_TONES[row.status] ?? "muted"}>{challengePhaseLabel(row.status, L)}</AdminBadge>
                </div>

                {row.description ? (
                  <span style={{ ...clampTwoLines, fontSize: 11, fontWeight: 600, color: colors.inkSecondary, lineHeight: 1.8 } as CSSProperties}>
                    {L(row.description)}
                  </span>
                ) : null}

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => void toggleDetail(row.id)}
                    aria-expanded={expanded}
                    className="vodda-tappable"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "8px 11px",
                      borderRadius: 11,
                      border: `1px solid ${colors.sand200}`,
                      background: colors.surface,
                      color: colors.inkSecondary,
                      fontSize: 11,
                      fontWeight: 800,
                      fontFamily: typography.fontFamily,
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="users" size={13} />
                    {L("شرکت‌کنندگان")} ({faNumber(row.participantsCount)})
                    <Icon name={expanded ? "chevronUp" : "chevronL"} size={12} />
                  </button>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => void openEditor(row)}
                      className="vodda-tappable"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "8px 11px",
                        borderRadius: 11,
                        border: `1px solid ${colors.olive100}`,
                        background: colors.olive50,
                        color: colors.olive700,
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: typography.fontFamily,
                        cursor: "pointer",
                      }}
                    >
                      <Icon name="edit" size={13} />
                      {L("ویرایش")}
                    </button>
                  ) : null}
                  {row.status === "registration" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void transition(row, "start")}
                      className="vodda-tappable"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "8px 11px",
                        borderRadius: 11,
                        border: 0,
                        background: colors.olive600,
                        color: "#fffaf0",
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: typography.fontFamily,
                        cursor: busy ? "wait" : "pointer",
                      }}
                    >
                      <Icon name="play" size={13} />
                      {L("شروع")}
                    </button>
                  ) : null}
                  {row.status === "active" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void transition(row, "judging")}
                      className="vodda-tappable"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "8px 11px",
                        borderRadius: 11,
                        border: 0,
                        background: "#3d6070",
                        color: "#ffffff",
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: typography.fontFamily,
                        cursor: busy ? "wait" : "pointer",
                      }}
                    >
                      <Icon name="message" size={13} />
                      {L("شروع رأی‌گیری")}
                    </button>
                  ) : null}
                  {row.status === "judging" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void transition(row, "publish")}
                      className="vodda-tappable"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "8px 11px",
                        borderRadius: 11,
                        border: 0,
                        background: "linear-gradient(145deg, #d8b869, #b8923c)",
                        color: "#241d0e",
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: typography.fontFamily,
                        cursor: busy ? "wait" : "pointer",
                      }}
                    >
                      <Icon name="award" size={13} />
                      {L("انتشار نتایج")}
                    </button>
                  ) : null}
                  {canCancel ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void cancel(row)}
                      className="vodda-tappable"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "8px 11px",
                        borderRadius: 11,
                        border: "1px solid rgba(191,149,64,.45)",
                        background: colors.goldBackground,
                        color: colors.goldDark,
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: typography.fontFamily,
                        cursor: busy ? "wait" : "pointer",
                      }}
                    >
                      <Icon name="x" size={13} />
                      {L("لغو چالش")}
                    </button>
                  ) : null}
                  {row.status === "canceled" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void restore(row)}
                      className="vodda-tappable"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "8px 11px",
                        borderRadius: 11,
                        border: "1px solid rgba(94,110,67,.4)",
                        background: colors.successBackground,
                        color: colors.success,
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: typography.fontFamily,
                        cursor: busy ? "wait" : "pointer",
                      }}
                    >
                      <Icon name="refresh" size={13} />
                      {L("بازگشایی چالش")}
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(row)}
                      aria-label={L("حذف چالش")}
                      className="vodda-tappable"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 5,
                        padding: "8px 11px",
                        borderRadius: 11,
                        border: "1px solid rgba(166,81,81,.35)",
                        background: colors.dangerBackground,
                        color: colors.danger,
                        fontSize: 11,
                        fontWeight: 800,
                        fontFamily: typography.fontFamily,
                        cursor: busy ? "wait" : "pointer",
                      }}
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  ) : null}
                </div>

                {/* نمای جزئیات — شرکت‌کنندگان و امتیازدهی */}
                {expanded ? (
                  <div style={{ display: "grid", gap: 9, paddingTop: 4, borderTop: `1px dashed ${colors.sand200}` }}>
                    {detailLoading ? (
                      <span className="vodda-skeleton" style={{ height: 72, borderRadius: 14, display: "block" }} />
                    ) : !detail || detail.participants.length === 0 ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: colors.inkMuted }}>
                        {L("هنوز شرکت‌کننده‌ای ثبت‌نام نکرده است")}
                      </span>
                    ) : (
                      detail.participants.map((participant) => {
                        const audioSrc = resolveAssetUrl(participant.submissionAudioUrl);
                        return (
                          <div
                            key={participant.id}
                            style={{
                              display: "grid",
                              gap: 7,
                              padding: 12,
                              borderRadius: 14,
                              border: `1px solid ${colors.sand150}`,
                              background: colors.surfaceSoft,
                              minWidth: 0,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                              <strong style={{ fontSize: 12, fontWeight: 800, color: colors.ink, minWidth: 0 }}>
                                {L(participant.name)}
                              </strong>
                              <span dir="ltr" style={{ fontSize: 10.5, fontWeight: 700, color: colors.inkMuted }}>
                                {participant.mobile}
                              </span>
                              <AdminBadge tone={participant.status === "submitted" ? "green" : "muted"}>
                                {participant.status === "submitted" ? L("ارسال ثبت کرده") : L("ثبت‌نام‌شده")}
                              </AdminBadge>
                              <span style={{ marginInlineStart: "auto", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 10.5, fontWeight: 700, color: colors.info }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                  <Icon name="users" size={11} />
                                  {L("رأی مخاطبان")}: {faNumber(participant.audienceVotes)}
                                </span>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                                  <Icon name="award" size={11} />
                                  {L("رأی اساتید داور")}: {faNumber(participant.judgeVotes)}
                                </span>
                              </span>
                            </div>
                            {participant.submissionText ? (
                              <span style={{ fontSize: 11, fontWeight: 600, color: colors.inkSecondary, lineHeight: 1.8, whiteSpace: "pre-line" }}>
                                {L(participant.submissionText)}
                              </span>
                            ) : null}
                            {audioSrc ? <audio controls preload="none" src={audioSrc} style={{ width: "100%", height: 38 }} /> : null}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: colors.inkMuted }}>
                                {L("امتیاز مدیریت")}: {faNumber(participant.adminScore)}
                              </span>
                              <ScoreEditor
                                challengeId={row.id}
                                row={participant}
                                onSaved={() => void loadDetail(row.id)}
                                onError={(message) => setError(message)}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </AdminPanel>
            );
          })}
        </div>
      )}

      {/* ویرایشگر چالش */}
      <Sheet open={form !== null} onClose={() => setForm(null)} title={form?.id ? L("ویرایش چالش") : L("چالش جدید")}>
        {form ? (
          <div style={{ display: "grid", gap: 10, paddingBottom: 12 }}>
            {error ? <AdminError message={error} /> : null}

            <label style={{ display: "grid", gap: 6, fontSize: 11.5, fontWeight: 800, color: colors.ink }}>
              {L("عنوان چالش")}
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder={L("مثلاً چالش تلاوت جزء سی‌ام")}
                style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 700, outline: "none" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6, fontSize: 11.5, fontWeight: 800, color: colors.ink }}>
              {L("توضیح چالش")}
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={4}
                placeholder={L("قواعد رقابت و چیزی که شرکت‌کنندگان باید ارسال کنند…")}
                style={{ minHeight: 84, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 600, lineHeight: 2, resize: "vertical", outline: "none" }}
              />
            </label>

            {/* حوزهٔ رقابت */}
            <div style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: colors.ink }}>{L("حوزهٔ رقابت")}</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {(
                  [
                    { value: "audio", label: "تلاوت صوتی", icon: "mic" },
                    { value: "description", label: "توضیح نوشتاری", icon: "edit" },
                  ] as const
                ).map((option) => {
                  const selected = form.mode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm({ ...form, mode: option.value })}
                      aria-pressed={selected}
                      className="vodda-tappable"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        minHeight: 42,
                        borderRadius: 11,
                        border: selected ? `1.5px solid ${colors.olive600}` : `1px solid ${colors.sand200}`,
                        background: selected ? colors.olive50 : colors.surface,
                        color: selected ? colors.olive700 : colors.inkMuted,
                        fontSize: 12,
                        fontWeight: 800,
                        fontFamily: typography.fontFamily,
                        cursor: "pointer",
                      }}
                    >
                      <Icon name={option.icon} size={14} />
                      {L(option.label)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* فایل صوتی نمونه — فقط حوزهٔ صوتی */}
            {form.mode === "audio" ? (
              <div style={{ display: "grid", gap: 7 }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: colors.ink }}>{L("فایل صوتی تلاوت نمونه")}</span>
                {form.audioUrl ? (
                  <audio controls preload="none" src={resolveAssetUrl(form.audioUrl)} style={{ width: "100%", height: 40 }} />
                ) : null}
                <input
                  value={form.audioUrl}
                  dir="ltr"
                  onChange={(event) => setForm({ ...form, audioUrl: event.target.value })}
                  placeholder={L("آدرس فایل یا بارگذاری از دستگاه")}
                  style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 11.5, fontWeight: 700, outline: "none", textAlign: "left" }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="vodda-tappable"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: `1px dashed ${colors.sand200}`,
                    background: colors.surfaceSoft,
                    color: colors.olive700,
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: typography.fontFamily,
                    cursor: uploading ? "wait" : "pointer",
                  }}
                >
                  <Icon name="download" size={14} />
                  {uploading ? L("در حال بارگذاری…") : L("بارگذاری فایل صوتی از دستگاه")}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void uploadAudio(file);
                  }}
                />
                <label style={{ display: "grid", gap: 6, fontSize: 11.5, fontWeight: 800, color: colors.ink }}>
                  {L("نام استاد تلاوت نمونه")}
                  <input
                    value={form.audioTeacherName}
                    onChange={(event) => setForm({ ...form, audioTeacherName: event.target.value })}
                    placeholder={L("مثلاً استاد ماهر المعیلی")}
                    style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 700, outline: "none" }}
                  />
                </label>
              </div>
            ) : null}

            {/* ظرفیت و مدت‌ها */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, minWidth: 0 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 11.5, fontWeight: 800, color: colors.ink }}>
                {L("ظرفیت (۲ تا ۵۰۰)")}
                <input
                  value={form.capacity}
                  dir="ltr"
                  inputMode="numeric"
                  onChange={(event) => setForm({ ...form, capacity: event.target.value })}
                  style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 700, outline: "none", textAlign: "center" }}
                />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 11.5, fontWeight: 800, color: colors.ink }}>
                {L("مدت اجرا (ساعت)")}
                <input
                  value={form.durationHours}
                  dir="ltr"
                  inputMode="numeric"
                  onChange={(event) => setForm({ ...form, durationHours: event.target.value })}
                  style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 700, outline: "none", textAlign: "center" }}
                />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 11.5, fontWeight: 800, color: colors.ink }}>
                {L("مدت رأی‌گیری (ساعت)")}
                <input
                  value={form.votingHours}
                  dir="ltr"
                  inputMode="numeric"
                  onChange={(event) => setForm({ ...form, votingHours: event.target.value })}
                  style={{ minHeight: 42, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 700, outline: "none", textAlign: "center" }}
                />
              </label>
            </div>

            {/* وزن‌های سه‌گانه */}
            <div style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: colors.ink }}>{L("وزن نمره‌دهی (اختیاری)")}</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, minWidth: 0 }}>
                <label style={{ display: "grid", gap: 6, fontSize: 10.5, fontWeight: 800, color: colors.inkMuted }}>
                  {L("وزن رأی مخاطبان")}
                  <input
                    value={form.weightAudience}
                    dir="ltr"
                    inputMode="numeric"
                    onChange={(event) => setForm({ ...form, weightAudience: event.target.value })}
                    style={{ minHeight: 40, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 700, outline: "none", textAlign: "center" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 10.5, fontWeight: 800, color: colors.inkMuted }}>
                  {L("وزن رأی اساتید داور")}
                  <input
                    value={form.weightJudges}
                    dir="ltr"
                    inputMode="numeric"
                    onChange={(event) => setForm({ ...form, weightJudges: event.target.value })}
                    style={{ minHeight: 40, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 700, outline: "none", textAlign: "center" }}
                  />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 10.5, fontWeight: 800, color: colors.inkMuted }}>
                  {L("وزن نظر مدیریت")}
                  <input
                    value={form.weightAdmin}
                    dir="ltr"
                    inputMode="numeric"
                    onChange={(event) => setForm({ ...form, weightAdmin: event.target.value })}
                    style={{ minHeight: 40, padding: "8px 11px", border: `1px solid ${colors.sand200}`, borderRadius: 11, background: colors.surface, color: colors.ink, fontFamily: typography.fontFamily, fontSize: 12.5, fontWeight: 700, outline: "none", textAlign: "center" }}
                  />
                </label>
              </div>
              <small style={{ fontSize: 9.5, fontWeight: 600, color: colors.inkMuted }}>
                {L("مجموع وزن‌ها باید ۱۰۰ باشد؛ خالی = ۴۰/۴۰/۲۰")}
              </small>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="vodda-tappable"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "12px 14px",
                borderRadius: 13,
                border: 0,
                background: "linear-gradient(145deg, #43b07f, #2e8f5c)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 800,
                fontFamily: typography.fontFamily,
                cursor: saving ? "wait" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Icon name="check" size={15} />
              {saving ? L("در حال ذخیره…") : L("ذخیره چالش")}
            </button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
