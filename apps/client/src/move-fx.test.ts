import { describe, expect, test } from "bun:test"
import { type Element, getMove, getSpecies } from "@apex/sim"
import * as THREE from "three"
import { elementHue } from "./element"
import { buildShotCore, buildTrail } from "./fx/shot-geometry"
import {
  CONTACT_T,
  DEFAULT_FX,
  ELEMENT_COLOR_FALLBACK,
  elementColor,
  fxFor,
  lookFor,
  MOVE_FX,
  PROJECTILE_ARC,
  PROJECTILE_LIFE_MS,
  SHOT_LOOKS,
  type ShotLook,
} from "./move-fx"

/**
 * Pins for the split move-fx surface, the six-element shot identity (FR-5),
 * and the Earth/Wind finisher bodies (FR-6). The barrel is what every
 * consumer imports, so the export-surface pin below compares it against the
 * names the pre-split monolith exported.
 */

const ELEMENTS: readonly Element[] = [
  "fire",
  "water",
  "plant",
  "electric",
  "earth",
  "wind",
]

/** What `apps/client/src/move-fx.ts` exported at the split's base commit. */
const PRE_SPLIT_RUNTIME_EXPORTS = [
  "CONTACT_T",
  "DEFAULT_FX",
  "ELEMENT_COLOR_FALLBACK",
  "elementColor",
  "fxFor",
  "lookFor",
  "MOVE_FX",
  "PROJECTILE_ARC",
  "PROJECTILE_LIFE_MS",
  "SHOT_LOOKS",
]

