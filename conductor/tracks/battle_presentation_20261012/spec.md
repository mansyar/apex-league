# Spec: Battle Presentation Layer Refactor

## Overview
A behavior-preserving refactor of the battle presentation layer in `apps/client/src`. The battle "show" has accreted into a 1,941-line god-file (`staging.ts`) with internal code triplication, and the two battle entry flows (`spar.ts`, `cup.ts`) duplicate their screen-level logic. This track splits `staging.ts` into cohesive modules, unifies the particle-system RAF/hit-stop plumbing behind one consolidated FX loop, extracts a shared battle-UI layer consumed by both spar and cup, and cleans up CSS ownership plus small accessibility gaps. **No player-visible behavior change** except explicitly listed a11y additions.

## Goals
1. **Split `staging.ts` (1,941 lines)** into four cohesive modules:
   - `staging-seed.ts` — `visualSeedOf()` (already exported, consumed by main/spar/cup).
   - `staging-fx.ts` — projectiles, element bursts, floor decals, hit flash, charge orb, driven by **one consolidated `EffectLoop`**: a single RAF ticking every subsystem's `step(dt)`; loop stops when all subsystems report idle; a `HitStop` object (`trigger(damage)`, dt-aware) owns the freeze in exactly one place. The action clock and drive loop remain separate (different semantics) but consume the shared `HitStop`.
   - `move-fx.ts` — `MOVE_FX`, `SHOT_LOOKS`, `elementColor` as a pure data module with zero imports from the driver; typed with the existing `MoveFx`/`ShotSpec`/`ShotLook` types. Client-side only — sim stays presentation-free.
   - `staging.ts` — the public `Staging` interface (cast/drive/clear/step driver + `runStep` choreography). The public contract to main/spar/cup is unchanged.
2. **Extract `battleUI.ts`**, a shared screen-level battle-UI layer used by both spar and cup:
   - `reasonLine(verdict)` (currently verbatim-identical in both).
   - Verdict-stamp title logic (`winnerTitle`/`stampTitle` twins).
   - Kit-picker factory (tier-lock rule, min-2 toggle) and tactic-row factory.
   - `castingFor()` battle-cast derivation.
   - Arena enter/exit choreography (the copy-pasted sequence in main.ts's two handler blocks).
   - Each flow keeps its own state strategy (spar writes through the store, cup uses local picks) — the factories take read/write callbacks rather than owning state.
3. **One `disposeObject3D(root)` utility** (`scene-utils.ts` or similar) replacing the 6 copies of the geometry/material dispose traversal in scene.ts (×2), arena.ts, staging.ts (×3).
4. **CSS consolidation:** move `.cup-button` from spar.css to cup.css; corral `.spar-*` chrome rules into spar.css (currently scattered across ranch.css and battle-hud.css); dedupe `starter-*` styles (starter.css canonical); **scope mock.css selectors under `.mock`** so the design mock can no longer shadow live class names (`kit-button`, `stat-row`, `condition-list`, `command-dock`). mock.html/mock.ts remain as the documented design-gate page.
5. **Accessibility additions** (the only deliberate behavior deltas):
   - Cup give-up modal: focus trap, Escape-to-close, `role="dialog"` + `aria-modal`, focus restored on close (parity with hud.ts's reset modal, which already has `trapFocus`).
   - Fast-forward control: `aria-pressed` reflecting speed state.
   - Focus restoration when cup/spar overlays close.

## Non-Functional Requirements
- `bun run verify` stays green at every commit (types, tests, Biome, determinism gate).
- Zero diff to `packages/sim` and `packages/voxel` — this is a client-only track.
- Choreography timing feel must be unchanged: same constants, same event ordering, same reduced-motion gates. The `EffectLoop` consolidation must not change when effects start/stop relative to `PlaybackStep` beats.
- No per-frame allocations introduced; preserve the existing quality-gate comment contract in staging.ts.
- All existing tests keep passing unmodified except where module paths move (`staging-seed.test.ts`, `choreo.test.ts`, `motion.test.ts` imports).

## Acceptance Criteria
- [ ] `staging.ts` ≤ ~700 lines; no file in the battle layer exceeds ~750 lines.
- [ ] Exactly one implementation of the hit-stop dt computation; exactly one `disposeObject3D` traversal; `reasonLine` exists once.
- [ ] No `.cup-button` in spar.css; all mock.css selectors nested under `.mock`.
- [ ] Cup give-up modal traps focus, closes on Escape, restores focus; fast-forward has `aria-pressed`.
- [ ] `bun run verify` green; visual QA of a full Spar and a full player cup match recorded (play/fast-forward, big-hit hit-stop, KO) with no perceptible timing difference.

## Out of Scope
- Screen/route centralization in `main.ts` (deferred to the ranch-scene & shell track).
- Any sim changes (cup.ts split, clock.ts dedupe — separate track), voxel changes.
- Battle-feel tuning, new moves, new VFX, balance changes.
- Larger a11y work beyond the listed additions (e.g. bracket ticker aria-live noted but optional).
- Deleting `mock.html` tooling.
