/**
 * The boss registry (silver_ladder_bosses_20261016 FR8, extended by
 * gold_legend_ladder_20261017).
 *
 * Six authored rivals stand at the ladder's milestones. A boss is
 * an existing species with pinned absolute stats — legal by construction
 * (inside the species' roll bounds) and deliberately NOT player-relative:
 * a boss is the same opponent for every player, which keeps the ladder
 * fair and its balance probe-able (Phase 3 tunes the pins).
 *
 * Kits reuse the existing move pool and the equip rules (2-4 unique moves
 * from the species' fixed kit, basic strike innate); tactics reuse the
 * existing tactic set. Persona copy (intro, quips) is carried here so the
 * client can render it without duplicating the roster.
 *
 * Pure frozen data — no RNG, no state, no I/O.
 */

import type { Tactic } from "./battle/policy"
import type { CreatureStats } from "./creature"
import { type CupKind, type LadderTier, promotionEligible } from "./ladder"
import type { GameState } from "./state"

/** The tier whose ladder a boss stands on. Legend has no bosses — it is
 * the capstone. */
export type BossTier = Exclude<LadderTier, "legend">

/** Where in a tier's climb a boss stands. */
export type BossMilestone = "promotion" | "checkpoint" | "apex"

/** A boss' coach persona: intro copy plus a line for either outcome. */
export interface BossQuips {
  /** Spoken by the boss' coach card when the boss wins the match. */
  win: string
  /** Spoken by the boss' coach card when the boss loses the match. */
  loss: string
}

/** An authored boss: identity, pinned build, and persona copy. */
export interface BossDef {
  /** Stable id used in the defeat ledger and save data. */
  id: string
  /** Proper-noun display name (coach-style, like rival names). */
  name: string
  /** Existing species id — bosses introduce no new species (spec scope). */
  speciesId: string
  /** Pinned absolute stats, within the species' legal roll bounds. Koda
   * sits at the bounds max (the gate's full exam); Hesse and Marlow are
   * probe-tuned below max (silver_ladder_bosses Phase 3) so a full-trained
   * disadvantaged counter grinds through at >=35% instead of stalling at
   * the tiebreak-only 19.4% the max pins produced. */
  stats: CreatureStats
  /** Pinned loadout: 2-4 unique moves from the species' kit. */
  loadout: readonly string[]
  /** Pinned in-battle tactic from the existing set. */
  tactic: Tactic
  /** Lower-third arena intro copy (client, FR11). */
  intro: string
  /** Coach persona lines for either match outcome. */
  quips: BossQuips
  /** Which ladder milestone this boss guards. */
  milestone: BossMilestone
  /** Which tier's ladder this boss stands on — milestones repeat across
   * tiers (silver and gold each have their own gate/checkpoint/apex). */
  tier: BossTier
}

/**
 * The boss roster, in climb order:
 *
 * - **Koda** guards the Bronze→Silver gate as the Promotion Cup final —
 *   a brash drill-sergeant Ember Drake who treats the gate like boot camp.
 * - **Hesse** stands at the Silver III checkpoint — a stoic veteran Bramble
 *   Ox who has seen a hundred climbers pass. Losing to her never blocks
 *   the climb (non-blocking semantics, FR6).
 * - **Marlow** is the apex of Silver I — a calm Tide Axolotl regent who
 *   keeps the summit until scalped, then retires from the bracket (FR7).
 */
export const BOSSES: readonly BossDef[] = Object.freeze([
  {
    id: "koda",
    name: "Sear Marshal Koda",
    speciesId: "fire_drake",
    stats: { hp: 92, atk: 13, def: 10, spd: 12 },
    loadout: ["spark", "flame_charge", "cinder_shot", "blaze_bolt"],
    tactic: "specials",
    intro:
      "Sear Marshal Koda takes the floor — 'Promotion trials start NOW. Drop and give me twenty embers!'",
    quips: {
      win: "Koda: 'That the best you've got? The gate stays SHUT. Drill again.'",
      loss: "Koda: 'Hmph. Clean sweep, rookie. The gate opens — don't embarrass Silver.'",
    },
    milestone: "promotion",
    tier: "bronze",
  },
  {
    id: "hesse",
    name: "Verdant Dame Hesse",
    speciesId: "plant_ox",
    stats: { hp: 100, atk: 11, def: 13, spd: 8 },
    loadout: ["seed_shot", "thorn_volley", "spore_burst", "bramble_dart"],
    tactic: "balanced",
    intro:
      "Verdant Dame Hesse regards you calmly — 'Every climber passes this ridge. Few remember it fondly.'",
    quips: {
      win: "Hesse: 'As the seasons turn. Rest, grow, return.'",
      loss: "Hesse: '…Rooted, as ever. Climb on, little sprout.'",
    },
    milestone: "checkpoint",
    tier: "silver",
  },
  {
    id: "marlow",
    name: "Tide Regent Marlow",
    speciesId: "water_axolotl",
    stats: { hp: 92, atk: 12, def: 9, spd: 11 },
    loadout: ["bubble", "tide_shot", "foam_volley", "splash_bolt"],
    tactic: "specials",
    intro:
      "Tide Regent Marlow drifts into view — 'The summit of Silver, at your leisure. Shall we?'",
    quips: {
      win: "Marlow: 'The tide holds its throne. Breathe — the water keeps no grudges.'",
      loss: "Marlow: '…So the current shifts. Wear the summit lightly, champion.'",
    },
    milestone: "apex",
    tier: "silver",
  },
  {
    id: "delmar",
    name: "Squall Herald Delmar",
    speciesId: "water_axolotl",
    stats: { hp: 93, atk: 12, def: 9, spd: 11 },
    loadout: ["bubble", "tide_shot", "foam_volley", "splash_bolt"],
    tactic: "specials",
    intro:
      "Squall Herald Delmar rolls in on a gust — 'Gold lies past the squall. Ready to be weathered?'",
    quips: {
      win: "Delmar: 'The herald laughs last. Gold stays a rumor — for now.'",
      loss: "Delmar: '…The squall breaks. Carry Gold like a standard, not a flag of ease.'",
    },
    milestone: "promotion",
    tier: "silver",
  },
  {
    id: "fenn",
    name: "Cinder Abbot Fenn",
    speciesId: "fire_drake",
    stats: { hp: 92, atk: 13, def: 10, spd: 12 },
    loadout: ["spark", "flame_charge", "cinder_shot", "blaze_bolt"],
    tactic: "balanced",
    intro:
      "Cinder Abbot Fenn tends a single flame — 'This ridge asks one question: can you keep a fire burning when it matters?'",
    quips: {
      win: "Fenn: 'The ember gutters. Tend your flame, then climb again.'",
      loss: "Fenn: '…Well kept. The abbey door stays open on your way down.'",
    },
    milestone: "checkpoint",
    tier: "gold",
  },
  {
    id: "thessa",
    name: "Grove Sovereign Thessa",
    speciesId: "plant_ox",
    stats: { hp: 100, atk: 11, def: 13, spd: 8 },
    loadout: ["seed_shot", "thorn_volley", "spore_burst", "bramble_dart"],
    tactic: "specials",
    intro:
      "Grove Sovereign Thessa descends from the canopy — 'Above my grove there is only the plateau. Legends kneel here first.'",
    quips: {
      win: "Thessa: 'The grove endures. The plateau does not open for the unready.'",
      loss: "Thessa: '…So the canopy parts. Write your name where legends are kept.'",
    },
    milestone: "apex",
    tier: "gold",
  },
])

