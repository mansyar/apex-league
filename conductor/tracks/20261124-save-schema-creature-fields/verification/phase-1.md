# Phase 1 Verification — Document Persisted Creature Fields

- **Track:** `20261124-save-schema-creature-fields` — Save Schema Creature Fields
- **Phase:** 1 — Document persisted creature fields
- **Date:** 2026-11-24
- **Branch:** `chore/20261124-save-schema-creature-fields`
- **Phase base:** `917457c88731a19fa4d22ff6d8ad88636fbc0802`
- **Track base:** `dda6b8ad9832f3c1870151aafab0d982f036df25`
- **Head (verified documentation):** `cf80ec80eda3738e3f2edd31b3cf2598fdc0d243`
- **Plan correction:** `deb0d211b2524e1a81736db65e0f8c256a7fe28b`
- **Result:** `verified`

## Result Summary

The two requested rows were added, and the documentation commit changes only
`docs/save-schema.md` (two insertions). `bun run verify`, `bun run build`, the
whitespace check, the phase-base scope check, and the corrected track-base scope
check all pass.

The original track-base scope command was a plan-contract error: it excluded only
`docs/save-schema.md`, so required Conductor bookkeeping made it exit 1. The
primary corrected `plan.md` in `deb0d211` to exclude `conductor/**` as well. The
corrected command passes, resolving the prior failure without changing any
protected state file.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit + determinism | `bun run verify` | 0 | 4,462 tests pass, 1 skip, 0 fail across 437 files; 1,039 files checked with no fixes; voxel determinism gate passes. |
| static | `bun run build` | 0 | Vite production build succeeds (438 modules); existing non-fatal large-chunk warning remains. |
| diff hygiene | `git diff --check dda6b8ad9832f3c1870151aafab0d982f036df25..HEAD` | 0 | No whitespace errors. |
| track-base scope | `git diff --quiet dda6b8ad9832f3c1870151aafab0d982f036df25..HEAD -- . ':!docs/save-schema.md' ':!conductor/**'` | 0 | No output. The corrected plan contract excludes required Conductor bookkeeping as well as the documentation file. |
| working tree | `git status --porcelain` | 0 | Clean at corrected-plan head `deb0d211`, before this evidence rework was written. |
| baseline diagnosis | `git diff --name-only dda6b8ad9832f3c1870151aafab0d982f036df25..917457c88731a19fa4d22ff6d8ad88636fbc0802` | 0 | Lists `conductor/roadmap.md`, `conductor/tracks.md`, and the track's `index.md`, `metadata.json`, `plan.md`, and `spec.md`. |
| phase-base scope | `git diff --quiet 917457c88731a19fa4d22ff6d8ad88636fbc0802..HEAD -- . ':!docs/save-schema.md'` | 0 | No non-documentation change in Phase 1. |
| phase changed paths | `git diff --name-only 917457c88731a19fa4d22ff6d8ad88636fbc0802..HEAD` | 0 | Only `docs/save-schema.md` at documentation head. |

## Acceptance Criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | `Creature.element` row has the correct type and persisted/validation semantics. | `docs/save-schema.md:44` lists all six `Element` values, says the primary element is persisted, initialized from the species at creation, and validated as one of the six known elements, and records type/affinity behavior. Agrees with `packages/sim/src/creature.ts:12,51,237` and `packages/sim/src/save/validators/creature.ts:19,83`. | pass |
| AC-2 | `Creature.bondedToday` row has boolean type and nightly-reset semantics. | `docs/save-schema.md:54` documents a persisted boolean set by a bonding action and reset to `false` by nightly settlement. Agrees with `packages/sim/src/creature.ts:114-115,253` and the strict boolean validation at `packages/sim/src/save/validators/creature.ts:82`. | pass |
| AC-3 | Final diff changes only `docs/save-schema.md`, and configured verification remains green. | The implementation diff changes only `docs/save-schema.md`; Conductor bookkeeping and this evidence file are the required operational artifacts. Verify, build, diff hygiene, phase-base scope, and the corrected track-base scope check all pass. | pass |

## Requirements and Scope Proof

- **FR-1:** met by the `element` row; no save-version or migration claim added.
- **FR-2:** met by the `bondedToday` row.
- **FR-3:** every pre-existing `Creature` table row is byte-for-byte unchanged; the
  documentation diff consists solely of the two added rows. Runtime source and
  tests are unchanged from the phase base.
- **NFR-1:** the implementation commit changes only `docs/save-schema.md`; the
  evidence file is committed separately as required by the brief.
- **NFR-2:** wording follows the table's concise technical style and matches the
  interface, creation seam, and validator.
- **NFR-3:** no save version, migration, dependency, configuration, source, or
  test change.

## Evidence Paths

- `docs/save-schema.md` — corrected `Creature` table, especially lines 44 and 54.
- `conductor/tracks/20261124-save-schema-creature-fields/verification/phase-1.md` — this report.
- `packages/sim/src/creature.ts` — authoritative persisted interface and creation defaults (read-only reference).
- `packages/sim/src/save/validators/creature.ts` — authoritative field validation (read-only reference).

## Deviations

None.

## Notes

- **Resolved original failure:** the original track-base scope command was also
  run before the documentation edit and exited 1 at phase base `917457c8`. Its
  pathspec excluded only `docs/save-schema.md`, so the range's required
  Conductor bookkeeping correctly appeared as out-of-scope differences.
- The primary corrected the plan contract in `deb0d211b2524e1a81736db65e0f8c256a7fe28b`
  by adding `':!conductor/**'`. The corrected command was run separately for
  this rework and exited 0; `git status --porcelain` also exited 0 with no output
  before this evidence update. The original failure is retained here as resolved
  history; no protected state file was edited by the phase executor.
- The documentation commit is
  `cf80ec80eda3738e3f2edd31b3cf2598fdc0d243`
  (`docs(save): document persisted creature fields`). The evidence commit is
  recorded in the structured phase report.
- No new regression test was added, per the owner's explicit decision.
