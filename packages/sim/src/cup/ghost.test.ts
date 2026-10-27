/**
 * Ghost bundle capture + deterministic replay (ghost_data_async_rivals,
 * Phase 1): a cup win yields a full replay bundle (seed, both kits, event
 * log, sim version pin) that plays back byte-identically from the bundle
 * alone. Local replay only — the server best/store arrives in Phase 2.
 */

import { describe, expect, test } from "bun:test"
import type { Creature } from "../index"
import {
  advanceDay,
  CONDITION_START,
  chooseStarter,
  completeCup,
  createInitialState,
  cupMatchSeed,
  defaultLoadout,
  forfeitCup,
  getSpecies,
  resolvePlayerMatch,
  startCupSession,
} from "../index"
import {
  buildGhostBundle,
  replayGhost,
  SIM_VERSION,
  verifyGhostBundle,
} from "./ghost"

/**
 * A state standing on cup day 7 with a fresh creature, restored to the
 * condition it is named for (mirrors the cup-contracts fixture): without
 * the restore the nightly tick leaves the creature starving/sluggish and
 * the pinned champion path below stops winning.
 */
function cupDayCreature(seed = 42): Creature {
  let s = advanceDay(chooseStarter(createInitialState(), "fire_drake", seed))
  while (s.day < 7) s = advanceDay(s)
  const creature = s.creature
  if (!creature) throw new Error("state has no creature")
  return { ...creature, conditions: { ...CONDITION_START } }
}

/** Play the pinned champion path (seed 17, default picks, balanced). */
function championCreatureAndSeed(): { creature: Creature; day: number } {
  return { creature: cupDayCreature(), day: 7 }
}

describe("ghost bundle — capture on a cup win", () => {
  test("a championship yields a version-pinned bundle (seed, both kits, log)", () => {
    const { creature, day } = championCreatureAndSeed()
    const species = getSpecies(creature.speciesId)
    if (!species) throw new Error("unknown species")
    const loadout = defaultLoadout(creature, species)
    let session = startCupSession(creature, day, 17)
    for (let round = 1; round <= 3; round++) {
      session = resolvePlayerMatch(session, loadout, "balanced").session
    }
    expect(session.status).toBe("champion")

    const bundle = buildGhostBundle(session)
    if (!bundle) throw new Error("champion session captured no bundle")
    expect(bundle.simVersion).toBe(SIM_VERSION)
    expect(bundle.day).toBe(day)
    expect(bundle.round).toBe(3)
    expect(bundle.seed).toBe(cupMatchSeed(day, 3, 0))
    expect(bundle.player.kit).toEqual(loadout)
    expect(bundle.rival.kit.length).toBeGreaterThan(0)
    expect(bundle.events.length).toBeGreaterThan(0)
    expect(bundle.winner).toBe(creature.name)
  })

  test("no bundle without a championship: early exit, forfeit, live session", () => {
    const { creature, day } = championCreatureAndSeed()
    const species = getSpecies(creature.speciesId)
    if (!species) throw new Error("unknown species")
    const loadout = defaultLoadout(creature, species)

    // Seed 101 loses the quarterfinal under balanced default picks
    // (cup-contracts golden), so the completed bracket has no crown.
    let elim = startCupSession(creature, day, 101)
    elim = resolvePlayerMatch(elim, loadout, "balanced").session
    expect(elim.status).toBe("eliminated")
    expect(buildGhostBundle(completeCup(elim))).toBeNull()

    // A forfeited cup never captures, even though the bracket completes.
    expect(
      buildGhostBundle(forfeitCup(startCupSession(creature, day, 17))),
    ).toBeNull()

    // A live session (player still fighting) captures nothing.
    expect(buildGhostBundle(startCupSession(creature, day, 17))).toBeNull()
  })
})

