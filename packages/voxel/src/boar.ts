import type { CreatureBuild } from "./build"
import { hslToRgb } from "./color"
import { faceParts, facePlan, skinPalette } from "./face"
import { makeRng } from "./rng"
import type { Dna, Template } from "./schema"
import {
  sdBox,
  sdCapsule,
  sdEllipsoid,
  sdSphere,
  smoothSubtract,
  smoothUnion,
  union,
  type Vec3,
  vec3,
} from "./sdf"
import { matureProportions, type Stage } from "./stage"
import { creaturePalette, type SurfaceBounds, surfaceClass } from "./surface"
import type { PartField } from "./voxelizer"

export { sampleDna as sampleBoarDna } from "./sample"

export const BOAR_GRID = 56

/**
 * Mossboar — the Plant line's boar body plan. A stocky low barrel on short
 * thick legs with a broad rooting snout and a mossy ridge along the spine.
 * The ridge reads against the mole's slate plates at a glance: the boar
 * wears a living green crest, not armor, and roots with its snout instead
 * of digging with spade paws.
 */
export const boarTemplate: Template = {
  id: "boar",
  version: 1,
  proportions: {
    bodyLength: { min: 0.8, max: 1.15 },
    bodyGirth: { min: 0.9, max: 1.3 },
    legLength: { min: 0.6, max: 1.0 },
    neckLength: { min: 0.7, max: 1.05 },
    neckThickness: { min: 0.9, max: 1.35 },
    headSize: { min: 0.8, max: 1.2 },
    ridgeSize: { min: 0.7, max: 1.3 },
    tailLength: { min: 0.5, max: 1.0 },
  },
  styles: {
    ridge: [
      { id: "mossy", params: { moss: { min: 0.6, max: 1.4 } } },
      { id: "spiked", params: { moss: { min: 0.6, max: 1.4 } } },
      { id: "smooth", params: {} },
    ],
    paws: [
      { id: "hoofed", params: { hoof: { min: 0.6, max: 1.4 } } },
      { id: "broad", params: { hoof: { min: 0.6, max: 1.4 } } },
    ],
  },
  palette: { hue: 110, valueJitter: { min: 0.35, max: 0.5 } },
  rarity: [{ id: "gilded", weight: 32 }],
}

export interface BoarBuild extends CreatureBuild {}

const O = BOAR_GRID / 2

/** Grid-space helper: centers x/z on the origin lattice, y stays absolute. */
const at = (x: number, y: number, z: number): Vec3 => vec3(x + O, y, z + O)

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Assemble the boar from DNA at one life stage. Pure in (dna, stage):
 * the determinism gate proves every stage regenerates byte-identically.
 */
