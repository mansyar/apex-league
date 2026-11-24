# Phase 2 — Mechanism decomposition and ranked decision options

- Track: `20261124-controller-cadence-resonance-diagnostic`
- Phase: 2
- Date: 2026-11-24
- Branch: `chore/20261124-controller-cadence-resonance-diagnostic`
- Base: main @ `dcbe314a5a4cea813e424f350e2490bf9f99165f`
- Phase base / HEAD at sweep: `1bf4ce970ff75fa8540d0c57ffd2ad8db31dd38f`
  (this report is the only tracked file added by this phase)
- Result: **BLOCKED for this subagent's verification only** — one configured
  command, the gitignored mechanism trace, was denied by the subagent shell
  permission layer and was not retried, rephrased, or worked around. The trace
  script is authored and committed-as-scratch (gitignored); the primary is to
  run that exact command unchanged as an autonomous fallback. All five other
  configured commands ran and exited 0. No runtime, bound, gate, sample, seed,
  or controller constant was changed. The decision is deferred to the owner.

## 1. Command table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| mechanism | `bun .conductor/evidence/20261124-controller-cadence-resonance-diagnostic/mechanism/trace-resonance.ts` | denied (permission.rejected) | Not run by this subagent. Authored under the gitignored `mechanism/` path; see §8 and the `blockers` field of the phase report. Per-event excerpts below are reconstructed from the first-class Phase 1 scanner output plus the archived PR #91 root-cause trace; the primary's unchanged fallback run supplies the first-class replay. |
| regression | `bun run telemetry` | 0 | Cap `5/42 (11.9%)`; engagement `340 / 946 / 6061` mm; idle `30.3%`; contact `10.3%`; positions min `19`; duration `12.50s..45.00s`; `14/14` bounds `ok`; row 39 is the named zero-commit artifact. |
| regression | `bun run balance` | 0 | `370/1680 (22.0%)` cap share; `33/33` gates `ok`; reference-line cap `580/1680 (34.5%)` diagnostic. |
| scope | `git diff --quiet dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages apps` | 0 | Empty source diff. |
| scope | `git diff --check dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD` | 0 | No whitespace error. |
| scope | `git status --porcelain` | 0 | Empty before the write; re-confirmed empty after the commit. |

Each command was run separately with no pipe, `&&` chain, wrapper binary, or
Code Mode workaround. The denied command is recorded verbatim in §8 and in the
phase report's `blockers` list.

## 2. Frozen rule, constants and geometry

Exact frozen detection rule (applied without widening):
`commits[0] === 0 && commits[1] === 0 && idle === 1 && contact === 0`.
Near-resonant stalls remain notes; both Phase 1 samples reported
`near-resonant-notes=0`.

All 13 events use `statBasis=midpoint`, `doctrine=press`, speed `14/14`,
`REACH_STANDOFF_MM=80`, `DECISION_MS=240`, `STEP_MS=20`, `DECISION_STEPS=12`,
`FIGHT_CAP_MS=45000`. Counts (frozen Phase 1): representative `1/42 (2.4%)`,
matrix `12/1680 (0.7%)`, matrix caps `370/1680 (22.0%)`.

## 3. Shared mechanism

`threatBandFor` (`controller-reach.ts`) lifts the press safe floor to
`opponentReachMm + REACH_STANDOFF_MM` (`80`), about `826` mm for the
`gale_moth`/`emberwing` edge (`785` mm reach edge → `865` mm floor in the
scanner's opening-pose derivation; the archived trace sampled the retreat at
`≈826` mm once bodies had closed). One cadence decision is
`DECISION_MS=240 ms = DECISION_STEPS(12) × STEP_MS(20 ms)`. At that cadence the
two bodies close roughly `648` mm of centre gap per decision tick during the
opening advance, then oscillate `≈444–546` mm per tick between a retreat sample
(`826` or `724` mm, below the safe floor) and an advance sample (`1270` or
`1372` mm, above the hold point). These travel-per-tick figures are the observed
deltas between consecutive decision-tick gap samples in the Phase 1 scanner
output, not an invented single-body speed; the archived PR #91 note's "roughly
450 mm per 240 ms decision" is cited as supporting archived evidence only.

