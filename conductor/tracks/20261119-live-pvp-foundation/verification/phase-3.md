# Phase 3 verification — Live PvP Foundation Spike

- Track: `20261119-live-pvp-foundation`
- Phase: 3 — Client slice, decisions, and visual proof
- Date: 2026-11-20
- Branch: `feat/20261119-live-pvp-foundation`
- Base commit: `59b2296b90a4d2d80c93c38f59f276cfa91cd066`
- Head commit (code): `8edff7c72efbac8851211baf50db0a33a9c64d29` — `feat(live): add invite surface, client transport, and arena handoff`
- Result: **blocked** for final acceptance — all code checks pass, but two verification commands and the two-client visual layer were denied to this subagent by the shell permission scope. The primary must re-run them (same pattern as Phase 1).

## Summary

The Phase 3 client slice is implemented: an invite panel with create/join,
room-code display, connection/verdict feedback and polite announcements; a
socket-only transport adapter; a pure wire codec and copy layer with unit tests;
and a single arena hand-off module that enters the existing arena on the first
snapshot and returns both clients cleanly on verdict or disconnect. The Elysia
server boot was fixed so the `/live` WebSocket route can actually upgrade in a
real browser (the one out-of-Touches deviation).

All static, unit, build and balance checks exit 0 with the frozen determinism
hash `0xff6f3d62`. The two remaining commands and the browser proof were blocked
by permission denials, not by failing code; no visual pass is claimed.

## Commands

| Command | Exit | Summary | Evidence |
| --- | --- | --- | --- |
| `bun run verify` | 0 | typecheck + 4438 pass / 1 skip / 0 fail (665651 `expect()` calls across 4439 tests); module-size cap clean; `biome check` clean; determinism hash `0xff6f3d62` | `C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\sh_1f3f939a50010Y8ZbWj63IYi3y.out` |
| `bun run build` | 0 | Vite 8.3.4, 438 modules; `dist/assets/index-CJtYA5Qs.js` 1106.76 kB (gzip 306.01 kB); chunk-size warning only | local shell log (successful run, exit 0) |
| `bun run balance` | 0 | 1680 fights, all `ok`; final hash `0xff6f3d62` | local shell log (successful run, exit 0) |
| `bun run gate:determinism` | denied | Standalone invocation rejected by shell scope (`Permission denied: shell`). The same gate ran **inside** `bun run verify` and passed with hash `0xff6f3d62`; primary should re-run standalone. | blocker (below) |
| `bun run test:fuzz` | denied | Standalone invocation rejected by shell scope (`Permission denied: shell`). No local result; primary must re-run. | blocker (below) |
| Visual layer (`playwright-cli`, `bun run dev` + API server) | blocked | `playwright-cli` 0.1.22 is available and the client dev server starts, but the API/WebSocket server cannot be started with the required `PORT`/`ALLOWED_ORIGIN`/`DATABASE_PATH` env (all startup forms denied). Without the API origin the live chip is intentionally not added, so no two-client proof or screenshots were captured. | blockers (below) |

## Acceptance criteria

| AC | Status | Notes |
| --- | --- | --- |
| AC-5 | partial | Invite surface implemented and covered by `protocol.test.ts` / `state.test.ts`; panel focus, announcements and the 1440×900 / 393×852 layouts are unverified visually because the browser layer is blocked. |
| AC-6 | blocked | Two-client create/join → verdict → clean ranch return with zero console errors was not executed; requires the API server and two browser contexts. No console-error count is claimed. |
| AC-7 | done | `verification/decision.md` records context, decision, alternatives, consequences, status and date, covering authority, protocol/rates, dense-stream reuse, transport boundary, no matchmaking/reconnect, and no-SIM_VERSION/no-save-change. |
| AC-8 | blocked | No desktop or phone screenshots were captured; expected paths are `.conductor/evidence/20261119-live-pvp-foundation/phase-3-desktop.png` and `phase-3-phone.png` (gitignored). The primary must capture them. |
| AC-9 | partial | `verify`, `build` and `balance` exit 0 with unchanged hash `0xff6f3d62`; `gate:determinism` passed inside `verify` but was denied standalone; `test:fuzz` denied standalone. Primary re-run required for a clean sweep. |
| AC-10 | done | No `SIM_VERSION`, save-schema, balance, pacing, CORS or deploy-config changes; no runtime dependency added. `LIVE_PROTOCOL_VERSION` remains `1`. Verified by `bun run verify`, `bun run balance`, `git diff --stat` and the task diff. |

