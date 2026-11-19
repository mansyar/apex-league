# Review: Live PvP Foundation Spike

- **Track:** `20261119-live-pvp-foundation`
- **Type:** `feature`
- **Branch:** `feat/20261119-live-pvp-foundation`
- **Range:** `ab1c83f98a512a9a973e8480dc8fe18faad5be7d..7ef7d2dd`
- **Date:** `2026-11-20`
- **Verdict:** `PASS WITH FINDINGS`

## Summary

The track delivers the planned server-authoritative live-PvP foundation: a
versioned protocol, two-seat room machine, 20/50/20 loop, in-memory Elysia
WebSocket route, client invite/transport slice, architecture decision record and
a real two-client browser proof. All configured checks pass on the final tree.
The review found no Critical or High issues. Three Medium findings affect
joiner-side rendering fidelity, seat reuse after a host disconnect, and missing
landscape-orientation evidence; one Low finding is a misleading local name.
`review.strict` is `true`, so none of these may be deferred — they are scheduled
as Phase R1.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun test --timeout 120000` | pass | 406.6 s, no failures |
| coverage | not configured | n/a | — |
| lint | `biome check` | pass | clean |
| typecheck | `bun run check` | pass | sim / server / client (547 files) |
| build | `bun run build` | pass | Vite OK |
| full verify | `bun run verify` | pass | 4438 pass / 1 skip / 0 fail; hash `0xff6f3d62` |
| balance | `bun run balance` | pass | capShare 30.8%, 34 gates |
| determinism | `bun run gate:determinism` | pass | byte-identical, all species/props |
| fuzz | `bun run test:fuzz` | pass | 139 pass / 0 fail |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | `types.test.ts`, `parse.test.ts` | covered |
| FR-2 | P1.T2 | `room.test.ts` | partial (F2) |
| FR-3 | P1.T3 | `loop.test.ts`, `fight.test.ts` | covered |
| FR-4 | P2.T1 | `route.test.ts` (in-memory) | covered |
| FR-5 | P3.T1 | `state.test.ts`, screenshots | covered |
| FR-6 | P3.T2 | `protocol.test.ts`, browser run | partial (F1) |
| FR-7 | P3.T3.1 | `decision.md` | covered |
| FR-8 | P3.T3.2 | `integrated.md` | covered |
| FR-9 | P3.T3 | five-command table, hash unchanged | covered |
| NFR-1 | P1.T3 / P3.T3 | verify + determinism + balance | covered |
| NFR-2 | P1–P3 | module-cap table (largest 9561 B) | covered |
| NFR-3 | P2.T1 / P3.T2 | scope proof, no manifest/CORS diff | covered |
| NFR-4 | P2.T1 / P3.T2 | `route.test.ts`, `protocol.test.ts` | covered |
| NFR-5 | P3.T1 | desktop + phone portrait proof | partial (F3) |
| NFR-6 | P1.T3 / P2.T1 | fake clock/transport tests | covered |
| AC-1 | P1.T1 | `types.test.ts`, `parse.test.ts` | covered |
| AC-2 | P1.T2 | `room.test.ts` | covered |
| AC-3 | P1.T3 | `loop.test.ts` (bootstrap regression) | covered |
| AC-4 | P2.T1 | `route.test.ts` | covered |
| AC-5 | P3.T1 | `panel.ts`, screenshots | covered |
| AC-6 | P3.T2 | two-client verdict + forfeit probe, 0 console errors | covered |
| AC-7 | P3.T3.1 | `decision.md` | covered |
| AC-8 | P3.T3.2 | `integrated.md` | covered |
| AC-9 | P3.T3 | five-command table | covered |
| AC-10 | P3.T3 | scope proof | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- **F1 — Joiner renders dense frames on the wrong fighter**
  - **File:** `apps/client/src/live/invite.ts:43-66`
  - **What:** `castingFor` varies species/name by seat, but `owned.key` is always
    `keys[0]` and `createDenseStage.apply` maps dense side 0 positionally to
    `owned`. For a joiner (seat 1), the host's dense frame is drawn on the
    joiner's own creature and vice versa.
  - **Why:** The joiner can see its own creature fall while the text verdict says
    Victory; contradicts FR-6's snapshot-to-arena contract. Identical fixed
    sides and the correct text verdict masked this in the browser proof.
  - **Fix:** Make the cast match the positional stream mapping for both clients:
    `owned` = stream side 0 (host, `keys[0]`), `rival` = stream side 1 (guest,
    `keys[1]`); vary only `seed` by seat if variety is wanted.
  - **Requirement:** FR-6
  - **Test gap:** Pure test that both seats' casts keep `owned` on `keys[0]` and
    `rival` on `keys[1]`, plus a two-client browser assertion.
- **F2 — Host disconnect before ready leaves a duplicate seat index**
  - **File:** `apps/server/src/live/room.ts:165`
  - **What:** `join` assigns `room.seats.length === 0 ? 0 : 1`. If seat 0 leaves
    while seat 1 waits, a third trainer also gets seat 1.
  - **Why:** Duplicate indices break per-seat intent sequence hygiene and can
    name the disconnecting seat as the forfeit winner.
  - **Fix:** `const seat: SeatIndex = room.seats.some((s) => s.seat === 0) ? 1 : 0`.
  - **Requirement:** FR-2
  - **Test gap:** create → join → host disconnect → third join; assert distinct
    seat indices and both intents honored.
- **F3 — Landscape (852×393) live panel unverified**
  - **File:** `apps/client/src/live/live.css:90-99`
  - **What:** Only a `max-width:480px` responsive rule exists; the visual proof
    captured 1440×900 and 393×852 portrait, never 852×393 landscape.
  - **Why:** NFR-5 and the spec edge cases require UX principle 8 at 852×393.
  - **Fix:** Run the playwright pass at 852×393 with the live panel open; record
    screenshot and console result; add an orientation query only if needed.
  - **Requirement:** NFR-5
  - **Test gap:** `.conductor/evidence/20261119-live-pvp-foundation/phone-landscape.png`
    with no horizontal scroll, no occluded control, 0 console errors.

### Low

- **F4 — Misleading local name in forfeit copy**
  - **File:** `apps/client/src/live/state.ts:87`
  - **What:** `winnerName` holds `names[forfeitingSeat]`, the forfeiter's name.
  - **Why:** The rendered copy is correct, but the identifier invites a future
    regression.
  - **Fix:** Rename to `forfeiterName`.
  - **Requirement:** none
  - **Test gap:** none

## Overrides

- <none>

## Plan compliance

All three phases are `verified` with checkpoints `1f4fd107`, `1d3c1e9d`,
`ea0865e0` and evidence files; every `[x]` task was implemented and verified.
The three recorded deviations are necessary and minimal. No task was dropped.
The four findings above are new and are not covered by the original tasks, so
Phase R1 is appended.

## Out of scope

- Reconnect, pause and spectator modes — explicitly excluded by the spec.
- Matchmaking and rating — recorded as deferrals in `decision.md`.

## Debt

- None filed. `review.issues.enabled` is `false`; all findings are fixed in
  Phase R1 rather than deferred (strict mode).

## Doc sync

`pending` — updated after Phase R1 and the delta re-review.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 3 | 1 | 0 (Phase R1 scheduled) |
