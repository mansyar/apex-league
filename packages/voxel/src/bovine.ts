import { makeRng } from "./rng"
import { matureProportions, type Stage } from "./stage"
import { creaturePalette, type SurfaceBounds, surfaceClass } from "./surface"

// Re-export the archetype-agnostic sampler under the archetype name so
// callers (tests, gallery) can stay archetype-typed.
export { sampleDna as sampleBovineDna } from "./sample"

import type { CreatureBuild } from "./build"
import { hslToRgb } from "./color"
import { faceParts, facePlan, skinPalette } from "./face"
import type { Dna, Template } from "./schema"
import {
  type Sdf,
  sdBox,
  sdCapsule,
  sdSphere,
  smoothSubtract,
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

export interface BovineBuild extends CreatureBuild {}

const O = BOVINE_GRID / 2

/** Local creature coords -> grid coords (x/z centered, y from ground). */
function at(x: number, y: number, z: number): Vec3 {
  return vec3(x + O, y, z + O)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function buildBovine(dna: Dna, stage: Stage = "baby"): BovineBuild {
  const p = matureProportions(dna.proportions, stage)
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
  // Hump sits back over the shoulders (not the neck) and rises well above
  // the back line — a high shoulder silhouette is what makes an ox an ox.
  const hump = at(0, 16.5, 1.5 * bl)
  // Brisket: the chest hangs below the barrel line between the front legs.
  const brisket = at(0, 10.5, 3 * bl)

  const tailBase = at(0, 12.5, -7.5 * bl)
  const tailMid = at(0, 9, -7.5 * bl - 3 * tl)
  const tailEnd = at(0, 7, -7.5 * bl - 5.5 * tl)
  const tailTipZ = -7.5 * bl - 5.5 * tl

  // Juveniles stand a touch taller at the hip — legs read longer as the
  // body matures (see stage.ts for the maturity frame).
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2
  const hipY = 9 + 0.6 * j
  const footY = 0.9 + 2.3 * bg
  const legFrontZ = 4.5 + (ll - 1) * 2
  const legBackZ = -5.5 - (ll - 1) * 2

  // Short thick neck ending just past the barrel's front face (z = 8*bl),
  // leaving ~1.7 voxels of bare neck for the collar to wrap.
  const neckA = at(0, 15, 5.5 * bl)
  const neckB = at(0, 15.2, 8 * bl + 2.2)
  // The head anchors to the BODY front (not to hd), so a guaranteed gap of
  // bare neck always exists between face and barrel regardless of how DNA
  // combines headSize with bodyLength.
  const headC = at(0, 15.2, 8 * bl + 3.4 + 1.2 * hd)
  const skullHalf = vec3(3.2 * hd, 2.4 * hd, 2.6 * hd)
  const snoutC = at(0, 14.2, headC.z + 2.4 * hd)
  const snoutHalf = vec3(2.4 * hd, 2.3 * hd, 2 * hd)

  // Horn bases sit just above the head-box top (2.4*hd) so the capsules
  // claim voxels of their own instead of being swallowed by the skull.
  const hornBaseY = headC.y + 2.6 * hd
  const hornBaseZ = headC.z - 0.6
  const hornStyle = dna.styles.horns ?? "curved"
  const spread = dna.styleParams.spread ?? 0.6

  function hornTip(sign: number): Vec3 {
    const outX = sign * (2.2 + 2.6 * spread) * hd
    if (hornStyle === "straight") {
      return vec3(headC.x + outX, hornBaseY + 1.8 + 1.2 * hl, hornBaseZ)
    }
    if (hornStyle === "backSwept") {
      return vec3(headC.x + outX * 0.8, hornBaseY + 3.2, hornBaseZ - 1.8 * hl)
    }
    // curved (default): sweep out and up
    return vec3(headC.x + outX, hornBaseY + 2.5 * hl, hornBaseZ - 0.4)
  }

  const tailStyle = dna.styles.tail ?? "tuft"
  const crestStyle = dna.styles.crest ?? "none"

  // -- Part fields (paint order: later parts claim overlapping voxels) -----
  const fields: PartField[] = []

  // Surface zones follow the real body extent: the brisket hangs lowest and
  // the hump is the highest point, so those two set the band edges.
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: brisket.y - 3.4 * bg,
    torsoTop: hump.y + 4.6 * hs,
    sockTop: footY + 0.6,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  // Barrel + shoulder hump + brisket blend into one mass — smooth, no seam.
  const bodyField: Sdf = smoothUnion(
    union(sdBox(barrel, barrelHalf), sdSphere(brisket, 3.4 * bg)),
    sdSphere(hump, 4.6 * hs),
    3,
  )
  fields.push({ name: "body", sdf: bodyField, classify: classifyTorso })

  // Tail: a thin drooping line down the rump — the opposite of the drake's
  // heavy taper. Styles decorate the tip only.
  const tailField: Sdf = union(
    sdCapsule(tailBase, tailMid, 1.7),
    sdCapsule(tailMid, tailEnd, 1.0),
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

  // Crest: spine spikes BEHIND the hump (which rises to ~y22 and would
  // swallow spikes at the shoulder) — they run down the back toward the tail.
  if (crestStyle === "spikes") {
    const spikePieces: Sdf[] = [-2, -4.5, -7].map((z) =>
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
    const hip = at(leg.sx * 4.2 * bg, hipY, legZ)
    const foot = at(leg.sx * 4.6 * bg, footY, legZ)
    legPivots[leg.name] = [hip.x, hip.y, hip.z]
    // Short, thick pillar legs — oxen stomp, they don't sprint.
    const legField: Sdf = union(
      sdSphere(hip, 2.7 * bg),
      sdCapsule(hip, foot, 2.3 * bg),
    )
    fields.push({ name: leg.name, sdf: legField, classify: classifyLeg })
  }

  // Horns paint BEFORE head/neck: horn voxels inside the skull are claimed
  // by the head (invisible), while tips outside everything stay horn-colored.
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

  // -- Colors (deterministic per seed; fixed type hue, value jitter only) --
  // Resolved before the geometry: the face needs the coat colour and the
  // head's palette is built from it.
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const jit = bovineTemplate.palette.valueJitter
  const hue = gilded ? 45 : bovineTemplate.palette.hue
  const light = gilded ? 0.55 : lerp(jit.min, jit.max, rng.next())
  const sat = gilded ? 0.85 : 0.55
  // Juveniles read a touch brighter and more saturated — same hue family,
  // same seed jitter, just a maturing coat (see stage.ts).
  const lift = stage === "baby" ? 0 : stage === "juvenile" ? 0.05 : 0.1
  const main = hslToRgb(hue, Math.min(1, sat + lift), Math.min(1, light + lift))
  const ramp = creaturePalette({
    hue,
    sat: Math.min(1, sat + lift),
    light: Math.min(1, light + lift),
  })
  const dark: [number, number, number] = [
    main[0] * 0.7,
    main[1] * 0.7,
    main[2] * 0.7,
  ]
  const bone: [number, number, number] = [0.93, 0.89, 0.78]
  const brass: [number, number, number] = [0.85, 0.7, 0.3]

  // Head paints BEFORE neck: the head claims its own voxels so a fat neck
  // can never swallow it; the neck paints the ring around the head base.
  const headField: Sdf = union(
    sdBox(headC, skullHalf),
    sdBox(snoutC, snoutHalf),
  )
  const face = faceParts(
    facePlan(
      "bovine",
      {
        center: headC,
        half: skullHalf,
        snout: { center: snoutC, half: snoutHalf },
      },
      stage,
    ),
    main,
  )
  fields.push({
    name: "head",
    sdf: smoothSubtract(headField, face.recess, 0.5),
    classify: face.skinClass,
  })
  fields.push(...face.fields)

  // Juvenile signature: the brow ridge swells into small horn bases — the
  // buds sit on the brow line, forward of the adult horns. The adult horn
  // shape is the identity layer and stays untouched; the buds are new
  // growth the calf does not have yet. Painted after the head so they
  // claim their own voxels on the brow.
  if (stage === "juvenile" || stage === "champion") {
    const budBaseL = vec3(
      headC.x - 1.6 * hd,
      headC.y + 2.2 * hd,
      headC.z + 1.2 * hd,
    )
    const budBaseR = vec3(
      headC.x + 1.6 * hd,
      headC.y + 2.2 * hd,
      headC.z + 1.2 * hd,
    )
    fields.push({ name: "hornBudLeft", sdf: sdSphere(budBaseL, 1.05) })
    fields.push({ name: "hornBudRight", sdf: sdSphere(budBaseR, 1.05) })
  }

  // Champion signature: full horn curls — the adult horns grow into the
  // sweeping curl of a record bull. Two capsules per side: out-and-up from
  // above the horn base, then curling up and inward at the tip. Painted
  // after the head so the curl claims its own voxels.
  if (stage === "champion") {
    for (const sign of [-1, 1] as const) {
      const curlBase = vec3(
        headC.x + sign * 1.5 * hd,
        headC.y + 3.4 * hd,
        headC.z - 0.3,
      )
      const curlMid = vec3(
        headC.x + sign * 2.8 * hd,
        headC.y + 6.5 * hd,
        headC.z,
      )
      const curlTip = vec3(
        headC.x + sign * 1.2 * hd,
        headC.y + 9.2 * hd,
        headC.z - 0.6,
      )
      fields.push({
        name: sign < 0 ? "hornCurlLeft" : "hornCurlRight",
        sdf: union(
          sdCapsule(curlBase, curlMid, 1),
          sdCapsule(curlMid, curlTip, 0.85),
        ),
      })
    }
  }

  fields.push({ name: "neck", sdf: sdCapsule(neckA, neckB, 2.9 * bg) })

  // Charm part: a collar strap around the neck where it exits the body,
  // with a small bell hanging below the neck — pure livestock charm,
  // cosmetic only. Placed past the barrel's front face so the band and
  // bell claim their own voxels instead of being swallowed by the body.
  const collarC = at(0, 15, 8 * bl + 1.2)
  fields.push({
    name: "collar",
    sdf: union(
      sdBox(collarC, vec3(3.7 * bg, 0.9, 0.9)),
      sdSphere(at(0, 15 - 2.4 * bg - 1.5, 8 * bl + 2.6), 1.3),
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
  if (stage === "juvenile" || stage === "champion") {
    pivots.hornBudLeft = [
      headC.x - 1.6 * hd,
      headC.y + 2.2 * hd,
      headC.z + 1.2 * hd,
    ]
    pivots.hornBudRight = [
      headC.x + 1.6 * hd,
      headC.y + 2.2 * hd,
      headC.z + 1.2 * hd,
    ]
  }
  if (stage === "champion") {
    pivots.hornCurlLeft = [
      headC.x - 1.5 * hd,
      headC.y + 3.4 * hd,
      headC.z - 0.3,
    ]
    pivots.hornCurlRight = [
      headC.x + 1.5 * hd,
      headC.y + 3.4 * hd,
      headC.z - 0.3,
    ]
  }

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
  if (stage === "juvenile" || stage === "champion") {
    colors.hornBudLeft = bone
    colors.hornBudRight = bone
  }
  if (stage === "champion") {
    colors.hornCurlLeft = brass
    colors.hornCurlRight = brass
  }

  return {
    fields,
    pivots: { ...pivots, ...face.pivots },
    colors: { ...colors, ...face.colors },
    palettes: {
      body: ramp,
      legFL: ramp,
      legFR: ramp,
      legBL: ramp,
      legBR: ramp,
      head: skinPalette(main),
      ...face.palettes,
    },
    parents: {
      tail: "body",
      neck: "body",
      head: "neck",
      hornLeft: "head",
      hornRight: "head",
      collar: "neck",
      ...(tailStyle !== "plain" ? { tailTip: "tail" } : {}),
      ...(crestStyle === "spikes" ? { crest: "body" } : {}),
      ...(stage === "juvenile" || stage === "champion"
        ? { hornBudLeft: "head", hornBudRight: "head" }
        : {}),
      ...(stage === "champion"
        ? { hornCurlLeft: "head", hornCurlRight: "head" }
        : {}),
      ...face.parents,
    },
  }
}
