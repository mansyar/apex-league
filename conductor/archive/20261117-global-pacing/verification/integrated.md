# Integrated verification — Global Pacing

- **Track:** `20261117-global-pacing` — Global Pacing
- **Branch:** `chore/20261117-global-pacing` (checked out throughout; never switched)
- **Track base:** `main` @ `0c9b8fca`
- **Phase 4 base / final tree:** `3d31b127f039c8a390ff16e36b60b3a312a32b2b`
- **Date:** 2026-11-17
- **Outcome:** **no game change shipped** — the fixture-only target is Withdrawn, the matrix
  already satisfies the one-in-three rule, and every attempted lever was measured, rejected
  and reverted. No code, fence, bound, pin, species value or version moved.

This is an evidence-only phase. The only file added is this record; `git diff --stat` on the
working tree is empty and `git diff --stat 0c9b8fca..HEAD` lists only the eight Conductor
files created by this track (§4).

## 1. The withdrawal, verbatim

From `spec.md` (Goals & Success Metrics, lines 41–43):

> The fixture-only target `cap.count * 3 <= cap.total`
> (at most 14 of 42) is **Withdrawn 2026-11-17**: the matrix already meets the product rule and
> the fixture is a proven biased diagnostic, not the game population.

From `spec.md` (Acceptance Criteria, AC-4, line 129):

> **Withdrawn 2026-11-17 (fixture half only).** The 840-fight matrix reports cap share at most 1/3
> with all other gate rows green; the 42-fight fixture's 14/42 target is withdrawn as a shipping
> criterion and stays recorded as debt.

From `spec.md` (Open Questions & Assumptions, lines 192–195):

> after 19 combined controller rungs also failed without moving a fence, the user chose option 1:
> **close the track as debt and ship no game change**. The fixture-only target in AC-4 is
> `Withdrawn`; FR-14/AC-14 record the no-ship outcome. The matrix's 26.7% already satisfies the
> product's one-in-three rule.

**Why the fixture is a biased diagnostic** (archived
`conductor/archive/20261112-gate-cost-and-fixture-audit/verification/integrated.md`):

- **Reference-clamped stats.** The fixture clamps both sides to
  `REFERENCE = { hp: 189, atk: 10, def: 10, spd: 10 }` *up* into each species' roll bounds;
  the matrix fights each species at its own bounds midpoint. At press doctrine on the fixture's
  pairings the stat basis is worth **28.6 points** (40.5% → 11.9%); on the 840-fight population
  it is worth **18.2 points** (44.9% → 26.7%).
- **Press-vs-kite doctrine mix.** `measureFight` sets one side `balanced` (press) and the other
  `specials` (kite) for every fixture fight; the matrix runs press on both sides. Doctrine at
  reference stats is worth **7.1 points** (47.6% → 40.5%), and **19.0 points** at midpoints
  (31.0% → 11.9%) — 11.9 points of the 35.7-point same-pairing gap is interaction.
- **Strided pairing walk.** The fixture fights one seed per 42 ordered pairings; the matrix
  uses four seeds. Holding the fixture's 42 pairings but using the matrix's four seeds moves
  11.9% → 17.9% (~6.0 points of seed count), and the remaining ~8.8 points are the pairing set
  itself (17.9% → 26.7%, z ≈ −2.6).

The matrix's **224/840 (26.7%)** is the project's own game population and is already inside
`CAP_MAX = 1/3`. Withdrawing the fixture half of AC-4 is a scope correction recorded under
FR-14/AC-14, not a silent target downgrade: the miss stays recorded as debt.

## 2. Gate table — final tree, real exit codes

`bun run verify` and `bun run build` were run in this phase on the final tree (§2.1–2.2).
The telemetry, balance and trace figures below were re-run on the byte-identical base tree in
every blocked phase and are transcribed from the three phase evidence files; no code in the
final tree differs from the tree those commands measured.

