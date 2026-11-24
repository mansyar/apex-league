# Phase 1 — Frozen baseline and resonance inventory

- Track: `20261124-controller-cadence-resonance-diagnostic`
- Phase: 1
- Date: 2026-11-24
- Branch: `chore/20261124-controller-cadence-resonance-diagnostic`
- Base: main @ `dcbe314a5a4cea813e424f350e2490bf9f99165f`
- Phase base / current HEAD: `db983f2ed9a55057d7b43d157e07f068186eaa93`
- Result: **BLOCKED** — three required verification commands were denied by the
  subagent permission layer and were not retried or worked around. Live
  telemetry and balance reproduction, scope proof, and scratch scanner authoring
  succeeded; the scanner inventory (AC-2, AC-3) has no output yet.

## 1. Command table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| scope (pre) | `git status --porcelain` | 0 | Empty — clean worktree before the sweep. |
| scope (pre) | `git diff --quiet dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages apps` | 0 | Empty source diff before the sweep. |
| baseline | `bun run telemetry` | 0 | Cap `5/42 (11.9%)`; engagement `340 / 946 / 6061`; positions min `19`; duration `12.50s..45.00s`; 14/14 bounds `ok`; row 39 is the named zero-commit artifact. |
| baseline | `bun packages/sim/scripts/battle-telemetry.ts --smoke` | denied (`permission.rejected`) | Frozen expectation from archived PR #91 evidence: cap `11/42 (26.2%)`, engagement `345 / 1102 / 3992`, positions min `31`, `SMOKE` header, exit 0. Not re-run. |
| baseline | `bun run fixture-audit` | denied (`permission.rejected`) | Frozen expectation from archived PR #91 evidence: cells `11 / 8 / 7 / 5` of 42; matrix `1680 / 580 / 370`; same-doctrine delta `+12.5` points. Not re-run. |
| baseline | `bun run balance` | 0 | `370/1680 (22.0%)` cap share, 33/33 gates `ok`; reference-line cap `580/1680 (34.5%)` — the `+12.5`-point delta. |
| inventory | `bun .conductor/evidence/20261124-controller-cadence-resonance-diagnostic/inventory/scan-resonance.ts` | denied (`permission.rejected`) | Scanner written to gitignored scratch; no output produced. Two-run determinism and matrix cap equivalence unverified. |
| scope (post) | `git status --porcelain` | pending | To be re-run after the commit; expected empty. |

Raw scratch record: `.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/baseline/summary.txt` and `inventory/status.txt` (both gitignored).

## 2. FR-1 frozen baseline

The representative gate (`measure()` = `midpoint` + `press`) reproduces exactly:
`5/42` caps, engagement `340/946/6061`, `19` minimum distinct cells, duration
`12.50s..45.00s`, all fourteen bounds `ok`. The balance matrix reproduces
`370/1680 (22.0%)` with all gates green and the reference-line diagnostic
`580/1680 (34.5%)`. The frozen battle hash from `bun run verify` remains
`0xff6f3d62`; no bound, sample, seed, stride, doctrine, or gate was changed.

## 3. FR-1 named artifact and safe-floor/cadence explanation

Archived PR #91 committed evidence (`conductor/archive/20261124-telemetry-fixture-restratification/verification/integrated.md` §3 bound table and §5; `verification/phase-2.md`; and the scratch trace now committed at `.conductor/evidence/20261124-telemetry-fixture-restratification/phase-2/root-cause.txt`) records exactly one zero-commit fight in the 42-fight `midpoint`+`press` cell:

- **`gale_moth v emberwing`, seed `20261146`** — 45.00 s cap, 0–0 commits,
  100% idle, no contact. Live `bun run telemetry` reproduces row 39 with
  `0-0` blows, `0-0` commits, `100.0%` idle, gap `724/1054/3984` mm.
- The other three cells (`reference/split`, `reference/press`,
  `midpoint/split`) have `0/42` zero-commit fights; the same pairing reads
  `24.06s / 8-7` (reference/split), `45.00s / 12-10` (reference/press) and
  `15.52s / 7-8` (midpoint/split).
- Mechanism: `threatBandFor` lifts the press safe floor to
  `opponentReachMm + REACH_STANDOFF_MM (80)` ≈ `826` mm for this body pair.
  With `DECISION_MS = 240` (`DECISION_STEPS = 12`, `STEP_MS = 20`) and midpoint
  speed `14`, the body travels roughly `450` mm per decision; every decision
  tick samples either below the safe floor (ordered retreat at ≈`826` mm) or
  above the hold point (ordered advance at ≈`1270–1372` mm), so the in-band
  press branch is never selected. This is a seed/body/speed cadence resonance,
  not a stat-bound violation; pooled gates stay green because one fully idle
  fight is ≈`2.4%` of a 42-fight mean. Owner decision (AC-11): keep the fixture
  and bounds, narrow the per-fight assertions to this named artifact, record
  the resonance as a separate follow-up.

