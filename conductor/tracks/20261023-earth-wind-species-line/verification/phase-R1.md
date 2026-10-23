# Phase R1 — Review Fixes (Earth & Wind Species Line)

- **Track:** 20261023-earth-wind-species-line · **Phase:** R1
- **Date:** 2026-10-23
- **Branch:** `feat/20261023-earth-wind-species-line`
- **Base:** `1004d6491af95cea2016accd0872fd114fa36ad5` (review-fix start point)
- **Head:** `d6f6d722f1b8ee8292f5305e9132f30f701f95f5`
- **Result:** verified — F1, F2, F3 resolved; whole suite green (2,452 pass / 1 skip / 0 fail), typecheck clean, biome clean (569 files), determinism gate green at 18 creature GLBs + 5 props.

## Commands

| Command | Exit | Summary |
| --- | --- | --- |
| `bun test --timeout 120000` | 0 | 2,452 pass / 1 skip / 0 fail across 194 files — same pass/skip/fail counts as the review baseline. |
| `bun run check` | 0 | 0 type errors — voxel 90 / sim 147 / client 352 files. |
| `biome check` (bare binary) | 1 | `biome` not resolvable in this sandbox (expected per the brief's operational note). |
| `bun run verify` | 0 | Lint leg obtained here per the brief: typecheck clean, suite 2,452/1/0 (`--check --parallel`), `biome check` clean — 569 files, no fixes needed — plus the determinism gate: 18 creature GLBs byte-identical (falcon/tortoise × 3 stages included) and 5 prop digests unchanged. |

## Finding-by-finding acceptance

### F1 · falcon SPD bounds + whole-roll-range assertion · Medium

- **Bounds:** `packages/sim/src/species.ts` `wind_falcon.statBounds.spd` `[15, 19]` → `[17, 19]` (commit `77e2761`). hp `[56, 68]`, atk `[10, 14]`, def `[4, 7]` unchanged. Tortoise and hound bounds untouched.
- **Assertion:** `packages/sim/src/species.test.ts` "stat profile is the fastest, frailest record in the game" now asserts the hound precedent's whole-roll-range convention: `falcon.statBounds.spd[0] > every other species' statBounds.spd[1]` (one expect per species instead of the two per-bound expects). With the new floor, no existing species can out-roll a falcon — the electric hound's ceiling is 16 < 17.
- **Probe re-pins:** `packages/sim/src/battle/species-balance.test.ts` — only two cells shifted; both falcon final-rival cells. Caps re-measured: all six falcon cap pins and all six tortoise cap pins are unchanged, the falcon +4/+6 rival pins are unchanged, and every tortoise rival pin is unchanged. Tortoise cells confirmed unaffected.

| Pin | Before (won/games) | After (won/games) |
| --- | --- | --- |
| falcon final rival trained+0 | 8/36 | 9/36 |
| falcon final rival trained+2 | 11/36 | 7/36 |
| falcon cap cells (koda/hesse/marlow/delmar/fenn/thessa) | 29, 36, 36, 36, 30, 36 /36 | unchanged |
| falcon final rival trained+4 / +6 | 30/36, 30/36 | unchanged |
| tortoise: all cap cells, all rival cells | 36/36 caps; 0, 17, 36, 36 /36 rivals | unchanged |

- **Bands still hold:** the +2 cell (7/36 = 19.4%) stays inside its 15–90% sanity band; the fresh gate (0 wins at trained+0 for both species) is still green; every cap cell remains ≥ 35% (koda 29/36 = 80.6%, fenn 30/36 = 83.3%, thessa 36/36). No band was weakened.
- **Determinism:** bounds are sim data; the falcon model does not change — the gate re-verified all 18 GLBs byte-identical.

### F2 · handbook population note · Low

- `apps/client/src/handbook/chart.ts` `POPULATION_NOTE` — before: "…the league's Silver reward hands out the Electric Storm Hound. Earth and Wind matchups are charted and waiting for their species." → after: "…the league's reward tiers hand out the Electric Storm Hound (Silver), the Zephyr Falcon (Gold), and the Basalt Tortoise (Legend)." One sentence (≤2-sentence guideline kept), states today's roster, no date promises. Nothing else in the file touched.

### F3 · lossless test proves full-state equality · Low

- `packages/sim/src/save/giftSave.test.ts` "the mapping is lossless — the migrated state equals the equivalent v25 state": the two field assertions (`claimedTiers`, `pendingRewards`) were replaced by `expect(migrated.state).toEqual(equivalent)`, where `equivalent` is already a full GameState (starter-chosen initial state + the reward record). The test now proves the migrated v25 state equals the hand-built equivalent v25 state in full — every field, key order included. No other assertion in the file was weakened; all 31 tests in the file pass.

## Deviations

None. Only the five named files were touched (`species.ts`, `species.test.ts`, `species-balance.test.ts`, `chart.ts`, `giftSave.test.ts`); no probe re-pin required extra co-located tests.

## Notes

- `SAVE_VERSION` stays 25; no behaviour change beyond the three findings; no new dependency, no `any`, no `@ts-ignore`, no default exports.
- Boss suites and rival-roster pins untouched and green (included in the full-suite run).
- The whole-suite `bun test` leg took ~395 s serially; `bun run verify` re-runs it in parallel (~97 s) with identical counts.
- Commits: `77e2761` (F1), `493e90c` (F2), `d6f6d72` (F3), plus this evidence file's commit.

## Primary verification

Run by the primary agent on 2026-10-23 over the R1 range
`1004d649..HEAD` before acceptance.

**Structural checks**

| Check | Result |
| --- | --- |
| Working tree | Clean. |
| Commits in `1004d64..HEAD` | `77e2761`, `493e90c`, `d6f6d72`, `2060355` — exactly the four reported, one per finding plus evidence. |
| Files changed | Exactly the five named files + this evidence file. |
| Falcon bound | One-line change: `spd: [15, 19]` → `spd: [17, 19]`; hp/atk/def untouched. |
| Probe re-pin | Two lines: only the falcon final-rival cells shifted (+0: 8→9, +2: 11→7), both inside the 0.15–0.9 band; every falcon cap cell and all tortoise cells unchanged. |
| Assertion | `species.test.ts` now asserts `falcon.statBounds.spd[0] > other.statBounds.spd[1]` for every species — whole-roll-range dominance. |
| Handbook note | One sentence naming starters + Silver/Gold/Legend reward lines; ≤2-sentence guideline holds. |
| Lossless test | `expect(migrated.state).toEqual(equivalent)` — full-state equality, as the title claims. |

**Independent command results**

| Check | Command | Exit | Result |
| --- | --- | --- | --- |
| Lint | `bunx biome check` (direct) | 0 | 569 files checked, no fixes applied. |
| Phase static | `bun run check` | 0 | voxel 90 / sim 147 / client 352 files, 0 errors. |
| Targeted suites | `bun test --timeout 120000 species.test.ts species-balance.test.ts giftSave.test.ts` | 0 | 65 pass, 0 fail. |
| Determinism | `bun run gate:determinism` (via `bun run verify`) | 0 | 18 creature GLBs byte-identical + 5-props digest. |
| Integrated gate | `bun run verify` | 0 | Green end to end. |
| Build (`verify_phase`) | `bun run build` | 0 | `@apex/client` build succeeded. |

**Acceptance**: F1 resolved by the stronger fix (bounds raised, convention
asserted, probes re-pinned within bands); F2 and F3 resolved minimally. No
deviation was recorded and none is observed.
