# Review: Fix HUD pointer interception and isolate modal input across desktop and mobile

- **Track:** `20261127-hud-pointer-modal-input`
- **Type:** `bug`
- **Branch:** `fix/20261127-hud-pointer-modal-input`
- **Range:** `4f2e5de1b7d92e96ec2782b2541a608a1d2e9c68..8ea17edc`
- **Date:** `2026-11-27T10:20:43.3126279+11:00`
- **Verdict:** `PASS`

## Summary

The pointer-ownership repairs, shared modal background isolation, spar dialog semantics, and three-viewport interaction proof are implemented and green. Round-1 High F1 is resolved by an explicit visible SPAR return-focus target. Round-2 Low F2 is resolved by making the nested regression mirror production board-close options and model the inert opener focus attempt. Final delta review found no remaining findings.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts` | pass | 23 pass / 0 fail / 64 expect(), exit 0 |
| test | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts` | pass | 63 pass / 0 fail / 143 expect(), exit 0 |
| test | same Phase 2 command after R1 | pass | 68 pass / 0 fail / 154 expect(), exit 0 |
| test | same Phase 2 command after R2 | pass | 68 pass / 0 fail / 155 expect(), exit 0 |
| typecheck | `bun run check` | pass | voxel 214, sim 253, server 185, client 561 files clean |
| test | `bun test --check --parallel --timeout 120000` | pass | 4603 pass / 1 skip / 0 fail; 676395 expect(); 446 files |
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
| FR-4 | P1.T1, P1.T2, P2.T2, R1.T2, R2.T1 | Explicit SPAR return target, production-faithful nested regression, and normal/repeated/mid-fight focus proof | covered |
| FR-5 | P2.T1 | Minimal CSS diff and three-viewport no-page-overflow evidence | covered |
| FR-6 | P1.T1, P2.T2, P3.T1, P3.T2, R1.T1, R2.T1 | Base-red/fixed-green tests and real-browser evidence | covered |
| NFR-1 | P2.T1, P2.T2, P3.T2 | Scope audit: client UI/tests + Conductor docs only | covered |
| NFR-2 | P2.T1, P3.T1 | Hit ownership, stacking, dialog layering, and minimal shrink only | covered |
| NFR-3 | P1.T2, P2.T2, P3.T1, R1.T2, R2.T1 | Contained visible focus; explicit target is visible after teardown; inert opener attempt modeled | covered |
| NFR-4 | P3.T2, R1.T2, R2.T2 | Full gate and module-size test | covered |
| NFR-5 | P1.T1, P1.T2, P2.T2, P3.T1, R1.T2 | Reference-counted isolation, repeated cycles, no new modal state/listeners | covered |
| AC-1 | P2.T1, P3.T1 | Desktop normal-click Rename proof | covered |
| AC-2 | P2.T1, P3.T1 | Portrait and landscape normal-click SPAR proof | covered |
| AC-3 | P1.T2, P2.T2, P3.T1 | Dialog semantics plus 18/18 background isolation | covered |
| AC-4 | P1.T1, P1.T2, P2.T2, P3.T1, R1.T1, R1.T2, R2.T1 | Normal/repeated/mid-fight closes, explicit ghost-spar return target, and production-faithful nested close pass | covered |
| AC-5 | P2.T1, P3.T1 | Three-viewport captures, geometry, and clean consoles | covered |
| AC-6 | P1.T1, P2.T2, P3.T2, R1.T1, R2.T1 | Exact base-red and fixed-green commands recorded | covered |
| AC-7 | P3.T2, R1.T2, R2.T2 | Implementation gates/caps/scope pass; terminal archive/review/PR proof is completion-owned | partial by design |

## Findings

### Critical

- <none>

### High

- **F1 — Board ghost spar restores focus to a hidden board button — RESOLVED**
  - **Original file:** `apps/client/src/spar.ts:208-212`
  - **Original defect:** `presentSetup` opened spar without an explicit return-focus target, capturing the active board Fight button. The board then closed, leaving that button connected but hidden.
  - **Resolution:** `OpenModalOptions.returnFocusTo?: HTMLElement | null` supports an explicit target; `presentSetup` passes `sparButton` for every entry path. Omitted options preserve prior capture behavior and explicit `null` preserves the body fallback.
  - **Checkpoint:** `59551de5`
  - **Evidence:** five focused modal tests, 68/0 phase tests, clean scoped Biome, three-viewport normal-click Escape/focus-return proof, and full gate exit 0.

### Medium

- <none>

### Low

- **F2 — Nested regression did not use production board-close options — RESOLVED**
  - **File:** `apps/client/src/ui/modal.test.ts:275-316`
  - **Original defect:** the nested regression called `closeModal(boardRoot, { returnFocus: false })`, while `board/panel.ts` calls `closeModal(root)` with default focus restoration.
  - **Resolution:** the test now uses the production-default close, models the inert HUD opener's single focus attempt as a counter-backed no-op, keeps the hidden Fight button unfocused, and still proves spar close focuses `sparButton`.
  - **Checkpoint:** `5484e811`
  - **Evidence:** genuine red `67 pass / 1 fail / 152 expect()` (`Expected: 1`, `Received: 0`) followed by green `68 pass / 0 fail / 155 expect()`; scoped Biome and full gate exit 0; final delta verdict `PASS`.

## Overrides

- <none>

## Plan compliance

All three original phases and both review-fix phases are recorded verified. No task is pending and no finding remains open.

- Phase 1 checkpoint: `a878a967` — shared modal background isolation.
- Phase 2 checkpoint: `540d26b8` — pointer ownership and spar modal adapter.
- Phase 3 checkpoint: `9775267f` — visual evidence and integrated gate.
- Review-fix R1 checkpoint: `59551de5` — explicit SPAR return-focus target.
- Review-fix R2 checkpoint: `5484e811` — production-faithful nested focus regression.

## Out of scope

- Existing arena readability and fighter scale (RM-14).
- Spar setup redesign, explicit Start CTA, and long-form restructuring (RM-15).
- Mobile ranch hierarchy and action-state feedback (RM-16).
- Copy consistency and Hall of Fame wording (RM-18).
- Pre-existing portrait/landscape spar-panel internal scrolling and narrow Rename input text scrolling; neither is a page-overflow or pointer-ownership regression from this diff.

## Debt

- <none>

## Doc sync

`updated` — the dated HUD/modal architecture note is present in `conductor/tech-stack.md`; final review records the explicit return-focus contract and production-faithful nested regression. Product, product-guidelines, and workflow documents require no change.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 0 | 0 | 0 |
| 2 (delta) | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 1 |
| 3 (final delta) | PASS | 0 | 0 | 0 | 0 | 1 |
