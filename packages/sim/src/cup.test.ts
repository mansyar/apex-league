import { describe, expect, test } from "bun:test"
import {
  CUP_ROUNDS,
  type CupSlot,
  makeBracket,
  RIVAL_NAME_POOL,
  resolveCup,
  runRound,
} from "./cup"
import {
  type BattleResult,
  buildPlaybackScript,
  type Creature,
  createCreature,
  effectiveStats,
  getSpecies,
  STARTER_SPECIES,
} from "./index"

/** Build a live player creature (mirrors chooseStarter). */
function playerCreature(seed = 11): Creature {
  return createCreature("fire_drake", seed)
}

const cupDay = 7

describe("makeBracket — cup bracket generation", () => {
  test("returns 8 slots with the player at slot 1 and 7 rivals", () => {
    const c = playerCreature()
    const bracket = makeBracket(c, cupDay)
    expect(bracket.slots.length).toBe(8)
    expect(bracket.slots[0]?.isPlayer).toBe(true)
    const rivals = bracket.slots.filter((s) => !s.isPlayer)
    expect(rivals.length).toBe(7)
  })

  test("is deterministic given the same creature and day", () => {
    const c = playerCreature()
    const a = makeBracket(c, cupDay)
    const b = makeBracket(c, cupDay)
    expect(a.slots).toEqual(b.slots)
    const namesA = a.slots.map((s) => s.name)
    const namesB = b.slots.map((s) => s.name)
    expect(namesA).toEqual(namesB)
  })

  test("differs across days (a fresh cup rolls fresh rivals)", () => {
    const c = playerCreature()
    const a = makeBracket(c, 7)
    const b = makeBracket(c, 14)
    const speciesA = a.slots.filter((s) => !s.isPlayer).map((s) => s.speciesId)
    const speciesB = b.slots.filter((s) => !s.isPlayer).map((s) => s.speciesId)
    expect(speciesA).not.toEqual(speciesB)
  })

  test("every rival name comes from the pool and names are unique", () => {
    const c = playerCreature()
    const bracket = makeBracket(c, cupDay)
    const rivalNames = bracket.slots
      .filter((s) => !s.isPlayer)
      .map((s) => s.name)
    for (const name of rivalNames) {
      expect(RIVAL_NAME_POOL).toContain(name)
    }
    expect(new Set(rivalNames).size).toBe(rivalNames.length)
    expect(rivalNames).not.toContain(c.name)
  })

  test("rivals use only available species", () => {
    const c = playerCreature()
    const bracket = makeBracket(c, cupDay)
    for (const slot of bracket.slots) {
      const species = getSpecies(slot.speciesId)
      if (!species) throw new Error(`unknown slot species ${slot.speciesId}`)
      expect(species.available).toBe(true)
    }
  })

  test("rival stats stay inside their species' stat bounds after the ramp", () => {
    for (const day of [7, 14, 21, 28, 105]) {
      const c = playerCreature()
      const bracket = makeBracket(c, day)
      for (const slot of bracket.slots) {
        if (slot.isPlayer) continue
        const species = getSpecies(slot.speciesId)
        if (!species) throw new Error(`unknown species ${slot.speciesId}`)
        const bounds = species.statBounds
        for (const stat of ["hp", "atk", "def", "spd"] as const) {
          const pair = bounds[stat]
          if (!pair) throw new Error(`missing bounds for ${stat}`)
          const [lo, hi] = pair
          expect(slot.stats[stat]).toBeGreaterThanOrEqual(lo)
          expect(slot.stats[stat]).toBeLessThanOrEqual(hi)
        }
      }
    }
  })

  test("ramp sets the final-round rival above the player's effective stats", () => {
    const c = playerCreature(21)
    const bracket = makeBracket(c, cupDay)
    const finalRival = bracket.finalRival
    const eff = effectiveStats(c)
    const above =
      finalRival.stats.atk > eff.atk ||
      finalRival.stats.def > eff.def ||
      finalRival.stats.spd > eff.spd
    expect(above).toBe(true)
  })

  test("does not mutate the player creature", () => {
    const c = playerCreature()
    const before = JSON.stringify(c)
    makeBracket(c, cupDay)
    expect(JSON.stringify(c)).toBe(before)
  })

  test("round-count constants line up with an 8-bracket", () => {
    expect(makeBracket(playerCreature(), cupDay).rounds).toBe(3)
  })
})

