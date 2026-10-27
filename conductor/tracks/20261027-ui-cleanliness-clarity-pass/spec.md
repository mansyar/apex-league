# UI Cleanliness & Clarity Pass — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

One combined refactor track that makes the client UI cleaner and clearer
without changing game behavior: a single modal system with z-index tokens, a
consolidated broadcast kit (no duplicated chamfers, one touch-target floor, one
focus-ring rule, class-based visibility), a decluttered ranch HUD (secondary
chips grouped into a collapsible, lineage collapsed to detail-on-click), a
flow/grid ranch layout with no magic-number nudges, and a clarity + bounded
restyle pass over the brand-new Board/Ghosts/Cloud surfaces plus a full copy
voice pass.

## Problem / Motivation

The ranch screen shows ~20 interactive elements at once (score-bug, 6+ chips,
lineage plate, creature plate, dock, callout) with no hierarchy; ~14 overlays
each hand-roll `style.display` + focus-trap + Escape across 9 ad-hoc z-layers
(2/20/30/40/45/50/60/65/70/80) so adding one overlay can bury another;
`ranch.css` (1,740 lines) re-declares kit chamfers/keylines per surface and
carries its own `settle-down-centered` keyframes next to kit's `settle-up/down`;
two touch-target floors (44px ≤479.98px vs 40px ≤767.98px) fight each other;
the focus-ring allowlist in `kit.css` drifts by construction; responsive
placement depends on `:has()` sibling nudges plus hardcoded tops (228px/176px)
measured on one 393×659 device; key facts live only in `title` tooltips
invisible to touch/keyboard users; and the just-landed Board/Ghosts/Cloud
surfaces have rough empty states, ambiguous offline snapshots, and
preview-to-Fight discontinuity. If unsolved, every new chip or overlay makes
the ranch harder to read and more fragile to change.

## Goals & Success Metrics

- **Goal:** Ranch reads at a glance on desktop and phone; one modal/visibility/z system; kit is the single source for surface styling.
- **Metric:** Ranch primary action (Advance CTA) and creature state visible without scrolling at 393px both orientations; zero `style.display` toggles on migrated overlays; zero hardcoded ranch tops; `bun run verify && bun run build` green with module caps holding.
- **Goal:** New backend surfaces (Board/Ghosts/Cloud) are honest and self-explanatory.
- **Metric:** Every Board/Ghost/Cloud empty, offline, and error state has an explicit inline state (no blank tables); ghost preview maps 1:1 to the Fight intake.

## Scope

### In Scope

- Shared `openModal/closeModal` helper (display + trap + scrim-click + Escape + return-focus) + migration of all ~14 overlays + `--z-*` tokens in kit.
- Kit consolidation: chamfer/keyline/elevation utilities, single touch-target floor, generic focus-ring rule, `.is-hidden`/`[hidden]` convention replacing inline `style.display`.
- Ranch HUD: secondary chips (gift/stable/cloud/board/handbook/settings) grouped into a collapsible; lineage plate collapsible with detail-on-click; score-bug + dock hierarchy simplification.
- Ranch layout: grid/flow areas replacing absolute + `:has()` nudges and hardcoded tops; gift-chip safe.
- Board/Ghosts/Cloud clarity + bounded restyle within existing kit (no new palette): empty/offline/error states, ghost preview-to-Fight continuity.
- Full copy pass: dedupe ladder teasers, fix period/jargon drift, surface `title`-only facts inline or in ticker.

### Out of Scope

