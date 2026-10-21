# Phase 4 Report — Rivals, UI & Client Integration

- **Track:** 20261021-electric-species-line — Electric Species Line
- **Phase:** 4 of 5
- **Date:** 2026-10-21
- **Branch:** `feat/20261021-electric-species-line`
- **Base commit:** `7c69035`
- **Result:** ✅ **verified**

## What landed

- **Rival rosters (FR-7).** `makeBracket` and `startCupSession` take an
  optional species `pool`; `prepareCup` passes
  `[...STARTER_SPECIES, ...LOCKED_SPECIES]` only when
  `state.ladder.tier !== "bronze"`. Bronze keeps the three-species pool, so
  every pre-Silver bracket is byte-identical to the pre-track draw; Silver and
  above draw the storm hound into the generated field. Authored boss
  substitution runs after the draw and is untouched by the pool.
- **Rival tests (new).** `packages/sim/src/cup/rival-roster.test.ts` (5 tests):
  Bronze never meets the reward line; a Bronze bracket deep-equals the
  three-species draw for the same seed; Silver/Gold/Legend draw all four
  species; widened rivals stay inside their species' legal stat bounds; an
  authored boss final keeps its id/species/stats.
- **Handbook (FR-9).** `handbook/moves.ts` iterates `ALL_SPECIES` instead of
  the starter list, so the electric line's six-move pool comes from data with
  no special case. The sim barrel now exports `ALL_SPECIES` and
  `LOCKED_SPECIES`.
- **Phone layout fix.** The handbook's tab row was a non-wrapping flex row, so
  the modal could not shrink below the tabs' min-content width: at 393 px the
  whole panel was clipped off-screen. A phone-only block in `ranch.css` wraps
  the tabs and reflows the move row (gate under name/stats). Pre-existing
  defect surfaced by this phase's AC-9 pass.
- **Untouched by design:** starter picker (`starter.ts`) and the
  graduation/egg picker (`graduation/egg.ts`) stay starter-only — the storm
  hound is a reward, not a starter or a breedable line. Nursery, creature
  plate, and detail modal are already data-driven from `speciesId`;
  `archetypeId` resolves the voxel model with no client registration.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| typecheck | `bun run check` | 0 | sim 99 files, client 303 files, no errors |
| unit | `bun test --timeout 120000` | 0 | 2,213 pass / 1 skip / 0 fail across 162 files (+5 new) |
| module size | `bun test apps/client/src/module-size.test.ts` | 0 | 5 pass — NFR-1 cap holds |
| full gate | `bun run verify` | 0 | typecheck + biome (487 files) + parallel tests + determinism gate (12 GLBs byte-identical) |
| build | `bun run build` | 0 | all packages built |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-7 | Generated rival rosters may field `electric_hound` from the tier where it is obtainable; authored bosses unchanged | pool gate in `prepareCup` (`tier !== "bronze"`); `rival-roster.test.ts` 5/5; Bronze deep-equal to the plain draw | pass |
| FR-9 | Handbook and client surfaces present the species with no special-casing beyond data | `handbook/moves.ts` iterates `ALL_SPECIES`; ranch + detail render from `speciesId`; screenshots below | pass |
| AC-7 | Rival rosters include the species post-obtainability; authored boss sides byte-identical | rival tests: boss final keeps `bossId`, `speciesId`, and `stats`; Bronze bracket equality | pass |
| AC-9 | Handbook and UI visual pass at desktop and iPhone 15 widths, clean console | `visual-pass.ts`: 0 console errors and 0 page errors at 1440×900 and 393×852; captures listed below | pass |
| NFR-1 | Client modules ≤ 12,288 B; `module-size.test.ts` green | module-size 5/5 after the handbook change | pass |

## Visual verification

Harness: `.conductor/evidence/phase-4/visual-pass.ts` injects a v21 fixture
save (`make-save.ts`: Silver III, owns the storm hound, gift claimed) into
`localStorage["apex.save"]`, drives the real HUD, and fails on any console or
page error.

| Capture | Shows |
| --- | --- |
| `desktop-ranch.png`, `iphone15-ranch.png` | storm hound in the ranch; Electric crest; name, stage, stat plate; Silver III readout |
| `desktop-detail.png`, `iphone15-detail.png` | Partner details modal — stats breakdown, lineage, traits, Tempest Warden path |
| `desktop-handbook-moves.png`, `iphone15-handbook-moves.png` | Moves page at both widths (phone: wrapped tabs, two-row moves) |
| `desktop-handbook-electric.png`, `iphone15-handbook-electric.png` | the `Electric · Storm Hound` section: Static Jolt, Volt Dash, Arc Shot, Storm Bolt, Ion Dart, Gigavolt with gates |

## Deviations

- **Executed by the primary agent.** The `conductor-phase` subagent remains
  unavailable (provider credit error); the primary implemented and verified
  this phase, as it did Phase 3.
- **`packages/sim/src/index.ts` barrel exports** (`ALL_SPECIES`,
  `LOCKED_SPECIES`) added so the client can read the catalog without deep
  imports. Not listed under Touches, but required by FR-9's data-driven rule.
- **`apps/client/src/ranch.css`** (not under `ui/`) gained the phone-only
  handbook block. Touches named surface CSS under `ui/`; the handbook styles
  live in `ranch.css`, so the fix landed where the rules are.
- **Reward line excluded from the egg/graduation picker** — deliberate: the
  gift egg is a granted lineage, not a breedable option. No code change needed
  because those pickers already iterate `STARTER_SPECIES`.
