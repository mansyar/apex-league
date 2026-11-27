# Phase 4 verification — Broadcast separation and arena contrast correction

Track: `20261127-arena-readability-pass`
Branch: `feat/20261127-arena-readability-pass`
Phase base: `6ae0fae9ff3f25a12b1eff4f2e4ac309452feb77`
Phase: 4 — Broadcast separation and arena contrast correction
Status: verified (code and logic); primary owns the reopened Phase 3 browser retest

## 1. Why this corrective phase exists (blocked Phase 3 + owner authorization)

Phase 3 automated gates were green — final `bun run verify && bun run build`
exit 0 with 4616 pass / 1 skip / 0 fail (682379 `expect()` calls); the first
attempt timed out in `cup.test.ts` with browsers open. Real browser captures
failed visual acceptance:

- `mixed-broadcast-action-a-1440x900.png` — two bodies heavily overlap.
- `mixed-broadcast-action-c-1440x1440x900.png` — only the blue axolotl is
  visible; the draconic fighter is occluded.
- `mixed-broadcast-action-a-393x852.png` — one fighter body, clipped at the
  left edge, very dark arena.
- `cup-battle-action-a-852x393.png` — one small fighter in a wide dark arena.
- `mixed-cinematic-action-a-1440x900.png` — two separated bodies, so the
  failure is specifically the **default broadcast action** composition.

Blocking items recorded in `verification/phase-3.md`: (1) keep both
silhouettes visibly separated/readable at rest and representative action
beats, (2) materially improve arena contrast in real captures, (3) repeat the
three-viewport matrix and GIF. The owner explicitly authorized this corrective
phase. Requirement IDs FR-1..FR-7 / NFR-1..NFR-5 / AC-1..AC-7 remain
permanent; this is an in-scope correctness fix, not a redesign.

Root causes confirmed in code:

- `ACTION_FRAMING.azimuth = Math.PI / 2` put the camera down the long axis, so
  fighters separated in depth rather than on screen.
- `trackedActionFraming` forced mixed-cast azimuth to
  `atan2(small.x - big.x, small.z - big.z)`, which aligns the bodies with the
  view axis for the actual rest positions.
- Projection tests measured only ground-position centre feet/head points, not
  lateral rendered extents.

## 2. Genuine failing-first tests (red)

New tests were committed to the suite before implementation. They project the
eight corners of each measured `±bodyRadius` footprint at `y = 0` and `y = h`
through a real `THREE.PerspectiveCamera`, then require whole-body NDC
containment, a measured-extent centre-separation threshold, and the 8% /
32 CSS-px height floor at authored rest positions. Coverage: same-height
ray/ray and draconic/draconic; mixed draconic/axolotl, axolotl/draconic,
ray/golem, golem/ray; representative legal positions and their mirrors;
cinematic azimuth deltas `-0.4/-0.1/0.1/0.4` with elevation and look
overrides; and a live-rig test feeding radii through `applyDirectorIntent`.

**Red 1 — missing feed fields (before any implementation):**

```text
bun test --check --parallel=4 --timeout 120000 apps/client/src/scene-logic/framing.test.ts apps/client/src/scene-logic.test.ts apps/client/src/director.test.ts apps/client/src/roster.test.ts apps/client/src/dense-playback.test.ts apps/client/src/module-size.test.ts
exit 1
Found 10 errors in 3 files, checked 248 files
TS2353: bodyRadiusA does not exist in type DirectorContext
TS2339: Property 'bodyRadius' does not exist on type Combatant
TS2554: Expected 4-7 arguments, but got 9
```

**Red 2 — feed-only step (fields exist, framing unchanged, radii undefined at
the solve):**

```text
bun test apps/client/src/scene-logic/framing.test.ts
13 pass / 5 fail / 6028 expect() calls  (exit 1)
all five new separation tests: Received: NaN
```

**Red 3 — finite measured radii, still the old framing (real projection
failure; this is the meaningful occlusion red):**

