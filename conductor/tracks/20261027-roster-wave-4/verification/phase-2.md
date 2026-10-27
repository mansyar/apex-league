# Phase 2 evidence — Roster Wave 4 (Voxel archetypes: cub, boar, otter)

- Track: 20261027-roster-wave-4 — Roster Wave 4 (Fire/Plant/Water Discovery)
- Phase: 2 — Voxel archetypes
- Date: 2026-10-27 (UTC)
- Branch: feat/20261027-roster-wave-4
- Base: main @ 4cd2d52a (Phase 1 verified at 1d249352)
- Result: blocked (implementation complete; verification, artifact
  authoring, and commits require shell/git, which this session's tool
  permissions deny — see Blockers)

## Tasks

### P2.T1.1 — Author the three archetype recipes (done, uncommitted)

New models mirror `packages/voxel/src/mole.ts` (Wave-3 newest pattern):

- `packages/voxel/src/cub.ts` (new) — Embercub. Small quadruped cub with
  an ember mane ruff (collar box + cheek tufts/spikes per `mane` style:
  full/ruffed/sleek) around the neck/cheeks. Proportions include
  `maneSize`; styles `mane` (3 options) + `paws` (round/broad).
  Hue 18 (Fire contract), gilded weight 32.
- `packages/voxel/src/boar.ts` (new) — Mossboar. Stocky low barrel with a
  mossy dorsal ridge (`ridge` style: mossy/spiked/smooth) and a broad
  rooting snout with a proud nose disc. Proportions include `ridgeSize`;
  styles `ridge` (3 options) + `paws` (hoofed/broad). Hue 110 (Plant
  contract), gilded weight 32.
- `packages/voxel/src/otter.ts` (new) — Mistkit. Sleek low-slung swimmer
  hull with a swept dorsal fin blade and a long rudder tail ending in a
  flattened fluke. Proportions include `finSize`; styles `back`
  (finned/smooth) + `flippers` (broad/sleek). Hue 205 (Water contract),
  gilded weight 32.

All three: `Template` with `version: 1`, 8 proportion ranges, ≥2 style
options per slot, `palette: { hue, valueJitter }`, gilded rarity 32;
colors sampled from RNG first (geometry never perturbs RNG order);
surface ramp via `surfaceClass` with torso/leg bounds; faces via
`faceParts`/`facePlan`/`skinPalette`; feet planted on the y=0.5
voxel-center floor; juvenile signature buds + champion signature crowns
rigged off the head with full pivots/colors/parents/palettes records;
`sample<Name>Dna` re-exported from `./sample`;
`<Name>Build extends CreatureBuild` interfaces.

Registration (exports only, no logic changes):

- `packages/voxel/src/archetype.ts` — imports + `cub`/`boar`/`otter`
  registry entries.
- `packages/voxel/src/index.ts` — `buildX`/`GRID`/`XBuild`/`xTemplate`/
  `sampleXxxDna` export blocks for all three.

Tests (new, mirroring the mole set):

- `packages/voxel/src/cub.test.ts`, `boar.test.ts`, `otter.test.ts` —
  template validity, hue contracts (18/110/205), gilded weight 32, DNA
  bounds, part inventory, stage variants (grid containment for all three
  stages, signature-part coverage, maturation lineage, palette lift).
- `packages/voxel/src/fuzz/determinism.{cub,boar,otter}.test.ts` —
  byte-identical regen.
- `packages/voxel/src/fuzz/budget.{cub,boar,otter}.00-03.test.ts` and
  `...04-07.test.ts` — GLB tripwire (320 KiB).

### P2.T1.2 — Generate GLBs, pin digests, tripwire (blocked)

The determinism gate (`packages/voxel/scripts/determinism-gate.ts`,
registry-driven, no script change needed) authors the nine missing
artifact pairs under `--write-missing` and deep-compares them in the
same run. Shell denial blocks execution — the primary runs it.

## Commands

