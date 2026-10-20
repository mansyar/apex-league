# Branching Evolution & Champion Forms — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Give each starter species two evolution branches. A creature without a branch
that meets a gate is offered both paths instead of evolving automatically; the
choice is made once, in the player's own time, and it sets the juvenile and
champion stat profile, one exclusive special, and a small presentation accent.
Existing saves keep the exact numbers they had under a migration-only `legacy`
branch, and no voxel artifact is regenerated.

## Problem / Motivation

`product.md` promises "3-stage branching evolution trees", but
`packages/sim/src/evolution.ts` is linear: every Ember Drake becomes the same
champion on the same night with the same boost. The only build expression is
which four of six moves a player equips, and that pool is fixed per species.
The day-10 and day-25 gates are therefore thresholds to wait out, not decisions
to make.

That gap is felt most in Phase 2, where the ladder asks for repeat runs and the
training/form system now gives players a reason to plan. Without a fork, every
run of a species converges, and the champion stage has no identity to chase.
If it is not solved now, the branching tree has to be retrofitted later across
the save schema, Hall of Fame, breeding, and the evolution discovery UI that
just landed.

## Goals & Success Metrics

- **Goal:** every new creature makes exactly one irreversible evolution choice,
  and both options are legible in one screen without opening the handbook.
- **Metric:** a first-time player can name the two paths and the stat tradeoff
  from the picker alone in a five-person playtest; both branches of every
  species finish balance probes inside the established band.
- **Goal:** no existing save, battle golden, or voxel artifact changes.
- **Metric:** all v18 fixtures migrate; the determinism gate hashes are
  byte-identical; legacy-path fights reproduce today's results.

## Scope

### In Scope

- Two branches per starter species, each with a juvenile and a champion form.
- One branch choice per creature, offered at its next gate; the offer waits
  until the player decides and can be deferred without losing it.
- Branch stat profile, one exclusive special per branch, branch label and coach
  copy, and a runtime accent tint plus UI crest.
- A branch picker surface, a persistent HUD badge while an offer is pending,
  Growth-panel and detail-modal branch readings, and handbook copy.
- Save v19 (`creature.branch`, `evolutionOffer`) with migration,
  validation, export/import round-trip, and `docs/save-schema.md`.
- Deterministic branch seeding for generated rivals and branch recording in the
  Hall of Fame.
- Presentation: evolution cue and branch tint, reduced-motion safe.

### Out of Scope

- New voxel archetypes, branch-specific GLBs, or any regeneration of committed
  artifacts. Branch identity is stat + move + tint + crest, not new geometry.
