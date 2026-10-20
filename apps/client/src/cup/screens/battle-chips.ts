/**
 * The battle chrome (cup_modules_per_screen split): the speed pill floating
 * over the arena during a fight. Moved verbatim from cup-screens.ts.
 */

/** The battle chrome: speed pill floating over the arena during a fight. */
export function buildBattleChips(): {
  battleChips: HTMLElement
  fastButton: HTMLButtonElement
} {
  const battleChips = document.createElement("div")
  battleChips.className = "cup-battle-chips"
  battleChips.style.display = "none"
  const fastButton = document.createElement("button")
  fastButton.type = "button"
  fastButton.className = "cup-speed"
  battleChips.append(fastButton)
  return { battleChips, fastButton }
}
