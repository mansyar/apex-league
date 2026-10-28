# Phase 8 verification (assembled by primary; sections appended per task)

## P8.T4

- Result: fixed (kept the toggle, wired it through the real responsive path).
- Diagnosis: the phone toggle only flipped `body.app-in-movelab-phone`,
  which CSS-constrains `#app` to 390px — but the scene's resize wiring
  (`scene/frame.ts` `onResize`: `cameraRig.resize` + `camera.aspect` +
  `renderer.setSize` + `composer.setSize`) runs exclusively on `window`
  resize events, reading the scene container's client size. A class flip
  never fires that event, so the camera/renderer kept desktop dimensions
  inside the narrowed shell (mis-framed arena, empty strip). A real
  `setViewportSize(390x844)` fires a genuine resize, which is why only the
  toggle diverged.
- Fix-or-remove rationale: fix — the wiring is a two-line lab-side change
  (no scene/arena edits needed; the responsive path itself is correct), so
  removal would have discarded a useful dev rig for no reason. New exported
  `setLabPhoneWidth(on)` in `apps/client/src/movelab/lab.ts` toggles the
  class then dispatches `window` `resize`, reusing the exact handler real
  viewports hit; the handler's `container.clientWidth` read forces layout,
  so the fresh 390px width applies synchronously. The change handler now
  calls it.
- Verification: new regression pin
  `apps/client/src/movelab/phone.test.ts` (2 tests: class toggle +
  resize dispatch on both check and uncheck). Full movelab suite green:
  `bun test` across `phone/steps/catalog/isolation` = 15 pass, 0 fail
  (404 expects). `bunx biome check --write --unsafe` clean on touched
  files. No new deps; lab chunk still DEV-gated dynamic import (NFR-6
  untouched); no sim/save/audio changes.
