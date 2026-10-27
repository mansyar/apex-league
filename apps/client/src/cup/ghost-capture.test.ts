/**
 * Cup-win ghost capture (ghost_data_async_rivals, review R1/F1): a
 * championship queues its replay bundle for the next push, and the queued
 * bundle flushes after the save; a loss or a forfeit queues nothing.
 */
import { describe, expect, test } from "bun:test"
import {
  advanceDay,
  buildGhostBundle,
  CONDITION_START,
  type Creature,
  chooseStarter,
  completeCup,
  createInitialState,
  createMemoryAdapter,
  defaultLoadout,
  forfeitCup,
  type GhostBundle,
  getSpecies,
  resolvePlayerMatch,
  startCupSession,
  verifyGhostBundle,
} from "@apex/sim"
import { createGhostSubmitter, GHOST_PENDING_KEY } from "../cloud/ghosts"
import { captureCupGhost } from "./ghost-capture"

/** A state standing on cup day 7 with a fresh creature, fully rested. */
function cupDayCreature(seed = 42): Creature {
  let s = advanceDay(chooseStarter(createInitialState(), "fire_drake", seed))
  while (s.day < 7) s = advanceDay(s)
  const creature = s.creature
  if (!creature) throw new Error("state has no creature")
  return { ...creature, conditions: { ...CONDITION_START } }
}

/** The pinned champion path (seed 17, default picks, balanced). */
function championSession() {
  const creature = cupDayCreature()
  const species = getSpecies(creature.speciesId)
  if (!species) throw new Error("unknown species")
  const loadout = defaultLoadout(creature, species)
  let session = startCupSession(creature, 7, 17)
  for (let round = 1; round <= 3; round++) {
    session = resolvePlayerMatch(session, loadout, "balanced").session
  }
  return session
}

describe("cup-win ghost capture", () => {
  test("a championship queues its bundle (F1/AC-1)", () => {
    const queued: unknown[] = []
    expect(
      captureCupGhost(championSession(), (bundle) => queued.push(bundle)),
    ).toBe(true)
    expect(queued).toHaveLength(1)
    expect(verifyGhostBundle(queued[0] as GhostBundle)).toBe(true)
  })

  test("a loss and a forfeit queue nothing", () => {
    const creature = cupDayCreature()
    const species = getSpecies(creature.speciesId)
    if (!species) throw new Error("unknown species")
    const loadout = defaultLoadout(creature, species)
    // Seed 101 loses the quarterfinal (cup-contracts golden).
    let elim = startCupSession(creature, 7, 101)
    elim = resolvePlayerMatch(elim, loadout, "balanced").session
    const forfeited = forfeitCup(startCupSession(creature, 7, 17))
    const queued: unknown[] = []
    const queue = (bundle: unknown): void => {
      queued.push(bundle)
    }
    expect(captureCupGhost(completeCup(elim), queue)).toBe(false)
    expect(captureCupGhost(forfeited, queue)).toBe(false)
    expect(queued).toHaveLength(0)
  })

  test("the queued bundle flushes after the save push (F1/AC-2)", async () => {
    const storage = createMemoryAdapter()
    const sent: unknown[] = []
    const submitter = createGhostSubmitter({
      api: {
        submitGhost: async () => {
          sent.push(true)
          return {
            ok: true as const,
            value: {
              stored: true,
              entry: { name: "Ana", payload: "{}", updatedAt: 8 },
            },
          }
        },
      },
      storage,
      credentials: () => ({
        id: "trn_ghost",
        name: "Ana",
        passphrase: "kestrel-42",
      }),
    })
    expect(
      captureCupGhost(championSession(), (bundle) =>
        submitter.queueGhost(bundle),
      ),
    ).toBe(true)
    expect(storage.getItem(GHOST_PENDING_KEY)).not.toBeNull()
    submitter.submitPending()
    for (let hop = 0; hop < 5; hop++) await Promise.resolve()
    expect(sent).toHaveLength(1)
    expect(storage.getItem(GHOST_PENDING_KEY)).toBeNull()
  })

  test("the captured bundle matches the sim's own builder", () => {
    const session = championSession()
    const queued: unknown[] = []
    captureCupGhost(session, (bundle) => queued.push(bundle))
    const direct = buildGhostBundle(session)
    expect(JSON.stringify(queued[0])).toBe(JSON.stringify(direct))
  })
})
