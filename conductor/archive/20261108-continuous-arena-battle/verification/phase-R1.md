# Phase R1 verification — Review Fixes

Track: `20261108-continuous-arena-battle`
Branch: `feat/20261108-continuous-arena-battle`
Covers: FR-18, AC-6, FR-21, AC-21, FR-15, FR-12, AC-12, FR-13, NFR-1
Commits: `fafbca11`, `c7011d06`, `5696c954`, `6fd18f00`, `d54cc1df`, `fb6ad752`

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | typecheck 4 packages clean; **3,801 pass, 1 skip, 0 fail** (3,802 tests, 354 files, 465,777 `expect()` calls); biome clean on 884 files; determinism gate OK for all 45 species/form digests (15 species × 3 forms) + 5 props |
| `bun run build` | 0 | vite production build, 398 modules, `dist/assets/index-Da1wWtx8.js` 1,019.13 kB |

Both commands were run separately. `verify` needed several attempts while the
F1 fix was being settled: the first attempt (literal reading of the finding)
cancelled both swings in a simultaneous boundary trade, which drained recovery
and pushed the pacing sample to 24.80 s and telemetry idle to 46.7 %. The trade
exception below restored both (final: every pacing row in band, idle 31.4 %,
cap share 42.9 %). Two later attempts fixed test-side mistakes only: a
mis-shaped victim for the interruption case and a double-KO seed scanned at the
wrong attacker speed. The final run is clean.

## Findings

| Id | What changed | File | Test that pins it |
| --- | --- | --- | --- |
| F1 (R1.F1) | A swing is tested when its window is open at **either end** of the step (`after.active \|\| before.active`), so the final active step is no longer lost and the first test is no longer spent on the last startup step. `counter`/`interrupted` read the victim's phase from the pre-step snapshot, so a blow on the final startup step cancels and a step that advanced into recovery is not a counter. A swing that also struck in the same step trades instead of being cancelled (FR-7). `landed` still comes from `after`. | `packages/sim/src/battle/continuous/strike.ts`, `advance.ts` | `strike.test.ts` → *a strike lands when its active window opens*; *one swing lands one blow across its whole active window*; *the final active step is still a strike test (FR-18)*; *a blow on the victim's final startup step interrupts (AC-6)*; *a hit during startup cancels the attack*; *a hit during recovery is a counter*; *both active frames land in the same step* |
| F2 (R1.F2) | The band test keeps `MIN_MS`/`MAX_MS` per row, and a separate test requires a strict majority of the sample to end by KO, so a stalled sample can no longer satisfy AC-21 by construction. The cap ceiling stays its own assertion. | `packages/sim/src/battle/continuous/pacing.test.ts` | *a majority ends by KO, so the band is not met by stalling*; *the cap is the top of the band, not a target*; *every seeded matchup lands in the band, both sides landing blows* |
| F3 (R1.F3) | The production scan now covers `packages/sim/scripts` as well as `packages/sim/src` and `apps`, and the allow-list names `packages/sim/scripts/balance-probe.ts` with a comment saying it is a dev probe that measures the legacy numbers. | `packages/sim/src/battle/clock.freeze.test.ts` | *no production module outside the frozen path builds a clock* (`productionCallSites()` equals the three-entry allow-list) |
| F4 (R1.F4) | The module note now says a double KO covers *a shot that lands in the same step its owner goes down* (the old "after its owner is already down" was unreachable). A pinned end-to-end case proves it: side 0 shoots, side 1 lands a killing blow in the same step. | `packages/sim/src/battle/continuous/resolve.ts` | `resolve.test.ts` → *a shot and a killing blow in the same step are a double KO* (seed 1, `reason === "double_ko"`, `winner === null`, two down beats on one tick, an `impact` hit by `ember` and a `basic` hit by `reed` at that tick) |
| F6 (R1.F5) | The unused `StepContext.rng` stream is gone (`makeRng`, the field, and its construction). The step loop's doc now states it draws nothing and that the engine is seed-free except the cap tiebreak in `./resolve`. `seed` is still validated for the contract. No randomness was added. | `packages/sim/src/battle/continuous/step.ts`, `advance.ts` | `step.test.ts` *the same seed and the same intents replay the same hashes*; `resolve.test.ts` *an even seed breaks a dead heat to side 0, an odd seed to side 1* (the only remaining seed consumer); `grep` for `rng\|makeRng\|Math.random` under `battle/continuous` returns nothing |
| F7 (R1.F6) | `approachStep` returns before touching `stage` while dense playback owns the bodies, and the instant `downStep` snap is gated the same way; `down` still sets the flag and the impulse, which are not positions. | `apps/client/src/steps/approach.ts`, `down.ts` | `apps/client/src/steps/fire.test.ts` → *an approach stance move happens only when the step owns positions*; *a down snap happens only when the step owns positions* |
| F8 (R1.F7) | The disambiguated pair is now the key set the whole result is filed under: `sides.keys` comes from `fightKeys` and drives `finalHp`, `hpSnapshot` and every event's `actorKey`, so a mirror keeps `ember` and `ember#1`. The cup reader is unaffected because cup fields never pair a mirror (both sides carry distinct names). | `packages/sim/src/battle/continuous/resolve.ts` | `resolve.test.ts` → *a mirror keeps two sides in the result (FR-12)* (keys `["ember", "ember#1"]`, both present in the event log) |

