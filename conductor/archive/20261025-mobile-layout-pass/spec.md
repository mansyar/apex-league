# Spec — 20261025-mobile-layout-pass

## Overview

Every screen of Apex League becomes fully playable at phone width: 393px portrait (393×852) **and** landscape (852×393). The gap was made concrete during the morning-after ritual track's visual pass, where 393px evidence showed HUD panels occluding the ranch scene. Today's responsive rules are scattered and inconsistent — `cup.css`, `ranch.css`, `starter.css`, `spar.css`, `nursery.css`, `base.css`, and `battle-hud.css` each carry their own `max-width` rules (479.98 / 767.98 / 1023.98 px), while the shared UI kit (`kit.css`) has **zero** width breakpoints.

Desktop-first remains the design philosophy. This track defines the mobile bar once, delivers it across every surface, and records it in the product guidelines so future tracks inherit it.

## Goals & success metrics

- Core loops (care day, cup flow) fully playable at 393px in both orientations.
- Measurable bar (adopted): no horizontal page scroll; no panel occludes an interactive element or the scene's action area; all text ≥ readable size; clean browser console.
- Desktop 1440×900 and the existing 768–1023.98px tablet band do not regress.
- The agreed mobile bar is documented in `conductor/product-guidelines.md`.

## Scope

**In:**
- All surfaces: ranch+HUD, cup flow (entry, bracket, coach room, board, results), spar, battle HUD + arena overlays, stable, graduation/nursery, handbook, starter, gift, settings, recovery, save-transfer.
- Shared kit baseline breakpoints (`kit.css`).
- Light interaction adaptation: HUD dock may collapse/condense on phone widths. No gestures.
- Guidelines doc update (FR-9).

**Out:**
- Native gestures, new mobile-only features, new dependencies.
- Widths below 393px (same styles apply, untested/accepted).
- Native app packaging; OS on-screen keyboard behavior itself.

## Functional requirements

| ID | Requirement |
|---|---|
| FR-1 | `kit.css` gains coherent width breakpoints (≤767.98 phone, 768–1023.98 tablet) so shared components (plates, chips, dock, modals, ticker) are legible at 393px |
| FR-2 | Ranch + HUD at 393×852: panels never occlude the scene's action area or each other's interactive regions; no horizontal page scroll |
| FR-3 | Ranch + HUD at 852×393: same bar, via panel layout adjustment or the allowed light adaptation |
| FR-4 | Cup flow surfaces (entry, bracket, coach room, board, results) legible and operable in both orientations |
| FR-5 | Spar surfaces legible and operable in both orientations |
| FR-6 | Secondary surfaces (stable, graduation/nursery, handbook, starter, gift, settings, recovery, save-transfer) legible and operable in both orientations |
| FR-7 | Light adaptation permitted: HUD dock may collapse/condense on phone widths; no gestures; existing handlers otherwise unchanged |
| FR-8 | Battle HUD + arena overlays readable in both orientations during cup/spar battles |
| FR-9 | Product guidelines record the agreed mobile bar (desktop-first unchanged) |

## Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | No sim/save-schema changes (save stays v25); no new dependencies |
| NFR-2 | Desktop 1440×900 non-regression + existing 768–1023.98px tablet band behavior preserved, verified per phase |
| NFR-3 | `prefers-reduced-motion` behavior unchanged |
| NFR-4 | A11y held: colour never the sole carrier, touch targets not tiny, no essential tiny text |
| NFR-5 | Changes stay in existing stylesheets + minimal TS (dock collapse) within the 12 KB client module cap; no CSS file restructuring |
| NFR-6 | Clean browser console at every audited viewport |

## Acceptance criteria

| ID | Criterion | Maps to |
|---|---|---|
| AC-1 | Ranch day view passes the adopted bar at 393×852 and 852×393 (screenshots as evidence) | FR-1, FR-2, FR-3 |
| AC-2 | Cup flow key states pass the bar in both orientations | FR-4 |
| AC-3 | Spar + battle screens pass the bar in both orientations | FR-5, FR-8 |
| AC-4 | Secondary surfaces pass the bar | FR-6 |
| AC-5 | Dock collapse demonstrable on phone widths, absent on desktop | FR-7 |
| AC-6 | Guidelines contain the documented mobile bar | FR-9 |
| AC-7 | Desktop + tablet non-regression proven at each phase gate | NFR-2 |
| AC-8 | Console clean at all audited viewports | NFR-6 |

## Edge cases & failure modes

- **On-screen keyboard:** text inputs (stable rename, settings) must remain reachable when the OS keyboard opens; the keyboard's own behavior is out of scope.
- **Long panels:** handbook and other long content scroll rather than clip.
- **Modals:** stay within the viewport at both phone orientations.
- **Landscape battle:** an active cup battle must remain readable when the device rotates.
- **Below 393px:** untested; same styles apply and must not catastrophically break (best-effort).

## Dependencies

None — no track or external dependencies.

## Open questions & assumptions

- **Assumption:** audit via real dev server + supported app seams + Playwright device emulation (no save hand-editing), consistent with the established visual-layer procedure.
- **Assumption:** representative state per surface; key states for the cup flow (entry, bracket, board, results, coach room when relevant).
- **Assumption:** CSS files are exempt from the module-size guard per the existing rule; CSS growth stays proportionate.
- **Assumption:** dock collapse logic that is pure (width-class → collapsed default) gets unit tests; rendering verified visually.

## References

- Mobile occlusion evidence: `.conductor/evidence/20261024-postcup-morning-after/` (six 393px screenshots from track 20261024-postcup-morning-after).
- Stylesheet inventory: `apps/client/src/{base,battle-hud,cup,graduation,nursery,ranch,spar,starter}.css`, `apps/client/src/ui/kit.css`.
- Workflow visual procedure: `conductor/workflow.md` (1440×900 + iPhone 15 393px, console-clean, evidence under `conductor/tracks/<id>/verification/`).
