import { describe, expect, test } from "bun:test"
import type { Creature } from "./index"
import {
  type CupSession,
  chooseStarter,
  completeCup,
  createInitialState,
  cupPlacement,
  defaultLoadout,
  finalizeCup,
  forfeitCup,
  type GameState,
  getSpecies,
  makeBracket,
  makeExhibition,
  prepareCup,
  type RoundVerdict,
  resolveBattle,
  resolvePlayerMatch,
  type Tactic,
} from "./index"
import { advanceDay } from "./ticker"

/** A state standing on cup day 7 with a live creature (phase "cup"). */
function cupDayState(seed = 42): GameState {
  let s = advanceDay(chooseStarter(createInitialState(), "fire_drake", seed))
  while (s.day < 7) s = advanceDay(s)
  return s
}

/** Default coach picks for a state's creature (equipped kit, balanced). */
function defaultPicks(s: GameState): {
  loadout: readonly string[]
  tactic: Tactic
  creature: Creature
} {
  const creature = s.creature as Creature
  const species = getSpecies(creature.speciesId)
  if (!species) throw new Error("unknown species")
  return {
    loadout: defaultLoadout(creature, species),
    tactic: "balanced",
    creature,
  }
}

describe("prepareCup — the live cup session (design locked, pre-resolution)", () => {
  test("returns a session whose bracket is the seeded 8-slot field", () => {
    const s = cupDayState()
    const session = prepareCup(s)
    if (!session) throw new Error("session did not resolve")
    expect(session.bracket.slots.length).toBe(8)
    expect(session.bracket.slots[0]?.isPlayer).toBe(true)
    expect(session.bracket.day).toBe(7)
  })

  test("pre-resolves exactly the player-independent subtree: QF2, QF3, QF4, SF2", () => {
    const s = cupDayState()
    const session = prepareCup(s)
    if (!session) throw new Error("session did not resolve")
    expect(session.rivalVerdicts.length).toBe(4)
    const slots = session.bracket.slots
    const slotName = (i: number): string => {
      const slot = slots[i]
      if (!slot) throw new Error(`missing slot ${i}`)
      return slot.name
    }
    // Round-1 rival pairings in bracket order.
    const [qf2, qf3, qf4, sf2] = session.rivalVerdicts
    if (!qf2 || !qf3 || !qf4 || !sf2) throw new Error("missing rival verdicts")
    expect(qf2.slotA).toBe(slotName(2))
    expect(qf2.slotB).toBe(slotName(3))
    expect(qf2.round).toBe(1)
    expect(qf3.slotA).toBe(slotName(4))
    expect(qf3.slotB).toBe(slotName(5))
    expect(qf4.slotA).toBe(slotName(6))
    expect(qf4.slotB).toBe(slotName(7))
    // SF2 joins the QF3/QF4 winners.
    expect(sf2.round).toBe(2)
    expect([qf3.winner, qf4.winner]).toContain(sf2.slotA)
    expect([qf3.winner, qf4.winner]).toContain(sf2.slotB)
    // None of the pre-resolved pairings involve the player.
    for (const v of session.rivalVerdicts) {
      expect(v.slotA).not.toBe(s.creature?.name)
      expect(v.slotB).not.toBe(s.creature?.name)
    }
  })

  test("every pre-resolved verdict carries replayable battle events", () => {
    const s = cupDayState()
    const session = prepareCup(s)
    if (!session) throw new Error("session did not resolve")
    for (const v of session.rivalVerdicts) {
      if (!v.battle) throw new Error("verdict lost its battle")
      expect(v.battle.events.length).toBeGreaterThan(0)
      expect(v.battle.winner).toBe(v.winner)
    }
  })

  test("is pure: the state is untouched and the phase stays cup", () => {
    const s = cupDayState()
    const before = JSON.stringify(s)
    prepareCup(s)
    expect(JSON.stringify(s)).toBe(before)
    expect(s.phase).toBe("cup")
  })

  test("is deterministic from (day, identity): same state → same session", () => {
    const s = cupDayState()
    const a = prepareCup(s)
    const b = prepareCup(s)
    expect(a).toEqual(b)
  })

  test("different creatures on the same day draw different fields", () => {
    const a = prepareCup(cupDayState(42))
    const b = prepareCup(cupDayState(77))
    expect(a?.bracket.slots.map((x) => x.name)).not.toEqual(
      b?.bracket.slots.map((x) => x.name),
    )
  })

  test("returns null without a creature (illegal entry)", () => {
    expect(prepareCup(createInitialState())).toBeNull()
  })
})

