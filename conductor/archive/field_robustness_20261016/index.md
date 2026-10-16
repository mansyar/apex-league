# Touch & Field Robustness — conductor/tracks/field_robustness_20261016

Close the gap the responsive layout foundation left open: bring the **interaction**
layer and the **failure paths** along with the mobile-first layout. Fix
drag-to-orbit scrolling the page (no `touch-action` anywhere today), add pinch
zoom, lock user orbit out of the arena, pause the render loop and effect timers
on a hidden tab, replace the blank page on a WebGL failure with a broadcast-kit
plate + Reload, and lift phone-tier tap targets and keyboard focus. The
testable seam is the repo's usual one — pure `orbit-logic.ts` and `lifecycle.ts`
modules under TDD, with the rest verified in the browser.

No `@apex/sim`, `@apex/voxel`, save-schema or determinism-gate contact.

- [metadata.json](./metadata.json) — track id, type, status, timestamps
- [spec.md](./spec.md) — Source of Truth for scope and requirements
- [plan.md](./plan.md) — phased task breakdown (TDD where logic-bearing)
