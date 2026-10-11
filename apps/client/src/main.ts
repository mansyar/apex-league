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
import { createGameStore } from "./store"
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
// The store is the single mutation path: handlers adopt a new state with
// commit(), which persists and notifies the hud/spar/cup subscribers in a
// fixed order — no handler hand-rolls that fanout anymore.
const store = createGameStore(saved ?? createInitialState(), storage, {
  onPersistError: () => hud.announceSaveFailure(),
})

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
  )
  scene.setProps(visualSeed)
  sceneVisuals()
}

// The spar reads the live state through this hook; kit changes write
// through the store like every other sim change.
const spar = createSpar(app, {
  onSetLoadout: (moveIds) => {
    const current = store.get()
    if (!current.creature) return
    store.commit(
      moveIds === null ? clearLoadout(current) : setLoadout(current, moveIds),
    )
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
  motionPref: () => store.get().settings.reducedMotion,
})
staging.setBigHitHandler((strength) => scene.shake(strength))

/**
 * Reduced-motion hand-off: the save v5 preference reaches the arena
 * (no shake/flash in staging, no bounce/shake in scene) whenever it flips.
 */
const applyMotionPref = (): void => {
  const reduced = store.get().settings.reducedMotion
  staging.setMotionPref(reduced ? "reduced" : "full")
  scene.setMotionReduced(reduced)
  // The swap honors the save too: in-app reduced means instant cuts.
  swap.setMotionReduced(reduced)
}
applyMotionPref()

// The cup panel owns the cup-day flow: entry resolves through the sim's
// enterCup in one call, the resolved state flows back through the store
// (which persists and fans out), and the panel presents the
// already-resolved bracket at its own pace.
const cup = createCup(app, {
  onResolved: (resolved) => {
    store.commit(resolved)
    // Conditions may carry the reward bump (mood/bond) — refresh the idle.
    sceneVisuals()
  },
  // Leaving the presentation before the bracket ends: one droopy idle
  // window (spec FR4), purely visual — the sim result already stands. The
  // chip re-syncs too: the entry already resolved, so it must hide.
  onEarlyExit: () => {
    scene.droopyMoment()
    cup.update(store.get())
  },
})

const hud = createHud(app, {
  onAdvanceDay: () => {
    // The ceremony is non-cancelable (FR2, 2026-10-10): HUD input applies
    // to the sim immediately but never interrupts the creature's motion.
    const stageBefore = store.get().creature?.stage
    store.commit(advanceDay(store.get()))
    const creature = store.get().creature
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
    const result = careAction(store.get(), action)
    if (!result.ok) return // buttons are already disabled; belt and braces
    store.commit(result.state)
    // Feed toggles the food pile; conditions drive the mood idle.
    sceneVisuals()
    // Ceremony is visual feedback for an already-committed action, so it
    // starts only after the sim confirms the feed succeeded. The pile is
    // visible immediately; successive feeds re-trigger cleanly.
    if (action === "feed") scene.startFeedCeremony()
  },
  onTrain: (stat: StatKey) => {
    const result = assignTraining(store.get(), stat)
    if (!result.ok) return // entries are already disabled; belt and braces
    store.commit(result.state)
    // Training may shift the visual seed → resync the scene after the
    // store's standard hud/spar/cup fanout.
    syncScene()
  },
  onToggleReducedMotion: () => {
    const current = store.get()
    store.commit(setReducedMotion(current, !current.settings.reducedMotion))
    applyMotionPref()
  },
})

// The store's fixed fanout: every commit persists (inside commit) and then
// updates the hud, the spar preview, and the cup chip — in that order —
// exactly like the old per-handler fanout did. Handlers only add their
// site-specific scene work on top.
store.subscribe((s) => hud.update(s))
store.subscribe((s) => spar.update(s.creature ?? null))
store.subscribe((s) => cup.update(s))

// First run (or a migrated v1 save without a creature): offer the starter.
let starter = store.get().creature
  ? null
  : createStarterChoice(app, {
      onChoose: (speciesId) => {
        // Runtime seed: each new game rolls a distinct partner, and every
        // roll is reproducible from the saved state afterwards.
        const seed = Date.now() % 2 ** 31
        store.commit(chooseStarter(store.get(), speciesId, seed))
        starter?.remove()
        starter = null
        syncScene()
      },
    })

syncScene()
hud.update(store.get())
spar.update(store.get().creature ?? null)
cup.update(store.get())