describe("resolvePlayerMatch — the live player branch", () => {
  test("resolves QF1 live on a fresh session", () => {
    const s = cupDayState()
    const session = prepareCup(s)
    if (!session) throw new Error("session did not resolve")
    const picks = defaultPicks(s)
    const r = resolvePlayerMatch(session, picks.loadout, picks.tactic)
    expect(r.session.playerVerdicts.length).toBe(1)
    if (!r.verdict.battle) throw new Error("verdict lost its battle")
    expect(r.verdict.battle.events.length).toBeGreaterThan(0)
    const winner = r.verdict.winner
    if (!winner) throw new Error("no winner in the live QF1")
    expect([picks.creature.name, r.verdict.slotB]).toContain(winner)
  })

  test("a win advances to the next round against the pre-resolved winner", () => {
    // Sweep seeds until the player takes their quarterfinal.
    for (let seed = 1; seed <= 40; seed++) {
      const s = cupDayState(seed)
      const session = prepareCup(s)
      if (!session) throw new Error("session did not resolve")
      const picks = defaultPicks(s)
      const r = resolvePlayerMatch(session, picks.loadout, picks.tactic)
      if (r.verdict.winner !== picks.creature.name) continue
      expect(r.session.nextPlayerRound).toBe(2)
      expect(r.session.status).toBe("player-turn")
      const rivalWinner = session.rivalVerdicts[0]?.winner
      if (rivalWinner === undefined || rivalWinner === null) {
        throw new Error("QF2 resolved without a winner")
      }
      expect(r.session.nextOpponent?.name).toBe(rivalWinner)
      return
    }
    throw new Error("no winning seed found in the sweep")
  })

  test("a loss marks the session eliminated (the bracket rest is separate)", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = cupDayState(seed)
      const session = prepareCup(s)
      if (!session) throw new Error("session did not resolve")
      const picks = defaultPicks(s)
      const r = resolvePlayerMatch(session, picks.loadout, picks.tactic)
      if (r.verdict.winner === picks.creature.name) continue
      expect(r.session.status).toBe("eliminated")
      expect(r.session.nextPlayerRound).toBe(0)
      expect(r.session.championName).toBeNull()
      return
    }
    throw new Error("no losing seed found in the sweep")
  })

  test("the coach's tactic changes the battle (specials vs balanced)", () => {
    // FR6: the two tactics rank by different objectives (expected damage vs
    // damage per window), so they only diverge when the kit holds moves of
    // *different* cooldowns — dividing by `1 + cooldown` is a no-op when every
    // move cools for the same number of actions. A fresh baby unlocks two
    // cooldown-1 moves (`unlockedKit`), so the full species kit is what makes
    // the choice observable.
    for (let seed = 1; seed <= 40; seed++) {
      const s = cupDayState(seed)
      const session = prepareCup(s)
      if (!session) throw new Error("session did not resolve")
      const picks = defaultPicks(s)
      const species = getSpecies(picks.creature.speciesId)
      if (!species) throw new Error("unknown species")
      const a = resolvePlayerMatch(session, species.kit, "balanced")
      const b = resolvePlayerMatch(session, species.kit, "specials")
      if (!a.verdict.battle || !b.verdict.battle) {
        throw new Error("verdict lost its battle")
      }
      if (
        JSON.stringify(a.verdict.battle) === JSON.stringify(b.verdict.battle)
      ) {
        continue
      }
      expect(a.verdict.battle.events).not.toEqual(b.verdict.battle.events)
      return
    }
    throw new Error("no tactic-sensitive seed found in the sweep")
  })

  test("is deterministic: same session + same picks → same battle", () => {
    const s = cupDayState()
    const session = prepareCup(s)
    if (!session) throw new Error("session did not resolve")
    const picks = defaultPicks(s)
    const a = resolvePlayerMatch(session, picks.loadout, picks.tactic)
    const b = resolvePlayerMatch(session, picks.loadout, picks.tactic)
    expect(a.verdict.battle).toEqual(b.verdict.battle)
    expect(a.session).toEqual(b.session)
  })

  test("is pure: the input session is untouched", () => {
    const s = cupDayState()
    const session = prepareCup(s)
    if (!session) throw new Error("session did not resolve")
    const picks = defaultPicks(s)
    const before = JSON.stringify(session)
    resolvePlayerMatch(session, picks.loadout, picks.tactic)
    expect(JSON.stringify(session)).toBe(before)
  })

  test("a full win path crowns the player through three live matches", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = cupDayState(seed)
      let session = prepareCup(s)
      if (!session) throw new Error("session did not resolve")
      const picks = defaultPicks(s)
      let crowned = false
      for (let round = 1; round <= 3; round++) {
        if (session.status !== "player-turn") break
        const r = resolvePlayerMatch(session, picks.loadout, picks.tactic)
        session = r.session
        if (r.verdict.winner !== picks.creature.name) break
        if (session.status === "champion") crowned = true
      }
      if (!crowned) continue
      expect(session.status).toBe("champion")
      expect(session.championName).toBe(picks.creature.name)
      expect(session.nextPlayerRound).toBe(0)
      expect(session.playerVerdicts.length).toBe(3)
      return
    }
    throw new Error("no champion seed found in the sweep")
  })
})

