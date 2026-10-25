# Phase 4 verification — Secondary surfaces, docs & integrated audit

Result: **partial** (P4.T2 blocked — see below). Branch
`feat/20261025-mobile-layout-pass`, base 86ac5fb9 (phase-3 complete marker
head), phase-4 commit a72ca8fe.

## P4.T1 — Secondary surfaces pass (FR-6, AC-4)

### The known Phase-1 defect: STABLE chip vs DRAFT DAY stamp (starter.css)

The Phase-1 pre-fix capture (`p1-before-393-draft-fresh.png`) showed the
STABLE chip overlapping the DRAFT DAY stamp at 393×852. Fix in
`apps/client/src/starter.css` (the ≤479.98px phone tier, the only change of
this phase): overlay top padding `124px 16px 24px` → `168px 16px 24px`, with
the comment updated to name the real cause — the Settings/Handbook/Stable
chip cluster (three stacked 40px chips + gaps) ends at 146px on the phone
tier, and a tall three-card draft stack must scroll rather than clip under
the viewport. Reuse of the existing breakpoint; no restructuring
(NFR-5: +2 net lines). `bunx biome check apps/client/src/starter.css` clean.

Post-fix proof at 393×852 (`p4-after-393-draft.png`, fresh save via
`localStorage.clear()` eval + reload): chip cluster ends ~y155, DRAFT DAY tab
+ "CHOOSE YOUR FIRST PARTNER" heading start ~y175 — clear separation, all
three starter cards fully visible, scrollWidth 393 === innerWidth 393,
console 0 errors / 0 warnings.

### Surface-by-surface evidence (representative state × both orientations)

Screenshots under `.conductor/evidence/20261025-mobile-layout-pass/`.

| Surface | 393×852 portrait | 852×393 landscape | Notes |
| --- | --- | --- | --- |
| Starter / draft | `p4-after-393-draft.png` | `p4-draft-852x393.png` | Defect fixed both orientations; cards one-per-row portrait, one-row landscape |
| Ranch (spot re-check) | `p4-ranch-393x852.png` | `p4-ranch-852x393.png` | Hit-test sweep portrait 9/9 SELF (spar/settings/handbook/stable chips, lineage, plate head, rename, collapse-toggle, dock head); landscape dock collapsed by default, expanded by real tap |
| Stable | `p4-stable-393x852.png` | `p4-stable-852x393.png` | Empty-state stable modal within viewport both orientations; BACK TO THE RANCH reachable (closed by real taps) |
| Handbook | `p4-handbook-393x852.png` | `p4-handbook-852x393.png` + `p4-handbook-raising-852x393.png` | Portrait: tabs wrap to two rows, `.kit-modal-box` 100.7→751.3 within 852, scrollHeight 649 === clientHeight 649, 6/6 tab/button hits SELF. Landscape: box 8.5→384.5 within 393; Raising tab fits (374 === 374); Type chart + Raising both checked |
| Settings (+ save-transfer) | `p4-settings-393x852.png` | `p4-settings-852x393.png` | Motion/Sound toggles, both volume sliders, DOWNLOAD SAVE / IMPORT SAVE / NEW GAME / DONE all within viewport and 8/8 hit SELF in portrait sweep (background HUD elements correctly non-hittable behind the modal scrim) |
| Recovery | `p4-recovery-393x852.png` | `p4-recovery-852x393.png` | Corrupt save injected via `localStorage.setItem('apex.save', '{corrupt-payload-not-a-save')` + reload (no hand-edited valid saves); "THAT SAVE WOULDN'T OPEN" modal within viewport both orientations; Download broken save / Keep trying / Start over all hit SELF; confirm step ("START A FRESH RANCH?") also seen within viewport at 1440×900; "Clear and start over" clicked to restore a clean state |
| Cup entry (spot re-check, AC-2) | `p4-cup-entry-393x852.png` | — | Reached by real play: 6 × Advance-Day taps to day 7, Enter Cup tap; Bronze Cup board single-column, fully visible; closed via cup Back to the ranch (full cup runs were proven in Phase 3) |
| Desktop guard (NFR-2) | — | — | `p4-draft-1440x900-clean.png` (fresh draft), `p4-desktop-guard-1440x900.png` (ranch day 7): unchanged desktop layout, the new ≤479.98px rules do not fire at 1440 |
| Tablet guard (NFR-2) | — | — | `p4-draft-800x1000.png`: scrollWidth 800 === innerWidth, starter layout unchanged in the tablet band |

