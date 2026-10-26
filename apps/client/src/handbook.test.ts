/**
 * Coach's Handbook after the migration onto the shared tab controller
 * (detail_modal_tabs Phase 1: FR-10, AC-7). The handbook had no test before
 * this migration, so this file is its regression net: it pins the five pages,
 * their order and skin, the initial page, and arrow-key page switching over a
 * minimal fake DOM (no jsdom, restored in `afterAll`).
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  BRANCHES,
  EXHAUSTED_ENERGY,
  FORM_COPY,
  getMove,
  SICK_HEALTH,
  TRAINING_CAP,
  TRAINING_ENERGY_COST,
  TRAINING_PROGRAMS,
} from "@apex/sim"
import { buildHandbook } from "./handbook"

type Listener = (event: unknown) => void

/** The DOM slice `buildHandbook` and the tab controller touch. */
class FakeElement {
  readonly tag: string
  hidden = false
  tabIndex = -1
  type = ""
  id = ""
  title = ""
  textContent = ""
  innerHTML = ""
  /** Template bodies: `appendGlyph` hands the fragment to `append`. */
  readonly content: FakeElement[] = []
  focused = false
  readonly attributes: Record<string, string> = {}
  readonly children: FakeElement[] = []
  readonly style: Record<string, string> = {}
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

  append(...nodes: Array<FakeElement | FakeElement[]>): void {
    for (const node of nodes) {
      if (Array.isArray(node)) this.children.push(...node)
      else this.children.push(node)
    }
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

  /** The focus trap asks for focusables; the fake modal has none in scope. */
  querySelectorAll(): FakeElement[] {
    return []
  }

  getClientRects(): unknown[] {
    return []
  }

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

function nodesIn(root: FakeElement): FakeElement[] {
  return [root, ...root.children.flatMap(nodesIn)]
}

function withRole(root: FakeElement, role: string): FakeElement[] {
  return nodesIn(root).filter((node) => node.attributes.role === role)
}

function byClass(root: FakeElement, name: string): FakeElement[] {
  return nodesIn(root).filter((node) => node.classList.contains(name))
}

function at<T>(list: readonly T[], index: number): T {
  const item = list[index]
  if (item === undefined) throw new Error(`nothing at index ${index}`)
  return item
}

/** Fire a keydown on the tab strip; returns whether it was prevented. */
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

function pageOf(node: HTMLElement) {
  const root = fakeOf(node)
  const tablist = at(withRole(root, "tablist"), 0)
  return {
    root,
    tablist,
    tabs: withRole(root, "tab"),
    panels: withRole(root, "tabpanel"),
  }
}

describe("the handbook's tabs", () => {
  test("keep five pages in order with the handbook skin", () => {
    const { tablist, tabs, panels } = pageOf(buildHandbook().root)

    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Type chart",
      "Ladder rules",
      "Moves",
      "Raising",
      "Paths",
    ])
    expect(tablist.classList.contains("handbook-tabs")).toBe(true)
    for (const tab of tabs) {
      expect(tab.classList.contains("kit-tab")).toBe(true)
      expect(tab.classList.contains("handbook-tab")).toBe(true)
    }
    for (const panel of panels) {
      expect(panel.classList.contains("handbook-panel")).toBe(true)
    }
  })

  test("open on the type chart, with one page visible", () => {
    const { tabs, panels } = pageOf(buildHandbook().root)

    expect(tabs.map((tab) => tab.attributes["aria-selected"])).toEqual([
      "true",
      "false",
      "false",
      "false",
      "false",
    ])
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1, -1])
    expect(panels.map((panel) => panel.hidden)).toEqual([
      false,
      true,
      true,
      true,
      true,
    ])
    expect(panels.filter((panel) => !panel.hidden)).toHaveLength(1)
    // Ids the CSS and the aria wiring have used since the handbook landed.
    expect(at(tabs, 0).id).toBe("handbook-tab-0")
    expect(at(tabs, 0).attributes["aria-controls"]).toBe("handbook-panel-0")
    expect(at(panels, 0).attributes["aria-labelledby"]).toBe("handbook-tab-0")
    // The page's content survived the migration.
    expect(byClass(at(panels, 0), "handbook-chart")).toHaveLength(1)
  })

  test("ArrowRight opens the second page and hides the first", () => {
    const { tablist, tabs, panels } = pageOf(buildHandbook().root)

    expect(press(tablist, "ArrowRight")).toBe(true)

    expect(tabs.map((tab) => tab.attributes["aria-selected"])).toEqual([
      "false",
      "true",
      "false",
      "false",
      "false",
    ])
    expect(panels.map((panel) => panel.hidden)).toEqual([
      true,
      false,
      true,
      true,
      true,
    ])
    expect(at(tabs, 1).focused).toBe(true)
    expect(byClass(at(panels, 1), "handbook-rule")).toHaveLength(5)
  })

  test("ArrowLeft wraps to the last page and Home returns to the first", () => {
    const { tablist, tabs, panels } = pageOf(buildHandbook().root)

    expect(press(tablist, "ArrowLeft")).toBe(true)
    expect(tabs.map((tab) => tab.attributes["aria-selected"])).toEqual([
      "false",
      "false",
      "false",
      "false",
      "true",
    ])
    expect(at(panels, 4).hidden).toBe(false)

    expect(press(tablist, "Home")).toBe(true)
    expect(tabs.map((tab) => tab.attributes["aria-selected"])).toEqual([
      "true",
      "false",
      "false",
      "false",
      "false",
    ])
    expect(at(panels, 0).hidden).toBe(false)
  })
})

