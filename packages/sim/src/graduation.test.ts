/**
 * Track branching_evolution_champion_forms_20261020 Phase 2: graduation
 * records the earned form.
 *
 * A retiree's Hall of Fame record stores the branch it earned, so the
 * bloodline can show champion forms without re-deriving them. A migrated or
 * pinned old line records `legacy`. The successor egg always starts
 * unchosen: a parent's form is history, never inheritance.
 */
import { describe, expect, test } from "bun:test"

import { GRADUATION_DAY, graduate, retireeRecord } from "./legacy"
import { createMemoryAdapter, loadGame, saveGame } from "./save/storage"
import { chooseStarter, createInitialState, type GameState } from "./state"

function championState(branch: string | null): GameState {
  const owned = chooseStarter(createInitialState(), "fire_drake", 42)
  if (!owned.creature) throw new Error("no creature")
  return {
    ...owned,
    day: GRADUATION_DAY,
    creature: {
      ...owned.creature,
      stage: "champion",
      branch,
      // The graduation gate reads the pet's own age (save v23).
      ageDays: GRADUATION_DAY,
    },
  }
}

describe("retireeRecord — the earned form", () => {
  test("stores the branch the champion earned", () => {
    const record = retireeRecord(championState("cinder_courser"))
    expect(record?.branch).toBe("cinder_courser")
    expect(record?.speciesId).toBe("fire_drake")
  })

  test("stores legacy for an old line", () => {
    expect(retireeRecord(championState("legacy"))?.branch).toBe("legacy")
  })

  test("records legacy for a champion that never chose", () => {
    // A normal champion always resolves a form at its juvenile gate; a
    // hand-built or migrated null is archived as the old line, never null.
    expect(retireeRecord(championState(null))?.branch).toBe("legacy")
  })
})

describe("graduate — the archived form", () => {
  test("archives the branch and starts the successor unchosen", () => {
    const result = graduate(championState("pyre_warden"), "fire_drake", 7)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.lineage.hallOfFame[0]?.branch).toBe("pyre_warden")
    expect(result.state.creature?.branch).toBeNull()
    expect(result.state.creature?.stage).toBe("baby")
  })

  test("the archived branch survives a save round trip", () => {
    const result = graduate(championState("cinder_courser"), "fire_drake", 7)
    if (!result.ok) throw new Error("graduation failed")
    const adapter = createMemoryAdapter()
    saveGame(adapter, result.state, 1)
    expect(loadGame(adapter)?.lineage.hallOfFame[0]?.branch).toBe(
      "cinder_courser",
    )
  })
})
