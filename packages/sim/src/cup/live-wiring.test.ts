/**
 * The live cup resolves through the continuous engine
 * (continuous_arena_battle phase 7, P7.T2.1).
 *
 * `resolvePairing` / `resolvePlayerMatch` / `replayGhost` now call
 * `resolveContinuous`, so every cup verdict carries the new engine's
 * `BattleResult`: a real reason, a real final HP snapshot, and a log whose
 * last `hpAfter` is that snapshot. The same seed still replays the same
 * tournament.
 */
import { describe, expect, test } from "bun:test"
import { createCreature } from "../creature"
import {
  type Creature,
  defaultLoadout,
  getSpecies,
  resolvePlayerMatch,
  startCupSession,
} from "../index"

const CUP_DAY = 7

function cupDay(seed = 42): {
  creature: Creature
  loadout: readonly string[]
} {
  const creature = createCreature("fire_drake", seed)
  const species = getSpecies(creature.speciesId)
  if (!species) throw new Error("unknown species")
  return { creature, loadout: defaultLoadout(creature, species) }
}

function play(seed: number, tactic: "balanced" | "specials" = "balanced") {
  const { creature, loadout } = cupDay(seed)
  let session = startCupSession(creature, CUP_DAY, seed)
  const verdicts = []
  while (session.status === "player-turn") {
    const resolved = resolvePlayerMatch(session, loadout, tactic)
    verdicts.push(resolved.verdict)
    session = resolved.session
  }
  return { session, verdicts }
}

describe("the live cup resolves through the continuous engine", () => {
  test("a player verdict carries a continuous BattleResult", () => {
    const { verdicts } = play(17)
    const battle = verdicts[0]?.battle
    if (!battle) throw new Error("the opener carried no battle")
    expect(["ko", "double_ko", "time"]).toContain(battle.reason)
    expect(Object.keys(battle.finalHp)).toHaveLength(2)
    expect(battle.events.length).toBeGreaterThan(0)
    // The log's tail is the real state: HP only falls, and the ending beat
    // carries the same snapshot the result reports.
    const last = battle.events.at(-1)
    expect(last?.hpAfter).toEqual(battle.finalHp)
    for (const event of battle.events) {
      for (const [key, hp] of Object.entries(event.hpAfter)) {
        expect(hp).toBeGreaterThanOrEqual(0)
        expect(hp).toBeLessThanOrEqual(battle.events[0]?.hpAfter[key] ?? 0)
      }
    }
  })

  test("the same seed draws and resolves the same tournament", () => {
    const a = play(17, "specials")
    const b = play(17, "specials")
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    expect(a.verdicts.length).toBeGreaterThan(0)
  })
})
