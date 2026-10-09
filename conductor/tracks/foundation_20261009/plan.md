# Plan — foundation_20261009 (Phase 0: Foundation)

Status markers: `[ ]` pending · `[~]` in progress · `[x]` complete (+ commit SHA)

## Phase A — Repository Scaffolding
- [x] Task: Scaffold Bun workspaces monorepo — root `package.json`, shared
      `tsconfig.base.json`, `biome.json`, `apps/client`, `packages/sim`  `e1b00fc`
  - Verify workspaces resolve (`bun install` clean)
- [x] Task: Wire tooling scripts — `dev`, `check`, `verify`
      (`bun check && bun test --check && biome check`); strict TS everywhere  `c22e06d`
- [ ] Task: Phase Verification & Checkpoint (refer to workflow.md)

## Phase B — Headless Sim Core (logic-bearing — TDD)
- [ ] Task: Write failing tests — `GameState` shape, day ticker, calendar
      (day advance, cup flag every 7th day)
- [ ] Task: Implement `GameState` + day ticker + calendar to green
- [ ] Task: Write failing tests — phase state machine (Day ↔ Cup placeholder),
      action points stub, seeded/injectable RNG seam
- [ ] Task: Implement phase state machine to green
- [ ] Task: Phase Verification & Checkpoint (refer to workflow.md)

## Phase C — Persistence (logic-bearing — TDD)
- [ ] Task: Write failing tests — save schema `v1`, migration chain
      (`vN → vN+1`, proven with synthetic `v0`), localStorage adapter with
      mocked storage (corrupt/absent-save fallback)
- [ ] Task: Implement schema, migrations, adapter to green
- [ ] Task: Phase Verification & Checkpoint (refer to workflow.md)

## Phase D — App Shell (rendering — manual verification)
- [ ] Task: Three.js canvas in `apps/client` with placeholder voxel performing
      breathe idle animation
- [ ] Task: DOM HUD stub bound to live sim state — day number, phase, action
      points — plus dev "advance day" control
- [ ] Task: Wire autosave on day advance + save load on boot (fresh-state
      fallback)
- [ ] Task: Phase Verification & Checkpoint (refer to workflow.md)
