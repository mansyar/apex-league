/**
 * The leaderboard submitter (FR-1, NFR-2): entries derive from the save,
 * only changes submit, and every failure mode is quiet.
 */
import { describe, expect, test } from "bun:test"
import {
  type Creature,
  chooseStarter,
  createCreature,
  createInitialState,
  createMemoryAdapter,
  type GameState,
  type RetiredRecord,
  SAVE_VERSION,
  type SaveAdapter,
  type SaveData,
  serializeSave,
} from "@apex/sim"
import type { CloudApi, ScoreSubmission } from "./api"
import {
  createScoreSubmitter,
  deriveScoreEntries,
  deriveScoreEntriesFromPayload,
  SCORE_SNAPSHOT_KEY,
} from "./scores"

function baseState(): GameState {
  return chooseStarter(createInitialState(), "fire_drake", 42)
}

function payloadOf(state: GameState): string {
  const data: SaveData = {
    version: SAVE_VERSION,
    state,
    savedAt: 100,
    session: null,
  }
  return serializeSave(data)
}

function withTraining(state: GameState, days: number): GameState {
  if (!state.creature) throw new Error("expected a creature")
  return { ...state, creature: { ...state.creature, trainingDays: days } }
}

function stashed(speciesId: string, trainingDays: number): Creature {
  return { ...createCreature(speciesId, 7), trainingDays }
}

function hallRecord(speciesId: string, branch: string): RetiredRecord {
  const creature = createCreature("fire_drake", 9)
  return {
    name: "Old",
    speciesId,
    archetypeId: creature.archetypeId,
    element: creature.element,
    affinity: null,
    stats: creature.stats,
    trained: creature.trained,
    cupsWon: 2,
    generation: 0,
    retiredOnDay: 60,
    traits: [],
    parents: [],
    branch,
    giftEgg: false,
  }
}

function entryValue(
  entries: ScoreSubmission[],
  category: ScoreSubmission["category"],
): number {
  const entry = entries.find((item) => item.category === category)
  if (!entry) throw new Error(`missing entry for ${category}`)
  return entry.value
}

interface ScoreCall {
  id: string
  submission: ScoreSubmission
}

function fakeScoreApi(
  answer: () => Promise<
    ReturnType<CloudApi["submitScore"]> extends Promise<infer T> ? T : never
  > = async () => ({
    ok: true,
    value: {
      updated: true,
      entry: { category: "cups", value: 1, name: "Ana", updatedAt: 1 },
    },
  }),
): { api: Pick<CloudApi, "submitScore">; calls: ScoreCall[] } {
  const calls: ScoreCall[] = []
  return {
    calls,
    api: {
      submitScore: async (id, _passphrase, submission) => {
        calls.push({ id, submission })
        return answer()
      },
    },
  }
}

function submitterOver(
  api: Pick<CloudApi, "submitScore">,
  signedIn: boolean,
): { storage: SaveAdapter; submit: (payload: string) => void } {
  const storage = createMemoryAdapter()
  if (signedIn) {
    storage.setItem(
      "apex.trainer",
      JSON.stringify({
        id: "trn_abc",
        name: "Ana",
        passphrase: "kestrel-42",
      }),
    )
  }
  const submit = createScoreSubmitter({
    api,
    storage,
    credentials: () => {
      const raw = storage.getItem("apex.trainer")
      if (!raw) return null
      return JSON.parse(raw) as {
        id: string
        name: string
        passphrase: string
      }
    },
  })
  return { storage, submit: (payload) => submit.submitIfChanged(payload) }
}

/** Let fire-and-forget submits answer: the snapshot moves a tick later. */
async function settle(): Promise<void> {
  for (let hop = 0; hop < 5; hop++) await Promise.resolve()
}

describe("score derivation", () => {
  test("cups and ladder read their tallies", () => {
    const state: GameState = {
      ...baseState(),
      cupsWon: 3,
      ladder: { ...baseState().ladder, points: 7 },
    }
    const entries = deriveScoreEntries(state, "Ana")
    expect(entryValue(entries, "cups")).toBe(3)
    expect(entryValue(entries, "ladder")).toBe(7)
  })

  test("ap totals training days across the ranch and the stable", () => {
    const state = withTraining(baseState(), 4)
    const entries = deriveScoreEntries(
      {
        ...state,
        stable: [stashed("plant_ox", 6), stashed("water_axolotl", 0)],
      },
      "Ana",
    )
    expect(entryValue(entries, "ap")).toBe(10)
  })

  test("collection counts distinct species, stages, and forms", () => {
    const state = baseState()
    if (!state.creature) throw new Error("expected a creature")
    const entries = deriveScoreEntries(
      {
        ...state,
        stable: [stashed("plant_ox", 0)],
        lineage: {
          generation: 1,
          hallOfFame: [hallRecord("water_axolotl", "tide_caller")],
        },
      },
      "Ana",
    )
    // Active fire_drake baby, stabled plant_ox baby, retired water_axolotl
    // champion of its branch: three distinct collection identities.
    expect(entryValue(entries, "collection")).toBe(3)
  })

  test("collection collapses duplicates and splits on form", () => {
    const state = baseState()
    if (!state.creature) throw new Error("expected a creature")
    const twin = { ...state.creature }
    const entries = deriveScoreEntries(
      {
        ...state,
        stable: [twin],
        lineage: {
          generation: 2,
          hallOfFame: [
            hallRecord("fire_drake", "cinder_courser"),
            hallRecord("fire_drake", "ember_warden"),
          ],
        },
      },
      "Ana",
    )
    // The stabled twin repeats the active pet (one identity); the two Hall
    // records share species and stage but not form (two more).
    expect(entryValue(entries, "collection")).toBe(3)
  })

  test("every entry carries the trainer's chosen name", () => {
    for (const entry of deriveScoreEntries(baseState(), "Noor")) {
      expect(entry.name).toBe("Noor")
    }
  })

  test("a fresh save still submits (first submit creates the entries)", () => {
    const entries = deriveScoreEntriesFromPayload(payloadOf(baseState()), "Ana")
    expect(entries).toHaveLength(4)
    expect(entryValue(entries, "cups")).toBe(0)
    expect(entryValue(entries, "collection")).toBe(1)
  })

  test("an unreadable payload submits nothing, never throws", () => {
    expect(deriveScoreEntriesFromPayload("{oops", "Ana")).toEqual([])
    expect(deriveScoreEntriesFromPayload("null", "Ana")).toEqual([])
    expect(
      deriveScoreEntriesFromPayload(JSON.stringify({ savedAt: 1 }), "Ana"),
    ).toEqual([])
  })

  test("implausible counts sanitize to zero, never to the wire", () => {
    const state = {
      ...baseState(),
      cupsWon: -2,
      ladder: { ...baseState().ladder, points: Number.NaN },
    }
    const entries = deriveScoreEntriesFromPayload(payloadOf(state), "Ana")
    expect(entryValue(entries, "cups")).toBe(0)
    expect(entryValue(entries, "ladder")).toBe(0)
  })
})

