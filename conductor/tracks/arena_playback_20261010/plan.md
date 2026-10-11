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

- [x] Task: Arena scene module — top-down neutral floor, boundary ring,
      stands with crowd silhouettes, distinct broadcast lighting (no ranch
      golden-hour).
- [x] Task: Scene-swap orchestration — Spar start → ranch fades out, arena
      fades in; battle end → back to ranch with no state loss (fix
      update-fanout desyncs while wiring).
- [x] Task: Creature staging — both combatants positioned on opposing sides;
      positions, launch lunges, and hit reactions keyed to script steps.
- [x] Task: Phase B verification & checkpoint (Refer to workflow.md)
  - bun run verify green at 67c33e6. Manual captures: broadcast bowl swap on
    fight start with camera hand-off (ARENA_FRAMING radius 9.5), two staged
    fighters on opposing posts with per-step reactions, and the ranch set
    restored on close with no state loss. User-flagged ranch creature
    overlap fixed (setRanchCreatureVisible). [checkpoint: 67c33e6]

## Phase C — VFX & juice (rendering, manual verification)

- [x] Task: Projectile specials — type-hue colored projectiles with short
      trails (Fire 18° / Plant 110° / Water 205° contract; icon accompanies
      color on big moments). [c357907]
- [x] Task: Hit feedback — victim flash + micro hit-stop, camera shake on big
      hits. [81f2739]
- [x] Task: Finishers — KO/celebration moments + result banner (winner,
      ending reason). [97439c1]
- [x] Task: Reduced-motion toggle — HUD settings control bound to the save v5
      pref; disables camera shake and flashes, all gameplay stays legible.
      [957dd78]
- [x] Task: Phase C verification & checkpoint (Refer to workflow.md)
  - bun run verify green at 50f0942 (types, 390 tests, biome, determinism
    gate). Browser evidence: arena swap, staged fighters, live log, KO
    finish + banner, ranch restore with no state loss, reduced-motion
    toggle persists across reload, console clean. User-flagged motion-pill
    overlap on the Play button fixed (pill lifted above the cluster).
    [checkpoint: 50f0942]

## Phase D — Battle HUD, pacing & closeout

- [x] Task: Battle HUD — dual HP bars with names, rangefinder state
      (close/hold), announcer lower-third synced to the active event.
      — `battleHud.ts` + 13 unit cases; `spar-hud` mounted on the spar
      overlay with per-step fill/range/announcer updates; mirror-match
      hpAfter collision fixed in sim via stable side ids (0d72852).
      [commit: a4bee13] [checkpoint-note: a4bee13]
- [x] Task: Log demotion & pacing — compact collapsible secondary log;
      playback speed = normal + fast-forward toggle, no skip.
      — `playbackSpeed.ts` + 3 unit cases; speed pill is now a real
      two-way toggle, log demoted to a collapsible box under the
      announcer. [commit: 6ccbba6] [checkpoint-note: 6ccbba6]
- [x] Task: Broadcast HUD rework — replace the corner-box HUD with a
      top-center placard: skewed plates with element crests, damage-lag
      HP bars draining toward the center VS chip, hit jolts scaled by
      damage, rangefinder chevrons; the spar panel exits during fights
      (arena full-bleed, chips only) and the verdict lands as a
      broadcast stamp. Design ref: `hud-mock.html` in this folder.
      [commit: ed6d16a] [fix: 329d605] [fix: 456513e] [chore: f1004b4] [checkpoint-note: ed6d16a]
- [x] Task: Final polish pass & manual visual verification & checkpoint
      (Refer to workflow.md) — dead-code sweep removed the pre-rework
      result/banner UI (`8aebc76`); broadcast HUD verified live by the
      user (placard, lag bars, jolts, stamp, pacing, log, reduced
      motion, ranch sweep) with all gates green. [commit: 8aebc76]
      [checkpoint: 8aebc76]
## Phase: Review Fixes
- [~] Task: Apply review suggestions (conductor-review findings: staging RAF cancel race, stranded arena mode, impact juice, camera shake anchor, reduced-motion pref wiring, per-frame allocations, plus medium/low sweeps)
