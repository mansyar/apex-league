/**
 * Detail-panel Growth rows (evolution discovery, Phase 3). The repo has no
 * DOM harness, so the row reading is extracted as `growthRowParts` and pinned
 * here: met and unmet never share a glyph or a status word, a revealed gate
 * composes label + value/target, and an undiscovered gate leaks no digits.
 *
 * The host's own repaint contract lives in `growth-panel.test.ts`. This file
 * additionally drives `buildCreatureDetail` itself through a minimal fake DOM
 * (below), so the panel wiring — `open` unhiding the slot, `sync` repainting
 * it in place, and `sync` doing nothing once closed — fails here if any of
 * those three calls is dropped (review round 2, M1).
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  type Creature,
  createCreature,
  createInitialState,
  type GameState,
  getMove,
  getSpecies,
} from "@apex/sim"
import { buildCreatureDetail } from "./creature-detail"
import { type GrowthView, growthView } from "./growth"
import { growthRowParts } from "./growth-panel"

const DIGIT = /[0-9]/

interface StateOptions {
  day?: number
  mood?: number
  bond?: number
  cupsWon?: number
  juvenileKnown?: boolean
  championKnown?: boolean
}

function stateWith(
  stage: Creature["stage"],
  options: StateOptions = {},
): GameState {
  const base = createInitialState()
  const created = createCreature("fire_drake", 42)
  const creature: Creature = {
    ...created,
    stage,
    conditions: {
      ...created.conditions,
      mood: options.mood ?? created.conditions.mood,
      bond: options.bond ?? created.conditions.bond,
    },
  }
  return {
    ...base,
    day: options.day ?? 1,
    cupsWon: options.cupsWon ?? 0,
    creature,
    evolutionKnowledge: {
      juvenile: options.juvenileKnown ?? false,
      champion: options.championKnown ?? false,
    },
  }
}

function viewOf(state: GameState): GrowthView {
  const view = growthView(state)
  if (!view) throw new Error("expected a growth view")
  return view
}

function partsOf(state: GameState) {
  return viewOf(state).rows.map(growthRowParts)
}

describe("growth row reading", () => {
  test("a revealed champion gate composes the value / target pair", () => {
    const parts = partsOf(
      stateWith("juvenile", {
        day: 6,
        mood: 35,
        bond: 52,
        cupsWon: 0,
        championKnown: true,
      }),
    )
    expect(parts.map((part) => part.label)).toEqual([
      "Day",
      "Clean nights",
      "Mood",
      "Bond",
      "Cups won",
    ])
    expect(parts.find((part) => part.label === "Mood")).toMatchObject({
      detail: "35 / 40",
      glyph: "○",
      status: "Not yet",
    })
    expect(parts.find((part) => part.label === "Day")?.detail).toBe("6 / 25")
    expect(parts.find((part) => part.label === "Bond")?.detail).toBe("52 / 60")
    expect(parts.find((part) => part.label === "Cups won")?.detail).toBe(
      "0 / 1",
    )
    // The juvenile gate reads the same way at its own target.
    const juvenile = partsOf(
      stateWith("baby", { day: 6, mood: 35, juvenileKnown: true }),
    )
    expect(juvenile.find((part) => part.label === "Day")?.detail).toBe("6 / 10")
  })

  test("met and unmet read differently without colour", () => {
    const met = partsOf(
      stateWith("juvenile", {
        day: 30,
        mood: 100,
        bond: 100,
        cupsWon: 1,
        championKnown: true,
      }),
    )
    const unmet = partsOf(
      stateWith("juvenile", {
        day: 1,
        mood: 0,
        bond: 0,
        cupsWon: 0,
        championKnown: true,
      }),
    )
    const readings = new Set(
      [...met, ...unmet].map((part) => `${part.glyph}|${part.status}`),
    )
    expect(readings).toEqual(new Set(["✓|Met", "○|Not yet"]))
    expect(met.every((part) => part.status === "Met")).toBe(true)
    expect(unmet.some((part) => part.status === "Not yet")).toBe(true)
    expect(met.every((part) => part.glyph === "✓")).toBe(true)
    expect(unmet.some((part) => part.glyph === "○")).toBe(true)
  })

  test("an undiscovered gate composes no digits", () => {
    const parts = partsOf(stateWith("baby", { day: 1, mood: 10 }))
    expect(parts.length).toBeGreaterThan(0)
    for (const part of parts) {
      expect(part.label).not.toMatch(DIGIT)
      expect(part.detail).not.toMatch(DIGIT)
      expect(part.status).toMatch(/^(Met|Not yet)$/)
      expect(["✓", "○"]).toContain(part.glyph)
    }
    expect(parts.map((part) => part.detail).join(" ")).not.toMatch(DIGIT)
  })
})

/*
 * A fake DOM, only for the tests below. `buildCreatureDetail` walks a small,
 * well-known slice of the DOM (create, class names, append/replace, styles,
 * attributes, listeners, focus), so this class is that slice and nothing more.
 */
