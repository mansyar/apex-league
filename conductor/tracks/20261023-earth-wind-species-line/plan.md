# Earth & Wind Species Line — Implementation Plan

> **Branch:** `feat/20261023-earth-wind-species-line`
> **Base:** `main` @ `e9fea33945c340e7a5e33d81a88796547fe71302`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

**Constraints that apply to every phase**

- Every module stays at or under its package cap — 12,288 B in `apps/client`
  and `packages/sim`, 24,576 B in `packages/voxel` (NFR-1). The three
  package guards must stay green.
- Sim logic is pure, seeded, DOM-free, and TDD'd (NFR-3). Reward eggs consume
  no drift RNG draw; existing seeded streams stay byte-identical.
- No new dependencies (NFR-2). No `any` escapes, no `@ts-ignore`; Biome
  clean; named exports per `conductor/code_styleguides/typescript.md`.
- The six authored bosses carry no new species and no behavior change
  (NFR-4); existing golden tests stay green unchanged.
- New visuals follow `product-guidelines.md`: semantic voxel palette classes,
  ambient occlusion as the only darkening pass (0.72 floor), dark bead eyes;
  Earth hue 28° and Wind hue 165° sourced from `apps/client/src/ui/element.ts`.
- `verify_phase` (`bun run verify && bun run build`) also runs at every phase
  acceptance in addition to the phase's own Verification command.
- `SAVE_VERSION` bumps 24 → 25 in Phase 2; the save-schema quality gate
  (bump + linear migration + `docs/save-schema.md`) applies from that phase on.

## Phase 1: Species Data & Move Pools

- **Goal:** `earth_tortoise` and `wind_falcon` are fully defined at their stat
  extremes with 16 new moves, learn schedules, breeding acceptance, and
  tier-gated rival rosters — all data-driven, with balance probes green.
- **Depends on:** none
- **Covers:** FR-1, FR-3, FR-4, FR-7, FR-10, NFR-3, NFR-4, AC-3, AC-4, AC-10 (rival half of AC-7)
- **Touches:** `packages/sim/src/species.ts`, `packages/sim/src/species.test.ts` (new), `packages/sim/src/battle/moves.ts`, `packages/sim/src/battle/moves.test.ts`, `packages/sim/src/breeding.ts`, `packages/sim/src/breeding/**`, `packages/sim/src/cup/bracket.ts`, `packages/sim/src/battle/species-balance.test.ts` (new), the evolution/branch data home for species forms, plus new co-located tests for anything added
- **Verification:** `bun test --timeout 120000 packages/sim && bun run check && biome check`
- **Status:** verified

**Result:** verified
**Checkpoint:** 8132e0b
**Evidence:** conductor/tracks/20261023-earth-wind-species-line/verification/phase-1.md

- [x] **P1.T1: Define the two species** — covers: FR-1, FR-3
  - [x] **P1.T1.1: SpeciesDef entries** — `earth_tortoise` (fortress: highest HP and DEF in the game, lowest SPD) and `wind_falcon` (speedster: highest SPD, low HP) with temperament, `statBounds`, kit, `rewardFromTier: "gold"` / `"legend"`, and `available: true`; the starter seam refuses both ids
  - [x] **P1.T1.2: Evolution and champion branch data** — base + evolved + two branch forms per species in the branching machinery's data home (follow the branching-evolution pattern; accent-tint champions, no extra GLBs); display names and flavor text following the existing naming style
  - [x] **P1.T1.3: Species tests** — stat-extreme assertions, element wiring, kit shape, starter/refusal behavior
- [x] **P1.T2: Author the 16 moves** — covers: FR-4
  - [x] **P1.T2.1: Eight Earth moves** — six kit rows + two branch signatures, existing effect vocabulary only (damage / buff / debuff)
  - [x] **P1.T2.2: Eight Wind moves** — same shape
  - [x] **P1.T2.3: Schedule and equip tests** — learn schedule (0-1 at birth, 2 by trained day 3, 3-5 by day 6) and the equip-4 rule for both pools
- [x] **P1.T3: Wire the data-driven seams** — covers: FR-7, FR-10
  - [x] **P1.T3.1: Breeding acceptance** — `validatePair`, `speciesOptions`, and offspring element rules accept both released species with no new mechanics
  - [x] **P1.T3.2: Rival rosters** — generated rosters may field `wind_falcon` from Gold and `earth_tortoise` from Legend
  - [x] **P1.T3.3: Bosses unchanged** — an assertion that the six authored boss sides are byte-identical to before
- [x] **P1.T4: Balance probes** — covers: FR-3, NFR-4
  - [x] **P1.T4.1: Tortoise probe** — methodology mirrors the boss-band probes with a self-defined sane band
  - [x] **P1.T4.2: Falcon probe** — same
  - [x] **P1.T4.3: Existing goldens unchanged** — full existing suite green without edits to golden expectations

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261023-earth-wind-species-line/verification/phase-1.md
-->

## Phase 2: The League Reward Seam & Save v25

