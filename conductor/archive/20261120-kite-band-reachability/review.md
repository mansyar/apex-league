# Review: D-2 Kite Band Reachability

- **Track:** `20261120-kite-band-reachability`
- **Type:** `chore`
- **Branch:** `chore/20261120-kite-band-reachability`
- **Range:** `1310de206028d4b4cb10ee8aa7fad8ff927af3a6..1fe0d06b29eb3cb7c27a373c38cb06a6b3da8197`
- **Date:** `2026-11-20T19:56:55.5516809+11:00`
- **Verdict:** `PASS`

## Summary

The reviewed range is ready. The Kite speed-aware reachability clamp, the single
owner-approved 40 s → 45 s cap extension with its matching duration pins, the
`SIM_VERSION` 4 replay guard with ghost pins 4/5, and the two narrow species
re-tunes are all implemented and evidenced. The final matrix has all 34 gates
green with `capShare` 22.0% (370/1680), strictly below the 30.8% (517/1680)
baseline; both previously red species are back inside the unchanged 45–55%
design band. All configured checks passed on the reviewed tree, strict mode is
satisfied with zero Critical/High/Medium/Low findings, and no change was made
outside the owner-approved scope. An earlier reviewer call with a missing brief
returned `BLOCK` without performing a review; it was superseded by this review.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun test --timeout 120000` | pass | `C:\Users\Ansyar\AppData\Local\Temp\opencode\d2-review-checks\test.out`; full 4458 pass / 1 skip / 0 fail confirmed in `verify.out` with the expected non-gating `smoke` diagnostic |
| coverage | none configured | n/a | `coverage: none` in workflow config |
| lint | `bun x biome check` | pass | `C:\Users\Ansyar\AppData\Local\Temp\opencode\d2-review-checks\biome.out`; also green inside `bun run verify` |
| typecheck | `bun run check` | pass | `C:\Users\Ansyar\AppData\Local\Temp\opencode\d2-review-checks\check.out`; voxel 214, sim 252, server 185, client 549 files clean |
| build | `bun run build` | pass | `C:\Users\Ansyar\AppData\Local\Temp\opencode\d2-review-checks\build.out`; Vite 438 modules, pre-existing >500 kB chunk warning only |
| verify | `bun run verify` | pass | 4458 pass / 1 skip / 0 fail, 670470 `expect()` calls, 4459 tests / 437 files, hash `0xff6f3d62` |
| balance | `bun run balance` | pass | 1680 fights, 34/34 gates, capShare 370/1680 (22.0%), decisiveShare 95.1%, capWinQuality 78.9%, damage 49/49 |
| determinism | `bun run gate:determinism` | pass | 21 species × 3 stages + 5 props byte-identical |
| fuzz | `bun run test:fuzz` | pass | 139 pass / 0 fail, 129015 `expect()` calls |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1/T2/T3 | `verification/phase-1.md` | covered |
| FR-2 | P2.T1/T2, P4.T1, P5.T1 | `controller-reach.ts`, `controller-profile.test.ts`, `phase-2.md` | covered |
| FR-3 | P2.T1.2/T2.2 | `controller-reach.test.ts`, `controller-profile.test.ts` | covered |
| FR-4 | P4.T3 | `ghost.ts`, `ghost.test.ts`, `integrated.md` | covered |
| FR-5 | P3.T1, P4.T4, P5.T3 | `balance.out`, `integrated.md` | covered |
| FR-6 | P3.T1, P4.T4, P5.T3 | `balance.out`, `integrated.md` | covered |
| FR-7 | P3.T3, P4.T5, P5.T4 | `verification/integrated.md` | covered |
| FR-8 | P4.T1 | `controller-reach.ts`, `controller-reach.test.ts`, `controller-profile.test.ts` | covered |
| FR-9 | P4.T2 | `resolve.ts`, `battle-balance-report.ts`, pinned tests | covered |
| FR-10 | P4.T3 | `ghost.ts`, `ghost.test.ts`, `integrated.md` | covered |
| FR-11 | P5.T1/T2 | `starters.ts`, `discovery.ts`, `phase-5.md` | covered |
| FR-12 | P5.T3 | `balance.out`, `integrated.md` | covered |
| NFR-1 | P3.T3.2/P4.T5.2/P5.T4.2 | diff scope proof | covered |
| NFR-2 | P4.T2.2/P5.T2.1 | diff scope proof, `phase-5.md` deviations | covered |
| NFR-3 | P2.T3, P4.T5, P5.T4 | `gate.out`, `verify.out`, `trace.out` | covered |
| NFR-4 | P5.T2.1/P5.T4 | diff scope proof, `integrated.md` | covered |
| NFR-5 | P2.T3, P4.T5 | `module-size.test.ts`, green verify | covered |
| NFR-6 | P3.T3, P4.T5, P5.T4 | all five configured commands | covered |
| AC-1 | P1.T3 | `phase-1.md` | covered |
| AC-2 | P2.T1 | `controller-reach.test.ts`, `phase-2.md` | covered |
| AC-3 | P2.T1.2 | controller tests | covered |
| AC-4 | P4.T3 | `ghost.ts`, `ghost.test.ts`, `integrated.md` | covered |
| AC-5 | P4.T4, P5.T3 | `balance.out` | covered |
| AC-6 | P4.T4, P5.T3 | `balance.out`, `integrated.md` | covered |
| AC-7 | P3/P4 blocked records | `phase-3.md`, `phase-4.md` | covered |
| AC-8 | P3.T3, P4.T5, P5.T4 | `integrated.md` | covered |
| AC-9 | P4.T5, P5.T4 | five commands, module-size test | covered |
| AC-10 | P3.T3.2 | diff scope proof | covered |
| AC-11 | P5.T3 | `balance.out` | covered |
| AC-12 | P5.T3 | `balance.out`, `integrated.md` | covered |
| AC-13 | P4.T3.2, P5.T4 | `ghost.test.ts`, `integrated.md`, `trace.out` | covered |
| AC-14 | P5.T2/T3/T4 | `starters.ts`, `discovery.ts`, `balance.out` | covered |
| AC-15 | P5.T3.2 | `integrated.md` (not triggered) | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- <none>

## Overrides

- <none>

## Plan compliance

All five phases and their tasks are accounted for. Phase 1, 2 and 5 are
verified with checkpoints `474cfe21`, `7fb66b04` and `7c7af8c6`. Phase 3 and 4
are recorded as blocked-by-design stages whose code was reverted before Phase 5;
their evidence and owner decisions are preserved. P3.T2 (replay guard) was not
applicable in Phase 3 and was completed in Phase 4 after the owner unblocked the
single cap fence. All tasks are checked except P3.T2, which remains explicitly
unchecked because no policy shipped in Phase 3. No task was marked complete
without verification.

## Out of scope

The hardware device-lab pass, D-3/D-4 fixture stratification debt, and any
roster content beyond the two approved species bounds belong to other work.
No third species, move, kit, element, save schema, protocol, CORS, deploy,
client or server change was introduced.

## Debt

- <none>. `review.issues.enabled` is false and strict mode requires no deferrals.

## Doc sync

`updated` — `product.md` records D-2 closed 2026-11-20, and `tech-stack.md` has a
dated note for the v4 replay guard, 45 s cap, and the two re-tuned species. Both
were applied before this review with owner approval; no further after-review doc
change is required.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS | 0 | 0 | 0 | 0 | 0 |
