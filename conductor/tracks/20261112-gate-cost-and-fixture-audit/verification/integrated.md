# Integrated verification — Gate Cost and Fixture Audit

Track: `20261112-gate-cost-and-fixture-audit` · branch `chore/20261112-gate-cost-and-fixture-audit`
· base `main` @ `7467753d`

## What shipped

**Part A — the gate reports on every PR, and costs almost nothing on a docs-only one.**

`ci.yml` no longer filters at the workflow level. `pull_request: branches: [main]` fires on every
PR, and a new `scope` step diffs the branch against its base and writes `code=true|false`. The five
heavy steps (setup-bun, cache restore, install, `bun run verify`, `bun run telemetry`) carry
`if: steps.scope.outputs.code == 'true'`. Checkout and the scope step always run, so the required
check **always reaches a conclusion** — a conductor-only PR reports green in about the time it takes
to spin a runner up, instead of waiting forever at "Expected" and merging by admin bypass.

The job's display name is byte-identical to the shipped one, so the ruleset needs no edit. The
duplicate `push` trigger is gone (it re-ran the same gate on `main` on a tree the PR had already
verified), and `workflow_dispatch` keeps a full on-demand run available. Every ambiguity — no PR, a
failed diff — falls through to `code=true`, so the fail-safe direction is always "run".

**Part B — the fixture-versus-matrix question is answered, with a decomposition.**

`measureFight` gained optional `statBasis` (`reference` | `midpoint`) and `doctrine`
(`split` | `press`) parameters, defaulting to the shipped cell, so the gate's own reading could not
move. `battle-balance-report.ts` now prints the cap share of the reference pass it was already
running. A new diagnostic script, `packages/sim/scripts/fixture-audit.ts`, measures the 2 × 2 on the
fixture's own 42 pairings and seeds.

| Cell | Stats | Doctrine | Caps | Share | Median |
| --- | --- | --- | --- | --- | --- |
| A | reference | split | 20/42 | 47.6% | — |
| B | reference | press | 17/42 | 40.5% | — |
| C | midpoint | split | 13/42 | 31.0% | — |
| D | midpoint | press | 5/42 | 11.9% | 29.32 s |

Plus two numbers that already existed and were never compared:

| Population | Stats | Doctrine | Caps | Share |
| --- | --- | --- | --- | --- |
| balance matrix (840) | midpoint | press | 224/840 | 26.7% |
| balance report, reference pass (840) | reference | press | 377/840 | 44.9% |

**The stat basis dominates.** At press doctrine on the fixture's pairings it is worth **28.6 points**
(40.5% → 11.9%); on the 840-fight population at press it is worth **18.2 points** (44.9% → 26.7%).
Doctrine at reference stats is worth **7.1 points** (47.6% → 40.5%).

**The two are not additive.** Doctrine is worth **19.0 points** once the stats sit at midpoints
(31.0% → 11.9%), so **11.9 points of the 35.7-point gap is interaction** — larger than the doctrine
main effect itself. Quoting one ordering without the other would be the single-cause mistake review
F1 caught on the previous track, so both are printed and the interaction term is named.

## Gates

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | 4,157 pass / 1 skip / 0 fail; 4,158 tests across 375 files; Biome 938 files; determinism gate byte-identical |
| `bun run build` | 0 | 418 modules; only the pre-existing >500 kB chunk warning |
| `bun run telemetry` | 0 | unchanged: `cap share: 20/42 (47.6%)`, `dead zone: 27 commits (2.9%)`, 14/14 bounds |
| `bun run balance` | 0 | unchanged: `cap share: 224/840 (26.7%)`, `decisive share: 803/840 (95.6%)`, median 31.21 s, 49/49 moves in band, plus one new diagnostic line |
| `bun run trace --seed 20261111 --check` | 0 | `0xb6cce858`, 5 invariants |
| `bun run fixture-audit` | 0 | the four-cell table above |

`SIM_VERSION` is still 3. The diff contains no bound, floor, tolerance, species value, frame data or
resolver file.

## Acceptance criteria