| Layer | Command | Exit | Summary |
| ----- | ------- | ---- | ------- |
| Phase gate | `bun test --check --parallel=4 --timeout 120000` | blocked | Shell denied (`permission denied`); primary to run. Covers all new unit + fuzz tests, the proportion-budget audits (200 seeds × 3 stages), and the module-size cap. |
| Artifact authoring | `bun packages/voxel/scripts/determinism-gate.ts --write-missing` | blocked | Shell denied; primary to run. Authors 9 artifact pairs (`artifacts/{cub,boar,otter}-42[-juvenile,-champion].{glb,manifest.json}`) and deep-compares them in-run. |
| Commits | `git add` + scoped `git commit` | blocked | File writes done via edit/write; git denied. Primary to commit (suggested: `feat(voxel): cub/boar/otter archetypes for wave 4` + `test(voxel): cub/boar/otter unit and fuzz coverage`). |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| -- | --------- | -------- | ------ |
| AC-2 (FR-2, NFR-2, NFR-3, NFR-4) | Three distinct determinism-gated voxel archetypes (cub, boar, otter), all life stages pinned; hue contracts 18/110/205; module cap 24 KB; GLB tripwire 320 KiB | `cub.ts`/`boar.ts`/`otter.ts`, `<name>.test.ts` (hue pins, stage grid containment), `fuzz/determinism.<name>.test.ts`, `fuzz/budget.<name>.*.test.ts` | pending primary verification (tests written, not yet run) |

## Deviations (outside Touches, smallest change to keep the suite green)

- `packages/voxel/src/face.ts` — added `cub`, `boar`, `otter` branches
  to `facePlan` (round cub muzzle, wide boar snout with ox-style
  nostril pair on the nose disc, high-forward otter-kit eyes).
  Without them the three builds fall through to the drake default
  (heavy brow ridges on a cub/boar/otter face).
- `packages/voxel/src/budgets.ts` — added `cub`/`boar`/`otter`
  `PROPORTION_BUDGETS` entries (mole-family ranges with slack for the
  ruff/crest/fin). `proportion.test.ts` throws for any registered
  archetype without a budget entry.
- `packages/voxel/src/stage.test.ts` — added the three archetypes to
  `ARCHETYPE_SIGNATURES` (mane/moss/fin buds) and
  `CHAMPION_SIGNATURES` (flame crowns/tusks/fin crowns). The maps
  default to `[]`, so this is pinning rather than a repair.

No registry-count pins exist in the voxel suite (verified by grep);
`face.test.ts`, `fuzz/dna.test.ts`, and `mesh-baseline.test.ts` pin
only older archetypes and are untouched.

## Notes

- No product/design decisions were needed; Wave-3 (mole) precedent
  fixed every seam. Species↔archetype binding is Phase-1's
  (`cub`/`boar`/`otter` ids confirmed in `packages/sim/src/species/discovery.ts`).
- Estimated geometry fits the 56-grid and the audit box by construction
  (all parts ≤ ~48 z, ≤ ~23 y, ≥ ~1 y); the primary's suite run
  confirms the 200-seed proportion audits, the >900-voxel builds, and
  the 24 KB module cap.
- Blocker: shell (`bun`, `git`) denied by tool permissions throughout;
  the primary runs the gate, the suite, and the commits, then re-runs
  the suite to confirm green.

## Evidence paths

- `conductor/tracks/20261027-roster-wave-4/verification/phase-2.md` (this file)

## Rework (post-suite, same session — 6 failures, all fixed in code)

The primary ran the two blocked commands. Gate: full pass (12 old pairs
byte-identical; 9 new pairs authored + verified in-run, all far under the
320 KiB tripwire). Suite: 3397 pass, 1 skip, 6 fail. Root causes and fixes:

- **A** (`choreo.test.ts:130` registry↔profile parity): added `cub`,
  `boar`, `otter` to the test's `ARCHETYPES` const (registry order) and
  authored three motion profiles in `apps/client/src/choreo.ts`
  (deviation, client-owned; Phase 3 owns presentation). Every knob value
  is unique across all 15 profiles (pairwise difference = 12 ≥ 2),
  multipliers sit in [0.5, 1.6], swayAmps (0.019/0.011/0.028) sit in
  [0.004, 0.045] and below crab's 0.038 max, profiles freeze via the
  existing loop.
