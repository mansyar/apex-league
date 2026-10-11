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
- [ ] **Task: Sim stagger on heavy blows** *(TDD)*
  - [ ] Red: failing tests — heavy/super-effective hit applies a
        1-action-window lock; edges (KO blow, final tick, no double-stagger)
  - [ ] Green: implement in resolver/clock; update golden stream tests
        deliberately
- [ ] **Task: Sim range-shifting knockback** *(TDD)*
  - [ ] Red: failing tests — knockback shifts far/near state, closing
        costs tempo, edge cases (knockback at range boundary — decide and
        test)
  - [ ] Green: implement; golden tests updated
- [ ] **Task: Finishing-move preference in policy** *(TDD)* — prefer the
        most cinematic lethal special; policy test updated
- [ ] **Task: Rebalance pass** — seed-batch simulations across
        starters/kit stages; record a meta-health note in plan
- [ ] **Task: Phase Verification & Checkpoint (Refer to workflow.md)**

## Phase 1 — Enriched Playback Contract & Primitive Layer *(core)*

- [ ] **Task: Enrich playback contract** *(TDD)*
  - [ ] Red: failing playback tests for additive step fields —
        windup/contact/recovery phases, reaction kind, dodge direction,
        KO state, knockback events
  - [ ] Green: extend `packages/sim/battle/playback.ts`; resolver outcomes
        untouched
- [ ] **Task: playbackDriver passthrough** *(TDD)* — extend
        `playbackDriver.test.ts` for the new fields
- [ ] **Task: Animation primitive layer** *(TDD on pure functions)* —
        pose composition, per-part phased timelines, easing library,
        seed-derived variation; new shared module (arena-first, ranch-ready)
- [ ] **Task: Refactor staging.ts onto primitives** — behavior-preserving
        for existing moves; squash/gait/breath reuse; manual diff-check
- [ ] **Task: Phase Verification & Checkpoint (Refer to workflow.md)**

## Phase 2 — Choreography Library *(core)*

- [ ] **Task: Per-archetype body language** — drake/ox/axolotl locomotion,
        idle, and hurt profiles *(pure parts tested; rendering manual)*
- [ ] **Task: Upgraded shared attack archetype per element** — tier 1–2
        fire/water/plant *(manual)*
- [ ] **Task: Bespoke tier 3 special choreography** — 3 moves *(manual)*
- [ ] **Task: Bespoke tier 4 special choreography** — 3 moves *(manual)*
- [ ] **Task: Reaction library** — dodge/hurt/stagger/knockback/down
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
