# Prod API Wiring — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Wire the production API origin into the Cloudflare Pages deploy so the shipped client talks to the live Coolify server. Today `deploy.yml` builds without `VITE_API_ORIGIN`, so even a green prod deploy boots offline-only (no cloud save, leaderboards, ghosts). This track injects the origin at build time from a public GitHub Variable, keeps previews offline, and corrects the stale "no backend" docs.

## Problem / Motivation

The backend is live (`https://apex-api.ansyar-world.top/health` → ok, `ALLOWED_ORIGIN=https://apex-league.pages.dev` verified in the boot log) but the frontend cannot reach it: `cloudOrigin()` returns `null` without `VITE_API_ORIGIN`, so `createCloudSave` never initializes. Who feels it: every prod player (no sync, no boards, no ghosts) and the owner (deploys look green but backend value is dead). If not solved, prod stays a local-only game with a running-but-unused API.

## Goals & Success Metrics

- **Goal:** Prod Pages bundle talks to the Coolify API with passing CORS.
- **Metric:** Prod build contains `https://apex-api.ansyar-world.top`, `GET /health` reachable from the Pages origin with `Access-Control-Allow-Origin` echoed, offline fallback preserved when origin is absent.
- **Goal:** Previews never touch prod data.
- **Metric:** Non-`main` manual deploys build without `VITE_API_ORIGIN`.
- **Goal:** Docs stop lying about the backend.
- **Metric:** `workflow.md` services/DB/env/emergency, `tech-stack.md`, `README.md`, `.env.example` match reality.

## Scope

### In Scope

- `deploy.yml`: read public Variable `APEX_API_ORIGIN` → `VITE_API_ORIGIN` build env on prod; fail fast naming the var when missing on `main`; previews build without it (offline).
- Workflow tests covering: prod injects, missing fails, preview offline.
- Minimal docs truth pass: `conductor/workflow.md` (services/database/env/emergency), `conductor/tech-stack.md` dated note, `README.md` deploy section, `.env.example` (`APEX_API_ORIGIN`, `VITE_API_ORIGIN`, `PORT`, `DATABASE_PATH`, `ALLOWED_ORIGIN`).
- Proof: full `verify` + prod build contains origin + offline build has no cloud.

### Out of Scope

- Server live smoke probe against Coolify (separate track).
- Dockerfile `HEALTHCHECK`, GHCR retention, SQLite backup/restore runbook, SHA rollback procedure.
- Multi-origin / `*.pages.dev` preview CORS (server stays single-origin; previews are offline so this is unnecessary).
- Rate limiting on scores/ghost submit.
- Same-artifact-promotion / runtime `config.json` pattern (build-time var is the decision).

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Prod (`main`) build sets `VITE_API_ORIGIN` from Variable `APEX_API_ORIGIN` | must |
| FR-2 | Preview (non-`main` manual) builds set no `VITE_API_ORIGIN` (offline-only) | must |
| FR-3 | Missing `APEX_API_ORIGIN` on prod fails the job fast, naming the variable | must |
| FR-4 | Docs (`workflow.md`, `tech-stack.md`, `README.md`, `.env.example`) describe the live backend truthfully | should |
| FR-5 | No-origin local builds keep today's offline behavior (no chip, no status, no modal) | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Public URL travels via Variables, not Secrets; no secret or PII is logged or printed |
| NFR-2 | `bun run verify && bun run build` green; offline playability fully preserved |
| NFR-3 | No behavior change to CORS semantics (single exact origin, never `*`) |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Prod workflow job exports `VITE_API_ORIGIN=${{ vars.APEX_API_ORIGIN }}` at build | FR-1 |
| AC-2 | Preview job has no `VITE_API_ORIGIN` in its environment | FR-2 |
| AC-3 | Prod run without the variable fails before upload, naming `APEX_API_ORIGIN` | FR-3 |
| AC-4 | `workflow.md` no longer says "no backend / none required"; `.env.example` documents all five vars; `tech-stack.md` + `README.md` match the live topology | FR-4 |
| AC-5 | Build with origin contains `https://apex-api.ansyar-world.top`; build without origin has no cloud object (existing `phase-4-no-origin` behavior) | FR-5 |
| AC-6 | Full `bun run verify && bun run build` passes on the track branch | NFR-2 |

## Edge Cases

- `APEX_API_ORIGIN` with trailing slash → client `cloudOrigin()` strips it; workflow passes the value through unmodified.
- Variable set to empty string → treated as missing → fail fast on prod.
- `ALLOWED_ORIGIN` mismatch (e.g. owner typo) → browser blocks as network error; runbook documents exact value `https://apex-league.pages.dev`.
- Server down at runtime → client degrades to offline per existing `call()` failure-as-value behavior; deploy does not probe the API.
- Old cached Pages deployment without origin → replaced on next green `main` upload (gate keeps previous deployment live on failure).

## Dependencies

- **Tracks:** none blocking (built on `20261026-backend-foundation` + `20261026-release-funnel`, both merged on `main`).
- **External:** Cloudflare `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets (owner); Coolify `ALLOWED_ORIGIN=https://apex-league.pages.dev` (done, verified in boot log); new GitHub Variable `APEX_API_ORIGIN=https://apex-api.ansyar-world.top` (owner action, TBD until added).

## Open Questions & Assumptions

- **Assumption:** Prod client is `https://apex-league.pages.dev` (from `wrangler.jsonc`) and prod API is `https://apex-api.ansyar-world.top` (owner-provided 2026-10-28).
- **Assumption:** `ALLOWED_ORIGIN` is already correct on Coolify (log: `allowed origin https://apex-league.pages.dev`).
- **Assumption:** `VITE_API_ORIGIN` stays build-time; runtime `config.json` pattern explicitly rejected for this track.
- **Question:** None open — owner supplies the `APEX_API_ORIGIN` Variable value; plumbing accepts any HTTPS origin.

## References

- `.github/workflows/deploy.yml`, `.github/workflows/server-image.yml`
- `apps/client/src/cloud/config.ts`, `apps/client/src/main.ts:136`
- `apps/server/src/main.ts`, `apps/server/src/cors.ts`
- `scripts/deploy/workflow.test.ts`, `scripts/smoke/smoke.ts`
- `conductor/archive/20261026-backend-foundation/spec.md`, `conductor/archive/20261026-release-funnel/spec.md`
