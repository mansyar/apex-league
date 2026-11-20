# Phase 2 Verification — Failing-first fixture audit repair

- Track: 20261120-telemetry-fixture-debt (Telemetry Fixture Debt Reconciliation)
- Phase: 2 — Failing-first fixture audit repair
- Date: 2026-11-20
- Branch: chore/20261120-telemetry-fixture-debt
- Phase base commit: 362d537b7110c535735e909f28e86b8f20cee8bc
- Commits: `f164aca9` (failing-first test + evidence), `659623eb` (audit repair),
  `752ea4aa` (phase evidence), plus the final evidence update commit
- Result: **verified — Phase 2 accepted** — all nine required verification
  commands are green on final tree `752ea4aa`. Seven were run by this subagent;
  four standalone commands (`fixture-audit`, `fixture-audit --json`,
  `gate:determinism`, `test:fuzz`) were initially rejected by the shell
  permission layer, were not retried or worked around, and were re-run by the
  primary with exit 0 each. See `## Primary verification` below.

## Goal and scope

Make `bun run fixture-audit` print the current 1,680-fight matrix arithmetic
without adding a gate, changing the telemetry fixture, or touching any game code.
Only the two files in the phase Touches were changed:

- `packages/sim/scripts/fixture-audit.ts` — `RECORDED` and current-tense comments
- `packages/sim/src/battle/continuous/fixture-audit.test.ts` — pure regression pin

## Failing-first proof (P2.T1)

The new test builds four synthetic `CellReading` values (no fixture measurement,
no game state) and pins the two-line same-doctrine claim produced by `report()`
plus the derived `attribution().recordedStatPoints`. It also rejects the stale
figures as current claims.

Before the repair, `bun test packages/sim/src/battle/continuous/fixture-audit.test.ts --timeout 120000`
exited **1** with 5 pass / 1 fail / 34 expect() calls:

```
Expected to contain: "same-doctrine check at 1680 fights"
Received: "same-doctrine check at 840 fights (press on both sides, `bun run balance`):\n  reference 377/840 44.9%  ->  midpoint 224/840 26.7%  =  +18.2 points"
```

Evidence: `.conductor/evidence/20261120-telemetry-fixture-debt/failing-first-fixture-audit.txt`.

This is failing-first evidence for a diagnostic, not a CI gate: no bound, target,
`ok`/`FAIL` line, or pass/fail criterion was introduced, and `run()` still returns
0 unconditionally (NFR-2).

## Before / after report output

| Source | same-doctrine line |
| --- | --- |
| Before (unchanged tree, failing-first run) | `same-doctrine check at 840 fights (press on both sides, \`bun run balance\`):` / `  reference 377/840 44.9%  ->  midpoint 224/840 26.7%  =  +18.2 points` |
| After (focused test, repaired tree) | `same-doctrine check at 1680 fights (press on both sides, \`bun run balance\`):` / `  reference 580/1680 34.5%  ->  midpoint 370/1680 22.0%  =  +12.5 points` |

The cell table is unchanged by the repair: A `11/42 (26.2%)`, B `8/42 (19.0%)`,
C `7/42 (16.7%)`, D `5/42 (11.9%)`. The derived value is
`(580 - 370) / 1680 * 100 = 12.5`, so the report prints `+12.5 points`.

## Exact repair

- `RECORDED = { fights: 1680, referencePress: 580, midpointPress: 370 } as const`
- Header docstring gap reframed from `47.6%-vs-26.7%` (historical) to the current
  `26.2%-vs-22.0%`, and the matrix from 840 to 1,680 fights.
- Cell A current-tense docstring: `20/42` → `11/42`.
- `RECORDED` docstring source lines now quote `580/1680 (34.5%)` and
  `370/1680 (22.0%)` from live `bun run balance`; the old `377/840`, `224/840`,
  `+18.2 points` figures survive only as an explicitly labelled 2026-11-12
  historical note.
- `Attribution.recordedStatPoints` docstring: `34.5 - 22.0 at 1,680 fights`.

A source grep for `840|377|224|18.2|20/42|47.6|44.9|26.7` in `fixture-audit.ts`
returns only the two lines of the explicitly historical note. No current-tense
stale claim remains (AC-4).