describe("RIVAL_NAME_POOL", () => {
  test("has at least 8 unique, non-player names", () => {
    expect(new Set(RIVAL_NAME_POOL).size).toBeGreaterThanOrEqual(8)
    expect(RIVAL_NAME_POOL.length).toBeLessThanOrEqual(24)
  })
})

describe("runRound / resolveCup — one-sitting resolution", () => {
  test("a winning run: champion = the player, 3 rounds, placement 1", () => {
    // Rivals are even with the player by design (QF −5% / SF 0 / F +5%),
    // so a winning run needs a creature at the top of its roll band —
    // sweep seeds until the player takes a cup, then pin the contract.
    let won: ReturnType<typeof resolveCup> | null = null
    let winnerCreature: Creature | null = null
    for (const sp of STARTER_SPECIES) {
      for (const day of [7, 14, 21]) {
        for (let seed = 1; seed <= 30; seed++) {
          const c = createCreature(sp.id, seed)
          const grown = { ...c, trained: { hp: 3, atk: 3, def: 3, spd: 3 } }
          const result = resolveCup(makeBracket(grown, day), grown)
          if (result.playerPlacement === 1) {
            won = result
            winnerCreature = grown
            break
          }
        }
      }
    }
    expect(won).not.toBeNull()
    if (!won || !winnerCreature) throw new Error("no winning seed found")
    expect(won.championName).toBe(winnerCreature.name)
    expect(won.roundsPlayed).toBe(3)
    expect(won.playerPlacement).toBe(1)
  })

  test("each round halves the field: 8→4→2→1 via explicit alive threading", () => {
    const c = playerCreature(11)
    const bracket = makeBracket(c, 7)
    let alive: readonly CupSlot[] = bracket.slots
    for (let round = 1; round <= 3; round++) {
      const r = runRound(bracket, round, c, round === 1 ? undefined : alive)
      expect(r.winners.length).toBe(alive.length / 2)
      alive = r.winners
    }
    expect(alive.length).toBe(1)
  })

  test("results are deterministic for the same inputs", () => {
    const c = playerCreature(11)
    const a = resolveCup(makeBracket(c, 7), c)
    const b = resolveCup(makeBracket(c, 7), c)
    expect(a.rounds.map((r) => r.verdicts)).toEqual(
      b.rounds.map((r) => r.verdicts),
    )
    expect(a.championName).toBe(b.championName)
    expect(a.playerPlacement).toBe(b.playerPlacement)
  })

  test("resolveCup does not mutate the player creature or bracket", () => {
    const c = playerCreature(11)
    const bracket = makeBracket(c, 7)
    const before = JSON.stringify({ c, bracket })
    resolveCup(bracket, c)
    expect(JSON.stringify({ c, bracket })).toBe(before)
  })

  test("the player's loadout is honored (not the default kit slice)", () => {
    const c = playerCreature(11)
    const kit = getSpecies("fire_drake")?.kit ?? []
    const loadout = kit.slice(0, 2)
    const bracket = makeBracket(c, 7)
    const withLoadout: Creature = { ...c, loadout }
    const result = resolveCup(bracket, withLoadout)
    expect(result.roundsPlayed).toBe(3)
  })

  test("placement: 1st on win, 2nd on final loss, 3rd-4th on semifinal loss", () => {
    for (const seed of [3, 11, 42, 77]) {
      const c = playerCreature(seed)
      const bracket = makeBracket(c, 7)
      const result = resolveCup(bracket, c)
      if (result.playerPlacement === 1) {
        expect(result.championName).toBe(c.name)
      } else {
        expect(result.championName).not.toBe(c.name)
      }
      expect([1, 2, 3, 4]).toContain(result.playerPlacement)
    }
  })

  test("every round logs a short verdict line (announcer feed)", () => {
    const c = playerCreature(11)
    const bracket = makeBracket(c, 7)
    const result = resolveCup(bracket, c)
    for (const round of result.rounds) {
      for (const v of round.verdicts) {
        expect(v.line.length).toBeGreaterThan(0)
        expect(v.line.length).toBeLessThanOrEqual(120)
      }
    }
  })

  test("on a loss the reported champion is the real tournament winner", () => {
    // Regression (review): the loss branch read the loss round's winners
    // instead of the continuation loop's final survivor, announcing a
    // semifinalist as champion on every QF/SF exit.
    for (let seed = 1; seed <= 60; seed++) {
      const c = playerCreature(seed)
      const bracket = makeBracket(c, 7)
      const result = resolveCup(bracket, c)
      if (result.playerPlacement === 1) continue
      // Independent replay: thread the alive field to the last survivor.
      let alive: readonly CupSlot[] = bracket.slots
      let actual = ""
      for (let round = 1; round <= CUP_ROUNDS; round++) {
        const r = runRound(bracket, round, c, round === 1 ? undefined : alive)
        alive = r.winners
        const last = alive[0]
        if (alive.length === 1 && last) actual = last.name
      }
      expect(result.championName).toBe(actual)
    }
  })

  test("placement mapping: QF loss → 4, SF loss → 3, final loss → 2", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const c = playerCreature(seed)
      const result = resolveCup(makeBracket(c, 7), c)
      if (result.playerPlacement === 1) continue
      const lostIn =
        result.rounds.findIndex((r) => !r.winners.some((w) => w.isPlayer)) + 1
      const expected = lostIn === 1 ? 4 : lostIn === 2 ? 3 : 2
      expect(result.playerPlacement).toBe(expected)
    }
  })

  test("makeBracket honors the seed (day + save seed mix)", () => {
    // Spec FR2: the bracket is a function of day + save seed, not the day
    // alone. The machine folds the creature identity into the seed and
    // passes it here; two different seeds must draw different fields.
    const c = playerCreature(11)
    const names = (seed: number): string =>
      makeBracket(c, 7, seed)
        .slots.filter((s) => !s.isPlayer)
        .map((s) => s.name)
        .join()
    let differed = false
    for (let a = 1; a <= 20 && !differed; a++) {
      for (let b = a + 1; b <= 20; b++) {
        if (names(a) !== names(b)) {
          differed = true
          break
        }
      }
    }
    expect(differed).toBe(true)
  })
})

