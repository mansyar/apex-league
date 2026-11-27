/**
 * Spar panel contract: the overlay is a labelled modal dialog from birth, the
 * background helper reads the app root at open time, and the setup callbacks
 * arm tactics/rules without ever launching a bout (FR-1, FR-2, AC-1, AC-2).
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { createCreature, type DoctrineId, type RuleId } from "@apex/sim"
import {
  buildSparPanel,
  type SparPanelSetupRefs,
  type SparSetupSeam,
  sparModalBackground,
} from "./panel"
import { markArmedTactic, refreshPrep } from "./setup"

type Listener = (event: Record<string, unknown>) => void

class FakeElement {
  children: FakeElement[] = []
  attributes: Record<string, string> = {}
  listeners: Record<string, Listener[]> = {}
  disabled = false
  hidden = false
  textContent = ""
  innerHTML = ""
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

  replaceChildren(...nodes: FakeElement[]): void {
    this.children = [...nodes]
  }

  focus(): void {}
}

const realDocument = globalThis.document
const realHTMLElement = globalThis.HTMLElement

beforeAll(() => {
  globalThis.document = {
    createElement: () => new FakeElement(),
    createDocumentFragment: () => new FakeElement(),
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

function click(node: FakeElement): void {
  for (const listener of node.listeners["click"] ?? []) listener({})
}

interface Spy {
  armed: DoctrineId[]
  picked: (RuleId | null)[]
  launches: number
}

interface Harness {
  root: FakeElement
  refs: SparPanelSetupRefs
  spy: Spy
  live: { armed: DoctrineId; rule: RuleId | null }
}

/** Build a panel whose seam mirrors spar.ts's selection/launch wiring. */
function build(): Harness {
  const root = new FakeElement()
  const spy: Spy = { armed: [], picked: [], launches: 0 }
  const live = { armed: "press" as DoctrineId, rule: null as RuleId | null }
  const seam: SparSetupSeam = {
    arm: (doctrine) => {
      live.armed = doctrine
      spy.armed.push(doctrine)
    },
    pickRule: (rule) => {
      live.rule = rule
      spy.picked.push(rule)
    },
    launch: () => {
      spy.launches += 1
    },
    armed: () => live.armed,
    rule: () => live.rule,
  }
  const refs = buildSparPanel(of(root), seam)
  return { root, refs, spy, live }
}

function tacticButtons(refs: SparPanelSetupRefs): FakeElement[] {
  return refs.doctrineButtons.map(
    ({ button }) => button as unknown as FakeElement,
  )
}

function ruleButtons(refs: SparPanelSetupRefs): FakeElement[] {
  return refs.ruleButtons.map(({ button }) => button as unknown as FakeElement)
}

describe("buildSparPanel modal seam", () => {
  test("overlay starts hidden as a labelled dialog, without inline display", () => {
    const { refs } = build()
    const overlay = refs.overlay as unknown as FakeElement
    const heading = refs.heading as unknown as FakeElement
    expect(overlay.classList.contains("is-hidden")).toBe(true)
    expect(overlay.style.display).toBe("")
    expect(overlay.getAttribute("role")).toBe("dialog")
    expect(overlay.getAttribute("aria-modal")).toBe("true")
    const labelId = heading.getAttribute("id")
    expect(labelId).toBeTruthy()
    expect(overlay.getAttribute("aria-labelledby")).toBe(labelId)
  })

  test("background helper excludes the overlay and reads root children at call time", () => {
    const { root, refs } = build()
    const overlay = refs.overlay as unknown as FakeElement
    const sparButton = refs.sparButton as unknown as FakeElement
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

describe("spar setup arms without launching", () => {
  test("a fresh setup shows Press armed and exposes one live launch entry", () => {
    const { refs } = build()
    const [press, circle, kite, counter] = tacticButtons(refs)
    expect(press?.classList.contains("on")).toBe(true)
    for (const other of [circle, kite, counter]) {
      expect(other?.classList.contains("on")).toBe(false)
    }
    expect(refs.armed()).toBe("press")
    expect(typeof refs.launch).toBe("function")
  })

  test("a tactic tap arms + highlights only; no runBattle or arena entry", () => {
    const { refs, spy } = build()
    const kite = tacticButtons(refs)[2]
    expect(kite).toBeDefined()
    if (!kite) return
    click(kite)
    expect(spy.armed).toEqual(["kite"])
    expect(spy.launches).toBe(0)
    expect(kite.classList.contains("on")).toBe(true)
    expect(tacticButtons(refs)[0]?.classList.contains("on")).toBe(false)
    expect(refs.armed()).toBe("kite")
  })

  test("rapid re-taps leave the last tactic armed, still without launching", () => {
    const { refs, spy } = build()
    for (const index of [2, 1, 3]) {
      const button = tacticButtons(refs)[index]
      if (!button) throw new Error("Missing doctrine button")
      click(button)
    }
    expect(spy.armed).toEqual(["kite", "circle", "counter"])
    expect(spy.launches).toBe(0)
    const last = tacticButtons(refs)[3]
    expect(last).toBeDefined()
    if (!last) return
    const lit = tacticButtons(refs).filter((button) =>
      button.classList.contains("on"),
    )
    expect(lit).toEqual([last])
    expect(refs.armed()).toBe("counter")
  })

  test("a rule tap only picks the note; it never launches", () => {
    const { refs, spy } = build()
    const buttons = ruleButtons(refs)
    const first = buttons[0]
    const real = buttons[1]
    expect(first).toBeDefined()
    expect(real).toBeDefined()
    if (!first || !real) return
    click(real)
    const picked = spy.picked[0]
    expect(spy.picked.length).toBe(1)
    expect(picked).not.toBeNull()
    if (picked === undefined) return
    expect(refs.rule()).toBe(picked)
    expect(spy.launches).toBe(0)
    click(first)
    expect(spy.picked[1]).toBeNull()
    expect(spy.launches).toBe(0)
  })

  test("a kit tap only sets the loadout; it never launches", () => {
    const { refs, spy } = build()
    let loadoutCalls = 0
    refreshPrep(refs, createCreature("fire_drake", 7), () => {
      loadoutCalls += 1
    })
    const strip = refs.kitStrip as unknown as FakeElement
    const kitButtons = strip.children[0]?.children ?? []
    expect(kitButtons.length).toBeGreaterThan(0)
    const unlocked = kitButtons.find((button) => !button.disabled)
    expect(unlocked).toBeDefined()
    if (!unlocked) return
    click(unlocked)
    expect(loadoutCalls).toBe(1)
    expect(spy.launches).toBe(0)
    expect(spy.armed).toEqual([])
  })

  test("only the exposed launch entry starts a bout", () => {
    const { refs, spy } = build()
    expect(spy.launches).toBe(0)
    refs.launch()
    expect(spy.launches).toBe(1)
  })

  test("markArmedTactic restores Press for the next normal or ghost setup", () => {
    const { refs } = build()
    const kite = tacticButtons(refs)[2]
    if (!kite) throw new Error("Missing doctrine button")
    click(kite)
    expect(kite.classList.contains("on")).toBe(true)
    markArmedTactic(refs, "press")
    expect(tacticButtons(refs)[0]?.classList.contains("on")).toBe(true)
    expect(kite.classList.contains("on")).toBe(false)
  })
})
