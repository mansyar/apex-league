# Implementation Plan: Learnable Move Pool & Loadout Depth

## Phase 1 - Catalog and unlock rules (sim, TDD)

- [x] Task: Record the pre-change balance baseline 9a7f969
  - [x] Run the existing mirror and cross-element probes over the seed batch and save the numbers (win rates, stall count, per-move usage) as the comparison point for Phases 3 and 5
  - **Baseline (2026-10-18, 96 seeds x 4 tactic pairs, tiers 2/3/4/6):** 36 cases, 0 time-cap endings, all 12 specials used. Mirror `rateA` at kit4: fire 52.1%, plant 44.6%, water 47.0%. Cross-element already sits at the rails (fire>plant 100% / plant>fire 0%, fire>water 0% / water>fire 100%, plant>water 99.7% / water>plant 0.3%), so the +-5 bound is a tripwire against worsening, not a target of 50%. Mirrors being off 50% is the side/tactic asymmetry the matrix encodes, not a defect. Evidence: `baseline-probe.json`; harness: `packages/sim/scripts/balance-probe.ts` (`bun packages/sim/scripts/balance-probe.ts --out <file>`).
- [x] Task: Write failing catalog tests 6df38b1
  - [x] Assert six moves per playable element; the two new entries carry exactly `7/95/1` and `14/70/3`; all three elements mirror index-for-index
  - [x] Assert every pre-existing move keeps its id, power, accuracy, cooldown, and index
- [x] Task: Write failing unlock and pool tests 6df38b1
  - [x] Gate table: baby day 0 → 2 known, 3 trained days → 3, 6 trained days → 6, juvenile day 0 → 3 (stage counts as training for index 2 only)
  - [x] `defaultLoadout` at six known moves returns the first four, never six
  - [x] `setLoadout` accepts indices 4-5 only once known; rejects basic, unknown, duplicate, and over-cap entries with today's message shapes
  - [x] A v15 save with `loadout: null` at 6 trained days resolves to the same four ids as before this track
- [x] Task: Implement the catalog and pool rules eeeb4c9
  - [x] Add the six moves (Flare Dart, Pyre Lance, Vine Lash, Root Quake, Mist Spray, Maelstrom) appended per element
  - [x] Replace `tierCount` with `knownCount` + `knownMoves`, extend `requiredTierDays` to indices 4-5, and cap `defaultLoadout` by `MAX_LOADOUT`
  - [x] Split catalog and pool code across modules if either file crosses the 12 KB cap; update the sim barrel and its export list
  - **Deviation (green before Phase 2):** spar rivals (`battle/exhibition.ts`) and cup opponents (`cup/verdicts.ts`) field `kit.slice(0, MAX_LOADOUT)` for now. Handing them the full six broke the cup lifecycle goldens on seven cases, and Phase 2 is where the seeded 4-of-6 pick lands, so the slice is the behaviour-preserving stopgap. It is removed in Phase 2, not kept.
  - **Incidental:** `5f47bb6` drops an unused `CUP_REWARDS` import that biome reports at error severity (the import predates this track; it made the Phase 1 gate red), and `e2cd62c` reformats the committed probe report because biome reflows `JSON.stringify` output.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: eeeb4c9]
  - Verified 2026-10-18: typecheck clean, 1407 sim+client tests green, determinism byte-identical, spar picker renders six rows with the two new moves locked. `bun run verify`'s voxel leg timed out under machine load (voxel has zero diff vs `origin/main`; each test passes standalone) - recorded in the git note on `eeeb4c9`.

## Phase 2 - Rival kits from the wider pool (sim, TDD)

- [ ] Task: Write failing rival-kit tests
  - [ ] Same seed produces the same four moves; different seeds can differ; kit length is always 4 and always a subset of the species' six
  - [ ] Spar `rivalSpeciesId`, `rivalTactic`, and creature stats are unchanged for fixed seeds against the pre-change baseline
  - [ ] Cup opponents' kits are deterministic per session seed and index
- [ ] Task: Implement `rivalKit` with a derived RNG
  - [ ] Derive from the existing seed with a distinct constant so the stream is not consumed; wire `battle/exhibition.ts` and `cup/verdicts.ts`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - Boss kits and per-boss evidence

- [ ] Task: Widen the six boss loadouts to draw from the new pool
- [ ] Task: Per-boss probe against a stage-appropriate reference creature
  - [ ] Record each boss's player win rate; adjust its kit until it sits in 40-70%
  - [ ] Write tests pinning boss kit length, move validity, and the recorded win band
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 - Client surfaces (manual verification)

- [ ] Task: Loadout picker, coaching room, and creature detail
  - [ ] Six rows with locked ones showing gate copy ("Train N more days" / "Evolve to unlock"), equip and unequip of any known move, save round-trip
  - [ ] Handbook move table and picker copy updated to describe the pool
- [ ] Task: Battle FX inheritance
  - [ ] New moves inherit element `SHOT_LOOK` and `MOVE_FX`; add a bespoke entry only where two moves read identically
- [ ] Task: Browser verification with `playwright-cli`
  - [ ] Drive ranch → coaching room → spar, play at least one new move, screenshot each surface, confirm zero console errors; run the iPhone 15 layout pass on the picker
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 - Balance, docs, final gate

- [ ] Task: Full probe matrix against the Phase 1 baseline
  - [ ] Mirrors and cross-element within ±5 points; zero time-cap endings (`reason: "time"`); every new move chosen by the AI in at least one matchup
- [ ] Task: Documentation
  - [ ] `tech-stack.md`: move-pool layout, derived-knowledge note, rival-kit determinism rule
  - [ ] `docs/save-schema.md`: explicit statement that move knowledge is derived and no v16 exists
- [ ] Task: Final `bun run verify`, determinism gate, and track checkpoint
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

Boss probes run after rival kits exist so the probe harness is built once. The
Phase 5 matrix re-runs the Phase 1 baseline with the same seeds, which is what
makes the ±5 point bound measurable rather than impressionistic.
