# Spec: Combat Prep

**Track ID:** `combat_prep_20261010` · **Type:** Feature (Phase 1) · **Branch:** `track/combat_prep_20261010`

## Overview

Two merged systems still don't touch: Training exists but the battle resolves on
rolled stats only (the promised "combat value is stats + trained" is not
honored), and the full 4-move kit is known from day one so the equip-4 promise
of the league fantasy is idle. Combat Prep connects them: battles read
`stats + trained`; the move kit grows through focused training (tier 3 at 3
trained days, tier 4 at 6); and the Spar panel grows a pre-battle loadout row —
pick your four (or fewer, early) with locked tiers visible and legible. The
player's preparation becomes the fight.

Layered on the Battle Resolution Core and Training Programs tracks; the
resolver, clock, and policy stay untouched. Rivals are wild creatures: no
trained bonuses, full kits, unchanged.

Design decisions approved by the user 2026-10-10: trained-days counter on the
first assignment of each day; unlock pacing tier 3 @3 / tier 4 @6; Spar-panel
picker with visible locked rows; stat cards display totals with a trained chip;
save v4 (trainingDays + chosen loadout); migrated saves credited 6 trained
days; morning coach callout on a fresh unlock.

## Functional Requirements

### 1. Trained days counter (sim)

- A creature gains `trainingDays: number` — the lifetime count of days on
  which the player assigned a training focus (the assignment that spends 1 AP).
  Creation starts at 0.
- The counter increments in `assignTraining` exactly when that call spends the
  AP (first assignment of the day). Free same-day swaps, already-focused
  no-ops, and capped-stat rejections never touch it.
- There is no cap and no decay; it is a progress ledger, not a stat.

### 2. Effective stats in battle (sim)

