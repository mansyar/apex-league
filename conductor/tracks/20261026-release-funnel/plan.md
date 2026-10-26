# Release Funnel — Implementation Plan

> **Branch:** `chore/20261026-release-funnel`
> **Base:** `main` @ `02ff20c9`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Dev host config

- **Goal:** `apps/client/vite.config.ts` contains no machine-specific hostname; the dev-server allowlist is populated from an environment variable, and the production build output is byte-for-byte unchanged from the pre-track build.
- **Depends on:** none
- **Covers:** FR-4, NFR-7, AC-4
- **Touches:** `apps/client/vite.config.ts`, `apps/client/vite.config.test.ts`, `.env.example`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

- [x] **P1.T1: Env-driven allowlist** — covers: FR-4
  - [x] **P1.T1.1: Failing source-shape test - the committed config names no literal hostname, and setting the documented variable yields the expected `allowedHosts` value**
  - [x] **P1.T1.2: Read the host list from `DEV_ALLOWED_HOSTS`, defaulting to an empty list, and document the variable in `.env.example`**
- [x] **P1.T2: Build output unchanged** — covers: NFR-7
  - [x] **P1.T2.1: Record the pre-change `dist/` file list and hashes, rebuild after the config change, and confirm they match**
**Result:** verified
**Checkpoint:** `2406c88e`
**Evidence:** `conductor/tracks/20261026-release-funnel/verification/phase-1.md`

## Phase 2: Deploy workflow

- **Goal:** A GitHub Actions workflow deploys `apps/client/dist` to Cloudflare Pages on push to `main`, gated on `bun run verify`, with pinned `wrangler`, no committed or logged credential, and a concurrency group that cancels superseded runs.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-8, NFR-2, NFR-3, NFR-4, NFR-6, AC-1, AC-2, AC-8
- **Touches:** `.github/workflows/deploy.yml`, `package.json`, `bun.lock`, `wrangler.jsonc`, `.gitignore`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

- [x] **P2.T1: Workflow structure and gating** — covers: FR-1, FR-2, NFR-4, NFR-6
  - [x] **P2.T1.1: Author `deploy.yml` - push to `main`, `workflow_dispatch`, concurrency cancel-in-progress, install, `bun run verify`, build, then `wrangler pages deploy`**
  - [x] **P2.T1.2: Confirm the deploy step cannot run when verification fails, and that `ci.yml` is untouched**
- [x] **P2.T2: Wrangler dependency and Pages config** — covers: FR-1, NFR-2
  - [x] **P2.T2.1: Add a pinned `wrangler` dev dependency and a `deploy` script; confirm it stays out of the client bundle**
  - [x] **P2.T2.2: Add `wrangler.jsonc` naming the Pages project and `apps/client/dist` as the upload directory; gitignore `.wrangler/`**
- [x] **P2.T3: Failure and secret hygiene** — covers: FR-8, NFR-3
  - [x] **P2.T3.1: Fail loudly and early when the secrets are absent, skip the deploy on forks, and assert no step echoes a secret**

**Result:** verified
**Checkpoint:** `bb9a3c89`
**Evidence:** `conductor/tracks/20261026-release-funnel/verification/phase-2.md`

## Phase 3: Live smoke check

- **Goal:** A Playwright script against a live URL drafts a starter, asserts the ranch renders, and reports zero console errors and zero failed asset requests; it is wired into the deploy workflow and its output is recorded as evidence.
- **Depends on:** Phase 2
- **Covers:** FR-3, FR-5, NFR-1, NFR-5, AC-3, AC-5
- **Touches:** `scripts/smoke/**`, `.github/workflows/deploy.yml`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

- [x] **P3.T1: Smoke script** — covers: FR-3, FR-5
  - [x] **P3.T1.1: Author the smoke run - fresh profile, load URL, draft a starter, assert the ranch canvas and HUD render, collect console messages and failed requests**
  - [x] **P3.T1.2: Assert zero console errors/warnings and zero failed JS/CSS/GLB/font requests; exit non-zero otherwise**
- [x] **P3.T2: Wire into the deploy and prove it against a real URL** — covers: FR-3, FR-5
  - [x] **P3.T2.1: Add the smoke step to `deploy.yml` after the deploy, against the deployed URL**
  - [x] **P3.T2.2: Run the smoke check against a real built artifact and record the result as phase evidence** — the live `pages.dev` URL does not exist (no deploy has ever run; `deploy.yml` has never been on `main`), so this ran against the real `apps/client/dist` served over HTTP, plus a negative run against the same build with its bundle removed. The live half is deferred to the owner's secrets.

**Result:** verified (AC-5 pass; AC-3 in-repo pass with its live-URL half credential-pending)
**Checkpoint:** `50f89c99`
**Evidence:** `conductor/tracks/20261026-release-funnel/verification/phase-3.md`
- [x] **P3.T3: Static-only and no-behaviour-change audit** — covers: NFR-1, NFR-5
  - [x] **P3.T3.1: Confirm the deployed artifact is static files only, `SAVE_VERSION` is still 25, and nothing under `packages/` or the client runtime changed**

## Phase 4: Release documentation

- **Goal:** `README.md` and `conductor/tech-stack.md` describe the deployment accurately — correct save version, live link, the one-time secret setup, and a dated stack note — with no claim that the code contradicts.
- **Depends on:** Phase 3
- **Covers:** FR-6, FR-7, FR-9, AC-6, AC-7
- **Touches:** `README.md`, `conductor/tech-stack.md`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

