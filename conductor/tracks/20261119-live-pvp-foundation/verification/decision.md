# Architecture decision record — Live PvP Foundation

- Track: `20261119-live-pvp-foundation`
- Phase: 3 — Client slice, decisions, and visual proof
- Date: 2026-11-20
- Status: Accepted for the foundation spike (client slice implemented; two-client browser proof delegated to the primary because the subagent's shell denied API-server startup)

## Context

The ranch is a local, offline-first single-player experience. This track adds a
small "spar by invite" path: two local browser clients exchange high-level
fight intents through one authoritative server, render the bout in the *existing*
arena, reach one verdict, and return to the ranch. The owner froze the following
choices in `spec.md`: server-authoritative ownership, Elysia WebSocket transport,
20 Hz intents / 50 Hz simulation / 20 Hz snapshots, a thin client slice plus a
decision record, room code plus existing trainer identity for entry, high-level
intents, immediate forfeit on disconnect, and reuse of the dense fight stream.

The Phase 1 and Phase 2 slices already deliver the versioned protocol, room
machine, authentication and authoritative loop under `packages/sim/src/live/` and
`apps/server/src/live/`. Phase 3 must not reimplement any of that; it only adds a
client boundary, the invite surface, and the arena hand-off.

## Decision

1. **Authority stays on the server.** The room registry and match loop remain the
   only owners of match state, seed, step count, verdict and forfeit. The client
   sends intents and renders what it is given; it never simulates a live bout
   locally and never declares a winner.
2. **One WebSocket, existing Elysia route.** The client opens exactly one socket
   to `/live`, derived from `VITE_API_ORIGIN` by `socketUrl`. The path is fixed and
   contains no credentials. Passphrases travel only inside the JSON body of the
   `create`/`join` messages. They are never placed in URLs, room codes, logs,
   query strings or DOM text.
3. **Protocol rates are unchanged.** Intents are emitted every 50 ms (20 Hz), the
   server steps the fight every 20 ms (50 Hz), and snapshots are broadcast every
   50 ms (20 Hz). The client advances its playback pace from the snapshot's
   `stepMs` instead of introducing a second clock.
4. **The dense stream is reused verbatim.** A snapshot carries the flat
   `Int16Array` produced by `createStreamRecorder` — interleaved
   `[step][side][field]`, `STREAM_FIELDS = 9`. The client rebuilds that array from
   the JSON numeric keys and hands it to `staging.applyFrame(stream, step)`. No
   second visual protocol, no per-frame entity messages, no new decoder in the
   renderer.
5. **The transport boundary is narrow.** `apps/client/src/live/transport.ts` is
   the only module that knows about sockets. It emits `{kind:"snapshot"}`,
   `{kind:"verdict"}` or `{kind:"error"}` events; it knows nothing about the
   arena, the scene, or the store. `invite.ts` is the only module that knows both
   the invite panel and the arena; the arena and renderer remain ignorant of
   sockets. `panel.ts` owns only DOM and announcements. This keeps the blast
   radius of a protocol change to two small modules.
6. **No ack message — success is silence plus snapshots.** Phase 2 deliberately
   has no `joined`/`created` acknowledgement. The client treats the absence of a
   typed error followed by dense snapshots as success, matching the server
   contract exactly instead of inventing an extra round trip.
7. **No matchmaking, reconnect, pause or spectator.** Entry is an explicit room
   code typed by a human plus their existing trainer identity. There is no queue,
   no auto-rematch, no resume token, no pause frame and no third-seat observer.
   A disconnect is an immediate forfeit: the server removes the seat and sends
   one verdict to the survivor; both clients run the same clean exit path
   (stop intents, leave arena, close socket) and return to the ranch.
8. **No frozen-contract changes.** `LIVE_PROTOCOL_VERSION` stays at `1`;
   `SIM_VERSION`, the save schema, balance gates, pacing constants, CORS and
   deploy configuration are untouched. No runtime dependency was added — the
   live modules use only `@apex/sim`, the existing UI kit and browser APIs.

## Alternatives considered

- **Client-side prediction / local simulation.** Rejected: it duplicates the
  deterministic core, creates two sources of truth for the verdict, and would
  require a reconciliation layer that a foundation spike does not need.
- **A new compact visual stream (positions only).** Rejected: it would fork the
  renderer and risk visual drift from the offline spar path. Reusing the dense
  stream preserves a single `applyFrame` code path.
- **Per-frame WebSocket messages or an ack handshake.** Rejected: higher
  overhead and a protocol change; Phase 2 already defines the wire contract and
  the "no ack" behaviour is documented server-side.
- **A token in the room code or query string.** Rejected: it leaks passphrases
  into URLs, logs and devtools, violating NFR-5.
- **Auto-matchmaking and reconnect.** Rejected as out of scope: both add state
  machines (queue, resumable session) that the owner explicitly excluded, and
  reconnect conflicts with immediate forfeit on disconnect.
- **Adding a `dev` script or new dependency to boot the API server.** Rejected:
  the server already boots via its `main.ts`; the only serving defect was the
  missing Elysia WebSocket handler in `Bun.serve`, fixed by `app.listen(port)`.

## Consequences

- The client can only spar while the API origin is configured; without
  `VITE_API_ORIGIN` the live chip is simply not added, so offline builds are
  unchanged.
- Room codes are short human-entered strings. The server validates four to
  twelve uppercase alphanumeric characters; the client normalises input but
  does not weaken the server rule.
- Because there is no reconnect, a flaky socket ends the bout. That is the
  intended semantics for the spike and is surfaced in the verdict copy.
- JSON transport of an `Int16Array` requires rebuilding typed data from numeric
  keys on the client. This is contained in `decodeStream` and covered by unit
  tests.
- `apps/server/src/main.ts` was changed from `Bun.serve({port, fetch})` to
  `app.listen(port)` so the registered `/live` WebSocket route can actually
  upgrade in a real browser. This is the one out-of-Touches change and is
  recorded as a deviation in `phase-3.md`.
- The two-client browser proof could not be executed by this subagent: the
  shell denied starting the API server with the required environment. All
  static, unit, build, balance and in-process determinism checks pass; the
  primary must run the visual layer. No visual pass is claimed here.