| AC | Verdict |
| --- | --- |
| AC-1 — no path filter on `pull_request`, no `push` trigger | met (`ci.yml:20-23`) |
| AC-2 — a `scope` step skips the heavy steps for a conductor-only diff, and runs on every ambiguity | met, after review F5: the first version read `grep -q`'s SIGPIPE and any grep error as "conductor-only" |
| AC-3 — the job name is byte-identical | met (`ci.yml:34` against `7467753d`) |
| AC-4 — a conductor-only PR reports green, wall time recorded, ≤ 60 s | **deferred to post-merge** (debt 1) |
| AC-5 — a code PR still runs every step | **pending** — recorded at PR time, from this track's own run |
| AC-6 — telemetry and balance readings unchanged | met |
| AC-7 — four cells recorded with a verdict | met |
| AC-8 — cell A equals the gate's count by import | met |
| AC-9 — the verdict names the dominant variable in points | met, after review F2/F4 corrected the attribution |
| AC-10 — nothing about the game moved | met |

## Debt and follow-ups

**1. AC-3's live proof is structurally post-merge.** A `pull_request` workflow runs from the PR's
merge commit, so any PR whose diff contains `ci.yml` runs the new workflow *and* is a code PR by
construction — it can only exercise the full path. The decision logic was proven locally for five
diff shapes inside the track; the live conductor-only run is performed immediately after this track
merges, against a `main` that already carries the workflow, and appended here.

**2. The 42-pairing walk is a biased subset — measured, not assumed, and not the whole residual.**
The subagent's verdict called the 14.8-point gap between cell D (11.9%) and the matrix (26.7%)
"population". That was tested rather than accepted, and the test split it in two:

| Run | Fights | Caps | Share |
| --- | --- | --- | --- |
| cell D, fixture seeds | 42 | 5 | 11.9% |
| same 42 pairings, the matrix's four seeds | 168 | 30 | 17.9% |
| the matrix itself (210 pairings, four seeds) | 840 | 224 | 26.7% |

So **~6.0 of the 14.8 points are seed count** (11.9% → 17.9%) and **~8.8 are the pairing set**
(17.9% → 26.7%, z ≈ −2.6). More seeds do not close the gap, which is what makes the pairing set the
survivor — but most of the raw number is simply that the fixture fights one seed per pairing.

Note the two gaps that are easy to confuse, because review F2 caught exactly that:
- **Same pairings, both variables:** A − D = 47.6% − 11.9% = **35.7 points**, and the four cells
  decompose it *exactly* (7.1 doctrine at reference stats + 28.6 stat basis at press doctrine). There
  is no remainder here.
- **Fixture versus matrix:** A − matrix = 47.6% − 26.7% = **20.9 points**, of which cell D to matrix
  is the 14.8 above and the rest is the variables the cells already account for.

Re-stratifying the walk is a gate redesign and belongs in its own track with its own before/after.

**3. `ci.yml` line 100 is stale.** The telemetry step's comment still says "The same 14-matchup
sample the suite pins"; the sample has been 42 fights since `20261112-capshare-pacing`. Left
untouched because it is outside this phase's change, and recorded rather than quietly fixed.

**4. What this does to the two debts the previous track recorded.**
- **D-1 (global pacing)** is resized, and the two figures must not be swapped. **26.7%** is the
  number the project treats as the game's: it is the balance gate's own population, built on each
  species' bounds midpoint, which `battle-balance-report.ts` calls "the creature a player would own
  after a fair roll" (FR-22). **44.9%** is the equal-investment reference line — every side clamped
  to `REFERENCE = { hp: 189, atk: 10, def: 10, spd: 10 }` — which the same file labels *diagnostic
  only*. So the honest statement is: the shortfall is 26.7% at the basis the project measures the
  game on, and 44.9% when both fighters are equal-investment bodies, which is a statement about
  investment rather than about the clock. `verification/phase-3.md` reaches the same conclusion.
  One loose thread, recorded not fixed: `battle-telemetry.ts` documents its `REFERENCE` as "what
  `rampStats` builds for a real cup fight", but `rampStats` scales a rival against the *player's own*
  effective stats, so neither fixed line is universally "the cup" — it depends on player investment.
  A third population could be measured; this track did not.
- **D-2 (the kite band at `spd 5`)** stays worth fixing, but it is **second**: doctrine is worth 7.1
  points at the fixture's stats and 19.0 at the matrix's, against 28.6 for the stat basis. Fixing it
  will not move the fixture's number much; it will move the game's.