## Commands table

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| focused test | `bun test packages/sim/src/battle/continuous/fixture-audit.test.ts --timeout 120000` (before) | 1 | 5 pass / 1 fail — failing-first proof |
| focused test | same command (after) | 0 | 6 pass, 0 fail, 42 expect(), 6 tests across 1 file |
| audit | `bun run fixture-audit` | 0 | denied to subagent; primary re-run: A 11/42, B 8/42, C 7/42, D 5/42; live line at 1680 fights / 580/1680 / 370/1680 / +12.5 points |
| audit | `bun run fixture-audit --json` | 0 | denied to subagent; primary re-run: capCount 11/8/7/5, `attribution.recordedStatPoints` 12.5 |
| telemetry | `bun run telemetry` | 0 | `cap share: 11/42 (26.2%)`; 14/14 bounds ok; re-pool at 14/30/42 |
| verify | `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail, 670479 expect(), 1033 files Biome-clean, sim hash `0xff6f3d62`, determinism gate OK |
| build | `bun run build` | 0 | Vite 438 modules, built in 454 ms; chunk-size warning only |
| balance | `bun run balance` | 0 | 1680 fights (ko 1306, time 370, draw 4); `370/1680 (22.0%)`; reference `580/1680 (34.5%)`; 34/34 gates ok |
| gate | `bun run gate:determinism` | 0 | denied to subagent; primary re-run: all species/stages byte-identical, props digests match (also green inside `bun run verify`) |
| fuzz | `bun run test:fuzz` | 0 | denied to subagent; primary re-run: 139 pass / 0 fail / 129015 expect() across 135 files |

All commands were run separately, with no `&&` chains, pipes, wrapper binaries,
or Code Mode routing. The four denied commands were not retried by this subagent;
the primary re-ran them on final tree `752ea4aa`.

## Acceptance-criteria table

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-4 / AC-4 | Audit prints `1680`, `580`, `370`, `+12.5 points` | focused test output after repair; `report()` source | pass |
| FR-4 / AC-4 | No current-tense `840/377/224` or `20/42` | source grep (only labelled historical note) | pass |
| FR-5 / AC-5 | Regression test fails before, passes after, no gate added | failing-first evidence + 6/6 focused pass; `run()` returns 0 unconditionally | pass |
| NFR-1 | No fixture/bound/fence/controller/species/`SIM_VERSION`/ghost change | scope proof (below) | pass |
| NFR-2 | Audit remains diagnostic | static read: no bound/target/CI step; `run()` returns 0 | pass |
| NFR-3 | No dependency/manifest/API/server change | `git diff --stat` shows only the two Touches files outside Conductor bookkeeping | pass |
| NFR-4 | Google TS style, no module-cap allowlist, caps enforced | `bun run verify` Biome-clean and `bun run check` passed | pass |
| NFR-6 / AC-8 | Configured checks green, hash `0xff6f3d62` | all nine commands green (seven subagent, four primary re-runs); hash unchanged | pass |

## Scope proof

```
git diff d5baa0abcd9b827e94d72ed31831c9a237a5ccf3..HEAD -- \
  packages/sim/scripts/battle-telemetry.ts \
  packages/sim/src/battle/continuous/telemetry.test.ts \
  packages/sim/src/battle/continuous/controller-*.ts \
  packages/sim/src/cup/ghost.ts
