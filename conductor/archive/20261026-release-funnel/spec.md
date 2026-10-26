# Release Funnel — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Apex League runs entirely in the browser and has no deployment path. This track
puts the client on Cloudflare Pages behind a GitHub Actions deploy job, proves
the deployed build works with a live smoke check, and brings the release
documentation back in line with the code. After this track, the game is
playable at a public URL by anyone with a browser, and `main` deploys itself.

## Problem / Motivation

The game is feature-complete enough to show — nine species, a full ladder, a
ranch, a cup, legacy — but it cannot be played by anyone who has not cloned the
repository and run `bun run dev`. Every roadmap item after this one assumes a
deployed origin: the ElysiaJS backend needs a real `Origin` for CORS and trainer
identity, ghost PvP needs two clients, and cloud save sync needs somewhere to
sync from. Building any of those first means building them for a game that only
runs on `localhost`.

Two pieces of release documentation are also stale, and one of them is a
correctness claim rather than a preference:

- `README.md:151-152` tells a release tester to confirm an older save
  "migrates to v24". `SAVE_VERSION` is 25 (`packages/sim/src/save/schema.ts:5`),
  so a tester following the checklist would accept a v24 save as correct.
- The release checklist's six items are all unchecked and have never been
  walked against a deployed build.

If this is not solved, the project stays a repository rather than a game, and
the next track (backend) gets built against an origin that does not exist.

## Goals & Success Metrics

- **Goal:** A public URL serves the current `main` build, and pushing to `main`
  redeploys it automatically behind the same verification gate that protects
  PRs.
- **Metric:** `https://<project>.pages.dev` loads the ranch, drafts a starter,
  and renders with zero console errors in a Playwright run; a push to `main`
  reaches production with no manual step beyond the one-time secret setup.

## Scope

### In Scope

- A GitHub Actions deploy workflow that builds, verifies and deploys
  `apps/client/dist` to Cloudflare Pages on push to `main`.
- Gating the deploy on `bun run verify`, so a drifted GLB or a failing test can
  never reach production.
- Making the dev-server `allowedHosts` entry configurable by environment
  variable instead of naming one machine.
- A Playwright smoke check against the live URL: boot, draft a starter, assert
  the ranch renders and the console is clean.
- Refreshing the README release checklist: correct save-version references,
  accurate items, and a link to the live build.
- Recording the hosting and deploy decisions in `conductor/tech-stack.md`.

### Out of Scope

- **The ElysiaJS backend** — cloud saves, trainer identity, leaderboards and
  ghosts remain Phase 3 roadmap items for a later track.
- **Preview deployments per pull request** — production only, by decision.
- **Custom domain, DNS, TLS configuration** — the `pages.dev` subdomain is the
  deliverable.
- **Changing game behaviour, save schema, or any file under `packages/`** —
  save stays v25.
- **Walking the full six-item release checklist against production** — the
  smoke check proves the deploy works; a complete pre-release QA pass is a
  separate concern.
- **Replacing or restructuring the existing PR CI workflow** — `ci.yml` is
  unchanged.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | A GitHub Actions workflow deploys `apps/client/dist` to Cloudflare Pages when `main` moves, using `wrangler pages deploy` authenticated by repository secrets. | must |
