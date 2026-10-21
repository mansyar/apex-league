/**
 * View-model contracts for the cup screens (cup_module_refactor_20261018
 * FR4). Every expected string below was captured from the current
 * `createCup` implementation BEFORE the decomposition — these tests pin
 * the screen-flow decisions, results assembly, give-up semantics and
 * entry-chip copy so the split into `cup/` cannot drift any of them.
 *
 * Pure: no DOM, no timers, no event wiring.
 */
import { describe, expect, test } from "bun:test"
import {
  type CupSession,
  completeCup,
  createCreature,
  cupPlacement,
  defaultLoadout,
  getBoss,
  getSpecies,
  resolvePlayerMatch,
  startCupSession,
} from "@apex/sim"
import {
  bracketHeader,
  chipView,
  closeIntent,
  coachTabLabel,
  initialPicks,
  resultsView,
  walkStep,
} from "./view-models"

/** Unwrap a possibly-absent test fixture or fail the test loudly. */
function defined<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) throw new Error(`missing ${label}`)
  return value
}

const CUP_DAY = 7

function creature(seed = 42) {
  return createCreature("fire_drake", seed)
}

/** Play a cup to completion with the default picks. */
function play(
  c: ReturnType<typeof creature>,
  day: number,
  seed: number,
  tactic: "balanced" | "specials" = "balanced",
): CupSession {
  const species = getSpecies(c.speciesId)
  if (!species) throw new Error("unknown species")
  const loadout = defaultLoadout(c, species)
  let cur = startCupSession(c, day, seed)
  while (cur.status === "player-turn") {
    cur = resolvePlayerMatch(cur, loadout, tactic).session
  }
  if (cur.status === "eliminated") cur = completeCup(cur)
  return cur
}

const LADDER_BEFORE = { points: 4, tier: "bronze" as const, subTier: "III" }
const LADDER_AFTER = { points: 6, tier: "bronze" as const, subTier: "II" }

describe("resultsView — the results screen assembly", () => {
  test("a champion reads Champion · takes the {tier} Cup! · unbeaten", () => {
    // Seed 17 wins with the default creature fixture (proven by
    // bracket-model.test.ts's champion runs).
    const session = play(creature(), CUP_DAY, 17, "specials")
    expect(session.status).toBe("champion")
    expect(cupPlacement(session)).toBe(1)
    const view = resultsView(session, LADDER_AFTER, LADDER_BEFORE, 0)
    expect(view.won).toBe(true)
    expect(view.title).toBe("Champion")
    expect(view.cupName).toBe("Bronze Cup")
    expect(view.sub).toBe("Ember Drake takes the Bronze Cup!")
    expect(view.tab).toBe("1st")
    expect(view.line).toBe("Ember Drake · unbeaten through three rounds")
    expect(view.rows).toEqual([
      "+1 action point tomorrow (4 total)",
      "Bond +10",
      "Mood +15",
      "🏆 Cup won",
      "Ladder +2 — promoted to Bronze II",
    ])
  })

  test("an elimination names the champion and the exit stage", () => {
    const session = play(creature(), CUP_DAY, 101)
    expect(session.status).toBe("eliminated")
    const view = resultsView(session, LADDER_BEFORE, LADDER_BEFORE, 0)
    expect(view.won).toBe(false)
    expect(view.title).toBe("Eliminated")
    expect(view.cupName).toBe("Bronze Cup")
    expect(view.sub).toBe(`${session.championName} takes the Bronze Cup.`)
    expect(view.line).toBe("Ember Drake · out in the quarterfinal")
    expect(view.rows[0]).toBe("Consolation: mood +2")
  })

  test("a Promotion Cup is named as the gate it is", () => {
    // Synthetic: a promotion-kind session at the champion status. The cup
    // name must ignore the tier ladder and read "Promotion Cup".
    const live = startCupSession(creature(), CUP_DAY, 101)
    const promoted: CupSession = {
      ...live,
      status: "champion",
      championName: "Ember Drake",
      bracket: { ...live.bracket, kind: "promotion", banner: "Promotion Cup" },
    }
    const view = resultsView(promoted, LADDER_AFTER, LADDER_BEFORE, 0)
    expect(view.cupName).toBe("Promotion Cup")
    expect(view.sub).toBe("Ember Drake takes the Promotion Cup!")
  })

  test("no champion reads the no-champion line", () => {
    // The won branch owns the sub line when status is champion; the
    // no-champion line is the eliminated-without-champion fallback
    // (a finished session whose champion somehow resolved to null).
    const live = startCupSession(creature(), CUP_DAY, 101)
    const orphan: CupSession = {
      ...live,
      status: "eliminated",
      championName: null,
    }
    const view = resultsView(orphan, LADDER_BEFORE, LADDER_BEFORE, 0)
    expect(view.title).toBe("Eliminated")
    expect(view.sub).toBe("The cup ends without a champion.")
  })
})

