# Plan: Ranch Dressing

**Track ID**: `ranch_dressing_20261010` · **Spec**: [spec.md](./spec.md) · **Branch**: `track/ranch_dressing_20261010`

## Phase A — `fedToday` sim flag + save v4

- [x] Task: Failing tests — fedToday lifecycle *(9f594ea)*
  - fresh creature has `fedToday === false`; Feed sets it true; Rest/Treat/Play leave it false
  - settlement resets `fedToday` to false (night cleanup)
  - `migrate` walks a v3 save to v4 stamping `fedToday: false`, rolled stats/focus untouched
  - `serializeSave`/`loadGame` round-trip a fedToday-true save
  - `loadGame` rejects a save with a non-boolean `fedToday`
- [x] Task: Implement — `fedToday` on Creature + feed wiring + settle reset; `SAVE_VERSION = 4` with v3→v4 migration; validation extension *(9f594ea)*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `[checkpoint: 9f594ea]`

## Phase B — golden-hour atmosphere

- [x] Task: Gradient sky dome (amber horizon `#d98c4a` → navy top `#1a1f2e`) + linear fog tuned for horizon fade with a crisp creature *(84626cb, 7c401f0)*
- [x] Task: Ground — warm moss re-hue (`#3a4d34`) on a soft-boundary disc; the hard box edge is retired *(84626cb, 7c401f0 — disc grows to the dome radius so the moss always meets the horizon)*
- [x] Task: Lighting rig — warm key re-tint (`#ffd9a0`) + cool rim from the opposite side + ambient rebalance *(7c401f0 — warm/cool hemisphere ramp added for golden-hour bounce)*
- [x] Task: Shadows — renderer shadow map, creature parts cast, ground receives *(84626cb — PCFShadowMap, 1024² key frustum ±9)*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — browser screenshot of sky/ground/shadow `[checkpoint: 7c401f0]`

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
