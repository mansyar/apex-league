# Live PvP Production Acceptance — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track proves that the live PvP foundation shipped in PR #82 actually works
for two real browsers against the deployed stack (`https://apex-league.pages.dev/`
and `https://apex-api.ansyar-world.top`), then fixes the one confirmed thin-slice
defect found in local acceptance: the invite panel keeps its old room code and
verdict after "Back to ranch", so a second bout needs a page reload. It records
the evidence and the architecture decision's superseded note, and brings the
product roadmap wording in line with what has landed.

## Problem / Motivation

The foundation track has complete *local* proof: two Chrome contexts at
1440×900 and 393×852, a natural verdict, a forfeit verdict, and a clean console,
all against a locally started API. CI, the Pages deploy, and the server image
also pass. Nothing, however, has exercised a real WebSocket upgrade through the
production browser → Pages → Coolify path. A proxy that buffers or drops
upgrades would leave the shipped "Live PvP" chip unusable while every automated
check stays green. At the same time, the confirmed stale-panel defect makes a
second invitation impossible without a reload — acceptable in a spike, but not
in a shipped surface. Left unresolved, the project cannot claim production
acceptance for a feature its roadmap already treats as delivered.

## Goals & Success Metrics

- **Goal:** Prove or disprove the two-client live flow on the deployed stack and
  leave the invite surface in a state where a second bout starts cleanly.
- **Metric:** Two real browser contexts at 1440×900 and 393×852 create/join a
  room by code, reach a verdict, return to the ranch with **0 console errors**;
  a second invite starts with empty code, enabled controls, and no stale verdict
  without a reload; a separate mid-match disconnect yields a forfeit verdict to
  the survivor; all five configured verification commands exit 0 with sim hash
  `0xff6f3d62`; no dependency, protocol, save, balance, pacing, CORS or deploy
  configuration changes.

## Scope

### In Scope

- Two-client browser proof against the deployed client and API origins; capture
  room-open, fight-live and verdict screenshots at desktop and phone widths.
- A production disconnect/forfeit probe with a clean return for the survivor.
- A minimal client fix that resets the invite panel after a verdict or an
  explicit "Back to ranch", plus a regression test that fails before the fix.
- Integrated verification evidence, a supersession note for the archived ADR's
  stale "primary must run the visual proof" line, and a dated `product.md`
  Phase 4 entry marking live PvP as landed.
- Re-running `bun run verify`, `bun run build`, `bun run balance`,
  `bun run gate:determinism` and `bun run test:fuzz` on the final tree.

### Out of Scope

- Changes to deploy configuration, `ALLOWED_ORIGIN`, the reverse proxy/Coolify
  setup, `LIVE_PROTOCOL_VERSION`, `SIM_VERSION`, the save schema, balance gates,
  pacing pins, dependency manifests, or the lockfile.
- Matchmaking, rating, reconnect, pause, spectator, auto-rematch, and the
  physical device-lab pass.
- Editing the archived ADR itself (`conductor/archive/.../decision.md`); it is
  historical evidence and is superseded by the new verification record.
- Fixing any repo-external infrastructure failure; that is recorded as a
  blocker with evidence instead (see NFR-5).

## Bug Details

- **Reproduction steps:**
  1. On the deployed client, open "Live PvP", create or join a room, fight to a
     verdict, and click "Back to ranch".
  2. Open "Live PvP" again without reloading the page.
- **Expected behavior:** A fresh invite: empty room-code input, enabled
  "Create room" and "Join room", no previous room code or verdict text, status
  idle, and the announcer quiet until the next action.
- **Actual behavior:** The modal is built once in `createLivePanel`; `leave()`
  and `finish()` only set status, close the modal and tear down the transport,
  so the previous code, disabled inputs and verdict line persist.
- **Root-cause hypothesis:** `apps/client/src/live/panel.ts` has no `reset()`
  method, and `apps/client/src/live/invite.ts` never clears the per-invite DOM
  state on exit; the panel is reused across bouts.
- **Regression test:** A client DOM-harness test that drives room → verdict →
  leave and asserts the next open is fresh; it must fail before the fix and pass
  after it. A browser check serves the fixed local client with
  `VITE_API_ORIGIN` pointed at the production API and repeats the same
  sequence; a post-merge production spot-check is recorded as a follow-up.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Two real browser clients can use "Live PvP" on the deployed client/API origins: create a room, join by code, both ready, exchange dense snapshots in the arena, reach one verdict, and return to the ranch. | must |
