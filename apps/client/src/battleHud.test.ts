import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  chevronsFor,
  createBattleHud,
  hitReaction,
  hpFraction,
  plateName,
  type RangeState,
  rangeAfterStep,
} from "./battleHud"

describe("rangeAfterStep", () => {
  const cases: Array<{
    name: string
    kind: Parameters<typeof rangeAfterStep>[0]
    prev: RangeState
    expected: RangeState
  }> = [
    {
      name: "an approach closes the distance",
      kind: "approach",
      prev: "hold",
      expected: "close",
    },
    {
      name: "a close stays close",
      kind: "approach",
      prev: "close",
      expected: "close",
    },
    {
      name: "a hold keeps the previous state",
      kind: "idle",
      prev: "hold",
      expected: "hold",
    },
    {
      name: "a strike does not change range",
      kind: "melee",
      prev: "close",
      expected: "close",
    },
    {
      name: "a launch does not change range",
      kind: "projectile",
      prev: "hold",
      expected: "hold",
    },
    {
      name: "an impact does not change range",
      kind: "impact",
      prev: "close",
      expected: "close",
    },
    {
      name: "a down does not change range",
      kind: "down",
      prev: "hold",
      expected: "hold",
    },
    {
      name: "the judge call does not change range",
      kind: "judge",
      prev: "close",
      expected: "close",
    },
  ]
  for (const { name, kind, prev, expected } of cases) {
    test(name, () => {
      expect(rangeAfterStep(kind, prev)).toBe(expected)
    })
  }
})

describe("hpFraction", () => {
  const cases: Array<{ hp: number; max: number; expected: number }> = [
    { hp: 45, max: 45, expected: 1 },
    { hp: 22, max: 45, expected: 22 / 45 },
    { hp: 0, max: 45, expected: 0 },
    // Overkill damage leaves hpAfter negative — the bar must floor at 0.
    { hp: -7, max: 45, expected: 0 },
    // A degenerate max must never divide by zero.
    { hp: 10, max: 0, expected: 0 },
  ]
  for (const { hp, max, expected } of cases) {
    test(`hp ${hp} of ${max} → ${expected}`, () => {
      expect(hpFraction(hp, max)).toBe(expected)
    })
  }
})

describe("hpFraction", () => {
  test("caps at 1 when hp somehow exceeds max", () => {
    expect(hpFraction(50, 45)).toBe(1)
  })
})

describe("hitReaction", () => {
  const cases: Array<{
    name: string
    damage: number | undefined
    expected: { jolt: boolean; kick: boolean }
  }> = [
    {
      name: "a missed shot causes no reaction",
      damage: undefined,
      expected: { jolt: false, kick: false },
    },
    {
      name: "a zero-damage chip causes no reaction",
      damage: 0,
      expected: { jolt: false, kick: false },
    },
    {
      name: "a light hit jolts the plate",
      damage: 5,
      expected: { jolt: true, kick: false },
    },
    {
      name: "a heavy special kicks the whole placard",
      damage: 19,
      expected: { jolt: true, kick: true },
    },
    // The kick threshold itself: 14 stays a jolt, 15 crosses over.
    {
      name: "14 damage is still a jolt",
      damage: 14,
      expected: { jolt: true, kick: false },
    },
    {
      name: "15 damage crosses the kick line",
      damage: 15,
      expected: { jolt: true, kick: true },
    },
  ]
  for (const { name, damage, expected } of cases) {
    test(name, () => {
      expect(hitReaction(damage)).toEqual(expected)
    })
  }
})

describe("chevronsFor", () => {
  test("holding range lights one chevron", () => {
    expect(chevronsFor("hold")).toBe(1)
  })
  test("close quarters lights all three", () => {
    expect(chevronsFor("close")).toBe(3)
  })
})

describe("plateName — the plate names the doctrine (FR-16, AC-15)", () => {
  const EMBER = { name: "Ember", key: "ember", element: "fire", maxHp: 80 }

  test("a fighter with a doctrine shows it beside the name", () => {
    expect(plateName({ ...EMBER, doctrine: "kite" })).toBe("Ember · Kite")
  })

  test("a fighter with no doctrine shows only the name", () => {
    expect(plateName(EMBER)).toBe("Ember")
  })

  test("all four doctrines have a label", () => {
    const labels = (["press", "circle", "kite", "counter"] as const).map(
      (doctrine) => plateName({ ...EMBER, doctrine }),
    )
    expect(labels).toEqual([
      "Ember · Press",
      "Ember · Circle",
      "Ember · Kite",
      "Ember · Counter",
    ])
  })

  test("a rule rides after the doctrine on the same plate (FR-13)", () => {
    expect(plateName({ ...EMBER, doctrine: "kite", rule: "read_tell" })).toBe(
      "Ember · Kite · Read the tell",
    )
  })

  test("a rule with no doctrine still shows, and all four have a label", () => {
    const labels = (
      ["save_heavy", "read_tell", "keep_back", "never_trade"] as const
    ).map((rule) => plateName({ ...EMBER, rule }))
    expect(labels).toEqual([
      "Ember · Save the heavy",
      "Ember · Read the tell",
      "Ember · Keep something back",
      "Ember · Never trade",
    ])
  })
})

/** Minimal DOM stub: createBattleHud only needs these element surfaces. */
let reflowReads = 0

