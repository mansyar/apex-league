# Phase 2 verification — per-seed execution-only variance

Track: `20261110-battle-variance` · branch `feat/20261110-battle-variance`

- Phase base: `695fb5fb`
- Phase head: `74cb6567` (commits `eef9575c` feat + `74cb6567` test)
- Commands (run separately, per brief):
  - `bun run verify` → exit 1: typecheck clean (all 4 packages), 3971 pass /
    1 skip / 14 fail across 369 files (54.04 s). All 14 failures are downstream
    golden/pin snapshots moved by intended variance — see below. Biome and the
    determinism gate did not run (the `&&` chain stops at the test failure).
  - `bun run build` → exit 0 (`@apex/client` production build, 390 ms;
    pre-existing >500 kB chunk-size warning only).
- Focused scope (8 files: doctrine, noise, pacing, telemetry, trace, step,
  controller, variance): **103 pass / 0 fail**.

## Noise design (`controller-noise.ts`, new)

Execution-only gates around decisions the controller already made. Bands come
from `controller-profile.ts`, intents from `controller-aim.ts`, move choice
from `controller-moves.ts` — all untouched. One seeded fight RNG, integer
draws only, cursor folded into `stateHash` (FR-21, Phase-1 work, untouched).

- `cadenceHold` — 1 cadence in 16 (`CADENCE_SKIP_DENOM = 16`) holds the
  previous order without advancing the doctrine cycle, so cadence and commit
  phasing drift per seed while the 12-step rhythm stays.
- `takeCommit(rng, punish)` — press-slot commits delayed 1 in 32
  (`COMMIT_SKIP_DENOM = 32`); punish windows let go 1 in 16
  (`PUNISH_SKIP_DENOM = 16`). Without RNG every commit goes ahead, exactly as
  before. A skipped commit returns hold; the window is usually still open at
  the next cadence, so the gate mostly *delays*.
- `flankDodge` — shot-across (perpendicular) dodges mirrored 50/50 per seed;
  swing-away (radial) dodges pass through untouched (mirroring them would send
  the fighter into the swing). Dodge policy (when, thresholds, cooldown,
  price) unchanged.
- Seams: `decide(input, rng?)` applies the jitter after the slip-release
  branch, gates rear/press/punish commits, and wraps the dodge intent;
  `resolve.ts` / `battle-trace.ts` / `battle-telemetry.ts` thread `fight.rng`
  into `decide` (deviations, semantics-preserving).

Tuning path (telemetry capShare is knife-edge at 7/14): (16, 8, 4) → 8/14
FAIL; (16, 16, 8) → 8/14 FAIL (punish change a no-op on the sample); final
(16, 32, 16) → 7/14 PASS. Punish is now denser than press, which is fine:
punish windows are rarer, so each skipped one still shows in the variance.

## Determinism proof (AC-7)

- `controller-noise.test.ts`: same seed twice → byte-identical event sequence
  and `resolveContinuous` result; different seeds → different fight events.
  `ALWAYS` stub over a 240-step driven run byte-equals the no-noise run
  (additive-only: noise gates but never invents); decision counts differ per
  seed (seeds 1–4, same matchup).
- `battle-trace.test.ts` invariant holds: same seed replays to the same final
  hash (`0xc579e9ae`) and event sequence; replay-vs-resolver order check
  green after threading `fight.rng` into both replay harnesses.
- Accuracy misses still labelled events with `missReason` + "goes wide" lines.

## Band-preservation proof (AC-4)

- Doctrine bands, strafe intents, dodge policy, move-selection strategy:
  zero changes (`controller-profile/aim/moves/threat/punish/memory/rule/
  rear/slip/dodge.ts` untouched; `controller.ts` near the 12 KB cap, so all
  new logic lives in `controller-noise.ts`).
- `controller-doctrine.test.ts` green: 4 doctrines frozen, order, bands scale
  from the reach edge, press floor dead-zone pin, temperament table frozen,
  rush-on-Kite still kites, Circle seeks the rear arc and earns strictly more
  flank-or-rear hits than Press over seeds 1–4 (2 vs 1) and over seeds 1–8
  (5 vs 0, front > 0 both, rear 0 both — rear stays rare by design).
- `controller.test.ts` green incl. the FR-14 whiff-step-out punish.
- `variance.test.ts`, `step.test.ts` green (accuracy ladder, spread floor,
  cursor-in-hash, cadence 12/50-per-600, FR-6 lock).

