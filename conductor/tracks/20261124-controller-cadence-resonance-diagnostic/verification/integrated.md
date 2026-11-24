# Integrated Verification: Controller Cadence Resonance Diagnostic

- **Track:** `20261124-controller-cadence-resonance-diagnostic` (chore)
- **Branch:** `chore/20261124-controller-cadence-resonance-diagnostic`
- **Base:** `main` @ `dcbe314a5a4cea813e424f350e2490bf9f99165f`
- **Phase base:** `254200954e7e71ab58b936824f4ca23e3ee523f3`
- **Date:** 2026-11-24
- **Result:** **VERIFIED** — the full configured check suite is green at the
  frozen readings with battle hash `0xff6f3d62` and an empty source diff. Four
  commands initially denied to the subagent were run unchanged by the primary
  and exited 0; the single dated product note was applied by the primary and
  committed at `2879fd0b`. No gate was widened and no fix was implemented. The
  owner decision (tolerate under AC-11 vs authorize a controller-family change)
  is intentionally deferred.

## 1. Goal and disposition

This evidence-only chore characterizes a controller cadence resonance across
both frozen samples, decomposes its per-event mechanism, and ranks owner-facing
options — without changing a bound, fence, sample, gate, controller constant,
source file, or product decision. Battle hash stays `0xff6f3d62`. The frozen
gate, smoke, matrix, and audit readings all reproduce; the resonance inventory
is `1/42 (2.4%)` on the representative gate and `12/1680 (0.7%)` on the matrix;
all 13 events are cadence resonance, not stat-bound violations. Whether to
tolerate the artifact under AC-11 or authorize a future controller-family change
is handed back to the owner. No fix is implemented in this track.

## 2. Baseline and named artifact (Phase 1)

The representative gate (`measureFight` with `statBasis="midpoint"`,
`doctrine="press"`) reproduces exactly: cap `5/42 (11.9%)`, engagement
`340 / 946 / 6061` mm, idle `30.3%`, contact `10.3%`, minimum `19` distinct
cells, duration `12.50s..45.00s`, and 14/14 bounds `ok`. The historical
reference + split cell, preserved ungated as
`bun packages/sim/scripts/battle-telemetry.ts --smoke`, reads `11/42 (26.2%)`,
`345 / 1102 / 3992` mm, minimum `31` cells, duration `9.08s..45.00s`, 14/14
bounds `ok`. `bun run fixture-audit` reproduces cells A/B/C/D `11 / 8 / 7 / 5`
of 42 with attribution `+14.3 / +7.1 / +7.1 / +2.4` and the same-doctrine delta
`580/1680 (34.5%)` → `370/1680 (22.0%)` = `+12.5` points. `bun run balance`
reproduces `370/1680 (22.0%)` with 33/33 gates `ok`. Frozen hash from
`bun run verify`: `0xff6f3d62`.

**Named artifact:** `gale_moth v emberwing`, seed `20261146` — 45.00 s cap,
`0-0` blows, `0-0` commits, `100.0%` idle, gap `724/1054/3984` mm, `26-33`
cells. Derived geometry: reach edge `785` mm, safe floor `865` mm
(`opponentReachMm + REACH_STANDOFF_MM(80)`), band floor `865` mm, hold point
`865` mm. It is the only zero-commit fight in the 42-fight representative gate
(the other three fixture cells have `0/42`). Full baseline evidence:
`verification/phase-1.md` and gitignored
`.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/baseline/**`.

## 3. Resonance inventory (Phase 1)

### 3.1 Frozen rule and constants

Exact detection rule, applied without widening:
`commits[0] === 0 && commits[1] === 0 && idle === 1 && contact === 0`.
A zero-commit stall missing any predicate is a near-resonant **note**, never an
event; both samples report `near-resonant-notes=0`. All measurements use
`statBasis="midpoint"`, `doctrine="press"`, `REACH_STANDOFF_MM=80`, speed `14/14`,
`DECISION_MS=240` (`DECISION_STEPS(12) × STEP_MS(20)`), `FIGHT_CAP_MS=45000`.

