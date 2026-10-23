# Sim & Voxel Size Guard + Save-Migration Decomposition — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track extends the repository's 12 KB module-size guard — the only structural
rule that stops a module from accumulating concerns — from `apps/client` to
`packages/sim` and `packages/voxel`, and brings every module in those two
packages under their cap. The centrepiece is `packages/sim/src/save/migrate.ts`
(40,587 B), which today holds all 24 save-version migration steps inside one
record literal; it is decomposed into one module per version step behind a
barrel, with no change to behaviour. The result: every package enforces its own
cap, and the file that owns the save format becomes small enough to actually
read.

## Problem / Motivation

The 12 KB cap came from `ranch_decomposition_20261018` (FR-8) and is enforced by
`apps/client/src/module-size.test.ts` — a 154-line guard with a walk assertion,
an exactly-at-cap edge case, and a temp-folder negative control. It is the
repo's only enforcement of "one module, one concern", and it covers the client
only.

`packages/sim` and `packages/voxel` have no equivalent. Six sim modules exceed
12 KB today, and nothing stops them growing:

| module | bytes | what it actually holds |
|---|---|---|
| `save/migrate.ts` | 40,587 | 24 migration steps + validator + driver |
| `battle/clock.ts` | 20,933 | clock types + constants + engine |
| `save/storage.ts` | 20,271 | 8 validators + adapter I/O |
| `legacy.ts` | 17,229 | lineage + perks + graduation + inheritance |
| `breeding.ts` | 16,930 | pairing + drift + gift eggs |
| `cup/session.ts` | 12,661 | bracket walk + placement + scalps |

`save/migrate.ts` is the sharpest case. It grew with every save-version bump —
branching-evolution, affinity-drift, electric-species-line and
stable-partner-reserve each added steps to it — and it now holds a 24-entry
record (`migrations[0]`…`migrations[23]`) where each entry is already an
independent, self-contained step function. A file that large stops being
reviewable: a diff touches one entry, but the file is a wall, and the cost of
"just one more migration" is invisible.

Who feels it: the maintainer adding save v25 (the next content track will), and
the future Phase 3 server, which must own save migrations and will read this
file to learn the format. If it is not solved, `migrate.ts` becomes the file
nobody dares to touch, the server track inherits a 40 KB monolith, and the client
guard's precedent stays unapplied to the two packages that hold the game's
actual rules.

Voxel needs a different answer. Voxel modules are one hand-authored creature
model each (`axolotl.ts` 20,598 B, `drake.ts` 16,310 B, `storm_hound.ts`
16,101 B, `bovine.ts` 15,970 B, `face.ts` 14,510 B). The client's rationale —
*"a module that grows past it has stopped owning one concern"* — does not
describe them, and splitting them would be churn that buys nothing. But they are
also currently unguarded, and `axolotl.ts` can drift without comment. A **24 KB**
cap fits both facts: no voxel file is over it today, and the archetype builders
that are the package's real risk sit under a limit that would flag genuine
concern-accumulation.

## Goals & Success Metrics

- **Goal:** every non-test module in `packages/sim` is at most 12,288 bytes.
  - **Metric:** the new `packages/sim/src/module-size.test.ts` passes; the full
    suite is green.
- **Goal:** every non-test module in `packages/voxel` is at most 24,576 bytes.
  - **Metric:** the new `packages/voxel/src/module-size.test.ts` passes.
- **Goal:** the save-migration chain is decomposed into one module per version
  step.
  - **Metric:** `packages/sim/src/save/migrations/` holds 24 step modules plus a
    barrel; `save/migrate.ts` is at most 12,288 bytes.
- **Goal:** zero behaviour change.
  - **Metric:** `bun run verify` passes end to end (typecheck → full test suite
    → biome → determinism gate) with no existing test edited, and the
    determinism gate's committed GLB and manifest hashes are unchanged.
- **Goal:** the guard proves it can fail.
  - **Metric:** each new guard suite contains a negative control that fails on a
    synthetic oversized module and removes its fixture afterwards.

