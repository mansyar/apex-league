# Phase 2 — Mechanism decomposition and ranked decision options

- Track: `20261124-controller-cadence-resonance-diagnostic`
- Phase: 2
- Date: 2026-11-24
- Branch: `chore/20261124-controller-cadence-resonance-diagnostic`
- Base: main @ `dcbe314a5a4cea813e424f350e2490bf9f99165f`
- Phase base / HEAD at sweep: `1bf4ce970ff75fa8540d0c57ffd2ad8db31dd38f`
  (this report is the only tracked file added by this phase)
- Result: **VERIFIED** — all six configured commands exited 0. The mechanism
  trace was initially denied to the subagent shell and was run by the primary as
  an autonomous fallback after a scratch-only TDZ repair (§8, §10); the full
  first-class output is preserved at
  `.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/mechanism/trace-run.txt`
  (360 lines) and summarized in
  `.conductor/runs/20261124-controller-cadence-resonance-diagnostic/phase-2-primary-outputs.md`.
  All 13 events are confirmed cadence resonance, none a stat-bound violation.
  No runtime, bound, gate, sample, seed, or controller constant was changed. The
  decision is deferred to the owner.

## 1. Command table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| mechanism | `bun .conductor/evidence/20261124-controller-cadence-resonance-diagnostic/mechanism/trace-resonance.ts` | 0 (primary fallback) | First-class replay of all 13 events from public exports only: `decisions=188`, `skipped=0`, `replayFinalStep=2250`, `inBandTicks=0`, `commitOrders=0`, and a `CADENCE RESONANCE, NOT a stat-bound violation` verdict per event. Capture: `mechanism/trace-run.txt` (360 lines). Initially denied to the subagent; see §8 and §10. |
| regression | `bun run telemetry` | 0 | Cap `5/42 (11.9%)`; engagement `340 / 946 / 6061` mm; idle `30.3%`; contact `10.3%`; positions min `19`; duration `12.50s..45.00s`; `14/14` bounds `ok`; row 39 is the named zero-commit artifact. |
| regression | `bun run balance` | 0 | `370/1680 (22.0%)` cap share; `33/33` gates `ok`; reference-line cap `580/1680 (34.5%)` diagnostic. |
| scope | `git diff --quiet dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages apps` | 0 | Empty source diff. |
| scope | `git diff --check dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD` | 0 | No whitespace error. |
| scope | `git status --porcelain` | 0 | Empty before the write; re-confirmed empty after the commit. |

Each command was run separately with no pipe, `&&` chain, wrapper binary, or
Code Mode workaround. The mechanism command's initial denial and its resolution
by the primary are recorded in §8; it was never retried or worked around by the
subagent.

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
`opponentReachMm + REACH_STANDOFF_MM` (`80`). The first-class replay reports
`safeFloor=865` / `bandCeiling=1177` for the `gale_moth`/`emberwing` edge
(`785` mm reach edge), `920`/`1260` for `electric_hound`/`gale_moth` (`840` mm),
and `925`/`1267` for `electric_hound`/`emberwing` (`845` mm). One cadence
decision is `DECISION_MS=240 ms = DECISION_STEPS(12) × STEP_MS(20 ms)`. The replay
captured `decisions=188`, `skipped=0` and `replayFinalStep=2250` for all 13
events, confirming it reproduces the resolver step-for-step.

The observed gap-delta set across decision ticks is
`{-648, -582, -546, -444, -102, 0, 102, 444, 546}` mm: the opening advance
closes the gap from `4000` mm to `1474` mm by `t=960`, then retreat ticks sample
below the safe floor (`826` mm for the `785`-mm edge, `881` for `840`, `886` for
`845`) and advance ticks sample above the band ceiling (`1270`/`1372` mm). No
tick lands inside `[floor .. ceiling]`. These are observed centre-gap changes
per decision tick, not an invented single-body speed; the archived PR #91 note's
"roughly 450 mm per 240 ms decision" is supporting archived evidence only.

