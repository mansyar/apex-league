# Plan — Responsive Layout Foundation (`responsive_foundation_20261013`)

Workflow: `conductor/workflow.md`. TDD applies to logic-bearing code only —
in this track that is the Phase 5 camera-framing math; all CSS/DOM work is
verified manually per the workflow's rendering scope.

## Phase 1 — Breakpoint system & fluid tokens

- [x] Task: Define the breakpoint tier system in `ui/kit.css` - 54c2aa3
  - Document tiers (base mobile / ≥480 / ≥768 / ≥1024 / ≥1200) as a comment
    header + custom-property tokens
  - Add fluid type/spacing scale with `clamp()` floors (body text never
    below ~12px)
- [x] Task: Viewport-safe overlays in `base.css`/`kit.css` - 5164fd6
  - `dvh` (with `vh` fallback) for full-height overlays;
    `env(safe-area-inset-*)` padding
- [x] Task: Responsive section in the design mock (`mock.css` / `mock.ts`) - 501a2bb
  - A `/mock.html` section demonstrating kit behavior at each tier
    (mock-first gate for later phases)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) - d8ad638 [checkpoint: d8ad638]

## Phase 2 — Ranch & starter reflow

- [ ] Task: Ranch HUD phone/tablet arrangement (`ranch.css`)
  - Creature plate + command dock stack vertically at bottom on base/phone
    tiers, tablet arrangement at ≥768, corner-pinned layout restored at
    ≥1200
  - Default-collapsed plates on narrow viewports (keep existing toggles
    functional)
  - Top chip rows wrap; modals/callouts full-width-minus-margin on phones
- [x] Task: Starter choice reflow (`starter.css`) - a4abbd3
  - Cards wrap/scale to fit 390px; comfortable tap targets
- [x] Task: Manual verification — ranch + starter at 390 / 768 / 1024 / 1280
  (browser screenshots + console check) - a4abbd3
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) - a4abbd3

## Phase 3 — Cup screens reflow

- [x] Task: Bracket re-grid (`cup.css`) - e0fe9b3
  - Phone: scroll-first round-by-round stacked column list; tablet:
    2-column rounds
  - Readable type floors over `cqw` scaling
- [x] Task: Coach room + results + give-up modal reflow - e0fe9b3
  - Phone: stack kit → tactic → confirm; single-column results/give-up
- [x] Task: Corner chip stacking (remove hardcoded `right: 110px` coupling
  at narrow tiers) - e0fe9b3
- [x] Task: Manual verification — full cup run at all four tiers (browser
  screenshots + console check) - e0fe9b3
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) - e0fe9b3 [checkpoint: e0fe9b3]

## Phase 4 — Battle HUD & spar panel reflow

- [x] Task: Spar panel fluid width + prep UI reflow (`spar.css`) - bf0bf19
- [x] Task: Battle placard/HP bars/announcer/lower-third reflow
  (`battle-hud.css`) - bf0bf19
  - Center chip shrinks/hides gracefully; announcer line usable width;
    verdict stamp + battle log reachable
- [x] Task: Manual verification — spar battle + cup match at all four tiers - bf0bf19
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) - bf0bf19 [checkpoint: bf0bf19]

## Phase 5 — Arena camera framing & renderer hygiene

- [x] Task: Extract aspect-compensation framing as pure logic (TDD)
  - Write failing tests in the `scene-logic-*.test.ts` style: portrait
    aspect → FOV/radius compensation keeps both fighters framed; landscape
    unchanged
  - Implement in `scene.ts` camera path - f2af77c
- [x] Task: Refresh `setPixelRatio` on resize/DPR change - 691dcd3
- [x] Task: Full verify and manual walkthrough
  - `bun run verify`; manual: portrait + landscape arena battles at
    phone/tablet widths - 691dcd3
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) - 691dcd3 [checkpoint: 691dcd3]

## Phase: Review Fixes
- [x] Task: Apply review suggestions - 55b8a27