Bar re-checks: scrollWidth === innerWidth measured at 393 (portrait), 852
(landscape), 800 (tablet); console 0 errors / 0 warnings at every audited
viewport (final `playwright-cli console`: 0/0).

### Reachability gaps (fallback ladder, per brief P4.T1.2)

Genuinely unreachable in a single real-play session; recorded, not fabricated:

- **Graduation / Hall of Fame** — `canGraduate` requires a champion-stage
  creature with ageDays ≥ 60 (GRADUATION_DAY, packages/sim/src/legacy/
  graduation.ts). Champion stage additionally requires the full training
  evolution ladder; not reachable cheaply.
- **Nursery** — requires two graduated creatures (breeding pool ≥ 2); strictly
  behind the graduation gate.
- **Gift (tier-reward card)** — requires a Silver+ ladder reward (Storm Hound
  at Silver); reaching 18 ladder points from a fresh Bronze III save needs
  multiple full won cup runs.

Narrowest reliable subset recorded instead: both graduation-overlay and
nursery-overlay build on `.starter-overlay` (graduation/egg/nursery
compose `.starter-overlay graduation-overlay [nursery-overlay]`), so the
starter.css phone-tier padding fix directly governs their top strip at ≤479.98px
widths; nursery.css already carries its own ≤767.98px tier (padding 16px,
single-column parents/stat lists, stretched actions) which Phase 2's landscape
short-modal cap covers at 852×393 via `.kit-modal-box`. Their phone-tier CSS
was reviewed statically; no defect found beyond the shared starter padding.
**Phase status therefore recorded as `partial` on AC-4 visual coverage.**

### Cosmetic residual carried from Phase 3 (documented, not fixed)

At 852×393 with the battle-log box open over a finished battle, the centered
landscape verdict stamp still passes ~60px behind the log panel (transient,
non-interactive; the interactive log paints on top — `p3-spar-log-fixed2-
852x393.png`). Phase 3 spent its two fix attempts; battle-hud.css is not in
this phase's Touches. Strict bar clauses hold (no occlusion of an interactive
element, no horizontal scroll); left documented rather than risk a regression
for a cosmetic transient.

### Pre-existing, out of contract (noted only)

Tablet-band (768–1023.98px) chip/lineage overlap at 800×1000 remains as
found — NFR-2 preserves the tablet base seats; out of contract per spec.

## P4.T2 — Guidelines mobile bar (FR-9, AC-6) — BLOCKED

