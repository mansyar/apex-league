import type * as THREE from "three"
import { lambertMaterialOf } from "../scene-utils"
import { FLASH_MS } from "./fx-data"
import { flashMix } from "./fx-math"
import type { EffectLoop } from "./loop"

/**
 * The hit-flash layer: a victim's cells snap to white on a landed blow
 * and decay back to their cast-time palette over FLASH_MS. Reduced
 * motion reads skip the brightness pop entirely.
 */

/** Structural view of a fighter for the flash subsystem (staging's Combatant satisfies it). */
export interface FlashVictim {
  baseColors: Map<THREE.Mesh, THREE.Color>
}

/** Build the hit-flash layer over the shared effect loop. */
export function createFlashLayer(host: {
  loop: EffectLoop
  /** Motion preference provider (reduced keeps visuals calm). */
  pref: () => "full" | "reduced"
}): {
  /** Spawn the victim's white-out flash. */
  start(victim: FlashVictim): void
  /** Drop the live flash without restoring (between-fight stop). */
  clear(): void
} {
  const { loop, pref } = host

  /** Put a victim's palette back exactly as captured at cast time. */
  const restoreVictim = (victim: FlashVictim): void => {
    for (const [mesh, base] of victim.baseColors) {
      lambertMaterialOf(mesh)?.color.copy(base)
    }
  }

  /** Hit state: who is flashing and how far into it (accumulated ms). */
  let flash: { victim: FlashVictim; age: number } | null = null

  /** Partway back from white by accumulated age; returns false when done. */
  const flashStep = (dt: number): boolean => {
    if (!flash) return false
    // dt is already frozen to 0 during a hit-stop - the whole frame holds.
    flash.age += dt
    const w = flashMix(flash.age, FLASH_MS)
    for (const [mesh, base] of flash.victim.baseColors) {
      const mat = lambertMaterialOf(mesh)
      if (!mat) continue
      mat.color.setRGB(
        1 - w + base.r * w,
        1 - w + base.g * w,
        1 - w + base.b * w,
      )
    }
    if (flash.age >= FLASH_MS) {
      restoreVictim(flash.victim)
      flash = null
    }
    return flash !== null
  }

  return {
    start(victim: FlashVictim): void {
      if (pref() === "reduced") return // calm reads: no brightness pop
      // Restore the outgoing victim first - replacing the slot mid-decay
      // would otherwise strand them partially white until clear().
      if (flash) restoreVictim(flash.victim)
      flash = { victim, age: 0 }
      // Snap to full white immediately; the decay loop unwinds it.
      for (const mesh of victim.baseColors.keys()) {
        lambertMaterialOf(mesh)?.color.setRGB(1, 1, 1)
      }
      loop.add(flashStep)
    },
    clear(): void {
      flash = null
    },
  }
}