export function buildBoar(dna: Dna, stage: Stage = "baby"): BoarBuild {
  const p = matureProportions(dna.proportions, stage)
  const bg = p.bodyGirth ?? 1
  const bl = p.bodyLength ?? 1
  const ll = p.legLength ?? 1
  const nl = p.neckLength ?? 1
  const nt = p.neckThickness ?? 1
  const hs = p.headSize ?? 1
  const rs = p.ridgeSize ?? 1
  const tl = p.tailLength ?? 1
  const j = stage === "baby" ? 0 : stage === "juvenile" ? 1 : 2

  // Legs stay planted; the whole mass rides a hair higher each stage.
  // The torso rides on its radius so the belly clears the floor, and the
  // foot bottom clears the y=0.5 voxel-center floor like every archetype.
  const hipY = 2.2 * bg + 2.6 + 0.6 * j
  const bodyY = 7.0 * bg + 1.5
  const footY = 2.2 * bg + 0.5

  // --- colors first, in fixed RNG order, so geometry never perturbs them.
  const rng = makeRng(dna.seed)
  const gilded = dna.rarity.includes("gilded")
  const hue = gilded ? 104 : 110
  const light = gilded ? 0.55 : lerp(0.35, 0.5, rng.next())
  const sat = gilded ? 0.85 : 0.62
  const lift = j === 0 ? 0 : j === 1 ? 0.05 : 0.1
  const main = hslToRgb(hue, sat, light + lift)
  const ramp = creaturePalette({ hue, sat: sat + lift, light: light + lift })
  const dark: [number, number, number] = [
    main[0] * 0.7,
    main[1] * 0.7,
    main[2] * 0.7,
  ]
  // Moss reads as a living crest: same plant hue, deeper and yellower.
  const moss: [number, number, number] = hslToRgb(hue, 0.55, 0.3 + lift)
  const bone: [number, number, number] = [0.93, 0.89, 0.78]

  // --- surface bounds: the barrel drives the ramp bands; the ridge borrows
  // them so its crown reads dorsal and its flanks lateral.
  const chestA = at(0, bodyY, 5.2 * bl)
  const surfaceBounds: SurfaceBounds = {
    torsoBottom: bodyY - 5.2 * bg,
    torsoTop: bodyY + 5.2 * bg,
    sockTop: footY + 1,
  }
  const classifyTorso = (q: Vec3): number =>
    surfaceClass("torso", q, dna.seed, surfaceBounds)
  const classifyLeg = (q: Vec3): number =>
    surfaceClass("leg", q, dna.seed, surfaceBounds)

  const fields: PartField[] = []

  // --- body: a stocky low barrel, the charger's mass.
  const rumpA = at(0, bodyY - 0.5, -5.2 * bl)
  const bodyField = sdCapsule(chestA, rumpA, 5.2 * bg)
  fields.push({
    name: "body",
    sdf: bodyField,
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- mossy ridge: a living crest seated on the barrel's crown, classified
  // with the same surface ramp so its top reads dorsal. It sits proud of
  // the barrel surface so it claims its own voxels under the paint order —
  // a ridge buried inside the barrel simply vanishes.
  const ridgeStyle = dna.styles.ridge ?? "mossy"
  const mossAmt = dna.styleParams.moss ?? 1
  const ridgeY = bodyY + 4.8 * bg
  let ridgeField = sdBox(
    at(0, ridgeY - 0.5, 0.5 * bl),
    vec3(2.6 * rs * bg, 1.3 * rs, 2.4 * rs * bl),
  )
  if (ridgeStyle === "mossy") {
    // A row of three moss cushions down the spine.
    for (const sz of [3.2, 0, -3.2]) {
      ridgeField = smoothUnion(
        ridgeField,
        sdBox(
          at(0, ridgeY + 0.3 * mossAmt, sz * bl),
          vec3(2.3 * rs * bg, 1.4 * rs, 2.0 * rs * bl),
        ),
        0.9,
      )
    }
  } else if (ridgeStyle === "spiked") {
    // A row of upright bristle spikes along the crown.
    for (const sz of [3.2, 0, -3.2]) {
      ridgeField = smoothUnion(
        ridgeField,
        sdCapsule(
          at(0, ridgeY + 0.4, sz * bl),
          at(0, ridgeY + (0.4 + 2.4 * mossAmt) * rs, sz * bl),
          0.9 * mossAmt,
        ),
        1.0,
      )
    }
  }
  fields.push({
    name: "ridge",
    sdf: ridgeField,
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- neck: short and thick, emerging low from the barrel's front.
  const neckA = at(0, bodyY + 1.5, 7 * bl)
  const neckB = at(0, bodyY + 2.4 + 1.2 * nl, 8.2 * bl + 1.2 * nl)
  fields.push({
    name: "neck",
    sdf: sdCapsule(neckA, neckB, 2.6 * nt),
    classify: (q: Vec3): number => classifyTorso(q),
  })

  // --- head: a heavy wedge skull with a broad rooting snout and a proud
  // nose disc — the plow the boar leads with.
  const headC = at(0, bodyY + 3.0 + 1.4 * nl, 9.4 * bl + 1.8 * nl)
  const skullHalf = vec3(2.6 * hs, 2.2 * hs, 2.7 * hs)
  const snoutHalf = vec3(2.2 * hs, 1.8 * hs, 2.0 * hs)
  const snoutC = vec3(
    headC.x,
    headC.y - 0.6 * hs,
    headC.z + skullHalf.z + 1.2 * hs,
  )
  const noseC = vec3(snoutC.x, snoutC.y, snoutC.z + 1.6 * hs)
  const headField = union(
    union(sdBox(headC, skullHalf), sdBox(snoutC, snoutHalf)),
    sdEllipsoid(noseC, vec3(2.0 * hs, 1.5 * hs, 1.0 * hs)),
  )
  const face = faceParts(
    facePlan("boar", {
      center: headC,
      half: skullHalf,
      snout: { center: snoutC, half: snoutHalf },
    }),
    main,
  )
  fields.push({
    name: "head",
    sdf: smoothSubtract(headField, face.carve, 0.5),
    classify: face.skinClass,
  })

  // --- four short thick columns planted wide. legLength spreads the
  // planted stance rather than stretching the column.
  const pawStyle = dna.styles.paws ?? "hoofed"
  const hoof = dna.styleParams.hoof ?? 1
  const legPivots: Record<string, [number, number, number]> = {}
  for (const [sx, sz, name] of [
    [-1, 1, "legFL"],
    [1, 1, "legFR"],
    [-1, -1, "legBL"],
    [1, -1, "legBR"],
  ] as const) {
    const hip = at(sx * 4 * bg, hipY, sz * 4.2 * bl)
    const foot = at(sx * (4 + 0.9 * ll) * bg, footY, sz * (4.2 + 0.9 * ll) * bl)
    legPivots[name] = [hip.x, hip.y, hip.z]
    const front = sz > 0
    const paw =
      pawStyle === "hoofed" && front
        ? sdBox(
            vec3(foot.x, footY - 0.3, foot.z + 0.6),
            vec3(2.2 * hoof * bg, 1.2, 2.0 * hoof),
          )
        : sdSphere(vec3(foot.x, footY - 0.2, foot.z + 0.4), 1.6)
    fields.push({
      name,
      sdf: union(
        union(sdSphere(hip, 2.7 * bg), sdCapsule(hip, foot, 2.0 * bg)),
        paw,
      ),
      classify: (q: Vec3): number => classifyLeg(q),
    })
  }

  // --- tail: a short nub with a moss tuft at its tip.
  const tailBase = at(0, bodyY - 3.5, -6.8 * bl)
  const tailEnd = at(0, bodyY - 3.8, -6.8 * bl - 2.2 * tl)
  const tailField = sdCapsule(tailBase, tailEnd, 1.3)
  fields.push({ name: "tail", sdf: tailField })
  fields.push({
    name: "tailTip",
    sdf: sdSphere(vec3(tailEnd.x, tailEnd.y - 0.3, tailEnd.z - 0.8), 1.3),
  })

  // --- stage signature parts, both rigged off the head.
  const pivots: Record<string, [number, number, number]> = {
    body: [O, hipY, O - bl],
    ridge: [O, ridgeY, O + 0.5 * bl],
    neck: [neckA.x, neckA.y, neckA.z],
    head: [headC.x, headC.y + skullHalf.y, headC.z],
    tail: [tailBase.x, tailBase.y, tailBase.z],
    tailTip: [tailEnd.x, tailEnd.y, tailEnd.z],
    ...legPivots,
  }
  const colors: Record<string, [number, number, number]> = {
    body: main,
    ridge: moss,
    neck: main,
    head: main,
    tail: main,
    tailTip: moss,
    legFL: dark,
    legFR: dark,
    legBL: dark,
    legBR: dark,
  }
  const parents: Record<string, string> = {
    ridge: "body",
    neck: "body",
    head: "neck",
    tail: "body",
    tailTip: "tail",
    legFL: "body",
    legFR: "body",
    legBL: "body",
    legBR: "body",
  }

  const budY = headC.y + skullHalf.y
  if (j >= 1) {
    // Juvenile signature: a pair of moss buds sprouting on the skull top —
    // the back crest starting early. headC is already grid-space, so the
    // offsets apply to it directly.
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "mossBudLeft" : "mossBudRight"
      const base = vec3(headC.x + sx * 1.6 * hs, budY - 0.4, headC.z + 0.4)
      const tip = vec3(headC.x + sx * 2.2 * hs, budY + 1.2, headC.z - 0.6)
      fields.push({ name, sdf: sdCapsule(base, tip, 0.9) })
      pivots[name] = [base.x, base.y, base.z]
      colors[name] = moss
      parents[name] = "head"
    }
  }
  if (j === 2) {
    // Champion signature: twin tusks curving up from the snout's flanks,
    // the earned crown.
    for (const sx of [-1, 1]) {
      const name = sx === -1 ? "crownTuskLeft" : "crownTuskRight"
      const base = vec3(
        snoutC.x + sx * 2.0 * hs,
        snoutC.y - 0.8 * hs,
        snoutC.z + 0.6 * hs,
      )
      const tip = vec3(
        snoutC.x + sx * 2.9 * hs,
        snoutC.y + 2.2 * hs,
        snoutC.z + 1.2 * hs,
      )
      fields.push({ name, sdf: sdCapsule(base, tip, 1.0) })
      pivots[name] = [base.x, base.y, base.z]
      colors[name] = bone
      parents[name] = "head"
    }
  }

  return {
    fields: [...fields, ...face.fields],
    pivots: { ...pivots, ...face.pivots },
    colors: { ...colors, ...face.colors },
    palettes: {
      body: ramp,
      ridge: ramp,
      neck: ramp,
      legFL: ramp,
      legFR: ramp,
      legBL: ramp,
      legBR: ramp,
      head: skinPalette(main),
      ...face.palettes,
    },
    parents: { ...parents, ...face.parents },
  }
}
