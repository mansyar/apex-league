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
import { createCup } from "./cup"
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
})

// The cup panel owns the cup-day flow: entry resolves through the sim's
// enterCup in one call, the committed state flows back here to persist,
// and the panel presents the already-resolved bracket at its own pace.
const cup = createCup(app, {
  onResolved: (resolved) => {
    state = resolved
    persist()
    hud.update(state)
    spar.update(state.creature ?? null)
    // One entry per cup: the resolve flips the phase back to "day", so the
    // chip must re-sync or it would stay visible for the rest of the day.
    cup.update(state)
    // Conditions may carry the reward bump (mood/bond) — refresh the idle.
    sceneVisuals()
  },
  // Leaving the presentation before the bracket ends: one droopy idle
  // window (spec FR4), purely visual — the sim result already stands.
  onEarlyExit: () => scene.droopyMoment(),
})

const hud = createHud(app, {
  onAdvanceDay: () => {
    // The ceremony is non-cancelable (FR2, 2026-10-10): HUD input applies
    // to the sim immediately but never interrupts the creature's motion.
    state = advanceDay(state)
    persist()
    hud.update(state)
    spar.update(state.creature ?? null)
    cup.update(state)
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
    cup.update(state)
    // Feed toggles the food pile; conditions drive the mood idle.
    sceneVisuals()
    // Ceremony is visual feedback for an already-committed action, so it
    // starts only after the sim confirms the feed succeeded. The pile is
    // visible immediately; successive feeds re-trigger cleanly.
    if (action === "feed") scene.startFeedCeremony()
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
        cup.update(state)
      },
    })

syncScene()
hud.update(state)
spar.update(state.creature ?? null)
cup.update(state)
