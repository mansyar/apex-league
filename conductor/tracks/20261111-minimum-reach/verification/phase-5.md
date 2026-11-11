# Phase 5 — The wedge tells the truth

- **Track:** `20261111-minimum-reach` (Minimum Reach)
- **Phase:** 5 of 5 — "The wedge tells the truth" (FR-9, AC-8, NFR-1, NFR-4)
- **Date:** 2026-11-12
- **Branch:** `feat/20261111-minimum-reach`
- **Phase base:** `0fbe33c3`
- **Code head:** `670817f3` (task commits `12eece55`, `670817f3`; this file follows)
- **Result:** **VERIFIED** — the tell wedge's inner dead-zone edge is derived from the
  committed row's authored `minReachMm`, the wedge geometry cuts the hole as an annulus
  sector, and the dense replay stream and its hash are untouched. `bun run verify` exit 0
  (4146 pass, 1 skip, 0 fail) and `bun run build` exit 0.

## What changed, per file

| File | Change |
|---|---|
| `apps/client/src/tell-scale.ts` | New `TELL_BODY` (0.05, the visible body both edges keep), `StartupRow.minReachMm`, `minReachForStartupMs`, `minReachForMoveIdx`, and `tellInnerWorld(minReachMm, radiusMm, outerWorld)`. `startupRows` now keeps the winning `FrameData` row so the bucket's dead zone comes from the same row as its reach; `startupRowFor` is the single nearest-startup lookup both `reachFor*` helpers share. `tellOuterWorld` keeps its value (the `0.05` literal became `TELL_BODY`). |
| `apps/client/src/tell-wedge.ts` | `TellSide` tracks `inner` and `minReachMm`; `wedgeGeometry(outer, halfAngle, inner)` builds the annulus sector from the authored edge; the estimator records the exact row's dead zone (move index) or the bucket's (phaseT estimate); geometry rebuilds only when `outer`, `inner` or `halfAngle` changes; `reset` clears the dead zone. |
| `apps/client/src/dense-playback.ts` | Comment only: the telegraph's note now names the inner dead-zone edge and records that it reads authored data and never feeds the sim. No behaviour change. |
| `apps/client/src/tell-scale.test.ts` | Pins the new reads and the inner-edge contract (see AC-8 below). |
| `apps/client/src/dense-playback.test.ts` | `wedgeOf` also returns the drawn `innerRadius`; two tests assert the drawn edge equals `tellInnerWorld` for the 90 mm lance and the 0 mm basic; a new describe proves the same seed yields the same dense stream/hash and that playing the trace back leaves it byte-identical. |

## The inner edge (P5.T1, FR-9, AC-8)

`tellInnerWorld(minReachMm, radiusMm, outerWorld)`:

- converts `minReachMm + radiusMm` with the same `MM_TO_WORLD` (0.0008) as
  `tellOuterWorld`, i.e. the same radius convention as the outer edge;
- floors at `TELL_INNER` (0.3 world) — the body's own ground;
- caps at `outerWorld - TELL_BODY` — one visible body inside the outer edge.

The outer radius is passed in because the cap is expressed against the outer edge the
wedge is actually drawing; the brief sketched two parameters, and the third is what makes
"never meets or exceeds the outer radius" expressible without duplicating the outer
formula. `tellOuterWorld` is unchanged in value.

### AC-8 proof

| Assertion | Test | Result |
|---|---|---|
| inner radius equals `tellInnerWorld(minReachMm, radiusMm)` for the authored value | `tell-scale.test.ts` "the shipped 90 mm dead zone also sits under the body's ground" — `tellInnerWorld(90, 220, tellOuterWorld(6500, 220))` is `TELL_INNER` (0.248 mm→world is below 0.3) | pass |
| the conversion is the authored value plus the attacker's radius | `tell-scale.test.ts` "the authored dead zone plus the attacker's radius, converted" — `tellInnerWorld(1200, 220, tellOuterWorld(3000, 220))` ≈ `(1200 + 220) * 0.0008` | pass |
| inner < outer for every row in `FRAME_DATA` (including the 0 rows) | `tell-scale.test.ts` "stays strictly inside the outer edge for every authored row" — loops all rows with the 220 mm reference radius | pass |
| the drawn geometry uses that edge | `dense-playback.test.ts` "the drawn dead-zone edge is the authored row's (FR-9, AC-8)" — the lance's `RingGeometry.parameters.innerRadius` equals `tellInnerWorld(90, 220, outer)` and is `< outer` | pass |
| a dead zone wider than the show floor keeps a body | `tell-scale.test.ts` "a dead zone wider than the show floor keeps a visible body" — `tellInnerWorld(6400, 220, 4.0)` ≈ `outer - 0.05` | pass |

`TELL_BODY` is the same epsilon the outer edge always kept, so both edges hold the same
minimum body and the wedge can never be erased from either side.

## The `0`-row equivalence

`tellInnerWorld(0, 220, outer)` is `max(0.3, 0.176)` capped at `outer - 0.05`, i.e.
exactly `TELL_INNER`, the radius every wedge was drawn from before this phase. Two tests
pin it:

- `tell-scale.test.ts` "a row that authors 0 draws exactly the sector it drew before" —
  `tellInnerWorld(0, 220, tellOuterWorld(420, 220))` is `TELL_INNER`;
- `dense-playback.test.ts` "a row that authors 0 keeps the un-holed sector" — the basic
  startup's drawn `innerRadius` is `TELL_INNER`, and equals `tellInnerWorld(0, 220, outer)`.

