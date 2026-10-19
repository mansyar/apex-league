import type { LifeStage } from "@apex/sim"
import { generate } from "@apex/voxel"
import * as THREE from "three"
import { profileFor } from "./choreo"
import { buildCreatureGroup } from "./creature"
import { findEyes } from "./face-motion"
import type { DriveFighter } from "./fighter-driver"
import { disposeObject3D, lambertMaterialOf } from "./scene-utils"

/** Canonical home-slot x for a cast fighter, mirrored by `away`. */
export const HOME_X = 2.6
/** Arena normalization: the whole-creature ground footprint every cast is
 * scaled to at cast time (fighting-game stage normalization). Gap
 * constants, camera framing, and authored choreography then stay
 * species-independent; silhouette and bulk still read, only overall
 * scale is equalized. The ranch and gallery keep natural sizes. */
export const ARENA_FOOTPRINT = 1.7

/** Holder scale that fits a creature's widest ground span into the
 * canonical arena slot. The 0.001 floor guards degenerate bounds. */
export function arenaFootprintScale(size: { x: number; z: number }): number {
  const footprint = Math.max(size.x, size.z, 0.001)
  return ARENA_FOOTPRINT / footprint
}

/** One staged fighter: a DriveFighter plus its fixed home spot. */
export interface Combatant extends DriveFighter {
  home: THREE.Vector3
}

/** Casting entry: the sim-side description of one side of a fight. The
 * stage selects the life-stage build (defaults to the baby build when
 * omitted — rivals carry no stage in the sim). */
export interface CastInfo {
  archetypeId: string
  seed: number
  name: string
  key?: string
  stage?: LifeStage
}

/** Build one fighter at its home spot. The rig is re-anchored onto its
 * visual center and normalized to the arena footprint exactly like the
 * ranch scene does (Learnings §1), then captured for palette restore. */
export function buildSpot(
  info: CastInfo,
  away: 1 | -1,
  arenaGroup: THREE.Group,
): Combatant {
  const { dna, build, def } = generate(
    info.archetypeId,
    info.seed,
    info.stage ?? "baby",
  )
  const inner = buildCreatureGroup(dna, build, def.grid)
  inner.traverse((obj) => {
    if (obj instanceof THREE.Mesh) obj.castShadow = true
  })
  // Learnings §1: the rig is built in voxel grid units and its group
  // origin is the rig grid origin — not the creature's visible mass —
  // so yaw turns and KO topples on the raw rig read as an arc.
  // Re-anchor exactly like the ranch scene: measure the whole-creature
  // visual center, wrap the rig in an identity-scale holder, and offset
  // the child so the visual center sits on the holder origin. All motion
  // code below drives the holder.
  inner.updateMatrixWorld(true)
  const innerBox = new THREE.Box3().setFromObject(inner)
  const center = innerBox.getCenter(new THREE.Vector3())
  const group = new THREE.Group()
  group.add(inner)
  inner.position.set(-center.x, 0, -center.z)
  // Arena normalization: scale the holder so the whole-creature footprint
  // fits the canonical slot. Applied to the holder (not the rig) so the
  // baked voxel scale contract is untouched and the squash spring keeps
  // composing on top of it.
  const size = innerBox.getSize(new THREE.Vector3())
  group.scale.setScalar(arenaFootprintScale(size))
  const combatant: Combatant = {
    name: info.name,
    key: info.key,
    group,
    home: new THREE.Vector3(HOME_X * away, 0, 0),
    away,
    down: false,
    baseColors: new Map(),
    profile: profileFor(info.archetypeId),
    stage: new THREE.Vector3(HOME_X * away, 0, 0),
    smooth: new THREE.Vector3(HOME_X * away, 0, 0),
    velocity: new THREE.Vector3(),
    walkPhase: 0,
    offset: new THREE.Vector3(),
    squash: { s: 0, v: 0 },
    lean: { pitch: 0, roll: 0 },
    fall: 0,
    phase: Math.random() * Math.PI * 2,
    baseScale: group.scale.x,
    eyes: findEyes(group),
    faceSeed: info.seed,
  }
  group.position.copy(combatant.stage)
  // The rig fronts its local +Z, so the left fighter turns +90° to look
  // down +X — the driver keeps the yaw continuously correct from here;
  // this initial copy just avoids a first-frame spin.
  const initialYaw = away === 1 ? -Math.PI / 2 : Math.PI / 2
  group.rotation.set(0, initialYaw, 0)
  arenaGroup.add(group)
  // Capture the cast-time palette per part so a hit flash returns it to
  // base later.
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const mat = lambertMaterialOf(obj)
      if (!mat) return
      combatant.baseColors.set(obj, mat.color.clone())
    }
  })
  return combatant
}

/** Remove a fighter from the arena and dispose its rig. */
export function disposeFighter(
  c: Combatant | null,
  arenaGroup: THREE.Group,
): void {
  if (!c) return
  disposeObject3D(c.group)
  arenaGroup.remove(c.group)
}

/** Settle every fighter back to base before disposal — a fighter hit
 * mid-flash in the final beat would otherwise carry the white pop into
 * the next fight (materials are fresh per cast, but the screenshot
 * timeline showed lingering whites between fights). */
export function settlePalettes(fighters: Array<Combatant | null>): void {
  for (const c of fighters) {
    if (!c) continue
    for (const [mesh, base] of c.baseColors) {
      lambertMaterialOf(mesh)?.color.copy(base)
    }
    c.group.rotation.set(0, c.group.rotation.y, 0)
    c.group.scale.setScalar(c.baseScale)
  }
}
