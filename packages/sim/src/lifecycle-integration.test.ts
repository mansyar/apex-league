/**
 * The full lifecycle, end to end (earth/wind species line, Phase 4): each
 * league reward egg is claimed at a cup finalize, hatched out of the
 * nursery queue, raised through care nights to its juvenile gate, takes one
 * of its species' champion branches, and then wins a cup through the live
 * player-match seam — every battle resolved by the action clock.
 *
 * FR-1: the complete obtain → raise → evolve → branch → compete journey,
 * proven for both reward species: `earth_tortoise` via the Legend reward
 * and `wind_falcon` via the Gold reward. The run composes exactly what the
 * existing suites pin — the grant rules (cup/storm-gift.test.ts), the
 * hatch queue, the nightly settlement, and the champion-path cup golden
 * (cup-contracts.test.ts, seed 17 with default picks) — rather than
 * simulating months of laddering: the ladder position is positioned
 * helper-style the way that suite does, and every cup the lifecycle fights
 * is still won with real clock-driven battles.
 */
import { describe, expect, test } from "bun:test"
import type { Tactic } from "./battle"
import { branchesForSpecies, getBranch } from "./branches"
import { createGiftEgg, hatchGiftEgg, leagueRewardPending } from "./breeding"
import { careAction } from "./care"
import { CONDITION_START, type Creature } from "./creature"
import { type CupSession, resolvePlayerMatch, startCupSession } from "./cup"
import { EVOLUTION_DAY } from "./evolution"
import type { LadderState } from "./ladder"
import { defaultLoadout, knownMoves } from "./loadout"
import { finalizeCup } from "./machine"
import { getSpecies } from "./species"
import { bringToRanch, stablePetId } from "./stable"
import { chooseStarter, createInitialState, type GameState } from "./state"
import { advanceDay } from "./ticker"

const DAY = 7

/** Ladder positions the storm-gift suite positions helper-style. */
const AT_GOLD: LadderState = { points: 36, tier: "gold", subTier: "I" }
const AT_LEGEND: LadderState = { points: 40, tier: "legend", subTier: "I" }

/** Cup seeds where the grown reward species takes the bracket (the field
 * is a function of day + seed + the creature's own stats). */
const TORTOISE_CUP_SEED = 1
const FALCON_CUP_SEED = 2

/** Drive a fresh save to `day` the way the contracts fixture does: bare
 * nightly ticks (the fixture restores the steady conditions afterwards). */
function driveToDay(target: number, starterSeed = 42): GameState {
  let s = chooseStarter(createInitialState(), "fire_drake", starterSeed)
  while (s.day < target) s = advanceDay(s)
  return s
}

/** Default coach picks for a creature (equipped kit, given tactic). */
function picks(
  creature: Creature,
  tactic: Tactic,
): { loadout: readonly string[]; tactic: Tactic } {
  const species = getSpecies(creature.speciesId)
  if (!species) throw new Error("unknown species")
  return { loadout: defaultLoadout(creature, species), tactic }
}

/** Play the player's matches with the given picks to a conclusion. */
function playToCompletion(
  creature: Creature,
  day: number,
  seed: number,
  tactic: Tactic,
): CupSession {
  const { loadout, tactic: t } = picks(creature, tactic)
  let cur = startCupSession(creature, day, seed)
  while (cur.status === "player-turn") {
    cur = resolvePlayerMatch(cur, loadout, t).session
  }
  return cur
}

/**
 * Win the champion-path cup (seed 17, default picks — cup-contracts'
 * golden path) standing at the save's current ladder position and close it
 * through the machine. The fighter's conditions are restored to the steady
 * tier so the frozen slot snapshot scores `battleStats` exactly as the
 * pinned golden does.
 */
function winCupAt(state: GameState): GameState {
  const creature = state.creature
  if (!creature) throw new Error("the save holds no creature")
  const restored = { ...creature, conditions: { ...CONDITION_START } }
  const session = playToCompletion(restored, state.day, 17, "balanced")
  return finalizeCup({ ...state, creature: restored }, session)
}

/** The morning routine: medicine first when sick, then a feed and a play. */
function tend(state: GameState): GameState {
  let out = state
  for (const action of ["treat", "feed", "play"] as const) {
    const attempt = careAction(out, action)
    if (attempt.ok) out = attempt.state
  }
  return out
}