- New helper `effectiveStats(creature): CreatureStats` returning
  `stats + trained` per stat (Training's own "display/combat value" contract).
- `makeExhibition` assembles the owned `BattleSide.stats` from
  `effectiveStats(owned)` so every resolved fight uses the trained creature;
  the resolver, clock, and policy remain pure functions of the stats they are
  given and are not modified.
- The Spar rival is unchanged: raw `createCreature` stats, no trained bonus,
  no trainingDays.
- Loadout pool: `SpeciesDef.kit` (4 ids in element/tier order) remains the
  pool. New helper `unlockedKit(creature, species)`: the prefix of `kit`
  unlocked by the gate below; `defaultLoadout` returns it.

### 3. Move unlock gate (sim)

- Tiers live in catalog order (tier 1 = Quick-class, 2 = Standard, 3 = Heavy,
  4 = Bomb). A species knows tiers 1–2 from birth.
- Constants: `MOVE_TIER3_DAYS = 3`, `MOVE_TIER4_DAYS = 6`.
- `unlockedKit` slices `kit` by `trainingDays`: 0–2 days → tiers 1–2; 3–5 days
  → tiers 1–3; 6+ days → all four.
- Generated rivals ignore the gate — always the full `SpeciesDef.kit`.

### 4. Loadout state (sim + save v4)

- `SAVE_VERSION` 3 → 4. Creature gains `trainingDays: number` and
  `loadout: readonly string[] | null` (null = use `defaultLoadout`).
- Migration v3 → v4 sets `trainingDays: 6` (a pre-gate creature already knew
  its full kit; going forward new creatures grow) and `loadout: null`.
- New helper `setLoadout(state, moveIds)` (pure, 2–4 unique moves from the
  creature's unlocked kit) plus `clearLoadout(state)` back to null. Friendly
  rejections for unknown moves, repeats, locked moves, or a wrong count.
- Revision of `battle_core_20261010` FR3 (dated): the equipped special list is
  two to four moves, not exactly four — early creatures legally spar with 2–3
  specials; the basic strike and the close/hold fallbacks keep a 2-move fight
  legible. The `equipped` validate range becomes 2..4, and the clock/policy are
  unaffected (they never assumed a size).

### 5. Spar panel loadout row (client)

- Stat cards display the effective total with the trained part visible when
  it exists — `ATK 13 (+2)`. The rival card shows no chip (nothing trained).
- An unlocked-progress line: `Unlocked 2 of 4 moves — train 1 more day for
  Cinder Shot.` (next locked tier with its remaining-days count).
- A loadout row sits above the tactic buttons: the chosen (or default) slots,
  click-to-toggle into a picker of the creature's kit. Unlocked rows are
  selectable; locked rows stay visible but disabled with their days-remaining
  copy so the growth path is discoverable.
- `setLoadout` runs on every change; the store persists; a reload keeps the
  last chosen kit. `clearLoadout` restores the default slicing.
- The picked kit feeds this spar only through `makeExhibition` — announcer
  copy, seed stability, stakes, and reduced-motion behavior are all unchanged
  from the Battle Core track.

### 6. Unlock callout (client)

- When `trainingDays` is exactly `MOVE_TIER3_DAYS` or `MOVE_TIER4_DAYS`, the
  day-phase status callout (coach voice, present tense) mentions the new move:
  "New move available: Cinder Shot. Train 3 more days for the next tier."
- Derived from state; no extra persistence. It lingers only while the counter
  sits exactly on the threshold, and the next assignment naturally clears it.

## Non-Functional Requirements

- Sim helpers are DOM-free, pure, and deterministic per the sim's standing
  NFRs; follow `workflow.md` (test-first for all sim logic).
- Client changes stay vanilla TS + typed store consumption, honoring the
  existing `prefers-reduced-motion` handling (replay path untouched).
- Suite stays fast — the running 10s-target deviation (per battle core's
  recorded note) continues; the added tests should be small and table-driven.
- No new runtime dependencies. `bun run verify` green including the voxel
  determinism gate.
- Save migration v3 → v4 with schema versioning and migration tests, matching
  the Training track's save-v3 pattern.

## Acceptance Criteria

1. `effectiveStats` returns `stats + trained` per stat across seed sweeps, and
   `makeExhibition` feeds those effective stats into the owned `BattleSide`.
2. `trainingDays` increments exactly on the AP-spending assignment; swaps,
   no-ops, and rejections never change it; separate days accumulate.
3. `unlockedKit` yields tiers 1–2 at 0–2 days, adds tier 3 at 3 days, adds
   tier 4 at 6 days; rivals always hold the full kit in every setup.
4. `setLoadout` accepts 2–4 unique unlocked moves in any order and rejects
   unknown, repeated, locked, or mis-sized lists with friendly errors;
   `clearLoadout` restores default slicing; `loadout: null` still resolves to
   a valid kit for a fresh sparring fight.
5. Save v4: `SAVE_VERSION` 4; a v3→v4 migration gives `trainingDays: 6`,
   `loadout: null`, and round-trips; old saves load without damage.
6. Spar panel: stat cards show `ATK 13 (+2)` styling (and none on the rival),
   the progress line names the next tier and remaining days, the picker
   disables locked rows with their days-remaining copy, and the loaded kit is
   what the announcer log then plays back.
7. A reload after choosing a loadout keeps the choice (localStorage via the
   existing save path).
8. The day-phase callout speaks only at exactly 3 or 6 trained days with the
   present-tense unlock copy.
9. `bun run verify` green — type checks, typed tests, Biome, voxel
   determinism gate — on every phase checkpoint.

## Out of Scope

- Cup day, brackets, ladder, rankings, or rewards (any cup surface).
- The 3D battle arena or any 3D presentation of the spar.
- Evolution gates encountered; species progression per any tier list.
- New catalog moves beyond the existing 12; no tier-5 or per-element extras.
- Rival training, rival loadouts, or seeded rival days-generation.
- Elemental affinity, move learning through battle wins, and badge/trophy
  systems.
- HUD conditions/threshold copy changes beyond the derived callout.
- Icons, audio, server, cloud sync.
- The voxel mesh/dna pipeline (models unchanged by this track).
