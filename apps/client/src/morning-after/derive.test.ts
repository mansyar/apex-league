/**
 * Classifier contracts for the post-cup morning-after (track
 * 20261024-postcup-morning-after FR-1): the four outcome classes over a
 * finalized cup session, forfeit precedence and the drawn-final crowning,
 * non-cup inputs deriving null, and the gatekeeper boss id surfacing.
 *
 * Pure: no DOM, no timers. Sessions come from the sim's live walk in the
 * runs a real bracket settles (champion, plain elimination), and from
 * scripted finals where the story needs a fixed ending (a drawn final, a
 * forfeit, an elimination by the authored gatekeeper) — mirroring the sim's
 * own synthetic-verdict tests. The classifier reads only session facts
 * (lifecycle status, the last verdict's battle/slotB, the bracket's boss
 * slot), so the syntheses keep every assertable fact honest.
 */
import { describe, expect, test } from "bun:test"
import {
  type BattleResult,
  CUP_ROUNDS,
  type CupSession,
  completeCup,
  createCreature,
  createInitialState,
  defaultLoadout,
  type GameState,
  getBoss,
  getSpecies,
  resolvePlayerMatch,
  startCupSession,
} from "@apex/sim"
import { deriveMorningAfter } from "./derive"

const CUP_DAY = 7

function creature(seed = 42) {
  return createCreature("fire_drake", seed)
}

/** A fresh snapshot pair that crosses no persisted milestone — the
 * milestone detector's own suite pins the crossings (P1.T2). */
function freshState() {
  return createInitialState()
}

/** Play a cup to completion with the default picks (the established
 * view-model baseline). */
function play(
  c: ReturnType<typeof creature>,
  seed: number,
  tactic?: "balanced" | "specials",
): CupSession {
  const species = getSpecies(c.speciesId)
  if (!species) throw new Error("unknown species")
  const loadout = defaultLoadout(c, species)
  let cur = startCupSession(c, CUP_DAY, seed)
  while (cur.status === "player-turn") {
    cur = resolvePlayerMatch(cur, loadout, tactic ?? "balanced").session
  }
  if (cur.status === "eliminated") cur = completeCup(cur)
  return cur
}

/** A scripted battle replay: the classifier reads only the winner-vs-null
 * fact of a verdict, never the replay internals (the sim's
 * cupRewards.test.ts synthetic verdicts carry the same `{} as`). */
const scriptedBattle = {} as BattleResult

/** The Bronze→Silver gatekeeper boss (koda), or fail the test loudly. */
function gateBoss() {
  const boss = getBoss("koda")
  if (!boss) throw new Error("missing boss koda")
  return boss
}

/** Script the final of a still-live session: the player's last verdict
 * (round 3) loses to `opponent`'s name — or is forfeited when `battle`
 * is null — and the bracket completes honestly from there (completeCup
 * crowns the conqueror, so championName is a real finished-cup fact). */
function scriptFinal(
  live: CupSession,
  opponent: string,
  battle: BattleResult | null,
): CupSession {
  const player = live.bracket.slots[0]
  if (!player) throw new Error("missing player slot")
  return completeCup({
    ...live,
    status: "eliminated",
    nextPlayerRound: 0,
    nextOpponent: null,
    playerVerdicts: [
      {
        round: CUP_ROUNDS,
        slotA: player.name,
        slotB: opponent,
        winner: opponent,
        line: "",
        battle,
      },
    ],
  })
}

/** A script of the drawn final (double KO, winner null): the live-cup walk
 * crowns the player on a final draw, so the session ends `champion`. */
function drawnFinal(seed = 101): CupSession {
  const live = startCupSession(creature(), CUP_DAY, seed)
  const player = live.bracket.slots[0]
  if (!player) throw new Error("missing player slot")
  return {
    ...live,
    status: "champion",
    championName: player.name,
    nextPlayerRound: 0,
    nextOpponent: null,
    playerVerdicts: [
      {
        round: CUP_ROUNDS,
        slotA: player.name,
        slotB: live.bracket.finalRival.name,
        winner: null,
        line: "",
        battle: scriptedBattle,
      },
    ],
  }
}

