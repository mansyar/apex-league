# Phase 2 Evidence — Server ghost store + listing

- **Track:** 20261027-ghost-data-async-rivals (Ghost Data & Async Rivals)
- **Phase:** 2 (Server ghost store + listing)
- **Date:** 2026-10-27
- **Branch:** `feat/20261027-ghost-data-async-rivals`
- **Result:** verified

## What changed

- `apps/server/migrations/0003_ghost.sql` (new): `ghost_bests` table — one
  row per trainer (`trainer_id` PK, `payload` opaque text, `name` display
  label, `updated_at` server clock) + `ghost_bests_board` index
  (`updated_at DESC, trainer_id ASC`). Mirrors `0002_leaderboard.sql`
  posture: no PII beyond the anonymous id and chosen label.
- `apps/server/src/schema.ts`: `ghostBests` typed table + doc comment now
  lists all three migrations.
- `apps/server/src/ghost/caps.ts` (new, ~2 KB): `MAX_GHOST_BYTES`
  (256 KiB, mirrors the save cap — a ghost is one battle where a save is a
  whole career), `isPlausibleGhost` (shape: version pin, seed/day/round,
  both sides with name + non-empty kit + stats, winner-or-null, non-empty
  event log), `ghostBytes`/`isWithinGhostLimit` (byte, not char, count).
  The version pin is tolerant by design: any non-negative integer passes,
  so a newer-sim bundle still stores and lists — the reader skips the
  replay, never the entry (version-skew edge case).
- `apps/server/src/ghost/store.ts` (new, ~2.5 KB): `submitGhost` (upsert,
  latest upload wins — newest cup-winning team is the best by definition),
  `readGhost`, `readGhostBoard` (newest first, trainer-id tiebreak,
  `MAX_GHOST_ENTRIES = 100`, positional rank). Reuses the leaderboard
  store shape (drizzle upsert, order/limit board).
- `apps/server/src/ghost/routes.ts` (new, ~4 KB): `PUT
  /trainers/:id/ghost` (save-push auth: 404/409/401; cheap checks before
  Argon2; 400 `invalid_ghost`, 413 `ghost_too_large` with `limitBytes`,
  400 `invalid_name`), public `GET /trainers/:id/ghost` (404
  `ghost_not_found`) and public `GET /ghosts` (top-100 with bundles).
  Rejections name a field, never a value — no payload echo on error, no
  stack traces, stored best untouched.
- `apps/server/src/app.ts`: mounts `ghostRoutes`.
- Tests (new): `ghost/caps.test.ts` (14 tests), `ghost/store.test.ts`
  (7 tests, fixed `now` timestamps), `ghost/routes.test.ts` (10 tests,
  in-process `app.handle` + two-trainer/two-device pattern), `ghost/schema.test.ts`
  (drift + opaque round-trip incl. future-version JSON). Shared
  hand-built fixture in `ghost/fixtures.ts` — no sim import, server owns
  only the shape contract.
- Pinned updates (required by the new migration): `app.test.ts`,
  `db.test.ts`, `migrate.test.ts` now expect `0003_ghost.sql` (+
  `ghost_bests` in the table list).

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit | `bun test apps/server --parallel=4` | 0 | 164 pass / 0 fail, 22 files (incl. module-size guard) |
| static | `bun run check` | 0 | no type errors (sim 167, client 432, server 44, voxel 145 files) |
| static | `bunx biome check` (touched files) | 0 | clean after `--write` (import order + line wrapping) |

One intermediate run failed with 2 test-expectation bugs (surrogate-pair
`length` in the byte-count test; 409 body carries `field: "passphrase"` per
the saves `refuse` shape) — both fixed in the tests, implementation
untouched. Retry count: 1 of 2 used.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-3 | Top-100 fetch returns ghosts with trainer names | `routes.test.ts`: board returns full bundles + names; `store.test.ts`: 102 uploads → 100 newest, ranked | pass |
| FR-3 | Per-trainer best upload/download + top-100 listing | `PUT` upsert (latest wins) + public single download + `GET /ghosts`; two-device round trip test | pass |
| FR-7 | Oversize/foreign/implausible ghosts rejected quietly | 400 `invalid_ghost` / 413 `ghost_too_large` (field, never value); prior best kept on both; tampered-shape battery in routes test | pass |
| NFR-4 | No PII: trainer name only | Payload validated for shape only; console-silence test; responses carry name + anonymous id | pass |

## Deviations

Files outside the `ghost/*` + `db/*` touches, all minimal and required by
the phase goal:

- `apps/server/src/schema.ts` — added the `ghostBests` typed table (the
  `src/db/*` path does not exist; Drizzle tables live here; drift-checked
  by the new `ghost/schema.test.ts`).
- `apps/server/src/app.ts` — one import + one `.use(ghostRoutes(...))`
  line to mount the surface.
- `apps/server/migrations/0003_ghost.sql` — the committed-SQL pattern
  requires migrations beside the server, not under `src/`.
- `apps/server/src/{app,db,migrate}.test.ts` — pinned
  `0002_leaderboard.sql` expectations updated to the new head migration.
- No `packages/sim`, `apps/client`, plan, or spec changes. No new
  dependency (server still does not import sim; the version pin is
  validated structurally, tolerant of future versions).

## Notes

- Public board + public single download mirror the leaderboard: reading a
  ghost reveals nothing the board does not, and spar-vs-ghost (Phase 4)
  needs rival kits without credential sharing. Upload stays
  passphrase-locked like save pushes.
- `submitGhost` has no keep-the-old path: latest upload replaces outright,
  per the track assumption (latest cup-winning team is the best; no
  manual best-picker).
- Every module stays far under the 12 KB server cap (largest new file:
  `routes.ts` ~4 KB), enforced by the passing `module-size.test.ts`.
