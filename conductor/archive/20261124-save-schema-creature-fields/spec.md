# Save Schema Creature Fields — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Correct the persisted `Creature` schema documentation so the two existing fields
`element` and `bondedToday` are represented accurately. This is a
 documentation-only chore: it changes no runtime type, validator, migration,
save version, gameplay behavior, dependency, or test.

## Problem / Motivation

`docs/save-schema.md` is the project's human-readable persistence contract, but
its `Creature` table omits `element` and `bondedToday`. Both fields are present
in `packages/sim/src/creature.ts` and enforced by the creature validator. The
omission misleads implementers, migration authors, and reviewers about the saved
shape and the nightly bonding reset.

## Goals & Success Metrics

- **Goal:** Add accurate rows for `element` and `bondedToday` to the `Creature`
  table without changing any other row.
- **Metric:** Both fields appear with types and semantics consistent with the
  current source and validator; only `docs/save-schema.md` changes; configured
  verification remains green.

## Scope

### In Scope

- Add one `element` row to the `Creature` table in `docs/save-schema.md`.
- Add one `bondedToday` row to the same table.
- Describe persistence, validation/source-of-truth, and nightly reset semantics
  using the project's existing documentation style.

### Out of Scope

- Auditing or rewriting any other `Creature` table row.
- Runtime source, validator, migration, save-version, schema, or gameplay
  changes.
- A new documentation-drift test or any other test change.
- New dependencies, configuration, APIs, deployment, or product direction.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Document `Creature.element` as a persisted primary-element value initialized from the species, validated as one of the six known elements, and used by type/affinity behavior. | must |
| FR-2 | Document `Creature.bondedToday` as a persisted boolean set by a bonding action and reset to `false` by nightly settlement. | must |
| FR-3 | Preserve every other `Creature` table row and all runtime behavior exactly. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | The final diff is limited to `docs/save-schema.md`. |
| NFR-2 | Wording matches the current table's concise technical style and agrees with `Creature` plus the creature validator. |
| NFR-3 | No save version, migration, dependency, configuration, source, or test changes. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | The `Creature` table contains an `element` row with the correct type and persisted/validation semantics. | FR-1 |
| AC-2 | The `Creature` table contains a `bondedToday` row with boolean type and nightly-reset semantics. | FR-2 |
| AC-3 | The final diff changes only `docs/save-schema.md`, and configured verification remains green. | FR-3, NFR-1, NFR-3 |

## Edge Cases

- `element` is not merely implied by `speciesId`: it is persisted on the
  creature and must be documented as such.
- `bondedToday` belongs to the active creature's daily care loop; stashed pets
  are frozen until returned, and nightly settlement resets the flag.
- The documentation must not invent a save-version introduction point or
  migration rule not evidenced by the current schema history.

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Decision:** The owner explicitly selected a two-field, documentation-only
  correction and declined a new regression guard.
- **Assumption:** The current `Creature` interface and validator are the
  authoritative persistence definitions for this correction.

## References

- Roadmap item `RM-4`.
- `conductor/archive/20261022-stable-partner-reserve/pr.md` — recorded documentation debt.
- `packages/sim/src/creature.ts` — persisted `Creature` interface.
- `packages/sim/src/save/validators/creature.ts` — persisted-field validation.
- `docs/save-schema.md` — current `Creature` table.
