# Phase 1 Verification — Deployed two-client proof and forfeit acceptance

- Track: `20261120-live-pvp-production-acceptance` (Live PvP Production Acceptance)
- Phase: 1 — Deployed two-client proof and forfeit acceptance
- Date: 2026-11-20
- Branch: `fix/20261120-live-pvp-production-acceptance`
- Base commit: `946d3f76c53432ca98a0a8ebd014780bb66e226c`
- Head commit at final retry: `bf2740c1b919125aa5c00e0198ba4d4a40034aa4` (code under test; no code changed in this phase — the evidence commit follows this report)
- Result: **verified** — after the owner's redeploy the production channel opens; both deployed two-client proofs passed with 0 console errors/warnings: natural verdict via room code `QXGCY3` (desktop Defeat / phone Victory, both returned to ranch) and mid-bout disconnect forfeit via room `XH8D8K` (survivor saw "Opponent forfeited ... You keep the win."). The `blocked` record below is the preserved historical 404/outage attempt and is superseded by the final retry section at the end of this file.

## Blocking infra evidence

Clicking "Live PvP" → "Create room" in the deployed desktop client allocated room code `755TDB`, then failed at the WebSocket upgrade:

```
[ERROR] WebSocket connection to 'wss://apex-api.ansyar-world.top/live' failed:
Error during WebSocket handshake: Unexpected response code: 404 @
https://apex-league.pages.dev/assets/index-90kZBnoO.js:4220
```

- Browser console: `Total messages: 1 (Errors: 1, Warnings: 0)`.
- UI status: "Connection problem. Try again." / "The channel could not open. Check the server."; Create/Join/Ready disabled.
- Endpoint sweep: `/health` → 200 `{"status":"ok","schemaVersion":"0003_ghost.sql"}`; `/live`, `/live/`, `/ws` → 404 `text/plain` `NOT_FOUND`.
- Source cross-check: `apps/server/src/live/route.ts:315` registers `new Elysia().ws("/live", ...)`; `apps/server/src/main.ts:16-18` documents that `app.listen(port)` (not bare `Bun.serve({fetch})`) is required for the browser upgrade. Client path is correct; the 404 is at the deployed proxy/routing layer.
- No config workaround applied: no deploy config, `ALLOWED_ORIGIN`, CORS, server source, or manifest was touched.

## Commands

| Layer | Command | Exit | Summary |
|---|---|---|---|
| Static/unit | `bun run verify` | 0 | 4443 pass / 1 skip / 0 fail; 4444 tests across 435 files; final sim hash `0xff6f3d62`; determinism gate ran internally with byte-identical voxel regenerations |
| Build | `bun run build` | 0 | Vite production build OK; `assets/index-Cp7J-L6S.js` (1,106.66 kB); chunk-size warning only |
| Balance | `bun run balance` | 0 | 1680 matrix fights, all species/doctrine/boss/duration/damage bounds ok |
| Determinism | `bun run gate:determinism` | denied | Shell permission rejected this exact command; not retried or worked around. Covered indirectly by `bun run verify`'s determinism gate (byte-identical) |
| Fuzz | `bun run test:fuzz` | denied | Shell permission rejected this exact command; not retried or worked around |
| Combined | `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz` | denied | `&&` chains are not permitted by the phase executor shell; individual commands were run instead where allowed |
| Production bundle | in-page `fetch` of `/assets/index-90kZBnoO.js` + string checks (playwright-cli `run-code`, `--raw`) | 0 | `Live PvP`: true; `Room code`: true; `/live`: true; `apex-api.ansyar-world.top`: true; 1,106,327 bytes |
| Production API | in-page `fetch` of `https://apex-api.ansyar-world.top/health` | 0 | 200 `{"status":"ok","schemaVersion":"0003_ghost.sql"}` |
| Identity setup | in-page `fetch` `POST /trainers`, `PUT /trainers/:id`, `GET`/`PUT /trainers/:id/save` ×2 | 0 | Two throwaway trainers: 201/200/404→200/200 each; ids `trn_0kpsy4z9rw2y1n2g9ymm`, `trn_ytm0w7yqmtt5qcdeqrxm` |
| Visual | playwright-cli two named sessions `pvpA` (1440×900), `pvpB` (393×852) | blocked | Channel never opened; failure screenshot captured; console 1 infra error on desktop host |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| FR-1 | Two real browser contexts connect through the production API and complete a room-code invite to a verdict and return to ranch | Deployed bundle markers confirmed; room code `755TDB` allocated; WS upgrade 404 prevented channel/verdict (probe-log § "WebSocket upgrade failure") | blocked |
| FR-2 | Mid-match disconnect produces a forfeit verdict | No match could start because the production channel cannot open; no forfeit copy observed | blocked |
| NFR-2 | No real player data, personal credentials, or passphrases in repo/evidence/URLs/room codes/console output | Two throwaway trainers only; passphrases derived from server ids inside the browser and returned nowhere; credentials only in `apex.trainer` localStorage; evidence files contain no passphrase | pass |
| NFR-4 | Deployed bundle matches required live-PvP surface | `/assets/index-90kZBnoO.js` contains `Live PvP`, `Room code`, `/live`, API origin; live chip visible at both viewports | pass (build hash drift noted in deviations) |
| NFR-5 | Evidence is complete and auditable | This report plus `probe-log.md` and failure screenshot; verdict/forfeit screenshots impossible because channel never opened | partial |
| AC-1 | Desktop creates, phone joins by code, both ready, natural verdict, both return to ranch | Create-room step reached; upgrade 404 ended the attempt; no verdict or ranch return | blocked |
| AC-2 | Survivor sees "Opponent forfeited ..." after mid-bout disconnect | Not reachable; no channel, no bout | blocked |
| AC-7 | Exactly two throwaway identities set up and injected in browser storage only | Trainer ids and status codes above; both sessions reloaded to "Cloud copy is up to date." | pass |
| AC-8 | Desktop + phone screenshots and clean console | Failure screenshot at 1440×900; baseline console 0/0 both sessions; post-create desktop console 1 infra error (WS 404). No room/fight/verdict screenshots exist | blocked |

