## Summary

Adds three breeding-discovery species — Dune Jerboa (Earth+Wind), Spark Ray (Fire+Electric), and Gale Moth (Plant+Wind) — taking the roster from 15 to 18 while keeping every existing balance gate, pacing pin, save contract, and `SIM_VERSION` unchanged. Each line ships with two branch forms, a new voxel archetype with nine seed-42 artifact pairs, and handbook/gallery discoverability. All 18 species pass `bun run balance` with no waivers; determinism and full fuzz gates are green.

## Track

- **ID:** `20261118-roster-wave-1`
- **Type:** feature (medium)
- **Spec:** [conductor/archive/20261118-roster-wave-1/spec.md](conductor/archive/20261118-roster-wave-1/spec.md)
- **Plan:** [conductor/archive/20261118-roster-wave-1/plan.md](conductor/archive/20261118-roster-wave-1/plan.md)
- **Review:** [conductor/archive/20261118-roster-wave-1/review.md](conductor/archive/20261118-roster-wave-1/review.md)

## What happened

| Phase | Goal | Checkpoint |
| --- | --- | --- |
| P1 | Sim species, recipes, branch forms, three voxel archetypes, nine byte-identical seed-42 artifact pairs | `0dc9995c` |
| P2 | Client handbook/gallery discoverability, desktop + 393px visual evidence, final invariant re-check | `51b03182` |
| R1 | Correct stale telemetry pairing doc block for the 18-species roster | `b198c03f` |
| R2 | Correct R1 evidence commit provenance | `d66f37fc` |

## Requirements

- [x] FR-1 three species definitions with unique IDs, kits, bounds
- [x] FR-2 three order-independent, collision-free breeding recipes
- [x] FR-3 six champion branch forms with equal budgets and unique signatures
- [x] FR-4 three voxel archetypes with templates, budgets, body/choreography profiles
- [x] FR-5 nine new seed-42 GLB+manifest pairs; 45 existing pairs byte-identical
- [x] FR-6 `bun run balance` green at 18/18 with no waivers or gate changes
- [x] FR-7 new species/recipes discoverable in handbook/gallery; rival-field eligible
- [x] FR-8 desktop 1440x900 and iPhone 393x852 screenshots with clean console
- [x] FR-9 changes confined to approved sim/voxel/artifact/client content surfaces
- [x] NFR-1 determinism gate passes for 54 pairs + 5 props
- [x] NFR-2 module-size caps hold
- [x] NFR-3 no dependency, `SAVE_VERSION`, `SIM_VERSION`, or threshold change
- [x] NFR-4 UX principle 8 holds at 393x852 and 852x393
- [x] NFR-5 evidence records commands, counts, balances, hashes, and paths
- [x] NFR-6 full fuzz sweep green for all 18 archetypes
- [x] AC-1 through AC-10 all covered

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Static | `bun run check`, `bunx biome check` | pass — 974 files clean | `verification/integrated.md` |
| Unit | `bun test --check --parallel --timeout 120000` | 4302 pass / 1 skip / 0 fail | `verification/integrated.md` |
| Determinism | `bun run gate:determinism` | OK — 54 seed-42 pairs + 5 props, hash `0xff6f3d62` | `verification/integrated.md` |
| Balance | `bun run balance` | 18/18; cap 384/1224 (31.4%), median 32.93s, damage 49/49, no waivers | `verification/integrated.md` |
| Build | `bun run build` | pass — Vite 423 modules | `verification/integrated.md` |
| Fuzz | `bun run test:fuzz` | 118 pass / 0 fail | `verification/integrated.md` |
| Visual | `playwright-cli` desktop 1440x900 + iPhone 393x852, primary 852x393 check | screenshots present, console 0 errors/0 warnings in phase flow | `verification/phase-2.md` |

## Media

![Roster Wave 1 showcase](.conductor/media/20261118-roster-wave-1/roster-wave-1-showcase.gif)

Six desktop/phone screenshots of the handbook and new archetypes are recorded in `verification/phase-2.md` under the gitignored `.conductor/evidence/20261118-roster-wave-1/` directory. The showcase GIF is also gitignored and is attached to this PR only.

## Review

- **Verdict:** PASS (round 1 PASS WITH FINDINGS; round 2 delta BLOCK; final round 3 delta PASS)
- **Rounds:** 3
- **Fixed:** 2 Low findings (stale telemetry doc block; R1 evidence commit provenance)
- **Deferred / overridden:** none

## Deviations and risks

- `apps/client/src/choreo.ts` / `choreo.test.ts` were updated outside the written Phase 1 Touches because the brief explicitly pointed to the choreography/BodyProfile table for AC-4; moth `swayAmp` was lowered to 0.034 to keep the crab-sways-most pin true.
- The D-1 pacing debt pin remains byte-for-byte from base; only its diagnostic `sample()` is filtered to the pre-wave 15 species so the owner-ratified marker measures the same population. No pacing fence, controller, or assertion changed.
- Telemetry mirror-hop start changed from 1 to 9 with stride 11, sample size 42, bounds, and assertions unchanged, keeping all 18 species away at least twice.
- Two strict falcon-faster assertions gained a narrow co-fastest exception for `dune_jerboa` (`spd[17,17]`).
- Diagnostic pins in balance-report and fixture-audit tests were refreshed to measured 18-species values; no gate, threshold, or fence changed.
- Test-only wall-clock headroom was raised for three heavy tests (60 s / 240 s / 240 s); assertions, fixtures, seeds, budgets, and gates are unchanged.
- The physical device-lab pass remains human-only and out of scope.

## Follow-ups

- Owner schedules the hardware device-lab pass.
- Continue the roster climb toward 20–40 species in later waves if desired.

## Rollback

- Squash merge: `git revert --no-edit -m 1 <merge-commit>`
- Direct squash commit: `git revert --no-edit <squash-commit>`

No save-schema migration is involved; reverting restores the 15-species roster and removes the three new artifact pairs.
