# Phase 2 verification — The tortoise fixes itself, not its identity

**Track:** `20261112-capshare-pacing`
**Phase:** 2 of 3
**Branch:** `chore/20261112-capshare-pacing`
**Phase base:** `1edcfb28`
**Outcome:** **blocked** — the identity fence holds, every in-surface lever was
measured, and none of them moves the tortoise's nine collapse fights without
breaking FR-5. The binding constraint is D-2, as the brief anticipated. Only the
identity guard ships.

## 1. The identity test, and why it is a fence

`packages/sim/src/species/identity.test.ts` (new, 77 lines) pins:

| invariant | assertion |
| --- | --- |
| `statBounds.spd` | `toEqual([3, 5])` — exactly, not a floor |
| `statBounds.hp` | lower ≥ 163, upper ≥ 209 (may rise, may not fall) |
| `statBounds.def` | lower ≥ 10, upper ≥ 13 |
| `temperament` / `archetypeId` / `element` | `"slow"` / `"tortoise"` / `"earth"` |
| `kit` | length 6, unique, and set-equal to the six moves it shipped with |

The kit assertion compares **sorted** arrays, so a reorder is allowed and a
substitution is not. That is deliberate: FR-2a forbids giving the tortoise a move
it does not own, and permits it to choose differently among the six it does.

It is a fence rather than a re-baseline because it was written and run **before
any value moved**: `bun test packages/sim/src/species/identity.test.ts` on the
untouched tree at `1edcfb28` gave 4 pass, 0 fail, 11 `expect()` calls, 17 ms.
Any future hand that reaches for `spd: [5, 7]` — the cheapest way to make a slow
body land blows, and precisely the shortcut AC-2a exists to reject — turns this
red instead of quietly shipping. The file is committed first and separately
(`d1ba7d14`), so the guard can be reviewed on its own.

## 2. What the lever actually is

Before measuring, two facts about the harness matter, and neither is obvious:

- `sideOf()` in `battle-telemetry.ts` builds each side from
  `REFERENCE = { hp: 189, atk: 10, def: 10, spd: 10 }` **clamped into the
  species' own bounds**. So the tortoise fights at `atk 11` (its floor), `spd 5`
  (its ceiling), `hp 189` — and raising the `atk` *floor* raises the measured
  `atk` one for one.
- `battle-balance-report.ts` builds its measured line from
  `floor((min + max) / 2)` per stat. So the matrix sees `atk 13` for both
  `[11, 15]` and `[12, 15]`, and `14` for `[13, 15]`. **A floor-only `atk` move
  is invisible to `bun run balance` and visible to `bun run telemetry`.** Rungs 5
  and 6 below are byte-identical on the matrix for exactly this reason.

`controller-moves.ts` decides by `basic`-first, then the highest-`power`
affordable, off-cooldown, in-reach move — so **kit order does not affect choice**;
only membership does. The carried four is `kit.slice(0, 4)` in `sideOf()`, the
cup, and the balance report. This is why the lever is "which four", not "in what
order", and it is why the reorder is only effective through what it evicts.

The shipped carried four are `pebble_shot` (300 ms startup), `dust_devil` (380),
`clay_burst` (480), `boulder_toss` (512) — four of the tortoise's five slowest
startups, with `sand_blast` (240 ms, 1066 ms cycle, 8 stamina) sitting unused at
index 4. The slice claim in the brief is correct.

## 3. Every candidate, with its measurement

All readings are `bun run telemetry` (42-fight sample) and `bun run balance`
(840-fight matrix). "of the 9" counts Phase 1's nine tortoise collapses
(telemetry rows 3, 19, 20, 21, 22, 23, 24, 37, 38) that stopped ending at the
40 s cap.

| # | carried four | `atk` bounds | capShare | of the 9 resolved | tortoise matrix | balance gate |
| --- | --- | --- | --- | --- | --- | --- |
| base | pebble, dust_devil, clay_burst, boulder_toss | `[11, 15]` | 25/42 (59.5%) | — | 52.7% | green |
| 1 | pebble, dust_devil, **sand_blast**, boulder_toss | `[11, 15]` | 25/42 (59.5%) | **0** | 57.1% | green |
| 2 | pebble, dust_devil, clay_burst, boulder_toss | `[13, 15]` | 25/42 (59.5%) | **0** | — (midpoint 14) | not run |
| 3 | pebble, dust_devil, **sand_blast**, boulder_toss | `[13, 15]` | 24/42 (57.1%) | **0** (row 2 only) | 58.0% | green |
| 4 | pebble, dust_devil, sand_blast, **clay_burst** | `[13, 15]` | 23/42 (54.8%) | **2** (rows 20, 23) | 71.4% | **RED** |
| 5 | pebble, dust_devil, sand_blast, **clay_burst** | `[11, 15]` | 25/42 (59.5%) | **0** | 65.2% | **RED** |
| 6 | pebble, dust_devil, sand_blast, **clay_burst** | `[12, 15]` | 24/42 (57.1%) | **1** (row 20) | 65.2% | **RED** |