## Evidence paths

- Report: `conductor/tracks/20261120-live-pvp-production-acceptance/verification/production-proof.md`
- Raw probe log: `.conductor/evidence/20261120-live-pvp-production-acceptance/probe-log.md`
- Failure screenshot: `.conductor/evidence/20261120-live-pvp-production-acceptance/desktop-ws-upgrade-404.png` (1440×900, gitignored)
- Upstream console log: `.playwright-cli/console-2026-11-19T21-21-58-899Z.log` (generated by playwright-cli; line 2 is the WS 404 error)

## Deviations

- Deployed bundle is `index-90kZBnoO.js`; a fresh local `bun run build` produced `index-Cp7J-L6S.js`. The deployed artifact still carries all four required markers, so this is recorded as build hash drift, not a phase block. No source or manifest change was made.
- The `&&` verification chain was denied by shell permissions; checks were run individually. `bun run gate:determinism` and `bun run test:fuzz` were individually denied and are reported as blockers for the primary to execute.
- The expected `GET /trainers/:id/save` 404 during throwaway setup is logged by the browser as a resource-load error; it is a setup probe, not an application failure. The application-failure console error is the WS upgrade 404.

## Notes

- Production infra must be fixed by the primary/owner: the deployed proxy/Coolify layer is not forwarding the WebSocket upgrade for `/live` to the server's Elysia handler. `/health` is healthy, so the API origin itself is reachable. Once the upgrade returns 101 and a room channel opens, this phase's P1.T2/P1.T3 browser proofs can be re-run unchanged.
- No deploy, proxy, CORS, `ALLOWED_ORIGIN`, server source, or manifest change was attempted, per the brief's stop-on-upgrade-failure rule.
- Browser sessions `pvpA`/`pvpB` were closed after evidence capture; the generated console log remains under `.playwright-cli/`. No passphrase was written to any file, URL, room code, or screenshot.

## Primary verification (independent re-run)

- Production probe repeated by the primary with `curl.exe`:
  - `GET https://apex-api.ansyar-world.top/health` → `HTTP/1.1 200`, body
    `{"status":"ok","schemaVersion":"0003_ghost.sql"}`.
  - `GET https://apex-api.ansyar-world.top/live` with `Connection: Upgrade`,
    `Upgrade: websocket`, `Sec-WebSocket-Key`, `Sec-WebSocket-Version: 13` →
    `HTTP/1.1 404 Not Found`, `Content-Length: 9`, body `NOT_FOUND`, headers
    `server: cloudflare`, `cf-cache-status: DYNAMIC`.
  - Conclusion: the blocker is at the deployed proxy/routing layer, not in the
    client path, the server source, or the sim. No workaround attempted.

