# Phase 1 Verification — Document Persisted Creature Fields

- **Track:** `20261124-save-schema-creature-fields` — Save Schema Creature Fields
- **Phase:** 1 — Document persisted creature fields
- **Date:** 2026-11-24
- **Branch:** `chore/20261124-save-schema-creature-fields`
- **Phase base:** `917457c88731a19fa4d22ff6d8ad88636fbc0802`
- **Track base:** `dda6b8ad9832f3c1870151aafab0d982f036df25`
- **Head (verified documentation):** `cf80ec80eda3738e3f2edd31b3cf2598fdc0d243`
- **Result:** `failed`

## Result Summary

The two requested rows were added, and the documentation commit changes only
`docs/save-schema.md` (two insertions). `bun run verify`, `bun run build`, the
whitespace check, and the phase-base scope check all pass. The brief's exact
track-base scope command exits 1 because its range already contains pre-existing
Conductor bookkeeping commits made before Phase 1. Those files are outside this
phase's `Touches` and must not be edited by the phase executor, so the required
command cannot be made green within this phase's authority.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit + determinism | `bun run verify` | 0 | 4,462 tests pass, 1 skip, 0 fail across 437 files; 1,039 files checked with no fixes; voxel determinism gate passes. |
| static | `bun run build` | 0 | Vite production build succeeds (438 modules); existing non-fatal large-chunk warning remains. |
| diff hygiene | `git diff --check dda6b8ad9832f3c1870151aafab0d982f036df25..HEAD` | 0 | No whitespace errors. |
| track-base scope | `git diff --quiet dda6b8ad9832f3c1870151aafab0d982f036df25..HEAD -- . ':!docs/save-schema.md'` | 1 | No output. The range includes six pre-existing Conductor bookkeeping files from commits before the phase base. |
| working tree | `git status --porcelain` | 0 | Clean at documentation head `cf80ec80`, before this evidence file was written. |
| baseline diagnosis | `git diff --name-only dda6b8ad9832f3c1870151aafab0d982f036df25..917457c88731a19fa4d22ff6d8ad88636fbc0802` | 0 | Lists `conductor/roadmap.md`, `conductor/tracks.md`, and the track's `index.md`, `metadata.json`, `plan.md`, and `spec.md`. |
| phase-base scope | `git diff --quiet 917457c88731a19fa4d22ff6d8ad88636fbc0802..HEAD -- . ':!docs/save-schema.md'` | 0 | No non-documentation change in Phase 1. |
| phase changed paths | `git diff --name-only 917457c88731a19fa4d22ff6d8ad88636fbc0802..HEAD` | 0 | Only `docs/save-schema.md` at documentation head. |

## Acceptance Criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | `Creature.element` row has the correct type and persisted/validation semantics. | `docs/save-schema.md:44` lists all six `Element` values, says the primary element is persisted, initialized from the species at creation, and validated as one of the six known elements, and records type/affinity behavior. Agrees with `packages/sim/src/creature.ts:12,51,237` and `packages/sim/src/save/validators/creature.ts:19,83`. | pass |
| AC-2 | `Creature.bondedToday` row has boolean type and nightly-reset semantics. | `docs/save-schema.md:54` documents a persisted boolean set by a bonding action and reset to `false` by nightly settlement. Agrees with `packages/sim/src/creature.ts:114-115,253` and the strict boolean validation at `packages/sim/src/save/validators/creature.ts:82`. | pass |
| AC-3 | Final diff changes only `docs/save-schema.md`, and configured verification remains green. | The phase-base diff contains only `docs/save-schema.md`; verify and build pass. The exact track-base scope command fails on pre-existing Conductor bookkeeping, so configured verification as a whole is not green. This evidence file is the separately required operational artifact. | fail |

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

- The exact track-base scope command was also run before the documentation edit
  and already exited 1 at phase base `917457c8`. The cause is the range starting
  at `dda6b8ad`, which includes the track-initialization and phase-in-progress
  Conductor commits. Editing or reverting those protected state files is outside
  this phase's authority, so no in-scope fix exists.
- The documentation commit is
  `cf80ec80eda3738e3f2edd31b3cf2598fdc0d243`
  (`docs(save): document persisted creature fields`). The evidence commit is
  recorded in the structured phase report.
- No new regression test was added, per the owner's explicit decision.
