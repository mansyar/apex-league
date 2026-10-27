import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { createCreature, createInitialState, type GameState } from "@apex/sim"
import {
  apPipPlan,
  climbAnnouncement,
  conditionDelta,
  ladderRead,
  lineageMeta,
  promotionLine,
  statCell,
} from "./plates"
import {
  buildCreaturePlate,
  formChipTitle,
  paintBranchBadge,
  paintFormChip,
} from "./plates-creature"
import {
  buildScoreBug,
  paintScoreBug,
  type ScoreBugPaint,
} from "./plates-score"

const ladder = (
  tier: GameState["ladder"]["tier"],
  subTier: GameState["ladder"]["subTier"],
  points: number,
): GameState["ladder"] => ({ tier, subTier, points })

describe("ladderRead", () => {
  test("golden: Bronze III reads progress toward Bronze II (6)", () => {
    expect(ladderRead(ladder("bronze", "III", 0))).toEqual({
      tierName: "Bronze",
      rank: "Bronze III",
      points: "0/6",
      ariaLabel: "League standing: Bronze III, 0 of 6 points toward Bronze II",
      tierClass: "bronze",
      titles: null,
    })
  })

  test("golden: Bronze II reads progress toward Bronze I (12)", () => {
    expect(ladderRead(ladder("bronze", "II", 7))).toEqual({
      tierName: "Bronze",
      rank: "Bronze II",
      points: "7/12",
      ariaLabel: "League standing: Bronze II, 7 of 12 points toward Bronze I",
      tierClass: "bronze",
      titles: null,
    })
  })

  test("golden: Bronze I banks its points toward Silver", () => {
    expect(ladderRead(ladder("bronze", "I", 15))).toEqual({
      tierName: "Bronze",
      rank: "Bronze I",
      points: "15 pts",
      ariaLabel: "League standing: Bronze I, 15 points banked",
      tierClass: "bronze",
      titles: null,
    })
  })

  test("golden: Silver III reads progress toward Silver II (18)", () => {
    expect(ladderRead(ladder("silver", "III", 10))).toEqual({
      tierName: "Silver",
      rank: "Silver III",
      points: "10/18",
      ariaLabel:
        "League standing: Silver III, 10 of 18 points toward Silver II",
      tierClass: "silver",
      titles: null,
    })
  })

  test("golden: Silver II reads progress toward Silver I (24)", () => {
    expect(ladderRead(ladder("silver", "II", 20))).toEqual({
      tierName: "Silver",
      rank: "Silver II",
      points: "20/24",
      ariaLabel: "League standing: Silver II, 20 of 24 points toward Silver I",
      tierClass: "silver",
      titles: null,
    })
  })

  test("golden: Silver I is the apex — points banked", () => {
    expect(ladderRead(ladder("silver", "I", 30))).toEqual({
      tierName: "Silver",
      rank: "Silver I",
      points: "30 pts",
      ariaLabel: "League standing: Silver I, 30 points banked",
      tierClass: "silver",
      titles: null,
    })
  })

  test("golden: Gold III reads progress toward Gold II (30)", () => {
    expect(ladderRead(ladder("gold", "III", 27))).toEqual({
      tierName: "Gold",
      rank: "Gold III",
      points: "27/30",
      ariaLabel: "League standing: Gold III, 27 of 30 points toward Gold II",
      tierClass: "gold",
      titles: null,
    })
  })

  test("golden: Gold II reads progress toward Gold I (36)", () => {
    expect(ladderRead(ladder("gold", "II", 31))).toEqual({
      tierName: "Gold",
      rank: "Gold II",
      points: "31/36",
      ariaLabel: "League standing: Gold II, 31 of 36 points toward Gold I",
      tierClass: "gold",
      titles: null,
    })
  })

  test("golden: Gold I is the apex — points bank toward the Legend gate", () => {
    expect(ladderRead(ladder("gold", "I", 38))).toEqual({
      tierName: "Gold",
      rank: "Gold I",
      points: "38 pts",
      ariaLabel: "League standing: Gold I, 38 points banked",
      tierClass: "gold",
      titles: null,
    })
  })

  test("golden: Legend I is the plateau — banked points plus collected titles", () => {
    expect(ladderRead(ladder("legend", "I", 41), 2)).toEqual({
      tierName: "Legend",
      rank: "Legend I",
      points: "41 pts",
      ariaLabel: "League standing: Legend I, 41 points banked, 2 legend titles",
      tierClass: "legend",
      titles: "★ 2",
    })
  })

  test("golden: a fresh Legend has no titles segment", () => {
    expect(ladderRead(ladder("legend", "I", 39), 0).titles).toBeNull()
  })

  test("golden: legendTitles is ignored outside the plateau", () => {
    expect(ladderRead(ladder("gold", "I", 38), 2).titles).toBeNull()
  })
})

