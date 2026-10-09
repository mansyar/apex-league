# Plan — foundation_20261009 (Phase 0: Foundation)

Status markers: `[ ]` pending · `[~]` in progress · `[x]` complete (+ commit SHA)

## Phase A — Repository Scaffolding
- [x] Task: Scaffold Bun workspaces monorepo — root `package.json`, shared
      `tsconfig.base.json`, `biome.json`, `apps/client`, `packages/sim`  `e1b00fc`
  - Verify workspaces resolve (`bun install` clean)
- [x] Task: Wire tooling scripts - `dev`, `check`, `verify`
      (`bun check && bun test --check && biome check`); strict TS everywhere  `c22e06d`
- [x] Task: Phase Verification & Checkpoint (refer to workflow.md)  `[checkpoint: 099ab3e]`

## Phase B — Headless Sim Core (logic-bearing — TDD)
- [x] Task: Write failing tests — `GameState` shape, day ticker, calendar
      (day advance, cup flag every 7th day)  `3d82f2d`
- [x] Task: Implement `GameState` + day ticker + calendar to green  `3d36cf9`
- [x] Task: Write failing tests — phase state machine (Day ↔ Cup placeholder),
      action points stub, seeded/injectable RNG seam  `6cbe7c1`
- [x] Task: Implement phase state machine to green  `f3213ad`
- [x] Task: Phase Verification & Checkpoint (refer to workflow.md)  `[checkpoint: 3983382]`

## Phase C — Persistence (logic-bearing — TDD)
- [x] Task: Write failing tests — save schema `v1`, migration chain
      (`vN → vN+1`, proven with synthetic `v0`), localStorage adapter with
      mocked storage (corrupt/absent-save fallback)  `4d74c9a`
- [x] Task: Implement schema, migrations, adapter to green  `f69b681`
- [x] Task: Phase Verification & Checkpoint (refer to workflow.md)  `[checkpoint: 3e1ce78]`

## Phase D — App Shell (rendering — manual verification)
- [x] Task: Three.js canvas in `apps/client` with placeholder voxel performing
      breathe idle animation  `ed717a9`
- [x] Task: DOM HUD stub bound to live sim state — day number, phase, action
      points — plus dev "advance day" control  `067f6d0`
- [ ] Task: Wire autosave on day advance + save load on boot (fresh-state
      fallback)
- [ ] Task: Phase Verification & Checkpoint (refer to workflow.md)
