import {
  advanceDay,
  assignTraining,
  type CareAction,
  careAction,
  chooseStarter,
  clearLoadout,
  createInitialState,
  type GameState,
  getSpecies,
  loadGame,
  type StatKey,
  saveGame,
  setLoadout,
  setReducedMotion,
} from "@apex/sim"
import { buildArena } from "./arena"
import { createHud } from "./hud"
import { createScene } from "./scene"
import { createSpar } from "./spar"
import { createStaging } from "./staging"
import { createStarterChoice } from "./starter"
import { createSwap } from "./swap"
import "./style.css"

const app = document.querySelector<HTMLElement>("#app")
if (!app) throw new Error("#app container missing")

const scene = createScene(app)
const arena = buildArena(scene.sceneRoot)
const staging = createStaging(arena.group)
const swap = createSwap(scene, arena)

const storage: Storage = window.localStorage
const saved = loadGame(storage)
let state: GameState = saved ?? createInitialState()

const persist = (): void => saveGame(storage, state, Date.now())

/** Cheap scene reducers: pile visibility + mood idle. Fired after any
 * sim mutation — the scene no-ops internally when nothing changed. */
const sceneVisuals = (): void => {
  const creature = state.creature
  if (!creature) return
  scene.setFedToday(creature.fedToday)
  scene.updateConditions(creature.conditions)
}

const syncScene = (): void => {
  const creature = state.creature
  if (!creature) return
  // Visual DNA seed: derived from the creature's own stat roll so the look
  // is stable across sessions and days, yet varies per partner.
  const s = creature.stats
  const visualSeed = (s.hp * 7 + s.atk * 13 + s.def * 17 + s.spd * 23) % 2 ** 31
  scene.setCreature(
    getSpecies(creature.speciesId)?.archetypeId ?? "draconic",
    visualSeed,
  )
  scene.setProps(visualSeed)
  sceneVisuals()
}

// The spar reads the live state through this hook; kit changes write
// through setLoadout/clearLoadout and persist like every other sim change.
const spar = createSpar(app, {
  onSetLoadout: (moveIds) => {
    if (!state.creature) return
    state = moveIds === null ? clearLoadout(state) : setLoadout(state, moveIds)
    persist()
    spar.update(state.creature ?? null)
  },
  // Fight start: dissolve into the broadcast arena and cast both fighters
  // on the stage; every event now also steps the arena playback. The ranch
  // creature retires while a fight plays. Back at the ranch the stage
  // clears and the ranch star returns. Nothing here touches the save.
  onFightStart: (casting) => {
    scene.setRanchCreatureVisible(false)
    void swap.enterArena()
    staging.cast(casting)
  },
  onStep: (step, instant) => staging.applyStep(step, instant),
  onClose: () => {
    scene.setRanchCreatureVisible(true)
    void swap.exitArena()
    staging.clear()
  },
})
staging.setBigHitHandler((strength) => scene.shake(strength))

/**
 * Reduced-motion hand-off: the save v5 preference reaches the arena
 * (no shake/flash in staging, no bounce/shake in scene) whenever it flips.
 */
const applyMotionPref = (): void => {
  const reduced = state.settings.reducedMotion
  staging.setMotionPref(reduced ? "reduced" : "full")
  scene.setMotionReduced(reduced)
}
applyMotionPref()

const hud = createHud(app, {
  onAdvanceDay: () => {
    state = advanceDay(state)
    persist()
    hud.update(state)
    spar.update(state.creature ?? null)
    // A training gain changes the visual seed → scatter may shift.
    syncScene()
  },
  onCare: (action: CareAction) => {
    const result = careAction(state, action)
    if (!result.ok) return // buttons are already disabled; belt and braces
    state = result.state
    persist()
    hud.update(state)
    spar.update(state.creature ?? null)
    // Feed toggles the food pile; conditions drive the mood idle.
    sceneVisuals()
  },
  onTrain: (stat: StatKey) => {
    const result = assignTraining(state, stat)
    if (!result.ok) return // entries are already disabled; belt and braces
    state = result.state
    persist()
    hud.update(state)
    // Fanout fix: training also refreshes the spar preview (kit gate moved
    // closer) and may shift the visual seed → resync both, exactly like
    // the other sim-mutating handlers do.
    spar.update(state.creature ?? null)
    syncScene()
  },
  onToggleReducedMotion: () => {
    state = setReducedMotion(state, !state.settings.reducedMotion)
    persist()
    hud.update(state)
    applyMotionPref()
  },
})

// First run (or a migrated v1 save without a creature): offer the starter.
let starter = state.creature
  ? null
  : createStarterChoice(app, {
      onChoose: (speciesId) => {
        // Runtime seed: each new game rolls a distinct partner, and every
        // roll is reproducible from the saved state afterwards.
        const seed = Date.now() % 2 ** 31
        state = chooseStarter(state, speciesId, seed)
        persist()
        starter?.remove()
        starter = null
        syncScene()
        hud.update(state)
        spar.update(state.creature ?? null)
      },
    })

syncScene()
hud.update(state)
spar.update(state.creature ?? null)
