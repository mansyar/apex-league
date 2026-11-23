# Phase 1 Evidence — Baseline evidence and drift inventory

| Field | Value |
| --- | --- |
| Track | `20261123-doc-truth-sweep` (Documentation Truth Sweep) |
| Phase | 1 — Baseline evidence and drift inventory |
| Date | 2026-11-23 |
| Branch | `chore/20261123-doc-truth-sweep` |
| Base (spec / `origin/main`) | `059809f36ff8b0bc7ee51ebf66b68a8ad82345ba` |
| Phase base (brief) | `0a19422a87aca67dab85e5b9532448161d68fa39` |
| Head at verification | `d2e96d8b0730e69da324646596e286741111d0a4` |
| Result | **verified by primary** (all Phase 1 evidence captured from live probes) |
| Covers | FR-1, AC-1, NFR-5 |

No source, doc, gate, workflow or Conductor-state file was changed in this
phase. Only this report and artifacts under `.conductor/evidence/20261123-doc-truth-sweep/`
were written.

## P1.T1 — Exact doc-drift anchors (verbatim)

Captured with native `read` from the unchanged tree at the head above.

### P1.T1.1 — `conductor/product.md:368-376`

```
368:   band on 2026-11-19; the 20-species goal is met. **Owner decision
369:   2026-11-18:** the global-pacing D-1 decision is closed — the ≤1/3 cap-share
370:   fence stays on the 840-fight matrix, the 20/42 fixture miss (D-3) and its
371:   population bias (D-4) were recorded debt on 2026-11-18 and both closed on
372:   2026-11-20 (track `20261120-telemetry-fixture-debt`): D-3 met by the D-2 45 s cap
373:   side effect at `11/42 (26.2%)` with no new pacing change; D-4 diagnosed and bounded,
374:   fixture unchanged and re-stratification deferred to a future product-decision track.
375:   The kite band (D-2) closed 2026-11-20 with a speed-aware Kite clamp, a 45 s fight cap and a two-species re-tune (track `20261120-kite-band-reachability`),
376:   and both debt pins remain in place.)*
```

Stale anchor: "and both debt pins remain in place." (line 376), which contradicts
the same paragraph's "both closed on 2026-11-20" (line 371).

### P1.T1.2 — `conductor/tech-stack.md:394-402` and `:808-826`

```
394:   pushes `ghcr.io/<owner>/apex-league-server:<sha>` (plus `latest` on `main`)
395:   with `packages: write` and the built-in token passed through `env:`, never
396:   interpolated into a `run:` body. Coolify pulls the SHA tag and owns the deploy
397:   cadence. `scripts/deploy/server-image.test.ts` pins all of that. The image was
398:   built and run locally on 2026-10-26: uid 1000, `/health` 200 with
399:   `schemaVersion 0001_init.sql`, a preflight from the configured origin 204 with
400:   all three access-control headers, and both a foreign origin and the
401:   `apex-league.pages.dev.evil.test` lookalike refused. The Coolify deploy itself
402:   is configuration-complete and has not run.*
```

