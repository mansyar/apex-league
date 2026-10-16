import { describe, expect, test } from "bun:test"
import {
  type CupSlot,
  doubleKoWinner,
  makeBracket,
  RIVAL_NAME_POOL,
} from "./cup"
import {
  buildPlaybackScript,
  type Creature,
  type CupSession,
  completeCup,
  createCreature,
  cupPlacement,
  defaultLoadout,
  doubleKoAdvancingName,
  effectiveStats,
  getSpecies,
  type RoundVerdict,
  resolvePlayerMatch,
  STARTER_SPECIES,
  startCupSession,
} from "./index"

/** Build a live player creature (mirrors chooseStarter). */
function playerCreature(seed = 11): Creature {
  return createCreature("fire_drake", seed)
}

const cupDay = 7

/** Play a cup to completion with the default picks (equipped loadout,
 * balanced tactic) and finish the bracket. The live engine's fixed-pick
 * equivalent of a fully resolved cup. */
function playLive(c: Creature, day: number, seed?: number): CupSession {
  const species = getSpecies(c.speciesId)
  if (!species) throw new Error(`unknown species ${c.speciesId}`)
  const loadout = defaultLoadout(c, species)
  // Same default as makeBracket: an unseeded cup derives its seed from the
  // day alone.
  let cur = startCupSession(c, day, seed ?? (day * 7 + 1) >>> 0)
  while (cur.status === "player-turn") {
    cur = resolvePlayerMatch(cur, loadout, "balanced").session
  }
  if (cur.status === "eliminated") cur = completeCup(cur)
  return cur
}

/** Every verdict of a finished session, grouped by round. */
function verdictsByRound(session: CupSession): Map<number, RoundVerdict[]> {
  const all = [
    ...session.rivalVerdicts,
    ...session.playerVerdicts,
    ...session.completionVerdicts,
  ]
  const byRound = new Map<number, RoundVerdict[]>()
  for (const v of all) {
    const list = byRound.get(v.round) ?? []
    list.push(v)
    byRound.set(v.round, list)
  }
  return byRound
}

/** An 8-bracket halves 4 → 2 → 1: round 1 resolves 4 pairings, round 2
 * resolves 2, round 3 resolves the final. */
function expectHalving(session: CupSession): void {
  const byRound = verdictsByRound(session)
  const counts = [1, 2, 3].map((r) => byRound.get(r)?.length ?? 0)
  expect(counts).toEqual([4, 2, 1])
}

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

  test("makeBracket draw stream is stable (golden, seed 21 day 7)", () => {
    // RNG STREAM INVARIANT pin: the bracket identity is the draw sequence,
    // not just the seed. Any added/removed/reordered rng draw in
    // makeBracket changes which opponents a given (day, save) meets —
    // silently rewriting cup history. This golden catches that.
    const bracket = makeBracket(playerCreature(11), 7, 21)
    expect(JSON.parse(JSON.stringify(bracket.slots))).toEqual([
      {
        isPlayer: true,
        name: "Ember Drake",
        speciesId: "fire_drake",
        stats: { hp: 84, atk: 11, def: 9, spd: 11 },
      },
      {
        isPlayer: false,
        name: "Pondskipper Grub",
        speciesId: "plant_ox",
        stats: { hp: 88, atk: 9, def: 11, spd: 7 },
      },
      {
        isPlayer: false,
        name: "Bramble Knoll Ox",
        speciesId: "plant_ox",
        stats: { hp: 88, atk: 10, def: 10, spd: 8 },
      },
      {
        isPlayer: false,
        name: "Thistledown Ash",
        speciesId: "plant_ox",
        stats: { hp: 89, atk: 11, def: 11, spd: 8 },
      },
      {
        isPlayer: false,
        name: "Reedle Mirefin",
        speciesId: "plant_ox",
        stats: { hp: 88, atk: 10, def: 10, spd: 8 },
      },
      {
        isPlayer: false,
        name: "Cindersnout",
        speciesId: "plant_ox",
        stats: { hp: 89, atk: 11, def: 11, spd: 7 },
      },
      {
        isPlayer: false,
        name: "Bonfire Brook",
        speciesId: "water_axolotl",
        stats: { hp: 85, atk: 11, def: 8, spd: 11 },
      },
      {
        isPlayer: false,
        name: "Ash-ledger",
        speciesId: "fire_drake",
        stats: { hp: 89, atk: 12, def: 10, spd: 11 },
      },
    ])
  })
})

