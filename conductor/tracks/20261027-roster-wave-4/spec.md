# Roster Wave 4 (Fire/Plant/Water Discovery) — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

The roster grows from twelve species to fifteen: three new lines — **Embercub** (fire, ember-maned cub), **Mossboar** (plant, moss-backed boar), **Mistkit** (water, mist-diving otter-kit) — giving Fire, Plant, and Water their third lines. They are acquired through the existing **breeding-discovery seam**: fixed parent-element recipes evaluated as a pure lookup at breed time. Each line ships with a distinct voxel archetype, a six-move kit from the existing vocabulary, full lifecycle parity, and rival-field plus boss integration. Discovery adds no persisted state — the save stays v25.

## Problem / Motivation

The roadmap targets 20–40 species; 12 exist, balanced at exactly 2 per element. Fire/Plant/Water — the starter families every player meets first — have no discovery lines, so the breeding system still produces nothing new for the most-played elements. If unsolved, the roster climbs only through reward handouts and the starter trio stays shallow while the collection hook (Wave 3's discovery) stalls at 12.

## Goals & Success Metrics

- **Goal:** three fully playable new starter-family lines discovered through breeding, with no schema change.
- **Metric:** `ALL_SPECIES` holds 15 species; each of the three recipes is deterministic, unit-pinned, and hinted in the handbook; all gates (`verify`, determinism, module caps, balance probe) green.

## Scope

### In Scope

- 3 new `SpeciesDef` entries (fire/plant/water: `embercub` / `mossboar` / `mistkit`) with fixed six-move kits; breeding-only acquisition — excluded from the starter draft and the reward tiers.
- One new voxel archetype recipe per line (`cub`, `boar`, `otter` — all unused today; 12 existing: drake, bovine, axolotl, storm_hound, frond, falcon, crab, tortoise, smolder, mole, heron, fox), generator pipeline, gilded rarity gate at weight 32, baked AO, GLB tripwire ≤320 KiB.
- Per-line kits composed only from existing move vocabulary; tuned against the balance probe.
- Discovery as a pure breed-time lookup: order-independent element pairs — fire×plant → Embercub, plant×water → Mossboar, fire×water → Mistkit. Unlisted and same-element pairs inherit exactly as today. No overlap with Wave 3 pairs (electric×wind, wind×water, earth×fire).
- Full lifecycle parity: egg hatch → training → two branching champion forms.
- Rival pools draw the new species; the six authored gatekeeper boss pairings are refreshed and each verified end-to-end in the browser.
- Client presentation: handbook entries (with openly listed recipes), pickers/plates/stable/creature-detail/growth/battle staging, element-true crest colors (Fire 18°, Plant 110°, Water 205°).
- Copy single-sourced in the product voice.

### Out of Scope

- New move mechanics or effects (sim/battle core untouched).
- Reward-seam, gift-seam, or starter-seam acquisition for the new lines.
- Discovery-chance rolls or prestige gates (later waves may add them).
- Backend, cloud saves, ghosts, leaderboards.
- More than 3 lines.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Three new `SpeciesDef` entries exist (`embercub` fire / `mossboar` plant / `mistkit` water) with stats and a fixed six-move kit; `ALL_SPECIES` includes them; they are excluded from `obtainableSpecies` starter and reward paths and enter play only through breeding discovery. | must |
| FR-2 | Each new line has a distinct voxel archetype (`cub`, `boar`, `otter`) built by the generator pipeline, passing the determinism gate and ≤320 KiB tripwire, with the gilded gate at the shared weight 32. | must |
| FR-3 | Each new kit uses only existing move vocabulary; battle behavior tuned against the tactics balance probe within existing band discipline. | must |
| FR-4 | Breeding evaluates the fixed recipes as a pure, deterministic, order-independent lookup on parent elements (fire×plant→Embercub, plant×water→Mossboar, fire×water→Mistkit); unlisted and same-element pairs inherit exactly as today; discovery adds no persisted state (save stays v25). | must |
| FR-5 | New species hatch from eggs, respond to all training programs, and evolve into exactly two champion branch forms from the training record, identical in mechanism to existing species. | must |
| FR-6 | Rival generation can field the new species; the six authored boss pairings are refreshed to use the wider roster, each verified by playing the cup end-to-end in the browser. | must |
| FR-7 | The new species render correctly across all client surfaces with element-true crest colors per the hue contract. | must |
| FR-8 | Copy for the new lines follows the product voice and is single-sourced like existing species copy. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No save-schema change (save stays v25); no new dependencies; no breeding-seam redesign — discovery is a lookup inside the existing flow. |
| NFR-2 | Module caps hold (12 KB client/sim, 24 KB voxel model files); CSS growth proportionate. |
| NFR-3 | Determinism gate is absolute — new GLBs generated, digests pinned; never hand-edited. |
| NFR-4 | Element hue contract honored (Fire 18°, Plant 110°, Water 205°); surface ramp rules; gilded cosmetic-only. |
| NFR-5 | Balance work uses the probe; no regression in existing goldens beyond re-baselining forced by boss refresh. |
| NFR-6 | New UI surfaces pass UX Principle 8 at 393×852 and 852×393. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `ALL_SPECIES` = 15; unit tests pin each new `SpeciesDef` and their exclusion from starter/reward paths. | FR-1 |
| AC-2 | Determinism gate passes with the three new GLBs' digests pinned (all life stages); tripwire green. | FR-2 |
| AC-3 | Probe report shows each new kit within existing bands; existing goldens green (or re-baselined only for boss refresh, recorded). | FR-3 |
| AC-4 | Unit tests prove: each recipe fires in both parent orders; same-element and unlisted pairs inherit unchanged; discovered lines breed true as parents; no new persisted state. | FR-4 |
| AC-5 | Hatch → train → branch-evolution tests pass for all three lines. | FR-5 |
| AC-6 | Every refreshed boss pairing played end-to-end in the browser; evidence in the visual layer. | FR-6 |
| AC-7 | Handbook/plates/detail/battle render all three correctly at 1440×900 and 393×852; handbook openly lists the three recipes; console clean. | FR-7 |
| AC-8 | Copy review: all new strings ≤2 sentences, single-sourced. | FR-8 |

## Edge Cases

- **New × new crosses:** recipes are element-level, so they apply consistently (e.g. Embercub × Mossboar is fire×plant → Embercub).
- **Same-element / unlisted pairs:** byte-identical behavior to today.
- **Wave 3 interplay:** Wave 3 pairs unchanged; fire×plant / plant×water / fire×water are new pairs with no prior discovery meaning.
- **No duplicates possible:** nothing persisted — discovery re-derives every breed.
- **Nursery capacity:** unchanged; the egg flows through the identical slot.
- **Breeding as parents:** new lines participate under existing floor rules.
- **Gilded / tripwire:** same gates as Wave 3.

## Dependencies

- **Tracks:** none (builds on merged `main`).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** display names final as approved (`Embercub`, `Mossboar`, `Mistkit`; slugs `embercub`, `mossboar`, `mistkit`; archetypes `cub`, `boar`, `otter`); recipes openly listed in the handbook (no spoiler hiding).
- **Assumption:** stat spreads land within band discipline; exact numbers are plan-time, probe-validated.
- **Assumption:** boss refresh may slightly re-tune existing boss kits within their row discipline.

## References

- `conductor/archive/20261027-roster-wave-3/spec.md` — Wave 3 precedent (same seam, same gates)
- `packages/sim/src/species/`, breeding flow (`breeding/discovery.ts`)
- `conductor/tech-stack.md` — voxel pipeline, kit rules, determinism gate
- `conductor/product-guidelines.md` — hue contract, voice
- `conductor/learnings.md` — lessons 12–13
