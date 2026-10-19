/**
 * Cup goldens — the refactor safety net (cup_module_refactor_20261018).
 *
 * These tests pin the cup engine's observable behavior BEFORE any code
 * relocation (spec FR5): the bossForCup decision grid (exhaustive,
 * table-driven) and the full session transcript for each of the three
 * endings (champion, eliminated, forfeited). They are written green — they
 * pin current behavior, they do not TDD a change. Any cup refactor that
 * moves a verdict line, reorders a reveal, or changes a routing answer
 * fails here.
 *
 * Transcript convention: every verdict is pinned as
 * [round, slotA, slotB, winner, line]. Battles/events are deliberately not
 * pinned (the resolver has its own goldens); the bracket's public shape is
 * what the refactor must preserve.
 */
import { describe, expect, test } from "bun:test"
import { bossForCup } from "./bosses"
import { createCreature } from "./creature"
import {
  type CupSession,
  completeCup,
  cupPlacement,
  forfeitCup,
  resolvePlayerMatch,
  startCupSession,
} from "./cup"
import { defaultLoadout, getSpecies } from "./index"
import type { CupKind, LadderSubTier, LadderTier } from "./ladder"
import { chooseStarter, createInitialState } from "./state"

const playerCreature = () => createCreature("fire_drake", 11)
const DAY = 7

/** Loadout resolved through the same default path the engine clients use. */
function playerLoadout(creature: ReturnType<typeof playerCreature>) {
  const species = getSpecies(creature.speciesId)
  if (!species) throw new Error("no species")
  return defaultLoadout(creature, species)
}

type Row = [number, string, string, string | null, string]

const row = (v: {
  round: number
  slotA: string
  slotB: string
  winner: string | null
  line: string
}): Row => [v.round, v.slotA, v.slotB, v.winner, v.line]

function playToCompletion(day: number, seed: number): CupSession {
  const creature = playerCreature()
  const loadout = playerLoadout(creature)
  let cur = startCupSession(creature, day, seed)
  while (cur.status === "player-turn") {
    cur = resolvePlayerMatch(cur, loadout, "balanced").session
  }
  if (cur.status === "eliminated") return completeCup(cur)
  return cur
}

