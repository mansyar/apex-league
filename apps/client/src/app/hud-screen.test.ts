/**
 * The debrief announce wrapper (postcup_morning_after FR-6, review F4):
 * the HUD's update is wrapped so the ritual day's coach debrief leads
 * the ticker exactly once — the chain (routine update → debrief gate →
 * announceMorningAfter) has no other caller, so this file pins it with
 * a fake Hud double.
 */
import { describe, expect, test } from "bun:test"
import type { GameState } from "@apex/sim"
import type { Hud } from "../hud"
import type { MorningAfterDerivation } from "../morning-after/derive"
import { withMorningAfterDebrief } from "./hud-screen"

const derivation = (): MorningAfterDerivation => ({
  class: "gatekeep",
  amplifiers: [],
  bossId: null,
})

/** A minimal Hud double: the wrapper only drives update and the debrief
 * announce — everything else is spread through untouched. */
const hudDouble = (lines: string[]): Hud =>
  ({
    update: () => {},
    announceMorningAfter: (line: string) => {
      lines.push(line)
    },
  }) as unknown as Hud

/** The only state the wrapper reads: the sim day and the creature. */
const ritualState = (day: number): GameState =>
  ({ day, creature: { name: "Pip" } }) as unknown as GameState

describe("the hud's morning-after debrief wrapper (FR-6)", () => {
  test("says exactly once per ritual day, and never after the settle", () => {
    const lines: string[] = []
    let pending: MorningAfterDerivation | null = derivation()
    const hud = withMorningAfterDebrief(hudDouble(lines), () => pending)
    hud.update(ritualState(7))
    hud.update(ritualState(7)) // the same day again — the latch holds
    expect(lines).toHaveLength(1)
    // The settle: the bank is consumed, so no day ever says again.
    pending = null
    hud.update(ritualState(7))
    hud.update(ritualState(8))
    expect(lines).toHaveLength(1)
  })
})
