/**
 * Shared tab controller (detail_modal_tabs Phase 1: FR-6, FR-7, NFR-2).
 *
 * The repo has no DOM harness, so the controller is exercised against the
 * small slice of the DOM it actually uses: create, ids/attributes, classes,
 * `hidden`, `tabIndex`, listeners, and focus. The stubbed document is installed
 * for this file only and removed again in `afterAll`.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { createTabs, nextTabIndex, type Tabs, type TabsOptions } from "./tabs"

type Listener = (event: unknown) => void

/** The element shape `createTabs` touches — and nothing more. */
class FakeElement {
  readonly tag: string
  hidden = false
  tabIndex = -1
  type = ""
  id = ""
  textContent = ""
  focused = false
  readonly attributes: Record<string, string> = {}
  readonly children: FakeElement[] = []
  private readonly classNames = new Set<string>()
  private readonly listeners = new Map<string, Listener[]>()

  constructor(tag: string) {
    this.tag = tag
  }

  get className(): string {
    return [...this.classNames].join(" ")
  }

  set className(value: string) {
    this.classNames.clear()
    for (const name of value.split(/\s+/)) {
      if (name) this.classNames.add(name)
    }
  }

  readonly classList = {
    add: (...names: string[]): void => {
      for (const name of names) this.classNames.add(name)
    },
    remove: (...names: string[]): void => {
      for (const name of names) this.classNames.delete(name)
    },
    contains: (name: string): boolean => this.classNames.has(name),
    toggle: (name: string, force?: boolean): boolean => {
      const on = force ?? !this.classNames.has(name)
      if (on) this.classNames.add(name)
      else this.classNames.delete(name)
      return on
    },
  }

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes)
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null
  }

  addEventListener(type: string, handler: Listener): void {
    const handlers = this.listeners.get(type) ?? []
    handlers.push(handler)
    this.listeners.set(type, handlers)
  }

  focus(): void {
    this.focused = true
  }

  /** Deliver `event` to the handlers registered for `type` — the only way in. */
  fire(type: string, event: unknown): void {
    for (const handler of this.listeners.get(type) ?? []) handler(event)
  }
}

const realDocument = Object.getOwnPropertyDescriptor(globalThis, "document")

beforeAll(() => {
  Object.defineProperty(globalThis, "document", {
    value: { createElement: (tag: string) => new FakeElement(tag) },
    configurable: true,
    writable: true,
  })
})

afterAll(() => {
  if (realDocument) {
    Object.defineProperty(globalThis, "document", realDocument)
  } else {
    Reflect.deleteProperty(globalThis, "document")
  }
})

function fakeOf(node: HTMLElement): FakeElement {
  return node as unknown as FakeElement
}

function at<T>(list: readonly T[], index: number): T {
  const item = list[index]
  if (item === undefined) throw new Error(`nothing at index ${index}`)
  return item
}

interface Built {
  tabs: Tabs
  tablist: FakeElement
  buttons: FakeElement[]
  panels: FakeElement[]
}

function build(overrides: Partial<TabsOptions> = {}): Built {
  const tabs = createTabs({
    ariaLabel: "Detail pages",
    idPrefix: "detail",
    tabs: [{ label: "Stats" }, { label: "Growth" }, { label: "Moves" }],
    ...overrides,
  })
  const tablist = fakeOf(tabs.tablist)
  const panels = tabs.panels.map(fakeOf)
  // Panels are handed to the caller, so the tablist holds exactly the tabs.
  return { tabs, tablist, buttons: tablist.children, panels }
}

/** Fire a keydown on the tablist; returns whether it was prevented. */
function press(tablist: FakeElement, key: string): boolean {
  let prevented = false
  tablist.fire("keydown", {
    key,
    preventDefault: () => {
      prevented = true
    },
  })
  return prevented
}

function selectedFlags(buttons: FakeElement[]): string[] {
  return buttons.map((button) => button.attributes["aria-selected"] ?? "")
}

function outlineFlags(buttons: FakeElement[]): boolean[] {
  return buttons.map((button) => button.classList.contains("is-outline"))
}

describe("nextTabIndex", () => {
  test("ArrowRight advances and wraps from the last tab", () => {
    expect(nextTabIndex(0, "ArrowRight", 3)).toBe(1)
    expect(nextTabIndex(2, "ArrowRight", 3)).toBe(0)
  })

  test("ArrowLeft steps back and wraps from the first tab", () => {
    expect(nextTabIndex(2, "ArrowLeft", 3)).toBe(1)
    expect(nextTabIndex(0, "ArrowLeft", 3)).toBe(2)
  })

  test("Home and End jump to the ends", () => {
    expect(nextTabIndex(2, "Home", 3)).toBe(0)
    expect(nextTabIndex(1, "End", 3)).toBe(2)
  })

  test("a single tab wraps onto itself", () => {
    for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
      expect(nextTabIndex(0, key, 1)).toBe(0)
    }
  })

  test("a non-navigation key leaves the index alone", () => {
    for (const key of ["Tab", "Enter", " ", "Escape"]) {
      expect(nextTabIndex(1, key, 3)).toBe(1)
    }
  })

  test("an empty list has no index", () => {
    for (const key of ["ArrowLeft", "ArrowRight", "Home", "End", "Tab"]) {
      expect(nextTabIndex(0, key, 0)).toBe(-1)
    }
  })

  test("an out-of-range current index clamps before moving", () => {
    expect(nextTabIndex(9, "Tab", 3)).toBe(2)
    expect(nextTabIndex(-4, "Tab", 3)).toBe(0)
    expect(nextTabIndex(9, "ArrowRight", 3)).toBe(0)
  })
})