Every decision tick therefore samples either below the safe floor (ordered
`retreat`) or above the hold point (ordered `advance`). The in-band press branch
in `controller.ts` (the `slot < press` block, currently lines 310–338) is never
reached on a decision tick: the scanned decision-tick excerpt for every event
contains `0` in-band presses and `0` commit orders. Cadence-jitter draws are
consumed but no press slot is taken. This is a **seed/body/speed cadence
resonance, not a stat-bound violation**: the frozen gate rows stay green because
pooled idle/contact/exchange are means over 42 fights and one fully idle fight
is `≈2.4%` of that mean; the matrix cap share stays `22.0%` inside the D-1
`≤1/3` fence.

## 4. Per-event decision-tick traces

Sampled gaps are the decision-tick gaps from the Phase 1 scanner
(`decisionGapsOf`: the gap at every 12th step). Tick times are derived as
`t = k × 240 ms` for sample index `k = 1..`; `r` = gap below the safe floor
(retreat region), `a` = gap above the hold point (advance region). The
 retreat/advance alternation and the `0` in-band press count are the mechanism
signature. Frozen bound readings that remain green are cited in §4.4 and apply
to every event.

### 4.1 Representative-42 event

**`gale_moth v emberwing` @ `20261146`** — reach edge `785`, safe floor `865`,
band floor `865`, hold point `865`, gap `724/1054/3984`, speed `14/14`,
`commits 0/0`, `idle 1`, `contact 0`, `45000` ms, reason `time`.

Decision-tick excerpt (head, `t=240..1920`):
`3418 a → 2770 a → 2122 a → 1474 a → 826 r → 1270 a → 1372 a → 1372 a`.
Tail: `1270 a → 826 r → 1270 a → 826 r → 1270 a → 826 r`.
Cadence/travel: `DECISION_MS=240 = 12×20`; observed deltas `−648, −648, −648,
−648, +444, +102, 0, −546, +444, −444, +444`; the pattern alternates retreat
samples below `865` with advance samples above `865` to the cap.
Verdict: **cadence resonance, not a stat-bound violation** (frozen representative
bounds green: `5/42` caps, `14/14` bounds, min `19` cells). This matches the
archived PR #91 four-cell trace verbatim (`t=1200 retreat at 826`;
`t=1440..1920 advance at 1270..1372`; `t=2160 retreat at 826`).

### 4.2 Matrix-1680 events — seed `20261109` (six events)

Events 1, 3, 5, 7, 9, 11 of the Phase 1 inventory:
`electric_hound v gale_moth`, `electric_hound v emberwing`,
`gale_moth v electric_hound`, `gale_moth v emberwing`,
`emberwing v electric_hound`, `emberwing v gale_moth`.

Each: speed `14/14`, `commits 0/0`, `idle 1`, `contact 0`, `45000` ms, reason
`time`; gap `724/1054/3984`. Safe floor / hold point: `920/924` for the two
`electric_hound`+`gale_moth` pairings, `925/929` for the two
`electric_hound`+`emberwing` pairings, `865/865` for the two
`gale_moth`+`emberwing` pairings.

Decision-tick excerpt (head, identical shape for all six):
`3418 a → 2770 a → 2122 a → 1474 a → 826 r → 1270 a → 826 r → 1270 a`.
Tail: `724 r → 1270 a → 826 r → 1270 a → 826 r → 1270 a`.
Cadence/travel: `240 = 12×20`; observed deltas `−648, −648, −648, −648, +444,
−444, +444, …`; retreat samples `826/724` below the floor, advance samples
`1270` above the hold point.
Verdict for each: **cadence resonance, not a stat-bound violation** (frozen
matrix bounds green: `370/1680`, `33/33` gates).

### 4.3 Matrix-1680 events — seed `20261112` (six events)

Events 2, 4, 6, 8, 10, 12 of the Phase 1 inventory, same six pairings in the
same orientation order as §4.2. Each: speed `14/14`, `commits 0/0`, `idle 1`,
`contact 0`, `45000` ms, reason `time`; gap `724/1042/3984`. Safe floor / hold
point identical to §4.2 per pairing.