```text
bun test apps/client/src/scene-logic/framing.test.ts
13 pass / 5 fail / 6049 expect() calls  (exit 1)
same-height casts:  box.minX >= -1          -> -1.64641399954118
mixed cast:         gap > 0.1184266349527   -> -0.3947554498424723
legal positions:    fraction >= 0.08        -> 0.04222383234340435
cinematic delta:    box.minX >= -1          -> -1.0782241228685618
live rig:           gap > 0.4107867398851   -> -1.3692891303064005
```

These negatives show bodies projecting outside frame and grossly overlapping
in screen space — exactly the Phase 3 capture failure, now captured by a real
camera projection rather than an image review.

## 3. Implementation summary (P4.T1)

- `roster.ts`: `Combatant.bodyRadius` measured as half the widest rendered
  `Box3` x/z span (after `bodyScaleFor`), alongside the existing `bodyHeight`.
- `staging.ts` → `staging-director.ts` → `director.ts` → `camera/rig.ts`:
  optional `bodyRadiusA/bodyRadiusB` ride along with `heightA/heightB` in
  `DirectorFrame`, `DirectorContext`, `CameraIntent`, and rig state. Omitted
  values preserve legacy behavior (fov 45, existing framing) — pinned by the
  resize/style-switch lifecycle test.
- `framing.ts`: `trackedActionFraming` accepts optional radii and searches a
  bounded set of three-quarter azimuth offsets from the pair axis. Each
  candidate solves containment from the eight measured footprint corners,
  enforces the 8% floor on **both** fighters, keeps minRadius, and maximizes
  extent-based centre separation. A side-preserving axis fold keeps mirrored
  orders and mixed-cast outward looks on their original camera side.
  Cinematic director azimuth deltas are included in the search, so
  `AZIMUTH_SWING` / `KO_ORBIT_SWEEP` cannot reintroduce full occlusion or crop.
  `ACTION_FRAMING.margin` was restored to its original `1.1`.
- The exact `π/2` azimuth is **not** frozen: action azimuths below are real
  solves, all within a small bounded offset of the pair axis (telephoto, not
  fisheye; no fighter moved outside legal bounds).

## 4. Measured rendered body extents (seed 7, `buildSpot`)

| archetype | height (world units) | radius (world units) |
| --- | --- | --- |
| ray | 0.087742 | 0.136 |
| draconic | 0.374400 | 0.208 |
| axolotl | 0.174545 | 0.160 |
| golem | 0.450545 | 0.236 |

Rigs are wider than tall (ray wings). The sim diameter mapping
(`arena-scale.ts` `MM_TO_WORLD`, `bodyWorldDiameter`) is unchanged; the widest
rendered ground span is normalized to the frozen sim diameter, so the reported
radius is the sim radius in world units.

## 5. Projection / separation tables (real `PerspectiveCamera`)

Rest positions `a = -1.6 * mirror`, `b = +1.6 * mirror`, `z = 0`. `fA/fB` are
NDC-height fractions; `pxA/pxB` are CSS pixels at the viewport height; `ratio`
is centre separation divided by the sum of half-widths (threshold `0.36` for
broadcast rest/legal cases, `0.15` for cinematic variants). `X`/`Y` columns
are the combined eight-corner NDC bounds and must stay within `[-1, 1]`.

### Desktop 1440×900

