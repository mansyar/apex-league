# Plan: Voxel Pipeline Foundation

Refer to `conductor/workflow.md` as the single source of truth for task
lifecycle, checkpoints, and quality gates.

## Phase A — Workspace & DNA Schema (logic-bearing — TDD)

- [x] Task: Scaffold `packages/voxel` workspace (package.json, tsconfig,
      barrel export; wire into root scripts) `dd55522`
- [x] Task: Write failing tests — DNA schema: types, hard-bounds validation,
      template declaration shape `59eb7b1`
- [x] Task: Implement DNA schema + bounds enforcement to green `8b38d1e`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  [checkpoint: 0c3ede2]

## Phase B — Generator Core (logic-bearing — TDD)

- [x] Task: Write failing tests — SDF composition: primitive distance
      functions, smooth blending, part labeling `c247b86`
- [x] Task: Implement SDF part engine to green `e956cb0`
- [x] Task: Write failing tests — voxelizer: grid sampling at ~40-voxel
      budget, per-part voxel labels, greedy mesh determinism `8e61daa`
- [x] Task: Implement voxelizer + greedy mesher to green `f97a3ef` + `4cebd58`
- [x] Task: Write failing tests — GLB export: node hierarchy contract,
      pivots, manifest (dnaHash/glbSha/triCount), same-seed byte-identical
      output `4d4c67a`
- [x] Task: Implement GLB exporter + manifest to green `6f9cefe`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `[checkpoint: c63606a]`

## Phase C — Drake Archetype (template authoring — mix of TDD + visual iteration)

- [x] Task: Write failing tests — drake template: params within declared
      bounds, style enums (horns/tail), rarity gate probabilities `0bda590`
- [x] Task: Implement drake archetype template to green `6b620ee`
- [x] Task: Write failing tests — property/fuzz: N random seeds all valid,
      in-bounds, DNA-distinct; rare-tier probabilities hold over large N
- [x] Task: Implement property/fuzz suite to green `aee789c`
- [ ] Task: Grey default-seed renders → iterate template until silhouette
      reads "dragon" (living-concept loop)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase D — Integration, Tooling & Vision Gate (manual-verification heavy)

- [ ] Task: Dev gallery page — seed input + variant grid (dev-only route)
- [ ] Task: Wire drake GLB into ranch scene + procedural breathe idle via
      hierarchy rig
- [ ] Task: Determinism gate script (regenerate + hash-compare) wired into
      verify/CI
- [ ] Task: Herd test — render 8-seed lineup, rubric review with user, tune
      bounds if rejected
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
