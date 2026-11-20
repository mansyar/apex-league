# Review: Live PvP Production Acceptance

- **Track:** `20261120-live-pvp-production-acceptance`
- **Type:** bug
- **Branch:** `fix/20261120-live-pvp-production-acceptance`
- **Range:** `e5459deb4189166756e057262a6439c08aa92ffd..f99b458643d5da5992ae840d0935f909fd19dca3`
- **Date:** 2026-11-20T12:11:33.2125362+11:00
- **Verdict:** `PASS`

## Summary

The 8-file code diff (panel/invite reset fix, approved `@apex/sim` container-runtime
deviation, and failing-first deploy-contract test) is correct, scoped, and fully evidenced
at confirmed HEAD `f99b4586`. All functional requirements and acceptance criteria are
implemented and verified. The initial Low documentation-truth finding F1 (integrated record
said "two throwaway trainer identities" while six throwaway IDs were recorded across the
blocked attempt, retry and second-bout proof) was fixed narrowly in Phase R1 and confirmed
by a final delta review with no new findings. No Critical, High, Medium or Low findings
remain; strict mode is satisfied with nothing deferred. All IDs are throwaway and no
passphrase or real player data appears in tracked artifacts.

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
| head | `git rev-parse HEAD` | pass | `f99b458643d5da5992ae840d0935f909fd19dca3` |

All commands were run by the primary on HEAD `6c14242b` for the initial review and re-run on
the final R1 tree `f99b4586` (all exit 0); the read-only reviewer confirmed the diff and
evidence in both rounds. The final delta reviewer's `git rev-parse HEAD` `needs` item was
non-blocking and is resolved here with the primary's exact HEAD output.

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
| NFR-2 | P1.T1.2, P2.T3, R1.T1 | `integrated.md:135,162`, `phase-R1.md`, `production-proof.md`, `phase-2.md` | covered |
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
| AC-7 | P1.T1.2, P2.T3, R1.T1/T2 | `integrated.md:135,162`, `phase-R1.md`, tracked-artifact grep | covered |
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
  - **Resolved (Phase R1, checkpoint `7d6b9bea`):** both `integrated.md` locations now state
    "two concurrent throwaway identities per proof; six total across the blocked attempt,
    retry and second-bout proof" and record that as the accepted interpretation of NFR-2.
    Final delta review: `PASS`, no new findings.

## Overrides

- <none>

## Plan compliance

All five phases are marked `verified` with checkpoints (Phase 1R `f9c116bb`, Phase 1
`0dd03a7d`, Phase 2 `32f88e59`, Phase 3 `8fc63e4f`, Review Fixes R1 `7d6b9bea`) and evidence
files. Metadata reports 5/5 phases, 16/16 tasks, `doc_sync: synced`. Every `[x]` task is
implemented and verified;
no task was dropped. The final diff stays within the union of phase `Touches`, except the
recorded, owner-approved container-runtime deviation. The one plan-level substitution
(P2.T2.1 said call `reset()` from `finish()`; the phase brief superseded this to
`open()` + `leave()` so verdict text stays visible) is documented with rationale in
`phase-2.md` and accepted.

## Out of scope

- No out-of-scope code findings. The post-merge production spot-check of the fixed Pages
  bundle remains a recorded follow-up outside this track.

## Debt

- None. Strict mode is enabled; F1 was fixed in Phase R1 rather than deferred, and the final
  delta review found no new issue.
- `review.issues.enabled` is false, so no GitHub issue was filed.

## Doc sync

`synced`. The approved `product.md` landing note and `tech-stack.md` server-runtime entry
were synchronized before review. The R1 evidence wording fix required no product, guideline
or tech-stack change; `verification/integrated.md` and `verification/phase-R1.md` carry the
corrected count and the final five-command results.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | F1 scheduled for Phase R1 |
| 2 | PASS | 0 | 0 | 0 | 0 | F1 fixed in Phase R1 (`7d6b9bea`); final delta review clean |
