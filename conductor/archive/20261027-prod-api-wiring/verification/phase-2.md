# Phase 2 Verification — Docs truth pass

- **Track:** 20261027-prod-api-wiring · **Phase:** 2 (Docs truth pass)
- **Work commit (Checkpoint):** `3e1f5d0f` — `docs(deploy): correct stale no-backend notes for live API`
  (Applied directly by the primary with the user's explicit approval after the
  phase subagent reported `blocked`: its edit tool denied writes, zero files
  changed. Content follows the spec FR-4 and the brief's concrete instructions
  verbatim; no code touched.)
- **Plan Verification:** `bun run check`
- **Result:** clean, exit 0 — sim 169 files, voxel 160, server 44, client 452, no type errors.
- **Blocked context:** subagent session `ses_e811069b9ffe1GlG0p5VQhvysf` returned
  `status: blocked`, `files_changed: []`, baseline `bun run check` green. Plan
  recorded `Status: blocked + Reason`, committed as `c1ac2300`, loop stopped,
  user chose "I apply docs directly".

## AC mapping
- AC-4 (docs no longer claim no-backend; env documented for prod + local):
  - `conductor/workflow.md` — ElysiaJS paragraph now states the live API URL,
    volume, and `:memory:` route tests; Services/Containers/Database/Env rows
    describe the API, image, SQLite volume (replicas 1), and all five vars;
    Release section notes server live since 2026-10-27 + prod/preview origin
    behavior; Emergency gains API-down triage (health probe, boot-line check,
    volume fix), volume-backed data-loss note, and drift-aware security note.
  - `conductor/tech-stack.md` — dated 2026-10-27 entry marks the server LIVE
    and supersedes the 2026-10-26 "stays deferred" note for the server
    (historical entry preserved per dated-note convention).
  - `README.md` — Deploying intro states the API is live; new "API origin"
    bullet (`APEX_API_ORIGIN` var → `VITE_API_ORIGIN`, fail-fast, previews
    offline); setup gains the Variables step; container env shows live values
    with the `none (same-origin only)` boot-line meaning; tech table row now
    "live since 2026-10-27".
  - `.env.example` — adds `APEX_API_ORIGIN`, `VITE_API_ORIGIN`, `PORT`,
    `DATABASE_PATH`, `ALLOWED_ORIGIN` with prod/local comments.
  - Negative check: `grep "No backend runs|Database:** none|still deferred|no backend|Full-scale incident procedures do not apply"` across the four files
    returns no matches.

## Scope check
- `git diff 093a5d73..3e1f5d0f --stat`: only the four declared Touches files.
  No code, no workflow YAML, no `conductor/tracks/*` state touched by the work commit.
- NFR-1 (no secrets in repo): only the public origin URL and var names; no tokens.