| Command | Exit | Summary |
|---|---|---|
| `bun run verify` | 0 | 4443 pass / 1 skip / 0 fail, 665683 `expect()` calls, 4444 tests across 435 files, Biome/typecheck clean, sim hash `0xff6f3d62` |
| `bun run build` | 0 | Vite 438 modules; pre-existing >500 kB chunk warning only |
| `bun run balance` | 0 | 1680 fights, capShare 30.8% <= 33.3%, decisiveShare 93.7%, 34 gates OK |
| `bun run gate:determinism` | 0 | All 21 species x 3 stages + 5 props byte-identical |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls |

**Verdict:** The repository is green; the two subagent-denied commands pass when
run by the primary. Phase 1 remains **blocked** solely by the deployed
WebSocket upgrade returning 404. No code regression is claimed or implied.

## Retry after owner redeploy attempt (2026-11-20 09:06 +11:00)

At the user's request I retried the deployed endpoint. The infra state has changed
but is still not usable:

| Probe | Result |
|---|---|
| `GET https://apex-api.ansyar-world.top/health` | `HTTP/1.1 503 Service Unavailable`, `Content-Length: 20`, body `no available server`, `Server: cloudflare`, `CF-RAY: a5d282099851e6d5-MEL` |
| `GET /live` with `Connection: Upgrade`, `Upgrade: websocket`, `Sec-WebSocket-Version: 13`, `Sec-WebSocket-Key: ...` | same `503` / `no available server` |
| 6 further health probes at 15-second intervals | `503` every time |
| Final probe after a further 60-second wait | `health=503`, `live=503` |

So the previous `404 NOT_FOUND` (stale/misconfigured origin) has become a full
origin outage: Cloudflare has no healthy upstream. No browser proof was started,
no source/config was changed, and no workaround was attempted. Phase 1 remains
**blocked** until the deployed API returns 200 on `/health` and 101 on `/live`.

## Final retry after owner redeploy (2026-11-20) — SUPERSEDES the blocked records above

Owner redeploy of the API at SHA `8c773f54748677315e2b1221d6d12d98eebd47ce`
(PR #83 declared `@apex/sim` as a server workspace dependency, updated `bun.lock`,
and copied `packages/sim/src` into the Docker runtime; PR #84 fixed
`apps/server/Dockerfile.dockerignore` excluding `packages/sim/src` and extended the
deploy-contract test). Primary probe at 2026-11-20 10:22 +11:00:

| Probe | Result |
|---|---|
| `GET https://apex-api.ansyar-world.top/health` | `200` `{"status":"ok","schemaVersion":"0003_ghost.sql"}` |
| `GET https://apex-api.ansyar-world.top/live` with upgrade headers | `400 Expected a websocket connection` — the Elysia WS route is now reached (a plain HTTP GET is correctly rejected) |

Client target: `https://apex-league.pages.dev/`. In-page fetch of deployed bundle
`https://apex-league.pages.dev/assets/index-90kZBnoO.js` (1,106,327 bytes):
`Live PvP` = true, `Room code` = true, `/live` = true, `apex-api.ansyar-world.top` = true.

### Throwaway identities (exactly two, fresh for this retry)

| Role | Trainer id | Setup statuses |
|---|---|---|
| Desktop host (Ember Drake save) | `trn_y76gpfjs2dnr45qmhqpy` | `POST /trainers` 201, `PUT /trainers/:id` 200, `GET /save` 404, `PUT /save` 200, `GET /save` 200 |
| Phone joiner (Bramble Ox save) | `trn_hd8mpxr7tewachd64hyw` | `POST /trainers` 201, `PUT /trainers/:id` 200, `GET /save` 404, `PUT /save` 200 |

Passphrases were derived inside the browser from the server-returned id and never
returned, logged, typed into a URL or room code, screenshotted, or written to any
file. Credentials were injected only as `apex.trainer` localStorage in the two
browser contexts; both reloaded to "Cloud copy is up to date."
First save PUT for trainer A returned 400 because `savedAt` was an ISO string; the
server requires an integer (`apps/server/src/saves/routes.ts:79`), so it was retried
with `savedAt: Date.now()` → 200. No application source was changed.