describe("determinism contract — the live cup is replayable", () => {
  /** Play one full tournament (win or lose) with fixed picks; return the
   * complete record: rival verdicts, player battles, champion. */
  function fullRun(seed: number): unknown {
    const s = cupDayState(seed)
    let session = prepareCup(s)
    if (!session) throw new Error("session did not resolve")
    const picks = defaultPicks(s)
    // A deliberate non-default loadout order to exercise the coach path.
    const loadout = [...picks.loadout].reverse()
    let champion: string | null = null
    for (let i = 0; i < 3; i++) {
      if (session.status !== "player-turn") break
      const r = resolvePlayerMatch(session, loadout, "specials")
      session = r.session
    }
    if (session.status === "eliminated") session = completeCup(session)
    champion = session.championName
    return {
      rivals: session.rivalVerdicts.map((v) => [v.winner, v.battle?.events]),
      players: session.playerVerdicts.map((v) => [v.winner, v.battle?.events]),
      champion,
    }
  }

  test("same state + same picks → identical tournaments across three runs", () => {
    const a = fullRun(42)
    expect(a).toEqual(fullRun(42))
    expect(a).toEqual(fullRun(42))
  })

  test("different coach picks → (expected) different player battles", () => {
    const s = cupDayState(42)
    const session = prepareCup(s)
    if (!session) throw new Error("session did not resolve")
    const picks = defaultPicks(s)
    const species = getSpecies(picks.creature.speciesId)
    if (!species) throw new Error("unknown species")
    // Full kit: the two objectives coincide on a kit of equal cooldowns (see
    // the tactic test above), so the divergence needs a cd-2 move in play.
    const balanced = resolvePlayerMatch(session, species.kit, "balanced")
    const specials = resolvePlayerMatch(session, species.kit, "specials")
    expect(balanced.verdict.battle).not.toEqual(specials.verdict.battle)
  })

  test("spar exhibition resolution stays independent of the cup session", () => {
    // The spectator spar flow keeps its own pre-resolved model; the cup
    // session machinery must not have coupled into it.
    const s = cupDayState()
    const creature = s.creature as Creature
    const species = getSpecies(creature.speciesId)
    if (!species) throw new Error("unknown species")
    const a = makeExhibition(creature, "balanced", 12345)
    const b = makeExhibition(creature, "balanced", 12345)
    // A SparSetup is unresolved — the spar flow resolves it itself.
    const ra = resolveBattle(a.ownedSide, a.rivalSide, 12345)
    const rb = resolveBattle(b.ownedSide, b.rivalSide, 12345)
    expect(ra.events).toEqual(rb.events)
  })
})

