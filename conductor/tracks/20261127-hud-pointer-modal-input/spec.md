# Fix HUD pointer interception and isolate modal input across desktop and mobile — Specification

> **Stability:** Once approved, requirement IDs are permanent. Do not renumber or reuse IDs. Removed requirements must be marked `Withdrawn`, not deleted.

## Overview

Client-only bug fix for two reproduced input failures—desktop Rename and mobile SPAR—and the spar overlay’s missing modal isolation. Preserve the current visual design, allowing only minimal layout changes required for reliable hit targets.

## Problem / Motivation

- The visible **Rename partner** pencil can be clicked without opening the inline editor; hit-testing its center resolves to the Three.js canvas.
- On mobile, the visible **SPAR** button is intercepted by the transparent `.hud-motion` wrapper.
- The spar overlay bypasses the shared modal helper, leaving background HUD controls in the accessibility tree and lacking standard Escape/scrim behavior.

These are reliability defects in primary interactions, not cosmetic issues.

## Goals & Success Metrics

- Rename and SPAR work through normal pointer input on desktop and both phone orientations.
- Spar is a semantically modal, keyboard-safe surface for its entire lifetime.
- Closing spar restores focus to its opener without listener or state leaks.
- No horizontal overflow, control occlusion, or console errors at the verified viewports.

## Scope

### In Scope

- HUD pointer-event ownership and hit-target reliability.
- Rename click/focus behavior.
- Spar dialog semantics, background inertness, focus trap, Escape/scrim dismissal, and focus restoration.
- Minimal CSS/DOM restructuring needed for the above.
- Unit regression tests and real-browser evidence.

### Out of Scope

- Sim, save schema/state, balance, audio, voxel assets, dependencies, or generated files.
- Spar setup redesign or explicit Start-button work (RM-15).
- Arena camera/lighting/readability (RM-14).
- Mobile ranch hierarchy redesign (RM-16).
- Copy corrections (RM-18).
- Auditing or redesigning unrelated kit-modal surfaces.

## Bug Details

### Reproduction A — desktop Rename

1. Load a ranch save with an active creature.
2. Expand the creature plate if necessary.
3. Click the visible **Rename partner** pencil.

**Actual:** No inline editor opens. `document.elementFromPoint()` at the button center returns the Three.js canvas.  
**Expected:** The inline editor opens, receives focus, and selects the current name.

### Reproduction B — mobile SPAR

1. Load the ranch at `393×852`.
2. Click the visible **SPAR** button.

**Actual:** `.hud-motion` intercepts the pointer event; spar setup does not open.  
**Expected:** A normal pointer click opens spar setup.

### Reproduction C — spar modal isolation

1. Open spar setup.
2. Inspect the accessibility tree and keyboard focus order.
3. Attempt Escape and scrim-click dismissal.

**Actual:** Background ranch controls remain exposed; standard modal dismissal is absent.  
**Expected:** Only the spar dialog is interactive and exposed until it closes.

### Root-cause Hypotheses

- Transparent HUD grid/flex wrappers re-enable pointer events across their full box instead of only visible controls.
- Desktop plate stacking, clipping, or pointer-event inheritance allows the Rename hit target to fall through to the canvas.
- Spar uses a custom inline-display overlay rather than the shared modal/focus lifecycle.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Visible Rename and SPAR controls receive normal pointer events at all supported viewports; transparent wrappers must not intercept outside visible control bounds. | High |
| FR-2 | A normal Rename click opens the inline editor, focuses/selects the input, and preserves existing Save/Cancel/Escape behavior. | High |
| FR-3 | Spar opens as a labelled modal dialog with `aria-modal="true"`; background HUD is inert and hidden from assistive technology for the entire overlay lifetime. | High |
| FR-4 | Spar focus moves inside on open, Tab/Shift+Tab stay trapped, Escape/scrim close it, and close returns focus to the SPAR opener without leaks. | High |
| FR-5 | Any minimal layout changes keep controls visible and tappable without score-bug/safe-area overlap or horizontal overflow. | Medium |
| FR-6 | Unit tests cover the isolation/focus contract, and Playwright CLI evidence proves real hit-testing and modal behavior on desktop, portrait, and landscape. | High |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Presentation-only: no sim/state/save/balance/audio/voxel/dependency/generated-file changes and no copy changes. |
| NFR-2 | Preserve existing styling, spacing, and animation except where minimal structural change is required for reliable input. |
| NFR-3 | Keyboard and assistive-technology users receive visible focus, a contained focus order, and no exposed background controls. |
| NFR-4 | Client 12 KB module caps and the full configured verification stack remain green. |
| NFR-5 | No per-frame work, retained global modal state, or event-listener leaks after repeated open/close cycles. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | At desktop `1440×900`, a normal Playwright click on Rename opens the editor; its center hit-tests the button/descendant and the input receives focus. | FR-1, FR-2 |
| AC-2 | At `393×852` and `852×393`, a normal Playwright click on SPAR opens setup without pointer interception. | FR-1 |
| AC-3 | While spar is open, dialog semantics are present and background HUD controls are inert and absent from the accessibility tree. | FR-3 |
| AC-4 | Focus enters spar, Tab/Shift+Tab remain trapped, Escape/scrim close it, and focus returns to SPAR; repeated and mid-fight closes pass. | FR-4 |
| AC-5 | Desktop, portrait, and landscape captures show no overflow or control occlusion; consoles are clean. | FR-5, NFR-2 |
| AC-6 | New regression tests fail against the base behavior and pass after the fix, with exact commands recorded. | FR-6 |
| AC-7 | Full configured gates pass, module caps hold, and the diff contains only approved client UI/test/evidence files. | NFR-1, NFR-4 |

## Edge Cases

- Keyboard-only open, navigate, and close.
- Reduced-motion enabled.
- Repeated spar open/close cycles.
- Closing during setup and mid-fight.
- Phone landscape and safe-area insets.

## Dependencies

### Tracks

None.

### External

None.

## Open Questions & Assumptions

- Existing `ui/modal.ts` and `ui/focus.ts` are the preferred shared foundation, but spar may need a thin adapter rather than a full rewrite.
- Minimal DOM/CSS restructuring is permitted when required to fix pointer ownership.
- No unresolved questions.

## References

- `conductor/roadmap.md` — RM-13.
- UI critique reproductions for Rename, mobile SPAR, and spar modal accessibility.
- `apps/client/src/ranch.css`
- `apps/client/src/hud/shell.ts`
- `apps/client/src/hud/plates-creature.ts`
- `apps/client/src/spar.ts`
- `apps/client/src/spar/panel.ts`
- `apps/client/src/spar.css`
- `apps/client/src/ui/modal.ts`
- `apps/client/src/ui/focus.ts`
