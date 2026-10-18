# Spec - Ranch Rituals

- **Track ID:** `ranch_rituals_20261018`
- **Type:** Feature
- **Branch:** `track/ranch_rituals_20261018`

## Overview

Care on the ranch is currently four interchangeable HUD buttons: only feeding
has a 3D ceremony, rest/treat/play are invisible, there is no way to physically
interact with the creature, and the ranch is silent apart from its music bed.
Meanwhile the sim's nightly recovery (+60 energy) makes the Rest action
strictly dominated — the daily AP decision has no bite. This track makes care
**tangible**: a free ambient pet interaction, distinct ceremonies for
rest/treat/play, a full CC0 sound pack for the care loop with a dawn chime,
and one deliberate sim tuning change — healthy nights restore **0** energy so
Rest becomes a real allocation decision. Relief tiers for sick/starving nights
are kept so neglect never hard-stalls.

## Functional Requirements

- **FR1 - Sim: night energy rebalance** (`packages/sim/src/settlement.ts`):
  `NIGHT_RECOVERY.rested: 60 -> 0`. Sick (30) / starving (20) /
  starving+sick (10) relief tiers unchanged — a neglected creature can still
  climb out. Rest (+40, 1 AP, `REST_ENERGY_RESTORE`) becomes the primary
  healthy energy source. No other settlement rule changes; sickness/mood/bond/
  evolution gates untouched. Golden stream tests updated deliberately as a
  tuning change (documented, not silent).
- **FR2 - Ambient pet** (presentation-only): a distinct click/tap (not
  orbit-drag) raycasts the creature mesh and triggers a mood-aware reaction —
  happy bounce at high mood, a subdued lean at low mood/droopy — plus a CC0
  chirp cue. No AP, no sim state, spam-cooldown so it can't be farmed
  visually. Touch and mouse parity; must never hijack orbit-drag or the
  plate-head -> detail-modal path.
- **FR3 - Rest ceremony**: curl-down + closed-eye breathing sleep pose for the
  action, ending in a wake-and-stretch. Soft ambient cue.
- **FR4 - Treat ceremony**: a balm-application moment (coach-hand beat +
  sparkle relief) as the creature settles; distinct sick-creature posture
  beforehand.
- **FR5 - Play ceremony**: a tossable prop (existing tuft/prop vocabulary) the
  creature chases via the existing gait/wander systems; ends in a happy bounce.
- **FR6 - Care SFX pack (CC0)**: cues for feed/rest/treat/play, the pet
  chirp, and a soft dawn chime when Advance Day resolves — wired through the
  existing `AudioPlayer.playCue` / `MusicBeds` foundation. Missing-file/codec
  failure degrades silently; mute honored; calm-mix variant behavior follows
  the existing audio-foundation rules.
- **FR7 - Reduced motion**: all ceremonies simplify (no large travel/scale
  motion) under the reduced-motion preference, single-sourced via `motion.ts`,
  consistent with existing staging behavior.

## Non-Functional Requirements

- No save schema change (tuning only — save stays v14; no migration).
- Determinism contract preserved: the only sim delta is the FR1 constant;
  per-day seeded RNG stream shape unchanged.
- Ceremony triggers are event-driven, not polled; no per-frame allocations.
- Pure logic (recovery tiers, pet cooldown/reaction picker) is unit-tested
  DOM-free; scene/ceremony wiring verified manually per workflow.md.

## Acceptance Criteria

- `bun run verify` green, including updated settlement tests proving: healthy
  night -> 0 recovery, sick/starving relief tiers intact, Rest restores +40.
- Petting works with mouse and touch, is distinguishable from orbit-drag,
  respects cooldown, and triggers the mood-aware reaction + chirp.
- Each of rest/treat/play produces a distinct visible ceremony + SFX; dawn
  chime fires on day advance; all silent when muted and calm under
  reduced-motion.
- Manual Playwright pass: pet on desktop + touch, all three ceremonies, chime,
  no orbit interference.

## Out of Scope

- New mechanical teeth for mood/bond/energy in cups or training payouts
  (candidate for the "Care That Matters" follow-up).
- Feed ceremony rework, economy/items, breeding, rival persistence.
