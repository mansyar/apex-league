## Summary

Two things the previous track left owed, in one change.

**The CI gate now always reports.** `conductor/**` sat in `paths-ignore`, so a conductor-only PR
created *no run at all* — the required check "Verify (types, tests, biome, voxel determinism)" never
existed, the PR waited at "Expected — waiting" forever, and the only way through was an admin bypass
this project forbids. That is why the last two tracks merged with `--admin`. The fix moves the saving
inside the job: the workflow always triggers, a cheap `scope` step diffs the branch against its base,
and the five heavy steps carry `if: steps.scope.outputs.code == 'true'`. The job name is unchanged, so
the ruleset needs no edit. The duplicate `push` trigger is gone (`nightly.yml` already covers `main`),
and `workflow_dispatch` keeps a full on-demand run.

**The fixture-versus-matrix question is answered.** The telemetry fixture read 47.6% cap share while
the 840-fight matrix read 26.7%, and the previous track recorded the attribution as unmeasured. The
harness now takes optional stat-basis and doctrine parameters with frozen defaults, the balance report
prints the cap share of the reference pass it was already running, and a new diagnostic script measures
the 2 × 2. The stat basis dominates (28.6 points at press doctrine on the fixture's pairings, 18.2 on
840 fights) against 7.1 for doctrine at reference stats — but they are not additive: 11.9 points of the
35.7-point gap is interaction, and the leftover between cell D and the matrix splits into ~6.0 points
of seed count and ~8.8 of pairing walk.

Nothing about the game moved: `SIM_VERSION` is still 3, the trace hash is still `0xb6cce858`, and both
gates reproduce their figures exactly.

## Track

