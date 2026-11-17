# Review — Global Pacing

- **Reviewer:** `conductor-reviewer` (read-only subagent, session `ses_e173d7974ffeh7MIVrfdiILA9x`)
- **Range:** `0c9b8fca..ba2a7784` (9 files, all under `conductor/`)
- **Round:** 1
- **Verdict:** PASS WITH FINDINGS — 0 Critical, 0 High, 0 Medium, 1 Low, no blockers

## Reviewer's own checks

| Check | Result |
| --- | --- |
| `git diff --name-status 0c9b8fca..ba2a7784` | pass — 1 modified registry line + 8 new track files; no `packages/`, `apps/`, species, controller, ghost, pin or bound file |
| `SIM_VERSION` and ghost pins | pass — `ghost.ts:40` is 3, `ghost.test.ts:236/249` unchanged |
| Both debt pins | pass — `telemetry.test.ts:213` and `pacing.test.ts:176` still in debt form |
| `bun run trace --seed 20261111 --check` | pass — `0xb6cce858`, 5/5 invariants |
| `bun run telemetry` | pass — 20/42, 14/14 bounds |
| `bun run balance` | pass — 224/840 (26.7%), 15/15 species, 49/49 moves |
| `bun run check`, `bun test`, `bun run build` | pass — typechecks clean, 4,167 pass / 1 skip / 0 fail, 418 modules |
| `bun run verify`, `bunx biome check`, `bun run gate:determinism` | not run by reviewer — shell policy denied the chains |

## Finding and disposition

| ID | Severity | Location | Finding | Disposition |
| --- | --- | --- | --- | --- |
| F1 | Low | `spec.md:49-51` | A stale Goals metric still said both debt pins would be promoted, contradicting the amended no-ship metric at lines 44-45 and FR-14/AC-14 | **Fixed** — the metric is marked `Withdrawn 2026-11-17 (review F1)` with a pointer to FR-14/AC-14 and the actual pin locations |

## Judgement calls

- The no-ship outcome is honest. The matrix's 224/840 (26.7%) already meets the product rule; the fixture's 20/42 is a biased diagnostic and its target was formally Withdrawn, not silently relaxed.
- AC-11 and NFR-3/AC-9 were listed as `partial` only where the reviewer's shell denied the full chain. The primary ran `bun run verify` three times on the final tree, each exit 0 with 4,167 pass / 1 skip / 0 fail, Biome 940 files with no fixes and voxel determinism byte-identical. After review the primary also ran `bunx biome check` (exit 0, 940 files) and `bun run gate:determinism` (exit 0, all digests match). No override of a failed check was needed.

## Primary re-verification after the fix

| Check | Result |
| --- | --- |
| `bunx biome check` | exit 0 — 940 files, no fixes |
| `bun run gate:determinism` | exit 0 — all committed digests byte-identical |
| `bun run verify` | exit 0 on the final tree — 4,167 pass / 1 skip / 0 fail, Biome clean, determinism OK |
| `bun run build` | exit 0 — 418 modules, chunk warning only |

## Debt recorded, not fixed

- D-1: global pacing still runs 23-27% of fights to the cap depending on population; the matrix figure is inside the product rule and the fixture figure is withdrawn debt.
- D-2: the kite threat band remains unholdable at `spd 5`.
- D-3: the fixture one-in-three target is missed at 20/42; both debt pins stay in place.
- D-4: the fixture is not a sample of the matrix population (stat basis, doctrine mix and pairing walk); attribution is measured but not fully separated.

No overrides. No product-doc sync: the roadmap already describes D-1 as owed, and this track landed no feature.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 1 |
