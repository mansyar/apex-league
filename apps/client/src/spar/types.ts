/**
 * The spar's contracts (spar_modules split): the host handler object and the
 * panel handle the app talks to, plus the panel refs the extracted modules
 * pass around. Same names and signatures as when they lived in spar.ts.
 */

import type { Creature, makeExhibition, PlaybackStep } from "@apex/sim"
import type { TacticButton } from "../battleUI"
import type { FightCasting } from "../staging"

export interface SparHandlers {
  /**
   * Persist a chosen kit (or reset it to null = default slicing) through
   * the state flow. main.ts wires this to setLoadout/clearLoadout and saves.
   */
  onSetLoadout?: (moveIds: readonly string[] | null) => void
  /**
   * A fight is starting: the arena swaps in behind the panel and the two
   * combatants are cast onto the broadcast stage.
   */
  onFightStart?: (casting: FightCasting) => void
  /** One playback step should now play in the arena. */
  onStep?: (step: PlaybackStep, instant: boolean) => void
  /** The sparring panel closes: the scene swaps back to the ranch. */
  onClose?: () => void
  /**
   * The playback pacing changed (normal ⇄ fast): the arena should scale
   * its action animations to match (ms per playback step).
   */
  onPace?: (msPerStep: number) => void
  /**
   * Live read of the saved reduced-motion preference, so an in-app
   * "reduced" setting gates the playback even when the OS is motion-ok.
   */
  motionPref?: () => boolean
}

export interface Spar {
  /** Sync the button and live creature reference with the current state. */
  update(creature: Creature | null): void
  /** Hold a live fight's playback while the tab is away (F5). */
  setPaused(paused: boolean): void
  /**
   * Open a free bout against a board ghost's champion bundle (FR-5). Returns
   * true when the bout opened; false when there is no creature yet or the
   * bundle is not fightable. The bout resolves locally — no cups, ladder,
   * morning-after, or ghost re-submit can observe it.
   */
  fightGhost(bundle: unknown): boolean
}

/** The exhibition setup the sim pre-rolls for one spar. */
export type SparSetup = ReturnType<typeof makeExhibition>

/** The spar panel's writable surfaces: the chip, the panel and its rows. */
export interface SparPanelRefs {
  sparButton: HTMLButtonElement
  overlay: HTMLElement
  panel: HTMLElement
  heading: HTMLElement
  intro: HTMLElement
  rivalName: HTMLElement
  rivalCrest: HTMLElement
  rivalDetail: HTMLElement
  progress: HTMLElement
  ownedCard: HTMLElement
  rivalCard: HTMLElement
  loadoutRow: HTMLElement
  kitStrip: HTMLElement
  kitHint: HTMLElement
  resetPill: HTMLButtonElement
  tactics: HTMLElement
  tacticButtons: TacticButton[]
  fastButton: HTMLButtonElement
  replayButton: HTMLButtonElement
  logBox: HTMLElement
  logToggle: HTMLButtonElement
  log: HTMLElement
  close: HTMLButtonElement
  panelClose: HTMLButtonElement
  chips: HTMLElement
}
