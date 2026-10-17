/**
 * The live cup (live-cup spec): entering the cup opens a bracket view —
 * rival matches pre-resolve at entry and reveal in strict tournament
 * order, while the player's branch resolves LIVE at fight time with the
 * coach's kit and tactic picks. The cup is consumed (phase → day) only
 * when the player steps into the arena for the first time; before that,
 * closing is a free look. A give-up after the commit forfeits the current
 * round; a loss auto-completes the bracket to a champion; the results
 * screen finalizes rewards through the sim.
 *
 * Broadcast voice (product guidelines): short, punchy, present tense.
 */

import {
  bossForCup,
  type Creature,
  type CupSession,
  type CupSlot,
  completeCup,
  defaultLoadout,
  effectiveStats,
  endCup,
  finalizeCup,
  forfeitCup,
  type GameState,
  getBoss,
  getMove,
  getSpecies,
  isCupDay,
  type PlaybackStep,
  prepareCup,
  type RoundVerdict,
  resolvePlayerMatch,
  type Tactic,
} from "@apex/sim"
import {
  createBattleSession,
  cupStampTitle,
  type PlaybackFight,
} from "./battle-session"
import { createBattleHud } from "./battleHud"
import {
  buildKitPicker,
  buildTacticRow,
  castFighter,
  toggleKitChoice,
} from "./battleUI"
import {
  type BracketMatch,
  buildBracketModel,
  cupPlacement,
  exitStage,
  ordinalOf,
  resultRows,
} from "./bracket-model"
import {
  buildBattleChips,
  buildBracketScreen,
  buildCoachScreen,
  buildGiveupModal,
  buildResultsScreen,
} from "./cup-screens"
import { crestGlyph, elementHue } from "./element"
import { resolveMotionPref } from "./motion"
import type { FightCasting } from "./staging"
import { visualSeedOf } from "./staging-seed"
import { TIER_NAME } from "./tier-name"
import { icons } from "./ui/icons"
import { chipButton } from "./ui/kit"

export interface CupHandlers {
  /** A player match starts: dissolve into the arena and cast both. */
  onFightStart: (casting: FightCasting) => void
  /** Every playback step steps the arena staging. */
  onStep: (step: PlaybackStep, instant: boolean) => void
  /** The arena scales action animations to the playback pace. */
  onPace: (msPerStep: number) => void
  /** The arena match ended; the bracket takes over again. */
  onArenaExit: () => void
  /**
   * The first coach commit consumed the cup (endCup flipped the phase to
   * "day"): persist the returned state so the entry is durable.
   */
  onCommit: (state: GameState) => void
  /**
   * The cup concluded (champion, loss, or forfeit): the placement is
   * final and the rewards are applied - persist the returned state.
   */
  onFinalize: (state: GameState, session: CupSession) => void
  /**
   * The live session changed (prepared, advanced, forfeited, or cleared):
   * persist it so a refresh anywhere in the walk resumes exactly here.
   * Optional — callers without session persistence may omit it.
   */
  onSession?: (session: CupSession | null) => void
}

export interface Cup {
  /** Sync the chip and live state with the current sim state. */
  update(state: GameState): void
  /** Hold the bracket playback while the tab is away (F5). */
  setPaused(paused: boolean): void
}

/** The strict reveal plan, in true tournament order. */
/** Display id of a bracket match ("qf1".."f1"), derived by the model. */
type MatchId = string

/** Pacing beats for the bracket walk (ms). */
const WALK_SETTLE = 600
const WALK_STAGGER = 700
const WALK_STEP = 500
const WALK_CROWN = 1800
const STAMP_HOLD = 2200
const STAMP_HOLD_REDUCED = 900

