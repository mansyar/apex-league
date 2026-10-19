import { describe, expect, test } from "bun:test"
import { recoveryCopy, recoveryFileName } from "./recovery"

describe("recoveryCopy", () => {
  test("the offer explains download-then-start-over", () => {
    const copy = recoveryCopy("offer")
    expect(copy.title).toBe("That save wouldn't open")
    expect(copy.text).toContain("Download")
    expect(copy.confirm).toBe("Start over")
  })

  test("the confirm states the file will be cleared", () => {
    const copy = recoveryCopy("confirm")
    expect(copy.title).toContain("fresh ranch")
    expect(copy.text).toContain("cleared")
    expect(copy.confirm).toContain("Clear")
  })
})

describe("recoveryFileName", () => {
  test("is dated and stable", () => {
    expect(recoveryFileName(new Date(2026, 9, 18))).toBe(
      "apex-league-broken-save-2026-10-18.json",
    )
  })
})