## Scope

### In Scope

1. `packages/sim/src/module-size.test.ts` — new guard, 12,288 B cap, mirroring
   the client guard's shape.
2. `packages/voxel/src/module-size.test.ts` — new guard, 24,576 B cap.
3. `packages/sim/src/save/migrate.ts` → driver + validator, a
   `save/migrations/` folder with one module per version step (`v0`…`v23`), and
   a barrel composing the record.
4. `packages/sim/src/save/storage.ts` — split the 8 validators from the adapter
   I/O.
5. `packages/sim/src/battle/clock.ts` — split the clock's types/constants from
   its engine.
6. `packages/sim/src/legacy.ts` — split lineage/perks from
   graduation/inheritance.
7. `packages/sim/src/breeding.ts` — split pairing/drift from gift-egg handling.
8. `packages/sim/src/cup/session.ts` — split the bracket walk from
   placement/scalps.
9. `packages/sim/src/save/migrations.test.ts` — a new suite that locks the
   migration chain.

### Out of Scope

- Any gameplay, balance, content, copy, art, or save-schema change.
  `SAVE_VERSION` stays 24.
- Any change to `apps/client` — its 12 KB guard already passes and stays
  untouched.
- Splitting the voxel archetype files. None exceeds the 24 KB cap; the cap is
  the deliverable, not a split.
- New runtime dependencies in any workspace.
- The 142 production modules with no co-located test — a separate track.
- The Phase 3 server track and everything it implies.
- Sharing one guard helper across the three packages, or restructuring the
  client guard to share one.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | A test in `packages/sim` fails when any non-test module under `packages/sim/src` exceeds 12,288 bytes, naming the path, its byte size, and how many bytes over. The walk is recursive and exempts no module by name. | must |
| FR-2 | A test in `packages/voxel` fails when any non-test module under `packages/voxel/src` exceeds 24,576 bytes, on the same terms as FR-1. | must |
| FR-3 | `packages/sim/src/save/migrate.ts` is at most 12,288 bytes, and each of the 24 version steps lives in its own module under `packages/sim/src/save/migrations/`, with a barrel that composes them into the migration record in version order. | must |
| FR-4 | `packages/sim/src/battle/clock.ts`, `save/storage.ts`, `legacy.ts`, `breeding.ts`, and `cup/session.ts` are each at most 12,288 bytes, split along the seams listed in Scope. | must |
| FR-5 | A test asserts the migration record holds a step for every version from 0 to `SAVE_VERSION - 1`, that a v0 payload migrates through the whole chain to the current version, and that migrating an already-current save is a no-op. | must |
| FR-6 | The public surface of `packages/sim` is unchanged: every export that exists before this track still exists under the same name with the same signature, and every existing import path still resolves. | must |
| FR-7 | No file under `packages/voxel/src` is modified by this track, apart from the new guard test. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Behaviour-identical: the migration chain's output for any input is identical to the pre-track output. |
| NFR-2 | Determinism preserved: `bun run gate:determinism` passes and the committed GLB and manifest hashes are unchanged. |
| NFR-3 | No new runtime dependency in any workspace. |
| NFR-4 | The guards are cheap and side-effect free: each completes in under 2 seconds and writes nothing into the repository (the negative control uses a temp directory and removes it, even when an assertion fails). |
| NFR-5 | `bun run check` passes for all three workspaces with no `any` escape and no `@ts-ignore`. |
| NFR-6 | `biome check` is clean; the new modules follow `conductor/code_styleguides/typescript.md` and `general.md` — named exports, no default exports, explicit return types on public functions. |
| NFR-7 | No import cycle is introduced. The new migration modules and split modules must not import their own barrel back. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `bun test packages/sim/src/module-size.test.ts` passes, and its negative control fails on a synthetic oversized module and leaves no fixture behind. | FR-1 |
| AC-2 | `bun test packages/voxel/src/module-size.test.ts` passes, and asserts a module of exactly 24,576 bytes is accepted while 24,577 is rejected. | FR-2 |
| AC-3 | `packages/sim/src/save/migrate.ts` is at most 12,288 bytes, `packages/sim/src/save/migrations/` contains one module per version step plus a barrel, and `bun run verify` is green. | FR-3 |
| AC-4 | The five modules named in FR-4 are each at most 12,288 bytes, as reported by the new sim guard. | FR-4 |
| AC-5 | The new migration suite passes, and fails if a step is removed from the record. | FR-5 |
| AC-6 | `bun run check` is green for all three workspaces, the client's existing suites pass unchanged, and no existing test file is edited. | FR-6 |
| AC-7 | `git diff --name-only` shows no modified file under `packages/voxel/src` other than the new guard test. | FR-7 |
| AC-8 | `bun run gate:determinism` passes and the committed artifact hashes are unchanged. | NFR-2 |
| AC-9 | `bun run verify` passes end to end: typecheck, full test suite, `biome check`, determinism gate. | NFR-1, NFR-3, NFR-5, NFR-6 |

