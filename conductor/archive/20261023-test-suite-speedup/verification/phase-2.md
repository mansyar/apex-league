# Phase 2 Verification — The Voxel Smoke Slices

- **Track:** 20261023-test-suite-speedup · **Phase:** 2 of 3
- **Date:** 2026-10-23
- **Branch:** `chore/20261023-test-suite-speedup`
- **Base:** `8352fa611009a21194d1a5b112308d3bf07a9399`
- **Head:** `604c454` (`test(voxel): smoke-slice the fuzz suites behind APEX_FUZZ_SWEEP=full`)
- **Scope:** P2.T1, P2.T2, P2.T3 (slice edits), P2.T4 (measure/document)
- **Result:** verified (the two blocked measurement legs were completed by the
  primary; the AC-2 target was revised 35 s → 70 s with user approval — see
  the Spec Revision section).

## Task status

| Task | Status | Notes |
|---|---|---|
| P2.T1 — slice the 24 boundary fuzz suites | done | Every boundary file: `FULL_CHUNK` named const + `CHUNK` gate slice (`FULL_CHUNK.slice(0, 3)`), selected by `process.env.APEX_FUZZ_SWEEP === "full"`. Header states the split. Assertion loop bodies byte-identical apart from the seed-list constant; violation assertion and 120000 ms timeout untouched. No file deleted or merged (still 24). |
| P2.T2 — slice the 12 budget fuzz suites | done | Literal `for (let seed = lo; seed < hi; seed++)` loops converted to the same named-full-list shape: `FULL_SEEDS` const + `SEEDS` gate slice (`FULL_SEEDS.slice(0, 1)`), `for (const seed of SEEDS)`. Budget assertion (`320 * 1024` tripwire) untouched. Still 12 files. |
| P2.T3 — slice the 5 determinism fuzz suites | done | `[3, 42, 99]` → `FULL_SEEDS` + 1-seed gate slice (seed 3). The twice-build property is unchanged — both `pipeline(seed)` calls run on every selected seed, and the byte-identical GLB + hash assertions are untouched. Still 5 files. |
| P2.T4.1 — measure the gate leg | blocked (sandbox) | `bun test --check --parallel=4 --timeout 120000 packages/voxel` is denied by the shell permission policy (see Blockers). Partial indirect evidence below. |
| P2.T4.2 — spot-check the full sweep | blocked (sandbox) | env-prefixed runner denied; see Blockers. |
| P2.T4.3 — document the slices | done | Table below. |

## Commands table

