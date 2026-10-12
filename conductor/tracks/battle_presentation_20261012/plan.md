# Plan: Battle Presentation Layer Refactor

Track: `battle_presentation_20261012` · Type: refactor · Branch: `battle_presentation_20261012`

TDD applies to logic-bearing code (pure helpers, loop core). Rendering/DOM wiring
is verified manually per `workflow.md` (browser screenshots + console check at
phase checkpoints).

## Phase 1 - Foundations (complete, checkpoint: 13a7ee9): utilities & shared battle UI (logic-bearing)

- [x] Task: `disposeObject3D` utility (TDD) — 8e96168
  - [x] Write failing tests for `scene-utils.ts::disposeObject3D` (Mesh vs Group traversal, array vs single material, geometry+material disposed)
  - [x] Implement; make tests pass
  - [x] Replace the traversal copies in `scene.ts` (×2), `arena.ts`, `gallery.ts`, `staging.ts` (×3) — 7 sites total (gallery.ts found during implementation)
- [x] Task: `battleUI.ts` pure helpers (TDD) — 22fe6c7
  - [x] Write failing tests for `reasonLine` (ko / double_ko / forfeit / time endings), verdict-stamp title selection (winner-side scan incl. mirror-match), kit-picker lock rule (tier gating, min-2 toggle), tactic-row selection contract — implemented `reasonLine` + `winningSideKey` (ko / double_ko / time; winner-side scan incl. all-zero tie rule); kit-picker/tactic-row helpers land with the DOM factories task below
  - [x] Implement helpers as pure functions taking data/callbacks (no DOM in tests)
- [x] Task: `battleUI.ts` DOM factories (manual verification path) — 0f4a9d1
  - [x] Extract kit-picker and tactic-row factories (read/write callback strategy), `castingFor`, arena enter/exit choreography into `battleUI.ts` — done as castFighter + buildKitPicker + buildTacticRow + pure toggleKitChoice (TDD); arena enter/exit choreography extracted as main.ts-local helpers instead (needs scene/swap/staging wiring, not shared UI code — noted deviation)
  - [x] Rewire `spar.ts` and `cup.ts` to consume the shared layer; delete the duplicated copies
- [x] Task: a11y additions (manual verification path) — 13a7ee9
  - [x] Cup give-up modal: focus trap + Escape + `role="dialog"`/`aria-modal` + focus restore (hud.ts's `trapFocus` extracted to shared `battleUI.focusTrap`; Escape closes to Stay; opener focuses Stay; dismiss restores focus to the close control)
  - [x] `aria-pressed` on fast-forward controls (spar + cup) via shared `renderSpeedButton`; spar overlay close restores focus to the spar chip (cup overlay-level chip restore is a hud.ts cross-dependency — noted as follow-up)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — staging.ts split (mostly rendering; seed & loop core test-covered)

- [x] Task: Extract `move-fx.ts` data module — 50a6389
  - [x] Move `MOVE_FX`, `SHOT_LOOKS`, `elementColor` + `MoveFx`/`ShotSpec`/`ShotLook` types; zero imports from the driver; update importers — also carried BurstStyle/Posture and the CONTACT_T/PROJECTILE_LIFE_MS/PROJECTILE_ARC constants (data shared by tables + flight interpreter); staging.ts imports from `./move-fx`
- [x] Task: Extract `staging-seed.ts` — 418d72e
  - [x] Move `visualSeedOf`; update main/spar/cup imports; keep `staging-seed.test.ts` green (path updates only)
- [x] Task: Extract `staging-fx.ts` with consolidated `EffectLoop` (TDD for the loop core) — commit e265467
  - [x] Write failing tests for the `HitStop` object (trigger below/above threshold, dt=0 during freeze, dt clamp + 16.7 fallback) and the EffectLoop idle/stopped contract (fake RAF/timers, no real timers per workflow)
  - [x] Implement `staging-fx.ts`: flash, projectiles, bursts, decals, charge orb behind one `step(dt)`/alive contract; single RAF; `HitStop` owned by the loop
  - [x] Migrate the action clock and drive loop to consume the shared `HitStop` (semantics unchanged: action clock re-queues without advancing)
- [x] Task: Slim `staging.ts` to driver + `runStep` + cast/clear builders
  - [x] Verify public `Staging` interface unchanged; all call sites untouched (verified post-extraction: cast/applyStep/setBigHitHandler/setDirectorHandler/setMotionPref/setPace/clear intact; importers = main.ts `createStaging` + type-only `FightCasting` in battleUI/cup/spar)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 — CSS consolidation (style-only)

- [ ] Task: Class-ownership cleanup
  - [ ] `.cup-button` → cup.css; `.spar-*` chrome rules gathered into spar.css (out of ranch.css/battle-hud.css); `starter-*` dedupe (starter.css canonical)
- [ ] Task: Scope mock.css under `.mock`
  - [ ] Nest all mock.css selectors; verify mock.html renders identically at `/mock.html`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 — Full gate & docs

- [ ] Task: Full verification
  - [ ] `bun run verify` green; suite runtime unchanged or faster
  - [ ] Visual QA script: Spar (full match, fast-forward, big hit, KO), full cup player match (coach re-pick, give-up modal a11y), mock.html, reduced-motion toggle on/off; browser screenshots + console check per workflow §Phase protocol
- [ ] Task: Docs update
  - [ ] README dev-pages note if module map changed; conductor/learnings.md entry if any lesson emerges
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Notes
- Phase 2's `EffectLoop` consolidation is the only place where timing could subtly shift — the loop core gets real tests (fake timers) and the phase checkpoint includes side-by-side visual QA.
- Zero sim/voxel diff expected; if any sneaks in, stop and re-check the spec.
