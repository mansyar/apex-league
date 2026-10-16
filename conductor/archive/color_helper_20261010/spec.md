# Track: Shared hslToRgb color helper

**Track ID**: `color_helper_20261010` · **Type**: Chore (refactor) · **Branch**: `track/color_helper_20261010`

## Motivation

The voxel package now has four private, byte-identical `hslToRgb` copies
(`bovine.ts`, `drake.ts`, `axolotl.ts`, `props.ts` — verified identical by
hash over the 23-line helper block). A fifth archetype would make it five.
Behavior-preserving extraction keeps the codebase DRY and gives future
palette work a single function to tune.

## Functional requirements

1. **New module** `packages/voxel/src/color.ts` exporting exactly one
   function, `hslToRgb(h: number, s: number, l: number): [number, number, number]`
   — hue in degrees, saturation/lightness 0–1, readonly-friendly tuple return.
   Module doc states the WHY: deterministic palette color for voxel DNA,
   shared by every archetype and prop builder.
2. **Four imports, four deletions** — `bovine.ts`, `drake.ts`, `axolotl.ts`,
   `props.ts` import from `./color` and contain no private copy afterwards.
3. **No API surface change** — `color.ts` is internal; not re-exported from
   `packages/voxel/src/index.ts`.
4. **Byte-identical output** — creature GLBs and prop digests must not change
   (guaranteed by the determinism gate + committed artifacts).

## Non-functional requirements

- Pure function, no imports beyond the standard library; strict TS.
- Google TS styleguide: function declaration, no `any`, no type assertions.
- All gates green: `bun run check`, `bun test`, `biome check`,
  `bun run gate:determinism`.

## Acceptance criteria

1. `color.test.ts` exists and covers: pure red (0°, 1, 0.5), a mid-hue
   conventional value, the green/cyan/blue corner mapping, and hue wrapping
   (`h = 420` ≡ `h = 60`).
2. Fixture tests: the four builders produce identical `build.colors` /
   voxelized output before and after the swap (determinism gate covers this
   byte-level; suite covers structural equality).
3. `grep hslToRgb packages/voxel/src/*.ts` finds exactly one definition
   (color.ts) plus call sites only.
4. Full `bun run verify` green.

## Out of scope

- Any change to color values or palette logic.
- Palette-apply helper normalization or wider color-system refactors.
- Exporting the helper through the package's public API.
- Touching sim or client packages.
