import type { CreatureBuild } from "./build"
import { makeRng } from "./rng"
import {
  type Sdf,
  sdBox,
  sdCapsule,
  sdSphere,
  union,
  type Vec3,
  vec3,
} from "./sdf"

/**
 * Ranch prop registry: static scenery pieces for the golden-hour ranch.
 * Contrary to creature archetypes, props have no rig — pivots and parents
 * are always empty, and each prop carries at most two painted fields.
 * Every prop is authored in its own small voxel grid (y up, ground at y=0,
 * x/z centered through an `at` helper), so the client can mesh them with
 * the same voxelize/meshGrid pipeline as creatures.
 *
 * Variation comes from a seeded `PropDna`: a hue-variant index (vegetation
 * only — stone and food keep a fixed hue) and a small scale jitter that
 * keeps the silhouette recognizable, so a seed never turns a prop into a
 * different prop.
 */
export interface PropDna {
  /** Index into the prop's hue-variant list; 0 when the list is empty. */
  hueVariant: number
  /** Uniform scale in [0.88, 1.12). */
  scale: number
}

export interface PropDef {
  id: string
  grid: number
  /**
   * Vegetation hue alternatives in degrees. Empty for props whose color
   * never varies (rock, food pile).
   */
  variants: readonly number[]
  build: (dna: PropDna) => PropBuild
}

/** Same shape as a creature build minus the rig — pivots/parents stay empty. */
export interface PropBuild extends CreatureBuild {}

export const props: Record<string, PropDef> = {
  tuft: propTuft(),
  bush: propBush(),
  broadleafTree: propBroadleafTree(),
  rock: propRock(),
  foodPile: propFoodPile(),
}

export interface PropGenerated {
  dna: PropDna
  build: PropBuild
  def: PropDef
}

/** Sample prop DNA at `seed` and assemble its SDF parts. */
export function generateProp(propId: string, seed: number): PropGenerated {
  const def = props[propId]
  if (!def) {
    throw new Error(
      `unknown prop "${propId}" - known: ${Object.keys(props).join(", ")}`,
    )
  }
  const rng = makeRng(seed * 31 + 7)
  const hueVariant = def.variants.length > 0 ? rng.int(def.variants.length) : 0
  const scale = 0.88 + rng.next() * 0.24
  const dna: PropDna = { hueVariant, scale }
  return { dna, build: def.build(dna), def }
}