describe("walkStep — the strict reveal decisions", () => {
  test("cursor 0 is always the player's quarterfinal with the open line", () => {
    const session = startCupSession(creature(), CUP_DAY, 101)
    const step = walkStep(session, 0)
    expect(step).toEqual({
      kind: "playerTurn",
      id: "qf1",
      label: "Quarterfinal",
      line: "Your quarterfinal. The coaching room is open.",
    })
  })

  test("a resolved rival match reveals its verdict line and advances", () => {
    const session = startCupSession(creature(), CUP_DAY, 101)
    // Cursor 1 = qf2, pre-resolved at entry (rival subtree).
    const step = walkStep(session, 1)
    expect(step.kind).toBe("reveal")
    if (step.kind !== "reveal") return
    expect(step.id).toBe("qf2")
    expect(step.after).toBe("advance")
    expect(step.line).toBe(session.rivalVerdicts[0]?.line ?? "")
    expect(step.line.endsWith("!")).toBe(true)
  })

  test("a player win moves the walk to the next player turn", () => {
    const c = creature()
    const species = getSpecies(c.speciesId)
    if (!species) throw new Error("unknown species")
    // Seed 1: the player wins the QF (the mid-walk fixture of
    // bracket-model.test.ts). The walk must step through the resolved
    // rival reveals (qf2..qf4) before pausing at the next player match.
    const won = resolvePlayerMatch(
      startCupSession(c, CUP_DAY, 1),
      defaultLoadout(c, species),
      "balanced",
    )
    expect(won.session.status).toBe("player-turn")
    expect(walkStep(won.session, 1).kind).toBe("reveal")
    const step = walkStep(won.session, 4)
    expect(step).toEqual({
      kind: "playerTurn",
      id: "sf1",
      label: "Semifinal",
      line: "Your semifinal. The coaching room is open.",
    })
  })

  test("the final reveals and crowns; past the end concludes", () => {
    const c = creature()
    const species = getSpecies(c.speciesId)
    if (!species) throw new Error("unknown species")
    // Seed 17 with the specials tactic is the champion fixture of
    // bracket-model.test.ts for this creature.
    let cur = startCupSession(c, CUP_DAY, 17)
    const loadout = defaultLoadout(c, species)
    cur = resolvePlayerMatch(cur, loadout, "specials").session
    cur = resolvePlayerMatch(cur, loadout, "specials").session
    cur = resolvePlayerMatch(cur, loadout, "specials").session
    expect(cur.status).toBe("champion")
    // Cursor 6 = f1, resolved by the player's own win.
    const final = walkStep(cur, 6)
    expect(final).toEqual({
      kind: "reveal",
      id: "f1",
      line: "Ember Drake takes the Final!",
      verdict: defined(cur.playerVerdicts[2], "player verdict"),
      after: "crown",
    })
    // Cursor 7: the model is exhausted — conclude.
    expect(walkStep(cur, 7)).toEqual({ kind: "done" })
  })

  test("an unresolved rival match stalls the walk (defensive)", () => {
    // A session whose rival verdicts were stripped: the walk must stop
    // silently (no CTA, no conclude) exactly as today's `if (!v) return`.
    const live = startCupSession(creature(), CUP_DAY, 101)
    const stripped: CupSession = { ...live, rivalVerdicts: [] }
    expect(walkStep(stripped, 1)).toEqual({ kind: "stall", id: "qf2" })
  })
})

