# Gate Cost and Fixture Audit

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not renumber it. If a requirement is removed, mark it `Withdrawn` instead of deleting it.

## Overview

Two chores with one root cause: a number we trust was measuring the harness, and a gate we need was measuring the wrong thing.

**Part A — the CI gate.** `.github/workflows/ci.yml` triggers on `pull_request` with `paths-ignore: ['conductor/**']`. A conductor-only PR therefore produces **no run at all**, so the required check "Verify (types, tests, biome, voxel determinism)" is never created and the PR can only merge by admin bypass — a bypass this project forbids. Removing the filter fixes the merge but makes every doc PR pay the full gate (~2m46s measured on PR #73). Every merge also re-runs the full gate a second time on `main` via the `push` trigger, on a tree identical to the one the PR already verified.

**Part B — the fixture audit.** The telemetry fixture reads **20/42 (47.6%)** cap share while the 840-fight balance matrix reads **224/840 (26.7%)** on the same tree. Two variables differ between them and neither has been isolated: the **stat basis** (the fixture builds both sides from `REFERENCE = { hp: 189, atk: 10, def: 10, spd: 10 }` clamped *up* into species bounds; the matrix fights each species at its bounds midpoint) and the **doctrine mix** (the fixture runs press-versus-kite by seed parity; the matrix runs press on both sides for all 840 fights). Track `20261112-capshare-pacing` recorded this as debt **D-4** after review finding F1, which correctly rejected an unmeasured attribution.

## Problem / Motivation

**Part A.** The two options on the table are both bad: pay ~3 minutes of CI per documentation PR, or keep merging conductor-only PRs with `--admin`. Neither is necessary. GitHub cannot scope a required check by path, but it can report a check that runs cheaply — a job that checks out, diffs the branch against its base, and skips the heavy steps when nothing outside `conductor/**` changed. That is ~15 s of one runner instead of ~170 s, and the check always exists, so the bypass disappears. Separately, the post-merge `push` run duplicates the PR run for no extra information; `nightly.yml` only covers determinism and fuzz, so removing `push` needs an on-demand replacement (`workflow_dispatch`) rather than a blind deletion.

**Part B.** D-2 — the kite doctrine's threat-band floor (1,472–1,600 mm) being unholdable at `spd 5` — is the largest suspected pacing defect in the repo, and whether it is worth a feature track depends entirely on which variable produces the fixture's cap share. If doctrine dominates, D-2 is the highest-value change available. If stat basis dominates, the fixture is simply not a sample of the matrix's fight population and D-2 is a side issue. Acting on either hunch without separating them is exactly the error review F1 caught.

## Goals & Success Metrics

- **Goal:** a conductor-only PR gets the required check green without admin bypass, at a small fraction of the full gate's cost.
  - **Metric:** the check reports green on a real conductor-only PR with measured wall time **≤ 60 s**, recorded in the evidence.
  - **Metric:** the job's display name is byte-identical to today's, so no branch-protection or ruleset edit is required.
  - **Metric:** a PR touching code still executes **every** step, proved by this track's own PR.
- **Goal:** know which variable produces the fixture-versus-matrix gap.
  - **Metric:** four cells recorded — one per (stat basis × doctrine) combination — over the same 42 pairings and seeds.
  - **Metric:** a written verdict naming which variable dominates, or stating that they are not separable and naming the residual.
- **Goal:** nothing about the game changes.
  - **Metric:** trace hash still `0xb6cce858`, `SIM_VERSION` still 3, `bun run telemetry` still 20/42, `bun run balance` still 26.7%, and no bound, floor, tolerance or species value in the diff.

## Scope

**In Scope**

- `ci.yml`: remove the `paths-ignore` filter from `pull_request`; remove the `push` trigger; add `workflow_dispatch`; add a scope step that diffs the branch against its base; gate every heavy step on that result; keep the job's display name character for character.
- **Fail-safe behaviour:** an unknown event, a failed diff, or an unresolvable base runs the **full** gate. The default is always "run".
- `measureFight` gains optional **stat-basis** (`"reference" | "midpoint"`) and **doctrine** (`"split" | "press"`) parameters whose defaults reproduce the shipped readings exactly.
- `battle-balance-report.ts` prints a cap share for the reference-line block it already computes.
- A new diagnostic script `packages/sim/scripts/fixture-audit.ts` that runs the four cells over `matchups()` and prints them.
- A test pinning the four cell readings and asserting that cell 1 equals the telemetry gate's own cap count.
- Evidence recording the four cells and the verdict.
- A **throwaway conductor-only PR**, opened, observed, and closed unmerged, as the live proof.

**Out of Scope**

- Any change to a bound, floor, tolerance, `DISTINCT_FLOOR`, species stat value, frame-data row, damage band, or `SIM_VERSION`.
- **Acting** on the verdict — changing the fixture's doctrine mix, retuning D-2, or starting a pacing fix. That is a follow-up track, chosen after the numbers exist.
- Adding the audit to CI as a new gate.
- Changing the 840-fight matrix's population, seeds or doctrines.
- Touching `deploy.yml`, `nightly.yml`, or `server-image.yml`.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The `pull_request` trigger has no path filter, so every PR targeting `main` creates the required check. | Must |
| FR-2 | A conductor-only diff runs checkout and the scope step only; setup, cache, install, `verify` and `telemetry` are skipped and the job reports **success**. | Must |
| FR-3 | Any ambiguity — unknown event, failed diff, unresolvable base — runs the full gate. The workflow never skips on a guess. | Must |
| FR-4 | The job's display name stays `Verify (types, tests, biome, voxel determinism)`, character for character. | Must |
| FR-5 | The `push` trigger is removed and `workflow_dispatch` added, so a full run on `main` remains available on demand. | Must |
| FR-6 | `measureFight` accepts optional stat-basis and doctrine parameters; its **defaults** reproduce the shipped 42-fight readings byte for byte. | Must |
| FR-7 | `battle-balance-report.ts` prints a cap share for the reference-line block it already computes. | Must |
| FR-8 | `fixture-audit.ts` runs the four cells over the same `matchups()` and seeds, and prints them as a table. | Must |
| FR-9 | A test pins the four cell readings and asserts that cell 1 equals the telemetry gate's cap count. | Must |
| FR-10 | The verdict is recorded in the evidence: which variable dominates, or that they are not separable, with the residual named. | Must |

## Non-Functional Requirements

| ID |
| --- |
| NFR-1 — The conductor-only check's wall time is **≤ 60 s** excluding queue time, and recorded. |
| NFR-2 — The full-gate path is unchanged in content and duration; a code PR runs exactly the steps it runs today. |
| NFR-3 — No simulation behaviour change: trace hash `0xb6cce858`, `SIM_VERSION` 3, and both gates reproduce their current figures. |
| NFR-4 — The audit is diagnostic only: no new CI bound, no new gate, no new pass/fail criterion. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `ci.yml` has no `paths-ignore` under `pull_request` and no `push` trigger, proven by reading the file in the evidence. | FR-1, FR-5 |
| AC-2 | A scope step exists, every heavy step carries the skip condition, and the documented default on ambiguity is "run the full gate". | FR-2, FR-3 |
| AC-3 | The job name string is byte-identical to today's, shown as a before/after diff line. | FR-4 |
| AC-4 | A throwaway conductor-only PR reports the check **green**, with wall time recorded and ≤ 60 s. The PR is closed unmerged and its branch deleted. | FR-1, FR-2, NFR-1 |
| AC-5 | This track's own PR runs every step, recorded in `verification/integrated.md` at PR time. | NFR-2 |
| AC-6 | With defaults, `bun run telemetry` still reports 20/42 (47.6%) and all 14 bounds green. | FR-6, NFR-3 |
| AC-7 | `bun run balance` still reports 26.7% cap share, and now also prints a reference-line cap share. | FR-7, NFR-3 |
| AC-8 | The four cells are pinned in a test, and cell 1 matches the telemetry gate's cap count exactly. | FR-8, FR-9 |
| AC-9 | The verdict is written, with the residual named if the cells do not close the gap. | FR-10 |
| AC-10 | The diff contains no bound, floor, tolerance, species stat, frame-data or `SIM_VERSION` value; trace hash `0xb6cce858` unchanged. | NFR-3, NFR-4 |

## Edge Cases

- **A PR touches `conductor/**` and `packages/**`.** Any non-conductor path wins; the full gate runs.
- **A PR only deletes conductor files.** Conductor-only; the heavy steps are skipped.
- **A PR from a fork.** `fetch-depth: 0` makes the base commit reachable, so the diff works. If it does not, FR-3 applies and the full gate runs.
- **`workflow_dispatch` on `main`.** No base ref exists; treated as ambiguous and the full gate runs.
- **The diff command fails or the base is unknown.** Full gate. Never skip.
- **An empty diff.** Treated as conductor-only: there is nothing to verify.
- **The four cells do not add up to the gap.** The verdict must say the variables interact rather than pick a favourite.
- **Cell 4 does not reproduce 26.7%.** Expected — different population (42 pairings versus 840). The residual is named, not explained away.
- **The throwaway PR's check does not appear.** The phase fails; it is not waived with a note. This is the exact case the track exists to fix.
- **The ruleset keys on more than the check name.** The throwaway PR reveals it; the phase reports rather than editing repository settings.

## Dependencies

- **Tracks:** none.
- **Base:** `main` @ `7467753d` (Capshare Pacing, PR #73).
- **External:** GitHub Actions, and the `gh` CLI for the throwaway PR.

## Open Questions & Assumptions

**Decided 2026-11-12:** type `chore`, priority `medium`; the D-4 measurement is a **full factorial** (both variables); the CI change is **step-level gating plus dropping the `push` run**; the proof is a **throwaway conductor-only PR**.

**Assumptions:**

- The required check's **name** is the only thing branch protection keys on, so keeping it avoids any settings change. If the ruleset also keys on the workflow file, the throwaway PR will show it and the phase reports.
- ~15 s of one runner is an acceptable cost for a documentation PR.
- The 42-fight fixture and the 840-fight matrix stay separate fixtures; the audit borrows both and changes neither.
- `nightly.yml` (determinism + fuzz, 03:17 daily) is enough coverage of `main` to justify dropping the `push` run, with `workflow_dispatch` for on-demand full verification.

## References

- `conductor/archive/20261112-capshare-pacing/verification/integrated.md` — debts D-1 to D-4.
- `conductor/archive/20261112-capshare-pacing/review.md` — finding F1 (the unmeasured attribution).
- `.github/workflows/ci.yml`, `nightly.yml`, `deploy.yml`.
- `packages/sim/scripts/battle-telemetry.ts` — `matchups()`, `measureFight()`, `BOUNDS`.
- `packages/sim/scripts/battle-balance-report.ts` — the reference-line block.
- `packages/sim/src/battle/continuous/resolve.ts` — `resolveContinuous`, `FIGHT_CAP_MS`.
