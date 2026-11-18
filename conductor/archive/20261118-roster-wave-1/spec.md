# Roster Wave 1 — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Add three original breeding-discovery species to the shipped roster, taking it from 15 to 18 across the existing six elements. Each species receives its own authored voxel archetype, two evolution branch forms, a fixed parent-element recipe, and a place in the handbook and gallery. The wave advances the product goal of 20–40 species without touching balance fences, save schema, or simulation contracts.

## Problem / Motivation

The current roster is 15 species against an explicit product goal of 20–40 original species in three-stage branching trees. All six elements exist, but Earth, Electric, and Wind have only two lines each while Fire, Water, and Plant have three. Players have a complete slice but limited collection variety. If the roster does not grow, the core "raise the champion" loop has too few long-term discovery targets and the roadmap goal remains unmet.

## Goals & Success Metrics

- **Goal:** Ship three new species that feel like distinct creatures, are discoverable through the established nursery recipe system, and pass the existing balance gate without waivers.
- **Metric:** `bun run balance` reports 18/18 species passing, cap share ≤ 33.3%, decisive share ≥ 66.7%, median duration 25–40 s, and 49/49 moves in damage band; all three seed-42 GLB sets are byte-identical on re-export; desktop and 393px captures show the new species and recipes with a clean console.

## Scope

### In Scope

- Three new species definitions in the sim catalog.
- Three new fixed parent-element breeding recipes.
- Two champion branch forms per new species.
- Three new voxel archetypes with authored templates, proportion budgets, body profiles, choreography coverage, boundary tests, and seed-42 baby/juvenile/champion GLB+manifest pairs.
- Client handbook/gallery/rival-field wiring so the new species and recipes are discoverable.
- Desktop and 393px visual evidence with console check.

### Out of Scope

- Pacing fences, debt pins, controller family, or balance thresholds.
- `SIM_VERSION`, save schema, migrations, or new dependencies.
- New acquisition mechanisms beyond the existing breeding-discovery seam.
- Device-lab, live PvP, audio rewriting, onboarding redesign, or general UX refactor.

## Chosen Species

| Species ID | Name | Element | Archetype | Recipe pair | Role |
| --- | --- | --- | --- | --- | --- |
| `dune_jerboa` | Dune Jerboa | earth | `jerboa` | earth + wind | Fast, low-bulk skirmisher |
| `spark_ray` | Spark Ray | electric | `ray` | fire + electric | Fragile ranged special attacker |
| `gale_moth` | Gale Moth | wind | `moth` | plant + wind | Nimble special/evasion line |

Each recipe pair is unused by the six current discovery lines, is order-independent, and never pairs an element with itself. The three choices bring Earth, Electric, and Wind to three lines each.

