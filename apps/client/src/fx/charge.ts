import * as THREE from "three"
import { elementColor } from "../move-fx"
import { PROJECTILE_RADIUS, SHOT_ORIGIN_Y } from "./fx-data"

/**
 * The tier-4 charge orb, moved verbatim out of `staging-fx.ts`: one orb that
 * swells at the caster's mouth line until the release frees it.
 */
export interface ChargeOrbHost {
  arenaGroup: THREE.Group
  /** Motion preference provider (reduced keeps visuals calm). */
  pref: () => "full" | "reduced"
  /** Free the orb's mesh. */
  killMesh: (mesh: THREE.Object3D) => void
}

export interface ChargeOrb {
  /** Grow (or create) the charge orb at the caster's mouth line. */
  set(
    who: { group: THREE.Group },
    element: string | undefined,
    scale: number,
  ): void
  /** Release (and free) the charge orb. */
  clear(): void
}

export function createChargeOrb(host: ChargeOrbHost): ChargeOrb {
  const { arenaGroup, killMesh } = host
  /** The tier-4 Lance's charging orb, swelling at the thrower's mouth. */
  let chargeMesh: THREE.Mesh | null = null

  const clear = (): void => {
    if (!chargeMesh) return
    killMesh(chargeMesh)
    chargeMesh = null
  }

  return {
    set(who, element, scale) {
      if (host.pref() === "reduced") return
      if (!chargeMesh) {
        chargeMesh = new THREE.Mesh(
          new THREE.SphereGeometry(PROJECTILE_RADIUS * 1.1, 12, 10),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(elementColor(element)),
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        )
        const at = who.group.position
        chargeMesh.position.set(at.x, at.y + SHOT_ORIGIN_Y, at.z)
        arenaGroup.add(chargeMesh)
      }
      // The caster may drift while charging - keep the orb on the mouth line.
      const at = who.group.position
      chargeMesh.position.set(at.x, at.y + SHOT_ORIGIN_Y, at.z)
      chargeMesh.scale.setScalar(scale)
    },
    clear,
  }
}
