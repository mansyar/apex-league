# Review — Gate Cost and Fixture Audit

**Reviewer:** `conductor-reviewer` (read-only subagent)
**Range:** `7467753d..d51909be` (11 commits)
**Round:** 1
**Verdict:** PASS WITH FINDINGS — 6 Medium, 4 Low, no blockers

## What the reviewer ran

| Command | Result |
| --- | --- |
| `bun run telemetry` | pass — 20/42 (47.6%), 14/14 `ok`, dead zone 27 (2.9%), retreats 18948/19333 |
| `bun run balance` | pass — 224/840 (26.7%), `reference line cap share: 377/840 (44.9%)`, median 31.21 s, 49/49 in band |
| `bun run trace --seed 20261111 --check` | pass — `0xb6cce858`, 5 invariants |
| `git diff --stat 7467753d..HEAD` | 20 files; no species, frame-data, resolver or `SIM_VERSION` file |
| `git show 7467753d:.github/workflows/ci.yml` | job name byte-identical to HEAD line 34 |
| `bun run fixture-audit`, `bun test <files>`, `bun run verify` | not run — denied by the reviewer's shell policy / not attempted |

The reviewer independently re-derived the four cells from the script and confirmed the attribution
arithmetic (7.1 / 28.6 / 18.2 / 19.0 / −11.9) is right in `phase-3.md` §2 and `integrated.md`, and
that both orderings plus the interaction term are printed.

## Findings and disposition

| ID | Sev | Finding | Disposition |
| --- | --- | --- | --- |
| F1 | Medium | `integrated.md` AC table renumbered from AC-2 onward, spec AC-2 missing entirely, an "AC-5 verify+build" row invented | **Fixed** — table renumbered to the spec's IDs, AC-2 row added, invented row deleted |
| F2 | Medium | `product.md` + `learnings.md` said "the remaining 14.8 points are the pairing walk itself" — the 35.7 gap is fully decomposed by the cells, and the reviewer's own probe shows ~6.0 of the 14.8 is seed count | **Fixed** — both files now separate the same-pairing gap (35.7, exact) from the fixture-vs-matrix gap (20.9), and split 14.8 into ~6.0 seed count + ~8.8 walk |
| F3 | Medium | `phase-3.md` "overstates it by 2.2× against the matrix" — 47.6/26.7 = 1.8× | **Fixed** — 1.8× against the matrix, 4.0× against cell D |
| F4 | Medium | `integrated.md` called 44.9% the "honest cup figure" while `phase-3.md` and the report's own doc call the midpoint line the game's and the reference line diagnostic-only | **Fixed** — `integrated.md` now names 26.7% as the project's population (FR-22, "the creature a player would own after a fair roll") and 44.9% as the equal-investment reference line, matching `phase-3.md`; the `REFERENCE`-vs-`rampStats` doc claim recorded as an open thread |
| F5 | Medium | **Real bug, reproduced.** `if printf … \| grep -qv …` reads *any* non-zero pipeline status as "conductor-only": `grep -q` exits on first match, `printf` dies of SIGPIPE (141), `pipefail` makes the pipeline non-zero — a code PR could skip every heavy step and report green. A grep error (2) likewise read as skip | **Fixed** — `grep -v … > /dev/null` drains the pipe, the status is captured under `\|\|`, and only a clean `1` may skip; everything else runs. Proven in Git bash below |
| F6 | Medium | `phase-2.md` claimed the duplicated midpoint arithmetic was "proven to agree by the fixture audit" — no such comparison existed | **Fixed in code, not prose** — `midpointOf` is now exported and `fixture-audit.test.ts` asserts it equals `typicalLine` for every species; `phase-2.md` rewritten to describe the real guard |
| F7 | Medium | Nothing failed if `paths-ignore` came back or an `if:` was dropped — the exact regression the track exists to prevent | **Fixed** — three assertions added to `scripts/deploy/workflow.test.ts`: no `paths-ignore` key, no `push:` trigger, and every step after `scope` carries the scope condition |
| F8 | Low | `integrated.md` pre-claimed AC-5 "met by this track's own PR" with `pr_url: null` | **Fixed** — now "pending — recorded at PR time" |
| F9 | Low | The residual probe (15.5% / 17.9% at 168 fights) was not reproducible from the repo | **Fixed** — `phase-3.md` now carries the complete probe snippet |
| F10 | Low | `module-size.test.ts` comment said "five tools" and named four | **Fixed** — all five named, `balance-probe` included |

## The F5 reproduction

The reviewer's finding was a prediction; it was run. Both snippets were executed under Git bash 5.2
(`set -euo pipefail`, file lists written to a temp file so argv length is not a factor):

| Case | Input | Old snippet | New snippet | Correct |
| --- | --- | --- | --- | --- |
| 1 | two `conductor/` paths | `code=false` | `code=false` | false |
| 2 | one `conductor/` path, one code path | `code=true` | `code=true` | true |
| 3 | empty diff | `code=true` | `code=true` | true (fail-safe) |
| 4 | 3,000 `conductor/` paths | `code=false` | `code=false` | false |
| 5 | 3,000 `conductor/` paths, code path last | `code=true` | `code=true` | true |
| **6** | **code path first, 3,000 `conductor/` paths after** | **`code=false`** | `code=true` | **true** |

Case 6 is the bug: the old `grep -q` matched on line 1 and exited, `printf` died of SIGPIPE writing
the remaining ~60 KB, `pipefail` turned that into a non-zero pipeline, and the step concluded
"conductor-only". A one-line code change followed by a large conductor diff — which is exactly what
the archive commit in the previous track produced — would have reported **green with every heavy step
skipped**. The shipped version drains the pipe and branches on the status.

## Judgement calls accepted

- **AC-3's deferral to post-merge.** The reviewer called the reasoning "correct, not an excuse": a
  `pull_request` workflow runs from the PR's merge commit, so a PR containing `ci.yml` is a code PR
  by construction. The live conductor-only run is performed immediately after merge.
- **`fetch-depth: 0` on every code PR.** Costs a little clone time; recorded under NFR-2 rather than
  worked around, because the diff needs the base commit.
- **`ci.yml` line 100's stale "14-matchup" comment.** Pre-existing, outside this track's change;
  recorded as debt 3 in `integrated.md` rather than quietly fixed.

## Primary re-verification after the fixes

| Layer | Command | Result |
| --- | --- | --- |
| Unit | `bun test scripts/deploy/workflow.test.ts` | 20 pass / 0 fail |
| Unit | `bun test fixture-audit.test.ts` (with the new midpoint guard) | 5 pass / 0 fail |
| Unit | the three affected files together | 32 pass / 0 fail, 123 assertions |
| Gate | `bun run telemetry` | 20/42 (47.6%), dead zone 27 (2.9%) — unchanged |
| Gate | `bun run verify` | exit 0 |
