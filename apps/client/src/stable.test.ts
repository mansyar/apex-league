/**
 * The stable surface (stable & partner reserve FR-9): the decisions behind the
 * modal — what a waiting pet reads as, when the chip shows, and what a refused
 * swap says.
 *
 * The DOM around these rules is verified in the browser (the Phase 3 visual
 * pass); these are the decisions under it.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import {
  type Creature,
  chooseStarter,
  createCreature,
  createGiftEgg,
  createInitialState,
  type GameState,
  renameStablePet,
} from "@apex/sim"
import {
  ageLabel,
  buildStableModal,
  STABLE_EMPTY_COPY,
  type StableModalOptions,
  stableChipVisible,
  stableMeta,
  stableRefusalCopy,
  stableRow,
  stableRows,
} from "./stable"
import { stableRenameRefusalCopy } from "./stable-rename"

/** A waiting pet: the starter species, renamed and aged. */
const pet = (over: Partial<Creature> = {}): Creature => ({
  ...createCreature("fire_drake", 42),
  name: "Rolo",
  ...over,
})

/** A ranch with one pet in it and `stable` pets waiting. */
const stateWith = (stable: Creature[]): GameState => {
  const base = chooseStarter(createInitialState(), "fire_drake", 42)
  return { ...base, stable }
}

describe("ageLabel", () => {
  test("counts the pet's own days", () => {
    expect(ageLabel(1)).toBe("1 day")
    expect(ageLabel(12)).toBe("12 days")
    expect(ageLabel(60)).toBe("60 days")
  })
})

describe("stableRow", () => {
  test("reads name, species, stage and the pet's own age", () => {
    const row = stableRow(pet({ name: "Rolo", ageDays: 12 }), 0)
    expect(row.id).toBe("stable:0")
    expect(row.name).toBe("Rolo")
    expect(row.species).toBe("Ember Drake")
    expect(row.stage).toBe("Baby")
    expect(row.age).toBe("12 days")
  })

  test("the slot id is the sim's own, so the swap can address the pet", () => {
    expect(stableRow(pet(), 2).id).toBe("stable:2")
  })
})

describe("stableMeta — the line a waiting pet reads as", () => {
  test("an unrenamed pet does not repeat its species", () => {
    const row = stableRow(pet({ name: "Ember Drake", ageDays: 12 }), 0)
    expect(row.species).toBeNull()
    expect(stableMeta(row)).toBe("Baby · 12 days")
  })

  test("a renamed pet still says what it is", () => {
    const row = stableRow(pet({ name: "Rolo", ageDays: 12 }), 0)
    expect(row.species).toBe("Ember Drake")
    expect(stableMeta(row)).toBe("Ember Drake · Baby · 12 days")
  })

  test("the comparison ignores case, so a name that matches reads cleanly", () => {
    const row = stableRow(pet({ name: "ember drake" }), 0)
    expect(row.species).toBeNull()
    expect(stableMeta(row)).toBe("Baby · 1 day")
  })

  test("a renamed pet of the gift species keeps the species line", () => {
    const hound = createGiftEgg("electric_hound", 4242)
    const row = stableRow({ ...hound, name: "Rolo" }, 0)
    expect(row.species).toBe("Storm Hound")
    expect(stableMeta(row)).toBe("Storm Hound · Baby · 1 day")
  })
})

describe("stableRows", () => {
  test("lists every waiting pet in stable order", () => {
    const rows = stableRows(
      stateWith([
        pet({ name: "Rolo", ageDays: 3 }),
        pet({ name: "Bramble", ageDays: 9, stage: "juvenile" }),
      ]),
    )
    expect(rows.map((row) => row.id)).toEqual(["stable:0", "stable:1"])
    expect(rows.map((row) => row.name)).toEqual(["Rolo", "Bramble"])
    expect(rows[1]?.stage).toBe("Juvenile")
    expect(rows[1]?.age).toBe("9 days")
  })

  test("an empty stable lists nothing", () => {
    expect(stableRows(stateWith([]))).toEqual([])
  })
})

describe("stableChipVisible", () => {
  test("the chip stays while the stable is empty — the empty state must be reachable", () => {
    expect(stableChipVisible(stateWith([]))).toBe(true)
  })

  test("the chip shows as soon as a pet waits", () => {
    expect(stableChipVisible(stateWith([pet()]))).toBe(true)
  })
})

describe("stableRefusalCopy", () => {
  test("the day-phase lock reads as coaching, never a dead button", () => {
    const copy = stableRefusalCopy("cup-phase")
    expect(copy).toContain("cup")
    expect(copy.length).toBeGreaterThan(0)
  })

  test("every refusal says something", () => {
    for (const reason of [
      "cup-phase",
      "no-creature",
      "only-pet",
      "unknown-pet",
    ] as const) {
      expect(stableRefusalCopy(reason).length).toBeGreaterThan(0)
    }
  })
})