Every decision tick therefore samples either below the safe floor (ordered
`retreat`) or above the band ceiling (ordered `advance`). The in-band press branch
in `controller.ts` (the `slot < press` block, currently lines 310–338) is never
reached: the first-class trace reports `inBandTicks=0` and `commitOrders=0` for
every event, and the verb censuses contain only `advance` and `retreat` (all
other verbs `0`). Cadence-jitter draws are consumed but no press slot is taken.
This is a **seed/body/speed cadence resonance, not a stat-bound violation**: the
frozen gate rows stay green because pooled idle/contact/exchange are means over
42 fights and one fully idle fight is `≈2.4%` of that mean; the matrix cap share
stays `22.0%` inside the D-1 `≤1/3` fence.

## 4. Per-event decision-tick traces

All excerpts below are first-class replay output from `mechanism/trace-run.txt`,
not reconstruction. Each event records the exact frozen rule fields,
`DECISION_MS=240 = DECISION_STEPS(12) × STEP_MS(20)`, `decisions=188`,
`skipped=0`, `capSteps=2250`, `replayFinalStep=2250`, the observed gap-delta set,
the verb census, `inBandTicks=0`, `commitOrders=0`, and the resonance-vs-stat-bound
verdict. Head excerpts cover `t=0..2640` and tail excerpts `t=43680..44880`
(step 2244); the full 360-line capture is the primary evidence. Frozen bound
readings that remain green are in §4.4 and apply to every event.

### 4.1 Representative-42 event

**`gale_moth v emberwing` @ `20261146`** — `reachEdge=785`, `safeFloor=865`,
`bandFloor=865`, `holdPoint=865`, `bandCeiling=1177`, `gap=724/1054/3984`,
`speed=14/14`, `commits=0/0`, `idle=1`, `contact=0`, `durationMs=45000`,
`reason=time`; `decisions=188`, `skipped=0`, `capSteps=2250`,
`replayFinalStep=2250`, `hp=146/150`.

- Head: `t=0 gap=4000 advance/advance` → `t=240 gap=3418 advance/advance` →
  `t=480 gap=2770 advance/advance` → `t=720 gap=2122 advance/advance` →
  `t=960 gap=1474 advance/advance` → `t=1200 gap=826 retreat/retreat` →
  `t=1440 gap=1270 retreat/advance` → `t=1680 gap=1372 retreat/advance` →
  `t=1920 gap=1372 advance/advance` → `t=2160 gap=826 retreat/retreat` →
  `t=2400 gap=1270 advance/advance` → `t=2640 gap=826 retreat/retreat`.
- Tail: the `826 ⇄ 1270` alternation repeats through `t=44880 (step=2244)` with
  no in-band tick.
- Travel per tick: observed deltas `{-648,-582,-546,-444,-102,0,102,444,546}`
  mm; retreat ticks sample `826` mm (below `safeFloor=865`), advance ticks
  sample above `bandCeiling=1177`.
- Verb census: `advance=183 retreat=170 strafe=0 hold=0 commit=0 dodge=0 slip=0`;
  `inBandTicks=0`, `commitOrders=0`.
- Verdict: **CADENCE RESONANCE, NOT a stat-bound violation** — every decision
  tick is below the safe floor (retreat) or above the band ceiling (advance);
  the in-band press branch is never reached, and frozen bounds stay green
  (`5/42` caps, `14/14` bounds, min `19` cells). This matches the archived PR #91
  four-cell trace (`t=1200 retreat at 826`; `t=1440..1920 advance at
  1270..1372`; `t=2160 retreat at 826`).

### 4.2 Matrix-1680 events (all 12)

All twelve share `speed=14/14`, `commits=0/0`, `idle=1`, `contact=0`,
`durationMs=45000`, `reason=time`, `decisions=188`, `skipped=0`,
`capSteps=2250`, `replayFinalStep=2250`, the gap-delta set
`{-648,-582,-546,-444,-102,0,102,444,546}` mm, `inBandTicks=0`,
`commitOrders=0`, strafe/hold/commit/dodge/slip `=0`, and the verdict
**CADENCE RESONANCE, NOT a stat-bound violation**.