describe("cup goldens — bossForCup decision grid (routing safety net)", () => {
  function stateAt(
    tier: LadderTier,
    subTier: LadderSubTier,
    points: number,
    bossDefeats: string[] = [],
  ) {
    const started = chooseStarter(createInitialState(), "fire_drake", 42)
    return {
      ...started,
      ladder: { points, tier, subTier },
      bossDefeats,
    }
  }

  const GRID: Array<{
    label: string
    tier: LadderTier
    subTier: LadderSubTier
    points: number
    defeats: string[]
    expect: string | null
    kind: CupKind | undefined
  }> = [
    // Bronze — the Promotion Cup is the only authored stop, and only at
    // Bronze I strictly past the Bronze I ceiling (promotionEligible).
    {
      label: "bronze III, fresh save",
      tier: "bronze",
      subTier: "III",
      points: 0,
      defeats: [],
      expect: null,
      kind: undefined,
    },
    {
      label: "bronze I, below the gate",
      tier: "bronze",
      subTier: "I",
      points: 12,
      defeats: [],
      expect: null,
      kind: undefined,
    },
    {
      label: "bronze I, past the gate",
      tier: "bronze",
      subTier: "I",
      points: 15,
      defeats: [],
      expect: "koda",
      kind: "promotion",
    },
    // Silver — Hesse checkpoint (III), Marlow apex (I), Delmar gate (I past ceiling).
    {
      label: "silver III, no Hesse scalp",
      tier: "silver",
      subTier: "III",
      points: 18,
      defeats: [],
      expect: "hesse",
      kind: "championship",
    },
    {
      label: "silver III, Hesse scalped",
      tier: "silver",
      subTier: "III",
      points: 18,
      defeats: ["hesse"],
      expect: null,
      kind: undefined,
    },
    {
      label: "silver II, no boss",
      tier: "silver",
      subTier: "II",
      points: 20,
      defeats: [],
      expect: null,
      kind: undefined,
    },
    {
      label: "silver I, below ceiling, no Marlow scalp",
      tier: "silver",
      subTier: "I",
      points: 24,
      defeats: [],
      expect: "marlow",
      kind: "championship",
    },
    {
      label: "silver I, below ceiling, Marlow scalped",
      tier: "silver",
      subTier: "I",
      points: 24,
      defeats: ["marlow"],
      expect: null,
      kind: undefined,
    },
    {
      label: "silver I, past the gate (gate overrides the apex)",
      tier: "silver",
      subTier: "I",
      points: 25,
      defeats: [],
      expect: "delmar",
      kind: "promotion",
    },
    {
      label: "silver I, past the gate, Marlow scalped (gate still wins)",
      tier: "silver",
      subTier: "I",
      points: 25,
      defeats: ["marlow"],
      expect: "delmar",
      kind: "promotion",
    },
    // Gold — Fenn checkpoint (III), Thessa apex (I), Thessa gate past the ceiling.
    {
      label: "gold III, no Fenn scalp",
      tier: "gold",
      subTier: "III",
      points: 30,
      defeats: [],
      expect: "fenn",
      kind: "championship",
    },
    {
      label: "gold III, Fenn scalped",
      tier: "gold",
      subTier: "III",
      points: 30,
      defeats: ["fenn"],
      expect: null,
      kind: undefined,
    },
    {
      label: "gold II, no boss",
      tier: "gold",
      subTier: "II",
      points: 32,
      defeats: [],
      expect: null,
      kind: undefined,
    },
    {
      label: "gold I, below ceiling, no Thessa scalp",
      tier: "gold",
      subTier: "I",
      points: 36,
      defeats: [],
      expect: "thessa",
      kind: "championship",
    },
    {
      label: "gold I, below ceiling, Thessa scalped",
      tier: "gold",
      subTier: "I",
      points: 36,
      defeats: ["thessa"],
      expect: null,
      kind: undefined,
    },
    {
      label: "gold I, past the gate — the legend gate overrides retirement",
      tier: "gold",
      subTier: "I",
      points: 37,
      defeats: [],
      expect: "thessa",
      kind: "promotion",
    },
    {
      label: "gold I, past the gate, Thessa scalped — the gate re-summons",
      tier: "gold",
      subTier: "I",
      points: 37,
      defeats: ["thessa"],
      expect: "thessa",
      kind: "promotion",
    },
    // Legend — the capstone; nothing stands above it.
    {
      label: "legend, maxed points",
      tier: "legend",
      subTier: "I",
      points: 100,
      defeats: ["koda", "hesse", "marlow", "delmar", "fenn", "thessa"],
      expect: null,
      kind: undefined,
    },
  ]

  test("the full routing table holds exactly", () => {
    for (const g of GRID) {
      const answer = bossForCup(stateAt(g.tier, g.subTier, g.points, g.defeats))
      if (g.expect === null) {
        expect(answer).toBeNull()
      } else {
        expect(answer?.boss.id).toBe(g.expect)
        expect(answer?.kind).toBe(g.kind)
      }
    }
  })

  test("every routed boss resolves from the registry", () => {
    for (const g of GRID) {
      if (g.expect === null) continue
      const answer = bossForCup(stateAt(g.tier, g.subTier, g.points, g.defeats))
      expect(answer?.boss.name.length).toBeGreaterThan(0)
      expect(answer?.boss.milestone.length).toBeGreaterThan(0)
    }
  })
})

