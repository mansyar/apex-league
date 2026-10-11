import { describe, expect, test } from "bun:test"
import { prefersReducedMotion } from "./motion"

describe("prefersReducedMotion", () => {
  test("true when the injected matcher reports a reduce preference", () => {
    expect(prefersReducedMotion({ matches: true })).toBe(true)
  })

  test("false when the injected matcher reports no reduce preference", () => {
    expect(prefersReducedMotion({ matches: false })).toBe(false)
  })
})
