# Phase 1 Verification — Deploy wiring

- **Track:** 20261027-prod-api-wiring · **Phase:** 1 (Deploy wiring)
- **Work commit (Checkpoint):** `660932b3` — `chore(deploy): wire APEX_API_ORIGIN into Pages prod build, previews offline`
  (Primary committed the subagent's uncommitted work verbatim; no content changes by primary.)
- **Plan Verification:** `bun test scripts/deploy/workflow.test.ts --check`
- **Result:** 17 pass / 0 fail (65 expects) — rerun independently by primary. Green.
- **Extra:** `bun run check` clean in all 4 workspaces per subagent (sim 169, voxel 160, server 44, client 452 files).

## AC mapping
- AC-1 (prod build exports `VITE_API_ORIGIN` from `vars.APEX_API_ORIGIN`): met — `Build (production)` step, `main`-gated, `env: VITE_API_ORIGIN: ${{ vars.APEX_API_ORIGIN }}`.
- AC-2 (previews build without the origin; bundle stays offline): met — separate `Build (preview)` step (`!= 'main'`), no origin env; origin appears in exactly one step (test-enforced).
- AC-3 (missing var fails fast naming it before upload): met — `Check API origin variable` step before Verify/Build/Upload, `main`-gated, names `APEX_API_ORIGIN` + `Settings > Secrets and variables > Actions > Variables`, `exit 1`.

## Scope check
- `git diff 07f8c76c..660932b3 --stat`: only `.github/workflows/deploy.yml` + `scripts/deploy/workflow.test.ts` (declared Touches). No `conductor/` edits by subagent; no client/server code touched.
- TDD: 4 new tests failed before the workflow edit, all 17 pass after (subagent report; verification rerun confirms green).
- NFR-1 hygiene: origin travels via `env:`, never interpolated into `run:` (test-enforced).
