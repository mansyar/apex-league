import { describe, expect, test } from "bun:test"
import { trapTarget } from "./focus"

/** Identity-only stand-in: trapTarget never reads element properties. */
function el(): HTMLElement {
  return {} as HTMLElement
}

describe("trapTarget", () => {
  const a = el()
  const b = el()
  const c = el()

  test("advances through the middle without wrapping", () => {
    expect(trapTarget([a, b, c], b, false)).toBeNull()
  })

  test("wraps forward from the last to the first", () => {
    expect(trapTarget([a, b, c], c, false)).toBe(a)
  })

  test("wraps backward from the first to the last", () => {
    expect(trapTarget([a, b, c], a, true)).toBe(c)
  })

  test("leaves a middle step backwards alone", () => {
    expect(trapTarget([a, b, c], b, true)).toBeNull()
  })

  test("pulls an outside or missing focus back into the dialog", () => {
    expect(trapTarget([a, b], el(), false)).toBe(a)
    expect(trapTarget([a, b], null, false)).toBe(a)
    expect(trapTarget([a, b], null, true)).toBe(b)
  })

  test("does nothing when the dialog has no focusable controls", () => {
    expect(trapTarget([], a, false)).toBeNull()
    expect(trapTarget([], null, true)).toBeNull()
  })
})
