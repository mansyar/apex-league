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
import { createCup } from "./cup"
import { createHud } from "./hud"
import { createScene } from "./scene"
import { createSpar } from "./spar"
import { createStaging, visualSeedOf } from "./staging"
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
    // Broadcast clarity: the ranch HUD stands down while the bowl plays.
    app.classList.add("app-in-arena")
  },
  onStep: (step, instant) => staging.applyStep(step, instant),
  onClose: () => {
    scene.setRanchCreatureVisible(true)
    void swap.exitArena()
    staging.clear()
    app.classList.remove("app-in-arena")
  },
  // The arena scales its action animations to the playback pace, so
  // fast-forward speeds the whole fight up instead of cutting swings.
  onPace: (msPerStep) => staging.setPace(msPerStep),
  // The saved setting gates the playback too — an in-app "reduced" holds
  // even when the OS reports motion-ok.
  motionPref: () => state.settings.reducedMotion,
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
  // The swap honors the save too: in-app reduced means instant cuts.
  swap.setMotionReduced(reduced)
}
applyMotionPref()

// The live cup: prepareCup opens the bracket view, rival matches reveal
// at their own pace, the player's branch resolves live in the arena, and
// finalizeCup lands the rewards. Nothing here re-resolves the sim.
const cup = createCup(app, {
  onFightStart: (casting) => {
    scene.setRanchCreatureVisible(false)
    void swap.enterArena()
    staging.cast(casting)
    // Broadcast clarity: the ranch HUD stands down while the bowl plays.
    app.classList.add("app-in-arena")
  },
  onStep: (step, instant) => staging.applyStep(step, instant),
  onPace: (msPerStep) => staging.setPace(msPerStep),
  onArenaExit: () => {
    scene.setRanchCreatureVisible(true)
    void swap.exitArena()
    staging.clear()
    app.classList.remove("app-in-arena")
  },
  // The first arena fight consumes the cup (endCup flips the phase);
  // persist so a mid-cup refresh keeps the commitment.
  onCommit: (next) => {
    state = next
    persist()
    cup.update(state)
  },
  // Results are in and finalizeCup applied the rewards — refresh the ranch.
  onFinalize: (next) => {
    state = next
    persist()
    hud.update(state)
    spar.update(state.creature ?? null)
    cup.update(state)
    // Conditions may carry the reward bump (mood/bond) — refresh the idle.
    sceneVisuals()
  },
})

const hud = createHud(app, {
  onAdvanceDay: () => {
    // The ceremony is non-cancelable (FR2, 2026-10-10): HUD input applies
    // to the sim immediately but never interrupts the creature's motion.
    const stageBefore = state.creature?.stage
    state = advanceDay(state)
    persist()
    hud.update(state)
    spar.update(state.creature ?? null)
    cup.update(state)
    const creature = state.creature
    if (stageBefore === "baby" && creature?.stage === "juvenile") {
      // Evolution moment (spec R5): the scene walks the creature to the
      // ranch center, swells, and swaps the baby rig for the juvenile
      // build at the pulse's peak — so the plain rebuild is skipped. The
      // HUD announces the stat gains while the ceremony plays. The visual
      // seed is unchanged (stage-aware), so the props stay put.
      const archetypeId =
        getSpecies(creature.speciesId)?.archetypeId ?? "draconic"
      sceneVisuals()
      scene.startEvolutionCeremony(
        archetypeId,
        visualSeedOf(creature.stats, creature.stage),
      )
      hud.announceEvolution(creature)
    } else {
      // No evolution: the plain rebuild (training does not move the seed;
      // a v5-migrated creature settles the same way).
      syncScene()
    }
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
        cup.update(state)
      },
    })

syncScene()
hud.update(state)
spar.update(state.creature ?? null)
cup.update(state)
