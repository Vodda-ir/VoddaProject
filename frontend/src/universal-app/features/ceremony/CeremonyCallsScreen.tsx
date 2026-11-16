"use client";

// «فراخوان‌های من» — فهرست فراخوان‌های مراسم برگزارکننده با وضعیت و تعداد
// پذیرش‌ها؛ لمس هر کارت جزئیات را باز می‌کند.

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { localizedDigits } from "../../ui/persian";
import { useAppearance } from "../../ui/appearance";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  colors,
  shadows,
  spacing,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { getCeremonyCalls } from "./api";
import { ToneChip, TopicIcon, callStatusMeta, ceremonyWhenLabel, formatBudgetRange } from "./elements";
import type { CeremonyCallView } from "./types";

const cardStyle: CSSProperties = {
  width: "100%",
  display: "grid",
  gap: 10,
  padding: 15,
  textAlign: "right",
  border: `1px solid ${colors.sand150}`,
  borderRadius: 20,
  background: colors.surface,
  boxShadow: "0 0 6px rgba(46,54,34,.04)",
  cursor: "pointer",
  fontFamily: "inherit",
  color: colors.ink,
};

function CallRow({ view, onOpen }: { view: CeremonyCallView; onOpen: () => void }) {
  const { L, lang } = useAppearance();
  const call = view.call;
  if (!call) return null;
  const tone = callStatusMeta[call.status];
  return (
    <button type="button" onClick={onOpen} className="vodda-tappable vodda-enter" style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: 14, background: colors.olive50, color: colors.olive600, flex: "0 0 42px" }}>
          <TopicIcon icon={call.icon} size={20} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ display: "block", fontSize: 14.5, fontWeight: 800, color: colors.ink }}>{call.title}</strong>
          <span style={{ display: "block", fontSize: 12, color: colors.inkMuted, marginTop: 2 }}>
            {ceremonyWhenLabel(call, lang)} · {call.city || L("شهر نامشخص")}
          </span>
        </div>
        <Icon name="chevronL" size={16} style={{ color: colors.inkFaint, flex: "0 0 auto" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <ToneChip tone={tone} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: colors.inkSecondary, background: colors.sand100, border: `1px solid ${colors.sand200}`, borderRadius: 999, padding: "3px 9px" }}>
          <Icon name="bell" size={11} />
          {localizedDigits(call.offer_count, lang)} {L("پذیرش")}
        </span>
        <span style={{ fontSize: 11.5, color: colors.inkMuted, marginInlineStart: "auto" }}>
          {formatBudgetRange(call.budget_min, call.budget_max, lang)}
        </span>
      </div>
    </button>
  );
}

export function CeremonyCallsScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const { L, lang } = useAppearance();
  const [views, setViews] = useState<CeremonyCallView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setViews(await getCeremonyCalls(runtime));
    } catch (caught) {
      setError(messageOf(caught, "دریافت فراخوان‌های شما ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }, [runtime]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label={L("در حال دریافت فراخوان‌های شما…")} />;

  if (error) {
    return (
      <ErrorState
        title={L("دریافت فراخوان‌ها ناموفق بود")}
        description={L(error)}
        action={<Button onClick={() => void load()}>{L("تلاش دوباره")}</Button>}
      />
    );
  }

  if (views.length === 0) {
    return (
      <div className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
        <EmptyState
          icon={<Icon name="calendar" size={30} />}
          title={L("هنوز فراخوانی نساخته‌اید")}
          description={L("برای مراسم خود فراخوان بگذارید تا قاریان حق‌الزحمه‌شان را اعلام کنند.")}
        />
        <Button fullWidth onClick={() => navigateApp("/ceremony/new", config)} style={{ minHeight: 50 }}>
          {L("🔔 فراخوان مراسم جدید")}
        </Button>
      </div>
    );
  }

  return (
    <div className="vodda-screen" style={{ display: "grid", gap: spacing.md }}>
      <p style={{ margin: 0, fontSize: 12, color: colors.inkMuted, lineHeight: 1.9 }}>
        {L("{count} فراخوان ثبت کرده‌اید؛ وضعیت پذیرش‌ها را همین‌جا پیگیری کنید.").replace("{count}", localizedDigits(views.length, lang))}
      </p>
      {views.map((view) => (
        <CallRow key={view.call?.id ?? 0} view={view} onOpen={() => view.call && navigateApp(`/ceremony/calls/${view.call.id}`, config)} />
      ))}
      <Card style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, borderRadius: 18, background: colors.goldBackground, borderColor: colors.goldSoft }}>
        <Icon name="sparkle" size={18} style={{ color: colors.goldDark, flex: "0 0 auto" }} />
        <p style={{ margin: 0, fontSize: 12, color: colors.goldDark, lineHeight: 1.8 }}>
          {L("مراسم دیگری در پیش دارید؟ یک فراخوان تازه بسازید.")}
        </p>
        <Button variant="secondary" style={{ minHeight: 42, paddingInline: 14, flex: "0 0 auto" }} onClick={() => navigateApp("/ceremony/new", config)}>
          {L("فراخوان جدید")}
        </Button>
      </Card>
    </div>
  );
}
