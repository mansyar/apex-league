# Phase 1 Evidence — Per-Row Look Override + Geometry Pieces

- Track: 20261028-fire-move-identity — Fire Move Identity
- Phase: 1 (FR-1)
- Date: 2026-10-28
- Branch: feat/20261028-fire-move-identity
- Base: eebea094
- Head: 1ccdd313 (task commits: 36af15b5, 02205b07, 1ccdd313)
- Result: verified (primary ran the full gate; see Commands)

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static (types) | `bun run check` (via verify) | 0 | No type errors: 160 + 169 + 44 + 466 files |
| unit | `bun test --check --parallel --timeout 120000` (via verify) | 0 | 3470 pass, 1 skip, 0 fail |
| determinism | `bun run gate:determinism` (via verify) | 0 | All species x stages byte-identical + 5 props; smoke "fail" line is the known negative-path probe |
| lint/format | `biome check` (via verify) | 0 | Clean after primary fixes (see Notes) |
| build | `bun run build` | 0 | Exit 0; pre-existing chunk-size warning only |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| P1.T1 | Row-level look override | `looks.ts` (`MOVE_SHOT_LOOK`, `lookFor(element, moveId?)`); override pins | verified (commit 36af15b5) |
| P1.T2 | `fork`, `chunk`, `needle`, `jet`, `gather`; deterministic | `shot-geometry.ts` (4 `buildShotCore` branches + `buildGather`/`GATHER_MOTES`); shape tests | verified (commit 02205b07) |
| P1.T3 | Unit pins: fallthrough, determinism, vertex-level distinctness | `look-override.test.ts` (override, piece, determinism, distinctness describes) | verified (commit 1ccdd313) |

## Evidence paths

- `apps/client/src/move-fx/looks.ts` — extended `ShotLook.geometry`
  (`fork` | `chunk` | `needle` | `jet`), new `MOVE_SHOT_LOOK` table
  (empty: rows opt in during Phases 2–5), `lookFor(element, moveId?)`
  preferring the row override and returning the identical element object
  when absent.
- `apps/client/src/fx/shot-geometry.ts` — fork (3 additive zigzag bars),
  chunk (detail-1 icosahedron + 3 additive cracks), needle (single opaque
  stretched cone, tip downrange), jet (tapered additive pillar + brighter
  core, +y), `buildGather` (orb + 10 golden-angle/jitter motes via
  `anim.jitter`; static arrangement, inward pull animated in Phase 3).
- `apps/client/src/move-fx/look-override.test.ts` — 14 tests: fallthrough
  for all 8 fire rows + unknown ids/elements, override win + partial
  inheritance via scoped probe entries (table left empty), per-piece
  shape pins, fixed-seed determinism, gather seed sensitivity, pairwise
  vertex inequality across the 4 new pieces + streak + teardrop + ember,
  and no wind/water topology in the new fire cores.

## Deviations

- `apps/client/src/move-fx.ts` barrel and `apps/client/src/move-fx.test.ts`
  untouched (both outside `Touches`): no new barrel exports added.
  `MOVE_SHOT_LOOK`, `buildGather`, and `GATHER_MOTES` are imported via
  deep paths (`./looks`, `../fx/shot-geometry`), matching the existing
  `fallback.test.ts` pattern. Phases 2–5 re-export when they wire
  consumers (`projectiles.spawn`, step choreography).
- `apps/client/src/move-fx/moves.ts` untouched (no change needed): the
  override table lives in `looks.ts` next to `SHOT_LOOKS` — the reverse
  placement would create a moves→looks→moves import cycle. Resolution
  pairs with `fxFor(moveId, element)` by passing the same pair to
  `lookFor`, documented on `MOVE_SHOT_LOOK`.
- No files outside `Touches` modified. `moves/fire.ts`,
  `fx/projectiles.ts`, and step files intentionally unchanged — override
  consumers land in Phases 2–5 per the brief.

## Notes

- Single-arg `lookFor(element)` keeps the exact pre-override read (same
  object identity), so every existing call site is behavior-identical;
  the existing `move-fx.test.ts` shot-look pins should hold untouched.
- Trail union unchanged: Phase 1 adds geometry pieces only; rows select
  trails from the six existing families. New trail families (if Blaze's
  smoke needs one) are a Phase 3 call.
- Gather is a static builder: orb + shell motes. The draw-in animation
  (motes suck inward, orb swells) belongs to the charge step in Phase 3.
- Primary fixes at acceptance (2 fix rounds used): (1) removed a duplicated
  distinctness loop in `look-override.test.ts` that called `.has` on a
  `string[]` and switched the remaining calls to `.includes`;
  (2) `bunx biome check --write` on the three touched source files plus the
  track `metadata.json` (minified JSON trips the formatter — keep it
  pretty-printed going forward). Gate green afterwards; task commits made
  (36af15b5, 02205b07, 1ccdd313).
