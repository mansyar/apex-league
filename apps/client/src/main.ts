import {
  advanceDay,
  assignTraining,
  type CareAction,
  careAction,
  chooseStarter,
  clearLoadout,
  clearSave,
  createInitialState,
  getSpecies,
  graduate,
  loadBoot,
  markHintSeen,
  renameCreature,
  type StatKey,
  setArenaCamera,
  setLoadout,
  setReducedMotion,
} from "@apex/sim"
import { buildArena } from "./arena"
import { createCup } from "./cup"
import { nextShot } from "./director"
import { showFailurePlate } from "./failure-plate"
import { createGraduation } from "./graduation"
import { corruptSaveNotice, createHud } from "./hud"
import {
  initialRuntimeState,
  type RuntimeEvent,
  runtimeState,
} from "./lifecycle"
import { resolveMotionPref } from "./motion"
import { createScene, type SceneHandle } from "./scene"
import { createSpar } from "./spar"
import { createStaging, type FightCasting } from "./staging"
import { visualSeedOf } from "./staging-seed"
import { createStarterChoice } from "./starter"
import { createGameStore } from "./store"
import { createSwap } from "./swap"
import "./ui/kit.css"
import "./base.css"
import "./ranch.css"
import "./graduation.css"
import "./starter.css"
import "./cup.css"
import "./spar.css"
import "./battle-hud.css"

const app = document.querySelector<HTMLElement>("#app")
if (!app) throw new Error("#app container missing")

// Boot is the one place a graphics failure is expected — no WebGL, a blocked
// context, a dead driver. It routes to the failure plate (F7) instead of a
// blank page; the boot placeholder comes down either way.
let scene: SceneHandle
try {
  scene = createScene(app)
} catch (error) {
  console.error("boot failed", error)
  document.getElementById("boot-plate")?.remove()
  showFailurePlate(
    app,
    "3D graphics didn't start, so the ranch can't load. Reload to try again.",
  )
  // Everything below wires against the scene; stopping here is the point.
  throw error
}
document.getElementById("boot-plate")?.remove()
const arena = buildArena(scene.sceneRoot)
const staging = createStaging(arena.group)
const swap = createSwap(scene, arena)

const storage: Storage = window.localStorage
// Boot reads once and distinguishes three worlds: no save (silent fresh
// start), an unreadable save (fresh start + a calm notice — the player is
// never silently robbed of their ranch), and a healthy payload (state +
// the riding cup session).
const boot = loadBoot(storage)
const saved = boot && "state" in boot ? boot : null
// A corrupt save gets a calm banner instead of silence: the status ticker
// hides with the creature plate pre-starter, so the only moment this news
// matters is exactly where it would be invisible. It clears once the new
// ranch exists.
const corruptBoot = boot !== null && "corrupt" in boot
let corruptNotice: HTMLElement | null = null
if (corruptBoot) {
  corruptNotice = document.createElement("div")
  corruptNotice.className = "kit-plate kit-notice"
  corruptNotice.textContent = corruptSaveNotice()
  app.appendChild(corruptNotice)
}
// A restored session is only resumable while its cup day is current: the
// walk lives on the day it was entered, and a day that moved on is over.
const restoredSession =
  saved?.session && saved.session.bracket.day === saved.state.day
    ? saved.session
    : null
