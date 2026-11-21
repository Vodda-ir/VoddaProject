"use client";

// ------------------------------------------------------------------------
// منوی کشویی زیبای وُدّا — انتخاب‌گر مشترک خدمات/موضوعات در اپ یونیورسال.
//
// جایگزین چیپ‌ها و کادرهای فشرده: یک تریگر شیشه‌ای با آیکون و زیرنویس که
// پنلِ شناورِ گروه‌بندی‌شده را باز می‌کند — با جستجوی درون‌منو، آیکون هر
// گزینه، نشان اختیاری و تیکِ گزینهٔ فعلی. کاملاً RTL/LTR (ویژگی‌های منطقی)
// و با کیبورد و اسکرین‌ریدر (listbox/option + Escape + کلیک بیرون).
// ------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { colors, shadows, typography } from "./theme";
import { localizedDigits } from "./persian";
import { useAppearance } from "./appearance";

export type MenuOption = {
  /** مقدار یکتا — همان مقدار به onPick برگردانده می‌شود. */
  key: string;
  title: string;
  /** زیرنویس کم‌رنگ (مثلاً «۴۵ دقیقه · ۱۰۰٬۰۰۰ تومان»). */
  sub?: string;
  icon?: string;
  /** نشان کوچک روی عنوان (مثلاً «حضوری» یا «تلفنی»). */
  badge?: string;
  /** تم طلایی برای خدمات حضوری/رایگان. */
  gold?: boolean;
};

export type MenuGroup = {
  title: string;
  items: MenuOption[];
};

