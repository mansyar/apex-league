# Rework mobile ranch hierarchy and make action state, costs, and disabled reasons explicit — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track reworks the ranch HUD's command dock and entry chips so every player action presents its **state, cost, and disabled reason as visible text** — no hover required — while keeping the established action order and leaving all sim gating untouched.

## Problem / Motivation

Disabled reasons today live in `dataset.reason`, surfaced only through a hover/focus tooltip (`kit.css`). Touch players — the primary mobile audience — get a greyed-out button with no explanation. Costs render inconsistently, Advance Day is a bare always-enabled button, and visual grouping gives little hierarchy guidance on small screens. If unsolved, players burn taps discovering gating rules by trial and error.

## Goals & Success Metrics

- **Goal:** every dock action and entry chip exposes state, cost, and reason as visible text at 393px in both orientations.
- **Metric (explicitness checklist):** unit tests assert each control's rendered state/cost/reason across all gating states; a browser matrix (393×852, 852×393, 1440×900) shows everything in-frame with zero h-scroll and a clean console.

## Scope

### In Scope

- Command dock: care row (feed/rest/treat/play), train button + program picker, Advance Day with an eve-of-advance summary, Graduate.
- Entry chips: spar, cup, stable — state plus hint/reason as inline text.
- Inline reason text for every disabled control; cost line wherever a cost applies.
- Grouping/emphasis pass with the existing action order frozen.

### Out of Scope

- Sim: `careAction`, train programs, costs, and gating rules stay exactly as-is.
- Creature plate, lineage, overflow panel, stable/gift modal internals, 3D scene, and cup/spar flows beyond their chips.
- Reason/copy wording changes (RM-18 owns copy fixes — this track presents existing `REJECTION_COPY` verbatim).
- New actions or any reordering of existing ones.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Each care action button shows enabled/disabled state, its AP cost, and — when disabled — the reason as visible inline text. | must |
| FR-2 | Train button shows state and cost (including the free re-point null-cost case) with inline reason; picker rows keep capped/tonight/assigned lines visible. | must |
| FR-3 | Advance Day shows an eve-of-advance summary (assigned training, AP reset, pending day effects). | must |
| FR-4 | Spar/cup/stable chips show state plus hint/reason inline (no partner, off-day cup, stable refusal paths). | must |
| FR-5 | Visual grouping/emphasis distinguishes primary vs secondary actions without changing order. | should |
| FR-6 | No control relies on hover/focus tooltip alone for state, cost, or reason on touch viewports (tooltips may remain as a desktop enhancement). | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | 393px portrait + landscape and 1440px desktop: no h-scroll, no occluded interactives, clean console. |
| NFR-2 | Reduced-motion honored; keyboard flows (picker arrows/Escape, modal trap) and aria state keep working. |
| NFR-3 | No sim/dependency/save changes; client module-size caps stay green. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Every care button in each dry-run gating state renders its cost and inline reason. | FR-1 |
| AC-2 | Train button and picker rows render correctly across capped / 0-AP / assigned states. | FR-2 |
| AC-3 | Advance summary lists assigned training and the AP reset before the tap. | FR-3 |
| AC-4 | Chips render correct state/hint with and without a partner, on and off cup day. | FR-4 |
| AC-5 | On touch viewports no state/cost/reason is available only via `:hover`. | FR-6 |
| AC-6 | Full gate (`verify` + `build`) green plus browser-matrix stills committed. | all, NFR-1 |

## Edge Cases

- No partner (spar disabled, care gated, stable refusal copy).
- Stable swap mid-flow; gift pending overlapping chips.
- Cup-phase locks (e.g. rename hidden) must not regress.
- AP exhaustion and all-primaries-capped end states.
- Short landscape (≤500px height) measured seats keep the new inline text in-frame.

## Dependencies

- **Tracks:** RM-13 (satisfied — retired; kept as the promoted dependency).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** existing `REJECTION_COPY` wording is reused verbatim; wording fixes belong to RM-18.
- **Assumption:** the eve-of-advance summary uses only information already available to the HUD (assigned program, AP reset, day-counter effects) — no new sim queries.
- **Assumption:** desktop hover tooltips stay as an enhancement alongside the new inline text.

## References

- `apps/client/src/hud/dock.ts`, `hud/update.ts`, `hud/copy-care.ts`, `hud/programs.ts`
- `apps/client/src/cup/view-models.ts`, `cup/entry.ts`, `spar/panel.ts` (chip), `stable.ts`
- `apps/client/src/ui/kit.ts`, `ui/kit.css`, `ranch.css` (phone + short-landscape breakpoints)
