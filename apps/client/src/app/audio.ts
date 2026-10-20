import type { PlaybackStep } from "@apex/sim"
import { cueForStep } from "../audio/cues"
import { MusicBeds } from "../audio/musicBeds"
import { playCue } from "../audio/playCue"
import { AudioPlayer } from "../audio/player"
import type { GameStore } from "../store"

/**
 * Audio wiring (composition-root split): the player, the two music beds, the
 * first-gesture unlock and the playback step-cue bridge. Moved out of
 * `main.ts` unchanged; the handles stay exposed so the composition root can
 * keep its mute/volume fanout in registration order.
 */
export interface AudioWiring {
  /** SFX player: holds the unlock gate and the persisted mix. */
  readonly player: AudioPlayer
  /** Ranch and arena music beds. */
  readonly beds: MusicBeds
  /** One playback step through the pure cue table into the player. */
  playStepCue(step: PlaybackStep, instant: boolean): void
}

export function createAudioWiring(store: GameStore): AudioWiring {
  // Battle audio (audio_foundation_20261017 FR3): the pure cue table gates
  // every playback step, the player holds the unlock/mute gate, and playCue
  // voices the bundled CC0 assets. Unlock waits for the first gesture
  // (autoplay policy); the persisted mute rides the store fanout; instant
  // reduced-motion dumps stay silent by design.
  const player = new AudioPlayer(playCue)
  // Music beds: ranch loop by default, crossfaded to the arena loop by the
  // shared enter/exit choreography, faded out while muted.
  const beds = new MusicBeds()
  beds.setScene("ranch")
  const unlockAudio = (): void => {
    player.unlock()
    beds.resume() // the boot-time play() may have been autoplay-rejected
  }
  window.addEventListener("pointerdown", unlockAudio, { once: true })
  window.addEventListener("keydown", unlockAudio, { once: true })
  const playStepCue = (step: PlaybackStep, instant: boolean): void => {
    if (instant) return // dump mode: no sound
    const { settings } = store.get()
    const cue = cueForStep(step, settings)
    if (cue) player.play(cue)
  }

  return { player, beds, playStepCue }
}
