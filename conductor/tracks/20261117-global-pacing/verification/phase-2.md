# Global Pacing — Phase 2 verification: raise throughput in the shared controller

- **Track:** `20261117-global-pacing` — Global Pacing
- **Phase:** 2 — Raise throughput in the shared controller
- **Date:** 2026-11-17
- **Branch:** `chore/20261117-global-pacing` (checked out throughout; never switched)
- **Base:** `ed8f020fd60b6498ef19060b264e9d41d971faed`
- **Head:** `ed8f020fd60b6498ef19060b264e9d41d971faed` (no source delta — see §4)
- **Result:** `blocked`

## 1. Verdict

No single controller-policy rung satisfies the phase contract. The fixture target
(≤ 14/42) is reachable once — `DECISION_MS = 200` lands 13/42 — but that same rung
turns four previously-green matrix species-band rows red and flips `bun run balance`
to exit 1. All other rungs stay above 14/42 on the fixture (best 17/42). This is
exactly the Phase 1 block condition: *"a rung breaks ... any green gate"* and
*"after all four rung families are exhausted, telemetry stays >14/42 ... a structural
shortfall that would need damage/pool/cap changes, which are out of scope"*
(phase-1.md §6). No bound, target, tolerance, cap duration, `DISTINCT_FLOOR`,
`BOUNDS`, `CAP_MAX`, doctrine band, reach geometry, damage, stamina, poise, frame
data or species value was edited, and no assertion was weakened.

Per the measurement protocol ("if none passes, leave the tree at its phase base"),
every knob was restored. `git diff --stat` is empty against the base. Stats are the
next phase's fallback (plan Phase 3); this phase does not lower the target.

## 2. Commands table (all run on the final, unchanged base tree)

| Command | Exit | Summary |
| --- | --- | --- |
| `bun run telemetry` | 0 | 42 pairings; `cap share: 20/42 (47.6%)`; 14/14 `ok` bounds; dead zone 27 commits (2.9%); exchange 0.32/s home + 0.32/s away; idle 25.7%; positions 46 min / 163 median; duration 14.48–40.00 s |
| `bun run balance` | 0 | 840 fights; `cap share: 224/840 (26.7%)`; 15/15 species `ok`; 49/49 moves in 4–12% band; decisive 803/840 (95.6%); cap-win quality 188/224 (83.9%); median 31.21 s; p05 16.60 s; reference line 377/840 (44.9%); all 6 bosses `ok` |
| `bun run trace --seed 20261111 --check` | 0 | final hash `0xb6cce858` (identical to Phase 1); 5/5 invariants `ok`; `ko — Embercub wins`; hash fence proves no policy change shipped |
| `bun run verify` | 0 | 4,167 pass / 1 skip / 0 fail (4,168 tests across 375 files, 56.30 s); Biome 940 files, no fixes; voxel determinism gate byte-identical for all 15 species + 5 props |
| `bun run build` | 0 | 418 modules transformed, client built in 397 ms; only the pre-existing >500 kB chunk warning |

## 3. Full rung table (fixture first; matrix only for fixture survivors)

Change one knob at a time from the base (unless the knob column says "reset").
Every rung kept **all 14 telemetry bounds green** (the `capShare` bound is 60%, far
above every reading). BoM = best of the measured family.

