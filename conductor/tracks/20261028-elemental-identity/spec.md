# Elemental Identity Pass — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Every one of the 48 special moves gets a bespoke battle animation derived from
its name's verb (walls raise barriers, stomps erupt ground, charges dash)
rendered in its element's shape language (fire rises and flickers, water arcs
heavy, electric branches, earth tumbles, wind streaks), plus one authored
per-element fallback body so no move ever renders generic again. Fire looks
like fire, water like water — across all moves. A dev-only Move Lab drives the
staging stack directly (no sim, no AI) so every move is triggerable on demand
for deterministic visual inspection and evidence capture.

## Problem / Motivation

Today 34 of 48 specials fall through to a single generic `DEFAULT_FX` body —
same windup, same burst, only the tint differs — and all 8 electric moves are
in that bucket. Bursts are identical sphere-puffs per element, wind reuses
water/plant parts, and no move is identifiable with color removed. Players feel
every fight as samey mid-tier animation regardless of roster or move choice; if
unsolved, the coming Strike-identity and impact-weight tracks build on a
generic foundation.

## Goals & Success Metrics

- **Goal:** each element identifiable by shape + motion alone; each move's verb
  readable in its animation.
- **Metric:** per-move screenshot catalog (desktop + phone widths) for all 48
  moves, plus a grayscale readability check where the element is named
  correctly from shape/motion with color removed.

## Scope

### In Scope

- 6 per-element fallback bodies (geometry + trail + burst + muzzle + floor
  treatment) replacing the generic `DEFAULT_FX` path.
- 34 new bespoke `MOVE_FX` rows; review + upgrade of the existing 14 for
  verb/identity consistency.
- New `move-fx/moves/electric.ts` (arc-tendril identity); wind decoupled from
  water/plant parts.
- Verb families: barrier/wall, dash/charge, ground eruption, spray-cone,
  multi-volley, beam/lance — each layered with element shape language.
- Per-move arrival/impact treatment incl. element-typed floor marks where the
  name implies a ground effect.
- Beat tuning inside `PLAYBACK_BEATS` only where a move cannot land its read
  in time, with contract-test updates.
- Dev-only Move Lab (staging-direct trigger rig) used for all visual evidence
  from Phase 2 onward.

### Out of Scope

- Basic Strike (dedicated follow-up track); KO/down beat (future
  impact-weight track); any audio/SFX work (owner's follow-up pass);
  sim/coin/damage logic; save schema; new dependencies.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Each element has an authored fallback body (windup, flight, arrival, trail, burst, muzzle) used by any move without a bespoke row | must |
| FR-2 | All 48 specials have bespoke `MOVE_FX` rows whose choreography expresses the move name's verb | must |
| FR-3 | Electric renders branching arc-tendril identity (no plain orb) in fallback and all 8 electric rows | must |
| FR-4 | Wind shares no geometry/trail parts with water or plant in fallback or any of its 8 rows | must |
| FR-5 | Every bespoke row defines windup, travel/dash, and arrival treatments scaled to its tier (chips fast/small, heavies charged/big, signatures unique) | must |
| FR-6 | Impacts leave element-typed floor marks (scorch/puddle/cracks/rings) that fade after the bout beat | should |
| FR-7 | Per-move screenshot catalog (desktop + phone) + grayscale element-readability check recorded as track evidence | must |
| FR-8 | Dev-only Move Lab triggers any catalog move on demand against the staging stack (no sim/AI), with replay, slow-motion, pause/step, seeded particles, and fixed camera presets | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Every touched module stays ≤ 12 KB (`apps/client`, `packages/sim` caps, enforced by module-size tests) |
| NFR-2 | Sim resolver and battle outcomes unchanged; determinism gate green throughout |
| NFR-3 | No save-schema change, no migration |
| NFR-4 | No new dependencies; element hues stay single-sourced in `ui/element.ts` |
| NFR-5 | No dropped-frame regression on phone widths (visual layer console-clean, pacing within existing beat budget unless justified) |
| NFR-6 | Move Lab is dev-only: never in the production bundle (dynamic `import()` behind `import.meta.env.DEV`), excluded from module-size-cap enforcement |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | All 48 moveIds resolve to a bespoke row (lookup test or catalog script, no fallback hits in catalog bout set) | FR-2 |
| AC-2 | Grayscale screenshots of one reference move per element are identified correctly by shape/motion alone | FR-1, FR-3, FR-4 |
| AC-3 | Verb spot-checks read true: wall raises a barrier, stomp erupts ground, charge dashes the attacker, spray renders a cone, volley fires multiples | FR-2, FR-5 |
| AC-4 | `bun run verify && bun run build` green + determinism gate + desktop/phone catalog with clean console | FR-7, NFR-2 |
| AC-5 | Module-size tests green; no save-version bump; no new dependency | NFR-1, NFR-3, NFR-4 |
| AC-6 | Move Lab triggers every catalog move on demand with deterministic replay; production bundle contains no lab code | FR-8, NFR-6 |

## Edge Cases

- Instant/fast-forward mode: all new choreography resolves instantly with
  existing contact consequences, no anim.
- Point-blank specials replay compressed from the impact step (existing FR5
  path) — bespoke arrivals must read at compressed scale.
- KO mid-flight, misses (accuracy/dodge): arrival suppressed, whiff/dodge
  reads preserved.
- Guard/veil/aegis rows are self-targeted barriers — no projectile, no enemy
  contact frame.
- Phone widths + low-end GPUs: particle budgets per row stay within the
  current burst ceiling unless evidence justifies more.

## Dependencies

- **Tracks:** none (no open tracks; prior battle tracks merged).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** audio untouched in this track; owner's SFX pass follows and
  will hook existing per-move sound triggers.
- **Assumption:** existing 14 bespoke rows keep their moveIds and tier
  bindings; upgrades stay within the `MOVE_FX` row schema (schema extension
  needs a spec amendment).
- **Assumption:** beat tuning stays an exception (justified per move with
  updated contract tests), not a re-pace of the battle system.

## References

- `apps/client/src/move-fx/looks.ts`, `move-fx/moves/*.ts`, `fx/` layers,
  `steps/` choreography, `packages/sim/src/battle/moves.ts` (48-move catalog),
  `conductor/learnings.md`, AAA layering/shape-language research (Unity VFX
  Graph, UE5 Niagara elemental-magic guides; game-feel analysis),
  `apps/client/src/staging.ts` (`applyStep`/`setPace`), `apps/client/src/anim.ts`
  (seeded determinism), `apps/client/src/app/screens.ts` (composition root).