describe("the empty stable", () => {
  test("the modal says so in words, never a blank panel", () => {
    expect(STABLE_EMPTY_COPY).toContain("No pets in the stable yet")
  })
})

/* ---- The modal's DOM: a tiny fake, no framework ---- */

type Listener = (event: unknown) => void

/** Where the last `focus()` landed — the fake tree has no focus ring. */
let lastFocused: FakeElement | null = null

class FakeElement {
  className = ""
  textContent = ""
  hidden = false
  type = ""
  innerHTML = ""
  value = ""
  maxLength = 0
  title = ""
  isConnected = true
  parent: FakeElement | null = null
  readonly children: FakeElement[] = []
  readonly attributes: Record<string, string> = {}
  private readonly classNames = new Set<string>()
  private readonly listeners = new Map<string, Listener[]>()

  readonly classList = {
    add: (...names: string[]): void => {
      for (const name of names) this.classNames.add(name)
    },
    remove: (...names: string[]): void => {
      for (const name of names) this.classNames.delete(name)
    },
    toggle: (name: string, on: boolean): void => {
      if (on) this.classNames.add(name)
      else this.classNames.delete(name)
    },
    contains: (name: string): boolean =>
      this.classNames.has(name) || this.className.split(/\s+/).includes(name),
  }

  readonly style = {
    display: "",
    width: "",
    height: "",
    setProperty: (_name: string, _value: string): void => {},
  }

  append(...nodes: FakeElement[]): void {
    for (const node of nodes) {
      node.parent = this
      this.children.push(node)
    }
  }

  replaceChildren(...nodes: FakeElement[]): void {
    this.children.length = 0
    this.append(...nodes)
  }

  addEventListener(type: string, handler: Listener): void {
    const handlers = this.listeners.get(type) ?? []
    handlers.push(handler)
    this.listeners.set(type, handlers)
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value
  }

  focus(): void {
    lastFocused = this
  }

  getClientRects(): unknown[] {
    return []
  }

  querySelectorAll(): FakeElement[] {
    return []
  }

  /** Deliver `event` to the handlers registered for `type`. */
  fire(type: string, event: unknown): void {
    for (const handler of this.listeners.get(type) ?? []) handler(event)
  }
}

const realDocument = Object.getOwnPropertyDescriptor(globalThis, "document")
const realHTMLElement = Object.getOwnPropertyDescriptor(
  globalThis,
  "HTMLElement",
)

