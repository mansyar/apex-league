import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { type AnyCueId, CUE_IDS } from "./cueUrls"
import { DUCK_FACTOR, DUCK_MS, DuckEnvelope, ducksFor } from "./duck"
import { MusicBeds } from "./musicBeds"
import { AudioPlayer, type CueHook } from "./player"

/** Every id that must dip the music (FR-4): punctuation, not routine UI. */
const PRIORITY: readonly AnyCueId[] = [
  "ko",
  "ko-bell",
  "verdict-0",
  "verdict-1",
  "cup-transition",
  "cup-transition-calm",
  "evolution",
  "evolution-calm",
  "graduation",
  "graduation-calm",
]

/** Routine UI navigation/confirm that must never pump the music. */
const UI: readonly AnyCueId[] = [
  "ui-navigate",
  "ui-navigate-calm",
  "ui-confirm",
  "ui-confirm-calm",
]

/** Ordinary battle/care punctuation that must never duck. */
const ORDINARY: readonly AnyCueId[] = [
  "melee-hit",
  "melee-hit-calm",
  "hit-plate",
  "hit-plate-calm",
  "fire",
  "fire-calm",
  "care-feed",
  "care-rest",
  "care-treat",
  "care-play",
  "care-pet",
  "dawn-chime",
]

describe("ducksFor", () => {
  test("includes every priority cue and its calm variant", () => {
    for (const cue of PRIORITY) expect(ducksFor(cue)).toBe(true)
  })

  test("excludes ordinary battle and care cues", () => {
    for (const cue of ORDINARY) expect(ducksFor(cue)).toBe(false)
  })

  test("excludes routine UI navigation and confirm cues", () => {
    for (const cue of UI) expect(ducksFor(cue)).toBe(false)
  })

  test("classifies every bundled cue id (exhaustive over CUE_IDS)", () => {
    const priority = new Set<AnyCueId>(PRIORITY)
    for (const cue of CUE_IDS) expect(ducksFor(cue)).toBe(priority.has(cue))
  })
})

describe("DuckEnvelope", () => {
  test("the factor is well below 1 and the window is short", () => {
    expect(DUCK_FACTOR).toBeGreaterThan(0)
    expect(DUCK_FACTOR).toBeLessThan(1)
    expect(DUCK_MS).toBeGreaterThan(0)
    expect(DUCK_MS).toBeLessThanOrEqual(1000)
  })

  test("gain is exactly 1 before any duck and after the window expires", () => {
    const env = new DuckEnvelope()
    expect(env.gain(0)).toBe(1)
    env.duck(1000)
    expect(env.gain(1000)).toBe(DUCK_FACTOR)
    expect(env.gain(1000 + DUCK_MS - 1)).toBe(DUCK_FACTOR)
    expect(env.gain(1000 + DUCK_MS)).toBe(1)
    expect(env.gain(1000 + DUCK_MS + 1)).toBe(1)
  })

  test("a later duck extends instead of shortening an open window", () => {
    const env = new DuckEnvelope()
    env.duck(1000, 900) // closes at 1900
    env.duck(1200, 200) // would close at 1400 — must not shorten
    expect(env.gain(1500)).toBe(DUCK_FACTOR)
    expect(env.gain(1900)).toBe(1)
    env.duck(1800, 200) // closes at 2000
    expect(env.gain(1950)).toBe(DUCK_FACTOR)
    expect(env.gain(2000)).toBe(1)
  })

  test("clear cancels an active window and restores exactly 1", () => {
    const env = new DuckEnvelope()
    env.duck(1000)
    expect(env.gain(1000)).toBe(DUCK_FACTOR)
    env.clear()
    expect(env.gain(1000)).toBe(1)
    expect(env.gain(1001)).toBe(1)
  })

  test("the default window uses DUCK_MS", () => {
    const env = new DuckEnvelope()
    env.duck(500)
    expect(env.gain(500 + DUCK_MS - 1)).toBe(DUCK_FACTOR)
    expect(env.gain(500 + DUCK_MS)).toBe(1)
  })
})

describe("AudioPlayer cue hook", () => {
  const recorder = (): { cues: AnyCueId[]; hook: CueHook } => {
    const cues: AnyCueId[] = []
    return {
      cues,
      hook: (cue) => {
        cues.push(cue)
      },
    }
  }

  test("fires with the cue only once the gates pass", () => {
    const { cues, hook } = recorder()
    const player = new AudioPlayer(() => {}, hook)
    player.play("ko") // locked
    player.unlock()
    player.setMuted(true)
    player.play("ko") // muted
    player.setMuted(false)
    player.setVolumes({ music: 1, sfx: 0 })
    player.play("ko") // zero SFX
    expect(cues).toEqual([])
    player.setVolumes({ music: 1, sfx: 1 })
    player.play("ko")
    player.play("melee-hit")
    expect(cues).toEqual(["ko", "melee-hit"])
  })

  test("a throwing hook is swallowed and never breaks playback", () => {
    const played: AnyCueId[] = []
    const player = new AudioPlayer(
      (cue) => {
        played.push(cue)
      },
      () => {
        throw new Error("hook exploded")
      },
    )
    player.unlock()
    expect(() => player.play("verdict-0")).not.toThrow()
    expect(played).toEqual(["verdict-0"])
  })
})

