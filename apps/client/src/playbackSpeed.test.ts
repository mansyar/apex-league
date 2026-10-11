import { describe, expect, test } from "bun:test"
import {
  PLAYBACK_SPEED_MS,
  type PlaybackSpeed,
  toggleSpeed,
} from "./playbackSpeed"

describe("playbackSpeed", () => {
  test("both speeds have positive delays and fast is quicker than normal", () => {
    const speeds: PlaybackSpeed[] = ["normal", "fast"]
    for (const speed of speeds) {
      const ms = PLAYBACK_SPEED_MS[speed]
      expect(ms).toBeGreaterThan(0)
      expect(Number.isFinite(ms)).toBe(true)
    }
    expect(PLAYBACK_SPEED_MS.fast).toBeLessThan(PLAYBACK_SPEED_MS.normal)
  })

  test("toggleSpeed flips between normal and fast in both directions", () => {
    expect(toggleSpeed("normal")).toBe("fast")
    expect(toggleSpeed("fast")).toBe("normal")
  })

  test("toggling twice returns to the original speed", () => {
    const once = toggleSpeed("normal")
    expect(toggleSpeed(once)).toBe("normal")
  })
})
