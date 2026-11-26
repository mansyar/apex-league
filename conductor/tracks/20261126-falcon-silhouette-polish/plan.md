# Polish the falcon silhouette for speedster readability — Implementation Plan

> **Branch:** `feat/20261126-falcon-silhouette-polish`
> **Base:** `main` @ `84a1d1948f22a109de66f65388573cdb823ea715`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Feather contract and generator polish

- **Goal:** Falcon builds in all three stages carry four new rigged feather parts with sharpened wing/tail geometry, while the biped, stage-signature, DNA, palette and budget contracts remain intact.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-6, AC-1, AC-2, AC-3, AC-5, NFR-2
- **Touches:** `packages/voxel/src/falcon.ts`, `packages/voxel/src/falcon.test.ts`, `artifacts/falcon-42.glb`, `artifacts/falcon-42.manifest.json`, `artifacts/falcon-42-juvenile.glb`, `artifacts/falcon-42-juvenile.manifest.json`, `artifacts/falcon-42-champion.glb`, `artifacts/falcon-42-champion.manifest.json`
- **Deviation:** The six artifact files were added during acceptance because `verify_phase` requires byte-identical regeneration after the generator change. They were produced only by the canonical exporter, not hand-edited; this is the smallest necessary gate-enabling change.
- **Verification:** `bun test --check --parallel=4 --timeout 120000 packages/voxel/src/falcon.test.ts packages/voxel/src/stage.test.ts packages/voxel/src/proportion.test.ts`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** `c81ab889`
- **Evidence:** `conductor/tracks/20261126-falcon-silhouette-polish/verification/phase-1.md`

- [x] **P1.T1: Pin the feather silhouette contract in tests** — covers: FR-1, FR-2, FR-3, FR-6, AC-1, AC-2, AC-5
  - [x] **P1.T1.1:** Assert `wingFeatherLeft/Right` and `tailFeatherLeft/Right` exist in baby, juvenile and champion with non-zero voxels, finite pivots/colors and correct parents.
  - [x] **P1.T1.2:** Pin wing/tail style variants, biped leg/wing counts, additive stage signatures, palette hue `165`, gilded gate and budget bounds.
  - [x] **P1.T1.3:** Run the exact phase command and record the expected TDD red before implementation.
- [x] **P1.T2: Author the feather parts and wing/tail polish** — covers: FR-1, FR-2, AC-1, AC-2
  - [x] **P1.T2.1:** Add four named SDF fields with stable pivots, colors and parents; no new style slots.
  - [x] **P1.T2.2:** Sharpen existing wing blades and tail fan SDF parameters inside the current DNA-driven style variants.
  - [x] **P1.T2.3:** Leave DNA sampling, template bounds, palette, gilded gate, stage signatures and budget entries unchanged.
  - [x] **P1.T2.4:** Re-run the exact phase command to green.

## Phase 2: Artifact regeneration and deterministic gate

- **Goal:** Committed falcon GLB/manifest pairs for all three stages are regenerated through the canonical exporter and the plain determinism gate passes with no cross-species or prop drift.
- **Depends on:** Phase 1
- **Covers:** FR-5, AC-4, NFR-4, NFR-5
- **Touches:** `artifacts/falcon-42.glb`, `artifacts/falcon-42.manifest.json`, `artifacts/falcon-42-juvenile.glb`, `artifacts/falcon-42-juvenile.manifest.json`, `artifacts/falcon-42-champion.glb`, `artifacts/falcon-42-champion.manifest.json`, `verification/phase-2.md`
- **Verification:** `bun run gate:determinism`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** `d2284f07`
- **Evidence:** `conductor/tracks/20261126-falcon-silhouette-polish/verification/phase-2.md`

- [x] **P2.T1: Regenerate canonical falcon artifacts** — covers: FR-5
  - [x] **P2.T1.1:** Run `export-artifact.ts` for falcon seed 42 at baby, juvenile and champion.
  - [x] **P2.T1.2:** Confirm manifests/pivots/colors reflect the new feather parts and no artifact is hand-edited.
- [x] **P2.T2: Prove determinism and change scope** — covers: AC-4, NFR-4, NFR-5
  - [x] **P2.T2.1:** Run the plain determinism gate and record byte-identical regeneration.
  - [x] **P2.T2.2:** Confirm only the six falcon artifact files changed; all other archetypes and prop digests stay byte-identical.

## Phase 3: Visual evidence and integrated gate

- **Goal:** Desktop and phone captures show the polished falcon in ranch and arena through the real UI, and the full configured stack is green.
- **Depends on:** Phase 2
- **Covers:** FR-7, AC-6, AC-7, NFR-1, NFR-3
- **Touches:** `verification/phase-3.md`, `verification/integrated.md`, `.conductor/evidence/20261126-falcon-silhouette-polish/`
- **Verification:** `bun run verify && bun run build` plus `playwright-cli` captures at 1440×900 and forced iPhone 15 393×852 with clean console
- **Status:** verified
- **Result:** verified
- **Checkpoint:** `c25bd1cf`
- **Evidence:** `conductor/tracks/20261126-falcon-silhouette-polish/verification/phase-3.md`

- [x] **P3.T1: Capture falcon visuals from the real UI** — covers: FR-7, AC-6
  - [x] **P3.T1.1:** Capture ranch baby/juvenile/champion and arena falcon views on desktop and phone.
  - [x] **P3.T1.2:** Seed saves only through real sim exports; no hand-crafted JSON.
  - [x] **P3.T1.3:** Check console for zero errors and zero warnings.
- [x] **P3.T2: Record integrated verification evidence** — covers: AC-7, NFR-1, NFR-3
  - [x] **P3.T2.1:** Run `bun run verify && bun run build` and record layer results.
  - [x] **P3.T2.2:** Confirm no dependency, save, sim, balance, audio, other-archetype or prop drift.
  - [x] **P3.T2.3:** Write `verification/phase-3.md` and `verification/integrated.md`.
