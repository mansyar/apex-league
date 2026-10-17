# Plan — Audio Foundation Pass

- **Track ID:** `audio_foundation_20261017`
- **Spec:** [spec.md](./spec.md)
- **Workflow:** `conductor/workflow.md` (TDD for logic-bearing tasks; manual
  verification for audio wiring; `bun run verify` gates every commit)

## Phase 1 - Audio Foundation (module + assets)

- [x] Task: Source & bundle Kenney CC0 assets
  - [x] Download/curate: impact SFX set, two music loops (ranch + arena
        mood); commit under the client app with a size budget note
        `[assets(audio): bundle Kenney CC0 SFX + OpenGameArt CC0 music beds 1423c45]`
  - [x] Manual verify: assets load via dev server, no runtime network fetch
        (200 audio/ogg for sfx + music on the dev server) `[assets(audio): bundle Kenney CC0 SFX + OpenGameArt CC0 music beds 1423c45]`
- [x] Task: Pure sound-cue mapping table (TDD)
  - [x] Write failing tests first: battle/step events → cue ids; calm-mix
        variant selection (reduced-motion → soft variants); muted → no cues
        `[feat(audio): pure event-to-cue mapping + calm-mix selection 7d9b6b4]`
  - [x] Implement `audio/cues.ts` (DOM-free) to green; commit
        `feat(audio): pure event-to-cue mapping + calm-mix selection`
        `[feat(audio): pure event-to-cue mapping + calm-mix selection 7d9b6b4]`
- [x] Task: Player with silent fallback + unlock gate
  - [x] TDD the pure gating logic (unlocked-before-gesture state, mute gate);
        imperative playback wrapper verified manually
        `[feat(audio): player wrapper with no-op fallback + autoplay unlock c52907c]`
  - [x] Commit `feat(audio): player wrapper with no-op fallback + autoplay unlock`
        `[feat(audio): player wrapper with no-op fallback + autoplay unlock c52907c]`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
      `[checkpoint: c52907c]` — approved 2026-10-17; gates: bun check (159 files), biome, 1310 tests (16 new audio), determinism OK; assets verified 200 audio/ogg on dev server :5177

## Phase 2 - Settings & Save v13

- [x] Task: Save v13 + migration (TDD)
  - [x] Failing tests: v12→v13 migration adds the audio settings slot (muted
        flag, default false); round-trip save/load
        `[feat(save): v13 audio settings + migration c79f01d]`
  - [x] Implement schema/migration to green; commit
        `feat(save): v13 audio settings + migration`
        `[feat(save): v13 audio settings + migration c79f01d]`
- [x] Task: Settings modal mute toggle
  - [x] Wire persisted toggle in the consolidated settings modal (manual
        verify)
        `[feat(audio): persisted mute toggle in settings 66fe3c0]`
  - [x] Commit `feat(audio): persisted mute toggle in settings`
        `[feat(audio): persisted mute toggle in settings 66fe3c0]`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
      `[checkpoint: 66fe3c0]` — approved 2026-10-17; gates: bun run verify green (tsc/biome/1317 tests/determinism); browser evidence: chip flip + aria-pressed + apex.save v13 muted persist + reload survival

## Phase 3 - Battle Arena SFX

- [x] Task: Wire cues into the shared playback stream (Spar + cup arena)
  - [x] Map step/event stream entries through the cue table to the player
        (manual verify in browser: hits, projectile fire, KO stamp, verdict)
        `[feat(audio): battle step cues through the playback stream b34e46b]`
  - [x] Commit `feat(audio): battle SFX through the playback stream`
        `[feat(audio): battle step cues through the playback stream b34e46b]`
- [x] Task: Fast-forward + reduced-motion behavior
  - [x] Verify natural density at fast-forward and silence in dump mode
        (manual); adjust mapping if noisy
        `[feat(audio): battle step cues through the playback stream b34e46b]`
        — dump silence verified structurally (`playStepCue` early-returns on
        `instant`; cues tests cover calm variants); FF density = one cue per
        step at faster cadence, KO dilation keeps the stamp gap; live
        audition deferred to the user (agent tab is visibility:hidden —
        Chrome throttles its timers, so paced playback can't be observed)
  - [x] Commit any mapping tweaks `fix(audio): ff/dump-mode cue behavior`
        (none needed — mapping left as approved)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
      `[checkpoint: b34e46b]` — approved 2026-10-17; gates: bun run verify green (tsc/biome/1319 tests/determinism); in-browser evidence: gate pipeline (locked drop → unlock pass → muted drop → mapped cue) via __audioLog; live FF audition deferred to user (hidden-tab timer throttling)

## Phase 4 - Music Beds & Crossfade

- [x] Task: Scene-driven beds
  - [x] Ranch loop during day phase; arena loop during battles/cups;
        crossfade on scene swap; stop when muted (manual verify)
        `[feat(audio): ranch/arena music beds with scene crossfade 127e0e0]`
        — in-browser evidence: arena bed 0→0.35 while ranch 0.32→0 then
        pause (concurrent ramps, one mixer interval); mute fades arena to
        0 → pause; unmute resumes; beds.test.ts covers the scene→URL table
  - [x] Commit `feat(audio): ranch/arena music beds with scene crossfade`
        `[feat(audio): ranch/arena music beds with scene crossfade 127e0e0]`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
      `[checkpoint: 127e0e0]` — approved 2026-10-17; gates: bun run verify green; in-browser evidence: concurrent crossfade ramps (arena 0→0.35 / ranch 0.32→0→pause), mute fade-out + instant resume

## Phase 5 - Wrap-up

- [x] Task: Dated tech-stack note (Audio section: implementation shape,
        asset source); record learnings if any
        `[docs(tech-stack): audio foundation note …]` (with the wrap-up commit)
        — learning recorded: hidden-tab timer throttling blocks paced-playback
        observation from the automation tab; verify audible paths with the
        gate pipeline + user audition instead
- [x] Task: Final sweep — `bun run verify`, full manual pass, archive
        readiness
        `[feat(audio): …]` (final gates: 1320 pass / 0 fail, determinism OK)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)
      `[checkpoint: d094e9d]` — approved 2026-10-17; final gates: bun run verify EXIT 0 (1320 pass / 0 fail / 30358 expects, tsc ×3, biome, determinism byte-identical)
