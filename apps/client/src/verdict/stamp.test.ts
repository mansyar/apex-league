import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { buildStampView } from "./stamp"

class FakeElement {
  tagName: string
  children: FakeElement[] = []
  className = ""
  textContent: string | null = null
  attributes: Record<string, string> = {}

  constructor(tag = "div") {
    this.tagName = tag.toUpperCase()
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null
  }

  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes)
  }
}

const realDocument = globalThis.document

beforeAll(() => {
  globalThis.document = {
    createElement: (tag: string) => new FakeElement(tag),
  } as unknown as Document
})

afterAll(() => {
  globalThis.document = realDocument
})

describe("buildStampView", () => {
  test("builds root > title, rule, sub with the battle HUD classes", () => {
    const view = buildStampView(
      {
        root: "battle-stamp",
        title: "battle-stamp-title",
        rule: "battle-stamp-rule",
        sub: "battle-stamp-sub",
      },
      { announce: true },
    )

    expect(view.root.tagName).toBe("DIV")
    expect(view.root.className).toBe("battle-stamp")
    expect(Array.from(view.root.children)).toEqual([
      view.title,
      view.rule,
      view.sub,
    ])
    expect(view.title.tagName).toBe("DIV")
    expect(view.title.className).toBe("battle-stamp-title")
    expect(view.rule.tagName).toBe("DIV")
    expect(view.rule.className).toBe("battle-stamp-rule")
    expect(view.sub.tagName).toBe("DIV")
    expect(view.sub.className).toBe("battle-stamp-sub")
  })

  test("builds root > title, rule, sub with the cup result classes", () => {
    const view = buildStampView({
      root: "cup-result-stamp",
      title: "cup-result-title",
      rule: "cup-result-rule",
      sub: "cup-result-sub",
    })

    expect(view.root.className).toBe("cup-result-stamp")
    expect(Array.from(view.root.children)).toEqual([
      view.title,
      view.rule,
      view.sub,
    ])
    expect(view.title.className).toBe("cup-result-title")
    expect(view.rule.className).toBe("cup-result-rule")
    expect(view.sub.className).toBe("cup-result-sub")
  })

  test("parentChildren: false returns flat refs with unchanged ARIA behavior", () => {
    const classes = {
      root: "cup-result-stamp",
      title: "cup-result-title",
      rule: "cup-result-rule",
      sub: "cup-result-sub",
    }
    const flat = buildStampView(classes, { parentChildren: false })
    const flatAnnounced = buildStampView(classes, {
      announce: true,
      parentChildren: false,
    })

    expect(Array.from(flat.root.children)).toEqual([])
    expect(Array.from(flatAnnounced.root.children)).toEqual([])
    for (const view of [flat, flatAnnounced]) {
      expect(view.root.className).toBe("cup-result-stamp")
      expect(view.title.className).toBe("cup-result-title")
      expect(view.rule.className).toBe("cup-result-rule")
      expect(view.sub.className).toBe("cup-result-sub")
      for (const child of [view.title, view.rule, view.sub]) {
        expect(child.getAttribute("role")).toBeNull()
        expect(child.getAttribute("aria-live")).toBeNull()
      }
    }
    expect(flat.root.getAttribute("role")).toBeNull()
    expect(flat.root.getAttribute("aria-live")).toBeNull()
    expect(flatAnnounced.root.getAttribute("role")).toBe("status")
    expect(flatAnnounced.root.getAttribute("aria-live")).toBe("polite")
  })

  test("announce: true sets a polite status role on the root only", () => {
    const view = buildStampView(
      {
        root: "battle-stamp",
        title: "battle-stamp-title",
        rule: "battle-stamp-rule",
        sub: "battle-stamp-sub",
      },
      { announce: true },
    )

    expect(view.root.getAttribute("role")).toBe("status")
    expect(view.root.getAttribute("aria-live")).toBe("polite")
    for (const child of [view.title, view.rule, view.sub]) {
      expect(child.getAttribute("role")).toBeNull()
      expect(child.getAttribute("aria-live")).toBeNull()
    }
  })

  test("announce: false or omitted leaves the root without ARIA attributes", () => {
    const classes = {
      root: "cup-result-stamp",
      title: "cup-result-title",
      rule: "cup-result-rule",
      sub: "cup-result-sub",
    }
    const explicitFalse = buildStampView(classes, { announce: false })
    const omitted = buildStampView(classes)
    for (const root of [explicitFalse.root, omitted.root]) {
      expect(root.getAttribute("role")).toBeNull()
      expect(root.getAttribute("aria-live")).toBeNull()
    }
  })

  test("does not set text or add show/lost/animation classes", () => {
    const view = buildStampView(
      {
        root: "battle-stamp",
        title: "battle-stamp-title",
        rule: "battle-stamp-rule",
        sub: "battle-stamp-sub",
      },
      { announce: true },
    )

    for (const element of [view.root, view.title, view.rule, view.sub]) {
      expect(element.textContent).toBeNull()
      expect(element.className).not.toContain("show")
      expect(element.className).not.toContain("lost")
      expect(element.className).not.toContain("in")
    }
  })
})
