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

  removeAttribute(name: string): void {
    delete this.attributes[name]
  }

  hasAttribute(name: string): boolean {
    return name in this.attributes
  }

  /** Boolean `inert` reflects the attribute, just like the real DOM. */
  get inert(): boolean {
    return this.hasAttribute("inert")
  }

  set inert(value: boolean) {
    if (value) this.setAttribute("inert", "")
    else this.removeAttribute("inert")
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

  test("omitted returnFocusTo still returns to the active opener", () => {
    const { root, box, opener, initial } = setup()
    const sparButton = new FakeElement("spar-button")
    sparButton.isConnected = true
    openModal(of(root), { box: of(box), initialFocus: of(initial) })
    opener.focused = false
    closeModal(of(root))
    expect(opener.focused).toBe(true)
    expect(sparButton.focused).toBe(false)
  })

  test("explicit return target wins over the active opener", () => {
    const { root, box, opener, initial } = setup()
    const target = new FakeElement("spar-button")
    target.isConnected = true
    openModal(of(root), {
      box: of(box),
      initialFocus: of(initial),
      returnFocusTo: of(target),
    })
    opener.focused = false
    target.focused = false
    closeModal(of(root))
    expect(target.focused).toBe(true)
    expect(opener.focused).toBe(false)
  })

  test("a failing connected opener is skipped for an explicit target", () => {
    const { root, box, initial } = setup()
    const hiddenOpener = new FakeElement("fight-button")
    hiddenOpener.isConnected = true
    let failedFocusCalls = 0
    hiddenOpener.focus = () => {
      failedFocusCalls += 1
      throw new Error("hidden board button cannot take focus")
    }
    active = hiddenOpener
    const target = new FakeElement("spar-button")
    target.isConnected = true
    openModal(of(root), {
      box: of(box),
      initialFocus: of(initial),
      returnFocusTo: of(target),
    })
    target.focused = false
    closeModal(of(root))
    expect(failedFocusCalls).toBe(0)
    expect(target.focused).toBe(true)
  })

  test("explicit null falls back to the body instead of the opener", () => {
    const { root, box, opener, initial } = setup()
    openModal(of(root), {
      box: of(box),
      initialFocus: of(initial),
      returnFocusTo: null,
    })
    opener.focused = false
    body.focused = false
    closeModal(of(root))
    expect(opener.focused).toBe(false)
    expect(body.focused).toBe(true)
  })

  test("board-close then spar-close focuses the SPAR chip", () => {
    const boardRoot = new FakeElement("kit-modal is-hidden")
    const boardBox = new FakeElement("board-box")
    const boardInitial = new FakeElement("board-button")
    const boardOpener = new FakeElement("chip")
    boardOpener.isConnected = true
    // The chip is inert while spar isolates the HUD: the default board close
    // still attempts to focus it once, but the attempt is a no-op.
    let isolatedBoardOpenerFocusCalls = 0
    boardOpener.focus = () => {
      isolatedBoardOpenerFocusCalls += 1
    }
    const fightButton = new FakeElement("fight-button")
    fightButton.isConnected = true
    let hiddenFocusCalls = 0
    fightButton.focus = () => {
      hiddenFocusCalls += 1
      // A display:none board button stays connected but cannot take focus.
    }
    const sparRoot = new FakeElement("spar-overlay is-hidden")
    const sparBox = new FakeElement("spar-panel")
    const sparClose = new FakeElement("spar-panel-close")
    const sparButton = new FakeElement("spar-button")
    sparButton.isConnected = true

    active = boardOpener
    openModal(of(boardRoot), {
      box: of(boardBox),
      initialFocus: of(boardInitial),
    })
    active = fightButton
    openModal(of(sparRoot), {
      box: of(sparBox),
      initialFocus: of(sparClose),
      returnFocusTo: of(sparButton),
    })

    // board/panel.ts closes the board modal; its Fight button stays
    // connected but hidden, so spar close must not focus it.
    closeModal(of(boardRoot))
    expect(isolatedBoardOpenerFocusCalls).toBe(1)
    fightButton.focused = false
    sparButton.focused = false

    closeModal(of(sparRoot))
    expect(hiddenFocusCalls).toBe(0)
    expect(fightButton.focused).toBe(false)
    expect(sparButton.focused).toBe(true)
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

  test("omitted background isolation leaves the page untouched", () => {
    const { root, box, initial } = setup()
    const bg = new FakeElement("hud-panel")
    openModal(of(root), { box: of(box), initialFocus: of(initial) })
    expect(bg.inert).toBe(false)
    expect(bg.hasAttribute("inert")).toBe(false)
    expect(bg.getAttribute("aria-hidden")).toBeNull()
    closeModal(of(root))
    expect(bg.inert).toBe(false)
    expect(bg.getAttribute("aria-hidden")).toBeNull()
  })

  test("isolates one background target while the modal is open", () => {
    const { root, box, initial } = setup()
    const bg = new FakeElement("hud-panel")
    openModal(of(root), {
      box: of(box),
      initialFocus: of(initial),
      background: of(bg),
    })
    expect(bg.inert).toBe(true)
    expect(bg.getAttribute("aria-hidden")).toBe("true")
  })

  test("isolates several background targets while the modal is open", () => {
    const { root, box, initial } = setup()
    const hud = new FakeElement("hud")
    const dock = new FakeElement("dock")
    openModal(of(root), {
      box: of(box),
      initialFocus: of(initial),
      background: [of(hud), of(dock)],
    })
    expect(hud.inert).toBe(true)
    expect(hud.getAttribute("aria-hidden")).toBe("true")
    expect(dock.inert).toBe(true)
    expect(dock.getAttribute("aria-hidden")).toBe("true")
  })

  test("close removes isolation attributes that were absent before", () => {
    const { root, box, initial } = setup()
    const bg = new FakeElement("hud-panel")
    openModal(of(root), {
      box: of(box),
      initialFocus: of(initial),
      background: [of(bg)],
    })
    expect(bg.inert).toBe(true)
    closeModal(of(root))
    expect(bg.inert).toBe(false)
    expect(bg.hasAttribute("inert")).toBe(false)
    expect(bg.getAttribute("aria-hidden")).toBeNull()
  })

  test("close restores pre-existing inert and aria-hidden values exactly", () => {
    const { root, box, initial } = setup()
    const bg = new FakeElement("hud-panel")
    bg.setAttribute("inert", "")
    bg.setAttribute("aria-hidden", "false")
    openModal(of(root), {
      box: of(box),
      initialFocus: of(initial),
      background: [of(bg)],
    })
    expect(bg.inert).toBe(true)
    expect(bg.getAttribute("aria-hidden")).toBe("true")
    closeModal(of(root))
    expect(bg.getAttribute("inert")).toBe("")
    expect(bg.inert).toBe(true)
    expect(bg.getAttribute("aria-hidden")).toBe("false")
  })

  test("repeated open/close cycles do not retain stale isolation", () => {
    const { root, box, initial } = setup()
    const bg = new FakeElement("hud-panel")
    openModal(of(root), {
      box: of(box),
      initialFocus: of(initial),
      background: [of(bg)],
    })
    closeModal(of(root))
    expect(bg.hasAttribute("inert")).toBe(false)
    expect(bg.getAttribute("aria-hidden")).toBeNull()
    bg.setAttribute("aria-hidden", "custom")
    openModal(of(root), {
      box: of(box),
      initialFocus: of(initial),
      background: [of(bg)],
    })
    expect(bg.getAttribute("aria-hidden")).toBe("true")
    closeModal(of(root))
    expect(bg.hasAttribute("inert")).toBe(false)
    expect(bg.getAttribute("aria-hidden")).toBe("custom")
  })

  test("closing the inner modal keeps the outer modal's isolation", () => {
    const outer = new FakeElement("kit-modal is-hidden")
    const outerBox = new FakeElement("kit-modal-box")
    const outerOpener = new FakeElement("opener")
    outerOpener.isConnected = true
    const inner = new FakeElement("kit-modal is-hidden")
    const innerBox = new FakeElement("kit-modal-box")
    const innerOpener = new FakeElement("opener")
    innerOpener.isConnected = true
    const bg = new FakeElement("hud-panel")
    const focusTarget = new FakeElement("kit-button")

    active = outerOpener
    openModal(of(outer), {
      box: of(outerBox),
      initialFocus: of(focusTarget),
      background: [of(bg)],
    })
    active = innerOpener
    openModal(of(inner), {
      box: of(innerBox),
      initialFocus: of(focusTarget),
      background: [of(bg)],
    })
    expect(bg.inert).toBe(true)

    closeModal(of(inner), { returnFocus: false })
    expect(isModalOpen(of(inner))).toBe(false)
    expect(bg.inert).toBe(true)
    expect(bg.getAttribute("aria-hidden")).toBe("true")

    closeModal(of(outer), { returnFocus: false })
    expect(bg.inert).toBe(false)
    expect(bg.hasAttribute("inert")).toBe(false)
    expect(bg.getAttribute("aria-hidden")).toBeNull()
  })

  test("restores background before handing focus to an opener inside it", () => {
    const { root, box, initial, opener } = setup()
    const realFocus = opener.focus.bind(opener)
    opener.focus = () => {
      // The opener lives in the isolated background, so it must already be
      // interactive by the time the helper hands focus back to it.
      expect(opener.inert).toBe(false)
      expect(opener.getAttribute("aria-hidden")).toBeNull()
      realFocus()
    }
    openModal(of(root), {
      box: of(box),
      initialFocus: of(initial),
      background: [of(opener)],
    })
    expect(opener.inert).toBe(true)
    opener.focused = false
    closeModal(of(root))
    expect(opener.focused).toBe(true)
  })

  test("restores background even when onClose cleanup throws", () => {
    const { root, box, opener, initial } = setup()
    const bg = new FakeElement("hud-panel")
    openModal(of(root), {
      box: of(box),
      initialFocus: of(initial),
      background: [of(bg)],
      onClose: () => {
        throw new Error("cleanup failed")
      },
    })
    opener.focused = false
    expect(() => closeModal(of(root))).toThrow("cleanup failed")
    expect(bg.inert).toBe(false)
    expect(bg.getAttribute("aria-hidden")).toBeNull()
    expect(opener.focused).toBe(true)
  })
})
