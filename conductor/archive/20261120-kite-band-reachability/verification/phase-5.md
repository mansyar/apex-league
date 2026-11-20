# Phase 5 verification — Narrow roster re-tune for D-2

- **Track:** 20261120-kite-band-reachability
- **Phase:** 5 (re-apply the candidate, then re-tune only two species)
- **Date:** 2026-11-20
- **Branch:** `chore/20261120-kite-band-reachability`
- **Base:** `1310de206028d4b4cb10ee8aa7fad8ff927af3a6` (track base); phase base
  `f64b7e21` (conductor plan: phase in progress)
- **Head:** the single phase-5 conventional commit
  `feat(sim): close D-2 with reachable kite band, 45s cap and roster re-tune`
  (SHA recorded in the phase report and `git log -1`)
- **Result:** **VERIFIED — SHIP.** All 34 gates green with the unchanged design
  band; `capShare` 22.0% (370/1680) strictly below baseline 30.8% (517/1680);
  only `water_axolotl` and `dune_jerboa` stat bounds changed.

## 1. Restoration proof (Step 1)

The full Phase 4 candidate was re-applied to the 13 named files from
`9fbaabdd7b122739aac3dbad73880017aaaca3b5` — Kite clamp (`maintainableGapMm`,
`isKiteBand`, `threatBandFor`), `FIGHT_CAP_MS` / `BAND_MAX_MS` /
`DURATION_MAX_MS` 45,000, `SIM_VERSION` 4 with ghost pins 4/5, and the new
`controller-profile.test.ts`. `git restore --source=9fbaabdd -- <paths>` was
permission-denied, so the exact bytes were applied through the native read/edit
tools against the byte-level diff; the new test file was staged with `git add`
so git could see it.

`git diff 9fbaabdd -- <13 paths>` was **empty** before any tuning — the restore
is byte-exact to the candidate commit. No evidence file was edited during the
restore.

## 2. Pre-tune 32/34 grid (`bun run balance`, exit 1)

| Metric | Observed |
| --- | --- |
| `capShare` | 21.3% (357/1680) |
| `decisiveShare` | 95.2% (1600/1680; 1319 ko + 281 cap wins) |
| `capWinQuality` | 78.7% (281/357) |
| `medianDuration` | 32.82 s (p05 16.44 s, max 45.00 s) |
| `damageBand` | 49/49 |
| fights | ko 1319 / time 357 / draw 4 |
| gates | 32 ok / **2 FAIL** |
| battle hash | `0xff6f3d62` |

- `FAIL species:water_axolotl` — 58.1% (93/160, 155 distinct, se 4.0%), bound
  `|rate - 50%| <= 7.9%`.
- `FAIL species:dune_jerboa` — 58.8% (94/160, 155 distinct, se 4.0%), bound
  `|rate - 50%| <= 7.9%`.

All other fences held. Design-band misses: water_axolotl 58.1%, electric_hound
55.3%, reefclaw 43.1%, galeheron 44.7%, dune_jerboa 58.8%, spark_ray 56.9%,
emberwing 44.4%.

## 3. Tuning method and every attempt

The species gate is a significance test (`|rate - 50%| <= 1.96·sqrt(0.25/distinct)`,
~7.9% here), so the two rows had to be pulled down toward 50%. Only two content
lines were ever edited. A temporary probe script under `.conductor/evidence/`
was permission-denied to execute, so every candidate was measured with
`bun run balance` after a direct source edit; focused tests were used to
enumerate required derived pins.

| # | Change (only these two species) | Result |
| --- | --- | --- |
| 1 | water `atk [8,10]` (max nerf), dune `atk [18,18]` | 34/34 gates, capShare 23.6% (396/1680), water 51.2%, dune 53.8% — **REJECTED**: cap at 10 is below the pinned water_axolotl bosses' `atk 12`, and Thessa's grind floor fell to 0.139 (< 0.35). |
| 2 | water `spd [6,11]` (atk restored), dune `atk [18,18]` | 34/34 gates, capShare 22.3% (375/1680), water 55.6% — **REJECTED**: outside the 45–55% design band. |
| 3 | water `spd [4,11]`, dune `atk [18,18]` | water 51.9% but `spark_ray` 58.1% gate FAIL (33/34) — **REJECTED**: a third species regressed. |
| 4 | water `atk [6,12]` (min nerf), dune `atk [18,18]` | 34/34 gates, capShare 23.6% (396/1680), water 51.2%, dune 53.8% — **REJECTED**: Thessa grind 0.111 (< 0.35). |
| 5 | water `atk [7,12]`, dune `atk [18,18]` | Thessa grind 0.278 (< 0.35) — **REJECTED**: any atk mean below 10 breaks the grind floor. |
| 6 | water `hp [142,178]`, `spd [6,11]`, dune `atk [18,18]` | 34/34 gates, water 55.0%, dune 53.1%, capShare 22.3% (374/1680) — **REJECTED**: broke `species.test.ts` reefclaw-spd design invariant (reefclaw spd max 7 !< axolotl spd min 6). |
| 7 | water `hp [138,178]` (pure HP-min nerf), dune `atk [18,18]` | water unchanged at 58.1% gate FAIL (33/34) — **REJECTED**: no-op at this granularity. |
| 8 | water `def [6,11]` (only def min 8→6), dune `atk [18,18]` | **ACCEPTED**: 34/34 gates, water 51.2%, dune 53.8%, capShare 22.0% (370/1680), boss/form/species focused tests green. |

