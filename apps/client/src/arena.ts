import { makeRng } from "@apex/voxel"
import * as THREE from "three"
import { ARENA_HALF_X, ARENA_HALF_Z } from "./arena-scale"
import { RANCH_SKY } from "./environment"
import { disposeObject3D } from "./scene-utils"

/**
 * Broadcast arena environment: a bright, formal competition floor (no
 * moss, no golden hour), a painted boundary that frames the fight, tiered
 * stands with crowd silhouettes, and an even, high-key "broadcast" rig
 * that replaces the ranch's warm one while the arena is on screen. Floor
 * and backdrop stay mid-tone so the tracked fighter silhouettes keep their
 * contrast against the set.
 */

/**
 * Arena backdrop tone. Fog dissolves everything past the stands into this
 * slate navy, so the horizon behind the crowd reads as a lit venue bowl
 * instead of the ranch's sunset. Darker than the floor: it is the constant
 * backdrop fighters are read against.
 */
export const ARENA_SKY = 0x323d54

/** Fog distance where the stands end and the venue bowl takes over. */
export const ARENA_FOG_NEAR = 24
export const ARENA_FOG_FAR = 48

/**
 * Formal-competition palette. Lighter cool slate floor, crisp cream paint,
 * mid-dark stands and near-black crowd silhouettes: bright enough to read
 * as a lit arena, but not so bright that a fighter disappears into it.
 */
const FLOOR_COLOR = 0x626d7e
const FLOOR_LINE_COLOR = 0xf2ead6
const STAND_COLOR = 0x454d5e
const STAND_EMISSIVE = 0x384058
const CROWD_COLOR = 0x171b28

/**
 * Lighting rig targets (applied at blend = 1). Fill and rim rise most so
 * shadows open up without flattening the key's modelling; everything stays
 * cooler and more even than the ranch's golden hour. Retune them together
 * — they are one exposure.
 */
const RIG = {
  ambient: { color: 0x8290a5, intensity: 1.25 },
  hemi: { sky: 0xdce6f4, ground: 0x4d5870, intensity: 1.8 },
  key: { color: 0xfbfeff, intensity: 3.1 },
  rim: { color: 0xcadcf2, intensity: 1.35 },
} as const

export interface ArenaHandle {
  /** The whole arena set; visibility is driven by setBlend. */
  group: THREE.Group
  /**
   * Cross-fade control, 0 = fully ranch (arena hidden, ranch sky), 1 =
   * fully broadcast (arena shown, arena sky). Drives the arena lights'
   * intensity from zero and swaps the fog color so the horizon changes
   * with the set.
   */
  setBlend(k: number): void
  /** Free the arena set's GPU resources and detach it from the scene. */
  dispose(): void
}

/** Width of the painted boundary line, in world units. */
const BOUNDARY_WIDTH = 0.18

/**
 * A flat rectangular frame whose inner edge is exactly the arena bounds, so
 * the paint and the resolver's fence are the same rectangle. One Shape with
 * a rectangular hole keeps the whole boundary to a single draw call.
 */
function boundaryFrameGeometry(
  halfX: number,
  halfZ: number,
  width: number,
): THREE.ShapeGeometry {
  const outer = new THREE.Shape()
  outer.moveTo(-halfX - width, -halfZ - width)
  outer.lineTo(halfX + width, -halfZ - width)
  outer.lineTo(halfX + width, halfZ + width)
  outer.lineTo(-halfX - width, halfZ + width)
  outer.closePath()
  const hole = new THREE.Path()
  hole.moveTo(-halfX, -halfZ)
  hole.lineTo(halfX, -halfZ)
  hole.lineTo(halfX, halfZ)
  hole.lineTo(-halfX, halfZ)
  hole.closePath()
  outer.holes.push(hole)
  return new THREE.ShapeGeometry(outer)
}