## 4. Resonance inventory (FR-2 / FR-3)

Exact frozen rule, applied with no widening:
`commits[0] === 0 && commits[1] === 0 && idle === 1 && contact === 0`.
Near-resonant stalls (a zero commit count that misses any one predicate) are
notes only, never events.

Archived per-event record for the one known event (values from PR #91 evidence;
the live scanner run is blocked, so these are **not** yet independently
confirmed by this phase):

| Field | Value |
| --- | --- |
| Pairing | `gale_moth v emberwing` |
| Seed | `20261146` |
| Stat basis | `midpoint` |
| Doctrine | `press` |
| Speed (midpoint `spd`) | `14` |
| Reach edge | ≈`746` mm (derived as safe floor − `REACH_STANDOFF_MM 80`) |
| Safe floor | ≈`826` mm (`opponentReachMm + 80`) |
| Sampled gaps | min `724` / median `1054` / max `3984` mm; decision ticks alternate ≈`826` (retreat) and `1270–1372` (advance) |
| Commits | `0 / 0` |
| Idle | `1` (100%) |
| Contact | `0` |
| Duration | `45000` ms (`45.00s`, cap) |

Counts and rates: representative gate **1/42 (2.4%)** per the archived four-cell
trace; matrix **pending the blocked scanner run**. Uniqueness of
`gale_moth v emberwing @ 20261146` is established for the 42-fight cell by
archived evidence only; **across the 1680-fight matrix it cannot yet be stated**
without the scanner output. No matrix event is claimed or suppressed here.

The gitignored scanner at
`.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/inventory/scan-resonance.ts`
is ready: it builds the 42 gate matchups from exported `matchups()`, builds the
420×4 matrix from exported `ALL_SPECIES` and `MATRIX_SEEDS =
[20261109, 20261110, 20261111, 20261112]`, calls `measureFight(matchup,
{ statBasis: "midpoint", doctrine: "press" })` for both, derives reach edge and
safe floor from public `controller-reach` exports, includes a matrix cap-count
equivalence check against `370/1680`, and is written for byte-identical reruns.

## 5. Acceptance criteria

| AC | Result | Evidence |
| --- | --- | --- |
| AC-1 (frozen baseline reproduced) | partial | §1–§3: `bun run telemetry` and `bun run balance` reproduced live; smoke and fixture-audit denied and recorded from archived PR #91 evidence. |
| AC-2 (deterministic gitignored scanner) | blocked | §4: scanner authored under the gitignored path; execution command denied, so the two-run byte-identical check and the 370-cap equivalence check have no output. |
| AC-3 (per-event inventory) | partial | §4: archived per-event record and 42-fight count included; matrix count, rate, and uniqueness pending the scanner run. |

## 6. Scope proof

- Before the sweep: `git status --porcelain` empty; `git diff --quiet
  dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages apps` exit 0.
- HEAD equals the phase base `db983f2ed9a55057d7b43d157e07f068186eaa93`.
- All scratch (`baseline/`, `inventory/`) lives under `.conductor/`, which is
  gitignored (`.gitignore:3`). The only tracked file in this phase is this
  verification report.
- No bound, sample, seed, stride, doctrine, gate, controller constant, source,
  test, config, manifest, schema, API, or deployment file was changed. No fix
  was implemented and no remote was contacted.

## 7. Deviations

- `reachEdgeMm` is a public export of `controller-profile.ts`, not
  `controller-reach.ts`; the scanner uses that public export and independently
  corroborates it with `opponentReachMm + REACH_STANDOFF_MM` from
  `controller-reach.ts`. No source export was added.
- The frictionless, near-resonant and matrix-only counts remain unmeasured
  because the scanner command was denied; this is recorded as a blocker, not a
  deviation from the frozen rule.

## 8. Blockers for the primary agent

The following exact commands were denied by the subagent permission layer and
were not retried, rephrased, or worked around:

1. `bun packages/sim/scripts/battle-telemetry.ts --smoke`
   Need: the historical smoke cell reading. Expected: exit 0, `SMOKE` header,
   cap `11/42 (26.2%)`, engagement `345 / 1102 / 3992`, positions min `31`.
2. `bun run fixture-audit`
   Need: the four-cell and matrix fixture audit. Expected: cells
   `11 / 8 / 7 / 5` of 42, matrix `1680 / 580 / 370`, same-doctrine delta
   `+12.5` points.
3. `bun .conductor/evidence/20261124-controller-cadence-resonance-diagnostic/inventory/scan-resonance.ts`
   Need: the resonance inventory. Expected: deterministic event rows for both
   samples, matrix cap count `370` matching `bun run balance`, and two
   byte-identical runs for `run-1.txt` / `run-2.txt`.

## 9. Notes

Everything that could be observed without those three commands matches the
frozen baseline exactly. Once the primary runs the commands unchanged and hands
back their output, §1, §4, §5 and the post-commit `git status --porcelain` row
can be completed without touching any tracked source. No product or design
decision was required; no scope expansion was needed.
