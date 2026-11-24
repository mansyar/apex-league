# Phase 1 — Frozen baseline and resonance inventory

- Track: `20261124-controller-cadence-resonance-diagnostic`
- Phase: 1
- Date: 2026-11-24
- Branch: `chore/20261124-controller-cadence-resonance-diagnostic`
- Base: main @ `dcbe314a5a4cea813e424f350e2490bf9f99165f`
- Phase base / HEAD at sweep: `db983f2ed9a55057d7b43d157e07f068186eaa93`
  (subsequent commits on this branch contain only verification reports)
- Result: **VERIFIED** — the frozen baseline reproduces, the gitignored scanner
  ran twice with byte-identical output, and the full resonance inventory is
  recorded for both the 42-fight gate and the 1680-fight matrix. No tracked
  source, config, gate, bound, or controller constant was changed.

## 1. Command table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| scope (pre) | `git status --porcelain` | 0 | Empty — clean worktree before the sweep. |
| scope (pre) | `git diff --quiet dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages apps` | 0 | Empty source diff before the sweep. |
| baseline | `bun run telemetry` | 0 | Cap `5/42 (11.9%)`; engagement `340 / 946 / 6061`; positions min `19`; duration `12.50s..45.00s`; 14/14 bounds `ok`; row 39 is the named zero-commit artifact. |
| baseline | `bun packages/sim/scripts/battle-telemetry.ts --smoke` | 0 | `SMOKE: historical reference + split sample (ungated)`; cap `11/42 (26.2%)`; engagement `345 / 1102 / 3992`; positions min `31`; duration `9.08s..45.00s`; 14/14 bounds `ok`. |
| baseline | `bun run fixture-audit` | 0 | Cells A/B/C/D `11 / 8 / 7 / 5` of 42; attribution `+14.3 / +7.1 / +7.1 / +2.4`; same-doctrine `580/1680 (34.5%)` → `370/1680 (22.0%)` = `+12.5` points. |
| baseline | `bun run balance` | 0 | `370/1680 (22.0%)` cap share, 33/33 gates `ok`; reference-line cap `580/1680 (34.5%)` — the `+12.5`-point delta. |
| inventory | `bun .conductor/evidence/20261124-controller-cadence-resonance-diagnostic/inventory/scan-resonance.ts` | 0 | Two consecutive runs; `fights=42` resonance `1 (2.4%)` and `fights=1680` resonance `12 (0.7%)`; matrix caps `370` → equivalence `PASS`. |
| scope (post) | `git status --porcelain` | 0 | Empty after the commit — no tracked source or scratch leakage. |

Raw captures are gitignored scratch under
`.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/`:
`baseline/summary.txt`, `baseline/smoke.txt`, `baseline/fixture-audit.txt`,
`inventory/run-1.txt`, `inventory/run-2.txt`, and `inventory/status.txt`.

## 2. FR-1 frozen baseline

The representative gate (`measure()` = `midpoint` + `press`) reproduces exactly:
`5/42` caps, engagement `340/946/6061`, `19` minimum distinct cells, duration
`12.50s..45.00s`, all fourteen bounds `ok`. The historical smoke cell
(reference + split, ungated) reproduces `11/42 (26.2%)` and `345/1102/3992`.
The fixture audit reproduces cells `11 / 8 / 7 / 5` with the `+12.5`-point
same-doctrine delta. The balance matrix reproduces `370/1680 (22.0%)` with all
gates green and the reference-line diagnostic `580/1680 (34.5%)`. The frozen
battle hash from `bun run verify` remains `0xff6f3d62`; no bound, sample, seed,
stride, doctrine, or gate was changed.

## 3. FR-1 named artifact and safe-floor/cadence explanation

Archived PR #91 committed evidence (`conductor/archive/20261124-telemetry-fixture-restratification/verification/integrated.md` §3 bound table and §5; `verification/phase-2.md`; and the scratch trace now committed at `.conductor/evidence/20261124-telemetry-fixture-restratification/phase-2/root-cause.txt`) records exactly one zero-commit fight in the 42-fight `midpoint`+`press` cell:

- **`gale_moth v emberwing`, seed `20261146`** — 45.00 s cap, 0–0 commits,
  100% idle, no contact. Live `bun run telemetry` reproduces row 39 with
  `0-0` blows, `0-0` commits, `100.0%` idle, gap `724/1054/3984` mm. The
  scanner's opening-pose derivation (§4) gives reach edge `785` mm, safe floor
  `865` mm and hold point `865` mm for this pair.
