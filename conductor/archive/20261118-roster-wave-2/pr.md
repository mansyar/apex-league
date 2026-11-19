## Summary

Roster Wave 2 takes Apex League from 18 to 21 species with three original breeding-discovery lines — Thornvolt, Siltback, and Emberwing — each with two branch forms, a new voxel archetype, and byte-identical seed-42 artifacts. All 21 species pass the unchanged hard balance gate, the 20-species product goal is met, and the client handbook and gallery expose the new recipes and creatures with desktop/portrait/landscape evidence. The only finding in review was a documentation-only telemetry comment, fixed in Round 1.

## Track

- **ID:** `20261118-roster-wave-2`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261118-roster-wave-2/spec.md`](conductor/archive/20261118-roster-wave-2/spec.md)
- **Plan:** [`conductor/archive/20261118-roster-wave-2/plan.md`](conductor/archive/20261118-roster-wave-2/plan.md)
- **Review:** [`conductor/archive/20261118-roster-wave-2/review.md`](conductor/archive/20261118-roster-wave-2/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Species data, voxel archetypes, and deterministic artifacts | Ship three discovery species, recipes, branch forms, voxel archetypes and seed-42 artifacts; clear 21/21 hard balance gate | verified | `64b28e1c` | Owner revised Thornvolt to wind; owner-approved minimal existing bound adjustments (voltfox HP+8/ATK+1, embercub HP+8/ATK+1, emberwing ATK+1); original nine-kit sustained band restored |
| 2: Client discoverability and visual evidence | Expose the new recipes and archetypes in handbook/gallery and prove three-orientation layout with clean console | verified | `4dca8020` | 12 gitignored screenshots; no duplicated client recipe table; gallery reached via `?archetype=sprite\|golem\|wing` |
| R1: Review Fixes | Correct stale telemetry mirror-index doc comment | verified | `61be86bc` | Documentation-only change; no behavior, gate, bound, seed, or schema change |

## Requirements

- [x] `FR-1` — three new discovery species definitions (test: `species.test.ts`, `roster-wave-4.sweep.test.ts`)
- [x] `FR-2` — three order-independent breeding recipes (test: `breeding/discovery.test.ts`)
- [x] `FR-3` — six globally unique branch forms with element-true signatures absent from own kits (test: `branches.test.ts`, `bosses.test.ts`)
- [x] `FR-4` — three voxel archetypes with fuzz, budget, BodyProfile and choreography coverage (test: `wave_archetypes.test.ts`, fuzz shards, `choreo.test.ts`)
- [x] `FR-5` — nine new seed-42 GLB/manifest pairs; 54 existing pairs byte-identical (test: `bun run gate:determinism`)
- [x] `FR-6` — 21/21 under the unchanged hard balance gate (test: `bun run balance`)
- [x] `FR-7` — client handbook/gallery derivation for new recipes and archetypes (test: `handbook.test.ts`)
- [x] `FR-8` — desktop 1440×900, portrait 393×852, landscape 852×393 visual evidence with clean console (test: `verification/phase-2.md`)
- [x] `FR-9` — final invariant re-proof across all verification layers (test: `verification/integrated.md`)
- [x] `NFR-1` — byte-identical determinism, hash `0xff6f3d62`, `SIM_VERSION` unchanged
- [x] `NFR-2` — client/sim/voxel module caps respected without allowlists
- [x] `NFR-3` — no dependency, save-schema, gate, threshold, fence, pacing-pin or `SIM_VERSION` change
- [x] `NFR-4` — new kits inside shipped sustained band; moves inside damage band
- [x] `NFR-5` — UX principle 8 holds at 393×852 and 852×393 with zero console errors/warnings
- [x] `NFR-6` — evidence records exact commands, counts, figures, artifact hashes, screenshot paths and deviations
- [x] `AC-1` — three species discoverable and roster count 21
- [x] `AC-2` — order-independent recipes
- [x] `AC-3` — six unique branch signatures
- [x] `AC-4` — three voxel archetypes and fuzz coverage green
- [x] `AC-5` — 63 artifact pairs and 5 prop digests byte-identical
- [x] `AC-6` — 21/21 hard gate green with no waivers
- [x] `AC-7` — client recipe/gallery discoverability
- [x] `AC-8` — three-orientation visual evidence with clean console
- [x] `AC-9` — full verification chain exit 0
- [x] `AC-10` — scope proof confined to approved paths

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| typecheck | `bun run check` | pass | no type errors |
| lint | `bunx biome check` | pass | 1005 files, no fixes |
| unit | `bun test --check --parallel --timeout 120000` | pass | 4367 pass / 1 skip / 0 fail, 665357 `expect()` calls |
| determinism | `bun run gate:determinism` | pass | 63 seed-42 pairs + 5 prop digests byte-identical, hash `0xff6f3d62` |
| balance | `bun run balance` | pass | 21/21, cap 517/1680 (30.8%), decisive 1574/1680 (93.7%), damage band 49/49 |
| build | `bun run build` | pass | Vite 428 modules, exit 0 (chunk-size warning only) |
| fuzz | `bun run test:fuzz` | pass | 139 pass / 0 fail, 129015 `expect()` calls |
| combined | `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz` | pass | exit 0 at post-review head `2feacf7c` |
| visual | `playwright-cli` desktop/portrait/landscape | pass | 12 screenshots, console 0 errors / 0 warnings, no horizontal scroll at 393/852 |

Full evidence: [`conductor/archive/20261118-roster-wave-2/verification/integrated.md`](conductor/archive/20261118-roster-wave-2/verification/integrated.md)

## Media

![Roster Wave 2 showcase — handbook and new archetypes](https://github.com/user-attachments/assets/f76ceb6c-96eb-42ca-a376-569b980e6de8)

## Review

- **Verdict:** `PASS`
- **Rounds:** 2 (round 1 `PASS WITH FINDINGS`, round 2 delta `PASS`)
- **Fixed:** 1 finding (stale telemetry mirror-index comment)
- **Accepted/deferred:** 0

## Deviations and risks

- Thornvolt is wind while keeping the `plant + electric` breeding recipe, so the original nine-kit sustained band and global signature uniqueness remain unchanged (owner decision 2026-11-19).
- Owner-approved minimum existing-row stat-bound adjustments: voltfox HP `[144,174]`/ATK `[9,12]`, embercub HP `[152,181]`/ATK `[9,13]`, emberwing ATK `[15,18]`. No gate, threshold, fence, or pacing pin changed.
- `choreo_wave.ts` and `wave_body.ts` are helper splits required to stay under client/voxel module caps without allowlists.
- Telemetry uses a two-pass mirror-target exchange for 21-species coverage; stride 11, 42 pairings, sample size 42, bounds and assertions are unchanged.
- Retained probe tests (`tune-probe.test.ts`, `telemetry-probe.test.ts`) became permanent regression tests.
- Pre-existing, out of scope: favicon 404 on direct gallery load; internal 393px gallery row clipping under `overflow-x: hidden` (no page horizontal scroll).
- Physical device-lab verification remains a human-only follow-up.

## Follow-ups

- Owner schedules the hardware device-lab pass (human-only).
- The 20-species product goal is met; any further roster waves are optional.

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commit
git revert --no-edit <squash-commit>
```

No save-schema migration, feature flag, or data rollback is required; `SIM_VERSION` is unchanged.
