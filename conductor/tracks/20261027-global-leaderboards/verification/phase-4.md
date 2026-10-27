# Phase 4 evidence — Integrated evidence & two-device check

- Track: 20261027-global-leaderboards — Global Leaderboards
- Phase: 4 — Integrated evidence & two-device check
- Date: 2026-10-27
- Branch: feat/20261027-global-leaderboards
- Base: 6f6746967f880ac1a42e97428b79284a2ae80767
- Head: (phase commits, below — evidence only, no code change)
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
|-------|---------|------|---------|
| gate | `bun run verify` | 0 | check + 3224 pass / 1 skip / 0 fail + Biome + determinism, all green |
| build | `bun run build` | 0 | client builds clean |
| browser | two-device board check (steps below) | 0 | device A + B render identical boards, both consoles 0 errors / 0 warnings |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| AC-6 | Two-device check: result on device A visible on device B's board after sync | Scratch-DB server (seed: cups 3 / ladder 12 / ap 48 / collection 7 for "Device Ada", documented as the earned-result stand-in per the brief's allowed alternative). Device A (fresh profile, created trainer in-browser): Boards render rank 1 × 4 with the seeded values — `phase-4-device-a-desktop.png` + `phase-4-device-a-phone.png`. Device B (second fresh profile, signed in as the SAME id + passphrase): identical four boards — `phase-4-device-b-desktop.png`. Both consoles 0 errors / 0 warnings. The live submit wire itself was proven end-to-end in the same session: device A's real debounced push submitted its (all-zero, creatureless-draft) entries to the server before seeding. Boot-pull adoption of the save is Phase 1/2-covered; the boards are public reads, so B needs only the id to render them. | verified |
| AC-7 | Full gates green (`bun run verify`, build) with no save-schema migration | `bun run verify` exit 0 (3224 pass / 1 skip / 0 fail across 300 files); `bun run build` exit 0. `SAVE_VERSION` still 25; the only schema delta in the track is server-side `0002_leaderboard.sql`. | verified |
| NFR-1 | No save-schema change (leaderboard state is server-side; save v25 untouched) | `packages/sim/src/save/schema.ts` still exports `SAVE_VERSION = 25` (pinned by `breeding/discovery.test.ts`, `branchesSave.test.ts`, `evolutionKnowledge.test.ts`); Phase 1–3 evidence shows only `apps/server/migrations/0002_leaderboard.sql` + `leaderboard_scores` Drizzle table; no `docs/save-schema.md` bump in this track. Full gate green confirms. | verified |

## Evidence paths

- `apps/server/Dockerfile` — 0-delta case (see Notes)
- `apps/server/migrations/0002_leaderboard.sql` — the only schema delta (server-side `leaderboard_scores` + board index)
- `apps/server/src/migrate.ts` — directory-discovered, filename-ordered runner (picks up `0002` with no code change)
- `apps/server/src/schema.ts` — `leaderboardScores` Drizzle table
- `apps/server/src/app.ts` — `leaderboardRoutes` registration + `/health` `schemaVersion`
- `apps/server/src/leaderboard/routes.ts` — `POST /trainers/:id/scores` (passphrase-authenticated like save pushes), `GET /leaderboard/:category` (public)
- `apps/client/src/cloud/scores.ts`, `sync.ts`, `api.ts` — Phase 2 submit path (unchanged in this phase)
- `apps/client/src/board/` — Phase 3 Board tab + snapshot (unchanged in this phase)
- Prior evidence: `conductor/tracks/20261027-global-leaderboards/verification/phase-1.md`, `phase-2.md`, `phase-3.md`

## Deviations

None. No code or test file was changed in this phase. The Dockerfile needs no change (0-delta, see Image check), so the `Touches` conditional (`apps/server/Dockerfile` only if needed) did not trigger. Only this evidence file changed.

## Primary verification

The executor had no shell, so the primary ran the gates and the two-device
check (scratch DB `apex-board2.sqlite`, server on :3100, client dev with
`VITE_API_ORIGIN` — the Phase 3 pattern; real dev database untouched):

- Device A: fresh profile, created trainer "Device Ada" in-browser
  (`trn_y3qmtn4jpnfwv9tv1kmg`), advanced a day — the real debounced push fired
  and submitted (all-zero entries: the draft never completed, `creature: null`
  in the save — the zeros are correct derivation output, and they prove the
  browser→server submit wire end-to-end). Seeded cups 3 / ladder 12 / ap 48 /
  collection 7 via the API as the earned-result stand-in (brief-allowed: the
  auto-submit wire is pinned by `sync.test.ts`, best-keeping by Phase 1).
  Boards render rank 1 × 4, desktop + phone screenshots.
- Device B: second fresh profile, signed in as the same id + passphrase,
  identical four boards, desktop screenshot.
- Consoles: 0 errors / 0 warnings on both sessions.
- `bun run verify` exit 0; `bun run build` exit 0.
- Screenshots (gitignored): `phase-4-device-a-desktop.png`,
  `phase-4-device-a-phone.png`, `phase-4-device-b-desktop.png` under
  `.conductor/evidence/20261027-global-leaderboards/`.

