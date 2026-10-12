# Plan: Battle Animation Overhaul — Arena to AAA

**Track ID:** `battle_animation_overhaul_20261012` · **Type:** Feature
Spec: [spec.md](./spec.md) · Workflow rules apply from
[`conductor/workflow.md`](../../workflow.md). TDD (red → green) applies to
logic-bearing tasks only; rendering tasks carry a manual verification path.

## Phase 0 — Arena Anchor Fix & Battle-Feel Sim *(core)*

- [x] **Task: Arena pivot-anchor fix** *(rendering — manual verification)*
      (6b8532d, dbcdfec, 23327ad)
  - [x] Wrap the arena rig in the identity-scale holder (scene.ts pattern):
        Box3-measured visual center, `-center` child offset, holder-driven
        motion in `buildSpot` (`apps/client/src/staging.ts`) — 6b8532d
  - [x] Route KO topple, squash scale composition, and `clear()` reset
        through the holder — 6b8532d
  - [x] Manual: turning + KO topple pivot on visual center
        (learnings §1–3) — user-verified
  - [x] Fallout fixes from honest origins: arena footprint normalization
        to a canonical 1.7 slot (STANCE_GAP 2.1 / CONTACT_GAP 1.8) —
        dbcdfec; knockback direction sign fix in contactReaction —
        23327ad. User-verified builds 3–4.
- [x] **Task: Sim stagger on heavy blows** *(TDD)* (8a1dbbd)
  - [x] Red: failing tests — heavy/super-effective hit applies a
        1-action-window lock; edges (KO blow, final tick, no double-stagger)
  - [x] Green: implement in resolver/clock; update golden stream tests
        deliberately
- [x] **Task: Sim range-shifting knockback** *(TDD)* (2019295)
  - [x] Red: failing tests — knockback shifts far/near state, closing
        costs tempo, edge cases (knockback at range boundary — decided:
        silent no-op; separation is mutual)
  - [x] Green: implement; golden tests updated
- [x] **Task: Finishing-move preference in policy** *(TDD)* — prefer the
        most cinematic lethal special; policy test updated (f9d3474)
- [x] **Task: Rebalance pass** — seed-batch simulations across
        starters/kit stages; record a meta-health note in plan
  - **Meta-health note (400 seeds × 6 starter pairings × kit stages 2/3/4
    × both tactics, baseline via main worktree pre-stagger):** win rates
    are byte-identical to baseline in every cell — the stagger/knockback
    changes flipped no matchup (the type triangle remains fully
    decisive, a pre-existing property: outcomes are seed-independent at
    fixed stats). Zero draws anywhere; average ticks lengthened
    moderately (drake-vs-ox 6.7→8.8–11.6, drake-vs-axolotl 3.9–4.5→
    4.9–5.4, axolotl-vs-ox ~unchanged) — re-close tempo costs stretch
    melee slugfests, still far from the 40-tick cap. Stagger events now
    fire 1.3–4.0×/fight and knockbacks up to 4×/fight in melee
    matchups (0 in ranged-only exchanges, where the victim is far —
    silent no-op as designed): rich choreography material for Phase 1+.
  - **Stagger tuning pass (user feel-check feedback — too overpowering):**
    fraction 0.25→0.35, super-effective now also needs ≥15% max HP, and a
    3-tick re-stagger grace (a recovered fighter always gets to act;
    knockback separation deliberately stays ungated). Post-tuning probe:
    staggers halved to 1.0–2.2/fight, knockbacks unchanged, win rates and
    0-draw health identical, ticks slightly shorter (e932f88).
  - **Known pre-existing imbalance discovered and deferred** (learnings
    §10): Favor Specials never Strikes, and the free basic's 4
    damage/window out-sustains every special (best sustained: Flame
    Charge 3.6/window) — Balanced wins 100% of cross-tactic mirror
    matches; ox kit2/3 mirrors stall into draws. Deliberately out of
    this track's scope; candidate for a dedicated balance track.
- [x] **Task: Phase Verification & Checkpoint (Refer to workflow.md)**
  [checkpoint: e932f88] — verification report attached as a git note on
  e932f88; user approved 2026-10-12.

## Phase 1 — Enriched Playback Contract & Primitive Layer *(core)*

- [x] **Task: Enrich playback contract** *(TDD)*
  - [x] Red: failing playback tests for additive step fields —
        windup/contact/recovery phases, reaction kind, dodge direction,
        KO state, knockback events
  - [x] Green: extend `packages/sim/battle/playback.ts`; resolver outcomes
        untouched (49b7439)
- [x] **Task: playbackDriver passthrough** *(TDD)* — extend
        `playbackDriver.test.ts` for the new fields (c9bd79f; red phase
        vacuous — driver forwards steps verbatim, test pins the contract)
- [x] **Task: Animation primitive layer** *(TDD on pure functions)* —
        pose composition, per-part phased timelines, easing library,
        seed-derived variation; new shared module (arena-first, ranch-ready)
        (ea9a229 — apps/client/src/anim.ts, 17 tests)
