"use client";

// گیت مجوز رسانه — پیش از ورود به کلاس تصویری یا تماس صوتی.
//
// هدف: پنجرهٔ مجوز دوربین/میکروفون «به‌صورت خودکار» روی گوشی و سایت نمایش داده
// شود و اگر انسداد شد، کاربر دقیقاً بداند کدام تنظیم را کجا روشن کند.
//  ۱) هنگام ورود به صفحه، درخواست مجوز خودکار ارسال می‌شود (کروم/اپ اندروید:
//     پنجرهٔ مجوز فوراً باز می‌شود).
//  ۲) اگر مرورگر (مثل iOS سافاری) پنجرهٔ مجوز را بدون لمس کاربر باز نکند،
//     دکمهٔ بزرگ «اجازهٔ دسترسی» در همان لحظهٔ لمس، درخواست را مستقیم به
//     سیستم‌عامل می‌فرستد — این مسیر همیشه پنجرهٔ مجوز را باز می‌کند.
//  ۳) نشانگرهای وضعیت میکروفون/دوربین همیشه روشن‌اند و در صورت انسداد،
//     راهنمای مخصوص همان دستگاه نمایش داده می‌شود — بن‌بست ایجاد نمی‌شود.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  acquireMediaStream,
  permissionUnblockGuide,
  queryMediaPermissions,
  type MediaPermissionSnapshot,
} from "../../platform/media-permissions";
import { colors } from "../../ui/theme";
import { Icon } from "../../ui";
import { useL } from "../../ui/appearance";

type PermState = "granted" | "denied" | "prompt" | "unknown";

const GLASS = "rgba(255,255,255,0.08)";
const GLASS_BORDER = "rgba(255,255,255,0.14)";

function glassStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    background: GLASS,
    border: `1px solid ${GLASS_BORDER}`,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    ...extra,
  };
}

function permMeta(state: PermState): { label: string; dot: string } {
  switch (state) {
    case "granted": return { label: "اجازه داده شده", dot: "#9dc564" };
    case "denied": return { label: "مسدود", dot: "#e08a7a" };
    case "prompt": return { label: "در انتظار اجازهٔ شما", dot: colors.goldAccent };
    default: return { label: "نامشخص", dot: "#77836b" };
  }
}

function PermChip({ state, label, icon }: { state: PermState; label: string; icon: "mic" | "video" }) {
  const L = useL();
  const meta = permMeta(state);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 999,
        ...glassStyle(),
        fontSize: 11,
        fontWeight: 700,
        color: "#f2f5ea",
        whiteSpace: "nowrap",
      }}
    >
      <Icon name={icon} size={12} stroke={2.1} style={{ opacity: 0.85 }} />
      {L(label)}
      <span
        aria-hidden="true"
        title={L(meta.label)}
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: meta.dot,
          boxShadow: `0 0 7px ${meta.dot}`,
          flex: "0 0 auto",
        }}
      />
      <span style={{ opacity: 0.85 }}>{L(meta.label)}</span>
    </span>
  );
}

