# Stable & Partner Reserve — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

A stable: storage for the pets you own. The ranch keeps one active partner at
a time — the one that trains, fights in cups and spars, and grows — while every
other pet you own waits in the stable, frozen, its career paused and ready to
resume. The league's Storm Gift now hatches *into the stable* instead of
replacing the pet in the ranch, so a reward adds to your collection instead of
taxing it. Age becomes a per-pet value: every pet carries its own days alive,
the growth gates read that instead of the world clock, and the partner-details
modal shows it.

## Problem / Motivation

- **A reward that replaces your pet.** The game holds one active creature, so
  receiving the Storm Gift costs the player their companion: the hatch pushes
  the ranch partner into the Hall of Fame. The review of the electric species
  line (`20261021-electric-species-line`) recorded this as a known issue — a
  player is disappointed when their pet disappears, and a reward should add to
  the roster, not take from it.
- **The Hall of Fame is the wrong home for a living pet.** It is a *retirement*
  ledger of career records (stats, cups, traits), not a place where a creature
  lives. A player who receives a second species should be able to keep it and
  bring it forward when they choose.
- **The roster contract implies a collection.** `product.md` promises "20–40
  original species"; with a single active slot, every new line is a
  replacement rather than an addition, and the player can never hold two
  species at once.
- **Age is measured by the world day, not by the pet.** The evolution gates
  compare `state.day` against `EVOLUTION_DAY` (10) and
  `CHAMPION_EVOLUTION_DAY` (25), which is only correct for a creature hatched
  on day 1. A gift granted at Silver — around day 24 — is already "old enough"
  on its first night and matures to juvenile immediately, skipping its whole
  baby stage. Measured: a gift hatched on day 24 becomes a juvenile on day 25.
  A per-pet age fixes the defect and is also what makes a frozen career
  possible.

## Goals & Success Metrics

- **Goal:** the player can own several pets, keep exactly one in the ranch, and
  receive the Storm Gift without losing the pet they already have.
- **Metric:** the stable holds every pet the player owns that is not in the
  ranch; swapping is free, instant and lossless; a stashed pet's conditions
  and age do not move while it waits; the Storm Gift hatches into the stable
  and the ranch pet stays in the ranch (browser-verified at desktop and iPhone
  15).
- **Metric:** a pet's growth reads from its own age: a late-hatched pet
  matures on its own tenth night, and a stashed pet cannot cross a gate while
  it waits.
- **Metric:** the full gate stays green — existing goldens re-pinned on the
  pet's own age, boss win-rate bands unchanged, the determinism gate still
  covering 12 byte-identical creature GLBs.

## Scope

### In Scope

- A **stable** on the sim state: every pet the player owns that is not in the
  ranch, with no capacity limit, persisted by save v23 (linear migration,
  validation, `docs/save-schema.md`).
- A **swap seam**: send the ranch pet to the stable, bring a stashed pet
  forward. Free, instant, lossless in both directions.
- **Frozen stashed pets:** no condition decay, no training, no cups, no
  evolution, no age — the career pauses and resumes exactly.
- **Per-pet age:** every pet carries its own days alive; the juvenile,
  champion and graduation gates read it. Fixes the late-hatch defect.
- An **age readout**: the partner-details modal shows the active pet's age,
  and the stable modal shows each stashed pet's age.
- A **stable surface** in the client: a ranch chip beside Settings/Handbook
  opens a modal listing the stashed pets (crest, name, species, stage, age)
  with a *Bring to the ranch* action; the ranch scene rebuilds after a swap.
- **The Storm Gift hatches into the stable**, never into the ranch; the gift
  card says so and the ranch pet is untouched.
- **Graduation may hand the ranch to a stashed pet**, so a retirement never
  strands one.