| Command | Exit | Wall-clock | Summary |
|---|---|---|---|
| `bun test packages/voxel` (brief's iteration leg) | denied by permission system, not executed | — | `Permission denied: shell`, first attempt, not retried (Phase 1 hit the same policy for every bare `bun test` / `bun run test:phase` invocation). |
| `bun test --check --parallel=4 --timeout 120000 packages/voxel` (brief's gate leg) | denied by permission system, not executed | — | Same policy; first attempt, not retried. Expected result: green sliced voxel suite with wall-clock vs the ≤ 35 s target. |
| `bun run check` | 0 | ~1.6 s total | voxel 90 / sim 147 / client 352 files, no type errors — typechecks all 41 edited files. |
| `bun run verify` (route for the final lint/determinism leg, per the brief) | 0 | 55.91 s for the test leg (bun's own report) | `bun run check` (0 errors) && `bun test --check --parallel --timeout 120000` → **2452 pass / 1 skip / 0 fail, 126,720 expect() calls, 194 files, 55.91 s** && `biome check` → 570 files, no fixes && `bun run gate:determinism` → 18 creature GLBs + 5 prop digests byte-identical. |
| `$env:APEX_FUZZ_SWEEP = "full"; bun test packages/voxel/src/fuzz/boundary.axolotl.00-09.test.ts` | denied by permission system, not executed | — | First attempt (the brief's env-prefixed form is POSIX; this is its pwsh equivalent). Same policy; not retried, not worked around. |

### Indirect gate-leg evidence (partial substitute for P2.T4.1)

The denied voxel-only leg could not be timed directly, but the whole-suite leg
inside `bun run verify` is a before/after measurement on the same machine,
same runner shape (`--check --parallel`, uncapped):

| Measurement | Value |
|---|---|
| Whole suite before slicing (Phase 1 evidence, uncapped parallel) | 92 s |
| Whole suite after slicing (this phase, uncapped parallel, bun's own timer) | **55.91 s** |
| expect() calls before | 126,812 |
| expect() calls after (gate mode) | 126,720 |

The 36 s whole-suite drop is the voxel fuzz smoke slices taking effect: the
suite's only change in this range is the 41 fuzz files. The 92 removed
expect() calls match the trimmed gate seeds (24 boundary files × ~7 seeds ×
1 loop-level expect... the boundary violation `expect` is per-test; the drop
arises from the budget files' per-seed `expect(view...)`/`triCount` pairs and
determinism files' per-seed pairs — direction and magnitude consistent with
3-of-10 / 1-of-4 / 1-of-3 slicing). The dedicated ≤ 35 s voxel-only number
must be captured by the primary (same procedure as Phase 1's T1.2).

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| FR-3 | Fixed, documented first-quarter smoke slice by default; full list under `APEX_FUZZ_SWEEP=full` | Per-file `FULL_*` consts + `slice(0, ceil(n/4))` gate slices; every touched file's header states the split (tables below). `bun run verify` green in gate mode. | ✅ (sweep spot-check itself blocked — see Blockers) |
| NFR-1 | No test semantics change; slicing trims gate seed counts only | All 41 files still present and running (194 files / 2453 tests total unchanged from baseline); assertions, timeouts, loop bodies untouched; full lists preserved as named consts. | ✅ |
| NFR-4 | Slices deterministic and documented: same seeds every gate run | Slices are pure constants (`slice(0, N)` of a literal list), no clock/randomness; rule stated in each header. | ✅ |
| AC-2 | Voxel gate leg ≤ 70 s (revised); sweep demonstrably restores the full list | Primary measurements below (69 s capped-4; sweep restored 10/3 and 3×2 seed lists). | ✅ met (revised target) |

## Per-file slice table (P2.T4.3)

Full list = named `FULL_CHUNK` / `FULL_SEEDS` const in the file; gate seeds = its first quarter (`ceil(n/4)`).

| Files | Full seeds | Gate seeds |
|---|---|---|
| `boundary.<archetype>.00-09.test.ts` × 6 | 0–9 (10) | 0, 1, 2 |
| `boundary.<archetype>.10-19.test.ts` × 6 | 10–19 (10) | 10, 11, 12 |
| `boundary.<archetype>.20-29.test.ts` × 6 | 20–29 (10) | 20, 21, 22 |
| `boundary.<archetype>.30-39.test.ts` × 6 | 30–39 (10) | 30, 31, 32 |
| `budget.<archetype>.00-03.test.ts` × 6 | 0–3 (4) | 0 |
| `budget.<archetype>.04-07.test.ts` × 6 | 4–7 (4) | 4 |
| `determinism.<archetype>.test.ts` × 5 | 3, 42, 99 (3) | 3 |

Archetypes: axolotl, bovine, drake, falcon, storm_hound, tortoise (determinism has no drake file — 5 files as at base). Gate-mode voxel seed coverage: 24×3 + 12×1 + 5×1 = **89 seeds** (full sweep: 240 + 48 + 15 = 303 seeds). `dna.test.ts` untouched.

## Sweep spot-check (P2.T4.2)

Not executable in this sandbox — the env-prefixed runner command was denied
(Blocker 2). Static confirmation instead: with `APEX_FUZZ_SWEEP=full` the
ternary selects the full `FULL_*` const verbatim (no transformation), so the
sweep restores exactly the original seed list per file; with the flag unset
the same slice is selected on every run (deterministic).

## Deviations and notes

### Spec revision (user-approved, 2026-10-23)

The originally-speculated ≤ 35 s voxel-alone target turned out to be
unreachable by any seed count: after slicing, voxel-alone measured
69 s (capped-4), 64 s (uncapped parallel), 117 s (serial) — its cost is
dominated by per-file import overhead across 65 files, not by fuzz loops.
With the user's approval the spec target was revised **35 s → 70 s** in three
places (Goal bullet 2, AC-2 row, Open Questions assumption), each annotated
with the measurement basis. The whole-suite targets were met outright:
`bun run test:phase` = **73 s** (≤ 150 s) and the verify test leg = **56 s**
(≤ 120 s). FR-3/AC-2's "35" appears nowhere in code or prompts beyond the
spec rows themselves.

### Primary measurements (completing the two blocked legs)

| Leg | Command | Wall-clock | Result |
|---|---|---|---|
| Voxel gate leg, capped-4 (P2.T4.1) | `bun test --check --parallel=4 --timeout 120000 packages/voxel` | **69 s** (295 tests / 54,274 expect / 65 files, 0 fail) | ≤ 70 s ✅ |
| Voxel, uncapped parallel | `bun test --check --parallel --timeout 120000 packages/voxel` | 64 s | context |
| Voxel, serial | `bun test --timeout 120000 packages/voxel` | 117 s | context |
| Whole suite, capped-4 (P1 script) | `bun run test:phase` | **73 s** (2,453 / 126,720 expect / 194 files, 0 fail) | ≤ 150 s ✅ |
| Sweep spot-check (P2.T4.2) | `$env:APEX_FUZZ_SWEEP = "full"; bun test <boundary.axolotl.00-09> <determinism.falcon>` | 10.3 s | full lists restored (10 seeds; 3 seeds ×2 builds); 2 tests / 7 expect, exit 0; env var removed and verified unset afterwards |

### Notes carried forward

- **Deviations:** none outside Touches — `git status` before commit showed
  exactly the 41 fuzz files modified; the commit is 41 files, +239/−57.
- **Blockers:**
  1. `bun test --check --parallel=4 --timeout 120000 packages/voxel` (and the
     brief's iteration form `bun test packages/voxel`) → `Permission denied:
     shell` on first attempt, not retried. Expected result: green sliced voxel
     suite; wall-clock vs the ≤ 35 s AC-2 target. The primary should run it
     directly (Phase 1 precedent: primary ran `bun run test:phase` when the
     subagent's identical attempt was denied).
  2. `$env:APEX_FUZZ_SWEEP = "full"; bun test
     packages/voxel/src/fuzz/boundary.axolotl.00-09.test.ts` → `Permission
     denied: shell` on first attempt, not retried. Expected result: the suite
     runs 10 seeds instead of 3 (full-list restoration demo for AC-2).
- `bun run verify` was executed once (limit 2); fully green on the first run,
  so the second run was not needed.
- Test titles still name the files' full seed ranges (e.g. "seeds 0-9"); the
  loop bodies and titles are unchanged per the brief's byte-identical-body
  constraint — the header comments carry the gate/sweep split.
- Pre-existing oddity observed, not touched: `determinism.storm_hound.test.ts`
  and both `budget.storm_hound.*.test.ts` files carry a stray control
  character in their original header line where sibling files have
  backticks; edits anchored around it, bytes preserved.
- No files were created under `.conductor/evidence/`; nothing to clean up.
