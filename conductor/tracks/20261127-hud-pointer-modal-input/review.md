# Review: Fix HUD pointer interception and isolate modal input across desktop and mobile

- **Track:** `20261127-hud-pointer-modal-input`
- **Type:** `bug`
- **Branch:** `fix/20261127-hud-pointer-modal-input`
- **Range:** `4f2e5de1b7d92e96ec2782b2541a608a1d2e9c68..ca272351`
- **Date:** `2026-11-27T10:12:09.5323197+11:00`
- **Verdict:** `PASS WITH FINDINGS`

## Summary

The pointer-ownership repairs, background isolation, dialog semantics, and three-viewport interaction proof are implemented and green. Round-1 High F1 is fixed: spar now supplies the visible SPAR button as an explicit modal return-focus target, so board ghost bouts no longer capture a hidden board Fight button. Round-2 delta review found one Low test-fidelity issue: the nested regression closes the board with `returnFocus:false`, while production uses the default focus-restoring close.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts` | pass | 23 pass / 0 fail / 64 expect(), exit 0 |
| test | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts` | pass | 63 pass / 0 fail / 143 expect(), exit 0 |
| test | same Phase 2 command after R1 | pass | 68 pass / 0 fail / 154 expect(), exit 0 |
| typecheck | `bun run check` | pass | voxel 214, sim 253, server 185, client 561 files clean |
| test | `bun test --check --parallel --timeout 120000` | pass | 4603 pass / 1 skip / 0 fail; 676394 expect(); 446 files |
| lint | `biome check` | pass | Checked 1062 files; no fixes |
| determinism | `bun run gate:determinism` | pass | Every archetype stage byte-identical; 5 prop digests match |
| module size | `bun test --check --parallel=4 --timeout 120000 apps/client/src/module-size.test.ts` | pass | 5 pass / 0 fail / 15 expect() |
| build | `bun run build` | pass | Vite build exit 0; only pre-existing chunk advisory |
| visual | `playwright-cli` at 1440×900, 393×852, 852×393 | pass | Normal pointer/keyboard proof; clean consoles; captures under `.conductor/evidence/20261127-hud-pointer-modal-input/` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P2.T1 | Phase 2/3 normal-click hit tests at all three viewports | covered |
| FR-2 | P2.T1 | Phase 3 Rename click/focus/select/Save/Cancel/Escape proof | covered |
| FR-3 | P1.T2, P2.T2 | Dialog snapshot and 18/18 inert/aria-hidden background proof | covered |
| FR-4 | P1.T1, P1.T2, P2.T2, R1.T2 | Explicit SPAR return target plus normal/repeated/mid-fight focus proof | covered |
| FR-5 | P2.T1 | Minimal CSS diff and three-viewport no-page-overflow evidence | covered |
| FR-6 | P1.T1, P2.T2, P3.T1, P3.T2, R1.T1 | Base-red/fixed-green tests and real-browser evidence | covered |
| NFR-1 | P2.T1, P2.T2, P3.T2 | Scope audit: client UI/tests + Conductor docs only | covered |
| NFR-2 | P2.T1, P3.T1 | Hit ownership, stacking, dialog layering, and minimal shrink only | covered |
| NFR-3 | P1.T2, P2.T2, P3.T1, R1.T2 | Contained visible focus; explicit target is visible after teardown | covered |
| NFR-4 | P3.T2, R1.T2 | Full gate and module-size test | covered |
| NFR-5 | P1.T1, P1.T2, P2.T2, P3.T1, R1.T2 | Reference-counted isolation, repeated cycles, no new modal state/listeners | covered |
| AC-1 | P2.T1, P3.T1 | Desktop normal-click Rename proof | covered |
| AC-2 | P2.T1, P3.T1 | Portrait and landscape normal-click SPAR proof | covered |
| AC-3 | P1.T2, P2.T2, P3.T1 | Dialog semantics plus 18/18 background isolation | covered |
| AC-4 | P1.T1, P1.T2, P2.T2, P3.T1, R1.T1, R1.T2 | Normal/repeated/mid-fight closes and explicit ghost-spar return target pass; nested test fidelity F2 remains | covered with Low finding |
| AC-5 | P2.T1, P3.T1 | Three-viewport captures, geometry, and clean consoles | covered |
| AC-6 | P1.T1, P2.T2, P3.T2, R1.T1 | Exact base-red and fixed-green commands recorded | covered |
| AC-7 | P3.T2, R1.T2 | Implementation gates/caps/scope pass; terminal archive/review/PR proof is completion-owned | partial by design |

## Findings

### Critical

- <none>

### High

- **F1 — Board ghost spar restores focus to a hidden board button — RESOLVED**
  - **Original file:** `apps/client/src/spar.ts:208-212`
  - **Original defect:** `presentSetup` opened spar without an explicit return-focus target, capturing the active board Fight button. The board then closed, leaving that button connected but hidden.
  - **Resolution:** `OpenModalOptions.returnFocusTo?: HTMLElement | null` now supports an explicit target; `presentSetup` passes `sparButton` for every entry path. Omitted options preserve prior capture behavior and explicit `null` preserves the body fallback.
  - **Checkpoint:** `59551de5`
  - **Evidence:** five focused modal tests, 68/0 phase tests, clean scoped Biome, three-viewport normal-click Escape/focus-return proof, and full gate exit 0.

### Medium

- <none>

### Low

- **F2 — Nested regression does not use production board-close options**
  - **File:** `apps/client/src/ui/modal.test.ts:300-302`
  - **What:** the nested regression calls `closeModal(boardRoot, { returnFocus: false })`, while `board/panel.ts` calls `closeModal(root)` with default focus restoration.
  - **Why:** the test does not exercise the board opener focus attempt while spar has isolated the HUD, and the evidence claim that the options match production is inaccurate.
  - **Fix:** use `closeModal(of(boardRoot))`, model the inert board opener focus attempt as a no-op, and retain the assertion that spar close focuses `sparButton` and never focuses the hidden Fight button.
  - **Requirement:** `AC-4`
  - **Status:** open; strict mode requires resolution before PR.

## Overrides

- <none>

## Plan compliance

All three original phases and review-fix Phase R1 are recorded verified. R1.T2 is complete and F1 is fixed. R1.T1's nested regression must be corrected to mirror production board-close options before strict acceptance.

- Phase 1 checkpoint: `a878a967` — shared modal background isolation.
- Phase 2 checkpoint: `540d26b8` — pointer ownership and spar modal adapter.
- Phase 3 checkpoint: `9775267f` — visual evidence and integrated gate.
- Review-fix R1 checkpoint: `59551de5` — explicit SPAR return-focus target; F2 test-fidelity follow-up remains.

## Out of scope

- Existing arena readability and fighter scale (RM-14).
- Spar setup redesign, explicit Start CTA, and long-form restructuring (RM-15).
- Mobile ranch hierarchy and action-state feedback (RM-16).
- Copy consistency and Hall of Fame wording (RM-18).
- Pre-existing portrait/landscape spar-panel internal scrolling and narrow Rename input text scrolling; neither is a page-overflow or pointer-ownership regression from this diff.

## Debt

- <none>

## Doc sync

`pending` — the dated HUD/modal architecture note is present. Final review findings and the explicit return-focus contract will be synchronized after F2 is resolved.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 0 | 0 | 0 |
| 2 (delta) | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 1 |
