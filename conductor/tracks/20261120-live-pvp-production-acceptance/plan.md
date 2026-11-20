# Live PvP Production Acceptance — Implementation Plan

> **Branch:** `fix/20261120-live-pvp-production-acceptance`
> **Base:** `main` @ `e5459deb4189166756e057262a6439c08aa92ffd`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Deployed two-client proof and forfeit acceptance

- **Goal:** Two real browser contexts on `https://apex-league.pages.dev/`
  connect through the production API, complete a room code invite to a verdict,
  return to the ranch, and a separate mid-match disconnect produces a forfeit
  verdict — all with 0 console errors, or a phase blocked with exact infra
  evidence and no config workaround.
- **Depends on:** none
- **Covers:** FR-1, FR-2, NFR-2, NFR-4, NFR-5, AC-1, AC-2, AC-7, AC-8
- **Touches:** `conductor/tracks/20261120-live-pvp-production-acceptance/verification/production-proof.md`, `.conductor/evidence/20261120-live-pvp-production-acceptance/**`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`; visual layer: two real browsers at 1440×900 and 393×852 against the deployed client/API origins, plus a disconnected-client forfeit probe; `playwright-cli console` empty.
- **Status:** verified

- [x] **P1.T1: Establish production target and throwaway identities** — covers: FR-1, NFR-2, AC-7
  - [x] **P1.T1.1:** Confirm the deployed bundle carries the live chip and `apex-api.ansyar-world.top`, and `/health` responds OK; capture both as evidence.
  - [x] **P1.T1.2:** Create exactly two throwaway trainers on the production API, set their names/passphrases, and push throwaway saves; inject credentials only in the browsers' localStorage.
- [x] **P1.T2: Two-client deployed run to verdict** — covers: FR-1, AC-1
  - [x] **P1.T2.1:** Desktop 1440×900 creates a room; phone 393×852 joins by code; both ready; fight reaches one natural verdict; both return to the ranch.
  - [x] **P1.T2.2:** Capture room/fight/verdict screenshots for both viewports and confirm 0 console errors/warnings on both clients.
- [x] **P1.T3: Deployed disconnect/forfeit proof** — covers: FR-2, AC-2
  - [x] **P1.T3.1:** Start a fresh room, then disconnect one client mid-bout; capture the survivor's forfeit verdict and clean return.
  - [x] **P1.T3.2:** Confirm no zombie room state and 0 console errors; capture the forfeit screenshot.
- [x] **P1.T4: Production evidence or infra blocker record** — covers: NFR-5, FR-4, AC-8
  - [x] **P1.T4.1:** Write `verification/production-proof.md` with exact URLs, probe commands, counts, screenshot paths and console result.
  - [x] **P1.T4.2:** On an upgrade/CORS failure, mark the phase `blocked` with the raw response and stop; make no deploy, proxy, CORS, or server config change.

**Result:** verified
**Resolution:** The 404/503 outage was caused by the server image missing `@apex/sim` at boot (PR #83 merged the canonical manifest/lockfile/Dockerfile fix; PR #84 fixed the dockerignore that excluded `packages/sim/src`). The owner redeployed at SHA `8c773f54748677315e2b1221d6d12d98eebd47ce`. Primary re-probe at 2026-11-20 10:22 +11:00: `/health` → 200 `{"status":"ok","schemaVersion":"0003_ghost.sql"}`; `/live` upgrade probe → 400 `Expected a websocket connection` (route present; valid browser handshake expected to return 101). P1.T2 and P1.T3 are now being retried against the deployed origins.
**Evidence:** conductor/tracks/20261120-live-pvp-production-acceptance/verification/production-proof.md
**Checkpoint:** 0dd03a7d

## Phase 1R: Container runtime module resolution (approved deviation)

- **Goal:** The published server image boots after PR #82: `@apex/server`
  declares the `@apex/sim` workspace dependency, the lockfile matches, and the
  Docker runtime stage carries the sim source so `apps/server/src/main.ts`
  resolves every import in the container. Proven by a failing-first deploy
  contract test and a local container-layout boot check.
- **Depends on:** none — resolves the Phase 1 infra blocker
- **Covers:** FR-6, NFR-1, NFR-4, NFR-6, AC-6, AC-9
- **Touches:** `apps/server/package.json`, `bun.lock`, `apps/server/Dockerfile`, `apps/server/Dockerfile.dockerignore`, `scripts/deploy/server-image.test.ts`, `conductor/tracks/20261120-live-pvp-production-acceptance/verification/phase-1R.md`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`; plus `bun test scripts/deploy/server-image.test.ts --timeout 120000` and a local container-layout boot check showing `apps/server/src/main.ts` resolves `@apex/sim`. No visual layer (no UI change).
- **Status:** verified

