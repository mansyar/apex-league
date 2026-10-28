import { describe, expect, test } from "bun:test"
import * as THREE from "three"
import { buildGather, buildShotCore, GATHER_MOTES } from "../fx/shot-geometry"
import { lookFor, MOVE_SHOT_LOOK, SHOT_LOOKS, type ShotLook } from "./looks"

/**
 * Phase 1 pins for the fire-identity foundation (FR-1): the per-row look
 * override fallthrough, the four new geometry pieces plus the gather
 * effect, and their determinism / vertex-level distinctness guarantees.
 * No fire row opts into an override yet — rows land in Phases 2-5.
 */

const FIRE_ROWS = [
  "spark",
  "flame_charge",
  "cinder_shot",
  "blaze_bolt",
  "flare_dart",
  "pyre_lance",
  "cinder_dive",
  "pyre_wall",
] as const

/** A minimal look naming a core family (trail rides along, unused here). */
function look(geometry: ShotLook["geometry"]): ShotLook {
  return { geometry, arc: 1, trail: "embers" }
}

/** Every mesh under an object, so a core group is inspectable. */
function meshesOf(object: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) meshes.push(child)
  })
  return meshes
}

/** A vertex count per mesh: 0 means the builder produced empty geometry. */
function vertexCounts(objects: readonly THREE.Mesh[]): number[] {
  return objects.map((mesh) => {
    const position = mesh.geometry.getAttribute("position")
    return position === undefined ? 0 : position.count
  })
}

/** Every vertex position of a core plus each mesh's placement, flattened. */
function allPositions(object: THREE.Object3D): number[] {
  return meshesOf(object).flatMap((mesh) => [
    ...Array.from(mesh.geometry.getAttribute("position").array),
    mesh.position.x,
    mesh.position.y,
    mesh.position.z,
  ])
}

describe("per-row look override (FR-1)", () => {
  test("rows without an override keep the element default", () => {
    const fire = SHOT_LOOKS.fire
    if (fire === undefined) throw new Error("missing fire look")
    expect(lookFor("fire")).toBe(fire)
    for (const moveId of FIRE_ROWS) {
      // Same object, not a copy: no row opts in this phase.
      expect(lookFor("fire", moveId)).toBe(fire)
    }
    // Unknown rows and unknown elements fall through the same way.
    expect(lookFor("fire", "plasma_lance")).toBe(fire)
    expect(lookFor("fire", undefined)).toBe(fire)
    expect(lookFor(undefined, "spark")).toEqual({
      geometry: "orb",
      arc: 1,
      trail: "orbs",
    })
    expect(lookFor("shadow", "spark")).toEqual({
      geometry: "orb",
      arc: 1,
      trail: "orbs",
    })
  })

  test("a row override wins over the element default", () => {
    const probe = "__phase1_probe__"
    MOVE_SHOT_LOOK[probe] = { geometry: "needle", trail: "streaks" }
    try {
      const fire = SHOT_LOOKS.fire
      if (fire === undefined) throw new Error("missing fire look")
      const resolved = lookFor("fire", probe)
      expect(resolved.geometry).toBe("needle")
      expect(resolved.trail).toBe("streaks")
      // Every other field rides the element row.
      expect(resolved).toEqual({
        ...fire,
        geometry: "needle",
        trail: "streaks",
      })
      // The element default itself is untouched.
      expect(lookFor("fire")).toBe(fire)
    } finally {
      delete MOVE_SHOT_LOOK[probe]
    }
  })

  test("a partial override inherits the fields it does not name", () => {
    const probe = "__phase1_partial_probe__"
    MOVE_SHOT_LOOK[probe] = { geometry: "chunk" }
    try {
      const resolved = lookFor("fire", probe)
      expect(resolved.geometry).toBe("chunk")
      expect(resolved.trail).toBe("embers")
    } finally {
      delete MOVE_SHOT_LOOK[probe]
    }
  })
})

