# Phase 3 Report — Voxel Archetype & GLBs

- **Track:** 20261021-electric-species-line — Electric Species Line
- **Phase:** 3 of 5
- **Date:** 2026-10-21
- **Branch:** `feat/20261021-electric-species-line`
- **Base commit:** `6a02860` (phase start; includes the GLB-count correction to 12)
- **Result:** ✅ **verified**

## What landed

- `packages/voxel/src/storm_hound.ts` (new, ~460 lines): the storm-hound
  archetype — template (proportion ranges, ear/tail styles, hue 50, value
  jitter), three-capsule lean torso with a sighthound tuck-up, long exposed
  legs, working-dog neck, long canine muzzle with jaw and painted mouth line,
  upright/folded/swept ear styles, whip tail with brush/plume/plain tips.
  Stage layer: baby carries a proportionally larger skull (×1.14) and shorter
  neck; juvenile gains the spark frills; champion adds the crown sparks
  (bone) — identity layer (body plan, snout, ears, palette family) unchanged.
- Registry + shared surfaces: `archetype.ts` (registry entry), `index.ts`
  (exports), `budgets.ts` (calibrated proportion budget), `face.ts`
  (storm-hound face plan — alert high-set eyes, muzzle mouth line, no
  nostrils: the muzzle is two to four cells across), `stage.test.ts`
  (signature tables: sparkFrill / crownSpark).
- `packages/voxel/src/storm_hound.test.ts` (new): structural, palette, stage,
  and determinism coverage.
- Artifacts: `artifacts/storm_hound-42{,-juvenile,-champion}.glb` + manifests
  (2,556 / 2,420 / 2,674 tris) — the gate's 12-creature set.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| gate | `bun run gate:determinism` | 0 | 12 creature GLBs byte-identical (9 existing untouched + 3 storm hound), 5 props match |
| typecheck | `bun run --filter '@apex/voxel' check` | 0 | 64 files, no type errors |
| unit (voxel) | `bun test --timeout 120000 packages/voxel` | 0 | 229 pass / 0 fail (up from 211 before this phase) |
| budget/proportion | `bun test packages/voxel/src/stage.test.ts packages/voxel/src/proportion.test.ts` | 0 | 13 pass; 200-seed × 3-stage budget audit green |
| full gate | `bun run verify` | 0 | 2,208 pass / 1 skip / 0 fail, 161 files; biome clean (486 files); determinism gate green |
| build | `bun run build` | 0 | all packages built |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-2 | Storm-hound archetype authored via the established pipeline; 3 stage GLBs registered in the gate; champion branch forms remain accent tints; structured for future sculpted forms | `storm_hound.ts` + registry entry; artifacts present; gate green | pass |
| AC-2 | Determinism gate passes with 12 creature GLBs registered and byte-identical output | gate run above: 12/12 OK | pass |
| NFR-2 | No new dependencies; gate extended to 12 GLBs, byte-identical | no `package.json` changes; gate green | pass |
| NFR-5 | Palette semantic classes, AO floor, dark bead eyes, identity never colour-only | template hue 50 (Electric), `surfaceClass` zones, `faceParts` bead eyes; no raw hues in geometry | pass |

## Visual verification

Rendered through `preview.html` (`packages/voxel/scripts/preview-shot.ts`) and
reviewed against the drake reference at the same seed/stage:

- `baby-side-4.png`, `champion-side-4.png` — final silhouettes.
- `champion-face-2.png`, `juvenile-side-3.png` — face and juvenile read.
- `ref-draconic-baby.png`, `ref-draconic-face.png` — house-style baseline.
- Earlier iterations (`*-side.png`, `*-side-2.png`, `*-face.png`) recorded the
  polish: thin stick legs, undersized skull, detached-looking tail.

Polish applied after the first draft (all inside the archetype module): legs
thickened (hip 2.2→2.6, shin 1.2→1.55, thigh 1.9→2.15), torso deepened
(chest 5→5.8, waist 3.6→4.2, rump 4.4→5.0), skull enlarged with a baby-stage
head scale, neck shortened, tail raised into an upswept curve and thickened so
the chain reads connected, ears shortened onto the skull top, crown trimmed.

## Deviations

- **Executed by the primary agent.** The `conductor-phase` subagent dispatch
  failed mid-run with a provider credit error after leaving an uncommitted
  draft (archetype, tests, artifacts, registry edits). Per the skill's
  fallback, the primary completed the phase: polish, budget calibration,
  artifacts, and all verification.
- **Proportion budget recalibrated** to the post-polish 200-seed × 3-stage
  sweep (legs 0.85–1.33, neck 0.04–0.37, head 0.23–0.78, body 1.6–2.6). The
  draft's ranges were authored against the pre-polish geometry and failed the
  audit's coarse-lattice quantization (head/body tied at 1.000 on low-girth
  seeds). Ranges remain meaningful guards and are documented in-file.
- **`face.ts` gained a storm-hound face-plan branch** — required to give the
  new archetype a correct eye/mouth layout; existing archetype branches
  untouched.
- Files changed outside the draft's list: none.

## Notes

- Existing artifact bytes are unchanged — the gate re-verified all nine prior
  GLBs byte-identical, so adding the archetype did not perturb the generator.
- Client rendering resolves archetype ids dynamically from
  `species.archetypeId` (`profileFor()` falls back to the default choreography
  profile); no client registration was required. A bespoke choreography
  profile is Phase 4 scope.
- Champion branch forms (`storm_courser` accentHue 62, `tempest_warden`
  accentHue 38) are tints over these stage meshes — no extra GLBs, as specced.
