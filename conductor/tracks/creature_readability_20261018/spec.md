# Specification — Creature Readability: AO, palette depth, and a face

## Overview

Every creature in the game is currently one flat `MeshLambertMaterial` per
part, three to four flat RGB values across the whole animal (`main` / `dark` /
`bone` — body, neck, head and tail share the identical RGB), no ambient
occlusion, and no facial features at all: a search for
`eye|pupil|nostril|mouth|tooth` across `packages/voxel/src` returns nothing, and
the drake's head is 66 triangles of box-and-wedge. In
`artifacts/pw-arena-champion.png` the two fighters read as monochrome lumps;
from the front the creature is not identifiable as an animal.

The body plans are not the problem — they are silhouette-tuned and
budget-audited. What is missing is surface language and a face. Measured at
track start: drake baby 11 parts / 4,086 voxels / 2,042 triangles; drake
champion 15 / 4,064 / 2,116; bovine baby 11 / 3,090 / 1,208; axolotl baby 12 /
2,370 / 1,816. There is enormous triangle headroom: these three changes cost
almost no geometry, only pipeline work.

This track adds:

1. **Ambient occlusion** — per-vertex, corner-sampled, four levels, folded into
   the vertex colour. Crevices gain depth; the existing stair-stepping reads as
   form rather than noise.
2. **Per-voxel colour classes** — the grid carries a class per voxel, the
   mesher merges only within a class and emits `COLOR_0`, and a pure
   `surface.ts` derives anatomical zones plus seeded dappling.
3. **A face** — a shared `face.ts` kit parameterised per archetype and per
   stage, with eyes as independently riggable parts, plus a seeded idle blink
   and micro-glance.

Determinism is preserved end to end; committed artifacts and the determinism
gate are regenerated, and the generator version is bumped.

## Decisions locked at planning time

| Decision | Choice | Why |
|---|---|---|
| Colour architecture | Per-voxel colour classes + `COLOR_0` | Only path to belly gradients and dappling; per-part sub-materials force hard seams |
| AO character | Subtle 4-level, 0.72 floor | Reads as crevice depth without muddying saturated element hues or fighting the 3-point rig |
| Face coverage | Beady eyes, brow, painted mouth, painted nostrils | At 56³ a sclera/pupil/catchlight ball needs half the head to hold a rim; a two-voxel bead with one warm cell reads at arena distance |
| Face identity | Shared kit, per-species parameters | Single-source the math; keep drake/bovine/axolotl faces distinct |
| Stage behaviour | Head geometry carries the stage; the eye does not scale | A two-by-two bead is already the smallest surfaced eye this grid can hold |
| Eyes | Separate riggable parts | Blink/glance land without a second pipeline change |
| Animation | Idle blink + occasional eye-only glance | Requested in scope |
| Props | Inherit AO, keep flat colours | Shared mesher; free depth for the ranch |

## Functional Requirements

### FR1 — Colour classes in the voxel grid

`VoxelGrid` must carry a colour class id per voxel alongside the owning part.
`CreatureBuild` declares the class palette as an ordered `[r,g,b][]`; class 0 is
the default. A build that declares no classes must behave exactly as today:
every voxel is class 0 and the emitted mesh is unchanged.

Paint order (first part in list order claims a voxel) is unchanged.

### FR2 — Colour-aware greedy meshing

The merge mask encodes (part, class); greedy merging must only span voxels of
equal class. `MeshePart` gains a per-vertex `colors` array in the same order as
`positions`.

**Regression requirement:** a class-less build must produce a mesh
byte-identical to pre-track output. This is the safety net for the whole
pipeline and is pinned by a golden test before any code moves.

### FR3 — Per-vertex ambient occlusion

Each quad corner is occluded from its three neighbours on the face's outer
layer, using the standard four-state rule (`ao(side1, corner, side2)`: both
sides solid → 0; exactly one side plus corner → 1; none → 2; otherwise 3).
Emitted as a per-vertex `ao` value in 0..1, four per quad.

- A greedy merge is only permitted when all four corner AO values match, so a
  merged quad never has unsampled interior corners.
- The quad's triangulation must flip to the lower-AO diagonal to avoid
  anisotropy shimmer.
- AO only ever darkens; a face's AO is never greater than 1.
- Applies to creatures **and** ranch props.

### FR4 — GLB and client surface

AO is folded into the vertex colour (albedo × ao) — the standard cheap voxel
pipeline, and it avoids a custom shader. The GLB exporter gains a `COLOR_0`
VEC3 accessor per primitive; the material keeps `metallicFactor: 0`,
`roughnessFactor: 1`. `GENERATOR_VERSION` goes 1 → 2.

The client switches to `vertexColors: true` and shares one material per
creature instead of one material per part. The `grey` preview mode stays
available (flat grey, surface off).

