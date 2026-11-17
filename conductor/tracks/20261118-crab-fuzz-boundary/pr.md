## Summary

Fixes the crab voxel-boundary defect that had kept the nightly fuzz sweep red for
at least 20 consecutive runs. The crab leg foot floor is now tied to the leg
capsule radius, so no leg voxel can touch the grid boundary at any girth; seeds
24 and 37 are locked in as always-on regressions, and the three seed-42 crab
artifact pairs are regenerated with recorded hashes.

## Track

- **ID:** `20261118-crab-fuzz-boundary`
- **Type:** bug (high)
- **Spec:** [`conductor/archive/20261118-crab-fuzz-boundary/spec.md`](conductor/archive/20261118-crab-fuzz-boundary/spec.md)
- **Plan:** [`conductor/archive/20261118-crab-fuzz-boundary/plan.md`](conductor/archive/20261118-crab-fuzz-boundary/plan.md)
- **Review:** [`conductor/archive/20261118-crab-fuzz-boundary/review.md`](conductor/archive/20261118-crab-fuzz-boundary/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Correct crab foot placement and refresh deterministic artifacts | Raise the crab foot floor and regenerate seed-42 fixtures | verified | `d2c9f679` | `footY = 1.9 * bg + 1.0`; six crab-42 GLB/manifest pairs regenerated with old/new hashes recorded |
| 2: Gate-visible regression coverage and scope proof | Make seeds 24 and 37 gate-visible while keeping full-sweep coverage | verified | `8de7d999` | Named always-on regressions added; one Biome format rework; full sweep 97 pass / 0 fail |
| R1: Review Fixes | Resolve NFR-4 findings F1/F2 | verified | `12264d57` | Restored the original three-seed PR smoke slice in both shards; named regressions unchanged |

## Requirements

- [x] `FR-1` — no crab voxel touches the grid boundary (`packages/voxel/src/crab.ts`)
- [x] `FR-2` — regression coverage for seeds 24 and 37 (`packages/voxel/src/fuzz/boundary.crab.20-29.test.ts`, `boundary.crab.30-39.test.ts`)
- [x] `FR-3` — full fuzz sweep green
- [x] `FR-4` — seed-42 crab artifacts regenerated; old/new hashes in evidence
- [x] `FR-5` — leg radii and audit contracts preserved
- [x] `FR-6` — changes confined to approved paths
- [x] `NFR-1` — determinism gate byte-identical after regeneration
- [x] `NFR-2` — voxel module cap satisfied
- [x] `NFR-3` — no sim/save/SIM_VERSION/dependency change
- [x] `NFR-4` — PR smoke slice unchanged; full sweep exclusive to `test:fuzz`
- [x] `NFR-5` — commands, counts, and hashes recorded in evidence
- [x] `AC-1` — regression fails before / passes after the fix
- [x] `AC-2` — `bun run test:fuzz` exits 0 with zero violations
- [x] `AC-3` — determinism gate green after explicit regeneration with hashes
- [x] `AC-4` — proportion/audit tests pass with radius unchanged
- [x] `AC-5` — `bun run verify && bun run build` exits 0
- [x] `AC-6` — scope check shows only approved paths

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| typecheck | `bun run check` | pass — no type errors | `conductor/archive/20261118-crab-fuzz-boundary/verification/integrated.md` |
| lint/format | `bunx biome check` | pass — 946 files, no fixes applied | same |
| unit | `bun test --check --parallel --timeout 120000` | pass — 4207 pass / 1 skip / 0 fail, 491,341 `expect()` calls | same |
| determinism | `bun run gate:determinism` | pass — 15 species GLBs + 5 prop digests byte-identical, hash `0xff6f3d62` | same |
| build | `bun run build` | pass — Vite 420 modules | same |
| full fuzz | `bun run test:fuzz` | pass — 97 pass / 0 fail, all shards | same |
| combined | `bun run verify && bun run build && bun run test:fuzz` | exit 0 | `phase-R1.md`, `integrated.md` |

Visual layer is not applicable: this is a generator/test fix with no user-facing
surface change.

## Review

- **Verdict:** `PASS`
- **Rounds:** 2 (round 1 `PASS WITH FINDINGS`; round 2 delta `PASS`)
- **Fixed:** 2 Medium-equivalent strict-mode findings (F1/F2, both Low severity)
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- Subagents had shell permissions denied for `bun`, `Get-FileHash`, and
  `git cat-file`; the primary ran every denied command and recorded the exact
  outputs in phase evidence.
- Phase 2 needed one Biome formatting rework (single-line Biome-clean form in
  the two shards); the exact gate was re-run green afterwards.
- Regenerating the seed-42 crab GLB/manifest pairs legitimately changed their
  bytes (baby 180,608 B, juvenile 178,844 B, champion 192,800 B). Old/new
  SHA-256 hashes are in `verification/phase-1.md`; the determinism gate compares
  the regenerated artifacts byte-for-byte without loosening.
- The PR smoke slice was briefly expanded to four seeds in Phase 2; round-1
  review flagged this against NFR-4 and R1 restored the original three-seed
  slice while keeping the named seed-24/37 regressions gate-visible.
- The expected non-gating diagnostic `smoke: RESULT fail ... not an http(s) URL:
  file:///tmp/x` in `scripts/smoke/smoke.test.ts` is pre-existing and unchanged.

## Follow-ups

- None. The nightly workflow should return green once this change lands on
  `main`; the owner may confirm the next scheduled run.

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commit
git revert --no-edit <squash-commit>
```

No migration, feature flag, or data rollback is required. Reverting would
restore the four boundary violations at seeds 24 and 37 and turn nightly red
again.