Spd min could not go below 8 (reefclaw invariant), atk mean could not move
(boss stat legality plus Thessa grind floor), and HP-min moves were ineffectual;
the DEF floor was the only bounded lever that satisfied both gates without
touching a third species or any fence.

## 4. Final stat-bound values

- `packages/sim/src/species/starters.ts` — `water_axolotl.statBounds`:
  `hp [144, 178], atk [8, 12], def [6, 11], spd [8, 11]`
  (only `def` min `8 → 6`; temperament, kit and all other bounds unchanged).
- `packages/sim/src/species/discovery.ts` — `dune_jerboa.statBounds`:
  `hp [156, 158], atk [18, 18], def [8, 11], spd [17, 17]`
  (only `atk` `20 → 18`; rush temperament and earth kit unchanged).

No third species, move, kit, temperament, archetype, element, fence, target or
design band was touched.

## 5. Final `bun run balance` (exact quoted values)

```
ok   capShare:       observed 22.0% (370/1680), bound <= 33.3%
ok   decisiveShare:  observed 95.1% (1598/1680; 1306 ko + 292 cap wins at >= 5.00 pts), bound >= 66.7%
ok   capWinQuality:  observed 78.9% (292/370 cap wins clear 5.00 pts), bound >= 66.7%
ok   medianDuration: observed 32.80s, bound inside 25.00s..45.00s (>= 25.00s and < 45.00s)
ok   durationMax:    observed 45.00s, bound <= 45.00s
ok   damageBand:     observed 49/49 moves inside, bound 4%..12% of the 189 pool
ok   species:water_axolotl: observed 51.2% (82/160, 156 distinct, se 4.0%), bound |rate - 50%| <= 7.8%
ok   species:dune_jerboa:   observed 53.8% (86/160, 152 distinct, se 4.1%), bound |rate - 50%| <= 7.9%
```

All **34/34 gates green** (21 species rows + 13 policy gates). Fights
1680 (ko 1306, time 370, draw 4); durationP05 16.52 s (min 6.22 s); cap margin
p05 0.19 / median 14.71 / p95 54.90 pts; diversity 49.8%. Design-band misses
(3, diagnostic only): electric_hound 55.9%, spark_ray 57.5%, emberwing 44.4%.
Reference line spread earth_tortoise 29.4% .. reefclaw 65.6%; reference cap
580/1680 (34.5%). Boss table: koda 22/42, hesse 9/42, marlow 18/42, delmar
14/42, fenn 24/42, thessa 25/42. Battle hash `0xff6f3d62`.

## 6. Before/after focused test counts

| Focused set | Before re-pins | After re-pins |
| --- | --- | --- |
| clock.contract + stream + telemetry + fixture-audit + balance-report | 61 pass / 2 fail | **63 pass / 0 fail** (41727 `expect()` calls, 46.14 s) |
| bosses.balance + form.balance + bosses + species | 31 pass / 2 fail (atk-min attempt) | **150 pass / 0 fail** (1363 `expect()` calls) |
| Full verify | 19 → 14 → 11 → 10 → 2 fail across tuning and re-pin passes | **4458 pass / 1 skip / 0 fail** |

Re-pinned derived assertions only: clock.contract stagger coverage and
`bestStrike 16 → 22` plus 15 water_axolotl GOLDEN digests; stream replay bound
72,036 → 81,036 B (45 s cap ⇒ 2250 steps); telemetry cap assertion, durationMax
bound and metric-name pins; fixture-audit cells B 8/35_120/34, C 7/29_880/35,
D 5/31_260/37; balance-report distinct pins (earth_tortoise 153, reefclaw 154)
and design-band-miss expectation `["electric_hound","spark_ray","emberwing"]`.

## 7. Verification commands (each run separately)

| Command | Exit | Counts / result |
| --- | --- | --- |
| `bun run verify` | 0 | 4458 pass / 1 skip / 0 fail, 670470 `expect()` calls, 4459 tests / 437 files, 68.86 s. Includes `bun run check` (4 packages), Biome (1032 files, clean) and `bun run gate:determinism` (21 species × 3 stages + 5 props byte-identical). |
| `bun run build` | 0 | Vite 438 modules, built in 347 ms; pre-existing non-blocking >500 kB chunk warning only. |
| `bun run balance` | 0 | 34/34 gates green; capShare 370/1680 (22.0%); decisiveShare 95.1%; capWinQuality 78.9%; median 32.80 s; max 45.00 s; damage 49/49. |
| `bun run gate:determinism` | 0 | Primary independent re-run: all 21 species × 3 stages + 5 props byte-identical. Also embedded in green `verify`. |
| `bun run test:fuzz` | 0 | Primary independent re-run: 139 pass / 0 fail, 129015 `expect()` calls (full voxel sweep). |
| focused controller/ghost/species tests | 0 | 63/0 re-pin files + 150/0 boss/form/species; controller-profile slow-Kite, ghost v4/legacy/future tests covered. |
| `bun run trace --owned earth_tortoise --rival embercub --doctrine kite --rival-doctrine press --seed 20261120 --check` | 0 | 2250 steps / 45.00 s; ending `time — Embercub wins`; gap min 499 / median **1110** / max 3984 mm; 5/5 invariants ok; hash **`0x1d0cc2ed`**. |

