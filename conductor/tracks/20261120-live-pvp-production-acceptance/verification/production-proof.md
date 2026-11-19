# Phase 1 Verification — Deployed two-client proof and forfeit acceptance

- Track: `20261120-live-pvp-production-acceptance` (Live PvP Production Acceptance)
- Phase: 1 — Deployed two-client proof and forfeit acceptance
- Date: 2026-11-20
- Branch: `fix/20261120-live-pvp-production-acceptance`
- Base commit: `946d3f76c53432ca98a0a8ebd014780bb66e226c`
- Head commit: `946d3f76c53432ca98a0a8ebd014780bb66e226c` (code under test; no code changed in this phase — the evidence commit follows this report)
- Result: **blocked** — production WebSocket upgrade at `wss://apex-api.ansyar-world.top/live` returns HTTP 404; no room channel can open, so the two-client verdict and disconnect-forfeit proofs cannot run. Per the brief, infra evidence is recorded below and no deploy/proxy/CORS/server/manifest workaround was attempted.

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
