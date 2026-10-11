# Track: Cup Day — weekly 8-bracket tournament

## 1. Summary

Every 7th day, an optional single-elimination cup becomes enterable. Entering
resolves 3 seeded battles in one sitting against named, ramped rivals, ends
with rewards or a warm consolation, and returns to the day phase with the next
day pre-banked (+1 AP on a win). Battles use the existing headless resolver
with spar-style text presentation — the arena visualization belongs to the
parallel `arena_playback` track.

## 2. Type

**Feature** (Phase 1 MVP completion; fills product.md core-loop phase 2:
optional entry into an 8-bracket single-elimination cup).

## 3. Branch

`track/cup_day_20261011` (base: main @ `648814c`)

## 4. Functional Requirements

### FR1 — Cup entry
On a cup day (day 7, 14, …), a "Enter Cup" chip appears in the Spar area
(disabled once entered/resolved that day, or on non-cup days). Entry is free
and optional; skipping just advances the day normally. The existing
`beginCup`/`endCup` state-machine contract is filled in (placeholder bodies
replaced).

### FR2 — Bracket generation
Entering seeds a bracket from `state.day` (+ save seed): 8 slots, slot 1 is
the player's creature, 7 rivals drawn via the existing exhibition helper
(available species, `createCreature` rolls), each with a hand-written coach-
style name from a small name pool. Rivals carry no conditions/fatigue. Stat
ramps: QF rival ≈ −5% vs. the player's rolled stats, SF ≈ even, F ≈ +5%,
clamped inside species `statBounds`.

### FR3 — Rounds
3 rounds (quarterfinal, semifinal, final), each a headless
`resolveBattle`-style resolve using the player's current stats + equipped
loadout. No byes — 8 is always filled. A player loss ends the player's ladder
but the bracket still resolves to a champion for standings context.

### FR4 — Presentation
New full-screen cup panel (DOM/CSS overlay, no scene changes): bracket
advances QF→SF→F with ~1.5 s pacing per round; each round shows the verdict
plus a 2–3-line round-event log in announcer tone. Ranch idle reacts to
placement (victory → happy bounce for the following day; early exit → one
droopy idle window). Reduced motion: instant resolve, no bounce.

### FR5 — Rewards
Win: next-day AP budget is 4 (not 3), bond +10, mood +15, `cupsWon` counter
+1. Early exit only: consolation +2 mood. No currency, no stat gains. Save
schema bumps to **v5** with a clean v4→v5 migration (`cupsWon: number`
defaulting 0, plus `lastCupDay` bookkeeping; phase/ticker untouched).

### FR6 — Sim purity
No new I/O; all randomness via seeded `makeRng` from `state` inputs. Resolver
and helpers remain DOM-free. New pure logic (bracket generation, ramp, reward
application) is unit-tested and mutation-pure. No `@apex/voxel` changes; the
determinism gate is untouched.

## 5. Non-Functional Requirements

- `bun run verify` green (types / biome / tests / determinism gate)
- New pure logic is test-first; 3 seeded cup runs reproduce identical
  brackets and logs
- Save v5 migration is tested for round-trip, back-compat, and corrupt-input
  rejection
- Cup sequence fits the product's 5–15-minute session budget (≤ ~90 s of
  pacing)
- No scene/voxel changes, no new dependencies

## 6. Out of Scope

- Arena visualization (parallel `arena_playback` track)
- Multiple cups per month / persisted standings tables
- Ladder, promotion matches, boss rivals (future Bronze ladder track)
- Breeding / retirement interactions
- Server-side tournament sync

## 7. Acceptance Criteria

1. Cup days 7/14/21 show an Enter Cup chip; regular days do not.
2. Entering on cup day 7: bracket = player + 7 named rivals; exactly 3
   rounds; no byes; final ends with a champion + player placement.
3. Win path: next Advance Day AP = 4, bond +10, mood +15, `cupsWon` +1.
   Loss path: mood +2, `cupsWon` unchanged, standard AP.
4. Two cup runs from identical state produce byte-identical brackets and
   round logs.
5. Pre-v5 save loads cleanly; migration preserves день/phase and defaults
   `cupsWon` to 0.
6. `bun run verify` fully green in CI.
