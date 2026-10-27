/**
 * The cup arena (cup_module_refactor_20261018 FR3): the battle-session
 * shell, the fight commit, the boss lower-third and the stamp-hold exit
 * back to the bracket. Relocated verbatim from `createCup` — the commit
 * semantics (first step into the arena consumes the cup) live here.
 */
import {
  battleStats,
  type Creature,
  type CupSlot,
  completeCup,
  endCup,
  getBoss,
  getSpecies,
  resolvePlayerMatch,
} from "@apex/sim"
import { createBattleSession, cupStampTitle } from "../battle-session"
import { castFighter } from "../battleUI"
import type { FightCasting } from "../staging"
import { visualSeedOf } from "../staging-seed"
import { closeModal } from "../ui/modal"
import type { CupShared } from "./shared"

/** The stamp-hold pacing (ms), muted under reduced motion. */
export const STAMP_HOLD = 2200
export const STAMP_HOLD_REDUCED = 900

/** Create the arena battle flow over the shared cup context. Also builds
 * the battle session itself — its finish flow walks the board, which the
 * shared context resolves late (see shared.ts). */
export function createArena(shared: CupShared): {
  castingFor(creature: Creature, opponent: CupSlot): FightCasting
  fight(): void
} {
  const { mem, handlers } = shared
  const { battleChips, bossIntro, overlay, battleHud } = shared

  const castingFor = (creature: Creature, opponent: CupSlot): FightCasting => {
    return {
      owned: {
        ...castFighter({
          speciesId: creature.speciesId,
          name: creature.name,
          // Stage-aware: a juvenile's boosted stats must fold back to the
          // creation seed, or the cup arena re-rolls the partner's DNA.
          // The stage rides along so the champion casts its grander build.
          seed: visualSeedOf(creature.stats, creature.stage, creature.branch),
          stage: creature.stage,
          context: "the cup match",
        }),
        // The earned form tints the rig in the arena too (FR-10).
        branch: creature.branch,
      },
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
    if (!mem.state?.creature || !mem.session || !mem.pendingId || !mem.picks) {
      return
    }
    const opponent = mem.session.nextOpponent
    if (!opponent) return
    // The commit moment (spec): the FIRST step into the arena consumes
    // the cup — the phase flips to "day", so no second entry is possible.
    if (!mem.committed) {
      const consumed = endCup(mem.state)
      if (consumed.ok) {
        mem.committed = true
        mem.state = consumed.state
        handlers.onCommit(consumed.state)
      }
    }
    const creature = mem.state.creature
    if (!creature) return
    const resolved = resolvePlayerMatch(
      mem.session,
      mem.picks.loadout,
      mem.picks.tactic,
    )
    mem.session = resolved.session
    handlers.onSession?.(resolved.session)
    const verdict = resolved.verdict
    if (!verdict?.battle) {
      throw new Error("The cup match resolved without a battle log")
    }
    const cs = getSpecies(creature.speciesId)
    const rs = getSpecies(opponent.speciesId)
    if (!cs || !rs) throw new Error("Unknown species: cannot frame the fight")
    mem.fightNow = {
      owned: {
        name: creature.name,
        key: creature.name,
        element: cs.element,
        maxHp: battleStats(creature).hp,
      },
      rival: {
        name: opponent.name,
        key: opponent.name,
        element: rs.element,
        maxHp: opponent.stats.hp,
      },
    }
    // Into the arena: screens out, broadcast chrome in.
    mem.inBattle = true
    mem.pendingId = null
    shared.showScreen(null)
    closeModal(shared.giveup.root, { returnFocus: false })
    overlay.classList.add("cup-battling")
    battleChips.battleChips.classList.remove("is-hidden")
    // Boss final (FR11): the lower-third carries the registry intro.
    const boss = opponent.bossId ? getBoss(opponent.bossId) : undefined
    if (boss) {
      bossIntro.textContent = boss.intro
      bossIntro.className = mem.state.settings.reducedMotion
        ? "cup-boss-intro kit-surface cup-boss-intro--still"
        : "cup-boss-intro kit-surface"
      bossIntro.classList.remove("is-hidden")
      // The boss gets the last word either way: the lower-third flips to
      // the verdict quip for the stamp hold, then the bracket returns.
      mem.bossQuip =
        verdict.winner === opponent.name ? boss.quips.win : boss.quips.loss
    }
    shared.battle.begin(
      mem.fightNow,
      verdict.battle,
      castingFor(creature, opponent),
    )
  }

  // The battle shell: step playback into the HUD, and the stamp hold that
  // returns the broadcast to the bracket after every fight.
  shared.battle = createBattleSession({
    hud: battleHud,
    speedButton: shared.battleChips.fastButton,
    onStep: (step, instant) => {
      handlers.onStep(step, instant)
    },
    onLine: shared.setLine,
    onFightStart: (casting) => handlers.onFightStart(casting),
    onPace: (msPerStep) => handlers.onPace(msPerStep),
    motionPref: () => mem.state?.settings.reducedMotion === true,
    stampTitle: cupStampTitle,
    onFinish: ({ instant }) => {
      if (!mem.fightNow) return
      battleChips.battleChips.classList.add("is-hidden")
      // Hold the stamp, then back to the bracket. The cursor stays on the
      // match just fought: the walk re-stamps it on the bracket, then
      // continues with the rival reveals.
      shared.clearTimer()
      // Boss final (FR11): the lower-third flips from the intro to the
      // boss' verdict quip for the stamp hold, then the bracket returns.
      if (mem.bossQuip) {
        bossIntro.textContent = mem.bossQuip
        mem.bossQuip = null
      } else {
        bossIntro.classList.add("is-hidden")
      }
      shared.battle.hold.begin(
        () => {
          mem.inBattle = false
          mem.fightNow = null
          bossIntro.classList.add("is-hidden")
          handlers.onArenaExit()
          battleHud.hide()
          overlay.classList.remove("cup-battling")
          shared.showScreen("bracket")
          shared.close.focus()
          // A loss auto-completes the rival bracket to a champion.
          if (mem.session && mem.session.status === "eliminated") {
            mem.session = completeCup(mem.session)
            handlers.onSession?.(mem.session)
          }
          shared.walk()
        },
        instant ? STAMP_HOLD_REDUCED : STAMP_HOLD,
      )
    },
  })
  shared.driver = shared.battle.driver

  return { castingFor, fight }
}
