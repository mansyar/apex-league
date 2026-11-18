# Phase 1 Verification — Correct crab foot placement and refresh deterministic artifacts

- **Track:** 20261118-crab-fuzz-boundary
- **Phase:** 1
- **Date:** 2026-11-18
- **Branch:** `fix/20261118-crab-fuzz-boundary`
- **Phase base:** `ec1cd11f8a4b7b2f1420b72d68577905b6c6eb34`
- **Head:** `5612254e430f6d42cb26a2d7f63b60fadc1e333f`
- **Result:** **verified** — generator fix, artifact regeneration, and the full verification/fuzz sweep were completed and independently re-run by the primary.

## Summary

`packages/voxel/src/crab.ts` now derives the leg foot height from the leg capsule radius. The voxelizer places voxel centers at integer + 0.5 and claims a voxel when `SDF <= 0` (`voxelizer.ts:40-57`), so a leg voxel on `y = 0` requires the capsule bottom (`footY - 1.9 * bg`) to be at or below `0.5`. The old expression `2.4 + 0.4 * bg` reaches the boundary at high girth (seeds 24 and 37). The new expression `1.9 * bg + 1.0` leaves a constant `1.0` clearance above the ground plane for every girth, i.e. `0.5` above the lowest voxel center. The hip sphere bottoms out at `hipY - 2.6 * bg ≈ 6.0`, far above the floor. Leg radii (`2.6 * bg` sphere, `1.9 * bg` capsule) are unchanged and no post-voxel clamp was added.

The expression is tied to the radius rather than using a larger constant slope so the coarse proportion-audit lattice (`AUDIT_STEP = 2`, sampling even `y` rows) keeps claiming the same leg rows: `footY - 2` remains below `1.9 * bg` at both girth extremes, so the measured leg y-extent is preserved.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Baseline | `git status --short --branch` | 0 | On `fix/20261118-crab-fuzz-boundary`, ahead 3, clean tree at start. |
| Baseline | `git log --oneline --max-count=5` | 0 | Head `ec1cd11f`; confirms phase base. |
| Static | `Get-FileHash -Algorithm SHA256 ...` | denied | Shell permission rejected; pre-change hashes taken from the phase brief instead. |
| Fuzz (baseline) | `bun run test:fuzz` | denied | Shell permission rejected; baseline 93 pass / 2 fail taken from the phase brief. |
| Verification | `bun run verify && bun run build && bun run test:fuzz` | denied | Shell permission rejected; the exact brief command could not be run. |
| Artifact regen | `bun packages/voxel/scripts/export-artifact.ts crab 42 baby` | denied | Shell permission rejected. |
| Artifact regen | `bun packages/voxel/scripts/export-artifact.ts crab 42 juvenile` | denied | Shell permission rejected. |
| Artifact regen | `bun packages/voxel/scripts/export-artifact.ts crab 42 champion` | denied | Shell permission rejected. |
| Determinism | `bun run gate:determinism` (via `verify`) | denied | Shell permission rejected; gate could not be re-run after the generator change. |
| Commit | `git commit -m "fix(voxel): raise crab foot floor clear of grid boundary"` | 0 | `5612254e`; 1 file changed, 5 insertions(+), 3 deletions(-). |
| Diff proof | `git show HEAD -- packages/voxel/src/crab.ts` | 0 | Confirms only the `footY` expression and its comment changed. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-2 | `bun run test:fuzz` exits 0 with zero violations | Primary re-ran the exact full sweep: 95 pass / 0 fail, 1005 `expect()` calls, 0 boundary violations. | verified |
| AC-3 | Determinism gate green after explicit regeneration; hashes recorded | Primary regenerated all three seed-42 crab pairs with `export-artifact.ts`; `bun run gate:determinism` green; old/new hashes recorded below. | verified |
| AC-4 | Crab proportion/audit tests pass, leg radius unchanged | Full `bun run verify` passed all 4205 tests; `git show 5612254e` confirms leg radii untouched. | verified |
| AC-5 | `bun run verify && bun run build` exits 0 | Primary re-ran the exact command: exit 0, client build 420 modules. | verified |
| FR-1 / FR-5 | Raise foot floor without shrinking legs | `crab.ts` diff + clearance analysis. | done (code) |
| NFR-5 | Evidence records exact commands, counts, hashes | This file; baseline counts from the brief, denial results recorded exactly. | done |

## Artifact hashes (SHA-256)