| Command | Exit | Final figures |
| --- | --- | --- |
| `bun run telemetry` | 0 | `cap share: 20/42 (47.6%)`; **14/14 bounds ok**; dead zone 27 commits (2.9%); idle 25.7%; exchange 0.32/0.32 per second; engagement 380/1079/3992 mm (min/median/max); positions min 46 / median 163 cells; contact 6.7%; duration 14.48–40.00 s; retreats 18948 home / 19333 away |
| `bun run balance` | 0 | 840 fights (ko 615, time 224, draw 1); `cap share: 224/840 (26.7%)`; **15/15 species ok**; **49/49 moves** inside 4–12% of the 189 pool; decisive 803/840 (95.6%); cap-win quality 188/224 (83.9%); median 31.21 s (p05 16.60 s, max 40.00 s); 6/6 bosses ok; reference line 377/840 (44.9%, diagnostic); diversity 39.0% |
| `bun run trace --seed 20261111 --check` | 0 | final hash **`0xb6cce858`** (unchanged from the Phase 1 pre-change baseline); **5/5 invariants ok** (`y-zero`, `hp-range`, `arena-bounds`, `integers`, `deterministic`); `ko — Embercub wins`, 8/9 blows, 82/196 damage, 31,000 ms, gap 499/961/3984 mm |
| `bun run verify` | 0 | **4,167 pass / 1 skip / 0 fail**; 491,194 `expect()` calls; 4,168 tests across 375 files in 54.05 s; Biome checked 940 files with no fixes; voxel determinism gate byte-identical for all 15 species and 5 props (seed 42) |
| `bun run build` | 0 | 418 modules transformed; client built in 359 ms; only the pre-existing >500 kB chunk warning |

### 2.1 `bun run verify` — pasted summary (this phase, exit 0)

```
 4167 pass
 1 skip
 0 fail
 491194 expect() calls
Ran 4168 tests across 375 files. [54.05s]
Checked 940 files in 749ms. No fixes applied.
$ bun packages/voxel/scripts/determinism-gate.ts
determinism gate OK: draconic seed 42 baby regenerated byte-identical (233156 bytes, tris 3544)
... (all 15 species × 3 stages byte-identical) ...
determinism gate OK: 5 props seed 42 regeneration digests match (tuft tris 100,
bush tris 462, broadleafTree tris 1264, rock tris 52, foodPile tris 232)
```

The full log is at
`C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\sh_1e8bb115f001nji6E8tvVtvwPe.out`.
The `final hash 0xff6f3d62` printed inside a test's arbitrary trace fixture is **not** the
gate trace hash; the gate hash `0xb6cce858` comes from `bun run trace --seed 20261111 --check`.

### 2.2 `bun run build` — pasted summary (this phase, exit 0)

```
vite v8.3.4 building client environment for production...
✓ 418 modules transformed.
dist/index.html                     2.13 kB │ gzip:   0.94 kB
dist/assets/index-C4RSBOQU.css     70.51 kB │ gzip:  13.65 kB
dist/assets/index-Bz3BGS8F.js   1,067.43 kB │ gzip: 293.54 kB
✓ built in 359ms
[plugin builtin:vite-reporter] (!) Some chunks are larger than 500 kB after minification.
Exited with code 0
```

### 2.3 Telemetry gate lines (final tree, exit 0)

```
cap share:   20/42 (47.6%)
dead zone:   27 commits (2.9%)
engagement:  min 380 mm  median 1079 mm  max 3992 mm
exchange:    home 0.32/s  away 0.32/s  combined 0.64/s
idle:        25.7%
contact:     6.7%
positions:   min 46 cells  median 163 cells
duration:    14.48s .. 40.00s
ok   engagementMin: observed 380 mm, bound <= 900 mm
ok   engagementMedian: observed 1079 mm, bound <= 1500 mm
ok   engagementMax: observed 3992 mm, bound <= 4500 mm
ok   exchangeHome: observed 0.32/s, bound <= 2.50/s
ok   exchangeAway: observed 0.32/s, bound <= 2.50/s
ok   idleShare: observed 25.7%, bound <= 50.0%
ok   distinctPositions: observed 46 cells, bound >= 20 cells
ok   contactShare: observed 6.7%, bound <= 70.0%
ok   retreatHome: observed 18948 orders, bound >= 42 orders
ok   retreatAway: observed 19333 orders, bound >= 42 orders
ok   deadZoneShare: observed 2.9%, bound <= 50.0%
ok   capShare: observed 47.6%, bound <= 60.0%
ok   durationMin: observed 14.48s, bound >= 8.00s
ok   durationMax: observed 40.00s, bound <= 40.00s
```

### 2.4 Balance gate lines (final tree, exit 0)

