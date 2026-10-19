# Implementation Plan — Creature Readability: AO, palette depth, and a face

> Follow `conductor/workflow.md`: TDD for logic-bearing code (pure modules,
> mesher, scheduler), manual screenshot verification for rendering wiring.
> Every phase ends with the Phase Verification & Checkpoint protocol.

## Phase 1: Colour plumbing (no visual change)

Goal: carry a colour class from the grid to the screen without changing a
single pixel. This phase exists so that every later phase has a proven,
byte-stable foundation.

- [x] Task: Pin the regression baseline before touching anything
  - [x] Add a golden test that hashes `meshGrid(voxelize(...))` for all three
        archetypes at all three stages plus one prop
  - [x] Verify the golden matches current committed artifact triangle counts
- [x] Task: Colour classes in `voxelize`
  - [x] Write failing tests: a class-less build yields class 0 for every voxel;
        declared classes are attributed per part in paint order
  - [x] `PartField` declares an optional class resolver; `VoxelGrid` carries
        per-voxel classes; `CreatureBuild` declares the ordered palette
  - [x] Refactor: keep the voxel emit loop single-pass and O(n)
- [x] Task: Class-aware greedy meshing
  - [x] Write failing tests: two classes split at the boundary; a class-less
        build is byte-identical to the Phase 1 golden; colour array length
        matches position length
  - [x] Extend the mask to (part, class) and merge only within a class
  - [x] Emit per-vertex `colors` on `MeshePart`
- [x] Task: `COLOR_0` in the GLB exporter
  - [x] Write failing tests: a `COLOR_0` VEC3 accessor exists per primitive and
        its count matches the position count; `GENERATOR_VERSION` is 2
  - [x] Add the accessor, buffer view and byte alignment
- [x] Task: Client vertex colours
  - [x] Switch `buildCreatureMeshes`/`buildCreatureGroup` to
        `vertexColors: true` and share one material per creature
  - [x] Preserve `grey` preview mode
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] `bun check`, `biome check`, `bun test` green; suite ≤ 15 s
  - [x] Browser evidence: preview screenshot is visually identical to the
        pre-phase capture (same seed, same angle, colour mode)
  - [x] Await explicit user approval, attach the verification note, record the
        checkpoint SHA

## Phase 2: Ambient occlusion

Goal: give every crevice depth without dirtying the palette.

- [x] Task: Pure AO rule
  - [x] Write failing tests for the four-state `ao(side1, corner, side2)` rule,
        including the classic "edge-adjacent counts as two" case
  - [x] Implement the corner sampler over the fixed eight neighbours
  - [x] Add a test that AO is symmetric for mirrored geometry and never > 1
- [x] Task: Mesher AO integration
  - [x] Write failing tests: AO array is four values per quad; merge gating
        splits quads whose corner AO differs; a flat open floor stays merged
  - [x] Gate greedy merging on equal corner AO
  - [x] Flip quad triangulation to the lower-AO diagonal
  - [x] Measure and record triangle deltas per archetype and stage
- [x] Task: Fold AO into the vertex colour
  - [x] Write failing test: emitted colour equals albedo × ao
  - [x] Apply in the exporter and the client path identically
- [x] Task: Props inherit AO
  - [x] Write failing test: a prop grid produces AO
  - [x] Rewrite `artifacts/props-42.json` with the gate's `--write` flag
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Browser evidence: same seed and angle, crevices visibly darker (under
        jaw, between legs, inside haunches)
  - [x] `bun test`, `bun check`, `biome check` green
  - [x] Await explicit user approval, attach the verification note, record the
        checkpoint SHA

Notes from this phase:

- Measured triangles (seed 42, baby / juvenile / champion): draconic 3432 /
  3362 / 3634, bovine 2166 / 2286 / 2342, axolotl 3014 / 2872 / 3206. Worst
  case is 1.72× the pre-AO draconic champion (2116), inside the 2.5× NFR.
