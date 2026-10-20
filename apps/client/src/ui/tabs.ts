/**
 * One accessible tablist for every modal. The Coach's Handbook proved the
 * pattern and the detail modal shares it, so the wrap rules, the roving
 * tabindex and the `aria-selected` bookkeeping live here once.
 *
 * `nextTabIndex` is pure so the movement rules stay testable without a DOM.
 * `createTabs` owns only the elements it makes: no global listeners, no
 * timers, and no styling beyond the `is-outline` hook for inactive tabs.
 */

export type TabSpec = {
  label: string
  build?: (panel: HTMLElement) => void
}

export type TabsOptions = {
  ariaLabel: string
  idPrefix: string
  tabs: TabSpec[]
  onSelect?: (index: number) => void
}

export type Tabs = {
  tablist: HTMLElement
  panels: HTMLElement[]
  select: (index: number) => void
  selected: () => number
}

/** Keys that move the tab selection; everything else (Tab, Space) is left alone. */
const NAV_KEYS = new Set(["ArrowLeft", "ArrowRight", "Home", "End"])

/**
 * Where a navigation key lands from `current`, wrapping at both ends. An
 * out-of-range current index clamps, and an empty list has no valid index.
 */
export function nextTabIndex(
  current: number,
  key: string,
  count: number,
): number {
  if (count <= 0) return -1
  const index = Math.min(Math.max(current, 0), count - 1)
  if (key === "ArrowRight") return (index + 1) % count
  if (key === "ArrowLeft") return (index - 1 + count) % count
  if (key === "Home") return 0
  if (key === "End") return count - 1
  return index
}

/**
 * Build a `tablist`, one `tab` per entry and one `tabpanel` per entry, wired
 * together by ids. The first tab is active on construction; panels are handed
 * to the caller, which places them in its own layout.
 */
export function createTabs(options: TabsOptions): Tabs {
  const { ariaLabel, idPrefix, tabs, onSelect } = options
  const tablist = document.createElement("div")
  tablist.setAttribute("role", "tablist")
  tablist.setAttribute("aria-label", ariaLabel)

  const buttons: HTMLButtonElement[] = []
  const panels: HTMLElement[] = []
  tabs.forEach((tab, index) => {
    const button = document.createElement("button")
    button.type = "button"
    button.id = `${idPrefix}-tab-${index}`
    button.setAttribute("role", "tab")
    button.setAttribute("aria-controls", `${idPrefix}-panel-${index}`)
    button.textContent = tab.label
    button.addEventListener("click", () => select(index))
    tablist.append(button)
    buttons.push(button)

    const panel = document.createElement("div")
    panel.id = `${idPrefix}-panel-${index}`
    panel.setAttribute("role", "tabpanel")
    panel.setAttribute("aria-labelledby", `${idPrefix}-tab-${index}`)
    tab.build?.(panel)
    panels.push(panel)
  })

  let current = -1

  /** Selection state only — used for the first paint, which takes no focus. */
  function paint(active: number): void {
    for (let i = 0; i < buttons.length; i += 1) {
      const on = i === active
      const button = buttons[i]
      const panel = panels[i]
      if (!button || !panel) continue
      button.setAttribute("aria-selected", on ? "true" : "false")
      button.tabIndex = on ? 0 : -1
      button.classList.toggle("is-outline", !on)
      panel.hidden = !on
    }
  }

  /** Activate a tab, move focus to it, then let the caller repaint the page. */
  function select(index: number): void {
    if (buttons.length === 0) return
    const active = Math.min(Math.max(index, 0), buttons.length - 1)
    paint(active)
    current = active
    buttons[active]?.focus()
    onSelect?.(active)
  }

  tablist.addEventListener("keydown", (event) => {
    if (!NAV_KEYS.has(event.key)) return
    event.preventDefault()
    select(nextTabIndex(current, event.key, buttons.length))
  })

  if (buttons.length > 0) {
    paint(0)
    current = 0
  }

  return { tablist, panels, select, selected: () => current }
}
