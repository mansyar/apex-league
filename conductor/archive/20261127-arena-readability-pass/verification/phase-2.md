# Phase 2 verification — Arena dressing, lighting, and HUD names

Track: `20261127-arena-readability-pass`
Branch: `feat/20261127-arena-readability-pass`
Phase base: `505d46e58f7d88402f4df471674f75ec6ee066a3`

## Exact verification command

```text
bun test --check --parallel=4 --timeout 120000 apps/client/src/battleHud.test.ts apps/client/src/scene-logic/framing.test.ts apps/client/src/director.test.ts apps/client/src/dense-playback.test.ts apps/client/src/module-size.test.ts
```

Also run, per brief allowance:

```text
bun run check
```

## TDD red — full battle HUD names (recorded before implementation)

Command: the exact verification command above, run after adding only the
`full battle HUD names (FR-5, AC-5)` regression tests to `battleHud.test.ts`
(red commit `61d4021c`).
Result: **exit code 1 — 84 pass, 2 fail, 6217 expect() calls, 86 tests across
5 files**.

Failing tests and exact diagnostic fragments:

```text
apps\client\src\battleHud.test.ts:
392 |   test("no name rule may clip, nowrap, or ellipsis the full name", () => {
397 |       expect(rule).not.toMatch(/white-space\s*:\s*nowrap/)
error: expect(received).not.toMatch(expected)
Expected substring or pattern: not /white-space\s*:\s*nowrap/
Received: "\n  font-size: 17px;\n  font-weight: 800;\n  letter-spacing: 0.04em;\n  color: var(--ink);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n"

403 |   test("a name can wrap long words and shrink inside its plate", () => {
405 |     expect(base).toMatch(/overflow-wrap\s*:\s*(anywhere|break-word)/)
error: expect(received).toMatch(expected)
Expected substring or pattern: /overflow-wrap\s*:\s*(anywhere|break-word)/
Received: "\n  font-size: 17px;\n  font-weight: 800;\n  letter-spacing: 0.04em;\n  color: var(--ink);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n"

(fail) full battle HUD names (FR-5, AC-5) > no name rule may clip, nowrap, or ellipsis the full name
(fail) full battle HUD names (FR-5, AC-5) > a name can wrap long words and shrink inside its plate
```

The third new test (full long/mirrored name text in the DOM via `FakeElement`)
passed at red: `plateName()` already writes the entire name to the DOM, so
truncation is purely CSS layout. No `battleHud.ts` change was needed (it stays
below the 12 KB module cap).

## Implementation record

### P2.T1 — arena shell and lighting (`apps/client/src/arena.ts`)

Retuned arena-owned values only; geometry, bounds, lifecycle, and disposal
code paths are untouched.

| Item | Before | After | Reason |
| --- | --- | --- | --- |
| `ARENA_SKY` | `0x0f1320` | `0x2b3447` | Brighter slate navy bowl behind the crowd, still darker than the lit floor so silhouettes read against it. |
| Fog near/far | `18 / 34` | `22 / 44` | Push the fog back: stands stay legible in the closer action camera while the far dome still dissolves into the venue tone. Ranch endpoints (`16 / 30`) unchanged. |
| Floor | `0x434956` | `0x545e6d` | Higher-key neutral competition floor; mid-tone, not white, so light fighters are not washed out. |
| Painted lines | `0xd6cdb8` (center opacity `0.55`) | `0xe6ddc7` (opacity `0.7`) | Crisper boundary/center paint on the brighter floor. |
| Stands / emissive | `0x2e323d / 0x232838` | `0x363c49 / 0x2b3140` | Lit but still darker than the floor. |
| Crowd | `0x1d2130` | `0x202534` | Slight lift; `MeshBasicMaterial` keeps the heads dark regardless of the brighter rig. |
| Backdrop dome | `0x232838` | `0x303a4e` | Matches the new fog/sky so the horizon reads as one lit venue. |
| Ambient | `0x556070 @0.75` | `0x6d7888 @1` | Open shadows. |
| Hemi | `0xb8c4d6 / 0x2a3040 @1.2` | `0xd0dae8 / 0x3d4659 @1.5` | Brighter cool sky fill. |
| Key | `0xf2f6fa @2.6` | `0xf4f8fc @2.8` | Slight lift, modelling retained (fill/rim rise more than key). |
| Rim | `0x9fb4d0 @0.8` | `0xb9cde6 @1.1` | Stronger edge separation for tracked fighters. |

Invariants preserved by inspection of the final diff: `ARENA_HALF_X`,
`ARENA_HALF_Z`, `MM_TO_WORLD`, fighter placement/scale, movement bounds, and
simulation mapping are untouched; `scene-setup.ts` (ranch lights, fog origin,
`THREE.NoToneMapping`, bloom), camera/framing from Phase 1, audio, and voxel
assets are untouched. `setBlend` still clamps, drives all four intensities
from zero, lerps fog color/near/far, and toggles `group.visible`; `dispose()`
still calls `setBlend(0)`, `disposeObject3D(group)`, and `scene.remove(group)`.

### P2.T2 — full HUD names (`apps/client/src/battle-hud.css`)

