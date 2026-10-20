import type { MusicBeds } from "../audio/musicBeds"
import { nextShot } from "../director"
import { resolveMotionPref } from "../motion"
import type { SceneHandle } from "../scene"
import type { FightCasting, Staging } from "../staging"
import type { GameStore } from "../store"
import type { Swap } from "../swap"

/**
 * Arena entry and presentation (composition-root split): the shared dissolve
 * choreography both battle surfaces use, the big-hit vignette, the cinematic
 * director hook and the reduced-motion hand-off. Moved out of `main.ts`
 * unchanged; `main.ts` still calls each piece at the boot position it held, so
 * the construction order is untouched.
 */
export interface ArenaDeps {
  app: HTMLElement
  scene: SceneHandle
  staging: Staging
  swap: Swap
  store: GameStore
  /**
   * The music beds, resolved on demand. The entry hooks are defined before
   * the beds are constructed — they only run once a fight starts — which is
   * the same late binding the inline closure had.
   */
  getBeds(): MusicBeds
}

export interface Arena {
  enterArena(casting: FightCasting): void
  exitArena(): void
  /** Vignette, big-hit and director hooks; runs once at boot. */
  wirePresentation(): void
  /** Push the saved reduced-motion preference into every arena consumer. */
  applyMotionPref(): void
}

export function createArena(deps: ArenaDeps): Arena {
  const { app, scene, staging, swap, store, getBeds } = deps

  // The arena handoff is shared choreography: both the spar and the cup
  // dissolve into the broadcast bowl the same way and restore the ranch on
  // the way out. Nothing here touches the save.
  const enterArena = (casting: FightCasting): void => {
    scene.setRanchCreatureVisible(false)
    void swap.enterArena()
    staging.cast(casting)
    // The arena bed takes over from the ranch loop while the bowl plays.
    getBeds().setScene("arena")
    // Broadcast clarity: the ranch HUD stands down while the bowl plays.
    app.classList.add("app-in-arena")
  }
  const exitArena = (): void => {
    scene.setRanchCreatureVisible(true)
    void swap.exitArena()
    staging.clear()
    // Back to the ranch loop on the way out.
    getBeds().setScene("ranch")
    app.classList.remove("app-in-arena")
  }

  const wirePresentation = (): void => {
    // Big-hit vignette (FR7): a screen-edge darkening that pulses with the
    // same strength the camera shake uses. A DOM overlay - cheap, and it
    // rides above both the spar and cup battles. Reduced motion skips it.
    const vignette = document.createElement("div")
    vignette.className = "hit-vignette"
    document.body.appendChild(vignette)
    let vignetteFade: number | null = null
    const flashVignette = (strength: number): void => {
      // Both the saved preference and the OS query gate the flash - the CSS
      // media query alone cannot (the opacity is driven inline).
      if (resolveMotionPref(store.get().settings.reducedMotion)) return
      // Fast flash in, slow ease back out - the two-phase transition swap.
      vignette.style.transition = "opacity 60ms ease-out"
      vignette.style.opacity = String(Math.min(0.85, strength * 9))
      if (vignetteFade !== null) window.clearTimeout(vignetteFade)
      vignetteFade = window.setTimeout(() => {
        vignette.style.transition = "opacity 300ms ease-in"
        vignette.style.opacity = "0"
      }, 110)
    }

    staging.setBigHitHandler((strength) => {
      scene.shake(strength)
      flashVignette(strength)
    })
    // Cinematic director (FR6): the stage reports the live battle context;
    // nextShot turns it into a camera intent. Reduced motion pins the
    // broadcast camera inside the scene, so no extra guard here.
    // The intent object is reused across frames: nextShot fully rewrites it,
    // and the feed runs on every render tick (no per-frame allocation).
    const directorIntent: Parameters<typeof nextShot>[1] = {
      look: { x: 0, y: 0, z: 0 },
      radiusMult: 1,
      azimuthDelta: 0,
      elevationDelta: 0,
      cut: false,
    }
    staging.setDirectorHandler((ctx) =>
      scene.applyDirectorIntent(nextShot(ctx, directorIntent)),
    )
  }

  /**
   * Reduced-motion hand-off: the save v5 preference reaches the arena
   * (no shake/flash in staging, no bounce/shake in scene) whenever it flips.
   */
  const applyMotionPref = (): void => {
    const reduced = store.get().settings.reducedMotion
    staging.setMotionPref(reduced ? "reduced" : "full")
    scene.setMotionReduced(reduced)
    // The swap honors the save too: in-app reduced means instant cuts.
    swap.setMotionReduced(reduced)
    // CSS surfaces (cup reveals, battle stamps, sheets) read this class;
    // without it the saved setting only reached the 3D layer.
    document.body.classList.toggle("is-reduced", resolveMotionPref(reduced))
  }

  return { enterArena, exitArena, wirePresentation, applyMotionPref }
}
