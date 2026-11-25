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
import { fetchChallenges, fetchMyPoints, joinChallenge, pointReasonLabel, type ChallengeItem, type PointSnapshotData } from "./api";
import { ModeBadge, PhaseBadge } from "./badges";

const clampTwoLines: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
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
  const { L, lang } = useAppearance();
  const canJoin = item.status === "registration" && !item.joined && item.participantsCount < item.capacity;
  const capacityFull = item.capacity > 0 && item.participantsCount >= item.capacity;
  const capacityPercent =
    item.capacity > 0 ? Math.min(100, Math.round((item.participantsCount / item.capacity) * 100)) : 0;
  const audioSrc = item.mode === "audio" ? resolveAssetUrl(item.audioUrl) : undefined;

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
        gap: 10,
        padding: 15,
        textAlign: "start",
        border: `1px solid ${colors.sand150}`,
        borderRadius: 20,
        background: colors.surface,
        boxShadow: "0 0 6px rgba(46,54,34,.04)",
        cursor: "pointer",
        fontFamily: typography.fontFamily,
        color: colors.ink,
        minWidth: 0,
      }}
    >
      {/* عنوان + نشان‌ها */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0 }}>
        <span
          aria-hidden="true"
          style={{
            flex: "0 0 40px",
            width: 40,
            height: 40,
            display: "grid",
            placeItems: "center",
            borderRadius: 13,
            background: colors.goldBackground,
            border: "1px solid rgba(191,149,64,.35)",
            color: colors.goldDark,
          }}
        >
          <Icon name="sparkle" size={19} />
        </span>
        <div style={{ minWidth: 0, flex: 1, display: "grid", gap: 6 }}>
          <strong style={{ fontSize: 14.5, fontWeight: 800, color: colors.ink, lineHeight: 1.5 }}>{L(item.title)}</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <PhaseBadge status={item.status} />
            <ModeBadge mode={item.mode} />
            {item.joined ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 9px",
                  borderRadius: radii.pill,
                  background: colors.greenBackground,
                  border: `1px solid ${colors.greenBorder}`,
                  color: colors.greenInk,
                  fontSize: 10,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                <Icon name="check" size={11} stroke={2.4} />
                {L("ثبت‌نام‌شده")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* توضیح — دو خط */}
      {item.description ? (
        <span style={{ ...clampTwoLines, fontSize: 12, fontWeight: 600, color: colors.inkSecondary, lineHeight: 1.9 }}>
          {L(item.description)}
        </span>
      ) : null}

      {/* ظرفیت */}
      <div style={{ display: "grid", gap: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.inkMuted }}>
          {L("ظرفیت: {a} از {b}")
            .replace("{a}", localizedDigits(item.participantsCount, lang))
            .replace("{b}", localizedDigits(item.capacity, lang))}
        </span>
        <span
          aria-hidden="true"
          style={{ display: "block", height: 6, borderRadius: 999, background: colors.sand100, overflow: "hidden" }}
        >
          <span
            style={{
              display: "block",
              height: "100%",
              width: `${capacityPercent}%`,
              borderRadius: 999,
              background: capacityFull ? colors.gold : "linear-gradient(90deg, #728350, #5e6e43)",
            }}
          />
        </span>
      </div>

      {/* پخش‌کنندهٔ تلاوت نمونه */}
      {audioSrc ? (
        <div onClick={(event) => event.stopPropagation()}>
          <audio controls preload="none" src={audioSrc} style={{ width: "100%", height: 40 }} />
        </div>
      ) : null}

      {/* دکمهٔ ثبت‌نام مستقیم در مرحلهٔ ثبت‌نام */}
      {item.status === "registration" && !item.joined ? (
        <div onClick={(event) => event.stopPropagation()}>
          <Button fullWidth loading={busy} disabled={capacityFull} onClick={onJoin}>
            <Icon name="sparkle" size={16} />
            {capacityFull ? L("ظرفیت تکمیل") : L("ثبت‌نام")}
          </Button>
        </div>
      ) : null}
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
