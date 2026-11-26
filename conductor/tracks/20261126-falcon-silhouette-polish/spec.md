# Polish the falcon silhouette for speedster readability — Specification

> Track IDs in this specification are stable. Do not renumber FR-1..FR-7, NFR-1..NFR-5 or AC-1..AC-7 after approval.

## Overview

A voxel-presentation polish for the `wind_falcon` species / `falcon` archetype. Add four named feather parts to the base build and sharpen the existing wing and tail geometry so the raptor silhouette reads at a glance in the ranch and arena. All stages, style variants, budgets, DNA contracts and determinism gates remain intact; committed falcon artifacts are regenerated through the canonical exporter.

## Problem / Motivation

`buildFalcon` already models a perched raptor with folded wing blades, a fan tail, a hooked beak and two legs, but at arena scale the wing and tail read softly against other bipeds and the speedster identity depends on subtle stage buds/plumes. Existing learnings warn that at voxel scale, readable identity comes from contrast and position, not micro-detail. The fix is to add a small set of stable, rigged feather parts and sharpen the existing wing/tail lines without changing DNA, palette, balance or save state.

## Goals & Success Metrics

- The falcon reads as a raptor/speedster without relying on HUD text.
- Four new named feather parts are present in every stage, with finite pivots/colors/parents and non-zero voxels.
- All wing/tail style variants and all three stages remain bounded and deterministic.
- Falcon GLB/manifest artifacts are regenerated and the plain determinism gate passes.
- Desktop and phone captures show the falcon in ranch and arena with clean consoles.

## Scope

### In Scope

- `packages/voxel/src/falcon.ts`: add four feather fields; sharpen existing wing and tail SDF parameters.
- `packages/voxel/src/falcon.test.ts`: pin the new part contract, style-variant coverage and bounded geometry.
- `artifacts/falcon-42{,-juvenile,-champion}.glb` and their `.manifest.json` files: regenerate via the canonical exporter only.
- Visual evidence under gitignored `.conductor/evidence/20261126-falcon-silhouette-polish/`.

### Out of Scope

- Palette hue, gilded rarity gate, DNA bounds, template id/version, seed contract.
- Proportion budget ranges, other archetypes, prop digests, generated code.
- Sim stats, save schema/version, battle outcomes, balance hash, audio cue ids.
- Client motion profiles, camera changes, new dependencies, new screens, hand-crafted save JSON.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Add `wingFeatherLeft`, `wingFeatherRight`, `tailFeatherLeft`, `tailFeatherRight` as named fields present in all three stages. Each has a stable name, finite pivot, color and parent (`wingLeft`, `wingRight`, or `tail`) and claims voxels. These are base-silhouette parts, not stage signatures. | high |
| FR-2 | Sharpen the existing wing blades and tail fan geometry within the current style slots (`folded`/`drooped`/`flared`, `fan`/`forked`/`streamer`); keep `wingLeft`, `wingRight`, `tail`, `tailTip` names and DNA-driven parameters as the source of variation. | high |
| FR-3 | Preserve the biped contract (`legFL`, `legFR` exactly), two wings, and the existing additive stage signatures: juvenile `pinionBudLeft/Right` and champion `crownPlumeLeft/Right`, both parented to `head`; baby carries no signature parts. | high |
| FR-4 | Freeze the falcon template identity, DNA bounds, palette hue `165`, gilded gate weight `32`, proportion budget ranges, all non-falcon archetypes and all prop digests. | high |
| FR-5 | Regenerate baby, juvenile and champion falcon GLB+manifest pairs through `packages/voxel/scripts/export-artifact.ts`; no hand-edited binary or manifest; the plain determinism gate must pass byte-identically. | high |
| FR-6 | Keep all new/reshaped geometry finite and inside the 56-grid boundary across all wing/tail style variants and all stages, with proportion and fuzz gates green. | high |
| FR-7 | Capture desktop 1440×900 and forced iPhone 15 393×852 views of the falcon in ranch and arena through the real UI, with clean console and saves seeded only via real sim exports. | medium |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No dependency, lockfile, generated-code, save-schema, sim, balance or audio change. |
| NFR-2 | Voxel module caps stay green (`falcon.ts` remains under 24 KB; `module-size.test.ts` passes). |
| NFR-3 | Full configured gate green: `bun run verify && bun run build`, including typecheck, unit tests, Biome, determinism and Vite build. |
| NFR-4 | Artifact regeneration is reproducible from seed 42 and the canonical exporter only. |
| NFR-5 | No cross-species or prop drift: only falcon artifacts change. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Four new feather parts exist in baby/juvenile/champion builds with non-zero voxels, finite pivots/colors/parents; leg and wing counts remain exactly two each. | FR-1, FR-3 |
| AC-2 | Wing/tail style variants all produce bounded, non-degenerate geometry; no new style slots or renamed existing parts. | FR-2, FR-6 |
| AC-3 | Baby has no stage signature parts; juvenile/champion signatures remain present and head-parented; palette/gilded/DNA/budget/non-falcon/prop/sim/save/balance/audio surfaces are byte-unchanged. | FR-3, FR-4, NFR-1 |
| AC-4 | All three falcon GLB+manifest pairs are regenerated by the canonical exporter; plain `bun run gate:determinism` passes; no other artifact changes. | FR-5, NFR-4, NFR-5 |
| AC-5 | Boundary, fuzz, proportion-budget and module-size tests pass; no NaN, overshoot or grid-boundary voxels across the configured sweep. | FR-6, NFR-2 |
| AC-6 | Desktop and phone captures show the falcon in ranch and arena with clean consoles and real-sim-seeded state. | FR-7 |
| AC-7 | `bun run verify && bun run build` exits 0 with no dependency/save/voxel-outside-falcon/audio diff. | NFR-3, NFR-1, NFR-5 |

## Edge Cases

- All wing styles × all tail styles × all three stages remain valid and bounded.
- Baby must not gain juvenile/champion signature parts; new feathers are base parts, so they are allowed in baby.
- No voxel touches the 56-grid boundary; no NaN/Infinity in SDF parameters or pivots.
- Artifact regeneration changes only falcon seed-42 pairs; other archetypes and props remain byte-identical.
- Paused/hidden tab, dense battlefield and reduced-motion presentation are unaffected because the change is voxel-only.

## Dependencies

- Tracks: none.
- External: none.

## Open Questions & Assumptions

- No dependencies; existing ranch/spar/cup UI and default camera framing suffice for visual proof.
- New feather parts are base-silhouette parts, not stage signatures; existing stage signature arrays remain unchanged.
- Committed artifact hashes are expected to change only for falcon stages and are regenerated, not hand-edited.

## References

- `conductor/roadmap.md` RM-11.
- `packages/voxel/src/falcon.ts`, `falcon.test.ts`, `budgets.ts`, `stage.test.ts`.
- `packages/voxel/scripts/export-artifact.ts`, `determinism-gate.ts`.
- `conductor/learnings.md` entry 16 (voxel-scale readability).