- **B** (`boar.test.ts:148`, `y > 0`): the leg capsule radius (2.4·bg)
  exceeded the planted foot clearance (2.2·bg), poking lattice voxels at
  y=0 on every seed/stage. Reduced to 2.0·bg (columns stay thick via the
  2.7·bg hip mass); clearance is now +0.2·bg at the y=0.5 centers.
- **C** (`otter.test.ts:112`, dead field): the dorsal-fin capsule sat
  fully inside the barrel at girth extremes (tip below the
  bodyY+4.2·bg crown), claiming zero voxels. The tip now clears the
  crown at every extreme (`4.2·bg + …`), for both `finned` (tall blade)
  and `smooth` (low nub) styles.
- **D/E/F** (proportion budgets, baby/juvenile/champion): the otter's
  genuinely long/low hull reads up to ~4.2 `bodyLength/bodyHeight` on
  the coarse audit lattice (quantization inflates the thin axis), and
  the short exposed flippers read ~0.29–1.0 `legLength/bodyHeight`.
  Widened only the otter entry (`body` max 3.6→4.8, `leg` [0.3,0.9]→
  [0.2,1.2]); the sleek hull geometry is untouched. Also lowered the
  boar `leg` min 0.3→0.2: the thinner planted capsule loses the y=0
  lattice row, shrinking leg extents slightly.

Geometry changes (boar legs, otter fin) invalidate the 6 committed
boar/otter GLB pairs only; cub pairs and all 12 legacy pairs are
untouched. The primary deletes those 6 pairs and re-runs the gate with
`--write-missing` to re-author them, then re-runs the suite and commits.

## Rework files

- `apps/client/src/choreo.ts`, `apps/client/src/choreo.test.ts`
  (deviation — client presentation is Phase 3; parity must hold now)
- `packages/voxel/src/boar.ts`, `packages/voxel/src/otter.ts`,
  `packages/voxel/src/budgets.ts`

## Rework round 2 (otter fin mass — 1 failure)

Suite re-run: 3402 pass, 1 skip, 1 fail — `otter.test.ts:115`: the
exposed fin tip claimed only 6 voxels (< 10 anti-degeneracy bar, which
stays). The blade was long enough to exit the crown but too thin to
read as a dorsal mass. Fix is geometry-only in `packages/voxel/src/otter.ts`:

- `finned`: radius `1.1·finAmt` → `1.3 + 0.7·finAmt` (≈1.7–2.3 across
  DNA), tip reach extended (`1.5 + 2.0·finAmt)·fs`, swept to `-5.0·bl`.
- `smooth`: nub radius `0.9` → `1.2`, stands `2.0` (was `1.2`) proud of
  the crown.
- Root deepened slightly (`3.6·bg` → `3.2·bg`, `-1.5·bl` → `-1.0·bl`).

Worst-case exposed-blade volume is now ~18+ voxels (smooth, min DNA)
and ~40+ (finned, min DNA); max tip height ≈ 18.9 grid units, well
inside the 56-grid and the 32 audit box. Body/leg/neck/head fields
untouched, so proportion budgets are unaffected. Only the 3 otter
artifact pairs go stale — boar, cub, and legacy pairs are current.
- New: `packages/voxel/src/cub.ts`, `boar.ts`, `otter.ts`,
  `cub.test.ts`, `boar.test.ts`, `otter.test.ts`,
  `fuzz/determinism.{cub,boar,otter}.test.ts`,
  `fuzz/budget.{cub,boar,otter}.00-03.test.ts`,
  `fuzz/budget.{cub,boar,otter}.04-07.test.ts`
- Edited: `packages/voxel/src/archetype.ts`, `index.ts`, `face.ts`,
  `budgets.ts`, `stage.test.ts`
- Pending: 9 artifact pairs under `artifacts/` (primary authors via the gate)
