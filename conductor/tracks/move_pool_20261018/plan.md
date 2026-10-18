# Implementation Plan: Learnable Move Pool & Loadout Depth

## Phase 1 - Catalog and unlock rules (sim, TDD)

- [ ] Task: Record the pre-change balance baseline
  - [ ] Run the existing mirror and cross-element probes over the seed batch and save the numbers (win rates, stall count, per-move usage) as the comparison point for Phases 3 and 5
- [ ] Task: Write failing catalog tests
  - [ ] Assert six moves per playable element; the two new entries carry exactly `7/95/1` and `14/70/3`; all three elements mirror index-for-index
  - [ ] Assert every pre-existing move keeps its id, power, accuracy, cooldown, and index
- [ ] Task: Write failing unlock and pool tests
  - [ ] Gate table: baby day 0 → 2 known, 3 trained days → 3, 6 trained days → 6, juvenile day 0 → 3 (stage counts as training for index 2 only)
  - [ ] `defaultLoadout` at six known moves returns the first four, never six
  - [ ] `setLoadout` accepts indices 4-5 only once known; rejects basic, unknown, duplicate, and over-cap entries with today's message shapes
  - [ ] A v15 save with `loadout: null` at 6 trained days resolves to the same four ids as before this track
- [ ] Task: Implement the catalog and pool rules
  - [ ] Add the six moves (Flare Dart, Pyre Lance, Vine Lash, Root Quake, Mist Spray, Maelstrom) appended per element
  - [ ] Replace `tierCount` with `knownCount` + `knownMoves`, extend `requiredTierDays` to indices 4-5, and cap `defaultLoadout` by `MAX_LOADOUT`
  - [ ] Split catalog and pool code across modules if either file crosses the 12 KB cap; update the sim barrel and its export list
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

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
  - [ ] Mirrors and cross-element within ±5 points; zero 40-tick stalls; every new move chosen by the AI in at least one matchup
- [ ] Task: Documentation
  - [ ] `tech-stack.md`: move-pool layout, derived-knowledge note, rival-kit determinism rule
  - [ ] `docs/save-schema.md`: explicit statement that move knowledge is derived and no v16 exists
- [ ] Task: Final `bun run verify`, determinism gate, and track checkpoint
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes

Boss probes run after rival kits exist so the probe harness is built once. The
Phase 5 matrix re-runs the Phase 1 baseline with the same seeds, which is what
makes the ±5 point bound measurable rather than impressionistic.