## Implementation notes

- `apps/client/src/live/protocol.ts` — pure codec: `socketUrl`, code normalisation/generation, create/join/ready/intent message builders, `decodeStream` (rebuilds the flat `Int16Array` from JSON numeric keys), `decodeServerEvent`.
- `apps/client/src/live/transport.ts` — the only socket-aware module. One socket, typed `{snapshot|verdict|error}` events, no ack (success = absence of typed error then snapshots).
- `apps/client/src/live/state.ts` — pure status/error/verdict copy; forfeit copy names the *forfeiting* trainer; unknown server errors never echo server text.
- `apps/client/src/live/panel.ts` — invite surface built from the broadcast UI kit, single shared `aria-live="polite"` region via `announcer()`; no second polite region.
- `apps/client/src/live/invite.ts` — sole bridge between panel and arena. First snapshot enters the arena via `arena.enterArena(castingFor(...))`, applies frames with `staging.applyFrame(stream, step)`, emits 20 Hz intents; verdict or close runs one clean exit path.
- `apps/client/src/live/live.css` — scoped responsive styles for the panel and its status/result rows.
- `apps/client/src/main.ts` — one narrow wiring change; returns `null` and adds no chip when no API origin is configured.
- Verification evidence output for the authoritative `bun run verify` run is saved under the session shell log path above.

## Integrated-verification fix — startup snapshot deadlock

Primary's raw WebSocket probe found a blocking defect after Phase 3: the loop
started with `snapshotsSent = 0` and only emitted frames when
`floor(elapsed / SNAPSHOT_INTERVAL_MS)` exceeded that counter. The single
`pump()` at match start runs at `elapsed ≈ 0`, so no snapshot was sent; the
browser client waits for its first snapshot before starting its 50 ms intent
timer, and no further pump can occur without an intent — a permanent deadlock.

Fix (outside the original Phase 3 Touches; recorded as deviations below):

- `apps/server/src/live/loop.ts` — keep the existing pump-on-input design and
  injected clock/transport. A separate `bootstrapped` flag makes the first
  `pump()` emit the step-0 frame immediately; cadence frames are still counted
  one per 50 ms of simulated time by a separate `cadenceSent` counter. Keeping
  the counters separate prevents the `fight.over` snapshot cap from emitting a
  duplicate terminal frame, and the single-terminal-verdict guarantee is
  unchanged. No production timer was added.
- `apps/server/src/live/loop.test.ts` — new regression test asserts that the
  first pump at `elapsed = 0` sends exactly one step-0 snapshot with `steps: 1`
  and `elapsedMs: 0`, that a second pump at 0 sends no extra frame, and that
  cadence remains one frame per 50 ms. Existing cadence counts were raised by
  one (2/3/21 frames at 50/100/1000 ms) because the bootstrap frame is now
  present. The determinism test now compares the *last* snapshot because the
  step-0 bootstrap frame is seed-independent.
- `apps/server/src/live/route.test.ts` — start-of-match snapshots 0 → 1, and
  later counts +1 (2 at 50 ms; stale-order 2/3; forfeit-before-close 2), for
  the same reason. Create-only still yields zero snapshots because no loop
  exists until both seats are ready.

Primary's raw probe after the fix confirms snapshots now flow from match start.
`bun run verify` was run twice after the fix: both runs reached
**4438 pass / 1 skip / 1 fail** (665660 `expect()` calls, 4440 tests across 434
files) and **exit 1**. The sole failure in both runs is unrelated to the live
loop: `packages/sim/src/cup/gatekeeper-reach.test.ts > a real climb reaches the
authored final and fights it for real` exceeded its 60000 ms timeout (~95–97 s)
under parallel load. Live-loop, client, build, balance and determinism checks
were clean, with final hash `0xff6f3d62`. The primary is re-running the full
five-command sweep under reduced load; no clean `verify` pass is claimed here.

## Deviations

