# Phase 13 verification — Legacy Freeze and Version Bump

Track: `20261108-continuous-arena-battle`
Branch: `feat/20261108-continuous-arena-battle`
Covers: FR-15, FR-16, AC-15, AC-16
Commits: `170ca23b`, `a27fcc3e`, `164d52d9` (plus this evidence file)

## Commands

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | typecheck 4 packages clean; **3,790 pass, 1 skip, 0 fail** (3,791 tests, 352 files, 465,733 `expect()` calls); biome clean on 880 files; determinism gate OK for all 45 species/form digests (15 species × 3 forms) + 5 props |
| `bun run build` | 0 | vite production build, 396 modules, `dist/assets/index-DXnqqf4n.js` 1,026.20 kB |

Both commands were run separately, as the brief requires. Two attempts were
needed for `bun run verify`: the first run failed on `tsc` (a `readonly
string[]` passed to `toEqual`) and biome (one formatter wrap, one import sort).
Both were fixed by hand (biome `--write` is not available to this agent); the
second run was clean. The suite count moved 3,779 → 3,790: exactly the three
new freeze tests, six new version-gate tests, and two new compatibility tests.

## AC table

| AC | Requirement | Proof |
| --- | --- | --- |
| AC-15 | A pre-track ghost bundle is skipped on version mismatch instead of misreplaying | `packages/sim/src/cup/ghost.test.ts` → `describe("ghost bundle — the simulator version gate (FR-15, AC-15)")`: *a pre-track (v1) bundle is rejected instead of misreplayed*; *a future (v3) bundle is rejected*; *a matching bundle still replays byte-identically*; *the gate fails closed before the resolver runs*; *the guarded replay skips a mismatched bundle quietly*. Client side already covered and unchanged: `apps/client/src/board/ghost-section.test.ts` *a version-skewed champion lists with the quiet note and no button*, `apps/client/src/spar/ghost.test.ts` (`readGhostContender` → `null`, `isVersionSkippedBundle`). |
| AC-16 | A save written before the track loads and its in-flight cup completes | `packages/sim/src/save/cupSave.test.ts` → `describe("pre-track save compatibility (FR-16, AC-16)")`: *a pre-track save loads and its in-flight cup resumes*; *the loaded session resolves to completion*. Existing *old chain still reaches current: a v1 save walks to v5 with cup defaults* still passes in the same file. |

Supporting fence for FR-15 (clock is replay-only): `packages/sim/src/battle/clock.freeze.test.ts`
→ *a live fight files the dense trace the clock cannot make*; *the frozen
resolver's result carries no dense trace*; *no production module outside the
frozen path builds a clock*.

## What changed

1. **Freeze headers (FR-15).** `battle/clock/types.ts`, `battle/clock/engine.ts`,
   `battle/clock/hits.ts`, the `battle/clock.ts` barrel, and
   `battle/playback.ts` now say REPLAY-ONLY in their module headers, naming
   `../continuous` as the live path. `playback.ts` is marked *replay-only
   pacing*, because a live fight still reads its steps for announcer lines and
   only the paced beat path is the legacy fallback — the header says so rather
   than overclaiming.
2. **`battle/clock.freeze.test.ts` (new, 140 lines).** Two runtime proofs plus
   a production source scan. `resolveContinuous` files a dense trace
   (`streamOf` defined); `resolveBattle` files none. The scan walks
   `packages/sim/src` and `apps` (tests and build output excluded) for
   `resolveBattle(` / `createClock(` / `createClockFighter(` and requires the
   allow-list to be exactly: `battle/resolver.ts` (the frozen path),
   `battle/clock/engine.ts` (the constructors), and `apps/client/src/spar.ts`
   (the reported live caller). A new caller fails the test on purpose.
3. **`cup/ghost.ts`.** `replayGhost`'s doc now states that the primitive does
   not read `simVersion`; the gate lives in `verifyGhostBundle`. No behaviour
   change, `SIM_VERSION` stays **2**.
4. **`cup/ghost.test.ts`.** The version-gate describe above: marker pinned at 2,
   v1 rejected, v3 rejected, matching bundle verifies and replays
   byte-identically, verification short-circuits *before* the resolver (a
   poisoned `player: null` side answers `false` instead of throwing), and the
   guarded read (`verify ? replay : null`) skips quietly.