export function MenuSelect({
  ariaLabel,
  placeholder,
  displayTitle,
  displaySub,
  displayIcon,
  displayGold = false,
  groups,
  onPick,
  searchable = false,
  searchPlaceholder,
  countLabel,
}: {
  ariaLabel: string;
  /** متن تریگر وقتی هنوز چیزی انتخاب نشده. */
  placeholder: string;
  /** عنوان نمایش‌داده‌شده روی تریگر (انتخاب فعلی). */
  displayTitle?: string;
  displaySub?: string;
  displayIcon?: string;
  displayGold?: boolean;
  groups: ReadonlyArray<MenuGroup>;
  onPick: (key: string) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** برچسب شمار گزینه‌ها روی تریگر (مثلاً «۵۰ خدمت»). */
  countLabel?: string;
}) {
  const { L, lang } = useAppearance();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // بستن با کلیک بیرون و Escape
  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // فوکوس خودکار جستجو هنگام باز شدن
  useEffect(() => {
    if (open && searchable) {
      const timer = window.setTimeout(() => searchRef.current?.focus(), 60);
      return () => window.clearTimeout(timer);
    }
    if (open) setQuery("");
    return undefined;
  }, [open, searchable]);

  const filteredGroups = useMemo<MenuGroup[]>(() => {
    const q = query.trim();
    if (!q) return [...groups];
    return groups
      .map((group) => ({
        title: group.title,
        items: group.items.filter(
          (item) => item.title.includes(q) || (item.sub ?? "").includes(q) || group.title.includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  const total = useMemo(() => groups.reduce((sum, group) => sum + group.items.length, 0), [groups]);
  const hasSelection = Boolean(displayTitle);

  return (
    <div ref={rootRef} style={{ position: "relative", minWidth: 0 }}>
      {/* ─── تریگر ─── */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={L(ariaLabel)}
        onClick={() => setOpen((value) => !value)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          width: "100%",
          minWidth: 0,
          padding: 13,
          textAlign: "start",
          borderRadius: 18,
          cursor: "pointer",
          fontFamily: typography.fontFamily,
          color: colors.ink,
          background: hasSelection && displayGold ? colors.goldBackground : colors.surface,
          border: `1.5px solid ${open ? colors.olive600 : hasSelection && displayGold ? colors.goldSoft : colors.sand200}`,
          boxShadow: open ? "0 0 0 3px rgba(76,90,54,.12)" : "none",
          transition: "border-color .2s ease, box-shadow .2s ease",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 42,
            height: 42,
            display: "grid",
            placeItems: "center",
            flex: "0 0 42px",
            borderRadius: 14,
            background:
              hasSelection && displayGold
                ? "linear-gradient(145deg,#d8b869,#b8923c)"
                : hasSelection
                  ? colors.olive600
                  : colors.olive50,
            color: hasSelection ? (displayGold ? "#fffaf0" : colors.onOlive) : colors.olive600,
            border: hasSelection ? "transparent" : `1px solid ${colors.olive100}`,
          }}
        >
          <Icon name={(displayIcon ?? "list") as "list"} size={19} />
        </span>
        <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
          {hasSelection ? (
            <>
              <strong style={{ fontSize: 13.5, fontWeight: 800, display: "block" }}>{displayTitle}</strong>
              {displaySub ? (
                <span style={{ fontSize: 11, color: colors.inkMuted, display: "block" }}>{displaySub}</span>
              ) : null}
            </>
          ) : (
            <span style={{ fontSize: 13.5, fontWeight: 700, color: colors.inkMuted }}>{placeholder}</span>
          )}
        </span>
        {countLabel && total > 0 ? (
          <span
            style={{
              flex: "0 0 auto",
              display: "inline-flex",
              alignItems: "center",
              padding: "3px 10px",
              borderRadius: 999,
              background: colors.sand100,
              border: `1px solid ${colors.sand200}`,
              color: colors.inkSecondary,
              fontSize: 10.5,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {localizedDigits(total, lang)} {countLabel}
          </span>
        ) : null}
        <Icon
          name="chevronL"
          size={16}
          stroke={2.2}
          aria-hidden="true"
          style={{
            flex: "0 0 auto",
            color: colors.inkMuted,
            transform: open ? "rotate(-90deg)" : "rotate(90deg)",
            transition: "transform .2s ease",
          }}
        />
      </button>

      {/* ─── پنل شناور ─── */}
      {open ? (
        <div
          role="listbox"
          aria-label={L(ariaLabel)}
          className="vodda-enter"
          style={{
            position: "absolute",
            insetInline: 0,
            top: "calc(100% + 6px)",
            zIndex: 60,
            background: colors.surface,
            border: `1px solid ${colors.sand200}`,
            borderRadius: 18,
            boxShadow: shadows.lg,
            maxHeight: 340,
            overflowY: "auto",
            padding: 8,
          }}
        >
          {searchable ? (
            <div style={{ position: "relative", marginBottom: 6, padding: 2 }}>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder ?? L("جستجو…")}
                aria-label={L("جستجو در فهرست")}
                style={{
                  width: "100%",
                  padding: "10px 38px 10px 13px",
                  borderRadius: 13,
                  border: `1px solid ${colors.sand200}`,
                  background: colors.sand50,
                  color: colors.ink,
                  fontSize: 13,
                  fontFamily: typography.fontFamily,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <Icon
                name="search"
                size={16}
                aria-hidden="true"
                style={{
                  position: "absolute",
                  insetInlineEnd: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: colors.inkMuted,
                }}
              />
            </div>
          ) : null}

          {total === 0 ? (
            <p style={{ margin: 0, padding: "18px 12px", fontSize: 12.5, color: colors.inkMuted, textAlign: "center" }}>
              {L("گزینه‌ای برای نمایش وجود ندارد")}
            </p>
          ) : filteredGroups.length === 0 ? (
            <p style={{ margin: 0, padding: "18px 12px", fontSize: 12.5, color: colors.inkMuted, textAlign: "center" }}>
              {L("چیزی matching نشد؛ عبارت دیگری را جستجو کنید")}
            </p>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.title} style={{ marginBottom: 6 }}>
                <strong
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 800,
                    color: colors.olive700,
                    padding: "6px 10px 4px",
                    letterSpacing: 0.2,
                  }}
                >
                  {group.title}
                </strong>
                {group.items.map((item) => {
                  const selected = hasSelection && item.title === displayTitle;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                        onPick(item.key);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        minWidth: 0,
                        padding: "9px 10px",
                        marginInline: 2,
                        borderRadius: 13,
                        textAlign: "start",
                        cursor: "pointer",
                        fontFamily: typography.fontFamily,
                        color: colors.ink,
                        background: selected ? colors.olive50 : "transparent",
                        border: "none",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 34,
                          height: 34,
                          display: "grid",
                          placeItems: "center",
                          flex: "0 0 34px",
                          borderRadius: 11,
                          background: item.gold ? colors.goldBackground : colors.olive50,
                          color: item.gold ? colors.goldDark : colors.olive600,
                          border: `1px solid ${item.gold ? colors.goldSoft : colors.olive100}`,
                        }}
                      >
                        <Icon name={(item.icon ?? "book") as "book"} size={16} />
                      </span>
                      <span style={{ minWidth: 0, flex: 1, display: "grid", gap: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {item.title}
                          {item.badge ? (
                            <span
                              style={{
                                padding: "1px 8px",
                                borderRadius: 999,
                                fontSize: 9.5,
                                fontWeight: 800,
                                color: item.gold ? colors.goldDark : colors.greenInk,
                                background: item.gold ? colors.surface : colors.greenChip,
                                border: `1px solid ${item.gold ? colors.goldSoft : colors.olive100}`,
                              }}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </span>
                        {item.sub ? (
                          <span style={{ fontSize: 10.5, color: colors.inkMuted, display: "block" }}>{item.sub}</span>
                        ) : null}
                      </span>
                      {selected ? (
                        <Icon name="check" size={15} stroke={2.4} aria-hidden="true" style={{ flex: "0 0 auto", color: colors.olive600 }} />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