describe("the score submitter", () => {
  test("the first payload submits all four boards", async () => {
    const { api, calls } = fakeScoreApi()
    const { storage, submit } = submitterOver(api, true)
    submit(payloadOf({ ...baseState(), cupsWon: 1 }))
    await settle()
    expect(calls.map((call) => call.submission.category).sort()).toEqual([
      "ap",
      "collection",
      "cups",
      "ladder",
    ])
    expect(calls[0]?.id).toBe("trn_abc")
    const cups = calls.find(
      (call) => call.submission.category === "cups",
    )?.submission
    expect(cups).toMatchObject({ value: 1, name: "Ana" })
    expect(storage.getItem(SCORE_SNAPSHOT_KEY)).not.toBeNull()
  })

  test("an unchanged payload submits nothing", async () => {
    const { api, calls } = fakeScoreApi()
    const { submit } = submitterOver(api, true)
    const payload = payloadOf({ ...baseState(), cupsWon: 1 })
    submit(payload)
    await settle()
    expect(calls).toHaveLength(4)
    submit(payload)
    await settle()
    expect(calls).toHaveLength(4)
  })

  test("only the changed board resubmits", async () => {
    const { api, calls } = fakeScoreApi()
    const { submit } = submitterOver(api, true)
    submit(payloadOf(baseState()))
    await settle()
    expect(calls).toHaveLength(4)
    submit(payloadOf({ ...baseState(), cupsWon: 2 }))
    await settle()
    expect(calls).toHaveLength(5)
    expect(calls[4]?.submission).toMatchObject({
      category: "cups",
      value: 2,
    })
  })

  test("a rename resubmits every board with the new name", async () => {
    const { api, calls } = fakeScoreApi()
    const storage = createMemoryAdapter()
    storage.setItem(
      "apex.trainer",
      JSON.stringify({
        id: "trn_abc",
        name: "Ana",
        passphrase: "kestrel-42",
      }),
    )
    const submit = createScoreSubmitter({
      api,
      storage,
      credentials: () => {
        const raw = storage.getItem("apex.trainer") ?? ""
        return JSON.parse(raw) as {
          id: string
          name: string
          passphrase: string
        }
      },
    })
    submit.submitIfChanged(payloadOf(baseState()))
    await settle()
    expect(calls).toHaveLength(4)
    storage.setItem(
      "apex.trainer",
      JSON.stringify({
        id: "trn_abc",
        name: "Noor",
        passphrase: "kestrel-42",
      }),
    )
    submit.submitIfChanged(payloadOf(baseState()))
    await settle()
    expect(calls).toHaveLength(8)
    for (const call of calls.slice(4)) {
      expect(call.submission.name).toBe("Noor")
    }
  })

  test("a failed submit is quiet and retries on the next push", async () => {
    let fail = true
    const { api, calls } = fakeScoreApi(async () => {
      if (fail) throw new Error("connect ECONNREFUSED")
      return {
        ok: true,
        value: {
          updated: true,
          entry: { category: "cups", value: 1, name: "Ana", updatedAt: 1 },
        },
      }
    })
    const { storage, submit } = submitterOver(api, true)
    const payload = payloadOf({ ...baseState(), cupsWon: 1 })
    submit(payload)
    await settle()
    expect(storage.getItem(SCORE_SNAPSHOT_KEY)).toBeNull()
    fail = false
    submit(payload)
    await settle()
    expect(calls).toHaveLength(8)
    expect(storage.getItem(SCORE_SNAPSHOT_KEY)).not.toBeNull()
  })

  test("a rejected submit never moves the snapshot", async () => {
    const { api, calls } = fakeScoreApi(async () => ({
      ok: false,
      reason: "rejected",
      error: "invalid_value",
    }))
    const { storage, submit } = submitterOver(api, true)
    submit(payloadOf(baseState()))
    await settle()
    expect(calls).toHaveLength(4)
    expect(storage.getItem(SCORE_SNAPSHOT_KEY)).toBeNull()
  })

  test("signed out submits nothing, and a stranger starts fresh", async () => {
    const { api, calls } = fakeScoreApi()
    const { submit } = submitterOver(api, false)
    submit(payloadOf({ ...baseState(), cupsWon: 9 }))
    await settle()
    expect(calls).toEqual([])
  })
})