| cast | mirror | fov° | az (rad) | fA | fB | pxA | pxB | ratio | minX | maxX | minY | maxY |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ray/ray | 1 | 12.84 | 1.611 | 0.0820 | 0.2503 | 73.8 | 225.3 | 0.437 | -0.799 | 0.261 | -0.275 | 0.275 |
| draconic/draconic | 1 | 45.00 | 1.631 | 0.1104 | 0.5027 | 99.4 | 452.5 | 0.371 | -0.678 | 0.221 | -0.666 | 0.666 |
| draconic/axolotl | 1 | 31.21 | 1.691 | 0.1465 | 0.2232 | 131.8 | 200.9 | 0.475 | -0.316 | 0.291 | -0.256 | 0.256 |
| axolotl/draconic | 1 | 31.21 | 4.832 | 0.2232 | 0.1465 | 200.9 | 131.8 | 0.475 | -0.316 | 0.291 | -0.256 | 0.256 |
| ray/golem | 1 | 15.98 | 4.832 | 0.2232 | 0.3506 | 200.9 | 315.5 | 0.512 | -0.526 | 0.608 | -0.250 | 0.671 |
| golem/ray | 1 | 15.98 | 1.691 | 0.3506 | 0.2232 | 315.5 | 200.9 | 0.512 | -0.526 | 0.608 | -0.250 | 0.671 |
| ray/ray | -1 | 12.84 | 1.611 | 0.2503 | 0.0820 | 225.3 | 73.8 | 0.437 | -0.799 | 0.261 | -0.275 | 0.275 |
| draconic/draconic | -1 | 45.00 | 1.631 | 0.5027 | 0.1104 | 452.5 | 99.4 | 0.371 | -0.678 | 0.221 | -0.666 | 0.666 |
| draconic/axolotl | -1 | 31.21 | -1.451 | 0.1465 | 0.2232 | 131.8 | 200.9 | 0.475 | -0.316 | 0.291 | -0.256 | 0.256 |
| axolotl/draconic | -1 | 31.21 | 1.691 | 0.2232 | 0.1465 | 200.9 | 131.8 | 0.475 | -0.316 | 0.291 | -0.256 | 0.256 |
| ray/golem | -1 | 15.98 | 1.691 | 0.2232 | 0.3506 | 200.9 | 315.5 | 0.512 | -0.526 | 0.608 | -0.250 | 0.671 |
| golem/ray | -1 | 15.98 | -1.451 | 0.3506 | 0.2232 | 315.5 | 200.9 | 0.512 | -0.526 | 0.608 | -0.250 | 0.671 |

### Portrait 393×852

| cast | mirror | fov° | az (rad) | fA | fB | pxA | pxB | ratio | minX | maxX | minY | maxY |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ray/ray | 1 | 1.49 | 1.611 | 0.0820 | 0.0889 | 69.9 | 75.7 | 0.453 | -0.905 | 0.829 | -0.089 | 0.089 |
| draconic/draconic | 1 | 45.00 | 1.631 | 0.0839 | 0.2060 | 71.5 | 175.5 | 0.424 | -0.828 | 0.296 | -0.229 | 0.229 |
| draconic/axolotl | 1 | 31.21 | 1.691 | 0.1382 | 0.1867 | 117.7 | 159.1 | 0.520 | -0.901 | 0.949 | -0.209 | 0.223 |
| axolotl/draconic | 1 | 31.21 | 4.832 | 0.1867 | 0.1382 | 159.1 | 117.7 | 0.520 | -0.901 | 0.949 | -0.209 | 0.223 |
| ray/golem | 1 | 15.98 | 4.772 | 0.0826 | 0.2300 | 70.4 | 196.0 | 0.376 | -0.608 | 0.949 | -0.086 | 0.431 |
| golem/ray | 1 | 15.98 | 1.631 | 0.2300 | 0.0826 | 196.0 | 70.4 | 0.376 | -0.608 | 0.949 | -0.086 | 0.431 |
| ray/ray | -1 | 1.49 | 1.611 | 0.0889 | 0.0820 | 75.7 | 69.9 | 0.453 | -0.905 | 0.829 | -0.089 | 0.089 |
| draconic/draconic | -1 | 45.00 | 1.631 | 0.2060 | 0.0839 | 175.5 | 71.5 | 0.424 | -0.828 | 0.296 | -0.229 | 0.229 |
| draconic/axolotl | -1 | 31.21 | -1.451 | 0.1382 | 0.1867 | 117.7 | 159.1 | 0.520 | -0.901 | 0.949 | -0.209 | 0.223 |
| axolotl/draconic | -1 | 31.21 | 1.691 | 0.1867 | 0.1382 | 159.1 | 117.7 | 0.520 | -0.901 | 0.949 | -0.209 | 0.223 |
| ray/golem | -1 | 15.98 | 1.631 | 0.0826 | 0.2300 | 70.4 | 196.0 | 0.376 | -0.608 | 0.949 | -0.086 | 0.431 |
| golem/ray | -1 | 15.98 | -1.511 | 0.2300 | 0.0826 | 196.0 | 70.4 | 0.376 | -0.608 | 0.949 | -0.086 | 0.431 |

