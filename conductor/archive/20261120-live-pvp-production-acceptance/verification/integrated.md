# Integrated Verification — Live PvP Production Acceptance

- Track: `20261120-live-pvp-production-acceptance` (Live PvP Production Acceptance)
- Phase: 3 — Integrated evidence and documentation truth (this is the integrated record)
- Date: 2026-11-20
- Branch: `fix/20261120-live-pvp-production-acceptance`
- Base: `e5459deb4189166756e057262a6439c08aa92ffd` (archived foundation squash)
- Completion date: 2026-11-20
- Result: **verified** — production two-client live PvP, the mid-bout forfeit path and the
  second-bout invite reset are proven against the deployed origins with clean consoles; all
  five configured verification commands exit 0 with sim hash `0xff6f3d62`; the scope proof
  shows no protocol, save, balance, pacing, CORS or deploy change beyond the owner-approved
  container-runtime fix; no credentials or real player data appear in tracked artifacts.
  The owner-approved one-line `product.md` roadmap edit (AC-5) was applied by the primary;
  the archived ADR is untouched and its stale visual-proof line is explicitly superseded.

This record consolidates the three phase evidence files for the track:
`verification/production-proof.md` (Phase 1), `verification/phase-1R.md` (container runtime)
and `verification/phase-2.md` (panel reset). The exact commands, counts, screenshot paths,
console result, deployed URLs and scope proof are carried below.

## Deployed targets

- Client: `https://apex-league.pages.dev/` — deployed bundle `index-90kZBnoO.js` at proof
  time (1,106,327 bytes; markers `Live PvP`, `Room code`, `/live`,
  `apex-api.ansyar-world.top` all confirmed true in-page at both viewports).
- API: `https://apex-api.ansyar-world.top/` — `/health` → 200
  `{"status":"ok","schemaVersion":"0003_ghost.sql"}`.
- Owner redeploy: SHA `8c773f54748677315e2b1221d6d12d98eebd47ce` after PR #83 / PR #84
  fixed the container `@apex/sim` module-resolution outage. After redeploy the `/live`
  upgrade probe reached the Elysia handler (plain HTTP GET → 400
  `Expected a websocket connection`); real browser handshakes returned 101.

## Phase 1 — production acceptance (from `production-proof.md`)

- Two real browsers at 1440×900 (desktop) and 393×852 (phone), using exactly two
  throwaway trainer identities and their throwaway saves; credentials injected only as
  `apex.trainer` localStorage.
- Room `QXGCY3`: natural verdict, desktop **Defeat** / phone **Victory**; both clicked
  "Back to ranch" and returned to the ranch.
- Room `XH8D8K`: mid-bout phone disconnect → forfeit verdict to the survivor:
  `Opponent forfeited — trn_hd8mpxr7tewachd64hyw left the ring. You keep the win.`
  Distinct from the natural verdict; no zombie room state (a subsequent fresh room
  `3FP73J` joined successfully); survivor returned to ranch cleanly.
- Console in both sessions: `Total messages: 0 (Errors: 0, Warnings: 0)` throughout.
- Earlier infra attempts (404 upgrade, then 503 `no available server`) are preserved as
  historical blocked records in `production-proof.md`; the final-retry section supersedes
  them after the owner redeploy. AC-8 is satisfied by those records: no fabricated pass was
  claimed and no deploy/proxy/CORS workaround was attempted.

## Phase 1R — approved container-runtime deviation (from `phase-1R.md`)

- `@apex/sim` declared as a workspace dependency in `apps/server/package.json`; matching
  `bun.lock`; Dockerfile runtime stage copies `packages/sim/src`;
  `Dockerfile.dockerignore` unignores it (`!packages/sim/src`, `!packages/sim/src/**`).
- Deploy-contract test `scripts/deploy/server-image.test.ts`: failing-first 10 pass / 3 fail
  (manifest `undefined`, lockfile `undefined`, missing sim `COPY`) → 13 pass / 0 fail.
- Image-like boot proved with sim source present (listen line, no module-resolution error)
  and the exact `Cannot find module '@apex/sim'` failure reproduced without it (negative
  control). Owner redeployed the fixed image at `8c773f54`.

## Phase 2 — panel reset and second bout (from `phase-2.md`)

- Failing-first DOM regression `apps/client/src/live/panel.test.ts`: 0 pass / 2 fail
  before fix → 2 pass / 0 fail after.
