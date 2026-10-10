# Plan: Shared hslToRgb color helper

Branch: `track/color_helper_20261010` · Spec: [spec.md](./spec.md)

## Phase A — color.ts under props

- [x] Task: Failing tests — `packages/voxel/src/color.test.ts` (red corner, mid-hue, corners, hue wrap; assert module exists) *(4a48cba)*
- [x] Task: Create `color.ts` with the canonical helper + module doc; point `props.ts` at it and delete its private copy *(4a48cba)*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — gates green, prop digests byte-identical *(4a48cba)*

## Phase B — the three archetypes

- [x] Task: Swap `bovine.ts`, `drake.ts`, `axolotl.ts` to `./color` and delete their copies *(9e05ca1; caught and fixed a brace-eating edit that briefly dropped `lerp`'s closing brace in all three files)*
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — full gate incl. `bun run gate:determinism` byte-identity *(9e05ca1)*

## Phase C — Integration and verification gate

- [ ] Task: Full gate - `bun run verify` green
- [ ] Task: Definition check — exactly one `hslToRgb` definition remains; no other doc or API change needed
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