| FR-2 | The deploy job runs the project's full `bun run verify` gate and does not deploy if it fails. | must |
| FR-3 | The deployed build serves at the domain root with all assets resolving — no base-path rewriting, no 404s for JS, CSS or GLB files. | must |
| FR-4 | The dev server's `allowedHosts` list is populated from an environment variable, and the committed config no longer contains a machine-specific hostname. | must |
| FR-5 | A Playwright smoke check loads the live URL, drafts a starter, and asserts the ranch renders with no console errors or warnings. | must |
| FR-6 | `README.md` describes the deployment accurately, states the correct save version, and links the live build. | must |
| FR-7 | `conductor/tech-stack.md` records the hosting target, the deploy mechanism, the required secrets, and `wrangler` as a dev dependency with a dated note. | must |
| FR-8 | A failed deploy is visible: the workflow run fails, and the previously deployed build remains live rather than the site going dark. | should |
| FR-9 | The deploy workflow is documented well enough that a fresh maintainer can reproduce the one-time secret setup from the README alone. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No game behaviour change. Nothing under `packages/` or the client's runtime code changes; `SAVE_VERSION` stays 25. |
| NFR-2 | No new runtime dependency. `wrangler` is a dev dependency only and must not enter the client bundle. |
| NFR-3 | No credential is committed, logged, or echoed. Secrets are read from `secrets.*` only, and the workflow must not print them. |
| NFR-4 | The deploy must not weaken the determinism gate. A drifted or regenerated GLB fails the deploy exactly as it fails CI. |
| NFR-5 | The production artifact is static files only — no server process, no runtime environment variables read by the client. |
| NFR-6 | The existing `ci.yml` PR gate is unchanged in behaviour; this track adds a workflow rather than modifying the PR one. |
| NFR-7 | Build output shape is unchanged: the same Vite entry, the same asset layout, `dist/` still gitignored. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Pushing a commit to `main` produces a successful deploy run that uploads `apps/client/dist`, and the resulting URL serves that commit's build. | FR-1 |
| AC-2 | A deliberately failing verification (demonstrated locally or by inspecting the job's step ordering) prevents the deploy step from running. | FR-2 |
| AC-3 | The live URL loads with zero failed network requests for JS, CSS, GLB or font assets, verified in the Playwright run's request log. | FR-3 |
| AC-4 | `apps/client/vite.config.ts` contains no literal hostname, and setting the documented environment variable restores the remote-dev behaviour. | FR-4 |
| AC-5 | The Playwright smoke run drafts a starter and asserts a rendered ranch plus a clean console, with output recorded as phase evidence. | FR-5 |
| AC-6 | `README.md` contains no reference to save v24, links the live URL, and its checklist items match what the code actually does. | FR-6 |
| AC-7 | `conductor/tech-stack.md` has a dated deployment note naming Cloudflare Pages, the workflow, the two secrets, and `wrangler`. | FR-7 |
| AC-8 | A simulated deploy failure leaves the previously deployed build reachable. | FR-8 |

## Edge Cases

- **Secrets absent or expired.** The deploy job must fail with a clear message
  rather than a partial upload. On a fork, the job must not attempt a deploy.
- **First deploy.** Cloudflare Pages creates the project on first
  `wrangler pages deploy` if it does not exist; the workflow must not assume a
  pre-created project, and must not fail on an already-existing one.
- **`main` moves while a deploy runs.** `concurrency` must cancel the older run
  so production never ends up on a stale build.
- **Determinism gate needs to regenerate GLBs.** It does so in CI today on
  `ubuntu-latest`; the deploy job runs on the same runner and must not assume a
  warm artifact cache.
- **A save written on the deployed site.** Origin differs from localhost, so
  `localStorage` is empty on first visit — this is expected, not a bug, and the
  smoke check must start from a fresh profile.
- **The deploy succeeds but the site is broken** (e.g. a bad asset path). This
  is exactly what FR-5 exists to catch, and it must run against the deployed
  URL rather than a local preview.
- **`wrangler` version drift.** The dev dependency must be pinned so a future
  wrangler release cannot change deploy behaviour silently.

## Dependencies

- **Tracks:** none.
- **External:**
  - A Cloudflare account with Pages enabled.
  - Two repository secrets, which only the repository owner can create:
    `CLOUDFLARE_API_TOKEN` (Pages: Edit) and `CLOUDFLARE_ACCOUNT_ID`.
  - No other service, API, or data dependency.

## Open Questions & Assumptions

- **Assumption:** Cloudflare Pages serves a Pages project at the domain root
  (`<project>.pages.dev/`), so Vite's default `base` of `/` needs no change.
  If the deploy instead lands under a path prefix, a `base` must be added and
  AC-3 is the check that catches it.
- **Assumption:** `bun run verify` completes inside GitHub Actions' default job
  timeout on `ubuntu-latest`; it already runs there today via `ci.yml`, so no
  new budget is required.
- **Assumption:** The one-time secret setup is performed by the repository
  owner out of band. The track is complete and verifiable in the repository
  without it; only the live deploy needs the secrets.
- **Question (deferred):** whether the eventual custom domain changes the
  `base` or CORS posture. Out of scope here; revisit with the backend track.
- **Question (deferred):** whether preview deployments are wanted later. Out of
  scope by decision; the workflow should be structured so adding a preview job
  is additive.

## References

- `conductor/tech-stack.md` — `## Deployment (target)` (line 650) and `## Server`
- `conductor/product.md` — Phase 4 "polish & release funnel"
- `README.md` — `## Release checklist` (line 143), `## Roadmap` (line 189)
- `.github/workflows/ci.yml` — the existing verification gate
- `.github/workflows/nightly.yml` — fuzz and determinism sweep
- `apps/client/vite.config.ts` — the hardcoded `allowedHosts` entry (line 15)
- `packages/sim/src/save/schema.ts:5` — `SAVE_VERSION = 25`