- No sim, save-schema, or voxel/generator changes; no new species, ladder tiers, battle, breeding, or audio systems.
- No hardware device-lab pass; verification is 393px both orientations + desktop via Playwright screenshots.
- No new backend endpoints; Board/Ghosts/Cloud work is presentation-only.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | A shared modal helper owns open/close (display, focus trap, scrim-click, Escape, return-focus) and all ~14 overlays use it | must |
| FR-2 | z-index is centralized as `--z-*` tokens in kit; no new magic z literals | must |
| FR-3 | Chamfer/keyline/elevation are kit utilities; surfaces keep layout only (no per-surface re-declaration) | must |
| FR-4 | A single touch-target floor applies consistently across breakpoints (no 40px-vs-44px conflict) | must |
| FR-5 | Focus-visible styling is a generic rule covering kit controls (no per-class allowlist to drift) | must |
| FR-6 | Visibility uses `.is-hidden`/`[hidden]` class toggles, not inline `style.display` writes, on migrated surfaces | must |
| FR-7 | Secondary ranch chips are grouped into a collapsible overflow; score-bug, creature plate, dock, and settings stay primary | must |
| FR-8 | Lineage plate is collapsible with detail-on-click (summary visible, full detail on demand) | must |
| FR-9 | Score-bug + dock present a clear hierarchy: phase/day/AP primary, titles/trophy secondary | should |
| FR-10 | Ranch stack uses grid/flow areas; no absolute + `:has()` sibling nudges and no hardcoded tops | must |
| FR-11 | Gift-chip appearance never overlaps lineage/stack/callout at 393px either orientation | must |
| FR-12 | Board states are explicit: empty, loading, offline-snapshot (labeled as such), and error each render inline copy | must |
| FR-13 | Ghost preview content maps 1:1 to the Fight intake (no preview-only stats or mismatched names) | must |
| FR-14 | Cloud errors and offline queue states render actionable inline copy (what happened, what to do) | must |
| FR-15 | Copy pass dedupes ladder teasers into one template and fixes period/jargon drift per guidelines voice | should |
| FR-16 | `title`-only key facts (form/branch consequences, program blurbs) are surfaced inline or in the ticker | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No behavior change to sim, save schema/migrations, or voxel pipeline |
| NFR-2 | Client/sim module caps hold (12 KB client/sim, 24 KB voxel guard) |
| NFR-3 | Reduced-motion variants preserved on every touched animation |
| NFR-4 | Keyboard: full task completion, visible focus, focus return from every modal |
| NFR-5 | 393px phone both orientations + desktop verified via Playwright screenshots; console clean |
| NFR-6 | Broadcast-kit visual language kept (chamfers, keylines, scrim-blur, no gradients); existing palette only |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Each of the ~14 overlays opens/closes via the helper; Escape, scrim-click, and return-focus work; no `style.display` writes remain on migrated paths | FR-1 |
| AC-2 | `grep -rn "z-index" apps/client/src` shows only token usages (plus the token definitions) | FR-2 |
| AC-3 | Ranch/cup/spar/board surfaces render identically via kit utilities; duplicated chamfer/keyline blocks removed | FR-3 |
| AC-4 | One touch-target rule; no overlapping 40px/44px media blocks | FR-4 |
| AC-5 | A new kit control without an explicit class still gets a correct visible focus ring | FR-5 |
| AC-6 | Visibility toggles use classes; `grep` for `.style.display =` on migrated files returns nothing | FR-6 |
| AC-7 | Ranch shows grouped overflow chip; opening it reveals gift/stable/cloud/board/handbook; primaries stay visible | FR-7 |
| AC-8 | Lineage shows summary collapsed and full detail on click, keyboard accessible | FR-8 |
| AC-9 | Score-bug/dock hierarchy readable at a glance in screenshots (desktop + 393px) | FR-9 |
| AC-10 | No `:has()` positional nudges or hardcoded ranch tops remain; layout holds with gift-chip shown/hidden | FR-10, FR-11 |
| AC-11 | Board empty/offline/error states each screenshot-verified with honest copy | FR-12, FR-14 |
| AC-12 | Ghost preview → Fight shows identical creature identity/stats/moves | FR-13 |
| AC-13 | Ladder teaser copy is a single template; rejection/tooltip copy matches voice table | FR-15, FR-16 |
| AC-14 | `bun run verify && bun run build` green; caps, typecheck, and determinism gates pass | NFR-1, NFR-2 |

## Edge Cases

- Reduced-motion on: collapsibles, modals, and layout changes animate via calm variants or instantly with no trap.
- 393px both orientations with gift-chip visible + lineage expanded: no overlap, no horizontal scroll.
- Empty stable, no gifts, logged-out cloud, offline queue non-empty, stale snapshot older than last fetch.
- Ghost with missing/partial data (pre-migration saves) previews gracefully, never blocks Fight.
- Focus return target unmounted while modal open (e.g., dock re-render): focus lands on a sane fallback.
- Mock page (`mock.css`) renders without its plate-hiding overrides.

## Dependencies

- **Tracks:** none (all prior tracks merged; Board/Ghosts/Cloud landed 2026-10-27)
- **External:** none

## Open Questions & Assumptions

- **Assumption:** Chip overflow defaults to collapsed on phone, expanded-or-collapsed by available width on desktop; implementer picks the breakpoint and screenshots both.
- **Assumption:** Lineage collapsed-by-default on phone, summary-visible on desktop; same breakpoint treatment.
- **Assumption:** Board restyle stays inside the existing kit palette and type hues (Fire 18°, Plant 110°, Water 205°, Electric 50°, Earth 28°, Wind 165°).

## References

- UI audit evidence (shell.ts plates/dock, 14 `role="dialog"` files, 9 z-layers, ranch.css/cup.css/kit.css line counts) — elicited 2026-10-27
- `conductor/product-guidelines.md` (broadcast kit, voice, principles 1–8)
- none (no imported PRD)
