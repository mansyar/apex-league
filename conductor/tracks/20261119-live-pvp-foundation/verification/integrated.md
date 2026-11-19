# Integrated verification — Live PvP Foundation Spike

**Track:** `20261119-live-pvp-foundation`
**Branch:** `feat/20261119-live-pvp-foundation`
**Base:** `ab1c83f98a512a9a973e8480dc8fe18faad5be7d`
**Final checkpoint:** `ea0865e0`
**Date:** 2026-11-20

## Exact commands and results

All five commands were run separately on the final tree. Earlier failures of
`packages/sim/src/cup/gatekeeper-reach.test.ts` (60 s timeout at ~95 s) were
load-induced: the same test passes in 15.8 s in isolation. The final full sweep
was run with only the API server alive (no Vite, no browser sessions).

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | Final (post-R2) 4443 pass, 1 skip, 0 fail; 665683 `expect()` calls; 4444 tests across 435 files; Biome clean; typecheck clean; final sim hash `0xff6f3d62` (earlier: 4438 → 4442 pass) |
| `bun run build` | 0 | Vite build OK |
| `bun run balance` | 0 | 1680 fights; capShare 30.8% <= 33.3%; decisiveShare 93.7%; all 34 gates OK |
| `bun run gate:determinism` | 0 | 21 species × 3 stages + 5 props byte-identical; wing champion 151344 bytes / 2158 tris |
| `bun run test:fuzz` | 0 | 139 pass, 0 fail; 129015 `expect()` calls; full `APEX_FUZZ_SWEEP=full` |

## Module caps

Caps: server/sim/client 12,288 B per module, voxel 24,576 B. No allowlist,
no cap-file changes.

| Module | Bytes | Cap | Result |
| --- | --- | --- | --- |
| `apps/server/src/live/route.ts` | 9561 | 12288 | PASS |
| `apps/server/src/live/room.ts` | 7050 | 12288 | PASS |
| `apps/server/src/live/loop.ts` | 4955 | 12288 | PASS |
| `packages/sim/src/live/fight.ts` | 6857 | 12288 | PASS |
| `packages/sim/src/live/parse.ts` | 6165 | 12288 | PASS |
| `packages/sim/src/live/types.ts` | 4613 | 12288 | PASS |
| `apps/client/src/live/protocol.ts` | 6274 | 12288 | PASS |
| `apps/client/src/live/invite.ts` | 5238 | 12288 | PASS |
| `apps/client/src/live/panel.ts` | 5225 | 12288 | PASS |

Largest live module is 9561 B (78% of cap). No voxel source changed.

## Visual proof

- Server: `DATABASE_PATH` temp SQLite, `PORT=3457`, `ALLOWED_ORIGIN=http://localhost:5174`, `bun apps/server/src/main.ts`; `/health` 200, schema `0003_ghost.sql`.
- Client: `VITE_API_ORIGIN=http://localhost:3457`, Vite on `http://localhost:5174`.
- Two real Chrome contexts: desktop **1440×900**, phone **393×852**.
- Two registered trainers with pushed saves; identity claimed from `apex.trainer` localStorage.
- Create by code `A7C2FU`, join by code, both ready, both entered the live arena, both reached a natural verdict (desktop Defeat / phone Victory), both returned to the ranch via "Back to ranch".
- Mid-match disconnect on a fresh room: guest left; host received `reason: forfeit, winnerSeat: 0` and the browser rendered "Opponent forfeited ... You keep the win.", then returned cleanly.
- `playwright-cli console`: **0 errors, 0 warnings** on both clients after the full flow and after the forfeit flow.
- Post-review-fix re-proof: after the F1 cast-mapping fix, room `J2UV36` was
  created and joined at 1440×900 and 393×852, both readied, both entered the
  arena and reached a natural verdict, then returned to the ranch with 0 console
  errors. The 852×393 landscape pass used the same live panel with no horizontal
  scroll and no occluded controls; no orientation media query was needed.
- Post-R2: a new in-memory route test covers create → join → host disconnect →
  third join with distinct intents from each socket, proving each drives its own
  fighter and the forfeit winner is the remaining seat (`phase-R2.md`).

### Screenshot paths

Local artifacts (gitignored) under `.conductor/evidence/20261119-live-pvp-foundation/`:

| Viewport | Path | Moment |
| --- | --- | --- |
| 1440×900 | `.conductor/evidence/20261119-live-pvp-foundation/desktop-01-room-open.png` | room created, waiting |
| 1440×900 | `.conductor/evidence/20261119-live-pvp-foundation/desktop-02-fight-live.png` | live arena |
| 1440×900 | `.conductor/evidence/20261119-live-pvp-foundation/desktop-03-verdict.png` | natural verdict |
| 1440×900 | `.conductor/evidence/20261119-live-pvp-foundation/desktop-04-forfeit-verdict.png` | opponent-forfeit verdict |
| 393×852 | `.conductor/evidence/20261119-live-pvp-foundation/phone-01-room-joined.png` | room joined, waiting |
| 393×852 | `.conductor/evidence/20261119-live-pvp-foundation/phone-02-fight-live.png` | live arena |
| 393×852 | `.conductor/evidence/20261119-live-pvp-foundation/phone-03-verdict.png` | natural verdict |
| 852×393 | `.conductor/evidence/20261119-live-pvp-foundation/phone-landscape.png` | landscape invite panel (no horizontal scroll, no occluded controls) |
| 1440×900 | `.conductor/evidence/20261119-live-pvp-foundation/desktop-05-f1-fight.png` | post-F1 live arena |
| 393×852 | `.conductor/evidence/20261119-live-pvp-foundation/phone-04-f1-fight.png` | post-F1 live arena |

## Acceptance criteria

| ID | Result | Evidence |
| --- | --- | --- |
| AC-1 | PASS | `packages/sim/src/live/types.test.ts`, `parse.test.ts` |
| AC-2 | PASS | `apps/server/src/live/room.test.ts` |
| AC-3 | PASS | `apps/server/src/live/loop.test.ts` (incl. bootstrap-frame regression) |
| AC-4 | PASS | `apps/server/src/live/route.test.ts` (in-memory, no port) |
| AC-5 | PASS | `panel.ts` / `state.test.ts` + desktop and phone screenshots |
| AC-6 | PASS | two-client browser run + forfeit probe + 0 console errors |
| AC-7 | PASS | `verification/decision.md` (eight decision areas) |
| AC-8 | PASS | this file (commands, counts, caps, screenshot paths, console result) |
| AC-9 | PASS | five-command table above; hash `0xff6f3d62` unchanged |
| AC-10 | PASS | scope proof below |

## Scope proof

`git diff <base>..HEAD --name-only` shows changes only in the three `live/`
module trees, their tests, the two documented integration seams
(`packages/sim/src/index.ts` two re-exports; `apps/server/src/app.ts` route
registration), the two recorded deviations (`apps/server/src/main.ts` WS
serving; `apps/server/tsconfig.json` sim path mapping), and Conductor state.

No change to `SIM_VERSION` (still 3), save schema or `/trainers` storage,
dependency manifests or lockfile, balance gates or pacing pins, CORS config,
deployment config, voxel source, or unrelated product code. No allowlist added.

## Known thin-slice limitations

- After "Back to ranch", reopening the invite panel retains the last code and verdict; starting another bout requires a page reload. No reconnect/pause/spectator is in scope.
- `verification/decision.md` records deferred matchmaking, rating and remote deployment explicitly.

**Verdict: integrated verification PASS.**