- **Goal:** the storm-gift mechanism is generalized into a per-tier league
  reward record (`claimedTiers` + pending-reward queue), `SAVE_VERSION` bumps
  to 25 with a lossless v24→v25 migration, and the nursery claim flow serves
  every tier.
- **Depends on:** Phase 1
- **Covers:** FR-5, FR-6, FR-8, FR-9 (claim UI), NFR-6, AC-5, AC-6, AC-8
- **Touches:** `packages/sim/src/state.ts`, `packages/sim/src/cupRewards.ts`, `packages/sim/src/breeding/gift.ts`, `packages/sim/src/breeding.ts`, `packages/sim/src/ticker.ts`, `packages/sim/src/index.ts`, `packages/sim/src/save/schema.ts`, `packages/sim/src/save/migrations/v24.ts` (new), `packages/sim/src/save/migrations/index.ts`, `packages/sim/src/save/migrations.test.ts`, `packages/sim/src/save/giftSave.test.ts`, `packages/sim/src/save/validators/session.ts`, `packages/sim/src/save/storm-gift.test.ts` moved/renamed as needed, `packages/sim/src/cup/storm-gift.test.ts`, `apps/client/src/gift.ts`, `apps/client/src/cup/results.ts`, `docs/save-schema.md`, plus new co-located tests
- **Verification:** `bun test --timeout 120000 && bun run check && biome check`
- **Status:** verified

**Result:** verified
**Checkpoint:** 5fed606
**Evidence:** conductor/tracks/20261023-earth-wind-species-line/verification/phase-2.md

- [x] **P2.T1: Generalize the reward record** — covers: FR-5, FR-8
  - [x] **P2.T1.1: Field shape in `state.ts`** — replace `stormGiftClaimed: boolean` with a per-tier claim record and generalize `pendingGift` into a pending-reward queue; honest renames of the `stormGift*` seams (`stormGiftPending` → tier-agnostic pending check, `stormGiftPreview` → reward preview, `applyStormGift` → the per-tier grant)
  - [x] **P2.T1.2: Per-tier grant logic** — `cupRewards.ts` stamps each released reward tier (`rewardFromTier`) the player's current tier has reached, once, on non-forfeit finalize; tiers grant independently
  - [x] **P2.T1.3: Claim-once persistence** — claims survive saves and never duplicate
- [x] **P2.T2: Migration v24→v25** — covers: FR-8, NFR-6
  - [x] **P2.T2.1: The v24 step** — `stormGiftClaimed: true` maps to the Silver tier's claim; a pending storm gift maps to a pending Silver reward; nothing else changes; `SAVE_VERSION` → 25
  - [x] **P2.T2.2: Register in the chain** — `migrations/index.ts` gains the v24 entry; the chain stays 0…24
  - [x] **P2.T2.3: Migration tests** — v24 save with a claimed + a pending storm gift round-trips to identical semantic state; `giftSave.test.ts` extended or renamed honestly
  - [x] **P2.T2.4: `docs/save-schema.md`** — version bump documented, the per-tier reward record described, the recipe still accurate
- [x] **P2.T3: Consumer surfaces** — covers: FR-5, FR-9
  - [x] **P2.T3.1: Nursery claim flow** — `apps/client/src/gift.ts` and the nursery preview claim from the reward queue; preview matches the hatch exactly for every tier
  - [x] **P2.T3.2: Cup results** — `apps/client/src/cup/results.ts` reflects the generalized pending check
- [x] **P2.T4: Grant and purity tests** — covers: FR-5, FR-6, NFR-3
  - [x] **P2.T4.1: Grant rules** — fires exactly once per tier at tier ≥ threshold; never below; never on forfeit; tiers independent
  - [x] **P2.T4.2: Multi-pending migrated saves** — an old save past multiple tiers grants each egg in order
  - [x] **P2.T4.3: Stream purity** — reward eggs consume no drift RNG draw; existing seeded streams byte-identical

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261023-earth-wind-species-line/verification/phase-2.md
-->

## Phase 3: The Voxel Archetypes

- **Goal:** two hand-authored archetypes (tortoise, falcon) produce six
  growth-stage GLBs registered in the determinism gate, with the existing
  twelve digests unchanged.
- **Depends on:** Phase 1 (species definitions set the identity), Phase 2 (not required — models are independent of save state)
- **Covers:** FR-2, NFR-2, NFR-5, AC-2
- **Touches:** `packages/voxel/src/earth_tortoise.ts` (new), `packages/voxel/src/wind_falcon.ts` (new), the voxel archetype registry, `packages/voxel/scripts/determinism-gate.ts`, generated GLB artifacts under `apps/client/public/voxel/**` (committed), plus co-located voxel tests
- **Verification:** `bun run gate:determinism && bun test --timeout 120000 packages/voxel && bun run check`
- **Status:** verified

**Result:** verified
**Checkpoint:** 4c5d29d
**Evidence:** conductor/tracks/20261023-earth-wind-species-line/verification/phase-3.md

