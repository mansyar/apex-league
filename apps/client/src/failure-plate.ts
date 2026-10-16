/**
 * The graphics-failure surface (F7): one plate, one cause, one recovery.
 *
 * Built from the shared broadcast kit — no new dependency — and shown both at
 * boot (WebGL unavailable) and at runtime (a lost context, a throwing resumed
 * frame). The cause is one plain-language sentence; the only affordance is
 * Reload, focused on show so the plate is operable from the keyboard the
 * moment it appears. There is no dismiss: the game behind the plate is not
 * playable.
 */

const PLATE_CLASS = "failure-plate"

/**
 * Take the plate down — a context restore put the game back on its feet and
 * the reducer returned to the "game" surface.
 */
export function hideFailurePlate(container: HTMLElement): void {
  container.querySelector(`.${PLATE_CLASS}`)?.remove()
}

/**
 * Show (or update) the failure plate inside `container`. Repeated calls
 * update the cause instead of stacking plates — a failure that repeats says
 * the same thing louder, not twice.
 */
export function showFailurePlate(container: HTMLElement, cause: string): void {
  let plate = container.querySelector<HTMLDivElement>(`.${PLATE_CLASS}`)
  if (!plate) {
    plate = document.createElement("div")
    plate.className = PLATE_CLASS
    plate.setAttribute("role", "alert")
    const message = document.createElement("p")
    message.className = "failure-cause"
    const reload = document.createElement("button")
    reload.type = "button"
    reload.className = "kit-chip is-accent"
    reload.textContent = "Reload"
    reload.addEventListener("click", () => window.location.reload())
    plate.append(message, reload)
    container.append(plate)
    // Keyboard reachability: the plate's single action is where focus lands.
    reload.focus()
  }
  const message = plate.querySelector<HTMLParagraphElement>(".failure-cause")
  if (message) message.textContent = cause
}
