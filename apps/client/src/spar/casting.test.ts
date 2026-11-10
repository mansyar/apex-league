/**
 * The HUD's HP denominator (continuous-arena-battle FR-21 rework): a fight's
 * bars must be measured against the pool the resolver actually fights on.
 *
 * The regression: the sim scales every side's HP by `HP_SCALE_PERCENT`, while
 * the HUD's maximum came from the creature's stat HP. Every step's `hpAfter`
 * (the scaled pool) therefore sat above its maximum, `hpFraction` clamped to
 * 1, and no bar ever moved — so a test that only checks `maxHp` is not enough.
 * This one walks the playback script to a landed hit and checks the fill
 * fraction actually drops.
 */
import { describe, expect, test } from "bun:test"
import { createCreature, makeExhibition, startingHp } from "@apex/sim"
import { hpFraction } from "../battleHud"
import { scriptFor } from "../playback-script"
import { fightNowFor } from "./casting"
import { resolveSpar } from "./resolve"

const drake = createCreature("fire_drake", 7)
const SEED = 4242
const setup = makeExhibition(drake, "balanced", SEED)
const verdict = resolveSpar(setup, SEED)
const fight = fightNowFor(setup)
const steps = scriptFor(verdict)

describe("fightNowFor", () => {
  test("maxHp is the pool the resolver opens the fight with", () => {
    expect(fight.owned.maxHp).toBe(startingHp(setup.ownedSide))
    expect(fight.rival.maxHp).toBe(startingHp(setup.rivalSide))
    // Phase 5 (FR-2): the sheet's HP is the pool the fight is fought on.
    expect(fight.owned.maxHp).toBe(setup.ownedSide.stats.hp)
    expect(fight.rival.maxHp).toBe(setup.rivalSide.stats.hp)
  })

  test("the first landed hit takes a bar below full", () => {
    const sides = [fight.owned, fight.rival]
    // The very first damaging step, not merely some later one: under the bug
    // this step still reported HP above the stat-HP maximum, so the bar read
    // full at the exact moment the announcer called a hit.
    const hit = steps.find((step) => (step.damage ?? 0) > 0)
    if (!hit) throw new Error("The spar logged no damage at all")

    const dropped = sides.filter((side) => {
      const hp = hit.hpAfter[side.key]
      return hp !== undefined && hp < side.maxHp
    })
    expect(dropped.length).toBeGreaterThan(0)

    for (const side of dropped) {
      const hp = hit.hpAfter[side.key]
      if (hp === undefined) throw new Error(`No HP for ${side.name}`)
      // The regression was here: a stat-HP denominator clamped this to 1.
      expect(hpFraction(hp, side.maxHp)).toBeLessThan(1)
    }
  })
})