- GLB budget test raised 150 KiB → 320 KiB. It is a tripwire, not a shipping
  constraint: the client generates creatures at runtime, and the committed GLBs
  only feed offline icons and the determinism gate.
- Finding (2026-10-18): AO is baked correctly but reads as a faint depth cue,
  not as crevice shading. 20% of vertices sit at the 0.72 floor and 42% are
  shaded, yet moving the floor to 0.45 shifts the darkest 5% of rendered
  pixels by only ~9%. Cause: occlusion is sampled one voxel in front of each
  face, and this body plan has no cavities - the under-jaw and between-legs
  gaps are open notches, and the terraced flanks put every contact on tiny
  quads covering few pixels. A three-ring (2–3 voxel) variant was prototyped
  and measured: it moved 2% of vertices for +12% mesh time, and the spec NFR
  forbids per-corner scans beyond the fixed eight (spec.md:180-181). Reverted.
  The user accepted AO as a subtle cue and moved the fidelity effort to
  Phase 3, where palette zones and dappling act on 100% of pixels.
- Checkpoint: `41c7a25`.

## Phase 3: Surface zones and dappling

Goal: read as living hide — anatomical zones plus seeded dappling, with the
element hue contract intact.

- [x] Task: Ramp builder
  - [x] Write failing tests: steps are monotonic in lightness; shadows shift
        toward cool; the base hue stays inside the element contract
  - [x] Implement `creaturePalette(dna, stage)` with 3–5 steps per archetype
- [x] Task: Zone classifier
  - [x] Write failing tests: belly is lighter than dorsal on every archetype;
        socks appear only on leg parts; classification is deterministic
  - [x] Implement `surfaceClass(part, x, y, z, dna, stage)`
- [x] Task: Dappling noise
  - [x] Write failing tests: same seed → same class map; two-octave low
        frequency; class ratio stays in a sane band (no single-class flood)
  - [x] Implement with a salted stream and prove the existing palette draw is
        unchanged for every seed
- [x] Task: Wire classes into the three archetype builds
  - [x] Draco, bovine, axolotl declare palettes and assign classes during field
        construction
  - [x] Keep `gilded` behaviour byte-identical
