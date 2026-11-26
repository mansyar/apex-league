# Deduplicate verdict presentation across spar, cup, and battle HUD — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

A client-only refactor that gives every sim-battle verdict surface one pure copy
model and one reusable stamp DOM view. Spar, cup battle, and cup results keep
their existing wording and flow-specific adapters; the live invite surface stays
separate because it speaks seat/protocol language rather than `BattleResult`.

## Problem / Motivation

Verdict wording is currently authored in several places: `sparStampTitle` and
`cupStampTitle` in `battle-session.ts`, `reasonLine` in `battleUI.ts`, and
`resultsView` in `cup/view-models.ts`; the live panel has its own
`verdictCopy`. The battle HUD and cup results card also build the same
title/rule/sub stamp shape independently. A future copy or accessibility fix
must be applied in multiple files, and drift is easy to miss — especially for
mirror matches, double-KOs, and the drawn-final cup case.

## Goals & Success Metrics

- **Goal:** One source of truth for sim-battle verdict copy and one reusable
  stamp view, with no behavior or wording change.
- **Metric:** Every known verdict variant is pinned by table tests; all three
  visual surfaces are captured on desktop and phone with clean consoles; the
  full gate is green with no sim, save, voxel, dependency, or audio diff.

## Scope

### In Scope

- New pure copy module under `apps/client/src/verdict/` that derives title and
  sub copy for the spar stamp, cup battle stamp, and cup results card from
  already-resolved inputs.
- New reusable stamp DOM view that builds the title/rule/sub structure, accepts
  class-name configuration, restarts its entrance animation, and preserves its
  `role="status"` / `aria-live="polite"` behavior.
- Rewiring `battle-session.ts`, `battleHud.ts`, `cup/results.ts`,
  `cup/screens/results.ts`, and `cup/view-models.ts` to delegate to the shared
  seams; `reasonLine` remains the single reason-subline source.
- TDD table tests for all known outcomes and the five edge cases below.
- Desktop 1440x900 and iPhone 15 393x852 captures of the spar stamp, cup
  results stamp, and live battle HUD stamp, with clean console checks.

### Out of Scope

- The live invite panel (`live/state.ts` `verdictCopy`, seat/forfeit/name copy).
- Changing any current spar, cup, or HUD verdict string; normalization of
  `"A drawn spar"` / `"A draw"` and similar wording differences.
- CSS class renames, animation retiming, audio cue-id changes, or visual
  restyling.
- Sim/cup result computation, save/schema changes, voxel or determinism hash
  changes, new dependencies, lockfile changes, generated files.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | A single pure module owns all verdict title/sub derivation for the spar stamp, cup battle stamp, and cup results card; flow adapters pass their existing inputs and receive copy back. | must |
| FR-2 | Verdict title/sub string literals are not duplicated outside that module; `reasonLine` remains the single source for the battle subline, and cup placement/reward derivation stays in `resultsView`. | must |
| FR-3 | One reusable stamp DOM view is used by the battle HUD and cup results card, with configurable class names only; element order, rule element, animation restart, `role="status"`, `aria-live="polite"`, and the cup's single combined announcement are unchanged. | must |
| FR-4 | Every current spar, cup battle-stamp, and cup results-card verdict string remains byte-for-byte unchanged; live invite copy is untouched. | must |
| FR-5 | A dedicated table test pins every known outcome before implementation: null winner, double-KO, time-out, winner keys, mirror-name side qualification for both spar and cup, and cup Champion/Eliminated results copy. | must |
| FR-6 | Four required visual results — spar stamp, cup results stamp, battle HUD stamp, plus a console check — are captured at desktop and phone size. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No sim/cup result computation, save/schema, voxel/determinism hash, dependency, lockfile, generated file, or audio cue-id change. |
| NFR-2 | Client module-size caps stay green; new modules stay well under 12 KB. |
| NFR-3 | Accessibility semantics are unchanged: one polite verdict status, no duplicate announcements, and the existing cup combined-announcement line. |
| NFR-4 | The full configured stack passes: typecheck, Biome, unit suite, determinism gate, and build. |
| NFR-5 | Replay/hide stamping and reduced-motion/instant playback paths retain today's lifecycle and produce no stale text or leaked state. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | The copy table is red before the shared module exists and green after it; it covers null winner, double-KO, time-out, winner keys, mirror qualification for spar and cup, and cup Champion/Eliminated copy. | FR-5 |
| AC-2 | No duplicate verdict title/sub literals remain in the spar, cup, or HUD adapters; each delegates to the shared module and all pinned strings are unchanged. | FR-1, FR-2, FR-4 |
| AC-3 | Both stamp surfaces use the shared DOM view; DOM tests confirm class names, rule element, animation restart, `role="status"`, `aria-live="polite"`, and a single cup announcement. | FR-3 |
| AC-4 | `live/state.ts` is absent from the final diff; grep/diff proof shows no wording change and no CSS/audio change. | FR-4, NFR-1, NFR-3 |
| AC-5 | Desktop and phone captures exist for spar stamp, cup results stamp, and battle HUD stamp; all console sessions are clean. | FR-6 |
| AC-6 | `bun run verify && bun run build` exits 0, module-size test is green, and the diff contains no banned file class. | NFR-1, NFR-2, NFR-4 |
| AC-7 | The five edge cases below are pinned with no exception, NaN, stale stamp text, duplicate announcement, or cross-flow state leak. | NFR-5 |

## Edge Cases

- Mirror matches where both plates show the same display name but the sim reports stable side keys.
- Null winner, double-KO, and time-out verdicts, including a drawn cup final that still crowns a champion by session status.
- A spar verdict arriving before a fight has been cast (`fight === null` path in `sparStampTitle`).
- Replay and hide-stamp lifecycle: text is cleared or replaced correctly and the entrance animation restarts without stale copy.
- Reduced-motion / instant dump playback: stamping still occurs on the finish path without changing pacing or leaving leaked state.

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Assumption:** No PRD or design notes exist for RM-10; the spec is grounded in the roadmap row and verified code call sites.
- **Assumption:** The shared copy module receives already-resolved `BattleResult`, fight, and cup-session inputs; it does not recompute winners, placement, or rewards.

## References

- `conductor/roadmap.md` — RM-10.
- `apps/client/src/battleUI.ts` — `reasonLine`, `winningSideKey`.
- `apps/client/src/battle-session.ts` — `sparStampTitle`, `cupStampTitle`, shared HUD stamping.
- `apps/client/src/battleHud.ts`, `apps/client/src/battle-hud.css` — live HUD stamp DOM and styles.
- `apps/client/src/cup/view-models.ts`, `apps/client/src/cup/results.ts`, `apps/client/src/cup/screens/results.ts` — cup results copy and stamp DOM.
- `apps/client/src/live/state.ts` — out-of-scope seat/protocol verdict copy.
- `conductor/archive/live_cup_20261011/plan.md` — earlier verdict-comment dedup precedent.