- [x] **P1R.T1: Declare the sim workspace dependency** — covers: FR-6, NFR-1, AC-9
  - [x] **P1R.T1.1:** Add `"@apex/sim": "workspace:*"` to `apps/server/package.json` dependencies.
  - [x] **P1R.T1.2:** Regenerate `bun.lock` with `bun install` and confirm the server workspace lists the dependency.
- [x] **P1R.T2: Carry sim source into the runtime image** — covers: FR-6, AC-9
  - [x] **P1R.T2.1:** Add Dockerfile runtime-stage copies for `packages/sim/package.json` and `packages/sim/src`.
  - [x] **P1R.T2.2:** Prove a minimal image-like layout boots without the module-resolution error, with a boot log showing the listen line.
- [x] **P1R.T3: Failing-first deploy contract test** — covers: FR-6, AC-9
  - [x] **P1R.T3.1:** Assert in `scripts/deploy/server-image.test.ts` that the server manifest declares `@apex/sim`, the lockfile matches, and the Dockerfile copies the sim source.
  - [x] **P1R.T3.2:** Show the test fails on the pre-fix tree and passes after the fix.
- [x] **P1R.T4: Verification and evidence** — covers: NFR-6, AC-6
  - [x] **P1R.T4.1:** Run all five configured verification commands individually on the final tree and record exact counts and hash.
  - [x] **P1R.T4.2:** Write `verification/phase-1R.md` with commands, results, boot proof and deviations.

**Result:** verified
**Checkpoint:** f9c116bb
**Evidence:** conductor/tracks/20261120-live-pvp-production-acceptance/verification/phase-1R.md

## Phase 2: Invite panel reset and second-bout proof

- **Goal:** Reopening "Live PvP" after a verdict or "Back to ranch" starts a
  fresh invite without a page reload, proven by a test that fails before the
  fix and by a two-client browser run against the production API from a fixed
  local client.