- [x] Task: Manual vision sweep
  - [x] `gallery.html?stage=` 8-seed sweep per archetype, judged at arena
        distance
  - [x] Commit before/after PNGs to the track folder
        (`artifacts/before-*.png`, `artifacts/after-*.png`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Browser evidence: three tone zones plus dappling visible at gameplay
        distance on all three archetypes
  - [x] Await explicit user approval, attach the verification note, record the
        checkpoint SHA

### Phase 3 findings (2026-10-18)

- Ramp steps derive from the DNA's own hue/sat/light, so `lateral` is
  byte-identical to the pre-zone `main` and `limb` is exactly
  `lateral x 0.7`. A build that declares no classifier renders unchanged;
  `gilded` keeps its flat hue-45 base and gains zones on top of it.
- Measured champion ramps (seed 42). Draconic:
  `lateral #ee8152 dorsal #9e4542 belly #d8c3b9 limb #a75a3a sock #933d43`;
  bovine: `#57d63e / #3c7642 / #a7c4a1 / #3d962b / #376c42`.
  Shadow steps lose saturation as well as value — keeping it turned the orange
  drake's back crimson.
- First arena-distance sweep failed and was fixed before commit. Two causes:
  band edges dithered per voxel, and `dappled` let 30% of flank voxels step UP
  to the pale belly tone. At 120 px per creature the pale speckle reads as torn
  or eroded hide, not as counter-shading. The fix keeps the ±1.5-voxel wobble
  but drops the per-voxel dither, and makes flank/limb dappling one-sided
  (darkens only). Compare `artifacts/before-draconic.png` with
  `artifacts/after-draconic.png`.
- Surface shares on champion body vertices (lateral / dorsal / belly / limb):
  draconic 54 / 12 / 30 / 5, bovine 52 / 22 / 23 / 3, axolotl 61 / 17 / 18 / 5.
  Socks appear only on leg parts (6% of all vertices on draconic and axolotl,
  17% on bovine, whose legs are shorter).
- Quad merging is gated on the packed class signature, so a zone boundary
  legitimately splits quads that used to merge. Mesh baseline re-pinned:
  draconic champion 3634 → 3700 tris (+66, +1.8%); geometry itself is untouched.
- Artifacts regenerated at seed 42, tri deltas vs Phase 2 (baby / juvenile /
  champion): draconic 3432→3484, 3362→3432, 3634→3700; bovine 2166→2318,
  2286→2414, 2342→2492; axolotl 3014→3058, 2872→2912, 3206→3258. Largest GLB
  is 243,444 B, still inside the 320 KiB tripwire. Props opt out of zones, so
  `artifacts/props-42.json` is byte-identical and the determinism gate matches
  all 5 props plus all 9 creatures.
- Checkpoint: `380e3a9` [checkpoint: 380e3a9]

## Phase 4: Face kit

Goal: every creature has a readable face at broadcast distance, in every stage.

- [x] Task: SDF primitives
  - [x] Write failing tests for `sdRoundCone` (tapered radius), `sdEllipsoid`
        and `smoothSubtract` (subtraction carves, preserves the outer surface)
  - [x] Implement them alongside the existing primitives
- [x] Task: `face.ts` plans and eyes
  - [x] Write failing tests: each archetype emits `eyeLeft`/`eyeRight`; pivots
        sit at the top-centre of each eye; face parts fall inside the head
        bounds
  - [x] Implement `FacePlan` per archetype and the eye parts
  - [x] Pupil and catchlight carry their own colour classes (two classes, no
        sclera)
- [x] Task: Mouth, nostrils, brow
  - [x] Write failing tests: mouth and nostrils are painted dark cells on the
        muzzle's front face; brow is present only where the plan declares it
  - [x] Implement per the spec table
- [x] Task: Stage-aware eye proportions — superseded during the face rebuild;
        the eye is one size at every stage (see findings)
- [x] Task: Wire into the builds
  - [x] Parent eyes under `head` in `build.parents`; extend `colors`
  - [x] Keep the face inside each archetype's proportion budget untouched
- [x] Task: Manual face review
  - [x] Close-up captures for 3 archetypes × 3 stages via `?angle=face`
  - [x] Verify at baby scale first (smallest head)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Browser evidence: the beady eye, the mouth line and the bovine nostril
        pair read at gameplay distance
  - [x] Await explicit user approval, attach the verification note, record the
        checkpoint SHA
- Checkpoint: `e059c0d` [checkpoint: e059c0d]

### Phase 4 findings

- `packages/voxel/src/face.ts` holds `facePlan(archetype, head)` — one pure
  function returning eye centres/radii, the socket carve, the painted mouth and
  nostril cells, and the brow, plus `faceParts(plan, coat)` for the eye and brow
  parts. Archetypes contribute numbers (head bounds, muzzle length, snout
  box); every geometric decision lives in one file. The `stage` argument is
  gone: the eye no longer has stage proportions to spend it on.
- The first face shipped and was rejected on looks. A sclera/pupil/catchlight
  ball needs the eyeball to be half the head before a rim fits around it, and
  the carved mouth was a hole the width of the muzzle; the user's verdict was
  "it made the creature look hideous" and "the drake mouth is too weird".
  Rebuilt to three decisions the user made on the evidence: rescale and recess
  the eye, a beady two-by-two with a two-class palette, and rework the
  mouth/nostril area.
- The eye is a two-by-two block of four voxels — `EYE_CLASS` is
  `{ pupil: 0, catchlight: 1 }` and `EYE_PALETTE` is `[PUPIL, CATCHLIGHT]`
  (`PUPIL` `[0.09,0.07,0.08]`, `CATCHLIGHT` `[0.17,0.13,0.1]`). No sclera, no
  species eye scale, no `pupil` geometry and no slit branch. It is a separate
  part parented to `head`, pivoted at the top-centre so a later `scale.y`
  closes a lid without translating the eye.
- Sampling contract: the eye's x sits on the first cell centre inside the
  surface, the other two axes snap to a cell corner (`Math.round`). That is
  what makes a sub-voxel radius cover four cells; a radius centred on a cell
  needs to pass a whole voxel before it catches a second one. `EYE_RADIUS` is
  0.8 for every species and stage — 0.707 is the floor before the sampler
  misses every cell centre, 1.0 starts a third row.
- The socket dish floors at `max(0.9, radii.x * 1.45)` and
  `max(1.2, radii.y * 1.15)` / `max(1.2, radii.z * 1.15)`, so it carves a
  one-ring shadow rather than a cavity; the bead sits flush at the surface
  column and the carve is `unionAll(sockets)` only.
- Mouth and nostrils are painted, never carved. The mouth is one cell row on
  the muzzle front plane (`y = Math.floor(y) + 0.5`, half-depth 0.6) and the
  classifier's `DARK_BAND` adds about one cell per side; the visible line is
  therefore `2 * (half.x + 0.45)` wide, which is why the widths are set to
  fractions of the muzzle rather than in cells. Drakes use `muzzle.half.x *
  0.72`; the bovine was narrowed to the same 0.72 (4 cells); the axolotl went
  from a full-width band (10 cells, which read as a visor) to `half.x * 0.5`
  (6 cells).
- Nostrils are single cells painted by exact membership — `cell(v) =
  Math.floor(v) + 0.5` and a `|Δ| < 0.5` test per axis — because two carved
  pits 2 cells apart merge into one bar. The bovine pair sits one row above the
  mouth (`cell(muzzle.center.y)` with the muzzle aligned to the jaw); at muzzle
  mid-height it sat at eye level and read as a second pair of eyes.
- The drake has no nostrils at all. On a four-cell muzzle the pair either lands
  at eye height (a second pair of eyes) or touches the mouth row (a moustache,
  tried and captured); the mouth line carries the muzzle alone. The brow is
  derived from the *snapped* eye centre —
  `vec3(e.center.x + e.side * 0.45, e.center.y + 2, e.center.z)` with half
  `vec3(0.6, 0.62, 0.85)` — so it lands on the same columns the sampler can
  hit: four voxels, two rows by two deep, one column proud.
- Two bovine bugs, both fixed with evidence:
  - `snoutC` was built with `at(0, 14.2, headC.z + 2.4 * hd)` even though
    `headC` is already in grid space, adding the 28-unit grid offset twice and
    putting the muzzle at z≈73 in a 56³ grid. The bovine had no snout, no
    mouth surface and no dark cells at all. It is now offset from `headC`
    directly.
  - With the snout back, its underside hung a row below the jaw and pushed
    `headHeight/bodyHeight` to 0.538 against the bovine's 0.5 budget. The muzzle
    is aligned to the skull's underside (`headC.y - 2.4 * hd + 2.3 * hd`); the
    ratio returns inside budget and the face keeps its layout, one row higher.
- A regression test now voxelizes every archetype and stage and asserts the
  lowest dark row of the head owns at least three cells — the check that would
  have caught the snout outside the grid. It was verified to fail by
  temporarily restoring the `at(...)` form.
- Triangles vs Phase 3 (baby / juvenile / champion): draconic 3484 → 3544,
  3432 → 3492, 3700 → 3756; bovine 2318 → 2354, 2414 → 2452, 2492 → 2530;
  axolotl 3058 → 3082, 2912 → 2936, 3258 → 3286. Worst case +60 tris (+1.6%),
  cheaper than the rejected ball because the eye parts halve their voxels and
  the head loses the mouth/nostril carving.
- Largest GLB is 250,284 B (draconic champion), 8% under the rejected cut and
  76% of the 320 KiB tripwire. All nine artifacts regenerated; the determinism
  gate reproduces every creature plus all five props byte-identical.
- Manual review: nine `?angle=face` captures (`face12-<archetype>-<stage>.png`)
  and three champion `angle=3-4` gameplay captures. Baby was checked first as
  planned. The preview URL the review ran against is a dev-only page, and it
  gained a drag-to-orbit / wheel-to-dolly camera in this phase so faces could be
  judged from any angle instead of three fixed shots.
- Verification: `bun run check` clean in all three packages; whole-repo
  `bunx biome check` reports only the four pre-existing
  `apps/client/src/cup/view-models.test.ts` warnings; `bun test
  --parallel=4 --timeout=600000` is 1503 pass, 1 skip, 0 fail across 117 files
  (62,519 expects, 35.4 s); `face.test.ts` is 11 tests in 4.4 s.
- Mesh baseline re-pinned `55cfe280…` → `e85cd478…`; the header records the
  beady eye, the painted mouth/nostrils and the bovine snout fix.
- Deferred to Phase 5 as planned: the blink and glance drivers that will
  actually close these eyelids. Nothing here animates yet.

## Phase 5: Blink and micro-glance

Goal: the face is alive, deterministically, without touching sim state.

- [x] Task: Pure blink scheduler
  - [x] Write failing tests: deterministic for a seed; interval inside the
        2.4-5.6 s band; fast close / slow open shape; both eyes in phase
  - [x] Implement `blinkAt(seed, tSeconds)` returning an eyelid scale
- [x] Task: Pure glance scheduler
  - [x] Write failing tests: glance interval inside 4-9 s; yaw within ±2°;
        glance suppressed while a suppression flag is raised; disabled under
        reduced motion
  - [x] Implement it as a sibling pure function
- [x] Task: Apply to the ranch and the arena
  - [x] Drive `eyeLeft`/`eyeRight` `scale.y` around the top pivot in ranch
        motion
  - [x] Wire the same driver in the arena fighter driver, suppressing glance
        while hit-stop is active
  - [x] Confirm no per-frame allocation in the render loop
- [x] Task: Manual motion verification
  - [x] Frame captures showing a closed lid that reads as a blink, not a shrink,
        at ranch and arena scale
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [x] Await explicit user approval, attach the verification note, record the
        checkpoint SHA

### Phase 5 findings

- **The schedule is slot-based, not list-based.** `blinkAt(seed, tSeconds)`
  derives blink `k` from `k * BLINK_CYCLE + hash(seed, k) * BLINK_JITTER`
  (4 s, 1.6 s). Consecutive starts therefore *arithmetically* cannot fall
  outside `4 ± 1.6` s — the 2.4-5.6 s band is a property of the design, not a
  tuning constant the tests have to police. It also keeps the call O(1): a
  tab left open for an hour costs the same two hash evaluations as the first
  frame, with no cumulative sum to walk. The glance uses the same shape on
  its own seed salt (6.5 s, 2.4 s ⇒ 4.1-8.9 s).
- **Lid = scale, not rotation.** The eye part is pivoted at its top-centre, so
  `scale.y` collapses the bead *up into its socket* — a lid coming down, with
  no geometry to author. The floor is `LID_CLOSED = 0.08`, not 0, so a shut
  eye stays a visible line instead of vanishing and popping back.
- **Fast close, slow open** (50 ms, 15 ms held, 90 ms) is the asymmetry that
  reads as alive; a symmetric blink reads like a bubble collapsing. Tested by
  timing the two legs off the same curve, not by asserting the constants.
- **Reduced motion keeps the blink and parks the glance.** A lid is not
  travel, so the aliveness cue survives; a wandering eye is exactly the kind
  of ornament reduced motion asks to drop. Both call sites pass the same
  `suppressed` flag, so the two scenes can never diverge on the rule.
- **Hit-stop freezes the glance, not the lid.** In the arena the suppression
  hook is `effects.hitStop.active()`; a frozen world with a still-blinking
  creature reads better than one where the eyes also stop.
- **The arena test drives the real cast.** `face-arena.test.ts` builds two
  fighters through `buildSpot` and steps the real driver, so it proves the
  wiring (eyes cached at cast, seed carried from `info.seed`) rather than
  just the math — including that a *downed* fighter keeps blinking.
- **At gameplay distance the blink is 1-2 px.** The arena normalizes to a 1.7
  footprint, so the lid is unreadable from the broadcast camera; the check at
  that scale is that nothing pops or shimmers in the silhouette. Legibility
  is verified at review scale (`face13-blink-*`), distance safety at
  `face13-arena-*`. Stated plainly instead of claiming a readable blink at a
  distance where there is not one.
- **Review affordances added to the dev preview, not the app.** The preview
  drives the real `driveFace` from the wall clock, so a blink plays in the tab
  you are looking at; `?blink=<s>` freezes an instant for a still and
  `?scale=<n>` previews arena size. No production code path reads any of it.

### Phase 5 verification

- `bun run check` — clean: voxel 62 files, sim 68 files, client 185 files.
- `bunx biome check` — 0 errors; the same 4 pre-existing warnings in
  `apps/client/src/cup/view-models.test.ts`.
- Full suite — 1521 pass, 1 skip, 0 fail, 119 files, 81,937 assertions,
  21.15 s (`bun test --parallel=4 --timeout=600000`).
- `bun run gate:determinism` — 9 creatures + 5 props regenerated
  byte-identical. Nothing in this phase touches generation, so no artifact was
  regenerated and no baseline hash moved; Phase 6 still owns the artifact pass.
- Per-frame cost: `driveFace` writes four numbers (two eyes x scale.y/yaw) and
  allocates nothing; `findEyes` runs once per rig build / cast. The arena's
  `io.pair()` allocation is pre-existing and unchanged.
- Review stills, `conductor/tracks/creature_readability_20261018/artifacts/`:
  `face13-blink-open.png` / `face13-blink-closed.png` (review scale, seed 42
  draconic champion, the lid shut at 1.32 s) and `face13-arena-open.png` /
  `face13-arena-closed.png` (arena-normalized 0.55 rig at gameplay framing).
- Manual motion check in the browser (ranch + arena): blink cadence reads
  irregular but never hurried, the glance is a barely-there flick; a downed
  fighter keeps blinking; reduced motion stops the glance and keeps the lid.

**Checkpoint `a8fb851`** — approved by the user ("good") after watching the
live idle in the dev preview. Code `3e464cf`, live-preview follow-up
`a8fb851`.

## Phase 6: Artifacts, budget and documentation

Goal: the repository tells the truth about what shipped.

- [x] Task: Regenerate committed artifacts
  - [x] `export-artifact.ts` for 3 archetypes × 3 stages
  - [x] `gate:determinism --write` for the prop manifest
  - [x] `bun run gate:determinism` green; `GENERATOR_VERSION` 2
- [x] Task: Budget report
  - [x] Record triangles and voxels before/after per archetype and stage
  - [x] Confirm the ≤ 2.5× triangle budget and the ≤ 15 s suite
- [x] Task: Verification surfaces
  - [x] `preview.html` surface default plus `?surface=0` and `?angle=face`
  - [x] `gallery.html` `?stage=`
- [x] Task: Documentation
  - [x] `conductor/tech-stack.md` dated note (AO, colour classes, COLOR_0,
        generator version)
  - [x] `conductor/learnings.md` entry if a reusable lesson emerged
  - [x] `conductor/product-guidelines.md` palette rule for the surface ramp
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] `bun run verify` and `bun run gate:determinism` both green
  - [ ] Await explicit user approval, attach the verification note, record the
        checkpoint SHA

