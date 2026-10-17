# Spec — Audio Foundation Pass

- **Track ID:** `audio_foundation_20261017`
- **Type:** Feature
- **Branch:** `track/audio_foundation_20261017`

## Overview

The game is completely silent. This track adds an audio foundation: a bundled
set of Kenney CC0 sound assets, a thin playback layer, battle-arena SFX driven
by the deterministic sim event stream, two scene-driven music beds (ranch +
arena) with crossfade on scene swap, and a persisted mute toggle with a
calm-mix variant for reduced-motion users. Audio is presentation-only,
sim-external, and must never affect determinism.

## Functional Requirements

- **FR1 — Audio module**: `apps/client/src/audio/` with (a) a pure, DOM-free
  event→sound mapping table (sim/battle events → sound ids), unit-tested;
  (b) an imperative player wrapping `HTMLAudioElement`/WebAudio with a silent
  no-op fallback when audio is unavailable (headless/tests).
- **FR2 — Bundled CC0 assets**: Kenney packs (impact SFX, interface/UI sounds
  as needed for battle cues, two music loops) committed under the client app;
  no network fetching; no attribution obligation (CC0).
- **FR3 — Battle arena SFX**: hit impacts, projectile fire, and KO/verdict
  stingers trigger from the sim event stream via the shared playback driver.
  At fast-forward, SFX fire at natural event density (no throttling);
  reduced-motion dump mode stays silent. Applies to both Spar and the cup
  arena (shared driver).
- **FR4 — Music beds**: one ranch loop during the day phase, one arena loop
  during battles/cups; scene-driven crossfade on swap; loops stop entirely
  when muted.
- **FR5 — Mute toggle**: persisted in save settings — **save v13** with a
  v12→v13 migration. Sound is **ON by default** on first visit; actual
  playback begins after the first user gesture (browser autoplay unlock),
  handled once in player init.
- **FR6 — Calm-mix**: when the OS reduced-motion preference is on
  (single-sourced via `motion.ts`), a calmer variant set plays (quieter/softer
  cues, no stinger punch). Not persisted — follows the live preference each
  session.
- **FR7 — Toggle placement**: mute control lives in the consolidated settings
  modal only; no HUD chip.

## Non-Functional Requirements

- No per-frame allocations in render loops; audio triggers are event-driven,
  not polled.
- Test suite stays fast and DOM-free — the mapping table and settings
  migration are unit-tested; player wiring is verified manually.
- Audio failure (missing file, unsupported codec) degrades silently — never
  breaks the scene.

## Acceptance Criteria

- `bun run verify` green; new pure modules tested (mapping table, v13
  migration, calm-mix selection).
- Spar and cup arena play SFX from the event stream; fast-forward densifies
  naturally; dump mode is silent.
- Ranch/arena beds crossfade on scene swap; mute persists across reloads
  (v13).
- First visit: no audio before first interaction; after gesture, sound plays.
- Reduced-motion session plays the calm-mix variants.

## Out of Scope

- Mixing/mastering polish (per-surface volume sliders, loudness
  normalization, ducking).
- Ceremony/UI-chrome cues (feeding, evolution, graduation, clicks) — future
  track.
- Voice/announcer audio, backend audio concerns, dynamic music.