### 3.2 Representative-42 event

`fights=42`, `resonance=1 (2.4%)`, `near-resonant-notes=0`, `caps=5 (11.9%)`.
Scanner assertion `gale_moth v emberwing @ 20261146 only event -> YES`.

| Field | Value |
| --- | --- |
| Pairing / seed | `gale_moth v emberwing` @ `20261146` |
| Stat basis / doctrine | `midpoint` / `press` |
| Speed (home / away) | `14 / 14` |
| Reach edge | `785` mm |
| Safe floor / band floor / hold | `865` / `865` / `865` mm |
| Gap min / median / max | `724 / 1054 / 3984` mm |
| Decision gaps total | `187` |
| Sampled gaps (head) | `[3418,2770,2122,1474,826,1270,1372,1372,826,1270,826,1270]` |
| Sampled gaps (tail) | `[1270,826,1270,826,1270,826]` |
| Commits / idle / contact | `0 / 0` / `1` (100%) / `0` |
| Duration / reason | `45000` ms (`45.00s`) / `time` |

### 3.3 Matrix-1680 events (all 12)

`fights=1680`, `resonance=12 (0.7%)`, `near-resonant-notes=0`, `caps=370
(22.0%)`. Every row shares `statBasis=midpoint`, `doctrine=press`, speed `14/14`,
commits `0/0`, idle `1`, contact `0`, duration `45000` ms, reason `time`.

| # | Pairing | Seed | Edge | Floor / Hold | Gap min/med/max (mm) |
| --- | --- | --- | --- | --- | --- |
| 1 | `electric_hound v gale_moth` | `20261109` | `840` | `920` / `924` | `724/1054/3984` |
| 2 | `electric_hound v gale_moth` | `20261112` | `840` | `920` / `924` | `724/1042/3984` |
| 3 | `electric_hound v emberwing` | `20261109` | `845` | `925` / `929` | `724/1054/3984` |
| 4 | `electric_hound v emberwing` | `20261112` | `845` | `925` / `929` | `724/1042/3984` |
| 5 | `gale_moth v electric_hound` | `20261109` | `840` | `920` / `924` | `724/1054/3984` |
| 6 | `gale_moth v electric_hound` | `20261112` | `840` | `920` / `924` | `724/1042/3984` |
| 7 | `gale_moth v emberwing` | `20261109` | `785` | `865` / `865` | `724/1054/3984` |
| 8 | `gale_moth v emberwing` | `20261112` | `785` | `865` / `865` | `724/1042/3984` |
| 9 | `emberwing v electric_hound` | `20261109` | `845` | `925` / `929` | `724/1054/3984` |
| 10 | `emberwing v electric_hound` | `20261112` | `845` | `925` / `929` | `724/1042/3984` |
| 11 | `emberwing v gale_moth` | `20261109` | `785` | `865` / `865` | `724/1054/3984` |
| 12 | `emberwing v gale_moth` | `20261112` | `785` | `865` / `865` | `724/1042/3984` |

All twelve involve only `electric_hound`, `gale_moth` and `emberwing`, at matrix
seeds `20261109` and `20261112`, each pairing in both orientations. Matrix cap
equivalence `370/1680` vs `bun run balance` `370/1680` → **PASS**. The gitignored
scanner ran twice with byte-identical output (SHA-256
`FB052240E2440E2FC0DF7A5EC2A46BA089CB87115BD351B3A880861421F122F3`).

### 3.4 Counts, rates and uniqueness

- Representative gate: **1/42 (2.4%)**.
- Matrix: **12/1680 (0.7%)**.
- `gale_moth v emberwing @ 20261146` is the sole representative event and does
  **not** recur in the matrix (whose seeds are `20261109..20261112`); the matrix
  still contains `gale_moth v emberwing` at `20261109` and `20261112`.

## 4. Mechanism decomposition (Phase 2)

First-class replay of all 13 events from public exports only; full output
`mechanism/trace-run.txt` (360 lines), summarized in `verification/phase-2.md`.

