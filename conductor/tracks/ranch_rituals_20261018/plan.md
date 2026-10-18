# Plan - Ranch Rituals

- **Track ID:** `ranch_rituals_20261018`
- **Spec:** [spec.md](./spec.md)
- **Workflow:** `conductor/workflow.md` (TDD for logic-bearing tasks; manual
  verification for scene/audio wiring; `bun run verify` gates every commit)

## Phase 1 - Sim: make Rest meaningful

- [x] Task: Night energy rebalance (TDD)
  - [x] Failing tests first: healthy night restores **0** energy; sick (30) /
        starving (20) / starving+sick (10) relief tiers unchanged; Rest action
        still +40; sickness-roll and mood/bond/evolution gates unaffected.
        Update golden settlement fixtures deliberately with a tuning-change
        note. `[feat(sim): healthy nights restore no energy - rest is the way 7f5b6ea]`
  - [x] Implement `NIGHT_RECOVERY.rested: 60 -> 0` in
        `packages/sim/src/settlement.ts` to green; sweep downstream copy for
        sleep-recovery claims (`hud/copy.ts`, `handbook.ts`) — sweep clean,
        no copy claimed nightly recovery. `[feat(sim): healthy nights restore no energy - rest is the way 7f5b6ea]`
  - [x] Commit `feat(sim): healthy nights restore no energy - rest is the way`
        `[feat(sim): healthy nights restore no energy - rest is the way 7f5b6ea]`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
      `[checkpoint: 7f5b6ea]` - approved 2026-10-18; gates: bun test 1388 pass / 0 fail, bun run verify exit 0; browser evidence: day-advance keeps energy (80 stayed 80), Rest +40 unclamped, Play drains, console clean

## Phase 2 - Care SFX pack (CC0)

- [x] Task: Pure care-cue mapping table (TDD) `8fabfa3`
  - [ ] Failing tests: feed/rest/treat/play + pet chirp + dawn chime -> cue
        ids; calm-mix variants under reduced-motion; muted -> silent.
  - [ ] Implement the `audio/` cue-table extension DOM-free to green.
  - [ ] Commit `feat(audio): ranch care cue mapping`
- [x] Task: Bundle CC0 assets `cdb344c`
  - [ ] Curate CC0 cues (Kenney sets + soft chime), commit under the client
        app with a size-budget note; manual verify dev-server 200s.
  - [ ] Commit `assets(audio): bundle CC0 care cues + dawn chime`
- [x] Task: Wire care cues into ranch handlers `f341f7b`
  - [ ] `onCare` / `onAdvanceDay` / pet paths through `AudioPlayer.playCue`;
        silent degradation; manual browser verify (all cues, mute, calm-mix).
  - [ ] Commit `feat(audio): care SFX on the ranch`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `[checkpoint: f341f7b]`

## Phase 3 - Care ceremonies (rest / treat / play)

- [~] Task: Rest ceremony
  - [ ] `ranch-motion.ts`: curl-down sleep pose + breathing, wake-and-stretch;
        reduced-motion simplification; manual verify.
  - [ ] Commit `feat(ranch): rest ceremony`
- [ ] Task: Treat ceremony
  - [ ] Balm moment + sparkle relief with subdued posture beforehand;
        reduced-motion; manual verify.
  - [ ] Commit `feat(ranch): treat ceremony`
- [ ] Task: Play ceremony
  - [ ] Tossable prop chase via existing gait/wander systems, happy-bounce
        finish; reduced-motion; manual verify.
  - [ ] Commit `feat(ranch): play ceremony`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 - Ambient pet

- [ ] Task: Pet reaction picker + cooldown (TDD)
  - [ ] Failing tests: pure picker — mood bands -> reaction variant, droopy
        override, cooldown gate. Implement to green.
  - [ ] Commit `feat(ranch): pet reaction picker`
- [ ] Task: Pointer wiring + raycast pet
  - [ ] Click-vs-drag discrimination on the canvas (never hijack orbit, never
        touch the plate-head modal path); raycast the creature mesh; wire
        reaction + chirp; touch parity.
  - [ ] Commit `feat(ranch): ambient pet interaction`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
