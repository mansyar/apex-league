import type {
  CareAction,
  GameState,
  RenameStableResult,
  StableReason,
  TrainingProgram,
} from "@apex/sim"
import type { CreatureDetail } from "../creature-detail"
import type { GiftModal } from "../gift"
import type { SettingsModalRefs } from "../settings-modal"
import type { StableModal } from "../stable"
import type { CommandDockRefs } from "./dock"
import type { OverflowRefs } from "./overflow"
import type {
  CreaturePlateRefs,
  LineagePlateRefs,
  ScoreBugRefs,
} from "./plates"

/**
 * The HUD's shared seams. `shell`, `update` and `hints` are three passes over
 * one set of references — the types they share live here, so no two of them
 * import each other (app/screen-deps.ts does the same for the boot root).
 */

/** Every element and sub-controller `createHud` builds once. */
export interface HudRefs {
  scoreBug: ScoreBugRefs
  creaturePlate: CreaturePlateRefs
  dock: CommandDockRefs
  settings: SettingsModalRefs
  creatureDetail: CreatureDetail
  /** The Storm Gift card (electric species line FR-5). */
  gift: GiftModal
  /** The chip that opens the gift card; hidden while nothing is pending. */
  giftChip: HTMLButtonElement
  /** The stable modal (stable & partner reserve FR-9). */
  stable: StableModal
  /** The chip that opens the stable; hidden while the stable is empty. */
  stableChip: HTMLButtonElement
  motionWrap: HTMLElement
  lineage: LineagePlateRefs
  /** The More toggle + panel the secondary chips fold behind. */
  overflow: OverflowRefs
}

/** The interaction state `shell` owns and `update` reads. */
export interface HudViewState {
  current: GameState | null
  pickerOpen: boolean
  creatureOpen: boolean
  dockOpen: boolean
  renaming: boolean
  /** The More panel: shut on phones, open where the ranch has room. */
  overflowOpen: boolean
  /** The lineage detail: folded on phones, shown where the ranch has room. */
  lineageOpen: boolean
}

/** The handler subset `shell` wires (a HudHandlers satisfies it). */
export interface HudShellHandlers {
  onCare: (action: CareAction) => void
  /** Assign a program, or clear tonight's with `null`. */
  onTrain: (program: TrainingProgram | null) => void
  onAdvanceDay: () => void
  onToggleReducedMotion: () => void
  onToggleArenaCamera: () => void
  onToggleMuted: () => void
  onVolume: (bus: "music" | "sfx", value: number, commit: boolean) => void
  onDownloadSave: () => void
  onImportFile: (file: File) => void
  isImportBlocked: () => boolean
  onGraduate: () => void
  onReset: () => void
  onOpenHallOfFame: () => void
  onRename: (name: string) => boolean
  /**
   * Hatch the granted Storm Gift (electric species line FR-5/FR-6). The app
   * commits the succession through the store; the HUD only asks.
   */
  onHatchGift: () => void
  /**
   * Bring a pet waiting in the stable to the ranch (stable & partner reserve
   * FR-9). The app runs the sim's swap and commits it; the HUD only asks, and
   * gets the refusal reason back when the sim turns the swap down.
   */
  onBringToRanch: (creatureId: string) => StableReason | null
  /**
   * Rename a pet waiting in the stable (the spec's edge case: the name
   * travels with the pet). The app runs the sim's rename and commits it; the
   * HUD only asks, and gets the sim's verdict back.
   */
  onRenameStable: (creatureId: string, name: string) => RenameStableResult
  /**
   * Chips the composition root adds to the chip cluster — the cloud chip when
   * this build has an api origin (FR-11). Absent in a local-only build, which
   * is how "no cloud" stays invisible (AC-11).
   */
  extraChips?: HTMLElement[]
}

/** The built HUD, as `shell` hands it to the other two passes. */
export interface HudShell {
  view: HudViewState
  refs: HudRefs
  /** The update pass, injected by createHud — shell must not import update. */
  render(state: GameState): void
  /** Fold the inline rename editor away (update calls it on cup day). */
  closeRename(): void
}

/** The onboarding callout and the hint it is currently showing. */
export interface HudHints {
  root: HTMLElement
  /** Show the first unseen hint whose moment is now, or clear the callout. */
  sync(state: GameState): void
}