### Landscape 852×393

| cast | mirror | fov° | az (rad) | fA | fB | pxA | pxB | ratio | minX | maxX | minY | maxY |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ray/ray | 1 | 14.03 | 1.611 | 0.0820 | 0.3100 | 32.2 | 121.8 | 0.424 | -0.755 | 0.247 | -0.353 | 0.353 |
| draconic/draconic | 1 | 45.00 | 1.631 | 0.1104 | 0.5027 | 43.4 | 197.6 | 0.371 | -0.500 | 0.163 | -0.666 | 0.666 |
| draconic/axolotl | 1 | 31.21 | 1.691 | 0.1465 | 0.2232 | 57.6 | 87.7 | 0.475 | -0.233 | 0.215 | -0.256 | 0.256 |
| axolotl/draconic | 1 | 31.21 | 4.832 | 0.2232 | 0.1465 | 87.7 | 57.6 | 0.475 | -0.233 | 0.215 | -0.256 | 0.256 |
| ray/golem | 1 | 15.98 | 4.832 | 0.2232 | 0.3506 | 87.7 | 137.8 | 0.512 | -0.388 | 0.449 | -0.250 | 0.671 |
| golem/ray | 1 | 15.98 | 1.691 | 0.3506 | 0.2232 | 137.8 | 87.7 | 0.512 | -0.388 | 0.449 | -0.250 | 0.671 |
| ray/ray | -1 | 14.03 | 1.611 | 0.3100 | 0.0820 | 121.8 | 32.2 | 0.424 | -0.755 | 0.247 | -0.353 | 0.353 |
| draconic/draconic | -1 | 45.00 | 1.631 | 0.5027 | 0.1104 | 197.6 | 43.4 | 0.371 | -0.500 | 0.163 | -0.666 | 0.666 |
| draconic/axolotl | -1 | 31.21 | -1.451 | 0.1465 | 0.2232 | 57.6 | 87.7 | 0.475 | -0.233 | 0.215 | -0.256 | 0.256 |
| axolotl/draconic | -1 | 31.21 | 1.691 | 0.2232 | 0.1465 | 87.7 | 57.6 | 0.475 | -0.233 | 0.215 | -0.256 | 0.256 |
| ray/golem | -1 | 15.98 | 1.691 | 0.2232 | 0.3506 | 87.7 | 137.8 | 0.512 | -0.388 | 0.449 | -0.250 | 0.671 |
| golem/ray | -1 | 15.98 | -1.451 | 0.3506 | 0.2232 | 137.8 | 87.7 | 0.512 | -0.388 | 0.449 | -0.250 | 0.671 |

Floor checks: minimum NDC fraction `0.0820` (≥ 0.08) and minimum pixels
`32.2` (≥ 32, landscape ray/ray). All combined `X`/`Y` bounds lie inside
`[-1, 1]`. The portrait ray/ray solve uses a very long-lens 1.49° fov —
telephoto compression, explicitly not a fisheye; the fighters remain at
authored rest positions inside legal bounds.

Full-gap non-overlap is geometrically impossible for the ray's very wide,
short silhouette while holding the 8% floor on a portrait phone: with the
measured radius 0.136 and height 0.087742, the lateral footprint budget at
the floor leaves at most ~0.65 centre/half-width ratio. The accepted contract
is therefore an extent-based **centre** separation (solver target 0.38, test
threshold 0.36) — a small ground-centre gap cannot satisfy it, and the bodies
cannot fully overlap. The pre-fix red ratios were ≈0 (full occlusion).

Cinematic variants (`AZIMUTH_SWING`/`KO_ORBIT_SWEEP`, elevation 0.08, look
0.7) and representative legal positions (including ±3.2 × ±2.4 corners and
their mirrors) are covered by the tests: containment and no full occlusion
hold; the 8% floor is pinned only at authored rest positions, since legal
extremes and cinematic radius widening promise containment, not the floor.

