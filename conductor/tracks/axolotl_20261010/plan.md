# Plan: Axolotl Archetype

TDD-ordered per workflow.md. Pipeline core (sdf/voxelizer/mesher/glb) is
frozen — template authoring only.

**Precondition:** bovine Phase D landed (multi-archetype export script,
gallery herd, generalized creature builder).

## Phase A — Template Tests (red)

- [ ] Task: Write failing tests — axolotl template: schema-valid, 3 slots ×
      ≥2 styles, param-name uniqueness across slots, Water-blue 205° hue
      contract, gilded weight 32
- [ ] Task: Write failing tests — sampleDna: in-bounds via
      assertDnaInBounds, determinism, seed divergence, style enums over 30
      seeds, gilded frequency over 2000 seeds, buildAxolotl part inventory +
      pivots/parents, voxelize sanity at AXOLOTL_GRID

## Phase B — Axolotl Implementation (green)

- [ ] Task: Implement `axolotlTemplate` + `buildAxolotl` SDF assembly
      (elongated body, flat head, stubby legs, gill fronds, fin tail, dorsal
      fin, barbels; pivots, parents, palette) to green
- [ ] Task: Geometric hardening — grid-boundary probes over 400 seeds; fix
      overflows; commit artifact-ready build

## Phase C — Property & Fuzz

- [ ] Task: Add axolotl cases to fuzz suite — 200-seed DNA validity, 40-seed
      boundary probe, 8-seed pipeline budget, byte-identical determinism
- [ ] Task: Grey-render silhouette iteration via preview page until it reads
      "axolotl" (living-concept loop, user verdict)

## Phase D — Integration & Vision Gate (manual-verification heavy)

- [ ] Task: Extend `export-artifact.ts` + determinism gate for
      `--archetype axolotl`; regenerate + commit axolotl artifact
- [ ] Task: Gallery shows axolotls (mixed herd with drakes + bovines); wire
      Water-blue into creature builder
- [ ] Task: Herd test — 8-seed axolotl lineup, rubric review with user
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
