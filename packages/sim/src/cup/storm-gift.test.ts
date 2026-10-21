/**
 * The Storm Gift — the Silver tier-reward (electric species line, Phase 2).
 *
 * FR-5: on any non-forfeit cup finalize where the post-placement ladder tier
 * is Silver or higher and the reward was never claimed, the league grants
 * exactly one electric_hound egg — observed here as the one-time
 * `stormGiftClaimed` claim stamp. Forfeited cups never trigger or consume
 * the grant, and the retroactive path (an existing save already past
 * Silver) claims at its next non-forfeit finalize.
 */
import { describe, expect, test } from "bun:test"
import type { BattleResult } from "../battle/resolver"
import { getBoss } from "../bosses"
import {
  createBredCreature,
  createGiftEgg,
  hatchGiftEgg,
  rollAffinityDrift,
  STORM_GIFT_SPECIES_ID,
} from "../breeding"
import { createCreature, type Element } from "../creature"
import {
  type CupSession,
  forfeitCup,
  type RoundVerdict,
  startCupSession,
} from "../cup"
import { applyStormGift } from "../cupRewards"
import { type RetiredRecord, retireeRecord } from "../legacy"
import { finalizeCup } from "../machine"
import { getSpecies } from "../species"
import { chooseStarter, createInitialState, type GameState } from "../state"

const DAY = 7

/** A save standing at the given ladder position, on its cup day. */
function stateAt(ladder: Partial<GameState["ladder"]> = {}): GameState {
  const started = chooseStarter(createInitialState(), "fire_drake", 42)
  return { ...started, day: DAY, ladder: { ...started.ladder, ...ladder } }
}

function sessionOf(state: GameState): CupSession {
  const creature = state.creature
  if (!creature) throw new Error("expected a creature on the cup day")
  return startCupSession(creature, state.day, 101)
}

function verdict(
  round: number,
  slotA: string,
  slotB: string,
  winner: string,
): RoundVerdict {
  return { round, slotA, slotB, winner, line: "", battle: {} as BattleResult }
}

/** Close the session as its champion: one final won verdict. */
function crown(session: CupSession): CupSession {
  const playerName = session.bracket.slots[0]?.name ?? "player"
  return {
    ...session,
    status: "champion",
    championName: playerName,
    playerVerdicts: [
      ...session.playerVerdicts,
      verdict(3, playerName, session.bracket.finalRival.name, playerName),
    ],
  }
}

/** Close the session as the final's loser — still a non-forfeit finalize. */
function runnerUpSession(state: GameState): CupSession {
  const session = sessionOf(state)
  const playerName = session.bracket.slots[0]?.name ?? "player"
  const rival = session.bracket.finalRival.name
  return {
    ...session,
    status: "eliminated",
    championName: rival,
    playerVerdicts: [
      ...session.playerVerdicts,
      verdict(3, playerName, rival, rival),
    ],
  }
}

function forfeitedSession(state: GameState): CupSession {
  return forfeitCup(sessionOf(state))
}

