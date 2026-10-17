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
- [ ] Task: Pure sound-cue mapping table (TDD)
  - [ ] Write failing tests first: battle/step events → cue ids; calm-mix
        variant selection (reduced-motion → soft variants); muted → no cues
  - [ ] Implement `audio/cues.ts` (DOM-free) to green; commit
        `feat(audio): pure event-to-cue mapping + calm-mix selection`
- [ ] Task: Player with silent fallback + unlock gate
  - [ ] TDD the pure gating logic (unlocked-before-gesture state, mute gate);
        imperative playback wrapper verified manually
  - [ ] Commit `feat(audio): player wrapper with no-op fallback + autoplay unlock`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2 - Settings & Save v13

- [ ] Task: Save v13 + migration (TDD)
  - [ ] Failing tests: v12→v13 migration adds the audio settings slot (muted
        flag, default false); round-trip save/load
  - [ ] Implement schema/migration to green; commit
        `feat(save): v13 audio settings + migration`
- [ ] Task: Settings modal mute toggle
  - [ ] Wire persisted toggle in the consolidated settings modal (manual
        verify)
  - [ ] Commit `feat(audio): persisted mute toggle in settings`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3 - Battle Arena SFX

- [ ] Task: Wire cues into the shared playback stream (Spar + cup arena)
  - [ ] Map step/event stream entries through the cue table to the player
        (manual verify in browser: hits, projectile fire, KO stamp, verdict)
  - [ ] Commit `feat(audio): battle SFX through the playback stream`
- [ ] Task: Fast-forward + reduced-motion behavior
  - [ ] Verify natural density at fast-forward and silence in dump mode
        (manual); adjust mapping if noisy
  - [ ] Commit any mapping tweaks `fix(audio): ff/dump-mode cue behavior`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4 - Music Beds & Crossfade

- [ ] Task: Scene-driven beds
  - [ ] Ranch loop during day phase; arena loop during battles/cups;
        crossfade on scene swap; stop when muted (manual verify)
  - [ ] Commit `feat(audio): ranch/arena music beds with scene crossfade`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5 - Wrap-up

- [ ] Task: Dated tech-stack note (Audio section: implementation shape,
        asset source); record learnings if any
- [ ] Task: Final sweep — `bun run verify`, full manual pass, archive
        readiness
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
