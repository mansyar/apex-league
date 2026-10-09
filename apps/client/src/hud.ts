import type { GameState } from "@apex/sim"

export interface HudHandlers {
  onAdvanceDay: () => void
}

export interface Hud {
  update(state: GameState): void
}

/**
 * DOM HUD stub: day/phase/AP readout plus a dev "Advance Day" control.
 * Lives above the canvas; binds directly to the live sim state.
 */
export function createHud(root: HTMLElement, handlers: HudHandlers): Hud {
  const panel = document.createElement("div")
  panel.className = "hud"

  const title = document.createElement("div")
  title.className = "hud-title"
  title.textContent = "Apex League"

  const readout = document.createElement("div")
  readout.className = "hud-readout"

  const apRow = document.createElement("div")
  apRow.className = "hud-ap"

  const button = document.createElement("button")
  button.className = "hud-advance"
  button.textContent = "Advance Day"
  button.addEventListener("click", handlers.onAdvanceDay)

  panel.append(title, readout, apRow, button)
  root.appendChild(panel)

  const update = (state: GameState): void => {
    readout.textContent = `Day ${state.day} · ${
      state.phase === "cup" ? "Cup day" : "Day phase"
    }`
    apRow.textContent = `AP: ${"●".repeat(state.actionPoints)}${"○".repeat(
      Math.max(0, 3 - state.actionPoints),
    )}`
    button.textContent =
      state.phase === "cup" ? "Continue past cup" : "Advance Day"
  }

  return { update }
}