## Image check (P4.T1.1, by reading — primary to confirm with the gate)

- `apps/server/Dockerfile` lines 52–54 copy the whole migrations folder (`COPY apps/server/migrations ./apps/server/migrations`) with the comment "`migrate.ts` reads this folder at boot, resolved from its own file."
- `apps/server/src/migrate.ts` `migrations()` reads every `*.sql` in that folder sorted (`readdirSync` + `.sort()`), and `migrate()` applies anything not yet in the `_migrations` ledger. No filename is hardcoded anywhere.
- Therefore `0002_leaderboard.sql` ships in the image and applies at boot with **zero Dockerfile delta** — the same mechanism that already shipped `0001_init.sql`. `main.ts`/`db.ts` are untouched (`openDatabase(path)` → `migrate(db)` → `createApp`, `Bun.serve`).
- Save schema untouched: `SAVE_VERSION` remains 25; the leaderboard table lives in SQLite beside `trainers`/`saves`, never inside the save payload.

## Notes — primary runbook (gates + two-device board check)

The executor has no shell and no browser driver, so everything below is for the primary, reusing the Phase 3 precedent (scratch DB, never the real dev database).

### A. Full gate + build (P4.T1.1)

Run exactly as written in the brief, from the repo root on `feat/20261027-global-leaderboards`:

```text
bun run verify && bun run build
```

Both must exit 0. `bun run verify` is `bun run check && bun test --check --parallel --timeout 120000 && biome check && bun run gate:determinism`. Record the exit codes and the tail (pass/skip/fail counts) in this file's Commands table before marking the phase verified.

### B. Two-device board check (P4.T1.2, AC-6)

Goal: a result earned as trainer T on device A renders on device B signed in as the same trainer T. Without two physical devices, demonstrate the equivalent against a local server with two clean browser profiles (Phase 3 precedent: each `playwright-cli -s=<session> open <url>` starts with clean storage — use that for the device-B half).

1. Start the API on a scratch DB (do not touch the real dev database):
   `DATABASE_PATH=/tmp/apex-leaderboard-2dev.sqlite PORT=3457 ALLOWED_ORIGIN=http://localhost:5173 bun apps/server/src/main.ts`
   Confirm `/health` reports `schemaVersion: "0002_leaderboard.sql"`.
2. Start the client dev server with `VITE_API_ORIGIN=http://localhost:3457` pointed at that API (the Phase 3 pattern: `VITE_API_ORIGIN` set for the dev server).
3. Device A (fresh profile, e.g. `playwright-cli -s=a open <dev-url>`): sign in as a fresh trainer (create trainer, set name e.g. "Boardwalk Ada", set passphrase). Produce a result — either play a cup through to a result, or seed the equivalent via the API to simulate the earned result (the submit path itself is unit-proven in Phase 2): `POST /trainers` → `PUT /trainers/:id` (name + passphrase) → `POST /trainers/:id/scores` × 4 categories with `{ passphrase, category, value, name }` (e.g. cups 3, ladder 12, ap 48, collection 7 as in Phase 3). Open the Boards chip and confirm the trainer's entries render with the chosen name and correct rank. Screenshot desktop + phone (390×844): `.conductor/evidence/20261027-global-leaderboards/phase-4-device-a-desktop.png`, `phase-4-device-a-phone.png`.
4. Device B (second clean profile, e.g. `playwright-cli -s=b open <dev-url>` — clean storage): sign in as the SAME trainer (same id + passphrase — the boot pull adopts the cloud save). Open the Boards chip and confirm the same entries render (same names, values, ranks). Screenshot: `phase-4-device-b-desktop.png`, `phase-4-device-b-phone.png`.
5. `playwright-cli console` (both sessions): confirm no JS exceptions and no app-level errors (only expected network noise if the server was stopped for the offline half; for this check the server stays up, so expect a clean console).
6. Alternative if the browser cannot drive a full cup: seeding via the API in step 3 is acceptable per the brief ("seed scores via the API to simulate the earned result, then confirm the Board renders them"), because the auto-submit wire is already pinned by `sync.test.ts` ("a result push submits the changed scores next to the save") and the server best-keeping by Phase 1 route tests.
7. Record the four screenshot paths, the seed commands used, and the console result in this file before marking verified. Screenshots live under `.conductor/evidence/` (gitignored); only this report is committed.

### C. What is already proven vs what remains

- Proven by prior phases (all green at their acceptance): per-trainer-best + caps + ranked lists (Phase 1, 33 scoped / 3170+ full tests), quiet auto-submit alongside the save push (Phase 2), Board tab with live/empty/loading/error + last-snapshot offline fallback + browser pass (Phase 3, 3224 tests + desktop/phone screenshots).
- Remaining for this phase: the single integrated demonstration that ties them together (AC-6) plus the full `verify && build` on the track head (AC-7). No code change is expected — this phase is evidence only unless the gate finds something.
