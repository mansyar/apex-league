import type { LabElementGroup } from "./catalog"
import type { LabRange } from "./steps"

/**
 * Move Lab panel (elemental-identity FR-8): presentational DOM only.
 * The driver in `lab.ts` wires the controls; this module builds them
 * so both files stay well under the repo's module-size cap.
 */

/** One voxel archetype choice for the attacker/defender pickers. */
export interface LabFighterOption {
  readonly archetypeId: string
  readonly label: string
}

export const LAB_FIGHTER_OPTIONS: readonly LabFighterOption[] = [
  { archetypeId: "draconic", label: "Ember Drake" },
  { archetypeId: "bovine", label: "Bramble Ox" },
  { archetypeId: "axolotl", label: "Tide Axolotl" },
  { archetypeId: "storm_hound", label: "Storm Hound" },
  { archetypeId: "frond", label: "Whistlefern" },
  { archetypeId: "falcon", label: "Zephyr Falcon" },
  { archetypeId: "crab", label: "Coral Claw" },
  { archetypeId: "tortoise", label: "Basalt Tortoise" },
  { archetypeId: "smolder", label: "Moor Cinder" },
]

export const LAB_RANGES: readonly LabRange[] = ["far", "close", "point-blank"]

/** Slow-motion paces as ms-per-step (the `Normal` staging pace is 900). */
export const LAB_PACES: readonly { label: string; msPerStep: number }[] = [
  { label: "1×", msPerStep: 900 },
  { label: "0.5×", msPerStep: 1800 },
  { label: "0.25×", msPerStep: 3600 },
  { label: "0.1×", msPerStep: 9000 },
]

export const LAB_CAMERAS: readonly { label: string; style: string }[] = [
  { label: "Broadcast", style: "broadcast" },
  { label: "Cinematic", style: "cinematic" },
]

export interface LabPanelRefs {
  readonly root: HTMLElement
  readonly attacker: HTMLSelectElement
  readonly defender: HTMLSelectElement
  readonly move: HTMLSelectElement
  readonly range: HTMLSelectElement
  readonly pace: HTMLSelectElement
  readonly camera: HTMLSelectElement
  readonly seeded: HTMLInputElement
  readonly phone: HTMLInputElement
  readonly trigger: HTMLButtonElement
  readonly replay: HTMLButtonElement
  readonly pause: HTMLButtonElement
  readonly step: HTMLButtonElement
  readonly status: HTMLElement
}

function labeled(
  panel: HTMLElement,
  testId: string,
  label: string,
  control: HTMLElement,
): void {
  const wrap = document.createElement("label")
  wrap.className = "movelab-row"
  wrap.dataset.testid = testId
  const span = document.createElement("span")
  span.className = "movelab-label"
  span.textContent = label
  wrap.append(span, control)
  panel.append(wrap)
}

function fighterSelect(testId: string, selected: string): HTMLSelectElement {
  const select = document.createElement("select")
  select.dataset.testid = testId
  for (const option of LAB_FIGHTER_OPTIONS) {
    const el = document.createElement("option")
    el.value = option.archetypeId
    el.textContent = option.label
    if (option.archetypeId === selected) el.selected = true
    select.append(el)
  }
  return select
}

/** Build the lab control panel; the driver owns behavior. */
export function buildLabPanel(
  groups: readonly LabElementGroup[],
): LabPanelRefs {
  const root = document.createElement("aside")
  root.className = "movelab-panel"
  root.dataset.testid = "movelab-panel"

  const title = document.createElement("h2")
  title.className = "movelab-title"
  title.textContent = "Move Lab"
  root.append(title)

  const attacker = fighterSelect("movelab-attacker", "draconic")
  labeled(root, "movelab-attacker", "Attacker", attacker)
  const defender = fighterSelect("movelab-defender", "bovine")
  labeled(root, "movelab-defender", "Defender", defender)

  const move = document.createElement("select")
  move.dataset.testid = "movelab-move"
  for (const group of groups) {
    const optgroup = document.createElement("optgroup")
    const bespoke = group.moves.filter((m) => m.bespoke).length
    optgroup.label = `${group.element} · bespoke ${bespoke}/${group.moves.length}`
    for (const entry of group.moves) {
      const el = document.createElement("option")
      el.value = entry.id
      el.textContent = `${entry.displayName} ${entry.bespoke ? "●" : "○ fallback"}`
      optgroup.append(el)
    }
    move.append(optgroup)
  }
  labeled(root, "movelab-move", "Move", move)

  const range = document.createElement("select")
  range.dataset.testid = "movelab-range"
  for (const id of LAB_RANGES) {
    const el = document.createElement("option")
    el.value = id
    el.textContent = id
    range.append(el)
  }
  labeled(root, "movelab-range", "Range", range)

  const pace = document.createElement("select")
  pace.dataset.testid = "movelab-pace"
  for (const { label, msPerStep } of LAB_PACES) {
    const el = document.createElement("option")
    el.value = String(msPerStep)
    el.textContent = label
    pace.append(el)
  }
  labeled(root, "movelab-pace", "Speed", pace)

  const camera = document.createElement("select")
  camera.dataset.testid = "movelab-camera"
  for (const { label, style } of LAB_CAMERAS) {
    const el = document.createElement("option")
    el.value = style
    el.textContent = label
    camera.append(el)
  }
  labeled(root, "movelab-camera", "Camera", camera)

  const seeded = document.createElement("input")
  seeded.type = "checkbox"
  seeded.checked = true
  seeded.dataset.testid = "movelab-seed"
  labeled(root, "movelab-seed", "Seeded particles", seeded)

  const phone = document.createElement("input")
  phone.type = "checkbox"
  phone.dataset.testid = "movelab-phone"
  labeled(root, "movelab-phone", "Phone width", phone)

  const buttons = document.createElement("div")
  buttons.className = "movelab-buttons"
  const trigger = document.createElement("button")
  trigger.textContent = "Trigger"
  trigger.dataset.testid = "movelab-trigger"
  const replay = document.createElement("button")
  replay.textContent = "Replay"
  replay.dataset.testid = "movelab-replay"
  const pause = document.createElement("button")
  pause.textContent = "Pause"
  pause.dataset.testid = "movelab-pause"
  const step = document.createElement("button")
  step.textContent = "Step"
  step.dataset.testid = "movelab-step"
  buttons.append(trigger, replay, pause, step)
  root.append(buttons)

  const status = document.createElement("p")
  status.className = "movelab-status"
  status.dataset.testid = "movelab-status"
  status.textContent = "Move Lab ready."
  root.append(status)

  return {
    root,
    attacker,
    defender,
    move,
    range,
    pace,
    camera,
    seeded,
    phone,
    trigger,
    replay,
    pause,
    step,
    status,
  }
}
