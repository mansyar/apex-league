# Spec: Bovine Archetype

## Overview

Add the second creature archetype — a **bovine (stocky ox)**, the Plant
starter's body plan — proving the archetype-template system generalizes
beyond the drake. Everything ships through the existing pure-TS pipeline
(`@apex/voxel`) with zero pipeline-core changes expected; this track is
mostly template authoring + validation.

## Functional Requirements

- **FR1 — Bovine template**: new `bovineTemplate` (id `"bovine"`, version 1)
  in `packages/voxel/src/bovine.ts` with a stocky-ox body plan: barrel girth
  (wide proportions), short legs, heavy forequarters; a silhouette distinct
  from the drake at a glance.
- **FR2 — Style slots**: `horns` (curved/straight/backSwept), `tail`
  (tuft/plain/bell), `crest` (none/spikes) — 3 slots, ≥2 styles each; param
  names unique across slots (enforced by `validateTemplate`).
- **FR3 — Charm part**: one visual-only livestock part (bell collar or
  udder — decided during silhouette iteration) included in the part
  inventory + rig `parents` map.
- **FR4 — Palette**: fixed Plant-green hue (type-hue contract) + value
  jitter; `gilded` rarity gate mirroring the drake (weight 32).
  Horns/hooves bone-toned.
- **FR5 — Rig contract**: `buildBovine(dna)` → fields, pivots at joints,
  colors, `parents` map compatible with the shared `buildCreatureGroup`
  renderer and breathe-idle.
- **FR6 — Tests**: template validation tests, sampleDna in-bounds /
  distinctness / rarity-frequency property tests, grid-boundary probe
  (0 edge-touching voxels), full-pipeline GLB budget + byte-identical
  determinism — mirroring the drake suite.
- **FR7 — Artifacts & gate**: canonical `artifacts/bovine-<seed>.glb` +
  manifest via `export-artifact.ts` (extended for an archetype arg);
  determinism gate extended to cover bovine.
- **FR8 — Vision gate**: gallery renders bovines; 8-seed bovine line-up
  judged by the user (recognizable ox / varied / appealing); grey-render
  silhouette iteration loop like the drake's.

## Non-Functional Requirements

- Determinism: same (template, seed, generatorVersion) → byte-identical GLB.
- DOM-free tests, added suite time <10s; `bun run verify` exit 0.
- GLB ≤150KB per creature.
- No changes to pipeline core (sdf/voxelizer/mesher/glb untouched).

## Acceptance Criteria

1. `validateTemplate(bovineTemplate)` clean; 3 slots × ≥2 styles.
2. 200-seed sampleDna: all in-bounds, ≥190 distinct, gilded frequency
   within 0.25×–4× of 1/32.
3. 40-seed boundary probe: 0 edge-touching voxels.
4. 8-seed full pipeline under GLB budget, byte-identical per seed.
5. Determinism gate covers both archetypes; `bun run verify` exit 0.
6. User rubric verdict "Pass" on the 8-seed lineup; bovine visibly distinct
   from the drake.

## Out of Scope

Walk cycles, battle animations, icons, evolution stages, breeding, the
Water starter, runtime browser generation in production paths.