describe("createTabs", () => {
  test("wires the tablist, tabs and panels by id", () => {
    const { tablist, buttons, panels } = build()

    expect(tablist.tag).toBe("div")
    expect(tablist.attributes.role).toBe("tablist")
    expect(tablist.attributes["aria-label"]).toBe("Detail pages")
    expect(buttons).toHaveLength(3)
    expect(panels).toHaveLength(3)

    const labels = ["Stats", "Growth", "Moves"]
    buttons.forEach((button, index) => {
      expect(button.tag).toBe("button")
      expect(button.type).toBe("button")
      expect(button.attributes.role).toBe("tab")
      expect(button.attributes["aria-controls"]).toBe(`detail-panel-${index}`)
      expect(button.id).toBe(`detail-tab-${index}`)
      expect(button.textContent).toBe(at(labels, index))
    })
    panels.forEach((panel, index) => {
      expect(panel.attributes.role).toBe("tabpanel")
      expect(panel.attributes["aria-labelledby"]).toBe(`detail-tab-${index}`)
      expect(panel.id).toBe(`detail-panel-${index}`)
    })
  })

  test("starts on the first tab with one selected and one visible panel", () => {
    const { tablist, buttons, panels } = build()

    expect(selectedFlags(buttons)).toEqual(["true", "false", "false"])
    expect(buttons.map((button) => button.tabIndex)).toEqual([0, -1, -1])
    expect(outlineFlags(buttons)).toEqual([false, true, true])
    expect(panels.map((panel) => panel.hidden)).toEqual([false, true, true])
    // Construction paints state only: the modal decides where focus starts.
    expect(buttons.every((button) => !button.focused)).toBe(true)
    expect(tablist.children).toHaveLength(3)
  })

  test("runs each build once, in order, on its own panel", () => {
    const built: string[] = []
    const { panels } = build({
      tabs: [
        { label: "One", build: (panel) => built.push(panel.id) },
        { label: "Two", build: (panel) => built.push(panel.id) },
      ],
    })

    expect(built).toEqual(["detail-panel-0", "detail-panel-1"])
    expect(panels).toHaveLength(2)
  })

  test("a click selects the tab and calls onSelect with its index", () => {
    const picked: number[] = []
    const { tabs, buttons, panels } = build({ onSelect: (i) => picked.push(i) })
    expect(picked).toEqual([])

    at(buttons, 2).fire("click", {})

    expect(selectedFlags(buttons)).toEqual(["false", "false", "true"])
    expect(panels.map((panel) => panel.hidden)).toEqual([true, true, false])
    expect(buttons.map((button) => button.tabIndex)).toEqual([-1, -1, 0])
    expect(at(buttons, 2).focused).toBe(true)
    expect(picked).toEqual([2])
    expect(tabs.selected()).toBe(2)
  })

  test("arrows wrap, Home/End jump, and focus follows selection", () => {
    const { tabs, tablist, buttons } = build()

    expect(press(tablist, "ArrowRight")).toBe(true)
    expect(tabs.selected()).toBe(1)
    expect(at(buttons, 1).focused).toBe(true)

    expect(press(tablist, "ArrowRight")).toBe(true)
    expect(tabs.selected()).toBe(2)

    expect(press(tablist, "ArrowRight")).toBe(true)
    expect(tabs.selected()).toBe(0)

    expect(press(tablist, "ArrowLeft")).toBe(true)
    expect(tabs.selected()).toBe(2)

    expect(press(tablist, "Home")).toBe(true)
    expect(tabs.selected()).toBe(0)
    expect(at(buttons, 0).focused).toBe(true)

    expect(press(tablist, "End")).toBe(true)
    expect(tabs.selected()).toBe(2)
  })

  test("every other key is left to the modal's focus trap", () => {
    const { tabs, tablist } = build()

    for (const key of ["Tab", "Enter", " ", "Escape", "ArrowUp"]) {
      expect(press(tablist, key)).toBe(false)
      expect(tabs.selected()).toBe(0)
    }
  })

  test("is-outline tracks the inactive tabs", () => {
    const { tabs, buttons } = build()

    tabs.select(1)

    expect(outlineFlags(buttons)).toEqual([true, false, true])
    expect(selectedFlags(buttons)).toEqual(["false", "true", "false"])
  })

  test("selecting the current tab again is safe and clamps out-of-range", () => {
    const { tabs, panels } = build()

    tabs.select(1)
    tabs.select(1)
    expect(tabs.selected()).toBe(1)
    expect(panels.map((panel) => panel.hidden)).toEqual([true, false, true])

    tabs.select(99)
    expect(tabs.selected()).toBe(2)
    tabs.select(-3)
    expect(tabs.selected()).toBe(0)
  })
})