```
fights:            840 (ko 615, time 224, draw 1)
duration:          min 8.70s  median 31.21s  max 40.00s
cap share:         224/840 (26.7%)
knockout share:    615/840 (73.2%) — diagnostic
decisive share:    803/840 (95.6%; 615 ko + 188 cap wins at >= 5.00 pts)
cap-win quality:   188/224 cap wins clear the floor (83.9%)
cap margin:        p05 1.62 pts / median 14.69 pts / p95 61.18 pts over 224 cap wins
reference line cap share: 377/840 (44.9%) — diagnostic only
 diversity:        39.0% of ordered pairings change winner across the seeds
ok   species:<all 15>: observed within |rate - 50%| <= 2×se
ok   capShare: observed 26.7% (224/840), bound <= 33.3%
ok   decisiveShare: observed 95.6% (803/840), bound >= 66.7%
ok   capWinQuality: observed 83.9% (188/224), bound >= 66.7%
ok   medianDuration: observed 31.21s, bound inside 25.00s..40.00s
ok   durationP05: observed 16.60s, bound >= 8.00s
ok   durationMax: observed 40.00s, bound <= 40.00s
ok   damageBand: observed 49/49 moves inside, bound 4%..12% of the 189 pool
ok   boss:<koda,hesse,marlow,delmar,fenn,thessa>: 0 < player wins < fights
```

### 2.5 Trace invariants (final tree, exit 0)

```
final hash  0xb6cce858
check — 5 invariants
  ok   y-zero         every sampled position has pos.y === 0  [1551 frames × 2 sides]
  ok   hp-range       0 <= hp <= hpMax for every fighter at every step
  ok   arena-bounds   both bodies stay inside the arena bounds
  ok   integers       every position, velocity and damage value is an integer
  ok   deterministic  running the same seed twice produces the same final hash and event sequence
```

### 2.6 Before/after cap shares side by side

| Population | Before any candidate (Phase 1) | Final tree | Target / rule | Moved? |
| --- | --- | --- | --- | --- |
| 42-pairing fixture | 20/42 (47.6%) | 20/42 (47.6%) | 14/42 — **Withdrawn 2026-11-17**, recorded as debt | no |
| 840-fight matrix | 224/840 (26.7%) | 224/840 (26.7%) | ≤ 280/840 (≤ 1/3) — met | no |
| Reference line (diagnostic) | 377/840 (44.9%) | 377/840 (44.9%) | never gated | no |
| Trace hash (seed 20261111) | `0xb6cce858` | `0xb6cce858` | byte-identical for unchanged inputs | no |

## 3. The three failed searches

### 3.1 Phase 1/2 — single-knob controller sweep

- **Evidence:** `conductor/tracks/20261117-global-pacing/verification/phase-2.md` §1–§12
  (14 rungs; diagnosis in `verification/phase-1.md` §4–§6).
- **Families, cheapest first:** commit-skip denominator (R1a/R1b), cadence-skip (R2),
  punish-skip (R3), cycle/press/strafe shares (R4a–e, R6a/b, R7), decision cadence (R5a/b).
- **Closest misses:** R5a `DECISION_MS` 240→200 reached **13/42** fixture and **188/840**
  matrix cap — both caps met — but turned four matrix rows red: `fire_drake` 59.8%
  (≤59.4%), `plant_ox` 62.5% (≤59.6%), `voltfox` 39.3% (≥40.7%), `shalemole` 60.7%
  (≤59.5%). The press-divisor family plateaus at **17/42**; commit-skip alone bottoms at
  18/42; `DECISION_MS` 220 gives 21/42.
- **Verdict:** blocked — every rung was reverted; no bound, tolerance or species value moved.

### 3.2 Phase 2 attempt 2 — combined skip/cycle grid at 240 ms

- **Evidence:** `conductor/tracks/20261117-global-pacing/verification/phase-2.md` §13–§21
  (19 rungs).
- **Searched space:** combinations of `COMMIT_SKIP_DENOM`, `CADENCE_SKIP_DENOM`,
  `PUNISH_SKIP_DENOM`, `CYCLE`, press/strafe divisors, with `DECISION_MS = 240` held fixed and
  one seeded RNG preserved in every rung.
- **Closest misses:** R5 and R12 (commit-skip off, punish-skip off or 64, press divisor 6)
  reached **13/42** and **198/840 (23.6%)** with all other matrix gates green, but saturated
  `press` amplified stat differences past two bands: `fernstag` 68.8% (77/112, ≤59.5%) and
  `embercub` 35.3% (39/112, ≥40.5%). R14 was one conversion short at **15/42**; all skip-only
  combinations bottom out at 18/42.
