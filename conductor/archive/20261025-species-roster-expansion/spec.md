# Species Roster Expansion — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

The roster grows from six species to nine: three new species lines covering
the starter elements (fire, plant, water) join the league as ladder tier
rewards. Each line ships with a distinct voxel archetype (new generator
recipe), a six-move kit built from the existing move vocabulary, full
lifecycle parity (egg hatch → training → branching champion forms), and
integration into the rival field with refreshed authored boss pairings.
Existing saves that already claimed a reward tier retroactively receive the
new species through the pending-rewards queue.

## Problem / Motivation

The roadmap targets a 20–40 species roster; 6 exist. Every Phase-2 system —
4-tier ladder, dual-parent breeding, branching evolution, prestige perks,
type-affinity drift — runs on the thinnest possible content base. The reward
ladder has no fire/plant/water representation (Silver=electric, Gold=wind,
Legend=earth only), so ladder variety, breeding pair space, handbook depth,
and cup opponent pools are all constrained by the same shortage.

## Goals & Success Metrics

- **Goal:** three fully playable new species lines, granted through the
  proven reward seam, with no schema change.
- **Metric:** `ALL_SPECIES` holds 9 species; each reward tier grants exactly
  2 species; all gates (`verify`, determinism, module caps, balance probe)
  green.

## Scope

### In Scope

- 3 new `SpeciesDef` entries (fire/plant/water) with `rewardFromTier` slots
  Silver/Gold/Legend respectively.
- One new voxel archetype recipe per line (generator pipeline, gilded
  rarity gate, baked AO, GLB tripwire).
- Per-line six-move kits composed only from existing move vocabulary; tuned
  against the balance probe.
- Acquisition via the existing `claimedTiers`/`pendingRewards` reward seam
  **plus a retroactive catch-up** for already-claimed tiers.
- Full lifecycle parity: pure egg hatch, training programs, branching
  champion forms (two per line from the training record).
- Rival pools draw the new species; the six authored gatekeeper boss
  pairings are refreshed to use the wider roster and verified end-to-end in
  the browser.
- Client presentation: handbook entries, pickers/plates/creature-detail,
  element-true crest colors, hatch/evolution moments, copy.

### Out of Scope

- New move mechanics or effects (sim/battle core untouched).
- ElysiaJS backend, cloud saves, ghosts.
- Gift-seam (Storm-Gift-style) acquisition for the new lines;
  breeding-gated acquisition.
- More than 3 lines (later waves); Starter-seam changes.

## Species Draft (names proposed, approved at spec review)

