# Phase R1 Evidence — Review Fixes (Roster Wave 1)

- **Track:** 20261118-roster-wave-1
- **Phase:** R1 — Review Fixes
- **Date:** 2026-11-18
- **Branch:** feat/20261118-roster-wave-1
- **Phase base:** 03c8973a
- **Head:** a1b2bbf2
- **Result:** verified (primary independently re-ran the exact full gate green)

## Summary

Resolved review finding F1 (Low, strict mode requires fix): the stale 15-species
matchup doc block in `packages/sim/scripts/battle-telemetry.ts` now matches the
18-species implementation. Documentation-only; no code, assertions, sample
size, bounds, gates, or other files changed.

## Change

File: `packages/sim/scripts/battle-telemetry.ts` (matchup doc block, ~lines 254-268)

1. Inline example comment: `// gcd(11, 15) = 1` → `// gcd(11, 18) = 1`.
2. Distinctness paragraph: `i % 15` → `i % 18`, `floor(i / 15)` → `floor(i / 18)`,
   `below 225` → `below 42`, `mod 15` → `mod 18`.
3. Coverage paragraph: added one sentence noting the mirror-hop guard starts at
   `hop = 9` so every species still appears away at least twice after mirrors
   are skipped; kept `(gcd(5, 15) = 5)` but qualified it as the old 15-species
   walk.

Commit: `a1b2bbf2 docs(sim): correct telemetry matchup doc block for 18-species roster`

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Phase gate | `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz` | n/a | Permission denied (`permission.rejected: shell`); could not be run by this subagent. Primary agent to run and hand back output. |

Expected on primary re-run: exit 0; verify 4302 pass / 1 skip / 0 fail, Biome 974
clean, determinism OK for 54 pairs, balance 18/18, build 423 modules, fuzz 118
pass / 0 fail.

## Findings resolved

| ID | Severity | Criterion | Evidence | Status |
| --- | --- | --- | --- | --- |
| F1 | Low | Matchup doc block matches 18-species implementation | `git diff` confined to doc block; commit `a1b2bbf2`; full gate green | fixed |

## Deviations

None.

## Notes

- The code change is complete and verified by inspection (`git diff` touches only
  the doc comment; no code/assertion/gate changes).
- The subagent's shell denied the exact verification command; the primary ran it
  independently and it exited 0.

## Primary verification

| Check | Command | Result |
| --- | --- | --- |
| Scope | `git status --porcelain`, `git diff --name-only 03c8973a..HEAD`, `git diff --check` | only untracked evidence; only `packages/sim/scripts/battle-telemetry.ts` changed; whitespace clean |
| Static/unit/determinism | `bun run verify` | exit 0 — 4302 pass / 1 skip / 0 fail, 585613 `expect()` calls, 4303 tests / 401 files; Biome 974 files clean; determinism gate OK for 54 pairs |
| Build | `bun run build` | exit 0 — Vite 423 modules |
| Balance | `bun run balance` | exit 0 — 18/18, unchanged gates |
| Fuzz | `bun run test:fuzz` | exit 0 — 118 pass / 0 fail, 128931 `expect()` calls |
| Commit | `git log --oneline --max-count=3 03c8973a..HEAD` | `a1b2bbf2 docs(sim): correct telemetry matchup doc block for 18-species roster` |

Output: `C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\sh_r1_gate.txt`. The expected non-gating `smoke: RESULT fail ... not an http(s) URL: file:///tmp/x` diagnostic remains unchanged.

F1 is resolved: the doc block now states `gcd(11, 18)`, 18-species modulo/lap formulas, `below 42`, and the mirror-hop start of 9; all behavior is unchanged.