export function MediaPermissionGate({
  audioOnly,
  stream,
  onStream,
}: {
  /** تماس صوتی — فقط میکروفون لازم است. */
  audioOnly: boolean;
  /** استریم پیش‌آزمون فعلی (مالکیت توقف ترک‌ها با والد است). */
  stream: MediaStream | null;
  /** استریم تازه را به والد می‌دهد؛ null یعنی تلاش تازه شروع شده. */
  onStream: (stream: MediaStream | null) => void;
}) {
  const [snapshot, setSnapshot] = useState<MediaPermissionSnapshot | null>(null);
  const [blocked, setBlocked] = useState("");
  const [softHint, setSoftHint] = useState("");
  const [asking, setAsking] = useState(false);
  const mountedRef = useRef(true);
  const autoTriedRef = useRef(false);
  const L = useL();

  const refreshSnapshot = useCallback(() => {
    void queryMediaPermissions()
      .then((value) => {
        if (mountedRef.current) setSnapshot(value);
      })
      .catch(() => { /* نشانگر وضعیت اختیاری است */ });
  }, []);

  /** درخواست مجوز — تلاش خودکار هنگام ورود، و در لمسِ دکمه مسیر تضمینی.
   * خروجیِ ناموفقِ «denied» راهنمای کامل رفع انسداد می‌آورد؛ بقیه فقط
   * راهنمای ملایم «دکمه را بزنید» نشان می‌دهد. */
  const requestPermissions = useCallback(
    async (auto = false) => {
      if (asking) return;
      setAsking(true);
      setBlocked("");
      setSoftHint("");
      onStream(null);
      const result = await acquireMediaStream(audioOnly ? "audio" : "both");
      if (!mountedRef.current) {
        if (result.ok) result.stream.getTracks().forEach((track) => track.stop());
        return;
      }
      if (result.ok) {
        onStream(result.stream);
        setBlocked("");
      } else if (result.denied) {
        const guide = permissionUnblockGuide(undefined, audioOnly);
        setBlocked(`${result.message}\n${guide}`);
      } else if (auto) {
        // بدون لمس کاربر پنجرهٔ مجوز باز نشد (رفتار iOS) — ملایم اطلاع می‌دهیم
        setBlocked("");
        setSoftHint(
          audioOnly
            ? L("برای باز شدن پنجرهٔ مجوز میکروفون، دکمهٔ «اجازهٔ میکروفون» را بزنید — پنجرهٔ مجوز فوراً نمایش داده می‌شود.")
            : L("برای باز شدن پنجرهٔ مجوز دوربین و میکروفون، دکمهٔ «اجازهٔ دسترسی» را بزنید — پنجرهٔ مجوز فوراً نمایش داده می‌شود."),
        );
      } else {
        setBlocked(result.message);
      }
      refreshSnapshot();
      setAsking(false);
    },
    [asking, audioOnly, onStream, refreshSnapshot],
  );

  // ارجاع پایدار برای تلاش خودکار — بدون وابستگی به نسخهٔ تابع در هر رندر
  const requestPermissionsRef = useRef(requestPermissions);
  requestPermissionsRef.current = requestPermissions;

  // تلاش خودکار هنگام ورود به صفحهٔ جلسه — پنجرهٔ مجوز بی‌درنگ باز می‌شود.
  useEffect(() => {
    mountedRef.current = true;
    refreshSnapshot();
    if (!autoTriedRef.current) {
      autoTriedRef.current = true;
      void requestPermissionsRef.current(true);
    }
    return () => {
      mountedRef.current = false;
    };
  }, [refreshSnapshot]);

  const micMeta = permMeta(snapshot?.mic ?? "unknown");

  return (
    <div style={{ padding: "10px 20px 0", display: "grid", gap: 10 }}>
      {/* نشانگر وضعیت مجوزها — کاربر می‌بیند کدام دسترسی داده شده/نشده */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        <PermChip state={snapshot?.mic ?? "unknown"} label={L("میکروفون")} icon="mic" />
        {!audioOnly ? <PermChip state={snapshot?.camera ?? "unknown"} label={L("دوربین")} icon="video" /> : null}
        {stream ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 12px",
              borderRadius: 999,
              ...glassStyle({ background: "rgba(157,197,100,.16)", borderColor: "rgba(157,197,100,.4)" }),
              color: "#d7e6b8",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            <Icon name="check" size={12} stroke={2.4} />
            {audioOnly ? L("میکروفون آماده است") : L("دوربین و میکروفون آماده‌اند")}
          </span>
        ) : null}
      </div>

      {/* دکمهٔ مجوز — در لمسِ همین دکمه، پنجرهٔ مجوز گوشی/مرورگر فوراً باز می‌شود */}
      {!stream ? (
        <>
          <button
            type="button"
            onClick={() => void requestPermissions(false)}
            disabled={asking}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "13px 0",
              borderRadius: 16,
              border: 0,
              background: asking
                ? "rgba(255,255,255,.10)"
                : "linear-gradient(145deg, #b8923c, #d8b869)",
              color: "#fffaf0",
              fontSize: 13.5,
              fontWeight: 800,
              cursor: asking ? "wait" : "pointer",
              fontFamily: "inherit",
              boxShadow: asking ? "none" : "0 8px 22px rgba(139,104,31,.35)",
            }}
          >
            <Icon name={audioOnly ? "mic" : "camera"} size={17} stroke={2.1} />
            {asking
              ? audioOnly
                ? L("در حال بازکردن پنجرهٔ مجوز میکروفون…")
                : L("در حال بازکردن پنجرهٔ مجوز دوربین…")
              : audioOnly
                ? L("اجازهٔ میکروفون + تست صدا")
                : L("اجازهٔ دوربین و میکروفون + تست")}
          </button>
          {!blocked && !softHint ? (
            <span style={{ fontSize: 11, lineHeight: 1.9, color: "#a9b39b", textAlign: "center" }}>
              {audioOnly
                ? L("پنجرهٔ مجوز میکروفون به‌صورت خودکار باز می‌شود؛ «اجازه دادن» را بزنید.")
                : L("پنجرهٔ مجوز دوربین و میکروفون به‌صورت خودکار باز می‌شود؛ «اجازه دادن» را بزنید.")}
            </span>
          ) : null}
        </>
      ) : null}

      {/* راهنمای ملایم — پنجرهٔ مجوز بدون لمس باز نشده و منتظر لمس کاربر است */}
      {softHint && !stream && !blocked ? (
        <span
          role="status"
          style={{
            padding: "10px 13px",
            borderRadius: 14,
            background: "rgba(191,149,64,.12)",
            border: "1px solid rgba(191,149,64,.3)",
            color: "#e8dcbc",
            fontSize: 11.5,
            lineHeight: 1.9,
            fontWeight: 600,
            display: "block",
          }}
        >
          {softHint}
        </span>
      ) : null}

      {/* انسداد مجوز — راهنمای دقیق همان دستگاه + بررسی دوباره بدون رفرش صفحه */}
      {blocked ? (
        <div
          role="alert"
          style={{
            padding: "13px 15px",
            borderRadius: 16,
            background: "rgba(191,149,64,.13)",
            border: "1px solid rgba(191,149,64,.35)",
            display: "grid",
            gap: 9,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#e7d5a8", fontSize: 12.5, fontWeight: 800 }}>
            <Icon name="info" size={15} />
            {L("دسترسی مسدود شده است")}
          </div>
          <span style={{ fontSize: 11.8, lineHeight: 2, color: "#e8dcbc", whiteSpace: "pre-line" }}>
            {blocked.split("\n").map((line, index) => (
              <span key={index} style={{ display: "block" }}>
                {L(line)}
              </span>
            ))}
          </span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => void requestPermissions(false)}
              style={{
                border: 0,
                borderRadius: 12,
                padding: "8px 16px",
                background: colors.gold,
                color: colors.onGold,
                fontWeight: 800,
                fontSize: 12.5,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {L("تلاش دوباره برای دریافت مجوز")}
            </button>
            <button
              type="button"
              onClick={refreshSnapshot}
              style={{
                border: "1px solid rgba(191,149,64,.45)",
                borderRadius: 12,
                padding: "8px 16px",
                background: "transparent",
                color: "#e7d5a8",
                fontWeight: 800,
                fontSize: 12.5,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {L("بررسی وضعیت مجوزها")}
            </button>
          </div>
          <span style={{ fontSize: 10.5, color: micMeta.dot === "#e08a7a" ? "#e08a7a" : "#a9b39b", fontWeight: 700 }}>
            {L("وضعیت")}: {L("میکروفون")} {L(micMeta.label)}
            {!audioOnly
              ? ` · ${L("دوربین")} ${L(permMeta(snapshot?.camera ?? "unknown").label)}`
              : L(" · تماس درون‌اپی — شماره‌ها پنهان می‌مانند")}
          </span>
        </div>
      ) : null}
    </div>
  );
}
