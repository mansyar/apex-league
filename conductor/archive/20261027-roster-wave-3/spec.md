# Roster Wave 3 (Breeding Discovery) — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

The roster grows from nine species to twelve: three new lines — **Voltfox** (electric, spark-tailed fox), **Galeheron** (wind, storm-wading heron), **Shalemole** (earth, slate-scaled mole) — covering the three singleton elements. They are acquired through a **new breeding-discovery seam**: fixed parent-element recipes evaluated as a pure lookup at breed time. Each line ships with a distinct voxel archetype, a six-move kit from the existing vocabulary, full lifecycle parity, and rival-field plus boss integration. Discovery adds no persisted state — the save stays v25.

## Problem / Motivation

The roadmap targets 20–40 species; 9 exist. Electric, wind, and earth have exactly one line each, so cup fields, breeding-pair space, and handbook depth lean on fire/plant/water. Meanwhile the dynasty breeding system only recombines what the player already owns — it has never *produced* anything new. If unsolved, the roster climbs only through reward handouts and a whole acquisition dimension stays unused.

## Goals & Success Metrics

- **Goal:** three fully playable new lines discovered through breeding, with no schema change.
- **Metric:** `ALL_SPECIES` holds 12 species; each of the three recipes is deterministic, unit-pinned, and hinted in the handbook; all gates (`verify`, determinism, module caps, balance probe) green.

## Scope

### In Scope

- 3 new `SpeciesDef` entries (electric/wind/earth) with fixed six-move kits; breeding-only acquisition — excluded from the starter draft and the reward tiers.
- One new voxel archetype recipe per line (generator pipeline, gilded rarity gate at weight 32, baked AO, GLB tripwire ≤320 KiB).
- Per-line kits composed only from existing move vocabulary; tuned against the balance probe.
- Discovery as a pure breed-time lookup: order-independent element pairs — electric×wind → Voltfox, wind×water → Galeheron, earth×fire → Shalemole. Unlisted and same-element pairs inherit exactly as today.
- Full lifecycle parity: egg hatch → training → two branching champion forms.
- Rival pools draw the new species; the six authored gatekeeper boss pairings are refreshed and each verified end-to-end in the browser.
- Client presentation: handbook entries (with openly listed recipes), pickers/plates/stable/creature-detail/growth/battle staging, element-true crest colors (Electric 50°, Wind 165°, Earth 28°).
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
| FR-1 | Three new `SpeciesDef` entries exist with id, element (electric/wind/earth), stats, and a fixed six-move kit; `ALL_SPECIES` includes them; they are excluded from `obtainableSpecies` starter and reward paths and enter play only through breeding discovery. | must |
| FR-2 | Each new line has a distinct voxel archetype built by the generator pipeline, passing the determinism gate and ≤320 KiB tripwire, with the gilded gate at the shared weight 32. | must |
| FR-3 | Each new kit uses only existing move vocabulary; battle behavior tuned against the tactics balance probe within existing band discipline. | must |
| FR-4 | Breeding evaluates the fixed recipes as a pure, deterministic, order-independent lookup on parent elements; unlisted and same-element pairs inherit exactly as today; discovery adds no persisted state (save stays v25). | must |
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
| NFR-4 | Element hue contract honored (Electric 50°, Wind 165°, Earth 28°); surface ramp rules; gilded cosmetic-only. |
| NFR-5 | Balance work uses the probe; no regression in existing goldens beyond re-baselining forced by boss refresh. |
| NFR-6 | New UI surfaces pass UX Principle 8 at 393×852 and 852×393. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `ALL_SPECIES` = 12; unit tests pin each new `SpeciesDef` and their exclusion from starter/reward paths. | FR-1 |
| AC-2 | Determinism gate passes with the three new GLBs' digests pinned (all life stages); tripwire green. | FR-2 |
| AC-3 | Probe report shows each new kit within existing bands; existing goldens green (or re-baselined only for boss refresh, recorded). | FR-3 |
| AC-4 | Unit tests prove: each recipe fires in both parent orders; same-element and unlisted pairs inherit unchanged; discovered lines breed true as parents; no new persisted state. | FR-4 |
| AC-5 | Hatch → train → branch-evolution tests pass for all three lines. | FR-5 |
| AC-6 | Every refreshed boss pairing played end-to-end in the browser; evidence in the visual layer. | FR-6 |
| AC-7 | Handbook/plates/detail/battle render all three correctly at 1440×900 and 393×852; handbook openly lists the three recipes; console clean. | FR-7 |
| AC-8 | Copy review: all new strings ≤2 sentences, single-sourced. | FR-8 |

## Edge Cases

- **New × new crosses:** recipes are element-level, so they apply consistently (e.g. Voltfox × Galeheron is electric×wind → Voltfox).
- **Same-element / unlisted pairs:** byte-identical behavior to today.
- **No duplicates possible:** nothing persisted — discovery re-derives every breed.
- **Nursery capacity:** unchanged; the egg flows through the identical slot.
- **Breeding as parents:** new lines participate under existing floor rules.
- **Gilded / tripwire:** same gates as Wave 2.

## Dependencies

- **Tracks:** none (builds on merged `main`).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** display names final as approved (`voltfox`, `galeheron`, `shalemole` slugs); recipes openly listed in the handbook (no spoiler hiding).
- **Assumption:** stat spreads land within band discipline; exact numbers are plan-time, probe-validated.
- **Assumption:** boss refresh may slightly re-tune existing boss kits within their row discipline.

## References

- `packages/sim/src/species.ts`, breeding flow (dynasty-breeding archive track)
- `conductor/tech-stack.md` — voxel pipeline, kit rules, determinism gate
- `conductor/product-guidelines.md` — hue contract, voice
- `conductor/learnings.md` — lessons 12–13
- Archived species waves: `conductor/archive/20261021-electric-species-line/`, `conductor/archive/20261023-earth-wind-species-line/`, `conductor/archive/20261025-species-roster-expansion/`
