# Phase 1 verification — Falcon silhouette polish

- Track: `20261126-falcon-silhouette-polish`
- Phase: 1 — `Feather contract and generator polish`
- Date: 2026-11-26
- Branch: `feat/20261126-falcon-silhouette-polish`
- Base: `b5359b0bcffeea75cbc214636b1b368f73049e9f`
- Head: `44db9927baa3a7b52894008744b3d198f7df7eed`
- Result: **pass** for all phase-1 checks (TDD red captured, implementation green).
  One optional formatting command was denied by the sandbox and is recorded below.

## Commands

| # | Command | When | Exit code | Result |
|---|---------|------|-----------|--------|
| 1 | `bun test --check --parallel=4 --timeout 120000 packages/voxel/src/falcon.test.ts packages/voxel/src/stage.test.ts packages/voxel/src/proportion.test.ts` | first TDD attempt, before test typing fix | 1 | `TS2769` at `falcon.test.ts:262` (`build.parents[part]` possibly `undefined`); fixed in the test helper before the true red |
| 2 | same command | **TDD red**, test-only commit `08312ad7` | 1 | 32 pass, 3 fail, 8838 `expect()` calls, 35 tests, 54.47s — exact output below |
| 3 | same command | after implementation, intermediate geometry | 1 | one pre-existing assertion failed (`wingLeft` voxels 27 → 35 → 40, required `>40`); geometry tuned with blade length/root volume restored |
| 4 | same command | **final green** after all code and formatting edits | 0 | 35 pass, 0 fail, 9314 `expect()` calls, 35 tests, 58.26s |
| 5 | `bun run check` | after implementation | 0 | `@apex/voxel`, `@apex/sim`, `@apex/client`, `@apex/server`: no type errors (214/253/560/185 files) |
| 6 | `bun test --check --parallel=4 --timeout 120000 apps/client/src/module-size.test.ts packages/voxel/src/module-size.test.ts` | after implementation | 0 | 10 pass, 0 fail, 30 `expect()` calls, 2.49s |
| 7 | `bunx biome check packages/voxel/src/falcon.ts packages/voxel/src/falcon.test.ts` | formatting sanity check | N/A | **Permission denied** (`permission.rejected` for shell). Not retried. Lines were wrapped manually to the 80-column Biome style; the primary's `bun run verify` re-runs Biome. |

### Exact TDD red output (command #2)

```
bun test v1.4.4 (38afee6c8) 4x PARALLEL

packages\voxel\src\falcon.test.ts:
253 |   test("four named feathers are rigged base parts in every stage", () => {
254 |     for (const stage of STAGES) {
255 |       const build = generate("falcon", 42, stage).build
256 |       for (const part of FEATHER_PARTS) {
257 |         // Stable name: exactly one field with that name, in every stage.
258 |         expect(build.fields.filter((f) => f.name === part).length).toBe(1)
                                                                         ^
error: expect(received).toBe(expected)

Expected: 1
Received: 0

      at <anonymous> (D:\Projects\battle-pets\packages\voxel\src\falcon.test.ts:258:68)
288 |       generate("falcon", 42, stage).build.fields.map((f) => f.name)
289 |     const baby = namesOf("baby")
290 |     const juv = namesOf("juvenile")
291 |     const champ = namesOf("champion")
292 |     for (const part of FEATHER_PARTS) {
293 |       expect(baby).toContain(part)
                         ^
error: expect(received).toContain(expected)

Expected to contain: "wingFeatherLeft"
Received: [
  "body", "neck", "head", "beak", "wingLeft", "wingRight", "legFL", "legFR", "tail", "tailTip", "eyeLeft",
  "eyeRight"
]

      at <anonymous> (D:\Projects\battle-pets\packages\voxel\src\falcon.test.ts:293:20)
385 |       "legFR",
386 |     ])
387 |     expect(names.filter((n) => n === "wingLeft" || n === "wingRight")).toEqual(
388 |       ["wingLeft", "wingRight"],
389 |     )
390 |     expect(names.filter((n) => n.startsWith("wing")).sort()).toEqual(
                                                                   ^
error: expect(received).toEqual(expected)

@@ -1,4 +1,2 @@
  [
-   "wingFeatherLeft",
-   "wingFeatherRight",
    "wingLeft",

- Expected  - 2
+ Received  + 0

      at <anonymous> (D:\Projects\battle-pets\packages\voxel\src\falcon.test.ts:390:62)
(fail) falcon feather silhouette contract > four named feathers are rigged base parts in every stage [8.79ms]
(fail) falcon feather silhouette contract > feathers are base silhouette, never stage signatures [2.98ms]
(fail) falcon feather silhouette contract > biped, template, DNA and budget contracts stay frozen [6.60ms]

 32 pass
 3 fail
 8838 expect() calls
Ran 35 tests across 3 files. [54.47s]

Exit code: 1
```

