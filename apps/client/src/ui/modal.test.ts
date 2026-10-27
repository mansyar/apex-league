/**
 * Shared modal helper (ui_cleanliness_20261027 Phase 1): open/close owns the
 * `is-hidden` class, traps Tab, closes on scrim-click and Escape, and hands
 * focus back to the opener — with a sane fallback when the opener is gone.
 *
 * A tiny DOM harness stands in for the browser: the helper only touches
 * classList, addEventListener, activeElement, and focus, so a fake element
 * with listeners and a focus flag is enough.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { closeModal, isModalOpen, openModal } from "./modal"

type Listener = (event: Record<string, unknown>) => void

class FakeElement {
  children: FakeElement[] = []
  focused = false
  isConnected = false
  attributes: Record<string, string> = {}
  listeners: Record<string, Listener[]> = {}
  classList: {
    add: (...tokens: string[]) => void
    remove: (...tokens: string[]) => void
    toggle: (token: string, force?: boolean) => boolean
    contains: (token: string) => boolean
  }

  constructor(public className = "") {
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

  hasAttribute(name: string): boolean {
    return name in this.attributes
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

  querySelectorAll(): FakeElement[] {
    return []
  }

  focus(): void {
    this.focused = true
  }

  fire(kind: string, event: Record<string, unknown> = {}): void {
    for (const listener of this.listeners[kind] ?? []) {
      listener({
        stopPropagation: () => {},
        target: this,
        ...event,
      })
    }
  }
}

const realDocument = globalThis.document
const realHTMLElement = globalThis.HTMLElement

let active: FakeElement | null = null
const body = new FakeElement("body")

beforeAll(() => {
  globalThis.document = {
    activeElement: null,
    body,
    createElement: (tag: string) => new FakeElement(tag),
  } as unknown as Document
  Object.defineProperty(globalThis.document, "activeElement", {
    get: () => active,
    configurable: true,
  })
  globalThis.HTMLElement = FakeElement as unknown as typeof HTMLElement
})

afterAll(() => {
  globalThis.document = realDocument
  globalThis.HTMLElement = realHTMLElement
})

function setup(): {
  root: FakeElement
  box: FakeElement
  opener: FakeElement
  initial: FakeElement
} {
  const root = new FakeElement("kit-modal is-hidden")
  const box = new FakeElement("kit-plate kit-modal-box")
  const opener = new FakeElement("kit-chip")
  const initial = new FakeElement("kit-button")
  opener.isConnected = true
  root.append(box)
  box.append(initial)
  active = opener
  return { root, box, opener, initial }
}

function of(node: unknown): FakeElement & HTMLElement {
  return node as unknown as FakeElement & HTMLElement
}

describe("openModal / closeModal", () => {
  test("open reveals via the class and lands focus on the initial target", () => {
    const { root, box, initial } = setup()
    openModal(of(root), { box: of(box), initialFocus: of(initial) })
    expect(isModalOpen(of(root))).toBe(true)
    expect(initial.focused).toBe(true)
  })

  test("close hides via the class and hands focus back to the opener", () => {
    const { root, box, opener, initial } = setup()
    openModal(of(root), { box: of(box), initialFocus: of(initial) })
    opener.focused = false
    closeModal(of(root))
    expect(isModalOpen(of(root))).toBe(false)
    expect(opener.focused).toBe(true)
  })

  test("Escape closes and returns focus", () => {
    const { root, box, opener, initial } = setup()
    openModal(of(root), { box: of(box), initialFocus: of(initial) })
    opener.focused = false
    of(root).fire("keydown", { key: "Escape" })
    expect(isModalOpen(of(root))).toBe(false)
    expect(opener.focused).toBe(true)
  })

  test("scrim-click closes; inside clicks do not", () => {
    const { root, box, initial } = setup()
    openModal(of(root), { box: of(box), initialFocus: of(initial) })
    of(box).fire("click", { target: of(box) })
    expect(isModalOpen(of(root))).toBe(true)
    of(root).fire("click", { target: of(root) })
    expect(isModalOpen(of(root))).toBe(false)
  })

  test("an unmounted opener falls back instead of throwing", () => {
    const { root, box, opener, initial } = setup()
    openModal(of(root), { box: of(box), initialFocus: of(initial) })
    opener.isConnected = false
    body.focused = false
    closeModal(of(root))
    expect(isModalOpen(of(root))).toBe(false)
    expect(opener.focused).toBe(false)
    expect(body.focused).toBe(true)
  })

  test("blocking dialogs ignore Escape and the scrim", () => {
    const { root, box, initial } = setup()
    openModal(of(root), {
      box: of(box),
      initialFocus: of(initial),
      dismissOnEscape: false,
      dismissOnScrim: false,
    })
    of(root).fire("keydown", { key: "Escape" })
    of(root).fire("click", { target: of(root) })
    expect(isModalOpen(of(root))).toBe(true)
  })

  test("close runs the stored cleanup exactly once", () => {
    const { root, box, initial } = setup()
    let calls = 0
    openModal(of(root), {
      box: of(box),
      initialFocus: of(initial),
      onClose: () => {
        calls += 1
      },
    })
    closeModal(of(root))
    closeModal(of(root))
    expect(calls).toBe(1)
  })

  test("commit closes skip the focus handoff but still clean up", () => {
    const { root, box, opener, initial } = setup()
    let calls = 0
    openModal(of(root), {
      box: of(box),
      initialFocus: of(initial),
      onClose: () => {
        calls += 1
      },
    })
    opener.focused = false
    closeModal(of(root), { returnFocus: false })
    expect(calls).toBe(1)
    expect(opener.focused).toBe(false)
  })
})
