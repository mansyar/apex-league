# Global Leaderboards — Implementation Plan

> **Branch:** `feat/20261027-global-leaderboards`
> **Base:** `main` @ `0e5e006d4f603c975a8b34e2b961f58aded564e2`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Score tables & submission API

- **Goal:** server accepts a score entry per category, keeps each trainer's best, rejects implausible values — proven by in-process route tests.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-7, AC-1, AC-2, NFR-3, NFR-4
- **Touches:** `apps/server/src/leaderboard/**`, `apps/server/src/schema.ts`, `apps/server/migrations/0002_*.sql`, `apps/server/src/app.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000` (scoped: leaderboard + app route files)
- **Status:** verified

**Result:** verified
**Checkpoint:** 34a26385
**Evidence:** conductor/tracks/20261027-global-leaderboards/verification/phase-1.md

- [x] **P1.T1: Leaderboard schema & migration** — covers: FR-2
  - [x] **P1.T1.1: Per-trainer-best table** (trainer id, category, value, name, updatedAt)
  - [x] **P1.T1.2: Ledger-runner migration 0002**
- [x] **P1.T2: Submit + ranked-list routes** — covers: FR-1, FR-3, FR-4, FR-7
  - [x] **P1.T2.1: POST submit with plausibility caps + keep-last-valid**
  - [x] **P1.T2.2: GET ranked lists per category (top-100, deterministic tie order)**

## Phase 2: Client submit path

- **Goal:** cup/ladder results auto-submit alongside the save push, quietly and non-blocking — proven by client unit tests with a fake server.
- **Depends on:** Phase 1
- **Covers:** FR-1, AC-1, NFR-2
- **Touches:** `apps/client/src/cloud/scores.*`, `apps/client/src/cloud/sync.ts`, `apps/client/src/cloud/*.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000` (scoped: cloud files)
- **Status:** verified

**Result:** verified
**Checkpoint:** df16447c
**Evidence:** conductor/tracks/20261027-global-leaderboards/verification/phase-2.md

- [x] **P2.T1: Score submitter** — covers: FR-1
  - [x] **P2.T1.1: Derive entries from result payloads (cup, ladder, AP, collection)**
  - [x] **P2.T1.2: Hook into post-result flow next to the save push; failures quiet**

## Phase 3: Board tab & offline snapshot

- **Goal:** Board tab renders all four categories from live data, with empty/loading/error states and a last-snapshot offline fallback — proven by client tests + browser pass.
- **Depends on:** Phase 2
- **Covers:** FR-5, FR-6, AC-3, AC-4, AC-5, NFR-5
- **Touches:** `apps/client/src/board/**`, `apps/client/src/main.ts` (tab registration), `apps/client/src/cloud/scores.ts` (snapshot cache)
- **Verification:** `bun test --check --parallel=4 --timeout 120000` (scoped) + playwright-cli Board pass (desktop + phone, live + offline)
- **Status:** verified

**Result:** verified
**Checkpoint:** 3fdc8b69
**Evidence:** conductor/tracks/20261027-global-leaderboards/verification/phase-3.md

- [x] **P3.T1: Board surface** — covers: FR-5
  - [x] **P3.T1.1: Four category lists (rank, name, value) + states**
  - [x] **P3.T1.2: Fetch-on-open + last-snapshot cache with quiet offline note**

## Phase 4: Integrated evidence & two-device check

- **Goal:** full gates green, container still builds clean, and AC-6 demonstrated — proven by `verify_phase` + build + a documented two-device board check.
- **Depends on:** Phase 3
- **Covers:** AC-6, AC-7, NFR-1
- **Touches:** `apps/server/Dockerfile` (only if the new table needs image changes — expected 0-delta), `conductor/tracks/20261027-global-leaderboards/verification/*`
- **Verification:** `bun run verify && bun run build`
- **Status:** verified

**Result:** verified
**Checkpoint:** c43d90eb
**Evidence:** conductor/tracks/20261027-global-leaderboards/verification/phase-4.md

- [x] **P4.T1: Integration & evidence** — covers: AC-6, AC-7
  - [x] **P4.T1.1: Full gate + build + image check**
  - [x] **P4.T1.2: Two-device board check documented with screenshots**

## Phase R1: Review Fixes

- **Goal:** Resolve review finding F1 (uploadLocal conflates a failed first-upload push with nothing-to-upload, letting the caller overwrite failureStatus with synced).
- **Depends on:** Phase 3
- **Covers:** F1
- **Touches:** `apps/client/src/cloud/sync.ts`, `apps/client/src/cloud/sync.test.ts`
- **Verification:** `bun test --check --parallel=4 --timeout 120000` (scoped: cloud) + `bun run check`
- **Status:** in_progress

- [ ] **R1.T1: Resolve F1** — covers: F1 (uploadLocal returns true after failureStatus; false only for nothing-to-upload; test pins failed-first-upload status)
