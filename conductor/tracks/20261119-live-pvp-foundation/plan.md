# Live PvP Foundation Spike — Implementation Plan

> **Branch:** `feat/20261119-live-pvp-foundation`
> **Base:** `main` @ `ab1c83f98a512a9a973e8480dc8fe18faad5be7d`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Protocol, room state machine, and authoritative loop

- **Goal:** A versioned DOM-free match protocol, a pure two-seat room state machine, and a server-authoritative match loop step the existing 50 Hz sim from 20 Hz intents and emit 20 Hz snapshots, all proven by deterministic tests.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, NFR-1, NFR-2, NFR-3, NFR-6, AC-1, AC-2, AC-3
- **Touches:** `packages/sim/src/live/**`, `packages/sim/src/index.ts`, `apps/server/src/live/**` (excluding `route.ts` and `route.test.ts`), `conductor/tracks/20261119-live-pvp-foundation/verification/phase-1.md`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`
- **Status:** verified

- [x] **P1.T1: Define the live-match protocol** — covers: FR-1, AC-1
  - [x] **P1.T1.1: Add the versioned message union (create, join, ready, intent, snapshot, verdict, error) and its shared types in `packages/sim/src/live/`, exported from the sim package root**
  - [x] **P1.T1.2: Add pure parse/validate helpers that reject malformed, unknown or oversized messages without throwing, with bun tests**
- [x] **P1.T2: Implement the pure room state machine** — covers: FR-2, AC-2
  - [x] **P1.T2.1: Create rooms by code, join exactly two identity-authenticated trainers, track ready state and start one match**
  - [x] **P1.T2.2: Reject duplicate/third joins and passphrase failures; forfeit on disconnect and tear down the room, with bun tests**
- [x] **P1.T3: Implement the authoritative match loop** — covers: FR-3, AC-3
  - [x] **P1.T3.1: Accept 20 Hz high-level intents, step the existing continuous sim at 50 Hz and emit 20 Hz dense-stream snapshots through a fake clock and transport**
  - [x] **P1.T3.2: Emit one terminal verdict, reuse the existing dense stream, and test stale/out-of-order intents without double-stepping**

**Result:** verified
**Checkpoint:** 1f4fd107
**Evidence:** conductor/tracks/20261119-live-pvp-foundation/verification/phase-1.md

## Phase 2: Elysia WebSocket route

- **Goal:** The room lifecycle and authoritative loop are reachable through an Elysia WebSocket route on the injectable app, with no port or real network in tests.
- **Depends on:** Phase 1
- **Covers:** FR-4, AC-4
- **Touches:** `apps/server/src/live/route.ts`, `apps/server/src/live/route.test.ts`, `apps/server/src/app.ts`, `conductor/tracks/20261119-live-pvp-foundation/verification/phase-2.md`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`
- **Status:** verified

- [x] **P2.T1: Wire the WebSocket route** — covers: FR-4, AC-4
  - [x] **P2.T1.1: Register the route on the injectable Elysia app and bind it to the room registry and match loop without opening a port**
  - [x] **P2.T1.2: Add in-memory integration tests for create, join, ready, intents, verdict, disconnect and malformed messages**

**Result:** verified
**Checkpoint:** 1d3c1e9d
**Evidence:** conductor/tracks/20261119-live-pvp-foundation/verification/phase-2.md

## Phase 3: Client slice, decision record, and final proof

- **Goal:** Two local browser clients can create or join a room, fight in the existing arena, reach a verdict and return cleanly; the architecture decisions and full invariant evidence are committed.
- **Depends on:** Phase 2
- **Covers:** FR-5, FR-6, FR-7, FR-8, FR-9, NFR-4, NFR-5, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10
- **Touches:** `apps/client/src/live/**`, `apps/client/src/main.ts`, `apps/client/src/app/**`, `apps/client/src/ui/**`, `apps/client/src/base.css`, `conductor/tracks/20261119-live-pvp-foundation/verification/decision.md`, `conductor/tracks/20261119-live-pvp-foundation/verification/phase-3.md`, `.conductor/evidence/20261119-live-pvp-foundation/**`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz` plus the visual layer per `workflow.md` (`playwright-cli` against `bun run dev`, desktop 1440×900 and phone 393×852, two local clients, console check)
- **Status:** pending

- [ ] **P3.T1: Add the spar-invite surface** — covers: FR-5, AC-5
  - [ ] **P3.T1.1: Add create/join controls, room-code display and connection-state feedback, reusing the broadcast UI kit**
  - [ ] **P3.T1.2: Prove visible keyboard focus, polite match-state announcements and 393×852/852×393 layout with no horizontal scroll**
- [ ] **P3.T2: Wire the client transport and arena handoff** — covers: FR-6, AC-6
  - [ ] **P3.T2.1: Send high-level intents and apply snapshots to the existing arena renderer without changing staging, camera or choreography contracts**
  - [ ] **P3.T2.2: Return cleanly to the ranch on verdict or disconnect and prove the full two-client local flow with zero console errors**
- [ ] **P3.T3: Record decisions and final evidence** — covers: FR-7, FR-8, FR-9, AC-7, AC-8, AC-9, AC-10
  - [ ] **P3.T3.1: Write `verification/decision.md` covering authority, transport, tick model, command vocabulary, disconnect, spectator, matchmaking and rating with reasons and deferrals**
  - [ ] **P3.T3.2: Write `verification/phase-3.md` with exact commands, counts, module-cap results, screenshot paths, console result and scope proof**

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 2
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
