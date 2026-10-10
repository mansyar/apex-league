# Plan: Ranch Dressing

**Track ID**: `ranch_dressing_20261010` · **Spec**: [spec.md](./spec.md) · **Branch**: `track/ranch_dressing_20261010`

## Phase A — `fedToday` sim flag + save v4

- [ ] Task: Failing tests — fedToday lifecycle
  - fresh creature has `fedToday === false`; Feed sets it true; Rest/Treat/Play leave it false
  - settlement resets `fedToday` to false (night cleanup)
  - `migrate` walks a v3 save to v4 stamping `fedToday: false`, rolled stats/focus untouched
  - `serializeSave`/`loadGame` round-trip a fedToday-true save
  - `loadGame` rejects a save with a non-boolean `fedToday`
- [ ] Task: Implement — `fedToday` on Creature + feed wiring + settle reset; `SAVE_VERSION = 4` with v3→v4 migration; validation extension
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase B — golden-hour atmosphere

- [ ] Task: Gradient sky dome (amber horizon `#d98c4a` → navy top `#1a1f2e`) + linear fog tuned for horizon fade with a crisp creature
- [ ] Task: Ground — warm moss re-hue (`#3a4d34`) on a soft-boundary disc; the hard box edge is retired
- [ ] Task: Lighting rig — warm key re-tint (`#ffd9a0`) + cool rim from the opposite side + ambient rebalance
- [ ] Task: Shadows — renderer shadow map, creature parts cast, ground receives
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) — browser screenshot of sky/ground/shadow

## Phase C — voxel prop registry

- [ ] Task: Failing tests — prop archetypes exist in the registry and generate deterministically (same seed → identical fields/colors) for: tuft, bush, broadleaf tree, rock, food pile
- [ ] Task: Implement the five prop archetypes with 2-3 hue variants across vegetation; all static (no pivots, no animation)
- [ ] Task: Extend `gate:determinism` to regenerate and hash the props
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase D — scene composition

- [ ] Task: Seeded scatter — tufts/bushes placed from the creature's `visualSeed`; landmark trees + rocks at fixed positions
- [ ] Task: Food pile — scene API receives `fedToday`; present-iff-fed kept in sync with care actions and Advance Day via `main.ts`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) — browser evidence: same-seed reload parity, pile appear/disappear

## Phase E — integration and verification gate

- [ ] Task: Full gate — `bun run verify` (typecheck, tests, biome, determinism incl. props) green
- [ ] Task: Browser manual verification of all 7 acceptance criteria with screenshot evidence
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
