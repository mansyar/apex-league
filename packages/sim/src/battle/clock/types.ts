/**
 * The action clock's shared vocabulary: the fighter snapshots, the event
 * shape, and the public tuning constants the announcer and the client read.
 *
 * Split out of the former monolithic battle/clock.ts (sim-voxel-size-guard,
 * phase 2) — pure relocation, no behavior change. The tick stepper lives in
 * ./engine.
 */

import type { CreatureStats, Element } from "../../creature"
import type { MoveDef } from "../moves"

/** A fighter snapshot: identity plus battle stats. No conditions, no stage. */
export interface BattleFighter {
  readonly name: string
  /**
   * Stable side key used for hp snapshots and tie-order maps. Display
   * names alone cannot distinguish a mirror match (rival rolled the
   * same species), so keyed data must never trust the name.
   */
  readonly id?: string
  readonly element: Element
  /**
   * Secondary type affinity (save v20); absent for rivals, bosses, and any
   * pre-v20 source. Only the incoming (defender-side) shot math reads it.
   */
  readonly affinity?: Element | null
  readonly stats: CreatureStats
}

/** The stable map key for a fighter: its side id, else its display name. */
export function fighterKey(f: {
  readonly id?: string
  readonly name: string
}): string {
  return f.id ?? f.name
}

/** Distance on the arena floor: `far` to start, `near` after a close. */
export type Range = "far" | "near"

/**
 * Stagger threshold (battle-animation-overhaul spec FR2, tunable): a
 * single hit dealing at least this fraction of the victim's max HP
 * staggers it, whatever the type chart says.
 */
export const STAGGER_DAMAGE_FRACTION = 0.35

/**
 * Super-effective stagger floor (FR2, tunable): a super-effective hit
 * must ALSO deal at least this fraction of the victim's max HP to
 * stagger — a light type-chart chip no longer locks a fighter.
 */
export const STAGGER_SE_FRACTION = 0.15

/**
 * Stagger grace (FR2, tunable): ticks that must pass after a stagger
 * trigger before the same fighter can be staggered again. Kills the
 * chain-lock death spiral: a recovered fighter always gets to act.
 */
export const STAGGER_GRACE_TICKS = 3

/** A fighter mid-fight: snapshot plus live hp, range, gauge, and cooldowns. */
export interface ClockFighter {
  readonly name: string
  /** The stable side key; see BattleFighter.id. */
  readonly id?: string
  readonly element: Element
  readonly affinity?: Element | null
  readonly stats: CreatureStats
  /** Current hit points; a fighter at 0 or below never acts again. */
  readonly hp: number
  readonly range: Range
  /** Accumulated action gauge; the fighter acts once it reaches 12. */
  readonly gauge: number
  /** Remaining own-action cooldowns keyed by move id. */
  readonly cooldowns: Readonly<Record<string, number>>
  /**
   * True while the fighter owes a stagger recovery: its next action
   * window is consumed reeling instead of acting.
   */
  readonly staggered: boolean
}

/** One scripted choice for an acting fighter. */
export type PlannedAction =
  | { readonly kind: "close" }
  | { readonly kind: "hold" }
  | { readonly kind: "basic" }
  | { readonly kind: "special"; readonly moveId: string }

/** Injected decision hook: returns what the acting fighter does this action. */
export type PlanFn = (
  fighter: Readonly<ClockFighter>,
  opponent: Readonly<ClockFighter>,
) => PlannedAction

export const HOLD = Object.freeze({
  kind: "hold",
} as const) satisfies PlannedAction
export const CLOSE = Object.freeze({
  kind: "close",
} as const) satisfies PlannedAction
export const BASIC = Object.freeze({
  kind: "basic",
} as const) satisfies PlannedAction

export type BattleEventKind =
  | "close"
  | "hold"
  | "basic"
  | "stagger"
  | "knockback"
  | "down"
  | "launch"
  | "impact"
  | "time"
  | "draw"

/** One announcer-visible beat of the fight. */
export interface BattleEvent {
  readonly tick: number
  readonly kind: BattleEventKind
  /** The acting fighter; for a `down` event, the fighter that went down. */
  readonly actor: string
  /**
   * The acting fighter's stable side key (`id ?? name`) — display names
   * alone cannot distinguish mirror matches (two "Ember Drake"s), so
   * client-side actor mapping keys off this when present.
   */
  readonly actorKey?: string
  /** The receiving fighter, where relevant. */
  readonly target?: string
  readonly moveId?: string
  readonly damage?: number
  readonly hit?: boolean
  /** Why a hit flag is false: `accuracy` or `dodge`. */
  readonly missReason?: "accuracy" | "dodge"
  /** Both fighters' HP right after the event. */
  readonly hpAfter: Readonly<Record<string, number>>
  /** One present-tense announcer sentence. */
  readonly line: string
  /**
   * Additive playback hint (battle-animation-overhaul FR3), set only on
   * heavy landing blows: the victim's non-down reaction — reeling where
   * it stands, or being knocked out of melee range. The `down` reaction
   * is derived by the playback contract from the adjacent down event.
   */
  readonly reaction?: "stagger" | "knockback"
}

/** What one tick produced. The resolver reads events and HP to rule endings. */
export interface TickOutcome {
  readonly events: readonly BattleEvent[]
}

/** The tick stepper for one exhibition. Mutates only its own run state. */
export interface Clock {
  /** The tick number of the most recent `advance`, 0 before it runs. */
  readonly tick: number
  readonly fighters: readonly ClockFighter[]
  advance(plan: PlanFn): TickOutcome
}

/**
 * A fighter's live run state (internal): the snapshot the plan hook sees,
 * plus the mutable hp, range, gauge, and cooldowns the tick stepper owns.
 */
export interface RunFighter {
  readonly name: string
  readonly id?: string
  readonly element: Element
  readonly affinity?: Element | null
  readonly stats: CreatureStats
  /** Tick of the last stagger trigger; grace counts from here. */
  lastStaggerTick: number
  hp: number
  range: Range
  gauge: number
  cooldowns: Map<string, number>
  staggered: boolean
}

/** A special already in the air, awaiting the first step of the next tick. */
export interface FlyingShot {
  readonly shooter: RunFighter
  readonly target: RunFighter
  readonly move: MoveDef
  /** The target's range when the shot launched; closure during travel dodges. */
  readonly targetRangeAtLaunch: Range
}