describe("cup goldens — full session transcripts (one per ending)", () => {
  // Champion ending: seed 17, creature seed 11, default loadout, balanced.
  // Re-pinned in move_pool_20261018 Phase 2: rivals now field four of their six
  // moves, so the old seed 25 bracket no longer ends in a crown.
  test("champion path (seed 17): the player takes all three rounds", () => {
    const session = playToCompletion(DAY, 17)
    expect(session.status).toBe("champion")
    expect(session.championName).toBe("Ember Drake")
    expect(cupPlacement(session)).toBe(1)
    expect(session.rivalVerdicts.map(row)).toEqual([
      [
        1,
        "Emberhold Flicker",
        "Mossbottom Brute",
        "Mossbottom Brute",
        "Mossbottom Brute takes the Quarterfinal!",
      ],
      [
        1,
        "Ash-ledger",
        "Reedle Mirefin",
        "Ash-ledger",
        "Ash-ledger takes the Quarterfinal!",
      ],
      [
        1,
        "Bonfire Brook",
        "Thistledown Ash",
        "Thistledown Ash",
        "Thistledown Ash takes the Quarterfinal!",
      ],
      [
        2,
        "Ash-ledger",
        "Thistledown Ash",
        "Thistledown Ash",
        "Thistledown Ash takes the Semifinal!",
      ],
    ])
    expect(session.playerVerdicts.map(row)).toEqual([
      [
        1,
        "Ember Drake",
        "Pondskipper Grub",
        "Ember Drake",
        "Ember Drake takes the Quarterfinal!",
      ],
      [
        2,
        "Ember Drake",
        "Mossbottom Brute",
        "Ember Drake",
        "Ember Drake takes the Semifinal!",
      ],
      [
        3,
        "Ember Drake",
        "Thistledown Ash",
        "Ember Drake",
        "Ember Drake takes the Final!",
      ],
    ])
    expect(session.completionVerdicts.map(row)).toEqual([])
  })

  // Eliminated ending: seed 7, the player exits at the semifinal.
  test("eliminated path (seed 7): SF exit, the conqueror runs the final", () => {
    const session = playToCompletion(DAY, 7)
    expect(session.status).toBe("eliminated")
    expect(session.championName).toBe("Tidecaller Nibbles")
    expect(cupPlacement(session)).toBe(3)
    expect(session.rivalVerdicts.map(row)).toEqual([
      [
        1,
        "Reedle Mirefin",
        "Emberhold Flicker",
        "Emberhold Flicker",
        "Emberhold Flicker takes the Quarterfinal!",
      ],
      [
        1,
        "Driftbelle",
        "Cindersnout",
        "Cindersnout",
        "Cindersnout takes the Quarterfinal!",
      ],
      [
        1,
        "Gilded Horn",
        "Tidecaller Nibbles",
        "Tidecaller Nibbles",
        "Tidecaller Nibbles takes the Quarterfinal!",
      ],
      [
        2,
        "Cindersnout",
        "Tidecaller Nibbles",
        "Tidecaller Nibbles",
        "Tidecaller Nibbles takes the Semifinal!",
      ],
    ])
    expect(session.playerVerdicts.map(row)).toEqual([
      [
        1,
        "Ember Drake",
        "Pondskipper Grub",
        "Ember Drake",
        "Ember Drake takes the Quarterfinal!",
      ],
      [
        2,
        "Ember Drake",
        "Emberhold Flicker",
        "Emberhold Flicker",
        "Emberhold Flicker takes the Semifinal!",
      ],
    ])
    expect(session.completionVerdicts.map(row)).toEqual([
      [
        3,
        "Emberhold Flicker",
        "Tidecaller Nibbles",
        "Tidecaller Nibbles",
        "Tidecaller Nibbles takes the Final!",
      ],
    ])
  })

  // Forfeit ending: seed 101, the player walks at the quarterfinal.
  test("forfeit path (seed 101): the forfeit line, then the bracket completes", () => {
    const creature = playerCreature()
    const session = forfeitCup(startCupSession(creature, DAY, 101))
    expect(session.status).toBe("eliminated")
    expect(session.championName).toBe("Reedle Mirefin")
    expect(cupPlacement(session)).toBe(4)
    expect(session.rivalVerdicts.map(row)).toEqual([
      [
        1,
        "Tidecaller Nibbles",
        "Reedle Mirefin",
        "Reedle Mirefin",
        "Reedle Mirefin takes the Quarterfinal!",
      ],
      [
        1,
        "Bramble Knoll Ox",
        "Ash-ledger",
        "Ash-ledger",
        "Ash-ledger takes the Quarterfinal!",
      ],
      [
        1,
        "Pondskipper Grub",
        "Mossbottom Brute",
        "Mossbottom Brute",
        "Mossbottom Brute takes the Quarterfinal!",
      ],
      [
        2,
        "Ash-ledger",
        "Mossbottom Brute",
        "Mossbottom Brute",
        "Mossbottom Brute takes the Semifinal!",
      ],
    ])
    expect(session.playerVerdicts.map(row)).toEqual([
      [
        1,
        "Ember Drake",
        "Bonfire Brook",
        "Bonfire Brook",
        "Bonfire Brook advances — Ember Drake forfeits the Quarterfinal.",
      ],
    ])
    expect(session.completionVerdicts.map(row)).toEqual([
      [
        2,
        "Bonfire Brook",
        "Reedle Mirefin",
        "Reedle Mirefin",
        "Reedle Mirefin takes the Semifinal!",
      ],
      [
        3,
        "Reedle Mirefin",
        "Mossbottom Brute",
        "Reedle Mirefin",
        "Reedle Mirefin takes the Final!",
      ],
    ])
  })
})
