# Phase 5 — Poise and Stamina

- **Track:** `20261108-continuous-arena-battle` (Continuous Arena Battle)
- **Phase:** 5 — Poise and Stamina (FR-9, FR-10; AC-9, AC-10)
- **Date:** 2026-11-08
- **Branch:** `feat/20261108-continuous-arena-battle`
- **Base commit:** `e75bca2b1226afbdad1ae21d4d8c7101b7c8d6c4`
- **Head commit (code):** `75b65918035156bd9fff2ca99e164f2fe5a29889` (this evidence file is committed on top)
- **Result:** **verified**

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| Static + unit + determinism | `bun run verify` | 0 | 4 workspace typechecks clean (voxel 160, sim 186, server 44, client 468 files); 3640 pass / 1 skip / 0 fail across 3641 tests in 340 files; Biome clean over 850 files; voxel determinism gate byte-identical for 48 GLBs + 5 props |
| Build | `bun run build` | 0 | Vite 8.3.4, 370 modules transformed, `dist/assets/index-BMW0jNlc.js` 996.02 kB (pre-existing chunk-size warning) |

`verify` and `build` were run as two separate invocations; the phase config joins
them with `&&`, which this executor is not permitted to use.

### Rework

- First `bun run verify` failed the sim typecheck (`TS2740` in `movement.ts`): the
  kinematics function still rebuilt a five-field `FighterState` literal, so it no
  longer satisfied the interface once the meters were required. It now spreads the
  fighter and overrides only `pos`, `vel`, and `facing`; no behaviour change.
- The module-size guard then failed: `step.ts` reached 13,087 B. The meter pass was
  folded down (one keyed hit helper instead of a lookup helper plus a closure) and
  the now-redundant `movedFighter` wrapper was removed — `moveFighter` carries the
  attack and both meters across by itself. Two further trims took it under the
  12,288 B cap; the guard is green.
- Biome flagged import order in `stamina.test.ts` and a multi-line `./poise` import
  in `step.ts` that fits on one line. Both fixed by hand; the final run was green.
- No source logic changed after the first green test run.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| AC-9 | Poise depletion opens a punish window that expires after a timed duration | `poise.test.ts` "a trade empties both meters and cancels both active frames": two `basic` commits 420 mm apart trade on the fourth step and again on the fifth; both pools (4 points) reach 0, both `poiseBreakMs` are `POISE_BREAK_MS`, both held attacks are `null`, and both `commit` calls return false. "the punish window expires and the victim can commit again": after `POISE_BREAK_MS / STEP_MS` further steps the victim is no longer broken, its pool is refilled, its grace is running, and `commit` returns true. "the window expires, refills the meter, and starts the grace" pins the expiry step exactly. | met |
| AC-10 | Insufficient stamina refuses an attack and recovers after regeneration | `stamina.test.ts` "a spent pool refuses the next commit, then pays once it refills": a 3-point pool pays 2 for `basic`; the next commit is refused while the pool holds 1 and no attack is left behind; five regeneration steps bring the pool back to 3 and the same commit now pays. "a commit the pool cannot cover is refused, observably": `spendAttack` returns `null` and `canAfford` is false. | met |

## Requirements

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| FR-9 | Poise depletes on hits, a break opens a timed punish window, and the legacy grace concept is expressed in time | `poise.ts`: `applyPoiseDamage` removes the move's authored points, a pool that would reach zero breaks instead (0 points, `POISE_BREAK_MS = 600`, attack cancelled), a broken fighter absorbs further blows, and `advancePoise` counts the window down in milliseconds before refilling to `poiseMax` and starting `POISE_GRACE_MS = 1200`. Inside grace a blow clamps to 1 point instead of breaking — the time-expressed replacement for `STAGGER_GRACE_TICKS`. Tests: "a landed blow removes its authored points", "the break cancels the attack the fighter was holding", "a broken fighter absorbs further blows instead of re-locking", "the window counts down in milliseconds, not in actions", "a blow inside grace cannot break the fighter", "grace expires, and the next blow breaks again" | met |
| FR-10 | Stamina gates attacks and dodges, regenerates while not committing, and movement is free | `stamina.ts`: `attackCost` reads the move's authored `staminaCost` from `frames.ts`, `spendAttack`/`spendDodge` return `null` when the pool cannot cover the price, `regenerateStamina` returns the fighter untouched while it holds an attack and otherwise banks `STEP_MS` toward 2 points per 100 ms, and no movement path calls it. `step.ts` pays before committing and refuses without leaving an attack. Tests: "a move costs its authored price", "spending returns a paid fighter and leaves the old one alone", "an exact price is payable", "a dodge costs its fixed price", "a free fighter regains points every interval", "a partial interval banks its time instead of rounding up", "a committed fighter regenerates nothing", "a full pool holds its bank at zero", "the pool never overfills", "regeneration pauses while the fighter holds an attack", "movement is free: walking never spends stamina" | met |
| NFR-1 | Integer arithmetic, one seeded RNG, no wall clock | Poise and stamina are whole points and whole milliseconds; no RNG draw was added and no `Math.random` / `Date` is used. `stateHash` now folds `poise`, `poiseMax`, `poiseBreakMs`, `poiseGraceMs`, `stamina`, `staminaMax`, and `staminaRegenMs` for each fighter, so a meter state is part of the replay identity. Replay tests: "the meters are part of the replay identity (NFR-1)" in both `poise.test.ts` and `stamina.test.ts` | met |
| NFR-3 | New sim modules under 12,288 B | `module-size.test.ts` green inside `bun run verify`; `poise.ts` and `stamina.ts` are both well under the cap and the modified `step.ts` fits after the rework above | met |

