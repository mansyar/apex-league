import { getSpecies, setArenaCamera } from "@apex/sim"
import type { SceneHandle } from "../scene"
import { visualSeedOf } from "../staging-seed"
import type { GameStore } from "../store"

/**
 * Scene sync (composition-root split): the reducers that keep the 3D ranch in
 * step with the saved game state, plus the saved camera preference. Moved out
 * of `main.ts` unchanged — the bodies are the originals; only the closed-over
 * module bindings became parameters.
 */
export interface SceneSync {
  /** Cheap scene reducers: pile visibility + mood idle. */
  sceneVisuals(): void
  /** Rebuild the mounted creature and its props from the current state. */
  syncScene(): void
  /** Push the saved camera style into the scene (boot and every flip). */
  applyCameraStyle(): void
  /** Flip the saved camera preference and apply it live (FR6). */
  toggleArenaCamera(): void
}

export function createSceneSync(
  scene: SceneHandle,
  store: GameStore,
): SceneSync {
  /** Cheap scene reducers: pile visibility + mood idle. Fired after any
   * sim mutation — the scene no-ops internally when nothing changed. */
  const sceneVisuals = (): void => {
    const creature = store.get().creature
    if (!creature) return
    scene.setFedToday(creature.fedToday)
    scene.updateConditions(creature.conditions)
  }

  const syncScene = (): void => {
    const creature = store.get().creature
    if (!creature) return
    // Visual DNA seed: derived from the creature's rolled base so the look
    // is stable across sessions and days, yet varies per partner. Training
    // gains ride the `trained` counters and never touch the seed; the stage
    // offset cancels evolution's stat boost so the individual stays the one
    // rolled at creation — only its stage presentation changes.
    const visualSeed = visualSeedOf(creature.stats, creature.stage)
    scene.setCreature(
      getSpecies(creature.speciesId)?.archetypeId ?? "draconic",
      visualSeed,
      creature.stage,
      creature.branch,
    )
    scene.setProps(visualSeed)
    sceneVisuals()
  }

  // The camera style is a saved preference (v7); reduced motion pins the
  // broadcast camera inside the scene regardless.
  const applyCameraStyle = (): void => {
    scene.setArenaCameraStyle(store.get().settings.arenaCamera)
  }

  /** Flip the saved camera preference and apply it live (FR6). */
  const toggleArenaCamera = (): void => {
    const current = store.get()
    store.commit(
      setArenaCamera(
        current,
        current.settings.arenaCamera === "cinematic"
          ? "broadcast"
          : "cinematic",
      ),
    )
    applyCameraStyle()
  }

  return { sceneVisuals, syncScene, applyCameraStyle, toggleArenaCamera }
}
