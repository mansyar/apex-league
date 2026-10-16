/**
 * The boss registry (silver_ladder_bosses_20261016, FR8).
 *
 * Three authored rivals stand at the Silver ladder's milestones. A boss is
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

/** Where in the Silver climb a boss stands. */
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
  /** Pinned absolute stats, within the species' legal roll bounds. */
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
    stats: { hp: 46, atk: 13, def: 10, spd: 12 },
    loadout: ["spark", "flame_charge", "cinder_shot", "blaze_bolt"],
    tactic: "specials",
    intro:
      "Sear Marshal Koda takes the floor — 'Promotion trials start NOW. Drop and give me twenty embers!'",
    quips: {
      win: "Koda: 'That the best you've got? The gate stays SHUT. Drill again.'",
      loss: "Koda: 'Hmph. Clean sweep, rookie. The gate opens — don't embarrass Silver.'",
    },
    milestone: "promotion",
  },
  {
    id: "hesse",
    name: "Verdant Dame Hesse",
    speciesId: "plant_ox",
    stats: { hp: 52, atk: 11, def: 14, spd: 8 },
    loadout: ["seed_shot", "thorn_volley", "spore_burst", "bramble_dart"],
    tactic: "balanced",
    intro:
      "Verdant Dame Hesse regards you calmly — 'Every climber passes this ridge. Few remember it fondly.'",
    quips: {
      win: "Hesse: 'As the seasons turn. Rest, grow, return.'",
      loss: "Hesse: '…Rooted, as ever. Climb on, little sprout.'",
    },
    milestone: "checkpoint",
  },
  {
    id: "marlow",
    name: "Tide Regent Marlow",
    speciesId: "water_axolotl",
    stats: { hp: 48, atk: 12, def: 11, spd: 11 },
    loadout: ["bubble", "tide_shot", "foam_volley", "splash_bolt"],
    tactic: "specials",
    intro:
      "Tide Regent Marlow drifts into view — 'The summit of Silver, at your leisure. Shall we?'",
    quips: {
      win: "Marlow: 'The tide holds its throne. Breathe — the water keeps no grudges.'",
      loss: "Marlow: '…So the current shifts. Wear the summit lightly, champion.'",
    },
    milestone: "apex",
  },
])

/** Look up a boss by id, or undefined when unknown. */
export function getBoss(id: string): BossDef | undefined {
  return BOSSES.find((b) => b.id === id)
}
