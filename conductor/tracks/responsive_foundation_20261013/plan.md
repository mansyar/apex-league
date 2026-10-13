# Plan — Responsive Layout Foundation (`responsive_foundation_20261013`)

Workflow: `conductor/workflow.md`. TDD applies to logic-bearing code only —
in this track that is the Phase 5 camera-framing math; all CSS/DOM work is
verified manually per the workflow's rendering scope.

## Phase 1 — Breakpoint system & fluid tokens

- [ ] Task: Define the breakpoint tier system in `ui/kit.css`
  - Document tiers (base mobile / ≥480 / ≥768 / ≥1024 / ≥1200) as a comment
    header + custom-property tokens
  - Add fluid type/spacing scale with `clamp()` floors (body text never
    below ~12px)
- [ ] Task: Viewport-safe overlays in `base.css`/`kit.css`
  - `dvh` (with `vh` fallback) for full-height overlays;
    `env(safe-area-inset-*)` padding
- [ ] Task: Responsive section in the design mock (`mock.css` / `mock.ts`)
  - A `/mock.html` section demonstrating kit behavior at each tier
    (mock-first gate for later phases)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — Ranch & starter reflow

- [ ] Task: Ranch HUD phone/tablet arrangement (`ranch.css`)
  - Creature plate + command dock stack vertically at bottom on base/phone
    tiers, tablet arrangement at ≥768, corner-pinned layout restored at
    ≥1200
  - Default-collapsed plates on narrow viewports (keep existing toggles
    functional)
  - Top chip rows wrap; modals/callouts full-width-minus-margin on phones
- [ ] Task: Starter choice reflow (`starter.css`)
  - Cards wrap/scale to fit 390px; comfortable tap targets
- [ ] Task: Manual verification — ranch + starter at 390 / 768 / 1024 / 1280
  (browser screenshots + console check)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — Cup screens reflow

- [ ] Task: Bracket re-grid (`cup.css`)
  - Phone: scroll-first round-by-round stacked column list; tablet:
    2-column rounds
  - Readable type floors over `cqw` scaling
- [ ] Task: Coach room + results + give-up modal reflow
  - Phone: stack kit → tactic → confirm; single-column results/give-up
- [ ] Task: Corner chip stacking (remove hardcoded `right: 110px` coupling
  at narrow tiers)
- [ ] Task: Manual verification — full cup run at all four tiers (browser
  screenshots + console check)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Battle HUD & spar panel reflow

- [ ] Task: Spar panel fluid width + prep UI reflow (`spar.css`)
- [ ] Task: Battle placard/HP bars/announcer/lower-third reflow
  (`battle-hud.css`)
  - Center chip shrinks/hides gracefully; announcer line usable width;
    verdict stamp + battle log reachable
- [ ] Task: Manual verification — spar battle + cup match at all four tiers
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 — Arena camera framing & renderer hygiene

- [ ] Task: Extract aspect-compensation framing as pure logic (TDD)
  - Write failing tests in the `scene-logic-*.test.ts` style: portrait
    aspect → FOV/radius compensation keeps both fighters framed; landscape
    unchanged
  - Implement in `scene.ts` camera path
- [ ] Task: Refresh `setPixelRatio` on resize/DPR change
- [ ] Task: Full verify and manual walkthrough
  - `bun run verify`; manual: portrait + landscape arena battles at
    phone/tablet widths
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
