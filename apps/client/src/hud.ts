import type {
  CareAction,
  GameState,
  RenameStableResult,
  StableReason,
  TrainingProgram,
} from "@apex/sim"
import { syncGiftChip } from "./gift"
import {
  driftCallout,
  evolveCallout,
  graduationTickerLine,
  saveFailureNotice,
} from "./hud/copy"
import { hatchCallout } from "./hud/copy-hatch"
import { createHints } from "./hud/hints"
import { createHudShell } from "./hud/shell"
import { createHudUpdate } from "./hud/update"
import { syncStableChip } from "./stable"

export {
  coachVoice,
  corruptSaveNotice,
  evolveCallout,
  familyName,
  flavorCallout,
  graduationCallout,
  graduationHint,
  growthHint,
  previewNote,
  REJECTION_COPY,
  romanNumeral,
  STATS,
  saveFailureNotice,
  selectHint,
  spendFlashIndex,
  stageLabel,
  statLabel,
  statusLine,
  trainingStatus,
  unlockCallout,
} from "./hud/copy"
export { buildCommandDock, type CommandDockRefs } from "./hud/dock"
export {
  buildCreaturePlate,
  buildLineagePlate,
  buildScoreBug,
  type CreaturePlateRefs,
  type LineagePlateRefs,
  type ScoreBugRefs,
} from "./hud/plates"
export { buildResetModal, type ResetModalRefs } from "./hud/settings"

export interface HudHandlers {
  onAdvanceDay: () => void
  onCare: (action: CareAction) => void
  onTrain: (program: TrainingProgram | null) => void
  /**
   * Flip the save v5 reduced-motion preference (persists like every other
   * sim change). The HUD only mirrors state; wiring stays in main.ts.
   */
  onToggleReducedMotion: () => void
  /**
   * Flip the save v9 arena-camera preference (cinematic ↔ broadcast).
   * The HUD only mirrors state; wiring stays in main.ts.
   */
  onToggleArenaCamera: () => void
  /**
   * Flip the save v13 audio mute toggle (persists like every other sim
   * change). The HUD only mirrors state; wiring stays in main.ts.
   */
  onToggleMuted: () => void
  /**
   * A settings volume slider moved (save v16). `commit` false auditions live;
   * true persists the bus level through the sim.
   */
  onVolume: (bus: "music" | "sfx", value: number, commit: boolean) => void
  /** Download a session-free export of the current save (main owns the file). */
  onDownloadSave: () => void
  /** Handle a picked save file: parse, confirm, write, reload (main owns it). */
  onImportFile: (file: File) => void
  /** True while a live cup/battle session blocks a save swap. */
  isImportBlocked: () => boolean
  /** Rename the partner through the sim (save v7 QoL). Returns false when
   * the sim rejects (e.g. mid-cup) so the HUD can coach instead of acting.
   */
  onRename: (name: string) => boolean
  /** Wipe the save and boot back to the starter picker (main.ts owns the
   * clearSave + reload). Only called after the modal confirm. */
  onReset: () => void
  /** Persist a dismissed onboarding hint id into settings.seenHints. */
  onHintSeen: (hintId: string) => void
  /** Open the graduation confirm flow (the HUD only asks; main owns it). */
  onGraduate: () => void
  /** Open the Hall of Fame panel (main owns the modal). */
  onOpenHallOfFame: () => void
  /** Hatch the waiting league gift egg (species roster FR-5); the app commits
   * the stable install through the store. */
  onHatchGift: () => void
  /**
   * Bring a pet waiting in the stable to the ranch (stable & partner reserve
   * FR-9); the app commits the sim's swap. Returns the refusal reason when
   * the sim turns the swap down, so the HUD can coach instead of acting.
   */
  onBringToRanch: (creatureId: string) => StableReason | null
  /**
   * Rename a pet waiting in the stable (the spec's edge case: the name
   * travels with the pet). The app runs the sim's rename and commits it; the
   * HUD only asks, and gets the sim's verdict back so it can coach instead
   * of going quiet.
   */
  onRenameStable: (creatureId: string, name: string) => RenameStableResult
}

export interface Hud {
  update(state: GameState): void
  /** Show the evolution-moment coach line (called once, right after the
   * ceremony starts; the next routine update replaces it). */
  announceEvolution(creature: NonNullable<GameState["creature"]>): void
  /** Show the graduation send-off line (legacy track): the retiree, the
   * generation it starts, and the successor's name — with the hatch-day
   * drift beat appended when the hatch drifted. */
  announceGraduation(
    retireeName: string,
    successorName: string,
    generation: number,
  ): void
  /** Show the save-failure coach line (called once per failed persist;
   * the next routine update replaces it). Non-blocking by design. */
  announceSaveFailure(): void
  /** Show (or clear, with "") a calm settings notice (save transfer). */
  noticeSettings(message: string, warn?: boolean): void
  /** Show the league-reward hatch line (species roster FR-7): the partner
   * that just hatched into the stable and the stats it came with. The next
   * routine update replaces it. */
  announceHatch(creature: NonNullable<GameState["creature"]>): void
  /** Show the morning-after's coach debrief line (postcup_morning_after
   * FR-6): the ritual day's one say — the next routine update replaces it. */
  announceMorningAfter(line: string): void
}

/**
 * The care HUD: broadcast-style overlays over the 3D ranch - a top-center
 * score bug, a bottom-left creature lower-third with condition bars, and a
 * bottom-right command dock. Built from the shared broadcast kit
 * (ui/kit.ts): warm keyline plates, chamfered corners, skewed AP pips.
 *
 * Three passes over one set of refs: `shell` builds and binds, `update`
 * paints the state, `hints` owns the onboarding callout. This module is the
 * composition root and the app's public surface for the HUD.
 */
export function createHud(root: HTMLElement, handlers: HudHandlers): Hud {
  const shell = createHudShell(root, handlers)
  // The onboarding callout is appended last, where it has always sat.
  const hints = createHints(handlers.onHintSeen)
  root.append(hints.root)
  const update = createHudUpdate(shell, hints)
  // The shell's own interactions re-render through this pass. The latest
  // state is kept so the graduation announcement can keep the hatch-day
  // drift beat (FR-6): it composes the send-off and the drift statement, so
  // a drifted hatch speaks both lines instead of trading one for the other.
  let latest: GameState | null = null
  const paint = (state: GameState) => {
    latest = state
    update(state)
    // The league gift chip (species roster FR-5): shown only while a granted
    // egg waits.
    syncGiftChip(shell.refs.giftChip, state)
    // The Stable chip (FR-9): shown only while the stable holds a pet.
    syncStableChip(shell.refs.stableChip, state)
  }
  // The shell's own interactions re-render through this pass.
  shell.render = paint
  return {
    update: paint,
    announceEvolution(creature) {
      shell.refs.creaturePlate.statusTicker.say(evolveCallout(creature))
    },
    announceGraduation(retireeName, successorName, generation) {
      const drifted = latest?.creature?.affinity
        ? driftCallout(latest.creature, latest.lineage, latest.day)
        : ""
      shell.refs.creaturePlate.statusTicker.say(
        graduationTickerLine(retireeName, successorName, generation, drifted),
      )
    },
    announceSaveFailure() {
      shell.refs.creaturePlate.statusTicker.say(saveFailureNotice())
    },
    announceHatch(creature) {
      shell.refs.creaturePlate.statusTicker.say(hatchCallout(creature))
    },
    noticeSettings(message, warn) {
      shell.refs.settings.notice(message, warn)
    },
    announceMorningAfter(line) {
      shell.refs.creaturePlate.statusTicker.say(line)
    },
  }
}
