import {
  chooseStarter,
  clearSave,
  createInitialState,
  loadBoot,
  readRawSave,
  saveGame,
} from "@apex/sim"
import { createArena } from "./app/arena"
import { createAudioWiring } from "./app/audio"
import { createHudScreen } from "./app/hud-screen"
import { BOOT_FAILURE_CAUSE, createRuntime } from "./app/runtime"
import { createSceneSync } from "./app/scene-sync"
import type { ScreenDeps } from "./app/screen-deps"
import {
  createCupScreen,
  createGraduationScreen,
  createSparScreen,
} from "./app/screens"
import { buildArena } from "./arena"
import { careCueForEvent } from "./audio/careCues"
import { timeoutSignal } from "./cloud/api"
import { createCloudSave } from "./cloud/cloud-save"
import { readCredentials } from "./cloud/credentials"
import { buildCloudPanel } from "./cloud/panel"
import { showFailurePlate } from "./failure-plate"
import { buildRecoveryModal, recoveryFileName } from "./recovery"
import { buildImportModal } from "./save-transfer"
import { createScene, type SceneHandle } from "./scene"
import { createStaging } from "./staging"
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
import "./cloud/cloud.css"

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
    onGraphics: (status) => runtime.apply({ kind: "graphics", status }),
    // Ambient pet (ranch_rituals_20261018 FR6): the scene only says a pet
    // reaction started; the pure cue table decides whether it is audible
    // (muted stays silent) and the player's gate handles the rest. On the
    // morning-after's ritual day the chirp carries the day's class: the
    // careCues table re-voices the pet per outcome (postcup_morning_after
    // FR-8) — no new assets, same gates.
    onPet: () => {
      const cue = careCueForEvent(
        {
          kind: "pet",
          morningAfter: store.pendingMorningAfter()?.class,
        },
        store.get().settings,
      )
      if (cue) audio.player.play(cue)
    },
  })
} catch (error) {
  console.error("boot failed", error)
  document.getElementById("boot-plate")?.remove()
  showFailurePlate(app, BOOT_FAILURE_CAUSE)
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

// The cloud, if this build has one (FR-11, AC-11). An unset origin is decided
// here, once, at construction: no cloud object, no adapter, no request, and
// the chip never exists — a local-only build is byte-for-byte the old client
// in behaviour. Boot stays local either way: `loadBoot` already ran above and
// the pull below is started only after the ranch has rendered (NFR-2).
const cloud = createCloudSave({
  origin: import.meta.env.VITE_API_ORIGIN,
  local: storage,
  now: () => Date.now(),
  schedule: (fn, ms) => window.setTimeout(fn, ms),
  cancel: (handle) => window.clearTimeout(handle as number),
  fetch: (input, init) => fetch(input, init),
  signal: timeoutSignal,
})

// The store is the single mutation path: handlers adopt a new state with
// commit(), which persists and notifies the hud/spar/cup subscribers in a
// fixed order — no handler hand-rolls that fanout anymore. The cup session
// (save v7) rides every save so a refresh mid-walk resumes exactly here.
const store = createGameStore(
  saved?.state ?? createInitialState(),
  // Behind the same autosave (FR-5): the cloud adapter writes through to
  // localStorage and queues the push; the read path never leaves the device.
  cloud?.adapter ?? storage,
  {
    onPersistError: () => hud.announceSaveFailure(),
    initialSession: restoredSession,
  },
)

// Scene sync first: the camera preference and the creature rebuild the
// screens and the starter overlay both lean on.
const sceneSync = createSceneSync(scene, store)
sceneSync.applyCameraStyle()

// Arena entry/exit choreography, shared by the spar and the cup; the beds
// arrive after these hooks (they are only touched when a fight starts).
const arenaEntry = createArena({
  app,
  scene,
  staging,
  swap,
  store,
  getBeds: () => audio.beds,
})

// Audio: player, beds, first-gesture unlock and the step-cue bridge.
const audio = createAudioWiring(store)

const screenDeps: ScreenDeps = {
  app,
  store,
  audio,
  arena: arenaEntry,
  scene,
  sceneSync,
  staging,
}

// The spar (with its arena hand-off), then the arena's presentation layer
// (hit vignette + director hook), then the reduced-motion hand-off — the
// order the inline blocks held.
const spar = createSparScreen(screenDeps)
arenaEntry.wirePresentation()
arenaEntry.applyMotionPref()

// The live cup, the graduation flow and the care HUD, each built from the
// same dependencies in the original boot order.
const cup = createCupScreen({ ...screenDeps, restoredSession })
const graduation = createGraduationScreen({
  ...screenDeps,
  getHud: () => hud,
})

const importModal = buildImportModal((data) => {
  if (saveGame(storage, data.state, data.savedAt, null)) {
    window.location.reload()
    return
  }
  hud.noticeSettings("Couldn't write that save — try again.", true)
})

// The trainer surface (FR-8, FR-11): trainer id, passphrase, sign-in, and the
// quiet sync line. Built only when this build has a cloud, and its credentials
// are read from their own key beside the save — never from inside it, because
// a save is exported and shared (save-transfer.ts).
const cloudPanel = cloud
  ? buildCloudPanel({
      sync: cloud.sync,
      credentials: () => readCredentials(storage),
    })
  : null

const hud = createHudScreen({
  ...screenDeps,
  graduation,
  storage,
  askImport: (data) => importModal.ask(data),
  extraChips: cloudPanel ? [cloudPanel.chip] : undefined,
})

// Appended after the HUD so the replace-save dialog stacks above Settings
// (both are kit-modals at the same z-index; DOM order wins).
app.append(importModal.root)

if (cloudPanel && cloud) {
  // Appended last so the trainer card stacks above every other overlay.
  app.append(cloudPanel.root)
  cloud.sync.subscribe((status) => cloudPanel.paint(status))
  cloudPanel.paint(cloud.sync.status())
}

// The store's fixed fanout: every commit persists (inside commit) and then
// updates the hud, the spar preview, and the cup chip — in that order —
// exactly like the old per-handler fanout did. Handlers only add their
// site-specific scene work on top.
store.subscribe((s) => hud.update(s))
store.subscribe((s) => spar.update(s.creature ?? null))
store.subscribe((s) => cup.update(s))
store.subscribe((s) => audio.player.setMuted(s.settings.muted))
store.subscribe((s) =>
  audio.player.setVolumes({
    music: s.settings.musicVolume,
    sfx: s.settings.sfxVolume,
  }),
)
store.subscribe((s) => audio.beds.setMuted(s.settings.muted))
store.subscribe((s) => audio.beds.setVolume(s.settings.musicVolume))
store.subscribe((s) => graduation.update(s))

// Subscribers fire on commits, not at registration: apply the persisted mix
// once so a reload starts at the saved levels.
audio.player.setVolumes({
  music: store.get().settings.musicVolume,
  sfx: store.get().settings.sfxVolume,
})
audio.beds.setVolume(store.get().settings.musicVolume)

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
        sceneSync.syncScene()
      },
    })

sceneSync.syncScene()
hud.update(store.get())
spar.update(store.get().creature ?? null)
cup.update(store.get())

// Adoption (FR-4, AC-4): a cloud copy that is newer than the local one is
// adopted through the store — the same instance every subscriber already
// holds — so the ranch repaints instead of being rebuilt. Adoption is one-way
// and only ever fires from `sync`, which refuses to adopt anything older than
// the local copy (AC-7). A first-run starter card folds away with it.
cloud?.sync.adoptWith((data) => {
  const session =
    data.session && data.session.bracket.day === data.state.day
      ? data.session
      : null
  store.replaceState(data.state, session)
  starter?.remove()
  starter = null
  sceneSync.syncScene()
})

// The pull happens here, after the ranch is on screen from the local save:
// nothing above this line waited on the network (NFR-2, AC-8).
void cloud?.sync.start()

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
const runtime = createRuntime({ app, scene, staging, spar, cup })