describe("climbAnnouncement", () => {
  test("golden: a sub-tier climb announces the new standing", () => {
    expect(
      climbAnnouncement(
        { tier: "gold", subTier: "III", points: 27 },
        { tier: "gold", subTier: "II", points: 30 },
      ),
    ).toBe("Promotion — Gold II!")
  })

  test("golden: a cross-tier promotion announces the new tier", () => {
    expect(
      climbAnnouncement(
        { tier: "silver", subTier: "I", points: 24 },
        { tier: "gold", subTier: "III", points: 27 },
      ),
    ).toBe("Promotion — Gold III!")
  })

  test("golden: the gold-to-legend plateau flip announces despite the same sub-tier", () => {
    expect(
      climbAnnouncement(
        { tier: "gold", subTier: "I", points: 36 },
        { tier: "legend", subTier: "I", points: 39 },
      ),
    ).toBe("Promotion — Legend I!")
  })

  test("golden: no announcement when the standing is unchanged", () => {
    expect(
      climbAnnouncement(
        { tier: "bronze", subTier: "II", points: 7 },
        { tier: "bronze", subTier: "II", points: 8 },
      ),
    ).toBeNull()
  })

  test("golden: the first update never announces", () => {
    expect(
      climbAnnouncement(null, { tier: "bronze", subTier: "III", points: 0 }),
    ).toBeNull()
  })
})

describe("apPipPlan", () => {
  test("golden: a plain day renders the daily max with no flash", () => {
    expect(apPipPlan(3, null)).toEqual({
      bonus: 0,
      clamped: 3,
      wantPips: 3,
      flash: null,
    })
  })

  test("golden: cup bonus points extend past the daily max", () => {
    expect(apPipPlan(5, null)).toEqual({
      bonus: 2,
      clamped: 3,
      wantPips: 5,
      flash: null,
    })
    expect(apPipPlan(12, null)).toEqual({
      bonus: 9,
      clamped: 3,
      wantPips: 12,
      flash: null,
    })
  })

  test("golden: a fresh spend flashes the drained pip", () => {
    expect(apPipPlan(2, 3)).toMatchObject({ flash: 2 })
    expect(apPipPlan(0, 3)).toMatchObject({ flash: 0, clamped: 0 })
  })

  test("golden: the first update never flashes", () => {
    expect(apPipPlan(3, null).flash).toBeNull()
  })
})

describe("conditionDelta", () => {
  test("golden: the first observation never flashes", () => {
    expect(conditionDelta(null, 80)).toEqual({ swing: 0, text: null })
  })

  test("golden: swings of ±2 or more produce a signed delta chip", () => {
    expect(conditionDelta(80, 82)).toEqual({ swing: 2, text: "+2" })
    expect(conditionDelta(80, 78)).toEqual({ swing: -2, text: "−2" })
    expect(conditionDelta(80, 85)).toEqual({ swing: 5, text: "+5" })
  })

  test("golden: small drift stays quiet", () => {
    expect(conditionDelta(80, 81)).toEqual({ swing: 1, text: null })
    expect(conditionDelta(80, 80)).toEqual({ swing: 0, text: null })
  })
})

describe("statCell", () => {
  const drake = createCreature("fire_drake", 42)

  test("golden: total is rolled base + trained, bonus shows when trained", () => {
    expect(statCell(drake, "hp")).toEqual({ total: drake.stats.hp, bonus: "" })
    const trained = { ...drake, trained: { ...drake.trained, hp: 3 } }
    expect(statCell(trained, "hp")).toEqual({
      total: drake.stats.hp + 3,
      bonus: "+3",
    })
  })
})

describe("lineageMeta", () => {
  test("golden: singular cup reads bare", () => {
    expect(lineageMeta(1, 2, 1)).toBe("Gen 1 · Prestige 2 · 1 cup")
  })

  test("golden: plural and zero cups", () => {
    expect(lineageMeta(0, 0, 3)).toBe("Gen 0 · Prestige 0 · 3 cups")
    expect(lineageMeta(2, 0, 0)).toBe("Gen 2 · Prestige 0 · 0 cups")
  })
})

