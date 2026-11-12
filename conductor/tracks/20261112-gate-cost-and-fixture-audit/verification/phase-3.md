# Phase 3 evidence — The four cells and the verdict

**Track:** `20261112-gate-cost-and-fixture-audit`
**Phase:** 3 of 3
**Branch:** `chore/20261112-gate-cost-and-fixture-audit`
**Phase base:** `9737c7cb`
**Covers:** FR-8, FR-9, FR-10, AC-8, AC-9, AC-10

## 0. The verdict, in one paragraph

**The stat basis is the dominant variable.** On the fixture's own 42 pairings it is worth **28.6
points** of cap share (17/42 at reference stats under press doctrine → 5/42 at midpoints under the
same doctrine), and on the 840-fight population with doctrine held fixed it is worth **18.2 points**
(44.9% → 26.7%). The doctrine axis at the fixture's stat basis is worth **7.1 points** (20/42 → 17/42).
So the answer to "why does the fixture read 47.6% while the matrix reads 26.7%" is, in the main, the
stat line: the fixture ramps both sides to `REFERENCE` clamped into species bounds, the matrix fights
each species at its roll midpoint, and that difference alone accounts for four fifths of the gap.

The two variables are **not additive**, and the evidence says so rather than smoothing it: the doctrine
axis is worth 19.0 points once the stats are at midpoints (31.0% → 11.9%), so **11.9 points of the
35.7-point gap is interaction**, larger than the doctrine main effect itself. The **residual is
population**: cell D reads 11.9% where the 840-fight matrix reads 26.7%, a 14.8-point gap with both
variables held identical, because 42 strided pairings with one seed each is not 210 ordered pairings
with four seeds each.

This is a **diagnostic, not a gate**. Nothing in CI reads `fixture-audit.ts`: no bound, no target, no
`ok`/`FAIL` line, no `Metric`, no workflow step, and `run()` returns 0 unconditionally. The test file
pins literals and proves the two harnesses agree; it asserts no threshold.

## 1. The script's output