/**
 * DOM-free composed contract (NFR-6 / AC-4): stub the two browser primitives
 * MusicBeds touches and drive its single mixer ticker by hand. The duck clock
 * is a fixed `clock` value, so a window ends exactly when the test advances
 * it — no real timers. Mute toggles and a scene change mid-duck must still
 * land on the exact unducked user level.
 */
class FakeAudio {
  static readonly created: FakeAudio[] = []
  loop = false
  preload = ""
  paused = true
  volume = 0
  readonly src: string

  constructor(src: string) {
    this.src = src
    FakeAudio.created.push(this)
  }

  play(): Promise<void> {
    this.paused = false
    return Promise.resolve()
  }

  pause(): void {
    this.paused = true
  }
}

describe("MusicBeds duck composition (DOM-free)", () => {
  const realWindow = globalThis.window
  const realAudio = globalThis.Audio
  const realNow = Date.now
  let clock = 1000
  let tick: () => void = () => {}

  beforeEach(() => {
    FakeAudio.created.length = 0
    clock = 1000
    ;(globalThis as Record<string, unknown>).window = {
      setInterval: (fn: () => void): number => {
        tick = fn
        return 1
      },
      clearInterval: (): void => {},
    }
    ;(globalThis as Record<string, unknown>).Audio = FakeAudio
    Date.now = (): number => clock
  })

  afterEach(() => {
    ;(globalThis as Record<string, unknown>).window = realWindow
    ;(globalThis as Record<string, unknown>).Audio = realAudio
    Date.now = realNow
  })

  /** Run N mixer steps; fades use fixed per-step deltas, not elapsed time. */
  const drive = (steps: number): void => {
    for (let i = 0; i < steps; i += 1) tick()
  }

  /** Element created at `index`, with a clear failure if the bed is absent. */
  const bed = (index: number): FakeAudio => {
    const el = FakeAudio.created[index]
    if (!el) throw new Error(`no music element created at index ${index}`)
    return el
  }

  test("mute toggle and scene change mid-duck restore the exact user volume", () => {
    const envelope = new DuckEnvelope()
    const beds = new MusicBeds()
    beds.setDuck(envelope)
    beds.setVolume(0.8)
    beds.setScene("ranch")

    // Settle the bed at the exact unducked user level.
    drive(16)
    const ranch = bed(0)
    const userLevel = ranch.volume
    expect(userLevel).toBeGreaterThan(0)

    // A priority cue ducks; one tick notices and the short ramp settles.
    envelope.duck(clock)
    drive(1)
    drive(4)
    const duckedLevel = ranch.volume
    expect(duckedLevel).toBeLessThan(userLevel)
    expect(duckedLevel).toBe(userLevel * DUCK_FACTOR)

    // Mute mid-duck: fades to silence and pauses.
    beds.setMuted(true)
    drive(16)
    expect(ranch.volume).toBe(0)
    expect(ranch.paused).toBe(true)

    // Unmute mid-duck: returns to the DUCKED level, never jumps to full.
    beds.setMuted(false)
    drive(16)
    expect(ranch.volume).toBe(duckedLevel)

    // Scene change mid-duck: the new bed carries the duck, the old fades out.
    beds.setScene("arena")
    drive(16)
    const arena = bed(1)
    expect(ranch.volume).toBe(0)
    expect(ranch.paused).toBe(true)
    expect(arena.volume).toBe(duckedLevel)

    // Window ends past every gate change — the exact user level comes back.
    clock += DUCK_MS + 100
    drive(1)
    drive(4)
    expect(arena.volume).toBe(userLevel)
    expect(ranch.volume).toBe(0)
  })

  test("a fresh bed started mid-duck is ducked, then restores exactly", () => {
    const envelope = new DuckEnvelope()
    const beds = new MusicBeds()
    beds.setDuck(envelope)
    beds.setVolume(0.6)
    beds.setScene("ranch")
    drive(16)
    const userLevel = bed(0).volume

    envelope.duck(clock)
    drive(5)
    beds.setVolume(0.9)
    beds.setScene("cup")
    drive(16)
    const changedUserLevel = bed(1).volume
    expect(changedUserLevel).toBeLessThan(userLevel)

    clock += DUCK_MS + 100
    drive(5)
    expect(bed(1).volume).toBe(0.35 * 0.9)
  })
})