5. **`save/cupSave.test.ts`.** The pre-track fixture is hand-written JSON
   (`{version: 25, state, session, savedAt: 1234}`) — the bytes an old build
   left behind, not what today's `saveGame` would emit. The test loads it
   through `loadSave`, resumes from the *loaded* session only, plays the
   remaining rounds, and calls `completeCup` on an exit, asserting a terminal
   status and a crowned champion. **No migration was added** (FR-16): v25 was
   current before the track and nothing in the payload moved.

## Deviations

| File | Why |
| --- | --- |
| `packages/sim/src/battle/clock.ts` | The barrel of `clock/`; its header is the first thing a reader of the frozen surface sees, and it sat outside the directory the brief names. Same concern, one line of prose. |
| `packages/sim/src/save/cupSave.test.ts` | The brief's Touches list names the clock, `playback.ts`, and `ghost.ts`; AC-16 needs a save test. The existing save-suite fixture home (`save/`) is the only place the schema round trip is already exercised, so the compatibility test lives beside it instead of in a new file. No production save code touched. |
| `packages/sim/src/cup/ghost.test.ts`, `packages/sim/src/battle/clock.freeze.test.ts` | Co-located tests for the touched modules (the brief allows co-located tests). |

## Notes for the primary

- **A production caller still resolves new fights through `resolveBattle`:**
  `apps/client/src/spar.ts:130` (`runBattle`, used by both the normal spar and
  `ghostSparSetup`). It is the one entry the freeze cannot fence off without a
  product decision, so it is allow-listed in the scan and reported here rather
  than deleted or rerouted. **Fixed in Rework 1 below:** spar now resolves
  through `resolveContinuous` and is off the allow-list.
- **`SIM_VERSION` was not bumped.** It is 2 and a test now pins it, so a later
  phase cannot invalidate stored bundles by accident.
- `continuous/` was not modified; no simulation behaviour changed. Only prose
  headers, tests, and one doc comment.
- **P13.T4 (docs truth pass) is not done here** — `conductor/product.md` and
  `conductor/learnings.md` are the primary's edits.
- The client-side quiet skip (`isVersionSkippedBundle` → note, no button) and
  the server's permissive `isPlausibleGhost` (any non-negative integer version)
  were left as they are: the server stores, the client and sim gate.

## Rework 1 — spar on the continuous engine

Commits: `711d925c`, `f57fbbd6`, `e0ee2620` (plus this evidence file).

### The call site, before and after

Before — `apps/client/src/spar.ts` `runBattle` resolved every spar on the
frozen gauge clock, and its result carried no trace:

```ts
import { ..., resolveBattle, ... } from "@apex/sim"
const verdict = resolveBattle(setup.ownedSide, setup.rivalSide, seed)
```

After — the spar's verdict has its own module, `spar/resolve.ts`, and both the
normal exhibition and the ghost bout go through it:

```ts
export function resolveSpar(setup: SparSetup, seed: number): BattleResult {
  return resolveContinuous(setup.ownedSide, setup.rivalSide, seed)
}
```

```ts
const verdict = resolveSpar(setup, seed)
```

`resolveContinuous` was not reachable from the client: `packages/sim/src/index.ts`
re-exports the battle barrel by name and did not list it. One additive export
line was added (no simulation code touched, no behaviour changed).

### Stream wiring

`spar.ts` already forwards `onFrame` into `createBattleSession`, and
`createBattleSession` hands it to the playback driver; `app/screens.ts` wires
it to `staging.applyFrame`. The only missing link was the trace itself: the
driver reads `streamOf(verdict)` in `start()`/`replay()`, so a spar now takes
the same dense path as a cup fight — the playhead advances at 50 Hz, the arena
draws each frame, and `StepIO.streamOwnsBodies()` is true, so the Phase 11
position-ownership fix finally reaches the legacy path the owner was playing.
Announcer lines ride the same events (`onLine`), and the finish hold is
untouched: the driver still stamps and calls `onFinish`, and spar's chrome
(replay pill, chip row, log toggle) is unchanged.

### The freeze fence

`packages/sim/src/battle/clock.freeze.test.ts`:

- `EXPECTED_CALL_SITES` no longer contains `apps/client/src/spar.ts`; the
  allow-list is now exactly the frozen resolver and the clock's constructors.
- The header and constant docs now say no production fight reaches the frozen
  resolver — only the legacy replay path and the tests that pin it.
- The scan itself is unchanged, so a new `resolveBattle(` caller still fails.

### The new test

`apps/client/src/spar/resolve.test.ts` (new, two tests):

- *a spar resolves on the continuous engine with its dense trace* — a seeded
  exhibition through `resolveSpar` has `streamOf(verdict)` defined and a
  non-empty event log.
- *the same seed replays the same events* — two resolutions of the same seed
  yield identical `events`, `winner`, and `finalHp`.

`spar/ghost.test.ts` was moved onto `resolveSpar` (the old `resolveBattle`
calls asserted a path production no longer takes) and now also pins that a
ghost bout carries a trace. Ghost version gating is untouched:
`readGhostContender` still rejects any bundle whose `simVersion` is not the
current `SIM_VERSION`, so pre-v2 bundles are skipped quietly.

### Commands

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | typecheck 4 packages clean (voxel 160, sim 208, server 44, client 498 files); **3,792 pass, 1 skip, 0 fail** (3,793 tests, 353 files, 465,739 `expect()` calls); biome clean on 882 files; determinism gate OK for all 45 species/form digests + 5 props |
| `bun run build` | 0 | vite production build, 397 modules, `dist/assets/index-Ca66_dfN.js` 1,018.94 kB |

Run as two separate commands, as the brief requires. The first `bun run verify`
failed at `tsc` (the missing `resolveContinuous` re-export); after adding it the
second run was clean. Suite count moved 3,790 → 3,792: exactly the two new
`resolveSpar` tests.

### Deviations

| File | Why |
| --- | --- |
| `packages/sim/src/index.ts` | One additive `resolveContinuous` export. Without it the client cannot call the continuous resolver at all (`@apex/sim` exposes only its root entry), so the phase goal is unreachable. No simulation behaviour, no signature, and no other export changed. |

## Primary verification

| Layer | Command | Exit | Result |
| --- | --- | --- | --- |
| static + unit + determinism | `bun run verify` | 0 | 3792 pass, Ran 3793 tests across 353 files. [110.42s] |
| build | `bun run build` | 0 | client build clean |

**Rework 1 — spar was still on the gauge clock.** `apps/client/src/spar.ts:130`
resolved every spar through `resolveBattle`, so FR-15 was false and the mode the
owner would playtest was the old engine. Spar now resolves through
`resolveSpar` -> `resolveContinuous`, the dense stream reaches the arena through
the existing session, and spar is off the freeze test's allowlist. The
teleport the owner reported was seen on this legacy path, where `denseMode` is
false and the old stage nudges are intended; the Phase 11 ownership fix does not
reach it, which is why migrating spar mattered more than the fix.

**Docs truth pass (P13.T4), done by the primary** because the phase agent is
denied edits under `conductor/`: the roadmap records the continuous engine, and
`learnings.md` gained section 13 (a mechanic you cannot reach is not
implemented — the dodge, the tactic and the flank bonus) and section 14
(retargeting playback is not retargeting animation; two writers to one field is
a pop; bounds and the painted ring must be the same number). Committed as
`3768c4d5`.

Not squashed: the phase held four commits across two agents plus the primary's
docs sync.

## Rework 2 — HP pool single source

The owner reported no damage in spar: the fight ran, the announcer called hits,
and the HP bars stayed full. Two pools were in play.

| Side (seed 7 drake, spar seed 4242) | Stat HP (setup panel) | Fight pool (sim) | HUD denominator before | HUD denominator after |
| --- | --- | --- | --- | --- |
| Ember Drake | 76 | 296 | 76 → `hpFraction(296, 76)` clamps to 1 | 296 |
| Bramble Ox (rival) | 100 | 390 | 100 → clamps to 1 | 390 |

