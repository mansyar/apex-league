# Phase 5 — Recovery Shape, and Stop Advertising a Dead Stat

Track: `20261109-battle-spacing-cadence`
Branch: `feat/20261109-battle-spacing-cadence`
Base: `2a4e348c` (Phase 4)

## What this phase changed

The owner's complaint was "the cooldown of moves are too fast". It had two
parts, and both are fixed here:

1. **The recovery tail was too short to read as a commitment.** Every authored
   `recoveryMs` is widened by hand (no multiplier) so the tail is comparable to
   startup plus active instead of a 140–500 ms afterthought. A basic strike now
   spends 250 ms recovering out of a 390 ms frame cycle (64.1%), where it spent
   140 of 280 ms (50.0%) before.
2. **The spar kit panel advertised `Cooldown 1`,** a `MoveDef.cooldown` number
   that only the frozen gauge clock reads. The live continuous path never
   consults it, so the number was meaningless to the player. The panel now
   reads `Recovery <n> ms` from `getFrameData(moveId)` — the table the engine
   actually paces moves with.

Deliberately untouched: `battle/moves.ts` (and therefore `MoveDef.cooldown`,
which stays for the frozen gauge path), `DECISION_MS`, stamina costs and regen,
`HP_SCALE_PERCENT`, spacing constants, `SIM_VERSION`, `resolver.ts`,
`clock/`, `clock.freeze.test.ts`, and every `*.balance.test.ts`.

## 1. Authored recovery, old vs new (P5.T1)

`packages/sim/src/battle/frames.ts`. Cycle = startup + active + recovery; the
share is recovery over that cycle (it excludes the 240 ms decision cadence and
travel, so it is the frame-level commitment, not the wall-clock attack period).

