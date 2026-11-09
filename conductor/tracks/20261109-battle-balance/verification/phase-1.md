# Phase 1 — Doctrines

Track: `20261109-battle-balance` · Branch: `feat/20261109-battle-balance` ·
Base: `main` @ `d36d5995` · Date: 2026-11-09

Covers FR-11, FR-12, FR-15, FR-16; AC-11, AC-12, AC-15.

## Commands

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `bun run verify` | 0 | typecheck 0 errors (voxel 160, sim 212, server 44, client 501 files); 3849 pass, 1 skip, 0 fail, 459,281 expects, 356 files; Biome 890 files no fixes; determinism gate OK |
| 2 | `bun run build` | 0 | vite 8.3.4, 399 modules, `dist/assets/index-Bd7r-xOL.js` 1,046.67 kB (gzip 286.45 kB), 367 ms |

Run as two separate commands, in this order.

## Doctrine table

Frozen in `packages/sim/src/battle/continuous/controller-profile.ts`.
Bands are permille of the pair's reach edge
(`basic reach 420 + own radius + foe radius`; the reference edge is
`REFERENCE_REACH_EDGE_MM = 860`). Values below show permille → mm at the
reference edge; live bands scale with the pair's own edge via `bandFor`.

| id | label | floor ‰ | hold ‰ | ceiling ‰ | floor mm | hold mm | ceiling mm | aggression | strafe | dodge mm | commit | seeks rear |
|----|-------|--------:|-------:|----------:|---------:|--------:|-----------:|-----------:|-------:|---------:|--------|-----------|
| press | Press | 1000 | 1200 | 1400 | 860 | 1032 | 1204 | 85 | 10 | 2200 | always | no |
| circle | Circle | 1150 | 1425 | 1700 | 989 | 1225 | 1462 | 65 | 45 | 2600 | always | yes |
| kite | Kite | 1450 | 1750 | 2050 | 1247 | 1505 | 1763 | 40 | 30 | 3200 | always | no |
| counter | Counter | 1150 | 1400 | 1650 | 989 | 1204 | 1419 | 55 | 30 | 2800 | punish | no |

- `floorMm`/`ceilingMm` are clamped to the pair's reach edge, so no doctrine
  orders a body inside its own reach.
- `profileForDoctrine(doctrine, temperament)` fixes the band from the doctrine
  alone. Temperament moves only aggression, strafe bias, and dodge threshold.
- `Counter` holds its press slot while the foe is in `startup` and commits
  otherwise, so counter-vs-counter cannot deadlock.