/** Raise the ranch pet, night after night, until it leaves the baby stage. */
function raisePastBaby(state: GameState, capNights = 40): GameState {
  let out = state
  for (let night = 0; night < capNights; night++) {
    const creature = out.creature
    if (!creature) throw new Error("the ranch holds no pet")
    if (creature.stage !== "baby") return out
    out = advanceDay(tend(out))
  }
  throw new Error(`still a baby after ${capNights} nights`)
}

/** Pop the nursery queue head into the stable (the hatch seam's refusals
 * are pinned by the storm-gift suite; a granted save always hatches). */
function hatch(state: GameState): { state: GameState; hatched: Creature } {
  const result = hatchGiftEgg(state)
  if (!result.ok) throw new Error(`hatch refused: ${result.reason}`)
  const last = result.state.stable.length - 1
  const hatched = result.state.stable[last]
  if (!hatched) throw new Error("the hatch left no pet in the stable")
  return { state: result.state, hatched }
}

/** Assert a won cup: the creature took all three rounds, with real clock
 * battle replays behind every verdict. */
function expectCupWin(session: CupSession, creature: Creature): void {
  const name = creature.name
  expect(session.status).toBe("champion")
  expect(session.championName).toBe(name)
  expect(session.playerVerdicts.map((v) => v.winner)).toEqual([
    name,
    name,
    name,
  ])
  for (const verdict of session.playerVerdicts) {
    expect(verdict.battle).not.toBeNull()
    expect(verdict.battle?.winner).toBe(name)
    expect(verdict.battle?.events.length ?? 0).toBeGreaterThan(0)
  }
}

/** The shared tail of both lifecycles: raise the hatched pet on the ranch,
 * assert the juvenile gate and its earned champion branch, then win a cup. */
function expectGrownAndCupWin(
  swapped: GameState,
  egg: Creature,
  speciesId: string,
  cupSeed: number,
): void {
  const raised = raisePastBaby(swapped)
  const grown = raised.creature
  if (!grown) throw new Error("the ranch holds no pet after raising")
  expect(grown.stage).toBe("juvenile")
  // The pet's own age closed the gate — never the world day.
  expect(grown.ageDays).toBeGreaterThanOrEqual(EVOLUTION_DAY)
  // A champion branch of its own line (either form).
  const forms = branchesForSpecies(speciesId).map((b) => b.id)
  const branchId = grown.branch
  if (branchId === null) throw new Error("the juvenile took no branch")
  expect(forms).toContain(branchId)
  const branch = getBranch(branchId)
  if (!branch) throw new Error("the earned branch is missing")
  // The branch's juvenile boost sits on the rolled base — nothing else moved.
  expect(grown.stats).toEqual({
    hp: egg.stats.hp + branch.juvenileBoost.hp,
    atk: egg.stats.atk + branch.juvenileBoost.atk,
    def: egg.stats.def + branch.juvenileBoost.def,
    spd: egg.stats.spd + branch.juvenileBoost.spd,
  })
  // The signature is earned with the gate, never defaulted into the kit.
  const species = getSpecies(speciesId)
  if (!species) throw new Error("species missing")
  const signature = branch.signatureMove
  if (signature === null) throw new Error("the branch teaches no signature")
  expect(knownMoves(grown, species)).toContain(signature)
  expectCupWin(playToCompletion(grown, raised.day, cupSeed, "balanced"), grown)
}

