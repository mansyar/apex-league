# Review: Live PvP Production Acceptance

- **Track:** `20261120-live-pvp-production-acceptance`
- **Type:** bug
- **Branch:** `fix/20261120-live-pvp-production-acceptance`
- **Range:** `e5459deb4189166756e057262a6439c08aa92ffd..6c14242b`
- **Date:** 2026-11-20T11:55:04.9118998+11:00
- **Verdict:** `PASS WITH FINDINGS`

## Summary

The 8-file code diff (panel/invite reset fix, approved `@apex/sim` container-runtime
deviation, and failing-first deploy-contract test) is correct, scoped, and fully evidenced
at confirmed HEAD `6c14242b`. All functional requirements and acceptance criteria are
implemented and verified. The only finding is a Low documentation-truth discrepancy: the
integrated record says "two throwaway trainer identities" while the phase evidence records
six distinct throwaway IDs across the blocked attempt, retry, and second-bout proof. There
is no functional or security impact; all IDs are throwaway and no passphrase or real player
data appears in tracked artifacts. Strict mode is enabled, so F1 is fixed in Phase R1 before
PR rather than deferred.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun test --timeout 120000` | pass | 4448 pass / 1 skip / 0 fail, 665709 `expect()` calls, 4449 tests / 436 files; expected non-gating `smoke: RESULT fail ... not an http(s) URL: file:///tmp/x` |
| coverage | none configured | n/a | workflow `coverage: none` |
| lint | `bun x biome check` | pass | 1030 files, no fixes applied |
| typecheck | `bun run check` | pass | server 185 files, client 549 files, no errors |
| build | `bun run build` | pass | Vite 438 modules; pre-existing >500 kB chunk warning |
| verify | `bun run verify` | pass | hash `0xff6f3d62`, determinism gate included |
| balance | `bun run balance` | pass | 1680 fights, capShare 30.8%, 34 gates ok |
| determinism | `bun run gate:determinism` | pass | 21 species × 3 stages + 5 props byte-identical |
| fuzz | `bun run test:fuzz` | pass | 139 pass / 0 fail, 129015 `expect()` calls |
| head | `git rev-parse HEAD` | pass | `6c14242b12735bdc7783430d883b1d2916502ed5` |

All commands were run by the primary on HEAD `6c14242b`; the read-only reviewer confirmed
the diff and evidence and resolved its one `needs` item with the primary's HEAD output.

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T2 | `verification/production-proof.md` rooms `QXGCY3`, `3FP73J`; `integrated.md` AC-1 | covered |
| FR-2 | P1.T3 | `production-proof.md` room `XH8D8K`; `integrated.md` AC-2 | covered |
| FR-3 | P2.T2 (`panel.ts::reset`, `invite.ts::leave`) | `apps/client/src/live/panel.test.ts`; `phase-2.md` rooms `75EWUX` → `RL3ZH4` | covered |
| FR-4 | P3.T1 | `verification/integrated.md` | covered |
| FR-5 | P3.T2 (`product.md:339`), P3.T3 (supersession note) | `product.md:339`, `phase-3.md`, archived ADR untouched | covered |
| FR-6 | P1R.T1/T2 | `scripts/deploy/server-image.test.ts` 10p/3f → 13p/0f; `phase-1R.md` boot + negative control | covered |
| NFR-1 | P1R, P2 scope confinement | `integrated.md` scope proof; diff inspection | covered |
| NFR-2 | P1.T1.2, P2.T3 | `production-proof.md`, `phase-2.md`, `phase-3.md` scope guard | partial (F1: count wording only; no PII/passphrase leak) |
| NFR-3 | P1.T2, P2.T3 | desktop/phone screenshots, console 0/0, module-size test | covered |
| NFR-4 | All phases | `git diff --name-status e5459deb..6c14242b` | covered |
| NFR-5 | P1.T4 | `production-proof.md` 404/503 blocked records | covered |
| NFR-6 | P1R.T4, P3.T1 | command table above, hash `0xff6f3d62` | covered |
| AC-1 | P1.T2 | `production-proof.md`, `integrated.md` AC-1 | covered |
| AC-2 | P1.T3 | `production-proof.md`, `integrated.md` AC-2 | covered |
| AC-3 | P2.T1/T2 | `panel.test.ts` 0p/2f → 2p/0f; `phase-2.md` | covered |
| AC-4 | P3.T1 | `integrated.md` | covered |
| AC-5 | P3.T2/T3 | `product.md:339`, `phase-3.md`, archived ADR untouched | covered |
| AC-6 | P1R.T4, P2/P3 verification | command table + scope proof | covered |
| AC-7 | P1.T1.2, P2.T3 | `production-proof.md`, `phase-2.md`, tracked-artifact grep | partial (F1: count wording only; no credentials/passphrases/PII) |
| AC-8 | P1.T4 | `production-proof.md` blocked records, no config workaround | covered |
| AC-9 | P1R.T3 | `server-image.test.ts`, `phase-1R.md` | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- **F1 — Integrated record overstates throwaway trainer count**
  - **File:** `conductor/tracks/20261120-live-pvp-production-acceptance/verification/integrated.md:135,162`
  - **What:** AC-7 and the limitations claim "two throwaway ids only" / "Only two throwaway trainer identities were used", but the phase evidence records six distinct throwaway IDs: `production-proof.md:39` (two from the blocked attempt), `production-proof.md:137-138` (two from the final retry), and `phase-2.md:56` (two from the second-bout proof).
  - **Why:** NFR-2/AC-7 specify "only two throwaway trainer identities"; the integrated record is inaccurate. All six IDs are throwaway, and no real PII, credentials or passphrases appear in tracked artifacts, so this is a documentation-truth nit with no functional or security impact.
  - **Fix:** Reconcile AC-7 and the limitation to state "two concurrent throwaway identities per proof; six total across the blocked attempt, retry and second-bout proof", and record that as the accepted interpretation of NFR-2. No code change required.
  - **Requirement:** NFR-2 / AC-7
  - **Test gap:** none

## Overrides

- <none>

## Plan compliance

All four phases are marked `verified` with checkpoints (Phase 1R `f9c116bb`, Phase 1
`0dd03a7d`, Phase 2 `32f88e59`, Phase 3 `8fc63e4f`) and evidence files. Metadata reports
4/4 phases, 14/14 tasks, `doc_sync: synced`. Every `[x]` task is implemented and verified;
no task was dropped. The final diff stays within the union of phase `Touches`, except the
recorded, owner-approved container-runtime deviation. The one plan-level substitution
(P2.T2.1 said call `reset()` from `finish()`; the phase brief superseded this to
`open()` + `leave()` so verdict text stays visible) is documented with rationale in
`phase-2.md` and accepted.

## Out of scope

- No out-of-scope code findings. The post-merge production spot-check of the fixed Pages
  bundle remains a recorded follow-up outside this track.

## Debt

- None. Strict mode is enabled; F1 is fixed in Phase R1 rather than deferred.
- `review.issues.enabled` is false, so no GitHub issue is filed.

## Doc sync

`pending` at review time. The approved `product.md` landing note and `tech-stack.md`
server-runtime entry were synchronized before review. Post-review synchronization will
update this line and, if needed, the verification record for the F1 wording fix.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | F1 scheduled for Phase R1 |