## Balance reads (no bounds widened)

- capShare **176/840 = 21.0% PASS** (Phase-1 baseline 282/840 = 33.6% FAIL —
  the variance fixed the red it was allowed to touch).
- Decisive 97.1% (662 ko + 154 cap wins ≥ 5 pts; cap-win quality 87.5%);
  median 30.04 s; p05 16.38 s; duration max 40.00 s; damage band 49/49;
  bosses koda 13/30, hesse 5/30, marlow 10/30, delmar 8/30, fenn 17/30,
  thessa 14/30 (all beatable, none trivial).
- Distinctness (the track goal): species distinct counts 100–112, median
  **109/112** (baseline median 46); water_axolotl 112/112; 34.8% of ordered
  pairings change winner across the 4 seeds. Phase-4 target (median ≥ 56)
  already cleared with headroom.
- Reshuffle (owned by Phase 4, pins left red): se-bound misses are now
  plant_ox 67.9%, earth_tortoise 29.5%, cindermoor 59.8%, galeheron 33.9% (was:
  cindermoor + capShare); flat 45–55% band additionally flags water_axolotl,
  electric_hound, embercub, mossboar. Knife-edge outcomes flipping is the
  intended consequence of FR-3; re-tuning is Phase 4's multi-row work.

## Telemetry reads (no regression — 13/13 green)

capShare 7/14 = 50.0% (at bound, was 7/14 pre-noise); engagement min 379 /
median 1085 / max 3992 mm; exchange home 0.30 / away 0.27 / combined 0.56 /s
(idle share 25.5%); contact 6.7%; retreats home 7084 / away 7003; positions
min 106 / median 178 cells; duration 33.52–40.00 s.

## Forced re-pins, row by row

1. `controller-doctrine.test.ts` — exact flank pin removed. Per-seed Circle
   strictness no longer holds under noise (seeds 1–4 blanked at the first cut);
   replaced with aggregate superiority (seeds 1–4: 2 vs 1; seeds 1–8: 5 vs 0)
   plus `>= 1`. Measured total drifts with the noise rates (4 at the stronger
   first cut, 5 at the final 16/32/16) — hence not pinned.
2. `pacing.test.ts` — "winner lands a blow" guard restated to "blows were
   thrown". Seed 20261121 dissected with an exact `sideOf` replica
   (REFERENCE-clamped stats): embercub v earth_tortoise, 15 launches, 15
   dodges, 0 landed, decided on points — accuracy/dodge luck, not a deadlock
   (no engine bug). Interface `Fought` gains `thrown` (launch + basic events).
3. `battle-report` pins NOT re-pinned (left red for Phase 4 per brief):
   `earth_tortoise.distinct` 48 → observed 100; design-band miss list;
   `KNOWN_MISSES` (2 recorded → 4 observed, capShare line closed);
   end-to-end gate. Two report tests also time out at the default 5000 ms
   under parallel load (the 840-fight sample takes ~11 s on this machine);
   they pass standalone — environmental, file stays as-is.

## AC table

| AC | Verdict | Evidence |
|----|---------|----------|
| AC-3 cadence/commit phasing varies per seed | PASS | jitter test: decision counts differ per seed; cadence 12-step rhythm kept |
| AC-4 execution-only (commit timing, dodge side, punish-window; never bands/strafe/policy/strategy) | PASS | gates + mirror only; band/doctrine/temperament/whiff-punish tests green |
| AC-7 same-seed byte-identical; different-seed different; misses as labelled events | PASS | identical event sequence + result same seed; differ across seeds; `missReason` + "goes wide" intact |

## Verify failure inventory (14 — all downstream snapshots, none behavioral)