| move | cd | startup | active | old rec | new rec | new cycle | old share | new share |
| ---- | -: | ------: | -----: | ------: | ------: | --------: | --------: | --------: |
| basic | 0 | 80 | 60 | 140 | **250** | 390 | 50.0% | 64.1% |
| spark | 1 | 130 | 60 | 180 | **300** | 490 | 48.6% | 61.2% |
| flame_charge | 1 | 150 | 70 | 210 | **330** | 550 | 48.8% | 60.0% |
| cinder_shot | 2 | 220 | 80 | 280 | **470** | 770 | 48.3% | 61.0% |
| blaze_bolt | 2 | 280 | 90 | 340 | **510** | 880 | 47.9% | 58.0% |
| flare_dart | 1 | 110 | 50 | 160 | **300** | 460 | 50.0% | 65.2% |
| pyre_lance | 3 | 360 | 110 | 460 | **690** | 1160 | 49.5% | 59.5% |
| seed_shot | 1 | 130 | 60 | 180 | **300** | 490 | 48.6% | 61.2% |
| thorn_volley | 1 | 170 | 70 | 210 | **330** | 570 | 46.7% | 57.9% |
| spore_burst | 2 | 220 | 80 | 280 | **470** | 770 | 48.3% | 61.0% |
| bramble_dart | 2 | 280 | 90 | 340 | **510** | 880 | 47.9% | 58.0% |
| vine_lash | 1 | 110 | 50 | 160 | **300** | 460 | 50.0% | 65.2% |
| root_quake | 3 | 380 | 110 | 480 | **710** | 1200 | 49.5% | 59.2% |
| bubble | 1 | 130 | 60 | 180 | **300** | 490 | 48.6% | 61.2% |
| tide_shot | 1 | 170 | 70 | 210 | **330** | 570 | 46.7% | 57.9% |
| foam_volley | 2 | 220 | 80 | 280 | **470** | 770 | 48.3% | 61.0% |
| splash_bolt | 2 | 280 | 90 | 340 | **510** | 880 | 47.9% | 58.0% |
| mist_spray | 1 | 110 | 50 | 160 | **300** | 460 | 50.0% | 65.2% |
| maelstrom | 3 | 360 | 110 | 460 | **690** | 1160 | 49.5% | 59.5% |
| cinder_dive | 2 | 240 | 100 | 340 | **490** | 830 | 50.0% | 59.0% |
| pyre_wall | 2 | 260 | 220 | 300 | **470** | 950 | 38.5% | 49.5% |
| thorn_charge | 2 | 260 | 100 | 360 | **510** | 870 | 50.0% | 58.6% |
| bramble_guard | 2 | 280 | 240 | 320 | **480** | 1000 | 38.1% | 48.0% |
| riptide_rush | 2 | 250 | 90 | 350 | **500** | 840 | 50.7% | 59.5% |
| tide_aegis | 2 | 270 | 220 | 310 | **470** | 960 | 38.8% | 49.0% |
| static_jolt | 1 | 120 | 60 | 170 | **300** | 480 | 48.6% | 62.5% |
| volt_dash | 1 | 140 | 70 | 200 | **330** | 540 | 48.8% | 61.1% |
| arc_shot | 2 | 200 | 80 | 260 | **460** | 740 | 48.1% | 62.2% |
| storm_bolt | 2 | 260 | 90 | 320 | **500** | 850 | 47.8% | 58.8% |
| ion_dart | 1 | 100 | 50 | 150 | **300** | 450 | 50.0% | 66.7% |
| gigavolt | 3 | 340 | 110 | 440 | **680** | 1130 | 49.4% | 60.2% |
| storm_surge | 2 | 240 | 90 | 330 | **490** | 820 | 50.0% | 59.8% |
| ion_wall | 2 | 250 | 200 | 300 | **460** | 910 | 40.0% | 50.5% |
| pebble_shot | 1 | 150 | 60 | 200 | **310** | 520 | 48.8% | 59.6% |
| dust_devil | 1 | 190 | 70 | 230 | **340** | 600 | 46.9% | 56.7% |
| clay_burst | 2 | 240 | 80 | 300 | **480** | 800 | 48.4% | 60.0% |
| boulder_toss | 2 | 300 | 90 | 360 | **520** | 910 | 48.0% | 57.1% |
| sand_blast | 1 | 120 | 50 | 170 | **300** | 470 | 50.0% | 63.8% |
| tectonic_slam | 3 | 400 | 110 | 500 | **720** | 1230 | 49.5% | 58.5% |
| quake_stomp | 2 | 320 | 120 | 400 | **520** | 960 | 47.6% | 54.2% |
| basalt_guard | 2 | 300 | 260 | 340 | **490** | 1050 | 37.8% | 46.7% |
| gust | 1 | 110 | 60 | 160 | **300** | 470 | 48.5% | 63.8% |
| feather_dart | 1 | 140 | 70 | 190 | **330** | 540 | 47.5% | 61.1% |
| gale_cutter | 2 | 200 | 80 | 250 | **460** | 740 | 47.2% | 62.2% |
| sky_bolt | 2 | 250 | 90 | 310 | **500** | 840 | 47.7% | 59.5% |
| talon_slash | 1 | 90 | 50 | 150 | **300** | 440 | 51.7% | 68.2% |
| hurricane_spiral | 3 | 340 | 110 | 440 | **670** | 1120 | 49.4% | 59.8% |
| cyclone_dive | 2 | 230 | 90 | 320 | **480** | 800 | 50.0% | 60.0% |
| zephyr_veil | 2 | 240 | 210 | 290 | **460** | 910 | 39.2% | 50.5% |

