# Spec — Cup Module Refactor (`cup_module_refactor_20261018`)

## Overview
Decompose the two monolithic cup modules — `packages/sim/src/cup.ts` (25.5 KB) and
`apps/client/src/cup.ts` (31.6 KB, the largest source file in the repo) — into
focused submodules **without changing observable behavior**. The track
establishes the `cup/` module pattern already proven by
`ui_layer_refactor_20261016` (hud.ts → hud/), pays down the repo's two biggest
files, and converts the hardcoded `bossForCup()` tier routing into table-driven
data ahead of future tier/content growth. Sim lands first (strongest test
coverage, stabilizes the API), then the client decomposes against it.

## Goals
- Split `packages/sim/src/cup.ts` into `cup/` submodules behind a barrel
  re-export; public API unchanged.
- Convert `bossForCup()` hardcoded if/else routing into milestone→boss table
  data + thin lookup, byte-identical routing results.
- Split `apps/client/src/cup.ts` into an `apps/client/src/cup/` submodule tree
  (screens, coach room, results, session flow / arena handoff), mirroring the
  `hud/` pattern.
- Extract pure view-models (`spar/loadout-vm.ts` style) for testable client
  logic: screen-flow ordering, results math, give-up placement semantics.
- Pin **semantic golden tests before any code moves**: bracket match
  order/labels, screen sequence, verdict/reward copy, results math, boss
  routing table.

## Non-Goals
- Any user-visible change: no copy, CSS, DOM-structure, or save-schema changes.
- `cup.css` (23.5 KB) restructuring — deferred.
- `migrate.ts` `baseState()` dedup, breeding/branching feature work, sim API
  redesign beyond the barrel.
- `docs/save-schema.md` staleness — belongs to a future hygiene track.

## Functional Requirements
- **FR1 — Sim decomposition**: bracket construction, live `CupSession`,
  placement rule, rival verdicts live in `packages/sim/src/cup/` submodules;
  `packages/sim/src/cup.ts` remains as a thin barrel; no consumer imports
  change.
- **FR2 — Data-driven boss routing**: `bossForCup()` reads a frozen
  milestone→boss table; routing output identical for all tiers
  (golden-proven, all six bosses covered).
- **FR3 — Client decomposition**: `apps/client/src/cup.ts` split into `cup/`
  submodules; the orchestration entrypoint stays importable as before.
- **FR4 — Pure view-models**: cup-domain decision logic becomes DOM-free pure
  modules with unit tests.
- **FR5 — Goldens first**: semantic golden tests committed **before** the
  first relocation commit; they pin behavior, not bytes.
- **FR6 — Size cap**: no cup-domain source file over ~12 KB after the split.
- **FR7 — Gates**: `bun run verify` green throughout; determinism gate
  untouched (no RNG/sim-semantic changes).

## Acceptance Criteria
1. Golden tests exist and pass prior to any code relocation (verifiable via
   commit order).
2. Both monoliths reduced to thin barrels/entrypoints; every new cup-domain
   module ≤ ~12 KB.
3. `bun run verify` green; suite runtime unchanged or faster.
4. All six authored bosses route identically under the table-driven
   `bossForCup`.
5. Each phase checkpoint includes mock.html golden comparison + browser probe
   evidence (workflow protocol).
6. Zero diffs in user-visible copy, DOM structure, CSS, or save schema.
