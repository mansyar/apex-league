# Phase 2 Verification — The fence and the stale comment

- **Track:** `20261117-main-push-path-filters` (Main Push Path Filters)
- **Phase:** 2 — The fence and the stale comment
- **Date:** 2026-11-17
- **Branch:** `chore/20261117-main-push-path-filters`
- **Phase base:** `ed011f38` (plan marked phase 2 in progress)
- **Phase 1 base (scope diff):** `a103e3c9`
- **Head at verification:** `541b408e` (`docs(ci): correct telemetry comment to the 42-fight sample`)
- **Result:** **PASS** — all three verification commands green; both mutation proofs fail exactly as intended and were fully restored; ci.yml changed by one comment line only.

## Commands

| # | Command | Exit | Result summary |
|---|---------|------|----------------|
| 0 (baseline) | `bun test scripts/deploy/workflow.test.ts` | 0 | 26 pass / 0 fail, 82 expect() calls, 26 tests across 1 file [37.00ms] — with the new block in place, before mutations |
| 1 | `bun test scripts/deploy/workflow.test.ts` | 0 | **26 pass / 0 fail**, 82 expect() calls, 26 tests across 1 file [22.00ms] — final green after both restorations |
| 2 | `bun run verify` | 0 | **4167 pass / 1 skip / 0 fail**, 491194 expect() calls, 4168 tests across 375 files [52.33s]; Biome `Checked 939 files in 718ms. No fixes applied.`; determinism gate OK for all 45 models + 5 props |
| 3 | `bun run build` | 0 | vite v8.3.4, **418 modules transformed**, `✓ built in 364ms`, `Exited with code 0` (only the non-fatal >500 kB chunk-size advisory) |

Test count moved from 20 to 26: the new `describe("the main-push filters pin the non-build paths")` block adds 6 tests (2 workflows × 3 assertions). The 4167-pass verify total and 418-module build match the Phase 1 / NFR-3 baseline.

## P2.T1 — the six-pattern fence (FR-4, NFR-1, AC-4)

New block in `scripts/deploy/workflow.test.ts` reads `deploy.yml` and `server-image.yml` as text with `readFileSync` (no YAML parser introduced, matching the existing contracts in the file). A helper finds the `paths-ignore:` key, walks its list items, and strips an optional surrounding single or double quote before comparing. `workflow_dispatch:` is matched as a 2-space-indented key; `paths:` is matched as `/^\s*paths:/m` so `paths-ignore:` cannot trigger a false positive.

### Assertions per workflow

| # | `deploy.yml` | `server-image.yml` | Check |
|---|--------------|--------------------|-------|
| 1 | `conductor/**` | `conductor/**` | exact value at index 0 |
| 2 | `docs/**` | `docs/**` | exact value at index 1 |
| 3 | `.opencode/**` | `.opencode/**` | exact value at index 2 |
| 4 | `README.md` | `README.md` | exact value at index 3 |
| 5 | `AGENTS.md` | `AGENTS.md` | exact value at index 4 |
| 6 | `'*.png'` → `*.png` | `'*.png'` → `*.png` | exact value at index 5 after quote stripping |

- **Array equality** pins the count at exactly six, the shipped order, and the values — a missing, extra, reordered, or renamed pattern fails.
- **No allow-list:** `/^\s*paths:/m.test(source) === false` for both files.
- **Manual trigger preserved:** `/^\s{2}workflow_dispatch:\s*$/m.test(source) === true` for both files.
- The pre-existing `describe("the CI gate always reports")` assertions (no path filter, no push trigger, every post-scope step gated on `steps.scope.outputs.code`) remain byte-identical and still pass.

### Mutation proof 1 — remove one pattern

Temporarily deleted `      - AGENTS.md` from `.github/workflows/deploy.yml`, ran the suite (expected failure), then restored the exact line. Confirmed restored via `git diff --stat` (deploy.yml absent from diff).

Exact failure output:

```text
bun test v1.4.4 (38afee6c8)

scripts\deploy\workflow.test.ts:
244 |     test(`${name} ignores exactly the six non-build paths, in order`, () => {
245 |       // Quotes are syntax (`*.png` is a YAML alias indicator when unquoted),
246 |       // so compare the pattern values after stripping an optional surrounding
247 |       // quote. Array equality also pins the shipped order and rejects a missing
248 |       // or extra entry.
249 |       expect(ignoredPatterns(source)).toEqual(IGNORED)
                                            ^
error: expect(received).toEqual(expected)

@@ -5,3 +5,2 @@
    "README.md",
-   "AGENTS.md",
    "*.png",

- Expected  - 1
+ Received  + 0

      at <anonymous> (D:\Projects\battle-pets\scripts\deploy\workflow.test.ts:249:39)
(fail) the main-push filters pin the non-build paths > deploy.yml ignores exactly the six non-build paths, in order [0.62ms]

 25 pass
 1 fail
 82 expect() calls
Ran 26 tests across 1 file. [26.00ms]

Exit code: 1
```

### Mutation proof 2 — remove one `workflow_dispatch`

Temporarily deleted `  workflow_dispatch:` from `.github/workflows/server-image.yml`, ran the suite (expected failure), then restored the exact line. Confirmed restored via `git diff --stat` (server-image.yml absent from diff).

Exact failure output:

