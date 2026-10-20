import type { GameState } from "@apex/sim"
import { selectHint } from "./copy-cup"
import { buildCallout } from "./plates"
import type { HudHints } from "./types"

/**
 * Onboarding hints: the callout plate plus the seen-hints hand-off.
 * `selectHint` decides which line's moment is now; this module owns the one
 * piece of state the plates cannot — the id currently on screen — so a
 * dismissal reaches the sim exactly once and a hint never asks twice.
 */
export function createHints(onHintSeen: (hintId: string) => void): HudHints {
  let shownHintId: string | null = null
  // Onboarding callouts (save v7): coach-voice nudges that appear once at
  // the moment they matter, then never again — dismissal persists in
  // settings.seenHints.
  const { root, text } = buildCallout({
    onDismiss: () => {
      if (shownHintId) onHintSeen(shownHintId)
      shownHintId = null
    },
  })
  return {
    root,
    sync(state: GameState) {
      // First match wins — the table's order is the teaching order.
      const seen = new Set(state.settings.seenHints)
      const active = selectHint(state, seen)
      if (active && active.id !== shownHintId) {
        shownHintId = active.id
        text.textContent = active.text
        root.style.display = ""
      } else if (!active && shownHintId !== null) {
        shownHintId = null
        root.style.display = "none"
      }
    },
  }
}
