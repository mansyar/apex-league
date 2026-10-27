/**
 * Phase 4 / FR-6 — the authored gatekeeper integration sweep.
 *
 * The six authored bosses are the spine of the climb, and the failure this
 * suite exists to prevent is the one recorded as learnings lesson 13: a
 * boss that never reaches its own stage. Substituting a boss into the final
 * slot is not enough on its own — the rival subtree has to carry it there,
 * the bracket has to open it at the right ladder position, and the final has
 * to be a real resolved battle rather than another walkover.
 *
 * These assertions run the *production* path end to end: `prepareCup` (which
 * is what the cup screen calls) opens the session with the widened rival
 * pool, the pre-resolved rival subtree is inspected, and the player's own
 * rounds are stepped through `resolvePlayerMatch` until someone reaches the
 * final. Nothing here re-implements bracket logic.
 *
 * The wider roster (species-roster-expansion FR-6, roster_wave_3 FR-6) is the
 * reason the field checks matter: from Silver the generated rivals draw the
 * reward line plus the three breeding-discovery lines, so a gatekeeper stage
 * must still open its boss and must never field a species the save has not
 * unlocked yet.
 */
import { describe, expect, test } from "bun:test"
import type { Tactic } from "../battle/policy"
import { BOSSES, type BossTier, bossForCup, getBoss } from "../bosses"
import { type Creature, createCreature } from "../creature"
import { resolvePlayerMatch } from "../cup"
import type { LadderSubTier } from "../ladder"
import { defaultLoadout } from "../loadout"
import { prepareCup } from "../machine"
import {
  DISCOVERY_SPECIES,
  getSpecies,
  obtainableSpecies,
  STARTER_SPECIES,
} from "../species"
import { chooseStarter, createInitialState, type GameState } from "../state"

/** Every cup day the sweep plays, spread across the calendar. */
const DAYS = Array.from({ length: 24 }, (_, i) => 7 + i * 4)

/**
 * One ladder position per authored boss, chosen so `bossForCup` routes to
 * that boss. Points sit inside the sub-tier the thresholds imply, which is
 * how a real save arrives: promotion gates sit just past the tier ceiling,
 * checkpoints at the tier's III, apexes at the tier's I.
 */
interface Stage {
  readonly bossId: string
  readonly points: number
  readonly tier: BossTier
  readonly subTier: LadderSubTier
  /** The starter that brings the element this boss is weak to. */
  readonly climber: string
  /** Training a climb to this stage actually affords. */
  readonly trained: number
  /** Tactic the coaching room would pick for a clean climb. */
  readonly tactic: Tactic
}

const STAGES: readonly Stage[] = [
  {
    bossId: "koda",
    points: 13,
    tier: "bronze",
    subTier: "I",
    climber: "water_axolotl",
    trained: 2,
    tactic: "balanced",
  },
  {
    bossId: "hesse",
    points: 18,
    tier: "silver",
    subTier: "III",
    climber: "fire_drake",
    trained: 4,
    tactic: "balanced",
  },
  {
    bossId: "marlow",
    points: 24,
    tier: "silver",
    subTier: "I",
    climber: "plant_ox",
    trained: 4,
    tactic: "balanced",
  },
  {
    bossId: "delmar",
    points: 25,
    tier: "silver",
    subTier: "I",
    climber: "plant_ox",
    trained: 4,
    tactic: "balanced",
  },
  {
    bossId: "fenn",
    points: 30,
    tier: "gold",
    subTier: "III",
    climber: "water_axolotl",
    trained: 6,
    tactic: "balanced",
  },
  {
    bossId: "thessa",
    points: 36,
    tier: "gold",
    subTier: "I",
    climber: "fire_drake",
    trained: 6,
    tactic: "balanced",
  },
]

function climberAt(stage: Stage, seed: number): Creature {
  const creature = createCreature(stage.climber, seed)
  const bonus = Math.min(stage.trained, 6)
  return {
    ...creature,
    trained: { hp: bonus, atk: bonus, def: bonus, spd: bonus },
    trainingDays: stage.trained,
  }
}

function stateAt(stage: Stage, day: number, seed = 42): GameState {
  const base = chooseStarter(createInitialState(), stage.climber, seed)
  return {
    ...base,
    day,
    ladder: { points: stage.points, tier: stage.tier, subTier: stage.subTier },
    creature: climberAt(stage, seed),
  }
}

