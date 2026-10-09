import { makeRng } from "./rng"

// Re-export the archetype-agnostic sampler under the archetype name so
// callers (tests, gallery) can stay archetype-typed.
export { sampleDna as sampleBovineDna } from "./sample"

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

// Bovine archetype: a stocky ox. Authored in voxel units on a 56^3 grid
// (y up, +z forward). Barrel-girthed, short-legged, heavy at the
// forequarters with a low-hanging head — the mirror image of the lean drake.
// The template owns the body plan and bounds; DNA only jitters within them,
// so every seed is guaranteed to still read as an ox.

export const BOVINE_GRID = 56

export const bovineTemplate: Template = {
  id: "bovine",
  version: 1,
  proportions: {
    bodyLength: { min: 0.85, max: 1.2 },
    bodyGirth: { min: 0.9, max: 1.3 },
    humpSize: { min: 0.8, max: 1.25 },
    headSize: { min: 0.8, max: 1.2 },
    hornLength: { min: 0.7, max: 1.3 },
    hornSpread: { min: 0.7, max: 1.3 },
    tailLength: { min: 0.8, max: 1.25 },
    legLength: { min: 0.7, max: 1.2 },
  },
  styles: {
    horns: [
      { id: "curved", params: { spread: { min: 0.2, max: 1 } } },
      { id: "straight", params: {} },
      { id: "backSwept", params: {} },
    ],
    tail: [
      { id: "tuft", params: {} },
      { id: "plain", params: {} },
      { id: "bell", params: {} },
    ],
    crest: [
      { id: "none", params: {} },
      { id: "spikes", params: {} },
    ],
  },
  palette: { hue: 110, valueJitter: { min: 0.35, max: 0.5 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface BovineBuild {
  fields: PartField[]
  pivots: Record<string, [number, number, number]>
  colors: Record<string, [number, number, number]>
  /**
   * Rig parentage: child part name -> parent part name. Animating a parent
   * must carry its children (head bob carries horns, body breath carries the
   * tail), so renderers reparent meshes along these edges.
   */
  parents: Record<string, string>
}

const O = BOVINE_GRID / 2

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

export function buildBovine(dna: Dna): BovineBuild {
  const p = dna.proportions
  const bl = p.bodyLength ?? 1
  const bg = p.bodyGirth ?? 1
  const hs = p.humpSize ?? 1
  const hd = p.headSize ?? 1
  const hl = p.hornLength ?? 1
  const tl = p.tailLength ?? 1
  const ll = p.legLength ?? 1

  // -- Key skeleton points -------------------------------------------------
  // A single massive barrel: wide (x), moderately tall, long. The hump sits
  // over the shoulders — heavy forequarters are what make an ox read as an ox.
  const barrel = at(0, 13, 0)
  const barrelHalf = vec3(5.2 * bg, 4.4 * bg, 8 * bl)
  const hump = at(0, 16.5, 3.5 * bl)

  const tailBase = at(0, 14.5, -7.5 * bl)
  const tailMid = at(0, 9, -7.5 * bl - 3 * tl)
  const tailEnd = at(0, 7, -7.5 * bl - 5.5 * tl)
  const tailTipZ = -7.5 * bl - 5.5 * tl

  const hipY = 9
  const footY = 0.9 + 1.9 * bg
  const legFrontZ = 4.5 + (ll - 1) * 2
  const legBackZ = -5.5 - (ll - 1) * 2

  // Short thick neck; the head hangs low and forward, below the hump line.
  // neckB extends past the barrel's front face (z = 8*bl) so the collar has
  // bare neck to wrap around instead of being swallowed by the body mass.
  const neckA = at(0, 15, 5.5 * bl)
  const neckB = at(0, 15.2, 9 * bl)
  const headC = at(0, 14.3, 8.6 * hd)
  const skullHalf = vec3(2.8 * hd, 2.4 * hd, 2.6 * hd)
  const snoutC = at(0, 13.4, 11.2 * hd)
  const snoutHalf = vec3(2 * hd, 1.8 * hd, 2.4 * hd)

  // Horn bases sit just above the head-box top (2.4*hd) so the capsules
  // claim voxels of their own instead of being swallowed by the skull.
  const hornBaseY = headC.y + 2.6 * hd
  const hornBaseZ = headC.z - 0.6
  const hornStyle = dna.styles.horns ?? "curved"
  const spread = dna.styleParams.spread ?? 0.6

  function hornTip(sign: number): Vec3 {
    const outX = sign * (2.2 + 2.6 * spread) * hd
    if (hornStyle === "straight") {
      return vec3(headC.x + outX, hornBaseY + 2.2, hornBaseZ)
    }
    if (hornStyle === "backSwept") {
      return vec3(headC.x + outX * 0.8, hornBaseY + 1.6, hornBaseZ - 3.2 * hl)
    }
    // curved (default): sweep out and up
    return vec3(headC.x + outX, hornBaseY + 2.5 * hl, hornBaseZ - 0.4)
  }

  const tailStyle = dna.styles.tail ?? "tuft"
  const crestStyle = dna.styles.crest ?? "none"

  // -- Part fields (paint order: later parts claim overlapping voxels) -----
  const fields: PartField[] = []

  // Barrel + shoulder hump blend into one mass — smooth, no visible seam.
  const bodyField: Sdf = smoothUnion(
    sdBox(barrel, barrelHalf),
    sdSphere(hump, 4.2 * hs),
    3,
  )
  fields.push({ name: "body", sdf: bodyField })

  // Tail: a thin drooping line down the rump — the opposite of the drake's
  // heavy taper. Styles decorate the tip only.
  const tailField: Sdf = union(
    sdCapsule(tailBase, tailMid, 1.3),
    sdCapsule(tailMid, tailEnd, 0.9),
  )
  fields.push({ name: "tail", sdf: tailField })

  const tailTipPieces: Sdf[] = []
  if (tailStyle === "tuft") {
    tailTipPieces.push(
      sdBox(at(0, tailEnd.y - 0.6, tailTipZ), vec3(1.3, 2, 1.3)),
    )
  } else if (tailStyle === "bell") {
    tailTipPieces.push(
      union(
        sdSphere(tailEnd, 1.7),
        sdBox(at(0, tailEnd.y - 1.4, tailTipZ), vec3(1.9, 0.7, 1.9)),
      ),
    )
  }
  if (tailTipPieces.length > 0) {
    const tailTipField: Sdf = tailTipPieces.reduce((acc, s) => union(acc, s))
    fields.push({ name: "tailTip", sdf: tailTipField })
  }

  // Crest: spine spikes between the hump and the tail base.
  if (crestStyle === "spikes") {
    const spikePieces: Sdf[] = [4, 0.5, -3].map((z) =>
      sdBox(at(0, 17.8 + 1.6 * hl, z * bl), vec3(0.8, 1.8 * hl, 0.8)),
    )
    const crestField: Sdf = spikePieces.reduce((acc, s) => union(acc, s))
    fields.push({ name: "crest", sdf: crestField })
  }

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
    const foot = at(leg.sx * 3.8 * bg, footY, legZ)
    legPivots[leg.name] = [hip.x, hip.y, hip.z]
    // Short, thick pillar legs — oxen stomp, they don't sprint.
    const legField: Sdf = union(
      sdSphere(hip, 2.4 * bg),
      sdCapsule(hip, foot, 1.9 * bg),
    )
    fields.push({ name: leg.name, sdf: legField })
  }

  fields.push({ name: "neck", sdf: sdCapsule(neckA, neckB, 3.2 * bg) })

  const headField: Sdf = union(
    sdBox(headC, skullHalf),
    sdBox(snoutC, snoutHalf),
  )
  fields.push({ name: "head", sdf: headField })

  const hornBaseL = vec3(headC.x - 1.6 * hd, hornBaseY, hornBaseZ)
  const hornBaseR = vec3(headC.x + 1.6 * hd, hornBaseY, hornBaseZ)
  fields.push({
    name: "hornLeft",
    sdf: sdCapsule(hornBaseL, hornTip(-1), 1.1),
  })
  fields.push({
    name: "hornRight",
    sdf: sdCapsule(hornBaseR, hornTip(1), 1.1),
  })

  // Charm part: a collar strap around the neck where it exits the body,
  // with a small bell hanging below the neck — pure livestock charm,
  // cosmetic only. Placed past the barrel's front face so the band and
  // bell claim their own voxels instead of being swallowed by the body.
  const collarC = at(0, 15, 8.8 * bl)
  fields.push({
    name: "collar",
    sdf: union(
      sdBox(collarC, vec3(3.7 * bg, 0.9, 0.9)),
      sdSphere(at(0, 15 - 3.2 * bg - 1.4, 8.8 * bl), 1.3),
    ),
  })

  // -- Pivots (rotation anchors for the procedural rig) --------------------
  // The body pivot sits at the HIP LINE (hipY): breathe squash-stretch around
  // this pivot keeps the body voxels at the leg junction fixed.
  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    ...legPivots,
    neck: [neckA.x, neckA.y, neckA.z],
    head: [neckB.x, neckB.y, neckB.z],
    hornLeft: [hornBaseL.x, hornBaseL.y, hornBaseL.z],
    hornRight: [hornBaseR.x, hornBaseR.y, hornBaseR.z],
    collar: [collarC.x, collarC.y, collarC.z],
  }
  if (fields.some((f) => f.name === "tailTip")) {
    pivots.tailTip = [tailMid.x, tailMid.y, tailMid.z]
  }
  if (crestStyle === "spikes") {
    pivots.crest = [O, 17.8, O - 3 * bl]
  }

  // -- Colors (deterministic per seed; fixed type hue, value jitter only) --
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = bovineTemplate.palette.valueJitter
  const hue = gilded ? 45 : bovineTemplate.palette.hue
  const light = gilded ? 0.55 : lerp(jit.min, jit.max, rng.next())
  const sat = gilded ? 0.85 : 0.55
  const main = hslToRgb(hue, sat, light)
  const dark: [number, number, number] = [
    main[0] * 0.7,
    main[1] * 0.7,
    main[2] * 0.7,
  ]
  const bone: [number, number, number] = [0.93, 0.89, 0.78]
  const brass: [number, number, number] = [0.85, 0.7, 0.3]

  const colors: Record<string, [number, number, number]> = {
    body: main,
    tail: main,
    legFL: dark,
    legFR: dark,
    legBL: dark,
    legBR: dark,
    neck: main,
    head: main,
    hornLeft: bone,
    hornRight: bone,
    collar: brass,
  }
  if (tailStyle !== "plain") {
    colors.tailTip = dark
  }
  if (crestStyle === "spikes") {
    colors.crest = bone
  }

  return {
    fields,
    pivots,
    colors,
    parents: {
      tail: "body",
      neck: "body",
      head: "neck",
      hornLeft: "head",
      hornRight: "head",
      collar: "neck",
      ...(tailStyle !== "plain" ? { tailTip: "tail" } : {}),
      ...(crestStyle === "spikes" ? { crest: "body" } : {}),
    },
  }
}
