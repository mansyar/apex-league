# Electric Species Line

> **Stability:** approved requirement IDs (`FR-n`, `NFR-n`, `AC-n`) are permanent. Never renumber or reuse them; if a requirement is dropped, mark it `Withdrawn` and leave its ID gap intact.

## Overview

Apex League's roster is three species against a 20–40 target — the most player-visible limitation of the game. This track adds the first new line: an **Electric storm hound** (`electric_hound`), delivered as a complete three-stage branching line (base → evolved → two accent-tint champion forms), obtained through a **Silver tier-reward egg**, and integrated into generated rival rosters, the handbook, and every existing client surface. A conductor housekeeping pre-task rides along as Phase 0.

## Problem / Motivation

- The species contract (`product.md`: "20–40 original species in 3-stage branching evolution trees") has only ever been exercised by the original starter trio (fire_drake, plant_ox, water_axolotl).
- The Electric element (hue 50° in `ui/element.ts`) exists in the type chart but appears on no playable creature.
- The voxel pipeline (archetype DNA → SDF → voxel grid → greedy mesh → GLB), branching machinery, and determinism gate are proven but unproven *for a second authoring pass*. This track validates the pipeline scales before the rest of Phase 3 content is committed.

## Goals & Success Metrics

- **Goal:** a player can obtain, raise, evolve, branch, and win a cup with an Electric creature end-to-end.
- **Metric:** determinism gate green with 11 creature GLBs (9 existing + 2 new), all byte-identical across runs.
- **Metric:** six authored boss win-rate bands (40–70%) and all existing goldens remain byte-identical.
- **Metric:** new-species balance probe passes using the boss-band probe methodology.

## Scope

### In
- Species data for `electric_hound`: full 3-stage line (base, evolved, two branching champion forms), fast-striker base stats, 6-move pool using only existing effect vocabulary.
- Storm-hound voxel archetype in `packages/voxel`; **2 new creature GLBs** (base, evolved); champion forms are accent-hue tints of the evolved GLB (matching existing branching machinery); archetype structured so sculpted champion forms can be added later without rework.
- Silver tier-reward grant: on cup finalize, if current tier ≥ Silver and never claimed, the league grants the gift egg; claim state persists in the save.
- **Pure gift egg:** fixed Electric element, guaranteed `affinity: null` (no drift roll, no RNG draw consumed); previewed = hatched.
- Generated rival rosters may field the species once it is obtainable; authored bosses unchanged.
- Handbook entries + existing UI surfaces (nursery, plate, detail modal).
- Save version bump (v21 if required) + migration + `docs/save-schema.md` in the same phase.
- Phase 0 housekeeping: delete stale `.conductor/runs/*` files; fix `ΓÇö` mojibake in early `conductor/tracks.md` entries.

