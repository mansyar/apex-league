# Review: Creature Readability — per-vertex AO, colour classes, shared face kit

- **Track:** `creature_readability_20261018`
- **Type:** `feature`
- **Branch:** `track/creature_readability_20261018`
- **Range:** `3675768..05ec046`
- **Date:** `2026-10-20`
- **Verdict:** `PASS WITH FINDINGS`

## Summary

The track delivers what the spec promised: colour classes travel from the voxel
grid through the greedy mesher to a `COLOR_0` accessor and a single
per-creature material, AO is baked as a per-vertex term with a 0.72 floor and a
darker-diagonal quad split, surface zones and salted dappling are pure and
deterministic, and the face is a shared kit whose eyes are separate riggable
parts with a seeded blink and an eye-only glance. No Critical or High finding.

The three fixable findings are documentation accuracy, not defects: an
undeclared devDependency against a stated NFR, one stale signature in the
spec's "as shipped" note, and a missing Phase 1 checkpoint SHA. One Low finding
(mesher scratch allocation) is accepted and left as debt.

Reviewer note: the configured subagent could not launch (host model seat
unavailable), so this review was performed directly against the diff with the
same read-only rules. Volume strategy: **large** (48 files, +3,190/−169), so the
diff was read per phase checkpoint and then checked cross-phase for the shared
mesher/GLB/client chain.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| typecheck | `bun run check` | pass | voxel 62 files, sim 68, client 185 — no type errors |
| test | `bun test --check --parallel --timeout 20000` | pass | 1,521 pass, 1 skip, 0 fail; 119 files; 81,937 expects; ~21–30 s wall |
| lint | `bunx biome check` | pass | 0 errors, 3 warnings — all pre-existing `noNonNullAssertion` in `apps/client/src/cup/view-models.test.ts` (predates base `3675768`) |
| format | included in the biome command | pass | no fixes applied |
| build | `bun run build` | pass | client build exits 0; one pre-existing chunk-size warning |
| determinism | `bun run gate:determinism` | pass | 9 creature GLBs and 5 prop digests regenerate byte-identical |
| full gate | `bun run verify` | pass | check → tests → biome → determinism, green end to end |

Coverage is not configured in this repository; no coverage command was run or
inferred, and none is required by `workflow.md`.

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR1 | P1 — `voxelize` carries `classify` → class per voxel | `voxel-classes.test.ts` (per-voxel class, default 0, claims only) | covered |
| FR2 | P1 — merge keyed on (part, class); `classes` per vertex | `voxel-classes.test.ts`, `mesh-baseline.test.ts` (class-less byte-identical) | covered |
| FR3 | P2 — `ao.ts` + mesher corner signatures, merge gate, diagonal flip | `mesher-ao.test.ts` (7 cases), `props-ao.test.ts` | covered |
| FR4 | P1/P2 — `COLOR_0` VEC3 in `glb.ts`; client `vertexColors`, one material | `glb.test.ts`, `apps/client/src/creature.test.ts`, visual stills | covered |
| FR5 | P3 — `surface.ts` zones, ramp, salted two-octave dappling | `surface.test.ts` (ramp, classifier, wired archetypes, noise) | covered |
| FR6 | P4 — `face.ts` plan/builder, sockets, painted mouth/nostrils, eye parts | `face.test.ts` (bead shape, socket seating, mouth/nostril cells) | covered |
| FR7 | P5 — `apps/client/src/face-motion.ts`, ranch + arena drivers | `face-motion.test.ts` (17), `face-arena.test.ts` (3) | covered |
| FR8 | P4/P6 — `?surface=0`, `?angle=face`, gallery `?stage=` | manual browser checks; committed stills | partial — manual by design (dev surfaces) |
| FR9 | P6 — artifacts re-exported, `GENERATOR_VERSION` 2, gate rewritten | `bun run gate:determinism` | covered |
| NFR: types/lint/tests | all phases | verification table above | covered |
| NFR: suite time | — | deviation recorded in `spec.md`, approved 2026-10-19 | partial — see F4 |
| NFR: ≤2.5× triangles | P6 budget table | worst case 1.95× (bovine baby), measured per archetype/stage | covered |
| NFR: no new dependencies | — | `playwright` devDependency added in `d97ff84` | **missing** — see F1 |
| NFR: draw calls | P1 — one material per creature | `creature.ts:71–77` | covered |
| NFR: determinism | P1–P5 | fuzz determinism tests + gate | covered |
| AC1 | P4 | stills + manual visual review; bead + mouth legible at all stages | covered (manual) |
| AC2 | P3 | `surface.test.ts` "belly reads lighter than dorsal" per archetype | covered |
| AC3 | P2 | `mesher-ao.test.ts` wall/crease cases; stills | covered |
| AC4 | P1 | `mesh-baseline.test.ts` | covered |
| AC5 | P2 | `mesher-ao.test.ts` "every AO factor is in (0,1]", determinism case | covered |
| AC6 | P5 | `face-motion.test.ts` lid curve; `face13-blink-*` stills | covered (manual for "reads as a blink") |
| AC7 | P6 | gate + manifest | covered |
| AC8 | P3 | `surface.test.ts` lateral step reproduces the previous flat colour; existing element-hue tests untouched | covered |
| AC9 | P2 | `props-ao.test.ts` | covered |
| AC10 | P6 | verification table | covered |

## Findings

### Critical

- none

### High

- none

### Medium

