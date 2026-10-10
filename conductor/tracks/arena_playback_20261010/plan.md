# Plan: Battle Arena Playback (`arena_playback_20261010`)

Follows `conductor/workflow.md`: logic-bearing tasks are test-first
(red → green), rendering tasks carry a manual verification note, and every
phase ends with a verification & checkpoint task.

## Phase A — Playback scripting & save v5 (logic, TDD)

- [x] Task: Playback script builder (event → animation script)
  - [ ] Failing tests: pure-TS mapping `BattleEvent[]` → ordered
        `AnimationStep[]` with durations; complete coverage of event kinds
        (move-up, launch, hit, miss/dodge, KO, endings); final state matches
        the resolver result.
  - [ ] Implement `buildPlaybackScript` (DOM-free, deterministic) in
        `@apex/sim` battle exports.
  - [ ] Run suite; commit + git note.
- [x] Task: Save v5 — reduced-motion preference
  - [ ] Failing tests: v4→v5 migration (default full motion), persisted pref
        round-trips, older saves load cleanly.
  - [ ] Extend migration chain to v5.
  - [ ] Run suite; commit + git note.
- [x] Task: Phase A verification & checkpoint (Refer to workflow.md)
  - bun run verify fully green (typecheck, biome, tests, determinism gate) at
    b8c4a57. Tests: 32 pass in save suite (v5 default/toggle/corrupt), 11 pass
    in playback suite (1:1 mapping, beats, pass-through, monotonic ticks,
    final-hp parity, KO down step, empty-log safety). [checkpoint: b8c4a57]

## Phase B — Arena scene & presentation (rendering, manual verification)

- [ ] Task: Arena scene module — top-down neutral floor, boundary ring,
      stands with crowd silhouettes, distinct broadcast lighting (no ranch
      golden-hour).
- [ ] Task: Scene-swap orchestration — Spar start → ranch fades out, arena
      fades in; battle end → back to ranch with no state loss (fix
      update-fanout desyncs while wiring).
- [ ] Task: Creature staging — both combatants positioned on opposing sides;
      positions, launch lunges, and hit reactions keyed to script steps.
- [ ] Task: Phase B verification & checkpoint (Refer to workflow.md)

## Phase C — VFX & juice (rendering, manual verification)

- [ ] Task: Projectile specials — type-hue colored projectiles with short
      trails (Fire 18° / Plant 110° / Water 205° contract; icon accompanies
      color on big moments).
- [ ] Task: Hit feedback — victim flash + micro hit-stop, camera shake on big
      hits.
- [ ] Task: Finishers — KO/celebration moments + result banner (winner,
      ending reason).
- [ ] Task: Reduced-motion toggle — HUD settings control bound to the save v5
      pref; disables camera shake and flashes, all gameplay stays legible.
- [ ] Task: Phase C verification & checkpoint (Refer to workflow.md)

## Phase D — Battle HUD, pacing & closeout

- [ ] Task: Battle HUD — dual HP bars with names, rangefinder state
      (close/hold), announcer lower-third synced to the active event.
- [ ] Task: Log demotion & pacing — compact collapsible secondary log;
      playback speed = normal + fast-forward toggle, no skip.
- [ ] Task: Final polish pass & manual visual verification & checkpoint
      (Refer to workflow.md)