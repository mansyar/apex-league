/**
 * The league rewards — the per-tier tier-reward eggs (earth/wind species
 * line, Phase 2).
 *
 * FR-5: on any non-forfeit cup finalize, every released reward tier the
 * post-placement ladder has reached and the save has not yet claimed is
 * paid at once, in ascending tier order — observed here as the
 * `claimedTiers` record and the `pendingRewards` queue. Forfeited cups
 * never trigger or consume the grants, and the retroactive path (an
 * existing save already past a tier) claims at its next non-forfeit
 * finalize.
 */
import { describe, expect, test } from "bun:test"
import type { BattleResult } from "../battle/resolver"
import { getBoss } from "../bosses"
import {
  createBredCreature,
  createGiftEgg,
  hatchGiftEgg,
  leagueRewardPending,
  leagueRewardPreview,
  rollAffinityDrift,
} from "../breeding"
import { createCreature, type Element } from "../creature"
import {
  type CupSession,
  forfeitCup,
  type RoundVerdict,
  startCupSession,
} from "../cup"
import { grantLeagueRewards } from "../cupRewards"
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

describe("the league rewards grant at cup finalize (FR-5)", () => {
  test("a Silver save's first non-forfeit finalize claims the Silver reward", () => {
    const s = stateAt({ tier: "silver", subTier: "III", points: 18 })
    const finalized = finalizeCup(s, crown(sessionOf(s)))
    expect(finalized.claimedTiers).toEqual(["silver"])
    expect(finalized.phase).toBe("day")
    // The grant is an egg waiting in the nursery, not a bare flag.
    expect(finalized.pendingRewards[0]?.speciesId).toBe("electric_hound")
    expect(typeof finalized.pendingRewards[0]?.seed).toBe("number")
    expect(leagueRewardPending(finalized)).toBe(true)
  })

  test("a second finalize never re-grants — the claim is one-time per tier", () => {
    const s = stateAt({ tier: "silver", subTier: "III", points: 18 })
    const first = finalizeCup(s, crown(sessionOf(s)))
    const second = finalizeCup(first, crown(sessionOf(first)))
    expect(second.claimedTiers).toEqual(["silver"])
    // The egg the first finalize granted is still the one waiting.
    expect(second.pendingRewards).toEqual(first.pendingRewards)
  })

  test("never fires below the lowest reward tier", () => {
    const fresh = stateAt()
    const finalized = finalizeCup(fresh, crown(sessionOf(fresh)))
    expect(finalized.ladder.tier).toBe("bronze")
    expect(finalized.claimedTiers).toEqual([])
    expect(finalized.pendingRewards).toEqual([])
  })

  test(
    "the Promotion Cup champion is crowned into Silver and claims the reward" +
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
      expect(finalized.claimedTiers).toEqual(["silver"])
      expect(finalized.pendingRewards[0]?.speciesId).toBe("electric_hound")
    },
  )

  test("a forfeited cup never triggers the grant", () => {
    const s = stateAt({ tier: "silver", subTier: "III", points: 18 })
    const finalized = finalizeCup(s, forfeitedSession(s))
    expect(finalized.claimedTiers).toEqual([])
    expect(finalized.pendingRewards).toEqual([])
  })

  test("a forfeit does not consume the grants — the next real finalize does", () => {
    const s = stateAt({ tier: "silver", subTier: "III", points: 18 })
    const forfeited = finalizeCup(s, forfeitedSession(s))
    const later = finalizeCup(forfeited, crown(sessionOf(forfeited)))
    expect(later.claimedTiers).toEqual(["silver"])
    expect(later.pendingRewards[0]?.speciesId).toBe("electric_hound")
  })

  test("any non-forfeit finalize at Silver or higher grants — a final loss counts", () => {
    const s = stateAt({ tier: "gold", subTier: "I", points: 36 })
    const finalized = finalizeCup(s, runnerUpSession(s))
    expect(finalized.claimedTiers).toEqual(["silver", "gold"])
    expect(finalized.pendingRewards[0]?.speciesId).toBe("electric_hound")
    expect(finalized.pendingRewards[1]?.speciesId).toBe("wind_falcon")
  })

  test("the tiers grant independently, in ascending tier order", () => {
    const s = stateAt({ tier: "legend", subTier: "I", points: 40 })
    const finalized = finalizeCup(s, runnerUpSession(s))
    expect(finalized.claimedTiers).toEqual(["silver", "gold", "legend"])
    expect(finalized.pendingRewards.map((egg) => egg.speciesId)).toEqual([
      "electric_hound",
      "wind_falcon",
      "earth_tortoise",
    ])
  })

  test("a save already past a tier claims every tier it has reached (tier-check rule)", () => {
    // The tier check is `currentTier >= rewardFromTier`, not an exact
    // arrival: a save standing at Gold that never finalized before claims
    // both Silver's and Gold's rewards at its first non-forfeit finalize.
    const s = stateAt({ tier: "gold", subTier: "I", points: 36 })
    const granted = grantLeagueRewards(s, false)
    expect(granted.claimedTiers).toEqual(["silver", "gold"])
    expect(granted.pendingRewards).toHaveLength(2)
  })

  test("each claimed tier prevents its own repeat grant", () => {
    const s = stateAt({ tier: "legend", subTier: "I", points: 40 })
    const first = finalizeCup(s, runnerUpSession(s))
    const second = finalizeCup(first, runnerUpSession(first))
    expect(second.claimedTiers).toEqual(["silver", "gold", "legend"])
    expect(second.pendingRewards).toEqual(first.pendingRewards)
  })

  test("the grant is pure — the input state is never mutated", () => {
    const s = stateAt({ tier: "silver", subTier: "III", points: 18 })
    const before = JSON.stringify(s)
    finalizeCup(s, crown(sessionOf(s)))
    expect(JSON.stringify(s)).toBe(before)
  })
})