**Shared cadence mechanism.** `threatBandFor` (`controller-reach.ts`) lifts the
press safe floor to `opponentReachMm + REACH_STANDOFF_MM (80)`. One decision is
`DECISION_MS=240 = DECISION_STEPS(12) × STEP_MS(20)`. Replay reports
`safeFloor=865`/`bandCeiling=1177` for the `785`-mm edge, `920`/`1260` for `840`,
and `925`/`1267` for `845`. The opening advance closes `4000 → 1474` mm by
`t=960`; thereafter retreat ticks sample below the floor (`826` / `881` / `886`
mm) and advance ticks above the ceiling (`1270`–`1372` mm). Observed per-tick
gap-delta set: `{-648,-582,-546,-444,-102,0,102,444,546}` mm. No tick lands in
`[floor .. ceiling]`.

**All 13 events:** `decisions=188`, `skipped=0`, `replayFinalStep=2250`
(`45000/20`), `inBandTicks=0`, `commitOrders=0`. Verb censuses contain only
`advance` and `retreat` (strafe/hold/commit/dodge/slip all `0`). Representative
event `advance=183 / retreat=170`, hp `146/150`; matrix events `181/169` at seed
`20261109` and `179/172` at `20261112`, with the trio's hp pairs as tabulated in
`verification/phase-2.md` §4.2. Verdict for every event: **CADENCE RESONANCE,
NOT a stat-bound violation**.

**Why pooled gates stay green.** Idle `30.3%`, contact `10.3%`, exchange
`0.35/0.34/s` and cap share `11.9%` are 42-fight means; one fully idle fight is
≈`2.4%` of the mean. The matrix cap share stays `22.0%` inside the D-1 `≤1/3`
fence. Frozen bounds reproduced in force: gate `5/42`, 14/14 bounds, min `19`
cells; matrix `370/1680`, 33/33 gates. No bound, fence, band or sample moved.

## 5. Ranked owner-facing options — decision deferred

| Rank | Option | Knob / location | Cost | Risk | Reopens |
| --- | --- | --- | --- | --- | --- |
| 1 | **O0 — Tolerate (AC-11)**, baseline | none | zero | zero | nothing |
| 2 | O2 — Reach standoff adjustment | `REACH_STANDOFF_MM(80)`, `controller-reach.ts:26` | low edit, high validation | high | D-2 + product.md pacing; new product decision |
| 3 | O3 — Safe-floor / hold spacing | press band table, `controller-profile.ts` | low edit, high validation | high | D-1/D-2 + product.md; new product decision |
| 4 | O1 — Per-pair/per-body cadence jitter | `DECISION_MS` / `nextDecisionMs`, `controller-state.ts` + `controller.ts` | medium | medium-high | product.md; may move species bands; new product decision |
| 5 | O4 — Stateful range memory / hysteresis | `controller.ts` band/retreat block (~257–308) + `controller-state.ts` | high | highest | D-1..D-4 + product.md; explicit product decision |

O0 is the only zero-cost, zero-risk option and reopens nothing. Every
alternative needs a new product decision and reopens at least one fence.
Rejected precedent, cited as evidence only and **not** re-proposed: global
`DECISION_MS 240→200` reached `13/42` fixture / `188/840` matrix caps but broke
four species bands (`fire_drake` 59.8% > 59.4%, `plant_ox` 62.5% > 59.6%,
`voltfox` 39.3% < 40.7%, `shalemole` 60.7% > 59.5%); `220` gave `21/42`; all
rungs were reverted. **The owner decides whether to tolerate under AC-11 or
authorize a controller-family change. This track implements none of O0–O4.**

## 6. Check-suite command table and freeze proof (Phase 3)