export function buildArena(scene: THREE.Scene): ArenaHandle {
  const group = new THREE.Group()
  group.name = "arena"

  // Show floor: a disc big enough that the boundary ring is the edge you
  // see; beyond it only stands and fog exist.
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(10.4, 64),
    new THREE.MeshLambertMaterial({ color: FLOOR_COLOR }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  group.add(floor)

  // Painted lines: the boundary is the resolver's own fence, drawn from
  // `ARENA_BOUNDS` at the presentation scale, a center circle, and a low
  // wall torus that catches the key light.
  const boundaryRing = new THREE.Mesh(
    boundaryFrameGeometry(ARENA_HALF_X, ARENA_HALF_Z, BOUNDARY_WIDTH),
    new THREE.MeshBasicMaterial({ color: FLOOR_LINE_COLOR }),
  )
  boundaryRing.rotation.x = -Math.PI / 2
  boundaryRing.position.y = 0.02
  group.add(boundaryRing)

  const centerRing = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 1.5, 48),
    new THREE.MeshBasicMaterial({
      color: FLOOR_LINE_COLOR,
      transparent: true,
      opacity: 0.7,
    }),
  )
  centerRing.rotation.x = -Math.PI / 2
  centerRing.position.y = 0.02
  group.add(centerRing)

  const wall = new THREE.Mesh(
    new THREE.TorusGeometry(8.6, 0.14, 10, 64),
    new THREE.MeshLambertMaterial({ color: STAND_COLOR }),
  )
  wall.rotation.x = Math.PI / 2
  wall.position.y = 0.16
  wall.castShadow = true
  group.add(wall)

  // Stands: three stepped rings rising away from the floor. Only their
  // top band is ever on camera above the wall, so simple box wheels keep
  // the silhouette honest without cost.
  const tierDefs = [
    { radius: 10.6, height: 1.0 },
    { radius: 11.5, height: 1.9 },
    { radius: 12.4, height: 2.8 },
  ] as const
  for (const tier of tierDefs) {
    const step = new THREE.Mesh(
      new THREE.CylinderGeometry(
        tier.radius,
        tier.radius,
        tier.height,
        48,
        1,
        true,
      ),
      new THREE.MeshLambertMaterial({
        color: STAND_COLOR,
        emissive: STAND_EMISSIVE,
        side: THREE.DoubleSide,
      }),
    )
    step.position.y = tier.height / 2
    group.add(step)
  }

  // Backdrop: an inside-out slate dome just beyond the stands. It swallows
  // the ranch's sunset dome and any fog seams, so the bowl reads as one lit
  // venue regardless of what the ranch sky is doing outside it.
  const backdrop = new THREE.Mesh(
    new THREE.SphereGeometry(20, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x3b465e, side: THREE.BackSide }),
  )
  group.add(backdrop)

  // Crowd: instanced capsule silhouettes packed on the two upper tiers.
  // Against the brighter stands they read as a dark bowl of heads, no
  // detail needed.
  const tierDefsForCrowd = [tierDefs[1], tierDefs[2]]
  const CROWD_PER_TIER = 44
  const crowdCount = CROWD_PER_TIER * tierDefsForCrowd.length
  const crowd = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.16, 0.34, 2, 6),
    new THREE.MeshBasicMaterial({ color: CROWD_COLOR }),
    crowdCount,
  )
  const crowdRng = makeRng(9107)
  const matrix = new THREE.Matrix4()
  const quat = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  let placed = 0
  for (const tier of tierDefsForCrowd) {
    for (let i = 0; i < CROWD_PER_TIER; i++) {
      const angle = (i / CROWD_PER_TIER) * Math.PI * 2 + crowdRng.next() * 0.05
      const self = new THREE.Vector3(
        Math.sin(angle) * tier.radius,
        // Sit on the step's top lip, scaled crowd slightly uneven.
        tier.height + 0.34,
        Math.cos(angle) * tier.radius,
      )
      const jitter = 0.85 + crowdRng.next() * 0.35
      scale.set(jitter, jitter, jitter)
      matrix.compose(self, quat, scale)
      crowd.setMatrixAt(placed, matrix)
      placed++
    }
  }
  crowd.instanceMatrix.needsUpdate = true
  group.add(crowd)

  // Broadcast lighting rig: lives inside the group so it swaps with the
  // set. Intensities start at zero and ride the cross-fade in setBlend.
  const ambient = new THREE.AmbientLight(RIG.ambient.color, 0)
  const hemi = new THREE.HemisphereLight(RIG.hemi.sky, RIG.hemi.ground, 0)
  const key = new THREE.DirectionalLight(RIG.key.color, 0)
  key.position.set(0, 9.5, 5)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = -9
  key.shadow.camera.right = 9
  key.shadow.camera.top = 9
  key.shadow.camera.bottom = -9
  key.shadow.camera.near = 1
  key.shadow.camera.far = 22
  const rim = new THREE.DirectionalLight(RIG.rim.color, 0)
  rim.position.set(-4, 7, -6)
  group.add(ambient, hemi, key, rim)

  group.visible = false
  scene.add(group)

  // Fog swap: the ranch dissolves into its dusk amber, the arena into the
  // lit slate bowl. Blend lerps the shared fog color so the swap reads as
  // one continuous cross-fade, not a cut.
  const fog = scene.fog instanceof THREE.Fog ? scene.fog : null
  const ranchFog = new THREE.Color(RANCH_SKY)
  const arenaFog = new THREE.Color(ARENA_SKY)

  const handle: ArenaHandle = {
    group,
    setBlend(k) {
      const blend = Math.min(1, Math.max(0, k))
      group.visible = blend > 0.001
      ambient.intensity = RIG.ambient.intensity * blend
      hemi.intensity = RIG.hemi.intensity * blend
      key.intensity = RIG.key.intensity * blend
      rim.intensity = RIG.rim.intensity * blend
      if (fog) {
        fog.color.copy(ranchFog).lerp(arenaFog, blend)
        fog.near = THREE.MathUtils.lerp(16, ARENA_FOG_NEAR, blend)
        fog.far = THREE.MathUtils.lerp(30, ARENA_FOG_FAR, blend)
      }
    },
    dispose() {
      handle.setBlend(0)
      disposeObject3D(group)
      scene.remove(group)
    },
  }

  return handle
}
