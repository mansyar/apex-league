# Review: Type Affinity Drift & Extended Prestige

- **Track:** `20261021-affinity-drift-prestige-perks`
- **Type:** `feature`
- **Branch:** `feat/20261021-affinity-drift-prestige-perks`
- **Range:** `8a9dfdb..a89d4d8`
- **Date:** 2026-10-21
- **Verdict:** `PASS WITH FINDINGS`

## Summary

All FRs/ACs are implemented and verified with strong seeded/determinism/byte-identity tests; no Critical/High/Medium findings. Four Low polish findings remain (mirrored `0.55` literal, duplicated hatch-day derivation, graduation callout suppressed on drifted hatches, element-dependent drift fallback). `review.strict` is true, so all four proceed to a review-fixes phase rather than deferral.

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

- **F1 — Mirrored `0.55` literal in two client files**
  - **File:** `apps/client/src/graduation/copy.ts:49-56`, `apps/client/src/handbook/raising.ts:95-99`
  - **What:** the literal `0.55` mirrors `REFINED_INHERITANCE_FRACTION` while sibling constants (`HEAD_START_*`, `PRESTIGE_*`) are barrel-exported from `@apex/sim`.
  - **Why:** a future sim change would silently desync the two client literals.
  - **Fix:** re-export `REFINED_INHERITANCE_FRACTION` from `packages/sim/src/index.ts` and consume it in both spots.
  - **Requirement:** FR-6 / FR-4 · **Test gap:** none

- **F2 — `driftCallout` re-derives the hatch day inline**
  - **File:** `apps/client/src/hud/copy-growth.ts:147-157`
  - **What:** duplicates the sim's `hatchDayOf` derivation (last hall record's `retiredOnDay`, else 1).
  - **Why:** two copies of one rule can drift apart silently.
  - **Fix:** export `hatchDayOf` from `@apex/sim` and call it from `driftCallout`.
  - **Requirement:** FR-6 · **Test gap:** none

- **F3 — Drifted hatch replaces the graduation send-off callout**
  - **File:** `apps/client/src/hud.ts:127-139`
  - **What:** on a drifted hatch the drift line replaces the graduation callout entirely, so the retiree/generation send-off is never spoken on 15% of cross-element hatches.
  - **Why:** the legacy send-off is the emotional core of the graduation moment (product-guidelines: warm coach voice, legacy framing).
  - **Fix:** compose both lines so drifted hatches keep the send-off and the drift beat; pin precedence with a client test.
  - **Requirement:** FR-6 · **Test gap:** callout precedence test for drifted vs non-drifted graduation

- **F4 — Element-dependent drift fallback on the hatch-day update pass**
  - **File:** `apps/client/src/hud/update.ts:296-301`
  - **What:** `statusLine(...) || drift` only fires when `statusLine` is empty; for water-primary creatures `flavorCallout` wins and the drift statement is suppressed in that pass.
  - **Why:** no user-visible gap today (`announceGraduation` still lands the drift line), but the fallback behaves inconsistently across elements.
  - **Fix:** give the drift callout explicit precedence over flavor on the hatch day, or drop the fallback and rely on `announceGraduation`.
  - **Requirement:** FR-6 · **Test gap:** none

## Overrides

- <none>

## Plan compliance

Pass. Five phases match the plan; checkpoints match the squash commits; the phase-2 amendment (cup-side threading, `9c3e5e2`) is implemented and tested; no task silently dropped; docs-sync-in-same-phase rule honored (save-schema in P1); final diff stays within the union of Touches plus reported/accepted deviations.

## Out of scope

- Pre-existing mojibake in early `conductor/tracks.md` registry lines (Conductor state, pre-dates this track).
- Historical README staleness beyond the claims this track invalidates.

## Debt

- `review.issues.enabled` is false; any finding not fixed in the fix phase would be recorded here. Round 1 findings F1–F4 are all scheduled for the Phase R1 review-fixes (strict mode, no deferrals).

## Doc sync

`updated` — docs were synchronized as Phase 5 (product.md, tech-stack.md, README, save-schema) before review.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 4 | — |
