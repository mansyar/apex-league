# Spec: Axolotl Archetype

## Overview

Add the third creature archetype — an **axolotl**, the Water starter's body
plan — completing the Fire/Water/Plant starter trio and proving the
archetype-template system generalizes across three distinct body plans.
Everything ships through the existing pure-TS pipeline (`@apex/voxel`) with
zero pipeline-core changes expected; this track is mostly template authoring
+ validation.

**Precondition — satisfied.** The Bovine track's Phase D landed on `main`
before this track started: archetype registry with `generate(archetypeId,
seed)` API (`packages/voxel/src/archetype.ts`), single-sourced
`CreatureBuild` (`packages/voxel/src/build.ts`), archetype-generic
`export-artifact.ts` and determinism gate, gallery `?archetype=` param with
mixed herd. Branch `track/aquatic_20261010` is rebased onto that tip.

## Functional Requirements

- **FR1 — Axolotl template**: new `axolotlTemplate` (id `"axolotl"`,
  version 1) in `packages/voxel/src/axolotl.ts` with an axolotl body plan:
  elongated soft body, wide flat head, four stubby legs, paddle tail; a
  silhouette distinct from the drake and bovine at a glance.
- **FR2 — Style slots**: `gills` (sprightly/drooping/crown frond
  arrangements) and `dorsalFin` (low/ridged/sail) — 2 slots, ≥2 styles
  each; param names unique across slots (enforced by `validateTemplate`).
  *(Revised 2026-10-10: the original `whiskers` slot was dropped — real
  axolotls have no facial barbels, and the rendered feelers read as an
  insect proboscis against the reference. User-approved spec change.)*
- **FR3 — Signature parts**: external gill fronds and fin tail (membrane
  paddle) present in the part inventory + rig `parents` map. Gill fronds
  are the mandatory "axolotl read" feature.
- **FR4 — Palette**: fixed Water-blue hue 205° (type-hue contract) + value
  jitter; `gilded` rarity gate (weight 32) mirroring the drake/bovine
  (gold hue 45 override).
- **FR5 — Rig contract**: `buildAxolotl(dna)` returns a `CreatureBuild`
  (`packages/voxel/src/build.ts` — fields, pivots at joints, colors,
  `parents` map) compatible with the shared `buildCreatureGroup` renderer
  and breathe-idle.
- **FR6 — Tests**: template validation tests, sampleDna in-bounds /
  distinctness / rarity-frequency property tests, grid-boundary probe
  (0 edge-touching voxels), full-pipeline GLB budget + byte-identical
  determinism — mirroring the bovine suite.
- **FR7 — Artifacts & gate**: axolotl registered in the `archetypes`
  registry (template, grid, build) so `generate("axolotl", seed)` works;
  canonical `artifacts/axolotl-<seed>.glb` + manifest committed via the
  existing archetype-generic export script. The determinism gate already
  iterates every registered archetype — it must cover axolotl with **zero
  script changes**.
- **FR8 — Vision gate**: gallery/preview `?archetype=` params extended to
  accept `axolotl` (and the mixed herd becoming a three-way rotation);
  8-seed axolotl line-up judged by the user (recognizable axolotl / varied /
  appealing); grey-render silhouette iteration loop like the bovine's.

## Non-Functional Requirements

- Determinism: same (template, seed, generatorVersion) → byte-identical GLB.
- DOM-free tests, added suite time <10s; `bun run verify` exit 0.
- GLB ≤150KB per creature.
- No changes to pipeline core (sdf/voxelizer/mesher/glb untouched).

## Acceptance Criteria

1. `validateTemplate(axolotlTemplate)` clean; 3 slots × ≥2 styles.
2. 200-seed sampleDna: all in-bounds, ≥190 distinct, gilded frequency
   within 0.25×–4× of 1/32.
3. 40-seed boundary probe: 0 edge-touching voxels.
4. 8-seed full pipeline under GLB budget, byte-identical per seed.
5. Determinism gate covers all three archetypes; `bun run verify` exit 0.
6. User rubric verdict "Pass" on the 8-seed lineup; axolotl visibly
   distinct from both existing archetypes.

## Out of Scope

Walk cycles, battle animations, icons, evolution stages, breeding, the
Water starter's game logic (stats/battle/care), runtime browser generation
in production paths.