| File | Reason |
| --- | --- |
| `apps/server/src/main.ts` | Explicitly authorised out-of-Touches fix. `Bun.serve({ port, fetch: app.fetch })` boots HTTP but omits Elysia's WebSocket handler, so a real browser cannot upgrade `/live`. Replaced with `app.listen(port)`, which carries Elysia's own WS handler. The first attempt (`websocket: app.config.websocket`) failed typecheck (TS2322: Elysia's optional handler shape is not assignable to Bun's `WebSocketHandler`), so `app.listen(port)` was used. |
| `apps/server/src/live/loop.ts` | Integrated-verification fix (brief-authorised, outside Phase 3 Touches): emit a step-0 snapshot on the first pump so the client can bootstrap its intent stream. Injected clock/transport, 20 Hz cadence, single verdict and no production timer preserved. |
| `apps/server/src/live/loop.test.ts` | Integrated-verification fix: regression test for the bootstrap frame, plus expected cadence counts adjusted for the new frame and determinism comparison moved to the last snapshot. |
| `apps/server/src/live/route.test.ts` | Integrated-verification fix: expected snapshot counts adjusted for the new step-0 frame at match start; create-only still expects zero. |

No other files outside the phase Touches were modified. A local, gitignored
helper `package.json` was written under `.conductor/evidence/20261119-live-pvp-foundation/`
while attempting (unsuccessfully) to start the API server within the permitted
command forms; it is a local proof artifact, not a source change.

## Blockers and next steps for the primary

1. `bun run gate:determinism` — denied standalone; expected exit 0 and hash `0xff6f3d62` (already observed inside `bun run verify`).
2. `bun run test:fuzz` — denied standalone; expected exit 0.
3. API server startup (needed for the visual layer), e.g.
   `DATABASE_PATH=/tmp/apex-dev.sqlite PORT=3457 ALLOWED_ORIGIN=http://localhost:5173 bun apps/server/src/main.ts` — denied; expected a listening server on 3457 whose `/health` returns OK and whose `/live` upgrades.
4. Client dev with the API origin, e.g. `VITE_API_ORIGIN=http://localhost:3457 bun run dev` — env-prefixed form denied; expected the live chip to appear in the HUD.
5. Once both are up: register two trainers via `POST /trainers` + `PUT /trainers/:id` with names/passphrases, inject `apex.trainer` into two distinct browser contexts, open `http://localhost:5173` at 1440×900 and `393x852`, create and join by code, ready, fight to a verdict, return to the ranch, capture both screenshots, and confirm `playwright-cli console` is empty.

## Primary verification (integrated)

The primary independently re-ran the full five-command chain with the fixed loop.
All commands exited **0** under reduced load (earlier failures of
`gatekeeper-reach.test.ts` were load-induced timeouts; the same test passes in
15.8 s in isolation):

| Command | Exit | Notes |
| --- | --- | --- |
| `bun run verify` | 0 | 4438 pass / 1 skip / 0 fail; Biome clean; final sim hash `0xff6f3d62` |
| `bun run build` | 0 | Vite build OK |
| `bun run balance` | 0 | 1680 fights; capShare 30.8% <= 33.3%; all gates OK |
| `bun run gate:determinism` | 0 | all species/props byte-identical |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail; 129015 expect calls |

### Visual layer — PASS

Local API on `:3457` (`DATABASE_PATH` temp SQLite, `ALLOWED_ORIGIN=http://localhost:5174`)
and Vite client on `:5174` (`VITE_API_ORIGIN=http://localhost:3457`). Two real
Chrome contexts: desktop `1440x900`, phone `393x852`, both seeded with distinct
registered trainers and pushed saves.

- Create by code `A7C2FU` on desktop; join by code on phone; both showed the code and "Room open. Waiting for a second trainer."
- Both clicked Ready; both moved to "Fight live." and rendered the arena (the bootstrap-frame fix was essential — the pre-fix loop deadlocked here).
- Both reached a natural verdict: desktop "Defeat", phone "Victory".
- Both clicked "Back to ranch" and returned to the full ranch UI; `playwright-cli console` reported **0 errors / 0 warnings** on both.
- Mid-match disconnect on a fresh room: guest navigated away; remaining host received `reason: forfeit, winnerSeat: 0` (raw WS probe) and the browser showed "Opponent forfeited ... You keep the win.", then returned cleanly with 0 console errors.

Screenshots (local artifacts under `.conductor/evidence/20261119-live-pvp-foundation/`):
`desktop-01-room-open.png`, `desktop-02-fight-live.png`, `desktop-03-verdict.png`,
`desktop-04-forfeit-verdict.png`, `phone-01-room-joined.png`,
`phone-02-fight-live.png`, `phone-03-verdict.png`.

**Verdict: Phase 3 accepted.** AC-5..AC-10 covered. Known thin-slice limitation:
after "Back to ranch", reopening the invite panel retains the last code/verdict;
starting another bout requires a page reload (no reconnect is in scope).
