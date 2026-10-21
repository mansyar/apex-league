# Review: Type Affinity Drift & Extended Prestige

- **Track:** `20261021-affinity-drift-prestige-perks`
- **Type:** `feature`
- **Branch:** `feat/20261021-affinity-drift-prestige-perks`
- **Range:** `8a9dfdb..a89d4d8`
- **Date:** 2026-10-21
- **Verdict:** `PASS`

## Summary

All FRs/ACs are implemented and verified with strong seeded/determinism/byte-identity tests; no Critical/High/Medium findings. The four Low findings from round 1 (mirrored `0.55` literal, duplicated hatch-day derivation, graduation callout suppressed on drifted hatches, element-dependent drift fallback) were all resolved in the Phase R1 review-fixes with 5 new pinning tests; the full gate is green. `review.strict` is satisfied — nothing deferred, no overrides.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun test --timeout 120000` (within `bun run verify`) | pass — 2119 pass / 1 skip / 0 fail | verification/integrated.md |
| lint + format | `biome check` (within `bun run verify`) | pass — 479 files clean | verification/integrated.md |
| typecheck | `bun run check` | pass | verification/integrated.md |
| determinism | `bun run gate:determinism` (within `bun run verify`) | pass — 9 GLBs + prop digests byte-identical | verification/integrated.md |
| build | `bun run build` | pass | verification/integrated.md |
| coverage | not configured | n/a | workflow coverage.gate = none |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | `packages/sim/src/breeding.test.ts` | covered |
| FR-2 | P1.T2 | `packages/sim/src/save/save.test.ts`, `transfer.test.ts` | covered |
| FR-3 | P2.T1, P2.T3 | `packages/sim/src/battle/affinity.test.ts`, `cup/affinity.test.ts` | covered |
| FR-4 | P3.T2 | `packages/sim/src/breeding.test.ts` | covered |
| FR-5 | P3.T3 | `packages/sim/src/ap.test.ts`, `breeding.test.ts` | covered |
| FR-6 | P4.T1–T4 | VM/copy tests + AC-6 visual evidence (both widths) | covered |
| FR-7 | P1.T2.3, P5.T1–T2 | `docs/save-schema.md`, product/tech-stack/README | covered |
| NFR-1 | P4 changes | `module-size.test.ts` green | covered |
| NFR-2 | — | inspection + determinism gate | covered |
| NFR-3 | P1–P3 | pure/seeded modules, full suite | covered |
| NFR-4 | P1.T1, P4.T1 | preview = hatched via same seeded roll | covered |
| AC-1..AC-7 | P1–P5 | verification/phase-1..5.md | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- <none — F1–F4 resolved in Phase R1 (checkpoint `eadd17c`); original findings preserved in History context below>

<details>
<summary>Round 1 findings (resolved)</summary>

- **F1 — Mirrored `0.55` literal in two client files** — `apps/client/src/graduation/copy.ts:49-56`, `apps/client/src/handbook/raising.ts:95-99` → `REFINED_INHERITANCE_FRACTION` re-exported from the sim barrel and consumed in both spots.
- **F2 — `driftCallout` re-derives the hatch day inline** — `apps/client/src/hud/copy-growth.ts:147-157` → now calls the sim's `hatchDayOf`.
- **F3 — Drifted hatch replaces the graduation send-off callout** — `apps/client/src/hud.ts:127-139` → composed via `graduationTickerLine` (send-off + drift beat); precedence pinned by tests.
- **F4 — Element-dependent drift fallback on the hatch-day update pass** — `apps/client/src/hud/update.ts:296-301` → explicit drift-first precedence via `hatchDayStatusLine`; fallback removed; element-independence pinned by tests.

</details>

## Overrides

- <none>

## Plan compliance

Pass. Five phases plus the Phase R1 review-fixes match the plan; checkpoints match the squash commits; the phase-2 amendment (cup-side threading, `9c3e5e2`) is implemented and tested; no task silently dropped; docs-sync-in-same-phase rule honored (save-schema in P1); final diff stays within the union of Touches plus reported/accepted deviations (R1: `hud/copy-care.ts` pure-precedence home, `hud/copy.ts` re-export surface).

## Out of scope

- Pre-existing mojibake in early `conductor/tracks.md` registry lines (Conductor state, pre-dates this track).
- Historical README staleness beyond the claims this track invalidates.

## Debt

- <none> — `review.issues.enabled` is false; round-1 findings F1–F4 were all fixed in Phase R1 (strict mode), so no deferrals remain.

## Doc sync

`updated` — docs were synchronized as Phase 5 (product.md, tech-stack.md, README, save-schema) before review; the R1 fixes changed no user-facing copy contracts requiring further doc updates (rendered copy unchanged; F3 composition keeps ≤2 sentences per copy rule).

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 4 | — |
| 1 (after R1 fixes) | PASS | 0 | 0 | 0 | 0 | 4 |