What each rung taught:

- **Rung 1 — the brief's preferred lever, alone.** The reorder is real but inert
  on outcomes: identical 25/42, not one of the nine resolved. It does raise the
  tortoise's landed blows in the stall fights (row 21: 0 → 6, row 37: 0 → 8), so
  the fights look less like a no-contest. It also lifts its matrix win rate from
  52.7% to 57.1% — already outside the 45-55% design target, for no pacing gain.
- **Rung 2 — `atk` floor 11 → 13 alone.** Invisible: 25/42, no flips. A damage
  bump that cannot buy a single knockout is a damage bump that is not the
  constraint.
- **Rung 3 — reorder + `atk` 13.** The first green rung with any movement: 24/42,
  and the tortoise now lands 3-8 blows in the fights it used to sleep through. But
  the single fight it resolves is row 2 (`fire_drake` seed 20261109) — Phase 1's
  #2, an opponent-conversion fight, **not one of the nine**. It also puts the
  tortoise at 58.0% on the matrix, a new design-band miss.
- **Rung 4 — the brief's reorder plus evicting `boulder_toss`.** The only rung
  that resolves collapse fights: row 20 (reefclaw, 38.88 s) and row 23 (embercub,
  39.48 s, a **win**). It also pushes the tortoise to 71.4%, knocks reefclaw to
  36.6% and embercub to 35.3% — the exact failure mode the spec names, caught by
  the gate.
- **Rung 5 — the same kit at shipped `atk`.** Isolates the cause: the kit alone
  costs 65.2% on the matrix. The reorder is not a free fix that `atk` then
  spoils; evicting `boulder_toss` is itself the oppressiveness.
- **Rung 6 — same kit, `atk` floor 12.** One of the nine resolves (row 20) and
  the tortoise sits at 65.2%. The cheapest possible flip already costs the gate.

The shape of the surface is therefore: **green rungs resolve 0 of 9; every rung
that resolves ≥ 1 of 9 is red.** There is no rung between them. The tortoise's
nine are not a data-tuning problem that was missed — they are the kite band
(D-2) and the 40 s cap showing through the species.

## 4. The tortoise's pairings, before and after

The 42-fight sample draws the tortoise into **six** pairings (18 fights), not
five — Phase 1's table of five counted only the pairings that time out, and
`voltfox v earth_tortoise` is three knockouts. Columns are
`blows tortoise/foe`, then the tortoise's damage share from the full-resolution
trace (baseline only; see note).

| row | pairing | seed | baseline | tortoise damage share |
| --- | --- | --- | --- | --- |
| 1 | fire_drake v earth_tortoise | 20261108 | time, 5/9 | not traced |
| 2 | fire_drake v earth_tortoise | 20261109 | time, 4/7 | not traced |
| 3 | fire_drake v earth_tortoise | 20261110 | time, 5/6 | 49.4% |
| 10 | electric_hound v earth_tortoise | 20261113 | time, 4/9 | not traced |
| 11 | electric_hound v earth_tortoise | 20261114 | time, 6/11 | not traced |
| 12 | electric_hound v earth_tortoise | 20261115 | time, 5/8 | not traced |
| 19 | reefclaw v earth_tortoise | 20261114 | time, 5/8 | 37.6% |
| 20 | reefclaw v earth_tortoise | 20261115 | time, **0**/6 | **0.0%** |
| 21 | reefclaw v earth_tortoise | 20261116 | time, **0**/7 | **0.0%** |
| 22 | earth_tortoise v embercub | 20261115 | time, 1/7 | 5.2% |
| 23 | earth_tortoise v embercub | 20261116 | time, 4/8 | 36.4% |
| 24 | earth_tortoise v embercub | 20261117 | time, 3/6 | 17.3% |
| 28 | voltfox v earth_tortoise | 20261118 | **ko** 30.94 s, 4/8 | not traced |
| 29 | voltfox v earth_tortoise | 20261119 | **ko** 18.44 s, 4/8 | not traced |
| 30 | voltfox v earth_tortoise | 20261120 | **ko** 25.18 s, 4/7 | not traced |
| 37 | embercub v earth_tortoise | 20261120 | time, **0**/8 | **0.0%** |
| 38 | embercub v earth_tortoise | 20261121 | time, 1/6 | 6.4% |
| 39 | embercub v earth_tortoise | 20261122 | time, 6/9 | not traced |

