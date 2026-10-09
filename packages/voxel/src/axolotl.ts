import type { CreatureBuild } from "./build"
import { makeRng } from "./rng"
// Re-export the archetype-agnostic sampler under the archetype name so
// callers (tests, gallery) can stay archetype-typed.
import type { Dna, Template } from "./schema"
import {
  type Sdf,
  sdBox,
  sdCapsule,
  sdSphere,
  smoothUnion,
  union,
  type Vec3,
  vec3,
} from "./sdf"
import type { PartField } from "./voxelizer"

export { sampleDna as sampleAxolotlDna } from "./sample"

// Axolotl archetype: the Water starter's body plan. Authored in voxel units
// on a 56^3 grid (y up, +z forward). Long low slinky body, wide flat head,
// external gill fronds, a fin ridge down the back and a finned paddle tail —
// nothing like the drake's arch or the ox's mass. The template owns the body
// plan and bounds; DNA only jitters within them, so every seed is guaranteed
// to still read as an axolotl.

export const AXOLOTL_GRID = 56

export const axolotlTemplate: Template = {
  id: "axolotl",
  version: 1,
  proportions: {
    bodyLength: { min: 0.85, max: 1.25 },
    bodyGirth: { min: 0.8, max: 1.2 },
    headWidth: { min: 0.85, max: 1.25 },
    gillLength: { min: 0.8, max: 1.4 },
    finHeight: { min: 0.7, max: 1.35 },
    tailLength: { min: 0.8, max: 1.3 },
    legLength: { min: 0.7, max: 1.25 },
  },
  styles: {
    gills: [
      { id: "sprightly", params: { fan: { min: 0.2, max: 1 } } },
      { id: "drooping", params: {} },
      { id: "crown", params: {} },
    ],
    dorsalFin: [
      { id: "low", params: {} },
      { id: "ridged", params: { ridge: { min: 0.2, max: 1 } } },
      { id: "sail", params: {} },
    ],
    whiskers: [
      { id: "barbels", params: {} },
      { id: "long", params: { sweep: { min: 0.2, max: 1 } } },
      { id: "none", params: {} },
    ],
  },
  palette: { hue: 205, valueJitter: { min: 0.45, max: 0.62 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface AxolotlBuild extends CreatureBuild {}

const O = AXOLOTL_GRID / 2

/** Local creature coords -> grid coords (x/z centered, y from ground). */
function at(x: number, y: number, z: number): Vec3 {
  return vec3(x + O, y, z + O)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
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

export function buildAxolotl(dna: Dna): AxolotlBuild {
  const p = dna.proportions
  const bl = p.bodyLength ?? 1
  const bg = p.bodyGirth ?? 1
  const hw = p.headWidth ?? 1
  const gl = p.gillLength ?? 1
  const fh = p.finHeight ?? 1
  const tl = p.tailLength ?? 1
  const ll = p.legLength ?? 1

  // -- Key skeleton points -------------------------------------------------
  // A long, low, near-horizontal tube: the drake arches, the ox bulges, the
  // axolotl slinks. Belly hangs close to the ground; legs are afterthoughts.
  const chestA = at(0, 10.5, 5.5 * bl)
  const chestB = at(0, 10.5, 0.5 * bl)
  const rearA = at(0, 11, 0.5 * bl)
  const rearB = at(0, 11.5, -6.5 * bl)

  // Tail: droops off the rump and thins to a point — the fin membranes
  // (tailFin) supply the paddle silhouette around it.
  const tailBase = at(0, 11, -5.5 * bl)
  const tailMid = at(0, 9.5, -5.5 * bl - 5 * tl)
  const tailEnd = at(0, 8.5, -5.5 * bl - 9.5 * tl)

  const hipY = 9.5
  const footY = 1.3 + 1.6 * ll
  const legFrontZ = 4.5 + (ll - 1) * 2
  const legBackZ = -4.5 - (ll - 1) * 2

  // Almost no neck: a short thick connector so the wide head sits right on
  // the shoulders — the neckless look is part of the axolotl read.
  const neckA = at(0, 11, 5.8 * bl)
  const neckB = at(0, 11.5, 7.2 * bl)

  // Wide flat head: a broad low skull slab plus an even broader snout, with
  // the corners left visible so the gill fronds have somewhere to anchor.
  const headC = at(0, 12, 7.2 * bl + 2.8 * hw)
  const skullHalf = vec3(4.8 * hw, 2.2 * hw, 3 * hw)
  // NB: headC is in grid coords; never pass grid coords back through at().
  const snoutC = vec3(O, 11.5, headC.z + 2.6 * hw)
  const snoutHalf = vec3(4 * hw, 1.6 * hw, 2.4 * hw)

  const gillStyle = dna.styles.gills ?? "sprightly"
  const fan = dna.styleParams.fan ?? 0.6
  const finStyle = dna.styles.dorsalFin ?? "low"
  const ridge = dna.styleParams.ridge ?? 0.6
  const whiskerStyle = dna.styles.whiskers ?? "barbels"
  const sweep = dna.styleParams.sweep ?? 0.6

  // Gill fronds sprout from the back corners of the skull. Voxel claiming is
  // first-come-first-served, so each stalk gets a strong horizontal
  // out-thrust that always clears the skull surface — the fronds stay
  // frond-colored wherever they protrude. Three staggered capsules per side
  // keep them feathery instead of reading as horns.
  const gillBaseY = headC.y + 1.6 * hw
  function gillFronds(side: number): { sdf: Sdf; base: Vec3 } {
    const base = vec3(headC.x + side * 4.4 * hw, gillBaseY, headC.z - 1.4 * hw)
    const fronds: Sdf[] = []
    for (const [dy, dz, r] of [
      [2.4, -0.6, 1.0],
      [1.1, -1.9, 0.9],
      [-0.6, -2.8, 0.8],
    ] as const) {
      const lift = gillStyle === "drooping" ? -Math.abs(dy) * gl * 0.9 : dy * gl
      fronds.push(
        sdCapsule(
          base,
          vec3(
            base.x + side * (1.8 + 1.8 * fan) * gl,
            gillBaseY + lift,
            base.z + dz * gl,
          ),
          r,
        ),
      )
    }
    return { sdf: fronds.reduce((acc, s) => union(acc, s)), base }
  }
  const gillL = gillFronds(-1)
  const gillR = gillFronds(1)

  // -- Part fields (paint order: earlier parts claim overlapping voxels; put
  // bulk volumes first and outer details after) -----------------------------
  const fields: PartField[] = []

  // Neck paints FIRST: it is a short thick capsule buried inside the chest
  // silhouette (axolotls are neckless), so the body and head claim its
  // surface anyway. Painting first guarantees the part is never empty while
  // staying visually seamless — neck and body share the main color.
  fields.push({ name: "neck", sdf: sdCapsule(neckA, neckB, 3.4 * bg) })

  // Long low body — two blended capsules, chest slightly plumper than rump.
  const bodyField: Sdf = smoothUnion(
    sdCapsule(chestA, chestB, 4.7 * bg),
    sdCapsule(rearA, rearB, 4.2 * bg),
    3,
  )
  fields.push({ name: "body", sdf: bodyField })

  fields.push({
    name: "tail",
    sdf: union(
      sdCapsule(tailBase, tailMid, 2.8 * bg),
      sdCapsule(tailMid, tailEnd, 1.4),
    ),
  })

  // Fin tail: a thin vertical membrane wrapping the tail's back half — the
  // paddle silhouette. Painted AFTER the tail so the tail core stays
  // main-colored and the membrane shows as its protruding edges.
  // tailBase/tailEnd are grid coords; center the plate between them directly.
  const tailFinField: Sdf = sdBox(
    vec3(O, 9.8, (tailBase.z + tailEnd.z) / 2),
    vec3(0.7, 3.2 * fh, Math.abs(tailBase.z - tailEnd.z) / 2),
  )
  fields.push({ name: "tailFin", sdf: tailFinField })

  // Dorsal fin: a thin ridge plate along the spine. Its base sits well inside
  // the body and its top always clears the tallest possible back line
  // (clearY), so every style protrudes for every seed.
  const finBaseY = 12
  const clearY = 17.2
  const extra =
    finStyle === "sail"
      ? 3.2 * fh
      : finStyle === "ridged"
        ? 1.2 * fh * ridge
        : 0.6 * fh
  const finTopY = clearY + extra
  const finPieces: Sdf[] =
    finStyle === "ridged"
      ? [3.2, 0.6, -2, -4.6].map((z, i) => {
          const top =
            i % 2 === 0 ? finTopY : finBaseY + 0.82 * (finTopY - finBaseY)
          return sdBox(
            at(0, (finBaseY + top) / 2, z * bl),
            vec3(0.7, (top - finBaseY) / 2, 1.6),
          )
        })
      : [
          sdBox(
            at(0, (finBaseY + finTopY) / 2, -0.5 * bl),
            vec3(0.7, (finTopY - finBaseY) / 2, 5.2 * bl),
          ),
        ]
  fields.push({
    name: "dorsalFin",
    sdf: finPieces.reduce((acc, s) => union(acc, s)),
  })

  const legDefs: Array<{ name: string; sx: number; sz: number }> = [
    { name: "legFL", sx: -1, sz: 1 },
    { name: "legFR", sx: 1, sz: 1 },
    { name: "legBL", sx: -1, sz: -1 },
    { name: "legBR", sx: 1, sz: -1 },
  ]
  const legPivots: Record<string, [number, number, number]> = {}
  for (const leg of legDefs) {
    const legZ = leg.sz > 0 ? legFrontZ : legBackZ
    const hip = at(leg.sx * 3.6 * bg, hipY, legZ)
    const foot = at(leg.sx * 5.6 * bg, footY, legZ + leg.sz * 1.4)
    legPivots[leg.name] = [hip.x, hip.y, hip.z]
    // Stubby splayed paddles — axolotl legs are suggestions, not stilts.
    const legField: Sdf = union(
      sdSphere(hip, 1.9 * bg),
      sdCapsule(hip, foot, 1.6 * bg),
    )
    fields.push({ name: leg.name, sdf: legField })
  }

  // Head paints after the legs so it claims its own silhouette wherever it
  // protrudes past the body front; the neck is already painted (first).
  fields.push({
    name: "head",
    sdf: union(sdBox(headC, skullHalf), sdBox(snoutC, snoutHalf)),
  })

  // Gill fronds paint after the head, so only the voxels protruding past the
  // skull stay frond-colored — the anchor points merge into the skull.
  fields.push({ name: "gillLeft", sdf: gillL.sdf })
  fields.push({ name: "gillRight", sdf: gillR.sdf })
  if (gillStyle === "crown") {
    fields.push({
      name: "gillCrown",
      sdf: union(
        sdCapsule(
          vec3(headC.x, gillBaseY, headC.z - 1.8 * hw),
          vec3(headC.x, gillBaseY + 3.4 * gl, headC.z - 2.8 * hw),
          1.1,
        ),
        sdCapsule(
          vec3(headC.x, gillBaseY, headC.z - 1.8 * hw),
          vec3(headC.x, gillBaseY + 2.2 * gl, headC.z - 3.6 * hw),
          0.9,
        ),
      ),
    })
  }

  // Barbels: thin feelers from the snout corners, sweeping forward-down.
  const barbelBases: Record<string, Vec3> = {}
  if (whiskerStyle !== "none") {
    const barbelLen = whiskerStyle === "long" ? 4.5 + 2 * sweep : 2.6
    const barbelBaseY = 11.2
    for (const side of [-1, 1] as const) {
      const name = side < 0 ? "barbelLeft" : "barbelRight"
      const base = vec3(O + side * 3.2 * hw, barbelBaseY, snoutC.z + 1.4 * hw)
      const tip = vec3(
        O + side * (5.2 + 1.4 * sweep) * hw,
        barbelBaseY - 2.2,
        snoutC.z + 1.4 * hw + barbelLen,
      )
      fields.push({ name, sdf: sdCapsule(base, tip, 1.0) })
      barbelBases[name] = base
    }
  }

  // -- Pivots (rotation anchors for the procedural rig) --------------------
  // Body pivot at the hip line so breathe squash keeps leg junctions fixed.
  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailFin: [tailMid.x, tailMid.y, tailMid.z],
    ...legPivots,
    neck: [neckA.x, neckA.y, neckA.z],
    head: [neckB.x, neckB.y, neckB.z],
    gillLeft: [gillL.base.x, gillL.base.y, gillL.base.z],
    gillRight: [gillR.base.x, gillR.base.y, gillR.base.z],
    dorsalFin: [O, finBaseY, O - 0.5 * bl],
  }
  if (gillStyle === "crown") {
    pivots.gillCrown = [headC.x, gillBaseY, headC.z - 1.8 * hw]
  }
  if (whiskerStyle !== "none") {
    pivots.barbelLeft = [
      barbelBases.barbelLeft?.x ?? 0,
      barbelBases.barbelLeft?.y ?? 0,
      barbelBases.barbelLeft?.z ?? 0,
    ]
    pivots.barbelRight = [
      barbelBases.barbelRight?.x ?? 0,
      barbelBases.barbelRight?.y ?? 0,
      barbelBases.barbelRight?.z ?? 0,
    ]
  }

  // -- Colors (deterministic per seed; fixed type hue, value jitter only) --
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = axolotlTemplate.palette.valueJitter
  const hue = gilded ? 45 : axolotlTemplate.palette.hue
  const light = gilded ? 0.55 : lerp(jit.min, jit.max, rng.next())
  const sat = gilded ? 0.85 : 0.6
  const main = hslToRgb(hue, sat, light)
  const dark: [number, number, number] = [
    main[0] * 0.7,
    main[1] * 0.7,
    main[2] * 0.7,
  ]
  // Coral gill fronds — the species' signature flush, cosmetic only.
  const coral: [number, number, number] = gilded
    ? [0.95, 0.75, 0.4]
    : [0.88, 0.48, 0.5]

  const colors: Record<string, [number, number, number]> = {
    body: main,
    tail: main,
    tailFin: dark,
    legFL: dark,
    legFR: dark,
    legBL: dark,
    legBR: dark,
    neck: main,
    head: main,
    gillLeft: coral,
    gillRight: coral,
    dorsalFin: dark,
  }
  if (gillStyle === "crown") {
    colors.gillCrown = coral
  }
  if (whiskerStyle !== "none") {
    colors.barbelLeft = dark
    colors.barbelRight = dark
  }

  return {
    fields,
    pivots,
    colors,
    parents: {
      tail: "body",
      tailFin: "tail",
      neck: "body",
      head: "neck",
      gillLeft: "head",
      gillRight: "head",
      dorsalFin: "body",
      legFL: "body",
      legFR: "body",
      legBL: "body",
      legBR: "body",
      ...(gillStyle === "crown" ? { gillCrown: "head" } : {}),
      ...(whiskerStyle !== "none"
        ? { barbelLeft: "head", barbelRight: "head" }
        : {}),
    },
  }
}