Every command was issued separately with no pipe, `&&` chain, wrapper binary, or
Code Mode workaround. The four commands initially denied to the subagent were
run unchanged by the primary and exited 0; their first-class readings are in
`.conductor/runs/20261124-controller-cadence-resonance-diagnostic/phase-3-primary-outputs.md`.
Exact exit codes and raw captures are under gitignored
`.conductor/evidence/20261124-controller-cadence-resonance-diagnostic/final/**`.

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| suite | `bun run verify` | 0 | 4462 pass / 1 skip / 0 fail, 4463 tests / 437 files (109.40 s); Biome 1038 files clean; voxel determinism OK (21 species × 3 stages + 5 props); trace 5/5 invariants; hash `0xff6f3d62`; gate `5/42`, matrix `370/1680`; no timeout. |
| build | `bun run build` | 0 | Vite production client build, 438 modules, 512 ms; only the pre-existing >500 kB chunk advisory. |
| balance | `bun run balance` | 0 | `370/1680 (22.0%)`; 33/33 gates `ok`; reference line `580/1680 (34.5%)`. |
| determinism | `bun run gate:determinism` | 0 (primary fallback) | All 21 species × 3 stages regenerated byte-identical; 5 props seed-42 digests match (tuft 100 tris, bush 462, broadleafTree 1264, rock 52, foodPile 232). |
| fuzz | `bun run test:fuzz` | 0 (primary fallback) | `APEX_FUZZ_SWEEP=full` voxel fuzz; 139 pass / 0 fail, 129015 expect() calls, 139 tests across 135 files [57.01s]. |
| telemetry | `bun run telemetry` | 0 | Cap `5/42 (11.9%)`; `340/946/6061` mm; 14/14 bounds `ok`; row 39 is the named artifact. |
| smoke | `bun packages/sim/scripts/battle-telemetry.ts --smoke` | 0 (primary fallback) | `SMOKE: historical reference + split sample (ungated)` header; cap `11/42 (26.2%)`; engagement `345/1102/3992` mm; positions min `31`; duration `9.08s..45.00s`; all 14 bounds `ok`. |
| audit | `bun run fixture-audit` | 0 (primary fallback) | Cells A/B/C/D `11/8/7/5` of 42; attribution `+14.3/+7.1/+7.1/+2.4`; same-doctrine `580/1680 (34.5%)` → `370/1680 (22.0%)` = `+12.5` points. |
| freeze | `git diff --check dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD` | 0 | No whitespace error. |
| freeze | `git diff --quiet dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages apps` | 0 | Empty source diff. |
| scope | `git status --porcelain` | 0 | Empty before and after the sweep. |

Frozen facts unchanged: hash `0xff6f3d62`; gate `5/42 (11.9%)`, smoke `11/42
(26.2%)`, matrix `370/1680 (22.0%)`; D-1 `≤1/3` fence; audit `11/8/7/5` and
`+12.5`; resonance `1/42` and `12/1680`; no near-resonant notes; matrix cap
equivalence PASS; byte-identical scanner reruns. No `BOUNDS`, `CAP_MAX`,
D-1 fence, sample/seed/stride, smoke semantics, species band, controller
constant, reach table, body profile, `SIM_VERSION`, module cap, dependency,
allowlist, or deployment was changed.

## 7. Scope proof

- `git diff --quiet dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD -- packages
  apps` exit 0; `git diff --check` exit 0; `git status --porcelain` empty.
- `git diff --name-status dcbe314a5a4cea813e424f350e2490bf9f99165f..HEAD` shows
  only `M conductor/tracks.md` and added files under the track's `index.md`,
  `metadata.json`, `plan.md`, `spec.md`, `verification/phase-1.md` and
  `verification/phase-2.md`. No `packages/`, `apps/`, manifest, schema, API,
  config, dependency, allowlist or credential change. The additional tracked
  files written by this phase are its two verification reports plus one dated
  note in `conductor/product.md`.
- `git branch --list` shows only `chore/20261124-controller-cadence-resonance-
  diagnostic` and `main`. `git ls-remote --heads origin` (read-only) shows
  `refs/heads/main = dcbe314a5a4cea813e424f350e2490bf9f99165f`, unchanged; no
  chore branch for this track on the remote. No push, fetch, pull, merge, rebase,
  reset, clean, switch, checkout, tag, stash, or ref mutation was executed.