### Out
- A 4th starter choice (starter selection stays Fire/Water/Plant).
- New battle effects or Electric-specific mechanics (moves use the existing vocabulary only).
- Changes to the six authored bosses or their win-rate bands.
- A wild-catching mechanic.
- Sculpted champion-form GLBs (future track; archetype must not preclude them).
- New UI systems beyond the reward moment and standard species integration.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Full 3-stage line for `electric_hound` — base form, evolved form, two branching champion forms — playable lifecycle end-to-end (obtain → raise → evolve → branch → compete) | must |
| FR-2 | Storm-hound voxel archetype authored via the established pipeline; 2 new creature GLBs (base, evolved) registered in the determinism gate; champion forms are accent-tint variants of the evolved GLB; archetype structured for future sculpted champion forms | must |
| FR-3 | Fast-striker stat profile (SPD/ATK tilt, low DEF) distinct from all three existing species | must |
| FR-4 | Move pool of 6 Electric-flavored moves using only the existing effect vocabulary (damage/buff/debuff); standard learn schedule (know 0–1 at birth, 2 by trained day 3, 3–5 by day 6) and equip-4 rule | must |
| FR-5 | On non-forfeit cup finalize: if the player's current tier ≥ Silver and the reward was never claimed, the league grants a pure gift egg; the claim is granted at most once and persists across saves | must |
| FR-6 | Pure gift egg: hatches with fixed Electric element and guaranteed `affinity: null`; never consumes a drift RNG draw; nursery preview matches the hatch exactly | must |
| FR-7 | Generated rival rosters may field `electric_hound` from the tier where it is obtainable; the six authored bosses carry no new species and no behavior change | should |
| FR-8 | Save persistence for the reward-claim flag and gift-egg lineage; save version bump with linear migration and `docs/save-schema.md` updated in the same phase | must |
| FR-9 | Handbook and existing client surfaces (nursery preview, creature plate, detail modal) present the species with no special-casing beyond data | should |
| FR-10 | Phase 0 housekeeping: `.conductor/runs/` contains no files for completed tracks; `conductor/tracks.md` early entries contain no mojibake | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Every client module stays at or under 12,288 B; `module-size.test.ts` green |
| NFR-2 | No new dependencies; the determinism gate is extended to 11 creature GLBs and stays byte-identical across runs |
| NFR-3 | Sim logic pure, seeded, DOM-free, TDD'd; the gift egg consumes no drift RNG draw so existing seeded streams stay byte-identical |
| NFR-4 | Existing balance invariants hold: six authored boss bands (Koda, Hesse, Marlow, Delmar, Fenn, Thessa) stay within 40–70%; all existing legacy/breeding/cup goldens unchanged |
| NFR-5 | Visuals follow `product-guidelines.md`: archetype palette via semantic voxel classes, AO only darkening (0.72 floor), dark bead eyes, Electric hue 50° sourced from `ui/element.ts` |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Full lifecycle demonstrated: obtain egg via Silver reward → hatch → raise → evolve → choose a champion branch → win a cup with the species | FR-1 |
| AC-2 | Determinism gate passes with 11 creature GLBs registered and byte-identical output | FR-2 |
| AC-3 | New-species balance probe passes (methodology mirrors the boss-band probes); existing boss bands unchanged | FR-3 |
| AC-4 | Move learn schedule and equip-4 tests green for the new move pool | FR-4 |
| AC-5 | Grant fires exactly once at tier ≥ Silver (non-forfeit finalize); never duplicates; never fires below Silver | FR-5 |
| AC-6 | Gift egg hatches Electric with `affinity: null`; nursery preview shows the same result | FR-6 |
| AC-7 | Generated rival rosters include the species post-obtainability; authored boss sides are byte-identical to before | FR-7 |
| AC-8 | Save round-trip preserves the claim flag and gift-egg lineage; migration (v20→v21 if bumped) green | FR-8 |
| AC-9 | Handbook and UI visual pass at desktop and iPhone 15 widths with a clean console | FR-9 |
| AC-10 | `.conductor/runs/` contains no stale files; `tracks.md` shows no mojibake | FR-10 |

## Edge Cases

- **Existing saves past Silver:** grant occurs at the next non-forfeit cup finalize where tier ≥ Silver and unclaimed (tier-check rule, not an exact-arrival rule).
- **Forfeited cups:** never trigger or consume the grant.
- **Stream purity:** the gift egg consumes no drift RNG draw — existing seeded streams stay byte-identical.
- **Breeding:** a hound follows standard dual-parent breeding rules; offspring element follows existing species-element rules.
- **Multiple eggs:** nursery holding an incubating egg while the gift egg arrives is supported (assumed existing behavior).
- **Repeat grants:** the claim flag prevents any second grant regardless of tier progression.

## Dependencies

- **Tracks:** none.
- **External:** none.

## Open Questions & Assumptions

- Display names for the three forms are finalized during implementation, following the existing naming style (assumption; species id `electric_hound` is fixed).
- Ranch/nursery egg capacity is assumed unlimited per current behavior (assumption).
- The new-species balance probe reuses the boss-band probe methodology with a self-defined sane band (assumption).

## References

- `conductor/product.md` — species contract, Core Loop, Phase 3 roadmap
- `conductor/tech-stack.md` — voxel pipeline, determinism gate, save versioning
- `conductor/product-guidelines.md` — palette semantics, eyes, a11y rules
- `conductor/archive/20261020-branching-evolution-champion-forms/` — branching machinery (accent tint, no new GLBs)
- `conductor/archive/20261020-training-programs-form/` — most recent species-adjacent integration pattern
