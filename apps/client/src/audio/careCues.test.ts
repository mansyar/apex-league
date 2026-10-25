import { describe, expect, test } from "bun:test"
import type { MorningAfterClass } from "../morning-after/derive"
import { type CareCueEvent, type CueOptions, careCueForEvent } from "./careCues"

/** Event builders for the two families the ranch can raise. */
const care = (action: "feed" | "rest" | "treat" | "play"): CareCueEvent => ({
  kind: "care",
  action,
})
const pet: CareCueEvent = { kind: "pet" }
const dawn: CareCueEvent = { kind: "dawn" }
/** The ritual day's pet: the chirp carries the morning-after's class. */
const ritualPet = (cls: MorningAfterClass): CareCueEvent => ({
  kind: "pet",
  morningAfter: cls,
})

const opts = (overrides: Partial<CueOptions> = {}): CueOptions => ({
  muted: false,
  reducedMotion: false,
  ...overrides,
})

describe("careCueForEvent", () => {
  test("muted silences every ranch event", () => {
    for (const event of [
      care("feed"),
      care("rest"),
      care("treat"),
      care("play"),
      pet,
      dawn,
    ]) {
      expect(careCueForEvent(event, opts({ muted: true }))).toBe(null)
    }
  })

  test("each care action maps to its own cue", () => {
    expect(careCueForEvent(care("feed"), opts())).toBe("care-feed")
    expect(careCueForEvent(care("rest"), opts())).toBe("care-rest")
    expect(careCueForEvent(care("treat"), opts())).toBe("care-treat")
    expect(careCueForEvent(care("play"), opts())).toBe("care-play")
  })

  test("a pet reaction maps to the pet cue", () => {
    expect(careCueForEvent(pet, opts())).toBe("care-pet")
  })

  test("day advance maps to the dawn chime", () => {
    expect(careCueForEvent(dawn, opts())).toBe("dawn-chime")
  })

  test("rare punctuation keeps full cues under reduced motion", () => {
    // Care cues fire at most a few times a day - like KOs and verdicts,
    // they are punctuation, not repeated impacts, so no calm variants.
    for (const event of [
      care("feed"),
      care("rest"),
      care("treat"),
      care("play"),
      pet,
      dawn,
    ]) {
      expect(careCueForEvent(event, opts({ reducedMotion: true }))).not.toBe(
        null,
      )
    }
  })

  test("an unknown event kind stays silent", () => {
    expect(
      careCueForEvent({ kind: "mystery" } as unknown as CareCueEvent, opts()),
    ).toBe(null)
  })
})

describe("the morning-after pet remap (postcup_morning_after FR-8)", () => {
  test("each ritual class remaps the pet chirp onto a bundled care asset", () => {
    // Intensity follows the day's outcome: the champion's morning romps
    // (play), the gatekeep morning gets the soothing balm (treat), the
    // ordinary exit settles (rest), and the forfeit keeps a low, grounded
    // feed sound.
    expect(careCueForEvent(ritualPet("title"), opts())).toBe("care-play")
    expect(careCueForEvent(ritualPet("gatekeep"), opts())).toBe("care-treat")
    expect(careCueForEvent(ritualPet("exit"), opts())).toBe("care-rest")
    expect(careCueForEvent(ritualPet("withdrawn"), opts())).toBe("care-feed")
  })

  test("no new asset files: every remap lands on an existing care cue", () => {
    const bundled = [
      "care-feed",
      "care-rest",
      "care-treat",
      "care-play",
      "care-pet",
      "dawn-chime",
    ] as const
    for (const cls of ["title", "gatekeep", "exit", "withdrawn"] as const) {
      const cue = careCueForEvent(ritualPet(cls), opts())
      expect(cue !== null && bundled.includes(cue)).toBe(true)
      expect(cue).not.toBe("care-pet")
    }
  })

  test("the same gates hold: muted silences, reduced motion keeps it full", () => {
    expect(careCueForEvent(ritualPet("title"), opts({ muted: true }))).toBe(
      null,
    )
    expect(
      careCueForEvent(ritualPet("exit"), opts({ reducedMotion: true })),
    ).toBe("care-rest")
  })
})