## Re-pinned rows

One row moved, and only the F1 change forces it:

| File | Test | Before | After |
| --- | --- | --- | --- |
| `packages/sim/src/battle/continuous/strike.test.ts` | *both active frames land in the same step* | both `interrupted === false` | both `interrupted === true` (the blow did land inside the victim's startup window), while both attacks stay `phase === "active"` and `landed === true` — the trade is not cancelled (FR-7) |

No pacing, telemetry, or cup-golden row moved: `cup-contracts.test.ts`
(*SF exit: seed 3* → "Bonfire Brook") and `cup.golden.test.ts` (*seed 7* →
"Cindersnout") pass unmodified, telemetry's idle share is 31.4 % (the value the
bound's comment records), and every pacing row sits inside the band. The
computed pacing sample on the final run:

```
fire_drake v earth_tortoise      40.00s time  85-85
plant_ox v embercub              29.24s ko    46-59
water_axolotl v electric_hound   27.20s ko    46-59
electric_hound v earth_tortoise  40.00s time  91-38
fernstag v embercub              25.28s ko    53-55
wind_falcon v water_axolotl      29.60s ko    67-53
reefclaw v earth_tortoise        40.00s time  54-84
earth_tortoise v embercub        40.00s time  66-85
cindermoor v water_axolotl       34.40s ko    74-57
voltfox v earth_tortoise         39.68s ko    90-58
galeheron v embercub             40.00s time  61-55
shalemole v water_axolotl        39.68s ko    88-69
embercub v earth_tortoise        40.00s time  85-66
mossboar v embercub              38.48s ko    86-71
```

## Deviations

1. **Trade exception in F1.** The finding asked to classify `interrupted` from
   `before` and keep the cancellation implied by it. Applied literally, a
   simultaneous boundary trade (both swings opening on the same step, which is
   the common case because both controllers decide on the same cadence) cancels
   both swings, removes the authored recovery, and breaks AC-21 (24.80 s) and
   AC-14 (idle 46.7 %). The cancellation is therefore skipped when the victim
   also landed a blow in that step — AC-7's trade — while a one-sided blow on
   the final startup step still cancels. `interrupted` still reports the
   pre-step phase, so the flag reads "the blow landed inside the startup
   window"; a swing that traded keeps its active frame.
2. **`packages/sim/scripts` was added to the freeze scan** (F3), which is
   outside the plan's `Touches` list but inside this phase's `packages/sim/**`
   scope; the alternative (declaring scripts out of scope) was rejected because
   the allow-list claims to be the whole truth.
3. **`advance.ts` carries two findings.** The `whiffsOf` call-site fix (F1) and
   the `StepContext` rng removal (F6/R1.F5) live in the same file and could not
   be split without interactive staging, so both landed in `fafbca11`; the
   F6 commit `d54cc1df` covers `step.ts`.
4. **Comment trims for NFR-3.** The new prose pushed `strike.ts` and
   `resolve.ts` over the 12 KB cap; both were trimmed back under it without
   changing behaviour.
5. **`conductor/tracks/.../plan.md` is modified in the working tree** by the
   primary agent (the R1 task list). It is not part of any commit here.

## Primary verification

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| static + unit + determinism | `bun run verify` | 0 | 3801 pass, 3802 tests / 354 files, 118.01 s |
| build | `bun run build` | 0 | 398 modules |

The High finding was real and I had missed it: the swing was gated on the
post-advance phase while positions came from the pre-step snapshot, so every
active window lost its final 20 ms and a blow landing in a victim's last startup
step failed to interrupt it. The fix reads both ends of the step.

One deviation from the review's literal instruction is accepted and worth
recording: classifying interruption from the pre-step phase cancels both swings
in a simultaneous boundary trade, which broke the authored recovery and pushed
pacing to 24.80 s with idle at 46.7%. The fix therefore skips the cancellation
when the victim also landed in that step, so FR-6 (interruption) and FR-7
(trades) both hold. That is a judgement call, not a workaround, and it is pinned
by the re-pinned trade test.