### FR5 — Surface zones and dappling (`surface.ts`, pure)

A zone classifier assigns each voxel a class from part role and local anatomy:

- **belly** — low-y torso voxels: lightest ramp step
- **dorsal** — high-y torso voxels: darkest ramp step
- **lateral** — torso mid-band: mid ramp step
- **limb** — leg parts: darker than lateral
- **sock/hand** — the lowest band on leg parts: darkest step

Ramps are 3–5 steps with hue-shifted shadows (shadow steps shift roughly
15–25° toward cool, per the project's palette-first rule). Seeded two-octave
low-frequency noise selects between adjacent ramp steps to produce scale
dappling.

The noise stream is **salted** (`seed ^ SURFACE_SALT`) so existing DNA and
palette draws are untouched: the same seed keeps the same gilded roll and the
same base lightness. `gilded` keeps its current flat hue-45 plus saturation
override as the ramp's base.

Output must be deterministic for a given DNA, fully derived from the seed, and
free of `Math.random` or time dependence.

### FR6 — Face kit (`face.ts`, pure)

A shared library of face primitives — socket recess (`smoothSubtract`), beady
eye, brow ridge, painted mouth line, painted nostrils — driven by a per-archetype
`FacePlan`:

| | eyes | brow | mouth | nostrils |
|---|---|---|---|---|
| drake (draconic) | beady, under a ridge | strong ridge | wide painted line | none — a four-cell muzzle has no room for a pair |
| bovine | wide-set, round | none | broad painted line | pair, one row above the mouth |
| axolotl | large, round | none | wide painted smile | none |

Eyes are emitted as `eyeLeft` / `eyeRight` parts parented to `head`, with pivots
at the top-centre of the eye so a `scale.y` collapse reads as a lid closing
rather than the eye shrinking into its centre. Each eye is a two-by-two block of
voxels — a dark pupil plus one warm catchlight cell — carrying two colour
classes and no sclera. The catchlight is a one-step warm lift, not white: at this
size a white cell reads as damage, and the eye's silhouette does the work.

The eye is one size at every stage: half-height 0.8 voxels. That is the floor,
not a style choice — under 0.707 the radius catches no cell centre and the eye
vanishes, over 1.0 it grows a third row and stops being beady. Stage variation
lives in the skull, which is what makes a baby read big-eyed.

The eye sits flush at the surface column inside a one-ring socket dish; the dish
must be shallow enough that the bead still breaks the surface by a cell, or the
eye reads as an empty hole. The brow, where a species has one, is derived from
the *snapped* eye centre so it lands on the same columns and cell corners.

Mouth and nostrils are painted onto the surface, never carved. A subtract deep
enough to read at this resolution is a hole the width of the muzzle — the drake
read as an open beak with a slab above it. The mouth is one row on the muzzle's
front plane, inset from the corners so it is a line and not a second snout;
nostril cells are painted by exact cell membership, so a pair cannot merge into
a bar the way two carved pits do.

### FR7 — Idle blink and micro-glance

A pure scheduler derives blink timing from `dna.seed`: next-blink interval in a
2.4–5.6 s band, ~140 ms blink with a fast close and a slower open, both eyes in
phase.

A separate seeded schedule produces an occasional eye-only ±2° yaw glance every
4–9 s for ~500 ms. **Eyes only, never the head** — the arena director owns head
orientation and framing.

- Cosmetic only: never touches sim state, never reads the battle clock.
- Glance is suppressed while hit-stop is active; blink is not (a creature that
  stops blinking mid-hit reads as dead).
- Under reduced motion, glance is disabled and blink is retained.
- The decision logic is a pure, unit-testable function; the three.js
  application stays thin.

**As shipped** (`apps/client/src/face-motion.ts`): timing is slot-based, not a
list — blink *k* starts at `k · 4 s + hash(seed, k) · 1.6 s`, so consecutive
starts are arithmetically confined to 2.4–5.6 s and the query stays O(1) however
long the tab has been open. The blink is 155 ms (50 ms close, 15 ms held, 90 ms
open) and the lid is a `scale.y` collapse about the eye's top-centre pivot,
floored at 0.08 so a shut eye stays a line. The glance repeats on 6.5 s ± 2.4 s
(4.1–8.9 s), turning 90 ms, holding 450 ms, returning 120 ms, with amplitude
0.55–1.0 of the ±2° cap. One `driveFace(eyes, seed, seconds, { suppressed })`
call writes both eyes, so the ranch and the arena cannot drift apart; the arena
passes hit-stop as `suppressed`, the ranch passes reduced motion.

### FR8 — Verification surface

- `preview.html` renders the new surface by default, with `?surface=0` falling
  back to flat, and gains an `?angle=face` close-up preset for face review.
- `gallery.html` gains `?stage=` so the 8-seed variant sweep can be used for
  pattern QA.
- Before/after PNGs are committed to the track folder as the vision-gate
  evidence, matching the project's established silhouette-loop workflow.

### FR9 — Artifacts and determinism gate

- All nine creature GLBs and manifests regenerated
  (`scripts/export-artifact.ts` per archetype and stage).
- `artifacts/props-42.json` rewritten with the gate's `--write` flag.
- `GENERATOR_VERSION` = 2.
- `bun run gate:determinism` green.

## Non-Functional Requirements

- `bun check`, `biome check`, `bun test` green. Suite stays at or under ~15 s
  (currently ~11.5 s wall). AO must be O(1) per corner — no per-face neighbour
  scans beyond the fixed eight.

  **Deviation recorded 2026-10-19, approved by the user.** The ~15 s figure
  does not hold on the machine this track was finished on, and it did not hold
  at the track's base commit either: the voxel package alone — 133 tests, 33
  files — took **62 s** serial on the base commit and **74 s** now (211 tests,
  40 files), and the full suite is **108 s** serial / **21–30 s** with
  `bun test --parallel`. Like-for-like, the track added **+19%** wall time for
  **+59%** tests and **+129%** assertions, so the per-operation cost did not
  regress; the original number was measured under different conditions (or on
  a different machine) and the tree was already past it. The gate therefore
  asserts correctness and determinism at whatever wall time the runner needs;
  three generator-heavy tests (two in `face.test.ts`, the arena face idle) run
  past Bun's 5 s default under parallel load and now carry an explicit
  timeout, and `bun run verify` passes `--timeout 20000` so the shared gate
  does not fail on machine load rather than on a defect. No test was deleted,
  skipped or weakened to buy this.
- Triangle budget: no more than 2.5× current worst case (~2.1k → ~5k per
  creature). Before/after counts recorded per archetype and stage.
- No new dependencies. `packages/voxel` stays pure TypeScript with no DOM.
- Draw calls: +2 parts per creature, but materials collapse from 11–17 to ~1–2
  per creature, so net GPU state changes should fall.
- Determinism: same seed → byte-identical GLB. No global state, no
  `Math.random`, no dependence on wall-clock time.

## Acceptance Criteria

1. Drake, bovine and axolotl each show a beady eye with a catchlight and a mouth
   at gameplay distance, in all three stages; the bovine also shows a nostril
   pair.
2. Every creature shows at least three distinct surface tone zones and visible
   dappling; belly is lighter than dorsal on every archetype.
3. Crevices (under jaw, between legs, inside haunches) are visibly darker than
   adjacent exposed faces.
4. A class-less build's `meshGrid` output is byte-identical to pre-track output
   (pinned regression test).
5. AO only ever darkens and is deterministic for a given grid.
6. Blink reads as a blink — not a shrink — at ranch and arena scale, on a
   deterministic seeded schedule.
7. Nine artifacts plus the prop manifest regenerated; determinism gate green;
   `GENERATOR_VERSION` 2.
8. Element hue contract intact: Fire 18°, Plant 110°, Water 205° (and the other
   three unchanged).
9. Props show AO with unchanged prop colours.
10. `bun run verify` and `bun run gate:determinism` both green.

## Out of Scope

- Body-plan anatomy: round-cone limbs, claws, horn taper, replacing the
  terraced capsule joins (separate anatomy track).
- Stage body-plan differentiation (separate stage-identity track).
- Rarity marking patterns beyond the existing gilded hue override — the colour
  class system makes this a cheap follow-on, but it is not built here.
- Arena and ranch lighting, rim light, contact shadow, stage-aware scaling
  (separate broadcast-readability track).
- Wink or asynchronous eye motion, GLB animation clips, skinning, a Codex
  screen.

## Risks

| Risk | Mitigation |
|---|---|
| Greedy merge + AO interaction causes seams or a triangle blow-up | Gate merges on AO equality; measure triangle count every phase; fall back to 1×1 quads for any part that explodes |
| Per-voxel dappling reads as noise at distance | Low-frequency two-octave noise, narrow two-step ramp; judged at arena distance, never zoomed |
| Face features vanish at 56³ in the smallest head | Two-by-two bead is the floor this grid allows (radius ≥ 0.707 or it catches no cell centre); verify at baby scale first, since the baby head is smallest |
| Painted features read as a second face (two dots above a mouth) | Nostril pairs sit one row above the mouth, never at eye height; the drake carries no pair at all |
| Determinism gate fails until artifacts regenerate | Expected and sequenced — Phase 6 owns regeneration; earlier phases verify through preview/gallery |
| Blink fights the arena director | Glance is eyes-only, suppressed during hit-stop, disabled under reduced motion |
| Per-voxel colour silently changes existing palettes | Salted RNG stream; FR5 requires existing DNA and palette draws to be unchanged, pinned by test |
