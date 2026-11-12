# Phase 2 evidence — Parameterise the harness without moving it

**Track:** `20261112-gate-cost-and-fixture-audit`
**Phase:** 2 of 3
**Base:** `299ff654`
**Covers:** FR-6, FR-7, AC-6, AC-7
**Files changed:**
`packages/sim/scripts/battle-telemetry.ts`,
`packages/sim/scripts/battle-balance-report.ts`,
`packages/sim/src/battle/continuous/telemetry.test.ts`,
`packages/sim/src/battle/continuous/balance-report.test.ts`

The phase's whole contract is that the default path does not move. Every figure
below was captured before the first edit and again after the last one; the two
readings are identical, and the balance report gained exactly one line.

---

## 1. The API added (FR-6)

`packages/sim/scripts/battle-telemetry.ts`:

```ts
/** Which stat line a side is built from (FR-6). */
export type StatBasis = "reference" | "midpoint"

/** How the two sides' doctrines are assigned (FR-6). */
export type DoctrineMix = "split" | "press"

/**
 * How one fight is measured (FR-6). Both fields default to the shipped
 * fixture, so `measureFight(matchup)` is still the gate's own reading; the
 * other three cells are reachable by asking for them.
 */
export interface MeasureOptions {
  readonly statBasis?: StatBasis
  readonly doctrine?: DoctrineMix
}
```

`measureFight` takes the options as a second parameter, defaulting to the
shipped fixture:

```ts
export function measureFight(
  matchup: Matchup,
  options: MeasureOptions = {},
): FightTelemetry {
  const basis = options.statBasis ?? "reference"
  const [homeTactic, awayTactic] = tacticsFor(
    matchup.seed,
    options.doctrine ?? "split",
  )
  const homeSide = sideOf(matchup.home, homeTactic, basis)
  const awaySide = sideOf(matchup.away, awayTactic, basis)
  const result = resolveContinuous(homeSide, awaySide, matchup.seed)
  // …unchanged…
```

The doctrine rule is one helper, so `split` is literally the shipped
expression and `press` is the matrix's one-doctrine cell:

```ts
function tacticsFor(seed: number, mix: DoctrineMix): [Tactic, Tactic] {
  if (mix === "press") return ["balanced", "balanced"]
  return seed % 2 === 0 ? ["balanced", "specials"] : ["specials", "balanced"]
}
```

`sideOf` gained the basis as its third parameter and stayed module-private:

```ts
function sideOf(
  species: SpeciesDef,
  tactic: Tactic,
  basis: StatBasis,
): BattleSide {
  const body = branchesForSpecies(species.id)[0]
  const bounds = species.statBounds
  const stats: StatLine =
    basis === "midpoint" ? midpointOf(bounds) : referenceOf(bounds)
  // …unchanged…
```

`referenceOf` is the old inline clamp, lifted out unchanged, so the default
branch is the same arithmetic on the same `REFERENCE` constant
(`{ hp: 189, atk: 10, def: 10, spd: 10 }`, untouched):

```ts
function referenceOf(bounds: SpeciesDef["statBounds"]): StatLine {
  return {
    hp: clampStat(REFERENCE.hp, bounds.hp),
    atk: clampStat(REFERENCE.atk, bounds.atk),
    def: clampStat(REFERENCE.def, bounds.def),
    spd: clampStat(REFERENCE.spd, bounds.spd),
  }
}
```

One call site needed a wrapper: `measure()` used `matchups().map(measureFight)`,
which would have passed the array index as the options object. It is now
`matchups().map((matchup) => measureFight(matchup))` — the same 42 fights, the
same default options.

`matchups()`, `PAIRINGS`, `SEEDS_PER_PAIRING`, `BOUNDS`, every bound value, the
`Metric` union, and `REFERENCE` are unchanged.

---

## 2. The default path did not move (P2.T1.1, AC-6)

### 2.1 The `cap share` and `dead zone` lines

Before this phase (`bun run telemetry` on `299ff654` + Phase 1):

```
retreats:    home 18948  away 19333
dead zone:   27 commits (2.9%)
positions:   min 46 cells  median 163 cells
cap share:   20/42 (47.6%)
duration:    14.48s .. 40.00s
```

