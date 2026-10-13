# Spec — Champion Evolution

**Track ID:** `champion_evolution_20261013` · **Status:** approved 2026-10-13

## Overview

Complete the 3-stage evolution tree promised by the product definition: a
well-raised, battle-proven juvenile evolves into its **champion** form during a
nightly settlement. The champion applies the pinned `CHAMPION_STAT_BOOST`,
renders from a new voxel stage derived from the same seed as its earlier
stages, and is celebrated with a grander evolution ceremony.

Champion is a *league title*, not just an age milestone: the gate ties raising
quality to competitive success. The gate delays but never blocks
(discovered-not-hidden, death-free stakes).

Existing groundwork this track builds on:

- `packages/sim/src/evolution.ts` pins `CHAMPION_STAT_BOOST`
  `{hp:6, atk:4, def:4, spd:2}` with the explicit contract "when the champion
  evolution gate lands, this is the number the sim applies".
- The sim's `LifeStage` already includes `"champion"`, and the save validator
  (`save/storage.ts`) already accepts it — **no save-schema change** (v9
  stands).
- `packages/voxel/src/stage.ts` only knows `baby | juvenile`; `parseStage`
  throws on champion, so the voxel stage layer, proportion-budget audit, and
  determinism gate all need a champion extension.
- `loadout.requiredTierDays(kitIndex, stage)` is already stage-aware; tier-4
  moves keep unlocking via trained days — champion adds no new move content.

## Functional Requirements

### R1 — Evolution gate (sim, pure, stage-aware)

Extend the evolution module so `evaluateEvolution` handles both transitions.
A **juvenile** evolves the night it closes a day when **all** hold:

| Condition | Constant | Value |
| --- | --- | --- |
| Age | `CHAMPION_EVOLUTION_DAY` | 25 |
| Mood | `EVOLUTION_MOOD` (reuse) | 40 |
| Sickness | sickCooldown === 0 (reuse semantics) | — |
| Bond | `CHAMPION_BOND` | 60 |
| Cups | `CHAMPION_CUPS` | 1 |

Verdict reason precedence: `not_juvenile > too_young > recently_sick >
low_mood > low_bond > no_cup_win > ready`. The baby→juvenile path keeps its
existing reasons (`not_baby > too_young > recently_sick > low_mood > ready`)
and behavior byte-identical.

### R2 — Stat application

`evolveCreature` generalizes over the target stage: champion applies the
pinned `CHAMPION_STAT_BOOST` (+6 HP / +4 ATK / +4 DEF / +2 SPD) to the rolled
base `stats`, exactly as the juvenile boost does. Trained stats remain
separate and capped on their own. No clamping beyond the existing rules.

### R3 — Voxel champion stage

`Stage` gains `"champion"`. Same-seed derivation (identity layer — body plan,
snout, horn shapes, palette family — never changes):

- `CHAMPION_MATURITY` multipliers further mature the juvenile proportions
  (e.g. girth 0.90), still subtle enough that the proportion-budget audit
  passes for every seed.
- One **signature upgrade** per archetype, replacing/extending the juvenile
  signature part: drake **crown horns**, bovine **full horn curls**,
  axolotl **grand frills + tail fin**.
- The proportion-budget audit extends to champion for all 3 archetypes
  (200 seeds each, matching the juvenile audit).
- The determinism gate gains champion digests (byte-identical per gated
  archetype × stage at seed 42).

### R4 — Rendering

Ranch and arena build paths accept champion: `parseStage` passes,
`visualSeedOf(stats, stage)` stays the single seed source (already
stage-aware — verify champion casts correctly in spar/cup). Holder-scale only
(`CHAMPION_SCALE` ~1.15×), never on rig children. No per-frame allocation
regressions.

### R5 — Ceremony

Reuse the evolution ceremony machinery with a champion variant: grander
glow/swap in the existing position-driven machine (walk → glow → swap →
settle), reduced-motion instant variant, non-cancelable, dt-clamped — same
contract as the juvenile ceremony.

### R6 — HUD & coach copy

- Stage badge reads **"Champion"**.
- Growth hint callout from `CHAMPION_HINT_DAY` = 20, direction-only
  ("a champion needs bond and a cup win" style — never a dead end, threshold
  details stay undisclosed).
- Unlock callout the night it happens, carrying the stat gains.
- Condition-plate stat cells reflect the boost automatically (sim mutated
  `stats`).

### R7 — Save

No schema change: `SAVE_VERSION` stays 9. Champion-stage creatures round-trip
through the existing validator (already accepts `"champion"`). A roundtrip
test pins this so future validator tightening cannot silently break it.

## Non-Functional Requirements

- All sim logic pure, DOM-free, deterministic (seeded fixtures); suite stays
  fast (< 10 s target).
- Voxel builds byte-deterministic; champion artifacts committed to the repo.
- Presentation changes verified manually (browser evidence at the phase
  checkpoint), honoring reduced-motion.
- Styleguides under `conductor/code_styleguides/` and `bun run verify` remain
  the quality bar.

## Acceptance Criteria

1. A juvenile at day ≥ 25 with mood ≥ 40, clean sickness nights, bond ≥ 60,
   and ≥ 1 cup win evolves during the closing settlement; each failing
   condition produces the correct verdict reason (tests cover success +
   every failure case).
2. Champion stats equal juvenile stats + `CHAMPION_STAT_BOOST` exactly;
   juvenile path unchanged.
3. All three archetypes produce champion builds passing the budget audit;
   `bun run gate:determinism` green including champion digests.
4. Champion visible in the ranch (ceremony) and in spar/cup arenas; stage
   badge, hint, and callout correct; reduced-motion variant instant.
5. Champion saves load cleanly on the v9 schema (roundtrip test).
6. `bun run verify` green; suite time unchanged.

## Out of Scope

- Champion-exclusive moves or a 5th loadout slot.
- Retirement/legacy, breeding, roster of multiple creatures.
- New archetypes or species; ladder/cup rule changes; new elements.
- Any save migration (schema unchanged).