- A second fork at the champion gate (four champion forms per species).
- Affinity drift, branch inheritance through breeding, or branch respec/undo.
- Rebalancing the six authored bosses; they keep their pinned kits and stats.
- New species, new elements, or the Phase 3 backend.
- A new runtime dependency.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The sim exposes a branch catalog with exactly two selectable branches per starter species. Each branch carries a stable id, label, coach line (at most two sentences), a juvenile boost and a cumulative champion boost, one exclusive move id, and an accent hue. Within a species pair, both branches' boosts have the same total point count as each other and as the legacy boost, and both exclusive moves share power, accuracy, and cooldown. | must |
| FR-2 | When a creature with no branch meets an evolution gate, settlement records a pending offer for that gate and does not change the stage. While an offer is pending, later nights neither re-offer nor evaluate another gate. Creating the offer marks that gate discovered. | must |
| FR-3 | `chooseBranch(state, branchId)` validates that an offer exists, the branch belongs to the creature's species, and no cup is in progress; on success it applies that gate's boost, sets the creature's branch (and the juvenile or champion stage), clears the offer, and returns a new state. On failure it throws a friendly error and changes nothing. | must |
| FR-4 | A creature that already carries a branch and meets a gate evolves normally along that branch: the champion gate applies the branch's cumulative boost and keeps the branch id. A champion never changes stage or branch again. | must |
| FR-5 | Migration assigns `legacy` to every v18 champion and Hall of Fame record, and `null` to babies and juveniles. A legacy creature evolves with the original `EVOLUTION_STAT_BOOST` / `CHAMPION_STAT_BOOST`, never receives an offer, and has no exclusive move. `legacy` is not selectable in the picker. | must |
| FR-6 | A branch's exclusive move becomes known when the branch is chosen, is equippable only by that branch, and is rejected for the other branch, legacy, babies, and other species. Loadout validation and required trained days account for the seventh known move, and a default loadout still slices the species kit's first four moves. | must |
| FR-7 | While an offer is pending, a branch picker shows both cards with the branch name, coach line, the four stat deltas, the exclusive move's numbers, and the accent. The player can confirm a choice or dismiss the picker; dismissal leaves the offer pending and surfaces a persistent HUD badge that reopens it. | must |
| FR-8 | The Growth panel reflects the pending offer and the chosen branch; the detail modal shows the branch label and crest; the handbook explains branching in coach voice without disclosing gate day numbers. | should |
| FR-9 | Save v19 persists `creature.branch` and the pending offer. Validation rejects unknown branch ids and malformed offers; export/import round-trips both; a v18 save migrates without data loss. | must |
| FR-10 | Generated spar and cup rivals at juvenile or champion stage receive a legal branch deterministically from their seed and may draw its exclusive move. Hall of Fame records carry the branch and render it. Authored bosses are unchanged. | should |
| FR-11 | The branch accent is a runtime per-instance tint; it never mutates a shared material and never regenerates a GLB. Completing a branch evolution plays the existing evolution cue. All branch surfaces are keyboard operable, not colour-only, and respect reduced motion. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Branch rules are pure and deterministic: integer stat math only, seeded rival branching, no wall clock, no network, no DOM in `packages/sim`. |
| NFR-2 | No committed GLB, prop digest, or generator version changes. `bun run gate:determinism` stays byte-identical. |
| NFR-3 | Every client module stays at or under 12 KB; new client code lives in its own modules rather than growing `hud/` or `detail/` past the cap. |
| NFR-4 | Branch cards meet the project's accessibility bar: focus order, Enter/Space activation, a shape or word alongside colour, body-text contrast, and a reduced-motion path with no information loss. |
| NFR-5 | Save schema changes bump the version, add a migration, and update `docs/save-schema.md` in the same phase. |
| NFR-6 | No new dependency. The suite stays in seconds and every logic-bearing change has success and failure tests. |
| NFR-7 | Branch copy follows the product voice: warm coach, no grimdark, at most two sentences per tooltip. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Every starter species has exactly two selectable branches, each with all catalog fields, and each pair's boost totals and move numbers match. | FR-1 |
| AC-2 | A gate-ready baby produces an offer and stays a baby; advancing more days does not evolve it or create a second offer until a branch is chosen. | FR-2 |
| AC-3 | Choosing a branch on the juvenile offer produces a juvenile of that branch with base + juvenile boost stats, the branch id set, and no offer left. | FR-3 |
| AC-4 | A branched juvenile that meets the champion gate becomes that branch's champion with the cumulative boost, and a champion cannot change branch. | FR-4 |
| AC-5 | A migrated v18 champion is `legacy`, fights with today's exact stats, never sees a picker, and a v18 juvenile can choose at the champion gate. | FR-5 |
| AC-6 | The exclusive move equips on its own branch at juvenile, and is rejected with a friendly error on the sibling branch, legacy, a baby, and another species. | FR-6 |
| AC-7 | The picker renders both cards with stat deltas and move numbers; Enter/Space confirms; dismissing keeps the offer and the badge reopens it. | FR-7 |
| AC-8 | Growth, detail, and handbook surfaces show the pending or chosen branch, and the handbook copy contains no gate day numbers. | FR-8 |
| AC-9 | A v18 fixture migrates to v19, exports, imports, and re-validates with branch and offer intact; a malformed branch or offer is rejected. | FR-9 |
| AC-10 | The same rival seed produces the same branch and kit across runs, and a retired record renders its branch. | FR-10 |
| AC-11 | The determinism gate is byte-identical, the client module cap passes, and the visual pass shows the tint without a shared-material leak. | FR-11, NFR-2, NFR-3 |

## Edge Cases

- Offer pending on a cup day: the cup can still be played at the current stage;
  branch choice is blocked while `phase === "cup"` and the offer survives.
- Offer pending at graduation: graduation requires a champion, so no overlap.
- A v18 juvenile already past day 10 receives its offer at the champion gate
  instead, and `chooseBranch` applies the cumulative boost.
- A creature can be sick, hungry, or low-mood while an offer waits; the offer
  does not expire and does not bypass the care gate for the next stage.
- Unknown branch id, a branch from another species, a duplicate choice, and a
  stale offer all fail closed with a friendly error.
- A rival seed that produces a branch with an exclusive move must still be
  deterministic and legal; bosses never draw a branch.
- Reduced motion: the picker and badge carry the full decision with animation
  disabled.

## Dependencies

- **Tracks:** none. Builds on archived
  `20261020-evolution-discovery-ui`, `20261020-training-programs-form`, and
  `20261020-client-decomposition`, all merged on `main`.
- **External:** none.

## Open Questions & Assumptions

- **Question:** should branch names and coach lines be authored now or tuned in
  phase review? **Assumption:** the spec proposes a default catalog; names may
  change without changing requirements.
- **Assumption:** one fork at the juvenile gate, not a second fork at champion.
  Champion forms follow the chosen branch.
- **Assumption:** branch choice is irreversible for this track; respec is out of
  scope and can be a later track.
- **Assumption:** tint and crest are enough presentation for a branch; no GLB
  work, so the determinism gate and asset pipeline are untouched.
- **Assumption:** `legacy` exists only for migrated saves and is not a player
  option, which keeps old goldens and old fights exactly as they are.

## References

- `conductor/product.md` — Phase 2 "evolution branching remains open".
- `packages/sim/src/evolution.ts`, `packages/sim/src/loadout.ts`,
  `packages/sim/src/battle/moves.ts`, `packages/sim/src/species.ts`.
- `conductor/archive/20261020-evolution-discovery-ui/spec.md` — Growth panel
  contract and discovery rules.
- `conductor/archive/20261020-training-programs-form/spec.md` — save v18 and
  the balance-probe band.
- `docs/save-schema.md` — persisted shape and migration chain.