- [x] **P3.T1: Tortoise archetype** — covers: FR-2, NFR-5
  - [x] **P3.T1.1: Three-stage builder** — baby, juvenile, champion shapes following the established archetype pattern (template data + build function, local helpers, seed-driven variation)
  - [x] **P3.T1.2: Palette and identity** — semantic voxel classes, AO as the only darkening pass (0.72 floor), dark bead eyes, Earth hue 28° from `ui/element.ts`
  - [x] **P3.T1.3: Gate registration** — the three GLBs registered with the prop digest manifest
- [x] **P3.T2: Falcon archetype** — covers: FR-2, NFR-5
  - [x] **P3.T2.1: Three-stage builder** — same shape, silhouettes distinct from the storm hound
  - [x] **P3.T2.2: Palette and identity** — Wind hue 165°, same rules
  - [x] **P3.T2.3: Gate registration** — three more GLBs
- [x] **P3.T3: Determinism gate extension** — covers: FR-2, NFR-2
  - [x] **P3.T3.1: 12 → 18 creature GLBs** — all eighteen regenerate byte-identical across runs
  - [x] **P3.T3.2: Existing digests unchanged** — the twelve pre-existing GLBs and five props stay byte-identical

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261023-earth-wind-species-line/verification/phase-3.md
-->

## Phase 4: Integration & the Full Gate

- **Goal:** the full lifecycle is proven end-to-end for both species, the
  client surfaces present them data-only, and the whole verification strategy
  — including the visual layer — is green on the track branch.
- **Depends on:** Phase 2, Phase 3
- **Covers:** FR-1, FR-9, AC-1, AC-7, AC-9
- **Touches:** `packages/sim/src/lifecycle-integration.test.ts` (new or equivalent co-located home), `packages/sim/src/index.ts` (exports if needed), `apps/client/src/mock/**` (handbook/mock data if the surfaces need registration), plus co-located test updates where the integration lives
- **Verification:** `bun run verify && bun run build` (visual layer via `playwright-cli` against `bun run dev`)
- **Status:** verified

**Result:** verified
**Checkpoint:** b49e2bf
**Evidence:** conductor/tracks/20261023-earth-wind-species-line/verification/phase-4.md

## Phase R1: Review Fixes

- **Goal:** Resolve review findings F1, F2 and F3.
- **Depends on:** Phase 4
- **Covers:** F1, F2, F3
- **Touches:** `packages/sim/src/species.ts`, `packages/sim/src/species.test.ts`, `packages/sim/src/battle/species-balance.test.ts`, `apps/client/src/handbook/chart.ts`, `packages/sim/src/save/giftSave.test.ts`, plus any co-located test a probe re-pin requires
- **Verification:** `bun test --timeout 120000 && bun run check && biome check`
- **Status:** pending

- [ ] **R1.T1: Resolve F1 — make the falcon's "highest SPD" claim whole-range true** — covers: F1
	- [ ] **R1.T1.1: Raise the falcon spd floor to 17** in `species.ts` (bounds `[17, 19]`) so no existing species' roll range overlaps it, keeping hp/atk/def bounds as authored
	- [ ] **R1.T1.2: Assert whole-roll-range dominance** in `species.test.ts`: `falcon.statBounds.spd[0] > every other species' statBounds.spd[1]`, matching the hound precedent's convention
	- [ ] **R1.T1.3: Re-pin the affected probe tallies** in `battle/species-balance.test.ts` if the roll-space change shifts any measured cell, and record the before/after in the evidence
- [ ] **R1.T2: Resolve F2 — the handbook population note** — covers: F2
	- [ ] **R1.T2.1: Update `POPULATION_NOTE`** in `apps/client/src/handbook/chart.ts` to the current roster (three starters + the Silver/Gold/Legend reward lines), keeping the ≤2-sentence guideline
- [ ] **R1.T3: Resolve F3 — the lossless test must prove what its title says** — covers: F3
	- [ ] **R1.T3.1: Strengthen the v24 mapping assertion** in `save/giftSave.test.ts` to a full-state `toEqual` between `migrate(v24 payload).state` and the hand-built equivalent v25 state


- [x] **P4.T1: Lifecycle integration test** — covers: FR-1
  - [x] **P4.T1.1: Tortoise end-to-end** — obtain egg via Legend reward → hatch → raise → evolve → choose a champion branch → win a cup
  - [x] **P4.T1.2: Falcon end-to-end** — same via the Gold reward
- [x] **P4.T2: Client data surfaces** — covers: FR-9
  - [x] **P4.T2.1: Handbook and detail surfaces** — chart rows, move pages, creature plate, detail modal, starter card show both species with no special-casing
- [x] **P4.T3: Visual pass** — covers: FR-9
  - [x] **P4.T3.1: Desktop and iPhone 15 screenshots** — nursery gift flow with a pending reward, handbook entries for both species, battle HUD with both species in play; clean console
- [x] **P4.T4: Full gate** — covers: NFR-1, NFR-2, NFR-4
  - [x] **P4.T4.1: Whole verification** — `bun run verify && bun run build` green end-to-end, determinism gate at 18 GLBs, all guards green

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261023-earth-wind-species-line/verification/phase-4.md
-->

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 2
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