Decision-tick excerpt (head, identical shape for all six):
`3418 a → 2770 a → 2122 a → 1474 a → 826 r → 1270 a → 826 r → 1270 a → 1372 a
→ 826 r → 724 r → 1270 a`.
Tail: `826 r → 724 r → 1270 a → 826 r → 1270 a → 826 r`.
Cadence/travel: `240 = 12×20`; observed deltas include `−648, +444, −444, +102,
−546, −102, +546`; retreat samples `826/724` below the floor, advance samples
`1270/1372` above the hold point.
Verdict for each: **cadence resonance, not a stat-bound violation** (frozen
matrix bounds green: `370/1680`, `33/33` gates).

### 4.4 Frozen bound readings that stay green for every event

| Sample | Cap share | Bounds / gates | Engagement (min/med/max mm) | Positions | Duration |
| --- | --- | --- | --- | --- | --- |
| representative-42 | `5/42 (11.9%)` | `14/14` bounds `ok` | `340 / 946 / 6061` | min `19` cells | `12.50s..45.00s` |
| matrix-1680 | `370/1680 (22.0%)` | `33/33` gates `ok` | — | — | median `32.80s`, max `45.00s` |

Idle `30.3%` (bound `≤50%`), contact `10.3%` (`≤70%`), exchange `0.35/0.34/s`
(`≤2.50/s`) and cap share `11.9%` (`≤60%`) are pooled readings; the single idle
fight does not breach any of them. No bound, fence, band or sample moved.

## 5. Ranked owner-facing options

Full table (also mirrored in the gitignored scratch copy
`.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/options/ranked-options.md`).

| Rank | Option | Exact knob | Code location | Expected effect | Validation commands | Cost | Risk | Reopens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **O0 — Tolerate / do nothing (AC-11)** (baseline) | none | none | Resonance persists at `1/42` and `12/1680`; documented as a known seed/body/speed artifact; AC-11 already narrowed per-fight assertions to the named fight. | `bun run telemetry`; `bun run balance`; source-diff check | zero | zero | nothing |
| 2 | **O2 — Reach standoff adjustment** | `REACH_STANDOFF_MM` (`80`) | `controller-reach.ts:26`, used in `threatBandFor` safe floor | Moves the press safe floor relative to reach edge; changes every fight's floor. | telemetry, balance, verify, gate:determinism, fixture-audit, smoke; hash/version re-baseline | low edit, high validation | high | D-2 reach/kite decisions; product.md pacing requirement. **New product decision.** |
| 3 | **O3 — Safe-floor / hold-point spacing** | press `floorRangeMm`/`ceilingRangeMm`/`preferredRangeMm`; `PREFERRED_REACH_BAND_PERMILLE`, `RANGE_BAND_MM`, `RETREAT_FRACTION_PERMILLE` | `controller-profile.ts` (band table), read by `threatBandFor` | Widen in-band strip so a 240 ms tick cannot jump from below floor to above hold. | as O2 plus `--smoke` and fresh 1680 re-measure | low edit, high validation | high | D-1/D-2 and product.md controller-family requirement. **New product decision.** |
| 4 | **O1 — Per-pair or per-body cadence jitter** | `DECISION_MS` / seed- or pair-derived decision phase | `controller-state.ts` (`DECISION_MS`, `DECISION_STEPS`, `nextDecisionMs`) and `controller.ts` cadence gate (`state.step % DECISION_STEPS`) | Shift sample phases off the `826↔1270` oscillation so some ticks land in-band. | full suite as O3; per-seed determinism and byte-identical replay | medium | medium-high | product.md controller-family requirement; may move species bands toward D-1/D-3. **New product decision.** |
| 5 | **O4 — Controller-family change (stateful range memory / hysteresis)** | replace stateless `threatBandFor` + `retreating` latch with a stateful range estimator | `controller.ts` band/retreat block (currently lines 257–308) and `controller-state.ts` | Remove the two-state oscillation structurally by stepping toward the preferred gap. The family product.md names as the legitimate path. | `bun run verify && bun run build`, balance, telemetry, `--smoke`, fixture-audit, determinism; fresh hash/version | high | highest | D-1, D-2, D-3, D-4 and product.md; explicit product decision. **New product decision.** |

