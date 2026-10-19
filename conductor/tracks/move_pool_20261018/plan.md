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

- [x] Task: Write failing rival-kit tests (`86cf97b`)
  - [x] Same seed produces the same four moves; different seeds can differ; kit length is always 4 and always a subset of the species' six
  - [x] Spar `rivalSpeciesId`, `rivalTactic`, and creature stats are unchanged for fixed seeds against the pre-change baseline
  - [x] Cup opponents' kits are deterministic per session seed and index
- [x] Task: Implement `rivalKit` with a derived RNG (`86cf97b`)
  - [x] Derive from the existing seed with a distinct constant so the stream is not consumed; wire `battle/exhibition.ts` and `cup/verdicts.ts`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 86cf97b]
  - Re-baselined on purpose, per NFR3: the cup goldens and the SF-exit lifecycle fixture move to champion seed 17, eliminated seed 7, contracts SF seed 3, because rivals now field different fours. Over 100 default-kit cup seeds the placement mix (champion / runner-up / SF exit / QF exit) moves 9/17/30/44 -> 7/18/24/51 percent. The Phase 5 matrix reads this as the reference, not Phase 1's baseline: the `kit6` cases there already include the new moves (the Phase 1 baseline predates the catalog), while `kit2`/`kit3`/`kit4` are unchanged.

## Phase 3 - Boss kits and per-boss evidence

- [x] Task: Widen the six boss loadouts to draw from the new pool (`58ba82f`)
  - Each boss fields at least one wider-pool row, and the species-sharing pairs differ: koda `spark/flame_charge/blaze_bolt/flare_dart` vs fenn `spark/flame_charge/blaze_bolt/pyre_lance`; hesse `seed_shot/thorn_volley/spore_burst/vine_lash` vs thessa `seed_shot/thorn_volley/bramble_dart/root_quake`; marlow `bubble/splash_bolt/foam_volley/mist_spray` vs delmar `bubble/tide_shot/foam_volley/mist_spray`.
  - Stats re-pinned inside each species' roll bounds: koda `92/13/10/12`, fenn `92/13/9/12`, hesse `100/11/13/8`, thessa `95/11/13/8`, marlow `92/12/9/11`, delmar `93/11/11/11`.
- [x] Task: Per-boss probe against a stage-appropriate reference creature (`58ba82f`)
  - [x] Record each boss's player win rate; adjust its kit until it sits in 40-70%
  - [x] Write tests pinning boss kit length, move validity, and the recorded win band
  - **Band definition (user choice, `m0486`):** the 40-70% band applies to each boss's *hardest legal matchup* (its disadvantaged species at full training), not to the mirror. The mirror band was measured as infeasible for the water bosses: no stat line inside `statBounds` put marlow or delmar in it without dropping fire at cap under the 35% fairness floor. The old floors stay: fresh player 0 wins on even/worse elements, disadvantaged player 0 wins at +0/+2/+4 training.
  - **Recorded rates** (wins of 36, production `battleSideForSlot` path): koda 23 (63.9%), hesse 21 (58.3%), marlow 20 (55.6%), delmar 17 (47.2%), fenn 22 (61.1%), thessa 20 (55.6%). `bosses.balance.test.ts` asserts the tallies exactly, so any later kit or stat edit must re-record.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: 58ba82f]

## Phase 4 - Client surfaces (manual verification)

- [x] Task: Loadout picker, coaching room, and creature detail (`cd8acb0`)
  - [x] Six rows with locked ones showing gate copy ("Train N more days" / "Evolve to unlock"), equip and unequip of any known move, save round-trip
  - [x] Handbook move table and picker copy updated to describe the pool
  - **Verified:** birth picker reads 2 of 6 with "Unlocks in 3 days or on evolution" on Cinder Shot; the detail modal lists all six (2 In kit, 2 Learned, 2 gated). At 6 trained days the picker shows six rows, unequipping Spark and equipping Pyre Lance survived a reload via `state.creature.loadout`. Handbook Moves tab renders 3 tables x 6 rows. Also fixed the handbook panel to scroll (it previously bled under the pinned footer) and the phone picker to park below the top-left chips.
- [x] Task: Battle FX inheritance (`cd8acb0`)
  - [x] New moves inherit element `SHOT_LOOK` and `MOVE_FX`; add a bespoke entry only where two moves read identically
  - **Bespoke:** the three heavies (Pyre Lance / Root Quake / Maelstrom) get their own shot read so each element's steady + heavy pair differs; Flare Dart / Vine Lash / Mist Spray inherit the element look and `DEFAULT_FX`.
- [x] Task: Browser verification with `playwright-cli` (`cd8acb0`)
  - [x] Drive ranch → coaching room → spar, play at least one new move, screenshot each surface, confirm zero console errors; run the iPhone 15 layout pass on the picker
  - **Verified:** coaching room lists the full six-move rival pool and captions "Fields four of these six"; the spar log shows Pyre Lance (18 on a hit, one miss) and Flare Dart (three hits) in play; console reports 0 errors / 0 warnings. iPhone 15 (393x852): picker panel starts below the HUD chips and scrolls to the tactic buttons.
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) [checkpoint: cd8acb0]
  - Verified 2026-10-19: 1421 client+sim tests green, typecheck clean (213 files), biome clean on all 12 changed files, determinism gate byte-identical. Browser pass covered all four surfaces plus the battle log; the two layout defects it exposed (handbook bleed, phone picker under the chips) are fixed in the same commit and re-verified at 393x852.

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
