# Plan: Shared hslToRgb color helper

Branch: `track/color_helper_20261010` · Spec: [spec.md](./spec.md)

## Phase A — color.ts under props

- [ ] Task: Failing tests — `packages/voxel/src/color.test.ts` (red corner, mid-hue, corners, hue wrap; assert module exists)
- [ ] Task: Create `color.ts` with the canonical helper + module doc; point `props.ts` at it and delete its private copy
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase B — the three archetypes

- [ ] Task: Swap `bovine.ts`, `drake.ts`, `axolotl.ts` to `./color` and delete their copies
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) — full gate incl. `bun run gate:determinism` byte-identity

## Phase C — Integration and verification gate

- [ ] Task: Full gate - `bun run verify` green
- [ ] Task: Definition check — exactly one `hslToRgb` definition remains; no other doc or API change needed
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
