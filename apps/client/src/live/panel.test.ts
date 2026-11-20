/**
 * Invite-panel reset (FR-3, AC-3): after a verdict or "Back to ranch", the next
 * `open()` must hand the player a fresh invite — empty code, enabled controls,
 * hidden room/result rows and idle status — with no page reload.
 *
 * A tiny DOM harness stands in for the browser. The panel only touches
 * `document.createElement`, so a fake element with children, classes, text,
 * value and disabled state is enough to drive room → verdict → leave → reopen.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import type { LivePanelActions } from "./panel"
import { createLivePanel } from "./panel"
import type { LiveVerdict } from "./protocol"
import { statusCopy } from "./state"

type Listener = (event: Record<string, unknown>) => void

class FakeElement {
  tagName: string
  children: FakeElement[] = []
  parent: FakeElement | null = null
  className = ""
  textContent: string | null = null
  value = ""
  disabled = false
  hidden = false
  title = ""
  type = ""
  innerHTML = ""
  isConnected = false
  style: { display: string } = { display: "" }
  dataset: Record<string, string> = {}
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
    for (const node of nodes) {
      node.parent = this
      this.children.push(node)
    }
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.children = []
    this.append(...nodes)
  }

  focus(): void {
    // The harness never moves real focus; open/close only need it not to throw.
  }

  select(): void {
    // focusCode() selects the code input; no real selection is needed here.
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

function one(root: unknown, className: string): FakeElement {
  const found = nodesIn(root, className)
  const [node] = found
  if (node === undefined || found.length !== 1) {
    throw new Error(`expected one .${className}, found ${found.length}`)
  }
  return node
}

function buttonLabel(node: FakeElement): string | null {
  if (node.classList.contains("kit-button-name")) return node.textContent
  for (const child of node.children) {
    const label = buttonLabel(child)
    if (label !== null) return label
  }
  return null
}

function namedButton(root: unknown, label: string): FakeElement {
  const found = nodesIn(root, "kit-button").find(
    (node) => buttonLabel(node) === label,
  )
  if (!found) throw new Error(`button not found: ${label}`)
  return found
}

function parentOf(node: FakeElement): FakeElement {
  if (node.parent === null) throw new Error("node has no parent")
  return node.parent
}

function noopActions(): LivePanelActions {
  return {
    create() {},
    join() {},
    ready() {},
    leave() {},
  }
}

const ko: LiveVerdict = { code: "ko", reason: "ko", winnerSeat: 0 }

function assertFresh(root: unknown): void {
  expect(one(root, "live-code-input").value).toBe("")
  expect(one(root, "live-code-input").disabled).toBe(false)
  expect(namedButton(root, "Create room").disabled).toBe(false)
  expect(namedButton(root, "Join room").disabled).toBe(false)
  expect(namedButton(root, "Ready").disabled).toBe(false)
  expect(one(root, "live-room").classList.contains("is-hidden")).toBe(true)
  expect(
    parentOf(namedButton(root, "Ready")).classList.contains("is-hidden"),
  ).toBe(true)
  expect(one(root, "live-result").classList.contains("is-hidden")).toBe(true)
  expect(one(root, "live-room-code").textContent).toBe("")
  expect(one(root, "live-status").textContent).toBe(statusCopy("idle"))
}

describe("live invite panel reset", () => {
  test("reopening after a verdict starts a fresh invite without a reload", () => {
    const panel = createLivePanel(noopActions())
    const root = panel.root

    panel.open()
    panel.room("ABC123")
    panel.verdict(ko, 0, ["Ada", "Bea"])
    panel.status("verdict")

    // The same teardown invite.ts::leave() performs on "Back to ranch".
    panel.status("idle")
    panel.close()

    // No reload: the chip is pressed again.
    panel.open()
    assertFresh(root)
  })

  test("reopening after an error clears the stale error line", () => {
    const panel = createLivePanel(noopActions())
    const root = panel.root

    panel.open()
    panel.error("bad_code")
    panel.close()
    panel.open()

    assertFresh(root)
  })
})
