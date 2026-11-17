import { describe, expect, test } from "bun:test"
import {
  type CueOptions,
  type CueStep,
  cueForPresentationEvent,
  cueForStep,
  type PresentationCueEvent,
  type PresentationCueOptions,
} from "./cues"

/** A minimal step stub: only the fields the mapping reads. */
const step = (kind: string, hit?: boolean, ko?: boolean): CueStep => ({
  kind,
  hit,
  ko,
})

const opts = (overrides: Partial<CueOptions> = {}): CueOptions => ({
  muted: false,
  reducedMotion: false,
  ...overrides,
})

describe("cueForStep", () => {
  test("muted silences every kind", () => {
    for (const kind of ["melee", "projectile", "impact", "down", "judge"]) {
      expect(cueForStep(step(kind, true, true), opts({ muted: true }))).toBe(
        null,
      )
    }
  })

  test("a landed melee blow maps to the melee hit cue", () => {
    expect(cueForStep(step("melee", true), opts())).toBe("melee-hit")
  })

  test("a whiffed melee blow stays silent", () => {
    expect(cueForStep(step("melee", false), opts())).toBe(null)
  })

  test("a projectile launch maps to the fire cue (hit or miss)", () => {
    expect(cueForStep(step("projectile", true), opts())).toBe("fire")
    expect(cueForStep(step("projectile", false), opts())).toBe("fire")
  })

  test("a landed impact maps to the plate hit cue; a dodge stays silent", () => {
    expect(cueForStep(step("impact", true), opts())).toBe("hit-plate")
    expect(cueForStep(step("impact", false), opts())).toBe(null)
  })

  test("a terminal KO down step maps to the KO thud", () => {
    expect(cueForStep(step("down", true, true), opts())).toBe("ko")
  })

  test("a non-terminal down step stays silent", () => {
    expect(cueForStep(step("down", true, false), opts())).toBe(null)
  })

  test("the judge beat maps to the verdict jingle", () => {
    expect(cueForStep(step("judge"), opts())).toBe("verdict-0")
  })

  test("idle/stagger/knockback beats carry no cue", () => {
    for (const kind of ["idle", "stagger", "knockback", "hold"]) {
      expect(cueForStep(step(kind), opts())).toBe(null)
    }
  })

  test("reduced motion selects the calm variant where one exists", () => {
    const calm = opts({ reducedMotion: true })
    expect(cueForStep(step("melee", true), calm)).toBe("melee-hit-calm")
    expect(cueForStep(step("impact", true), calm)).toBe("hit-plate-calm")
    expect(cueForStep(step("projectile"), calm)).toBe("fire-calm")
    // KOs and verdicts keep their full cues: they are rare punctuation,
    // not repeated impacts.
    expect(cueForStep(step("down", true, true), calm)).toBe("ko")
    expect(cueForStep(step("judge"), calm)).toBe("verdict-0")
  })
})

/** Presentation event builders (FR-1: UI, cup and milestone cues). */
const ui = (kind: "navigate" | "confirm"): PresentationCueEvent => ({
  kind,
})
const cupTransition: PresentationCueEvent = { kind: "cup-transition" }
const evolution: PresentationCueEvent = { kind: "evolution" }
const graduation: PresentationCueEvent = { kind: "graduation" }
const ALL_PRESENTATION_EVENTS: readonly PresentationCueEvent[] = [
  ui("navigate"),
  ui("confirm"),
  cupTransition,
  evolution,
  graduation,
]

const presentationOpts = (
  overrides: Partial<PresentationCueOptions> = {},
): PresentationCueOptions => ({
  muted: false,
  reducedMotion: false,
  ...overrides,
})

describe("cueForPresentationEvent", () => {
  test("muted silences every presentation event", () => {
    for (const event of ALL_PRESENTATION_EVENTS) {
      expect(
        cueForPresentationEvent(event, presentationOpts({ muted: true })),
      ).toBe(null)
    }
  })

  test("UI navigate and confirm map to their own cues", () => {
    expect(cueForPresentationEvent(ui("navigate"), presentationOpts())).toBe(
      "ui-navigate",
    )
    expect(cueForPresentationEvent(ui("confirm"), presentationOpts())).toBe(
      "ui-confirm",
    )
  })

  test("the cup stage-transition event maps to the cup-transition cue", () => {
    expect(cueForPresentationEvent(cupTransition, presentationOpts())).toBe(
      "cup-transition",
    )
  })

  test("evolution and graduation map to their milestone cues", () => {
    expect(cueForPresentationEvent(evolution, presentationOpts())).toBe(
      "evolution",
    )
    expect(cueForPresentationEvent(graduation, presentationOpts())).toBe(
      "graduation",
    )
  })

  test("reduced motion selects the calm variant of every new cue", () => {
    const calm = presentationOpts({ reducedMotion: true })
    expect(cueForPresentationEvent(ui("navigate"), calm)).toBe(
      "ui-navigate-calm",
    )
    expect(cueForPresentationEvent(ui("confirm"), calm)).toBe("ui-confirm-calm")
    expect(cueForPresentationEvent(cupTransition, calm)).toBe(
      "cup-transition-calm",
    )
    expect(cueForPresentationEvent(evolution, calm)).toBe("evolution-calm")
    expect(cueForPresentationEvent(graduation, calm)).toBe("graduation-calm")
  })

  test("an instant dump stays silent for every event, even under reduced motion", () => {
    for (const event of ALL_PRESENTATION_EVENTS) {
      expect(
        cueForPresentationEvent(event, presentationOpts({ instant: true })),
      ).toBe(null)
      expect(
        cueForPresentationEvent(
          event,
          presentationOpts({ instant: true, reducedMotion: true }),
        ),
      ).toBe(null)
    }
  })

  test("an unmapped event kind stays silent rather than throw", () => {
    expect(
      cueForPresentationEvent(
        { kind: "mystery" } as unknown as PresentationCueEvent,
        presentationOpts(),
      ),
    ).toBe(null)
  })

  test("gate precedence: mute wins over calm and instant", () => {
    expect(
      cueForPresentationEvent(
        graduation,
        presentationOpts({ muted: true, reducedMotion: true, instant: true }),
      ),
    ).toBe(null)
  })
})
