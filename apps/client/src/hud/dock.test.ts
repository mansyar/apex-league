import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  type CareRejection,
  type Creature,
  createCreature,
  createInitialState,
  TRAINING_CAP,
  type TrainingProgram,
} from "@apex/sim"
import { REJECTION_COPY } from "./copy"
import { buildCommandDock, careButtonLine, trainButtonState } from "./dock"

const fresh = createCreature("fire_drake", 42)

function trained(overrides: Partial<Creature["trained"]>): Creature {
  return { ...fresh, trained: { ...fresh.trained, ...overrides } }
}

function assigned(program: TrainingProgram | null): Creature {
  return { ...fresh, trainingProgram: program }
}

describe("care buttons' inline state", () => {
  test("a ready action shows its state and AP cost without a reason", () => {
    expect(careButtonLine({ ok: true, state: createInitialState() })).toBe(
      "Ready · 1 AP",
    )
  })

  const reasons: CareRejection[] = [
    "no-creature",
    "no-ap",
    "not-sick",
    "too-sick",
    "too-tired",
  ]
  for (const reason of reasons) {
    test(`${reason} shows cost and reason in the button's own text`, () => {
      expect(careButtonLine({ ok: false, reason })).toBe(
        `Unavailable · 1 AP · ${REJECTION_COPY[reason]}`,
      )
    })
  }

  test("pins the no-AP wording used by every gated care button", () => {
    expect(careButtonLine({ ok: false, reason: "no-ap" })).toBe(
      "Unavailable · 1 AP · No AP left today.",
    )
  })
})

describe("the train control", () => {
  test("invites a pick when nothing is assigned", () => {
    expect(trainButtonState(fresh, 3)).toEqual({
      disabled: false,
      reason: null,
      label: "Choose tonight's training",
      cost: "1 AP",
      focus: false,
      line: "Ready · 1 AP",
    })
  })

  test("names the assigned program in its own label", () => {
    expect(trainButtonState(assigned("sprint"), 3).label).toBe(
      "Training: Sprint Work",
    )
    expect(trainButtonState(assigned("ring"), 3).label).toBe(
      "Training: Ring Craft",
    )
  })

  test("drops the AP badge once a program is set: a re-point is free", () => {
    expect(trainButtonState(assigned("power"), 0)).toEqual({
      disabled: false,
      reason: null,
      label: "Training: Power Lifting",
      cost: null,
      focus: true,
      line: "Ready · Free re-point",
    })
  })

  test("closes at 0 AP only when nothing is assigned", () => {
    expect(trainButtonState(fresh, 0)).toEqual({
      disabled: true,
      reason: REJECTION_COPY["no-ap"],
      label: "Choose tonight's training",
      cost: null,
      focus: false,
      line: "Unavailable · 1 AP · No AP left today.",
    })
  })

  test("closes only when every program's primary is capped", () => {
    const capped = trained({
      hp: TRAINING_CAP,
      atk: TRAINING_CAP,
      def: TRAINING_CAP,
      spd: TRAINING_CAP,
    })
    expect(trainButtonState(capped, 3)).toEqual({
      disabled: true,
      reason: "Nothing left to train for now.",
      label: "Choose tonight's training",
      cost: null,
      focus: false,
      line: "Unavailable · 1 AP · Nothing left to train for now.",
    })
  })

  test("a capped primary keeps the picker open while a trickle has room", () => {
    expect(trainButtonState(trained({ atk: TRAINING_CAP }), 3).disabled).toBe(
      false,
    )
  })
})

/** Minimal DOM stub: the dock builder only creates elements and queries classes. */
class FakeElement {
  tagName: string
  children: FakeElement[] = []
  textContent: string | null = null
  innerHTML = ""
  attributes: Record<string, string> = {}
  dataset: Record<string, string> = {}
  disabled = false
  hidden = false
  title = ""
  type = ""
  tabIndex = 0
  style = { display: "", setProperty: () => {} }
  private classSet = new Set<string>()
  classList = {
    add: (...names: string[]) => {
      for (const name of names) this.classSet.add(name)
    },
  }

  constructor(tag = "div") {
    this.tagName = tag.toUpperCase()
  }

  get className(): string {
    return [...this.classSet].join(" ")
  }

  set className(value: string) {
    this.classSet = new Set(value.split(" ").filter(Boolean))
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value
  }

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes)
  }

  addEventListener(): void {}

  querySelector(selector: string): FakeElement | null {
    const wanted = selector.replace(/^\./, "")
    const walk = (node: FakeElement): FakeElement | null => {
      if (node.classSet.has(wanted)) return node
      for (const child of node.children) {
        const found = walk(child)
        if (found) return found
      }
      return null
    }
    for (const child of this.children) {
      const found = walk(child)
      if (found) return found
    }
    return null
  }
}

/** The cost segment of a dock state line: `Ready · 1 AP` → `1 AP`. */
function costOf(line: string): string {
  const cost = line.split(" · ")[1]
  if (!cost) throw new Error("state line has no cost segment")
  return cost
}

describe("the dock's AP badges", () => {
  const realDocument = globalThis.document

  beforeAll(() => {
    globalThis.document = {
      createElement: (tag: string) => new FakeElement(tag),
    } as unknown as Document
  })

  afterAll(() => {
    globalThis.document = realDocument
  })

  test("care and train badges match the cost of the inline state line", () => {
    const refs = buildCommandDock({
      onCare: () => {},
      onTrain: () => {},
      onClosePicker: () => {},
      onAdvanceDay: () => {},
      onGraduate: () => {},
    })
    const cost = costOf(
      careButtonLine({ ok: true, state: createInitialState() }),
    )
    for (const { button: btn } of refs.actionButtons) {
      expect(btn.querySelector(".kit-button-cost")?.textContent).toBe(cost)
    }
    expect(
      refs.trainButton.querySelector(".kit-button-cost")?.textContent,
    ).toBe(cost)
  })
})
