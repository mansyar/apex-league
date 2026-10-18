import {
  advanceDay,
  assignTraining,
  buildSaveExport,
  type CareAction,
  canBreed,
  careAction,
  chooseStarter,
  clearLoadout,
  clearSave,
  createInitialState,
  getSpecies,
  graduate,
  graduateWithPair,
  inspectSaveImport,
  loadBoot,
  markHintSeen,
  type PlaybackStep,
  readRawSave,
  renameCreature,
  type StatKey,
  saveGame,
  setArenaCamera,
  setLoadout,
  setMusicVolume,
  setMuted,
  setReducedMotion,
  setSfxVolume,
} from "@apex/sim"
import { buildArena } from "./arena"
import { careCueForEvent } from "./audio/careCues"
import { cueForStep } from "./audio/cues"
import { MusicBeds } from "./audio/musicBeds"
import { playCue } from "./audio/playCue"
import { AudioPlayer } from "./audio/player"
import { createCup } from "./cup"
import { nextShot } from "./director"
import { hideFailurePlate, showFailurePlate } from "./failure-plate"
import { createGraduation } from "./graduation"
import { createHud } from "./hud"
import {
  type GraphicsHealth,
  initialRuntimeState,
  type RuntimeEvent,
  runtimeState,
} from "./lifecycle"
import { resolveMotionPref } from "./motion"
import { buildRecoveryModal, recoveryFileName } from "./recovery"
import {
  buildImportModal,
  importBlocked,
  transferNotice,
} from "./save-transfer"
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
import "./nursery.css"
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
  scene = createScene(app, {
    // The scene reports graphics health; the reducer below decides what the
    // player sees and whether the loop spins (F7).
    onGraphics: (status) => applyRuntime({ kind: "graphics", status }),
    // Ambient pet (ranch_rituals_20261018 FR6): the scene only says a pet
    // reaction started; the pure cue table decides whether it is audible
    // (muted stays silent) and the player's gate handles the rest.
    onPet: () => {
      const cue = careCueForEvent({ kind: "pet" }, store.get().settings)
      if (cue) audioPlayer.play(cue)
    },
  })
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
// A corrupt save opens a blocking recovery dialog instead of a banner: keep
// the bytes downloadable, and never let the starter picker overwrite them
// before the player explicitly chooses to start over.
const corruptBoot = boot !== null && "corrupt" in boot
const recovery = buildRecoveryModal({
  onDownload: () => {
    const raw = readRawSave(storage)
    if (raw === null) return false
    const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    )
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = recoveryFileName(new Date())
    anchor.click()
    URL.revokeObjectURL(url)
    return true
  },
  onReset: () => {
    try {
      clearSave(storage)
    } finally {
      window.location.reload()
    }
  },
})
app.append(recovery.root)
if (corruptBoot) recovery.open()
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
  // The arena bed takes over from the ranch loop while the bowl plays.
  beds.setScene("arena")
  // Broadcast clarity: the ranch HUD stands down while the bowl plays.
  app.classList.add("app-in-arena")
}
const exitArena = (): void => {
  scene.setRanchCreatureVisible(true)
  void swap.exitArena()
  staging.clear()
  // Back to the ranch loop on the way out.
  beds.setScene("ranch")
  app.classList.remove("app-in-arena")
}

