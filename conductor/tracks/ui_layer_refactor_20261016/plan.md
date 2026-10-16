# Plan — UI-Layer Refactor: Module Decomposition & CSS Consolidation

- **Track ID:** `ui_layer_refactor_20261016`
- **Spec:** [spec.md](./spec.md)
- **Workflow:** `conductor/workflow.md` (TDD for logic-bearing tasks; manual
  verification for rendering/CSS; `bun run verify` gates every commit)

## Phase 1 — Golden Safety Net

- [ ] Task: Audit the three target modules and record the confirmed seam map
  - [ ] Read `hud.ts`, `spar.ts`, `staging-fx.ts` and list every pure
        computation vs. DOM/effect wiring block (function-level inventory)
  - [ ] Record the final target module map in this plan's notes; adjust
        `spec.md` module names if the audit reveals better seams
- [ ] Task: Golden-test the currently-pure surfaces
  - [ ] Extend `hud.copy.test.ts` with golden cases pinning representative
        copy strings (coach voice, hints, callouts, numerals) — write tests
        FIRST, confirm they pass against current code (characterization, not
        TDD red)
  - [ ] Add golden tests for any other currently-exported pure helpers in
        `spar.ts` / `staging-fx.ts` that lack coverage
  - [ ] Run `bun test` green; commit `test(refactor): pin golden outputs for hud/spar/staging-fx seams`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — hud.ts Decomposition

- [ ] Task: Extract `hud/copy.ts`
  - [ ] Create `hud/copy.ts`; move copy engine; retarget `hud.copy.test.ts`
        (tests move with the code, still byte-identical outputs)
  - [ ] `hud.ts` re-exports the moved API; `bun run verify`; commit
        `refactor(hud): extract copy engine to hud/copy.ts`
- [ ] Task: Extract `hud/plates.ts` (TDD)
  - [ ] Write failing tests for score-bug / lineage-plate / creature-plate
        view-model functions (state → data)
  - [ ] Implement view-models by moving the existing math; make tests green
  - [ ] Move the three DOM builders to `hud/plates.ts`, consuming the
        view-models; `hud.ts` keeps thin wiring
  - [ ] `bun run verify`; commit `refactor(hud): extract plates + view-models`
- [ ] Task: Extract `hud/dock.ts` (TDD)
  - [ ] Write failing tests for the command-dock action-availability/AP-cost
        view-model
  - [ ] Implement by moving existing logic; move the dock DOM builder;
        `bun run verify`; commit `refactor(hud): extract command dock`
- [ ] Task: Extract `hud/settings.ts`
  - [ ] Move settings chips + reset confirm modal (reuse shared `focusTrap`);
        add view-model tests where logic exists (e.g. rename validation
        display state)
  - [ ] `bun run verify`; commit `refactor(hud): extract settings + reset modal`
- [ ] Task: Slim the `hud.ts` root
  - [ ] `hud.ts` retains only the `update()` fanout + re-exports; confirm
        `main.ts` needs no logic changes (imports may be re-pointed)
  - [ ] Confirm no non-test client source file exceeds ~500 lines; `bun run verify`; commit
        `refactor(hud): slim hud.ts to wiring root`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Manual visual pass: ranch HUD (score bug, plates, dock, rename,
        settings chips, reset modal), reduced-motion pass, ~390px phone-width
        pass

## Phase 3 — spar.ts View-Model Extraction

- [ ] Task: Extract `spar/loadout-vm.ts` (TDD)
  - [ ] Write failing tests for kit-picker/loadout view-model (tier gating
        display, row lock state, selection mapping)
  - [ ] Implement by moving existing logic from `spar.ts`; green
  - [ ] `bun run verify`; commit `refactor(spar): extract loadout view-model`
- [ ] Task: Extract `spar/log.ts` (TDD)
  - [ ] Write failing tests for battle-log formatting; implement by moving
        existing formatting; green
  - [ ] `bun run verify`; commit `refactor(spar): extract log formatting`
- [ ] Task: Slim `spar.ts` to panel DOM + session driving; verify no file
      exceeds the cap
  - [ ] `bun run verify`; commit `refactor(spar): slim panel to wiring`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Manual visual pass: spar panel (locked rows, tactic row, log scroll),
        kit gate callouts, reduced-motion pass

## Phase 4 — staging-fx.ts Registry/Math Extraction

- [ ] Task: Extract `fx/fx-data.ts` + `fx/fx-math.ts` (TDD)
  - [ ] Write failing tests pinning burst parameters, projectile placement
        math, decal parameters, hit-stop timing curves (golden parity with
        Phase 1 pins)
  - [ ] Implement by moving the pure computations; `EffectLoop` and `HitStop`
        stay in `staging-fx.ts` unchanged
  - [ ] `bun run verify`; commit `refactor(fx): extract effect data + math`
- [ ] Task: Slim `staging-fx.ts` to scheduler/wiring; verify the cap
  - [ ] `bun run verify`; commit `refactor(fx): slim staging-fx to wiring`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Manual visual pass: arena VFX in spar and cup at both playback speeds,
        hit-stop feel, reduced-motion dump path, element burst identity

## Phase 5 — CSS Consolidation (Conservative)

- [ ] Task: Capture pre-change baselines
  - [ ] Browser screenshots: ranch, spar panel, cup screens (bracket/coach/
        results), modals — desktop + ~390px
- [ ] Task: Deduplicate patterns into `ui/kit.css`
  - [ ] Move duplicated button/chip/modal/`:focus-visible` declarations from
        `cup.css` and `ranch.css` into `kit.css`; keep per-surface layout and
        media queries in place
  - [ ] `bun run verify`; commit `style(ui): consolidate shared patterns into kit.css`
- [ ] Task: Post-change screenshot comparison
  - [ ] Re-capture the same surfaces; diff against baselines; fix any visual
        drift (drift = bug, not polish)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Manual visual pass including keyboard focus-visible walk and phone
        tap-target sanity

## Phase 6 — Wrap-up

- [ ] Task: Full verification sweep
  - [ ] `bun run verify` green; record test-suite wall time vs. pre-track
        baseline (must be unchanged or faster)
  - [ ] Confirm acceptance criterion: no non-test TS source file in
        `apps/client/src` > ~500 lines (record the final numbers)
- [ ] Task: Documentation & notes
  - [ ] Update `conductor/tech-stack.md` with a dated note describing the new
        `hud/`, `spar/`, `fx/` module layout
  - [ ] Update README repo-layout section if it references the changed files
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Final self-review checklist (workflow.md); request `conductor-review`