describe("the Storm Gift grant at cup finalize (FR-5)", () => {
  test("a Silver save's first non-forfeit finalize claims the gift", () => {
    const s = stateAt({ tier: "silver", subTier: "III", points: 18 })
    const finalized = finalizeCup(s, crown(sessionOf(s)))
    expect(finalized.stormGiftClaimed).toBe(true)
    expect(finalized.phase).toBe("day")
  })

  test("a second finalize never re-grants — the claim is one-time", () => {
    const s = stateAt({ tier: "silver", subTier: "III", points: 18 })
    const first = finalizeCup(s, crown(sessionOf(s)))
    const second = finalizeCup(first, crown(sessionOf(first)))
    expect(second.stormGiftClaimed).toBe(true)
  })

  test("never fires below Silver", () => {
    const fresh = stateAt()
    const finalized = finalizeCup(fresh, crown(sessionOf(fresh)))
    expect(finalized.ladder.tier).toBe("bronze")
    expect(finalized.stormGiftClaimed).toBe(false)
  })

  test(
    "the Promotion Cup champion is crowned into Silver and claims the gift" +
      " at the same finalize (placement runs before the grant)",
    () => {
      const s = stateAt({ tier: "bronze", subTier: "I", points: 15 })
      const boss = getBoss("koda")
      if (!boss) throw new Error("missing boss koda")
      const creature = s.creature
      if (!creature) throw new Error("expected a creature")
      const session = startCupSession(creature, s.day, 101, "promotion", boss)
      const finalized = finalizeCup(s, crown(session))
      expect(finalized.ladder.tier).toBe("silver")
      expect(finalized.stormGiftClaimed).toBe(true)
    },
  )

  test("a forfeited cup never triggers the grant", () => {
    const s = stateAt({ tier: "silver", subTier: "III", points: 18 })
    const finalized = finalizeCup(s, forfeitedSession(s))
    expect(finalized.stormGiftClaimed).toBe(false)
  })

  test("a forfeit does not consume the gift — the next real finalize grants", () => {
    const s = stateAt({ tier: "silver", subTier: "III", points: 18 })
    const forfeited = finalizeCup(s, forfeitedSession(s))
    const later = finalizeCup(forfeited, crown(sessionOf(forfeited)))
    expect(later.stormGiftClaimed).toBe(true)
  })

  test("any non-forfeit finalize at Silver or higher grants — a final loss counts", () => {
    const s = stateAt({ tier: "gold", subTier: "I", points: 36 })
    const finalized = finalizeCup(s, runnerUpSession(s))
    expect(finalized.stormGiftClaimed).toBe(true)
  })

  test("the grant is pure — the input state is never mutated", () => {
    const s = stateAt({ tier: "silver", subTier: "III", points: 18 })
    const before = JSON.stringify(s)
    finalizeCup(s, crown(sessionOf(s)))
    expect(JSON.stringify(s)).toBe(before)
  })
})

describe("applyStormGift — the claim seam", () => {
  test("stamps the claim once at Silver or higher on a non-forfeit cup", () => {
    const s = stateAt({ tier: "silver", subTier: "III", points: 18 })
    expect(applyStormGift(s, false).stormGiftClaimed).toBe(true)
  })

  test("never stamps below Silver", () => {
    const fresh = stateAt()
    expect(applyStormGift(fresh, false).stormGiftClaimed).toBe(false)
    expect(applyStormGift(fresh, true).stormGiftClaimed).toBe(false)
  })

  test("never stamps on a forfeit, at any tier", () => {
    const s = stateAt({ tier: "legend", subTier: "I", points: 40 })
    expect(applyStormGift(s, true).stormGiftClaimed).toBe(false)
  })

  test("is idempotent on an already-claimed save", () => {
    const s = {
      ...stateAt({ tier: "legend", subTier: "I", points: 40 }),
      stormGiftClaimed: true,
    }
    expect(applyStormGift(s, false).stormGiftClaimed).toBe(true)
  })

  test("is pure — the input state is never mutated", () => {
    const s = stateAt({ tier: "silver", subTier: "III", points: 18 })
    const before = JSON.stringify(s)
    applyStormGift(s, false)
    expect(JSON.stringify(s)).toBe(before)
  })
})

/** A retired parent record with the given element, for drift fixtures. */
function parentRecord(generation: number, element: Element): RetiredRecord {
  return {
    name: element === "fire" ? "Sire" : "Dam",
    speciesId: element === "fire" ? "fire_drake" : "plant_ox",
    archetypeId: element === "fire" ? "draconic" : "bovine",
    element,
    affinity: null,
    stats: { hp: 120, atk: 18, def: 14, spd: 12 },
    trained: { hp: 0, atk: 0, def: 0, spd: 0 },
    cupsWon: 2,
    generation,
    retiredOnDay: 60,
    traits: [],
    parents: [],
    branch: "legacy",
    giftEgg: false,
  }
}

const MIXED_PARENTS: [RetiredRecord, RetiredRecord] = [
  parentRecord(0, "fire"),
  parentRecord(1, "plant"),
]

