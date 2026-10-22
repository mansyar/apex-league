/**
 * Action clock: gauges, turn order, range, melee, and projectile travel.
 * Scripted actions only — tactics arrive in a later phase. Pure and
 * deterministic given the seed.
 *
 * Cooldown semantics, pinned by the moves tests: the gate is checked before
 * the fighter's action, the entry steps after it. A newly used special is
 * set after the step, so it blocks exactly the move's next N actions.
 *
 * Projectile semantics (spec FR4): a far special launches on the acting
 * tick and impacts as the first step of the next tick; a point-blank
 * special resolves during the acting tick. At impact the accuracy roll
 * `0-99 < accuracy` runs first; a standing target consumes no dodge roll.
 * A target that closed between launch and impact then rolls
 * `0-99 < min(70, 20 + spd * 3)` against its own SPD. An impact step with
 * several shots in flight resolves all of them in launch order (spec FR8
 * revision 2026-10-10); the fight is judged after the whole step, so a
 * same-step double down is reachable. Shots still airborne after the
 * judgment are discarded.
 *
 * Stagger semantics (battle-animation-overhaul spec FR2): a hit dealing
 * >= STAGGER_DAMAGE_FRACTION of the victim's max HP — or a
 * super-effective hit that also clears STAGGER_SE_FRACTION — staggers a
 * standing victim. The victim's next action window is consumed reeling (a `stagger` event, gauge spent, no
 * action planned); cooldowns do not step during it. Downing blows never
 * stagger and the lock never stacks, and a fighter cannot be staggered
 * again until STAGGER_GRACE_TICKS have passed since the trigger (the
 * recovered fighter always gets to act). The same heavy blow also knocks
 * both fighters apart when the victim was in melee range (a `knockback`
 * event, both ranges to far) — re-engaging costs each side a closing
 * action; the separation is not grace-gated; against an already-far
 * victim it is a silent no-op.
 *
 * Barrel module (sim-voxel-size-guard, phase 2): the implementation lives in
 * the ./clock submodules —
 *
 * - `./clock/types` — the fighter snapshots, the event shape, the constants
 * - `./clock/hits` — the shared hit rules (accuracy, dodge, stagger, knockback)
 * - `./clock/engine` — the tick stepper
 *
 * This module re-exports the same public surface the monolith exported, so
 * every consumer import (`./clock`) stays untouched.
 */

export {
  createClock,
  createClockFighter,
  createTieOrder,
} from "./clock/engine"
export {
  BASIC,
  type BattleEvent,
  type BattleEventKind,
  type BattleFighter,
  CLOSE,
  type Clock,
  type ClockFighter,
  fighterKey,
  HOLD,
  type PlanFn,
  type PlannedAction,
  type Range,
  STAGGER_DAMAGE_FRACTION,
  STAGGER_GRACE_TICKS,
  STAGGER_SE_FRACTION,
  type TickOutcome,
} from "./clock/types"