describe("new geometry pieces (FR-1)", () => {
  const color = new THREE.Color("#e8641b")

  test("fork is a 3-segment zigzag arc", () => {
    const fork = buildShotCore(look("fork"), color, 1)
    const meshes = meshesOf(fork)
    expect(meshes.length).toBe(3)
    for (const mesh of meshes) {
      expect(mesh.geometry.type).toBe("BoxGeometry")
    }
    for (const count of vertexCounts(meshes)) {
      expect(count).toBeGreaterThan(0)
    }
    const xs = meshes.map((mesh) => mesh.position.x)
    const zs = meshes.map((mesh) => mesh.position.z)
    // Lateral zigzag across the lane, spanning downrange.
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.1)
    expect(Math.min(...zs)).toBeLessThan(0)
    expect(Math.max(...zs)).toBeGreaterThan(0)
  })

  test("chunk is a faceted mass with glowing cracks", () => {
    const chunk = buildShotCore(look("chunk"), color, 1)
    const meshes = meshesOf(chunk)
    expect(meshes.length).toBe(4)
    const rock = meshes[0]
    if (rock === undefined) throw new Error("chunk built no rock")
    expect(rock.geometry.type).toBe("IcosahedronGeometry")
    // Detail 1: finer facets than the ember shard (detail 0, 60 vertices).
    expect(rock.geometry.getAttribute("position").count).toBeGreaterThan(60)
    for (const crack of meshes.slice(1)) {
      expect(crack.geometry.type).toBe("BoxGeometry")
      const material = crack.material as THREE.MeshBasicMaterial
      expect(material.blending).toBe(THREE.AdditiveBlending)
    }
  })

  test("needle is a single stretched cone with no halo", () => {
    const needle = buildShotCore(look("needle"), color, 1)
    const meshes = meshesOf(needle)
    expect(meshes.length).toBe(1)
    const dart = meshes[0]
    if (dart === undefined) throw new Error("needle built no dart")
    expect(dart.geometry.type).toBe("ConeGeometry")
    // Long and thin: the cone's height dwarfs its width.
    dart.geometry.computeBoundingBox()
    const box = dart.geometry.boundingBox
    if (box === null) throw new Error("needle has no bounds")
    const extent = new THREE.Vector3()
    box.getSize(extent)
    expect(extent.y).toBeGreaterThan(extent.x * 2)
    // Opaque: a sharp pierce, not a blooming glow.
    const material = dart.material as THREE.MeshBasicMaterial
    expect(material.transparent).toBe(false)
  })

  test("jet is a vertical tapered pillar around a brighter core", () => {
    const jet = buildShotCore(look("jet"), color, 1)
    const meshes = meshesOf(jet)
    expect(meshes.length).toBe(2)
    for (const mesh of meshes) {
      expect(mesh.geometry.type).toBe("CylinderGeometry")
      const material = mesh.material as THREE.MeshBasicMaterial
      expect(material.blending).toBe(THREE.AdditiveBlending)
    }
    const outer = meshes[0]
    if (outer === undefined) throw new Error("jet built no pillar")
    const params = (outer.geometry as THREE.CylinderGeometry).parameters as {
      radiusTop: number
      radiusBottom: number
    }
    expect(params.radiusTop).toBeLessThan(params.radiusBottom)
    // Standing up (+y), not lying along travel.
    outer.geometry.computeBoundingBox()
    const box = outer.geometry.boundingBox
    if (box === null) throw new Error("jet has no bounds")
    const extent = new THREE.Vector3()
    box.getSize(extent)
    expect(extent.y).toBeGreaterThan(extent.x * 2)
  })

  test("gather is an orb ringed by seeded motes", () => {
    const gather = buildGather(color, 1)
    const meshes = meshesOf(gather)
    expect(meshes.length).toBe(1 + GATHER_MOTES)
    const orb = meshes[0]
    if (orb === undefined) throw new Error("gather built no orb")
    expect(orb.geometry.type).toBe("SphereGeometry")
    for (const mote of meshes.slice(1)) {
      expect(mote.geometry.type).toBe("OctahedronGeometry")
      // Motes ring the orb on a shell, never at its center.
      expect(mote.position.length()).toBeGreaterThan(0.5)
    }
  })
})

describe("piece determinism", () => {
  const color = new THREE.Color("#e8641b")

  for (const geometry of ["fork", "chunk", "needle", "jet"] as const) {
    test(`${geometry} builds identically under a fixed size`, () => {
      const a = allPositions(buildShotCore(look(geometry), color, 1))
      const b = allPositions(buildShotCore(look(geometry), color, 1))
      expect(a.length).toBeGreaterThan(0)
      expect(a).toEqual(b)
    })
  }

  test("gather builds identically under a fixed seed", () => {
    const a = allPositions(buildGather(color, 1, 7))
    const b = allPositions(buildGather(color, 1, 7))
    expect(a.length).toBeGreaterThan(0)
    expect(a).toEqual(b)
  })

  test("gather answers its seed", () => {
    const a = allPositions(buildGather(color, 1, 7))
    const other = allPositions(buildGather(color, 1, 8))
    expect(a).not.toEqual(other)
  })
})

describe("piece distinctness", () => {
  const color = new THREE.Color("#e8641b")

  test("new geometries share no vertices with each other, streak, or teardrop", () => {
    const pieces: Array<[string, THREE.Object3D]> = [
      ["fork", buildShotCore(look("fork"), color, 1)],
      ["chunk", buildShotCore(look("chunk"), color, 1)],
      ["needle", buildShotCore(look("needle"), color, 1)],
      ["jet", buildShotCore(look("jet"), color, 1)],
      ["streak", buildShotCore(lookFor("wind"), color, 1)],
      [
        "teardrop",
        buildShotCore(
          { geometry: "teardrop", arc: 1, trail: "droplets" },
          color,
          1,
        ),
      ],
      ["ember", buildShotCore(lookFor("fire"), color, 1)],
    ]
    const layouts = pieces.map(([name, object]) => {
      const positions = allPositions(object)
      expect(positions.length).toBeGreaterThan(0)
      return { name, positions }
    })
    for (let i = 0; i < layouts.length; i++) {
      for (let j = i + 1; j < layouts.length; j++) {
        const a = layouts[i]
        const b = layouts[j]
        if (a === undefined || b === undefined) continue
        expect(a.positions).not.toEqual(b.positions)
      }
    }
  })

  test("fire's new cores use no wind or water topology", () => {
    const typesOf = (geometry: ShotLook["geometry"]): string[] =>
      meshesOf(buildShotCore(look(geometry), color, 1)).map(
        (mesh) => mesh.geometry.type,
      )
    const windTypes = typesOf("streak")
    const waterTypes = typesOf("teardrop")
    for (const geometry of ["fork", "needle", "jet"] as const) {
      const types = typesOf(geometry)
      for (const type of windTypes) expect(types.includes(type)).toBe(false)
      for (const type of waterTypes) expect(types.includes(type)).toBe(false)
    }
    // Chunk shares the icosahedron family with ember (never wind or water),
    // but at detail 1 its facets match nothing in the shared set.
    const chunkRock = meshesOf(buildShotCore(look("chunk"), color, 1))[0]
    if (chunkRock === undefined) throw new Error("chunk built no rock")
    expect(windTypes.includes(chunkRock.geometry.type)).toBe(false)
    expect(waterTypes.includes(chunkRock.geometry.type)).toBe(false)
  })
})