## What changed

- `packages/sim/src/battle/continuous/poise.ts` (new, 126 lines) — `PoiseFields`
  (`poise`, `poiseMax`, `poiseBreakMs`, `poiseGraceMs`), `DEFAULT_POISE_MAX = 20`,
  `POISE_BREAK_MS = 600`, `POISE_GRACE_MS = 1200`, `openingPoise`, `isBroken`,
  `canBreak`, `applyPoiseDamage` (deplete, break with the attack cancelled, absorb
  while broken, clamp inside grace), `advancePoise` (count the window down, refill,
  then count the grace down).
- `packages/sim/src/battle/continuous/poise.test.ts` (new, 258 lines, 17 tests) —
  opening pool, depletion, the break window, the grace period, and two fight-level
  tests through `createFight` plus replay determinism.
- `packages/sim/src/battle/continuous/stamina.ts` (new, 121 lines) — `StaminaFields`
  (`stamina`, `staminaMax`, `staminaRegenMs`), `DEFAULT_STAMINA_MAX = 100`,
  `STAMINA_REGEN_INTERVAL_MS = 100`, `STAMINA_REGEN_PER_INTERVAL = 2`,
  `DODGE_STAMINA_COST = 8`, `openingStamina`, `canAfford`, `spendStamina`,
  `attackCost` (authored cost from `getFrameData`), `spendAttack`, `spendDodge`,
  `regenerateStamina`.
- `packages/sim/src/battle/continuous/stamina.test.ts` (new, 254 lines, 18 tests) —
  opening pool, commit costs, refusal, dodge costs, regeneration, and two fight-level
  tests plus replay determinism.
- `packages/sim/src/battle/continuous/types.ts` (+14 lines) — the seven required
  meter fields on `FighterState`.
