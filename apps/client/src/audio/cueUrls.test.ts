import { describe, expect, test } from "bun:test"
import type { CueId } from "./cues"
import { CUE_IDS, cueUrl } from "./cueUrls"

describe("cueUrls", () => {
  test("every cue id in the table maps to a bundled /audio path", () => {
    for (const cue of CUE_IDS) {
      const url = cueUrl[cue]
      expect(url.startsWith("/audio/")).toBe(true)
      expect(url.endsWith(".ogg")).toBe(true)
    }
  })

  test("the table covers exactly the CueId union", () => {
    // Declared here as literals: if cues.ts grows the union, this list
    // fails first and the missing row is added to the table.
    const all: CueId[] = [
      "melee-hit",
      "melee-hit-calm",
      "hit-plate",
      "hit-plate-calm",
      "fire",
      "fire-calm",
      "ko",
      "ko-bell",
      "verdict-0",
      "verdict-1",
    ]
    expect([...CUE_IDS].sort()).toEqual([...all].sort())
    for (const cue of all) expect(cue in cueUrl).toBe(true)
  })
})