```

Output: empty. No telemetry fixture, bound, controller, ghost, gate or fence
file changed (NFR-1, AC-6). `git diff --stat d5baa0ab..HEAD` lists only Conductor
bookkeeping plus the two code files in this phase's Touches. The primary also
confirmed `git diff --quiet d5baa0ab..HEAD -- <telemetry/controller/ghost paths>`
exits 0 and that the diff from the phase base is only `fixture-audit.ts` (26
lines) and `fixture-audit.test.ts` (+69), matching Touches exactly.

## Module caps

`bun run verify` runs `bun run check` (every workspace check), the full suite and
`biome check`; it exited 0 with no module-cap error and no allowlist added. The
repair changes prose and four literal numbers in a script plus one test file; no
new module or dependency was introduced. Caps: 12,288 B client/sim, 24,576 B
voxel — unchanged and satisfied.

## Deviations

None. All source/test edits are inside the phase Touches; the only other writes
are this evidence file and the artifact under `.conductor/evidence/20261120-telemetry-fixture-debt/`.

## Notes

- `bun run verify` initially exited 1 because Biome wanted the new synthetic
  `CellReading` literals expanded and the `findIndex` callback wrapped. The
  formatter's exact output was applied once and the re-run exited 0. No check was
  weakened to pass, and no bound or gate was touched.
- The sim hash remains `0xff6f3d62` and balance remains 34/34 green at
  `370/1680 (22.0%)`; the audit repair is presentational only.
- `.conductor/evidence/**` is git-ignored, so the failing-first artifact is an
  untracked local artifact, as in Phase 1. The tracked commits are `f164aca9`,
  `659623eb`, `752ea4aa`, and this evidence update.
- The four initially denied standalone commands were re-run successfully by the
  primary on final tree `752ea4aa`; results are recorded below. No blockers
  remain and no source, plan, metadata, registry or product doc was changed.

## Primary verification

Final tree: `752ea4aa` (clean). Primary output directory:
`C:\Users\Ansyar\AppData\Local\Temp\opencode\d3d4-p2-primary\`.

All nine required commands, each exit 0:

| # | Command | Exit | Result |
| --- | --- | --- | --- |
| 1 | `bun test packages/sim/src/battle/continuous/fixture-audit.test.ts --timeout 120000` | 0 | 6 pass / 0 fail; before repair it was 5 pass / 1 fail (failing-first proof) |
| 2 | `bun run fixture-audit` (primary re-run) | 0 | cells A 11/42 (26.2%), B 8/42 (19.0%), C 7/42 (16.7%), D 5/42 (11.9%); live line `same-doctrine check at 1680 fights (press on both sides, \`bun run balance\`):` / `  reference 580/1680 34.5%  ->  midpoint 370/1680 22.0%  =  +12.5 points` |
| 3 | `bun run fixture-audit --json` (primary re-run) | 0 | cells capCount 11/8/7/5; `attribution.recordedStatPoints` 12.5 |
| 4 | `bun run telemetry` | 0 | `cap share: 11/42 (26.2%)`; 14/14 bounds ok; re-pool at 14/30/42 |
| 5 | `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail, 670479 expect(), 1033 files Biome-clean, sim hash `0xff6f3d62`, determinism gate OK |
| 6 | `bun run build` | 0 | Vite 438 modules, built in 454 ms; chunk-size warning only |
| 7 | `bun run balance` | 0 | 1680 fights (ko 1306, time 370, draw 4); `370/1680 (22.0%)`; reference `580/1680 (34.5%)`; 34/34 gates ok |
| 8 | `bun run gate:determinism` (primary re-run) | 0 | all species/stages byte-identical; props digests match |
| 9 | `bun run test:fuzz` (primary re-run) | 0 | 139 pass / 0 fail / 129015 expect() calls / 139 tests across 135 files [66.01s] |

The primary also confirmed HEAD `752ea4aa`, a clean working tree, and that the
game-contract scope proof is empty. The four earlier permission rejections are
therefore resolved, not outstanding.

**Verdict: Phase 2 accepted.** The audit prints the current matrix arithmetic
(1680 / 580 / 370 / +12.5 points), the stale figures survive only as an
explicitly historical note, cells A-D remain 11/42 / 8/42 / 7/42 / 5/42, the
audit remains diagnostic, and no file outside the phase Touches was changed.

## Primary verification (final evidence tree, HEAD `9d9890cf`)

The primary independently re-ran all nine Phase 2 commands on the final evidence tree; each exited 0.

| Command | Exit | Primary result |
| --- | --- | --- |
| `bun test packages/sim/src/battle/continuous/fixture-audit.test.ts --timeout 120000` | 0 | 6 pass / 0 fail |
| `bun run fixture-audit` | 0 | cells A-D `11/42`, `8/42`, `7/42`, `5/42`; `same-doctrine check at 1680 fights` / `reference 580/1680 34.5% -> midpoint 370/1680 22.0% = +12.5 points` |
| `bun run fixture-audit --json` | 0 | `recordedStatPoints: 12.5` |
| `bun run telemetry` | 0 | `11/42 (26.2%)`, bounds green |
| `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail, 670479 `expect()` calls, hash `0xff6f3d62`; expected non-gating smoke diagnostic only |
| `bun run build` | 0 | Vite build, chunk-size warning only |
| `bun run balance` | 0 | 1680 fights, capShare `370/1680 (22.0%)`, 34/34 gates |
| `bun run gate:determinism` | 0 | byte-identical regeneration |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail |

Output dir: `C:\Users\Ansyar\AppData\Local\Temp\opencode\d3d4-p2-final\`. Working tree clean; game-contract scope proof exits 0. **Verdict: Phase 2 accepted on final evidence tree.**
