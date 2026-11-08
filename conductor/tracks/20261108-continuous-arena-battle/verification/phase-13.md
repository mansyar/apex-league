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
  than deleted or rerouted.
- **`SIM_VERSION` was not bumped.** It is 2 and a test now pins it, so a later
  phase cannot invalidate stored bundles by accident.
- `continuous/` was not modified; no simulation behaviour changed. Only prose
  headers, tests, and one doc comment.
- **P13.T4 (docs truth pass) is not done here** — `conductor/product.md` and
  `conductor/learnings.md` are the primary's edits.
- The client-side quiet skip (`isVersionSkippedBundle` → note, no button) and
  the server's permissive `isPlausibleGhost` (any non-negative integer version)
  were left as they are: the server stores, the client and sim gate.
