# Integrated Verification — Voxelize Performance Pass

- Track: `20261125-voxelize-performance-pass`
- Result: **PASS**
- Branch: `chore/20261125-voxelize-performance-pass`
- Track base: `10af88e843af49ce8ae5657093265a0f8fbf2432`
- Final evidence head: `7d7536912dfa668a4e82a256a79d025372bb7a0b` plus this evidence commit
- Date: 2026-11-25

## 1. Scope

The track establishes a deterministic benchmark, measures the untouched pipeline,
profiles the real bottleneck, applies semantics-preserving voxelizer/SDF/mesher
optimizations, proves byte identity, and records the new performance baseline.
No cache, worker, dependency, manifest, generated artifact, anatomy, resolution,
gameplay, schema, API, or deployment change was made.

## 2. Baseline

### Benchmark and gate

| Metric | Untouched baseline |
| --- | ---: |
| Corpus | 21 archetypes × 3 stages, seed 42 |
| Samples | 1 warm-up + 5 samples per case; 315 total |
| Aggregate raw-sample median `voxelize()` | 197.9614999999976 ms |
| Median of case medians | 200.20379999999932 ms |
| Capped voxel gate | 635 pass / 0 fail; 130.7116318 s wall |
| Runtime | Bun 1.4.4 on the same development machine |

### Measured profile

Three samples across all 63 cases measured:

| Stage | Total | Share of pipeline |
| --- | ---: | ---: |
| Generation | 226.1432 ms | 0.070% |
| Voxelize | 54236.0640 ms | 16.805% |
| Mesher including AO | 268269.4181 ms | **83.118%** |
| Pipeline | 322731.6253 ms | 100% |

The profiler recorded 503257599 SDF calls. The scratch profile's hardcoded
`hotspot.stage: "voxelize"` label was superseded by the measured totals: mesher/AO
was the dominant cost, while voxelize/SDF still needed a separate explicit 20%
improvement.

## 3. Frozen characterization

Before optimization, exact outputs were captured for:

- simple and complex voxel grids;
- voxel classes and stable scan order;
- exact SDF sample values;
- mesh arrays and ordered quad headers;
- AO and winding behavior.

Authoritative pre-optimization hashes:

| Payload | SHA-256 |
| --- | --- |
| Simple voxel grid | `05662a0189a75b21251aef3d3b8d83ed25bdb414ef9dc2dde4913d0fbae104c8` |
| Complex voxel grid | `ef7c08752ff8e962a4d8affe2648683831812aa829380c9182c4b97386429287` |
| Mesh output | `5b8277356f9dc13aa50ca817e1fd0cb1d03502abfd94ecc13f78b1bd84465f48` |

The final ordinary no-index comparison against the retained baseline produced no
output and exited 0.

## 4. Techniques

1. **Voxelizer:** emit claimed voxels directly in scan order using one reusable
   sample point, eliminating the owner/class grids and second full-grid scan.
2. **SDF:** replace temporary `Vec3`/object arithmetic in primitives, translation,
   and round-cone calculations with scalar arithmetic that preserves operation
   order and input-read behavior.
3. **Mesher:** share one visible-face scan and masks per axis/slice across parts,
   eliminating repeated full-grid scans while preserving per-part order, AO,
   winding, greedy merging, and diagonal split behavior.
4. **Regression coverage:** add exact characterization pins and guard sampled SDF
   lookup without modifying or weakening existing expectations.

Caches and workers are **N/A**: the measured optimizations reached both targets
without state, startup overhead, or concurrency complexity.

## 5. Final measurements

Two sequential benchmark runs used the fixed corpus and no competing test process.

| Run | Aggregate median | Median case median | Wall |
| --- | ---: | ---: | ---: |
| Final 1 | 141.36119999999937 ms | 140.6245999999992 ms | 60.9783244 s |
| Final 2 | 143.3257999999987 ms | 143.3257999999987 ms | 68.0227191 s |
| Median of final aggregate medians | **142.343499999999 ms** | — | — |

| Metric | Baseline | Final | Reduction | Target | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| Median `voxelize()` | 197.9615 ms | 142.3435 ms | **28.095%** | ≥20% | pass |
| Capped package wall | 130.7116318 s | 103.2200429 s | **21.032%** | ≥15% | pass |

The final capped gate passed 640 tests with 525928 expect() calls. The five added
tests are benchmark/characterization coverage, not a weakened or re-baselined gate.

## 6. Verification