// The store is the single mutation path: handlers adopt a new state with
// commit(), which persists and notifies the hud/spar/cup subscribers in a
// fixed order — no handler hand-rolls that fanout anymore. The cup session
// (save v7) rides every save so a refresh mid-walk resumes exactly here.
const store = createGameStore(saved?.state ?? createInitialState(), storage, {
  onPersistError: () => hud.announceSaveFailure(),
  initialSession: restoredSession,
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

// The camera style is a saved preference (v7); reduced motion pins the
// broadcast camera inside the scene regardless.
const applyCameraStyle = (): void => {
  scene.setArenaCameraStyle(store.get().settings.arenaCamera)
}
applyCameraStyle()

/** Flip the saved camera preference and apply it live (FR6). */
const toggleArenaCamera = (): void => {
  const current = store.get()
  store.commit(
    setArenaCamera(
      current,
      current.settings.arenaCamera === "cinematic" ? "broadcast" : "cinematic",
    ),
  )
  applyCameraStyle()
}

// The arena handoff is shared choreography: both the spar and the cup
// dissolve into the broadcast bowl the same way and restore the ranch on
// the way out. Nothing here touches the save.
const enterArena = (casting: FightCasting): void => {
  scene.setRanchCreatureVisible(false)
  void swap.enterArena()
  staging.cast(casting)
  // Broadcast clarity: the ranch HUD stands down while the bowl plays.
  app.classList.add("app-in-arena")
}
const exitArena = (): void => {
  scene.setRanchCreatureVisible(true)
  void swap.exitArena()
  staging.clear()
  app.classList.remove("app-in-arena")
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
  // clears and the ranch star returns.
  onFightStart: enterArena,
  onStep: (step, instant) => staging.applyStep(step, instant),
  onClose: exitArena,
  // The arena scales its action animations to the playback pace, so
  // fast-forward speeds the whole fight up instead of cutting swings.
  onPace: (msPerStep) => staging.setPace(msPerStep),
  // The saved setting gates the playback too — an in-app "reduced" holds
  // even when the OS reports motion-ok.
  motionPref: () => store.get().settings.reducedMotion,
})

// Big-hit vignette (FR7): a screen-edge darkening that pulses with the
// same strength the camera shake uses. A DOM overlay - cheap, and it
// rides above both the spar and cup battles. Reduced motion skips it.
const vignette = document.createElement("div")
vignette.className = "hit-vignette"
document.body.appendChild(vignette)
let vignetteFade: number | null = null
const flashVignette = (strength: number): void => {
  // Both the saved preference and the OS query gate the flash - the CSS
  // media query alone cannot (the opacity is driven inline).
  if (resolveMotionPref(store.get().settings.reducedMotion)) return
  // Fast flash in, slow ease back out - the two-phase transition swap.
  vignette.style.transition = "opacity 60ms ease-out"
  vignette.style.opacity = String(Math.min(0.85, strength * 9))
  if (vignetteFade !== null) window.clearTimeout(vignetteFade)
  vignetteFade = window.setTimeout(() => {
    vignette.style.transition = "opacity 300ms ease-in"
    vignette.style.opacity = "0"
  }, 110)
}

staging.setBigHitHandler((strength) => {
  scene.shake(strength)
  flashVignette(strength)
})
// Cinematic director (FR6): the stage reports the live battle context;
// nextShot turns it into a camera intent. Reduced motion pins the
// broadcast camera inside the scene, so no extra guard here.
// The intent object is reused across frames: nextShot fully rewrites it,
// and the feed runs on every render tick (no per-frame allocation).
const directorIntent: Parameters<typeof nextShot>[1] = {
  look: { x: 0, y: 0, z: 0 },
  radiusMult: 1,
  azimuthDelta: 0,
  elevationDelta: 0,
  cut: false,
}
staging.setDirectorHandler((ctx) =>
  scene.applyDirectorIntent(nextShot(ctx, directorIntent)),
)

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

// The live cup: prepareCup opens the bracket view, rival matches reveal
// at their own pace, the player's branch resolves live in the arena, and
// finalizeCup lands the rewards. Nothing here re-resolves the sim — every
// state adoption flows through the store (persist + hud/spar/cup fanout).
const cup = createCup(
  app,
  {
    onFightStart: enterArena,
    onStep: (step, instant) => staging.applyStep(step, instant),
    onPace: (msPerStep) => staging.setPace(msPerStep),
    onArenaExit: exitArena,
    // The first arena fight consumes the cup (endCup flips the phase) —
    // adopted through the store so a mid-cup refresh keeps the commitment.
    onCommit: (next) => {
      store.commit(next)
    },
    // Results are in and finalizeCup applied the rewards — the store's fixed
    // fanout updates hud/spar/cup; only the site-specific scene refresh is
    // added here.
    onFinalize: (next) => {
      // The cup is consumed: the persisted session must not resurrect —
      // clear it first so the finalize commit writes the cleared save.
      store.setSession(null)
      store.commit(next)
      // Conditions may carry the reward bump (mood/bond) — refresh the idle.
      sceneVisuals()
    },
    // Every session mutation rides the save (prepare, fight, forfeit,
    // completion) so a refresh anywhere in the walk resumes exactly here.
    onSession: (session) => {
      store.setSession(session)
    },
  },
  { restoredSession },
)

// The legacy flow (v10): a champion's send-off. The confirm modal leads to a
// ceremony (the evolution ceremony machinery, reused as a farewell), then the
// egg screen collects the successor's species and `graduate` hands the
// bloodline on. Nothing commits until the player picks — closing early keeps
// the champion.
const graduation = createGraduation(app, {
  onConfirm: () => {
    const state = store.get()
    const creature = state.creature
    if (!creature) return
    // Send-off: reuse the evolution ceremony as a farewell walk-to-center.
    // The egg screen opens when the scene reports the ceremony settled —
    // never on a timer, so a long walk can't be cut short and the reduced
    // path needs no special case (it settles a frame later).
    scene.startEvolutionCeremony(
      creature.archetypeId,
      visualSeedOf(creature.stats, creature.stage),
      creature.stage,
      () => {
        if (!store.get().creature) return
        graduation.showEggScreen(store.get())
      },
    )
  },
  onPick: (speciesId) => {
    const before = store.get()
    const retiree = before.creature
    if (!retiree) return
    const seed = Date.now() % 2 ** 31
    const result = graduate(before, speciesId, seed)
    if (!result.ok) return
    store.commit(result.state)
    graduation.close()
    syncScene()
    const successor = store.get().creature
    if (successor) {
      hud.announceGraduation(
        retiree.name,
        successor.name,
        store.get().lineage.generation,
      )
    }
  },
})

const hud = createHud(app, {
  onAdvanceDay: () => {
    // The ceremony is non-cancelable (FR2, 2026-10-10): HUD input applies
    // to the sim immediately but never interrupts the creature's motion.
    const stageBefore = store.get().creature?.stage
    store.commit(advanceDay(store.get()))
    const creature = store.get().creature
    const evolved =
      (stageBefore === "baby" && creature?.stage === "juvenile") ||
      (stageBefore === "juvenile" && creature?.stage === "champion")
    if (evolved && creature) {
      // Evolution moment (spec R5): the scene walks the creature to the
      // ranch center, swells, and swaps the rig for the next stage's build
      // at the pulse's peak — so the plain rebuild is skipped. The HUD
      // announces the stat gains while the ceremony plays. The visual seed
      // is unchanged (stage-aware), so the props stay put.
      const archetypeId =
        getSpecies(creature.speciesId)?.archetypeId ?? "draconic"
      sceneVisuals()
      scene.startEvolutionCeremony(
        archetypeId,
        visualSeedOf(creature.stats, creature.stage),
        creature.stage,
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
  onToggleArenaCamera: () => {
    toggleArenaCamera()
  },
  onRename: (name) => {
    const next = renameCreature(store.get(), name)
    if (!next.ok) return false
    store.commit(next.state)
    return true
  },
  onReset: () => {
    try {
      clearSave(storage)
    } finally {
      // Reload even if the wipe threw — a stranded player on a hidden
      // modal is worse than a save that survived one more boot.
      window.location.reload()
    }
  },
  onHintSeen: (hintId) => {
    store.commit(markHintSeen(store.get(), hintId))
  },
  onGraduate: () => graduation.openConfirm(store.get()),
  onOpenHallOfFame: () => graduation.openHallOfFame(store.get()),
})

// The store's fixed fanout: every commit persists (inside commit) and then
// updates the hud, the spar preview, and the cup chip — in that order —
// exactly like the old per-handler fanout did. Handlers only add their
// site-specific scene work on top.
store.subscribe((s) => hud.update(s))
store.subscribe((s) => spar.update(s.creature ?? null))
store.subscribe((s) => cup.update(s))
store.subscribe((s) => graduation.update(s))

// First run (or a migrated v1 save without a creature): offer the starter.
let starter = store.get().creature
  ? null
  : createStarterChoice(app, {
      onChoose: (speciesId) => {
        // Runtime seed: each new game rolls a distinct partner, and every
        // roll is reproducible from the saved state afterwards.
        const seed = Date.now() % 2 ** 31
        store.commit(chooseStarter(store.get(), speciesId, seed))
        corruptNotice?.remove()
        corruptNotice = null
        starter?.remove()
        starter = null
        syncScene()
      },
    })

syncScene()
hud.update(store.get())
spar.update(store.get().creature ?? null)
cup.update(store.get())

// ---------------------------------------------------------------------------
// Hidden-tab pause (F5)
//
// The browser stops painting a hidden tab but keeps firing its timers, so a
// fight carries on stepping behind the curtain and the player comes back to a
// bowl mid-punch. One reducer decides the runtime; the subscribers below stop
// drawing, stop effect time, and hold the playback chain exactly where it
// stood. Pausing is presentation-only — `advanceDay` is player-triggered, so
// there is no game clock to catch up and no outcome can change.
// ---------------------------------------------------------------------------
let runtime = initialRuntimeState()
const applyRuntime = (event: RuntimeEvent): void => {
  const next = runtimeState(runtime, event)
  if (next.renderLoop !== runtime.renderLoop) {
    const paused = next.renderLoop === "paused"
    scene.setPaused(paused)
    staging.setPaused(paused)
    spar.setPaused(paused)
    cup.setPaused(paused)
  }
  runtime = next
}
const onVisibility = (): void => {
  applyRuntime({
    kind: "visibility",
    status: document.hidden ? "hidden" : "visible",
  })
}
document.addEventListener("visibilitychange", onVisibility)
// A tab can be opened in the background: start parked rather than drawing a
// frame nobody sees.
if (document.hidden) onVisibility()