interface FakeStyle {
  display: string
  properties: Record<string, string>
  setProperty: (name: string, value: string) => void
}

type Listener = (event: unknown) => void

/** Where the last `focus()` landed — the fake tree has no focus ring. */
let lastFocused: FakeElement | null = null

class FakeElement {
  className = ""
  textContent = ""
  hidden = false
  type = ""
  innerHTML = ""
  isConnected = true
  parent: FakeElement | null = null
  /** `replaceChildren` calls: the "did the panel repaint?" counter. */
  repaints = 0
  readonly dataset: Record<string, string> = {}
  readonly attributes: Record<string, string> = {}
  readonly children: FakeElement[] = []
  private readonly classNames = new Set<string>()
  private readonly listeners = new Map<string, Listener[]>()

  readonly classList = {
    add: (...names: string[]): void => {
      for (const name of names) this.classNames.add(name)
    },
    remove: (...names: string[]): void => {
      for (const name of names) this.classNames.delete(name)
    },
    toggle: (name: string, on: boolean): void => {
      if (on) this.classNames.add(name)
      else this.classNames.delete(name)
    },
    contains: (name: string): boolean => this.classNames.has(name),
  }

  readonly style: FakeStyle = {
    display: "",
    properties: {},
    setProperty(name, value) {
      this.properties[name] = value
    },
  }

  append(...nodes: FakeElement[]): void {
    for (const node of nodes) this.adopt(node)
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.repaints += 1
    for (const child of this.children) child.parent = null
    this.children.length = 0
    this.append(...nodes)
  }

  replaceWith(...nodes: FakeElement[]): void {
    const parent = this.parent
    if (!parent) return
    const index = parent.children.indexOf(this)
    if (index < 0) return
    parent.children.splice(index, 1, ...nodes)
    for (const node of nodes) node.parent = parent
    this.parent = null
  }

  addEventListener(type: string, handler: Listener): void {
    const handlers = this.listeners.get(type) ?? []
    handlers.push(handler)
    this.listeners.set(type, handlers)
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value
  }

  focus(): void {
    // The fake tree has no focus ring; record where focus landed instead.
    lastFocused = this
  }

  getClientRects(): unknown[] {
    return []
  }

  querySelectorAll(): FakeElement[] {
    return []
  }

  /** Deliver `event` to the handlers registered for `type` — the only way in. */
  fire(type: string, event: unknown): void {
    for (const handler of this.listeners.get(type) ?? []) handler(event)
  }

  private adopt(node: FakeElement): void {
    const previous = node.parent
    if (previous) {
      const index = previous.children.indexOf(node)
      if (index >= 0) previous.children.splice(index, 1)
    }
    node.parent = this
    this.children.push(node)
  }
}

const realDocument = Object.getOwnPropertyDescriptor(globalThis, "document")
const realHTMLElement = Object.getOwnPropertyDescriptor(
  globalThis,
  "HTMLElement",
)

/** The fake element behind a HUD node: this harness's document made every one. */
function fakeOf(node: HTMLElement): FakeElement {
  return node as unknown as FakeElement
}

/** Every element in the tree, depth first. */
function nodesIn(root: FakeElement): FakeElement[] {
  return [root, ...root.children.flatMap(nodesIn)]
}

function classNamed(root: FakeElement, className: string): FakeElement[] {
  return nodesIn(root).filter((node) => node.className === className)
}

function byClass(root: FakeElement, className: string): FakeElement {
  const [node] = classNamed(root, className)
  if (!node) throw new Error(`nothing has class ${className}`)
  return node
}

/** The detail column of the Growth row labelled `label`. */
function detailFor(host: FakeElement, label: string): string {
  const row = classNamed(host, "detail-growth-row").find(
    (node) => byClass(node, "detail-growth-label").textContent === label,
  )
  if (!row) throw new Error(`no Growth row labelled ${label}`)
  return byClass(row, "detail-growth-detail").textContent
}

/** Fake elements carrying `role`, in document order. */
function roleNamed(root: FakeElement, role: string): FakeElement[] {
  return nodesIn(root).filter((node) => node.attributes.role === role)
}

