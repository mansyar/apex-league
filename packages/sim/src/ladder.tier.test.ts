/**
 * Tier-aware ladder tests (silver_ladder_bosses_20261016): LadderState gains
 * a tier; the Promotion Cup's champion flips Bronze → Silver; Silver's three
 * sub-tiers climb automatically on points, never demote. Table-driven per
 * the workflow: every rule has success AND failure cases. Threshold values
 * are referenced through the exported constants so the Phase 3 balance
 * probe can retune them without breaking this suite.
 */

import { describe, expect, it } from "bun:test"
import type { LadderState } from "./ladder"
import {
  applyCupPlacement,
  initialLadder,
  LADDER_THRESHOLDS,
  promotionEligible,
  SILVER_THRESHOLDS,
  subTierFor,
} from "./ladder"
import { createInitialState, type GameState } from "./state"

function freshState(): GameState {
  return createInitialState()
}

/** Build a state carrying an explicit ladder slice (test helper). */
function withLadder(state: GameState, ladder: LadderState): GameState {
  return { ...state, ladder }
}

describe("initialLadder — tier model", () => {
  it("starts at Bronze III with zero points", () => {
    expect(initialLadder()).toEqual({
      points: 0,
      tier: "bronze",
      subTier: "III",
    })
  })

  it("is part of the fresh GameState", () => {
    expect(freshState().ladder).toEqual({
      points: 0,
      tier: "bronze",
      subTier: "III",
    })
  })
})

describe("subTierFor — tier-aware derivation", () => {
  it("bronze derives from the bronze thresholds", () => {
    expect(subTierFor("bronze", 0)).toBe("III")
    expect(subTierFor("bronze", LADDER_THRESHOLDS.bronzeII)).toBe("II")
    expect(subTierFor("bronze", LADDER_THRESHOLDS.bronzeI)).toBe("I")
  })

  it("bronze clamps at I — banked points never fake a climb", () => {
    expect(subTierFor("bronze", LADDER_THRESHOLDS.bronzeI + 99)).toBe("I")
  })

  it("silver derives from the silver thresholds", () => {
    expect(subTierFor("silver", SILVER_THRESHOLDS.silverII)).toBe("II")
    expect(subTierFor("silver", SILVER_THRESHOLDS.silverI)).toBe("I")
  })

  it("silver floors at III below the Silver II threshold", () => {
    expect(subTierFor("silver", SILVER_THRESHOLDS.silverII - 1)).toBe("III")
  })

  it("silver clamps at I — no Gold tier exists", () => {
    expect(subTierFor("silver", SILVER_THRESHOLDS.silverI + 99)).toBe("I")
  })
})

describe("applyCupPlacement — promotion resolution", () => {
  it("a promotion champion flips to Silver III and banks the points", () => {
    // Eligible: Bronze I with points banked past the Bronze I ceiling.
    const s = withLadder(freshState(), {
      points: LADDER_THRESHOLDS.bronzeI + 3,
      tier: "bronze",
      subTier: "I",
    })
    const r = applyCupPlacement(s, 1, false, "promotion")
    expect(r.state.ladder).toEqual({
      points: LADDER_THRESHOLDS.bronzeI + 6,
      tier: "silver",
      subTier: "III",
    })
    expect(r.promoted).toBe(true)
    expect(r.climbed).toBe(true)
  })

  it("a promotion runner-up loss banks points and stays Bronze", () => {
    const s = withLadder(freshState(), {
      points: LADDER_THRESHOLDS.bronzeI + 1,
      tier: "bronze",
      subTier: "I",
    })
    const r = applyCupPlacement(s, 2, false, "promotion")
    expect(r.state.ladder.tier).toBe("bronze")
    expect(r.state.ladder.subTier).toBe("I")
    expect(r.state.ladder.points).toBe(LADDER_THRESHOLDS.bronzeI + 3)
    expect(r.promoted).toBe(false)
    expect(r.climbed).toBe(false)
  })

  it("a forfeited promotion cup awards 0 and changes nothing", () => {
    const s = withLadder(freshState(), {
      points: LADDER_THRESHOLDS.bronzeI + 1,
      tier: "bronze",
      subTier: "I",
    })
    const r = applyCupPlacement(s, 1, true, "promotion")
    expect(r.state.ladder).toEqual({
      points: LADDER_THRESHOLDS.bronzeI + 1,
      tier: "bronze",
      subTier: "I",
    })
    expect(r.promoted).toBe(false)
  })

  it("a promotion champion who is already Silver stays put (no re-flip)", () => {
    // Defensive: the sim must not treat a Silver promotion-kind cup as a
    // second promotion.
    const s = withLadder(freshState(), {
      points: SILVER_THRESHOLDS.silverII + 1,
      tier: "silver",
      subTier: "II",
    })
    const r = applyCupPlacement(s, 1, false, "promotion")
    expect(r.state.ladder.tier).toBe("silver")
    expect(r.state.ladder.subTier).toBe("II")
    expect(r.promoted).toBe(false)
  })

  it("a championship cup never flips the tier", () => {
    const s = withLadder(freshState(), {
      points: LADDER_THRESHOLDS.bronzeI + 3,
      tier: "bronze",
      subTier: "I",
    })
    const r = applyCupPlacement(s, 1, false, "championship")
    expect(r.state.ladder.tier).toBe("bronze")
    expect(r.promoted).toBe(false)
  })

  it("kind defaults to championship — existing call sites stay valid", () => {
    const s = withLadder(freshState(), {
      points: LADDER_THRESHOLDS.bronzeI + 3,
      tier: "bronze",
      subTier: "I",
    })
    const r = applyCupPlacement(s, 1, false)
    expect(r.state.ladder.tier).toBe("bronze")
    expect(r.promoted).toBe(false)
  })
})

