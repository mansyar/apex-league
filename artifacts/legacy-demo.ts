/**
 * Phase 1 checkpoint demo — scripted headless playthrough of the legacy gate,
 * inheritance, and succession. Not part of the test suite; run directly with
 * bun to watch the acceptance paths play out.
 */
import {
  canGraduate,
  type GameState,
  getSpecies,
  graduate,
  chooseStarter,
  createInitialState,
  effectiveStats,
  inheritedFloor,
  lineagePrestige,
} from "../packages/sim/src/index"

/** A champion save at a chosen day/phase (mirrors the champion track's cast). */
function championAt(day: number, phase: "day" | "cup" = "day"): GameState {
  const owned = chooseStarter(createInitialState(), "fire_drake", 42)
  const c = owned.creature
  if (!c) throw new Error("expected a starter creature")
  return {
    ...owned,
    day,
    phase,
    // A trained career: some focus days banked onto the rolled base.
    creature: {
      ...c,
      stage: "champion",
      trained: { hp: 2, atk: 1, def: 0, spd: 1 },
    },
  }
}

function show(label: string, s: GameState): void {
  const c = s.creature
  if (!c) {
    console.log(`${label}: (no creature)`)
    return
  }
  const e = effectiveStats(c)
  console.log(
    `${label}: ${c.name} (${c.stage}) hp ${e.hp} atk ${e.atk} def ${e.def} spd ${e.spd}` +
      ` | gen ${s.lineage.generation} cups ${s.cupsWon} prestige ${lineagePrestige(s)}`,
  )
}

// Path 1: a day-60 champion graduates; the successor inherits half its stats.
console.log("--- Path 1: graduation at day 60 ---")
const before = championAt(60)
show("before", before)
const parent = before.creature
if (!parent) throw new Error("expected a champion")
const result = graduate(before, "plant_ox", 99)
if (!result.ok) throw new Error(`unexpected rejection: ${result.reason}`)
const after = result.state
show("after ", after)
const ox = getSpecies("plant_ox")
if (!ox) throw new Error("expected plant_ox")
const floor = inheritedFloor(effectiveStats(parent), ox, lineagePrestige(after))
console.log(
  `inherited floor (plant_ox): hp ${floor.hp} atk ${floor.atk} def ${floor.def} spd ${floor.spd}`,
)
console.log(
  `hall of fame: ${after.lineage.hallOfFame
    .map((r) => `${r.name} gen ${r.generation} @day ${r.retiredOnDay}`)
    .join(", ")}`,
)

// Path 2: a juvenile cannot graduate (not-champion).
console.log("--- Path 2: not a champion ---")
const base = championAt(60)
const juvenile: GameState = {
  ...base,
  creature: base.creature ? { ...base.creature, stage: "juvenile" } : null,
}
console.log(`verdict: ${JSON.stringify(canGraduate(juvenile))}`)

// Path 3: a champion one day under the floor is too young.
console.log("--- Path 3: one day early ---")
console.log(`verdict: ${JSON.stringify(canGraduate(championAt(59)))}`)

// Path 4: mid-cup is blocked.
console.log("--- Path 4: mid-cup ---")
console.log(`verdict: ${JSON.stringify(canGraduate(championAt(60, "cup")))}`)

// Path 5: a prestige-rich family (5 cups) passes the +1/stat floor and the
// warm-bloodline bond to its successor.
console.log("--- Path 5: prestige milestone (5 cups) ---")
const rich: GameState = { ...championAt(60), cupsWon: 5 }
const richResult = graduate(rich, "plant_ox", 99)
if (!richResult.ok) throw new Error("expected ok")
const richFloor = inheritedFloor(
  effectiveStats(parent),
  ox,
  lineagePrestige(richResult.state),
)
console.log(
  `prestige ${lineagePrestige(richResult.state)}` +
    ` | floor hp ${richFloor.hp} atk ${richFloor.atk} def ${richFloor.def} spd ${richFloor.spd}` +
    ` | successor bond ${richResult.state.creature?.conditions.bond}`,
)
