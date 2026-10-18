import { generate, type Stage } from "@apex/voxel"
import * as THREE from "three"
import { buildCreatureGroup } from "../creature"
import { createWander, stageScale } from "../scene-logic"
import type { RanchState } from "./state"

/** Build a creature rig (archetype + seed + stage) with the visual-center
 * holder contract and the stage's world scale. Kept as its own step so
 * the evolution ceremony's swap reuses the exact same path. */
export function rebuild(
  s: RanchState,
  archetypeId: string,
  seed: number,
  stage: Stage,
): void {
  if (s.creatureGroup) s.deps.disposeGroup(s.creatureGroup)
  const { dna, build, def } = generate(archetypeId, seed, stage)
  // The rig is built in voxel GRID units inside an inner group that
  // carries the tiny world scale — children positions are ~20× larger
  // than world units, so mutating them to re-anchor went wrong by that
  // factor (the visible mass kept sitting ~1.7 units off the origin and
  // every yaw pivot swung the body around a distant axis — user-reported
  // "arc/turn that moves the position"). Instead: keep the rig untouched
  // inside its scaled group, measure the visual center of the WHOLE
  // creature, and wrap it in an identity-scale holder whose child offset
  // (in true world units) places the visual center on the holder origin.
  // All motion code drives the holder afterwards. The stage scale lives
  // on the holder too (never on rig children — learnings.md), so babies
  // measure the same visual center the adult would.
  const inner = buildCreatureGroup(dna, build, def.grid)
  inner.updateMatrixWorld(true)
  const innerBox = new THREE.Box3().setFromObject(inner)
  const center = innerBox.getCenter(new THREE.Vector3())
  const rig = new THREE.Group()
  rig.add(inner)
  inner.position.set(-center.x, 0, -center.z)
  rig.scale.setScalar(stageScale(stage))
  s.creatureGroup = rig
  s.currentStage = stage
  rig.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.castShadow = true
  })
  s.deps.scene.add(rig)
  // Cache the rig part refs once per build — the idle loop would
  // otherwise run five O(n) scene-graph searches every frame.
  s.rigParts = {
    body: rig.getObjectByName("body") ?? undefined,
    head: rig.getObjectByName("head") ?? undefined,
    tail: rig.getObjectByName("tail") ?? undefined,
    tailTip: rig.getObjectByName("tailTip") ?? undefined,
  }
  // One wanderer per scene lifetime (FR3): rebuilding the creature (day
  // advance, training) pauses the machine — the 20–40 s rhythm survives
  // visual rebuilds instead of restarting. A feed ceremony still aborts
  // it cleanly via startFeed.
  if (s.wander) {
    s.wander.pause()
  } else {
    s.wander = createWander(s.reducedMotion, seed)
  }
  s.wanderSeed = seed
  s.headBaseY = rig.getObjectByName("head")?.position.y ?? 0
}
