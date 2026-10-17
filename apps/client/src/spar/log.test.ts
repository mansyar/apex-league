import { describe, expect, test } from "bun:test"
import { logToggleLabel } from "./log"

describe("logToggleLabel", () => {
  test("golden: a hidden log reads collapsed with the closed chevron", () => {
    expect(logToggleLabel(true)).toBe("Battle log ▸")
  })

  test("golden: an open log reads expanded with the open chevron", () => {
    expect(logToggleLabel(false)).toBe("Battle log ▴")
  })
})
