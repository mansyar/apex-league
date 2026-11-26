# Review: Fix HUD pointer interception and isolate modal input across desktop and mobile

- **Track:** `20261127-hud-pointer-modal-input`
- **Type:** `bug`
- **Branch:** `fix/20261127-hud-pointer-modal-input`
- **Range:** `4f2e5de1b7d92e96ec2782b2541a608a1d2e9c68..e7eecb6736981f32f2db197281a868d9bbe42db3`
- **Date:** `2026-11-27T09:47:44.2269946+11:00`
- **Verdict:** `BLOCK`

## Summary

The pointer-ownership repairs, background isolation, dialog semantics, and three-viewport interaction proof are implemented and green. One High-severity focus-return defect remains on the board → ghost spar path: `openModal` captures the board Fight button as opener, then the board closes that button’s modal, so closing the ghost spar attempts to focus a connected but hidden control instead of returning focus to the visible SPAR button.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts` | pass | 23 pass / 0 fail / 64 expect(), exit 0 |
| test | `bun test --check --parallel=4 --timeout 120000 apps/client/src/ui/modal.test.ts apps/client/src/ui/focus.test.ts apps/client/src/spar/panel.test.ts apps/client/src/hud/plates.test.ts` | pass | 63 pass / 0 fail / 143 expect(), exit 0 |
| typecheck | `bun run check` | pass | voxel 214, sim 253, server 185, client 561 files clean |
| test | `bun test --check --parallel --timeout 120000` | pass | 4598 pass / 1 skip / 0 fail; 676383 expect(); 446 files |
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
| FR-4 | P1.T1, P1.T2, P2.T2 | Normal/repeated/mid-fight focus proof; **board ghost return-focus gap F1** | partial |
| FR-5 | P2.T1 | Minimal CSS diff and three-viewport no-page-overflow evidence | covered |
| FR-6 | P1.T1, P2.T2, P3.T1, P3.T2 | Base-red/fixed-green tests and real-browser evidence | covered |
| NFR-1 | P2.T1, P2.T2, P3.T2 | Scope audit: client UI/tests + Conductor docs only | covered |
| NFR-2 | P2.T1, P3.T1 | Hit ownership, stacking, dialog layering, and minimal shrink only | covered |
| NFR-3 | P1.T2, P2.T2, P3.T1 | Contained visible focus; isolated background absent from accessibility tree | covered |
| NFR-4 | P3.T2 | Full gate and module-size test | covered |
| NFR-5 | P1.T1, P1.T2, P2.T2, P3.T1 | Reference-counted isolation and repeated-cycle proof | covered |
| AC-1 | P2.T1, P3.T1 | Desktop normal-click Rename proof | covered |
| AC-2 | P2.T1, P3.T1 | Portrait and landscape normal-click SPAR proof | covered |
| AC-3 | P1.T2, P2.T2, P3.T1 | Dialog semantics plus 18/18 background isolation | covered |
| AC-4 | P1.T1, P1.T2, P2.T2, P3.T1 | Normal/repeated/mid-fight closes pass; **board ghost close fails F1** | partial |
| AC-5 | P2.T1, P3.T1 | Three-viewport captures, geometry, and clean consoles | covered |
| AC-6 | P1.T1, P2.T2, P3.T2 | Exact base-red and fixed-green commands recorded | covered |
| AC-7 | P3.T2 | Implementation gates/caps/scope pass; terminal archive/review/PR proof is completion-owned | partial by design |

## Findings

### Critical

- <none>

### High

- **F1 — Board ghost spar restores focus to a hidden board button**
  - **File:** `apps/client/src/spar.ts:208-212`
  - **What:** `presentSetup` opens the spar modal without an explicit return-focus target, so `openModal` captures the active board Fight button. `board/panel.ts` invokes `spar.fightGhost(entry)` and then immediately calls `close()` on the board modal.
  - **Why:** The captured Fight button remains connected but is inside the now-hidden board modal. On spar close, `returnFocusTo` checks only `isConnected`; focusing the hidden button fails, leaving focus unrestored. This regresses the former unconditional `sparButton.focus()` behavior and violates FR-4/AC-4 for board ghost bouts.
  - **Fix:** Add an optional explicit return-focus target to `OpenModalOptions`, prefer it over the captured active element, and pass `sparButton` from spar setup so every entry path restores to the stable visible control after isolation restoration and teardown.
  - **Requirement:** `FR-4`, `AC-4`
  - **Test gap:** Add a board Fight → ghost spar → close integration test asserting `.spar-button` receives focus, plus a shared-modal test where the connected opener becomes hidden before close.

### Medium

- <none>

### Low

- <none>

## Overrides

- <none>

## Plan compliance

All three planned phases are recorded verified with checkpoints and evidence, and all original tasks are checked. P1.T1/P1.T2 and P2.T1 are satisfied. P2.T2’s focus-return contract is partial because F1 leaves the board ghost entry path incorrect. P3.T1/P3.T2 evidence and gates pass, but the local no-cloud build did not exercise the board path.

- Phase 1 checkpoint: `a878a967` — shared modal background isolation.
- Phase 2 checkpoint: `540d26b8` — pointer ownership and spar modal adapter, subject to F1.
- Phase 3 checkpoint: `9775267f` — visual evidence and integrated gate.

## Out of scope

- Existing arena readability and fighter scale (RM-14).
- Spar setup redesign, explicit Start CTA, and long-form restructuring (RM-15).
- Mobile ranch hierarchy and action-state feedback (RM-16).
- Copy consistency and Hall of Fame wording (RM-18).
- Pre-existing portrait/landscape spar-panel internal scrolling and narrow Rename input text scrolling; neither is a page-overflow or pointer-ownership regression from this diff.

## Debt

- <none>

## Doc sync

`pending` — the dated HUD/modal architecture note is present. Final review findings and any fix-specific documentation will be synchronized after the fix round.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 0 | 0 | 0 |