### Two-client natural verdict — room `QXGCY3`

`pvpA` (1440×900) opened the deployed client, clicked Live PvP → Create room →
code `QXGCY3`. `pvpB` (393×852) clicked More → Live PvP, entered `QXGCY3`, Join room.
Both showed "Room open. Waiting for a second trainer.", then both clicked Ready and
both showed "Fight live." The bout resolved naturally — no forfeit:

| Client | Verdict text |
|---|---|
| Desktop `pvpA` | `Bout complete.` / `Defeat — Your opponent takes the bout.` |
| Phone `pvpB` | `Bout complete.` / `Victory — Your creature takes the bout.` |

Both clicked "Back to ranch" and the ranch UI returned (Live PvP / Lineage visible).
Console in both sessions: `Total messages: 0 (Errors: 0, Warnings: 0)` throughout.

### Mid-bout disconnect forfeit — room `XH8D8K`

Fresh room after reloading both clients: `pvpA` Create room → `XH8D8K`; `pvpB` Join
by code; both clicked Ready and the bout started. The phone was then disconnected
mid-bout by navigating to `about:blank`. The surviving desktop client showed:

```
Bout complete.
Opponent forfeited — trn_hd8mpxr7tewachd64hyw left the ring. You keep the win.
```

This is the required forfeit copy and is distinct from the earlier natural verdict.
The survivor returned to the ranch cleanly. No zombie room state: reloading the
desktop produced a fresh invite with an empty room code and Create/Join enabled,
and the disconnected client was brought back to the deployed client and successfully
joined a subsequent fresh room `3FP73J`. Console remained 0 errors / 0 warnings in
both sessions.

### Live-bout capture — room `3FP73J`

Because the previous screenshots had caught the pre-bout state, a third room was
used only to re-capture live frames: after both readied, an in-page
`waitForFunction` waited for the exact text "Fight live." before each screenshot.
Both `desktop-02-fight-live.png` and `phone-02-fight-live.png` now show "Fight live."
at 1440×900 and 393×852 respectively. Both clients then returned to the ranch;
final console check: 0 errors / 0 warnings in each session.

### Commands (final retry, run individually — `&&` chains are not permitted)

| Layer | Command | Exit | Summary |
|---|---|---|---|
| Static/unit | `bun run verify` | 0 | 4446 pass / 1 skip / 0 fail, 665689 `expect()` calls, 4447 tests across 435 files; internal voxel determinism gate byte-identical; final sim hash `0xff6f3d62` |
| Build | `bun run build` | 0 | Vite 438 modules; `assets/index-Cp7J-L6S.js` 1,106.66 kB; pre-existing >500 kB chunk warning only |
| Balance | `bun run balance` | 0 | 21 species, 1680 matrix fights, 24 doctrine, 252 boss; all gated bounds ok |
| Determinism | `bun run gate:determinism` | denied | Shell permission rejected the exact command; not retried or worked around. `bun run verify` ran the same determinism gate internally with byte-identical results; primary previously recorded this command green |
| Fuzz | `bun run test:fuzz` | denied | Shell permission rejected the exact command; not retried or worked around. Primary previously recorded it green (139 pass) — not re-observed at HEAD `bf2740c1` |
| Combined | `bun run verify && bun run build && ...` | not used | `&&` chains are not permitted; all commands were run separately |

### Acceptance criteria (final retry)

| ID | Criterion | Evidence | Status |
|---|---|---|---|
| FR-1 | Two real browser contexts connect through production API and complete invite → verdict → ranch | Rooms `QXGCY3` / `3FP73J`; both Ready, natural verdict, both Back to ranch; 0 console errors | pass |
| FR-2 | Mid-match disconnect produces a forfeit verdict | Room `XH8D8K`; phone `about:blank` mid-bout; desktop "Opponent forfeited — ... You keep the win." | pass |
| NFR-2 | No real player data, credentials, or passphrases in repo/evidence/URLs/room codes/console | Two throwaway trainer ids only; passphrases browser-derived, never returned or written; creds only in `apex.trainer` localStorage | pass |
| NFR-4 | Deployed bundle carries required live-PvP surface | `/assets/index-90kZBnoO.js` markers all true at both viewports (build hash drift noted) | pass |
| NFR-5 | Evidence complete and auditable | This report + raw log + 7 screenshots; console results recorded | pass |
| AC-1 | Desktop creates, phone joins by code, both ready, natural verdict, both return to ranch | `QXGCY3` verdicts Defeat/Victory + ranch return; `desktop-03-verdict.png`, `phone-03-verdict.png` | pass |
| AC-2 | Survivor sees "Opponent forfeited ..." after mid-bout disconnect | `XH8D8K` forfeit copy + `desktop-04-forfeit-verdict.png` | pass |
| AC-7 | Exactly two throwaway identities, browser storage only | Two fresh ids and status codes above; both "Cloud copy is up to date." | pass |
| AC-8 | Desktop + phone screenshots and clean console | 7 screenshots listed below; 0 errors / 0 warnings in both sessions | pass |