`packages/sim/scripts/fixture-audit.ts`, printed by its own test during `bun run verify` (the script
itself cannot be invoked directly under this phase's shell allowlist; the test calls the same
`report()` on the same `audit()`, so this is the script's own output, not a retyped table):

```
Fixture audit — 42 pairings x 4 cells (FR-8; diagnostic, never gated)
stat basis: reference = both sides at REFERENCE clamped into bounds; midpoint = each species' roll midpoint
doctrine:   split = seed parity (press vs specials); press = balanced on both sides

cell  stat basis  doctrine  fights  caps  cap share  median   ko
A     reference   split     42      20    47.6%      39.69s   22
B     reference   press     42      17    40.5%      38.38s   25
C     midpoint    split     42      13    31.0%      35.72s   29
D     midpoint    press     42      5     11.9%      29.32s   37

attribution — points of cap share, same 42 pairings:
  gap A - D (fixture - matrix cell)          +35.7   47.6% - 11.9%
  doctrine   A - B (split -> press, ref)     +7.1
  stat basis B - D (ref -> midpoint, press)  +28.6
  interaction (A - B) - (C - D)              -11.9   how much the doctrine effect depends on the stats
  order check: stat A - C +16.7, doctrine C - D +19.0

same-doctrine check at 840 fights (press on both sides, `bun run balance`):
  reference 377/840 44.9%  ->  midpoint 224/840 26.7%  =  +18.2 points
```

The four cells are the full 2×2 over the fixture's **own** `matchups()` array and seeds — one call per
cell, no invented pairings (P3.T1.1). `bun run fixture-audit --json` dumps `{ cells, attribution }` for
a machine; the `--json` flag is the only argument the script takes.

## 2. The attribution arithmetic, shown

Let a share be the cell's cap count over 42, in percent:

| quantity | cells | arithmetic | points |
| --- | --- | --- | --- |
| gap (fixture − matrix cell) | A − D | (20 − 5)/42 | **+35.7** |
| doctrine at reference stats | A − B | (20 − 17)/42 | **+7.1** |
| stat basis at press doctrine | B − D | (17 − 5)/42 | **+28.6** |
| stat basis at split doctrine | A − C | (20 − 13)/42 | +16.7 |
| doctrine at midpoint stats | C − D | (13 − 5)/42 | +19.0 |
| interaction | (A − B) − (C − D) | 7.143 − 19.048 | **−11.9** |
| recorded stat effect, 840 fights | 377/840 → 224/840 | 153/840 | **+18.2** |

Two facts the arithmetic forces:

1. **A − D is exact, and it telescopes under either ordering.** (A − B) + (B − D) = 7.143 + 28.571 =
   35.714 = A − D, and (A − C) + (C − D) = 16.667 + 19.048 = 35.714 = A − D. There is no leftover
   residual on the fixture's own pairings. The audit's fourth test asserts exactly this identity, and
   the second identity `(A − B) − (C − D) = (A − C) − (B − D)`.
2. **The two orderings disagree by 11.9 points**, which is the interaction term and is larger than the
   doctrine main effect. So the split is not unique: anchored at the fixture's stats, doctrine is 7.1
   and stat is 28.6; anchored at the matrix's stats, stat is 16.7 and doctrine is 19.0. That is not a
   defect of the measurement, it is the measurement: **the doctrine effect depends on the stat line.**

The main-effect comparison the track asked for is the fixture-anchored one (doctrine A − B against stat
B − D, with the 840-fight 18.2 as the same-axis check on the larger population). Under it the stat
basis dominates by **21.5 points** (28.6 vs 7.1) on the fixture, and the 840-fight check reproduces the
same sign and a comparable size (18.2) with doctrine pinned, so the dominance is not an artefact of the
42-pairing sample. The matrix-anchored ordering is reported alongside it because it is what stops the
verdict over-claiming: the doctrine axis is *not* small everywhere, only small at the fixture's stats.

**Residual, named not explained away:** cell D (11.9%) does not reproduce the matrix's 26.7%. Both
variables are identical between them, so the 14.8-point difference is population — 42 strided pairings
with one seed each versus 210 ordered pairings with four seeds each. The same population effect shows
up on the stat axis: 28.6 points on the fixture versus 18.2 on the 840-fight matrix. The fixture's
sample amplifies both axes; it does not change which one is larger.

## 3. The four pins, and why each number is what it is

`packages/sim/src/battle/continuous/fixture-audit.test.ts` computes all four cells once at module level
(`cached ??= audit()`) — 168 fights, measured once for the file — and pins `[id, capCount, medianMs,
koCount]`:

| cell | pin | why this number |
| --- | --- | --- |
| A | `["A", 20, 39_690, 22]` | The telemetry gate as it ships: reference stats, split doctrine. 20/42 (47.6%), median 39.69 s, 22 KOs. **This is the gate's own count** — asserted against `measure()` in the same file, not trusted from the literal. |
| B | `["B", 17, 38_380, 25]` | A with the **doctrine** moved to press on both sides. 17/42 (40.5%): the doctrine alone removes 3 caps and 1.31 s of median fight. |
| C | `["C", 13, 35_720, 29]` | A with the **stat basis** moved to bounds midpoints. 13/42 (31.0%): the stat line alone removes 7 caps and 3.97 s of median fight. |
| D | `["D", 5, 29_320, 37]` | Both variables moved: midpoint stats, press on both sides. 5/42 (11.9%). The pair accounts for 15 of A's 20 caps. D sits 14.8 points below the matrix's 26.7% — a different population, recorded as the verdict's residual. |

**P3.T2.1 — cell A equals the gate by import, not by a duplicated literal.** The test calls
`measure()` — the exact call the CI gate makes — and asserts `cellA.capCount === gate.cap.count` and
`cellA.capShare === gate.cap.share`. It reads the gate's cap-share ceiling out of `BOUNDS`
(`capShare === 0.6`) as a cross-check that the audit is standing on the shipped ceiling and not one of
its own. If the audit ever measures a different fixture, this fails; the number 20 is never the only
thing holding cell A in place.

**P3.T2.2 — B, C and D pinned with comments naming what moved them.** Each pin's comment names the
variable, the share, the median delta and, for D, the 14.8-point population gap.

**Structure assertions:** the table has exactly four rows in order `["A", "B", "C", "D"]`, and every
cell fought exactly 42 fights (the audit borrows the fixture's sample rather than drawing its own).

**These are drift pins, not bounds.** No test compares a cell to a threshold, none says a cell is good
or bad, and `BOUNDS` is only read, never extended (NFR-4).

## 4. `bun run verify`, then `bun run build`

`bun run verify` — exit 0:

```
 4157 pass
 1 skip
 0 fail
 491161 expect() calls
Ran 4158 tests across 375 files. [73.17s]
Checked 938 files in 657ms. No fixes applied.
$ bun packages/voxel/scripts/determinism-gate.ts
determinism gate OK: ... (every artifact regenerated byte-identical, props included)
```

Phase 2 left 4,153 pass / 4,154 tests; this phase adds 4 tests and 3 files, and re-pins nothing
elsewhere. Biome is clean with no fixes applied, and the voxel determinism gate is unchanged.

`bun run build` — exit 0:

```
@apex/client build: ✓ 418 modules transformed.
@apex/client build: dist/assets/index-Bz3BGS8F.js   1,067.43 kB │ gzip: 293.54 kB
@apex/client build: ✓ built in 315ms
@apex/client build: Exited with code 0
```

The chunk-size warning is pre-existing and unrelated (the client bundle, untouched here).

## 5. Nothing about the game moved

```
$ bun run trace --seed 20261111 --check
battle trace — seed 20261111  (plant_ox v embercub)
  duration    31000 ms (1550 steps of 20 ms)
  final hash  0xb6cce858
check — 5 invariants
  ok y-zero / hp-range / arena-bounds / integers / deterministic
```

- Final hash `0xb6cce858` — unchanged.
- 5 invariants, all `ok`.
- `SIM_VERSION` is still `3` (`packages/sim/src/cup/ghost.ts:40`), and `ghost.test.ts` still asserts
  `expect(SIM_VERSION).toBe(3)` — that test is green in the run above, so the version is pinned by the
  suite, not merely observed.
- `bun run telemetry` still prints `cap share: 20/42 (47.6%)` with 14/14 bounds `ok`, and
  `bun run balance` still prints `cap share: 224/840 (26.7%)`, `reference line cap share: 377/840
  (44.9%)`, `median 31.21s`, 15/15 species `ok`, 49/49 moves in band.
- The diff contains no bound, floor, tolerance, species value, frame data, resolver or `SIM_VERSION`
  file. Changed paths:

```
M  package.json                                   (one script entry)
M  packages/sim/src/module-size.test.ts           (deviation: one inventory line, see §7)
A  packages/sim/scripts/fixture-audit.ts
A  packages/sim/src/battle/continuous/fixture-audit.test.ts
A  conductor/tracks/.../verification/phase-3.md
```

## 6. What this changes about D-1 and D-2

**D-1 (global pacing).** The fixture's 47.6% is mostly a property of its stat line, not of the game's
pacing. Twenty-eight of the 35.7 points that separate cell A from the same-pairing cell D come from
ramping both sides to `REFERENCE` and clamping that up into each species' bounds, which makes creatures
beefier than the midpoint creature the matrix fights and pushes fights into the 40 s cap. The real
pacing debt is therefore the **26.7% at midpoints**, not the 47.6% the fixture reports: the fixture
overstates it by 1.8× against the matrix (47.6 / 26.7) and by 4.0× against the same-pairing cell D
(47.6 / 11.9). Two
consequences follow. First, the telemetry fixture's cap share should stop being read as a pacing
signal on its own — it is a signal about the stat line, and it passes its own 60% ceiling comfortably
while the game at midpoints sits at 26.7%. Second, any work on D-1 should be measured on the matrix
population (midpoints, press), where the number is both smaller and representative; the fixture's 20/42
should be treated as a regression pin, which is what the previous track built it to be.

**D-2 (the kite band at `spd 5`).** At the fixture's stat basis the doctrine contribution is **small —
7.1 points**, a fifth of the gap — and the brief's instruction for that case applies: on the fixture's
own reading, fixing the kite band would not change much, and it cannot close the fixture-versus-matrix
gap. But the same axis is worth **19.0 points** once the stats are at midpoints (C 31.0% → D 11.9%),
which is the population that actually represents the game. So D-2 is not a rounding error; it is the
only lever on the doctrine axis, and that axis is worth up to 19.0 points of cap share on the matrix's
stat line. The verdict for D-2 is therefore: still worth fixing, but **second**, and for a different
reason than the fixture suggested — not because it explains the fixture's headline number, but because
kite is the doctrine that pays for itself most on the stat line the gate should be measuring. Fixing
the kite band would move cap share by at most the doctrine contribution (7.1 to 19.0 points depending
on stat basis); fixing the stat-basis question is worth 16.7 to 28.6.

## 7. Decisions this phase had to make

1. **Cell A is asserted against `measure()`, not against the literal 20.** FR-9/AC-8 asked for
   agreement between the two harnesses rather than the same literal pinned twice, and importing
   `measure` and `BOUNDS` from the telemetry script was cleanly possible, so it was done. The literal
   20 remains in the pin table with a comment naming `measure()` as the source of truth — the pin
   catches drift in the *reading*, the cross-check catches drift in the *call*.
2. **Both orderings are printed, plus an explicit interaction term, rather than one additive split.**
   A − D telescopes exactly under either order, and the two orders disagree by 11.9 points, so printing
   one of them alone would have presented a choice as a fact. The script prints the fixture-anchored
   decomposition (7.1 / 28.6), the matrix-anchored one (16.7 / 19.0), and the interaction that relates
   them; the verdict names the main-effect winner under the brief's anchor and states the interaction
   rather than hiding it. This is also what the spec's edge case demanded: "the verdict must say the
   variables interact rather than pick a favourite."
3. **The two 840-fight figures are recorded as constants, not re-measured.** `RECORDED` holds
   `{ fights: 840, referencePress: 377, midpointPress: 224 }` with a comment naming `bun run balance`
   as the source; the matrix is owned by `battle-balance-report.ts`, which this script must not import
   (scripts do not import scripts), and `balance-report.test.ts` already pins both figures. The audit's
   own test pins the arithmetic that consumes them.
4. **`--json` only, no other flags.** The script takes no sample-size or seed arguments: the whole point
   is that all four cells run over the fixture's own `matchups()` and seeds, so a flag that changed
   them would make cell A stop being the gate's number.
5. **Deviation — `packages/sim/src/module-size.test.ts`, outside `Touches`.** That file enumerates the
   package's `scripts/` directory explicitly ("Enumerated, not globbed, so a new tool is a deliberate
   addition") and failed with `+ "scripts/fixture-audit.ts"` until the new script was added to the list.
   The change is one array entry plus "four" → "five" in the comment that counts them; no other file
   outside `Touches` was touched. Without it the suite cannot pass, and re-pinning it to accept a
   shorter list would have been the wrong fix.

---

## Primary verification

### Commands

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | 4,157 pass / 1 skip / 0 fail; 4,158 tests across 375 files; Biome 935 files; determinism byte-identical |
| `bun run build` | 0 | 418 modules; only the pre-existing >500 kB chunk warning |

### Diff review

Five files: `fixture-audit.ts`, `fixture-audit.test.ts`, `package.json`, `module-size.test.ts` and
this evidence file. The `module-size.test.ts` edit is outside `Touches` and is **accepted**: that
suite enumerates `scripts/` explicitly on purpose ("enumerated, not globbed, so a new tool is a
deliberate addition"), so adding a script without adding it to the list fails the suite by design.
The alternative — re-pinning the list to accept a shorter enumeration — would have been the wrong
fix.

Cell A reproduces the gate's 20/42 exactly, and it is asserted against `measure()` rather than
against a second literal, so the audit and the gate are proven to agree rather than merely to match
today.

### The residual, measured instead of asserted

The subagent's verdict said the 14.8-point residual between cell D (11.9%) and the matrix (26.7%)
"is population". That is an attribution, not a measurement, and it is exactly the shape of finding
review F1 raised against the previous track. It was therefore tested, on the same 42 pairings:

| Run | Fights | Cap share | z vs the matrix's 26.7% |
| --- | --- | --- | --- |
| cell D, one seed per pairing (the audit's cell) | 42 | 11.9% | −2.16 |
| cell D, same 42 pairings × 4 of their own seeds | 168 | 15.5% | — |
| cell D, same 42 pairings × **the matrix's four seeds** | 168 | 17.9% | **−2.59** |

More seeds do not close it. The 42 strided pairings stay near 16–18% against the matrix's 26.7%
even at 168 fights, so the residual is the **pairing set**, not seed noise and not either of the two
variables under test. Cell A was re-run through the same harness in the same pass and returned
20/42, confirming the harness call is right and the D reading is not a bug.

**How to reproduce those three rows.** They came from a throwaway script (`.conductor/` is gitignored,
so it is not committed); this is its whole body, and `fixture-audit.ts` deliberately has no seed flag
so its default cell A cannot drift:

```ts
import { matchups, measureFight } from "./packages/sim/scripts/battle-telemetry"

const MIDPOINT_PRESS = { statBasis: "midpoint", doctrine: "press" } as const
const seeds = [20261109, 20261110, 20261111, 20261112] // the matrix's four
const pairs = matchups()

const one = pairs.filter(
  (m) => measureFight(m, MIDPOINT_PRESS).reason === "time",
).length // 5 / 42 = 11.9%

const four = pairs.flatMap((m) =>
  seeds.map((s) => measureFight({ ...m, seed: s }, MIDPOINT_PRESS)),
)
const capped = four.filter((f) => f.reason === "time").length // 30 / 168 = 17.9%
```

What this means, stated plainly: **the telemetry fixture's 42-pairing walk is a systematically more
decisive subset than the 210-pair matrix at midpoint stats.** That is a property of the walk, not of
this track's changes, and it does not invalidate the gate — the gate measures a fixed, deterministic
sample and bounds it — but it does mean every telemetry bound describes that walk, not the roster.
Recorded as a follow-up rather than fixed here: re-stratifying the walk is a gate redesign, and
gate redesigns are their own track with their own before/after.

### AC verdicts

- **AC-8** met: four cells on the same pairings and seeds, cell A equal to the gate by import.
- **AC-9** met: the verdict names the stat basis as dominant in points, and names the residual with
  the measurement above.
- **AC-10** met: trace seed 20261111 still ends at `0xb6cce858` with 5 invariants, `SIM_VERSION` is
  3, and the diff contains no bound, species value, frame data or resolver file.
- **NFR-4** met: the audit is a script plus a test; nothing in `.github/workflows/` or `BOUNDS`
  reads it.