| # | Knob change (base → rung) | Fixture cap | Dead zone | Idle | Exchange H/A | Positions min/med | Engagement min/med/max | Contact | Duration min–max | 14 bounds | Matrix (balance) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| — | base (all knobs) | 20/42 | 2.9% | 25.7% | 0.32/0.32 | 46/163 | 380/1079/3992 | 6.7% | 14.48–40.00 | 14/14 | 224/840, all green (exit 0) |
| R1a | `COMMIT_SKIP_DENOM` 32→64 | 20/42 | 2.6% | 25.1% | 0.33/0.32 | 46/158 | 379/1079/3992 | 6.7% | 14.48–40.00 | 14/14 | not run (fixture >14) |
| R1b | `COMMIT_SKIP_DENOM` 32→100000 (BoM) | **18/42** | 2.7% | 24.7% | 0.33/0.32 | 46/157 | 379/1070/3992 | 6.8% | 14.48–40.00 | 14/14 | not run (fixture >14) |
| R2 | `CADENCE_SKIP_DENOM` 16→100000 (commit reset 32) | 21/42 | 1.5% | 25.3% | 0.34/0.33 | 59/147 | 380/1079/3984 | 5.8% | 15.44–40.00 | 14/14 | not run (fixture >14) |
| R3 | `PUNISH_SKIP_DENOM` 16→100000 (cadence reset 16) | 20/42 | 2.9% | 25.7% | 0.32/0.32 | 46/163 | 380/1079/3992 | 6.7% | 14.48–40.00 | 14/14 | not run (fixture >14) |
| R4a | press divisor `/10`→`/8` (punish reset 16) | 22/42 | 2.2% | 24.2% | 0.34/0.33 | 46/141 | 379/1054/3992 | 6.3% | 14.48–40.00 | 14/14 | not run (fixture >14) |
| R4b | press divisor →`/12` | 24/42 | 2.4% | 29.7% | 0.30/0.29 | 83/177 | 379/1120/3992 | 6.0% | 18.46–40.00 | 14/14 | not run (fixture >14) |
| R4c | press divisor →`/6` | **17/42** | 1.8% | 22.3% | 0.34/0.34 | 33/109 | 379/1058/3992 | 6.4% | 14.48–40.00 | 14/14 | not run (fixture >14) |
| R4d | press divisor →`/4` | **17/42** | 1.9% | 21.9% | 0.35/0.34 | 27/103 | 380/1058/3992 | 6.4% | 17.02–40.00 | 14/14 | not run (fixture >14) |
| R4e | press divisor →`/5` (BoM) | **17/42** | 2.1% | 22.1% | 0.35/0.34 | 27/112 | 380/1059/3992 | 6.5% | 17.02–40.00 | 14/14 | not run (fixture >14) |
| R5a | `DECISION_MS` 240→200 (all knobs reset to base) | **13/42 ✅** | 2.0% | 25.1% | 0.34/0.33 | 44/152 | 379/1069/3992 | 6.6% | 13.92–40.00 | 14/14 | **188/840 cap ✅, but 4 species FAIL ⇒ exit 1** (see §5) |
| R5b | `DECISION_MS` →220 | 21/42 | 2.8% | 26.2% | 0.33/0.32 | 52/161 | 379/1088/3992 | 6.6% | 15.48–40.00 | 14/14 | not run (fixture >14) |
| R6a | `CYCLE` 10→8 (DECISION_MS reset 240) | **17/42** | 1.7% | 24.1% | 0.34/0.34 | 33/141 | 379/1080/3992 | 6.5% | 14.58–40.00 | 14/14 | not run (fixture >14) |
| R6b | `CYCLE` →12 | 24/42 | 1.7% | 28.3% | 0.30/0.31 | 64/174 | 379/1117/3992 | 6.2% | 18.84–40.00 | 14/14 | not run (fixture >14) |
| R7 | strafe divisor `/10`→`/30` (CYCLE reset 10) | 20/42 | 2.3% | 25.3% | 0.32/0.32 | 40/146 | 379/1082/3992 | 6.1% | 14.48–40.00 | 14/14 | not run (fixture >14) |

Families covered in the brief's cheapest-first order: commit-skip (R1), cadence-skip
(R2), punish-skip (R3), cycle/press shares (R4, R6, R7), decision cadence (R5).
Every rung kept the one seeded RNG stream and integer arithmetic; no `Math.random`,
no second RNG, no bound move.

## 4. Final diff review

`git diff --stat` on the final tree is empty; `git rev-parse HEAD` is `ed8f020f`, the
phase base. All source knobs were restored to exact base values:

- `controller-noise.ts`: `CADENCE_SKIP_DENOM = 16`, `COMMIT_SKIP_DENOM = 32`, `PUNISH_SKIP_DENOM = 16` (doc comments restored too).
- `controller.ts`: `CYCLE = 10`, press divisor `/10`, strafe divisor `/10`.
- `controller-state.ts`: `DECISION_MS = 240`, `DECISION_STEPS = 12`, doc comments restored.