describe("grantLeagueRewards — the claim seam", () => {
  test("stamps each reached tier once on a non-forfeit cup", () => {
    const s = stateAt({ tier: "gold", subTier: "I", points: 36 })
    const granted = grantLeagueRewards(s, false)
    expect(granted.claimedTiers).toEqual(["silver", "gold"])
    expect(granted.pendingRewards[0]?.speciesId).toBe("electric_hound")
    expect(granted.pendingRewards[1]?.speciesId).toBe("wind_falcon")
  })

  test("never stamps below the lowest reward tier", () => {
    const fresh = stateAt()
    expect(grantLeagueRewards(fresh, false).claimedTiers).toEqual([])
    expect(grantLeagueRewards(fresh, true).claimedTiers).toEqual([])
    expect(grantLeagueRewards(fresh, false).pendingRewards).toEqual([])
  })

  test("never stamps on a forfeit, at any tier", () => {
    const s = stateAt({ tier: "legend", subTier: "I", points: 40 })
    expect(grantLeagueRewards(s, true).claimedTiers).toEqual([])
    expect(grantLeagueRewards(s, true).pendingRewards).toEqual([])
  })

  test("is idempotent on an already-claimed save", () => {
    const s = {
      ...stateAt({ tier: "legend", subTier: "I", points: 40 }),
      claimedTiers: ["silver", "gold", "legend"] as GameState["claimedTiers"],
    }
    expect(grantLeagueRewards(s, false).claimedTiers).toEqual([
      "silver",
      "gold",
      "legend",
    ])
    expect(grantLeagueRewards(s, false).pendingRewards).toEqual([])
  })

  test("is pure — the input state is never mutated", () => {
    const s = stateAt({ tier: "silver", subTier: "III", points: 18 })
    const before = JSON.stringify(s)
    grantLeagueRewards(s, false)
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

/** A save holding one granted egg, waiting to be hatched. */
function grantedState(seed = 42): GameState {
  return {
    ...stateAt({ tier: "silver", subTier: "III", points: 18 }),
    claimedTiers: ["silver"],
    pendingRewards: [{ speciesId: "electric_hound", seed }],
  }
}

describe("the pure reward egg (FR-6)", () => {
  test("hatches its fixed element with a guaranteed null affinity and the gift marker", () => {
    const hatch = createGiftEgg("electric_hound", 42)
    expect(hatch.speciesId).toBe("electric_hound")
    expect(hatch.element).toBe("electric")
    expect(hatch.affinity).toBeNull()
    expect(hatch.giftEgg).toBe(true)
    expect(hatch.stage).toBe("baby")
    expect(hatch.parents).toEqual([])
  })

  test("stats roll within the species bounds — same seed, same individual", () => {
    for (const speciesId of ["electric_hound", "wind_falcon"]) {
      const species = getSpecies(speciesId)
      if (!species) throw new Error(`missing species ${speciesId}`)
      for (const seed of [1, 42, 777]) {
        const a = createGiftEgg(speciesId, seed)
        const b = createGiftEgg(speciesId, seed)
        expect(a).toEqual(b)
        for (const key of ["hp", "atk", "def", "spd"] as const) {
          const [lo, hi] = species.statBounds[key]
          expect(a.stats[key]).toBeGreaterThanOrEqual(lo)
          expect(a.stats[key]).toBeLessThanOrEqual(hi)
        }
      }
    }
  })

  test("the public starter gate stays locked — the gift path bypasses it without loosening it", () => {
    expect(() => createCreature("electric_hound", 1)).toThrow(
      /not yet available/,
    )
    expect(() => createCreature("wind_falcon", 1)).toThrow(/not yet available/)
    // And every starter still creates through the public gate.
    expect(createCreature("fire_drake", 1).element).toBe("fire")
  })

  test("previewed equals hatched — the nursery hatch lands the exact previewed individual", () => {
    const granted = grantedState(42)
    const preview = leagueRewardPreview(granted)
    if (!preview) throw new Error("expected a reward preview")
    const result = hatchGiftEgg(granted)
    if (!result.ok) throw new Error("hatch refused")
    const hatched = result.state.stable[0]
    if (!hatched) throw new Error("expected a hatched creature")
    expect(result.state.stable[0]).toEqual(createGiftEgg("electric_hound", 42))
    // The preview is the hatch: same species, same element, same stats.
    expect(preview.speciesId).toBe(hatched.speciesId)
    expect(preview.element).toBe(hatched.element)
    expect(preview.stats).toEqual(hatched.stats)
  })

  test("the hatch seam refuses an ungranted reward", () => {
    const ungranted = stateAt()
    expect(hatchGiftEgg(ungranted)).toEqual({
      ok: false,
      reason: "not-granted",
    })
  })

  test("the hatch seam refuses a second hatch of the same egg", () => {
    const hatched = hatchGiftEgg(grantedState(42))
    if (!hatched.ok) throw new Error("hatch refused")
    expect(hatchGiftEgg(hatched.state)).toEqual({
      ok: false,
      reason: "already-hatched",
    })
  })

  test("the gift marker persists into a Hall of Fame retirement", () => {
    const hatched = hatchGiftEgg(grantedState(42))
    if (!hatched.ok) throw new Error("hatch refused")
    // The hound waits in the stable; it carries the marker wherever it goes.
    const gifted = hatched.state.stable[0]
    if (!gifted) throw new Error("expected a stashed gift pet")
    expect(gifted.giftEgg).toBe(true)
    const retired = {
      ...hatched.state,
      stable: [],
      creature: gifted,
      lineage: { generation: 1, hallOfFame: [] },
    }
    const record = retireeRecord(retired)
    if (!record) throw new Error("expected a retiree record")
    expect(record.giftEgg).toBe(true)
  })

  test("the hatch carries the day over — the reward is not a graduation succession", () => {
    const granted = grantedState(42)
    const hatched = hatchGiftEgg(granted)
    if (!hatched.ok) throw new Error("hatch refused")
    expect(hatched.state.day).toBe(granted.day)
    expect(hatched.state.actionPoints).toBe(granted.actionPoints)
    expect(hatched.state.ladder).toEqual(granted.ladder)
    expect(hatched.state.lineage.generation).toBe(granted.lineage.generation)
  })

  test("the ranch pet keeps the ranch — the reward waits in the stable (FR-7)", () => {
    const granted = grantedState(42)
    const before = granted.creature
    if (!before) throw new Error("expected a creature")
    const hatched = hatchGiftEgg(granted)
    if (!hatched.ok) throw new Error("hatch refused")
    // The partner the player already had stays exactly as it was...
    expect(hatched.state.creature).toEqual(before)
    // ...and the hound joins the stable.
    expect(hatched.state.stable).toHaveLength(1)
    expect(hatched.state.stable[0]?.speciesId).toBe("electric_hound")
    // The career was never retired: it never left the ranch, so it is not
    // in the Hall of Fame either.
    expect(hatched.state.lineage.hallOfFame).toEqual(granted.lineage.hallOfFame)
  })

  test("the claimed tiers wait for their eggs — the claim alone is not the hatch", () => {
    const claimed = {
      ...stateAt({ tier: "silver", subTier: "III", points: 18 }),
      claimedTiers: ["silver"] as GameState["claimedTiers"],
    }
    expect(leagueRewardPending(claimed)).toBe(false)
    expect(leagueRewardPreview(claimed)).toBeNull()
    expect(hatchGiftEgg(claimed)).toEqual({
      ok: false,
      reason: "already-hatched",
    })
  })
})

describe("the pending-reward queue (FR-5/FR-8)", () => {
  test("the nursery hatches the head of the queue — oldest (lowest tier) first", () => {
    // A migrated save can hold several eggs at once (an old save that
    // jumps straight to Legend): Silver's hound, Gold's falcon and
    // Legend's tortoise all wait, and each claim flow hatches one.
    const queued: GameState = {
      ...stateAt({ tier: "legend", subTier: "I", points: 40 }),
      claimedTiers: ["silver", "gold", "legend"],
      pendingRewards: [
        { speciesId: "electric_hound", seed: 4242 },
        { speciesId: "wind_falcon", seed: 77 },
        { speciesId: "earth_tortoise", seed: 909 },
      ],
    }
    expect(leagueRewardPending(queued)).toBe(true)
    expect(leagueRewardPreview(queued)?.speciesId).toBe("electric_hound")

    const first = hatchGiftEgg(queued)
    if (!first.ok) throw new Error("hatch refused")
    expect(first.state.stable[0]?.speciesId).toBe("electric_hound")
    expect(first.state.pendingRewards.map((egg) => egg.speciesId)).toEqual([
      "wind_falcon",
      "earth_tortoise",
    ])

    const second = hatchGiftEgg(first.state)
    if (!second.ok) throw new Error("hatch refused")
    expect(second.state.stable[1]?.speciesId).toBe("wind_falcon")

    const third = hatchGiftEgg(second.state)
    if (!third.ok) throw new Error("hatch refused")
    expect(third.state.stable[2]?.speciesId).toBe("earth_tortoise")
    expect(third.state.pendingRewards).toEqual([])
    expect(leagueRewardPending(third.state)).toBe(false)
    expect(hatchGiftEgg(third.state)).toEqual({
      ok: false,
      reason: "already-hatched",
    })
  })

  test("a stashed gift pet does not block the next tier's reward", () => {
    // The one-gift rule was a property of the single-reward era; the
    // per-tier queue replaces it. A hound already stashed, a falcon
    // waiting: the falcon claim flow proceeds.
    const queued: GameState = {
      ...stateAt({ tier: "gold", subTier: "I", points: 36 }),
      claimedTiers: ["silver", "gold"],
      pendingRewards: [{ speciesId: "wind_falcon", seed: 77 }],
      stable: [createGiftEgg("electric_hound", 4242)],
    }
    const hatched = hatchGiftEgg(queued)
    if (!hatched.ok) throw new Error("hatch refused")
    expect(hatched.state.stable.map((pet) => pet.speciesId)).toEqual([
      "electric_hound",
      "wind_falcon",
    ])
  })

  test("each egg in the queue carries its own seed — preview matches its hatch", () => {
    const queued: GameState = {
      ...stateAt({ tier: "gold", subTier: "I", points: 36 }),
      claimedTiers: ["silver", "gold"],
      pendingRewards: [
        { speciesId: "electric_hound", seed: 4242 },
        { speciesId: "wind_falcon", seed: 77 },
      ],
    }
    const first = hatchGiftEgg(queued)
    if (!first.ok) throw new Error("hatch refused")
    expect(first.state.stable[0]).toEqual(createGiftEgg("electric_hound", 4242))
    const preview = leagueRewardPreview(first.state)
    if (!preview) throw new Error("expected a reward preview")
    expect(preview.speciesId).toBe("wind_falcon")
    const second = hatchGiftEgg(first.state)
    if (!second.ok) throw new Error("hatch refused")
    expect(second.state.stable[1]).toEqual(createGiftEgg("wind_falcon", 77))
    expect(second.state.stable[1]?.stats).toEqual(preview.stats)
  })
})

describe("drift stream purity (NFR-3)", () => {
  test("an intervening gift creation never advances the drift stream", () => {
    const drake = getSpecies("fire_drake")
    if (!drake) throw new Error("missing species fire_drake")
    const before = rollAffinityDrift(drake, MIXED_PARENTS, 7)
    createGiftEgg("electric_hound", 999)
    expect(rollAffinityDrift(drake, MIXED_PARENTS, 7)).toBe(before)
  })

  test("a bred egg's full hatch is identical with and without an intervening grant", () => {
    const before = createBredCreature("fire_drake", 7, MIXED_PARENTS, 1)
    const granted = grantLeagueRewards(
      stateAt({ tier: "legend", subTier: "I", points: 40 }),
      false,
    )
    createGiftEgg("electric_hound", 999)
    const after = createBredCreature("fire_drake", 7, MIXED_PARENTS, 1)
    expect(after).toEqual(before)
    expect(granted.claimedTiers).toEqual(["silver", "gold", "legend"])
  })
})