The two commands denied to the phase subagent were independently re-run by the
primary with exit 0; all five configured commands and all focused checks are
green on the final tree.

## 8. Hashes and module caps

- Battle / final hash: `0xff6f3d62` (unchanged from baseline and Phase 4
  candidate). Verify's embedded trace (wind_falcon v water_axolotl, seed
  20261111): duration 39680 ms, hash `0xff6f3d62`, median gap 1117 mm.
- Pinned trace seed 20261120 (kite vs press): `0x1d0cc2ed`, median gap 1110 mm —
  identical to the Phase 4 candidate (neither re-tuned species appears in this
  matchup). Baseline was `0x1368d19b` (1145 mm).
- Replay guard: `SIM_VERSION` 4, ghost pins 4/5, legacy v3 rejected, future v5
  rejected, v4 byte-identical.
- Module caps: client / sim / server **12,288 B** each, voxel **24,576 B**;
  size-only enforcement, no allowlist. No cap raised, no source module grew.
  The `stream.test.ts` replay-record pin (72,036 → 81,036 B) is a
  frame-count consequence of the 45 s cap, not a module cap or balance fence.

## 9. Scope proof

`git diff f64b7e21 --name-only` (phase base to final tree, before the single
phase-5 commit) lists 18 source/test/script files: the 13 restored candidate
files, `clock.contract.test.ts` and `stream.test.ts` (derived pins from the
candidate), the two allowed species files, and `battle-telemetry.ts` (deviation
below). Plus this evidence file and `verification/integrated.md`. The two
ship-only doc files were applied by the primary after independent verification.
No client/server production file, no `packages/voxel/`
file, no dependency, lockfile, manifest, deploy file, save schema, protocol,
API, CORS change and no allowlist. No Conductor state edit beyond the two
verification files; no push, PR, merge, branch switch, reset, rebase or
force-push. Working tree clean after the single commit.

## 10. Deviations

- `packages/sim/scripts/battle-telemetry.ts` — the telemetry `BOUNDS.durationMax`
  value `40_000 → 45_000` and its `why` string were the smallest necessary
  out-of-Touches change: the 45 s fight cap in the restored candidate makes the
  old 40 s telemetry bound impossible to satisfy. One value + one string.

## 11. Blockers — resolved by primary

- `bun run gate:determinism` — independently re-run by primary, exit 0.
- `bun run test:fuzz` — independently re-run by primary, exit 0 (139 pass / 0 fail).
- `conductor/product.md` — dated 2026-11-20 D-2 closure note applied by primary.
- `conductor/tech-stack.md` — dated sim v4 / 45 s / two-species note applied by primary.

## 12. Final verdict

**SHIP.** The owner's "Fix it here" directive is satisfied: the full Phase 4
candidate is restored byte-exactly, the two red species are back inside the
unchanged 45–55% design band (51.2% and 53.8%), all 34 balance gates are green,
and `capShare` is strictly lower than baseline (22.0% vs 30.8%, 370 vs 517 of
1680). Only the two allowed species' stat bounds changed.

## 13. Primary verification (final tree, HEAD `9abb7c37`)

All five configured commands, the focused test set and the pinned trace were
independently re-run by the primary; all exited 0.

| Command | Exit | Primary result |
| --- | --- | --- |
| `bun run verify` | 0 | 4458 pass / 1 skip / 0 fail, 670470 `expect()` calls, 4459 tests / 437 files, hash `0xff6f3d62`, typecheck + Biome clean, determinism gate embedded. |
| `bun run build` | 0 | Vite 438 modules, pre-existing >500 kB chunk warning only. |
| `bun run balance` | 0 | 1680 fights, 34/34 gates, capShare 22.0% (370/1680), decisiveShare 95.1%, capWinQuality 78.9%, median 32.80 s, max 45.00 s, damage 49/49. |
| `bun run gate:determinism` | 0 | All 21 species × 3 stages + 5 props byte-identical. |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls. |
| focused controller/clock/ghost/species tests | 0 | 122 pass / 0 fail, 46171 `expect()` calls. |
| pinned trace | 0 | 2250 steps / 45.00 s, median gap 1110 mm, hash `0x1d0cc2ed`, 5/5 invariants ok. |

Output directory: `C:\Users\Ansyar\AppData\Local\Temp\opencode\d2-p5-verify\`.
The two ship-only doc notes were applied by the primary and verified by diff.
`git diff f64b7e21 --name-status` remains confined to the documented source,
test, script, verification and two approved doc files. Verdict: Phase 5 accepted.