- **F1 — a devDependency was added against an NFR that forbids new
  dependencies**
  - **File:** `packages/voxel/package.json:11` (used by
    `packages/voxel/scripts/preview-shot.ts:1`)
  - **What:** `d97ff84` added `playwright: ^1.64.1` as a devDependency of
    `packages/voxel` so the screenshot script can drive a browser. The spec's NFR
    says "No new dependencies. `packages/voxel` stays pure TypeScript with no
    DOM." The dependency is dev-only and does not reach `src/` or the client
    bundle — `packages/voxel/src` still imports nothing external — but the
    deviation was never recorded.
  - **Why:** an unrecorded deviation makes the spec read as a promise the
    repository breaks; a future contributor running `bun install` in CI also
    pulls a browser driver without warning.
  - **Fix:** record the deviation in the NFR block (dev-only tooling dependency,
    no runtime import, `src/` remains dependency-free, `bun install` footprint
    applies to contributors only), and name the script that needs it.
  - **Requirement:** NFR "No new dependencies".
  - **Test gap:** none — no test can meaningfully assert this; the record is the
    control.

### Low

- **F2 — the spec's "as shipped" note documents a signature that no longer
  exists**
  - **File:** `conductor/tracks/creature_readability_20261018/spec.md:178`
  - **What:** the note says `driveFace(eyes, seed, seconds, { suppressed })`;
    `05ec046` changed the fourth parameter to a boolean to remove the per-frame
    options literal.
  - **Why:** the spec is the reference a future maintainer reads before touching
    the driver; a stale call shape sends them down a type error.
  - **Fix:** update the sentence to `driveFace(eyes, seed, seconds, suppressed)`.
  - **Requirement:** FR7 (as shipped).
  - **Test gap:** none.

- **F3 — Phase 1 has no recorded checkpoint SHA**
  - **File:** `conductor/tracks/creature_readability_20261018/plan.md:37–42`
  - **What:** phases 2–6 each end with an explicit `Checkpoint <sha>` line;
    Phase 1 ends with the ticked protocol task and no SHA. The phase's last
    functional commit is `1636b05`.
  - **Why:** the plan is the track's provenance chain; a missing link means a
    reviewer cannot verify the phase's evidence without reconstructing history.
  - **Fix:** add `- Checkpoint: 1636b05.`
  - **Requirement:** plan compliance (workflow.md Phase Verification protocol).
  - **Test gap:** none.

- **F4 — the approved suite-time deviation does not reconcile `workflow.md`'s
  stricter target**
  - **File:** `conductor/tracks/creature_readability_20261018/spec.md:205–219`
  - **What:** the deviation records the spec's ~15 s figure, but
    `conductor/workflow.md:165` states "Target suite time: < 10 seconds". A
    reader who starts from the workflow sees an unmet target with no pointer to
    the approved deviation.
  - **Why:** the track's honest record should not depend on which document the
    reader opens first.
  - **Fix:** add one clause naming the workflow's 10 s target and stating that
    both figures are unmet on this machine for the reasons recorded.
  - **Requirement:** NFR (suite time).
  - **Test gap:** none.

### Accepted / deferred

- **F5 — the mesher's AO signature allocates per face**
  - **File:** `packages/voxel/src/mesher.ts:83–97`
  - **What:** `faceSignature` allocates a `Triple` scratch array and two closures
    per call (once per cell per face direction).
  - **Why:** it is generation-time only, and the measured cost is inside the
    budget (nine artifacts regenerate in seconds; the suite NFR deviation is not
    caused by this). Rewriting it would touch the hottest correctness path in a
    verified, approved track for no measurable gain.
  - **Fix (if ever needed):** hoist a module-level scratch triple and inline the
    corner arithmetic.
  - **Requirement:** performance (generator).
  - **Disposition:** accepted with reason; left as debt. Not filed as an issue.

## Overrides

- none

## Plan compliance

Every phase has a task list, a findings block, printed verification, a git note
on its checkpoint commit, and a checkpoint line — except Phase 1's missing SHA
(F3). No phase task was dropped; the two deviations from plan are both recorded:
artifact regeneration turned out to be a no-op (Phase 6), and the suite-time NFR
was re-baselined with explicit user approval (Phase 6, plus F4's gap).

All six phases' code stayed inside their declared `Touches` except for the two
surfaces this review covers: `gallery.ts`/`creature.ts` gained the `?stage=` and
`?surface=0` comparison affordances (FR8), and `face-arena.test.ts` plus two
`face.test.ts` cases gained explicit timeouts (recorded in the deviation).

This review applies F1–F4 as documentation commits rather than appending a
`Phase R1`: all four are corrections to the spec/plan record, none changes code
or behavior, and appending an implementation phase to an already-completed,
user-approved track would misrepresent the track's shape. F5 is deferred.

## Out of scope

- Body-plan anatomy (round-cone limbs, claws, horn taper, terraced capsule
  joins) — separate anatomy track, per the spec.
- Stage body-plan differentiation and broadcast framing/lighting — separate
  tracks.
- Rarity marking patterns beyond the gilded override — the class system makes
  this cheap, but it is not built here.

## Debt

- F5 (accepted): mesher per-face scratch allocation; no issue filed, recorded
  here with the reason.

## Doc sync

`pending` — will flip to `updated` after the post-review documentation sync.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 4 | 4 (F1–F4 in `3f00b3b`; F5 accepted) |

Re-review of the fix delta: F1–F4 verified present by reading the changed
paragraphs; the diff is documentation only, so the verification table above
still holds (it was re-run green on `05ec046`, and no code changed after it).
