import { describe, expect, test } from "bun:test"
import { AudioPlayer, type CuePlayer, isAudible } from "./player"

/** A recorder seam: logs every cue the player asks the imperative layer to play. */
const recorder = (): { played: string[]; fn: CuePlayer } => {
  const played: string[] = []
  return { played, fn: (cue) => played.push(cue) }
}

describe("isAudible", () => {
  test("audible only when unlocked and not muted", () => {
    expect(isAudible({ unlocked: false, muted: false })).toBe(false)
    expect(isAudible({ unlocked: true, muted: false })).toBe(true)
    expect(isAudible({ unlocked: true, muted: true })).toBe(false)
    expect(isAudible({ unlocked: false, muted: true })).toBe(false)
  })
})

describe("AudioPlayer", () => {
  test("drops play requests before the first gesture unlock", () => {
    const { played, fn } = recorder()
    const player = new AudioPlayer(fn)
    player.play("melee-hit")
    expect(played).toEqual([])
  })

  test("passes cues through after the gesture unlock", () => {
    const { played, fn } = recorder()
    const player = new AudioPlayer(fn)
    player.unlock()
    player.play("melee-hit")
    player.play("fire")
    expect(played).toEqual(["melee-hit", "fire"])
  })

  test("drops cues while muted, even when unlocked", () => {
    const { played, fn } = recorder()
    const player = new AudioPlayer(fn)
    player.unlock()
    player.setMuted(true)
    player.play("melee-hit")
    expect(played).toEqual([])
  })

  test("resumes after an unmute", () => {
    const { played, fn } = recorder()
    const player = new AudioPlayer(fn)
    player.unlock()
    player.setMuted(true)
    player.setMuted(false)
    player.play("melee-hit")
    expect(played).toEqual(["melee-hit"])
  })

  test("never throws when the imperative seam throws (silent fallback)", () => {
    const player = new AudioPlayer(() => {
      throw new Error("no audio hardware")
    })
    player.unlock()
    expect(() => player.play("melee-hit")).not.toThrow()
  })
})