describe("promotionLine", () => {
  test("golden: the promotion callout", () => {
    expect(promotionLine("Bronze", "II")).toBe("Promotion — Bronze II!")
    expect(promotionLine("Silver", "I")).toBe("Promotion — Silver I!")
  })
})

describe("form chip", () => {
  test("names the tier and its ATK consequence", () => {
    expect(formChipTitle("steady")).toBe("Steady: ATK +0")
    expect(formChipTitle("sluggish")).toBe("Sluggish: ATK -2")
  })

  test("paints the tier as text and the consequence as its label", () => {
    const attrs: Record<string, string> = {}
    const chip = {
      textContent: "",
      title: "",
      setAttribute: (key: string, value: string) => {
        attrs[key] = value
      },
    } as unknown as HTMLElement
    const sick = createCreature("fire_drake", 42)
    sick.conditions = { ...sick.conditions, health: 50 }

    paintFormChip(chip, sick)

    expect(chip.textContent).toBe("Sluggish · ATK -2")
    expect(chip.title).toBe("Sluggish: ATK -2")
    expect(attrs["aria-label"]).toBe("Sluggish: ATK -2")
  })
})

describe("branch badge", () => {
  function badge() {
    const attrs: Record<string, string> = {}
    const node = {
      textContent: "",
      title: "",
      hidden: false,
      setAttribute: (key: string, value: string) => {
        attrs[key] = value
      },
    } as unknown as HTMLElement
    return { node, attrs }
  }

  test("stays hidden for a baby, even past the hinted day", () => {
    const { node } = badge()
    paintBranchBadge(node, {
      ...createCreature("fire_drake", 42),
      ageDays: 6,
    })
    expect(node.hidden).toBe(true)
    expect(node.textContent).toBe("")
  })

  test("names the earned form with its favored stats", () => {
    const { node, attrs } = badge()
    paintBranchBadge(node, {
      ...createCreature("fire_drake", 42),
      stage: "juvenile",
      branch: "cinder_courser",
      ageDays: 20,
    })
    expect(node.hidden).toBe(false)
    expect(node.textContent).toBe("Cinder Courser · ATK + SPD")
    expect(node.title).toContain("ATK + SPD")
    expect(attrs["aria-label"]).toContain("Cinder Courser")
    expect(attrs.style).toContain("--hue: 30")
  })

  test("a legacy champion is labelled Legacy, never a real branch", () => {
    const { node } = badge()
    paintBranchBadge(node, {
      ...createCreature("fire_drake", 42),
      stage: "champion",
      branch: "legacy",
      ageDays: 40,
    })
    expect(node.textContent).toBe("Legacy")
    // No favored pair to list: the title is the old line itself.
    expect(node.title).toContain("no signature")
    expect(node.title).not.toContain("favors")
  })
})

/**
 * The plate builder is exercised against a minimal fake DOM so the branch
 * line's place in the header can be asserted without a browser: the line is a
 * sibling of the head row (not a chip), so a long label never squeezes the
 * creature name.
 */
interface FakeNode {
  className: string
  textContent: string
  innerHTML: string
  title: string
  type: string
  hidden: boolean
  offsetWidth: number
  style: {
    setProperty(key: string, value: string): void
    background: string
    display: string
  }
  classList: {
    add(...names: string[]): void
    remove(name: string): void
    toggle(name: string, force?: boolean): boolean
    contains(name: string): boolean
  }
  children: FakeNode[]
  parent: FakeNode | null
  attrs: Record<string, string>
  setAttribute(name: string, value: string): void
  getAttribute(name: string): string | null
  cloneNode(): FakeNode
  replaceChildren(...nodes: FakeNode[]): void
  append(...nodes: FakeNode[]): void
  addEventListener(): void
}

function fakeNode(): FakeNode {
  const classes = new Set<string>()
  const node: FakeNode = {
    className: "",
    textContent: "",
    innerHTML: "",
    title: "",
    type: "",
    hidden: false,
    offsetWidth: 0,
    style: { setProperty: () => {}, background: "", display: "" },
    classList: {
      add: (...names: string[]) => {
        for (const name of names) classes.add(name)
      },
      remove: (name: string) => {
        classes.delete(name)
      },
      toggle: (name: string, force?: boolean) => {
        if (force === undefined) {
          if (classes.has(name)) {
            classes.delete(name)
            return false
          }
          classes.add(name)
          return true
        }
        if (force) {
          classes.add(name)
          return true
        }
        classes.delete(name)
        return false
      },
      contains: (name: string) => classes.has(name),
    },
    children: [],
    parent: null,
    attrs: {},
    setAttribute: (name: string, value: string) => {
      node.attrs[name] = value
    },
    getAttribute: (name: string) => node.attrs[name] ?? null,
    cloneNode: () => {
      const copy = fakeNode()
      copy.className = node.className
      return copy
    },
    replaceChildren: (...nodes: FakeNode[]) => {
      node.children.length = 0
      for (const child of nodes) {
        child.parent = node
        node.children.push(child)
      }
    },
    append: (...nodes: FakeNode[]) => {
      for (const child of nodes) {
        child.parent = node
        node.children.push(child)
      }
    },
    addEventListener: () => {},
  }
  return node
}