- The other three cells (`reference/split`, `reference/press`,
  `midpoint/split`) have `0/42` zero-commit fights; the same pairing reads
  `24.06s / 8-7` (reference/split), `45.00s / 12-10` (reference/press) and
  `15.52s / 7-8` (midpoint/split).
- Mechanism: `threatBandFor` lifts the press safe floor to
  `opponentReachMm + REACH_STANDOFF_MM (80)`; with `DECISION_MS = 240`
  (`DECISION_STEPS = 12`, `STEP_MS = 20`) and midpoint speed `14`, the body
  travels roughly `450` mm per decision. Every decision tick therefore samples
  either below the safe floor (ordered retreat at ≈`826` mm in the archived
  trace) or above the hold point (ordered advance at ≈`1270–1372` mm), so the
  in-band press branch is never selected. This is a seed/body/speed cadence
  resonance, not a stat-bound violation; pooled gates stay green because one
  fully idle fight is ≈`2.4%` of a 42-fight mean. Owner decision (AC-11): keep
  the fixture and bounds, narrow the per-fight assertions to this named
  artifact, record the resonance as a separate follow-up.

## 4. Resonance inventory (FR-2 / FR-3)

Exact frozen rule, applied with no widening:
`commits[0] === 0 && commits[1] === 0 && idle === 1 && contact === 0`.
Near-resonant stalls (a zero commit count that misses any one predicate) are
notes only, never events. Both samples report `near-resonant-notes=0`.
All measurements use `statBasis=midpoint`, `doctrine=press`,
`REACH_STANDOFF_MM=80`, `DECISION_STEPS=12`, `FIGHT_CAP_MS=45000`.

### 4.1 Representative-42 sample

`fights=42`, `resonance=1 (2.4%)`, `near-resonant-notes=0`, `caps=5 (11.9%)`.
Scanner assertion: `gale_moth v emberwing @ 20261146 only event -> YES`.

| Field | Value |
| --- | --- |
| Pairing | `gale_moth v emberwing` |
| Seed | `20261146` |
| Stat basis | `midpoint` |
| Doctrine | `press` |
| Speed (home / away midpoint `spd`) | `14 / 14` |
| Reach edge | `785` mm |
| Safe floor | `865` mm (`opponentReachMm + 80`) |
| Band floor | `865` mm |
| Hold point | `865` mm |
| Gap min / median / max | `724 / 1054 / 3984` mm |
| Decision gaps total | `187` |
| Sampled gaps (head) | `[3418,2770,2122,1474,826,1270,1372,1372,826,1270,826,1270]` |
| Sampled gaps (tail) | `[1270,826,1270,826,1270,826]` |
| Commits | `0 / 0` |
| Idle | `1` (100%) |
| Contact | `0` |
| Duration | `45000` ms (`45.00s`, cap) |
| Reason | `time` |

### 4.2 Matrix-1680 sample

`fights=1680`, `resonance=12 (0.7%)`, `near-resonant-notes=0`,
`caps=370 (22.0%)`. Every event below shares these first-class fields from the
scanner output: `statBasis=midpoint`, `doctrine=press`, speed `14/14`, commits
`0/0`, idle `1`, contact `0`, duration `45000` ms, reason `time`.

| # | Pairing | Seed | Reach edge (mm) | Safe floor (mm) | Band floor (mm) | Hold point (mm) | Gap min/median/max (mm) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `electric_hound v gale_moth` | `20261109` | `840` | `920` | `920` | `924` | `724/1054/3984` |
| 2 | `electric_hound v gale_moth` | `20261112` | `840` | `920` | `920` | `924` | `724/1042/3984` |
| 3 | `electric_hound v emberwing` | `20261109` | `845` | `925` | `925` | `929` | `724/1054/3984` |
| 4 | `electric_hound v emberwing` | `20261112` | `845` | `925` | `925` | `929` | `724/1042/3984` |
| 5 | `gale_moth v electric_hound` | `20261109` | `840` | `920` | `920` | `924` | `724/1054/3984` |
| 6 | `gale_moth v electric_hound` | `20261112` | `840` | `920` | `920` | `924` | `724/1042/3984` |
| 7 | `gale_moth v emberwing` | `20261109` | `785` | `865` | `865` | `865` | `724/1054/3984` |
| 8 | `gale_moth v emberwing` | `20261112` | `785` | `865` | `865` | `865` | `724/1042/3984` |
| 9 | `emberwing v electric_hound` | `20261109` | `845` | `925` | `925` | `929` | `724/1054/3984` |
| 10 | `emberwing v electric_hound` | `20261112` | `845` | `925` | `925` | `929` | `724/1042/3984` |
| 11 | `emberwing v gale_moth` | `20261109` | `785` | `865` | `865` | `865` | `724/1054/3984` |
| 12 | `emberwing v gale_moth` | `20261112` | `785` | `865` | `865` | `865` | `724/1042/3984` |

