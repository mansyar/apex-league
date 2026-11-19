# Roster Wave 2 — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Roster Wave 2 adds three original breeding-discovery species to the deployed
Apex League slice, taking the roster from 18 to 21 and clearing the roadmap's
minimum 20-species content goal with one line of headroom. Each line ships an
order-independent parent-element recipe, two branch forms, a dedicated voxel
archetype with deterministic seed-42 artifacts, and client discoverability in
the existing handbook and gallery seams. All 21 species must pass the unchanged
hard balance gate with no waivers, no gate changes, and no save, simulation, or
dependency changes.

## Problem / Motivation

The product goal is 20–40 original species in three-stage branching evolution
trees. Wave 1 brought the roster to 18 and proved the additive pattern works,
but the minimum goal is still unmet, and the current balance matrix has a few
rows sitting near the edges of their bands. Three new lines give the roster
enough diversity to reach 21 while providing fresh matchup coverage into the
high and low rows; a two-line wave would only reach 20 and leave less
balancing headroom. Without this wave, the player-facing content count stays
below the stated minimum and the content roadmap has no near-term closure
point.

## Goals & Success Metrics

- **Goal:** ship three new discovery lines and reach a 21-species roster with
  unchanged correctness and balance guarantees.
- **Metric:** `bun run balance` reports 21/21 species passing with every global
  gate ok, no waivers, and no changed threshold; `bun run verify && bun run
  build`, `bun run balance`, `bun run gate:determinism`, and `bun run test:fuzz`
  all exit 0; nine new seed-42 artifact pairs regenerate byte-identically while
  the existing 54 pairs remain unchanged; desktop and 393px screenshots show
  the new recipes/creatures with zero console errors and no horizontal scroll.

## Scope

### In Scope

- Three new discovery species:
  - `thornvolt` / **Thornvolt** / primary wind / archetype `sprite` /
    recipe **plant + electric** / nimble special.
  - `siltback` / **Siltback** / primary water / archetype `golem` /
    recipe **water + earth** / bulky control.
  - `emberwing` / **Emberwing** / primary fire / archetype `wing` /
    recipe **fire + wind** / fast skirmisher.
- Three fixed, order-independent breeding recipes added to the existing
  `RECIPES` table, with no same-element recipes and no collision with the nine
  existing pairs.
- Two branch forms per new species with globally unique signature moves drawn
  from each species' element vocabulary and excluded from its own kit.
- Three dedicated voxel archetypes with templates, budgets, `BODY_PROFILES`
  rows, choreography entries, fuzz boundary/budget/determinism shards, and nine
  new seed-42 GLB + manifest pairs.
- Client discoverability through the existing derived seams: handbook recipe
  rows and gallery reachability for the three new archetypes, with no duplicated
  client-side recipe table.
- Desktop 1440×900, portrait 393×852, and landscape 852×393 visual evidence of
  the changed surfaces with a clean console.
- A committed verification report recording exact commands, counts, balance
  figures, artifact hashes, and screenshot paths.

### Out of Scope

- Any change to `SIM_VERSION`, save schema, dependency manifests, balance gate
  thresholds, cap-share/decisive/cap-quality fences, or the D‑1 pacing pin.
- Broad retuning of existing species stat bounds. **Owner decision 2026-11-19:**
  a narrowly scoped exception permits stat-bound-only adjustments to the few
  existing rows that fall outside their statistical band in the 21-species
  matrix, provided every balance gate, threshold, fence, and assertion stays
  unchanged. The adjustment must be the minimum demonstrated by evidence and
  recorded in the phase verification report.
- New acquisition mechanics, tier rewards, starters, or changes to the
  breeding flow beyond adding recipe-table rows.
- Rewriting the audio seam, crossfade, volume sliders, onboarding, or UX layout
  beyond what is required for the three new species to be visible.