The only delta this phase commits is this evidence file. No test, pin, version or
report line was edited.

## 5. The one fixture-passing rung and why it is rejected (R5a, DECISION_MS = 200)

Fixture: `cap share: 13/42 (31.0%)`, all 14 telemetry bounds green, dead zone 19
commits (2.0%), positions 44 min / 152 median, duration 13.92–40.00 s.

Matrix (`bun run balance`, **exit 1**):

| Gate | Observed at DECISION_MS=200 | Bound | Status |
| --- | --- | --- | --- |
| capShare | 188/840 (22.4%) | ≤ 33.3% | ok |
| decisiveShare | 809/840 (96.3%) | ≥ 66.7% | ok |
| capWinQuality | 158/188 (84.0%) | ≥ 66.7% | ok |
| medianDuration | 28.95 s | 25–40 s | ok |
| durationP05 | 14.48 s (min 7.04 s diagnostic) | ≥ 8 s | ok |
| durationMax | 40.00 s | ≤ 40 s | ok |
| damageBand | 49/49 moves | 4–12% | ok |
| bosses (6) | koda 40.0%, hesse 13.3%, marlow 40.0%, delmar 20.0%, fenn 43.3%, thessa 36.7% | 0 < wins < fights | ok |
| species:fire_drake | 59.8% | \|rate−50%\| ≤ 9.4% | **FAIL** |
| species:plant_ox | 62.5% | ≤ 9.6% | **FAIL** |
| species:voltfox | 39.3% | ≤ 9.3% | **FAIL** |
| species:shalemole | 60.7% | ≤ 9.5% | **FAIL** |

Only 11/15 species rows stayed green (15/15 on base). `DECISION_MS = 220` (R5b)
keeps the cadence inside the 200–240 ms band but lands 21/42 on the fixture, so the
decision-cadence family has no passing value. Rejecting R5a is required: Phase 1 §6
lists "turns any green gate red (… 15/15 species …)" as a block condition, and the
brief forbids widening a species band or tolerance to accommodate it.

## 6. Debt-pin promotion (not performed — required on block)

Both pins remain untouched at their base state, as the brief requires when no policy
change ships:

- `telemetry.test.ts:213` — `expect(cap.count * 3).toBeGreaterThan(cap.total)` (the 20/42 miss). Not promoted: the fixture still reads 20/42 on the shipped tree, so promoting it would make `verify` red.
- `pacing.test.ts:176` — `test.failing("the sample finishes a majority of fights by knockout", …)`. Marker retained: the base sample is still 615/840 ko (73.2%) on the matrix but the fixture is 13/42 at best, so the majority-by-KO body does not hold at the fixture population on the shipped tree.

No `.skip` was added and no assertion was weakened.

## 7. Version guard and trace hash

`SIM_VERSION = 3` is unchanged in `packages/sim/src/cup/ghost.ts`; the two ghost pins
(`ghost.test.ts:236` `toBe(3)`, `:249` `toBe(4)`) are unchanged. No policy change was
shipped, so the brief's no-op proof applies: `bun run trace --seed 20261111 --check`
replays to `0xb6cce858` — byte-identical to the Phase 1 baseline — with all 5
invariants `ok`. `controller-noise.test.ts:164-166` (16/32/16 denominators),
`controller.test.ts:214-216` (`DECISION_MS === 240`, `DECISION_STEPS === 12`) and
`balance-report.test.ts:191` (diagnostic reference-line cap share, 377/840 on base)
are all unchanged and green.

## 8. Before/after gate table (nothing moved)

