import { describe, expect, test } from "bun:test"
import { type CareCueEvent, type CueOptions, careCueForEvent } from "./careCues"

/** Event builders for the two families the ranch can raise. */
const care = (action: "feed" | "rest" | "treat" | "play"): CareCueEvent => ({
  kind: "care",
  action,
})
const pet: CareCueEvent = { kind: "pet" }
const dawn: CareCueEvent = { kind: "dawn" }

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
