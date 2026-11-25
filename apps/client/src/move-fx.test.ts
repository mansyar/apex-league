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
import { ELEMENT_FALLBACK_FX } from "./move-fx/moves/fallback"

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

/**
 * The 48 bespoke special ids, grouped by element. This is the no-regression
 * set for the authored Strike: adding the innate row must not change how a
 * single catalog special or an unknown id resolves.
 */
const SPECIAL_IDS: Readonly<Record<Element, readonly string[]>> = {
  fire: [
    "spark",
    "flame_charge",
    "cinder_shot",
    "blaze_bolt",
    "flare_dart",
    "pyre_lance",
    "cinder_dive",
    "pyre_wall",
  ],
  water: [
    "bubble",
    "tide_shot",
    "foam_volley",
    "splash_bolt",
    "mist_spray",
    "maelstrom",
    "riptide_rush",
    "tide_aegis",
  ],
  plant: [
    "seed_shot",
    "thorn_volley",
    "spore_burst",
    "bramble_dart",
    "vine_lash",
    "root_quake",
    "thorn_charge",
    "bramble_guard",
  ],
  electric: [
    "static_jolt",
    "volt_dash",
    "arc_shot",
    "storm_bolt",
    "ion_dart",
    "gigavolt",
    "storm_surge",
    "ion_wall",
  ],
  earth: [
    "pebble_shot",
    "dust_devil",
    "clay_burst",
    "boulder_toss",
    "sand_blast",
    "tectonic_slam",
    "quake_stomp",
    "basalt_guard",
  ],
  wind: [
    "gust",
    "feather_dart",
    "gale_cutter",
    "sky_bolt",
    "talon_slash",
    "hurricane_spiral",
    "cyclone_dive",
    "zephyr_veil",
  ],
}

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
    expect(wind.geometry).toBe("streak")
    expect(wind.stretch ?? 1).toBeGreaterThan(1.8)
    expect(wind.spin ?? 0).toBeGreaterThan(0.024)
    expect(wind.arc ?? 1).toBeLessThan(0.4)
    expect(wind.trail).toBe("streaks")
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

  test("wind builders share no geometry with water or plant (FR-4)", () => {
    // The streak core is a single stretched octahedron: not water's
    // smooth sphere, and a single needle rather than plant's 3-seed
    // cluster. The streak-sliver trail matches neither plant's seeds
    // nor water's droplets vertex-for-vertex.
    const windCore = meshesOf(buildShotCore(lookFor("wind"), color, 1))
    const windMesh = windCore[0]
    if (windMesh === undefined)
      throw new Error("the wind streak built no meshes")
    expect(windCore.length).toBe(1)
    expect(windMesh.geometry.type).toBe("OctahedronGeometry")
    for (const mesh of meshesOf(buildShotCore(lookFor("water"), color, 1))) {
      expect(mesh.geometry.type).not.toBe(windMesh.geometry.type)
    }
    const windTrail = buildTrail(lookFor("wind"), color, 1)
    expect(windTrail.length).toBeGreaterThan(0)
    const plantTrail = buildTrail(lookFor("plant"), color, 1)
    const firstWind = windTrail[0]
    if (firstWind === undefined)
      throw new Error("the wind trail built no segments")
    const firstPlant = plantTrail[0]
    if (firstPlant === undefined)
      throw new Error("the plant trail built no segments")
    expect(vertexPositions(firstWind.geometry)).not.toEqual(
      vertexPositions(firstPlant.geometry),
    )
    // Slivers are light, not grit: the trail stays additive.
    for (const seg of windTrail) {
      const material = seg.material as THREE.MeshBasicMaterial
      expect(material.blending).toBe(THREE.AdditiveBlending)
    }
  })

  test("the streak is built deterministically", () => {
    // Wind's edge case, mirroring the boulder's: identical looks build
    // identical meshes, so no randomness leaked into the new builder.
    const a = buildShotCore(lookFor("wind"), color, 1)
    const b = buildShotCore(lookFor("wind"), color, 1)
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

  test("Strike is authored in the table, distinct from the shared default", () => {
    const strike = MOVE_FX.basic
    expect(strike).toBeDefined()
    if (strike === undefined) throw new Error("Strike has no authored row")
    expect(fxFor("basic", undefined)).toBe(strike)
    expect(strike).not.toBe(DEFAULT_FX)
    expect(getMove("basic")?.melee).toBe(true)
  })

  test("authored Strike is additive: every special and fallback keeps its baseline row", () => {
    // Red until P1.T2 registers BASIC_FX: the innate move must be present
    // before the boundary below can prove nothing else moved with it.
    const strike = MOVE_FX.basic
    expect(strike).toBeDefined()
    if (strike === undefined) throw new Error("Strike has no authored row")

    const pairs = ELEMENTS.flatMap((element) =>
      SPECIAL_IDS[element].map((id) => [id, element] as const),
    )
    expect(pairs).toHaveLength(48)
    for (const [moveId, element] of pairs) {
      expect(getMove(moveId)).toBeDefined()
      const row = MOVE_FX[moveId]
      if (row === undefined) throw new Error(`missing baseline row: ${moveId}`)
      // Identity, not a copy: the row object is the one that shipped before.
      expect(row).not.toBe(strike)
      expect(fxFor(moveId, element)).toBe(row)
      expect(fxFor(moveId)).toBe(row)
      expect(fxFor(moveId, element)).not.toBe(DEFAULT_FX)
    }

    // Unknown ids of known elements still take their element's body; unknown
    // ids of unknown elements and absent lookups still take DEFAULT_FX.
    for (const element of ELEMENTS) {
      const body = ELEMENT_FALLBACK_FX[element]
      if (body === undefined) throw new Error(`missing fallback: ${element}`)
      expect(fxFor("__unknown_move__", element)).toBe(body)
      expect(fxFor("__unknown_move__", element)).not.toBe(DEFAULT_FX)
    }
    expect(fxFor("__unknown_move__", "plasma")).toBe(DEFAULT_FX)
    expect(fxFor("__unknown_move__", undefined)).toBe(DEFAULT_FX)
    expect(fxFor(undefined)).toBe(DEFAULT_FX)
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
    // All six guards went bespoke in Phases 2-7 (zephyr_veil closed the
    // set in Phase 7): only unknown ids and element-less lookups hit
    // DEFAULT_FX now — see the AC-3 wind pins.
    expect(fxFor("plasma_lance")).toBe(DEFAULT_FX)
    expect(fxFor(undefined)).toBe(DEFAULT_FX)
    // Wind still supplies the look for its catalog moves.
    expect(lookFor(getMove("zephyr_veil")?.element)).toBe(look("wind"))
  })

  test("each new attack form is authored in its element's grammar", () => {
    // One attack signature per new line: a held windup, a real kick, and an
    // arrival burst — the shared grammar of the existing tier-3 shots.
    // cinder_dive went zero-shot body-first in Phase 5 (FR-7), so it no
    // longer carries the one-shot form — see the trio pins.
    const forms: ReadonlyArray<[string, Element]> = [
      ["thorn_charge", "plant"],
      ["riptide_rush", "water"],
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
      "embercub",
      "mossboar",
      "mistkit",
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
