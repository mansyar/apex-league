import { describe, expect, it } from "bun:test"
import { getMove, PLAYBACK_BEATS, PLAYBACK_PHASES } from "@apex/sim"
import { LAB_CAST, labStepsFor } from "./steps"

describe("movelab steps", () => {
  it("far range stages approach + launch + impact", () => {
    const steps = labStepsFor("flame_charge", "far")
    expect(steps.map((s) => s.kind)).toEqual([
      "approach",
      "projectile",
      "impact",
    ])
  })

  it("close range skips the approach", () => {
    const steps = labStepsFor("flame_charge", "close")
    expect(steps.map((s) => s.kind)).toEqual(["projectile", "impact"])
  })

  it("point-blank replays the launch body compressed from impact alone", () => {
    const steps = labStepsFor("flame_charge", "point-blank")
    expect(steps.map((s) => s.kind)).toEqual(["impact"])
  })

  it("carries the move identity, beats, and phases every step", () => {
    for (const range of ["far", "close", "point-blank"] as const) {
      const steps = labStepsFor("cinder_shot", range, LAB_CAST, 4)
      expect(steps.length).toBeGreaterThan(0)
      for (const step of steps) {
        expect(step.tick).toBe(4)
        expect(step.moveId).toBe("cinder_shot")
        expect(step.element).toBe(getMove("cinder_shot")?.element)
        expect(step.actorKey).toBe(LAB_CAST.attackerKey)
        expect(step.target).toBe(LAB_CAST.defender)
        expect(step.beats).toBe(PLAYBACK_BEATS[step.kind])
        expect(step.phases).toBe(PLAYBACK_PHASES[step.kind])
      }
    }
  })

  it("marks hits only on the impact step", () => {
    const steps = labStepsFor("blaze_bolt", "far")
    for (const step of steps) {
      expect(step.hit).toBe(step.kind === "impact" ? true : undefined)
    }
  })

  it("stages barrier rows through the same launch + impact path", () => {
    const steps = labStepsFor("pyre_wall", "far")
    expect(steps.map((s) => s.kind)).toEqual([
      "approach",
      "projectile",
      "impact",
    ])
    expect(steps[1]?.element).toBe("fire")
  })
})
