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
} from "@apex/sim"
import { createHud } from "./hud"
import { createScene } from "./scene"
import { createSpar } from "./spar"
import { createStarterChoice } from "./starter"
import "./style.css"

const app = document.querySelector<HTMLElement>("#app")
if (!app) throw new Error("#app container missing")

const scene = createScene(app)

const storage: Storage = window.localStorage
const saved = loadGame(storage)
let state: GameState = saved ?? createInitialState()

const persist = (): void => saveGame(storage, state, Date.now())

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
  scene.updateConditions(creature.conditions)
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
})

const hud = createHud(app, {
  onAdvanceDay: () => {
    state = advanceDay(state)
    persist()
    hud.update(state)
    spar.update(state.creature ?? null)
    scene.updateConditions(state.creature?.conditions ?? null)
  },
  onCare: (action: CareAction) => {
    const result = careAction(state, action)
    if (!result.ok) return // buttons are already disabled; belt and braces
    state = result.state
    persist()
    hud.update(state)
    spar.update(state.creature ?? null)
    scene.updateConditions(state.creature?.conditions ?? null)
  },
  onTrain: (stat: StatKey) => {
    const result = assignTraining(state, stat)
    if (!result.ok) return // entries are already disabled; belt and braces
    state = result.state
    persist()
    hud.update(state)
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