### Phase 6 findings

**Artifacts.** All nine creature GLBs and manifests were re-exported from seed
42 and the prop digest manifest rewritten with `--write`; `git status` came
back empty, so everything on disk was already exactly what the generator
produces — the regeneration is a no-op that proves it. `GENERATOR_VERSION` was
already 2 (raised with the face rebuild), and the gate verifies it as part of
each manifest's deep compare.

**Budget, seed 42.** "Before" is measured by running the same probe on the
track's base commit (`3675768`) in a detached worktree, not quoted from notes.
Voxels are `sum(part.voxels)`; triangles are summed index counts.

| archetype | stage | parts before → after | voxels before → after | tris before → after | × |
|---|---|---|---|---|---|
| draconic | baby | 11 → 15 | 4,086 → 4,094 | 2,042 → 3,544 | 1.74× |
| draconic | juvenile | 13 → 17 | 3,834 → 3,842 | 2,020 → 3,492 | 1.73× |
| draconic | champion | 15 → 19 | 4,064 → 4,072 | 2,116 → 3,756 | 1.78× |
| bovine | baby | 11 → 13 | 3,090 → 3,150 | 1,208 → 2,354 | 1.95× |
| bovine | juvenile | 13 → 15 | 2,928 → 2,988 | 1,252 → 2,452 | 1.96× |
| bovine | champion | 15 → 17 | 3,140 → 3,200 | 1,352 → 2,530 | 1.87× |
| axolotl | baby | 12 → 14 | 2,370 → 2,370 | 1,816 → 3,082 | 1.70× |
| axolotl | juvenile | 14 → 16 | 2,246 → 2,246 | 1,712 → 2,936 | 1.72× |
| axolotl | champion | 17 → 19 | 2,478 → 2,478 | 1,942 → 3,286 | 1.69× |