describe("edge cases", () => {
  test("resolveCup rejects a bracket without 8 slots", () => {
    const c = playerCreature(11)
    const bracket = makeBracket(c, 7)
    const broken = { ...bracket, slots: bracket.slots.slice(0, 4) }
    expect(() => resolveCup(broken, c)).toThrow()
  })
})

describe("verdict-carried battle results (live cup)", () => {
  // The live-cup track (spec FR4/FR5): the arena replays each cup battle
  // from the resolver's event log, so every verdict must carry the full
  // BattleResult — resolvePairing may no longer discard it.
  test("every verdict carries the full BattleResult with events", () => {
    const c = playerCreature(11)
    const result = resolveCup(makeBracket(c, 7), c)
    for (const round of result.rounds) {
      for (const v of round.verdicts) {
        if (!v.battle) throw new Error("verdict lost its battle")
        expect(v.battle.winner).toBe(v.winner)
        expect(v.battle.events.length).toBeGreaterThan(0)
        for (const e of v.battle.events) {
          expect([v.slotA, v.slotB]).toContain(e.actor)
        }
      }
    }
  })

  test("rival-vs-rival verdicts also carry replayable events", () => {
    // Player-independent pairings (e.g. QF2) must be replayable too — the
    // bracket reveals rival battles as text only, but the contract is uniform.
    const c = playerCreature(11)
    const result = resolveCup(makeBracket(c, 7), c)
    const rivalOnly = result.rounds[0]?.verdicts.filter(
      (v) => v.slotA !== c.name && v.slotB !== c.name,
    )
    expect(rivalOnly?.length).toBeGreaterThan(0)
    for (const v of rivalOnly ?? []) {
      if (!v.battle) throw new Error("verdict lost its battle")
      expect(v.battle.events.length).toBeGreaterThan(0)
      expect(v.battle.finalHp).toBeDefined()
    }
  })

  test("the player's verdict events feed the arena playback script 1:1", () => {
    const c = playerCreature(11)
    const result = resolveCup(makeBracket(c, 7), c)
    const playerVerdict = result.rounds[0]?.verdicts.find(
      (v) => v.slotA === c.name || v.slotB === c.name,
    )
    if (!playerVerdict) throw new Error("no player verdict in round 1")
    if (!playerVerdict.battle) throw new Error("verdict lost its battle")
    const script = buildPlaybackScript(playerVerdict.battle.events)
    expect(script.length).toBe(playerVerdict.battle.events.length)
    expect(script[0]?.tick).toBe(playerVerdict.battle.events[0]?.tick)
  })

  test("battle results are deterministic across runs (same inputs)", () => {
    const c = playerCreature(11)
    const a = resolveCup(makeBracket(c, 7), c)
    const b = resolveCup(makeBracket(c, 7), c)
    expect(a.rounds.map((r) => r.verdicts.map((v) => v.battle))).toEqual(
      b.rounds.map((r) => r.verdicts.map((v) => v.battle)),
    )
  })
})
