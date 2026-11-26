## Summary

Adds four named, rigged feather parts to the falcon voxel silhouette ΓÇö `wingFeatherLeft`, `wingFeatherRight`, `tailFeatherLeft`, `tailFeatherRight` ΓÇö present in baby, juvenile and champion stages. Wing blades and the tail fan are sharpened for speedster readability while every existing contract (style slots, DNA bounds, template identity, palette hue, gilded weight, budget ranges, stage signatures, non-falcon archetypes, prop digests) stays frozen. The six falcon GLB/manifest artifacts are regenerated through the canonical exporter and re-proven byte-identical.

## Track

- **ID:** `20261126-falcon-silhouette-polish`
- **Type:** feature ΓÇö low priority
- **Spec:** [spec.md](conductor/archive/20261126-falcon-silhouette-polish/spec.md)
- **Plan:** [plan.md](conductor/archive/20261126-falcon-silhouette-polish/plan.md)
- **Review:** [review.md](conductor/archive/20261126-falcon-silhouette-polish/review.md)

## What happened

| Phase | Checkpoint | Result |
|-------|------------|--------|
| 1 ΓÇö Feather contract and generator polish | `c81ab889` | TDD red then green for the four-feather rig contract; generator polish; six artifacts regenerated via `export-artifact.ts` to unblock determinism. |
| 2 ΓÇö Artifact regeneration and deterministic gate | `d2284f07` | Exporter re-runs produce no working-tree delta; `gate:determinism` byte-identical for all archetype stage pairs and 5 props. |
| 3 ΓÇö Visual evidence and integrated gate | `c25bd1cf` | Desktop 1440├ù900 and forced iPhone 15 393├ù852 ranch/arena captures with clean warm-reload consoles; full gate green. |
| R1 ΓÇö Review fixes | `845a7654` | Worst-case template-max proportions added to the 108-case style sweep with genuine red/green; delta re-review `PASS`. |

## Requirements

- [x] FR-1 ΓÇö four named, rigged, voxel-claiming feather parts in every stage
- [x] FR-2 ΓÇö wing/tail silhouette sharpened inside unchanged style slots and DNA params
- [x] FR-3 ΓÇö biped contract and additive juvenile/champion signatures intact
- [x] FR-4 ΓÇö template identity, DNA bounds, hue 165, gilded weight 32, budgets, non-falcon archetypes, prop digests frozen
- [x] FR-5 ΓÇö six artifacts regenerated canonically and byte-identical
- [x] FR-6 ΓÇö style/proportion/stage/reach sweep bounded and finite
- [x] FR-7 ΓÇö real-UI desktop and phone ranch/arena captures
- [x] NFR-1 ΓÇö no dependency/save/sim/balance/audio change
- [x] NFR-2 ΓÇö voxel 24 KB module cap green
- [x] NFR-3 ΓÇö full configured stack green
- [x] NFR-4 ΓÇö seed 42, generatorVersion 2 and dnaHash unchanged across manifests
- [x] NFR-5 ΓÇö no cross-species or prop drift
- [x] AC-1 ΓÇö feather contract and counts in all stages
- [x] AC-2 ΓÇö bounded style sweep including template-max proportions with champion extremes
- [x] AC-3 ΓÇö additive signatures, frozen surfaces byte-unchanged
- [x] AC-4 ΓÇö canonical regeneration and determinism gate
- [x] AC-5 ΓÇö boundary, fuzz, proportion-budget and module-size gates
- [x] AC-6 ΓÇö desktop/phone captures with clean consoles
- [x] AC-7 ΓÇö full gate green, no dependency/save/voxel-outside-falcon/audio diff

## Verification

| Check | Result |
|-------|--------|
| `bun test --check --parallel=4 --timeout 120000 packages/voxel/src/falcon.test.ts packages/voxel/src/stage.test.ts packages/voxel/src/proportion.test.ts` | pass ΓÇö 35/0 initially, 37/0 after R1 with 9316 expect() calls |
| `bun run gate:determinism` | pass ΓÇö all archetype stage pairs and 5 props byte-identical |
| `bun run verify && bun run build` | pass ΓÇö typecheck 4 workspaces, 4585 pass / 1 skip / 0 fail, Biome 1060 files clean, Vite build with only the pre-existing chunk advisory |
| `playwright-cli` desktop + iPhone | pass ΓÇö 2 messages, 0 errors, 0 warnings after warm reload |

## Media

- Ranch champion: `.conductor/media/20261126-falcon-silhouette-polish/ranch-champion.png`
- Ranch baby: `.conductor/media/20261126-falcon-silhouette-polish/ranch-baby.png`
- Arena champion: `.conductor/media/20261126-falcon-silhouette-polish/arena-champion.png`

## Review

- **Verdict:** `PASS` (2 rounds)
- **Findings:** 1 Low (F1) in round 1, fixed and confirmed in delta re-review; 0 deferred.
- **Evidence:** `conductor/archive/20261126-falcon-silhouette-polish/review.md`

## Deviations and risks

- Phase 1 regenerated the six falcon GLB/manifest pairs through the canonical exporter to satisfy the determinism gate; Phase 2 proved the re-runs are byte-identical with no working-tree delta.
- Several shell commands were denied for phase subagents (Biome writes, exporter, determinism gate); the primary ran them and recorded the resolutions in phase evidence.
- One unrelated `stage.test.ts` proportion-budget timeout occurred twice in phase-scoped runs; clean retries passed and the full gate remained green.
- Cold Vite startup produced transient `ERR_NETWORK_CHANGED` console errors; warm reloads gave clean consoles. Real-sim `setArenaCamera` persisted via `saveGame` and DOM `.click()` were used where overlays intercepted pointer input; no hand-crafted save JSON.

## Follow-ups

None.

## Rollback

```bash
git revert --no-edit -m 1 <merge-commit>
git revert --no-edit c81ab889 d2284f07 c25bd1cf 845a7654
```

![ranch-champion](https://github.com/user-attachments/assets/ac1dc923-4851-4a45-94b8-30e59ee939d9)

![ranch-baby](https://github.com/user-attachments/assets/3a9204c1-f3f9-4d19-8274-3bc74fadd5e1)

![arena-champion](https://github.com/user-attachments/assets/28f47c7a-6cd4-4c37-966d-e577bd9f7a82)
