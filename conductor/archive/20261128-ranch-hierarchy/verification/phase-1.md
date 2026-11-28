# Phase 1 — Dock inline state

- Track: `20261128-ranch-hierarchy`
- Phase: 1 — Dock inline state (FR-1, FR-2, FR-6, AC-1, AC-2)
- Date: 2026-11-28
- Branch: `refactor/20261128-ranch-hierarchy`
- Base: `18c2004e01e00e5037ad81a7ad36194a2daa5754`
- Head (code): `01d57b84c27c929c7246babe3383f4eaad83f3bc`
- Result: **PASS** for the named phase check. Tech-stack `verify` is blocked only by a pre-existing, primary-owned Conductor metadata file (see Notes).

## What changed

- Care buttons and the train button now render an inline `span.kit-button-state` line with state, AP cost, and the rejection reason, so no information is hover-only. Rejection wording reuses `REJECTION_COPY` verbatim; the `data-reason` tooltip remains as a desktop enhancement.
- `careButtonLine()` derives the care line from the same `careAction` dry-run that decides enablement; `trainButtonState()` carries a `line` for ready, free re-point, no-AP, and capped states.
- Picker rows keep their capped / tonight / assigned lines visible; a regression test pins those strings through the row model.

## Commands

| Command | Result | Detail |
| --- | --- | --- |
| `bun test --check --parallel=4 --timeout 120000 apps/client/src/hud/dock.test.ts apps/client/src/hud/programs.test.ts apps/client/src/hud/copy.test.ts apps/client/src/hud/plates.test.ts` | PASS (exit 0) | 162 pass, 0 fail, 388 expect() calls |
| `bun run check` | PASS (exit 0) | All workspaces type-check; client 561 files |
| `bun run verify` | FAIL (exit 1) | Full suite 4653 pass / 1 skip / 0 fail; Biome reports one pre-existing error in `conductor/tracks/20261128-ranch-hierarchy/metadata.json` only. All touched code files are Biome-clean. |

## Acceptance criteria

| ID | Status | Evidence |
| --- | --- | --- |
| FR-1 | Done | Inline care state/cost/reason painted on every action button on every HUD update; `dock.test.ts` covers ready plus all five rejections. |
| FR-2 | Done | Train button inline line covers ready, free re-point, no-AP, and capped states; `dock.test.ts` pins each line. |
| FR-6 | Done | `.kit-button-state` makes state text persistent and visible; `.kit-button[data-reason]` tooltip kept for desktop. |
| AC-1 | Done | Care control state/cost/reason visible inline; no gating state relies on hover alone. |
| AC-2 | Done | Train control and picker rows show state/cost/reason inline, including capped, tonight, and assigned lines. |

## Evidence paths

- `apps/client/src/hud/dock.ts`
- `apps/client/src/hud/update.ts`
- `apps/client/src/hud/dock.test.ts`
- `apps/client/src/hud/programs.test.ts`
- `apps/client/src/ui/kit.css`
- Commit: `01d57b84c27c929c7246babe3383f4eaad83f3bc`

## Deviations

- `apps/client/src/ui/kit.css`: outside Phase 1 `Touches` but required for the new inline state span to be readable in the existing three-column button grid. Change is limited to a `.kit-button-state` rule adjacent to `.kit-button-cost`; no other CSS touched.

## Notes

- Sim, economy, gating, action order, copy wording, and save schema are untouched.
- Desktop hover tooltips remain as an enhancement, never the only source of reason text.
- The mock/showcase section builds care buttons directly and does not yet populate the new state span; updating it is outside Phase 1 `Touches` and belongs with the UI showcase work.
- Full `bun run verify` remains red on `conductor/tracks/20261128-ranch-hierarchy/metadata.json` (single-line JSON, primary-owned state file). No phase-owned file has a Biome diagnostic. The primary should reformat that state file when updating phase status.
- The browser/visual acceptance matrix (AC-5/AC-6) is owned by the primary; no screenshots were captured in this phase.
