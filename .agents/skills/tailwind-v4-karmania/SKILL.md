---
name: tailwind-v4-karmania
description: Enforce Karmania's Tailwind CSS v4 conventions for canonical utilities, exact spacing, responsive variants, RTL/LTR, accessibility, and Tailwind-only styling. Load for any frontend task that adds, edits, reviews, or cleans Tailwind classes under frontends/**.
---

# Tailwind CSS v4 — Karmania canonical utility rules

Use this skill together with `frontends/AGENTS.md` and `docs/UI_DESIGN.md` for every web UI change.

## Blocking rules

1. Prefer the canonical Tailwind v4 utility whenever it expresses the exact same value.
2. Do not leave `tailwindCSS(suggestCanonicalClasses)` warnings in files you materially edit.
3. Arbitrary values are allowed only when no exact canonical utility exists or the value is genuinely structural/semantic, such as a complex `grid-template`, `clamp()`, `calc()`, `color-mix()`, custom shadow, SVG-related value, or project token expression.
4. Never replace an exact design value with an approximate scale value merely to remove a warning. Canonicalization must preserve computed output.
5. Karmania remains Tailwind-only: no authored visual CSS, `@apply`, CSS Modules, styled-components, inline `<style>`, or handwritten keyframes.

## Tailwind v4 spacing model

Tailwind v4 derives spacing utilities from `--spacing`, whose default step is `0.25rem` / `4px`. Numeric spacing utilities can therefore represent values that previously needed arbitrary pixel syntax.

For exact literal spacing/size values, convert pixels to Tailwind units with:

`tailwind value = pixels / 4`

Examples:

- `pb-[92px]` → `pb-23`
- `pt-[156px]` → `pt-39`
- `mt-[18px]` → `mt-4.5`
- `gap-[70px]` → `gap-17.5`
- `size-[52px]` → `size-13`
- `max-w-[620px]` → `max-w-155`
- `min-h-[34px]` → `min-h-8.5`

Apply this to spacing-driven utilities such as padding, margin, gap, inset/position offsets, width/height/size, min/max dimensions, and translate values when Tailwind v4 supports an exact numeric form.

## Responsive canonicalization

Prefer named breakpoints when they are exactly equivalent to the project's existing arbitrary breakpoint:

- `max-[640px]:...` → `max-sm:...`
- `max-[1023px]:...` → `max-lg:...`

Keep an arbitrary breakpoint when it intentionally does not match a Tailwind breakpoint.

## Keep arbitrary values when they are genuinely custom

These are normally valid and should not be rewritten just to look shorter:

- `grid-cols-[minmax(0,.9fr)_minmax(520px,1.1fr)]`
- `text-[clamp(17px,1.8vw,24px)]`
- `bg-[color-mix(in_srgb,...)]`
- `shadow-[0_20px_60px_rgba(...)]`
- values containing complex `calc()` or browser-specific syntax

If Tailwind IntelliSense suggests a canonical class, verify that the generated/computed CSS remains equivalent before applying the suggestion.

## Workflow for every edited frontend file

1. Read the existing component and project UI rules first.
2. Use canonical Tailwind v4 utilities while implementing.
3. Before finishing, scan every touched `className`/CVA/class preset for literal arbitrary spacing values.
4. Resolve safe `suggestCanonicalClasses` warnings.
5. Preserve complex arbitrary values that have no exact canonical replacement.
6. Check responsive behavior in Persian RTL and English LTR.
7. Respect `prefers-reduced-motion` for non-essential motion.

## Source of truth

- Tailwind CSS v4 documentation: https://tailwindcss.com/docs
- Tailwind CSS v4 release notes and dynamic utility values: https://tailwindcss.com/blog/tailwindcss-v4
- Tailwind editor setup / IntelliSense: https://tailwindcss.com/docs/editor-setup

When this skill conflicts with a Karmania-specific rule, the Karmania rule wins.