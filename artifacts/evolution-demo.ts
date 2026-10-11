/**
 * Phase 1 checkpoint demo — scripted headless playthrough of the evolution
 * gate. Not part of the test suite; run directly with bun to watch the
 * three acceptance paths play out day by day.
 */
import {
  advanceDay,
  careAction,
  chooseStarter,
  createInitialState,
  effectiveStats,
  type GameState,
  type Rng,
} from "../packages/sim/src/index"

const calm: Rng = { next: () => 0.99, int: () => 0 }

const line = (s: GameState) => {
  const c = s.creature!
  return `day ${String(s.day).padStart(2)} | ${c.stage.padEnd(9)} | hp ${effectiveStats(c).hp} atk ${effectiveStats(c).atk} def ${effectiveStats(c).def} spd ${effectiveStats(c).spd} | mood ${c.conditions.mood} cooldown ${c.sickCooldown}`
}

// Path 1: well-cared baby evolves on the night of day 10.
console.log("--- Path 1: devoted care ---")
let s = chooseStarter(createInitialState(), "fire_drake", 42)
console.log(line(s))
for (let day = 1; day <= 11; day++) {
  // Keep the creature cared for: feed and play every day.
  s = careAction(s, "feed").ok ? careAction(s, "feed").state : s
  s = careAction(s, "play").ok ? careAction(s, "play").state : s
  s = advanceDay(s, calm)
  console.log(line(s))
}

// Path 2: a sick creature is delayed but never blocked.
console.log("--- Path 2: sickness delays, care recovers ---")
s = chooseStarter(createInitialState(), "plant_ox", 42)
for (let day = 1; day < 10; day++) {
  s = careAction(s, "feed").ok ? careAction(s, "feed").state : s
  s = advanceDay(s, calm)
}
// Force a sickness night right at the gate: sick at lights-out on day 10.
if (s.creature) {
  s = {
    ...s,
    creature: { ...s.creature, conditions: { ...s.creature.conditions, health: 79 } },
  }
}
s = advanceDay(s, calm)
console.log(line(s))
// Nurse it back: treat twice, feed, then let clean nights pass.
for (let day = 11; day <= 15; day++) {
  s = careAction(s, "treat").ok ? careAction(s, "treat").state : s
  s = careAction(s, "feed").ok ? careAction(s, "feed").state : s
  s = advanceDay(s, calm)
  console.log(line(s))
}

// Path 3: a v5-era save (day 12 baby, well cared, no cooldown field on
// disk) matures on its next settled night after loading.
console.log("--- Path 3: migrated v5 baby ---")
import {
  createMemoryAdapter,
  loadGame,
  saveGame,
} from "../packages/sim/src/index"
// Simulate a v5 payload: day-12 baby missing the v6 cooldown field.
const owned = chooseStarter(createInitialState(), "water_axolotl", 42)
const adapter = createMemoryAdapter()
saveGame(adapter, owned, 0)
const legacy = JSON.parse(adapter.getItem("apex.save") ?? "{}")
delete legacy.state.creature.sickCooldown
legacy.version = 5
legacy.state.day = 12
adapter.setItem("apex.save", JSON.stringify(legacy))
const loaded = loadGame(adapter)
if (!loaded?.creature) throw new Error("migration failed")
console.log(line(loaded))
const next = advanceDay(loaded, calm)
console.log(line(next))