describe("applyCupPlacement — Silver sub-tier climbs", () => {
  function silverIII(below: number) {
    return withLadder(freshState(), {
      points: SILVER_THRESHOLDS.silverII - below,
      tier: "silver",
      subTier: "III",
    })
  }

  it("crossing the Silver II threshold climbs automatically", () => {
    // Champion (+3) lands exactly on the threshold.
    const s = silverIII(3)
    const r = applyCupPlacement(s, 1, false)
    expect(r.state.ladder.subTier).toBe("II")
    expect(r.state.ladder.tier).toBe("silver")
    expect(r.climbed).toBe(true)
    expect(r.promoted).toBe(false)
  })

  it("one point below the Silver II threshold stays put", () => {
    const s = silverIII(4) // +3 champion → threshold - 1
    const r = applyCupPlacement(s, 1, false)
    expect(r.state.ladder.subTier).toBe("III")
    expect(r.climbed).toBe(false)
  })

  it("crossing the Silver I threshold climbs automatically", () => {
    const s = withLadder(freshState(), {
      points: SILVER_THRESHOLDS.silverI - 1,
      tier: "silver",
      subTier: "II",
    })
    const r = applyCupPlacement(s, 3, false) // semifinal +1 lands on it
    expect(r.state.ladder.subTier).toBe("I")
    expect(r.climbed).toBe(true)
  })

  it("a Silver loss never demotes the sub-tier", () => {
    const s = withLadder(freshState(), {
      points: SILVER_THRESHOLDS.silverI + 5,
      tier: "silver",
      subTier: "I",
    })
    const r = applyCupPlacement(s, 4, false) // early exit, 0 points
    expect(r.state.ladder.subTier).toBe("I")
    expect(r.state.ladder.tier).toBe("silver")
    expect(r.climbed).toBe(false)
  })
})

describe("applyCupPlacement — top of each tier", () => {
  it("banking at Bronze I still reports topReached (Silver awaits)", () => {
    const s = withLadder(freshState(), {
      points: LADDER_THRESHOLDS.bronzeI,
      tier: "bronze",
      subTier: "I",
    })
    const r = applyCupPlacement(s, 3, false)
    expect(r.topReached).toBe(true)
    expect(r.state.ladder.tier).toBe("bronze")
  })

  it("banking at Silver I reports topReached (Gold teaser path)", () => {
    const s = withLadder(freshState(), {
      points: SILVER_THRESHOLDS.silverI,
      tier: "silver",
      subTier: "I",
    })
    const r = applyCupPlacement(s, 1, false)
    expect(r.topReached).toBe(true)
  })

  it("a Silver climb below the top does not report topReached", () => {
    const s = withLadder(freshState(), {
      points: SILVER_THRESHOLDS.silverII - 3,
      tier: "silver",
      subTier: "III",
    })
    const r = applyCupPlacement(s, 1, false) // climbs to II
    expect(r.climbed).toBe(true)
    expect(r.topReached).toBe(false)
  })
})

describe("promotionEligible — derived predicate (FR2)", () => {
  it("is true only when banking past the Bronze I ceiling as Bronze I", () => {
    expect(
      promotionEligible({
        points: LADDER_THRESHOLDS.bronzeI + 1,
        tier: "bronze",
        subTier: "I",
      }),
    ).toBe(true)
  })

  it("is false exactly at the Bronze I ceiling (strictly past it)", () => {
    expect(
      promotionEligible({
        points: LADDER_THRESHOLDS.bronzeI,
        tier: "bronze",
        subTier: "I",
      }),
    ).toBe(false)
  })

  it("is false below the top sub-tier", () => {
    expect(
      promotionEligible({
        points: LADDER_THRESHOLDS.bronzeI + 99,
        tier: "bronze",
        subTier: "II",
      }),
    ).toBe(false)
    expect(
      promotionEligible({
        points: LADDER_THRESHOLDS.bronzeI + 99,
        tier: "bronze",
        subTier: "III",
      }),
    ).toBe(false)
  })

  it("is false in Silver at any point total", () => {
    expect(
      promotionEligible({
        points: SILVER_THRESHOLDS.silverI + 99,
        tier: "silver",
        subTier: "I",
      }),
    ).toBe(false)
  })
})

describe("applyCupPlacement — purity with tiers", () => {
  it("leaves the input state untouched", () => {
    const s = withLadder(freshState(), {
      points: LADDER_THRESHOLDS.bronzeI + 1,
      tier: "bronze",
      subTier: "I",
    })
    const snapshot = structuredClone(s)
    applyCupPlacement(s, 1, false, "promotion")
    expect(s).toEqual(snapshot)
  })
})