describe("ghost bundle — deterministic replay", () => {
  test("replay from the bundle alone is byte-identical to the captured log", () => {
    const { creature, day } = championCreatureAndSeed()
    const species = getSpecies(creature.speciesId)
    if (!species) throw new Error("unknown species")
    const loadout = defaultLoadout(creature, species)
    let session = startCupSession(creature, day, 17)
    for (let round = 1; round <= 3; round++) {
      session = resolvePlayerMatch(session, loadout, "balanced").session
    }
    const bundle = buildGhostBundle(session)
    if (!bundle) throw new Error("champion session captured no bundle")

    const replayed = replayGhost(bundle)
    expect(replayed.events).toEqual(bundle.events)
    expect(replayed.winner).toBe(bundle.winner)
    expect(JSON.stringify(replayed.events)).toBe(JSON.stringify(bundle.events))
    expect(verifyGhostBundle(bundle)).toBe(true)
  })

  test("the bundle is a copy: later session mutation never rewrites it", () => {
    const { creature, day } = championCreatureAndSeed()
    const species = getSpecies(creature.speciesId)
    if (!species) throw new Error("unknown species")
    const loadout = defaultLoadout(creature, species)
    let session = startCupSession(creature, day, 17)
    for (let round = 1; round <= 3; round++) {
      session = resolvePlayerMatch(session, loadout, "balanced").session
    }
    const bundle = buildGhostBundle(session)
    if (!bundle) throw new Error("champion session captured no bundle")

    // Snapshot before mutating: the session's kit array is the loadout
    // array itself, so the mutation below also rewrites `loadout`.
    const kitBefore = [...bundle.player.kit]
    const hpBefore = bundle.player.stats.hp
    const eventsBefore = bundle.events.length

    // The session stays live after the final: mutate everything mutable.
    const final = session.playerVerdicts[session.playerVerdicts.length - 1]
    if (!final?.battle || !final.sides) throw new Error("no final to mutate")
    const [playerSide, rivalSide] = final.sides
    if (!playerSide || !rivalSide) throw new Error("no sides to mutate")
    ;(playerSide.kit as string[]).push("mutated_move")
    ;(playerSide.stats as { hp: number }).hp = -1
    ;(final.battle.events as unknown as unknown[]).length = 0

    expect(bundle.player.kit).toEqual(kitBefore)
    expect(bundle.player.stats.hp).toBe(hpBefore)
    expect(bundle.events).toHaveLength(eventsBefore)
    expect(verifyGhostBundle(bundle)).toBe(true)
  })

  test("two runs of the same cup capture identical bundles", () => {
    const run = (): string => {
      const { creature, day } = championCreatureAndSeed()
      const species = getSpecies(creature.speciesId)
      if (!species) throw new Error("unknown species")
      const loadout = defaultLoadout(creature, species)
      let session = startCupSession(creature, day, 17)
      for (let round = 1; round <= 3; round++) {
        session = resolvePlayerMatch(session, loadout, "balanced").session
      }
      const bundle = buildGhostBundle(session)
      if (!bundle) throw new Error("champion session captured no bundle")
      return JSON.stringify(bundle)
    }
    expect(run()).toBe(run())
  })

  test("the bundle survives a JSON round trip (the server transport shape)", () => {
    const { creature, day } = championCreatureAndSeed()
    const species = getSpecies(creature.speciesId)
    if (!species) throw new Error("unknown species")
    const loadout = defaultLoadout(creature, species)
    let session = startCupSession(creature, day, 17)
    for (let round = 1; round <= 3; round++) {
      session = resolvePlayerMatch(session, loadout, "balanced").session
    }
    const bundle = buildGhostBundle(session)
    if (!bundle) throw new Error("champion session captured no bundle")
    const revived = JSON.parse(JSON.stringify(bundle)) as typeof bundle
    expect(verifyGhostBundle(revived)).toBe(true)
  })

  test("tampered logs and foreign versions fail verification quietly", () => {
    const { creature, day } = championCreatureAndSeed()
    const species = getSpecies(creature.speciesId)
    if (!species) throw new Error("unknown species")
    const loadout = defaultLoadout(creature, species)
    let session = startCupSession(creature, day, 17)
    for (let round = 1; round <= 3; round++) {
      session = resolvePlayerMatch(session, loadout, "balanced").session
    }
    const bundle = buildGhostBundle(session)
    if (!bundle) throw new Error("champion session captured no bundle")

    expect(verifyGhostBundle({ ...bundle, simVersion: SIM_VERSION + 1 })).toBe(
      false,
    )
    expect(verifyGhostBundle({ ...bundle, events: [] })).toBe(false)
    const swapped = [...bundle.events].reverse()
    expect(verifyGhostBundle({ ...bundle, events: swapped })).toBe(false)
  })
})
