/**
 * Bracket model contracts — the pure display logic for the cup screens,
 * extracted from `cup.ts`'s DOM factory (cup_engine_consolidation_20261012).
 *
 * The model derives the match tree from the session's bracket (topology-
 * agnostic: any power-of-two slot count), assigns verdicts to matches by
 * participant names (not list positions), and renders the results-screen
 * strings. The 8-slot wiring must stay visually identical to today.
 */
import { describe, expect, test } from "bun:test"
import {
  ACTION_POINTS_PER_DAY,
  CUP_REWARDS,
  type CupSession,
  type CupSlot,
  completeCup,
  createCreature,
  cupPlacement,
  defaultLoadout,
  forfeitCup,
  getSpecies,
  type RoundVerdict,
  resolvePlayerMatch,
  startCupSession,
} from "@apex/sim"
import {
  bracketPlan,
  buildBracketModel,
  exitStage,
  type LadderStanding,
  ladderRow,
  ordinalOf,
  resultRows,
} from "./bracket-model"

const CUP_DAY = 7

function creature(seed = 42) {
  return createCreature("fire_drake", seed)
}

/** Play a cup to completion with the default picks. */
function play(
  c: ReturnType<typeof creature>,
  day: number,
  seed: number,
  tactic: "balanced" | "specials" = "balanced",
): CupSession {
  const species = getSpecies(c.speciesId)
  if (!species) throw new Error("unknown species")
  const loadout = defaultLoadout(c, species)
  let cur = startCupSession(c, day, seed)
  while (cur.status === "player-turn") {
    cur = resolvePlayerMatch(cur, loadout, tactic).session
  }
  if (cur.status === "eliminated") cur = completeCup(cur)
  return cur
}

function slot(name: string): CupSlot {
  return {
    isPlayer: false,
    name,
    speciesId: "fire_drake",
    stats: { hp: 40, atk: 10, def: 10, spd: 10 },
  }
}

function verdict(
  round: number,
  slotA: string,
  slotB: string,
  winner: string | null,
  battle: RoundVerdict["battle"] = null,
): RoundVerdict {
  return {
    round,
    slotA,
    slotB,
    winner,
    line: `${winner ?? slotA} advances.`,
    battle,
  }
}

function syntheticSession(
  slots: CupSlot[],
  v: {
    pv?: RoundVerdict[]
    rv?: RoundVerdict[]
    cv?: RoundVerdict[]
    status?: CupSession["status"]
    championName?: string | null
  } = {},
): CupSession {
  const rounds = Math.max(1, Math.round(Math.log2(slots.length)))
  const labels = ["Quarterfinal", "Semifinal", "Final"].slice(-rounds)
  return {
    bracket: {
      day: 7,
      slots,
      // noUncheckedIndexedAccess: array bounds are guaranteed by construction.
      finalRival: (slots[slots.length - 1] ?? slots[0]) as CupSlot,
      rounds,
      roundLabels: labels,
      kind: "championship",
    },
    seed: 101,
    rivalResolutions: [],
    rivalVerdicts: v.rv ?? [],
    playerVerdicts: v.pv ?? [],
    completionVerdicts: v.cv ?? [],
    nextPlayerRound: 0,
    nextOpponent: null,
    status: v.status ?? "champion",
    championName: v.championName ?? null,
  }
}

/**
 * Double-KO advancement (battle-sim-consolidation FR4). A drawn pairing has
 * no `winner`, but the bracket still advances exactly one fighter — the sim
 * decides that by remaining HP (`doubleKoWinner`), and the bracket screen
 * must show the same fighter it put into the next round. Falling back to
 * `slotA` highlighted a fighter the sim had already eliminated.
 */
