# Live PvP Foundation Spike — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track delivers the foundation for live player-versus-player matches in Apex League: a versioned match protocol, a server-authoritative room and fight loop over Elysia WebSocket, and a thin client path that lets two trainers create or join a room, fight in the existing arena, and receive a verdict. It is a foundation spike, not a ranked mode: the deliverable is a working local two-client slice plus a written architecture decision that makes later reconnect, matchmaking and rating work deliberate rather than accidental.

## Problem / Motivation

The battle engine was designed from Phase 1 to run headless and deterministically, and ghost-data async rivals already prove deterministic replay transport. Live PvP remains the last major Phase 4 product item, but there is no authoritative match lifecycle, no network command/snapshot contract, and no decision record for trust, tick rate, reconnect or persistence. Without this foundation, later work risks building ranked features on a relay model that cannot be trusted, or a client-authoritative shortcut that must be thrown away. The player-facing effect is that the deployed slice has no synchronous way to fight another trainer.

## Goals & Success Metrics

- **Goal:** Prove a server-authoritative two-client match loop using the existing deterministic sim and Elysia server, without changing save schema, `SIM_VERSION`, balance gates or dependencies.
- **Metric:** Two local browser clients can create/join a room by code, authenticate with existing trainer identity, exchange high-level intents at 20 Hz, receive 50 Hz sim snapshots at 20 Hz, reach a verdict, and return cleanly to the ranch with zero console errors.
- **Goal:** Record the architecture decisions and deferred trade-offs so later matchmaking, reconnect and rating tracks start from an agreed boundary.
- **Metric:** A committed decision record covers authority, transport, tick model, command vocabulary, disconnect, spectator, matchmaking and rating, with each deferral given a reason.
- **Goal:** Keep every existing invariant green.
- **Metric:** Full verification chain, balance, determinism gate, module-size guards and fuzz sweep pass; final sim hash and artifact digests are unchanged.

## Scope

### In Scope

- A versioned, DOM-free live-match protocol in the existing shared sim package (`packages/sim/src/live/`): room create/join, ready, intent, snapshot, verdict and error messages.
- A pure server-side room registry and match state machine: room codes, two seats, trainer identity/passphrase validation, ready-to-start transition, forfeit-on-disconnect, and clean teardown.
- A server-authoritative match loop: clients send high-level intents at 20 Hz; the server steps the existing continuous sim at 50 Hz; snapshots are broadcast at 20 Hz using the dense stream format.
- An Elysia WebSocket route wired to the room state machine and match loop, tested through the injectable in-memory app with no port or real network.
- A small client spar-invite surface that creates/joins a room, shows the code and connection state, and hands the match to the existing arena for rendering.
- A client transport adapter that sends intents and applies snapshots without changing arena staging, camera or choreography contracts.
- A committed decision record under `verification/` covering the chosen model and every deferred trade-off.
- Unit/integration tests, module-cap compliance, full `verify`/`build`, and a local two-client browser proof at desktop and phone widths with console check.

### Out of Scope