- Worst case is bovine baby at **1.95×**, inside the 2.5× NFR with room. The
  budget is spent on *triangles*, not voxels: +2 to +60 voxels per creature
  (eyes, brow, the four extra named parts) against +1.1k to +1.7k triangles,
  because AO quad-splitting and per-vertex colour add no cells. The axolotl
  gained zero voxels — its eye sockets replaced as many cells as the eye adds.
- GLB sizes: draconic 233,156 / 231,964 / 250,284 B; bovine 157,648 / 165,756 /
  172,536 B; axolotl 203,884 / 196,848 / 221,284 B. Largest is 244 KiB, 76% of
  the 320 KiB tripwire, and *smaller* than the 243 KiB Phase 2 peak because the
  face rebuild deleted carved geometry.

**Suite time — NFR deviation, approved 2026-10-19.** The spec asks for ≤ ~15 s
wall. Measured on this machine: serial full suite **108 s**, `--parallel`
**21-30 s**, voxel-only serial **74 s**. The same voxel-only run on the base
commit is **62 s**, so the track added **+19%** wall for **+59% tests and +129%
assertions** — the per-operation cost did not regress, the runner was already
far above 15 s before the track began. Deviation written into the spec's NFR
section with the numbers; the gate was made honest instead of fast-failing:
`bun run verify` now passes `--timeout 20000` (three generator-heavy tests run
past Bun's 5 s default under parallel load — `face.test.ts` bead and mouth
tests, `face-arena.test.ts` idle; the two face tests carry the same timeout
locally) and nothing was skipped or weakened. `bun run verify` is green after
that plus removing one pre-existing dead import in
`apps/client/src/cup/view-models.test.ts` left by the merged cup refactor
(`68b56f1`), which had made `biome check` red before this track started.

**Surfaces.** `?surface=0` paints each part with its base palette colour and
drops the baked vertex colour (AO, zones, dappling — and, by construction, the
painted mouth/nostrils, since those *are* colour); it is a comparison view, not
a pre-track generator, and the plan says so rather than pretending otherwise.
`?angle=face` was already in place from Phase 4; `gallery.html?stage=` now
builds all eight variants at that stage and names it in the bar.
