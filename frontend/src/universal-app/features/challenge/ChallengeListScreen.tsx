"use client";

/* چالش‌های قرآنی — فهرست عمومی (قرآن‌آموز):
 * کارت چالش با نشان مرحله، حوزه، ظرفیت، پخش‌کنندهٔ تلاوت نمونه و دکمهٔ ثبت‌نام؛
 * بالای فهرست تراشهٔ امتیاز اینستاقرآن با بازکردن تاریخچهٔ امتیازها. */

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateAppRoute } from "../../router";
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { useMinWidth } from "../../ui/useMediaQuery";
import { resolveAssetUrl } from "../../platform/asset";
import { messageOf } from "../../ui/errorMessage";
import { showToast } from "../../ui/toast";
import { localizedDigits } from "../../ui/persian";
import { formatAppDateTime } from "../../ui/jalali";
import {
  challengePhaseLabel,
  fetchChallenges,
  fetchMyPoints,
  joinChallenge,
  pointReasonLabel,
  type ChallengeItem,
  type PointSnapshotData,
} from "./api";

const clampTwoLines: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const clampThreeLines: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

/* تراشهٔ روشن روی نوار تیرهٔ قهرمانی — وضعیت مرحله با پس‌زمینهٔ سفیدِ نیمه‌شفاف */
const heroChip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 9px",
  borderRadius: radii.pill,
  background: "rgba(255,250,240,.16)",
  border: "1px solid rgba(255,250,240,.35)",
  color: colors.onOlive,
  fontSize: 10,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

/* تراشهٔ سبز «ثبت‌نام‌شده» روی همان نوار تیره */
const joinedChip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "3px 9px",
  borderRadius: radii.pill,
  background: colors.greenChip,
  border: `1px solid ${colors.greenBorder}`,
  color: colors.greenInk,
  fontSize: 10,
  fontWeight: 800,
  whiteSpace: "nowrap",
};

/* نشان دایره‌ای طلاییِ حوزه (ستاره/میکروفون) با حلقهٔ روشن */
const emblemStyle: CSSProperties = {
  flex: "0 0 46px",
  width: 46,
  height: 46,
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  background: gradients.goldRich,
  border: "2px solid rgba(231,213,168,.65)",
  color: colors.onGold,
  boxShadow: "0 4px 10px rgba(34,26,8,.24)",
};

/* نقطهٔ طلایی «مسابقهٔ فعال» روی تراشهٔ وضعیت */
const liveDot: CSSProperties = {
  flex: "0 0 auto",
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: colors.goldSoft,
};

