/**
 * The board surface (FR-5, AC-4, AC-5): four boards with rank, name and
 * value per row and the served rank verbatim; a loading line on every open;
 * the last snapshot with a quiet note when the server is out of reach; a
 * calm error line when no snapshot was ever written.
 *
 * A tiny DOM harness stands in for the browser: the panel only touches
 * document.createElement, so a fake element with children, classes, text and
 * listeners is enough to drive opens and read back rows.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { SIM_VERSION } from "@apex/sim"
import type { GhostBoardEntry } from "../cloud/api"
import type { GhostBoardLoad } from "../cloud/ghosts"
import {
  BOARD_CATEGORIES,
  BOARD_EMPTY_COPY,
  BOARD_ERROR_COPY,
  BOARD_LOADING_COPY,
} from "./copy"
import type { BoardLoad } from "./fetch"
import { buildBoardPanel } from "./panel"
import type { CategoryBoards } from "./snapshot"

type Listener = (event: Record<string, unknown>) => void

class FakeElement {
  tagName: string
  children: FakeElement[] = []
  className = ""
  textContent: string | null = null
  hidden = false
  title = ""
  type = ""
  isConnected = false
  style: { display: string } = { display: "" }
  attributes: Record<string, string> = {}
  listeners: Record<string, Listener[]> = {}
  classList: {
    add: (...tokens: string[]) => void
    remove: (...tokens: string[]) => void
    toggle: (token: string, force?: boolean) => boolean
    contains: (token: string) => boolean
  }

  constructor(tag = "div") {
    this.tagName = tag.toUpperCase()
    const names = (): string[] =>
      this.className.split(" ").filter((part) => part.length > 0)
    this.classList = {
      add: (...tokens: string[]): void => {
        const seen = new Set(names())
        for (const token of tokens) seen.add(token)
        this.className = [...seen].join(" ")
      },
      remove: (...tokens: string[]): void => {
        const gone = new Set(tokens)
        this.className = names()
          .filter((name) => !gone.has(name))
          .join(" ")
      },
      toggle: (token: string, force?: boolean): boolean => {
        const next = force ?? !names().includes(token)
        if (next) this.classList.add(token)
        else this.classList.remove(token)
        return next
      },
      contains: (token: string): boolean => names().includes(token),
    }
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null
  }

  addEventListener(kind: string, listener: Listener): void {
    const known = this.listeners[kind] ?? []
    known.push(listener)
    this.listeners[kind] = known
  }

  removeEventListener(kind: string, listener: Listener): void {
    this.listeners[kind] = (this.listeners[kind] ?? []).filter(
      (known) => known !== listener,
    )
  }

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes)
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.children = [...nodes]
  }

  focus(): void {
    // The harness never moves real focus; open/close only need it not to throw.
  }

  querySelectorAll(): FakeElement[] {
    return []
  }

  querySelector(): null {
    return null
  }

  fire(kind: string, event: Record<string, unknown> = {}): void {
    for (const listener of this.listeners[kind] ?? []) {
      listener({ target: this, ...event })
    }
  }
}

const realDocument = globalThis.document
const realHTMLElement = globalThis.HTMLElement

beforeAll(() => {
  globalThis.document = {
    activeElement: null,
    createElement: (tag: string) => new FakeElement(tag),
  } as unknown as Document
  globalThis.HTMLElement = FakeElement as unknown as typeof HTMLElement
})

afterAll(() => {
  globalThis.document = realDocument
  globalThis.HTMLElement = realHTMLElement
})

function fakeOf(node: unknown): FakeElement {
  return node as unknown as FakeElement
}

function nodesIn(root: unknown, className: string): FakeElement[] {
  const found: FakeElement[] = []
  const walk = (node: FakeElement): void => {
    if (node.classList.contains(className)) found.push(node)
    for (const child of node.children) walk(child)
  }
  for (const child of fakeOf(root).children) walk(child)
  return found
}

function liveBoards(): CategoryBoards {
  return {
    cups: [
      { rank: 1, trainerId: "trn_abc", name: "Ada", value: 3 },
      { rank: 1, trainerId: "trn_def", name: "Bea", value: 3 },
      { rank: 3, trainerId: "trn_ghi", name: "Cy", value: 1 },
    ],
    ladder: [],
    ap: [{ rank: 1, trainerId: "trn_abc", name: "Ada", value: 12 }],
    collection: [{ rank: 1, trainerId: "trn_def", name: "Bea", value: 5 }],
  }
}

async function settle(): Promise<void> {
  for (let hop = 0; hop < 5; hop++) await Promise.resolve()
}

describe("board panel", () => {
  test("the chip names the boards and opens them", () => {
    const modal = buildBoardPanel({
      load: async () => ({ kind: "live", boards: liveBoards() }),
    })
    expect(nodesIn(modal.chip, "kit-chip-label")[0]?.textContent).toBe("Boards")
    expect(fakeOf(modal.root).getAttribute("aria-label")).toBe("Leaderboards")
    expect(fakeOf(modal.root).classList.contains("is-hidden")).toBe(true)
    fakeOf(modal.chip).fire("click")
    expect(fakeOf(modal.root).classList.contains("is-hidden")).toBe(false)
  })

  test("an open paints loading, then live boards with served ranks verbatim", () => {
    const modal = buildBoardPanel({
      load: async () => ({ kind: "live", boards: liveBoards() }),
    })
    modal.open()
    const status = nodesIn(modal.root, "board-status")[0]
    expect(status?.textContent).toBe(BOARD_LOADING_COPY)
    return settle().then(() => {
      const rows = nodesIn(modal.root, "board-row")
      expect(
        rows.map((row) => row.children.map((cell) => cell.textContent)),
      ).toEqual([
        ["1", "Ada", "3"],
        ["1", "Bea", "3"],
        ["3", "Cy", "1"],
        ["1", "Ada", "12"],
        ["1", "Bea", "5"],
      ])
      // The empty ladder board says so in words; the rest stay quiet.
      const empties = nodesIn(modal.root, "board-empty")
      expect(empties).toHaveLength(BOARD_CATEGORIES.length)
      expect(empties.map((empty) => empty.hidden)).toEqual([
        true,
        false,
        true,
        true,
      ])
      expect(empties[1]?.textContent).toBe(BOARD_EMPTY_COPY)
      expect(status?.textContent).toBe("")
    })
  })

  test("an unreachable server shows the snapshot with the quiet note", () => {
    const modal = buildBoardPanel({
      load: async (): Promise<BoardLoad> => ({
        kind: "snapshot",
        boards: liveBoards(),
        fetchedAt: Date.now(),
      }),
    })
    modal.open()
    return settle().then(() => {
      expect(nodesIn(modal.root, "board-row")).toHaveLength(5)
      const text = nodesIn(modal.root, "board-status")[0]?.textContent ?? ""
      // The offline note names the last boards and stamps how stale.
      expect(text).toContain("last boards")
      expect(text).toMatch(/Updated (just now|\d+ min ago)\./)
    })
  })

  test("no snapshot and no server: a calm line, never an error plate", () => {
    const modal = buildBoardPanel({
      load: async (): Promise<BoardLoad> => ({ kind: "unavailable" }),
    })
    modal.open()
    return settle().then(() => {
      expect(nodesIn(modal.root, "board-row")).toHaveLength(0)
      for (const empty of nodesIn(modal.root, "board-empty")) {
        expect(empty.hidden).toBe(true)
      }
      expect(nodesIn(modal.root, "board-status")[0]?.textContent).toBe(
        BOARD_ERROR_COPY,
      )
    })
  })

  test("closing hides the modal without repainting a stale fetch", () => {
    const pending: Array<(result: BoardLoad) => void> = []
    const modal = buildBoardPanel({
      load: () =>
        new Promise<BoardLoad>((resolve) => {
          pending.push(resolve)
        }),
    })
    modal.open()
    modal.close()
    expect(fakeOf(modal.root).classList.contains("is-hidden")).toBe(true)
    pending[0]?.({ kind: "live", boards: liveBoards() })
    return settle().then(() => {
      expect(nodesIn(modal.root, "board-row")).toHaveLength(0)
    })
  })
})

describe("board ghost wiring", () => {
  function ghostBundle(overrides: Record<string, unknown> = {}): unknown {
    return {
      simVersion: SIM_VERSION,
      seed: 424242,
      day: 12,
      round: 3,
      player: {
        name: "Ember",
        id: "owned",
        element: "fire",
        stats: { hp: 80, atk: 13, def: 8, spd: 9 },
        kit: ["spark", "flame_charge", "cinder_shot", "blaze_bolt"],
        tactic: "balanced",
        temperament: "rush",
      },
      rival: null,
      winner: "player",
      events: [],
      ...overrides,
    }
  }

  function ghostEntry(name: string, rank: number): GhostBoardEntry {
    return {
      rank,
      trainerId: `trn_${name}`,
      name,
      updatedAt: 7,
      ghost: ghostBundle(),
    }
  }

  function ghostLoad(
    entries: GhostBoardEntry[],
  ): () => Promise<GhostBoardLoad> {
    return async () => ({ kind: "live", entries })
  }

  test("the ghost board mounts behind the scores; a Fight closes into the bout", () => {
    const seen: GhostBoardEntry[] = []
    const modal = buildBoardPanel({
      load: async () => ({ kind: "live", boards: liveBoards() }),
      ghosts: {
        load: ghostLoad([ghostEntry("Ada", 1)]),
        onFight: (entry) => {
          seen.push(entry)
          return true
        },
      },
    })
    expect(nodesIn(modal.root, "board-ghosts")).toHaveLength(1)
    modal.open()
    return settle().then(() => {
      expect(nodesIn(modal.root, "board-fight")).toHaveLength(1)
      nodesIn(modal.root, "board-fight")[0]?.fire("click")
      expect(seen.map((entry) => entry.name)).toEqual(["Ada"])
      // The bout opened, so the modal steps aside for the spar.
      expect(fakeOf(modal.root).classList.contains("is-hidden")).toBe(true)
    })
  })

  test("a refused bout keeps the modal open", () => {
    const modal = buildBoardPanel({
      load: async () => ({ kind: "live", boards: liveBoards() }),
      ghosts: { load: ghostLoad([ghostEntry("Bea", 2)]), onFight: () => false },
    })
    modal.open()
    return settle().then(() => {
      nodesIn(modal.root, "board-fight")[0]?.fire("click")
      expect(fakeOf(modal.root).classList.contains("is-hidden")).toBe(false)
    })
  })

  test("a slow ghost answer from a closed visit never repaints", () => {
    const pending: Array<(result: GhostBoardLoad) => void> = []
    const modal = buildBoardPanel({
      load: async () => ({ kind: "live", boards: liveBoards() }),
      ghosts: {
        load: () =>
          new Promise<GhostBoardLoad>((resolve) => {
            pending.push(resolve)
          }),
        onFight: () => true,
      },
    })
    modal.open()
    modal.close()
    pending[0]?.({ kind: "live", entries: [ghostEntry("Cy", 3)] })
    return settle().then(() => {
      expect(nodesIn(modal.root, "board-ghost-row")).toHaveLength(0)
    })
  })

  test("builds without a cloud keep the score boards alone", () => {
    const modal = buildBoardPanel({
      load: async () => ({ kind: "live", boards: liveBoards() }),
    })
    expect(nodesIn(modal.root, "board-ghosts")).toHaveLength(0)
  })
})