```text
bun test v1.4.4 (38afee6c8)

scripts\deploy\workflow.test.ts:
258 | 
259 |     test(`${name} keeps its manual trigger`, () => {
260 |       // Path filters do not apply to workflow_dispatch, so a doc-only change can
261 |       // still be deployed or published on demand. Removing it removes the only
262 |       // escape hatch for a push the filter skipped.
263 |       expect(/^\s{2}workflow_dispatch:\s*$/m.test(source)).toBe(true)
                                                                 ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (D:\Projects\battle-pets\scripts\deploy\workflow.test.ts:263:60)
(fail) the main-push filters pin the non-build paths > server-image.yml keeps its manual trigger [0.41ms]

 25 pass
 1 fail
 82 expect() calls
Ran 26 tests across 1 file. [25.00ms]

Exit code: 1
```

### Final green run (after both restorations)

```text
bun test v1.4.4 (38afee6c8)

 26 pass
 0 fail
 82 expect() calls
Ran 26 tests across 1 file. [22.00ms]
```

Neither mutation remains in the tree — the final committed diff contains only the new test block and the one-line ci.yml comment change.

## P2.T2 — the stale comment (FR-6, AC-6)

`git diff -- .github/workflows/ci.yml` — exactly one comment line changed, no YAML key, step, condition or command touched:

```diff
diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index 767f62e0..5aa44ca4 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -104,7 +104,7 @@ jobs:
 
       - name: Run telemetry gate
         if: steps.scope.outputs.code == 'true'
-        # The same 14-matchup sample the suite pins, printed as a table and
+        # The same 42-fight sample the suite pins, printed as a table and
         # gated on its own bounds. Exits non-zero naming the metric, the
         # observed value and the bound (FR-14, AC-14, AC-24).
         run: bun run telemetry
```

The retired "14-matchup" wording is gone; the comment now names the 42-fight sample. Its composition (42 distinct pairings, one seed each) is unchanged, and the `if:`/`run:` lines are byte-identical.

## P2.T3 — scope and acceptance (NFR-3, AC-7)

`git diff --name-only a103e3c9..HEAD` (at code head `541b408e`):

```text
.github/workflows/ci.yml
.github/workflows/deploy.yml
.github/workflows/server-image.yml
conductor/tracks/20261117-main-push-path-filters/metadata.json
conductor/tracks/20261117-main-push-path-filters/plan.md
conductor/tracks/20261117-main-push-path-filters/verification/phase-1.md
scripts/deploy/workflow.test.ts
```

- No file under `apps/` or `packages/` changed.
- `scripts/deploy/workflow.test.ts` is the only `scripts/` change.
- The three workflow files are the Phase 1 filter change (deploy, server-image) plus this phase's one-line ci.yml comment.

### Acceptance criteria

| AC | Requirement | Evidence | Result |
|----|-------------|----------|--------|
| AC-4 | Workflow test green; temporary removal of one pattern **or** one `workflow_dispatch` shown to fail, then restored | Mutation proofs 1 & 2 (25 pass / 1 fail, exit 1 each), final green (26 pass / 0 fail), both files restored | **PASS** |
| AC-5 | Live conductor-only push to main starts zero Deploy / Server image runs | Primary-executed in archived evidence **after merge**; explicitly not attempted in this phase; no throwaway PR opened | **DEFERRED (N/A)** |
| AC-6 | ci.yml no longer says "14-matchup"; names the 42-fight sample; no YAML changed | One-line comment diff above | **PASS** |
| AC-7 | `bun run verify` + `bun run build` green; no `apps/`/`packages/` change; test is only `scripts/` change | Commands table + scope diff above | **PASS** |

## Evidence paths

- `conductor/tracks/20261117-main-push-path-filters/verification/phase-1.md` — shipped filters, parse check, doc-only run cost.
- `conductor/tracks/20261117-main-push-path-filters/verification/phase-2.md` — this report.
- `.conductor/evidence/` — no additional artifacts required; all raw command output is inlined above.

## Deviations

None. All edits stayed inside the phase Touches (`scripts/deploy/workflow.test.ts`, `.github/workflows/ci.yml`, this evidence file).

## Notes

- AC-5's live push proof is post-merge and primary-executed; it was not attempted here.
- Both temporary workflow mutations were restored exactly; the final `git diff --stat` showed only the two intended code files before commit.
- Commits: `8ad82c1e` (`test(ci): pin main-push path filters and manual triggers`), `541b408e` (`docs(ci): correct telemetry comment to the 42-fight sample`), followed by this evidence commit.

## Primary verification

| Command | Exit | Result |
| --- | --- | --- |
| `bun test scripts/deploy/workflow.test.ts` | 0 | 26 pass / 0 fail, 26 tests across 1 file in 23 ms |
| `bun run verify` | 0 | 4,167 pass / 1 skip / 0 fail; 4,168 tests across 375 files in 55.00 s; Biome 939 files, no fixes; voxel determinism byte-identical |
| `bun run build` | 0 | 418 modules transformed, client built in 317 ms; only the pre-existing chunk warning |

Diff review: `git diff --name-only ed011f38..HEAD` listed exactly the two Touches files plus this
evidence. The new `describe("the main-push filters pin the non-build paths")` block reads both
workflows with `readFileSync`, strips optional quotes before comparing, and pins all six patterns in
order, forbids a `paths:` allow-list, and requires `workflow_dispatch` on each. The pre-existing
`describe("the CI gate always reports")` assertions are untouched. The `ci.yml` diff is exactly one
comment line — `14-matchup` → `42-fight` — with no YAML key, condition or command changed, so NFR-1
holds and the ruleset-facing job name and scope logic are byte-identical.

The evidence records both mutation proofs with their failing assertions (25 pass / 1 fail / exit 1
each) and the restored green run; the final tree is clean. AC-4, AC-6 and AC-7 are met. AC-5 is
post-merge by construction and stays in the archived evidence.