function ChallengeCard({
  item,
  busy,
  onOpen,
  onJoin,
}: {
  item: ChallengeItem;
  busy: boolean;
  onOpen: () => void;
  onJoin: () => void;
}) {
  const { L, lang, N } = useAppearance();
  const capacityFull = item.capacity > 0 && item.participantsCount >= item.capacity;
  const capacityPercent =
    item.capacity > 0 ? Math.min(100, Math.round((item.participantsCount / item.capacity) * 100)) : 0;
  const audioSrc = item.mode === "audio" ? resolveAssetUrl(item.audioUrl) : undefined;
  const heroDark = item.status === "judging" || item.status === "finished" || item.status === "canceled";
  const deadline =
    item.status === "judging" ? item.votingDeadline : item.status === "active" ? item.submissionDeadline : "";
  const deadlineLabel =
    item.status === "judging" ? L("مهلت رأی‌گیری") : item.joined ? L("تا پایان مهلت ارسال") : L("مهلت ارسال");
  const stateLabel =
    item.status === "active"
      ? L("مسابقهٔ فعال")
      : item.status === "registration" && capacityFull
        ? L("آمادهٔ آغاز")
        : challengePhaseLabel(item.status, L);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen();
      }}
      className="vodda-tappable vodda-enter"
      style={{
        width: "100%",
        display: "grid",
        gap: 12,
        padding: 14,
        textAlign: "start",
        border: `1px solid ${colors.sand150}`,
        borderRadius: 22,
        background: colors.surface,
        boxShadow: shadows.sm,
        transition: "transform 160ms cubic-bezier(.2,.9,.3,1), boxShadow 160ms ease",
        cursor: "pointer",
        fontFamily: typography.fontFamily,
        color: colors.ink,
        minWidth: 0,
      }}
    >
      {/* نوار قهرمانی — نشان طلایی حوزه، عنوان و تراشه‌های وضعیت */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "12px 13px 13px",
          borderRadius: 18,
          background: heroDark ? gradients.deep : gradients.hero,
          boxShadow: "inset 0 1px 0 rgba(255,250,240,.16)",
        }}
      >
        <span aria-hidden="true" style={emblemStyle}>
          <Icon name={item.mode === "audio" ? "mic" : "sparkle"} size={22} />
        </span>
        <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 7 }}>
          <strong
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: colors.onOlive,
              lineHeight: 1.55,
              ...clampTwoLines,
            }}
          >
            {L(item.title)}
          </strong>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={heroChip}>
              {item.status === "active" ? <span aria-hidden="true" style={liveDot} /> : null}
              {stateLabel}
            </span>
            {item.joined ? (
              <span style={joinedChip}>
                <Icon name="check" size={11} stroke={2.4} />
                {L("ثبت‌نام‌شده")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* توضیح — سه خط */}
      {item.description ? (
        <span style={{ ...clampThreeLines, fontSize: 12, fontWeight: 600, color: colors.inkSecondary, lineHeight: 1.9 }}>
          {L(item.description)}
        </span>
      ) : null}

      {/* پاداش ثبت‌نام + حوزهٔ چالش */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 11px",
            borderRadius: radii.pill,
            background: gradients.gold,
            border: "1px solid rgba(191,149,64,.45)",
            color: colors.goldDark,
            fontSize: 10.5,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="gift" size={12} />
          {L("پاداش ثبت‌نام")} · {L("۱۰ امتیاز اینستاقرآن")}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 11px",
            borderRadius: radii.pill,
            background: colors.surfaceSoft,
            border: `1px solid ${colors.sand200}`,
            color: colors.inkSecondary,
            fontSize: 10.5,
            fontWeight: 700,
            minWidth: 0,
          }}
        >
          <Icon name={item.mode === "audio" ? "headphones" : "book"} size={12} style={{ color: colors.goldDark }} />
          {item.mode === "audio"
            ? item.audioTeacherName
              ? N(item.audioTeacherName)
              : L("تلاوت نمونهٔ استاد")
            : L("حوزهٔ تشریحی")}
        </span>
      </div>

      {/* نوار مهلت ارسال/رأی‌گیری */}
      {deadline ? (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 11px",
            borderRadius: 12,
            background: colors.goldBackground,
            border: "1px solid rgba(191,149,64,.32)",
            color: colors.goldDark,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <Icon name="clock" size={13} />
          <span style={{ minWidth: 0 }}>
            {deadlineLabel}: {formatAppDateTime(deadline, lang)}
          </span>
        </span>
      ) : null}

      {/* ظرفیت */}
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <Icon name="users" size={12} style={{ color: colors.inkMuted }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: colors.inkMuted }}>
            {L("ظرفیت: {a} از {b}")
              .replace("{a}", localizedDigits(item.participantsCount, lang))
              .replace("{b}", localizedDigits(item.capacity, lang))}
          </span>
          {capacityFull ? (
            <span
              style={{
                marginInlineStart: "auto",
                fontSize: 10.5,
                fontWeight: 800,
                color: colors.goldDark,
                whiteSpace: "nowrap",
              }}
            >
              {L("ظرفیت تکمیل شد")}
            </span>
          ) : null}
        </div>
        <span
          aria-hidden="true"
          style={{ display: "block", height: 7, borderRadius: 999, background: colors.sand100, overflow: "hidden" }}
        >
          <span
            style={{
              display: "block",
              height: "100%",
              width: `${capacityPercent}%`,
              borderRadius: 999,
              background: capacityFull ? gradients.goldRich : "linear-gradient(90deg,#728350,#5e6e43)",
              transition: "width 420ms cubic-bezier(.2,.9,.3,1)",
            }}
          />
        </span>
        {item.status === "registration" && capacityFull ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700, color: colors.goldDark }}>
            <Icon name="info" size={11} />
            {L("با تکمیل ظرفیت، چالش خودکار آغاز می‌شود")}
          </span>
        ) : null}
      </div>

      {/* پخش‌کنندهٔ تلاوت نمونه — پنل نرم */}
      {audioSrc ? (
        <div
          onClick={(event) => event.stopPropagation()}
          style={{
            background: colors.surfaceSoft,
            border: `1px solid ${colors.sand150}`,
            borderRadius: 14,
            padding: 8,
          }}
        >
          <audio controls preload="none" src={audioSrc} style={{ width: "100%", height: 40 }} />
        </div>
      ) : null}

      {/* دکمهٔ ثبت‌نام مستقیم در مرحلهٔ ثبت‌نام — یا نوار سبز ثبت‌نام‌شده */}
      {item.status === "registration" ? (
        item.joined ? (
          <div
            style={{
              display: "grid",
              gap: 4,
              padding: "11px 13px",
              borderRadius: 14,
              background: colors.greenBackground,
              border: `1px solid ${colors.greenBorder}`,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: colors.greenInk, fontSize: 12.5, fontWeight: 800 }}>
              <Icon name="checkCircle" size={16} />
              {L("ثبت‌نام‌شده")}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: colors.inkMuted }}>
              {L("امتیاز لازم نیست — فقط شرکت کنید")}
            </span>
          </div>
        ) : (
          <div onClick={(event) => event.stopPropagation()}>
            <Button
              fullWidth
              loading={busy}
              disabled={capacityFull}
              onClick={onJoin}
              style={{ background: gradients.oliveBtn, borderColor: "transparent" }}
            >
              <Icon name="sparkle" size={16} />
              {capacityFull ? L("ظرفیت تکمیل شد") : L("به رقابت بپیوندید")}
            </Button>
          </div>
        )
      ) : (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            borderTop: `1px solid ${colors.sand100}`,
            paddingTop: 10,
            fontSize: 11,
            fontWeight: 800,
            color: colors.olive700,
          }}
        >
          {L("جزئیات و ثبت‌نام")}
          <Icon name="chevronL" size={13} style={{ color: colors.olive600 }} />
        </span>
      )}
    </div>
  );
}

