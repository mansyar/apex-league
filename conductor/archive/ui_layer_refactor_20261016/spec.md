# Spec — UI-Layer Refactor: Module Decomposition & CSS Consolidation

- **Track ID:** `ui_layer_refactor_20261016`
- **Type:** Refactor (behavior-identical)
- **Status:** new
- **Branch:** `track/ui_layer_refactor_20261016`

## Overview

The client UI layer has three oversized modules and one shared-CSS gap:

| File | Lines | Problem |
|---|---|---|
| `apps/client/src/hud.ts` | 1,394 | God-module: pure copy engine (`coachVoice`, `growthHint`, `graduationHint`, `evolveCallout`, `romanNumeral`, `familyName`), five DOM builders (score bug, lineage plate, creature plate, command dock, settings chips), reset modal, and the `update()` fanout — all in one file. Only the copy layer is tested (`hud.copy.test.ts`). |
| `apps/client/src/spar.ts` | 531 | Mixes panel DOM construction with kit-picker/loadout session driving and battle-log formatting. |
| `apps/client/src/staging-fx.ts` | 781 | Mixes pure effect data/math (burst params, placement, timing curves) with `EffectLoop` frame scheduling and `HitStop` wiring. |
| `apps/client/src/cup.css` / `ranch.css` | 1,286 / 723 | Re-declare button/chip/modal patterns already owned by `ui/kit.css` (699). |

**Goal:** decompose each module at its natural seam into single-responsibility
modules; extract every pure, state→data computation into DOM-free units covered
by tests (characterization/golden tests written *before* code moves); keep DOM
wiring thin and manually verified; conservatively deduplicate CSS into
`kit.css`. No user-visible behavior change.

**Why now:** this is the groundwork for every upcoming HUD-touching track
(audio settings, Gold-tier plates, breeding UI) — building on a 1,394-line
god-module compounds risk with each of those.

## Functional Requirements

### R1 — `hud.ts` → `hud/` by-concern subfolder

- `hud/copy.ts` — the pure copy engine; `hud.copy.test.ts` retargets here and
  gains golden coverage for representative states.
- `hud/plates.ts` — score bug, lineage plate, creature plate: view-model
  functions (state → data) extracted and tested; DOM builders stay thin.
- `hud/dock.ts` — command dock: action-availability/AP-cost view-model
  extracted and tested; DOM builder stays thin.
- `hud/settings.ts` — settings chips + reset confirm modal (reuses the shared
  `focusTrap` from `battleUI.ts`).
- `hud.ts` (root) remains as the thin `update()` fanout / wiring root and
  re-exports the public surface so `main.ts` imports stay stable.

### R2 — `spar.ts` view-model extraction

- Extract the pure kit-picker/loadout view-model (tier gating display state,
  row lock state, selection mapping) and battle-log formatting into `spar/`
  modules (e.g. `spar/loadout-vm.ts`, `spar/log.ts`), unit-tested DOM-free.
- *Audit adjustment (2026-10-16):* spar's log formatting turned out to be a
  thin `showLine` + toggle-label mapping (real formatting lives in the
  already-tested battle-session). `spar/log.ts` carries only the toggle
  label/aria mapping — intentionally tiny.
- Panel DOM construction and session driving stay as thin wiring in `spar.ts`.

### R3 — `staging-fx.ts` registry/math extraction

- Extract pure effect computation — per-element burst parameters, projectile
  placement math, decal parameters, hit-stop timing curves — into pure modules
  (e.g. `fx/fx-math.ts`, `fx/fx-data.ts`), unit-tested DOM-free.
- *Audit adjustment (2026-10-16):* `HitStop` + `EffectLoop` move to
  `fx/loop.ts` (self-contained, already test-covered) so `staging-fx.ts`
  meets the ~500-line cap; `buildShotCore` moves to `fx/shot-geometry.ts`
  (deterministic mesh factory).
- `createBattleEffects` (spawn/dispose surface, step functions),
  the `BattleEffects` interface, and all per-frame scheduling wiring stay in
  `staging-fx.ts`, unchanged in behavior.

### R4 — Conservative CSS consolidation

- Move only genuinely duplicated patterns (buttons, chips, modals,
  focus-visible styles) from `cup.css` and `ranch.css` into `ui/kit.css`.
- Per-surface files keep their layout rules and media queries.
- No intentional visual change; per-phase browser screenshot checks.

### R5 — Characterization safety net (golden-first)

- Before each extraction, add tests pinning the current pure outputs (copy
  strings for representative game states, view-model mappings, effect
  math/registry outputs). Extracted modules must produce byte-identical
  outputs; tests travel with the code they pin.
- Intentional copy/wording changes are out of scope — any output diff found
  during extraction is a bug to fix, not a feature.

## Non-Functional Requirements

- **Behavior-identical:** no user-visible DOM/behavior change beyond CSS-class
  relocation required by R4; no save-schema impact (SAVE_VERSION stays 12);
  no new dependencies.
- **Determinism & performance:** effect math stays pure and seeded; no new
  per-frame allocations in render/effect loops.
- **Workflow compliance:** TDD on logic-bearing extractions only (Red → Green);
  rendering/CSS verified manually per phase; `bun run verify` gates every
  commit; style per `conductor/code_styleguides/`.
- **Test suite speed:** unchanged or faster (< 10 s target).

## Acceptance Criteria

1. No non-test TypeScript source file in `apps/client/src` exceeds ~500 lines.
2. Every extracted pure module has unit tests; golden tests were written
   before extraction and pass byte-identically after.
3. `bun run verify` green (types, typed parallel tests, biome, determinism
   gate) at every phase checkpoint.
4. Manual visual verification after each phase: ranch HUD, spar panel, arena
   VFX (spar + cup), cup screens — including a reduced-motion pass and a
   phone-width (~390px) pass.
5. The store's `commit()` fanout order and public module APIs consumed by
   `main.ts` are unchanged (imports may be re-pointed, logic untouched).

## Out of Scope

- `apps/client/src/cup.ts` (932) orchestration flow, `main.ts` (493) logic,
  `staging.ts`, `scene-logic.ts`, `scene.ts`/`scene-setup.ts`.
- Dev pages: `mock.ts`, `gallery.ts`, `preview.ts`.
- New features, visual redesign, UI framework adoption, backend work.
- Aggressive CSS token rewrite beyond the conservative dedupe.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Visual regressions from CSS dedupe | Per-phase browser screenshots vs. pre-phase baseline; conservative pattern-only moves |
| User-facing copy drift | Golden tests pin copy strings; diffs are bugs |
| Effect timing drift breaking battle feel | Effect math golden-tested; `HitStop` ownership untouched; manual fast/slow playback pass |
| Hidden coupling in `update()` fanout | `hud.ts` root keeps the fanout; extraction is additive-first, wiring moved last |
