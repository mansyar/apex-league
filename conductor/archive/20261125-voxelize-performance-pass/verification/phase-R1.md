# Phase R1 Verification: Review Fixes

- **Track:** `20261125-voxelize-performance-pass`
- **Phase base:** `0cad7f9bca41fba2a84bf90d90cbf5908250e204`
- **Result:** **VERIFIED**

## 1. Findings resolved

| Finding | Resolution | Evidence |
| --- | --- | --- |
| F1 Medium — mutable round-cone endpoints | Recompute endpoint invariants per sample; regression mutates across the fallback boundary and compares with a fresh SDF | `d9447f13`; `review-fix/f1-mutable-endpoint-red.txt`; focused SDF/pipeline tests |
| F2 Medium — comparable load context | Sample-level paired benchmark plus alternating package-gate pairs; all contaminated attempts retained and excluded | `review-fix/paired-inprocess.txt`; `review-fix/robust/` |
| F3 Low — invalid Phase 2 SHA | Corrected `e95a1552` to `e85a1552` | `plan.md` |
| F4 Low — test-count wording | Seven benchmark tests existed in both runs; net six additions are five characterization tests plus the mutable-endpoint regression | `phase-3.md`; `integrated.md` |

## 2. Additional measured optimization

`2b447092` caches the two smooth-union child distances within a single sample,
preserving the scalar arithmetic and exact output while avoiding duplicate SDF
evaluation. A temporary compiled-part voxelizer variant was reverted because it
cached mutable `PartField` references; the shipped voxelizer keeps the earlier
mutation-preserving direct-emission loop.

## 3. Authoritative performance proof

### Sample-level paired benchmark

Command:
`bun .conductor/evidence/20261125-voxelize-performance-pass/review-fix/paired-inprocess.ts`

The harness imports untouched baseline and final pipelines in one process, warms
all 63 cases once, then alternates baseline/final order for every measured sample.

| Metric | Result |
| --- | --- |
| Corpus | 21 archetypes × 3 stages, seed 42, 315 samples per side |
| Identity | all 63 voxel-grid digests match |
| Baseline aggregate median | 181.060199999993 ms |
| Final aggregate median | 137.269 ms |
| Reduction | **24.1859889694114%** (target ≥20%) |
| Median per-case reduction | **21.4372304727509%** |

Raw: `.conductor/evidence/20261125-voxelize-performance-pass/review-fix/paired-inprocess.txt`.

### Capped package gate

Exact command:
`bun test --check --parallel=4 --timeout 120000 packages/voxel`.

| Pair | Baseline wall | Final wall | Reduction |
| --- | ---: | ---: | ---: |
| 1 | 227.633229 s | 130.6743062 s | 42.594% |
| 2 | 102.105668 s | 110.5281683 s | -8.249% |
| Median paired reduction | — | — | **17.1727773682674%** |

Target: ≥15%. Both pairs passed (635 baseline, 641 final). CPU/process context and
the negative pair are retained under `review-fix/robust/`; no external user process
was terminated.

## 4. Correctness and configured checks

| Command | Result |
| --- | --- |
| Focused SDF tests | 17 pass / 0 fail |
| Focused pipeline tests | 58 pass / 0 fail / 2151 expect() |
| Exact characterization capture + ordinary no-index diff | exit 0; byte-identical |
| Biome on changed SDF/voxelizer files | exit 0; clean |
| `bun run verify` | exit 0; 4481 pass / 1 skip / 0 fail; 670890 expect(); Biome 1044 files clean; determinism OK; hash `0xff6f3d62` |
| `bun test --timeout 120000` (serial) | exit 0; 4481 pass / 1 skip / 0 fail; 670890 expect(); 4482 tests / 439 files; 534.88 s |
| `bun run build` | exit 0 |
| `bun run gate:determinism` | exit 0; corpus GLBs and prop digests byte-identical |
| `bun run test:fuzz` | exit 0; 139 pass / 0 fail; 129015 expect() |
| `bun run telemetry` | exit 0; all 14 bounds green |
| `bun run balance` | exit 0; all displayed balance gates green |
| `git diff --check <base>..HEAD` | exit 0 |
| `git diff --check` (worktree) | exit 0 |
| `git status --porcelain` | only intended R1 evidence/doc files before commit |
| Frozen artifact/scope diff | exit 0 |

## 5. Acceptance mapping

- FR-7 / NFR-2: mutable-endpoint regression restored and covered.
- NFR-9 / AC-3: paired load-controlled measurements exceed both frozen targets.
- AC-4: exact 63-case voxel identity and prior mesh/artifact identity remain green.
- AC-6: focused tests and all configured checks passed on the final R1 code.
- AC-9 / AC-10: evidence wording and traceability corrected; final diff/status clean.