Band summary (the brief's target shape, all met):

| band | cooldown | old range | new range |
| ---- | -------: | --------- | --------- |
| basic | 0 | 140 | 250 |
| light | 1 | 150–230 | 300–340 |
| mid | 2 | 250–400 | 460–520 |
| heavy | 3 | 440–500 | 670–720 |

Ordering invariants held without a single test change in `frames.test.ts`:
`max(band n) < min(band n+1)` for recovery across 0→1→2→3 (250 < 300, 340 <
460, 520 < 670); each element kit's rows still start slower and recover longer
as cooldown rises (row 1 < 2 < 3); each kit's index-5 finisher still has the
longest startup and recovery in its kit. Startup, active, reach, bands, poise,
and stamina were not touched, so the rest of the frame validator's ordering
pins are untouched too.

Why the hand-authored values cluster at the bottom of each target range: see
§3 — the wider variant cost the same number of capped fights as this one, so
there was no telemetry reason to take the extra length.

## 2. The panel (P5.T2)

`apps/client/src/battleUI.ts` — `moveStatLine(move, daysToUnlock?,
evolutionUnlocks?)`:

| state | before | after |
| ----- | ------ | ----- |
| unlocked, `spark` | `Power 24 · Accuracy 85% · Cooldown 1` | `Power 24 · Accuracy 85% · Recovery 300 ms` |
| unlocked, `basic` | `Power 4 · Accuracy 100% · Cooldown 0` | `Power 4 · Accuracy 100% · Recovery 250 ms` |
| locked, `spark`, 3 days | `Unlocks in 3 days · Power 24 · Accuracy 85% · Cooldown 1` | `Unlocks in 3 days · Power 24 · Accuracy 85% · Recovery 300 ms` |
| no frame row (legacy id) | `Power 24 · Accuracy 85% · Cooldown 1` | `Power 24 · Accuracy 85%` |

Rules:

- The number is `getFrameData(move.id)?.recoveryMs`, labelled `Recovery`, in
  `ms`. It is the authored tail; the engine scales it by SPD at runtime
  (`recoveryMsFor`), which the panel does not attempt to preview because the
  kit picker has no chosen speed yet.
- A move with no frame row shows power and accuracy only — no invented number,
  and no fallback to the legacy `cooldown`.
- `MoveDef.cooldown` is untouched in `battle/moves.ts`; only its display is
  gone.
- One line feeds both the spar and cup kit pickers (`buildKitPicker`), so both
  are fixed at once.

`getFrameData` was not reachable from the client before: it was exported only
from `frames.ts` and consumed by sim internals. It is now re-exported through
`packages/sim/src/battle/index.ts` and the root `packages/sim/src/index.ts`
barrel, matching how `getMove` is exposed.

## 3. Measurement (P5.T3)

Every measurement below comes from `bun run verify`, which runs the same
14-fight sample (`resolveContinuous`, seeds `20261108 + i`) and prints the
telemetry table through `telemetry.test.ts`. `bun run telemetry` itself is
denied by this phase's shell policy; the table is identical because both call
the same harness.

### Two candidate bands

| candidate | basic | light | mid | heavy | duration | KO / cap | cap share | idle | contact |
| --------- | ----: | ----- | --- | ----- | -------- | -------- | --------- | ---- | ------- |
| Phase 4 (before) | 140 | 150–230 | 250–400 | 440–500 | 8.96–40.00 s | 10 / 4 | 28.6% | 46.1% | 3.7% |
| wide | 280 | 300–380 | 460–580 | 720–800 | 12.82–40.00 s | 9 / 5 | 35.7% | 34.5% | 5.2% |
| **kept** | **250** | **300–340** | **460–520** | **670–720** | **12.82–40.00 s** | **9 / 5** | **35.7%** | **37.1%** | **4.1%** |

The wide band was measured first and violated the cap bound. Narrowing to the
bottom of every target range did **not** recover the capped fight — it is still
5/14 — so the kept variant is the smaller change that meets the owner's
complaint. No further narrowing was attempted: below ~250 ms the tail stops
being comparable to startup plus active, which is the point of the phase.

### The fight-length tension, stated plainly

Widening recovery lengthens fights, and longer fights reach the cap more often.
The sample moved from 10 KO / 4 cap to 9 KO / 5 cap: **cap share 28.6% →
35.7%, against a bound of 33.3%.** The bound is not relaxed. `telemetry.test.ts`
now fails on exactly this, and the failure is left in place for the primary.

This is the conflict the spec's open assumption anticipated: "spacing wins if
band and cap conflict; report the miss rather than re-widen." The phase
delivers the cadence the owner asked for and reports the cap miss rather than
hiding it behind a looser threshold.

Two secondary effects, both in the safe direction: `idleShare` improved
46.1% → 37.1% (longer tails mean more of the fight has an attack running), and
the fastest fight moved 8.96 s → 12.82 s, so the distance from the 25 s spec
floor narrowed (still missed; carried debt from Phase 4).

### Telemetry before/after, all 13 bounds

| metric | bound | before | after | verdict |
| ------ | ----- | -----: | ----: | ------- |
| engagementMin | ≤ 900 mm | 380 | 380 | ok |
| engagementMedian | ≤ 1500 mm | 926 | 937 | ok |
| engagementMax | ≤ 4500 mm | 3984 | 3984 | ok |
| exchangeHome | ≤ 2.50/s | 0.72 | 0.64 | ok |
| exchangeAway | ≤ 2.50/s | 0.64 | 0.56 | ok |
| idleShare | ≤ 50.0% | 46.1% | 37.1% | ok |
| distinctPositions | ≥ 30 cells | 34 | 63 | ok |
| contactShare | ≤ 70.0% | 3.7% | 4.1% | ok |
| retreatHome | ≥ 14 orders | 5324 | 5344 | ok |
| retreatAway | ≥ 14 orders | 5072 | 5104 | ok |
| **capShare** | **≤ 33.3%** | **28.6%** | **35.7%** | **FAIL** |
| durationMin | ≥ 8.00 s | 8.96 | 12.82 | ok |
| durationMax | ≤ 40.00 s | 40.00 | 40.00 | ok |

Positions median 119 → 118, engagement median 926 → 937 mm: spacing is
essentially unchanged, as expected for a phase that only moved the tail.

### Kept sample (14 fights, kept band)

```
 1 fire_drake v earth_tortoise     40.00s time   19-19
 2 plant_ox v embercub             19.28s ko     12-16
 3 water_axolotl v electric_hound  40.00s time   25-7
 4 electric_hound v earth_tortoise 22.10s ko      7-8
 5 fernstag v embercub             21.78s ko     14-10
 6 wind_falcon v water_axolotl     12.82s ko      2-11
 7 reefclaw v earth_tortoise       40.00s time   17-3
 8 earth_tortoise v embercub       40.00s time    4-14
 9 cindermoor v water_axolotl      16.18s ko     16-12
10 voltfox v earth_tortoise        26.96s ko     25-13
11 galeheron v embercub            39.12s ko     20-21
12 shalemole v water_axolotl       38.06s ko     22-21
13 embercub v earth_tortoise       40.00s time   14-4
14 mossboar v embercub             29.12s ko     13-20
```

## 4. Re-pinned rows (only what the change forced)

No bound, no spacing constant, no stamina rule, and no HP dial was re-pinned.

| file | lines | pin | old → new | why |
| ---- | ----- | --- | --------- | --- |
| `packages/sim/src/battle/continuous/strike.test.ts` | 224–227 | `recoveryMsFor(basic, 5/10/20)` | 280/140/70 → 500/250/125 | basic authors 250 ms now; the FR-5 arithmetic pin follows the authored value |
| `packages/sim/src/battle/continuous/strike.test.ts` | 235–236 | zero-length rejection spd | 2000 → 3000 | `250 * 10 / 2000` truncates to 1, not 0; 3000 is the first spd that still proves the guard |
| `packages/sim/src/battle/continuous/stamina.test.ts` | 235–236, 251 | steps to finish a basic | 14 → 20 | 80 + 60 + 250 = 390 ms = 19.5 steps, so 20 steps end the attack |
| `packages/sim/src/cup-contracts.test.ts` | 184–190 | seed 101 rival winners | QF2 Tidecaller → Reedle Mirefin | emergent: the longer tail flips one rival quarterfinal |
| `packages/sim/src/cup-contracts.test.ts` | 275–290 | seed 3 specials lifecycle | champion/placement 1/3 verdicts → eliminated/placement 3/2 verdicts, champion null | emergent: the player now exits in the semifinal |
| `packages/sim/src/cup-contracts.test.ts` | 314–329 | seed 101 forfeit completion | SF1 and final Tidecaller → Reedle Mirefin | follows the QF2 flip |
| `packages/sim/src/cup-contracts.test.ts` | 363–368 | seed 101 day-14 QF2 | null (double KO) → Tidecaller Nibbles | emergent: the QF2 draw resolves to a clean win |
| `packages/sim/src/cup.golden.test.ts` | 427–442 | seed 101 forfeit transcript | QF2 and champion Tidecaller → Reedle Mirefin | follows the QF2 flip |
| `packages/sim/src/cup.golden.test.ts` | 472–487 | seed 101 completion | SF1 and final Tidecaller → Reedle Mirefin | follows the QF2 flip |
| `apps/client/src/battleUI.test.ts` | 91–137 | `moveStatLine` strings | `Cooldown N` → `Recovery N ms` (+ no-row fallback) | the panel change itself |

`packages/sim/src/battle/frames.test.ts` needed **no** change: every ordering
and validator pin still holds against the new numbers.

## 5. Commands

| command | result |
| ------- | ------ |
| `bun run verify` | **exited 1**: check passed on all 4 workspaces, `3813 pass / 1 skip / 3 fail` across 354 files; the 3 failures are `telemetry.test.ts`'s capShare assertions (§3). `biome check` and `gate:determinism` never ran because the suite stops before them |
| `bun run build` | exited 0 (vite, 399 modules, 605 ms) |
| `bun run telemetry` | **denied by shell policy** (`permission.rejected`); the same table is printed by `telemetry.test.ts` inside `bun run verify` |
| `bunx biome check <changed files>` | denied by shell policy; formatting of the changed hunks was hand-checked to the repo's 80-column style, but no automated formatter ran |

## 6. Acceptance criteria

| criterion | status | note |
| --------- | ------ | ---- |
| FR-5: recovery scales inversely with spd | met | `recoveryMsFor` unchanged; its arithmetic pins re-based on 250 |
| FR-6 / AC-7: fights 25–40 s | **missed** | 12.82–40.00 s; the 25 s floor is carried debt from Phase 4 |
| FR-6 / AC-7: cap share ≤ 1/3 | **missed** | 5/14 = 35.7% vs 33.3%; left failing on purpose (spec open assumption) |
| Attack rate ≤ 0.7/s per side | met | 0.64 home / 0.56 away |
| Median engagement ≥ 900 mm, contact < 40% | met | 937 mm, 4.1% |
| Owner: recovery reads as a commitment | met | basic 50.0% → 64.1% of the frame cycle |
| Owner: panel no longer shows a dead stat | met | `Recovery <n> ms` from the frame table |

## 7. Deviations

- **`packages/sim/src/battle/index.ts`, `packages/sim/src/index.ts`** — one
  export line each to make `getFrameData` reachable from the client. Without
  it the panel cannot read the frame table; the alternative (importing
  `packages/sim/src/battle/frames.ts` across the package boundary) would break
  the single-barrel convention.
- **`strike.test.ts`, `stamina.test.ts`** — co-located tests, re-pinned only
  where the new basic tail changes the arithmetic or the step count.
- **`cup-contracts.test.ts`, `cup.golden.test.ts`** — emergent fixture
  outcomes; listed row by row in §4.
- **`frames.ts` doc comment** — the file's own header described the numbers as
  "plausible, not tuned"; it now records the widening and the band.

## 8. Notes for the primary

- **The one decision left is capShare.** 35.7% against 33.3% is the price of
  the cadence fix; the spec's open assumption says report the miss rather than
  re-widen, so it is reported and left failing. If the primary would rather
  keep the gate green, the only levers left are outside this phase's Touches
  (HP scale, decision cadence) — reducing recovery back toward the old values
  would undo the phase's whole purpose.
- **`biome check` and `gate:determinism` did not run** because `bun run
  verify` stops at the failing suite. The primary should re-run the full chain
  after ruling on capShare; the changed hunks were written to the existing
  80-column style and every edited row has the same character width as the row
  it replaced.
- **No visual capture.** The dev server is not runnable under this phase's
  shell policy, so the panel is evidenced by the pure-string test rather than a
  screenshot. The rendered string shape is identical for both kit pickers.
- **Fight 6 is the new floor** (12.82 s, wind_falcon v water_axolotl). The
  sample's fastest fight is now 3.86 s longer than Phase 4's, which is the
  clearest single sign the tails bind.