/** Look up a boss by id, or undefined when unknown. */
export function getBoss(id: string): BossDef | undefined {
  return BOSSES.find((b) => b.id === id)
}

/**
 * Look up the boss standing at a tier's ladder milestone — exactly one per
 * (tier, milestone) pair, throws otherwise.
 */
function bossAtMilestone(tier: BossTier, milestone: BossMilestone): BossDef {
  const boss = BOSSES.find((b) => b.tier === tier && b.milestone === milestone)
  if (!boss) {
    throw new Error(`No boss at milestone: ${tier} ${milestone}`)
  }
  return boss
}

/**
 * Which authored boss (if any) stands at the final of the next cup the
 * player enters, and as which cup kind (silver_ladder_bosses_20261016,
 * extended by gold_legend_ladder_20261017). Pure — a function of the game
 * state only:
 *
 * - Bronze, points banked strictly past the Bronze I ceiling → the
 *   Promotion Cup against Koda (the gate cup, `kind: "promotion"`).
 * - Silver III with no Hesse scalp → a championship cup with an authored
 *   final (non-blocking: losing banks points, the offer stays).
 * - Silver I, past the Silver I ceiling → the Promotion Cup against Delmar
 *   (the Silver→Gold gate, blocking like Koda).
 * - Silver I otherwise, with no Marlow scalp → the apex final every cup
 *   until beaten.
 * - Gold III with no Fenn scalp → the gold checkpoint final (non-blocking).
 * - Gold I, past the Gold I ceiling → the Promotion Cup against Thessa —
 *   the Legend gate, blocking; a gate overrides retirement, so a scalped
 *   Thessa is re-summoned.
 * - Gold I otherwise, with no Thessa scalp → the apex final every cup
 *   until beaten.
 * - Anything else (Silver II, Gold II, Legend) → a fully generated field.
 *
 * The cup entry surface calls this once per entry; `prepareCup` threads
 * the answer into `startCupSession`.
 */
export function bossForCup(
  state: GameState,
): { boss: BossDef; kind: CupKind } | null {
  const ladder = state.ladder
  if (ladder.tier === "bronze") {
    return promotionEligible(ladder)
      ? { boss: bossAtMilestone("bronze", "promotion"), kind: "promotion" }
      : null
  }
  if (ladder.tier === "silver") {
    if (promotionEligible(ladder)) {
      return { boss: bossAtMilestone("silver", "promotion"), kind: "promotion" }
    }
    if (ladder.subTier === "III" && !state.bossDefeats.includes("hesse")) {
      return {
        boss: bossAtMilestone("silver", "checkpoint"),
        kind: "championship",
      }
    }
    if (ladder.subTier === "I" && !state.bossDefeats.includes("marlow")) {
      return { boss: bossAtMilestone("silver", "apex"), kind: "championship" }
    }
    return null
  }
  if (ladder.tier === "gold") {
    if (promotionEligible(ladder)) {
      return { boss: bossAtMilestone("gold", "apex"), kind: "promotion" }
    }
    if (ladder.subTier === "III" && !state.bossDefeats.includes("fenn")) {
      return {
        boss: bossAtMilestone("gold", "checkpoint"),
        kind: "championship",
      }
    }
    if (ladder.subTier === "I" && !state.bossDefeats.includes("thessa")) {
      return { boss: bossAtMilestone("gold", "apex"), kind: "championship" }
    }
    return null
  }
  return null
}