- The physical hardware device-lab pass (human-only).
- Live PvP or changes to ghost/leaderboard systems.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Add `thornvolt`, `siltback`, and `emberwing` to `DISCOVERY_SPECIES` with the fixed ids, display names, primary elements, archetype ids, roles, six-move kits, and authored stat envelopes above. Each stays `available: false` and has no `rewardFromTier`. | must |
| FR-2 | Add the three unordered element recipes `plant+electric -> thornvolt`, `water+earth -> siltback`, and `fire+wind -> emberwing` to the frozen `RECIPES` table. Lookup remains order-independent, same-element pairs still never match, and `speciesOptions` appends each discovered line once. | must |
| FR-3 | Add two branch forms per new species to the branch catalog using the established discovery branch pattern. Every signature move must come from the species' element vocabulary, be absent from its own kit, and remain globally unique across all 42 branch forms. | must |
| FR-4 | Register `sprite`, `golem`, and `wing` as voxel archetypes with templates, grids, exports, proportion budgets, `BODY_PROFILES` rows, choreography entries, and boundary/budget/determinism fuzz shards. | must |
| FR-5 | Author nine new seed-42 artifact pairs (three archetypes × baby/juvenile/champion) through the documented determinism writer, leaving the existing 54 artifact pairs byte-identical. | must |
| FR-6 | Clear the unchanged balance gate at 21/21 species. Tuning may adjust the three new species' stat bounds within their authored envelopes and, under the owner's 2026-11-19 exception, make the minimum evidence-demonstrated stat-bound-only adjustment to existing rows needed to keep every row inside its statistical band. No global gate, threshold, fence, or assertion may change. The pacing debt test and its diagnostic population must continue to measure the original 15-species roster. | must |
| FR-7 | Expose the three new recipes and species through the existing handbook and gallery derivation seams. The client must not maintain a second recipe table or hardcoded species list. | must |
| FR-8 | Capture visual evidence at desktop 1440×900, portrait 393×852, and landscape 852×393 showing the new recipes/creatures, with zero console errors or warnings and no horizontal scroll. | must |
| FR-9 | Keep all changes inside the approved sim, voxel, artifact, client, and Conductor evidence paths; re-prove verify, build, balance, determinism, and full fuzz green at the final head. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Simulation output stays byte-identical: `SIM_VERSION` is unchanged, all 54 artifact pairs regenerate byte-identically after the nine additions, and the final battle hash is unchanged from the approved baseline. |
| NFR-2 | Module size caps hold: `apps/client/src` and `packages/sim/src` at or below 12,288 B per module; `packages/voxel/src` at or below 24,576 B per module. |
| NFR-3 | No new dependency, save-schema migration, gate weakening, fence move, or pacing-controller change. The D‑1 `test.failing` debt pin remains byte-for-byte from base. |
| NFR-4 | New kits remain inside the shipped sustained-score band and every move stays inside the shipped damage band. |
| NFR-5 | UX principle 8 holds at 393×852 and 852×393: no horizontal scroll, no occluded interactive elements, readable text, and a clean console. |
| NFR-6 | Evidence records exact commands, counts, balance figures, artifact hashes, screenshot paths, and any accepted deviation with its rationale. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | The three new ids, display names, elements, archetypes, roles, kits, and stat envelopes are present in the discovery catalog with `available: false` and no reward tier. | FR-1 |
| AC-2 | All three recipes resolve in both parent orders; no same-element pair matches; no recipe key collides with the nine existing lines; `speciesOptions` adds each new line once. | FR-2 |
| AC-3 | Six new branch forms exist; all 42 branch signatures are globally unique; each new signature is element-true and absent from its own kit. | FR-3 |
| AC-4 | All three new archetypes are registered, exported, budgeted, body-profiled, choreographed, and covered by fuzz shards; all proportion, boundary, budget, and determinism fuzz tests pass. | FR-4 |
| AC-5 | Nine new seed-42 artifact pairs are committed; the determinism gate reports all 54 pairs and 5 prop digests byte-identical. | FR-5 |
| AC-6 | `bun run balance` reports 21/21 species ok with all global gates ok, no waivers, unchanged thresholds/fences/assertions, only the owner-approved minimum existing-row stat-bound adjustment if needed, and the baseline pacing debt pin intact. | FR-6 |
| AC-7 | Handbook and gallery surfaces derive and show the new recipes/archetypes without a duplicated client recipe table; no hardcoded species list is introduced. | FR-7 |
| AC-8 | Desktop, portrait, and landscape screenshots exist; console shows zero errors/warnings; `scrollWidth == clientWidth` at 393px and 852px. | FR-8 |
| AC-9 | `bun run verify && bun run build`, `bun run balance`, `bun run gate:determinism`, and `bun run test:fuzz` all exit 0 at the final head. | FR-9 |
| AC-10 | Scope proof shows only approved paths changed; no `SIM_VERSION`, save schema, dependency manifest, balance gate, fence, or debt-pin assertion changed. | FR-9, NFR-3 |