| FR-2 | On the deployed stack, a mid-bout disconnect forfeits immediately: the survivor receives the forfeit verdict, the arena is left, and both transports close with no zombie room state. | must |
| FR-3 | After a verdict or "Back to ranch", reopening the invite panel starts a fresh invite without a page reload: empty code input, enabled start controls, hidden room/result rows, idle status. | must |
| FR-4 | Evidence for the production proof is committed in `verification/integrated.md`: exact commands, test counts and sim hash, module caps, screenshot paths, console result, deployed URLs, and the scope proof. | must |
| FR-5 | Documentation truth: the new verification record notes that the archived ADR's "primary must run the visual proof" line is superseded, and `product.md` Phase 4 records live PvP as landed with the date and PR reference. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No new runtime dependency; no change to `LIVE_PROTOCOL_VERSION` (1), `SIM_VERSION` (3), save schema, balance gates, pacing pins/fences, CORS, deploy configuration, `package.json` or the lockfile. |
| NFR-2 | Only two throwaway trainer identities and their throwaway saves are written to the production API. No real player data, personal credentials, or passphrases appear in the repo, evidence files, URLs, room codes, or console output; passphrases travel only in the JSON message body. |
| NFR-3 | Visual proof at 1440×900 and 393×852 against the deployed origin with 0 console errors; module caps (client/sim/server 12,288 B, voxel 24,576 B) remain enforced with no allowlist. |
| NFR-4 | All repository writes stay inside the client `live/` modules, their tests, and Conductor/docs state; no server, sim, voxel or infrastructure source changes are expected. |
| NFR-5 | If the production WebSocket upgrade or CORS fails for a repo-external reason, the phase is recorded as `blocked` with the exact probe output; no deploy/proxy/CORS workaround is attempted. |
| NFR-6 | The five configured verification commands exit 0 on the final tree and the determinism hash remains `0xff6f3d62`. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | A production two-client run reaches a verdict and returns both clients to the ranch with 0 console errors, with desktop and phone screenshots of room, fight and verdict. | FR-1 |
| AC-2 | A production mid-match disconnect yields a forfeit verdict for the survivor, a clean return, and 0 console errors. | FR-2 |
| AC-3 | A regression test fails before the panel-reset fix and passes after; with the fixed local client connected to the production API, reopening the panel after a bout shows the fresh state without a reload. | FR-3 |
| AC-4 | `verification/integrated.md` records exact commands, counts, hash, caps, screenshot paths, console result, deployed URLs and a scope proof. | FR-4 |
| AC-5 | `product.md` Phase 4 marks live PvP landed with a dated note and PR #82 reference; the new verification record notes the ADR line is superseded; the archived ADR is unchanged. | FR-5 |
| AC-6 | `bun run verify`, `bun run build`, `bun run balance`, `bun run gate:determinism` and `bun run test:fuzz` all exit 0 with hash `0xff6f3d62`; module caps pass; no manifest, protocol, save, balance, pacing, CORS or deploy file changed. | NFR-1, NFR-3, NFR-6 |
| AC-7 | No credentials, passphrases or real player data appear in tracked artifacts; only the two throwaway trainers were used. | NFR-2 |
| AC-8 | Any repo-external production failure is recorded as a blocked phase with probe output and no config change; no fabricated pass is claimed. | NFR-5 |

## Edge Cases

- The production client is a build-time constant (`VITE_API_ORIGIN`); if the
  deployed bundle does not contain the live chip, stop and report the build
  drift rather than testing a local build and calling it production proof.
- Websocket upgrade refused, proxied without upgrade support, or CORS mismatch:
  record the exact response/console evidence; do not change `ALLOWED_ORIGIN`
  or deploy configuration (NFR-5).
- Credential creation on a third-party anonymous trainer endpoint fails: stop
  the proof, record the response, and do not reuse another trainer's identity.
- Mid-match disconnect after the fight has already ended: verify the verdict is
  natural, not a forfeit, before claiming the forfeit path.
- The panel is reopened after an error (bad room code, bad passphrase) as well
  as after a verdict: reset must clear the error line too.
- Production API is briefly unavailable: the client degrades to offline-only;
  record that rather than retrying indefinitely.

## Dependencies

- **Tracks:** `20261119-live-pvp-foundation` — verified complete, archived, and
  its squash commit `e5459deb` is an ancestor of `origin/main`.
- **External:** deployed client `https://apex-league.pages.dev/`, API
  `https://apex-api.ansyar-world.top`, `gh` CLI, `playwright-cli` 0.1.22, and
  permission to create two throwaway trainers on the production API.

## Open Questions & Assumptions

- **Assumption:** The production client served at `apex-league.pages.dev` keeps
  `VITE_API_ORIGIN=https://apex-api.ansyar-world.top` baked in; verified by the
  deployed bundle before the proof starts.
- **Assumption:** No Coolify/proxy credentials are available in this repo, so
  any upgrade failure is an evidence-only blocker (owner-approved).
- **Assumption:** Throwaway trainer creation on the production API is approved
  by the owner; no personal trainer credentials are used (owner-approved).
- **Assumption:** The archived ADR is historical and is not edited; only a new
  verification file records its supersession.
- **Assumption:** The panel fix is proven against the production API from a
  locally served fixed client; the deployed Pages bundle is refreshed by CI
  after merge and gets a follow-up spot-check outside this track.

## References

- `conductor/archive/20261119-live-pvp-foundation/verification/decision.md`
- `conductor/archive/20261119-live-pvp-foundation/verification/integrated.md`
- PR #82: https://github.com/mansyar/apex-league/pull/82
- `conductor/product.md`, `conductor/tech-stack.md`, `conductor/workflow.md`
- Production: https://apex-league.pages.dev/ and
  https://apex-api.ansyar-world.top/health