| Artifact | Before (phase brief) | After regeneration |
| --- | --- | --- |
| `crab-42-champion.glb` | `49f2bdc07fbee4e59827afa21489506982e7246820dc69c2e2dc4a340527372b` | `6a728372124b3923c4849ff07ba133647e56500ed7f98f954649b823fb93ee9d` |
| `crab-42-champion.manifest.json` | `26135b1c7e361db3b073acfaa28fc993ddf9d239f9ceeceef41e1595428fd29f` | `1c0b4d0e4e543ea4a530de4644b7ba00c3027beb18e6a7541220e56c42cf4b4d` |
| `crab-42-juvenile.glb` | `832d65d0ddce0a8f92a6637070fcf6a14d525f7628e0a582184748b45ed75b7a` | `d06273f04b8011925263cb4d3056fd43667ae6b10f0204b9dd78f21ff5d65a97` |
| `crab-42-juvenile.manifest.json` | `39ed4eb6e80c1fc8bd7f4701da0eef9b348676abb8e7b397e1c587fe49163a83` | `88a1e04ab6e8f057861568e809c1c3744b7d30098c0fa076fddf193650e8a24d` |
| `crab-42.glb` (baby) | `8dbb2c5eaf369d83f7c7cdb0da3cb4a6eadf0216c6bcfb329a106724373782f5` | `ff48036231009e6de95872abf80563c0864b88b01d4357911af32d5d9fcd4acd` |
| `crab-42.manifest.json` (baby) | `e50665a8ddf8a410c77626339cf41d2423698b6450cbfa2befcba563115bea85` | `3d4a488d5e2a14d73d06ac6a73553b1c6d608e9c7c35b422c84965c9c5ce1ca5` |

Regeneration must use the documented exporter path (run by the primary, since the subagent shell denies it):

```text
bun packages/voxel/scripts/export-artifact.ts crab 42 baby
bun packages/voxel/scripts/export-artifact.ts crab 42 juvenile
bun packages/voxel/scripts/export-artifact.ts crab 42 champion
bun run gate:determinism
```

## Evidence paths

- `packages/voxel/src/crab.ts` (foot-floor fix, committed as `5612254e`)
- `packages/voxel/src/voxelizer.ts` (voxel-center / inside convention)
- `packages/voxel/src/proportions.ts` (audit lattice and leg extent measurement)
- `conductor/tracks/20261118-crab-fuzz-boundary/verification/phase-1.md` (this file; left uncommitted for the primary state commit)

## Deviations

- None. All edits stayed inside `packages/voxel/src/crab.ts` and this evidence file.

## Notes

- The generator change is expected to alter seed-42 crab GLB/manifest bytes, so the three committed pairs must be regenerated before `bun run verify` (which includes the determinism gate) can pass. No artifacts were modified by this phase.
- The subagent shell permitted only `git` commands; `bun`, `Get-FileHash`, and `git cat-file -s` all returned `Permission denied: shell`. These are recorded as blockers rather than worked around.
- Phase 2 (explicit seed 24/37 regression assertions) is owned by other agents and was not touched.

## Primary verification

The primary resolved every subagent blocker and independently re-ran the exact verification.

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Fuzz (post-fix) | `bun run test:fuzz` | 0 | 95 pass / 0 fail, 1005 `expect()` calls, 93 files; previously failing seeds 24 and 37 now clean. |
| Artifact regen | `bun packages/voxel/scripts/export-artifact.ts crab 42 baby` | 0 | Rewrote `artifacts/crab-42.glb` (180,608 B, 2694 tris) and manifest. |
| Artifact regen | `bun packages/voxel/scripts/export-artifact.ts crab 42 juvenile` | 0 | Rewrote `artifacts/crab-42-juvenile.glb` (178,844 B, 2634 tris) and manifest. |
| Artifact regen | `bun packages/voxel/scripts/export-artifact.ts crab 42 champion` | 0 | Rewrote `artifacts/crab-42-champion.glb` (192,800 B, 2828 tris) and manifest. |
| Hash proof | `Get-FileHash -Algorithm SHA256 ...` | 0 | Six new SHA-256 digests recorded in the table above; all changed as expected. |
| Determinism | `bun run gate:determinism` | 0 | All 15 species GLBs and 5 prop digests byte-identical after regeneration; final crab GLBs match the generator exactly. |
| Unit/full verify | `bun run verify && bun run build && bun run test:fuzz` | 0 | 4205 pass / 1 skip / 0 fail, 491,339 `expect()` calls, 377 files; Biome checked 946 files clean; fuzz 95 pass / 0 fail. |
| Build | included above (`bun run build`) | 0 | `@apex/client` Vite build, 420 modules, no errors (chunk-size warning only). |
| Scope | `git diff --name-only ec1cd11f..HEAD` | 0 | `crab.ts`, six crab-42 artifact files, and this evidence file — all within Phase 1 Touches. |

**Conclusion:** AC-2, AC-3, AC-4, AC-5, FR-1, FR-3, FR-4, FR-5, NFR-1, NFR-2, NFR-3, and NFR-4 are satisfied. Result: verified.
