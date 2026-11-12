# Phase 1 evidence — The gate that always reports

**Track:** `20261112-gate-cost-and-fixture-audit`
**Phase:** 1 of 3
**Base:** `e3318e40`
**Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, AC-1, AC-2, AC-3
**File changed:** `.github/workflows/ci.yml`

---

## 1. Before / after

### 1.1 The `on:` block

Before (workflow-level path filter — the bug):

```yaml
on:
  pull_request:
    branches: [main]
    paths-ignore:
      # Conductor state (specs, plans, metadata, evidence) is reviewed as
      # content, not code. Conductor-only changes skip CI entirely.
      - 'conductor/**'
  push:
    branches: [main]
    paths-ignore:
      - 'conductor/**'
```

After (AC-1: no `paths-ignore`, no `push`; FR-5: `workflow_dispatch` added):

```yaml
on:
  pull_request:
    branches: [main]
  workflow_dispatch:
```

`paths-ignore` is no longer a YAML key: the string survives only inside the new
header comment (line 6), which says explicitly not to put the filter back.
`push:` is absent entirely, and `workflow_dispatch:` is present with no inputs.

### 1.2 The header comment

Before:

```yaml
# CI gate for pull requests — mirrors the local pre-commit gate exactly.
# `bun run verify` = workspace type checks + typed bun test + Biome + the
# voxel determinism gate (generated GLBs must be byte-identical).
name: CI
```

After:

```yaml
# CI gate for pull requests — mirrors the local pre-commit gate exactly.
# `bun run verify` = workspace type checks + typed bun test + Biome + the
# voxel determinism gate (generated GLBs must be byte-identical).
#
# This workflow must trigger on every pull request targeting main, with no
# `paths-ignore` filter. The job below is a required check, and a workflow-level
# path filter makes GitHub create no run at all for a filtered commit — so the
# required check is never created, and a conductor-only PR waits at
# "Expected — waiting" until it merges with an admin bypass this project
# forbids. The saving belongs inside the job instead: the `scope` step diffs the
# branch against its base and the heavy steps are skipped when nothing outside
# `conductor/**` changed. Do not put a path filter back.
#
# There is deliberately no `push` trigger: every merge re-ran this same gate on
# a tree the pull request had already verified. `nightly.yml` covers
# determinism and fuzz on main, and `workflow_dispatch` keeps a full on-demand
# run available.
name: CI
```

### 1.3 The step list

Before:

```yaml
    steps:
      - name: Check out
        uses: actions/checkout@v4

      - name: Set up Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.4.4

      - name: Restore Bun package cache
        uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('bun.lock') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run verify gate
        run: bun run verify

      - name: Run telemetry gate
        run: bun run telemetry
```

After (comments elided here; they are in the file):

```yaml
    steps:
      - name: Check out
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - id: scope
        name: Decide whether the code gate applies
        run: |
          set -euo pipefail
          base="${{ github.event.pull_request.base.sha }}"
          if [ -z "$base" ]; then
            echo "code=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          if ! files="$(git diff --name-only "$base"...HEAD)"; then
            echo "code=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          if printf '%s\n' "$files" | grep -qv '^conductor/'; then
            echo "code=true" >> "$GITHUB_OUTPUT"
          else
            echo "code=false" >> "$GITHUB_OUTPUT"
            echo "Conductor-only change — the code gate does not apply." >> "$GITHUB_STEP_SUMMARY"
          fi

      - name: Set up Bun
        if: steps.scope.outputs.code == 'true'
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.4.4

      - name: Restore Bun package cache
        if: steps.scope.outputs.code == 'true'
        uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: ${{ runner.os }}-bun-${{ hashFiles('bun.lock') }}
          restore-keys: |
            ${{ runner.os }}-bun-

      - name: Install dependencies
        if: steps.scope.outputs.code == 'true'
        run: bun install --frozen-lockfile

      - name: Run verify gate
        if: steps.scope.outputs.code == 'true'
        run: bun run verify

      - name: Run telemetry gate
        if: steps.scope.outputs.code == 'true'
        run: bun run telemetry
```

NFR-2 is preserved: the five heavy steps keep their exact `uses:`/`run:` bodies,
their order, and the Bun pin (`1.4.4`). The only additions are `fetch-depth: 0`,
the `scope` step, and the `if:` line on each heavy step.

---

## 2. The job name is byte-identical (AC-3, FR-4)

Before, line 27 of the old file:

```
    name: Verify (types, tests, biome, voxel determinism)
```

After, line 34 of the new file:

```
    name: Verify (types, tests, biome, voxel determinism)
```

`git diff -U0 -- .github/workflows/ci.yml` shows no hunk touching the `name:`
line under `jobs.verify` — the job key `verify`, its display name, `runs-on`,
`permissions`, `concurrency`, and the workflow `name: CI` are untouched. The
required check's name therefore stays `Verify (types, tests, biome, voxel
determinism)`, and no branch-protection or ruleset edit is required.

---

## 3. Which steps run for which change (AC-2, FR-2)

| # | Step | Condition | Code PR | Conductor-only PR |
| - | ---- | --------- | ------- | ----------------- |
| 1 | `Check out` | none — always | runs | runs |
| 2 | `Decide whether the code gate applies` (`id: scope`) | none — always | runs, writes `code=true` | runs, writes `code=false` |
| 3 | `Set up Bun` | `if: steps.scope.outputs.code == 'true'` | runs | skipped |
| 4 | `Restore Bun package cache` | `if: steps.scope.outputs.code == 'true'` | runs | skipped |
| 5 | `Install dependencies` | `if: steps.scope.outputs.code == 'true'` | runs | skipped |
| 6 | `Run verify gate` | `if: steps.scope.outputs.code == 'true'` | runs | skipped |
| 7 | `Run telemetry gate` | `if: steps.scope.outputs.code == 'true'` | runs | skipped |

The job itself is never skipped: there is no job-level `if:`, so GitHub creates
and concludes it in both cases. A conductor-only PR executes two steps —
checkout with full history and one `git diff` — and the job reports **success**
(FR-2). No step carries `continue-on-error`, and the skipped steps report
`Skipped`, not `Failure`.

---

## 4. Ambiguity cases — the default is always "run" (FR-3, AC-2)

The `scope` step writes `code=true` on every path it cannot prove safe. There
are exactly three such paths, and they are explicit `exit 0`s, so a shell error
cannot fall through to `code=false` either.

| Case | What the step sees | Output | Result |
| ---- | ------------------ | ------ | ------ |
| **`workflow_dispatch` on `main`** | `github.event.pull_request.base.sha` is empty | `code=true` (explicit branch, `exit 0`) | Full gate runs — no base ref exists, so there is no diff to trust. |
| **The diff command fails** | `git diff --name-only "$base"...HEAD` exits non-zero (base unresolvable, shallow clone, merge-base missing) | `code=true` (the `if !` branch, `exit 0`) | Full gate runs. A failed diff is never read as "nothing to verify". |
| **A PR from a fork** | `base.sha` is present in the payload; `fetch-depth: 0` fetches the full history, so the base commit is reachable | `code=true` if any non-conductor path changed, else `code=false` | The diff works. If it does not, the row above applies: full gate. |
| **An empty diff** | `git diff` succeeds with no output; `printf '%s\n' ""` emits one blank line, which does not match `^conductor/`, so `grep -qv` exits 0 | `code=true` | Full gate runs. See the note below. |
| **A PR touching `conductor/**` and `packages/**`** | at least one path outside `conductor/` | `code=true` | Full gate runs — any non-conductor path wins. |
| **A PR only deleting conductor files** | every path matches `^conductor/` | `code=false` | Heavy steps skipped; job reports success. |

**Note on the empty diff.** The spec's Edge Cases section originally said an empty
diff is "treated as conductor-only: there is nothing to verify", which contradicted
FR-3's fail-safe rule. The implementation follows the phase brief's step body
verbatim, and that body yields `code=true` for an empty diff, because the blank line
`printf` emits for an empty `$files` does not match `^conductor/`. The primary
resolved the contradiction in the spec rather than in the step (2026-11-12): an
empty diff is an anomaly, not evidence that there is nothing to verify, and "run"
is the direction FR-3 requires. No code changed for this.

**Shell safety.** `set -euo pipefail` is active. The `grep -qv` inside an `if`
cannot abort the step when it exits 1 (the conductor-only case), and
`printf '%s\n' "$files"` handles an empty or multi-line `$files` without
word-splitting. No third-party path-filter action was added.

---

## 5. Nothing depended on the removed `push` run (P1.T1.2)

- `.github/workflows/deploy.yml` triggers on `push: branches: [main]`
  **independently** (its own `on:` block, lines 14–19) and runs its own
  `bun run verify` step. It does not reference `ci.yml`, and no `workflow_run`
  trigger exists in any workflow.
- `.github/workflows/nightly.yml` is `schedule` + `workflow_dispatch` only; it
  runs `gate:determinism` and `test:fuzz`.
- `.github/workflows/server-image.yml` is untouched and independent.
- A full gate on `main` remains available on demand via the new
  `workflow_dispatch` trigger.

---

## 6. Verification

Command (exactly as the brief names it):

```
bun run verify
```

Result — **pass**:

```
 4151 pass
 1 skip
 0 fail
 491140 expect() calls
Ran 4152 tests across 374 files. [73.07s]
Checked 936 files in 717ms. No fixes applied.
$ bun packages/voxel/scripts/determinism-gate.ts
determinism gate OK: … (47 generated artifacts byte-identical)
```

This includes `scripts/deploy/workflow.test.ts` and
`scripts/deploy/server-image.test.ts`, which read `.github/workflows/*.yml`
directly: the Bun pin is still `1.4.4` in all four workflows, and no assertion
about `deploy.yml`'s own gate is affected. `bun run build` was not required for
this phase (a workflow file cannot affect the build).

---

## 7. Live proof (AC-4) — primary-executed

The live proof — the throwaway conductor-only PR whose required check must
report green in ≤ 60 s (AC-4, NFR-1) — is **primary-executed**: this phase agent
may not push, open a PR, or run `gh`. It will be opened, observed, closed
unmerged with its branch deleted, and appended to this file by the primary as
part of accepting Phase 1.

---

## Primary verification

### Commands

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | 4,151 pass / 1 skip / 0 fail; 4,152 tests across 374 files; Biome 935 files; determinism gate byte-identical |

### Diff review

`git diff --name-only e3318e40..HEAD` lists exactly two paths: `.github/workflows/ci.yml` and this
evidence file. Nothing else in the repository moved — no workflow besides `ci.yml`, no source, no
`package.json`.

Checked line by line against the brief:

- **Job name (AC-3, FR-4).** Line 34 is `name: Verify (types, tests, biome, voxel determinism)`,
  byte-identical to the shipped string. No hunk touches it.
- **Trigger (FR-1, FR-5).** `on:` is now `pull_request: branches: [main]` plus `workflow_dispatch:`.
  There is no `paths-ignore` anywhere and no `push` key.
- **Scope step (FR-2, FR-3).** `id: scope`, always runs, `set -euo pipefail`, and the three
  ambiguity branches each `echo "code=true"` and `exit 0` before the diff is trusted.
- **Gated steps (FR-2).** Set up Bun, Restore cache, Install dependencies, Run verify gate and
  Run telemetry gate all carry `if: steps.scope.outputs.code == 'true'`. Checkout and the scope
  step do not.
- **`fetch-depth: 0`** is set, with the reason in a comment: the diff needs the base commit.

### The decision logic, proven locally

AC-4's live run cannot happen inside this track (see below), so the scope step's decision table was
exercised against real diffs from this repository, applying the same rule the shell applies —
"any path outside `conductor/` means run the gate":

| Diff | Files | Decision |
| --- | --- | --- |
| `7467753d...b611d165` — this track's scaffold commit | 5, all `conductor/` | `code=false` |
| `7467753d...19f6bfbf` — the `ci.yml` change plus conductor files | 6, mixed | `code=true` |
| `f65ec2c1^...f65ec2c1` — the merged pacing squash | 16, includes `packages/` | `code=true` |
| empty diff | 0 | `code=true` (the blank line `printf` emits does not match `^conductor/`) |
| unresolvable base | — | `code=true` (the diff command fails) |

Every branch that is not provably conductor-only runs the full gate, which is the direction FR-3
requires. The conductor-only row is the only one that skips, and it is the case the track exists
for.

### AC-4 is structurally post-merge

A `pull_request` workflow executes from the PR's **merge commit**, so a PR that changes `ci.yml`
runs the new workflow — and, because its own diff contains `ci.yml`, is simultaneously a code PR
that can only exercise the full path. No PR that changes the trigger can demonstrate the skip path
for itself.

The live proof therefore runs **immediately after this track merges**, against a `main` that already
carries the new workflow: a throwaway conductor-only branch, a PR to `main`, the required check
observed green with its wall time, then the PR closed unmerged and the branch deleted. The spec's
AC-4 and Edge Cases were amended on 2026-11-12 to say exactly this, and the result is appended to
this file and to `verification/integrated.md` at that point.

### Observation, not fixed

`ci.yml` line 100 still says "The same 14-matchup sample the suite pins", but the sample has been 42
fights since `20261112-capshare-pacing`. The line is outside this phase's change and is left
untouched rather than quietly edited; recorded as a follow-up.

## The live proof — AC-4 and AC-5, run 2026-11-13 after merge

Both criteria were deferred because a `pull_request` workflow executes from the PR's **merge commit**:
any PR whose diff contains `ci.yml` is a code PR by construction and can only exercise the full path.
They were therefore run one merge later, against `main` at `0a80c925`.

### AC-5 — a code PR still runs every step

PR [#74](https://github.com/mansyar/apex-league/pull/74) (this track) changed `ci.yml`, so the scope
step read the whole PR diff, found code, and wrote `code=true`.

| | |
| --- | --- |
| Check | `Verify (types, tests, biome, voxel determinism)` |
| Result | **pass** |
| Duration | **2m57s** |
| Run | https://github.com/mansyar/apex-league/actions/runs/43177007721 |

### AC-4 — a conductor-only PR reports green, ≤ 60 s

A throwaway branch added one file, `conductor/gate-skip-proof.md`, and nothing else — a
conductor-only diff by construction.

| | |
| --- | --- |
| PR | [#75](https://github.com/mansyar/apex-league/pull/75) — closed unmerged, branch deleted |
| Check | `Verify (types, tests, biome, voxel determinism)` |
| Result | **pass** |
| Duration | **13 s** |
| Run | https://github.com/mansyar/apex-league/actions/runs/43178551827 |

The required check exists, reports success, and satisfies a ruleset that keys on the job name — which
is the whole point. The step list is the proof that the saving is real:

| Step | Conclusion |
| --- | --- |
| Set up job | success |
| Check out | success |
| Decide whether the code gate applies | success |
| Set up Bun | **skipped** |
| Restore Bun package cache | **skipped** |
| Install dependencies | **skipped** |
| Run verify gate | **skipped** |
| Run telemetry gate | **skipped** |
| Post Check out | success |
| Complete job | success |

13 s against 2m57s is a **13.6× saving** on a documentation PR, and the job name is byte-identical to
the pre-track one, so no ruleset edit was needed.

### What this closes

AC-4's live proof was the last open item on this track. With it recorded, every acceptance criterion
has been met or explicitly amended: the workflow always reports, a conductor-only diff skips the heavy
steps and says so, and the decision logic is proven both by the six-case shell reproduction in
`review.md` and by this run on the real runner.
