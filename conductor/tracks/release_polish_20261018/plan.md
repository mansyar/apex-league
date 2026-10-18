# Plan: Release Polish & Accessibility

**Track ID:** `release_polish_20261018` · **Spec:** [spec.md](./spec.md) ·
**Workflow:** `conductor/workflow.md`

TDD applies to sim and pure client logic (save transfer, import validation,
audio gating, view-models). DOM/visual wiring is verified manually with
`playwright-cli` screenshots, console evidence, and a real keyboard. Every phase
ends with a verification checkpoint and user approval.

## Phase 1 - Save v16, transfer core, corrupt payload (sim, TDD)

- [x] Task: Settings volumes + save v16 (`save/schema.ts`, `save/migrate.ts`,
      `save/storage.ts`, `state.ts`) - deda3f5
  - [x] Failing tests: v16 defaults `musicVolume`/`sfxVolume` to 1; v15 -> v16
        migration adds both without touching anything else; storage rejects
        non-number and out-of-range values; `setMusicVolume`/`setSfxVolume`
        clamp to 0-1; v16 round-trips through save/load.
  - [x] Implement the two settings fields, setters, migration step, and strict
        validation.
- [ ] Task: Transfer core (`save/transfer.ts`, new; `storage.ts` parse
      extraction)
  - [ ] Failing tests: export produces a parseable payload with `session: null`,
        a dated filename, and no mutation; import accepts known/older versions
        and migrates; rejects malformed JSON, invalid shape, and any version
        newer than current with distinct reasons; the current save is untouched
        on failure.
  - [ ] Extract a shared `parseSave(raw)` used by `loadSave` and import;
        implement `buildSaveExport(state)` and `inspectSaveImport(raw)`.
- [ ] Task: Corrupt payload retention (`storage.ts`)
  - [ ] Failing tests: a corrupt boot exposes the original raw string; reading
        it does not rewrite or clear storage; `clearSave` is the only path that
        removes it.
  - [ ] Implement `readRawSave(adapter)` (or equivalent) and keep the corrupt
        branch non-destructive.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] `bun test` on the save suites, `bun run check`, commit; manual browser
        evidence not required (sim-only phase).
  - [ ] Record `[checkpoint: <sha>]` after user approval.

## Phase 2 - Audio mix & Settings volume UI

- [ ] Task: Audio gains (`audio/player.ts`, `audio/playCue.ts`,
      `audio/musicBeds.ts`)
  - [ ] Failing tests: `AudioPlayer` still gates on unlock + mute; SFX gain
        reaches the seam; music and SFX gains stay independent; muted requests
        never reach the seam at any volume; 0 volume is silent; out-of-range
        input is clamped.
  - [ ] Implement `setVolumes({ music, sfx })`, pass SFX gain through the cue
        seam, and apply music gain in `MusicBeds`.
- [ ] Task: Settings volume controls (`settings-modal.ts`, `hud/settings.ts`,
      kit CSS)
  - [ ] Add labeled Music and SFX sliders (0-100, keyboard operable, live
        value); keep the mute chip as the override and preserve the existing
        reset/camera/motion rows.
  - [ ] Wire handlers to the store and audio in `main.ts`; apply persisted
        volumes at boot; verify mute precedence and reload persistence.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Live adjust, reload persistence, mute override, narrow layout; capture
        `playwright-cli` screenshots + console evidence; `bun run verify`.
  - [ ] Record `[checkpoint: <sha>]` after user approval.

## Phase 3 - Save transfer & corrupt recovery surfaces

- [ ] Task: Save transfer UI (`save-transfer.ts`, new; `settings-modal.ts`,
      `main.ts`)
  - [ ] Failing tests (pure helpers): import availability is disabled while a
        cup/battle session is active; confirmation and rejection copy map from
        each import reason; filename/date formatting is stable.
  - [ ] Add "Download save" and "Import save" to Settings with file picker,
        confirmation before replace, calm notices, and reload after success.
- [ ] Task: Corrupt recovery dialog (`recovery.ts`, new; `main.ts`, `copy.ts`)
  - [ ] Failing tests: recovery copy for each boot state; "Download broken save"
        uses the retained bytes; "Start over" requires explicit confirmation.
  - [ ] Replace the ticker-only corrupt notice with a dialog offering
        download-then-reset; keep the calm coach voice.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Export -> fresh profile import; older-version import; newer/malformed
        rejection; corrupt boot download + reset; screenshots + console;
        `bun run verify`.
  - [ ] Record `[checkpoint: <sha>]` after user approval.

## Phase 4 - Accessibility & reduced motion

- [ ] Task: Focus contract (`ui/focus.ts`, new; `battleUI.ts`, overlay owners)
  - [ ] Failing tests for pure focus-order helpers where feasible; otherwise a
        documented manual matrix.
  - [ ] Every overlay (starter, settings, handbook, detail, Hall,
        graduation/nursery, cup/coach/results, spar) moves focus in, traps it,
        closes on Escape/close, and returns focus to its opener; disabled
        controls are skipped by the trap.
- [ ] Task: Keyboard, ARIA, and contrast
  - [ ] Reach every HUD/dock/action control by keyboard with visible focus;
        label sliders and dialogs; announce status via `role=status`; ensure
        meaning is not color-only.
  - [ ] Contrast audit with neutral-token fixes only; record ratios and
        deferred items; verify element hues are unchanged.
- [ ] Task: Reduced-motion matrix
  - [ ] Audit each ceremony/transition (evolution, feed/rest/treat/play,
        petting, graduation send-off, nursery, cup, arena) against the in-game
        setting and `prefers-reduced-motion`; add calm equivalents.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Keyboard-only walkthrough, reduced-motion screenshots, contrast table;
        `bun run verify`.
  - [ ] Record `[checkpoint: <sha>]` after user approval.

## Phase 5 - Release readiness & close

- [ ] Task: Performance baseline & budgets
  - [ ] Record initial JS/CSS gzip, Lighthouse desktop + narrow, and
        listener/DOM cleanliness after closing overlays; enforce the +10% cap and
        fix regressions.
- [ ] Task: Docs truth pass (`README.md`, `docs/save-schema.md`,
      `conductor/tech-stack.md`)
  - [ ] Add the release checklist; document v16 volumes; add the dated
        tech-stack note; correct stale claims.
- [ ] Task: Final acceptance & track close
  - [ ] Walk every spec acceptance criterion; capture device-emulation passes
        (393x659 and narrow desktop) plus the real-device checklist; run
        `bun run verify`; archive the track and update the registry.
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)
  - [ ] Full acceptance matrix recorded; `bun run verify` green.
  - [ ] Record `[checkpoint: <sha>]` after user approval.

## Sequencing notes

- Phase 1 is sim-only and lands the schema before any UI depends on it.
- Phases 2-3 are client surfaces; Phase 3 consumes the Phase 1 transfer core.
- Phase 4 is audit-heavy and must not change element hues or gameplay.
- Phase 5 records budgets and closes the track; no phase touches battle
  resolution or determinism fixtures beyond settings/save plumbing.
