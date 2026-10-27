/**
 * The ghost board section (FR-4, AC-4): badge, team/score preview, and Fight
 * per fightable row; quiet notes for version-skewed, empty, stale, and
 * unreachable states. A tiny DOM harness stands in for the browser, matching
 * the board panel suite's precedent.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { type BattleSide, SIM_VERSION } from "@apex/sim"
import type { GhostBoardEntry } from "../cloud/api"
import {
  GHOST_EMPTY_COPY,
  GHOST_ERROR_COPY,
  GHOST_SECTION_TITLE,
  GHOST_STALE_COPY,
  GHOST_VERSION_COPY,
} from "./copy"
import { buildGhostSection } from "./ghost-section"

type Listener = (event: Record<string, unknown>) => void

class FakeElement {
  tagName: string
  children: FakeElement[] = []
  className = ""
  textContent: string | null = null
  style: { display: string } = { display: "" }
  attributes: Record<string, string> = {}
  listeners: Record<string, Listener[]> = {}

  constructor(tag = "div") {
    this.tagName = tag.toUpperCase()
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value
  }

  addEventListener(kind: string, listener: Listener): void {
    const known = this.listeners[kind] ?? []
    known.push(listener)
    this.listeners[kind] = known
  }

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes)
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.children = [...nodes]
  }

  fire(kind: string, event: Record<string, unknown> = {}): void {
    for (const listener of this.listeners[kind] ?? []) {
      listener({ target: this, ...event })
    }
  }
}

const realDocument = globalThis.document

beforeAll(() => {
  globalThis.document = {
    createElement: (tag: string) => new FakeElement(tag),
  } as unknown as Document
})

afterAll(() => {
  globalThis.document = realDocument
})

function fakeOf(node: unknown): FakeElement {
  return node as unknown as FakeElement
}

function nodesIn(root: unknown, className: string): FakeElement[] {
  const found: FakeElement[] = []
  const walk = (node: FakeElement): void => {
    if (
      node.className
        .split(" ")
        .filter((part) => part.length > 0)
        .includes(className)
    ) {
      found.push(node)
    }
    for (const child of node.children) walk(child)
  }
  for (const child of fakeOf(root).children) walk(child)
  return found
}

function champion(name = "Ember"): BattleSide {
  return {
    name,
    id: "owned",
    element: "fire",
    stats: { hp: 80, atk: 13, def: 8, spd: 9 },
    kit: ["spark", "flame_charge", "cinder_shot", "blaze_bolt"],
    tactic: "balanced",
    temperament: "rush",
  }
}

function ghostBundle(overrides: Record<string, unknown> = {}): unknown {
  return {
    simVersion: SIM_VERSION,
    seed: 424242,
    day: 12,
    round: 3,
    player: champion(),
    rival: champion("Tidecaller"),
    winner: "player",
    events: [],
    ...overrides,
  }
}

function entry(
  name: string,
  rank: number,
  ghost: unknown = ghostBundle(),
): GhostBoardEntry {
  return { rank, trainerId: `trn_${name}`, name, updatedAt: 7, ghost }
}

describe("ghost board section", () => {
  test("live rows wear the badge, preview, and a Fight button in served order", () => {
    const section = buildGhostSection(() => {})
    section.paint({
      kind: "live",
      entries: [entry("Ada", 1), entry("Bea", 1)],
    })
    const rows = nodesIn(section.element, "board-ghost-row")
    expect(rows.length).toBe(2)
    expect(rows.map((row) => row.children[0]?.textContent)).toEqual(["1", "1"])
    // The fake DOM harness keeps textContent per node instead of
    // concatenating it like a real browser, so the preview reads off the
    // main node's own children: trainer name, then champion preview.
    expect(
      nodesIn(section.element, "board-ghost-main").map((main) =>
        main.children.map((cell) => cell.textContent),
      ),
    ).toEqual([
      ["Ada", "Ember · day 12 · round 3"],
      ["Bea", "Ember · day 12 · round 3"],
    ])
    // the badge and preview keep their own nodes.
    expect(nodesIn(section.element, "board-ghost-badge").length).toBe(2)
    expect(nodesIn(section.element, "board-fight").length).toBe(2)
  })

  test("a Fight click hands the whole entry back", () => {
    const seen: GhostBoardEntry[] = []
    const rows = entry("Ada", 2)
    const section = buildGhostSection((found) => seen.push(found))
    section.paint({ kind: "live", entries: [rows] })
    nodesIn(section.element, "board-fight")[0]?.fire("click")
    expect(seen).toEqual([rows])
  })

  test("a version-skewed champion lists with the quiet note and no button", () => {
    const section = buildGhostSection(() => {
      throw new Error("skipped rows must not fight")
    })
    section.paint({
      kind: "live",
      entries: [entry("Cy", 3, ghostBundle({ simVersion: SIM_VERSION + 1 }))],
    })
    const rows = nodesIn(section.element, "board-ghost-row")
    expect(rows.length).toBe(1)
    expect(rows[0]?.children[0]?.textContent).toBe("3")
    expect(
      nodesIn(section.element, "board-ghost-main").map((main) =>
        main.children.map((cell) => cell.textContent),
      ),
    ).toEqual([["Cy", GHOST_VERSION_COPY]])
    expect(nodesIn(section.element, "board-fight").length).toBe(0)
  })

  test("a snapshot serves the last board with the stale note", () => {
    const section = buildGhostSection(() => {})
    section.paint({ kind: "snapshot", entries: [entry("Ada", 1)] })
    expect(nodesIn(section.element, "board-ghost-row").length).toBe(1)
    expect(nodesIn(section.element, "board-ghost-status")[0]?.textContent).toBe(
      GHOST_STALE_COPY,
    )
  })

  test("an unreachable board is a calm line, and an empty one is words", () => {
    const section = buildGhostSection(() => {})
    section.paint({ kind: "unavailable" })
    expect(nodesIn(section.element, "board-ghost-row").length).toBe(0)
    expect(nodesIn(section.element, "board-ghost-status")[0]?.textContent).toBe(
      GHOST_ERROR_COPY,
    )

    section.paint({ kind: "live", entries: [] })
    expect(nodesIn(section.element, "board-empty")[0]?.textContent).toBe(
      GHOST_EMPTY_COPY,
    )
    // A repaint clears the rows wholesale: no stale ghost buttons linger.
    expect(nodesIn(section.element, "board-fight").length).toBe(0)
  })

  test("the section names itself like the score boards do", () => {
    const section = buildGhostSection(() => {})
    expect(
      nodesIn(section.element, "board-category-title")[0]?.textContent,
    ).toBe(GHOST_SECTION_TITLE)
  })
})