describe("double-KO advancement matches the sim tiebreak", () => {
  /** A drawn pairing whose fighters survived on very different HP. */
  function doubleKo(
    slotA: string,
    slotB: string,
    finalHp: Record<string, number>,
  ): RoundVerdict {
    return {
      round: 1,
      slotA,
      slotB,
      winner: null,
      line: "Both fighters are down — the Quarterfinal is a draw.",
      battle: {
        winner: null,
        reason: "double_ko",
        finalHp,
        events: [],
      },
    }
  }

  test("the fighter with the higher remaining HP advances, not slotA", () => {
    // slotB ("Bravo") survived on 7 HP, slotA ("Alpha") on 2 — the sim's
    // doubleKoWinner advances Bravo, so the semifinal must place Bravo in
    // the slot he actually occupies (qf1's slot B).
    const session = syntheticSession(
      [slot("Alpha"), slot("Bravo"), slot("Cinder"), slot("Dune")],
      { rv: [doubleKo("Alpha", "Bravo", { Alpha: 2, Bravo: 7 })] },
    )
    const matches = buildBracketModel(session)
    expect(matches[0]?.verdict?.winner).toBe(null)
    // The semifinal's slot A is whoever won qf1 — by HP, not by position.
    expect(matches[2]?.a?.name).toBe("Bravo")
  })

  test("an exact final-HP tie falls to the earlier slot", () => {
    const session = syntheticSession(
      [slot("Alpha"), slot("Bravo"), slot("Cinder"), slot("Dune")],
      { rv: [doubleKo("Alpha", "Bravo", { Alpha: 4, Bravo: 4 })] },
    )
    expect(buildBracketModel(session)[2]?.a?.name).toBe("Alpha")
  })

  test("a forfeit still advances slotA (no battle to read HP from)", () => {
    const session = syntheticSession(
      [slot("Alpha"), slot("Bravo"), slot("Cinder"), slot("Dune")],
      { rv: [verdict(1, "Alpha", "Bravo", null)] },
    )
    expect(buildBracketModel(session)[2]?.a?.name).toBe("Alpha")
  })
})

describe("bracketPlan — the static match plan", () => {
  test("the 8-entrant plan matches the walk-order ids", () => {
    expect(bracketPlan(8).map((m) => m.id)).toEqual([
      "qf1",
      "qf2",
      "qf3",
      "qf4",
      "sf1",
      "sf2",
      "f1",
    ])
    expect(bracketPlan(8).map((m) => m.column)).toEqual([
      "qf",
      "qf",
      "qf",
      "qf",
      "sf",
      "sf",
      "f",
    ])
  })
})

