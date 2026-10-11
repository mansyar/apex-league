# Plan: Cup Day — weekly 8-bracket tournament

Spec: [spec.md](./spec.md) · Branch: `track/cup_day_20261011`
Type: Feature · Order: sim-first (pure logic → state machine → UI → gate)

Each phase follows workflow.md TDD where logic is pure and ends with a Phase
Verification & Checkpoint gate before moving on.

## Phase A — Cup logic in `@apex/sim` (pure, TDD)

- [x] Task: Failing tests for bracket generation — `cup.ts`:
  - `makeBracket(state)` returns 8 seeded slots (slot 1 = player, 7 rivals
    from the exhibition helper), deterministic given `(day, save seed)`
  - hand-written rival name pool; QF/SF/F ramps −5%/0/+5% clamped to
    species stat bounds; no `Math.random` *(18 tests, green — `57f0d19`)*
- [x] Task: Implement `makeBracket` + naming + ramp to pass tests
  (mutation-pure) *(same commit)*
- [x] Task: Failing tests for round resolution — `cup.ts`:
  - `runRound(bracket, round, player, alive?)` resolves each pairing with the
    existing resolver, advances winners, returns per-round verdicts + event
    log slices
  - `resolveCup(bracket)` returns placement + champion; player loss still
    completes the bracket; mutation-pure
- [x] Task: Implement round resolution to pass tests *(seed-search balance
  contract: even rivals mean the player needs a top-band roll to win —
  probe sweep 20/120 wins pre-training, 33% trained; wins verified across
  species/days)*
- [x] Task: Failing tests for rewards — `cupRewards.ts`: win → bond +10,
  mood +15, `cupsWon` +1, `lastCupDay` stamp; loss-only → mood +2; clamped
  to existing condition caps; mutation-pure *(9 tests green + ticker bonus
  integration test)*
- [x] Task: Implement reward application to pass tests *(caught a truthy-
  string bug: `toOutcome` returned the string `"lost"` held as `won` — fixed
  with `=== "won"`; rewards return GameState directly per save-v5 API —
  commits `2bc0ea7`, `9d3b2e5`)*
- [x] Task: Save schema v5 — add `cupsWon: number` (default 0) and
  `lastCupDay: number | null` on GameState; v4→v5 migration; loadGame
  validates both; failing tests first (round-trip, back-compat, corrupt-
  input rejection) *(9d3b2e5)*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — bun run
  verify green: 459 pass / 0 fail across 54 files; biome 139 files clean;
  determinism gate byte-identical; stray probe files removed before commit
  *(checkpoint: 9d3b2e5)*

## Phase B — State machine & player UI wiring

- [x] Task: Wire `machine.ts` — fill in the placeholder bodies of
  `beginCup`/`endCup`: entry on cup day resolves the whole bracket, applies
  rewards, returns to day phase; unit-tested with seeded runs (same seed →
  identical bracket + rewards) *(implemented as `enterCup` — one-sitting
  resolution; exports surfaced via `index.ts` — `d24dd93`, `0d00497`)*
- [ ] Task: Client `cup.ts` panel — full-screen DOM overlay: bracket table
  QF→SF→F paced ~1.5 s per round, verdict + short round logs, announcer
  voice; Enter Cup chip in the Spar area on cup days (disabled after resolve
  or on non-cup days); reduced motion honored (instant resolve, no bounce)
- [ ] Task: Main.ts integration — hook the machine into the Advance Day flow
  (cup day surfaces the chip rather than auto-running); HUD shows the
  `cupsWon` banner counter
- [ ] Task: Ranch idle hooks — scene reacts to placement (victory → happy
  bounce next day already exists; early exit → one droopy idle window);
  scene/scene-logic otherwise untouched
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase C — Verification gate

- [ ] Task: Full gate — `bun run verify` green everywhere; manual cup
  playthrough on the dev server (enter → 3 rounds → rewards visible the
  next day; loss path; reduced-motion pass); evidence recorded
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

- Diff surface (estimate): `packages/sim/src/{cup.ts, cupRewards.ts,
  machine.ts, save/{schema.ts, migrate.ts, save.test.ts}}`,
  `apps/client/src/{cup.ts, main.ts, hud.ts}` + tests in both packages.
- No `@apex/voxel` changes; determinism gate untouched.
- Save bumps to v5 (first schema change since combat_prep's v4).
