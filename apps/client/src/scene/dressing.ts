import { makeRng } from "@apex/voxel"
import * as THREE from "three"
import { buildPropGroup } from "../prop"
import type { RanchMotion } from "../ranch/motion"

/**
 * The ranch set's dressing, moved verbatim out of `scene.ts`: the seeded
 * scenery scatter (vegetation ring + landmark trees and rocks) and the food
 * pile landmark, both cross-faded with the ranch set.
 */

/**
 * The food pile's fixed landmark spot. The creature's home anchor is the
 * origin where it idles; the food pile is a fixed landmark. Ceremony visuals
 * translate/rotate the creature as a runtime transform only — the sim is
 * untouched.
 */
export const PILE_POS = new THREE.Vector3(-2.4, 0, 0.4)

export interface RanchDressingHost {
  scene: THREE.Scene
  motion: RanchMotion
  /** Dispose + detach a scene-owned group (the scene's disposeGroup). */
  disposeGroup(group: THREE.Group): void
}

export interface RanchDressing {
  /**
   * (Re)scatter the scenery from the creature's visual seed. Same seed →
   * identical scatter; no-op when unchanged.
   */
  setProps(visualSeed: number): void
  /** Show or hide the food pile (fedToday from the sim). */
  setFedToday(fedToday: boolean): void
  /** Cross-fade the scenery + food pile with the ranch set (already clamped). */
  setBlend(blend: number): void
}

export function createRanchDressing(host: RanchDressingHost): RanchDressing {
  const { scene, motion, disposeGroup } = host

  let ranchScenery: THREE.Group | null = null
  let scenerySeed = -1
  let foodPile: THREE.Group | null = null
  let fedTodayVisible = false
  let ranchBlendK = 1

  return {
    setProps(visualSeed) {
      if (scenerySeed === visualSeed) return
      scenerySeed = visualSeed
      if (ranchScenery) disposeGroup(ranchScenery)
      motion.resetProps()
      const scenery = new THREE.Group()
      scenery.name = "ranch-scenery"
      const rng = makeRng(visualSeed)
      const scatter = (propId: string, angle: number, radius: number): void => {
        const prop = buildPropGroup(propId, rng.int(2 ** 30))
        prop.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
        prop.rotation.y = rng.next() * Math.PI * 2
        motion.registerSway(propId, prop)
        scenery.add(prop)
      }
      // Seeded vegetation ring: the creature's visualSeed picks each
      // tuft/bush position, variant, and facing. Ground radius keeps the
      // footprint clear (2.2+) and the horizon clear (rho <= 8.8).
      for (let i = 0; i < 16; i++) {
        scatter("tuft", rng.next() * Math.PI * 2, 2.2 + rng.next() * 6.6)
      }
      for (let i = 0; i < 5; i++) {
        scatter("bush", rng.next() * Math.PI * 2, 3.2 + rng.next() * 5.6)
      }
      // Landmark trees and rocks: fixed positions, fixed seeds — the
      // silhouettes the ranch composition hangs on.
      const landmark = (
        propId: string,
        x: number,
        z: number,
        rotY: number,
        seed: number,
      ): void => {
        const prop = buildPropGroup(propId, seed)
        prop.position.set(x, 0, z)
        prop.rotation.y = rotY
        motion.registerSway(propId, prop)
        scenery.add(prop)
      }
      landmark("broadleafTree", -6.5, -4.5, 0.65, 1101)
      landmark("broadleafTree", 3, -5.5, -1.1, 1102)
      landmark("rock", -4.2, -3, 0.3, 2201)
      landmark("rock", 5.6, -4.4, -2.1, 2202)
      landmark("rock", -7.5, -1.6, 1.4, 2203)
      scene.add(scenery)
      ranchScenery = scenery
      // Publish the fresh candidate list to the wanderer (FR3).
      motion.commitProps()
    },
    setFedToday(fedToday) {
      if (!foodPile) {
        foodPile = buildPropGroup("foodPile", 3301)
        foodPile.position.copy(PILE_POS)
        foodPile.rotation.y = -0.4
        scene.add(foodPile)
      }
      fedTodayVisible = fedToday
      foodPile.visible = fedToday && ranchBlendK > 0.5
    },
    setBlend(blend) {
      ranchBlendK = blend
      if (ranchScenery) ranchScenery.visible = blend > 0.001
      if (foodPile) foodPile.visible = fedTodayVisible && blend > 0.5
    },
  }
}