describe("buildBracketModel — the 8-slot bracket", () => {
  test("matches appear in walk order with stable ids, columns and labels", () => {
    const names = ["P", "A", "B", "C", "D", "E", "F", "G"]
    const model = buildBracketModel(syntheticSession(names.map(slot)))
    expect(model.map((m) => m.id)).toEqual([
      "qf1",
      "qf2",
      "qf3",
      "qf4",
      "sf1",
      "sf2",
      "f1",
    ])
    expect(model.map((m) => m.column)).toEqual([
      "qf",
      "qf",
      "qf",
      "qf",
      "sf",
      "sf",
      "f",
    ])
    expect(model.map((m) => m.label)).toEqual([
      "Quarterfinal",
      "Quarterfinal",
      "Quarterfinal",
      "Quarterfinal",
      "Semifinal",
      "Semifinal",
      "Final",
    ])
  })

  test("first-round pairings fill strictly in slot order", () => {
    const slots = [slot("P"), slot("A"), slot("B"), slot("C")]
    const model = buildBracketModel(syntheticSession(slots))
    const [first, second] = model
    expect(first?.a?.name).toBe("P")
    expect(first?.b?.name).toBe("A")
    expect(second?.a?.name).toBe("B")
    expect(second?.b?.name).toBe("C")
  })

  test("verdicts land on the right matches across an eliminated run", () => {
    const session = play(creature(), CUP_DAY, 101)
    const model = buildBracketModel(session)
    const byId = new Map(model.map((m) => [m.id, m]))
    expect(byId.get("qf1")?.verdict).toEqual(session.playerVerdicts[0])
    expect(byId.get("qf2")?.verdict).toEqual(session.rivalVerdicts[0])
    expect(byId.get("qf3")?.verdict).toEqual(session.rivalVerdicts[1])
    expect(byId.get("qf4")?.verdict).toEqual(session.rivalVerdicts[2])
    // Eliminated in the QF: SF1 and the final are completion matches.
    expect(byId.get("sf1")?.verdict).toEqual(session.completionVerdicts[0])
    expect(byId.get("sf2")?.verdict).toEqual(session.rivalVerdicts[3])
    expect(byId.get("f1")?.verdict).toEqual(session.completionVerdicts[1])
    expect(byId.get("f1")?.verdict?.winner).toBe(session.championName)
  })

  test("a champion run: the player's matches are exactly qf1, sf1, f1", () => {
    // Seed 17 still wins the cup after the FR6 rebalance (seed 1 now falls
    // in the final); on cup day the tactic cannot change the run (a fresh
    // baby's two-move kit ranks identically under both tactics).
    const session = play(creature(), CUP_DAY, 17, "specials")
    expect(session.status).toBe("champion")
    const model = buildBracketModel(session)
    const playerMatches = model.filter((m) => m.isPlayerMatch).map((m) => m.id)
    expect(playerMatches).toEqual(["qf1", "sf1", "f1"])
    const byId = new Map(model.map((m) => [m.id, m]))
    expect(byId.get("qf1")?.verdict).toEqual(session.playerVerdicts[0])
    expect(byId.get("sf1")?.verdict).toEqual(session.playerVerdicts[1])
    expect(byId.get("f1")?.verdict).toEqual(session.playerVerdicts[2])
    expect(byId.get("f1")?.verdict?.winner).toBe(session.championName)
    expect(byId.get("qf2")?.isPlayerMatch).toBe(false)
    expect(byId.get("sf2")?.isPlayerMatch).toBe(false)
  })

  test("mid-walk: the player's next match is pending but its slots resolve", () => {
    const c = creature()
    const species = getSpecies(c.speciesId)
    if (!species) throw new Error("unknown species")
    const session = resolvePlayerMatch(
      startCupSession(c, CUP_DAY, 1),
      defaultLoadout(c, species),
      "balanced",
    ).session
    expect(session.status).toBe("player-turn")
    const model = buildBracketModel(session)
    const byId = new Map(model.map((m) => [m.id, m]))
    expect(byId.get("qf1")?.verdict).toEqual(session.playerVerdicts[0])
    // The semifinal is the player's next fight: slots known (player vs the
    // pre-resolved QF2 winner), verdict not yet played.
    const sf1 = byId.get("sf1")
    expect(sf1?.isPlayerMatch).toBe(true)
    expect(sf1?.a?.name).toBe(session.bracket.slots[0]?.name)
    expect(sf1?.b?.name).toBe(session.rivalVerdicts[0]?.winner ?? undefined)
    expect(sf1?.verdict).toBe(null)
  })

  test("a forfeited round displays without a battle and still advances", () => {
    const c = creature()
    const species = getSpecies(c.speciesId)
    if (!species) throw new Error("unknown species")
    const opened = startCupSession(c, CUP_DAY, 101)
    const forfeited = forfeitCup(opened)
    const model = buildBracketModel(forfeited)
    const byId = new Map(model.map((m) => [m.id, m]))
    const qf1 = byId.get("qf1")
    expect(qf1?.verdict?.battle).toBe(null)
    expect(qf1?.verdict?.winner).toBe(opened.nextOpponent?.name)
    expect(qf1?.verdict?.line).toContain("forfeit")
  })

  test("a drawn rival pairing still advances its earlier slot", () => {
    const slots = [
      slot("P"),
      slot("A"),
      slot("B"),
      slot("C"),
      slot("D"),
      slot("E"),
      slot("F"),
      slot("G"),
    ]
    // QF3 (slots D/E) ends in a double-KO: the verdict's winner is null but
    // the earlier slot (D) advances — the sim's double-KO tiebreak.
    const session = syntheticSession(slots, {
      rv: [
        verdict(1, "B", "C", "B"),
        verdict(1, "D", "E", null),
        verdict(1, "F", "G", "F"),
        verdict(2, "D", "F", "F"),
      ],
      pv: [verdict(1, "P", "A", "P"), verdict(2, "P", "B", "P")],
      cv: [verdict(3, "P", "F", "P")],
      status: "champion",
      championName: "P",
    })
    const model = buildBracketModel(session)
    const byId = new Map(model.map((m) => [m.id, m]))
    expect(byId.get("qf3")?.verdict?.winner).toBe(null)
    expect(byId.get("sf2")?.a?.name).toBe("D")
    expect(byId.get("sf2")?.b?.name).toBe("F")
    expect(byId.get("sf2")?.verdict?.winner).toBe("F")
  })
})