/** hue in degrees [0, 360), s/l in [0, 1]. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const seg = Math.floor(hp)
  const rgb: [number, number, number] =
    seg === 0
      ? [c, x, 0]
      : seg === 1
        ? [x, c, 0]
        : seg === 2
          ? [0, c, x]
          : seg === 3
            ? [0, x, c]
            : seg === 4
              ? [x, 0, c]
              : [c, 0, x]
  const m = l - c / 2
  return [
    Math.min(1, Math.max(0, rgb[0] + m)),
    Math.min(1, Math.max(0, rgb[1] + m)),
    Math.min(1, Math.max(0, rgb[2] + m)),
  ]
}

function buildProp(
  fields: Array<[name: string, sdf: Sdf]>,
  colors: Record<string, [number, number, number]>,
): PropBuild {
  return {
    fields: fields.map(([name, sdf]) => ({ name, sdf })),
    pivots: {},
    colors,
    parents: {},
  }
}

// -- tuft --------------------------------------------------------------------
// A hand of 3 thin grass blades leaning outward from one rooted base.

function propTuft(): PropDef {
  const grid = 16
  const O = grid / 2
  const at = (x: number, y: number, z: number): Vec3 => vec3(x + O, y, z + O)
  return {
    id: "tuft",
    grid,
    variants: [104, 118, 94],
    build: ({ hueVariant, scale }) => {
      const s = scale
      const blades: Sdf = union(
        sdCapsule(at(0, 0.4, 0), at(0.9 * s, 4.4 * s, 0.7 * s), 0.75),
        union(
          sdCapsule(at(-0.4, 0.4, 0.3), at(-2.1 * s, 3.8 * s, -0.9 * s), 0.7),
          sdCapsule(at(0.2, 0.4, -0.5), at(0.3, 3.4 * s, -2.3 * s), 0.7),
        ),
      )
      return buildProp([["blades", blades]], {
        blades: hslToRgb(104 + hueVariant * 7, 0.55, 0.42),
      })
    },
  }
}

// -- bush --------------------------------------------------------------------
// A rounded shrub: one fat center sphere with two nestled shoulders.

function propBush(): PropDef {
  const grid = 20
  const O = grid / 2
  const at = (x: number, y: number, z: number): Vec3 => vec3(x + O, y, z + O)
  return {
    id: "bush",
    grid,
    variants: [128, 110, 140],
    build: ({ hueVariant, scale }) => {
      const s = scale
      const leaves: Sdf = union(
        sdSphere(at(0, 3.4 * s, 0), 4.1 * s),
        union(
          sdSphere(at(2.2 * s, 2.4 * s, 1.5 * s), 2.9 * s),
          sdSphere(at(-2 * s, 2.7 * s, -1.2 * s), 2.9 * s),
        ),
      )
      return buildProp([["leaves", leaves]], {
        leaves: hslToRgb(110 + hueVariant * 8, 0.5, 0.3),
      })
    },
  }
}

// -- broadleaf tree ----------------------------------------------------------
// Landmark tree: a single trunk claims the ground line, a blob-canopy of
// 4 spheres carries the foliage well above the creature's head line.

function propBroadleafTree(): PropDef {
  const grid = 48
  const O = grid / 2
  const at = (x: number, y: number, z: number): Vec3 => vec3(x + O, y, z + O)
  return {
    id: "broadleafTree",
    grid,
    variants: [112, 98, 124],
    build: ({ hueVariant, scale }) => {
      const s = scale
      const trunk: Sdf = sdCapsule(at(0, 0, 0), at(0.4 * s, 13.5 * s, 0.3), 1.6)
      const canopy: Sdf = union(
        sdSphere(at(0.3, 15 * s, 0.5), 6.4 * s),
        union(
          sdSphere(at(-2.6 * s, 12.9 * s, -0.9), 4.6 * s),
          union(
            sdSphere(at(2.7 * s, 13.1 * s, 1.2), 4.6 * s),
            sdSphere(at(0.6, 18 * s, 0), 4.2 * s),
          ),
        ),
      )
      return buildProp(
        [
          ["trunk", trunk],
          ["canopy", canopy],
        ],
        {
          trunk: hslToRgb(28, 0.45, 0.3),
          canopy: hslToRgb(98 + hueVariant * 9, 0.5, 0.36),
        },
      )
    },
  }
}

// -- rock --------------------------------------------------------------------
// Grey field stone: a softened box with two boulder lumps for irregularity.

function propRock(): PropDef {
  const grid = 20
  const O = grid / 2
  const at = (x: number, y: number, z: number): Vec3 => vec3(x + O, y, z + O)
  return {
    id: "rock",
    grid,
    variants: [],
    build: ({ scale }) => {
      const s = scale
      const stone: Sdf = union(
        sdBox(at(0, 1.9 * s, 0), vec3(3.1 * s, 2.1 * s, 3.4 * s)),
        union(
          sdSphere(at(1.4 * s, 1.1, -0.9), 2.1 * s),
          sdSphere(at(-1.5 * s, 1, 1.1), 1.8 * s),
        ),
      )
      return buildProp([["stone", stone]], {
        stone: hslToRgb(30, 0.1, 0.42),
      })
    },
  }
}

// -- food pile ---------------------------------------------------------------
// The nightly feed: a grain mound with three berry bits on top. Presence in
// the scene is driven by the sim's fedToday flag, never by its seed.
// Bits sit on the mound's upper flank on purpose: voxelize is
// first-paint-wins, so berries buried inside the mound get devoured
// silently and the part ends up with zero voxels.

function propFoodPile(): PropDef {
  const grid = 20
  const O = grid / 2
  const at = (x: number, y: number, z: number): Vec3 => vec3(x + O, y, z + O)
  return {
    id: "foodPile",
    grid,
    variants: [],
    build: ({ scale }) => {
      const s = scale
      const mound: Sdf = union(
        sdSphere(at(0, 1.6 * s, 0), 3.2 * s),
        union(
          sdSphere(at(1.6 * s, 1, 1), 2.2 * s),
          sdSphere(at(-1.4 * s, 1.1, -0.8), 2 * s),
        ),
      )
      const bits: Sdf = union(
        sdSphere(at(2.3 * s, 3.5 * s, 0.9 * s), 1.3),
        union(
          sdSphere(at(-1.9 * s, 3.3 * s, 1.6 * s), 1.3),
          sdSphere(at(0.4 * s, 3.6 * s, -2.2 * s), 1.3),
        ),
      )
      return buildProp(
        [
          ["mound", mound],
          ["bits", bits],
        ],
        {
          mound: hslToRgb(44, 0.5, 0.55),
          bits: hslToRgb(2, 0.65, 0.45),
        },
      )
    },
  }
}
