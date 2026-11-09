# Phase 5 — Stat Fold and Migration

- **Track:** `20261109-battle-balance`
- **Phase:** 5 of 8
- **Date:** 2026-11-09
- **Branch:** `feat/20261109-battle-balance`
- **Base:** `55b439f9` (`conductor(plan): Mark phase 'Stat Fold and Migration' as in progress`)
- **Code commit:** `09e8724d` (`feat(sim): fold the HP scale and the blow weight into the sheet (FR-2, FR-9)`)
- **Result:** the sheet shows the numbers the fight uses. `bun run verify` exits 0 and `bun run build` exits 0 as two separate commands.

## Goal

FR-2: no scale or weight multiplier sits between the sheet and the resolver.
FR-3/FR-9: a pre-change save loads, its creature fights under the mapped
doctrine, and its pool is preserved to rounding. FR-10: the frozen legacy
clock's damage moves with `MoveDef.power` and is re-pinned deliberately.

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | typecheck clean (voxel 160, sim 231, server 44, client 511 files); 3933 pass, 1 skip, 0 fail, 454,581 expects, 3934 tests / 365 files, 47.61 s; `biome check` 909 files clean; determinism gate regenerated all 46 meshes byte-identical |
| `bun run build` | 0 | vite 409 modules, 365 ms, chunk-size warning only |

Focused runs used while working: `bun test` on `save/`, `breeding.test.ts`,
`cup.test.ts`, `cup-contracts.test.ts` (377 pass / 0 fail), the whole
`packages/sim` tree (1800 pass / 2 fail at its worst, both re-pinned), and the
three new suites (13 pass / 0 fail).

## The fold table

| Constant | Old value | Where it went |
| --- | --- | --- |
| `HP_SCALE_PERCENT` (`continuous/hp.ts`) | `210` | into every stored HP stat and every authored HP bound/boss HP. `startingHp` is now `side.stats.hp` — an identity read that keeps the helper's shape for callers and client denominators. Deleted. |
| `BLOW_WEIGHT` (`battle/frames.ts`) | `2` | into `MoveDef.power` (every row doubled) and into the two places that consumed it as a constant: `MIN_ATTACK_STAMINA_COST = 3 * BLOW_WEIGHT` → literal `6`; `KNOCKBACK_PER_POISE = trunc(1000 / BLOW_WEIGHT)` → literal `500`. Frame rows did not move: the weight was already authored into their fields, so doubling power would have doubled damage twice. Deleted. |

`continuous/damage.ts` keeps `FLANK_RATIO` 5/4, `REAR_RATIO` 3/2 and
`COUNTER_RATIO` 5/4 exactly; only the weight term left the numerator.

## The band holds unchanged

`moves-band.test.ts` passes against the doubled powers and the doubled pool
without touching `BAND_MIN_PERCENT = 4` / `BAND_MAX_PERCENT = 12`:

| Move | Power | Base share of pool |
| --- | --- | --- |
| basic | 10 | 5.29% |
| kit light | 12 | 6.35% |
| kit mid | 18 | 9.52% |
| kit chip | 14 | 7.41% |
| kit heavy | 22 | 11.64% |

Pool = `startingHp({stats: {hp: 189, atk: 10, def: 10, spd: 10}})` = 189.
Heaviest base 22/189 = 11.64%; rear counter `floor(22*10*1.5*1.25/10) = 41`
= 21.69%, under the 22.5% absolute ceiling. Same percentages as Phase 4 — the
powers and the pool both doubled, which is the proof the fold is neutral.

## HP training arithmetic (P5.T1.2)

| | Before | After |
| --- | --- | --- |
| Base HP stat | 90 (sheet) | 189 (sheet = pool) |
| Trained HP coefficient | 2 | 2 |
| HP training cap | 6 (`TRAINING_CAP`) | 13 (`HP_TRAINING_CAP`) |
| Max trained HP | `2 * 6 * 2.1 = 25.2` | `2 * 13 = 26` |
| Per trained HP point | `2 * 2.1 = 4.2` | `2` (on a stat twice as large) |
| Pool at base 90, full HP training | `floor((90 + 12) * 2.1) = 214` | `189 + 26 = 215` |