class FakeElement {
  tagName: string
  children: FakeElement[] = []
  textContent: string | null = null
  innerHTML = ""
  attributes: Record<string, string> = {}
  private classSet = new Set<string>()
  style: {
    display: string
    width: string
    transition: string
    setProperty(name: string, value: string): void
  }
  classList: {
    add(...names: string[]): void
    remove(...names: string[]): void
    toggle(name: string, force?: boolean): void
    contains(name: string): boolean
  }

  constructor(tag = "div") {
    this.tagName = tag.toUpperCase()
    const self = this
    this.style = {
      display: "",
      width: "",
      transition: "",
      setProperty(name: string, value: string): void {
        self.attributes[`style:${name}`] = value
      },
    }
    this.classList = {
      add(...names: string[]): void {
        for (const name of names) self.classSet.add(name)
      },
      remove(...names: string[]): void {
        for (const name of names) self.classSet.delete(name)
      },
      toggle(name: string, force?: boolean): void {
        if (force ?? !self.classSet.has(name)) self.classSet.add(name)
        else self.classSet.delete(name)
      },
      contains(name: string): boolean {
        return self.classSet.has(name)
      },
    }
  }

  get className(): string {
    return [...this.classSet].join(" ")
  }

  set className(value: string) {
    this.classSet = new Set(value.split(" ").filter(Boolean))
  }

  get offsetWidth(): number {
    reflowReads += 1
    return 0
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value
  }

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes)
  }

  prepend(...nodes: FakeElement[]): void {
    this.children.unshift(...nodes)
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.children = nodes
  }
}

function find(root: FakeElement, className: string): FakeElement {
  const walk = (node: FakeElement): FakeElement | null => {
    if (node.classList.contains(className)) return node
    for (const child of node.children) {
      const found = walk(child)
      if (found) return found
    }
    return null
  }
  const found = walk(root)
  if (!found) throw new Error(`missing .${className}`)
  return found
}

type HudFight = Parameters<ReturnType<typeof createBattleHud>["show"]>[0]
const FIGHT = {
  owned: { name: "Ember Drake", key: "left", element: "fire", maxHp: 40 },
  rival: { name: "Tide Axolotl", key: "right", element: "water", maxHp: 44 },
} as unknown as HudFight

const realDocument = globalThis.document

beforeAll(() => {
  globalThis.document = {
    createElement: (tag: string) => new FakeElement(tag),
  } as unknown as Document
})

afterAll(() => {
  globalThis.document = realDocument
})

describe("createBattleHud — verdict stamp DOM and lifecycle", () => {
  const mount = () => {
    const overlay = new FakeElement()
    const hud = createBattleHud(overlay as unknown as HTMLElement)
    const stamp = find(overlay.children[0] ?? new FakeElement(), "battle-stamp")
    return {
      hud,
      stamp,
      title: find(stamp, "battle-stamp-title"),
      sub: find(stamp, "battle-stamp-sub"),
    }
  }

  test("the stamp has four divs in title/rule/sub order with exact classes", () => {
    const { stamp } = mount()
    expect(stamp.tagName).toBe("DIV")
    expect(stamp.className).toBe("battle-stamp")
    expect(stamp.children.map((child) => child.className)).toEqual([
      "battle-stamp-title",
      "battle-stamp-rule",
      "battle-stamp-sub",
    ])
    for (const child of stamp.children) expect(child.tagName).toBe("DIV")
  })

  test("the stamp root is a polite status region", () => {
    const { stamp } = mount()
    expect(stamp.attributes).toMatchObject({
      role: "status",
      "aria-live": "polite",
    })
  })

  test("show() clears the in and show classes", () => {
    const { hud, stamp } = mount()
    stamp.classList.add("battle-stamp-in")
    stamp.classList.add("battle-stamp-show")
    hud.show(FIGHT)
    expect(stamp.classList.contains("battle-stamp-in")).toBe(false)
    expect(stamp.classList.contains("battle-stamp-show")).toBe(false)
    expect(stamp.className).toBe("battle-stamp")
  })

  test("stamp() writes texts, shows the stamp and replays the in animation", () => {
    const { hud, stamp, title, sub } = mount()
    const before = reflowReads
    hud.stamp("Victory", "Ember Drake takes the Bronze Cup!")
    expect(title.textContent).toBe("Victory")
    expect(sub.textContent).toBe("Ember Drake takes the Bronze Cup!")
    expect(stamp.classList.contains("battle-stamp-show")).toBe(true)
    expect(stamp.classList.contains("battle-stamp-in")).toBe(true)
    // replayClass forces a reflow so the animation restarts on repeat calls.
    expect(reflowReads).toBeGreaterThan(before)
    const afterFirst = reflowReads
    hud.stamp("Defeat", "Tide Axolotl takes the Bronze Cup.")
    expect(stamp.classList.contains("battle-stamp-in")).toBe(true)
    expect(reflowReads).toBeGreaterThan(afterFirst)
  })

  test("hideStamp() removes both the show and in classes", () => {
    const { hud, stamp } = mount()
    hud.stamp("Victory", "done")
    hud.hideStamp()
    expect(stamp.classList.contains("battle-stamp-show")).toBe(false)
    expect(stamp.classList.contains("battle-stamp-in")).toBe(false)
    expect(stamp.className).toBe("battle-stamp")
  })
})
