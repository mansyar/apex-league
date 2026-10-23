# Earth & Wind Species Line — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

The element matrix completes. Two new species — `earth_tortoise` (Earth) and
`wind_falcon` (Wind) — join the league as the Gold and Legend ladder rewards,
each with a full 3-stage lifecycle (base, evolved, two champion branches), a
hand-authored voxel archetype, an eight-move pool, and standard breeding. The
one-species storm-gift mechanism generalizes into a per-tier league-reward
record serving all three reward tiers (Silver → Gold → Legend), save v25.

## Problem / Motivation

`Element` has had six values since day one, and the client already ships the
Earth and Wind crests (`ui/element.ts:21-23`), hues (Earth 28°, Wind 165°),
Handbook rows, and type-chart edges (`earth→electric`, `wind→earth` in
`battle/chart.ts`) — but only four species exist, so Earth and Wind are dead
columns players can see but never touch. `product.md` Phase 3 says it
directly: "the remaining five types and the wider roster are still open."
Every cup above Silver is fought in a four-element world while the game
advertises six. This track lights up the built-but-dark surfaces with zero
presentation work and completes the ladder's reward arc (Silver → Gold →
Legend each grants a species).

## Goals & Success Metrics

- **Goal:** both new species are obtainable, raisable, evolvable, branchable,
  breedable, and battle-legal end-to-end; the element matrix is 6/6.
- **Metric:** full lifecycle demonstrated for both species; determinism gate
  green at 18 creature GLBs; v24→v25 migration lossless; all existing
  golden/balance tests unchanged.

## Scope

### In Scope

- `earth_tortoise` and `wind_falcon` species definitions (stats, temperament,
  kit, branches, flavor), following `SpeciesDef` exactly.
- Full 3-stage lines for both: base, evolved, two champion branch forms each.
- Two hand-authored voxel archetypes via the established pipeline; 6 new GLBs
  (baby/juvenile/champion × 2) registered in the determinism gate.
- Stat extremes: earth_tortoise = fortress (highest HP/DEF in the game,
  lowest SPD); wind_falcon = speedster (highest SPD, low HP).
- 8 Earth moves + 8 Wind moves (6 kit rows + 2 branch signatures per
  element), using only the existing effect vocabulary.
- Generalized per-tier league rewards replacing the storm-gift fields:
  Silver → electric_hound (existing), Gold → wind_falcon, Legend →
  earth_tortoise; pure gift eggs; grant at most once per tier, persisted;
  `SAVE_VERSION` 24 → 25 with linear migration v24→v25 and
  `docs/save-schema.md` updated in the same phase.
- Generated rival rosters may field wind_falcon from Gold and earth_tortoise
  from Legend.
- Both species standard-breedable under existing dual-parent rules.

### Out of Scope

- No new ladder tiers; no changes to tier names, promotion, or cup rules.
- No server/cloud work (Phase 3 backend remains its own track).
- No changes to the six authored bosses (no new species, no behavior change).
- No starter-roster changes (the three starters stay as they are).
- No new game mechanics beyond the reward generalization (no new statuses,
  no new effect verbs, no weather/terrain).
