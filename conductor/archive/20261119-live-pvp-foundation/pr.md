## Summary

Adds a server-authoritative live PvP foundation: a versioned protocol, two-seat
room state machine, 20 Hz intent / 50 Hz sim / 20 Hz snapshot loop, an Elysia
WebSocket route, and a thin client invite/arena slice. No new runtime dependency
and no changes to save schema, balance, pacing, CORS or deploy configuration.

## Track

- **ID:** `20261119-live-pvp-foundation`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261119-live-pvp-foundation/spec.md`](conductor/archive/20261119-live-pvp-foundation/spec.md)
- **Plan:** [`conductor/archive/20261119-live-pvp-foundation/plan.md`](conductor/archive/20261119-live-pvp-foundation/plan.md)
- **Review:** [`conductor/archive/20261119-live-pvp-foundation/review.md`](conductor/archive/20261119-live-pvp-foundation/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Protocol, room state machine, and authoritative loop | Versioned protocol, two-seat room machine, 20/50/20 loop | verified | `1f4fd107` | Added `@apex/sim` path mapping to the server tsconfig so pure server modules can resolve protocol types |
| 2: Elysia WebSocket route | `/live` route on the injectable app, in-memory tests | verified | `1d3c1e9d` | Rework fixed two TS errors; production upgrade gap carried to Phase 3 |
| 3: Client slice, decisions, and visual proof | Two local clients fight and return cleanly | verified | `ea0865e0` | `app.listen(port)` replaced `Bun.serve({ fetch })` so Elysia's WS handler runs; startup snapshot fixed a client deadlock |
| R1: Review fixes | F1–F4 (cast mapping, seat reuse, landscape, naming) | verified | `1c91a9aa` | No CSS change needed for 852×393 |
| R2: Review fixes (round 2) | F5 (seat/side ordering in the vacated-seat flow) | verified | `f4d20715` | New non-vacuous in-memory route test proves intent alignment and correct forfeit winner |

## Requirements

- [x] `FR-1` — Versioned, parseable client/server protocol (`packages/sim/src/live/types.test.ts`, `parse.test.ts`)
- [x] `FR-2` — Two-seat room creation/join/disconnect (`apps/server/src/live/room.test.ts`, `route.test.ts`)
- [x] `FR-3` — Server-authoritative 20/50/20 match loop (`loop.test.ts`, `fight.test.ts`)
- [x] `FR-4` — Elysia WebSocket transport without a listening port in tests (`route.test.ts`)
- [x] `FR-5` — Small spar-invite panel with room code entry (`panel.ts`, screenshots)
- [x] `FR-6` — Arena handoff from dense snapshot stream (`invite.test.ts`, two-client browser proof)
- [x] `FR-7` — Architecture decision record (`verification/decision.md`)
- [x] `FR-8` — Full invariant evidence (`verification/integrated.md`)
- [x] `FR-9` — Scope proof and unchanged sim hash (five-command table)
- [x] `NFR-1` — Deterministic replay preserved (hash `0xff6f3d62`)
- [x] `NFR-2` — Module byte caps respected (largest live module 9561 B of 12288 B)
- [x] `NFR-3` — No new runtime dependency; no manifest/CORS/deploy changes
- [x] `NFR-4` — Passphrase travels in the message body, never the URL
- [x] `NFR-5` — Desktop, portrait and landscape visual proof with clean console
- [x] `NFR-6` — Fake clock and transport in tests; no production timer
- [x] `AC-1`…`AC-10` — See `review.md` and `verification/integrated.md`

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| full verify | `bun run verify` | pass — 4443 pass / 1 skip / 0 fail | `conductor/archive/20261119-live-pvp-foundation/verification/integrated.md` |
| lint | `biome check` | pass | integrated.md |
| typecheck | `bun run check` | pass | integrated.md |
| build | `bun run build` | pass | integrated.md |
| balance | `bun run balance` | pass — capShare 30.8%, 34 gates | integrated.md |
| determinism | `bun run gate:determinism` | pass — hash `0xff6f3d62` | integrated.md |
| fuzz | `bun run test:fuzz` | pass — 139 pass / 0 fail | integrated.md |
| browser | two local clients, 1440×900 / 393×852 / 852×393 | pass — 0 console errors | integrated.md |

## Media

![Live arena on desktop](https://github.com/user-attachments/assets/2d389a75-cd17-455d-82a0-7ed04ccbba73)

![Live arena on phone](https://github.com/user-attachments/assets/ff9f7653-7282-438b-a8b4-df6e64311151)

![Forfeit verdict on desktop](https://github.com/user-attachments/assets/335d820a-792a-444f-be1f-9a2b1e317ce7)

## Review

- **Verdict:** PASS (final delta review clean, no findings remain)
- **Rounds:** 2 fix rounds (R1, R2; 3 review passes total)
- **Fixed:** F1–F4 in R1; F5 in R2
- **Accepted/deferred:** none (strict mode)

## Deviations and risks

- `apps/server/tsconfig.json` gained an `@apex/sim` path mapping so pure server
  modules can import the protocol types without a workspace dependency change.
- `apps/server/src/main.ts` now boots via `app.listen(port)` rather than
  `Bun.serve({ fetch })`, so Elysia's WebSocket handler handles `/live` upgrades.
- The first pump emits a step-0 snapshot so the client can start its intent
  stream; 20 Hz cadence, injected clock/transport, a single verdict and no
  production timer are preserved.
- Reopening the invite panel after a match retains the last code/verdict until
  the page is reloaded — a documented thin-slice limitation, not a blocker.

## Follow-ups

- none

## Rollback

```bash
# Squash commit
git revert --no-edit <squash-commit>
```

No migrations, feature flags or data changes are involved.