| Slot | Working name | Archetype concept | Element |
| --- | --- | --- | --- |
| Silver reward | **Fernstag** | sapling stag, leafy antler branches | plant |
| Gold reward | **Reefclaw** | coral-armored crab | water |
| Legend reward | **Cindermoor** | ember-fleeced ram | fire |

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Three new `SpeciesDef` entries exist in `packages/sim` with id, element (fire/plant/water), stats, and a fixed six-move kit; `ALL_SPECIES` includes them and `obtainableSpecies(tier)` unlocks each at its `rewardFromTier` (plant@Silver, water@Gold, fire@Legend). | must |
| FR-2 | Each new line has a distinct voxel archetype built by the generator pipeline (voxel → greedy mesh → GLB, rigid hierarchy rig, AO in COLOR_0), passing the determinism gate and ≤320 KiB tripwire, with the gilded rarity gate at the shared weight. | must |
| FR-3 | Each new kit uses only existing move vocabulary; per-line battle behavior is tuned against the tactics balance probe within the same band discipline as existing species. | must |
| FR-4 | The reward seam grants each new species when its tier is first claimed; players whose `claimedTiers` already include the tier receive the species as a queued `pendingReward` on next boot (retroactive catch-up) — no save-schema change, save stays v25. | must |
| FR-5 | New species hatch purely from eggs, respond to all training programs, and evolve into exactly two champion branch forms from the training record, identical in mechanism to existing species. | must |
| FR-6 | Rival generation can field the new species; the six authored gatekeeper boss pairings are refreshed to use the wider roster, and every refreshed pairing is verified by playing the cup end-to-end in the browser. | must |
| FR-7 | The new species render correctly across all client surfaces: starter/roster plates, stable, handbook (with element-true crest colors at the hue contract: Plant 110°, Water 205°, Fire 18°), creature detail, growth panel, battle staging. | must |
| FR-8 | Copy for the new lines (hatch, graduation, debrief contexts) follows the product voice and is single-sourced like existing species copy. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No save-schema change (save stays v25); no new dependencies; no sim seam redesign — new content flows through existing seams. |
| NFR-2 | Module caps hold (12 KB client/sim, 24 KB voxel model files); CSS growth proportionate. |
| NFR-3 | Determinism gate is absolute — new GLBs are generated, their digests pinned; never hand-edited to pass. |
| NFR-4 | Element hue contract honored (Fire 18°, Plant 110°, Water 205°); creature surface ramp rules (AO-only darkening, bead eyes, painted features); gilded cosmetic-only. |
| NFR-5 | Balance work uses the probe (`tactics.balance.test.ts`, `APEX_BALANCE_REPORT=1`); no regression in existing goldens beyond re-baselining forced by boss refresh. |
| NFR-6 | Accessibility & mobile bar respected: new UI surfaces pass UX Principle 8 at 393×852 and 852×393. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `ALL_SPECIES` = 9; unit tests pin each new `SpeciesDef` (element, kit size 6, `rewardFromTier`) and `obtainableSpecies` gating per tier. | FR-1 |
| AC-2 | Determinism gate passes with the three new GLBs' digests pinned (all life stages); tripwire green. | FR-2 |
| AC-3 | Balance probe report shows each new kit within the existing sustained-score bands; existing tactics goldens stay green (or re-baselined only for boss refresh, recorded). | FR-3 |
| AC-4 | Unit tests prove: new-claim grant per tier, retroactive pendingReward for pre-claimed tiers, no duplicate grant, starter seam still refuses reward ids. | FR-4 |
| AC-5 | Hatch → train → branch-evolution tests pass for all three lines with the same mechanism as existing species. | FR-5 |
| AC-6 | Every refreshed boss pairing is played end-to-end in the browser (authored gatekeepers reach their stage and pose a real fight); evidence in the visual layer. | FR-6 |
| AC-7 | Handbook/plates/creature-detail/battle staging render all three new species correctly at 1440×900 and 393×852; console clean. | FR-7 |
| AC-8 | Copy review: all new strings ≤2 sentences, stat names visible, single-sourced. | FR-8 |

## Edge Cases

- **Already-claimed tiers:** retroactive catch-up must grant exactly once,
  never duplicate on repeated boots.
- **Multiple new tiers at once:** a save claiming Silver→Gold→Legend across
  visits queues rewards in tier order without loss.
- **Starter seam refusal:** reward ids (including the new ones) remain
  refused by the draft/starter seam.
- **Breeding:** new species participate as parents under the existing
  dual-parent floor rules — no new breeding logic.
- **Gilded roll:** applies per new archetype at the shared weight 32;
  cosmetic only.
- **GLB tripwire:** any new model breaching 320 KiB fails the gate — recipe
  must be reduced, never hand-edited.

## Dependencies

- **Tracks:** none (builds on merged `main` @ `2adc0518`).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** final display names may be revised at spec review; IDs
  stay slugs (`fernstag`, `reefclaw`, `cindermoor`).
- **Assumption:** stat spreads land within the existing band discipline;
  exact numbers are a plan-time task validated by the probe.
- **Assumption:** retroactive catch-up is implemented as a boot-time
  reconciliation against `claimedTiers` using the existing `pendingRewards`
  queue — no migration needed.
- **Assumption:** boss-pairing refresh may re-tune existing boss kits
  slightly (within their wider-pool row discipline) to pose real fights
  against the new species.

## References

- `packages/sim/src/species.ts` (`SpeciesDef`, `obtainableSpecies`,
  `STORM_GIFT_SPECIES_ID`)
- `conductor/tech-stack.md` — voxel pipeline, kit/rivalKit rules,
  determinism gate
- `conductor/product-guidelines.md` — element hue contract, creature
  surface ramp, voice
- `conductor/learnings.md` — lessons 12–13 (surface budget, gatekeepers
  reach their stage)
- Archived species-line tracks: `conductor/archive/` (electric/wind/earth
  precedents)