- No client UI additions beyond data-driven surfaces.
- No balance changes to existing species, moves, or bosses.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Full 3-stage line for `earth_tortoise` and `wind_falcon` — base form, evolved form, two branching champion forms each — playable end-to-end (obtain → raise → evolve → branch → compete) | must |
| FR-2 | Two voxel archetypes authored via the established pipeline; 6 new creature GLBs (baby, juvenile, champion per species) registered in the determinism gate; champion branch forms are accent-tint variants (no extra GLBs); archetypes structured for future sculpted champion forms | must |
| FR-3 | Stat profiles at opposite extremes and distinct from all four existing species: `earth_tortoise` highest HP and DEF, lowest SPD; `wind_falcon` highest SPD, low HP | must |
| FR-4 | Move pools of 8 Earth and 8 Wind moves (six kit rows + two branch signatures per element) using only the existing effect vocabulary; standard learn schedule (0-1 known at birth, 2 by trained day 3, 3-5 by day 6) and the equip-4 rule | must |
| FR-5 | On non-forfeit cup finalize: for each released reward tier the player's current tier has reached (Silver → `electric_hound`, Gold → `wind_falcon`, Legend → `earth_tortoise`) and whose reward was never claimed, the league grants that tier's pure gift egg; each tier's claim is granted at most once and persists across saves; grants are independent per tier | must |
| FR-6 | Reward eggs are pure: hatch with the tier species' fixed element and guaranteed `affinity: null`; consume no drift RNG draw; nursery preview matches the hatch exactly | must |
| FR-7 | Generated rival rosters may field `wind_falcon` from Gold and `earth_tortoise` from Legend; the six authored bosses carry no new species and no behavior change | should |
| FR-8 | Save persistence for the per-tier reward record: claim flags and pending rewards per tier; save version bump 24 → 25 with linear migration that maps existing storm-gift state exactly; `docs/save-schema.md` updated in the same phase | must |
| FR-9 | Handbook and existing client surfaces (nursery preview, creature plate, detail modal, starter card, battle HUD) present the species with no special-casing beyond data | should |
| FR-10 | Both species join the standard breeding pool once released: `validatePair`, `speciesOptions`, and offspring element rules accept them with no new breeding mechanics | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Every module stays at or under its package cap — 12,288 B in `apps/client` and `packages/sim`, 24,576 B in `packages/voxel`; all three guards green |
| NFR-2 | No new dependencies; the determinism gate is extended to 18 creature GLBs and stays byte-identical across runs |
| NFR-3 | Sim logic pure, seeded, DOM-free, TDD'd; reward eggs consume no drift RNG draw so existing seeded streams stay byte-identical |
| NFR-4 | Existing balance invariants hold: six authored boss bands (Koda, Hesse, Marlow, Delmar, Fenn, Thessa) stay within 40-70%; all existing species/legacy/breeding/cup golden tests unchanged |
| NFR-5 | Visuals follow `product-guidelines.md`: archetype palette via semantic voxel classes, AO as the only darkening pass (0.72 floor), dark bead eyes; Earth hue 28° and Wind hue 165° sourced from `ui/element.ts` |
| NFR-6 | The v24→v25 migration is lossless and linear: a v24 save with a claimed Silver reward and/or a pending gift egg round-trips to the identical semantic state at v25 |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Full lifecycle demonstrated for both species: obtain egg via tier reward → hatch → raise → evolve → choose a champion branch → win a cup | FR-1 |
| AC-2 | Determinism gate passes with 18 creature GLBs registered and byte-identical output | FR-2 |
| AC-3 | New-species balance probes pass (methodology mirrors the boss-band probes); existing boss bands unchanged | FR-3 |
| AC-4 | Move learn schedule and equip-4 tests green for all 16 new moves | FR-4 |
| AC-5 | Each tier's grant fires exactly once at tier ≥ its threshold (non-forfeit finalize); never duplicates; never fires below the tier; tiers grant independently | FR-5 |
| AC-6 | Reward eggs hatch with their fixed element and `affinity: null`; nursery preview shows the same result | FR-6 |
| AC-7 | Generated rival rosters include each species post-obtainability; authored boss sides are byte-identical to before | FR-7 |
| AC-8 | Save round-trip preserves per-tier claims and pending rewards; migration v24→v25 green, including a v24 save with a claimed and a pending storm gift | FR-8 |
| AC-9 | Handbook and UI visual pass at desktop and iPhone 15 widths with a clean console | FR-9 |
| AC-10 | Breeding tests cover both species: pairing accepted, offspring element follows existing rules | FR-10 |

## Edge Cases

- **Existing saves past Gold or Legend:** each grant occurs at the next
  non-forfeit cup finalize where tier ≥ that tier and unclaimed (tier-check
  rule, not an exact-arrival rule) — mirrors the Silver precedent.
- **Forfeited cups:** never trigger or consume any tier's grant.
- **Multiple pending rewards:** a migrated save may have several unclaimed
  tiers at once (e.g. an old save jumping straight to Legend); each tier
  grants independently and each egg is handled by the existing single-pending
  mechanism or its generalized form — the exact shape is an implementation
  decision recorded in the plan.
- **v24 → v25 mapping:** `stormGiftClaimed: true` maps to the Silver tier's
  claim; a pending storm gift maps to a pending Silver reward; nothing else
  changes.
- **Stream purity:** reward eggs consume no drift RNG draw — existing seeded
  streams stay byte-identical.
- **Breeding:** both species follow standard dual-parent breeding rules;
  offspring element follows existing species-element rules.
- **Nursery capacity:** a reward egg arriving while an egg is incubating is
  supported (assumed existing behavior, per the electric line).
- **Repeat grants:** per-tier claim flags prevent any second grant regardless
  of tier progression.

## Dependencies

- **Tracks:** none (all referenced machinery — branching evolution, gift
  eggs, stable — is merged).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** display names and flavor text for the eight forms (2
  species × base/evolved + 4 champion branches) are finalized during
  implementation following the existing naming style; species ids
  `earth_tortoise` and `wind_falcon` are fixed.
- **Assumption:** champion branch concepts per species are decided during
  implementation with balance review; they ship as accent-tint variants (no
  extra GLBs).
- **Assumption:** exact statBound numbers are chosen during implementation to
  satisfy FR-3's extremes and NFR-4's invariants, verified by balance probes.
- **Assumption:** the generalized reward record's exact field layout (per-tier
  map vs parallel fields) is chosen in the plan, subject to FR-8's migration
  exactness.
- **Question:** does the Legend reward need any ceremony or special moment
  beyond the existing nursery gift flow? (Current answer: no — data-only
  surfaces; revisit if playtesting says otherwise.)

## References

- `conductor/product.md` — species contract, Core Loop, Phase 3 roadmap
  ("the remaining five types and the wider roster are still open")
- `conductor/tech-stack.md` — voxel pipeline, determinism gate, save
  versioning, module caps
- `conductor/product-guidelines.md` — palette semantics (Earth 28°, Wind
  165°), eyes, a11y rules
- `conductor/archive/20261021-electric-species-line/` — the direct precedent
  this track mirrors ×2
- `conductor/archive/20261020-branching-evolution-champion-forms/` — branching
  machinery (accent tint, no new GLBs)
- `packages/sim/src/species.ts` — `SpeciesDef`, `rewardFromTier`, starter
  roster
- `packages/sim/src/battle/chart.ts` — the complete 6-element type chart