describe("deriveMorningAfter — the outcome classifier (FR-1)", () => {
  test("a champion session derives title", () => {
    const session = play(creature(), 17, "specials")
    expect(session.status).toBe("champion")
    const d = deriveMorningAfter(session, freshState(), freshState())
    expect(d).toEqual({ class: "title", amplifiers: [], bossId: null })
  })

  test("a drawn final (double KO) still crowns — title", () => {
    const d = deriveMorningAfter(drawnFinal(), freshState(), freshState())
    expect(d).not.toBeNull()
    expect(d?.class).toBe("title")
    expect(d?.bossId).toBeNull()
  })

  test("a plain elimination derives exit — placement never read", () => {
    const session = play(creature(), 101)
    expect(session.status).toBe("eliminated")
    const d = deriveMorningAfter(session, freshState(), freshState())
    expect(d).not.toBeNull()
    expect(d?.class).toBe("exit")
    expect(d?.bossId).toBeNull()
  })

  test("a final lost to a plain rival derives exit", () => {
    const live = startCupSession(creature(), CUP_DAY, 101)
    const session = scriptFinal(
      live,
      live.bracket.finalRival.name,
      scriptedBattle,
    )
    const d = deriveMorningAfter(session, freshState(), freshState())
    expect(d?.class).toBe("exit")
    expect(d?.bossId).toBeNull()
  })

  test("elimination by the authored gatekeeper surfaces the boss id", () => {
    const boss = gateBoss()
    const live = startCupSession(creature(), CUP_DAY, 101, "promotion", boss)
    const session = scriptFinal(live, boss.name, scriptedBattle)
    const d = deriveMorningAfter(session, freshState(), freshState())
    expect(d).not.toBeNull()
    expect(d?.class).toBe("gatekeep")
    expect(d?.bossId).toBe("koda")
  })

  test("forfeit overrides every class — even forfeiting the boss final", () => {
    const boss = gateBoss()
    const live = startCupSession(creature(), CUP_DAY, 101, "promotion", boss)
    const session = scriptFinal(live, boss.name, null)
    const d = deriveMorningAfter(session, freshState(), freshState())
    expect(d).not.toBeNull()
    expect(d?.class).toBe("withdrawn")
    expect(d?.bossId).toBeNull()
  })

  test("forfeit in an ordinary round is withdrawn", () => {
    const live = startCupSession(creature(), CUP_DAY, 101)
    const player = live.bracket.slots[0]
    if (!player) throw new Error("missing player slot")
    const rival = live.nextOpponent
    if (!rival) throw new Error("missing fixture rival")
    const session = completeCup({
      ...live,
      status: "eliminated",
      nextPlayerRound: 0,
      nextOpponent: null,
      playerVerdicts: [
        {
          round: 1,
          slotA: player.name,
          slotB: rival.name,
          winner: rival.name,
          line: "",
          battle: null,
        },
      ],
    })
    const d = deriveMorningAfter(session, freshState(), freshState())
    expect(d).not.toBeNull()
    expect(d?.class).toBe("withdrawn")
    expect(d?.bossId).toBeNull()
  })

  test("the first-ever forfeited cup is a withdrawn morning with zero amplifiers (FR-9, AC-6)", () => {
    const live = startCupSession(creature(), CUP_DAY, 101)
    const player = live.bracket.slots[0]
    if (!player) throw new Error("missing player slot")
    const rival = live.nextOpponent
    if (!rival) throw new Error("missing fixture rival")
    const session = completeCup({
      ...live,
      status: "eliminated",
      nextPlayerRound: 0,
      nextOpponent: null,
      playerVerdicts: [
        {
          round: 1,
          slotA: player.name,
          slotB: rival.name,
          winner: rival.name,
          line: "",
          battle: null,
        },
      ],
    })
    // The first-ever cup: both snapshots sit at the persisted zeros — the
    // forfeit crossed no milestone (cupsWon stays 0, no scalps, no claims),
    // so the withdrawn morning carries nothing to amplify it.
    const pre = createInitialState()
    expect(pre.cupsWon).toBe(0)
    expect(pre.bossDefeats).toEqual([])
    expect(pre.claimedTiers).toEqual([])
    const post = { ...pre }
    const d = deriveMorningAfter(session, pre, post)
    expect(d).toEqual({ class: "withdrawn", amplifiers: [], bossId: null })
  })

  test("the finalize's persisted firsts ride along as amplifiers (FR-4)", () => {
    const session = play(creature(), 17, "specials")
    const gate = getBoss("koda")
    if (!gate) throw new Error("missing boss koda")
    // The same finalize: the gate cup won in the final (scalped koda), the
    // ladder standing clears the bronze reward, so every first crosses.
    const post = {
      ...createInitialState(),
      cupsWon: 1,
      bossDefeats: ["koda"],
      claimedTiers: ["silver"] as GameState["claimedTiers"],
    }
    const d = deriveMorningAfter(session, createInitialState(), post)
    expect(d?.class).toBe("title")
    expect(d?.amplifiers).toEqual([
      { kind: "first_title" },
      { kind: "first_scalp", bossId: "koda" },
      { kind: "new_tier", tier: "silver" },
    ])
  })

  test("non-cup input derives null", () => {
    expect(deriveMorningAfter(null, freshState(), freshState())).toBeNull()
    // A live session: the cup has not finalized yet.
    const live = startCupSession(creature(), CUP_DAY, 101)
    expect(deriveMorningAfter(live, freshState(), freshState())).toBeNull()
    // An eliminated session the bracket never completed — no champion,
    // so the machine could not have finalized it.
    const unfinished: CupSession = {
      ...live,
      status: "eliminated",
      nextPlayerRound: 0,
      nextOpponent: null,
      playerVerdicts: [
        {
          round: 1,
          slotA: live.bracket.slots[0]?.name ?? "",
          slotB: live.bracket.finalRival.name,
          winner: live.bracket.finalRival.name,
          line: "",
          battle: scriptedBattle,
        },
      ],
    }
    expect(
      deriveMorningAfter(unfinished, freshState(), freshState()),
    ).toBeNull()
  })
})