- Scratch is confined to `.conductor/evidence/20261124-controller-cadence-
  resonance-diagnostic/**`, gitignored at `.gitignore:3`.

## 8. Acceptance criteria (AC-1..AC-10)

| AC | Result | Evidence |
| --- | --- | --- |
| AC-1 frozen baseline reproduced | satisfied | §2 and §6: telemetry `5/42`, smoke `11/42`, audit `11/8/7/5` / `+12.5`, balance `370/1680`, hash `0xff6f3d62`. |
| AC-2 deterministic gitignored scanner | satisfied | §3: two byte-identical runs, SHA-256 `FB0522…F122F3`; matrix cap equivalence PASS. |
| AC-3 per-event inventory | satisfied | §3: all fields for 1 gate + 12 matrix events with counts/rates and the uniqueness statement. |
| AC-4 per-event mechanism decomposition | satisfied | §4: first-class tick traces, gap deltas, verb censuses, `inBandTicks=0`, `commitOrders=0`, verdict per event. |
| AC-5 ranked options, tolerate baseline, no implementation | satisfied | §5: O0 baseline, O1–O4 ranked, rejected precedent as evidence only, none implemented. |
| AC-6 full configured check suite green at frozen readings | satisfied | §6: all configured checks exit 0, including four run unchanged by the primary after subagent denial (determinism byte-identical, fuzz 139 pass / 0 fail, smoke `11/42`, audit `11/8/7/5` / `+12.5`); hash `0xff6f3d62`. |
| AC-7 gate/smoke/matrix/audit truth unchanged | satisfied | §2 and §6: gate `5/42`, smoke `11/42`, matrix `370/1680`, audit `11/8/7/5` / `+12.5`, hash `0xff6f3d62`; smoke and audit re-confirmed by primary fallback. |
| AC-8 scope and freeze proven | satisfied | §6–§7: source diff empty, `diff --check` 0, clean worktree, Conductor-artifact-only diff, remote heads unchanged; the deferral of the tolerate-vs-change decision to the owner is unchanged and was not exercised. |
| AC-9 decision handed back with dated product pointer | satisfied | §5 is complete; the single dated `conductor/product.md` note was applied by the primary and committed at `2879fd0b`. No product direction changed. |
| AC-10 no fix / re-pin / bound / gate / sample change | satisfied | §5–§7: no option implemented; no bound, gate, sample, controller constant, dependency or deployment touched; denied commands reported, not worked around. |

AC-11 (owner tolerates the named artifact) remains the owner's call; this track
does not exercise it as a fix.

## 9. Historical note — resolved permission denials

Four configured commands were initially denied by the subagent permission layer
(`bun run gate:determinism`, `bun run test:fuzz`, the `--smoke` telemetry command,
`bun run fixture-audit`), as was the `edit` call inserting the single dated note
into `conductor/product.md`. None was retried, rephrased, or worked around by the
subagent. The primary ran each command unchanged and separately with all exits
0, and applied the verbatim note with a scoped, count-checked edit. No blocker
remains; this mirrors the resolved pattern in `verification/phase-1.md` §8 and
`verification/phase-2.md` §8. No runtime, bound, fence, sample, gate, controller
constant, dependency, allowlist, or deployment was changed by the fallback. No
other deviation: tracked writes by this subagent are limited to this report and
`verification/phase-3.md`; scratch is confined to the gitignored `final/**` path.

## 10. Final verdict

**VERIFIED.** The full configured check suite is green at the frozen readings
and the source diff is empty with hash `0xff6f3d62`; the resonance inventory,
mechanism, and ranked options are fully documented. The four initially denied
commands were run unchanged by the primary and exited 0, and the dated
`product.md` note was applied and committed at `2879fd0b`; all denials are
resolved. No fix, bound re-pin, gate change, sample change, or product decision
was made; the tolerate-vs-change question is explicitly deferred to the owner.
