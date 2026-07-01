# RoomMate — Design System (MASTER)

Global source of truth for RoomMate's UI. Every page and component derives its
colors, type, spacing, and motion from the tokens here. Page-specific deviations
live in `design-system/pages/<page>.md` and override this file for that page only.

Direction: **warm & homey**, executed to avoid the generic "AI-generated" look
(cream + serif + terracotta). The two most identifying axes are deliberately
moved: the display face is a **grotesque, not a serif**, and the brand accent is
**honey amber, not terracotta**.

## Signature element — the occupancy latch

The vacant/occupied slider from bathroom and airplane doors. A pill that slides
between **Vacant** (sage) and **Occupied** (clay), reused on room cards, calendar
cells, and detail headers. This is the one memorable element — everything around
it stays quiet and disciplined. Animates 150–250ms ease-out; respects
`prefers-reduced-motion` (cross-fade the label instead of sliding).

## Color tokens

Semantic tokens only — never hardcode raw hex in components. Both themes are
authored together; dark mode uses lighter/desaturated tonal variants, not inverts.

| Token       | Light     | Dark      | Use                          |
| ----------- | --------- | --------- | ---------------------------- |
| paper (bg)  | `#F7F4EF` | `#1E1A17` | app background               |
| surface     | `#FFFFFF` | `#2A2420` | cards, sheets                |
| ink         | `#2A2320` | `#F3ECE3` | primary text                 |
| muted       | `#6F655C` | `#A99E92` | secondary text               |
| primary     | `#DE9A38` | `#F0B457` | brand, primary CTA (honey)   |
| on-primary  | `#2A2320` | `#241C10` | text/icon on primary fill    |
| available   | `#5B8C6E` | `#7FB08D` | free / success (sage)        |
| occupied    | `#C0533A` | `#E07A54` | booked / danger (clay)       |
| border      | `#E7DFD5` | `#3A332D` | hairlines, dividers          |
| ring        | `#DE9A38` | `#F0B457` | focus ring (2px, visible)    |

Contrast: all text/background pairs meet WCAG AA (4.5:1 body, 3:1 large). Status
is never conveyed by color alone — the latch and cells carry a text label
(Vacant/Occupied) and/or icon.

## Typography

| Role    | Family              | Weights | Notes                                   |
| ------- | ------------------- | ------- | --------------------------------------- |
| Display | Bricolage Grotesque | 600/700 | headings, hero — characterful, warm     |
| Body    | Inter               | 400/500 | UI text, paragraphs                     |
| Data    | IBM Plex Mono       | 400/500 | times, schedule columns — tabular figs  |

Type scale: 12 · 14 · 16 (base) · 18 · 24 · 32 · 44. Line-height 1.5 body,
1.15–1.2 display. Body ≥16px on mobile (avoids iOS auto-zoom). Use tabular
figures for all time/schedule data to prevent layout shift.

## Shape, elevation, spacing

- Radius: cards 14px, controls 10px, latch/pills full.
- Shadow: soft, warm-tinted, low elevation. One consistent elevation scale
  (card → popover → sheet → modal); no random shadow values.
- Spacing: 4/8pt rhythm. Section vertical rhythm tiers 16 / 24 / 32 / 48.
- Container: max-w-6xl on desktop; comfortable gutters that widen on large screens.

## Motion

- Micro-interactions 150–250ms; ease-out entering, ease-in exiting; exits ~60–70%
  of enter duration. No linear easing on UI.
- Animate transform/opacity only (never width/height/top/left) — no CLS.
- Animate 1–2 key elements per view. Always honor `prefers-reduced-motion`.

## Baseline rules (non-negotiable)

- Accessibility: visible focus rings (2px `ring`), keyboard nav matches visual
  order, labels on all inputs, aria-labels on icon-only buttons, headings
  sequential. (ui-ux-pro-max §1)
- Touch: targets ≥44×44px, ≥8px spacing, feedback within 100ms. (§2)
- Forms: visible labels (not placeholder-only), error below field + `role="alert"`,
  validate on blur, loading→success/error on submit, confirm destructive actions. (§8)
- Responsive: mobile-first, breakpoints 375 / 768 / 1024 / 1440, no horizontal
  scroll, `min-h-dvh` over `100vh`. (§5)
- Icons: Lucide (single set, consistent stroke); never emoji as structural icons.
- Perf: route-level code splitting, lazy below-the-fold, skeletons for >300ms
  loads, virtualize lists 50+. (react-best-practices)

## Theme mechanics

System-aware with manual override: `.dark` class on `<html>` (toggle persists to
localStorage; defaults to `prefers-color-scheme`). Tokens are CSS variables mapped
into Tailwind v4 `@theme`, so `bg-paper`, `text-ink`, `bg-primary`, etc. resolve
per theme automatically.