- **Verdict:** blocked — no combination clears both caps with 15/15 species; everything reverted.

### 3.3 Phase 3 attempts 1–3 — 200 ms cadence plus in-envelope species corrections

- **Evidence:** `conductor/tracks/20261117-global-pacing/verification/phase-3.md`
  (attempt 1 §1–§11, attempt 2 §12–§19, attempt 3 §20 including the structural proof in §20.4).
- **Attempt 1:** `DECISION_MS` 200 with minimum in-envelope stat narrowings restored all 15
  species rows at **190/840**, but `bun run verify` failed 30 assertions (17 cadence-caused,
  13 species-caused), 12 of them outside the original `Touches`. Circle's flank/rear probe
  dropped to 0 and two cup champion fixtures flipped to `eliminated`.
- **Attempt 2 (expanded scope):** the user accepted the Circle/cup behaviour changes (FR-12).
  The best matrix config reached **197/840** with all 15 rows green, but Cinder Courser 56.3%
  and Thorn Ram 55.7% broke the 45–55% sibling band; re-pinning that band is forbidden.
- **Attempt 3 (full grid, 14 rungs):** no content-legal config clears matrix, all 15 rows, the
  sibling band and the boss/form gates together. The structural proof in §20.4:
  `bosses.ts` pins plant_ox **hp hi 193, atk hi 11, def hi 13, spd hi 8** and fire_drake
  **hp hi 178, spd hi 12**, enforced by `bosses.test.ts:66`; the only content-legal way to
  lower plant_ox's matrix midpoint is def hi 15→14/13, which drops the Cinder Abbot Fenn
  floor to 0.25 / 0.139 (below 0.35), and restoring the sibling band needs atk hi ≤ 9,
  which the boss atk-11 fence forbids.
- **Closest misses:** B5 clears matrix + band together but fails the boss atk-11 fence and
  Fenn floor 0.25 < 0.35; B10/B11 are one win outside the band (Thorn 44.8%, Bramble 55.2%)
  *and* fail Fenn at 0.139 < 0.35. Candidate hash `0xe00a0782` (200 ms) and `0x167662b8`
  (spd-narrowed) were measured but never shipped.
- **Verdict:** blocked — every candidate reverted; `identity.test.ts` byte-identical throughout;
  no envelope widened.

## 4. No-ship proof (FR-14 / AC-14)

| Check | Result |
| --- | --- |
| `git diff --stat` (working tree, final) | empty |
| `git rev-parse HEAD` | `3d31b127f039c8a390ff16e36b60b3a312a32b2b` (phase base) |
| `git diff --stat 0c9b8fca..HEAD` | 8 files, **all under `conductor/`**, +1554/−0 |
| `git diff --name-only 0c9b8fca..HEAD` | `conductor/tracks.md`; `conductor/tracks/20261117-global-pacing/{index.md,metadata.json,plan.md,spec.md}`; `verification/{phase-1.md,phase-2.md,phase-3.md}` |
| `packages/` changes | none |
| `apps/` changes | none |
| Species values, authored roll envelopes, `identity.test.ts` | untouched, byte-identical |
| Controller policy, frame data, damage, reach, stamina, poise | untouched |
| Ghost / version | `SIM_VERSION = 3` in `cup/ghost.ts`; ghost pins `toBe(3)` and `toBe(4)`; hash `0xb6cce858` |
| Debt pin 1 | `telemetry.test.ts:213` still `expect(cap.count * 3).toBeGreaterThan(cap.total)` — the 20/42 (47.6%) miss |
| Debt pin 2 | `pacing.test.ts:176` still `test.failing("the sample finishes a majority of fights by knockout", …)` — measured 16/42 by KO under the candidate cadence, so promotion would be a false claim |
| Gate bounds | `BOUNDS`, `CAP_MAX = 1/3`, `DISTINCT_FLOOR = 12`, `CAP_MARGIN_FLOOR_BP = 500`, `BAND_MIN_MS/BAND_MAX_MS = 25000/40000`, 40,000 ms cap, 4–12% damage band, 45–55% sibling band, boss stat pins, 0.35 boss floor, species statistical slack — **all unchanged** |