### Final green output (command #4)

```
bun test v1.4.4 (38afee6c8) 4x PARALLEL

 35 pass
 0 fail
 9314 expect() calls
Ran 35 tests across 3 files. [58.26s]
```

## Acceptance criteria

| Criterion | Coverage | Status |
|-----------|----------|--------|
| FR-1 / AC-1 | Four named feather fields present in baby/juvenile/champion with finite pivots/colors, valid parents, non-zero voxels; not stage signatures (mirrored `stage.test.ts` arrays) | pass |
| FR-2 / AC-2 | Wing blades and tail fan reshaped in existing style slots; `wingLeft/Right`, `tail`, `tailTip`, `sweep`, `forkSpread`, `streamerLength` unchanged; no new slots; 3 wing × 3 tail styles × 3 stages × 2 param bounds finite and non-degenerate | pass |
| FR-3 / AC-3 | Exactly two legs and two wings; pinion buds/crown plumes remain head-parented signatures; baby carries no signatures; signature deltas unchanged | pass |
| FR-4 / AC-1 / AC-3 | Template id/version, hue 165, gilded weight 32, DNA bounds and four budget ranges pinned in tests; no edits to `budgets.ts`, `stage.ts`, face, sim, save, balance or audio | pass |
| FR-6 / AC-5 | No NaN/Infinity in pivots/colors/SDF samples; no voxel at grid coordinate 0 or 55; total voxels >900; module-size tests pass | pass |
| NFR-2 | `packages/voxel/src/module-size.test.ts` green; `falcon.ts` only +44/-6 source lines | pass |
| FR-5 / AC-4 / AC-7 / NFR-3..5 | Phase 2/primary-owned (artifact regeneration, full verify/build) | not in scope |

## Evidence paths

- `packages/voxel/src/falcon.ts` — four feather fields, sharpened blade/fan, pivots/colors/parents
- `packages/voxel/src/falcon.test.ts` — pinned feather contract, style matrix, frozen template/biped/DNA/budget assertions
- Commits: `08312ad7` (test-only red), `44db9927` (implementation + formatting)

## Deviations

- None in scope. The two new test helpers wrap long expressions manually because the Biome command was denied; no behaviours were changed.

## Notes

- Geometry choices follow `conductor/learnings.md` entry 16: four assertive outer-primary/side-tail cells rather than micro-detail. Wing primaries trail beyond the blade tip; tail feathers sit outside the fan's x extent, so both claim their own voxels under first-wins paint order.
- Color/RNG order untouched: no `rng.next()` call was added; feathers reuse the already-drawn `spark` color.
- The intermediate wing-voxel failures were caused by new feathers overlapping the blade tip and by the exposed blade length; resolved by moving feathers outward/back and restoring blade reach with the sharper tip radius retained.
- `bun run verify && bun run build` and Biome remain for the primary; this report does not claim they pass.

## Rework 1

- Date: 2026-11-26
- Head after rework: `82ea9c7dcb765e86ae6e01fb0b5dabfc592977e2`
- Commit: `82ea9c7d` — `style(voxel): format falcon feather contract tests`

### Primary-reported Biome failure

