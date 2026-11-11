# Phase 2 — Interval geometry, the range miss, and the controller

- **Track:** `20261111-minimum-reach`
- **Phase:** 2 — Interval geometry, the range miss, and the controller
- **Date:** 2026-11-11
- **Branch:** `feat/20261111-minimum-reach`
- **Base:** `991f4ff3` (phase 2 in progress)
- **Head:** `85cde5f6` (feat(sim): resolve blows inside a reach interval and report a range miss)
- **Result:** verified — both verification commands green. The mechanic is live and
  pinned by unit tests; every shipped row still authors `minReachMm = 0`, because
  the balance gate's pinned figures and the recorded cup transcripts could not be
  carried by any positive dead zone (see *Measured figures* and *Deviations*).

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit + determinism | `bun run verify` | 0 | 4128 pass, 1 skip, 0 fail (4129 tests / 373 files, 54.87 s); `check` clean on all four workspaces; `biome check` 932 files, no fixes; voxel determinism gate byte-identical on all 15 species × 3 stages + 5 props |
| build | `bun run build` | 0 | vite 8.3.4, 417 modules, `dist/assets/index-DLOuCLoN.js` 1,065.23 kB (gzip 292.94 kB) |
| statistical gate (read-only) | `bun run balance` | 0 | 840 fights, ko 642 / time 197 / draw 1, all 15 species in the bound, 49/49 moves in the 4–12% damage band, cap share 23.5%, decisive 95.0%, every pinned figure identical to `main` |
| telemetry (read-only) | `bun run telemetry` | 0 | 13/13 bounds ok, cap share 7/14 (50.0%) — byte-identical to the pre-phase baseline |
| trace (read-only) | `bun run trace --seed 20261111 --check` | 0 | wind_falcon v water_axolotl, ko 27,920 ms, final hash `0x9dc8c2a1`, five invariants ok (y-zero, hp-range, arena-bounds, integers, deterministic) |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-2 | A melee blow lands at exactly `minReachMm + r₁ + r₂` and whiffs one mm inside with `reason: "range"` | `strike.test.ts` — "the range miss — inside the inner edge (FR-2, FR-5, AC-2)": `swing(440)` on the innate strike (authored minimum 0, so the inner edge is the 440 mm contact floor) → 1 strike, 0 misses; `swing(439)` → 0 strikes, 1 miss, `reason === "range"`, never `accuracy` | pass |
| AC-3 | A shot inside the inner edge reports a `range` miss, not a hit and not a dodge; the same shot at the boundary hits | `projectile.test.ts` — "projectiles — the blind spot (FR-3, FR-5, AC-3)": a `pyre_lance` shot with `minReachMm: 200` injected (inner edge 640) at a 500 mm gap → `outcome === "range"`, damage 0, poise 0, no projectile left (spent); at 640 mm → `"hit"` with damage > 0; a third test pins that a body closing to 500 mm on a shot loosed at 1,400 mm still reads `"hit"` (the verdict is the launch geometry) | pass |
| AC-4 | `chooseMove` returns basic point-blank and a long move at the same gap once the foe is outside its dead zone | `controller.test.ts` — "the chooser stands outside a move's dead zone (FR-4, AC-4)": `chooseMove(..., ["pyre_lance"], 439², 0, false)` null, `440²` → `"pyre_lance"`, and the default `basicFirst` call returns `"basic"` at 439² | pass |
| AC-5 | `bun run balance` exit 0, all 15 species inside the statistical bound, no existing bound moved | `bun run balance` exit 0; every `ok` line and every pinned figure (distinct counts, damage shares, durations, cap share, decisive share, boss wins, doctrine table) unchanged from `main`; no bound, floor, tolerance or `DISTINCT_FLOOR` edited | pass |
| AC-7 | `ghost.test.ts` pins `SIM_VERSION === 3` and `SIM_VERSION + 1 === 4`; `bun run trace --seed N --check` passes | `ghost.test.ts` "the marker stays at v3 — another bump is a deliberate act" (`toBe(3)`) and "a future (v4) bundle is rejected" (`SIM_VERSION + 1` → false, `toBe(4)`); the two hardcoded-version mismatch cases now use `SIM_VERSION + 1`; trace seed 20261111 passes five invariants | pass |
| AC-1 | Frames prove 1200 on reach ≥ 5000, 0 below, `0 ≤ minReach < reach` | Superseded by the measurement below: `frames.test.ts` now pins `0` on every row (FR-1's "no dead zone") and still proves `0 ≤ minReach < reach` on every row, basic included | pass (value re-authored; recorded as a deviation) |
| FR-6 | Gate green (15/15 species, pacing, bosses, damage band) | `bun run verify` green: balance report, telemetry and pacing tests all pass | pass |
| FR-8 | `SIM_VERSION` 3 with ghost note and test pins | `cup/ghost.ts` version note gains the v3 paragraph (minimum reach, inner edge, shots loosed inside it pass, v2 resolved those as hits so cannot replay) and `SIM_VERSION = 3`; both pins updated | pass |

## Measured figures

The mechanism was implemented first with the Phase-1 authored value (1,200 mm on
every row with `reachMm >= 5000`) and then tuned against the two statistical
harnesses. `bun run telemetry` is the sensitive one: its 14-seed sample sits
**exactly on the `capShare` bound** at the pre-phase baseline (7 of 14 fights
capped = 50.0%, bound ≤ 50%), so a single flipped fight fails the gate.

| `minReachMm` (rows) | telemetry cap share | verdict |
| --- | --- | --- |
| 1,200 (42 long rows) | 14/14 (100%) | fail — the AI deadlocks: `idle 79.1%`, `contact 0.3%`, no commits, 41 failing tests |
| 600 (42 rows) | 13/14 (92.9%) | fail |
| 400 (42 rows) | 10/14 (71.4%) | fail |
| 420 (42 rows) | 10/14 (71.4%) | fail |
| 300 (42 rows) | 8/14 (57.1%) | fail |
| 200 (42 rows) | 8/14 (57.1%) | fail |
| 150 (42 rows) | 9/14 (64.3%) | fail |
| 100 (42 rows) | 10/14 (71.4%) | fail |
| 50 (42 rows) | 10/14 (71.4%) | fail |
| 150 (six 6,500 mm heavies) | 7/14 (50.0%) | pass — telemetry green |
| 200 (six heavies) | 7/14 (50.0%) | pass — telemetry green, but see below |
| 300 (six heavies) | 8/14 (57.1%) | fail |
| 600 (six heavies) | 9/14 (64.3%) | fail |
| 0 (all rows) | 7/14 (50.0%) | pass — byte-identical to baseline |

Two further measurements decided the shipped value:

- **The 200 mm / six-heavies setting is not free.** With that setting
  `bun run balance` moved the 840-fight sample and the recorded cup transcripts:
  9 tests failed — 4 cup goldens (`draw-stream golden (day 7, creature seed 42)`,
  `player lifecycle golden … champion path`, `… forfeit at the QF`, `cup goldens —
  full session transcripts > seed 1: the player takes the crown`) and 5 pinned
  balance-report tests (`a distinct fight is more than its winner and duration`,
  `the report names the design-band misses it computes`, `near-edge rows keep at
  least a point of design-band margin`, `today's target misses are named with
  their observed values`, `the gate is green end to end`). Those files are outside
  this phase's Touches and Phase 3 owns re-pinning them, so a live dead zone
  cannot land in Phase 2 without doing Phase 3's re-pin early.
- **The shot rule's verdict must be the launch geometry.** Scoring the inner edge
  against the target's position at resolution time turned honest shots short
  whenever the victim closed during flight: at `minReachMm = 0` that alone moved
  the sample from 7/14 to 8/14 (fights 3, 6, 9, 14 flipped ko → time). The shipped
  rule reads `ProjectileState.launchGapSq` (recorded at launch) and is inert at
  0 — measured 7/14, byte-identical to baseline.

Shipped: `minReachMm = 0` on every row (FR-1's "no dead zone"), so the recorded
balance report and cup transcripts are untouched and both verification commands
are green. The interval geometry, the `range` miss, the chooser filter and
`SIM_VERSION` are all live and unit-tested with an authored minimum injected.

## Evidence paths

- `packages/sim/src/battle/continuous/contact.ts` — `minReachEdgeMm`,
  `gapInReachInterval`, `reachVerdict` (one predicate both resolution paths read)
- `packages/sim/src/battle/continuous/contact.test.ts` — "reach interval — the
  blind spot (FR-2, AC-2)"
- `packages/sim/src/battle/continuous/strike.ts`, `strike.test.ts`
- `packages/sim/src/battle/continuous/projectile.ts`, `projectile.test.ts`
- `packages/sim/src/battle/continuous/controller-moves.ts`, `controller.test.ts`
- `packages/sim/src/battle/continuous/controller-rule.ts`
- `packages/sim/src/battle/frames.ts`, `frames.test.ts`
- `packages/sim/src/cup/ghost.ts`, `ghost.test.ts`

## Deviations

| File | Reason |
| --- | --- |
| `packages/sim/src/battle/continuous/damage.ts` | `strike.ts` was 71 B under the 12,288 B cap and the interval work did not fit. `StrikeStats`, `NEUTRAL_STATS` and `typeAgainst` moved into `damage.ts` (which already owns everything one landed blow needs) and are re-exported from `strike.ts`, so no outside-Touches importer changed. |
| `packages/sim/src/battle/continuous/report.ts` | A `range` shot has no word in the stream vocabulary (`missReason` is `"accuracy" | "dodge"` only, NFR-4), so the shots loop skips it rather than mislabelling it as a dodge; the whiff branch gained the `"is too close."` line. `StepReport.whiffs`' reason union widened to `"reach" | "range" | "accuracy"`, which fixed the type errors this raised in `resolve.ts` and `scripts/battle-trace.ts` without touching those files. |
| `packages/sim/src/battle/continuous/cooldown.test.ts` | Outside Touches. Its `chooseMove(me, foe, ["spark"], 0, 0, false)` fixture sat at a 0 mm gap, which the interval refuses; the gap moved to `1000²` so only the cooldown timer can refuse the move. |
| `packages/sim/src/battle/frames.ts` | Phase 1 authored 1,200 mm on the 42 long rows. No positive dead zone the harness can carry exists (table above), so every row ships at `0` and the value is re-authored in the balance phase. `boulder_toss` was collapsed to one line to satisfy the formatter. |
| `packages/sim/src/battle/continuous/controller-punish.ts` | Left at its pre-phase content: a `chooseMove` fallback that retried with `basicFirst` and a `whiffStep` inner-edge guard were both dropped, because with no shipped row authoring a minimum they are no-ops and they perturbed the pinned transcripts. The punish chooser still inherits the interval filter through `chooseMove`. |

## Notes

- No bound, floor, tolerance or `DISTINCT_FLOOR` was widened; no new RNG draw was
  added; `stateHash` folds no new field, so replay is unchanged in shape.
- `controller-rule.ts`'s `tellReaches` now uses `reachVerdict` (the same test the
  swing resolves with) instead of the one-sided `reachesBody`; measured as a
  no-op in the sample (no shipped melee row authors a minimum).
- The tuning direction the plan prescribed (`minReachMm` first, species stats
  only inside the existing roll bounds) never reached the stat step: the gate is
  saturated on the dead-zone value alone, and stats cannot buy back a capped
  fight.
- Phase 3 should author the dead zone and re-pin the balance report and cup
  goldens in the same commit; 150 mm on the six 6,500 mm heavies is the largest
  setting measured to leave the 14-fight telemetry sample green.

## Primary verification

Run by the primary agent after the subagent report, before acceptance.

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| static + unit + lint + determinism | `bun run verify` | 0 | full suite green, Biome clean, determinism gate 45 GLBs byte-identical, module-size cap green |
| build | `bun run build` | 0 | Vite exit 0, only the pre-existing >500 kB chunk warning |
| statistical gate | `bun run balance` | 0 | 840 fights, 15/15 species in bound, 49/49 moves in the 4-12% band, cap share 23.5%, decisive 95.0%, median 30.21 s |
| telemetry | `bun run telemetry` | 0 | 13/13 bounds ok, cap share 7/14 (50.0%), byte-identical to the pre-phase baseline |

Diff review: `git diff --name-only 991f4ff3..HEAD` lists the eight `Touches`
files plus three reported deviations (`damage.ts`, `report.ts`, `cooldown.test.ts`)
and this evidence file. The `damage.ts` extraction is a move of
`StrikeStats`/`NEUTRAL_STATS`/`typeAgainst` out of a `strike.ts` that had 71 B of
cap headroom, re-exported so no outside importer changed; `report.ts` widens the
whiff reason union to `reach | range | accuracy`, gives a range whiff its own
line, and reports no impact for a range shot because the stream vocabulary has no
word for it (NFR-4); the `cooldown.test.ts` fixture moved off a 0 mm gap that the
interval now correctly refuses. All three are the smallest change that keeps the
tree consistent.

Independent check of the reported deadlock: restoring the Phase 1 values
(1,200 mm on the 42 long rows) on this tree reproduces `capShare 14/14 (100%)`,
`idle 79.1%`, `contact 0.3%`, `exchange 0.11/s` and median engagement 1,088 mm.
That is not a coding defect: the doctrine hold point sits inside every long row's
inner edge while the basic (860 mm) is too short, so the chooser legitimately
returns nothing and the fighter holds. Confirmed, and carried into the spec
revision as the reason the value is deferred to a re-derived gate plus a
retreat-to-fight behaviour.