## Edge Cases

- A module of exactly the cap passes; one byte over fails. The client guard
  already asserts this boundary, and the new guards inherit it.
- Test files are exempt. `packages/sim/src/save/save.test.ts` is 67,127 B today
  and must stay exempt, or the guard would fail on the suite rather than on the
  module.
- The negative control must clean up in a `finally` block, so a killed CI run
  leaves no fixture in the repo.
- The walk must descend into nested folders (`save/`, `battle/`, `cup/`), not
  only the package root.
- A barrel that re-exports the new modules must itself stay under the cap:
  `packages/sim/src/index.ts` is 6,227 B today and must be re-checked after the
  split.
- The migration record's key order is data, not presentation:
  `migrations[0]`…`migrations[23]` map version N → N+1. A barrel that drops or
  reorders a key is a silent save-loss bug — FR-5 is the guard against it.
- `legacy.ts` and `breeding.ts` are mutually coupled — `breeding.ts` re-exports
  `retireeRecord` from `legacy.ts` — so the two splits must not introduce a
  cycle.
- A save whose version is above `SAVE_VERSION` must still be rejected with the
  same message (`invalid save: future version N`).
- A save with no `version` field must still be rejected with
  `invalid save: missing version`.
- `STARTER_GRANT_SEED` and `validateStateShape` stay exported from
  `save/migrate.ts`: `save/storage.ts`, `save/transfer.ts`, `save.test.ts` and
  `packages/sim/src/index.ts` all import from it.

## Dependencies

- **Tracks:** none.
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** 12,288 B is the client's existing cap, reused verbatim so the
  repo has one number for logic modules; 24,576 B for voxel is the current
  voxel maximum (20,598 B) plus ~19% headroom, since the project has never
  ratified a voxel cap.
- **Assumption:** `packages/sim` and `packages/voxel` contain no `.d.ts` shims
  today, so the new guards need no name-based exemption. If one is added later,
  the guard must exempt it explicitly, exactly as the client exempts
  `vite-env.d.ts`.
- **Assumption:** the 142 production modules without a co-located test stay that
  way; this track's only new test infrastructure is the two guards and the
  migration suite.
- **Question (resolved 2026-10-22):** how the 24 steps are split — one module
  per version step, over grouping by era or by domain.
- **Question (resolved 2026-10-22):** whether voxel gets the same 12 KB cap —
  no; 24 KB fits what a voxel module actually is.

## References

- `apps/client/src/module-size.test.ts` — the guard being mirrored.
- `conductor/archive/ranch_decomposition_20261018` — FR-8, which introduced the
  12 KB cap.
- `conductor/archive/20261020-client-decomposition` — the house precedent for a
  behaviour-identical split.
- `conductor/workflow.md` — the size-cap rule, the verification layers, and the
  commit/PR policy this track runs under.
- `conductor/tech-stack.md` — the module-cap section.
