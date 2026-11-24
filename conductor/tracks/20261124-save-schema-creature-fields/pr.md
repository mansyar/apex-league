## Summary

Document the two persisted `Creature` fields that were missing from the save-schema contract: `element` and `bondedToday`. This is a documentation-only correction; no runtime, save-version, migration, dependency, configuration, or test behavior changes.

## Track

- **ID:** `20261124-save-schema-creature-fields`
- **Type:** chore
- **Spec:** [spec.md](conductor/archive/20261124-save-schema-creature-fields/spec.md)
- **Plan:** [plan.md](conductor/archive/20261124-save-schema-creature-fields/plan.md)
- **Review:** [review.md](conductor/archive/20261124-save-schema-creature-fields/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1 | Document persisted creature fields | verified | `95e7fa5b` | Added exactly two `Creature` rows; all configured checks passed. |

## Requirements

- [x] FR-1 — document persisted `element` and its six-value validation/type-affinity semantics.
- [x] FR-2 — document persisted `bondedToday` and nightly reset semantics.
- [x] FR-3 — preserve every other table row and runtime behavior.
- [x] NFR-1 — implementation diff limited to `docs/save-schema.md`.
- [x] NFR-2 — wording matches existing concise schema style and source/validator.
- [x] NFR-3 — no save-version, migration, dependency, configuration, source, or test changes.
- [x] AC-1 — correct `element` row.
- [x] AC-2 — correct `bondedToday` row.
- [x] AC-3 — docs-only implementation scope and green verification.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| static + unit + determinism | `bun run verify` | pass — 4,462 pass, 1 skip, 0 fail; hash `0xff6f3d62` | `verification/phase-1.md`, `verification/integrated.md` |
| typecheck | `bun run check` | pass | review evidence |
| lint/format | `bunx biome check` | pass — 1,039 files, no fixes | review evidence |
| unit | `bun test --check --parallel=4 --timeout 120000` | pass — 4,462 pass, 1 skip, 0 fail; 670,507 expects | `verification/integrated.md`, `review.md` |
| build | `bun run build` | pass | `verification/integrated.md` |
| scope | corrected `git diff --quiet ... -- . ':!docs/save-schema.md' ':!conductor/**'` | pass | `verification/phase-1.md` |
| diff hygiene | `git diff --check dda6b8ad..HEAD` | pass | `verification/integrated.md` |

## Review

- **Verdict:** PASS
- **Rounds:** 1
- **Fixed:** 0 findings
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- The initial plan scope command excluded only `docs/save-schema.md`, so required Conductor bookkeeping made it fail. The command was corrected in `deb0d211` to exclude `conductor/**`; the implementation scope remains strictly docs-only.
- The exact serial test command was attempted with 120 s and 300 s outer shell limits and both runs were externally terminated after the intentional smoke-test fixture printed. No actual test failure occurred; the full `bun run verify` suite and configured parallel phase suite both passed.
- No user-facing or runtime risk is introduced.

## Follow-ups

None.

## Rollback

After merge, revert the merge commit:

```bash
git revert --no-edit -m 1 <merge-commit>
```