export function createCup(
  root: HTMLElement,
  handlers: CupHandlers,
  options?: {
    /**
     * A session restored from the save (save v7): the bracket walk resumes
     * exactly where it stopped — no fresh entry, no re-resolution.
     */
    restoredSession?: CupSession | null
  },
): Cup {
  // The Enter Cup chip sits beside the Spar chip (top-right cluster).
  // Kit chip with the broadcast title/sub stack, matching Spar.
  const { button: cupButton, sub: cupHint } = chipButton({
    glyph: icons.trophy,
    title: "Enter Cup",
    sub: "Cup day · free",
  })
  cupButton.className = "cup-button kit-chip"
  root.append(cupButton)

  // Full-screen overlay, hidden until entry.
  const overlay = document.createElement("div")
  overlay.className = "cup-overlay"
  overlay.style.display = "none"

  // Broadcast backdrop: the navy dome from the approved mock owns the
  // screen while a cup screen is up; it steps aside for arena battles.
  const backdrop = document.createElement("div")
  backdrop.className = "cup-backdrop"
  overlay.append(backdrop)

  const battleHud = createBattleHud(overlay)

  // ------------------------------------------------------------------
  // Screens — the DOM builders live in cup-screens.ts; cup.ts owns the
  // session state machine, timers and the listeners that touch them.
  // ------------------------------------------------------------------
  const {
    screen: bracketScreen,
    headTitle,
    headSub,
    colHeadEls,
    cards,
    champ,
    champName,
    cta,
    ctaGhost,
    ctaGo,
    tickerLine,
  } = buildBracketScreen()

  const {
    screen: coachScreen,
    coachTab,
    fighterCard,
    rivalCard,
    kitCard,
    coachBack,
    coachGo,
  } = buildCoachScreen()

  // The bracket's global close button is declared before the give-up
  // modal because that modal's Escape/Stay handlers hand focus back to
  // it — declaring it later left a latent TDZ trap in those listeners.
  const close = document.createElement("button")
  close.className = "cup-close"
  close.type = "button"
  close.textContent = "Back to the ranch"
  close.style.display = ""

  const { root: giveup, giveupStay, giveupQuit } = buildGiveupModal(close)

  const {
    screen: resultsScreen,
    resultCard,
    resultStamp,
    resultTitle,
    resultSub,
    resultPlateTab,
    resultPlateLine,
    resultRewards,
    resultBack,
  } = buildResultsScreen()

  const { battleChips, fastButton } = buildBattleChips()
  // The boss lower-third (FR11): a broadcast chyron carrying the boss'
  // arena intro for the length of the boss fight. Shown only for boss
  // slots; reduced motion mutes the entrance animation.
  const bossIntro = document.createElement("div")
  bossIntro.className = "cup-boss-intro"
  bossIntro.style.display = "none"
  overlay.append(
    bracketScreen,
    coachScreen,
    resultsScreen,
    giveup,
    battleChips,
    bossIntro,
  )
  /** The verdict quip awaiting the stamp hold (null outside boss fights). */
  let bossQuip: string | null = null
  root.append(overlay)

  // ------------------------------------------------------------------
  // Session state
  // ------------------------------------------------------------------
  let state: GameState | null = null
  let session: CupSession | null = options?.restoredSession ?? null
  // Ladder snapshot at cup entry (save v8): the results screen diffs the
  // post-finalize standing against it to report what the run earned.
  let ladderBefore: GameState["ladder"] | null = null
  /** The cup is consumed (endCup applied) — set at the first coach commit. */
  let committed = false
  /** Reveal cursor into the bracket's walk order. */
  let cursor = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let inBattle = false
  /** The match id currently waiting for the player (CTA shown). */
  let pendingId: MatchId | null = null
  /** The coach's working picks for the pending match. */
  let picks: { loadout: string[]; tactic: Tactic } | null = null
  /** The fight currently in the arena (stamp wording + cleanup). */
  let fightNow: PlaybackFight | null = null

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    // The battle shell's stamp-hold pends under the same "nothing may
    // fire while we reset" contract.
    battle.hold.cancel()
  }

  const reducedMotion = (): boolean =>
    resolveMotionPref(state?.settings.reducedMotion)

  const beat = (ms: number): number => (reducedMotion() ? 0 : ms)

  const setLine = (text: string): void => {
    tickerLine.textContent = text
    // Restart the swap animation for each new line.
    tickerLine.classList.remove("swap")
    void tickerLine.offsetWidth
    tickerLine.classList.add("swap")
  }

  const showScreen = (name: "bracket" | "coach" | "results" | null): void => {
    bracketScreen.style.display = name === "bracket" ? "" : "none"
    coachScreen.style.display = name === "coach" ? "" : "none"
    resultsScreen.style.display = name === "results" ? "" : "none"
    // The global close belongs to the bracket only; the coach and the
    // results have their own exits.
    close.style.display = name === "bracket" ? "" : "none"
  }

  // ------------------------------------------------------------------
  // Session views: verdicts, winners, match slots — all derived by the
  // pure bracket model (bracket-model.ts), never from list positions.
  // ------------------------------------------------------------------
  const playerName = (): string => session?.bracket.slots[0]?.name ?? ""

  const matchOf = (id: MatchId): BracketMatch | null =>
    session
      ? (buildBracketModel(session).find((m) => m.id === id) ?? null)
      : null

  const verdictOf = (id: MatchId): RoundVerdict | null =>
    matchOf(id)?.verdict ?? null

  /** Is this match the player's own fight (given the current session)? */
  const isPlayerMatch = (id: MatchId): boolean =>
    matchOf(id)?.isPlayerMatch ?? false

  const slotsOf = (id: MatchId): { a: CupSlot | null; b: CupSlot | null } => {
    const match = matchOf(id)
    return { a: match?.a ?? null, b: match?.b ?? null }
  }

  // ------------------------------------------------------------------
  // Bracket rendering
  // ------------------------------------------------------------------
  const crest = (element: string): string => crestGlyph(element)

  /** Element hues: ui/element.ts re-derives from the sim's canonical
   * ELEMENT_HUE contract (single source of truth next to the matchup math). */
  const hueColor = (element: string): string =>
    `hsl(${elementHue(element)} 70% 60%)`

  const speciesElement = (speciesId: string): string =>
    getSpecies(speciesId)?.element ?? "fire"

  const fillSlot = (el: HTMLElement, slot: CupSlot | null): void => {
    el.replaceChildren()
    if (!slot) {
      el.classList.add("tbd")
      const dash = document.createElement("span")
      dash.className = "cup-dash"
      dash.textContent = "— — —"
      el.append(dash)
      return
    }
    el.classList.remove("tbd")
    const element = speciesElement(slot.speciesId)
    const ic = document.createElement("span")
    ic.className = "cup-mini-crest"
    ic.style.color = hueColor(element)
    ic.innerHTML = crest(element)
    const name = document.createElement("span")
    name.className = "cup-s-name"
    name.textContent = slot.name
    el.append(ic, name)
    if (slot.isPlayer) {
      const tag = document.createElement("span")
      tag.className = "cup-you-tag"
      tag.textContent = "You"
      el.append(tag)
    }
  }

  /** Fill both slots of a card; stamps winner/loser when a verdict exists. */
  const renderMatch = (id: MatchId): void => {
    const card = cards.get(id)
    if (!card) return
    const { a, b } = slotsOf(id)
    fillSlot(card.slots.a, a)
    fillSlot(card.slots.b, b)
    const v = verdictOf(id)
    card.el.classList.toggle("resolved", v !== null)
    if (v) stampWinner(id, v)
  }

  /** Gold winner, struck-out loser, ribbon down. */
  const stampWinner = (id: MatchId, verdict: RoundVerdict): void => {
    const card = cards.get(id)
    if (!card) return
    card.el.classList.add("resolved")
    card.el.classList.remove("yours")
    card.ribbon.classList.remove("show")
    const { a, b } = slotsOf(id)
    card.slots.a.classList.toggle("won", a?.name === verdict.winner)
    card.slots.a.classList.toggle(
      "lost",
      a !== null && a.name !== verdict.winner,
    )
    card.slots.b.classList.toggle("won", b?.name === verdict.winner)
    card.slots.b.classList.toggle(
      "lost",
      b !== null && b.name !== verdict.winner,
    )
  }

  // ------------------------------------------------------------------
  // The reveal walk
  // ------------------------------------------------------------------
  const ctaShow = (): void => cta.classList.add("show")
  const ctaHide = (): void => cta.classList.remove("show")

  const walk = (): void => {
    clearTimer()
    ctaHide()
    const entry = session ? buildBracketModel(session)[cursor] : undefined
    if (!entry) {
      conclude()
      return
    }
    const card = cards.get(entry.id)
    if (!card) return
    renderMatch(entry.id)
    card.el.classList.add("in")
    colHeadEls[entry.column].classList.add("in")

    const v = verdictOf(entry.id)
    if (isPlayerMatch(entry.id) && !v) {
      // The player's match: highlight, CTA, and pause the walk.
      pendingId = entry.id
      card.el.classList.add("yours")
      card.ribbon.classList.add("show")
      setLine(`Your ${entry.label.toLowerCase()}. The coaching room is open.`)
      ctaShow()
      return
    }
    pendingId = null
    if (!v) return // defensive: nothing resolved to show
    setLine(v.line)
    const advance = (): void => {
      stampWinner(entry.id, v)
      if (entry.id === "f1") {
        crown()
        clearTimer()
        timer = setTimeout(conclude, beat(WALK_CROWN))
        return
      }
      cursor += 1
      timer = setTimeout(walk, beat(WALK_STEP))
    }
    // Rival verdicts land one beat after the names appear (staggered reveal).
    timer = setTimeout(advance, beat(WALK_STAGGER))
  }

  const crown = (): void => {
    const name = session?.championName ?? null
    if (!name) return
    champName.textContent = name
    champ.classList.add("crowned")
  }

  // ------------------------------------------------------------------
  // Results screen
  // ------------------------------------------------------------------
  const showResults = (): void => {
    if (!session || !state) return
    const placement = cupPlacement(session)
    // The title follows the session's status, not the placement: a drawn
    // final (double-KO) crowns the player while placement rounds survive.
    const won = session.status === "champion"
    resultTitle.textContent = won ? "Champion" : "Eliminated"
    resultStamp.classList.toggle("lost", !won)
    // The cup is named for the tier it serves (FR11); a Promotion Cup win
    // reads as the gate it is.
    const cupName =
      session.bracket.kind === "promotion"
        ? "Promotion Cup"
        : `${TIER_NAME[ladderBefore?.tier ?? "bronze"]} Cup`
    resultSub.textContent = won
      ? `${playerName()} takes the ${cupName}!`
      : session.championName
        ? `${session.championName} takes the ${cupName}.`
        : "The cup ends without a champion."
    resultPlateTab.textContent = ordinalOf(placement)
    resultPlateLine.textContent = won
      ? `${playerName()} · unbeaten through three rounds`
      : `${playerName()} · out in the ${exitStage(placement)}`
    resultRewards.replaceChildren()
    const rows = resultRows(
      session,
      state.ladder,
      ladderBefore,
      state.legendTitles,
    )
    rows.forEach((text, i) => {
      const row = document.createElement("div")
      row.className = "cup-reward-row"
      row.textContent = text
      row.style.animationDelay = `${0.25 + i * 0.22}s`
      resultRewards.append(row)
    })
    // Restart the entrance animations.
    resultCard.classList.remove("play")
    void resultCard.offsetWidth
    resultCard.classList.add("play")
    showScreen("results")
  }

  /** The bracket fully played out: finalize the placement through the sim. */
  const conclude = (): void => {
    if (!session || !state) return
    const next = finalizeCup(state, session)
    state = next
    handlers.onFinalize(next, session)
    showResults()
  }

  // ------------------------------------------------------------------
  // Arena battle (player matches)
  // ------------------------------------------------------------------
  const battle = createBattleSession({
    hud: battleHud,
    speedButton: fastButton,
    onStep: (step, instant) => {
      handlers.onStep(step, instant)
    },
    onLine: setLine,
    onFightStart: (casting) => handlers.onFightStart(casting),
    onPace: (msPerStep) => handlers.onPace(msPerStep),
    motionPref: () => state?.settings.reducedMotion === true,
    stampTitle: cupStampTitle,
    onFinish: ({ instant }) => {
      if (!fightNow) return
      battleChips.style.display = "none"
      // Hold the stamp, then back to the bracket. The cursor stays on the
      // match just fought: the walk re-stamps it on the bracket, then
      // continues with the rival reveals.
      clearTimer()
      // Boss final (FR11): the lower-third flips from the intro to the
      // boss' verdict quip for the stamp hold, then the bracket returns.
      if (bossQuip) {
        bossIntro.textContent = bossQuip
        bossQuip = null
      } else {
        bossIntro.style.display = "none"
      }
      battle.hold.begin(
        () => {
          inBattle = false
          fightNow = null
          bossIntro.style.display = "none"
          handlers.onArenaExit()
          battleHud.hide()
          overlay.classList.remove("cup-battling")
          showScreen("bracket")
          // A loss auto-completes the rival bracket to a champion.
          if (session && session.status === "eliminated") {
            session = completeCup(session)
            handlers.onSession?.(session)
          }
          walk()
        },
        instant ? STAMP_HOLD_REDUCED : STAMP_HOLD,
      )
    },
  })
  const driver = battle.driver

  const castingFor = (creature: Creature, opponent: CupSlot): FightCasting => {
    return {
      owned: castFighter({
        speciesId: creature.speciesId,
        name: creature.name,
        // Stage-aware: a juvenile's boosted stats must fold back to the
        // creation seed, or the cup arena re-rolls the partner's DNA.
        // The stage rides along so the champion casts its grander build.
        seed: visualSeedOf(creature.stats, creature.stage),
        stage: creature.stage,
        context: "the cup match",
      }),
      rival: castFighter({
        speciesId: opponent.speciesId,
        name: opponent.name,
        // Rivals carry no stage in the sim - the stats-only seed keeps
        // their look stable for the whole bracket.
        seed: visualSeedOf(opponent.stats),
        context: "the cup match",
      }),
    }
  }

  const fight = (): void => {
    if (!state?.creature || !session || !pendingId || !picks) return
    const opponent = session.nextOpponent
    if (!opponent) return
    // The commit moment (spec): the FIRST step into the arena consumes
    // the cup — the phase flips to "day", so no second entry is possible.
    if (!committed) {
      const consumed = endCup(state)
      if (consumed.ok) {
        committed = true
        state = consumed.state
        handlers.onCommit(consumed.state)
      }
    }
    const creature = state.creature
    if (!creature) return
    const resolved = resolvePlayerMatch(session, picks.loadout, picks.tactic)
    session = resolved.session
    handlers.onSession?.(resolved.session)
    const verdict = resolved.verdict
    if (!verdict?.battle) {
      throw new Error("The cup match resolved without a battle log")
    }
    const cs = getSpecies(creature.speciesId)
    const rs = getSpecies(opponent.speciesId)
    if (!cs || !rs) throw new Error("Unknown species: cannot frame the fight")
    fightNow = {
      owned: {
        name: creature.name,
        key: creature.name,
        element: cs.element,
        maxHp: effectiveStats(creature).hp,
      },
      rival: {
        name: opponent.name,
        key: opponent.name,
        element: rs.element,
        maxHp: opponent.stats.hp,
      },
    }
    // Into the arena: screens out, broadcast chrome in.
    inBattle = true
    pendingId = null
    showScreen(null)
    giveup.style.display = "none"
    overlay.classList.add("cup-battling")
    battleChips.style.display = ""
    // Boss final (FR11): the lower-third carries the registry intro.
    const boss = opponent.bossId ? getBoss(opponent.bossId) : undefined
    if (boss) {
      bossIntro.textContent = boss.intro
      bossIntro.className = state.settings.reducedMotion
        ? "cup-boss-intro cup-boss-intro--still"
        : "cup-boss-intro"
      bossIntro.style.display = ""
      // The boss gets the last word either way: the lower-third flips to
      // the verdict quip for the stamp hold, then the bracket returns.
      bossQuip =
        verdict.winner === opponent.name ? boss.quips.win : boss.quips.loss
    }
    battle.begin(fightNow, verdict.battle, castingFor(creature, opponent))
  }

  // ------------------------------------------------------------------
  // Coach screen
  // ------------------------------------------------------------------
  const statRow = (label: string, value: number, max = 60): HTMLElement => {
    const row = document.createElement("div")
    row.className = "cup-stat"
    const name = document.createElement("span")
    name.className = "cup-stat-name"
    name.textContent = label
    const bar = document.createElement("span")
    bar.className = "cup-stat-bar"
    const fill = document.createElement("span")
    fill.className = "cup-stat-fill"
    fill.style.width = `${Math.min(100, Math.round((value / max) * 100))}%`
    bar.append(fill)
    const num = document.createElement("span")
    num.className = "cup-stat-num"
    num.textContent = String(value)
    row.append(name, bar, num)
    return row
  }

  const openCoach = (): void => {
    if (!state?.creature || !session || !pendingId) return
    const creature = state.creature
    const opponent = session.nextOpponent
    if (!opponent) return
    const cs = getSpecies(creature.speciesId)
    const rs = getSpecies(opponent.speciesId)
    if (!cs || !rs) throw new Error("Unknown species: cannot open the coach")
    const entry = matchOf(pendingId)
    if (!entry) return
    coachTab.textContent = `${entry.label} · ready`
    picks = {
      loadout: [...(creature.loadout ?? defaultLoadout(creature, cs))],
      tactic: "balanced",
    }

    // Your fighter card.
    fighterCard.replaceChildren()
    const fHead = document.createElement("div")
    fHead.className = "cup-card-title"
    fHead.textContent = "Your fighter"
    const fName = document.createElement("div")
    fName.className = "cup-fighter-name"
    fName.textContent = creature.name
    const fSpecies = document.createElement("div")
    fSpecies.className = "cup-fighter-species"
    fSpecies.textContent = `${cs.displayName} · ${cs.element}`
    fighterCard.append(fHead, fName, fSpecies)
    const eff = effectiveStats(creature)
    for (const [label, key] of [
      ["HP", "hp"],
      ["ATK", "atk"],
      ["DEF", "def"],
      ["SPD", "spd"],
    ] as const) {
      fighterCard.append(statRow(label, eff[key]))
    }

    // Rival scouting card (tactic withheld — that is the scouting tension).
    rivalCard.replaceChildren()
    const rHead = document.createElement("div")
    rHead.className = "cup-card-title"
    rHead.textContent = "Scouting report"
    const rName = document.createElement("div")
    rName.className = "cup-fighter-name rival"
    rName.textContent = opponent.name
    const rSpecies = document.createElement("div")
    rSpecies.className = "cup-fighter-species"
    rSpecies.textContent = `${rs.displayName} · ${rs.element}`
    rivalCard.append(rHead, rName, rSpecies)
    for (const [label, key] of [
      ["HP", "hp"],
      ["ATK", "atk"],
      ["DEF", "def"],
      ["SPD", "spd"],
    ] as const) {
      rivalCard.append(statRow(label, opponent.stats[key]))
    }
    const rKit = document.createElement("div")
    rKit.className = "cup-kit-list"
    for (const id of rs.kit) {
      const move = document.createElement("div")
      move.className = "cup-kit-move"
      move.textContent = getMove(id)?.displayName ?? id
      rKit.append(move)
    }
    const rTactic = document.createElement("div")
    rTactic.className = "cup-tactic-unknown"
    rTactic.textContent = "Tactic unknown — watch the first exchanges."
    rivalCard.append(rKit, rTactic)

    // Your kit card: picker + tactic call.
    kitCard.replaceChildren()
    const kHead = document.createElement("div")
    kHead.className = "cup-card-title"
    kHead.textContent = "Your kit"
    kitCard.append(kHead)
    const kitRows: HTMLElement[] = []
    const renderKit = (): void => {
      if (!picks) return
      const chosen = picks.loadout
      for (const row of kitRows) row.remove()
      kitRows.length = 0
      const picker = buildKitPicker({
        species: cs,
        creature,
        chosen: () => chosen,
        classes: { base: "cup-pick", locked: "locked", chosen: "on" },
        onToggle: (id) => {
          if (!picks) return
          const next = toggleKitChoice(picks.loadout, id, 2, 4)
          if (next) {
            picks.loadout = next
            renderKit()
          }
        },
      })
      kitRows.push(...picker.rows)
      kitCard.append(picker.fragment)
    }
    renderKit()
    const tacticHead = document.createElement("div")
    tacticHead.className = "cup-card-title tactic"
    tacticHead.textContent = "Tactic"
    kitCard.append(tacticHead)
    const { row: tacticRow } = buildTacticRow({
      rowClass: "cup-tactic-row",
      describe: (t) => ({ label: t === "balanced" ? "Balanced" : "Specials" }),
      classes: { base: "cup-tactic", on: "on" },
      initialOn: "balanced",
      onPick: (t) => {
        if (picks) picks.tactic = t
      },
    })
    kitCard.append(tacticRow)

    showScreen("coach")
  }

  coachBack.addEventListener("click", () => {
    // Free back-out: nothing commits here.
    showScreen("bracket")
  })
  coachGo.addEventListener("click", fight)
  ctaGhost.addEventListener("click", openCoach)
  ctaGo.addEventListener("click", openCoach)

  // ------------------------------------------------------------------
  // Give-up modal + close semantics
  // ------------------------------------------------------------------
  giveupStay.addEventListener("click", () => {
    giveup.style.display = "none"
    close.focus()
  })
  giveupQuit.addEventListener("click", () => {
    if (!session) return
    giveup.style.display = "none"
    close.focus()
    ctaHide()
    // Forfeit the current round: the opponent advances without a fight,
    // then the bracket auto-completes to a champion.
    session = forfeitCup(session)
    handlers.onSession?.(session)
    setLine(`${playerName()} forfeits — the rival advances.`)
    walk()
  })

  const syncChip = (): void => {
    if (!state) return
    const creature = state.creature
    const cupToday =
      isCupDay(state.day) && state.phase === "cup" && creature !== null
    // Standing tie-in (save v8): the entry chip reads the ladder, so the
    // player sees what tonight's cup is worth before committing.
    const ladder = state.ladder
    const tierName = TIER_NAME[ladder.tier]
    // A persisted session keeps the chip alive across refreshes - even
    // once the entry is consumed (phase "day"), the walk can resume.
    const resumable = session !== null
    // Silver Ladder framing (FR11): while a gate boss is pending, the chip
    // names the occasion instead of the standing — the sim's own
    // bossForCup decision keeps the copy from drifting off the bracket
    // the player will actually draw. With a live session the standing is
    // the honest read (the bracket banner frames the occasion).
    const gate = resumable ? null : bossForCup(state)
    cupHint.textContent = gate
      ? gate.kind === "promotion"
        ? "Promotion Cup awaits"
        : `${gate.boss.name} holds the final`
      : `${tierName} ${ladder.subTier} · ${ladder.points} pts`
    cupButton.style.display = cupToday || resumable ? "" : "none"
    cupButton.disabled = !cupToday && !resumable
  }

  const closeFree = (): void => {
    clearTimer()
    driver.stop()
    // A live player-turn session rides the save and stays resumable from
    // the chip; anything else (finalized, consumed) is dropped here.
    if (session && session.status !== "player-turn") {
      session = null
      handlers.onSession?.(null)
    }
    committed = false
    cursor = 0
    pendingId = null
    picks = null
    inBattle = false
    fightNow = null
    overlay.style.display = "none"
    battleHud.hide()
    champ.classList.remove("crowned")
    champName.textContent = "—"
    for (const [id, card] of cards) {
      card.el.className = `cup-match m-${id}`
      card.slots.a.replaceChildren()
      card.slots.b.replaceChildren()
      colHeadEls[card.column].classList.remove("in")
    }
    ctaHide()
    giveup.style.display = "none"
    syncChip()
  }

  // In-flow bottom furniture of the bracket screen (between the CTA row and
  // the feed) — absolutely positioning it over the grid made it overlap the
  // semifinal cards on shorter viewports.
  cta.after(close)
  close.addEventListener("click", () => {
    if (inBattle) return
    if (!committed) {
      // Free look: nothing consumed, the chip returns.
      closeFree()
      return
    }
    if (session && session.status === "player-turn") {
      giveup.style.display = ""
      giveupStay.focus()
      return
    }
    closeFree()
  })

  resultBack.addEventListener("click", closeFree)

  // ------------------------------------------------------------------
  // Entry
  // ------------------------------------------------------------------
  const open = (): void => {
    if (!state?.creature) return
    // Standing snapshot for the results screen's ladder row.
    ladderBefore = { ...state.ladder }
    if (!session || session.bracket.day !== state.day) {
      const prepared = prepareCup(state)
      if (!prepared) return
      session = prepared
      handlers.onSession?.(prepared)
    }
    // A refresh can land inside the window between the fight resolving and
    // the rival bracket auto-completing (the stamp hold): the persisted
    // session is eliminated but has no champion yet, and the resumed walk
    // would stall on a rival match that has no verdict to show. Finish the
    // rival bracket now — the per-pairing seeds make it deterministic and
    // idempotent.
    if (session.status === "eliminated" && session.championName === null) {
      session = completeCup(session)
      handlers.onSession?.(session)
    }
    // A consumed cup (phase "day" — the entry commit already ran) must not
    // try to endCup again; derive the flag instead of trusting the closure.
    committed = state.phase === "day"
    cursor = 0
    pendingId = null
    picks = null
    inBattle = false
    fightNow = null
    headSub.textContent = `Day ${state.day} · single elimination`
    // The occasion leads the board (FR11): a Promotion Cup carries its own
    // banner from the sim, a boss final reads "Boss Final · <name>", and
    // every regular cup is named for the tier it serves.
    headTitle.textContent =
      session.bracket.banner ?? `${TIER_NAME[state.ladder.tier]} Cup`
    battleHud.hide()
    champ.classList.remove("crowned")
    champName.textContent = "—"
    // Reset the board, then start the strict-order reveal.
    for (const [id, card] of cards) {
      card.el.className = `cup-match m-${id}`
      colHeadEls[card.column].classList.remove("in")
    }
    showScreen("bracket")
    overlay.style.display = ""
    setLine(`${playerName()} steps into the bracket!`)
    cursor = 0
    timer = setTimeout(walk, beat(WALK_SETTLE))
  }

  cupButton.addEventListener("click", open)

  return {
    update(next) {
      state = next
      // A session belongs to its cup day: if the day moved on (the walk
      // was abandoned and the save advanced), the bracket is over — drop
      // it so a stale session can never double-claim rewards.
      if (session && next.day !== session.bracket.day) {
        session = null
        handlers.onSession?.(null)
      }
      syncChip()
    },
    setPaused: (paused) => {
      battle.setPaused(paused)
    },
  }
}