### Evidence paths (final retry)

- Report: `conductor/tracks/20261120-live-pvp-production-acceptance/verification/production-proof.md`
- Raw probe/identity log: `.conductor/evidence/20261120-live-pvp-production-acceptance/probe-log.md`
- `desktop-01-room-open.png` (1440×900, room `QXGCY3` open)
- `desktop-02-fight-live.png` (1440×900, room `3FP73J`, "Fight live.")
- `desktop-03-verdict.png` (1440×900, `QXGCY3`, Defeat)
- `desktop-04-forfeit-verdict.png` (1440×900, `XH8D8K`, "Opponent forfeited ...")
- `phone-01-room-joined.png` (393×852, joined `QXGCY3`)
- `phone-02-fight-live.png` (393×852, room `3FP73J`, "Fight live.")
- `phone-03-verdict.png` (393×852, `QXGCY3`, Victory)
- Historical failure artifact: `desktop-ws-upgrade-404.png` (1440×900, earlier 404 attempt)

### Deviations / notes

- Local `bun run build` produces `index-Cp7J-L6S.js`; the deployed bundle is still `index-90kZBnoO.js` with all required markers. Build hash drift recorded, no manifest change made.
- The first attempt at the forfeit round hit a stale invite (old room code, "Not connected.") after "Back to ranch"; reloading the client cleared it. No source change; recorded as a UI observation.
- `bun run gate:determinism` and `bun run test:fuzz` were denied to this subagent at HEAD `bf2740c1`; their green results in the "Primary verification" table above predate this HEAD and are not claimed as re-observed here. No pass is claimed for any unobserved check.
- No deploy, proxy, CORS, `ALLOWED_ORIGIN`, server source, or manifest change was attempted. Browser sessions `pvpA`/`pvpB` were closed after capture. No passphrase appears in any file, URL, room code, log, screenshot, or commit message.

## Primary verification (final retry, HEAD `65edbb8b`)

Primary independently re-ran all five configured commands on the final evidence tree. All exited 0.

| Command | Exit | Result |
|---|---|---|
| `bun run verify` | 0 | 4446 pass / 1 skip / 0 fail, 665689 `expect()` calls, 4447 tests across 435 files; typecheck + Biome clean; hash `0xff6f3d62` |
| `bun run build` | 0 | Vite 438 modules, `index-Cp7J-L6S.js`; pre-existing >500 kB chunk warning only |
| `bun run balance` | 0 | 1680 fights, capShare 30.8% ≤ 33.3%, decisiveShare 93.7%, 34 gates ok |
| `bun run gate:determinism` | 0 | 21 species × 3 stages + 5 props byte-identical |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls |

Primary also re-probed the deployed origin: `/health` → 200 `{"status":"ok","schemaVersion":"0003_ghost.sql"}`; `/live` upgrade probe → 400 `Expected a websocket connection` (route present; the subagent's real browser handshakes succeeded). Visual artifacts were confirmed on disk (7 screenshots) and primary visually inspected `desktop-04-forfeit-verdict.png` (shows "Opponent forfeited — trn_hd8mpxr7tewachd64hyw left the ring. You keep the win.", room `XH8D8K`) plus both `desktop-02-fight-live.png` and `phone-02-fight-live.png` (arena background with the "Fight live." status, room `3FP73J`). The two denied commands in the subagent report are resolved by this re-run.

**Verdict: Phase 1 accepted.** The earlier infra blocker is fully resolved by Phase 1R + owner redeploy at `8c773f54`; the stale invite-panel state observed after "Back to ranch" is carried to Phase 2 (FR-3) and is not a Phase 1 regression.