describe("the pure gift egg (FR-6)", () => {
  test("hatches fixed-Electric with a guaranteed null affinity and the gift marker", () => {
    const hatch = createGiftEgg(42)
    expect(hatch.speciesId).toBe(STORM_GIFT_SPECIES_ID)
    expect(hatch.element).toBe("electric")
    expect(hatch.affinity).toBeNull()
    expect(hatch.giftEgg).toBe(true)
    expect(hatch.stage).toBe("baby")
    expect(hatch.parents).toEqual([])
  })

  test("stats roll within the species bounds — same seed, same individual", () => {
    const species = getSpecies(STORM_GIFT_SPECIES_ID)
    if (!species) throw new Error("missing species electric_hound")
    for (const seed of [1, 42, 777]) {
      const a = createGiftEgg(seed)
      const b = createGiftEgg(seed)
      expect(a).toEqual(b)
      for (const key of ["hp", "atk", "def", "spd"] as const) {
        const [lo, hi] = species.statBounds[key]
        expect(a.stats[key]).toBeGreaterThanOrEqual(lo)
        expect(a.stats[key]).toBeLessThanOrEqual(hi)
      }
    }
  })

  test("the public starter gate stays locked — the gift path bypasses it without loosening it", () => {
    expect(() => createCreature(STORM_GIFT_SPECIES_ID, 1)).toThrow(
      /not yet available/,
    )
    // And every starter still creates through the public gate.
    expect(createCreature("fire_drake", 1).element).toBe("fire")
  })

  test("previewed equals hatched — the nursery hatch lands the exact previewed individual", () => {
    const granted = {
      ...stateAt({ tier: "silver", subTier: "III", points: 18 }),
      stormGiftClaimed: true,
    }
    const result = hatchGiftEgg(granted, 42)
    if (!result.ok) throw new Error("hatch refused")
    expect(result.state.creature).toEqual(createGiftEgg(42))
  })

  test("the hatch seam refuses an ungranted gift", () => {
    const ungranted = stateAt()
    expect(hatchGiftEgg(ungranted, 42)).toEqual({
      ok: false,
      reason: "not-granted",
    })
  })

  test("the hatch seam refuses a second hatch of the same gift", () => {
    const granted = {
      ...stateAt({ tier: "silver", subTier: "III", points: 18 }),
      stormGiftClaimed: true,
    }
    const hatched = hatchGiftEgg(granted, 42)
    if (!hatched.ok) throw new Error("hatch refused")
    expect(hatchGiftEgg(hatched.state, 42)).toEqual({
      ok: false,
      reason: "already-hatched",
    })
  })

  test("the gift marker persists into a Hall of Fame retirement", () => {
    const granted = {
      ...stateAt({ tier: "silver", subTier: "III", points: 18 }),
      stormGiftClaimed: true,
    }
    const hatched = hatchGiftEgg(granted, 42)
    if (!hatched.ok) throw new Error("hatch refused")
    const record = retireeRecord(hatched.state)
    if (!record) throw new Error("expected a retiree record")
    expect(record.giftEgg).toBe(true)
    // Once the marker sits anywhere in the lineage, the gift is spent.
    const retired = {
      ...hatched.state,
      creature: createCreature("fire_drake", 5),
      lineage: { generation: 1, hallOfFame: [record] },
    }
    expect(hatchGiftEgg(retired, 42)).toEqual({
      ok: false,
      reason: "already-hatched",
    })
  })

  test("the hatch carries the day over — the gift is not a graduation succession", () => {
    const granted = {
      ...stateAt({ tier: "silver", subTier: "III", points: 18 }),
      stormGiftClaimed: true,
    }
    const hatched = hatchGiftEgg(granted, 42)
    if (!hatched.ok) throw new Error("hatch refused")
    expect(hatched.state.day).toBe(granted.day)
    expect(hatched.state.actionPoints).toBe(granted.actionPoints)
    expect(hatched.state.ladder).toEqual(granted.ladder)
    expect(hatched.state.lineage.generation).toBe(granted.lineage.generation)
  })
})

describe("drift stream purity (NFR-3)", () => {
  test("an intervening gift creation never advances the drift stream", () => {
    const drake = getSpecies("fire_drake")
    if (!drake) throw new Error("missing species fire_drake")
    const before = rollAffinityDrift(drake, MIXED_PARENTS, 7)
    createGiftEgg(999)
    expect(rollAffinityDrift(drake, MIXED_PARENTS, 7)).toBe(before)
  })

  test("a bred egg's full hatch is identical with and without an intervening grant", () => {
    const before = createBredCreature("fire_drake", 7, MIXED_PARENTS, 1)
    const granted = applyStormGift(
      stateAt({ tier: "silver", subTier: "III", points: 18 }),
      false,
    )
    createGiftEgg(999)
    const after = createBredCreature("fire_drake", 7, MIXED_PARENTS, 1)
    expect(after).toEqual(before)
    expect(granted.stormGiftClaimed).toBe(true)
  })
})