```
808:     (`apps/client/dist`); the workflow and the smoke check both read them from
809:     there instead of repeating them. The first deploy creates the Pages project
810:     if it does not exist (wrangler will not do it non-interactively), so no
811:     manual `pages project create` is needed. After the upload,
812:     `scripts/smoke/smoke.ts` loads the deployed URL in a fresh browser context,
813:     drafts a starter, asserts the ranch canvas and HUD render, and fails the run
814:     on any console error/warning or failed asset request. The client deploy is
815:     configuration-complete but **has not run yet**: `deploy.yml` has never been
816:     on `main`, and the two secrets are the owner's to add, so
817:     `https://apex-league.pages.dev/` does not resolve today. The server half
818:     stays deferred, unchanged.*
819: -   *2026-10-27 - Prod API wiring (track `20261027-prod-api-wiring`): the
820:     server half is LIVE at `https://apex-api.ansyar-world.top` (Coolify,
821:     `ALLOWED_ORIGIN=https://apex-league.pages.dev`, SQLite on the named volume
822:     `apex-data:/data`). `deploy.yml` injects the origin from the
823:     `APEX_API_ORIGIN` repository variable as `VITE_API_ORIGIN` at build time on
824:     `main` and fails fast when it is missing; preview builds carry no origin
825:     and stay offline-only. The 2026-10-26 note above ("has not run yet / stays
826:     deferred") is superseded for the server.*
```

Stale anchors: "has not run" (line 402), "has not run yet" (line 815),
"does not resolve today" (line 817), "stays deferred, unchanged" (line 818).
Line 826 supersedes the "has not run yet / stays deferred" wording **for the
server only**; the client half is still asserted as never deployed.

## P1.T2 — Live evidence

### P1.T2.1 — Probes (primary-executed, all exit 0)

| Probe | Command as run by primary | Exit | Result |
| --- | --- | --- | --- |
| Client HTTP status | `curl.exe -s -o NUL -w "%{http_code}" --max-time 10 https://apex-league.pages.dev/` | 0 | `200` |
| Deployed bundle path + 4 markers | resolve `/assets/index-*.js` from client HTML, then fetch the asset | 0 | `/assets/index-B6REQeQ0.js`, 1,107,393 bytes; all four markers present exactly once each: `Live PvP`, `Room code`, `/live`, `apex-api.ansyar-world.top` |
| API health payload | `curl.exe -s --max-time 10 https://apex-api.ansyar-world.top/health` | 0 | `200 {"status":"ok","schemaVersion":"0003_ghost.sql"}` |
| `/live` plain GET | `curl.exe -s -i --max-time 10 https://apex-api.ansyar-world.top/live` | 0 | `HTTP/1.1 404 Not Found`, body `NOT_FOUND`, `cf-cache-status: DYNAMIC`, `Server: cloudflare` |
| `/live` with valid Upgrade headers (`Connection: Upgrade`, `Upgrade: websocket`, `Sec-WebSocket-Version: 13`, `Sec-WebSocket-Key: SGVsbG9XZWJTb2NrZXQ=`) | same endpoint with Upgrade headers | 0 | `HTTP/1.1 400 Bad Request`, `Content-Length: 31`, consistent with `Expected a websocket connection` |

No browser 101 was re-observed in this track; the earlier authoritative browser
proof is from PR #82/#85. Raw probe outputs:
`C:\Users\Ansyar\AppData\Local\Temp\opencode\dts-p1-primary\`.

### P1.T2.2 — Workflow IDs and stale inventory

| Item | Result |
| --- | --- |
| Deploy / Server image / Nightly determinism run IDs | primary `gh run list --limit 8 --json databaseId,name,status,conclusion,headBranch,createdAt` exit 0: Nightly determinism success `45018277857` (2026-11-22), `44898666458` (2026-11-21), `44731078115` (2026-11-20); Deploy success `44803326606` and `44708870397` (both 2026-11-20); Server image success `44803326527` (2026-11-20); CI success `44743770468` (PR #87 branch); CI cancelled `44743614778`. |
| Stale branches | 8 exact names, recorded below and in `stale-inventory.md`. |
| Stale run files | 75 `.log` files (14 at `.conductor/` root + 61 under `.conductor/evidence/`, including `tmp/`), plus `dev-server.err`, `.conductor/backups/` and scratch files. |
| Stale Conductor runs | 39 stale run directories + 37 stale `.json` files + 3 extra phase-brief `.md` files (current run excluded). |

Stale branch names: `chore/20261027-prod-api-wiring`,
`feat/20261028-elemental-identity`, `feat/20261028-fire-move-identity`,
`feat/20261110-battle-variance`, `fix/20261120-server-image-sim-src`,
`fix/20261120-server-sim-runtime`, `t3/346e8a09`, `t3/opening-command`.
Nothing deleted; deletion requires separate owner confirmation (AC-5, NFR-6).

## Commands table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Gate (chained) | `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz` | 0 (five separate legs) | The executor ran the five legs individually; primary re-ran all five on the final tree, all exit 0. |
| Gate | `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail, 670479 expect() calls, 4460 tests across 437 files; Biome 1034 files; determinism gate OK; final sim hash `0xff6f3d62`. |
| Gate | `bun run build` | 0 | Vite 438 modules; `index-BfBI_4TA.js` 1,107.33 kB; pre-existing >500 kB chunk warning only. |
| Gate | `bun run balance` | 0 | 1680 fights; capShare `370/1680 (22.0%)`; decisiveShare 95.1%; capWinQuality 78.9%; medianDuration 32.80 s; durationMax 45.00 s; 34/34 gates ok. |
| Gate | `bun run gate:determinism` | 0 | All 21 species × 3 stages + 5 props byte-identical. |
| Gate | `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 expect() calls (139 tests / 135 files). |
| Scope | `git status --porcelain` | 0 | No output — clean tracked tree at baseline and at primary verification. |
| Scope | `git diff --quiet origin/main..HEAD -- packages apps` | 0 | No output — empty source diff (proof below). |
| Scope | `git rev-parse HEAD` | 0 | `0a19422a87aca67dab85e5b9532448161d68fa39`. |
| Scope | `git rev-parse origin/main` | 0 | `059809f36ff8b0bc7ee51ebf66b68a8ad82345ba`. |
| Scope | `git log --oneline origin/main..HEAD` | 0 | 3 Conductor-state commits: `0a19422a`, `d9e37623`, `30f99e7b` — no source/doc changes. |
| Scope | `git branch --format='%(refname:short)'` | 0 | 10 branches; 8 stale, `main`, current. |
| Probe | `curl.exe -s -o NUL -w "%{http_code}" --max-time 10 https://apex-league.pages.dev/` | 0 | `200`. |
| Probe | `curl.exe -s --max-time 10 https://apex-api.ansyar-world.top/health` | 0 | `200 {"status":"ok","schemaVersion":"0003_ghost.sql"}`. |
| Probe | bundle-marker probe (`/assets/index-*.js`) | 0 | `/assets/index-B6REQeQ0.js`, 1,107,393 bytes; 4 markers exactly once each. |
| Probe | `curl.exe -s -i --max-time 10 https://apex-api.ansyar-world.top/live` | 0 | plain GET `404 Not Found` / `NOT_FOUND`; with Upgrade headers `400 Bad Request` / `Content-Length: 31`. |
| Probe | `gh run list --limit 8 --json databaseId,name,status,conclusion,headBranch,createdAt` | 0 | Deploy/Server image/Nightly determinism IDs as in P1.T2.2; CI success `44743770468`, cancelled `44743614778`. |

## Acceptance-criteria mapping

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | `verification/phase-1.md` contains exact old product and tech-stack passages, live probe outputs, workflow IDs, and stale inventory; source diff empty. | P1.T1 verbatim blocks; P1.T2.1 primary probe table (200s, bundle markers, `/live` responses); P1.T2.2 run IDs; stale inventory; empty source diff. | **met** |
| AC-4 | Spot-check evidence records client 200, API health 200 with `schemaVersion 0003_ghost.sql`, bundle markers, `/live` response, run IDs. | P1.T2.1: client `200`; health `200 {"status":"ok","schemaVersion":"0003_ghost.sql"}`; `/assets/index-B6REQeQ0.js` with all four markers; `/live` plain GET `404` + Upgrade `400`; P1.T2.2 run IDs. | **met** |
| AC-5 | Stale inventory lists exact branch and run-file names/counts and states deletion requires owner confirmation; no deletion performed. | P1.T2.2 + `stale-inventory.md` (8 branches, 75 `.log` files, 39 stale runs); deletion not performed. | **met** |
| AC-6 | `git diff --quiet <base>..HEAD -- packages apps` exits 0; only approved docs/verification/evidence change. | Command exit 0 on baseline and final tree; `git log origin/main..HEAD` shows only 3 Conductor-state commits; this phase wrote only evidence paths. | **met** |
| AC-7 | All five configured commands exit 0 with hash `0xff6f3d62`. | Primary re-ran all five legs on the final tree, all exit 0: `verify` (hash `0xff6f3d62`), `build`, `balance`, `gate:determinism` (21 species × 3 stages + 5 props byte-identical), `test:fuzz` (139 pass / 0 fail). | **met** |

Other ACs are Phase 2/3 scope and not asserted here.

## Empty source-diff proof

`git diff --quiet origin/main..HEAD -- packages apps` exited 0 with no output.
`git log --oneline origin/main..HEAD` contains only three Conductor-state
commits (`30f99e7b`, `d9e37623`, `0a19422a`). `git status --porcelain` was empty
before any evidence was written. Therefore the source tree (`packages/`,
`apps/`) is byte-identical to `origin/main` at baseline, as required.

## Evidence paths

- `conductor/tracks/20261123-doc-truth-sweep/verification/phase-1.md` — this report.
- `.conductor/evidence/20261123-doc-truth-sweep/doc-anchors.md` — verbatim anchors.
- `.conductor/evidence/20261123-doc-truth-sweep/command-results.md` — raw command outcomes.
- `.conductor/evidence/20261123-doc-truth-sweep/probe-record.md` — fresh primary probes + historical values.
- `.conductor/evidence/20261123-doc-truth-sweep/stale-inventory.md` — stale names/counts.

## Deviations

- None. All files written are inside `Touches` (`verification/phase-1.md` and
  `.conductor/evidence/20261123-doc-truth-sweep/**`). No file outside Touches was
  edited; no source/doc/gate/workflow/Conductor-state change was made.

## Blockers

All blockers resolved by primary re-run on final tree `d2e96d8b` (see
`## Primary verification (final tree, HEAD d2e96d8b)` below). No blocker remains.

## Notes

- The executor's `&&` chain and the two colon-named scripts were denied in the
  phase-executor shell; the primary re-ran all five legs and the curl/gh probes
  successfully. No workaround was attempted by the executor.
- The `/live` plain GET is `404` and the valid-Upgrade probe is `400` in this
  track; no browser 101 was re-observed here. The earlier authoritative browser
  proof is from PR #82/#85.
- Phase 1 changed no source, doc, gate, workflow or Conductor-state file; only
  this report and the gitignored artifacts under `.conductor/evidence/20261123-doc-truth-sweep/`.

## Primary verification (final tree, HEAD `d2e96d8b`)

All commands below were executed by the primary on tree
`d2e96d8b0730e69da324646596e286741111d0a4` with a clean working tree; each
exited 0. Raw outputs:
`C:\Users\Ansyar\AppData\Local\Temp\opencode\dts-p1-primary\`.

| Command | Exit | Observation |
| --- | --- | --- |
| `bun run verify` | 0 | 4459 pass / 1 skip / 0 fail, 670479 expect() calls, 4460 tests across 437 files; Biome 1034 files; determinism gate OK; final sim hash `0xff6f3d62`. |
| `bun run build` | 0 | Vite 438 modules; `index-BfBI_4TA.js` 1,107.33 kB; pre-existing >500 kB chunk warning only. |
| `bun run balance` | 0 | 1680 fights; capShare `370/1680 (22.0%)`; decisiveShare 95.1%; capWinQuality 78.9%; medianDuration 32.80 s; durationMax 45.00 s; 34/34 gates ok. |
| `bun run gate:determinism` | 0 | All 21 species × 3 stages + 5 props byte-identical. |
| `bun run test:fuzz` | 0 | 139 pass / 0 fail, 129015 expect() calls (139 tests / 135 files). |
| `curl.exe -s -o NUL -w "%{http_code}" --max-time 10 https://apex-league.pages.dev/` | 0 | `200`. |
| client HTML asset resolution + bundle fetch | 0 | `/assets/index-B6REQeQ0.js`; 1,107,393 bytes; markers `Live PvP`, `Room code`, `/live`, `apex-api.ansyar-world.top` each exactly once. |
| `curl.exe -s --max-time 10 https://apex-api.ansyar-world.top/health` | 0 | `200 {"status":"ok","schemaVersion":"0003_ghost.sql"}`. |
| `curl.exe -s -i --max-time 10 https://apex-api.ansyar-world.top/live` | 0 | plain GET `HTTP/1.1 404 Not Found`, body `NOT_FOUND`, `cf-cache-status: DYNAMIC`, `Server: cloudflare`; with Upgrade headers (`Connection: Upgrade`, `Upgrade: websocket`, `Sec-WebSocket-Version: 13`, `Sec-WebSocket-Key: SGVsbG9XZWJTb2NrZXQ=`) `HTTP/1.1 400 Bad Request`, `Content-Length: 31`, consistent with `Expected a websocket connection`. |
| `gh run list --limit 8 --json databaseId,name,status,conclusion,headBranch,createdAt` | 0 | Nightly determinism success `45018277857` (2026-11-22), `44898666458` (2026-11-21), `44731078115` (2026-11-20); Deploy success `44803326606`, `44708870397` (both 2026-11-20); Server image success `44803326527` (2026-11-20); CI success `44743770468` (PR #87 branch); CI cancelled `44743614778`. |

Source-diff scope proof: `git diff --quiet 059809f36ff8b0bc7ee51ebf66b68a8ad82345ba..HEAD -- packages apps` exited 0 with no output — source diff empty; working tree clean.

Verdict: Phase 1 accepted.