- Two consecutive production bouts in one page session: rooms `75EWUX` then `RL3ZH4`.
  After the first verdict and "Back to ranch", reopening the invite showed an empty
  room-code field, enabled Create/Join/Ready, hidden room/match/result rows and idle
  status — with **no page reload**. Both sessions ended at 0 errors / 0 warnings.
- Origin strategy: the stale deployed bundle was intercepted at the real Pages origin and
  fulfilled from the fixed local build (`index-BR1jNXG_.js`) for the browser proof. No
  CORS, deploy config, source, env or lockfile change.

## Verification commands (final tree)

Run separately (no `&&`, no pipes). Counts and hash below are the primary's final runs on
the completed tree; the phase subagent independently observed `verify`, `build` and
`balance` green on the same tree, and the `verify` run executed the voxel determinism gate
internally with byte-identical results. `gate:determinism` and `test:fuzz` were denied to
the subagent by the shell permission layer and were not retried or worked around; their
green results are the primary's independently observed runs (as in every prior phase).

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | 4448 pass / 1 skip / 0 fail, 665709 `expect()` calls, 4449 tests / 436 files; typecheck + Biome clean (1030 files); voxel determinism byte-identical; hash `0xff6f3d62` |
| `bun run build` | 0 | Vite 438 modules, `index-BR1jNXG_.js` (1,106.89 kB); pre-existing >500 kB chunk warning only |
| `bun run balance` | 0 | 1680 fights, capShare 30.8% ≤ 33.3%, decisiveShare 93.7%, 34 gates OK |
| `bun run gate:determinism` | 0 | 21 species × 3 stages + 5 props byte-identical (primary; denied to subagent) |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 `expect()` calls (primary; denied to subagent) |
| `bun test apps/client/src/live/panel.test.ts --timeout 120000` | 0 | 2 pass / 0 fail, 20 `expect()` calls |
| `bun test scripts/deploy/server-image.test.ts --timeout 120000` | 0 | 13 pass / 0 fail (post-fix) |

Sim hash is `0xff6f3d62` throughout. No allowlist was added and no determinism artifact
was regenerated to make a check pass.

## Module caps

- Caps: client / sim / server **12,288 B**, voxel **24,576 B**, enforced by the three
  `module-size.test.ts` guards inside `bun run verify` (recursive byte walk, no name
  allowlist, only co-located `*.test.*` exempt).
- The largest changed client `live/` file is well under 12,288 B; the full `verify` run
  passed with no module-cap violation. No cap, threshold or allowlist was changed.

## Deployed URLs and console result

- Client `https://apex-league.pages.dev/`, API `https://apex-api.ansyar-world.top/`
  (`/health` 200 as above). `ALLOWED_ORIGIN` and deploy config were not changed.
- Console: `Total messages: 0 (Errors: 0, Warnings: 0)` in both browser sessions for the
  Phase 1 verdict/forfeit proofs and for both Phase 2 bouts.

## Screenshot paths

All under `.conductor/evidence/20261120-live-pvp-production-acceptance/` (gitignored).

- Phase 1: `desktop-01-room-open.png`, `desktop-02-fight-live.png`,
  `desktop-03-verdict.png`, `desktop-04-forfeit-verdict.png`,
  `phone-01-room-joined.png`, `phone-02-fight-live.png`, `phone-03-verdict.png`.
- Phase 2: `desktop-01-first-invite.png`, `desktop-03-first-verdict.png`,
  `desktop-05-second-invite.png`, `desktop-06-second-fight-live.png`,
  `desktop-07-second-verdict.png`, `phone-03-first-verdict.png`,
  `phone-05-second-invite.png`, `phone-06-second-fight-live.png`,
  `phone-07-second-verdict.png`.
- Historical failure artifact: `desktop-ws-upgrade-404.png`; raw probe log `probe-log.md`.