describe("buildBracketModel — topology-agnostic derivation", () => {
  test("a synthetic 4-entrant bracket derives sf1/sf2/f1", () => {
    const slots = [slot("P"), slot("A"), slot("B"), slot("C")]
    const session = syntheticSession(slots, {
      pv: [verdict(1, "P", "A", "P"), verdict(2, "P", "B", "P")],
      rv: [verdict(1, "B", "C", "B")],
      cv: [],
      status: "champion",
      championName: "P",
    })
    const model = buildBracketModel(session)
    expect(model.map((m) => m.id)).toEqual(["sf1", "sf2", "f1"])
    expect(model.map((m) => m.label)).toEqual([
      "Semifinal",
      "Semifinal",
      "Final",
    ])
    const byId = new Map(model.map((m) => [m.id, m]))
    expect(byId.get("sf1")?.verdict?.winner).toBe("P")
    expect(byId.get("sf2")?.verdict?.winner).toBe("B")
    expect(byId.get("f1")?.verdict?.winner).toBe("P")
    expect(model.filter((m) => m.isPlayerMatch).map((m) => m.id)).toEqual([
      "sf1",
      "f1",
    ])
  })

  test("a synthetic 16-entrant bracket derives 15 uniquely-id'd matches", () => {
    const names = Array.from({ length: 16 }, (_, i) => `S${i}`)
    const slots = names.map(slot)
    // Rival first-round pairings: every pairing except the player's (S0/S1)
    // — slots 2..15 in strict match order.
    const rv: RoundVerdict[] = []
    for (let i = 2; i < 16; i += 2) {
      // The first rival pairing sends S3 through (the player's pending
      // opponent); every other rival pairing sends the earlier slot.
      rv.push(
        verdict(
          1,
          names[i] ?? `S${i}`,
          names[i + 1] ?? `S${i + 1}`,
          i === 2 ? (names[i + 1] ?? `S${i + 1}`) : (names[i] ?? `S${i}`),
        ),
      )
    }
    // CupSession marks these readonly (they are sim-owned); the test shell
    // fills them in directly.
    const session = syntheticSession(slots, {
      pv: [verdict(1, "S0", "S1", "S0")],
      rv,
      cv: [],
      status: "player-turn",
      championName: null,
    }) as { -readonly [K in keyof CupSession]: CupSession[K] }
    session.nextPlayerRound = 2
    session.nextOpponent = slot(names[3] ?? "S3")
    const model = buildBracketModel(session)
    expect(model).toHaveLength(15)
    const ids = model.map((m) => m.id)
    expect(new Set(ids).size).toBe(15)
    const round1 = model.filter((m) => m.round === 1)
    expect(round1).toHaveLength(8)
    expect(model.map((m) => m.label)[0]).toBe("Round of 16")
    expect([...new Set(model.map((m) => m.label))]).toEqual([
      "Round of 16",
      "Quarterfinal",
      "Semifinal",
      "Final",
    ])
    // The player's next fight resolves by name, at any topology.
    const pending = model.find((m) => m.isPlayerMatch && m.verdict === null)
    expect(pending?.a?.name).toBe("S0")
    expect(pending?.b?.name).toBe("S3")
  })
})