The primary independently re-ran the exact phase command (35 pass / 0 fail,
9314 `expect()` calls, exit 0) and
`bunx biome check packages/voxel/src/falcon.ts packages/voxel/src/falcon.test.ts`,
which exited 1 with exactly two errors, both in
`packages/voxel/src/falcon.test.ts`. This agent did not retry a denied
`--write` command; the printed edits were applied by hand.

### Exact edits applied (formatting only, no behaviour change)

1. Top import block: moved `import { sampleDna } from "./sample"` above
   `import type { Dna } from "./schema"`.
2. Parent assertion: replaced the wrapped multi-line condition inside
   `expect(...)` with the single line
   `parent === "wingLeft" || parent === "wingRight" || parent === "tail",`.
3. Style-matrix total: replaced the four-line `grid.parts.reduce(...)` with
   `const total = grid.parts.reduce((n, p) => n + p.voxels.length, 0)` at the
   same indentation.
4. Boundary guard: replaced the eight-line `if (` block with
   `if (x <= 0 || y <= 0 || z <= 0 || x >= r || y >= r || z >= r) {`.
5. Frozen-contract assertions: collapsed the leg assertion to
   `expect(names.filter((n) => n.startsWith("leg"))).toEqual(["legFL", "legFR"])`
   and rewrote the wing assertion in Biome's printed wrapped form with
   `"wingLeft"` and `"wingRight"` on their own indented lines.

Only `packages/voxel/src/falcon.test.ts` changed (8 insertions, 24 deletions).
No other files, no runtime or assertion semantics changed.

### Re-run result

```
bun test --check --parallel=4 --timeout 120000 packages/voxel/src/falcon.test.ts packages/voxel/src/stage.test.ts packages/voxel/src/proportion.test.ts

bun test v1.4.4 (38afee6c8) 4x PARALLEL

 35 pass
 0 fail
 9314 expect() calls
Ran 35 tests across 3 files. [44.23s]
```

Exit code: 0. The full gate and any post-rework Biome re-run remain
primary-owned; this section does not claim they pass. The evidence file stays
uncommitted for the primary.

## Rework 2

- Date: 2026-11-26
- Head after rework: `09e7bdf6f77e0b9d497a16cdf6137e37c0d60a06`
- Commit: `09e7bdf6` — `style(voxel): wrap falcon parent assertion`

### Primary-reported Biome failure

The primary re-ran the exact phase command (35 pass / 0 fail, 9314 `expect()`
calls, exit 0) and scoped
`bunx biome check packages/voxel/src/falcon.ts packages/voxel/src/falcon.test.ts`,
which still exited 1 with exactly one formatter error at
`packages/voxel/src/falcon.test.ts:263`. No `--write` command was attempted by
this agent; the printed edit was applied manually.

### Exact edit applied (formatting only, no behaviour change)

```
-          expect(parent === "wingLeft" || parent === "wingRight" || parent === "tail").toBe(true)
+          expect(
+            parent === "wingLeft" || parent === "wingRight" || parent === "tail",
+          ).toBe(true)
```

Only `packages/voxel/src/falcon.test.ts` changed (3 insertions, 1 deletion);
no other files and no assertion semantics changed.

### Re-run result

```
bun test --check --parallel=4 --timeout 120000 packages/voxel/src/falcon.test.ts packages/voxel/src/stage.test.ts packages/voxel/src/proportion.test.ts

bun test v1.4.4 (38afee6c8) 4x PARALLEL

 35 pass
 0 fail
 9314 expect() calls
Ran 35 tests across 3 files. [43.21s]
```

Exit code: 0. The full gate and any post-rework Biome re-run remain
primary-owned; this section does not claim they pass. The evidence file stays
uncommitted for the primary.

## Gate artifact regeneration (completed by primary)

- Date: 2026-11-26
- Rationale: the primary's mandatory `bun run verify && bun run build` passed
  typecheck, all 4585 tests, Biome and all non-falcon determinism pairs, but
  `gate:determinism` failed with `DETERMINISM GATE FAILED: manifest mismatch
  for falcon baby` because Phase 1 changed `falcon.ts` without regenerating
  the committed falcon artifacts. Byte-identical regeneration through the
  canonical exporter is required before `verify_phase` can go green.

### Required exporter commands (not executed by this agent)