Each species gets two branch forms following the existing equal-budget pattern: one ATK/SPD lean and one HP/DEF lean, each with one signature special drawn from its element's existing move vocabulary.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Add the three species definitions with unique IDs, display names, elements, flavors, six-move kits distinct from sibling lines, temperaments, and stat bounds. | must |
| FR-2 | Add three fixed parent-element recipes that resolve in both parent orders and do not collide with existing pairs or same-element inheritance. | must |
| FR-3 | Add two champion branch forms per new species with equal effective budgets and one signature special each. | must |
| FR-4 | Author three new voxel archetypes with templates, palette, seeded DNA, SDF assembly, proportion budgets, body profiles, and choreography entries. | must |
| FR-5 | Generate seed-42 baby/juvenile/champion GLB+manifest pairs for each new archetype through the documented exporter; leave all 45 existing artifact pairs untouched. | must |
| FR-6 | Keep `bun run balance` green at 18/18 species with no waivers and no gate changes. | must |
| FR-7 | Make the new species and recipes discoverable in the handbook/gallery and eligible in generated rival fields according to the discovery-line rules. | must |
| FR-8 | Produce desktop 1440×900 and iPhone 15 393×852 screenshots of the new gallery/handbook surfaces with a clean console. | must |
| FR-9 | Confine changes to the approved sim, voxel, artifact, and client content surfaces; do not change save schema, `SIM_VERSION`, balance fences, or public contracts. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Re-exporting each new seed-42 artifact produces byte-identical GLBs and manifests; the determinism gate passes for all 18 species and 5 props. |
| NFR-2 | Module-size caps hold: sim/client ≤ 12,288 B per module, voxel ≤ 24,576 B. |
| NFR-3 | No new dependency, no `SAVE_VERSION` bump, no migration, no `SIM_VERSION` bump, no balance-threshold change. |
| NFR-4 | The new client surfaces remain usable at 393×852 and 852×393 with no horizontal scroll or occluded controls; console has zero errors/warnings. |
| NFR-5 | Evidence records exact commands, test counts, balance figures, artifact hashes, and screenshot paths. |
| NFR-6 | Full fuzz sweep stays green for all archetypes, including the three new ones. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Three new species appear in `ALL_SPECIES` with unique IDs, distinct sorted kits, and valid stat bounds. | FR-1 |
| AC-2 | Each new recipe resolves in both parent orders; same-element pairs still inherit; no recipe key collides. | FR-2 |
| AC-3 | Six new branch forms resolve and pass existing branch-balance tests. | FR-3 |
| AC-4 | Three new archetypes generate valid seeded builds, pass template/boundary/proportion tests, and have authored body/choreography entries. | FR-4 |
| AC-5 | Nine new artifact pairs exist; re-export is byte-identical; the 45 existing artifact bytes are unchanged. | FR-5, NFR-1 |
| AC-6 | `bun run balance` reports 18/18 pass with all existing bounds green and no new waiver. | FR-6 |
| AC-7 | Handbook and gallery expose the new species and recipes; generated rival fields can include them under the discovery rules. | FR-7 |
| AC-8 | Desktop and 393px screenshots show the new content and the console check is clean. | FR-8, NFR-4 |
| AC-9 | `bun run verify && bun run build`, `bun run balance`, `bun run gate:determinism`, and `bun run test:fuzz` all exit 0. | FR-6, NFR-1, NFR-2, NFR-6 |
| AC-10 | Scope proof shows no change to save schema, `SIM_VERSION`, balance fences, pacing pins, or dependency manifests. | FR-9, NFR-3 |

## Edge Cases

- A recipe pair is supplied in reverse parent order.
- A player already owns one or both new species; the recipe must not duplicate an owned line.
- Same-element parents must continue to inherit rather than discover.
- A new archetype must not touch voxel-grid boundary coordinates at any stage or seed in the fuzz sweep.
- A new species row must pass the two-sided 95% balance test; a miss is a scope failure, not a waiver.
- If a module-size cap breaks, split data across existing submodule patterns rather than weakening the cap.

## Dependencies

- **Tracks:** none.
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** The chosen names, elements, and role spreads are approved as part of this spec; balance tuning may adjust stat bounds within authored ranges but may not change gates.
- **Assumption:** "New archetype" means an authored voxel body plan in `packages/voxel`, not a reskin of an existing one.
- **Assumption:** No save-schema change is needed because discovery lines enter through the existing recipe/species-catalog seam.
- **Assumption:** If any new row cannot pass the hard balance gate, the track stops for a scope decision rather than shipping a waiver.

## References

- `conductor/product.md` — Phase 3 roster goal and current 15-species status.
- `conductor/product-guidelines.md` — original IP, capitalization, mobile adaptation rules.
- `conductor/tech-stack.md` — voxel determinism, species data, and module-size contracts.
- `packages/sim/src/species/{catalog,discovery,rewards,starters}.ts`.
- `packages/sim/src/breeding/discovery.ts`.
- `packages/voxel/src/{archetype,budgets,species}.ts` and `packages/voxel/scripts/determinism-gate.ts`.
- Archived roster waves `20261022-*`, `20261026-*`, `20261027-*`.
