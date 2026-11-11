# Phase 1 — Authored minimum reach

- Track: `20261111-minimum-reach` — Minimum Reach
- Phase: 1 of 5 — Authored minimum reach
- Date: 2026-11-11
- Branch: `feat/20261111-minimum-reach`
- Base commit: `d6cc636c` (conductor: mark phase in progress)
- Head commit: `d3317387` (feat(sim): author a minimum reach on every frame row)
- Result: **verified**

## What changed

`packages/sim/src/battle/frames.ts`

- `FrameData.minReachMm` (`readonly number`) sits beside `reachMm`: the inner
  edge of the move's space in mm, `0` meaning "no dead zone".
- `frame()` takes it as a tenth argument defaulting to `0`, so rows without a
  dead zone keep their one-line form; the builder comment now documents all ten
  positional arguments.
- `validateFrameData` rejects `minReachMm < 0` ("Minimum reach cannot be
  negative") and `minReachMm >= reachMm` ("Minimum reach must stay inside the
  reach"), both naming the move, in the existing first-failure style.
- First pass (FR-1, AC-1): every row with `reachMm >= 5000` authored `1200`;
  every row below stays `0` (default); the innate `basic` row stays `0`. 42 of
  49 rows carry `1200`, 7 carry `0`.

`packages/sim/src/battle/frames.test.ts`

- New describe `frame data — minimum reach (FR-1)`:
  - the first-pass rule checked row by row (both groups asserted non-empty, so
    neither loop can pass vacuously),
  - the innate basic pinned to `0`,
  - no row violates `0 <= minReachMm < reachMm`.
- New validation cases: negative `minReachMm` rejected; `minReachMm` equal to
  and one above `reachMm` rejected; one below accepted.
- One pre-existing fixture updated: `rejects a reach shorter than the body
  radius` shrank `reachMm` to `BODY_RADIUS_MM` while the row still carried its
  authored `minReachMm`, which the new rule correctly rejected. The fixture now
  also sets `minReachMm: 0`, preserving the test's original intent (the reach
  floor), not weakening it.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit + lint + determinism | `bun run verify` | 0 | 4118 pass, 1 skip, 0 fail across 373 files (56.3 s); `bun run check` clean; `biome check` — 932 files, no fixes; determinism gate — 45 creature/prop GLBs byte-identical |
| build | `bun run build` | 0 | Vite production build, 417 modules, `dist/assets/index-OF_FMPug.js` 1,064.75 kB (292.73 kB gzip); only the pre-existing >500 kB chunk warning |

Notes on the run: the first `bun run verify` attempt failed one test — the
pre-existing reach-floor fixture described above — and was fixed once before
the green run. No other check changed state.

`bun run verify` also runs `packages/sim/src/module-size.test.ts`, so the
12,288 B cap on `frames.ts` is confirmed green; the two rows whose one-line
form crossed Biome's 80-column width (`boulder_toss`, `hurricane_spiral`) were
reflowed by hand to the formatter's own shape rather than by `--write`.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | `frames.test.ts` proves every row with `reachMm >= 5000` has `minReachMm = 1200`, every row below has `0`, and no row violates `0 <= minReach < reach` | `packages/sim/src/battle/frames.test.ts` — describe `frame data — minimum reach (FR-1)`, 3 tests; green inside `bun run verify` | met |
| FR-1 | `minReachMm` on `FrameData`, validator rejects `< 0` and `>= reachMm`, basic is `0` | `frames.ts` (`FrameData`, `frame()`, `validateFrameData`); `frames.test.ts` validation cases for both failure directions; green inside `bun run verify` | met |

The basic row's `0` is pinned by the test, not by the validator, as the brief
requires.

## Evidence paths

- `packages/sim/src/battle/frames.ts`
- `packages/sim/src/battle/frames.test.ts`
- Command output is summarised in the table above; the only non-green state was
  the first verify attempt (`1 fail`, the updated reach-floor fixture) before
  the fix, after which both required commands exited 0.

## Deviations

None. Both changed files are inside the phase's `Touches`.

## Notes for the primary

- `minReachMm` is authored data only in this phase: nothing reads it yet, so
  behaviour, hashes and the trace are unchanged (`SIM_VERSION` still 2). Phase 2
  owns the interval geometry and the version bump.
- The value is the single first-pass knob (`1200`). Phase 4's balance pass can
  move it in one place per row; no derivation from power, cooldown or reach.
- `FrameData` has no other construction site in the repo, so the field addition
  is contained; `getFrameData` consumers only read.
- P1.T1 and P1.T2 landed as one commit (`d3317387`) because both tasks edit the
  same two files and the value authoring is a one-token change per row; the
  field/validator and the authored values cannot be separated by file.

## Primary verification

Run by the primary agent after the subagent report, before acceptance.

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| static + unit + lint + determinism | `bun run verify` | 0 | 4,118 pass / 1 skip / 0 fail; `bun run check` clean; Biome 932 files clean; determinism gate 45 GLBs byte-identical; module-size cap green |
| build | `bun run build` | 0 | Vite exit 0, only the pre-existing >500 kB chunk warning |

Diff review: `git diff --name-only d6cc636c..HEAD` lists only the two `Touches`
files plus this evidence file. `frames.ts` gained the field, the tenth builder
argument, two validator rules and 42 authored `1200` values; no reach, startup,
active, recovery, poise or stamina value changed. `frames.test.ts` adds three
rule tests and two validator cases, and the one edited fixture sets
`minReachMm: 0` so its reach-floor assertion still tests the floor rather than
the new rule. AC-1 and FR-1 are met.

