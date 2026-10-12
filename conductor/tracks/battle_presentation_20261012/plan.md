# Plan: Battle Presentation Layer Refactor

Track: `battle_presentation_20261012` · Type: refactor · Branch: `battle_presentation_20261012`

TDD applies to logic-bearing code (pure helpers, loop core). Rendering/DOM wiring
is verified manually per `workflow.md` (browser screenshots + console check at
phase checkpoints).

## Phase 1 — Foundations: utilities & shared battle UI (logic-bearing)

- [x] Task: `disposeObject3D` utility (TDD) — 8e96168
  - [x] Write failing tests for `scene-utils.ts::disposeObject3D` (Mesh vs Group traversal, array vs single material, geometry+material disposed)
  - [x] Implement; make tests pass
  - [x] Replace the traversal copies in `scene.ts` (×2), `arena.ts`, `gallery.ts`, `staging.ts` (×3) — 7 sites total (gallery.ts found during implementation)
- [x] Task: `battleUI.ts` pure helpers (TDD) — 22fe6c7
  - [x] Write failing tests for `reasonLine` (ko / double_ko / forfeit / time endings), verdict-stamp title selection (winner-side scan incl. mirror-match), kit-picker lock rule (tier gating, min-2 toggle), tactic-row selection contract — implemented `reasonLine` + `winningSideKey` (ko / double_ko / time; winner-side scan incl. all-zero tie rule); kit-picker/tactic-row helpers land with the DOM factories task below
  - [x] Implement helpers as pure functions taking data/callbacks (no DOM in tests)
- [ ] Task: `battleUI.ts` DOM factories (manual verification path)
  - [ ] Extract kit-picker and tactic-row factories (read/write callback strategy), `castingFor`, arena enter/exit choreography into `battleUI.ts`
  - [ ] Rewire `spar.ts` and `cup.ts` to consume the shared layer; delete the duplicated copies
- [ ] Task: a11y additions (manual verification path)
  - [ ] Cup give-up modal: focus trap + Escape + `role="dialog"`/`aria-modal` + focus restore (reuse hud.ts's `trapFocus` pattern — extract to shared util if identical)
  - [ ] `aria-pressed` on fast-forward controls (spar + cup); focus restoration on overlay close
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 — staging.ts split (mostly rendering; seed & loop core test-covered)

- [ ] Task: Extract `move-fx.ts` data module
  - [ ] Move `MOVE_FX`, `SHOT_LOOKS`, `elementColor` + `MoveFx`/`ShotSpec`/`ShotLook` types; zero imports from the driver; update importers
- [ ] Task: Extract `staging-seed.ts`
  - [ ] Move `visualSeedOf`; update main/spar/cup imports; keep `staging-seed.test.ts` green (path updates only)
- [ ] Task: Extract `staging-fx.ts` with consolidated `EffectLoop` (TDD for the loop core)
  - [ ] Write failing tests for the `HitStop` object (trigger below/above threshold, dt=0 during freeze, dt clamp + 16.7 fallback) and the EffectLoop idle/stopped contract (fake RAF/timers, no real timers per workflow)
  - [ ] Implement `staging-fx.ts`: flash, projectiles, bursts, decals, charge orb behind one `step(dt)`/alive contract; single RAF; `HitStop` owned by the loop
  - [ ] Migrate the action clock and drive loop to consume the shared `HitStop` (semantics unchanged: action clock re-queues without advancing)
- [ ] Task: Slim `staging.ts` to driver + `runStep` + cast/clear builders
  - [ ] Verify public `Staging` interface unchanged; all call sites untouched
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
