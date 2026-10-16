import * as THREE from "three"
import { elementColor } from "../move-fx"
import { DECAL_LIFE_MS, DECAL_MAX, decalRadius } from "./fx-data"
import { decalPop, fadeOver } from "./fx-math"
import type { EffectLoop } from "./loop"

/**
 * The floor-mark layer (FR7): each landed blow burns a fading elemental
 * mark under the impact. Marks stack a hair above the floor so they never
 * z-fight, cap out at DECAL_MAX (oldest is recycled first), and linger
 * DECAL_LIFE_MS. Reduced motion reads skip the marks entirely.
 */

interface Decal {
  mesh: THREE.Mesh
  /** Accumulated age (ms), frozen during a hit-stop. */
  elapsed: number
  life: number
}

/** Build the floor-mark layer over the shared effect loop. */
export function createDecalLayer(host: {
  arenaGroup: THREE.Group
  loop: EffectLoop
  /** Motion preference provider (reduced keeps visuals calm). */
  pref: () => "full" | "reduced"
}): {
  /** Burn a floor mark under a landed blow; strength scales the mark. */
  spawn(at: THREE.Vector3, element: string | undefined, strength: number): void
  /** Strip every decal (panel teardown). */
  disposeAll(): void
} {
  const { arenaGroup, loop, pref } = host
  const decals: Decal[] = []

  const disposeDecal = (decal: Decal): void => {
    arenaGroup.remove(decal.mesh)
    decal.mesh.geometry.dispose()
    ;(decal.mesh.material as THREE.Material).dispose()
  }

  /** Advance every decal: quick pop-in, long fade. */
  const decalStep = (dtMs: number): boolean => {
    for (let i = decals.length - 1; i >= 0; i--) {
      const decal = decals[i]
      if (!decal) continue
      decal.elapsed += dtMs
      const k = Math.min(1, decal.elapsed / decal.life)
      decal.mesh.scale.setScalar(decalPop(k))
      ;(decal.mesh.material as THREE.MeshBasicMaterial).opacity = fadeOver(
        0.55,
        k,
      )
      if (k >= 1) {
        disposeDecal(decal)
        decals.splice(i, 1)
      }
    }
    return decals.length > 0
  }

  return {
    spawn(at: THREE.Vector3, element: string | undefined, strength: number) {
      if (pref() === "reduced") return
      if (decals.length >= DECAL_MAX) {
        const oldest = decals.shift()
        if (oldest) disposeDecal(oldest)
      }
      const color = new THREE.Color(elementColor(element)).multiplyScalar(0.22)
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(decalRadius(strength), 14),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      )
      mesh.rotation.x = -Math.PI / 2
      // A touch above the floor, stacked per decal, so marks never z-fight.
      mesh.position.set(at.x, 0.026 + decals.length * 0.004, at.z)
      mesh.scale.setScalar(0.2)
      arenaGroup.add(mesh)
      decals.push({ mesh, elapsed: 0, life: DECAL_LIFE_MS })
      loop.add(decalStep)
    },
    disposeAll(): void {
      for (const decal of decals) disposeDecal(decal)
      decals.length = 0
    },
  }
}
