# Phase 2 Verification — Elysia WebSocket route

- Track: `20261119-live-pvp-foundation` (Live PvP Foundation Spike)
- Phase: 2 — Elysia WebSocket route
- Date: 2026-11-19
- Branch: `feat/20261119-live-pvp-foundation`
- Base commit: `63a052aedb9aaefbe82cb799ba87178ff6712209`
- Head commit (code): `0feb3da2c062b851d5c5d025fe3e26f4d1ef731d`
- Result: **verified** — all five mandated commands pass with exit 0. Three were
  run by the implementing subagent; the two it could not run (`gate:determinism`,
  `test:fuzz`) were run by the primary orchestrator (see Primary verification).
  The initial `blocked` status is resolved.

## Summary

Phase 2 wires the room registry and authoritative match loop to an Elysia
WebSocket route on the injectable app. Connection logic lives in a
transport-agnostic core (`createLiveServer`) driven by the exact functions Elysia
invokes (`createLiveAdapter().message/close`) through fake socket hosts, so the
integration tests need no port, network, real clock or background work. The
`.ws("/live", …)` registration is a thin delegate over those tested handlers.

The initial implementation had two TypeScript errors in the test fixture and one
incorrect test assertion; these were fixed and re-verified. The full test suite,
typecheck, Biome check, client build, balance report and the determinism gate
(as a step inside `bun run verify`) all pass.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Verification | `bun run verify` | 0 | `bun run check` (all workspace typechecks) + `bun test --check --parallel` → **4421 pass, 1 skip, 0 fail** across 432 files; `biome check` → 1019 files clean, no fixes applied; determinism gate → all digests OK. |
| Build | `bun run build` | 0 | Vite client build, 432 modules transformed, `dist` assets written, clean exit. |
| Balance | `bun run balance` | 0 | 21 species / 1680 matrix fights, doctrine + boss tables; every gate `ok` (species bands, cap/decisive share, cap-win quality, duration bounds, damage band, boss beatability). |
| Determinism | `bun run gate:determinism` | n/a | **Denied** by the shell permission layer (`Permission denied: shell`). Reported in the phase report `blockers` list. The same gate did run as the final step of `bun run verify` and printed all OK lines. |
| Fuzz | `bun run test:fuzz` | n/a | **Denied** by the shell permission layer (`Permission denied: shell`). Reported in the phase report `blockers` list. |
| Git | `git status --short --branch` | 0 | Confirmed branch and modified-file set. |
| Git | `git add …` / `git commit -m "fix(live): correct route typing, import order and test assertion"` | 0 | Committed the follow-up fixes as `0feb3da2` (no amend). |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-4 | Room lifecycle and authoritative loop reachable over an Elysia WebSocket route on the injectable app | `apps/server/src/live/route.ts` registers `.ws("/live", …)` over `createLiveAdapter`; `apps/server/src/app.ts` adds `.use(liveRoutes({ db }))`; `verify` and `build` green | verified (fuzz command pending) |
| AC-4 | In-memory integration tests exercise create, join, ready, intents, verdict, disconnect and malformed messages with no port or real network | `apps/server/src/live/route.test.ts` — 11 passing tests over fake socket hosts and a fake clock, incl. `WS /live` registration and `/health` still answering | verified (fuzz command pending) |
| NFR-1 | Unchanged SIM_VERSION, artifact hashes and balance gates | `verify` determinism gate OK; `balance` all gates ok; no sim or artifact files touched | verified |
| NFR-2 | Server modules under 12,288 B | `module-size.test.ts` passed inside `verify` for the new `route.ts` | verified |
| NFR-3 | No new runtime dependency | `verify` passed; uses only installed Elysia 1.4.30 `.ws()` API | verified |
| NFR-4 | Trainer identity via existing passphrase store; secret never in URL, code or log | `dbAuthenticate` uses `claimTrainer`/`findTrainer`; tests assert the passphrase never appears in sent frames; suite green | verified |
| NFR-6 | Deterministic tests, no real timers, ports, network or background work | Fake `LiveClock` and fake `LiveSocketHost` in every test; no `listen`, `Bun.serve`, `setInterval` or fetch in route/test code; suite green | verified |

## Evidence paths

- `apps/server/src/live/route.ts` — core + Elysia adapter.
- `apps/server/src/live/route.test.ts` — in-memory integration suite (11 tests).
- `apps/server/src/app.ts` — injectable app registration.
- Commits `e83a41d478722680e53dc6f17e3ad9ed7228dfc9` (implementation) and
  `0feb3da2c062b851d5c5d025fe3e26f4d1ef731d` (fixes).
- This file.

## Deviations

None. All changes are inside the Phase 2 Touches list.

## Notes

- **Two commands could not be run here.** `bun run gate:determinism` and
  `bun run test:fuzz` were each rejected with `Permission denied: shell` when
  invoked individually. They were not retried, decomposed or worked around, per
  the phase rules. The primary should run them and hand back the output. The
  determinism gate itself did execute as the last step of `bun run verify` and
  passed; only the standalone invocation is outstanding.
- **Production WS serving gap (out of Touches, not changed):** `apps/server/src/main.ts`
  calls `Bun.serve({ port, fetch: app.fetch })` without `app.config.websocket`, so
  a real deployment will not upgrade `/live` until it uses `app.listen()` or
  spreads the WebSocket config into `Bun.serve`. The injectable app and its
  in-memory tests are unaffected; this belongs to the client/serving slice.
- **No ack message:** the frozen protocol has no room-created/joined/ready ack
  kind. Success is observable as the absence of a typed error and the start of
  the dense snapshot stream; no new protocol kind was introduced.
- **Sides for the spike:** `sidesForMatch` maps the two trainer identities to
  fixed deterministic `BattleSide` shapes (fire/water, stats/kit/tactic matching
  the accepted Phase 1 loop fixture) so the authoritative sim is runnable.
  Real creature/team selection is a later product slice; no data model changed.
- **Pump cadence:** the loop is pumped on `ready` and on each `intent`, matching
  the 20 Hz client order stream. No background timer is created, which keeps
  NFR-6 intact.

## Primary verification

Independent re-run by the primary orchestrator on 2026-11-19. Each command was
executed separately (the shell scope rejects `&&` chains); all exit codes were 0:

| Command | Exit | Summary |
| --- | --- | --- |
| `bun run verify` | 0 | All workspace typechecks clean; 4421 pass, 1 skip, 0 fail; Biome clean; determinism gate OK |
| `bun run build` | 0 | `@apex/client` production build, 432 modules |
| `bun run balance` | 0 | All 34 gates OK, 1680 matrix fights, all bosses beatable |
| `bun run gate:determinism` | 0 | All 21 species × 3 stages + 5 props regenerate byte-identically |
| `bun run test:fuzz` | 0 | 139 pass, 0 fail, 129015 expect calls |

- Files changed are exactly the Phase 2 Touches: `route.ts`, `route.test.ts`,
  `app.ts`, and this evidence file. No deviations.
- FR-4 and AC-4 are covered by 11 in-memory tests (create/join/ready/intents/
  verdict/disconnect/malformed, real passphrase identity, `/health` intact).
- The rework fixed the two TS2322/TS2769 errors in the test fixture; the
  primary re-ran the whole gate after the fix and it is green.

Verdict: Phase 2 accepted. The out-of-Touches production WS serving gap in
`apps/server/src/main.ts` is carried forward as a required deviation for Phase 3
so the two-client browser proof can upgrade `/live` in a real server.
