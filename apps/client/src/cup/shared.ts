/**
 * Shared context for the cup screen modules (cup_module_refactor_20261018
 * FR3). `createCup` was one closure; the split turns that closure into an
 * explicit context object the submodules read and write. Same mutable
 * fields, same wiring order — cup.ts owns the object and the listeners.
 */
import type {
  CupSession,
  CupSlot,
  GameState,
  PlaybackStep,
  RoundVerdict,
  Tactic,
} from "@apex/sim"
import type { createBattleSession, PlaybackFight } from "../battle-session"
import type { createBattleHud } from "../battleHud"
import type { BracketMatch } from "../bracket-model"
import type {
  buildBattleChips,
  buildBracketScreen,
  buildCoachScreen,
  buildGiveupModal,
  buildResultsScreen,
} from "../cup-screens"
import type { FightCasting } from "../staging"

/** The cup's contract with its host (main.ts wiring). */
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

/** Match ids come from the bracket plan (qf1..f1). */
export type MatchId = string

/** The cup's mutable session state — the former closure variables. */
export interface CupMemory {
  state: GameState | null
  session: CupSession | null
  /** Ladder snapshot at cup entry (save v8): the results screen diffs
   * the post-finalize standing against it to report what the run earned. */
  ladderBefore: GameState["ladder"] | null
  /** The cup is consumed (endCup applied) — set at the first coach commit. */
  committed: boolean
  /** Reveal cursor into the bracket's walk order. */
  cursor: number
  timer: ReturnType<typeof setTimeout> | null
  inBattle: boolean
  /** The match id currently waiting for the player (CTA shown). */
  pendingId: MatchId | null
  /** The coach's working picks for the pending match. */
  picks: { loadout: string[]; tactic: Tactic } | null
  /** The fight currently in the arena (stamp wording + cleanup). */
  fightNow: PlaybackFight | null
  /** The verdict quip awaiting the stamp hold (null outside boss fights). */
  bossQuip: string | null
}

type BracketScreen = ReturnType<typeof buildBracketScreen>
type CoachScreen = ReturnType<typeof buildCoachScreen>
type ResultsScreen = ReturnType<typeof buildResultsScreen>
type GiveupModal = ReturnType<typeof buildGiveupModal>
type BattleChips = ReturnType<typeof buildBattleChips>
type BattleHud = ReturnType<typeof createBattleHud>
type BattleSession = ReturnType<typeof createBattleSession>

/**
 * The bundle every cup submodule receives. cup.ts builds it with `{} as
 * CupShared` and assigns the fields as the modules come up — the former
 * closure's late bindings, now explicit. Call sites read fields at call
 * time, never at creation time.
 */
export interface CupShared {
  mem: CupMemory
  handlers: CupHandlers
  // Screens and furniture.
  bracket: BracketScreen
  coach: CoachScreen
  results: ResultsScreen
  giveup: GiveupModal
  battleChips: BattleChips
  battleHud: BattleHud
  bossIntro: HTMLElement
  overlay: HTMLElement
  /** The bracket's global close button (give-up modal hands focus back). */
  close: HTMLButtonElement
  cupButton: HTMLButtonElement
  cupHint: HTMLElement
  // Late-bound cross-module calls (assigned by cup.ts after wiring).
  walk(): void
  conclude(): void
  // The arena battle shell (created during cup.ts wiring).
  battle: BattleSession
  driver: BattleSession["driver"]
  // Derived session views (pure, over the current memory).
  playerName(): string
  matchOf(id: MatchId): BracketMatch | null
  verdictOf(id: MatchId): RoundVerdict | null
  slotsOf(id: MatchId): { a: CupSlot | null; b: CupSlot | null }
  // Broadcast chrome helpers.
  setLine(text: string): void
  showScreen(name: "bracket" | "coach" | "results" | null): void
  beat(ms: number): number
  /** Start a timed callback; the timer rides the memory. */
  schedule(fn: () => void, ms: number): void
  /** Kill the pending timer (and the battle shell's stamp hold). */
  clearTimer(): void
}