describe("completeCup / forfeitCup / finalizeCup — the cup's end", () => {
  /** Sweep to a session where the player lost in the given round. */
  function eliminatedAt(round: 1 | 2 | 3): {
    s: GameState
    session: ReturnType<typeof prepareCup> & NonNullable<unknown>
    creature: Creature
  } {
    for (let seed = 1; seed <= 60; seed++) {
      const s = cupDayState(seed)
      let session = prepareCup(s)
      if (!session) throw new Error("session did not resolve")
      const creature = s.creature as Creature
      const species = getSpecies(creature.speciesId)
      if (!species) throw new Error("unknown species")
      const picks = {
        loadout: defaultLoadout(creature, species),
        tactic: "balanced" as Tactic,
      }
      for (let r = 1; r < round; r++) {
        const step = resolvePlayerMatch(session, picks.loadout, picks.tactic)
        if (step.verdict.winner !== creature.name) break // lost early — try next seed
        session = step.session
      }
      if (session.playerVerdicts.length !== round - 1) continue
      const last = resolvePlayerMatch(session, picks.loadout, picks.tactic)
      if (last.verdict.winner === creature.name) continue
      if (last.session.playerVerdicts.length !== round) continue
      return { s, session: last.session, creature }
    }
    throw new Error(`no seed eliminates the player in round ${round}`)
  }

  test("completeCup resolves the remaining rival matches after a QF exit", () => {
    const { s, session } = eliminatedAt(1)
    const done = completeCup(session)
    expect(done.status).toBe("eliminated")
    expect(done.completionVerdicts.length).toBe(2) // SF1 + Final
    for (const v of done.completionVerdicts) {
      expect(v.battle).not.toBeNull()
      expect(v.battle?.events.length).toBeGreaterThan(0)
    }
    expect(done.championName).not.toBeNull()
    expect(done.championName).not.toBe(s.creature?.name)
    // The final's winner is the champion.
    expect(done.completionVerdicts[1]?.winner).toBe(done.championName)
  })

  test("completeCup after a final loss: the SF2 winner is champion", () => {
    const { s, session } = eliminatedAt(3)
    const done = completeCup(session)
    expect(done.completionVerdicts.length).toBe(0)
    const sf2Winner = session.rivalResolutions[3]?.winner.name
    if (sf2Winner === undefined) throw new Error("missing SF2 winner")
    expect(done.championName).toBe(sf2Winner)
    expect(done.championName).not.toBe(s.creature?.name)
  })

  test("completeCup rejects a live session (the player is still in it)", () => {
    const s = cupDayState()
    const session = prepareCup(s)
    if (!session || !s.creature) throw new Error("session did not resolve")
    expect(() => completeCup(session)).toThrow()
  })

  test("forfeitCup awards the current round to the opponent and completes", () => {
    const s = cupDayState()
    const session = prepareCup(s)
    if (!session) throw new Error("session did not resolve")
    const done = forfeitCup(session)
    expect(done.status).toBe("eliminated")
    expect(done.championName).not.toBeNull()
    // The forfeit verdict: no battle, opponent wins, line says forfeit.
    const forfeit = done.playerVerdicts[done.playerVerdicts.length - 1]
    expect(forfeit?.battle).toBeNull()
    expect(forfeit?.winner).toBe(session.nextOpponent?.name)
    expect(forfeit?.line.toLowerCase()).toContain("forfeit")
    // SF1 + Final still resolve as real battles after the forfeit.
    expect(done.completionVerdicts.length).toBe(2)
    expect(done.completionVerdicts[0]?.battle).not.toBeNull()
    expect(done.completionVerdicts[1]?.battle).not.toBeNull()
  })

  test("forfeitCup rejects a session that is not waiting on the player", () => {
    const s = cupDayState()
    const session = prepareCup(s)
    if (!session) throw new Error("session did not resolve")
    const picks = defaultPicks(s)
    const r = resolvePlayerMatch(session, picks.loadout, picks.tactic)
    if (r.session.status !== "player-turn") {
      expect(() => forfeitCup(r.session)).toThrow()
      return
    }
    // If the player won, forfeiting the semifinal must work — assert the
    // round advanced instead.
    expect(r.session.nextPlayerRound).toBe(2)
  })

  test("finalizeCup: the champion gets the win bundle and the phase flips", () => {
    // Sweep to a full championship.
    for (let seed = 1; seed <= 60; seed++) {
      const s = cupDayState(seed)
      let session = prepareCup(s)
      if (!session) throw new Error("session did not resolve")
      const creature = s.creature as Creature
      const species = getSpecies(creature.speciesId)
      if (!species) throw new Error("unknown species")
      const picks = {
        loadout: defaultLoadout(creature, species),
        tactic: "balanced" as Tactic,
      }
      for (
        let round = 1;
        round <= 3 && session.status === "player-turn";
        round++
      ) {
        session = resolvePlayerMatch(
          session,
          picks.loadout,
          picks.tactic,
        ).session
      }
      if (session.status !== "champion") continue
      const before = creature.conditions
      const next = finalizeCup(s, session)
      expect(next.phase).toBe("day")
      expect(next.cupsWon).toBe(s.cupsWon + 1)
      expect(next.lastCupDay).toBe(7)
      const after = next.creature
      if (!after) throw new Error("rewards dropped the creature")
      expect(after.conditions.bond).toBe(Math.min(100, before.bond + 10))
      expect(after.conditions.mood).toBe(Math.min(100, before.mood + 15))
      expect(JSON.stringify(s)).toBe(JSON.stringify(cupDayState(seed))) // pure
      return
    }
    throw new Error("no champion seed found in the sweep")
  })

  test("finalizeCup: a QF exit pays only the +2 mood consolation", () => {
    const { s, session } = eliminatedAt(1)
    const done = completeCup(session)
    const before = s.creature?.conditions
    if (!before) throw new Error("cup day without a creature")
    const next = finalizeCup(s, done)
    expect(next.phase).toBe("day")
    expect(next.cupsWon).toBe(s.cupsWon)
    expect(next.lastCupDay).toBe(s.lastCupDay)
    const after = next.creature
    if (!after) throw new Error("rewards dropped the creature")
    expect(after.conditions.bond).toBe(before.bond)
    expect(after.conditions.mood).toBe(Math.min(100, before.mood + 2))
  })
})

