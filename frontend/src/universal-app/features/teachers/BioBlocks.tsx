"use client";

// «دربارهٔ استاد / دربارهٔ قاری» — یک کامپوننت مشترک برای هر دو پروفایل.
//
// بیوهای ثبت‌شده سه شکل دارند:
//   ۱) ساختاریافته با ایموجی (🎯 زمینه‌های تدریس، 📍 مشخصات، بند‌های ایموجی‌دار)
//   ۲) متن چندپاراگراف ساده
//   ۳) یک بند طولانی بدون سطرشکنی
// این کامپوننت هر سه حالت را خوش‌فرم و همیشه بدون به‌هم‌ریختگی نمایش می‌دهد:
// شکستن کلمات طولانی، فاصله‌گذاری ثابت و چیپ‌های تمیز برای فهرست‌ها.

import type { CSSProperties } from "react";
import { Icon, colors } from "../../ui";

type BioBlock =
  | { kind: "para"; emoji: string; text: string }
  | { kind: "chips"; title: string; items: string[] }
  | { kind: "meta"; items: string[] };

export function parseBioBlocks(bio?: string): BioBlock[] {
  const raw = (bio ?? "").trim();
  if (!raw) return [];
  const blocks: BioBlock[] = [];
  for (const rawBlock of raw.split(/\n\s*\n/)) {
    const lines = rawBlock.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    const first = lines[0];
    if (first.startsWith("🎯")) {
      const title = first.replace(/^🎯\s*/, "").replace(/:\s*$/, "") || "زمینه‌های تدریس";
      const items = lines.slice(1).map((line) => line.replace(/^[•\-*]\s*/, "").trim()).filter(Boolean);
      blocks.push({ kind: "chips", title, items });
      continue;
    }
    if (first.startsWith("📍")) {
      const merged = lines.map((line) => line.replace(/^📍\s*/, "")).join(" ");
      blocks.push({ kind: "meta", items: merged.split("|").map((part) => part.trim()).filter(Boolean) });
      continue;
    }
    const emojiMatch = first.match(/^(\p{Extended_Pictographic})/u);
    const emoji = emojiMatch?.[1] ?? "";
    const text = emoji ? first.slice(emoji.length).trim() : first;
    blocks.push({ kind: "para", emoji, text: [text, ...lines.slice(1)].filter(Boolean).join(" ") });
  }
  return blocks;
}

const paraStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 9,
  fontSize: 13.5,
  lineHeight: 2,
  margin: 0,
  color: colors.inkSecondary,
};

export function TeacherBioBlocks({ bio, emptyLabel = "اطلاعاتی ثبت نشده است." }: { bio?: string; emptyLabel?: string }) {
  const blocks = parseBioBlocks(bio);
  if (!blocks.length) {
    return (
      <p style={{ fontSize: 14, lineHeight: 1.9, margin: "8px 0 0", color: colors.inkMuted }}>{emptyLabel}</p>
    );
  }
  return (
    <div style={{ display: "grid", gap: 10, marginTop: 10, overflowWrap: "anywhere" }}>
      {blocks.map((block, index) => {
        if (block.kind === "para") {
          return (
            <p key={index} style={paraStyle}>
              {block.emoji ? (
                <span
                  aria-hidden="true"
                  style={{ display: "grid", placeItems: "center", flex: "0 0 32px", width: 32, height: 32, marginTop: 3, borderRadius: 10, border: `1px solid ${colors.border}`, background: colors.sand50, fontSize: 14 }}
                >
                  {block.emoji}
                </span>
              ) : null}
              <span style={{ minWidth: 0 }}>{block.text}</span>
            </p>
          );
        }
        if (block.kind === "chips") {
          if (!block.items.length) return null;
          return (
            <div key={index} style={{ padding: "12px 13px", borderRadius: 16, border: `1px solid ${colors.border}`, background: colors.sand50 }}>
              <strong style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: colors.olive700 }}>
                <Icon name="sparkle" size={13} /> {block.title}
              </strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
                {block.items.map((item) => (
                  <span key={item} style={{ display: "inline-flex", padding: "5px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: colors.olive700, background: colors.olive50, border: `1px solid ${colors.olive200}` }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          );
        }
        if (!block.items.length) return null;
        return (
          <div key={index} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {block.items.map((item) => (
              <span key={item} style={{ display: "inline-flex", padding: "5px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: "#8b681f", background: colors.goldBackground, border: "1px solid rgba(191,149,64,.35)" }}>
                {item}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
