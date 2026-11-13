"use client";

// «قاریان حضوری» — کاتالوگ عمومی قاریان مراسم با فیلتر شهر و خدمت رسمی.

import { useCallback, useEffect, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import { navigateApp } from "../../router";
import { toFaDigits } from "../../ui/persian";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  colors,
  shadows,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { TierBadge } from "../teachers/TierBadge";
import { getInPersonCatalog, getPresenceProviders } from "./api";
import { chipStyle, formatToman, inputStyle } from "./elements";
import { SelectField } from "./fields";
import type { OfficialInPersonService, PresenceProvider } from "./types";

function ProviderCard({ provider, onOpen }: { provider: PresenceProvider; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="vodda-tappable vodda-enter"
      style={{
        width: "100%",
        display: "grid",
        gap: 10,
        padding: 15,
        textAlign: "right",
        border: `1px solid ${colors.sand150}`,
        borderRadius: 20,
        background: colors.surface,
        boxShadow: shadows.sm,
        cursor: "pointer",
        fontFamily: typography.fontFamily,
        color: colors.ink,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <Avatar name={provider.name} src={provider.avatar_url || undefined} size={52} ring={false} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 15, fontWeight: 800, color: colors.ink }}>{provider.name}</strong>
            <TierBadge tier={provider.tier} />
          </div>
          <span style={{ display: "block", fontSize: 12, color: colors.olive700, marginTop: 2 }}>
            {provider.tag || provider.field || "قاری قرآن"}
            {provider.city ? ` · 📍 ${provider.city}` : ""}
            {provider.reviews > 0 ? ` · ⭐ ${toFaDigits(provider.rating.toFixed(1))} (${toFaDigits(provider.reviews)})` : ""}
            {provider.sessions > 0 ? ` · ${toFaDigits(provider.sessions)} مراسم` : ""}
          </span>
        </div>
        <Icon name="chevronL" size={16} style={{ color: colors.inkFaint, flex: "0 0 auto" }} />
      </div>
      {provider.services.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {provider.services.slice(0, 3).map((service) => (
            <span key={service.id} style={chipStyle}>
              {service.title}
            </span>
          ))}
          {provider.services.length > 3 ? (
            <span style={chipStyle}>+{toFaDigits(provider.services.length - 3)}</span>
          ) : null}
        </div>
      ) : null}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {provider.samples.length > 0 ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, color: colors.olive700 }}>
            <Icon name="headphones" size={13} />
            {toFaDigits(provider.samples.length)} نمونهٔ صوتی
          </span>
        ) : null}
        {provider.services.length > 0 ? (
          <span style={{ marginInlineStart: "auto", fontSize: 11.5, color: colors.inkMuted }}>
            از {formatToman(Math.min(...provider.services.map((service) => service.base_price)))}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function PresenceScreen({ config }: { config: UniversalAppConfig }) {
  const runtime = usePlatform();
  const [catalog, setCatalog] = useState<OfficialInPersonService[]>([]);
  const [providers, setProviders] = useState<PresenceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [appliedCity, setAppliedCity] = useState("");
  // فیلتر خدمت را می‌توان از دیگر صفحات (جستجوی خدمات) با ?service=<id> فرستاد.
  const [serviceId, setServiceId] = useState(() => {
    if (typeof window === "undefined") return 0;
    return Number(new URLSearchParams(window.location.search).get("service") ?? 0) || 0;
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await getPresenceProviders(runtime, {
        city: appliedCity,
        officialServiceId: serviceId || undefined,
      });
      setProviders(rows);
    } catch (caught) {
      setError(messageOf(caught, "دریافت فهرست قاریان حضوری ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }, [appliedCity, runtime, serviceId]);

  useEffect(() => {
    void getInPersonCatalog(runtime)
      .then(setCatalog)
      .catch(() => { /* فیلتر خدمت اختیاری است؛ خطای کاتالوگ فهرست را نمی‌بندد */ });
  }, [runtime]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeService = catalog.find((item) => item.id === serviceId) ?? null;

  return (
    <div className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
      <div
        className="vodda-enter"
        style={{
          borderRadius: 22,
          padding: 20,
          color: colors.surface,
          background: "linear-gradient(145deg, #8b681f 0%, #bf9540 60%, #d4ab52 100%)",
          boxShadow: "0 14px 34px rgba(139,104,31,.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 15, background: "rgba(255,255,255,.16)" }}>
            <Icon name="users" size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>قاریان حضوری</h1>
            <span style={{ fontSize: 12.5, opacity: 0.9 }}>قاری مراسم خود را ببینید، بشنوید و مستقیم رزرو کنید</span>
          </div>
        </div>
      </div>

      <Card style={{ padding: 15, borderRadius: 20, display: "grid", gap: spacing.md }}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedCity(cityQuery.trim());
          }}
          style={{ display: "flex", gap: spacing.sm }}
        >
          <input
            type="search"
            value={cityQuery}
            onChange={(event) => setCityQuery(event.target.value)}
            placeholder="فیلتر شهر؛ مثلاً قم…"
            style={{ ...inputStyle, flex: 1 }}
            aria-label="فیلتر شهر"
          />
          <Button type="submit" variant="secondary" style={{ minHeight: 46, paddingInline: 16, flex: "0 0 auto" }}>
            <Icon name="search" size={17} />
            جستجو
          </Button>
        </form>
        {catalog.length > 0 ? (
          <SelectField
            label="فیلتر خدمت حضوری"
            ariaLabel="فیلتر خدمت حضوری"
            value={serviceId === 0 ? "" : String(serviceId)}
            onChange={(next) => setServiceId(Number(next) || 0)}
            options={[
              { value: "", label: "همهٔ خدمات حضوری" },
              ...catalog.map((item) => ({ value: String(item.id), label: item.title })),
            ]}
          />
        ) : null}
        {appliedCity || activeService ? (
          <p style={{ margin: 0, fontSize: 11.5, color: colors.inkMuted }}>
            فیلتر فعال: {appliedCity ? `شهر «${appliedCity}»` : ""}{appliedCity && activeService ? " · " : ""}{activeService ? activeService.title : ""}
            {" — "}
            <button
              type="button"
              onClick={() => { setCityQuery(""); setAppliedCity(""); setServiceId(0); }}
              style={{ border: 0, background: "none", color: colors.olive700, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 700, padding: 0 }}
            >
              پاک کردن فیلترها
            </button>
          </p>
        ) : null}
      </Card>

      {loading ? (
        <LoadingState label="در حال دریافت قاریان حضوری…" />
      ) : error ? (
        <ErrorState
          title="دریافت قاریان ناموفق بود"
          description={error}
          action={<Button onClick={() => void load()}>تلاش دوباره</Button>}
        />
      ) : providers.length === 0 ? (
        <EmptyState
          icon={<Icon name="users" size={30} />}
          title="قاری‌ای پیدا نشد"
          description="با فیلترهای دیگر جستجو کنید؛ قاریان جدید به‌تدریج به این فهرست افزوده می‌شوند."
        />
      ) : (
        <div style={{ display: "grid", gap: spacing.md }}>
          {providers.map((provider) => (
            <ProviderCard
              key={provider.teacher_id}
              provider={provider}
              onOpen={() => navigateApp(`/presence/${provider.teacher_id}`, config)}
            />
          ))}
        </div>
      )}

      <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted, lineHeight: 1.9 }}>
        برای میزبانی مراسم خود می‌توانید فراخوان بگذارید تا قاریان مناسب، خودشان اعلام آمادگی کنند.
        {" "}
        <button
          type="button"
          onClick={() => navigateApp("/ceremony/new", config)}
          style={{ border: 0, background: "none", color: colors.goldDark, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 800, padding: 0 }}
        >
          ثبت فراخوان مراسم
        </button>
      </p>

      {providers.length > 0 && !loading && !error ? (
        <span style={{ ...typography.caption, textAlign: "center", color: colors.inkFaint }}>
          {toFaDigits(providers.length)} قاری حضوری
        </span>
      ) : null}
    </div>
  );
}