| Layer | Command | Result |
| --- | --- | --- |
| Typecheck | `bun run check` | exit 0; all four workspaces clean |
| Tests + lint + determinism | `bun run verify` | exit 0; 4480 pass / 1 skip / 0 fail; Biome 1044 files; hash `0xff6f3d62` |
| Build | `bun run build` | exit 0; Vite 1.19 s; existing advisory only |
| Determinism | `bun run gate:determinism` | exit 0; all 63 GLBs and five prop digests byte-identical |
| Fuzz | `bun run test:fuzz` | exit 0; 139 pass / 0 fail |
| Telemetry | `bun run telemetry` | exit 0; 14/14 bounds green |
| Balance | `bun run balance` | exit 0; all gates green; cap 370/1680 |
| Focused parity | voxelizer/SDF/mesher focused suites | 57 pass / 0 fail |
| Package gate | `bun test --check --parallel=4 --timeout 120000 packages/voxel` | exit 0; 640 pass / 0 fail |
| Characterization | exact capture + ordinary no-index diff | exit 0; byte-identical |
| Whitespace | `git diff --check <base>..HEAD` | exit 0 |
| Worktree | `git status --porcelain` | clean after evidence commit |

## 7. Scope proof

The out-of-scope command covering `apps`, `packages/sim`, `packages/server`, package
manifests, and lockfiles exited 0. Full-range name-status contains only:

- the benchmark harness/test;
- allowed `packages/voxel/src/{voxelizer,sdf,mesher}.ts` and related tests;
- Conductor roadmap, registry, track artifacts, and `conductor/tech-stack.md`.

No artifact was rewritten. Module-size caps and all existing test pins remain
unchanged. Production emits no timing or debug output.

## 8. Requirements coverage

| ID | Status | Evidence |
| --- | --- | --- |
| FR-1 | satisfied | Fixed 63-case/315-sample benchmark and tests |
| FR-2 | satisfied | §2 untouched baseline and measured profile |
| FR-3 | satisfied | §4 profiling-backed voxelizer/SDF/mesher changes |
| FR-4 | satisfied | §4 explicitly records cache/worker N/A |
| FR-5 | satisfied | §3 exact characterization; §6 artifact/battle-hash identity |
| FR-6 | satisfied | §5 28.095% benchmark and 21.032% gate reduction |
| FR-7 | satisfied | New exact-output pins; existing expectations unchanged |
| FR-8 | satisfied | Dated tech-stack note plus this integrated record |
| NFR-1 | satisfied | §7 no dependency/manifest/lockfile/CI/tooling change |
| NFR-2 | satisfied | Pure deterministic production changes; no I/O/time/randomness |
| NFR-3 | satisfied | Cache/worker N/A |
| NFR-4 | satisfied | §3/§6 all committed artifacts and baselines byte-identical |
| NFR-5 | satisfied | Biome and project TypeScript style pass |
| NFR-6 | satisfied | §6 all configured checks pass |
| NFR-7 | satisfied | §7 module caps/budgets unchanged |
| NFR-8 | satisfied | Benchmark-only timing code; no production debug output |
| NFR-9 | satisfied | Same Bun/machine/corpus/command; repeated runs and wall data |
| AC-1 | satisfied | §2/§5 fixed corpus and repeated samples |
| AC-2 | satisfied | §2 baseline/runtime/profile evidence |
| AC-3 | satisfied | §5 both raw repeated-run targets pass |
| AC-4 | satisfied | §3/§6 byte identity across grids/meshes/artifacts/hash |
| AC-5 | satisfied | §4 N/A decision |
| AC-6 | satisfied | §6 green verification and coverage |
| AC-7 | satisfied | §7 scoped diff and quiet out-of-scope check |
| AC-8 | satisfied | One dated `conductor/tech-stack.md` note |
| AC-9 | satisfied | This committed integrated record |
| AC-10 | satisfied | Clean diff-check and final committed worktree |

## 9. Documentation

`conductor/tech-stack.md` now has one dated 2026-11-25 note recording baseline,
final timings, percentage improvements, techniques, byte identity, cache/worker
N/A, and residual timing-variance risk. Product direction is unchanged.

## 10. Deviations and residual risks

- Subagent shell permission denials were resolved by primary execution of the exact
  commands, with raw outputs retained.
- Biome formatting diagnostics were repaired without semantic changes.
- The scratch profile's hardcoded hotspot label was corrected in evidence by the
  measured 83.118% mesher/AO share.
- Timing remains sensitive to machine load; repeated raw runs and the comfortably
  passing margins are recorded. No requirement or target was moved.

## 11. Outcome

**PASS** — both approved performance targets are exceeded, every configured check
is green, deterministic output is byte-identical, and scope remains surgical.