The coefficient stays 2 and the cap moved 6 → 13 (12.6 rounded up) so a fully
trained creature is worth the same pool. `effectiveStats` is still the single
composition point; `trainingCap(stat)` is the one cap source, used by the care
program, settlement gains and the save validator, so the UI cannot exceed it.
Other stats keep `TRAINING_CAP = 6`.

## Migration (P5.T2)

- `SAVE_VERSION` 25 → 26; `save/migrations/v25.ts` added and registered at key
  25 in `save/migrations/index.ts`.
- `foldHp(x) = Math.round(x * 21 / 10)` (exact integer arithmetic, deterministic);
  `foldTrainedHp(x) = min(13, foldHp(x))`.
- Folds `state.creature`, `state.stable`, `lineage.hallOfFame`, every cup-session
  bracket slot, `bracket.finalRival`, `nextOpponent`, the three verdict lists and
  every `rivalResolutions[].verdict`. ATK/DEF/SPD and non-HP trained values are
  copied untouched.
- The version gate makes the step idempotent: `migrate` walks only while
  `version < SAVE_VERSION`, so a v26 payload is returned unchanged (test asserts
  a second pass leaves HP at 189).
- `BattleSide.tactic` stays readable for the frozen legacy path; the migration
  adds `doctrine` to persisted verdict sides (`balanced` → `press`,
  `specials` → `kite`, an existing doctrine wins). A test loads the migrated
  side, proves it is the profile the resolver uses, and fights it to a result.

Species and boss HP bounds were folded at their authoring sites
(`species/starters.ts`, `species/discovery.ts`, `species/rewards.ts`,
`bosses.ts`) rather than at every roll site, so rolls, breeding, rivals, bosses
and the reference line all produce the folded scale from one place.

## Drift measurement (P5.T2.3)

`packages/sim/src/battle/continuous/fold-drift.test.ts` resolves the same seeded
fight (20261109) on the pre-fold and post-fold stat lines through
`resolveContinuous`:

| Trained HP | Old pool | New pool | Pool drift | Fight | Duration drift |
| --- | --- | --- | --- | --- | --- |
| 0 | 189 | 189 | 0.00% | Reed, 18,460 ms | 0.00% |
| 1 | 193 | 193 | 0.00% | — | — |
| 2 | 197 | 197 | 0.00% | Reed, 18,460 ms | 0.00% |
| 3 | 201 | 201 | 0.00% | — | — |
| 4 | 205 | 205 | 0.00% | Reed, 20,860 ms | 0.00% |
| 5 | 210 | 211 | 0.48% | — | — |
| 6 | 214 | 215 | 0.47% | Reed, 20,860 ms | 0.00% |

Winner and duration are identical at every measured point; the worst pool drift
is 0.48%, under the 1% bound. The 1 HP ceiling gap is `2 * 13 = 26` against
`2 * 6 * 2.1 = 25.2`, which the spec anticipates.

One species-level rounding moves a pool by 1 HP: `wind_falcon`'s bound
`56..68` folds to `118..143`, so the reference line clamps to 143 instead of
`floor(68 * 2.1) = 142`. Same duration, blows and damage; only the state hash
moves (see traces).

## Telemetry before / after

The fold is behaviour-preserving, so the Phase 4 provisional table is unchanged:

| Metric | Phase 4 (band + cooldown) | Phase 5 (folded) |
| --- | --- | --- |
| cap share | 7/14 (50.0%) | 7/14 (50.0%) |
| duration | 13.06–40.00 s | 13.06–40.00 s |
| engagement min/median/max | 379 / 1152 / 3984 mm | 379 / 1152 / 3984 mm |
| exchange home/away | 0.24 / 0.22 per s | 0.24 / 0.22 per s |
| idle | 37.6% | 37.6% |
| contact | 3.5% | 3.5% |
| retreats home/away | 6875 / 7388 | 6875 / 7388 |
| positions min/median | 74 / 152 | 74 / 152 |

All 13 telemetry bounds pass. The 50% cap share remains the Phase 4 provisional
miss; Phase 8 (P8.T4) owns it.

## Traces

| Seed | Matchup | Duration | Ending | Blows | Damage | Hash |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | plant_ox v embercub | 29,800 ms | KO Embercub | 4 / 7 | 32 (16.9%) / 198 (104.8%) | `0x31f1fe02` |
| 20261111 | wind_falcon v water_axolotl | 13,060 ms | KO Tide Axolotl | 0 / 5 | 0 (0.0%) / 168 (117.5%) | `0xc0498d29` |