function loadoutFor(state: GameState): readonly string[] {
  const creature = state.creature
  if (!creature) throw new Error("stage state has no creature")
  const species = getSpecies(creature.speciesId)
  if (!species) throw new Error(`unknown species ${creature.speciesId}`)
  return defaultLoadout(creature, species)
}

/** Step the player's branch until the cup ends. */

describe("authored gatekeepers reach their stage under the widened field", () => {
  test("every authored boss is routed to by the ladder position it owns", () => {
    for (const stage of STAGES) {
      const gate = bossForCup(stateAt(stage, 7))
      expect(gate?.boss.id).toBe(stage.bossId)
      const boss = getBoss(stage.bossId)
      expect(boss?.tier).toBe(stage.tier)
    }
  })

  test("prepareCup opens the authored final for every stage", () => {
    for (const stage of STAGES) {
      const session = prepareCup(stateAt(stage, 7))
      if (!session) throw new Error(`no session for ${stage.bossId}`)
      const finalSlot = session.bracket.slots.at(-1)
      const boss = getBoss(stage.bossId)
      expect(finalSlot?.bossId).toBe(stage.bossId)
      expect(finalSlot?.speciesId).toBe(boss?.speciesId)
      expect(finalSlot?.stats).toEqual(boss?.stats)
      expect(session.bracket.bossIntro).toBe(boss?.intro)
      expect(session.bracket.banner?.length ?? 0).toBeGreaterThan(0)
    }
  })

  test("the boss walks its rival subtree — every pairing is a battle-free advance", () => {
    for (const stage of STAGES) {
      const session = prepareCup(stateAt(stage, 7))
      if (!session) throw new Error(`no session for ${stage.bossId}`)
      const boss = getBoss(stage.bossId)
      const name = boss?.name ?? ""
      // QF4 and the semifinal are the boss's two rival-subtree pairings.
      const bossVerdicts = session.rivalVerdicts.filter(
        (v) => v.slotA === name || v.slotB === name,
      )
      expect(bossVerdicts.length).toBeGreaterThanOrEqual(2)
      for (const verdict of bossVerdicts) {
        expect(verdict.winner).toBe(name)
        expect(verdict.battle).toBeNull()
      }
      const resolutions = session.rivalResolutions.filter(
        (r) => r.winner.name === name || r.loser.name === name,
      )
      expect(resolutions.length).toBe(bossVerdicts.length)
      for (const resolution of resolutions) {
        expect(resolution.winner.name).toBe(name)
      }
    }
  })

  test("a real climb reaches the authored final and fights it for real", () => {
    for (const stage of STAGES) {
      const boss = getBoss(stage.bossId)
      const name = boss?.name ?? ""
      let metFinal = 0
      let foughtFinal = 0
      for (const day of DAYS) {
        const state = stateAt(stage, day)
        const opened = prepareCup(state)
        if (!opened) continue
        const loadout = loadoutFor(state)
        let session = opened
        let guard = 0
        while (session.status === "player-turn") {
          if (session.nextPlayerRound === 3) {
            // The authored final is the opponent in round 3, always.
            expect(session.nextOpponent?.bossId).toBe(stage.bossId)
            metFinal += 1
          }
          const step = resolvePlayerMatch(session, loadout, "balanced")
          if (step.verdict.round === 3) {
            // A gatekeeper final is a resolved battle, never a walkover, and
            // the boss is one of its two combatants.
            expect(step.verdict.battle).not.toBeNull()
            expect([step.verdict.slotA, step.verdict.slotB]).toContain(name)
            // A resolved final names one of its two combatants (a double KO
            // still advances by remaining HP).
            const winner = step.verdict.winner
            expect(
              winner === null
                ? false
                : [step.verdict.slotA, step.verdict.slotB].includes(winner),
            ).toBe(true)
            foughtFinal += 1
          }
          session = step.session
          guard += 1
          if (guard > 8) throw new Error("cup did not terminate")
        }
      }
      // A gatekeeper that no climb can even reach is the lesson-13 failure.
      expect(metFinal).toBeGreaterThan(0)
      expect(foughtFinal).toBeGreaterThan(0)
    }
  })

  test("every stage bracket draws only species the save has unlocked", () => {
    for (const stage of STAGES) {
      for (const day of DAYS.slice(0, 8)) {
        const state = stateAt(stage, day)
        const session = prepareCup(state)
        if (!session) continue
        // Rivals are wild opponents: every non-Bronze field also carries the
        // wave-3 discovery lines (FR-6) on top of the reward-gated pool.
        const legal = new Set(
          (stage.tier === "bronze"
            ? [...STARTER_SPECIES]
            : [...obtainableSpecies(stage.tier), ...DISCOVERY_SPECIES]
          ).map((s) => s.id),
        )
        for (const slot of session.bracket.slots) {
          if (slot.bossId) continue
          expect(legal.has(slot.speciesId)).toBe(true)
        }
      }
    }
  })

  test("the silver field draws the reward line, the legend field draws all fifteen", () => {
    const silver = obtainableSpecies("silver").map((s) => s.id)
    const legend = obtainableSpecies("legend").map((s) => s.id)
    expect(silver).toContain("fernstag")
    expect(silver).not.toContain("reefclaw")
    expect(legend).toHaveLength(9)
    for (const id of ["fernstag", "reefclaw", "cindermoor"]) {
      expect(legend).toContain(id)
    }
    // The generated legend field is the nine obtainable species plus the
    // six wave-3/wave-4 discovery lines.
    expect([...legend, ...DISCOVERY_SPECIES.map((s) => s.id)]).toHaveLength(15)
  })

  test("each stage's field really contains the wider line it has unlocked", () => {
    // FR-6's first clause is that the rival field uses the wider roster, so a
    // stage whose tier has opened a reward or discovery species must actually
    // meet it across the swept cup days — otherwise the browser pass would be
    // photographing the old three-starter field.
    const wider = [
      "fernstag",
      "reefclaw",
      "cindermoor",
      ...DISCOVERY_SPECIES.map((s) => s.id),
    ]
    for (const stage of STAGES) {
      const unlocked = new Set(
        (stage.tier === "bronze"
          ? [...STARTER_SPECIES]
          : [...obtainableSpecies(stage.tier), ...DISCOVERY_SPECIES]
        ).map((s) => s.id),
      )
      const expected = wider.filter((id) => unlocked.has(id))
      if (expected.length === 0) continue
      const seen = new Set<string>()
      for (const day of DAYS) {
        const session = prepareCup(stateAt(stage, day))
        if (!session) continue
        for (const slot of session.bracket.slots) {
          if (slot.bossId) continue
          seen.add(slot.speciesId)
        }
      }
      for (const id of expected) {
        expect(seen.has(id), `${stage.bossId} field never drew ${id}`).toBe(
          true,
        )
      }
      // Nothing above the tier leaks into the field.
      for (const id of wider) {
        if (expected.includes(id)) continue
        expect(seen.has(id), `${stage.bossId} field leaked ${id}`).toBe(false)
      }
    }
  })

  test("a gatekeeper final never hides behind a generated rival", () => {
    // `substituteFinalBoss` runs after the draw, so the drawn seventh rival
    // is replaced rather than fought — pin that the field really is seven
    // drawn rivals plus the authored final.
    for (const stage of STAGES) {
      const session = prepareCup(stateAt(stage, 7))
      if (!session) throw new Error(`no session for ${stage.bossId}`)
      const slots = session.bracket.slots
      expect(slots).toHaveLength(8)
      expect(slots.filter((s) => s.isPlayer)).toHaveLength(1)
      expect(slots.filter((s) => s.bossId !== undefined)).toHaveLength(1)
      expect(session.bracket.finalRival.bossId).toBe(stage.bossId)
    }
  })
})

describe("the authored registry stays the only source of gatekeepers", () => {
  test("every stage maps back to a distinct authored boss", () => {
    const routed = STAGES.map((stage) => bossForCup(stateAt(stage, 7))?.boss.id)
    expect(routed).toEqual(STAGES.map((s) => s.bossId))
    expect(new Set(routed).size).toBe(BOSSES.length)
  })

  test("the sweep covers the whole registry", () => {
    expect(STAGES.map((s) => s.bossId).sort()).toEqual(
      BOSSES.map((b) => b.id).sort(),
    )
  })
})