- [x] **Task: Refactor staging.ts onto primitives** — behavior-preserving
        for existing moves; squash/gait/breath reuse; manual diff-check
        (051903e — helpers → anim.ts imports, drive loop on stepSquash/approach/
        gaitBob/breathSine, melee timing via phaseAt(PLAYBACK_PHASES.melee);
        user spar on build 5: identical feel)
- [x] **Task: Phase Verification & Checkpoint (Refer to workflow.md)**
        [checkpoint: 051903e]

        Phase 1 scope: 49b7439 (enriched playback contract — phases/reaction/
        dodgeDirection/ko, clock reaction hints), c9bd79f (driver passthrough
        pinned both paths; @apex/sim re-exports), ea9a229 (animation primitive
        layer — 25 tests), 051903e (staging refactor onto primitives).
        Automated: bun test packages/sim 405 green, apps/client 139 green,
        bun run verify green. Diff 6f4617d..HEAD: 850 insertions across
        clock/playback/driver/anim/staging. Manual: user sparred on build 5
        (fresh reload, zero console errors) — gait, breath, squash and melee
        timing confirmed identical; stagger/knockback steps hold beats until
        Phase 2 choreography, as planned. Verification report attached as
        git note on 051903e; user approved 2026-10-12.

## Phase 2 — Choreography Library *(core)*

- [x] **Task: Per-archetype body language** — drake/ox/axolotl locomotion,
        idle, and hurt profiles *(pure parts tested; rendering manual)*
        (cb76f92 — choreo.ts BodyProfile table + staging wiring; camera-track
        arena-mode guard fallout fix a877677; user feel-check builds 6-7)
- [x] **Task: Upgraded shared attack archetype per element** - tier 1-2
        fire/water/plant *(manual)*
  (a6f6ad0 element-flavored shots + mirror-match actorKey fix; 9c27037 point-blank elemental
  bursts; user approved builds 8-11)
- [x] **Task: Bespoke tier 3 special choreography** - 3 moves *(manual)*
  (47f83fd bespoke bodies + spawn size/life/spread; 190a54e systemic actor-body fix +
  point-blank signatures; ec82b2c spore cloud bloom; c8d2879 cinder coil-beat blast;
  user verified all three across species, builds 12-15)
- [x] **Task: Bespoke tier 4 special choreography** - 3 moves *(manual)*
        (02b16f8; user-approved in feel-checks)
- [x] **Task: Unified special-fire pipeline** - data-driven MOVE_FX
        registry (launch schedule + posture curves + arrival treatment
        per move); point-blank specials replay their launch body
        compressed with a micro-flight and land the arrival burst at
        the landing beat; victim reaction moves to the landing beat;
        sim untouched - presentation only (user-directed design change;
        new moves slot in by adding one registry entry)
        (a376c29 + aa5ce63 SHOT_LOOK per-element shot identity;
        user approved builds 18-19)
- [ ] **Task: Reaction library** - dodge/hurt/stagger/knockback/down
        mapped from enriched events *(pure mapping tested; rendering
        manual)*
- [ ] **Task: Phase Verification & Checkpoint (Refer to workflow.md)** —
        full-battle feel-check

## Phase 3 — Camera Director & VFX *(stretch — re-scopeable)*

- [ ] **Task: Camera director core** *(TDD on decision logic)* —
        beat-driven cuts/dollies/projectile tracking/punch-ins; rendering
        manual
- [ ] **Task: Camera modes UX** — settings toggle + live mid-battle
        switch + reduced-motion auto-off *(store test; UI manual)*
- [ ] **Task: Bloom post pass** — graceful degradation on weak GPUs
        *(manual perf check)*
- [ ] **Task: Particles + decals + vignette** — per-element GPU particles,
        hit decals, big-hit vignette *(manual)*
- [ ] **Task: Phase Verification & Checkpoint (Refer to workflow.md)**

## Phase 4 — KO Signature & Polish *(stretch — re-scopeable)*

- [ ] **Task: Time-dilated final blow** *(TDD on pacing math in driver)*
- [ ] **Task: KO staging** — camera orbit, stagger-collapse, dust puff
        *(manual)*
- [ ] **Task: Verdict stamp beat timing** *(driver test + manual)*
- [ ] **Task: Final polish + replay determinism check** — full-battle
        pass; bit-identical replay test green
- [ ] **Task: Phase Verification & Checkpoint (Refer to workflow.md)** —
        plus `conductor-review` prep

## Notes

- P0–P2 are the non-negotiable core; P3–P4 are explicitly re-scopeable
  stretch (agreed with the user at spec time).
- Choreography authoring must start only after Phase 0 battle-feel changes
  land, so moves are authored against the final decision space.
- Quality gate is manual feel-check by the user at each phase checkpoint
  (spec decision), plus determinism/unit tests where they pay.
