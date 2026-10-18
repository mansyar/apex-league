# Spec: Release Polish & Accessibility

**Track ID:** `release_polish_20261018`
**Type:** Feature (polish + accessibility, no gameplay content)
**Status:** Approved 2026-10-18
**Branch:** `track/release_polish_20261018`

## Overview

Make the vertical slice release-ready without adding gameplay content:
trustworthy save handling (export, validated import, corrupt-save recovery),
complete audio control (music/SFX volumes), a pragmatic accessibility pass over
every surface, a full reduced-motion audit, and recorded release/performance
budgets with a truth-checked checklist.

Save schema advances to **v16** for persisted volumes. Battle and simulation
behavior is otherwise unchanged: same deterministic resolver, same content, same
ladder.

## Functional Requirements

### FR1 — Save export

- Settings offers a "Download save" action.
- It serializes the current `GameState` (the live cup/battle session is excluded
  and exported as idle) as readable JSON with a dated filename such as
  `apex-league-save-v16-2026-10-18.json`.
- Export works whenever a save exists, never mutates state, and is available
  even while a session is active (the session is simply not included).

### FR2 — Save import

- Settings offers an "Import save" action backed by a file picker.
- The payload is parsed, version-checked, and migrated with the existing
  migration path **before** anything is replaced.
- Accepted: any known version at or below the current version.
- Rejected with a calm notice and no state change: malformed JSON, invalid
  shape, and versions newer than the current version.
- Import requires explicit confirmation, is disabled while a cup or battle
  session is active (with an explanatory label), and reloads the app after a
  successful replace.
- On any failure the current save stays byte-identical.

### FR3 — Corrupt-save recovery

- When boot cannot read the save, the player gets a dedicated recovery dialog
  instead of only the status-ticker line.
- The dialog explains the situation in the coach voice and offers:
  - **Download broken save** — the raw stored payload, unchanged bytes.
  - **Start over** — the existing reset flow behind an explicit confirmation.
- The broken payload is not overwritten before the player has had the chance to
  download it. Only "Start over" clears it.

### FR4 — Music/SFX volume

- Settings gains Music and SFX sliders (0–100%, keyboard operable, current value
  visible).
- Changes apply live through the existing audio cue/player and music-bed seams.
- The existing mute toggle remains and overrides both volumes.
- Volumes persist in the save and are restored on boot.

### FR5 — Save v16

- `settings` gains `musicVolume` and `sfxVolume` (numbers 0–1, defaults `1.0`).
- Additive v15 → v16 migration; older saves default both to `1.0` and otherwise
  migrate unchanged.
- Storage validation rejects non-numbers and out-of-range values like every
  other settings field.
- Export/import round-trips both values.
- `docs/save-schema.md` documents v16 and the new fields.

### FR6 — Accessibility audit

- Every modal/overlay (starter, settings, handbook, creature detail, Hall of
  Fame, graduation/nursery, cup/coach room/results, spar) is fully keyboard
  operable: focus moves in on open, is trapped, closes via Escape and its close
  control, and returns to the opener.
- All HUD/dock/action controls are reachable by keyboard with visible focus.
- Dialogs expose roles and accessible names; sliders expose names and values;
  status changes use the existing `role=status` pattern.
- Meaning is never carried by color alone (badges keep text labels).
- No precision-timing or dexterity gates are introduced.

### FR7 — Reduced-motion audit

- Every ceremony and transition is verified against both the in-game setting and
  `prefers-reduced-motion`: evolution, feed/rest/treat/play, petting, graduation
  send-off, nursery hatch, cup entrance, and arena playback intros.
- Each has a calm equivalent that removes shake, flash, and travel where needed;
  gameplay remains legible.
- Findings and fixes are recorded as a matrix in the plan/verification note.

### FR8 — Contrast (neutrals only)

- Audit text/scrim/panel contrast and adjust only neutral ink/scrim/panel tokens
  where there is a clear failure.
- Element hues (the six-type color contract) are untouched.
- Ratios and any deferred items are documented.

### FR9 — Performance budgets

- Record baseline initial JS/CSS (gzip), Lighthouse performance/accessibility for
  desktop and a narrow profile, and DOM/listener cleanliness after closing each
  overlay.
- Gate: initial JS may grow at most **+10%** over the recorded baseline.
- No new per-frame work, timers, or retained listeners.

### FR10 — Release checklist and docs truth

- `README.md` gains a release checklist: boot, save export/import, corrupt
  recovery, volumes, keyboard pass, reduced motion, narrow pass, clean console,
  `bun run verify`.
- `conductor/tech-stack.md` gains a dated note for save v16 and the volume mix.
- Stale status/roadmap claims are corrected.

### FR11 — Copy

- All new copy stays in the warm coach voice, at most two sentences, blame-free,
  with explicit consequences before destructive actions.

## Non-Functional Requirements

- No new dependencies and no framework introduction.
- Pure logic (migration, import validation, volume clamping/gating) is
  TDD-covered and deterministic.
- DOM/visual work is verified manually with `playwright-cli` screenshots and
  console evidence, plus a keyboard-only pass.
- Existing v15 saves load unchanged; v15 → v16 loses nothing; a v16 export
  imports identically on a fresh browser profile.
- Battle/sim behavior and the determinism gate stay untouched and green.
- Refresh/reload remains session-friendly: no lost progress after import or
  recovery.

## Acceptance Criteria

1. Export downloads a valid save; importing it into a fresh profile restores
   day, creature, Hall/lineage, ladder, AP, and settings exactly.
2. Importing a v14/v15 file migrates correctly; importing newer-version or
   malformed JSON shows a notice and leaves the live save byte-identical.
3. Corrupt boot shows the recovery dialog; "Download broken save" returns the
   original bytes; "Start over" requires confirmation and lands on the starter
   choice.
4. Music/SFX sliders change loudness live, persist across reload, and mute still
   overrides; v15 → v16 migration defaults both to 100%.
5. A keyboard-only walkthrough completes starter choice → care → training → cup
   entry/coach room → graduation/nursery → Hall → detail → handbook → settings,
   with focus returning correctly everywhere and no traps.
6. The reduced-motion matrix has an entry per ceremony; every entry passes with
   the in-game setting and with OS `prefers-reduced-motion`, with screenshots for
   the changed surfaces.
7. The contrast audit table is recorded; only neutral tokens changed; element
   hues verified unchanged.
8. Performance numbers are recorded and initial JS is within +10%; no new
   rAF/timers/listener leaks.
9. `playwright-cli` iPhone-class (393×659) and narrow-desktop passes are
   captured; a real-device checklist is documented as follow-up.
10. Docs match v16; the README checklist exists; `bun run verify` exits 0.

## Out of Scope

- Save slots, cloud sync/backend, accounts, leaderboards.
- Living roster, egg inventory, new species/moves/art, balance changes.
- Audio content expansion (new music/SFX), loudness normalization, per-element
  mixing.
- A formal WCAG 2.1 AA conformance claim; localization; real-hardware
  certification.

## Risks

- **Save corruption during import/migration** → validate and migrate before
  replacing, keep the current payload untouched on failure, test round-trips
  first.
- **Focus regressions across many overlays** → one shared focus contract and an
  audit table, fixed per phase.
- **Scope creep into a visual redesign** → neutrals-only contrast rule and the
  explicit out-of-scope list.
- **Volume clipping** → clamp 0–1, verify at the player seam, defaults at 1.0
  with mute unchanged.
