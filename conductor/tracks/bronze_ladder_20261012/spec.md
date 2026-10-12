# Spec: Bronze Ladder (`bronze_ladder_20261012`)

## Type

Feature (completes the last open Phase 1 deliverable)

## Overview

Cups currently end in a placement and a `cupsWon` counter — success doesn't
*go* anywhere. This track adds a Bronze-tier ladder that converts cup
placements into persistent, visible progression: placement-based points,
automatic climbs through three Bronze sub-tiers, and a broadcast-kit rank
plate on the ranch HUD. Silver promotion is explicitly deferred to Phase 2
(full Bronze → Silver → Gold ladder with promotion matches).

## Functional Requirements

### Sim (`packages/sim/src/ladder.ts` — new, pure, DOM-free)

1. `LadderState { points: number, subTier: "III" | "II" | "I" }` lives on
   `GameState`.
2. Placement-based points, applied at the same seam as `applyCupRewards` so
   the legacy one-sitting cup path and the live `CupSession` path stay in
   byte-parity:
   - Champion (1st): **+3**
   - Runner-up (2nd): **+2**
   - Semifinal exit (top 4): **+1**
   - Earlier exit or forfeit: **+0**
   Losses and forfeits never subtract points — the ladder only reflects
   success, matching the project's death-free, setback-not-punishment
   principle.
3. Sub-tier thresholds: **Bronze III at 0 · Bronze II at 6 · Bronze I at 12**
   (~2 cup cycles per climb at ~3 points per win). Climbing is automatic on
   threshold crossing; no promotion matches in this track.
4. At the top of Bronze I, further wins keep banking points and a one-time
   coach callout ("Silver division awaits") fires — setting up Phase 2
   without shipping it.
5. `applyCupPlacement` returns the new ladder state plus climb /
   first-climb / top-reached event flags for the client to present.

### Save (v8)

6. `LadderState` persisted on the save. Pure v7→v8 migration step that
   initializes ladder points at **0 for every migrated save** — cups already
   won are history; the ladder starts fresh. Corrupt-save tolerance and the
   resumable-cup-session behavior are unchanged. `docs/save-schema.md`
   updated with the v8 field and migration note.

### Client (`apps/client`)

7. Broadcast-kit **rank plate** on the ranch HUD: current sub-tier name,
   points, and progress to the next threshold. Accessible (aria-label on
   the progress affordance) and reduced-motion aware, like every other
   surface.
8. Cup tie-ins: the cup entry chip shows the current ladder standing; the
   results screen shows placement → points earned and calls out any climb;
   climb and top-of-ladder announcements flow through the existing HUD
   status-ticker precedence chain (coach voice).

## Non-Functional Requirements

- TDD per `conductor/workflow.md`: table-driven tests for the
  placement→points mapping, threshold crossings (each boundary plus one
  point below), loss/forfeit zero cases, and the v7→v8 migration.
- Sim code stays pure, deterministic, and DOM-free (no new RNG streams —
  the ladder is a pure function of cup results).
- No new dependencies. No voxel/asset changes — the determinism gate is
  untouched.
- Test suite stays fast; `bun run verify` is the definition of done.

## Acceptance Criteria

- [ ] Placements map exactly to the points table; a loss or forfeit awards
      0 points and never subtracts.
- [ ] Crossing 6 promotes Bronze III → II and crossing 12 promotes II → I
      automatically.
- [ ] At the top of Bronze I, points continue banking and the Silver-awaits
      callout fires exactly once.
- [ ] v7 saves migrate to v8 with ladder points at 0; round-trip
      save/load verified; corrupt-save path unaffected.
- [ ] The rank plate reflects the new state immediately after cup results;
      the entry chip and results screen carry the ladder context.
- [ ] `bun run verify` passes.

## Out of Scope

- Silver, Gold, and any higher tier; promotion matches (Phase 2).
- Authored boss rivals or roster changes.
- Points decay, demotion, or standings history.
- Backend / cloud anything (Phase 3).
