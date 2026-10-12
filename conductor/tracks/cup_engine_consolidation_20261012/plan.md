# Plan: Cup Engine Consolidation (`cup_engine_consolidation_20261012`)

Sequencing principle: **pin current behavior with tests first** (so deletion
cannot silently change outcomes), then delete, then refactor the client last
(where the risk is visual and verified manually). TDD per
`conductor/workflow.md`; logic-bearing tasks test-first.

## Phase 1 — Pin the contract (sim, tests only)

- [x] Task: Seed & placement contract tests — new tests against the *live* `9103a94`
      engine pinning the rival-seed formula `(day*97 + round*13 + i*7) >>> 0`
      per (day, round, slot) and the `cupPlacement` mapping (champion +3 /
      runner-up +2 / semifinal +1 / else 0). Characterization tests:
      expected green on arrival (refactor-pinning, not red/green).
- [x] Task: Temporary bridge parity test — resolve one fully seeded cup `83bd0e9`
      through the legacy path and through the live path; assert identical
      winners, verdicts, placements, rewards. Safety net for Phase 2;
      deleted with it.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  [checkpoint: 83bd0e9] Phase 1 complete — contract + bridge goldens green, 811/811 pass (58.85s), verify/check/biome clean, user-approved.

## Phase 2 — Retire the legacy engine (sim)

- [x] Task: Delete the one-sitting path — remove `enterCup`/`resolveCup`/
      `runRound` from `cup.ts`, the `enterCup` step from `machine.ts`, their
      barrel exports, and the one-sitting test suite; keep the bridge green
      throughout; remove the bridge test last; fold any uniquely-covered
      cases into live-path tests. [7628a1b]
- [x] Task: Docs — fix the stale `enterCup` phase row in
      `docs/save-schema.md`; add dated consolidation note to
      `conductor/tech-stack.md`. [c77af9a]
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  [checkpoint: 7628a1b] Phase 2 complete — legacy engine deleted (net −520 LOC), 791/791 pass, verify green, user-approved.

## Phase 3 - Client bracket model extraction

- [x] Task: Bracket-model tests (red) — failing tests for the pure model:
      strict match-order slot filling, verdict display state,
      placement/results rows, forfeit early-exit, promotion-aware row, and
      topology-agnostic round/slot derivation (prove with synthetic 4- and
      16-entrant brackets). [red confirmed: module absent]
- [x] Task: Extract `bracket-model.ts` — implement the model from
      `createCup`'s DOM factory; rewire client `cup.ts` to consume it; green
      tests; no visual diff. [cb31de9]
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Final verification

- [ ] Task: Full verify & manual walkthrough — `bun run verify`; manual:
      full cup run (enter → coaching room → 3 matches → results → ladder
      points), refresh mid-walk resume, forfeit path, visual parity of all
      cup screens; then conductor-review handoff.
