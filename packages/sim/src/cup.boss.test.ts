/**
 * Promotion-cup substitution (silver_ladder_bosses_20261016, FR3).
 *
 * The final rival slot is substituted with the authored boss AFTER the
 * bracket's draw sequence completes — no draws added or pruned, so regular
 * brackets for existing saves stay byte-identical (the golden stream test
 * in cup.test.ts stays green untouched).
 */
import { describe, expect, test } from "bun:test"
import { bossForCup, getBoss } from "./bosses"
import { type Creature, createCreature } from "./creature"
import {
  battleSideForSlot,
  bossScalps,
  type CupSession,
  makeBracket,
  startCupSession,
  substituteFinalBoss,
} from "./cup"
import { defaultLoadout, getSpecies, resolvePlayerMatch } from "./index"
import { finalizeCup, prepareCup } from "./machine"
import { chooseStarter, createInitialState } from "./state"

function playerCreature(seed = 11): Creature {
  return createCreature("fire_drake", seed)
}

const cupDay = 7

/** A game state whose ladder stands at Bronze I with points banked past
 * the ceiling — the Promotion Cup gate. */
function promotionGateState() {
  const started = chooseStarter(createInitialState(), "fire_drake", 42)
  return {
    ...started,
    ladder: { points: 15, tier: "bronze" as const, subTier: "I" as const },
  }
}

describe("substituteFinalBoss", () => {
  test("replaces the final rival slot with the boss' pinned build", () => {
    const bracket = makeBracket(playerCreature(), cupDay, 101)
    const boss = getBoss("koda")
    if (!boss) throw new Error("missing boss koda")
    const promoted = substituteFinalBoss(bracket, boss, "promotion")
    const finalSlot = promoted.slots[7]
    if (!finalSlot) throw new Error("expected a final slot")
    expect(finalSlot).toEqual({
      isPlayer: false,
      name: boss.name,
      speciesId: boss.speciesId,
      stats: boss.stats,
      bossId: boss.id,
    })
    expect(promoted.finalRival).toEqual(finalSlot)
    // The rest of the draw is untouched.
    expect(promoted.slots.slice(0, 7)).toEqual(bracket.slots.slice(0, 7))
  })

  test("carries the presentation metadata on the bracket", () => {
    const bracket = makeBracket(playerCreature(), cupDay, 101)
    const boss = getBoss("koda")
    if (!boss) throw new Error("missing boss koda")
    const promoted = substituteFinalBoss(bracket, boss, "promotion")
    expect(promoted.kind).toBe("promotion")
    expect(promoted.banner).toBe("Promotion Cup")
    expect(promoted.bossIntro).toBe(boss.intro)
  })

  test("a substituted championship final carries the boss framing", () => {
    const bracket = makeBracket(playerCreature(), cupDay, 101)
    const boss = getBoss("hesse")
    if (!boss) throw new Error("missing boss hesse")
    const framed = substituteFinalBoss(bracket, boss, "championship")
    expect(framed.kind).toBe("championship")
    expect(framed.banner).toBe(`Boss Final · ${boss.name}`)
    expect(framed.bossIntro).toBe(boss.intro)
  })

  test("the substitution never touches the draw sequence", () => {
    // The first seven slots of a substituted bracket must equal the same
    // slots of the plain bracket, for every seed — substitution is a pure
    // post-step on the completed draw.
    for (const seed of [1, 2, 3, 7, 42, 101]) {
      const plain = makeBracket(playerCreature(11), cupDay, seed)
      const boss = getBoss("koda")
      if (!boss) throw new Error("missing boss koda")
      const promoted = substituteFinalBoss(plain, boss, "promotion")
      expect(promoted.slots.slice(0, 7)).toEqual(plain.slots.slice(0, 7))
    }
  })
})

describe("boss slots fight with their pinned build", () => {
  test("a boss slot's battle side uses the pinned kit and tactic", () => {
    const boss = getBoss("koda")
    if (!boss) throw new Error("missing boss koda")
    const side = battleSideForSlot(
      {
        isPlayer: false,
        name: boss.name,
        speciesId: boss.speciesId,
        stats: boss.stats,
        bossId: boss.id,
      },
      12345,
    )
    expect(side.tactic).toBe(boss.tactic)
    expect([...side.kit]).toEqual([...boss.loadout])
    expect(side.stats).toEqual(boss.stats)
    expect(side.name).toBe(boss.name)
  })

  test("a generated rival slot still rolls its tactic from the seed", () => {
    const slot = {
      isPlayer: false,
      name: "Driftbelle",
      speciesId: "water_axolotl",
      stats: { hp: 44, atk: 10, def: 9, spd: 9 },
    }
    const side = battleSideForSlot(slot, 12345)
    expect(side.tactic).toBeDefined()
    expect(["balanced", "specials"]).toContain(side.tactic)
  })
})

