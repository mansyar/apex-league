# Spec: Voxel Pipeline Foundation

## Overview

Build the deterministic creature asset pipeline in pure TypeScript: authored
**archetype templates** + **seeded DNA** → SDF parts → voxel grid → per-part
meshed GLB with a rigid hierarchy contract. Prove the entire chain end-to-end
with the **Fire drake** (draconic archetype), visible and breathing in the
ranch. This is the riskiest unknown in the project — this track de-risks
everything after it.

## Functional Requirements

### FR1 — Generator core (`packages/voxel` workspace)
Pure-TS, Bun-run API `generate(archetype, seed) → creature`. Pipeline:
DNA → SDF part composition (smooth-blended capsules/rounded boxes) → voxel
grid (~40 voxels tall) → per-part greedy mesh → GLB with named-node hierarchy
+ pivots. DOM-free; uses the same mulberry32 RNG family as `@apex/sim`.

### FR2 — DNA schema (versioned JSON)
Archetype template declares proportion params + hard bounds, signature-part
slots with styles, palette (Fire type hue contract), marking conventions, and
rarity gates. Seeds jitter within bounds only; bounds are enforced and
property-tested.

### FR3 — Drake archetype
Draconic body plan with **2–3 styles on ≥2 signature slots** (horns, tail) —
proving the discrete "different breed" gear, not just continuous jitter.
Calibrated against the approved reference collage (chunkiness, snout,
silhouette reads).

### FR4 — Wild variation + rare tiers
Aggressive jitter (±20–30% where visible). Rare cosmetic rolls (e.g. 1-in-N
gilded/albino markings) — cosmetic only, never stats. Mutants cluster around
signature parts, never body-plan topology.

### FR5 — Determinism gate
Committed `drake.glb` + manifest (dnaHash, generatorVersion, glbSha,
part pivots, triCount). A gate script re-generates and hash-compares — any
drift fails the gate (wired into verify/CI).

### FR6 — Dev gallery page (dev-only)
Seed input + variant grid; the instrument for tuning archetype bounds and
running the herd test.

### FR7 — Ranch integration
Committed drake GLB replaces the placeholder voxel in the ranch scene;
breathing idle (squash-stretch + head/jaw bob) driven by the hierarchy rig
via procedural three.js animation.

### FR8 — Three-layer concept artifacts
1. Approved reference collage (calibration, not targets) — gathered and
   approved 2026-10-09 (pigart low-poly drake, Lathagra Magicavoxel dragon,
   MrMustache voxel dragon pack, ArtStation contest dragon).
2. Template-as-concept: grey default-seed renders iterated until the
   silhouette unambiguously reads "dragon" before palette work.
3. AI-generated mood piece for Fire palette direction (swatches only, never
   a shape target), produced during implementation.
   *(Update 2026-10-09, review: layer 1 collage committed to
   `docs/concept/drake-references.html`; layer 3 mood piece deferred to the
   Fire/Water/Plant palette work in a later track — grey-render calibration
   proved sufficient for this track's scope.)*

## Non-Functional Requirements

- **Determinism:** same (template, seed, generatorVersion) → byte-identical
  output, everywhere.
- **Testing:** DOM-free, fast (<10s): SDF sampling, meshing, DNA bounds,
  GLB node contract.
- **Quality gates:** `bun run verify` clean at every commit; GLB size budget
  ~≤150KB.
- **Vision gate:** 8-seed lineup rendered; pass = every creature
  unmistakably drake + at least a few surprising; explicit user acceptance
  via rubric.

## Acceptance Criteria

1. Property tests: N random seeds → all valid, in-bounds, DNA-distinct.
2. `drake.glb` committed; determinism gate green.
3. Ranch shows the breathing drake (browser-verified screenshot).
4. Herd test passes rubric with explicit user acceptance.
5. `bun run verify` exit 0.

## Out of Scope

Walk cycles, icon renders, other archetypes (Water/Plant), breeding
mechanics, production runtime generation, server integration, battle arena.