`resolve.ts` opens every side at `floor(stats.hp * HP_SCALE_PERCENT / 100)` with
`HP_SCALE_PERCENT = 390`, so the first step's `hpAfter` (296) was already above
the HUD's maximum (76). `hpFraction` clamps, so the bar never moved; the same
was true of the cup, which also framed its fight from stat HP
(`apps/client/src/cup/arena.ts` — `battleStats(creature).hp`, `opponent.stats.hp`)
even though `resolvePlayerMatch` fights on the continuous engine.

### The helper

New module `packages/sim/src/battle/continuous/hp.ts`:

```ts
export const HP_SCALE_PERCENT = 390

/** A side's opening pool: its stat HP at the scale above, floored. */
export function startingHp(side: Pick<BattleSide, "stats">): number {
  return Math.floor((side.stats.hp * HP_SCALE_PERCENT) / 100)
}
```

`initFor` now takes its opening HP from `startingHp(side)`, so the resolver and
the client call the same function — the number cannot drift. The constant moved
out of `resolve.ts` into the same module (still re-exported from `resolve.ts`,
so that module's surface is unchanged) because `resolve.ts` was already 12,257 B
against the 12,288 B module-size cap and the helper pushed it over; splitting the
HP seam is what the cap's own message asks for. `HP_SCALE_PERCENT` is exported
from `@apex/sim` only through `startingHp` — the client never spells 390.

### Both call sites

`apps/client/src/spar/casting.ts` — `fightNowFor`:

```ts
maxHp: startingHp(setup.ownedSide),   // was setup.ownedSide.stats.hp
maxHp: startingHp(setup.rivalSide),   // was setup.rivalSide.stats.hp
```

`apps/client/src/cup/arena.ts` — `mem.fightNow`:

```ts
maxHp: startingHp({ stats: battleStats(creature) }),  // was battleStats(creature).hp
maxHp: startingHp(opponent),                          // was opponent.stats.hp
```

The cup was wrong for the same reason and is fixed here. The setup panel is
untouched: it renders the stat line from the sides' stats (`spar/loadout-vm.ts`
`statLine`), so it still shows 76/100; only the in-battle HUD shows the pool it
tracks. The legacy replay path is untouched — a `PlaybackFight` is only ever
built for a fight this session just resolved, and the paced fallback reads the
same object it always did.

### The new test

`apps/client/src/spar/casting.test.ts` (new, two tests, seed 4242):

- *maxHp is the pool the resolver opens the fight with* — both sides'
  `maxHp` equals `startingHp(side)`, and is strictly greater than the side's
  stat HP (296 > 76, 390 > 100).
- *the first landed hit takes a bar below full* — walks the real playback
  script (`scriptFor(verdict)`) to the **first** step with `damage > 0`, finds
  the side(s) whose `hpAfter` is below their maximum, and asserts
  `hpFraction(hpAfter, maxHp) < 1`. This is the assertion the bug needed: it
  was verified red by temporarily restoring `stats.hp` in `fightNowFor` — both
  tests failed (expected 296, received 76; `dropped.length` 0), then green with
  the fix.

### Commands

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | typecheck 4 packages clean (voxel 160, sim 209, server 44, client 500 files); **3,794 pass, 1 skip, 0 fail** (3,795 tests, 354 files, 465,745 `expect()` calls); biome clean on 884 files; determinism gate OK for all 45 species/form digests + 5 props |
| `bun run build` | 0 | vite production build, 398 modules, `dist/assets/index-Bpg-Bpc3.js` 1,018.93 kB |

Run as two separate commands. Two `bun run verify` attempts were needed after
the first edit: the first failed `packages/sim/src/module-size.test.ts`
(`resolve.ts` 12,657 B, 369 B over the 12,288 B cap), which is why the helper
moved to `continuous/hp.ts`; the second failed only biome's export ordering in
the two barrels, fixed by hand. Suite count moved 3,792 → 3,794: exactly the two
new `casting` tests.

### Deviations

| File | Why |
| --- | --- |
| `packages/sim/src/battle/continuous/hp.ts` (new) | The helper and `HP_SCALE_PERCENT` could not live in `resolve.ts` without breaking the 12 KB module-size cap; the constant moved with the helper so there is still exactly one copy. |
| `packages/sim/src/battle/index.ts`, `packages/sim/src/index.ts` | One additive `startingHp` re-export each; without it the client cannot reach the helper through `@apex/sim`. |