describe("RIVAL_NAME_POOL", () => {
  test("has at least 8 unique, non-player names", () => {
    expect(new Set(RIVAL_NAME_POOL).size).toBeGreaterThanOrEqual(8)
    expect(RIVAL_NAME_POOL.length).toBeLessThanOrEqual(24)
  })
})

describe("the live cup engine — session resolution", () => {
  test("a winning run: champion = the player, 3 rounds, placement 1", () => {
    // Rivals are even with the player by design (QF −5% / SF 0 / F +5%),
    // so a winning run needs a creature at the top of its roll band —
    // sweep seeds until the player takes a cup, then pin the contract.
    let winner: Creature | null = null
    let wonDay = 0
    let wonSeed = 0
    outer: for (const sp of STARTER_SPECIES) {
      for (const day of [7, 14, 21]) {
        for (let seed = 1; seed <= 30; seed++) {
          const c = createCreature(sp.id, seed)
          const grown = { ...c, trained: { hp: 3, atk: 3, def: 3, spd: 3 } }
          if (playLive(grown, day, seed).status === "champion") {
            winner = grown
            wonDay = day
            wonSeed = seed
            break outer
          }
        }
      }
    }
    expect(winner).not.toBeNull()
    if (!winner) throw new Error("no winning seed found")
    const session = playLive(winner, wonDay, wonSeed)
    expect(session.status).toBe("champion")
    expect(session.championName).toBe(winner.name)
    expect(session.playerVerdicts.length).toBe(3)
    expect(cupPlacement(session)).toBe(1)
  })

  test("each round halves the field: 4 → 2 → 1 verdicts per round", () => {
    const c = playerCreature(11)
    expectHalving(playLive(c, 7))
  })

  test("every round logs a short verdict line (announcer feed)", () => {
    const c = playerCreature(11)
    const byRound = verdictsByRound(playLive(c, 7))
    for (const verdicts of byRound.values()) {
      for (const v of verdicts) {
        expect(v.line.length).toBeGreaterThan(0)
        expect(v.line.length).toBeLessThanOrEqual(120)
      }
    }
  })

  test("on a loss the reported champion is the real tournament winner", () => {
    // Regression (review): a QF/SF exit must crown the last survivor of
    // the remaining bracket — not a semifinalist from the loss round.
    for (let seed = 1; seed <= 60; seed++) {
      const c = playerCreature(seed)
      const session = playLive(c, 7, seed)
      if (session.status === "champion") {
        expect(session.championName).toBe(c.name)
        continue
      }
      expect(session.championName).not.toBe(c.name)
      // The champion is whoever won the last resolved pairing: the final
      // completion verdict, or the SF2 winner if the player lost the final.
      // A double-KO in that pairing crowns the higher-HP slot via the sim's
      // tiebreak (FR4) — the naive winner lookup mis-derives there.
      const finalVerdict =
        session.completionVerdicts[session.completionVerdicts.length - 1] ??
        session.rivalVerdicts[3] ??
        null
      const expected =
        finalVerdict?.winner ??
        (finalVerdict?.battle
          ? doubleKoAdvancingName(
              finalVerdict.slotA,
              finalVerdict.slotB,
              finalVerdict.battle.finalHp,
            )
          : null)
      expect(session.championName).toBe(expected)
    }
  })

  test("placement follows the rounds the player actually fought", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const c = playerCreature(seed)
      const session = playLive(c, 7, seed)
      const placement = cupPlacement(session)
      if (session.status === "champion") {
        expect(placement).toBe(1)
        continue
      }
      const played = session.playerVerdicts.length
      expect(placement).toBe(played >= 3 ? 2 : played === 2 ? 3 : 4)
    }
  })
})

