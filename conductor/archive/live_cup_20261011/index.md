# Live Cup — viewable stepwise tournament

*Status: **in progress** — branch `track/live_cup_20261011`*

Legend: `[ ]` pending / `[~]` in progress / `[x]` complete

- The cup becomes a live, watchable tournament: bracket HUD filling in
  strict match order, rival verdicts staggering in, and the player's matches
  fought in the 3D arena after a coach screen (rival card + kit re-pick +
  tactic pick). Hybrid resolution (player-independent rival battles
  pre-resolve; player battles resolve live at fight time), give-up forfeit
  flow, results screen with reward breakdown.
- **Type:** Feature (converges `cup_day_20261011` + `arena_playback_20261010`)
- **Spec:** [spec.md](./spec.md)
- **Plan:** [plan.md](./plan.md)
- **Scope:** `packages/sim/src/` (cup session model: prepare/fight/complete/
  forfeit/finalize, verdict-carried results) + `apps/client/src/` (shared
  playback driver extracted from spar, bracket HUD, coach screen, results
  screen, arena battle wiring). Mock-first design gate (Phase A). No save
  schema change; determinism gate untouched.

## Outcomes

- Cup day stops being a text replay of a pre-committed result and becomes
  the game's centerpiece spectacle: the player walks their creature through
  the bracket match by match.
- The preparation-is-the-skill fantasy gets its payoff moment — the kit and
  tactic you picked in the coach screen are the ones that fight.
- The arena machinery gains its second consumer, proving the playback seam
  generalizes beyond spar.