describe("results presentation", () => {
  test("ordinalOf renders 1st/2nd/3rd/4th", () => {
    expect(ordinalOf(1)).toBe("1st")
    expect(ordinalOf(2)).toBe("2nd")
    expect(ordinalOf(3)).toBe("3rd")
    expect(ordinalOf(4)).toBe("4th")
  })

  test("exitStage names the round the player went out in", () => {
    expect(exitStage(2)).toBe("final")
    expect(exitStage(3)).toBe("semifinal")
    expect(exitStage(4)).toBe("quarterfinal")
  })

  test("ladderRow reports a promotion, a plain gain, a forfeit, and no change", () => {
    const before: LadderStanding = { points: 4, tier: "bronze", subTier: "III" }
    expect(
      ladderRow({ points: 6, tier: "bronze", subTier: "II" }, before, false),
    ).toBe("Ladder +2 — promoted to Bronze II")
    expect(
      ladderRow({ points: 6, tier: "bronze", subTier: "III" }, before, false),
    ).toBe("Ladder +2 · Bronze III")
    expect(
      ladderRow({ points: 4, tier: "bronze", subTier: "III" }, before, true),
    ).toBe("Forfeit — no ladder points")
    expect(
      ladderRow({ points: 4, tier: "bronze", subTier: "III" }, before, false),
    ).toBe("Ladder unchanged")
  })

  test("ladderRow reports the Promotion Cup's cross-tier flip", () => {
    const before: LadderStanding = { points: 15, tier: "bronze", subTier: "I" }
    expect(
      ladderRow({ points: 18, tier: "silver", subTier: "III" }, before, false),
    ).toBe("Ladder +3 — promoted to Silver III")
  })

  test("ladderRow without a snapshot reports the standing as-is", () => {
    expect(
      ladderRow({ points: 5, tier: "bronze", subTier: "III" }, null, false),
    ).toBe("Ladder: Bronze III · 5 pts")
  })

  test("ladderRow reports a Gold sub-tier climb", () => {
    const before: LadderStanding = { points: 30, tier: "gold", subTier: "III" }
    expect(
      ladderRow({ points: 33, tier: "gold", subTier: "II" }, before, false),
    ).toBe("Ladder +3 — promoted to Gold II")
  })

  test("ladderRow reports the gold-to-legend plateau flip", () => {
    const before: LadderStanding = { points: 36, tier: "gold", subTier: "I" }
    expect(
      ladderRow({ points: 39, tier: "legend", subTier: "I" }, before, false),
    ).toBe("Ladder +3 — promoted to Legend I")
  })

  test("resultRows: a Gold champion sees the stacked AP bonus", () => {
    const session = play(creature(), CUP_DAY, 17, "specials")
    expect(cupPlacement(session)).toBe(1)
    const rows = resultRows(
      session,
      { points: 33, tier: "gold", subTier: "II" },
      { points: 30, tier: "gold", subTier: "III" },
    )
    expect(rows[0]).toBe(
      `+2 action points tomorrow (${ACTION_POINTS_PER_DAY + 2} total)`,
    )
  })

  test("resultRows: a Legend champion sees the stacked AP bonus and the title", () => {
    const session = play(creature(), CUP_DAY, 17, "specials")
    expect(cupPlacement(session)).toBe(1)
    const rows = resultRows(
      session,
      { points: 40, tier: "legend", subTier: "I" },
      { points: 37, tier: "gold", subTier: "I" },
      1,
    )
    expect(rows[0]).toBe(
      `+3 action points tomorrow (${ACTION_POINTS_PER_DAY + 3} total)`,
    )
    expect(rows.at(-1)).toBe("★ Legend title 1")
  })

  test("resultRows: a Silver champion keeps the plain bonus row", () => {
    const session = play(creature(), CUP_DAY, 17, "specials")
    expect(cupPlacement(session)).toBe(1)
    const rows = resultRows(
      session,
      { points: 21, tier: "silver", subTier: "II" },
      { points: 18, tier: "silver", subTier: "III" },
    )
    expect(rows[0]).toBe(
      `+1 action point tomorrow (${ACTION_POINTS_PER_DAY + 1} total)`,
    )
    expect(rows.some((row) => row.startsWith("★"))).toBe(false)
  })

  test("resultRows: a champion lists the win bundle", () => {
    // Seed 17 still wins the cup after the FR6 rebalance (see the champion
    // run test above).
    const session = play(creature(), CUP_DAY, 17, "specials")
    expect(cupPlacement(session)).toBe(1)
    const rows = resultRows(
      session,
      { points: 6, tier: "bronze", subTier: "II" },
      {
        points: 4,
        tier: "bronze",
        subTier: "III",
      },
    )
    expect(rows).toEqual([
      `+1 action point tomorrow (${ACTION_POINTS_PER_DAY + 1} total)`,
      `Bond +${CUP_REWARDS.bond}`,
      `Mood +${CUP_REWARDS.mood}`,
      "🏆 Cup won",
      "Ladder +2 — promoted to Bronze II",
    ])
  })

  test("resultRows: an elimination lists consolation plus the ladder row", () => {
    const session = play(creature(), CUP_DAY, 101)
    expect(cupPlacement(session)).toBe(4)
    const rows = resultRows(
      session,
      { points: 4, tier: "bronze", subTier: "III" },
      {
        points: 4,
        tier: "bronze",
        subTier: "III",
      },
    )
    expect(rows[0]).toBe(`Consolation: mood +${CUP_REWARDS.consolations.mood}`)
    expect(rows[1]).toBe("Ladder unchanged")
  })

  test("resultRows: a forfeit says so plainly on the ladder row", () => {
    const c = creature()
    const species = getSpecies(c.speciesId)
    if (!species) throw new Error("unknown species")
    const opened = startCupSession(c, CUP_DAY, 101)
    const session = forfeitCup(opened)
    const rows = resultRows(
      session,
      { points: 4, tier: "bronze", subTier: "III" },
      {
        points: 4,
        tier: "bronze",
        subTier: "III",
      },
    )
    expect(rows.at(-1)).toBe("Forfeit — no ladder points")
  })
})