**Rejected precedent — not a proposal.** `conductor/archive/20261117-global-pacing/
verification/integrated.md` §3 records that global `DECISION_MS` rungs were
tried and rejected: `240 → 200` reached `13/42` fixture / `188/840` matrix caps
but turned four species rows red (`fire_drake` 59.8% > 59.4%, `plant_ox` 62.5% >
59.6%, `voltfox` 39.3% < 40.7%, `shalemole` 60.7% > 59.5%); `220` gave `21/42`.
Every rung was reverted; no bound or species value moved. These are cited as
evidence only and are **not** re-proposed here.

Ranking: O0 is the only zero-cost, zero-risk option and reopens nothing. O2/O3
are single-knob edits with global blast radius; O1 carries the measured global
cadence precedent against it; O4 is the complete but most expensive family
path. Every alternative requires a new product decision and reopens at least one
fence. The open owner question is whether to tolerate under AC-11 or authorize a
future product decision.

## 6. Acceptance criteria (Phase 2 scope)

| AC | Result | Evidence |
| --- | --- | --- |
| AC-4 (per-event mechanism decomposition) | satisfied (first-class replay pending primary fallback) | §3–§4: decision-tick excerpts with gap/floor/hold figures, `DECISION_MS=240=12×20` cadence, observed per-tick deltas, and the resonance-vs-bound-violation conclusion for each of the 13 events. |
| AC-5 (ranked options, tolerate baseline, no implementation) | satisfied | §5: O0 baseline plus O1–O4 with knob, location, effect, validation, cost, risk and fences reopened; rejected precedent as evidence only; explicit no-implementation statement in §7. |
| AC-10 (no fix / re-pin / bound / gate / sample change; stop on a seemingly safe fix) | satisfied | §1 and §7–§8: `git diff --quiet ... -- packages apps` exit 0, `git diff --check` exit 0, clean tree; no option implemented; the denied command was reported, not worked around. |

## 7. No option implemented

This track implements **none** of O0–O4. No fix, band re-pin, bound change, gate
change, or sample change was made. No controller constant, `SIM_VERSION`, reach
table, body profile, doctrine, seed, stride, gate, or bound was touched. The
phase touches only this report (tracked) and gitignored scratch under
`.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/{mechanism,options}/`.
A per-event trace script was authored to reproduce the excerpts from the public
API, but its execution was denied for this subagent (§8); no source was edited to
expose a helper or to make the script runnable.

## 8. Denied command (verbatim)

`bun .conductor/evidence/20261124-controller-cadence-resonance-diagnostic/mechanism/trace-resonance.ts`

Result: `permission.rejected` from the subagent shell layer. Why needed: first-class
per-event decision-tick replay of all 13 resonance events, proving the
retreat/advance alternation and `0` in-band press ticks from the public API.
Expected result: exit 0, printing one block per event with verb counts, decision
tick excerpts, observed per-tick gap deltas, and the resonance verdict, plus a
final frozen-bounds footer; replay step must equal each telemetry step
(`45000 / 20 = 2250`). The primary is to run the identical command unchanged and
separately on the clean tree and append its first-class output to this evidence;
the per-event excerpts above are the honest reconstruction available without it.

## 9. Scope proof

- Before and after this phase: `git status --porcelain` empty; `git diff --quiet
  dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages apps` exit 0;
  `git diff --check dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD` exit 0.
- Only tracked file added: this report. Scratch (`mechanism/`, `options/`) lives
  under `.conductor/`, gitignored at `.gitignore:3`.
- No dependency, manifest, schema, API, CORS, deployment, branch, ref, or remote
  change. No git remote-mutating command was executed.

## 10. Deviations

- The mechanism trace command was denied by the permission layer (§8). It was
  not retried or worked around; the primary runs it unchanged as fallback, as
  in Phase 1. The per-event excerpts are reconstructed from first-class Phase 1
  scanner output and archived PR #91 evidence rather than from a first-class run
  available to this subagent.
- No other deviation. Scratch stayed inside the two listed gitignored paths.

## 11. Notes

The 13 events are exactly the Phase 1 inventory: the sole representative event
`gale_moth v emberwing @ 20261146`, and twelve matrix events over
`electric_hound`/`gale_moth`/`emberwing` at seeds `20261109` and `20261112`.
The mechanism, cadence and bound readings are unchanged from Phase 1. The
decision remains intentionally open and is handed back to the owner; no product
or design decision was made in this phase.