## Acceptance criteria (AC-1..AC-9)

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | Production two-client run reaches a verdict and returns both clients to ranch with 0 console errors + desktop/phone room/fight/verdict screenshots | Room `QXGCY3` Defeat/Victory + ranch return; `desktop-01/02/03`, `phone-01/02/03`; console 0/0 | pass |
| AC-2 | Mid-bout disconnect → forfeit verdict for survivor, clean return, 0 console errors | Room `XH8D8K` forfeit copy + `desktop-04-forfeit-verdict.png`; no zombie state; console 0/0 | pass |
| AC-3 | Regression fails before panel-reset fix and passes after; reopened panel fresh without reload | 0p/2f → 2p/0f; rooms `75EWUX` → `RL3ZH4`; `desktop-05-second-invite.png`, `phone-05-second-invite.png` | pass |
| AC-4 | `integrated.md` records commands, counts, hash, caps, screenshot paths, console, URLs, scope proof | This record (integrated verification + commands + caps + screenshots + scope proof) | pass |
| AC-5 | `product.md` Phase 4 landed note (dated, PR #82); ADR line noted superseded; ADR unchanged | `product.md:339` now reads "live PvP landed 2026-11-20 (PR #82), with production acceptance in PR #83/#84 and this track."; supersession in `phase-3.md`; archived ADR untouched | pass |
| AC-6 | Five commands exit 0, hash `0xff6f3d62`, caps pass; only approved manifest/deploy deviation; no protocol/save/balance/pacing/CORS change | Command table + scope proof below; hash `0xff6f3d62`; no allowlist | pass |
| AC-7 | No credentials, passphrases or real player data in tracked artifacts; only two throwaway trainers | Two concurrent throwaway identities per proof; six total across the blocked attempt, retry and second-bout proof; passphrases browser-derived, never written to file/URL/room code/log/screenshot; credentials only in `apex.trainer` localStorage | pass |
| AC-8 | Repo-external production failure recorded as blocked with probe output; no fabricated pass | Historical 404/503 blocked records in `production-proof.md`; resolved by owner redeploy, not by a config workaround | pass |
| AC-9 | Deploy-contract test fails before container fix and passes after; `main.ts` boots with imports resolved | 10p/3f → 13p/0f; image-like boot + negative control in `phase-1R.md` | pass |

## Scope proof

`git diff e5459deb..HEAD` touches only:

- client `live/` modules and tests (`panel.ts`, `invite.ts`, `panel.test.ts`);
- the approved server container-runtime files (`apps/server/package.json`, `bun.lock`,
  `apps/server/Dockerfile`, `apps/server/Dockerfile.dockerignore`);
- the deploy-contract test (`scripts/deploy/server-image.test.ts`);
- Conductor/docs state (track plan/spec/metadata/index, `tracks.md`, verification records)
  and, in this phase, `conductor/product.md`.

There is **no** change to `LIVE_PROTOCOL_VERSION` (1), `SIM_VERSION` (3), save schema,
balance gates, pacing pins/fences, CORS / `ALLOWED_ORIGIN`, deploy configuration, or any
dependency beyond the approved `@apex/sim` workspace declaration. No module-cap allowlist
was added; module caps are unchanged. No credential, passphrase or real player data appears
in tracked artifacts.

## Thin-slice limitations

- Live PvP is a minimal two-client slice: **no** matchmaking, rating, reconnect, pause,
  spectator or auto-rematch. A flaky socket ends the bout (surfaced in the verdict copy).
- The physical-device-lab pass is a roadmap item, not a phase gate; mobile proof is at the
  393×852 browser viewport only.
- Each proof used two concurrent throwaway trainer identities (six total across the blocked attempt, retry and second-bout proof); no real player data is involved. This is the accepted interpretation of NFR-2 (a fresh pair per proof attempt).
- The Phase 2 browser proof used the fixed local bundle served from the real Pages origin
  because the deployed bundle is stale; a post-merge production spot-check of the fixed
  bundle is a follow-up outside this track. The feature itself is landed (PR #82) with
  production acceptance recorded here and in PR #83/#84.

## Final verdict

**Live PvP production acceptance: VERIFIED.** All nine acceptance criteria pass. The two
browser proofs, forfeit path and panel reset are evidenced with screenshots and clean
consoles; all configured verification commands are green at hash `0xff6f3d62`; the only
code changes are the client `live/` fix and the owner-approved container-runtime deviation;
no credentials are in tracked artifacts. The archived ADR is not edited — its stale
visual-proof line is explicitly superseded by this record and `production-proof.md`
(see `phase-3.md`). No push, merge or PR was performed by this phase.

Primary re-ran all five configured commands on the final tree after the `product.md` edit:
`bun run verify` exit 0 (4448 pass / 1 skip / 0 fail, 665709 `expect()` calls, 4449 tests /
436 files, hash `0xff6f3d62`), `bun run build` exit 0, `bun run balance` exit 0,
`bun run gate:determinism` exit 0, `bun run test:fuzz` exit 0 (139 pass / 0 fail, 129015
`expect()` calls). Full outputs: `C:\Users\Ansyar\.local\share\opencode\shell\4b140c9c7577b3ebb6aa72ff77e0ac4624c0c569\p3-verify\*.out`.
