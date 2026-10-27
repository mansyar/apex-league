# Phase 1 evidence — Score tables & submission API

- Track: 20261027-global-leaderboards — Global Leaderboards
- Phase: 1 — Score tables & submission API
- Date: 2026-10-27
- Branch: feat/20261027-global-leaderboards
- Base: e052819d17012bf8af095703e27fe83a01ccd8d
- Head: uncommitted working tree (no commit permission in this environment)
- Result: **blocked** — implementation and tests are written; verification and
  commits were denied by the environment (shell unavailable). The primary ran
  the verification command and committed (see Primary verification below).

## Commands

| Layer | Command | Exit | Summary |
|-------|---------|------|---------|
| Verification | `bun test --check --parallel=4 --timeout 120000` | not run | Shell denied (`permission.rejected`); primary must run full gate. Covers the new leaderboard suites plus the deviation updates to `app`/`db`/`migrate` tests. |
| Git | `git status --short`, `git log`, `git add`/`git commit` | not run | Shell denied; working tree uncommitted. Suggested commits below. |

No verification output exists to attach; the command above is the exact gate
the brief requires, and it must exit 0 before this phase can be marked
verified. Suggested task-level commits once green:

1. `feat(leaderboard): add per-trainer-best table and 0002 migration` —
   `apps/server/migrations/0002_leaderboard.sql`, `apps/server/src/schema.ts`,
   plus the version-pin updates in `app.test.ts`, `db.test.ts`,
   `migrate.test.ts`.
2. `feat(leaderboard): add submit and ranked-list routes with caps` —
   `apps/server/src/leaderboard/**`, `apps/server/src/app.ts`.
3. Evidence file (this report), committed or left for the primary state commit.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| FR-1 | Server accepts a score entry per category | `POST /trainers/:id/scores` in `apps/server/src/leaderboard/routes.ts`; routes tests "a submit lands on the board" and "a lesser submit keeps the best" | implemented, unverified |
| FR-2 | Per-trainer best per category, keyed by anonymous trainer ID | `leaderboard_scores(trainer_id, category)` PK in `0002_leaderboard.sql` + `schema.ts`; store tests "first submit creates", "beaten best replaced", "categories independent" | implemented, unverified |
| FR-3 | Plausibility caps per category, recorded as named constants | `MAX_CUP_WINS / MAX_LADDER_POINTS / MAX_TRAINER_AP / MAX_COLLECTION_BREADTH` in `categories.ts`; categories tests pin boundaries (0, cap, cap+1, negative, fractional, non-finite) | implemented, unverified |
| FR-4 | Ranked lists per category, top-100, deterministic tie order | `GET /leaderboard/:category`, `readBoard` (value desc, updatedAt asc, trainerId asc, competition ranking, limit 100); store tests pin order, shared ranks, and the 100-row cap | implemented, unverified |
| FR-7 | Entry carries the current chosen name; renames land on next submit | Submit body `name` validated by `normalizeName`, stored on every accepted submit (value updates only when beaten); store + route tests assert newest-name behavior | implemented, unverified |
| AC-1 | A trainer's best updates only when beaten | Store test "beaten best is replaced, lesser keeps it"; route test "lesser submit keeps the best" | implemented, unverified |
| AC-2 | Implausible payload rejected; previous valid entry remains | Route test "implausible submit rejected, last valid stands" (400 `invalid_value` × 5 shapes, board unchanged) | implemented, unverified |
| NFR-3 | No PII beyond anon ID + chosen name + scores | Rows carry only trainer_id/name/value/updated_at; route test "console stays silent" mirrors the saves no-logging precedent | implemented, unverified |
| NFR-4 | Route tests run in-process, no listening ports | All route tests drive `app.handle(new Request(...))` against `:memory:`; no `Bun.serve` in tests | implemented, unverified |

## Evidence paths

- `apps/server/migrations/0002_leaderboard.sql` — new table + board index
- `apps/server/src/schema.ts` — `leaderboardScores` Drizzle table
- `apps/server/src/leaderboard/categories.ts` — category union + caps + validators
- `apps/server/src/leaderboard/store.ts` — `submitScore` / `readBoard`
- `apps/server/src/leaderboard/routes.ts` — `POST /trainers/:id/scores`, `GET /leaderboard/:category`
- `apps/server/src/leaderboard/categories.test.ts`, `store.test.ts`, `routes.test.ts`, `schema.test.ts`
- `apps/server/src/app.ts` — route registration
- Deviation updates: `apps/server/src/app.test.ts`, `apps/server/src/db.test.ts`, `apps/server/src/migrate.test.ts`

## Deviations

| File | Reason |
|------|--------|
| `apps/server/src/app.test.ts` | Outside Touches. `/health` pins `schemaVersion`; the new migration moves it to `0002_leaderboard.sql`. Smallest necessary change. |
| `apps/server/src/db.test.ts` | Outside Touches. Two `schemaVersion` pins move to `0002_leaderboard.sql`. |
| `apps/server/src/migrate.test.ts` | Outside Touches. Fresh-migrate now applies both files; tables list gains `leaderboard_scores`; ledger assertions cover both filenames. |

## Primary verification

The executor had no shell, so the primary ran every gate and committed:

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| typecheck | `bun run check` | 0 | all 4 workspaces clean (one TS2571 in `routes.test.ts` fixed by the primary with a typed destructure, no behavior change) |
| format | `bunx biome check --write` on the new module | 0 | 4 files reformatted |
| lint | `bunx biome check` (bare, whole repo) | 0 | 749 files, no findings |
| unit (scoped) | `bun test --check apps/server/src/leaderboard apps/server/src/app.test.ts apps/server/src/db.test.ts apps/server/src/migrate.test.ts --parallel=4 --timeout 120000` | 0 | 33 pass, 0 fail |
| unit (full) | `bun test --check --parallel=4 --timeout 120000` | 0 | 3170 pass, 1 skip, 0 fail, 295 files |
| gate | `bun run verify` | 0 | check + suite + biome + determinism |
| build | `bun run build` | 0 | client builds clean |

- Squash: the two task commits squashed into one phase commit (clean range, no foreign commits).
- Deviations accepted: `app.test.ts`, `db.test.ts`, `migrate.test.ts` schemaVersion/migrate pins — the smallest change the new migration requires.
- Auth decision endorsed: passphrase-authenticated submits mirror save pushes; public board reads.

## Notes

- **Auth decision (engineering, within spec):** submits require the trainer's
  passphrase (`404` unknown / `409` no passphrase / `401` wrong), mirroring
  save pushes. An unauthenticated submit would let anyone overwrite anyone
  else's best; the passphrase is how a trainer proves ownership, and the
  Phase-2 client already holds it from the save push it submits alongside.
  The board (`GET`) is public and needs no passphrase.
- **Tie order:** `updated_at` is the server clock at the submit that set the
  value and never moves on name-only updates, so "earliest achievement first"
  is immune to client clock skew; trainer id breaks remaining ties.
- **Ranking:** standard competition ranking — tied values share a rank, the
  next rank counts the entries above it.
- **Caps rationale (in code comments):** cups 10_000 (a win a day, 27 years);
  ladder 30_000 (champion +3, the most any cup pays, × cups cap); AP
  1_000_000 (10/day, triple the base budget of 3, for 270 years); collection
  10_000 (two orders of magnitude past a full 9-species roster). Retuning is a
  code-only change, no migration.
- **Formatting risk:** Biome could not be run here (same shell denial); a few
  long lines may need `biome check --write` on `apps/server/src/leaderboard`
  before the gate. The primary should run it and then the verification
  command exactly as written in the brief.