beforeAll(() => {
  Object.defineProperty(globalThis, "document", {
    value: { createElement: () => new FakeElement(), activeElement: null },
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, "HTMLElement", {
    value: FakeElement,
    configurable: true,
    writable: true,
  })
})

afterAll(() => {
  for (const [name, descriptor] of [
    ["document", realDocument],
    ["HTMLElement", realHTMLElement],
  ] as const) {
    if (descriptor) {
      Object.defineProperty(globalThis, name, descriptor)
    } else {
      Reflect.deleteProperty(globalThis, name)
    }
  }
})

/** The fake element behind a HUD node: this harness's document made every one. */
function fakeOf(node: HTMLElement): FakeElement {
  return node as unknown as FakeElement
}

/** Every element in the tree, depth first. */
function nodesIn(root: FakeElement): FakeElement[] {
  return [root, ...root.children.flatMap(nodesIn)]
}

/** Every element carrying `className`, in document order. */
function classNamed(root: FakeElement, className: string): FakeElement[] {
  return nodesIn(root).filter((node) => node.classList.contains(className))
}

function byClass(root: FakeElement, className: string): FakeElement {
  const [node] = classNamed(root, className)
  if (!node) throw new Error(`nothing has class ${className}`)
  return node
}

/** Handlers that do nothing: the tests supply the one they care about. */
function quietHandlers(): StableModalOptions {
  return {
    onBringToRanch: () => null,
    onRename: () => ({ ok: false, reason: "unknown-pet" }),
    onSwapped: () => {},
  }
}

describe("the modal with an empty stable", () => {
  test("the empty state is there, in words, and the note is a live region", () => {
    const modal = buildStableModal(quietHandlers())
    modal.open(stateWith([]))
    const root = fakeOf(modal.root)
    const empty = byClass(root, "stable-empty")
    expect(empty.hidden).toBe(false)
    expect(empty.textContent).toBe(STABLE_EMPTY_COPY)
    expect(byClass(root, "stable-note").attributes.role).toBe("status")
    expect(classNamed(root, "stable-pet")).toHaveLength(0)
  })
})

describe("renaming a waiting pet", () => {
  test("the pencil on the row is a labelled house icon button", () => {
    const modal = buildStableModal(quietHandlers())
    modal.open(stateWith([pet({ name: "Waiting" })]))
    const pencil = byClass(fakeOf(modal.root), "rename-button")
    expect(pencil.attributes["aria-label"]).toBe("Rename Waiting")
    // The house sizes the control (26 px on the desktop, the phone tier's
    // 44 px floor), so the pencil carries no inline size of its own.
    expect(pencil.style.width).toBe("")
    expect(pencil.style.height).toBe("")
  })

  test("the pencil renames the pet and the change is committed", () => {
    let state = stateWith([pet({ name: "Waiting" })])
    const modal = buildStableModal({
      ...quietHandlers(),
      onRename: (creatureId, name) => {
        const result = renameStablePet(state, creatureId, name)
        if (!result.ok) return result
        // The app commits the sim's answer.
        state = result.state
        return result
      },
    })
    modal.open(state)
    const root = fakeOf(modal.root)
    byClass(root, "rename-button").fire("click", {})
    const input = byClass(root, "stable-pet-input")
    expect(input.attributes["aria-label"]).toBe("New name for Waiting")
    expect(lastFocused).toBe(input)
    input.value = "Rolo"
    byClass(root, "stable-pet-save").fire("click", {})
    // The name is committed...
    expect(state.stable[0]?.name).toBe("Rolo")
    // ...and the row says so.
    expect(byClass(root, "stable-pet-name").textContent).toBe("Rolo")
  })

  test("Enter in the field saves the new name", () => {
    let state = stateWith([pet({ name: "Waiting" })])
    const modal = buildStableModal({
      ...quietHandlers(),
      onRename: (creatureId, name) => {
        const result = renameStablePet(state, creatureId, name)
        if (!result.ok) return result
        state = result.state
        return result
      },
    })
    modal.open(state)
    const root = fakeOf(modal.root)
    byClass(root, "rename-button").fire("click", {})
    const input = byClass(root, "stable-pet-input")
    input.value = "Rolo"
    input.fire("keydown", {
      key: "Enter",
      preventDefault: () => {},
      stopPropagation: () => {},
    })
    // The name is committed and the row repaints from it.
    expect(state.stable[0]?.name).toBe("Rolo")
    expect(byClass(root, "stable-pet-name").textContent).toBe("Rolo")
  })

  test("a refused rename keeps the editor open, focused, and says why", () => {
    const modal = buildStableModal({
      ...quietHandlers(),
      onRename: () => ({ ok: false, reason: "cup-phase" }),
    })
    modal.open(stateWith([pet({ name: "Waiting" })]))
    const root = fakeOf(modal.root)
    byClass(root, "rename-button").fire("click", {})
    const input = byClass(root, "stable-pet-input")
    input.value = "Rolo"
    // The click takes the keyboard to the button, as it would in a browser.
    const save = byClass(root, "stable-pet-save")
    save.focus()
    save.fire("click", {})
    // The note says why, in the game's voice.
    expect(byClass(root, "stable-note").textContent).toBe(
      stableRenameRefusalCopy("cup-phase"),
    )
    // The editor stays open...
    expect(classNamed(root, "stable-pet-input")).toHaveLength(1)
    expect(classNamed(root, "stable-pet-save")).toHaveLength(1)
    // ...and the field takes the keyboard back.
    expect(lastFocused).toBe(input)
  })

  test("Escape cancels the edit and hands the keyboard back to the pencil", () => {
    let renamed = false
    const modal = buildStableModal({
      ...quietHandlers(),
      onRename: () => {
        renamed = true
        return { ok: false, reason: "unknown-pet" }
      },
    })
    modal.open(stateWith([pet({ name: "Waiting" })]))
    const root = fakeOf(modal.root)
    const pencil = byClass(root, "rename-button")
    pencil.fire("click", {})
    const input = byClass(root, "stable-pet-input")
    input.value = "Rolo"
    input.fire("keydown", {
      key: "Escape",
      preventDefault: () => {},
      stopPropagation: () => {},
    })
    expect(renamed).toBe(false)
    expect(lastFocused).toBe(pencil)
    expect(byClass(root, "stable-pet-name").textContent).toBe("Waiting")
  })
})

describe("stableRenameRefusalCopy", () => {
  test("the day-phase lock reads as coaching, never a dead button", () => {
    const copy = stableRenameRefusalCopy("cup-phase")
    expect(copy).toContain("cup")
    expect(copy.length).toBeGreaterThan(0)
  })

  test("every refusal says something", () => {
    for (const reason of ["cup-phase", "unknown-pet"] as const) {
      expect(stableRenameRefusalCopy(reason).length).toBeGreaterThan(0)
    }
  })
})