## 6. Reduced motion exception (NFR-4)

Reduced motion continues to pin the stable, shake-free wide establishing
shot (`applyEstablishing()`), consistent with the spec. The 8% / 32-px
**action-shot** floor is claimed only for broadcast action framing; the wide
establishing shot is an explicit exception and does not meet that floor.

## 7. Arena contrast retune (P4.T2) — arena-only

| surface | before | after |
| --- | --- | --- |
| `ARENA_SKY` | `0x2b3447` | `0x323d54` |
| `ARENA_FOG_NEAR` | `22` | `24` |
| `ARENA_FOG_FAR` | `44` | `48` |
| `FLOOR_COLOR` | `0x545e6d` | `0x626d7e` |
| `FLOOR_LINE_COLOR` | `0xe6ddc7` | `0xf2ead6` |
| `STAND_COLOR` | `0x363c49` | `0x454d5e` |
| `STAND_EMISSIVE` | `0x2b3140` | `0x384058` |
| `CROWD_COLOR` | `0x202534` | `0x171b28` |
| backdrop `MeshBasicMaterial` | `0x303a4e` | `0x3b465e` |
| ambient | `0x6d7888` / `1` | `0x8290a5` / `1.25` |
| hemi | `0xd0dae8` / `0x3d4659` / `1.5` | `0xdce6f4` / `0x4d5870` / `1.8` |
| key | `0xf4f8fc` / `2.8` | `0xfbfeff` / `3.1` |
| rim | `0xb9cde6` / `1.1` | `0xcadcf2` / `1.35` |

Why this is materially better: lit floor/stand/key/hemi/rim values rise
roughly 20–35%, giving brighter, more legible fighter silhouettes against a
venue that keeps its formal-competition structure; the crowd is darker so
tier separation reads clearly; paint lines are brighter without becoming
white; fog starts farther out so near/mid arena geometry is not washed out;
the backdrop stays darker than the floor for depth. No post-processing,
exposure, or shared scene setup was changed.

## 8. Verification commands and results

```text
bun test --check --parallel=4 --timeout 120000 apps/client/src/scene-logic/framing.test.ts apps/client/src/scene-logic.test.ts apps/client/src/director.test.ts apps/client/src/roster.test.ts apps/client/src/dense-playback.test.ts apps/client/src/module-size.test.ts
exit 0
65 pass / 0 fail / 7383 expect() calls
Ran 65 tests across 6 files.
```

```text
bun run check
exit 0
@apex/voxel  ✓ No type errors in 214 files
@apex/sim    ✓ No type errors in 253 files
@apex/server ✓ No type errors in 185 files
@apex/client ✓ No type errors in 561 files
all four workspaces exited 0
```

The primary owns `bun run verify && bun run build` and the real-browser
retest. Per the brief, no Playwright capture was run in this phase.

## 9. Scope / freeze-line proof

`git status --short` and `git diff --stat` at phase completion:

```text
apps/client/src/arena.ts                    |  26 +--
apps/client/src/camera/rig.ts               |  10 +
apps/client/src/director.test.ts            |  12 +
apps/client/src/director.ts                 |  10 +
apps/client/src/roster.test.ts              |  33 +++
apps/client/src/roster.ts                   |  13 ++
apps/client/src/scene-logic/framing.test.ts | 334 +++++++++++++++++++++++++++-
apps/client/src/scene-logic/framing.ts      | 268 ++++++++++++++++------
apps/client/src/staging-director.ts         |   5 +
apps/client/src/staging.ts                  |   2 +
10 files changed, 629 insertions(+), 84 deletions(-)
```

Every changed file is inside the brief's `Touches` list. No edits to battle
HUD/CSS, fighter models, stage scale (`arena-scale.ts`), simulation mapping,
legal bounds, save/state, audio, voxel assets, ranch lighting,
`scene-setup.ts`, post-processing, dependencies, lockfiles, generated files,
or other Conductor state. `apps/client/src/camera/presets.ts` was in scope
but did not need changes: `ACTION_FRAMING.margin` was restored to its original
`1.1` after experiments, and the azimuth solve lives in `framing.ts`.
`scene-logic.ts` barrel exports were not changed; the pinned runtime/type
surfaces remain satisfied.