describe("the full lifecycle: earth_tortoise via the Legend reward (FR-1)", () => {
  test("claim → hatch → raise → branch → win a cup, end to end", () => {
    const day7 = driveToDay(DAY)

    // Reaching Gold queues the fernstag behind the hound and the reefclaw
    // behind the falcon — two species per tier now; the tortoise does not
    // exist in the queue yet.
    const gold: GameState = {
      ...day7,
      ladder: { ...day7.ladder, ...AT_GOLD },
    }
    const afterGold = winCupAt(gold)
    expect(afterGold.claimedTiers).toEqual(["silver", "gold"])
    expect(afterGold.pendingRewards.map((egg) => egg.speciesId)).toEqual([
      "electric_hound",
      "fernstag",
      "wind_falcon",
      "reefclaw",
    ])
    expect(leagueRewardPending(afterGold)).toBe(true)

    // Reaching the Legend plateau adds the tortoise and the cindermoor
    // behind the queue.
    const legend: GameState = {
      ...afterGold,
      ladder: { ...afterGold.ladder, ...AT_LEGEND },
    }
    const afterLegend = winCupAt(legend)
    expect(afterLegend.phase).toBe("day")
    expect(afterLegend.claimedTiers).toEqual(["silver", "gold", "legend"])
    expect(afterLegend.pendingRewards.map((egg) => egg.speciesId)).toEqual([
      "electric_hound",
      "fernstag",
      "wind_falcon",
      "reefclaw",
      "earth_tortoise",
      "cindermoor",
    ])

    // The hatch order is the queue order: oldest tier first, older line
    // of a tier before the newer one.
    const first = hatch(afterLegend)
    expect(first.hatched.speciesId).toBe("electric_hound")
    const second = hatch(first.state)
    expect(second.hatched.speciesId).toBe("fernstag")
    const third = hatch(second.state)
    expect(third.hatched.speciesId).toBe("wind_falcon")
    const fourth = hatch(third.state)
    expect(fourth.hatched.speciesId).toBe("reefclaw")
    const fifth = hatch(fourth.state)
    const tortoise = fifth.hatched
    expect(fifth.state.pendingRewards.map((egg) => egg.speciesId)).toEqual([
      "cindermoor",
    ])

    // The pure egg individual: the exact seeded roll, no drift ever drawn.
    const seed = afterLegend.pendingRewards[4]?.seed
    if (seed === undefined) throw new Error("the tortoise egg lost its seed")
    expect(tortoise).toEqual(createGiftEgg("earth_tortoise", seed))
    expect(tortoise.affinity).toBeNull()
    expect(tortoise.giftEgg).toBe(true)
    expect(tortoise.parents).toEqual([])
    expect(tortoise.stage).toBe("baby")

    // The tortoise takes the ranch; the earlier gifts wait their turn.
    const swapped = bringToRanch(fifth.state, stablePetId(4))
    if (!swapped.ok) throw new Error(`swap refused: ${swapped.reason}`)
    expect(swapped.state.creature?.speciesId).toBe("earth_tortoise")
    expect(swapped.state.stable.at(-1)?.speciesId).toBe("fire_drake")

    expectGrownAndCupWin(
      swapped.state,
      tortoise,
      "earth_tortoise",
      TORTOISE_CUP_SEED,
    )
  })
})

describe("the full lifecycle: wind_falcon via the Gold reward (FR-1)", () => {
  test("claim → hatch → raise → branch → win a cup, end to end", () => {
    const day7 = driveToDay(DAY)
    const gold: GameState = {
      ...day7,
      ladder: { ...day7.ladder, ...AT_GOLD },
    }
    const afterGold = winCupAt(gold)
    expect(afterGold.claimedTiers).toEqual(["silver", "gold"])
    expect(afterGold.pendingRewards.map((egg) => egg.speciesId)).toEqual([
      "electric_hound",
      "fernstag",
      "wind_falcon",
      "reefclaw",
    ])

    // The hatch order is the queue order: the hound hatches first, then its
    // tier-mate, then the falcon.
    const first = hatch(afterGold)
    expect(first.hatched.speciesId).toBe("electric_hound")
    const second = hatch(first.state)
    expect(second.hatched.speciesId).toBe("fernstag")
    const third = hatch(second.state)
    const falcon = third.hatched
    expect(third.state.pendingRewards.map((egg) => egg.speciesId)).toEqual([
      "reefclaw",
    ])

    // The pure egg individual: the exact seeded roll, no drift ever drawn.
    const seed = afterGold.pendingRewards[2]?.seed
    if (seed === undefined) throw new Error("the falcon egg lost its seed")
    expect(falcon).toEqual(createGiftEgg("wind_falcon", seed))
    expect(falcon.affinity).toBeNull()
    expect(falcon.giftEgg).toBe(true)
    expect(falcon.parents).toEqual([])
    expect(falcon.stage).toBe("baby")

    // The falcon takes the ranch; the silver gifts keep waiting in the stable.
    const swapped = bringToRanch(third.state, stablePetId(2))
    if (!swapped.ok) throw new Error(`swap refused: ${swapped.reason}`)
    expect(swapped.state.creature?.speciesId).toBe("wind_falcon")
    expect(swapped.state.stable.map((pet) => pet.speciesId)).toEqual([
      "electric_hound",
      "fernstag",
      "fire_drake",
    ])

    expectGrownAndCupWin(swapped.state, falcon, "wind_falcon", FALCON_CUP_SEED)
  })
})