describe("startCupSession with a boss final", () => {
  test("flags the bracket and plants the boss in the far half", () => {
    const boss = getBoss("koda")
    if (!boss) throw new Error("missing boss koda")
    const session = startCupSession(
      playerCreature(),
      cupDay,
      101,
      "promotion",
      boss,
    )
    expect(session.bracket.kind).toBe("promotion")
    expect(session.bracket.slots[7]?.bossId).toBe("koda")
    expect(session.bracket.bossIntro).toBe(boss.intro)
    // The player's first opponent is unaffected (slot 1 of the near half).
    expect(session.nextOpponent?.name).toBe(session.bracket.slots[1]?.name)
  })

  test("a regular session stays championship with no boss metadata", () => {
    const session = startCupSession(playerCreature(), cupDay, 101)
    expect(session.bracket.kind).toBe("championship")
    expect(session.bracket.banner).toBeUndefined()
    expect(session.bracket.bossIntro).toBeUndefined()
    for (const slot of session.bracket.slots) {
      expect(slot.bossId).toBeUndefined()
    }
  })

  test("the boss walks the rival subtree — the gate always reaches the final", () => {
    const boss = getBoss("koda")
    if (!boss) throw new Error("missing boss koda")
    const session = startCupSession(
      playerCreature(),
      cupDay,
      101,
      "promotion",
      boss,
    )
    // QF4 (slots 6 vs 7) and SF2 are boss pairings: the authored gate
    // cannot be knocked out by a generated rival — it advances without a
    // battle (a walkover verdict, no replay to render).
    const qf4 = session.rivalResolutions[2]
    const sf2 = session.rivalResolutions[3]
    expect(qf4?.winner?.name).toBe(boss.name)
    expect(qf4?.verdict.battle).toBeNull()
    expect(qf4?.verdict.line).toBe(`Sear Marshal Koda takes the Quarterfinal!`)
    expect(sf2?.winner?.name).toBe(boss.name)
    expect(sf2?.verdict.battle).toBeNull()
    expect(sf2?.verdict.slotB).toBe(boss.name)
  })

  test("a player who wins the near half meets the boss in the final", () => {
    // A trained climber sweeps the near half across seeds until one
    // reaches the final; the waiting opponent must be the boss.
    const boss = getBoss("koda")
    if (!boss) throw new Error("missing boss koda")
    for (let seed = 1; seed <= 60; seed++) {
      const grown = {
        ...playerCreature(seed),
        trained: { hp: 3, atk: 3, def: 3, spd: 3 },
      }
      const species = getSpecies(grown.speciesId)
      if (!species) throw new Error("unknown species")
      const session = startCupSession(grown, cupDay, seed, "promotion", boss)
      const loadout = defaultLoadout(grown, species)
      let current = session
      while (current.status === "player-turn") {
        if (current.nextPlayerRound === 3) {
          expect(current.nextOpponent?.bossId).toBe("koda")
          expect(current.nextOpponent?.name).toBe(boss.name)
          return
        }
        current = resolvePlayerMatch(current, loadout, "balanced").session
      }
    }
    throw new Error("no seed reached the final — tighten the sweep")
  })
})

describe("bossForCup — the silver checkpoints and apex", () => {
  /** A state standing at the given silver sub-tier with the given ledger. */
  function silverState(
    subTier: "III" | "II" | "I",
    bossDefeats: string[] = [],
  ) {
    const started = chooseStarter(createInitialState(), "fire_drake", 42)
    return {
      ...started,
      ladder: { points: 0, tier: "silver" as const, subTier },
      bossDefeats,
    }
  }

  test("Silver III with no scalp meets Hesse in a championship cup", () => {
    const gate = bossForCup(silverState("III"))
    expect(gate?.boss.id).toBe("hesse")
    expect(gate?.kind).toBe("championship")
  })

  test("scalping Hesse clears the checkpoint — Silver III draws rivals again", () => {
    expect(bossForCup(silverState("III", ["hesse"]))).toBeNull()
  })

  test("Silver II has no boss — a fully generated field", () => {
    expect(bossForCup(silverState("II"))).toBeNull()
    expect(bossForCup(silverState("II", ["hesse"]))).toBeNull()
  })

  test("Silver I meets Marlow — the apex holds every cup until beaten", () => {
    const gate = bossForCup(silverState("I"))
    expect(gate?.boss.id).toBe("marlow")
    expect(gate?.kind).toBe("championship")
    expect(bossForCup(silverState("I", ["koda"]))?.boss.id).toBe("marlow")
  })

  test("scalping Marlow returns the generated rivals", () => {
    expect(bossForCup(silverState("I", ["marlow"]))).toBeNull()
    expect(bossForCup(silverState("I", ["koda", "marlow"]))).toBeNull()
  })

  test("prepareCup threads the silver finals into the bracket", () => {
    const hesseSession = prepareCup(silverState("III"))
    if (!hesseSession) throw new Error("expected a session")
    expect(hesseSession.bracket.slots[7]?.bossId).toBe("hesse")
    expect(hesseSession.bracket.kind).toBe("championship")
    expect(hesseSession.bracket.banner).toBe("Boss Final · Verdant Dame Hesse")

    const scalped = prepareCup(silverState("III", ["hesse"]))
    if (!scalped) throw new Error("expected a session")
    for (const slot of scalped.bracket.slots) {
      expect(slot.bossId).toBeUndefined()
    }
    expect(scalped.bracket.banner).toBeUndefined()
  })
})

