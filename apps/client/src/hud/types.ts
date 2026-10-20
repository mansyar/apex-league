import type { CareAction, GameState, StatKey } from "@apex/sim"
import type { CreatureDetail } from "../creature-detail"
import type { SettingsModalRefs } from "../settings-modal"
import type { CommandDockRefs } from "./dock"
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
  motionWrap: HTMLElement
  lineage: LineagePlateRefs
}

/** The interaction state `shell` owns and `update` reads. */
export interface HudViewState {
  current: GameState | null
  pickerOpen: boolean
  creatureOpen: boolean
  dockOpen: boolean
  renaming: boolean
}

/** The handler subset `shell` wires (a HudHandlers satisfies it). */
export interface HudShellHandlers {
  onCare: (action: CareAction) => void
  onTrain: (stat: StatKey) => void
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
