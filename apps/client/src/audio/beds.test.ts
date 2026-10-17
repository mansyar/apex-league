import { describe, expect, test } from "bun:test"
import { BED_SCENES, bedUrl } from "./beds"

describe("beds", () => {
  test("every scene maps to a bundled /audio/music loop", () => {
    for (const scene of BED_SCENES) {
      const url = bedUrl[scene]
      expect(url.startsWith("/audio/music/")).toBe(true)
      expect(url.endsWith(".ogg")).toBe(true)
    }
  })

  test("the table covers exactly the two scene beds", () => {
    expect([...BED_SCENES].sort()).toEqual(["arena", "ranch"])
  })
})