describe("placement regression — a draw cannot under-place the player", () => {
  const verdict = (
    round: number,
    winner: string | null,
    opponent: string,
  ): RoundVerdict => ({
    round,
    slotA: "Ember Drake",
    slotB: opponent,
    winner,
    line: winner
      ? `${winner} takes the round.`
      : "Both fighters are down — the round is a draw.",
    battle: null,
  })

  const stubSession = (
    status: CupSession["status"],
    playerVerdicts: readonly RoundVerdict[],
    championName: string | null,
  ): CupSession => {
    const s = cupDayState(42)
    const creature = s.creature
    if (!creature) throw new Error("no creature on cup day")
    return {
      bracket: makeBracket(creature, s.day),
      seed: 0,
      rivalResolutions: [],
      rivalVerdicts: [],
      playerVerdicts,
      completionVerdicts: [],
      nextPlayerRound: 0,
      nextOpponent: null,
      status,
      championName,
    }
  }

  test("a drawn final still crowns the champion at 1st", () => {
    const me = "Ember Drake"
    const session = stubSession(
      "champion",
      [
        verdict(1, me, "Cindersnout"),
        verdict(2, me, "Bonfire Brook"),
        verdict(3, null, "Reedle Mirefin"),
      ],
      me,
    )
    expect(cupPlacement(session)).toBe(1)
  })

  test("a drawn quarterfinal followed by a semifinal loss places 3rd", () => {
    const me = "Ember Drake"
    const session = stubSession(
      "eliminated",
      [verdict(1, null, "Cindersnout"), verdict(2, "Bonfire Brook", me)],
      "Bonfire Brook",
    )
    expect(cupPlacement(session)).toBe(3)
  })
})