| Quantity | Before (Phase 1 base) | After (this phase head) | Moved? |
| --- | --- | --- | --- |
| `BOUNDS` (14 telemetry metrics) | engagementMin 900, median 1500, max 4500, exchange ≤2.50/s, idle ≤0.5, distinct ≥20, contact ≤0.7, retreats ≥42, deadZone ≤0.5, capShare ≤0.6, durationMin ≥8, durationMax ≤40 | identical | no |
| `capShare` target (fixture) | ≤ 14/42 | ≤ 14/42 | no |
| `CAP_MAX` (matrix) | 1/3 | 1/3 | no |
| `DECISIVE_SHARE_MIN` | 2/3 | 2/3 | no |
| `DISTINCT_FLOOR` | 12 | 12 | no |
| `CAP_MARGIN_FLOOR_BP` | 500 | 500 | no |
| `BAND_MIN_MS` / `BAND_MAX_MS` | 25000 / 40000 | 25000 / 40000 | no |
| Fight cap duration | 40000 ms | 40000 ms | no |
| Damage band | 4–12% of 189 pool | 4–12% of 189 pool | no |
| Species win-rate tolerance | 2 × se per row | 2 × se per row | no |
| Fixture population | 42 distinct pairings, seeds 20261108+i | identical | no |
| Matrix population | 840 fights, seeds 20261109–12 | identical | no |
| `SIM_VERSION` | 3 | 3 | no |
| Trace hash (seed 20261111) | `0xb6cce858` | `0xb6cce858` | no |

## 9. AC verdicts (AC-2, AC-4..AC-10)

| AC | Criterion | Verdict | Evidence |
| --- | --- | --- | --- |
| AC-2 | Sweep candidate knobs cheapest-first, one at a time, with full measurements | met | §3 rung table, 14 rungs across all five families, every metric column recorded |
| AC-4 | Both caps inside one-in-three with all gates green | **not met — blocked** | no single rung reaches 13–14/42 with a green matrix; R5a reaches 13/42 but breaks 4 species rows |
| AC-5 | Both debt pins promoted | not applicable (blocked) | §6 — promoting on the unchanged base would make `verify` red; retained by protocol |
| AC-6 | Version bump on policy change + hash | met (no-op proof) | §7 — no policy shipped, `SIM_VERSION` stays 3, hash re-proven `0xb6cce858` |
| AC-7 | Before/after bound table, nothing moved | met | §8 |
| AC-8 | Balance rows + all 14 telemetry bounds recorded per rung | met | §3 (bounds column + matrix column), §5 (full R5a matrix table) |
| AC-9 | `verify` + `build` green, no weakened assertion | met | §2 commands table (both exit 0); no assertion edited anywhere |
| AC-10 | Blocked-with-full-sweep if no candidate | met | this file — result `blocked`, §3 complete rung table, §5 exact reject reason |

## 10. Deviations

None. All edits were attempts at knobs inside `Touches`, all reverted; the only
committed file is the phase evidence file, which is inside `Touches`.

## 11. Blockers

No tool call was denied. The block is a design outcome, not a permission failure:

- **Phase contract blocked** — no single controller-policy rung moves the fixture to ≤14/42 while keeping every matrix gate green. The closest rung (`DECISION_MS = 200`) converts 7 more fixture fights (20→13) and lowers matrix cap to 188/840, but shifts four species win rates past their 2×se band and turns `bun run balance` red. Fixing that would require editing a species band, a tolerance or a target/damage/pool/cap value, all explicitly out of scope. Stats (plan Phase 3) is the next fallback.

## 12. Notes

- The five verification commands were run exactly as written on the final, unchanged
  base tree; real exit codes are in §2. `bun run balance` was additionally run at R5a
  (exit 1, §5) as the mandated matrix check for the only fixture-survivor rung.
- Phase 1's baseline numbers were reproduced at the end of the phase (not before the
  sweep) and match exactly, including the `0xb6cce858` hash.
- The RNG draw-count caution was honoured: no denominator was set to 0 or to a value
  that removes the `rng.int(...)` call; the large denominators (100000) still call
  the one seeded stream, so those rungs are deterministic and comparable.
- Task ledger: P2.T1 (sweep) done; P2.T2 (ship smallest passing rung) failed — none
  passed; P2.T3 (promote pins) not performed by protocol; P2.T4 (version guard) done
  as a no-op hash proof; P2.T5 (record) done.
