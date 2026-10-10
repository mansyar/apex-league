# Plan: Cup Day — weekly 8-bracket tournament

Spec: [spec.md](./spec.md) · Branch: `track/cup_day_20261011`
Type: Feature · Order: sim-first (pure logic → state machine → UI → gate)

Each phase follows workflow.md TDD where logic is pure and ends with a Phase
Verification & Checkpoint gate before moving on.

## Phase A — Cup logic in `@apex/sim` (pure, TDD)

- [ ] Task: Failing tests for bracket generation — `cup.ts`:
  - `makeBracket(state)` returns 8 seeded slots (slot 1 = player, 7 rivals
    from the exhibition helper), deterministic given `(day, save seed)`
  - hand-written rival name pool; QF/SF/F ramps −5%/0/+5% clamped to
    species stat bounds; no `Math.random`
- [ ] Task: Implement `makeBracket` + naming + ramp to pass tests
  (mutation-pure)
- [ ] Task: Failing tests for round resolution — `cup.ts`:
  - `runRound(bracket, round, playerLoadout)` resolves each pairing with the
    existing resolver, advances winners, returns per-round verdicts + event
    log slices
  - `resolveCup(bracket)` returns placement + champion; player loss still
    completes the bracket; mutation-pure
- [ ] Task: Implement round resolution to pass tests
- [ ] Task: Failing tests for rewards — `cupRewards.ts`: win → next-day AP
  budget 4, bond +10, mood +15, `cupsWon` +1; loss-only → mood +2; clamped
  to existing condition caps; mutation-pure
- [ ] Task: Implement reward application to pass tests
- [ ] Task: Save schema v5 — add `cupsWon: number` (default 0) and
  `lastCupDay` bookkeeping; v4→v5 migration; failing tests first
  (round-trip, back-compat, corrupt-input rejection)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase B — State machine & player UI wiring

- [ ] Task: Wire `machine.ts` — fill in the placeholder bodies of
  `beginCup`/`endCup`: entry on cup day resolves the whole bracket, applies
  rewards, returns to day phase; unit-tested with seeded runs (same seed →
  identical bracket + rewards)
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