describe("bossScalps — the defeat ledger (FR9)", () => {
  const boss = getBoss("koda")
  if (!boss) throw new Error("missing boss koda")

  /** A session whose player verdicts are set by hand — the ledger's unit
   * contract without depending on the boss' beatability (the Phase 3 probe
   * measures that). */
  function sessionWithVerdict(
    slotB: string,
    outcome: "player" | "boss" | "forfeit",
    overrides?: { stripBoss?: boolean },
  ): CupSession {
    const session = startCupSession(
      playerCreature(),
      cupDay,
      101,
      "promotion",
      boss,
    )
    const bracket = overrides?.stripBoss
      ? {
          ...session.bracket,
          kind: "championship" as const,
          banner: undefined,
          bossIntro: undefined,
          slots: session.bracket.slots.map((s) =>
            s.bossId ? { ...s, bossId: undefined } : s,
          ),
          finalRival: session.bracket.finalRival,
        }
      : session.bracket
    const playerName = bracket.slots[0]?.name ?? "player"
    const winner =
      outcome === "player" ? playerName : outcome === "boss" ? slotB : null
    return {
      ...session,
      bracket,
      championName: playerName,
      playerVerdicts: [
        { round: 3, slotA: playerName, slotB, winner, line: "", battle: null },
      ],
    }
  }

  test("beating the boss in a player match yields the boss id", () => {
    expect(bossScalps(sessionWithVerdict(boss.name, "player"))).toEqual([
      "koda",
    ])
  })

  test("losing to the boss scalps nothing", () => {
    expect(bossScalps(sessionWithVerdict(boss.name, "boss"))).toEqual([])
  })

  test("forfeiting against the boss scalps nothing", () => {
    expect(bossScalps(sessionWithVerdict(boss.name, "forfeit"))).toEqual([])
  })

  test("a regular bracket scalps nothing, whatever the verdicts", () => {
    const regular = sessionWithVerdict(boss.name, "player", {
      stripBoss: true,
    })
    expect(bossScalps(regular)).toEqual([])
  })

  test("rival-subtree boss wins never count as scalps", () => {
    const session = startCupSession(
      playerCreature(),
      cupDay,
      101,
      "promotion",
      boss,
    )
    const bossName = session.bracket.finalRival.name
    const withRivalWin = {
      ...session,
      rivalVerdicts: [
        ...session.rivalVerdicts,
        {
          round: 2,
          slotA: "Some Rival",
          slotB: bossName,
          winner: "Some Rival",
          line: "",
          battle: null,
        },
      ],
    }
    expect(bossScalps(withRivalWin)).toEqual([])
  })

  test("finalizeCup appends the scalp to the ledger, idempotently", () => {
    const scalped = sessionWithVerdict(boss.name, "player")
    const base = { ...promotionGateState(), bossDefeats: [] as string[] }
    const once = finalizeCup(base, scalped)
    expect(once.bossDefeats).toEqual(["koda"])
    const twice = finalizeCup(once, scalped)
    expect(twice.bossDefeats).toEqual(["koda"])
  })

  test("finalizeCup leaves the ledger untouched without a scalp", () => {
    const regular = sessionWithVerdict("Some Rival", "player")
    const base = { ...promotionGateState(), bossDefeats: ["hesse"] as string[] }
    const after = finalizeCup(base, regular)
    expect(after.bossDefeats).toEqual(["hesse"])
  })
})

describe("the promotion gate decision via prepareCup", () => {
  test("a promotion-eligible save opens a Promotion Cup against Koda", () => {
    const session = prepareCup(promotionGateState())
    if (!session) throw new Error("expected a session")
    expect(session.bracket.kind).toBe("promotion")
    expect(session.bracket.slots[7]?.bossId).toBe("koda")
    expect(session.bracket.banner).toBe("Promotion Cup")
  })

  test("a save below the gate opens a regular championship cup", () => {
    const session = prepareCup(
      chooseStarter(createInitialState(), "fire_drake", 42),
    )
    if (!session) throw new Error("expected a session")
    expect(session.bracket.kind).toBe("championship")
    for (const slot of session.bracket.slots) {
      expect(slot.bossId).toBeUndefined()
    }
  })

  test("the promotion seed never changes the drawn field", () => {
    // The same save on the same day draws the same seven rivals whether or
    // not the boss gate is open — only slot 8 differs.
    const plain = prepareCup(
      chooseStarter(createInitialState(), "fire_drake", 42),
    )
    const gated = prepareCup(promotionGateState())
    if (!plain || !gated) throw new Error("expected sessions")
    // Different ladder totals fold into the entry seed only via identity…
    // they do not: the seed folds the creature's effective stats, not the
    // ladder. Same creature, same day → same seven rivals.
    expect(plain.seed).toBe(gated.seed)
    expect(gated.bracket.slots.slice(0, 7)).toEqual(
      plain.bracket.slots.slice(0, 7),
    )
    expect(gated.bracket.slots[7]?.bossId).toBe("koda")
  })
})