- `Circle` commits immediately from the rear arc (`rearArc`, dot < −0.9 of the
  foe's facing), before the dodge gate.

## Precedence (FR-12)

| Layer | Owns | Where |
|-------|------|-------|
| Doctrine | range floor / hold / ceiling, strafe intent, dodge policy, commit policy, rear-arc seeking | `DOCTRINES`, `bandFor`, `profileForDoctrine` |
| Temperament | aggression, strafe bias, dodge threshold inside the doctrine band | `TEMPERAMENT_SHADE`, `profileForDoctrine` |
| Controller | cadence, commitment lock, reactive dodge gate, cycle slots | `decide` |

`TEMPERAMENT_SHADE`: rush `{aggression +10, strafe −5, dodge +400}`,
slow `{−10, +5, −400}`, obedient `{0, 0, 0}`. Aggression/strafe are clamped
0–100 and dodge at 0, but floor/hold/ceiling are copied from the doctrine and
cannot move.

## Legacy mapping (FR-3 boundary; Phase 5 removes the names)

`BattleSide.tactic` remains `Tactic` from `policy.ts` and stays persisted.
`Doctrine` is additive.

| Legacy tactic | Doctrine |
|---------------|----------|
| `balanced` | `press` |
| `specials` | `kite` |

`doctrineForTactic(tactic)` performs the boundary mapping;
`tacticForDoctrine(doctrine)` is the reverse used where a legacy call site
still needs a `Tactic` (`circle`/`kite` → `specials`, `press`/`counter` →
`balanced`). `resolveContinuous` prefers an explicit `side.doctrine` and falls
back to the mapping, so old saves and old call sites compile and resolve.

## AC table

| AC | Named test | File | Result |
|----|-----------|------|--------|
| AC-12 | "every temperament on a doctrine keeps its floor, ceiling, and hold" | `packages/sim/src/battle/continuous/doctrine-probe.test.ts` | pass |
| AC-12 | "rush and slow on the same doctrine stay inside its band" | same | pass |
| AC-12 | "a rush creature on Kite still kites, harder not closer" | same | pass |
| AC-12 | "the shade moves aggression, strafe, and dodge, never the band" | same | pass |
| AC-11 | "Circle strafes toward the foe's back, Press does not" | same | pass (intent level) |
| AC-11 | "Circle holds a closer band than Kite on the same pair" | same | pass |
| AC-15 | "a fighter with a doctrine shows it beside the name" | `apps/client/src/battleHud.test.ts` | pass |
| AC-15 | "all four doctrines have a label" | same | pass |
| AC-15 | "a fighter with no doctrine shows only the name" | same | pass |
| FR-11 | "the four doctrines are frozen, named, and ordered" | `doctrine-probe.test.ts` | pass |
| FR-11 | "bands scale from the pair's reach edge" | same | pass |
| FR-3 | "legacy tactics map onto doctrines, both ways" | same | pass |

### AC-11 measurement (limitation)

AC-11's literal wording is "Circle lands strictly more rear hits than Press on
the same matchup and seed". The intent half is implemented and tested; the
landed-hit half was measured and is **not met**:

- `makeExhibition(owned, "balanced", seed, "press" | "circle")` on
  fire_drake, seeds 1–12, resolved with `resolveContinuous`; hits classified
  with `hitPosition` from the HP drops in `streamOf`.
- Press: 14 front, 0 flank, 0 rear (seed 1). Circle: 15 front, 1 flank, 0 rear
  (seed 1). Rear = 0 for every seed and both doctrines.
- Direct controller probes show the same: the rear arc is reached only in the
  opening approach (10 frames / 1 decision, gap ≈ 3,760 mm), and by the time
  the pair is inside melee range the victim has turned.

Cause (measured, not inferred): `faceOpponent` re-tracks the foe every step at
`TURN_UNITS_PER_STEP = 50` (≈ 2.9°/step). A walking strafe at a 1,000 mm gap
moves ≈ 23.6 mm/step (≈ 1.35°/step), so it cannot out-turn the facing; only a
dodge burst (≈ 4.05°/step) can, and bursts are short and stamina-priced. A
rear hit needs more than 120° off the front (`FLANK_COS = 1/2`), and
`hitPosition` is evaluated at impact against the facing tracked through the
swing's startup. Experiments with closer Circle bands (down to floor 500 ‰), a
proactive rear-seeking burst, and rear-gated commits all produced 0 rear hits
and often starved Circle's attacks. Making the literal metric reachable needs
a mechanics decision outside this phase's touch list (e.g. capping turn rate
during startup/recovery, evaluating hit position at startup, or allowing a
lateral slip to carry a body past the foe's facing) — that is a Phase 3/8
decision, so it is reported rather than guessed.

## Re-pinned expectations (only rows the doctrine execution forced)

`packages/sim/src/cup-contracts.test.ts`

- Draw stream, seed 101: first winner `Reedle Mirefin` → `Tidecaller Nibbles`.
- `playToCompletion` seed 3, specials: renamed "champion path: seed 3,
  specials — placement 1"; champion `Ember Drake`, 3 verdicts, placement 1.
- `playToCompletion` seed 11, specials: renamed "final loss: seed 11,
  specials — placement 2, champion via completeCup"; 3 verdicts, placement 2,
  `completeCup` champion `Emberhold Flicker`, 0 completion rows.
- Forfeit at QF, seed 101: champion `Reedle Mirefin` → `Mossbottom Brute`;
  completion rows →
  `[[2,"Bonfire Brook","Tidecaller Nibbles","Bonfire Brook"],[3,"Bonfire Brook","Mossbottom Brute","Mossbottom Brute"]]`.
- Day 14, seed 101: first rival winner → `Tidecaller Nibbles`.

`packages/sim/src/cup.golden.test.ts`

- Seed 17: rival SF row → `[2,"Ash-ledger","Thistledown Ash","Ash-ledger","Ash-ledger takes the Semifinal!"]`;
  player final opponent → `Ash-ledger`.
- Seed 7 (final lost): champion → `Tidecaller Nibbles`; rival SF row →
  `[2,"Cindersnout","Tidecaller Nibbles","Tidecaller Nibbles","Tidecaller Nibbles takes the Semifinal!"]`;
  player final row →
  `[3,"Ember Drake","Tidecaller Nibbles","Tidecaller Nibbles","Tidecaller Nibbles takes the Final!"]`.
- Forfeit seed 101: champion → `Tidecaller Nibbles`; QF1 row →
  `[1,"Tidecaller Nibbles","Reedle Mirefin","Tidecaller Nibbles","Tidecaller Nibbles takes the Quarterfinal!"]`;
  completion rows → `[[2,"Bonfire Brook","Tidecaller Nibbles","Tidecaller Nibbles","Tidecaller Nibbles takes the Semifinal!"],[3,"Tidecaller Nibbles","Mossbottom Brute","Tidecaller Nibbles","Tidecaller Nibbles takes the Final!"]]`.

`packages/sim/src/lifecycle-integration.test.ts`

- `FALCON_CUP_SEED` 2 → 1 (wind_falcon Gold-reward lifecycle no longer
  champions under seed 2).

`packages/sim/src/cup/ghost.test.ts`

- QF-exit seed 11 → 5 (seed 11 now reaches the final).

`apps/client/src/bracket-model.test.ts`

- "verdicts land on the right matches across an eliminated run": seed 11 now
  reaches and loses the final, so the expectation maps
  `qf1 = playerVerdicts[0]`, `qf2–qf4 = rivalVerdicts[0..2]`,
  `sf1 = playerVerdicts[1]`, `sf2 = rivalVerdicts[3]`,
  `f1 = playerVerdicts[2]`, winner = champion.
- `resultRows` elimination row: seed 11 → 5 (QF exit, placement 4).

`apps/client/src/cup/ghost-capture.test.ts`

- Elimination seed 11 → 5 (`completeCup` requires an eliminated player).

`apps/client/src/cup/view-models.test.ts`

- Elimination seed 11 → 5, still "out in the quarterfinal".
- `initialPicks` now expects `{loadout, doctrine: "press"}` (2 assertions).

`packages/sim/src/battle/continuous/resolve.test.ts`

- Double-KO test: single-sided `spd 27` never produced a double KO under
  doctrine-driven execution; rewritten as mirrored sides
  (`gunner()` vs `{...gunner(), name: "Reed", id: "reed"}`), `swinger` helper
  removed, and the reed hit assertion narrowed to `actorKey === "reed"`.
  `gunner()` gained `doctrine: "press"`.

`apps/client/src/spar/ghost.test.ts`

- `ghostSparSetup(..., "specials")` → `"kite"`, `"balanced"` → `"press"`
  (3 call sites).

## Measured behaviour

- `bun run trace`, seed 1 (plant_ox slow/specials vs embercub
  obedient/balanced): Kite preferred 1610 mm for this pair (row 1505, edge
  920); all 5 invariants ok.
- `bun run trace`, seed 20261111 (wind_falcon rush/specials vs water_axolotl
  obedient/balanced): Kite preferred 1417 mm (edge 810); Press preferred
  972 mm; all 5 invariants ok.
- `bun run telemetry`: 13/13 bounds pass; cap share 6/14 (42.9 %); engagement
  min 380 / median 1114 / max 3984 mm; exchange home 0.26/s, away 0.23/s;
  idle 37.9 %; contact 3.6 %; retreats 6928 / 6888; positions min 59 / median
  174; durations 10.54–40.00 s.
- Module sizes: `controller-profile.ts`, `controller.ts`, `battleHud.ts` all
  under the 12,288 B cap (`module-size.test.ts` green). `controller-profile.ts`
  was split back under the cap by moving the band constants in and trimming
  its header, not by compressing behaviour.

## Rework 1 — earning an angle

The owner chose the step-around burst plus committed facing. Both landed; the
AC-11 measurement is unchanged at 0 rear hits for both doctrines, and this
section records the numbers rather than loosening the assertion or the arcs.

### Commands (rework)

| # | Command | Exit | Result |
|---|---------|------|--------|
| 1 | `bun run verify` | 0 | typecheck 0 errors (voxel 160, sim 215, server 44, client 504); 3861 pass, 1 skip, 0 fail, 459,351 expects, 356 files; Biome 893 files, no fixes; determinism gate OK |
| 2 | `bun run build` | 0 | vite 8.3.4, 402 modules, `dist/assets/index-4xHdI7_a.js` 1,047.74 kB (gzip 286.86 kB), 411 ms |

`bun test packages/sim/src/battle/continuous` → 294 pass, 0 fail, 19,456
expects, 17 files. `bun test controller-doctrine.test.ts` → 13 pass, 0 fail,
222 expects.

### Per-state turn budget (`contact.ts`, FR-11)

Facing still locks on, but the budget depends on what the body is doing. Each
value is one exported tunable beside `TURN_UNITS_PER_STEP`; `turnBudget` picks
it from the fighter's own state and `faceOpponent` passes it to `turnToward`.

| State | Constant | Units/step | Degrees/step |
|-------|----------|-----------|--------------|
| free (no attack, no hitstun) | `TURN_UNITS_PER_STEP` | 50 | 2.86° |
| attack startup | `TURN_STARTUP_UNITS_PER_STEP` | 12 | 0.69° |
| attack active | `TURN_ACTIVE_UNITS_PER_STEP` | 0 | 0° |
| attack recovery | `TURN_RECOVERY_UNITS_PER_STEP` | 12 | 0.69° |
| hitstun | `TURN_HITSTUN_UNITS_PER_STEP` | 0 | 0° |

`contact.test.ts` proves each state differs, that active and hitstun never
pivot (`facing` unchanged after `faceOpponent`), and that startup/recovery turn
strictly less than a free body.

### The step-around cut (`controller-slip.ts`, FR-11)

| Constant | Value | Rationale |
|----------|-------|-----------|
| `SLIP_SPEED_NUMERATOR` / `DENOMINATOR` | 5 / 2 | 2.5× a walk: at the reference edge this matches the free turn budget, so angle is earned only while the foe is committed |
| `SLIP_MS` | 200 | ten fixed steps, long enough to cross a startup window |
| `SLIP_COOLDOWN_MS` | 240 | one decision, so cuts can chain but never faster than re-deciding |
| `SLIP_STAMINA_COST` | 6 | cheaper than a dodge (8), charged once per cut at the seam |

A cut is a new `MoveIntent` arm (`{ slip: Dir2 }`) moved by `movement.ts` at
`slipSpeed(spd) = trunc(topSpeed(spd) * 5 / 2)`, charged by `advance.ts` via
`spendSlip` and reported in `StepOutcome.slips` exactly like a dodge. An
unaffordable cut is refused into a hold (`paid: false`), never a free move.
`movement.test.ts` proves a cut runs at 2.5× a walk, snaps to that speed, and
covers more angle over the same window; `advance.test.ts` proves the price, the
refusal, and the one-charge-per-cut behaviour. `controller.ts` issues a cut
from the circling slots (`slipOrder`) and `controller-rear.ts` keeps Circle's
rear-arc commit; `controller-dodge.ts` holds the reactive dodge gate. The three
extractions are what brought `controller.ts` back under the 12,288 B cap
(13,977 B → under cap) without compressing behaviour.

### Measured angular gain per step

At a 1,000 mm gap and `spd 10`:

- walk: `topSpeed(10) = 1000` milli-mm/ms → 20 mm/step → `atan(20/1000)` =
  1.15°/step.
- cut: `slipSpeed(10) = 2500` milli-mm/ms → 50 mm/step → `atan(50/1000)` =
  2.86°/step.
- free facing: 50 units = 2.86°/step.

Net gain while the foe is committed (cut minus its turn budget):

| Foe state | Steps in a basic swing | Net °/step | ° earned |
|-----------|------------------------|-----------|----------|
| startup (160 ms) | 8 | 2.86 − 0.69 = 2.17 | 17.4° |
| active (120 ms) | 6 | 2.86 − 0 = 2.86 | 17.2° |
| recovery (500 ms) | 25 | 2.86 − 0.69 = 2.17 | 54.3° |
| **whole swing** | **39** | — | **≈ 88.9°** |

A rear hit needs more than 120° off the front (`FLANK_COS = 1/2`), so one full
committed swing can at most bring a circling body to ≈ 89°, and the foe's free
steps between swings re-track the rest. The measured closest approach confirms
it: the nearest Circle hit sat at `dot = −0.27` (≈ 105.7°), still a flank.

### Rear / flank counts, same matchup and seed

`fire_drake` (seed 1 creature) vs the exhibition rival, seeds 1–8, counted from
the HP drops in the recorded stream and classified with `hitPosition`:

| Doctrine | Front | Flank | Rear |
|----------|-------|-------|------|
| Press | varies (≈ 8–19) | 0 | 0 |
| Circle | varies (≈ 9–18) | 1 per seed (8 total) | 0 |

`controller-doctrine.test.ts` keeps the AC-11 assertion as written in a
`test.failing` ("Circle strictly ahead") and a green measurement test that
pins the numbers above. AC-11 is therefore **not met**; the finding is the
≈ 89° ceiling per committed swing against a 120° threshold. Reaching it needs
either a wider committed window, a faster cut, or a different hit-position
rule — an owner decision, not a test change.

### Re-pinned rows (rework)

None. The turn budget and the cut changed the trace hashes and added
`slips` lines, but no pinned cup/spar expectation moved: `bun run verify`
passed with every existing fixture untouched, and pacing/telemetry stayed at
their pre-rework values (durations 10.54–40.00 s, cap share 6/14, engagement
median 1114 mm).
