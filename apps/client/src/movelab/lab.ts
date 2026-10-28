import type { PlaybackStep } from "@apex/sim"
import type { SceneHandle } from "../scene"
import type { Staging } from "../staging"
import type { Swap } from "../swap"
import { labMoveGroups } from "./catalog"
import { buildLabPanel, LAB_PACES } from "./panel"
import { LAB_CAST, type LabRange, labStepsFor } from "./steps"
import "./lab.css"

/**
 * Move Lab driver (elemental-identity FR-8): mounts the dev-only rig
 * that stages catalog moves directly — no sim, no AI, no audio cues,
 * no save writes. Seeds are fixed constants, so a trigger replays
 * deterministically. Pause/step reuse the staging clock
 * (`setPaused`); slow motion reuses pace scaling (`setPace`), which
 * stretches animations instead of cutting them.
 */

export interface MoveLabDeps {
  readonly app: HTMLElement
  readonly scene: SceneHandle
  readonly staging: Staging
  readonly swap: Swap
}

/** Fixed particle seeds used while the seeded toggle is on. */
const SEEDED_A = 11
const SEEDED_B = 23

/**
 * Apply the phone-width toggle through the same responsive path as a real
 * phone viewport. The scene's resize wiring (`scene/frame.ts`) only runs
 * on `window` resize events, reading the container's client size — a bare
 * body-class flip never fires one, so the camera aspect and renderer kept
 * their desktop size inside the narrowed shell (mis-framed arena with an
 * empty strip). Dispatching the resize after the class change reuses that
 * exact handler; the read forces layout, so the fresh 390px width applies.
 */
export function setLabPhoneWidth(on: boolean): void {
  document.body.classList.toggle("app-in-movelab-phone", on)
  window.dispatchEvent(new Event("resize"))
}

export function mountMoveLab(deps: MoveLabDeps): void {
  const { app, scene, staging, swap } = deps
  const groups = labMoveGroups()
  const refs = buildLabPanel(groups)
  app.append(refs.root)
  document.body.classList.add("app-in-movelab")
  app.classList.add("app-in-arena")
  scene.setRanchCreatureVisible(false)
  void swap.enterArena()

  let paceMs = LAB_PACES[0]?.msPerStep ?? 900
  let seedCounter = 101
  let lastSeeds = { attacker: SEEDED_A, defender: SEEDED_B }
  let queue: PlaybackStep[] = []
  let index = 0
  let label = ""
  let timers: number[] = []
  let paused = false

  const clearTimers = (): void => {
    for (const timer of timers) window.clearTimeout(timer)
    timers = []
  }
  const later = (fn: () => void, ms: number): void => {
    timers.push(window.setTimeout(fn, ms))
  }

  const seeds = (): { attacker: number; defender: number } => {
    if (refs.seeded.checked) return { attacker: SEEDED_A, defender: SEEDED_B }
    seedCounter += 2
    return { attacker: seedCounter, defender: seedCounter + 1 }
  }

  const cast = (pair: { attacker: number; defender: number }): void => {
    lastSeeds = pair
    staging.cast({
      owned: {
        key: LAB_CAST.attackerKey,
        name: LAB_CAST.attacker,
        archetypeId: refs.attacker.value,
        seed: pair.attacker,
      },
      rival: {
        key: LAB_CAST.defenderKey,
        name: LAB_CAST.defender,
        archetypeId: refs.defender.value,
        seed: pair.defender,
      },
    })
  }

  /** Stage step `index`, then keep the auto-advance chain on its gap. */
  const stage = (): void => {
    const step = queue[index]
    if (step === undefined) {
      refs.status.textContent = `${label}: impact staged.`
      return
    }
    index += 1
    staging.applyStep(step, false)
    if (index >= queue.length) {
      refs.status.textContent = `${label}: impact staged.`
      return
    }
    refs.status.textContent = `${label}: staged ${step.kind}.`
    const gap = step.kind === "projectile" ? paceMs * 2 : paceMs
    later(stage, gap)
  }

  const run = (steps: PlaybackStep[], runLabel: string): void => {
    clearTimers()
    queue = steps
    index = 0
    label = runLabel
    staging.setPaused(false)
    paused = false
    refs.pause.textContent = "Pause"
    stage()
  }

  const describe = (verb: string): string =>
    `${verb} ${refs.move.value} (${refs.range.value}, ${paceMs}ms/step, seeds ${lastSeeds.attacker}/${lastSeeds.defender})`

  refs.trigger.addEventListener("click", () => {
    cast(seeds())
    run(
      labStepsFor(refs.move.value, refs.range.value as LabRange),
      describe("Triggered"),
    )
  })
  refs.replay.addEventListener("click", () => {
    cast(lastSeeds)
    run(
      labStepsFor(refs.move.value, refs.range.value as LabRange),
      describe("Replayed"),
    )
  })
  refs.pause.addEventListener("click", () => {
    paused = !paused
    if (paused) {
      clearTimers()
      staging.setPaused(true)
      refs.pause.textContent = "Resume"
      refs.status.textContent = "Paused."
    } else {
      staging.setPaused(false)
      refs.pause.textContent = "Pause"
      if (index < queue.length) {
        refs.status.textContent = "Resumed."
        later(stage, paceMs)
      } else {
        refs.status.textContent = `${label}: impact staged.`
      }
    }
  })
  refs.step.addEventListener("click", () => {
    if (index >= queue.length) {
      refs.status.textContent = "Nothing left to step."
      return
    }
    clearTimers()
    staging.setPaused(true)
    paused = true
    refs.pause.textContent = "Resume"
    stage()
    // Hold the chain: stepping stages exactly one step, no auto-advance.
    clearTimers()
    const staged = queue[index - 1]
    if (index < queue.length && staged !== undefined) {
      refs.status.textContent = `${label}: stepped to ${staged.kind}.`
    }
  })
  refs.pace.addEventListener("change", () => {
    paceMs = Number(refs.pace.value)
    staging.setPace(paceMs)
  })
  refs.camera.addEventListener("change", () => {
    scene.setArenaCameraStyle(
      refs.camera.value as Parameters<SceneHandle["setArenaCameraStyle"]>[0],
    )
  })
  refs.phone.addEventListener("change", () => {
    setLabPhoneWidth(refs.phone.checked)
  })
  refs.attacker.addEventListener("change", () => cast(seeds()))
  refs.defender.addEventListener("change", () => cast(seeds()))

  staging.setPace(paceMs)
  cast(lastSeeds)
  refs.status.textContent = "Move Lab ready."
}