The edit to `conductor/product-guidelines.md` was attempted twice (UX
Principle 8, recording the adopted measurable bar — no horizontal page scroll,
no panel occluding an interactive element or the scene's action area, all
text ≥ readable size, console clean; the "fully playable at 393px in both
orientations" standard; desktop-first unchanged posture) and the tool
permission was denied both times in a row. Per the operator policy (same
denied action twice in a row → stop, no retry/rephrase/workaround), the edit
was **not applied** and the task is reported blocked. The spec interview
secured user pre-approval for this edit (per brief); the prepared wording is
recorded here so the primary can apply it at docs-sync:

> 8. **The mobile bar — fully playable at 393px in both orientations.** The
>    design posture stays desktop-first; mobile is an adaptation of the same
>    screens, not a redesign. A screen passes the bar at 393×852 and 852×393
>    when: there is no horizontal page scroll; no panel occludes an
>    interactive element or the scene's action area; all text is at readable
>    size; and the browser console stays clean.

**Resolution (primary):** applied verbatim as UX Principle 8 in
`conductor/product-guidelines.md` (appended after principle 7,
desktop-first). P4.T2 complete.

## P4.T3 — Integrated audit (AC-1/2/3/4 final, AC-8)

- Full secondary-surface sweep executed above (draft, ranch, stable,
  handbook ×2 tabs, settings, recovery ×2 steps, cup entry), both phone
  orientations where reachable, plus 1440×900 and 800×1000 guards.
- Adopted bar re-checked end-to-end on the surfaces audited: scrollWidth ===
  innerWidth at 393/852/800/1440; hit-test sweeps all SELF on open panels
  (portrait ranch 9/9, settings modal 8/8, handbook modal 6/6, recovery 3/3);
  real taps drove navigation (stable open/close, handbook open/tab switch/
  close, settings open/close, cup enter/back, recovery confirm, draft
  selection) — no screenshot-only claims.
- Console 0 errors / 0 warnings at every audited viewport (AC-8), including
  across the corrupt-save recovery cycle.
- AC-1/AC-3 final confirmation: no ranch.css/hud changes this phase (spot
  re-checks of ranch portrait/landscape above remain at Phase-1/2 state);
  no cup/spar stylesheet changes (Phase 3 evidence stands; portrait cup spot
  re-check above).
- Cross-references: phase-1.md (kit phone tier, chip-cluster seat, STABLE
  defect discovery), phase-2.md (dock collapse defaults, landscape ranch
  block, landscape-short modal cap), phase-3.md (cup/battle/spar fixes,
  landscape stamp residual).

## Commands

- Phase gate: `bun test --check --parallel=4 --timeout 120000` → exit 0
  (2640 pass / 1 skip / 0 fail, 209 files, 33.92s).
- Acceptance leg: `bun run verify` → exit 0 (typecheck + full test suite +
  biome + determinism gate); `bun run build` → exit 0 (Vite, 309 modules).
- `bunx biome check apps/client/src/starter.css` → clean.

## Deviations

- None beyond Touches. battle-hud.css was NOT touched (residual left
  documented); no other surface stylesheets needed changes beyond
  starter.css.

## Notes for the primary

- P4.T2 must be applied at docs-sync (pre-approved wording above; the file
  was permission-locked for this subagent).
- Dev server ran on Vite port 5175 (5173/5174 busy); killed at phase end.

## Primary verification

Independent verification by the Conductor primary (2026-10-25):

- `git log --oneline 86ac5fb9..HEAD` → exactly the 2 reported commits
  (a72ca8fe, 75cb31b8) — squash guard passed; tree clean before the
  primary's P4.T2 edit.
- P4.T2 completed by the primary: the pre-approved wording applied
  verbatim as UX Principle 8 in `conductor/product-guidelines.md`
  (user-approved in the spec interview; diff shown to the user at
  docs-sync).
- `bun run test:phase` → exit 0: 2640 pass / 1 skip / 0 fail, 209 files.
- `bun run verify` → exit 0; `bun run build` → exit 0.
- Evidence read in full: STABLE/DRAFT-DAY overlap fixed and verified at
  both orientations; full secondary sweep with real-tap interaction
  proofs (draft, ranch, stable, handbook, settings + save-transfer,
  recovery incl. corrupt-save injection + confirm, cup entry); bar
  re-checked end-to-end (scrollWidth === innerWidth at 393/852/800/1440;
  hit-test sweeps all SELF); console 0/0 everywhere; desktop + tablet
  guards unchanged.
- AC-4 gap (graduation/nursery/gift unreachable by real play in one
  session) correctly handled via the fallback ladder: static CSS review
  recorded, no fabrication — carried to the integrated verification and
  review as a `partial` visual-coverage note.

**Result: phase accepted** (P4.T2 completed by the primary; the phase's
code scope is fully verified).
