# Spec: Creature Ownership & Care Loop

**Track ID:** `care_loop_20261010` · **Type:** Feature (Phase 1 MVP core) · **Branch:** `track/care_loop_20261010`

## Overview

Creatures become real game entities. A new save begins with a starter choice
(3 cards, Water teased), after which the player cares for a single active
creature through the daily loop: feed, rest, treat sickness, play. Conditions
are mechanical — they drive mood and bond accumulation now, and become the
inputs that evolution and battles consume later. The ranch renders the owned
creature, reacting visually to its condition.

## Functional Requirements

### 1. Creature entity (sim)

- `GameState` gains a creature: species archetype id, element type, life stage
  (Baby → Juvenile → Champion — stage changes out of scope), base stats
  (HP/ATK/DEF/SPD), and conditions: `hunger`, `energy`, `health`, `mood`,
  `bond` (integers 0–100, 100 = best; uniform "full = good" polarity).
- Creature creation is seeded (Rng seam) for deterministic stat rolls within
  species bounds.
- Starter catalog: Fire drake (draconic), Plant ox (bovine) selectable; Water
  axolotl present in the catalog as a locked/"coming soon" entry.

### 2. Daily tick on `advanceDay`

**Phase flip (existing, unchanged):** day counter increments; cup phase on
multiples of 7; AP refills to 3.

**Creature daily tick** — the creature sleeps through the night; a single
pure, seeded, deterministic settlement in fixed order:

1. **Hunger falls** — the creature wakes hungrier. Waking at 0 hunger
   (starving) → mood penalty + elevated sickness risk.
2. **Night recovery** — energy **restored by sleep**; sleep quality modulated:
   well-fed & healthy → full/near-full restore; starving or sick → partial
   restore (poor sleep).
3. **Sickness roll** — seeded nightly chance, probability raised by low
   hunger/low energy; existing sickness **worsens** (further health drop)
   instead of re-rolling.
4. **Mood settles** toward what the day's care earned (fed + played + healthy
   → mild gain; neglected → drop).
5. **Bond decays slightly** if no bonding action occurred that day.
6. **Misery floor, no death** — a fully bottomed-out creature is miserable
   (refuses play, no bond gain) and recovers when care resumes.

**During the day (awake):** actions drain energy — play costs a chunk, feeding
a little; **Rest is a mid-day nap** (AP action) that tops energy back up.
AP + energy together gate how much a single day holds.

### 3. Care actions (AP-gated)

- **Feed** — restores hunger (+small energy). **Rest** — nap; the only pure
  energy-recovery action within a day. **Treat (medicine)** — cures sickness;
  severity affects recovery. **Play** — raises mood and bond, drains energy;
  blocked when sick or exhausted.
- Each costs AP from the existing 3/day pool; costs are constants, tuned so a
  typical day is 2–3 decisions.
- Care quality feeds mood/bond accumulation (e.g., feeding a starving creature
  vs. a fed one; playing while sick is impossible).
- Actions rejected with friendly errors when AP insufficient or action
  invalid.

### 4. Starter choice (client)

- New save → starter screen with 3 cards (name, element, flavor); Water
  disabled with "coming soon" tease. Choice writes creature into state and
  enters the day phase.

### 5. Care UI (client)

**Aesthetic direction (approved 2026-10-10): "broadcast overlays over a warm
ranch"** — the 3D scene is the hero; UI is flat, edge-anchored overlay panels
reading like sports-broadcast graphics but tinted warm/cozy (loud stadium
styling is reserved for cup/battle screens later). Plain CSS custom-property
tokens only (warm neutral panel surface, saturated element hues for badges and
bar accents, one spacing scale, one font stack); no gradients/glassmorphism;
motion purposeful only, honoring reduced-motion; copy in warm coach voice
(gentle disabled reasons and status lines, never punitive).

- Creature panel: portrait area (live three.js head snapshot or element-colored
  placeholder — no new icon pipeline this track), name, element badge, 0–100
  condition bars (hunger/energy/health/mood/bond) with label + numeric value +
  fill so color is never the sole carrier, sickness status callout.
- Action menu: Feed / Rest / Treat / Play buttons with AP cost chips; disabled
  states show reasons ("Too tired to play", "No AP left today"); existing
  Advance Day button retained and visually separated as the end-of-day
  commitment.
- Ranch scene: renders the owned creature via the **archetype registry**
  (`generate()`) instead of the hardcoded drake; visual condition states —
  sluggish idle at low energy, droopy when sick, happy bounce at high mood
  (procedural, using the existing rig).

### 6. Save migration

- `SAVE_VERSION` → 2; v1→v2 migration step grants a default Fire drake starter
  (v1 saves had no creature); migration-chain pattern extended with tests.

## Non-Functional Requirements

- Sim remains DOM-free and deterministic; all logic-bearing modules TDD per
  `workflow.md`; suite stays < 10s.
- Client state bindings via the typed store, no UI framework (per
  `tech-stack.md`).
- `bun run verify` green including the determinism gate.

## Acceptance Criteria

1. New save shows starter choice; picking Fire or Plant creates the creature
   and enters the day phase.
2. A full day cycle: conditions change on advance per the settlement order,
   care actions consume AP and restore conditions correctly, invalid actions
   rejected.
3. Sickness appears (seeded), worsens untreated, cures with medicine; sick
   creature can't play.
4. Bond and mood accumulate from care quality and are readable in state.
5. v1 save loads and migrates to v2 with a default starter; corrupt/future
   saves still rejected.
6. Ranch shows the chosen creature with condition-driven visual states.
7. All quality gates pass (`bun run verify`).

## Out of Scope

- Training programs & stat growth; evolution; battle system; cup; multiple
  creatures/eggs; audio; server/backend; icons pipeline.
