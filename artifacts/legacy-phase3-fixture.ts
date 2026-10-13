/**
 * Phase 3 (legacy_breeding_20261013) wrap-up fixture: sim-driven v10 saves for
 * the browser end-to-end playthrough.
 *
 *  - `blocked`  — day 1 founder baby: the Graduate chip must never appear.
 *  - `tooyoung` — day 59 champion: eligible-but-for-age, no chip.
 *  - `eligible` — day 60 champion, generation 1 (a founded line): the chip is
 *                 live, and a graduation must land on generation 2.
 *
 * Run: bun artifacts/legacy-phase3-fixture.ts  → prints three JSON blobs.
 */
import {
  createCreature,
  createInitialState,
  type GameState,
  type RetiredRecord,
} from "../packages/sim/src/index"

function championAt(day: number, generation: number): GameState {
  const base = createCreature("fire_drake", 42)
  const creature = {
    ...base,
    stage: "champion" as const,
    // The pinned champion boost the evolution gate applies.
    stats: {
      hp: base.stats.hp + 6,
      atk: base.stats.atk + 4,
      def: base.stats.def + 4,
      spd: base.stats.spd + 2,
    },
    conditions: { ...base.conditions, bond: 80, mood: 70, health: 90 },
    trainingDays: 10,
  }
  const founder: RetiredRecord = {
    name: "Ember Drake",
    speciesId: base.speciesId,
    archetypeId: base.archetypeId,
    element: base.element,
    stats: creature.stats,
    trained: creature.trained,
    cupsWon: 2,
    generation: 0,
    retiredOnDay: 60,
  }
  return {
    ...createInitialState(),
    day,
    creature,
    cupsWon: 2,
    lineage:
      generation === 0
        ? { generation: 0, hallOfFame: [] }
        : { generation, hallOfFame: [founder] },
  }
}

function founderBaby(day: number): GameState {
  return {
    ...createInitialState(),
    day,
    creature: createCreature("fire_drake", 42),
  }
}

const wrap = (label: string, state: GameState): void => {
  console.log(
    `=== ${label} ===\n${JSON.stringify({ version: 10, state, savedAt: 1000, session: null })}`,
  )
}

wrap("blocked", founderBaby(1))
wrap("tooyoung", championAt(59, 0))
wrap("eligible", championAt(60, 1))