| # | Pairing | Seed | Reach | Floor / Hold / Ceiling | Gap min/med/max | Retreat sample | Verb census (advance / retreat) | hp |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | electric_hound v gale_moth | 20261109 | 840 | 920 / 924 / 1260 | 724/1054/3984 | 881 | 181 / 169 | 171/146 |
| 2 | electric_hound v gale_moth | 20261112 | 840 | 920 / 924 / 1260 | 724/1042/3984 | 881 | 179 / 172 | 171/146 |
| 3 | electric_hound v emberwing | 20261109 | 845 | 925 / 929 / 1267 | 724/1054/3984 | 886 | 181 / 169 | 171/150 |
| 4 | electric_hound v emberwing | 20261112 | 845 | 925 / 929 / 1267 | 724/1042/3984 | 886 | 179 / 172 | 171/150 |
| 5 | gale_moth v electric_hound | 20261109 | 840 | 920 / 924 / 1260 | 724/1054/3984 | 881 | 181 / 169 | 146/171 |
| 6 | gale_moth v electric_hound | 20261112 | 840 | 920 / 924 / 1260 | 724/1042/3984 | 881 | 179 / 172 | 146/171 |
| 7 | gale_moth v emberwing | 20261109 | 785 | 865 / 865 / 1177 | 724/1054/3984 | 826 | 181 / 169 | 146/150 |
| 8 | gale_moth v emberwing | 20261112 | 785 | 865 / 865 / 1177 | 724/1042/3984 | 826 | 179 / 172 | 146/150 |
| 9 | emberwing v electric_hound | 20261109 | 845 | 925 / 929 / 1267 | 724/1054/3984 | 886 | 181 / 169 | 150/171 |
| 10 | emberwing v electric_hound | 20261112 | 845 | 925 / 929 / 1267 | 724/1042/3984 | 886 | 179 / 172 | 150/171 |
| 11 | emberwing v gale_moth | 20261109 | 785 | 865 / 865 / 1177 | 724/1054/3984 | 826 | 181 / 169 | 150/146 |
| 12 | emberwing v gale_moth | 20261112 | 785 | 865 / 865 / 1177 | 724/1042/3984 | 826 | 179 / 172 | 150/146 |

Representative head excerpt (events 1, 3, 5, 7, 9, 11 — seed `20261109`):
`t=0 gap=4000 advance/advance` → `t=240 gap=3418` → `t=480 gap=2770` →
`t=720 gap=2122` → `t=960 gap=1474` → `t=1200 gap=826 retreat/retreat` →
`t=1440 gap=1270 advance/advance` → `t=1680 gap=826 retreat/retreat` →
`t=1920 gap=1270` → `t=2160 gap=826` → `t=2400 gap=1270` → `t=2640 gap=826`.
Seed `20261112` events (2, 4, 6, 8, 10, 12) show the same opening advance and
`826 ⇄ 1270` alternation with occasional `1372` advance ticks and a `724`
retreat sample; the tail (both seeds) repeats the alternation to `step=2244`.
In every case the retreat sample is below the safe floor and the advance sample
is above the band ceiling, with no tick in-band.

### 4.4 Frozen bound readings that stay green for every event

| Sample | Cap share | Bounds / gates | Engagement (min/med/max mm) | Positions | Duration |
| --- | --- | --- | --- | --- | --- |
| representative-42 | `5/42 (11.9%)` | `14/14` bounds `ok` | `340 / 946 / 6061` | min `19` cells | `12.50s..45.00s` |
| matrix-1680 | `370/1680 (22.0%)` | `33/33` gates `ok` | — | — | median `32.80s`, max `45.00s` |

Idle `30.3%` (bound `≤50%`), contact `10.3%` (`≤70%`), exchange `0.35/0.34/s`
(`≤2.50/s`) and cap share `11.9%` (`≤60%`) are pooled readings; the single idle
fight does not breach any of them. The replay's frozen-bounds footer confirms
the same green readings were in force during all 13 traces. No bound, fence, band
or sample moved.

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
| AC-4 (per-event mechanism decomposition) | satisfied | §3–§4: first-class decision-tick excerpts with gap/floor/hold/ceiling figures, `DECISION_MS=240=12×20` cadence, `decisions=188`, `replayFinalStep=2250`, observed per-tick deltas, verb censuses, `inBandTicks=0`, `commitOrders=0`, and the resonance-vs-bound-violation verdict for all 13 events. |
| AC-5 (ranked options, tolerate baseline, no implementation) | satisfied | §5: O0 baseline plus O1–O4 with knob, location, effect, validation, cost, risk and fences reopened; rejected precedent as evidence only; explicit no-implementation statement in §7. |
| AC-10 (no fix / re-pin / bound / gate / sample change; stop on a seemingly safe fix) | satisfied | §1 and §7–§10: `git diff --quiet ... -- packages apps` exit 0, `git diff --check` exit 0, clean tree; no option implemented; the denied command was reported, not worked around, and the only repair was to gitignored scratch (§10). |