Damage shares come from full-resolution traces of the nine collapse fights only
(rows 3, 19, 20, 21, 22, 23, 24, 37, 38), which is what the phase brief asked
for; the other nine tortoise fights were read from telemetry, which carries
blows and commits but not damage share, and are marked as such rather than
estimated.

**Before/after is a null result, honestly stated:** the tree ships unchanged, so
"after" equals "before" for all six pairings. The counterfactual is the rung
table: under the green rungs the tortoise's blows in these fights rise (row 20:
0 → 9, row 21: 0 → 6, row 37: 0 → 7, row 38: 1 → 7) while the fights still end at
the cap, and under the only rung that resolves them its damage share finally
converts — at the cost of a 71.4% species. "The number moved" is not the claim
being made here; the claim is that the number only moves far enough when the
gate breaks.

## 5. The four gates, on the final tree

All run on the shipped tree plus the guard, in the brief's order.

| command | exit | result |
| --- | --- | --- |
| `bun run balance` | 0 | 840 fights, capShare 26.7% (224/840) ≤ 33.3%, decisive 95.6%, median 31.21 s, 49/49 moves in band, 15/15 species in bound, 6/6 bosses beatable-not-trivial, tortoise 52.7% |
| `bun run telemetry` | 0 | 25/42 (59.5%), 14/14 bounds ok — byte-identical to the phase-base reading |
| `bun run verify` | 0 | 4150 pass, 1 skip, 0 fail, 491063 `expect()` calls, 374 files; biome clean; determinism gate OK (47 assets byte-identical) |
| `bun run build` | 0 | 418 modules, built in 314 ms (pre-existing >500 kB chunk warning, unchanged) |

The telemetry sample reproducing 25/42 exactly, twice, is also the NFR-1
determinism evidence for this phase.

## 6. Re-pinned figures

**None.** No figure was re-pinned, because nothing shipped. `telemetry.test.ts`
still reads 25/42 (59.5%), `balance-report.test.ts` still reads tortoise
distinct 106 and the same four `DESIGN_BAND_MISSES`, and no tolerance, floor,
`DISTINCT_FLOOR` or bound was touched anywhere. The rung readings above are
measurements, not baselines, and are deliberately **not** encoded as pins — they
describe candidates that were rejected.

## 7. FR-7 verdict

`SIM_VERSION` stays **3**, and no ghost pin moved. `packages/sim/src/species/rewards.ts`
is byte-identical to `1edcfb28` (`git status` clean; the only commit on this
branch beyond the base is the guard). `controller-moves.ts`, `frames.ts`, the
threat band, the resolution loop and every damage constant are untouched — a kit
reorder plus a stat inside its existing bounds would not have qualified, and in
the event neither shipped. The determinism gate passing byte-for-byte on all 47
assets is the independent confirmation.

## 8. Deviations

None. Every file written is inside `Touches`: `packages/sim/src/species/identity.test.ts`
(new) and this evidence file. `rewards.ts` was edited during measurement and
restored; `balance-report.test.ts`, `telemetry.test.ts` and `packages/sim/src/cup/**`
were not needed.

## 9. Notes for the primary

1. **The phase is blocked on D-2, and the block is now measured, not inferred.**
   The green frontier (rungs 1 and 3) resolves zero of the nine. The cheapest rung
   that resolves one (rung 6) costs the species bound. Phase 3's sample
   re-composition is the only remaining lever on the 52% target, and it will be
   working on a tortoise that cannot be helped from inside its own data.
2. **`bun run balance` cannot see an `atk` floor move.** It builds the measured
   line from the bounds' midpoint, so `[11,15]` and `[12,15]` are the same fight
   on the matrix while `bun run telemetry` (which clamps `REFERENCE.atk = 10` into
   the bounds) sees 11 vs 12. Any future phase that tunes a floor must read both
   gates, or it will "pass balance" while moving nothing.
3. **The kit, not the stat, is the oppressiveness.** Evicting `boulder_toss`
   takes the tortoise to 65.2% with `atk` untouched. The brief's preferred lever
   and the gate are in direct tension; this is worth recording as debt against
   the species' design, not against the harness.
4. **Lever order conflict, resolved toward the brief.** `plan.md` P2.T2 lists
   "stat movement first, then kit selection"; the brief lists kit first, `atk`
   second. I followed the brief, and measured both orders anyway (rungs 1/2 are
   the isolated pair), so the conflict cost nothing. The primary may want to
   reconcile the plan text.
5. **Two small doc/design notes, deliberately not acted on.** `species/types.ts`
   documents `kit` as "the fixed six-move kit, in catalog (tier) order" — any
   future reorder invalidates that comment for the tortoise. And the tortoise's
   reference line is the roster's lowest at 25.0%, which is why its matrix rate
   moves so sharply for small data changes; the 52.7% → 65.2% jump from a kit
   eviction is partly that sensitivity.