/** The tab button labelled `label`. */
function tabNamed(root: FakeElement, label: string): FakeElement {
  const found = roleNamed(root, "tab").find(
    (node) => node.textContent === label,
  )
  if (!found) throw new Error(`no tab labelled ${label}`)
  return found
}

/** The one selected tab — the assertion that there is exactly one lives here. */
function activeTab(root: FakeElement): FakeElement {
  const selected = roleNamed(root, "tab").filter(
    (node) => node.attributes["aria-selected"] === "true",
  )
  expect(selected).toHaveLength(1)
  const [tab] = selected
  if (!tab) throw new Error("no selected tab")
  return tab
}

beforeAll(() => {
  Object.defineProperty(globalThis, "document", {
    value: { createElement: () => new FakeElement(), activeElement: null },
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, "HTMLElement", {
    value: FakeElement,
    configurable: true,
    writable: true,
  })
})

afterAll(() => {
  restoreGlobal("document", realDocument)
  restoreGlobal("HTMLElement", realHTMLElement)
})

describe("the detail modal's Growth slot", () => {
  test("open unhides the slot with a title and one row per condition", () => {
    const detail = buildCreatureDetail()
    const host = byClass(fakeOf(detail.root), "detail-growth-host")
    expect(host.hidden).toBe(true)

    detail.open(stateWith("baby", { day: 6, mood: 35 }))

    expect(host.hidden).toBe(false)
    expect(byClass(host, "detail-growth-title").textContent).toBe("Growing up")
    expect(classNamed(host, "detail-growth-row")).toHaveLength(3)
    expect(detailFor(host, "Mood")).toBe("needs a lift")
    // One render on the way in, from the state `open` was handed (L5).
    expect(host.repaints).toBe(1)
  })

  test("sync repaints the open slot in place when the gate is discovered", () => {
    const detail = buildCreatureDetail()
    const root = fakeOf(detail.root)
    detail.open(stateWith("baby", { day: 6, mood: 35 }))
    const host = byClass(root, "detail-growth-host")
    const statList = byClass(root, "detail-stat-list")
    expect(detailFor(host, "Mood")).toBe("needs a lift")

    detail.sync(stateWith("baby", { day: 6, mood: 35, juvenileKnown: true }))

    // Same host, same peers: the repaint swapped the slot's own children only.
    expect(byClass(root, "detail-growth-host")).toBe(host)
    expect(byClass(root, "detail-stat-list")).toBe(statList)
    expect(statList.repaints).toBe(1)
    expect(detailFor(host, "Mood")).toBe("35 / 40")
    expect(host.repaints).toBe(2)
  })

  test("sync after close leaves the slot alone", () => {
    const detail = buildCreatureDetail()
    detail.open(stateWith("baby", { day: 6, mood: 35 }))
    const root = fakeOf(detail.root)
    const host = byClass(root, "detail-growth-host")
    const repaints = host.repaints

    root.fire("keydown", { key: "Escape", target: null })
    expect(host.hidden).toBe(true)

    detail.sync(stateWith("baby", { day: 6, mood: 35, juvenileKnown: true }))

    expect(host.repaints).toBe(repaints)
    expect(host.hidden).toBe(true)
    expect(detailFor(host, "Mood")).toBe("needs a lift")
  })

  test("a creature-less open leaves the slot hidden", () => {
    const detail = buildCreatureDetail()
    const host = byClass(fakeOf(detail.root), "detail-growth-host")

    detail.open(createInitialState())

    expect(host.hidden).toBe(true)
    expect(host.children).toEqual([])
  })
})

describe("the detail modal's pages", () => {
  test("opens on Stats with one selected tab and every page painted", () => {
    const detail = buildCreatureDetail()
    detail.open(stateWith("baby", { day: 6, mood: 35 }))
    const root = fakeOf(detail.root)

    expect(roleNamed(root, "tab").map((node) => node.textContent)).toEqual([
      "Stats",
      "Growth",
      "Moves",
    ])
    expect(activeTab(root).textContent).toBe("Stats")
    expect(roleNamed(root, "tabpanel").map((panel) => panel.hidden)).toEqual([
      false,
      true,
      true,
    ])
    // Painted on open, not on first entry: every page is already current.
    expect(classNamed(root, "detail-stat")).toHaveLength(4)
    expect(classNamed(root, "detail-context-row")).toHaveLength(6)
    expect(
      classNamed(byClass(root, "detail-kit"), "detail-kit-row"),
    ).toHaveLength(6)
  })

  test("arrows, Home/End and clicks switch pages and take focus", () => {
    const detail = buildCreatureDetail()
    detail.open(stateWith("baby", { day: 6, mood: 35 }))
    const root = fakeOf(detail.root)
    const [tablist] = roleNamed(root, "tablist")
    if (!tablist) throw new Error("no tablist")
    const press = (key: string): void => {
      tablist.fire("keydown", { key, preventDefault: () => {} })
    }

    press("ArrowRight")
    expect(activeTab(root).textContent).toBe("Growth")
    expect(lastFocused).toBe(tabNamed(root, "Growth"))
    expect(roleNamed(root, "tabpanel")[1]?.hidden).toBe(false)

    press("End")
    expect(activeTab(root).textContent).toBe("Moves")
    press("ArrowRight")
    expect(activeTab(root).textContent).toBe("Stats")

    press("ArrowLeft")
    expect(activeTab(root).textContent).toBe("Moves")
    press("Home")
    expect(activeTab(root).textContent).toBe("Stats")
    expect(lastFocused).toBe(tabNamed(root, "Stats"))

    tabNamed(root, "Growth").fire("click", {})
    expect(activeTab(root).textContent).toBe("Growth")
    expect(roleNamed(root, "tabpanel")[0]?.hidden).toBe(true)
  })

  test("Growth shows digit-free copy until discovery, then current / target", () => {
    const detail = buildCreatureDetail()
    detail.open(stateWith("baby", { day: 6, mood: 35 }))
    const root = fakeOf(detail.root)
    const host = byClass(root, "detail-growth-host")
    tabNamed(root, "Growth").fire("click", {})
    expect(roleNamed(root, "tabpanel")[1]?.hidden).toBe(false)

    const copy = classNamed(host, "detail-growth-detail").map(
      (node) => node.textContent,
    )
    expect(copy.length).toBeGreaterThan(0)
    expect(copy.join(" ")).not.toMatch(DIGIT)

    detail.sync(stateWith("baby", { day: 6, mood: 35, juvenileKnown: true }))
    expect(detailFor(host, "Mood")).toBe("35 / 40")
  })

  test("leaving and returning to Growth paints the latest state", () => {
    const detail = buildCreatureDetail()
    detail.open(stateWith("baby", { day: 6, mood: 35 }))
    const root = fakeOf(detail.root)
    const host = byClass(root, "detail-growth-host")
    tabNamed(root, "Growth").fire("click", {})
    expect(detailFor(host, "Mood")).toBe("needs a lift")

    tabNamed(root, "Stats").fire("click", {})
    detail.sync(stateWith("baby", { day: 6, mood: 35, juvenileKnown: true }))
    // The repaint lands in Growth's own node; the visible page is untouched.
    expect(byClass(root, "detail-stat-list").repaints).toBe(1)

    tabNamed(root, "Growth").fire("click", {})
    expect(detailFor(host, "Mood")).toBe("35 / 40")
  })

  test("Moves lists the creature's kit", () => {
    const detail = buildCreatureDetail()
    detail.open(stateWith("baby", { day: 6, mood: 35 }))
    const root = fakeOf(detail.root)
    tabNamed(root, "Moves").fire("click", {})

    const kit = byClass(root, "detail-kit")
    const rows = classNamed(kit, "detail-kit-row")
    const species = getSpecies("fire_drake")
    if (!species) throw new Error("fire_drake species missing")
    expect(
      rows.map((row) => byClass(row, "detail-kit-name").textContent),
    ).toEqual(species.kit.map((id) => getMove(id)?.displayName ?? id))
    const states = classNamed(kit, "detail-kit-state").map(
      (node) => node.textContent,
    )
    expect(states.filter((state) => state === "In kit").length).toBeGreaterThan(
      0,
    )
  })

  test("closing from Moves and reopening lands on Stats", () => {
    const detail = buildCreatureDetail()
    const state = stateWith("baby", { day: 6, mood: 35 })
    detail.open(state)
    const root = fakeOf(detail.root)
    tabNamed(root, "Moves").fire("click", {})
    root.fire("keydown", { key: "Escape", target: null })

    detail.open(state)

    expect(activeTab(root).textContent).toBe("Stats")
    expect(roleNamed(root, "tabpanel").map((panel) => panel.hidden)).toEqual([
      false,
      true,
      true,
    ])
    // The close action still owns focus after the select.
    expect(lastFocused).toBe(byClass(root, "kit-button"))
  })
})

/** Put a stubbed global back, deleting it when the runtime never had one. */
function restoreGlobal(name: string, descriptor?: PropertyDescriptor): void {
  if (descriptor) Object.defineProperty(globalThis, name, descriptor)
  else Reflect.deleteProperty(globalThis, name)
}