## Edge Cases

- Mirror or same-element parent pairs must not accidentally fire a new recipe.
- All 42 branch signatures must stay globally unique; if a suggested signature
  collides with a sibling line, choose another from the same element vocabulary
  rather than weakening the uniqueness assertion.
- A new kit's sustained score must stay inside the shipped band; adjust the kit
  selection within the element vocabulary rather than changing the band.
- Adding three species widens the balance matrix and may push an existing edge
  row outside its statistical bound. First tune the new species within their
  authored envelopes. If no solution exists, the owner's 2026-11-19 exception
  permits the minimum evidence-demonstrated stat-bound-only adjustment to the
  affected existing rows; gates, thresholds, fences, and assertions still do not
  change.
- The pacing debt diagnostic must keep measuring the original 15-species
  population by excluding all six wave-1 and wave-2 ids, while its `test.failing`
  pin, comment, assertion, and seed structure stay byte-for-byte unchanged.
- Heavy long-running tests may need test-only wall-clock headroom at 21 species;
  no assertion, seed, fixture, budget, or gate may change.
- 393px portrait and 852px landscape layouts must not horizontally scroll or
  occlude controls, including the gallery's fixed-width row.
- A module size cap breach must be fixed by splitting or simplifying the new
  code, not by adding an allowlist exemption.

## Dependencies

- **Tracks:** none. `20261118-roster-wave-1` is archived and complete.
- **External:** none.

## Open Questions & Assumptions

- **Owner decision 2026-11-19:** Thornvolt's primary element is revised from
  plant to wind so the original nine-kit sustained band and global branch-signature
  uniqueness remain unchanged. The `plant + electric` recipe is retained as a
  hybrid breeding input; Thornvolt's signatures are `gust` and `talon_slash`, and
  its kit uses the remaining six wind moves. No `FR`, `NFR`, or `AC` ID is renumbered.
- **Owner decision 2026-11-19:** when no in-envelope stat-only solution exists
  for the three new species, the minimum evidence-demonstrated stat-bound-only
  adjustment to affected existing species rows is permitted. Balance gates,
  thresholds, fences, assertions, `SIM_VERSION`, save schema, dependencies, and
  the pacing debt pin remain unchanged. The adjustment and its justification
  must be recorded in the phase verification report.
- **Assumption:** the three named species and element pairs are approved as
  the frozen wave; balance tuning may adjust their stat bounds and kit
  selections within the stated roles and element vocabularies, plus the
  owner-approved minimal existing-row adjustment above.
- **Assumption:** the physical device-lab pass remains owner-scheduled and
  human-only.

## References

- `conductor/product.md` — 20–40 species goal, Phase 3/4 status, roster waves.
- `conductor/product-guidelines.md` — original IP, copy rules, UX principle 8.
- `conductor/tech-stack.md` — sim/voxel seams, determinism gate, fuzz sweep,
  module caps, prior roster-wave notes.
- `conductor/archive/20261118-roster-wave-1/` — proven additive pattern and
  scope-restoration lessons.
- `packages/sim/src/breeding/discovery.ts`,
  `packages/sim/src/species/discovery.ts`,
  `packages/sim/src/branch-catalog/discoveries.ts`,
  `packages/voxel/src/archetype.ts`,
  `packages/voxel/scripts/determinism-gate.ts`.