describe("closeIntent — the close button's decision tree", () => {
  const cases: Array<
    [
      {
        inBattle: boolean
        committed: boolean
        status: CupSession["status"] | null
      },
      "dismiss" | "free" | "giveup",
    ]
  > = [
    [{ inBattle: true, committed: true, status: "player-turn" }, "dismiss"],
    [{ inBattle: false, committed: false, status: "player-turn" }, "free"],
    [{ inBattle: false, committed: true, status: "player-turn" }, "giveup"],
    [{ inBattle: false, committed: true, status: "eliminated" }, "free"],
    [{ inBattle: false, committed: true, status: "champion" }, "free"],
    [{ inBattle: false, committed: true, status: null }, "free"],
  ]
  for (const [input, want] of cases) {
    test(`${JSON.stringify(input)} → ${want}`, () => {
      expect(closeIntent(input)).toBe(want)
    })
  }
})

describe("chipView — the Enter Cup chip", () => {
  const ladder = { points: 0, tier: "bronze" as const, subTier: "III" }
  const gate = {
    kind: "championship" as const,
    boss: defined(getBoss("hesse"), "boss hesse"),
  }

  test("cup day without a session: visible, standing hint", () => {
    const view = chipView({
      day: CUP_DAY,
      phase: "cup",
      hasCreature: true,
      ladder,
      hasSession: false,
      gate: null,
    })
    expect(view.visible).toBe(true)
    expect(view.enabled).toBe(true)
    expect(view.hint).toBe("Bronze III · 0 pts")
  })

  test("a pending gate boss names the occasion", () => {
    const view = chipView({
      day: CUP_DAY,
      phase: "cup",
      hasCreature: true,
      ladder: { points: 15, tier: "silver", subTier: "I" },
      hasSession: false,
      gate,
    })
    expect(view.hint).toBe("Verdant Dame Hesse holds the final")
  })

  test("a promotion gate reads as the gate it is", () => {
    const view = chipView({
      day: CUP_DAY,
      phase: "cup",
      hasCreature: true,
      ladder: { points: 15, tier: "bronze", subTier: "I" },
      hasSession: false,
      gate: {
        kind: "promotion" as const,
        boss: defined(getBoss("koda"), "boss koda"),
      },
    })
    expect(view.hint).toBe("Promotion Cup awaits")
  })

  test("a resumable session suppresses the gate and keeps the chip alive", () => {
    const view = chipView({
      day: CUP_DAY,
      phase: "day", // entry consumed — the walk can still resume
      hasCreature: true,
      ladder,
      hasSession: true,
      gate, // raw gate passed in; the view-model must null it
    })
    expect(view.visible).toBe(true)
    expect(view.enabled).toBe(true)
    expect(view.hint).toBe("Bronze III · 0 pts")
  })

  test("no cup today and no session: chip hidden and disabled", () => {
    const view = chipView({
      day: 3,
      phase: "day",
      hasCreature: true,
      ladder,
      hasSession: false,
      gate: null,
    })
    expect(view.visible).toBe(false)
    expect(view.enabled).toBe(false)
  })
})

describe("bracketHeader — the board's occasion", () => {
  test("a regular cup is named for the tier it serves", () => {
    const session = startCupSession(creature(), CUP_DAY, 101)
    expect(bracketHeader(session, CUP_DAY, "bronze")).toEqual({
      title: "Bronze Cup",
      sub: "Day 7 · single elimination",
    })
  })

  test("a banner leads the board when the sim provides one", () => {
    const session = startCupSession(creature(), CUP_DAY, 101)
    const bannered: CupSession = {
      ...session,
      bracket: { ...session.bracket, banner: "Promotion Cup" },
    }
    expect(bracketHeader(bannered, CUP_DAY, "bronze").title).toBe(
      "Promotion Cup",
    )
  })
})

describe("coach picks — reset per match", () => {
  test("a creature without a loadout defaults to the species kit, balanced", () => {
    const c = creature()
    const cs = getSpecies(c.speciesId)
    if (!cs) throw new Error("unknown species")
    const bare = { ...c, loadout: null }
    const picks = initialPicks(bare)
    expect(picks).toEqual({
      loadout: [...defaultLoadout(bare, cs)],
      tactic: "balanced",
    })
    // A fresh array: mutating the picks must not touch the species kit.
    expect(picks.loadout).not.toBe(defaultLoadout(bare, cs))
  })

  test("a creature with an existing loadout keeps it", () => {
    const c = { ...creature(), loadout: ["spark", "flame_charge"] }
    expect(initialPicks(c)).toEqual({
      loadout: ["spark", "flame_charge"],
      tactic: "balanced",
    })
  })

  test("coachTab renders the broadcast label", () => {
    expect(coachTabLabel("Quarterfinal")).toBe("Quarterfinal · ready")
  })
})
