import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import { BED_SCENES, bedUrl } from "./beds"
import type { AnyCueId } from "./cueUrls"
import { CUE_IDS, cueUrl } from "./cueUrls"

describe("cueUrls", () => {
  test("every cue id in the table maps to a bundled /audio path", () => {
    for (const cue of CUE_IDS) {
      const url = cueUrl[cue]
      expect(url.startsWith("/audio/")).toBe(true)
      expect(url.endsWith(".ogg")).toBe(true)
    }
  })

  test("the table covers exactly the battle + care + presentation cue unions", () => {
    // Declared here as literals: if either union grows, this list fails
    // first and the missing row is added to the table.
    const all: AnyCueId[] = [
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
      "care-feed",
      "care-rest",
      "care-treat",
      "care-play",
      "care-pet",
      "dawn-chime",
      "ui-navigate",
      "ui-navigate-calm",
      "ui-confirm",
      "ui-confirm-calm",
      "cup-transition",
      "cup-transition-calm",
      "evolution",
      "evolution-calm",
      "graduation",
      "graduation-calm",
    ]
    expect([...CUE_IDS].sort()).toEqual([...all].sort())
    for (const cue of all) expect(cue in cueUrl).toBe(true)
  })

  test("every bundled cue and bed URL is named in CREDITS.md", async () => {
    // AC-2/AC-3: a URL only ships if its bundled file has a provenance row.
    const creditsPath = join(
      import.meta.dir,
      "..",
      "..",
      "public",
      "audio",
      "CREDITS.md",
    )
    const credits = await Bun.file(creditsPath).text()
    const urls = [
      ...CUE_IDS.map((cue) => cueUrl[cue]),
      ...BED_SCENES.map((scene) => bedUrl[scene]),
    ]
    for (const url of urls) {
      const relative = url.replace(/^\/audio\//, "")
      expect(
        credits.includes(relative),
        `${relative} missing from CREDITS.md`,
      ).toBe(true)
    }
  })
})