describe("finalizeCup — ladder points (bronze ladder)", () => {
  test("the champion banks +3 ladder points", () => {
    // Sweep for a champion seed (same scaffolding as the win-bundle test).
    for (let seed = 1; seed <= 60; seed++) {
      const s = cupDayState(seed)
      let session = prepareCup(s)
      if (!session) throw new Error("session did not resolve")
      const creature = s.creature as Creature
      const species = getSpecies(creature.speciesId)
      if (!species) throw new Error("unknown species")
      const picks = {
        loadout: defaultLoadout(creature, species),
        tactic: "balanced" as Tactic,
      }
      for (
        let round = 1;
        round <= 3 && session.status === "player-turn";
        round++
      ) {
        session = resolvePlayerMatch(
          session,
          picks.loadout,
          picks.tactic,
        ).session
      }
      if (session.status !== "champion") continue
      const next = finalizeCup(s, session)
      expect(next.ladder).toEqual({ points: 3, tier: "bronze", subTier: "III" })
      return
    }
    throw new Error("no champion seed found in the sweep")
  })

  test("a QF exit banks 0 ladder points", () => {
    // Same sweep as eliminatedAt(1) above (that helper is describe-scoped):
    // find a seed where the player loses the quarterfinal outright.
    for (let seed = 1; seed <= 60; seed++) {
      const s = cupDayState(seed)
      const session = prepareCup(s)
      if (!session) throw new Error("session did not resolve")
      const creature = s.creature as Creature
      const species = getSpecies(creature.speciesId)
      if (!species) throw new Error("unknown species")
      const picks = {
        loadout: defaultLoadout(creature, species),
        tactic: "balanced" as Tactic,
      }
      const last = resolvePlayerMatch(session, picks.loadout, picks.tactic)
      if (last.verdict.winner === creature.name) continue
      const next = finalizeCup(s, completeCup(last.session))
      expect(next.ladder).toEqual({ points: 0, tier: "bronze", subTier: "III" })
      return
    }
    throw new Error("no seed eliminates the player in round 1")
  })

  test("a forfeited cup banks 0 points even from the semifinal round", () => {
    // Win the QF, then give away the semifinal: the placement reads 3 but
    // the null-battle forfeit verdict must zero the points.
    for (let seed = 1; seed <= 60; seed++) {
      const s = cupDayState(seed)
      const session = prepareCup(s)
      if (!session) throw new Error("session did not resolve")
      const creature = s.creature as Creature
      const species = getSpecies(creature.speciesId)
      if (!species) throw new Error("unknown species")
      const picks = {
        loadout: defaultLoadout(creature, species),
        tactic: "balanced" as Tactic,
      }
      const r = resolvePlayerMatch(session, picks.loadout, picks.tactic)
      if (r.session.status !== "player-turn") continue // lost the QF
      const next = finalizeCup(s, forfeitCup(r.session))
      expect(next.ladder).toEqual({ points: 0, tier: "bronze", subTier: "III" })
      return
    }
    throw new Error("no QF-win seed found in the sweep")
  })
})