- Matchmaking queues, ladders, ratings, match history, stats tables, persistence or save-schema changes.
- `SIM_VERSION` changes, balance-gate changes, pacing fences or debt-pin changes.
- Reconnect tokens, pause/resume, spectator mode and replay upload.
- WebRTC, STUN/TURN, new runtime dependencies or changes to CORS/TLS/Coolify configuration.
- Redesign of the arena, scene, camera, choreography, audio or onboarding.
- Physical device-lab verification (human-only), deployed-server smoke tests, and any production rollout beyond the existing server image.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Define a versioned, DOM-free live-match protocol (room create/join, ready, intent, snapshot, verdict, error) in `packages/sim/src/live/` with pure tests. | must |
| FR-2 | Implement a pure server room state machine that creates rooms by code, joins exactly two identity-authenticated trainers, tracks ready state, starts one match, forfeits on disconnect and tears down cleanly. | must |
| FR-3 | Implement a server-authoritative match loop that accepts 20 Hz high-level intents, steps the existing 50 Hz continuous sim, and emits 20 Hz dense-stream snapshots plus a final verdict. | must |
| FR-4 | Expose the room lifecycle and match loop through an Elysia WebSocket route on the injectable app, with integration tests that open no port. | must |
| FR-5 | Add a small client spar-invite surface for create/join/room code/connection state that is keyboard reachable, focus-visible and polite-announced. | must |
| FR-6 | Add a client transport adapter that sends intents from existing arena controls and applies snapshots to the existing arena renderer, with a clean return to the ranch on verdict or disconnect. | must |
| FR-7 | Record an architecture decision covering authority, transport, tick model, command vocabulary, disconnect, spectator, matchmaking and rating, with reasons for the chosen model and each deferral. | must |
| FR-8 | Produce verification evidence with unit/integration counts, module-cap results, full-gate results and two-client local browser screenshots at desktop 1440×900 and phone 393×852 with zero console errors. | must |
| FR-9 | Re-prove final invariants: `bun run verify && bun run build`, balance, determinism gate and fuzz sweep all exit 0 with unchanged hashes and scope confined to approved paths. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Determinism remains byte-identical; `SIM_VERSION`, artifact digests, final sim hash `0xff6f3d62`, balance gates, pacing pins and save schema are unchanged. |
| NFR-2 | Module-size guards stay green without allowlists: server, client and sim modules stay under 12,288 bytes; voxel modules under 24,576 bytes. |
| NFR-3 | No new runtime dependency, package, CORS/TLS change or stack element is introduced; WebSocket support comes from the existing Bun/Elysia server. |
| NFR-4 | Trainer identity is reused through the existing passphrase header; passphrases never appear in URLs, room codes or logs. |
| NFR-5 | UX principle 8 holds at 393×852 and 852×393: no horizontal scroll, no occluded controls, readable copy, visible focus, clean console; reduced-motion preferences remain respected. |
| NFR-6 | Unit and integration tests are deterministic: fake clock/transport only, no real timers, ports, network calls or background work. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Protocol types and pure protocol tests exist; malformed or unknown message kinds are rejected without throwing. | FR-1 |
| AC-2 | Room state-machine tests cover create, join, duplicate join, third joiner, both-ready start, disconnect forfeit and teardown; passphrase failure is rejected. | FR-2 |
| AC-3 | Loop tests prove 20 Hz intent ingress, 50 Hz sim stepping, 20 Hz snapshot emission and one terminal verdict using a fake clock and transport. | FR-3 |
| AC-4 | WebSocket integration tests exercise create/join/ready/intents/verdict through the in-memory app with no port and no real network. | FR-4 |
| AC-5 | Spar-invite panel tests plus visual proof show create/join, room code, connection state and visible keyboard focus; match-state changes are announced politely. | FR-5 |
| AC-6 | A local two-client browser run reaches a verdict and returns both clients to the ranch with zero console errors; disconnection also returns cleanly. | FR-6 |
| AC-7 | `verification/decision.md` exists and records all eight decision areas with reasons and explicit deferrals. | FR-7 |
| AC-8 | `verification/integrated.md` records exact commands, counts, module-cap results, desktop/phone screenshot paths and console result. | FR-8 |
| AC-9 | `bun run verify && bun run build`, `bun run balance`, `bun run gate:determinism` and `bun run test:fuzz` all exit 0 with unchanged final hash and artifact digests. | FR-9 |
| AC-10 | Scope proof shows no change to `SIM_VERSION`, save schema, dependency manifests, balance gates, pacing pins, CORS, deployment config or unrelated product code. | FR-9, NFR-1, NFR-3 |

## Edge Cases

- Duplicate room code or a third joiner: reject with a typed error and leave the existing room untouched.
- Disconnect before both ready: remove the seat, delete the empty room and release the code.
- Disconnect mid-match: remaining client receives an opponent-forfeit verdict; both transports close; no zombie match state remains.
- Malformed, unknown or oversized messages: reject with a typed error, never crash the room loop.
- Stale or out-of-order intent sequence numbers: ignore with a counted diagnostic; do not step the sim twice.
- Trainer passphrase failure or identity mismatch: deny join before a seat is assigned.
- Background tab throttling: client re-syncs from the next snapshot; server loop never depends on client frame cadence.
- Reduced motion: match announcements and focus remain usable while cinematic arena cues stay suppressed.
- Narrow viewport or landscape: spar invite controls remain reachable with no horizontal scroll or occluded fight action.
- Module cap breach: split protocol, room and loop modules by concern rather than adding an allowlist.
- Unavailable deployed server: the spike uses a local server; no product UI promises a remote service it cannot reach.

## Dependencies

- **Tracks:** none. Roster Wave 2 (`20261118-roster-wave-2`) and all earlier tracks are complete and merged.
- **External:** none. The local proof uses the repository's Bun/Elysia server; no new credentials, services or deployment are required.

## Open Questions & Assumptions

- **Owner decision 2026-11-19:** authority is server-authoritative, transport is Elysia WebSocket, tick model is 20 Hz intents / 50 Hz sim / 20 Hz snapshots, and the deliverable is a thin slice plus decision record.
- **Owner decision 2026-11-19:** match entry uses a room code plus existing trainer identity; no matchmaking or rating in this track.
- **Owner decision 2026-11-19:** intents are high-level (doctrine/tactic choice plus move triggers) mapped through the existing controller profile; full positional steering is deferred.
- **Owner decision 2026-11-19:** disconnect forfeits immediately and returns both clients cleanly; reconnect, pause/resume and spectator are deferred with reasons in the decision record.
- **Assumption:** the continuous dense stream already carries everything the renderer needs for a live snapshot, so no new visual protocol is required. If a field is missing, the protocol version is bumped rather than overloading an existing field.
- **Assumption:** local two-client proof is sufficient for the spike; production latency, STUN/TURN, Coolify WebSocket behaviour and device-lab checks remain separate follow-ups.

## References

- `conductor/product.md` — Phase 4 live PvP and post-MVP roadmap.
- `conductor/tech-stack.md` — Elysia server, SQLite/Drizzle, deterministic headless battle core, ghost-data seam.
- `conductor/workflow.md` — verification layers, phase contract and strict review policy.
- `packages/sim/src/battle/continuous/stream.ts` — dense stream format and replay seam.
- `apps/server/src/app.ts` — injectable Elysia app and route composition.
- `conductor/archive/20261027-ghost-data-async-rivals/` — deterministic replay transport precedent.