/** The Raising page's body: every rule row and tip in build order. */
function raisingBody(): FakeElement {
  const { panels } = pageOf(buildHandbook().root)
  return at(panels, 3)
}

function textOf(root: FakeElement): string {
  return nodesIn(root)
    .map((node) => node.textContent)
    .join(" ")
}

function sentencesOf(text: string): string[] {
  return text
    .split(/[.!?](?=\s|$)/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

describe("the handbook's Raising page", () => {
  test("teach the four programs from the sim catalog", () => {
    const body = raisingBody()
    const terms = byClass(body, "handbook-rule-term").map(
      (node) => node.textContent,
    )
    const copies = byClass(body, "handbook-rule-copy").map(
      (node) => node.textContent,
    )

    expect(byClass(body, "handbook-tip").length).toBeGreaterThan(0)
    for (const program of TRAINING_PROGRAMS) {
      expect(terms).toContain(program.label)
      expect(copies.some((copy) => copy.includes(program.blurb))).toBe(true)
    }
  })

  test("spell the energy gate, the cap, and the sickness pin", () => {
    const text = textOf(raisingBody())

    expect(text).toContain(`${TRAINING_ENERGY_COST} Energy`)
    expect(text).toContain(`${EXHAUSTED_ENERGY} Energy`)
    expect(text).toContain(`+${TRAINING_CAP}`)
    expect(text).toContain(`${SICK_HEALTH} Health`)
    expect(text).toContain("Sluggish")
    expect(text).toContain("ATK only")
  })

  test("quote the form tiers in the sim's own words", () => {
    const body = raisingBody()
    const terms = byClass(body, "handbook-rule-term").map(
      (node) => node.textContent,
    )
    const copies = byClass(body, "handbook-rule-copy").map(
      (node) => node.textContent,
    )

    for (const copy of Object.values(FORM_COPY)) {
      expect(terms).toContain(copy.label)
      expect(copies).toContain(copy.line)
    }
  })

  test("list the breeding-discovery recipes openly", () => {
    const body = raisingBody()
    const terms = byClass(body, "handbook-rule-term").map(
      (node) => node.textContent,
    )
    const copies = byClass(body, "handbook-rule-copy").map(
      (node) => node.textContent,
    )

    const expected: ReadonlyArray<[string, string]> = [
      ["Voltfox", "Breed Electric with Wind."],
      ["Galeheron", "Breed Water with Wind."],
      ["Shalemole", "Breed Earth with Fire."],
    ]
    for (const [name, recipe] of expected) {
      expect(terms).toContain(name)
      expect(copies).toContain(recipe)
    }
  })

  test("keep every added line to two sentences with caps stats", () => {
    const body = raisingBody()
    const lines = [
      ...byClass(body, "handbook-tip"),
      ...byClass(body, "handbook-rule-copy"),
    ]

    expect(lines.length).toBeGreaterThan(0)
    for (const node of lines) {
      expect(sentencesOf(node.textContent).length).toBeLessThanOrEqual(2)
      expect(node.textContent).not.toMatch(/\b(atk|hp|def|spd)\b/)
    }
  })
})

/** The Paths page's body (fifth tab). */
function pathsBody(): FakeElement {
  const { panels } = pageOf(buildHandbook().root)
  return at(panels, 4)
}

describe("the handbook's Paths page", () => {
  test("name both leans and both signature behaviours", () => {
    const body = pathsBody()
    const text = textOf(body)

    expect(text).toContain("ATK + SPD")
    expect(text).toContain("HP + DEF")
    expect(text).toContain("Training")
    // One signature per real form, named from the sim's own branches.
    for (const branch of BRANCHES) {
      expect(text).toContain(branch.label)
      const signature = branch.signatureMove
      if (!signature) throw new Error("real branches carry a signature")
      const move = getMove(signature)
      if (!move) throw new Error("signature move missing")
      expect(text).toContain(move.displayName)
    }
    expect(text.toLowerCase()).toContain("no signature move")
    expect(text).toContain("older save")
  })

  test("stay direction-only: no gate days or threshold numbers", () => {
    const text = textOf(pathsBody())
    const sentences = sentencesOf(text)

    expect(text).toContain("Growth panel")
    expect(text).not.toMatch(/\bday\s*\d/i)
    expect(text).not.toMatch(/\b(10|25|5)\b/)
    expect(sentences.length).toBeGreaterThan(0)
    for (const sentence of sentences) {
      expect(sentence.length).toBeLessThan(200)
    }
  })

  test("keep every line to two coach sentences", () => {
    const body = pathsBody()
    const lines = [
      ...byClass(body, "handbook-tip"),
      ...byClass(body, "handbook-rule-copy"),
    ]

    expect(lines.length).toBeGreaterThan(0)
    for (const node of lines) {
      expect(sentencesOf(node.textContent).length).toBeLessThanOrEqual(2)
    }
  })
})
