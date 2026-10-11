# Track: Live Cup — viewable stepwise tournament

## 1. Summary

The cup becomes a live, watchable tournament. Enter Cup opens a **bracket HUD**
that fills in strict match order — rival matches reveal with staggered verdict
lines, and the **player's matches are fought in the 3D arena** after a
pre-battle coach screen (rival card, kit re-pick, tactic pick). Bracket
structure and player-independent rival battles pre-resolve at entry
(deterministic); player battles resolve **live at fight time** from the chosen
loadout/tactic. Losing auto-completes the bracket to a champion with a results
screen; giving up forfeits the current round after a confirmation modal.

Design gate: screen mocks are authored and user-approved **before** any app
code (Phase A of the plan), following the `arena_playback` track's
`hud-mock.html` precedent.

## 2. Type

**Feature** (converges the `cup_day_20261011` and `arena_playback_20261010`
tracks; presentation + resolution-model upgrade to the existing cup loop).

## 3. Branch

`track/live_cup_20261011` (base: main @ `f0d338b`)

## 4. Functional Requirements

### FR1 — Cup entry & bracket view
The Enter Cup chip opens a bracket HUD (3-column QF/SF/F, 8 named slots,
player slot marked). Entering is a **free look**: closing before the player's
first fight does not consume the cup day (phase stays `"cup"`, chip returns).
After the first fight, closing mid-run opens a **give-up confirmation modal**.

### FR2 — Hybrid resolution (sim)
At entry, `makeBracket` runs as today. Rival-vs-rival battles in the
**player-independent subtree** (QF2, QF3, QF4, SF2 — the pairings that cannot
contain the player) resolve at entry via their existing per-pairing seeds;
`RoundVerdict` is extended to carry the full `BattleResult` (events) so
results are preserved and replayable. Player-branch matches (the player's own
QF/SF/F, plus any rival continuation after a player loss) resolve **on
demand**: a new pure sim function resolves the player's current-branch match
from `(bracket, session, loadout, tactic)` — same inputs ⇒ byte-identical
battle. The player is slot 1, so their first match is QF1. Double-KO in the
player's match keeps today's player-favoring fallback.

### FR3 — Strict match-order reveal
Fights evaluate in bracket order: QF1 (you) → QF2 → QF3 → QF4 → SF1 (you) →
SF2 → F (you). Rival verdicts appear with a short stagger (300–500 ms each).
The player's next match is highlighted before its coach screen opens.

### FR4 — Coach screen
Before each player match: rival card (name, species, element, stat bars, kit)
+ the player's loadout picker (spar rules: 2–4 unique moves, tier-gated
locked rows) + **tactic selector** (balanced/specials — replacing the cup's
hardcoded "balanced"). "Back to bracket" exits freely; "Step into the arena"
commits.

### FR5 — Player battle in the arena
Fighting resolves the battle live, then plays it through the existing arena
machinery (swap → `staging.cast` → `battleHud` → playback script → verdict
stamp → exit back to bracket). The playback driver (timer chain,
fast-forward, reduced-motion instant dump, slow-replay fallback) is
**extracted from `spar.ts` into a shared module** so spar and cup drive
identical presentations. `playerSide` is parameterized to accept loadout
**and** tactic.

### FR6 — Loss & give-up
Losing → the remaining bracket auto-completes (staggered) → results screen.
Give-up after the run started → forfeit current round: placement as-if-lost
(QF→4th, SF→3rd, F→2nd), rest of bracket auto-completes, treated exactly like
losing that round (mood +2 consolation, no `cupsWon`).

### FR7 — Results screen & reward timing
A dedicated end screen: champion, player placement, reward breakdown. Rewards
apply when the tournament **ends** (champion crowned / eliminated /
forfeited), replacing today's entry-time application. Win: AP 4 next day,
bond +10, mood +15, `cupsWon` +1. Loss/forfeit: mood +2.

### FR8 — Sim purity & no save change
All new logic pure, seeded, DOM-free; no I/O. `enterCup` is restructured:
entry returns the cup session (phase stays `"cup"`); separate pure functions
resolve the player's match and finalize/forfeit the cup (apply rewards, flip
phase). **Save stays v5** — no mid-cup persistence; closing after commit
triggers the forfeit path through the sim before persisting.

## 5. Non-Functional Requirements

- `bun run verify` green (types / biome / tests / determinism gate)
- TDD for: restructured cup entry, verdict-carried results, live
  player-match resolution, forfeit semantics, reward timing, tactic
  parameterization
- Spar must not regress: the driver extraction keeps spar behavior and its
  existing tests green
- Session budget: a full cup ≤ ~2–3 min of rival reveals + up to 3 arena
  battles
- Reduced motion: staggers collapse to instant; arena steps honor the saved
  motion pref
- Product voice on all copy; no new dependencies
- Mock-first design gate: Phase A produces user-approved screen mocks before
  UI implementation

## 6. Out of Scope

- Bronze ladder, promotion matches, rival-pool expansion (future tracks)
- Mid-cup persistence/resume across save-reload (session is in-memory)
- Mid-battle player decisions inside an arena fight (spar's "pre-resolved
  spectator" model is unchanged — the cup match is resolved before playback
  starts, not during)
- Conditions interacting with the tournament (frozen snapshot)
- Breeding / retirement; server-side sync

## 7. Acceptance Criteria

1. Cup day: bracket shows 8 slots; closing before the first fight re-shows
   the chip (cup not consumed).
2. Rival verdicts stagger in strict match order; the coach screen opens for
   the player's match at its bracket position.
3. Coach screen: rival card + loadout picker (tier gates enforced) + tactic;
   back-out is free.
4. Fighting swaps to the arena, playback matches the resolved winner, verdict
   stamps, and a win returns to the bracket with the next match highlighted.
5. Two runs from identical state + identical coach picks produce
   byte-identical battles and logs.
6. Loss → auto-complete → results screen (champion, placement 2/3/4, mood +2).
7. Give-up after start → confirmation modal → forfeit placement, results
   screen, phase back to day, chip gone.
8. Winning all three: champion = player, next-day AP 4, bond +10, mood +15,
   `cupsWon` +1.
9. Reduced motion: instant reveals and instant arena steps.
10. `bun run verify` fully green.
