# Phase R1 evidence — Review Fixes (F1)

- Track: 20261027-global-leaderboards — Global Leaderboards
- Phase: R1 — Review Fixes
- Date: 2026-10-27
- Branch: feat/20261027-global-leaderboards
- Base: b9768c2e (plan) / code fix on track head
- Head: (phase commit, below)
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
|-------|---------|------|---------|
| unit (scoped) | `bun test --check apps/client/src/cloud --parallel=4 --timeout 120000` | 0 | 91 pass, 0 fail (was 90; +1 F1 regression test) |
| typecheck | `bun run check` | 0 | all workspaces clean |
| lint/format | `bunx biome check apps/client/src/cloud` | 0 | 20 files, no findings |

Full `bun run verify` + `bun run build` re-run at final acceptance (round-2 review close-out).

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| F1 | Failed first upload keeps its failure status, never "synced" | `uploadLocal` returns `true` after `failureStatus(result)` (status already settled); `false` only for the payload/credentials/savedAt early returns. New test "a failed first upload keeps its failure status, never 'synced' (F1)": sign-in with a local ranch + refusing push → `ok:true`, 1 attempt, credentials remembered, status `{ kind: "offline" }`. | verified |

## Evidence paths

- `apps/client/src/cloud/sync.ts` — `uploadLocal` doc comment + `return true` on handled failure
- `apps/client/src/cloud/sync.test.ts` — F1 regression test

## Deviations

None. Fix touches exactly the R1 Touches; no other file changed.

## Notes

- Root cause, not a blind apply: the P3 saveless-signin fix made "nothing to upload" and "upload failed" share one `false` return, and both callers unconditionally settled `synced` on `false`. The fix keeps the P3 behavior (saveless sign-in settles `synced`) while letting `failureStatus` stand when a real push fails.
- The old code fails the new test by construction (`false` → caller sets `synced` ≠ `offline`).