The shipped 90 mm rows are equally unchanged on screen: `90 + 220 mm` converts to 0.248
world, still inside the body's own 0.3 ground, so the hole stays closed. That is the
truthful reading of a 90 mm blind spot — it lives inside the drawn body — and the
derivation is data-driven, so a larger authored value would open the hole.

## The replay is untouched (P5.T2, NFR-1, NFR-4)

- No `packages/sim` edit, no stream word, no new event, no protocol change. The client
  already imports `FRAME_DATA`, so `minReachMm` needed no transport.
- `dense-playback.test.ts`, describe "the replay is untouched (NFR-1, NFR-4)":
  1. "the same seed still produces the same dense stream and hash" — two
     `resolveContinuous` builds from seed 4242 produce identical `steps`, identical
     `Int16Array` data, identical FNV-1a hash over that data, and identical event lists.
  2. "playing the fight back leaves the trace byte-identical" — driving every step of a
     resolved fight through `createDenseStage().apply` (the wedge path) leaves the
     stream's hash unchanged.
- The tell is presentation only: it reads `FRAME_DATA` and the stream, and writes only
  meshes/materials. Nothing it computes is fed back into the simulation.

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| static + unit + lint + determinism | `bun run verify` | 0 | **4146 pass, 1 skip, 0 fail**, 491,052 `expect()` calls, 4147 tests across 373 files, 73.67 s; four package typechecks clean; biome 933 files clean; determinism gate 46 GLBs + 5 props byte-identical; trace seed 20261111 ko 39,680 ms, hash `0xff6f3d62`, 5 invariants ok |
| build | `bun run build` | 0 | vite 8.3.4, 418 modules, `dist/assets/index-Bz3BGS8F.js` 1,067.43 kB / gzip 293.54 kB, built in 310 ms; only the pre-existing >500 kB chunk warning |

Test count reconciliation: Phase 4 verified 4134 passing tests; this phase adds 12
(1 `minReachForStartupMs`, 2 `minReachForMoveIdx`, 5 `tellInnerWorld`, 2 drawn-geometry,
2 replay), so 4146.

## Deviations

| File | Reason |
|---|---|
| `apps/client/src/dense-playback.test.ts` | Outside Touches. P5.T2 requires a playback test proving the same seed yields the same dense stream and hash, and P5.T1's strongest AC-8 proof is the drawn `RingGeometry` radius; both live naturally in the existing playback suite, which already owns `createDenseStage`, `wedgeOf` and the stream fixtures. Additions are tests only (73 lines). |

No production file outside Touches was touched. No bound, floor, tolerance or golden was
edited.

## Notes for the primary

1. **The wedge is an annulus sector now, and it already was one.** The geometry was
   `RingGeometry(TELL_INNER, outer, …)`; the change is that the inner radius is the
   authored edge instead of the constant. One shape, one rebuild condition, no new
   per-frame allocation.
2. **At the shipped 90 mm the screen does not change.** The dead zone converts inside the
   body's own ground, so the hole closes and the tell keeps the sector it had. The
   derivation is what FR-9 asks for; the visible change would come with a larger authored
   value.
3. **The ring pulse still sweeps from `TELL_INNER`.** The brief only asks for the wedge's
   inner edge; the ring is the growth cue, not the reach readout, and it is unchanged.
4. **`tellInnerWorld` takes the outer radius as its third parameter** so the "never meets
   the outer edge" clamp is expressed against the outer actually drawn. AC-8's equality
   holds because the wedge passes exactly that value.

## Primary verification

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | 4,146 pass, 1 skip, 0 fail — 4,147 tests across 373 files (73.12 s); four typechecks clean; biome 933 files; determinism gate 46 GLBs + 5 props byte-identical |
| `bun run build` | 0 | `@apex/client build: built in 301ms`, 418 modules, only the pre-existing >500 kB chunk warning |

Diff review (`git diff --name-only 0fbe33c3..HEAD`): the four Touches files,
`apps/client/src/dense-playback.test.ts` (the reported deviation, tests only),
and this evidence file. No `packages/sim` file changed, so the stream, the
`SIM_VERSION` contract and the replay hash are untouched by construction.

- `tell-scale.ts` keeps `startupRows` keyed by startup but now stores the whole
  row, so the dead zone comes from the same row as the reach instead of from a
  bucket neighbour; `reachForStartupMs` is value-identical (the bucket still
  picks the longest reach), and `tellOuterWorld` only swaps the literal `0.05`
  for the named `TELL_BODY`. `tellInnerWorld` floors at `TELL_INNER`, caps at
  `outer - TELL_BODY`, and takes the drawn outer as a parameter so AC-8's
  equality is against the real edge.
- `tell-wedge.ts` passes the inner radius into `RingGeometry` and rebuilds only
  when either edge or the arc changes; `minReachMm` is tracked and reset beside
  `reachMm` on hide.
- `dense-playback.ts` is a comment only.

AC-8 met: the wedge's inner radius is derived from the authored `minReachMm`,
and the tests pin the derivation, the inner-never-exceeds-outer clamp, and the
`0`-row sector.

**Finding for the review (not a blocker).** At the shipped 90 mm the drawn inner
edge still sits below `TELL_INNER` (310 mm x `MM_TO_WORLD` = 0.248 < 0.3), so the
screen looks exactly as it did and the hole only appears once an authored dead
zone clears roughly 155 mm. That is the honest consequence of the wedge already
carrying a body-sized inner radius; the derivation is right and the visible
change arrives with a larger authored value. Recorded as debt rather than fixed
here, because widening the hole past the body would paint ground the fighter
occupies.
