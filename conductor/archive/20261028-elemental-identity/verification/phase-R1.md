# Phase R1 Verification — Review Fixes

- **Track:** `20261028-elemental-identity`
- **Phase:** R1 (review round-1 fixes, findings F1–F4, all Low)
- **Date:** `2026-10-28`
- **Branch:** `feat/20261028-elemental-identity`
- **Result:** `verified`

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `bun run check` (in verify) | 0 | no type errors, all packages (465 client files) |
| unit | `bun test --check --parallel --timeout 120000` (in verify) | 0 | 3454 pass / 1 skip / 0 fail |
| lint/format | `biome check` (in verify) | 0 | clean, no fixes applied |
| determinism | `bun run gate:determinism` (in verify) | 0 | all species × stages + 5 props byte-identical |
| build | `bun run build` | 0 | lab still split to own chunk; pre-existing chunk-size warning only |

## Findings disposition

| ID | Fix | Evidence |
| --- | --- | --- |
| F1 | `plant.ts`: stale tier-1 `vine_lash` comment deleted, whip-crack header kept | diff `plant.ts` −2 lines |
| F2 | `fire.ts`: `pyre_wall` row comment + module docstring reworded to foe-targeted eruption, matching siblings + spec edge case | diff `fire.ts` ±9 lines |
| F3 | `moves.ts:88` barrel comment `(spec FR9)` → `(spec FR-2)` | diff `moves.ts` 1 line |
| F4 | `EARTH_DUST_TINT` exported from `moves/fallback.ts`, referenced at all 17 sites (15 earth + 2 fallback); grep confirms zero remaining raw literals | diff `fallback.ts` + `earth.ts`; `grep -rn "#9c8f7d"` hits definition only |

No behavior change in any fix (comments + one constant extraction); existing
AC-1/verb pins cover the values unchanged. Deviation from brief: F2 extended
to the `fire.ts` module docstring (same contradiction, same file) — recorded
in `review.md` plan-compliance on re-review.

## Re-review

Delta re-checked by primary: 5 files, +31/−24, comment-only except the
constant extraction; no test changes needed; gate green. Round-2 verdict:
`PASS`, zero open findings.