// Battle audio (audio_foundation_20261017 FR3): the pure cue table gates
// every playback step, the player holds the unlock/mute gate, and playCue
// voices the bundled CC0 assets. Unlock waits for the first gesture
// (autoplay policy); the persisted mute rides the store fanout; instant
// reduced-motion dumps stay silent by design.
const audioPlayer = new AudioPlayer(playCue)
// Music beds: ranch loop by default, crossfaded to the arena loop by the
// shared enter/exit choreography, faded out while muted.
const beds = new MusicBeds()
beds.setScene("ranch")
const unlockAudio = (): void => {
  audioPlayer.unlock()
  beds.resume() // the boot-time play() may have been autoplay-rejected
}
window.addEventListener("pointerdown", unlockAudio, { once: true })
window.addEventListener("keydown", unlockAudio, { once: true })
const playStepCue = (step: PlaybackStep, instant: boolean): void => {
  if (instant) return // dump mode: no sound
  const { settings } = store.get()
  const cue = cueForStep(step, settings)
  if (cue) audioPlayer.play(cue)
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
  onStep: (step, instant) => {
    playStepCue(step, instant)
    staging.applyStep(step, instant)
  },
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
    onStep: (step, instant) => {
      playStepCue(step, instant)
      staging.applyStep(step, instant)
    },
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
        const state = store.get()
        if (!state.creature) return
        // A line with at least one archived champion can pair the retiree
        // with the Hall; the founder still gets the free starter choice.
        if (canBreed(state)) graduation.showNursery(state)
        else graduation.showEggScreen(state)
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
  onHatch: (generations, speciesId, seed) => {
    const before = store.get()
    const retiree = before.creature
    if (!retiree) return
    const result = graduateWithPair(before, generations, speciesId, seed)
    if (!result.ok) {
      graduation.rejectHatch(result.reason)
      return
    }
    store.commit(result.state)
    graduation.close()
    syncScene()
    // The Nursery's opener (the Graduate action) is gone after a succession;
    // hand focus to the rebuilt partner plate so keyboard users land on the
    // new creature instead of <body>.
    document.querySelector<HTMLButtonElement>(".creature-head")?.focus()
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

const importModal = buildImportModal((data) => {
  if (saveGame(storage, data.state, data.savedAt, null)) {
    window.location.reload()
    return
  }
  hud.noticeSettings("Couldn't write that save — try again.", true)
})

const hud = createHud(app, {
  onAdvanceDay: () => {
    // The ceremony is non-cancelable (FR2, 2026-10-10): HUD input applies
    // to the sim immediately but never interrupts the creature's motion.
    const stageBefore = store.get().creature?.stage
    store.commit(advanceDay(store.get()))
    // Dawn chime (ranch_rituals_20261018 FR5): the day-break punctuation,
    // gated by the same pure table (muted stays silent).
    const dawn = careCueForEvent({ kind: "dawn" }, store.get().settings)
    if (dawn) audioPlayer.play(dawn)
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
    // Care SFX (ranch_rituals_20261018 FR5): the pure table decides — muted
    // stays silent — and the player's gate + silent degradation do the rest.
    const cue = careCueForEvent({ kind: "care", action }, store.get().settings)
    if (cue) audioPlayer.play(cue)
    // Feed toggles the food pile; conditions drive the mood idle.
    sceneVisuals()
    // Ceremony is visual feedback for an already-committed action, so it
    // starts only after the sim confirms the feed succeeded. The pile is
    // visible immediately; successive feeds re-trigger cleanly.
    if (action === "feed") scene.startFeedCeremony()
    if (action === "rest") scene.startRestCeremony()
    if (action === "treat") scene.startTreatCeremony()
    if (action === "play") scene.startPlayCeremony()
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
  onToggleMuted: () => {
    const current = store.get()
    store.commit(setMuted(current, !current.settings.muted))
  },
  onVolume: (bus, value, commit) => {
    const current = store.get()
    // Audition live while the slider moves; only a release persists.
    audioPlayer.setVolumes({
      music: bus === "music" ? value : current.settings.musicVolume,
      sfx: bus === "sfx" ? value : current.settings.sfxVolume,
    })
    if (bus === "music") beds.setVolume(value)
    if (!commit) return
    store.commit(
      bus === "music"
        ? setMusicVolume(current, value)
        : setSfxVolume(current, value),
    )
  },
  onDownloadSave: () => {
    const { filename, json } = buildSaveExport(store.get())
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    )
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
    hud.noticeSettings(`Downloaded ${filename}`)
  },
  onImportFile: async (file) => {
    let raw: string
    try {
      raw = await file.text()
    } catch {
      hud.noticeSettings(transferNotice("malformed"), true)
      return
    }
    const result = inspectSaveImport(raw)
    if (!result.ok) {
      hud.noticeSettings(transferNotice(result.reason), true)
      return
    }
    importModal.ask(result.data)
  },
  isImportBlocked: () => importBlocked(store.getSession()),
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

// Appended after the HUD so the replace-save dialog stacks above Settings
// (both are kit-modals at the same z-index; DOM order wins).
app.append(importModal.root)

// The store's fixed fanout: every commit persists (inside commit) and then
// updates the hud, the spar preview, and the cup chip — in that order —
// exactly like the old per-handler fanout did. Handlers only add their
// site-specific scene work on top.
store.subscribe((s) => hud.update(s))
store.subscribe((s) => spar.update(s.creature ?? null))
store.subscribe((s) => cup.update(s))
store.subscribe((s) => audioPlayer.setMuted(s.settings.muted))
store.subscribe((s) =>
  audioPlayer.setVolumes({
    music: s.settings.musicVolume,
    sfx: s.settings.sfxVolume,
  }),
)
store.subscribe((s) => beds.setMuted(s.settings.muted))
store.subscribe((s) => beds.setVolume(s.settings.musicVolume))
store.subscribe((s) => graduation.update(s))

// Subscribers fire on commits, not at registration: apply the persisted mix
// once so a reload starts at the saved levels.
audioPlayer.setVolumes({
  music: store.get().settings.musicVolume,
  sfx: store.get().settings.sfxVolume,
})
beds.setVolume(store.get().settings.musicVolume)

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
/** The sentence the plate shows; a held restore keeps the last failure's. */
let plateCause =
  "3D graphics didn't start, so the ranch can't load. Reload to try again."
const GRAPHICS_CAUSE: Record<GraphicsHealth, string> = {
  ok: plateCause,
  unavailable: plateCause,
  lost: "The 3D graphics context was lost mid-game. Reload to restart the ranch.",
  frame_error:
    "The ranch hit a graphics error it couldn't recover from. Reload to restart.",
}
const applyRuntime = (event: RuntimeEvent): void => {
  const next = runtimeState(runtime, event)
  if (next.graphics !== "ok") plateCause = GRAPHICS_CAUSE[next.graphics]
  // The failure surface is the plate: up while unhealthy, down the moment a
  // restore puts the game back on its feet.
  if (next.surface !== runtime.surface) {
    if (next.surface === "plate") showFailurePlate(app, plateCause)
    else hideFailurePlate(app)
  }
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