export function ChallengeListScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { L, lang } = useAppearance();
  const wide = useMinWidth(768);

  const [items, setItems] = useState<ChallengeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [points, setPoints] = useState<PointSnapshotData | null>(null);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  // باگ refresh-loop: اجرای دوم StrictMode نباید state را با دادهٔ کهنه بازنویسی کند.
  const loadGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    const isStale = () => loadGeneration.current !== generation;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchChallenges(runtime);
      if (isStale()) return;
      setItems(rows);
    } catch (cause) {
      if (isStale()) return;
      setItems([]);
      setError(messageOf(cause, L("فهرست چالش‌ها دریافت نشد")));
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [runtime, L]);

  const loadPoints = useCallback(async () => {
    try {
      setPoints(await fetchMyPoints(runtime));
    } catch {
      // نبود دادهٔ امتیاز نباید فهرست را بشکند — تراشه پنهان می‌ماند
      setPoints(null);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
    void loadPoints();
  }, [load, loadPoints]);

  async function join(item: ChallengeItem) {
    if (joiningId !== null) return;
    setJoiningId(item.id);
    setActionError(null);
    try {
      await joinChallenge(runtime, item.id);
      showToast(L("۱۰ امتیاز اینستاقرآن برای ثبت‌نام ثبت شد"), "success");
      await Promise.all([load(), loadPoints()]);
    } catch (cause) {
      // خطای ثبت‌نام فهرست را نمی‌بندد — بنر خطا بالای کارت‌ها دیده می‌شود
      setActionError(messageOf(cause, L("ثبت‌نام در چالش انجام نشد")));
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <section className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
      <header style={{ display: "grid", gap: spacing.sm, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md, flexWrap: "wrap" }}>
          <h2 style={{ ...typography.sectionTitle, margin: 0, color: colors.ink, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Icon name="sparkle" size={19} style={{ color: colors.goldDark }} />
            {L("چالش‌های قرآنی")}
          </h2>
          {points ? (
            <button
              type="button"
              onClick={() => setPointsOpen((open) => !open)}
              aria-expanded={pointsOpen}
              className="vodda-tappable"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "7px 13px",
                borderRadius: radii.pill,
                border: `1px solid rgba(191,149,64,.45)`,
                background: colors.goldBackground,
                color: colors.goldDark,
                fontSize: 12,
                fontWeight: 800,
                fontFamily: typography.fontFamily,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Icon name="coins" size={14} />
              {L("امتیاز اینستاقرآن")}: {localizedDigits(points.balance, lang)}
              <Icon name={pointsOpen ? "chevronUp" : "chevronL"} size={13} />
            </button>
          ) : null}
        </div>
        <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>
          {L("رقابت‌های قرآنی وُدّا — ثبت‌نام، ارسال، رأی‌گیری و امتیاز")}
        </p>
      </header>

      {/* تاریخچهٔ امتیاز اینستاقرآن */}
      {points && pointsOpen ? (
        <div
          className="vodda-enter"
          style={{
            display: "grid",
            gap: 8,
            padding: 14,
            borderRadius: 18,
            border: `1px solid ${colors.sand150}`,
            background: colors.surfaceSoft,
            boxShadow: shadows.xs,
          }}
        >
          <strong style={{ fontSize: 12.5, fontWeight: 800, color: colors.ink }}>{L("تاریخچهٔ امتیاز")}</strong>
          {points.ledger.length === 0 ? (
            <span style={{ ...typography.caption, color: colors.inkMuted }}>{L("هنوز امتیازی ثبت نشده است")}</span>
          ) : (
            points.ledger.map((entry) => (
              <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span
                  aria-hidden="true"
                  style={{
                    flex: "0 0 auto",
                    width: 26,
                    height: 26,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: "50%",
                    background: entry.amount >= 0 ? colors.successBackground : colors.dangerBackground,
                    color: entry.amount >= 0 ? colors.success : colors.danger,
                  }}
                >
                  <Icon name={entry.amount >= 0 ? "plus" : "x"} size={13} stroke={2.2} />
                </span>
                <span style={{ minWidth: 0, flex: 1, display: "grid" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.ink }}>{pointReasonLabel(entry.reason, L)}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: colors.inkMuted }}>
                    {entry.createdAt ? formatAppDateTime(entry.createdAt, lang) : ""}
                  </span>
                </span>
                <strong
                  style={{
                    flex: "0 0 auto",
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: entry.amount >= 0 ? colors.success : colors.danger,
                  }}
                  dir="ltr"
                >
                  {entry.amount >= 0 ? "+" : "−"}
                  {localizedDigits(Math.abs(entry.amount), lang)}
                </strong>
              </div>
            ))
          )}
        </div>
      ) : null}

      {actionError ? (
        <span
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 13px",
            borderRadius: 13,
            background: colors.dangerBackground,
            border: "1px solid rgba(166,81,81,.3)",
            color: colors.danger,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <Icon name="info" size={15} />
          {L(actionError)}
        </span>
      ) : null}

      {error ? (
        <ErrorState
          title={L("دریافت چالش‌ها ناموفق بود")}
          description={L(error)}
          action={<Button onClick={() => void load()}>{L("تلاش دوباره")}</Button>}
        />
      ) : null}

      {loading && !error ? (
        <div
          aria-hidden="true"
          style={{
            display: "grid",
            gridTemplateColumns: wide ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)",
            gap: spacing.md,
            minWidth: 0,
          }}
        >
          {Array.from({ length: wide ? 4 : 3 }).map((_, index) => (
            <span key={index} className="vodda-skeleton" style={{ height: 240, borderRadius: 20, display: "block" }} />
          ))}
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          icon={<Icon name="sparkle" size={30} style={{ color: colors.goldDark }} />}
          title={L("هنوز چالشی برگزار نشده است")}
          description={L("به‌زودی نخستین چالش قرآنی اینجا آغاز می‌شود؛ منتظر باشید.")}
        />
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: wide ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)",
            gap: spacing.md,
            minWidth: 0,
          }}
        >
          {items.map((item) => (
            <ChallengeCard
              key={item.id}
              item={item}
              busy={joiningId === item.id}
              onOpen={() => navigateAppRoute("challenge", { id: String(item.id) }, config)}
              onJoin={() => void join(item)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
