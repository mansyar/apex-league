# Review: Nightly fuzz red: crab boundary

- **Track:** `20261118-crab-fuzz-boundary`
- **Type:** bug (high)
- **Branch:** `fix/20261118-crab-fuzz-boundary`
- **Range:** `b7fcaf47fad9810396b13c3776589448423d4fda..38725b8ac6fbe6fcccf51ecc1027ce03dff1170c`
- **Date:** 2026-11-18
- **Verdict:** PASS (round 1 PASS WITH FINDINGS; round 2 delta PASS after Review Fixes)

## Summary

The crab foot-floor fix is geometrically sound: `footY = 1.9 * bg + 1.0` keeps the
leg capsule bottom 1.0 above `y = 0` while the lowest voxel center is `y = 0.5`,
so no leg voxel can touch the boundary at any girth. Leg radii and the coarse
audit lattice are unchanged. The full fuzz sweep is green (97 pass / 0 fail),
the three seed-42 crab artifact pairs were regenerated through the documented
exporter with old/new hashes recorded, and the determinism gate is byte-identical.
All FR/NFR/AC requirements are functionally covered. Round 1 found two Low
findings around the PR-visible smoke chunk; because `review.strict` is true they
were fixed in Phase R1 rather than deferred. Round 2 delta re-review returned
PASS with no new findings.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| Typecheck | `bun run check` | pass — no type errors (voxel 160, sim 242, server 44, client 528 files) | primary review run |
| Lint/format | `bunx biome check` | pass — 946 files, no fixes applied | primary review run |
| Unit | `bun test --check --parallel --timeout 120000` | pass — 4207 pass / 1 skip / 0 fail, 491,341 `expect()` calls | primary review run |
| Determinism | `bun run gate:determinism` | pass — 15 species GLBs + 5 prop digests byte-identical, hash `0xff6f3d62` | primary review run |
| Build | `bun run build` | pass — Vite 420 modules, chunk-size warning only | primary review run |
| Full fuzz | `bun run test:fuzz` | pass — 97 pass / 0 fail | phase-2.md, integrated.md |
| Phase leg | `bun run verify && bun run build && bun run test:fuzz` | exit 0 | phase-2.md |
| Visual | not applicable — no user-facing change | — | — |

Note: the config literal `bun test --timeout 120000` was killed by a 300 s shell
timeout in this environment; the verify-leg equivalent above passed in ~75 s.
This is an environment observation, not a diff finding. The expected
`smoke: RESULT fail ... file:///tmp/x` diagnostic is pre-existing and non-gating.

## Requirements

| ID | Status | Evidence |
| --- | --- | --- |
| FR-1 | covered | `crab.ts` footY floor; full fuzz green |
| FR-2 | covered | named seed-24/37 regression tests; pre-fix `Received: 4` baseline |
| FR-3 | covered | `test:fuzz` 97 pass / 0 fail |
| FR-4 | covered | six regenerated seed-42 artifacts; old/new hashes in phase-1.md |
| FR-5 | covered | radii and `AUDIT_STEP` unchanged; proportion/audit tests green |
| FR-6 | covered | diff confined to approved paths |
| NFR-1 | covered | gate byte-identical after explicit regeneration |
| NFR-2 | covered | voxel module-size guard in `bun run verify` |
| NFR-3 | covered | no sim/save/SIM_VERSION/dependency change; hash `0xff6f3d62` |
| NFR-4 | covered | R1 restored the original three-seed PR slice in both shards; `APEX_FUZZ_SWEEP=full` remains exclusive to `test:fuzz` |
| NFR-5 | covered | commands, counts, and hashes in all three evidence reports |
| AC-1 | covered | pre-fix failure baseline + passing named regressions |
| AC-2 | covered | full sweep 97 pass / 0 fail |
| AC-3 | covered | gate green after regeneration; hashes recorded |
| AC-4 | covered | proportion/audit tests pass with radius unchanged |
| AC-5 | covered | combined gate exit 0 |
| AC-6 | covered | scope check shows only approved paths |

## Findings

### Critical

None.

### High

None.

### Medium

None.

### Low

- **F1** — `packages/voxel/src/fuzz/boundary.crab.20-29.test.ts:15`
  - **What:** `SMOKE_CHUNK` changes the PR-visible seed list from `[20,21,22]` to `SMOKE_CHUNK = [20,21,22,24]`, adding a fourth seed.
  - **Why:** literally conflicts with spec Out of Scope ("Expanding the PR fuzz smoke slice") and NFR-4 ("PR fuzz smoke slice remains unchanged"). The named always-on seed-24 regression test already provides PR-gate visibility, so the extra seed is redundant.
  - **Fix:** restore `const CHUNK = process.env.APEX_FUZZ_SWEEP === "full" ? FULL_CHUNK : FULL_CHUNK.slice(0, 3)`, drop `SMOKE_CHUNK`, and keep the named seed-24 regression test.
  - **Requirement:** NFR-4
  - **Test gap:** none.

- **F2** — `packages/voxel/src/fuzz/boundary.crab.30-39.test.ts:15`
  - **What:** `SMOKE_CHUNK` changes the PR-visible seed list from `[30,31,32]` to `SMOKE_CHUNK = [30,31,32,37]`, adding a fourth seed.
  - **Why:** same literal conflict with NFR-4 and the spec Out of Scope; the named seed-37 regression test already provides gate visibility.
  - **Fix:** restore the three-seed slice, drop `SMOKE_CHUNK`, and keep the named seed-37 regression test.
  - **Requirement:** NFR-4
  - **Test gap:** none.

### Resolution (round 2)

Phase R1 removed `SMOKE_CHUNK` from both shards and restored the original
`FULL_CHUNK.slice(0, 3)` PR smoke slice (checkpoint `12264d57`). The always-on
named seed-24 / seed-37 regressions were left byte-identical, so gate visibility
is preserved. The primary re-ran the exact verification command (4207 pass /
1 skip / 0 fail; fuzz 97 pass / 0 fail) and the delta re-review returned PASS
for both findings with no new in-scope findings.

## Overrides

None. Both Low findings were fixed in Phase R1; no deferral was needed.

## Plan compliance

Phase 1 (`d2c9f679`), Phase 2 (`8de7d999`), and Phase R1 (`12264d57`) are all
marked verified with evidence; all P1/P2/R1 task boxes are checked. The final
9-file / 53+/13- non-Conductor diff matches the union of phase Touches. No task
was dropped. No sim, save, UI, or dependency change is present.

## Out of scope

Generated binary GLBs were reviewed only through their source, manifests,
exporter commands, recorded hashes, and gate proof. Conductor prose/state and
the pre-existing smoke diagnostic were excluded as code findings.

## Debt

None. No issue creation is needed; `review.issues.enabled` is false and all
findings are local and fixable.

## Doc sync

`updated` — pre-review sync applied the `conductor/tech-stack.md` dated note;
the post-review sync records round-2 PASS and sets metadata `doc_sync: updated`.
No product or guideline change was needed for this bug fix.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 2 | 0 |
| 2 (delta) | PASS | 0 | 0 | 0 | 0 | 2 |
