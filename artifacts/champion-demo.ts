/**
 * Phase 1 checkpoint demo — scripted headless playthrough of the champion
 * evolution gate. Not part of the test suite; run directly with bun to
 * watch the three acceptance paths play out day by day.
 */
import {
  advanceDay,
  careAction,
  chooseStarter,
  createInitialState,
  effectiveStats,
  evaluateEvolution,
  type GameState,
  type Rng,
} from "../packages/sim/src/index"

const calm: Rng = { next: () => 0.99, int: () => 0 }

const line = (s: GameState) => {
  const c = s.creature!
  return `day ${String(s.day).padStart(2)} | ${c.stage.padEnd(8)} | hp ${effectiveStats(c).hp} atk ${effectiveStats(c).atk} def ${effectiveStats(c).def} spd ${effectiveStats(c).spd} | mood ${c.conditions.mood} bond ${c.conditions.bond} cooldown ${c.sickCooldown}`
}

/** Raise a fire drake through the juvenile evolution with devoted care. */
function raiseToJuvenile(): GameState {
  let s = chooseStarter(createInitialState(), "fire_drake", 42)
  for (let day = 1; day <= 10; day++) {
    s = careAction(s, "feed").ok ? careAction(s, "feed").state : s
    s = careAction(s, "play").ok ? careAction(s, "play").state : s
    s = advanceDay(s, calm)
  }
  return s
}

/** Keep caring, one day at a time, printing each settled night. */
function runCaredDays(s: GameState, from: number, to: number, play = true) {
  for (let day = from; day <= to; day++) {
    s = careAction(s, "feed").ok ? careAction(s, "feed").state : s
    if (play) s = careAction(s, "play").ok ? careAction(s, "play").state : s
    s = advanceDay(s, calm)
    console.log(line(s))
  }
  return s
}

// Path 1: a bonded, cup-winning juvenile becomes a champion on the night
// that ends day 25, gaining exactly the pinned +6/+4/+4/+2.
console.log("--- Path 1: devoted care, cup in the bag ---")
let s = raiseToJuvenile()
console.log(line(s))
// The drake won its first cup (day 7/14/21 cups); the machine stamps the
// tally — mirrored here so the demo stays a straight day-ticking loop.
s = { ...s, cupsWon: 1 }
const before = s.creature!.stats
s = runCaredDays(s, 11, 26)
const after = s.creature!.stats
console.log(
  `boost: hp +${after.hp - before.hp} atk +${after.atk - before.atk} def +${after.def - before.def} spd +${after.spd - before.spd}`,
)

// Path 2: fed but never played with — the bond decays below the floor
// while the mood stays fine, so the prestige rule blocks with `low_bond`
// and the verdict (not a silent stall) says why.
console.log("--- Path 2: neglected bond blocks ---")
s = raiseToJuvenile()
s = { ...s, cupsWon: 1 }
s = runCaredDays(s, 11, 25, false)
console.log(
  `verdict: ${JSON.stringify(evaluateEvolution(s.creature!, s.cupsWon))}`,
)

// Path 3: perfect care but no cup win yet — blocked with `no_cup_win`.
console.log("--- Path 3: no cup win yet ---")
s = raiseToJuvenile()
s = { ...s, cupsWon: 0 }
s = runCaredDays(s, 11, 25)
console.log(
  `verdict: ${JSON.stringify(evaluateEvolution(s.creature!, s.cupsWon))}`,
)