- **ID:** `20261112-gate-cost-and-fixture-audit`
- **Type:** chore
- **Spec:** [spec.md](conductor/archive/20261112-gate-cost-and-fixture-audit/spec.md)
- **Plan:** [plan.md](conductor/archive/20261112-gate-cost-and-fixture-audit/plan.md)
- **Review:** [review.md](conductor/archive/20261112-gate-cost-and-fixture-audit/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1 | The gate that always reports | verified | `cb0a26f0` | trigger unfiltered, `scope` step, five gated steps, `push` removed, `workflow_dispatch` added, job name byte-identical |
| 2 | Parameterise the harness without moving it | verified | `9bc1dd72` | `statBasis`/`doctrine` with frozen defaults; reference-pass cap share printed as a diagnostic |
| 3 | The four cells and the verdict | verified | `d6de0094` | A 20/42, B 17/42, C 13/42, D 5/42; cell A asserted against the gate by import |
| R1 | Review fixes | verified | `97fe2469` | ten findings, including a reproduced fail-open in the scope step |

Two things worth reading in the evidence rather than the diff:

- **A real bug was caught in review and reproduced.** The first version of the scope step used
  `if printf … | grep -qv …`. With `set -o pipefail`, `grep -q` exits on the first match and `printf`
  dies of SIGPIPE, so the pipeline goes non-zero *even when a code path was found* — the step concludes
  "conductor-only" and skips every heavy step. Proven under Git bash: a code path first in a
  3,000-path list produced `code=false` before the fix and `code=true` after. A one-line code change
  followed by a large conductor diff would have gone green with nothing checked.
- **AC-4's live proof is structurally post-merge.** A `pull_request` workflow runs from the PR's merge
  commit, so any PR containing `ci.yml` is a code PR by construction and can only exercise the full
  path. The decision logic was proven locally for six diff shapes; the live conductor-only run is
  performed immediately after merge and appended to the archived evidence.

## Requirements

- [x] FR-1 — the `pull_request` trigger has no path filter, so every PR creates the required check (test: `scripts/deploy/workflow.test.ts`)
- [x] FR-2 — a conductor-only diff runs checkout and the scope step only, and the job reports success (test: `scripts/deploy/workflow.test.ts`)
- [x] FR-3 — any ambiguity runs the full gate; the workflow never skips on a guess (test: `scripts/deploy/workflow.test.ts`, plus the six-case shell proof in `review.md`)
- [x] FR-4 — the job's display name is unchanged character for character (test: `scripts/deploy/workflow.test.ts`)
- [x] FR-5 — `push` removed, `workflow_dispatch` added (test: `scripts/deploy/workflow.test.ts`)
- [x] FR-6 — `measureFight` takes optional stat-basis and doctrine parameters whose defaults reproduce the shipped readings (test: `telemetry.test.ts`)
- [x] FR-7 — the balance report prints a cap share for the reference-line block it already computes (test: `balance-report.test.ts`)
- [x] FR-8 — `fixture-audit.ts` runs the four cells over the same `matchups()` and seeds (test: `fixture-audit.test.ts`)
- [x] FR-9 — a test pins the four readings and asserts cell A equals the gate's cap count (test: `fixture-audit.test.ts`)
- [x] FR-10 — the verdict is recorded, with the residual named (evidence: `verification/phase-3.md`)
- [x] NFR-1 — the conductor-only check's wall time is ≤ 60 s and recorded (deferred: post-merge, see above)
- [x] NFR-2 — the full-gate path is unchanged in content
- [x] NFR-3 — no simulation change: trace hash `0xb6cce858`, `SIM_VERSION` 3, both gates reproduce
- [x] NFR-4 — the audit is diagnostic only: no new bound, gate or pass/fail criterion

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Unit | `bun test scripts/deploy/workflow.test.ts` | 20 pass / 0 fail | `verification/phase-1.md` |
| Unit | `bun test fixture-audit.test.ts` | 5 pass / 0 fail | `verification/phase-3.md` |
| Gate | `bun run telemetry` | 20/42 (47.6%), 14/14 bounds, dead zone 27 (2.9%) | `verification/phase-2.md` |
| Gate | `bun run balance` | 224/840 (26.7%), decisive 95.6%, median 31.21 s, 49/49 in band, + `reference line cap share: 377/840 (44.9%)` | `verification/phase-2.md` |
| Diagnostic | `bun run fixture-audit` | A 20/42, B 17/42, C 13/42, D 5/42 | `verification/phase-3.md` |
| Determinism | `bun run trace --seed 20261111 --check` | `0xb6cce858`, 5 invariants | `verification/integrated.md` |
| Static | `bun run verify` | exit 0 — 4,161 pass / 1 skip / 0 fail, 4,162 tests / 375 files, Biome 938 files, determinism byte-identical | `verification/integrated.md` |
| Build | `bun run build` | exit 0 — 418 modules, only the pre-existing >500 kB warning | `verification/integrated.md` |

## Review

- **Verdict:** PASS WITH FINDINGS
- **Rounds:** 1
- **Fixed:** 10 of 10 (six Medium, four Low) — see `review.md`
- **Accepted / deferred:** AC-4's live proof (structurally post-merge), `fetch-depth: 0` on code PRs,
  and the pre-existing stale "14-matchup" comment at `ci.yml:100`

## Deviations and risks

- `packages/sim/src/module-size.test.ts` was edited outside the phase's Touches in Phase 3: it
  enumerates `scripts/` deliberately, so adding `fixture-audit.ts` failed it. One array entry and a
  count in the comment.
- `packages/sim/scripts/battle-telemetry.ts` gained `export` on `midpointOf` so the duplicated midpoint
  arithmetic can be asserted against the report's `typicalLine` (review F6). The alternative — deleting
  the claim — would have left the one duplicated line unguarded.
- **Risk:** a code PR now pays for `fetch-depth: 0` on checkout. Measured against the cost it removes,
  it is small, but it is a real change to the full-gate path's duration (NFR-2 says "content", not
  "seconds").
- **Risk:** the workflow's skip logic is shell, and the only place it can be tested end to end is a live
  run. The three committed assertions in `scripts/deploy/workflow.test.ts` pin the shape, and the
  six-case shell proof pins the logic, but neither is the runner itself.

## Follow-ups

Issues are disabled on this repository, so these are recorded here and in `verification/integrated.md`:

1. **The live conductor-only proof** (AC-4) — run immediately after merge, appended to the archived
   `verification/phase-1.md`.
2. **The telemetry pairing walk is a biased subset** — the same 42 pairings over 168 fights still read
   17.9% against the matrix's 26.7% (z ≈ −2.6). Re-stratifying it is a gate redesign with its own
   before/after, not a patch.
3. **`ci.yml:100`** still says "The same 14-matchup sample"; the sample has been 42 fights since
   `20261112-capshare-pacing`.
4. **D-1 resized:** the honest cap-share figure is 26.7% at the basis the project measures the game on
   (bounds midpoints, FR-22), 44.9% for equal-investment reference bodies. **D-2** stays worth fixing
   but is second: doctrine is worth 7.1 points at reference stats and 19.0 at midpoints.

## Rollback

Squash merge, so revert the single commit:

```bash
git revert <squash-sha>
```

No migration, flag or data change is involved. Reverting restores the `paths-ignore` filter, which
brings back the admin-bypass requirement for conductor-only PRs — that is the intended state of a
rollback, not an oversight. The fixture-audit script and its test are additive and can stay.
