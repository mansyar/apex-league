# Plan: Axolotl Archetype

TDD-ordered per workflow.md. Pipeline core (sdf/voxelizer/mesher/glb) is
frozen — template authoring only.

**Precondition — satisfied:** bovine Phase D landed on `main` (archetype
registry + `generate()` API, generic export script + determinism gate,
gallery herd param); this branch is rebased on top of it.

## Phase A — Template Tests (red)

- [ ] Task: Write failing tests — axolotl template: schema-valid, 3 slots ×
      ≥2 styles, param-name uniqueness across slots, Water-blue 205° hue
      contract, gilded weight 32
- [ ] Task: Write failing tests — sampleDna: in-bounds via
      assertDnaInBounds, determinism, seed divergence, style enums over 30
      seeds, gilded frequency over 2000 seeds, buildAxolotl part inventory +
      pivots/parents, voxelize sanity at AXOLOTL_GRID; registry resolves
      `generate("axolotl", seed)` once registered (unknown-id error behavior
      for other ids unchanged)

## Phase B — Axolotl Implementation (green)

- [ ] Task: Implement `axolotlTemplate` + `buildAxolotl` SDF assembly
      (elongated body, flat head, stubby legs, gill fronds, fin tail, dorsal
      fin, barbels; CreatureBuild-compatible fields/pivots/parents/colors,
      Water-blue palette) to green
- [ ] Task: Register axolotl in the `archetypes` registry
      (`packages/voxel/src/archetype.ts`) and export from
      `packages/voxel/src/index.ts`
- [ ] Task: Geometric hardening — grid-boundary probes over 400 seeds; fix
      overflows; commit artifact-ready build

## Phase C — Property & Fuzz

- [ ] Task: Add axolotl cases to fuzz suite — 200-seed DNA validity, 40-seed
      boundary probe, 8-seed pipeline budget, byte-identical determinism
- [ ] Task: Grey-render silhouette iteration via preview page until it reads
      "axolotl" (living-concept loop, user verdict)

## Phase D — Integration & Vision Gate (manual-verification heavy)

- [ ] Task: Run the existing archetype-generic export script to generate +
      commit `artifacts/axolotl-42.glb` + manifest; confirm the determinism
      gate auto-covers all three archetypes with zero script edits
- [ ] Task: Gallery/preview accept `?archetype=axolotl` (extend the param
      whitelist; mixed herd becomes a three-way rotation); verify Water-blue
      palette renders correctly through `buildCreatureGroup`
- [ ] Task: Herd test — 8-seed axolotl lineup, rubric review with user
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