## 7. No option implemented

This track implements **none** of O0–O4. No fix, band re-pin, bound change, gate
change, or sample change was made. No controller constant, `SIM_VERSION`, reach
table, body profile, doctrine, seed, stride, gate, or bound was touched. The
phase touches only this report (tracked) and gitignored scratch under
`.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/{mechanism,options}/`.
A per-event trace script was authored to reproduce the excerpts from the public
API. Its execution was initially denied for this subagent (§8) and was resolved
by the primary with a scratch-only repair (§10); no tracked source was edited to
expose a helper or to make the script runnable, and no option was implemented.

## 8. Historical note — initial command denial, resolved by the primary

`bun .conductor/evidence/20261124-controller-cadence-resonance-diagnostic/mechanism/trace-resonance.ts`

The subagent's invocation returned `permission.rejected` from the shell layer and
was not retried, rephrased, or worked around. The primary then ran the same
command unchanged as an autonomous fallback and reached **exit 0** after
repairing a self-shadowing TDZ bug in the gitignored scratch script (§10). The
first-class output is captured at
`.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/mechanism/trace-run.txt`
(360 lines) and summarized at
`.conductor/runs/20261124-controller-cadence-resonance-diagnostic/phase-2-primary-outputs.md`.
It prints one block per event with verb counts, decision-tick excerpts, observed
per-tick gap deltas, `inBandTicks=0`, `commitOrders=0`, the resonance verdict, and
a frozen-bounds footer; `replayFinalStep=2250` equals `45000 / STEP_MS(20)` for
every event. §4 now uses those first-class values in place of the earlier
reconstruction. The denial is historical and no longer blocks this phase.

## 9. Scope proof

- Before and after this phase: `git status --porcelain` empty; `git diff --quiet
  dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages apps` exit 0;
  `git diff --check dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD` exit 0.
- Only tracked file added: this report. Scratch (`mechanism/`, `options/`) lives
  under `.conductor/`, gitignored at `.gitignore:3`.
- No dependency, manifest, schema, API, CORS, deployment, branch, ref, or remote
  change. No git remote-mutating command was executed.

## 10. Deviations

- The mechanism trace command was initially denied to the subagent (§8). The
  primary resolved it by repairing only the gitignored scratch script
  `.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/mechanism/trace-resonance.ts`:
  a local `const replay = replay(matchup)` shadowed the `function replay`
  declaration inside `scan()`, causing `ReferenceError: Cannot access 'replay'
  before initialization`. The function declaration and its single call were
  renamed to `replayMatchup`; the command path and every tracked file were
  unchanged. The command then exited 0.
- §4 excerpts were first reconstructed from first-class Phase 1 scanner output
  and archived PR #91 evidence; they were replaced with the first-class replay
  values once the primary's fallback run completed.
- No other deviation. Scratch stayed inside the two listed gitignored paths.

## 11. Notes

The 13 events are exactly the Phase 1 inventory: the sole representative event
`gale_moth v emberwing @ 20261146`, and twelve matrix events over
`electric_hound`/`gale_moth`/`emberwing` at seeds `20261109` and `20261112`.
The mechanism, cadence and bound readings are unchanged from Phase 1. The
first-class replay confirms the same frozen counts and adds the per-event
cadence census (`decisions=188`, `replayFinalStep=2250`, `inBandTicks=0`,
`commitOrders=0`) without moving any bound. The decision remains intentionally
open and is handed back to the owner; no product or design decision was made in
this phase.
