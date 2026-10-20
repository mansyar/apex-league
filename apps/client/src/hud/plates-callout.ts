import { chip } from "../ui/kit"

/** The onboarding-callout elements the hint selection writes into. */
export interface CalloutRefs {
  root: HTMLElement
  text: HTMLElement
}

/**
 * The onboarding callout (kit plate, lower-center): a coach line with a
 * "Got it" chip. Dismissal is the caller's business — it owns the
 * seen-hints ledger.
 */
export function buildCallout(opts: { onDismiss: () => void }): CalloutRefs {
  const root = document.createElement("div")
  root.className = "kit-plate hud-callout"
  root.style.display = "none"
  const text = document.createElement("p")
  text.className = "hud-callout-text"
  const ok = chip({
    label: "Got it",
    variant: "accent",
    onClick: () => {
      opts.onDismiss()
      root.style.display = "none"
    },
  })
  root.append(text, ok)
  return { root, text }
}
