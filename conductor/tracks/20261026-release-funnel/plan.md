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
- **Status:** in_progress

- [ ] **P2.T1: Workflow structure and gating** — covers: FR-1, FR-2, NFR-4, NFR-6
  - [ ] **P2.T1.1: Author `deploy.yml` - push to `main`, `workflow_dispatch`, concurrency cancel-in-progress, install, `bun run verify`, build, then `wrangler pages deploy`**
  - [ ] **P2.T1.2: Confirm the deploy step cannot run when verification fails, and that `ci.yml` is untouched**
- [ ] **P2.T2: Wrangler dependency and Pages config** — covers: FR-1, NFR-2
  - [ ] **P2.T2.1: Add a pinned `wrangler` dev dependency and a `deploy` script; confirm it stays out of the client bundle**
  - [ ] **P2.T2.2: Add `wrangler.jsonc` naming the Pages project and `apps/client/dist` as the upload directory; gitignore `.wrangler/`**
- [ ] **P2.T3: Failure and secret hygiene** — covers: FR-8, NFR-3
  - [ ] **P2.T3.1: Fail loudly and early when the secrets are absent, skip the deploy on forks, and assert no step echoes a secret**

## Phase 3: Live smoke check

- **Goal:** A Playwright script against a live URL drafts a starter, asserts the ranch renders, and reports zero console errors and zero failed asset requests; it is wired into the deploy workflow and its output is recorded as evidence.
- **Depends on:** Phase 2
- **Covers:** FR-3, FR-5, NFR-1, NFR-5, AC-3, AC-5
- **Touches:** `scripts/smoke/**`, `.github/workflows/deploy.yml`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** pending

- [ ] **P3.T1: Smoke script** — covers: FR-3, FR-5
  - [ ] **P3.T1.1: Author the smoke run - fresh profile, load URL, draft a starter, assert the ranch canvas and HUD render, collect console messages and failed requests**
  - [ ] **P3.T1.2: Assert zero console errors/warnings and zero failed JS/CSS/GLB/font requests; exit non-zero otherwise**
- [ ] **P3.T2: Wire into the deploy and prove it against a real URL** — covers: FR-3, FR-5
  - [ ] **P3.T2.1: Add the smoke step to `deploy.yml` after the deploy, against the deployed URL**
  - [ ] **P3.T2.2: Run the smoke check against the live `pages.dev` URL and record the result as phase evidence**
- [ ] **P3.T3: Static-only and no-behaviour-change audit** — covers: NFR-1, NFR-5
  - [ ] **P3.T3.1: Confirm the deployed artifact is static files only, `SAVE_VERSION` is still 25, and nothing under `packages/` or the client runtime changed**

## Phase 4: Release documentation

- **Goal:** `README.md` and `conductor/tech-stack.md` describe the deployment accurately — correct save version, live link, the one-time secret setup, and a dated stack note — with no claim that the code contradicts.
- **Depends on:** Phase 3
- **Covers:** FR-6, FR-7, FR-9, AC-6, AC-7
- **Touches:** `README.md`, `conductor/tech-stack.md`
- **Verification:** `bun test --check --parallel=4 --timeout 120000`
- **Status:** pending

- [ ] **P4.T1: README** — covers: FR-6, FR-9
  - [ ] **P4.T1.1: Correct the release checklist save-version references and make every item match actual behaviour**
  - [ ] **P4.T1.2: Add a Deploying section - live URL, the two repository secrets, and the steps a fresh maintainer follows**
- [ ] **P4.T2: Stack note** — covers: FR-7
  - [ ] **P4.T2.1: Replace the `## Deployment (target)` placeholder with a dated note recording Cloudflare Pages, the workflow, the secrets, and pinned `wrangler`**

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 4
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
