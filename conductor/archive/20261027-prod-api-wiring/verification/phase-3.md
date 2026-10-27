# Phase 3 Verification — Integrated verification

- **Track:** 20261027-prod-api-wiring · **Phase:** 3 (Integrated verification)
- **Work commit (Checkpoint):** `f917ff33` — `chore(deploy): fix biome lint and format in workflow test`
- **Plan Verification:** `bun run verify && bun run build` — both exit 0
  (pwsh `$?` True; client build closes with `Exited with code 0`).
- **Result:** verified.

## What the phase subagent proved (session ses_e8109e089ffeOwa29X54jZXx4k)
- P3.T1.1: build with `VITE_API_ORIGIN=https://apex-api.ansyar-world.top`
  exits 0 and the origin is present in `apps/client/dist/assets/*.js`.
- P3.T1.2: build with `VITE_API_ORIGIN=""` exits 0 with no origin string in
  `dist`; default `bun run build` also exits 0 and stays offline.
- Full gate at that point: `bun run check` clean (4 pkgs), `bun test`
  3416 pass / 1 skip / 0 fail, determinism gate OK — but `biome check`
  failed on `scripts/deploy/workflow.test.ts` (Phase 1 escapee: Phase 1
  verification ran tests + typecheck, not biome). Subagent correctly stopped
  per its no-source-edits constraint and reported `blocked`.

## Primary rework (recorded here, committed as f917ff33)
- `workflow.test.ts:243`: `/^      - name: /` → `/^ {6}- name: /`
  (fixes `noAdjacentSpacesInRegex` with identical match semantics).
- `biome check --write` collapsed the `originSteps` filter to one line
  (format diff). Diff: 2 insertions, 4 deletions, test file only.
- Re-ran `bun test scripts/deploy/workflow.test.ts`: 17 pass, 0 fail.

## Primary independent verification
- `bun run verify` → exit 0 (check + full suite + biome + determinism gate,
  log at `C:\Users\Ansyar\AppData\Local\Temp\opencode\verify-p3.log`).
- `bun run build` → exit 0.
- Stale `phase-3-brief.md` scratch removed; tree holds only the test fix.

## AC mapping
- AC-5 (prod + offline builds proven): subagent build assertions above.
- AC-6 (`bun run verify && bun run build` green): primary rerun above.
- NFR-1: no secrets; only the public origin URL. NFR-2: no product-code
  changes (test-only fix). NFR-3: previews still `VITE_API_ORIGIN=` → offline.