## 10. Deviations and blockers

- **Deviation:** `MIN_CENTER_SEPARATION` is a measured-extent centre threshold
  (0.38 solver / 0.36 test) rather than a positive full-gap requirement.
  Reason: a positive gap is geometrically impossible for the measured ray
  wings under the inviolable 8% / 32-px floor at portrait; the adopted
  threshold still prevents full overlap and replaces the old centre-only
  check with an extent-based one. Cinematic uses a lower 0.15 threshold
  because director look may favour one fighter; the promise there is no full
  occlusion or crop, not broadcast composition.
- **Deviation:** the exact `π/2` action azimuth is not preserved; bounded
  three-quarter offsets are solved per frame as the brief explicitly allows.
- **Blocker:** none that stops this phase. The two diagnostic attempts from
  `.conductor/evidence/` failed (`bun test` path filter; `Cannot find package
  'three'` module resolution) and were replaced by temporary tests inside
  `framing.test.ts`, which were removed after capturing the tables above. All
  temporary diagnostics are gone; the working tree contains only the ten
  files listed in section 9 plus this uncommitted evidence file.

## Rework 1

Primary Biome review found 3 errors and 1 warning in the two framing files.
Only non-behavioral formatting/organization fixes were applied by hand; a
denied `--write` retry was not attempted:

- removed the unused `screenGap` helper and its doc comment from
  `framing.test.ts` (warning);
- ordered the relative imports as `../arena-scale`, `../camera/presets`,
  `../camera/rig`, `../roster`, then the `../scene-logic` block;
- wrapped the `expect(centerGap).toBeGreaterThan(...)` expression as Biome
  printed;
- collapsed `restPair`'s signature onto one line;
- wrapped the `width: Math.max(...)` property and the `bestScore` assignment
  in `framing.ts` as Biome printed.

Re-verification (exact Phase 4 command, no full gate or Playwright):

```text
bun test --check --parallel=4 --timeout 120000 apps/client/src/scene-logic/framing.test.ts apps/client/src/scene-logic.test.ts apps/client/src/director.test.ts apps/client/src/roster.test.ts apps/client/src/dense-playback.test.ts apps/client/src/module-size.test.ts
exit 0
65 pass / 0 fail / 7383 expect() calls
Ran 65 tests across 6 files.
```

Commit: `f054364c style(client): format arena separation correction`.
This evidence file remains uncommitted for the primary.

## Primary verification

- Scope check: `git diff --name-only 6ae0fae9..HEAD` contains exactly the ten approved client source/test files; the range contains only `717b91a3`, `89287b6f`, and `f054364c`, with no merge or user commits. Only this evidence file was untracked.
- Exact Phase 4 command re-run by the primary: **65 pass / 0 fail / 7,383 expect() calls**, exit 0.
- Scoped Biome re-run by the primary: **Checked 10 files ... No fixes applied**, exit 0.
- `git diff --check`: exit 0.
- Module sizes: `framing.ts` 11,750 B, `framing.test.ts` 25,205 B, `camera/rig.ts` 10,707 B, `roster.ts` 6,455 B, `arena.ts` 9,046 B. The configured module-size test remains green; test files are not subject to the production module cap.
- Full primary gate `(bun run verify && bun run build)`: **exit 0** — clean typechecks in voxel 214, sim 253, server 185, client 561 files; **4,623 pass / 1 skip / 0 fail**, 683,529 expect() calls, 4,624 tests across 446 files; Biome clean on 1,063 files; every archetype stage and all 5 prop digests regenerated byte-identical; Vite built `index-DhAc5cQZ.js` at 1,114.41 kB with only the pre-existing chunk-size advisory.
- Freeze-line audit: no sim/state/save/balance, audio, voxel/generated asset, ranch/shared scene setup, post-processing, dependency, lockfile, or legal movement-bound change.
- Conclusion: Phase 4 code/logic is verified. Real-browser separation and contrast remain acceptance gates for the reopened Phase 3; this phase does not claim those visual results yet.
