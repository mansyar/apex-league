# Integrated verification — Species Roster Expansion

**Track:** `20261025-species-roster-expansion`
**Branch:** `feat/20261025-species-roster-expansion`
**Base:** `2adc0518` (main, after #53)
**Tip at verification:** `60905f9a`
**Date:** 2026-10-26
**Result:** pass

## Strategy run on the branch tip

| Layer | Command | Result |
| --- | --- | --- |
| Unit (phase gate) | `bun test --check --parallel=4 --timeout 120000` | exit 0 — 2791 tests / 238 files / 0 fail (1 pre-existing skip), 179,196 expect calls, 30.53 s |
| Static + determinism | `bun run verify` | exit 0 — typecheck clean (voxel 117, sim 150, client 389 files), Biome clean, determinism gate OK (27 creature GLBs byte-identical + 5 prop digests) |
| Build | `bun run build` | exit 0 (pre-existing >500 kB chunk advisory only) |
| Visual | Playwright evidence per phase | see below |

The determinism gate is the load-bearing layer for this track: it re-generates
every creature GLB from source and compares bytes, so the nine new artifacts
cannot drift from their recipes, and no GLB was hand-edited (NFR-3).

## Per-phase visual summary

- **Phase 1 (sim only)** — no visual layer; correctness carried by the
  balance probe (`species-roster.balance.test.ts`) and the catch-up suite.
- **Phase 2 (voxel only)** — no browser layer; the artifacts are verified by
  the determinism gate, the 320 KiB budget fuzz, and the 200-seed
  proportion-budget audit across all nine archetypes.
- **Phase 3** — 48 screenshots: hatch and evolution callouts for all three
  lines, roster/stable/creature-detail/growth surfaces, cup reward row naming
  the waiting species, and battle choreography at 1440×900, 393×852 and
  852×393; console 0 errors / 0 warnings on every capture.
- **Phase 4** — 20 screenshots: all six authored gatekeepers played
  end-to-end through a real cup (each reached its stage and was beaten), a
  Legend field drawing Reefclaw, and the landscape bracket before/after the
  occlusion fix; console 0/0.

## Requirements status

| ID | Status | Evidence |
| --- | --- | --- |
| FR-1 species data | implemented | `ALL_SPECIES` = 9; `REWARD_SPECIES` pinned order |
| FR-2 voxel archetypes | implemented | frond / crab / smolder; 27 GLBs pinned |
| FR-3 tier gating | implemented | `obtainableSpecies(tier)` per tier |
| FR-4 kits from existing vocabulary | implemented | three six-move recompositions, `moves.test.ts` catalog untouched |
| FR-5 lifecycle parity | implemented | hatch, all training programs, two champion forms per line; client copy single-sourced |
| FR-6 rivals & gatekeepers | implemented | rival fields draw new lines; six gatekeepers re-checked and played; `gatekeeper-reach.test.ts` |
| FR-7 roster surfaces | implemented | handbook, plates, stable, creature detail, growth (species-generic) |
| FR-8 single-sourced copy | implemented | `hud/copy-hatch.ts`, derived `populationNote()`, species-aware cup reward row |
| FR-9 no save-schema change | implemented | save stays **v25**; catch-up via `claimedTiers`/`pendingRewards` |
| NFR-1 no new deps / save v25 | met | dependency list unchanged; schema untouched |
| NFR-2 module caps | met | sim/client 12 KB, voxel 24 KB; new modules small |
| NFR-3 no hand-edited GLB | met | produced via `--write-missing`, re-proved by the plain gate |
| NFR-4 hue contract + gilded | met | 110° / 205° / 18°; gilded weight 32, cosmetic only |
| NFR-5 no weakened assertions | met | probe pins, boss tallies and form bands all unchanged |
| NFR-6 mobile bar | met | 393×852 and 852×393 audited, console clean |
| AC-1..AC-8 | met | mapped per phase evidence (AC-6 double-backed structurally and visually) |

## Known residuals

- **`apps/client/src/scene-logic/morning-after-poses.ts`** now covers nine
  archetypes (added in Phase 3), but the morning-after ritual's *copy* and
  *pose vocabulary* for the three new archetypes reuse the nearest existing
  temperament rather than bespoke animation — acceptable (the ritual is
  class-driven, not archetype-driven) and out of this track's scope.
- **Branch variant GLBs do not exist** by design: the pipeline's
  `generate(id, seed, stage)` has no branch dimension; the branch accent hue
  is applied at the client material layer (`creature.ts` → `branchTint()`),
  exactly as for the six original species.
- **`cup.css` landscape bracket** was fixed in Phase 4; the pre-existing
  tablet-band chip/lineage overlap from the mobile track remains out of scope.

## Conclusion

All four phases are verified and independently re-checked. The full strategy
passes on the branch tip, the determinism gate proves the new content is
reproducible, and no requirement is deferred. Ready for review.
