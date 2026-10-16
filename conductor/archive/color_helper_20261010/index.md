# Track: Shared hslToRgb color helper

Track `color_helper_20261010` — Chore.

One canonical `hslToRgb` in `packages/voxel/src/color.ts`; the four private
copies in `bovine.ts`/`drake.ts`/`axolotl.ts`/`props.ts` (byte-identical, hash
verified) are deleted in favor of the shared import. Behavior-preserving:
creature GLBs and prop digests stay byte-identical through the determinism
gate.

- **Spec**: [spec.md](./spec.md)
- **Plan**: [plan.md](./plan.md)
- **Branch**: `track/color_helper_20261010`
- **Status**: new