All twelve events involve only `electric_hound`, `gale_moth` and `emberwing`,
at matrix seeds `20261109` and `20261112`, each pairing in both home/away
orientations. Matrix cap equivalence: `matrix caps 370/1680 vs bun run balance
370/1680 -> PASS`.

### 4.3 Counts, rates and uniqueness

- Representative gate: **1/42 (2.4%)**.
- Matrix: **12/1680 (0.7%)**.
- `gale_moth v emberwing` at seed `20261146` is the **only** event in the
  42-fight representative gate. It is **not** the only event in the matrix:
  the matrix contains twelve events, including `gale_moth v emberwing` at seeds
  `20261109` and `20261112`. The exact pairing-plus-seed combination
  `20261146` does not recur in the matrix, whose seeds are fixed to
  `20261109..20261112`.

The gitignored scanner at
`.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/inventory/scan-resonance.ts`
builds the 42 gate matchups from exported `matchups()`, the 420×4 matrix from
exported `ALL_SPECIES` and `MATRIX_SEEDS =
[20261109, 20261110, 20261111, 20261112]`, calls `measureFight(matchup,
{ statBasis: "midpoint", doctrine: "press" })` for both, and derives geometry
from public continuous-battle exports. No tracked source was changed.

## 5. Acceptance criteria

| AC | Result | Evidence |
| --- | --- | --- |
| AC-1 (frozen baseline reproduced) | satisfied | §1–§3: `bun run telemetry`, the smoke command, `bun run fixture-audit` and `bun run balance` all exit 0 with the frozen readings; battle hash `0xff6f3d62` unchanged. |
| AC-2 (deterministic gitignored scanner) | satisfied | §4: scanner authored under the gitignored path and ran twice with byte-identical output (SHA-256 `FB052240E2440E2FC0DF7A5EC2A46BA089CB87115BD351B3A880861421F122F3` on both captures); matrix cap equivalence `370/1680 -> PASS`. |
| AC-3 (per-event inventory) | satisfied | §4: every event field for the 42 gate event and all twelve matrix events, with explicit counts/rates `1/42 (2.4%)` and `12/1680 (0.7%)`, and the uniqueness statement in §4.3. |

## 6. Scope proof

- Before the sweep: `git status --porcelain` empty; `git diff --quiet
  dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages apps` exit 0.
- HEAD at the sweep equalled the phase base
  `db983f2ed9a55057d7b43d157e07f068186eaa93`; later commits on this branch
  contain only verification reports.
- All scratch (`baseline/`, `inventory/`) lives under `.conductor/`, which is
  gitignored (`.gitignore:3`). The only tracked file in this phase is this
  verification report.
- No bound, sample, seed, stride, doctrine, gate, controller constant, source,
  test, config, manifest, schema, API, or deployment file was changed. No fix
  was implemented and no remote was contacted. The primary's fallback sweep
  likewise changed no source, test, config, manifest, schema, API, branch, ref,
  or remote.

## 7. Deviations

- `reachEdgeMm` is a public export of `controller-profile.ts`, not
  `controller-reach.ts`; the scanner uses that public export and independently
  corroborates it with `opponentReachMm + REACH_STANDOFF_MM` from
  `controller-reach.ts`. No source export was added.

## 8. Historical note — resolved permission denials

Three commands were initially denied by the subagent permission layer and were
not retried, rephrased, or worked around. The primary ran each of them unchanged
and separately on the clean tree; all exited 0:

1. `bun packages/sim/scripts/battle-telemetry.ts --smoke`
2. `bun run fixture-audit`
3. `bun .conductor/evidence/20261124-controller-cadence-resonance-diagnostic/inventory/scan-resonance.ts`

Their first-class readings are incorporated in §1 and §4. No blocker remains.

## 9. Notes

The scanner produced byte-identical output on two consecutive runs: SHA-256
`FB052240E2440E2FC0DF7A5EC2A46BA089CB87115BD351B3A880861421F122F3` for both
`inventory/run-1.txt` and `inventory/run-2.txt`. Its matrix cap count matches
`bun run balance` exactly (`370/1680`) — equivalence `PASS`. No product or
design decision was required; no scope expansion was needed. The post-commit
`git status --porcelain` was empty, so no tracked source or scratch artifact
leaked into the commit.
