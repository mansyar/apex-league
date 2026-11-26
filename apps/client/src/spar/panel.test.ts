/**
 * Spar panel contract: the overlay is a labelled modal dialog from birth,
 * and the background helper reads the app root at open time (not build time).
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { buildSparPanel, sparModalBackground } from "./panel"

type Listener = (event: Record<string, unknown>) => void

class FakeElement {
  children: FakeElement[] = []
  attributes: Record<string, string> = {}
  listeners: Record<string, Listener[]> = {}
  style: { display: string; setProperty: (name: string, value: string) => void }
  classList: {
    add: (...tokens: string[]) => void
    remove: (...tokens: string[]) => void
    toggle: (token: string, force?: boolean) => boolean
    contains: (token: string) => boolean
  }

  constructor(public className = "") {
    this.style = {
      display: "",
      setProperty: (name, value) => {
        this.attributes[`style:${name}`] = value
      },
    }
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

  focus(): void {}
}

const realDocument = globalThis.document
const realHTMLElement = globalThis.HTMLElement

beforeAll(() => {
  globalThis.document = {
    createElement: () => new FakeElement(),
  } as unknown as Document
  globalThis.HTMLElement = FakeElement as unknown as typeof HTMLElement
})

afterAll(() => {
  globalThis.document = realDocument
  globalThis.HTMLElement = realHTMLElement
})

function of(node: FakeElement): HTMLElement {
  return node as unknown as HTMLElement
}

function build(): {
  root: FakeElement
  overlay: FakeElement
  heading: FakeElement
  sparButton: FakeElement
} {
  const root = new FakeElement()
  const refs = buildSparPanel(
    of(root),
    () => {},
    () => {},
  )
  return {
    root,
    overlay: refs.overlay as unknown as FakeElement,
    heading: refs.heading as unknown as FakeElement,
    sparButton: refs.sparButton as unknown as FakeElement,
  }
}

describe("buildSparPanel modal seam", () => {
  test("overlay starts hidden as a labelled dialog, without inline display", () => {
    const { overlay, heading } = build()
    expect(overlay.classList.contains("is-hidden")).toBe(true)
    expect(overlay.style.display).toBe("")
    expect(overlay.getAttribute("role")).toBe("dialog")
    expect(overlay.getAttribute("aria-modal")).toBe("true")
    const labelId = heading.getAttribute("id")
    expect(labelId).toBeTruthy()
    expect(overlay.getAttribute("aria-labelledby")).toBe(labelId)
  })

  test("background helper excludes the overlay and reads root children at call time", () => {
    const { root, overlay, sparButton } = build()
    const hud = new FakeElement("hud")
    root.append(hud)
    const background = sparModalBackground(of(root), of(overlay))
    expect(background).toEqual([sparButton, hud] as unknown as HTMLElement[])
    expect(background).not.toContain(overlay as unknown as HTMLElement)

    const late = new FakeElement("callout")
    root.append(late)
    expect(sparModalBackground(of(root), of(overlay))).toEqual([
      sparButton,
      hud,
      late,
    ] as unknown as HTMLElement[])
  })
})
