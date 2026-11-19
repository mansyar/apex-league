# Phase R1 verification — Review Fixes

- **Date:** 2026-11-20
- **Branch:** `feat/20261119-live-pvp-foundation`
- **Phase base:** `64a9e366fce416f1c2c3445ed50fcf7e75cca2c4`
- **Head:** `2c373210eb358285df9bd0050704b91ae68497b7`
- **Scope:** strict-mode fixes for review findings F1, F2 and F4 (F3 is
  primary-owned). No Conductor state, product doc, CSS or plan edits.

## Result

**Verified by primary.** All four review findings are fixed; focused tests and
all five required verification commands pass on the final tree. The subagent's
`verify` failure was a transient `gatekeeper-reach` timeout under parallel load
and was re-run successfully by the primary with minimal load; the two commands
denied to the subagent were executed by the primary. The two-client browser flow
was repeated after the F1 cast change with clean consoles.

## Findings fixed

| Finding | Change | Test |
| --- | --- | --- |
| F1 (FR-6) | `castingFor` now always casts stream side 0 to `owned` (`fire_drake`, `keys[0]`) and side 1 to `rival` (`water_axolotl`, `keys[1]`); only the visual seed varies by seat. Named export added for pure testing. | `apps/client/src/live/invite.test.ts` (new): both seats keep `owned.key`/`owned.name === keys[0]` and `rival.key`/`rival.name === keys[1]`. Pre-fix: 1 pass / 1 fail (seat 1 returned `guest-trainer` for `owned.name`). Post-fix: 2 pass / 0 fail. |
| F2 (FR-2) | `join` assigns the first free seat explicitly: `room.seats.some((s) => s.seat === 0) ? 1 : 0`. | `apps/server/src/live/room.test.ts`: new create → join → host disconnect → third join case; asserts distinct indices `{0, 1}` and both remaining seats' `ready` are honored into one start. Pre-fix: 14 pass / 1 fail (third got seat 1). Post-fix: 15 pass / 0 fail. |
| F4 (Low) | `winnerName` → `forfeiterName` in `verdictCopy` (rename only, no behavior change). | Existing `state.test.ts` verdict cases unchanged and pass. |

## Commands

Each command was invoked separately (no `&&`, no pipes).

| Command | Exit | Summary |
| --- | --- | --- |
| `bun test apps/client/src/live/invite.test.ts --timeout 120000` (pre-fix) | 1 | 1 pass / 1 fail — reproduces F1 on seat 1. |
| `bun test apps/server/src/live/room.test.ts --timeout 120000` (pre-fix) | 1 | 14 pass / 1 fail — reproduces F2. |
| `bun test apps/client/src/live/invite.test.ts apps/client/src/live/state.test.ts apps/server/src/live/room.test.ts --timeout 120000` (post-fix) | 0 | 23 pass / 0 fail, 98 expect() calls. |
| `bun run verify` | 1 | `bun run check` + full test sweep ran: **4441 pass / 1 skip / 1 fail**, 665675 expect() calls, 233.19 s. Sole failure: `packages/sim/src/cup/gatekeeper-reach.test.ts` test "a real climb reaches the authored final and fights it for real" timed out at 60000 ms (actual 90217.23 ms) — the transient under parallel load noted in the brief. Final hash `0xff6f3d62`; 5/5 battle invariants ok; balance-gate lines all ok. The `&&` chain stopped here, so `biome check` and `gate:determinism` did not run inside `verify`. |
| `bun test packages/sim/src/cup/gatekeeper-reach.test.ts --timeout 180000` (isolation re-run) | 0 | 10 pass / 0 fail, 1015 expect() calls, 9.48 s — confirms the `verify` failure was a transient timeout, not a regression. |
| `bun run build` | 0 | Vite built 438 modules in 512 ms; only the pre-existing >500 kB chunk warning. |
| `bun run balance` | 0 | 21 species / 1680 fights; capShare 30.8%; 34 gates all `ok`; hash unchanged. |
| `bun run gate:determinism` | 0 | Primary re-run: all 21 species × 3 stages + 5 props byte-identical; wing champion 151344 bytes / 2158 tris. |
| `bun run test:fuzz` | 0 | Primary re-run: 139 pass / 0 fail, 129015 `expect()` calls. |

## Primary verification (final tree)

With only the API server alive (no Vite, no browser sessions), all five commands
were run separately on the final tree `b99763a7`:

| Command | Exit | Result |
| --- | --- | --- |
| `bun run verify` | 0 | 4442 pass, 1 skip, 0 fail; 665675 `expect()` calls; 4443 tests across 435 files; Biome clean, typecheck clean; final hash `0xff6f3d62` |
| `bun run build` | 0 | Vite build OK (438 modules) |
| `bun run balance` | 0 | 1680 fights, capShare 30.8%, 34 gates all `ok` |
| `bun run gate:determinism` | 0 | byte-identical for all species/props |
| `bun run test:fuzz` | 0 | 139 pass, 0 fail |

### Two-client re-proof after F1

- Desktop 1440×900 and phone 393×852; API `:3457`, Vite `:5174`.
- Room `J2UV36`: create → join → both Ready → both "Fight live." → natural
  verdict (host Defeat / guest Victory) → both "Back to ranch".
- Screenshots: `.conductor/evidence/20261119-live-pvp-foundation/desktop-05-f1-fight.png`,
  `.conductor/evidence/20261119-live-pvp-foundation/phone-04-f1-fight.png`.
- `playwright-cli console`: 0 errors / 0 warnings on both clients, before and
  after returning to the ranch.

**Verdict: Phase R1 accepted.**

## Requirements / acceptance coverage

| ID | Status | Evidence |
| --- | --- | --- |
| FR-6 | fixed (F1) | `invite.test.ts` 2/2 pass; fixed positional cast mapping. |
| FR-2 | fixed (F2) | `room.test.ts` 15/15 pass; vacated seat 0 reused, both seats honored. |
| NFR-5 | primary-owned (F3) | see below. |
| No requirement (F4) | renamed | `state.test.ts` unchanged and green. |

## Landscape verification (primary)

Owner: primary (browser capture). Per the primary's update, the 852×393 pass
completed with the live invite panel fully visible, no occluded controls,
`document.scrollWidth === window.innerWidth === 852`,
`document.scrollHeight === window.innerHeight === 393`, and 0 console
errors/warnings. Screenshot:
`.conductor/evidence/20261119-live-pvp-foundation/phone-landscape.png`.
No orientation media query was added — the primary confirmed none is needed.

## Deviations

- `apps/client/src/live/invite.test.ts` (new) imports `invite.ts` (which imports
  `./live.css`) directly; `bun test` handled the CSS import cleanly, so the
  brief's fallback `casting.ts` + `casting.test.ts` extraction was not needed.

## Blockers (for primary)

- Resolved. The primary re-ran `bun run gate:determinism`, `bun run test:fuzz`
  and the full `bun run verify` chain (including Biome and typecheck); all pass.
  The subagent-scoped permission denials and the transient `gatekeeper-reach`
  timeout no longer apply.

## Notes

- One conventional commit covers all fixes and tests:
  `fix(live): correct joiner cast mapping and vacated seat reuse`
  (`2c373210eb358285df9bd0050704b91ae68497b7`).
- Working tree is clean; no files outside the `Touches` list were changed.
- Per the rules, no denied command was retried or worked around. The phase is
  reported `blocked` because two required verification commands did not run.