**Why the pins and version stayed put.** FR-5 permits promotion only when the bodies genuinely
pass; the final tree still misses the fixture one-in-three test (20/42), so promoting
`telemetry.test.ts:213` would turn `verify` red, and the KO-majority body reads 16/42
(`byKo * 2 = 32`, expected `> 42`). FR-6 bumps `SIM_VERSION` only when policy, frame data or
resolution changes; nothing shipped, so version 3 and the `0xb6cce858` hash are the honest
state. No assertion was deleted, `.skip`ped or weakened.

## 5. Requirements and acceptance coverage

| ID | Requirement (abbreviated) | Verdict | Evidence |
| --- | --- | --- | --- |
| FR-1 | Diagnosis before behaviour change | met | phase-1.md §4–§6, 20 capped fights with commits/hits/idle/gap/dps |
| FR-2 | Sweep controller candidates, fixture then matrix | met | phase-2.md §3 (14 single knobs), §15 (19 combined rungs) |
| FR-3 | In-envelope stat sweep if controller-only fails | met | phase-3.md §4, §14, §20.3; all rungs subset-narrowed |
| FR-4 | Never widen a bound, floor, tolerance or target | met | §4 no-ship proof; §2.6 before/after table |
| FR-5 | Promote debt pins only when bodies pass | met (no promotion) | §4; both pins remain red by design |
| FR-6 | Version 4 on policy change; 3 otherwise with hash proof | met | `SIM_VERSION = 3`, hash `0xb6cce858` unchanged |
| FR-7 | Keep telemetry and balance green | met | §2, both exit 0 with all rows green |
| FR-8 | Species identity intact | met | `identity.test.ts` byte-identical and green; `earth_tortoise` untouched |
| FR-9 | Record full sweep incl. rejects | met | phase-2.md §3/§15, phase-3.md §4/§14/§20.3, §3 above |
| FR-10 | Cap wins stay valid | met | `CAP_MARGIN_FLOOR_BP = 500` and decisive/cap-win rules untouched; 188/224 cap wins clear floor |
| FR-11 | Minimum per-species corrections if controller breaks a row | met (attempted, not shipped) | phase-3.md §4/§20; every candidate reverted |
| FR-12 | Re-pin moved golden/relation tests with named reasons | met (no re-pins needed) | no candidate shipped, so no test moved; §4 |
| FR-13 | Combined moderate controller rungs at 240 ms before fence change | met | phase-2.md §15 (19-rung grid); no fence moved |
| FR-14 | No game change when all in-scope searches fail | **met** | §4; full grids in §3; matrix 26.7% already meets rule |
| NFR-1 | Integer arithmetic, one seeded RNG, byte-identical replay | met | every rung kept the one RNG; final hash `0xb6cce858`, determinism gate OK |
| NFR-2 | Configured commands only | met | all five commands run exactly as named; Phase 4 ran verify then build |
| NFR-3 | `verify_phase` green | met | §2.1/§2.2, both exit 0 on final tree |
| NFR-4 | 150 s verification budget | met | verify 54.05 s, build 359 ms in this phase; record written within budget |
| AC-1 | Phase 1 names the stall mechanism | met | phase-1.md §4–§6 |
| AC-2 | Every candidate recorded with fixture and matrix readings | met | phase-2.md §3/§15, phase-3.md §4/§14/§20.3 |
| AC-3 | Stat values strictly inside authored bounds | met (candidate only) | phase-3.md §4/§20; `identity.test.ts` green; nothing shipped |
| AC-4 | Matrix ≤ 1/3 + all gates; **fixture half Withdrawn 2026-11-17** | **met (withdrawal recorded)** | §1 verbatim; matrix 224/840 (26.7%) green; fixture 20/42 stays debt |
| AC-5 | Debt pins promoted when bodies pass | met (no promotion) | §4; bodies do not pass |
| AC-6 | Version 4 with pins, or 3 with unchanged hash | met | `SIM_VERSION = 3`, hash `0xb6cce858` |
| AC-7 | Before/after table, nothing moved | met | §2.6 and §4 |
| AC-8 | 15/15 species, 49/49 moves, median 25–40 s, decisive ≥ 2/3, 14 telemetry bounds | met | §2, §2.3, §2.4 |
| AC-9 | `verify` + `build` green; no weakened assertion | met | §2.1/§2.2; §4 |
| AC-10 | Blocked with measured sweep when no candidate satisfies AC-4/AC-7/AC-8 | met | §3, all three searches with closest misses |
| AC-11 | Combined tree green with v4 and new hash | not met (candidate unshippable) | phase-3.md §5/§15/§20.4; no combined tree passed every gate |
| AC-12 | Verify green with only value/golden/relation re-pins | not applicable (nothing shipped) | §4; no re-pin was required on the final tree |
| AC-13 | Combined-controller rung passes every fence, or blocked with grid | met (blocked with grid) | phase-2.md §15–§21 |
| AC-14 | Final diff has no game change; base readings reproduced | **met** | §4; §2 telemetry 20/42, balance 224/840, hash `0xb6cce858`, `SIM_VERSION = 3` |

