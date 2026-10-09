import { makeRng } from "./rng"
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

// Draconic archetype: a quadruped western drake. Authored in voxel units on a
// 56^3 grid (y up, +z forward), creature roughly 40 voxels long and 30 tall.
// The template owns the body plan and bounds; DNA only jitters within them,
// so every seed is guaranteed to still read as a drake.

export const DRAKE_GRID = 56

export const drakeTemplate: Template = {
  id: "draconic",
  version: 1,
  proportions: {
    bodyLength: { min: 0.85, max: 1.25 },
    bodyGirth: { min: 0.8, max: 1.3 },
    neckLength: { min: 0.8, max: 1.3 },
    neckThickness: { min: 0.7, max: 1.3 },
    headSize: { min: 0.8, max: 1.25 },
    hornLength: { min: 0.7, max: 1.4 },
    tailLength: { min: 0.8, max: 1.3 },
    legLength: { min: 0.75, max: 1.3 },
  },
  styles: {
    horns: [
      { id: "backSwept", params: { spread: { min: 0.2, max: 1 } } },
      { id: "straight", params: {} },
      { id: "forward", params: { spread: { min: 0.2, max: 1 } } },
    ],
    tail: [
      { id: "spade", params: {} },
      { id: "club", params: {} },
      { id: "plain", params: {} },
    ],
  },
  palette: { hue: 18, valueJitter: { min: 0.42, max: 0.6 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface DrakeBuild {
  fields: PartField[]
  pivots: Record<string, [number, number, number]>
  colors: Record<string, [number, number, number]>
}

const O = DRAKE_GRID / 2

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

export function buildDrake(dna: Dna): DrakeBuild {
  const p = dna.proportions
  const bl = p.bodyLength ?? 1
  const bg = p.bodyGirth ?? 1
  const nl = p.neckLength ?? 1
  const nt = p.neckThickness ?? 1
  const hs = p.headSize ?? 1
  const hl = p.hornLength ?? 1
  const tl = p.tailLength ?? 1
  const ll = p.legLength ?? 1

  // -- Key skeleton points -------------------------------------------------
  const chestA = at(0, 16.5, 5 * bl)
  const chestB = at(0, 16.5, 0.5 * bl)
  const rearA = at(0, 19, 0.5 * bl)
  const rearB = at(0, 19, -7 * bl)

  const tailBase = at(0, 17.5, -6.5 * bl)
  const tailMid = at(0, 18.5, -6.5 * bl - 8 * tl)
  const tailEnd = at(0, 21.5, -6.5 * bl - 12 * tl)

  const hipY = 15
  const footY = 0.9 + 1.7 * bg
  const legFrontZ = 5 + (ll - 1) * 2
  const legBackZ = -5.5 - (ll - 1) * 2

  // Neck rises steeply from the shoulders then sweeps forward to the head —
  // a near-vertical arch reads "drake" and stair-steps far less than a ramp.
  const neckA = at(0, 17, 4.5 * bl)
  const neckB = at(0, 17 + 6 * nl, 4.5 * bl + 2.5 * nl)
  const neckC = at(0, 17 + 10 * nl, 4.5 * bl + 5.5 * nl)
  const neckR = 3.4 * nt

  const headC = vec3(neckC.x, neckC.y + 0.8, neckC.z + 2.2 * hs)
  const skullHalf = vec3(3.4 * hs, 2.6 * hs, 3.4 * hs)
  const snoutC = vec3(neckC.x, neckC.y + 0.5, neckC.z + 5.2 * hs)
  const snoutHalf = vec3(2.5 * hs, 1.9 * hs, 3.6 * hs)
  const jawA = vec3(headC.x, headC.y - 1.5 * hs, headC.z + 1.0)
  const jawB = vec3(headC.x, headC.y - 1.2 * hs, headC.z + 4.8 * hs)

  const hornBaseY = headC.y + 2.4 * hs
  const hornBaseZ = headC.z - 0.8
  const hornSpread = dna.styleParams.spread ?? 0.6
  const hornStyle = dna.styles.horns ?? "backSwept"

  function hornTip(sign: number): Vec3 {
    const bx = sign * 1.7 * hs
    if (hornStyle === "straight") {
      return vec3(headC.x + bx, hornBaseY + 5.5 * hl, hornBaseZ + 0.3)
    }
    if (hornStyle === "forward") {
      return vec3(
        headC.x + bx + sign * 2 * hornSpread,
        hornBaseY + 1.2,
        hornBaseZ + 5 * hl,
      )
    }
    // backSwept (default)
    return vec3(
      headC.x + bx + sign * 2.4 * hornSpread,
      hornBaseY + 2,
      hornBaseZ - 5.5 * hl,
    )
  }

  const tailStyle = dna.styles.tail ?? "spade"

  // -- Part fields (paint order: later parts claim overlapping voxels) -----
  const fields: PartField[] = []

  // Deep chest + higher rump gives the arched back drakes are recognized by.
  const chestField: Sdf = sdCapsule(chestA, chestB, 5.4 * bg)
  const rearField: Sdf = sdCapsule(rearA, rearB, 4.3 * bg)
  fields.push({
    name: "body",
    sdf: smoothUnion(chestField, rearField, 3),
  })

  const tailField: Sdf = sdCapsule(tailBase, tailMid, 3 * bg)
  fields.push({ name: "tail", sdf: tailField })

  const tailTipZ = -6.5 * bl - 12 * tl
  const tailTipPieces: Sdf[] = [sdCapsule(tailMid, tailEnd, 1.7)]
  if (tailStyle === "spade") {
    tailTipPieces.push(sdBox(at(0, 19.8, tailTipZ - 1.1), vec3(2.4, 2.0, 1.5)))
  } else if (tailStyle === "club") {
    tailTipPieces.push(sdSphere(tailEnd, 2.2))
  }
  const tailTipField: Sdf = tailTipPieces.reduce((acc, s) => union(acc, s))
  fields.push({ name: "tailTip", sdf: tailTipField })

  const legDefs: Array<{ name: string; sx: number; sz: number }> = [
    { name: "legFL", sx: -1, sz: 1 },
    { name: "legFR", sx: 1, sz: 1 },
    { name: "legBL", sx: -1, sz: -1 },
    { name: "legBR", sx: 1, sz: -1 },
  ]
  const legPivots: Record<string, [number, number, number]> = {}
  for (const leg of legDefs) {
    const legZ = leg.sz > 0 ? legFrontZ : legBackZ
    const hip = at(leg.sx * 4.8 * bg, hipY, legZ)
    const knee = at(leg.sx * 5.2 * bg, (hipY + footY) / 2, legZ + 0.9)
    const foot = at(leg.sx * 5.4 * bg, footY, legZ + 0.5)
    legPivots[leg.name] = [hip.x, hip.y, hip.z]
    // Thigh bulge + tapered shin reads as a real limb, not a stick.
    const legField: Sdf = union(
      union(sdSphere(hip, 2.6 * bg), sdCapsule(hip, knee, 2.1 * bg)),
      sdCapsule(knee, foot, 1.5 * bg),
    )
    fields.push({ name: leg.name, sdf: legField })
  }

  const neckField: Sdf = union(
    sdCapsule(neckA, neckB, neckR),
    sdCapsule(neckB, neckC, neckR * 0.9),
  )
  fields.push({ name: "neck", sdf: neckField })

  const headField: Sdf = union(
    union(sdBox(headC, skullHalf), sdBox(snoutC, snoutHalf)),
    sdCapsule(jawA, jawB, 1.15 * hs),
  )
  fields.push({ name: "head", sdf: headField })

  const hornBaseL = vec3(headC.x - 1.7 * hs, hornBaseY, hornBaseZ)
  const hornBaseR = vec3(headC.x + 1.7 * hs, hornBaseY, hornBaseZ)
  fields.push({
    name: "hornLeft",
    sdf: sdCapsule(hornBaseL, hornTip(-1), 1.15),
  })
  fields.push({
    name: "hornRight",
    sdf: sdCapsule(hornBaseR, hornTip(1), 1.15),
  })

  // -- Pivots (rotation anchors for the procedural rig) --------------------
  const pivots: Record<string, [number, number, number]> = {
    body: [O, 16.5, O - bl],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailTip: [tailMid.x, tailMid.y, tailMid.z],
    ...legPivots,
    neck: [neckA.x, neckA.y, neckA.z],
    head: [neckC.x, neckC.y, neckC.z],
    hornLeft: [hornBaseL.x, hornBaseL.y, hornBaseL.z],
    hornRight: [hornBaseR.x, hornBaseR.y, hornBaseR.z],
  }

  // -- Colors (deterministic per seed; fixed type hue, value jitter only) --
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = drakeTemplate.palette.valueJitter
  const hue = gilded ? 45 : drakeTemplate.palette.hue
  const light = gilded ? 0.55 : lerp(jit.min, jit.max, rng.next())
  const sat = gilded ? 0.85 : 0.72
  const main = hslToRgb(hue, sat, light)
  const dark: [number, number, number] = [
    main[0] * 0.7,
    main[1] * 0.7,
    main[2] * 0.7,
  ]
  const bone: [number, number, number] = [0.93, 0.89, 0.78]

  const colors: Record<string, [number, number, number]> = {
    body: main,
    tail: main,
    tailTip: dark,
    legFL: dark,
    legFR: dark,
    legBL: dark,
    legBR: dark,
    neck: main,
    head: main,
    hornLeft: bone,
    hornRight: bone,
  }

  return { fields, pivots, colors }
}
