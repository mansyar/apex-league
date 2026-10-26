# Species Roster Expansion

## Summary

The roster goes from **6 species to 9**, filling the reward ladder with a second species at every tier. Three new lines — **Fernstag** (plant, Silver), **Reefclaw** (water, Gold), **Cindermoor** (fire, Legend) — each ship with their own voxel archetype, a probe-tuned six-move kit drawn from the existing vocabulary, and two champion branch forms. Existing saves catch up retroactively at boot. The save schema stays at v25 and no sim seam was redesigned.

## Track

- Spec: [spec.md](../blob/main/conductor/archive/20261025-species-roster-expansion/spec.md)
- Plan: [plan.md](../blob/main/conductor/archive/20261025-species-roster-expansion/plan.md)
- Review: [review.md](../blob/main/conductor/archive/20261025-species-roster-expansion/review.md)

## What happened

| Phase | Goal | Checkpoint |
| --- | --- | --- |
| 1 | Species data, kits & reward seam | `f9c1e366` |
| 2 | Voxel archetypes | `6e30f698` |
| 3 | Client presentation & lifecycle | `a15a01a2` |
| 4 | Rivals, bosses & integrated evidence | `0564ee8b` |
| R1 | Review fixes (round 1, six findings) | `3262768d` |
| R2 | Review fixes (round 2, two findings) | `10cdc188` |

## Requirements

**Functional**

- [x] FR-1 — Three new species definitions with element, archetype, stats and kits
- [x] FR-2 — One new voxel archetype per line, deterministically generated
- [x] FR-3 — Tier-gated acquisition through the existing reward seam
- [x] FR-4 — Kits composed from existing move vocabulary, no new mechanics
- [x] FR-5 — Full lifecycle parity: hatch, training, evolution, branch forms, retirement
- [x] FR-6 — Rival pools and gatekeeper bosses draw the new roster
- [x] FR-7 — Roster surfaces present the new species
- [x] FR-8 — Copy single-sourced and accurate against the catalog
- [x] FR-9 — Retroactive catch-up for saves that already claimed a tier

**Non-functional**

- [x] NFR-1 — No sim/save-schema change; save stays v25
- [x] NFR-2 — Module caps respected (12 KB sim/client, 24 KB voxel)
- [x] NFR-3 — Determinism absolute; no hand-edited GLBs
- [x] NFR-4 — Hue contract, surface ramp, gilded cosmetic-only
- [x] NFR-5 — No new dependencies
- [x] NFR-6 — Mobile bar held (393×852 and 852×393)

**Acceptance**

- [x] AC-1 — `REWARD_SPECIES` pins the six reward lines in tier order
- [x] AC-2 — 27 creature GLBs byte-identical, tripwire green
- [x] AC-3 — Kits pass the balance probe without re-baselining goldens
- [x] AC-4 — Catch-up is idempotent, tier-ordered and pure
- [x] AC-5 — Hatch, training and evolution verified in the real app
- [x] AC-6 — All six gatekeepers reachable and beatable end-to-end
- [x] AC-7 — Roster surfaces correct at desktop, phone and landscape
- [x] AC-8 — Copy makes only claims the catalog structurally guarantees

## Verification

| Check | Command | Result |
| --- | --- | --- |
| Tests | `bun test --check --parallel=4 --timeout 120000` | 2800 tests / 239 files / 0 fail / 1 pre-existing skip |
| Typecheck | `bun run verify` | Clean — voxel 118, sim 151, client 389 |
| Lint + format | `bun run verify` | Biome clean (one pre-existing `noDescendingSpecificity` warning) |
| Determinism | `bun run verify` | 27 creature GLB pairs + 5 prop digests byte-identical |
| Build | `bun run build` | Exit 0 (pre-existing >500 kB chunk advisory) |
| Visual | Playwright, real app | 70 captures; console 0 errors / 0 warnings at every viewport |

## Media

![Fernstag on the ranch](https://github.com/user-attachments/assets/6c6a8888-1e72-4129-aa53-e7e0b5217771)
![Frond Lasher evolution reveal](https://github.com/user-attachments/assets/0a0d2125-2d7b-413c-95fd-91cfa8d274db)
![Cindermoor in spar](https://github.com/user-attachments/assets/c95432b7-3b0a-4cfa-b224-5d64fef17d4d)
![Reefclaw on the ranch at phone width](https://github.com/user-attachments/assets/fb40f96c-fee0-4784-93d0-35fa1e347619)

## Review

- **Verdict:** PASS (round 3)
- **Rounds:** 3
- **Fixed:** 8 findings (2 Medium, 6 Low) — all resolved at root cause under `review.strict: true`
- **Accepted-deferred:** 0

Round 1 surfaced six findings, all fixed in Phase R1. Round 2 surfaced two more in that fix delta, both fixed in Phase R2. Round 3 cleared with no new findings.

## Deviations and risks

- `branch-catalog.ts` was split out of `branches.ts` when the latter crossed the 12 KB cap.
- `bosses.ts` needed **no change**: an exhaustive search over every legal kit and both tactics showed all six shipped loadouts already satisfy every probe invariant. The gatekeeper reach guard (`cup/gatekeeper-reach.test.ts`) is the new structural protection.
- Champion branch signatures may be their own species' kit rows — a user decision taken during Phase 1 after the original invariant proved unsatisfiable for all three new lines. The boss invariant was re-scoped to its spirit and pinned with six data-driven exemptions.
- Branch variants need no GLBs: accent hue is applied at the client material layer, mirroring the six existing species.
- Two guard-strictness limitations are recorded in `review.md` as notes, not findings: the handbook guard would not catch a paraphrase of the removed element claim, and the determinism-gate guard would not catch a `break` substituted for `continue`. Both fail closed on the shipped code shape.

## Follow-ups

None. `review.issues.enabled` is false and no findings remain outstanding.

## Rollback

Pure content and presentation change. Reverting the merge restores the six-species roster; saves stay at v25 either way, and any catch-up eggs granted in the interim remain valid queue entries.