describe("the plate's branch line", () => {
  const savedDocument = Object.getOwnPropertyDescriptor(globalThis, "document")

  beforeAll(() => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { createElement: () => fakeNode() },
    })
  })

  afterAll(() => {
    if (savedDocument === undefined) {
      Reflect.deleteProperty(globalThis, "document")
    } else {
      Object.defineProperty(globalThis, "document", savedDocument)
    }
  })

  test("sits under the head row, outside the chips, above the stats", () => {
    const refs = buildCreaturePlate()
    const root = refs.root as unknown as FakeNode
    const line = refs.branchBadge as unknown as FakeNode
    const headRow = refs.headRow as unknown as FakeNode
    const firstCell = refs.statCells[0]
    if (!firstCell) throw new Error("expected a stat cell")
    const statCell = (firstCell.total as unknown as FakeNode).parent
    const statRow = (statCell as FakeNode).parent as FakeNode
    const stageTab = refs.stageTab as unknown as FakeNode

    expect(line.parent).toBe(root)
    expect(root.children.indexOf(line)).toBe(root.children.indexOf(headRow) + 1)
    expect(root.children.indexOf(line)).toBeLessThan(
      root.children.indexOf(statRow),
    )
    // The chips still hold exactly the stage tab and the form chip.
    const chips = stageTab.parent as FakeNode
    expect(chips.children.length).toBe(2)
    expect(chips.children[0]).toBe(stageTab)
    expect(chips.children[1]).toBe(refs.formChip as unknown as FakeNode)
  })

  test("paints the whole label and favored stats, then hides for a baby", () => {
    const refs = buildCreaturePlate()
    const line = refs.branchBadge

    paintBranchBadge(line, {
      ...createCreature("fire_drake", 42),
      stage: "juvenile",
      branch: "cinder_courser",
      ageDays: 20,
    })
    expect(line.hidden).toBe(false)
    expect(line.textContent).toBe("Cinder Courser · ATK + SPD")

    // A baby hides the line again even past the hinted day.
    paintBranchBadge(line, {
      ...createCreature("fire_drake", 42),
      ageDays: 6,
    })
    expect(line.hidden).toBe(true)
    expect(line.textContent).toBe("")
  })
})

describe("score-bug trophy", () => {
  const savedDocument = Object.getOwnPropertyDescriptor(globalThis, "document")

  beforeAll(() => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { createElement: () => fakeNode() },
    })
  })

  afterAll(() => {
    if (savedDocument === undefined) {
      Reflect.deleteProperty(globalThis, "document")
    } else {
      Object.defineProperty(globalThis, "document", savedDocument)
    }
  })

  function paintCups(cupsWon: number) {
    const refs = buildScoreBug()
    const paint: ScoreBugPaint = {
      prevAp: null,
      prevLadder: null,
      climbLine: null,
      apPips: [],
    }
    paintScoreBug(refs, null, { ...createInitialState(), cupsWon }, paint)
    return refs
  }

  test("builds as an image so the painted count is announced", () => {
    const refs = buildScoreBug()
    // The role is set at build time: without it assistive tech ignores
    // aria-label on a generic span and the painted name stays inert.
    expect(refs.trophy.getAttribute("role")).toBe("img")
  })

  test("names the visible count at three cups", () => {
    const refs = paintCups(3)
    expect(refs.trophy.getAttribute("role")).toBe("img")
    expect(refs.trophy.getAttribute("aria-label")).toContain("3")
    expect(refs.trophyCount.textContent).toBe("× 3")
    expect(refs.trophy.style.display).toBe("")
  })

  test("keeps the name while hidden at zero cups", () => {
    const refs = paintCups(0)
    expect(refs.trophy.getAttribute("role")).toBe("img")
    expect(refs.trophy.getAttribute("aria-label")).toBe("Cup championships: 0")
    expect(refs.trophyCount.textContent).toBe("× 0")
    expect(refs.trophy.style.display).toBe("none")
  })
})