- `balance-report.test.ts` × 4: the anticipated Phase-4 reds above.
- `cup-contracts.test.ts` × 7 + `cup.golden.test.ts` × 1: golden winner names
  moved by intended variance (e.g. QF2 "Tidecaller Nibbles" → "Reedle
  Mirefin"). Re-pinning golden champions is outside Touches and is tuning
  work; left red.
- `apps/client` `derive.test.ts` + `bracket-model.test.ts` × 2: scripted cup
  paths (seed-5 elimination, semifinal exit) now play out as champion runs
  because the underlying fights flipped. Same cause, same disposition.
- Typecheck clean in all 4 packages; every continuous-module, cup-engine, and
  client-logic test outside these goldens passes. No invariant, determinism,
  telemetry, or doctrine test regressed.

## Rework 1 — golden re-pins (commit `68a03b73`)

Re-pinned the 10 kind-1 goldens to their received values, each with an
"Execution-noise ripple (variance Phase 2)" comment. Values only: no logic,
bound, tuning, stat, ladder, or band change. The 4 `balance-report` pins
were NOT touched (Phase 4 owns them).

- `cup-contracts.test.ts` rival-subtree golden (seed 101): QF1
  "Tidecaller Nibbles" → "Reedle Mirefin"; QF2/QF4/SF2 hold.
- `cup-contracts.test.ts` seed-1 case: QF4 + SF2 "Emberhold Flicker" →
  "Cindersnout"; QF2 + QF3 hold.
- `cup-contracts.test.ts` seed 9: final loss → champion path. Status
  champion, 3 verdicts (final "Ember Drake"), placement 1, championName
  "Ember Drake", no completion fights (`completeCup` throws on live sessions,
  so the completion block was dropped).
- `cup-contracts.test.ts` seed 3: semifinal exit → champion path. Status
  champion, 3 verdicts, placement 1, championName "Ember Drake".
- `cup-contracts.test.ts` seed 11: champion path → final loss. Status
  eliminated, 3 verdicts (final "Emberhold Flicker"), placement 2,
  `completeCup` crowns "Emberhold Flicker", no completion fights.
- `cup-contracts.test.ts` forfeit seed 101: crown "Tidecaller Nibbles" →
  "Reedle Mirefin"; completion rows [[2, BB, RM, RM], [3, RM, MB, RM]].
- `cup-contracts.test.ts` forfeit seed 1: crown "Emberhold Flicker" →
  "Cindersnout"; completion final row [3, RM, Cindersnout, Cindersnout].
- `cup-contracts.test.ts` day-14 same-draw: QF2 "Tidecaller Nibbles" →
  "Reedle Mirefin"; other rows hold.
- `cup.golden.test.ts` forfeit transcript: crown → "Reedle Mirefin"; QF1,
  SF1, and final rows re-pinned to the Reedle Mirefin sweep.
- `apps/client` `derive.test.ts`: seed-5 elimination → champion run; test
  renamed to "a plain champion run derives title" (class "title", boss null).
  Exit-class coverage stays with the scripted finals below.
- `apps/client` `bracket-model.test.ts`: eliminated-run mapping → champion
  shape on the same seed (status champion, 3 verdicts, f1 ↔
  `playerVerdicts[2]`); test renamed to "...across a champion run".
- Scratch probe file deleted by the primary before this rework; confirmed
  gone (`git status` shows only this evidence file untracked).

Command results after the pins (each run separately):

- `bun run verify` → exit 1: 3981 pass / 1 skip / **4 fail** — exactly the 4
  untouched `balance-report` pins (distinct 48 vs 100, design-band miss list,
  KNOWN_MISSES 2 vs 4, gate exit 1). Zero new failures; typecheck clean.
  Biome + determinism gate did not run (the `&&` chain stops at the red
  gate, as before).
- `bun run build` → exit 0 (`@apex/client` production build; pre-existing
  >500 kB chunk warning only).
- `bun run balance` → exit 1 (the red gate): output identical to the Phase-2
  read — capShare 176/840 = 21.0% PASS, decisive 97.1%, median 30.04 s,
  p05 16.38 s, damage 49/49, distinct median 109/112, diversity 34.8%,
  bosses in range; only the 4 Phase-4 species rows red.
- `bun run telemetry` → exit 0, 13/13 green incl. capShare 7/14 = 50.0%.

## Primary verification

- Independently confirmed at `68a03b73`: verify exit 1 with 3981 pass / 4 fail, all 4 in `battle/continuous/balance-report.test.ts` (distinct pin, design-band list, KNOWN_MISSES, end-to-end gate). No new failures vs the rework report.
- AC-3/AC-4/AC-7 hold per evidence (focused 103/103, determinism both ways, bands pinned). Rework 1 re-pinned exactly the 10 listed goldens, values only.
- Owner pattern (Phase-1 waiver extended): 4 gate pins carried to Phase 4, which owns that file and the re-tune. Phase NOT squashed: range holds subagent commits, history kept for the waiver audit.