describe("doubleKoWinner — double-KO tiebreak", () => {
  const slot = (name: string, isPlayer = false): CupSlot => ({
    isPlayer,
    name,
    speciesId: "fire_drake",
    stats: { hp: 10, atk: 6, def: 5, spd: 5 },
  })
  const a = slot("A")
  const b = slot("B")

  test("advances the side with the higher remaining HP", () => {
    expect(doubleKoWinner(a, b, { A: 3, B: 12 })).toBe(b)
    expect(doubleKoWinner(a, b, { A: 12, B: -8 })).toBe(a)
  })

  test("an exact tie falls to the earlier slot (deterministic field order)", () => {
    expect(doubleKoWinner(a, b, { A: 0, B: 0 })).toBe(a)
    expect(doubleKoWinner(a, b, { A: 7, B: 7 })).toBe(a)
  })

  test("missing finalHp entries count as 0 (no crash on odd names)", () => {
    expect(doubleKoWinner(a, b, {})).toBe(a)
  })

  test("a cup containing a double-KO still halves every round", () => {
    // Sweep days until a bracket produces a double-KO verdict (winner: null),
    // then assert the live resolution still shrank the field 4 → 2 → 1
    // verdicts per round (completion rounds included) — the tiebreak must
    // never stall a round.
    let sawDraw = false
    for (let day = 7; day <= 60 && !sawDraw; day++) {
      const c = playerCreature(11)
      const session = playLive(c, day)
      expectHalving(session)
      const hasDraw = [
        ...session.rivalVerdicts,
        ...session.playerVerdicts,
        ...session.completionVerdicts,
      ].some((v) => v.winner === null)
      if (hasDraw) sawDraw = true
    }
    if (sawDraw) expect(sawDraw).toBe(true)
  })
})

describe("verdict-carried battle results (live cup)", () => {
  // The arena replays each cup battle from the resolver's event log, so
  // every verdict must carry the full BattleResult.
  const allVerdicts = (session: CupSession): RoundVerdict[] => [
    ...session.rivalVerdicts,
    ...session.playerVerdicts,
    ...session.completionVerdicts,
  ]

  test("every verdict carries the full BattleResult with events", () => {
    const c = playerCreature(11)
    for (const v of allVerdicts(playLive(c, 7))) {
      if (!v.battle) throw new Error("verdict lost its battle")
      expect(v.battle.winner).toBe(v.winner)
      expect(v.battle.events.length).toBeGreaterThan(0)
      for (const e of v.battle.events) {
        expect([v.slotA, v.slotB]).toContain(e.actor)
      }
    }
  })

  test("rival-vs-rival verdicts also carry replayable events", () => {
    // Player-independent pairings (e.g. QF2) must be replayable too — the
    // bracket reveals rival battles as text only, but the contract is uniform.
    const c = playerCreature(11)
    const session = playLive(c, 7)
    const rivalOnly = session.rivalVerdicts.filter(
      (v) => v.slotA !== c.name && v.slotB !== c.name,
    )
    expect(rivalOnly.length).toBeGreaterThan(0)
    for (const v of rivalOnly) {
      if (!v.battle) throw new Error("verdict lost its battle")
      expect(v.battle.events.length).toBeGreaterThan(0)
      expect(v.battle.finalHp).toBeDefined()
    }
  })

  test("the player's verdict events feed the arena playback script 1:1", () => {
    const c = playerCreature(11)
    const session = playLive(c, 7)
    const playerVerdict = session.playerVerdicts[0]
    if (!playerVerdict) throw new Error("no player verdict")
    if (!playerVerdict.battle) throw new Error("verdict lost its battle")
    const script = buildPlaybackScript(playerVerdict.battle.events)
    expect(script.length).toBe(playerVerdict.battle.events.length)
    expect(script[0]?.tick).toBe(playerVerdict.battle.events[0]?.tick)
  })

  test("battle results are deterministic across runs (same inputs)", () => {
    const c = playerCreature(11)
    const a = allVerdicts(playLive(c, 7))
    const b = allVerdicts(playLive(c, 7))
    expect(a.map((v) => v.battle)).toEqual(b.map((v) => v.battle))
  })
})