```
bun packages/voxel/scripts/export-artifact.ts falcon 42 baby
bun packages/voxel/scripts/export-artifact.ts falcon 42 juvenile
bun packages/voxel/scripts/export-artifact.ts falcon 42 champion
```

The phase agent's shell was denied (`permission.rejected`), so it did not
retry and left the regeneration to the primary. The primary ran all three
canonical exporter commands successfully:

```
wrote artifacts/falcon-42.glb (115200 bytes, tris 1622) and artifacts/falcon-42.manifest.json
baby_exit=0
wrote artifacts/falcon-42-juvenile.glb (116600 bytes, tris 1614) and artifacts/falcon-42-juvenile.manifest.json
juvenile_exit=0
wrote artifacts/falcon-42-champion.glb (131296 bytes, tris 1818) and artifacts/falcon-42-champion.manifest.json
champion_exit=0
```

### Changed-file list

`git status --porcelain` after regeneration listed exactly the six allowed
artifact files plus the untracked evidence directory:

```
 M artifacts/falcon-42-champion.glb
 M artifacts/falcon-42-champion.manifest.json
 M artifacts/falcon-42-juvenile.glb
 M artifacts/falcon-42-juvenile.manifest.json
 M artifacts/falcon-42.glb
 M artifacts/falcon-42.manifest.json
?? conductor/tracks/20261126-falcon-silhouette-polish/verification/
```

Primary committed the six artifact files as
`chore(voxel): regenerate falcon artifacts for feather silhouette`; no code,
test, other artifact or Conductor state was touched by this gate-enabling
step. Full gate re-run is recorded in `## Primary verification` below.

## Primary verification

- Date: 2026-11-26
- Primary independently re-ran the exact phase command
  `bun test --check --parallel=4 --timeout 120000 packages/voxel/src/falcon.test.ts packages/voxel/src/stage.test.ts packages/voxel/src/proportion.test.ts`
  → `35 pass / 0 fail / 9314 expect()` calls across 3 files, exit 0.
- Primary re-ran `bunx biome check packages/voxel/src/falcon.ts packages/voxel/src/falcon.test.ts`
  → `Checked 2 files in 26ms. No fixes applied.`, exit 0, after the two
  formatting reworks. Final code head before regeneration was `09e7bdf6`.
- Mandatory `verify_phase`: the first run failed only at
  `gate:determinism` (`manifest mismatch for falcon baby`) because committed
  artifacts still reflected the old generator. After canonical regeneration
  by the primary and commit `d8c4ec56`, `(bun run verify && bun run build)`
  → `gate_exit=0`. Typecheck, full unit suite (`4585 pass / 1 skip / 0 fail`
  in the preceding full-suite run), Biome, determinism gate for every
  archetype baby/juvenile/champion GLB and all 5 prop digests, and the Vite
  client build all passed. Build emitted `dist/assets/index-BL310Ok0.js`
  (1,109.86 kB), `index-D45x_3yC.css`, `lab-BiS8jmah.js` and
  `lab-B2IkTbut.css`, with only the pre-existing chunk-size advisory.
- Scope check: `git status --porcelain` showed only the untracked evidence
  directory before this append. `git diff --name-only
  b5359b0bcffeea75cbc214636b1b368f73049e9f..HEAD` listed exactly the two
  declared source/test files and the six regenerated falcon artifact files;
  range commits were `08312ad7` (test red), `44db9927` (implementation),
  `82ea9c7d` / `09e7bdf6` (formatter reworks) and `d8c4ec56` (canonical
  artifact regeneration). No merge, user or unrelated commit is present.
- Deviation recorded: the approved Phase 1 `Touches` named only the two
  falcon source files. Regenerating the six committed artifact files was
  required by `verify_phase` because the generator change makes the old
  manifests stale; it is the smallest necessary gate-enabling change and is
  documented in the plan.
- Conclusion: FR-1/FR-2/FR-3/FR-4/FR-6, AC-1/AC-2/AC-3/AC-5 and NFR-2 are
  satisfied; Phase 1 is accepted at checkpoint `d8c4ec56`.
