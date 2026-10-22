/**
 * Growth host repaint seam (evolution_discovery_20261020 AC-7 / FR-7). No
 * jsdom: the host takes a node-shaped object and the section builders are
 * pointed at a plain-object document, so the whole open → sync → repaint
 * contract is proven in-process.
 *
 * The three regressions this file exists for: a paint while hidden must touch
 * nothing, a repaint must swap the host's own children only, and a state that
 * lands while the panel is closed must not be lost.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  type Creature,
  createCreature,
  createInitialState,
  type GameState,
} from "@apex/sim"
import { growthView } from "./growth"
import { createGrowthHost } from "./growth-panel"
import { NATURE_LEAN_LINE, TRAINED_LEAN_LINE } from "./hud/copy-branch"

interface FakeElement {
  className: string
  textContent: string
  dataset: Record<string, string>
  attributes: Record<string, string>
  children: unknown[]
  setAttribute: (name: string, value: string) => void
  append: (...nodes: unknown[]) => void
}

/** The slice of an element the Growth builders use. */
function element(): FakeElement {
  return {
    className: "",
    textContent: "",
    dataset: {},
    attributes: {},
    children: [],
    setAttribute(name, value) {
      this.attributes[name] = value
    },
    append(...nodes) {
      this.children.push(...nodes)
    },
  }
}

/**
 * The builders only ask the document for `createElement`, so a stand-in is
 * enough to read back what a paint rendered. Installed for this file only and
 * removed again in `afterAll`, so no later suite in the same process inherits a
 * fake document.
 */
const realDocument = Object.getOwnPropertyDescriptor(globalThis, "document")

