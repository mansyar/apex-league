import { describe, expect, test } from "bun:test"
import { AudioPlayer, type CuePlayer, isAudible } from "./player"

/** A recorder seam: logs every cue and the gain the player asked for. */
const recorder = (): { played: string[]; gains: number[]; fn: CuePlayer } => {
  const played: string[] = []
  const gains: number[] = []
  return {
    played,
    gains,
    fn: (cue, gain) => {
      played.push(cue)
      gains.push(gain)
    },
  }
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

  test("defaults to full gain and passes the SFX level to the seam", () => {
    const { played, gains, fn } = recorder()
    const player = new AudioPlayer(fn)
    player.unlock()
    player.play("melee-hit")
    player.setVolumes({ music: 0.5, sfx: 0.25 })
    player.play("fire")

    expect(played).toEqual(["melee-hit", "fire"])
    expect(gains).toEqual([1, 0.25])
  })

  test("music and SFX levels stay independent", () => {
    const { gains, fn } = recorder()
    const player = new AudioPlayer(fn)
    player.unlock()
    player.setVolumes({ music: 0.1, sfx: 0.9 })
    player.play("fire")
    expect(player.musicGain).toBe(0.1)
    expect(gains).toEqual([0.9])
  })

  test("clamps out-of-range levels into 0..1", () => {
    const { gains, fn } = recorder()
    const player = new AudioPlayer(fn)
    player.unlock()

    player.setVolumes({ music: 2, sfx: -1 })
    player.play("fire")
    player.setVolumes({ music: Number.NaN, sfx: 4 })
    player.play("fire")

    expect(player.musicGain).toBe(0)
    expect(gains).toEqual([1])
  })

  test("zero SFX volume is silent and never reaches the seam", () => {
    const { played, fn } = recorder()
    const player = new AudioPlayer(fn)
    player.unlock()
    player.setVolumes({ music: 1, sfx: 0 })
    player.play("melee-hit")
    expect(played).toEqual([])
  })

  test("muted requests never reach the seam at any volume", () => {
    const { played, fn } = recorder()
    const player = new AudioPlayer(fn)
    player.unlock()
    player.setVolumes({ music: 0.4, sfx: 0.4 })
    player.setMuted(true)
    player.play("melee-hit")
    player.setVolumes({ music: 1, sfx: 1 })
    player.play("fire")
    expect(played).toEqual([])
  })
})