/** The authored row for an element, or a failure when the table lacks one. */
function look(element: Element): ShotLook {
  const row = SHOT_LOOKS[element]
  if (row === undefined) throw new Error(`no shot look for ${element}`)
  return row
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

/** Every vertex position of a mesh's geometry, flattened. */
function vertexPositions(geometry: THREE.BufferGeometry): number[] {
  return Array.from(geometry.getAttribute("position").array)
}

describe("move-fx barrel", () => {
  test("exports exactly the pre-split runtime surface", async () => {
    const barrel = await import("./move-fx")
    expect(Object.keys(barrel).sort()).toEqual(
      [...PRE_SPLIT_RUNTIME_EXPORTS].sort(),
    )
  })

  test("the shared flight contract is unchanged", () => {
    expect(CONTACT_T).toBe(0.46)
    expect(PROJECTILE_LIFE_MS).toBe(700)
    expect(PROJECTILE_ARC).toBe(0.55)
  })
})

describe("shot looks cover all six elements", () => {
  test("every sim element has its own row", () => {
    for (const element of ELEMENTS) {
      // Identity, not deep equality: a known element must never be handed
      // the fallback object.
      expect(lookFor(element)).toBe(look(element))
    }
  })

  test("the fallback still serves unknown and absent elements", () => {
    expect(lookFor(undefined)).toEqual({
      geometry: "orb",
      arc: 1,
      trail: "orbs",
    })
    expect(lookFor("plasma")).toEqual({
      geometry: "orb",
      arc: 1,
      trail: "orbs",
    })
    expect(lookFor("plasma")).not.toBe(SHOT_LOOKS.electric)
  })

  test("electric is promoted from the fallback with identical values", () => {
    // Zero visual change: the explicit row is byte-for-byte the old fallback.
    expect(SHOT_LOOKS.electric).toEqual({
      geometry: "orb",
      arc: 1,
      trail: "orbs",
    })
    expect(SHOT_LOOKS.electric).toEqual(lookFor(undefined))
  })

  test("earth lobs a non-luminous boulder through a high arc", () => {
    const earth = lookFor("earth")
    expect(earth.geometry).toBe("boulder")
    expect(earth.glow).toBeUndefined()
    expect(earth.trail).toBe("dust")
    expect(earth.arc ?? 1).toBeGreaterThan(1.2)
    expect(earth.spin ?? 0).toBeLessThan(0.01)
  })

  test("wind streaks: stretched, spinning fast, flat arc, faceted tail", () => {
    const wind = lookFor("wind")
    expect(wind.geometry).toBe("teardrop")
    expect(wind.stretch ?? 1).toBeGreaterThan(1.8)
    expect(wind.spin ?? 0).toBeGreaterThan(0.024)
    expect(wind.arc ?? 1).toBeLessThan(0.4)
    expect(wind.trail).toBe("seeds")
    expect(wind.wobble ?? 0).toBeGreaterThan(0)
  })

  test("earth and wind read nothing like each other or the fallback", () => {
    const earth = lookFor("earth")
    const wind = lookFor("wind")
    const fallback = lookFor(undefined)
    for (const look of [earth, wind]) {
      expect(look).not.toEqual(fallback)
      expect(look.geometry).not.toBe(fallback.geometry)
      expect(look.trail).not.toBe(fallback.trail)
    }
    expect(earth.geometry).not.toBe(wind.geometry)
    expect(earth.trail).not.toBe(wind.trail)
    expect(earth.arc).not.toBe(wind.arc)
  })
})

describe("elementColor derives from the element hue contract", () => {
  test("each element's shot color carries its canonical hue", () => {
    for (const element of ELEMENTS) {
      const hsl = { h: 0, s: 0, l: 0 }
      new THREE.Color(elementColor(element)).getHSL(hsl)
      // Round-tripping through linear sRGB costs ~1/1000 in hue, so the
      // match is asserted to two decimals - far tighter than one hue step.
      expect(hsl.h).toBeCloseTo((elementHue(element) % 360) / 360, 2)
      // The HSL round trip goes through linear sRGB, so saturation only
      // holds to the first decimal - the hue is the contract.
      expect(hsl.s).toBeCloseTo(0.75, 1)
    }
  })

  test("an absent element keeps the shared fallback color", () => {
    expect(elementColor(undefined)).toBe(ELEMENT_COLOR_FALLBACK)
  })
})

describe("shot geometry builders", () => {
  const color = new THREE.Color("#c8a06a")

  test("the boulder core is a non-empty, non-luminous mesh", () => {
    const core = buildShotCore(lookFor("earth"), color, 1)
    const meshes = meshesOf(core)
    expect(meshes.length).toBeGreaterThan(0)
    for (const count of vertexCounts(meshes)) expect(count).toBeGreaterThan(0)
    // No additive halo: Earth is the one shot core that does not glow.
    for (const mesh of meshes) {
      const material = mesh.material as THREE.MeshBasicMaterial
      expect(material.blending).not.toBe(THREE.AdditiveBlending)
    }
  })

  test("the dust trail is a non-empty flat-facet family", () => {
    const trail = buildTrail(lookFor("earth"), color, 1)
    expect(trail.length).toBeGreaterThan(0)
    for (const count of vertexCounts(trail)) expect(count).toBeGreaterThan(0)
    // Dust is grit, not light.
    for (const seg of trail) {
      const material = seg.material as THREE.MeshBasicMaterial
      expect(material.blending).toBe(THREE.NormalBlending)
    }
  })

  test("the boulder is built deterministically", () => {
    // Earth's edge case: identical looks build identical meshes. Comparing
    // vertex positions proves no randomness leaked into the builder.
    const a = buildShotCore(lookFor("earth"), color, 1)
    const b = buildShotCore(lookFor("earth"), color, 1)
    const positions = (object: THREE.Object3D): number[] =>
      meshesOf(object).flatMap((mesh) => vertexPositions(mesh.geometry))
    expect(positions(a)).toEqual(positions(b))
    expect(positions(a).length).toBeGreaterThan(0)
  })
})

describe("move table", () => {
  test("every authored move id exists in the sim catalog", () => {
    for (const moveId of Object.keys(MOVE_FX)) {
      expect(getMove(moveId)).toBeDefined()
    }
  })

  test("both heavy finishers are authored in their element's grammar", () => {
    const quake = MOVE_FX.quake_stomp
    expect(quake).toBeDefined()
    expect(getMove("quake_stomp")?.element).toBe("earth")
    expect(quake?.pose.windup.hold).toBe(true)
    expect(quake?.pose.windup.coilX ?? 0).toBeGreaterThan(0.28)
    expect(quake?.arrival.burst.ring).toBe(true)
    expect(quake?.arrival.burst.flash).toBe(false)
    expect(quake?.arrival.burst.gravity ?? 0).toBeGreaterThanOrEqual(10)
    expect(typeof quake?.arrival.burst.tint).toBe("string")
    expect(quake?.arrival.shove ?? 0).toBeLessThanOrEqual(-0.5)

    const cyclone = MOVE_FX.cyclone_dive
    expect(cyclone).toBeDefined()
    expect(getMove("cyclone_dive")?.element).toBe("wind")
    expect(cyclone?.pose.windup.rise ?? 0).toBeGreaterThan(0)
    expect(cyclone?.arrival.lanes).toHaveLength(3)
    expect(cyclone?.arrival.burst.gravity ?? 7).toBeLessThan(4)
    expect(cyclone?.arrival.shove ?? 0).toBeLessThan(0)
    expect(Math.abs(cyclone?.arrival.shove ?? 0)).toBeLessThan(0.5)
  })

  test("the unauthored element signatures stay on the default body", () => {
    expect(fxFor("basalt_guard")).toBe(DEFAULT_FX)
    expect(fxFor("zephyr_veil")).toBe(DEFAULT_FX)
    expect(fxFor("plasma_lance")).toBe(DEFAULT_FX)
    expect(fxFor(undefined)).toBe(DEFAULT_FX)
    // Their element still supplies the look: default body + Earth/Wind shot.
    expect(lookFor(getMove("basalt_guard")?.element)).toBe(look("earth"))
    expect(lookFor(getMove("zephyr_veil")?.element)).toBe(look("wind"))
  })

  test("the new lines' guard signatures ride the default body too", () => {
    // The three roster-expansion lines each bring one guard: a defensive move
    // has no projectile grammar of its own, so it inherits the default body
    // and lets its element supply the shot — the same rule the earth and wind
    // guards follow.
    const guards: ReadonlyArray<[string, Element]> = [
      ["bramble_guard", "plant"],
      ["tide_aegis", "water"],
      ["pyre_wall", "fire"],
    ]
    for (const [guard, element] of guards) {
      expect(fxFor(guard)).toBe(DEFAULT_FX)
      expect(lookFor(getMove(guard)?.element)).toBe(look(element))
    }
  })

  test("each new attack form is authored in its element's grammar", () => {
    // One attack signature per new line: a held windup, a real kick, and an
    // arrival burst — the shared grammar of the existing tier-3 shots.
    const forms: ReadonlyArray<[string, Element]> = [
      ["thorn_charge", "plant"],
      ["riptide_rush", "water"],
      ["cinder_dive", "fire"],
    ]
    for (const [moveId, element] of forms) {
      const fx = fxFor(moveId)
      expect(fx).not.toBe(DEFAULT_FX)
      expect(getMove(moveId)?.element).toBe(element)
      expect(fx.pose.windup.hold).toBe(true)
      expect(fx.pose.windup.coilX ?? 0).toBeGreaterThan(0.2)
      expect(fx.kick).toBeLessThan(-0.5)
      expect(fx.shots).toHaveLength(1)
      expect(fx.arrival.burst.puffs ?? 0).toBeGreaterThan(0)
      expect(fx.arrival.shove ?? 0).toBeLessThanOrEqual(-0.5)
    }
  })

  test("every row of a new kit resolves to an element-true shot", () => {
    // The mapping rule for the roster-expansion lines: a kit row either has
    // its own authored body or inherits the default one, and either way the
    // shot that flies is the line's element look — never another element's.
    const lines = [
      "fernstag",
      "reefclaw",
      "cindermoor",
      "voltfox",
      "galeheron",
      "shalemole",
    ] as const
    for (const speciesId of lines) {
      const species = getSpecies(speciesId)
      if (!species) throw new Error(`missing species ${speciesId}`)
      const element = species.element
      for (const moveId of species.kit) {
        const move = getMove(moveId)
        if (!move) throw new Error(`missing move ${moveId}`)
        expect(move.element).toBe(element)
        expect(lookFor(move.element)).toBe(look(element))
        expect(fxFor(moveId)).toBeDefined()
      }
    }
  })
})

/** Compile-time proof that the split kept the exported types importable. */
const TYPE_SURFACE: ShotLook = lookFor("earth")
void TYPE_SURFACE