- `packages/sim/src/battle/continuous/step.ts` (+48/−17) — meter imports; `FighterInit`
  accepts `poiseMax` / `staminaMax`; `openFighter` opens both meters; the new
  `settleMeters` pass between the shot resolution and movement (advance clocks →
  regenerate → apply this step's poise damage); `commit` refuses a broken fighter or
  an unpayable cost before `commitAttack`; the hash covers all seven meter fields;
  `movedFighter` removed in favour of `moveFighter`'s spread.
- `packages/sim/src/battle/continuous/strike.ts` (+3) — `StrikeReport.poiseDamage`,
  reported from the move's frame data.
- `packages/sim/src/battle/continuous/projectile.ts` (+6/−1) — `ShotReport.poiseDamage`
  (the authored value on a hit, 0 on a dodge), read through `getFrameData`.
- `packages/sim/src/battle/continuous/movement.ts` (+1/−2) — the kinematics result
  spreads the fighter instead of rebuilding a five-field literal.
- `packages/sim/src/battle/continuous/movement.test.ts` (+4),
  `packages/sim/src/battle/continuous/projectile.test.ts` (+12/−1) — test helpers
  open both meters so the required fields are satisfied; no assertion changed.

## Evidence paths

- `packages/sim/src/battle/continuous/poise.ts`, `poise.test.ts`
- `packages/sim/src/battle/continuous/stamina.ts`, `stamina.test.ts`
- `packages/sim/src/battle/continuous/step.ts`, `types.ts`, `strike.ts`,
  `projectile.ts`, `movement.ts`
- `conductor/tracks/20261108-continuous-arena-battle/verification/phase-5.md`

## Deviations

- `packages/sim/src/battle/continuous/types.ts` — outside Touches, named in the brief
  as a small integration edit. The meters are per-fighter state, so the seven fields
  live on `FighterState`; additive only, and every Phase 2–4 test is unchanged and
  green.
- `packages/sim/src/battle/continuous/step.ts` — outside Touches, named in the brief.
  Changes are the `settleMeters` pass and its order, the `commit` gates for a break
  and an unpayable cost, the meter fields in `openFighter` / `stateHash` /
  `FighterInit`, and the removal of `movedFighter`. The strike, shot, and movement
  ordering is otherwise untouched.
- `packages/sim/src/battle/continuous/strike.ts` — outside Touches, not named in the
  brief. One additive field on `StrikeReport` so the step can apply poise damage
  without re-reading frame data or duplicating the report; damage maths is untouched.
- `packages/sim/src/battle/continuous/projectile.ts` — outside Touches, named in the
  brief as an additive poise report. One additive field on `ShotReport` plus the
  frame-data lookup; a dodge reports 0, so a missed shot cannot drain poise.
- `packages/sim/src/battle/continuous/movement.ts` — outside Touches, not named in
  the brief. Required by the type change: the function returned a five-field
  `FighterState` literal and could not compile once the meters were required. It now
  spreads the input and overrides only the kinematics it owns; behaviour is
  unchanged (all Phase 2 movement tests unchanged and green).
- `packages/sim/src/battle/continuous/movement.test.ts`,
  `packages/sim/src/battle/continuous/projectile.test.ts` — outside Touches, not
  named in the brief. Both hold a local `fighter()` helper that built a bare
  `FighterState`; they now spread `openingPoise()` and `openingStamina()`. Compile
  fix only, no assertion touched.

## Notes

- **Break and grace are durations.** `POISE_BREAK_MS = 600` (30 steps) and
  `POISE_GRACE_MS = 1200` (60 steps) are whole milliseconds, so the legacy
  `STAGGER_GRACE_TICKS = 3` concept is expressed as time rather than a count of
  actions. Both constants are multiples of `STEP_MS`, which the tests assert, so the
  clocks land exactly on a step boundary.
- **No punish damage bonus.** The break's value is what it removes — the victim's
  attack is cancelled and its commits are refused for 600 ms — not an extra damage
  multiplier. Reusing `COUNTER_RATIO` for a break would have added a second damage
  path and muddied AC-6, so the phase deliberately does not touch damage maths.
- **Order inside a step.** `settleMeters` runs after the strike and shot passes and
  before movement: it advances the clocks, regenerates stamina, then applies this
  step's poise damage. Advancing first means a break opened now serves its whole
  window, and a window that expires now refills before the same step's blows land —
  so a fighter cannot be broken on the step its window ends.
- **Refusal is observable.** `Fight.commit` returns false for a lock (FR-6), a break
  (FR-9), or an unpayable cost (FR-10), and leaves `attack` untouched in every case.
  `spendAttack` / `spendDodge` return `null` instead of throwing, so Phase 6 can ask
  "can this be paid?" without a try/catch; `attackCost` still throws on an unknown
  move id, as `commitAttack` already does.
- **Dodge spending is exposed, not wired.** `spendDodge` and `DODGE_STAMINA_COST`
  are ready for the Phase 6 controller; no dodge movement or dodge intent exists in
  this phase, so nothing calls `spendDodge` from `step.ts` yet.
- **Movement is free.** No movement path touches the pool; the fight test walks both
  fighters for 100 steps and the pool is still full with nothing banked.
- **Scope held.** `frames.ts`, `moves.ts`, `clock/`, and `chart.ts` are untouched; no
  HP, knockback, endings, controller, or legacy-version work. `hp` is still not on
  `FighterState`, so applying the reported damage remains Phase 7's scope.
- **Known debt carried, not introduced:** an active window still resolves once per
  step, so a 60 ms melee window lands three blows and drains poise three times as
  fast as its authored number suggests. That is the same Phase 3 balance debt
  recorded in `phase-4.md`; the poise tests use a 4-point pool so the two-blow break
  is explicit.
- **Tasks:** P5.T1 (depletion, break window in ms, time-expressed grace) and P5.T2
  (cost on attacks and dodge, regeneration while not committing, refusal when
  insufficient) are both delivered in `75b65918`; they share one commit because
  `step.ts` wires both meters and would not compile split across two.

## Primary verification

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| static | `bun run verify` | 0 | 4 workspace typechecks clean; 3640 tests / 340 files, 3640 pass, 1 skip, 0 fail; biome 850 files clean; determinism gate byte-identical |
| build | `bun run build` | 0 | Vite built 370 modules; only the pre-existing chunk-size warning |

Verified by the primary agent, not taken from the subagent report. The phase was
squashed to `7066f1e8` (both commits in the range were reported).

**Reviewed by hand:** the break and grace are durations in ms (600 / 1200), not
action counts, so FR-9's "expressed in time" holds; a broken fighter absorbs
further blows instead of re-locking; stamina regeneration is paused for the whole
held attack, which is what makes the pool a gate rather than a delay; movement
never reads the pool.

**Capacity warning for later phases:** `step.ts` is now 12,143 bytes against the
12,288 byte module cap — 145 bytes of headroom. Phase 6 (controller) and Phase 7
(endings, HP, KO) both integrate through this file. Expect to extract the per-step
pipeline into its own module rather than squeeze it.