Both runs pass the five trace invariants. Seed 1 is byte-identical to Phase 4
(same pool 189 on both sides). Seed 20261111's hash moves only because
wind_falcon's pool rounds 142 → 143; duration, blows and damage are unchanged.

## Legacy re-pins (P5.T3.1, FR-10)

`MoveDef.power` feeds `strikeDamage`, which the frozen clock uses, so legacy
damage roughly doubles. Every row below was re-captured, not blessed:

| File | Rows |
| --- | --- |
| `battle/clock.contract.test.ts` | all 27 `GOLDEN` digests recaptured (fire mirrors 1920ab9d / 907d6275 / a45ed952; plant 7568c3a5 / 5db9e77c / f5f1b4be; water 20cabd99 / cb6981e2 / 60f91e2d; fire>plant 439b3605 / 81a3d08b / 49f89e95; plant>fire 99a1db95 / fcb50da7 / 662b5135; fire>water 3bfd7ac9 / 54efd548 / d0503dcc; water>fire 33739175 / d6e0cc90 / d611c260; plant>water 6891cb89 / 7fe4069d / 35414d23; water>plant 95b85605 / 25045b3b / aa798f35); `bestStrike` 9 → 18 |
| `battle/clock.test.ts` | basic damage 5 → 11 and the event line "for 11"; `hpAfter` Reed 35 → 29, clock hp 29; downed Reed −2 → −12 (twice); four fixtures retuned to keep the same damage at doubled power (neutral-heavy and two spacing tests atk 36 → 14, light chip atk 4 → 2); seed_shot resisted comment 3 → 8; downing-blow comment 12 → 25 |
| `battle/heavy-hit.test.ts` | PATHS victim HP 40 → 84 and damage 24 → 48 (both paths); downing killer atk 160 (melee) / 71 (projectile) and damage 160 / 85; third test victim HP 84, viaSpecial 21, viaStrike 21 |
| `battle/policy.test.ts` | three fallbacks now `special("spark")` (rush/obedient, balanced far, balanced point-blank) and two `blaze_bolt` rows now `cinder_shot` |
| `battle/projectile.test.ts` | first-impact damages 15 → 30 (×3), 3 → 6, 40 → 81; `hpAfter` Reed 25 → 10 (×3), Bolt 37 → 34, Bolt 36 → 30; event text "for 30." / "for 6."; second impact 4 → 8; final `hpAfter` `{Bolt: 32, Reed: −41}` |
| `battle/resolver.test.ts` | `finalHp` `{Bolt: 35, Reed: −14}` → `{Bolt: 30, Reed: −20}` |
| `battle/affinity.test.ts` | first impact `{flame_charge, 24}` → `{blaze_bolt, 60}` (the fold moved which move the AI reaches for) |
| `battle/exhibition.test.ts` | two pinned rival stat rows hp 77 → 163, 93 → 196 |
| `legacy.test.ts` | six `inheritedFloor` HP goldens folded: 80→160 (×2), 92→193, 76→160, 81→161 (×2) |

Old replays now show about twice the damage they used to; the legacy path is
replay-only and its ghosts are skipped at `SIM_VERSION` 2. The formula was not
compensated.

## Save and fixture re-pins

| File | Rows |
| --- | --- |
| `save/schema.ts` + 10 test files | `SAVE_VERSION` 25 → 26 (`save.test`, `legacySave`, `stableSave`, `giftSave`, `cupSave`, `branchesSave`, `transfer`, `releasePolish`, `migrations`, `breeding/discovery`); `transfer` filename `apex-league-save-v26-…` |
| `save/migrations.test.ts` | title "0 through 25" → "0 through 26"; expected key list gains `"25"` |
| `save/save.test.ts` | v2/v3/v5 fixture HP `creature.stats.hp * 2` (360) → `Math.round(creature.stats.hp * 2 * 21 / 10)` (756), 3 sites; v11 slot/rival HP and Hall trained hp 4 → 8; v12 doubling formulas folded; v20 affinity fixture stats folded |
| `save/branchesSave.test.ts` | "a v18 champion migrates to legacy with identical effective stats" → "with the folded pool": non-HP stats identical, `hp = round(stat * 2.1) + 2 * trained`; Hall record stats folded |
| `save/giftSave.test.ts` | Hall record stats folded (100 → 210) and effective-stats comparison folded |
| `breeding.test.ts` | 8 HP goldens folded: 88→182, 76→160 (×2), 78→162, 79→163, 77→161 (×2), 92→193 |
| `cup.test.ts` | `makeBracket` eight slot HP values 84→177, 88→185 (×3), 89→186 (×2), 85→178, 89→187 |
| `cup-contracts.test.ts` | seed-101 slot HP 83 → 172 |

