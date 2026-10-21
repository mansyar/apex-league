# Type Affinity Drift & Extended Prestige — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Closes the last two open Phase 2 roadmap items. Breeding gains **type affinity
drift**: an egg bred from parents of different elements can roll (seeded, 15%)
a *secondary affinity* — the other parent's element — which defends in battle
via a cancel-to-neutral rule. The prestige ladder gains two milestones:
**7 = Refined Blood** (stronger inheritance floor) and **9 = Champion Stable**
(head-start AP + wider mutation band). Save v20, additive.

## Problem / Motivation

`conductor/product.md` Phase 2 lists "family prestige perks; type affinity
drift" as still open after the branching-evolution track landed. The dynasty
loop currently ends at prestige 5 with three perks, and breeding passes only
stats and traits — a creature's element is a dead end genetically. Closing
these two items finishes Phase 2 cleanly before Phase 3 (new species, backend)
opens, and deepens the exact systems future content builds on.

## Goals & Success Metrics

- **Goal:** the dynasty loop gains a discoverable elemental legacy and two more
  prestige milestones, without disturbing boss balance bands.
- **Metric:** drift is observable within a few generations of play; all six
  boss win-rate bands (40–70%) remain valid; `bun run verify && bun run build`
  green.

## Scope

### In Scope

- Drift roll at breeding time (seeded, previewed = hatched).
- Secondary affinity persisted on the active creature and new Hall records
  (save v20, additive) with load/import validation.
- Incoming-damage cancel-to-neutral rule in the battle resolver.
- Prestige milestone 7 (Refined Blood) and 9 (Champion Stable) perks.
- Client full pass: nursery preview, creature plate + detail modal dual crest,
  coach ticker drift announcement, Handbook rule/perk documentation.
- Docs sync: `docs/save-schema.md`, `tech-stack.md` dated note, `product.md`
  roadmap status.

### Out of Scope

- Outgoing-damage changes (secondary defends only).
- Rival or boss secondaries (player lineage only).
- Secondary chaining (a secondary is never a drift *source*).
- New species, backend, ghost PvP (Phase 3).
- Prestige milestones beyond 9.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Breeding an egg from parents whose elements differ from the egg's species element rolls a seeded 15% chance to grant that different parent's element as `affinity` (secondary). The roll happens at breeding time so the nursery preview equals the hatch. If both parents share the species element, no roll occurs. | must |
| FR-2 | Save v20: additive `affinity: element \| null` on the active creature and new Hall records; the v19→v20 migration sets `null` (no inference, no backfill); load and import validate (a valid element or `null`, and never equal to the creature's primary element). | must |
| FR-3 | Battle: if the defender has a secondary affinity and the incoming move's element is super-effective (×2) against the primary but resisted (×0.5) by the secondary, damage resolves neutral (×1). Incoming-only; outgoing unchanged; rivals and bosses never carry secondaries. | must |
| FR-4 | Prestige milestone 7 **Refined Blood**: the stronger parent's floor fraction rises from 0.5 to 0.55 for eggs bred at prestige ≥ 7. | must |
| FR-5 | Prestige milestone 9 **Champion Stable**: the hatchling gets +1 max AP for its first 5 in-game days (auto-expiring, derived where possible), and the breeding mutation band widens from +1..+2 to +1..+3. | must |
| FR-6 | Client full pass: the nursery preview shows the rolled secondary before hatching; the creature plate and detail modal carry a dual-element crest; the coach ticker announces a drift event; the Handbook documents the cancel-to-neutral rule and the new perks. | must |
| FR-7 | Docs sync: `docs/save-schema.md` documents v20 + the migration; `tech-stack.md` gets a dated note; `product.md` marks the Phase 2 items landed. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Every client module stays at or under 12,288 B; `module-size.test.ts` stays green. |
| NFR-2 | No new dependencies; the determinism gate is untouched (no generator, DNA, or GLB change). |
| NFR-3 | New sim logic is pure, seeded, DOM-free and TDD'd; the suite stays in seconds. |
| NFR-4 | The previewed = hatched invariant is preserved (existing preview-seed seam). |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Seeded unit tests: drift fires at the threshold with different-element parents, does not below it, and same-element parents never drift | FR-1 |
| AC-2 | A v19 payload migrates with `affinity: null`; validation rejects secondary == primary and unknown elements; export/import round-trips affinity | FR-2 |
| AC-3 | Resolver test: ×2-vs-primary + ×0.5-vs-secondary incoming resolves ×1; all other matchup math byte-identical (existing goldens unchanged because default rivals carry no secondary) | FR-3 |
| AC-4 | Prestige 7 uses the 0.55 floor; prestige 6 does not | FR-4 |
| AC-5 | At prestige 9: +1 AP on days 1–5 after hatch, normal from day 6; the mutation band reaches +3 | FR-5 |
| AC-6 | Visual pass: nursery preview, plate, detail modal and Handbook show dual affinity at desktop and phone widths with a clean console | FR-6 |
| AC-7 | Docs match the shipped schema and roadmap truth | FR-7 |

## Edge Cases

- Both parents share the species element → no drift; no roll is consumed in a
  player-visible way.
- `affinity` must never equal the primary element (validation, not clamping).
- Legacy-form (`legacy`) creatures and secondaries coexist; old straight-line
  saves stay valid.
- Drift + trait inheritance + stat mutation on the same egg → independent
  rolls with an order pinned by test.
- Head-start AP across a cup spanning day 6 → the bonus is read at match-prep
  time.
- An imported v20 file with an invalid affinity → rejected via the existing
  invalid-save reasons.
- A Hall record carrying a secondary breeds again → secondaries never chain;
  only primaries are drift sources.

## Dependencies

- **Tracks:** none (all Phase 2 tracks are merged).
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** the mutation band at prestige 9 becomes +1..+3 (exact numbers
  pinned here; adjustable at review).
- **Assumption:** the 15% roll draws from a distinct RNG constant derived from
  the breeding seed (the `rivalKit` pattern), keeping existing seeded streams
  byte-identical.
- **Assumption:** head-start AP expiry derives from the creature's existing
  birth/settle-day data if present; otherwise an additive per-creature field
  joins v20.

## References

- `conductor/product.md` — Phase 2 open items
- `packages/sim/src/legacy.ts` — prestige milestones, `LineagePerks`
- `packages/sim/src/breeding.ts` — dual-parent floor, mutation band
- `docs/save-schema.md` — v19 truth and the migration recipe
