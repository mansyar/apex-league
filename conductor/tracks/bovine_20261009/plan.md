# Plan: Bovine Archetype

TDD-ordered per workflow.md. Pipeline core (sdf/voxelizer/mesher/glb) is
frozen — template authoring only.

## Phase A — Template Tests (red)

- [x] Task: Write failing tests — bovine template: schema-valid, 3 slots ×
      ≥2 styles, param-name uniqueness across slots, Plant-green hue
      contract, gilded gate weight ≥16  `d77726a`
- [x] Task: Write failing tests — sampleDna: in-bounds via
      assertDnaInBounds, determinism, seed divergence, style enums over 30
      seeds, gilded frequency over 2000 seeds, buildBovine part inventory +
      pivots/parents, voxelize sanity at BOVINE_GRID  `d77726a`

## Phase B — Bovine Implementation (green)

- [x] Task: Implement `bovineTemplate` + `buildBovine` SDF assembly (stocky
      ox skeleton, charm part, pivots, parents, palette) to green  `557c094`
- [x] Task: Geometric hardening — grid-boundary probes over 400 seeds; fix
      overflows; commit artifact-ready build  `04e4660`

## Phase C — Property & Fuzz

- [x] Task: Add bovine cases to fuzz suite — 200-seed DNA validity, 40-seed
      boundary probe, 8-seed pipeline budget, byte-identical determinism  `b6e3256`
- [x] Task: Grey-render silhouette iteration via preview page until it reads
      "ox" (living-concept loop, user verdict)  `d9e113a`

## Phase D — Integration & Vision Gate (manual-verification heavy)

- [x] Task: Extend `export-artifact.ts` + determinism gate for
      multi-archetype (`--archetype bovine`); regenerate + commit bovine
      artifact  `e390bcb`
- [x] Task: Gallery shows bovines (mixed herd with drakes); wire Plant-green
      into creature builder  `dd9843b`
- [x] Task: Herd test — 8-seed bovine lineup, rubric review with user  `dd9843b`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)  [checkpoint: 12234b2]
