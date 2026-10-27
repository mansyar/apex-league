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
import {
  BOARD_CATEGORIES,
  BOARD_EMPTY_COPY,
  BOARD_ERROR_COPY,
  BOARD_LOADING_COPY,
  BOARD_OFFLINE_COPY,
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
    expect(fakeOf(modal.root).style.display).toBe("none")
    fakeOf(modal.chip).fire("click")
    expect(fakeOf(modal.root).style.display).toBe("")
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
      }),
    })
    modal.open()
    return settle().then(() => {
      expect(nodesIn(modal.root, "board-row")).toHaveLength(5)
      expect(nodesIn(modal.root, "board-status")[0]?.textContent).toBe(
        BOARD_OFFLINE_COPY,
      )
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
    expect(fakeOf(modal.root).style.display).toBe("none")
    pending[0]?.({ kind: "live", boards: liveBoards() })
    return settle().then(() => {
      expect(nodesIn(modal.root, "board-row")).toHaveLength(0)
    })
  })
})
