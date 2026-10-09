# Technology Stack — Apex League

## Runtime & Tooling
- **Runtime / package manager**: Bun (1.3+). All scripts run through `bun`.
- **Language**: TypeScript, strict mode. Single language across client, server,
  and tooling.
- **Type checking**: `bun check` (script: `"check": "bun check"`). Runs in CI
  and before every commit; `tsc` reserved for emitting `.d.ts` only.
- **Lint + format**: Biome (`biome check --write`). Single tool replaces
  ESLint+Prettier.
- **Tests**: `bun test` (bun:test). Pure-logic suites (battle resolution, sim
  economy, evolution gates) are DOM-free and run in CI; `bun test --check` gates
  types + tests in one step.

## Client
- **Build/dev server**: Vite (driven by Bun) — HMR, static output.
- **3D rendering**: Three.js — ranch scene and battle arena.
- **UI layer**: DOM/HTML overlay styled with plain CSS, driven by TypeScript
  state bindings (no UI framework at MVP; revisit if HUD complexity demands it).
- **State**: central typed game-state store; deterministic sim core separated
  from rendering so battles can run headless (future PvP/ghosts depend on this).

## Server
- **Framework**: ElysiaJS on Bun (endpoints: save sync, leaderboard, ghost
  data, anonymous device-ID auth).
- **Database**: SQLite via `bun:sqlite`, accessed through Drizzle ORM for a
  typed schema; schema kept Postgres-migratable.

## Asset Pipeline
- **Creatures**: species defined as versioned JSON data ("voxel DNA") — a
  deterministic **pure-TypeScript** generator (run by Bun at build time)
  builds part-labeled voxel meshes (SDF parts → voxel grid → greedy mesh)
  and exports GLB with a rigid hierarchy contract: named nodes + pivots,
  animated procedurally in three.js (no skinning, no baked clips).
  *2026-10-09 deviation: replaced the originally planned Blender Python
  generator — the part-hierarchy rig makes weight painting unnecessary,
  and pure TS keeps the stack single-language, CI-hash-verifiable, and
  browser-capable for runtime seed variants (e.g. live breeding previews).*
  Generator scripts and DNA specs are checked into the repo; generated
  GLBs are committed, not generated at runtime.
- **Icons**: 2D UI portraits rendered offline from the same GLBs
  (headless three.js render step).
- **Audio**: CC0 packs (freesound/Kenney), compressed for web delivery.

## Quality Gates
- `bun check` clean, `biome check` clean, `bun test` green — required before
  any commit lands (see workflow.md).

## Deployment (target)
- Client: static hosting (Cloudflare Pages or GitHub Pages).
- Server: single small Bun container (Fly.io or equivalent) — deferred until
  Phase 3 per the roadmap.
