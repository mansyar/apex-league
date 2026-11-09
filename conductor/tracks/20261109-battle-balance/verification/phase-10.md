# Phase 10 — Outcome Variance

- **Track:** `20261109-battle-balance`
- **Phase:** 10 — Outcome Variance
- **Date:** 2026-11-10
- **Branch:** `feat/20261109-battle-balance`
- **Base commit:** `56c2a76f`
- **Code commit:** `d53daa75`
- **Goal:** a fight varies between seeds, and a replay still repeats exactly.
- **Covers:** FR-21, FR-7, AC-18, AC-7

## Result

Met for the engine and the gate. The continuous path now draws from the fight's
own seeded RNG in exactly two places — the accuracy roll and a downward damage
spread — and the draw count is part of the state hash. The species gate is now a
decision rule under which a truly balanced species passes 95% of the time,
reports distinct fights and a binomial standard error per row, and prints a
diversity metric.

`bun run verify` and `bun run build` exit 0, `bun run telemetry` exits 0 with all
13 bounds inside. `bun run balance` still exits 1 — eight species rows (Phase 11's),
and nothing else: the cap share miss the first cut recorded (33.8% vs 33.3%) was
closed by rework 1, which softened the spread floor and now reads 32.1%. See
"Rework 1 — pacing back inside target" below for the lever, the proof and the
final numbers.

> **Rework 1 supersedes this section's numbers where they differ:** the shipped
> `SPREAD_DIVISOR` is **16** (not 8), cap share is **32.1% (270/840) `ok`**,
> knockout share is **67.9% (570/840) `ok`**, median duration is **28.85 s**, and
> **eight** species rows are `FAIL`. The commands table below is the first cut;
> the rework section carries the final one.

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | typecheck clean (voxel 160, sim 236, server 44, client 511 files); 3962 pass, 1 skip, 0 fail, 460,679 expects, 3963 tests / 367 files, 42.45 s; biome 913 files clean; determinism gate OK (46 meshes + 5 props byte-identical) |
| `bun run build` | 0 | vite 410 modules, 790 ms, chunk-size warning only |
| `bun run telemetry` | 0 | 14 matchups, all 13 bounds `ok`, cap 6/14 (42.9%) |
| `bun run balance` | 1 | 840 matrix fights, 9 species `FAIL`, `FAIL capShare` 33.8%; every other target `ok` |

Cost: the balance harness runs the 840-fight matrix, 24 doctrine fights and 180
boss fights in well under 15 s (the co-located test measures 8.7 s), so the
doubled matrix does not threaten the 120 s budget.

## The defect

`MoveDef.accuracy` (70-100 on 48 rows) and the seeded RNG were read nowhere on
the continuous path: `StepContext` had no `rng`, `resolveStrikes` and
`resolveProjectiles` took no roll, and `createFight` never called `makeRng`.
Measured consequence: only 8 of 210 ordered pairings changed outcome across four
seeds, so the same two creatures always produced the same fight, and the
"56-fight" species sample was 28 distinct fights counted twice. Third inert
mechanic this track has found, after a dodge that could not clear a hitbox and a
press band that sat on the reach edge.

## P10.T1.1 — accuracy

`roll.ts`:

```ts
export const MISS_SCALE = 5
export function rollHits(accuracy: number, rng: Rng): boolean {
  const aimed = 100 - Math.floor((100 - accuracy) / MISS_SCALE)
  if (aimed >= 100) return true
  return rng.int(100) < aimed
}
```

- Rolled **at resolution**, once per swing, when the window has already passed
  its geometry gates (band overlap, reach, front arc) or when a shot reaches the
  victim's body. A swing that never connects is still a *reach* whiff; a swing
  that connects and rolls out is an *accuracy* miss. Two questions, two reasons.
- Melee misses surface as a `basic` event with `hit: false` and
  `missReason: "accuracy"`, line `"<actor>'s <move> goes wide."`; projectile
  misses surface as an `impact` event with `hit: false`,
  `missReason: "accuracy"`, same line. The positional dodge keeps
  `missReason: "dodge"` and the line `"<target> slips <move>."`. Both are
  drawable and separately countable, so a replay can tell "aimed badly" from
  "stepped out of it".
- **Calibration.** Read literally, the authored accuracies are a 15-30% damage
  cut on the rows the controller fires most, and they broke pacing outright:
  with the roll taken at face value the 14-matchup telemetry cap share went
  35.7% → 64.3% (9/14) and the matrix median to 40.00 s. `MISS_SCALE = 5`
  divides the authored miss chance (70→94, 75→95, 85→97, 90→98, 95→99, 100→100),
  which keeps the ladder's ordering and relative risk and keeps a miss a real
  event. The authored numbers themselves are a Phase 11 question; this phase is
  not allowed to change them and did not.

## P10.T1.2 — damage spread

```ts
export const SPREAD_DIVISOR = 8
export function spreadDamage(base: number, rng: Rng): number {
  if (base <= 1) return base
  const reach = Math.floor(base / SPREAD_DIVISOR)
  if (reach <= 0) return base
  return base - rng.int(reach + 1)
}
```

Downward only: `[base - floor(base/8), base]`. Heaviest row (power 22): 20-22.

**Ceiling proof (after the best possible roll).** `moves-band.test.ts` measures
the *base* hit; the spread's best roll is exactly that base, so the band is
unchanged by construction and the proof is that the maximum is the measured
value:

| move | power | worst roll | base (best roll) | share at best roll |
| --- | --- | --- | --- | --- |
| basic | 10 | 9 | 10 | 5.29% |
| light (spark) | 12 | 11 | 12 | 6.35% |
| mid (cinder_shot) | 19 | 17 | 19 | 10.05% |
| tier-4 (blaze_bolt) | 20 | 18 | 20 | 10.58% |
| heavy (pyre_lance) | 22 | 20 | 22 | 11.64% |

22/189 = 11.64% ≤ 12%, so no roll can breach the ceiling.
`BAND_MIN_PERCENT`/`BAND_MAX_PERCENT` are untouched, and
`variance.test.ts` asserts the heaviest move's best-roll share ≤ 12% with a
message naming the move, damage and share.

**Cost.** Average damage falls by about `floor(base/8)/2`, roughly 6%. That
lengthens fights; measured below.

## P10.T1.3 — determinism, both halves

- `Rng` gained `cursor(): number` (draws taken so far; `int` delegates to
  `next`, so one counter covers both). `stateHash(state, rngCursor = 0)` mixes
  the cursor immediately after `step`/`elapsedMs`, and `Fight.advance` passes
  `context.rng.cursor()`. A divergence caused only by a different number of
  draws can no longer hide behind an otherwise identical state.
- `variance.test.ts` proves: same seed, same sides, same intents → identical
  event JSON and identical hash (run twice); a different seed → a different
  event sequence; an identical state with cursor 0 vs 1 hashes differently; a
  real fight's hash reproduces from a fresh fight stepped identically.
- `battle-trace --check`'s `deterministic` invariant still passes on both traced
  seeds.

## P10.T2.1 / P10.T2.2 — the gate

`SpeciesRow` gained `distinct` (how many fights actually played out differently,
keyed on winner|ms|victim final HP) and `se` (binomial standard error of the
rate). `BalanceSample.matrix` gained `diversity`.

**Rule.** A species passes when `|rate - 0.5| <= 1.96 * sqrt(0.25 / games)` —
a two-sided 95% test of the null "this species is 50%", using the null standard
error. Sample: 4 seeds × 210 ordered pairings = 840 fights, **112 games per
species**, giving a slack of ±9.26 pp. For a genuinely balanced species the
false-fail rate is α = 5% by construction, so a balanced species passes ≥95% of
the time — the requirement. The 45-55% point band is still printed per row as
the design target ("is this species balanced" versus "would I notice if it were
not"). No bound was widened: the old point band was narrower than the sample's
own noise (28 independent fights, ±9.4 pp at one SE), so it failed a balanced
roster about 60% of the time.

## P10.T3.1 — diversity

`diversity` = share of ordered pairings whose winner changes across the sample's
seeds. Today: **9.5%** (20 of 210 pairings), printed in the report with the note
that it is a floor, not a ceiling. Per-species distinct counts (of 112):
earth_tortoise 5, galeheron 10, shalemole 12, voltfox 14, mistkit 14,
water_axolotl 16, wind_falcon 16, embercub 17, fernstag 20, reefclaw 20,
plant_ox 21, electric_hound 21, cindermoor 22, fire_drake 23, mossboar 23.

## Pacing — before and after

| Metric | Phase 9 | Phase 10 |
| --- | --- | --- |
| matrix fights | 420 | 840 |
| cap share | 31.4% (132/420) | **33.8% (284/840)** — 0.5 pp over the 33.3% target |
| knockout share | 68.6% (288/420) | **66.2% (556/840)** — 0.5 pp under the 2/3 target |
| median duration | 27.48 s | 29.94 s (strictly below `FIGHT_CAP_MS`) |
| fastest / slowest | 9.30 s / 40.00 s | 9.30 s / 40.00 s |
| 25-40 s band | 58.1% | 66.9% |
| telemetry cap share | 5/14 (35.7%) | 6/14 (42.9%) |
| exchange | 0.30/s, 0.25/s | 0.32/s, 0.25/s (0.57 combined) |
| idle | 25.8% | 25.8% |
| positions | 92 / 146 cells | 90 / 152 cells |

Isolated lever measurement (so the delta is attributed, not guessed): with the
spread live and accuracy forced to always hit, telemetry cap was 42.9% and the
matrix cap 33.8% at median 30.08 s — the spread alone is nearly free. Reading
the authored accuracies literally is what took telemetry to 64.3%. The shipped
calibration (`MISS_SCALE = 5`) lands at 42.9% / 33.8% / 29.94 s.

**Misses recorded, not hidden.** At 840 fights the cap share is 0.48 pp above
one in three and the knockout share 0.48 pp below two in three — both inside one
standard error of their targets (SE of the cap share ≈ 1.6 pp). They are left as
honest misses owned by Phase 11's pacing pass; no bound was moved, and the gate
prints `FAIL capShare` and the co-located test asserts it does.

## Re-pinned rows

| File | Row | Change | Why |
| --- | --- | --- | --- |
| `continuous/projectile.test.ts` | `resolveShot` helper | takes `rng` (default maximum roll) | new signature; these fixtures measure geometry and the formula, not variance |
| `continuous/projectile.test.ts` | header | notes `missed` vs `dodged` | FR-21 |
| `cup-contracts.test.ts` | seed 19 rival winners | index 1 `Gilded Horn` → `Thistledown Ash` | variance ripple (FR-21) |
| `cup-contracts.test.ts` | forfeit seed 101 | champion `Reedle Mirefin` → `Mossbottom Brute` | variance ripple |
| `cup-contracts.test.ts` | forfeit seed 101 completion row 3 | winner → `Mossbottom Brute` | variance ripple |
| `cupSession.test.ts` | pre-resolved subtree | assert the *participant* (`slotA`/`slotB`), not the winner | a QF now ends in a double KO (null winner) and the bracket still advances by HP |
| `balance-report.test.ts` | `KNOWN_MISSES` | 9 rows with distinct/se against the new bound | Phase 11 owns the roster |
| `balance-report.test.ts` | `matrix.fights` | 420 → 840 | 4 seeds |
| `balance-report.test.ts` | sample text | "x 4 seeds = 840", "112 games per species" | sample size is stated, not implied |
| `balance-report.test.ts` | schedule | `games === opponents * 8` | 14 opponents × 2 orders × 4 seeds |
| `balance-report.test.ts` | gate prefixes | voltfox `92.9% (104/112, 14 distinct, se 2.4%)`; `FAIL capShare` now asserted present | honest gate |
| `balance-report.test.ts` | new test | distinct fights + binomial SE per row | P10.T2.1 |
| `evolution.test.ts`, `save/evolutionKnowledge.test.ts`, `save/save.test.ts`, `settlement.test.ts` (×2), `loop.test.ts`, `breeding.test.ts` | RNG stubs | `cursor: () => 0` | `Rng` gained `cursor()` |
| `battle-balance-report.ts` | header, seeds line, species table, `targets()` | distinct/se columns, significance rule, diversity line | P10.T2/P10.T3 |
| `clock.contract.test.ts` | — | unchanged | the frozen clock does not use the fight RNG |

No client golden, bracket fixture or ghost test moved; no cup golden transcript
moved beyond the three rows above.

## AC map

| Item | Where |
| --- | --- |
| AC-18 (variance + replay) | `variance.test.ts` "the same seed replays the same events and two seeds differ", "an identical state with a different draw count hashes differently", "a real fight reports the cursor its draws produced"; `battle-trace --check` deterministic invariant |
| AC-7 (one command, names violations) | `bun run balance` exit 1 naming every violated target with observed value and bound |
| FR-21 (one seeded RNG, no wall clock) | `roll.ts` + `StepContext.rng`; `no-scale`/`Math.random` greps clean; every draw goes through `makeRng(seed)` |
| FR-1 (4-12% band) | `moves-band.test.ts` untouched and green; `variance.test.ts` best-roll ceiling proof |
| FR-7 (distinct fights / honest sample) | `balance-report.test.ts` distinct + SE test; report columns |

## Deviations

| File | Reason |
| --- | --- |
| `continuous/roll.ts` (new) | the two rolls and their calibration prose had to live outside `strike.ts`, which had grown to 14,918 B against the 12,288 B module cap |
| `rng.ts` | `Rng` gained `cursor()` — required by P10.T1.3 to fold the draw count into the hash |
| `cupSession.test.ts` | the assertion compared winners; a drawn QF legitimately has a null winner while the bracket advances, so it now compares participants |
| `balance-report.test.ts` `KNOWN_MISSES` | rows now carry distinct/se and the new bound; values moved because the engine changed, not because a bound was relaxed |

## Notes for the next phase

- Nine species are still out of band under the significance rule — electric_hound
  10.7%, wind_falcon 23.2%, mistkit 23.2%, plant_ox 32.1%, fire_drake 35.7%,
  galeheron 82.1%, shalemole 83.9%, voltfox 92.9%. Phase 11 owns them.
- earth_tortoise produces only 5 distinct fights out of 112 — its pool and speed
  make it nearly deterministic against the field. That is a diversity finding,
  not a band finding (it sits at 48.2%).
- The cap share (33.8%) and knockout share (66.2%) straddle their targets by
  0.5 pp; Phase 11's pacing pass should settle both.
- The authored accuracy ladder (70-100) is still a Phase 11 question: this phase
  calibrated it at `MISS_SCALE = 5` rather than rewriting it.
- Trace header still prints the cosmetic literal "hp 90" while the pool is 189
  (Phase 5 leftover).

## Rework 1 — pacing back inside target

The mechanism and the gate were right; the downward spread simply cost more
throughput than it should. With `SPREAD_DIVISOR = 8` the matrix read cap share
33.8% (284/840, bound ≤ 33.3% = 279 fights) and knockout share 66.2% (556/840,
bound ≥ 66.7% = 560 fights). Both were inside one standard error (~1.6 pp), but
"within one SE" is not a pass: `bun run balance` must not fail a resolvability
target this track declared met in Phase 8.

### Which lever, and why

**Softened the spread floor: `SPREAD_DIVISOR` 8 → 16.** This is the lever that
caused the regression, and it is the cheapest honest one: it changes nothing
about which mechanics exist, only how much average damage the spread withholds.

| | divisor 8 | divisor 16 |
|---|---|---|
| roll floor | `base - floor(base/8)` (22 → 20) | `base - floor(base/16)` (22 → 21) |
| average damage withheld | ~6% | ~3% |
| cap share (matrix) | 33.8% (284/840) FAIL | **32.1% (270/840) ok** |
| knockout share (matrix) | 66.2% (556/840) FAIL | **67.9% (570/840) ok** |
| median duration | 29.94 s | **28.85 s** |
| 25-40 s band | 66.9% (562/840) | 64.5% (542/840) |
| min / max duration | 9.30 s / 40.00 s | 9.30 s / 40.00 s |
| diversity | 9.5% | **7.6%** |
| telemetry cap share | 42.9% (6/14) | 42.9% (6/14) |
| band (49 base hits) | 49/49 | 49/49 |

`MISS_SCALE` was **not** raised. Accuracy already sits at 94-100% effective and
raising the scale further would make it decorative; that is a finding for
Phase 11 (below), not something to worsen. Nothing else changed: recovery,
cooldowns, stamina, doctrine rows, `DECISION_MS`, `FIGHT_CAP_MS` and every
species stat are untouched.

### The 4-12% band still holds after the best roll

The spread is downward-only, so the **best possible roll is the authored base
hit** — the ceiling cannot be breached by a roll, by construction, and the
measured base-hit table in the report is exactly the best case:

| move | power | best roll | share of 189 pool | worst roll | worst share |
|---|---|---|---|---|---|
| basic | 10 | 10 | 5.29% | 10 | 5.29% |
| spark (tier 1) | 12 | 12 | 6.35% | 12 | 6.35% |
| flare_dart (chip) | 14 | 14 | 7.41% | 14 | 7.41% |
| flame_charge (tier 2) | 16 | 16 | 8.47% | 15 | 7.94% |
| cinder_shot (tier 3) | 19 | 19 | 10.05% | 18 | 9.52% |
| blaze_bolt (tier 4) | 20 | 20 | 10.58% | 19 | 10.05% |
| pyre_lance (heavy) | 22 | 22 | **11.64%** | 21 | 11.11% |

The heaviest row is the binding one: 22/189 = 11.64% at the best roll, 0.36 pp
under the 12% ceiling. `BAND_MIN_PERCENT` (4) and `BAND_MAX_PERCENT` (12) are
untouched, `moves-band.test.ts` is green, and `variance.test.ts` asserts the
ceiling after the best roll on the heaviest row by name.

### Determinism, both ways

- **Same seed repeats exactly.** Two `createFight` runs at seed 11 with the same
  commits and intents produce identical event JSON and an identical `stateHash`.
- **Different seeds diverge.** Seed 1 and seed 2 produce different event
  sequences on the same sides (asserted in `variance.test.ts`); across the matrix
  7.6% of ordered pairings change winner across the four seeds.
- **The cursor is in the hash.** `stateHash(state, rngCursor)` mixes the RNG draw
  count, so a divergence caused only by a different number of draws cannot hide
  behind an otherwise identical state (`stateHash(state, 0) !== stateHash(state, 1)`,
  and a live fight reports the cursor its own draws produced).

### Commands

| command | exit | result |
|---|---|---|
| `bun run verify` | **0** | typecheck clean (voxel 160, sim 235, server 44, client 512 files); 3962 pass, 1 skip, 0 fail, 459,231 expects, 3963 tests / 367 files, 61.77 s; biome 913 files clean; determinism gate OK (46 species meshes + 5 props byte-identical) |
| `bun run build` | **0** | vite 410 modules, 384 ms, chunk-size warning only |
| `bun run telemetry` | **0** | all 13 bounds ok; cap 6/14 (42.9%), exchange 0.31/0.25 (0.56/s), idle 26.0%, engagement 374/1099/3984 mm, positions 81/152, duration 15.28-40.00 s |
| `bun run balance` | **1** | resolvability targets all `ok` — capShare 32.1% (270/840) ≤ 33.3%, durationBand 64.5% ≥ 50%, durationMin 9.30 s, durationMax 40.00 s, damageBand 49/49, all six boss targets `ok`. Exit 1 solely from the eight roster rows Phase 11 owns. |

### Re-pinned rows

| file | row | before → after | why |
|---|---|---|---|
| `continuous/battle-trace.test.ts` | `KO` fixture | `seed 1, plant_ox v embercub` → `seed 20261111, wind_falcon v water_axolotl` | the narrower spread moved the old KO fixture to the cap; this pairing still knocks out inside the band |
| `continuous/balance-report.test.ts` | `KNOWN_MISSES` | 8 species rows at the divisor-16 values; the `capShare` row removed | the gate now passes capShare and the roster values moved |
| `continuous/balance-report.test.ts` | gate test | `FAIL capShare` present → absent, `ok   capShare` asserted | capShare is green again |
| `cup-contracts.test.ts` | seed-19 rival subtree | `Thistledown Ash` → `Gilded Horn` | rework 1 narrowed the spread floor and the roll moved back |
| `cup-contracts.test.ts` | forfeit seed 101 | champion `Mossbottom Brute` → `Reedle Mirefin`; final completion row back to `Reedle Mirefin` | same cause |

### Findings recorded, not fixed

1. **Diversity is thin.** Only 7.6% of ordered pairings change winner across the
   four seeds (9.5% at the wider spread), and `earth_tortoise` produces **4
   distinct fights out of 112**. The cause is the calibration in `roll.ts`: at
   `MISS_SCALE = 5` the effective accuracies are 94-100%, so the accuracy roll
   almost never decides anything and the spread is the only real variance. The
   authored ladder (70-100) was written while nothing read it; honouring it
   literally is what Phase 11 should cost out, and the numbers are in hand:
   literal accuracy drove the telemetry cap share to **64.3%**, a floor at 90
   still read **57.1%**, and the shipped scale of 5 reads **42.9%**. So a wider
   accuracy spread costs roughly 15-20 pp of cap share at the current exchange
   rate — Phase 11 can decide with that in hand (`moves.ts` is in its Touches).
   State plainly: the authored accuracies are now near-decorative.
2. **Eight species rows are still out of band** under the significance rule —
   electric_hound 8.9%, wind_falcon 21.4%, mistkit 25.0%, plant_ox 32.1%,
   fire_drake 35.7%, galeheron 83.9%, shalemole 85.7%, voltfox 92.9%. Phase 11
   owns them; this phase did not tune a species stat.