## `test.failing` conversions (Phase 8 owns them, text unchanged)

| File | Test |
| --- | --- |
| `chart.balance.test.ts` | "equal-stat disadvantaged players grind through at full training" |
| `species-electric.balance.test.ts` | "a fresh hound never beats an even-element boss" |
| `battle/branch-balance.test.ts` | "sibling forms stay inside 45–55%" |
| `battle/form.balance.test.ts` | "no gatekeeper cell sits under the 15% floor (AC-9)" |
| `battle/tactics.balance.test.ts` | the `balanced` × `mirrors` win-band cell only (the other three cells still pass) |

`species-roster.balance.test.ts` "each cap vector is distinct from every
starter's" was un-marked: the fold makes it pass.

## AC map

| AC | Test |
| --- | --- |
| AC-1 (band) | `battle/moves-band.test.ts` — unchanged, still 4–12% on the base hit |
| AC-2 (no multiplier in production) | `battle/no-scale.test.ts` — scans `packages/sim/src`, `packages/sim/scripts`, `apps`; `startingHp` identity; positional damage without weight |
| AC-3 (pre-change save loads, fights, maps) | `save/migrations/v25.test.ts` — fold, gate idempotence, session fold, tactic→doctrine, migrated side fights |
| FR-9 (drift) | `battle/continuous/fold-drift.test.ts` — pool drift ≤ 0.48%, fight drift 0.00% |
| FR-10 (legacy re-pins listed) | table above |

## Deviations

| File | Reason |
| --- | --- |
| `battle/frames.ts`, `continuous/stamina.ts`, `continuous/impulse.ts` | `BLOW_WEIGHT` had to leave the tree, and its two constant consumers had to become literals in the same change or the fold would leave a hidden 2 in the stamina floor and the knockback divisor. |
| `species/starters.ts`, `species/discovery.ts`, `species/rewards.ts`, `bosses.ts` | HP bounds are the fold point; folding them at the authoring site keeps `rollStats`, breeding, rivals and bosses on one scale instead of patching every roll. |
| `creature.ts`, `care.ts`, `settlement.ts`, `save/validators/creature.ts` | the HP training cap moved with the fold (P5.T1.2); `trainingCap` is the one source. |
| `battle/moves-band.test.ts`, `continuous/pacing.test.ts`, `scripts/battle-trace.ts`, `scripts/battle-telemetry.ts` | the reference line is a pool, so `REFERENCE.hp` 90 → 189 and the trace print lost its `(×210%)` suffix. |
| `apps/client/src/spar/casting.test.ts`, `apps/client/src/spar/casting.ts`, `apps/client/src/cloud/config.test.ts` | the client asserted the old lie (pool > stat HP) and pinned `SAVE_VERSION` 25. |
| `battle/moves.ts`, `battle/clock.contract.test.ts`, `battle/clock.test.ts`, `battle/heavy-hit.test.ts`, `battle/policy.test.ts`, `battle/projectile.test.ts`, `battle/resolver.test.ts`, `battle/affinity.test.ts`, `battle/exhibition.test.ts`, `legacy.test.ts` | FR-10 legacy drift and the folded fixtures; every row listed above. |

## Notes

- `battle-trace.ts` still prints the literal header `reference line (hp 90 …)`
  while the sides show the folded stats; it is a cosmetic string outside the
  phase's Touches and does not feed any measurement. Phase 6 (report harness)
  can fold it in when it touches that script.
- `battle/moves.ts` still carries the Phase 4 provisional `COOLDOWN_MS`
  table; untouched here, owned by P8.T4.
- Pacing is still the Phase 4 provisional picture: 7/14 (50%) at cap, two
  fights under 25 s (13.06 s, 21.12 s). Phase 8 owns the final pass.