- **Depends on:** Phase 1
- **Covers:** FR-3, NFR-1, NFR-3, NFR-6, AC-3, AC-6, AC-7
- **Touches:** `apps/client/src/live/panel.ts`, `apps/client/src/live/panel.test.ts`, `apps/client/src/live/invite.ts`, `conductor/tracks/20261120-live-pvp-production-acceptance/verification/phase-2.md`, `.conductor/evidence/20261120-live-pvp-production-acceptance/**`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`; visual layer: fixed local client with `VITE_API_ORIGIN` pointed at the production API, second invite at 1440×900 and 393×852, `playwright-cli console` empty.
- **Status:** verified

- [x] **P2.T1: Failing regression test for stale invite state** — covers: FR-3, AC-3
  - [x] **P2.T1.1:** Drive room → verdict → leave in the client DOM harness and assert code input empty, start controls enabled, room/result rows hidden, status idle; confirm it fails before the fix.
- [x] **P2.T2: Reset invite state on verdict and leave** — covers: FR-3, NFR-1, NFR-4
  - [x] **P2.T2.1:** Add the smallest panel reset API and call it from `finish()` and `leave()` without changing the transport or arena contracts.
  - [x] **P2.T2.2:** Keep protocol version, sim version, save schema, dependency manifests and module caps unchanged.
- [x] **P2.T3: Second-bout browser re-proof** — covers: AC-3, NFR-3
  - [x] **P2.T3.1:** Serve the fixed client with `VITE_API_ORIGIN` pointed at the production API; complete one bout, click "Back to ranch", reopen the panel, and start a second room without reload; capture screenshots and an empty console.

**Result:** verified
**Checkpoint:** 32f88e59
**Evidence:** conductor/tracks/20261120-live-pvp-production-acceptance/verification/phase-2.md

## Phase 3: Integrated evidence and documentation truth

- **Goal:** The final tree has a committed integrated verification record, a
  dated product roadmap entry marking live PvP as landed, and an explicit note
  that the archived ADR's stale visual-proof line is superseded — with no edit
  to the archived ADR itself.
- **Depends on:** Phase 2
- **Covers:** FR-4, FR-5, NFR-1, AC-4, AC-5, AC-6, AC-8
- **Touches:** `conductor/tracks/20261120-live-pvp-production-acceptance/verification/integrated.md`, `conductor/tracks/20261120-live-pvp-production-acceptance/verification/phase-3.md`, `conductor/product.md`, `.conductor/evidence/20261120-live-pvp-production-acceptance/**`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`; evidence review of AC-1..AC-8 and the scope proof.
- **Status:** verified

- [x] **P3.T1: Integrated verification record** — covers: FR-4, AC-4, AC-6, AC-8
  - [x] **P3.T1.1:** Record all five command results, hash `0xff6f3d62`, module caps, deployed URLs, desktop/phone/forfeit/second-invite screenshot paths, console result, AC table and scope proof in `verification/integrated.md`.
- [x] **P3.T2: Product roadmap truth** — covers: FR-5, AC-5
  - [x] **P3.T2.1:** Update the Phase 4 "live PvP" bullet in `conductor/product.md` to a dated landed note referencing PR #82, with no other roadmap content changed.
- [x] **P3.T3: ADR supersession note and scope guard** — covers: FR-5, NFR-1, AC-5
  - [x] **P3.T3.1:** Record in `verification/phase-3.md` that the archived ADR's "primary must run the visual proof" line is superseded by `integrated.md`, leaving the ADR untouched.
  - [x] **P3.T3.2:** Confirm no manifest, lockfile, protocol, save, balance, pacing, CORS or deploy file changed and no credentials appear in tracked artifacts.

**Result:** verified
**Checkpoint:** 8fc63e4f
**Evidence:** conductor/tracks/20261120-live-pvp-production-acceptance/verification/phase-3.md

## Phase R1: Review Fixes

- **Goal:** Resolve review finding F1: make the integrated record accurately describe the
  number of throwaway trainer identities used across the blocked attempt, retry and
  second-bout proof, and record the accepted interpretation of NFR-2.
- **Depends on:** Phase 3
- **Covers:** F1 (NFR-2, AC-7)
- **Touches:** `conductor/tracks/20261120-live-pvp-production-acceptance/verification/integrated.md`, `conductor/tracks/20261120-live-pvp-production-acceptance/verification/phase-R1.md`
- **Verification:** `bun run verify && bun run build && bun run balance && bun run gate:determinism && bun run test:fuzz`; confirm no credential or passphrase appears in tracked artifacts.
- **Status:** pending

- [ ] **R1.T1: Reconcile throwaway identity count** — covers: F1
  - [ ] **R1.T1.1:** Update `verification/integrated.md` AC-7 and the limitations to state "two concurrent throwaway identities per proof; six total across the blocked attempt, retry and second-bout proof", and record that as the accepted interpretation of NFR-2. No source, config or spec change.
- [ ] **R1.T2: Record review-fix evidence** — covers: F1
  - [ ] **R1.T2.1:** Write `verification/phase-R1.md` with the F1 fix, exact command results, scope/credential guard and verdict.

<!--
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261120-live-pvp-production-acceptance/verification/phase-R1.md
-->