AC-11, AC-12 and the fixture half of AC-4 are recorded honestly rather than silently
reinterpreted: AC-11's combined tree never passed all gates, AC-12 had no shipped tree to
re-pin, and AC-4's fixture half is formally `Withdrawn 2026-11-17` with the miss retained as
debt.

## 6. Residual debt and standing advice

- **D-1 — global pacing on the matrix.** The game population still ends 23–27% of fights on
  the clock, depending on sample: 224/840 (26.7%) on the 840-fight matrix, 377/840 (44.9%) on
  the equal-investment reference line (diagnostic only), and 17.9% on the fixture's 42
  pairings with four seeds. The one-in-three product rule is met, but the shortfall is real.
- **D-2 — the kite band at `spd 5`.** A slow body (0.55 mm/ms) cannot hold a 1,472–1,600 mm
  preferred band against 1.0–1.63 mm/ms press bodies, so retreats win decisions instead of
  commits. At the fixture's stats doctrine is worth 7.1 points, at the matrix's 19.0 — fixing
  the band will move the game's number, not the fixture's much. Out of scope here.
- **D-3 — the fixture one-in-three target.** 20/42 (47.6%) against the withdrawn 14/42 target.
  The telemetry debt pin and the KO-majority `test.failing` pin are the standing record; both
  stay red until a tree genuinely passes them.
- **D-4 / fixture bias.** Reference-clamped stats, the press-vs-kite doctrine mix and the
  one-seed pairing walk make the 42-fight fixture a biased diagnostic. Re-stratifying the walk
  is a separate gate-redesign track with its own before/after; it was not folded into this one.
- **Standing advice.** Every in-scope controller and species search failed without a fence
  change. A future attempt must **either** change controller family in a way that leaves all
  fences green, **or** move a fence (boss stat pin, 0.35 boss floor, 45–55% sibling band, a
  species band, `BOUNDS`, `CAP_MAX`, `DISTINCT_FLOOR`, damage band, cap duration or a target)
  under an explicit product decision. The measured grids and closest misses in §3 are the
  resume points; no bound was moved as a fallback here.

## 7. Deviations / blockers / notes

- Deviations: none. This phase touched only `verification/integrated.md`; no source file,
  test, pin, bound or assertion was edited.
- Blockers: none in Phase 4. No command was denied; `bun run verify` and `bun run build` both
  exited 0. The design blockers from Phases 1–3 are recorded in §3 and resolved by the
  withdrawal in §1 rather than left open.
- Notes: the withdrawal was recorded in `spec.md` (FR-14/AC-14) and `plan.md` by the primary;
  this record only reports it. All five configured gates were green on the final tree, and the
  working tree remains byte-identical to the Phase 4 base `3d31b127` apart from this file.

## Primary verification

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | 4,167 pass / 1 skip / 0 fail; 4,168 tests across 375 files in 77.46 s; Biome checked 940 files with no fixes; voxel determinism byte-identical; module-size cap green |
| `bun run build` | 0 | 418 modules transformed, built in 398 ms; only the pre-existing >500 kB chunk warning |

The independent diff check confirms the no-ship claim: `git diff --name-only 3d31b127..HEAD` lists
only `verification/integrated.md`, and `git diff --name-only 0c9b8fca..HEAD` lists only the eight
Conductor files for this track. No `packages/`, `apps/`, species, controller, ghost, pin or bound
file changed; `SIM_VERSION` remains 3, both debt pins remain in place, and the trace hash remains
`0xb6cce858`. FR-14 and AC-14 are met, AC-4's fixture half is formally Withdrawn, and the matrix
half is met at 224/840 (26.7%).
