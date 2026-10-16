# Spec — foundation_20261009 (Phase 0: Foundation)

## Overview
Establish the project skeleton for Apex League: repository structure, build
tooling, the deterministic game-state core, the in-game calendar, persistence,
and a minimal runnable shell. This track produces no gameplay content — it
makes every Phase 1+ track cheap to land.

## Functional Requirements

### FR1 — Monorepo scaffolding
- Bun workspaces: `apps/client` (Vite, TypeScript strict, Three.js) and
  `packages/sim` (pure TypeScript, zero DOM/render imports).
- Shared `tsconfig` base; Biome config at repo root.
- Root scripts: `dev`, `check` (`bun check`), `verify`
  (`bun check && bun test --check && biome check`).

### FR2 — Headless sim core (`packages/sim`)
- Typed `GameState`, day ticker, and a phase state machine (Day phase / Cup
  placeholder) with action points as a stubbed counter.
- All transitions are pure functions; RNG is injectable/seeded.
- Runs in `bun test` with no browser (structurally free of DOM imports).

### FR3 — In-game calendar
- Day counter starting at Day 1; advance-day flow invoked by the state machine.
- Cup-day flag set every 7th in-game day, exposed in state.

### FR4 — Save/load
- Versioned JSON save schema (`version: 1`) defined in `packages/sim`.
- Migration pipeline scaffold (`vN → vN+1` chain).
- localStorage adapter in `apps/client`; autosave on day advance; load on boot
  with corrupt/absent-save fallback to fresh state.

### FR5 — App shell
- Three.js canvas with a placeholder voxel object performing a "breathe" idle
  animation.
- DOM overlay HUD stub showing day number, phase, and action points, bound to
  live sim state — proving the state → render → UI data flow end-to-end.

## Non-Functional Requirements
- Test suite runs in < 10s, deterministic (seeded RNG), DOM-free (workflow.md).
- Strict TypeScript everywhere; `bun check`, `biome check`, `bun test` clean.
- First runnable build via `bun run dev`.

## Acceptance Criteria
1. Fresh clone: `bun install && bun run dev` → browser shows 3D scene with
   breathing voxel + HUD showing `Day 1`.
2. Advancing the day increments the day in sim state; every 7th day sets the
   cup flag; HUD updates reactively.
3. Reloading the page after a day advance restores the saved day (autosave).
4. `packages/sim` imports no DOM/Three.js symbols (structurally enforced).
5. A migration function transforms a hypothetical `v0` save to `v1`
   (proved by unit test).
6. `bun run verify` passes from a clean checkout.

## Out of Scope
Creature models/species, battle logic, ranch/arena scenes, actual cup
resolution, ElysiaJS server, any UI beyond the HUD stub.
