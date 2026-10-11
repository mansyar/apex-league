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
  economy, evolution gates) are DOM-free and run in CI; `bun test --check --parallel`
  gates types + tests in one step. *2026-10-10: `--parallel` adopted with the
  voxel fuzz suite partitioned into small files (58s → ~11.5s wall; full test
  leg ~14s, floor-bound by per-seed voxelize CPU — a voxelize-perf follow-up
  track is the accepted path below the original 10s target).*

## Client
- **Build/dev server**: Vite (driven by Bun) — HMR, static output.
- **3D rendering**: Three.js — ranch scene and battle arena.
- **UI layer**: DOM/HTML overlay styled with plain CSS, driven by TypeScript
  state bindings (no UI framework at MVP; revisit if HUD complexity demands it).
- **State**: central typed game-state store; deterministic sim core separated
  from rendering so battles can run headless (future PvP/ghosts depend on this).
  *2026-10-10: battle core landed in `@apex/sim/battle` — type chart, damage,
  moves/kits/loadout, action clock, projectile resolver, tactic/temperament
  policy, endings, event log, exhibition helper (DOM-free, seeded, snapshot-
  pure); the client Spar panel consumes it without a framework.
  2026-10-10: combat prep landed — `effectiveStats` (rolled + trained),
  unlock-gated kit slicing with 2-4 loadout helpers, save v4 migration crediting
  6 trained days, spar kit gate/picker, fresh-unlock coach callout.*
  2026-10-11: cup day landed - pure `makeBracket`/`resolveCup`/`applyCupRewards`
  in `@apex/sim` (seeded from day + save, mutation-pure), `enterCup` one-sitting
  resolution in the phase machine, save v5 (`cupsWon`, `lastCupDay` with
  v4→v5 migration), full-screen client cup panel with ~1.5s pacing and a
  droopy-idle early-exit hook in the ranch scene.
  2026-10-11: live cup landed - hybrid-resolution session API in `@apex/sim`
  (`prepareCup` opens a session with the player-independent subtree
  pre-resolved byte-identically to `resolveCup`; `resolvePlayerMatch` resolves
  the player's match live from the picked kit + tactic; `completeCup`/
  `forfeitCup`/`finalizeCup` close it), the shared `playbackDriver` extracted
  from spar (timer chain, speed toggle, reduced-motion dump, slow replay -
  no DOM) now powers both Spar and the cup arena, and the client cup flow
  became DOM broadcast screens (strict-order bracket walk, coaching room,
  forfeit modal, results) with commit-at-first-fight phase bookkeeping.
  No save-schema change (v5 stays); `enterCup` remains as the headless
  one-sitting reference.*

## Server
- **Framework**: ElysiaJS on Bun (endpoints: save sync, leaderboard, ghost
  data, anonymous device-ID auth).
- **Database**: SQLite via `bun:sqlite`, accessed through Drizzle ORM for a
  typed schema; schema kept Postgres-migratable.

## Asset Pipeline
- **Creatures and ranch props**: species and scenery defined as versioned JSON
  data ("voxel DNA") - a deterministic **pure-TypeScript** generator (run by Bun
  at build time) builds part-labeled voxel meshes (SDF parts → voxel grid →
  greedy mesh) and exports GLB with a rigid hierarchy contract: named nodes +
  pivots, animated procedurally in three.js (no skinning, no baked clips).
  Ranch prop archetypes (tufts, bushes, landmark trees, rocks, food pile) use
  the same generator and are digested by the determinism gate.
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