- Docs sync: save schema, README, `conductor/product.md` (closing the electric
  line's known issue), `conductor/tech-stack.md`.

### Out of Scope

- Selling, gifting, releasing or breeding a stashed pet; a pet leaves the
  collection only by graduating from the ranch, and then it becomes a Hall
  record.
- A capacity limit, a stable building in the 3D ranch, or a stable that
  affects the day's economy (AP, training, cups).
- Opening the full partner-details modal for a stashed pet (its Growth and
  Training tabs are written around the active pet) — the stable modal carries
  the summary.
- Changing the Hall of Fame's meaning, the breeding rules, the ladder, the
  cup format, or the six authored bosses.
- A second active pet, a roster-wide UI (a "collection" screen beyond the
  stable modal), or anything that lets a stashed pet compete.
- New species, new voxel archetypes, or new art.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The stable holds every pet the player owns that is not in the ranch, with no capacity limit; the state persists them (save v23) and older saves migrate to an empty stable. | must |
| FR-2 | Exactly one pet is active at a time: the ranch, cups and spars use the active pet alone; a stashed pet never competes. | must |
| FR-3 | A pet can be sent to the stable and any stashed pet brought to the ranch; the swap is free, instant and lossless — every field (stats, trained, loadout, branch, stage, conditions, age, parents, name, species, gift marker) travels with the pet in both directions. | must |
| FR-4 | A stashed pet is frozen: a night tick changes neither its conditions nor its age, it cannot train, evolve, graduate or compete, and it resumes exactly where it left off when it returns. | must |
| FR-5 | Age is per pet: every pet carries its own days alive, incremented by the night settlement while it is active; the juvenile, champion and graduation gates read that age instead of the world day. A pet hatched late matures on its own tenth night, not its first. | must |
| FR-6 | The pet's age is shown where the player reads a pet's facts: the partner-details modal carries an age row beside the stage, and the stable modal shows each stashed pet's age. | should |
| FR-7 | The Storm Gift hatches into the stable: the ranch pet is untouched, and the gift is never a replacement. | must |
| FR-8 | At graduation the successor may be a stashed pet, a starter, or the pending gift; a graduation never strands a pet, and the retired pet is archived as it is today. | must |
| FR-9 | The stable surface is a ranch chip plus a modal listing every stashed pet (crest, name, species, stage, age) with a *Bring to the ranch* action; an empty stable has an empty state; the ranch scene rebuilds after a swap so the new pet is standing there. | must |
| FR-10 | A swap is refused during a live cup or spar (the day-phase lock), with the game's usual coaching copy rather than a silent no-op. | must |
| FR-11 | Breeding stays Hall-only: stashed pets are never pairable and never enter the Hall of Fame; the Hall keeps its meaning as the ledger of retired careers. | must |
| FR-12 | The cups-won tally stays the family's: prestige and the champion title remain lineage measures, so a stashed pet can earn its title on the family's record; a pet's own career counters are its age, trained stats and branch. | should |
| FR-13 | The docs match the delivered behaviour: save schema, README, the product roadmap (closing the electric line's known issue) and the tech-stack changelog. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Every client module stays at or under 12,288 B; `module-size.test.ts` stays green. |
| NFR-2 | No new dependencies; the determinism gate still covers 12 creature GLBs and stays byte-identical. |
| NFR-3 | Sim logic stays pure, seeded and DOM-free, and is TDD'd; a swap consumes no RNG and changes no existing seeded stream. |
| NFR-4 | Existing balance invariants hold: the six authored boss bands stay within 40–70%, and every existing golden stays green — except the evolution goldens, which are re-pinned from the world day onto the pet's own age with the same day numbers for a day-1 starter. |
| NFR-5 | The stable surface follows `product-guidelines.md`: keyboard reachable, focus restored on close, ARIA-labelled, 44 px targets, and meaning never carried by colour alone. |
| NFR-6 | No new voxel artifacts: the stable reuses the existing archetype pipeline, and the committed GLBs are untouched. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | The Storm Gift hatches into the stable and the pet in the ranch stays in the ranch — verified in a browser at desktop and iPhone 15 widths with a clean console. | FR-7, FR-2 |
| AC-2 | A swap is lossless: every field of both pets survives being sent to the stable and being brought back, and the swap costs nothing. | FR-3 |
| AC-3 | A stashed pet is frozen: a night tick changes neither its conditions nor its age, and it resumes exactly on return. | FR-4 |
| AC-4 | A pet hatched on day 24 matures on its own tenth night, not its first; the day-1 starter still matures on the day-10 night. | FR-5 |
| AC-5 | The partner-details modal shows the active pet's age, and the stable modal shows each stashed pet's age. | FR-6 |
| AC-6 | Save v23 round-trips the stable; v22 → v23 migrates to an empty stable with the active pet's age preserved; a malformed stable fails the load instead of loading half a pet. | FR-1 |
| AC-7 | The stable chip opens the stable modal, lists the stashed pets, and a swap rebuilds the ranch; desktop and iPhone 15 visual passes are clean. | FR-9, FR-10 |
| AC-8 | A graduation can hand the ranch to a stashed pet, and the retired pet is archived to the Hall as before. | FR-8 |
| AC-9 | The full gate is green: types, biome, the whole test suite, the determinism gate, and the build. | NFR-1, NFR-2, NFR-4 |

## Edge Cases

- **The stable is empty:** the chip still opens the modal, which shows an empty
  state (never a blank panel).
- **A swap during a live cup or spar:** refused by the day-phase lock, with
  coaching copy; the pet stays where it is.
- **A pet stashed mid-career:** its training assignment, illness cooldown and
  conditions are frozen with it; when it returns, the night it comes back is
  its own fresh night.
- **The gift arrives while the stable already holds pets:** no conflict — the
  stable is unlimited.
- **A save whose pending gift has not hatched:** the migration gives it an
  empty stable, and the gift still hatches into it.
- **A stashed pet whose species the catalog no longer knows:** the load fails
  like any other unknown species, rather than loading a broken pet.
- **Two pets of the same species:** allowed; the stable is not a species list.
- **Sending the only pet to the stable:** impossible — a swap always leaves
  exactly one pet in the ranch.
- **A pet stashed while a cup session is live:** refused, as any swap is.
- **Renaming a stashed pet:** allowed from the stable modal; the name travels
  with the pet.
- **A stashed pet at champion stage:** it cannot graduate while stashed; it
  graduates after it returns.

## Dependencies

- **Tracks:** `20261021-electric-species-line` (merged — PR #46, squash commit
  `cf2cdbf`). It introduces the pending Storm Gift this track routes into the
  stable, and it records the known issue this track closes.
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** the stable is unlimited. The game's collection will not reach
  a size that makes the save unwieldy; a capacity limit is a later decision.
- **Assumption:** a swap is not a career event. It bumps no generation, writes
  no Hall record and no lineage counter — a career event is a graduation,
  which still archives to the Hall as it does today.
- **Assumption:** the graduation gate follows the pet's own career length (60
  days of its own life), consistent with the evolution gates. *Consequence: a
  late-hatched pet now needs 60 of its own days where the world clock would
  have released it sooner; a day-1 starter's timing is unchanged.*
- **Assumption:** the cups-won tally stays the family's, so prestige and the
  champion title remain lineage measures (FR-12).
- **Assumption:** a stashed pet never trains, competes, breeds or graduates.
- **Assumption:** the stable is a UI surface, not a 3D ranch building.
- **Assumption:** a stashed pet's illness cooldown and training assignment
  freeze with it.
- **Question (later track):** should the stable ever gain a capacity limit, a
  building in the ranch, or a way to release a pet?

## References

- `conductor/archive/20261021-electric-species-line/` — the reward line this
  track routes into the stable, and its review's known issue.
- `conductor/product.md` — the roster contract ("20–40 original species") and
  the Phase 3 roadmap.
- `conductor/tech-stack.md` — the save-versioning rule (bump + migration +
  `docs/save-schema.md` in the same phase) and the determinism gate.
- `docs/save-schema.md` — the current persisted shape and migration chain.
- `packages/sim/src/evolution.ts` — the age gates this track moves onto the
  pet.