- [x] **P4.T1: README** — covers: FR-6, FR-9
  - [x] **P4.T1.1: Correct the release checklist save-version references and make every item match actual behaviour**
  - [x] **P4.T1.2: Add a Deploying section - live URL, the two repository secrets, and the steps a fresh maintainer follows**
- [x] **P4.T2: Stack note** — covers: FR-7
  - [x] **P4.T2.1: Replace the `## Deployment (target)` placeholder with a dated note recording Cloudflare Pages, the workflow, the secrets, and pinned `wrangler`**

**Result:** verified
**Checkpoint:** `fd50569c` (README) and `6e2feb47` (tech stack)
**Evidence:** `conductor/tracks/20261026-release-funnel/verification/phase-4.md`

> P4.T2 was blocked inside the phase — the phase agent's policy denies `edit` on `conductor/**` except the track's own verification directory, so the prepared note was applied verbatim by the primary instead.

## Phase R1: Review Fixes

- **Goal:** Resolve all eight round-1 review findings at their root cause, each with a guard that would have caught it, so the track passes strict review with no known-false claim left in the repository.
- **Depends on:** Phase 4
- **Covers:** F1, F2, F3, F4, F5, F6, F7, F8
- **Touches:** `scripts/smoke/smoke.ts`, `scripts/smoke/smoke.test.ts`, `.github/workflows/deploy.yml`, `scripts/deploy/**`, `conductor/workflow.md`, `conductor/tracks/20261026-release-funnel/verification/**`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** verified

- [x] **R1.T1: The smoke check fails loud on an empty request log** — covers: F1
  - [x] **R1.T1.1: Write a failing test asserting that zero observed requests is a violation, not a silent pass** — mirrors the console parser's existing fail-loud rule at `smoke.ts:117-119`
  - [x] **R1.T1.2: Make `violations()` reject an empty request log** so the deploy-time smoke step cannot print `requests 0 · failed 0` and exit 0
- [x] **R1.T2: The deploy job provisions Node before any wrangler call** — covers: F2
  - [x] **R1.T2.1: Add `actions/setup-node@v4` with `node-version: 22` ahead of the first wrangler invocation**, satisfying wrangler's own `MIN_NODE_VERSION` under either runtime choice
  - [x] **R1.T2.2: Assert in the committed workflow test that Node is provisioned before the first `bunx wrangler` line**
- [x] **R1.T3: `conductor/workflow.md` describes the deployment that now exists** — covers: F3
  - [x] **R1.T3.1: Rewrite the "Release & Deployment" section** to state the push-to-`main` trigger plus `workflow_dispatch`, the `bun run verify` gate, `wrangler.jsonc` as the single source of the project name and upload dir, the two owner-created secrets, the post-upload smoke check, and the still-true "no deployment has run yet"
- [x] **R1.T4: The deploy workflow's contract is protected by a committed test** — covers: F4
  - [x] **R1.T4.1: Write a committed source-shape test** asserting step order (`Verify` before `Deploy`), the deploy step's `if: success()`, no `${{ secrets.* }}` inside any `run:` body, `bun install --frozen-lockfile` present, `pages_build_output_dir` = `apps/client/dist`, and the fork gate — following the two existing precedents
- [x] **R1.T5: The smoke CLI rejects a malformed `--url` instead of falling through** — covers: F5
  - [x] **R1.T5.1: Fail with a clear message when `--url` is present without a value**, so a mistyped flag cannot silently smoke production
- [x] **R1.T6: The smoke check's failure output keeps its diagnosis** — covers: F6
  - [x] **R1.T6.1: Preserve the original reason when the catch path's own gathering fails, and convert pre-try failures into the same JSON envelope** instead of an uncaught stack trace
- [x] **R1.T7: The plan records one checkpoint per phase** — covers: F7
  - [x] **R1.T7.1: Remove the duplicated Phase 2 Result block and its stray `r`** so `plan.md` carries a single, well-formed checkpoint — done by the primary as part of appending this phase; the block had been written twice and the second copy carried a trailing `r` on the checkpoint sha
- [x] **R1.T8: The integrated verification record names the current head and no resolved gap** — covers: F8
  - [x] **R1.T8.1: Drop the `conductor/product.md` known gap** that the docs-sync commit already resolved, and correct the first known-gap entry, which F4 falsifies — `scripts/deploy/workflow.test.ts` is now the committed workflow-contract guard. The head line is set by the primary at acceptance.

**Result:** verified — all eight round-1 findings resolved at their root cause.
F1 fails an empty request log instead of passing on it; F2 provisions Node 22
before any wrangler call, with the version echo moved to a position that cannot
reach the network; F3 rewrote `workflow.md`'s Release & Deployment section
(primary); F4 added `scripts/deploy/workflow.test.ts`, nine committed
assertions, so the workflow contract outlives the phase; F5 rejects a bare
`--url`; F6 keeps the failure diagnosis and routes pre-try failures through the
JSON envelope; F7 collapsed the duplicated Phase 2 Result block and its stray
`r`; F8 dropped the resolved known gap and corrected the entry F4 falsified.
F6(a)'s catch-path guard is reachable only through a live browser and is
recorded as uncovered rather than claimed. Gates: `bun test --check
--parallel=4 --timeout 120000` exit 0 (2841 pass / 1 skip / 0 fail, 2842 tests
/ 242 files), `bun run verify` exit 0, `bun run build` exit 0.
**Checkpoint:** `4e740b72` (code) and `8ca3959d` (`workflow.md`)
**Evidence:** `conductor/tracks/20261026-release-funnel/verification/phase-R1.md`

