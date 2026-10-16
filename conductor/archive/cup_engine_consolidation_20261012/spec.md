# Spec: Cup Engine Consolidation (`cup_engine_consolidation_20261012`)

## Type

Refactor (no gameplay, save-schema, or visual changes)

## Overview

The cup system currently runs **two full resolution engines** in
`packages/sim/src/cup.ts` (719 LOC): the legacy one-sitting path (`enterCup` →
`resolveCup` → `runRound`) and the live session path (`prepareCup` →
`resolvePlayerMatch` → `completeCup`/`forfeitCup`/`finalizeCup`). The client
only ever drives the live path; the legacy engine survives solely through
golden parity tests and `machine.ts`'s unused `enterCup` step, permanently
taxing every cup change (placement rules, double-KO tiebreaks, rival seeding
must be written twice and kept byte-identical). Additionally, the client's
42KB `cup.ts` traps the only pure, high-stakes presentation logic — bracket
rendering — inside a DOM factory hardwired to the Bronze 8-slot topology.

This track makes the live session path the **sole** cup engine and extracts a
pure, unit-tested bracket model on the client, so the Phase 2 Silver/Gold
ladder lands against one placement engine and a topology-agnostic bracket
view.

## Functional Requirements

### Sim (`packages/sim`)

1. **Sole engine:** `startCupSession` / `resolvePlayerMatch` /
   `completeBracket` (private) / `completeCup` / `forfeitCup` / `finalizeCup`
   / `cupPlacement` become the only cup resolution path.
2. **Delete the legacy path:** `enterCup`, `resolveCup`, `runRound` and their
   tests are removed. `machine.ts` loses the `enterCup` step (the machine's
   `prepareCup`/`finalizeCup` steps remain). Barrel exports updated; no
   deep-import breakage (client imports only from the `@apex/sim` barrel).
3. **Seed contract pinned:** the rival-seed formula
   `(day*97 + round*13 + i*7) >>> 0` and the placement mapping
   (champion +3 / runner-up +2 / semifinal +1 / else 0, via `cupPlacement`)
   are re-expressed as explicit contract tests against the surviving engine —
   reproducibility is preserved without the dual-engine parity harness.
4. **One tiebreak:** the double-KO rule (`doubleKoWinner` — higher remaining
   HP, tie → earlier slot) exists once, in the live path.

### Client (`apps/client/src`)

5. **Pure bracket model:** bracket screen rendering (strict match-order slot
   filling, verdicts, placement, promotion-aware results) is extracted from
   `createCup`'s DOM factory into a pure, unit-testable module (e.g.
   `bracket-model.ts`): input = bracket/session state + verdicts; output =
   plain view data. The DOM layer consumes it.
6. **Topology-agnostic by construction:** the model must not hardcode 8
   entrants/3 rounds — round and slot structure derives from the bracket
   data (generalizes to 16 for Silver without a client rewrite).
7. **No visual changes:** the broadcast presentation of the bracket,
   coaching room, forfeit modal, and results screen is pixel-identical.

### Docs

8. `docs/save-schema.md`: correct the stale phase row ("`enterCup` returns
   the game to the day phase" → live-path `endCup`/`finalizeCup` language).
   `conductor/tech-stack.md`: dated consolidation note.

## Non-Functional Requirements

- **Byte-identical outcomes:** for any seed/day/roster, cup results
  (winners, verdicts, placements, rewards, ladder points) are unchanged.
  Verified by running the *old* parity golden expectations against the new
  engine before deleting the legacy path (a temporary bridge test, removed
  in the same track).
- TDD per `conductor/workflow.md`: contract tests written/updated before
  deletion; client bracket-model tests are table-driven (empty bracket →
  full bracket → forfeit → promotion).
- Sim stays pure, deterministic, DOM-free; no new dependencies; no
  voxel/asset changes (determinism gate untouched).
- Save schema unchanged (v9); resumable cup-session behavior unchanged.
- Test suite not slower; `bun run verify` is the definition of done.

## Acceptance Criteria

- [ ] `enterCup`/`resolveCup`/`runRound` no longer exist anywhere in the repo
      (code, tests, barrel, docs).
- [ ] Seed-formula and placement contract tests pass against the live engine;
      a full seeded cup produces the same winners/verdicts/placements the
      legacy path produced (bridge-verified, then bridge removed).
- [ ] Client bracket model is pure and unit-tested (slot fill order, verdict
      display, placement, forfeit, promotion row); DOM layer consumes it with
      no visual diff.
- [ ] A full cup run (enter → coach → 3 matches → results → ladder points)
      plays identically to before; refresh mid-walk still resumes.
- [ ] `docs/save-schema.md` and `conductor/tech-stack.md` updated.
- [ ] `bun run verify` passes; suite runtime not slower.

## Out of Scope

- Silver/Gold tiers, promotion matches, 16-player brackets (Phase 2) — this
  track only *enables* them.
- Verdict-presentation dedup across spar/cup/battleHud (separate follow-up).
- Battle balance (Strike meta), save migration ergonomics, staging.ts
  decomposition.
- Backend / cloud anything (Phase 3).