beforeAll(() => {
  Object.defineProperty(globalThis, "document", {
    value: { createElement: () => element() },
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

interface FakeHostNode {
  hidden: boolean
  children: unknown[]
  /** How many times the host asked for a repaint. */
  calls: number
  replaceChildren: (...nodes: unknown[]) => void
}

const fakeNode = (): FakeHostNode => ({
  hidden: false,
  children: [] as unknown[],
  calls: 0,
  replaceChildren(...nodes: unknown[]) {
    this.children = nodes
    this.calls += 1
  },
})

interface Rendered {
  className: string
  textContent: string
  children: unknown[]
}

function isNode(value: unknown): value is Rendered {
  return typeof value === "object" && value !== null && "className" in value
}

/** Every rendered element under `root`, depth first. */
function nodesIn(root: unknown): Rendered[] {
  if (!isNode(root)) return []
  return [root, ...root.children.flatMap(nodesIn)]
}

function classNamed(root: unknown, className: string): Rendered[] {
  return nodesIn(root).filter((node) => node.className === className)
}

/** The detail column of every row, in render order. */
function detailsIn(root: unknown): string[] {
  return classNamed(root, "detail-growth-detail").map(
    (node) => node.textContent,
  )
}

interface StateOptions {
  day?: number
  mood?: number
  juvenileKnown?: boolean
  branch?: string | null
  trained?: Partial<Record<"hp" | "atk" | "def" | "spd", number>>
}

function stateWith(
  stage: Creature["stage"],
  options: StateOptions = {},
): GameState {
  const base = createInitialState()
  const created = createCreature("fire_drake", 42)
  const day = options.day ?? 1
  const creature: Creature = {
    ...created,
    stage,
    // The pet's own age (save v23): this fixture is a day-1 starter, whose
    // age tracks the world day.
    ageDays: day,
    branch: options.branch === undefined ? created.branch : options.branch,
    trained: { ...created.trained, ...options.trained },
    conditions: {
      ...created.conditions,
      mood: options.mood ?? created.conditions.mood,
    },
  }
  return {
    ...base,
    day,
    creature,
    evolutionKnowledge: {
      juvenile: options.juvenileKnown ?? false,
      champion: false,
    },
  }
}

/** A baby short of the juvenile gate on age and mood. */
function undiscoveredBaby(): GameState {
  return stateWith("baby", { day: 6, mood: 35 })
}

describe("the growth host repaint seam", () => {
  test("a paint while hidden leaves the node untouched", () => {
    const node = fakeNode()
    const host = createGrowthHost(node)
    host.paint(undiscoveredBaby())
    expect(node.calls).toBe(0)
    expect(node.children).toEqual([])
  })

  test("setVisible(true) then a paint renders the gate and unhides", () => {
    const node = fakeNode()
    const host = createGrowthHost(node)
    host.setVisible(true)
    expect(node.hidden).toBe(false)
    host.paint(undiscoveredBaby())
    expect(node.calls).toBe(1)
    const section = node.children[0]
    expect(classNamed(section, "detail-growth-title")[0]?.textContent).toBe(
      "Growing up",
    )
    expect(detailsIn(section)).toEqual([
      "still a few days off",
      "all clear",
      "needs a lift",
    ])
  })

  test("a repaint swaps the host's children only", () => {
    const node = fakeNode()
    const host = createGrowthHost(node)
    host.setVisible(true)
    host.paint(undiscoveredBaby())
    const first = node.children[0]
    host.paint({
      ...undiscoveredBaby(),
      evolutionKnowledge: { juvenile: true, champion: false },
    })
    // The host paints the node it was handed; it never exposes one of its own.
    expect(host).not.toHaveProperty("node")
    expect(node.calls).toBe(2)
    expect(node.children).toHaveLength(1)
    expect(node.children[0]).not.toBe(first)
  })

  test("a creature-less state empties and hides the host", () => {
    const node = fakeNode()
    const host = createGrowthHost(node)
    host.setVisible(true)
    host.paint(undiscoveredBaby())
    expect(node.children).toHaveLength(1)
    host.paint(createInitialState())
    expect(node.children).toEqual([])
    expect(node.hidden).toBe(true)
  })

  test("a paint while closed is a no-op, and reopening repaints", () => {
    const node = fakeNode()
    const host = createGrowthHost(node)
    host.setVisible(true)
    host.paint(undiscoveredBaby())
    host.setVisible(false)
    const shown = node.children
    host.paint(stateWith("baby", { day: 6, mood: 35, juvenileKnown: true }))
    expect(node.children).toBe(shown)
    expect(node.hidden).toBe(true)
    // Reopening repaints the remembered state rather than the stale copy.
    host.setVisible(true)
    expect(node.hidden).toBe(false)
    expect(detailsIn(node.children[0])).toContain("35 / 40")
  })

  test("discovery switches the detail to current / target", () => {
    const node = fakeNode()
    const host = createGrowthHost(node)
    host.setVisible(true)
    const before = stateWith("baby", { day: 6, mood: 35 })
    host.paint(before)
    expect(detailsIn(node.children[0])).toEqual([
      "still a few days off",
      "all clear",
      "needs a lift",
    ])
    host.paint({
      ...before,
      evolutionKnowledge: { juvenile: true, champion: false },
    })
    expect(detailsIn(node.children[0])).toEqual(["6 / 10", "clear", "35 / 40"])
  })
})

/** The path row's readings, in render order, or null when it is absent. */
function pathReadings(root: unknown): { label: string; text: string } | null {
  const [row] = classNamed(root, "detail-growth-path")
  if (!row) return null
  const [label] = classNamed(row, "detail-growth-path-label")
  const [line] = classNamed(row, "detail-growth-path-line")
  const [title] = classNamed(row, "detail-growth-path-title")
  return {
    label: `${title?.textContent ?? ""}|${label?.textContent ?? ""}`,
    text: line?.textContent ?? "",
  }
}

describe("the day-5 path row (FR-6)", () => {
  test("a baby before the hinted day shows no path row", () => {
    const state = stateWith("baby", { day: 4 })
    expect(growthView(state)?.path).toBeNull()
    const node = fakeNode()
    const host = createGrowthHost(node)
    host.setVisible(true)
    host.paint(state)
    expect(pathReadings(node.children[0])).toBeNull()
  })

  test("at the hinted day the row previews the lean without a threshold", () => {
    const state = stateWith("baby", { day: 5 })
    const view = growthView(state)
    expect(view?.path?.preview).toBe(true)
    expect(view?.path?.title).toBe("Path lean")
    // Fire drake's rolled stats lean to defense, so the prediction is Pyre
    // Warden with the honest nature qualifier.
    expect(view?.path?.label).toBe("Pyre Warden")
    expect(view?.path?.line).toBe(NATURE_LEAN_LINE)
    expect(JSON.stringify(view?.path?.label)).not.toMatch(/[0-9]/)
    expect(view?.path?.signature).not.toMatch(/[0-9]/)

    const node = fakeNode()
    const host = createGrowthHost(node)
    host.setVisible(true)
    host.paint(state)
    expect(pathReadings(node.children[0])).toEqual({
      label: "Path lean|Pyre Warden",
      text: NATURE_LEAN_LINE,
    })
  })

  test("training that changes the lean repaints the row", () => {
    const node = fakeNode()
    const host = createGrowthHost(node)
    host.setVisible(true)
    host.paint(stateWith("baby", { day: 6 }))
    expect(pathReadings(node.children[0])?.label).toBe("Path lean|Pyre Warden")

    host.paint(
      stateWith("baby", {
        day: 6,
        trained: { hp: 0, atk: 6, def: 0, spd: 6 },
      }),
    )
    expect(pathReadings(node.children[0])).toEqual({
      label: "Path lean|Cinder Courser",
      text: TRAINED_LEAN_LINE,
    })
  })

  test("a juvenile's earned form reads by name", () => {
    const node = fakeNode()
    const host = createGrowthHost(node)
    host.setVisible(true)
    host.paint(stateWith("juvenile", { day: 20, branch: "cinder_courser" }))
    expect(pathReadings(node.children[0])).toEqual({
      label: "Form|Cinder Courser",
      text: expect.stringContaining("Strike first"),
    })
  })

  test("a legacy line after evolution reads the old line", () => {
    const node = fakeNode()
    const host = createGrowthHost(node)
    host.setVisible(true)
    host.paint(stateWith("juvenile", { day: 20, branch: "legacy" }))
    const read = pathReadings(node.children[0])
    expect(read?.label).toBe("Form|Legacy")
    expect(read?.text).toContain("no signature")
    expect(read?.text).not.toContain("Cinder Courser")
  })
})
