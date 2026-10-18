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

## Phase 3: Surface zones and dappling

Goal: read as living hide — anatomical zones plus seeded dappling, with the
element hue contract intact.

- [ ] Task: Ramp builder
  - [ ] Write failing tests: steps are monotonic in lightness; shadows shift
        toward cool; the base hue stays inside the element contract
  - [ ] Implement `creaturePalette(dna, stage)` with 3–5 steps per archetype
- [ ] Task: Zone classifier
  - [ ] Write failing tests: belly is lighter than dorsal on every archetype;
        socks appear only on leg parts; classification is deterministic
  - [ ] Implement `surfaceClass(part, x, y, z, dna, stage)`
- [ ] Task: Dappling noise
  - [ ] Write failing tests: same seed → same class map; two-octave low
        frequency; class ratio stays in a sane band (no single-class flood)
  - [ ] Implement with a salted stream and prove the existing palette draw is
        unchanged for every seed
- [ ] Task: Wire classes into the three archetype builds
  - [ ] Draco, bovine, axolotl declare palettes and assign classes during field
        construction
  - [ ] Keep `gilded` behaviour byte-identical
- [ ] Task: Manual vision sweep
  - [ ] `gallery.html?stage=` 8-seed sweep per archetype, judged at arena
        distance
  - [ ] Commit before/after PNGs to the track folder
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Browser evidence: three tone zones plus dappling visible at gameplay
        distance on all three archetypes
  - [ ] Await explicit user approval, attach the verification note, record the
        checkpoint SHA

## Phase 4: Face kit

Goal: every creature has a readable face at broadcast distance, in every stage.

- [ ] Task: SDF primitives
  - [ ] Write failing tests for `sdRoundCone` (tapered radius), `sdEllipsoid`
        and `smoothSubtract` (subtraction carves, preserves the outer surface)
  - [ ] Implement them alongside the existing primitives
- [ ] Task: `face.ts` plans and eyes
  - [ ] Write failing tests: each archetype emits `eyeLeft`/`eyeRight`; pivots
        sit at the top-centre of each eye; face parts fall inside the head
        bounds
  - [ ] Implement `FacePlan` per archetype and the eye/pupil/catchlight parts
  - [ ] Pupil and catchlight carry their own colour classes
- [ ] Task: Mouth, nostrils, brow
  - [ ] Write failing tests: mouth and nostrils are one-voxel recesses with a
        dark class; brow is present only where the plan declares it
  - [ ] Implement per the spec table
- [ ] Task: Stage-aware eye proportions
  - [ ] Write failing tests: baby eye scale > champion eye scale; pivots stay
        attached to the head across stages
  - [ ] Apply the per-stage scalars
- [ ] Task: Wire into the builds
  - [ ] Parent eyes under `head` in `build.parents`; extend `colors`
  - [ ] Keep the face inside each archetype's proportion budget untouched
- [ ] Task: Manual face review
  - [ ] Close-up captures for 3 archetypes × 3 stages via `?angle=face`
  - [ ] Verify at baby scale first (smallest head)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Browser evidence: eyes, pupil, catchlight, mouth and nostrils read at
        gameplay distance
  - [ ] Await explicit user approval, attach the verification note, record the
        checkpoint SHA

## Phase 5: Blink and micro-glance

Goal: the face is alive, deterministically, without touching sim state.

- [ ] Task: Pure blink scheduler
  - [ ] Write failing tests: deterministic for a seed; interval inside the
        2.4–5.6 s band; fast close / slow open shape; both eyes in phase
  - [ ] Implement `blinkAt(seed, tSeconds)` returning an eyelid scale
- [ ] Task: Pure glance scheduler
  - [ ] Write failing tests: glance interval inside 4–9 s; yaw within ±2°;
        glance suppressed while a suppression flag is raised; disabled under
        reduced motion
  - [ ] Implement it as a sibling pure function
- [ ] Task: Apply to the ranch and the arena
  - [ ] Drive `eyeLeft`/`eyeRight` `scale.y` around the top pivot in ranch
        motion
  - [ ] Wire the same driver in the arena fighter driver, suppressing glance
        while hit-stop is active
  - [ ] Confirm no per-frame allocation in the render loop
- [ ] Task: Manual motion verification
  - [ ] Frame captures showing a closed lid that reads as a blink, not a shrink,
        at ranch and arena scale
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Await explicit user approval, attach the verification note, record the
        checkpoint SHA

## Phase 6: Artifacts, budget and documentation

Goal: the repository tells the truth about what shipped.

- [ ] Task: Regenerate committed artifacts
  - [ ] `export-artifact.ts` for 3 archetypes × 3 stages
  - [ ] `gate:determinism --write` for the prop manifest
  - [ ] `bun run gate:determinism` green; `GENERATOR_VERSION` 2
- [ ] Task: Budget report
  - [ ] Record triangles and voxels before/after per archetype and stage
  - [ ] Confirm the ≤ 2.5× triangle budget and the ≤ 15 s suite
- [ ] Task: Verification surfaces
  - [ ] `preview.html` surface default plus `?surface=0` and `?angle=face`
  - [ ] `gallery.html` `?stage=`
- [ ] Task: Documentation
  - [ ] `conductor/tech-stack.md` dated note (AO, colour classes, COLOR_0,
        generator version)
  - [ ] `conductor/learnings.md` entry if a reusable lesson emerged
  - [ ] `conductor/product-guidelines.md` palette rule for the surface ramp
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] `bun run verify` and `bun run gate:determinism` both green
  - [ ] Await explicit user approval, attach the verification note, record the
        checkpoint SHA