`.battle-hud-name` no longer uses `white-space: nowrap`, `overflow: hidden`,
or `text-overflow: ellipsis`. It now wraps (`overflow-wrap: anywhere` for
overlong words), can shrink inside the flex head (`min-width: 0`), and has a
tight `line-height: 1.1` so two lines still fit the placard. A mirrored
`.battle-plate-right .battle-hud-name { text-align: right }` keeps the right
plate's reflected alignment. The existing 17px desktop / 13px phone font
sizes, crest sizes, center chip, HP bar, and all control semantics are
unchanged; the HUD remains `pointer-events: none`, so no interactive control
is occluded. No horizontal overflow source remains in the name box because
both the grid body (pre-existing `min-width: 0`) and the name flex item can
shrink below their longest word.

## Verification results

- Exact phase command after implementation — **exit code 0**, bun 1.4.4
  (38afee6c8) 4x PARALLEL, **86 pass, 0 fail, 6226 expect() calls, 86 tests
  across 5 files** (`446.00ms`). Re-run after a final test-formatting-only
  edit: **exit code 0**, 86 pass, 0 fail, 6226 expect() calls, 86 tests across
  5 files (`600.00ms`). Includes `module-size.test.ts`, so the 12 KB client
  module gate is green.
- `bun run check` — **exit code 0**: voxel (214 files), sim (253 files),
  server (185 files), client (561 files) all report no type errors and exit 0.
- TDD order confirmed by commit sequence: red test commit `61d4021c` precedes
  implementation commit `3cc6cb59`.

## AC mapping

- **FR-3 / AC-4 (partial, visual proof deferred):** arena-only floor, paint,
  stands, crowd, backdrop, lighting and fog retuned; frozen lines proved by
  final diff (`git diff -- apps/client/src/arena.ts apps/client/src/battle-hud.css`
  touches only those two source files, no shared/ranch/post-processing,
  voxel, audio, or simulation files). Real contrast/readability proof is
  Phase 3's visual layer.
- **FR-4 / AC-4 (partial):** contrast sources adjusted while fighter models,
  proportions, stage scale, and Phase 1 camera/framing remain untouched;
  silhouette readability to be confirmed in Phase 3 captures.
- **FR-5 / AC-5 (unit-level done, visual proof deferred):** stylesheet
  regression tests assert no clipping/nowrap/ellipsis in any `.battle-hud-name`
  rule and wrapping/shrink support; `FakeElement` test proves full long +
  doctrine/rule text is present on both left and mirrored right plates.
  Computed bounds at `1440×900`, `393×852`, `852×393` are Phase 3 visual
  proof.
- **FR-6 / AC-6 (no regression introduced, full proof deferred):** phone
  media queries and landscape-short rules retain their safe-area padding;
  no JS, camera, resize, or effect code changed.
- **NFR-1..4:** no sim/state/save/balance/timing/AI/outcome, audio, voxel,
  generated, ranch, non-battle UI, or dependency/lockfile file was edited.
- **NFR-5 / AC-7 (partial):** targeted phase tests and `bun run check` green;
  mandatory full `bun run verify && bun run build` and browser captures
  remain owned by the primary / Phase 3.

## Deviations

None. All edits stayed inside the three Touches paths; evidence is the only
extra file written and is intentionally uncommitted.

## Notes for primary

- Commits: `61d4021c` (red test, conventional `test(client)`), `3cc6cb59`
  (implementation, conventional `feat(client)`).
- `bunx biome check` was not run: direct Biome invocation was permission-denied
  in Phase 1 and was not retried. `bun run check` (type-check) is green; please
  include the files in your `biome check` gate. CSS/TS were formatted to the
  documented Biome style (80 columns, 2 spaces, double quotes).
- Real visual confirmation of arena contrast and computed HUD bounds at the
  three viewports belongs to Phase 3; no pixel tests were invented here.

## Primary verification

- Scope check: phase range contains exactly `arena.ts`, `battle-hud.css`, and `battleHud.test.ts`, plus this evidence file; commits are the reported red test, implementation, and evidence record, with no merge or user commits.
- Primary reran the exact phase command: `86 pass / 0 fail / 6226 expect() calls`, exit 0.
- Primary reran scoped Biome on all three Touches files: `Checked 3 files ... No fixes applied.`, exit 0.
- Primary inspected the final diff: arena changes are palette/lighting/fog values and comments only; geometry, legal bounds, lifecycle, disposal, `MM_TO_WORLD`, camera/framing, shared scene setup, ranch, audio, and voxel files are untouched. HUD names are CSS-only wrapping/shrink/alignment changes; `battleHud.ts` is unchanged.
- Mandatory `(bun run verify && bun run build)` passed with exit 0: clean typechecks in voxel 214, sim 253, server 185, client 561 files; `4616 pass / 1 skip / 0 fail`, `682379 expect() calls`, 4617 tests across 446 files; Biome clean on 1063 files; every archetype stage and all 5 prop digests byte-identical; Vite built `index-BpBJx2Fi.js` at 1,112.80 kB with only the pre-existing chunk advisory.
- Conclusion: Phase 2 unit/static/determinism/build evidence is green. Real arena contrast and computed HUD bounds at all three viewports remain Phase 3 visual proof.