After (`bun run telemetry` on this phase's tree) — character for character the
same lines:

```
retreats:    home 18948  away 19333
dead zone:   27 commits (2.9%)
positions:   min 46 cells  median 163 cells
cap share:   20/42 (47.6%)
duration:    14.48s .. 40.00s
```

### 2.2 The full bound table — 14/14, before and after

Both runs printed this block verbatim (before and after compared line by line;
no line differed, including every per-fight row of the 42-fight table above it):

```
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

14 `ok`, 0 `FAIL`. The stability table (`n=14 / n=30 / n=42`) is also identical
row for row, which is the stricter check: it re-pools the same fights and would
have moved on any per-fight change.

### 2.3 The parameters are live, and the defaults are the shipped path

`telemetry.test.ts` pins the wiring without pinning the other cells (Phase 3
owns those numbers):

- `measureFight(first)`, `measureFight(first, {})` and
  `measureFight(first, { statBasis: "reference", doctrine: "split" })` are
  `toEqual` — omitting the options is the same path as naming the defaults.
- some pairing in the sample plays differently under `{ statBasis: "midpoint" }`
  and under `{ doctrine: "press" }`, so neither parameter is inert.

---

## 3. The report gained one line and no gate (P2.T2.1, AC-7)

### 3.1 The reference-line block

Before (the block ended at the `finding:` line):

```
reference line (diagnostic — every species at the equal-investment line; printed, never gated)
species               games  wins  draws  win rate
fire_drake            112    39    0      34.8%
plant_ox              112    59    0      52.7%
water_axolotl         112    67    0      59.8%
electric_hound        112    42    0      37.5%
fernstag              112    67    0      59.8%
wind_falcon           112    31    0      27.7%
reefclaw              112    61    0      54.5%
earth_tortoise        112    28    0      25.0%
cindermoor            112    60    0      53.6%
voltfox               112    72    0      64.3%
galeheron             112    81    0      72.3%
shalemole             112    66    0      58.9%
embercub              112    58    0      51.8%
mossboar              112    63    0      56.3%
mistkit               112    46    0      41.1%
finding: reference-line spread earth_tortoise 25.0% .. galeheron 72.3% at equal investment — kit shape, not stats, dominates (FR-22 diagnostic, recorded not gated)
```

After — the same block, the same 15 rows, the same `finding:` line, and one new
line beneath it:

```
reference line cap share: 377/840 (44.9%) — diagnostic only
```

Nothing else in the reference block changed. The count is the reference pass's
own `reason === "time"` tally, accumulated in the loop that already replays
those 840 fights (`measure()`); a `time` ending is a fight that ran to
`FIGHT_CAP_MS`, which the telemetry harness asserts separately.

### 3.2 The matrix's own gate lines are untouched

```
fights:            840 (ko 615, time 224, draw 1)
duration:          min 8.70s  median 31.21s  max 40.00s
cap share:         224/840 (26.7%)
decisive share:    803/840 (95.6%; 615 ko + 188 cap wins at >= 5.00 pts)
cap-win quality:   188/224 cap wins clear the floor (83.9%; FR-20 / AC-17, gated separately from decisive share)
```

`cap share: 224/840 (26.7%)`, `decisive share: 803/840 (95.6%)`, median
`31.21s`, `damageBand: observed 49/49 moves inside`, and all 15
`ok   species:…` lines are identical before and after. Every target in the
report is still `ok`; the exit code is still 0.

### 3.3 It is a diagnostic, not a gate

- No entry was added to any bound list; `targets()` is unchanged, so the
  `ok`/`FAIL` block is the same 28 lines.
- No `BOUNDS`, no new `Metric`, no new target name.
- `balance-report.test.ts` pins that the line is present, that its denominator
  is `matrix.fights`, and that no `ok`/`FAIL`/`UNVERIFIED` line mentions it and
  no target name contains "reference".

---

## 4. Verification — the three commands

Run separately, in this order, on the final tree.

### 4.1 `bun run telemetry` — exit 0

```
$ bun packages/sim/scripts/battle-telemetry.ts
Battle telemetry — 42 seeded matchups through resolveContinuous (FR-14, AC-14)
…
cap share:   20/42 (47.6%)
dead zone:   27 commits (2.9%)
…
ok   capShare: observed 47.6%, bound <= 60.0%
ok   durationMax: observed 40.00s, bound <= 40.00s
```

14/14 bounds green; 20/42 and 27 commits (2.9%) exactly as before the phase.

### 4.2 `bun run balance` — exit 0

```
$ bun packages/sim/scripts/battle-balance-report.ts
Battle balance report — 15 species, 840 matrix fights, 24 doctrine fights, 180 boss fights (FR-4..FR-7)
…
reference line cap share: 377/840 (44.9%) — diagnostic only
…
cap share:         224/840 (26.7%)
decisive share:    803/840 (95.6%; 615 ko + 188 cap wins at >= 5.00 pts)
…
ok   damageBand: observed 49/49 moves inside, bound 4%..12% of the 189 pool
```

15/15 species `ok`, 49/49 moves in band, median 31.21s, all targets `ok`.

### 4.3 `bun run verify` — exit 0

```
 4153 pass
 1 skip
 0 fail
 491150 expect() calls
Ran 4154 tests across 374 files. [73.89s]
Checked 936 files in 625ms. No fixes applied.
$ bun packages/voxel/scripts/determinism-gate.ts
determinism gate OK: … (47 generated artifacts byte-identical)
```

The suite grew by the two tests added here (4,153 pass versus 4,151 at Phase 1);
nothing was re-pinned.

---

## 5. The midpoint helper — one duplicated line, on purpose

```ts
function midpointOf(bounds: SpeciesDef["statBounds"]): StatLine {
  return {
    hp: Math.floor((bounds.hp[0] + bounds.hp[1]) / 2),
    atk: Math.floor((bounds.atk[0] + bounds.atk[1]) / 2),
    def: Math.floor((bounds.def[0] + bounds.def[1]) / 2),
    spd: Math.floor((bounds.spd[0] + bounds.spd[1]) / 2),
  }
}
```

This is `floor((min + max) / 2)` per stat — the same arithmetic
`battle-balance-report.ts` uses in `typicalLine`, which is what its matrix
measures. The harness could not import that function: both are entry-point
scripts (`import.meta.main`, `process.exitCode`), and a script importing another
script would execute the other's `main` guard graph and couple two gates' entry
points. The rule it encodes is one line, so it is written twice and the two
copies are proven to agree by the fixture audit in Phase 3, which builds a side
both ways and compares the stats.

Keeping it local also keeps this phase's blast radius to the four files in
`Touches`: no new shared module, no `package.json` change, no edit to the
balance report's own `typicalLine`.

---

## 6. What was not touched

- `matchups()`, `PAIRINGS`, `SEEDS_PER_PAIRING`, `BOUNDS`, every bound value,
  `Metric`, `REFERENCE`'s values, `STANDARD_DOCTRINE`, `MATRIX_SEEDS`, the
  design band, the significance rule.
- Species data, frame data, the resolver, `SIM_VERSION`, the trace hash.
- No gate, no `ok`/`FAIL` line, no new `Metric`, no new target.
- `spec.md`, `plan.md`, `metadata.json`, `tracks.md` - untouched.

---

## Primary verification

### Commands

| Command | Exit | Result |
| --- | --- | --- |
| `bun run telemetry` | 0 | `cap share: 20/42 (47.6%)`, `dead zone: 27 commits (2.9%)`, 14/14 `ok`, every observed value identical to the pre-phase table |
| `bun run balance` | 0 | `cap share: 224/840 (26.7%)`, `decisive share: 803/840 (95.6%)`, `median 31.21s`, `49/49` moves in band, one new diagnostic line: `reference line cap share: 377/840 (44.9%)` |
| `bun run verify` | 0 | 4,153 pass / 1 skip / 0 fail (two added, none re-pinned), Biome clean, determinism byte-identical |

### Diff review

Five files: the two scripts, their two test files, and this evidence file. `git diff --stat` = 476
insertions / 14 deletions, of which 327 are this file. No species data, frame data, resolver,
`SIM_VERSION`, `BOUNDS` value, `PAIRINGS`, `SEEDS_PER_PAIRING` or `REFERENCE` value moved.

The one subtle thing the subagent got right and worth recording: `matchups().map(measureFight)`
would have passed the array index as the new second argument, silently turning `options` into `0`.
It wrapped that call site so the default path cannot be reached with a stray index. That is exactly
the class of bug a "defaults must not move" refactor invites, and it was caught before commit.

### The first number of the audit

`reference line cap share: 377/840 (44.9%)` is not decoration - it is half of the factorial already.
The report's reference pass fights **reference stats with one doctrine on both sides**, so:

| Basis | Doctrine | Cap share | Source |
| --- | --- | --- | --- |
| reference | press vs press | **44.9%** (377/840) | this phase |
| midpoint | press vs press | **26.7%** (224/840) | the matrix, unchanged |

Holding doctrine fixed, moving the stat line from bounds midpoints to the reference line adds
**18.2 points** of cap share. Phase 3 measures the other axis on the fixture's 42 pairings and can
now attribute the 47.6%-vs-26.7% gap instead of guessing at it.
