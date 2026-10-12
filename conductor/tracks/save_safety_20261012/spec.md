# Spec — Save Safety & QoL Pass (`save_safety_20261012`)

- **Type:** Bug fix + Feature (QoL pass)
- **Status:** New

## Overview

Close the largest player-trust gaps in the current build: a cup session that
dies on refresh (losing rewards), a silently corrupt save, and a juvenile whose
arena look can diverge from its ranch look. Then add three small
quality-of-life surfaces (creature rename, new game, first-day hints). Rides
one save-schema bump to v7.

## Background (evidence)

- The live-cup session (`CupSession` — bracket, cursor, player verdicts,
  committed flag) is **memory-only** in `apps/client/src/cup.ts`. A page
  refresh after the first cup commit (phase already flipped to `"day"`) hides
  the cup chip, discards the bracket, and `finalizeCup` never runs → placement
  and rewards are silently lost. Pre-commit refresh is safe (free look).
- `loadGame` (`packages/sim/src/save/storage.ts`) returns `null` on a corrupt
  save; `main.ts` falls straight to the starter screen with no message — data
  loss is invisible.
- `apps/client/src/cup.ts` calls `visualSeedOf(creature.stats)` **without the
  stage arg** (defaults to `"baby"`), while `spar.ts` correctly passes
  `owned.stage`. A juvenile fighting in a cup arena is cast with a seed that
  doesn't cancel the evolution boost → arena look can differ from ranch look.
- No way to rename a creature (name is the species display name forever), no
  way to start over (save is only ever overwritten), and no first-day guidance.

## Functional Requirements

### F1 — Cup session persistence (save v7)

- `SaveData` gains a cup-session section: the live `CupSession` (bracket,
  cursor, player verdicts, committed flag) is persisted on every cup
  `commit()`/`onFinalize`.
- A refresh or browser restart at any cup point restores the session:
  - Pre-commit → free bracket look resumes (nothing committed).
  - Post-commit → player lands on the ranch with the cup chip visible and can
    resume the bracket walk at the exact next match/reveal (no auto-resolve).
- A session already finalized in the save is cleared on next cup completion
  (no stale state resurrection).
- `enterCup` (the one-sitting headless reference) remains untouched; session
  persistence is implemented in the client store/save layer, not by re-shaping
  the sim session API.

### F2 — Corrupt-save handling

- When `loadGame` returns null on an existing-but-unreadable save, show a calm
  broadcast-kit notice ("your save couldn't be read — starting a new game")
  before falling through to the starter choice. No salvage attempt.
- Distinguish "no save yet" (no notice) from "save exists but failed to load"
  (notice).

### F3 — Juvenile cup seed fix

- `cup.ts` passes the creature's actual `stage` to `visualSeedOf` so a
  juvenile's cup arena look matches its ranch look (spar path already correct).

### F4 — Creature renaming

- Inline rename from the creature lower-third.
- Trimmed to ≤16 characters; empty input restores the species default name.
- Persisted via save v7.
- Blocked while phase is `"cup"`; allowed in day phase. No AP cost.

### F5 — Reset-save affordance

- A "New game" action in the HUD command dock area opens a confirm modal
  (broadcast kit). On confirm: wipe the save and reload to starter choice.
  No other entry point.

### F6 — First-day onboarding callouts

- Reuse the existing callout precedence chain in `hud.ts`: day-1 AP hint,
  training-tier hint (~day 5), cup-eve hint (day 6).
- Each dismissed by interaction; dismissal state persisted (v7).

## Non-Functional Requirements

- Save v7 with v6→v7 migration following the `docs/save-schema.md` recipe;
  migration tested (fresh v7 + v6 upgrade).
- Logic-bearing changes (session persistence round-trip, migration, rename
  validation/rejection, dismissal state, clearSave) are unit-tested per
  workflow TDD scope; DOM/scene changes verified manually.
- New modals/notices respect broadcast-kit patterns, reduced-motion, and aria
  conventions.
- `bun run verify` green; suite runtime unchanged.

## Acceptance Criteria

1. Enter cup → commit at first fight → refresh → bracket restores at the next
   match; completing it awards full rewards.
2. Refresh pre-commit → free look restored, nothing committed.
3. Corrupted localStorage → notice shown, starter screen loads cleanly.
4. Juvenile spar and cup renders use identical seeds.
5. Rename persists across reload; empty → species default; blocked during cup.
6. "New game" wipes save and returns to starter choice.
7. Each hint shows once and never re-appears after dismissal (persisted).
8. Fresh saves are v7; a v6 save migrates cleanly.

## Out of Scope

- Cup history/replay memory, ladder tiers, champion stage, breeding, audio,
  mobile/responsive CSS, server sync.
